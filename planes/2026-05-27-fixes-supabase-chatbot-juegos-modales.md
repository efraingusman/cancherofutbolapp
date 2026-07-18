# Plan: Fixes críticos — Supabase, chatbot, juegos, modales, buscador

**Creado:** 2026-05-27
**Estado:** Borrador
**Pedido:** Arreglar 6 problemas en Canchero: "Sin conexión a Supabase", quitar chatbot, animación en botones cerrar, juegos locales con fotos, cierre de modales sin redirigir al perfil, y buscador hamburguesa en una línea.

---

## Descripción General

### Qué Logra Este Plan

Este plan resuelve 6 bugs críticos de UX en la app Canchero: el feed no puede publicar por un race condition con Supabase, el chatbot indeseado flota sobre la UI, los modales al cerrarse redirigen incorrectamente al perfil, los juegos siguen apuntando a Y8.com (bloqueado), y el buscador hamburguesa se ve partido en dos líneas.

### Por Qué Importa

Publicar posts, ver juegos y navegar sin perder el contexto son flujos principales de la app. Cada bug bloquea o degrada la experiencia central del jugador.

---

## Estado Actual

### Estructura Existente Relevante

- `script.js` — módulo `social` IIFE con `getSb()` = `window._sb || null`, función `loadFeed`, `createPost`
- `script.js` — funciones `closeGamesModal`, `closeGamePlayer`, `closeDirectorioModal`, `closeTorneosModal`, `closeCategoryModal`
- `script.js` — `_GAMES_CATALOG` con 5 entradas pero todavía apuntando a Y8.com en algunos casos (se mezcla con la versión local)
- `index.html` — `#chatbot-trigger` (botón flotante verde robot) y `#chatbot-panel` (panel de chat)
- `style.css` — `.chatbot-trigger` y `.chatbot-panel` con estilos definidos
- `index.html` — menú hamburguesa `#mobile-menu-overlay` con buscador en flex row con `gap:10px`
- `games/` — 5 archivos HTML5 locales: `juggling.html`, `penalty.html`, `goalkeeper.html`, `headball.html`, `trivia.html`

### Brechas o Problemas que se Abordan

1. **Supabase race condition**: `getSb()` retorna `null` si `loadFeed` se llama antes de que `window._sb` esté asignado → muestra "Sin conexión a Supabase" incluso con sesión activa. `createPost` también usa `getSb()` que puede ser null.
2. **Chatbot**: botón verde flotante `#chatbot-trigger` y panel `#chatbot-panel` presentes y visibles — usuario no lo quiere.
3. **Cierre de modales lleva al perfil**: `closeGamePlayer()` oculta el player pero no re-abre el selector de juegos. El usuario queda viendo el tab "perfil" debajo.
4. **Juegos sin fotos y bloqueados**: el catálogo `_GAMES_CATALOG` en script.js apunta a Y8.com (bloqueado). Los juegos locales existen en `games/` pero el catálogo no apunta a ellos con imágenes visuales atractivas.
5. **Sin animación en botones X**: los botones de cerrar no tienen feedback visual.
6. **Buscador hamburguesa en dos líneas**: el `div` del search en `#mobile-menu-overlay` usa `font-size:14px` y `padding:10px 16px` que lo hace demasiado alto/ancho.

---

## Cambios Propuestos

### Resumen de Cambios

- **script.js**: `getSb()` con retry y fallback; `loadFeed` con retry automático; `closeGamePlayer` reabre el games modal; catálogo de juegos actualizado con imágenes SVG atractivas y URLs locales correctas.
- **index.html**: eliminar `#chatbot-trigger` y `#chatbot-panel` del HTML; compactar el buscador del hamburguesa.
- **style.css**: eliminar estilos `.chatbot-trigger` y `.chatbot-panel`; agregar animación `.btn-close` (rotate + scale); agregar clase utilitaria para todos los botones X.

### Nuevos Archivos a Crear

Ninguno.

### Archivos a Modificar

| Ruta del Archivo | Cambios |
|---|---|
| `script.js` | Fix `getSb()` con retry; fix `loadFeed` con espera; fix `closeGamePlayer` reabre games; actualizar `_GAMES_CATALOG` con imágenes SVG y URLs `/games/*.html` |
| `index.html` | Eliminar chatbot HTML; compactar buscador hamburguesa |
| `style.css` | Eliminar estilos chatbot; agregar animación botones cerrar |

