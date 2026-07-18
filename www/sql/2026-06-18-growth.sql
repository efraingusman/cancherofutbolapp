-- ============================================================
-- Canchero — Crecimiento y engagement (2026-06-18)
-- Pegar en Supabase → SQL Editor → Run. Seguro de correr varias veces.
-- El front degrada con gracia si esto no está aplicado.
-- ============================================================

-- XP / nivel / racha del jugador (gamificación honesta)
alter table if exists public.users
  add column if not exists xp          int  default 0,
  add column if not exists level       int  default 1,
  add column if not exists streak      int  default 0,
  add column if not exists streak_best int  default 0,
  add column if not exists last_active date;

-- Suscripciones de push (Web Push / Capacitor) — para una ola futura
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  endpoint text,
  p256dh text,
  auth text,
  platform text default 'web',
  created_at timestamptz default now(),
  unique (email, endpoint)
);
alter table if exists public.push_subscriptions enable row level security;
drop policy if exists "push_read"  on public.push_subscriptions;
drop policy if exists "push_write" on public.push_subscriptions;
create policy "push_read"  on public.push_subscriptions for select using (true);
create policy "push_write" on public.push_subscriptions for all using (true) with check (true);

-- Ligas / temporadas locales (para una ola futura)
create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text,
  city text,
  season text,
  created_at timestamptz default now()
);
alter table if exists public.leagues enable row level security;
drop policy if exists "leagues_read"  on public.leagues;
drop policy if exists "leagues_write" on public.leagues;
create policy "leagues_read"  on public.leagues for select using (true);
create policy "leagues_write" on public.leagues for all using (true) with check (true);

create index if not exists ix_users_xp on public.users (xp desc);
