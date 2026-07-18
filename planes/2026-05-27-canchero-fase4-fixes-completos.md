# Plan: Canchero — Fase 4: Fixes Críticos + Juegos + Clubes + Admin

**Creado:** 2026-05-27
**Estado:** Borrador
**Pedido:** Arreglar sesión, posts/stories, juegos locales, disponibilidad, apodo, organizaciones negras, ciudades sin foto, torneos en búsqueda, clubes completos, admin mejorado.

---

## Descripción General

### Qué Logra Este Plan

Corrige todos los problemas críticos de Canchero que impiden el uso normal: la sesión cierra sola, los posts no aparecen, los juegos dan error CORS, el punto de disponibilidad es rojo, las organizaciones abren en negro. Además agrega 5 juegos de fútbol locales (sin dependencias externas), el campo apodo en registro, y la sección de clubes completa con dashboard de estrategias, finanzas y plantilla.

### Por Qué Importa

Sin estas correcciones la app es inutilizable: el usuario no puede mantener sesión, no puede publicar, no puede jugar. Es la base de confianza de la plataforma.

---

## Estado Actual

### Estructura Existente Relevante

- `index.html` — HTML principal (root), 3900+ líneas
- `script.js` — Lógica JS (root), 8100+ líneas  
- `style.css` — Estilos (root)
- `build.js` — Copia root → www/, debe ejecutarse antes del deploy
- `vercel.json` — Config de Vercel con función `api/gameproxy.js`
- `api/gameproxy.js` — Proxy de juegos (existe pero falla por Flash/CORS)
- `games/` — Directorio recién creado para juegos locales HTML5

### Brechas o Problemas que se Abordan

1. **Sesión cierra sola**: `userData` no se restaura al recargar aunque Supabase `persistSession:true` ya está configurado. El problema está en que `restoreSession()` corre pero `applyUserData()` / `navigate()` se llaman antes de que el DOM esté listo.
2. **Logo cierra sesión**: El onclick ya está correcto (`userData ? navigate(rol) : navigate('home')`) pero `userData` es undefined al cargar.
3. **Posts no aparecen**: `loadMainFeed` chequea `if (!_sb)` pero debería `_sb || window._sb`.
4. **Juegos CORS**: gatoconbota.com usa Flash (Ruffle) que bloquea fetch cross-origin. Solución: juegos HTML5 locales.
5. **Organizaciones negra**: `openDirectorioModal('organizaciones')` llama código que genera HTML vacío.
6. **Punto disponibilidad rojo**: El dot usa color hardcodeado rojo en lugar de leer `userData.available`.
7. **Buscar torneos encima**: El link de torneos fue puesto fuera del panel de búsqueda en el hamburguesa.
8. **Ciudades sin foto**: Los cards de ciudad no tienen URLs de imagen definidas.
9. **Apodo**: No existe campo `nickname` en el formulario de registro.
10. **Clubes**: El dashboard de club está incompleto — sin tablero táctico, finanzas, plantilla, chat.

---

## Cambios Propuestos

### Resumen de Cambios

- Arreglar restauración de sesión (ejecutar después de DOMContentLoaded)
- Arreglar `loadMainFeed` y todas las funciones de feed/stories con `_sb || window._sb`
- Crear 5 juegos HTML5 locales en `games/`
- Actualizar catálogo y modal de juegos
- Punto de disponibilidad: verde cuando activo
- Mover link torneos dentro del panel de búsqueda del hamburguesa
- Fotos de ciudad para los cards del directorio
- Campo apodo en registro + mostrar en perfil y posts
- Dashboard de club completo con tabs: Tablero, Plantilla, Entrenamientos, Finanzas
- Admin: métricas, gestión de clubes, reportes
- Fix organizaciones (pantalla negra)
- Fix fotos de perfil/portada (quality + position)

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
|---|---|
| `games/juggling.html` | Juego Keeppy Uppy — mantener pelota en el aire |
| `games/penalty.html` | Juego Tiro Libre — patear penales |
| `games/goalkeeper.html` | Juego Arquero — parar penales |
| `games/headball.html` | Juego Cabezazo — cabecear pelota |
| `games/trivia.html` | Trivia de Fútbol — preguntas con timer |
| `planes/2026-05-27-canchero-fase4-fixes-completos.md` | Este plan |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
|---|---|
| `script.js` | Sesión, feeds, juegos, disponibilidad, apodo, clubes, admin, organizaciones |
| `index.html` | Modal juegos dinámico, campo apodo, torneos en búsqueda, tabs de club |
| `style.css` | Estilos club dashboard, disponibilidad badge, games modal responsive |
| `vercel.json` | Asegurar que `games/` se sirva correctamente |

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Juegos locales vía Canvas API**: Evita completamente CORS. Archivos HTML autocontenidos sin dependencias externas. Funcionan offline en APK.
2. **Restauración de sesión en DOMContentLoaded**: Evita race condition con el DOM. Usa `_sb.auth.getSession()` + fallback `localStorage.getItem('canchero_user')`.
3. **`_sb || window._sb` en todas las funciones**: Patrón consistente para evitar que una variable no inicializada bloquee funcionalidad.
4. **Dashboard de club como tabs dentro del view-club existente**: No crear nueva vista, agregar tabs al sidebar existente del club.
5. **Tablero táctico con Canvas**: Sin librerías externas, dibujado libre sobre campo de fútbol SVG.

