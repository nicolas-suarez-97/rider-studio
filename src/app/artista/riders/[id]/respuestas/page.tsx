import { Suspense } from 'react';
import { connection } from 'next/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/common/Header';
import { Rider } from '@/core/models/Rider';
import { confirmProgressLabel, hasPublishedShare, readShareConfirms } from '@/lib/artista/mis-riders';
import { readStoredContra } from '@/lib/promotor/contra-rider';
import { listSectionComments } from '@/lib/repositories/comment.repository';
import { getRiderById } from '@/lib/services/rider-storage';

interface PageProps {
  params: Promise<{ id: string }>;
}

function responseLabel(value: string): string {
  if (value === 'cubro') return 'Cubre';
  if (value === 'alternativa') return 'Alternativa';
  if (value === 'no_puedo') return 'No puede';
  if (value === 'pregunta') return 'Pregunta';
  return value;
}

async function RespuestasServer({ params }: PageProps) {
  await connection();
  const { id } = await params;
  const row = await getRiderById(id);
  if (!row) notFound();

  const rider = Rider.fromDatabase(row);
  const comments = await listSectionComments(row.id);
  const progress = readShareConfirms(row.metadata);
  const contra = readStoredContra(row.metadata);
  const answers = Object.entries(contra.answers).filter(([, answer]) => answer.response);
  const title = rider.artistName || rider.title || 'Rider';
  const canView = hasPublishedShare(row) || progress != null || comments.length > 0 || answers.length > 0;

  return (
    <div className="min-h-dvh bg-[#f8f9fa] text-zinc-900 flex flex-col font-sans antialiased pb-12">
      <Header pageType="landing" />
      <main className="max-w-3xl w-full mx-auto px-3 sm:px-6 py-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Respuestas</p>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">{title}</h1>
            {progress ? (
              <p className="mt-1 text-sm font-semibold text-slate-600">{confirmProgressLabel(progress)}</p>
            ) : null}
          </div>
          <Link
            href={`/artista/workspace?id=${encodeURIComponent(row.id)}`}
            className="h-10 px-4 rounded-full text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white inline-flex items-center shrink-0"
          >
            Editar
          </Link>
        </div>

        {!canView ? (
          <section className="bg-white rounded-2xl border border-slate-200/80 p-5">
            <p className="text-sm font-medium text-slate-600">
              Este rider todavía no tiene respuestas del organizador.
            </p>
          </section>
        ) : (
          <>
            {answers.length > 0 ? (
              <section className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3">
                <h2 className="text-sm font-black text-slate-900">Pedidos contestados</h2>
                <ul className="space-y-2">
                  {answers.map(([lineId, answer]) => (
                    <li key={lineId} className="text-sm text-slate-700">
                      <span className="font-bold">{responseLabel(answer.response)}</span>
                      {answer.offer ? <span className="text-slate-500"> · {answer.offer}</span> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3">
              <h2 className="text-sm font-black text-slate-900">Notas</h2>
              {comments.length === 0 ? (
                <p className="text-sm font-medium text-slate-500">Aún no hay notas en las secciones.</p>
              ) : (
                <ul className="space-y-3">
                  {comments.map((comment) => (
                    <li key={comment.id} className="text-sm">
                      <p className="font-bold text-slate-800">{comment.authorName}</p>
                      <p className="text-slate-600 whitespace-pre-wrap">{comment.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        <Link href="/artista" className="text-xs font-bold text-violet-700 hover:text-violet-900">
          Volver a Mis riders
        </Link>
      </main>
    </div>
  );
}

export default function RiderRespuestasPage(props: PageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center text-slate-500 font-bold text-sm">
        Cargando respuestas...
      </div>
    }>
      <RespuestasServer {...props} />
    </Suspense>
  );
}
