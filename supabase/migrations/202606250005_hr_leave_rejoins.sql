begin;

create table public.leave_rejoins (
  id uuid primary key default gen_random_uuid(),
  leave_application_id uuid not null references public.leave_applications(id) on delete cascade,
  request_no text not null,
  employee_id uuid not null references public.employees(id),
  employee_code text not null,
  employee_name text not null,
  original_return_date date not null,
  actual_rejoin_date date,
  delay_days integer not null default 0 check (delay_days >= 0),
  reason_for_delay text check (reason_for_delay is null or char_length(reason_for_delay) <= 4000),
  medical_or_supporting_attachment text,
  status text not null default 'pending_rejoin' check (status in ('pending_rejoin','rejoined_on_time','delayed_rejoin','no_show','verified')),
  hr_verified_by text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_rejoins_one_per_application unique(leave_application_id),
  constraint leave_rejoins_actual_requires_recorded_status check (
    status in ('pending_rejoin','no_show') or actual_rejoin_date is not null
  ),
  constraint leave_rejoins_verified_consistent check (
    (status = 'verified' and actual_rejoin_date is not null and hr_verified_by is not null and verified_at is not null)
    or (status <> 'verified')
  )
);

create index leave_rejoins_employee_idx on public.leave_rejoins(employee_id, status, original_return_date, actual_rejoin_date);
create index leave_rejoins_return_date_idx on public.leave_rejoins(original_return_date, actual_rejoin_date);
create index leave_rejoins_search_idx on public.leave_rejoins using gin (
  to_tsvector(
    'simple',
    employee_code || ' ' || employee_name || ' ' || request_no || ' ' || status
  )
);

create trigger leave_rejoins_updated_at
before update on public.leave_rejoins
for each row execute function public.set_updated_at();

create or replace function public.normalize_leave_rejoin()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.actual_rejoin_date is null then
    new.delay_days := 0;
  else
    new.delay_days := greatest((new.actual_rejoin_date - new.original_return_date), 0);
  end if;

  if new.status = 'verified' and new.verified_at is null then
    new.verified_at := now();
  end if;

  if new.status <> 'verified' then
    new.verified_at := null;
    new.hr_verified_by := null;
  end if;

  return new;
end;
$$;

create trigger normalize_leave_rejoin_before_write
before insert or update on public.leave_rejoins
for each row execute function public.normalize_leave_rejoin();

create or replace function public.sync_leave_rejoin_from_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' then
    insert into public.leave_rejoins (
      leave_application_id,
      request_no,
      employee_id,
      employee_code,
      employee_name,
      original_return_date,
      status
    )
    values (
      new.id,
      new.request_no,
      new.employee_id,
      new.employee_code,
      new.employee_name,
      new.end_date + 1,
      'pending_rejoin'
    )
    on conflict (leave_application_id) do update set
      request_no = excluded.request_no,
      employee_id = excluded.employee_id,
      employee_code = excluded.employee_code,
      employee_name = excluded.employee_name,
      original_return_date = excluded.original_return_date,
      updated_at = now();
  end if;

  return new;
end;
$$;

create trigger sync_leave_rejoin_after_application_write
after insert or update of status, employee_id, employee_code, employee_name, end_date
on public.leave_applications
for each row execute function public.sync_leave_rejoin_from_application();

insert into public.leave_rejoins (
  leave_application_id,
  request_no,
  employee_id,
  employee_code,
  employee_name,
  original_return_date,
  status
)
select
  application.id,
  application.request_no,
  application.employee_id,
  application.employee_code,
  application.employee_name,
  application.end_date + 1,
  'pending_rejoin'
from public.leave_applications application
where application.status = 'approved'
on conflict (leave_application_id) do nothing;

alter table public.leave_rejoins enable row level security;

create policy leave_rejoins_select on public.leave_rejoins
for select to authenticated
using (
  public.has_permission('hr','view')
  or public.is_management()
  or exists (
    select 1
    from public.leave_applications application
    where application.id = leave_rejoins.leave_application_id
      and application.created_by = (select auth.uid())
  )
);

create policy leave_rejoins_update on public.leave_rejoins
for update to authenticated
using (public.has_permission('hr','update') or public.is_management())
with check (public.has_permission('hr','update') or public.is_management());

create policy leave_rejoins_insert on public.leave_rejoins
for insert to authenticated
with check (public.has_permission('hr','create'));

create policy leave_rejoins_delete on public.leave_rejoins
for delete to authenticated
using (public.has_permission('hr','delete'));

grant select, insert, update, delete on public.leave_rejoins to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_hr_leave_rejoins_read'
  ) then
    create policy storage_hr_leave_rejoins_read on storage.objects
    for select to authenticated
    using (
      bucket_id = 'documents'
      and name like 'hr/leave-rejoins/%'
      and (public.has_permission('hr','view') or public.is_management())
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_hr_leave_rejoins_insert'
  ) then
    create policy storage_hr_leave_rejoins_insert on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'documents'
      and name like 'hr/leave-rejoins/%'
      and public.has_permission('hr','update')
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_hr_leave_rejoins_update'
  ) then
    create policy storage_hr_leave_rejoins_update on storage.objects
    for update to authenticated
    using (
      bucket_id = 'documents'
      and name like 'hr/leave-rejoins/%'
      and public.has_permission('hr','update')
    )
    with check (
      bucket_id = 'documents'
      and name like 'hr/leave-rejoins/%'
      and public.has_permission('hr','update')
    );
  end if;
end $$;

revoke all on function public.normalize_leave_rejoin() from public;
revoke all on function public.sync_leave_rejoin_from_application() from public;

commit;
