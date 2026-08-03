-- Trivia Futbolera: ranking de puntajes (mejor puntaje por usuario).
create table if not exists trivia_scores (
  email text primary key,
  name text,
  score integer not null default 0,
  updated_at timestamptz default now()
);
alter table trivia_scores enable row level security;
do $$ begin
  -- Lectura pública (ranking visible para todos).
  begin
    create policy trivia_read on trivia_scores for select using (true);
  exception when duplicate_object then null; end;
  -- Cada usuario escribe SOLO su propia fila (email == auth.email()).
  begin
    create policy trivia_upsert on trivia_scores for insert
      with check (lower(email) = lower(auth.email()));
  exception when duplicate_object then null; end;
  begin
    create policy trivia_update on trivia_scores for update
      using (lower(email) = lower(auth.email()))
      with check (lower(email) = lower(auth.email()));
  exception when duplicate_object then null; end;
end $$;
