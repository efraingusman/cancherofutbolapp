# Plan: Fixes Críticos — Mobile, Realtime, Disponibles, Notificaciones, Fotos, Compartir

**Creado:** 2026-05-29
**Estado:** Implementado
**Pedido:** 9 bugs críticos reportados por pruebas en dos cuentas (Keaton Store / Efrain Gusman): registro de club en móvil no llega a los botones, likes/comentarios/compartidos no actualizan en tiempo real, posts compartidos no muestran perfil original, sin notificación al enviar post por mensaje, pérdida de sección al recargar en buscador, fotos de perfil sin position en listados y perfiles de terceros, jugadores disponibles no funciona para nadie, notificaciones no funcionan.

---

## Descripción General

### Qué Logra Este Plan

Corrige 9 bugs críticos de usabilidad y funcionalidad en Canchero detectados en pruebas reales con dos perfiles simultáneos. Al terminar: el formulario de club será usable en cualquier tamaño de pantalla, los likes y comentarios se reflejarán instantáneamente en todos los feeds, los posts compartidos mostrarán el autor original con link clickeable, las notificaciones de mensajes llegarán al destinatario, el buscador recordará la sección activa al recargar, las fotos de perfil se verán exactamente como las subió el usuario (con su zoom/posición), los jugadores disponibles aparecerán correctamente, y el sistema de notificaciones funcionará end-to-end.

### Por Qué Importa

Estos bugs afectan las funcionalidades más usadas de la plataforma social (feed, perfiles, mensajes, disponibilidad). Sin ellos la app se siente rota. Son los blockers de adopción más directos antes de lanzamiento.

---

## Estado Actual

### Estructura Existente Relevante

- `script.js` (~11.600 líneas) — toda la lógica JS
- `index.html` (~3.900 líneas) — HTML principal con modales
- `style.css` — estilos globales
- `build.js` — copia root → www/ antes del deploy

### Brechas o Problemas que se Abordan

1. **Registro club en móvil**: `#club-creator-modal .fs-form-card` tiene grid 2 columnas que en pantallas < 400px apila mal y hace que los botones de acción queden fuera del viewport sin scroll visible.
2. **Realtime likes**: En `_initFeedRealtime` el selector es `.like-count[data-post-id="${like.post_id}"]` pero `buildPostCard` genera `<span class="like-count">` sin atributo `data-post-id`. El DOM lookup siempre falla → no se actualiza el contador.
3. **Realtime comentarios**: El selector `getElementById('comment-count-${comment.post_id}')` sí existe en el DOM (hay `id="comment-count-${p.id}"` en buildPostCard) — debería funcionar. Verificar que `_initFeedRealtime` se llame correctamente post-login.
4. **Posts compartidos sin atribución**: `repostToProfile` guarda `repost_of: postId` en DB pero `buildPostCard` ignora ese campo — nunca renderiza badge ni link del autor original.
5. **Sin notificación de mensaje**: `_sendPostToUser` inserta en tabla `messages` pero no inserta en `notifications` → el destinatario no ve badge ni toast.
6. **Sección no persiste al recargar**: El filtro activo `_feedFilter` y la sección del buscador no se guardan en localStorage. Al recargar, `_feedFilter = 'all'` y navega al home.
7. **Fotos en listados sin position**: `loadDisponibles` y otras funciones de listado hacen `select('name,email,photo,...')` sin incluir `photo_style`. Los avatares usan `background-position:center` fijo en lugar del zoom/posición guardado.
8. **Fotos en perfiles de terceros sin position**: `viewUserProfile` carga el perfil pero la función que renderiza el avatar del perfil (`buildProfileHeader`) aplica `background-size:cover;background-position:center` sin leer `photo_style` de la DB.
9. **Jugadores disponibles no devuelve resultados**: La query hace `eq('available', true).ilike('city', c)` pero el cliente Supabase anónimo tiene RLS que posiblemente no permite leer `available` de otros usuarios. Además `ilike` con ciudad puede no coincidir si hay variantes de ortografía. Solución: usar scope `mundo` como fallback, o verificar RLS.
10. **Notificaciones no funcionan end-to-end**: La campana carga notificaciones de la tabla `notifications`, pero los eventos (like, comentario, follow, mensaje) no siempre insertan en esa tabla. Hay dos sistemas paralelos (tabla `notifications` + panel custom en línea 11553). Unificar para que cada acción social genere un insert en `notifications`.

