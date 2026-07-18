-- ============================================================
-- CANCHERO — SQL para ejecutar en Supabase SQL Editor
-- Fecha: 2026-06-03
-- ============================================================

-- ── 0. DIAGNÓSTICO Y LIMPIEZA DE USUARIOS DUPLICADOS ──────────
-- IMPORTANTE: el bug de "Completar Perfil" que sobreescribe datos suele
-- venir de filas DUPLICADAS con el mismo email en la tabla users.
-- Primero VER si hay duplicados (ejecutá solo este SELECT para revisar):
SELECT lower(email) AS email, COUNT(*) AS veces
FROM users
GROUP BY lower(email)
HAVING COUNT(*) > 1;

-- Si el SELECT de arriba devuelve filas, ejecutá esto para DEDUPLICAR
-- (conserva la fila más completa por email — la que tiene más datos):
WITH ranked AS (
  SELECT ctid,
         lower(email) AS lemail,
         ROW_NUMBER() OVER (
           PARTITION BY lower(email)
           ORDER BY
             (CASE WHEN role IS NOT NULL THEN 1 ELSE 0 END) DESC,
             (CASE WHEN bio IS NOT NULL THEN 1 ELSE 0 END) DESC,
             (CASE WHEN photo IS NOT NULL THEN 1 ELSE 0 END) DESC,
             created_at ASC
         ) AS rn
  FROM users
)
DELETE FROM users
WHERE ctid IN (SELECT ctid FROM ranked WHERE rn > 1);

-- Normalizar todos los emails a minúsculas (evita duplicados futuros):
UPDATE users SET email = lower(email) WHERE email <> lower(email);

-- Crear índice único por email para impedir duplicados de ahora en más:
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (lower(email));

-- ── 1. ELIMINAR TORNEOS DE PRUEBA (datos falsos) ─────────────
-- Cambiá 'Copa Test' por el nombre exacto del torneo falso que aparece
DELETE FROM tournaments WHERE name ILIKE '%test%' OR name ILIKE '%prueba%' OR name ILIKE '%demo%';
-- Si querés eliminar todos los torneos para empezar limpio:
-- DELETE FROM tournaments;

-- ── 2. TABLA: group_messages (con RLS permisiva para miembros) ──
CREATE TABLE IF NOT EXISTS group_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  content TEXT,
  type TEXT DEFAULT 'text',
  media_url TEXT,
  media_type TEXT,
  reply_to UUID,
  reply_preview TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para queries rápidas por grupo
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created ON group_messages(created_at DESC);

-- RLS: permisiva (la app ya controla la membresía del grupo en el front).
-- Esto garantiza que el envío de mensajes en grupos NUNCA se bloquee.
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group_members_can_read" ON group_messages;
DROP POLICY IF EXISTS "group_members_can_insert" ON group_messages;
DROP POLICY IF EXISTS "group_messages_all" ON group_messages;
CREATE POLICY "group_messages_all" ON group_messages
  FOR ALL USING (true) WITH CHECK (true);

-- ── 3. TABLA: nudges (chicanas/toques) ─────────────────────────
CREATE TABLE IF NOT EXISTS nudges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  recipient_email TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE nudges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nudges_insert" ON nudges;
DROP POLICY IF EXISTS "nudges_select" ON nudges;
DROP POLICY IF EXISTS "nudges_all" ON nudges;
CREATE POLICY "nudges_all" ON nudges
  FOR ALL USING (true) WITH CHECK (true);

-- ── 4. TABLA: club_rules (reglas del equipo con votación) ──────
CREATE TABLE IF NOT EXISTS club_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL,
  rule_text TEXT NOT NULL,
  proposed_by TEXT,
  status TEXT DEFAULT 'pending',
  votes_approve INT DEFAULT 0,
  votes_reject INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE club_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_rules_all" ON club_rules;
CREATE POLICY "club_rules_all" ON club_rules
  FOR ALL USING (true) WITH CHECK (true);

-- ── 5. TABLA: match_events (goles/asistencias en tiempo real) ──
CREATE TABLE IF NOT EXISTS match_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL,
  type TEXT NOT NULL,  -- 'goal', 'assist', 'sub_in', 'sub_out', 'yellow', 'red'
  minute INT,
  player_email TEXT,
  assist_email TEXT,
  team TEXT,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_events_all" ON match_events;
