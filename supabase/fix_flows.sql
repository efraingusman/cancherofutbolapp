-- ============================================================
-- FIX FLOWS (2026-06-13b)
-- 1) Registro de negocios llega al admin (insert público en
--    business_requests, es un formulario de solicitud).
-- 2) El chat del complejo entrega mensajes (sacar can_dm del
--    insert de messages: bloqueaba conversaciones legítimas).
-- 3) Los negocios muestran su NOMBRE COMERCIAL en chats/perfil
--    (sincronizar users.name desde business_requests.name).
-- Correr en Supabase → SQL Editor.
-- ============================================================

-- 1) business_requests: permitir que cualquiera ENVÍE una solicitud
drop policy if exists br_insert on public.business_requests;
create policy br_insert_public on public.business_requests
  for insert
  with check ( true );

-- (lectura sigue restringida: dueño + admin; eso ya existe)

-- 2) messages: el emisor puede insertar (sin el gate can_dm que
--    rompía el chat complejo↔jugador). El sistema de "solicitudes"
--    de DM se maneja igual a nivel UI con dm_threads.
drop policy if exists msg_insert on public.messages;
create policy msg_insert on public.messages for insert
  with check ( public.me() = lower(sender_email) );

-- 3) Sincronizar el nombre comercial en users.name para negocios ya aprobados
update public.users u
set name = br.name
from public.business_requests br
where lower(u.email) = lower(br.email)
  and coalesce(br.name,'') <> ''
  and u.role in ('club','complejo','tienda','profesional','organizacion','sponsor');

-- Caso puntual conocido (por si la fila de arriba no matchea por mayúsculas)
update public.users set name = 'Sportivo Cerro'
where lower(email) = 'hijitosuy@gmail.com';
