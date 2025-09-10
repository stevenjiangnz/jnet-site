import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error_description = searchParams.get('error_description')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  // Log the callback details for debugging
  console.log('[Auth Callback] Request URL:', request.url)
  console.log('[Auth Callback] Origin:', origin)
  console.log('[Auth Callback] Code:', code ? 'present' : 'missing')
  console.log('[Auth Callback] Error:', error_description)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    } else {
      console.error('[Auth Callback] Session exchange error:', error)
    }
  }

  // In production, ensure we never redirect to localhost/0.0.0.0
  let redirectUrl = `${origin}/auth/auth-code-error`
  if (process.env.NODE_ENV === 'production' && (origin.includes('localhost') || origin.includes('0.0.0.0'))) {
    // Use the forwarded host or fall back to a safe production URL
    const forwardedHost = request.headers.get('x-forwarded-host')
    const host = request.headers.get('host')
    redirectUrl = forwardedHost 
      ? `https://${forwardedHost}/auth/auth-code-error`
      : host 
      ? `https://${host}/auth/auth-code-error` 
      : '/auth/auth-code-error' // Relative redirect as last resort
    
    console.warn('[Auth Callback] Prevented redirect to local URL in production, using:', redirectUrl)
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(redirectUrl)
}