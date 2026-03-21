# Social Lanka — Social Spark Growth

Vite + React + TypeScript + shadcn/ui + Supabase (Postgres, Auth, Edge Functions) + Ziina-ready payments.

## Quick start

```bash
npm install
cp .env.example .env
# Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase project
npm run dev
```

## Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run SQL migrations **in order** from [`supabase/migrations/`](supabase/migrations/) (SQL Editor or `supabase db push`). Include `20250321130000_api_grants.sql` so the API can `select` on `packages` (fixes “could not load packages” when only RLS exists).
3. **Packages empty?** Run the seed from [`supabase/seed/seed_packages.sql`](supabase/seed/seed_packages.sql):
   - **CLI (linked cloud project):** `npx supabase login` → `npx supabase link --project-ref <REF>` → **`npm run db:seed`**.  
     Use the **20-character Reference ID** from Dashboard → **Project Settings** → **General** (not the project name or URL). If seed fails with “Cannot find project ref”, see [`supabase/README.md`](supabase/README.md).
   - **CLI (local `supabase start`):** **`npm run db:seed:local`**
   - **Dashboard:** paste the file into **SQL Editor** and run (idempotent).
4. Enable **Email** auth (or add other providers) under Authentication → Providers.
5. **Edge Functions + Ziina** — follow [`docs/EDGE_FUNCTIONS.md`](docs/EDGE_FUNCTIONS.md): `npx supabase link`, `npx supabase secrets set` (`SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_SITE_URL`, `ZIINA_API_KEY`, optional `ZIINA_WEBHOOK_SECRET`, `ZIINA_TEST`), then **`npm run functions:deploy`**.  
   If the app says **“Failed to send a request to the Edge Function”**, this step was skipped or `.env` points at a different project.
6. Register Ziina’s webhook to **`webhook-handler`** (see [`docs/ZIINA.md`](docs/ZIINA.md)). JWT verification is off in [`supabase/config.toml`](supabase/config.toml).

### Admin users

In Supabase Dashboard → Authentication → Users → select user → **Raw App Meta Data**:

```json
{ "role": "admin" }
```

### Referral links

Share `https://your-domain/?ref=REFERRAL_CODE`. Codes are generated per profile on signup.

## Project structure

- [`src/pages/`](src/pages/) — Home, Order, Track, Auth, Dashboard, Admin, policies
- [`src/hooks/useAuth.ts`](src/hooks/useAuth.ts) — session + pending `?ref=` application via RPC
- [`src/hooks/usePackages.ts`](src/hooks/usePackages.ts) — packages from `packages` table
- [`supabase/functions/`](supabase/functions/) — payment creation + webhook (referrals & rewards)

## Payments (Ziina)

Production checkout uses **Ziina’s hosted payment page** (Payment Intent API). Details: [`docs/ZIINA.md`](docs/ZIINA.md).

### “Payment could not start”

Deploy **`create-payment`**, set **`ZIINA_API_KEY`**, and ensure **`PUBLIC_SITE_URL`** matches your app. For local UI-only testing without Ziina, you can set **`VITE_DEV_LOCAL_CHECKOUT=true`** in `.env` (pending order only — **not** for production).
