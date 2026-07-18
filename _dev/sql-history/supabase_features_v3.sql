-- ════════════════════════════════════════════════════════════════════════════
-- CANCHERO FEATURES V3 — Push, broadcast notifications, allow user_email='*'
-- ════════════════════════════════════════════════════════════════════════════

-- 1. PUSH SUBSCRIPTIONS (Web Push API)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  sub_json TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_email, endpoint)
);
ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;

-- 2. Permitir user_email='*' (broadcast a todos)
-- (la columna ya existe en notifications; sólo nos aseguramos que no haya CHECK constraint)
-- nada que alterar si ya era TEXT NOT NULL

-- 3. Enable Realtime para notifications y posts (Supabase Realtime)
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE match_chat;
