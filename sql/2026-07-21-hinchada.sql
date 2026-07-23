-- ═══════════════════════════════════════════════════════════════════════════
-- CANCHERO — HINCHADA (perfil de fanático) — 2026-07-21
-- Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

-- Club del que es hincha el usuario. Se guarda el SLUG ('penarol', 'nacional',
-- 'boca', 'real-madrid'...). Los slugs son los mismos que usa CLUB_RX en
-- api/news.js: si se agrega un club nuevo hay que darlo de alta en los dos lados
-- o va a quedar sin noticias.
-- Es una columna propia (y no un campo dentro de linked_profiles) porque se
-- consulta para armar la hinchada: "todos los que hinchan de este club".
alter table public.users add column if not exists fan_club text;

create index if not exists idx_users_fan_club on public.users(fan_club);

-- Verificación
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'users' and column_name = 'fan_club';
