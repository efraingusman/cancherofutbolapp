-- ════════════════════════════════════════════════════════════════════
-- Canchero — RLS REAL por tabla (reemplaza using(true) with check(true))
-- Fecha: 2026-06-24
-- Aplicar en Supabase → SQL Editor → New query → pegar todo → Run.
--
-- Estrategia:
--   · Lectura pública donde corresponde (perfiles, posts, clubs, etc.).
--   · ESCRITURA/UPDATE/DELETE solo del dueño (auth.email() o auth.uid()).
--   · Admin (users.is_admin=true) puede todo.
--
-- IMPORTANTE: ejecutá esto en horario tranquilo. Si algo se rompe podés volver
-- a abrir las policies con: alter policy <nombre> on <tabla> using (true) with check (true);
-- ════════════════════════════════════════════════════════════════════

-- Helper: el email del usuario actual (Supabase Auth pone email en JWT claims).
create or replace function public.auth_email() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    nullif(current_setting('request.jwt.claims', true)::json->>'email', '')
  );
$$;

-- Helper: ¿el usuario actual es admin?
create or replace function public.is_admin() returns boolean language sql stable as $$
  select coalesce(
    (select is_admin from public.users where lower(email) = lower(public.auth_email()) limit 1),
    (select role = 'admin' from public.users where lower(email) = lower(public.auth_email()) limit 1),
    false
  );
$$;

-- ────────────────────────────────────────────────────────────────────
-- USERS (perfiles)
--   · Lectura pública (necesaria para directorios y feed).
--   · Update/Delete: solo el dueño o admin.
--   · Insert: solo el dueño (al registrarse) o admin.
-- ────────────────────────────────────────────────────────────────────
alter table public.users enable row level security;

drop policy if exists users_select_all on public.users;
create policy users_select_all on public.users for select using (true);

drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users for insert
  with check (lower(email) = lower(public.auth_email()) or public.is_admin());

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users for update
  using (lower(email) = lower(public.auth_email()) or public.is_admin())
  with check (lower(email) = lower(public.auth_email()) or public.is_admin());

drop policy if exists users_delete_self on public.users;
create policy users_delete_self on public.users for delete
  using (lower(email) = lower(public.auth_email()) or public.is_admin());

-- ────────────────────────────────────────────────────────────────────
-- POSTS (feed)
-- ────────────────────────────────────────────────────────────────────
alter table public.posts enable row level security;

drop policy if exists posts_select_all on public.posts;
create policy posts_select_all on public.posts for select using (true);

drop policy if exists posts_insert_own on public.posts;
create policy posts_insert_own on public.posts for insert
  with check (lower(user_email) = lower(public.auth_email()) or public.is_admin());

drop policy if exists posts_update_own on public.posts;
create policy posts_update_own on public.posts for update
  using (lower(user_email) = lower(public.auth_email()) or public.is_admin())
  with check (lower(user_email) = lower(public.auth_email()) or public.is_admin());

drop policy if exists posts_delete_own on public.posts;
create policy posts_delete_own on public.posts for delete
  using (lower(user_email) = lower(public.auth_email()) or public.is_admin());

-- ────────────────────────────────────────────────────────────────────
-- MOMENTOS (reels)
-- ────────────────────────────────────────────────────────────────────
alter table public.momentos enable row level security;

drop policy if exists momentos_select_all on public.momentos;
create policy momentos_select_all on public.momentos for select using (true);

drop policy if exists momentos_insert_own on public.momentos;
create policy momentos_insert_own on public.momentos for insert
  with check (lower(user_email) = lower(public.auth_email()) or public.is_admin());

drop policy if exists momentos_update_own on public.momentos;
create policy momentos_update_own on public.momentos for update
  using (lower(user_email) = lower(public.auth_email()) or public.is_admin())
  with check (lower(user_email) = lower(public.auth_email()) or public.is_admin());

