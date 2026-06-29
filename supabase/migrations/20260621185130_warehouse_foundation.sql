begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.warehouse_qa_status as enum ('pending', 'approved', 'rejected', 'blocked');
create type public.warehouse_stock_status as enum ('available', 'quarantine', 'expired', 'damaged', 'recalled', 'blocked');
create type public.warehouse_movement_type as enum (
  'receipt', 'qa_release', 'qa_reject', 'transfer_out', 'transfer_in',
  'reservation', 'reservation_release', 'dispatch', 'adjustment_in',
  'adjustment_out', 'damage_writeoff', 'expiry_writeoff',
  'return_from_customer', 'return_to_supplier', 'recall_block',
  'stock_count_adjustment'
);
create type public.warehouse_document_status as enum (
  'draft', 'pending', 'approved', 'rejected', 'in_progress',
  'completed', 'cancelled', 'archived'
);

create table public.warehouse_product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  parent_id uuid references public.warehouse_product_categories(id),
  description text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint warehouse_product_categories_name_not_blank check (btrim(name) <> ''),
  constraint warehouse_product_categories_code_not_blank check (btrim(code) <> '')
);

create table public.warehouse_products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  product_name text not null,
  category_id uuid references public.warehouse_product_categories(id),
  product_type text not null,
  description text,
  unit_of_measure text not null,
  supplier_id uuid references public.parties(id),
  storage_requirement text,
  temperature_min numeric(6,2),
  temperature_max numeric(6,2),
  is_batch_tracked boolean not null default true,
  is_expiry_tracked boolean not null default true,
  is_ldl_item boolean not null default false,
  compatible_analyzer text,
  reorder_level numeric(14,3) not null default 0,
  reorder_quantity numeric(14,3) not null default 0,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint warehouse_products_sku_not_blank check (btrim(sku) <> ''),
  constraint warehouse_products_name_not_blank check (btrim(product_name) <> ''),
  constraint warehouse_products_uom_not_blank check (btrim(unit_of_measure) <> ''),
  constraint warehouse_products_temperature_range check (
    temperature_min is null or temperature_max is null or temperature_min <= temperature_max
  ),
  constraint warehouse_products_reorder_nonnegative check (reorder_level >= 0 and reorder_quantity >= 0)
);

create table public.warehouse_locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  location_type text not null default 'warehouse',
  address text,
  is_temperature_controlled boolean not null default false,
  temperature_min numeric(6,2),
  temperature_max numeric(6,2),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint warehouse_locations_temperature_range check (
    temperature_min is null or temperature_max is null or temperature_min <= temperature_max
  )
);

create table public.warehouse_bins (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.warehouse_locations(id),
  code text not null,
  name text,
  zone text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (location_id, code)
);

create table public.warehouse_batches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.warehouse_products(id),
  batch_number text not null,
  lot_number text,
  supplier_id uuid references public.parties(id),
  manufacture_date date,
  expiry_date date,
  received_date date not null default current_date,
  qa_status public.warehouse_qa_status not null default 'pending',
  stock_status public.warehouse_stock_status not null default 'quarantine',
  certificate_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (product_id, batch_number),
  constraint warehouse_batches_dates_valid check (
    manufacture_date is null or expiry_date is null or manufacture_date <= expiry_date
  )
);

create table public.warehouse_stock_balances (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.warehouse_products(id),
  batch_id uuid references public.warehouse_batches(id),
  location_id uuid not null references public.warehouse_locations(id),
  bin_id uuid references public.warehouse_bins(id),
  physical_quantity numeric(14,3) not null default 0,
  reserved_quantity numeric(14,3) not null default 0,
  available_quantity numeric(14,3) generated always as (
    physical_quantity - reserved_quantity - quarantine_quantity - damaged_quantity - expired_quantity
  ) stored,
  quarantine_quantity numeric(14,3) not null default 0,
  damaged_quantity numeric(14,3) not null default 0,
  expired_quantity numeric(14,3) not null default 0,
  updated_at timestamptz not null default now(),
  unique nulls not distinct (product_id, batch_id, location_id, bin_id),
  constraint warehouse_stock_balances_nonnegative check (
    physical_quantity >= 0 and reserved_quantity >= 0 and quarantine_quantity >= 0
    and damaged_quantity >= 0 and expired_quantity >= 0
  ),
  constraint warehouse_stock_balances_allocations_valid check (
    reserved_quantity + quarantine_quantity + damaged_quantity + expired_quantity <= physical_quantity
  )
);

