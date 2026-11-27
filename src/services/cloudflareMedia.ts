import { getSupabaseAccessToken } from '../lib/supabaseClient';

export type MediaFolder = 'products' | 'stores' | 'proofs';

export interface MediaUploadResult {
  ok: boolean;
  url?: string;
  source: 'cloudflare-r2' | 'local-preview';
  error?: string;
}

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Validates that a media URL uses safe http/https or safe raster data:image schemes.
 */
export function isSafeMediaUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return true;
  }
  if (/^data:image\/(jpeg|png|webp|avif);base64,/i.test(trimmed)) {
    return true;
  }
  return false;
}

function readFileAsCompressedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('تعذر معالجة الصورة.'));
      };
      img.onload = () => {
        const maxSide = 960;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(typeof reader.result === 'string' ? reader.result : '');
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/webp', 0.84));
      };
      img.src = typeof reader.result === 'string' ? reader.result : '';
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an image via `/api/media/upload` to Cloudflare R2 when configured.
 * Falls back cleanly to local WebP compression preview when R2 env vars aren't connected yet.
 */
export async function uploadMediaImage(
  file: File,
  folder: MediaFolder = 'products'
): Promise<MediaUploadResult> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return {
      ok: false,
      source: 'local-preview',
      error: 'يرجى اختيار صورة بصيغة JPG أو PNG أو WebP أو AVIF.',
    };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      source: 'local-preview',
      error: 'الحد الأقصى لحجم الصورة هو 5 ميجابايت.',
    };
  }

  try {
    const token = await getSupabaseAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': file.type,
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`/api/media/upload?folder=${encodeURIComponent(folder)}`, {
      method: 'POST',
      headers,
      body: file,
    });

    if (res.ok) {
      const json = (await res.json()) as {
        ok?: boolean;
        configured?: boolean;
        url?: string;
        error?: string;
      };
      if (json.ok && json.url && isSafeMediaUrl(json.url)) {
        return {
          ok: true,
          url: json.url,
          source: 'cloudflare-r2',
        };
      }
      if (json.configured === false) {
        const preview = await readFileAsCompressedDataUrl(file);
        return { ok: true, url: preview, source: 'local-preview' };
      }
      if (json.error) {
        return { ok: false, source: 'local-preview', error: json.error };
      }
    }
  } catch {
    // Fall back to local browser preview if server upload isn't reachable yet
  }

  try {
    const preview = await readFileAsCompressedDataUrl(file);
    return { ok: true, url: preview, source: 'local-preview' };
  } catch {
    return {
      ok: false,
      source: 'local-preview',
      error: 'تعذر تجهيز الصورة، يرجى المحاولة بصورة أخرى.',
    };
  }
}
