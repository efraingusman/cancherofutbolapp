-- =========================================
-- TORNEOS COMPLETOS
-- =========================================
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_email TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  city TEXT,
  format TEXT DEFAULT 'groups',           -- groups | elimination | mixed | league
  status TEXT DEFAULT 'draft',            -- draft | registration | active | finished | cancelled
  max_teams INT DEFAULT 8,
  teams_count INT DEFAULT 0,
  start_date DATE,
  end_date DATE,
  prize_pool TEXT,
  rules TEXT,
  cover_url TEXT,
  entry_fee NUMERIC DEFAULT 0,            -- precio de inscripción por equipo
  payment_link TEXT,                      -- link de pago para equipos
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_tournaments" ON public.tournaments;
CREATE POLICY "open_tournaments" ON public.tournaments FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.tournaments TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.tournament_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  captain_email TEXT,
  captain_name TEXT,
  logo_url TEXT,
  group_letter TEXT,                      -- A, B, C, D...
  points INT DEFAULT 0,
  wins INT DEFAULT 0,
  draws INT DEFAULT 0,
  losses INT DEFAULT 0,
  goals_for INT DEFAULT 0,
  goals_against INT DEFAULT 0,
  goal_diff INT GENERATED ALWAYS AS (goals_for - goals_against) STORED,
  status TEXT DEFAULT 'pending',          -- pending | approved | rejected | eliminated
  payment_status TEXT DEFAULT 'pending',  -- pending | paid | waived
  payment_proof_url TEXT,
  players_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, team_name)
);
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_t_teams" ON public.tournament_teams;
CREATE POLICY "open_t_teams" ON public.tournament_teams FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.tournament_teams TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.tournament_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
  player_email TEXT,
  player_name TEXT NOT NULL,
  position TEXT,
  number INT,
  goals INT DEFAULT 0,
  assists INT DEFAULT 0,
  yellow_cards INT DEFAULT 0,
  red_cards INT DEFAULT 0,
  matches_played INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.tournament_players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_t_players" ON public.tournament_players;
CREATE POLICY "open_t_players" ON public.tournament_players FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.tournament_players TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.tournament_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  phase TEXT DEFAULT 'groups',            -- groups | r16 | quarterfinal | semifinal | final | third_place
  round INT DEFAULT 1,
  group_letter TEXT,
  home_team_id UUID REFERENCES public.tournament_teams(id),
  away_team_id UUID REFERENCES public.tournament_teams(id),
  home_team_name TEXT,
  away_team_name TEXT,
  home_score INT,
  away_score INT,
  home_scorers TEXT,                      -- JSON o texto "Pérez 23', López 67'"
  away_scorers TEXT,
  scheduled_at TIMESTAMPTZ,
  venue TEXT,
  status TEXT DEFAULT 'scheduled',        -- scheduled | live | finished | postponed | cancelled
  winner_team_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_t_matches" ON public.tournament_matches;
CREATE POLICY "open_t_matches" ON public.tournament_matches FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.tournament_matches TO anon, authenticated;

-- =========================================
-- FIX MATCH_CHECKINS
-- =========================================
DROP POLICY IF EXISTS "checkin_own" ON public.match_checkins;
DROP POLICY IF EXISTS "open_checkins" ON public.match_checkins;
CREATE POLICY "open_checkins" ON public.match_checkins FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.match_checkins TO anon, authenticated;
ALTER TABLE public.match_checkins ADD COLUMN IF NOT EXISTS player_name TEXT;
ALTER TABLE public.match_checkins ADD COLUMN IF NOT EXISTS is_captain BOOLEAN DEFAULT false;
ALTER TABLE public.match_checkins ADD COLUMN IF NOT EXISTS team TEXT DEFAULT 'home';

-- Métricas en business_courts
ALTER TABLE public.business_courts ADD COLUMN IF NOT EXISTS matches_played INT DEFAULT 0;
ALTER TABLE public.business_courts ADD COLUMN IF NOT EXISTS total_income NUMERIC DEFAULT 0;

-- =========================================
-- LIMPIEZA DE POSTS EXPIRADOS
-- =========================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_posts()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.posts
    WHERE pinned IS NOT TRUE
      AND is_official IS NOT TRUE
      AND (
        (expires_at IS NOT NULL AND expires_at < NOW())
        OR (expires_at IS NULL AND created_at < NOW() - INTERVAL '12 hours')
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  RETURN deleted_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_posts() TO anon, authenticated;

-- =========================================
-- FIX PLAYER ACHIEVEMENTS RLS
-- =========================================
ALTER TABLE IF EXISTS public.player_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_achievements" ON public.player_achievements;
CREATE POLICY "open_achievements" ON public.player_achievements FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.player_achievements TO anon, authenticated;

-- =========================================
-- EQUIPOS (clubs) — asegurar que team_members exista
-- =========================================
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID,
  member_email TEXT NOT NULL,
  role TEXT DEFAULT 'jugador',            -- jugador | capitan | dt | asistente
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, member_email)
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_team_members" ON public.team_members;
CREATE POLICY "open_team_members" ON public.team_members FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.team_members TO anon, authenticated;
