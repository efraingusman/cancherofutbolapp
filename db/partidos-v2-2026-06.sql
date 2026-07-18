-- ============================================================
-- Partidos v2 — 2026-06-10 (aplicado vía supabase CLI db query)
-- matches ya tiene: status, duration_minutes, captains, scores,
-- formation, need_player, format, modality. Se agrega lo que falta.
-- ============================================================

-- La tabla match_requests NO existía (el código la usaba → solicitudes perdidas)
CREATE TABLE IF NOT EXISTS match_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  side_pref TEXT DEFAULT 'any',
  team TEXT,                          -- 'home' | 'away'
  position_slot TEXT,                 -- ARQ/DEF/MED/DEL o slot específico
  type TEXT DEFAULT 'player',         -- 'player' | 'club'
  club_id UUID,
  club_name TEXT,
  status TEXT DEFAULT 'pending',      -- pending | accepted | rejected
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, user_email)
);
CREATE INDEX IF NOT EXISTS idx_match_requests_match ON match_requests(match_id, status);

-- Estados temporales y aviso urgente
ALTER TABLE matches ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS urgent_need BOOLEAN DEFAULT false;

-- Posición específica y suplentes
ALTER TABLE match_players ADD COLUMN IF NOT EXISTS position_slot TEXT;
ALTER TABLE match_players ADD COLUMN IF NOT EXISTS is_sub BOOLEAN DEFAULT false;

-- Chat del partido
CREATE TABLE IF NOT EXISTS match_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_match_chat_match ON match_chat(match_id, created_at);

-- Asistencias en eventos (goal ya existe con assist_email)
ALTER TABLE match_events ADD COLUMN IF NOT EXISTS assist_name TEXT;
ALTER TABLE match_events ADD COLUMN IF NOT EXISTS player_name TEXT;
ALTER TABLE match_events ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Resultado en disputa (lo resuelve el admin de la app)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS result_disputed BOOLEAN DEFAULT false;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS result_home_by_home INT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS result_away_by_home INT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS result_home_by_away INT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS result_away_by_away INT;