create table public.warehouse_stock_movements (
  id uuid primary key default gen_random_uuid(),
  movement_type public.warehouse_movement_type not null,
  product_id uuid not null references public.warehouse_products(id),
  batch_id uuid references public.warehouse_batches(id),
  source_location_id uuid references public.warehouse_locations(id),
  source_bin_id uuid references public.warehouse_bins(id),
  destination_location_id uuid references public.warehouse_locations(id),
  destination_bin_id uuid references public.warehouse_bins(id),
  quantity numeric(14,3) not null,
  reference_type text,
  reference_id uuid,
  reason text,
  performed_by uuid not null default auth.uid() references public.profiles(id),
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint warehouse_stock_movements_quantity_positive check (quantity > 0),
  constraint warehouse_stock_movements_has_location check (
    source_location_id is not null or destination_location_id is not null
  )
);

create table public.warehouse_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  supplier_id uuid not null references public.parties(id),
  purchase_order_id uuid references public.purchase_orders(id),
  destination_location_id uuid not null references public.warehouse_locations(id),
  supplier_delivery_note text,
  received_at timestamptz not null default now(),
  status public.warehouse_document_status not null default 'draft',
  notes text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.warehouse_receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.warehouse_receipts(id),
  line_number smallint not null,
  product_id uuid not null references public.warehouse_products(id),
  batch_id uuid references public.warehouse_batches(id),
  destination_bin_id uuid references public.warehouse_bins(id),
  quantity_received numeric(14,3) not null,
  unit_cost numeric(16,4),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (receipt_id, line_number),
  constraint warehouse_receipt_items_quantity_positive check (quantity_received > 0),
  constraint warehouse_receipt_items_cost_nonnegative check (unit_cost is null or unit_cost >= 0)
);

create table public.warehouse_quarantine_records (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.warehouse_batches(id),
  receipt_item_id uuid references public.warehouse_receipt_items(id),
  location_id uuid not null references public.warehouse_locations(id),
  bin_id uuid references public.warehouse_bins(id),
  quantity numeric(14,3) not null,
  reason text not null,
  status public.warehouse_qa_status not null default 'pending',
  quarantined_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint warehouse_quarantine_quantity_positive check (quantity > 0)
);

create table public.warehouse_qa_approvals (
  id uuid primary key default gen_random_uuid(),
  quarantine_record_id uuid not null references public.warehouse_quarantine_records(id),
  decision public.warehouse_qa_status not null,
  reason text,
  inspection_results jsonb not null default '{}'::jsonb,
  approved_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint warehouse_qa_approvals_final_decision check (decision in ('approved', 'rejected', 'blocked'))
);

create table public.warehouse_transfers (
  id uuid primary key default gen_random_uuid(),
  transfer_number text not null unique,
  source_location_id uuid not null references public.warehouse_locations(id),
  destination_location_id uuid not null references public.warehouse_locations(id),
  status public.warehouse_document_status not null default 'draft',
  reason text,
  prepared_by uuid not null default auth.uid() references public.profiles(id),
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint warehouse_transfers_distinct_locations check (source_location_id <> destination_location_id)
);

create table public.warehouse_transfer_items (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.warehouse_transfers(id),
  line_number smallint not null,
  product_id uuid not null references public.warehouse_products(id),
  batch_id uuid references public.warehouse_batches(id),
  source_bin_id uuid references public.warehouse_bins(id),
  destination_bin_id uuid references public.warehouse_bins(id),
  quantity numeric(14,3) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (transfer_id, line_number),
  constraint warehouse_transfer_items_quantity_positive check (quantity > 0)
);

create table public.warehouse_dispatches (
  id uuid primary key default gen_random_uuid(),
  dispatch_number text not null unique,
  customer_id uuid not null references public.parties(id),
  sales_order_id uuid references public.sales_orders(id),
  source_location_id uuid not null references public.warehouse_locations(id),
  dispatch_date date,
  status public.warehouse_document_status not null default 'draft',
  notes text,
  prepared_by uuid not null default auth.uid() references public.profiles(id),
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.warehouse_dispatch_items (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null references public.warehouse_dispatches(id),
  line_number smallint not null,
  product_id uuid not null references public.warehouse_products(id),
  batch_id uuid references public.warehouse_batches(id),
  source_bin_id uuid references public.warehouse_bins(id),
  reservation_id uuid,
  quantity numeric(14,3) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dispatch_id, line_number),
  constraint warehouse_dispatch_items_quantity_positive check (quantity > 0)
);

