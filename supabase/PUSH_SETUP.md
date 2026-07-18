# Activar Push Notifications reales (app cerrada) — Canchero

El frontend ya está listo (suscripción, deep-link al tocar, Service Worker).
Falta **un paso manual en tu Supabase**: desplegar la función que envía los push
y conectarla a la tabla `notifications`.

## Claves VAPID (ya configuradas en el frontend)
- **Pública** (ya está en `canchero-notifications.js`):
  `BBroCsoWU_7LaFpLJJl2wpfQJObsyJPfXzLPwS-q1_udi4jMe7kSU4JVM6-bOCA5V87DksjRa7gtd7HIL5bW5Zc`
- **Privada** (NO compartir, va como secret en Supabase):
  `NP-4zptQj12w8rBfXjbu4Zca4KQ34n4i5lVQD8bTkXs`

## 1) Tabla de suscripciones (si no existe)
```sql
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  endpoint text not null,
  sub_json text not null,
  created_at timestamptz default now(),
  unique (user_email, endpoint)
);
alter table push_subscriptions enable row level security;
create policy "insert own" on push_subscriptions for insert with check (true);
create policy "select own" on push_subscriptions for select using (true);
```

## 2) Desplegar la función
```bash
supabase functions deploy send-push --no-verify-jwt
supabase secrets set VAPID_PUBLIC_KEY=BBroCsoWU_7LaFpLJJl2wpfQJObsyJPfXzLPwS-q1_udi4jMe7kSU4JVM6-bOCA5V87DksjRa7gtd7HIL5bW5Zc
supabase secrets set VAPID_PRIVATE_KEY=NP-4zptQj12w8rBfXjbu4Zca4KQ34n4i5lVQD8bTkXs
supabase secrets set VAPID_SUBJECT=mailto:neurostudio.uy@gmail.com
```
(SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya están disponibles por defecto en Edge Functions.)

## 3) Conectar el trigger (Database Webhook)
Dashboard → **Database → Webhooks → Create**:
- Tabla: `notifications`
- Eventos: **INSERT**
- Tipo: **Supabase Edge Function** → `send-push`

Listo. Cada vez que se inserta una notificación (mensaje, like, comentario,
chicana, etc.), Supabase llama a `send-push` y el celular recibe el push aunque
la app esté cerrada. Al tocarlo, el Service Worker abre la app y navega al contenido.

## Probar
1. En la app, activá las notificaciones (Configuración → Push) — pedirá permiso.
2. Cerrá la app.
3. Que otro usuario te mande un mensaje/like → debería llegar el push al celular.
