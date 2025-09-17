import { createClient } from '@/utils/supabase/server'
import { Navbar } from '@/components/navbar'

export async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      {children}
    </div>
  );
}