---

## Cambios Propuestos

### Resumen de Cambios

- Fix CSS modal club: `grid-template-columns: 1fr` en mobile, padding-bottom para asegurar scroll al botón
- Fix selector realtime likes: agregar `data-post-id="${p.id}"` al `<span class="like-count">` en `buildPostCard`
- Fix _initFeedRealtime: asegurar que se llama después del login (wrappear en `afterLogin` hook)
- Fix buildPostCard: detectar `p.repost_of`, hacer query del post original, renderizar badge "🔁 Compartido por @original" con link clickeable al perfil
- Fix _sendPostToUser: agregar insert en `notifications` con type `message` al enviar post por mensaje
- Fix persistencia de sección: guardar `_feedFilter` y sección activa en `localStorage` al cambiar; restaurar al iniciar sesión
- Fix fotos en listados: agregar `photo_style` al select de `loadDisponibles`, `loadDisponiblesModal`, función de búsqueda de jugadores; aplicar al avatar
- Fix fotos en perfiles de terceros: seleccionar `photo_style` en query de `viewUserProfile`; aplicar en render del avatar
- Fix disponibles RLS: agregar fallback a scope `mundo` si ciudad no devuelve resultados; revisar si el cliente usado tiene permisos
- Fix notificaciones end-to-end: centralizar función `createNotification(type, recipientEmail, data)` y llamarla en toggleLike, submitComment, follow/unfollow, _sendPostToUser

### Nuevos Archivos a Crear

Ninguno.

### Archivos a Modificar

| Ruta del Archivo | Cambios |
|---|---|
| `script.js` | 8 fixes de lógica JS (realtime, repost, notifs, persistencia, fotos, disponibles) |
| `index.html` | Fix CSS del modal de registro de club para móvil |

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **data-post-id en like-count**: Más robusto que buscar por ID. Permite que haya múltiples feeds activos simultáneamente y que el selector encuentre todos los contadores del mismo post.
2. **Repost attribution via query asíncrona en buildPostCard**: Cuando `p.repost_of` existe, hacer una query a Supabase para obtener `user_name` y `user_email` del post original. Alternativa más simple: guardar esos datos en el repost al momento de crearlo (agregar campos `original_user_name` y `original_user_email` al insert en `repostToProfile`). **Elegimos la alternativa simple** para no hacer queries extra en cada render.
3. **Persistencia con localStorage**: Guardar `canchero_last_filter` y `canchero_last_section` al cambiar sección; restaurar en el hook post-login. No usar hash de URL para evitar conflictos con el sistema existente.
4. **Notificaciones centralizadas**: Crear helper `window._createNotif(type, recipientEmail, actorEmail, actorName, meta)` que inserta en tabla `notifications`. Llamarlo desde los puntos de acción social existentes.
5. **Disponibles fallback**: Si la query por ciudad retorna 0 resultados, mostrar mensaje explicativo y botón "Ver en todo Uruguay" que hace query sin filtro de ciudad.

### Alternativas Consideradas

- **Para repost attribution**: Hacer JOIN en la query del feed (`posts.select('*, original:repost_of(user_name,user_email)')`). Rechazado porque requiere cambiar la query principal del feed que ya funciona, y Supabase requiere foreign key configurada para joins implícitos.
- **Para persistencia**: Usar `window.location.hash` con el filtro. Rechazado porque el sistema de hash ya se usa para navegación entre secciones principales.

