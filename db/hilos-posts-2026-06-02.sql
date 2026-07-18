-- ============================================================
-- Hilos de POSTS (tipo X/Threads) — 2026-06-02
-- Pegá esto en Supabase → SQL Editor → Run.
-- ============================================================

-- parent_post_id: a qué post responde este (forma el hilo)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS parent_post_id UUID REFERENCES posts(id);
-- thread_root_id: post raíz del hilo (para agrupar toda la conversación)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS thread_root_id UUID;
-- contador de respuestas del hilo (opcional, para mostrar "Ver hilo (N)")
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0;
