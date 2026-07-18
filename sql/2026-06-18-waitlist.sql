-- ============================================================
-- Canchero — Lista de espera del APK (2026-06-18)
-- Pegar en Supabase → SQL Editor → Run. Seguro de correr varias veces.
-- ============================================================
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  platform text default 'web',
  created_at timestamptz default now(),
  unique (email)
);
alter table if exists public.waitlist enable row level security;
drop policy if exists "waitlist_read"  on public.waitlist;
drop policy if exists "waitlist_write" on public.waitlist;
create policy "waitlist_read"  on public.waitlist for select using (true);
create policy "waitlist_write" on public.waitlist for all using (true) with check (true);