create table public.warehouse_reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_number text not null unique,
  product_id uuid not null references public.warehouse_products(id),
  batch_id uuid references public.warehouse_batches(id),
  location_id uuid not null references public.warehouse_locations(id),
  bin_id uuid references public.warehouse_bins(id),
  sales_order_id uuid references public.sales_orders(id),
  customer_id uuid references public.parties(id),
  quantity numeric(14,3) not null,
  reserved_until timestamptz,
  status public.warehouse_document_status not null default 'pending',
  reason text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint warehouse_reservations_quantity_positive check (quantity > 0)
);

alter table public.warehouse_dispatch_items
  add constraint warehouse_dispatch_items_reservation_fk
  foreign key (reservation_id) references public.warehouse_reservations(id);

create table public.warehouse_adjustments (
  id uuid primary key default gen_random_uuid(),
  adjustment_number text not null unique,
  product_id uuid not null references public.warehouse_products(id),
  batch_id uuid references public.warehouse_batches(id),
  location_id uuid not null references public.warehouse_locations(id),
  bin_id uuid references public.warehouse_bins(id),
  adjustment_type public.warehouse_movement_type not null,
  quantity numeric(14,3) not null,
  reason text not null,
  status public.warehouse_document_status not null default 'draft',
  prepared_by uuid not null default auth.uid() references public.profiles(id),
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint warehouse_adjustments_type_valid check (
    adjustment_type in ('adjustment_in', 'adjustment_out', 'damage_writeoff', 'expiry_writeoff', 'stock_count_adjustment')
  ),
  constraint warehouse_adjustments_quantity_positive check (quantity > 0)
);

create table public.warehouse_stock_counts (
  id uuid primary key default gen_random_uuid(),
  count_number text not null unique,
  location_id uuid not null references public.warehouse_locations(id),
  count_date date not null default current_date,
  status public.warehouse_document_status not null default 'draft',
  notes text,
  prepared_by uuid not null default auth.uid() references public.profiles(id),
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.warehouse_stock_count_items (
  id uuid primary key default gen_random_uuid(),
  stock_count_id uuid not null references public.warehouse_stock_counts(id),
  product_id uuid not null references public.warehouse_products(id),
  batch_id uuid references public.warehouse_batches(id),
  bin_id uuid references public.warehouse_bins(id),
  expected_quantity numeric(14,3) not null,
  counted_quantity numeric(14,3),
  variance_quantity numeric(14,3) generated always as (counted_quantity - expected_quantity) stored,
  reason text,
  counted_by uuid references public.profiles(id),
  counted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (stock_count_id, product_id, batch_id, bin_id),
  constraint warehouse_stock_count_expected_nonnegative check (expected_quantity >= 0),
  constraint warehouse_stock_count_counted_nonnegative check (counted_quantity is null or counted_quantity >= 0)
);

create table public.warehouse_recall_records (
  id uuid primary key default gen_random_uuid(),
  recall_number text not null unique,
  product_id uuid not null references public.warehouse_products(id),
  batch_id uuid not null references public.warehouse_batches(id),
  recall_type text not null,
  reason text not null,
  initiated_at timestamptz not null default now(),
  status public.warehouse_document_status not null default 'pending',
  initiated_by uuid not null default auth.uid() references public.profiles(id),
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.warehouse_recall_customers (
  id uuid primary key default gen_random_uuid(),
  recall_id uuid not null references public.warehouse_recall_records(id),
  customer_id uuid not null references public.parties(id),
  dispatch_id uuid references public.warehouse_dispatches(id),
  quantity_supplied numeric(14,3) not null default 0,
  quantity_recovered numeric(14,3) not null default 0,
  notified_at timestamptz,
  response_status text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recall_id, customer_id, dispatch_id),
  constraint warehouse_recall_customer_quantities_valid check (
    quantity_supplied >= 0 and quantity_recovered >= 0 and quantity_recovered <= quantity_supplied
  )
);

create table public.warehouse_ldl_kit_usage (
  id uuid primary key default gen_random_uuid(),
  usage_number text not null unique,
  product_id uuid not null references public.warehouse_products(id),
  batch_id uuid references public.warehouse_batches(id),
  customer_id uuid references public.parties(id),
  analyzer_identifier text,
  quantity numeric(14,3) not null,
  usage_date date not null default current_date,
  purpose text,
  notes text,
  status public.warehouse_document_status not null default 'completed',
  recorded_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint warehouse_ldl_usage_quantity_positive check (quantity > 0)
);

create table public.warehouse_reorder_rules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.warehouse_products(id),
  location_id uuid not null references public.warehouse_locations(id),
  reorder_level numeric(14,3) not null,
  reorder_quantity numeric(14,3) not null,
  preferred_supplier_id uuid references public.parties(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (product_id, location_id),
  constraint warehouse_reorder_rules_nonnegative check (reorder_level >= 0 and reorder_quantity > 0)
);

create table public.warehouse_expiry_rules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.warehouse_products(id),
  category_id uuid references public.warehouse_product_categories(id),
  warning_days integer not null,
  critical_days integer not null,
  block_dispatch_days integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint warehouse_expiry_rule_scope check ((product_id is null) <> (category_id is null)),
  constraint warehouse_expiry_rule_days check (
    warning_days >= critical_days and critical_days >= block_dispatch_days and block_dispatch_days >= 0
  )
);

