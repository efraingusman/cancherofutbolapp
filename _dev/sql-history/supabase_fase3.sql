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
