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
5. **Auth URLs (fixes confirmation links going to localhost):** In **Authentication → URL Configuration**, set **Site URL** to your live app (e.g. `https://your-app.netlify.app`), not `http://localhost:5173`. Under **Redirect URLs**, add `https://your-app.netlify.app/**` and `http://localhost:5173/**` for local dev. On Netlify, set **`VITE_SITE_URL`** to the same HTTPS origin (see [`.env.example`](.env.example)) so signup emails use that host.
6. **Custom “From” address / SMTP:** Emails are sent by Supabase until you add **Project Settings → Auth → SMTP** (custom SMTP provider). Edit copy under **Authentication → Email Templates**.
7. **Edge Functions + Ziina** — follow [`docs/EDGE_FUNCTIONS.md`](docs/EDGE_FUNCTIONS.md): `npx supabase link`, `npx supabase secrets set` (`SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_SITE_URL`, `ZIINA_API_KEY`, optional `ZIINA_WEBHOOK_SECRET`, `ZIINA_TEST`), then **`npm run functions:deploy`**.  
   If the app says **“Failed to send a request to the Edge Function”**, this step was skipped or `.env` points at a different project.
8. Register Ziina’s webhook to **`webhook-handler`** (see [`docs/ZIINA.md`](docs/ZIINA.md)). JWT verification is off in [`supabase/config.toml`](supabase/config.toml).

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

### “Payment could not start” / “Failed to send a request to the Edge Function”

The browser must reach **`/functions/v1/create-payment`** on the **same** Supabase project as **`VITE_SUPABASE_URL`**. From the repo root:

```bash
npx supabase login
npx supabase link --project-ref YOUR_20_CHAR_REF   # real 20-char ref from Dashboard (not the placeholder text)
npx supabase secrets set PUBLIC_SITE_URL="https://your-site.com" ZIINA_API_KEY="…"
npm run functions:deploy
```

(`SUPABASE_SERVICE_ROLE_KEY` is **injected by Supabase** on hosted functions — do not set it via `secrets set`; the CLI ignores names starting with `SUPABASE_`.)

See [`docs/EDGE_FUNCTIONS.md`](docs/EDGE_FUNCTIONS.md). **Local Ziina:** leave mock unset; set Edge secret **`PUBLIC_SITE_URL=http://localhost:5173`** (or your Vite port) while testing. For **DB-only** demos without payment, use **`VITE_MOCK_CHECKOUT=true`** in `.env` (dev only, never production).
