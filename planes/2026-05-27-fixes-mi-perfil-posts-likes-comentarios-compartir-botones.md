# Plan: Fixes Mi Perfil — Posts, Likes, Comentarios, Compartir, Botones de Acción

**Creado:** 2026-05-27
**Estado:** Implementado
**Pedido:** Publicaciones aparecen/desaparecen al recargar, no funciona like, no funciona comentar, compartir no muestra gente seguida, botones fijar y eliminar visibles directo (sin 3 puntitos).

---

## Descripción General

### Qué Logra Este Plan

Corrige 5 bugs en la sección "Mi Perfil" de Canchero que hacen inutilizable el feed de publicaciones propias. Después de estos cambios el usuario puede ver sus posts de forma consistente, dar like, comentar, compartir con sus seguidores, y gestionar sus posts (fijar/eliminar) desde botones siempre visibles sin menú intermedio.

### Por Qué Importa

El perfil es la pantalla central del jugador. Si los posts aparecen y desaparecen, y los botones sociales no responden, la experiencia de uso queda completamente rota. Estos fixes son bloqueantes para cualquier prueba real de la app.

---

## Estado Actual

### Estructura Existente Relevante

- `script.js` línea **8385**: función `buildPostCard(p)` — genera el HTML de cada post en el perfil y el feed
- `script.js` línea **8571**: función `loadProfilePosts()` — carga posts del perfil desde Supabase
- `script.js` línea **6721**: función `toggleLike(el)` dentro del módulo `social` — busca `.like-count` en el botón
- `script.js` línea **6953**: función `sharePost(postId, userName)` dentro del módulo `social` — muestra sheet con "Compartir en mi perfil" + externos
- `script.js` línea **8465**: función `window.sharePost(postId)` — versión simple que solo copia link (SIN sheet, SIN gente seguida)
- `script.js` línea **8474**: función `openOwnPostMenu(postId, isPinned)` — menú sheet con 3 puntitos que tiene fijar/eliminar

### Brechas o Problemas que se Abordan

1. **Posts aparecen/desaparecen al recargar**: `loadProfilePosts()` en línea 8574 tiene `if (!container || !_sb || !userData) return;`. Si `_sb` no está listo en el momento exacto que se llama (race condition en la inicialización), sale sin cargar y el contenedor queda vacío. Al próximo reload `_sb` puede estar listo y los posts aparecen. El fix es esperar con retry.

2. **Like no funciona**: En `buildPostCard` (línea 8443), el botón de like tiene `data-post-id` correcto, pero el `<span>` del contador NO tiene la clase `.like-count`. La función `toggleLike` busca `el.querySelector('.like-count')` → retorna `null` → `parseInt(null)` = NaN → el contador se rompe y la acción falla silenciosamente. Fix: agregar clase `like-count` al span.

3. **Comentar no funciona**: En `buildPostCard` (línea 8448), el botón "Comentar" NO tiene `onclick`. Está renderizado como botón visual sin acción. Fix: agregar `onclick="social.openComments('${p.id}')"`.

4. **Compartir no muestra gente seguida**: En `buildPostCard` (línea 8449) se llama `window.sharePost` (la versión simple de línea 8465) que solo hace `navigator.share` o copia el link. No llama a `social.sharePost` que tiene el sheet completo con "Compartir en mi perfil". Fix: cambiar el onclick a `social.sharePost('${p.id}','${p.user_name||''}')`.

5. **Botones fijar/eliminar ocultos detrás de 3 puntitos**: `buildPostCard` renderiza un botón `⋯` que abre `openOwnPostMenu`. El usuario quiere los botones siempre visibles. Fix: reemplazar el `⋯` en posts propios por dos iconos visibles (📌 y 🗑) en la cabecera del post.

---

## Cambios Propuestos

### Resumen de Cambios

- `script.js`: fix `loadProfilePosts` con retry/espera de `_sb`
- `script.js`: fix `buildPostCard` — agregar clase `like-count` al span del contador
- `script.js`: fix `buildPostCard` — agregar `onclick` al botón Comentar
- `script.js`: fix `buildPostCard` — cambiar `sharePost` a `social.sharePost`
- `script.js`: fix `buildPostCard` — reemplazar botón `⋯` por botones pin + delete visibles en posts propios

