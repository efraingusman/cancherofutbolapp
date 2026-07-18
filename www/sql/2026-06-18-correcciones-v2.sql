-- ============================================================
-- Canchero — Correcciones v2 (2026-06-18)
-- Aplicar en el SQL editor de Supabase. Seguro de correr varias veces.
-- El front degrada con gracia si esto no está aplicado.
-- ============================================================

-- 1) Un jugador NO puede estar dos veces en el mismo partido (ni en ambos equipos).
--    Índice único por (match_id, player_email). Si ya hay duplicados, limpialos antes.
do $$
begin
  begin
    create unique index if not exists ux_match_players_match_email
      on public.match_players (match_id, player_email);
  exception when others then
    -- si falla por duplicados existentes, no abortar el resto del script
    raise notice 'No se pudo crear ux_match_players_match_email (¿duplicados existentes?): %', sqlerrm;
  end;
end $$;

-- 2) Índice para acelerar el conteo de solicitudes pendientes (partidos y clubes).
create index if not exists ix_match_players_status on public.match_players (match_id, status);
create index if not exists ix_club_members_status  on public.club_members  (club_id, status);

-- 3) (Opcional) columna number en club_members, por si en el futuro se usan dorsales.
--    El front ya NO ordena por esta columna; queda como opcional.
alter table if exists public.club_members
  add column if not exists number int;
