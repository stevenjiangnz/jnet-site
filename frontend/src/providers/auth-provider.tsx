'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signInWithEmail: (email: string, password: string) => Promise<{ data: any; error: any }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signUpWithEmail: (email: string, password: string) => Promise<{ data: any; error: any }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signInWithGoogle: () => Promise<{ data: any; error: any }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signOut: () => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('Error getting session:', error)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signUpWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  }

  const signInWithGoogle = async () => {
    // Get the current origin, ensuring we don't use localhost:3000 in production
    let origin = typeof window !== 'undefined' ? window.location.origin : ''
    
    // In production, ensure we never use localhost URLs
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      const host = window.location.host
      // Force HTTPS in production and ensure no localhost URLs
      if (origin.includes('localhost') || origin.includes('0.0.0.0') || origin.includes('127.0.0.1')) {
        origin = `https://${host}`
        console.warn('[Auth] Corrected origin from localhost to:', origin)
      }
    }
    
    console.log('[Auth] SignIn with Google - redirectTo:', `${origin}/auth/callback`)
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        // Force skip the intermediate Supabase page
        skipBrowserRedirect: false,
      },
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setSession(null)
    }
    return { error }
  }

  const value = {
    user,
    session,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}