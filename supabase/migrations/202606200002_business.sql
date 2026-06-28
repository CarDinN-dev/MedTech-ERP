begin;

create table public.chart_of_accounts (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
  account_type text not null check (account_type in ('asset','liability','equity','revenue','expense')),
  parent_id uuid references public.chart_of_accounts(id), currency char(3) default 'QAR', allow_posting boolean not null default true,
  status public.record_status not null default 'active', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(), lead_number text not null unique default public.next_document_number('lead'),
  title text not null, company_name text, contact_name text, email citext, phone text, source text,
  owner_id uuid references public.profiles(id), department_id uuid references public.departments(id),
  estimated_value numeric(16,2), currency char(3) not null default 'QAR', score smallint check (score between 0 and 100),
  status public.record_status not null default 'active', next_follow_up_at timestamptz,
  created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(), opportunity_number text not null unique default public.next_document_number('opportunity'),
  lead_id uuid references public.leads(id), customer_id uuid references public.parties(id), title text not null,
  stage text not null default 'qualified', probability smallint not null default 20 check (probability between 0 and 100),
  value numeric(16,2) not null default 0, currency char(3) not null default 'QAR', expected_close_date date,
  owner_id uuid references public.profiles(id), department_id uuid references public.departments(id), lost_reason text,
  status public.record_status not null default 'active',
  created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.quotations (
  id uuid primary key default gen_random_uuid(), quotation_number text not null unique default public.next_document_number('quotation'),
  revision smallint not null default 0, opportunity_id uuid references public.opportunities(id), customer_id uuid not null references public.parties(id),
  quotation_date date not null default current_date, valid_until date, currency char(3) not null default 'QAR', exchange_rate numeric(14,6) not null default 1,
  subtotal numeric(16,2) not null default 0, discount_amount numeric(16,2) not null default 0, tax_amount numeric(16,2) not null default 0, total numeric(16,2) not null default 0,
  terms text, notes text, owner_id uuid references public.profiles(id), status public.record_status not null default 'draft',
  approved_by uuid references public.profiles(id), approved_at timestamptz,
  created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(), quotation_id uuid not null references public.quotations(id) on delete cascade,
  line_number smallint not null, product_id uuid references public.products(id), description text not null,
  quantity numeric(14,3) not null check (quantity > 0), unit_of_measure text not null default 'unit',
  unit_price numeric(16,4) not null, cost_price numeric(16,4), discount_percent numeric(6,3) not null default 0 check (discount_percent between 0 and 100),
  tax_percent numeric(6,3) not null default 0, line_total numeric(16,2) not null, delivery_period text, warranty text,
  unique(quotation_id, line_number)
);

create table public.sales_orders (
  id uuid primary key default gen_random_uuid(), order_number text not null unique default public.next_document_number('sales_order'),
  quotation_id uuid references public.quotations(id), customer_id uuid not null references public.parties(id), order_date date not null default current_date,
  customer_po_number text, expected_delivery_date date, currency char(3) not null default 'QAR', subtotal numeric(16,2) not null default 0,
  discount_amount numeric(16,2) not null default 0, tax_amount numeric(16,2) not null default 0, total numeric(16,2) not null default 0,
  delivery_address jsonb not null default '{}'::jsonb, status public.record_status not null default 'draft', owner_id uuid references public.profiles(id),
  created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.sales_order_items (
  id uuid primary key default gen_random_uuid(), sales_order_id uuid not null references public.sales_orders(id) on delete cascade,
  line_number smallint not null, product_id uuid references public.products(id), description text not null,
  quantity numeric(14,3) not null, quantity_delivered numeric(14,3) not null default 0, quantity_invoiced numeric(14,3) not null default 0,
  unit_price numeric(16,4) not null, discount_percent numeric(6,3) not null default 0, tax_percent numeric(6,3) not null default 0, line_total numeric(16,2) not null,
  unique(sales_order_id, line_number)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(), invoice_number text not null unique default public.next_document_number('invoice'),
  invoice_type text not null default 'customer' check (invoice_type in ('customer','vendor','credit_note','debit_note')),
  party_id uuid not null references public.parties(id), sales_order_id uuid references public.sales_orders(id), invoice_date date not null default current_date,
  due_date date not null, currency char(3) not null default 'QAR', subtotal numeric(16,2) not null default 0, discount_amount numeric(16,2) not null default 0,
  tax_amount numeric(16,2) not null default 0, total numeric(16,2) not null default 0, amount_paid numeric(16,2) not null default 0,
  payment_status text not null default 'unpaid', reference text, notes text, status public.record_status not null default 'draft',
  account_id uuid references public.chart_of_accounts(id), approved_by uuid references public.profiles(id), approved_at timestamptz,
  created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.invoices(id) on delete cascade,
  line_number smallint not null, product_id uuid references public.products(id), description text not null,
  quantity numeric(14,3) not null, unit_price numeric(16,4) not null, discount_percent numeric(6,3) not null default 0,
  tax_percent numeric(6,3) not null default 0, line_total numeric(16,2) not null, account_id uuid references public.chart_of_accounts(id),
  unique(invoice_id, line_number)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(), payment_number text not null unique default public.next_document_number('payment'),
  payment_type text not null check (payment_type in ('receipt','payment')), party_id uuid references public.parties(id), invoice_id uuid references public.invoices(id),
  payment_date date not null default current_date, amount numeric(16,2) not null check (amount > 0), currency char(3) not null default 'QAR',
  method text not null, bank_account text, reference text, status public.record_status not null default 'draft',
  approved_by uuid references public.profiles(id), approved_at timestamptz,
  created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(), expense_number text not null unique default public.next_document_number('expense'),
  employee_id uuid references public.employees(id), expense_date date not null default current_date, category text not null, description text not null,
  amount numeric(16,2) not null check (amount > 0), currency char(3) not null default 'QAR', project_id uuid,
  receipt_document_id uuid references public.documents(id), status public.record_status not null default 'draft',
  approved_by uuid references public.profiles(id), approved_at timestamptz,
  created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.purchase_requests (
  id uuid primary key default gen_random_uuid(), request_number text not null unique default public.next_document_number('purchase_request'),
  department_id uuid references public.departments(id), requested_by uuid not null references public.profiles(id), required_by date,
  justification text, estimated_total numeric(16,2), status public.record_status not null default 'draft', approved_by uuid references public.profiles(id), approved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.purchase_request_items (
  id uuid primary key default gen_random_uuid(), purchase_request_id uuid not null references public.purchase_requests(id) on delete cascade,
  product_id uuid references public.products(id), description text not null, quantity numeric(14,3) not null, estimated_unit_price numeric(16,4), notes text
);

create table public.rfqs (
  id uuid primary key default gen_random_uuid(), rfq_number text not null unique default public.next_document_number('rfq'),
  purchase_request_id uuid references public.purchase_requests(id), vendor_id uuid not null references public.parties(id), issue_date date not null default current_date,
  response_due_date date, vendor_quote_reference text, quoted_total numeric(16,2), currency char(3) not null default 'QAR', status public.record_status not null default 'draft',
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(), order_number text not null unique default public.next_document_number('purchase_order'),
  vendor_id uuid not null references public.parties(id), rfq_id uuid references public.rfqs(id), order_date date not null default current_date,
  expected_date date, currency char(3) not null default 'QAR', subtotal numeric(16,2) not null default 0, discount_amount numeric(16,2) not null default 0,
  tax_amount numeric(16,2) not null default 0, shipping_amount numeric(16,2) not null default 0, total numeric(16,2) not null default 0,
  incoterm text, shipping_terms text, payment_terms text, status public.record_status not null default 'draft',
  approved_by uuid references public.profiles(id), approved_at timestamptz,
  created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(), purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  line_number smallint not null, product_id uuid references public.products(id), description text not null,
  quantity numeric(14,3) not null, quantity_received numeric(14,3) not null default 0, unit_price numeric(16,4) not null,
  discount_percent numeric(6,3) not null default 0, tax_percent numeric(6,3) not null default 0, line_total numeric(16,2) not null,
  unique(purchase_order_id, line_number)
);

create table public.goods_receipts (
  id uuid primary key default gen_random_uuid(), receipt_number text not null unique default public.next_document_number('goods_receipt'),
  purchase_order_id uuid not null references public.purchase_orders(id), received_at timestamptz not null default now(), location_id uuid not null references public.stock_locations(id),
  supplier_delivery_note text, inspection_status text not null default 'pending', status public.record_status not null default 'draft',
  received_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(), shipment_number text not null unique default public.next_document_number('shipment'),
  direction text not null check (direction in ('inbound','outbound')), sales_order_id uuid references public.sales_orders(id), purchase_order_id uuid references public.purchase_orders(id),
  party_id uuid references public.parties(id), carrier_name text, freight_forwarder text, awb_tracking_number text, transport_mode text,
  origin text, destination text, incoterm text, customs_declaration_number text, container_number text,
  estimated_departure date, actual_departure date, estimated_arrival date, actual_arrival date,
  package_count integer, gross_weight_kg numeric(12,3), status public.record_status not null default 'draft',
  created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.delivery_notes (
  id uuid primary key default gen_random_uuid(), delivery_number text not null unique default public.next_document_number('delivery_note'),
  shipment_id uuid references public.shipments(id), sales_order_id uuid references public.sales_orders(id), customer_id uuid not null references public.parties(id),
  delivery_date date not null default current_date, delivery_address jsonb not null default '{}'::jsonb,
  recipient_name text, recipient_signature_path text, confirmed_at timestamptz, status public.record_status not null default 'draft',
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.service_tickets (
  id uuid primary key default gen_random_uuid(), ticket_number text not null unique default public.next_document_number('service_ticket'),
  customer_id uuid not null references public.parties(id), product_id uuid references public.products(id), serial_number text,
  title text not null, description text not null, priority text not null default 'medium', ticket_type text not null default 'corrective',
  assigned_engineer_id uuid references public.employees(id), opened_at timestamptz not null default now(), response_due_at timestamptz, resolution_due_at timestamptz,
  first_response_at timestamptz, resolved_at timestamptz, resolution_notes text, customer_rating smallint check (customer_rating between 1 and 5),
  status public.record_status not null default 'active', created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.equipment_installations (
  id uuid primary key default gen_random_uuid(), installation_number text not null unique default public.next_document_number('installation'),
  customer_id uuid not null references public.parties(id), product_id uuid not null references public.products(id), serial_number text not null,
  location_description text, installed_at date, installed_by uuid references public.employees(id), warranty_start date, warranty_end date,
  next_maintenance_date date, status public.record_status not null default 'active', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.maintenance_schedules (
  id uuid primary key default gen_random_uuid(), installation_id uuid not null references public.equipment_installations(id),
  maintenance_type text not null, scheduled_date date not null, assigned_engineer_id uuid references public.employees(id),
  completed_at timestamptz, service_ticket_id uuid references public.service_tickets(id), checklist jsonb not null default '[]'::jsonb,
  status public.record_status not null default 'pending', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(), project_number text not null unique default public.next_document_number('project'),
  name text not null, customer_id uuid not null references public.parties(id), manager_id uuid references public.profiles(id), department_id uuid references public.departments(id),
  scope_of_work text, start_date date, planned_end_date date, actual_end_date date, contract_value numeric(16,2) not null default 0,
  budget numeric(16,2) not null default 0, currency char(3) not null default 'QAR', completion_percent numeric(5,2) not null default 0,
  status public.record_status not null default 'draft', created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
alter table public.expenses add constraint expenses_project_fk foreign key(project_id) references public.projects(id);

create table public.project_milestones (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  name text not null, description text, due_date date, completed_date date, value numeric(16,2), status public.record_status not null default 'pending',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(), project_id uuid references public.projects(id), milestone_id uuid references public.project_milestones(id),
  title text not null, description text, assigned_to uuid references public.profiles(id), priority text not null default 'medium',
  start_date date, due_date date, completed_at timestamptz, estimated_hours numeric(8,2), actual_hours numeric(8,2),
  status public.record_status not null default 'pending', created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.employees(id), attendance_date date not null,
  check_in timestamptz, check_out timestamptz, work_minutes integer, source text default 'manual', notes text,
  status public.record_status not null default 'active', created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(employee_id, attendance_date)
);

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(), request_number text not null unique default public.next_document_number('leave_request'),
  employee_id uuid not null references public.employees(id), leave_type text not null, start_date date not null, end_date date not null,
  days numeric(5,2) not null, reason text, handover_notes text, status public.record_status not null default 'pending',
  approved_by uuid references public.profiles(id), approved_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.approval_workflows (
  id uuid primary key default gen_random_uuid(), entity_type text not null, name text not null, conditions jsonb not null default '{}'::jsonb,
  steps jsonb not null, is_active boolean not null default true, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.approvals (
  id uuid primary key default gen_random_uuid(), workflow_id uuid references public.approval_workflows(id), entity_type text not null, entity_id uuid not null,
  step_number smallint not null default 1, approver_id uuid not null references public.profiles(id), state public.approval_state not null default 'pending',
  requested_by uuid not null references public.profiles(id), requested_at timestamptz not null default now(), decided_at timestamptz, comments text,
  due_at timestamptz, unique(entity_type, entity_id, step_number, approver_id)
);

do $$ declare t text; begin
  foreach t in array array['chart_of_accounts','leads','opportunities','quotations','sales_orders','invoices','payments','expenses','purchase_requests','rfqs','purchase_orders','goods_receipts','shipments','delivery_notes','service_tickets','equipment_installations','maintenance_schedules','projects','project_milestones','tasks','attendance','leave_requests','approval_workflows'] loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
  foreach t in array array['quotations','sales_orders','invoices','payments','expenses','purchase_orders','shipments','service_tickets','projects','leave_requests','approvals'] loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_row_change()', t, t);
  end loop;
end $$;

create index opportunities_pipeline_idx on public.opportunities(stage, expected_close_date) where deleted_at is null;
create index quotations_customer_idx on public.quotations(customer_id, quotation_date desc) where deleted_at is null;
create index invoices_party_due_idx on public.invoices(party_id, due_date) where deleted_at is null;
create index purchase_orders_vendor_idx on public.purchase_orders(vendor_id, order_date desc) where deleted_at is null;
create index shipments_tracking_idx on public.shipments(awb_tracking_number) where awb_tracking_number is not null;
create index service_tickets_sla_idx on public.service_tickets(status, resolution_due_at) where deleted_at is null;
create index tasks_project_due_idx on public.tasks(project_id, due_date) where deleted_at is null;
create index approvals_queue_idx on public.approvals(approver_id, state, due_at) where state = 'pending';

commit;
