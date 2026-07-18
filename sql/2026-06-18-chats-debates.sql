-- ============================================================
-- Canchero — Chats por scope, Debates con portada, Encuestas (2026-06-18)
-- Aplicar en el SQL editor de Supabase.
-- El front degrada con gracia si esto no está aplicado.
-- ============================================================

-- 1) Chats del partido segmentados por scope (mi equipo / ambos / capitanes)
alter table if exists public.group_chats
  add column if not exists scope text default 'ambos';   -- equipo_home | equipo_away | ambos | capitanes

-- 2) Debates con foto de portada + categoría
alter table if exists public.debates
  add column if not exists cover_url text,
  add column if not exists category text;                -- jugadores | clubes | mundial

-- Si la tabla debates no existe todavía, crearla:
create table if not exists public.debates (
  id uuid primary key default gen_random_uuid(),
  title text,
  side_a text,
  side_b text,
  category text default 'jugadores',
  cover_url text,
  created_by text,
  is_live boolean default true,
  created_at timestamptz default now()
);

-- 3) Votos de encuesta (para no volver a mostrar una encuesta ya respondida)
create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null,
  voter_email text not null,
  option_index int,
  created_at timestamptz default now(),
  unique (poll_id, voter_email)
);

-- ── RLS ──
alter table public.debates enable row level security;
alter table public.poll_votes enable row level security;

create policy "debates_read"   on public.debates    for select using (true);
create policy "debates_write"  on public.debates    for all using (true) with check (true);
create policy "pollvotes_read" on public.poll_votes for select using (true);
create policy "pollvotes_write" on public.poll_votes for all using (true) with check (true);

-- Realtime de chats por scope (opcional)
alter publication supabase_realtime add table public.group_messages;
