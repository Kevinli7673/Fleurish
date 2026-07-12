-- The API roles were missing DML privileges on public tables, making every
-- PostgREST/edge-function query fail with "permission denied" despite RLS
-- policies being in place. Restore the standard Supabase grants; RLS still
-- controls row-level access for anon/authenticated.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- Apply the same grants to tables created by future migrations.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
