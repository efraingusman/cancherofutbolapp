-- ═══════════════════════════════════════════════════════════════════
-- TORNEOS — país del jugador (para la banderita)
-- Pendiente al 2026-07-18. Correr en Supabase → SQL Editor.
--
-- Los jugadores VINCULADOS a una cuenta ya muestran la bandera: se lee
-- users.nat. Los jugadores cargados A MANO por la organización no tienen
-- dónde guardar el país, así que su banderita no aparece.
--
-- El código ya funciona sin esto (_safeUpdate saca la columna que no existe
-- y el resto de la edición se guarda igual). Correr esto es lo que habilita
-- guardar el país de los jugadores manuales.
--
-- Idempotente y no destructivo.
-- ═══════════════════════════════════════════════════════════════════

alter table public.tournament_players add column if not exists nationality text;

-- Verificación (debe devolver una fila):
-- select column_name, data_type
--   from information_schema.columns
--  where table_schema = 'public'
--    and table_name   = 'tournament_players'
--    and column_name  = 'nationality';
