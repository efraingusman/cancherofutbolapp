-- ============================================================
-- Canchero — Tablero del partido (2026-06-18)
-- Aplicar en el SQL editor de Supabase.
-- Las funciones del front degradan con gracia si esto no está aplicado:
--   * Goles/asistencias/MVP usan la tabla match_events (ya existente).
--   * El consenso/disputa con evidencia y el traspaso usan las tablas de abajo.
-- ============================================================

-- 1) Columnas extra en match_events (si faltan) para guardar email del jugador
alter table if exists public.match_events
  add column if not exists player_email text;

-- 2) Posiciones de los jugadores en la cancha (para formación + realtime)
alter table if exists public.match_players
  add column if not exists position text,
  add column if not exists pos_x int,
  add column if not exists pos_y int,
  add column if not exists team text;

-- 3) Resultado del partido + consenso de capitanes
alter table if exists public.matches
  add column if not exists result_proposed_by text,
  add column if not exists result_status text default 'pendiente', -- pendiente|aceptado|en_disputa|resuelto
  add column if not exists result_accepted_by text,
  add column if not exists mvp_home_name text,
  add column if not exists mvp_away_name text,
  add column if not exists tournament_id uuid,
  add column if not exists organizer_email text;

-- 4) Disputas de resultado
create table if not exists public.match_disputes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null,
  status text default 'abierta',          -- abierta|resuelta
  arbiter_email text,                      -- admin Canchero u organizador del torneo
  decision_home int,
  decision_away int,
  decision_note text,
  created_at timestamptz default now(),
  decided_at timestamptz
);

-- 5) Evidencia de la disputa (texto / imagen / video)
create table if not exists public.dispute_evidence (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.match_disputes(id) on delete cascade,
  author_email text not null,
  text text,
  media_url text,
  media_type text,                         -- image|video
  created_at timestamptz default now()
);

-- 6) Solicitudes de traspaso de jugador entre equipos (requiere OK de ambos capitanes)
create table if not exists public.match_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null,
  player_email text not null,
  from_team text,
  to_team text,
  approved_home boolean default false,
  approved_away boolean default false,
  status text default 'pendiente',         -- pendiente|aprobado|rechazado
  created_at timestamptz default now()
);

-- ── RLS ──
alter table public.match_disputes enable row level security;
alter table public.dispute_evidence enable row level security;
alter table public.match_transfer_requests enable row level security;

-- Lectura pública (la app ya es pública para ver partidos)
create policy if not exists "disputes_read"  on public.match_disputes        for select using (true);
create policy if not exists "evidence_read"  on public.dispute_evidence       for select using (true);
create policy if not exists "transfer_read"  on public.match_transfer_requests for select using (true);

-- Escritura: cualquier usuario autenticado (la lógica de capitán/árbitro se valida en el front;
-- endurecer con auth.jwt() ->> 'email' cuando se migre a auth nativa de Supabase).
create policy if not exists "disputes_write" on public.match_disputes        for all using (true) with check (true);
create policy if not exists "evidence_write" on public.dispute_evidence       for all using (true) with check (true);
create policy if not exists "transfer_write" on public.match_transfer_requests for all using (true) with check (true);

-- Realtime (para sincronizar posiciones / marcador en vivo)
alter publication supabase_realtime add table public.match_players;
alter publication supabase_realtime add table public.match_events;
