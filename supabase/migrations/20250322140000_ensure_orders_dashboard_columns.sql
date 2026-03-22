-- Columns selected by DashboardPage (avoids PostgREST 400 if 20250321170000 was never applied).
alter table public.orders
  add column if not exists service_type text,
  add column if not exists paid_at timestamptz,
  add column if not exists fulfillment_deadline_at timestamptz,
  add column if not exists start_time timestamptz,
  add column if not exists end_time timestamptz;

notify pgrst, 'reload schema';