create unique index warehouse_expiry_rules_product_unique
  on public.warehouse_expiry_rules(product_id) where product_id is not null and archived_at is null;
create unique index warehouse_expiry_rules_category_unique
  on public.warehouse_expiry_rules(category_id) where category_id is not null and archived_at is null;

create table public.warehouse_audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  reason text,
  ip_address inet,
  created_at timestamptz not null default now()
);

create or replace function private.warehouse_request_ip() returns inet
language plpgsql stable set search_path = pg_catalog as $$
declare
  headers jsonb;
  raw_ip text;
begin
  begin
    headers := nullif(current_setting('request.headers', true), '')::jsonb;
    raw_ip := split_part(coalesce(headers->>'x-forwarded-for', headers->>'x-real-ip'), ',', 1);
    return nullif(btrim(raw_ip), '')::inet;
  exception when others then
    return null;
  end;
end;
$$;

create or replace function private.audit_warehouse_row_change() returns trigger
language plpgsql security definer
set search_path = pg_catalog, public, private as $$
declare
  old_json jsonb;
  new_json jsonb;
  record_id uuid;
  audit_reason text;
begin
  old_json := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  new_json := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  record_id := coalesce((new_json->>'id')::uuid, (old_json->>'id')::uuid);
  audit_reason := coalesce(new_json->>'reason', old_json->>'reason');

  insert into public.warehouse_audit_logs(
    user_id, action, entity_type, entity_id, old_values, new_values, reason, ip_address
  ) values (
    auth.uid(), lower(tg_op), tg_table_name, record_id, old_json, new_json,
    audit_reason, private.warehouse_request_ip()
  );
  return coalesce(new, old);
end;
$$;

create or replace function private.prevent_warehouse_hard_delete() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  raise exception 'Hard delete is not allowed for warehouse records. Archive the record instead.'
    using errcode = '42501';
end;
$$;

create or replace function private.enforce_warehouse_approval_transition() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.status in ('approved', 'completed') and old.status is distinct from new.status then
    if tg_table_name = 'warehouse_transfers'
       and not public.has_permission('warehouse', 'approve_transfer') then
      raise exception 'Approving a warehouse transfer requires warehouse.approve_transfer'
        using errcode = '42501';
    elsif tg_table_name = 'warehouse_adjustments'
       and not public.has_permission('warehouse', 'approve_adjustment') then
      raise exception 'Approving a warehouse adjustment requires warehouse.approve_adjustment'
        using errcode = '42501';
    elsif tg_table_name = 'warehouse_stock_counts'
       and not public.has_permission('warehouse', 'manage_count') then
      raise exception 'Approving a stock count requires warehouse.manage_count'
        using errcode = '42501';
    end if;
  end if;

  if tg_table_name = 'warehouse_adjustments' then
    if new.adjustment_type in ('damage_writeoff', 'expiry_writeoff')
       and new.status in ('approved', 'completed')
       and not public.has_permission('warehouse', 'writeoff') then
      raise exception 'Approving a warehouse write-off requires warehouse.writeoff'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- Roles and granular warehouse actions coexist with the legacy ERP roles.
alter table public.permissions drop constraint permissions_action_check;
alter table public.permissions add constraint permissions_action_check check (action in (
  'view','create','update','delete','approve','export','admin',
  'view_stock','receive_stock','prepare_transfer','approve_transfer','prepare_dispatch',
  'create_reservation','view_reservation','qa_decide','approve_adjustment','writeoff',
  'manage_count','manage_recall','track_ldl','view_valuation','view_reports',
  'manage_settings','manage_users'
));

