"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/core';
import { Icon } from '@/components/common/Icon';
import { DOCUMENT_COVER_ID } from '@/core/editor/content-doc';

interface SelectionFloatingAiProps {
  editor: Editor | null;
  enabled: boolean;
  onDraftWithSelection?: (selectedText: string, sectionId?: string, mode?: 'quote' | 'adjust' | 'analyze') => void;
}

export function SelectionFloatingAi({
  editor,
  enabled,
  onDraftWithSelection,
}: SelectionFloatingAiProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [sectionId, setSectionId] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const dismissedRef = useRef(false);

  const updatePosition = useCallback(() => {
    if (!editor || editor.isDestroyed || !enabled) {
      setVisible(false);
      return;
    }

    if (dismissedRef.current) return;

    const { from, to, empty } = editor.state.selection;
    if (empty || from >= to) {
      setVisible(false);
      return;
    }

    const text = editor.state.doc.textBetween(from, to, '\n').trim();
    if (!text) {
      setVisible(false);
      return;
    }

    const sel = typeof window !== 'undefined' ? window.getSelection() : null;
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setVisible(false);
      return;
    }

    const domRange = sel.getRangeAt(0);
    const container = domRange.commonAncestorContainer;
    if (!editor.view.dom.contains(container)) {
      setVisible(false);
      return;
    }

    const rect = domRange.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setVisible(false);
      return;
    }

    // Identificar la sección actual a la que pertenece la selección
    let currentSectionId = '';
    let covers = 0;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'riderCover' && pos <= from) {
        covers += 1;
        currentSectionId = covers === 1 ? DOCUMENT_COVER_ID : `${DOCUMENT_COVER_ID}-${covers}`;
      }
      if (node.type.name === 'heading' && node.attrs.id && pos <= from) {
        currentSectionId = node.attrs.id as string;
      }
    });

    const pillWidth = 270;
    const pillHeight = 40;
    const margin = 8;

    // Calcular posición óptima: preferir arriba de la selección
    const spaceAbove = rect.top;
    const showAbove = spaceAbove >= pillHeight + margin + 40;

    const top = showAbove
      ? rect.top - pillHeight - margin
      : rect.bottom + margin;

    const centerLeft = rect.left + rect.width / 2;
    const left = Math.max(12, Math.min(window.innerWidth - pillWidth - 12, centerLeft - pillWidth / 2));

    setSelectedText(text);
    setSectionId(currentSectionId);
    setCoords({ top, left });
    setVisible(true);
  }, [editor, enabled]);

  useEffect(() => {
    if (!editor || !enabled) return;

    const onSelectionUpdate = () => {
      dismissedRef.current = false;
      updatePosition();
    };

    const onMouseUp = () => {
      setTimeout(updatePosition, 10);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismissedRef.current = true;
        setVisible(false);
      }
    };

    const onScrollOrResize = () => {
      if (visible) {
        updatePosition();
      }
    };

    editor.on('selectionUpdate', onSelectionUpdate);
    editor.on('transaction', updatePosition);

    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      editor.off('selectionUpdate', onSelectionUpdate);
      editor.off('transaction', updatePosition);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [editor, enabled, updatePosition, visible]);

  const handleDraft = (mode: 'quote' | 'adjust' | 'analyze') => {
    if (!selectedText.trim()) return;
    onDraftWithSelection?.(selectedText, sectionId, mode);
    dismissedRef.current = true;
    setVisible(false);
  };

  if (!visible || !coords || !enabled) {
    return null;
  }

  return createPortal(
    <div
      ref={menuRef}
      role="toolbar"
      aria-label="Herramientas IA para texto seleccionado"
      className="fixed z-50 flex items-center gap-1 p-1 bg-white/95 backdrop-blur-md rounded-full border border-violet-200/90 shadow-xl shadow-violet-500/15 text-slate-800 transition-all select-none animate-in fade-in zoom-in-95 duration-150"
      style={{
        top: coords.top,
        left: coords.left,
      }}
      onMouseDown={(e) => {
        // Evita que el click desenfoque la selección en el editor antes de la acción
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        type="button"
        onClick={() => handleDraft('quote')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95 cursor-pointer"
        title="Llevar selección al chat para redactar solicitud"
      >
        <Icon name="sparkles" className="w-3.5 h-3.5 text-violet-200" />
        <span>Preguntar a la IA</span>
      </button>

      <div className="w-[1px] h-3.5 bg-violet-200 mx-0.5" />

      <button
        type="button"
        onClick={() => handleDraft('adjust')}
        className="px-2.5 py-1.5 rounded-full hover:bg-violet-50 text-violet-800 font-semibold text-xs transition-colors cursor-pointer"
        title="Pedir ajustes a esta selección"
      >
        Ajustar
      </button>

      <button
        type="button"
        onClick={() => handleDraft('analyze')}
        className="px-2.5 py-1.5 rounded-full hover:bg-violet-50 text-violet-800 font-semibold text-xs transition-colors cursor-pointer"
        title="Pedir análisis técnico de esta selección"
      >
        Analizar
      </button>
    </div>,
    document.body
  );
}
