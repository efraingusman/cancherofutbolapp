-- ============================================================================
-- Canchero — SQL FASE 1 (Admin CRM nivel CEO)  ·  2026-07-03
-- Correr COMPLETO en el SQL editor de Supabase (idempotente: se puede re-correr).
-- ============================================================================

-- ── 1.2 FINANZAS: gastos fijos recurrentes ──────────────────────────────────
create table if not exists public.admin_expenses (
  id           uuid primary key default gen_random_uuid(),
  concepto     text not null,
  proveedor    text,
  monto        numeric(12,2) not null default 0,
  moneda       text not null default 'USD',            -- USD | UYU | ...
  periodicidad text not null default 'mensual',        -- 'mensual' | 'anual' | 'unico'
  fecha_cobro  date,                                    -- día/fecha de facturación
  activo       boolean not null default true,
  notas        text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_admin_expenses_activo      on public.admin_expenses(activo);
create index if not exists idx_admin_expenses_fecha_cobro on public.admin_expenses(fecha_cobro);

-- Solo el admin puede tocar esta tabla. RLS + policy por email admin.
alter table public.admin_expenses enable row level security;
drop policy if exists admin_expenses_admin_all on public.admin_expenses;
create policy admin_expenses_admin_all on public.admin_expenses
  for all
  using ( auth.jwt() ->> 'email' = 'neurovidstudioia@gmail.com' )
  with check ( auth.jwt() ->> 'email' = 'neurovidstudioia@gmail.com' );

-- ── 1.5 ANALYTICS: tabla de eventos de uso + geo + índices ───────────────────
-- El tracker (canchero-analytics.js) inserta acá. Crear si no existe y sumar geo.
create table if not exists public.analytics_events (
  id         bigint generated always as identity primary key,
  user_email text,
  role       text,
  country    text,
  city       text,
  event      text not null,
  props      jsonb,
  created_at timestamptz not null default now()
);
-- Por si la tabla ya existía sin las columnas geo:
alter table public.analytics_events add column if not exists country text;
alter table public.analytics_events add column if not exists city    text;
alter table public.analytics_events add column if not exists role    text;

create index if not exists idx_analytics_events_created on public.analytics_events(created_at desc);
create index if not exists idx_analytics_events_event   on public.analytics_events(event);
create index if not exists idx_analytics_events_role    on public.analytics_events(role);
create index if not exists idx_analytics_events_country on public.analytics_events(country);
create index if not exists idx_analytics_events_city    on public.analytics_events(city);
create index if not exists idx_analytics_events_user    on public.analytics_events(user_email);

-- Inserts anónimos permitidos (fire-and-forget del cliente); lectura solo admin.
alter table public.analytics_events enable row level security;
drop policy if exists analytics_insert_any on public.analytics_events;
create policy analytics_insert_any on public.analytics_events
  for insert with check ( true );
drop policy if exists analytics_select_admin on public.analytics_events;
create policy analytics_select_admin on public.analytics_events
  for select using ( auth.jwt() ->> 'email' = 'neurovidstudioia@gmail.com' );

-- ── 1.3 USUARIOS: bloqueo/suspensión + último acceso ─────────────────────────
alter table public.users add column if not exists blocked      boolean not null default false;
alter table public.users add column if not exists last_seen_at timestamptz;
create index if not exists idx_users_last_seen on public.users(last_seen_at desc);

-- ── 1.2 LÍMITES/USO: tamaños de tablas clave (para el panel de recursos) ─────
-- SECURITY DEFINER para poder leer pg_* desde el cliente. Solo devuelve nombres+bytes.
create or replace function public.admin_table_sizes()
returns table(tabla text, filas bigint, bytes bigint)
language sql
security definer
set search_path = public, pg_catalog
as $$
  select
    c.relname::text as tabla,
    c.reltuples::bigint as filas,
    pg_total_relation_size(c.oid) as bytes
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  order by pg_total_relation_size(c.oid) desc
  limit 40;
$$;
revoke all on function public.admin_table_sizes() from public;
grant execute on function public.admin_table_sizes() to authenticated;

-- ============================================================================
-- FIN. Verificá que no haya errores en rojo. Las policies asumen que tu login
-- admin es neurovidstudioia@gmail.com (cambiá el email si usás otro).
-- ============================================================================
