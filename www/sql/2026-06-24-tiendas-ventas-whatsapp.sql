-- ════════════════════════════════════════════════════════════════════
-- Canchero — Tiendas v2 + Ventas (CRM) + WhatsApp por negocio
-- Fecha: 2026-06-24
-- Aplicar en Supabase → SQL Editor → New query → pegar todo → Run.
--
-- INCLUYE:
--   1. product_variants  (talle/color/SKU con stock independiente)
--   2. restock_requests  ("avisame cuando vuelva el talle X")
--   3. business_sales    (registro de ventas dentro y fuera de Canchero)
--   4. users.whatsapp_number  (negocio conecta su WhatsApp)
--   5. RLS por dueño para cada tabla (lectura pública donde corresponde)
-- ════════════════════════════════════════════════════════════════════

-- ── 1) PRODUCT_VARIANTS ──────────────────────────────────────────────
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null,
  business_email text not null,
  size text,                -- 'S', 'M', 'L', 'XL', '38', '40', etc.
  color text,
  sku text,
  stock integer not null default 0,
  price numeric,            -- precio opcional por variante (override del producto)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_pv_product on public.product_variants(product_id);
create index if not exists idx_pv_business on public.product_variants(business_email);

alter table public.product_variants enable row level security;
drop policy if exists pv_select_all on public.product_variants;
create policy pv_select_all on public.product_variants for select using (true);
drop policy if exists pv_insert_owner on public.product_variants;
create policy pv_insert_owner on public.product_variants for insert
  with check (
    lower(business_email) = lower(coalesce(
      nullif(current_setting('request.jwt.claim.email', true), ''),
      nullif(current_setting('request.jwt.claims', true)::json->>'email', '')
    ))
  );
drop policy if exists pv_update_owner on public.product_variants;
create policy pv_update_owner on public.product_variants for update
  using (
    lower(business_email) = lower(coalesce(
      nullif(current_setting('request.jwt.claim.email', true), ''),
      nullif(current_setting('request.jwt.claims', true)::json->>'email', '')
    ))
  ) with check (true);
drop policy if exists pv_delete_owner on public.product_variants;
create policy pv_delete_owner on public.product_variants for delete
  using (
    lower(business_email) = lower(coalesce(
      nullif(current_setting('request.jwt.claim.email', true), ''),
      nullif(current_setting('request.jwt.claims', true)::json->>'email', '')
    ))
  );

-- ── 2) RESTOCK_REQUESTS ──────────────────────────────────────────────
-- Cliente toca "avisame cuando vuelva" → fila acá → negocio ve cuánta gente espera ese talle.
create table if not exists public.restock_requests (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null,
  business_email text not null,
  user_email text not null,
  user_name text,
  size text,
  notes text,
  notified boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_rr_product on public.restock_requests(product_id);
create index if not exists idx_rr_business on public.restock_requests(business_email);
create index if not exists idx_rr_user on public.restock_requests(user_email);

alter table public.restock_requests enable row level security;
drop policy if exists rr_select_business_or_self on public.restock_requests;
create policy rr_select_business_or_self on public.restock_requests for select
  using (
    lower(business_email) = lower(coalesce(
      nullif(current_setting('request.jwt.claim.email', true), ''),
      nullif(current_setting('request.jwt.claims', true)::json->>'email', '')
    ))
    or lower(user_email) = lower(coalesce(
      nullif(current_setting('request.jwt.claim.email', true), ''),
      nullif(current_setting('request.jwt.claims', true)::json->>'email', '')
    ))
  );
drop policy if exists rr_insert_self on public.restock_requests;
create policy rr_insert_self on public.restock_requests for insert
  with check (
    lower(user_email) = lower(coalesce(
      nullif(current_setting('request.jwt.claim.email', true), ''),
      nullif(current_setting('request.jwt.claims', true)::json->>'email', '')
    ))
  );
drop policy if exists rr_update_business on public.restock_requests;
create policy rr_update_business on public.restock_requests for update
  using (
    lower(business_email) = lower(coalesce(
      nullif(current_setting('request.jwt.claim.email', true), ''),
      nullif(current_setting('request.jwt.claims', true)::json->>'email', '')
    ))
  ) with check (true);
drop policy if exists rr_delete_self_or_business on public.restock_requests;
create policy rr_delete_self_or_business on public.restock_requests for delete
  using (
    lower(business_email) = lower(coalesce(
      nullif(current_setting('request.jwt.claim.email', true), ''),
      nullif(current_setting('request.jwt.claims', true)::json->>'email', '')
    ))
    or lower(user_email) = lower(coalesce(
      nullif(current_setting('request.jwt.claim.email', true), ''),
      nullif(current_setting('request.jwt.claims', true)::json->>'email', '')
    ))
  );

-- ── 3) BUSINESS_SALES ────────────────────────────────────────────────
-- Registro de ventas. Channel: 'canchero' (cliente compró por la app),
-- 'whatsapp', 'instagram', 'presencial', 'otro' (negocio carga venta externa al CRM).
create table if not exists public.business_sales (
  id uuid primary key default gen_random_uuid(),
  business_email text not null,
  product_id uuid,
  product_name text,
  variant_id uuid,
  size text,
  qty integer not null default 1,
  unit_price numeric not null default 0,
  total numeric not null default 0,
  channel text not null default 'canchero',  -- 'canchero','whatsapp','instagram','presencial','otro'
  client_email text,
  client_name text,
  client_phone text,
  notes text,
  status text default 'pendiente',  -- 'pendiente','confirmada','entregada','cancelada'
  sold_at timestamptz default now(),
  created_at timestamptz default now()
);
create index if not exists idx_bs_business on public.business_sales(business_email);
create index if not exists idx_bs_product on public.business_sales(product_id);
create index if not exists idx_bs_status on public.business_sales(status);
create index if not exists idx_bs_sold_at on public.business_sales(sold_at desc);

