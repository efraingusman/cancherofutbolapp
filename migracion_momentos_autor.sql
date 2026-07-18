-- ═══════════════════════════════════════════════════════════════════
-- MOMENTOS — sellar el AUTOR real (identidad activa)
-- Pendiente al 2026-07-18. Correr en Supabase → SQL Editor.
--
-- Problema: un momento publicado como organización mostraba la foto del
-- JUGADOR. El insert ya sella la identidad activa (_momAuthorFields en
-- canchero-momentos.js), pero sin estas columnas la foto no tiene dónde
-- guardarse y el visor cae al fallback que lee users por email.
--
-- El código YA funciona sin esto (_momInsert saca las columnas que no
-- existen y el momento se guarda igual, con el NOMBRE correcto). Correr
-- esta migración es lo que hace que además salga la FOTO correcta.
--
-- Es idempotente y no destructivo: se puede correr más de una vez.
-- ═══════════════════════════════════════════════════════════════════

alter table public.momentos add column if not exists user_photo text;
alter table public.momentos add column if not exists user_photo_style jsonb;

-- Verificación (debe devolver las dos filas):
-- select column_name, data_type
--   from information_schema.columns
--  where table_schema = 'public'
--    and table_name   = 'momentos'
--    and column_name in ('user_photo', 'user_photo_style');
