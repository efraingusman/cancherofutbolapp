-- ═══════════════════════════════════════════════════════════════════════════
-- Torneos Canchero — columnas nuevas (idempotente: se puede correr varias veces)
-- Correr en Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- Eventos por partido (goleadores, asistencias, tarjetas) + disciplina
alter table if exists public.tournament_matches
  add column if not exists events jsonb not null default '[]'::jsonb;

-- Fecha/hora, cancha, árbitro y arranque (cronómetro) del partido (agenda)
alter table if exists public.tournament_matches
  add column if not exists venue text,
  add column if not exists referee text,
  add column if not exists kickoff_at timestamptz;

-- Vínculo con un partido REAL de la sección Partidos (ficha completa: chat/momentos/stats)
alter table if exists public.tournament_matches
  add column if not exists match_id uuid;

-- Disciplina del jugador
alter table if exists public.tournament_players
  add column if not exists red_cards integer not null default 0,
  add column if not exists suspended_matches integer not null default 0;

-- Vincular jugador del torneo con un usuario registrado (para autocompletar + perfil)
alter table if exists public.tournament_players
  add column if not exists user_email text,
  add column if not exists avatar_url text;

-- Foto/portada del torneo + logo
alter table if exists public.tournaments
  add column if not exists cover_url text,
  add column if not exists logo_url text,
  add column if not exists country text,
  add column if not exists double_round boolean not null default false;

-- Escudo del equipo + vínculo con club/equipo registrado + capitanes
alter table if exists public.tournament_teams
  add column if not exists logo_url text,
  add column if not exists club_email text,
  add column if not exists captains jsonb not null default '[]'::jsonb;
