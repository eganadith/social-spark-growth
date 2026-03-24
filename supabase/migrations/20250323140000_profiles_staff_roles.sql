-- Staff roles on profiles: user (default) | admin | super_admin
-- Replaces JWT-only admin; is_admin() / is_super_admin() read from profiles.

alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'admin', 'super_admin'));

comment on column public.profiles.role is 'Access: user = customer; admin = staff orders/users; super_admin = full + role changes';

-- Promote anyone who was JWT admin (legacy) to super_admin
update public.profiles p
set role = 'super_admin'
from auth.users u
where u.id = p.id
  and (coalesce(u.raw_app_meta_data->>'role', '')) = 'admin';

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'super_admin')
  );
$$;

grant execute on function public.is_super_admin() to authenticated;

-- Only super_admin may change profiles.role (others blocked even on own row)
create or replace function public.profiles_enforce_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if new.role is distinct from old.role then
    if not public.is_super_admin() then
      raise exception 'Only super_admin can change roles';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_enforce_role_change on public.profiles;
create trigger profiles_enforce_role_change
  before update on public.profiles
  for each row
  execute function public.profiles_enforce_role_change();

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own_or_staff"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

-- Own row OR super_admin (can edit any profile; role changes still gated by trigger)
create policy "profiles_update_own_or_super"
  on public.profiles for update
  using (id = auth.uid() or public.is_super_admin())
  with check (id = auth.uid() or public.is_super_admin());

notify pgrst, 'reload schema';
