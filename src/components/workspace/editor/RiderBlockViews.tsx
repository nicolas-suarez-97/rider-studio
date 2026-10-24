"use client";

import { useRef, useState } from 'react';
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Icon } from '@/components/common/Icon';
import { PAGE_INNER } from '@/components/workspace/editor/pagination';
import { assertRiderImage } from '@/lib/media/rider-media';
import { emptyContact, normalizePeople, type ContactPerson, type NoticeTone } from '@/components/workspace/editor/rider-block-model';
import { BrandModelFields } from '@/components/rider/BrandModelFields';

const TONE_LABEL: Record<NoticeTone, string> = {
  note: 'Nota',
  required: 'Obligatorio',
  rejected: 'No aceptado',
};

function fieldValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function stop(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

function inkForBackground(color: string): string | undefined {
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim());
  const raw = hex?.[1];
  if (!raw) return undefined;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.62 ? '#f8fafc' : '#1f2937';
}

export function CoverBlock({ node, updateAttributes, deleteNode, editor, selected }: NodeViewProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const readOnly = !editor.isEditable;
  const imageSrc = fieldValue(node.attrs.imageSrc);
  const plate = node.attrs.plate === true || node.attrs.plate === 'true';
  const set = (key: string, value: string) => updateAttributes({ [key]: value });

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    try {
      assertRiderImage(file, 'gallery');
      const upload = editor.storage.riderDocumentMeta?.uploadImage;
      const src = upload ? await upload(file) : URL.createObjectURL(file);
      if (!src) {
        setError('No se pudo subir la foto');
        return;
      }
      set('imageSrc', src);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la foto');
    }
  };

  const handleKey = (event: React.KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Backspace') {
      event.preventDefault();
      deleteNode();
    }
  };

  return (
    <NodeViewWrapper
      className={`docs-cover ${selected ? 'is-selected' : ''} ${imageSrc ? 'has-image' : ''}`}
      data-type="rider-cover"
      data-page-break-after="true"
    >
      <div
        className="docs-cover-inner"
        contentEditable={false}
        style={{
          minHeight: plate ? undefined : PAGE_INNER,
          ...(imageSrc && !plate ? {
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.72)), url("${imageSrc}")`,
            color: '#fafafa',
          } : undefined),
        }}
      >
        {plate && imageSrc && (
          <img src={imageSrc} alt="" className="docs-cover-plate" />
        )}
        {!readOnly && (
          <div className="docs-cover-tools">
            <button type="button" onMouseDown={stop} onClick={() => fileRef.current?.click()}>
              {imageSrc ? 'Cambiar foto' : 'Foto de portada'}
            </button>
            {imageSrc && (
              <button type="button" onMouseDown={stop} onClick={() => set('imageSrc', '')}>
                Quitar foto
              </button>
            )}
            <button
              type="button"
              className="docs-cover-delete-btn"
              title="Eliminar portada"
              onMouseDown={stop}
              onClick={() => deleteNode()}
            >
              <Icon name="trash" className="h-3 w-3" />
              Eliminar portada
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                void onFile(file);
              }}
            />
            {error && <span className="docs-cover-error">{error}</span>}
          </div>
        )}
        {!plate && <div className="docs-cover-copy">
          <input
            className="docs-cover-kicker"
            aria-label="Tipo de rider"
            value={fieldValue(node.attrs.kicker)}
            readOnly={readOnly}
            onMouseDown={stop}
            onChange={(event) => set('kicker', event.target.value)}
            onKeyDown={handleKey}
          />
          <textarea
            className="docs-cover-artist"
            aria-label="Artista"
            rows={2}
            placeholder="Nombre del artista"
            value={fieldValue(node.attrs.artist)}
            readOnly={readOnly}
            onMouseDown={stop}
            onChange={(event) => set('artist', event.target.value)}
            onKeyDown={handleKey}
          />
          <input
            className="docs-cover-title"
            aria-label="Gira o show"
            placeholder="Gira o show"
            value={fieldValue(node.attrs.title)}
            readOnly={readOnly}
            onMouseDown={stop}
            onChange={(event) => set('title', event.target.value)}
            onKeyDown={handleKey}
          />
          <div className="docs-cover-meta">
            <input
              aria-label="Versión"
              value={fieldValue(node.attrs.version)}
              readOnly={readOnly}
              onMouseDown={stop}
              onChange={(event) => set('version', event.target.value)}
              onKeyDown={handleKey}
            />
            <input
              aria-label="Fecha"
              value={fieldValue(node.attrs.date)}
              readOnly={readOnly}
              onMouseDown={stop}
              onChange={(event) => set('date', event.target.value)}
              onKeyDown={handleKey}
            />
          </div>
        </div>}
      </div>
    </NodeViewWrapper>
  );
}

export function PageFrameBlock({ node }: NodeViewProps) {
  const backgroundSrc = fieldValue(node.attrs.backgroundSrc);
  const backgroundColor = fieldValue(node.attrs.backgroundColor);
  return (
    <NodeViewWrapper
      className={`docs-page-frame ${backgroundSrc ? 'has-image' : ''}`}
      data-type="page-frame"
      style={{
        backgroundColor: backgroundColor || undefined,
        backgroundImage: backgroundSrc ? `url("${backgroundSrc}")` : undefined,
      }}
    >
      <NodeViewContent className="docs-page-frame-body" />
    </NodeViewWrapper>
  );
}

export function RequirementBlock({ node, updateAttributes, deleteNode, editor, selected }: NodeViewProps) {
  const readOnly = !editor.isEditable;
  const exclusions = editor.storage.riderDocumentMeta?.absoluteExclusions || [];
  return (
    <NodeViewWrapper className={`docs-requirement ${selected ? 'is-selected' : ''}`} data-type="requirement">
      <div className="docs-requirement-label" contentEditable={false}>
        <input
          aria-label="Etiqueta del requisito"
          value={fieldValue(node.attrs.label)}
          readOnly={readOnly}
          placeholder="Etiqueta"
          onMouseDown={stop}
          onChange={(event) => updateAttributes({ label: event.target.value })}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Backspace') {
              event.preventDefault();
              deleteNode();
            } else if (event.key === 'Backspace' && event.currentTarget.value === '' && node.textContent.trim() === '') {
              event.preventDefault();
              deleteNode();
            }
          }}
        />
        {!readOnly && (
          <button
            type="button"
            className="docs-block-delete-btn"
            title="Eliminar requisito"
            onMouseDown={stop}
            onClick={() => deleteNode()}
          >
            <Icon name="trash" className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="docs-requirement-main">
        <NodeViewContent className="docs-requirement-body" />
        <div className="docs-requirement-gear" contentEditable={false} onMouseDown={stop}>
          <BrandModelFields
            brand={fieldValue(node.attrs.brand)}
            model={fieldValue(node.attrs.model)}
            disabled={readOnly}
            exclusions={exclusions}
            onChange={(next) => updateAttributes(next)}
          />
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export function NoticeBlock({ node, updateAttributes, deleteNode, editor, selected }: NodeViewProps) {
  const readOnly = !editor.isEditable;
  const tone: NoticeTone = node.attrs.tone === 'required' || node.attrs.tone === 'rejected'
    ? node.attrs.tone
    : 'note';
  const backgroundColor = fieldValue(node.attrs.backgroundColor);
  const ink = backgroundColor ? inkForBackground(backgroundColor) : undefined;
  return (
    <NodeViewWrapper
      className={`docs-notice is-${tone} ${backgroundColor ? 'has-custom-bg' : ''} ${selected ? 'is-selected' : ''}`}
      data-type="notice"
      data-tone={tone}
      style={backgroundColor ? { background: backgroundColor, color: ink } : undefined}
    >
      <div className="docs-notice-bar" contentEditable={false}>
        <div className="docs-notice-tones">
          {(Object.keys(TONE_LABEL) as NoticeTone[]).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={tone === item}
              disabled={readOnly}
              onMouseDown={stop}
              onClick={() => updateAttributes({ tone: item })}
            >
              {TONE_LABEL[item]}
            </button>
          ))}
        </div>
        {!readOnly && (
          <button
            type="button"
            className="docs-block-delete-btn docs-notice-delete-btn"
            title="Eliminar aviso"
            onMouseDown={stop}
            onClick={() => deleteNode()}
          >
            <Icon name="trash" className="h-3 w-3" />
          </button>
        )}
      </div>
      <NodeViewContent className="docs-notice-body" />
    </NodeViewWrapper>
  );
}

export function TiersBlock({ node, updateAttributes, deleteNode, editor, selected }: NodeViewProps) {
  const readOnly = !editor.isEditable;
  const columns: Array<{ key: 'preferred' | 'alternative' | 'rejected'; label: string }> = [
    { key: 'preferred', label: 'Preferido' },
    { key: 'alternative', label: 'Alternativa' },
    { key: 'rejected', label: 'No aceptado' },
  ];
  const isEmpty = !node.attrs.preferred && !node.attrs.alternative && !node.attrs.rejected;

  return (
    <NodeViewWrapper className={`docs-tiers ${selected ? 'is-selected' : ''}`} data-type="tiers">
      <div className="docs-tiers-card" contentEditable={false}>
        {!readOnly && (
          <div className="docs-block-header">
            <span className="docs-block-header-title">Tiers de equipamiento</span>
            <button
              type="button"
              className="docs-block-delete-btn"
              title="Eliminar bloque de tiers"
              onMouseDown={stop}
              onClick={() => deleteNode()}
            >
              <Icon name="trash" className="h-3 w-3" />
              <span>Eliminar</span>
            </button>
          </div>
        )}
        <div className="docs-tiers-grid">
          {columns.map((column) => (
            <label key={column.key} className={`docs-tiers-col is-${column.key}`}>
              <span>{column.label}</span>
              <textarea
                aria-label={column.label}
                rows={4}
                readOnly={readOnly}
                placeholder={column.label}
                value={fieldValue(node.attrs[column.key])}
                onMouseDown={stop}
                onChange={(event) => updateAttributes({ [column.key]: event.target.value })}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Backspace') {
                    event.preventDefault();
                    deleteNode();
                  } else if (event.key === 'Backspace' && event.currentTarget.value === '' && isEmpty) {
                    event.preventDefault();
                    deleteNode();
                  }
                }}
              />
            </label>
          ))}
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export function ContactsBlock({ node, updateAttributes, deleteNode, editor, selected }: NodeViewProps) {
  const readOnly = !editor.isEditable;
  const people = normalizePeople(node.attrs.people);
  const save = (next: ContactPerson[]) => updateAttributes({ people: next });
  const patch = (id: string, key: keyof ContactPerson, value: string) => {
    save(people.map((person) => (person.id === id ? { ...person, [key]: value } : person)));
  };

  const handleKey = (event: React.KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Backspace') {
      event.preventDefault();
      deleteNode();
    }
  };

  return (
    <NodeViewWrapper className={`docs-contacts ${selected ? 'is-selected' : ''}`} data-type="contacts">
      <div className="docs-contacts-card" contentEditable={false}>
        <div className="docs-contacts-head">
          <span className="docs-contacts-head-title">Contactos</span>
          {!readOnly && (
            <div className="docs-contacts-head-actions">
              <button
                type="button"
                className="docs-contacts-add-btn"
                onMouseDown={stop}
                onClick={() => save([...people, emptyContact(people.length + 1)])}
              >
                + Añadir
              </button>
              <button
                type="button"
                className="docs-block-delete-btn"
                title="Eliminar bloque de contactos"
                onMouseDown={stop}
                onClick={() => deleteNode()}
              >
                <Icon name="trash" className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
        {people.map((person) => (
          <div key={person.id} className="docs-contacts-row">
            <input
              aria-label="Rol"
              placeholder="Rol"
              value={person.role}
              readOnly={readOnly}
              onMouseDown={stop}
              onChange={(event) => patch(person.id, 'role', event.target.value)}
              onKeyDown={handleKey}
            />
            <input
              aria-label="Nombre"
              placeholder="Nombre"
              value={person.name}
              readOnly={readOnly}
              onMouseDown={stop}
              onChange={(event) => patch(person.id, 'name', event.target.value)}
              onKeyDown={handleKey}
            />
            <input
              aria-label="Teléfono"
              placeholder="Teléfono"
              value={person.phone}
              readOnly={readOnly}
              onMouseDown={stop}
              onChange={(event) => patch(person.id, 'phone', event.target.value)}
              onKeyDown={handleKey}
            />
            <input
              aria-label="Correo"
              placeholder="Correo"
              value={person.email}
              readOnly={readOnly}
              onMouseDown={stop}
              onChange={(event) => patch(person.id, 'email', event.target.value)}
              onKeyDown={handleKey}
            />
            {!readOnly && (
              <button
                type="button"
                aria-label="Quitar contacto"
                title={people.length === 1 ? 'Eliminar bloque de contactos' : 'Quitar contacto'}
                onMouseDown={stop}
                onClick={() => {
                  if (people.length > 1) {
                    save(people.filter((item) => item.id !== person.id));
                  } else {
                    deleteNode();
                  }
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  );
}

export function ColumnsBlock({ node, updateAttributes, deleteNode, editor, selected }: NodeViewProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const readOnly = !editor.isEditable;
  const imageSrc = fieldValue(node.attrs.imageSrc);
  const isEmpty = !node.attrs.left && !node.attrs.right && !imageSrc;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    try {
      assertRiderImage(file, 'gallery');
      const upload = editor.storage.riderDocumentMeta?.uploadImage;
      const src = upload ? await upload(file) : URL.createObjectURL(file);
      if (!src) {
        setError('No se pudo subir la imagen');
        return;
      }
      updateAttributes({ imageSrc: src });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la imagen');
    }
  };

  const handleKey = (event: React.KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Backspace') {
      event.preventDefault();
      deleteNode();
    } else if (event.key === 'Backspace' && (event.currentTarget as HTMLTextAreaElement).value === '' && isEmpty) {
      event.preventDefault();
      deleteNode();
    }
  };

  return (
    <NodeViewWrapper className={`docs-columns ${selected ? 'is-selected' : ''}`} data-type="columns">
      <div className="docs-columns-card" contentEditable={false}>
        {!readOnly && (
          <div className="docs-block-header">
            <span className="docs-block-header-title">Dos columnas</span>
            <button
              type="button"
              className="docs-block-delete-btn"
              title="Eliminar columnas"
              onMouseDown={stop}
              onClick={() => deleteNode()}
            >
              <Icon name="trash" className="h-3 w-3" />
              <span>Eliminar</span>
            </button>
          </div>
        )}
        <div className="docs-columns-grid">
          <textarea
            aria-label="Columna izquierda"
            rows={5}
            placeholder="Texto"
            readOnly={readOnly}
            value={fieldValue(node.attrs.left)}
            onMouseDown={stop}
            onChange={(event) => updateAttributes({ left: event.target.value })}
            onKeyDown={handleKey}
          />
          <div className="docs-columns-side">
            {imageSrc ? (
              <img src={imageSrc} alt="" />
            ) : (
              <textarea
                aria-label="Columna derecha"
                rows={5}
                placeholder="Texto o una foto"
                readOnly={readOnly}
                value={fieldValue(node.attrs.right)}
                onMouseDown={stop}
                onChange={(event) => updateAttributes({ right: event.target.value })}
                onKeyDown={handleKey}
              />
            )}
            {!readOnly && (
              <div className="docs-columns-tools">
                <button type="button" onMouseDown={stop} onClick={() => fileRef.current?.click()}>
                  {imageSrc ? 'Cambiar foto' : 'Foto'}
                </button>
                {imageSrc && (
                  <button type="button" onMouseDown={stop} onClick={() => updateAttributes({ imageSrc: '' })}>
                    Quitar foto
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    void onFile(file);
                  }}
                />
              </div>
            )}
            {imageSrc && (
              <input
                aria-label="Pie de foto"
                placeholder="Pie de foto"
                readOnly={readOnly}
                value={fieldValue(node.attrs.right)}
                onMouseDown={stop}
                onChange={(event) => updateAttributes({ right: event.target.value })}
              />
            )}
            {error && <span className="docs-cover-error">{error}</span>}
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
