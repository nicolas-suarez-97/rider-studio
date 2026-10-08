"use client";

import React from 'react';
import { Icon } from '../common/Icon';
import { ChatSessionSummary } from '@/core/types/chat.types';

interface RecentChatsCardProps {
  conversations: ChatSessionSummary[];
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation?: (id: string, e: React.MouseEvent) => void;
}

export function RecentChatsCard({
  conversations,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation
}: RecentChatsCardProps) {
  return (
    <div className="w-full pt-2">
      <div className="bg-white/80 backdrop-blur-md rounded-[26px] p-4 sm:p-5 border border-white shadow-[0_8px_30px_-6px_rgba(100,116,139,0.06)] space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-violet-100 text-zinc-800 flex items-center justify-center font-bold">
              <Icon name="messageSquare" className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 leading-tight">
                Conversaciones y Consultas IA
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium">
                Retoma una conversación con los agentes de producción ({conversations.length})
              </p>
            </div>
          </div>
          <button
            onClick={onNewConversation}
            className="text-[11px] font-bold text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-full transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-xs"
          >
            <Icon name="plus" className="w-3 h-3" />
            <span>Nuevo Chat</span>
          </button>
        </div>

        {conversations.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-100">
            No hay conversaciones previas registradas. Escribe en la barra superior o pulsa &quot;Nuevo Chat&quot;.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
            {conversations.slice(0, 6).map((c) => (
              <div
                key={c.id}
                onClick={() => onSelectConversation(c.id)}
                className="group p-3 rounded-2xl border border-slate-200/70 bg-white hover:bg-slate-50/80 hover:border-violet-300 transition-all cursor-pointer flex items-center justify-between gap-2 shadow-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-violet-100 text-slate-500 group-hover:text-violet-600 flex items-center justify-center shrink-0 transition-colors">
                    <Icon name="messageSquare" className="w-3 h-3" />
                  </div>
                  <div className="truncate">
                    <span className="block text-xs font-bold text-slate-700 truncate group-hover:text-slate-900">
                      {c.title}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-slate-400">
                        {c.date}
                      </span>
                      {c.riderInfo && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700 border border-violet-200/60 truncate max-w-[110px]">
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
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-all cursor-pointer"
                      title="Eliminar conversación"
                    >
                      <Icon name="trash" className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span className="text-[10px] text-slate-400 group-hover:text-violet-600 font-bold">
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
