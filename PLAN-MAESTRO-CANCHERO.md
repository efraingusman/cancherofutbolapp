# PLAN MAESTRO CANCHERO — handoff para continuar (2026-08-02)

> Pegá este archivo (o su contenido) al abrir un chat nuevo de Claude Code para seguir
> trabajando sin perder contexto. Tiene la ruta exacta, cómo deployar y TODO lo pendiente.

---

## 0) DÓNDE TRABAJAR (ruta exacta) — LEER PRIMERO

**Carpeta del proyecto (la que se deploya):**
```
C:\Users\Cliente\Downloads\espacio-de-trabajo-claude - copia\salidas\canchero app
```
- ⚠️ NO usar `C:\Users\Cliente\Documents\canchero app` — es una copia VIEJA que NO se deploya.
- El código real vive en la RAÍZ de esa carpeta de Downloads (index.html, script.js, style.css,
  sw.js, y los módulos `canchero-*.js`).

**Deploy (automático por GitHub):**
- Repo: `github.com/efraingusman/cancherofutbolapp`
- URL en vivo: **https://cancherofutbolapp.vercel.app** (cuenta Vercel de joelviettro)
- Flujo: editar en la carpeta de Downloads → `git commit` → `git push` → Vercel deploya solo.
- Push (el remoto quedó SIN token por seguridad; pedir uno nuevo al usuario cuando haga falta):
  ```
  git push https://efraingusman:<TOKEN_GITHUB>@github.com/efraingusman/cancherofutbolapp.git main
  ```
- **Al tocar cualquier .js/.css**: subir el `?v=` de ese archivo en `index.html` **Y** el
  `CACHE_NAME` en `sw.js` (si no, el Service Worker sirve la versión vieja). Hoy va por `v426`.
- Verificar en prod: `curl -s https://cancherofutbolapp.vercel.app/sw.js | grep CACHE_NAME`.
- El Vercel viejo `canchero-app.vercel.app` (cuenta neurovidstudioia) está PAUSADO — no usar.

**Supabase** (backend): proyecto `dofbxgqzcvfjpnvcvdjb`. Hay SQL pendientes de correr (abajo).

**Nota de verificación:** la extensión de Chrome de Claude bloquea el dominio nuevo, así que
la verificación visual la hace el usuario. Igual se puede curl-ear el HTML/JS/assets en prod.

---

## 1) ASSETS — cómo agregarlos (el usuario los sube a carpetas)

