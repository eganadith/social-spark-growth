-- Order status / mutations: super_admin only. Staff (admin + super_admin) keep read access.

drop policy if exists "orders_admin_all" on public.orders;

-- All staff can list orders (admin dashboard)
create policy "orders_staff_select_all"
  on public.orders for select
  using (public.is_admin());

-- Inserts/updates/deletes only for super_admin (replaces broad admin write access)
create policy "orders_super_admin_all"
  on public.orders for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

notify pgrst, 'reload schema';
