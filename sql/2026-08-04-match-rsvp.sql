-- Confirmaciones públicas de un partido (Voy / No voy), incluso SIN cuenta.
-- La usa partido.html (página pública compartida por WhatsApp/chat).
create table if not exists match_rsvp (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null,
  guest_name text not null,
  status text not null default 'voy',            -- 'voy' | 'no_voy'
  user_email text,                                -- si confirmó logueado (opcional)
  created_at timestamptz default now()
);
create index if not exists match_rsvp_match_idx on match_rsvp(match_id);

alter table match_rsvp enable row level security;
do $$ begin
  -- Lectura pública: cualquiera con el link ve quiénes van.
  begin create policy match_rsvp_read on match_rsvp for select using (true);
  exception when duplicate_object then null; end;
  -- Inserción pública: un invitado externo (sin login) puede confirmar.
  begin create policy match_rsvp_insert on match_rsvp for insert with check (true);
  exception when duplicate_object then null; end;
  -- Puede corregir su propia confirmación si estaba logueado.
  begin create policy match_rsvp_update on match_rsvp for update
    using (user_email is not null and lower(user_email) = lower(auth.email()))
    with check (true);
  exception when duplicate_object then null; end;
end $$;