Carpeta base donde el usuario deja los archivos:
`C:\Users\Cliente\Downloads\assets canchero leyenda\`  (subcarpetas: escudos, trofeos,
`fotos jugadores trivia`, `imagenes decisiones carrera`, `fondos juegos`).

- **Escudos**: vienen en ZIP por liga (escudoteca / paladarnegro.net). Se extraen y se copian
  a `img/clubs/<slug>.webp` (resize 200px, sharp). Ya hay ~600 escudos extraíbles → se pueden
  agregar MUCHOS más clubes (hoy solo se conectaron 67).
- **Trofeos** → `img/trofeos/<n>.webp`. **Decisiones** → `img/carrera/decisiones/<tipo>.webp`.
- **Fotos jugadores** (para Trivia) → `img/trivia/jugadores/<nombre>.webp`.
- Comprimir SIEMPRE a webp con `sharp` (ya instalado local con `npm i sharp --no-save`).
- Ver `ASSETS-NECESARIOS.md` para los nombres exactos.

---

## 2) YA HECHO (no repetir) — hasta v426
Deploy en GitHub/Vercel. F8 en/fuera de torneo, WhatsApp, guardar torneo, ver ligas, caja CRM,
posición perfil, sesión que se cerraba, perfil biz sin stats de jugador, seguridad admin,
B7 rol, B8 follows, home rediseño (4 accesos, "perfiles creados", sin scroll), racha pelota→
llama verde, eliminar Fanático Fase 1, migración de Vercel a GitHub (cuenta joel),
Trivia (juego), Canchero Leyenda (juego), portadas de Buscar/Partidos (webp), header visible
en juegos/torneos, inscripción a torneos (jugador individual + aprobación), 67 escudos reales +
17 trofeos + 10 decisiones integrados, camiseta con mangas/puños/cuello y texto que entra.

---

## 3) PENDIENTE — por prioridad

### 3.1 CAMISETAS (profesionales) — PRIORIDAD ALTA
El SVG hecho a mano se ve amateur. Opciones (elegir una):
- **(A) Template PNG** de camiseta (frente) tipo footballshirtmaker.com: una imagen base
  (blanca) + máscara para teñir por color de país/club + capa de rayas. Se compone con `sharp`
  o CSS `mask`. Es lo que da look PRO. → **Necesita 1-2 PNG de template** (frente liso + patrón
  rayas). Se los puede pedir al usuario o generar.
- (B) Mejorar el SVG con degradés, sombras de tela y textura. Menos pro que (A).
- Requisito: nombre y número SIEMPRE dentro (ya hecho con `textLength`), sin verse gigantes.
  Archivo: `canchero-carrera.js` → función `jersey(size, apellido, numero, pais)` y mapa `KITS`.

### 3.2 CANCHERO LEYENDA — MÁS CONTENIDO Y LÓGICA
- **Muchos más clubes**: expandir `LIGAS` en `canchero-carrera.js` usando los ~600 escudos
  disponibles (agregar 2ª/3ª división de cada país, más ligas). Copiar sus crests a `img/clubs`
  y sumar al `NAMESLUG`.
- **Muchas más decisiones** (hoy 10): agregar 30-50 eventos variados (representante, familia,
  casamiento, inversión, hincha que invita a pelear, renovación con negociación, préstamo,
  cláusula, rumor de prensa, cambio de técnico, sponsor, redes, etc.). Cada uno con `img`.
  **No repetir** eventos ya vistos en la misma carrera (llevar set de vistos).
- **Pacing configurable**: jugar temporada a temporada o por etapas (cada 2 / 4 años).
- **Selección nacional**: citaciones, Eliminatorias, Copa América/Mundial; impactan valor de
  mercado y nivel. Ya hay un evento base de selección.
- **Transferencias/renovaciones/préstamos con NEGOCIACIÓN**: mostrar clubes con escudo + oferta
  (sueldo, años), poder pedir más o aceptar; ver por cuánto se renueva.
- **Métricas**: goles/PJ/asist en club y selección, valor de mercado, títulos (vitrina con
  trofeos reales). Animación al ganar título (ya hay base).
- **Guardado en Supabase** (`career_saves`) para cross-device; **ranking** ya tiene
  `carrera_scores` (falta correr SQL).
- Arreglar botones que no se ven bien en PC/celular (revisar overflow en cada pantalla).

### 3.3 TRIVIA — rebuild estilo Preguntados
- Archivo `canchero-trivia.js`. Agregar: **elegir dificultad**, mejor cronómetro/animaciones,
  **fotos de jugadores y escudos** en las preguntas (usar `img/trivia/jugadores` cuando el
  usuario las suba + `img/clubs`), y **framing futbolero** (los puntos = goles; momentos
  decisivos: "penal en la final: si errás la respuesta, la errás"; "me va a fichar X"; "un
  hincha te invita a pelear"; etc.). Más preguntas.

### 3.4 MODO INVITADO
- Entrar **sin registrarse** a ver todo (confianza). Sección Perfil sin login: **candado** en
  gris, redactado bien ("Creá tu perfil para desbloquear tus stats, equipos y logros"), CTA a
  registrarse. Al intentar una acción → registro.

### 3.5 REGISTRO POR ROL
- Si me registro/entro como tienda/jugador/cancha/liga: crear **SOLO ese perfil** (no jugador
  por defecto) y **entrar en ese rol**. Revisar `_showLoginModal`, `_goRoleAction`, creación de
  perfil en `_applyRestoredUser`/registro.

### 3.6 SWITCHER DE ROL
- "Añadir equipo" con **signo +** al lado del rol ya creado en la lista (no un bloque abajo).
  Archivo `script.js` → `_openProfileSwitcher`.

### 3.7 BUGS
- **Nav barra inferior**: sigue marcando mal la sección en algunos casos (revisar
  `_ruleta2SyncById` / `switchDashboardTab`).
- **Ligas: Liga Clandestina DUPLICADA**, una da error al abrir. Deduplicar el listado de ligas y
  arreglar el perfil que rompe (probablemente multi-identidad: users.role jugador + business).
- **Campana de notificaciones**: que funcionen y dirijan bien (revisar routing en
  `canchero-notifications.js` render de cada tipo).

### 3.8 OTROS DEL PLAN VIEJO
- Vista PC con menú lateral de iconos (falta imagen de referencia del usuario en PNG/JPG).
- Fanático Fase 2 (editor de club favorito en perfil jugador; quitar pestaña Hinchada de no-
  migrados; Comunidades como tab del jugador).
- Racha por actividad + recompensas por hitos.
- Google OAuth: no exponer el proyecto Supabase en el consentimiento → custom domain de
  Supabase Auth (config del dashboard, no código).

---

## 4) SQL PENDIENTE (correr en Supabase → SQL Editor)
Archivos en `sql/`:
- `sql/2026-08-02-trivia-scores.sql`  (ranking de Trivia)
- `sql/2026-08-02-carrera-scores.sql` (ranking de Canchero Leyenda)
(Sin correrlos, los juegos andan pero no guardan ranking.)

---

## 5) ARCHIVOS CLAVE
- `index.html` — shell, home, secciones, tags `<script>` con `?v=`.
- `script.js` — core (auth, perfil, switcher, feed, torneos-hooks, nav).
- `style.css` — estilos (home, cards con portada `.has-cover`, header offsets).
- `sw.js` — Service Worker (CACHE_NAME + lista de assets a precachear).
- `canchero-tournaments.js` — torneos (crear, inscribir, gestionar, público).
- `canchero-trivia.js` — juego Trivia.
- `canchero-carrera.js` — juego Canchero Leyenda (identidad, clubes, decisiones, hub).
- `canchero-games.js` — hub de juegos (GAMES, GAME_ART, launcher).
- `canchero-notifications.js` — notificaciones/push.
- `crm-organizacion.html` + `crm-common.js` — CRM de ligas (caja, torneos).
- `img/clubs/`, `img/trofeos/`, `img/carrera/decisiones/`, `img/covers/`, `img/games/` — assets.
- `ASSETS-NECESARIOS.md` — nombres exactos de assets a subir.
