-- ============================================================
-- CANCHERO APP — TABLAS SUPABASE
-- Pegar en SQL Editor de Supabase y ejecutar
-- ============================================================

CREATE TABLE IF NOT EXISTS complexes (
  id TEXT PRIMARY KEY,
  name TEXT,
  owner TEXT,
  email TEXT,
  phone TEXT,
  rut TEXT,
  status TEXT,
  date TIMESTAMP WITH TIME ZONE,
  payload JSONB
);

CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  name TEXT,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE
);

-- Solicitudes de negocios (complejos, tiendas, organizaciones, profesionales, sponsors)
CREATE TABLE IF NOT EXISTS business_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT,         -- club | profesional | organizacion | tienda | sponsor
  plan TEXT,         -- basico | pro | premium
  sub_type TEXT,     -- arbitro | tecnico | liga | escuela | etc.
  status TEXT DEFAULT 'PENDIENTE',  -- PENDIENTE | APROBADO | RECHAZADO
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  next_billing_at TIMESTAMP WITH TIME ZONE,
  payload JSONB
);

-- Config (payment links y ajustes globales)
CREATE TABLE IF NOT EXISTS config (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- ============================================================
-- SOCIAL FEATURES
-- ============================================================

-- Posts (texto + imagen + video)
CREATE TABLE IF NOT EXISTS posts (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email   TEXT NOT NULL,
  user_name    TEXT,
  user_role    TEXT DEFAULT 'jugador',
  user_avatar  TEXT,
  content      TEXT,
  media_url    TEXT,
  media_type   TEXT DEFAULT 'text',  -- text | image | video
  likes_count  INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Likes a posts
CREATE TABLE IF NOT EXISTS post_likes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_email)
);

