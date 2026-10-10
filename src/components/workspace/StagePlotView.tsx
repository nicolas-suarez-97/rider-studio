"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Icon } from '../common/Icon';
import { StagePlotConfig, StageElement, ChannelData } from '@/core/types/rider.types';
import { STAGE_PRESET_TEMPLATES, DEFAULT_STAGE_PLOT } from '@/core/constants/stage-plot';

let elementCounter = 0;
function generateUniqueId(): string {
  elementCounter += 1;
  return `sp-el-${elementCounter}`;
}

interface StagePlotViewProps {
  stagePlot: StagePlotConfig;
  onUpdateStagePlot?: (newConfig: StagePlotConfig) => void;
  onUploadReferenceImage?: (file: File) => Promise<void>;
  onRemoveReferenceImage?: () => Promise<void>;
  artistName?: string;
  riderTitle?: string;
  season?: string;
  channels?: ChannelData[];
  onOpenModal?: () => void;
  isCompact?: boolean;
}

export function StagePlotView({
  stagePlot,
  onUpdateStagePlot,
  onUploadReferenceImage,
  onRemoveReferenceImage,
  artistName = 'Artista / Banda',
  riderTitle = 'Rider de Producción',
  season = 'Gira Oficial',
  channels = [],
  onOpenModal,
  isCompact = false
}: StagePlotViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingElement, setEditingElement] = useState<StageElement | null>(null);
  const [plotView, setPlotView] = useState<'plot' | 'photo'>('plot');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const stageCanvasRef = useRef<HTMLDivElement>(null);
  const draggingIdRef = useRef<string | null>(null);

  const elements = Array.isArray(stagePlot?.elements) ? stagePlot.elements : DEFAULT_STAGE_PLOT.elements;
  const stageWidth = stagePlot?.stageWidth || DEFAULT_STAGE_PLOT.stageWidth;
  const stageDepth = stagePlot?.stageDepth || DEFAULT_STAGE_PLOT.stageDepth;
  const stageHeight = stagePlot?.stageHeight || DEFAULT_STAGE_PLOT.stageHeight;

  // Actualizar una propiedad de las dimensiones
  const handleUpdateDimensions = (field: 'stageWidth' | 'stageDepth' | 'stageHeight', value: number) => {
    if (!onUpdateStagePlot) return;
    onUpdateStagePlot({
      ...stagePlot,
      [field]: value
    });
  };

  // Manejar arrastre táctil o con ratón
  const handleMouseDownOnElement = (e: React.MouseEvent, id: string) => {
    if (!isEditing) return;
    e.stopPropagation();
    draggingIdRef.current = id;
    setSelectedElementId(id);
  };

  const handleTouchStartOnElement = (e: React.TouchEvent, id: string) => {
    if (!isEditing) return;
    e.stopPropagation();
    draggingIdRef.current = id;
    setSelectedElementId(id);
  };

  const handleMouseMoveOrTouch = useCallback((clientX: number, clientY: number) => {
    if (!draggingIdRef.current || !stageCanvasRef.current || !onUpdateStagePlot) return;

    const rect = stageCanvasRef.current.getBoundingClientRect();
    const rawX = ((clientX - rect.left) / rect.width) * 100;
    const rawY = ((clientY - rect.top) / rect.height) * 100;

    // Limitar entre 5% y 95% para que no se salga de la tarima
    const clampedX = Math.round(Math.max(6, Math.min(94, rawX)));
    const clampedY = Math.round(Math.max(14, Math.min(88, rawY)));

    const updatedElements = elements.map((el) => {
      if (el.id === draggingIdRef.current) {
        return { ...el, x: clampedX, y: clampedY };
      }
      return el;
    });

    onUpdateStagePlot({
      ...stagePlot,
      elements: updatedElements
    });
  }, [elements, stagePlot, onUpdateStagePlot]);

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (draggingIdRef.current) {
      handleMouseMoveOrTouch(e.clientX, e.clientY);
    }
  };

  const handleCanvasTouchMove = (e: React.TouchEvent) => {
    if (draggingIdRef.current && e.touches[0]) {
      handleMouseMoveOrTouch(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleEndDrag = () => {
    draggingIdRef.current = null;
  };

  // Añadir un elemento desde plantilla
  const handleAddPreset = (tpl: typeof STAGE_PRESET_TEMPLATES[0]) => {
    if (!onUpdateStagePlot) return;
    const newEl: StageElement = {
      id: generateUniqueId(),
      name: tpl.name,
      category: tpl.category,
      icon: tpl.icon,
      x: 50,
      y: 50,
      notes: tpl.defaultNotes || '',
      powerRequirement: tpl.defaultPower || ''
    };

    onUpdateStagePlot({
      ...stagePlot,
      elements: [...elements, newEl]
    });
    setShowAddMenu(false);
    setSelectedElementId(newEl.id);
    setEditingElement(newEl);
  };

  // Eliminar un elemento
  const handleDeleteElement = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!onUpdateStagePlot) return;
    onUpdateStagePlot({
      ...stagePlot,
      elements: elements.filter(el => el.id !== id)
    });
    if (selectedElementId === id) setSelectedElementId(null);
    if (editingElement?.id === id) setEditingElement(null);
  };

  // Guardar edición de un elemento
  const handleSaveElementEdit = (updated: StageElement) => {
    if (!onUpdateStagePlot) return;
    onUpdateStagePlot({
      ...stagePlot,
      elements: elements.map(el => el.id === updated.id ? updated : el)
    });
    setEditingElement(null);
  };

  // Restaurar distribución predeterminada
  const handleResetDefault = () => {
    const ok = window.confirm('¿Deseas restaurar la distribución predeterminada del escenario?');
    if (!ok || !onUpdateStagePlot) return;
    onUpdateStagePlot({
      ...JSON.parse(JSON.stringify(DEFAULT_STAGE_PLOT)),
      referenceImageUrl: stagePlot.referenceImageUrl,
      referenceImagePath: stagePlot.referenceImagePath,
    });
    setSelectedElementId(null);
    setEditingElement(null);
  };

  return (
    <div 
      className="space-y-4 font-sans select-none"
      onMouseUp={handleEndDrag}
      onTouchEnd={handleEndDrag}
    >
      {/* Barra Superior de Herramientas y Dimensiones */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-100">
            <Icon name="map" className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Dimensiones de Tarima
              </span>
              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 hidden sm:inline-block">
                {artistName} • {season}
              </span>
            </div>
            {isEditing ? (
              <div className="flex flex-wrap items-center gap-1.5 text-xs mt-0.5">
                <input
                  type="number"
                  step="0.5"
                  value={stageWidth}
                  onChange={(e) => handleUpdateDimensions('stageWidth', parseFloat(e.target.value) || 12)}
                  className="w-12 bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-center font-bold text-slate-800"
                />
                <span className="text-slate-400">m Ancho ×</span>
                <input
                  type="number"
                  step="0.5"
                  value={stageDepth}
                  onChange={(e) => handleUpdateDimensions('stageDepth', parseFloat(e.target.value) || 10)}
                  className="w-12 bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-center font-bold text-slate-800"
                />
                <span className="text-slate-400">m Fondo ×</span>
                <input
                  type="number"
                  step="0.1"
                  value={stageHeight}
                  onChange={(e) => handleUpdateDimensions('stageHeight', parseFloat(e.target.value) || 1.5)}
                  className="w-12 bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-center font-bold text-slate-800"
                />
                <span className="text-slate-400">m Alto</span>
              </div>
            ) : (
              <span className="font-mono text-xs font-bold text-indigo-700 break-words">
                {stageWidth}m (Ancho) × {stageDepth}m (Fondo) × {stageHeight}m (Alto)
              </span>
            )}
          </div>
        </div>

        {/* Acciones de Edición / Pantalla Completa */}
        <div className="flex items-center gap-2 flex-wrap">
          {stagePlot.referenceImageUrl ? (
            <div className="flex items-center gap-1 no-print">
              <button
                type="button"
                onClick={() => setPlotView('plot')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  plotView === 'plot' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                Plano 2D
              </button>
              <button
                type="button"
                onClick={() => setPlotView('photo')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  plotView === 'photo' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                Foto
              </button>
            </div>
          ) : null}
          {onUploadReferenceImage ? (
            <>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer disabled:opacity-50 no-print"
              >
                {uploadingPhoto ? 'Subiendo…' : stagePlot.referenceImageUrl ? 'Reemplazar foto' : 'Subir foto'}
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file || !onUploadReferenceImage) return;
                  setUploadingPhoto(true);
                  void onUploadReferenceImage(file)
                    .then(() => setPlotView('photo'))
                    .catch(() => undefined)
                    .finally(() => setUploadingPhoto(false));
                }}
              />
            </>
          ) : null}
          {onRemoveReferenceImage && stagePlot.referenceImageUrl ? (
            <button
              type="button"
              onClick={() => void onRemoveReferenceImage()}
              disabled={uploadingPhoto}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-white border border-slate-200 cursor-pointer disabled:opacity-50 no-print"
            >
              Quitar foto
            </button>
          ) : null}
          {onUpdateStagePlot && (
            <button
              type="button"
              onClick={() => setIsEditing(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                isEditing
                  ? 'bg-indigo-600 text-white shadow-indigo-500/25'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Icon name="edit" className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Modo Vista Previa' : 'Editar Plano 2D'}</span>
            </button>
          )}

          {isEditing && onUpdateStagePlot && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAddMenu(prev => !prev)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Icon name="plus" className="w-3.5 h-3.5 text-indigo-600" />
                <span>+ Instrumento</span>
              </button>

              {/* Menú de selección de elementos preestablecidos */}
              {showAddMenu && (
                <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 py-1 z-50 animate-fade-in text-xs max-h-72 overflow-y-auto">
                  <div className="px-3 py-1 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                    Añadir a Escenario
                  </div>
                  {STAGE_PRESET_TEMPLATES.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleAddPreset(tpl)}
                      className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-slate-700 font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <span className="text-base">{tpl.icon}</span>
                      <span className="truncate">{tpl.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {isEditing && onUpdateStagePlot && (
            <button
              type="button"
              onClick={handleResetDefault}
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 bg-white transition-all cursor-pointer"
              title="Restaurar plano predeterminado"
            >
              <Icon name="trash" className="w-3.5 h-3.5" />
            </button>
          )}

          {onOpenModal && (
            <button
              type="button"
              onClick={onOpenModal}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all flex items-center gap-1 cursor-pointer"
              title="Ver en pantalla completa para imprimir"
            >
              <Icon name="eye" className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Pantalla Completa</span>
            </button>
          )}
        </div>
      </div>

      {/* Canvas Gráfico del Escenario 2D */}
      <div
        ref={stageCanvasRef}
        onMouseMove={handleCanvasMouseMove}
        onTouchMove={handleCanvasTouchMove}
        className={`stage-plot-print relative border-4 border-slate-800 rounded-3xl bg-slate-900 text-white p-4 sm:p-6 shadow-inner overflow-hidden flex flex-col justify-between select-none transition-all ${
          plotView === 'photo' ? 'hidden' : ''
        } ${
          isCompact ? 'min-h-[380px]' : 'min-h-[460px] sm:min-h-[500px]'
        }`}
      >
        {/* Fondo de Cuadrícula / Blueprint */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* Indicador UPSTAGE (Fondo de Tarima) */}
        <div className="relative z-10 flex items-center justify-between text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2">
          <span className="flex items-center gap-1.5">
            <span>▲ UPSTAGE</span>
            <span className="hidden sm:inline text-slate-500">/ FONDO DE TARIMA — {riderTitle}</span>
          </span>
          <span className="text-amber-400 font-semibold flex items-center gap-1">
            <span>⚡</span>
            <span>Acometida 220V/110V 20A</span>
          </span>
        </div>

        {/* Zona Interactiva de Posicionamiento de Elementos en Tarima */}
        <div className="relative flex-1 w-full my-4">
          {elements.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-10 pointer-events-none select-none">
              <span className="text-3xl mb-1.5 opacity-60">🎭</span>
              <p className="text-xs font-bold text-slate-300">Escenario en blanco</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Pulsa &quot;+ Instrumento&quot; para ubicar la batería, amplificadores o monitores
              </p>
            </div>
          )}
          {elements.map((el) => {
            const isSelected = selectedElementId === el.id;

            return (
              <div
                key={el.id}
                onMouseDown={(e) => handleMouseDownOnElement(e, el.id)}
                onTouchStart={(e) => handleTouchStartOnElement(e, el.id)}
                onClick={() => {
                  if (isEditing) {
                    setEditingElement(el);
                    setSelectedElementId(el.id);
                  }
                }}
                style={{
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                className={`absolute z-20 group ${
                  isEditing ? 'cursor-grab active:cursor-grabbing hover:scale-105' : 'cursor-default'
                }`}
              >
                <div
                  className={`relative p-2.5 sm:p-3 rounded-2xl border text-center transition-colors shadow-md min-w-[100px] sm:min-w-[130px] max-w-[180px] ${
                    el.category === 'riser'
                      ? 'bg-slate-800/95 border-indigo-500/90 shadow-indigo-500/20 ring-1 ring-indigo-500/50'
                      : el.category === 'vocal'
                      ? 'bg-slate-800/90 border-violet-500/70 shadow-violet-500/20'
                      : el.category === 'amp'
                      ? 'bg-slate-800/90 border-amber-500/70 shadow-amber-500/20'
                      : el.category === 'snake'
                      ? 'bg-slate-800/80 border-emerald-500/70'
                      : 'bg-slate-800/90 border-slate-700 hover:border-slate-500'
                  } ${
                    isSelected ? 'ring-2 ring-indigo-400 scale-105 shadow-xl' : ''
                  }`}
                >
                  {/* Botón de eliminar en modo edición */}
                  {isEditing && onUpdateStagePlot && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteElement(el.id, e)}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow hover:bg-rose-700 cursor-pointer"
                      title="Eliminar elemento"
                    >
                      ✕
                    </button>
                  )}

                  {/* Icono del Elemento */}
                  <div className="text-xl sm:text-2xl mb-1">{el.icon}</div>

                  {/* Nombre */}
                  <h4 className="text-[11px] sm:text-xs font-black text-white leading-tight truncate">
                    {el.name}
                  </h4>

                  {/* Canal o fuente asignada */}
                  {el.channel && (
                    <p className="text-[9px] sm:text-[10px] text-indigo-300 font-semibold truncate mt-0.5">
                      {el.channel}
                    </p>
                  )}

                  {/* Notas / Monitores */}
                  {el.notes && (
                    <p className="text-[8px] sm:text-[9px] text-slate-400 truncate mt-0.5">
                      {el.notes}
                    </p>
                  )}

                  {/* Toma eléctrica */}
                  {el.powerRequirement && (
                    <span className="inline-block text-[8px] font-mono text-amber-300 bg-amber-950/60 px-1 py-0.2 rounded mt-1 border border-amber-800/40">
                      ⚡ {el.powerRequirement}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Indicador DOWNSTAGE (Frente de Tarima / Público) */}
        <div className="relative z-10 flex items-center justify-between text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-400 border-t border-slate-800 pt-2">
          <span className="flex items-center gap-1.5">
            <span>▼ DOWNSTAGE</span>
            <span className="hidden sm:inline text-slate-500">/ FRENTE DE TARIMA (PÚBLICO)</span>
          </span>
          <span className="text-violet-400 font-semibold flex items-center gap-1">
            <span>🔊</span>
            <span>Front-fills & Subwoofers</span>
          </span>
        </div>
      </div>

      {stagePlot.referenceImageUrl ? (
        <div className={`stage-photo-print rounded-3xl border border-slate-200 bg-slate-50 overflow-hidden ${plotView === 'photo' ? '' : 'hidden'}`}>
          <img
            src={stagePlot.referenceImageUrl}
            alt="Foto del plano de escenario"
            className="w-full max-h-[520px] object-contain bg-slate-100"
          />
        </div>
      ) : null}

      {/* Editor Modal de Elemento Específico */}
      {editingElement && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-md space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{editingElement.icon}</span>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                Editar Elemento de Tarima
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setEditingElement(null)}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold"
            >
              ✕ Cerrar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Nombre del Instrumento / Posición
              </label>
              <input
                type="text"
                value={editingElement.name}
                onChange={(e) => setEditingElement({ ...editingElement, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 font-bold outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Canal de Entrada (Input List)
              </label>
              <input
                type="text"
                value={editingElement.channel || ''}
                placeholder="ej: Ch 01 / 8 Chs"
                onChange={(e) => setEditingElement({ ...editingElement, channel: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 font-medium outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Monitoreo / Tipo de Atril / Notas
              </label>
              <input
                type="text"
                value={editingElement.notes || ''}
                placeholder="ej: Wedge Mix 1 / IEM"
                onChange={(e) => setEditingElement({ ...editingElement, notes: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 font-medium outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Acometida Eléctrica
              </label>
              <input
                type="text"
                value={editingElement.powerRequirement || ''}
                placeholder="ej: AC 110V Drop / 220V"
                onChange={(e) => setEditingElement({ ...editingElement, powerRequirement: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 font-medium outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleDeleteElement(editingElement.id)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer"
            >
              Eliminar de Tarima
            </button>
            <button
              type="button"
              onClick={() => handleSaveElementEdit(editingElement)}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all cursor-pointer shadow-sm shadow-indigo-500/25"
            >
              Guardar Elemento
            </button>
          </div>
        </div>
      )}

      {/* Sincronización con Input List */}
      <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3 sm:p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
            Canales de Tarima Vinculados ({channels.length} Registrados)
          </span>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Sincronizado con Input List
          </span>
        </div>

        {channels.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs pt-1">
            {channels.slice(0, 12).map((ch) => (
              <div key={ch.id} className="bg-white p-2 rounded-xl border border-slate-200/70 text-[11px]">
                <div className="flex items-center justify-between font-mono text-[9px] text-slate-400">
                  <span>CH {ch.ch}</span>
                  {ch.phantom && <span className="text-amber-600 font-bold">+48V</span>}
                </div>
                <p className="font-bold text-slate-800 truncate mt-0.5">{ch.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{ch.mic}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            No hay canales adicionales configurados en el Input List. Agrega canales en la sección 05 para verlos aquí.
          </p>
        )}
      </div>
    </div>
  );
}
