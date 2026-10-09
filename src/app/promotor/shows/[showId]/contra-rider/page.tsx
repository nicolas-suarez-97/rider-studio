import type { Metadata } from 'next';
import { Suspense } from 'react';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { ContraRiderClient } from '@/components/promotor/ContraRiderClient';
import { loadPromotorShow } from '@/lib/promotor/load-show';

export const metadata: Metadata = {
  title: 'Contra-rider — Promotor',
  robots: { index: false, follow: false },
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PageProps {
  params: Promise<{ showId: string }>;
}

async function ContraRiderServer({ params }: PageProps) {
  await connection();
  const { showId } = await params;
  if (!UUID_PATTERN.test(showId)) notFound();

  const show = await loadPromotorShow(showId);
  if (!show) notFound();

  return (
    <ContraRiderClient
      key={showId}
      showId={show.showId}
      initialRiderData={show.rider}
      initialContra={show.contra}
    />
  );
}

export default function ContraRiderPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-[#f8f9fa] text-slate-500 font-bold text-sm">
          <span className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mr-3" />
          Cargando contra-rider...
        </div>
      }
    >
      <ContraRiderServer {...props} />
    </Suspense>
  );
}
