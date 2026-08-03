# PLAN MAESTRO — Canchero (2026-07-23, v2 con correcciones de Liga Clandestina)

**Norte / posicionamiento (decidido): ENFOCADO EN JUGAR.**
El corazón de Canchero es *jugar al fútbol amateur*: encontrar y organizar partidos, sumar
stats y subir de nivel. Todo lo demás orbita alrededor de eso. Copy guía sugerido:

> **Canchero — encontrá y organizá tus partidos de fútbol amateur.**

Prioridad general sugerida: (A) bugs que frenan a Liga Clandestina, (B) racha + claridad de nivel,
(C) eliminar Fanático + mover club/comunidades al jugador, (D) home rediseñado, (E) modo invitado.

---

## 0) BUGS / ARREGLOS RÁPIDOS (hacer primero)

- [ ] **Racha no suma (reinicia a 1 cada día).** Causa: faltaba `last_active_date` en la DB → el
      guardado caía a un fallback que perdía la fecha. **Correr** `sql/2026-07-23-racha-columnas.sql`
      (`streak_days`, `streak`, `last_active_date`). Merge ya arreglado en el código.
- [ ] **Icono de racha desaparece del perfil.** Depende de lo anterior. Verificar tras el SQL.
- [x] **Racha aparecía con la sesión cerrada** (v394) — ahora sólo dentro de la app logueada.

## 1) HOME / LANDING (rediseño)

- [x] Sacar la división "Jugador · Fanático · Negocios" — HECHO (v406).
- [x] Accesos: **Jugador** (principal), **Canchas**, **Ligas**, **Tiendas** (Tiendas al final).
      SIN el bloque genérico "Negocio" — HECHO (v406): 4 CTAs directas, Jugador destacado.
- [x] Debajo del título, **breve resumen de cada uno** (1 línea) — HECHO (v406): `.fs-btn-desc`.
- [~] Al tocar cada acceso (entrar/registrarse): **explicación + onboarding propio de ese rol** —
      PARCIAL: cada CTA llama a `_showLoginModal('<role>')` que muestra la ficha de ese rol.
      Falta un onboarding guiado al 1er ingreso de Canchas/Ligas/Tiendas (ver punto 3).
- [x] **"Qué es Canchero"** en el home, bien diseñado (liquid glass, moderno), no texto plano —
      HECHO (v406): section `.home-what-is` con badge, título + acento, 4 cards liquid glass.
- [ ] **Vista PC:** menú de la izquierda con **iconos**, muy moderno (referencia: imagen del usuario,
      reenviar en PNG/JPG — el .avif no se pudo leer).

## 2) ELIMINAR EL ROL FANÁTICO (rescatar lo bueno)

- [~] Eliminar todo lo de Fanático como rol/identidad — FASE 1 HECHA (v408): sacado de
      `ROLES_CONFIG`, del `_showRoleSelectModal` (via ROLES_CONFIG), del hero, del switcher
      de perfiles, de "Buscar Fanáticos" y del type-card de registro. Handlers viejos de
      `hero-btn-fanatico`/`hero-btn-negocio` reemplazados por Canchas/Ligas/Tiendas.
      Falta Fase 2: quitar la pestaña Hinchada del vup para no-migrados y la sección
      "Comunidades" ligada a fanático (o convertirla en tab del jugador).
- [x] **Migrar al perfil de JUGADOR**: elegir el club que te gusta + comunidades — MIGRACIÓN
      AUTO HECHA (v408): `_migrarFanaticoAJugador()` corre al arranque; si hay
      `linked_profiles.fanatico`, copia `fan_club` + `favTeams` al jugador y borra el
      linked. Guarda en DB (columna `fan_club`). Falta UI en perfil jugador para editar
      el club favorito (Fase 2).

## 3) INICIO DE CADA ROL (potenciar — 1ra experiencia)

- [x] **Jugador** (v395): hero arriba del feed (nivel+progreso, racha, partidos cerca, próximo, CTAs).
- [ ] **Canchas:** reservas del día, partidos en sus canchas, CTA cargar cancha/horarios, invitar.
- [ ] **Ligas:** torneos activos, próximos partidos, tabla, CTA crear torneo.
- [ ] **Tiendas:** productos, destacados, CTA cargar producto.
- [ ] Mismo estilo liquid glass y CTAs que guíen a las secciones.

## 4) NIVEL DEL JUGADOR (claridad + diseño)

