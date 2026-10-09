import type { Metadata } from 'next';
import { Suspense } from 'react';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { Rider } from '@/core/models/Rider';
import { getRiderByShareToken } from '@/lib/services/rider-storage';
import { isShareToken } from '@/lib/share/token';
import { RiderViewClient } from '@/components/view/RiderViewClient';

export const metadata: Metadata = {
  title: 'Rider compartido',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

async function ViewServer({ params }: PageProps) {
  await connection();
  const { token } = await params;
  if (!isShareToken(token)) notFound();

  const row = await getRiderByShareToken(token);
  if (!row) notFound();

  const domainRider = Rider.fromDatabase(row);
  domainRider.linkedSessions = [];
  const initialRiderData = JSON.parse(JSON.stringify(domainRider));

  return (
    <RiderViewClient
      key={token}
      shareToken={token}
      initialRiderData={initialRiderData}
    />
  );
}

export default function ViewPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-[#f8f9fa] text-slate-500 font-bold text-sm">
          <span className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mr-3" />
          Cargando rider...
        </div>
      }
    >
      <ViewServer {...props} />
    </Suspense>
  );
}
