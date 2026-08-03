# PLAN DE PENDIENTES — Canchero (2026-08-02)

Estado vivo: **cancherofutbolapp.vercel.app** (v414). Este documento junta TODO lo que
falta, ordenado por prioridad, con notas de implementación y cómo deployar.

---

## 0) CÓMO DEPLOYAR (leer primero)

- **Repo GitHub**: `github.com/efraingusman/cancherofutbolapp`. Deploy AUTOMÁTICO: cada
  `git push` a `main` dispara un deploy en Vercel (cuenta **joelviettro**).
- **URL de producción**: `https://cancherofutbolapp.vercel.app`.
- **Código real**: raíz de `C:\Users\Cliente\Downloads\espacio-de-trabajo-claude - copia\salidas\canchero app`.
  (NO usar `C:\Users\Cliente\Documents\canchero app` — es copia vieja. NO usar el Vercel
  viejo `canchero-app.vercel.app` — cuenta neurovidstudioia, pausado.)
- **Al tocar JS/CSS**: subir el `?v=` de ese archivo en `index.html` Y `CACHE_NAME` en `sw.js`
  (si no, el Service Worker sirve la versión cacheada).
- **Verificar en prod**: `curl -s https://cancherofutbolapp.vercel.app/sw.js | grep CACHE_NAME`
  y `curl` al archivo con su `?v=`.
- **Push con token** (el remoto quedó sin token por seguridad): usar
  `git push https://efraingusman:<TOKEN>@github.com/efraingusman/cancherofutbolapp.git main`.
  Pedir al usuario un token nuevo cuando haga falta (revocar el viejo).
- **Supabase Auth**: Site URL + Redirect URLs ya apuntan a cancherofutbolapp.vercel.app.
- **Verificación logueada**: la extensión de Chrome bloquea el dominio nuevo → pedir al
  usuario que confirme visualmente, o probar en el navegador del usuario.

---

## 1) INSIGHT CLAVE — mensaje de Liga Clandestina (2026-08-02)

La liga dijo textualmente que **lo más esencial es la parte del campeonato**: que figuren
los **cruces (fixture), la tabla y los datos del torneo**. Y remarcó: *"para un jugador de
la liga, tener a la vista esos datos también debe ser lo más importante, porque difícilmente
si ya está en nuestra liga ande buscando equipo o partidos"*.

**Conclusión de producto:** un jugador que YA pertenece a una liga no necesita el home
genérico de "buscar partidos/equipos". Su inicio debería mostrar **el estado de SU torneo**:
próxima fecha, sus cruces, la tabla y sus resultados.

- [x] **Home contextual para jugadores de liga** — HECHO (v415): bloque "TU LIGA" en el hero
      del inicio (`_renderInicioHero`). Si el jugador está en un torneo activo muestra próximo
      cruce, últimos resultados y tabla (top 4, su equipo resaltado) + botón "Ver mi torneo"
      (`openPublicView`). Detecta por `tournament_players.player_email == userData.email`.
- [ ] **Priorizar campeonato en el panel de Ligas** (organizador): dejar fixture + tabla +
      resultados como lo primero y más accesible (ya existen; asegurar jerarquía visual).

---

## 2) RACHA — darle sentido más allá del uso diario

Hoy `_updateDailyStreak` (script.js) suma +1 por **abrir la app** cada día. El usuario quiere
que la racha signifique algo más.

- [x] Pelota rediseñada (v4) al estilo del logo (verde con gajos negros + llama).
- [ ] **Racha por ACTIVIDAD, no solo por abrir**: contar el día como "cumplido" cuando el
      jugador hace algo real (crear/unirse a un partido, cargar un resultado, jugar, postear,
      cargar stats). Mantener el bonus de continuidad (días seguidos).
- [ ] **Recompensas por hitos** (3/7/15/30/50/100): dar XP/puntos, un badge y quizás un ítem
      cosmético; mostrar en la pantalla de racha "qué ganás por seguir". Engancha (Duolingo).
