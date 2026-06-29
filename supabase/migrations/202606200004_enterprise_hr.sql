begin;

-- Enterprise HR extension for MedTech ERP.
-- Authorization remains in role/user_role tables; user-editable JWT metadata is never trusted.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

insert into public.roles(code, name, description) values
  ('hr_officer','HR Officer','Employee lifecycle, recruitment, attendance and documents'),
  ('payroll_manager','Payroll Manager','Salary structures, payroll runs, loans and final settlements'),
  ('department_manager','Department Manager','Manager self-service and team approvals'),
  ('employee','Employee','Employee self-service access')
on conflict(code) do update set name = excluded.name, description = excluded.description;

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.module = 'hr'
where r.code = 'hr_officer' and p.action in ('view','create','update','export')
on conflict do nothing;
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.module = 'hr'
where r.code = 'payroll_manager' and p.action in ('view','create','update','approve','export')
on conflict do nothing;
-- Department Manager and Employee intentionally receive no broad hr.view grant.
-- Their access is constrained by the employee/team policies below.

create or replace function private.current_employee_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.employees where profile_id = auth.uid() and deleted_at is null limit 1;
$$;
revoke all on function private.current_employee_id() from public;
grant execute on function private.current_employee_id() to authenticated;

create or replace function private.manages_employee(p_employee_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.employees team_member
    where team_member.id = p_employee_id
      and team_member.manager_id = private.current_employee_id()
      and team_member.deleted_at is null
  );
$$;
revoke all on function private.manages_employee(uuid) from public;
grant execute on function private.manages_employee(uuid) to authenticated;

alter table public.employees
  add column if not exists first_name text,
  add column if not exists middle_name text,
  add column if not exists last_name text,
  add column if not exists gender text,
  add column if not exists marital_status text,
  add column if not exists qatar_id text,
  add column if not exists qatar_id_expiry date,
  add column if not exists passport_number text,
  add column if not exists visa_number text,
  add column if not exists visa_expiry date,
  add column if not exists address jsonb not null default '{}'::jsonb,
  add column if not exists emergency_contact jsonb not null default '{}'::jsonb,
  add column if not exists designation_id uuid,
  add column if not exists confirmation_date date,
  add column if not exists probation_months smallint not null default 6,
  add column if not exists housing_allowance numeric(14,2) not null default 0,
  add column if not exists transportation_allowance numeric(14,2) not null default 0,
  add column if not exists food_allowance numeric(14,2) not null default 0,
  add column if not exists other_allowances numeric(14,2) not null default 0,
  add column if not exists bank_name text,
  add column if not exists iban_encrypted text,
  add column if not exists account_number_encrypted text,
  add column if not exists photo_path text,
  add column if not exists notes text,
  add column if not exists tags text[] not null default '{}';

