import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

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
    <div className="min-h-screen">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">JNet Solution</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-sm text-gray-700">Hello, {user.email}</span>
                  <Link
                    href="/dashboard"
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    Dashboard
                  </Link>
                  <form action="/auth/signout" method="post">
                    <button 
                      type="submit"
                      className="text-sm text-gray-700 hover:text-gray-500"
                    >
                      Sign Out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Welcome to JNet Solution</h1>
          <p className="mt-4 text-lg text-gray-600">
            {user ? 'You are logged in!' : 'Please sign in to continue'}
          </p>
          {!user && (
            <div className="mt-6">
              <Link
                href="/login"
                className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700"
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
