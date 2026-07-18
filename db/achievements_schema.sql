-- ================================================================
-- Canchero: Nuevas tablas para Logros, Partidos y Bots
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ================================================================

-- Tabla de definición de logros (catálogo)
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT,
  threshold INT,
  rarity TEXT DEFAULT 'común'
);

-- Logros desbloqueados por jugador
CREATE TABLE IF NOT EXISTS player_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_email TEXT NOT NULL,
  achievement_id TEXT NOT NULL REFERENCES achievements(id),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_email, achievement_id)
);

-- Jugadores de un partido (roster real)
CREATE TABLE IF NOT EXISTS match_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL,
  player_email TEXT NOT NULL,
  player_name TEXT,
  position TEXT,
  team TEXT DEFAULT 'home',
  status TEXT DEFAULT 'confirmado',
  is_captain BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitaciones a partidos
CREATE TABLE IF NOT EXISTS match_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL,
  from_email TEXT NOT NULL,
  to_email TEXT,
  invite_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  status TEXT DEFAULT 'pendiente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cuentas bot
CREATE TABLE IF NOT EXISTS bots (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  category TEXT,
  post_interval_hours INT DEFAULT 6,
  last_posted_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE
);

-- Columna match_id en group_chats (si no existe)
ALTER TABLE group_chats ADD COLUMN IF NOT EXISTS match_id UUID;

-- ================================================================
-- Semillas: Logros
-- ================================================================
INSERT INTO achievements (id, name, description, icon, category, threshold, rarity) VALUES
('social_first',      'Bienvenido a Canchero', 'Te registraste en la app',                     '🟢', 'social',      1,   'común'),
('first_match',       'Primer Arranque',       'Jugaste tu primer partido',                    '⚽', 'partidos',    1,   'común'),
('first_goal',        'El Primer Gol',         'Marcaste tu primer gol',                       '🔔', 'goles',       1,   'común'),
('matches_10',        'En Forma',              '10 partidos jugados',                          '🔥', 'partidos',    10,  'común'),
('matches_50',        'Veterano',              '50 partidos jugados',                          '💪', 'partidos',    50,  'raro'),
('matches_100',       'Leyenda',               '100 partidos jugados',                         '🏆', 'partidos',    100, 'épico'),
('goals_10',          'Goleador Joven',        'Primeros 10 goles',                            '⚽', 'goles',       10,  'común'),
('goals_20',          'Artillero',             '20 goles marcados',                            '🎯', 'goles',       20,  'común'),
('goals_50',          'Máquina de Goles',      '50 goles en carrera',                          '💥', 'goles',       50,  'raro'),
('goals_100',         'Centenario',            '100 goles — una leyenda',                      '👑', 'goles',       100, 'legendario'),
('assists_10',        'El Asistidor',          '10 asistencias',                               '🤝', 'asistencias', 10,  'común'),
('assists_50',        'Generoso',              '50 asistencias',                               '🎁', 'asistencias', 50,  'raro'),
('wins_10',           'Ganador Nato',          '10 partidos ganados',                          '✅', 'victorias',   10,  'común'),
('wins_50',           'Dominador',             '50 victorias',                                 '😤', 'victorias',   50,  'raro'),
('mvp_5',             'El Elegido',            '5 veces MVP',                                  '⭐', 'mvp',         5,   'raro'),
('mvp_20',            'Estrella del Campo',    '20 veces MVP',                                 '🌟', 'mvp',         20,  'épico'),
('goalkeeper_10',     'Muro',                  '10 partidos sin goles en contra (arquero)',     '🧤', 'arquero',     10,  'raro'),
('goalkeeper_clean_5','Invicto',               '5 partidos consecutivos sin goles en contra',  '🛡️', 'arquero',     5,   'común'),
('tournament_win',    'Campeón',               'Ganaste un torneo',                            '🥇', 'torneo',      1,   'épico'),
('tournaments_3',     'Serial Winner',         'Ganaste 3 torneos',                            '🏅', 'torneo',      3,   'legendario'),
('follows_10',        'Conectado',             '10 jugadores siguiendo',                       '👥', 'social',      10,  'común'),
('rating_80',         'Alta Calificación',     'Rating de 80 o más',                           '📈', 'rating',      80,  'raro')
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- Semillas: Bots
-- ================================================================
INSERT INTO users (email, name, role, bio, photo) VALUES
(
  'bot-news@canchero.app',
  'Canchero News 📰',
  'jugador',
  'Bot oficial de noticias de la app. Novedades, updates y lo que pasa en la comunidad canchera 🟢',
  'https://ui-avatars.com/api/?name=CN&background=baff00&color=000&bold=true&size=200&rounded=true'
),
(
  'bot-mundial@canchero.app',
  'Mundial Live 🌍',
  'jugador',
  'Todo sobre el fútbol internacional: Mundial, Champions, Libertadores y más. En tiempo real ⚽🔥',
  'https://ui-avatars.com/api/?name=ML&background=1a3a6b&color=fff&bold=true&size=200&rounded=true'
),
(
  'bot-historia@canchero.app',
  'Historia del Fútbol 📅',
  'jugador',
  'Un gol histórico, una fecha memorable, una leyenda... Efemérides del fútbol mundial cada día 🏆',
  'https://ui-avatars.com/api/?name=HF&background=8B4513&color=fff&bold=true&size=200&rounded=true'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO bots (email, name, category, post_interval_hours, active) VALUES
('bot-news@canchero.app',     'Canchero News',      'news',     6, true),
('bot-mundial@canchero.app',  'Mundial Live',       'mundial',  6, true),
('bot-historia@canchero.app', 'Historia del Fútbol','historia', 6, true)
ON CONFLICT (email) DO NOTHING;

-- ================================================================
-- RLS: desactivar para tablas nuevas (igual que el resto)
-- ================================================================
ALTER TABLE achievements      DISABLE ROW LEVEL SECURITY;
ALTER TABLE player_achievements DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_players     DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_invites     DISABLE ROW LEVEL SECURITY;
ALTER TABLE bots              DISABLE ROW LEVEL SECURITY;

-- ================================================================
-- pg_cron: scheduling de bots (requiere pg_cron habilitado)
-- Reemplazar {PROJECT_REF} y {ANON_KEY} con los valores reales
-- ================================================================
-- SELECT cron.schedule('bot-news-job',     '0 */6 * * *', $$ SELECT net.http_post(url := 'https://{PROJECT_REF}.supabase.co/functions/v1/bot-canchero-news',    headers := '{"Authorization":"Bearer {ANON_KEY}"}'::jsonb, body := '{}'::jsonb) $$);
-- SELECT cron.schedule('bot-mundial-job',  '0 */6 * * *', $$ SELECT net.http_post(url := 'https://{PROJECT_REF}.supabase.co/functions/v1/bot-mundial',          headers := '{"Authorization":"Bearer {ANON_KEY}"}'::jsonb, body := '{}'::jsonb) $$);
-- SELECT cron.schedule('bot-historia-job', '0 */6 * * *', $$ SELECT net.http_post(url := 'https://{PROJECT_REF}.supabase.co/functions/v1/bot-historia-futbol',   headers := '{"Authorization":"Bearer {ANON_KEY}"}'::jsonb, body := '{}'::jsonb) $$);
