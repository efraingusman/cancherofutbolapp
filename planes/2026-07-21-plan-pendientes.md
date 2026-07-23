# PLAN — pendientes de Canchero (al 2026-07-21)

**Estado:** deploy v373. Todo lo de abajo está SIN hacer salvo que diga lo contrario.

## Cómo deployar (IMPORTANTE — leer antes de tocar nada)

- El código fuente vive en la **raíz** de `canchero app/` (en Downloads, NO en Documents).
  `www/` es SALIDA de `npm run build` y se pisa en cada build — nunca editar ahí.
- Producción la sirve **Vercel** desde la raíz. Para deployar, desde la carpeta del proyecto:
  ```bash
  npx vercel --prod --yes
  ```
- Al tocar `script.js` / `style.css` / cualquier `canchero-*.js`: subir su `?v=` en los
  HTML que lo cargan Y subir `CACHE_NAME` en `sw.js` (va de `canchero-vN` a `canchero-vN+1`).
- El server de preview local 404ea los `.html` (solo sirve la raíz `/`): para verificar UI
  se inyecta el markup con javascript_tool y se mide, o se lee producción con Invoke-WebRequest.
- Reglas fijas del proyecto: gratis también para negocios · sin emojis, siempre iconos ·
  liquid glass · tiene que verse bien en celular y PC · verificar que la columna EXISTE
  antes de insertarla · el email identifica la CUENTA, no la identidad (filtrar por rol).

---

## P1 — MATCHMAKING (a medio hacer)

Ya hecho (v371): la valoración se gana jugando (`canchero-rating.js`, nunca baja), el filtro
de partidos por nivel en "Unirme a un partido", y `balancear()` probado. Falta conectarlo:

- [ ] **Selector de nivel al CREAR un partido** — sin esto `matches.skill_level` queda vacío
      y el filtro por nivel no tiene qué filtrar. Es lo más urgente de P1.
- [ ] **Botón "Balancear equipos"** en el armado de equipos (la función ya existe y está
      probada, falta el botón + pintar los dos equipos).
- [ ] **Sugerencia de jugadores** por cercanía de nivel y posición faltante en "Equipos
      buscan jugadores".

## P2 — DISPONIBILIDAD HORARIA (rota, alta prioridad)

Hoy la grilla de disponibilidad del registro se guarda en `userData` local pero la columna
`users.availability_schedule` **se LEE en 3 lugares y no se ESCRIBE en ninguno** → el dato se
pierde al cerrar sesión. El toggle "Disponible" es un booleano suelto sin relación con horarios.

- [ ] **Guardar** la disponibilidad de verdad (editable desde "Editar perfil", no solo registro).
- [ ] **Mostrarla** en la pestaña Info del perfil.
- [ ] **Sugerir partidos** que caen en las franjas del jugador.
- [ ] Que equipos que buscan jugadores puedan filtrar "disponibles hoy / esta semana".
- [ ] Auto-activar el toggle "Disponible" según franja horaria (con override manual).
- [ ] Migración probable: reusar `availability_schedule` (jsonb) que ya existe pero no se escribe.

## P4 — EVITAR LA "APP VACÍA"