alter table public.business_sales enable row level security;
drop policy if exists bs_select_owner_or_client on public.business_sales;
create policy bs_select_owner_or_client on public.business_sales for select
  using (
    lower(business_email) = lower(coalesce(
      nullif(current_setting('request.jwt.claim.email', true), ''),
      nullif(current_setting('request.jwt.claims', true)::json->>'email', '')
    ))
    or lower(coalesce(client_email,'')) = lower(coalesce(
      nullif(current_setting('request.jwt.claim.email', true), ''),
      nullif(current_setting('request.jwt.claims', true)::json->>'email', '')
    ))
  );
drop policy if exists bs_insert_owner_or_client on public.business_sales;
create policy bs_insert_owner_or_client on public.business_sales for insert
  with check (
    lower(business_email) = lower(coalesce(
      nullif(current_setting('request.jwt.claim.email', true), ''),
      nullif(current_setting('request.jwt.claims', true)::json->>'email', '')
    ))
    or lower(coalesce(client_email,'')) = lower(coalesce(
      nullif(current_setting('request.jwt.claim.email', true), ''),
      nullif(current_setting('request.jwt.claims', true)::json->>'email', '')
    ))
  );
drop policy if exists bs_update_owner on public.business_sales;
create policy bs_update_owner on public.business_sales for update
  using (
    lower(business_email) = lower(coalesce(
      nullif(current_setting('request.jwt.claim.email', true), ''),
      nullif(current_setting('request.jwt.claims', true)::json->>'email', '')
    ))
  ) with check (true);
drop policy if exists bs_delete_owner on public.business_sales;
create policy bs_delete_owner on public.business_sales for delete
  using (
    lower(business_email) = lower(coalesce(
      nullif(current_setting('request.jwt.claim.email', true), ''),
      nullif(current_setting('request.jwt.claims', true)::json->>'email', '')
    ))
  );

-- ── 4) USERS: agregar whatsapp_number (negocios) ─────────────────────
alter table public.users add column if not exists whatsapp_number text;

-- ── 4b) MATCHES: guardia para no propagar estadísticas dos veces ─────
alter table public.matches add column if not exists stats_propagated boolean default false;
-- Opcional: validar formato E.164 simple (sin lanzar excepción si la fila ya existe)
-- alter table public.users add constraint users_whatsapp_format
--   check (whatsapp_number is null or whatsapp_number ~ '^\+?[0-9]{6,15}$');

-- ════════════════════════════════════════════════════════════════════
-- Verificación rápida después de correr:
--   select count(*) from public.product_variants;       -- 0 esperado
--   select count(*) from public.restock_requests;       -- 0 esperado
--   select count(*) from public.business_sales;         -- 0 esperado
--   select column_name from information_schema.columns where table_name='users' and column_name='whatsapp_number';
-- ════════════════════════════════════════════════════════════════════
