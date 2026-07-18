-- ============================================================
-- POLLS — Sistema de Encuestas Canchero
-- ============================================================

CREATE TABLE IF NOT EXISTS public.polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_email TEXT NOT NULL,
  creator_name TEXT,
  creator_photo TEXT,
  title TEXT NOT NULL,
  description TEXT,
  options JSONB NOT NULL DEFAULT '[]',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '12 hours'),
  is_pinned BOOLEAN DEFAULT false,
  context TEXT DEFAULT 'feed',  -- feed | story | chat | group | match
  context_id TEXT,
  total_votes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_polls" ON public.polls;
CREATE POLICY "open_polls" ON public.polls FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.polls TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
  voter_email TEXT NOT NULL,
  option_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(poll_id, voter_email)
);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_poll_votes" ON public.poll_votes;
CREATE POLICY "open_poll_votes" ON public.poll_votes FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.poll_votes TO anon, authenticated, service_role;

-- Index para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_polls_creator ON public.polls(creator_email);
CREATE INDEX IF NOT EXISTS idx_polls_context ON public.polls(context, context_id);
CREATE INDEX IF NOT EXISTS idx_polls_expires ON public.polls(expires_at);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON public.poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_voter ON public.poll_votes(voter_email);
