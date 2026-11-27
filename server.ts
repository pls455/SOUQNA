import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

const ALLOWED_IMAGE_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

const ALLOWED_FOLDERS = new Set(['products', 'stores', 'proofs']);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const KARAM_PAY_API_URL = (process.env.KARAM_PAY_API_URL?.trim() || 'https://karam-pay-api.karam-pay.workers.dev').replace(/\/+$/, '');
const KARAM_PAY_ENABLED = process.env.KARAM_PAY_ENABLED === 'true';
type PlatformPaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'refunded';
type PlatformPayment = {
  id: string;
  storeId: string;
  service: string;
  planId?: string;
  amount: number;
  currency: 'ILS';
  status: PlatformPaymentStatus;
  externalPaymentId?: string;
  checkoutUrl?: string;
  activated: boolean;
  createdAt: string;
  paidAt?: string;
};
const platformPayments = new Map<string, PlatformPayment>();
const paymentIdempotency = new Map<string, string>();
const PLATFORM_PRICES: Record<string, number> = {
  pro: 19,
  business: 39,
  product_promotion_3d: 5,
  product_promotion_7d: 10,
  store_feature_7d: 10,
  store_feature_30d: 25,
  home_ad_3d: 20,
  category_ad_7d: 15,
};

function getR2Config() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || '';
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim() || '';
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim() || '';
  const bucket = process.env.CLOUDFLARE_R2_BUCKET?.trim() || 'souqna-media';
  const publicUrl = (process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim() || '').replace(/\/+$/, '');
  const configured = Boolean(accountId && accessKeyId && secretAccessKey && bucket && publicUrl);
  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl, configured };
}

function getSupabaseConfig() {
  const url = (process.env.VITE_SUPABASE_URL?.trim() || '').replace(/\/+$/, '');
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim() || '';
  return {
    url,
    anonKey,
    configured: Boolean(url && anonKey),
  };
}

function appBaseUrl(): string {
  return (process.env.APP_URL?.trim() || `http://localhost:${PORT}`).replace(/\/+$/, '');
}

function platformPaymentError(res: express.Response, status: number, error: string) {
  res.status(status).json({ ok: false, error });
}

function validateImageMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;
  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (mimeType === 'image/webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  if (mimeType === 'image/avif') {
    return buffer.subarray(4, 8).toString('ascii') === 'ftyp';
  }
  return false;
}

