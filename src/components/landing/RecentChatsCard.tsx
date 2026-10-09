"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../common/Icon';
import { ChatSessionSummary } from '@/core/types/chat.types';

interface RecentChatsCardProps {
  conversations: ChatSessionSummary[];
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation?: (id: string, e: React.MouseEvent) => void;
}

const SUGGESTED_PROMPTS = [
  {
    icon: 'speaker',
    title: 'Microfonía & Canales',
    desc: '¿Qué microfonía y DIs convienen para 5 músicos con batería acústica y vientos?',
    prompt: '¿Qué microfonía y cajas directas convienen para una banda de 5 músicos con batería acústica y vientos?'
  },
  {
    icon: 'flame',
    title: 'Potencia Eléctrica',
    desc: 'Calcula acometida trifásica y potencia para PA Line Array e iluminación móvil.',
    prompt: 'Calcula la potencia eléctrica y acometida requerida para sonido Line Array e iluminación móvil en festival.'
  },
  {
    icon: 'shield',
    title: 'Seguridad & Aforo',
    desc: 'Protocolos de evacuación, personal de control y ambulancias para 3.000 personas.',
    prompt: 'Protocolos de seguridad, salidas de emergencia y ambulancias requeridas para aforo de 3.000 personas.'
  }
];

export function RecentChatsCard({
  conversations,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation
}: RecentChatsCardProps) {
  const router = useRouter();

  const handleLaunchPrompt = (prompt: string) => {
    router.push(`/artista/chat?prompt=${encodeURIComponent(prompt)}`);
  };

  return (
    <div className="w-full space-y-4 pt-2">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200/90 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs shrink-0">
            <Icon name="messageSquare" className="w-4 h-4" />
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900">
            Conversaciones Recientes
          </h2>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/60">
            {conversations.length}
          </span>
        </div>
        <button
          onClick={onNewConversation}
          className="text-xs font-bold text-violet-700 hover:text-violet-900 bg-violet-50 hover:bg-violet-100 px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-xs border border-violet-200/60"
        >
          <Icon name="plus" className="w-3.5 h-3.5" />
          <span>Nuevo Chat</span>
        </button>
      </div>

      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-[0_8px_30px_-6px_rgba(100,116,139,0.06)] space-y-4">

        {conversations.length === 0 ? (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Consultas sugeridas para comenzar:
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Haz clic para iniciar el chat interactivo
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {SUGGESTED_PROMPTS.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => handleLaunchPrompt(item.prompt)}
                  className="group text-left p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-violet-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-2 active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Icon name={item.icon} className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-violet-700 transition-colors">
                      {item.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                    {item.desc}
                  </p>
                  <div className="flex items-center justify-between text-xs font-semibold text-violet-600 pt-1 border-t border-slate-100">
                    <span>Preguntar al agente</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {conversations.slice(0, 6).map((c) => (
              <div
                key={c.id}
                onClick={() => onSelectConversation(c.id)}
                className="group p-3.5 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50/90 hover:border-violet-300 transition-all cursor-pointer flex items-center justify-between gap-2.5 shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-violet-100 text-slate-500 group-hover:text-violet-600 flex items-center justify-center shrink-0 transition-colors">
                    <Icon name="messageSquare" className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <span className="block text-xs font-bold text-slate-800 truncate group-hover:text-violet-700 transition-colors">
                      {c.title}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-slate-500 font-medium">
                        {c.date}
                      </span>
                      {c.riderInfo && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700 border border-violet-200/60 truncate max-w-[120px]">
                          🎸 {c.riderInfo.artistName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {onDeleteConversation && (
                    <button
                      type="button"
                      onClick={(e) => onDeleteConversation(c.id, e)}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-all cursor-pointer"
                      title="Eliminar conversación"
                    >
                      <Icon name="trash" className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span className="text-xs text-slate-400 group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all font-bold">
                    →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
