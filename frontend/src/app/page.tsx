import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { HomeContent } from '@/components/home/home-content'

export default async function Home() {
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
      <HomeContent />
    </AppLayout>
  );
}