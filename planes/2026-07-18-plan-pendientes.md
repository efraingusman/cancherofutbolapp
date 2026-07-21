# PLAN — pendientes de Canchero (al 2026-07-18)

**Estado:** deploy v347. Todo lo de abajo está SIN hacer salvo que diga lo contrario.

**Reglas fijas:** gratis también para negocios · sin emojis, siempre iconos · liquid glass ·
tiene que verse bien en celular y PC · al tocar style.css / script.js / canchero-*.js bumpear
su `?v=` en los HTML que lo cargan y subir `CACHE_NAME` en sw.js · verificar que la columna
EXISTE antes de insertarla.

---

## P0 — FIXTURE — HECHO (deploy v350, 2026-07-20)

P0 completo, más allá del plan original:
- Copa = grupos + playoffs de verdad: se elige desde dónde arrancan (16avos → final) y los
  cruces se completan solos con los clasificados al cerrarse la fase de grupos.
- Ningún cruce de primera llave enfrenta a dos del mismo grupo.
- Agregar partido suelto al fixture; podio 1-2-3 en goleadores/asistidores/arqueros (esto
  era P4, quedó hecho).
- Tipo de fútbol, máx. equipos, equipos por grupo y playoffs también en el formulario del
  **CRM de organización**, que es OTRO formulario distinto al del módulo.
- Invitar a Canchero (`invitacion.html`) + traspaso automático de datos al registrarse, con
  las stats del torneo sumando al ranking general de Buscar.

**Falta correr `sql/2026-07-20-fixture-p0.sql` en Supabase.** Sin esa migración el código
funciona igual (reintenta sin las columnas nuevas), pero no hay numeración de fechas,
avance automático del ganador, playoffs configurables ni traspaso de stats al registrarse.


**Diagnóstico:** el motor YA soporta más de lo que se puede elegir.
`tournaments` ya tiene las columnas `format`, `double_round`, `prize_pool`, `complex_email`,
`venue`, `entry_fee`. `_generateFixture()` ya implementa:
- `format='groups'` → grupos de 4 + round-robin interno
- `format='league'` → todos contra todos
- `double_round` → agrega la vuelta (`_reverseMatches`)

**El problema real:** `double_round` NO se expone en NINGUNA pantalla (solo se lee), y el
formato se elige únicamente al CREAR el torneo, no al editarlo. Con 3 equipos en
`format='elimination'` sale 1 solo partido — que es exactamente lo reportado.

### P0.1 Exponer las opciones que ya existen
- [x] Checkbox **Ida y vuelta** (`double_round`) en crear Y editar torneo.
- [x] Poder **cambiar el formato** desde editar torneo (hoy solo al crear).
- [x] Al generar fixture, **modal de confirmación** que muestre: formato, ida/vuelta,
      cantidad de equipos y **cuántos partidos van a salir**, antes de crear nada.

### P0.2 Completar el motor
- [x] **Eliminación directa** con bracket real (hoy `elimination` cae al `else` genérico).
- [x] **Tamaño de grupo configurable** (hoy fijo en 4).
- [x] **Número de fechas** y **descansos** (equipo libre) cuando son impares.
- [x] **Editar un cruce** a mano después de generado.
- [x] **Regenerar** fixture pisando el anterior (con aviso de que se pierden resultados).

### P0.3 Tipo de fútbol
- [x] Campo **fútbol 5 / 7 / 11** en el torneo (NO existe columna → migración
      `alter table tournaments add column if not exists match_format text`).
- [x] Que ajuste el default de jugadores por equipo y la cancha en la ficha.

---

## P1 — VISTA PÚBLICA DEL TORNEO — HECHO (v351)

Todo esto vive en la nueva pestaña **Info**, visible en la vista pública y en el panel
de gestión.

- [x] **Premio** visible, destacado con trofeo, más si la inscripción es paga o gratis.
- [x] **Sponsors del torneo** con logo, nombre y link. Sin límite y gratis. Tabla nueva
      `tournament_sponsors` → `sql/2026-07-20-sponsors-p1.sql`.
- [x] **Inscribir mi equipo**: lista los equipos que el usuario ya tiene en Canchero
      (creados o capitaneados), se elige uno y se anota con escudo y `club_id`; o se carga
      uno suelto. No re-ofrece los ya anotados.
- [x] **Contactar a la organización**: chat de Canchero o WhatsApp, a elección. El número
      sale de `business_requests.whatsapp` con respaldo en `users.whatsapp_number`.

Queda de P2 el campo de WhatsApp **por rubro** y el pipeline del CRM.

---

## P2 — CONTACTO Y NEGOCIOS

- [ ] **WhatsApp del negocio**: campo en el perfil de negocio + elegir canal preferido
      (chat de Canchero o WhatsApp). Aplica a todos los rubros, no solo torneos.
- [ ] **Pipeline en el CRM** de todos los negocios (hoy no existe): etapas, arrastrar
      tarjetas, y que se alimente de `business_orders` y de las solicitudes.

