import { extractText } from 'unpdf';
import mammoth from 'mammoth';

export const MAX_RIDER_FILE_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_RIDER_EXTRACTED_CHARS = 35000;

export interface ExtractedRiderFile {
  text: string;
  fileName: string;
  truncated: boolean;
}

export type ExtractRiderFileResult =
  | { ok: true; extracted: ExtractedRiderFile }
  | { ok: false; error: string };

function extensionOf(name: string): string {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index + 1).toLowerCase() : '';
}

function cleanAndClipText(value: string, fileName: string): ExtractedRiderFile {
  const cleaned = value.replace(/\u0000/g, '').trim();
  if (cleaned.length <= MAX_RIDER_EXTRACTED_CHARS) {
    return { text: cleaned, fileName, truncated: false };
  }
  return {
    text: cleaned.slice(0, MAX_RIDER_EXTRACTED_CHARS),
    fileName,
    truncated: true,
  };
}

export async function extractRiderFile(file: File): Promise<ExtractRiderFileResult> {
  if (file.size <= 0) {
    return { ok: false, error: 'El archivo seleccionado está vacío.' };
  }
  if (file.size > MAX_RIDER_FILE_BYTES) {
    return { ok: false, error: 'El archivo supera el límite de 15 MB.' };
  }

  const ext = extensionOf(file.name);
  const mime = file.type.toLowerCase();

  if (ext === 'doc' || mime === 'application/msword') {
    return {
      ok: false,
      error: 'El formato antiguo .doc no es compatible. Por favor guárdalo como Word (.docx) o PDF antes de subirlo.',
    };
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let rawText = '';

    if (ext === 'pdf' || mime === 'application/pdf') {
      const extracted = await extractText(bytes, { mergePages: true });
      rawText = extracted.text || '';
    } else if (ext === 'docx' || mime.includes('wordprocessingml')) {
      const extracted = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      rawText = extracted.value || '';
    } else if (
      ext === 'txt' ||
      ext === 'md' ||
      ext === 'markdown' ||
      mime.startsWith('text/') ||
      mime === 'text/markdown'
    ) {
      rawText = new TextDecoder().decode(bytes);
    } else {
      return {
        ok: false,
        error: 'Formato no soportado. Por favor sube un PDF, documento Word (.docx) o archivo de texto (.txt / .md).',
      };
    }

    if (!rawText.trim()) {
      return {
        ok: false,
        error: 'No se pudo extraer texto del archivo. Asegúrate de que no sea un PDF escaneado sólo con imágenes sin OCR.',
      };
    }

    return { ok: true, extracted: cleanAndClipText(rawText, file.name) };
  } catch (err) {
    console.warn('[extractRiderFile] Error extrayendo texto:', err);
    return {
      ok: false,
      error: 'Ocurrió un error al procesar el archivo. Verifica que no esté dañado o protegido con contraseña.',
    };
  }
}
