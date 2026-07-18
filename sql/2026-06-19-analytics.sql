-- ============================================================
-- Canchero — Analytics de uso (2026-06-19)
-- Pegar en Supabase → SQL Editor → Run.
-- ============================================================
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_email text,
  role text,
  event text,
  props jsonb,
  created_at timestamptz default now()
);
alter table if exists public.analytics_events enable row level security;
drop policy if exists "analytics_insert" on public.analytics_events;
drop policy if exists "analytics_read"   on public.analytics_events;
-- Cualquiera puede insertar su evento; lectura abierta (la vista la usa solo el admin desde el front).
create policy "analytics_insert" on public.analytics_events for insert with check (true);
create policy "analytics_read"   on public.analytics_events for select using (true);
create index if not exists ix_analytics_event   on public.analytics_events (event);
create index if not exists ix_analytics_created on public.analytics_events (created_at desc);