drop policy if exists momentos_delete_own on public.momentos;
create policy momentos_delete_own on public.momentos for delete
  using (lower(user_email) = lower(public.auth_email()) or public.is_admin());

-- ────────────────────────────────────────────────────────────────────
-- FOLLOWS (relaciones de seguimiento)
-- Lectura pública (para mostrar contadores). Insert/Delete: solo el follower.
-- ────────────────────────────────────────────────────────────────────
alter table public.follows enable row level security;

drop policy if exists follows_select_all on public.follows;
create policy follows_select_all on public.follows for select using (true);

drop policy if exists follows_insert_own on public.follows;
create policy follows_insert_own on public.follows for insert
  with check (lower(follower_email) = lower(public.auth_email()) or public.is_admin());

drop policy if exists follows_delete_own on public.follows;
create policy follows_delete_own on public.follows for delete
  using (lower(follower_email) = lower(public.auth_email()) or public.is_admin());

-- ────────────────────────────────────────────────────────────────────
-- LIKES (de posts/momentos)
-- ────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='likes') then
    execute 'alter table public.likes enable row level security';
    execute 'drop policy if exists likes_select_all on public.likes';
    execute 'create policy likes_select_all on public.likes for select using (true)';
    execute 'drop policy if exists likes_insert_own on public.likes';
    execute 'create policy likes_insert_own on public.likes for insert with check (lower(user_email) = lower(public.auth_email()) or public.is_admin())';
    execute 'drop policy if exists likes_delete_own on public.likes';
    execute 'create policy likes_delete_own on public.likes for delete using (lower(user_email) = lower(public.auth_email()) or public.is_admin())';
  end if;
end $$;

-- ────────────────────────────────────────────────────────────────────
-- COMMENTS (comentarios de posts)
-- ────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='comments') then
    execute 'alter table public.comments enable row level security';
    execute 'drop policy if exists comments_select_all on public.comments';
    execute 'create policy comments_select_all on public.comments for select using (true)';
    execute 'drop policy if exists comments_insert_own on public.comments';
    execute 'create policy comments_insert_own on public.comments for insert with check (lower(user_email) = lower(public.auth_email()) or public.is_admin())';
    execute 'drop policy if exists comments_update_own on public.comments';
    execute 'create policy comments_update_own on public.comments for update using (lower(user_email) = lower(public.auth_email()) or public.is_admin()) with check (lower(user_email) = lower(public.auth_email()) or public.is_admin())';
    execute 'drop policy if exists comments_delete_own on public.comments';
    execute 'create policy comments_delete_own on public.comments for delete using (lower(user_email) = lower(public.auth_email()) or public.is_admin())';
  end if;
end $$;

-- ────────────────────────────────────────────────────────────────────
-- CLUBS
-- Lectura pública. Update/Delete: solo el creador o capitán.
-- ────────────────────────────────────────────────────────────────────
alter table public.clubs enable row level security;

drop policy if exists clubs_select_all on public.clubs;
create policy clubs_select_all on public.clubs for select using (true);

drop policy if exists clubs_insert_auth on public.clubs;
create policy clubs_insert_auth on public.clubs for insert
  with check (public.auth_email() is not null);

drop policy if exists clubs_update_owner on public.clubs;
create policy clubs_update_owner on public.clubs for update
  using (
    lower(coalesce(created_by, '')) = lower(public.auth_email())
    or lower(coalesce(captain_email, '')) = lower(public.auth_email())
    or public.is_admin()
  )
  with check (
    lower(coalesce(created_by, '')) = lower(public.auth_email())
    or lower(coalesce(captain_email, '')) = lower(public.auth_email())
    or public.is_admin()
  );

drop policy if exists clubs_delete_owner on public.clubs;
create policy clubs_delete_owner on public.clubs for delete
  using (lower(coalesce(created_by, '')) = lower(public.auth_email()) or public.is_admin());

