begin;

create table public.leave_clearances (
  id uuid primary key default gen_random_uuid(),
  leave_application_id uuid not null references public.leave_applications(id) on delete cascade,
  request_no text not null,
  employee_id uuid not null references public.employees(id),
  employee_code text not null,
  employee_name text not null,
  department text,
  leave_start_date date not null,
  leave_end_date date not null,
  clearance_items text[] not null default array[]::text[],
  responsible_person text,
  status text not null default 'pending' check (status in ('not_required','pending','in_progress','cleared','blocked')),
  comments text check (comments is null or char_length(comments) <= 4000),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_clearances_one_per_application unique(leave_application_id),
  constraint leave_clearances_date_order check (leave_end_date >= leave_start_date),
  constraint leave_clearances_completed_consistent check (
    (status = 'cleared' and completed_at is not null)
    or (status <> 'cleared')
  )
);

create index leave_clearances_employee_idx on public.leave_clearances(employee_id, status, leave_start_date, leave_end_date);
create index leave_clearances_department_status_idx on public.leave_clearances(department, status);
create index leave_clearances_search_idx on public.leave_clearances using gin (
  to_tsvector(
    'simple',
    employee_code || ' ' || employee_name || ' ' || request_no || ' ' || coalesce(department, '') || ' ' || status
  )
);

create trigger leave_clearances_updated_at
before update on public.leave_clearances
for each row execute function public.set_updated_at();

create or replace function public.sync_leave_clearance_from_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' then
    insert into public.leave_clearances (
      leave_application_id,
      request_no,
      employee_id,
      employee_code,
      employee_name,
      department,
      leave_start_date,
      leave_end_date,
      clearance_items,
      status
    )
    values (
      new.id,
      new.request_no,
      new.employee_id,
      new.employee_code,
      new.employee_name,
      new.department,
      new.start_date,
      new.end_date,
      array['Company assets returned', 'Access and responsibilities reviewed', 'Pending work closed or assigned'],
      'pending'
    )
    on conflict (leave_application_id) do update set
      request_no = excluded.request_no,
      employee_id = excluded.employee_id,
      employee_code = excluded.employee_code,
      employee_name = excluded.employee_name,
      department = excluded.department,
      leave_start_date = excluded.leave_start_date,
      leave_end_date = excluded.leave_end_date,
      updated_at = now();
  end if;

  return new;
end;
$$;

create trigger sync_leave_clearance_after_application_write
after insert or update of status, employee_id, employee_code, employee_name, department, start_date, end_date
on public.leave_applications
for each row execute function public.sync_leave_clearance_from_application();

insert into public.leave_clearances (
  leave_application_id,
  request_no,
  employee_id,
  employee_code,
  employee_name,
  department,
  leave_start_date,
  leave_end_date,
  clearance_items,
  status
)
select
  application.id,
  application.request_no,
  application.employee_id,
  application.employee_code,
  application.employee_name,
  application.department,
  application.start_date,
  application.end_date,
  array['Company assets returned', 'Access and responsibilities reviewed', 'Pending work closed or assigned'],
  'pending'
from public.leave_applications application
where application.status = 'approved'
on conflict (leave_application_id) do nothing;

alter table public.leave_clearances enable row level security;

create policy leave_clearances_select on public.leave_clearances
for select to authenticated
using (
  public.has_permission('hr','view')
  or public.is_management()
  or exists (
    select 1
    from public.leave_applications application
    where application.id = leave_clearances.leave_application_id
      and application.created_by = (select auth.uid())
  )
);

create policy leave_clearances_update on public.leave_clearances
for update to authenticated
using (public.has_permission('hr','update') or public.is_management())
with check (public.has_permission('hr','update') or public.is_management());

create policy leave_clearances_insert on public.leave_clearances
for insert to authenticated
with check (public.has_permission('hr','create'));

create policy leave_clearances_delete on public.leave_clearances
for delete to authenticated
using (public.has_permission('hr','delete'));

grant select, insert, update, delete on public.leave_clearances to authenticated;

revoke all on function public.sync_leave_clearance_from_application() from public;

commit;
