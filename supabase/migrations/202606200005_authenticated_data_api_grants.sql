begin;

-- RLS controls rows, while PostgreSQL grants control whether the Supabase Data API
-- can reach a table at all. Keep both layers explicit and independently testable.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Audit events are trigger-owned and document numbering is function-owned.
revoke insert, update, delete on public.audit_logs from authenticated;
revoke insert, update, delete on public.document_sequences from authenticated;

-- Future migrations must opt into RLS, but receive the Data API table privileges.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

commit;
