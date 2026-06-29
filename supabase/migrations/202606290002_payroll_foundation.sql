begin;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  legal_name text not null,
  trade_name text not null,
  tax_number text,
  commercial_registration text,
  default_currency char(3) not null default 'QAR',
  timezone text not null default 'Asia/Qatar',
  status public.record_status not null default 'active',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

insert into public.companies(id, code, legal_name, trade_name, default_currency, timezone)
values ('00000000-0000-4000-9000-000000000001', 'MEDTECH-QA', 'MedTech Corporation Trading W.L.L.', 'MedTech', 'QAR', 'Asia/Qatar')
on conflict(code) do update set legal_name = excluded.legal_name, trade_name = excluded.trade_name, updated_at = now();

alter table public.departments
  add column company_id uuid references public.companies(id) default '00000000-0000-4000-9000-000000000001'::uuid;
update public.departments set company_id = '00000000-0000-4000-9000-000000000001'::uuid where company_id is null;
alter table public.departments alter column company_id set not null;
create unique index departments_company_code_uidx on public.departments(company_id, code) where deleted_at is null;

alter table public.employees
  add column company_id uuid references public.companies(id) default '00000000-0000-4000-9000-000000000001'::uuid;
update public.employees set company_id = '00000000-0000-4000-9000-000000000001'::uuid where company_id is null;
alter table public.employees alter column company_id set not null;

create table public.payroll_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  salary_calculation_method text not null default 'calendar_days' check (salary_calculation_method in ('calendar_days','working_days')),
  default_payable_days numeric(6,2) not null default 30 check (default_payable_days > 0 and default_payable_days <= 31),
  wps_export_settings jsonb not null default '{}'::jsonb check (jsonb_typeof(wps_export_settings) = 'object'),
  gratuity_settings jsonb not null default '{}'::jsonb check (jsonb_typeof(gratuity_settings) = 'object'),
  leave_encashment_calculation text not null default 'basic_salary' check (leave_encashment_calculation in ('basic_salary','gross_salary')),
  status public.record_status not null default 'active' check (status in ('active','inactive')),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(company_id)
);

insert into public.payroll_settings(company_id, wps_export_settings, gratuity_settings)
values (
  '00000000-0000-4000-9000-000000000001',
  '{"format":"qatar_wps","bank_field":"iban_encrypted","sponsor_field":"wps_sponsor"}',
  '{"daily_rate_basis":30,"first_five_years_days":21,"after_five_years_days":30}'
)
on conflict(company_id) do nothing;

insert into public.permissions(code, module, action, description)
select 'payroll.' || action, 'payroll', action, initcap(action) || ' payroll'
from unnest(array['view','create','update','delete','approve','export','admin']) action
on conflict(code) do nothing;

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.module = 'payroll'
where r.code in ('super_admin','payroll_manager')
  and (r.code = 'super_admin' or p.action in ('view','create','update','approve','export'))
on conflict do nothing;

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.module = 'payroll' and p.action in ('view','approve','export')
where r.code in ('finance_manager','management')
on conflict do nothing;

alter table public.payroll_runs drop constraint if exists payroll_runs_period_start_period_end_key;
alter table public.payroll_runs drop constraint if exists payroll_runs_status_check;
update public.payroll_runs
set status = case status
  when 'generated' then 'draft'
  when 'validation' then 'validated'
  when 'pending_approval' then 'validated'
  when 'approved' then 'finalized'
  when 'locked' then 'finalized'
  else status
end;
alter table public.payroll_runs
  add column company_id uuid references public.companies(id) default '00000000-0000-4000-9000-000000000001'::uuid,
  add column department_id uuid references public.departments(id),
  add column month smallint check (month between 1 and 12),
  add column year smallint check (year between 2020 and 2100),
  add column total_gross numeric(16,2) not null default 0 check (total_gross >= 0),
  add column total_deductions numeric(16,2) not null default 0 check (total_deductions >= 0),
  add column total_net numeric(16,2) not null default 0 check (total_net >= 0),
  add column created_by uuid references public.profiles(id),
  add column finalized_by uuid references public.profiles(id),
  add column finalized_at timestamptz,
  add constraint payroll_runs_status_check check (status in ('draft','validated','finalized','paid','cancelled'));
