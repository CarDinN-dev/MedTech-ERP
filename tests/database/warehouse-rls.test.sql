create or replace function public.warehouse_test_assert(condition boolean, message text) returns text
language plpgsql as $$
begin
  if not coalesce(condition, false) then raise exception 'TEST FAILED: %', message; end if;
  return 'PASS: ' || message;
end $$;

insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000000101','warehouse.staff.test@medtech.qa','{"full_name":"Warehouse Staff Test"}'),
  ('00000000-0000-4000-8000-000000000102','warehouse.manager.test@medtech.qa','{"full_name":"Warehouse Manager Test"}'),
  ('00000000-0000-4000-8000-000000000103','qa.test@medtech.qa','{"full_name":"QA Officer Test"}'),
  ('00000000-0000-4000-8000-000000000104','sales.user.test@medtech.qa','{"full_name":"Sales User Test"}'),
  ('00000000-0000-4000-8000-000000000105','warehouse.viewer.test@medtech.qa','{"full_name":"Warehouse Viewer Test"}')
on conflict (id) do nothing;

insert into public.user_roles(user_id, role_id)
select mapping.user_id::uuid, roles.id
from (values
  ('00000000-0000-4000-8000-000000000101','warehouse_staff'),
  ('00000000-0000-4000-8000-000000000102','warehouse_manager'),
  ('00000000-0000-4000-8000-000000000103','qa_officer'),
  ('00000000-0000-4000-8000-000000000104','sales_user'),
  ('00000000-0000-4000-8000-000000000105','viewer')
) mapping(user_id, role_code)
join public.roles on roles.code = mapping.role_code
on conflict do nothing;

insert into public.parties(id, type, code, legal_name, display_name)
values ('20000000-0000-4000-8000-000000000001','both','WH-TEST-PARTY','Warehouse Test Party','Warehouse Test Party')
on conflict (id) do nothing;
insert into public.warehouse_product_categories(id, name, code)
values ('21000000-0000-4000-8000-000000000001','Test Reagents','WH-TEST-REAGENTS');
insert into public.warehouse_products(id, sku, product_name, category_id, product_type, unit_of_measure, supplier_id)
values ('22000000-0000-4000-8000-000000000001','WH-TEST-SKU','Warehouse Test Product','21000000-0000-4000-8000-000000000001','reagent','kit','20000000-0000-4000-8000-000000000001');
insert into public.warehouse_locations(id, code, name)
values
  ('23000000-0000-4000-8000-000000000001','WH-TEST-MAIN','Test Main Warehouse'),
  ('23000000-0000-4000-8000-000000000002','WH-TEST-QA','Test QA Warehouse');
insert into public.warehouse_bins(id, location_id, code)
values ('24000000-0000-4000-8000-000000000001','23000000-0000-4000-8000-000000000001','A-01');
insert into public.warehouse_batches(id, product_id, batch_number, supplier_id, expiry_date)
values ('25000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','WH-TEST-BATCH','20000000-0000-4000-8000-000000000001','2027-12-31');
insert into public.warehouse_stock_balances(
  id, product_id, batch_id, location_id, bin_id, physical_quantity,
  reserved_quantity, quarantine_quantity, damaged_quantity, expired_quantity
) values (
  '26000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001',
  '25000000-0000-4000-8000-000000000001','23000000-0000-4000-8000-000000000001',
  '24000000-0000-4000-8000-000000000001',100,15,20,3,2
);
insert into public.warehouse_transfers(id, transfer_number, source_location_id, destination_location_id, prepared_by)
values ('27000000-0000-4000-8000-000000000001','WH-TEST-TRANSFER','23000000-0000-4000-8000-000000000001','23000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000101');

select public.warehouse_test_assert(
  (select available_quantity from public.warehouse_stock_balances where id = '26000000-0000-4000-8000-000000000001') = 60,
  'available quantity is database-generated from protected buckets'
);
select public.warehouse_test_assert(
  not has_table_privilege('authenticated','public.warehouse_stock_balances','update'),
  'authenticated clients cannot directly update stock balances'
);
select public.warehouse_test_assert(
  not has_table_privilege('authenticated','public.warehouse_stock_movements','insert'),
  'authenticated clients cannot directly append movement ledger rows'
);
select public.warehouse_test_assert(
  not has_table_privilege('authenticated','public.warehouse_audit_logs','insert'),
  'warehouse audit log is trigger-owned'
);
select public.warehouse_test_assert(
  (select count(*) from public.warehouse_audit_logs where entity_type = 'warehouse_products') > 0,
  'warehouse changes create immutable audit events'
);

