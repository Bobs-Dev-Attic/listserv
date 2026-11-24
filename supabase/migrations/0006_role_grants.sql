-- The anon/authenticated roles need base table privileges; RLS then restricts
-- which rows they can actually touch. (Tables were created via migration
-- without Supabase's default auto-grants, so grant them explicitly — otherwise
-- every anon/authenticated query fails with "permission denied for table".)

grant usage on schema public to anon, authenticated;

-- Public (anon) surface is read-only (home page, per-list subscribe page).
grant select on all tables in schema public to anon;

-- Signed-in users: full DML, gated by RLS policies.
grant select, insert, update, delete on all tables in schema public to authenticated;

-- service_role (used by server-side service flows: subscribe, send worker,
-- claim-subscriptions) also lacked grants, which broke the public subscribe
-- lookup ("This list is not available"). It bypasses RLS, so grant it fully.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- Apply the same defaults to any future objects created by this role.
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
