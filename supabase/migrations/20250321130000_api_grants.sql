-- Let PostgREST (anon / authenticated JWT) read `packages` when RLS allows it.
-- If packages were created only via SQL, these grants are sometimes missing and every
-- `.from('packages')` request fails with permission / RLS-style errors in the client.

grant usage on schema public to anon, authenticated;
grant select on table public.packages to anon, authenticated;
