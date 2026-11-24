-- A confirmed subscriber can read the list row they belong to (so the member
-- area can show private lists they were added to, not just public ones).
create policy "lists: subscriber read"
  on public.lists for select
  using (
    exists (
      select 1 from public.subscriptions s
      where s.list_id = lists.id
        and s.profile_id = auth.uid()
        and s.status = 'confirmed'
    )
  );
