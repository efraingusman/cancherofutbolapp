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

- [x] **Selector de nivel al CREAR un partido** (v376) — `<select id="cp-nivel">` en el form
      (index.html) → `skill_level` en el insert de `createOpenMatchAction` (script.js). "Cualquier
      nivel" = null (aparece en todas las búsquedas). Migración `sql/2026-07-21-nivel-partidos.sql`
      ya existía; el insert degrada solo si la columna falta.
- [x] **Botón "Balancear equipos"** (v377) — en el panel de jugadores (`canchero-match-players.js`,
      `balancearEquipos`), visible para el organizador. Reparte parejo por valoración
      (`users.stats.rating`, base 50) con reparto greedy al equipo de menor suma, respetando cupo
      y **anclando los dos capitanes** a su equipo. Persiste solo los que cambian de equipo.
- [x] **Sugerencia de jugadores** (v378) — al abrir "Invitar jugador" (`_suggestPlayers` en
      `canchero-match-players.js`) se muestran hasta 8 sugeridos ordenados por: cubrir una
      posición faltante del equipo (ARQ/DEF/MED/DEL, bonus grande) + cercanía al nivel del
      partido (`skill_level`, o valoración del organizador). Prioriza misma ciudad. Al escribir
      un nombre pasa a la búsqueda normal; al borrar vuelve a los sugeridos.

## VARIOS (pedidos sueltos)

- [x] **4to botón (Hinchada) en el perfil de OTRO fanático** (v379) — el vup (`viewUserProfile`
      en `script.js`) mostraba solo 3 tabs para fans (posts/info/fans). Se agregó la tab Hinchada
      (escudo) + sección con el club del que es hincha (de `u.fan_club`, vía `CancheroHinchada.clubs`).
- [x] **Comunidades: creador visible + eliminar** (v379) — el detalle muestra "Creada por <nombre>"
      (lookup de `communities.created_by`) y, si soy el creador EN LA IDENTIDAD con la que la creé
      (`created_by` + `creator_identity` === `identidadActiva()`), aparece el botón papelera
      → `C.deleteComunidad` borra posts + members + la comunidad (por si no hay ON DELETE CASCADE).

## P2 — DISPONIBILIDAD HORARIA (rota, alta prioridad)

Hoy la grilla de disponibilidad del registro se guarda en `userData` local pero la columna
`users.availability_schedule` **se LEE en 3 lugares y no se ESCRIBE en ninguno** → el dato se
pierde al cerrar sesión. El toggle "Disponible" es un booleano suelto sin relación con horarios.

- [x] **Guardar** la disponibilidad de verdad (v380) — grilla editable en "Editar perfil"
      (`edit-availability` + `generateEditAvailabilityGrid`/`toggleEditAvail`, buffer
      `window._editAvailability`). `saveEditProfile` escribe `availability_schedule` en users
      (con fallback si la columna falta). `_autoSyncProfile` sube la del registro si la DB no la tiene.
- [x] **Mostrarla** en la pestaña Info del perfil (v380) — bloque "DISPONIBILIDAD" en `infoHtml`
      del vup, con chips por franja (Mañana/Tarde/Noche) por día.
- [x] **Sugerir partidos** que caen en las franjas del jugador (v381) — badge "EN TU HORARIO"
      en las cards de "Buscar partidos" (`_renderCalMatchCard`) cuando el día+franja del partido
      cae en la disponibilidad del jugador (`_scheduleCoversDate`).
- [x] Equipos que buscan jugadores priorizan disponibles (v381) — en `_suggestPlayers` los
      candidatos disponibles en el día+franja del partido suben (bonus 120) y llevan chip "DISPONIBLE".
- [x] Auto-activar el toggle "Disponible" según franja horaria (v381) — `_autoAvailabilityBySchedule`
      corre tras el login; respeta override manual del día (`canchero_avail_override_<fecha>`).
      Helpers: `_currentSlot`/`_diaSemana`/`_scheduleMatchesNow`/`_scheduleCoversDate`.
- [x] Migración `sql/2026-07-23-disponibilidad.sql` (jsonb `users.availability_schedule`, idempotente).

## CORE JUGADOR — stats/nivel al jugar (v383)

- [x] **Reportar resultado actualiza stats y nivel de verdad** — `submitMatchReport` era un stub
      con `alert`. Ahora guarda marcador+MVP+`status:finished`, suma goles/asist/partido/GR del que
      reporta, +1 partido a los demás confirmados, +1 MVP al jugador nombrado, y recalcula el rating
      con `CancheroRating.calcular` (solo sube). Esto es lo que hacía que "las stats quedaran fijas en 50".

## POSICIONAMIENTO + ONBOARDING (decisión del usuario 2026-07-23)

Decisión: **ENFOCADO EN JUGAR**. El corazón es Jugar (partidos); los demás roles (Fanático,
Canchas, Ligas, Tienda) quedan secundarios. Rename hecho: Complejo→Canchas, Organización→Ligas
(labels visibles; ids internos intactos). Home volvió a su diseño limpio (se sacó el value-prop y
el modal "qué es"). Falta: definir la MISIÓN/copy definitivo y decidir si se achican roles.

- [x] Tour guiado del JUGADOR (v393) — `_startJugadorTour`: coach-marks sobre la barra inferior
      (`.r2-item[data-i]`) Partidos→Inicio→Buscar→Chats→Perfil, una vez (`canchero_tour_jugador`),
      al terminar entra a Partidos. Fanático/negocios siguen con `_showOnboardingGuide` (acciones).
