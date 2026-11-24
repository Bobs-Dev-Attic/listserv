-- Security hardening from the Supabase advisor (run after 0001/0002).

-- 1. Pin search_path on the updated_at trigger function.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2. Lock down SECURITY DEFINER functions so they can't be called by clients
--    through /rest/v1/rpc. Triggers still invoke them (owner context), and the
--    send worker / server action call enqueue_message with the service role.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.enqueue_message(uuid) from public, anon, authenticated;
grant execute on function public.enqueue_message(uuid) to service_role;

-- is_admin() is intentionally left callable: RLS policies evaluate it in the
-- querying role's context, so authenticated/anon must retain EXECUTE.
