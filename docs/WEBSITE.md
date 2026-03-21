# Socioly — Full website documentation

This document describes the **Socioly** web app (repo title: *Social Spark Growth*): what it does, how pages fit together, backend integration, and how to run and deploy it.

---

## 1. Product overview

Socioly is a **marketing + checkout** site for **social media growth packages** (Instagram, Facebook, TikTok). Visitors browse plans on the home page, place orders with a profile URL, pay via **Ziina** (hosted checkout), and **track** order status. Logged-in users get a **dashboard** with order history, a **referral link**, and **reward codes** earned from referrals. **Admins** manage orders, profiles, referrals, and rewards in an internal **Admin** console.

---

## 2. Technology stack

| Layer | Choice |
|--------|--------|
| UI | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui, Radix primitives |
| Routing | React Router v6 |
| Data / auth | Supabase (Postgres, Row Level Security, Auth) |
| Serverless | Supabase Edge Functions (Deno) |
| Payments | Ziina Payment Intents + webhook |
| Hosting (example) | Netlify (static `dist/`, `bun run build`) |

---

## 3. Site map and routes

Global chrome: **Navbar**, **Footer**, **WhatsApp** floating button, **sticky growth CTA**, **ReferralCapture** (`?ref=` handling), **ScrollToHash** (in-page anchors).

| Path | Page | Purpose |
|------|------|---------|
| `/` | Home (`Index`) | Marketing + packages grid |
| `/order` | Order | Select package (or preselected), enter profile URL, checkout |
| `/track` | Track | Look up order by tracking ID |
| `/auth` | Auth | Sign in / sign up (`?next=` redirect; `socioly_next` in localStorage preserves checkout return) |
| `/check-email` | Check email | After signup when confirmation required — resume link to sign-in with `?next=` |
| `/dashboard` | Dashboard | Orders, referral link, rewards (auth required) |
| `/admin` | Admin | Orders, users, referrals, rewards (auth + `app_metadata.role === "admin"`) |
| `/terms` | Terms | Legal |
| `/privacy` | Privacy | Legal |
| `/refund` | Refund policy | Legal |
| `/delivery` | Delivery policy | Legal |
| `*` | NotFound | 404 |

**Navbar links (signed-in):** Home, Packages (`/#packages`), Track Order, Dashboard. **If admin:** Admin.

---

## 4. Home page (`/`) — sections (top to bottom)

1. **HeroSection** — headline, primary CTA toward packages / order flow  
2. **TrustStripSection** — trust signals  
3. **PackagesSection** — loads **`packages`** from Supabase via `usePackages`; links to `/order`  
4. **HowItWorks** — steps explainer  
5. **WhyChooseUs** — value props  
6. **Testimonials** — social proof  
7. **AffiliatePromoSection** — referral program promo; CTA to `/auth?next=/dashboard`  
8. **FAQSection** — FAQs  

Assets live under `public/Images/` where referenced.

---

## 5. Order flow (`/order`)

- User must be **signed in** for full checkout; unauthenticated users are redirected to `/auth` with `next` preserved.  
- **Package** can come from the catalog (`package_id` query param) or user selection.  
- Collects **profile link** (and optional email where the form requires it).  
- **Production:** calls Edge Function **`create-payment`** with `package_id`, `profile_link`, `email`. Function creates/updates the order and returns a **Ziina checkout URL**; browser redirects there.  
- **Dev shortcut:** if `VITE_DEV_LOCAL_CHECKOUT=true`, the app skips the Edge Function and creates a **pending** order only (no real payment) — **not for production**.  
- Errors such as “Failed to send a request to the Edge Function” usually mean **`create-payment` is not deployed** or env points at the wrong Supabase project. See [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md).

---

## 6. Track order (`/track`)

- Public lookup by **tracking ID** via RPC `get_order_by_tracking` — returns **status, progress, created_at** only (no profile link or amount).  
- New checkouts use a **UUID** tracking id; older `SL-…` ids still resolve if present in the database.

---

## 7. Authentication (`/auth`)

