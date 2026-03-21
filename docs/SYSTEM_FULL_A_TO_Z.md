# Socioly — Full system guide (A–Z): how it works, auth, architecture, gaps

This document is for **validating architecture**: what the app does end-to-end, where trust boundaries sit, what can go wrong with **login/session**, and **known loopholes** or missing enforcement. It complements [WEBSITE.md](./WEBSITE.md) (site map + ops) and [ARCHITECTURE.md](./ARCHITECTURE.md) (roadmap + UX). **Source of truth** for behavior is always `src/` and `supabase/` in the repo.

---

## Table of contents

1. [High-level architecture](#1-high-level-architecture)
2. [Request path: anonymous visitor → paid order](#2-request-path-anonymous-visitor--paid-order)
3. [Authentication and session (deep dive)](#3-authentication-and-session-deep-dive)
4. [Authorization: user vs admin](#4-authorization-user-vs-admin)
5. [Database, RLS, and RPCs](#5-database-rls-and-rpcs)
6. [Edge Functions](#6-edge-functions)
7. [Payments (Ziina) and webhooks](#7-payments-ziina-and-webhooks)
8. [Referrals and rewards](#8-referrals-and-rewards)
9. [Known loopholes, risks, and “is this wrong?”](#9-known-loopholes-risks-and-is-this-wrong)
10. [Checklist: is the architecture “right”?](#10-checklist-is-the-architecture-right)
11. [Related docs](#11-related-docs)

---

## 1. High-level architecture

| Layer | Responsibility |
|--------|----------------|
| **Browser (Vite/React)** | UI, routing, calls Supabase with **anon key** + user **JWT** after login. Never sees service role. |
| **Supabase Auth** | Email/password users, JWTs, `app_metadata` (e.g. `role: admin`). |
| **Postgres + RLS** | Data for profiles, packages, orders, referrals, rewards. Policies restrict reads/writes per user (and admin via `is_admin()`). |
| **RPCs (`security definer`)** | Controlled bypass of RLS for **safe, narrow** operations (e.g. public track lookup, referral code → profile id). |
| **Edge Functions (Deno)** | **`create-payment`**: trusted server logic + Ziina + inserts orders with **service role**. **`webhook-handler`**: Ziina callbacks, updates orders + referral/rewards with service role. |

**Correct pattern:** anything that must not be forgeable by the client (price, payment intent, order creation for paid flow) is done in **Edge Functions** or **webhooks**, not by trusting client-submitted amounts.

---

## 2. Request path: anonymous visitor → paid order

1. **Landing** (`/`): marketing, `PackagesSection` loads `packages` (public read via RLS).
2. **`?ref=CODE`**: `ReferralCapture` stores the code in **localStorage** (`socioly_pending_ref`) until signup/login ([`src/lib/referralStorage.ts`](../src/lib/referralStorage.ts)).
3. **Order** (`/order`): if **not signed in**, React Router **`Navigate`** sends user to `/auth?next=<encoded /order URL>` ([`OrderPage.tsx`](../src/pages/OrderPage.tsx)).
4. **Auth** (`/auth`): `signUp` / `signIn` via Supabase. On success, navigates to `next` (default `/dashboard`).
5. **Referral attach**: [`useAuth`](../src/hooks/useAuth.ts) runs `applyPendingReferral` after session is available — RPC `get_profile_id_by_referral_code`, then `profiles.update({ referred_by })` if allowed.
6. **Pay (production)**:
   - Client refreshes session, invokes **`create-payment`** with **Bearer access_token**.
   - Function validates user, loads **package price from DB**, inserts **pending** order, calls Ziina, returns **`checkoutUrl`**; browser redirects to Ziina.
7. **After Ziina**: user returns to `success_url` / etc. **Order status** updates from **`webhook-handler`**, not from the return URL alone.
8. **Track** (`/track?id=…`): **public** RPC `get_order_by_tracking` returns a JSON payload (no direct table read for anon).

**Dev shortcut:** `VITE_DEV_LOCAL_CHECKOUT=true` skips the Edge Function and inserts a **pending** order via the client. **Do not enable in production** — no real payment, different threat model.

---

## 3. Authentication and session (deep dive)

### What the app uses

- **Supabase JS client** (singleton in [`supabaseClient.ts`](../src/lib/supabaseClient.ts)) with `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
- **Session**: `getSession()` on mount, then `onAuthStateChange` to keep `user` / `session` in [`useAuth`](../src/hooks/useAuth.ts).

### Login / signup UX ([`AuthPage.tsx`](../src/pages/AuthPage.tsx))

- **Sign up:** if `data.session` is missing after `signUp`, Supabase often has **email confirmation** enabled → toast “Check your email”, navigate to **`/`** (not `next`). User is **not logged in** until they confirm and sign in.
- **Sign in:** on success, navigate to **`next`** query param.

### Common “login issues” (configuration vs bugs)

| Symptom | Likely cause |
|---------|----------------|
| Sign up succeeds but never “logged in” | **Email confirmation** on in Dashboard → Auth → Providers; user must click link then **sign in**. |
| After confirm, land on home not `/order` | Sign-up path discards `next` when there’s no session (by design today); user should use link with `next` again or open Order manually. |
| “Invalid login credentials” | Wrong password, unconfirmed email, or typo. |
| Instant log-out / empty session | Wrong project URL/key, third-party cookies blocked (rare), clock skew (rare), or custom domain misconfiguration in Supabase Auth URL settings. |
| API calls 401 from Edge Function | **Expired access token** — app mitigates with `refreshSession()` before `functions.invoke` on pay; if you add other invokes, refresh there too. |
| RLS errors on `profiles` / `orders` | User not logged in, or JWT not attached to client, or policy intentionally denies (e.g. not admin). |

### Session + `next` preservation

- **Order flow:** `next` is set to full `/order?...` when redirecting unauthenticated users to `/auth`.
- **Dashboard:** hard-coded `Navigate` to `/auth?next=/dashboard` (does not preserve deep links).

---

## 4. Authorization: user vs admin

### “Normal” user

- **RLS** enforces: own `profiles` row, own `orders`, related `referrals` / `rewards` as per policies in [`20250321120000_initial_schema.sql`](../supabase/migrations/20250321120000_initial_schema.sql).

### Admin

- **UI gate:** [`AdminPage.tsx`](../src/pages/AdminPage.tsx) checks `user?.app_metadata?.role === "admin"`.
- **Real enforcement:** Postgres policies use `public.is_admin()` which reads **`auth.jwt() -> 'app_metadata' ->> 'role'`** — same claim. Without `role = admin` in the JWT, **Postgres denies** admin reads/writes even if someone tampers with the UI.

**Important:** Admin must **refresh session** (sign out/in) after you change `raw_app_meta_data` in the Dashboard, so the JWT includes the new claim.

---

## 5. Database, RLS, and RPCs

### Core tables

- **`profiles`**: `id` = `auth.users.id`, `referral_code`, `referred_by`, `email` copy.
- **`packages`**: catalog; **public SELECT**.
- **`orders`**: `user_id`, `package_id`, `amount`, `status`, `progress`, `tracking_id`, `payment_id`, `profile_link`, etc.
- **`referrals`**, **`rewards`**: referral program.

### Triggers

- **`handle_new_user`**: on new `auth.users` row → insert `profiles` with generated `referral_code`.
- **`protect_referred_by`**: once `referred_by` is set, **updates cannot change it** (anti-tamper after first write at DB level).

### RPCs (security definer)

| RPC | Who can call | Purpose |
|-----|----------------|--------|
| `get_order_by_tracking` | **anon, authenticated** | Returns one order’s **public** fields for tracking UI. |
| `get_profile_id_by_referral_code` | **anon, authenticated** | Resolve referral code → referrer `profiles.id` without exposing full profile list. |

---

## 6. Edge Functions

| Function | JWT | Role |
|----------|-----|------|
| **`create-payment`** | **Required** (`verify_jwt = true` in [`config.toml`](../supabase/config.toml)) | Runs as user for `getUser()`, **service role** for DB + Ziina. |
| **`webhook-handler`** | **No JWT** (Ziina POST) | Validates **HMAC** if `ZIINA_WEBHOOK_SECRET` set; uses service role. |

**Secrets:** use [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) — hosted projects inject `SUPABASE_*` including service role; set **`ZIINA_API_KEY`**, **`PUBLIC_SITE_URL`**, webhook secret, etc., explicitly.

---

## 7. Payments (Ziina) and webhooks

1. **`create-payment`** builds Ziina **Payment Intent** (amount in fils, success/cancel/failure URLs, optional `test`).
2. User pays on Ziina; **Ziina** calls **`webhook-handler`**.
3. Handler updates **`orders`** by `payment_id`, maps Ziina status → internal `status` / `progress`.
4. Referral/reward side effects run when order maps to **paid** path (see [`webhook-handler/index.ts`](../supabase/functions/webhook-handler/index.ts)).

**Production requirement:**

- **`ZIINA_WEBHOOK_SECRET`** must be set: `webhook-handler` returns **503** if missing, and [`verifyZiinaWebhook`](../supabase/functions/_shared/ziina.ts) rejects unsigned bodies.
- Webhook URL must be **registered in Ziina** and match your deployed `webhook-handler` URL.

---

## 8. Referrals and rewards

**Intended flow**

1. Visitor stores `?ref=` → signs up/logs in → `useAuth` sets `referred_by` **once** (if RPC finds referrer and not self and not already referred).
2. On **first paid** order (webhook maps to **paid**), handler inserts **`referrals`** row and may **upsert `rewards`** for the referrer based on counts ([`_shared/rewards.ts`](../supabase/functions/_shared/rewards.ts), mirrored in [`rewardMilestones.ts`](../src/lib/rewardMilestones.ts)).

**Ziina → order status mapping note:** the webhook maps some Ziina terminal states to internal `paid` / `processing` / `pending` ([`mapZiinaIntentStatus`](../supabase/functions/webhook-handler/index.ts)). **`completed` (business “fulfilled”)** may still be a **manual admin** step depending on how you use `orders.status` in the UI — verify this matches your ops process.

---

## 9. Known loopholes, risks, and “is this wrong?”

These are **honest architectural gaps** to review — not an exhaustive penetration test.

### A. Referral attribution (patched)

- **`claim_referral(p_code)`** (security definer) is the supported way to set `referred_by`; the app calls it from [`useAuth`](../src/hooks/useAuth.ts) after login.
- Trigger **`profiles_referred_by_claim_only`** rejects direct client updates that change `referred_by` unless `app.claim_referral_active` is set inside `claim_referral` or the user is **admin** (see migration `20250321160000_production_hardening.sql`).

### B. Public track RPC (patched)

- `get_order_by_tracking` returns only **`tracking_id`**, **`status`**, **`progress`**, **`created_at`** — no profile link, amount, or package fields.
- New orders use a **full UUID** `tracking_id` (stronger than the old short `SL-…` prefix).

### C. Admin UI is not a security boundary

- Non-admins can **open `/admin`** and see the “admin only” message; **data** still must fail RLS (it does, if policies are deployed).

### D. `VITE_DEV_LOCAL_CHECKOUT`

- If accidentally enabled in production, users could create **pending** orders without payment. **Treat as dangerous config.**

### E. Double-submit / duplicate orders

- User can click Pay twice quickly → **two** pending orders / two intents possible. **Roadmap** item in [ARCHITECTURE.md](./ARCHITECTURE.md): idempotency / UI debounce.

### F. Email confirmation + referral

- If user signs up with confirmation, **`applyPendingReferral` on first `getSession`** may run **before** they confirm — **no user** yet. After confirmation and first login, referral application runs again — **usually OK** if code still in localStorage.

### G. Client-side metadata

- **`app_metadata.role`** is visible in the JWT in the browser. That’s normal; **changing** it without Supabase’s keys does not bypass RLS.

---

## 10. Checklist: is the architecture “right”?

Use this as a yes/no review with your team.

| Question | “Right” for this codebase |
|----------|---------------------------|
| Are prices ever taken only from the client? | **No** — `create-payment` loads **`packages.price`** server-side. ✓ |
| Is service role ever in `VITE_*`? | **No** ✓ |
| Are paid order state transitions driven by webhook? | **Yes** (Ziina → `webhook-handler`) ✓ |
| Is admin enforced server-side? | **Yes** (`is_admin()` in RLS) ✓ |
| Is referral attribution only via `claim_referral` / `?ref=`? | **Enforced in DB** — direct `referred_by` updates blocked for users; see [§9A](#9-known-loopholes-risks-and-is-this-wrong). |
| Is webhook signature required in prod? | **Should be** — otherwise forgeable ([§7](#7-payments-ziina-and-webhooks)). |
| Is public track lookup acceptable exposure? | **Product decision** — see [§9B](#9-known-loopholes-risks-and-is-this-wrong). |

---

## 11. Related docs

| Doc | Use |
|-----|-----|
| [WEBSITE.md](./WEBSITE.md) | Routes, env tables, troubleshooting |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | UX/SEO roadmap + current feature matrix |
| [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) | Deploy, `project_id`, secrets |
| [ZIINA.md](./ZIINA.md) | Payment intent + webhook registration |
| [../supabase/README.md](../supabase/README.md) | Link, seed, CLI |

---

*This file is meant for internal architecture review. When in doubt, trust the migrations and TypeScript sources over this narrative.*
