-- Add an optional username / handle to profiles (shown as "@handle").
-- 3–30 chars, letters/digits/underscore; unique case-insensitively.

alter table public.profiles
  add column if not exists username text
  check (username is null or username ~ '^[A-Za-z0-9_]{3,30}$');

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username))
  where username is not null;

-- Include username in member cards so threads can show each author's handle.
-- Return type changes, so drop the old signature first.
drop function if exists public.member_cards(uuid[]);
create function public.member_cards(p_ids uuid[])
returns table (id uuid, full_name text, avatar_url text, username text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.avatar_url, p.username
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
