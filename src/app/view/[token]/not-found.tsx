import Link from 'next/link';

export default function ViewNotFound() {
  return (
    <div className="h-dvh flex flex-col items-center justify-center bg-[#f8f9fa] px-6 text-center">
      <h1 className="text-xl font-black text-slate-900">Este enlace no está disponible</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        El rider no existe o el enlace dejó de estar activo.
      </p>
      <Link
        href="/"
        className="mt-6 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-full text-xs font-bold"
      >
        Ir a Rider Studio
      </Link>
    </div>
  );
}
