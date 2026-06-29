begin;

create table public.manpower_plans (
  id uuid primary key default gen_random_uuid(), plan_number text not null unique default public.next_document_number('manpower_plan'),
  department_id uuid not null references public.departments(id), position_title text not null, planned_headcount integer not null default 1 check(planned_headcount > 0),
  target_period text, priority text not null default 'normal' check(priority in ('low','normal','high','critical')),
  budget_qar numeric(14,2) not null default 0 check(budget_qar >= 0), business_rationale text, attachment_path text,
  status text not null default 'draft' check(status in ('draft','submitted','approved','on_hold','closed')),
  created_by uuid references public.profiles(id), approved_by uuid references public.profiles(id), approved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.vacancy_releases (
  id uuid primary key default gen_random_uuid(), release_number text not null unique default public.next_document_number('vacancy_release'),
  recruitment_request_id uuid references public.recruitment_requests(id), department_id uuid not null references public.departments(id),
  position_title text not null, release_date date not null default current_date, closing_date date, posting_channels text[] not null default '{}',
  released_by uuid references public.profiles(id), notes text, attachment_path text,
  status text not null default 'draft' check(status in ('draft','released','published','closed','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  check(closing_date is null or closing_date >= release_date)
);

create table public.absence_records (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.employees(id), absence_date date not null,
  absence_type text not null, duration_days numeric(6,2) not null default 0 check(duration_days >= 0), duration_hours numeric(6,2) not null default 0 check(duration_hours >= 0),
  reason text, payroll_deduction numeric(14,2) not null default 0 check(payroll_deduction >= 0),
  status text not null default 'recorded' check(status in ('recorded','under_review','approved','deducted','closed')),
  reviewed_by uuid references public.profiles(id), created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.leave_plans (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.employees(id), leave_type_id uuid references public.leave_types(id),
  planned_start date not null, planned_end date not null, planned_days numeric(6,2) not null check(planned_days > 0), coverage_employee_id uuid references public.employees(id), notes text,
  status text not null default 'planned' check(status in ('planned','submitted','approved','deferred','cancelled')),
  created_by uuid references public.profiles(id), approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  check(planned_end >= planned_start)
);

create table public.job_handovers (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.employees(id), handover_to_id uuid references public.employees(id),
  handover_date date not null default current_date, pending_tasks text, company_assets text, remarks text,
  status text not null default 'draft' check(status in ('draft','submitted','accepted','returned')),
  accepted_at timestamptz, created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.clearance_records (
  id uuid primary key default gen_random_uuid(), clearance_number text not null unique default public.next_document_number('clearance'), employee_id uuid not null references public.employees(id),
  last_working_day date not null, clearance_reason text not null, hr_status text not null default 'pending', finance_status text not null default 'pending',
  it_status text not null default 'pending', admin_status text not null default 'pending', remarks text,
  status text not null default 'draft' check(status in ('draft','pending','cleared','rejected')),
  created_by uuid references public.profiles(id), completed_by uuid references public.profiles(id), completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.payroll_adjustments (
  id uuid primary key default gen_random_uuid(), adjustment_number text not null unique default public.next_document_number('payroll_adjustment'),
  module_name text not null, employee_id uuid not null references public.employees(id), document_date date not null default current_date,
  payroll_month smallint not null check(payroll_month between 1 and 12), payroll_year smallint not null check(payroll_year between 2020 and 2100),
  quantity numeric(12,2) not null default 1 check(quantity >= 0), rate_amount numeric(14,2) not null default 0 check(rate_amount >= 0),
  fixed_amount numeric(14,2) not null default 0 check(fixed_amount >= 0), calculated_amount numeric(14,2) not null default 0,
  payroll_effect text not null default 'neutral' check(payroll_effect in ('earning','deduction','neutral')), net_payroll_effect numeric(14,2) not null default 0,
  notes text, status text not null default 'draft' check(status in ('draft','submitted','approved','processed','rejected')),
  created_by uuid references public.profiles(id), approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(module_name,employee_id,document_date,payroll_month,payroll_year)
);

insert into public.document_sequences(entity_type,prefix,padding) values
  ('manpower_plan','MPP',5),('vacancy_release','REL',5),('clearance','CLR',5),('payroll_adjustment','PCI',6)
on conflict(entity_type) do nothing;

create index manpower_plans_queue_idx on public.manpower_plans(status,priority,target_period) where deleted_at is null;
create index vacancy_releases_queue_idx on public.vacancy_releases(status,closing_date) where deleted_at is null;
create index absence_records_payroll_idx on public.absence_records(employee_id,absence_date,status) where deleted_at is null;
create index leave_plans_calendar_idx on public.leave_plans(planned_start,planned_end,status) where deleted_at is null;
create index payroll_adjustments_period_idx on public.payroll_adjustments(employee_id,payroll_year,payroll_month,status) where deleted_at is null;

do $$ declare t text; begin
  foreach t in array array['manpower_plans','vacancy_releases','absence_records','leave_plans','job_handovers','clearance_records','payroll_adjustments'] loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()',t,t);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_row_change()',t,t);
    execute format('alter table public.%I enable row level security',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('create policy %I_hr_select on public.%I for select to authenticated using (public.has_permission(%L,%L) or public.is_management())',t,t,'hr','view');
    execute format('create policy %I_hr_insert on public.%I for insert to authenticated with check (public.has_permission(%L,%L))',t,t,'hr','create');
    execute format('create policy %I_hr_update on public.%I for update to authenticated using (public.has_permission(%L,%L)) with check (public.has_permission(%L,%L))',t,t,'hr','update','hr','update');
    execute format('create policy %I_hr_delete on public.%I for delete to authenticated using (public.has_permission(%L,%L))',t,t,'hr','delete');
  end loop;
end $$;

create policy absence_records_self_select on public.absence_records for select to authenticated using(employee_id = private.current_employee_id());
create policy leave_plans_self_all on public.leave_plans for all to authenticated using(employee_id = private.current_employee_id()) with check(employee_id = private.current_employee_id());
create policy job_handovers_self_select on public.job_handovers for select to authenticated using(employee_id = private.current_employee_id() or handover_to_id = private.current_employee_id());
create policy clearance_records_self_select on public.clearance_records for select to authenticated using(employee_id = private.current_employee_id());
create policy payroll_adjustments_self_select on public.payroll_adjustments for select to authenticated using(employee_id = private.current_employee_id() and status in ('approved','processed'));

commit;