- **Email + password** via Supabase Auth (`signInWithPassword` / `signUp`).  
- Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.  
- After signup, email confirmation may be required depending on Supabase project settings.  
- **`useAuth`** (`src/hooks/useAuth.ts`) holds session state and, on login, applies a pending **`?ref=`** referral code via RPC `get_profile_id_by_referral_code` and profile update when appropriate (`src/lib/referralStorage.ts`).

---

## 8. Dashboard (`/dashboard`)

For the signed-in user:

- **Orders** — list with status, progress, amount, package summary  
- **Referral** — share URL: `{origin}/?ref={referral_code}`  
- **Referral count** — rows in `referrals` where user is referrer  
- **Rewards** — `rewards` table; milestones explained in UI via `REWARD_MILESTONES` in `src/lib/rewardMilestones.ts` (mirrors server logic):  
  - 1 referral → `FREE100` (100 likes)  
  - 3 → `FREE500`  
  - 5 → `FREE1000`  
  - 10 → `FREE2500`  

Reward detail uses **RewardModal**.

---

## 9. Admin (`/admin`)

- **Gate:** `user.app_metadata.role === "admin"` (JWT claim from Supabase `raw_app_meta_data`).  
- Non-admins see instructions to set `role` in app metadata (or use SQL / Admin API as in project README).  
- **Data:** reads `orders`, `profiles`, `rewards`, `referrals` (with joins/selects as implemented in `AdminPage.tsx`).  
- Can update **order status** (and derived **progress**) and toggle **reward used** flag.  
- **Orders table:** shows **profile link** (opens in a new tab), **ordered at** (`created_at`), and a **live 72h SLA countdown** from `created_at`; the countdown shows **Completed** when the order status is **completed** or when 72 hours have elapsed (display-only, not enforced server-side).

**Important:** The **service role key** must never be exposed in the Vite app; admin actions use the **user’s JWT** and rely on **RLS** (and/or policies) allowing admin operations — verify migrations match your security model.

---

## 10. Referrals and rewards (conceptual)

1. Each **profile** has a **`referral_code`**.  
2. New visitors land with **`?ref=CODE`**; `ReferralCapture` stores the code; after signup/login, `useAuth` links **`referred_by`** when valid.  
3. When a referred user **pays** (webhook flow), the backend can record referrals and unlock **rewards** per thresholds in `supabase/functions/_shared/rewards.ts` (aligned with `REWARD_MILESTONES` on the client).

Details of payment ↔ webhook ↔ DB updates: see **`webhook-handler`** and [ZIINA.md](./ZIINA.md).

---

## 11. Data model (high level)

Defined in Postgres migrations under `supabase/migrations/` (run **in filename order**):

| File | Role |
|------|------|
| `20250321120000_initial_schema.sql` | Core tables: `profiles`, `packages`, `orders`, `referrals`, `rewards`, RLS, triggers |
| `20250321120001_referral_lookup_rpc.sql` | `get_profile_id_by_referral_code` RPC |
| `20250321130000_api_grants.sql` | API usage grants (e.g. `packages` readable where needed) |
| `20250321130100_orders_profiles_grants.sql` | Additional grants for orders/profiles |
| `20250321140000_socioly_package_catalog.sql` | Package catalog constraints / setup |

TypeScript types for app usage: `src/types/database.ts` (`DbPackage`, `DbOrderRow`, `OrderStatus`, `DbProfile`, `DbReward`, etc.).

**Order statuses:** `pending` → `paid` → `processing` → `completed` (with progress percentages used in UI and admin).

**Seed data:** `supabase/seed/seed_packages.sql`; helper script `npm run db:seed` / `npm run db:seed:local` — see [supabase/README.md](../supabase/README.md).

---

## 12. Edge Functions

| Function | Role |
|----------|------|
| **`create-payment`** | Authenticated POST: validates user, loads package price, creates order / payment intent, returns Ziina checkout URL |
| **`webhook-handler`** | POST from Ziina: verifies signature, updates order status, referral/reward logic |

Shared code: `supabase/functions/_shared/` (`ziina.ts`, `supabase.ts`, `rewards.ts`).