update public.payroll_runs
set company_id = coalesce(company_id, '00000000-0000-4000-9000-000000000001'::uuid),
    month = coalesce(month, extract(month from period_start)::smallint),
    year = coalesce(year, extract(year from period_start)::smallint),
    total_gross = greatest(total_gross, gross_total),
    total_deductions = greatest(total_deductions, deduction_total),
    total_net = greatest(total_net, net_total);
alter table public.payroll_runs
  alter column company_id set not null,
  alter column month set not null,
  alter column year set not null;
create unique index payroll_runs_company_period_department_uidx on public.payroll_runs(company_id, year, month, department_id) nulls not distinct where deleted_at is null and status <> 'cancelled';
create index payroll_runs_company_status_idx on public.payroll_runs(company_id, status, year desc, month desc) where deleted_at is null;

alter table public.payroll_items
  add column employee_code text,
  add column employee_name text,
  add column department text,
  add column designation text,
  add column allowances numeric(14,2) not null default 0 check (allowances >= 0),
  add column gross_salary numeric(14,2) not null default 0 check (gross_salary >= 0),
  add column working_days numeric(6,2) not null default 0 check (working_days >= 0),
  add column paid_days numeric(6,2) not null default 0 check (paid_days >= 0),
  add column unpaid_days numeric(6,2) not null default 0 check (unpaid_days >= 0),
  add column leave_days numeric(6,2) not null default 0 check (leave_days >= 0),
  add column loan_deduction numeric(14,2) not null default 0 check (loan_deduction >= 0),
  add column other_deductions numeric(14,2) not null default 0 check (other_deductions >= 0),
  add column leave_settlement_amount numeric(14,2) not null default 0 check (leave_settlement_amount >= 0),
  add column eos_settlement_amount numeric(14,2) not null default 0 check (eos_settlement_amount >= 0),
  add column total_deductions numeric(14,2) not null default 0 check (total_deductions >= 0),
  add column remarks text,
  add column status text not null default 'draft' check (status in ('draft','validated','finalized','paid','cancelled'));
update public.payroll_items pi
set employee_code = coalesce(pi.employee_code, e.employee_number),
    employee_name = coalesce(pi.employee_name, e.full_name),
    department = coalesce(pi.department, d.name),
    designation = coalesce(pi.designation, e.designation),
    allowances = greatest(pi.allowances, coalesce(e.housing_allowance,0) + coalesce(e.transportation_allowance,0) + coalesce(e.food_allowance,0) + coalesce(e.mobile_allowance,0) + coalesce(e.special_allowance,0) + coalesce(e.other_allowances,0)),
    gross_salary = greatest(pi.gross_salary, pi.basic_salary + pi.allowances),
    total_deductions = greatest(pi.total_deductions, pi.deduction_total)
from public.employees e
left join public.departments d on d.id = e.department_id
where e.id = pi.employee_id;
create index payroll_items_run_status_idx on public.payroll_items(payroll_run_id, status);

alter table public.loans drop constraint if exists loans_status_check;
alter table public.loans
  add column company_id uuid references public.companies(id) default '00000000-0000-4000-9000-000000000001'::uuid,
  add column loan_type text not null default 'employee_loan',
  add column number_of_installments smallint,
  add column start_month smallint check (start_month between 1 and 12),
  add column start_year smallint check (start_year between 2020 and 2100),
  add column balance_amount numeric(14,2),
  add column remarks text,
  add constraint loans_status_check check (status in ('draft','submitted','pending','approved','active','completed','settled','postponed','rejected','cancelled'));
