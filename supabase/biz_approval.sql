-- ════════════════════════════════════════════════════════════════════
-- APROBACIÓN DE NEGOCIOS CON CÓDIGO (2026-06-12)
-- Admin (neurovidstudioia@gmail.com) gestiona business_requests y códigos;
-- el negocio canjea su código con un RPC seguro que activa la cuenta.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.is_admin() returns boolean
language sql stable as $$ select public.me() = 'neurovidstudioia@gmail.com' $$;

-- Admin ve y gestiona TODAS las solicitudes de negocios
drop policy if exists br_admin on public.business_requests;
create policy br_admin on public.business_requests for all
  using (public.is_admin()) with check (public.is_admin());

-- access_codes: solo admin (el canje pasa por RPC security definer)
alter table public.access_codes enable row level security;
do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname='public' and tablename='access_codes'
  loop execute format('drop policy %I on public.access_codes', r.policyname); end loop;
end $$;
create policy ac_admin on public.access_codes for all
  using (public.is_admin()) with check (public.is_admin());

-- Canje del código de activación del negocio:
-- valida contra SU solicitud aprobada y activa la cuenta entera.
create or replace function public.redeem_business_code(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare req record;
begin
  if public.me() = '' then return 'login'; end if;
  select * into req from business_requests
    where lower(email) = public.me()
      and upper(coalesce(approval_code,'')) = upper(trim(p_code))
    order by created_at desc limit 1;
  if not found then return 'invalid'; end if;
  if coalesce(req.code_used, false) then return 'used'; end if;
  if upper(coalesce(req.status,'')) not in ('APROBADO','APROBADA','APPROVED') then return 'not_approved'; end if;
  update business_requests set code_used = true, account_status = 'active' where id = req.id;
  update users set sub_status = 'active' where lower(email) = public.me();
  return 'ok';
end $$;
grant execute on function public.redeem_business_code(text) to authenticated;

-- 2026-06-12 (2): vigencia MENSUAL — el canje activa hasta el 1° del mes
-- siguiente; cada mes el admin envía un código nuevo.
alter table public.users add column if not exists sub_paid_until timestamptz;

create or replace function public.redeem_business_code(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare req record; until_d timestamptz;
begin
  if public.me() = '' then return 'login'; end if;
  select * into req from business_requests
    where lower(email) = public.me()
      and upper(coalesce(approval_code,'')) = upper(trim(p_code))
    order by created_at desc limit 1;
  if not found then
    -- También aceptar códigos mensuales genéricos de access_codes
    if exists (select 1 from access_codes where upper(code)=upper(trim(p_code)) and not used and expires_at > now()) then
      update access_codes set used = true, used_by = public.me(), used_at = now() where upper(code)=upper(trim(p_code));
      until_d := date_trunc('month', now()) + interval '1 month';
      update users set sub_status = 'active', sub_paid_until = until_d where lower(email) = public.me();
      return 'ok';
    end if;
    return 'invalid';
  end if;
  if coalesce(req.code_used, false) then return 'used'; end if;
  if upper(coalesce(req.status,'')) not in ('APROBADO','APROBADA','APPROVED') then return 'not_approved'; end if;
  until_d := date_trunc('month', now()) + interval '1 month';
  update business_requests set code_used = true, account_status = 'active' where id = req.id;
  update users set sub_status = 'active', sub_paid_until = until_d where lower(email) = public.me();
  return 'ok';
end $$;

-- 2026-06-13: al aprobar/canjear, la cuenta pasa a ROL DE NEGOCIO (sino el
-- usuario queda como 'jugador' y la app le abre el feed de jugador).
create or replace function public.redeem_business_code(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare req record; until_d timestamptz;
begin
  if public.me() = '' then return 'login'; end if;
  select * into req from business_requests
    where lower(email) = public.me()
      and upper(coalesce(approval_code,'')) = upper(trim(p_code))
    order by created_at desc limit 1;
  if not found then
    if exists (select 1 from access_codes where upper(code)=upper(trim(p_code)) and not used and expires_at > now()) then
      update access_codes set used = true, used_by = public.me(), used_at = now() where upper(code)=upper(trim(p_code));
      until_d := date_trunc('month', now()) + interval '1 month';
      update users set sub_status='active', sub_paid_until=until_d where lower(email)=public.me();
      return 'ok';
    end if;
    return 'invalid';
  end if;
  if coalesce(req.code_used,false) then return 'used'; end if;
  if upper(coalesce(req.status,'')) not in ('APROBADO','APROBADA','APPROVED') then return 'not_approved'; end if;
  until_d := date_trunc('month', now()) + interval '1 month';
  update business_requests set code_used=true, account_status='active' where id=req.id;
  -- el rol del negocio (tienda/club/profesional/organizacion) reemplaza 'jugador'
  update users set sub_status='active', sub_paid_until=until_d,
                   role = coalesce(nullif(req.role,''), role)
    where lower(email)=public.me();
  return 'ok';
end $$;

-- Al APROBAR (lo corre el admin desde el cliente con su sesión): exponer rol.
-- El cliente ya setea users.role; este helper lo permite vía RPC seguro.
create or replace function public.set_business_role(p_email text, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then return; end if;
  update users set role = p_role where lower(email) = lower(p_email);
end $$;
grant execute on function public.set_business_role(text,text) to authenticated;

-- 2026-06-13 (loop fix): los sub-CRM esperan account_status='activo' (no 'active').
create or replace function public.redeem_business_code(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare req record; until_d timestamptz;
begin
  if public.me() = '' then return 'login'; end if;
  select * into req from business_requests
    where lower(email) = public.me()
      and upper(coalesce(approval_code,'')) = upper(trim(p_code))
    order by created_at desc limit 1;
  if not found then
    if exists (select 1 from access_codes where upper(code)=upper(trim(p_code)) and not used and expires_at > now()) then
      update access_codes set used=true, used_by=public.me(), used_at=now() where upper(code)=upper(trim(p_code));
      until_d := date_trunc('month', now()) + interval '1 month';
      update users set sub_status='active', sub_paid_until=until_d where lower(email)=public.me();
      return 'ok';
    end if;
    return 'invalid';
  end if;
  if coalesce(req.code_used,false) then return 'used'; end if;
  if upper(coalesce(req.status,'')) not in ('APROBADO','APROBADA','APPROVED') then return 'not_approved'; end if;
  until_d := date_trunc('month', now()) + interval '1 month';
  update business_requests set code_used=true, account_status='activo' where id=req.id;
  update users set sub_status='active', sub_paid_until=until_d,
                   role = coalesce(nullif(req.role,''), role)
    where lower(email)=public.me();
  return 'ok';
end $$;

-- reparar la fila ya activada de hijitosuy
update business_requests set account_status='activo' where lower(email)='hijitosuy@gmail.com' and code_used=true;

-- 2026-06-13: el canje también copia el NOMBRE del negocio a users.name
create or replace function public.redeem_business_code(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare req record; until_d timestamptz;
begin
  if public.me() = '' then return 'login'; end if;
  select * into req from business_requests
    where lower(email) = public.me()
      and upper(coalesce(approval_code,'')) = upper(trim(p_code))
    order by created_at desc limit 1;
  if not found then
    if exists (select 1 from access_codes where upper(code)=upper(trim(p_code)) and not used and expires_at > now()) then
      update access_codes set used=true, used_by=public.me(), used_at=now() where upper(code)=upper(trim(p_code));
      until_d := date_trunc('month', now()) + interval '1 month';
      update users set sub_status='active', sub_paid_until=until_d where lower(email)=public.me();
      return 'ok';
    end if;
    return 'invalid';
  end if;
  if coalesce(req.code_used,false) then return 'used'; end if;
  if upper(coalesce(req.status,'')) not in ('APROBADO','APROBADA','APPROVED') then return 'not_approved'; end if;
  until_d := date_trunc('month', now()) + interval '1 month';
  update business_requests set code_used=true, account_status='activo' where id=req.id;
  update users set sub_status='active', sub_paid_until=until_d,
                   role = coalesce(nullif(req.role,''), role),
                   name = coalesce(nullif(req.name,''), name)
    where lower(email)=public.me();
  return 'ok';
end $$;
