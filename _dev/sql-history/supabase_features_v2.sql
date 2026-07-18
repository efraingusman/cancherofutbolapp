-- ════════════════════════════════════════════════════════════════════════════
-- CANCHERO FEATURES V2 — Tags, Captains, Bookings, Subscriptions, Requests
-- Pegar en Supabase SQL Editor y ejecutar
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. USERS: nuevas columnas ────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'jugador';
ALTER TABLE users ADD COLUMN IF NOT EXISTS sub_tier TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS sub_status TEXT DEFAULT 'inactive';
ALTER TABLE users ADD COLUMN IF NOT EXISTS sub_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_captain BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{"games":0,"wins":0,"draws":0,"losses":0,"goals":0,"assists":0,"yellow":0,"red":0}'::jsonb;

-- ─── 2. POSTS: tags JSON array ────────────────────────────────────────────
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'text';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_url TEXT;

-- ─── 3. TAGS REMOVED (cada user puede ocultar tags de su perfil) ──────────
CREATE TABLE IF NOT EXISTS tags_removed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  post_id UUID NOT NULL,
  removed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_email, post_id)
);
CREATE INDEX IF NOT EXISTS tags_removed_user_idx ON tags_removed(user_email);

-- ─── 4. MATCHES: capitanes y propuestas de resultado ──────────────────────
ALTER TABLE matches ADD COLUMN IF NOT EXISTS captain_home_email TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS captain_away_email TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS result_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS result_disputed BOOLEAN DEFAULT FALSE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS result_voided BOOLEAN DEFAULT FALSE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS attempts_count INT DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_type TEXT DEFAULT 'open';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS slots_total INT DEFAULT 10;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS slots_taken INT DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS created_by TEXT;

-- ─── 5. RESULT PROPOSALS (propuestas de capitanes) ────────────────────────
CREATE TABLE IF NOT EXISTS result_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  captain_email TEXT NOT NULL,
  side TEXT NOT NULL, -- 'home' | 'away'
  home_score INT NOT NULL,
  away_score INT NOT NULL,
  attempt_number INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS rp_match_idx ON result_proposals(match_id);

-- ─── 6. MATCH CHAT (chat capitanes para coordinar) ────────────────────────
CREATE TABLE IF NOT EXISTS match_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS mc_match_idx ON match_chat(match_id, created_at);

-- ─── 7. MATCH REQUESTS (solicitudes para entrar a partidos abiertos) ──────
CREATE TABLE IF NOT EXISTS match_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  status TEXT DEFAULT 'pending', -- 'pending'|'accepted'|'rejected'
  side_pref TEXT, -- 'home'|'away'|'any'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, user_email)
);
CREATE INDEX IF NOT EXISTS mr_match_idx ON match_requests(match_id, status);

-- ─── 8. SERVICE BOOKINGS (contratar árbitros, complejos, profesionales) ──
CREATE TABLE IF NOT EXISTS service_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_email TEXT NOT NULL,
  client_name TEXT,
  provider_email TEXT NOT NULL,
  provider_type TEXT NOT NULL, -- 'arbitro'|'complejo'|'profesional'|'tienda'
  service_label TEXT,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  price NUMERIC(10,2),
  status TEXT DEFAULT 'pending', -- 'pending'|'accepted'|'rejected'|'completed'|'cancelled'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sb_client_idx ON service_bookings(client_email, status);
CREATE INDEX IF NOT EXISTS sb_provider_idx ON service_bookings(provider_email, status);

-- ─── 9. ADMIN OVERRIDES (admin elige resultado en disputas) ───────────────
CREATE TABLE IF NOT EXISTS admin_match_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL, -- 'set_result'|'void'
  home_score INT,
  away_score INT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 10. SUBSCRIPTIONS LOG ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  tier TEXT NOT NULL, -- 'free'|'profesional'|'organizacion'|'complejo'|'tienda'
  amount NUMERIC(10,2),
  currency TEXT DEFAULT 'UYU',
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active', -- 'active'|'expired'|'cancelled'
  payment_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sub_user_idx ON subscriptions(user_email, status);

