import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getPublicUrl } from '@/utils/url-helper'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error_description = searchParams.get('error_description')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  // Use the URL helper to get the correct public URL
  const publicUrl = getPublicUrl(request)

  // Log the callback details for debugging
  console.log('[Auth Callback] Request URL:', request.url)
  console.log('[Auth Callback] Public URL from helper:', publicUrl)
  console.log('[Auth Callback] Host header:', request.headers.get('host'))
  console.log('[Auth Callback] X-Forwarded-Host:', request.headers.get('x-forwarded-host'))
  console.log('[Auth Callback] X-Forwarded-Proto:', request.headers.get('x-forwarded-proto'))
  console.log('[Auth Callback] Code:', code ? 'present' : 'missing')
  console.log('[Auth Callback] Error:', error_description)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Always use the publicUrl from our helper
      const redirectUrl = publicUrl ? `${publicUrl}${next}` : next
      console.log('[Auth Callback] Successful auth, redirecting to:', redirectUrl)
      return NextResponse.redirect(redirectUrl)
    } else {
      console.error('[Auth Callback] Session exchange error:', error)
    }
  }

  // Use the public URL for error redirects
  const errorRedirectUrl = publicUrl ? `${publicUrl}/auth/auth-code-error` : '/auth/auth-code-error'
  console.log('[Auth Callback] Error or no code, redirecting to:', errorRedirectUrl)

  // return the user to an error page with instructions
  return NextResponse.redirect(errorRedirectUrl)
}