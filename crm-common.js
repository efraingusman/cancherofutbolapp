/**
 * crm-common.js — Secciones compartidas de los paneles CRM (tienda/complejo/organización)
 * · Caja (P3.8): ingresos/egresos manuales + suma automática (tabla business_cashflow)
 * · Proveedores (P3.9): nombre/servicio/gasto (tabla business_providers)
 * · Hablar con soporte (P3.7): mensaje directo al CRM del admin
 * Requiere globals de la página: sb (supabase client), BIZ_EMAIL, toast(msg).
 */
(function(){
'use strict';
var ADMIN_EMAIL = 'neurovidstudioia@gmail.com';

// ── EMBED (dentro del PANEL de la app, iframe): el iframe ya arranca DEBAJO del
// notch → env(safe-area-inset-top) vuelve a sumar el notch y deja un espacio
// vacío enorme arriba del título en iPhone. Al embeber, se anula ese padding y
// se oculta la topbar móvil (el header de la app ya la reemplaza). ──
(function _crmEmbedFix(){
  try {
    var embedded = false;
    try { embedded = new URLSearchParams(location.search).get('embed') === '1' || window.self !== window.top; } catch(e){ embedded = true; }
    if (!embedded) return;
    // El iframe ya está bajo el notch: la topbar móvil (fixed top:0) queda arriba de
    // todo sin safe-area, y el padding de .page NO debe volver a sumar el notch.
    var st = document.createElement('style');
    st.textContent =
      '@media(max-width:768px){' +
        '.crm-mobile-topbar{padding-top:0 !important;height:48px !important;}' +
        '.page{padding-top:56px !important;}' +   /* solo alto de la topbar, SIN safe-area */
        '.sidebar{top:48px !important;padding-top:6px !important;}' +
      '}';
    (document.head || document.documentElement).appendChild(st);
    document.documentElement.classList.add('crm-embedded');
  } catch(e){}
})();
/* ── Encabezados duplicados ──────────────────────────────────────────────
   La topbar muestra el título de la página y un botón de acción general, y
   además cada página trae SU propio <h2> con el mismo texto y su propio botón.
   Resultado: "Mis Canchas / + Nueva reserva" arriba y "Mis Canchas / + Nueva
   cancha" abajo. Se oculta el <h2> repetido y, si la página trae su propio
   botón, se esconden los de la topbar (el de la página es el que corresponde).
   Se aplica a los cuatro paneles sin tocar cada HTML. */
function _crmNorm(s){ return (s||'').replace(/\s+/g,' ').trim().toLowerCase(); }
function _crmDedupHeader(){
  try {
    var tb = document.getElementById('page-title');
    var activa = document.querySelector('.page.active');
    if (!activa) return;
    // Restaurar lo ocultado en la página anterior
    Array.prototype.forEach.call(document.querySelectorAll('[data-crm-oculto]'), function(el){
      el.style.display = ''; el.removeAttribute('data-crm-oculto');
    });
    // Bloque de encabezado propio = primer hijo directo que contenga un <h2>
    var head = null, h2 = null;
    var hijos = activa.children;
    for (var i = 0; i < hijos.length && i < 3; i++) {
      var candidato = hijos[i].tagName === 'H2' ? hijos[i] : hijos[i].querySelector && hijos[i].querySelector('h2');
      if (candidato) { head = hijos[i]; h2 = candidato; break; }
    }
    if (!h2) return;
    if (tb && _crmNorm(h2.textContent) === _crmNorm(tb.textContent)) {
      h2.style.display = 'none'; h2.setAttribute('data-crm-oculto','1');
    }
    if (head.querySelector('button')) {
      Array.prototype.forEach.call(document.querySelectorAll('.topbar-actions button'), function(b){
        // offsetParent es null en contenedores position:fixed (la topbar lo es), así que
        // la visibilidad se mira por el estilo calculado.
        if (getComputedStyle(b).display === 'none') return;   // ya lo ocultó la página
        b.style.display = 'none'; b.setAttribute('data-crm-oculto','1');
      });
    }
  } catch(e){}
}
// Envolver showPage para normalizar en cada cambio de sección.
(function _crmHookShowPage(){
  function envolver(){
    if (typeof window.showPage !== 'function' || window.showPage.__crmWrap) return false;
    var orig = window.showPage;
    var wrap = function(){ var r = orig.apply(this, arguments); setTimeout(_crmDedupHeader, 0); return r; };
    wrap.__crmWrap = true;
    window.showPage = wrap;
    setTimeout(_crmDedupHeader, 0);   // normalizar la sección inicial
    return true;
  }
  if (!envolver()) {
    var n = 0, iv = setInterval(function(){ if (envolver() || ++n > 20) clearInterval(iv); }, 150);
  }
})();

/* ── Abrir un perfil desde el CRM ────────────────────────────────────────
   El CRM vive dentro de un iframe de la app. Hacer window.open('index.html?...')
   recargaba la app entera y "te sacaba de todo". Si estamos embebidos y el padre
   ya tiene el visor de perfiles, se lo pedimos a él; si no, recién ahí se abre
   en una pestaña nueva. */
window.crmAbrirPerfil = function(tipo, ref){
  if (!ref) return;
  try {
    var embebido = window.self !== window.top;
    var padre = embebido ? window.parent : null;
    if (padre) {
      if (tipo === 'club' && typeof padre.viewClubProfile === 'function') { padre.viewClubProfile(ref); return; }
      if (tipo !== 'club' && typeof padre.viewUserProfile === 'function') { padre.viewUserProfile(ref, true); return; }
    }
  } catch(e){ /* cross-origin o padre sin visor: caemos a la pestaña nueva */ }
  var url = 'index.html?' + (tipo === 'club' ? 'club=' : 'perfil=') + encodeURIComponent(ref);
  window.open(url, '_blank');
};

function _fmt(n){ n = Number(n)||0; return '$' + n.toLocaleString('es-UY',{maximumFractionDigits:0}); }
function _t(msg){ try { toast(msg); } catch(e){ alert(msg); } }
function _modal(html){
  var m = document.createElement('div');
  m.className = 'modal open';
  m.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:16px;';
  m.innerHTML = '<div style="background:#101210;border:1px solid #242624;border-radius:16px;width:100%;max-width:380px;padding:18px;box-sizing:border-box;">' + html + '</div>';
  m.onclick = function(e){ if (e.target === m) m.remove(); };
  document.body.appendChild(m);
  return m;
}

/* ── SECCIONES DE LA APP EN EL SIDEBAR DEL PANEL ────────────
   Al entrar al panel se "perdían" Inicio/Buscar/Chats/Perfil/Comunidades.
   Se agregan al final del sidebar con un estilo propio (son secciones de la
   APP, fuera del panel, dentro del mismo rol). */
(function _crmAppNav(){
  function inject(){
    var sb = document.getElementById('crm-sidebar');
    if (!sb || document.getElementById('crm-app-nav')) return;
    // El menú va al final del sidebar (margin-top:auto). En celular el sidebar es un
    // drawer de 100vh y el CRM va embebido en un iframe, así que la barra inferior de la
    // app lo tapaba entero. Se OCULTA en celular —esas secciones ya están en la barra
    // inferior— y en PC se despega del borde. Sirve sobre todo en PC.
    if (!document.getElementById('crm-app-nav-css')) {
      var _st = document.createElement('style');
      _st.id = 'crm-app-nav-css';
      _st.textContent = '#crm-app-nav{margin-bottom:calc(10px + env(safe-area-inset-bottom,0px));}'
        + '@media(max-width:768px){#crm-app-nav{display:none !important;}}';
      (document.head || document.documentElement).appendChild(_st);
    }
    var wrap = document.createElement('div');
    wrap.id = 'crm-app-nav';
    wrap.style.cssText = 'margin-top:auto;padding:10px;border-top:1px dashed rgba(186,255,0,0.25);background:rgba(186,255,0,0.03);';
    var item = function(icon, label, goto){
      return '<div onclick="window.location.href=\'index.html?goto=' + goto + '\'" style="display:flex;align-items:center;gap:10px;padding:7px 12px;border-radius:8px;cursor:pointer;font-size:12.5px;color:#c8e6a0;font-weight:600;margin-bottom:1px;border:1px solid transparent;" onmouseover="this.style.background=\'rgba(186,255,0,0.08)\';this.style.color=\'var(--accent)\'" onmouseout="this.style.background=\'none\';this.style.color=\'#c8e6a0\'">'
        + '<i class="bx ' + icon + '" style="font-size:18px;width:22px;flex-shrink:0;color:var(--accent);"></i> ' + label
        + '<i class="bx bx-link-external" style="margin-left:auto;font-size:12px;opacity:.5;"></i></div>';
    };
    wrap.innerHTML =
      '<div style="font-size:9px;color:var(--accent);font-weight:800;text-transform:uppercase;letter-spacing:1.5px;margin:2px 0 6px;padding-left:8px;opacity:.85;">Canchero — mi app</div>'
      + item('bx-home-alt-2', 'Inicio (feed)', 'feed')
      + item('bx-search', 'Buscar', 'buscar')
      + item('bx-chat', 'Chats', 'chats')
      + item('bx-group', 'Comunidades', 'comunidades')
      + item('bx-user', 'Mi Perfil', 'perfil');
    sb.appendChild(wrap);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
  // Reintentos: por si el sidebar se re-renderiza o algún script previo demora
  [400, 1200, 3000, 6000].forEach(function(ms){ setTimeout(inject, ms); });
})();

/* ── SYNC DE BRANDING AL NEGOCIO ────────────────────────────
   Los CRM guardaban foto/portada/bio SOLO en users; la app lee la identidad
   del negocio desde business_requests.payload → la foto "no aparecía" en
   momentos/posts/perfil. Esto mergea los campos en la fila del negocio. */
window.crmSyncBizPayload = async function(fields){
  try {
    var biz = {}; try { biz = JSON.parse(sessionStorage.getItem('crm_biz')||'{}') || {}; } catch(e){}
    var email = (typeof BIZ_EMAIL !== 'undefined' && BIZ_EMAIL) || biz.email;
    if (!email || !fields) return;
    var q = await sb.from('business_requests').select('id,name,payload').eq('email', email).order('created_at',{ascending:false});
    var rows = q.data || [];
    if (!rows.length) return;
    var row = rows.filter(function(b){ return biz.name && (b.name||'').toLowerCase() === (biz.name||'').toLowerCase(); })[0] || rows[0];
    var pl = row.payload || {}; try { if (typeof pl === 'string') pl = JSON.parse(pl); } catch(e){ pl = {}; }
    Object.keys(fields).forEach(function(k){ if (fields[k] != null && fields[k] !== '') pl[k] = fields[k]; });
    var upd = { payload: pl };
    if (fields.photo) upd.photo = fields.photo;
    if (fields.name) upd.name = fields.name;
    var r = await sb.from('business_requests').update(upd).eq('id', row.id);
    if (r.error) await sb.from('business_requests').update({ payload: pl }).eq('id', row.id);
  } catch(e){ console.warn('crmSyncBizPayload:', e && e.message); }
};

/* ── COMPARTIR AL FEED ─────────────────────────────────────
   Publica un producto/cancha/servicio/torneo como POST del feed de la app,
   con tarjeta CTA (Comprar/Reservar) que lleva al perfil del negocio.
   item = { kind:'producto'|'cancha'|'servicio'|'torneo', id, name, price, photo, detail } */
window.crmShareToFeed = function(item){
  var m = _modal(
    '<div style="font-weight:900;font-size:15px;margin-bottom:4px;"><i class="bx bx-share-alt" style="color:var(--accent);"></i> Compartir al feed</div>'
    + '<div style="font-size:11px;color:#888;margin-bottom:12px;">Se publica en el feed de Canchero con boton de ' + ((item.kind==='producto')?'compra':'reserva') + '. Dura 12 horas (podes fijarlo desde tu perfil).</div>'
    + '<div style="display:flex;align-items:center;gap:10px;background:#181a18;border:1px solid #2a2c2a;border-radius:12px;padding:10px;margin-bottom:12px;">'
    + (item.photo ? '<img src="' + item.photo + '" style="width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0;">' : '')
    + '<div style="min-width:0;"><div style="font-weight:800;font-size:13px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + String(item.name||'').replace(/</g,'&lt;') + '</div>'
    + (item.price ? '<div style="font-size:12px;color:var(--accent);font-weight:800;">$' + item.price + '</div>' : '') + '</div></div>'
    + '<label style="font-size:10px;color:#888;font-weight:700;">TEXTO DE LA PUBLICACION (opcional)</label>'
    + '<textarea id="shf-text" rows="3" placeholder="Ej: Nuevo ingreso! Aprovecha esta semana..." style="width:100%;background:#181a18;border:1px solid #2a2c2a;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;margin:5px 0 14px;box-sizing:border-box;outline:none;resize:none;"></textarea>'
    + '<div style="display:flex;gap:8px;"><button onclick="this.closest(\'.modal\').remove()" style="flex:1;background:rgba(255,255,255,0.06);border:none;color:#aaa;border-radius:10px;padding:11px;font-weight:800;cursor:pointer;">Cancelar</button>'
    + '<button id="shf-pub" style="flex:2;background:var(--accent);border:none;color:#000;border-radius:10px;padding:11px;font-weight:900;cursor:pointer;">PUBLICAR AL FEED</button></div>'
  );
  m.querySelector('#shf-pub').onclick = async function(){
    var btn = this; btn.disabled = true; btn.textContent = 'Publicando...';
    try {
      var biz = {}; try { biz = JSON.parse(sessionStorage.getItem('crm_biz')||'{}') || {}; } catch(e){}
      var email = (typeof BIZ_EMAIL !== 'undefined' && BIZ_EMAIL) || biz.email;
      if (!email) throw new Error('Sin sesion de negocio');
      // Identidad del negocio (id/foto/nombre reales de business_requests)
      var bizId = null, bizPhoto = biz.photo || null, bizName = biz.name || 'Mi negocio', bizRole = biz.role || 'tienda';
      try {
        var q = await sb.from('business_requests').select('id,name,role,payload').eq('email', email);
        var rows = (q.data||[]).filter(function(b){ return !biz.name || (b.name||'').toLowerCase() === (biz.name||'').toLowerCase(); });
        var row = rows[0] || (q.data||[])[0];
        if (row) {
          bizId = String(row.id); bizName = row.name || bizName; bizRole = row.role || bizRole;
          var pl = row.payload || {}; try { if (typeof pl === 'string') pl = JSON.parse(pl); } catch(e){ pl = {}; }
          bizPhoto = row.photo || pl.photo || bizPhoto;
        }
      } catch(e){}
      var kindLabels = { producto:'Producto', cancha:'Cancha', servicio:'Servicio', torneo:'Torneo' };
      var text = (m.querySelector('#shf-text').value||'').trim();
      var photos = (item.photos && item.photos.length) ? item.photos : (item.photo ? [item.photo] : []);
      var post = {
        user_email: email, user_name: bizName, user_role: bizRole, user_avatar: bizPhoto,
        content: text, media_type: 'text', likes_count: 0,
        expires_at: new Date(Date.now() + 12*3600000).toISOString(),
        meta: { biz_item: { kind: item.kind, kindLabel: kindLabels[item.kind]||item.kind, id: String(item.id||''), name: item.name||'', price: item.price||null, photo: item.photo||photos[0]||null, photos: photos, detail: item.detail||null, bizId: bizId } }
      };
      // Varias fotos → carrusel estándar del feed (se pueden pasar deslizando)
      if (photos.length > 1) {
        post.media_urls = JSON.stringify(photos.map(function(u){ return { url:u, type:'image' }; }));
        post.media_url = photos[0]; post.media_type = 'image';
      }
      if (bizId) post.business_id = bizId;
      var r = await sb.from('posts').insert(post);
      if (r.error && /media_urls/.test(r.error.message||'')) { delete post.media_urls; r = await sb.from('posts').insert(post); }
      if (r.error && /business_id/.test(r.error.message||'')) { delete post.business_id; r = await sb.from('posts').insert(post); }
      if (r.error && /meta/.test(r.error.message||'')) {
        // Fallback sin columna meta: publicar como post con foto + texto CTA
        post.content = (text ? text + '\n\n' : '') + (kindLabels[item.kind]||'') + ': ' + (item.name||'') + (item.price ? ' — $' + item.price : '');
        if (item.photo) { post.media_url = item.photo; post.media_type = 'image'; }
        delete post.meta;
        r = await sb.from('posts').insert(post);
      }
      if (r.error) throw r.error;
      m.remove();
      _t('Publicado al feed de Canchero.');
    } catch(e) { btn.disabled = false; btn.textContent = 'PUBLICAR AL FEED'; _t('No se pudo publicar: ' + (e.message||'')); }
  };
};

/* ── CAJA ─────────────────────────────────────────────── */
window.crmCajaLoad = async function(){
  var list = document.getElementById('caja-list'); if (!list) return;
  list.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#666;padding:16px;">Cargando...</td></tr>';
  try {
    // ilike (case-insensitive) en vez de eq: los ingresos automáticos (inscripciones a
    // torneos) se insertan con organizer_email, cuyo casing puede diferir de BIZ_EMAIL.
    // Con eq exacto esos movimientos no aparecían y el total quedaba en $0. (B6)
    var r = await sb.from('business_cashflow').select('*').ilike('business_email', BIZ_EMAIL).order('created_at',{ascending:false}).limit(300);
    var rows = r.data || [];
    var tin = 0, tout = 0;
    rows.forEach(function(x){ if (x.type==='ingreso') tin += Number(x.amount)||0; else tout += Number(x.amount)||0; });
    var elIn = document.getElementById('caja-in'), elOut = document.getElementById('caja-out'), elTot = document.getElementById('caja-total');
    if (elIn) elIn.textContent = _fmt(tin);
    if (elOut) elOut.textContent = _fmt(tout);
    if (elTot) { elTot.textContent = _fmt(tin-tout); elTot.style.color = (tin-tout) >= 0 ? 'var(--accent)' : '#ff6666'; }
    if (!rows.length) { list.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#666;padding:16px;">Sin movimientos. Agregá tu primer ingreso o egreso.</td></tr>'; return; }
    list.innerHTML = rows.map(function(x){
      var d = new Date(x.created_at); var ds = d.toLocaleDateString('es-UY',{day:'2-digit',month:'2-digit'});
      var esIn = x.type === 'ingreso';
      return '<tr><td style="color:#888;">' + ds + '</td><td>' + String(x.concept||'').replace(/</g,'&lt;') + '</td>'
        + '<td><span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:10px;background:' + (esIn?'rgba(186,255,0,0.1)':'rgba(255,80,80,0.12)') + ';color:' + (esIn?'var(--accent)':'#ff6666') + ';">' + (esIn?'INGRESO':'EGRESO') + '</span></td>'
        + '<td style="text-align:right;font-weight:800;color:' + (esIn?'var(--accent)':'#ff6666') + ';">' + (esIn?'+':'-') + _fmt(x.amount) + '</td>'
        + '<td style="text-align:right;"><button class="btn-sm" style="background:none;border:none;color:#666;cursor:pointer;" onclick="crmCajaDel(\'' + x.id + '\')"><i class=\'bx bx-trash\'></i></button></td></tr>';
    }).join('');
  } catch(e) { list.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#f66;padding:16px;">Error: ' + (e.message||'') + '</td></tr>'; }
};
window.crmCajaAdd = function(type){
  var esIn = type === 'ingreso';
  var m = _modal(
    '<div style="font-weight:900;font-size:15px;margin-bottom:12px;">' + (esIn?'Nuevo ingreso':'Nuevo egreso') + '</div>'
    + '<label style="font-size:10px;color:#888;font-weight:700;">CONCEPTO</label>'
    + '<input id="cj-concept" type="text" placeholder="' + (esIn?'Ej: Venta mostrador':'Ej: Compra de mercadería') + '" style="width:100%;background:#181a18;border:1px solid #2a2c2a;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;margin:5px 0 12px;box-sizing:border-box;outline:none;">'
    + '<label style="font-size:10px;color:#888;font-weight:700;">MONTO ($)</label>'
    + '<input id="cj-amount" type="number" min="0" step="1" placeholder="0" style="width:100%;background:#181a18;border:1px solid #2a2c2a;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;margin:5px 0 16px;box-sizing:border-box;outline:none;">'
    + '<div style="display:flex;gap:8px;"><button onclick="this.closest(\'.modal\').remove()" style="flex:1;background:rgba(255,255,255,0.06);border:none;color:#aaa;border-radius:10px;padding:11px;font-weight:800;cursor:pointer;">Cancelar</button>'
    + '<button id="cj-save" style="flex:2;background:var(--accent);border:none;color:#000;border-radius:10px;padding:11px;font-weight:900;cursor:pointer;">Guardar</button></div>'
  );
  m.querySelector('#cj-save').onclick = async function(){
    var concept = (m.querySelector('#cj-concept').value||'').trim();
    var amount = parseFloat(m.querySelector('#cj-amount').value||'0');
    if (!concept) { _t('Poné un concepto.'); return; }
    if (!(amount > 0)) { _t('Poné un monto mayor a 0.'); return; }
    try {
      var ins = await sb.from('business_cashflow').insert({ business_email: (BIZ_EMAIL||'').toLowerCase(), type: type, concept: concept, amount: amount });
      if (ins.error) throw ins.error;
      m.remove(); _t(esIn?'Ingreso registrado.':'Egreso registrado.'); crmCajaLoad();
    } catch(e){ _t('Error: ' + (e.message||'')); }
  };
  setTimeout(function(){ try{ m.querySelector('#cj-concept').focus(); }catch(e){} }, 100);
};
window.crmCajaDel = async function(id){
  try { await sb.from('business_cashflow').delete().eq('id', id); crmCajaLoad(); } catch(e){ _t('Error al borrar.'); }
};

/* ── PROVEEDORES ──────────────────────────────────────── */
window.crmProvLoad = async function(){
  var list = document.getElementById('prov-list'); if (!list) return;
  list.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#666;padding:16px;">Cargando...</td></tr>';
  try {
    var r = await sb.from('business_providers').select('*').eq('business_email', BIZ_EMAIL).order('created_at',{ascending:false}).limit(200);
    var rows = r.data || [];
    if (!rows.length) { list.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#666;padding:16px;">Sin proveedores. Agregá el primero.</td></tr>'; return; }
    list.innerHTML = rows.map(function(p){
      return '<tr><td style="font-weight:700;">' + String(p.name||'').replace(/</g,'&lt;') + '</td>'
        + '<td style="color:#aaa;">' + String(p.service||'—').replace(/</g,'&lt;') + '</td>'
        + '<td style="text-align:right;font-weight:800;">' + _fmt(p.cost) + '</td>'
        + '<td style="text-align:right;"><button style="background:none;border:none;color:#666;cursor:pointer;" onclick="crmProvDel(\'' + p.id + '\')"><i class=\'bx bx-trash\'></i></button></td></tr>';
    }).join('');
  } catch(e) { list.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#f66;padding:16px;">Error: ' + (e.message||'') + '</td></tr>'; }
};
window.crmProvAdd = function(){
  var m = _modal(
    '<div style="font-weight:900;font-size:15px;margin-bottom:12px;">Nuevo proveedor</div>'
    + '<label style="font-size:10px;color:#888;font-weight:700;">NOMBRE</label>'
    + '<input id="pv-name" type="text" placeholder="Ej: Distribuidora Sur" style="width:100%;background:#181a18;border:1px solid #2a2c2a;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;margin:5px 0 12px;box-sizing:border-box;outline:none;">'
    + '<label style="font-size:10px;color:#888;font-weight:700;">SERVICIO / QUÉ PROVEE</label>'
    + '<input id="pv-service" type="text" placeholder="Ej: Indumentaria" style="width:100%;background:#181a18;border:1px solid #2a2c2a;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;margin:5px 0 12px;box-sizing:border-box;outline:none;">'
    + '<label style="font-size:10px;color:#888;font-weight:700;">GASTO MENSUAL APROX. ($)</label>'
    + '<input id="pv-cost" type="number" min="0" step="1" placeholder="0" style="width:100%;background:#181a18;border:1px solid #2a2c2a;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;margin:5px 0 16px;box-sizing:border-box;outline:none;">'
    + '<div style="display:flex;gap:8px;"><button onclick="this.closest(\'.modal\').remove()" style="flex:1;background:rgba(255,255,255,0.06);border:none;color:#aaa;border-radius:10px;padding:11px;font-weight:800;cursor:pointer;">Cancelar</button>'
    + '<button id="pv-save" style="flex:2;background:var(--accent);border:none;color:#000;border-radius:10px;padding:11px;font-weight:900;cursor:pointer;">Guardar</button></div>'
  );
  m.querySelector('#pv-save').onclick = async function(){
    var name = (m.querySelector('#pv-name').value||'').trim();
    if (!name) { _t('Poné el nombre del proveedor.'); return; }
    try {
      var ins = await sb.from('business_providers').insert({
        business_email: BIZ_EMAIL, name: name,
        service: (m.querySelector('#pv-service').value||'').trim() || null,
        cost: parseFloat(m.querySelector('#pv-cost').value||'0') || 0
      });
      if (ins.error) throw ins.error;
      m.remove(); _t('Proveedor agregado.'); crmProvLoad();
    } catch(e){ _t('Error: ' + (e.message||'')); }
  };
  setTimeout(function(){ try{ m.querySelector('#pv-name').focus(); }catch(e){} }, 100);
};
window.crmProvDel = async function(id){
  try { await sb.from('business_providers').delete().eq('id', id); crmProvLoad(); } catch(e){ _t('Error al borrar.'); }
};

/* ── PIPELINE: leads automáticos desde chats entrantes (P3.4) ──
   Cada cliente que escribe al negocio aparece como "Consulta" (primera etapa)
   si todavía no tiene una orden abierta. */
window.crmSyncLeadsFromChats = async function(){
  try {
    var since = new Date(Date.now() - 14*24*3600000).toISOString();
    var msgs = await sb.from('messages').select('sender_email,sender_name,created_at').eq('recipient_email', BIZ_EMAIL).gte('created_at', since).order('created_at',{ascending:false}).limit(200);
    var senders = {};
    (msgs.data||[]).forEach(function(m){ var e=(m.sender_email||'').toLowerCase(); if (e && e!==BIZ_EMAIL.toLowerCase() && !senders[e]) senders[e]=m.sender_name||e; });
    var emails = Object.keys(senders);
    if (!emails.length) return;
    var ords = await sb.from('business_orders').select('client_email,cliente_email,estado').eq('business_email', BIZ_EMAIL).gte('created_at', since);
    var have = {};
    (ords.data||[]).forEach(function(o){ var e=((o.client_email||o.cliente_email)||'').toLowerCase(); if (e) have[e]=true; });
    for (var i=0;i<emails.length;i++){
      var e = emails[i];
      if (have[e]) continue;
      try {
        await sb.from('business_orders').insert({ business_email: BIZ_EMAIL, client_email: e, client_name: senders[e], product_name: 'Consulta por chat', cantidad: 1, precio_total: 0, estado: 'consulta' });
      } catch(err){ console.warn('lead insert', err); }
    }
  } catch(e){ console.warn('crmSyncLeadsFromChats', e); }
};

/* ── REGISTRAR VENTA (P3.12): un solo paso que impacta ventas + caja + stock + pipeline ── */
window.crmRegisterSale = async function(orderId, presetClient){
  var prods = [];
  // Solo la TIENDA lista productos: por email se colaban los productos de la tienda
  // en el panel del complejo/organización (mismo dueño, negocios distintos).
  var _esTienda = /crm-tienda/i.test(location.pathname);
  if (_esTienda) { try { var r = await sb.from('business_products').select('id,name,price,stock').eq('business_email', BIZ_EMAIL).eq('is_active', true).order('name'); prods = r.data || []; } catch(e){} }
  var prodOpts = prods.map(function(p){ return '<option value="' + p.id + '" data-price="' + (p.price||0) + '">' + String(p.name||'').replace(/</g,'&lt;') + (p.stock!=null?(' (stock '+p.stock+')'):'') + '</option>'; }).join('');
  var m = _modal(
    '<div style="font-weight:900;font-size:15px;margin-bottom:12px;"><i class=\'bx bx-badge-check\' style="color:var(--accent);"></i> Registrar venta</div>'
    + (prods.length ? ('<label style="font-size:10px;color:#888;font-weight:700;">PRODUCTO / SERVICIO</label>'
      + '<select id="rv-prod" style="width:100%;background:#181a18;border:1px solid #2a2c2a;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;margin:5px 0 10px;box-sizing:border-box;outline:none;">' + prodOpts + '<option value="">Otro (escribir abajo)</option></select>') : '')
    + '<label style="font-size:10px;color:#888;font-weight:700;">DETALLE (si no está en la lista)</label>'
    + '<input id="rv-concept" type="text" placeholder="Ej: Reserva cancha 20hs / Inscripción torneo" style="width:100%;background:#181a18;border:1px solid #2a2c2a;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;margin:5px 0 10px;box-sizing:border-box;outline:none;">'
    + '<div style="display:flex;gap:8px;">'
    + '<div style="flex:1;"><label style="font-size:10px;color:#888;font-weight:700;">CANTIDAD</label><input id="rv-qty" type="number" min="1" value="1" style="width:100%;background:#181a18;border:1px solid #2a2c2a;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;margin-top:5px;box-sizing:border-box;outline:none;"></div>'
    + '<div style="flex:1;"><label style="font-size:10px;color:#888;font-weight:700;">PRECIO UNIT. ($)</label><input id="rv-price" type="number" min="0" value="0" style="width:100%;background:#181a18;border:1px solid #2a2c2a;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;margin-top:5px;box-sizing:border-box;outline:none;"></div>'
    + '</div>'
    + '<label style="font-size:10px;color:#888;font-weight:700;display:block;margin-top:10px;">CLIENTE (nombre o email)</label>'
    + '<input id="rv-client" type="text" value="' + String(presetClient||'').replace(/"/g,'&quot;') + '" placeholder="Ej: Juan Pérez" style="width:100%;background:#181a18;border:1px solid #2a2c2a;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;margin:5px 0 16px;box-sizing:border-box;outline:none;">'
    + '<div style="display:flex;gap:8px;"><button onclick="this.closest(\'.modal\').remove()" style="flex:1;background:rgba(255,255,255,0.06);border:none;color:#aaa;border-radius:10px;padding:11px;font-weight:800;cursor:pointer;">Cancelar</button>'
    + '<button id="rv-save" style="flex:2;background:var(--accent);border:none;color:#000;border-radius:10px;padding:11px;font-weight:900;cursor:pointer;">REGISTRAR VENTA</button></div>'
  );
  var selEl = m.querySelector('#rv-prod');
  if (selEl) {
    var syncPrice = function(){ var o = selEl.selectedOptions[0]; if (o && o.dataset.price) m.querySelector('#rv-price').value = o.dataset.price; };
    selEl.onchange = syncPrice; syncPrice();
  }
  m.querySelector('#rv-save').onclick = async function(){
    var prodId = selEl ? selEl.value : '';
    var prod = prods.filter(function(p){ return String(p.id)===String(prodId); })[0] || null;
    var concept = (m.querySelector('#rv-concept').value||'').trim() || (prod && prod.name) || 'Venta';
    var name = prod ? prod.name : concept;
    var qty = Math.max(1, parseInt(m.querySelector('#rv-qty').value)||1);
    var price = parseFloat(m.querySelector('#rv-price').value)||0;
    var total = qty * price;
    var client = (m.querySelector('#rv-client').value||'').trim();
    try {
      // 1) Venta
      try { await sb.from('business_sales').insert({ business_email: BIZ_EMAIL, product_id: prod?prod.id:null, product_name: name, qty: qty, unit_price: price, total: total, channel: 'manual', client_name: client||null, status: 'pagado' }); } catch(e){}
      // 2) Caja: ingreso automático
      try { await sb.from('business_cashflow').insert({ business_email: BIZ_EMAIL, type: 'ingreso', concept: 'Venta: ' + name + (client?(' — '+client):''), amount: total }); } catch(e){}
      // 3) Stock
      if (prod && prod.stock != null) { try { await sb.from('business_products').update({ stock: Math.max(0, prod.stock - qty) }).eq('id', prod.id); } catch(e){} }
      // 4) Pipeline: cerrar la orden origen o crear una pagada
      if (orderId) {
        try { await sb.from('business_orders').update({ estado: 'pagado', product_name: name, cantidad: qty, precio_total: total }).eq('id', orderId); } catch(e){ try { await sb.from('business_orders').update({ estado: 'pagado' }).eq('id', orderId); } catch(e2){} }
      } else {
        try { await sb.from('business_orders').insert({ business_email: BIZ_EMAIL, product_name: name, client_name: client||null, cantidad: qty, precio_total: total, estado: 'pagado' }); } catch(e){}
      }
      m.remove(); _t('Venta registrada: se actualizó ventas, caja, stock y pipeline.');
      try { typeof loadPipeline==='function' && loadPipeline(); } catch(e){}
      try { typeof crmCajaLoad==='function' && crmCajaLoad(); } catch(e){}
      try { typeof loadDashboard==='function' && loadDashboard(); } catch(e){}
      try { typeof loadProducts==='function' && loadProducts(); } catch(e){}
    } catch(e){ _t('Error al registrar: ' + (e.message||'')); }
  };
};

/* ── CLIENTES (P3.5): directorio de clientes derivado de órdenes/ventas/chats ── */
window.crmClientsLoad = async function(){
  var list = document.getElementById('clientes-list'); if (!list) return;
  list.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#666;padding:16px;">Cargando...</td></tr>';
  try {
    var since = new Date(Date.now() - 180*24*3600000).toISOString();
    var res = await Promise.all([
      sb.from('business_orders').select('client_email,client_name,precio_total,estado,created_at').eq('business_email', BIZ_EMAIL).order('created_at',{ascending:false}).limit(500),
      sb.from('business_sales').select('client_email,client_name,total,created_at').eq('business_email', BIZ_EMAIL).order('created_at',{ascending:false}).limit(500).then(function(r){return r;},function(){return {data:[]};}),
      sb.from('messages').select('sender_email,sender_name,created_at').eq('recipient_email', BIZ_EMAIL).gte('created_at', since).order('created_at',{ascending:false}).limit(300)
    ]);
    var map = {};
    function touch(email, name, spent, when, kind){
      var k = (email||name||'').toLowerCase(); if (!k) return;
      var c = map[k] = map[k] || { email: email||'', name: name||email||'—', total: 0, compras: 0, chats: 0, last: null };
      if (name && (!c.name || c.name===c.email)) c.name = name;
      if (kind==='venta') { c.total += Number(spent)||0; c.compras++; }
      if (kind==='chat') c.chats++;
      if (when && (!c.last || when > c.last)) c.last = when;
    }
    (res[0].data||[]).forEach(function(o){ if ((o.estado||'')!=='consulta') touch(o.client_email, o.client_name, o.precio_total, o.created_at, 'venta'); else touch(o.client_email, o.client_name, 0, o.created_at, 'chat'); });
    (res[1].data||[]).forEach(function(s){ touch(s.client_email, s.client_name, 0, s.created_at, null); });
    (res[2].data||[]).forEach(function(m){ if ((m.sender_email||'').toLowerCase()!==BIZ_EMAIL.toLowerCase()) touch(m.sender_email, m.sender_name, 0, m.created_at, 'chat'); });
    var rows = Object.values(map).sort(function(a,b){ return (b.last||'').localeCompare(a.last||''); });
    if (!rows.length) { list.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#666;padding:16px;">Sin clientes todavía: aparecen cuando te compran o te escriben.</td></tr>'; return; }
    list.innerHTML = rows.map(function(c){
      var d = c.last ? new Date(c.last).toLocaleDateString('es-UY',{day:'2-digit',month:'2-digit'}) : '—';
      var eSafe = String(c.email||'').replace(/'/g,"\\'");
      var chatBtn = (c.email && typeof crmOpenChat==='function')
        ? '<button class="btn-sm btn-accent" onclick="showPage(\'chats\',document.querySelector(\'.nav-item[onclick*=chats]\'));crmOpenChat(\'' + eSafe + '\',\'' + String(c.name||'').replace(/'/g,"\\'") + '\')"><i class=\'bx bx-chat\'></i></button>' : '';
      return '<tr><td style="font-weight:700;">' + String(c.name||'—').replace(/</g,'&lt;') + '</td>'
        + '<td style="color:#888;font-size:11px;">' + String(c.email||'—').replace(/</g,'&lt;') + '</td>'
        + '<td>' + c.compras + '</td>'
        + '<td style="color:var(--accent);font-weight:800;">' + _fmt(c.total) + '</td>'
        + '<td style="text-align:right;white-space:nowrap;"><span style="color:#666;font-size:11px;margin-right:8px;">' + d + '</span>' + chatBtn + '</td></tr>';
    }).join('');
  } catch(e){ list.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#f66;padding:16px;">Error: ' + (e.message||'') + '</td></tr>'; }
};

/* ── HABLAR CON SOPORTE ───────────────────────────────── */
window.crmOpenSupport = function(){
  var m = _modal(
    '<div style="display:flex;align-items:center;gap:8px;font-weight:900;font-size:15px;margin-bottom:6px;"><i class=\'bx bx-support\' style="color:var(--accent);font-size:20px;"></i> Hablar con soporte</div>'
    + '<p style="font-size:11.5px;color:#888;margin:0 0 12px;line-height:1.5;">Contanos tu problema o consulta. El equipo de Canchero lo recibe al instante y te responde por Mensajes.</p>'
    + '<textarea id="sup-msg" rows="4" placeholder="Escribí tu consulta..." style="width:100%;background:#181a18;border:1px solid #2a2c2a;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;box-sizing:border-box;outline:none;resize:none;font-family:inherit;margin-bottom:14px;"></textarea>'
    + '<div style="display:flex;gap:8px;"><button onclick="this.closest(\'.modal\').remove()" style="flex:1;background:rgba(255,255,255,0.06);border:none;color:#aaa;border-radius:10px;padding:11px;font-weight:800;cursor:pointer;">Cancelar</button>'
    + '<button id="sup-send" style="flex:2;background:var(--accent);border:none;color:#000;border-radius:10px;padding:11px;font-weight:900;cursor:pointer;">Enviar</button></div>'
  );
  m.querySelector('#sup-send').onclick = async function(){
    var msg = (m.querySelector('#sup-msg').value||'').trim();
    if (!msg) { _t('Escribí tu consulta.'); return; }
    var bizName = (typeof BIZ !== 'undefined' && BIZ && BIZ.name) ? BIZ.name : BIZ_EMAIL;
    try {
      var ins = await sb.from('messages').insert({
        sender_email: BIZ_EMAIL, sender_name: bizName,
        recipient_email: ADMIN_EMAIL,
        content: '[SOPORTE] ' + msg, read: false,
        sender_profile: 'negocio', recipient_profile: 'jugador'
      });
      if (ins.error && /profile/.test(ins.error.message||'')) {
        ins = await sb.from('messages').insert({ sender_email: BIZ_EMAIL, sender_name: bizName, recipient_email: ADMIN_EMAIL, content: '[SOPORTE] ' + msg, read: false });
      }
      if (ins.error) throw ins.error;
      m.remove(); _t('Mensaje enviado a soporte. Te respondemos por Mensajes.');
    } catch(e){ _t('Error al enviar: ' + (e.message||'')); }
  };
  setTimeout(function(){ try{ m.querySelector('#sup-msg').focus(); }catch(e){} }, 100);
};

/* ══════════════════════════════════════════════════════════════════════
   PIPELINE (P2) — tablero de etapas para TODOS los negocios.
   Se alimenta de business_orders (ventas, consultas por chat, reservas) y,
   en organizaciones, de las solicitudes de equipos a los torneos.
   Las etapas son los mismos 'estado' que ya usa el resto del CRM, así el
   tablero refleja la realidad en vez de inventar un sistema paralelo.
   ══════════════════════════════════════════════════════════════════════ */
var PIPE_ETAPAS = [
  { id:'consulta',   label:'Consulta',   icon:'bx-message-dots', color:'#7aa2ff' },
  { id:'pendiente',  label:'Pendiente',  icon:'bx-time-five',    color:'#ffaa00' },
  { id:'confirmado', label:'Confirmado', icon:'bx-check',        color:'#00c8ff' },
  { id:'pagado',     label:'Pagado',     icon:'bx-badge-check',  color:'#baff00' }
];
var _pipeCache = [];

function _pipeEsc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

window.crmPipelineLoad = async function(){
  var cont = document.getElementById('pipeline-board');
  if (!cont) return;
  cont.innerHTML = '<div style="color:#666;padding:24px;text-align:center;"><i class="bx bx-loader-alt bx-spin" style="font-size:22px;"></i></div>';
  var tarjetas = [];

  // 1) Pedidos / ventas / consultas del negocio
  try {
    var r = await sb.from('business_orders').select('*')
      .eq('business_email', BIZ_EMAIL).order('created_at', { ascending:false }).limit(300);
    (r.data||[]).forEach(function(o){
      var est = String(o.estado||'pendiente').toLowerCase();
      if (est === 'cancelado') return;                    // cancelados no ocupan el tablero
      tarjetas.push({
        id: o.id, tipo: 'order', etapa: est,
        titulo: o.product_name || o.concepto || 'Pedido',
        cliente: o.client_name || o.client_email || o.cliente_email || 'Sin cliente',
        email: o.client_email || o.cliente_email || '',
        monto: Number(o.precio_total||0),
        fecha: o.created_at
      });
    });
  } catch(e){ console.warn('pipeline orders', e); }

  // 2) Solicitudes de equipos a los torneos (solo organizaciones)
  try {
    var tor = await sb.from('tournaments').select('id,name').eq('organizer_email', BIZ_EMAIL).limit(100);
    var ids = (tor.data||[]).map(function(t){ return t.id; });
    if (ids.length) {
      var nombreTorneo = {};
      (tor.data||[]).forEach(function(t){ nombreTorneo[t.id] = t.name; });
      var eq = await sb.from('tournament_teams')
        .select('id,team_name,captain_email,captain_name,status,payment_status,created_at,tournament_id')
        .in('tournament_id', ids).limit(300);
      (eq.data||[]).forEach(function(t){
        // pendiente de aprobación → Pendiente · aprobado → Confirmado · pagado → Pagado
        var etapa = (t.payment_status === 'paid') ? 'pagado'
                  : (t.status === 'approved') ? 'confirmado'
                  : (t.status === 'rejected') ? null : 'pendiente';
        if (!etapa) return;
        tarjetas.push({
          id: t.id, tipo: 'team', etapa: etapa,
          titulo: t.team_name || 'Equipo',
          cliente: t.captain_name || t.captain_email || 'Sin capitán',
          email: t.captain_email || '',
          sub: nombreTorneo[t.tournament_id] || '',
          fecha: t.created_at
        });
      });
    }
  } catch(e){ console.warn('pipeline torneos', e); }

  _pipeCache = tarjetas;
  _pipeRender();
};

function _pipeRender(){
  var cont = document.getElementById('pipeline-board');
  if (!cont) return;
  if (!_pipeCache.length) {
    cont.innerHTML = '<div style="text-align:center;padding:48px 20px;color:#666;">'
      + '<i class="bx bx-columns" style="font-size:44px;opacity:.35;display:block;margin-bottom:12px;"></i>'
      + 'Todavía no hay nada en el pipeline.<br><span style="font-size:12px;">Las consultas por chat, las ventas y las solicitudes de equipos aparecen acá solas.</span></div>';
    return;
  }
  cont.innerHTML = PIPE_ETAPAS.map(function(et){
    var items = _pipeCache.filter(function(c){ return c.etapa === et.id; });
    var total = items.reduce(function(a,c){ return a + (c.monto||0); }, 0);
    return '<div class="pipe-col" data-etapa="' + et.id + '" '
      + 'ondragover="event.preventDefault();this.style.background=\'rgba(186,255,0,.06)\'" '
      + 'ondragleave="this.style.background=\'\'" '
      + 'ondrop="crmPipeDrop(event,\'' + et.id + '\');this.style.background=\'\'" '
      + 'style="flex:1;min-width:210px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px;transition:.15s;">'
      + '<div style="display:flex;align-items:center;gap:7px;margin-bottom:10px;">'
        + '<i class="bx ' + et.icon + '" style="color:' + et.color + ';font-size:16px;"></i>'
        + '<span style="font-size:12px;font-weight:900;letter-spacing:.4px;">' + et.label + '</span>'
        + '<span style="margin-left:auto;font-size:11px;font-weight:800;color:#888;background:rgba(255,255,255,.06);border-radius:8px;padding:2px 8px;">' + items.length + '</span>'
      + '</div>'
      + (total ? '<div style="font-size:11px;color:' + et.color + ';font-weight:800;margin:-4px 0 9px;">' + _fmt(total) + '</div>' : '')
      + (items.length ? items.map(_pipeCard).join('')
          : '<div style="font-size:11px;color:#555;text-align:center;padding:16px 4px;">Vacío</div>')
      + '</div>';
  }).join('');
}

function _pipeCard(c){
  var fecha = c.fecha ? new Date(c.fecha).toLocaleDateString('es-UY',{day:'numeric',month:'short'}) : '';
  var icono = c.tipo === 'team' ? 'bx-shield-quarter' : 'bx-receipt';
  // En celular no hay drag & drop (los eventos HTML5 no disparan con el dedo):
  // tocar la tarjeta abre el selector de etapa.
  return '<div draggable="true" ondragstart="crmPipeDrag(event,\'' + c.tipo + '\',\'' + c.id + '\')" '
    + 'onclick="crmPipeMover(\'' + c.tipo + '\',\'' + c.id + '\')" '
    + 'style="background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.09);border-radius:11px;padding:10px 11px;margin-bottom:7px;cursor:pointer;">'
    + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">'
      + '<i class="bx ' + icono + '" style="color:var(--accent);font-size:13px;flex-shrink:0;"></i>'
      + '<span style="font-size:12.5px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + _pipeEsc(c.titulo) + '</span>'
    + '</div>'
    + '<div style="font-size:11px;color:#8a928a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + _pipeEsc(c.cliente) + '</div>'
    + (c.sub ? '<div style="font-size:10px;color:#5f665f;margin-top:2px;">' + _pipeEsc(c.sub) + '</div>' : '')
    + '<div style="display:flex;align-items:center;gap:8px;margin-top:7px;">'
      + (c.monto ? '<span style="font-size:11.5px;font-weight:900;color:var(--accent);">' + _fmt(c.monto) + '</span>' : '')
      + (fecha ? '<span style="font-size:10px;color:#555;margin-left:auto;">' + fecha + '</span>' : '')
    + '</div></div>';
}

window.crmPipeDrag = function(ev, tipo, id){
  try { ev.dataTransfer.setData('text/plain', tipo + ':' + id); ev.dataTransfer.effectAllowed = 'move'; } catch(e){}
};

// Mover por toque: la alternativa al drag & drop en celular.
window.crmPipeMover = function(tipo, id){
  var card = _pipeCache.filter(function(c){ return String(c.id) === String(id) && c.tipo === tipo; })[0];
  if (!card) return;
  var opciones = PIPE_ETAPAS.map(function(et){
    var actual = et.id === card.etapa;
    return '<button ' + (actual ? 'disabled' : 'onclick="crmPipeSet(\'' + tipo + '\',\'' + id + '\',\'' + et.id + '\')"')
      + ' style="width:100%;display:flex;align-items:center;gap:9px;background:' + (actual?'rgba(186,255,0,.1)':'rgba(255,255,255,.05)')
      + ';border:1px solid ' + (actual?'rgba(186,255,0,.3)':'rgba(255,255,255,.1)') + ';color:' + (actual?'var(--accent)':'#ddd')
      + ';border-radius:11px;padding:12px;font-weight:800;font-size:13px;cursor:' + (actual?'default':'pointer') + ';margin-bottom:7px;">'
      + '<i class="bx ' + et.icon + '" style="color:' + et.color + ';font-size:16px;"></i>' + et.label
      + (actual ? '<span style="margin-left:auto;font-size:10px;">actual</span>' : '') + '</button>';
  }).join('');
  _modal('<div style="font-weight:900;font-size:15px;margin-bottom:4px;">' + _pipeEsc(card.titulo) + '</div>'
    + '<div style="font-size:12px;color:#888;margin-bottom:14px;">' + _pipeEsc(card.cliente) + '</div>'
    + '<div style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;margin-bottom:8px;">MOVER A</div>'
    + opciones);
};

window.crmPipeSet = async function(tipo, id, etapa){
  var m = document.querySelector('.modal'); if (m) m.remove();
  await _pipeAplicar(tipo, id, etapa);
};

window.crmPipeDrop = async function(ev, etapa){
  ev.preventDefault();
  var raw = '';
  try { raw = ev.dataTransfer.getData('text/plain') || ''; } catch(e){}
  var sep = raw.indexOf(':');
  if (sep < 0) return;
  await _pipeAplicar(raw.slice(0, sep), raw.slice(sep + 1), etapa);
};

// Un solo camino para mover una tarjeta, lo dispare el mouse o el dedo.
async function _pipeAplicar(tipo, id, etapa){
  var card = _pipeCache.filter(function(c){ return String(c.id) === String(id) && c.tipo === tipo; })[0];
  if (!card || card.etapa === etapa) return;
  var antes = card.etapa;
  card.etapa = etapa;             // optimista: se ve al instante
  _pipeRender();
  try {
    if (tipo === 'order') {
      var r = await sb.from('business_orders').update({ estado: etapa }).eq('id', id);
      if (r.error) throw r.error;
    } else {
      // Mover un equipo cambia su estado real en el torneo.
      var upd = etapa === 'pagado'     ? { status:'approved', payment_status:'paid' }
              : etapa === 'confirmado' ? { status:'approved' }
              : { status:'pending' };
      var r2 = await sb.from('tournament_teams').update(upd).eq('id', id);
      if (r2.error) throw r2.error;
    }
    var lbl = PIPE_ETAPAS.filter(function(e){ return e.id === etapa; })[0];
    _t('Movido a ' + (lbl ? lbl.label : etapa) + '.');
  } catch(e){
    card.etapa = antes; _pipeRender();
    _t('No se pudo mover: ' + (e.message||''));
  }
}
})();
