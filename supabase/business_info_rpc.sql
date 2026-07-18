-- ============================================================
-- get_business_info — nombre comercial + tipo de negocio (2026-06-14)
-- RLS bloquea leer business_requests de otros, asi que cualquiera (jugador,
-- otro negocio) ve "nombre de usuario" en vez del nombre del negocio en la
-- lista de chats. Este RPC security-definer expone SOLO nombre + rol de las
-- cuentas de negocio, para todos.
-- Correr en Supabase → SQL Editor.
-- ============================================================

create or replace function public.get_business_info(p_emails text[])
returns table(email text, name text, role text)
language sql security definer set search_path = public as $$
  -- Preferir el nombre del business_request mas reciente; si no hay, users.name
  select distinct on (lower(u.email))
         lower(u.email) as email,
         coalesce(
           (select br.name from business_requests br
              where lower(br.email) = lower(u.email) and coalesce(br.name,'') <> ''
              order by br.created_at desc limit 1),
           u.name
         ) as name,
         coalesce(
           (select br.role from business_requests br
              where lower(br.email) = lower(u.email) and coalesce(br.role,'') <> ''
              order by br.created_at desc limit 1),
           u.role
         ) as role
  from users u
  where lower(u.email) = any (select lower(x) from unnest(p_emails) x)
    and u.role in ('club','complejo','tienda','profesional','organizacion','sponsor');
$$;

grant execute on function public.get_business_info(text[]) to anon, authenticated;
