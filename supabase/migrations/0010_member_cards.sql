-- Returns name + avatar (NOT email/role) for the given profile ids, but only
-- for people the caller shares a confirmed subscription with. Lets threads
-- show each author's chosen avatar without exposing private profile data.
create or replace function public.member_cards(p_ids uuid[])
returns table (id uuid, full_name text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.avatar_url
  from public.profiles p
  where p.id = any(p_ids)
    and exists (
      select 1
      from public.subscriptions s_me
      join public.subscriptions s_them on s_them.list_id = s_me.list_id
      where s_me.profile_id = auth.uid() and s_me.status = 'confirmed'
        and s_them.profile_id = p.id and s_them.status = 'confirmed'
    );
$$;

revoke execute on function public.member_cards(uuid[]) from public, anon;
grant execute on function public.member_cards(uuid[]) to authenticated;