function hmacSha256(key: string | Buffer, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256Hex(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function createR2PresignedPutUrl(params: {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  objectKey: string;
  contentType: string;
  expiresInSeconds?: number;
}): string {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const region = 'auto';
  const service = 's3';
  const host = `${params.accountId}.r2.cloudflarestorage.com`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const encodedKey = params.objectKey
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  const canonicalUri = `/${encodeURIComponent(params.bucket)}/${encodedKey}`;

  const query = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${params.accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(params.expiresInSeconds ?? 300),
    'X-Amz-SignedHeaders': 'content-type;host',
  });
  query.sort();

  const canonicalHeaders = `content-type:${params.contentType}\nhost:${host}\n`;
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    query.toString(),
    canonicalHeaders,
    'content-type;host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = hmacSha256(`AWS4${params.secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  return `https://${host}${canonicalUri}?${query.toString()}&X-Amz-Signature=${signature}`;
}

async function verifySupabaseBearerIfConfigured(authHeader: string | undefined): Promise<{ ok: boolean; userId?: string }> {
  const supa = getSupabaseConfig();
  if (!supa.configured) {
    return { ok: true };
  }
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false };
  }
  const token = authHeader.slice(7).trim();
  if (!token) return { ok: false };

  try {
    const res = await fetch(`${supa.url}/auth/v1/user`, {
      headers: {
        apikey: supa.anonKey,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return { ok: false };
    const user = (await res.json()) as { id?: string };
    return user?.id ? { ok: true, userId: user.id } : { ok: false };
  } catch {
    return { ok: false };
  }
}

async function createAppServer() {
  const app = express();

  app.get('/api/health', (_req, res) => {
    const r2 = getR2Config();
    const supa = getSupabaseConfig();
    res.json({
      ok: true,
      integrations: {
        supabaseConfigured: supa.configured,
        cloudflareR2Configured: r2.configured,
        karamPayConfigured: KARAM_PAY_ENABLED,
      },
    });
  });

  app.post('/api/payments/create', express.json({ limit: '32kb' }), async (req, res) => {
    if (!KARAM_PAY_ENABLED) {
      platformPaymentError(res, 503, 'بوابة Karam Pay غير مفعلة بعد. أضف إعدادات الاختبار الرسمية قبل إنشاء دفعة.');
      return;
    }
    const auth = await verifySupabaseBearerIfConfigured(req.headers.authorization);
    if (!auth.ok) {
      platformPaymentError(res, 401, 'يجب تسجيل الدخول بحساب التاجر لبدء الدفع.');
      return;
    }
    const { storeId, service, planId, serviceId } = req.body ?? {};
    if (typeof storeId !== 'string' || !storeId.trim()) {
      platformPaymentError(res, 400, 'معرف المتجر مطلوب.');
      return;
    }
    const priceKey = service === 'subscription' ? planId : serviceId;
    const amount = typeof priceKey === 'string' ? PLATFORM_PRICES[priceKey] : undefined;
    if (!amount || (service === 'subscription' && planId !== 'pro' && planId !== 'business')) {
      platformPaymentError(res, 400, 'الخدمة أو الخطة غير مؤهلة للدفع.');
      return;
    }
    const idempotencyKey = typeof req.headers['idempotency-key'] === 'string'
      ? req.headers['idempotency-key'].trim()
      : '';
    if (!idempotencyKey || idempotencyKey.length > 180) {
      platformPaymentError(res, 400, 'مفتاح Idempotency-Key مطلوب.');
      return;
    }
    const previousId = paymentIdempotency.get(idempotencyKey);
    if (previousId) {
      const previous = platformPayments.get(previousId);
      if (previous) {
        res.json({ ok: true, paymentId: previous.id, status: previous.status, checkoutUrl: previous.checkoutUrl });
        return;
      }
    }
    const payment: PlatformPayment = {
      id: `sqp_${crypto.randomUUID()}`,
      storeId: storeId.trim(),
      service,
      planId: typeof planId === 'string' ? planId : undefined,
      amount,
      currency: 'ILS',
      status: 'pending',
      activated: false,
      createdAt: new Date().toISOString(),
    };
    platformPayments.set(payment.id, payment);
    paymentIdempotency.set(idempotencyKey, payment.id);
    try {
      const upstream = await fetch(`${KARAM_PAY_API_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({
          amount: amount.toFixed(2),
          currency: 'ILS',
          description: `SOUQNA ${service === 'subscription' ? `subscription ${planId}` : service}`,
          success_url: `${appBaseUrl()}/seller/payment/pending?payment_id=${encodeURIComponent(payment.id)}`,
          cancel_url: `${appBaseUrl()}/seller/payment/failed?payment_id=${encodeURIComponent(payment.id)}`,
        }),
      });
      const data = (await upstream.json().catch(() => ({}))) as { checkout_url?: string; payment_id?: string; error?: string };
      if (!upstream.ok || typeof data.checkout_url !== 'string' || !data.checkout_url) {
        payment.status = 'failed';
        platformPaymentError(res, 502, data.error || 'لم يرجع Karam Pay رابط الدفع المطلوب.');
        return;
      }
      payment.status = 'processing';
      payment.checkoutUrl = data.checkout_url;
      payment.externalPaymentId = typeof data.payment_id === 'string' ? data.payment_id : undefined;
      res.json({ ok: true, paymentId: payment.id, status: payment.status, checkoutUrl: payment.checkoutUrl });
    } catch {
      payment.status = 'failed';
      platformPaymentError(res, 502, 'تعذر الاتصال ببوابة Karam Pay.');
    }
  });

  app.get('/api/payments/:paymentId', async (req, res) => {
    const payment = platformPayments.get(req.params.paymentId);
    if (!payment) {
      platformPaymentError(res, 404, 'عملية الدفع غير موجودة.');
      return;
    }
    if (payment.externalPaymentId && KARAM_PAY_ENABLED) {
      try {
        const upstream = await fetch(`${KARAM_PAY_API_URL}/api/payments/${encodeURIComponent(payment.externalPaymentId)}`);
        const data = (await upstream.json().catch(() => ({}))) as { status?: string };
        if (data.status === 'paid') {
          payment.status = 'paid';
          payment.paidAt ||= new Date().toISOString();
        } else if (data.status === 'failed' || data.status === 'reversed') {
          payment.status = 'failed';
        }
      } catch {
        // Keep the last known state; never activate on an uncertain response.
      }
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, paymentId: payment.id, status: payment.status, activated: payment.activated });
  });

  app.post('/api/payments/webhook', express.raw({ type: '*/*', limit: '256kb' }), (_req, res) => {
    res.status(501).json({ ok: false, error: 'Webhook Karam Pay متوقف حتى تزويد عقد التوقيع الرسمي.' });
  });

  app.post('/api/media/presign', express.json({ limit: '32kb' }), async (req, res) => {
    const auth = await verifySupabaseBearerIfConfigured(req.headers.authorization);
    if (!auth.ok) {
      res.status(401).json({ ok: false, error: 'يجب تسجيل الدخول لرفع الصور.' });
      return;
    }

    const r2 = getR2Config();
    if (!r2.configured) {
      res.status(200).json({
        ok: false,
        configured: false,
        message: 'إعدادات Cloudflare R2 غير مضافة بعد — يتم استخدام المعاينة المحلية مؤقتاً.',
      });
      return;
    }

    const contentType = typeof req.body?.contentType === 'string' ? req.body.contentType : '';
    const folder = typeof req.body?.folder === 'string' && ALLOWED_FOLDERS.has(req.body.folder)
      ? req.body.folder
      : 'products';
    const size = Number(req.body?.size || 0);

    const ext = ALLOWED_IMAGE_MIME[contentType];
    if (!ext) {
      res.status(400).json({ ok: false, error: 'نوع الصورة غير مدعوم (JPG, PNG, WebP, AVIF فقط).' });
      return;
    }
    if (!Number.isFinite(size) || size <= 0 || size > MAX_UPLOAD_BYTES) {
      res.status(400).json({ ok: false, error: 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت.' });
      return;
    }

    const key = `${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const uploadUrl = createR2PresignedPutUrl({
      accountId: r2.accountId,
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
      bucket: r2.bucket,
      objectKey: key,
      contentType,
    });

    res.json({
      ok: true,
      configured: true,
      uploadUrl,
      publicUrl: `${r2.publicUrl}/${key}`,
      key,
    });
  });

  app.post(
    '/api/media/upload',
    express.raw({
      type: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
      limit: '5mb',
    }),
    async (req, res) => {
      const auth = await verifySupabaseBearerIfConfigured(req.headers.authorization);
      if (!auth.ok) {
        res.status(401).json({ ok: false, error: 'يجب تسجيل الدخول لرفع الصور.' });
        return;
      }

      const contentType = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      const ext = ALLOWED_IMAGE_MIME[contentType];
      if (!ext) {
        res.status(400).json({ ok: false, error: 'نوع الصورة غير مدعوم.' });
        return;
      }

      const bodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      if (bodyBuffer.length === 0 || bodyBuffer.length > MAX_UPLOAD_BYTES) {
        res.status(400).json({ ok: false, error: 'حجم الصورة غير صالح.' });
        return;
      }

      if (!validateImageMagicBytes(bodyBuffer, contentType)) {
        res.status(400).json({ ok: false, error: 'محتوى الملف لا يطابق صورة صالحة.' });
        return;
      }

      const r2 = getR2Config();
      if (!r2.configured) {
        res.status(200).json({
          ok: false,
          configured: false,
          message: 'Cloudflare R2 غير مهيأ بعد — استخدم متغيرات البيئة في .env لتفعيل الرفع السحابي.',
        });
        return;
      }

      const rawFolder = typeof req.query.folder === 'string' ? req.query.folder : 'products';
      const folder = ALLOWED_FOLDERS.has(rawFolder) ? rawFolder : 'products';
      const key = `${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const uploadUrl = createR2PresignedPutUrl({
        accountId: r2.accountId,
        accessKeyId: r2.accessKeyId,
        secretAccessKey: r2.secretAccessKey,
        bucket: r2.bucket,
        objectKey: key,
        contentType,
      });

      const r2Res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: new Uint8Array(bodyBuffer),
      });

      if (!r2Res.ok) {
        res.status(502).json({ ok: false, error: 'تعذر رفع الصورة إلى Cloudflare R2.' });
        return;
      }

      res.json({
        ok: true,
        configured: true,
        key,
        url: `${r2.publicUrl}/${key}`,
      });
    }
  );

  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Souq Gaza server listening on http://localhost:${PORT}`);
  });
}

createAppServer();
