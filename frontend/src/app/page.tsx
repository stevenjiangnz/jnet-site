import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'

export default async function Home() {
  const supabase = await createClient()
  
  // Handle build-time rendering gracefully
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user || null
  } catch {
    // During build, auth might not be available
    console.log('Auth not available during build')
  }

  return (
    <div className="main-container">
      <Navbar user={user} />

      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <h1 className="text-4xl font-bold main-title">
            Welcome to JNet Solution
          </h1>
          <p className="mt-4 text-lg main-subtitle">
            {user ? 'You are logged in!' : 'Please sign in to continue'}
          </p>
          {!user && (
            <div className="mt-6">
              <Link
                href="/login"
                className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