**Secrets** (set in Supabase, not in the repo): `SUPABASE_SERVICE_ROLE_KEY`, `ZIINA_API_KEY`, `PUBLIC_SITE_URL`, optional `ZIINA_WEBHOOK_SECRET`, `ZIINA_TEST`, `ZIINA_API_BASE`.  

Deploy: `npm run functions:deploy` after `supabase link`. Full checklist: [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md).

---

## 13. Environment variables

### Vite (browser — embedded at build time)

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key |
| `VITE_DEV_LOCAL_CHECKOUT` | No | `true` = dev-only pending order without Edge Function |

### Local / CI helpers (not bundled unless `VITE_` prefixed)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_DB_PASSWORD` | Optional; some CLI operations |

### Supabase Edge Functions (Dashboard or `supabase secrets set`)

| Secret | Purpose |
|--------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client inside functions |
| `ZIINA_API_KEY` | Ziina API |
| `PUBLIC_SITE_URL` | Redirects / success URLs (no trailing slash) |
| `ZIINA_WEBHOOK_SECRET` | Webhook HMAC verification |
| `ZIINA_TEST` | Optional sandbox-style behavior |
| `ZIINA_API_BASE` | Optional API override |

Template: [.env.example](../.env.example).

---

## 14. Local development

```bash
npm install
cp .env.example .env
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

- Apply migrations and seed as in [README.md](../README.md).  
- For payment UI without deploying functions: `VITE_DEV_LOCAL_CHECKOUT=true` (local only).  
- Lint: `npm run lint`  
- Tests: `npm run test`  
- Production build: `npm run build` / `npm run preview`

---

## 15. Deployment (Netlify example)

- **Build:** `bun run build` (see `netlify.toml`)  
- **Publish:** `dist/`  
- Set **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** in Netlify environment.  
- **Secrets scan:** `SECRETS_SCAN_OMIT_KEYS` includes the two `VITE_SUPABASE_*` keys because Vite inlines them by design; the anon key is public and protected by RLS.  
- Do **not** set `SUPABASE_SERVICE_ROLE_KEY` or `ZIINA_API_KEY` as `VITE_*` — they belong only on Supabase Edge Functions (or a real backend).

---

## 16. Project structure (reference)

```
src/
  App.tsx                 # Routes + global providers
  main.tsx, index.css
  components/             # Shared UI, home sections, modals, referral, etc.
  hooks/                  # useAuth, usePackages
  lib/                    # supabaseClient, store, referralStorage, rewardMilestones
  pages/                  # Index, Order, Track, Auth, Dashboard, Admin, policies, NotFound
  types/database.ts
public/                   # Static assets
supabase/
  migrations/
  seed/
  functions/
docs/
  WEBSITE.md              # This file
  EDGE_FUNCTIONS.md
  ZIINA.md
netlify.toml
```

---

## 17. Troubleshooting

| Symptom | Likely cause | Action |
|---------|----------------|--------|
| Packages empty / load error | Migrations or `api_grants` missing; no seed | Run migrations + seed; see README |
| Payment could not start / Edge Function error | `create-payment` not deployed or wrong project | [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) |
| Admin shows “Admin only” | No `role` in app metadata | Set `raw_app_meta_data.role = "admin"`, refresh session |
| Netlify build fails on secrets scan | Scanner sees `VITE_*` in `dist` | `netlify.toml` omit keys (already in repo) |
| Referral not attaching | Invalid code, self-referral, or already referred | Check RPC + profile `referred_by` |

---

## 18. Related documentation

- [SYSTEM_FULL_A_TO_Z.md](./SYSTEM_FULL_A_TO_Z.md) — end-to-end flows, auth/session pitfalls, RLS vs Edge Functions, known gaps (architecture review)  
- [ARCHITECTURE.md](./ARCHITECTURE.md) — full architecture, flows, UX/SEO roadmap (polished)  
- [README.md](../README.md) — quick start and Supabase checklist  
- [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) — deploy functions and secrets  
- [ZIINA.md](./ZIINA.md) — payment provider and webhook  
- [supabase/README.md](../supabase/README.md) — CLI, link, seed  

---

*Last updated to match the repository layout and routes as of the documented commit. If behavior drifts, prefer source files under `src/` and `supabase/` as the source of truth.*