-- Comentarios
CREATE TABLE IF NOT EXISTS post_comments (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name  TEXT,
  content    TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stories (expiran en 24h)
CREATE TABLE IF NOT EXISTS stories (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  user_name  TEXT,
  user_role  TEXT DEFAULT 'jugador',
  media_url  TEXT,
  content    TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Notificaciones in-app
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  type            TEXT NOT NULL,  -- like | comment | follow | story
  actor_name      TEXT,
  actor_email     TEXT,
  post_id         UUID,
  message         TEXT,
  read            BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Productos (Tienda / Marketplace)
CREATE TABLE IF NOT EXISTS products (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_email TEXT NOT NULL,
  seller_name  TEXT,
  name         TEXT NOT NULL,
  price        NUMERIC DEFAULT 0,
  category     TEXT,
  image_url    TEXT,
  description  TEXT,
  buy_link     TEXT,
  active       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reportes de contenido
CREATE TABLE IF NOT EXISTS reports (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL,   -- post | comment | story
  content_id   UUID NOT NULL,
  reporter_email TEXT NOT NULL,
  reason       TEXT NOT NULL,   -- spam | inapropiado | violento | sexual | otro
  status       TEXT DEFAULT 'PENDIENTE',  -- PENDIENTE | REVISADO | ELIMINADO
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Items de negocio (canchas, servicios, eventos)
CREATE TABLE IF NOT EXISTS biz_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_email TEXT NOT NULL,
  type        TEXT NOT NULL,   -- court | service | event | campaign
  title       TEXT NOT NULL,
  description TEXT,
  price       NUMERIC DEFAULT 0,
  image_url   TEXT,
  active      BOOLEAN DEFAULT TRUE,
  payload     JSONB,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sistema de seguidores
CREATE TABLE IF NOT EXISTS follows (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_email TEXT NOT NULL,
  following_email TEXT NOT NULL,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_email, following_email)
);

-- Mensajes directos (DMs)
CREATE TABLE IF NOT EXISTS messages (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_email    TEXT NOT NULL,
  sender_name     TEXT,
  recipient_email TEXT NOT NULL,
  content         TEXT NOT NULL,
  read            BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics de uso de la plataforma
CREATE TABLE IF NOT EXISTS analytics (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,   -- page_view | signup | login | post_created | etc.
  user_email TEXT,
  metadata   JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- Deshabilitar RLS para acceso anon (temporalmente)
-- ============================================================
ALTER TABLE complexes DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE business_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE config DISABLE ROW LEVEL SECURITY;
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE stories DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE biz_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE follows DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Supabase Storage: bucket público para imágenes/videos
-- Ejecutar por separado si el bucket no existe aún:
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('media', 'media', true)
-- ON CONFLICT (id) DO NOTHING;
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
-- ════════════════════════════════════════════════════════════════════════════
-- CANCHERO — SQL EXTRA: friends + stories + products
-- Pegar en Supabase → SQL Editor → New query → RUN
-- ════════════════════════════════════════════════════════════════════════════

-- FRIEND REQUESTS
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_email TEXT NOT NULL,
  to_name TEXT,
  status TEXT DEFAULT 'pending', -- 'pending'|'accepted'|'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_email, to_email)
);
CREATE INDEX IF NOT EXISTS fr_to_idx ON friend_requests(to_email, status);
CREATE INDEX IF NOT EXISTS fr_from_idx ON friend_requests(from_email, status);
ALTER TABLE friend_requests DISABLE ROW LEVEL SECURITY;

-- STORIES (24h ephemeral)
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  user_name TEXT,
  text TEXT,
  media_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS stories_recent_idx ON stories(created_at DESC);
ALTER TABLE stories DISABLE ROW LEVEL SECURITY;

-- PRODUCTS (tienda)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_email TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2),
  stock INT DEFAULT 0,
  image_url TEXT,
  category TEXT,
  active BOOLEAN DEFAULT TRUE,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS prod_seller_idx ON products(seller_email, active);
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- USERS: agregar bio + country
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT;

-- MATCHES: campos visibles del directorio
ALTER TABLE matches ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS venue TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS modality TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);

-- BIZ_ITEMS: por si no existe (complejos publican canchas)
CREATE TABLE IF NOT EXISTS biz_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email TEXT NOT NULL,
  type TEXT NOT NULL, -- 'court'|'service'|'event'
  title TEXT,
  description TEXT,
  price NUMERIC(10,2),
  image_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS biz_owner_idx ON biz_items(owner_email, type, active);
ALTER TABLE biz_items DISABLE ROW LEVEL SECURITY;

-- BUSINESS_REQUESTS (por si no existe): aprobación de negocios
CREATE TABLE IF NOT EXISTS business_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  role TEXT,
  plan TEXT,
  sub_type TEXT,
  payload JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE business_requests DISABLE ROW LEVEL SECURITY;
-- =============================================================
-- CANCHERO FASE 3 — Tablas nuevas
-- Ejecutar en: Supabase → SQL Editor
-- =============================================================

-- Tabla de complejos
CREATE TABLE IF NOT EXISTS public.complexes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    city text,
    department text,
    address text,
    lat numeric,
    lng numeric,
    court_count integer DEFAULT 1,
    surface text DEFAULT 'Sintético',
    price_per_hour numeric,
    rating numeric,
    phone text,
    email text,
    photo_url text,
    owner_email text,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.complexes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "complejos_public_read" ON public.complexes FOR SELECT USING (true);
CREATE POLICY "complejos_owner_write" ON public.complexes FOR ALL USING (auth.email() = owner_email);

-- Tabla de partidos
CREATE TABLE IF NOT EXISTS public.matches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_a_name text,
    team_b_name text,
    team_a_id uuid,
    team_b_id uuid,
    complex_id uuid REFERENCES public.complexes(id),
    complex_name text,
    scheduled_at timestamptz,
    status text DEFAULT 'scheduled', -- scheduled | live | finished | cancelled
    match_type text DEFAULT 'friendly', -- friendly | tournament
    score_a integer,
    score_b integer,
    mvp text,
    city text,
    created_by text,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches_public_read" ON public.matches FOR SELECT USING (true);
CREATE POLICY "matches_auth_insert" ON public.matches FOR INSERT WITH CHECK (auth.email() IS NOT NULL);
CREATE POLICY "matches_creator_update" ON public.matches FOR UPDATE USING (auth.email() = created_by);

-- Predicciones
CREATE TABLE IF NOT EXISTS public.predictions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email text NOT NULL,
    match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE,
    score_a integer NOT NULL,
    score_b integer NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_email, match_id)
);
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pred_own" ON public.predictions FOR ALL USING (auth.email() = user_email);
CREATE POLICY "pred_read" ON public.predictions FOR SELECT USING (true);

