-- Fix recursión RLS en group_members: helper security definer que consulta
-- la membresía SIN pasar por RLS (evita que la política se llame a sí misma)
create or replace function public.is_group_member(gid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from group_members where group_id = gid and lower(email) = lower(coalesce(auth.email(),''))) $$;

drop policy if exists gm_select on public.group_members;
create policy gm_select on public.group_members for select
  using (lower(email) = public.me() or public.is_group_member(group_id));

drop policy if exists gmsg_select on public.group_messages;
create policy gmsg_select on public.group_messages for select
  using (public.is_group_member(group_id));

drop policy if exists gmsg_insert on public.group_messages;
create policy gmsg_insert on public.group_messages for insert
  with check (public.me() = lower(sender_email) and public.is_group_member(group_id));

drop policy if exists gc_select on public.group_chats;
create policy gc_select on public.group_chats for select
  using (public.me() = lower(created_by) or public.is_group_member(id));
