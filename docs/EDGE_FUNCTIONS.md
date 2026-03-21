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

**Production:** `webhook-handler` **refuses all requests** if `ZIINA_WEBHOOK_SECRET` is missing — set it and register the webhook (see [`ZIINA.md`](ZIINA.md)). Local experiments still need a secret value for the function to accept POSTs.

Optional for Ziina sandbox:

```bash
npx supabase secrets set ZIINA_TEST=true
```

## 3. Deploy both functions

From the repo root:

```bash
npm run functions:deploy
```

Or manually:

```bash
npx supabase functions deploy create-payment
npx supabase functions deploy webhook-handler
```

## 4. Confirm in the Dashboard

**Supabase Dashboard → Edge Functions** — you should see **`create-payment`** and **`webhook-handler`**.  
Invoke **create-payment** once from the app; if it still fails, open **Edge Functions → create-payment → Logs** for errors.

## 5. `.env` must match the same project

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must be from the **same** project where you deployed the functions.

---

**Local dev without deploying:** set `VITE_DEV_LOCAL_CHECKOUT=true` in `.env` (pending order only — not Ziina). See [README](../README.md).
