-- Schema fixes for Canchero 2026-05-31
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'mixto';
ALTER TABLE public.match_bets ADD COLUMN IF NOT EXISTS approvals_json TEXT DEFAULT '[]';

CREATE TABLE IF NOT EXISTS public.match_confirmations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  player_email TEXT NOT NULL,
  status TEXT DEFAULT 'pendiente',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, player_email)
);
ALTER TABLE public.match_confirmations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_confirmations" ON public.match_confirmations;
CREATE POLICY "open_confirmations" ON public.match_confirmations FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.match_confirmations TO anon, authenticated, service_role;
