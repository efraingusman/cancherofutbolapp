/**
 * canchero-news.js — Noticias reales de fútbol en el feed (gratis vía /api/news)
 * Inyecta cards de noticias cada N posts. Cachea en sessionStorage para no repegar.
 * Sin emojis: solo iconos.
 */
(function(){
'use strict';

async function fetchNews(){
  // País del usuario (para diversificar) — si está logueado.
  let country = '';
  try { country = (window.userData && (window.userData.country || window.userData.nat)) || ''; } catch(e){}
  const cacheKey = 'canchero_news_' + (country || 'global');
  // Cache de sesión (válido 20 min) para no pegarle a la API en cada render
  try {
    const c = JSON.parse(sessionStorage.getItem(cacheKey)||'null');
    if (c && (Date.now()-c.t) < 20*60000 && c.a && c.a.length) return c.a;
  } catch(e){}
  try {
    const r = await fetch('/api/news' + (country ? ('?country=' + encodeURIComponent(country)) : ''));
    const j = await r.json();
    let a = (j && j.articles) || [];
    // Filtro extra de frescura del lado del cliente: SOLO últimos 2 días
    const cutoff = Date.now() - 2*24*3600*1000;
    a = a.filter(art => { const t = art.publishedAt ? new Date(art.publishedAt).getTime() : 0; return !t || t > cutoff; });
    // Solo noticias CON FOTO real (pedido 2026-07-08: nada de tarjetas sin imagen)
    a = a.filter(art => !!art.image);
    // DEDUP FUERTE: título normalizado (sin tildes/puntuación, primeros 60 chars),
    // URL e imagen — la misma noticia venía de varias fuentes con títulos casi iguales.
    const _seen = new Set();
    const _norm = (s) => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim().slice(0,60);
    a = a.filter(art => {
      const keys = [_norm(art.title), (art.url||'').trim(), (art.image||'').trim()].filter(Boolean);
      if (!keys.length || keys.some(k => _seen.has(k))) return false;
      keys.forEach(k => _seen.add(k));
      return true;
    });
    try { sessionStorage.setItem(cacheKey, JSON.stringify({ t:Date.now(), a })); } catch(e){}
    return a;
  } catch(e){ return []; }
}

function timeAgo(iso){
  if(!iso) return '';
  const s = Math.floor((Date.now()-new Date(iso))/1000);
  if(s<3600) return Math.max(1,Math.floor(s/60))+' min';
  if(s<86400) return Math.floor(s/3600)+'h';
  return Math.floor(s/86400)+'d';
}

// Clave estable por nota (url o título normalizado), apta para un atributo HTML.
function _newsKey(a){
  const base = (a.url || a.title || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-z0-9]/g,'').slice(0,48);
  return base || 'n';
}

function card(a){
  // P4.1: TODAS las noticias con foto. Si la fuente no trae imagen, usar un fondo de
  // marca (logo Canchero sobre degradé) para que ninguna tarjeta quede sin imagen.
  const _imgUrl = a.image || 'logo-oficial.png';
  const _cover = a.image
    ? `background:linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.55)),url('${_imgUrl}') center/cover no-repeat;`
    : `background:linear-gradient(135deg,#101810,#0a0a0a);display:flex;align-items:center;justify-content:center;`;
  const img = `<div style="height:160px;${_cover}">${a.image?'':`<img src="logo-oficial.png" onerror="this.src='logo.png'" style="height:52px;width:auto;opacity:0.85;">`}</div>`;
  const href = a.url && a.url!=='#' ? a.url : null;
  const _d = encodeURIComponent(JSON.stringify({ t:a.title||'', d:a.description||'', i:a.image||'', u:a.url||'', s:a.source||'' }));
  const onclick = href ? `window._openNewsInApp('${_d}')` : '';
  // Clave estable de la nota: permite detectar si ya está en el feed antes de insertarla.
  const _key = _newsKey(a);
  return `<article class="news-card" data-news-key="${_key}" style="background:#111;border:1px solid #1e1e1e;border-radius:16px;overflow:hidden;margin-bottom:12px;${href?'cursor:pointer;':''}" ${href?`onclick="${onclick}"`:''}>
    ${img}
    <div style="padding:14px 16px;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
        <span style="display:inline-flex;align-items:center;gap:5px;font-size:9px;font-weight:800;color:var(--accent);background:rgba(186,255,0,0.1);border:1px solid rgba(186,255,0,0.25);border-radius:10px;padding:2px 8px;"><i class='bx bx-news'></i> NOTICIA</span>
        <span style="font-size:10px;color:#666;">${(a.source||'').replace(/</g,'&lt;')}</span>
        <span style="font-size:10px;color:#444;margin-left:auto;"><i class='bx bx-time-five'></i> ${timeAgo(a.publishedAt)}</span>
      </div>
      <div style="font-size:15px;font-weight:800;color:#fff;line-height:1.35;margin-bottom:6px;">${(a.title||'').replace(/</g,'&lt;')}</div>
      ${a.description?`<div style="font-size:13px;color:#999;line-height:1.5;">${(a.description||'').replace(/</g,'&lt;')}</div>`:''}
      ${href?`<div style="margin-top:10px;font-size:12px;color:var(--accent);font-weight:700;">Leer nota <i class='bx bx-right-arrow-alt'></i></div>`:''}
    </div>
  </article>`;
}

// Inyecta noticias en el contenedor del feed (cada `every` posts)
// Antes saltaba el scroll al cargar async: ahora ancla y restaura.
window.injectNewsInFeed = async function(containerEl, every){
  every = every || 5;
  containerEl = containerEl || document.getElementById('main-feed-container');
  if (!containerEl) return;
  if (containerEl.querySelector('.news-card')) return; // ya inyectadas
  // El guard de arriba corre ANTES del await: si el feed llama a esta función dos o tres
  // veces seguidas (re-render, scroll infinito), todas lo pasaban y todas insertaban las
  // MISMAS noticias en el mismo lugar → la nota repetida 3 veces seguidas.
  if (containerEl.__newsBusy) return;
  containerEl.__newsBusy = true;
  try {
    await _injectNews(containerEl, every);
  } finally {
    containerEl.__newsBusy = false;
  }
};

async function _injectNews(containerEl, every){
  const news = await fetchNews();
  if (!news.length) return;
  // Re-chequeo DESPUÉS del await: otra llamada pudo haber terminado mientras esperábamos.
  if (containerEl.querySelector('.news-card')) return;

  // ── Anti-jump: ancla el primer post visible y restaura su top después ──
  const scroller = document.scrollingElement || document.documentElement;
  const vpTop = scroller.scrollTop;
  let anchorEl = null, anchorTop = 0;
  try {
    const candidates = Array.from(containerEl.querySelectorAll('article.post-card, article.poll-card'));
    for (const el of candidates) {
      const r = el.getBoundingClientRect();
      if (r.bottom > 0) { anchorEl = el; anchorTop = r.top; break; }
    }
  } catch(e){}

  // Segunda defensa: nunca insertar una nota cuya clave ya esté en el feed.
  const yaEsta = (a) => !!containerEl.querySelector('.news-card[data-news-key="' + _newsKey(a) + '"]');

  const posts = containerEl.querySelectorAll('article.post-card, article.poll-card');
  let idx = 0;
  for (let i = every-1; i < posts.length && idx < news.length; i += every){
    while (idx < news.length && yaEsta(news[idx])) idx++;
    if (idx >= news.length) break;
    posts[i].insertAdjacentHTML('afterend', card(news[idx++]));
  }
  // Si hay pocos posts, poner al menos una arriba (NO antes del anchor para no saltar)
  if (!containerEl.querySelector('.news-card') && news.length){
    containerEl.insertAdjacentHTML('beforeend', card(news[0]));
  }

  // Restaurar scroll relativo al anchor
  try {
    if (anchorEl) {
      const nr = anchorEl.getBoundingClientRect();
      const delta = nr.top - anchorTop;
      if (Math.abs(delta) > 4) scroller.scrollTop = vpTop + delta;
    }
  } catch(e){}
};

// Lector de noticia DENTRO de Canchero: imagen + título + resumen + botón a la fuente.
// (No usamos iframe porque los diarios lo bloquean y queda en blanco.)
window._openNewsInApp = function(data){
  let a = {}; try { a = JSON.parse(decodeURIComponent(data)); } catch(e){ a = {}; }
  const esc = s => (s||'').toString().replace(/</g,'&lt;');
  const url = a.u||'';
  let m = document.getElementById('news-reader'); if (m) m.remove();
  m = document.createElement('div'); m.id = 'news-reader';
  m.style.cssText = 'position:fixed;inset:0;z-index:100080;background:#0a0a0a;display:flex;flex-direction:column;';
  m.innerHTML = `
    <!-- Fila 1: barra superior estándar (logo + campana + ajustes), como en toda la app -->
    <div style="flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;padding:max(env(safe-area-inset-top,0px),10px) 14px 8px;background:#0d0d0d;">
      <img src="logo-oficial.png" onerror="this.src='logo.png'" style="height:34px;width:auto;">
      <div style="display:flex;align-items:center;gap:8px;">
        <button onclick="window.CancheroNotif?window.CancheroNotif.togglePanel():(window.openNotificationsPanel&&window.openNotificationsPanel())" style="background:rgba(255,255,255,0.06);border:1px solid #333;color:#aaa;width:38px;height:38px;border-radius:50%;font-size:18px;cursor:pointer;"><i class='bx bx-bell'></i></button>
        <button onclick="window.switchDashboardTab&&switchDashboardTab((window.userData&&window.userData.role)||'jugador','ajustes',null)" style="background:rgba(255,255,255,0.06);border:1px solid #333;color:#aaa;width:38px;height:38px;border-radius:50%;font-size:18px;cursor:pointer;"><i class='bx bx-cog'></i></button>
      </div>
    </div>
    <!-- Fila 2: volver, debajo de la barra -->
    <div style="flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:4px 14px 10px;background:#0d0d0d;border-bottom:1px solid #1a1a1a;">
      <button onclick="document.getElementById('news-reader').remove()" title="Volver" style="background:rgba(255,255,255,0.08);border:none;color:#fff;width:36px;height:36px;border-radius:50%;font-size:19px;cursor:pointer;flex-shrink:0;"><i class='bx bx-arrow-back'></i></button>
      <div style="flex:1;min-width:0;font-size:12px;font-weight:800;color:var(--accent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"><i class='bx bx-news'></i> ${esc(a.s)}</div>
    </div>
    <div style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;">
      ${a.i?`<div style="width:100%;height:220px;background:url('${a.i}') center/cover no-repeat;"></div>`:''}
      <div style="padding:18px 18px 32px;">
        <div style="font-size:21px;font-weight:900;color:#fff;line-height:1.3;margin-bottom:12px;">${esc(a.t)}</div>
        <div style="font-size:15px;color:#cfcfcf;line-height:1.7;margin-bottom:22px;">${esc(a.d)||'Tocá "Leer la nota completa" para ver el artículo en la fuente.'}</div>
        ${url?`<button onclick="window.open('${url.replace(/'/g,"\\'")}','_blank')" style="width:100%;background:var(--accent);color:#000;border:none;border-radius:14px;padding:14px;font-weight:900;font-size:15px;cursor:pointer;"><i class='bx bx-link-external'></i> Leer la nota completa</button>`:''}
        <div style="font-size:11px;color:#555;text-align:center;margin-top:12px;">La nota completa se abre en la fuente original.</div>
      </div>
    </div>`;
  document.body.appendChild(m);
};

console.log('[canchero-news] ✅ noticias de fútbol en el feed');
})();
