-- ════════════════════════════════════════════════════════════════════════════
-- CANCHERO — SQL FINAL ÚNICO
-- Pegar TODO esto en Supabase → SQL Editor → New query → RUN
-- ════════════════════════════════════════════════════════════════════════════

-- ─── USERS: nuevas columnas ──────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'jugador';
ALTER TABLE users ADD COLUMN IF NOT EXISTS sub_tier TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS sub_status TEXT DEFAULT 'inactive';
ALTER TABLE users ADD COLUMN IF NOT EXISTS sub_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_captain BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{"games":0,"wins":0,"draws":0,"losses":0,"goals":0,"assists":0,"yellow":0,"red":0}'::jsonb;

-- ─── POSTS: tags ─────────────────────────────────────────────────────────
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'text';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_url TEXT;

-- ─── MATCHES: columnas nuevas ─────────────────────────────────────────────
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
ALTER TABLE matches ADD COLUMN IF NOT EXISTS final_home_score INT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS final_away_score INT;

-- ─── TAGS REMOVED ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags_removed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  post_id UUID NOT NULL,
  removed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_email, post_id)
);
CREATE INDEX IF NOT EXISTS tags_removed_user_idx ON tags_removed(user_email);
ALTER TABLE tags_removed DISABLE ROW LEVEL SECURITY;

-- ─── RESULT PROPOSALS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS result_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  captain_email TEXT NOT NULL,
  side TEXT NOT NULL,
  home_score INT NOT NULL,
  away_score INT NOT NULL,
  attempt_number INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS rp_match_idx ON result_proposals(match_id);
ALTER TABLE result_proposals DISABLE ROW LEVEL SECURITY;

-- ─── MATCH CHAT ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS mc_match_idx ON match_chat(match_id, created_at);
ALTER TABLE match_chat DISABLE ROW LEVEL SECURITY;

-- ─── MATCH REQUESTS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  status TEXT DEFAULT 'pending',
  side_pref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, user_email)
);
CREATE INDEX IF NOT EXISTS mr_match_idx ON match_requests(match_id, status);
ALTER TABLE match_requests DISABLE ROW LEVEL SECURITY;

-- ─── SERVICE BOOKINGS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_email TEXT NOT NULL,
  client_name TEXT,
  provider_email TEXT NOT NULL,
  provider_type TEXT NOT NULL,
  service_label TEXT,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  price NUMERIC(10,2),
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sb_client_idx ON service_bookings(client_email, status);
CREATE INDEX IF NOT EXISTS sb_provider_idx ON service_bookings(provider_email, status);
ALTER TABLE service_bookings DISABLE ROW LEVEL SECURITY;

-- ─── ADMIN MATCH OVERRIDES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_match_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  home_score INT,
  away_score INT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE admin_match_overrides DISABLE ROW LEVEL SECURITY;

-- ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  tier TEXT NOT NULL,
  amount NUMERIC(10,2),
  currency TEXT DEFAULT 'UYU',
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  payment_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sub_user_idx ON subscriptions(user_email, status);
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;

-- ─── LEAGUES ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  format TEXT,
  owner_email TEXT NOT NULL,
  owner_tier TEXT NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  max_teams INT DEFAULT 8,
  description TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE leagues DISABLE ROW LEVEL SECURITY;

-- ─── MATCH PARTICIPANTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  side TEXT NOT NULL,
  goals INT DEFAULT 0,
  assists INT DEFAULT 0,
  yellow_cards INT DEFAULT 0,
  red_cards INT DEFAULT 0,
  rating NUMERIC(3,1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, user_email)
);
CREATE INDEX IF NOT EXISTS mp_user_idx ON match_participants(user_email);
ALTER TABLE match_participants DISABLE ROW LEVEL SECURITY;

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  body TEXT,
  ref_id TEXT,
  ref_type TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notif_user_idx ON notifications(user_email, read_at);
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- ─── PUSH SUBSCRIPTIONS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  sub_json TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_email, endpoint)
);
ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;

-- ─── INDEXES para search de usuarios ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS users_name_idx ON users (LOWER(name));
CREATE INDEX IF NOT EXISTS users_email_idx ON users (LOWER(email));

-- ─── FUNCIÓN recalc_player_stats ─────────────────────────────────────────
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