-- Check-ins
CREATE TABLE IF NOT EXISTS public.match_checkins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE,
    user_email text NOT NULL,
    checked_in_at timestamptz DEFAULT now(),
    UNIQUE(match_id, user_email)
);
ALTER TABLE public.match_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checkin_own" ON public.match_checkins FOR ALL USING (auth.email() = user_email);

-- Solicitudes para completar cuadro
CREATE TABLE IF NOT EXISTS public.squad_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE,
    captain_email text NOT NULL,
    missing_count integer DEFAULT 1,
    city text,
    status text DEFAULT 'open', -- open | closed
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.squad_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "squad_req_read" ON public.squad_requests FOR SELECT USING (true);
CREATE POLICY "squad_req_captain" ON public.squad_requests FOR ALL USING (auth.email() = captain_email);

-- Aplicaciones a completar cuadro
CREATE TABLE IF NOT EXISTS public.squad_applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid REFERENCES public.squad_requests(id) ON DELETE CASCADE,
    applicant_email text NOT NULL,
    status text DEFAULT 'pending', -- pending | accepted | rejected
    created_at timestamptz DEFAULT now(),
    UNIQUE(request_id, applicant_email)
);
ALTER TABLE public.squad_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "squad_app_applicant" ON public.squad_applications FOR ALL USING (auth.email() = applicant_email);
CREATE POLICY "squad_app_read" ON public.squad_applications FOR SELECT USING (true);

-- Directos en vivo
CREATE TABLE IF NOT EXISTS public.live_streams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    streamer_email text NOT NULL,
    streamer_name text,
    match_id uuid REFERENCES public.matches(id),
    tags text[],
    status text DEFAULT 'live', -- live | ended
    viewer_count integer DEFAULT 0,
    started_at timestamptz DEFAULT now(),
    ended_at timestamptz
);
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streams_public_read" ON public.live_streams FOR SELECT USING (true);
CREATE POLICY "streams_streamer" ON public.live_streams FOR ALL USING (auth.email() = streamer_email);

-- Chat de partido
CREATE TABLE IF NOT EXISTS public.party_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE,
    user_email text NOT NULL,
    user_name text,
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.party_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_read" ON public.party_messages FOR SELECT USING (true);
CREATE POLICY "pm_insert" ON public.party_messages FOR INSERT WITH CHECK (auth.email() = user_email);

-- Bloqueos
CREATE TABLE IF NOT EXISTS public.blocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_email text NOT NULL,
    blocked_email text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(blocker_email, blocked_email)
);
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks_own" ON public.blocks FOR ALL USING (auth.email() = blocker_email);

-- Posts (si no existe aún)
CREATE TABLE IF NOT EXISTS public.posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email text,
    user_name text,
    user_photo text,
    content text,
    media_url text,
    category text, -- club | profesional | tienda | organizacion | null
    likes_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_public_read" ON public.posts FOR SELECT USING (true);
CREATE POLICY "posts_auth_insert" ON public.posts FOR INSERT WITH CHECK (auth.email() IS NOT NULL);
CREATE POLICY "posts_owner_delete" ON public.posts FOR DELETE USING (auth.email() = user_email);

-- Habilitar Realtime en tablas que lo necesitan
ALTER PUBLICATION supabase_realtime ADD TABLE public.party_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_requests;