### Archivos a Eliminar

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Retry de Supabase en `loadFeed`**: Si `getSb()` es null al llamar `loadFeed`, reintentar después de 800ms una vez. Esto cubre el race condition de inicialización sin complejidad extra.
2. **`getSb()` mejorado**: `return window._sb || window.supabaseClient || null` — referencia ambos alias posibles.
3. **`closeGamePlayer` reabre games**: Al cerrar el player, si venía de los juegos, re-abrir `openGamesModal()`. Usar una variable global `_lastOpenedFrom` que se setea en `launchGame`.
4. **Imágenes de juegos como SVG inline**: Crear SVGs temáticos con fondo `#0a0a0a` y color `#baff00` para cada juego — no dependen de URLs externas, cargan instantáneo, y se ven consistentes con el diseño.
5. **Animación X con CSS clase**: Agregar clase `.close-btn-anim` en CSS con `transition: transform 0.2s; hover: rotate(90deg) scale(0.9)`. Aplicar inline via `style` tag en los botones × existentes (son inline HTML, no tienen clase común).
6. **Buscador hamburguesa compactado**: Reducir `font-size` a 13px, `padding` a `8px 12px`, y usar el ícono de lupa como único botón de búsqueda (sin texto "BUSCAR").

### Alternativas Consideradas

- **Promise con timeout para Supabase**: más complejo, no necesario — el retry simple es suficiente.
- **Eliminar funciones del chatbot en script.js**: no necesario — las funciones no ocupan espacio visible, solo el HTML y CSS generan el botón/panel. Comentar/eliminar el HTML es suficiente.

### Preguntas Abiertas

Ninguna — todos los cambios son claros y sin ambigüedad.

---

## Tareas Paso a Paso

### Paso 1: Fix `getSb()` y race condition de Supabase en el módulo social

**Contexto**: `getSb()` dentro del IIFE `social` retorna `window._sb || null`. Si el módulo se evalúa antes de que `_sb` esté asignado, cualquier call posterior resuelve `window._sb` correctamente porque accede `window._sb` al momento de llamada (no al momento de definición del closure). Sin embargo, en `loadFeed`, si se llama muy temprano y `window._sb` aún es `null`, muestra el error. El fix es: en `loadFeed`, si `getSb()` es null, esperar 800ms y reintentar una vez.

**Acciones:**

1. Encontrar `function getSb()` en el módulo social (alrededor de línea 6269):
   ```js
   function getSb() { return window._sb || null; }
   ```
   Reemplazar con:
   ```js
   function getSb() { return window._sb || window.supabaseClient || null; }
   ```

2. Encontrar en `loadFeed` el bloque que muestra "Sin conexión a Supabase":
   ```js
   if (!getSb()) {
       el.innerHTML = `<div class="post-card" ...>Sin conexión a Supabase.</div>`;
       return;
   }
   ```
   Reemplazar con retry automático:
   ```js
   if (!getSb()) {
       el.innerHTML = `<div style="text-align:center;padding:30px;color:#555;"><i class='bx bx-loader-alt bx-spin' style="font-size:24px;"></i></div>`;
       setTimeout(() => {
           if (getSb()) { loadFeed(containerId, followingOnly); }
           else { el.innerHTML = `<div class="post-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:24px;text-align:center;color:#555;font-size:13px;"><i class='bx bx-wifi-off' style="font-size:32px;display:block;margin-bottom:8px;"></i>Sin conexión. Verificá tu internet.</div>`; }
       }, 800);
       return;
   }
   ```

3. En `createPost`, buscar donde valida `getSb()` (inicio de la función, ~línea 6410). Si no hay check explícito de getSb(), agregar:
   ```js
   const _sbNow = getSb();
   if (!_sbNow) { showToast('Sin conexión a Supabase. Esperá un momento y reintentá.', 'error'); if (btn) { btn.disabled=false; btn.textContent='PUBLICAR'; } return; }
   ```
   Asegurarse de que usa `_sbNow` en lugar de `getSb()` múltiples veces en la misma función.

