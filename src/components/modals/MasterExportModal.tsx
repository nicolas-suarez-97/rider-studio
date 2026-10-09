"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '../common/Icon';
import { StagePlotView } from '../workspace/StagePlotView';
import { Rider } from '@/core/models/Rider';
import { ExportScope, RiderType } from '@/core/types/rider.types';

interface MasterExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  rider: Rider;
  initialScope?: ExportScope;
  onShowToast?: (msg: string) => void;
}

export function MasterExportModal({
  isOpen,
  onClose,
  rider,
  initialScope = 'master',
  onShowToast
}: MasterExportModalProps) {
  const [scope, setScope] = useState<ExportScope>(initialScope);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const masterProgress = rider.getMasterProgress();
  const moduleStats = rider.getModuleStats();
  const allModules = rider.getAllModules();

  const handlePrint = () => {
    // Imprime la vista actual. Las clases @media print aseguran que solo se imprima el documento.
    window.print();
  };

  const handleCopyMarkdown = () => {
    const artist = rider.artistName || 'Artista / Banda';
    const tour = rider.season || 'Temporada Oficial';
    let md = `# MASTER PRODUCTION RIDER - ${artist.toUpperCase()}\n`;
    md += `**Gira / Temporada:** ${tour}\n`;
    md += `**Recinto:** ${rider.venue || 'Principal'}\n`;
    md += `**Versión:** ${rider.version || 'v1.0'}\n\n`;

    const scopesToInclude: RiderType[] = 
      scope === 'master' 
        ? ['tecnico', 'hospitality', 'seguridad'] 
        : [scope as RiderType];

    scopesToInclude.forEach((st) => {
      const titles = {
        tecnico: '1. ESPECIFICACIONES TÉCNICAS (AUDIO & ESCENARIO)',
        hospitality: '2. REQUERIMIENTOS DE HOSPITALITY & CATERING',
        seguridad: '3. SEGURIDAD & PLAN DE CONTINGENCIA'
      };
      md += `\n---\n## ${titles[st]}\n\n`;

      const mod = allModules[st];
      if (mod && mod.sections) {
        mod.sections.forEach((sec) => {
          md += `### ${sec.num}. ${sec.title} (${sec.tag})\n`;
          if (sec.content && sec.content.trim()) {
            md += `${sec.content.trim()}\n\n`;
          } else {
            md += `*(Especificaciones estándar según normativa de gira)*\n\n`;
          }
        });
      }

      if (st === 'tecnico' && mod.channels && mod.channels.length > 0) {
        md += `### INPUT LIST DE ESCENARIO (${mod.channels.length} CANALES)\n\n`;
        md += `| CH | Fuente | Micrófono Primario | Sustituto Homologado | Trípode / Stand | +48V | Sub-Snake |\n`;
        md += `|---|---|---|---|---|---|---|\n`;
        mod.channels.forEach((ch) => {
          md += `| ${ch.ch} | ${ch.name} | ${ch.mic} | ${ch.altMic || '-'} | ${ch.stand} | ${ch.phantom ? 'SI' : 'NO'} | ${ch.subSnake || '-'} |\n`;
        });
        md += `\n`;
      }
    });

    md += `\n---\n### FIRMAS DE CONFORMIDAD Y ACEPTACIÓN\n`;
    md += `Director Técnico de Gira: _______________________ Fecha: _________\n`;
    md += `Tour Manager / Producción: _______________________ Fecha: _________\n`;
    md += `Promotor Local / Venue: _______________________ Fecha: _________\n`;

    navigator.clipboard.writeText(md).then(() => {
      setIsCopied(true);
      if (onShowToast) onShowToast('📋 Rider copiado al portapapeles en formato Markdown');
      setTimeout(() => setIsCopied(false), 3000);
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-xs">
        {/* Backdrop click to close */}
        <div className="fixed inset-0" onClick={onClose} />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-5xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden text-slate-800"
        >
          {/* Header del Modal (no-print) */}
          <div className="px-6 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/90 no-print shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-violet-500/20">
                <Icon name="download" className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                    Centro de Exportación del Rider
                  </h3>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full border border-violet-200">
                    Rider de Producción
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Selecciona el alcance del documento para exportar o imprimir
                </p>
              </div>
            </div>

            {/* Acciones de exportación rápidas */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                title="Copiar texto en formato Markdown para compartir por email o Notion"
              >
                <Icon name={isCopied ? "check" : "copy"} className="w-3.5 h-3.5 text-slate-500" />
                <span>{isCopied ? '¡Copiado!' : 'Copiar Markdown'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-violet-500/25 active:scale-95 cursor-pointer"
              >
                <Icon name="printer" className="w-4 h-4" />
                <span>Imprimir / Guardar PDF</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all flex items-center justify-center cursor-pointer ml-auto sm:ml-1"
                title="Cerrar modal"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Selector de Alcance (Scope Tabs) (no-print) */}
          <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200/80 no-print flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2 shrink-0">
              Alcance del Documento:
            </span>

            {/* Opción 1: Rider Completo */}
            <button
              type="button"
              onClick={() => setScope('master')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                scope === 'master'
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/25'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <span>📄 Rider Completo (3 Departamentos)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${scope === 'master' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {masterProgress.percent}%
              </span>
            </button>

            {/* Opción 2: Solo Técnico */}
            <button
              type="button"
              onClick={() => setScope('tecnico')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                scope === 'tecnico'
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/25'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <span>🎛️ Módulo Técnico</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${scope === 'tecnico' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {moduleStats.tecnico.percent}%
              </span>
            </button>

            {/* Opción 3: Solo Hospitality */}
            <button
              type="button"
              onClick={() => setScope('hospitality')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                scope === 'hospitality'
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/25'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <span>☕ Módulo Hospitality</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${scope === 'hospitality' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {moduleStats.hospitality.percent}%
              </span>
            </button>

            {/* Opción 4: Solo Seguridad */}
            <button
              type="button"
              onClick={() => setScope('seguridad')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                scope === 'seguridad'
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/25'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <span>🛡️ Módulo Seguridad</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${scope === 'seguridad' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {moduleStats.seguridad.percent}%
              </span>
            </button>
          </div>

          {/* Área de Visualización del Documento (Imprimible) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/50">
            <div className="printable-dossier max-w-4xl mx-auto bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-12 shadow-md border border-slate-200/80 font-sans space-y-8">
              
              {/* Portada / Header Oficial de Gira */}
              <div className="border-b-2 border-slate-900 pb-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-widest text-violet-600 mb-1">
                      {scope === 'master' ? 'MASTER PRODUCTION RIDER' : `RIDER DEPARTAMENTAL: ${scope.toUpperCase()}`}
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                      {rider.artistName || 'NOMBRE DEL ARTISTA'}
                    </h1>
                    <p className="text-sm sm:text-base font-semibold text-slate-500 mt-1">
                      {scope === 'master' 
                        ? 'Rider General de Producción (Audio, Hospitality & Seguridad de Gira)' 
                        : rider.title}
                    </p>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 bg-slate-900 text-white rounded-full">
                      {rider.version || 'v1.0'} • OFICIAL
                    </span>
                    <div className="text-xs text-slate-400 mt-1.5 sm:mt-2 font-medium">
                      {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </div>

                {/* Fila de Metadatos de Producción */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Gira / Temporada</span>
                    <span className="font-bold text-slate-800">{rider.season || 'Temporada Oficial'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Recinto / Venue</span>
                    <span className="font-bold text-slate-800">{rider.venue || 'Escenario Principal'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Cumplimiento</span>
                    <span className="font-bold text-emerald-700">Contractual Obligatorio</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Progreso Rider</span>
                    <span className="font-bold text-violet-700">{masterProgress.completed}/{masterProgress.total} Secciones ({masterProgress.percent}%)</span>
                  </div>
                </div>
              </div>

              {/* Render de Módulos según Alcance */}
              {(scope === 'master' || scope === 'tecnico') && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-black text-sm">
                        1
                      </div>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900">
                        DEPARTAMENTO TÉCNICO & AUDIO
                      </h2>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      {moduleStats.tecnico.completed}/{moduleStats.tecnico.total} completadas
                    </span>
                  </div>

                  {/* Secciones Técnicas */}
                  <div className="space-y-4">
                    {allModules.tecnico.sections.map((sec) => (
                      <div key={sec.id} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            {sec.num}. {sec.title}
                          </h3>
                          <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200/60">
                            {sec.tag}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">{sec.subtitle}</p>
                        <div className="pt-2 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-normal">
                          {sec.content && sec.content.trim() ? sec.content : <span className="italic text-slate-400">Especificaciones sujetas a requerimientos estándar del rider.</span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input List Técnico */}
                  {allModules.tecnico.channels && allModules.tecnico.channels.length > 0 && (
                    <div className="pt-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                          Input List de Tarima ({allModules.tecnico.channels.length} Canales Activos)
                        </h3>
                        <span className="text-[11px] font-bold text-violet-600 bg-violet-50 px-2.5 py-0.5 rounded-full border border-violet-100">
                          Sub-Snakes Asignados
                        </span>
                      </div>

                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                              <th className="py-2 px-3 w-12 text-center">CH</th>
                              <th className="py-2 px-3">Fuente / Instrumento</th>
                              <th className="py-2 px-3">Micrófono Principal</th>
                              <th className="py-2 px-3">Sustituto Homologado</th>
                              <th className="py-2 px-3">Trípode / Stand</th>
                              <th className="py-2 px-3 text-center">+48V</th>
                              <th className="py-2 px-3">Sub-Snake</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {allModules.tecnico.channels.map((ch) => (
                              <tr key={ch.id} className="hover:bg-slate-50/60">
                                <td className="py-2 px-3 font-mono font-bold text-center text-slate-700 bg-slate-50/50">{ch.ch}</td>
                                <td className="py-2 px-3 font-bold text-slate-800">{ch.name}</td>
                                <td className="py-2 px-3 text-slate-600">{ch.mic}</td>
                                <td className="py-2 px-3 text-slate-500 italic">{ch.altMic || '-'}</td>
                                <td className="py-2 px-3 text-slate-600">{ch.stand}</td>
                                <td className="py-2 px-3 text-center">
                                  {ch.phantom ? <span className="text-amber-600 font-bold">+48V</span> : <span className="text-slate-300">-</span>}
                                </td>
                                <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{ch.subSnake || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Stage Plot 2D Oficial */}
                  <div className="pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                        Plano de Escenario 2D (Stage Plot Oficial)
                      </h3>
                      <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                        {rider.stagePlot?.stageWidth || 12}m × {rider.stagePlot?.stageDepth || 10}m
                      </span>
                    </div>
                    <StagePlotView
                      stagePlot={rider.stagePlot}
                      artistName={rider.artistName}
                      riderTitle={rider.title}
                      season={rider.season}
                      channels={allModules.tecnico.channels || []}
                      isCompact={true}
                    />
                  </div>
                </div>
              )}

              {/* Salto de página para impresión si es master */}
              {scope === 'master' && <div className="print-page-break my-6 border-t-2 border-dashed border-slate-200 no-print" />}

              {/* Módulo Hospitality */}
              {(scope === 'master' || scope === 'hospitality') && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black text-sm">
                        2
                      </div>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900">
                        DEPARTAMENTO HOSPITALITY, CATERING & CAMERINOS
                      </h2>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      {moduleStats.hospitality.completed}/{moduleStats.hospitality.total} completadas
                    </span>
                  </div>

                  <div className="space-y-4">
                    {allModules.hospitality.sections.map((sec) => (
                      <div key={sec.id} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            {sec.num}. {sec.title}
                          </h3>
                          <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200/60">
                            {sec.tag}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">{sec.subtitle}</p>
                        <div className="pt-2 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-normal">
                          {sec.content && sec.content.trim() ? sec.content : <span className="italic text-slate-400">Requerimientos de hospitalidad predefinidos por la gerencia de producción.</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Salto de página para impresión si es master */}
              {scope === 'master' && <div className="print-page-break my-6 border-t-2 border-dashed border-slate-200 no-print" />}

              {/* Módulo Seguridad */}
              {(scope === 'master' || scope === 'seguridad') && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-black text-sm">
                        3
                      </div>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900">
                        DEPARTAMENTO SEGURIDAD, ACCESOS & EMERGENCIAS
                      </h2>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      {moduleStats.seguridad.completed}/{moduleStats.seguridad.total} completadas
                    </span>
                  </div>

                  <div className="space-y-4">
                    {allModules.seguridad.sections.map((sec) => (
                      <div key={sec.id} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            {sec.num}. {sec.title}
                          </h3>
                          <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200/60">
                            {sec.tag}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">{sec.subtitle}</p>
                        <div className="pt-2 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-normal">
                          {sec.content && sec.content.trim() ? sec.content : <span className="italic text-slate-400">Protocolos de seguridad y contingencias operativas del recinto.</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bloque de Firmas y Validación Contractual */}
              <div className="pt-8 border-t-2 border-slate-900 space-y-6">
                <div className="text-center">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-800">
                    Aceptación y Validación de Requerimientos de Gira
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Este documento forma parte integral del anexo contractual de presentación en vivo.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 text-center">
                  <div className="border-t border-slate-400 pt-3">
                    <p className="text-xs font-bold text-slate-800">Director Técnico de Gira</p>
                    <p className="text-[10px] text-slate-400">Firma y Sello Oficial</p>
                  </div>
                  <div className="border-t border-slate-400 pt-3">
                    <p className="text-xs font-bold text-slate-800">Tour Manager / Producción</p>
                    <p className="text-[10px] text-slate-400">Firma y Sello Oficial</p>
                  </div>
                  <div className="border-t border-slate-400 pt-3">
                    <p className="text-xs font-bold text-slate-800">Promotor Local / Venue</p>
                    <p className="text-[10px] text-slate-400">Firma y Sello Oficial</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Footer del Modal (no-print) */}
          <div className="px-6 py-3 border-t border-slate-200/80 bg-slate-50/90 flex items-center justify-between no-print shrink-0">
            <span className="text-xs text-slate-500 font-medium">
              💡 Tip: Al imprimir, puedes seleccionar &quot;Guardar como PDF&quot; en tu navegador para generar el archivo digital.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