### Alternativas Consideradas

- **Proxy mejorado para juegos externos**: Rechazado porque Flash/Ruffle siempre fallará en CORS independientemente del proxy.
- **iframe sandboxed**: Rechazado porque Flash no corre en sandboxed iframes.
- **Restaurar sesión en `<script>` inline**: Rechazado porque el DOM no está listo y `navigate()` falla.

### Preguntas Abiertas

Ninguna — todo puede implementarse con la información actual.

---

## Tareas Paso a Paso

### Paso 1: Arreglar restauración de sesión y logo

**Objetivo**: Al recargar la página, si hay sesión de Supabase activa, restaurar `userData` y navegar al dashboard sin pedir login. El logo debe ir al perfil, no al home.

**Acciones en `script.js`**:
- Mover la función `restoreSession()` para que se ejecute dentro de un listener `document.addEventListener('DOMContentLoaded', ...)` y además tenga un fallback de localStorage
- La función debe: 1) intentar `_sb.auth.getSession()`, 2) si hay sesión, buscar perfil en `users` table, 3) si no hay en `users`, buscar en `profiles`, 4) setear `userData` y llamar `navigate()` + `applyUserData()`
- Agregar fallback: si `_sb` tarda o falla, leer `canchero_user` de localStorage

**Código a reemplazar** (bloque actual en líneas 22-37):
```js
// Restaurar sesión al cargar
(async function restoreSession() {
    if (!_sb) return;
    ...
})();
```
**Por**:
```js
// Restaurar sesión — esperar al DOM para poder navegar
window._sessionRestored = false;
async function _restoreSessionNow() {
    if (window._sessionRestored) return;
    window._sessionRestored = true;
    const sb = _sb || window._sb;
    if (!sb) {
        // Fallback: localStorage
        const saved = localStorage.getItem('canchero_user');
        if (saved) { try { const u=JSON.parse(saved); if(u&&u.email&&u.role){ window.userData=u; if(typeof applyUserData==='function') applyUserData(); if(typeof navigate==='function') navigate(u.role==='club'?'club':u.role==='admin'?'admin':'jugador'); } } catch(e){} }
        return;
    }
    try {
        const { data: { session } } = await sb.auth.getSession();
        if (session?.user && !window.userData) {
            const email = session.user.email;
            // Intentar tabla 'users' primero, luego 'profiles'
            let profile = null;
            const r1 = await sb.from('users').select('*').eq('email', email).maybeSingle();
            profile = r1.data;
            if (!profile) { const r2 = await sb.from('profiles').select('*').eq('email', email).maybeSingle(); profile = r2.data; }
            if (profile) {
                window.userData = profile;
                localStorage.setItem('canchero_user', JSON.stringify(profile));
                if (typeof applyUserData === 'function') applyUserData();
                if (typeof navigate === 'function') navigate(profile.role === 'club' ? 'club' : profile.role === 'admin' ? 'admin' : 'jugador');
            } else {
                // Usuario Auth pero sin perfil — chequear localStorage
                const saved = localStorage.getItem('canchero_user');
                if (saved) { try { const u=JSON.parse(saved); if(u&&u.email===email){ window.userData=u; if(typeof applyUserData==='function') applyUserData(); if(typeof navigate==='function') navigate(u.role==='club'?'club':u.role==='admin'?'admin':'jugador'); } } catch(e){} }
            }
        } else if (!session) {
            // Sin sesión Supabase — intentar localStorage
            const saved = localStorage.getItem('canchero_user');
            if (saved) { try { const u=JSON.parse(saved); if(u&&u.email&&u.role){ window.userData=u; if(typeof applyUserData==='function') applyUserData(); if(typeof navigate==='function') navigate(u.role==='club'?'club':u.role==='admin'?'admin':'jugador'); } } catch(e){} }
        }
    } catch(e) {
        const saved = localStorage.getItem('canchero_user');
        if (saved) { try { const u=JSON.parse(saved); if(u&&u.email&&u.role){ window.userData=u; if(typeof applyUserData==='function') applyUserData(); if(typeof navigate==='function') navigate(u.role==='club'?'club':u.role==='admin'?'admin':'jugador'); } } catch(e2){} }
    }
}
document.addEventListener('DOMContentLoaded', () => { setTimeout(_restoreSessionNow, 200); });
```

