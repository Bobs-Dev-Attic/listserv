-- Per-member delivery preference (each / digest / none).
alter table public.subscriptions
  add column delivery_mode text not null default 'each'
  check (delivery_mode in ('each', 'digest', 'none'));

-- Track which messages have already been rolled into a digest.
alter table public.messages
  add column digested boolean not null default false;

-- Don't sweep pre-existing history into the first digest.
update public.messages set digested = true;

-- Immediate per-message email now goes only to 'each' subscribers; 'digest'
-- recipients are handled by the digest job (/api/digest), 'none' get no email.
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
    and s.delivery_mode = 'each'
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
