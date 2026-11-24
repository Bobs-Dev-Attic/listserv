-- Admin-managed SMTP servers; one can be marked active and the send path uses it.
create table public.email_servers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  host        text not null,
  port        integer not null default 587,
  secure      boolean not null default false,
  username    text not null,
  password    text not null,
  from_email  text not null,
  is_active   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.email_servers enable row level security;

-- Admin-only (passwords live here). The send worker uses the service role.
create policy "email_servers: admin all"
  on public.email_servers for all
  using (public.is_admin())
  with check (public.is_admin());

-- At most one active server.
create unique index email_servers_one_active
  on public.email_servers (is_active) where is_active;

create trigger email_servers_touch_updated_at
  before update on public.email_servers
  for each row execute function public.touch_updated_at();
