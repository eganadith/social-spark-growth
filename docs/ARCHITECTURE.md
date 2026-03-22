# Socioly — Full architecture, flows & UX roadmap

Conceptual architecture for the **Socioly** app (frontend, Supabase backend, referrals). Sections marked **Current** reflect the repository today; **Roadmap** items are recommendations or partial implementations.

---

## 1. Frontend (React 18 + Vite + TypeScript)

### Global chrome

| Piece | Role | Status |
|--------|------|--------|
| **Navbar** | Brand (`BrandLogo` → `public/logo.png`), nav links, sign in/out, “Get Started” | **Current** — responsive + hamburger. **Roadmap:** active-route styling (e.g. `NavLink` with `aria-current`); today links use `Link` without active highlight. |
| **Footer** | Brand, services → `/#packages`, company & policy links | **Current**. **Roadmap:** optional contact block, social icons, explicit trust badges row. |
| **WhatsAppButton** | Fixed FAB → prefilled “Hi Socioly…” message | **Current** |
| **StickyGrowthCta** | Mobile-first sticky CTA | **Current** |
| **ScrollToHash** | Smooth scroll to in-page anchors (e.g. `#packages`) | **Current** |
| **Toaster + Sonner** | Global toasts for success/errors | **Current** (shadcn/ui — not Toastify) |
| **ReferralCapture** | Normalizes URL when `?ref=` present | **Current** |
| **TooltipProvider** | Radix tooltips app-wide | **Current** |

### Pages & flows

#### Home (`/`)

| Block | Purpose | Status |
|--------|---------|--------|
| **HeroSection** | Headline, trust chips, CTA → packages | **Current** |
| **TrustStripSection** | Social proof / guarantees | **Current** |
| **PackagesSection** | Catalog from Supabase (`usePackages` + `PackageCard`) | **Current** |
| **HowItWorks** | Step-by-step (component file: `HowItWorks.tsx`) | **Current** |
| **WhyChooseUs** | Benefits + icons | **Current** |
| **Testimonials** | Social proof copy | **Current**. **Roadmap:** carousel, avatars, “verified” screenshots. |
| **AffiliatePromoSection** | Referral program + CTA → auth | **Current** |
| **FAQSection** | Accordion (incl. safety / quality FAQs) | **Current** |

#### Order (`/order`)

- **Current:** Platform + package selection, `package_id` / legacy `pkg` preselection from query string, **profile URL** validated via `validateSocialUrl` (`src/lib/store.ts`), **email** required, auth gate → `/auth?next=…`, step 2 review + terms, **insert pending `orders` row** with `idempotency_key` and redirect to `/track?id=…`, toasts on errors.
- **Roadmap:** stronger idempotency on double-submit (UI debounce + server-side “single open order per user/package” policy if product requires it). Optional inline field-level errors beyond current validation messaging.

#### Track (`/track`)

- **Current:** Lookup by **tracking id** (and related UI); status + progress display; not-found handling.
- **Roadmap:** copy for “expired” vs “invalid” if you add TTL rules later.

#### Auth (`/auth`)

- **Current:** Sign in / sign up tabs, `?next=` preserved, Supabase email+password, `useAuth` applies pending `?ref=` after login via RPC + profile update.
- **Roadmap:** password strength hints; clearer copy for email-confirmation state.

#### Dashboard (`/dashboard`)

- **Current:** Orders list, **referral share URL** + copy button, rewards list, **RewardModal** for reward detail, referral count, responsive layout.
- **Roadmap:** **QR code** for referral link; skeleton loaders; richer empty states; optional “reward unlocked” toast on realtime events.

#### Admin (`/admin`)

- **Current:** Gate: `app_metadata.role === "admin"`; sections for **Orders**, **Referrals**, **Profiles**, **Rewards**; status dropdown on orders; toggle reward used; refresh button; scrollable tables.
- **Roadmap:** **search, filters, pagination** for large datasets; export CSV; audit log.

#### Legal

- **Current:** `/terms`, `/privacy`, `/refund`, `/delivery`, **NotFound** for unknown routes.

---

## 2. Backend (Supabase)

### Tables (Postgres + RLS)