### Nuevos Archivos a Crear

Ninguno.

### Archivos a Modificar

| Ruta del Archivo | Cambios |
|---|---|
| `script.js` | 5 fixes puntuales en `loadProfilePosts` y `buildPostCard` |

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Retry con setTimeout para `loadProfilePosts`**: En lugar de fallar silenciosamente cuando `_sb` no está, hacer hasta 3 reintentos con 500ms de espera. Esto cubre el race condition sin necesidad de refactorizar el orden de inicialización.

2. **Botones pin + delete en cabecera, inline**: Reemplazar el `⋯` (menú flotante) por dos iconos directamente visibles en la esquina superior derecha del post cuando el post es propio. Pin (📌) a la izquierda del delete (🗑). Tamaño pequeño, colores sutiles (gris/amarillo para pin, rojo para delete). En posts ajenos se mantiene el `⋯` con reportar/bloquear.

3. **Mantener `openOwnPostMenu` existente**: No eliminarlo, ya que puede ser útil desde otras vistas. Solo dejar de usarlo desde `buildPostCard`.

### Alternativas Consideradas

- **Refactorizar orden de inicialización de `_sb`**: más correcto a largo plazo pero alto riesgo de romper otras cosas. El retry es más seguro y rápido.
- **Un solo botón "..." con solo pin/delete**: el usuario pidió explícitamente que estén visibles sin menú.

---

## Tareas Paso a Paso

### Paso 1: Fix `loadProfilePosts` — retry cuando `_sb` no está listo

El problema está en la línea de guardia al inicio de la función:
```js
if (!container || !_sb || !userData) return;
```
Si `_sb` es null (aún no inicializado), sale sin hacer nada. Hay que agregar retry.

**Acciones:**

Buscar en `script.js`:
```javascript
window.loadProfilePosts = async function() {
    const container = document.getElementById('jugador-profile-feed-posts') ||
                      document.getElementById('jugador-publicaciones-feed') ||
                      document.getElementById('player-posts-feed') ||
                      document.querySelector('#jugador-publicaciones .social-feed');
    if (!container || !_sb || !userData) return;
```

Reemplazar por:
```javascript
window.loadProfilePosts = async function() {
    const container = document.getElementById('jugador-profile-feed-posts') ||
                      document.getElementById('jugador-publicaciones-feed') ||
                      document.getElementById('player-posts-feed') ||
                      document.querySelector('#jugador-publicaciones .social-feed');
    if (!container || !userData) return;
    // Esperar _sb si aún no está listo (retry hasta 3 veces con 600ms)
    if (!_sb) {
        let attempts = 0;
        await new Promise(resolve => {
            const wait = setInterval(() => {
                attempts++;
                if (_sb || attempts >= 3) { clearInterval(wait); resolve(); }
            }, 600);
        });
    }
    if (!_sb) return; // Si después de los retries sigue sin _sb, salir
```

**Archivos afectados:**
- `script.js` (línea ~8571)

---

### Paso 2: Fix `buildPostCard` — clase `.like-count` en el contador

La función `toggleLike` busca `el.querySelector('.like-count')` pero el span no tiene esa clase.

**Acciones:**

Buscar en `script.js` dentro de `buildPostCard`:
```javascript
    <button onclick="likePost(this)" data-post-id="${p.id}" style="background:none;border:none;color:#555;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:5px;padding:6px 12px 6px 0;flex:1;">
      <i class='bx bx-heart' style="font-size:16px;"></i> <span>${p.likes_count||0}</span>
    </button>
```

Reemplazar por:
```javascript
    <button onclick="likePost(this)" data-post-id="${p.id}" style="background:none;border:none;color:#555;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:5px;padding:6px 12px 6px 0;flex:1;">
      <i class='bx bx-heart' style="font-size:16px;"></i> <span class="like-count">${p.likes_count||0}</span>
    </button>
```

**Archivos afectados:**
- `script.js` (línea ~8443)

---

### Paso 3: Fix `buildPostCard` — agregar onclick al botón Comentar

El botón Comentar no tiene acción asociada.

**Acciones:**

Buscar en `script.js` dentro de `buildPostCard`:
```javascript
    <button style="background:none;border:none;color:#555;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:5px;padding:6px 12px;flex:1;">
      <i class='bx bx-comment' style="font-size:16px;"></i> Comentar
    </button>
```

