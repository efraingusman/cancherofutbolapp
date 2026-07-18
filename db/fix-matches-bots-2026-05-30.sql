-- ========== FIX TABLA MATCHES: agregar columnas que usa el codigo ==========
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS match_type TEXT DEFAULT 'open';
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS slots_total INT DEFAULT 22;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS slots_taken INT DEFAULT 1;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS captain_home_email TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS captain_away_email TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS modality TEXT DEFAULT 'abierto';
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';
ALTER TABLE public.matches DISABLE ROW LEVEL SECURITY;

-- ========== BOTS: rol profesional (periodismo deportivo) + fotos ==========
UPDATE public.users SET
  role = 'profesional',
  bio = 'Periodismo Deportivo | Cobertura del Mundial, Champions, Libertadores y todo el futbol internacional en tiempo real.',
  photo = 'https://ui-avatars.com/api/?name=ML&background=1a3a6b&color=fff&bold=true&size=200&rounded=true',
  cover_photo = 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&q=80'
WHERE email = 'bot-mundial@canchero.app';

UPDATE public.users SET
  role = 'profesional',
  bio = 'Periodismo Deportivo | Noticias, novedades y la voz de la comunidad Canchero.',
  photo = 'https://ui-avatars.com/api/?name=CN&background=baff00&color=000&bold=true&size=200&rounded=true',
  cover_photo = 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1200&q=80'
WHERE email = 'bot-news@canchero.app';

UPDATE public.users SET
  role = 'profesional',
  bio = 'Periodismo Deportivo | Efemerides e historia del futbol mundial. Un dia como hoy en la historia.',
  photo = 'https://ui-avatars.com/api/?name=HF&background=8B4513&color=fff&bold=true&size=200&rounded=true',
  cover_photo = 'https://images.unsplash.com/photo-1486286701208-1d58e9338013?w=1200&q=80'
WHERE email = 'bot-historia@canchero.app';

-- ========== LIMPIAR posts viejos de bots ==========
DELETE FROM public.posts WHERE user_email IN ('bot-mundial@canchero.app','bot-news@canchero.app','bot-historia@canchero.app');
