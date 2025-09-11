import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { getPublicUrl } from '@/utils/url-helper'

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
  
  // Use the URL helper to get the correct public URL
  const publicUrl = getPublicUrl(request)
  const redirectUrl = publicUrl ? `${publicUrl}/login` : '/login'
  console.log('[Signout] Public URL:', publicUrl)
  console.log('[Signout] Redirecting after signout to:', redirectUrl)
  
  return NextResponse.redirect(redirectUrl, {
    status: 302,
  })
}