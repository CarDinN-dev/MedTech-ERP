begin;

create table public.leave_handovers (
  id uuid primary key default gen_random_uuid(),
  leave_application_id uuid not null references public.leave_applications(id) on delete cascade,
  request_no text not null,
  employee_id uuid not null references public.employees(id),
  employee_code text not null,
  employee_name text not null,
  leave_start_date date not null,
  leave_end_date date not null,
  handover_to_employee_id uuid not null references public.employees(id),
  handover_to_employee_code text not null,
  handover_to_name text not null,
  tasks_notes text check (tasks_notes is null or char_length(tasks_notes) <= 4000),
  attachment_url text,
  status text not null default 'pending' check (status in ('pending','accepted','cancelled')),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_handovers_one_per_application unique(leave_application_id),
  constraint leave_handovers_not_self check (employee_id <> handover_to_employee_id),
  constraint leave_handovers_date_order check (leave_end_date >= leave_start_date),
  constraint leave_handovers_acceptance_consistent check (
    (status = 'accepted' and accepted_at is not null)
    or (status <> 'accepted')
  )
);

create index leave_handovers_employee_idx on public.leave_handovers(employee_id, status, leave_start_date, leave_end_date);
create index leave_handovers_handover_to_idx on public.leave_handovers(handover_to_employee_id, status);
create index leave_handovers_search_idx on public.leave_handovers using gin (
  to_tsvector(
    'simple',
    employee_code || ' ' || employee_name || ' ' || request_no || ' ' ||
    handover_to_employee_code || ' ' || handover_to_name || ' ' || status
  )
);

create trigger leave_handovers_updated_at
before update on public.leave_handovers
for each row execute function public.set_updated_at();

create or replace function public.sync_leave_handover_from_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  handover_changed boolean := false;
  target_handover_code text;
  target_handover_name text;
begin
  if tg_op = 'UPDATE' then
    handover_changed := new.handover_to_employee_id is distinct from old.handover_to_employee_id;
  end if;

  if new.handover_to_employee_id is null then
    if tg_op = 'UPDATE' then
      update public.leave_handovers
      set status = 'cancelled',
          accepted_at = null,
          updated_at = now()
      where leave_application_id = new.id
        and status <> 'cancelled';
    end if;
    return new;
  end if;

  if new.status in ('submitted','pending_approval','approved','rejected','cancelled') then
    select
      coalesce(new.handover_to_employee_code, employee.employee_number),
      coalesce(new.handover_to_name, employee.full_name)
    into target_handover_code, target_handover_name
    from public.employees employee
    where employee.id = new.handover_to_employee_id;

    if target_handover_code is null or target_handover_name is null then
      raise exception 'Linked handover employee was not found.';
    end if;

    insert into public.leave_handovers (
      leave_application_id,
      request_no,
      employee_id,
      employee_code,
      employee_name,
      leave_start_date,
      leave_end_date,
      handover_to_employee_id,
      handover_to_employee_code,
      handover_to_name,
      status,
      accepted_at
    )
    values (
      new.id,
      new.request_no,
      new.employee_id,
      new.employee_code,
      new.employee_name,
      new.start_date,
      new.end_date,
      new.handover_to_employee_id,
      target_handover_code,
      target_handover_name,
      case when new.status in ('rejected','cancelled') then 'cancelled' else 'pending' end,
      null
    )
    on conflict (leave_application_id) do update set
      request_no = excluded.request_no,
      employee_id = excluded.employee_id,
      employee_code = excluded.employee_code,
      employee_name = excluded.employee_name,
      leave_start_date = excluded.leave_start_date,
      leave_end_date = excluded.leave_end_date,
      handover_to_employee_id = excluded.handover_to_employee_id,
      handover_to_employee_code = excluded.handover_to_employee_code,
      handover_to_name = excluded.handover_to_name,
      status = case
        when new.status in ('rejected','cancelled') then 'cancelled'
        when handover_changed then 'pending'
        else public.leave_handovers.status
      end,
      accepted_at = case
        when new.status in ('rejected','cancelled') or handover_changed then null
        else public.leave_handovers.accepted_at
      end,
      updated_at = now();
  end if;

  return new;
end;
$$;

create trigger sync_leave_handover_after_application_write
after insert or update of status, employee_id, employee_code, employee_name, start_date, end_date, handover_to_employee_id, handover_to_employee_code, handover_to_name
on public.leave_applications
for each row execute function public.sync_leave_handover_from_application();

insert into public.leave_handovers (
  leave_application_id,
  request_no,
  employee_id,
  employee_code,
  employee_name,
  leave_start_date,
  leave_end_date,
  handover_to_employee_id,
  handover_to_employee_code,
  handover_to_name,
  status
)
select
  application.id,
  application.request_no,
  application.employee_id,
  application.employee_code,
  application.employee_name,
  application.start_date,
  application.end_date,
  application.handover_to_employee_id,
  application.handover_to_employee_code,
  application.handover_to_name,
  case when application.status in ('rejected','cancelled') then 'cancelled' else 'pending' end
from public.leave_applications application
where application.handover_to_employee_id is not null
  and application.status in ('submitted','pending_approval','approved','rejected','cancelled')
on conflict (leave_application_id) do nothing;

alter table public.leave_handovers enable row level security;

create policy leave_handovers_select on public.leave_handovers
for select to authenticated
using (
  public.has_permission('hr','view')
  or public.is_management()
  or exists (
    select 1
    from public.leave_applications application
    where application.id = leave_handovers.leave_application_id
      and application.created_by = (select auth.uid())
  )
  or exists (
    select 1
    from public.employees employee
    where employee.id = leave_handovers.handover_to_employee_id
      and employee.profile_id = (select auth.uid())
  )
);

create policy leave_handovers_update on public.leave_handovers
for update to authenticated
using (
  public.has_permission('hr','update')
  or exists (
    select 1
    from public.employees employee
    where employee.id = leave_handovers.handover_to_employee_id
      and employee.profile_id = (select auth.uid())
  )
)
with check (
  public.has_permission('hr','update')
  or exists (
    select 1
    from public.employees employee
    where employee.id = leave_handovers.handover_to_employee_id
      and employee.profile_id = (select auth.uid())
  )
);

create policy leave_handovers_insert on public.leave_handovers
for insert to authenticated
with check (public.has_permission('hr','create'));

create policy leave_handovers_delete on public.leave_handovers
for delete to authenticated
using (public.has_permission('hr','delete'));

grant select, insert, update, delete on public.leave_handovers to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_hr_leave_handovers_read'
  ) then
    create policy storage_hr_leave_handovers_read on storage.objects
    for select to authenticated
    using (
      bucket_id = 'documents'
      and name like 'hr/leave-handovers/%'
      and (public.has_permission('hr','view') or public.is_management())
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_hr_leave_handovers_insert'
  ) then
    create policy storage_hr_leave_handovers_insert on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'documents'
      and name like 'hr/leave-handovers/%'
      and public.has_permission('hr','update')
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_hr_leave_handovers_update'
  ) then
    create policy storage_hr_leave_handovers_update on storage.objects
    for update to authenticated
    using (
      bucket_id = 'documents'
      and name like 'hr/leave-handovers/%'
      and public.has_permission('hr','update')
    )
    with check (
      bucket_id = 'documents'
      and name like 'hr/leave-handovers/%'
      and public.has_permission('hr','update')
    );
  end if;
end $$;

revoke all on function public.sync_leave_handover_from_application() from public;

commit;