**Archivos afectados:**
- `C:\Users\Cliente\Documents\canchero app\script.js`

---

### Paso 2: Eliminar el chatbot de la UI

**Contexto**: El chatbot tiene HTML en `index.html` (líneas ~3054-3072) y estilos en `style.css`. Las funciones JS (`toggleChatbot`, `sendChatbotMessage`) pueden permanecer en script.js ya que no son visibles sin el HTML.

**Acciones:**

1. En `index.html`, encontrar y eliminar completamente el bloque:
   ```html
   <!-- CHATBOT UI -->
   <div class="chatbot-trigger" id="chatbot-trigger" onclick="toggleChatbot()">
       <i class='bx bx-bot'></i>
       <div class="notification-badge" id="chat-notif" style="display:none;">1</div>
   </div>
   
   <div class="chatbot-panel" id="chatbot-panel">
       ...
   </div>
   ```
   Reemplazar con un comentario: `<!-- Chatbot removido por solicitud del usuario -->`

2. En `style.css`, encontrar los bloques `.chatbot-trigger` y `.chatbot-panel` (hay dos definiciones, ~líneas 1468 y 2163) y agregarles `display: none !important;` o directamente eliminar los bloques. Opción más segura: agregar al final del CSS:
   ```css
   /* Chatbot deshabilitado */
   .chatbot-trigger, .chatbot-panel { display: none !important; }
   ```

3. En `script.js`, encontrar donde el chatbot se muestra al navegar (~línea 1084):
   ```js
   const chatbotBtn = document.getElementById('chatbot-trigger');
   if (chatbotBtn) {
       if (viewId === 'jugador' || viewId === 'club') chatbotBtn.style.display = 'flex';
   ```
   Eliminar o comentar ese bloque completo (el `display: none !important` del CSS ya lo oculta, pero limpiar el JS evita errores).

**Archivos afectados:**
- `C:\Users\Cliente\Documents\canchero app\index.html`
- `C:\Users\Cliente\Documents\canchero app\style.css`
- `C:\Users\Cliente\Documents\canchero app\script.js` (comentar el bloque de chatbotBtn)

---

### Paso 3: Fix cierre de modales — no redirigir al perfil

**Contexto**: Al cerrar el game player (X roja), se llama `closeGamePlayer()` que solo oculta el modal. El tab "perfil" queda visible debajo porque era el tab activo antes de abrir los juegos. El fix: trackear de dónde se abrió el player, y al cerrar volver a ese estado.

**Acciones:**

1. Agregar variable global en script.js (antes de `_GAMES_CATALOG`):
   ```js
   let _gameOpenedFromModal = false; // true si se abrió desde games-modal
   ```

2. En `launchGame`, antes de `closeGamesModal()`, setear:
   ```js
   _gameOpenedFromModal = true;
   closeGamesModal();
   ```

3. En `closeGamePlayer`, después de ocultar el player modal, verificar si volver al games modal:
   ```js
   window.closeGamePlayer = function() {
       const playerModal = document.getElementById('game-player-modal');
       const iframe = document.getElementById('game-iframe');
       if (!playerModal) return;
       if (iframe) iframe.src = '';
       playerModal.style.display = 'none';
       document.body.style.overflow = '';
       // Volver al selector de juegos si venía desde ahí
       if (_gameOpenedFromModal) {
           _gameOpenedFromModal = false;
           openGamesModal();
       }
   };
   ```

4. Para otros modales (directorio, torneos, categorías), verificar que sus funciones close NO llamen a `navigate()` o `switchDashboardTab()`. Según el código actual, `closeDirectorioModal`, `closeTorneosModal` y `closeCategoryModal` solo ocultan el modal — ya están bien. Confirmar leyendo cada función.

**Archivos afectados:**
- `C:\Users\Cliente\Documents\canchero app\script.js`

---

### Paso 4: Actualizar catálogo de juegos con imágenes SVG atractivas y URLs locales

**Contexto**: `_GAMES_CATALOG` en script.js tiene URLs de Y8.com bloqueadas. Ya se intentó reemplazar en sesiones anteriores pero el catálogo sigue mixto. Hacer un reemplazo limpio y definitivo del objeto completo con los 5 juegos locales y SVGs temáticos.

