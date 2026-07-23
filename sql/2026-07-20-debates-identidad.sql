-- ═══════════════════════════════════════════════════════════════════════════
-- CANCHERO — debates y comunidades: identidad del autor — 2026-07-20
-- Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

-- Con qué identidad se escribió el argumento ('jugador' | 'fanatico' | 'biz:<id>' ...)
-- para que SOLO ese rol pueda borrarlo, y la foto con la que se publicó (la del
-- jugador no sirve: si escribiste como fanático o como negocio, la foto es otra).
alter table public.debate_arguments add column if not exists author_identity text;
alter table public.debate_arguments add column if not exists user_photo text;

-- Con qué identidad se creó la comunidad.
alter table public.communities add column if not exists creator_identity text;

-- Verificación: debería devolver 3 filas
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (
       (table_name = 'debate_arguments' and column_name in ('author_identity','user_photo'))
    or (table_name = 'communities'      and column_name = 'creator_identity')
  )
order by table_name, column_name;
