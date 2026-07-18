-- ════════════════════════════════════════════════════════════════════
-- RLS FASE 2 — TANDA A: datos personales (2026-06-11)
-- Patrón: identidad por lower(auth.email()). Select público solo donde
-- el producto lo requiere (perfiles). Escrituras: solo el dueño.
-- Rollback de emergencia por tabla:
--   alter table public.X disable row level security;
-- ════════════════════════════════════════════════════════════════════

-- Drop de TODAS las políticas previas de estas tablas (las permisivas
-- "USING true" se OR-ean con las nuevas y las anularían)
do $$
declare r record;
begin
  for r in select tablename, policyname from pg_policies
    where schemaname='public' and tablename in
    ('users','push_subscriptions','push_tokens','notifications','messages',
     'message_reactions','group_chats','group_members','group_messages',
     'nudges','blocks','user_presence')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create or replace function public.me() returns text
language sql stable as $$ select lower(coalesce(auth.email(), '')) $$;

-- ── USERS: perfil público de lectura; solo yo me edito ────────────────
alter table public.users enable row level security;
drop policy if exists users_all on public.users;
drop policy if exists users_select on public.users;
drop policy if exists users_insert on public.users;
drop policy if exists users_update on public.users;
drop policy if exists users_delete on public.users;
create policy users_select on public.users for select using (true);
create policy users_insert on public.users for insert with check (public.me() = lower(email));
create policy users_update on public.users for update using (public.me() = lower(email));
create policy users_delete on public.users for delete using (public.me() = lower(email));

-- ── PUSH SUBSCRIPTIONS / TOKENS: solo el dueño (el server usa sb_secret) ──
alter table public.push_subscriptions enable row level security;
drop policy if exists push_subs_all on public.push_subscriptions;
create policy push_subs_own on public.push_subscriptions
  for all using (public.me() = lower(user_email))
  with check (public.me() = lower(user_email));

alter table public.push_tokens enable row level security;
drop policy if exists push_tokens_all on public.push_tokens;
create policy push_tokens_own on public.push_tokens
  for all using (public.me() = lower(email))
  with check (public.me() = lower(email));

-- ── NOTIFICATIONS: leo/edito solo las mías; crear hacia otros = autenticado ──
alter table public.notifications enable row level security;
drop policy if exists notifications_all on public.notifications;
create policy notif_select on public.notifications for select
  using (public.me() = lower(recipient_email));
create policy notif_insert on public.notifications for insert
  with check (auth.role() = 'authenticated');
create policy notif_update on public.notifications for update
  using (public.me() = lower(recipient_email));
create policy notif_delete on public.notifications for delete
  using (public.me() = lower(recipient_email));

-- ── MESSAGES (DMs): solo los participantes ─────────────────────────────
alter table public.messages enable row level security;
drop policy if exists messages_all on public.messages;
create policy msg_select on public.messages for select
  using (public.me() in (lower(sender_email), lower(recipient_email)));
create policy msg_insert on public.messages for insert
  with check (public.me() = lower(sender_email));
create policy msg_update on public.messages for update
  using (public.me() in (lower(sender_email), lower(recipient_email)));
create policy msg_delete on public.messages for delete
  using (public.me() = lower(sender_email));

-- ── MESSAGE REACTIONS ──────────────────────────────────────────────────
alter table public.message_reactions enable row level security;
drop policy if exists message_reactions_all on public.message_reactions;
create policy msgreact_select on public.message_reactions for select using (true);
create policy msgreact_write on public.message_reactions
  for insert with check (public.me() = lower(user_email));
create policy msgreact_delete on public.message_reactions
  for delete using (public.me() = lower(user_email));

-- ── GRUPOS DE CHAT ─────────────────────────────────────────────────────
alter table public.group_chats enable row level security;
drop policy if exists group_chats_all on public.group_chats;
create policy gc_select on public.group_chats for select using (
  public.me() = lower(created_by)
  or exists (select 1 from public.group_members gm where gm.group_id = group_chats.id and lower(gm.email) = public.me())
);
create policy gc_insert on public.group_chats for insert with check (public.me() = lower(created_by));
create policy gc_update on public.group_chats for update using (public.me() = lower(created_by));
create policy gc_delete on public.group_chats for delete using (public.me() = lower(created_by));

alter table public.group_members enable row level security;
drop policy if exists group_members_all on public.group_members;
create policy gm_select on public.group_members for select using (
  lower(email) = public.me()
  or exists (select 1 from public.group_members g2 where g2.group_id = group_members.group_id and lower(g2.email) = public.me())
);
-- agregar miembros: el creador del grupo o uno mismo (aceptar invitación)
create policy gm_insert on public.group_members for insert with check (
  public.me() = lower(email)
  or exists (select 1 from public.group_chats gc where gc.id = group_members.group_id and lower(gc.created_by) = public.me())
);
create policy gm_delete on public.group_members for delete using (
  public.me() = lower(email)
  or exists (select 1 from public.group_chats gc where gc.id = group_members.group_id and lower(gc.created_by) = public.me())
);

alter table public.group_messages enable row level security;
drop policy if exists group_messages_all on public.group_messages;
create policy gmsg_select on public.group_messages for select using (
  exists (select 1 from public.group_members gm where gm.group_id = group_messages.group_id and lower(gm.email) = public.me())
);
create policy gmsg_insert on public.group_messages for insert with check (
  public.me() = lower(sender_email)
  and exists (select 1 from public.group_members gm where gm.group_id = group_messages.group_id and lower(gm.email) = public.me())
);
create policy gmsg_delete on public.group_messages for delete using (public.me() = lower(sender_email));

-- ── NUDGES (toques/chicanas): emisor crea, receptor lee ───────────────
alter table public.nudges enable row level security;
drop policy if exists nudges_all on public.nudges;
create policy nudges_select on public.nudges for select
  using (public.me() in (lower(sender_email), lower(recipient_email)));
create policy nudges_insert on public.nudges for insert
  with check (public.me() = lower(sender_email));

-- ── BLOCKS ─────────────────────────────────────────────────────────────
alter table public.blocks enable row level security;
drop policy if exists blocks_all on public.blocks;
create policy blocks_own on public.blocks
  for all using (public.me() = lower(blocker_email))
  with check (public.me() = lower(blocker_email));

-- ── USER PRESENCE: lectura pública (estado en línea), escritura propia ──
alter table public.user_presence enable row level security;
drop policy if exists user_presence_all on public.user_presence;
create policy presence_select on public.user_presence for select using (true);
create policy presence_write on public.user_presence
  for insert with check (public.me() = lower(email));
create policy presence_update on public.user_presence
  for update using (public.me() = lower(email));
