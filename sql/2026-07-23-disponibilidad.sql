-- ═══════════════════════════════════════════════════════════════════════════
-- CANCHERO — disponibilidad horaria del jugador (P2) — 2026-07-23
-- Idempotente (se puede correr varias veces sin romper nada).
-- ═══════════════════════════════════════════════════════════════════════════

-- Franjas en las que el jugador puede jugar. Formato jsonb:
--   { "Lunes": ["Noche"], "Sábado": ["Mañana","Tarde"], ... }
-- Días: Lunes..Domingo. Franjas: "Mañana" | "Tarde" | "Noche".
-- Se ESCRIBE desde "Editar perfil" (saveEditProfile) y el registro (_autoSyncProfile),
-- y se MUESTRA en la pestaña Info del perfil.
alter table public.users add column if not exists availability_schedule jsonb;

-- Verificación (debe devolver una fila: availability_schedule | jsonb)
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'users' and column_name = 'availability_schedule';
