import { Suspense } from 'react';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { preserveSearchPath } from '@/lib/routes';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function ChatRedirect({ searchParams }: PageProps) {
  await connection();
  const params = await searchParams;
  redirect(preserveSearchPath('/artista/chat', params));
  return null;
}

export default function ChatRedirectPage(props: PageProps) {
  return (
    <Suspense fallback={null}>
      <ChatRedirect {...props} />
    </Suspense>
  );
}