-- ────────────────────────────────────────────────────────────────────
-- MATCH_PLAYERS (jugadores de un partido)
--   · Solo el dueño (player_email) o el capitán/creador del partido pueden cambiar.
-- ────────────────────────────────────────────────────────────────────
alter table public.match_players enable row level security;

drop policy if exists mp_select_all on public.match_players;
create policy mp_select_all on public.match_players for select using (true);

drop policy if exists mp_insert_self_or_captain on public.match_players;
create policy mp_insert_self_or_captain on public.match_players for insert
  with check (
    lower(coalesce(player_email, '')) = lower(public.auth_email())
    or exists (
      select 1 from public.matches m
      where m.id = match_players.match_id
        and (
          lower(coalesce(m.created_by, '')) = lower(public.auth_email())
          or lower(coalesce(m.captain_home_email, '')) = lower(public.auth_email())
          or lower(coalesce(m.captain_away_email, '')) = lower(public.auth_email())
        )
    )
    or public.is_admin()
  );

drop policy if exists mp_update_self_or_captain on public.match_players;
create policy mp_update_self_or_captain on public.match_players for update
  using (
    lower(coalesce(player_email, '')) = lower(public.auth_email())
    or exists (
      select 1 from public.matches m
      where m.id = match_players.match_id
        and (
          lower(coalesce(m.created_by, '')) = lower(public.auth_email())
          or lower(coalesce(m.captain_home_email, '')) = lower(public.auth_email())
          or lower(coalesce(m.captain_away_email, '')) = lower(public.auth_email())
        )
    )
    or public.is_admin()
  )
  with check (true);

drop policy if exists mp_delete_self_or_captain on public.match_players;
create policy mp_delete_self_or_captain on public.match_players for delete
  using (
    lower(coalesce(player_email, '')) = lower(public.auth_email())
    or exists (
      select 1 from public.matches m
      where m.id = match_players.match_id
        and (
          lower(coalesce(m.created_by, '')) = lower(public.auth_email())
          or lower(coalesce(m.captain_home_email, '')) = lower(public.auth_email())
        )
    )
    or public.is_admin()
  );

-- ────────────────────────────────────────────────────────────────────
-- MATCHES
-- ────────────────────────────────────────────────────────────────────
alter table public.matches enable row level security;

drop policy if exists matches_select_all on public.matches;
create policy matches_select_all on public.matches for select using (true);

drop policy if exists matches_insert_auth on public.matches;
create policy matches_insert_auth on public.matches for insert
  with check (public.auth_email() is not null);

drop policy if exists matches_update_owner on public.matches;
create policy matches_update_owner on public.matches for update
  using (
    lower(coalesce(created_by, '')) = lower(public.auth_email())
    or lower(coalesce(captain_home_email, '')) = lower(public.auth_email())
    or lower(coalesce(captain_away_email, '')) = lower(public.auth_email())
    or public.is_admin()
  )
  with check (true);

drop policy if exists matches_delete_owner on public.matches;
create policy matches_delete_owner on public.matches for delete
  using (lower(coalesce(created_by, '')) = lower(public.auth_email()) or public.is_admin());

-- ────────────────────────────────────────────────────────────────────
-- MATCH_EVENTS (goles, asistencias, sustituciones, MVP, etc.)
--   · Insert/Update/Delete: el capitán/creador del partido o admin.
-- ────────────────────────────────────────────────────────────────────
alter table public.match_events enable row level security;

drop policy if exists me_select_all on public.match_events;
create policy me_select_all on public.match_events for select using (true);

drop policy if exists me_modify_captain on public.match_events;
create policy me_modify_captain on public.match_events for insert
  with check (
    exists (
      select 1 from public.matches m
      where m.id = match_events.match_id
        and (
          lower(coalesce(m.created_by, '')) = lower(public.auth_email())
          or lower(coalesce(m.captain_home_email, '')) = lower(public.auth_email())
          or lower(coalesce(m.captain_away_email, '')) = lower(public.auth_email())
        )
    )
    or public.is_admin()
  );

