-- User account status (for approve/block).
alter table public.profiles
  add column status text not null default 'active'
  check (status in ('active', 'pending', 'blocked'));

-- Custom roles = named sets of permission keys.
create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  permissions text[] not null default '{}',
  created_at  timestamptz not null default now()
);
alter table public.roles enable row level security;
create policy "roles: admin write"
  on public.roles for all
  using (public.is_admin()) with check (public.is_admin());
create policy "roles: read" on public.roles for select using (true);

-- Assign a role to a user, optionally scoped to one list/group (null = global).
create table public.role_assignments (
  id          uuid primary key default gen_random_uuid(),
  role_id     uuid not null references public.roles (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  list_id     uuid references public.lists (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (role_id, profile_id, list_id)
);
alter table public.role_assignments enable row level security;
create policy "role_assignments: admin write"
  on public.role_assignments for all
  using (public.is_admin()) with check (public.is_admin());
create policy "role_assignments: read own or admin"
  on public.role_assignments for select
  using (profile_id = auth.uid() or public.is_admin());

-- Does the current user have a permission (globally or for a given list)?
create or replace function public.user_has_permission(p_perm text, p_list uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1
    from public.role_assignments ra
    join public.roles r on r.id = ra.role_id
    where ra.profile_id = auth.uid()
      and (ra.list_id is null or ra.list_id = p_list)
      and p_perm = any (r.permissions)
  );
$$;
revoke execute on function public.user_has_permission(text, uuid) from public, anon;
grant execute on function public.user_has_permission(text, uuid) to authenticated;

-- Moderators (moderate_topics on the message's list) can delete posts.
create policy "messages: moderator delete"
  on public.messages for delete
  using (public.user_has_permission('moderate_topics', list_id));

-- Blocked/pending users cannot post (restrictive = AND with the insert policy).
create policy "messages: active senders only"
  on public.messages as restrictive for insert
  with check (
    not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status <> 'active'
    )
  );
