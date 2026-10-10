'use client';

import React, { useRef, useState } from 'react';
import { Icon } from '@/components/common/Icon';
import { RiderThumb } from '@/components/common/RiderThumb';
import { RiderMediaItem } from '@/core/types/rider.types';
import { MAX_GALLERY_IMAGES, coverMedia } from '@/lib/media/rider-media';

interface RiderGalleryProps {
  media: RiderMediaItem[];
  artistName: string;
  editable?: boolean;
  busy?: boolean;
  onAdd?: (file: File) => Promise<void> | void;
  onRemove?: (id: string) => Promise<void> | void;
  onMakeCover?: (id: string) => Promise<void> | void;
  children: React.ReactNode;
}

export function RiderGallery({
  media,
  artistName,
  editable = false,
  busy = false,
  onAdd,
  onRemove,
  onMakeCover,
  children,
}: RiderGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cover = coverMedia(media);
  const [activeId, setActiveId] = useState<string | null>(cover?.id ?? null);
  const active = media.find((item) => item.id === activeId) ?? cover;
  const activeIndex = active ? media.findIndex((item) => item.id === active.id) : -1;

  const openPicker = () => {
    if (!editable || busy) return;
    inputRef.current?.click();
  };

  const onFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file && onAdd) void onAdd(file);
  };

  const step = (direction: -1 | 1) => {
    if (media.length === 0) return;
    const next = (activeIndex + direction + media.length) % media.length;
    setActiveId(media[next]?.id ?? null);
  };

  return (
    <div className="flex-1 min-w-0 w-full space-y-4">
      <div className="flex items-start gap-3 sm:gap-4 min-w-0">
        {editable && media.length === 0 ? (
          <button
            type="button"
            onClick={openPicker}
            disabled={busy}
            className="w-16 h-16 rounded-2xl border border-dashed border-violet-300 bg-violet-50 text-violet-700 text-[11px] font-bold shrink-0 cursor-pointer disabled:opacity-50"
          >
            Foto
          </button>
        ) : (
          <RiderThumb url={cover?.url} name={artistName} size={64} />
        )}
        <div className="flex-1 min-w-0">{children}</div>
      </div>

      {media.length > 0 ? (
        <div className="space-y-2">
          <div className="relative rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
            <img
              src={active?.url}
              alt=""
              className="w-full max-h-56 object-contain bg-slate-50"
            />
            {media.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 border border-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
                  aria-label="Foto anterior"
                >
                  <Icon name="arrowLeft" className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 border border-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
                  aria-label="Foto siguiente"
                >
                  <Icon name="arrowLeft" className="w-4 h-4 rotate-180" />
                </button>
              </>
            ) : null}
            {editable && active ? (
              <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                {!active.cover && onMakeCover ? (
                  <button
                    type="button"
                    onClick={() => void onMakeCover(active.id)}
                    disabled={busy}
                    className="h-8 px-2.5 rounded-full bg-white/95 border border-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer disabled:opacity-50"
                  >
                    Principal
                  </button>
                ) : null}
                {onRemove ? (
                  <button
                    type="button"
                    onClick={() => void onRemove(active.id)}
                    disabled={busy}
                    className="h-8 px-2.5 rounded-full bg-white/95 border border-slate-200 text-[11px] font-bold text-rose-600 cursor-pointer disabled:opacity-50"
                  >
                    Quitar
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {media.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                className={`relative shrink-0 rounded-xl overflow-hidden border-2 cursor-pointer ${
                  item.id === active?.id ? 'border-violet-600' : 'border-transparent'
                }`}
                aria-label={item.cover ? 'Foto principal' : 'Foto del rider'}
              >
                <img src={item.url} alt="" className="w-16 h-12 object-cover bg-slate-100" />
                {item.cover ? (
                  <span className="absolute bottom-0.5 left-0.5 text-[8px] font-black uppercase tracking-wide bg-white/90 text-violet-700 px-1 rounded">
                    Principal
                  </span>
                ) : null}
              </button>
            ))}
            {editable && media.length < MAX_GALLERY_IMAGES ? (
              <button
                type="button"
                onClick={openPicker}
                disabled={busy}
                className="w-16 h-12 shrink-0 rounded-xl border border-dashed border-violet-300 text-violet-700 text-lg font-bold cursor-pointer disabled:opacity-50"
                aria-label="Agregar foto"
              >
                +
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {editable ? (
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onFile}
        />
      ) : null}
    </div>
  );
}
