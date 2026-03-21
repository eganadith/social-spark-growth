-- =============================================================================
-- PACKAGE SEED ONLY — run AFTER the schema migration.
--
-- Error "relation public.packages does not exist"?
--   1) Supabase → SQL → New query
--   2) Paste and run the ENTIRE file:
--      supabase/migrations/20250321120000_initial_schema.sql
--   3) Then run:
--      supabase/migrations/20250321120001_referral_lookup_rpc.sql
--   4) Come back and run THIS file again.
--
-- From repo (after `npx supabase link`):
--   npm run db:seed          → linked cloud database
--   npm run db:seed:local    → local supabase start
--
-- Idempotent: safe to run multiple times (skips rows that already match).
-- =============================================================================

INSERT INTO public.packages (platform, name, followers, price, popular, premium)
SELECT v.platform, v.name, v.followers, v.price, v.popular, v.premium
FROM (
  VALUES
    ('instagram', 'Starter Boost', 2000, 99::numeric(10, 2), false, false),
    ('instagram', 'Growth Pack', 5000, 199::numeric(10, 2), false, false),
    ('instagram', 'Influencer Pack', 10000, 499::numeric(10, 2), true, false),
    ('instagram', 'Viral Boost', 50000, 2399::numeric(10, 2), false, false),
    ('instagram', 'Celebrity Pack', 100000, 4699::numeric(10, 2), false, true),
    ('facebook', 'Starter Boost', 2000, 99::numeric(10, 2), false, false),
    ('facebook', 'Growth Pack', 5000, 199::numeric(10, 2), false, false),
    ('facebook', 'Page Growth Pro', 10000, 499::numeric(10, 2), true, false),
    ('facebook', 'Viral Reach', 50000, 2399::numeric(10, 2), false, false),
    ('facebook', 'Authority Page', 100000, 4699::numeric(10, 2), false, true),
    ('tiktok', 'Starter Boost', 2000, 99::numeric(10, 2), false, false),
    ('tiktok', 'Growth Pack', 5000, 199::numeric(10, 2), false, false),
    ('tiktok', 'Creator Pack', 10000, 499::numeric(10, 2), true, false),
    ('tiktok', 'Viral Push', 50000, 2399::numeric(10, 2), false, false),
    ('tiktok', 'Trending Star', 100000, 4699::numeric(10, 2), false, true)
) AS v(platform, name, followers, price, popular, premium)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.packages p
  WHERE p.platform = v.platform
    AND p.followers = v.followers
);
