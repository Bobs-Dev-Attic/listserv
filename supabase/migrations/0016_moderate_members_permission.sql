-- Let a role with the `moderate_members` permission apply the "moderated"
-- rule to a list's members (not just admins). Two SECURITY DEFINER helpers
-- keep subscriptions' table RLS tight (members still can't read co-subscribers
-- or edit arbitrary columns); they only expose exactly what a members-moderator
-- needs for the list(s) they moderate.

-- Read a list's members for moderation. Only admins and holders of
-- moderate_members on the list get rows; everyone else gets none.
create or replace function public.list_moderation_members(p_list uuid)
returns table (
  id uuid,
  email text,
  status text,
  moderated boolean,
  delivery_mode text,
  subscribed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.email, s.status, s.moderated, s.delivery_mode, s.subscribed_at
  from public.subscriptions s
  where s.list_id = p_list
    and public.user_has_permission('moderate_members', p_list)
  order by s.email;
$$;

-- Set (or clear) the moderated flag on one subscription. Returns the affected
-- list_id, or null when the caller isn't permitted / the row doesn't exist.
create or replace function public.set_subscription_moderated(
  p_sub uuid,
  p_moderated boolean
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_list uuid;
begin
  select list_id into v_list from public.subscriptions where id = p_sub;
  if v_list is null then
    return null;
  end if;
  if not public.user_has_permission('moderate_members', v_list) then
    raise exception 'Not authorized to moderate members of this list';
  end if;
  update public.subscriptions set moderated = p_moderated where id = p_sub;
  return v_list;
end;
$$;

revoke all on function public.list_moderation_members(uuid) from public, anon;
revoke all on function public.set_subscription_moderated(uuid, boolean) from public, anon;
grant execute on function public.list_moderation_members(uuid) to authenticated;
grant execute on function public.set_subscription_moderated(uuid, boolean) to authenticated;