insert into public.roles(code, name, description) values
  ('admin', 'Admin', 'Warehouse settings and user administration'),
  ('warehouse_manager', 'Warehouse Manager', 'Warehouse approvals, transfers and write-offs'),
  ('warehouse_staff', 'Warehouse Staff', 'Receiving, transfer and dispatch preparation'),
  ('qa_officer', 'QA Officer', 'Quarantine inspection and disposition'),
  ('sales_user', 'Sales User', 'Available stock and reservation access'),
  ('finance_user', 'Finance User', 'Stock valuation and warehouse reporting'),
  ('viewer', 'Viewer', 'Warehouse dashboards and reports only')
on conflict (code) do update set name = excluded.name, description = excluded.description;

insert into public.permissions(code, module, action, description) values
  ('warehouse.view_stock', 'warehouse', 'view_stock', 'View warehouse stock'),
  ('warehouse.receive_stock', 'warehouse', 'receive_stock', 'Receive stock'),
  ('warehouse.prepare_transfer', 'warehouse', 'prepare_transfer', 'Prepare stock transfers'),
  ('warehouse.approve_transfer', 'warehouse', 'approve_transfer', 'Approve stock transfers'),
  ('warehouse.prepare_dispatch', 'warehouse', 'prepare_dispatch', 'Prepare dispatches'),
  ('warehouse.create_reservation', 'warehouse', 'create_reservation', 'Create stock reservations'),
  ('warehouse.view_reservation', 'warehouse', 'view_reservation', 'View stock reservations'),
  ('warehouse.qa_decide', 'warehouse', 'qa_decide', 'Approve or reject quarantine stock'),
  ('warehouse.approve_adjustment', 'warehouse', 'approve_adjustment', 'Approve stock adjustments'),
  ('warehouse.writeoff', 'warehouse', 'writeoff', 'Approve damage and expiry write-offs'),
  ('warehouse.manage_count', 'warehouse', 'manage_count', 'Prepare and approve stock counts'),
  ('warehouse.manage_recall', 'warehouse', 'manage_recall', 'Manage product recalls'),
  ('warehouse.track_ldl', 'warehouse', 'track_ldl', 'Record LDL kit usage'),
  ('warehouse.view_valuation', 'warehouse', 'view_valuation', 'View stock valuation'),
  ('warehouse.view_reports', 'warehouse', 'view_reports', 'View warehouse reports'),
  ('warehouse.manage_settings', 'warehouse', 'manage_settings', 'Manage warehouse settings'),
  ('warehouse.manage_users', 'warehouse', 'manage_users', 'Manage warehouse users')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code in ('super_admin', 'admin') and p.module = 'warehouse'
on conflict do nothing;

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.module = 'warehouse'
where
  (r.code = 'warehouse_manager' and p.action in ('view_stock','receive_stock','prepare_transfer','approve_transfer','prepare_dispatch','view_reservation','approve_adjustment','writeoff','manage_count','manage_recall','track_ldl','view_valuation','view_reports'))
  or (r.code in ('warehouse_staff', 'warehouse_team') and p.action in ('view_stock','receive_stock','prepare_transfer','prepare_dispatch','view_reservation','track_ldl'))
  or (r.code = 'qa_officer' and p.action in ('view_stock','qa_decide','view_reports'))
  or (r.code in ('sales_user', 'sales_executive', 'sales_manager') and p.action in ('view_stock','create_reservation','view_reservation'))
  or (r.code in ('finance_user', 'finance_manager') and p.action in ('view_stock','view_valuation','view_reports'))
  or (r.code in ('viewer', 'auditor') and p.action in ('view_reports'))
on conflict do nothing;

-- Every warehouse table is RLS protected. No anonymous grants are added.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'warehouse_product_categories','warehouse_products','warehouse_locations','warehouse_bins',
    'warehouse_batches','warehouse_stock_balances','warehouse_stock_movements','warehouse_receipts',
    'warehouse_receipt_items','warehouse_quarantine_records','warehouse_qa_approvals','warehouse_transfers',
    'warehouse_transfer_items','warehouse_dispatches','warehouse_dispatch_items','warehouse_reservations',
    'warehouse_adjustments','warehouse_stock_counts','warehouse_stock_count_items','warehouse_recall_records',
    'warehouse_recall_customers','warehouse_ldl_kit_usage','warehouse_reorder_rules','warehouse_expiry_rules',
    'warehouse_audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon', table_name);
    execute format('revoke delete on table public.%I from authenticated', table_name);
  end loop;
end $$;

