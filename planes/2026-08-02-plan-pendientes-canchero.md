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

### 3.a) JUEGO NUEVO — Trivia Futbolera (tipo Preguntados)
Portada lista (`img/games/trivia.png`). Hoy muestra "Próximamente".
- [ ] Banco de preguntas con **fotos** (escudos y jugadores). Categorías: historia, clubes,
      selecciones, jugadores por foto, escudos por foto, records.
- [ ] **Niveles** (dificultad progresiva) y **ranking** (tabla global, reusar el podio).
- [ ] Modo 1 jugador (contrarreloj) y opcional 1v1/duelo.
- [ ] Persistir puntaje/nivel por usuario en Supabase (tabla nueva `trivia_scores`).
- [ ] Módulo nuevo `canchero-trivia.js`, exponer `window._triviaStart` (el launcher ya lo
      llama si existe; si no, cae al "Próximamente").

### 3.b) JUEGO NUEVO — Modo Carrera (tipo Copero, más adictivo)
Portada lista (`img/games/carrera.png`). Hoy muestra "Próximamente".
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
- [ ] **Portadas con foto** (no solo icono): cambiar la de **Debates**; agregar portada a
      las secciones de **Partido** y de **Buscar** (todas con imagen de fondo, no solo icono).
      (Las de Juegos ya se hicieron.)
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
