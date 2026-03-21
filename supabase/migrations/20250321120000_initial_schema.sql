-- Extensions
create extension if not exists "pgcrypto";

-- Profiles (linked to auth.users; replaces blueprint "users" table)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  referral_code text not null unique,
  referred_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index profiles_referral_code_idx on public.profiles (referral_code);
create index profiles_referred_by_idx on public.profiles (referred_by);

-- Packages
create table public.packages (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('instagram', 'facebook', 'tiktok')),
  name text,
  followers int,
  price numeric(10, 2) not null,
  popular boolean not null default false,
  premium boolean not null default false
);

-- Orders (extended for checkout + tracking)
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  package_id uuid not null references public.packages (id),
  amount numeric(10, 2) not null,
  status text not null default 'pending' check (
    status in ('pending', 'paid', 'processing', 'completed')
  ),
  progress int not null default 0 check (progress >= 0 and progress <= 100),
  payment_id text,
  tracking_id text not null unique,
  profile_link text not null,
  email text,
  created_at timestamptz not null default now()
);

create index orders_user_id_idx on public.orders (user_id);
create index orders_tracking_id_idx on public.orders (tracking_id);
create index orders_payment_id_idx on public.orders (payment_id);

-- Referrals
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  referred_user_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  reward_unlocked boolean not null default false
);

create unique index referrals_one_per_order on public.referrals (order_id)
  where order_id is not null;

-- Rewards
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null default 'likes',
  amount int,
  code text not null,
  is_used boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, code)
);

-- Referral code generator + new user profile
create or replace function public.generate_referral_code()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.profiles p where p.referral_code = candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, referral_code)
  values (
    new.id,
    coalesce(new.email, ''),
    public.generate_referral_code()
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lock referred_by after first set
create or replace function public.protect_referred_by()
returns trigger
language plpgsql
as $$
begin
  if old.referred_by is not null and new.referred_by is distinct from old.referred_by then
    new.referred_by := old.referred_by;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_referred_by
  before update on public.profiles
  for each row execute function public.protect_referred_by();

-- Admin check (set app_metadata.role = 'admin' in Supabase Dashboard for a user)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- Public order lookup for tracking (no row leakage)
create or replace function public.get_order_by_tracking(p_tracking_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if p_tracking_id is null or length(trim(p_tracking_id)) < 3 then
    return null;
  end if;

  select json_build_object(
    'id', o.id,
    'tracking_id', o.tracking_id,
    'status', o.status,
    'progress', o.progress,
    'platform', pk.platform,
    'package_name', pk.name,
    'followers', pk.followers,
    'amount', o.amount,
    'profile_link', o.profile_link,
    'created_at', o.created_at
  )
  into result
  from public.orders o
  join public.packages pk on pk.id = o.package_id
  where o.tracking_id = trim(p_tracking_id)
  limit 1;

  return result;
end;
$$;

grant execute on function public.get_order_by_tracking(text) to anon, authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.packages enable row level security;
alter table public.orders enable row level security;
alter table public.referrals enable row level security;
alter table public.rewards enable row level security;

-- Profiles
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Packages: public read
create policy "packages_select_all"
  on public.packages for select
  to anon, authenticated
  using (true);

-- Orders
create policy "orders_select_own"
  on public.orders for select
  using (user_id = auth.uid());

create policy "orders_insert_own"
  on public.orders for insert
  with check (user_id = auth.uid());

create policy "orders_admin_all"
  on public.orders for all
  using (public.is_admin())
  with check (public.is_admin());

-- Referrals
create policy "referrals_select_related"
  on public.referrals for select
  using (
    referrer_id = auth.uid()
    or referred_user_id = auth.uid()
    or public.is_admin()
  );

create policy "referrals_admin_all"
  on public.referrals for all
  using (public.is_admin())
  with check (public.is_admin());

-- Rewards
create policy "rewards_select_own"
  on public.rewards for select
  using (user_id = auth.uid() or public.is_admin());

create policy "rewards_update_own"
  on public.rewards for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "rewards_admin_insert"
  on public.rewards for insert
  with check (public.is_admin());

-- Seed packages (AED) — Socioly tier names; premium only on 100K
insert into public.packages (platform, name, followers, price, popular, premium) values
('instagram', 'Starter Boost', 2000, 99, false, false),
('instagram', 'Growth Pack', 5000, 199, false, false),
('instagram', 'Influencer Pack', 10000, 499, true, false),
('instagram', 'Viral Boost', 50000, 2399, false, false),
('instagram', 'Celebrity Pack', 100000, 4699, false, true),
('facebook', 'Starter Boost', 2000, 99, false, false),
('facebook', 'Growth Pack', 5000, 199, false, false),
('facebook', 'Page Growth Pro', 10000, 499, true, false),
('facebook', 'Viral Reach', 50000, 2399, false, false),
('facebook', 'Authority Page', 100000, 4699, false, true),
('tiktok', 'Starter Boost', 2000, 99, false, false),
('tiktok', 'Growth Pack', 5000, 199, false, false),
('tiktok', 'Creator Pack', 10000, 499, true, false),
('tiktok', 'Viral Push', 50000, 2399, false, false),
('tiktok', 'Trending Star', 100000, 4699, false, true);
