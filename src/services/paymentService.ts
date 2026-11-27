export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded';

export interface CreatePlatformPaymentInput {
  storeId: string;
  service: 'subscription' | 'product_promotion' | 'store_feature' | 'advertisement';
  planId?: 'pro' | 'business';
  serviceId?: string;
}

export interface PlatformPaymentResponse {
  ok: boolean;
  paymentId: string;
  status: PaymentStatus;
  checkoutUrl?: string;
  error?: string;
}

export async function createPlatformPayment(
  input: CreatePlatformPaymentInput,
  idempotencyKey = crypto.randomUUID()
): Promise<PlatformPaymentResponse> {
  const response = await fetch('/api/payments/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(input),
  });
  const data = (await response.json()) as PlatformPaymentResponse;
  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'تعذر إنشاء عملية الدفع');
  }
  return data;
}

export async function getPlatformPaymentStatus(paymentId: string) {
  const response = await fetch(`/api/payments/${encodeURIComponent(paymentId)}`, {
    cache: 'no-store',
  });
  const data = (await response.json()) as {
    ok: boolean;
    paymentId: string;
    status: PaymentStatus;
    activated: boolean;
    error?: string;
  };
  if (!response.ok || !data.ok) throw new Error(data.error || 'تعذر التحقق من عملية الدفع');
  return data;
}
