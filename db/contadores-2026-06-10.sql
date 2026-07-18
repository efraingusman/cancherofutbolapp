-- ============================================================
-- Contadores reales: compartidos en posts + vistas en momentos
-- 2026-06-10 (aplicado vía supabase CLI db query)
-- ============================================================

ALTER TABLE posts ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0;
ALTER TABLE momentos ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- Incremento atómico de compartidos
CREATE OR REPLACE FUNCTION increment_post_shares(p_post_id UUID)
RETURNS void AS $$
  UPDATE posts SET shares_count = COALESCE(shares_count, 0) + 1 WHERE id = p_post_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Incremento atómico de vistas de momentos
CREATE OR REPLACE FUNCTION increment_momento_views(p_id UUID)
RETURNS void AS $$
  UPDATE momentos SET views_count = COALESCE(views_count, 0) + 1 WHERE id = p_id;
$$ LANGUAGE sql SECURITY DEFINER;
