begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.record_status as enum ('draft','pending','approved','rejected','active','inactive','cancelled','completed','archived');
create type public.party_type as enum ('customer','vendor','both');
create type public.approval_state as enum ('pending','approved','rejected','returned','cancelled');

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = timezone('utc', now()); return new; end; $$;

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  module text not null,
  action text not null check (action in ('view','create','update','delete','approve','export','admin')),
  description text,
  unique(module, action)
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key(role_id, permission_id)
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  manager_id uuid,
  parent_id uuid references public.departments(id),
  cost_center text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  employee_number text unique,
  full_name text not null,
  email citext not null unique,
  phone text,
  avatar_url text,
  department_id uuid references public.departments(id),
  job_title text,
  locale text not null default 'en-QA',
  timezone text not null default 'Asia/Qatar',
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  assigned_by uuid references public.profiles(id),
  assigned_at timestamptz not null default now(),
  primary key(user_id, role_id)
);

alter table public.departments add constraint departments_manager_fk foreign key (manager_id) references public.profiles(id);

create table public.company_settings (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null default 'MedTech Corporation Trading W.L.L.',
  trade_name text not null default 'MedTech',
  tax_number text,
  commercial_registration text,
  address_line_1 text default 'Doha, State of Qatar',
  address_line_2 text,
  phone text,
  email citext,
  website text,
  logo_path text,
  default_currency char(3) not null default 'QAR',
  fiscal_year_start smallint not null default 1,
  timezone text not null default 'Asia/Qatar',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.document_sequences (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null unique,
  prefix text not null,
  next_number bigint not null default 1,
  padding smallint not null default 5,
  reset_annually boolean not null default true,
  current_year smallint not null default extract(year from now()),
  updated_at timestamptz not null default now()
);

create or replace function public.next_document_number(p_entity text) returns text
language plpgsql security definer set search_path = public as $$
declare s document_sequences; result text; current_y smallint := extract(year from now());
begin
  select * into s from document_sequences where entity_type = p_entity for update;
  if not found then raise exception 'Unknown document sequence: %', p_entity; end if;
  if s.reset_annually and s.current_year <> current_y then s.next_number := 1; s.current_year := current_y; end if;
  result := s.prefix || '-' || current_y || '-' || lpad(s.next_number::text, s.padding, '0');
  update document_sequences set next_number = s.next_number + 1, current_year = s.current_year, updated_at = now() where id = s.id;
  return result;
end $$;

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id),
  employee_number text not null unique,
  full_name text not null,
  work_email citext unique,
  personal_email citext,
  phone text,
  nationality text,
  date_of_birth date,
  department_id uuid references public.departments(id),
  designation text,
  manager_id uuid references public.employees(id),
  join_date date not null,
  employment_type text not null default 'full_time',
  contract_start date,
  contract_end date,
  basic_salary numeric(14,2),
  allowances jsonb not null default '{}'::jsonb,
  bank_details_encrypted text,
  qid_expiry date,
  passport_expiry date,
  status public.record_status not null default 'active',
  created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  type public.party_type not null,
  code text not null unique,
  legal_name text not null,
  display_name text not null,
  tax_number text,
  commercial_registration text,
  email citext,
  phone text,
  website text,
  payment_terms_days smallint not null default 30,
  credit_limit numeric(16,2) not null default 0,
  currency char(3) not null default 'QAR',
  address jsonb not null default '{}'::jsonb,
  contact_people jsonb not null default '[]'::jsonb,
  status public.record_status not null default 'active',
  created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create view public.customers with (security_invoker = true) as select * from public.parties where type in ('customer','both') and deleted_at is null;