-- ─── 11. LEAGUES / TOURNAMENTS (gate por sub_tier) ────────────────────────
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  format TEXT, -- 'liga'|'torneo'|'copa'
  owner_email TEXT NOT NULL,
  owner_tier TEXT NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  max_teams INT DEFAULT 8,
  description TEXT,
  status TEXT DEFAULT 'open', -- 'open'|'in_progress'|'finished'|'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 12. PLAYER MATCH PARTICIPATION (para stats individuales) ─────────────
CREATE TABLE IF NOT EXISTS match_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  side TEXT NOT NULL, -- 'home'|'away'
  goals INT DEFAULT 0,
  assists INT DEFAULT 0,
  yellow_cards INT DEFAULT 0,
  red_cards INT DEFAULT 0,
  rating NUMERIC(3,1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, user_email)
);
CREATE INDEX IF NOT EXISTS mp_user_idx ON match_participants(user_email);

-- ─── 13. NOTIFICATIONS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  type TEXT NOT NULL, -- 'tag'|'result_proposed'|'request_accepted'|'booking'|'admin'
  title TEXT,
  body TEXT,
  ref_id TEXT,
  ref_type TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notif_user_idx ON notifications(user_email, read_at);

-- ─── DISABLE RLS (dev mode) ───────────────────────────────────────────────
ALTER TABLE tags_removed DISABLE ROW LEVEL SECURITY;
ALTER TABLE result_proposals DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_chat DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_match_overrides DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE leagues DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- ─── INDEX para search de usuarios (autocomplete @mention) ────────────────
CREATE INDEX IF NOT EXISTS users_name_idx ON users (LOWER(name));
CREATE INDEX IF NOT EXISTS users_email_idx ON users (LOWER(email));

-- ════════════════════════════════════════════════════════════════════════════
-- FUNCION: recalcular stats de un jugador desde match_participants
-- Llamar manualmente o via trigger después de un partido finalizado
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION recalc_player_stats(p_email TEXT)
RETURNS VOID AS $$
DECLARE
  v_games INT; v_wins INT; v_draws INT; v_losses INT;
  v_goals INT; v_assists INT; v_yellow INT; v_red INT;
BEGIN
  SELECT COUNT(*) INTO v_games
    FROM match_participants mp
    JOIN matches m ON m.id = mp.match_id
    WHERE mp.user_email = p_email AND m.final_home_score IS NOT NULL AND m.result_voided = FALSE;

  SELECT COALESCE(SUM(mp.goals),0), COALESCE(SUM(mp.assists),0),
         COALESCE(SUM(mp.yellow_cards),0), COALESCE(SUM(mp.red_cards),0)
    INTO v_goals, v_assists, v_yellow, v_red
    FROM match_participants mp
    JOIN matches m ON m.id = mp.match_id
    WHERE mp.user_email = p_email AND m.result_voided = FALSE;

  SELECT
    COUNT(*) FILTER (WHERE (mp.side='home' AND m.final_home_score > m.final_away_score)
                        OR (mp.side='away' AND m.final_away_score > m.final_home_score)),
    COUNT(*) FILTER (WHERE m.final_home_score = m.final_away_score),
    COUNT(*) FILTER (WHERE (mp.side='home' AND m.final_home_score < m.final_away_score)
                        OR (mp.side='away' AND m.final_away_score < m.final_home_score))
  INTO v_wins, v_draws, v_losses
  FROM match_participants mp
  JOIN matches m ON m.id = mp.match_id
  WHERE mp.user_email = p_email
    AND m.final_home_score IS NOT NULL
    AND m.result_voided = FALSE;

  UPDATE users SET stats = jsonb_build_object(
    'games', v_games, 'wins', v_wins, 'draws', v_draws, 'losses', v_losses,
    'goals', v_goals, 'assists', v_assists, 'yellow', v_yellow, 'red', v_red
  ) WHERE email = p_email;
END;
$$ LANGUAGE plpgsql;
