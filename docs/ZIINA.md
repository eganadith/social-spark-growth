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
| Status via **`GET /payment_intent/{id}`** | **Primary:** Edge **`poll-pending-payments`** + **`check-payment-once`** (no webhook required). Optional webhook still supported. |
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
3. **Verification (no webhook required):** schedule **`poll-pending-payments`** (e.g. every minute via external cron, or as often as every 20s) with header **`x-socioly-poll: <PAYMENTS_POLL_SECRET>`**. The function calls **`GET /payment_intent/{id}`** with retries, updates **`payments`** and **`orders`**, starts the **72h** SLA, and POSTs **`BOOSTING_WEBHOOK_URL`** when configured. The **`/payment-success`** page calls **`check-payment-once`** on a **20s** interval for faster UX.
4. **Optional:** **`webhook-handler`** can still receive `payment_intent.status.updated` and runs the same sync (requires **`ZIINA_WEBHOOK_SECRET`**).

## Supabase secrets

| Secret | Purpose |
|--------|---------|
| `ZIINA_API_KEY` | Bearer token from [Ziina Connect / API](https://ziina.com/business/connect) (`write_payment_intents`); sent as `Authorization: Bearer <API Key>` on every Ziina request |
| `ZIINA_WEBHOOK_SECRET` | Optional; same string as Ziina webhook `secret` if you use **`webhook-handler`** |
| `PAYMENTS_POLL_SECRET` | Shared secret for **`poll-pending-payments`** (header `x-socioly-poll` or `Authorization: Bearer`) |
| `BOOSTING_WEBHOOK_URL` | Optional; JSON POST when an order moves to paid / processing after Ziina **completed** |
| `PAYMENT_PENDING_TTL_HOURS` | Optional; default `24` — stale pending rows marked **failed** by the poller |
| `PUBLIC_SITE_URL` | Site origin for success/cancel URLs (no trailing slash) |
| `ZIINA_API_BASE` | Optional; default `https://api-v2.ziina.com/api` |
| `ZIINA_TEST` | Optional; `true` → Ziina creates a **test** Payment Intent (any card / expiry / CVV; no charge) |

**Hosted Supabase:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and **`SUPABASE_SERVICE_ROLE_KEY`** are **injected** for Edge Functions. The CLI **skips** `supabase secrets set` for names starting with `SUPABASE_`, so do not try to set the service role that way — see [`EDGE_FUNCTIONS.md`](EDGE_FUNCTIONS.md).

## Register the webhook with Ziina (optional)

If you want redundant updates alongside polling, use Ziina’s API (token needs `write_webhooks` scope): `POST /webhook` with body:

```json
{
  "url": "https://<project-ref>.supabase.co/functions/v1/webhook-handler",
  "secret": "<same value as ZIINA_WEBHOOK_SECRET>"
}
```

See [Ziina webhooks](https://docs.ziina.com/api-reference/webhook/index).

## Frontend

`VITE_DEV_LOCAL_CHECKOUT=true` bypasses Ziina for **local DB demos only**. **Production** should use real Ziina + deployed functions only.
