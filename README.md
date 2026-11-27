# SOUQNA | سوقنا

منصة سوق متعددة المتاجر بواجهة عربية RTL، سلال منفصلة لكل متجر، طلبات داخلية أو عبر واتساب، وبوابة تاجر ولوحة إدارة. هذه النسخة تحافظ على واجهة React/Vite الحالية وتضيف طبقة Backend Express لعقود الدفع والوسائط.

## التشغيل

```bash
npm install
cp .env.example .env
npm run dev
```

للفحص:

```bash
npm run lint
npm run build
```

## الإعدادات

`VITE_SUPABASE_URL` و`VITE_SUPABASE_ANON_KEY` قيمتان آمنتان للواجهة عند ربط Supabase. لا تضع `SUPABASE_SERVICE_ROLE_KEY` أو أي مفتاح Karam Pay ببادئة `VITE_`.

Cloudflare R2 اختياري للصور، ويحتاج متغيرات R2 الموجودة في `.env.example`. إذا لم تُضف الإعدادات يستخدم المشروع fallback محليًا للمعاينة.

## Karam Pay

تستخدم SOUQNA المسارات المؤكدة من الواجهة العامة لمزود Karam Pay. الخادم ينشئ الدفع من السعر الموجود في كتالوج المنصة، ويرسل `Idempotency-Key`، ثم يعيد `checkout_url` للواجهة. يمكن فحص الحالة عبر المسار الداخلي `/api/payments/:paymentId`.

يبقى `KARAM_PAY_ENABLED=false` افتراضيًا. لا تفعّله في الإنتاج قبل الحصول على مصادقة الحساب، عقد Webhook، طريقة التوقيع، وبيانات الاختبار الرسمية من Karam Pay. مسار `/api/payments/webhook` يرفض العمل حاليًا بدل قبول إشعار غير موثق، ولا تُفعّل خدمة مدفوعة من صفحة العودة وحدها.

## الملفات المهمة

- `server.ts`: خادم API والتحقق الأولي للدفع.
- `src/services/paymentService.ts`: عميل الواجهة الذي يتواصل مع Backend فقط.
- `supabase/schema.sql`: مخطط الجداول والقيود وRLS الأساسي.
- `plan.md`: قرارات التنفيذ وحدود المرحلة الحالية.
- `TODO.md`: الإعدادات والاختبارات المتبقية قبل الإنتاج.
