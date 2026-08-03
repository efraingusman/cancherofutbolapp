-- Canchero Leyenda (Modo Carrera): ranking de carreras (mejor por usuario).
create table if not exists carrera_scores (
  email text primary key,
  name text,
  score integer not null default 0,
  nivel integer,
  titulos integer,
  club text,
  updated_at timestamptz default now()
);
alter table carrera_scores enable row level security;
do $$ begin
  begin create policy carrera_read on carrera_scores for select using (true);
  exception when duplicate_object then null; end;
  begin create policy carrera_ins on carrera_scores for insert with check (lower(email)=lower(auth.email()));
  exception when duplicate_object then null; end;
  begin create policy carrera_upd on carrera_scores for update using (lower(email)=lower(auth.email())) with check (lower(email)=lower(auth.email()));
  exception when duplicate_object then null; end;
end $$;
