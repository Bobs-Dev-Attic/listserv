-- Per-user UI preferences (e.g. the Users table's column widths/sort/filters),
-- so view settings persist across sessions and devices.
create table public.user_prefs (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  key        text not null,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (profile_id, key)
);

alter table public.user_prefs enable row level security;

create policy "user_prefs: own"
  on public.user_prefs for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
