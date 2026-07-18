-- ============================================================
-- Megafix 2026-06-02: Hilos, códigos de acceso, columnas nuevas
-- Idempotente: se puede correr varias veces sin error.
-- Pegá TODO esto en Supabase → SQL Editor → Run.
-- ============================================================

-- 1. Hilos en comentarios ------------------------------------
ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES post_comments(id);

-- 2. Códigos de acceso para negocios -------------------------
CREATE TABLE IF NOT EXISTS access_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    used_by TEXT,
    used_at TIMESTAMPTZ
);

-- 3. Reportes ------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_email TEXT NOT NULL,
    reported_email TEXT,
    target_id TEXT,
    target_type TEXT DEFAULT 'user',
    reason TEXT,
    details TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Columnas nuevas en matches ------------------------------
ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_club_name TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_club_name TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_score INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_score INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';

-- 5. Código de acceso en users (para negocios) ---------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS access_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMPTZ;

-- 6. RLS para access_codes (Postgres no soporta IF NOT EXISTS
--    en CREATE POLICY, por eso usamos DROP + CREATE) ----------
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ac_select" ON access_codes;
DROP POLICY IF EXISTS "ac_insert" ON access_codes;
DROP POLICY IF EXISTS "ac_update" ON access_codes;
DROP POLICY IF EXISTS "ac_delete" ON access_codes;
CREATE POLICY "ac_select" ON access_codes FOR SELECT USING (true);
CREATE POLICY "ac_insert" ON access_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "ac_update" ON access_codes FOR UPDATE USING (true);
CREATE POLICY "ac_delete" ON access_codes FOR DELETE USING (true);

-- 7. RLS para reports ----------------------------------------
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rp_select" ON reports;
DROP POLICY IF EXISTS "rp_insert" ON reports;
DROP POLICY IF EXISTS "rp_delete" ON reports;
CREATE POLICY "rp_select" ON reports FOR SELECT USING (true);
CREATE POLICY "rp_insert" ON reports FOR INSERT WITH CHECK (true);
CREATE POLICY "rp_delete" ON reports FOR DELETE USING (true);
