-- Notificaciones: el INSERT exigía auth.role()='authenticated'; las sesiones
-- anónimas (login legacy / anon key) no podían crear notificaciones → no llegaban.
drop policy if exists notif_insert on public.notifications;
create policy notif_insert on public.notifications for insert with check ( true );
