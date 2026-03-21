# Supabase CLI: link & seed

## Why `npm run db:seed` says “Cannot find project ref”

The CLI must be **linked** to your cloud project first. Link only works if you pass the correct **Reference ID**.

### 1. Copy the Reference ID (20 characters)

1. Open [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.
3. **Project Settings** (gear) → **General**.
4. Under **Reference ID**, copy the value. It looks like `abcdefghijklmnop` (20 letters/numbers only).
5. Do **not** use:
   - The project **name**
   - The full **URL** (`https://xxx.supabase.co`)
   - The placeholder `your-project-ref`

### 2. Link, then seed

**Easiest:** put `VITE_SUPABASE_URL=https://YOUR_REF.supabase.co` in `.env` (same as the app), then:

```bash
npx supabase login
npm run db:seed
```

`npm run db:seed` runs `scripts/supabase-seed-packages.mjs`, which reads the **subdomain** from `VITE_SUPABASE_URL` as the project ref and calls `supabase link` + the seed query.

**Manual link** (if you prefer):

```bash
npx supabase login
npx supabase link --project-ref PASTE_YOUR_20_CHAR_REFERENCE_ID_HERE
npx supabase db query --file supabase/seed/seed_packages.sql --linked
```

If `link` prints **Invalid project ref format**, your ref is wrong — it must be exactly the **Reference ID** (or the subdomain of `VITE_SUPABASE_URL`: `https://<ref>.supabase.co`).

If the CLI asks for a **database password**, add `SUPABASE_DB_PASSWORD` to `.env` (from **Project Settings → Database**) and run `npm run db:seed` again.

### 3. Migrations before seed

`packages` must exist. Run the SQL in `migrations/20250321120000_initial_schema.sql` (and `20250321120001_…`) in the Dashboard **SQL Editor** first, or use `supabase db push` after link.
