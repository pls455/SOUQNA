import { appBaseUrl, envFlag, json, PagesContext, PLATFORM_PRICES, randomId, verifySupabaseBearer } from '../../_shared';

export const onRequestPost = async (ctx: PagesContext) => {
  if (!envFlag(ctx.env.KARAM_PAY_ENABLED)) {
    return json({ ok: false, error: 'بوابة Karam Pay غير مفعلة بعد. أضف إعدادات الاختبار الرسمية قبل إنشاء دفعة.' }, 503);
  }
  const auth = await verifySupabaseBearer(ctx);
  if (!auth.ok) return json({ ok: false, error: 'يجب تسجيل الدخول بحساب التاجر لبدء الدفع.' }, 401);
  const body = await ctx.request.json().catch(() => ({})) as { storeId?: string; service?: string; planId?: string; serviceId?: string };
  if (!body.storeId?.trim()) return json({ ok: false, error: 'معرف المتجر مطلوب.' }, 400);
  const priceKey = body.service === 'subscription' ? body.planId : body.serviceId;
  const amount = priceKey ? PLATFORM_PRICES[priceKey] : undefined;
  if (!amount || (body.service === 'subscription' && body.planId !== 'pro' && body.planId !== 'business')) {
    return json({ ok: false, error: 'الخدمة أو الخطة غير مؤهلة للدفع.' }, 400);
  }
  const idempotencyKey = ctx.request.headers.get('Idempotency-Key')?.trim();
  if (!idempotencyKey || idempotencyKey.length > 180) return json({ ok: false, error: 'مفتاح Idempotency-Key مطلوب.' }, 400);
  const paymentId = randomId('sqp');
  const upstreamUrl = (ctx.env.KARAM_PAY_API_URL?.trim() || 'https://karam-pay-api.karam-pay.workers.dev').replace(/\/+$/, '');
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey };
  if (ctx.env.KARAM_PAY_API_KEY?.trim()) headers.Authorization = `Bearer ${ctx.env.KARAM_PAY_API_KEY.trim()}`;
  try {
    const upstream = await fetch(`${upstreamUrl}/api/payments`, {
      method: 'POST', headers,
      body: JSON.stringify({
        amount: amount.toFixed(2), currency: 'ILS', description: `SOUQNA ${body.service === 'subscription' ? `subscription ${body.planId}` : body.service}`,
        success_url: `${appBaseUrl(ctx)}/seller/payment/pending?payment_id=${encodeURIComponent(paymentId)}`,
        cancel_url: `${appBaseUrl(ctx)}/seller/payment/failed?payment_id=${encodeURIComponent(paymentId)}`,
      }),
    });
    const data = await upstream.json().catch(() => ({})) as { checkout_url?: string; payment_id?: string; error?: string };
    if (!upstream.ok || !data.checkout_url) return json({ ok: false, error: data.error || 'لم يرجع Karam Pay رابط الدفع المطلوب.' }, 502);
    const record = { id: paymentId, status: 'processing', activated: false, checkoutUrl: data.checkout_url, externalPaymentId: data.payment_id };
    const { paymentMemory } = await import('../../_shared');
    paymentMemory.set(paymentId, record);
    return json({ ok: true, paymentId, status: record.status, checkoutUrl: record.checkoutUrl });
  } catch {
    return json({ ok: false, error: 'تعذر الاتصال ببوابة Karam Pay.' }, 502);
  }
};
