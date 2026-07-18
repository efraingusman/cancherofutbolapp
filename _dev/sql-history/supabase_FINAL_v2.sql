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
