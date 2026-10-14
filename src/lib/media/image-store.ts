import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';
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
