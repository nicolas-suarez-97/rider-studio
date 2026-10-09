import { Suspense } from 'react';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { preserveSearchPath } from '@/lib/routes';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function WorkspaceRedirect({ searchParams }: PageProps) {
  await connection();
  const params = await searchParams;
  redirect(preserveSearchPath('/artista/workspace', params));
  return null;
}

export default function WorkspaceRedirectPage(props: PageProps) {
  return (
    <Suspense fallback={null}>
      <WorkspaceRedirect {...props} />
    </Suspense>
  );
}