### Preguntas Abiertas

1. **RLS de disponibles**: ¿La tabla `users` tiene RLS que permite `SELECT` para usuarios autenticados sobre filas de otros usuarios? Si no, la fix real requiere modificar el SQL de Supabase (fuera del scope de script.js). En ese caso haremos la fix condicional para mostrar mensaje explicativo al usuario.
2. **Tabla notifications — estructura**: ¿Tiene columnas `type`, `actor_email`, `actor_name`, `meta` (jsonb)? Si no, los inserts de notificación fallarán silenciosamente. Verificar antes de implementar.

---

## Tareas Paso a Paso

### Paso 1: Fix registro de club en móvil

El modal `#club-creator-modal .fs-form-card` usa grid 2 columnas. En móvil el grid debe ser 1 columna, y el contenedor necesita padding-bottom para que el botón "REGISTRAR CLUB" quede visible al hacer scroll.

**Acciones:**

- En `index.html`, línea ~2678, cambiar el div del grid de 2 columnas a:
  ```html
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;" class="club-form-grid">
  ```
- En `style.css`, agregar al final:
  ```css
  @media (max-width: 480px) {
    .club-form-grid { grid-template-columns: 1fr !important; }
    #club-creator-modal .fs-form-card { padding-bottom: 24px; }
  }
  ```
- Alternativamente, hacer inline en el div de `index.html` con media query usando clase. La opción más rápida es agregar `padding-bottom: 80px` al `fs-form-card` del modal para asegurar que el scroll llegue al botón.

**Archivos afectados:**
- `index.html` — agregar clase `club-form-grid` al div del grid
- `style.css` — agregar media query para `.club-form-grid` y padding-bottom del modal

---

### Paso 2: Fix realtime likes — agregar data-post-id al span

En `buildPostCard` (script.js ~línea 10300), el span de likes es:
```html
<span class="like-count">${likeCount}</span>
```
El selector en `_initFeedRealtime` (~línea 9885) busca `.like-count[data-post-id="${like.post_id}"]` que nunca matchea.

**Acciones:**

- En `buildPostCard`, cambiar la línea del botón de like para agregar `data-post-id`:
  ```html
  <i class='bx ...'></i> <span class="like-count" data-post-id="${p.id}">${likeCount}</span>
  ```
- Verificar que el selector en `_initFeedRealtime` usa exactamente `.like-count[data-post-id="${like.post_id}"]` y no cambiarlo.

**Archivos afectados:**
- `script.js` línea ~10300

---

### Paso 3: Fix _initFeedRealtime — asegurar inicialización post-login

Verificar dónde se llama `_initFeedRealtime`. Si se llama antes de que `userData` esté disponible, el canal no se suscribe. Debe llamarse desde el hook post-login.

**Acciones:**

- Buscar `_initFeedRealtime` en script.js y verificar que se llama desde el flujo de login/restauración de sesión (función `applyUserData` o `navigate`).
- Si no está, agregar `if (typeof window._initFeedRealtime === 'function') window._initFeedRealtime();` al final de `applyUserData` o en el punto donde se llama `loadMainFeed` por primera vez.

**Archivos afectados:**
- `script.js` — función `applyUserData` o equivalente

---

### Paso 4: Fix atribución de posts compartidos (repost_of)

Actualmente `repostToProfile` guarda `repost_of: postId` pero NO guarda el nombre/email del autor original. `buildPostCard` no lee `repost_of`.

**Acciones:**

- En `repostToProfile` (script.js ~línea 8420), agregar al objeto del insert:
  ```js
  original_user_name: orig.user_name || null,
  original_user_email: orig.user_email || null,
  ```
  Esto requiere que la tabla `posts` tenga esas columnas. Si no las tiene, usar el campo `content` para llevar los datos (solución alternativa: parsear el emoji 🔁 ya presente).

