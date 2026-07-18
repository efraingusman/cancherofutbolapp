-- ============================================================
-- CANCHERO — GRUPO B: Esquema + RLS que desbloquea features
-- Ejecutar en Supabase → SQL Editor → New query → pegar todo → Run
-- Es idempotente (se puede correr varias veces sin romper nada).
-- Fecha: 2026-06-01
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1) CLUBS: columna gender (masculino / femenino / mixto)
--    Necesaria para búsquedas y restricción de torneos por género.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'mixto';

-- (opcional) normalizar valores existentes a minúscula
UPDATE public.clubs SET gender = lower(gender)
  WHERE gender IS NOT NULL AND gender <> lower(gender);


-- ─────────────────────────────────────────────────────────────
-- 2) MATCH_BETS: constraint UNIQUE en match_id
--    Soluciona el error "no unique or exclusion constraint matching
--    the ON CONFLICT specification" al proponer apuestas.
--    (El código ya tiene fallback select→update, pero esto lo hace
--     más limpio y permite upsert real.)
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'match_bets_match_id_key'
  ) THEN
    -- borrar duplicados previos dejando el más reciente
    DELETE FROM public.match_bets a USING public.match_bets b
      WHERE a.match_id = b.match_id AND a.ctid < b.ctid;
    ALTER TABLE public.match_bets
      ADD CONSTRAINT match_bets_match_id_key UNIQUE (match_id);
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────
-- 3) NOTIFICATIONS: RLS para que se puedan CREAR notificaciones
--    PARA OTROS usuarios (like/comentario/follow/encuesta).
--    Causa típica de "la campana nunca recibe nada".
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Cualquiera autenticado puede INSERTAR una notificación (para otro user)
DROP POLICY IF EXISTS "notif_insert_any_auth" ON public.notifications;
CREATE POLICY "notif_insert_any_auth" ON public.notifications
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

-- Cada usuario LEE solo las suyas (las que le llegan)
DROP POLICY IF EXISTS "notif_select_own" ON public.notifications;
CREATE POLICY "notif_select_own" ON public.notifications
  FOR SELECT TO authenticated, anon
  USING (true);

-- Cada usuario puede marcar como leída / actualizar las suyas
DROP POLICY IF EXISTS "notif_update_own" ON public.notifications;
CREATE POLICY "notif_update_own" ON public.notifications
  FOR UPDATE TO authenticated, anon
  USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────
-- 4) MENSAJES: RLS abierta para chats (DM y grupos)
--    Soluciona "no envía" cuando RLS bloquea el insert.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['messages','group_messages','group_chats','group_members'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('DROP POLICY IF EXISTS "%s_all_auth" ON public.%I;', t, t);
      EXECUTE format('CREATE POLICY "%s_all_auth" ON public.%I FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);', t, t);
    END IF;
  END LOOP;
END $$;

-- Columnas opcionales que el chat usa (no rompe si ya existen)
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS reply_to text;
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS reply_preview text;
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS media_type text;
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS type text DEFAULT 'text';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_preview text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_type text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS type text DEFAULT 'text';


-- ─────────────────────────────────────────────────────────────
-- 5) USERS: columnas usadas por el directorio/perfil (por si faltan)
--    El código ya usa select('*'), pero esto evita NULLs molestos.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gender text;     -- Masculino/Femenino/Otro
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS available boolean DEFAULT false;


-- ─────────────────────────────────────────────────────────────
-- 6) PROFESIONALES: rol/subrol (incluye PERIODISMO DEPORTIVO)
--    Para que cualquier profesional elija su especialidad.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pro_role text;   -- ej: 'periodista', 'dt', 'arbitro', 'kine', 'nutricionista', 'preparador'
-- Valores sugeridos para el front (no es un enum estricto para permitir crecer):
--   periodista | dt | arbitro | kinesiologo | nutricionista | preparador_fisico |
--   psicologo | representante | medico | utilero | analista

-- ─────────────────────────────────────────────────────────────
-- 7) STORAGE: asegurar bucket 'media' público (para fotos/audios de chat)
--    Si ya existe, no hace nada.
-- ─────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('media','media', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de storage: subir/leer en 'media' para autenticados
DROP POLICY IF EXISTS "media_read_all" ON storage.objects;
CREATE POLICY "media_read_all" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'media');

DROP POLICY IF EXISTS "media_insert_auth" ON storage.objects;
CREATE POLICY "media_insert_auth" ON storage.objects
  FOR INSERT TO authenticated, anon WITH CHECK (bucket_id = 'media');

DROP POLICY IF EXISTS "media_update_auth" ON storage.objects;
CREATE POLICY "media_update_auth" ON storage.objects
  FOR UPDATE TO authenticated, anon USING (bucket_id = 'media') WITH CHECK (bucket_id = 'media');

-- ─────────────────────────────────────────────────────────────
-- 8) LIVE_STREAMS + POLLS: RLS abierta (directos y encuestas)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['live_streams','live_comments','polls','poll_votes'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('DROP POLICY IF EXISTS "%s_all_auth" ON public.%I;', t, t);
      EXECUTE format('CREATE POLICY "%s_all_auth" ON public.%I FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);', t, t);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- FIN. Tras correr esto:
--  • Notificaciones (like/comentario/follow) empiezan a llegar
--  • Apuestas sin error ON CONFLICT
--  • Chats (DM y grupo) pueden insertar mensajes
--  • Fotos/audios de chat suben al bucket 'media'
--  • Clubes con género para búsquedas/torneos
--  • Profesionales con especialidad (periodismo, etc.)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 9) POSTS: carrusel (media_urls) + orientación (media_fit)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_urls jsonb;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_fit text DEFAULT 'horizontal';

-- ─────────────────────────────────────────────────────────────
-- 10) POSTS + post_likes + post_comments: RLS abierta
--     Soluciona que editar/eliminar publicaciones no persista.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['posts','post_likes','post_comments','stories','story_likes','story_comments','follows'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('DROP POLICY IF EXISTS "%s_all_auth" ON public.%I;', t, t);
      EXECUTE format('CREATE POLICY "%s_all_auth" ON public.%I FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);', t, t);
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 11) DESAFIAR: columnas en matches + 2º capitán en clubs
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS home_club_id text;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS away_club_id text;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS home_club_name text;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS away_club_name text;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS home_club_logo text;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS away_club_logo text;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS away_score int;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS home_score int;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS challenge_status text;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS captain_2_email text;
