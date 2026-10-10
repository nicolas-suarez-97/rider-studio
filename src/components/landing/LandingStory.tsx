import { Icon } from '@/components/common/Icon';

const PROBLEMS = [
  { image: '/landing/landing-pdf.jpg', title: 'El PDF se queda viejo', alt: 'Una pila de documentos impresos' },
  { image: '/landing/landing-mail.jpg', title: 'La respuesta se pierde en el correo', alt: 'Un documento flotando entre un computador y un teléfono' },
  { image: '/landing/landing-show.jpg', title: 'El día del show falta una sección', alt: 'Un escenario vacío con un cable suelto' },
];

const STEPS = [
  { image: '/landing/landing-build.jpg', title: 'Armas el rider', alt: 'Un músico junto a tarjetas de un documento' },
  { image: '/landing/landing-share.jpg', title: 'Lo compartes', alt: 'Un documento pasando de un computador a una tablet' },
  { image: '/landing/landing-answer.jpg', title: 'El venue responde', alt: 'Una persona en cabina revisando una tablet' },
];

const REASONS = [
  { icon: 'fileCheck', title: 'El cruce queda en las secciones' },
  { icon: 'send', title: 'No se envía si falta una respuesta' },
  { icon: 'lock', title: 'El rider del artista no se edita' },
];

export function LandingStory({ onEnter }: { onEnter: (role: 'artista' | 'promotor') => void }) {
  return (
    <div className="mt-14 sm:mt-20 space-y-14 sm:space-y-20">
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Hoy se pierde en el camino</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PROBLEMS.map((item) => (
            <figure key={item.title} className="bg-white rounded-[28px] border border-slate-200/80 overflow-hidden shadow-[0_8px_30px_-6px_rgba(100,116,139,0.06)]">
              <img src={item.image} alt={item.alt} className="w-full aspect-[4/3] object-cover bg-slate-50" />
              <figcaption className="px-4 py-3.5 text-sm font-black text-slate-900">{item.title}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">De la idea al contra-rider</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {STEPS.map((item, index) => (
            <figure key={item.title} className="bg-white rounded-[28px] border border-slate-200/80 overflow-hidden shadow-[0_8px_30px_-6px_rgba(100,116,139,0.06)]">
              <img src={item.image} alt={item.alt} className="w-full aspect-[4/3] object-cover bg-slate-50" />
              <figcaption className="px-4 py-3.5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-[11px] font-black inline-flex items-center justify-center shrink-0">
                  {index + 1}
                </span>
                <span className="text-sm font-black text-slate-900">{item.title}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Así queda una sección</h2>
        <div className="bg-white rounded-[28px] border border-slate-200/90 shadow-[0_8px_30px_-6px_rgba(100,116,139,0.06)] p-5 sm:p-6 grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-5 items-center">
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-full">
              Rider técnico
            </span>
            <h3 className="mt-3 text-lg font-black tracking-tight text-slate-900">Sistema de PA</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">Line array, cobertura y consola FOH.</p>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <span className="h-8 px-3 rounded-full bg-violet-600 text-white text-xs font-bold inline-flex items-center">Aprobado</span>
              <span className="h-8 px-3 rounded-full border border-slate-200 text-slate-500 text-xs font-bold inline-flex items-center">Alternativa</span>
              <span className="h-8 px-3 rounded-full border border-slate-200 text-slate-500 text-xs font-bold inline-flex items-center">Rechazado</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full w-1/3 rounded-full bg-violet-600" />
              </div>
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">1 de 9</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {REASONS.map((item) => (
          <div key={item.title} className="bg-white rounded-2xl border border-slate-200/80 px-4 py-4 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 inline-flex items-center justify-center shrink-0">
              <Icon name={item.icon} className="w-4 h-4" />
            </span>
            <p className="text-sm font-black text-slate-900 leading-snug">{item.title}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onEnter('artista')}
          className="text-left bg-white rounded-[28px] border border-slate-200/80 overflow-hidden shadow-[0_8px_30px_-6px_rgba(100,116,139,0.06)] hover:border-violet-300 cursor-pointer active:scale-[0.99]"
        >
          <img src="/landing/landing-artist.jpg" alt="Una banda en un escenario" className="w-full aspect-[4/3] object-cover bg-slate-50" />
          <span className="block px-4 py-3.5">
            <span className="block text-sm font-black text-slate-900">Para el artista</span>
            <span className="block text-xs font-medium text-slate-500 mt-0.5">Arma el rider y compártelo.</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onEnter('promotor')}
          className="text-left bg-white rounded-[28px] border border-slate-200/80 overflow-hidden shadow-[0_8px_30px_-6px_rgba(100,116,139,0.06)] hover:border-violet-300 cursor-pointer active:scale-[0.99]"
        >
          <img src="/landing/landing-promoter.jpg" alt="Una persona revisando el show desde la cabina" className="w-full aspect-[4/3] object-cover bg-slate-50" />
          <span className="block px-4 py-3.5">
            <span className="block text-sm font-black text-slate-900">Para el promotor</span>
            <span className="block text-xs font-medium text-slate-500 mt-0.5">Responde y envía el contra-rider.</span>
          </span>
        </button>
      </section>

      <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 pb-4">
        <button
          type="button"
          onClick={() => onEnter('artista')}
          className="h-10 px-4 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-500/25 cursor-pointer active:scale-95"
        >
          Soy el artista
        </button>
        <button
          type="button"
          onClick={() => onEnter('promotor')}
          className="h-10 px-4 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:border-violet-300 hover:text-violet-700 cursor-pointer active:scale-95"
        >
          Soy el promotor
        </button>
      </section>
    </div>
  );
}
