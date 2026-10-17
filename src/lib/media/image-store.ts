import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
import { del, put } from '@vercel/blob';
import {
  GALLERY_MAX_BYTES,
  PLOT_MAX_BYTES,
  imageKindFromPath,
  isPersistedRiderId,
  riderImagePath,
} from '@/lib/media/rider-media';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'data', 'uploads');
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

let crcTableCache: Uint32Array | null = null;
function getCrcTable(): Uint32Array {
  if (crcTableCache) return crcTableCache;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  crcTableCache = table;
  return table;
}

function crc32(buf: Buffer): number {
  const table = getCrcTable();
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, body: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, body])), 0);
  return Buffer.concat([len, typeBuf, body, crcBuf]);
}

/**
 * Codifica un buffer crudo de píxeles (Grayscale, RGB o RGBA) proveniente de unpdf/pdf.js en un PNG válido.
 */
export function encodePngBuffer(
  width: number,
  height: number,
  channels: number,
  data: Uint8Array | Uint8ClampedArray
): Buffer {
  const colorType = channels === 4 ? 6 : channels === 3 ? 2 : 0;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowBytes = width * channels;
  const raw = Buffer.alloc(height * (1 + rowBytes));
  const srcBuf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + rowBytes);
    raw[rowStart] = 0; // filter: None
    const srcStart = y * rowBytes;
    srcBuf.copy(raw, rowStart + 1, srcStart, srcStart + rowBytes);
  }

  const compressed = zlib.deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function hasVercelBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function assertSafePathname(pathname: string) {
  if (!imageKindFromPath(pathname)) {
    throw new Error('Ruta de archivo no permitida');
  }
}

function localFilePath(pathname: string) {
  assertSafePathname(pathname);
  const full = path.resolve(UPLOAD_ROOT, pathname);
  if (full !== UPLOAD_ROOT && !full.startsWith(`${UPLOAD_ROOT}${path.sep}`)) {
    throw new Error('Ruta de archivo no permitida');
  }
  return full;
}

function extensionForType(type: string) {
  if (type === 'image/png') return '.png';
  if (type === 'image/webp') return '.webp';
  return '.jpg';
}

export function contentTypeForPath(pathname: string) {
  if (pathname.endsWith('.png')) return 'image/png';
  if (pathname.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export async function saveImportedImageBuffer(
  buffer: Buffer,
  contentType: 'image/png' | 'image/jpeg' | 'image/webp',
  filename: string,
  kind: 'gallery' | 'plot',
  riderId: string
): Promise<{ url: string; pathname: string }> {
  const pathname = riderImagePath(riderId, kind, filename);

  if (hasVercelBlob()) {
    try {
      const blob = await put(pathname, buffer, {
        access: 'public',
        addRandomSuffix: true,
        contentType,
      });
      return { url: blob.url, pathname: blob.pathname };
    } catch (err) {
      console.warn('[saveImportedImageBuffer] Error subiendo a Vercel Blob, usando fallback local:', err);
    }
  }

  try {
    const unique = `${pathname.replace(/\.[^.]+$/, '')}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}${extensionForType(contentType)}`;
    const full = localFilePath(unique);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, buffer);
    return {
      url: `/api/media/file/${unique.split('/').map(encodeURIComponent).join('/')}`,
      pathname: unique,
    };
  } catch (err) {
    console.warn('[saveImportedImageBuffer] Fallback a data URL por sistema de archivos de solo lectura:', err);
    return {
      url: `data:${contentType};base64,${buffer.toString('base64')}`,
      pathname: '',
    };
  }
}

export async function saveRiderImage(file: File, kind: 'gallery' | 'plot', riderId: string) {
  if (!isPersistedRiderId(riderId)) {
    throw new Error('Guarda el rider antes de subir imágenes.');
  }
  if (!IMAGE_TYPES.has(file.type)) {
    throw new Error('La imagen tiene que ser JPG, PNG o WebP.');
  }
  const max = kind === 'plot' ? PLOT_MAX_BYTES : GALLERY_MAX_BYTES;
  if (file.size > max) {
    throw new Error(kind === 'plot'
      ? 'La foto del plano puede pesar hasta 5 MB.'
      : 'Cada foto del rider puede pesar hasta 2 MB.');
  }

  const pathname = riderImagePath(riderId, kind, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (hasVercelBlob()) {
    const blob = await put(pathname, buffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.type,
    });
    return { url: blob.url, pathname: blob.pathname };
  }

  const unique = `${pathname.replace(/\.[^.]+$/, '')}-${Date.now()}${extensionForType(file.type)}`;
  const full = localFilePath(unique);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buffer);
  return {
    url: `/api/media/file/${unique.split('/').map(encodeURIComponent).join('/')}`,
    pathname: unique,
  };
}

export async function readLocalRiderImage(pathname: string) {
  return readFile(localFilePath(pathname));
}

export async function deleteStoredImage(pathname: string) {
  if (!imageKindFromPath(pathname)) return;
  try {
    await unlink(localFilePath(pathname));
  } catch {
    // El archivo puede vivir en Blob o ya haberse borrado.
  }
  if (!hasVercelBlob()) return;
  try {
    await del(pathname);
  } catch (error) {
    console.warn('[media delete]', error);
  }
}

export async function deleteStoredImages(pathnames: string[]) {
  await Promise.all(pathnames.map((pathname) => deleteStoredImage(pathname)));
}