No queda claro qué nivel sos, por qué, cómo sumás y cuánto. Rehacer moderno/liquid glass y explicar:
- [ ] Tu nivel actual (Principiante/Intermedio/Avanzado/Crack) y qué significa.
- [ ] Por qué estás ahí (valoración = base 50 + lo jugado).
- [ ] Cómo sumás: partido +1, gol +1.5, asistencia +1, MVP +3 (pesos de `canchero-rating.js`).
- [ ] Cuánto te falta para el siguiente nivel y cuánto podés sumar por partido.
- [ ] Desglose visual de dónde salen tus puntos.

## 5) RACHA (animación futbolera)

- [ ] Cambiar el fueguito por una **pelota (verde) prendiéndose fuego**, con el **fuego verde**
      actual y la **misma animación** (flicker + pop). Editar `llama()` en `canchero-racha.js`.

## 6) ONBOARDING GUIADO (real, por rol)

- [x] Tour del jugador (v393/v394): coach-marks liquid glass, termina en "crear tu primer partido".
- [ ] Onboarding equivalente para Canchas/Ligas/Tiendas (guiar a SU primera acción).
- [ ] Dispararlo según cómo se registró la persona.

## 7) MODO INVITADO (tipo TikTok)

- [ ] Explorar Canchero **sin registrarse** (limitado): ver partidos y feed en lectura, CTA a
      registrarse al intentar cualquier acción. Hacerlo sección por sección (mucho código asume `userData`).

## 8) LOOPS DE CRECIMIENTO (invitaciones entre roles)

- [ ] Invitar —sin molestar, según comportamiento— a crear equipo o seguir un club, con onboarding.
- [ ] Que Canchas/Ligas/Tiendas inviten a otros (jugadores, otras canchas/ligas/tiendas).
- [ ] Definir disparadores (cuándo / a quién).

## 9) INFRAESTRUCTURA / EXTERNO

- [ ] **Dominio propio** (canchero.app / .com.uy), apuntado a Vercel. Lo hace el usuario; pasarle pasos.
- [ ] **Seguridad RLS**: blindaje base corrido (auth-only write). Falta afinar por tabla y la policy
      del **chat** (falta nombre/columnas de la tabla de mensajes).

## 10) CORRECCIONES DE LIGA CLANDESTINA (del WhatsApp) — INCORPORADAS

Contexto: es una **liga real de FÚTBOL 8** (8–10 equipos, todos contra todos), 100% celular, que
quiere usar Canchero para gestionar el torneo. Hoy usan copafacil.com (referencia). Lo que más les
importa: **crear torneos** con equipos+jugadores, fechas, resultados, goles, **tarjetas** y tablas,
y armar cruces al azar. Bugs/pedidos que reportó (foto 50 = sus notas; foto 60 = F8; foto 61 =
WhatsApp; videos 59/62/63):

- [x] **B1 — No puede GUARDAR el torneo "por el diseño"** (video 59). HECHO (v397): modal `#modal-torneo` con `max-height:100dvh`, safe-area y anclado arriba en pantallas bajas. El botón crear/guardar del
      form Nuevo Torneo no queda accesible (lo tapa la barra inferior / no scrollea). **CRÍTICO** —
      es justo lo que más quieren usar. Revisar el modal `#modal-torneo` de `crm-organizacion.html`.
- [x] **B2 — Falta FÚTBOL 8** en "TIPO DE FÚTBOL" (solo F5/F7/F11). HECHO (v397): agregado en los tres lugares (CRM crear, módulo crear, módulo editar).
- [x] **F8 FUERA DE TORNEO** (pedido del usuario) — HECHO (v398): Fútbol 8 en crear partido (`cp-ftype-selector` 8v8), crear equipo (`data-modality F8`), editar equipo (modalidad+formación), desafío entre clubes, tipo de cancha, y **motor de formaciones** (`canchero-formations.js`: catálogo `8v8` con 3 formaciones, detección de formato, 16 cupos). `FORMATIONS.F8`, `getSlotsForModality`→16, `calcularTotalPartido`→16. Agregar **Fútbol 8** en los
      TRES lugares de torneo (crear CRM `crm-organizacion.html`, crear módulo `canchero-tournaments.js`
      `openCreateTournament`, y editar). (Ver memoria "dos formularios de torneo".)
- [x] **B3 — "Enviar por WhatsApp" / "Abrir WhatsApp" no funciona** (foto 61). HECHO (v397): `_waNormUY()` normaliza a 598 (comunicado CRM + contacto org en tournaments). El número va sin
      código de país (095639865). Fix: normalizar (prepend 598 si falta) y armar bien el link
      `https://wa.me/<num>?text=...`. Panel Ligas → Enviar comunicado.