**Acciones:**

1. En `script.js`, encontrar el objeto `const _GAMES_CATALOG = {` y reemplazar **completamente** con:

```js
const _GAMES_CATALOG = {
    'juggling': {
        name: 'Keeppy Up',
        desc: 'Mantené la pelota en el aire. ¡No la dejes caer!',
        badge: 'REFLEJOS',
        url: '/games/juggling.html',
        img: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect width="200" height="120" fill="%230a0a0a"/><circle cx="100" cy="52" r="28" fill="%23e8e8e8" stroke="%23333" stroke-width="1.5"/><circle cx="88" cy="42" r="8" fill="%23222"/><circle cx="112" cy="42" r="8" fill="%23222"/><circle cx="100" cy="62" r="8" fill="%23222"/><circle cx="82" cy="55" r="6" fill="%23222"/><circle cx="118" cy="55" r="6" fill="%23222"/><text x="100" y="100" text-anchor="middle" fill="%23baff00" font-size="14" font-family="Arial Black" font-weight="900">KEEPPY UP</text><text x="100" y="115" text-anchor="middle" fill="%23555" font-size="9" font-family="Arial">Tap para golpear</text></svg>')}`,
    },
    'penalty': {
        name: 'Tiro Libre',
        desc: 'Apuntá y pateá con efecto. ¡5 remates!',
        badge: 'CLÁSICO',
        url: '/games/penalty.html',
        img: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect width="200" height="120" fill="%230a0a0a"/><rect x="40" y="20" width="120" height="70" rx="3" fill="none" stroke="%23baff00" stroke-width="2"/><rect x="65" y="20" width="70" height="35" rx="2" fill="none" stroke="%23333" stroke-width="1.5"/><line x1="100" y1="90" x2="100" y2="110" stroke="%23333" stroke-width="1"/><circle cx="100" cy="100" r="10" fill="%23e8e8e8" stroke="%23333" stroke-width="1.5"/><text x="100" y="116" text-anchor="middle" fill="%23baff00" font-size="12" font-family="Arial Black" font-weight="900">TIRO LIBRE</text></svg>')}`,
    },
    'goalkeeper': {
        name: 'Arquero',
        desc: 'Atajá los penales. ¡10 disparos seguidos!',
        badge: 'ATAJA',
        url: '/games/goalkeeper.html',
        img: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect width="200" height="120" fill="%230a0a0a"/><rect x="30" y="15" width="140" height="75" rx="3" fill="none" stroke="%23baff00" stroke-width="2"/><rect x="65" y="15" width="70" height="38" rx="2" fill="none" stroke="%23333" stroke-width="1.5"/><rect x="72" y="78" width="56" height="18" rx="6" fill="%23baff00"/><text x="100" y="91" text-anchor="middle" fill="%23000" font-size="9" font-family="Arial Black" font-weight="900">ARQUERO</text><text x="100" y="113" text-anchor="middle" fill="%23baff00" font-size="12" font-family="Arial Black" font-weight="900">ARQUERO</text></svg>')}`,
    },
    'headball': {
        name: 'Cabezazo',
        desc: 'Movete y cabeceá la pelota al arco',
        badge: 'HABILIDAD',
        url: '/games/headball.html',
        img: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect width="200" height="120" fill="%230a0a0a"/><circle cx="80" cy="30" r="18" fill="%23f5c842" stroke="%23c8962a" stroke-width="1.5"/><circle cx="148" cy="22" r="14" fill="%23e8e8e8" stroke="%23333" stroke-width="1.5"/><line x1="80" y1="48" x2="80" y2="80" stroke="%23f5c842" stroke-width="4" stroke-linecap="round"/><line x1="80" y1="63" x2="58" y2="82" stroke="%23f5c842" stroke-width="3" stroke-linecap="round"/><line x1="80" y1="63" x2="102" y2="82" stroke="%23f5c842" stroke-width="3" stroke-linecap="round"/><text x="100" y="108" text-anchor="middle" fill="%23baff00" font-size="12" font-family="Arial Black" font-weight="900">CABEZAZO</text></svg>')}`,
    },
    'trivia': {
        name: 'Trivia Fútbol',
        desc: '10 preguntas. Timer 15 seg. ¿Cuánto sabés?',
        badge: 'CONOCIMIENTO',
        url: '/games/trivia.html',
        img: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect width="200" height="120" fill="%230a0a0a"/><text x="100" y="72" text-anchor="middle" fill="%23baff00" font-size="58" font-family="Arial Black" font-weight="900">?</text><text x="100" y="108" text-anchor="middle" fill="%23baff00" font-size="12" font-family="Arial Black" font-weight="900">TRIVIA FÚTBOL</text></svg>')}`,
    },
};
```

2. Asegurarse que `_buildGameProxyUrl` usa `g.url` directamente (ya hace esto):
   ```js
   function _buildGameProxyUrl(gameId) {
       const g = _GAMES_CATALOG[gameId];
       if (g && g.url) return g.url;
       return `/games/${gameId}.html`;
   }
   ```
   No necesita cambio adicional.

**Archivos afectados:**
- `C:\Users\Cliente\Documents\canchero app\script.js`

---

### Paso 5: Animación en botones de cerrar (X)

**Contexto**: Los botones × en modales son elementos inline sin clase común. La forma más limpia es agregar una clase CSS con la animación y aplicarla vía `style` tag global o target por atributo `onclick`.

**Acciones:**

1. En `style.css`, al final del archivo, agregar:
```css
/* Animación universal para botones de cerrar */
[onclick*="close"], [onclick*="Close"], [onclick*="toggleChatbot"], [onclick*="toggleMobileMenu"],
button[style*="bx-x"], .btn-close {
    transition: transform 0.18s ease, opacity 0.18s ease;
}
[onclick*="close"]:hover, [onclick*="Close"]:hover,
button[style*="bx-x"]:hover, .btn-close:hover {
    transform: rotate(90deg) scale(0.92);
    opacity: 0.8;
}
[onclick*="close"]:active, [onclick*="Close"]:active, .btn-close:active {
    transform: rotate(90deg) scale(0.82);
}
```

2. También agregar una clase `.btn-close` en CSS que se pueda usar explícitamente:
```css
.btn-close {
    transition: transform 0.18s ease, background 0.15s ease !important;
}
.btn-close:hover {
    transform: rotate(90deg) scale(0.9) !important;
}
.btn-close:active {
    transform: rotate(90deg) scale(0.8) !important;
}
```

3. En `index.html`, en los botones × más importantes (game-player close, hamburger close, modales principales), agregar la clase `btn-close`:
   - Botón cerrar game player: `<button onclick="closeGamePlayer()" class="btn-close" style="...">×</button>`
   - Botón cerrar hamburger: `<button onclick="toggleMobileMenu()" class="btn-close" style="...">×</button>`

**Archivos afectados:**
- `C:\Users\Cliente\Documents\canchero app\style.css`
- `C:\Users\Cliente\Documents\canchero app\index.html` (agregar clase `btn-close` a los botones ×)

---

### Paso 6: Fix buscador hamburguesa — una sola línea

**Contexto**: En `#mobile-menu-overlay`, el search div tiene `padding:10px 16px`, `font-size:14px` y el input tiene `font-size:14px`. En pantallas de 360-390px estos valores hacen que el campo sea muy alto y se vea como "dos líneas".