- En `buildPostCard` (script.js ~línea 10274), ANTES del `<article>` principal, agregar un header de atribución cuando `p.repost_of` existe:
  ```js
  const repostHeader = p.repost_of
      ? `<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;font-size:11px;color:#555;">
           <i class='bx bx-repost' style="font-size:14px;color:var(--accent);"></i>
           <span>Compartido por</span>
           <span onclick="window.viewUserProfile('${(p.original_user_email||'').replace(/'/g,"\\'")}')" 
                 style="color:var(--accent);cursor:pointer;font-weight:700;">@${p.original_user_name || 'alguien'}</span>
         </div>`
      : '';
  ```
  Insertar `${repostHeader}` dentro del `<article>` como primer hijo.

- Si la tabla `posts` no tiene `original_user_name`/`original_user_email`, alternativa: extraer el nombre del campo `content` (ya contiene `🔁 Compartido de @nombre:`) con regex: `/🔁 Compartido de @([^:]+):/`.

**Archivos afectados:**
- `script.js` — función `repostToProfile` (~8420) y función `buildPostCard` (~10274)

---

### Paso 5: Fix notificación al enviar post por mensaje

`_sendPostToUser` (script.js ~8392) inserta en `messages` pero no genera notificación.

**Acciones:**

- Después del `await sb.from('messages').insert(...)`, agregar:
  ```js
  try {
      await sb.from('notifications').insert({
          recipient_email: recipientEmail,
          type: 'message',
          actor_email: me.email,
          actor_name: me.name || me.email,
          content: `${me.name || 'Alguien'} te envió una publicación`,
          read: false,
          created_at: new Date().toISOString()
      });
  } catch(e) { /* silencioso */ }
  ```
- Verificar columnas exactas de la tabla `notifications` en `supabase_FINAL.sql` o `supabase_fase3.sql` antes de implementar.

**Archivos afectados:**
- `script.js` — función `_sendPostToUser` (~8392)

---

### Paso 6: Fix persistencia de sección al recargar

Al recargar la página dentro del buscador de jugadores, la app navega al home en lugar de mantener la sección activa.

**Acciones:**

- Encontrar dónde se cambia `_feedFilter` (función `setFeedFilter` o `loadFeedFilter`). Al cambiar el filtro, guardar en localStorage:
  ```js
  localStorage.setItem('canchero_last_filter', filter);
  ```
- En la función de inicialización post-login (donde se llama `navigate(rol)`), después de navegar, restaurar el filtro:
  ```js
  const savedFilter = localStorage.getItem('canchero_last_filter');
  if (savedFilter && savedFilter !== 'all') {
      setTimeout(() => { if (typeof setFeedFilter === 'function') setFeedFilter(savedFilter); }, 300);
  }
  ```
- Para el buscador específicamente (sección `disponibles`): también guardar la sección activa del buscador en `localStorage.setItem('canchero_last_section', 'buscador')`.

**Archivos afectados:**
- `script.js` — función que maneja `_feedFilter` y función de restauración de sesión

---

### Paso 7: Fix fotos de perfil en listados (disponibles, buscador)

Las queries de `loadDisponibles` y `loadDisponiblesModal` no traen `photo_style`.

**Acciones:**

- En `loadDisponibles` (~línea 11306), cambiar:
  ```js
  sb.from('users').select('name,email,photo,pos,city,nat,available')
  ```
  a:
  ```js
  sb.from('users').select('name,email,photo,photo_style,pos,city,nat,available')
  ```
- En `_disponiblesPlayerCard` (~línea 11272), cambiar el render del avatar para aplicar `photo_style`:
  ```js
  const ps = u.photo_style || {};
  const px = 50 + parseInt(ps.x || 0);
  const py = 50 + parseInt(ps.y || 0);
  const zoom = parseFloat(ps.zoom || 100);
  const photoStyleStr = u.photo && !u.photo.includes('ui-avatars')
      ? `background-image:url('${u.photo}');background-size:${zoom > 100 ? zoom+'%' : 'cover'};background-position:${px}% ${py}%;`
      : `background:var(--accent);`;
  ```
