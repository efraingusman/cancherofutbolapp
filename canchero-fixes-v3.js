/**
 * canchero-fixes-v3.js — Arreglos transversales
 * 1) Salir deslizando a la derecha de cualquier pantalla/overlay full-screen.
 * 2) Cerrar overlays (Juegos, etc.) al cambiar de sección.
 * 3) Reels: tocar el video pausa/reanuda (P6.2) — lo maneja _reelTogglePause.
 */
(function(){
'use strict';

// Overlays full-screen que se cierran con swipe-derecha (orden = prioridad/topmost)
const OVERLAYS = [
  'momento-viewer','crear-momento-modal','momentos-explorer',
  'directo-viewer','crear-directo-modal',
  'adivina-modal','impostor-modal','once-modal','cg-player','games-hub',
  'deb-comments-modal','crear-debate-modal',
  'mv2-ficha','vup-modal-overlay','buscar-disp-modal','clubes-buscan-page',
  'match-detail-modal','prediction-modal','club-profile-modal','debate-room',
  // Vistas de negocio: si quedan abiertas, la barra inferior "no navega" (P: barra siempre navega)
  'biz-product-view','biz-reserva-screen','reels-modal'
];
function topOverlay(){
  for (const id of OVERLAYS){
    const el = document.getElementById(id);
    if (el && el.style.display !== 'none' && document.body.contains(el)) return el;
  }
  return null;
}
function closeOverlay(el){
  // Si tiene botón de volver/cerrar, simularlo; si no, remover/ocultar
  if (el.id === 'vup-modal-overlay' || el.id==='buscar-disp-modal' || el.id==='clubes-buscan-page') { el.remove(); return; }
  el.remove();
}

/* ── 1) SWIPE DERECHA → cerrar overlay ── */
let _sx=0,_sy=0,_swActive=false;
document.addEventListener('touchstart', function(e){
  if (e.touches.length!==1){ _swActive=false; return; }
  // ignorar si empieza en un carrusel horizontal / inputs
  if (e.target.closest && e.target.closest('input,textarea,[data-no-swipe],.stories-bar,[style*="overflow-x"]')) { _swActive=false; return; }
  _sx=e.touches[0].clientX; _sy=e.touches[0].clientY; _swActive=true;
}, {passive:true});
document.addEventListener('touchend', function(e){
  if (!_swActive) return; _swActive=false;
  const dx=e.changedTouches[0].clientX-_sx, dy=e.changedTouches[0].clientY-_sy;
  if (dx>85 && Math.abs(dy)<60){
    const ov = topOverlay();
    if (ov){ closeOverlay(ov); e.stopPropagation?.(); }
  }
}, {passive:true});

/* ── 2) Cerrar overlays al cambiar de sección ── */
const _origSwitch = window.switchDashboardTab;
if (typeof _origSwitch === 'function'){
  window.switchDashboardTab = function(){
    OVERLAYS.forEach(id=>{ const el=document.getElementById(id); if(el) el.remove(); });
    // cerrar también reels si está abierto
    const reels=document.getElementById('reels-modal'); if(reels) reels.remove();
    return _origSwitch.apply(this, arguments);
  };
}

/* ── 3) Reels: el tap sobre el video PAUSA/REANUDA (P6.2).
   El sonido se maneja con el botón de parlante de la columna de acciones.
   (El handler viejo en captura hacía stopPropagation+play() y anulaba la pausa.) ── */

/* ── 4) CHAT: colores Canchero (sin verde) — solo CSS suave ── */
(function injectChatCSSv3(){
  const old = document.getElementById('chat-css-v3'); if (old) old.remove();
  const st = document.createElement('style'); st.id='chat-css-v3';
  st.textContent = `
    /* FIX CRÍTICO: dashboard-content tiene will-change:transform que rompía el
       position:fixed del chat (lo posicionaba a 70px y el input caía fuera de pantalla) */
    main.dashboard-content, .dashboard-content { will-change:auto !important; }
    .msg-chat-area, .msg-chat-area.mobile-open, .msg-thread-header, .msg-thread-messages,
    #jugador-mensajes, #club-mensajes, .messaging-layout, .msg-sidebar, #msg-chat-list {
      background:var(--bg-main,#070907) !important;
    }
    /* sin bordes verdes */
    .messaging-layout, .msg-chat-area, .msg-sidebar { border-color:#1a1f1a !important; }
    /* Layout del chat abierto: columna full-height que encaja (scoped a .mobile-open,
       así al cerrar se revierte solo y el botón Volver funciona) */
    /* Chat abierto: arranca DEBAJO del header global (logo + campana + ajustes
       siempre visibles) — pedido 2026-06-11 */
    .msg-chat-area.mobile-open {
      position:fixed !important; inset:var(--nav-h,70px) 0 0 0 !important;
      height:calc(100dvh - var(--nav-h,70px)) !important; max-height:calc(100dvh - var(--nav-h,70px)) !important;
      display:flex !important; flex-direction:column !important; overflow:hidden !important; z-index:899 !important;
    }
    .msg-chat-area.mobile-open .msg-thread-header { flex:0 0 auto !important; }
    .msg-chat-area.mobile-open .msg-thread-messages { flex:1 1 auto !important; min-height:0 !important; overflow-y:auto !important; }
    .msg-chat-area.mobile-open #msg-typing-indicator, .msg-chat-area.mobile-open #msg-reply-preview, .msg-chat-area.mobile-open #msg-search-bar { flex:0 0 auto !important; }
    .msg-chat-area.mobile-open .msg-input-area { flex:0 0 auto !important; }
    /* Burbujas claramente diferenciadas (estilo Instagram, identidad Canchero) */
    .msg-bubble.mine { background:#1f6b32 !important; color:#fff !important; }
    .msg-bubble.mine .msg-time { color:#cfe8d4 !important; }
    .msg-bubble.theirs { background:#262a2e !important; color:#fff !important; }
    .msg-time { opacity:.7 !important; }
    /* Ocultar videollamada externa */
    .msg-thread-header button[onclick*="_startCall"] { display:none !important; }
  `;
  document.head.appendChild(st);
})();

/* ── 4b) (Eliminado) — el fix de will-change ya resuelve el layout del chat.
   Antes forzábamos estilos inline que se quedaban pegados y rompían el botón Volver. ── */

console.log('[canchero-fixes-v3] ✅ swipe-back + cerrar overlays + reels sonido + chat CSS');
})();
