-- ═══════════════════════════════════════════════════════════════════════════
-- CANCHERO — suplentes configurables + control de sponsors — 2026-07-20
-- Idempotente: se puede correr varias veces.
-- ═══════════════════════════════════════════════════════════════════════════

-- Suplentes por equipo que permite la organización.
--   NULL = usar el default según el tipo de fútbol (5+5, 7+5, 11+7)
--   0..N = ese número exacto de suplentes
--   -1   = sin límite
alter table public.tournaments add column if not exists max_subs int;

-- Dónde y cómo aparece cada sponsor. El orden de jerarquía ya vive en "orden".
alter table public.tournament_sponsors add column if not exists mostrar_portada boolean default true;
alter table public.tournament_sponsors add column if not exists mostrar_compartir boolean default true;
alter table public.tournament_sponsors add column if not exists tamano text default 'medio';  -- chico | medio | grande

-- Verificación: debería devolver 4 filas
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (
       (table_name = 'tournaments'         and column_name = 'max_subs')
    or (table_name = 'tournament_sponsors' and column_name in ('mostrar_portada','mostrar_compartir','tamano'))
  )
order by table_name, column_name;
