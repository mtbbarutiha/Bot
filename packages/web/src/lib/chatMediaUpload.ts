/** Shared chat attachment helpers for playmate + vet chat (mobile Safari safe). */

export const MAX_CHAT_ATTACH_BYTES = 15 * 1024 * 1024;

/** Broader than image/* so iOS Photos offers HEIC and Camera Roll reliably. */
export const CHAT_FILE_ACCEPT =
  'image/*,image/heic,image/heif,.heic,.heif,video/*,audio/*,.pdf,.doc,.docx,.zip,.txt';

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|heic|heif|bmp|tiff?)$/i;

export function isLikelyChatImage(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  if (type.startsWith('image/')) return true;
  if (!type || type === 'application/octet-stream') {
    return IMAGE_EXT_RE.test(file.name || '');
  }
  return IMAGE_EXT_RE.test(file.name || '');
}

function isHeicLike(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  return (
    type.includes('heic') ||
    type.includes('heif') ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  );
}

async function decodeImageSource(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file);
      return bmp;
    } catch {
      /* fall through to HTMLImageElement */
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('IMAGE_DECODE_FAILED'));
      el.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Re-encode photos to JPEG before upload.
 * Fixes iOS Safari quirks: 16-bit PNG screenshots (upload OK but <img> blank),
 * HEIC/HEIF, and empty MIME after gallery pick.
 */
export async function prepareChatUploadFile(file: File): Promise<File> {
  if (!file || file.size <= 0) {
    throw new Error('فایل خالی است یا از گالری درست خوانده نشد. دوباره عکس را انتخاب کن.');
  }
  if (file.size > MAX_CHAT_ATTACH_BYTES) {
    throw new Error('حجم فایل بیش از حد مجاز است (حداکثر ۱۵ مگابایت)');
  }

  if (!isLikelyChatImage(file)) {
    return file;
  }

  // Keep animated GIF as-is.
  const type = (file.type || '').toLowerCase();
  if (type === 'image/gif' || (file.name || '').toLowerCase().endsWith('.gif')) {
    return file;
  }

  try {
    const source = await decodeImageSource(file);
    const srcW =
      'naturalWidth' in source && typeof source.naturalWidth === 'number'
        ? source.naturalWidth || source.width
        : source.width;
    const srcH =
      'naturalHeight' in source && typeof source.naturalHeight === 'number'
        ? source.naturalHeight || source.height
        : source.height;
    if (!srcW || !srcH) throw new Error('IMAGE_DECODE_FAILED');

    const maxEdge = 2048;
    const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
    const width = Math.max(1, Math.round(srcW * scale));
    const height = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('CANVAS_UNAVAILABLE');
    ctx.drawImage(source, 0, 0, width, height);
    if ('close' in source && typeof (source as ImageBitmap).close === 'function') {
      (source as ImageBitmap).close();
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b && b.size > 0 ? resolve(b) : reject(new Error('JPEG_ENCODE_FAILED'))),
        'image/jpeg',
        0.85,
      );
    });

    if (blob.size > MAX_CHAT_ATTACH_BYTES) {
      throw new Error('حجم فایل بیش از حد مجاز است (حداکثر ۱۵ مگابایت)');
    }

    const base = (file.name || 'photo').replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${base}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch {
    if (isHeicLike(file)) {
      throw new Error(
        'این عکس HEIC است و تبدیل نشد. از گالری به‌صورت JPEG بفرست یا اسکرین‌شات بفرست.',
      );
    }
    // Already-web-safe JPEG/WebP: send original if re-encode failed.
    if (type === 'image/jpeg' || type === 'image/jpg' || type === 'image/webp') {
      return file;
    }
    throw new Error('پردازش عکس ناموفق بود. لطفاً دوباره امتحان کن یا فرمت JPEG بفرست.');
  }
}
