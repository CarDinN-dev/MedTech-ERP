insert into public.roles(code, name, description) values
('super_admin','Super Admin','Full system administration'),
('management','Management','Executive access across all modules'),
('finance_manager','Finance Manager','Finance operations and approvals'),
('hr_manager','HR Manager','People, payroll and employee records'),
('sales_manager','Sales Manager','Commercial pipeline and discount approvals'),
('sales_executive','Sales Executive','Assigned sales records and quotations'),
('shipping_team','Shipping Team','Shipment and delivery operations'),
('warehouse_team','Warehouse Team','Inventory and warehouse operations'),
('procurement_team','Procurement Team','Supplier sourcing and purchasing'),
('service_engineer','Service Engineer','Assigned service and maintenance work'),
('project_manager','Project Manager','Project planning and delivery'),
('auditor','Read-only Auditor','Read-only access with audit trail visibility')
on conflict(code) do update set name = excluded.name, description = excluded.description;

insert into public.permissions(code, module, action, description)
select module || '.' || action, module, action, initcap(action) || ' ' || module
from unnest(array['admin','finance','hr','sales','shipping','inventory','procurement','service','projects','documents','approvals','reports']) module
cross join unnest(array['view','create','update','delete','approve','export','admin']) action
on conflict(code) do nothing;

-- Super Admin receives every permission; Management receives view/export/approve.
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p where r.code = 'super_admin'
on conflict do nothing;
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p where r.code = 'management' and p.action in ('view','export','approve')
on conflict do nothing;

-- Module roles receive normal CRUD/export for their area.
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.module = case r.code
  when 'finance_manager' then 'finance' when 'hr_manager' then 'hr' when 'sales_manager' then 'sales'
  when 'sales_executive' then 'sales' when 'shipping_team' then 'shipping' when 'warehouse_team' then 'inventory'
  when 'procurement_team' then 'procurement' when 'service_engineer' then 'service' when 'project_manager' then 'projects' end
where r.code in ('finance_manager','hr_manager','sales_manager','sales_executive','shipping_team','warehouse_team','procurement_team','service_engineer','project_manager')
  and p.action in ('view','create','update','export')
on conflict do nothing;

-- Managers may approve within their functional area.
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.module = case r.code when 'finance_manager' then 'finance' when 'hr_manager' then 'hr' when 'sales_manager' then 'sales' end and p.action = 'approve'
where r.code in ('finance_manager','hr_manager','sales_manager') on conflict do nothing;

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p where r.code = 'auditor' and p.action in ('view','export') on conflict do nothing;

insert into public.departments(code, name, cost_center) values
('EXEC','Executive Management','CC-100'),('FIN','Finance','CC-200'),('HR','Human Resources','CC-300'),
('SAL','Sales & Marketing','CC-400'),('PRC','Procurement','CC-500'),('WHS','Warehouse','CC-600'),
('LOG','Shipping & Logistics','CC-700'),('SRV','Service & Support','CC-800'),('PRJ','Projects','CC-900')
on conflict(code) do nothing;

insert into public.company_settings(legal_name, trade_name, address_line_1, email, phone, website)
select 'MedTech Corporation Trading W.L.L.','MedTech','Doha, State of Qatar','info@medtech.qa','+974 4400 0000','https://medtech.qa'
where not exists (select 1 from public.company_settings);

insert into public.document_sequences(entity_type, prefix, padding) values
('stock_movement','MOV',6),('document','DOC',6),('lead','LEAD',5),('opportunity','OPP',5),
('quotation','QTN',5),('sales_order','SO',5),('invoice','INV',5),('payment','PAY',5),('expense','EXP',5),
('purchase_request','PR',5),('rfq','RFQ',5),('purchase_order','PO',5),('goods_receipt','GRN',5),
('shipment','SHP',5),('delivery_note','DN',5),('service_ticket','SRV',5),('installation','INS',5),
('project','PRJ',5),('leave_request','LV',5)
on conflict(entity_type) do nothing;

insert into public.categories(name, description) values
('Surgical Devices','Instruments and devices for surgical care'),('Consumables','Single-use and routine clinical supplies'),
('Diagnostics','Diagnostic equipment and systems'),('Life Sciences','Research and life science products'),
('Reagents','Laboratory reagents and kits'),('Equipment','Capital medical equipment'),('Spare Parts','Service and replacement components')
on conflict(name) do nothing;

insert into public.stock_locations(code, name, type) values
('WH-MAIN','Main Doha Warehouse','internal'),('WH-QA','Quality Inspection','internal'),('WH-RET','Returns & Damaged','internal'),('TRANSIT','Goods in Transit','transit')
on conflict(code) do nothing;

insert into public.chart_of_accounts(code,name,account_type) values
('1000','Assets','asset'),('1100','Cash and Bank','asset'),('1200','Accounts Receivable','asset'),('1300','Inventory','asset'),
('2000','Liabilities','liability'),('2100','Accounts Payable','liability'),('3000','Equity','equity'),
('4000','Sales Revenue','revenue'),('4100','Service Revenue','revenue'),('5000','Cost of Goods Sold','expense'),('6000','Operating Expenses','expense')
on conflict(code) do nothing;

