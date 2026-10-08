"use client";

import React from 'react';
import { Icon } from '../common/Icon';
import { ChannelInput } from '@/core/models/ChannelInput';

interface InputListTableProps {
  channels: ChannelInput[];
  onUpdateChannel: (chId: string, field: 'name' | 'mic' | 'stand', val: string) => void;
  onAddChannel: () => void;
  onDeleteChannel: (chId: string) => void;
}

export function InputListTable({
  channels,
  onUpdateChannel,
  onAddChannel,
  onDeleteChannel
}: InputListTableProps) {
  return (
    <div className="mt-4 border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs">
      <div className="bg-slate-50/90 px-4 py-2.5 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="list" className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-black text-slate-700 tracking-wide uppercase">
            Input List & Stage Patch
          </span>
          <span className="text-[10px] font-extrabold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
            {channels.length} Canales
          </span>
        </div>
        <button
          type="button"
          onClick={onAddChannel}
          className="text-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer active:scale-95"
        >
          <Icon name="plus" className="w-3 h-3" />
          <span>Añadir Canal</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200/60 text-slate-400 font-bold text-[10px] uppercase">
              <th className="py-2.5 px-3 w-14 text-center">CH</th>
              <th className="py-2.5 px-3">Canal / Fuente</th>
              <th className="py-2.5 px-3">Micrófono / DI</th>
              <th className="py-2.5 px-3">Atril / Stand</th>
              <th className="py-2.5 px-3 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {channels.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400 font-medium">
                  No hay canales agregados aún. Pulsa &quot;Añadir Canal&quot; para comenzar el patch list.
                </td>
              </tr>
            ) : (
              channels.map((ch) => (
                <tr key={ch.id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="py-2 px-3 text-center font-black text-slate-400 bg-slate-50/30">
                    {ch.ch}
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={ch.name}
                      onChange={(e) => onUpdateChannel(ch.id, 'name', e.target.value)}
                      placeholder="ej. Voz Principal"
                      className="w-full bg-transparent font-bold text-slate-800 outline-none hover:bg-white focus:bg-white focus:ring-1 focus:ring-violet-300 px-2 py-1 rounded-lg transition-all"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={ch.mic}
                      onChange={(e) => onUpdateChannel(ch.id, 'mic', e.target.value)}
                      placeholder="ej. Shure SM58"
                      className="w-full bg-transparent font-medium text-slate-600 outline-none hover:bg-white focus:bg-white focus:ring-1 focus:ring-violet-300 px-2 py-1 rounded-lg transition-all"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={ch.stand}
                      onChange={(e) => onUpdateChannel(ch.id, 'stand', e.target.value)}
                      placeholder="ej. Pie Jirafa"
                      className="w-full bg-transparent text-slate-500 outline-none hover:bg-white focus:bg-white focus:ring-1 focus:ring-violet-300 px-2 py-1 rounded-lg transition-all"
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onDeleteChannel(ch.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all p-1 rounded-md cursor-pointer"
                      title="Eliminar canal"
                    >
                      <Icon name="trash" className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
