-- Ensure columns used by OrderPage + Ziina flow exist (safe if 20250321160000 already ran).
-- Fixes: PostgREST "could not find ... idempotency_key ... in the schema cache" when migrations were skipped on remote.

alter table public.orders
  add column if not exists idempotency_key text,
  add column if not exists checkout_redirect_url text;

create unique index if not exists orders_idempotency_key_unique
  on public.orders (idempotency_key)
  where idempotency_key is not null;

notify pgrst, 'reload schema';
