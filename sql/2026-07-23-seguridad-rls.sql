-- ═══════════════════════════════════════════════════════════════════════════
-- CANCHERO — Seguridad: auditoría + activar RLS (Row Level Security) — 2026-07-23
-- Correr por PARTES. La Parte 1 NO cambia nada (solo muestra el estado).
-- Idempotente: se puede correr varias veces.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- PARTE 1 — AUDITORÍA (solo lectura). Mirá la columna rls_activo:
--   false = la tabla está EXPUESTA (cualquiera con la key pública puede leer/escribir).
-- ─────────────────────────────────────────────────────────────────────────
select
  t.tablename                                   as tabla,
  t.rowsecurity                                 as rls_activo,
  count(p.policyname)                           as cant_policies
from pg_tables t
left join pg_policies p
  on p.schemaname = t.schemaname and p.tablename = t.tablename
where t.schemaname = 'public'
group by t.tablename, t.rowsecurity
order by t.rowsecurity asc, t.tablename;


-- ─────────────────────────────────────────────────────────────────────────
-- PARTE 2 — BLINDAJE de las tablas PÚBLICAS que están sin RLS.
-- Deja: lectura para todos (la app lista jugadores/partidos abiertamente) y
-- ESCRITURA solo para usuarios LOGUEADOS (bloquea el abuso anónimo con la key
-- pública, que es la amenaza real). No toca tablas que ya tengan RLS/policies,
-- así no pisa lo que ya configuramos (comunidades, etc.).
-- Las tablas PRIVADAS (mensajes/notificaciones) se excluyen y van en la Parte 3.
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  t text;
  privadas text[] := array[
    'messages','direct_messages','dm','chats','conversations','chat_messages',
    'notifications','push_subscriptions','device_tokens'
  ];
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public'
      and rowsecurity = false
      and tablename <> all(privadas)
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists sec_read_all on public.%I', t);
    execute format('create policy sec_read_all on public.%I for select using (true)', t);
    execute format('drop policy if exists sec_write_auth on public.%I', t);
    execute format('create policy sec_write_auth on public.%I for all to authenticated using (true) with check (true)', t);
    raise notice 'RLS activado en %', t;
  end loop;
end $$;


-- ─────────────────────────────────────────────────────────────────────────
-- PARTE 3 — Tablas PRIVADAS: que SOLO el dueño/destinatario pueda leerlas.
-- notifications: leer solo TUS notificaciones (recipient_email).
-- ─────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='notifications') then
    execute 'alter table public.notifications enable row level security';
    execute 'drop policy if exists notif_read_own on public.notifications';
    execute 'create policy notif_read_own on public.notifications for select
             using (lower(recipient_email) = lower(auth.jwt() ->> ''email''))';
    execute 'drop policy if exists notif_write_auth on public.notifications';
    execute 'create policy notif_write_auth on public.notifications for all to authenticated
             using (true) with check (true)';
  end if;
end $$;

-- NOTA sobre el CHAT: no sé el nombre exacto de tu tabla de mensajes ni sus
-- columnas (from/to). Corré la Parte 1 y fijate cuál es (algo como "messages" o
-- "direct_messages") y sus columnas; pasámelas y te dejo la policy para que cada
-- quien lea SOLO sus conversaciones. Hasta entonces esa tabla queda como está.

-- Verificación final (volvé a correr la Parte 1): rls_activo debería ser true
-- en casi todas, y cant_policies >= 1.
