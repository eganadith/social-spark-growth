# Deploy Edge Functions (fix “Failed to send a request to the Edge Function”)

That error means the browser called  
`https://<project-ref>.supabase.co/functions/v1/create-payment`  
and got **no response** — almost always because **`create-payment` is not deployed** to the same Supabase project as `VITE_SUPABASE_URL`.

## 1. Link the CLI to your project

```bash
npx supabase login
npx supabase link --project-ref abcdefghijklmnop
```

Replace `abcdefghijklmnop` with your real **20-character Reference ID** (Dashboard → Project Settings → General).  
Do **not** leave the literal `YOUR_20_CHAR_REF` from examples.

## 2. Set secrets (required for Ziina checkout)

Hosted Edge Functions **already receive** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and **`SUPABASE_SERVICE_ROLE_KEY`** from Supabase — the CLI **will skip** any secret whose name starts with `SUPABASE_`, so **do not** pass `SUPABASE_SERVICE_ROLE_KEY` in `secrets set`.

Set only what the app adds on top:

```bash
npx supabase secrets set \
  PUBLIC_SITE_URL="https://your-site.netlify.app" \
  ZIINA_API_KEY="paste-ziina-bearer-token"
```

`PUBLIC_SITE_URL` must include **`https://`** and have **no trailing slash** (e.g. `https://lovely-belekoy-6e5306.netlify.app`).

**Webhooks (optional):** If you use **`webhook-handler`**, set **`ZIINA_WEBHOOK_SECRET`** and register the URL in Ziina (see [`ZIINA.md`](ZIINA.md)). For a **webhook-free** stack, use **`PAYMENTS_POLL_SECRET`** + **`poll-pending-payments`** instead.

Optional for Ziina sandbox:

```bash
npx supabase secrets set ZIINA_TEST=true
```

### Polling (production, webhook-free path)

Set a strong random secret and call **`poll-pending-payments`** on a schedule (Supabase **pg_cron** is often minute-level; for ~20s intervals use an external scheduler or GitHub Actions hitting your function URL):

```bash
npx supabase secrets set PAYMENTS_POLL_SECRET="$(openssl rand -hex 24)"
```

Invoke (example):

`POST https://<project-ref>.supabase.co/functions/v1/poll-pending-payments` with header **`x-socioly-poll: <PAYMENTS_POLL_SECRET>`** (or **`Authorization: Bearer <secret>`**).

## 3. Deploy Edge Functions

From the repo root:

```bash
npm run functions:deploy
```

Or manually:

```bash
npx supabase functions deploy create-payment
npx supabase functions deploy webhook-handler
npx supabase functions deploy poll-pending-payments
npx supabase functions deploy check-payment-once
```

## 4. Confirm in the Dashboard

**Supabase Dashboard → Edge Functions** — you should see **`create-payment`**, **`webhook-handler`**, **`poll-pending-payments`**, and **`check-payment-once`**.  
Invoke **create-payment** once from the app; if it still fails, open **Edge Functions → create-payment → Logs** for errors.

## 5. `.env` must match the same project

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must be from the **same** project where you deployed the functions.

---

**Local dev without deploying:** set `VITE_DEV_LOCAL_CHECKOUT=true` in `.env` (pending order only — not Ziina). See [README](../README.md).
