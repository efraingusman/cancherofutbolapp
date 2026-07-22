-- ═══════════════════════════════════════════════════════════════════════════
-- CANCHERO — comunidades: sello de identidad del autor — 2026-07-20
-- Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

-- Una misma cuenta (un email) puede publicar como jugador, fanático, equipo o
-- como cualquiera de sus negocios. Antes solo se guardaba el email, así que al
-- cambiar de rol el usuario podía editar y borrar comentarios que había hecho
-- con OTRA identidad. Este sello guarda con cuál se publicó:
--   'jugador' | 'fanatico' | 'club' | 'biz:<id>' | ...
alter table public.community_posts add column if not exists author_identity text;

create index if not exists idx_community_posts_autor
  on public.community_posts(community_id, user_email);

-- ── Seguridad del lado del servidor ───────────────────────────────────────
-- Ojo: la identidad activa es un concepto de la app, el servidor no la conoce.
-- Lo que SÍ se puede exigir en la base es que nadie borre ni edite comentarios
-- de OTRA cuenta. Descomentá este bloque si querés cerrarlo a nivel base
-- (verificá antes que auth.jwt() traiga el email en tu proyecto).
--
-- alter table public.community_posts enable row level security;
--
-- drop policy if exists cp_select_all on public.community_posts;
-- create policy cp_select_all on public.community_posts
--   for select using (true);
--
-- drop policy if exists cp_insert_own on public.community_posts;
-- create policy cp_insert_own on public.community_posts
--   for insert with check (lower(user_email) = lower(auth.jwt() ->> 'email'));
--
-- drop policy if exists cp_update_own on public.community_posts;
-- create policy cp_update_own on public.community_posts
--   for update using (lower(user_email) = lower(auth.jwt() ->> 'email'));
--
-- drop policy if exists cp_delete_own on public.community_posts;
-- create policy cp_delete_own on public.community_posts
--   for delete using (lower(user_email) = lower(auth.jwt() ->> 'email'));

-- Verificación
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'community_posts'
  and column_name = 'author_identity';
