-- ═══════════════════════════════════════════════════════════════════════════
-- CANCHERO — racha diaria: columnas para que SUME de verdad — 2026-07-23
-- Idempotente.
-- Bug: si faltaba last_active_date, el guardado caía a un fallback que solo escribía
-- "streak" y perdía la fecha → cada día la racha reiniciaba a 1. Con estas columnas
-- el guardado principal funciona y la racha suma en días consecutivos.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.users add column if not exists streak_days integer default 0;
alter table public.users add column if not exists streak integer default 0;
alter table public.users add column if not exists last_active_date date;

-- Verificación (deben aparecer las 3 filas)
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'users'
  and column_name in ('streak_days','streak','last_active_date')
order by column_name;
