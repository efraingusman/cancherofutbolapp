-- ============================================================
-- Reseñas de partidos (estilo Letterboxd) — 2026-06-03
-- Pegá esto en Supabase → SQL Editor → Run.
-- ============================================================

CREATE TABLE IF NOT EXISTS match_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_name TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(match_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_match_reviews_match ON match_reviews (match_id);
CREATE INDEX IF NOT EXISTS idx_match_reviews_user ON match_reviews (user_email);
CREATE INDEX IF NOT EXISTS idx_match_reviews_rating ON match_reviews (rating DESC);

-- RLS abierto (cualquiera puede leer, dueño puede escribir)
ALTER TABLE match_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mr_select" ON match_reviews;
DROP POLICY IF EXISTS "mr_insert" ON match_reviews;
DROP POLICY IF EXISTS "mr_update" ON match_reviews;
DROP POLICY IF EXISTS "mr_delete" ON match_reviews;
CREATE POLICY "mr_select" ON match_reviews FOR SELECT USING (true);
CREATE POLICY "mr_insert" ON match_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "mr_update" ON match_reviews FOR UPDATE USING (true);
CREATE POLICY "mr_delete" ON match_reviews FOR DELETE USING (true);
