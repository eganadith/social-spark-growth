-- Payments ledger (Ziina payment_intent id) + order SLA fields for polling-based verification

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  payment_id text not null,
  status text not null check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create unique index payments_payment_id_key on public.payments (payment_id);
create index payments_order_id_idx on public.payments (order_id);
create index payments_pending_poll_idx on public.payments (created_at) where status = 'pending';

alter table public.orders
  add column if not exists service_type text,
  add column if not exists paid_at timestamptz,
  add column if not exists fulfillment_deadline_at timestamptz,
  add column if not exists start_time timestamptz,
  add column if not exists end_time timestamptz;

alter table public.payments enable row level security;

create policy "payments_select_own_order"
  on public.payments for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = payments.order_id and o.user_id = auth.uid()
    )
  );

create policy "payments_admin_all"
  on public.payments for all
  using (public.is_admin())
  with check (public.is_admin());

grant select on table public.payments to authenticated;