**Archivos afectados**: `script.js`

---

### Paso 2: Arreglar loadMainFeed y funciones de feed

**Acciones**:
- En `loadMainFeed`: cambiar `if (!_sb)` por `const sb = _sb || window._sb; if (!sb)`
- Reemplazar todas las referencias `_sb.from(` dentro de `loadMainFeed` por `sb.from(`
- En `_sortPostsByPriority`: ya usa `_sb || window._sb`
- En `loadFeedStories` / `initFeedStoriesBar`: ya correcto
- En `publishStory`: ya correcto
- En `createFeedPost`: ya correcto
- En `blockUser`: cambiar `alert('Iniciá sesión primero.')` por `showToast(...)` y usar `_sb || window._sb`
- En `openStartLiveModal` (segunda definición alrededor línea 8050+): eliminar esa segunda definición

**Archivos afectados**: `script.js`

---

### Paso 3: Crear 5 juegos HTML5 locales

Crear los archivos en `games/`. Ver código completo en la sección de implementación. Todos usan Canvas API puro.

**Archivos afectados**: `games/juggling.html`, `games/penalty.html`, `games/goalkeeper.html`, `games/headball.html`, `games/trivia.html`

---

### Paso 4: Actualizar catálogo y modal de juegos

**En `script.js`**:
- Reemplazar `_GAMES_CATALOG` con los 5 juegos nuevos
- `_buildGameProxyUrl(gameId)` → retorna `${origin}/games/${gameId}.html`
- `openGamesModal()` → renderiza dinámicamente desde `_GAMES_CATALOG`

**En `index.html`**:
- El div `id="games-list"` reemplaza el contenido hardcodeado del modal

**Archivos afectados**: `script.js`, `index.html`

---

### Paso 5: Fix punto de disponibilidad (rojo → verde)

**En `script.js`**:
- Agregar función `updateAvailabilityDot(isAvailable)`: cambia color del dot a `#00ff88` (verde) o `#555` (gris)
- En `toggleDisponibilidad` o donde se maneje el toggle: llamar `updateAvailabilityDot`
- Al cargar perfil: leer `userData.available` y aplicar
- En `buildPostCard(p)`: si `p.user_available`, agregar badge verde pequeño "🟢 DISPONIBLE"

**Archivos afectados**: `script.js`

---

### Paso 6: Mover "Buscar torneos" dentro del panel de búsqueda

**En `index.html`**: El link "Buscar torneos y ligas →" que estaba puesto encima del buscador en el hamburguesa debe estar DENTRO del dropdown de resultados de búsqueda, o como botón dentro del área de búsqueda del menú hamburguesa.

Específicamente: en el menú hamburguesa mobile, dentro del panel de búsqueda (donde están los inputs), agregar botón de torneos como opción de acceso rápido bajo el input, no encima de él.

**Archivos afectados**: `index.html`

---

### Paso 7: Modal TORNEOS Y LIGAS + botón en hamburguesa

**En `index.html`**:
- Reemplazar botón EVENTOS en hamburguesa por TORNEOS Y LIGAS
- Agregar modal `id="torneos-modal"` con filtros país/ciudad/tipo

**En `script.js`**:
- `openTorneosModal()`, `closeTorneosModal()`, `loadTorneos()`, `renderTorneoCard(t)`

**Archivos afectados**: `script.js`, `index.html`

---

### Paso 8: Fotos de ciudades en directorio

**En `script.js`**: Buscar donde se renderizan las cards de ciudad (`URUGUAY_DEPTS` o similar). Agregar URLs de imagen de Unsplash para cada departamento de Uruguay.

Mapeo de imágenes para los 19 departamentos de Uruguay usando Unsplash (gratuitas):
```js
const DEPT_IMAGES = {
    'Montevideo': 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=400&q=80',
    'Canelones': 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=400&q=80',
    'Maldonado': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80',
    // etc — usar fotos de playas/ciudad para cada depto
};
```