- [ ] Definir misión/copy de Canchero y (si se decide) achicar/esconder roles secundarios.
- [x] Inicio del JUGADOR potenciado (v395) — bloque hero ARRIBA del feed (sin tocarlo):
      saludo + nivel con barra de progreso al siguiente + racha + "N partidos cerca" + tu próximo
      partido + CTAs (Ver partidos / Crear partido). `_renderJugadorInicioHero`, se llama en `loadMainFeed`.
- [ ] Potenciar el inicio de los OTROS roles (fanático, canchas, ligas, tienda) igual que el jugador.
- [ ] Loops de crecimiento: que un rol invite (sin molestar, según comportamiento) a crear otro rol
      (jugador→equipo/fanático) o a invitar a otros (canchas/ligas/tiendas/jugadores).
- [ ] Modo INVITADO tipo TikTok: explorar limitado sin registrarse (grande; requiere que el
      dashboard funcione sin userData → hacerlo con cuidado, sección por sección).

## P4 — EVITAR LA "APP VACÍA"

- [x] **Partidos recurrentes/fijos** (v385) — checkbox "Repetir todas las semanas" (`cp-recurring`)
      en crear partido → `recurring_rule:'weekly'` en el insert. `_regenRecurringMatches` (al login)
      recrea la próxima ocurrencia +7 días cuando la última venció (solo el dueño, idempotente,
      agrupa por `recurring_parent`). Migración `sql/2026-07-23-partidos-recurrentes.sql`.
- [x] **Partidos destacados** (v384) — banda "DESTACADOS" arriba en "Buscar partidos": abiertos con
      lugares libres, prioriza tu ciudad y los más próximos (`_fetchAndRenderCalMatches`).
- [x] Estado vacío con CTA (v384) — "No hay partidos en <ciudad>" + botón "Crear un partido"
      (y "Ver todos los próximos" si estabas filtrando un día).

## P5 — RESERVA + PAGO

Ya existe `payment_status` / `payment_link` / comprobantes en torneos. Falta el ciclo de partido:

- [x] Reservar un lugar con estado (v386) — unirse crea `match_players.status='pendiente'` + notifica.
      El organizador ve cada convocado con badge (PENDIENTE/CONFIRMADO/PAGADO) y botones:
      confirmar (`_confirmMatchPlayer`), marcar pagado si el partido tiene precio (`_toggleMatchPaid`,
      efectivo/transfer, sin pasarela) y quitar (`_rejectMatchPlayer`). Sin migración (RLS ya permite).
- [ ] Integración de pago (Mercado Pago) — **POSPUESTO por pedido del usuario (2026-07-23)**. La
      arquitectura de estados ya soporta 'pagado'; falta solo la pasarela.
- [x] Check-in "llegué" (ya existía, `_doMatchCheckin`) — se muestra "✓ LLEGÓ" en cada convocado.

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

- [x] Primera pregunta al registrarse (v388) — `_showRoleSelectModal('registrarse')` ahora muestra
      "¿Qué querés hacer?" con JUGAR como card destacada grande (borde/acento, "Empezar a jugar",
      "Gratis · listo en 2 min") y el resto (Fanático/Complejo/Organización/Tienda) abajo en "O TAMBIÉN".
      El modo "entrar" queda igual (lista "¿Quién sos?").
- [~] Flujo mínimo jugador: la entrada ya prioriza Jugar; el registro sigue con sus pasos
      (carta/posición/disponibilidad). Acortarlo a <2 min real es una optimización aparte pendiente.
- [x] Guía de bienvenida por rol (v389) — `_showOnboardingGuide(role)` tras registrarse: acciones
      concretas del rol (jugador: buscar/crear partido, disponibilidad; fanático: cuadro/comunidades/
      debates; negocios: perfil/torneo/productos). Una vez por rol (`canchero_guia_<rol>`). Solo iconos.

## RACHA / SHARE (v389)

- [x] Compartir racha = solo IMAGEN moderna (se sacó "copiar texto"), en modal CENTRADO por encima
      de la racha, con 3 destinos que llevan la imagen: Publicar en el inicio (post con media),
      Enviar por chat (`social.sharePost`), y WhatsApp/redes (`navigator.share` con archivo).
- [x] La hoja "Compartir" (`CancheroHinchada.compartir`) ahora sale CENTRADA (antes bottom-sheet)
      y con z-index alto para verse sobre otros modales.

## P6 — LIGAS EXTERNAS — DESCARTADO

El usuario decidió NO hacerlo. El plan gratis de API-Football no da partidos actuales (solo
temporadas 2022-2024), por eso quedó bloqueado. Las noticias sí funcionan (RSS, gratis).

## LIMPIEZA (P6 del prompt original)

- [ ] Juegos embebidos de terceros: **el usuario pidió NO tocar por ahora** (2026-07-20).
- [x] Ocultar cuentas de PRUEBA/QA (v387) — helper `window._esCuentaPrueba` (conservador:
      "PRUEBA QA", nombres/emails que empiezan con test/qa/prueba/demo) aplicado en directorio de
      jugadores, "buscar disponibles", `loadDisponibles` y sugeridos de invitar. No borra nada de
      la DB (no hay acceso) — solo las esconde de lo que ve un usuario real. Lo de "stats fijas en 50"
      ya quedó resuelto de raíz con el reporte de partido (v383): las stats ahora se mueven al jugar.
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
