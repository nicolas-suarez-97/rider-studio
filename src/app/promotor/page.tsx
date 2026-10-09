import { Suspense } from 'react';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { PromotorHomeClient } from '@/components/promotor/PromotorHomeClient';
import { loadPromotorHome } from '@/lib/promotor/home';

interface PageProps {
  searchParams: Promise<{ prompt?: string }>;
}

async function PromotorServer({ searchParams }: PageProps) {
  await connection();
  const { prompt } = await searchParams;
  const home = await loadPromotorHome();
  const pendingPrompt = prompt?.trim() || null;

  if (pendingPrompt && home.shows.length === 1) {
    redirect(
      `/promotor/shows/${home.shows[0].id}/contra-rider?prompt=${encodeURIComponent(pendingPrompt)}`
    );
  }

  return (
    <PromotorHomeClient
      shows={home.shows}
      conversations={home.conversations}
      pendingPrompt={pendingPrompt}
    />
  );
}

export default function PromotorPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center text-slate-500 font-bold text-sm">
          <span className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mr-3" />
          Cargando revisión...
        </div>
      }
    >
      <PromotorServer {...props} />
    </Suspense>
  );
}
