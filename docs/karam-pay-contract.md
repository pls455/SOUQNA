# Karam Pay research

Source inspected: https://karam-pay-api.karam-pay.workers.dev/

The public page is a payment form titled `Karam Pay | الدفع الإلكتروني`. Its inline JavaScript exposes the current public contract:

- Create payment: `POST https://karam-pay-api.karam-pay.workers.dev/api/payments`
- Request header: `Content-Type: application/json` and an `Idempotency-Key` (the page generates a UUID).
- JSON fields sent by the public page: `amount` as a two-decimal string, `currency` (`USD` or `ILS`), `description`, optional `customer_name`, optional `customer_email`, `success_url`, and `cancel_url`.
- Expected successful response field: `checkout_url`; the browser redirects to it.
- Return/status flow: a `payment_id` query parameter is read after return, then the page polls `GET /api/payments/{payment_id}`. The page treats `paid` as success and `failed`/`reversed` as error; otherwise it keeps the operation pending.
- The page supports USD and ILS in its currency select and validates amount between 0.01 and 99,999,999.99.

Safe checks performed: the public page returned HTTP 200; the source clearly contained the routes above. A non-financial invalid amount request and a lookup of a non-existent test ID were sent only to observe validation/error behavior; no valid payment was created.

Still not exposed by the public page: merchant authentication, webhook endpoint/payload, signature verification, refund API, sandbox credentials, or a formal status contract beyond the browser polling behavior. Do not claim production integration until those details and a safe test account are supplied or documented by Karam Pay. Any Karam secret must remain server-side.