-- Read access is purpose-specific. Sales can see availability, but not costs or internal QA data.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'warehouse_product_categories','warehouse_products','warehouse_locations','warehouse_bins',
    'warehouse_batches','warehouse_stock_balances','warehouse_stock_movements'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.has_permission(''warehouse'',''view_stock'') or public.has_permission(''warehouse'',''view_valuation'') or public.is_management())',
      table_name || '_select', table_name
    );
  end loop;

  foreach table_name in array array['warehouse_receipts','warehouse_receipt_items'] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.has_permission(''warehouse'',''receive_stock'') or public.has_permission(''warehouse'',''view_valuation'') or public.is_management())', table_name || '_select', table_name);
  end loop;
  foreach table_name in array array['warehouse_quarantine_records','warehouse_qa_approvals'] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.has_permission(''warehouse'',''qa_decide'') or public.has_permission(''warehouse'',''receive_stock'') or public.is_management())', table_name || '_select', table_name);
  end loop;
  foreach table_name in array array['warehouse_transfers','warehouse_transfer_items'] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.has_permission(''warehouse'',''prepare_transfer'') or public.has_permission(''warehouse'',''approve_transfer'') or public.is_management())', table_name || '_select', table_name);
  end loop;
  foreach table_name in array array['warehouse_dispatches','warehouse_dispatch_items'] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.has_permission(''warehouse'',''prepare_dispatch'') or public.is_management())', table_name || '_select', table_name);
  end loop;
  foreach table_name in array array['warehouse_adjustments','warehouse_stock_counts','warehouse_stock_count_items'] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.has_permission(''warehouse'',''approve_adjustment'') or public.has_permission(''warehouse'',''manage_count'') or public.has_permission(''warehouse'',''view_valuation'') or public.is_management())', table_name || '_select', table_name);
  end loop;
  foreach table_name in array array['warehouse_recall_records','warehouse_recall_customers'] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.has_permission(''warehouse'',''manage_recall'') or public.is_management())', table_name || '_select', table_name);
  end loop;
  execute 'create policy warehouse_ldl_kit_usage_select on public.warehouse_ldl_kit_usage for select to authenticated using (public.has_permission(''warehouse'',''track_ldl'') or public.is_management())';
  foreach table_name in array array['warehouse_reorder_rules','warehouse_expiry_rules'] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.has_permission(''warehouse'',''manage_settings'') or public.has_permission(''warehouse'',''view_valuation'') or public.is_management())', table_name || '_select', table_name);
  end loop;
end $$;

create policy warehouse_reservations_select on public.warehouse_reservations
for select to authenticated using (
  public.has_permission('warehouse','view_reservation')
  or public.has_permission('warehouse','view_stock')
  or public.has_permission('warehouse','view_reports')
  or public.is_management()
);

create policy warehouse_audit_logs_select on public.warehouse_audit_logs
for select to authenticated using (
  public.has_permission('warehouse','manage_settings')
  or public.has_permission('warehouse','approve_adjustment')
  or public.is_management()
);

-- Master data and configuration writes are limited to warehouse administrators.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'warehouse_product_categories','warehouse_products','warehouse_locations','warehouse_bins',
    'warehouse_reorder_rules','warehouse_expiry_rules'
  ] loop
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_permission(''warehouse'',''manage_settings''))', table_name || '_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (public.has_permission(''warehouse'',''manage_settings'')) with check (public.has_permission(''warehouse'',''manage_settings''))', table_name || '_update', table_name);
  end loop;
end $$;

create policy warehouse_batches_insert on public.warehouse_batches for insert to authenticated
with check (public.has_permission('warehouse','receive_stock'));
create policy warehouse_batches_update on public.warehouse_batches for update to authenticated
using (public.has_permission('warehouse','qa_decide') or public.has_permission('warehouse','manage_recall'))
with check (public.has_permission('warehouse','qa_decide') or public.has_permission('warehouse','manage_recall'));

