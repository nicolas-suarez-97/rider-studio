"use client";

import React, { useRef, useState } from 'react';
import { Icon } from '@/components/common/Icon';
import { formatAttachmentSize } from '@/core/utils/chat-attachments';

export interface InventoryItem {
  id: string;
  name: string;
  size: number;
  detail: string;
}

interface InventoryStepProps {
  items: InventoryItem[];
  disabled: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onCancel: () => void;
  onGenerate: () => void;
}

export function InventoryStep({
  items,
  disabled,
  onAdd,
  onRemove,
  onCancel,
  onGenerate,
}: InventoryStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const take = (list: FileList | null) => {
    if (!list?.length) return;
    onAdd(Array.from(list));
  };

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4">
      <div className="bg-white border border-slate-200/80 rounded-[28px] shadow-[0_8px_30px_-6px_rgba(100,116,139,0.06)] px-5 sm:px-8 py-6 sm:py-8">
        <p className="text-[10px] font-black uppercase tracking-wider text-violet-700">Generar contra-rider</p>
        <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">Sube los datos que tengas</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
          No hace falta un contra-rider estructurado. Sube inventarios, cotizaciones, listas, fichas técnicas o notas. El asistente cruza eso con lo que pide el artista y arma el archivo del contra-rider.
        </p>

        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            take(event.dataTransfer.files);
          }}
          className={`mt-6 w-full rounded-[24px] border border-dashed px-4 py-8 text-center cursor-pointer disabled:opacity-40 ${
            dragOver ? 'border-violet-400 bg-violet-50/70' : 'border-slate-300 bg-slate-50/70 hover:border-violet-300 hover:bg-violet-50/40'
          }`}
        >
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-violet-600 border border-violet-100">
            <Icon name="paperclip" className="w-4 h-4" />
          </span>
          <span className="mt-3 block text-sm font-bold text-slate-800">PDF, Word o texto</span>
          <span className="mt-1 block text-xs text-slate-500">Pueden ser varios archivos sueltos. Sirve lo que tengas a mano.</span>
          <span className="mt-3 flex flex-wrap justify-center gap-1.5">
            {['Inventario', 'Cotización', 'Hospitality', 'Ficha técnica', 'Notas'].map((label) => (
              <span key={label} className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-[10px] font-bold text-slate-500">
                {label}
              </span>
            ))}
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.docx,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(event) => {
            take(event.target.files);
            event.target.value = '';
          }}
        />

        {items.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-3.5 py-3 bg-white">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                  <p className="text-[11px] font-semibold text-slate-400">
                    {formatAttachmentSize(item.size)} · {item.detail}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onRemove(item.id)}
                  className="text-[11px] font-bold text-slate-400 hover:text-rose-600 disabled:opacity-40 cursor-pointer shrink-0"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="h-10 px-4 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onGenerate}
            disabled={disabled || items.length === 0}
            className="h-10 px-4 rounded-full bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
          >
            Generar contra-rider
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
          Cada pedido del artista se cruza con estos datos. Si algo no aparece, el archivo lo deja como No puedo. Esto no envía el contra-rider.
        </p>
      </div>
    </div>
  );
}
