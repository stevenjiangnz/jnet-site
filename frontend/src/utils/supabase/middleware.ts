import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getPublicUrl } from '../url-helper'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  console.log(`[Middleware] Processing request for: ${pathname}`)
  
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Provide fallback values during build time
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
  
  console.log(`[Middleware] Supabase URL: ${supabaseUrl?.substring(0, 30)}...`)
  console.log(`[Middleware] Has Anon Key: ${!!supabaseAnonKey && supabaseAnonKey !== 'placeholder-key'}`)
  
  // Skip during build or if not configured
  if (supabaseUrl === 'https://placeholder.supabase.co') {
    console.error('[Middleware] CRITICAL: Supabase not configured - using placeholder URL')
    console.error('[Middleware] Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')))
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make your app
  // vulnerable to CSRF attacks.

  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    user = data?.user
    if (error) {
      console.error('[Middleware] Error getting user:', error.message)
    } else {
      console.log(`[Middleware] User authenticated: ${!!user}, email: ${user?.email || 'none'}`)
    }
  } catch (e) {
    console.error('[Middleware] Exception getting user:', e)
  }

  // Skip allowlist check for certain paths
  if (pathname === '/unauthorized' || 
      pathname.startsWith('/auth/') || 
      pathname === '/login' ||
      pathname === '/') {
    console.log(`[Middleware] Skipping allowlist check for path: ${pathname}`)
    return supabaseResponse
  }

  // If user is authenticated, check allowlist
  if (user?.email) {
    console.log(`[Middleware] Checking allowlist for user: ${user.email}`)
    try {
      // Check if user is in allowlist
      const { data: allowedUser, error } = await supabase
        .from('allowed_users')
        .select('email')
        .eq('email', user.email)
        .maybeSingle()

      console.log(`[Middleware] Allowlist query result - data: ${JSON.stringify(allowedUser)}, error: ${error?.message || 'none'}`)

      // If user is NOT in allowlist
      if (!allowedUser || error) {
        console.log(`[Middleware] User ${user.email} NOT in allowlist, redirecting to unauthorized`)
        // Clear the session
        await supabase.auth.signOut()
        
        // Get the public URL to ensure we don't redirect to localhost in production
        const publicUrl = getPublicUrl(request)
        const redirectUrl = publicUrl 
          ? `${publicUrl}/unauthorized?reason=not-allowlisted`
          : '/unauthorized?reason=not-allowlisted'
        
        console.log(`[Middleware] Redirecting to: ${redirectUrl}`)
        return NextResponse.redirect(redirectUrl)
      } else {
        console.log(`[Middleware] User ${user.email} IS in allowlist, allowing access`)
      }
    } catch (error) {
      // Log error but allow access to prevent lockout (fail-open)
      const errorDetails: Record<string, unknown> = {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3).join('\n') : undefined
      };
      
      // Add additional error details if available
      if (error && typeof error === 'object') {
        const err = error as Record<string, unknown>;
        if ('code' in err) errorDetails.code = err.code;
        if ('details' in err) errorDetails.details = err.details;
        if ('hint' in err) errorDetails.hint = err.hint;
      }
      
      console.error('[Middleware] Allowlist check exception:', errorDetails)
      // In production, you might want to send this to a monitoring service
    }
  } else {
    console.log('[Middleware] No authenticated user, skipping allowlist check')
  }

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    // no user, potentially respond by redirecting the user to the login page
    // Uncomment below to enforce authentication on all routes except /login and /auth
    // const url = request.nextUrl.clone()
    // url.pathname = '/login'
    // return NextResponse.redirect(url)
  }

  return supabaseResponse
}