update public.loans
set company_id = coalesce(company_id, '00000000-0000-4000-9000-000000000001'::uuid),
    number_of_installments = coalesce(number_of_installments, installment_count),
    balance_amount = coalesce(balance_amount, outstanding_balance),
    status = case status when 'settled' then 'completed' else status end
where company_id is null or number_of_installments is null or balance_amount is null or status = 'settled';
alter table public.loans
  alter column company_id set not null,
  alter column number_of_installments set not null,
  alter column balance_amount set not null,
  add constraint loans_balance_nonnegative check (balance_amount >= 0);

create table public.loan_installments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  payroll_run_id uuid references public.payroll_runs(id) on delete set null,
  due_month smallint not null check (due_month between 1 and 12),
  due_year smallint not null check (due_year between 2020 and 2100),
  installment_amount numeric(14,2) not null check (installment_amount >= 0),
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  status text not null default 'pending' check (status in ('pending','deducted','postponed','skipped')),
  postponed_to_month smallint check (postponed_to_month between 1 and 12),
  postponed_to_year smallint check (postponed_to_year between 2020 and 2100),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check ((postponed_to_month is null) = (postponed_to_year is null)),
  unique(loan_id, due_month, due_year)
);

create table public.leave_settlements (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  company_id uuid not null references public.companies(id),
  payroll_run_id uuid references public.payroll_runs(id) on delete set null,
  leave_type text not null,
  leave_balance_days numeric(7,2) not null check (leave_balance_days >= 0),
  salary_rate numeric(14,2) not null check (salary_rate >= 0),
  settlement_amount numeric(14,2) not null check (settlement_amount >= 0),
  status text not null default 'draft' check (status in ('draft','approved','posted_to_payroll','cancelled')),
  created_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.end_of_service_settlements (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  company_id uuid not null references public.companies(id),
  resignation_id uuid references public.exit_processes(id) on delete set null,
  payroll_run_id uuid references public.payroll_runs(id) on delete set null,
  last_working_date date not null,
  working_days_salary numeric(14,2) not null default 0 check (working_days_salary >= 0),
  leave_balance_amount numeric(14,2) not null default 0 check (leave_balance_amount >= 0),
  gratuity_amount numeric(14,2) not null default 0 check (gratuity_amount >= 0),
  loan_balance_deduction numeric(14,2) not null default 0 check (loan_balance_deduction >= 0),
  other_deductions numeric(14,2) not null default 0 check (other_deductions >= 0),
  total_payable numeric(14,2) not null default 0 check (total_payable >= 0),
  status text not null default 'draft' check (status in ('draft','approved','posted_to_payroll','paid','cancelled')),
  created_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  paid_at timestamptz,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index companies_status_idx on public.companies(status) where deleted_at is null;
create index employees_company_department_idx on public.employees(company_id, department_id, status) where deleted_at is null;
create index payroll_settings_company_status_idx on public.payroll_settings(company_id, status) where deleted_at is null;
create index loans_company_employee_status_idx on public.loans(company_id, employee_id, status) where deleted_at is null;
create index loan_installments_due_idx on public.loan_installments(due_year, due_month, status) where deleted_at is null;
create index loan_installments_payroll_run_idx on public.loan_installments(payroll_run_id) where payroll_run_id is not null and deleted_at is null;
create index leave_settlements_payroll_idx on public.leave_settlements(company_id, payroll_run_id, status) where deleted_at is null;
create index leave_settlements_employee_idx on public.leave_settlements(employee_id, status) where deleted_at is null;
create index eos_settlements_payroll_idx on public.end_of_service_settlements(company_id, payroll_run_id, status) where deleted_at is null;
create index eos_settlements_employee_idx on public.end_of_service_settlements(employee_id, status) where deleted_at is null;

do $$ declare t text; begin
  foreach t in array array['companies','payroll_settings','loan_installments','leave_settlements','end_of_service_settlements'] loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_row_change()', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

grant select, insert, update, delete on public.payroll_runs, public.payroll_items, public.loans to authenticated;

create policy companies_select on public.companies for select to authenticated
using (public.has_permission('admin','view') or public.has_permission('hr','view') or public.has_permission('payroll','view') or public.is_management());
create policy companies_admin_insert on public.companies for insert to authenticated
with check (public.has_permission('admin','create'));
create policy companies_admin_update on public.companies for update to authenticated
using (public.has_permission('admin','update')) with check (public.has_permission('admin','update'));
create policy companies_admin_delete on public.companies for delete to authenticated
using (public.has_permission('admin','delete'));

do $$ declare t text; begin
  foreach t in array array['payroll_settings','loan_installments','leave_settlements','end_of_service_settlements'] loop
    execute format('create policy %I_payroll_select on public.%I for select to authenticated using (public.has_permission(%L,%L) or public.is_management())', t, t, 'payroll', 'view');
    execute format('create policy %I_payroll_insert on public.%I for insert to authenticated with check (public.has_permission(%L,%L))', t, t, 'payroll', 'create');
    execute format('create policy %I_payroll_update on public.%I for update to authenticated using (public.has_permission(%L,%L)) with check (public.has_permission(%L,%L))', t, t, 'payroll', 'update', 'payroll', 'update');
    execute format('create policy %I_payroll_delete on public.%I for delete to authenticated using (public.has_permission(%L,%L))', t, t, 'payroll', 'delete');
  end loop;
end $$;

create policy payroll_runs_payroll_select on public.payroll_runs for select to authenticated
using (public.has_permission('payroll','view') or public.is_management());
create policy payroll_runs_payroll_insert on public.payroll_runs for insert to authenticated
with check (public.has_permission('payroll','create'));
create policy payroll_runs_payroll_update on public.payroll_runs for update to authenticated
using (public.has_permission('payroll','update')) with check (public.has_permission('payroll','update'));
create policy payroll_runs_payroll_delete on public.payroll_runs for delete to authenticated
using (public.has_permission('payroll','delete'));

create policy payroll_items_payroll_select on public.payroll_items for select to authenticated
using (public.has_permission('payroll','view') or public.is_management());
create policy payroll_items_payroll_insert on public.payroll_items for insert to authenticated
with check (public.has_permission('payroll','create'));
create policy payroll_items_payroll_update on public.payroll_items for update to authenticated
using (public.has_permission('payroll','update')) with check (public.has_permission('payroll','update'));
create policy payroll_items_payroll_delete on public.payroll_items for delete to authenticated
using (public.has_permission('payroll','delete'));

create policy loans_payroll_select on public.loans for select to authenticated
using (public.has_permission('payroll','view') or public.is_management());
create policy loans_payroll_insert on public.loans for insert to authenticated
with check (public.has_permission('payroll','create'));
create policy loans_payroll_update on public.loans for update to authenticated
using (public.has_permission('payroll','update')) with check (public.has_permission('payroll','update'));
create policy loans_payroll_delete on public.loans for delete to authenticated
using (public.has_permission('payroll','delete'));

create policy loan_installments_self_select on public.loan_installments for select to authenticated
using (exists (select 1 from public.loans l where l.id = loan_id and l.employee_id = private.current_employee_id()));
create policy leave_settlements_self_select on public.leave_settlements for select to authenticated
using (employee_id = private.current_employee_id() and status in ('approved','posted_to_payroll'));
create policy eos_settlements_self_select on public.end_of_service_settlements for select to authenticated
using (employee_id = private.current_employee_id() and status in ('approved','posted_to_payroll','paid'));

comment on table public.payroll_settings is 'Company payroll calculation, WPS, gratuity and leave encashment settings.';
comment on table public.payroll_items is 'Payroll run employee lines with immutable employee and salary snapshots for each run.';
comment on table public.loan_installments is 'Scheduled employee loan installments and payroll deduction state.';
comment on table public.leave_settlements is 'Approved leave encashment amounts, optionally posted into payroll.';
comment on table public.end_of_service_settlements is 'End-of-service final settlement amounts, optionally posted into payroll.';

commit;
