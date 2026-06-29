begin;

revoke all on function public.next_document_number(text) from public, anon;
grant execute on function public.next_document_number(text) to authenticated;

revoke all on function public.audit_row_change() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

commit;