**Archivos afectados**: `script.js`

---

### Paso 9: Campo apodo en registro

**En `index.html`**: Agregar `<input id="reg-nickname">` en el form de registro, después del campo de nombre.

**En `script.js`**: En la función de registro (donde se inserta en tabla `users`), incluir `nickname: document.getElementById('reg-nickname')?.value?.trim() || null`.

En `buildPostCard(p)`: si `p.user_nickname`, mostrar `(${p.user_nickname})` en gris al lado del nombre.

En perfil: si `userData.nickname`, mostrar debajo del nombre en color `#666`, font-size 12px.

**Archivos afectados**: `index.html`, `script.js`

---

### Paso 10: Fix Organizaciones (pantalla negra)

**Investigar**: `openDirectorioModal('organizaciones')` → `generateOrganizacionesHTML()` probablemente retorna HTML vacío o hay un error silencioso.

**Fix**: Asegurar que la función de organizaciones tenga contenido real o un estado vacío visible. Buscar la función generadora y agregar manejo de error y estado vacío con mensaje claro.

**Archivos afectados**: `script.js`

---

### Paso 11: Dashboard de Club completo

**Tabs a agregar en el view-club**:
- **TABLERO**: Canvas con campo de fútbol, herramientas de dibujo (lápiz, borrador, colores)
- **PLANTILLA**: Lista de jugadores del club desde Supabase (`club_members` table o `users` con `club_id`)
- **ENTRENAMIENTOS**: Lista con fecha, hora, asistencia
- **FINANZAS**: Lista de miembros con estado de pago (pagado/pendiente)
- **CHAT GRUPAL**: Integrado con la tabla `messages` filtrando por `club_id`

**En `index.html`**: Agregar los tabs al sidebar del dashboard de club.
**En `script.js`**: Funciones: `renderClubTablero()`, `renderClubPlantilla()`, `renderClubEntrenamientos()`, `renderClubFinanzas()`.

**Archivos afectados**: `index.html`, `script.js`

---

### Paso 12: Admin — métricas y gestión

**En `index.html`** (dashboard admin): Agregar sección de métricas con contadores de usuarios por tipo.
**En `script.js`**: Función `loadAdminMetrics()` que hace queries a Supabase para contar registros.

**Archivos afectados**: `index.html`, `script.js`

---

### Paso 13: Build y Deploy

```bash
cd "C:\Users\Cliente\Documents\canchero app" && node build.js && npx vercel --prod --yes
```

---

## Lista de Validación

- [ ] Al recargar la página con sesión activa → va directo al dashboard sin pedir login
- [ ] Al hacer click en el logo con sesión → va al perfil, NO al home
- [ ] Publicar un post → aparece en el feed inmediatamente
- [ ] Publicar una historia → aparece en la barra de stories
- [ ] Juegos: abrir cada uno de los 5 → se cargan y son jugables
- [ ] Disponibilidad: activar toggle → dot se pone verde
- [ ] Disponibilidad: aparece badge verde en posts del feed
- [ ] EVENTOS reemplazado por TORNEOS Y LIGAS en hamburguesa
- [ ] Modal de torneos abre con filtros funcionales
- [ ] "Buscar torneos" está DENTRO del panel de búsqueda, no encima
- [ ] Organizaciones → modal abre con contenido, no pantalla negra
- [ ] Ciudades en directorio → muestran foto
- [ ] Registro → campo apodo disponible
- [ ] Apodo → aparece en perfil y en posts
- [ ] Club dashboard → tabs Tablero, Plantilla, Entrenamientos, Finanzas funcionan
- [ ] Admin → métricas de usuarios visibles

## Criterios de Éxito

1. El usuario puede abrir la app y quedar logueado automáticamente si ya había iniciado sesión antes
2. Los posts y stories aparecen correctamente después de publicar
3. Los 5 juegos se cargan y son jugables sin errores CORS
4. El punto de disponibilidad es verde cuando está activo y aparece en el feed

---

## Notas

- La tabla en Supabase puede llamarse `users` o `profiles` — el código intenta ambas
- Los juegos deben incluirse en `build.js` para que se copien a `www/games/`
- Para el APK (Capacitor), los juegos en `games/` se copian automáticamente con el resto de `www/`
- Los juegos usan `requestAnimationFrame` — no necesitan cleanup especial al cerrar el modal (el iframe se limpia con `src=''`)
