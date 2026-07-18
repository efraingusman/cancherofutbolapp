-- N2 — Guardados POR ROL/IDENTIDAD
-- Agrega la columna `profile` a saved_posts para separar los guardados por la
-- identidad activa con la que se guardó (jugador / fanatico / team / negocio).
-- El código ya funciona sin esta columna (fallback por email); correr este SQL en
-- Supabase habilita el filtrado real por rol.

alter table if exists public.saved_posts
  add column if not exists profile text;

-- Los guardados existentes quedan como 'jugador' por defecto (identidad base más común).
update public.saved_posts set profile = 'jugador' where profile is null;

-- Índice para las consultas de "mis guardados por rol".
create index if not exists saved_posts_email_profile_idx
  on public.saved_posts (email, profile);