create view public.vendors with (security_invoker = true) as select * from public.parties where type in ('vendor','both') and deleted_at is null;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  parent_id uuid references public.categories(id),
  description text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  barcode text unique,
  name text not null,
  description text,
  category_id uuid references public.categories(id),
  manufacturer text,
  model_number text,
  unit_of_measure text not null default 'unit',
  purchase_price numeric(16,2) not null default 0,
  sale_price numeric(16,2) not null default 0,
  currency char(3) not null default 'QAR',
  minimum_stock numeric(14,3) not null default 0,
  track_serial boolean not null default false,
  track_lot boolean not null default false,
  track_expiry boolean not null default false,
  medical_device_class text,
  storage_conditions text,
  status public.record_status not null default 'active',
  created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.stock_locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, name text not null, type text not null default 'internal',
  parent_id uuid references public.stock_locations(id), address text,
  status public.record_status not null default 'active', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  location_id uuid not null references public.stock_locations(id),
  lot_number text, serial_number text, expiry_date date,
  quantity_on_hand numeric(14,3) not null default 0,
  quantity_reserved numeric(14,3) not null default 0,
  unit_cost numeric(16,4) not null default 0,
  updated_at timestamptz not null default now(),
  unique nulls not distinct (product_id, location_id, lot_number, serial_number)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  movement_number text not null unique default public.next_document_number('stock_movement'),
  product_id uuid not null references public.products(id),
  source_location_id uuid references public.stock_locations(id),
  destination_location_id uuid references public.stock_locations(id),
  lot_number text, serial_number text, expiry_date date,
  quantity numeric(14,3) not null check (quantity > 0), unit_cost numeric(16,4),
  movement_type text not null, reference_type text, reference_id uuid, reason text,
  status public.record_status not null default 'draft', moved_at timestamptz,
  created_by uuid references public.profiles(id), approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  document_number text not null unique default public.next_document_number('document'),
  name text not null, category text not null, entity_type text, entity_id uuid,
  storage_bucket text not null default 'documents', storage_path text not null,
  mime_type text not null, file_size bigint not null check (file_size > 0), checksum text,
  version integer not null default 1, parent_document_id uuid references public.documents(id),
  confidentiality text not null default 'internal', expires_at date, metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.comments (
  id uuid primary key default gen_random_uuid(), entity_type text not null, entity_id uuid not null,
  body text not null, is_internal boolean not null default true,
  created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.activities (
  id uuid primary key default gen_random_uuid(), entity_type text not null, entity_id uuid not null,
  activity_type text not null, title text not null, description text, due_at timestamptz, completed_at timestamptz,
  assigned_to uuid references public.profiles(id), created_by uuid references public.profiles(id), created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null, title text not null, message text, entity_type text, entity_id uuid, read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key, table_name text not null, record_id uuid,
  action text not null, old_data jsonb, new_data jsonb, changed_fields text[],
  user_id uuid, ip_address inet, user_agent text, occurred_at timestamptz not null default now()
);

create or replace function public.audit_row_change() returns trigger language plpgsql security definer set search_path = public as $$
declare old_j jsonb; new_j jsonb; rid uuid;
begin
  old_j := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end;
  new_j := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end;
  rid := coalesce((new_j->>'id')::uuid, (old_j->>'id')::uuid);
  insert into audit_logs(table_name, record_id, action, old_data, new_data, user_id)
  values(tg_table_name, rid, lower(tg_op), old_j, new_j, auth.uid());
  return coalesce(new, old);
end $$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, email)
  values(new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

do $$ declare t text; begin
  foreach t in array array['roles','departments','profiles','employees','parties','categories','products','stock_locations','stock_movements','documents','comments'] loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
  foreach t in array array['employees','parties','products','stock_movements','documents'] loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_row_change()', t, t);
  end loop;
end $$;

create index parties_name_idx on public.parties using gin (to_tsvector('simple', display_name));
create index products_name_idx on public.products using gin (to_tsvector('simple', name || ' ' || sku));
create index inventory_product_location_idx on public.inventory(product_id, location_id);
create index stock_movements_reference_idx on public.stock_movements(reference_type, reference_id);
create index documents_entity_idx on public.documents(entity_type, entity_id) where deleted_at is null;
create index activities_entity_idx on public.activities(entity_type, entity_id);
create index notifications_unread_idx on public.notifications(user_id, created_at desc) where read_at is null;
create index audit_logs_lookup_idx on public.audit_logs(table_name, record_id, occurred_at desc);

commit;
