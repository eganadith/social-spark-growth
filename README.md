# Social Lanka — Social Spark Growth

Vite + React + TypeScript + shadcn/ui + Supabase (Postgres, Auth).

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

Orders are created directly from the app (pending row + tracking ID). Add your own billing or fulfillment workflow outside this repo if needed.
