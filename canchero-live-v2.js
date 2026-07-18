/**
 * canchero-live-v2.js — DIRECTOS v2 (modelo embed + partido)
 * - Crear directo: elegir un partido de "Mis Partidos" (autorrelleno) o manual.
 * - Plataforma: YouTube / Twitch / Kick (embebido) o "Solo seguimiento".
 * - Confirmación antes de iniciar. Orientación horizontal (def.) / vertical.
 * - Lista de directos en vivo con marcador, escudos, info, plataforma.
 * - Visor: video embebido + marcador en vivo + chat de comentarios + predecir.
 * - Dueño: marcar goles (+/-), finalizar, eliminar.
 * Meta de embed se guarda como JSON en la columna `formation` (sin tocar esquema).
 */
(function(){
'use strict';
const sb = () => window._sb;
const me = () => window.userData;
function toast(m,t){ if(window.showToast) showToast(m,t); }
function host(){ return location.hostname || 'canchero-app.vercel.app'; }

function meta(s){ try { return JSON.parse(s.formation||'{}'); } catch(e){ return {}; } }
function platIcon(p){ return p==='youtube'?'<i class="bx bxl-youtube" style="color:#ff0000;"></i>':p==='twitch'?'<i class="bx bxl-twitch" style="color:#9146ff;"></i>':p==='kick'?'<span style="color:#53fc18;font-weight:900;">K</span>':'<i class="bx bx-broadcast" style="color:#ff4444;"></i>'; }

/* ── Embed URL builder ── */
function embedURL(p, url){
  url = (url||'').trim();
  if (p==='youtube'){
    let id = '';
    let mm = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/) || url.match(/\/live\/([^?]+)/) || url.match(/embed\/([^?]+)/);
    if (mm) id = mm[1];
    if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1`;
    // canal: usuario → live_stream
    const ch = url.replace(/.*youtube\.com\/(channel\/|@)?/,'').replace(/\/.*/,'');
    return `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(ch)}&autoplay=1`;
  }
  if (p==='twitch'){
    const ch = url.replace(/.*twitch\.tv\//,'').replace(/\/.*/,'').trim() || url;
    return `https://player.twitch.tv/?channel=${encodeURIComponent(ch)}&parent=${host()}&autoplay=true`;
  }
  if (p==='kick'){
    const ch = url.replace(/.*kick\.com\//,'').replace(/\/.*/,'').trim() || url;
    return `https://player.kick.com/${encodeURIComponent(ch)}?autoplay=true`;
  }
  return '';
}

/* ════════════ CREAR DIRECTO ════════════ */
window._openCrearDirecto = async function(){
  if (!me()){ toast('Iniciá sesión para hacer un directo','error'); return; }
  let modal = document.getElementById('crear-directo-modal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'crear-directo-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:30000;background:rgba(0,0,0,0.88);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;';
  modal.innerHTML = `<div style="background:#0f110f;border:1px solid #1e1e1e;border-radius:20px;width:100%;max-width:420px;padding:20px;max-height:92vh;overflow-y:auto;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
      <h3 style="font-size:16px;font-weight:900;margin:0;">🎥 Crear directo</h3>
      <button onclick="document.getElementById('crear-directo-modal').remove()" style="background:rgba(255,255,255,0.06);border:1px solid #333;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:18px;">&times;</button>
    </div>
    <!-- Fuente -->
    <div style="display:flex;gap:8px;margin-bottom:12px;">
      <button id="cd-src-match" onclick="window._cdSetSrc('match')" style="flex:1;background:rgba(186,255,0,0.12);color:var(--accent);border:1px solid var(--accent);border-radius:10px;padding:9px;font-weight:800;font-size:12px;cursor:pointer;">Un partido mío</button>
      <button id="cd-src-manual" onclick="window._cdSetSrc('manual')" style="flex:1;background:#1a1a1a;color:#888;border:1px solid #2a2a2a;border-radius:10px;padding:9px;font-weight:800;font-size:12px;cursor:pointer;">Manual</button>
    </div>
    <div id="cd-match-wrap" style="margin-bottom:12px;">
      <select id="cd-match" onchange="window._cdFillFromMatch()" style="width:100%;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;padding:10px;font-size:13px;"><option value="">Cargando tus partidos...</option></select>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:10px;">
      <input id="cd-home" placeholder="Equipo local" style="flex:1;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;padding:10px;font-size:13px;box-sizing:border-box;">
      <input id="cd-away" placeholder="Visitante" style="flex:1;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;padding:10px;font-size:13px;box-sizing:border-box;">
    </div>
    <!-- Plataforma -->
    <div style="font-size:11px;color:#888;font-weight:700;margin-bottom:6px;">PLATAFORMA DE TRANSMISIÓN</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px;">
      ${[['youtube','YouTube'],['twitch','Twitch'],['kick','Kick'],['none','Seguim.']].map((p,i)=>`<button id="cd-plat-${p[0]}" onclick="window._cdSetPlat('${p[0]}')" style="background:${i===0?'rgba(186,255,0,0.12)':'#1a1a1a'};color:${i===0?'var(--accent)':'#888'};border:1px solid ${i===0?'var(--accent)':'#2a2a2a'};border-radius:10px;padding:9px 4px;font-weight:800;font-size:11px;cursor:pointer;">${p[1]}</button>`).join('')}
    </div>
    <div id="cd-url-wrap" style="margin-bottom:10px;">
      <input id="cd-url" placeholder="Link o usuario del canal (ej: youtube.com/watch?v=... o tu_usuario)" style="width:100%;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;padding:10px;font-size:12px;box-sizing:border-box;">
      <div style="font-size:10px;color:#666;margin-top:5px;">Transmití desde la app de la plataforma y pegá acá el link de tu directo. Se verá embebido en Canchero.</div>
    </div>
    <!-- Orientación -->
    <div style="font-size:11px;color:#888;font-weight:700;margin-bottom:6px;">ORIENTACIÓN</div>
    <div style="display:flex;gap:8px;margin-bottom:16px;">
      <button id="cd-or-h" onclick="window._cdSetOr('h')" style="flex:1;background:rgba(186,255,0,0.12);color:var(--accent);border:1px solid var(--accent);border-radius:10px;padding:9px;font-weight:800;font-size:12px;cursor:pointer;">↔ Horizontal (recom.)</button>
      <button id="cd-or-v" onclick="window._cdSetOr('v')" style="flex:1;background:#1a1a1a;color:#888;border:1px solid #2a2a2a;border-radius:10px;padding:9px;font-weight:800;font-size:12px;cursor:pointer;">↕ Vertical</button>
    </div>
    <button onclick="window._cdConfirm()" style="width:100%;background:var(--accent);color:#000;border:none;border-radius:12px;padding:13px;font-weight:900;font-size:14px;cursor:pointer;">CONTINUAR →</button>
  </div>`;
  modal.onclick = e => { if(e.target===modal) modal.remove(); };
  document.body.appendChild(modal);
  window._cdState = { src:'match', platform:'youtube', orientation:'h', match:null };
  // cargar mis partidos (creados + donde participo)
  try {
    const cols = 'id,name,home_club_name,away_club_name,team_a_name,team_b_name,home_club_logo,away_club_logo,team_a_logo,team_b_logo,city,country,scheduled_at';
    const byMap = {};
    const r1 = await sb().from('matches').select(cols).eq('created_by', me().email).order('scheduled_at',{ascending:false}).limit(40);
    ((r1&&r1.data)||[]).forEach(m=>byMap[m.id]=m);
    // partidos donde estoy anotado
    try {
      const mp = await sb().from('match_players').select('match_id').eq('player_email', me().email).limit(40);
      const ids = ((mp&&mp.data)||[]).map(x=>x.match_id).filter(id=>!byMap[id]);
      if (ids.length){ const r2 = await sb().from('matches').select(cols).in('id', ids); ((r2&&r2.data)||[]).forEach(m=>byMap[m.id]=m); }
    } catch(e){}
    const opts = Object.values(byMap);
    const sel = document.getElementById('cd-match');
    if (sel) sel.innerHTML = (opts.length?'<option value="">Elegí un partido...</option>':'<option value="">No tenés partidos — cargá manual</option>') + opts.map(m=>`<option value='${m.id}' data-m='${encodeURIComponent(JSON.stringify(m))}'>${(m.name||'Partido')} ${m.scheduled_at?'· '+new Date(m.scheduled_at).toLocaleDateString('es-UY'):''}</option>`).join('');
  } catch(e){ const sel=document.getElementById('cd-match'); if(sel)sel.innerHTML='<option value="">No se pudieron cargar</option>'; }
};
window._cdSetSrc = function(s){
  window._cdState.src = s;
  document.getElementById('cd-src-match').style.cssText = `flex:1;border-radius:10px;padding:9px;font-weight:800;font-size:12px;cursor:pointer;background:${s==='match'?'rgba(186,255,0,0.12)':'#1a1a1a'};color:${s==='match'?'var(--accent)':'#888'};border:1px solid ${s==='match'?'var(--accent)':'#2a2a2a'};`;
  document.getElementById('cd-src-manual').style.cssText = `flex:1;border-radius:10px;padding:9px;font-weight:800;font-size:12px;cursor:pointer;background:${s==='manual'?'rgba(186,255,0,0.12)':'#1a1a1a'};color:${s==='manual'?'var(--accent)':'#888'};border:1px solid ${s==='manual'?'var(--accent)':'#2a2a2a'};`;
  document.getElementById('cd-match-wrap').style.display = s==='match'?'block':'none';
};
window._cdFillFromMatch = function(){
  const sel = document.getElementById('cd-match');
  const opt = sel?.selectedOptions[0];
  if (!opt || !opt.dataset.m) return;
  let m; try { m = JSON.parse(decodeURIComponent(opt.dataset.m)); } catch(e){ return; }
  window._cdState.match = m;
  document.getElementById('cd-home').value = m.home_club_name||m.team_a_name||'';
  document.getElementById('cd-away').value = m.away_club_name||m.team_b_name||'';
};
window._cdSetPlat = function(p){
  window._cdState.platform = p;
  ['youtube','twitch','kick','none'].forEach(x=>{ const b=document.getElementById('cd-plat-'+x); if(b){ const on=x===p; b.style.background=on?'rgba(186,255,0,0.12)':'#1a1a1a'; b.style.color=on?'var(--accent)':'#888'; b.style.border=on?'1px solid var(--accent)':'1px solid #2a2a2a'; }});
  document.getElementById('cd-url-wrap').style.display = p==='none'?'none':'block';
};
window._cdSetOr = function(o){
  window._cdState.orientation = o;
  document.getElementById('cd-or-h').style.cssText = `flex:1;border-radius:10px;padding:9px;font-weight:800;font-size:12px;cursor:pointer;background:${o==='h'?'rgba(186,255,0,0.12)':'#1a1a1a'};color:${o==='h'?'var(--accent)':'#888'};border:1px solid ${o==='h'?'var(--accent)':'#2a2a2a'};`;
  document.getElementById('cd-or-v').style.cssText = `flex:1;border-radius:10px;padding:9px;font-weight:800;font-size:12px;cursor:pointer;background:${o==='v'?'rgba(186,255,0,0.12)':'#1a1a1a'};color:${o==='v'?'var(--accent)':'#888'};border:1px solid ${o==='v'?'var(--accent)':'#2a2a2a'};`;
};
window._cdConfirm = function(){
  const st = window._cdState;
  const home = document.getElementById('cd-home').value.trim();
  const away = document.getElementById('cd-away').value.trim();
  const url = document.getElementById('cd-url').value.trim();
  if (!home){ toast('Poné el nombre del equipo local','error'); return; }
  if (st.platform!=='none' && !url){ toast('Pegá el link de tu transmisión','error'); return; }
  // Paso de confirmación
  const wrap = document.querySelector('#crear-directo-modal > div');
  wrap.innerHTML = `<div style="text-align:center;padding:10px;">
    <div style="font-size:40px;margin-bottom:8px;">🔴</div>
    <h3 style="font-size:17px;font-weight:900;margin:0 0 6px;">¿Iniciar el directo ahora?</h3>
    <p style="color:#888;font-size:13px;margin-bottom:6px;">${home} vs ${away||'Rival'}</p>
    <p style="color:#666;font-size:12px;margin-bottom:18px;">${st.platform==='none'?'Solo seguimiento (marcador + chat)':'Plataforma: '+st.platform+' · '+(st.orientation==='h'?'horizontal':'vertical')}</p>
    <div style="display:flex;gap:8px;">
      <button onclick="window._openCrearDirecto()" style="flex:1;background:#1a1a1a;color:#888;border:1px solid #2a2a2a;border-radius:12px;padding:12px;font-weight:700;cursor:pointer;">← Volver</button>
      <button onclick="window._cdStart()" style="flex:2;background:#ff3b3b;color:#fff;border:none;border-radius:12px;padding:12px;font-weight:900;cursor:pointer;">🔴 INICIAR DIRECTO</button>
    </div>
  </div>`;
};
window._cdStart = async function(){
  const st = window._cdState;
  const home = document.getElementById('cd-home')?.value?.trim() || (st.match&&(st.match.home_club_name||st.match.team_a_name)) || 'Local';
  const away = document.getElementById('cd-away')?.value?.trim() || 'Rival';
  const url = document.getElementById('cd-url')?.value?.trim() || '';
  const m = st.match || {};
  const payload = {
    title: home + (away?(' vs '+away):''),
    streamer_name: me().name || me().email,
    streamer_email: me().email,
    status: 'live',
    started_at: new Date().toISOString(),
    match_id: m.id || null,
    team_name: home,
    rival_name: away,
    team_logo: m.home_club_logo||m.team_a_logo||null,
    rival_logo: m.away_club_logo||m.team_b_logo||null,
    score_home: 0, score_away: 0, viewer_count: 0,
    city: m.city||null, country: m.country||null,
    formation: JSON.stringify({ platform: st.platform, url: url, orientation: st.orientation })
  };
  const res = await sb().from('live_streams').insert(payload).select().single();
  if (!res || res.error){ toast('No se pudo iniciar: '+(res&&res.error&&res.error.message||'error'),'error'); return; }
  document.getElementById('crear-directo-modal')?.remove();
  toast('🔴 ¡Directo iniciado!','success');
  window._openDirecto(res.data.id);
  if (window._loadDirectosV2) window._loadDirectosV2();
};

/* ════════════ LISTA DE DIRECTOS ════════════ */
window._loadDirectosV2 = async function(){
  const list = document.getElementById('live-streams-list');
  if (!list) return;
  list.innerHTML = '<div style="text-align:center;padding:30px;color:#555;"><i class="bx bx-loader-alt bx-spin" style="font-size:26px;"></i></div>';
  let live = [];
  const byId = {};
  try { const r = await sb().from('live_streams').select('*').eq('status','live').order('started_at',{ascending:false}).limit(40); ((r&&r.data)||[]).forEach(s=>byId[s.id]=s); } catch(e){}
  // Incluir MIS directos (cualquier estado) para poder gestionarlos/eliminarlos
  if (me()) { try { const r2 = await sb().from('live_streams').select('*').eq('streamer_email', me().email).order('started_at',{ascending:false}).limit(30); ((r2&&r2.data)||[]).forEach(s=>{ if(!byId[s.id]) byId[s.id]=s; }); } catch(e){} }
  live = Object.values(byId).sort((a,b)=> new Date(b.started_at||0)-new Date(a.started_at||0));
  const q = (document.getElementById('live-filter-input')?.value||'').toLowerCase();
  if (q) live = live.filter(s => ((s.title||'')+(s.team_name||'')+(s.rival_name||'')+(s.city||'')+(s.country||'')).toLowerCase().includes(q));
  if (!live.length){
    list.innerHTML = `<div style="text-align:center;padding:46px 20px;color:#555;"><i class='bx bx-broadcast' style="font-size:46px;display:block;margin-bottom:10px;opacity:.4;"></i><div style="font-size:14px;font-weight:700;margin-bottom:4px;">No hay directos en vivo</div><div style="font-size:12px;">Sé el primero en transmitir.</div></div>`;
    return;
  }
  list.innerHTML = live.map(s=>{
    const mt = meta(s);
    const isLive = s.status==='live';
    const owner = me() && s.streamer_email===me().email;
    return `<div style="background:#111;border:1px solid #1e1e1e;border-radius:16px;overflow:hidden;">
      <div onclick="window._openDirecto('${s.id}')" style="cursor:pointer;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:${isLive?'rgba(255,59,59,0.08)':'#161616'};border-bottom:1px solid #1a1a1a;">
        ${isLive?`<span style="background:#ff3b3b;color:#fff;font-size:9px;font-weight:900;padding:2px 8px;border-radius:8px;animation:bpPulse 1.4s infinite;">● EN VIVO</span>`:`<span style="background:#333;color:#999;font-size:9px;font-weight:900;padding:2px 8px;border-radius:8px;">FINALIZADO</span>`}
        <span style="font-size:11px;color:#888;">${platIcon(mt.platform)} ${mt.platform&&mt.platform!=='none'?mt.platform:'Seguimiento'} · <i class='bx bx-show'></i> ${s.viewer_count||0}</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px;padding:14px;">
        <div style="flex:1;text-align:center;"><div style="font-weight:800;font-size:13px;color:#fff;">${s.team_name||'Local'}</div></div>
        <div style="font-size:24px;font-weight:900;color:#fff;">${s.score_home||0}<span style="color:var(--accent);margin:0 5px;">-</span>${s.score_away||0}</div>
        <div style="flex:1;text-align:center;"><div style="font-weight:800;font-size:13px;color:#fff;">${s.rival_name||'Rival'}</div></div>
      </div>
      ${s.city||s.country?`<div style="padding:0 14px 12px;font-size:11px;color:#666;"><i class='bx bx-map'></i> ${[s.city,s.country].filter(Boolean).join(', ')}</div>`:''}
      </div>
      ${owner?`<div style="display:flex;gap:8px;padding:0 14px 14px;">
        ${isLive?`<button onclick="event.stopPropagation();window._directoFinish('${s.id}')" style="flex:1;background:rgba(255,170,0,0.12);color:#ffaa00;border:1px solid rgba(255,170,0,0.3);border-radius:10px;padding:9px;font-size:12px;font-weight:700;cursor:pointer;">⏹ Finalizar</button>`:''}
        <button onclick="event.stopPropagation();window._directoDelete('${s.id}')" style="flex:1;background:rgba(255,68,68,0.12);color:#ff4444;border:1px solid rgba(255,68,68,0.3);border-radius:10px;padding:9px;font-size:12px;font-weight:700;cursor:pointer;"><i class='bx bx-trash'></i> Eliminar</button>
      </div>`:''}
    </div>`;
  }).join('');
};

/* ════════════ VISOR ════════════ */
window._openDirecto = async function(id){
  let modal = document.getElementById('directo-viewer');
  if (!modal){ modal = document.createElement('div'); modal.id='directo-viewer'; modal.style.cssText='position:fixed;inset:0;z-index:30050;background:#000;display:flex;flex-direction:column;'; document.body.appendChild(modal); }
  modal.style.display='flex';
  modal.innerHTML = `<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#555;"><i class='bx bx-loader-alt bx-spin' style="font-size:32px;"></i></div>`;
  const r = await sb().from('live_streams').select('*').eq('id',id).single();
  const s = r&&r.data;
  if (!s){ modal.innerHTML = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#777;gap:12px;"><p>Directo no encontrado</p><button onclick="window._closeDirecto()" style="background:var(--accent);color:#000;border:none;border-radius:18px;padding:8px 20px;font-weight:800;cursor:pointer;">Volver</button></div>`; return; }
  window._curDirecto = s;
  const mt = meta(s);
  const owner = s.streamer_email === me()?.email;
  const emb = mt.platform && mt.platform!=='none' ? embedURL(mt.platform, mt.url) : '';
  const vertical = mt.orientation==='v';
  sb().from('live_streams').update({ viewer_count:(s.viewer_count||0)+1 }).eq('id',id).then(()=>{},()=>{});

  modal.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#0a0a0a;flex-shrink:0;">
      <button onclick="window._closeDirecto()" style="background:rgba(255,255,255,0.08);border:none;border-radius:50%;width:36px;height:36px;color:#fff;font-size:18px;cursor:pointer;"><i class='bx bx-arrow-back'></i></button>
      <div style="flex:1;"><div style="font-weight:800;font-size:14px;color:#fff;">${s.team_name} vs ${s.rival_name||''}</div><div style="font-size:11px;color:#ff3b3b;font-weight:700;">● EN VIVO · <span id="dv-viewers">${s.viewer_count||0}</span> 👁</div></div>
      ${owner?`<button onclick="window._directoDelete('${id}')" style="background:rgba(255,68,68,0.12);border:1px solid rgba(255,68,68,0.3);color:#ff4444;border-radius:10px;padding:6px 10px;font-size:11px;font-weight:700;cursor:pointer;">Eliminar</button>`:''}
    </div>
    <!-- Video / seguimiento -->
    <div style="background:#000;${vertical?'flex:1;':'aspect-ratio:16/9;width:100%;'}position:relative;">
      ${emb?`<iframe src="${emb}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="width:100%;height:100%;border:0;position:${vertical?'absolute;inset:0;':'static;'}"></iframe>`
        :`<div style="height:100%;min-height:200px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#444;gap:8px;"><i class='bx bx-broadcast' style="font-size:46px;color:#ff3b3b;"></i><span style="font-size:13px;">Seguimiento en vivo (sin video)</span></div>`}
    </div>
    <!-- Marcador en vivo -->
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;padding:12px;background:#0d0d0d;flex-shrink:0;">
      <div style="text-align:center;flex:1;"><div style="font-size:12px;color:#aaa;">${s.team_name}</div><div id="dv-sh" style="font-size:30px;font-weight:900;color:#fff;">${s.score_home||0}</div>${owner?`<div style="display:flex;gap:4px;justify-content:center;margin-top:4px;"><button onclick="window._directoScore('home',1)" style="background:var(--accent);color:#000;border:none;border-radius:6px;width:26px;height:26px;font-weight:900;cursor:pointer;">+</button><button onclick="window._directoScore('home',-1)" style="background:#222;color:#fff;border:none;border-radius:6px;width:26px;height:26px;font-weight:900;cursor:pointer;">−</button></div>`:''}</div>
      <div style="color:var(--accent);font-weight:900;">VS</div>
      <div style="text-align:center;flex:1;"><div style="font-size:12px;color:#aaa;">${s.rival_name||'Rival'}</div><div id="dv-sa" style="font-size:30px;font-weight:900;color:#fff;">${s.score_away||0}</div>${owner?`<div style="display:flex;gap:4px;justify-content:center;margin-top:4px;"><button onclick="window._directoScore('away',1)" style="background:var(--accent);color:#000;border:none;border-radius:6px;width:26px;height:26px;font-weight:900;cursor:pointer;">+</button><button onclick="window._directoScore('away',-1)" style="background:#222;color:#fff;border:none;border-radius:6px;width:26px;height:26px;font-weight:900;cursor:pointer;">−</button></div>`:''}</div>
    </div>
    ${owner?`<div style="padding:0 12px 8px;background:#0d0d0d;flex-shrink:0;"><button onclick="window._directoFinish('${id}')" style="width:100%;background:rgba(255,68,68,0.12);color:#ff4444;border:1px solid rgba(255,68,68,0.3);border-radius:10px;padding:10px;font-weight:800;cursor:pointer;">⏹ Finalizar directo</button></div>`:''}
    ${s.match_id?`<div style="padding:0 12px 8px;background:#0d0d0d;flex-shrink:0;"><button onclick="window.openPredictionModal&&window.openPredictionModal('${s.match_id}','${(s.team_name||'')+' vs '+(s.rival_name||'')}')" style="width:100%;background:rgba(186,255,0,0.08);color:var(--accent);border:1px solid rgba(186,255,0,0.25);border-radius:10px;padding:10px;font-weight:800;cursor:pointer;">🎯 Predecir resultado</button></div>`:''}
    <!-- Chat -->
    <div style="flex:${vertical?'0 0 38%':'1'};display:flex;flex-direction:column;background:#0a0a0a;min-height:160px;border-top:1px solid #1a1a1a;">
      <div style="font-size:11px;color:#888;font-weight:700;padding:8px 12px;">💬 COMENTARIOS EN VIVO</div>
      <div id="dv-chat" style="flex:1;overflow-y:auto;padding:0 12px;display:flex;flex-direction:column;gap:6px;"></div>
      <div style="display:flex;gap:8px;padding:8px 12px;">
        <input id="dv-msg" placeholder="Comentá el partido..." onkeydown="if(event.key==='Enter')window._directoSend('${id}')" style="flex:1;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:20px;color:#fff;padding:9px 14px;font-size:13px;outline:none;">
        <button onclick="window._directoSend('${id}')" style="background:var(--accent);color:#000;border:none;border-radius:50%;width:40px;height:40px;cursor:pointer;font-size:16px;"><i class='bx bx-send'></i></button>
      </div>
    </div>`;
  window._directoLoadChat(id);
  // Poll marcador + viewers + chat cada 5s
  clearInterval(window._directoPoll);
  window._directoPoll = setInterval(()=>window._directoRefresh(id), 5000);
};
window._closeDirecto = function(){ clearInterval(window._directoPoll); const m=document.getElementById('directo-viewer'); if(m)m.style.display='none'; if(window._loadDirectosV2)window._loadDirectosV2(); };
window._directoRefresh = async function(id){
  const r = await sb().from('live_streams').select('score_home,score_away,viewer_count,status').eq('id',id).single();
  const s = r&&r.data; if(!s) return;
  if (s.status!=='live'){ clearInterval(window._directoPoll); }
  const sh=document.getElementById('dv-sh'), sa=document.getElementById('dv-sa'), vw=document.getElementById('dv-viewers');
  if(sh)sh.textContent=s.score_home||0; if(sa)sa.textContent=s.score_away||0; if(vw)vw.textContent=s.viewer_count||0;
  window._directoLoadChat(id);
};
window._directoScore = async function(side,delta){
  const s = window._curDirecto; if(!s) return;
  const f = side==='home'?'score_home':'score_away';
  const nv = Math.max(0,(s[f]||0)+delta); s[f]=nv;
  const el=document.getElementById(side==='home'?'dv-sh':'dv-sa'); if(el)el.textContent=nv;
  await sb().from('live_streams').update({[f]:nv}).eq('id',s.id).then(()=>{},()=>{});
};
window._directoFinish = async function(id){
  await sb().from('live_streams').update({status:'ended',ended_at:new Date().toISOString()}).eq('id',id).then(()=>{},()=>{});
  toast('Directo finalizado','success'); window._closeDirecto();
};
window._directoDelete = async function(id){
  await sb().from('live_streams').delete().eq('id',id).then(()=>{},()=>{});
  toast('Directo eliminado','success'); window._closeDirecto();
};
window._directoLoadChat = async function(id){
  const box = document.getElementById('dv-chat'); if(!box) return;
  let msgs=[];
  try { const r = await sb().from('live_comments').select('*').eq('stream_id',id).order('created_at',{ascending:true}).limit(60); msgs=(r&&r.data)||[]; } catch(e){}
  box.innerHTML = msgs.map(c=>`<div style="font-size:13px;"><span style="color:var(--accent);font-weight:700;">${c.user_name||'Hincha'}:</span> <span style="color:#ddd;">${(c.message||'').replace(/</g,'&lt;')}</span></div>`).join('') || '<div style="color:#444;font-size:12px;text-align:center;padding:14px;">Sé el primero en comentar.</div>';
  box.scrollTop = box.scrollHeight;
};
window._directoSend = async function(id){
  const inp=document.getElementById('dv-msg'); const msg=inp?.value?.trim(); if(!msg||!me())return; inp.value='';
  const box=document.getElementById('dv-chat'); if(box){ if(box.querySelector('div[style*="text-align:center"]'))box.innerHTML=''; box.innerHTML+=`<div style="font-size:13px;"><span style="color:var(--accent);font-weight:700;">${me().name||'Vos'}:</span> <span style="color:#ddd;">${msg.replace(/</g,'&lt;')}</span></div>`; box.scrollTop=box.scrollHeight; }
  await sb().from('live_comments').insert({stream_id:id,user_email:me().email,user_name:me().name||me().email,message:msg,created_at:new Date().toISOString()}).then(()=>{},()=>{});
};

/* ── Integración con la pestaña En Vivo existente ── */
function wire(){
  if (!window.CancheroLive) window.CancheroLive = {};
  window.CancheroLive.loadLiveStreamsList = window._loadDirectosV2;
  window.CancheroLive.filterLiveList = function(){ window._loadDirectosV2(); };
  const _origShow = window.CancheroLive.showLiveSection;
  window.CancheroLive.showLiveSection = function(sec){
    if (sec==='hacer'){ window._openCrearDirecto();
      // mantener visible la sección "ver"
      const v=document.getElementById('live-section-ver'); if(v)v.style.display='block';
      const h=document.getElementById('live-section-hacer'); if(h)h.style.display='none';
      return;
    }
    if (_origShow) try{ _origShow(sec); }catch(e){}
    window._loadDirectosV2();
  };
  // Botón crear arriba de la lista
  setTimeout(()=>{
    const segHacer = document.getElementById('live-seg-hacer');
    if (segHacer) segHacer.setAttribute('onclick',"window._openCrearDirecto()");
  }, 300);
}
if (document.readyState!=='loading') wire(); else document.addEventListener('DOMContentLoaded', wire);

console.log('[canchero-live-v2] ✅ Directos v2 (embed + partido + marcador + chat)');
})();
