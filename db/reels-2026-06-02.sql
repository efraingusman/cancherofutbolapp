-- ============================================================
-- Reels (videos verticales tipo TikTok/Instagram) — 2026-06-02
-- Pegá esto en Supabase → SQL Editor → Run.
-- ============================================================

-- Marca un post como reel (video vertical para el feed de reels)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_reel BOOLEAN DEFAULT false;

-- Índice para cargar reels rápido
CREATE INDEX IF NOT EXISTS idx_posts_is_reel ON posts (is_reel, created_at DESC);