| Table | Purpose |
|--------|---------|
| **profiles** | One row per auth user: `referral_code`, `referred_by`, etc. |
| **packages** | Catalog (platform, followers tier, price, flags) |
| **orders** | Purchase: package, profile link, status, progress, optional `payment_id` (legacy column), `tracking_id` |
| **referrals** | Referrer ↔ referred user, optional `order_id`, `reward_unlocked` |
| **rewards** | Milestone rewards (`code`, `is_used`, …) |

Migrations live in `supabase/migrations/` (run in order). Types: `src/types/database.ts`.

**Security model**

- **RLS** on user-facing tables (see migrations).
- **Anon key** in the browser; admin UI actions run as the logged-in user subject to policies.

No Edge Functions are required for the default order flow.

---

## 3. Referral & rewards flow

```
Visitor (?ref=CODE)
    → ReferralCapture stores code
    → Sign up / Sign in
    → useAuth links referred_by (RPC + profile update when valid)

Order placed (pending)
    → Admin / ops updates `orders.status` when appropriate
    → Referral milestone UI uses `src/lib/rewardMilestones.ts` (tiers); reward rows may be created manually or by future automation

Dashboard
    → Share link, rewards, milestones (FREE1000 … FREE10000)
```

Self-referral and duplicate handling are enforced in app/auth logic where implemented; extend in DB policies if you tighten further.

---

## 4. Local development & deployment

| Layer | Config |
|--------|--------|
| **Frontend** | `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; optional `VITE_SITE_URL` for email redirects |
| **Static host** | e.g. Netlify: build `dist/`, set `VITE_*`; see `netlify.toml` for secrets-scan omit on inlined public keys |
| **Database** | Apply migrations; seed packages (`supabase/seed`, `npm run db:seed`) |

**Roadmap:** CI job that runs migrations on a protected branch or documents manual `db push` for production.

---

## 5. Human touch, UX, SEO & quality (guide + roadmap)

### A. UX & trust

- **Copy:** Prefer short, confident lines (e.g. growth in hours/days, “no password”, “real engagement”) — tune in `HeroSection`, `FAQSection`, `PackagesSection`.
- **Errors:** Toasts today; **Roadmap:** inline validation messages on Order fields.
- **Trust:** HTTPS via host; policies in footer; WhatsApp CTA; **Roadmap:** badge row, testimonial media, structured reviews.
- **Mobile:** Sticky CTA + hamburger + full-width buttons — **Current** patterns; **Roadmap:** table “card” layout on very small screens for Admin/Dashboard.

### B. SEO & performance

**Suggested meta (apply in `index.html` or templated build):**

- `<title>` e.g. `Social Media Growth Packages | Socioly`
- `<meta name="description">` — one line, benefit-led
- Open Graph / Twitter cards — **Current:** `/logo.png`; **Roadmap:** absolute canonical URL for `og:image` in production

**Roadmap**

- **JSON-LD** (`Product` / `Organization` / `FAQPage`) for rich results
- Lazy-load below-fold images (`loading="lazy"`, explicit `width`/`height` or aspect-ratio)
- Analytics (GA4 / GTM) for CTA, begin order, referral attribution
- Error monitoring (Sentry, LogRocket, etc.)

### C. Validations & feedback

| Area | Current | Roadmap |
|------|---------|---------|
| Profile URL | `validateSocialUrl` vs selected platform | Stricter platform-specific patterns, copy-paste normalize |
| Email | Required on order flow when proceeding | Optional verify, Mailcheck-style hints |
| Orders | Loading state + toasts | Idempotent server contract, optimistic UI |
| Dashboard / Admin | Loading text | Skeletons, empty-state illustrations + CTAs |

---

## 6. Related docs

| Doc | Content |
|-----|---------|
| [SYSTEM_FULL_A_TO_Z.md](./SYSTEM_FULL_A_TO_Z.md) | Full A–Z: auth, RLS, known loopholes (architecture validation) |
| [WEBSITE.md](./WEBSITE.md) | Site map, env tables, troubleshooting |
| [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) | Edge Functions note (none required by default) |
| [README.md](../README.md) | Quick start, admin role, referrals |

---

*This document is the polished architecture + UX/SEO target. Treat the **Current** column as the source of truth for what ships today; use **Roadmap** for backlog and pitches.*