create table public.designations (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
  department_id uuid references public.departments(id), grade text, description text,
  status public.record_status not null default 'active', created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
alter table public.employees add constraint employees_designation_fk foreign key (designation_id) references public.designations(id);

create table public.employee_documents (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.employees(id),
  category text not null check (category in ('passport','qid','visa','contract','cv','certificate','offer_letter','payslip','leave_document','hr_letter','other')),
  name text not null, storage_path text not null, mime_type text not null, file_size bigint not null check (file_size > 0),
  version integer not null default 1 check (version > 0), parent_id uuid references public.employee_documents(id),
  issue_date date, expiry_date date, confidentiality text not null default 'hr_employee', checksum text,
  metadata jsonb not null default '{}'::jsonb, created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.employee_history (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.employees(id),
  event_type text not null, title text not null, details jsonb not null default '{}'::jsonb,
  effective_date date not null default current_date, created_by uuid references public.profiles(id), created_at timestamptz not null default now()
);

create table public.recruitment_requests (
  id uuid primary key default gen_random_uuid(), request_number text not null unique default public.next_document_number('recruitment_request'),
  plan_year smallint not null default extract(year from now()), department_id uuid not null references public.departments(id),
  designation_id uuid references public.designations(id), position_title text not null, requested_positions smallint not null check (requested_positions > 0),
  approved_positions smallint not null default 0 check (approved_positions >= 0), filled_positions smallint not null default 0 check (filled_positions >= 0),
  employment_type text not null default 'full_time', justification text, target_date date, budgeted_salary numeric(14,2),
  status text not null default 'draft' check (status in ('draft','submitted','approved','rejected','closed')),
  requested_by uuid not null references public.profiles(id), approved_by uuid references public.profiles(id), approved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.recruitment_candidates (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.recruitment_requests(id),
  full_name text not null, email citext, phone text, nationality text, current_title text,
  stage text not null default 'new' check (stage in ('new','screening','interview','shortlisted','offer','hired','rejected')),
  source text, rating numeric(2,1) check (rating between 0 and 5), cv_path text, documents jsonb not null default '[]'::jsonb,
  notes text, converted_employee_id uuid references public.employees(id), created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.interviews (
  id uuid primary key default gen_random_uuid(), candidate_id uuid not null references public.recruitment_candidates(id),
  interview_type text not null, scheduled_at timestamptz not null, duration_minutes smallint not null default 60,
  interviewers uuid[] not null default '{}', location text, score numeric(5,2), recommendation text,
  notes text, status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled','no_show')),
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(), offer_number text not null unique default public.next_document_number('offer'),
  candidate_id uuid not null references public.recruitment_candidates(id), designation_id uuid references public.designations(id),
  department_id uuid references public.departments(id), proposed_joining_date date, basic_salary numeric(14,2) not null,
  allowances jsonb not null default '{}'::jsonb, terms text, document_path text,
  status text not null default 'draft' check (status in ('draft','pending','approved','sent','accepted','declined','expired')),
  approved_by uuid references public.profiles(id), approved_at timestamptz, created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

alter table public.attendance
  add column if not exists shift_code text,
  add column if not exists late_minutes integer not null default 0,
  add column if not exists early_exit_minutes integer not null default 0,
  add column if not exists overtime_minutes integer not null default 0,
  add column if not exists biometric_reference text;

create table public.attendance_corrections (
  id uuid primary key default gen_random_uuid(), correction_number text not null unique default public.next_document_number('attendance_correction'),
  attendance_id uuid references public.attendance(id), employee_id uuid not null references public.employees(id),
  requested_check_in timestamptz, requested_check_out timestamptz, reason text not null, attachment_path text,
  status text not null default 'submitted' check (status in ('draft','submitted','pending','approved','rejected','completed')),
  reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, review_notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.leave_types (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
  entitlement_days numeric(6,2) not null default 0, accrual_method text not null default 'annual',
  requires_document boolean not null default false, allow_negative boolean not null default false,
  gender_restriction text, paid boolean not null default true, status public.record_status not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.leave_balances (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.employees(id),
  leave_type_id uuid not null references public.leave_types(id), balance_year smallint not null,
  opening numeric(7,2) not null default 0, accrued numeric(7,2) not null default 0,
  used numeric(7,2) not null default 0, adjusted numeric(7,2) not null default 0,
  updated_at timestamptz not null default now(), unique(employee_id, leave_type_id, balance_year)
);
alter table public.leave_requests add column if not exists leave_type_id uuid references public.leave_types(id);
alter table public.leave_requests add column if not exists attachment_path text;
alter table public.leave_requests add column if not exists current_approver_id uuid references public.profiles(id);

create table public.payroll_runs (
  id uuid primary key default gen_random_uuid(), run_number text not null unique default public.next_document_number('payroll_run'),
  period_start date not null, period_end date not null, pay_date date not null, employee_count integer not null default 0,
  gross_total numeric(16,2) not null default 0, deduction_total numeric(16,2) not null default 0, net_total numeric(16,2) not null default 0,
  currency char(3) not null default 'QAR', status text not null default 'draft' check (status in ('draft','generated','validation','pending_approval','approved','locked','paid','cancelled')),
  generated_by uuid references public.profiles(id), approved_by uuid references public.profiles(id), approved_at timestamptz, locked_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  check (period_end >= period_start), unique(period_start, period_end)
);

create table public.payroll_items (
  id uuid primary key default gen_random_uuid(), payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  employee_id uuid not null references public.employees(id), basic_salary numeric(14,2) not null default 0,
  earnings jsonb not null default '{}'::jsonb, deductions jsonb not null default '{}'::jsonb,
  gross_pay numeric(14,2) not null default 0, deduction_total numeric(14,2) not null default 0, net_pay numeric(14,2) not null default 0,
  attendance_days numeric(6,2), absence_days numeric(6,2), overtime_hours numeric(7,2), notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(payroll_run_id, employee_id)
);

create table public.payslips (
  id uuid primary key default gen_random_uuid(), payslip_number text not null unique default public.next_document_number('payslip'),
  payroll_item_id uuid not null unique references public.payroll_items(id) on delete cascade, employee_id uuid not null references public.employees(id),
  document_path text, generated_at timestamptz, published_at timestamptz, viewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.salary_revisions (
  id uuid primary key default gen_random_uuid(), revision_number text not null unique default public.next_document_number('salary_revision'),
  employee_id uuid not null references public.employees(id), effective_date date not null,
  previous_structure jsonb not null, revised_structure jsonb not null, reason text not null,
  status text not null default 'draft' check (status in ('draft','submitted','pending','approved','rejected','completed')),
  requested_by uuid references public.profiles(id), approved_by uuid references public.profiles(id), approved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.loans (
  id uuid primary key default gen_random_uuid(), loan_number text not null unique default public.next_document_number('loan'),
  employee_id uuid not null references public.employees(id), loan_amount numeric(14,2) not null check (loan_amount > 0),
  installment_count smallint not null check (installment_count > 0), installment_amount numeric(14,2) not null check (installment_amount > 0),
  outstanding_balance numeric(14,2) not null, first_deduction_date date, reason text,
  status text not null default 'draft' check (status in ('draft','submitted','pending','approved','active','settled','rejected','cancelled')),
  approved_by uuid references public.profiles(id), approved_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.advances (
  id uuid primary key default gen_random_uuid(), advance_number text not null unique default public.next_document_number('advance'),
  employee_id uuid not null references public.employees(id), amount numeric(14,2) not null check (amount > 0),
  recovery_installments smallint not null default 1 check (recovery_installments > 0), outstanding_balance numeric(14,2) not null,
  reason text, status text not null default 'draft' check (status in ('draft','submitted','pending','approved','active','recovered','rejected','cancelled')),
  approved_by uuid references public.profiles(id), approved_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.gratuity (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.employees(id), calculation_date date not null,
  service_start_date date not null, service_end_date date not null, service_years numeric(8,4) not null,
  last_basic_salary numeric(14,2) not null, eligible_days numeric(10,2) not null, gratuity_amount numeric(14,2) not null,
  calculation_basis jsonb not null default '{}'::jsonb, document_path text,
  status text not null default 'calculated' check (status in ('calculated','pending','approved','settled')),
  calculated_by uuid references public.profiles(id), approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(employee_id, calculation_date)
);

create table public.exit_processes (
  id uuid primary key default gen_random_uuid(), exit_number text not null unique default public.next_document_number('exit_process'),
  employee_id uuid not null references public.employees(id), exit_type text not null check (exit_type in ('resignation','termination','retirement','end_of_contract','other')),
  request_date date not null, last_working_date date, reason text, clearance jsonb not null default '{}'::jsonb,
  final_settlement jsonb not null default '{}'::jsonb, experience_letter_path text, clearance_certificate_path text, final_settlement_path text,
  status text not null default 'draft' check (status in ('draft','submitted','clearance','final_settlement','completed','cancelled')),
  requested_by uuid references public.profiles(id), approved_by uuid references public.profiles(id), completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

insert into public.document_sequences(entity_type, prefix, padding) values
  ('recruitment_request','REC',5),('offer','OFR',5),('attendance_correction','ATC',5),
  ('payroll_run','PAY',5),('payslip','PSL',6),('salary_revision','SALREV',5),
  ('loan','LOAN',5),('advance','ADV',5),('exit_process','EXIT',5)
on conflict(entity_type) do nothing;

insert into public.leave_types(code,name,entitlement_days,accrual_method,requires_document,paid,gender_restriction) values
  ('ANNUAL','Annual Leave',30,'monthly',false,true,null),('SICK','Sick Leave',14,'annual',true,true,null),
  ('EMERGENCY','Emergency Leave',3,'annual',false,true,null),('UNPAID','Unpaid Leave',0,'none',false,false,null),
  ('MATERNITY','Maternity Leave',50,'event',true,true,'female'),('COMPASSIONATE','Compassionate Leave',5,'event',true,true,null)
on conflict(code) do update set name = excluded.name, entitlement_days = excluded.entitlement_days;

-- Targeted indexes for HR operational queues and compliance alerts.
create index if not exists employees_department_status_idx on public.employees(department_id, status) where deleted_at is null;
create index if not exists employees_document_expiry_idx on public.employees(qatar_id_expiry, passport_expiry, visa_expiry) where deleted_at is null and status = 'active';
create index if not exists employee_documents_employee_category_idx on public.employee_documents(employee_id, category, created_at desc) where deleted_at is null;
create index if not exists employee_documents_expiry_idx on public.employee_documents(expiry_date) where expiry_date is not null and deleted_at is null;
create index if not exists employee_history_timeline_idx on public.employee_history(employee_id, effective_date desc, created_at desc);
create index if not exists recruitment_requests_queue_idx on public.recruitment_requests(status, target_date) where deleted_at is null and status not in ('closed','rejected');
create index if not exists recruitment_candidates_pipeline_idx on public.recruitment_candidates(request_id, stage, updated_at desc) where deleted_at is null;
create index if not exists attendance_daily_status_idx on public.attendance(attendance_date, status, employee_id);
create index if not exists attendance_corrections_queue_idx on public.attendance_corrections(status, created_at) where deleted_at is null and status in ('submitted','pending');
create index if not exists leave_requests_employee_dates_idx on public.leave_requests(employee_id, start_date, end_date) where deleted_at is null;
create index if not exists payroll_runs_status_period_idx on public.payroll_runs(status, period_end desc) where deleted_at is null;
create index if not exists payroll_items_employee_idx on public.payroll_items(employee_id, payroll_run_id);
create index if not exists loans_employee_status_idx on public.loans(employee_id, status) where deleted_at is null;
create index if not exists advances_employee_status_idx on public.advances(employee_id, status) where deleted_at is null;
create index if not exists exit_processes_queue_idx on public.exit_processes(status, last_working_date) where deleted_at is null and status not in ('completed','cancelled');

-- Change tracking and immutable audit events for HR records.
do $$ declare t text; begin
  foreach t in array array['designations','employee_documents','recruitment_requests','recruitment_candidates','interviews','offers','attendance_corrections','leave_types','payroll_runs','payroll_items','payslips','salary_revisions','loans','advances','gratuity','exit_processes'] loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
  foreach t in array array['employee_documents','recruitment_requests','recruitment_candidates','offers','attendance_corrections','payroll_runs','payroll_items','salary_revisions','loans','advances','gratuity','exit_processes'] loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_row_change()', t, t);
  end loop;
end $$;

-- Data API grants are separate from RLS and are explicit here.
grant select, insert, update, delete on public.designations, public.employee_documents, public.employee_history,
  public.recruitment_requests, public.recruitment_candidates, public.interviews, public.offers, public.attendance_corrections,
  public.leave_types, public.leave_balances, public.payroll_runs, public.payroll_items, public.payslips,
  public.salary_revisions, public.loans, public.advances, public.gratuity, public.exit_processes to authenticated;

do $$ declare t text; begin
  foreach t in array array['designations','employee_documents','employee_history','recruitment_requests','recruitment_candidates','interviews','offers','attendance_corrections','leave_types','leave_balances','payroll_runs','payroll_items','payslips','salary_revisions','loans','advances','gratuity','exit_processes'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- HR staff access. UPDATE policies intentionally accompany SELECT policies.
do $$ declare t text; begin
  foreach t in array array['designations','employee_documents','employee_history','recruitment_requests','recruitment_candidates','interviews','offers','attendance_corrections','leave_types','leave_balances','payroll_runs','payroll_items','payslips','salary_revisions','loans','advances','gratuity','exit_processes'] loop
    execute format('create policy %I_hr_select on public.%I for select to authenticated using (public.has_permission(%L,%L) or public.is_management())', t, t, 'hr', 'view');
    execute format('create policy %I_hr_insert on public.%I for insert to authenticated with check (public.has_permission(%L,%L))', t, t, 'hr', 'create');
    execute format('create policy %I_hr_update on public.%I for update to authenticated using (public.has_permission(%L,%L)) with check (public.has_permission(%L,%L))', t, t, 'hr', 'update', 'hr', 'update');
    execute format('create policy %I_hr_delete on public.%I for delete to authenticated using (public.has_permission(%L,%L))', t, t, 'hr', 'delete');
  end loop;
end $$;

-- Employee self-service visibility and request creation.
create policy employees_self_select on public.employees for select to authenticated using (id = private.current_employee_id());
create policy employees_manager_select on public.employees for select to authenticated using (private.manages_employee(id));
create policy attendance_self_select on public.attendance for select to authenticated using (employee_id = private.current_employee_id());
create policy attendance_manager_select on public.attendance for select to authenticated using (private.manages_employee(employee_id));
create policy leave_requests_self_select on public.leave_requests for select to authenticated using (employee_id = private.current_employee_id());
create policy leave_requests_self_insert on public.leave_requests for insert to authenticated with check (employee_id = private.current_employee_id());
create policy leave_requests_manager_select on public.leave_requests for select to authenticated using (private.manages_employee(employee_id));
create policy leave_requests_manager_update on public.leave_requests for update to authenticated using (private.manages_employee(employee_id)) with check (private.manages_employee(employee_id));
create policy employee_documents_self_select on public.employee_documents for select to authenticated using (employee_id = private.current_employee_id() and confidentiality in ('employee','hr_employee'));
create policy employee_history_self_select on public.employee_history for select to authenticated using (employee_id = private.current_employee_id());
create policy attendance_corrections_self_select on public.attendance_corrections for select to authenticated using (employee_id = private.current_employee_id());
create policy attendance_corrections_self_insert on public.attendance_corrections for insert to authenticated with check (employee_id = private.current_employee_id());
create policy attendance_corrections_manager_select on public.attendance_corrections for select to authenticated using (private.manages_employee(employee_id));
create policy attendance_corrections_manager_update on public.attendance_corrections for update to authenticated using (private.manages_employee(employee_id)) with check (private.manages_employee(employee_id));
create policy leave_balances_self_select on public.leave_balances for select to authenticated using (employee_id = private.current_employee_id());
create policy leave_balances_manager_select on public.leave_balances for select to authenticated using (private.manages_employee(employee_id));
create policy payroll_items_self_select on public.payroll_items for select to authenticated using (employee_id = private.current_employee_id());
create policy payslips_self_select on public.payslips for select to authenticated using (employee_id = private.current_employee_id());
create policy loans_self_select on public.loans for select to authenticated using (employee_id = private.current_employee_id());
create policy loans_self_insert on public.loans for insert to authenticated with check (employee_id = private.current_employee_id() and status in ('draft','submitted'));
create policy advances_self_select on public.advances for select to authenticated using (employee_id = private.current_employee_id());
create policy advances_self_insert on public.advances for insert to authenticated with check (employee_id = private.current_employee_id() and status in ('draft','submitted'));
create policy gratuity_self_select on public.gratuity for select to authenticated using (employee_id = private.current_employee_id() and status in ('approved','settled'));
create policy exit_processes_self_select on public.exit_processes for select to authenticated using (employee_id = private.current_employee_id());
create policy exit_processes_self_insert on public.exit_processes for insert to authenticated with check (employee_id = private.current_employee_id() and status in ('draft','submitted'));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('hr-private','hr-private',false,20971520,array['application/pdf','image/png','image/jpeg','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do nothing;

create policy storage_hr_private_read on storage.objects for select to authenticated
using (bucket_id = 'hr-private' and (public.has_permission('hr','view') or (storage.foldername(name))[2] = auth.uid()::text));
create policy storage_hr_private_insert on storage.objects for insert to authenticated
with check (bucket_id = 'hr-private' and (public.has_permission('hr','create') or (storage.foldername(name))[2] = auth.uid()::text));
create policy storage_hr_private_update on storage.objects for update to authenticated
using (bucket_id = 'hr-private' and (public.has_permission('hr','update') or (storage.foldername(name))[2] = auth.uid()::text))
with check (bucket_id = 'hr-private' and (public.has_permission('hr','update') or (storage.foldername(name))[2] = auth.uid()::text));
create policy storage_hr_private_delete on storage.objects for delete to authenticated
using (bucket_id = 'hr-private' and public.has_permission('hr','delete'));

commit;