do $$
declare table_name text;
begin
  foreach table_name in array array['warehouse_receipts','warehouse_receipt_items'] loop
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_permission(''warehouse'',''receive_stock''))', table_name || '_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (public.has_permission(''warehouse'',''receive_stock'')) with check (public.has_permission(''warehouse'',''receive_stock''))', table_name || '_update', table_name);
  end loop;
  foreach table_name in array array['warehouse_transfers','warehouse_transfer_items'] loop
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_permission(''warehouse'',''prepare_transfer''))', table_name || '_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (public.has_permission(''warehouse'',''prepare_transfer'') or public.has_permission(''warehouse'',''approve_transfer'')) with check (public.has_permission(''warehouse'',''prepare_transfer'') or public.has_permission(''warehouse'',''approve_transfer''))', table_name || '_update', table_name);
  end loop;
  foreach table_name in array array['warehouse_dispatches','warehouse_dispatch_items'] loop
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_permission(''warehouse'',''prepare_dispatch''))', table_name || '_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (public.has_permission(''warehouse'',''prepare_dispatch'')) with check (public.has_permission(''warehouse'',''prepare_dispatch''))', table_name || '_update', table_name);
  end loop;
  execute 'create policy warehouse_quarantine_records_insert on public.warehouse_quarantine_records for insert to authenticated with check (public.has_permission(''warehouse'',''receive_stock'') or public.has_permission(''warehouse'',''qa_decide''))';
  execute 'create policy warehouse_quarantine_records_update on public.warehouse_quarantine_records for update to authenticated using (public.has_permission(''warehouse'',''qa_decide'')) with check (public.has_permission(''warehouse'',''qa_decide''))';
  execute 'create policy warehouse_qa_approvals_insert on public.warehouse_qa_approvals for insert to authenticated with check (public.has_permission(''warehouse'',''qa_decide''))';
  foreach table_name in array array['warehouse_adjustments','warehouse_stock_counts','warehouse_stock_count_items'] loop
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_permission(''warehouse'',''approve_adjustment'') or public.has_permission(''warehouse'',''manage_count''))', table_name || '_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (public.has_permission(''warehouse'',''approve_adjustment'') or public.has_permission(''warehouse'',''manage_count'')) with check (public.has_permission(''warehouse'',''approve_adjustment'') or public.has_permission(''warehouse'',''manage_count''))', table_name || '_update', table_name);
  end loop;
  foreach table_name in array array['warehouse_recall_records','warehouse_recall_customers'] loop
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_permission(''warehouse'',''manage_recall''))', table_name || '_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (public.has_permission(''warehouse'',''manage_recall'')) with check (public.has_permission(''warehouse'',''manage_recall''))', table_name || '_update', table_name);
  end loop;
end $$;

create policy warehouse_reservations_insert on public.warehouse_reservations for insert to authenticated
with check (public.has_permission('warehouse','create_reservation'));
create policy warehouse_reservations_update on public.warehouse_reservations for update to authenticated
using (created_by = auth.uid() and public.has_permission('warehouse','create_reservation'))
with check (created_by = auth.uid() and public.has_permission('warehouse','create_reservation'));

create policy warehouse_ldl_kit_usage_insert on public.warehouse_ldl_kit_usage for insert to authenticated
with check (public.has_permission('warehouse','track_ldl'));
create policy warehouse_ldl_kit_usage_update on public.warehouse_ldl_kit_usage for update to authenticated
using (public.has_permission('warehouse','track_ldl'))
with check (public.has_permission('warehouse','track_ldl'));

-- Stock balances, movement history and audit logs are never directly mutable over the Data API.
grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;
grant insert, update on public.warehouse_product_categories, public.warehouse_products,
  public.warehouse_locations, public.warehouse_bins, public.warehouse_batches,
  public.warehouse_receipts, public.warehouse_receipt_items, public.warehouse_quarantine_records,
  public.warehouse_qa_approvals, public.warehouse_transfers, public.warehouse_transfer_items,
  public.warehouse_dispatches, public.warehouse_dispatch_items, public.warehouse_reservations,
  public.warehouse_adjustments, public.warehouse_stock_counts, public.warehouse_stock_count_items,
  public.warehouse_recall_records, public.warehouse_recall_customers,
  public.warehouse_ldl_kit_usage, public.warehouse_reorder_rules, public.warehouse_expiry_rules
to authenticated;
revoke insert, update, delete on public.warehouse_stock_balances from authenticated;
revoke insert, update, delete on public.warehouse_stock_movements from authenticated;
revoke insert, update, delete on public.warehouse_audit_logs from authenticated;
revoke update, delete on public.warehouse_qa_approvals from authenticated;

-- Keep helper functions outside the exposed schema and unavailable to API roles.
revoke all on function private.warehouse_request_ip() from public, anon, authenticated;
revoke all on function private.audit_warehouse_row_change() from public, anon, authenticated;
revoke all on function private.prevent_warehouse_hard_delete() from public, anon, authenticated;
revoke all on function private.enforce_warehouse_approval_transition() from public, anon, authenticated;

