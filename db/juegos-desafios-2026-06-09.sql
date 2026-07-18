-- ============================================================
-- Juegos: ranking + desafíos entre amigos — 2026-06-09
-- (aplicado vía supabase CLI db query)
-- Nota: game_challenges YA existía (impostor online) con
-- from_email/to_email/game/mode/room_id/status/expires_at.
-- Se extiende de forma aditiva para desafíos 1v1 asincrónicos.
-- ============================================================

-- Puntajes de juegos (ranking)
CREATE TABLE IF NOT EXISTS game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_game_scores_game ON game_scores(game_id, points DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_user ON game_scores(user_email);

-- Extensión de game_challenges para duelos asincrónicos (Adivina / 11 Ideal)
ALTER TABLE game_challenges ADD COLUMN IF NOT EXISTS to_name TEXT;
ALTER TABLE game_challenges ADD COLUMN IF NOT EXISTS payload JSONB;
ALTER TABLE game_challenges ADD COLUMN IF NOT EXISTS from_score INTEGER;
ALTER TABLE game_challenges ADD COLUMN IF NOT EXISTS to_score INTEGER;
ALTER TABLE game_challenges ADD COLUMN IF NOT EXISTS winner_email TEXT;
ALTER TABLE game_challenges ADD COLUMN IF NOT EXISTS verdict TEXT;
CREATE INDEX IF NOT EXISTS idx_game_challenges_to ON game_challenges(to_email, status);
