-- Payment verification metadata + allow failed order status

alter table public.orders
  add column if not exists payment_verified_at timestamptz;

alter table public.orders drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check check (
    status in ('pending', 'paid', 'failed', 'processing', 'completed')
  );

comment on column public.orders.payment_verified_at is 'Set when Ziina payment_intent verified server-side (verify-payment Edge Function).';
