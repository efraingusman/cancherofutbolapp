-- ============================================================
-- FIXES CALENDARIO — 2026-06-03
-- match_checkins YA EXISTE con columna user_email — solo agregar columnas faltantes
-- ============================================================

-- Agregar columnas faltantes a matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT false;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS slots_filled INTEGER DEFAULT 0;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'amistoso';
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS modality TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS format TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS slots_total INTEGER DEFAULT 0;

-- Agregar columnas faltantes a match_players (por si no existen)
ALTER TABLE public.match_players ADD COLUMN IF NOT EXISTS player_name TEXT;
ALTER TABLE public.match_players ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendiente';
ALTER TABLE public.match_players ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT NOW();

-- Trigger para mantener slots_filled actualizado
CREATE OR REPLACE FUNCTION update_match_slots_filled()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.matches SET slots_filled = slots_filled + 1 WHERE id = NEW.match_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.matches SET slots_filled = GREATEST(0, slots_filled - 1) WHERE id = OLD.match_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_match_slots_filled ON public.match_players;
CREATE TRIGGER trg_match_slots_filled
    AFTER INSERT OR DELETE ON public.match_players
    FOR EACH ROW EXECUTE FUNCTION update_match_slots_filled();
