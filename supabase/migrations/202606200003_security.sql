begin;

create or replace function public.has_permission(p_module text, p_action text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles ur
    join roles r on r.id = ur.role_id
    left join role_permissions rp on rp.role_id = r.id
    left join permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid()
      and (r.code = 'super_admin' or (p.module = p_module and p.action in (p_action, 'admin')))
  );
$$;

create or replace function public.is_management() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = auth.uid() and r.code in ('super_admin','management','auditor'));
$$;

revoke all on function public.has_permission(text,text) from public;
grant execute on function public.has_permission(text,text) to authenticated;
revoke all on function public.is_management() from public;
grant execute on function public.is_management() to authenticated;

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.profiles enable row level security;

create policy roles_read on public.roles for select to authenticated using (true);
create policy permissions_read on public.permissions for select to authenticated using (true);
create policy role_permissions_read on public.role_permissions for select to authenticated using (true);
create policy user_roles_read_self_or_admin on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_permission('admin','view'));
create policy profiles_read on public.profiles for select to authenticated using (is_active or id = auth.uid());
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy roles_admin_all on public.roles for all to authenticated using (public.has_permission('admin','admin')) with check (public.has_permission('admin','admin'));
create policy role_permissions_admin_all on public.role_permissions for all to authenticated using (public.has_permission('admin','admin')) with check (public.has_permission('admin','admin'));
create policy user_roles_admin_all on public.user_roles for all to authenticated using (public.has_permission('admin','admin')) with check (public.has_permission('admin','admin'));

do $$
declare item text; tbl text; mod text;
begin
  foreach item in array array[
    'departments:hr','employees:hr','attendance:hr','leave_requests:hr',
    'parties:sales','leads:sales','opportunities:sales','quotations:sales','quotation_items:sales','sales_orders:sales','sales_order_items:sales',
    'categories:inventory','products:inventory','stock_locations:inventory','inventory:inventory','stock_movements:inventory',
    'chart_of_accounts:finance','invoices:finance','invoice_items:finance','payments:finance','expenses:finance',
    'purchase_requests:procurement','purchase_request_items:procurement','rfqs:procurement','purchase_orders:procurement','purchase_order_items:procurement','goods_receipts:procurement',
    'shipments:shipping','delivery_notes:shipping',
    'service_tickets:service','equipment_installations:service','maintenance_schedules:service',
    'projects:projects','project_milestones:projects','tasks:projects',
    'documents:documents','comments:documents','activities:documents',
    'approval_workflows:approvals','approvals:approvals','company_settings:admin','document_sequences:admin'
  ] loop
    tbl := split_part(item, ':', 1); mod := split_part(item, ':', 2);
    execute format('alter table public.%I enable row level security', tbl);
    execute format('create policy %I_select on public.%I for select to authenticated using (public.has_permission(%L, %L) or public.is_management())', tbl, tbl, mod, 'view');
    execute format('create policy %I_insert on public.%I for insert to authenticated with check (public.has_permission(%L, %L))', tbl, tbl, mod, 'create');
    execute format('create policy %I_update on public.%I for update to authenticated using (public.has_permission(%L, %L)) with check (public.has_permission(%L, %L))', tbl, tbl, mod, 'update', mod, 'update');
    execute format('create policy %I_delete on public.%I for delete to authenticated using (public.has_permission(%L, %L))', tbl, tbl, mod, 'delete');
  end loop;
end $$;

alter table public.notifications enable row level security;
create policy notifications_own_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_own_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.audit_logs enable row level security;
create policy audit_logs_read on public.audit_logs for select to authenticated using (public.has_permission('admin','view') or public.is_management());

-- Prevent client-side mutation of immutable audit records and numbering.
revoke insert, update, delete on public.audit_logs from authenticated;
revoke insert, update, delete on public.document_sequences from authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values
  ('documents', 'documents', false, 52428800, array['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('avatars', 'avatars', false, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy storage_documents_read on storage.objects for select to authenticated
using (bucket_id = 'documents' and public.has_permission('documents','view'));
create policy storage_documents_upload on storage.objects for insert to authenticated
with check (bucket_id = 'documents' and public.has_permission('documents','create') and (storage.foldername(name))[1] is not null);
create policy storage_documents_update on storage.objects for update to authenticated
using (bucket_id = 'documents' and public.has_permission('documents','update'));
create policy storage_avatars_read on storage.objects for select to authenticated using (bucket_id = 'avatars');
create policy storage_avatars_own on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