---

## P3 — MVP DEL PARTIDO

- [ ] **MVP por equipo** en cada partido del torneo (local y visitante).
- [ ] **Sugerencia automática** por estadísticas del propio partido: goles, asistencias,
      y valla invicta para el arquero. Se sugiere, se puede cambiar a mano.
- [ ] Ranking de MVP en el torneo (hoy la vista avisa que falta el dato).
- [ ] Requiere migración: `alter table tournament_matches add column if not exists mvp_home text`
      y `mvp_away text` (o una tabla de votos si se quiere votación).

---

## P4 — RANKING VISUAL DEL TORNEO — HECHO (v350)

- [x] Podio 1-2-3 con medallas y avatares grandes en el torneo.
- [x] Aplicado a goleadores, asistidores y arqueros.

---

## P5 — CANCHAS Y SEDES

- [ ] En editar torneo, elegir un **complejo registrado** (`complex_email` ya existe) y
      además la **cancha específica** dentro de ese complejo.
- [ ] Que el selector de cancha del partido use las canchas de ese complejo.

---

## P6 — LIGAS EXTERNAS (Champions, Libertadores, etc.)

**BLOQUEADO por la fuente de datos.** Verificado el 2026-07-18: la API gratuita de
TheSportsDB (key `3`, la que usa el módulo del Mundial) devuelve datos incorrectos para
clubes — al pedir los equipos de Champions contesta con equipos de la Championship inglesa,
y `eventsseason` trae 5 partidos en vez de ~180. Libertadores, Sudamericana, uruguayo,
argentino y español no figuran.

La sección Mundial se retiró (v345). El módulo `canchero-mundial.js` queda en el repo: para
reactivarlo alcanza con descomentar su `<script>` en index.html y reponer los accesos.

Opciones (decisión del usuario):
1. **TheSportsDB Patreon** (~USD 3-9/mes) — el módulo del Mundial se reusa casi tal cual.
2. **football-data.org** (gratis con límite) — Champions, Premier, La Liga, Serie A,
   Bundesliga, Brasileirão. NO tiene Libertadores ni uruguayo ni argentino.
3. **API-Football** (gratis 100 req/día) — tiene todo, incluida Libertadores y el uruguayo.
   Obliga a cachear en Supabase.

---

## MIGRACIONES PENDIENTES

```sql
-- P0.3 tipo de futbol
alter table public.tournaments add column if not exists match_format text;

-- P3 MVP por equipo
alter table public.tournament_matches add column if not exists mvp_home text;
alter table public.tournament_matches add column if not exists mvp_away text;

-- P1 sponsors del torneo
create table if not exists public.tournament_sponsors (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null,
  name text not null,
  logo_url text,
  link text,
  orden int default 0,
  created_at timestamptz default now()
);

-- Opcional: pais de jugadores cargados a mano (para la banderita)
alter table public.tournament_players add column if not exists nationality text;
```

---

## SIN CONFIRMAR POR EL USUARIO

- **Eliminar partidos de "Mis partidos"** (v340): se limpiaron las 17 tablas dependientes y
  el chat de grupo, y el DELETE ahora verifica con `.select()` en vez de avisar un falso
  éxito. Falta que el usuario pruebe y diga qué mensaje sale. Si dice "la base rechazó el
  borrado (permisos)" → es RLS y hay que agregar policy de DELETE en Supabase.
- **Perfil de negocio sin fila en users** (v347): ya no da "Usuario no encontrado", pero no
  se pudo confirmar con mock que muestre el nombre. Probar con "Liga Clandestina".

---

## NOTAS TÉCNICAS (no volver a tropezar)

- `userData` (let) y `window.userData` son DOS variables que se sincronizan a mano.
- Los negocios viven en `business_requests`, NO en `users`. Una cuenta = una fila en users.
  La fila users con rol de negocio es un FANTASMA (pasó con `role='tienda'`).
- El perfil de un negocio debe tomar el ROL del negocio elegido, no de `users.role`.
- Identidad activa: `_activeBiz()` → `_pubRole()` / `_pubBizId()` / `_pubAvatar()`.
- Chats: una bandeja por identidad — `jugador` / `fanatico` / `team:<id>` / `biz:<id>`.
  Los grupos de partido son del jugador; el chat de plantilla, del equipo.
- Exports del motor de torneos: van en el `return {}` del IIFE, asignar a
  `window.CancheroTournaments.X` se pierde.
- Jerarquía de z-index: ctm 99999 < cmd 100004 < cti 100008 < cmdlive 100009 <
  editores 100010 < share 100011 < asistencia del editor 100012. El overlay de perfil
  (`vup-modal-overlay`) vive en 900: para abrirlo sobre el torneo hay que elevarlo.
- Filtro de país: si el registro NO declara país, se MUESTRA. Exigir coincidencia dejaba
  todos los directorios vacíos.
- Antes de crear una función nueva, revisar que el nombre no exista ya en el módulo
  (pasó con `_cmeAddPlayer`).
