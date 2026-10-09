import { ChatAttachment } from '../types/chat.types';

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
export const MAX_EXTRACTED_CHARS = 4000;
export const MAX_MESSAGE_CHARS = 7900;

const TEXT_EXTENSIONS = new Set(['txt', 'md', 'markdown', 'csv', 'json', 'log']);
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);
const DOCUMENT_EXTENSIONS = new Set(['doc', 'docx', 'rtf']);

export const ATTACHMENT_ACCEPT = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  '.pdf',
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.log',
  '.doc',
  '.docx',
  '.rtf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json'
].join(',');

function extensionOf(name: string): string {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index + 1).toLowerCase() : '';
}

export function detectAttachmentKind(file: File): ChatAttachment['kind'] | null {
  const mime = file.type.toLowerCase();
  const ext = extensionOf(file.name);

  if (mime.startsWith('image/') || IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (mime.startsWith('text/') || mime === 'application/json' || TEXT_EXTENSIONS.has(ext)) return 'text';
  if (
    DOCUMENT_EXTENSIONS.has(ext) ||
    mime === 'application/msword' ||
    mime === 'application/rtf' ||
    mime.includes('wordprocessingml')
  ) {
    return 'document';
  }
  return null;
}

export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function readChatAttachment(file: File): Promise<ChatAttachment> {
  const kind = detectAttachmentKind(file);
  if (!kind) {
    throw new Error(`«${file.name}» no es una imagen, PDF o documento de texto.`);
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`«${file.name}» supera el límite de 8 MB.`);
  }

  const attachment: ChatAttachment = {
    id: crypto.randomUUID(),
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    kind
  };

  if (kind === 'image') {
    attachment.previewUrl = URL.createObjectURL(file);
  }

  if (kind === 'text') {
    const raw = await file.text();
    attachment.extractedText = raw.slice(0, MAX_EXTRACTED_CHARS);
    attachment.truncated = raw.length > MAX_EXTRACTED_CHARS;
  }

  return attachment;
}

export function composeChatContent(text: string, attachments?: ChatAttachment[]): string {
  const parts: string[] = [];
  const trimmed = text.trim();
  if (trimmed) parts.push(trimmed);

  if (attachments?.length) {
    const blocks = attachments.map((file) => {
      if (file.kind === 'text' && file.extractedText) {
        const note = file.truncated ? ' (recorte)' : '';
        return `[Adjunto: ${file.name}${note}]\n${file.extractedText}`;
      }
      const label = file.kind === 'image' ? 'Imagen' : file.kind === 'pdf' ? 'PDF' : 'Documento';
      return `[Adjunto: ${file.name} · ${label} · ${formatAttachmentSize(file.size)}]`;
    });
    parts.push(blocks.join('\n\n'));
  }

  let content = parts.join('\n\n');
  if (content.length > MAX_MESSAGE_CHARS) {
    content = `${content.slice(0, MAX_MESSAGE_CHARS)}\n…`;
  }
  return content;
}
