"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Icon } from './Icon';
import { RiderType } from '@/core/types/rider.types';

interface HeaderProps {
  pageType: 'landing' | 'workspace' | 'chat';
  riderType?: RiderType;
  onSelectRiderType?: (type: RiderType) => void;
  completedCount?: number;
  totalCount?: number;
  progressPercent?: number;
  onSaveRider?: () => void;
  isSaving?: boolean;
  dbSyncStatus?: 'idle' | 'saving' | 'saved' | 'error';
  onExport?: () => void;
  onOpenStagePlot?: () => void;
  onShare?: () => void;
}

export function Header({
  pageType,
  riderType = 'tecnico',
  onSelectRiderType,
  completedCount = 0,
  totalCount = 7,
  progressPercent = 0,
  onSaveRider,
  isSaving = false,
  dbSyncStatus = 'idle',
  onExport,
  onOpenStagePlot,
  onShare
}: HeaderProps) {
  const router = useRouter();

  return (
    <header className="h-16 px-6 sm:px-10 flex items-center justify-between border-b border-slate-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-40 shrink-0">
      <div className="flex items-center gap-4">
        {/* Logo */}
        <Link 
          href="/"
          className="flex items-center gap-2.5 group active:scale-95 transition-transform"
        >
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-violet-500/25 group-hover:scale-105 transition-transform shrink-0 ring-2 ring-white/80">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 4.5H12.5C14.9853 4.5 17 6.51472 17 9C17 11.4853 14.9853 13.5 12.5 13.5H6V4.5Z" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 13.5V19.5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"/>
              <path d="M12 13.5L17.5 19.5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="18.5" cy="5.5" r="2" fill="#F59E0B" />
            </svg>
          </div>
          <div className="flex flex-col leading-none">
            <div className="flex items-center gap-1">
              <span className="font-black text-lg tracking-tight text-slate-900">Rider</span>
              <span className="font-black text-lg tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent font-bold">Studio</span>
              <span className="w-1.5 h-1.5 rounded-full bg-violet-600 ml-0.5 animate-pulse" />
            </div>
            <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">
              Stage & Production Intelligence
            </span>
          </div>
        </Link>

        {/* Breadcrumb / Back button */}
        {pageType !== 'landing' && (
          <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-slate-200">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium px-2.5 py-1 rounded-full hover:bg-slate-100 transition-all active:scale-95"
            >
              <Icon name="arrowLeft" className="w-3.5 h-3.5" /> Volver al Inicio
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-700 capitalize">
              {pageType === 'workspace' ? 'Workspace 3 Paneles' : 'Asistente Multi-Agente'}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Rider Type Selector Pills in Header (Workspace only) */}
        {pageType === 'workspace' && onSelectRiderType && (
          <div className="hidden lg:flex items-center bg-slate-100/80 p-1 rounded-full border border-slate-200/60 mr-2">
            {(['tecnico', 'hospitality', 'seguridad'] as RiderType[]).map((type) => {
              const active = riderType === type;
              const titles = { tecnico: 'Técnico', hospitality: 'Hospitality', seguridad: 'Seguridad' };
              return (
                <button
                  key={type}
                  onClick={() => onSelectRiderType(type)}
                  className={`relative px-3.5 py-1 rounded-full text-xs font-semibold transition-colors duration-200 ${
                    active
                      ? 'text-slate-900'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="activeRiderTab"
                      className="absolute inset-0 bg-white rounded-full shadow-xs"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{titles[type]}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Indicador de progreso del Rider (Workspace only) */}
        {pageType === 'workspace' && (
          <div className="hidden sm:flex items-center gap-2.5 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200/60 text-xs">
            <div className="w-20 bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="font-bold text-slate-700">
              {completedCount} de {totalCount} secciones
            </span>
          </div>
        )}

        {/* Botón de Sincronización / Guardado en Supabase */}
        {pageType === 'workspace' && onSaveRider && (
          <button
            onClick={onSaveRider}
            disabled={isSaving}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
              dbSyncStatus === 'saved'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                : dbSyncStatus === 'error'
                ? 'bg-rose-50 text-rose-700 border border-rose-300'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 active:scale-95'
            }`}
            title="Guardar y sincronizar este rider en la base de datos Supabase"
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                <span>Guardando...</span>
              </>
            ) : dbSyncStatus === 'saved' ? (
              <>
                <Icon name="check" className="w-3.5 h-3.5 text-emerald-600" />
                <span>Guardado</span>
              </>
            ) : dbSyncStatus === 'error' ? (
              <>
                <span>⚠️ Reintentar</span>
              </>
            ) : (
              <>
                <Icon name="database" className="w-3.5 h-3.5 text-violet-600" />
                <span>Guardar Raider</span>
              </>
            )}
          </button>
        )}

        {/* Botón Acceso Rápido al Chat */}
        {pageType === 'workspace' && (
          <Link
            href="/chat"
            className="hidden md:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200/60 hover:bg-violet-100 transition-all active:scale-95"
          >
            <Icon name="messageSquare" className="w-3.5 h-3.5" />
            <span>Chat IA</span>
          </Link>
        )}

        {/* Acciones principales de Workspace */}
        {pageType === 'workspace' && (
          <div className="flex items-center gap-1.5">
            {onOpenStagePlot && (
              <button 
                onClick={onOpenStagePlot}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 transition-all active:scale-95"
              >
                <Icon name="map" className="w-3.5 h-3.5 text-slate-500" />
                <span>Stage Plot</span>
              </button>
            )}

            {onExport && (
              <button 
                onClick={onExport}
                className="bg-violet-600 hover:bg-violet-700 text-white px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs shadow-violet-500/25 flex items-center gap-1.5 active:scale-95"
              >
                <Icon name="download" className="w-3.5 h-3.5" />
                <span>Exportar PDF</span>
              </button>
            )}
          </div>
        )}

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center border-2 border-white shadow-xs">
          NS
        </div>
      </div>
    </header>
  );
}
