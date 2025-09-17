import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user || null
  } catch {
    console.log('Auth not available during build')
  }
  
  if (!user) {
    redirect('/login')
  }

  return (
    <AppLayout>
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="dashboard-card shadow-sm rounded-lg p-6">
            <h1 className="text-2xl font-bold dashboard-title mb-4">Dashboard</h1>
            <p className="dashboard-text">Welcome, {user.email}!</p>
            
            <div className="mt-6">
              <h2 className="text-lg font-medium dashboard-title mb-2">User Details:</h2>
              <dl className="mt-2 border-t pt-4" style={{borderColor: 'var(--border)'}}>
                <div className="py-2">
                  <dt className="text-sm font-medium dashboard-dt">Email</dt>
                  <dd className="mt-1 text-sm dashboard-dd">{user.email}</dd>
                </div>
                <div className="py-2">
                  <dt className="text-sm font-medium dashboard-dt">User ID</dt>
                  <dd className="mt-1 text-sm dashboard-dd">{user.id}</dd>
                </div>
                <div className="py-2">
                  <dt className="text-sm font-medium dashboard-dt">Last Sign In</dt>
                  <dd className="mt-1 text-sm dashboard-dd">{new Date(user.last_sign_in_at || '').toLocaleString()}</dd>
                </div>
              </dl>
            </div>
            
            <form action="/auth/signout" method="post" className="mt-6">
              <button 
                type="submit"
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}