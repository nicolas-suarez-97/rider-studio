"use client";

import React from 'react';
import { Icon } from '../common/Icon';
import { ChannelInput } from '@/core/models/ChannelInput';
import { ChannelData } from '@/core/types/rider.types';

interface InputListTableProps {
  channels: ChannelInput[];
  onUpdateChannel: (chId: string, field: keyof ChannelData, val: string | boolean) => void;
  onAddChannel: () => void;
  onDeleteChannel: (chId: string) => void;
  readOnly?: boolean;
}

export function InputListTable({
  channels,
  onUpdateChannel,
  onAddChannel,
  onDeleteChannel,
  readOnly = false
}: InputListTableProps) {
  if (readOnly) {
    return (
      <div className="mt-4 border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="bg-slate-50/90 px-3.5 sm:px-4 py-2.5 border-b border-slate-200/80 flex items-center gap-2">
          <Icon name="list" className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="text-xs font-black text-slate-700 tracking-wide uppercase">
            Input List & Stage Patch
          </span>
          <span className="text-[10px] font-extrabold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
            {channels.length} {channels.length === 1 ? 'Canal' : 'Canales'}
          </span>
        </div>
        {channels.length === 0 ? (
          <div className="py-6 px-4 text-center text-xs text-slate-400 font-medium">
            No hay canales en este rider.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-2 px-3 font-bold">Ch</th>
                  <th className="py-2 px-3 font-bold">Fuente</th>
                  <th className="py-2 px-3 font-bold">Micrófono</th>
                  <th className="py-2 px-3 font-bold">Atril</th>
                  <th className="py-2 px-3 font-bold">+48V</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((ch) => (
                  <tr key={ch.id} className="border-t border-slate-100">
                    <td className="py-2 px-3 font-black text-slate-500">{ch.ch}</td>
                    <td className="py-2 px-3 font-bold text-slate-800">{ch.name}</td>
                    <td className="py-2 px-3 text-slate-600">{ch.mic || '—'}</td>
                    <td className="py-2 px-3 text-slate-600">{ch.stand || '—'}</td>
                    <td className="py-2 px-3 text-slate-600">{ch.phantom ? 'Sí' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs">
      {/* Header */}
      <div className="bg-slate-50/90 px-3.5 sm:px-4 py-2.5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon name="list" className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="text-xs font-black text-slate-700 tracking-wide uppercase">
            Input List & Stage Patch
          </span>
          <span className="text-[10px] font-extrabold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
            {channels.length} {channels.length === 1 ? 'Canal' : 'Canales'}
          </span>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={onAddChannel}
            className="text-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 px-2.5 sm:px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Icon name="plus" className="w-3 h-3 text-violet-600" />
            <span>Añadir Canal</span>
          </button>
        </div>
      </div>

      {/* VISTA 1: Mobile Cards (pantallas < 768px) */}
      <div className="block md:hidden divide-y divide-slate-100">
        {channels.length === 0 ? (
          <div className="py-6 px-4 text-center text-xs text-slate-400 font-medium">
            No hay canales agregados aún. Pulsa &quot;Añadir Canal&quot; para comenzar el patch list.
          </div>
        ) : (
          channels.map((ch) => (
            <div key={ch.id} className="p-3 bg-white space-y-2.5">
              {/* Encabezado del Canal Móvil */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center shrink-0 border border-slate-200/60">
                    {ch.ch}
                  </span>
                  <input
                    type="text"
                    value={ch.name}
                    onChange={(e) => onUpdateChannel(ch.id, 'name', e.target.value)}
                    placeholder="Fuente (ej. Voz Principal)"
                    className="flex-1 bg-slate-50/80 border border-slate-200/70 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-violet-500"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onUpdateChannel(ch.id, 'phantom', !ch.phantom)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${
                      ch.phantom
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-slate-100 text-slate-400 hover:text-slate-600 border border-slate-200/60'
                    }`}
                  >
                    +48V
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteChannel(ch.id)}
                    className="w-8 h-8 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 active:bg-rose-100 flex items-center justify-center transition-all cursor-pointer shrink-0"
                    title="Eliminar canal"
                  >
                    <Icon name="trash" className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Campos Mic / Alt Mic */}
              <div className="grid grid-cols-2 gap-2 pl-9">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Transductor Primario
                  </label>
                  <input
                    type="text"
                    value={ch.mic}
                    onChange={(e) => onUpdateChannel(ch.id, 'mic', e.target.value)}
                    placeholder="ej. Shure Beta 52A"
                    className="w-full bg-slate-50/60 border border-slate-200/60 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:bg-white focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Sustituto Homologado
                  </label>
                  <input
                    type="text"
                    value={ch.altMic || ''}
                    onChange={(e) => onUpdateChannel(ch.id, 'altMic', e.target.value)}
                    placeholder="ej. Audix D6"
                    className="w-full bg-slate-50/60 border border-slate-200/60 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:bg-white focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Campos Stand y Sub-snake */}
              <div className="grid grid-cols-2 gap-2 pl-9">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Atril / Stand
                  </label>
                  <input
                    type="text"
                    value={ch.stand}
                    onChange={(e) => onUpdateChannel(ch.id, 'stand', e.target.value)}
                    placeholder="ej. Pie Jirafa Corto"
                    className="w-full bg-slate-50/60 border border-slate-200/60 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 outline-none focus:bg-white focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Sub-Snake / Manguera
                  </label>
                  <input
                    type="text"
                    value={ch.subSnake || ''}
                    onChange={(e) => onUpdateChannel(ch.id, 'subSnake', e.target.value)}
                    placeholder="ej. Sub 1 Drums"
                    className="w-full bg-slate-50/60 border border-slate-200/60 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 outline-none focus:bg-white focus:border-violet-500"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* VISTA 2: Desktop / Tablet Table (pantallas >= 768px) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200/60 text-slate-400 font-bold text-[10px] uppercase">
              <th className="py-2.5 px-3 w-12 text-center">CH</th>
              <th className="py-2.5 px-3 w-40">Canal / Fuente</th>
              <th className="py-2.5 px-3">Transductor Principal</th>
              <th className="py-2.5 px-3">Sustituto Homologado</th>
              <th className="py-2.5 px-3 w-28">Atril / Stand</th>
              <th className="py-2.5 px-2 w-14 text-center">+48V</th>
              <th className="py-2.5 px-3 w-28">Sub-Snake</th>
              <th className="py-2.5 px-3 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {channels.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-slate-400 font-medium">
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
                      className="w-full bg-transparent font-bold text-slate-800 outline-none hover:bg-white focus:bg-white focus:ring-1 focus:ring-violet-300 px-2 py-1 rounded-lg transition-all text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={ch.mic}
                      onChange={(e) => onUpdateChannel(ch.id, 'mic', e.target.value)}
                      placeholder="ej. Shure SM58"
                      className="w-full bg-transparent font-medium text-slate-700 outline-none hover:bg-white focus:bg-white focus:ring-1 focus:ring-violet-300 px-2 py-1 rounded-lg transition-all text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={ch.altMic || ''}
                      onChange={(e) => onUpdateChannel(ch.id, 'altMic', e.target.value)}
                      placeholder="ej. Sennheiser e935"
                      className="w-full bg-transparent font-medium text-slate-500 outline-none hover:bg-white focus:bg-white focus:ring-1 focus:ring-violet-300 px-2 py-1 rounded-lg transition-all text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={ch.stand}
                      onChange={(e) => onUpdateChannel(ch.id, 'stand', e.target.value)}
                      placeholder="ej. Pie Jirafa"
                      className="w-full bg-transparent text-slate-500 outline-none hover:bg-white focus:bg-white focus:ring-1 focus:ring-violet-300 px-2 py-1 rounded-lg transition-all text-xs"
                    />
                  </td>
                  <td className="py-2 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => onUpdateChannel(ch.id, 'phantom', !ch.phantom)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-black transition-all cursor-pointer ${
                        ch.phantom
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'text-slate-300 hover:text-slate-500'
                      }`}
                      title={ch.phantom ? 'Phantom +48V activado' : 'Activar Phantom +48V'}
                    >
                      +48V
                    </button>
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={ch.subSnake || ''}
                      onChange={(e) => onUpdateChannel(ch.id, 'subSnake', e.target.value)}
                      placeholder="ej. Drums / SL"
                      className="w-full bg-transparent text-slate-500 outline-none hover:bg-white focus:bg-white focus:ring-1 focus:ring-violet-300 px-2 py-1 rounded-lg transition-all text-xs"
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onDeleteChannel(ch.id)}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-all p-1.5 rounded-md cursor-pointer"
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
