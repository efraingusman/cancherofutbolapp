-- ═══════════════════════════════════════════════════════════════════════════
-- CANCHERO — nivel sugerido del partido (P1) — 2026-07-21
-- Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

-- Nivel que busca el partido: 'principiante' | 'intermedio' | 'avanzado' | 'crack'.
-- NULL = abierto a cualquiera. Los partidos sin nivel SIEMPRE se muestran: no se
-- esconde un partido por no tener el dato cargado.
-- Los niveles salen de la valoración del jugador (ver docs/rating-system.md).
alter table public.matches add column if not exists skill_level text;

create index if not exists idx_matches_skill_level on public.matches(skill_level);

-- Verificación
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'matches' and column_name = 'skill_level';
