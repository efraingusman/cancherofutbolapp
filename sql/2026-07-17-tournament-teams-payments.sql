-- Canchero — CRM Clientes: seguimiento de pagos por equipo inscripto.
-- Correr en Supabase → SQL Editor. Sin estas columnas, el editor de pagos guarda igual
-- lo que puede (payment_status), pero NO el monto/fechas/notas.
alter table public.tournament_teams add column if not exists paid_amount numeric;
alter table public.tournament_teams add column if not exists paid_at timestamptz;
alter table public.tournament_teams add column if not exists next_payment_at date;
alter table public.tournament_teams add column if not exists notes text;