- [ ] Mostrar en el perfil qué desbloqueó la racha (no solo el número).

---

## 3) JUEGOS

- [x] Eliminado "Tiros Libres".
- [x] Portadas reales de los 6 juegos (img/games/*.png).
- [ ] **Optimizar peso** de las portadas (hoy ~2MB c/u; pasar a webp/comprimir <300KB).
- [ ] **Fotos de jugadores que no cargan en un juego** — el usuario reportó que en "el juego"
      hay jugadores sin foto. `once-ideal` ya tiene fallback de iniciales. FALTA que el
      usuario diga EN QUÉ juego (Adivina / Más o Menos / etc.) para el fix exacto.

### 3.a) JUEGO NUEVO — Trivia Futbolera (tipo Preguntados) — HECHO (v417)
- [x] `canchero-trivia.js`: 36 preguntas (texto + escudos de img/clubs + banderas flagcdn),
      dificultad creciente (4 fáciles + 3 medias + 3 difíciles), timer 15s con bonus de
      velocidad y racha, resultado con récord, ranking con podio.
- [x] Ranking en Supabase (`trivia_scores`, mejor puntaje por email). **FALTA CORRER EL SQL**:
      `sql/2026-08-02-trivia-scores.sql` en el editor SQL de Supabase (sin eso el juego se juega
      igual pero no guarda ranking).
- [ ] AMPLIAR: más preguntas, categorías, fotos de jugadores (cuando haya set de fotos), duelo 1v1.

### 3.b) JUEGO NUEVO — Modo Carrera — V2 estilo Copero HECHO (v421)
- [x] Pantalla de IDENTIDAD (camiseta SVG con apellido+número, color por país; pierna hábil;
      nacionalidad con banderas y buscador; POSICIÓN en la cancha con las 12 posiciones).
- [x] DURACIÓN de carrera (10/15/20/25 años). Clubes de ligas del mundo (ARG, BRA, ESP, ING,
      ITA, FRA, ALE, POR, MEX, MLS, Saudi, Primera UY) + INTERIOR de Uruguay. Oferta de cantera.
- [x] HUB con puntaje "NIVEL" (renombrado del OVR), valor de mercado, línea de tiempo por edad,
      PJ/GLS/AST, títulos. Simulación de temporadas, transferencias a clubes mejores, decisiones.
- [ ] AMPLIAR: guardado en Supabase (career_saves) cross-device, escudos reales, selección
      nacional/mundiales, ranking de carreras, más eventos y ramificaciones.
- [x] `canchero-carrera.js`: crear jugador (nombre/país/posición/número), arranca en el
      potrero, banco de eventos con decisiones futbolísticas/económicas/sociales y
      consecuencias, temporadas (envejece), ascenso de tier (Amateur→Leyenda), dinero,
      títulos, moral/fama/habilidad, retiro/leyenda. Guardado local (continuar partida).
- [ ] AMPLIAR: más eventos, transferencias con elección de club real-ish, guardado en
      Supabase (career_saves) para cross-device, ranking de carreras, más ramificaciones.
Portada lista (`img/games/carrera.webp`).
- [ ] **Arranque desde lo amateur**: club de barrio / fútbol callejero; te descubre un
      ojeador o por un video subido. De ahí escalar (regional → profesional → internacional →
      elite → leyenda), o no, según decisiones.
- [ ] **Crear jugador**: club, país, nombre, número, posición.
- [ ] **Economía**: generar dinero, fichar a otros clubes, subir de edad por temporada,
      ganar títulos.
- [ ] **Decisiones** futbolísticas + económicas + **sociales**, con ramificaciones; basadas
      INDIRECTAMENTE en vidas de jugadores reales (eventos inspirados, sin nombres reales).
- [ ] **Adictivo, simple y para todos** (guste o no el fútbol). Bueno en PC y celular.
- [ ] Guardado de carrera en Supabase (tabla `career_saves`), continuar partida.
- [ ] Módulo nuevo `canchero-carrera.js`, exponer `window._carreraStart`.
- Nota: es el más grande; conviene MVP jugable (5-6 temporadas, set de eventos) y luego ampliar.

---

## 4) HOME / LANDING

- [x] Sin scroll, 4 accesos (Jugador/Canchas/Ligas/Tiendas), tagline social + contador de jugadores.
- [ ] **Vista PC**: menú lateral izquierdo con iconos, moderno (falta imagen de referencia
      del usuario en PNG/JPG — el .avif no se pudo leer).
- [ ] Onboarding propio por rol al primer ingreso (Canchas/Ligas/Tiendas) — el de Jugador ya está.

---

## 5) FANÁTICO (Fase 2)

- [x] Fase 1: sacado de roles/hero/switcher/registro + migración auto a Jugador.
- [ ] UI en el perfil de Jugador para elegir/editar **club favorito** (hoy se migra el dato
      pero no hay editor visible).
- [ ] Quitar la pestaña "Hinchada" del vup para cuentas ya migradas (o convertirla en algo
      del jugador). Revisar `CancheroComunidades` como tab del jugador.

---

## 6) BUGS / UI PENDIENTES (feedback 2026-08-01/02)

- [ ] **Panel organización**: a veces abajo se ve como si estuviera en Inicio (fuga de
      layout). FALTA REPRO: ¿siempre o al cambiar de una pestaña puntual? ¿PC o celular?
- [x] **Portadas con foto** en Buscar y Partidos — HECHO (v416): cards `.buscar-card.has-cover`
      + banner `.desafiar-cover` con foto de fondo + degradado (img/covers/*). FALTA la de Debates.
- [ ] **Portada de Debates** (cambiarla). Y OPTIMIZAR: las portadas (juegos+covers) pesan ~2MB
      c/u; pasar a webp/comprimir para bajar egress y acelerar carga de Buscar/Partidos.
- [x] **Header siempre visible** en torneos/partidos — HECHO (v416): los overlays de torneo/
      partido ahora van por debajo del nav (que queda fijo con logo/switcher/campana/ajustes).
- [x] **Botones del home** más chicos, entran los 4 + tagline sin cortar (celular y PC) — v416.
- [x] Ranking del torneo con podio (v412).
- [x] Seguidores no suben (v412). / Doble Liga Clandestina (v413). / Cargar eventos sin
      cronómetro (v410). / Modal roles con "+" (v411).

---

## 7) YA HECHO (histórico reciente, para no repetir)

v397–v414: F8 en torneo + fuera de torneo, WhatsApp, guardar torneo, ver ligas, caja CRM,
posición perfil, sesión que se cierra, perfil de negocio con stats de jugador, seguridad
admin (gate en HTMLs + remoción de #view-admin), B7 rol se cambia solo + switcher visible,
B8 follows, home rediseño + sin scroll + contador, racha pelota v4, eliminar Fanático Fase 1,
eliminar Tiros Libres + Trivia/Carrera "próximamente", borrar debates Maradona/Mbappé,
podio torneo, seguidores, doble liga, portadas de juegos, migración de Vercel a GitHub +
cuenta joelviettro.

---

## Orden sugerido para retomar
1. **Home contextual de liga** (insight #1) — es lo que más pidió la liga real.
2. **Portadas** de Debates/Partido/Buscar (rápido, visual).
3. **Trivia** (juego jugable, alcance acotado).
4. **Modo Carrera** (MVP, el más grande).
5. Racha por actividad + recompensas.
6. Vista PC + Fanático Fase 2 + panel organización (repro).

---

# ADDENDUM 2026-08-02 (tarde) — Pedidos nuevos del usuario

## A) QUICK WINS / BUGS (prioridad)
- [ ] Home: cambiar "X jugadores" por **usuarios registrados / perfiles creados**.
- [ ] Home: botones **más chicos y menos largos**; texto "qué es Canchero" **mejor y un poco más grande**.
- [ ] **Header (logo/switcher/campana/ajustes) un poco más abajo** en TODOS lados donde aparece.
- [ ] **Header visible en los JUEGOS** (y en celular) — igual que en torneos.
- [ ] **Nav barra inferior**: sigue marcando mal la sección (persistente). Revisar a fondo.
- [ ] **Ligas: Liga Clandestina DUPLICADA**; una de las dos da ERROR al entrar. Deduplicar + arreglar.
- [ ] Popup **"activar notificaciones"** NO debe salir en el home (sin login) ni **más de una vez**.
- [ ] **Campana de notificaciones**: que funcionen y **dirijan bien** a donde corresponde.
- [ ] **Registro por rol**: si me registro/entro como tienda/jugador/cancha/liga, crear **SOLO ese
      perfil** (no jugador por defecto) y **entrar en ese rol**.
- [ ] Switcher de rol: "añadir equipo" con **signo +** al lado (como los otros), no bloque abajo.
- [ ] **Google OAuth**: no exponer el proyecto Supabase (dofbxgqz...supabase.co) en la pantalla de
      consentimiento → requiere **custom domain de Supabase Auth** (config del dashboard, no código).

## B) MODO INVITADO (importante)
- [ ] Entrar **sin registrarse** a ver TODO (confianza). Al querer acción → registro.
- [ ] Sección PERFIL sin registro: mostrar **candado**, en gris, bien redactado
      ("Creá tu perfil para desbloquear tus stats, equipos y logros"), con CTA a registrarse.

## C) JUEGO "CANCHERO LEYENDA" (renombrar Modo Carrera) — REBUILD grande
- [ ] Renombrar a **Canchero Leyenda**. Narrar la historia del jugador (dinámico, no aburrido).
- [ ] **Escudos REALES** de cada club (no bloques de color). Trofeos REALES por liga/competición (png/icono).
- [ ] **Camiseta mucho mejor** (se ve fea); colores fieles al país/club.
- [ ] **Lógica de origen**: elegir país + **ciudad de origen**, y ciudad/país donde EMPIEZA (ej: un tío
      te lleva a probarte a otro país). Clubes amateur **del país/ciudad que corresponde** (un brasileño
      NO empieza en Salto). Nada de pases ilógicos sin justificación.
- [ ] **Pacing configurable**: temporada a temporada, o por etapas (cada 2 / 4 años).
- [ ] **Selección nacional**: citaciones, competiciones, impacto en clubes y valor de mercado. Jugar en
      la selección de mi ciudad. Ojeadores que me ven (bien/mal) y afectan la carrera.
- [ ] **Decisiones ricas** con IMAGEN cada una (futbolística, social, familiar, económica, prensa,
      representante, técnico que cambia mi posición, hincha que me invita a pelear, etc.). Invertir,
      casarme, préstamos, fichajes, renovaciones — con resultados + o −. NO repetir eventos.
- [ ] **Transferencias/préstamos/renovaciones**: mostrar clubes con escudo + oferta; poder **negociar**
      (pedir más o aceptar), ver por cuánto se renueva.
- [ ] **Métricas completas**: goles, partidos, asistencias, valor de mercado, puntuación, en clubes Y
      selección. Vitrina de trofeos reales.
- [ ] **Animación** buena al ganar título / logro importante (trofeo).
- [ ] **Simulación realista** (muy perfecta): decisiones basadas en carreras reales, sin ilogismos.
- [ ] Visualmente muy bueno en **PC y celular**; arreglar **botones que no se ven** (mala optimización).

## D) TRIVIA — rehacer estilo Preguntados
- [ ] **Elegir dificultad**. Presentación mucho más llamativa y adictiva, mejor cronómetro.
- [ ] **Fotos de jugadores / escudos** en las preguntas.
- [ ] Framing futbolero: los puntos son **goles**; momentos decisivos (penal en la final: si errás la
      respuesta, la errás; me va a fichar X; un hincha me invitó a pelear; etc.).

## E) DÓNDE DEPLOYAR
Igual que arriba: editar en Downloads → `git push` → Vercel (cancherofutbolapp.vercel.app) auto.