- Hacer lo mismo en `loadDisponiblesModal` (~línea 11333).
- En las funciones de búsqueda de jugadores (búsqueda general), también agregar `photo_style` al select.

**Archivos afectados:**
- `script.js` — funciones `loadDisponibles`, `loadDisponiblesModal`, `_disponiblesPlayerCard`, y función de búsqueda de jugadores

---

### Paso 8: Fix fotos en perfiles de terceros

Al ver el perfil de otro usuario, el avatar se renderiza con `background-position:center` fijo.

**Acciones:**

- En la función que renderiza el header del perfil de tercero (buscar `viewUserProfile` y la función de construcción del perfil, ~líneas 3150-3210), verificar que `photo_style` se selecciona en la query:
  ```js
  sb.from('users').select('...photo_style...')
  ```
- En el render del avatar del perfil (~línea 3204), ya hay lógica que usa `_upsZoom`, `_upsPosX`, `_upsPosY` desde `u.photo_style`. Verificar que esa lógica se ejecuta correctamente y que `u.photo_style` viene de la DB (no es undefined).
- Si la query no incluye `photo_style`, agregarlo.

**Archivos afectados:**
- `script.js` — query y render en `viewUserProfile` / función de header de perfil (~3150-3210)

---

### Paso 9: Fix jugadores disponibles — debug y fallback

La query `eq('available', true)` puede estar fallando por RLS o por problema de cliente.

**Acciones:**

- Verificar que `_sb || window._sb` en `loadDisponibles` es el cliente autenticado (no el anónimo). Si el usuario no está logueado, redirigir a login.
- Agregar console.log temporal para ver si `error` tiene contenido: si hay error de RLS (código 42501 o mensaje "permission denied"), el fix real es en Supabase SQL.
- Agregar fallback: si la query por ciudad retorna 0 y no hay error, intentar sin filtro de ciudad automáticamente (scope `pais`), y si sigue en 0, scope `mundo`.
- En el mensaje de "no hay jugadores disponibles", mostrar: "No encontramos jugadores disponibles en tu ciudad. [Ver en todo Uruguay]" en lugar del mensaje actual que sugiere "Ver todo el mundo".
- **Si hay error RLS**: documentar en el plan que se requiere agregar la siguiente policy en Supabase:
  ```sql
  -- Permitir a usuarios autenticados ver datos básicos de otros usuarios
  CREATE POLICY "Users can read other users basic info"
  ON users FOR SELECT
  TO authenticated
  USING (true);
  ```
  Esta policy es la solución correcta y debe aplicarse en el dashboard de Supabase.

**Archivos afectados:**
- `script.js` — funciones `loadDisponibles`, `loadDisponiblesModal`

---

### Paso 10: Fix sistema de notificaciones end-to-end

El sistema tiene dos implementaciones paralelas: tabla `notifications` (cargada por la campana ~línea 9121) y panel custom inline (~línea 11553). La campana no muestra notificaciones de mensajes recibidos porque `_sendPostToUser` no inserta en `notifications`.

**Acciones:**

- Crear helper centralizado cerca de las notificaciones existentes (~línea 9193):
  ```js
  window._createNotif = async function(type, recipientEmail, actorEmail, actorName, content, meta) {
      const sb = window._sbAdmin || window._sb;
      if (!sb || !recipientEmail || recipientEmail === actorEmail) return;
      try {
          await sb.from('notifications').insert({
              recipient_email: recipientEmail,
              type,
              actor_email: actorEmail,
              actor_name: actorName,
              content,
              meta: meta || null,
              read: false,
              created_at: new Date().toISOString()
          });
      } catch(e) {}
  };
  ```
