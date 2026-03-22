# Socioly — Full website documentation

This document describes the **Socioly** web app (repo title: *Social Spark Growth*): what it does, how pages fit together, backend integration, and how to run and deploy it.

---

## 1. Product overview

Socioly is a **marketing + order** site for **social media growth packages** (Instagram, Facebook, TikTok). Visitors browse plans on the home page, place orders with a profile URL (in-app submit → **pending** order + **tracking ID**), and **track** order status. Logged-in users get a **dashboard** with order history, a **referral link**, and **reward codes**. **Admins** manage orders, profiles, referrals, and rewards in an internal **Admin** console.

---

## 2. Technology stack

| Layer | Choice |
|--------|--------|
| UI | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui, Radix primitives |
| Routing | React Router v6 |
| Data / auth | Supabase (Postgres, Row Level Security, Auth) |
| Serverless | Optional Supabase Edge Functions (none required for checkout) |
| Hosting (example) | Netlify (static `dist/`, `bun run build`) |

---

## 3. Site map and routes

Global chrome: **Navbar**, **Footer**, **WhatsApp** floating button, **sticky growth CTA**, **ReferralCapture** (`?ref=` handling), **ScrollToHash** (in-page anchors).

| Path | Page | Purpose |
|------|------|---------|
| `/` | Home (`Index`) | Marketing + packages grid |
| `/order` | Order | Select package (or preselected), enter profile URL, review & submit |
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

- User must be **signed in** to submit; unauthenticated users are redirected to `/auth` with `next` preserved.  
- **Package** can come from the catalog (`package_id` query param) or user selection.  
- Collects **profile link** and **email**.  
- **Submit:** authenticated client **inserts** into `orders` (`status: pending`, `tracking_id`, `idempotency_key`) then navigates to **`/track?id=…`**.  
- **Billing / payment** is out of scope for this repo — coordinate via WhatsApp, invoice, or a gateway you add later.

---

## 6. Track order (`/track`)

- Public lookup by **tracking ID** via RPC `get_order_by_tracking` — returns **status, progress, created_at** only (no profile link or amount).  
- Tracking IDs use the `SL-…` format generated on submit; they must match a row in `orders.tracking_id`.

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
  - 1 referral → `FREE1000` (1,000 likes)
  - 3 → `FREE3000` (3,000 likes)
  - 5 → `FREE5000` (5,000 likes)
  - 10 → `FREE10000` (10,000 likes)

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
3. **Referral rewards** when friends order are **not** auto-wired in this repo; milestone copy in the dashboard uses `REWARD_MILESTONES` in `src/lib/rewardMilestones.ts`. Implement recording in Admin, SQL, or your own backend as needed.

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

None are shipped for payments. See [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) if you add functions later.

---

## 13. Environment variables

### Vite (browser — embedded at build time)

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key |
| `VITE_SITE_URL` | Recommended (production) | Canonical HTTPS origin for auth email redirects |

### Local / CI helpers (not bundled unless `VITE_` prefixed)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_DB_PASSWORD` | Optional; some CLI operations |

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
- Lint: `npm run lint`  
- Tests: `npm run test`  
- Production build: `npm run build` / `npm run preview`

---

## 15. Deployment (Netlify example)

- **Build:** `bun run build` (see `netlify.toml`)  
- **Publish:** `dist/`  
- Set **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** in Netlify environment.  
- **Secrets scan:** `SECRETS_SCAN_OMIT_KEYS` includes the two `VITE_SUPABASE_*` keys because Vite inlines them by design; the anon key is public and protected by RLS.  
- Do **not** set `SUPABASE_SERVICE_ROLE_KEY` as `VITE_*` — it must never ship in the browser bundle.

---

## 16. Project structure (reference)

```
src/
  App.tsx                 # Routes + global providers
  main.tsx, index.css
  components/             # Shared UI, home sections, modals, referral, etc.
  hooks/                  # useAuth, usePackages
  lib/                    # supabaseClient, store, referralStorage, rewardMilestones
  pages/                  # Index, Order, Track, Auth, Dashboard, Admin, policies, NotFound (no payment return URLs)
  types/database.ts
public/                   # Static assets
supabase/
  migrations/
  seed/
docs/
  WEBSITE.md              # This file
  EDGE_FUNCTIONS.md
netlify.toml
```

---

## 17. Troubleshooting

| Symptom | Likely cause | Action |
|---------|----------------|--------|
| Packages empty / load error | Migrations or `api_grants` missing; no seed | Run migrations + seed; see README |
| Order submit fails (RLS / insert) | Policies or grants missing | Re-run migrations including `orders` insert grants |
| Admin shows “Admin only” | No `role` in app metadata | Set `raw_app_meta_data.role = "admin"`, refresh session |
| Netlify build fails on secrets scan | Scanner sees `VITE_*` in `dist` | `netlify.toml` omit keys (already in repo) |
| Referral not attaching | Invalid code, self-referral, or already referred | Check RPC + profile `referred_by` |

---

## 18. Related documentation

- [SYSTEM_FULL_A_TO_Z.md](./SYSTEM_FULL_A_TO_Z.md) — end-to-end flows, auth/session pitfalls, RLS vs Edge Functions, known gaps (architecture review)  
- [ARCHITECTURE.md](./ARCHITECTURE.md) — full architecture, flows, UX/SEO roadmap (polished)  
- [README.md](../README.md) — quick start and Supabase checklist  
- [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) — Edge Functions note  
- [supabase/README.md](../supabase/README.md) — CLI, link, seed  

---

*Last updated to match the repository layout and routes as of the documented commit. If behavior drifts, prefer source files under `src/` and `supabase/` as the source of truth.*
