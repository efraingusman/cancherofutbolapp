-- ========== TABLAS NUEVAS PARA DASHBOARD DE PARTIDO ==========

-- Confirmaciones de asistencia
CREATE TABLE IF NOT EXISTS public.match_confirmations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  player_email TEXT NOT NULL,
  status TEXT DEFAULT 'pendiente',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, player_email)
);
ALTER TABLE public.match_confirmations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open" ON public.match_confirmations;
CREATE POLICY "open" ON public.match_confirmations FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.match_confirmations TO anon, authenticated;

-- Predicciones de resultado
CREATE TABLE IF NOT EXISTS public.match_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  predictor_email TEXT NOT NULL,
  home_score INT DEFAULT 0,
  away_score INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, predictor_email)
);
ALTER TABLE public.match_predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open" ON public.match_predictions;
CREATE POLICY "open" ON public.match_predictions FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.match_predictions TO anon, authenticated;

-- Costos del partido
CREATE TABLE IF NOT EXISTS public.match_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE UNIQUE,
  cancha_price NUMERIC DEFAULT 0,
  extra_costs NUMERIC DEFAULT 0,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.match_costs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open" ON public.match_costs;
CREATE POLICY "open" ON public.match_costs FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.match_costs TO anon, authenticated;

-- Columnas adicionales en matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS venue_lat DOUBLE PRECISION;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS venue_lng DOUBLE PRECISION;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS rules TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS formation TEXT DEFAULT '4-3-3';
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';

-- Expirar posts: asegurar que posts viejos sin expires_at (antes de la columna) no queden visibles
-- Setear expires_at en posts que no lo tienen (con pinned=false) a hace 13 horas (ya expirados)
UPDATE public.posts SET expires_at = (created_at + interval '12 hours')
  WHERE expires_at IS NULL AND (pinned IS NULL OR pinned = false);
