-- User-level moderation: an admin can mark a whole user account as moderated,
-- holding their posts across every group they belong to. This complements the
-- per-list subscriptions.moderated flag; a post is held if EITHER is set.

alter table public.profiles
  add column if not exists moderated boolean not null default false;

-- Rebuild the restrictive insert policy so a globally-moderated user (profile)
-- is held just like a per-list moderated member.
drop policy if exists "messages: moderated members post pending" on public.messages;
create policy "messages: moderated members post pending"
  on public.messages as restrictive for insert
  with check (
    public.is_admin()
    or moderation_status = 'pending'
    or (
      not exists (
        select 1 from public.subscriptions s
        where s.list_id = messages.list_id
          and s.profile_id = auth.uid()
          and s.moderated
      )
      and not exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.moderated
      )
    )
  );
