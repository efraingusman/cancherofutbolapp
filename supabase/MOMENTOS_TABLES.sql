-- Tablas para MOMENTOS (Canchero) — ejecutar en Supabase → SQL Editor
create table if not exists momentos (
  id uuid primary key default gen_random_uuid(),
  user_email text, user_name text,
  url text not null, media_type text default 'photo',
  title text, description text, category text default 'Partidos',
  team text, location text,
  likes_count int default 0,
  created_at timestamptz default now()
);
create table if not exists momento_likes (
  momento_id uuid references momentos(id) on delete cascade,
  user_email text not null,
  created_at timestamptz default now(),
  primary key (momento_id, user_email)
);
alter table momentos enable row level security;
alter table momento_likes enable row level security;
drop policy if exists momentos_all on momentos;
drop policy if exists momento_likes_all on momento_likes;
create policy momentos_all on momentos for all using (true) with check (true);
create policy momento_likes_all on momento_likes for all using (true) with check (true);
grant all on momentos, momento_likes to anon, authenticated, service_role;
