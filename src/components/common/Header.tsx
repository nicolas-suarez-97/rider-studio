"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Icon } from './Icon';
import { RiderType, ExportScope } from '@/core/types/rider.types';

interface HeaderProps {
  pageType: 'landing' | 'workspace' | 'chat';
  riderType?: RiderType;
  onSelectRiderType?: (type: RiderType) => void;
  completedCount?: number;
  totalCount?: number;
  progressPercent?: number;
  moduleStats?: Record<RiderType, { completed: number; total: number; percent: number }>;
  masterProgress?: { completed: number; total: number; percent: number };
  onSaveRider?: () => void;
  isSaving?: boolean;
  dbSyncStatus?: 'idle' | 'saving' | 'saved' | 'error';
  onExport?: () => void;
  onOpenExportModal?: (scope?: ExportScope) => void;
  onOpenStagePlot?: () => void;
  onShare?: () => void;
  chatSessionId?: string | null;
  riderId?: string | null;
}

export function Header({
  pageType,
  riderType = 'tecnico',
  onSelectRiderType,
  completedCount = 0,
  totalCount = 7,
  progressPercent = 0,
  moduleStats,
  masterProgress,
  onExport,
  onOpenExportModal
}: HeaderProps) {
  const openExport = () => {
    if (onOpenExportModal) {
      onOpenExportModal('master');
    } else if (onExport) {
      onExport();
    }
  };

  return (
    <div className="sticky top-0 z-40 shrink-0 w-full flex flex-col">
      {/* ========================================================
          1. HEADER PRINCIPAL GLOBAL (Idéntico en todas las vistas)
         ======================================================== */}
      <header className="h-14 sm:h-16 px-3 sm:px-6 md:px-10 flex items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        {/* Logo de Marca */}
        <Link 
          href="/"
          prefetch={false}
          className="flex items-center gap-2 group active:scale-95 transition-transform shrink-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-violet-500/25 group-hover:scale-105 transition-transform shrink-0 ring-2 ring-white/80">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 4.5H12.5C14.9853 4.5 17 6.51472 17 9C17 11.4853 14.9853 13.5 12.5 13.5H6V4.5Z" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 13.5V19.5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"/>
              <path d="M12 13.5L17.5 19.5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="18.5" cy="5.5" r="2" fill="#F59E0B" />
            </svg>
          </div>
          <div className="flex flex-col leading-none">
            <div className="flex items-center gap-0.5 sm:gap-1">
              <span className="font-black text-base sm:text-lg tracking-tight text-slate-900">Rider</span>
              <span className="font-black text-base sm:text-lg tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent font-bold">Studio</span>
              <span className="w-1.5 h-1.5 rounded-full bg-violet-600 ml-0.5 animate-pulse" />
            </div>
            <span className="hidden sm:block text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">
              Stage & Production Intelligence
            </span>
          </div>
        </Link>

        {/* Acciones y Navegación Global */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <nav className="flex items-center gap-1 sm:gap-2 mr-0.5 sm:mr-1" aria-label="Navegación principal">
            <Link
              href="/chat"
              prefetch={false}
              aria-label="Asistente IA"
              title="Asistente IA"
              className={`w-8 h-8 rounded-xl bg-violet-100/90 text-violet-600 flex items-center justify-center transition-all active:scale-95 shrink-0 ${
                pageType === 'chat'
                  ? 'ring-2 ring-violet-500'
                  : 'hover:bg-violet-200'
              }`}
            >
              <Icon name="sparkles" className="w-4 h-4" />
            </Link>
            <Link
              href="/workspace?type=tecnico"
              prefetch={false}
              className="bg-violet-600 hover:bg-violet-700 text-white px-2.5 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs shadow-violet-500/25 flex items-center gap-1 sm:gap-1.5 active:scale-95 shrink-0"
            >
              <Icon name="plus" className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nuevo Rider</span>
              <span className="sm:hidden">Rider</span>
            </Link>
          </nav>

          {/* Avatar de Usuario */}
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-[11px] sm:text-xs flex items-center justify-center border-2 border-white shadow-xs shrink-0">
            NS
          </div>
        </div>
      </header>

      {/* ========================================================
          2. SUBHEADER: Herramientas contextuales de Workspace
         ======================================================== */}
      {pageType === 'workspace' && (
        <>
        <div className="h-12 px-3 sm:px-6 md:px-10 flex items-center justify-center md:justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-sm text-xs gap-2 overflow-x-auto no-scrollbar shrink-0">
          {/* Selector de Tipo de Rider */}
          {onSelectRiderType && (
              <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200/70">
                {(['tecnico', 'hospitality', 'seguridad'] as RiderType[]).map((type) => {
                  const active = riderType === type;
                  const titles = { tecnico: 'Técnico', hospitality: 'Hospitality', seguridad: 'Seguridad' };
                  const stat = moduleStats?.[type];
                  const is100 = stat && stat.percent === 100;

                  return (
                    <button
                      key={type}
                      onClick={() => onSelectRiderType(type)}
                      className={`relative px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 cursor-pointer flex items-center gap-1.5 ${
                        active ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {active && (
                        <motion.div
                          layoutId="activeRiderTabSubheader"
                          className="absolute inset-0 bg-white rounded-full shadow-2xs"
                          transition={{ type: "spring", stiffness: 600, damping: 36 }}
                        />
                      )}
                      <span className="relative z-10">{titles[type]}</span>
                      {stat && (
                        <span 
                          className={`relative z-10 text-[9px] font-black px-1.5 py-0.2 rounded-full transition-colors ${
                            is100
                              ? 'bg-emerald-100 text-emerald-700'
                              : active
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-slate-200/80 text-slate-500'
                          }`}
                        >
                          {stat.completed}/{stat.total}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
          )}

          {/* Progreso y exportación: solo escritorio. En móvil, Exportar es un botón flotante. */}
          <div className="hidden md:flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Indicador de Progreso del Módulo Activo */}
            <div className="hidden md:flex items-center gap-2 bg-slate-100/90 px-2.5 py-1 rounded-full border border-slate-200/60 text-xs">
              <div className="w-12 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="font-bold text-slate-700 whitespace-nowrap text-[11px]">
                {completedCount}/{totalCount}
              </span>
            </div>

            {/* Progreso Global del Rider General */}
            {masterProgress && (
              <div 
                className="hidden xl:flex items-center gap-2 bg-violet-50/80 px-3 py-1 rounded-full border border-violet-200/70 text-xs"
                title="Progreso consolidado de los 3 módulos del Rider de Producción"
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-violet-600">Rider:</span>
                <div className="w-14 bg-violet-200/70 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-violet-600 h-full transition-all duration-300"
                    style={{ width: `${masterProgress.percent}%` }}
                  />
                </div>
                <span className="font-black text-violet-800 whitespace-nowrap text-[11px]">
                  {masterProgress.completed}/{masterProgress.total} ({masterProgress.percent}%)
                </span>
              </div>
            )}



            {/* Botón de Exportación Directo */}
            <button 
              type="button"
              onClick={openExport}
              className="bg-violet-600 hover:bg-violet-700 text-white px-3.5 py-1 rounded-full text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer shrink-0"
              title="Abrir centro de exportación para imprimir o guardar PDF"
            >
              <Icon name="download" className="w-3.5 h-3.5" />
              <span>Exportar</span>
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={openExport}
          className="md:hidden fixed z-30 right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] w-11 h-11 rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/30 flex items-center justify-center active:scale-95 cursor-pointer"
          aria-label="Exportar"
          title="Exportar"
        >
          <Icon name="download" className="w-4 h-4" />
        </button>
        </>
      )}


    </div>
  );
}
