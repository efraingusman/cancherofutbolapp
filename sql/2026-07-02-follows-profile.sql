-- Follows conscientes del ROL (jugador / fanatico / team) — feedback 2026-07-02
-- Cada identidad tiene sus propios seguidores/seguidos aunque compartan email.
alter table public.follows add column if not exists follower_profile text;
alter table public.follows add column if not exists following_profile text;
-- backfill: los follows existentes son de jugador
update public.follows set follower_profile = 'jugador' where follower_profile is null;
update public.follows set following_profile = 'jugador' where following_profile is null;