- [x] **B4 — "Ver ligas" queda cargando indefinidamente** (spinner infinito). HECHO (v397): `openGlobalDirectory` envuelto en try/catch con estado Reintentar (antes un reject dejaba el spinner para siempre). Bug de carga del
      directorio/listado de ligas.
- [~] **B5 — Perfil de NEGOCIO/LIGA muestra stats de jugador** — HECHO (v398, FALTA VERIFICAR logueado): en mi propio perfil con identidad de negocio activa (`_activeProfileType()==='negocio'`) ahora rutea al perfil de negocio; `viewUserProfile` elige el negocio por `_activeBizId`. Texto original: ("goles, asist, part…") cuando no
      corresponde. Ocultar la UI futbolística en perfiles de negocio (ya hay `_esFan`/biz flags —
      aplicarlo a liga/negocio).
- [x] **B6 — Caja (CRM): pone un ingreso de ejemplo y todo sigue en $0** — HECHO (v399): `crmCajaLoad` cargaba con `.eq('business_email',BIZ_EMAIL)` (exacto/case-sensitive) pero los ingresos auto de inscripciones se insertan con `organizer_email` (casing distinto) → no aparecían y total $0. Ahora `.ilike` + insert manual en minúsculas. Texto original:
- [ ] ~~orig~~ **B6 — Caja (CRM): pone un ingreso de ejemplo y todo sigue en $0** / no encuentra dónde quedó
      (nota 4 + video 63). Bug: los ingresos no se reflejan en el total/otro lado. Revisar caja del CRM.
- [x] **B7 — Cambio de rol confuso / se cambia solo a jugador** — HECHO (v404): `_syncRolesFromDb` sobreescribía el rol activo local con lo que trajera la DB. Si el save previo a DB falló (RLS/red) y el usuario cambió a negocio localmente, el próximo sync devolvía la app a "jugador" solo. Ahora **el sync NO pisa una identidad no-jugador con "jugador"**, y fuerza reguardar el local a DB para sincronizarlos. Falta B7-B (UI: hacer más obvio el botón de cambio de rol). Texto original:
- [ ] ~~orig~~ **B7 — Cambio de rol confuso / se cambia solo a jugador y no encuentra cómo volver a liga**
      (recurrente, nota 5 + msg). El botón de cambiar rol de arriba no es claro y a veces cambia solo.
      Hacerlo obvio y estable. (Relacionado con el rediseño de roles y con la sesión que expira.)
- [x] **B8 — Notificación "te siguió" con un nombre pero el perfil decía otro** — HECHO (v404): `follow()` silenciaba TODOS los errores (incluidos RLS reales) → el follow "no se concretaba" sin aviso. Ahora avisa por toast (excepto duplicados). Y la notif del follower ahora **etiqueta la identidad** ("El Sur FC (Ligas) ahora te sigue"), así el receptor entiende por qué al abrir el perfil ve el nombre base. Texto original:
- [ ] ~~orig~~ **B8 — Notificación "te siguió" con un nombre pero el perfil decía otro; no dejaba seguir ni
      aparecía en seguidores** (video 62). Bug follows/notificaciones: nombre/identidad no coinciden
      y el follow no se concreta.
- [x] **B9 — No puede sacar/cambiar la posición de jugador** — HECHO Y VERIFICADO EN VIVO (v400). OJO: el fix v398 fue al modal equivocado (`edit-info-modal`/`eif-pos`, camino muerto). El real es `edit-profile-modal` (`#edit-pos` en index.html, códigos POR/DC): (1) rellenado ya no fuerza `|| 'DC'`, (2) guardado escribe `pos` Y `position` respetando vacío, (3) opción "Sin definir" agregada, (4) display `info-pos` mapea código→label y cae a "—". Ver memoria [[canchero-dos-modales-editar-perfil]]. Texto original:
- [ ] ~~orig~~ **B9 — No puede sacar/cambiar la posición de jugador** (queda en "delantero"). Menor, pero
      arreglar el selector de posición para que se pueda cambiar/vaciar.