-- Maintain timestamps, immutable audit history and archive-only deletion semantics.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'warehouse_product_categories','warehouse_products','warehouse_locations','warehouse_bins',
    'warehouse_batches','warehouse_receipts','warehouse_receipt_items','warehouse_quarantine_records',
    'warehouse_transfers','warehouse_transfer_items','warehouse_dispatches','warehouse_dispatch_items',
    'warehouse_reservations','warehouse_adjustments','warehouse_stock_counts','warehouse_stock_count_items',
    'warehouse_recall_records','warehouse_recall_customers','warehouse_ldl_kit_usage',
    'warehouse_reorder_rules','warehouse_expiry_rules'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', table_name || '_updated_at', table_name);
  end loop;

  foreach table_name in array array[
    'warehouse_product_categories','warehouse_products','warehouse_locations','warehouse_bins',
    'warehouse_batches','warehouse_stock_balances','warehouse_stock_movements','warehouse_receipts',
    'warehouse_receipt_items','warehouse_quarantine_records','warehouse_qa_approvals','warehouse_transfers',
    'warehouse_transfer_items','warehouse_dispatches','warehouse_dispatch_items','warehouse_reservations',
    'warehouse_adjustments','warehouse_stock_counts','warehouse_stock_count_items','warehouse_recall_records',
    'warehouse_recall_customers','warehouse_ldl_kit_usage','warehouse_reorder_rules','warehouse_expiry_rules'
  ] loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function private.audit_warehouse_row_change()', table_name || '_audit', table_name);
    execute format('create trigger %I before delete on public.%I for each row execute function private.prevent_warehouse_hard_delete()', table_name || '_no_delete', table_name);
  end loop;
end $$;

create trigger warehouse_transfers_approval_guard
before update on public.warehouse_transfers for each row
execute function private.enforce_warehouse_approval_transition();
create trigger warehouse_adjustments_approval_guard
before update on public.warehouse_adjustments for each row
execute function private.enforce_warehouse_approval_transition();
create trigger warehouse_stock_counts_approval_guard
before update on public.warehouse_stock_counts for each row
execute function private.enforce_warehouse_approval_transition();

create index warehouse_products_category_idx on public.warehouse_products(category_id) where archived_at is null;
create index warehouse_products_supplier_idx on public.warehouse_products(supplier_id) where archived_at is null;
create index warehouse_products_search_idx on public.warehouse_products using gin (to_tsvector('simple', sku || ' ' || product_name));
create index warehouse_bins_location_idx on public.warehouse_bins(location_id) where archived_at is null;
create index warehouse_batches_product_expiry_idx on public.warehouse_batches(product_id, expiry_date) where archived_at is null;
create index warehouse_batches_status_idx on public.warehouse_batches(qa_status, stock_status) where archived_at is null;
create index warehouse_stock_balances_lookup_idx on public.warehouse_stock_balances(product_id, location_id, batch_id);
create index warehouse_stock_balances_available_idx on public.warehouse_stock_balances(product_id, available_quantity) where available_quantity > 0;
create index warehouse_stock_movements_product_created_idx on public.warehouse_stock_movements(product_id, created_at desc);
create index warehouse_stock_movements_reference_idx on public.warehouse_stock_movements(reference_type, reference_id);
create index warehouse_receipts_supplier_idx on public.warehouse_receipts(supplier_id, received_at desc) where archived_at is null;
create index warehouse_receipt_items_receipt_idx on public.warehouse_receipt_items(receipt_id);
create index warehouse_quarantine_status_idx on public.warehouse_quarantine_records(status, created_at) where archived_at is null;
create index warehouse_transfer_items_transfer_idx on public.warehouse_transfer_items(transfer_id);
create index warehouse_dispatch_customer_idx on public.warehouse_dispatches(customer_id, dispatch_date desc) where archived_at is null;
create index warehouse_dispatch_items_dispatch_idx on public.warehouse_dispatch_items(dispatch_id);
create index warehouse_reservations_product_status_idx on public.warehouse_reservations(product_id, status, reserved_until) where archived_at is null;
create index warehouse_recall_batch_idx on public.warehouse_recall_records(batch_id, status) where archived_at is null;
create index warehouse_audit_entity_idx on public.warehouse_audit_logs(entity_type, entity_id, created_at desc);
create index warehouse_audit_user_idx on public.warehouse_audit_logs(user_id, created_at desc);

comment on table public.warehouse_stock_balances is 'System-maintained stock projection. Direct authenticated mutations are prohibited.';
comment on table public.warehouse_stock_movements is 'Immutable warehouse quantity ledger. Future posting functions are the only supported writer.';
comment on table public.warehouse_audit_logs is 'Immutable trigger-owned audit history for warehouse entities.';

commit;
