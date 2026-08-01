-- ═══════════════════════════════════════════════════════════════════════════
-- CANCHERO — partidos recurrentes (P4) — 2026-07-23
-- Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

-- 'weekly' = se repite cada semana. NULL = partido único.
alter table public.matches add column if not exists recurring_rule text;

-- Id del partido "madre" de la serie (el primero). Las ocurrencias siguientes lo
-- referencian para agruparlas. Se guarda como text para no atarlo al tipo del id.
alter table public.matches add column if not exists recurring_parent text;

create index if not exists idx_matches_recurring on public.matches(recurring_rule);

-- Verificación
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'matches'
  and column_name in ('recurring_rule','recurring_parent')
order by column_name;
