# Socioly — Full system guide (A–Z): how it works, auth, architecture, gaps

This document is for **validating architecture**: what the app does end-to-end, where trust boundaries sit, what can go wrong with **login/session**, and **known loopholes** or missing enforcement. It complements [WEBSITE.md](./WEBSITE.md) (site map + ops) and [ARCHITECTURE.md](./ARCHITECTURE.md) (roadmap + UX). **Source of truth** for behavior is always `src/` and `supabase/` in the repo.

---

## Table of contents

1. [High-level architecture](#1-high-level-architecture)
2. [Request path: anonymous visitor → order](#2-request-path-anonymous-visitor--order)
3. [Authentication and session (deep dive)](#3-authentication-and-session-deep-dive)
4. [Authorization: user vs admin](#4-authorization-user-vs-admin)
5. [Database, RLS, and RPCs](#5-database-rls-and-rpcs)
6. [Edge Functions](#6-edge-functions)
7. [Referrals and rewards](#7-referrals-and-rewards)
8. [Known loopholes, risks, and “is this wrong?”](#8-known-loopholes-risks-and-is-this-wrong)
9. [Checklist: is the architecture “right”?](#9-checklist-is-the-architecture-right)
10. [Related docs](#10-related-docs)

---

## 1. High-level architecture

| Layer | Responsibility |
|--------|----------------|
| **Browser (Vite/React)** | UI, routing, calls Supabase with **anon key** + user **JWT** after login. Never sees service role. |
| **Supabase Auth** | Email/password users, JWTs, `app_metadata` (e.g. `role: admin`). |
| **Postgres + RLS** | Data for profiles, packages, orders, referrals, rewards. Policies restrict reads/writes per user (and admin via `is_admin()`). |
| **RPCs (`security definer`)** | Controlled bypass of RLS for **safe, narrow** operations (e.g. public track lookup, referral code → profile id). |
| **Edge Functions (Deno)** | **None** in this repo for checkout — orders are inserted by the authenticated client subject to RLS. |

**Trust note:** `orders.amount` is written from the client using the selected package’s displayed price. For stricter pricing, add a **security definer** RPC or Edge Function that copies `amount` from `packages` by `package_id` server-side.

---

## 2. Request path: anonymous visitor → order

1. **Landing** (`/`): marketing, `PackagesSection` loads `packages` (public read via RLS).
2. **`?ref=CODE`**: `ReferralCapture` stores the code in **localStorage** (`socioly_pending_ref`) until signup/login ([`src/lib/referralStorage.ts`](../src/lib/referralStorage.ts)).
3. **Order** (`/order`): if **not signed in**, user is sent to `/auth?next=<encoded /order URL>` ([`OrderPage.tsx`](../src/pages/OrderPage.tsx)).
4. **Auth** (`/auth`): `signUp` / `signIn` via Supabase. On success, navigates to `next` (default `/dashboard`).
5. **Referral attach**: [`useAuth`](../src/hooks/useAuth.ts) runs `applyPendingReferral` after session is available — RPC `get_profile_id_by_referral_code`, then `profiles.update({ referred_by })` if allowed.
6. **Submit order:** signed-in user completes step 2 (terms), client **inserts** a **pending** `orders` row (`package_id`, `amount` from selected package UI, `tracking_id`, `idempotency_key`) and navigates to **`/track?id=…`**.
7. **Track** (`/track?id=…`): **public** RPC `get_order_by_tracking` returns a JSON payload (no direct table read for anon).
8. **Status beyond pending:** today updated via **Admin** or direct DB — there is **no** payment webhook in this repo.

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
| API calls 401 from Edge Function | N/A unless you add functions; use `refreshSession()` before `functions.invoke` if you do. |
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

None are required for the default product flow. See [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md).

---

## 7. Referrals and rewards

**Intended flow**

1. Visitor stores `?ref=` → signs up/logs in → `useAuth` sets `referred_by` **once** (if RPC finds referrer and not self and not already referred).
2. **Referral rows / reward unlocks** after orders are **not** automated by Edge Functions in this repo. Milestone definitions for the UI live in [`rewardMilestones.ts`](../src/lib/rewardMilestones.ts); you can wire `referrals` / `rewards` inserts via Admin, SQL, or a future backend job.

---

## 8. Known loopholes, risks, and “is this wrong?”

These are **honest architectural gaps** to review — not an exhaustive penetration test.

### A. Referral attribution (patched)

- **`claim_referral(p_code)`** (security definer) is the supported way to set `referred_by`; the app calls it from [`useAuth`](../src/hooks/useAuth.ts) after login.
- Trigger **`profiles_referred_by_claim_only`** rejects direct client updates that change `referred_by` unless `app.claim_referral_active` is set inside `claim_referral` or the user is **admin** (see migration `20250321160000_production_hardening.sql`).

### B. Public track RPC (patched)

- `get_order_by_tracking` returns only **`tracking_id`**, **`status`**, **`progress`**, **`created_at`** — no profile link, amount, or package fields.
- `tracking_id` is a short `SL-…` style id suitable for support lookup; treat as an identifier, not a secret.

### C. Admin UI is not a security boundary

- Non-admins can **open `/admin`** and see the “admin only” message; **data** still must fail RLS (it does, if policies are deployed).

### D. Double-submit / duplicate orders

- User can click submit twice quickly → **two** pending orders possible unless `idempotency_key` unique constraint surfaces an error. **Roadmap:** clearer UX on duplicate key.

### E. Email confirmation + referral

- If user signs up with confirmation, **`applyPendingReferral` on first `getSession`** may run **before** they confirm — **no user** yet. After confirmation and first login, referral application runs again — **usually OK** if code still in localStorage.

### F. Client-side metadata

- **`app_metadata.role`** is visible in the JWT in the browser. That’s normal; **changing** it without Supabase’s keys does not bypass RLS.

---

## 9. Checklist: is the architecture “right”?

Use this as a yes/no review with your team.

| Question | “Right” for this codebase |
|----------|---------------------------|
| Are prices enforced server-side on insert? | **No** — client sends `amount`; tighten with RPC/Edge if you need anti-tamper pricing. |
| Is service role ever in `VITE_*`? | **No** ✓ |
| Are order state transitions automated by payment webhooks? | **No** in this repo — use Admin / custom automation. |
| Is admin enforced server-side? | **Yes** (`is_admin()` in RLS) ✓ |
| Is referral attribution only via `claim_referral` / `?ref=`? | **Enforced in DB** — direct `referred_by` updates blocked for users; see [§8](#8-known-loopholes-risks-and-is-this-wrong). |
| Is public track lookup acceptable exposure? | **Product decision** — see [§8B](#8-known-loopholes-risks-and-is-this-wrong). |

---

## 10. Related docs

| Doc | Use |
|-----|-----|
| [WEBSITE.md](./WEBSITE.md) | Routes, env tables, troubleshooting |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | UX/SEO roadmap + current feature matrix |
| [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) | Edge Functions note |
| [../supabase/README.md](../supabase/README.md) | Link, seed, CLI |

---

*This file is meant for internal architecture review. When in doubt, trust the migrations and TypeScript sources over this narrative.*
