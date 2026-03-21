# Ziina payments

Ziina is a UAE-licensed payment platform for businesses and individuals — see [ziina.com](https://ziina.com/).

Deploy **`create-payment`** first — see [`EDGE_FUNCTIONS.md`](EDGE_FUNCTIONS.md) if you see “Failed to send a request to the Edge Function”.

Checkout uses [Ziina’s Payment Intent API](https://docs.ziina.com/api-reference/payment-intent/create).

## Integration checklist (matches Ziina onboarding)

| Step | This project |
|------|----------------|
| `POST /payment_intent` from **your server** | Done in Edge Function **`create-payment`** → [`_shared/ziina.ts`](../supabase/functions/_shared/ziina.ts) |
| **Amount in fils** (100 AED = `10000`; min **2 AED**) | `amount` = package price × 100; rejected if &lt; 200 fils for AED |
| **`success_url`** / **`cancel_url`** | Built from **`PUBLIC_SITE_URL`** (also **`failure_url`**) |
| Response **`redirect_url`** → send customer there | Returned to the app as `checkoutUrl`; browser navigates to Ziina |
| Status via **`GET /payment_intent/{id}`** | Optional; we rely on **webhooks** + Track page |
| **Test mode:** `test: true` on create | Set Edge secret **`ZIINA_TEST=true`** — any card / expiry / CVV, no charge |
| **Auth:** `Authorization: Bearer <API Key>` | **`ZIINA_API_KEY`** secret |

**Important:** Set **`PUBLIC_SITE_URL`** to the exact origin users use (e.g. `http://localhost:8081` if Vite runs on 8081, not `5173`). Otherwise Ziina will redirect back to the wrong host after pay.

## Referral links locally

Links like `http://localhost:8081/?ref=43B611E7` are fine: the app stores `ref` and applies it after sign-up. The code must match a row in **`profiles.referral_code`** (comparison is case-insensitive). Your dashboard share URL uses `window.location.origin`, so on port **8081** it will generate `http://localhost:8081/?ref=...` automatically.

## Flow

1. **`create-payment`** Edge Function creates an `orders` row, then `POST https://api-v2.ziina.com/api/payment_intent` with:
   - `amount` in **fils** (99 AED → `9900`)
   - `currency_code`: `AED`
   - `success_url` / `cancel_url` / `failure_url`
   - `test: true` when secret **`ZIINA_TEST=true`** (no real charge; [test cards](https://docs.ziina.com/test-cards))
2. Ziina returns `redirect_url` → user pays on Ziina’s page.
3. **`webhook-handler`** receives `payment_intent.status.updated`, verifies **`X-Hmac-Signature`** (HMAC-SHA256 hex of raw body with your webhook `secret`), then updates `orders` by `payment_id` = Ziina payment intent `id`.

## Supabase secrets

| Secret | Purpose |
|--------|---------|
| `ZIINA_API_KEY` | Bearer token from [Ziina Connect / API](https://ziina.com/business/connect) (`write_payment_intents`) |
| `ZIINA_WEBHOOK_SECRET` | Same string you pass as `secret` when registering the webhook with Ziina |
| `PUBLIC_SITE_URL` | Site origin for success/cancel URLs (no trailing slash) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (create-payment + webhook) |
| `ZIINA_API_BASE` | Optional; default `https://api-v2.ziina.com/api` |
| `ZIINA_TEST` | Optional; set `true` for test payment intents |

## Register the webhook with Ziina

Use Ziina’s API (token needs `write_webhooks` scope): `POST /webhook` with body:

```json
{
  "url": "https://<project-ref>.supabase.co/functions/v1/webhook-handler",
  "secret": "<same value as ZIINA_WEBHOOK_SECRET>"
}
```

See [Ziina webhooks](https://docs.ziina.com/api-reference/webhook/index).

## Frontend

`VITE_DEV_LOCAL_CHECKOUT=true` bypasses Ziina for **local DB demos only**. **Production** should use real Ziina + deployed functions only.
