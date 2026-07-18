-- ============================================================
-- Visualizaciones de posts/reels — 2026-06-09
-- Pegá esto en Supabase → SQL Editor → Run.
-- ============================================================

-- Contador de visualizaciones (reels, videos y fotos)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- Incremento atómico (evita carreras entre clientes)
CREATE OR REPLACE FUNCTION increment_post_views(p_post_id UUID)
RETURNS void AS $$
  UPDATE posts SET views_count = COALESCE(views_count, 0) + 1 WHERE id = p_post_id;
$$ LANGUAGE sql SECURITY DEFINER;
