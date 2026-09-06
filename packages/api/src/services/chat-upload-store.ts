import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Local chat media lives next to the SQLite database. */
export function chatUploadsRoot(): string {
  const raw = (process.env.DATABASE_PATH || '').trim();
  // Match db.ts: absolute DATABASE_PATH wins; else packages/api/data (this file is in services/).
  const dbFile =
    raw && path.isAbsolute(raw)
      ? raw
      : path.join(__dirname, '..', '..', 'data', 'petdate.db');
  return path.join(path.dirname(dbFile), 'chat-uploads');
}

export function ensureChatUploadsRoot(): string {
  const root = chatUploadsRoot();
  if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });
  return root;
}

/** Safe relative key: `{folderId}/{uuid}{ext}` — never absolute or with `..`. */
export function buildStorageKey(folderId: string | number, originalName: string): string {
  const folder = String(folderId).replace(/[^\w.~-]/gi, '');
  if (!folder) throw new Error('INVALID_FOLDER_ID');
  const ext = path.extname(originalName || '').slice(0, 16).replace(/[^\w.~-]/gi, '');
  return `${folder}/${randomUUID()}${ext}`;
}

export function resolveStoragePath(storageKey: string): string | null {
  if (!storageKey || storageKey.includes('..') || path.isAbsolute(storageKey)) return null;
  const root = ensureChatUploadsRoot();
  const abs = path.resolve(root, storageKey);
  if (!abs.startsWith(path.resolve(root) + path.sep) && abs !== path.resolve(root)) {
    return null;
  }
  return abs;
}

export function saveChatUpload(opts: {
  /** Playdate numeric id, or string like `vet-{consultId}`. */
  folderId: string | number;
  /** @deprecated use folderId — kept for call-site clarity in playdate routes */
  playdateId?: number;
  originalName: string;
  buffer: Buffer;
}): { storageKey: string; absolutePath: string } {
  if (opts.buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error('FILE_TOO_LARGE');
  }
  const folderId = opts.folderId ?? opts.playdateId;
  if (folderId == null) throw new Error('INVALID_FOLDER_ID');
  const storageKey = buildStorageKey(folderId, opts.originalName);
  const abs = resolveStoragePath(storageKey);
  if (!abs) throw new Error('INVALID_STORAGE_KEY');
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, opts.buffer);
  return { storageKey, absolutePath: abs };
}

export function deleteChatUpload(storageKey: string | null | undefined): void {
  if (!storageKey) return;
  const abs = resolveStoragePath(storageKey);
  if (!abs) return;
  try {
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch {
    /* ignore */
  }
}

/** Remove an entire chat-upload folder (e.g. playdate id or `vet-{consultId}`). */
export function purgeChatUploadFolder(folderId: string | number): void {
  const folder = String(folderId).replace(/[^\w.~-]/gi, '');
  if (!folder || folder.includes('..')) return;
  const root = ensureChatUploadsRoot();
  const abs = path.resolve(root, folder);
  if (!abs.startsWith(path.resolve(root) + path.sep)) return;
  try {
    if (fs.existsSync(abs)) fs.rmSync(abs, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

export function inferMediaKind(
  mimeType: string | undefined,
  fileName: string | undefined
): 'photo' | 'video' | 'voice' | 'audio' | 'document' {
  const mime = (mimeType || '').toLowerCase();
  const name = (fileName || '').toLowerCase();
  if (mime.startsWith('image/')) return 'photo';
  if (mime.startsWith('video/')) return 'video';
  if (
    mime === 'audio/ogg' ||
    mime === 'audio/opus' ||
    name.endsWith('.ogg') ||
    name.endsWith('.opus')
  ) {
    return 'voice';
  }
  if (mime.startsWith('audio/')) return 'audio';
  return 'document';
}

export { MAX_UPLOAD_BYTES };
