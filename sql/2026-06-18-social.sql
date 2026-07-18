-- ============================================================
-- Canchero — Funciones sociales (2026-06-18): guardados + estadísticas + búsqueda
-- Pegar en Supabase → SQL Editor → Run. Seguro de correr varias veces.
-- ============================================================

-- Guardar publicaciones / reels (bookmark privado)
create table if not exists public.saved_posts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  post_id text not null,
  kind text default 'post',          -- post | reel | momento
  created_at timestamptz default now(),
  unique (email, post_id)
);
alter table if exists public.saved_posts enable row level security;
drop policy if exists "saved_read"  on public.saved_posts;
drop policy if exists "saved_write" on public.saved_posts;
create policy "saved_read"  on public.saved_posts for select using (true);
create policy "saved_write" on public.saved_posts for all using (true) with check (true);

-- Vistas de publicaciones (estadísticas)
alter table if exists public.posts
  add column if not exists views_count int default 0,
  add column if not exists shares_count int default 0;

-- Búsqueda por texto (relevancia): índice trigram sobre el contenido
create extension if not exists pg_trgm;
create index if not exists ix_posts_content_trgm on public.posts using gin (content gin_trgm_ops);
create index if not exists ix_posts_created on public.posts (created_at desc);