**Acciones:**

1. En `index.html`, encontrar el bloque de search dentro de `#mobile-menu-overlay` (alrededor de línea 2581):
   ```html
   <div style="padding:16px 24px 0;">
       <div style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.05); padding:10px 16px; border-radius:30px; border:1px solid rgba(255,255,255,0.1);">
           <i class='bx bx-search' style="color:var(--accent); font-size:18px;"></i>
           <input type="text" id="mobile-menu-search-input" placeholder="Buscar jugadores, clubes..." style="background:transparent; border:none; color:white; width:100%; outline:none; font-size:14px;" onkeyup="handleGlobalSearch(event, this)">
       </div>
   ```
   Reemplazar con versión compacta de una línea:
   ```html
   <div style="padding:10px 20px 0;">
       <div style="display:flex; align-items:center; gap:8px; background:rgba(255,255,255,0.05); padding:8px 14px; border-radius:30px; border:1px solid rgba(255,255,255,0.1);">
           <i class='bx bx-search' style="color:var(--accent); font-size:16px; flex-shrink:0;"></i>
           <input type="text" id="mobile-menu-search-input" placeholder="Buscar en Canchero..." style="background:transparent; border:none; color:white; width:100%; outline:none; font-size:13px; line-height:1.3;" onkeyup="handleGlobalSearch(event, this)">
           <button onclick="triggerGlobalSearch()" style="background:var(--accent);color:#000;border:none;border-radius:20px;padding:4px 10px;font-size:11px;font-weight:900;cursor:pointer;flex-shrink:0;">BUSCAR</button>
       </div>
   ```

