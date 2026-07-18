-- =========================================================
-- CANCHERO — Matches Players System + Club Full Profile
-- 2026-05-31
-- =========================================================

-- match_invites mejorado (con equipo destino)
CREATE TABLE IF NOT EXISTS public.match_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  team TEXT DEFAULT 'home',
  status TEXT DEFAULT 'pendiente',
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.match_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_invites" ON public.match_invites;
CREATE POLICY "open_invites" ON public.match_invites FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.match_invites TO anon, authenticated, service_role;

-- UNIQUE constraint si no existe
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='match_invites_match_id_to_email_key'
  ) THEN
    ALTER TABLE public.match_invites ADD CONSTRAINT match_invites_match_id_to_email_key UNIQUE (match_id, to_email);
  END IF;
END $$;

-- match_bets: apuestas entre equipos
CREATE TABLE IF NOT EXISTS public.match_bets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  proposer_email TEXT NOT NULL,
  proposer_team TEXT DEFAULT 'home',
  bet_text TEXT NOT NULL DEFAULT 'La coca',
  status TEXT DEFAULT 'proposed',
  edits_count INT DEFAULT 0,
  accepted_home BOOLEAN DEFAULT false,
  accepted_away BOOLEAN DEFAULT false,
  counter_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.match_bets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_bets" ON public.match_bets;
CREATE POLICY "open_bets" ON public.match_bets FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.match_bets TO anon, authenticated, service_role;

-- match_captain_log
CREATE TABLE IF NOT EXISTS public.match_captain_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  team TEXT NOT NULL,
  old_captain_email TEXT,
  new_captain_email TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.match_captain_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_captain_log" ON public.match_captain_log;
CREATE POLICY "open_captain_log" ON public.match_captain_log FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.match_captain_log TO anon, authenticated, service_role;

-- Columnas en matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS captain_home_changes INT DEFAULT 0;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS captain_away_changes INT DEFAULT 0;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS bet_id UUID;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS is_friendly BOOLEAN DEFAULT false;

-- club_members
CREATE TABLE IF NOT EXISTS public.club_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID,
  player_email TEXT NOT NULL,
  player_name TEXT,
  player_photo TEXT,
  position TEXT DEFAULT 'JUG',
  number INT,
  role TEXT DEFAULT 'jugador',
  joined_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_club_members" ON public.club_members;
CREATE POLICY "open_club_members" ON public.club_members FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.club_members TO anon, authenticated, service_role;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='club_members_club_id_player_email_key'
  ) THEN
    ALTER TABLE public.club_members ADD CONSTRAINT club_members_club_id_player_email_key UNIQUE (club_id, player_email);
  END IF;
END $$;

-- club_achievements
CREATE TABLE IF NOT EXISTS public.club_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.club_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_club_ach" ON public.club_achievements;
CREATE POLICY "open_club_ach" ON public.club_achievements FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.club_achievements TO anon, authenticated, service_role;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='club_achievements_club_id_achievement_id_key'
  ) THEN
    ALTER TABLE public.club_achievements ADD CONSTRAINT club_achievements_club_id_achievement_id_key UNIQUE (club_id, achievement_id);
  END IF;
END $$;

-- Columnas adicionales en clubs
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS flag_url TEXT;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS stats_json JSONB DEFAULT '{}';
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS formation TEXT DEFAULT '4-3-3';
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS followers_count INT DEFAULT 0;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS matches_played INT DEFAULT 0;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS wins INT DEFAULT 0;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS losses INT DEFAULT 0;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS draws INT DEFAULT 0;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS goals_for INT DEFAULT 0;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS goals_against INT DEFAULT 0;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS clean_sheets INT DEFAULT 0;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS tournaments_won INT DEFAULT 0;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_clubs" ON public.clubs;
CREATE POLICY "open_clubs" ON public.clubs FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.clubs TO anon, authenticated, service_role;

-- Supabase Storage bucket para media (si no existe)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "media_public_read" ON storage.objects;
CREATE POLICY "media_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'media');
DROP POLICY IF EXISTS "media_auth_upload" ON storage.objects;
CREATE POLICY "media_auth_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media');
DROP POLICY IF EXISTS "media_auth_update" ON storage.objects;
CREATE POLICY "media_auth_update" ON storage.objects FOR UPDATE USING (bucket_id = 'media');
