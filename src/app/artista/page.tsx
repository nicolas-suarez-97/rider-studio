import { Suspense } from 'react';
import { connection } from 'next/server';
import { MisRidersClient } from '@/components/artista/MisRidersClient';
import { buildRiderHomeCards } from '@/lib/artista/mis-riders';
import { getRiders } from '@/lib/services/rider-storage';

async function ArtistHomeServer() {
  await connection();
  const rows = await getRiders();
  return <MisRidersClient cards={buildRiderHomeCards(rows)} />;
}

export default function ArtistHomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center text-slate-500 font-bold text-sm">
        <span className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mr-3" />
        Cargando Rider Studio...
      </div>
    }>
      <ArtistHomeServer />
    </Suspense>
  );
}
