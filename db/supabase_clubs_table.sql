-- ============================================================
-- CANCHERO — TABLA CLUBS
-- Pegar en SQL Editor de Supabase y ejecutar
-- ============================================================

CREATE TABLE IF NOT EXISTS clubs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_email  TEXT NOT NULL,
  name         TEXT NOT NULL,
  abbrev       TEXT,
  nickname     TEXT,
  founded      TEXT,
  city         TEXT,
  nat          TEXT DEFAULT 'Uruguay',
  phone        TEXT,
  bio          TEXT,
  logo         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS clubs_owner_idx ON clubs(owner_email);

-- Sin RLS para que cualquier usuario autenticado pueda leer
ALTER TABLE clubs DISABLE ROW LEVEL SECURITY;