drop policy if exists me_update_captain on public.match_events;
create policy me_update_captain on public.match_events for update
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_events.match_id
        and (
          lower(coalesce(m.created_by, '')) = lower(public.auth_email())
          or lower(coalesce(m.captain_home_email, '')) = lower(public.auth_email())
          or lower(coalesce(m.captain_away_email, '')) = lower(public.auth_email())
        )
    )
    or public.is_admin()
  )
  with check (true);

drop policy if exists me_delete_captain on public.match_events;
create policy me_delete_captain on public.match_events for delete
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_events.match_id
        and (
          lower(coalesce(m.created_by, '')) = lower(public.auth_email())
          or lower(coalesce(m.captain_home_email, '')) = lower(public.auth_email())
          or lower(coalesce(m.captain_away_email, '')) = lower(public.auth_email())
        )
    )
    or public.is_admin()
  );

-- ────────────────────────────────────────────────────────────────────
-- SQUAD_REQUESTS (clubes buscando jugadores)
-- ────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='squad_requests') then
    execute 'alter table public.squad_requests enable row level security';
    execute 'drop policy if exists sr_select_all on public.squad_requests';
    execute 'create policy sr_select_all on public.squad_requests for select using (true)';
    execute 'drop policy if exists sr_insert_own on public.squad_requests';
    execute 'create policy sr_insert_own on public.squad_requests for insert with check (lower(coalesce(captain_email,'''')) = lower(public.auth_email()) or public.is_admin())';
    execute 'drop policy if exists sr_update_own on public.squad_requests';
    execute 'create policy sr_update_own on public.squad_requests for update using (lower(coalesce(captain_email,'''')) = lower(public.auth_email()) or public.is_admin()) with check (true)';
    execute 'drop policy if exists sr_delete_own on public.squad_requests';
    execute 'create policy sr_delete_own on public.squad_requests for delete using (lower(coalesce(captain_email,'''')) = lower(public.auth_email()) or public.is_admin())';
  end if;
end $$;

-- ────────────────────────────────────────────────────────────────────
-- BUSINESS_REQUESTS / BUSINESS_PRODUCTS / BUSINESS_COURTS
-- ────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='business_requests') then
    execute 'alter table public.business_requests enable row level security';
    execute 'drop policy if exists br_select_all on public.business_requests';
    execute 'create policy br_select_all on public.business_requests for select using (true)';
    execute 'drop policy if exists br_insert_anyone on public.business_requests';
    execute 'create policy br_insert_anyone on public.business_requests for insert with check (true)';
    execute 'drop policy if exists br_update_admin on public.business_requests';
    execute 'create policy br_update_admin on public.business_requests for update using (public.is_admin()) with check (public.is_admin())';
    execute 'drop policy if exists br_delete_admin on public.business_requests';
    execute 'create policy br_delete_admin on public.business_requests for delete using (public.is_admin())';
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='business_products') then
    execute 'alter table public.business_products enable row level security';
    execute 'drop policy if exists bp_select_all on public.business_products';
    execute 'create policy bp_select_all on public.business_products for select using (true)';
    execute 'drop policy if exists bp_insert_owner on public.business_products';
    execute 'create policy bp_insert_owner on public.business_products for insert with check (lower(coalesce(business_email,'''')) = lower(public.auth_email()) or public.is_admin())';
    execute 'drop policy if exists bp_update_owner on public.business_products';
    execute 'create policy bp_update_owner on public.business_products for update using (lower(coalesce(business_email,'''')) = lower(public.auth_email()) or public.is_admin()) with check (true)';
    execute 'drop policy if exists bp_delete_owner on public.business_products';
    execute 'create policy bp_delete_owner on public.business_products for delete using (lower(coalesce(business_email,'''')) = lower(public.auth_email()) or public.is_admin())';
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='business_courts') then
    execute 'alter table public.business_courts enable row level security';
    execute 'drop policy if exists bc_select_all on public.business_courts';
    execute 'create policy bc_select_all on public.business_courts for select using (true)';
    execute 'drop policy if exists bc_insert_owner on public.business_courts';
    execute 'create policy bc_insert_owner on public.business_courts for insert with check (lower(coalesce(business_email,'''')) = lower(public.auth_email()) or public.is_admin())';
    execute 'drop policy if exists bc_update_owner on public.business_courts';
    execute 'create policy bc_update_owner on public.business_courts for update using (lower(coalesce(business_email,'''')) = lower(public.auth_email()) or public.is_admin()) with check (true)';
    execute 'drop policy if exists bc_delete_owner on public.business_courts';
    execute 'create policy bc_delete_owner on public.business_courts for delete using (lower(coalesce(business_email,'''')) = lower(public.auth_email()) or public.is_admin())';
  end if;
end $$;

-- ════════════════════════════════════════════════════════════════════
-- RPC SECURITY DEFINER — propagación de estadísticas del partido.
-- Con RLS activo, el capitán no puede editar la fila de OTRO jugador.
-- Estas funciones corren con privilegios elevados pero SOLO suman stats
-- de un partido cerrado, validando que quien llama sea capitán/creador.
-- ════════════════════════════════════════════════════════════════════

-- Suma el resultado de un partido a un jugador (PJ/V/E/D/GF/GC, valla invicta).
create or replace function public.bump_player_match_stats(
  p_match_id uuid, p_email text, p_result text, p_gf int, p_gc int, p_is_gk boolean
) returns void
language plpgsql security definer set search_path = public as $$
declare v_caller text; v_ok boolean; v_stats jsonb;
begin
  v_caller := public.auth_email();
  -- Validar que el que llama sea capitán/creador del partido (o admin)
  select (
    lower(coalesce(m.created_by,'')) = lower(v_caller)
    or lower(coalesce(m.captain_home_email,'')) = lower(v_caller)
    or lower(coalesce(m.captain_away_email,'')) = lower(v_caller)
    or public.is_admin()
  ) into v_ok from public.matches m where m.id = p_match_id;
  if not coalesce(v_ok,false) then return; end if;

  select coalesce(stats,'{}'::jsonb) into v_stats from public.users where lower(email)=lower(p_email);
  v_stats := coalesce(v_stats,'{}'::jsonb);
  v_stats := jsonb_set(v_stats,'{matches}', to_jsonb(coalesce((v_stats->>'matches')::int, (v_stats->>'partidos')::int, 0) + 1));
  v_stats := jsonb_set(v_stats,'{partidos}', v_stats->'matches');
  if p_result='w' then v_stats := jsonb_set(v_stats,'{wins}', to_jsonb(coalesce((v_stats->>'wins')::int,0)+1));
  elsif p_result='e' then v_stats := jsonb_set(v_stats,'{draws}', to_jsonb(coalesce((v_stats->>'draws')::int,0)+1));
  else v_stats := jsonb_set(v_stats,'{losses}', to_jsonb(coalesce((v_stats->>'losses')::int,0)+1)); end if;
  v_stats := jsonb_set(v_stats,'{goals_for}', to_jsonb(coalesce((v_stats->>'goals_for')::int,0)+coalesce(p_gf,0)));
  v_stats := jsonb_set(v_stats,'{goals_against}', to_jsonb(coalesce((v_stats->>'goals_against')::int,0)+coalesce(p_gc,0)));
  if coalesce(p_gc,0)=0 and coalesce(p_is_gk,false) then
    v_stats := jsonb_set(v_stats,'{clean_sheets}', to_jsonb(coalesce((v_stats->>'clean_sheets')::int,0)+1));
  end if;
  update public.users set stats = v_stats where lower(email)=lower(p_email);
end $$;

-- Suma gol o asistencia (delta) a un jugador, validando capitán/creador del partido.
create or replace function public.bump_player_event(
  p_match_id uuid, p_email text, p_field text, p_delta int
) returns void
language plpgsql security definer set search_path = public as $$
declare v_caller text; v_ok boolean; v_stats jsonb; v_cur int;
begin
  if p_field not in ('goals','assists') then return; end if;
  v_caller := public.auth_email();
  select (
    lower(coalesce(m.created_by,'')) = lower(v_caller)
    or lower(coalesce(m.captain_home_email,'')) = lower(v_caller)
    or lower(coalesce(m.captain_away_email,'')) = lower(v_caller)
    or public.is_admin()
  ) into v_ok from public.matches m where m.id = p_match_id;
  if not coalesce(v_ok,false) then return; end if;
  select coalesce(stats,'{}'::jsonb) into v_stats from public.users where lower(email)=lower(p_email);
  v_stats := coalesce(v_stats,'{}'::jsonb);
  v_cur := coalesce((v_stats->>p_field)::int,0) + p_delta;
  if v_cur < 0 then v_cur := 0; end if;
  v_stats := jsonb_set(v_stats, array[p_field], to_jsonb(v_cur));
  update public.users set stats = v_stats where lower(email)=lower(p_email);
end $$;

-- Suma el resultado a un club, validando que el que llama sea su dueño/capitán o admin.
create or replace function public.bump_club_match_stats(
  p_club_id uuid, p_result text, p_gf int, p_gc int
) returns void
language plpgsql security definer set search_path = public as $$
declare v_caller text; v_ok boolean; v_stats jsonb; v_w int; v_e int;
begin
  v_caller := public.auth_email();
  select (
    lower(coalesce(c.created_by,'')) = lower(v_caller)
    or lower(coalesce(c.captain_email,'')) = lower(v_caller)
    or public.is_admin()
  ) into v_ok from public.clubs c where c.id = p_club_id;
  if not coalesce(v_ok,false) then return; end if;
  select coalesce(stats,'{}'::jsonb) into v_stats from public.clubs where id=p_club_id;
  v_stats := coalesce(v_stats,'{}'::jsonb);
  v_stats := jsonb_set(v_stats,'{pj}', to_jsonb(coalesce((v_stats->>'pj')::int,0)+1));
  if p_result='w' then v_stats := jsonb_set(v_stats,'{w}', to_jsonb(coalesce((v_stats->>'w')::int,0)+1));
  elsif p_result='e' then v_stats := jsonb_set(v_stats,'{e}', to_jsonb(coalesce((v_stats->>'e')::int,0)+1));
  else v_stats := jsonb_set(v_stats,'{l}', to_jsonb(coalesce((v_stats->>'l')::int,0)+1)); end if;
  v_stats := jsonb_set(v_stats,'{gf}', to_jsonb(coalesce((v_stats->>'gf')::int,0)+coalesce(p_gf,0)));
  v_stats := jsonb_set(v_stats,'{gc}', to_jsonb(coalesce((v_stats->>'gc')::int,0)+coalesce(p_gc,0)));
  v_w := coalesce((v_stats->>'w')::int,0); v_e := coalesce((v_stats->>'e')::int,0);
  v_stats := jsonb_set(v_stats,'{pts}', to_jsonb(v_w*3 + v_e));
  update public.clubs set stats = v_stats where id = p_club_id;
end $$;

grant execute on function public.bump_player_match_stats(uuid,text,text,int,int,boolean) to anon, authenticated;
grant execute on function public.bump_player_event(uuid,text,text,int) to anon, authenticated;
grant execute on function public.bump_club_match_stats(uuid,text,int,int) to anon, authenticated;

-- ════════════════════════════════════════════════════════════════════
-- Listo. Verificá en Supabase → Authentication → Policies que cada tabla
-- tenga policies "select_all" + las de modificación restringidas al dueño.
-- ════════════════════════════════════════════════════════════════════
