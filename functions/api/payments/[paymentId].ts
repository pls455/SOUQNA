import { envFlag, json, PagesContext, paymentMemory } from '../../_shared';

export const onRequestGet = async (ctx: PagesContext) => {
  const paymentId = ctx.params?.paymentId || '';
  const payment = paymentMemory.get(paymentId);
  if (!payment) return json({ ok: false, error: 'عملية الدفع غير موجودة.' }, 404);
  if (payment.externalPaymentId && envFlag(ctx.env.KARAM_PAY_ENABLED)) {
    const api = (ctx.env.KARAM_PAY_API_URL?.trim() || 'https://karam-pay-api.karam-pay.workers.dev').replace(/\/+$/, '');
    try {
      const upstream = await fetch(`${api}/api/payments/${encodeURIComponent(payment.externalPaymentId)}`);
      const data = await upstream.json().catch(() => ({})) as { status?: string };
      if (data.status === 'paid') payment.status = 'paid';
      if (data.status === 'failed' || data.status === 'reversed') payment.status = 'failed';
    } catch { /* keep last known state; never activate on uncertainty */ }
  }
  return json({ ok: true, paymentId: payment.id, status: payment.status, activated: payment.activated }, 200, { 'Cache-Control': 'no-store' });
};
