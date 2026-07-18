-- Follows separados por rol (fanático/club no comparten seguidores con jugador)
alter table public.follows add column if not exists follower_profile text default 'jugador';
alter table public.follows add column if not exists following_profile text default 'jugador';