- [ ] **Partidos recurrentes/fijos** creados por complejo u organización ("todos los martes
      20hs en Cancha X") que se regeneren cada semana.
- [ ] **Partidos destacados** arriba de "Unirme a un partido".
- [ ] Estado claro cuando no hay partidos en la ciudad: CTA para crear o activar notificaciones.

## P5 — RESERVA + PAGO

Ya existe `payment_status` / `payment_link` / comprobantes en torneos. Falta el ciclo de partido:

- [ ] Reservar un lugar en un partido con estado (pendiente / confirmado / pagado).
- [ ] Integración de pago (Mercado Pago Uruguay; dejar arquitectura lista aunque quede en test).
      Ya existe `api/create-payment.js` y `api/payment-webhook.js` — revisar si sirven.
- [ ] Check-in en la cancha el día del partido ("llegué").

## HINCHADA — mejoras pendientes

Ya hecho (v370-v373): sección Hinchada del fanático (club, gente, lo que dicen, noticias),
escudos OFICIALES verificados, compartir. Falta:

- [ ] **Notificar** al hincha cuando hay una noticia nueva de su club.
- [ ] **Competir entre hinchadas** (predicciones/debates que suman al club, tabla de hinchadas)
      — era una de las ideas del usuario, quedó para después.
- [ ] Los clubes chicos tienen poco volumen de noticias (Danubio 0 el día de la prueba): la
      sección se apoya en la gente, pero conviene sumar más fuentes RSS uruguayas si aparecen.

## RACHA — mejoras pendientes

Ya hecho (v373): pantalla grande estilo Duolingo, chip en el perfil, compartir. Ideas para
enganchar más (Duolingo real):

- [ ] **"Recuperá tu racha"**: si perdés la racha, ofrecer recuperarla (una vez, o con algo).
- [ ] **Recordatorio** push a la tarde si todavía no entró hoy y tiene racha activa.
- [ ] **Hitos con recompensa** visible (insignia a los 7/30/100 días).

## P3 — ONBOARDING (del prompt original, sin empezar)

- [ ] Primera pregunta al registrarse: "¿Qué querés hacer?" con "Jugar" destacado; negocios
      en segundo plano.
- [ ] Flujo mínimo jugador: carta → posición → disponibilidad → ver partidos cerca, < 2 min.

## P6 — LIGAS EXTERNAS — DESCARTADO

El usuario decidió NO hacerlo. El plan gratis de API-Football no da partidos actuales (solo
temporadas 2022-2024), por eso quedó bloqueado. Las noticias sí funcionan (RSS, gratis).

## LIMPIEZA (P6 del prompt original)

- [ ] Juegos embebidos de terceros: **el usuario pidió NO tocar por ahora** (2026-07-20).
- [ ] Sacar data de prueba ("PRUEBA QA", stats fijas en 50) de lo que ve un usuario real.
- [ ] `crm-tienda` sigue con su pipeline propio en vez del compartido de crm-common.js.

---

## MIGRACIONES YA CORRIDAS (no volver a correr)

match_format, group_size, double_round, playoff_from, matchday, next_match_id, next_slot,
stats_claimed, tournament_sponsors, contact_pref, mvp_home, mvp_away, max_subs,
mostrar_portada/mostrar_compartir/tamano (sponsors), author_identity + user_photo (debates),
creator_identity (comunidades), fan_club (hinchada), skill_level (matches).

## MIGRACIONES PENDIENTES (según lo que se implemente)

```sql
-- P2 disponibilidad: la columna probablemente ya existe (availability_schedule jsonb);
-- verificar con: select column_name from information_schema.columns
--   where table_name='users' and column_name='availability_schedule';

-- P4 partidos recurrentes
alter table public.matches add column if not exists recurring_rule text;   -- ej 'weekly:tue:20:00'
alter table public.matches add column if not exists recurring_parent uuid; -- de qué plantilla salió

-- P5 reserva de lugar en partido
create table if not exists public.match_reservations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null,
  user_email text not null,
  status text default 'pending',        -- pending | confirmed | paid
  checked_in boolean default false,
  created_at timestamptz default now()
);
```

---

## NOTAS TÉCNICAS (no volver a tropezar)

- Los negocios viven en `business_requests`, NO en `users`. Una cuenta = una fila users.
  Para listar complejos/clubes hay que mirar las DOS tablas y unir por email.
- Dos formularios de crear torneo (CRM y módulo): un campo nuevo va en tres lugares.
- El CRM corre en un iframe: para abrir un perfil desde ahí se usa la ventana PADRE
  (`_ventanaConVisor`), no `window.open` (abre otra pestaña).
- `userData.role` es el rol BASE de la cuenta; la identidad activa sale de
  `_activeProfileType()` / `_pubRole()` / `_pubBizId()`. Filtrar SIEMPRE por identidad al
  leer posts, follows, comentarios: el email es de la cuenta, no del rol.
- El perfil PROPIO no pasa por `viewUserProfile` (ese es el público): lo arma
  `renderUserPosts` + el markup estático de index.html.
- Los escudos de club salen de `https://media.api-sports.io/football/teams/<id>.png`
  (CDN estático, NO gasta cupo de API). Los ids están en `canchero-hinchada.js`, verificados.
