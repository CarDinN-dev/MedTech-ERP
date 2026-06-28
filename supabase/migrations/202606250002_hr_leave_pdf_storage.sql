begin;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_hr_leave_pdfs_read'
  ) then
    create policy storage_hr_leave_pdfs_read on storage.objects
    for select to authenticated
    using (
      bucket_id = 'documents'
      and name like 'hr/leave-applications/%'
      and (public.has_permission('hr','view') or public.has_permission('approvals','view') or public.is_management())
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_hr_leave_pdfs_insert'
  ) then
    create policy storage_hr_leave_pdfs_insert on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'documents'
      and name like 'hr/leave-applications/%'
      and (public.has_permission('hr','create') or public.has_permission('hr','approve') or public.has_permission('approvals','approve'))
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_hr_leave_pdfs_update'
  ) then
    create policy storage_hr_leave_pdfs_update on storage.objects
    for update to authenticated
    using (
      bucket_id = 'documents'
      and name like 'hr/leave-applications/%'
      and (public.has_permission('hr','update') or public.has_permission('hr','approve') or public.has_permission('approvals','approve'))
    )
    with check (
      bucket_id = 'documents'
      and name like 'hr/leave-applications/%'
      and (public.has_permission('hr','update') or public.has_permission('hr','approve') or public.has_permission('approvals','approve'))
    );
  end if;
end $$;

commit;
