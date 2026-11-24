-- ListServ initial schema
-- Lists (broadcast + discussion), subscriptions with double opt-in,
-- messages, and a per-recipient delivery queue (provider-agnostic).

-- Case-insensitive email matching
create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- profiles: one row per authenticated user, mirrors auth.users
-- role is global: 'admin' can manage all lists; 'member' is a normal user.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       citext not null,
  full_name   text,
  role        text not null default 'member' check (role in ('admin', 'member')),
  created_at  timestamptz not null default now()
);

-- Auto-create a profile whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := 'member';
begin
  -- Bootstrap: the very first user to sign up becomes the admin, so the
  -- instance is never left without one. Everyone after is a member.
  if not exists (select 1 from public.profiles where role = 'admin') then
    v_role := 'admin';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    v_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Convenience: is the current user a global admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- lists
-- type: what the list supports
--   broadcast  -> admins send announcements only
--   discussion -> members post, fans out to all members
--   both       -> broadcast announcements + member discussion
-- posting_policy: who may create 'post' messages (discussion)
--   subscribers -> any confirmed subscriber
--   moderated   -> subscribers may submit, held for review (future)
--   admins      -> admins only (effectively broadcast)
-- ---------------------------------------------------------------------------
create table public.lists (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           text not null unique,
  description    text,
  type           text not null default 'broadcast'
                   check (type in ('broadcast', 'discussion', 'both')),
  posting_policy text not null default 'admins'
                   check (posting_policy in ('subscribers', 'moderated', 'admins')),
  reply_to       text,                       -- optional reply-to address
  is_public      boolean not null default true,  -- shown on public directory, open signup
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index lists_is_public_idx on public.lists (is_public);

-- ---------------------------------------------------------------------------
-- subscriptions: a (list, email) membership with double opt-in
-- profile_id is set when the subscriber also has an account (nullable).
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id                uuid primary key default gen_random_uuid(),
  list_id           uuid not null references public.lists (id) on delete cascade,
  email             citext not null,
  profile_id        uuid references public.profiles (id) on delete set null,
  status            text not null default 'pending'
                      check (status in ('pending', 'confirmed', 'unsubscribed', 'bounced')),
  role              text not null default 'subscriber'
                      check (role in ('subscriber', 'moderator')),
  confirm_token     uuid not null default gen_random_uuid(),
  unsubscribe_token uuid not null default gen_random_uuid(),
  subscribed_at     timestamptz not null default now(),
  confirmed_at      timestamptz,
  unique (list_id, email)
);

create index subscriptions_list_status_idx on public.subscriptions (list_id, status);
create index subscriptions_profile_idx on public.subscriptions (profile_id);
create index subscriptions_confirm_token_idx on public.subscriptions (confirm_token);
create index subscriptions_unsub_token_idx on public.subscriptions (unsubscribe_token);

-- ---------------------------------------------------------------------------
-- messages: a broadcast or a discussion post, fanned out to subscribers
-- ---------------------------------------------------------------------------
create table public.messages (
  id                 uuid primary key default gen_random_uuid(),
  list_id            uuid not null references public.lists (id) on delete cascade,
  kind               text not null default 'broadcast'
                       check (kind in ('broadcast', 'post')),
  status             text not null default 'draft'
                       check (status in ('draft', 'queued', 'sending', 'sent', 'failed')),
  subject            text not null,
  body_text          text not null default '',
  body_html          text,
  sender_email       text,
  sender_profile_id  uuid references public.profiles (id) on delete set null,
  reply_to_message_id uuid references public.messages (id) on delete set null,
  recipient_count    integer not null default 0,
  created_at         timestamptz not null default now(),
  queued_at          timestamptz,
  sent_at            timestamptz
);

create index messages_list_idx on public.messages (list_id, created_at desc);
create index messages_status_idx on public.messages (status);

-- ---------------------------------------------------------------------------
-- deliveries: one row per recipient per message = the send queue.
-- Provider-agnostic: a worker reads 'queued' rows, sends, and marks them.
-- ---------------------------------------------------------------------------
create table public.deliveries (
  id                  uuid primary key default gen_random_uuid(),
  message_id          uuid not null references public.messages (id) on delete cascade,
  subscription_id     uuid references public.subscriptions (id) on delete set null,
  email               citext not null,
  status              text not null default 'queued'
                        check (status in ('queued', 'sending', 'sent', 'failed', 'skipped')),
  provider_message_id text,
  error               text,
  attempts            integer not null default 0,
  created_at          timestamptz not null default now(),
  sent_at             timestamptz
);

create index deliveries_message_idx on public.deliveries (message_id);
create index deliveries_queue_idx on public.deliveries (status) where status = 'queued';

-- ---------------------------------------------------------------------------
-- enqueue_message: fan a message out to all confirmed subscribers of its list,
-- creating one delivery row each, and move the message to 'queued'.
-- SECURITY DEFINER so it can write deliveries under controlled logic.
-- ---------------------------------------------------------------------------
create or replace function public.enqueue_message(p_message_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_list_id uuid;
  v_count   integer;
begin
  select list_id into v_list_id from public.messages where id = p_message_id;
  if v_list_id is null then
    raise exception 'message % not found', p_message_id;
  end if;

  insert into public.deliveries (message_id, subscription_id, email)
  select p_message_id, s.id, s.email
  from public.subscriptions s
  where s.list_id = v_list_id
    and s.status = 'confirmed'
  on conflict do nothing;

  get diagnostics v_count = row_count;

  update public.messages
  set status = 'queued',
      queued_at = now(),
      recipient_count = v_count
  where id = p_message_id;

  return v_count;
end;
$$;

-- updated_at helper for lists
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger lists_touch_updated_at
  before update on public.lists
  for each row execute function public.touch_updated_at();
