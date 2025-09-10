import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Provide fallback values during build time
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
  
  // Skip during build
  if (supabaseUrl === 'https://placeholder.supabase.co') {
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Skip allowlist check for certain paths
  const pathname = request.nextUrl.pathname
  if (pathname === '/unauthorized' || pathname.startsWith('/auth/')) {
    return supabaseResponse
  }

  // If user is authenticated, check allowlist
  if (user?.email) {
    try {
      // Check if user is in allowlist
      const { data: allowedUser, error } = await supabase
        .from('allowed_users')
        .select('email')
        .eq('email', user.email)
        .maybeSingle()

      // If user is NOT in allowlist
      if (!allowedUser || error) {
        // Clear the session
        await supabase.auth.signOut()
        
        // Redirect to unauthorized page
        const url = request.nextUrl.clone()
        url.pathname = '/unauthorized'
        url.searchParams.set('reason', 'not-allowlisted')
        
        return NextResponse.redirect(url)
      }
    } catch (error) {
      // Log error but allow access to prevent lockout (fail-open)
      console.error('Allowlist check failed:', error)
      // In production, you might want to send this to a monitoring service
    }
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