- [x] **B10 — Torneos, funciones que valoran** — TARJETAS YA ESTABAN: el editor de stats por jugador tiene amarillas/rojas (`ctep-yellow`, `ctep-red`, campos `yellow_cards`/`red_cards`), la ficha del jugador las muestra (canchero-tournaments.js:283), y suman al perfil global (`_bumpUserStats`). Cruces al azar ya funcionan (seeding aleatorio en generación de brackets). Todo lo demás (equipos+jugadores, fechas, resultados, goles, tablas) ya operativo.
- [x] **B11 — Login/sesión se cierra solo** — HECHO (v399): `restoreSession` borraba `canchero_user`
      y avisaba "sesión expiró" apenas `getSession()` devolvía null (token vencido pre-refresh o
      hipo de red al arrancar). Ahora si hay sesión guardada intenta `refreshSession()` (hasta 2x
      con re-check) antes de rendirse. Verificado: recarga logueada sigue en sesión.

### Orden sugerido para Liga Clandestina (quick wins primero)
1. B2 (F8) + B3 (WhatsApp) — rápidos y desbloquean su uso.
2. B1 (guardar torneo) + B4 (ver ligas colgado) — críticos del flujo de torneos.
3. B5, B6, B7, B8, B9 — bugs de perfil/caja/roles/follows.
4. B10 (tarjetas), B11 (sesión).

---

## 11) PEDIDOS 2026-08-01 (feedback en vivo del usuario)

Hechos (deploy v409–v411):
- [x] Home SIN scroll otra vez, con **tagline social + contador de jugadores** (query count a users). El bloque "¿Qué es Canchero?" se ocultó (no se veía).
- [x] **Racha: pelota rediseñada** (v3, pelota clásica blanca+pentágonos+aro lima con llama degradé). La anterior se veía fea.
- [x] **Eliminar juego Tiros Libres**; agregar **Trivia** y **Modo Carrera** como tarjetas "Próximamente" (teaser).
- [x] **Borrar debates** Maradona vs Pelé y Mbappé vs Haaland (de seed + de DB + filtro).
- [x] **Torneo: cargar goles/asistencias/tarjetas SIN iniciar el cronómetro** (botones ya no se deshabilitan con crono sin empezar).
- [x] **Modal de roles: botón "+" por grupo** para crear otro rol del mismo tipo; sacadas las 3 filas grandes "Registrar mi X".

Pendientes (de este feedback):
- [ ] **Panel organización**: a veces abajo se ve como si estuviera en Inicio (fuga de layout entre #view-admin/CRM y el feed del jugador). Investigar z-index/display al cambiar de tab.
- [ ] **Ranking del torneo con PODIO** como el ranking normal de Canchero (visualmente lindo). Reusar el componente de `generateRankingHTML`/ranking global.
- [ ] **Fotos de jugadores que no se ven en los juegos** (avatar fallback / URL rota).
- [ ] **Doble "Liga Clandestina"** en directorio de Ligas; una de ellas abre un **perfil de jugador** (dedupe + routing al perfil de negocio correcto).
- [ ] **Seguidores no suben** al seguir una liga/otros roles (contar follows por identidad; revisar `following_profile` tag y el count del perfil).
- [ ] **Portadas (foto, no solo icono)**: cambiar portada de Debates y de Juegos; agregar portada a secciones de Partido y de Buscar (todas con imagen).
- [ ] **JUEGO Trivia** (tipo Preguntados de fútbol): preguntas con fotos de escudos y jugadores, niveles y ranking. GRANDE — sesión dedicada.
- [ ] **JUEGO Modo Carrera** (tipo Copero pero más adictivo): arranca en fútbol amateur/potrero, ojeador/video, elegir club/país/nombre/nº/posición; dinero, fichajes, subir de edad por temporada, títulos; decisiones futbolísticas + económicas + sociales, basadas indirectamente en vidas de jugadores reales; simple y adictivo; PC + celular. MUY GRANDE — sesión dedicada, probablemente módulo `canchero-carrera.js` nuevo.

## Recordatorio de deploy (ACTUALIZADO 2026-08-01)
- **Deploy ahora es por GitHub**: repo `github.com/efraingusman/cancherofutbolapp`. Cada `git push` a `main` deploya solo en Vercel (cuenta de joelviettro). URL: **cancherofutbolapp.vercel.app**.
- Al tocar js/css: subir `?v=` en el HTML y `CACHE_NAME` en `sw.js`.
- Verificar en prod con `curl` a cancherofutbolapp.vercel.app.
- El Vercel viejo (canchero-app.vercel.app, cuenta neurovidstudioia) quedó pausado — NO usar.
- Supabase Auth: Site URL + Redirect URLs deben apuntar a cancherofutbolapp.vercel.app (ya corregido por el usuario).
