-- ═══════════════════════════════════════════════════════════════════════════
-- CANCHERO — Migración P1 (SPONSORS DEL TORNEO) — 2026-07-20
-- Idempotente: se puede correr varias veces.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.tournament_sponsors (
  id          uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name        text not null,
  logo_url    text,
  link        text,
  orden       int default 0,
  created_at  timestamptz default now()
);

create index if not exists idx_tsponsors_torneo
  on public.tournament_sponsors(tournament_id, orden);

alter table public.tournament_sponsors enable row level security;
drop policy if exists "open_t_sponsors" on public.tournament_sponsors;
create policy "open_t_sponsors" on public.tournament_sponsors
  for all using (true) with check (true);
grant all on public.tournament_sponsors to anon, authenticated;

-- Verificación: debería devolver la tabla con sus 7 columnas
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'tournament_sponsors'
order by ordinal_position;