do $$ declare denied boolean := false; begin
  begin delete from public.warehouse_products where id = '22000000-0000-4000-8000-000000000001';
  exception when insufficient_privilege then denied := true; end;
  perform public.warehouse_test_assert(denied, 'hard delete is rejected even for the table owner');
end $$;

begin;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000101',true);
set local role authenticated;
select public.warehouse_test_assert(public.has_permission('warehouse','receive_stock'), 'warehouse staff can receive stock');
select public.warehouse_test_assert(not public.has_permission('warehouse','approve_adjustment'), 'warehouse staff cannot approve adjustments');
select public.warehouse_test_assert((select count(*) from public.warehouse_stock_balances) = 1, 'warehouse staff can view stock');
insert into public.warehouse_receipts(
  receipt_number, supplier_id, destination_location_id
) values ('WH-TEST-RECEIPT','20000000-0000-4000-8000-000000000001','23000000-0000-4000-8000-000000000001');
do $$ declare denied boolean := false; begin
  begin
    insert into public.warehouse_adjustments(
      adjustment_number, product_id, batch_id, location_id, adjustment_type, quantity, reason
    ) values (
      'WH-TEST-DENIED-ADJ','22000000-0000-4000-8000-000000000001','25000000-0000-4000-8000-000000000001',
      '23000000-0000-4000-8000-000000000001','adjustment_in',1,'must be denied'
    );
  exception when insufficient_privilege then denied := true; end;
  perform public.warehouse_test_assert(denied, 'warehouse staff cannot create or approve adjustments');
end $$;
do $$ declare denied boolean := false; begin
  begin update public.warehouse_transfers set status = 'approved' where id = '27000000-0000-4000-8000-000000000001';
  exception when insufficient_privilege then denied := true; end;
  perform public.warehouse_test_assert(denied, 'warehouse staff cannot approve transfers');
end $$;
rollback;

begin;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000102',true);
set local role authenticated;
update public.warehouse_transfers set status = 'approved', approved_by = auth.uid()
where id = '27000000-0000-4000-8000-000000000001';
select public.warehouse_test_assert(
  (select status from public.warehouse_transfers where id = '27000000-0000-4000-8000-000000000001') = 'approved',
  'warehouse manager can approve transfers'
);
rollback;

begin;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000103',true);
set local role authenticated;
select public.warehouse_test_assert(public.has_permission('warehouse','qa_decide'), 'QA officer can decide quarantine stock');
with quarantine as (
  insert into public.warehouse_quarantine_records(batch_id, location_id, quantity, reason)
  values ('25000000-0000-4000-8000-000000000001','23000000-0000-4000-8000-000000000002',5,'QA inspection')
  returning id
)
insert into public.warehouse_qa_approvals(quarantine_record_id, decision, reason)
select id, 'approved', 'Inspection passed' from quarantine;
select public.warehouse_test_assert((select count(*) from public.warehouse_qa_approvals) = 1, 'QA decision is append-only and recorded');
rollback;

begin;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000104',true);
set local role authenticated;
select public.warehouse_test_assert((select count(*) from public.warehouse_stock_balances) = 1, 'sales user can view available stock');
select public.warehouse_test_assert((select count(*) from public.warehouse_receipts) = 0, 'sales user cannot view receiving and cost records');
insert into public.warehouse_reservations(
  reservation_number, product_id, batch_id, location_id, customer_id, quantity
) values (
  'WH-TEST-RESERVATION','22000000-0000-4000-8000-000000000001','25000000-0000-4000-8000-000000000001',
  '23000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',2
);
select public.warehouse_test_assert((select count(*) from public.warehouse_reservations) = 1, 'sales user can create and view reservations');
rollback;

begin;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000105',true);
set local role authenticated;
select public.warehouse_test_assert((select count(*) from public.warehouse_stock_balances) = 0, 'viewer cannot query operational stock tables');
select public.warehouse_test_assert((select count(*) from public.warehouse_audit_logs) = 0, 'viewer cannot query warehouse audit history');
rollback;

drop function public.warehouse_test_assert(boolean,text);
