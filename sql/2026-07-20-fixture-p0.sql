-- ═══════════════════════════════════════════════════════════════════════════
-- CANCHERO — Migración P0 (FIXTURE) — 2026-07-20
-- Pegar TODO esto en el SQL Editor de Supabase y ejecutar. Es idempotente:
-- se puede correr varias veces sin romper nada.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Torneos: tipo de fútbol y tamaño de grupo configurable ─────────────────
-- match_format: '5' | '7' | '11'  (define la modalidad de la ficha del partido)
alter table public.tournaments add column if not exists match_format text;
-- group_size: cuántos equipos entran por grupo (antes estaba fijo en 4)
alter table public.tournaments add column if not exists group_size int default 4;
-- double_round ya existía, pero por las dudas:
alter table public.tournaments add column if not exists double_round boolean default false;
-- playoff_from: en qué instancia arrancan los playoffs de una copa
-- 'auto' | 'r32' | 'r16' | 'quarterfinal' | 'semifinal' | 'final' | 'none'
alter table public.tournaments add column if not exists playoff_from text default 'auto';

-- ── Partidos del torneo: fecha del calendario y encadenado del bracket ─────
-- matchday: número de fecha dentro del grupo / liga (1, 2, 3...)
alter table public.tournament_matches add column if not exists matchday int;
-- next_match_id / next_slot: a qué llave y a qué lado pasa el ganador
-- (eliminación directa). El ganador se escribe solo al cargar el resultado.
alter table public.tournament_matches add column if not exists next_match_id uuid;
alter table public.tournament_matches add column if not exists next_slot text;

-- ── Traspaso de datos al registrarse ──────────────────────────────────────
-- El organizador carga jugadores a mano con su email. Cuando esa persona entra a
-- Canchero con ESE email, sus filas se atan a la cuenta (user_email) y las
-- estadísticas se suman UNA sola vez al perfil: stats_claimed marca que ya se sumaron.
alter table public.tournament_players add column if not exists stats_claimed boolean default false;
create index if not exists idx_tplayers_email on public.tournament_players(lower(player_email));

-- Índice para resolver rápido el encadenado del bracket
create index if not exists idx_tmatches_next on public.tournament_matches(next_match_id);
create index if not exists idx_tmatches_matchday on public.tournament_matches(tournament_id, matchday);

-- ── Verificación: debería devolver 7 filas ─────────────────────────────────
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'tournaments'       and column_name in ('match_format','group_size','double_round','playoff_from'))
    or (table_name = 'tournament_matches' and column_name in ('matchday','next_match_id','next_slot'))
  )
order by table_name, column_name;
