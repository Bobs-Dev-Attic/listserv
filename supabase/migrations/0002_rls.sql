-- Row Level Security policies for ListServ.
-- Public-facing writes (subscribe, confirm, unsubscribe) run server-side with the
-- service role and intentionally bypass RLS; these policies govern the authenticated
-- (browser session) surface and the public read surface.

alter table public.profiles      enable row level security;
alter table public.lists         enable row level security;
alter table public.subscriptions enable row level security;
alter table public.messages      enable row level security;
alter table public.deliveries    enable row level security;

-- -------------------------- profiles --------------------------
create policy "profiles: read own or admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

-- Update own row, but a member cannot escalate their own role to admin.
create policy "profiles: update own (no self-escalation)"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (id = auth.uid() and role = 'member')
  );

-- -------------------------- lists --------------------------
create policy "lists: public read or admin"
  on public.lists for select
  using (is_public = true or public.is_admin());

create policy "lists: admin insert"
  on public.lists for insert
  with check (public.is_admin());

create policy "lists: admin update"
  on public.lists for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "lists: admin delete"
  on public.lists for delete
  using (public.is_admin());

-- -------------------------- subscriptions --------------------------
-- Members see/manage their own subscriptions; admins see all.
create policy "subscriptions: read own or admin"
  on public.subscriptions for select
  using (profile_id = auth.uid() or public.is_admin());

create policy "subscriptions: admin insert"
  on public.subscriptions for insert
  with check (public.is_admin());

create policy "subscriptions: update own or admin"
  on public.subscriptions for update
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

create policy "subscriptions: delete own or admin"
  on public.subscriptions for delete
  using (profile_id = auth.uid() or public.is_admin());

-- -------------------------- messages --------------------------
-- Read: admins, or confirmed subscribers of the message's list (list archive).
create policy "messages: read for admin or subscriber"
  on public.messages for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.subscriptions s
      where s.list_id = messages.list_id
        and s.profile_id = auth.uid()
        and s.status = 'confirmed'
    )
  );

-- Insert: admins always; a confirmed subscriber may post to a list that allows it.
create policy "messages: insert by admin or allowed subscriber"
  on public.messages for insert
  with check (
    public.is_admin()
    or (
      kind = 'post'
      and sender_profile_id = auth.uid()
      and exists (
        select 1
        from public.subscriptions s
        join public.lists l on l.id = s.list_id
        where s.list_id = messages.list_id
          and s.profile_id = auth.uid()
          and s.status = 'confirmed'
          and l.posting_policy = 'subscribers'
          and l.type in ('discussion', 'both')
      )
    )
  );

create policy "messages: update own draft or admin"
  on public.messages for update
  using (public.is_admin() or sender_profile_id = auth.uid())
  with check (public.is_admin() or sender_profile_id = auth.uid());

create policy "messages: delete own draft or admin"
  on public.messages for delete
  using (public.is_admin() or sender_profile_id = auth.uid());

-- -------------------------- deliveries --------------------------
-- Only admins can read the delivery queue from the browser; the send worker
-- uses the service role.
create policy "deliveries: admin read"
  on public.deliveries for select
  using (public.is_admin());
