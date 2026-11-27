import { json, PagesContext, verifySupabaseBearer } from '../../_shared';

export const onRequestPost = async (ctx: PagesContext) => {
  const auth = await verifySupabaseBearer(ctx);
  if (!auth.ok) return json({ ok: false, error: 'يجب تسجيل الدخول لرفع الصور.' }, 401);
  if (new URL(ctx.request.url).searchParams.get('folder') === 'proofs') {
    return json({ ok: false, error: 'رفع مستندات الإثبات الخاصة غير متاح عبر bucket الصور العام.' }, 403);
  }
  if (!ctx.env.MEDIA_BUCKET || !ctx.env.R2_PUBLIC_URL) {
    return json({ ok: false, configured: false, message: 'إعدادات Cloudflare R2 غير مضافة بعد — يتم استخدام المعاينة المحلية مؤقتاً.' });
  }
  return json({ ok: false, configured: true, error: 'استخدم /api/media/upload مع R2 binding لرفع الصورة مباشرة.' }, 501);
};
