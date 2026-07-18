-- Caja (ingresos/egresos manuales) y Proveedores por negocio (P3.8 / P3.9)
create table if not exists business_cashflow (
  id uuid primary key default gen_random_uuid(),
  business_email text not null,
  business_id text,
  type text not null check (type in ('ingreso','egreso')),
  concept text not null,
  amount numeric not null default 0,
  created_at timestamptz default now()
);
create table if not exists business_providers (
  id uuid primary key default gen_random_uuid(),
  business_email text not null,
  business_id text,
  name text not null,
  service text,
  cost numeric default 0,
  created_at timestamptz default now()
);
alter table business_cashflow enable row level security;
alter table business_providers enable row level security;
do $$ begin
  begin
    create policy bcf_own on business_cashflow for all
      using (lower(business_email) = lower(auth.email()))
      with check (lower(business_email) = lower(auth.email()));
  exception when duplicate_object then null; end;
  begin
    create policy bpr_own on business_providers for all
      using (lower(business_email) = lower(auth.email()))
      with check (lower(business_email) = lower(auth.email()));
  exception when duplicate_object then null; end;
end $$;
