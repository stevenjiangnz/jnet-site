import { AppLayout } from '@/components/layout/app-layout'
import { HomeContent } from '@/components/home/home-content'

export default async function Home() {
  return (
    <AppLayout>
      <HomeContent />
    </AppLayout>
  );
}