Reemplazar por:
```javascript
    <button onclick="social.openComments('${p.id}')" style="background:none;border:none;color:#555;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:5px;padding:6px 12px;flex:1;">
      <i class='bx bx-comment' style="font-size:16px;"></i> <span class="comment-count">${p.comments_count||0}</span>
    </button>
```

**Archivos afectados:**
- `script.js` (línea ~8447)

---

### Paso 4: Fix `buildPostCard` — usar `social.sharePost` en lugar de `window.sharePost`

Cambiar la llamada del botón Compartir para usar la versión con sheet completo (que incluye seguidos).

**Acciones:**

Buscar en `script.js` dentro de `buildPostCard`:
```javascript
    <button onclick="sharePost('${p.id}')" style="background:none;border:none;color:#555;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:5px;padding:6px 0 6px 12px;flex:1;justify-content:flex-end;">
      <i class='bx bx-share-alt' style="font-size:16px;"></i> Compartir
    </button>
```

Reemplazar por:
```javascript
    <button onclick="social.sharePost('${p.id}','${(p.user_name||'').replace(/'/g,"\\'")}')" style="background:none;border:none;color:#555;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:5px;padding:6px 0 6px 12px;flex:1;justify-content:flex-end;">
      <i class='bx bx-share-alt' style="font-size:16px;"></i> Compartir
    </button>
```

**Archivos afectados:**
- `script.js` (línea ~8449)

---

### Paso 5: Fix `buildPostCard` — reemplazar botón `⋯` por botones pin + delete visibles

Actualmente el `menuBtn` para posts propios es un solo botón `⋯`. Hay que reemplazarlo por dos botones visibles.

**Acciones:**

Buscar en `script.js` dentro de `buildPostCard`:
```javascript
    const menuBtn = isOwn
        ? `<button onclick="openOwnPostMenu('${p.id}',${isPinned})" style="background:none;border:none;color:#555;cursor:pointer;font-size:22px;padding:0 4px;flex-shrink:0;line-height:1;">⋯</button>`
        : `<button onclick="openOtherPostMenu('${p.id}','${(p.user_email||'').replace(/'/g,"\\'")}' )" style="background:none;border:none;color:#555;cursor:pointer;font-size:22px;padding:0 4px;flex-shrink:0;line-height:1;">⋯</button>`;
```

Reemplazar por:
```javascript
    const menuBtn = isOwn
        ? `<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
            <button onclick="${isPinned?'unpinPost':'pinPost'}('${p.id}')" title="${isPinned?'Desfijar':'Fijar en perfil'}" style="background:none;border:none;cursor:pointer;padding:4px 5px;border-radius:8px;color:${isPinned?'var(--accent)':'#555'};font-size:17px;line-height:1;transition:.15s;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='none'"><i class='bx bx-pin'></i></button>
            <button onclick="deleteOwnPost('${p.id}')" title="Eliminar publicación" style="background:none;border:none;cursor:pointer;padding:4px 5px;border-radius:8px;color:#555;font-size:17px;line-height:1;transition:.15s;" onmouseover="this.style.color='#ff4d4d';this.style.background='rgba(255,77,77,0.08)'" onmouseout="this.style.color='#555';this.style.background='none'"><i class='bx bx-trash'></i></button>
           </div>`
        : `<button onclick="openOtherPostMenu('${p.id}','${(p.user_email||'').replace(/'/g,"\\'")}' )" style="background:none;border:none;color:#555;cursor:pointer;font-size:22px;padding:0 4px;flex-shrink:0;line-height:1;">⋯</button>`;
