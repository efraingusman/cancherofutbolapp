-- ============================================================
-- LIKE A COMENTARIOS (2026-06-13)
-- Tabla de likes por comentario + contador + RPCs de inc/dec.
-- Correr en Supabase → SQL Editor.
-- ============================================================

-- Contador en post_comments
alter table public.post_comments add column if not exists likes_count int default 0;

-- Tabla de likes (1 por usuario/comentario)
create table if not exists public.comment_likes (
  comment_id uuid not null,
  user_email text not null,
  created_at timestamptz default now(),
  primary key (comment_id, user_email)
);
alter table public.comment_likes enable row level security;

drop policy if exists cml_select on public.comment_likes;
create policy cml_select on public.comment_likes for select using ( true );

drop policy if exists cml_insert on public.comment_likes;
create policy cml_insert on public.comment_likes for insert
  with check ( public.me() = lower(user_email) );

drop policy if exists cml_delete on public.comment_likes;
create policy cml_delete on public.comment_likes for delete
  using ( public.me() = lower(user_email) );

-- RPCs para mantener el contador
create or replace function public.inc_comment_likes(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update post_comments set likes_count = coalesce(likes_count,0) + 1 where id = p_id;
$$;

create or replace function public.dec_comment_likes(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update post_comments set likes_count = greatest(coalesce(likes_count,0) - 1, 0) where id = p_id;
$$;
