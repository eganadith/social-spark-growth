-- Allow resolving a referral code without exposing full profiles via RLS
create or replace function public.get_profile_id_by_referral_code(p_code text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id
  from public.profiles
  where upper(referral_code) = upper(trim(p_code))
  limit 1;
$$;

revoke all on function public.get_profile_id_by_referral_code(text) from public;
grant execute on function public.get_profile_id_by_referral_code(text) to anon, authenticated;
