-- ════════════════════════════════════════════════════════════════════════════
-- CANCHERO+ MIGRATIONS
-- Pegá esto en Supabase SQL Editor y ejecutá
-- ════════════════════════════════════════════════════════════════════════════

-- 1. POSTS: agregar expires_at + pinned para auto-expiry de 10 horas
ALTER TABLE posts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 hours');
ALTER TABLE posts ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS posts_expires_at_idx ON posts(expires_at) WHERE pinned = FALSE;

-- 2. STORIES: ajustar expiry a 10 horas (si no estaba)
ALTER TABLE stories ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '10 hours');

-- 3. MATCHES (Futez-style match catalog)
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  match_at TIMESTAMPTZ NOT NULL,
  venue TEXT,
  league TEXT,
  final_home_score INT,
  final_away_score INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS matches_date_idx ON matches(match_at DESC);

-- 4. PREDICTIONS (cada usuario predice un score por partido)
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  home_score INT NOT NULL,
  away_score INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, user_email)
);

-- 5. MATCH REVIEWS (Letterboxd-style: stars + review)
CREATE TABLE IF NOT EXISTS match_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  stars INT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, user_email)
);

-- 6. MESSAGES: agregar media_url + media_type para audio/video calls
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_type TEXT;

-- 7. REPORTS (denuncias)
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_email TEXT NOT NULL,
  target_type TEXT NOT NULL, -- 'post', 'message', 'user'
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CRON: limpiar posts/stories expirados (necesita pg_cron extensión)
-- Si tu plan de Supabase no tiene pg_cron, podés correrlo manualmente:
DELETE FROM posts WHERE expires_at < NOW() AND pinned = FALSE;
DELETE FROM stories WHERE expires_at < NOW();

-- DISABLE RLS para que el cliente funcione (developmente)
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE predictions DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;

-- 9. DATOS DE EJEMPLO (opcional — para testear)
INSERT INTO matches (home_team, away_team, match_at, venue, league) VALUES
  ('Peñarol', 'Nacional', NOW() + INTERVAL '2 days', 'Estadio Centenario', 'Apertura'),
  ('Defensor Sporting', 'River Plate', NOW() + INTERVAL '3 days', 'Parque Saroldi', 'Apertura'),
  ('Cerro Largo', 'Liverpool', NOW() + INTERVAL '5 days', 'Ubilla', 'Apertura'),
  ('Boston River', 'Plaza Colonia', NOW() - INTERVAL '2 days', 'Parque Roberto', 'Apertura'),
  ('Wanderers', 'Danubio', NOW() - INTERVAL '4 days', 'Parque Viera', 'Apertura')
ON CONFLICT DO NOTHING;

-- Resultados para los partidos finalizados
UPDATE matches SET final_home_score=2, final_away_score=1 WHERE home_team='Boston River' AND final_home_score IS NULL;
UPDATE matches SET final_home_score=0, final_away_score=0 WHERE home_team='Wanderers' AND final_home_score IS NULL;
