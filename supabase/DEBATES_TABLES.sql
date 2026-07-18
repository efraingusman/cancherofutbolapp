-- Tablas para la sección DEBATES (Canchero)
-- Ejecutar en Supabase → SQL Editor.

create table if not exists debates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text default 'Actualidad',
  options jsonb not null default '[]',
  created_by text,
  created_at timestamptz default now()
);

create table if not exists debate_votes (
  debate_id uuid references debates(id) on delete cascade,
  user_email text not null,
  option_index int not null,
  created_at timestamptz default now(),
  primary key (debate_id, user_email)
);

create table if not exists debate_comments (
  id uuid primary key default gen_random_uuid(),
  debate_id uuid references debates(id) on delete cascade,
  user_email text,
  user_name text,
  message text not null,
  created_at timestamptz default now()
);

-- RLS abierta (la app ya controla acceso por sesión propia)
alter table debates enable row level security;
alter table debate_votes enable row level security;
alter table debate_comments enable row level security;

create policy "debates_all" on debates for all using (true) with check (true);
create policy "debate_votes_all" on debate_votes for all using (true) with check (true);
create policy "debate_comments_all" on debate_comments for all using (true) with check (true);
