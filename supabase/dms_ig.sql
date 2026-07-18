-- ════════════════════════════════════════════════════════════════════
-- DMs ESTILO INSTAGRAM (2026-06-12)
-- dm_threads: una fila por conversación 1-a-1 con estado inbox/solicitud.
-- users.dm_privacy: quién puede mandarme la PRIMERA solicitud.
-- Trigger en messages mantiene el thread; can_dm() refuerza en RLS.
-- ════════════════════════════════════════════════════════════════════

-- 1) Privacidad de mensajes
alter table public.users add column if not exists dm_privacy text default 'todos';

-- 2) Threads
create table if not exists public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  user_a text not null,
  user_b text not null,
  status text not null default 'request',          -- request | accepted | declined
  requested_by text,
  accepted_at timestamptz,
  last_message_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (user_a, user_b)
);

alter table public.dm_threads enable row level security;
drop policy if exists dmt_select on public.dm_threads;
drop policy if exists dmt_insert on public.dm_threads;
drop policy if exists dmt_update on public.dm_threads;
create policy dmt_select on public.dm_threads for select
  using (public.me() in (user_a, user_b));
create policy dmt_insert on public.dm_threads for insert
  with check (public.me() in (user_a, user_b));
create policy dmt_update on public.dm_threads for update
  using (public.me() in (user_a, user_b));

-- 3) Helpers
create or replace function public.dm_pair(e1 text, e2 text, out a text, out b text)
language sql immutable as $$ select least(lower(e1),lower(e2)), greatest(lower(e1),lower(e2)) $$;

create or replace function public.mutual_follow(e1 text, e2 text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from follows where lower(follower_email)=lower(e1) and lower(following_email)=lower(e2))
     and exists (select 1 from follows where lower(follower_email)=lower(e2) and lower(following_email)=lower(e1));
$$;

-- ¿Puedo mandarle un mensaje a "recipient"? (privacidad + estado del thread)
create or replace function public.can_dm(recipient text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  s text; pa text; pb text; th record; priv text;
begin
  s := public.me();
  if s = '' then return false; end if;
  if lower(recipient) = s then return false; end if;
  if exists (select 1 from blocks where lower(blocker_email)=lower(recipient) and lower(blocked_email)=s) then
    return false;                                   -- me bloqueó
  end if;
  select * into th from dm_threads
    where user_a = least(s,lower(recipient)) and user_b = greatest(s,lower(recipient));
  if found then
    if th.status = 'accepted' then return true; end if;
    if th.status = 'declined' then return false; end if;
    -- request: solo el solicitante puede haber mandado 1 mensaje
    if th.requested_by = s then
      return (select count(*) from messages
              where lower(sender_email)=s and lower(recipient_email)=lower(recipient)) < 1;
    end if;
    return true;                                    -- el receptor responde = acepta
  end if;
  -- thread nuevo: respetar privacidad del receptor
  select coalesce(dm_privacy,'todos') into priv from users where lower(email)=lower(recipient) limit 1;
  if priv = 'nadie' then return false; end if;
  if priv = 'seguidores' then
    return exists (select 1 from follows where lower(follower_email)=lower(recipient) and lower(following_email)=s);
  end if;
  return true;
end $$;

-- 4) Trigger: cada mensaje mantiene su thread
create or replace function public.sync_dm_thread() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  a text; b text; snd text; rcp text; th record;
begin
  if new.recipient_email is null then return null; end if;   -- mensajes de grupo no aplican
  snd := lower(new.sender_email); rcp := lower(new.recipient_email);
  a := least(snd, rcp); b := greatest(snd, rcp);
  select * into th from dm_threads where user_a=a and user_b=b;
  if not found then
    insert into dm_threads (user_a, user_b, status, requested_by, accepted_at, last_message_at)
    values (a, b, case when public.mutual_follow(snd, rcp) then 'accepted' else 'request' end,
            snd, case when public.mutual_follow(snd, rcp) then now() else null end, now());
  else
    -- si el RECEPTOR del request responde, el chat queda aceptado
    if th.status = 'request' and th.requested_by is distinct from snd then
      update dm_threads set status='accepted', accepted_at=now(), last_message_at=now() where id=th.id;
    else
      update dm_threads set last_message_at=now() where id=th.id;
    end if;
  end if;
  return null;
end $$;
drop trigger if exists trg_dm_thread on public.messages;
create trigger trg_dm_thread after insert on public.messages
  for each row execute function public.sync_dm_thread();

-- 5) Refuerzo RLS en messages: además de ser yo el emisor, can_dm debe dar true
drop policy if exists msg_insert on public.messages;
create policy msg_insert on public.messages for insert
  with check (public.me() = lower(sender_email)
              and (recipient_email is null or public.can_dm(recipient_email)));

-- 6) Backfill: conversaciones existentes quedan aceptadas
insert into dm_threads (user_a, user_b, status, requested_by, accepted_at, last_message_at)
select least(lower(sender_email), lower(recipient_email)),
       greatest(lower(sender_email), lower(recipient_email)),
       'accepted', min(lower(sender_email)), now(), max(created_at)
from messages
where recipient_email is not null
group by 1, 2
on conflict (user_a, user_b) do nothing;
