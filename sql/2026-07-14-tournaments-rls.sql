-- ════════════════════════════════════════════════════════════════════
-- Canchero — RLS de TORNEOS (tournaments / teams / matches / players)
-- Arregla: "new row violates row-level security policy for table tournaments"
-- Convención igual a 2026-06-24-rls-real.sql (usa public.auth_email() e is_admin()).
-- Correr en Supabase → SQL Editor → Run. Idempotente.
-- ════════════════════════════════════════════════════════════════════

-- (por si no existen los helpers — no rompe si ya están)
create or replace function public.auth_email() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    nullif(current_setting('request.jwt.claims', true)::json->>'email', '')
  );
$$;

-- columnas de sede (por si faltan)
alter table if exists public.tournaments
  add column if not exists venue text,
  add column if not exists complex_email text;

-- ── TOURNAMENTS ──────────────────────────────────────────────
alter table public.tournaments enable row level security;

drop policy if exists tournaments_select_all on public.tournaments;
create policy tournaments_select_all on public.tournaments for select using (true);

-- Crear: cualquier usuario autenticado (la org). Igual patrón que matches/clubs.
drop policy if exists tournaments_insert_auth on public.tournaments;
create policy tournaments_insert_auth on public.tournaments for insert
  with check (public.auth_email() is not null);

drop policy if exists tournaments_update_owner on public.tournaments;
create policy tournaments_update_owner on public.tournaments for update
  using (lower(coalesce(organizer_email,'')) = lower(public.auth_email()) or public.is_admin())
  with check (lower(coalesce(organizer_email,'')) = lower(public.auth_email()) or public.is_admin());

drop policy if exists tournaments_delete_owner on public.tournaments;
create policy tournaments_delete_owner on public.tournaments for delete
  using (lower(coalesce(organizer_email,'')) = lower(public.auth_email()) or public.is_admin());

-- ── TOURNAMENT_TEAMS ─────────────────────────────────────────
alter table public.tournament_teams enable row level security;

drop policy if exists tt_select_all on public.tournament_teams;
create policy tt_select_all on public.tournament_teams for select using (true);

-- Inscribir equipo: cualquier autenticado (el capitán) o la org del torneo.
drop policy if exists tt_insert_auth on public.tournament_teams;
create policy tt_insert_auth on public.tournament_teams for insert
  with check (public.auth_email() is not null);

-- Editar (aprobar/marcar pago/etc.): la org del torneo, el capitán del equipo, o admin.
drop policy if exists tt_update_owner on public.tournament_teams;
create policy tt_update_owner on public.tournament_teams for update
  using (
    exists (select 1 from public.tournaments t where t.id = tournament_teams.tournament_id
            and lower(coalesce(t.organizer_email,'')) = lower(public.auth_email()))
    or lower(coalesce(captain_email,'')) = lower(public.auth_email())
    or public.is_admin()
  ) with check (true);

drop policy if exists tt_delete_owner on public.tournament_teams;
create policy tt_delete_owner on public.tournament_teams for delete
  using (
    exists (select 1 from public.tournaments t where t.id = tournament_teams.tournament_id
            and lower(coalesce(t.organizer_email,'')) = lower(public.auth_email()))
    or lower(coalesce(captain_email,'')) = lower(public.auth_email())
    or public.is_admin()
  );

-- ── TOURNAMENT_MATCHES ───────────────────────────────────────
alter table public.tournament_matches enable row level security;

drop policy if exists tm_select_all on public.tournament_matches;
create policy tm_select_all on public.tournament_matches for select using (true);

drop policy if exists tm_write_owner on public.tournament_matches;
create policy tm_write_owner on public.tournament_matches for all
  using (
    exists (select 1 from public.tournaments t where t.id = tournament_matches.tournament_id
            and lower(coalesce(t.organizer_email,'')) = lower(public.auth_email()))
    or public.is_admin()
  )
  with check (
    exists (select 1 from public.tournaments t where t.id = tournament_matches.tournament_id
            and lower(coalesce(t.organizer_email,'')) = lower(public.auth_email()))
    or public.is_admin()
  );

-- ── TOURNAMENT_PLAYERS ───────────────────────────────────────
alter table public.tournament_players enable row level security;

drop policy if exists tp_select_all on public.tournament_players;
create policy tp_select_all on public.tournament_players for select using (true);

drop policy if exists tp_write_owner on public.tournament_players;
create policy tp_write_owner on public.tournament_players for all
  using (
    exists (select 1 from public.tournaments t where t.id = tournament_players.tournament_id
            and lower(coalesce(t.organizer_email,'')) = lower(public.auth_email()))
    or lower(coalesce(user_email,'')) = lower(public.auth_email())
    or public.is_admin()
  )
  with check (
    exists (select 1 from public.tournaments t where t.id = tournament_players.tournament_id
            and lower(coalesce(t.organizer_email,'')) = lower(public.auth_email()))
    or public.is_admin()
  );

-- ════════════════════════════════════════════════════════════════════
-- Listo. Probá crear el torneo de nuevo.
-- ════════════════════════════════════════════════════════════════════
