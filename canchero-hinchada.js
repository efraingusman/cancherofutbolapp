/**
 * canchero-hinchada.js — HINCHADA (perfil de FANÁTICO)
 *
 * El fanático elige su club y la sección le muestra, en este orden:
 *   1) Tu club        — escudo, nombre y cuántos hinchas tiene en Canchero
 *   2) La hinchada    — los otros hinchas de ese club, para seguirlos
 *   3) Lo que dicen   — publicaciones de esa hinchada
 *   4) Noticias       — solo si hay (si no, la sección no se muestra)
 *
 * El club se guarda en users.fan_club (slug). Los slugs coinciden con los de
 * CLUB_RX en api/news.js — si se agrega un club acá, agregarlo también allá o
 * no va a tener noticias.
 *
 * Sin emojis: solo iconos boxicons.
 */
(function(){
'use strict';

function sb(){ return window._sb || window.supabaseClient; }
function me(){ return window.userData || {}; }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function toast(t,k){ if(window.showToast) window.showToast(t, k||'info'); }

// Paleta por club, para el escudo generado (no se usan logos con derechos).
const CLUBS = [
  { slug:'penarol',      name:'Peñarol',            pais:'Uruguay',    c1:'#f5d000', c2:'#111', id:2348 },
  { slug:'nacional',     name:'Nacional',           pais:'Uruguay',    c1:'#0a3d91', c2:'#fff', id:2356 },
  { slug:'danubio',      name:'Danubio',            pais:'Uruguay',    c1:'#1f4fa0', c2:'#fff', id:2352 },
  { slug:'defensor',     name:'Defensor Sporting',  pais:'Uruguay',    c1:'#6a2fa0', c2:'#fff', id:2350 },
  { slug:'liverpool-uy', name:'Liverpool',          pais:'Uruguay',    c1:'#0b0b0b', c2:'#1f4fa0', id:2358 },
  { slug:'boca',         name:'Boca Juniors',       pais:'Argentina',  c1:'#0d1b53', c2:'#f2c200', id:451 },
  { slug:'river',        name:'River Plate',        pais:'Argentina',  c1:'#fff',    c2:'#d81e33', id:435 },
  { slug:'racing',       name:'Racing Club',        pais:'Argentina',  c1:'#6cace4', c2:'#fff', id:436 },
  { slug:'independiente',name:'Independiente',      pais:'Argentina',  c1:'#c8102e', c2:'#fff', id:453 },
  { slug:'san-lorenzo',  name:'San Lorenzo',        pais:'Argentina',  c1:'#0b2c6f', c2:'#c8102e', id:460 },
  { slug:'barcelona',    name:'Barcelona',          pais:'España',     c1:'#a50044', c2:'#004d98', id:529 },
  { slug:'real-madrid',  name:'Real Madrid',        pais:'España',     c1:'#fff',    c2:'#febe10', id:541 },
  { slug:'atletico',     name:'Atlético de Madrid', pais:'España',     c1:'#c8102e', c2:'#fff', id:530 },
  { slug:'sevilla',      name:'Sevilla',            pais:'España',     c1:'#fff',    c2:'#c8102e', id:536 },
  { slug:'man-united',   name:'Manchester United',  pais:'Inglaterra', c1:'#da291c', c2:'#fbe122', id:33 },
  { slug:'man-city',     name:'Manchester City',    pais:'Inglaterra', c1:'#6caddf', c2:'#fff', id:50 },
  { slug:'liverpool',    name:'Liverpool FC',       pais:'Inglaterra', c1:'#c8102e', c2:'#00b2a9', id:40 },
  { slug:'arsenal',      name:'Arsenal',            pais:'Inglaterra', c1:'#ef0107', c2:'#fff', id:42 },
  { slug:'chelsea',      name:'Chelsea',            pais:'Inglaterra', c1:'#034694', c2:'#fff', id:49 },
  { slug:'tottenham',    name:'Tottenham',          pais:'Inglaterra', c1:'#fff',    c2:'#132257', id:47 },
  { slug:'juventus',     name:'Juventus',           pais:'Italia',     c1:'#fff',    c2:'#111', id:496 },
  { slug:'milan',        name:'Milan',              pais:'Italia',     c1:'#fb090b', c2:'#111', id:489 },
  { slug:'inter',        name:'Inter',              pais:'Italia',     c1:'#0068a8', c2:'#111', id:505 },
  { slug:'napoli',       name:'Napoli',             pais:'Italia',     c1:'#12a0d7', c2:'#fff', id:492 },
  { slug:'roma',         name:'Roma',               pais:'Italia',     c1:'#8e1f2f', c2:'#f0bc42', id:497 },
  { slug:'bayern',       name:'Bayern Múnich',      pais:'Alemania',   c1:'#dc052d', c2:'#fff', id:157 },
  { slug:'dortmund',     name:'Borussia Dortmund',  pais:'Alemania',   c1:'#fde100', c2:'#111', id:165 },
  { slug:'psg',          name:'PSG',                pais:'Francia',    c1:'#004170', c2:'#da291c', id:85 },
  { slug:'flamengo',     name:'Flamengo',           pais:'Brasil',     c1:'#c52613', c2:'#111', id:127 },
  { slug:'palmeiras',    name:'Palmeiras',          pais:'Brasil',     c1:'#006437', c2:'#fff', id:121 },
];
const BY_SLUG = {};
CLUBS.forEach(c => { BY_SLUG[c.slug] = c; });

const H = {};
H.clubs = CLUBS;
H.get = function(slug){ return BY_SLUG[slug] || null; };

// Escudo OFICIAL del club. Los ids son de API-Football y estan verificados uno por uno
// contra la API; el logo sale de su CDN estatico, que NO consume cupo diario.
// Si la imagen no carga, cae al escudo generado con los colores del club (nunca queda
// un hueco).
H.logoUrl = function(club){
  return (club && club.id) ? ('https://media.api-sports.io/football/teams/' + club.id + '.png') : '';
};

function escudoGenerado(club, size){
  const ini = club.name.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ ]/g,'').split(' ')
    .filter(Boolean).slice(0,2).map(w => w[0].toUpperCase()).join('');
  return `<span style="width:${size}px;height:${size}px;border-radius:50%;flex-shrink:0;
    background:linear-gradient(135deg,${club.c1} 0 50%,${club.c2} 50% 100%);
    display:inline-flex;align-items:center;justify-content:center;
    font-family:Outfit,sans-serif;font-weight:900;font-size:${Math.round(size*0.34)}px;
    color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.65);border:2px solid rgba(255,255,255,.22);
    box-sizing:border-box;">${esc(ini)}</span>`;
}

