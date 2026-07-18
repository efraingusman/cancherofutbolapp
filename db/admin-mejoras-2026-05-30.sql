-- Agenda del admin
CREATE TABLE IF NOT EXISTS public.admin_agenda (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_email TEXT NOT NULL DEFAULT 'neurovidstudioia@gmail.com',
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME,
  type TEXT DEFAULT 'tarea',
  done BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.admin_agenda ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_only" ON public.admin_agenda;
CREATE POLICY "admin_only" ON public.admin_agenda FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.admin_agenda TO anon, authenticated;

-- Reseñas de negocios
CREATE TABLE IF NOT EXISTS public.business_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_email TEXT NOT NULL,
  reviewer_email TEXT NOT NULL,
  reviewer_name TEXT,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  order_id UUID REFERENCES public.business_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.business_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open" ON public.business_reviews;
CREATE POLICY "open" ON public.business_reviews FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.business_reviews TO anon, authenticated;

-- Logística en business_orders
ALTER TABLE public.business_orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE public.business_orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE public.business_orders ADD COLUMN IF NOT EXISTS shipping_status TEXT DEFAULT 'preparando';
ALTER TABLE public.business_orders ADD COLUMN IF NOT EXISTS estimated_delivery DATE;
ALTER TABLE public.business_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Campos nuevos en matches para costos y tiempos
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 90;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS arrival_time TIME;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0;

-- Fix RLS matches para permitir insert sin auth Supabase (usuarios localStorage)
DROP POLICY IF EXISTS "matches_auth_insert" ON public.matches;
CREATE POLICY "matches_open_insert" ON public.matches FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "matches_creator_update" ON public.matches;
CREATE POLICY "matches_open_update" ON public.matches FOR UPDATE USING (true) WITH CHECK (true);
GRANT ALL ON public.matches TO anon, authenticated;
