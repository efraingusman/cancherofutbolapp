-- ═══════════════════════════════════════════════════════════════════════════
-- CANCHERO — comunidades: borrar (solo creador) + foto de perfil — 2026-07-23
-- Idempotente. Arregla que "eliminar comunidad" no borraba nada (faltaba policy
-- de DELETE con RLS activo → el delete devolvía 0 filas sin error).
-- ═══════════════════════════════════════════════════════════════════════════

-- Foto de perfil de la comunidad (URL). La setea solo el creador desde la app.
alter table public.communities add column if not exists image_url text;

-- Asegurar RLS y policies mínimas coherentes con el resto de la app.
alter table public.communities enable row level security;

-- Lectura pública (si ya existe una equivalente, esta la reemplaza sin romper).
drop policy if exists com_select_all on public.communities;
create policy com_select_all on public.communities for select using ( true );

-- Insertar: cualquiera autenticado crea comunidades (created_by = su email).
drop policy if exists com_insert_own on public.communities;
create policy com_insert_own on public.communities for insert
  with check ( lower(created_by) = lower(auth.jwt() ->> 'email') );

-- Actualizar (nombre, descripción, image_url): solo el creador.
drop policy if exists com_update_creator on public.communities;
create policy com_update_creator on public.communities for update
  using ( lower(created_by) = lower(auth.jwt() ->> 'email') );

-- Borrar: solo el creador. (ESTA es la que faltaba.)
drop policy if exists com_delete_creator on public.communities;
create policy com_delete_creator on public.communities for delete
  using ( lower(created_by) = lower(auth.jwt() ->> 'email') );

-- Posts: el autor borra los suyos, y el creador de la comunidad puede limpiar TODO
-- al borrar la comunidad.
drop policy if exists cp_delete_own on public.community_posts;
create policy cp_delete_own on public.community_posts for delete
  using (
    lower(user_email) = lower(auth.jwt() ->> 'email')
    or exists (
      select 1 from public.communities c
      where c.id = community_posts.community_id
        and lower(c.created_by) = lower(auth.jwt() ->> 'email')
    )
  );

-- Miembros: cada quien se saca a sí mismo, y el creador puede limpiar al borrar.
alter table public.community_members enable row level security;
drop policy if exists cm_select_all on public.community_members;
create policy cm_select_all on public.community_members for select using ( true );
drop policy if exists cm_insert_own on public.community_members;
create policy cm_insert_own on public.community_members for insert
  with check ( lower(user_email) = lower(auth.jwt() ->> 'email') );
drop policy if exists cm_delete_own on public.community_members;
create policy cm_delete_own on public.community_members for delete
  using (
    lower(user_email) = lower(auth.jwt() ->> 'email')
    or exists (
      select 1 from public.communities c
      where c.id = community_members.community_id
        and lower(c.created_by) = lower(auth.jwt() ->> 'email')
    )
  );
