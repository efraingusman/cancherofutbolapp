/**
 * canchero-ui-v2.js
 * Mejoras Secciones 3, 4 y 6 (sin romper lo existente):
 *  · Sec 6: Ranking V2 (podio top-3, top-50, jugadores+clubes, filtros país/ciudad, incluye a todos)
 *  · Sec 6: Chicana popup mejorado (sonido golpe de pelota + botón DEVOLVER)
 *  · Sec 4: Swipe horizontal entre secciones principales
 *  · Sec 3: Desafiar — filtros país/ciudad + buscador
 *  · Sec 3: Chat — fix franja negra + contraste
 */
(function(){
'use strict';
const sb = () => window._sb;
function toast(m,t){ if(window.showToast) window.showToast(m,t); }

/* ════════════════════════════════════════════════════════════════════════
   SEC 6 — RANKING V2
   ════════════════════════════════════════════════════════════════════════ */
window._rankState = { mode:'jugadores', category:'puntos', country:'', city:'' };

window.renderRanking = async function() {
  const cont = document.getElementById('jugador-ranking');
  if (!cont) return;

  // Reconstruir la cabecera con controles V2 (una sola vez)
  if (!document.getElementById('rank-v2-controls')) {
    cont.innerHTML = `
      <div class="section-tab-header" style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <button class="btn-back-icon" aria-label="Volver" onclick="switchDashboardTab('jugador','feed')"><i class='bx bx-left-arrow-alt'></i></button>
        <h2 class="panel-title pt-mundial" style="margin:0;"><i class='bx bx-bar-chart-alt-2' style="font-size:22px;color:var(--accent);"></i><span class="pt-text"><span class="pt-main">RANKING GLOBAL</span><span class="pt-sub">Los mejores jugadores y clubes de Canchero</span></span></h2>
      </div>
      <div id="rank-v2-controls" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;">
        <!-- Toggle jugadores / clubes -->
        <div style="display:flex;background:#141414;border-radius:24px;padding:4px;gap:4px;">
          <button id="rank-tab-jugadores" onclick="window._rankSetMode('jugadores')" style="flex:1;padding:9px;border:none;border-radius:20px;font-size:12px;font-weight:800;cursor:pointer;background:var(--accent);color:#000;">JUGADORES</button>
          <button id="rank-tab-clubes" onclick="window._rankSetMode('clubes')" style="flex:1;padding:9px;border:none;border-radius:20px;font-size:12px;font-weight:800;cursor:pointer;background:transparent;color:#888;">CLUBES</button>
        </div>
        <!-- Filtros -->
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <select id="rank-cat" onchange="window._rankSetCat(this.value)" class="form-control" style="flex:1;min-width:120px;height:38px;font-size:12px;padding:4px 10px;">
            <option value="puntos">PUNTOS</option>
            <option value="goles">GOLES</option>
            <option value="asistencias">ASISTENCIAS</option>
            <option value="porteros">VALLAS INVICTAS</option>
          </select>
          <select id="rank-country" style="flex:1;min-width:90px;height:38px;background:#141414;border:1px solid #2a2a2a;border-radius:8px;color:#fff;font-size:12px;padding:4px 8px;"></select>
          <select id="rank-city" style="flex:1;min-width:90px;height:38px;background:#141414;border:1px solid #2a2a2a;border-radius:8px;color:#fff;font-size:12px;padding:4px 8px;" disabled></select>
        </div>
      </div>
      <div id="rank-podium" style="margin-bottom:14px;"></div>
      <div class="panel"><div id="rank-list"></div></div>`;
    if (window.CancheroGeo) window.CancheroGeo.bindSelects(document.getElementById('rank-country'), document.getElementById('rank-city'), ()=>window._rankLoad());
  }

  await window._rankLoad();
};

window._rankSetMode = function(mode){
  window._rankState.mode = mode;
  const j = document.getElementById('rank-tab-jugadores'), c = document.getElementById('rank-tab-clubes');
  if (j&&c){
    const on = 'background:var(--accent);color:#000;', off='background:transparent;color:#888;';
    j.style.cssText = `flex:1;padding:9px;border:none;border-radius:20px;font-size:12px;font-weight:800;cursor:pointer;${mode==='jugadores'?on:off}`;
    c.style.cssText = `flex:1;padding:9px;border:none;border-radius:20px;font-size:12px;font-weight:800;cursor:pointer;${mode==='clubes'?on:off}`;
  }
  // Vallas invictas no aplica a clubes igual, pero lo dejamos
  window._rankLoad();
};
window._rankSetCat = function(cat){ window._rankState.category = cat; window._rankLoad(); };
let _rankT;
window._rankFilterDebounced = function(){ clearTimeout(_rankT); _rankT = setTimeout(()=>window._rankLoad(), 350); };

window._rankLoad = async function(){
  const list = document.getElementById('rank-list');
  const podium = document.getElementById('rank-podium');
  if (!list) return;
  list.innerHTML = `<div style="text-align:center;padding:30px;color:#666;"><i class="bx bx-loader-alt bx-spin" style="font-size:22px;"></i></div>`;
  if (podium) podium.innerHTML = '';

  const client = sb();
  if (!client){ setTimeout(()=>window._rankLoad(), 1200); return; }

  const st = window._rankState;
  st.country = (document.getElementById('rank-country')?.value||'').trim().toLowerCase();
  st.city = (document.getElementById('rank-city')?.value||'').trim().toLowerCase();
  const cat = st.category;

  let rows = [];
  try {
    if (st.mode === 'clubes') {
      const res = await client.from('clubs').select('id,name,logo,logo_url,city,nat,stats').limit(300);
      rows = ((res&&res.data)||[]).map(c => {
        const s = c.stats||{};
        return { name:c.name, img:c.logo_url||c.logo, city:c.city, country:c.nat, nat:c.nat, val:_calcVal(s,cat), isClub:true };
      });
    } else {
      // INCLUYE A TODOS: no exigimos stats
      const res = await client.from('users').select('email,name,photo,city,nat,stats,role').limit(500);
      // Ranking de JUGADORES: excluir cuentas de negocio/club/fanático
      const _bizRolesRk = ['club','complejo','tienda','organizacion','profesional','sponsor','cancha','fanatico','admin'];
      rows = ((res&&res.data)||[]).filter(u => _bizRolesRk.indexOf((u.role||'jugador').toLowerCase()) === -1).map(u => {
        const s = u.stats||{};
        return { name:u.name||'Anónimo', img:u.photo, city:u.city, country:u.nat, nat:u.nat, email:u.email, val:_calcVal(s,cat) };
      });
    }
  } catch(e){ list.innerHTML = `<div style="text-align:center;padding:30px;color:#888;">Error: ${e.message}</div>`; return; }

  // Filtros país/ciudad
  if (st.country) rows = rows.filter(r => (r.country||'').toLowerCase().includes(st.country));
  if (st.city)    rows = rows.filter(r => (r.city||'').toLowerCase().includes(st.city));

  // Ordenar
  rows.sort((a,b)=> b.val - a.val);
  // Guardar mi posición GLOBAL (aunque quede fuera del top 50) para mostrarla siempre
  const _myEmailRank = (window.userData?.email||'').toLowerCase();
  let _myRankIdx = _myEmailRank ? rows.findIndex(r => (r.email||'').toLowerCase() === _myEmailRank) : -1;
  const _myRankRow = _myRankIdx >= 0 ? rows[_myRankIdx] : null;
  rows = rows.slice(0,50);

  if (!rows.length){
    list.innerHTML = `<div style="text-align:center;padding:40px;color:#666;font-size:13px;"><i class='bx bx-trophy' style="font-size:42px;display:block;margin-bottom:10px;opacity:0.4;"></i>No hay ${st.mode} con esos filtros.</div>`;
    return;
  }

  // Podio top-3
  if (podium && rows.length >= 1) podium.innerHTML = _renderPodium(rows.slice(0,3));

  const myEmail = (window.userData?.email||'').toLowerCase();
  const rest = rows.slice(3);
  list.innerHTML = rest.length ? rest.map((r,i)=>{
    const pos = i+4;
    const me = r.email && r.email.toLowerCase()===myEmail;
    const img = r.img || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name||'?')}&background=000&color=baff00`;
    const loc = [r.city,r.country].filter(Boolean).join(', ')||'—';
    return `<div style="display:flex;align-items:center;gap:12px;padding:11px 12px;border-bottom:1px solid #1a1a1a;${me?'background:rgba(186,255,0,0.08);':''}">
      <div style="width:24px;text-align:center;font-weight:800;color:${me?'var(--accent)':'#666'};">${pos}</div>
      <img src="${img}" style="width:38px;height:38px;border-radius:${r.isClub?'8px':'50%'};object-fit:cover;">
      <div style="flex:1;min-width:0;"><div style="font-weight:700;font-size:14px;color:${me?'var(--accent)':'#fff'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.name}${(window.countryFlag&&(r.nat||r.country))?` <span style="font-size:13px;">${window.countryFlag(r.nat||r.country)||''}</span>`:''}</div><div style="font-size:11px;color:#666;">${loc}</div></div>
      <div style="font-weight:900;font-size:15px;color:var(--accent);">${r.val}</div>
    </div>`;
  }).join('') : `<div style="text-align:center;padding:20px;color:#555;font-size:12px;">Solo hay ${rows.length} en el ranking.</div>`;

  // Si NO estoy en el top 50, mostrar SIEMPRE mi posición al final ("Tu posición")
  if (_myRankRow && _myRankIdx >= 50) {
    const img = _myRankRow.img || `https://ui-avatars.com/api/?name=${encodeURIComponent(_myRankRow.name||'?')}&background=000&color=baff00`;
    const loc = [_myRankRow.city,_myRankRow.country].filter(Boolean).join(', ')||'—';
    list.innerHTML += `<div style="margin-top:8px;padding-top:8px;border-top:1px dashed #2a2a2a;">
      <div style="font-size:10px;font-weight:800;color:#666;letter-spacing:1px;margin:2px 0 6px 12px;">TU POSICIÓN</div>
      <div style="display:flex;align-items:center;gap:12px;padding:11px 12px;background:rgba(186,255,0,0.08);border-radius:10px;">
        <div style="width:34px;text-align:center;font-weight:800;color:var(--accent);">${_myRankIdx+1}</div>
        <img src="${img}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;">
        <div style="flex:1;min-width:0;"><div style="font-weight:700;font-size:14px;color:var(--accent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_myRankRow.name}</div><div style="font-size:11px;color:#666;">${loc}</div></div>
        <div style="font-weight:900;font-size:15px;color:var(--accent);">${_myRankRow.val}</div>
      </div></div>`;
  }
};

function _calcVal(s,cat){
  if (cat==='goles') return s.goals||0;
  if (cat==='asistencias') return s.assists||0;
  if (cat==='porteros') return s.clean_sheets||s.vallas||0;
  return (s.goals||0)*4 + (s.assists||0)*2 + (s.wins||0)*3; // puntos
}

function _renderPodium(top3){
  const order = [top3[1], top3[0], top3[2]]; // 2-1-3 visual
  const heights = [88, 110, 76];
  const colors = ['#C0C0C0','var(--accent)','#CD7F32'];
  const medals = ['🥈','🥇','🥉'];
  const ranks = [2,1,3];
  return `<div style="display:flex;align-items:flex-end;justify-content:center;gap:8px;background:linear-gradient(180deg,#0e1f0e,#0a0a0a);border-radius:16px;padding:16px 10px 12px;">
    ${order.map((r,i)=>{ if(!r) return '<div style="flex:1;"></div>';
      const img = r.img || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name||'?')}&background=000&color=baff00`;
      return `<div style="flex:1;text-align:center;">
        <div style="font-size:22px;margin-bottom:4px;">${medals[i]}</div>
        <img src="${img}" style="width:${i===1?56:46}px;height:${i===1?56:46}px;border-radius:${r.isClub?'10px':'50%'};object-fit:cover;border:2px solid ${colors[i]};">
        <div style="font-weight:800;font-size:11px;color:#fff;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.name}</div>
        <div style="font-weight:900;font-size:14px;color:${colors[i]};">${r.val}</div>
        <div style="background:${colors[i]};opacity:.25;height:${heights[i]/3}px;border-radius:6px 6px 0 0;margin-top:6px;"></div>
      </div>`;
    }).join('')}
  </div>`;
}

/* ════════════════════════════════════════════════════════════════════════
   SEC 6 — CHICANA popup mejorado (sonido + devolver)
   ════════════════════════════════════════════════════════════════════════ */
function _playBallHit(){
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type='sine'; o.frequency.setValueAtTime(180,ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(60,ctx.currentTime+0.12);
    g.gain.setValueAtTime(0.5,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.18);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime+0.2);
  } catch(e){}
}

const _origChicana = window.showChicanaAnimation;
window.showChicanaAnimation = function(msg, fromName, fromEmail){
  // Reusar el original para el render, luego inyectar sonido + botón devolver
  if (_origChicana) _origChicana(msg, fromName);
  _playBallHit();
  const ov = document.getElementById('chicana-anim-overlay');
  if (ov && fromEmail && !ov.querySelector('[data-devolver]')){
    const btnWrap = ov.querySelector('button')?.parentElement;
    const dev = document.createElement('button');
    dev.setAttribute('data-devolver','1');
    dev.textContent = '⚡ DEVOLVER';
    dev.style.cssText = 'margin-top:10px;margin-left:8px;background:rgba(255,180,0,0.15);color:#ffb400;border:1px solid #ffb400;border-radius:25px;padding:10px 26px;font-weight:900;font-size:13px;cursor:pointer;';
    dev.onclick = function(){
      ov.remove();
      if (window.openChatWith) window.openChatWith(fromEmail, fromName);
      else if (window._openChicanaPicker) window._openChicanaPicker();
    };
    if (btnWrap) btnWrap.appendChild(dev);
  }
};

/* SEC 4 — swipe eliminado: reemplazado por canchero-swipe.js (interactivo, circular) */

/* ════════════════════════════════════════════════════════════════════════
   SEC 3 — DESAFIAR: buscador + filtro país/ciudad sobre la lista de rivales
   ════════════════════════════════════════════════════════════════════════ */
window._desafioAllRivals = [];
// Observa cambios en #desafiar-body para inyectar el buscador cuando aparece la lista de rivales
const _desObserver = new MutationObserver(()=>{
  const body = document.getElementById('desafiar-body');
  if (!body) return;
  // Detectar el bloque "ELEGÍ AL RIVAL" sin buscador inyectado
  if (body.querySelector('[data-rival-search]')) return;
  const heading = Array.from(body.querySelectorAll('div')).find(d => /ELEGÍ AL RIVAL/i.test(d.textContent) && d.children.length===0 || /ELEGÍ AL RIVAL/i.test(d.innerHTML) && d.querySelector('span'));
  const rivalContainer = body.querySelector('div[style*="flex-direction:column"]');
  if (!heading) return;
  const cards = body.querySelectorAll('[onclick*="_desafioPickOpp"]');
  if (!cards.length) return;
  // Inyectar buscador
  const bar = document.createElement('div');
  bar.setAttribute('data-rival-search','1');
  bar.style.cssText = 'display:flex;gap:6px;margin:8px 0;';
  bar.innerHTML = `
    <input id="rival-search" placeholder="Buscar equipo..." oninput="window._desafioFilterRivals()" style="flex:2;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:9px;color:#fff;font-size:12px;box-sizing:border-box;">
    <input id="rival-country" placeholder="País" oninput="window._desafioFilterRivals()" style="flex:1;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:9px;color:#fff;font-size:12px;box-sizing:border-box;min-width:60px;">
    <input id="rival-city" placeholder="Ciudad" oninput="window._desafioFilterRivals()" style="flex:1;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:9px;color:#fff;font-size:12px;box-sizing:border-box;min-width:60px;">`;
  heading.parentNode.insertBefore(bar, heading.nextSibling);
});
try { _desObserver.observe(document.body, {childList:true, subtree:true}); } catch(e){}

window._desafioFilterRivals = function(){
  const q = (document.getElementById('rival-search')?.value||'').toLowerCase();
  const country = (document.getElementById('rival-country')?.value||'').toLowerCase();
  const city = (document.getElementById('rival-city')?.value||'').toLowerCase();
  const body = document.getElementById('desafiar-body');
  if (!body) return;
  body.querySelectorAll('[onclick*="_desafioPickOpp"]').forEach(card=>{
    const txt = card.textContent.toLowerCase();
    let show = true;
    if (q && !txt.includes(q)) show=false;
    if (city && !txt.includes(city)) show=false;
    // país: no siempre está en la tarjeta; lo dejamos pasar si no hay match exacto en texto
    if (country && !txt.includes(country)) show = show && txt.includes(country) ? show : (txt.includes(country)?show:show);
    card.style.display = show ? '' : 'none';
  });
};

/* ════════════════════════════════════════════════════════════════════════
   SEC 3 — CHAT: quitar franja negra + mejorar contraste
   ════════════════════════════════════════════════════════════════════════ */
(function injectChatCSS(){
  if (document.getElementById('chat-v2-css')) return;
  const st = document.createElement('style');
  st.id = 'chat-v2-css';
  st.textContent = `
    /* Fondo NEUTRO (el verdoso #0d140d era el "cuadro verde" que se veía
       detrás de las pestañas y la lista de chats) */
    #jugador-mensajes, .chat-screen, .chat-conversation { background:#070907 !important; }
    .chat-screen::after, .chat-conversation::after { display:none !important; }
    /* Mejorar contraste de burbujas */
    .chat-msg.in, .msg.in { background:#1f2c1f !important; color:#fff !important; }
    .chat-msg.out, .msg.out { background:#235c2e !important; color:#fff !important; }
    /* Input del chat sin franja negra */
    .chat-input-bar, .chat-composer { background:#0a0a0a !important; border-top:1px solid #1a1a1a !important; }
  `;
  document.head.appendChild(st);
})();

/* ════════════════════════════════════════════════════════════════════════
   FIX espacio superior excesivo en secciones con título (Partidos, Perfil, etc.)
   ════════════════════════════════════════════════════════════════════════ */
(function injectSpacingCSS(){
  if (document.getElementById('spacing-v2-css')) return;
  const st = document.createElement('style');
  st.id = 'spacing-v2-css';
  st.textContent = `
    #view-jugador .dashboard-tab-content { padding-top: 8px !important; }
    #view-jugador .panel-header { margin-top: 0 !important; padding-top: 2px !important; margin-bottom: 12px !important; }
    #view-jugador .panel-title { margin-top: 0 !important; }
    #bp-controls { margin-top: 4px !important; }
    /* Portada del perfil: quitar margen superior excesivo */
    #jugador-perfil { padding-top: 0 !important; }
    #jugador-perfil .profile-cover, #jugador-perfil [class*="cover"] { margin-top: 0 !important; }
  `;
  document.head.appendChild(st);
})();

console.log('[canchero-ui-v2] ✅ Secciones 3,4,6 + spacing + ranking fix cargadas');
})();
