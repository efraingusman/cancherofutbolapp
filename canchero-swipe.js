/* ═══════════════════════════════════════════════════════════════════════
   canchero-swipe.js  ·  Transición horizontal interactiva estilo Instagram
   ─────────────────────────────────────────────────────────────────────────
   · El contenido sigue el dedo en tiempo real (no salto instantáneo)
   · Detecta gesto horizontal vs vertical en los primeros 10px
   · Preserva el scroll vertical: el panel actual se fija EXACTAMENTE donde
     está (sin saltar bajo el navbar) usando su getBoundingClientRect
   · Navegación CIRCULAR: desde cualquier sección se puede deslizar a ambos lados
   · Funciona en: tabs principales y sub-tabs del perfil
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── CONFIG ─────────────────────────────────────────────────────────── */
  var DIST_THRESHOLD  = 0.28;  // fracción del ancho de pantalla para confirmar
  var VEL_THRESHOLD   = 0.40;  // px/ms — velocidad que confirma sin importar distancia
  var ANGLE_MAX       = 25;    // grados desde horizontal — más = scroll vertical
  var SNAP_MS         = 300;   // duración de la animación de snap/cancel
  var DECIDE_PX       = 12;    // píxeles antes de decidir dirección
  var Z_PANEL_CUR     = 60000; // z-index del panel actual (debajo del navbar)
  var Z_PANEL_ADJ     = 59999; // z-index del panel entrante
  var Z_CHROME        = 90000; // z-index forzado para navbars (siempre encima)

  /* ── ORDEN CIRCULAR DE TABS PRINCIPALES (mismo orden que la rueda) ───── */
  /* Mismo orden y mismas secciones que la rueda (las demás viven en BUSCAR) */
  var MAIN_TABS = [
    'partidos', 'buscar', 'feed', 'mensajes', 'perfil',
    'mis-clubes', 'ranking', 'juegos', 'en-vivo'
  ];

  /* ── ORDEN CIRCULAR DE SUB-TABS DEL PERFIL ──────────────────────────── */
  var PROFILE_TABS = ['posts', 'equipos', 'logros', 'info', 'fans'];

  /* ── ESTADO DEL GESTO ───────────────────────────────────────────────── */
  var g = {
    sx: 0, sy: 0,           // posición inicial del toque
    st: 0,                  // timestamp de inicio
    dx: 0,                  // desplazamiento horizontal acumulado
    decided   : false,      // ¿ya decidimos h o v?
    isH       : false,      // ¿decidimos que es horizontal?
    animating : false,      // snap en curso (no aceptar nuevos gestos)
    active    : false,      // arrastre horizontal activo
    curEl  : null,          // elemento de la sección actual
    adjEl  : null,          // elemento de la sección adyacente
    adjDir : 0,             // +1 = adj está a la derecha; -1 = a la izquierda
    ctx    : null,          // 'main' | 'profile'
    switchFn: null,         // función que llama a la navegación real
  };

  function mod(n, m) { return ((n % m) + m) % m; }

  /* ══════════════════════════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════════════════════════ */

  function vw() { return window.innerWidth || document.documentElement.clientWidth; }
  function vh() { return window.innerHeight || document.documentElement.clientHeight || 800; }

  function navH() {
    var n = document.getElementById('main-nav') || document.querySelector('.navbar');
    if (!n) return 0;
    var r = n.getBoundingClientRect();
    /* si el navbar está fijo arriba devuelve su alto; si no es visible, 0 */
    return (r.height && r.top < 60) ? Math.round(r.height) : 0;
  }

  /* Detecta si el elemento está dentro de un contenedor con scroll horizontal */
  function isInsideHScrollable(el) {
    var cur = el, depth = 0;
    while (cur && cur !== document.body && depth < 14) {
      var st = window.getComputedStyle(cur);
      var ox = st.overflowX;
      if ((ox === 'auto' || ox === 'scroll') && cur.scrollWidth > cur.clientWidth + 4) return true;
      cur = cur.parentElement; depth++;
    }
    return false;
  }

  /* Detecta si el toque empezó en un elemento que debe manejar su propio drag */
  function shouldIgnore(el) {
    if (!el) return true;
    var tag = (el.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button') return true;
    if (tag === 'video' || tag === 'canvas') return true;
    if (tag === 'iframe') return true;
    if (el.closest) {
      if (el.closest('[data-no-swipe]')) return true;
      if (el.closest('#player-bottom-nav, #club-bottom-nav')) return true;
      if (el.closest('#ruleta2-wheel-layer, #ruleta2-submenu')) return true;
      if (el.closest('.modal-overlay, .fs-form-card, #mobile-more-menu')) return true;
      if (el.closest('.fs-slider') || el.closest('input[type=range]')) return true;
      if (el.closest('.swiper, .reels-container, .momentos-viewer, .stories-viewer')) return true;
      /* Dentro de un juego NUNCA cambiar de sección con gesto lateral */
      if (el.closest('#cg-player, #adivina-modal, #impostor-modal, #once-modal, #once-mode, .game-screen')) return true;
      /* Carruseles propios (transform-based) */
      if (el.closest('[id^=carousel-], [style*="scroll-snap-type"]')) return true;
    }
    if (isInsideHScrollable(el)) return true;
    return false;
  }

  /* ¿Está la vista del jugador activa? */
  function jugadorActive() {
    var v = document.getElementById('view-jugador');
    return v && v.style.display !== 'none' && v.offsetParent !== null;
  }

  /* Tab principal visible actualmente */
  function currentMainTab() {
    for (var i = 0; i < MAIN_TABS.length; i++) {
      var el = document.getElementById('jugador-' + MAIN_TABS[i]);
      if (el && el.style.display === 'block') return MAIN_TABS[i];
    }
    return null;
  }

  /* Sub-tab de perfil visible actualmente */
  function currentProfileTab() {
    for (var i = 0; i < PROFILE_TABS.length; i++) {
      var el = document.getElementById('jugador-profile-' + PROFILE_TABS[i]);
      if (el && el.style.display !== 'none' && el.offsetParent !== null) return PROFILE_TABS[i];
    }
    return null;
  }

  function isInsideProfileContent(el) {
    if (!el || !el.closest) return false;
    return !!el.closest('#jugador-profile-posts, #jugador-profile-equipos, #jugador-profile-logros, #jugador-profile-predicciones, #jugador-profile-info, #jugador-profile-fans');
  }

  /* ══════════════════════════════════════════════════════════════════════
     POSICIONAMIENTO DURANTE EL SWIPE
     · El panel ACTUAL se fija exactamente donde está ahora (rect actual),
       con su altura de contenido completa → conserva el scroll vertical y
       no salta bajo el navbar.
     · El panel ENTRANTE se muestra desde su tope, justo debajo del navbar.
  ══════════════════════════════════════════════════════════════════════ */
  function prepareSwipe(curEl, adjEl, dir) {
    var w = vw(), h = vh(), nh = navH();

    /* ACTUAL: pin en su posición visual actual (preserva scroll) */
    var rect = curEl.getBoundingClientRect();
    var curTop = Math.round(rect.top);
    var curH   = Math.max(curEl.scrollHeight, h);
    curEl.style.cssText = [
      'position:fixed', 'left:0', 'top:' + curTop + 'px',
      'width:' + w + 'px', 'height:' + curH + 'px',
      'z-index:' + Z_PANEL_CUR, 'margin:0',
      'overflow:hidden', 'background:#0d0d0d',
      'transform:translateX(0)', 'transition:none',
      'will-change:transform', 'display:block'
    ].join(';');

    /* ENTRANTE: viewport debajo del navbar, desde su tope */
    adjEl.style.cssText = [
      'position:fixed', 'left:0', 'top:' + nh + 'px',
      'width:' + w + 'px', 'height:' + (h - nh) + 'px',
      'z-index:' + Z_PANEL_ADJ, 'margin:0',
      'overflow:hidden', 'background:#0d0d0d',
      'transform:translateX(' + (dir * w) + 'px)', 'transition:none',
      'will-change:transform', 'display:block'
    ].join(';');

    /* asegurar que los navbars queden por encima de los paneles */
    setChromeOnTop(true);
  }

  function setChromeOnTop(on) {
    ['main-nav', 'player-bottom-nav', 'club-bottom-nav'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (on) {
        if (el.dataset._z == null) el.dataset._z = el.style.zIndex || '';
        el.style.zIndex = Z_CHROME;
      } else {
        el.style.zIndex = el.dataset._z || '';
        delete el.dataset._z;
      }
    });
  }

  function applyX(el, px, withTransition) {
    if (!el) return;
    el.style.transition = withTransition
      ? 'transform ' + SNAP_MS + 'ms cubic-bezier(0.22,0.61,0.36,1)'
      : 'none';
    el.style.transform = 'translateX(' + px + 'px)';
  }

  /* Limpia los estilos inline de posicionamiento que pusimos */
  function cleanEl(el, display) {
    if (!el) return;
    ['position','top','left','width','height','zIndex','margin',
     'overflow','background','transform','transition','willChange']
      .forEach(function (p) { el.style[p] = ''; });
    el.style.display = display;  /* 'block' | 'none' | '' */
  }

  /* ══════════════════════════════════════════════════════════════════════
     CONFIRMAR O CANCELAR LA NAVEGACIÓN
  ══════════════════════════════════════════════════════════════════════ */
  function commit(doNav) {
    if (g.animating) return;
    g.animating = true;
    /* Watchdog: si algo interrumpe el timeout (re-render, error), liberar
       el gesto igual para que el swipe no "deje de funcionar" */
    setTimeout(function () {
      if (g.animating) { setChromeOnTop(false); g.animating = false; g.active = false; }
    }, SNAP_MS + 600);

    var w     = vw();
    var curEl = g.curEl;
    var adjEl = g.adjEl;
    var sf    = g.switchFn;
    var dir   = g.adjDir;

    if (doNav) {
      applyX(curEl, -dir * w, true);
      applyX(adjEl, 0,        true);
      setTimeout(function () {
        /* 1º navegar con los paneles aún fijos (la pantalla no cambia),
           2º esperar dos frames a que el switch termine de renderizar y
           recién ahí limpiar estilos. Evita el re-layout visible
           ("ajuste de tamaño") al pasar de sección. */
        try { window.scrollTo(0, 0); } catch (e) {}
        if (sf) { try { sf(); } catch (e) {} }
        requestAnimationFrame(function () { requestAnimationFrame(function () {
          cleanEl(curEl, 'none');
          cleanEl(adjEl, 'block');
          setChromeOnTop(false);
          g.animating = false; g.active = false;
        }); });
      }, SNAP_MS + 20);
    } else {
      applyX(curEl, 0,       true);
      applyX(adjEl, dir * w, true);
      setTimeout(function () {
        cleanEl(curEl, 'block');  /* restaurar la tab actual visible */
        cleanEl(adjEl, 'none');   /* ocultar el adyacente */
        setChromeOnTop(false);
        g.animating = false; g.active = false;
      }, SNAP_MS + 20);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     EVENTOS TÁCTILES
  ══════════════════════════════════════════════════════════════════════ */

  document.addEventListener('touchstart', function (e) {
    if (g.animating) return;
    var t = e.touches[0];
    g.sx = t.clientX; g.sy = t.clientY; g.st = Date.now();
    g.dx = 0; g.decided = false; g.isH = false; g.active = false;
    g.curEl = null; g.adjEl = null; g.switchFn = null;
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (g.animating) return;
    var t = e.touches[0];
    var dx = t.clientX - g.sx;
    var dy = t.clientY - g.sy;

    /* ── FASE DE DECISIÓN ── */
    if (!g.decided && (Math.abs(dx) > DECIDE_PX || Math.abs(dy) > DECIDE_PX)) {
      var angle = Math.abs(Math.atan2(Math.abs(dy), Math.abs(dx)) * 180 / Math.PI);
      g.isH = (angle < ANGLE_MAX);
      g.decided = true;

      if (g.isH) {
        if (!jugadorActive()) { g.isH = false; return; }
        var startEl = document.elementFromPoint(g.sx, g.sy);
        if (shouldIgnore(startEl)) { g.isH = false; return; }

        var perfil = document.getElementById('jugador-perfil');
        var inPerfil = perfil && perfil.style.display === 'block';

        if (inPerfil && isInsideProfileContent(startEl)) {
          /* ── SUB-TABS DE PERFIL (circular) ── */
          if (!setupProfileSwipe(dx)) { g.isH = false; return; }
        } else {
          /* ── TABS PRINCIPALES (circular) ── */
          if (!setupMainSwipe(dx)) { g.isH = false; return; }
        }

        prepareSwipe(g.curEl, g.adjEl, g.adjDir);
        g.active = true;
      }
    }

    /* ── FASE DE ARRASTRE ── */
    if (g.active && g.isH) {
      e.preventDefault();
      g.dx = dx;
      var w = vw();
      applyX(g.curEl, dx,                 false);
      applyX(g.adjEl, g.adjDir * w + dx,  false);
    }
  }, { passive: false });

  document.addEventListener('touchend', function () {
    if (!g.active || g.animating) return;
    var w        = vw();
    var elapsed  = Math.max(1, Date.now() - g.st);
    var velocity = Math.abs(g.dx) / elapsed;
    var enoughD  = Math.abs(g.dx) > w * DIST_THRESHOLD;
    var enoughV  = velocity > VEL_THRESHOLD;
    var rightDir = (g.adjDir === 1 && g.dx < 0) || (g.adjDir === -1 && g.dx > 0);
    commit(rightDir && (enoughD || enoughV));
  }, { passive: true });

  document.addEventListener('touchcancel', function () {
    if (g.active && !g.animating) commit(false);
  }, { passive: true });

  /* ══════════════════════════════════════════════════════════════════════
     SETUP DE CADA CONTEXTO (devuelve true si quedó listo)
  ══════════════════════════════════════════════════════════════════════ */

  function setupMainSwipe(dx) {
    var cur = currentMainTab();
    if (!cur) return false;
    var idx = MAIN_TABS.indexOf(cur);
    if (idx === -1) return false;
    var dir = dx > 0 ? -1 : 1;                  // arrastra a la izq → entra el de la derecha
    var ni  = mod(idx + dir, MAIN_TABS.length); // CIRCULAR

    var curEl = document.getElementById('jugador-' + cur);
    var adjEl = document.getElementById('jugador-' + MAIN_TABS[ni]);
    if (!curEl || !adjEl) return false;

    g.ctx = 'main'; g.adjDir = dir; g.curEl = curEl; g.adjEl = adjEl;
    var adjTabId = MAIN_TABS[ni];

    /* JUEGOS: pre-renderizar el hub para que se vea durante el arrastre */
    if (adjTabId === 'juegos' && window._renderGamesHub && !adjEl.querySelector('#games-hub')) {
      try { window._renderGamesHub(adjEl); } catch (e) {}
    }

    g.switchFn = function () {
      if (adjTabId === 'juegos') {
        /* No pasar por switchDashboardTab (cerraría overlays de juego);
           openGamesModal deja la pestaña y la ruleta consistentes */
        try { if (window.openGamesModal) window.openGamesModal(); } catch (e) {}
        return;
      }
      if (typeof window.switchDashboardTab === 'function')
        window.switchDashboardTab('jugador', adjTabId, null);
      try { if (window._ruleta2SyncTab) window._ruleta2SyncTab(adjTabId); } catch (e) {}
    };
    return true;
  }

  function setupProfileSwipe(dx) {
    var cur = currentProfileTab();
    if (!cur) return false;
    var idx = PROFILE_TABS.indexOf(cur);
    if (idx === -1) return false;
    var dir = dx > 0 ? -1 : 1;
    var ni  = mod(idx + dir, PROFILE_TABS.length);  // CIRCULAR

    var curEl = document.getElementById('jugador-profile-' + cur);
    var adjEl = document.getElementById('jugador-profile-' + PROFILE_TABS[ni]);
    if (!curEl || !adjEl) return false;

    g.ctx = 'profile'; g.adjDir = dir; g.curEl = curEl; g.adjEl = adjEl;

    var adjTabId  = PROFILE_TABS[ni];
    var barEl     = document.querySelector('#jugador-perfil .profile-tabs-bar');
    var adjTabBtn = barEl ? barEl.querySelectorAll('.profile-tab')[ni] : null;

    g.switchFn = function () {
      if (typeof window.switchProfileTab === 'function' && adjTabBtn) {
        window.switchProfileTab('jugador', adjTabId, adjTabBtn);
      } else {
        var prof = document.querySelector('#jugador-perfil .social-profile');
        if (prof) {
          prof.querySelectorAll('.profile-tab-content').forEach(function (c) { c.style.display = 'none'; });
          var t2 = document.getElementById('jugador-profile-' + adjTabId);
          if (t2) t2.style.display = 'block';
        }
        if (barEl) {
          barEl.querySelectorAll('.profile-tab').forEach(function (b) { b.classList.remove('active'); });
          if (adjTabBtn) adjTabBtn.classList.add('active');
        }
      }
    };
    return true;
  }

  /* ══════════════════════════════════════════════════════════════════════
     SINCRONIZACIÓN CON RULETA NAV v2
  ══════════════════════════════════════════════════════════════════════ */
  var TAB_TO_OPTS_ID = {
    'partidos':'partidos', 'buscar':'buscar',
    'feed':'feed', 'mensajes':'mensajes', 'perfil':'perfil', 'mis-clubes':'equipos',
    'ranking':'ranking', 'juegos':'juegos', 'en-vivo':'envivo'
  };
  window._ruleta2SyncTab = function (tabId) {
    try {
      /* Sync SOLO visual de la barra — _ruleta2SelectById re-activaría la
         sección (segundo switchDashboardTab) y causa el salto/re-render */
      var optsId = TAB_TO_OPTS_ID[tabId];
      if (!optsId) return;
      if (window._ruleta2SyncById) window._ruleta2SyncById(optsId);
      else if (window._ruleta2SelectById) window._ruleta2SelectById(optsId);
    } catch (e) {}
  };

  /* ══════════════════════════════════════════════════════════════════════
     CSS DE SOPORTE
  ══════════════════════════════════════════════════════════════════════ */
  var style = document.createElement('style');
  style.textContent = [
    '.dashboard-tab-content { backface-visibility: hidden; }',
    '.profile-tab-content   { backface-visibility: hidden; }',
  ].join('\n');
  document.head.appendChild(style);

  console.log('[Canchero] Swipe navigation v2 (circular + scroll-safe) loaded');
})();
