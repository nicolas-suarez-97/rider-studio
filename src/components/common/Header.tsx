"use client";

import React from 'react';
import Link from 'next/link';
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
  onSaveRider,
  isSaving = false,
  dbSyncStatus = 'idle',
  onExport,
  onOpenStagePlot,
  chatSessionId,
  riderId
}: HeaderProps) {
  return (
    <div className="sticky top-0 z-40 shrink-0 w-full flex flex-col">
      {/* ========================================================
          1. HEADER PRINCIPAL GLOBAL (Idéntico en todas las vistas)
         ======================================================== */}
      <header className="h-14 sm:h-16 px-3 sm:px-6 md:px-10 flex items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        {/* Logo de Marca */}
        <Link 
          href="/"
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
              href="/workspace?type=tecnico"
              className={`text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-full transition-all active:scale-95 shrink-0 ${
                pageType === 'workspace'
                  ? 'bg-violet-50 text-violet-700 font-bold border border-violet-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>Workspace</span>
            </Link>
            <Link
              href="/chat"
              className={`text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-full transition-all active:scale-95 shrink-0 ${
                pageType === 'chat'
                  ? 'bg-violet-50 text-violet-700 font-bold border border-violet-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className="hidden sm:inline">Asistente IA</span>
              <span className="sm:hidden">Chat</span>
            </Link>
            <Link
              href="/workspace?type=tecnico"
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
        <div className="h-12 px-3 sm:px-6 md:px-10 flex items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-sm text-xs gap-2 overflow-x-auto no-scrollbar shrink-0">
          {/* Lado Izquierdo: Breadcrumb & Selector de Plantilla */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-medium px-2 py-1 rounded-lg hover:bg-slate-100 transition-all active:scale-95"
              title="Volver al inicio"
            >
              <Icon name="arrowLeft" className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Inicio</span>
            </Link>
            <span className="text-slate-300 hidden sm:inline">/</span>

            {/* Selector de Tipo de Rider en Subheader */}
            {onSelectRiderType && (
              <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200/70">
                {(['tecnico', 'hospitality', 'seguridad'] as RiderType[]).map((type) => {
                  const active = riderType === type;
                  const titles = { tecnico: 'Técnico', hospitality: 'Hospitality', seguridad: 'Seguridad' };
                  return (
                    <button
                      key={type}
                      onClick={() => onSelectRiderType(type)}
                      className={`relative px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 cursor-pointer ${
                        active ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {active && (
                        <motion.div
                          layoutId="activeRiderTabSubheader"
                          className="absolute inset-0 bg-white rounded-full shadow-2xs"
                          transition={{ type: "spring", stiffness: 450, damping: 35 }}
                        />
                      )}
                      <span className="relative z-10">{titles[type]}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lado Derecho: Progreso, Guardado, Acciones de Exportación */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Indicador de Progreso */}
            <div className="hidden md:flex items-center gap-2 bg-slate-100/90 px-2.5 py-1 rounded-full border border-slate-200/60 text-xs">
              <div className="w-14 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="font-bold text-slate-700 whitespace-nowrap text-[11px]">
                {completedCount}/{totalCount}
              </span>
            </div>

            {/* Guardar en Supabase */}
            {onSaveRider && (
              <button
                onClick={onSaveRider}
                disabled={isSaving}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer ${
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
                    <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Guardando...</span>
                  </>
                ) : dbSyncStatus === 'saved' ? (
                  <>
                    <Icon name="check" className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">Guardado</span>
                  </>
                ) : dbSyncStatus === 'error' ? (
                  <span>⚠️ Reintentar</span>
                ) : (
                  <>
                    <Icon name="database" className="w-3.5 h-3.5 text-violet-600" />
                    <span>Guardar</span>
                  </>
                )}
              </button>
            )}

            {/* Stage Plot */}
            {onOpenStagePlot && (
              <button 
                onClick={onOpenStagePlot}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 transition-all active:scale-95 shadow-2xs cursor-pointer"
              >
                <Icon name="map" className="w-3.5 h-3.5 text-slate-500" />
                <span>Stage Plot</span>
              </button>
            )}

            {/* Acceso al Chat IA del Rider */}
            <Link
              href={chatSessionId ? `/chat?session=${chatSessionId}` : riderId ? `/chat?riderId=${riderId}` : '/chat'}
              className="hidden lg:flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200/60 hover:bg-violet-100 transition-all active:scale-95"
              title="Abrir asistente de chat para este rider"
            >
              <Icon name="messageSquare" className="w-3 h-3" />
              <span>Chat IA</span>
            </Link>

            {/* Exportar PDF */}
            {onExport && (
              <button 
                onClick={onExport}
                className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1 rounded-full text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Icon name="download" className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exportar PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          3. SUBHEADER: Herramientas contextuales de Chat
         ======================================================== */}
      {pageType === 'chat' && (
        <div className="h-10 px-3 sm:px-6 md:px-10 flex items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-sm text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-500">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-medium px-2 py-0.5 rounded-md hover:bg-slate-100 transition-all active:scale-95"
              title="Volver al inicio"
            >
              <Icon name="arrowLeft" className="w-3 h-3" />
              <span>Inicio</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-700">Asistente Multi-Agente</span>
            <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1.5" />
            <span className="hidden sm:inline text-[11px] text-slate-500 font-medium">4 Agentes Especializados de Producción</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/workspace?type=tecnico"
              className="text-violet-600 hover:text-violet-800 font-bold text-xs flex items-center gap-1 hover:underline"
            >
              <span>Ir al Workspace</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
