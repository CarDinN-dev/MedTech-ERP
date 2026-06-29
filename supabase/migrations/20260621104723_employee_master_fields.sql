-- MedTech employee master extension derived from the controlled 90-column HR import.
-- Frequently filtered/reportable attributes remain relational; grouped low-cardinality
-- benefits and document metadata stay structured without weakening existing employee RLS.
alter table public.employees
  add column if not exists employee_category text,
  add column if not exists work_shift text,
  add column if not exists company_name text,
  add column if not exists sponsor_name text,
  add column if not exists wps_sponsor text,
  add column if not exists grade_band text,
  add column if not exists family_status boolean,
  add column if not exists leave_policy text,
  add column if not exists last_rejoin_date date,
  add column if not exists annual_leave_balance numeric(8,2) not null default 0,
  add column if not exists annual_leave_balance_as_of numeric(8,2) not null default 0,
  add column if not exists loss_of_pay_days numeric(8,2) not null default 0,
  add column if not exists business_unit text,
  add column if not exists working_company_name text,
  add column if not exists cost_centre text,
  add column if not exists rp_id_profession text,
  add column if not exists visa_type text,
  add column if not exists hire_type text,
  add column if not exists esb_date date,
  add column if not exists office_mobile text,
  add column if not exists personal_mobile text,
  add column if not exists dependent_count smallint not null default 0,
  add column if not exists blood_group text,
  add column if not exists travel_benefits jsonb not null default '{}'::jsonb,
  add column if not exists company_benefits jsonb not null default '{}'::jsonb,
  add column if not exists work_permit_number text,
  add column if not exists work_permit_issue_date date,
  add column if not exists work_permit_expiry_date date,
  add column if not exists office_file_number text,
  add column if not exists access_card_number text,
  add column if not exists bank_code text,
  add column if not exists education_details jsonb not null default '{}'::jsonb,
  add column if not exists passport_place_of_issue text,
  add column if not exists passport_issue_date date,
  add column if not exists driving_license jsonb not null default '{}'::jsonb,
  add column if not exists insurance_details jsonb not null default '{}'::jsonb,
  add column if not exists mobile_allowance numeric(14,2) not null default 0,
  add column if not exists special_allowance numeric(14,2) not null default 0,
  add column if not exists overtime_amount numeric(14,2) not null default 0,
  add column if not exists employee_master_data jsonb not null default '{}'::jsonb;

alter table public.employees
  add constraint employees_dependent_count_nonnegative check (dependent_count >= 0) not valid,
  add constraint employees_leave_balances_nonnegative check (annual_leave_balance >= 0 and annual_leave_balance_as_of >= 0 and loss_of_pay_days >= 0) not valid,
  add constraint employees_travel_benefits_object check (jsonb_typeof(travel_benefits) = 'object') not valid,
  add constraint employees_company_benefits_object check (jsonb_typeof(company_benefits) = 'object') not valid,
  add constraint employees_education_details_object check (jsonb_typeof(education_details) = 'object') not valid,
  add constraint employees_driving_license_object check (jsonb_typeof(driving_license) = 'object') not valid,
  add constraint employees_insurance_details_object check (jsonb_typeof(insurance_details) = 'object') not valid,
  add constraint employees_master_data_object check (jsonb_typeof(employee_master_data) = 'object') not valid;

create index if not exists employees_category_idx on public.employees(employee_category) where deleted_at is null;
create index if not exists employees_business_unit_idx on public.employees(business_unit) where deleted_at is null;
create index if not exists employees_cost_centre_idx on public.employees(cost_centre) where deleted_at is null;
create index if not exists employees_work_permit_expiry_idx on public.employees(work_permit_expiry_date) where deleted_at is null and work_permit_expiry_date is not null;
create index if not exists employees_master_data_gin_idx on public.employees using gin(employee_master_data jsonb_path_ops);

comment on column public.employees.employee_master_data is 'Lossless source payload for the controlled MedTech 90-column employee import; sensitive bank values remain in encrypted columns.';
comment on column public.employees.travel_benefits is 'Travel sector, cost, employee/family ticket entitlement and current ticket balance.';
comment on column public.employees.company_benefits is 'Accommodation, transportation, overtime eligibility, food and fuel-card entitlements.';
