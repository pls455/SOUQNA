import { allowedFolder, allowedImageType, extensionForType, hasValidImageSignature, json, PagesContext, randomId, verifySupabaseBearer } from '../../_shared';

export const onRequestPost = async (ctx: PagesContext) => {
  const auth = await verifySupabaseBearer(ctx);
  if (!auth.ok) return json({ ok: false, error: 'يجب تسجيل الدخول لرفع الصور.' }, 401);
  if (!ctx.env.MEDIA_BUCKET || !ctx.env.R2_PUBLIC_URL) {
    return json({ ok: false, configured: false, message: 'Cloudflare R2 غير مهيأ بعد — يتم استخدام المعاينة المحلية مؤقتاً.' });
  }
  const contentType = (ctx.request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  if (!allowedImageType(contentType)) return json({ ok: false, error: 'نوع الصورة غير مدعوم.' }, 400);
  const body = new Uint8Array(await ctx.request.arrayBuffer());
  if (!body.length || body.length > 5 * 1024 * 1024) return json({ ok: false, error: 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت.' }, 400);
  if (!hasValidImageSignature(body, contentType)) return json({ ok: false, error: 'محتوى الملف لا يطابق صورة صالحة.' }, 400);
  const folder = allowedFolder(new URL(ctx.request.url).searchParams.get('folder'));
  const key = `${folder}/${Date.now()}-${randomId('img')}.${extensionForType(contentType)}`;
  await ctx.env.MEDIA_BUCKET.put(key, body, { httpMetadata: { contentType } });
  return json({ ok: true, configured: true, key, url: `${ctx.env.R2_PUBLIC_URL.replace(/\/+$/, '')}/${key}` });
};