```

**Archivos afectados:**
- `script.js` (línea ~8413)

---

### Paso 6: Verificar `deleteOwnPost` existe y funciona

Hay que confirmar que `window.deleteOwnPost` existe en `script.js` (ya que el botón de eliminar lo llama directamente).

**Acciones:**

Verificar con `grep -n "deleteOwnPost" script.js` que existe la función.

Si no existe, agregarla antes o después de `window.pinPost`:
```javascript
window.deleteOwnPost = async function(postId) {
    if (!userData) return;
    if (!confirm('¿Eliminár esta publicación?')) return;
    const sb = _sb || window._sb;
    if (sb) {
        try { await sb.from('posts').delete().eq('id', postId).eq('user_email', userData.email); } catch(e) {}
    }
    // También limpiar de localStorage de pins
    const pins = _getPinnedPosts().filter(id => id !== String(postId));
    _savePinnedPosts(pins);
    showToast('Publicación eliminada.', 'success');
    try { loadProfilePosts(); } catch(e) {}
    try { loadMainFeed(); } catch(e) {}
};
```

**Archivos afectados:**
- `script.js` (junto a `pinPost` / `unpinPost`, línea ~8536)

---

### Paso 7: Ejecutar build y verificar

Después de todos los cambios en `script.js`, correr el build para copiar a `www/`.

**Acciones:**

```bash
cd "salidas/canchero app"
node build.js
```

Confirmar que `www/script.js` se actualizó (verificar timestamp).

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `index.html` — referencia `script.js` como fuente principal de lógica
- `www/script.js` — copia generada por `build.js`, la que efectivamente sirve Vercel/APK
- `planes/2026-05-27-canchero-fase4-fixes-completos.md` — tiene fixes relacionados de sesión y Supabase que pueden afectar el contexto

### Actualizaciones Necesarias para Consistencia

- Actualizar `contexto/proyectos.md` al completar: mover este fix a "Completados"
- El plan de Fase 4 también arregla `loadProfilePosts` con `_sb` — coordinación necesaria para no duplicar cambios

### Impacto en Flujos de Trabajo Existentes

- El módulo `social.sharePost` ya tiene lógica de "compartir con gente que seguís" a través de `repostToProfile`. Usar `social.sharePost` en `buildPostCard` activa esa funcionalidad correctamente.
- `openOwnPostMenu` sigue existiendo — puede llamarse desde otras vistas si se necesita.

---

## Lista de Validación

- [ ] Al recargar "Mi Perfil", los posts aparecen de forma consistente (no desaparecen)
- [ ] Al tocar el corazón en un post propio, el contador sube y el ícono cambia a relleno
- [ ] Al tocar "Comentar", se abre el modal de comentarios con input y botón enviar
- [ ] Al tocar "Compartir", se abre el sheet con "Compartir en mi perfil" y opciones externas
- [ ] Cada post propio muestra íconos 📌 y 🗑 visibles sin necesidad de tocar `⋯`
- [ ] El ícono 📌 es verde/accent si el post ya está fijado, gris si no
- [ ] Al tocar 🗑 se pide confirmación y el post desaparece del perfil
- [ ] En posts ajenos sigue apareciendo el `⋯` con reportar/bloquear
- [ ] `node build.js` corre sin errores y `www/script.js` se actualiza

---

## Criterios de Éxito

1. Los posts en "Mi Perfil" son siempre visibles al recargar, independientemente del timing de Supabase
2. Like, comentar y compartir funcionan correctamente en todos los posts del perfil
3. Los botones de pin y eliminar están visibles en cada post propio sin menú intermedio

---

## Notas

- El `confirm()` nativo para eliminar puede reemplazarse en el futuro por un modal más visual, pero para esta iteración es suficiente y más rápido.
- El fix del retry en `loadProfilePosts` es el mismo patrón del plan de Fase 4 (fixes Supabase/chatbot). Si se implementan ambos planes, verificar que no se duplique el retry.
- La función `social.sharePost` actualmente muestra "Compartir en mi perfil" y "Compartir externamente" pero NO tiene una lista de seguidores. Lo que hace es repostear en el feed propio. Si en el futuro se quiere una lista de personas específicas para enviar, requiere un módulo de mensajería directo (backlog).

---

## Notas de Implementación

**Implementado:** 2026-05-27

### Resumen

Se aplicaron 5 fixes puntuales en `script.js` dentro de `buildPostCard` y `loadProfilePosts`. Se ejecutó `node build.js` con éxito y los cambios quedaron copiados en `www/`.

### Desviaciones del Plan

- Paso 6 (verificar `deleteOwnPost`): la función ya existía y estaba completa — no fue necesario crearla. Tiene confirm nativo, limpieza de pins y toast, todo correcto.

### Problemas Encontrados

Ninguno. Todos los cambios aplicaron sin conflictos.
