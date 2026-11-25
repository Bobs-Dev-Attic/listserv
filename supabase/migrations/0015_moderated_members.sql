-- Per-member moderation ("moderated members", groups.io-style).
-- A subscriber flagged `moderated` has their posts held as `pending` until a
-- list moderator (moderate_topics) or admin approves them. Held posts are not
-- delivered and are hidden from ordinary members until approved.

alter table public.subscriptions
  add column if not exists moderated boolean not null default false;

alter table public.messages
  add column if not exists moderation_status text not null default 'approved'
  check (moderation_status in ('approved', 'pending', 'rejected'));

create index if not exists messages_pending_idx
  on public.messages (list_id)
  where moderation_status = 'pending';

-- Rebuild message read policy: held/rejected posts are visible only to admins,
-- the post's own author, and moderators of the list. Ordinary confirmed
-- subscribers see approved posts only.
drop policy if exists "messages: read for admin or subscriber" on public.messages;
create policy "messages: read for admin or subscriber"
  on public.messages for select
  using (
    public.is_admin()
    or sender_profile_id = auth.uid()
    or public.user_has_permission('moderate_topics', list_id)
    or (
      moderation_status = 'approved'
      and exists (
        select 1 from public.subscriptions s
        where s.list_id = messages.list_id
          and s.profile_id = auth.uid()
          and s.status = 'confirmed'
      )
    )
  );

-- A moderated member may only insert held (pending) posts. Admins and
-- non-moderated members are unaffected.
create policy "messages: moderated members post pending"
  on public.messages as restrictive for insert
  with check (
    public.is_admin()
    or moderation_status = 'pending'
    or not exists (
      select 1 from public.subscriptions s
      where s.list_id = messages.list_id
        and s.profile_id = auth.uid()
        and s.moderated
    )
  );

-- Let moderators update posts in lists they moderate (needed to approve/reject).
create policy "messages: moderator update"
  on public.messages for update
  using (public.is_admin() or public.user_has_permission('moderate_topics', list_id))
  with check (public.is_admin() or public.user_has_permission('moderate_topics', list_id));

-- Guard: only admins/moderators may change moderation_status, so an author
-- (including a moderated member) can never approve their own held post, even
-- though they can otherwise update their own message row.
create or replace function public.enforce_moderation_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.moderation_status is distinct from old.moderation_status then
    if not (public.is_admin() or public.user_has_permission('moderate_topics', old.list_id)) then
      raise exception 'Only moderators may change a post''s moderation status';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists messages_moderation_guard on public.messages;
create trigger messages_moderation_guard
  before update on public.messages
  for each row execute function public.enforce_moderation_change();
