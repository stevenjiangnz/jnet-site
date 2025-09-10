import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    // Sign out with explicit redirect to avoid cached URLs
    const { error } = await supabase.auth.signOut({
      scope: 'global' // This ensures the session is cleared globally
    })
    
    if (error) {
      console.error('Signout error:', error)
    }
  }

  revalidatePath('/', 'layout')
  
  // Use the request URL to ensure we redirect to the correct domain
  const redirectUrl = new URL('/login', request.url)
  console.log('Redirecting after signout to:', redirectUrl.toString())
  
  return NextResponse.redirect(redirectUrl, {
    status: 302,
  })
}