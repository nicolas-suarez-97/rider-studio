import type { Editor } from '@tiptap/core';
import { insertCoverAtStart } from '@/components/workspace/editor/rider-blocks';
import { cloneInputListRows } from '@/core/constants/input-list';
import { newSectionId } from '@/core/editor/content-doc';

export type SlashRange = { from: number; to: number };

export type SlashHelpers = {
  pickImages: (onFiles: (files: File[]) => void) => void;
  insertImages: (files: File[]) => void;
};

export type SlashCommand = {
  id: string;
  title: string;
  description: string;
  icon: string;
  group: string;
  keywords: string[];
  run: (editor: Editor, range: SlashRange, helpers: SlashHelpers) => void;
};

function headingAttrs(editor: Editor, level: 2 | 3, pageBreakBefore: boolean) {
  const parent = editor.state.selection.$from.parent;
  const keepId = parent.type.name === 'heading' && parent.attrs.level === 2 && typeof parent.attrs.id === 'string'
    ? parent.attrs.id
    : newSectionId();
  if (level === 3) {
    return { level, id: null, pageBreakBefore: false };
  }
  return {
    level,
    id: keepId,
    pageBreakBefore,
  };
}

function deleteThen(editor: Editor, range: SlashRange) {
  return editor.chain().focus().deleteRange(range);
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'paragraph',
    title: 'Texto',
    description: 'Empieza a escribir un párrafo',
    icon: 'fileText',
    group: 'Bloques básicos',
    keywords: ['parrafo', 'texto', 'normal', 'body'],
    run: (editor, range) => {
      deleteThen(editor, range).setParagraph().run();
    },
  },
  {
    id: 'heading-2',
    title: 'Título',
    description: 'Título de sección en esta página',
    icon: 'heading',
    group: 'Bloques básicos',
    keywords: ['titulo', 'heading', 'h2', 'seccion', 'encabezado'],
    run: (editor, range) => {
      const attrs = headingAttrs(editor, 2, false);
      deleteThen(editor, range).setNode('heading', attrs).run();
    },
  },
  {
    id: 'heading-3',
    title: 'Subtítulo',
    description: 'Encabezado más pequeño',
    icon: 'heading3',
    group: 'Bloques básicos',
    keywords: ['subtitulo', 'heading', 'h3', 'subheading'],
    run: (editor, range) => {
      const attrs = headingAttrs(editor, 3, false);
      deleteThen(editor, range).setNode('heading', attrs).run();
    },
  },
  {
    id: 'cover',
    title: 'Portada',
    description: 'Primera página con artista, versión y foto',
    icon: 'fileText',
    group: 'Rider',
    keywords: ['portada', 'cover', 'artista', 'foto'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      insertCoverAtStart(editor);
    },
  },
  {
    id: 'requirement',
    title: 'Requisito',
    description: 'Etiqueta y el dato al lado',
    icon: 'badge',
    group: 'Rider',
    keywords: ['requisito', 'spec', 'criterio', 'etiqueta'],
    run: (editor, range) => {
      deleteThen(editor, range).insertRequirement().run();
    },
  },
  {
    id: 'notice',
    title: 'Aviso',
    description: 'Nota, obligatorio o no aceptado',
    icon: 'shield',
    group: 'Rider',
    keywords: ['aviso', 'nota', 'obligatorio', 'veto', 'no aceptado'],
    run: (editor, range) => {
      deleteThen(editor, range).insertNotice('note').run();
    },
  },
  {
    id: 'tiers',
    title: 'Tiers',
    description: 'Preferido, alternativa y no aceptado',
    icon: 'table',
    group: 'Rider',
    keywords: ['tiers', 'preferido', 'alternativa', 'marcas', 'veto'],
    run: (editor, range) => {
      deleteThen(editor, range).insertTiers().run();
    },
  },
  {
    id: 'contacts',
    title: 'Contactos',
    description: 'Rol, nombre, teléfono y correo',
    icon: 'users',
    group: 'Rider',
    keywords: ['contactos', 'telefono', 'correo', 'foh'],
    run: (editor, range) => {
      deleteThen(editor, range).insertContacts().run();
    },
  },
  {
    id: 'columns',
    title: 'Dos columnas',
    description: 'Texto al lado de otro texto o una foto',
    icon: 'columns',
    group: 'Rider',
    keywords: ['columnas', 'foto', 'dos', 'layout'],
    run: (editor, range) => {
      deleteThen(editor, range).insertColumns().run();
    },
  },
  {
    id: 'input-list',
    title: 'Input List',
    description: 'Tabla de canales, instrumento y posición',
    icon: 'list',
    group: 'Rider',
    keywords: ['input', 'list', 'patch', 'canales', 'channels', 'il', 'microfonos'],
    run: (editor, range) => {
      deleteThen(editor, range).insertInputList(cloneInputListRows()).run();
    },
  },
  {
    id: 'bullet-list',
    title: 'Lista con viñetas',
    description: 'Crea una lista simple',
    icon: 'list',
    group: 'Listas',
    keywords: ['lista', 'viñetas', 'bullets', 'ul'],
    run: (editor, range) => {
      deleteThen(editor, range).toggleBulletList().run();
    },
  },
  {
    id: 'ordered-list',
    title: 'Lista numerada',
    description: '1, 2, 3…',
    icon: 'listOrdered',
    group: 'Listas',
    keywords: ['lista', 'numerada', 'ordenada', 'ol', 'numeros'],
    run: (editor, range) => {
      deleteThen(editor, range).toggleOrderedList().run();
    },
  },
  {
    id: 'task-list',
    title: 'Lista de tareas',
    description: 'Casillas para marcar pendientes',
    icon: 'checkSquare',
    group: 'Listas',
    keywords: ['tareas', 'todo', 'checkbox', 'checklist', 'pendientes'],
    run: (editor, range) => {
      deleteThen(editor, range).toggleTaskList().run();
    },
  },
  {
    id: 'table',
    title: 'Tabla',
    description: 'Añade una tabla de 3×3',
    icon: 'table',
    group: 'Insertar',
    keywords: ['tabla', 'grid', 'columnas', 'filas', 'excel'],
    run: (editor, range) => {
      deleteThen(editor, range).setParagraph().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    id: 'image',
    title: 'Imagen',
    description: 'Sube una foto al documento',
    icon: 'image',
    group: 'Insertar',
    keywords: ['imagen', 'foto', 'picture', 'media'],
    run: (editor, range, helpers) => {
      helpers.pickImages((files) => {
        if (!files.length) return;
        deleteThen(editor, range).run();
        helpers.insertImages(files);
      });
    },
  },
  {
    id: 'blockquote',
    title: 'Cita',
    description: 'Destaca una nota o cita',
    icon: 'quote',
    group: 'Insertar',
    keywords: ['cita', 'quote', 'blockquote', 'nota'],
    run: (editor, range) => {
      deleteThen(editor, range).setParagraph().toggleBlockquote().run();
    },
  },
  {
    id: 'divider',
    title: 'Separador',
    description: 'Línea divisoria entre bloques',
    icon: 'minus',
    group: 'Insertar',
    keywords: ['separador', 'divider', 'linea', 'hr', 'horizontal'],
    run: (editor, range) => {
      deleteThen(editor, range).setHorizontalRule().run();
    },
  },
  {
    id: 'link',
    title: 'Enlace',
    description: 'Añade un hipervínculo',
    icon: 'link',
    group: 'Insertar',
    keywords: ['enlace', 'link', 'url', 'hipervinculo'],
    run: (editor, range) => {
      const previous = editor.getAttributes('link').href as string | undefined;
      const url = window.prompt('Enlace', previous || 'https://');
      if (url === null) return;
      const href = url.trim();
      if (!href) {
        deleteThen(editor, range).run();
        return;
      }
      deleteThen(editor, range).insertContent({
        type: 'text',
        text: href,
        marks: [{ type: 'link', attrs: { href } }],
      }).run();
    },
  },
  {
    id: 'page-break',
    title: 'Página nueva',
    description: 'Título de sección en la página siguiente',
    icon: 'filePlus',
    group: 'Insertar',
    keywords: ['pagina', 'salto', 'page break', 'nueva pagina'],
    run: (editor, range) => {
      const attrs = headingAttrs(editor, 2, true);
      deleteThen(editor, range).setNode('heading', { ...attrs, pageBreakBefore: true }).run();
    },
  },
];

function fold(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function filterSlashCommands(query: string): SlashCommand[] {
  const needle = fold(query).trim();
  if (!needle) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter((command) => {
    const haystack = fold([command.title, command.description, command.id, ...command.keywords].join(' '));
    return haystack.includes(needle);
  });
}

export function getSlashRange(editor: Editor): (SlashRange & { query: string }) | null {
  if (!editor.isEditable || editor.isDestroyed) return null;
  const { $from, empty } = editor.state.selection;
  if (!empty) return null;
  const parent = $from.parent;
  if (!parent.isTextblock) return null;
  const text = parent.textBetween(0, $from.parentOffset, undefined, '\0');
  const match = text.match(/(?:^|\s)\/([^\n]*)$/);
  if (!match || match[1].includes('/')) return null;
  if (match[1].length > 40) return null;
  const slashAt = (match.index || 0) + (match[0].startsWith(' ') || match[0].startsWith('\0') ? 1 : 0);
  return {
    query: match[1],
    from: $from.start() + slashAt,
    to: $from.pos,
  };
}