function escudo(club, size){
  size = size || 46;
  if (!club) return '';
  const url = H.logoUrl(club);
  if (!url) return escudoGenerado(club, size);
  const alt = escudoGenerado(club, size).replace(/"/g, '&quot;');
  return `<span style="width:${size}px;height:${size}px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;">
    <img src="${url}" alt="${esc(club.name)}" loading="lazy"
      style="width:100%;height:100%;object-fit:contain;display:block;"
      onerror="this.parentNode.innerHTML='${alt.replace(/'/g,"&#39;")}'"></span>`;
}
H.escudo = escudo;

// ── Club del usuario ──────────────────────────────────────────────────────
H.miClub = function(){
  const u = me();
  return u.fan_club || (u.linked_profiles && u.linked_profiles.fanatico && u.linked_profiles.fanatico.club) || null;
};

H.setClub = async function(slug){
  const s = sb(); const email = me().email;
  if (!s || !email) { toast('Iniciá sesión','error'); return; }
  const club = BY_SLUG[slug];
  if (!club) return;
  try {
    const { error } = await s.from('users').update({ fan_club: slug }).eq('email', email);
    if (error) throw error;
    me().fan_club = slug;
    try { localStorage.setItem('canchero_user', JSON.stringify(me())); } catch(e){}
    document.getElementById('hin-pick-modal')?.remove();
    toast('Ahora hinchás de ' + club.name, 'success');
    H.render();
  } catch(e){
    toast('No se pudo guardar: ' + (e.message||'') + ' (¿corriste la migración?)', 'error');
  }
};

// ── Selector de club ──────────────────────────────────────────────────────
H.pickClub = function(){
  const ex = document.getElementById('hin-pick-modal'); if (ex) ex.remove();
  const paises = [...new Set(CLUBS.map(c => c.pais))];
  const m = document.createElement('div');
  m.id = 'hin-pick-modal';
  m.style.cssText = 'position:fixed;inset:0;z-index:21000;background:rgba(0,0,0,.78);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;';
  m.onclick = e => { if (e.target === m) m.remove(); };
  m.innerHTML = `<div style="width:100%;max-width:440px;max-height:82vh;overflow-y:auto;background:#0d0d0d;border:1px solid #1e1e1e;border-radius:18px;padding:18px 16px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
      <span style="font-size:15px;font-weight:900;color:#fff;">¿De qué cuadro sos?</span>
      <button onclick="document.getElementById('hin-pick-modal').remove()" style="margin-left:auto;background:none;border:none;color:#888;font-size:22px;cursor:pointer;line-height:1;">&times;</button>
    </div>
    <div style="font-size:11.5px;color:#888;margin-bottom:14px;line-height:1.5;">Vas a ver las noticias de tu club y a los demás hinchas en Canchero.</div>
    <input id="hin-buscar" type="text" placeholder="Buscar club..." oninput="window.CancheroHinchada._filtrar(this.value)" style="width:100%;background:#1a1a1a;border:1px solid #2a2a2a;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;box-sizing:border-box;margin-bottom:12px;">
    <div id="hin-lista">
      ${paises.map(p => `
        <div class="hin-pais" data-pais="${esc(p)}">
          <div style="font-size:10px;font-weight:900;color:#555;letter-spacing:1.2px;margin:10px 0 6px;">${esc(p).toUpperCase()}</div>
          ${CLUBS.filter(c => c.pais === p).map(c => `
            <div class="hin-item" data-nombre="${esc(c.name.toLowerCase())}" onclick="window.CancheroHinchada.setClub('${c.slug}')"
                 style="display:flex;align-items:center;gap:11px;padding:9px 10px;border-radius:11px;cursor:pointer;margin-bottom:4px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);">
              ${escudo(c, 34)}
              <span style="font-size:13.5px;font-weight:700;color:#eee;">${esc(c.name)}</span>
            </div>`).join('')}
        </div>`).join('')}
    </div>
  </div>`;
  document.body.appendChild(m);
};

H._filtrar = function(q){
  q = (q||'').toLowerCase().trim();
  document.querySelectorAll('#hin-lista .hin-item').forEach(el => {
    el.style.display = (!q || (el.dataset.nombre||'').includes(q)) ? 'flex' : 'none';
  });
  // Ocultar el país cuando no le queda ningún club visible
  document.querySelectorAll('#hin-lista .hin-pais').forEach(bloque => {
    const visibles = [...bloque.querySelectorAll('.hin-item')].some(i => i.style.display !== 'none');
    bloque.style.display = visibles ? 'block' : 'none';
  });
};

// ── Render de la sección ──────────────────────────────────────────────────
H.render = async function(containerId){
  const cont = document.getElementById(containerId || 'jugador-profile-hinchada');
  if (!cont) return;
  const slug = H.miClub();
  const club = slug ? BY_SLUG[slug] : null;

  if (!club) {
    cont.innerHTML = `<div style="text-align:center;padding:34px 20px;">
      <i class='bx bx-shield-quarter' style="font-size:44px;color:var(--accent);opacity:.35;display:block;margin-bottom:12px;"></i>
      <div style="font-size:15px;font-weight:800;color:#fff;margin-bottom:6px;">Elegí tu cuadro</div>
      <div style="font-size:12.5px;color:#888;line-height:1.55;max-width:280px;margin:0 auto 16px;">Vas a ver las noticias de tu club y a los demás hinchas que están en Canchero.</div>
      <button onclick="window.CancheroHinchada.pickClub()" style="background:var(--accent);color:#000;border:none;border-radius:12px;padding:12px 22px;font-weight:900;font-size:13.5px;cursor:pointer;">Elegir mi cuadro</button>
    </div>`;
    return;
  }

  cont.innerHTML = `<div style="padding:4px 0 20px;">
    <div id="hin-cabecera"></div>
    <div id="hin-gente" style="margin-top:16px;"></div>
    <div id="hin-dicen" style="margin-top:16px;"></div>
    <div id="hin-noticias" style="margin-top:16px;"></div>
  </div>`;

  _cabecera(club);
  _gente(club);
  _dicen(club);
  _noticias(club);
};

function _titulo(t){
  return `<div style="font-size:10px;font-weight:900;color:#555;letter-spacing:1.2px;margin-bottom:9px;">${esc(t)}</div>`;
}

async function _cabecera(club){
  const el = document.getElementById('hin-cabecera'); if (!el) return;
  let hinchas = 0;
  try {
    const { count } = await sb().from('users').select('email',{count:'exact',head:true}).eq('fan_club', club.slug);
    hinchas = count || 0;
  } catch(e){}
  el.innerHTML = `<div style="display:flex;align-items:center;gap:13px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:14px 15px;">
    ${escudo(club, 52)}
    <div style="flex:1;min-width:0;">
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:17px;color:#fff;">${esc(club.name)}</div>
      <div style="font-size:11.5px;color:#888;margin-top:2px;">${esc(club.pais)}</div>
      <div style="font-size:11.5px;color:var(--accent);margin-top:3px;font-weight:700;"><i class='bx bx-group'></i> ${hinchas} ${hinchas===1?'hincha':'hinchas'} en Canchero</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">
      <button onclick="window.CancheroHinchada.pickClub()" title="Cambiar de club" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#aaa;border-radius:10px;padding:7px 10px;font-size:14px;cursor:pointer;"><i class='bx bx-edit-alt'></i></button>
      <button onclick="window.CancheroHinchada.compartirClub()" title="Compartir mi club" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#aaa;border-radius:10px;padding:7px 10px;font-size:14px;cursor:pointer;"><i class='bx bx-share-alt'></i></button>
    </div>
  </div>`;
}

async function _gente(club){
  const el = document.getElementById('hin-gente'); if (!el) return;
  try {
    const { data } = await sb().from('users').select('email,name,photo,linked_profiles')
      .eq('fan_club', club.slug).limit(30);
    const miEmail = (me().email||'').toLowerCase();
    const otros = (data||[]).filter(u => (u.email||'').toLowerCase() !== miEmail);
    if (!otros.length) {
      el.innerHTML = _titulo('LA HINCHADA') +
        `<div style="font-size:12px;color:#666;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:14px;line-height:1.5;">Sos el primero de ${esc(club.name)} en Canchero. Cuando se sumen más hinchas los vas a ver acá.</div>`;
      return;
    }
    el.innerHTML = _titulo('LA HINCHADA (' + otros.length + ')') + otros.map(u => {
      // El fanático tiene su propio nombre y foto, distintos de los del jugador.
      let fan = {};
      try { const lp = typeof u.linked_profiles==='string'?JSON.parse(u.linked_profiles):(u.linked_profiles||{}); fan = lp.fanatico || {}; } catch(e){}
      const nom = fan.name || u.name || 'Hincha';
      const foto = fan.photo || u.photo || '';
      const em = (u.email||'').replace(/'/g,"\\'");
      return `<div onclick="window.viewUserProfile&&window.viewUserProfile('${em}',true,{profile:'fanatico'})"
        style="display:flex;align-items:center;gap:11px;padding:9px 11px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;margin-bottom:6px;cursor:pointer;">
        <span style="width:34px;height:34px;border-radius:50%;flex-shrink:0;background:${foto?`#222 center/cover url('${esc(foto)}')`:'rgba(186,255,0,.1)'};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:var(--accent);">${foto?'':esc((nom[0]||'?').toUpperCase())}</span>
        <span style="flex:1;min-width:0;font-size:13px;font-weight:700;color:#eee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(nom)}</span>
        <i class='bx bx-chevron-right' style="color:#444;font-size:19px;"></i>
      </div>`;
    }).join('');
  } catch(e){ el.innerHTML = ''; }
}

async function _dicen(club){
  const el = document.getElementById('hin-dicen'); if (!el) return;
  try {
    const { data: us } = await sb().from('users').select('email').eq('fan_club', club.slug).limit(200);
    const emails = (us||[]).map(u => u.email).filter(Boolean);
    if (!emails.length) { el.innerHTML = ''; return; }
    const { data: posts } = await sb().from('posts')
      .select('id,user_email,user_name,user_role,content,created_at')
      .in('user_email', emails).eq('user_role','fanatico')
      .order('created_at',{ascending:false}).limit(8);
    const conTexto = (posts||[]).filter(p => (p.content||'').trim());
    if (!conTexto.length) { el.innerHTML = ''; return; }
    el.innerHTML = _titulo('LO QUE DICE LA HINCHADA') + conTexto.map(p => `
      <div onclick="window.openPostDetail&&window.openPostDetail('${p.id}')" style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:11px 13px;margin-bottom:6px;cursor:pointer;">
        <div style="font-size:11.5px;font-weight:800;color:var(--accent);margin-bottom:4px;">${esc(p.user_name||'Hincha')}</div>
        <div style="font-size:13px;color:#ddd;line-height:1.45;">${esc((p.content||'').slice(0,180))}${(p.content||'').length>180?'…':''}</div>
      </div>`).join('');
  } catch(e){ el.innerHTML = ''; }
}

async function _noticias(club){
  const el = document.getElementById('hin-noticias'); if (!el) return;
  el.innerHTML = '';
  try {
    const r = await fetch('/api/news?club=' + encodeURIComponent(club.slug));
    const j = await r.json();
    const arts = (j && j.articles) || [];
    // Si no hay noticias del club, la sección NO se muestra: mejor eso que un
    // bloque vacío ocupando pantalla.
    if (!arts.length) return;
    el.innerHTML = _titulo('NOTICIAS DE ' + club.name.toUpperCase()) + arts.slice(0,6).map(a => {
      const d = encodeURIComponent(JSON.stringify({ t:a.title||'', d:a.description||'', i:a.image||'', u:a.url||'', s:a.source||'' }));
      return `<div onclick="window._openNewsInApp&&window._openNewsInApp('${d}')" style="display:flex;gap:11px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:10px;margin-bottom:6px;cursor:pointer;">
        ${a.image?`<div style="width:64px;height:64px;border-radius:9px;flex-shrink:0;background:#111 center/cover url('${esc(a.image)}');"></div>`:''}
        <div style="flex:1;min-width:0;">
          <div style="font-size:9.5px;font-weight:800;color:#777;margin-bottom:3px;">${esc(a.source||'')}</div>
          <div style="font-size:12.5px;font-weight:700;color:#eee;line-height:1.35;">${esc(a.title||'')}</div>
        </div>
        <button onclick="event.stopPropagation();window.CancheroHinchada.compartir({titulo:${JSON.stringify(a.title||'')},texto:${JSON.stringify(a.title||'')},url:${JSON.stringify(a.url||'')}})"
          title="Compartir" style="background:none;border:none;color:#666;font-size:18px;cursor:pointer;padding:2px 4px;align-self:center;flex-shrink:0;"><i class='bx bx-share-alt'></i></button>
      </div>`;
    }).join('');
  } catch(e){ el.innerHTML = ''; }
}

// ═══════════════════════════════════════════════════════════════════════
// COMPARTIR (noticia del club, o el club mismo)
// Dentro de Canchero: al feed o por chat. Fuera: compartir del sistema o copiar.
// ═══════════════════════════════════════════════════════════════════════
// Compartir "soy hincha de X". Lee el club en el momento, así no hay que interpolar
// el nombre dentro del onclick (que es donde se rompen las comillas).
H.compartirClub = function(){
  const club = BY_SLUG[H.miClub()];
  if (!club) return;
  H.compartir({
    titulo: 'Hincha de ' + club.name,
    texto:  'Soy hincha de ' + club.name + ' en Canchero',
    url:    (location.origin || 'https://cancherofutbolapp.vercel.app')
  });
};

H.compartir = function(payload){
  // payload: { titulo, texto, url, club }
  window.__hinShare = payload || {};
  const ex = document.getElementById('hin-share'); if (ex) ex.remove();
  const m = document.createElement('div');
  m.id = 'hin-share';
  m.style.cssText = 'position:fixed;inset:0;z-index:100080;background:rgba(0,0,0,.82);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
  m.onclick = e => { if (e.target === m) m.remove(); };
  const btn = 'width:100%;display:flex;align-items:center;gap:12px;border-radius:14px;padding:14px 15px;font-weight:800;font-size:13.5px;cursor:pointer;margin-bottom:8px;text-align:left;';
  m.innerHTML = `<div style="width:100%;max-width:400px;background:#0d0d0d;border:1px solid #1e1e1e;border-radius:20px;padding:18px 16px;">
    <div style="font-size:14px;font-weight:900;color:#fff;margin-bottom:4px;">Compartir</div>
    <div style="font-size:11.5px;color:#888;margin-bottom:14px;line-height:1.45;">${esc((payload&&payload.titulo)||'')}</div>
    <button onclick="window.CancheroHinchada._share('feed')" style="${btn}background:rgba(186,255,0,.12);color:var(--accent);border:1px solid rgba(186,255,0,.3);"><i class='bx bx-home-alt' style="font-size:18px;"></i> Publicar en el inicio</button>
    <button onclick="window.CancheroHinchada._share('chat')" style="${btn}background:rgba(255,255,255,.05);color:#ddd;border:1px solid rgba(255,255,255,.12);"><i class='bx bx-message-dots' style="font-size:18px;"></i> Enviar por chat</button>
    <button onclick="window.CancheroHinchada._share('fuera')" style="${btn}background:rgba(255,255,255,.05);color:#ddd;border:1px solid rgba(255,255,255,.12);"><i class='bx bx-share-alt' style="font-size:18px;"></i> Compartir fuera de Canchero</button>
    <button onclick="document.getElementById('hin-share').remove()" style="${btn}background:transparent;color:#888;border:1px solid #222;justify-content:center;margin-bottom:0;">Cancelar</button>
  </div>`;
  document.body.appendChild(m);
};

H._share = async function(via){
  const p = window.__hinShare || {};
  const texto = [p.titulo, p.url].filter(Boolean).join('\n');
  if (via === 'fuera') {
    document.getElementById('hin-share')?.remove();
    if (navigator.share) { try { await navigator.share({ title: p.titulo||'Canchero', text: p.texto||p.titulo||'', url: p.url||'' }); return; } catch(e){ return; } }
    try { await navigator.clipboard.writeText(texto); toast('Copiado','success'); }
    catch(e){ prompt('Copiá el link:', texto); }
    return;
  }
  if (via === 'chat') {
    document.getElementById('hin-share')?.remove();
    // Se reusa el envío por chat de la app; si no está, se copia para pegar.
    if (window.social && typeof window.social._sendPostToUser === 'function' && p.postId) {
      window.social._sendPostToUser(p.postId); return;
    }
    try { await navigator.clipboard.writeText(texto); toast('Copiado: pegalo en el chat','success'); }
    catch(e){ prompt('Copiá y pegalo en el chat:', texto); }
    return;
  }
  // Publicar en el inicio, sellado con la identidad ACTIVA (igual que el composer).
  const s = sb(); const u = me();
  if (!s || !u.email) { toast('Iniciá sesión','error'); return; }
  try {
    const rol = (window._pubRole && window._pubRole()) || u.role || 'jugador';
    const bizId = (window._pubBizId && window._pubBizId()) || null;
    let nombre = u.name, foto = u.photo;
    try { const b = window._activeBiz && window._activeBiz(); if (b && b.name) { nombre = b.name; foto = b.photo || foto; } } catch(e){}
    const fila = {
      user_email: u.email,
      user_name: nombre || u.email,
      user_role: rol,
      user_avatar: foto || null,
      content: [p.texto || p.titulo, p.url].filter(Boolean).join('\n\n')
    };
    if (bizId) fila.business_id = bizId;
    let r = await s.from('posts').insert(fila);
    if (r.error && fila.business_id) { delete fila.business_id; r = await s.from('posts').insert(fila); }
    if (r.error) throw r.error;
    document.getElementById('hin-share')?.remove();
    toast('Publicado en el inicio','success');
    try { if (window.social && window.social.loadFeed) window.social.loadFeed(); } catch(e){}
  } catch(e){ toast('No se pudo publicar: ' + (e.message||''), 'error'); }
};

window.CancheroHinchada = H;
console.log('[canchero-hinchada] listo');
})();
