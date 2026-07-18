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
