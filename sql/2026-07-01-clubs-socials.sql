alter table public.clubs add column if not exists socials jsonb default '{}'::jsonb; alter table public.clubs add column if not exists link text;
