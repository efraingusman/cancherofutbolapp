-- Roles multi-dispositivo: el perfil activo y los perfiles enlazados viven en la DB
alter table public.users add column if not exists linked_profiles jsonb default '{}'::jsonb;
alter table public.users add column if not exists active_profile text;
alter table public.users add column if not exists active_team jsonb;
