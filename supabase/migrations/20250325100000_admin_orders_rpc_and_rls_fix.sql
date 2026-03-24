-- Fix: staff sometimes only saw their own orders because RLS + is_admin() did not apply reliably.
-- 1) Grant EXECUTE on is_admin() (used by policies)
-- 2) Replace orders_staff_select_all with an explicit profiles.role check (same logic, no indirection)
-- 3) SECURITY DEFINER RPC lists ALL orders for dashboard (bypasses RLS on orders; still checks staff in SQL)

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_super_admin() to authenticated;

drop policy if exists "orders_staff_select_all" on public.orders;

create policy "orders_staff_select_all"
  on public.orders for select
  using (
    exists (
      select 1
      from public.profiles pr
      where pr.id = auth.uid()
        and pr.role in ('admin', 'super_admin')
    )
  );

-- Bypasses RLS on public.orders; caller must be staff (admin or super_admin).
create or replace function public.admin_list_orders_for_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'tracking_id', o.tracking_id,
          'status', o.status,
          'progress', o.progress,
          'amount', o.amount,
          'created_at', o.created_at,
          'profile_link', o.profile_link,
          'email', o.email,
          'user_id', o.user_id,
          'payment_id', o.payment_id,
          'payment_verified_at', o.payment_verified_at,
          'package', jsonb_build_object(
            'name', pk.name,
            'platform', pk.platform,
            'followers', pk.followers
          )
        )
        order by o.created_at desc
      )
      from public.orders o
      left join public.packages pk on pk.id = o.package_id
      where exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('admin', 'super_admin')
      )
    ),
    '[]'::jsonb
  );
$$;

comment on function public.admin_list_orders_for_dashboard() is
  'Returns all orders with package embed for /admin. Uses SECURITY DEFINER to avoid RLS hiding rows when staff policies misconfigure.';

grant execute on function public.admin_list_orders_for_dashboard() to authenticated;

notify pgrst, 'reload schema';
