'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function AuthDebugPage() {
  const [debugInfo, setDebugInfo] = useState<{
    origin: string
    supabaseUrl: string
    redirectUrl: string
    environment: string
  } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const origin = window.location.origin
    
    setDebugInfo({
      origin,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'not set',
      redirectUrl: `${origin}/auth/callback`,
      environment: process.env.NODE_ENV || 'unknown'
    })
  }, [])

  if (!debugInfo) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Auth Debug Information</h1>
          
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-700">Current Origin</h2>
              <p className="mt-1 font-mono text-sm bg-gray-100 p-2 rounded">{debugInfo.origin}</p>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold text-gray-700">Supabase URL</h2>
              <p className="mt-1 font-mono text-sm bg-gray-100 p-2 rounded">{debugInfo.supabaseUrl}</p>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold text-gray-700">OAuth Redirect URL</h2>
              <p className="mt-1 font-mono text-sm bg-gray-100 p-2 rounded">{debugInfo.redirectUrl}</p>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold text-gray-700">Environment</h2>
              <p className="mt-1 font-mono text-sm bg-gray-100 p-2 rounded">{debugInfo.environment}</p>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Important Notes:</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>The OAuth Redirect URL above must be added to your Supabase Dashboard</li>
              <li>Go to Authentication → URL Configuration → Redirect URLs</li>
              <li>Add the exact URL shown above to the allowed list</li>
              <li>Changes may take a few minutes to propagate</li>
            </ul>
          </div>
          
          <div className="mt-6">
            <a 
              href="/login" 
              className="text-indigo-600 hover:text-indigo-500 text-sm"
            >
              ← Back to login
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}