**Archivos afectados:**
- `C:\Users\Cliente\Documents\canchero app\index.html`

---

### Paso 7: Build y deploy

**Acciones:**

1. Desde `C:\Users\Cliente\Documents\canchero app\`:
   ```
   node build.js
   ```
   Verificar output: "Build completed successfully."

2. Eliminar APK del www/ para no exceder límite de Vercel:
   ```
   del "C:\Users\Cliente\Documents\canchero app\www\canchero.apk"
   ```
   (o con PowerShell: `Remove-Item "...\www\canchero.apk" -Force -ErrorAction SilentlyContinue`)

3. Deploy desde www/:
   ```
   cd "C:\Users\Cliente\Documents\canchero app\www"
   npx vercel --prod --yes
   ```
   Verificar que aparezca "readyState: READY" en el output.

**Archivos afectados:**
- `www/` (generado por build)

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `canchero-features.js` — usa `window.supabaseClient` (alias de `_sb`)
- `canchero-fase3.js` — tiene su propio `getSb()` ya corregido con la clave correcta
- `index.html` — llama a `toggleChatbot()`, `openGamesModal()`, `closeGamePlayer()`

### Actualizaciones Necesarias para Consistencia

- Verificar que ningún otro lugar en `script.js` referencia `chatbot-trigger` o `chatbot-panel`

### Impacto en Flujos de Trabajo Existentes

- El feed ahora mostrará un spinner si Supabase tarda, en lugar de el error inmediato
- Los juegos abrirán localmente sin depender de internet externo
- Al cerrar juego → vuelve al selector de juegos (no al perfil)

---

## Lista de Validación

- [ ] Feed carga sin mostrar "Sin conexión a Supabase" cuando hay sesión activa
- [ ] Publicar post funciona correctamente con texto y/o imagen
- [ ] Botón verde robot (chatbot) NO aparece en la UI
- [ ] Panel chatbot NO aparece en la UI
- [ ] Al cerrar el game player (X roja), aparece el selector de juegos (no el perfil)
- [ ] Los 5 juegos en el catálogo tienen imagen de portada visible
- [ ] Todos los juegos abren correctamente (sin error Y8/conexión rechazada)
- [ ] Botones de cerrar tienen animación rotate al hover/click
- [ ] Buscador hamburguesa cabe en una sola línea en pantallas de 360px
- [ ] Build completa sin errores
- [ ] Deploy en Vercel exitoso

---

## Criterios de Éxito

1. Un usuario puede abrir el feed, ver posts y publicar uno nuevo sin ver "Sin conexión a Supabase"
2. El botón robot verde no aparece en ninguna pantalla de la app
3. Abrir y cerrar cualquier juego deja al usuario en el selector de juegos, no en el perfil
4. Los 5 juegos del catálogo muestran imagen de portada y se pueden jugar sin errores
5. El buscador en el menú hamburguesa se ve en una línea en iPhone 15 Pro Max y Samsung A12

---

## Notas

- El `_GAMES_CATALOG` en la sesión anterior tenía una mezcla de Y8 y local — este plan hace un reemplazo **completo** del objeto para garantizar que no queden referencias a Y8.
- Las imágenes SVG de los juegos están como `data:image/svg+xml,${encodeURIComponent(...)}` — esto funciona en todos los navegadores modernos sin servidor externo.
- Si en el futuro se quiere volver a mostrar el chatbot, basta con remover el `display: none !important` del CSS y re-agregar el HTML.
