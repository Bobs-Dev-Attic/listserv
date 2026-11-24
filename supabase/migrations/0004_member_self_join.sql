-- Let a logged-in member subscribe themselves to a PUBLIC list, with their own
-- verified email. The admin insert policy still covers everything else, and
-- private lists remain admin-managed.
create policy "subscriptions: self-join public list"
  on public.subscriptions for insert
  with check (
    profile_id = auth.uid()
    and email = auth.email()
    and exists (
      select 1 from public.lists l
      where l.id = list_id and l.is_public = true
    )
  );
