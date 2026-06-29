insert into auth.users(id,email,raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000000001','admin.test@medtech.qa','{"full_name":"Admin Test"}'),
  ('00000000-0000-4000-8000-000000000002','hr.test@medtech.qa','{"full_name":"HR Test"}'),
  ('00000000-0000-4000-8000-000000000003','finance.test@medtech.qa','{"full_name":"Finance Test"}'),
  ('00000000-0000-4000-8000-000000000004','sales.test@medtech.qa','{"full_name":"Sales Test"}'),
  ('00000000-0000-4000-8000-000000000005','shipping.test@medtech.qa','{"full_name":"Shipping Test"}'),
  ('00000000-0000-4000-8000-000000000006','viewer.test@medtech.qa','{"full_name":"Viewer Test"}')
on conflict(id) do nothing;

update public.profiles p set department_id = d.id
from public.departments d
where (p.id,d.code) in (
  ('00000000-0000-4000-8000-000000000001','EXEC'),('00000000-0000-4000-8000-000000000002','HR'),
  ('00000000-0000-4000-8000-000000000003','FIN'),('00000000-0000-4000-8000-000000000004','SAL'),
  ('00000000-0000-4000-8000-000000000005','LOG'),('00000000-0000-4000-8000-000000000006','EXEC')
);

insert into public.user_roles(user_id,role_id)
select mapping.user_id::uuid, roles.id
from (values
  ('00000000-0000-4000-8000-000000000001','super_admin'),
  ('00000000-0000-4000-8000-000000000002','hr_manager'),
  ('00000000-0000-4000-8000-000000000003','finance_manager'),
  ('00000000-0000-4000-8000-000000000004','sales_manager'),
  ('00000000-0000-4000-8000-000000000005','shipping_team'),
  ('00000000-0000-4000-8000-000000000006','auditor')
) mapping(user_id,role_code)
join public.roles on roles.code = mapping.role_code
on conflict do nothing;

insert into public.employees(id,profile_id,employee_number,full_name,work_email,department_id,designation,join_date,status)
select '10000000-0000-4000-8000-000000000002', p.id, 'TEST-HR-001', p.full_name, p.email, p.department_id, 'HR Manager', '2026-01-01', 'active'
from public.profiles p where p.id = '00000000-0000-4000-8000-000000000002'
on conflict(employee_number) do nothing;

create or replace function public.test_assert(condition boolean, message text) returns text
language plpgsql as $$
begin
  if not coalesce(condition,false) then raise exception 'TEST FAILED: %', message; end if;
  return 'PASS: ' || message;
end $$;
grant execute on function public.test_assert(boolean,text) to authenticated;
