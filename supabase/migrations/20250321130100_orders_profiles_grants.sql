-- Client-side inserts (e.g. VITE_DEV_LOCAL_CHECKOUT) and dashboard reads need table-level
-- privileges; RLS still restricts which rows are visible.

grant select, insert, update on table public.profiles to authenticated;
grant select, insert on table public.orders to authenticated;
grant select, update on table public.rewards to authenticated;
grant select on table public.referrals to authenticated;
