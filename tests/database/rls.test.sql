select public.test_assert(has_table_privilege('authenticated','public.employees','select'), 'Data API SELECT grant exists');
select public.test_assert(not has_table_privilege('authenticated','public.audit_logs','insert'), 'audit log remains immutable');
select public.test_assert(not has_table_privilege('authenticated','public.document_sequences','update'), 'document numbering remains immutable');

begin;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select public.test_assert(public.has_permission('admin','admin'), 'admin has system administration');
select public.test_assert(public.has_permission('finance','delete'), 'admin bypass covers every permission');
select public.test_assert((select count(*) from public.employees) = 1, 'admin can read protected employees');
rollback;

begin;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select public.test_assert(public.has_permission('hr','view'), 'HR can view HR records');
select public.test_assert(public.has_permission('hr','update'), 'HR can update HR records');
select public.test_assert(public.has_permission('hr','approve'), 'HR can approve HR records');
select public.test_assert(not public.has_permission('finance','view'), 'HR cannot read finance by permission');
select public.test_assert((select count(*) from public.employees) = 1, 'HR RLS exposes employee records');
insert into public.employees(employee_number,full_name,join_date,status) values ('TEST-HR-CREATE','HR Created Employee','2026-06-20','active');
select public.test_assert((select count(*) from public.employees where employee_number='TEST-HR-CREATE') = 1, 'HR RLS permits employee creation');
rollback;

begin;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select public.test_assert(public.has_permission('finance','view'), 'Finance can view finance records');
select public.test_assert(public.has_permission('finance','approve'), 'Finance can approve finance records');
select public.test_assert(not public.has_permission('hr','view'), 'Finance has no HR permission');
select public.test_assert((select count(*) from public.employees) = 0, 'Finance RLS hides employee records');
do $$ declare denied boolean := false; begin
  begin insert into public.employees(employee_number,full_name,join_date,status) values ('TEST-FIN-DENIED','Denied Employee','2026-06-20','active');
  exception when insufficient_privilege then denied := true; end;
  perform public.test_assert(denied, 'Finance RLS denies employee creation');
end $$;
rollback;

begin;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
set local role authenticated;
select public.test_assert(public.has_permission('sales','view'), 'Sales can view sales records');
select public.test_assert(public.has_permission('sales','approve'), 'Sales manager can approve discounts');
select public.test_assert(not public.has_permission('finance','approve'), 'Sales cannot approve finance records');
rollback;

begin;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',true);
set local role authenticated;
select public.test_assert(public.has_permission('shipping','view'), 'Shipping can view shipments');
select public.test_assert(public.has_permission('shipping','update'), 'Shipping can update shipments');
select public.test_assert(not public.has_permission('shipping','approve'), 'Shipping has no approval permission');
rollback;

begin;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',true);
set local role authenticated;
select public.test_assert(public.has_permission('hr','view'), 'Viewer has cross-module read access');
select public.test_assert(public.has_permission('reports','export'), 'Viewer can export reports');
select public.test_assert(not public.has_permission('hr','create'), 'Viewer cannot create records');
select public.test_assert(not public.has_permission('finance','update'), 'Viewer cannot update records');
select public.test_assert((select count(*) from public.employees) = 1, 'Viewer can audit protected employee rows');
rollback;

drop function public.test_assert(boolean,text);