CREATE POLICY "match_events_all" ON match_events
  FOR ALL USING (true) WITH CHECK (true);

-- ── 6. TABLA: prediction_bets (apuestas de predicciones) ───────
CREATE TABLE IF NOT EXISTS prediction_bets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID,
  challenger_email TEXT NOT NULL,
  challenger_name TEXT,
  rival_email TEXT NOT NULL,
  rival_name TEXT,
  challenger_score_a INT,
  challenger_score_b INT,
  rival_score_a INT,
  rival_score_b INT,
  status TEXT DEFAULT 'pending',  -- pending, accepted, resolved
  winner_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prediction_bets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prediction_bets_all" ON prediction_bets;
CREATE POLICY "prediction_bets_all" ON prediction_bets
  FOR ALL USING (true) WITH CHECK (true);

-- ── 7. TABLA: match_reviews (reseñas con estrellas) ────────────
CREATE TABLE IF NOT EXISTS match_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID,
  user_email TEXT NOT NULL,
  user_name TEXT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, user_email)
);

ALTER TABLE match_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_reviews_read" ON match_reviews;
DROP POLICY IF EXISTS "match_reviews_insert" ON match_reviews;
DROP POLICY IF EXISTS "match_reviews_update" ON match_reviews;
DROP POLICY IF EXISTS "match_reviews_all" ON match_reviews;
CREATE POLICY "match_reviews_all" ON match_reviews
  FOR ALL USING (true) WITH CHECK (true);

-- ── 8. TABLA: predictions (columnas adicionales) ──────────────
-- Agregar columnas si no existen
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS scorer_prediction TEXT;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS mvp_prediction TEXT;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS outcome_prediction TEXT;

-- ── 9. TABLA: club_practices (planificación de prácticas) ──────
CREATE TABLE IF NOT EXISTS club_practices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL,
  title TEXT NOT NULL,
  date DATE,
  time TIME,
  venue TEXT,
  type TEXT DEFAULT 'unico',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE club_practices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_practices_all" ON club_practices;
CREATE POLICY "club_practices_all" ON club_practices
  FOR ALL USING (true) WITH CHECK (true);

-- ── 10. TABLA: club_tactics (tácticas guardadas) ───────────────
CREATE TABLE IF NOT EXISTS club_tactics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL,
  name TEXT NOT NULL,
  formation TEXT,
  positions JSONB,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE club_tactics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_tactics_all" ON club_tactics;
CREATE POLICY "club_tactics_all" ON club_tactics
  FOR ALL USING (true) WITH CHECK (true);

-- ── 11. TABLA: message_reactions (reacciones a mensajes) ───────
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID,
  user_email TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_email)
);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_reactions_all" ON message_reactions;
CREATE POLICY "message_reactions_all" ON message_reactions
  FOR ALL USING (true) WITH CHECK (true);

-- ── 12. POLÍTICA PERMISIVA EN users (para búsqueda de jugadores) ──
-- Esto permite que el buscador encuentre usuarios aunque no sean el usuario actual
DROP POLICY IF EXISTS "users_select_all" ON users;
CREATE POLICY "users_select_all" ON users
  FOR SELECT USING (true);

-- ── 13. COLUMNAS EN matches (para gestión en tiempo real) ──────
ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_score INT DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_score INT DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS mvp_name TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS mvp_home TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS mvp_away TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_club_logo TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_club_logo TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_club_name TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_club_name TEXT;

-- ── 14. COLUMNA expires_at en live_streams ─────────────────────
ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- ── 15. COLUMNAS en clubs para escudo y modalidad ──────────────
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS modality TEXT DEFAULT 'F11';
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- ── 16. POLÍTICA EN clubs (permisiva — la app controla permisos en el front) ──
-- NO usar políticas restrictivas acá: romperían la creación/edición de clubes.
DROP POLICY IF EXISTS "clubs_select_all" ON clubs;
DROP POLICY IF EXISTS "clubs_update_owner" ON clubs;
DROP POLICY IF EXISTS "clubs_delete_owner" ON clubs;
DROP POLICY IF EXISTS "clubs_all" ON clubs;
CREATE POLICY "clubs_all" ON clubs
  FOR ALL USING (true) WITH CHECK (true);

-- ── FIN ────────────────────────────────────────────────────────
-- Ejecutá este script completo. Si alguna línea falla por columna/tabla
-- que ya existe, podés ignorar el error y seguir.
