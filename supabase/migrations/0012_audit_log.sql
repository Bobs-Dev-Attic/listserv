create table public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  at          timestamptz not null default now(),
  actor_id    uuid references public.profiles (id) on delete set null,
  actor_email text,
  action      text not null,          -- e.g. login, email.broadcast, list.create, user.role_change
  target_type text,                   -- list | user | message | subscription | email | smtp
  target_id   text,
  summary     text,                   -- human-readable
  ip          text,                   -- for logins
  user_agent  text,                   -- for logins
  metadata    jsonb
);

create index audit_log_at_idx on public.audit_log (at desc);
create index audit_log_action_idx on public.audit_log (action);

alter table public.audit_log enable row level security;

-- Admins read the log; writes happen server-side via the service role.
create policy "audit_log: admin read"
  on public.audit_log for select
  using (public.is_admin());
