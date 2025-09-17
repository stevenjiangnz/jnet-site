import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import SymbolsPageContent from './symbols-content'

export default async function SymbolsPage() {
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
      <SymbolsPageContent />
    </AppLayout>
  );
}