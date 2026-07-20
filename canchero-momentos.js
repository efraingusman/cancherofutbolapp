/**
 * canchero-momentos.js v2 — MOMENTOS (Stories por categoría)
 * ─────────────────────────────────────────────────────────────
 * · Reemplaza la barra de historias en el feed con momentos agrupados por categoría
 * · Cada categoría aparece como un círculo de historia (estilo Instagram)
 * · Momentos vistos desaparecen del feed para ese usuario (localStorage)
 * · Visor tipo Instagram Stories: pantalla completa, toque para avanzar,
 *   barra de progreso en la parte superior
 * · Categoría requerida y visible al subir un momento
 * · "Mi Día" — categoría especial para subir lo que estás haciendo
 * · Explorador: bloques por categoría con filtros
 */
(function(){
'use strict';
const sb = () => window._sb;
// Restore bottom nav when stories viewer is removed
const _momRestoreNav = () => { try { const bn = document.getElementById('bottom-nav'); if (bn) bn.style.display = ''; } catch(e){} };
new MutationObserver(muts => { muts.forEach(m => m.removedNodes.forEach(n => { if (n.id === 'mom-stories-viewer') _momRestoreNav(); })); }).observe(document.body || document.documentElement, { childList: true });
const me = () => window.userData;
function toast(m,t){ if(window.showToast) showToast(m,t); }

/* ── AUTOR DEL MOMENTO: LA IDENTIDAD ACTIVA ──────────────────────
   Antes se sellaba me().name / me().photo, o sea el JUGADOR base: un momento
   publicado como organización salía con el nombre y la foto del jugador.
   window.userData no sirve como fuente — con el overlay de identidad queda como
   shell 'jugador' hasta que resuelve _loadMyBusinesses (async). La fuente única
   es _pubAvatar() / _pubRole() / _pubBizId().                                   */
window._momAuthorFields = function(){
    const u = window.userData || {};
    let av = null;
    try { av = window._pubAvatar && window._pubAvatar(); } catch(e){}
    const f = {
        user_email: u.email,
        user_name: (av && av.name) || u.name || u.email
    };
    // Estas dos pueden no existir todavía en el esquema (migración pendiente).
    // _momInsert las saca sola si el server las rechaza.
    if (av && av.photo) f.user_photo = av.photo;
    if (av && av.photo_style) f.user_photo_style = av.photo_style;
    return f;
};

/* Insert tolerante al esquema: si una columna no existe todavía, la saca y
   reintenta en vez de perder el momento entero con un 400 silencioso.          */
window._momInsert = async function(fields){
    let payload = Object.assign({}, fields);
    for (let i = 0; i < 6; i++) {
        const r = await sb().from('momentos').insert(payload);
        if (!r || !r.error) return r;
        const m = /column "?([a-z_]+)"?/i.exec(r.error.message || '');
        if (m && Object.prototype.hasOwnProperty.call(payload, m[1])) {
            delete payload[m[1]];
            continue;
        }
        return r;
    }
    return { error: { message: 'demasiados reintentos' } };
};

/* ── CATEGORÍAS ─────────────────────────────────────────────── */
/* Categorías pensadas en los usos reales del futbolero:
   Momento (algo random de tu día) · Viendo el partido · Jugando · Goles ·
   Entrenamiento · Camisetas (colección/outfit) · Lifestyle · Moda · Hinchada
   (tribuna/banderas) · Previa (asado/juntada antes del partido).
   'Mi Día' se mantiene como clave interna para los momentos viejos. */
/* 6 tipos fijos (pedido 2026-07-08): Momentos, Jugadas, Celebraciones,
   Detrás de la cancha, Ventas, Convocatorias. 'Mi Día' es la clave interna
   legacy y se muestra como "Momentos". */
const CATS_FEED = ['Mi Día','Jugadas','Celebraciones','Detrás de la cancha','Ventas','Convocatorias'];
const CATS_UPLOAD = CATS_FEED;
const CATS_EXPLORER = ['Todos',...CATS_FEED];
const CAT_LABEL = { 'Mi Día':'Momentos', 'Detrás de la cancha':'Detrás' };

const CAT_BX = {
  'Todos':'bx-grid-alt','Mi Día':'bx-camera','Jugadas':'bx-football','Celebraciones':'bx-party',
  'Detrás de la cancha':'bx-camera-movie','Ventas':'bx-purchase-tag','Convocatorias':'bx-user-plus',
  // claves legacy (momentos viejos siguen agrupando bien)
  'Viendo el partido':'bx-tv','Jugando':'bx-football','Goles':'bx-target-lock','Entrenamiento':'bx-dumbbell',
  'Camisetas':'bx-closet','Lifestyle':'bx-coffee','Moda':'bx-shopping-bag','Hinchada':'bx-flag','Previa':'bx-drink',
  'Partidos':'bx-football','Asistencias':'bx-share','Atajadas':'bx-shield-quarter',
  'Festejos':'bx-party','Hinchadas':'bx-flag','Entrenamientos':'bx-dumbbell','Amateur':'bx-run','Profesional':'bx-star'
};
const CAT_ICONS = new Proxy({}, { get: (t,k)=>`<i class='bx ${CAT_BX[k]||'bx-camera'}' style='vertical-align:-2px;'></i>` });

/* ── VIEWED TRACKING (localStorage) ────────────────────────── */
function _viewedKey(){ return 'canchero_mom_viewed_' + (me()?.email || 'guest'); }
function _getViewed(){ try{ return new Set(JSON.parse(localStorage.getItem(_viewedKey())||'[]')); }catch(e){return new Set();} }
function _registerMomView(id){
  try { sb().rpc('increment_momento_views', { p_id: id }).then(()=>{},()=>{}); } catch(e){}
}
function _markViewed(id, ownerEmail){
  const already = _getViewed().has(String(id));
  const isMine = ownerEmail && (ownerEmail||'').trim().toLowerCase() === (me()?.email||'').trim().toLowerCase();
  // Solo contar una vista nueva por persona, y nunca las propias (como IG)
  if (!already && !isMine) _registerMomView(id);
  try{ const s=_getViewed(); s.add(String(id)); localStorage.setItem(_viewedKey(), JSON.stringify([...s])); }catch(e){}
}

/* ══════════════════════════════════════════════════════════════
   BLOQUE DE MOMENTOS EN EL FEED (reemplaza historias)
══════════════════════════════════════════════════════════════ */
window._momCleanupDone = false;
async function _momCleanup(){
  if (window._momCleanupDone) return; window._momCleanupDone = true;
  try { await sb().from('momentos').delete().lt('expires_at', new Date().toISOString()); } catch(e){}
}
// Repinta el círculo "Tu momento" solo si la identidad visible cambió respecto de lo
// último pintado. El bloque se dibuja apenas hay sesión, cuando userData puede ser aún
// el provisorio del login (sin foto y con el email como nombre): sin esto quedaba la
// inicial del email en vez de la foto de perfil.
window._momRepintarSiCambio = function(){
    try {
        const a = (window._pubAvatar && window._pubAvatar()) || window.userData || {};
        const ud = window.userData || {};
        const firma = ((a.photo || ud.photo || '') + '|' + (a.name || ud.name || ''));
        if (window.__momFirma !== undefined && firma !== window.__momFirma && firma !== '|') {
            window.__momFirma = firma;
            if (window._loadMomentosBlock) window._loadMomentosBlock();
        }
    } catch(e){}
};

window._loadMomentosBlock = async function(){
  _momCleanup();
  const block = document.getElementById('feed-momentos-block');
  if (!block) return;

  /* Ocultar historias antiguas */
  const storiesBar = document.getElementById('feed-stories-container');
  if (storiesBar) storiesBar.style.display = 'none';

  let items = [];
  try {
    const r = await sb().from('momentos').select('*').gt('expires_at', new Date().toISOString()).order('created_at',{ascending:false}).limit(100);
    items = (r&&r.data) || [];
  } catch(e){ block.style.display = 'none'; return; }

  block.style.display = 'block';

  /* Agrupar por categoría y filtrar vistos */
  const viewed = _getViewed();
  const byCategory = {};
  CATS_FEED.forEach(c => { byCategory[c] = []; });
  items.forEach(m => {
    const cat = m.category || 'Mi Día';
    if (byCategory[cat]) byCategory[cat].push(m);
    else byCategory['Mi Día'].push(m);
  });

  /* Filtrar vistos — sólo para el bloque del feed */
  const unviewedByCategory = {};
  CATS_FEED.forEach(c => {
    unviewedByCategory[c] = byCategory[c].filter(m => !viewed.has(String(m.id)));
  });

  /* Orden de BLOQUES (categorías con momentos) para encadenar el visor tipo Instagram:
     al terminar un bloque se pasa al siguiente en vez de cerrarse. */
  window._momBlockOrder = CATS_FEED.filter(c => (byCategory[c] && byCategory[c].length > 0));

  /* Renderizar círculos tipo stories */
  const circles = CATS_FEED.map(cat => {
    const unviewed = unviewedByCategory[cat];
    const hasUnviewed = unviewed.length > 0;
    const total = byCategory[cat].length;
    const thumb = total > 0 ? byCategory[cat][0] : null;

    /* Primer círculo — "Momentos": MI foto de perfil + botón "+" bien visible
       (estilo "Tu historia" de Instagram). Tap = subir momento; si tengo
       momentos sin ver en Mi Día, el anillo se enciende y los abre. */
    if (cat === 'Mi Día') {
      // Identidad ACTIVA (organización/tienda/… o jugador), no la fila users: entrando
      // como negocio salía la foto del jugador y con el encuadre de cara del jugador.
      let u = (window._pubAvatar && window._pubAvatar()) || window.userData || {};
      // El bloque se pinta apenas hay sesión, cuando userData todavía puede ser el
      // provisorio del login (name = parte local del email, sin foto): salía la inicial
      // del EMAIL ("J" de joelviettro) en vez de la foto. Se completa con las otras
      // fuentes disponibles antes de decidir que no hay foto.
      if (!u.photo || !u.name) {
        const ud = window.userData || {};
        let ls = {}; try { ls = JSON.parse(localStorage.getItem('canchero_user') || '{}') || {}; } catch(e){}
        u = {
          photo: u.photo || ud.photo || ls.photo || '',
          photo_style: u.photo_style || u.photoStyle || ud.photoStyle || ud.photo_style || ls.photo_style || null,
          name: u.name || ud.name || ls.name || ''
        };
      }
      // Foto de perfil bien encuadrada: si la identidad definió encuadre (photo_style)
      // se respeta; si no, se usa el recorte de CARA centrado arriba para que no salga
      // el torso ni quede corrida en el círculo chico del feed.
      let avatarCss = null;
      const hasStyle = !!(u.photoStyle || u.photo_style);
      if (hasStyle) {
        avatarCss = (window._avatarBgCss && window._avatarBgCss(u)) || null;
      } else if (u.photo && !String(u.photo).includes('ui-avatars')) {
        // MISMO encuadre que el resto de la app (center 25% sobre la foto original) —
        // antes usaba el recorte g_face de Cloudinary y se veía distinta que en el feed.
        avatarCss = "background-image:url('" + u.photo + "');background-size:cover;background-position:center 25%;";
      }
      // Firma de lo que se está pintando: si después llega el perfil real (foto/nombre
      // definitivos), _momRepintarSiCambio() lo detecta y vuelve a pintar el círculo.
      try { window.__momFirma = (u.photo || '') + '|' + (u.name || ''); } catch(e){}
      // Si el "nombre" es en realidad el email (o su parte local), no sirve como inicial.
      const _nomOk = (u.name && String(u.name).indexOf('@') === -1) ? u.name : '';
      const myInit = (_nomOk || '?')[0] ? (_nomOk || '?')[0].toUpperCase() : '?';
      /* Primer círculo: SIEMPRE para SUBIR (tap = crear). El "+" es un punto
         glass flotante sin bordes. Los momentos de "Mi Día" se ven en su
         propio círculo "Momento" al lado. */
      let html = `<div onclick="window._openCrearMomento('Mi Día')" style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;min-width:64px;">
        <div style="position:relative;width:60px;height:60px;">
          <div style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.10);padding:1.5px;box-sizing:border-box;backdrop-filter:blur(8px);">
            <div style="width:100%;height:100%;border-radius:50%;background:#111;display:flex;align-items:center;justify-content:center;overflow:hidden;${avatarCss||''}">
              ${avatarCss ? '' : `<span style="font-size:22px;font-weight:900;color:var(--accent);">${myInit}</span>`}
            </div>
          </div>
          <span style="position:absolute;bottom:-1px;right:-1px;width:20px;height:20px;background:var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.45);"><i class='bx bx-plus' style="color:#000;font-size:14px;font-weight:900;"></i></span>
        </div>
        <span style="font-size:10px;color:#fff;font-weight:700;max-width:64px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Tu momento</span>
      </div>`;
      /* Si hay momentos en "Mi Día", se VEN en su propio círculo al lado */
      if (total > 0) {
        html += `<div onclick="window._openMomentosStories('Mi Día')" style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;min-width:64px;opacity:${hasUnviewed?'1':'0.55'};">
          <div style="width:60px;height:60px;border-radius:50%;background:${hasUnviewed?'linear-gradient(135deg,var(--accent),#00ff9d)':'rgba(255,255,255,0.14)'};padding:2px;box-sizing:border-box;">
            <div style="width:100%;height:100%;border-radius:50%;background:#111;display:flex;align-items:center;justify-content:center;overflow:hidden;">
              ${thumb ? (thumb.media_type?.startsWith('video')
                ? `<video src="${thumb.url}" muted playsinline style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></video>`
                : `<img src="${thumb.url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`)
              : CAT_ICONS[cat]}
            </div>
          </div>
          <span style="font-size:10px;color:${hasUnviewed?'#fff':'#666'};font-weight:700;max-width:64px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Momento</span>
        </div>`;
      }
      return html;
    }

    /* Otras categorías — sólo mostrar si tiene momentos no vistos (o si tiene algo) */
    if (total === 0) return '';
    const icon = CAT_ICONS[cat];
    return `<div onclick="window._openMomentosStories('${cat}')" style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;min-width:64px;opacity:${hasUnviewed?'1':'0.5'};">
      <div style="width:60px;height:60px;border-radius:50%;background:${hasUnviewed?'linear-gradient(135deg,var(--accent),#00c9ff)':'#333'};padding:2px;box-sizing:border-box;">
        <div style="width:100%;height:100%;border-radius:50%;background:#111;display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:24px;">
          ${thumb ? (thumb.media_type?.startsWith('video')
            ? `<video src="${thumb.url}" muted playsinline style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></video>`
            : `<img src="${thumb.url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentElement.innerHTML='${icon}'">`)
          : icon}
        </div>
      </div>
      <span style="font-size:10px;color:${hasUnviewed?'#fff':'#666'};font-weight:${hasUnviewed?'700':'500'};max-width:60px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${cat}</span>
    </div>`;
  }).filter(Boolean).join('');

  block.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px 6px;">
      <div style="font-size:12px;font-weight:900;color:var(--accent);letter-spacing:.5px;"><i class='bx bx-camera'></i> MOMENTOS</div>
      <button onclick="window._openMomentosExplorer()" style="background:none;border:none;color:#666;font-size:11px;font-weight:700;cursor:pointer;">Ver más →</button>
    </div>
    <div class="momentos-stories-bar" style="display:flex;gap:12px;overflow-x:auto;padding:4px 16px 12px;scrollbar-width:none;-webkit-overflow-scrolling:touch;">
      ${circles}
    </div>`;
};

/* ══════════════════════════════════════════════════════════════
   VISOR TIPO INSTAGRAM STORIES
══════════════════════════════════════════════════════════════ */
window._openMomentosStories = async function(cat){
  /* Cargar momentos de la categoría */
  let items = [];
  try {
    let q = sb().from('momentos').select('*').gt('expires_at', new Date().toISOString()).order('created_at',{ascending:false}).limit(50);
    if (cat !== 'Todos') q = q.eq('category', cat);
    const r = await q; items = (r&&r.data)||[];
  } catch(e){}
  if (!items.length){
    toast('Sin momentos en esta categoría','info');
    return;
  }

  /* Mostrar primero los no vistos, luego los vistos */
  const viewed = _getViewed();
  const unviewed = items.filter(m => !viewed.has(String(m.id)));
  const seen = items.filter(m => viewed.has(String(m.id)));
  const ordered = [...unviewed, ...seen];

  let curIdx = 0;
  let progressTimer = null;

  const v = document.createElement('div');
  v.id = 'mom-stories-viewer';
  v.className = 'momentos-viewer';
  v.style.cssText = 'position:fixed;inset:0;z-index:100100;background:#000;touch-action:none;user-select:none;';
  try { const _bn = document.getElementById('bottom-nav'); if (_bn) _bn.style.display = 'none'; } catch(e){}

  async function render(idx){
    const mo = ordered[idx];
    if (!mo) { v.remove(); return; }
    _markViewed(mo.id, mo.user_email);
    const isVid = (mo.media_type||'').startsWith('video');
    const _ownerLc = (mo.user_email||'').trim().toLowerCase();
    const _meLc = (me()?.email||'').trim().toLowerCase();
    const isOwn = !!_meLc && !!_ownerLc && _ownerLc === _meLc;

    // Check if user already liked this momento
    let _moLiked = false;
    if (_meLc) {
      try {
        const { data: _ml } = await sb().from('momento_likes').select('id').eq('momento_id', mo.id).eq('user_email', _meLc).maybeSingle();
        _moLiked = !!_ml;
      } catch(e){}
    }

    // Foto de perfil del autor con el MISMO encuadre que toda la app (photo_style o
    // recorte de rostro center 25%). El momento no guarda la foto/encuadre, así que se
    // lee de users (cacheado) para que NO se vea el torso ni descentrada.
    let _authorPhoto = mo.user_photo || mo.user_avatar || '';
    let _authorStyle = mo.user_photo_style || null;
    try {
      window._momUserCache = window._momUserCache || {};
      let _au = window._momUserCache[_ownerLc];
      if (!_au && _ownerLc) {
        const { data: _ud } = await sb().from('users').select('photo,photo_style').eq('email', mo.user_email).maybeSingle();
        _au = _ud || {}; window._momUserCache[_ownerLc] = _au;
      }
      if (_au) { if (_au.photo) _authorPhoto = _au.photo; if (_au.photo_style) _authorStyle = _au.photo_style; }
    } catch(e){}
    const _avCss = (window._avatarBgCss && window._avatarBgCss({ photo:_authorPhoto, photo_style:_authorStyle })) || (_authorPhoto?("background-image:url('"+_authorPhoto+"');background-size:cover;background-position:center 25%;"):'');

    /* Barras de progreso */
    const bars = ordered.map((_,i) =>
      `<div style="flex:1;height:3px;border-radius:3px;background:${i<idx?'rgba(255,255,255,0.9)':i===idx?'transparent':'rgba(255,255,255,0.3)'};overflow:hidden;">
        ${i===idx?`<div id="mom-prog-bar" style="height:100%;width:0%;background:rgba(255,255,255,0.9);transition:width linear;"></div>`:''}
      </div>`
    ).join('');

    v.innerHTML = `
      <!-- Contenido multimedia -->
      <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#000;">
        ${isVid
          ? `<video id="mom-story-video" src="${mo.url}" autoplay playsinline muted loop preload="auto" style="max-width:100%;max-height:100%;object-fit:contain;"></video>`
          : `<img src="${mo.url}" style="max-width:100%;max-height:100%;object-fit:contain;">`}
      </div>
      <!-- Gradiente superior -->
      <div style="position:absolute;top:0;left:0;right:0;height:120px;background:linear-gradient(180deg,rgba(0,0,0,0.6),transparent);pointer-events:none;"></div>
      <!-- Gradiente inferior -->
      <div style="position:absolute;bottom:0;left:0;right:0;height:140px;background:linear-gradient(0deg,rgba(0,0,0,0.7),transparent);pointer-events:none;"></div>
      <!-- Barras de progreso -->
      <div style="position:absolute;top:calc(env(safe-area-inset-top,0px) + 8px);left:10px;right:10px;display:flex;gap:3px;z-index:2;">
        ${bars}
      </div>
      <!-- Header -->
      <div style="position:absolute;top:calc(env(safe-area-inset-top,0px) + 22px);left:10px;right:10px;display:flex;align-items:center;gap:10px;z-index:2;">
        <div onclick="event.stopPropagation();window.openPlayerActions?window.openPlayerActions('${(mo.user_email||'').replace(/'/g,"\\'")}','${(mo.user_name||'').replace(/'/g,"\\'")}'):(window.viewUserProfile&&window.viewUserProfile('${(mo.user_email||'').replace(/'/g,"\\'")}'))" style="width:34px;height:34px;border-radius:50%;${_avCss?_avCss:'background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:#000;'}flex-shrink:0;cursor:pointer;border:1.5px solid rgba(255,255,255,0.5);">${_avCss?'':(mo.user_name||'?')[0].toUpperCase()}</div>
        <div style="flex:1;cursor:pointer;" onclick="event.stopPropagation();window.viewUserProfile&&window.viewUserProfile('${(mo.user_email||'').replace(/'/g,"\\'")}')">
          <div style="color:#fff;font-size:12px;font-weight:800;text-shadow:0 1px 3px rgba(0,0,0,.8);">${mo.user_name||'Jugador'}</div>
          <div style="color:rgba(255,255,255,0.7);font-size:10px;">${CAT_ICONS[mo.category]} ${mo.category||'Momento'} · ${_relTime(mo.created_at)}</div>
        </div>
        ${!isOwn?`<button onclick="window._momFollow('${mo.user_email}','${(mo.user_name||'').replace(/'/g,"\\'")}',this)" style="background:rgba(186,255,0,0.15);border:1px solid var(--accent);color:var(--accent);border-radius:18px;padding:5px 13px;font-size:11px;font-weight:800;cursor:pointer;">Seguir</button>`:''}
        <button onclick="document.getElementById('mom-stories-viewer').remove()" style="background:rgba(0,0,0,0.4);border:none;color:#fff;width:34px;height:34px;border-radius:50%;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;">&times;</button>
      </div>
      <!-- Texto inferior -->
      ${mo.title||mo.description ? `<div style="position:absolute;bottom:calc(env(safe-area-inset-bottom,0px) + 110px);left:16px;right:16px;z-index:2;">
        ${mo.title?`<div style="color:#fff;font-weight:800;font-size:15px;text-shadow:0 1px 4px rgba(0,0,0,.9);">${mo.title}</div>`:''}
        ${mo.description?`<div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:3px;text-shadow:0 1px 4px rgba(0,0,0,.9);">${mo.description}</div>`:''}
      </div>` : ''}
      <!-- Acciones laterales -->
      <div style="position:absolute;bottom:calc(env(safe-area-inset-bottom,0px) + 64px);right:12px;display:flex;flex-direction:column;align-items:center;gap:14px;z-index:4;">
        <button onclick="window._momLike('${mo.id}',this)" style="background:none;border:none;color:${_moLiked?'var(--accent)':'#fff'};display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;font-size:11px;text-shadow:0 1px 4px rgba(0,0,0,.9);">
          <span style="width:46px;height:46px;border-radius:50%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;"><i class='bx ${_moLiked?'bxs-heart':'bx-heart'}' style="font-size:26px;"></i></span><span id="mom-likes-${mo.id}">${mo.likes_count||0}</span>
        </button>
        <span style="display:flex;flex-direction:column;align-items:center;gap:3px;color:#fff;font-size:11px;text-shadow:0 1px 4px rgba(0,0,0,.9);"><span style="width:46px;height:46px;border-radius:50%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;"><i class='bx bx-show' style="font-size:24px;"></i></span>${mo.views_count||0}</span>
        <button onclick="window._momShare('${mo.id}','${(mo.title||'Momento').replace(/'/g,"\\'")}' )" style="background:none;border:none;color:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:11px;text-shadow:0 1px 4px rgba(0,0,0,.9);">
          <span style="width:46px;height:46px;border-radius:50%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;"><i class='bx bx-share' style="font-size:24px;"></i></span>
        </button>
        <button onclick="window.CancheroSocial&&CancheroSocial.toggleSaveMomento('${mo.id}',this)" id="momsave-${mo.id}" style="background:none;border:none;color:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:11px;text-shadow:0 1px 4px rgba(0,0,0,.9);">
          <span style="width:46px;height:46px;border-radius:50%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;"><i class='bx bx-bookmark' style="font-size:24px;"></i></span>
        </button>
        ${isOwn ? `<button onclick="window._momDelete('${mo.id}','${(mo.user_email||'').replace(/'/g,"\\'")}')" style="background:none;border:none;color:#ff5555;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:11px;font-weight:700;text-shadow:0 1px 4px rgba(0,0,0,.9);"><span style="width:46px;height:46px;border-radius:50%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;"><i class='bx bx-trash' style="font-size:23px;"></i></span></button>` : ''}
      </div>
      <!-- Barra de mensaje inferior -->
      ${!isOwn ? `<div style="position:absolute;bottom:calc(env(safe-area-inset-bottom,0px) + 10px);left:10px;right:74px;display:flex;align-items:center;gap:8px;z-index:5;">
        <input id="mom-msg-input" type="text" placeholder="Enviar mensaje..." autocomplete="off" style="flex:1;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.35);border-radius:22px;padding:11px 16px;color:#fff;font-size:13px;outline:none;backdrop-filter:blur(6px);" onclick="event.stopPropagation()" ontouchstart="event.stopPropagation()" onfocus="clearTimeout(progressTimer)">
        <button onclick="window._momSendMsg('${mo.user_email}','${(mo.user_name||'').replace(/'/g,"\\'")}');event.stopPropagation()" style="background:var(--accent);border:none;color:#000;width:40px;height:40px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,.5);"><i class='bx bx-send' style="font-size:18px;"></i></button>
      </div>` : ''}
      <!-- Indicador de pausa (F1) -->
      <div id="mom-pause-ind" style="display:none;position:absolute;inset:0;z-index:2;align-items:center;justify-content:center;pointer-events:none;">
        <div style="width:70px;height:70px;border-radius:50%;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;"><i class='bx bx-pause' style="font-size:40px;color:#fff;"></i></div>
      </div>
      <!-- Zonas táctiles: bordes = navegar, centro = pausar/reanudar (F1) -->
      <div id="mom-tap-prev" style="position:absolute;top:0;left:0;width:22%;height:80%;z-index:3;cursor:pointer;"></div>
      <div id="mom-tap-center" style="position:absolute;top:0;left:22%;width:56%;height:80%;z-index:3;cursor:pointer;"></div>
      <div id="mom-tap-next" style="position:absolute;top:0;right:0;width:22%;height:80%;z-index:3;cursor:pointer;"></div>`;

    /* Eventos de tap */
    v.querySelector('#mom-tap-prev').addEventListener('click', goBack);
    v.querySelector('#mom-tap-next').addEventListener('click', goNext);
    v.querySelector('#mom-tap-center').addEventListener('click', togglePause);

    /* Progreso automático */
    clearTimeout(progressTimer);
    if (!isVid) {
      startProgress(5000, goNext);
    } else {
      const vid = v.querySelector('#mom-story-video');
      if (vid) {
        vid.onloadedmetadata = () => startProgress(Math.min((vid.duration||6)*1000, 30000), goNext);
        vid.muted = false; // sonido
      }
    }
  }

  // F1 — pausa/reanuda tocando el centro (seguimiento de tiempo restante).
  let _paused = false, _progDur = 0, _progStart = 0, _progCb = null;
  function startProgress(ms, cb){
    _paused = false; _progDur = ms; _progCb = cb; _progStart = Date.now();
    const bar = document.getElementById('mom-prog-bar');
    if (bar) {
      bar.style.transition = 'none';
      bar.style.width = '0%';
      requestAnimationFrame(() => {
        bar.style.transition = 'width ' + ms + 'ms linear';
        bar.style.width = '100%';
      });
    }
    clearTimeout(progressTimer);
    progressTimer = setTimeout(cb, ms);
  }
  function togglePause(){
    const vid = v.querySelector('#mom-story-video');
    const bar = document.getElementById('mom-prog-bar');
    const ind = document.getElementById('mom-pause-ind');
    if (!_paused){
      _paused = true;
      clearTimeout(progressTimer);
      _progDur = Math.max(0, _progDur - (Date.now() - _progStart));
      if (vid) { try { vid.pause(); } catch(e){} }
      if (bar) { const w = getComputedStyle(bar).width; bar.style.transition = 'none'; bar.style.width = w; }
      if (ind) ind.style.display = 'flex';
    } else {
      _paused = false; _progStart = Date.now();
      if (vid) { try { vid.play(); } catch(e){} }
      if (bar) { requestAnimationFrame(() => { bar.style.transition = 'width '+_progDur+'ms linear'; bar.style.width = '100%'; }); }
      clearTimeout(progressTimer);
      progressTimer = setTimeout(_progCb, _progDur);
      if (ind) ind.style.display = 'none';
    }
  }

  function goNext(){
    clearTimeout(progressTimer);
    if (curIdx < ordered.length - 1) { curIdx++; render(curIdx); }
    else {
      // Fin del bloque: pasar al SIGUIENTE bloque (categoría) como en Instagram.
      var _order = window._momBlockOrder || [];
      var _i = _order.indexOf(cat);
      var _next = (_i !== -1 && _i < _order.length - 1) ? _order[_i + 1] : null;
      v.remove();
      if (_next && window._openMomentosStories) { window._openMomentosStories(_next); }
      else { window._loadMomentosBlock(); }
    }
  }
  function goBack(){
    clearTimeout(progressTimer);
    if (curIdx > 0) { curIdx--; render(curIdx); }
  }

  /* Swipe up para cerrar */
  let _ty0 = 0;
  v.addEventListener('touchstart', e => { _ty0 = e.touches[0].clientY; }, {passive:true});
  v.addEventListener('touchend', e => {
    if (e.changedTouches[0].clientY - _ty0 < -60) { v.remove(); window._loadMomentosBlock(); }
  }, {passive:true});

  document.body.appendChild(v);
  render(0);
};

function _relTime(iso){
  if (!iso) return '';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return 'ahora';
  if (d < 3600) return Math.floor(d/60) + 'm';
  if (d < 86400) return Math.floor(d/3600) + 'h';
  return Math.floor(d/86400) + 'd';
}

/* ══════════════════════════════════════════════════════════════
   EXPLORADOR — por bloques de categoría
══════════════════════════════════════════════════════════════ */
window._momCat = 'Todos';
window._openMomentosExplorer = function(){
  let m = document.getElementById('momentos-explorer'); if(m)m.remove();
  m = document.createElement('div'); m.id = 'momentos-explorer';
  m.style.cssText = 'position:fixed;left:0;right:0;bottom:0;top:'+(window._navH?window._navH():0)+'px;z-index:9960;background:#0a0a0a;overflow-y:auto;';
  m.innerHTML = `
    <div style="position:sticky;top:0;z-index:5;background:rgba(10,10,10,0.96);backdrop-filter:blur(10px);border-bottom:1px solid #1a1a1a;padding:calc(10px + env(safe-area-inset-top)) 14px 10px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <button onclick="document.getElementById('momentos-explorer').remove()" style="background:rgba(255,255,255,0.06);border:1px solid #2a2a2a;border-radius:20px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;padding:7px 13px;"><i class='bx bx-arrow-back'></i> VOLVER</button>
        <div style="font-size:16px;font-weight:900;color:var(--accent);flex:1;"><i class='bx bx-camera'></i> Momentos</div>
        <button onclick="window._openCrearMomento()" style="background:var(--accent);color:#000;border:none;border-radius:18px;padding:7px 14px;font-weight:800;font-size:12px;cursor:pointer;">+ Crear</button>
      </div>
      <!-- Filtros compactos en UNA sola línea (pedido 2026-07-08) -->
      <div style="display:flex;gap:4px;flex-wrap:nowrap;">
        ${CATS_EXPLORER.map(c=>`<button onclick="window._momSetCat('${c}')" id="momcat-${c}" style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 2px;border-radius:12px;border:none;font-size:9px;font-weight:700;cursor:pointer;white-space:nowrap;overflow:hidden;background:${c===window._momCat?'var(--accent)':'#1a1a1a'};color:${c===window._momCat?'#000':'#aaa'};"><i class='bx ${CAT_BX[c]||'bx-camera'}' style='font-size:15px;'></i><span style="max-width:100%;overflow:hidden;text-overflow:ellipsis;">${(typeof CAT_LABEL!=='undefined'&&CAT_LABEL[c])||c}</span></button>`).join('')}
      </div>
    </div>
    <div id="momentos-explorer-content" style="padding:12px;"></div>`;
  document.body.appendChild(m);
  window._momRenderExplorer();
};

window._momSetCat = function(c){
  window._momCat = c;
  CATS_EXPLORER.forEach(x => {
    const b = document.getElementById('momcat-'+x);
    if (b){ b.style.background = x===c?'var(--accent)':'#1a1a1a'; b.style.color = x===c?'#000':'#aaa'; }
  });
  window._momRenderExplorer();
};

window._momRenderExplorer = async function(){
  const cont = document.getElementById('momentos-explorer-content');
  if (!cont) return;
  cont.innerHTML = '<div style="text-align:center;padding:40px;color:#555;"><i class="bx bx-loader-alt bx-spin" style="font-size:28px;"></i></div>';

  let items = [];
  try {
    let q = sb().from('momentos').select('*').gt('expires_at', new Date().toISOString()).order('created_at',{ascending:false}).limit(120);
    if (window._momCat !== 'Todos') q = q.eq('category', window._momCat);
    const r = await q; items = (r&&r.data)||[];
  } catch(e){}

  if (!items.length){
    cont.innerHTML = '<div style="text-align:center;padding:50px 20px;color:#555;"><i class="bx bx-camera" style="font-size:44px;opacity:.4;display:block;margin-bottom:10px;"></i>Sin momentos en esta categoría.</div>';
    return;
  }

  if (window._momCat !== 'Todos') {
    /* Grilla simple cuando hay filtro activo */
    cont.innerHTML = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;">
      ${items.map(m => _momGridItem(m)).join('')}
    </div>`;
    return;
  }

  /* Vista "Todos" — UNA línea de historias arriba + SECCIONES por tipo de
     momento (cada categoría con su header y su grilla, ordenadas) */
  const viewedAll = _getViewed();
  const byCat = {};
  CATS_FEED.forEach(c => { byCat[c] = []; });
  items.forEach(m => { const c = byCat[m.category] ? m.category : 'Mi Día'; byCat[c].push(m); });
  const circles = CATS_FEED.map(cat => {
    const arr = byCat[cat]; if (!arr.length) return '';
    const hasNew = arr.some(m => !viewedAll.has(String(m.id)));
    const t = arr[0];
    return `<div onclick="window._openMomentosStories('${cat}')" style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;min-width:62px;opacity:${hasNew?'1':'0.55'};">
      <div style="width:56px;height:56px;border-radius:50%;background:${hasNew?'linear-gradient(135deg,var(--accent),#00c9ff)':'#333'};padding:2px;box-sizing:border-box;">
        <div style="width:100%;height:100%;border-radius:50%;background:#111;overflow:hidden;display:flex;align-items:center;justify-content:center;">
          ${(t.media_type||'').startsWith('video')
            ? `<video src="${t.url}" muted playsinline style="width:100%;height:100%;object-fit:cover;"></video>`
            : `<img src="${t.url}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">`}
        </div>
      </div>
      <span style="font-size:9.5px;color:#aaa;font-weight:700;max-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${cat}</span>
    </div>`;
  }).filter(Boolean).join('');
  const sections = CATS_FEED.map(cat => {
    const arr = byCat[cat]; if (!arr.length) return '';
    return `<div style="margin-bottom:18px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin:0 2px 8px;">
        <div style="font-size:12px;font-weight:900;color:#fff;letter-spacing:.5px;">${CAT_ICONS[cat]} ${((typeof CAT_LABEL!=='undefined'&&CAT_LABEL[cat])||cat).toUpperCase()} <span style="color:#555;font-weight:700;">· ${arr.length}</span></div>
        <button onclick="window._momSetCat('${cat}')" style="background:none;border:none;color:#666;font-size:11px;font-weight:700;cursor:pointer;">Ver todos →</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;">${arr.slice(0,6).map(m => _momGridItem(m)).join('')}</div>
    </div>`;
  }).filter(Boolean).join('');
  cont.innerHTML = `
    <div style="display:flex;gap:12px;overflow-x:auto;padding:2px 2px 12px;scrollbar-width:none;-webkit-overflow-scrolling:touch;flex-wrap:nowrap;">${circles}</div>
    ${sections}`;
};

function _momGridItem(m){
  const isVid = (m.media_type||'').startsWith('video');
  return `<div onclick="window._openMomento('${m.id}')" style="aspect-ratio:1;position:relative;cursor:pointer;background:#111;overflow:hidden;">
    ${isVid
      ? `<video src="${m.url}" muted playsinline style="width:100%;height:100%;object-fit:cover;"></video><i class='bx bx-play' style="position:absolute;top:6px;right:6px;color:#fff;font-size:16px;"></i>`
      : `<img src="${m.url}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">`}
  </div>`;
}

/* ══════════════════════════════════════════════════════════════
   CREAR MOMENTO — categoría requerida y prominente
══════════════════════════════════════════════════════════════ */
window._openCrearMomento = function(defaultCat){
  if (!me()){ toast('Iniciá sesión para crear un momento','error'); return; }
  let m = document.getElementById('crear-momento-modal'); if(m) m.remove();
  m = document.createElement('div'); m.id = 'crear-momento-modal';
  m.style.cssText = 'position:fixed;inset:0;z-index:30000;background:rgba(0,0,0,0.92);backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;';

  const selCat = defaultCat || CATS_UPLOAD[0];

  // 6 categorías en UNA sola línea (icono arriba, etiqueta corta abajo)
  const catButtons = CATS_UPLOAD.map(c =>
    `<button onclick="window._momSelectCat('${c}',this)" data-cat="${c}" style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 2px;border-radius:12px;border:2px solid ${c===selCat?'var(--accent)':'#2a2a2a'};background:${c===selCat?'rgba(186,255,0,0.12)':'transparent'};color:${c===selCat?'var(--accent)':'#777'};font-size:9.5px;font-weight:700;cursor:pointer;transition:.15s;white-space:nowrap;overflow:hidden;"><i class='bx ${CAT_BX[c]||'bx-camera'}' style='font-size:17px;'></i><span style="max-width:100%;overflow:hidden;text-overflow:ellipsis;">${(typeof CAT_LABEL!=='undefined'&&CAT_LABEL[c])||c}</span></button>`
  ).join('');

  m.innerHTML = `<div style="background:#0f110f;border:1px solid #1e1e1e;border-radius:24px 24px 0 0;width:100%;max-width:480px;padding:20px 16px calc(24px + env(safe-area-inset-bottom));max-height:94vh;overflow-y:auto;box-sizing:border-box;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <h3 style="margin:0;font-size:16px;font-weight:900;"><i class='bx bx-camera' style="vertical-align:-2px;color:var(--accent);"></i> Crear momento</h3>
      <button onclick="document.getElementById('crear-momento-modal').remove()" style="background:rgba(255,255,255,0.06);border:1px solid #333;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">&times;</button>
    </div>

    <!-- Preview / subida -->
    <div id="mom-preview" onclick="document.getElementById('mom-file').click()" style="width:100%;aspect-ratio:16/9;border:2px dashed rgba(186,255,0,0.3);border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;color:var(--accent);margin-bottom:14px;background:rgba(186,255,0,0.03);">
      <i class='bx bx-image-add' style="font-size:40px;"></i>
      <span style="font-size:12px;font-weight:700;">Tocá para subir foto o video</span>
    </div>
    <input type="file" id="mom-file" accept="image/*,video/*" style="display:none;" onchange="window._momPreview(this)">

    <!-- CATEGORÍA — requerida y prominente -->
    <div style="margin-bottom:14px;">
      <div style="font-size:11px;font-weight:900;color:var(--accent);letter-spacing:.5px;margin-bottom:8px;">CATEGORÍA <span style="color:#ff4444;">*</span> — elegí una</div>
      <div id="mom-cat-buttons" style="display:flex;gap:5px;flex-wrap:nowrap;padding-bottom:4px;">
        ${catButtons}
      </div>
      <input type="hidden" id="mom-cat" value="${selCat}">
    </div>

    <!-- Título y descripción -->
    <input id="mom-title" placeholder="Título (opcional)" style="width:100%;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;padding:10px 12px;font-size:13px;box-sizing:border-box;margin-bottom:8px;outline:none;" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='#2a2a2a'">
    <textarea id="mom-desc" rows="2" placeholder="Descripción (opcional)" style="width:100%;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;padding:10px 12px;font-size:13px;box-sizing:border-box;margin-bottom:8px;resize:none;font-family:inherit;outline:none;" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='#2a2a2a'"></textarea>

    <!-- Extras -->
    <div style="display:flex;gap:8px;margin-bottom:14px;">
      <input id="mom-team" placeholder="Equipo (opcional)" style="flex:1;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;padding:9px 12px;font-size:12px;box-sizing:border-box;outline:none;" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='#2a2a2a'">
      <input id="mom-loc" placeholder="Ubicación (opcional)" style="flex:1;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;padding:9px 12px;font-size:12px;box-sizing:border-box;outline:none;" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='#2a2a2a'">
    </div>

    <button onclick="window._momPublish()" id="mom-publish-btn" style="width:100%;background:var(--accent);color:#000;border:none;border-radius:12px;padding:14px;font-weight:900;font-size:14px;cursor:pointer;letter-spacing:.5px;">PUBLICAR MOMENTO</button>
  </div>`;
  m.onclick = e => { if(e.target===m) m.remove(); };
  document.body.appendChild(m);
  window._momFile = null;
  window._momSelectedCat = selCat;
};

window._momSelectCat = function(cat, btn){
  window._momSelectedCat = cat;
  const inp = document.getElementById('mom-cat');
  if (inp) inp.value = cat;
  document.querySelectorAll('#mom-cat-buttons button').forEach(b => {
    const selected = b.dataset.cat === cat;
    b.style.borderColor = selected ? 'var(--accent)' : '#2a2a2a';
    b.style.background = selected ? 'rgba(186,255,0,0.12)' : 'transparent';
    b.style.color = selected ? 'var(--accent)' : '#777';
  });
};

window._momPreview = async function(input){
  let f = input.files[0]; if(!f) return;
  window._momTrim = null;
  // Video largo → editor de recorte (no error)
  if (f.type.startsWith('video') && window.checkVideoDuration){
    const ok = await window.checkVideoDuration(f, 60);
    if (!ok && window.openVideoTrimmer){
      const out = await window.openVideoTrimmer(f, { max:60 });
      if (!out){ input.value=''; return; }
      f = out.file; window._momTrim = out.trim || null;
    } else if (!ok){ toast('El video puede durar máximo 1 minuto.','error'); input.value=''; return; }
  }
  window._momFile = f;
  const prev = document.getElementById('mom-preview');
  const url = URL.createObjectURL(f);
  prev.innerHTML = f.type.startsWith('video')
    ? `<video src="${url}" muted playsinline autoplay loop style="width:100%;height:100%;object-fit:cover;border-radius:12px;"></video>`
    : `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`;
};

window._momPublish = async function(){
  if (!window._momFile){ toast('Subí una foto o video primero','error'); return; }
  const cat = document.getElementById('mom-cat')?.value || window._momSelectedCat;
  if (!cat){ toast('Elegí una categoría','error'); return; }

  const btn = document.getElementById('mom-publish-btn');
  if (btn){ btn.disabled=true; btn.textContent='Subiendo...'; }

  let f = window._momFile;
  const _isVid = (f.type||'').startsWith('video/');
  // Videos: máximo 1 minuto (salvo recorte por URL pendiente → se recorta en Cloudinary)
  if (_isVid && window.checkVideoDuration && !window._momTrim) {
    const okDur = await window.checkVideoDuration(f, 60);
    if (!okDur) { toast('El video puede durar máximo 1 minuto. Recortalo y volvé a subirlo.','error'); if(btn){btn.disabled=false;btn.textContent='PUBLICAR MOMENTO';} return; }
  }
  // Comprimir imágenes antes de subir
  if (!_isVid && window._compressImageFile) { try { f = await window._compressImageFile(f, 1280, 0.72); } catch(e){} }
  let url;
  try {
    if (window.cloudUpload) {
      // Cloudinary (no consume egress de Supabase)
      const r = await window.cloudUpload(f, { folder:'canchero/momentos' });
      if (!r || !r.url) throw new Error('cloud');
      url = r.url;
      if (_isVid && window._momTrim && window.cloudTrimUrl){ url = window.cloudTrimUrl(url, window._momTrim.start, window._momTrim.du); }
    } else {
      const ext = _isVid ? (window._momFile.name.split('.').pop()||'mp4') : 'jpg';
      const path = `momentos/${me().email}/${Date.now()}.${ext}`;
      const up = await sb().storage.from('media').upload(path, f, {upsert:true, cacheControl:'31536000', contentType: _isVid ? window._momFile.type : 'image/jpeg'});
      if (up && up.error) throw up.error;
      url = sb().storage.from('media').getPublicUrl(path).data.publicUrl;
    }
  } catch(e){
    if (btn){ btn.disabled=false; btn.textContent='PUBLICAR MOMENTO'; }
    toast('Error al subir el archivo','error'); return;
  }
  try {
    const r = await window._momInsert(Object.assign(window._momAuthorFields(), {
      url,
      media_type: f.type.startsWith('video') ? 'video' : 'photo',
      title: document.getElementById('mom-title')?.value.trim() || null,
      description: document.getElementById('mom-desc')?.value.trim() || null,
      category: cat,
      team: document.getElementById('mom-team')?.value.trim() || null,
      location: document.getElementById('mom-loc')?.value.trim() || null,
      likes_count: 0,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 12*3600000).toISOString()
    }));
    if (r && r.error) throw r.error;
    document.getElementById('crear-momento-modal')?.remove();
    toast('Momento publicado','success');
    try { if (window.CancheroXP) CancheroXP.add('subir_momento'); } catch(e){}
    window._loadMomentosBlock();
    if (document.getElementById('momentos-explorer')) window._momRenderExplorer();
  } catch(e){
    if (btn){ btn.disabled=false; btn.textContent='PUBLICAR MOMENTO'; }
    toast('No se pudo publicar','error'); console.warn(e);
  }
};

/* ══════════════════════════════════════════════════════════════
   VISOR INDIVIDUAL (desde explorador / grilla)
══════════════════════════════════════════════════════════════ */
window._openMomento = async function(id){
  /* Cargar todos los momentos de la misma categoría para ver como stories */
  let mo;
  try {
    const r = await sb().from('momentos').select('*').eq('id',id).single();
    mo = r && r.data;
  } catch(e){}
  if (!mo) return;
  /* Abre el visor stories filtrado por la categoría del momento */
  const cat = mo.category || 'Mi Día';
  try {
    let q = sb().from('momentos').select('*').gt('expires_at', new Date().toISOString()).eq('category',cat).order('created_at',{ascending:false}).limit(50);
    const r = await q;
    const items = (r&&r.data)||[];
    /* Reordenar para que el momento clickeado sea primero */
    const idx = items.findIndex(m => String(m.id) === String(id));
    const ordered = idx > 0 ? [...items.slice(idx), ...items.slice(0,idx)] : items;
    _openStoriesWithItems(ordered, cat);
  } catch(e){ _openStoriesWithItems([mo], cat); }
};

function _openStoriesWithItems(items, cat){
  let curIdx = 0;
  let progressTimer = null;
  const v = document.createElement('div');
  v.id = 'mom-stories-viewer';
  v.className = 'momentos-viewer';
  v.style.cssText = 'position:fixed;inset:0;z-index:100100;background:#000;touch-action:none;user-select:none;';
  try { const _bn = document.getElementById('bottom-nav'); if (_bn) _bn.style.display = 'none'; } catch(e){}

  async function render(idx){
    const mo = items[idx];
    if (!mo){ v.remove(); return; }
    _markViewed(mo.id, mo.user_email);
    const isVid = (mo.media_type||'').startsWith('video');
    const _ownerLc = (mo.user_email||'').trim().toLowerCase();
    const _meLc = (me()?.email||'').trim().toLowerCase();
    const isOwn = !!_meLc && !!_ownerLc && _ownerLc === _meLc;

    let _moLiked = false;
    if (_meLc) {
      try {
        const { data: _ml } = await sb().from('momento_likes').select('id').eq('momento_id', mo.id).eq('user_email', _meLc).maybeSingle();
        _moLiked = !!_ml;
      } catch(e){}
    }

    // Foto de perfil del autor con el encuadre correcto (mismo criterio que toda la app).
    let _authorPhoto = mo.user_photo || mo.user_avatar || '';
    let _authorStyle = mo.user_photo_style || null;
    try {
      window._momUserCache = window._momUserCache || {};
      let _au = window._momUserCache[_ownerLc];
      if (!_au && _ownerLc) {
        const { data: _ud } = await sb().from('users').select('photo,photo_style').eq('email', mo.user_email).maybeSingle();
        _au = _ud || {}; window._momUserCache[_ownerLc] = _au;
      }
      if (_au) { if (_au.photo) _authorPhoto = _au.photo; if (_au.photo_style) _authorStyle = _au.photo_style; }
    } catch(e){}
    const _avCss = (window._avatarBgCss && window._avatarBgCss({ photo:_authorPhoto, photo_style:_authorStyle })) || (_authorPhoto?("background-image:url('"+_authorPhoto+"');background-size:cover;background-position:center 25%;"):'');

    const bars = items.map((_,i) =>
      `<div style="flex:1;height:3px;border-radius:3px;background:${i<idx?'rgba(255,255,255,0.9)':i===idx?'transparent':'rgba(255,255,255,0.3)'};overflow:hidden;">
        ${i===idx?`<div id="mom-prog-bar" style="height:100%;width:0%;background:rgba(255,255,255,0.9);"></div>`:''}
      </div>`
    ).join('');

    v.innerHTML = `
      <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#000;">
        ${isVid
          ? `<video id="mom-story-video" src="${mo.url}" autoplay playsinline muted loop preload="auto" style="max-width:100%;max-height:100%;object-fit:contain;"></video>`
          : `<img src="${mo.url}" style="max-width:100%;max-height:100%;object-fit:contain;">`}
      </div>
      <div style="position:absolute;top:0;left:0;right:0;height:120px;background:linear-gradient(180deg,rgba(0,0,0,0.6),transparent);pointer-events:none;"></div>
      <div style="position:absolute;bottom:0;left:0;right:0;height:140px;background:linear-gradient(0deg,rgba(0,0,0,0.7),transparent);pointer-events:none;"></div>
      <div style="position:absolute;top:calc(env(safe-area-inset-top,0px) + 8px);left:10px;right:10px;display:flex;gap:3px;z-index:2;">${bars}</div>
      <div style="position:absolute;top:calc(env(safe-area-inset-top,0px) + 22px);left:10px;right:10px;display:flex;align-items:center;gap:10px;z-index:2;">
        <div onclick="event.stopPropagation();window.openPlayerActions?window.openPlayerActions('${(mo.user_email||'').replace(/'/g,"\\'")}','${(mo.user_name||'').replace(/'/g,"\\'")}'):(window.viewUserProfile&&window.viewUserProfile('${(mo.user_email||'').replace(/'/g,"\\'")}'))" style="width:34px;height:34px;border-radius:50%;${_avCss?_avCss:'background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:#000;'}flex-shrink:0;cursor:pointer;border:1.5px solid rgba(255,255,255,0.5);">${_avCss?'':(mo.user_name||'?')[0].toUpperCase()}</div>
        <div style="flex:1;cursor:pointer;" onclick="event.stopPropagation();window.viewUserProfile&&window.viewUserProfile('${(mo.user_email||'').replace(/'/g,"\\'")}')">
          <div style="color:#fff;font-size:12px;font-weight:800;text-shadow:0 1px 3px rgba(0,0,0,.8);">${mo.user_name||'Jugador'}</div>
          <div style="color:rgba(255,255,255,0.7);font-size:10px;">${CAT_ICONS[mo.category]} ${mo.category||'Momento'} · ${_relTime(mo.created_at)}</div>
        </div>
        ${!isOwn?`<button onclick="window._momFollow('${mo.user_email}','${(mo.user_name||'').replace(/'/g,"\\'")}',this)" style="background:rgba(186,255,0,0.15);border:1px solid var(--accent);color:var(--accent);border-radius:18px;padding:5px 13px;font-size:11px;font-weight:800;cursor:pointer;">Seguir</button>`:''}
        <button onclick="document.getElementById('mom-stories-viewer').remove()" style="background:rgba(0,0,0,0.4);border:none;color:#fff;width:34px;height:34px;border-radius:50%;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;">&times;</button>
      </div>
      ${mo.title||mo.description ? `<div style="position:absolute;bottom:calc(env(safe-area-inset-bottom,0px) + 110px);left:16px;right:16px;z-index:2;">
        ${mo.title?`<div style="color:#fff;font-weight:800;font-size:15px;text-shadow:0 1px 4px rgba(0,0,0,.9);">${mo.title}</div>`:''}
        ${mo.description?`<div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:3px;">${mo.description}</div>`:''}
      </div>` : ''}
      <!-- Acciones laterales -->
      <div style="position:absolute;bottom:calc(env(safe-area-inset-bottom,0px) + 58px);right:12px;display:flex;flex-direction:column;align-items:center;gap:16px;z-index:4;">
        <button onclick="window._momLike('${mo.id}',this)" style="background:none;border:none;color:${_moLiked?'var(--accent)':'#fff'};display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;font-size:11px;">
          <i class='bx ${_moLiked?'bxs-heart':'bx-heart'}' style="font-size:26px;"></i><span id="mom-likes-${mo.id}">${mo.likes_count||0}</span>
        </button>
        <span style="display:flex;flex-direction:column;align-items:center;gap:2px;color:rgba(255,255,255,0.7);font-size:11px;"><i class='bx bx-show' style="font-size:24px;"></i>${mo.views_count||0}</span>
        <button onclick="window._momShare('${mo.id}','${(mo.title||'Momento').replace(/'/g,"\\'")}' )" style="background:none;border:none;color:#fff;cursor:pointer;"><i class='bx bx-share' style="font-size:24px;"></i></button>
        ${isOwn ? `<button onclick="window._momDelete('${mo.id}')" style="background:none;border:none;color:#ff4444;cursor:pointer;font-size:11px;font-weight:700;">Eliminar</button>` : ''}
      </div>
      <!-- Barra de mensaje inferior -->
      <div style="position:absolute;bottom:calc(env(safe-area-inset-bottom,0px) + 6px);left:10px;right:10px;display:flex;align-items:center;gap:8px;z-index:4;">
        ${!isOwn ? `<input id="mom-msg-input" type="text" placeholder="Enviar mensaje..." autocomplete="off" style="flex:1;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:22px;padding:10px 16px;color:#fff;font-size:13px;outline:none;backdrop-filter:blur(6px);" onclick="event.stopPropagation()" ontouchstart="event.stopPropagation()" onfocus="clearTimeout(progressTimer)">
        <button onclick="window._momSendMsg('${mo.user_email}','${(mo.user_name||'').replace(/'/g,"\\'")}');event.stopPropagation()" style="background:var(--accent);border:none;color:#000;width:38px;height:38px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class='bx bx-send' style="font-size:18px;"></i></button>` : `<div style="flex:1;"></div>`}
      </div>
      <!-- Indicador de pausa (F1) -->
      <div id="mom-pause-ind" style="display:none;position:absolute;inset:0;z-index:2;align-items:center;justify-content:center;pointer-events:none;">
        <div style="width:70px;height:70px;border-radius:50%;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;"><i class='bx bx-pause' style="font-size:40px;color:#fff;"></i></div>
      </div>
      <!-- Zonas táctiles: bordes = navegar, centro = pausar/reanudar (F1) -->
      <div id="mom-tap-prev" style="position:absolute;top:0;left:0;width:22%;height:80%;z-index:3;cursor:pointer;"></div>
      <div id="mom-tap-center" style="position:absolute;top:0;left:22%;width:56%;height:80%;z-index:3;cursor:pointer;"></div>
      <div id="mom-tap-next" style="position:absolute;top:0;right:0;width:22%;height:80%;z-index:3;cursor:pointer;"></div>`;

    v.querySelector('#mom-tap-prev').addEventListener('click', goBack);
    v.querySelector('#mom-tap-next').addEventListener('click', goNext);
    v.querySelector('#mom-tap-center').addEventListener('click', togglePause);

    clearTimeout(progressTimer);
    if (!isVid) { startProgress(5000, goNext); }
    else {
      const vid = v.querySelector('#mom-story-video');
      if (vid) vid.onloadedmetadata = () => startProgress(Math.min((vid.duration||6)*1000, 30000), goNext);
    }
  }

  // F1 — estado de pausa (tocar el centro pausa/reanuda el reel).
  let _paused = false, _progDur = 0, _progStart = 0, _progCb = null;
  function startProgress(ms, cb){
    _paused = false; _progDur = ms; _progCb = cb; _progStart = Date.now();
    const bar = document.getElementById('mom-prog-bar');
    if (bar) {
      bar.style.transition = 'none'; bar.style.width = '0%';
      requestAnimationFrame(() => { bar.style.transition = 'width '+ms+'ms linear'; bar.style.width = '100%'; });
    }
    clearTimeout(progressTimer);
    progressTimer = setTimeout(cb, ms);
  }
  function togglePause(){
    const vid = v.querySelector('#mom-story-video');
    const bar = document.getElementById('mom-prog-bar');
    const ind = document.getElementById('mom-pause-ind');
    if (!_paused){
      _paused = true;
      clearTimeout(progressTimer);
      const elapsed = Date.now() - _progStart;
      _progDur = Math.max(0, _progDur - elapsed);
      if (vid) { try { vid.pause(); } catch(e){} }
      if (bar) { const w = getComputedStyle(bar).width; bar.style.transition = 'none'; bar.style.width = w; }
      if (ind) ind.style.display = 'flex';
    } else {
      _paused = false; _progStart = Date.now();
      if (vid) { try { vid.play(); } catch(e){} }
      if (bar) { requestAnimationFrame(() => { bar.style.transition = 'width '+_progDur+'ms linear'; bar.style.width = '100%'; }); }
      clearTimeout(progressTimer);
      progressTimer = setTimeout(_progCb, _progDur);
      if (ind) ind.style.display = 'none';
    }
  }
  function goNext(){
    clearTimeout(progressTimer);
    if (curIdx < items.length - 1) { curIdx++; render(curIdx); }
    else {
      // Fin del bloque → siguiente bloque (categoría), estilo Instagram.
      var _order = window._momBlockOrder || [];
      var _i = _order.indexOf(cat);
      var _next = (_i !== -1 && _i < _order.length - 1) ? _order[_i + 1] : null;
      v.remove();
      if (_next && window._openMomentosStories) window._openMomentosStories(_next);
    }
  }
  function goBack(){ clearTimeout(progressTimer); if(curIdx>0){curIdx--;render(curIdx);} }

  let _ty0 = 0;
  v.addEventListener('touchstart', e => { _ty0 = e.touches[0].clientY; }, {passive:true});
  v.addEventListener('touchend', e => { if(e.changedTouches[0].clientY - _ty0 < -60){ v.remove(); } }, {passive:true});

  /* Eliminar visor previo si existe */
  const prev = document.getElementById('mom-stories-viewer');
  if (prev) prev.remove();
  document.body.appendChild(v);
  render(0);
}

/* ══════════════════════════════════════════════════════════════
   ACCIONES: LIKE / DELETE / SHARE
══════════════════════════════════════════════════════════════ */
window._momLike = async function(id, btn){
  if (!me()){ toast('Iniciá sesión','error'); return; }
  // No se puede dar like a tu propio momento
  try {
    const { data: own } = await sb().from('momentos').select('user_email').eq('id', id).maybeSingle();
    if (own && (own.user_email||'').toLowerCase() === (me().email||'').toLowerCase()){ toast('No podés dar like a tu propio momento','info'); return; }
  } catch(e){}
  const span = document.getElementById('mom-likes-'+id);
  let n = parseInt(span?.textContent||'0');
  const icon = btn.querySelector('i');
  const liked = icon?.classList.contains('bxs-heart');
  try {
    if (liked){
      await sb().from('momento_likes').delete().eq('momento_id',id).eq('user_email',me().email);
      await sb().rpc('dec_momento_likes', { p_id: id }).catch(()=>{});
      if (icon){ icon.className='bx bx-heart'; } btn.style.color='#fff';
      if (span) span.textContent = Math.max(0,n-1);
    } else {
      const { error: insErr } = await sb().from('momento_likes').insert({momento_id:id, user_email:me().email});
      if (insErr) return;
      await sb().rpc('inc_momento_likes', { p_id: id }).catch(()=>{});
      if (icon){ icon.className='bx bxs-heart'; } btn.style.color='var(--accent)';
      if (span) span.textContent = n+1;
      if (window._footballLikeAnim) window._footballLikeAnim(btn);
    }
  } catch(e){}
};

window._momDelete = async function(id, ownerEmail){
  const myEmail = (me()?.email||'').trim().toLowerCase();
  // Guardia de propiedad: solo el autor puede borrar
  if (ownerEmail && (ownerEmail||'').trim().toLowerCase() !== myEmail) {
    toast('Solo podés eliminar tus propios momentos','error'); return;
  }
  if (!confirm('¿Eliminar este momento?')) return;
  try {
    // Borrar solo si soy el autor (doble seguro contra RLS permisivo)
    const { error } = await sb().from('momentos').delete().eq('id',id).eq('user_email', me().email);
    if (error) { toast('No se pudo eliminar','error'); return; }
  } catch(e){ toast('No se pudo eliminar','error'); return; }
  document.getElementById('mom-stories-viewer')?.remove();
  document.getElementById('momento-viewer')?.remove();
  toast('Momento eliminado','success');
  window._loadMomentosBlock();
  if (document.getElementById('momentos-explorer')) window._momRenderExplorer();
};

/* Seguir al autor del momento (Paso 7) */
window._momFollow = async function(email, name, btn){
  if (!me()){ toast('Iniciá sesión','error'); return; }
  if (!email || email === me().email) return;
  try {
    await sb().from('follows').insert({ follower_email: me().email, following_email: email });
    if (window.CancheroNotif) CancheroNotif.create(email, 'follow', me().name, `${me().name} ahora te sigue.`);
  } catch(e){}
  if (btn){ btn.textContent='Siguiendo'; btn.style.background='transparent'; btn.style.color='#888'; btn.style.borderColor='#333'; btn.onclick=null; }
  toast('Ahora seguís a '+(name||'este jugador'),'success');
};

/* Responder un momento → DM con el autor (Paso 7) */
window._momReply = function(email, name){
  if (!me()){ toast('Iniciá sesión','error'); return; }
  document.getElementById('mom-stories-viewer')?.remove();
  document.getElementById('momentos-explorer')?.remove();
  try { if (typeof switchDashboardTab==='function') switchDashboardTab('jugador','mensajes',null); } catch(e){}
  setTimeout(()=>{ try { if (window.openChatWith) window.openChatWith(email, name); else if (window.CancheroMessaging) CancheroMessaging.openThread('dm', null, email, name); } catch(e){} }, 300);
};

window._momSendMsg = async function(toEmail, toName){
  const inp = document.getElementById('mom-msg-input');
  const txt = (inp && inp.value.trim()) || '';
  if (!txt){ return; }
  if (!me()){ toast('Inicia sesion','error'); return; }
  inp.value = '';
  try {
    await sb().from('messages').insert({ sender_email: me().email, sender_name: me().name || (me().email||'').split('@')[0], recipient_email: toEmail, recipient_name: toName||'', content: txt, read: false });
    toast('Mensaje enviado','success');
    try { if (window.CancheroNotif) CancheroNotif.create(toEmail, 'mensaje', me().name || 'Alguien', txt); } catch(e){}
  } catch(e){ toast('Error al enviar','error'); }
};

window._momShare = function(id, title){
  const url = 'https://canchero-app.vercel.app/#momento/'+id;
  if (navigator.share) navigator.share({title:'Momento Canchero', text:title, url}).catch(()=>{});
  else { try{ navigator.clipboard.writeText(url); toast('Link copiado','success'); }catch(e){ toast(title,'info'); } }
};

/* ══════════════════════════════════════════════════════════════
   INICIALIZACIÓN
══════════════════════════════════════════════════════════════ */
function _hook(){
  if (document.getElementById('feed-momentos-block')) window._loadMomentosBlock();
}
if (document.readyState !== 'loading') setTimeout(_hook, 800);
else document.addEventListener('DOMContentLoaded', () => setTimeout(_hook, 800));

/* Re-cargar al cambiar a feed */
const _origSwitch = window.switchDashboardTab;
if (typeof _origSwitch === 'function') {
  window.switchDashboardTab = function(role, tab, el){
    const r = _origSwitch.apply(this, arguments);
    if (tab === 'feed' || tab === 'inicio') setTimeout(() => window._loadMomentosBlock && window._loadMomentosBlock(), 300);
    return r;
  };
}

console.log('[canchero-momentos] v2 ✅ Stories por categoría cargado');
})();