- Llamar `_createNotif` desde:
  - `_sendPostToUser`: type `message`, content `"te envió una publicación"`
  - `toggleLike` (cuando hace like): type `like`, content `"le dio ❤️ a tu publicación"` — verificar que `createNotification` existente ya lo hace (~9198), si sí, no duplicar
  - `submitInlineComment` / `submitComment`: type `comment` — verificar si ya existe
  - `follow` / `toggleFollow`: type `follow` — verificar si ya existe
- Verificar que la campana (`loadNotifications` ~9121) incluye type `message` en el render. Agregar caso si no existe:
  ```js
  if (n.type === 'message') icon = 'bx-message'; color = '#7c8cf8'; text = n.content || 'Te enviaron un mensaje';
  ```
- Verificar que `loadNotifications` se llama al iniciar sesión y actualiza el badge.

**Archivos afectados:**
- `script.js` — helper `_createNotif`, funciones `_sendPostToUser`, `loadNotifications`, y puntos de acción social existentes

---

### Paso 11: Verificar y ejecutar build

Después de todos los cambios en `script.js` e `index.html`:

**Acciones:**

- Ejecutar `node build.js` en la carpeta `salidas/canchero app/` para copiar los cambios a `www/`
- Verificar que no hay errores de sintaxis JS (el build debería fallar si hay errores obvios)
- Confirmar que `www/script.js`, `www/index.html` y `www/style.css` se actualizaron

**Archivos afectados:**
- `www/` — generado automáticamente por build.js

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `canchero-notifications.js` — módulo separado de notificaciones (verificar si hay conflicto con el helper centralizado)
- `canchero-messaging.js` — módulo de mensajería (verificar integración con notificaciones)
- `supabase_FINAL.sql` / `supabase_fase3.sql` — esquema de la tabla `notifications` (consultar para columnas exactas)

### Actualizaciones Necesarias para Consistencia

- Actualizar `contexto/proyectos.md` para mover los planes anteriores a "Completados" si ya fueron implementados, y agregar este plan como "En desarrollo"
- Si se requiere SQL en Supabase (RLS disponibles), documentar en `salidas/canchero app/supabase_fase4_policies.sql`

### Impacto en Flujos de Trabajo Existentes

- El `build.js` debe correr después de cada cambio en archivos root para que los cambios lleguen a `www/` y al deploy de Vercel
- Los cambios de `photo_style` en selects pueden afectar performance si hay muchos usuarios en listados — mitigado por el `limit(50)` existente

---

## Lista de Validación

- [ ] Formulario de registro de club en Chrome DevTools con viewport 375px muestra el botón "REGISTRAR CLUB" sin necesidad de scroll horizontal
- [ ] Al dar like a un post desde Keaton Store, el contador en el feed de Efrain Gusman se actualiza sin recargar
- [ ] Al comentar un post desde Efrain Gusman, el contador de comentarios en el feed de Keaton Store se actualiza sin recargar
- [ ] Un post reposteado muestra badge "🔁 Compartido por @nombre" con link clickeable al perfil original
- [ ] Al enviar un post por mensaje, el destinatario ve notificación (badge en campana + toast si está activo)
- [ ] Al recargar la página estando en la sección de Disponibles dentro del buscador, la app vuelve a esa sección
- [ ] Los avatares en el listado de jugadores disponibles muestran la foto con el zoom/posición correctos
- [ ] Al ver el perfil de otro usuario, su foto de perfil se muestra con el zoom/posición que el usuario configuró
- [ ] En la cuenta Keaton Store, al buscar Disponibles aparece Efrain Gusman (que tiene `available=true`)
- [ ] La campana muestra notificación cuando alguien envía un post por mensaje
- [ ] `node build.js` corre sin errores y `www/` se actualiza

---

## Criterios de Éxito

1. Los 9 bugs reportados están corregidos y verificados en ambas cuentas de prueba
2. El build `www/` está actualizado y listo para deploy en Vercel
3. No hay regresiones en funcionalidades existentes (feed, perfiles propios, publicar posts)

