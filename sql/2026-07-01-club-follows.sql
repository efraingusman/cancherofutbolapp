-- Seguidores de clubes (perfil de equipo completo — feedback 2026-07-01)
create table if not exists public.club_follows (
  id uuid primary key default gen_random_uuid(),
  club_id text not null,
  follower_email text not null,
  follower_name text,
  created_at timestamptz not null default now(),
  unique (club_id, follower_email)
);

alter table public.club_follows enable row level security;

-- Cualquiera logueado puede ver los seguidores (conteo público del perfil)
drop policy if exists club_follows_select on public.club_follows;
create policy club_follows_select on public.club_follows
  for select using (true);

-- Solo puedo seguir/dejar de seguir con MI email
drop policy if exists club_follows_insert on public.club_follows;
create policy club_follows_insert on public.club_follows
  for insert with check (lower(follower_email) = public.me());

drop policy if exists club_follows_delete on public.club_follows;
create policy club_follows_delete on public.club_follows
  for delete using (lower(follower_email) = public.me());
