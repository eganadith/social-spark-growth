-- Production hardening: idempotent checkout, referral claim RPC, limited public track lookup

-- Orders: idempotency + persisted Ziina redirect for safe retries
alter table public.orders
  add column if not exists idempotency_key text,
  add column if not exists checkout_redirect_url text;

create unique index if not exists orders_idempotency_key_unique
  on public.orders (idempotency_key)
  where idempotency_key is not null;

-- Referral: only claim_referral() or admin may set referred_by (trigger below)
create or replace function public.claim_referral(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  referrer_id uuid;
  trimmed text := upper(trim(coalesce(p_code, '')));
begin
  if trimmed is null or char_length(trimmed) < 2 then
    raise exception 'Invalid referral code';
  end if;

  select id into referrer_id
  from public.profiles
  where upper(referral_code) = trimmed
  limit 1;

  if referrer_id is null then
    raise exception 'Invalid referral code';
  end if;

  if referrer_id = auth.uid() then
    raise exception 'Cannot refer yourself';
  end if;

  if exists (
    select 1 from public.profiles
    where id = auth.uid() and referred_by is not null
  ) then
    raise exception 'Already referred';
  end if;

  perform set_config('app.claim_referral_active', 'true', true);
  begin
    update public.profiles
    set referred_by = referrer_id
    where id = auth.uid();
  exception
    when others then
      perform set_config('app.claim_referral_active', 'false', true);
      raise;
  end;
  perform set_config('app.claim_referral_active', 'false', true);
end;
$$;

revoke all on function public.claim_referral(text) from public;
grant execute on function public.claim_referral(text) to authenticated;

create or replace function public.profiles_enforce_referred_by_claim()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if new.referred_by is not distinct from old.referred_by then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;
  if coalesce(current_setting('app.claim_referral_active', true), 'false') = 'true' then
    return new;
  end if;
  raise exception 'Referral attribution must use claim_referral()';
end;
$$;

drop trigger if exists profiles_referred_by_claim_only on public.profiles;
create trigger profiles_referred_by_claim_only
  before update on public.profiles
  for each row
  execute function public.profiles_enforce_referred_by_claim();

-- Public tracking: minimal fields only (no profile_link, amount, package PII)
create or replace function public.get_order_by_tracking(p_tracking_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if p_tracking_id is null or length(trim(p_tracking_id)) < 8 then
    return null;
  end if;

  select json_build_object(
    'tracking_id', o.tracking_id,
    'status', o.status,
    'progress', o.progress,
    'created_at', o.created_at
  )
  into result
  from public.orders o
  where o.tracking_id = trim(p_tracking_id)
  limit 1;

  return result;
end;
$$;

grant execute on function public.get_order_by_tracking(text) to anon, authenticated;
