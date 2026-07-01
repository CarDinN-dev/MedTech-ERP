begin;

insert into public.document_sequences(entity_type, prefix, padding)
values ('access_provisioning_request', 'ACC', 5)
on conflict(entity_type) do nothing;

create table public.access_provisioning_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique default public.next_document_number('access_provisioning_request'),
  employee_id uuid not null references public.employees(id),
  company_id text,
  requested_access text not null default '',
  erp_role text not null default 'Employee',
  email_required boolean not null default true,
  company_car_status text not null default 'not_assigned' check (company_car_status in ('assigned','not_assigned')),
  accommodation_status text not null default 'not_assigned' check (accommodation_status in ('assigned','not_assigned')),
  desk_status text not null default 'not_assigned' check (desk_status in ('assigned','not_assigned')),
  stationery_status text not null default 'not_assigned' check (stationery_status in ('assigned','not_assigned')),
  email_status text not null default 'not_assigned' check (email_status in ('assigned','not_assigned')),
  business_card_status text not null default 'not_assigned' check (business_card_status in ('assigned','not_assigned')),
  laptop_required boolean not null default false,
  laptop_or_pc text not null default 'not_required' check (laptop_or_pc in ('laptop','pc','not_required')),
  mobile_required boolean not null default false,
  approval_status text not null default 'draft' check (approval_status in ('draft','submitted','approved','rejected')),
  provisioning_status text not null default 'pending' check (provisioning_status in ('pending','provisioned','rejected','cancelled')),
  created_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  provisioned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index access_provisioning_employee_idx on public.access_provisioning_requests(employee_id, provisioning_status) where deleted_at is null;
create index access_provisioning_queue_idx on public.access_provisioning_requests(approval_status, provisioning_status, created_at) where deleted_at is null;

create trigger access_provisioning_requests_updated_at before update on public.access_provisioning_requests for each row execute function public.set_updated_at();
create trigger access_provisioning_requests_audit after insert or update or delete on public.access_provisioning_requests for each row execute function public.audit_row_change();

alter table public.access_provisioning_requests enable row level security;
grant select,insert,update,delete on public.access_provisioning_requests to authenticated;

create policy access_provisioning_requests_hr_select on public.access_provisioning_requests for select to authenticated using (public.has_permission('hr','view') or public.is_management());
create policy access_provisioning_requests_hr_insert on public.access_provisioning_requests for insert to authenticated with check (public.has_permission('hr','create'));
create policy access_provisioning_requests_hr_update on public.access_provisioning_requests for update to authenticated using (public.has_permission('hr','update')) with check (public.has_permission('hr','update'));
create policy access_provisioning_requests_hr_delete on public.access_provisioning_requests for delete to authenticated using (public.has_permission('hr','delete'));
create policy access_provisioning_requests_self_select on public.access_provisioning_requests for select to authenticated using (employee_id = private.current_employee_id());
create policy access_provisioning_requests_manager_select on public.access_provisioning_requests for select to authenticated using (private.manages_employee(employee_id));

commit;
