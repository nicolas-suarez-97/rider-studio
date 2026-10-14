import type { Editor } from '@tiptap/core';
import { assertRiderImage } from '@/lib/media/rider-media';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function imageFilesFromDataTransfer(data: DataTransfer | null | undefined): File[] {
  if (!data) return [];
  const fromFiles = Array.from(data.files || []).filter((file) => IMAGE_TYPES.has(file.type));
  if (fromFiles.length > 0) return fromFiles;
  return Array.from(data.items || [])
    .filter((item) => item.kind === 'file' && IMAGE_TYPES.has(item.type))
    .map((item) => item.getAsFile())
    .filter((file): file is File => !!file);
}

export async function insertDocumentImages(
  editor: Editor,
  files: File[],
  upload?: (file: File) => Promise<string | null | undefined>,
  onError?: (message: string) => void,
) {
  for (const file of files) {
    try {
      assertRiderImage(file, 'gallery');
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'La imagen no es válida');
      continue;
    }

    let src: string | null = null;
    if (upload) {
      try {
        src = (await upload(file)) || null;
      } catch (error) {
        onError?.(error instanceof Error ? error.message : 'No se pudo subir la imagen');
        continue;
      }
    }
    if (!src) src = URL.createObjectURL(file);
    if (editor.isDestroyed) return;

    const alt = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    editor.chain().focus().setImage({ src, alt: alt || 'Imagen' }).run();
  }
}
