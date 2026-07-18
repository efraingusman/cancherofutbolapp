-- ============================================================
-- ADMIN MANAGE (2026-06-13)
-- Permite al admin (is_admin()) eliminar / suspender / activar
-- cuentas de usuarios y negocios desde el panel. Sin esto, RLS
-- bloquea el DELETE/UPDATE sobre filas que no son del propio admin
-- y los botones "no hacen nada".
-- Correr en el SQL editor de Supabase.
-- Requiere la función public.is_admin() (definida en biz_approval.sql).
-- ============================================================

-- Asegurar columna de estado de cuenta
alter table public.users add column if not exists account_status text default 'activo';

-- USERS: el admin puede ver / actualizar / borrar cualquier fila
drop policy if exists users_admin_all on public.users;
create policy users_admin_all on public.users
  for all
  using ( public.is_admin() )
  with check ( public.is_admin() );

-- BUSINESS_REQUESTS: el admin puede borrar / actualizar cualquier solicitud
drop policy if exists breq_admin_all on public.business_requests;
create policy breq_admin_all on public.business_requests
  for all
  using ( public.is_admin() )
  with check ( public.is_admin() );

-- ACCESS_CODES: el admin gestiona todos
drop policy if exists acodes_admin_all on public.access_codes;
create policy acodes_admin_all on public.access_codes
  for all
  using ( public.is_admin() )
  with check ( public.is_admin() );

-- Borrado en cascada de datos del usuario (lo hace el front igual, pero por las dudas)
-- Nada destructivo automático acá; el front limpia posts/stories.

-- ── RPCs SECURITY DEFINER para admin — bypasean RLS completamente ──

-- Borrar usuario (y datos asociados)
create or replace function public.admin_delete_user(p_email text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then return 'forbidden'; end if;
  delete from posts where user_email = lower(p_email);
  delete from stories where user_email = lower(p_email);
  delete from business_requests where lower(email) = lower(p_email);
  delete from match_players where lower(player_email) = lower(p_email);
  delete from users where lower(email) = lower(p_email);
  return 'ok';
end $$;
grant execute on function public.admin_delete_user(text) to authenticated;

-- Suspender / reactivar cuenta
create or replace function public.admin_set_account_status(p_email text, p_status text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then return 'forbidden'; end if;
  update users set account_status = p_status,
    sub_status = case when p_status = 'suspendido' then 'suspendido' else 'active' end
  where lower(email) = lower(p_email);
  return 'ok';
end $$;
grant execute on function public.admin_set_account_status(text, text) to authenticated;

-- Propagar stats de partido a un jugador (RPC para evitar problemas de RLS)
create or replace function public.bump_player_match_stats(
  p_match_id text, p_email text, p_result text, p_gf int, p_gc int, p_is_gk boolean
) returns void
language plpgsql security definer set search_path = public as $$
declare st jsonb; u_row record;
begin
  select stats into st from users where lower(email) = lower(p_email);
  if st is null then st := '{}'::jsonb; end if;
  st := jsonb_set(st, '{matches}', to_jsonb(coalesce((st->>'matches')::int, 0) + 1));
  st := jsonb_set(st, '{partidos}', to_jsonb(coalesce((st->>'matches')::int, 0) + 1));
  if p_result = 'w' then st := jsonb_set(st, '{wins}', to_jsonb(coalesce((st->>'wins')::int, 0) + 1)); end if;
  if p_result = 'e' then st := jsonb_set(st, '{draws}', to_jsonb(coalesce((st->>'draws')::int, 0) + 1)); end if;
  if p_result = 'l' then st := jsonb_set(st, '{losses}', to_jsonb(coalesce((st->>'losses')::int, 0) + 1)); end if;
  st := jsonb_set(st, '{goals_for}', to_jsonb(coalesce((st->>'goals_for')::int, 0) + p_gf));
  st := jsonb_set(st, '{goals_against}', to_jsonb(coalesce((st->>'goals_against')::int, 0) + p_gc));
  if p_is_gk and p_gc = 0 then st := jsonb_set(st, '{clean_sheets}', to_jsonb(coalesce((st->>'clean_sheets')::int, 0) + 1)); end if;
  update users set stats = st where lower(email) = lower(p_email);
end $$;
grant execute on function public.bump_player_match_stats(text, text, text, int, int, boolean) to authenticated;

-- Bumps goles/asistencias individuales
create or replace function public.bump_player_event(p_match_id text, p_email text, p_field text, p_delta int)
returns void language plpgsql security definer set search_path = public as $$
declare st jsonb;
begin
  select stats into st from users where lower(email) = lower(p_email);
  if st is null then st := '{}'::jsonb; end if;
  st := jsonb_set(st, array[p_field], to_jsonb(greatest(0, coalesce((st->>p_field)::int, 0) + p_delta)));
  update users set stats = st where lower(email) = lower(p_email);
end $$;
grant execute on function public.bump_player_event(text, text, text, int) to authenticated;

-- Propagar stats a club
create or replace function public.bump_club_match_stats(p_club_id text, p_result text, p_gf int, p_gc int)
returns void language plpgsql security definer set search_path = public as $$
declare st jsonb;
begin
  select stats into st from clubs where id::text = p_club_id;
  if st is null then st := '{}'::jsonb; end if;
  st := jsonb_set(st, '{pj}', to_jsonb(coalesce((st->>'pj')::int, 0) + 1));
  if p_result = 'w' then st := jsonb_set(st, '{w}', to_jsonb(coalesce((st->>'w')::int, 0) + 1)); end if;
  if p_result = 'e' then st := jsonb_set(st, '{e}', to_jsonb(coalesce((st->>'e')::int, 0) + 1)); end if;
  if p_result = 'l' then st := jsonb_set(st, '{l}', to_jsonb(coalesce((st->>'l')::int, 0) + 1)); end if;
  st := jsonb_set(st, '{gf}', to_jsonb(coalesce((st->>'gf')::int, 0) + p_gf));
  st := jsonb_set(st, '{gc}', to_jsonb(coalesce((st->>'gc')::int, 0) + p_gc));
  st := jsonb_set(st, '{pts}', to_jsonb(coalesce((st->>'w')::int, 0) * 3 + coalesce((st->>'e')::int, 0)));
  update clubs set stats = st where id::text = p_club_id;
end $$;
grant execute on function public.bump_club_match_stats(text, text, int, int) to authenticated;
