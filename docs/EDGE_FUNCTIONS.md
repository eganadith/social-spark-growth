# Deploy Edge Functions (fix “Failed to send a request to the Edge Function”)

That error means the browser called  
`https://<project-ref>.supabase.co/functions/v1/create-payment`  
and got **no response** — almost always because **`create-payment` is not deployed** to the same Supabase project as `VITE_SUPABASE_URL`.

## 1. Link the CLI to your project

```bash
npx supabase login
npx supabase link --project-ref YOUR_20_CHAR_REF
```

(`YOUR_20_CHAR_REF` = subdomain of `VITE_SUPABASE_URL`, or Dashboard → Project Settings → General → Reference ID.)

## 2. Set secrets (required for Ziina checkout)

```bash
npx supabase secrets set \
  SUPABASE_SERVICE_ROLE_KEY="paste-service-role-key" \
  PUBLIC_SITE_URL="http://localhost:5173" \
  ZIINA_API_KEY="paste-ziina-bearer-token"
```

Use your **production** `PUBLIC_SITE_URL` when you deploy the site (no trailing slash).

For webhooks, also set `ZIINA_WEBHOOK_SECRET` and register the webhook (see [`ZIINA.md`](ZIINA.md)).

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
