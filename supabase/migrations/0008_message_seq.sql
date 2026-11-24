-- Per-list sequential message number, for groups.io-style #NNN permalinks.
alter table public.messages add column seq integer;

-- Assign the next per-list number on insert (serialized per list to avoid dups).
create or replace function public.assign_message_seq()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.seq is null then
    perform pg_advisory_xact_lock(hashtext(new.list_id::text));
    select coalesce(max(seq), 0) + 1 into new.seq
    from public.messages where list_id = new.list_id;
  end if;
  return new;
end;
$$;

create trigger messages_assign_seq
  before insert on public.messages
  for each row execute function public.assign_message_seq();

-- Backfill existing messages per list in chronological order.
with ordered as (
  select id, row_number() over (
    partition by list_id order by created_at, id
  ) as rn
  from public.messages
)
update public.messages m
set seq = o.rn
from ordered o
where o.id = m.id;

create index messages_list_seq_idx on public.messages (list_id, seq);