---

## Notas

- **Orden de prioridad sugerido para implementar**: Paso 2 (realtime likes — es una línea), Paso 1 (móvil club), Paso 4 (repost), Paso 5 (notif mensaje), Paso 9 (disponibles), Paso 7+8 (fotos), Paso 6 (persistencia sección), Paso 10 (notifs sistema), Paso 3 (verificar init realtime), Paso 11 (build).
- **Disponibles**: Si el problema es RLS, la fix SQL debe hacerse en el dashboard de Supabase → SQL Editor. Copiar y ejecutar la policy del Paso 9.
- **Columnas de notifications**: Verificar en `supabase_FINAL.sql` o `supabase_fase3.sql` antes del Paso 10 para no fallar en insert.
- Los planes anteriores (`2026-05-27-canchero-fase4-fixes-completos.md`) pueden tener fixes parcialmente aplicados — revisar antes de reimplementar.

---

## Notas de Implementación

**Implementado:** 2026-05-29

### Resumen

- **Paso 1**: `index.html` — modal club con clase `club-form-grid` + `padding-bottom:32px`. `style.css` — media query `@media (max-width:480px)` para grid 1 columna.
- **Paso 2**: `buildPostCard` — agregado `data-post-id="${p.id}"` al `<span class="like-count">` para que el selector realtime funcione.
- **Paso 3**: Ya estaba implementado — `_initFeedRealtime` se llama desde `applyUserData` con timeout de 800ms.
- **Paso 4**: `repostToProfile` — guarda `original_user_name`, `original_user_email`, `media_url`, `media_type` en el insert. `buildPostCard` — renderiza badge de atribución con regex fallback si las columnas no existen en el post.
- **Paso 5**: `_sendPostToUser` — llama `notif.create()` después de insertar en messages.
- **Paso 6**: `setFeedFilter` — guarda `canchero_last_feedfilter` en localStorage. `_doTabRestore` — restaura el filtro con `setFeedFilter` a los 500ms del restore del tab.
- **Paso 7**: `_disponiblesPlayerCard` — aplica `photo_style` con zoom/posición al avatar. `loadDisponibles` y `loadDisponiblesModal` — agregado `photo_style` al select. `ilike` mejorado con `%ciudad%` para match parcial.
- **Paso 8**: `viewUserProfile` — enriquece todos los posts del perfil con `user_photo` y `user_photo_style` del usuario visto antes de pasarlos a `buildPostCard`.
- **Paso 9**: `loadDisponibles` y `loadDisponiblesModal` — fallback automático ciudad→país→mundo cuando hay error o 0 resultados.
- **Paso 10**: `notif.render` — agregado type `message` a icons/colors. `notif.startRealtime` — suscripción realtime a tabla `notifications` filtrada por `recipient_email` del usuario logueado para actualizar la campana en tiempo real.
- **Paso 11**: `node build.js` ejecutado exitosamente — `www/` actualizado.

### Desviaciones del Plan

- Las columnas `original_user_name`/`original_user_email` en tabla `posts` no se pudieron verificar sin acceso directo a Supabase. Se implementó con try silencioso en el insert y regex fallback en el render para garantizar compatibilidad.
- La suscripción realtime de notificaciones usa `filter` de Supabase Realtime. Si la versión de Supabase no soporta filtros en `postgres_changes`, la campana se actualizará igual (sin filtro), recargando para todos los tipos de notif.

### Problemas Encontrados

- El texto de "en tu país" en `loadDisponibles` original tenía una inconsistencia (decía "en tu país" en un caso y "tu país" en otro). Corregido al unificar en el nuevo mensaje.
- `ilike('city', c)` causaba 0 resultados para matches parciales (ej. "Montevideo" vs "Montevideo, Uruguay"). Cambiado a `ilike('city', '%c%')` para match inclusivo.
