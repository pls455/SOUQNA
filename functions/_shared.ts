export type Env = {
  KARAM_PAY_API_URL?: string;
  KARAM_PAY_ENABLED?: string;
  KARAM_PAY_API_KEY?: string;
  KARAM_PAY_WEBHOOK_SECRET?: string;
  APP_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  R2_PUBLIC_URL?: string;
  MEDIA_BUCKET?: { put: (key: string, value: ArrayBuffer | ArrayBufferView | ReadableStream, options?: unknown) => Promise<void> };
};

export type PagesContext = {
  request: Request;
  env: Env;
  params?: Record<string, string>;
};

export function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

export function envFlag(value: string | undefined) {
  return value?.trim().toLowerCase() === 'true';
}

export function appBaseUrl(ctx: PagesContext) {
  return (ctx.env.APP_URL?.trim() || new URL(ctx.request.url).origin).replace(/\/+$/, '');
}

export function randomId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function verifySupabaseBearer(ctx: PagesContext) {
  const supabaseUrl = ctx.env.SUPABASE_URL?.trim().replace(/\/+$/, '');
  const anonKey = ctx.env.SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) return { ok: true as const };
  const header = ctx.request.headers.get('Authorization') || '';
  if (!header.startsWith('Bearer ')) return { ok: false as const };
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: header },
  });
  if (!response.ok) return { ok: false as const };
  const user = (await response.json()) as { id?: string };
  return user.id ? { ok: true as const, userId: user.id } : { ok: false as const };
}

export function allowedFolder(value: string | null) {
  return value === 'products' || value === 'stores' || value === 'proofs' ? value : 'products';
}

export function allowedImageType(value: string) {
  return value === 'image/jpeg' || value === 'image/png' || value === 'image/webp' || value === 'image/avif';
}

export function extensionForType(value: string) {
  return value === 'image/jpeg' ? 'jpg' : value === 'image/png' ? 'png' : value === 'image/webp' ? 'webp' : 'avif';
}

export function hasValidImageSignature(bytes: Uint8Array, mime: string) {
  if (bytes.length < 12) return false;
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === 'image/png') return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (mime === 'image/webp') return new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
  return new TextDecoder().decode(bytes.slice(4, 8)) === 'ftyp';
}

export const PLATFORM_PRICES: Record<string, number> = {
  pro: 19,
  business: 39,
  product_promotion_3d: 5,
  product_promotion_7d: 10,
  store_feature_7d: 10,
  store_feature_30d: 25,
  home_ad_3d: 20,
  category_ad_7d: 15,
};

export const paymentMemory = new Map<string, { id: string; status: string; activated: boolean; externalPaymentId?: string; checkoutUrl?: string }>();
