/**
 * canchero-match-v2.js  (v2.1 — corregido)
 * SOLO mejora "Buscar Partidos": carga real de la tabla `matches`,
 * identidad oscura de Canchero (sin rectángulo verde), filtros desplegables
 * (Todos/Próximos/En Vivo/Finalizados/Abiertos/Faltan jugadores/Mi ciudad),
 * buscador + filtro ciudad/país, cards con ambos escudos.
 *
 * NO sobreescribe viewMatchDetails: usa la ficha original de script.js
 * que ya tiene Panel, Apuesta, Encuesta, Gestionar jugadores, Editar,
 * Eliminar, Chat, etc. (no se pierde ninguna función).
 */
(function() {
'use strict';

const sb = () => window._sb;

const FILTERS = [
  { id:'todos',            label:'Todos',            icon:'bx-list-ul' },
  { id:'proximos',         label:'Próximos',         icon:'bx-calendar' },
  { id:'en-vivo',          label:'En Vivo',          icon:'bx-broadcast' },
  { id:'finalizados',      label:'Finalizados',      icon:'bx-flag' },
  { id:'abiertos',         label:'Abiertos',         icon:'bx-lock-open' },
  { id:'faltan-jugadores', label:'Faltan jugadores', icon:'bx-user-plus' },
  { id:'mi-ciudad',        label:'Mi ciudad',        icon:'bx-map-pin' },
];

window._bpState = { filter:'proximos', q:'', city:'', country:'', all:[] };

function fmtDate(s){
  if(!s) return 'Sin fecha';
  try { return new Date(s).toLocaleString('es-UY',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}); }
  catch(e){ return 'Sin fecha'; }
}

function statusOf(m){
  const st = (m.status||'').toLowerCase();
  // Estados explícitos primero
  if (st==='finished' || st==='finalizado' || st==='terminado' || m.finished_at) return 'finalizado';
  if (st==='live' || st==='en_vivo' || st==='envivo' || st==='en_juego' || m.is_live) return 'en-vivo';
  const when = m.scheduled_at ? new Date(m.scheduled_at).getTime() : 0;
  const now = Date.now();
  const start = m.started_at ? new Date(m.started_at).getTime() : when;
  const durMs = (m.duration_minutes || m.duration || 90) * 60000;
  // Futuro y no iniciado → próximo (aunque tenga goles/estado de prueba)
  if (when && when > now && !m.started_at) return 'proximo';
  // Ventana de juego: desde el inicio hasta fin + 2h de margen para cargar datos → EN VIVO
  // (clave: marcar un gol NO debe convertirlo en "finalizado" y borrar las opciones del capitán)
  if (start && now >= start && now < start + durMs + 2*3600000) return 'en-vivo';
  // Pasada la ventana → finalizado
  if (start && now >= start + durMs + 2*3600000) return 'finalizado';
  return 'proximo';
}

function slotsInfo(m){
  const fmtStr = ((m.name||'')+' '+(m.format||'')+' '+(m.modality||'')).toLowerCase();
  const derived = (/5v5|f5|futbol 5|fútbol 5/.test(fmtStr)) ? 10
    : (/7v7|f7|futbol 7|fútbol 7/.test(fmtStr)) ? 14
    : (/11/.test(fmtStr)) ? 22 : (m.slots_total || 0);
  const total = m.slots_total || derived || 0;
  const taken = m.slots_taken || 0;
  return { total, taken, left: Math.max(0, total - taken) };
}

function escudo(logo, name, color){
  const c = color || 'var(--accent)';
  if (logo) return `<img src="${logo}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;background:#0a0a0a;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
    <div style="display:none;width:40px;height:40px;border-radius:50%;background:#0a0a0a;border:1px solid ${c};align-items:center;justify-content:center;font-weight:900;color:${c};">${(name||'?')[0]}</div>`;
  return `<div style="width:40px;height:40px;border-radius:50%;background:#0a0a0a;border:1px solid ${c};display:flex;align-items:center;justify-content:center;font-weight:900;color:${c};">${(name||'?')[0]}</div>`;
}

window.renderBuscarPartidos = async function(){
  const list = document.getElementById('partidos-list');
  if (!list) return;

  // Actualizar título del panel
  const title = document.querySelector('#jugador-buscar-partidos .panel-title');
  if (title) title.textContent = 'PARTIDOS';

  // Controles (search + dropdown filtros + ciudad/país) — una sola vez
  let controls = document.getElementById('bp-controls');
  if (!controls) {
    controls = document.createElement('div');
    controls.id = 'bp-controls';
    controls.style.cssText = 'margin-bottom:12px;';
    controls.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
        <div style="flex:1;display:flex;align-items:center;gap:8px;background:#111;border:1px solid #222;border-radius:22px;padding:8px 14px;">
          <i class='bx bx-search' style="color:#666;font-size:15px;"></i>
          <input id="bp-search" placeholder="Buscar partido, equipo o cancha..." oninput="window._bpApply()" style="flex:1;background:none;border:none;outline:none;color:#fff;font-size:13px;">
        </div>
        <button onclick="window._bpToggleMenu()" style="position:relative;background:rgba(186,255,0,0.08);border:1px solid rgba(186,255,0,0.3);border-radius:22px;color:var(--accent);font-size:12px;font-weight:800;padding:9px 14px;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:6px;">
          <i class='bx bx-slider-alt'></i><span id="bp-filter-label">Próximos</span><i class='bx bx-chevron-down'></i>
        </button>
      </div>
      <div style="display:flex;gap:8px;">
        ${window.CancheroGeo ? window.CancheroGeo.selectsHTML('bp') : '<input id="bp-country" placeholder="País" style="flex:1;background:#111;border:1px solid #222;border-radius:12px;padding:8px 12px;color:#fff;font-size:12px;"><input id="bp-city" placeholder="Ciudad" style="flex:1;background:#111;border:1px solid #222;border-radius:12px;padding:8px 12px;color:#fff;font-size:12px;">'}
      </div>
      <div id="bp-menu" style="display:none;background:#111;border:1px solid #222;border-radius:14px;padding:6px;margin-top:8px;">
        ${FILTERS.map(f=>`<button onclick="window._bpSetFilter('${f.id}')" id="bp-opt-${f.id}" style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:none;border:none;color:#ccc;font-size:13px;font-weight:600;padding:10px 12px;border-radius:10px;cursor:pointer;">
          <i class='bx ${f.icon}' style="font-size:16px;"></i> ${f.label}
        </button>`).join('')}
      </div>`;
    list.parentElement.insertBefore(controls, list);
    if (window.CancheroGeo) window.CancheroGeo.bindSelects(document.getElementById('bp-country'), document.getElementById('bp-city'), ()=>window._bpApply());
  }

  list.innerHTML = `<div style="text-align:center;padding:36px;color:#555;"><i class='bx bx-loader-alt bx-spin' style="font-size:26px;"></i></div>`;

  const client = sb();
  if (!client){
    window._bpRetries = (window._bpRetries||0) + 1;
    if (window._bpRetries <= 6){ setTimeout(()=>window.renderBuscarPartidos(), 1000); }
    else { list.innerHTML = `<div style="text-align:center;padding:40px;color:#888;">Sin conexión a la base. <button onclick="window._bpRetries=0;window.renderBuscarPartidos()" style="background:var(--accent);color:#000;border:none;border-radius:10px;padding:6px 14px;font-weight:700;cursor:pointer;margin-top:8px;">Reintentar</button></div>`; }
    return;
  }
  window._bpRetries = 0;

  const myEmail = window.userData?.email;
  let all = [];
  // 1) Consulta amplia (todos los partidos visibles)
  try {
    const r1 = await client.from('matches').select('*').order('scheduled_at',{ascending:false}).limit(150);
    all = r1.data || [];
  } catch(e){ all = []; }
  // 2) Garantizar que mis propios partidos siempre aparezcan (aunque RLS limite la consulta amplia)
  if (myEmail) {
    try {
      const r2 = await client.from('matches').select('*').eq('created_by', myEmail).limit(60);
      (r2.data||[]).forEach(m=>{ if(!all.find(x=>x.id===m.id)) all.push(m); });
    } catch(e){}
  }
  // Re-ordenar por fecha desc
  all.sort((a,b)=> new Date(b.scheduled_at||0) - new Date(a.scheduled_at||0));
  window._bpState.all = all;

  // Partidos en los que ya participo (para "Ya sos parte")
  window._bpState.myPart = new Set();
  if (myEmail) {
    try {
      const rp = await client.from('match_players').select('match_id').eq('player_email', myEmail);
      (rp.data||[]).forEach(r=> window._bpState.myPart.add(String(r.match_id)));
    } catch(e){}
  }

  window._bpApply();
};

window._bpToggleMenu = function(){
  const m = document.getElementById('bp-menu');
  if (m) m.style.display = m.style.display==='none' ? 'block' : 'none';
};

window._bpSetFilter = function(id){
  window._bpState.filter = id;
  const f = FILTERS.find(x=>x.id===id);
  const lbl = document.getElementById('bp-filter-label');
  if (lbl && f) lbl.textContent = f.label;
  FILTERS.forEach(x=>{ const o=document.getElementById('bp-opt-'+x.id); if(o){ o.style.background = x.id===id?'rgba(186,255,0,0.1)':'none'; o.style.color = x.id===id?'var(--accent)':'#ccc'; }});
  const menu = document.getElementById('bp-menu'); if (menu) menu.style.display='none';
  window._bpApply();
};

window._bpApply = function(){
  const list = document.getElementById('partidos-list');
  if (!list) return;
  const st = window._bpState;
  st.q = (document.getElementById('bp-search')?.value||'').toLowerCase();
  st.city = (document.getElementById('bp-city')?.value||'').toLowerCase();
  st.country = (document.getElementById('bp-country')?.value||'').toLowerCase();
  const myCity = (window.userData?.city || window.userData?.dept || '').toLowerCase();
  const myEmail2 = window.userData?.email;
  const now = new Date();

  let rows = (st.all||[]).filter(m=>{
    // Filtrar partidos falsos / de prueba: sin fecha real (salvo los míos) o sin datos válidos
    const isMine2 = m.created_by === myEmail2;
    if (!m.scheduled_at && !isMine2) return false;
    const s = statusOf(m);
    const sl = slotsInfo(m);
    if (st.filter==='proximos'        && s!=='proximo') return false;
    if (st.filter==='en-vivo'         && s!=='en-vivo') return false;
    if (st.filter==='finalizados'     && s!=='finalizado') return false;
    if (st.filter==='abiertos'        && !(m.is_open || (m.match_type||'').toLowerCase().includes('open') || (m.modality||'').toLowerCase().includes('abierto'))) return false;
    if (st.filter==='faltan-jugadores'&& !(sl.left>0 && (m.is_open || (m.match_type||'').toLowerCase().includes('open')))) return false;
    if (st.filter==='mi-ciudad'       && !(myCity && (m.city||m.venue||'').toLowerCase().includes(myCity))) return false;
    if (st.q && !((m.name||'')+(m.venue||'')+(m.city||'')+(m.home_club_name||m.team_home_name||'')+(m.away_club_name||m.team_away_name||'')).toLowerCase().includes(st.q)) return false;
    if (st.city && !((m.city||'')+(m.venue||'')).toLowerCase().includes(st.city)) return false;
    if (st.country && !((m.country||'')).toLowerCase().includes(st.country)) return false;
    return true;
  });

  if (!rows.length){
    list.innerHTML = `<div style="text-align:center;padding:50px 20px;color:#666;">
      <i class='bx bx-football' style="font-size:46px;display:block;margin-bottom:12px;opacity:0.35;"></i>
      <div style="font-size:14px;font-weight:700;margin-bottom:6px;">No hay partidos en esta categoría</div>
      <button class="btn btn-primary" style="margin-top:14px;" onclick="switchDashboardTab('jugador','crear-partido')"><i class='bx bx-plus'></i> CREAR UN PARTIDO</button>
    </div>`;
    return;
  }

  const myEmail = window.userData?.email;
  list.innerHTML = rows.map(m=>window._bpCard(m, myEmail)).join('');
};

window._bpCard = function(m, myEmail){
  const s = statusOf(m);
  const sl = slotsInfo(m);
  const isOpen = m.is_open || (m.match_type||'').toLowerCase().includes('open') || (m.modality||'').toLowerCase().includes('abierto');
  const isMine = m.created_by === myEmail;
  const isPart = isMine || (window._bpState && window._bpState.myPart && window._bpState.myPart.has(String(m.id)));

  const homeName = (m.home_club_name || m.team_home_name || 'Local').toString();
  const awayName = (m.away_club_name || m.team_away_name || (isOpen?'Abierto':'Visitante')).toString();
  const homeLogo = m.home_club_logo || m.home_logo || '';
  const awayLogo = m.away_club_logo || m.away_logo || '';

  let badge;
  if (s==='en-vivo') badge = `<span style="background:#ff3b3b;color:#fff;font-size:9px;font-weight:900;padding:2px 8px;border-radius:8px;animation:bpPulse 1.4s infinite;">● EN VIVO</span>`;
  else if (s==='finalizado') badge = `<span style="background:#222;color:#888;font-size:9px;font-weight:900;padding:2px 8px;border-radius:8px;">FINALIZADO</span>`;
  else if (isOpen) badge = `<span style="background:#00e676;color:#000;font-size:9px;font-weight:900;padding:2px 8px;border-radius:8px;">ABIERTO</span>`;
  else badge = `<span style="background:#1a3a5c;color:#64b4ff;font-size:9px;font-weight:900;padding:2px 8px;border-radius:8px;">PRIVADO</span>`;

  const center = (m.home_score!=null && m.away_score!=null)
    ? `<div style="font-size:24px;font-weight:900;color:#fff;letter-spacing:2px;">${m.home_score}<span style="color:var(--accent);margin:0 4px;">-</span>${m.away_score}</div>`
    : `<div style="font-size:16px;font-weight:900;color:var(--accent);">VS</div>`;

  const fmt = m.modality || m.format || (/(5|7|11)/.exec(m.name||'')?.[0] ? 'F'+/(5|7|11)/.exec(m.name)[0] : '');

  return `<div onclick="window.viewMatchDetails&&window.viewMatchDetails('${m.id}')" style="background:#111;border:1px solid #1e1e1e;border-radius:16px;padding:14px;margin-bottom:10px;cursor:pointer;transition:.15s;" onmouseover="this.style.borderColor='rgba(186,255,0,0.3)'" onmouseout="this.style.borderColor='#1e1e1e'">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:6px;">${badge}${fmt?`<span style="font-size:10px;color:#666;font-weight:700;">${fmt}</span>`:''}</div>
      <span style="font-size:10px;color:#666;"><i class='bx bx-time'></i> ${fmtDate(m.scheduled_at)}</span>
    </div>
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;">${escudo(homeLogo,homeName)}<span style="color:#fff;font-weight:700;font-size:11px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90px;">${homeName}</span></div>
      <div style="text-align:center;min-width:54px;">${center}</div>
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;">${escudo(awayLogo,awayName,'#64b4ff')}<span style="color:#fff;font-weight:700;font-size:11px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90px;">${awayName}</span></div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid #1a1a1a;">
      <span style="font-size:11px;color:#666;"><i class='bx bx-map'></i> ${m.venue||m.city||'Sin ubicación'}</span>
      <div style="display:flex;align-items:center;gap:8px;">
        ${sl.total>0?`<span style="font-size:11px;color:${sl.left>0?'#00e676':'#ff4444'};font-weight:700;"><i class='bx bx-user'></i> ${sl.taken}/${sl.total}</span>`:''}
        ${m.price?`<span style="font-size:11px;color:#888;">$${m.price}</span>`:'<span style="font-size:11px;color:#888;">Gratis</span>'}
      </div>
    </div>
    ${isPart ? `<div style="width:100%;margin-top:10px;background:rgba(0,230,118,0.1);color:#00e676;border:1px solid rgba(0,230,118,0.3);border-radius:10px;padding:9px;font-size:12px;font-weight:800;text-align:center;"><i class='bx bx-check-circle'></i> Ya sos parte</div>` : (isOpen && sl.left>0 ? `<button onclick="event.stopPropagation();(window.joinOpenMatch||window._requestJoinMatch)('${m.id}')" style="width:100%;margin-top:10px;background:var(--accent);color:#000;border:none;border-radius:10px;padding:9px;font-size:12px;font-weight:900;cursor:pointer;"><i class='bx bx-user-plus'></i> UNIRME</button>` : '')}
  </div>`;
};

// Animación pulse (una vez)
if (!document.getElementById('bp-style')){
  const st=document.createElement('style'); st.id='bp-style';
  st.textContent='@keyframes bpPulse{0%,100%{opacity:1}50%{opacity:.45}}';
  document.head.appendChild(st);
}

/* ════════════════════════════════════════════════════════════════════════
   FICHA DE PARTIDO PREMIUM (tabs) — reutiliza TODAS las funciones existentes
   ════════════════════════════════════════════════════════════════════════ */
const F = {}; // estado ficha

window.viewMatchDetails = async function(matchId){
  const client = sb();
  if (!client) return;
  let modal = document.getElementById('mv2-ficha');
  if (!modal){
    modal = document.createElement('div');
    modal.id = 'mv2-ficha';
    modal.style.cssText = 'position:fixed;left:0;right:0;bottom:0;top:var(--nav-h,70px);z-index:899;background:#0a0a0a;display:flex;flex-direction:column;overflow:hidden;';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  modal.innerHTML = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#555;gap:14px;"><i class='bx bx-loader-alt bx-spin' style="font-size:34px;color:var(--accent);"></i><button onclick="document.getElementById('mv2-ficha').style.display='none'" style="background:transparent;border:1px solid #2a2a2a;color:#888;border-radius:18px;padding:6px 16px;font-size:12px;cursor:pointer;">Cancelar</button></div>`;

  const errView = (msg)=>{ modal.innerHTML = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#666;gap:12px;padding:20px;text-align:center;"><i class='bx bx-error' style="font-size:46px;"></i><p>${msg}</p><div style="display:flex;gap:8px;"><button onclick="window.viewMatchDetails('${matchId}')" style="background:var(--accent);color:#000;border:none;border-radius:20px;padding:9px 22px;font-weight:800;cursor:pointer;">Reintentar</button><button onclick="document.getElementById('mv2-ficha').style.display='none'" style="background:transparent;border:1px solid #2a2a2a;color:#888;border-radius:20px;padding:9px 22px;cursor:pointer;">Volver</button></div></div>`; };

  // Helper: ejecuta una query supabase sin depender de .catch en el builder
  const run = (q, fb) => q.then(r => (r && !r.error ? r : {data: fb}), () => ({data: fb}));

  try {
    const [mR, pR, eR, prR] = await Promise.all([
      run(client.from('matches').select('*').eq('id', matchId).single(), null),
      run(client.from('match_players').select('*').eq('match_id', matchId), []),
      run(client.from('match_events').select('*').eq('match_id', matchId).order('minute',{ascending:true}), []),
      run(client.from('match_predictions').select('*').eq('match_id', matchId), []),
    ]);
    const m = mR.data;
    if (!m){ errView('Partido no encontrado.'); return; }
    // Escudos: si el partido no los guardo, tomarlos de los clubes del creador/capitanes
    try {
      if (!m.home_club_logo || !m.away_club_logo) {
        const emails = [m.created_by, m.captain_home_email, m.captain_away_email].filter(Boolean);
        if (emails.length) {
          const { data: cl } = await client.from('clubs').select('name,logo,logo_url,owner_email').in('owner_email', emails);
          const clubs = cl || [];
          if (!m.home_club_logo) {
            const hc = clubs.find(c => c.owner_email === (m.captain_home_email || m.created_by)) || clubs[0];
            if (hc) { m.home_club_logo = hc.logo_url || hc.logo; if (!m.home_club_name) m.home_club_name = hc.name; }
          }
          if (!m.away_club_logo && m.captain_away_email) {
            const ac = clubs.find(c => c.owner_email === m.captain_away_email);
            if (ac) { m.away_club_logo = ac.logo_url || ac.logo; if (!m.away_club_name) m.away_club_name = ac.name; }
          }
        }
      }
    } catch(e) {}
    F.m = m; F.players = pR.data||[]; F.events = eR.data||[]; F.preds = prR.data||[];
    F.id = matchId;
    // Enriquecer jugadores con su foto de perfil (para verlos en la cancha)
    try {
      const emails=(F.players||[]).map(p=>p.player_email).filter(Boolean);
      if(emails.length){
        const { data: us } = await client.from('users').select('email,photo,name').in('email',emails);
        const umap={}; (us||[]).forEach(u=>umap[(u.email||'').toLowerCase()]=u);
        F.players.forEach(p=>{ const u=umap[(p.player_email||'').toLowerCase()]; if(u){ p.player_photo=p.player_photo||u.photo; p.player_name=p.player_name||u.name; } });
      }
    } catch(e){}
    // Realtime: si un capitán cambia posiciones/jugadores o se registran goles, refrescar para todos
    try {
      if (F._chan && client.removeChannel) client.removeChannel(F._chan);
      var _reRender = function(){
        // Debounce + solo re-renderizar tabs donde los datos importan (evita parpadeo del tab bar)
        clearTimeout(window._fRtTimer);
        window._fRtTimer = setTimeout(function(){
          var t = F._tab||'resumen';
          if (t==='timeline' || t==='jugadores' || t==='stats') _renderFicha(t);
        }, 600);
      };
      F._chan = client.channel('match-'+matchId)
        .on('postgres_changes', { event:'*', schema:'public', table:'match_players', filter:'match_id=eq.'+matchId }, async function(){
          try { const { data: pp } = await client.from('match_players').select('*').eq('match_id', matchId); if(pp){ F.players=pp; _reRender(); } } catch(e){}
        })
        .on('postgres_changes', { event:'*', schema:'public', table:'match_events', filter:'match_id=eq.'+matchId }, async function(){
          try { const { data: ee } = await client.from('match_events').select('*').eq('match_id', matchId).order('minute',{ascending:true}); if(ee){ F.events=ee; _reRender(); } } catch(e){}
        })
        .subscribe();
    } catch(e){}
    try { _renderFicha('resumen'); }
    catch(re){ console.error('[ficha render]', re); errView('Error al mostrar el partido.'); }
  } catch(e){
    console.error('[ficha] error:', e);
    errView('No se pudo cargar el partido.');
  }
};

function _fStatus(m){ return statusOf(m); }
function _fIsCaptain(m){ const e = window.userData?.email; return m.created_by===e || m.captain_home_email===e || m.captain_away_email===e; }

function _renderFicha(tab){
  F._tab = tab;
  const m = F.m, modal = document.getElementById('mv2-ficha');
  if (!modal) return;
  const s = _fStatus(m);
  const isOpen = m.is_open || (m.match_type||'').toLowerCase().includes('open') || (m.modality||'').toLowerCase().includes('abierto');
  const sl = slotsInfo(m);
  const cap = _fIsCaptain(m);
  const homeName = (m.home_club_name||m.team_home_name||'Local').toString();
  const awayName = (m.away_club_name||m.team_away_name||(isOpen?'Abierto':'Visitante')).toString();
  const homeLogo = m.home_club_logo||m.home_logo||'';
  const awayLogo = m.away_club_logo||m.away_logo||'';
  const dateStr = m.scheduled_at ? new Date(m.scheduled_at).toLocaleString('es-UY',{weekday:'short',day:'numeric',month:'short'}) : 'Sin fecha';
  const timeStr = m.scheduled_at ? new Date(m.scheduled_at).toLocaleTimeString('es-UY',{hour:'2-digit',minute:'2-digit'}) : '';
  const fmt = m.modality || m.format || (/(5|7|11)/.exec(m.name||'')?.[0]?('Fútbol '+/(5|7|11)/.exec(m.name)[0]):'—');
  const gender = m.gender==='masculino'?'Masculino':m.gender==='femenino'?'Femenino':'Mixto';

  let statusBadge;
  if (s==='en-vivo') statusBadge=`<span style="background:#ff3b3b;color:#fff;font-size:10px;font-weight:900;padding:3px 10px;border-radius:10px;animation:bpPulse 1.4s infinite;">● EN VIVO ${m.live_minute?m.live_minute+"'":''}</span>`;
  else if (s==='finalizado') statusBadge=`<span style="background:#222;color:#999;font-size:10px;font-weight:900;padding:3px 10px;border-radius:10px;">FINALIZADO</span>`;
  else statusBadge=`<span style="background:#00e676;color:#000;font-size:10px;font-weight:900;padding:3px 10px;border-radius:10px;">${isOpen?'ABIERTO':'PRÓXIMO'}</span>`;

  const center = (m.home_score!=null && m.away_score!=null)
    ? `<div style="font-size:40px;font-weight:900;color:#fff;line-height:1;">${m.home_score}<span style="color:var(--accent);margin:0 6px;">-</span>${m.away_score}</div>`
    : `<div style="font-size:26px;font-weight:900;color:var(--accent);">VS</div><div style="font-size:12px;color:#888;margin-top:4px;">${timeStr}</div>`;

  const tabs = [
    ['resumen','Resumen','bx-info-circle'],
    ['timeline','Timeline','bx-time-five'],
    ['jugadores','Jugadores','bx-group'],
    ['stats','Estadísticas','bx-bar-chart-alt-2'],
    ['momentos','Momentos','bx-camera'],
    ['chat','Chat','bx-chat'],
  ];

  modal.innerHTML = `
    <style>#mv2-ficha::-webkit-scrollbar{display:none}</style>
    <!-- Header premium -->
    <div style="background:linear-gradient(160deg,#0e1a0e 0%,#0a0a0a 70%);border-bottom:1px solid #1a1a1a;flex-shrink:0;box-shadow:0 4px 24px rgba(0,0,0,0.5);">
      <div style="display:flex;align-items:center;padding:12px 14px 6px;gap:10px;">
        <button onclick="document.getElementById('mv2-ficha').style.display='none'" style="background:rgba(255,255,255,0.06);border:1px solid #2a2a2a;border-radius:50%;width:38px;height:38px;color:#fff;font-size:18px;cursor:pointer;"><i class='bx bx-arrow-back'></i></button>
        <div style="flex:1;text-align:center;">${statusBadge}</div>
        ${cap?`<button onclick="window._fMenu()" style="background:rgba(255,255,255,0.06);border:1px solid #2a2a2a;border-radius:50%;width:38px;height:38px;color:#fff;font-size:18px;cursor:pointer;"><i class='bx bx-dots-vertical-rounded'></i></button>`:'<div style="width:38px;"></div>'}
      </div>
      <div style="display:flex;align-items:center;padding:6px 18px 12px;gap:14px;">
        <div style="flex:1;text-align:center;">
          <div style="display:flex;justify-content:center;margin-bottom:8px;filter:drop-shadow(0 0 12px rgba(186,255,0,0.25));">${_fShield(homeLogo,homeName,'var(--accent)',62)}</div>
          <div style="color:#fff;font-weight:800;font-size:14px;">${homeName}</div>
        </div>
        <div style="text-align:center;min-width:84px;">${center}</div>
        <div style="flex:1;text-align:center;">
          <div style="display:flex;justify-content:center;margin-bottom:8px;">${_fShield(awayLogo,awayName,'#64b4ff',62)}</div>
          <div style="color:#fff;font-weight:800;font-size:14px;">${awayName}</div>
        </div>
      </div>
      <div style="display:flex;gap:6px;padding:0 14px 12px;overflow-x:auto;">
        ${[[`bx-calendar`,`${dateStr} ${timeStr}`], [`bx-map-pin`,`${m.venue||m.city||'Sin cancha'}`], [`bx-football`,`${fmt}`], [`bx-user`,gender]].map(c=>`<span style="background:rgba(255,255,255,0.06);color:#bbb;font-size:11px;padding:4px 10px;border-radius:12px;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;"><i class='bx ${c[0]}' style="color:var(--accent);"></i>${c[1]}</span>`).join('')}
      </div>
    </div>
    <!-- Tabs -->
    <div style="background:#0d0d0d;display:flex;border-bottom:1px solid #1a1a1a;flex-shrink:0;">
      ${tabs.map(([id,lbl,ic])=>`<button onclick="window._fTab('${id}')" style="flex:1 1 0;min-width:0;padding:9px 2px 7px;background:none;border:none;border-bottom:2px solid ${id===tab?'var(--accent)':'transparent'};color:${id===tab?'var(--accent)':'#777'};font-size:8.5px;font-weight:700;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;"><i class='bx ${ic}' style="font-size:19px;"></i><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">${lbl}</span></button>`).join('')}
    </div>
    <!-- Contenido -->
    <div id="mv2-ftab" style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:calc(140px + env(safe-area-inset-bottom));overscroll-behavior-y:contain;">${_fTabContent(tab)}</div>`;
  if (tab==='resumen' && window._fFillExtras) setTimeout(()=>window._fFillExtras(), 50);
  if (tab==='jugadores') setTimeout(()=>window._fRenderPitch&&window._fRenderPitch(), 50);
  if (tab==='timeline' && window._fChronoRunning && !window._fChronoInt) window._fChronoInt=setInterval(_fChronoTick,1000);
}

// Cancha visual dentro de la ficha (tab Jugadores)
window._fRenderPitch = function(){
  const pe = document.getElementById('vmd-pitch');
  if (!pe || !window.CancheroPitch || !F.m) return;
  const me = window.userData?.email;
  const isPlayer = _fIsCaptain(F.m) || (F.players||[]).some(p=>p.player_email===me);
  CancheroPitch.render(pe, F.m, F.players||[], {
    canJoin: !isPlayer,
    canManage: _fIsCaptain(F.m),
    onJoin: function(team, slotKey){
      if (window.MatchDashboard && MatchDashboard.requestJoin) { MatchDashboard.open(F.id); setTimeout(()=>MatchDashboard.requestJoin(team, slotKey), 900); }
      else if (window.joinOpenMatch) joinOpenMatch(F.id);
    },
    onTapPlayer: function(p){ CancheroPitch.changePosition(p); }
  });
};

function _fShield(logo,name,color,size){
  size=size||62;
  if (logo) return `<img src="${logo}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;background:#0a0a0a;border:2px solid ${color};" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div style="display:none;width:${size}px;height:${size}px;border-radius:50%;background:#0a0a0a;border:2px solid ${color};align-items:center;justify-content:center;font-weight:900;font-size:${size*0.4}px;color:${color};">${(name||'?')[0]}</div>`;
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#0a0a0a;border:2px solid ${color};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:${size*0.4}px;color:${color};">${(name||'?')[0]}</div>`;
}

window._fTab = function(tab){
  const c = document.getElementById('mv2-ftab'); if(!c) return;
  document.querySelectorAll('#mv2-ficha [onclick^="window._fTab"]').forEach(b=>{
    const on = b.getAttribute('onclick').includes(`'${tab}'`);
    b.style.color = on?'var(--accent)':'#888';
    b.style.borderBottom = on?'2px solid var(--accent)':'2px solid transparent';
  });
  c.innerHTML = _fTabContent(tab);
  if (tab==='resumen' && window._fFillExtras) setTimeout(()=>window._fFillExtras(), 50);
  if (tab==='jugadores') setTimeout(()=>window._fRenderPitch&&window._fRenderPitch(), 50);
  if (tab==='timeline' && window._fChronoRunning && !window._fChronoInt) window._fChronoInt=setInterval(_fChronoTick,1000);
};

// Rellena progresión de complejo + resumen de reseñas (async) en la pestaña Resumen
window._fFillExtras = async function(){
  const m = F.m; if (!m) return;
  // Progresión de complejo
  const venue = m.complex_name || m.cancha || m.venue;
  const cp = document.getElementById('f-complex-progress');
  if (cp && venue && window.getComplexProgress){
    try {
      const p = await window.getComplexProgress(venue, 15);
      if (p) cp.innerHTML = `<div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:12px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><span style="font-size:12px;color:#aaa;"><i class='bx bx-building'></i> ${venue}</span><span style="font-size:12px;font-weight:800;color:var(--accent);">${p.played}/${p.goal} partidos</span></div>
        <div style="height:6px;background:#222;border-radius:3px;overflow:hidden;"><div style="height:100%;width:${p.pct}%;background:var(--accent);"></div></div>
        ${p.reward?'<div style="font-size:11px;color:#00e676;margin-top:6px;font-weight:700;">🎁 ¡Objetivo cumplido! Partido gratis disponible.</div>':`<div style="font-size:10px;color:#666;margin-top:6px;">Al llegar a ${p.goal} se desbloquea un beneficio del complejo.</div>`}
      </div>`;
    } catch(e){}
  }
  // Resumen de reseñas
  const rs = document.getElementById('f-reviews-summary');
  if (rs && window.getMatchReviewsSummary){
    try {
      const s = await window.getMatchReviewsSummary(F.id);
      if (s && s.count>0){
        const max = Math.max(...s.dist,1);
        rs.innerHTML = `<div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:14px;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;"><div style="font-size:30px;font-weight:900;color:var(--accent);">${s.avg}</div><div><div style="color:#FFD700;font-size:14px;">${'★'.repeat(Math.round(s.avg))}${'☆'.repeat(5-Math.round(s.avg))}</div><div style="font-size:11px;color:#888;">${s.count} reseña${s.count!==1?'s':''}</div></div></div>
          ${[5,4,3,2,1].map(n=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;"><span style="font-size:10px;color:#888;width:10px;">${n}</span><div style="flex:1;height:5px;background:#222;border-radius:3px;overflow:hidden;"><div style="height:100%;width:${Math.round(s.dist[n-1]/max*100)}%;background:#FFD700;"></div></div><span style="font-size:10px;color:#666;width:16px;">${s.dist[n-1]}</span></div>`).join('')}
        </div>`;
      }
    } catch(e){}
  }
};

function _fTabContent(tab){
  switch(tab){
    case 'timeline': return _ftTimeline();
    case 'jugadores': return _ftJugadores();
    case 'stats': return _ftStats();
    case 'predicciones': return _ftPred();
    case 'momentos': return _ftMomentos();
    case 'chat': return _ftChat();
    default: return _ftResumen();
  }
}

/* ── RESUMEN (con todas las funciones según estado) ── */
function _ftResumen(){
  const m=F.m, id=F.id, s=_fStatus(m), cap=_fIsCaptain(m);
  const isOpen = m.is_open || (m.match_type||'').toLowerCase().includes('open') || (m.modality||'').toLowerCase().includes('abierto');
  const sl = slotsInfo(m);
  const me = window.userData?.email;
  const isPlayer = cap || (F.players||[]).some(p=>p.player_email===me);
  const nm = (m.name||'Partido').replace(/'/g,"\\'");

  const act = (onclick,icon,label,color)=>`<button onclick="${onclick}" style="background:#111;border:1px solid #1f1f1f;border-radius:14px;padding:14px 8px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;color:${color||'#ddd'};"><i class='bx ${icon}' style="font-size:22px;color:${color||'var(--accent)'};"></i><span style="font-size:11px;font-weight:700;">${label}</span></button>`;

  // CTA según estado
  let cta='';
  if (s==='en-vivo' && cap) cta=`<button onclick="window.MatchDashboard&&window.MatchDashboard.open('${id}')" style="width:100%;background:linear-gradient(135deg,#ff3b3b,#c00);border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:900;padding:15px;cursor:pointer;margin-bottom:12px;">⚡ GESTIÓN EN VIVO (gol, asist, tarjeta, MVP)</button>`;
  else if (isOpen && sl.left>0 && !isPlayer) cta=`<button onclick="window.joinOpenMatch&&window.joinOpenMatch('${id}')" style="width:100%;background:var(--accent);color:#000;border:none;border-radius:14px;font-size:15px;font-weight:900;padding:15px;cursor:pointer;margin-bottom:12px;">UNIRME AL PARTIDO (${sl.left} lugar${sl.left!==1?'es':''})</button>`;
  else if (isPlayer && !cap) cta=`<button onclick="window.leaveMatch&&window.leaveMatch('${id}')" style="width:100%;background:rgba(255,68,68,0.08);color:#ff4444;border:1px solid rgba(255,68,68,0.25);border-radius:14px;font-size:13px;font-weight:700;padding:12px;cursor:pointer;margin-bottom:12px;">Salir del partido</button>`;

  return `<div style="padding:16px;">
    ${cta}
    <div id="f-complex-progress"></div>
    ${s==='finalizado'?'<div id="f-reviews-summary"></div>':''}
    <!-- Estado info -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">
      <div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:12px;text-align:center;"><div style="color:#666;font-size:10px;font-weight:700;">CONFIRMADOS</div><div style="color:#fff;font-size:18px;font-weight:900;">${sl.taken}${sl.total?'/'+sl.total:''}</div></div>
      <div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:12px;text-align:center;"><div style="color:#666;font-size:10px;font-weight:700;">LIBRES</div><div style="color:${sl.left>0?'#00e676':'#ff4444'};font-size:18px;font-weight:900;">${sl.left}</div></div>
      <div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:12px;text-align:center;"><div style="color:#666;font-size:10px;font-weight:700;">PRECIO</div><div style="color:#fff;font-size:18px;font-weight:900;">${m.price?'$'+m.price:'Gratis'}</div></div>
    </div>
    <!-- Acciones principales -->
    <div style="font-size:11px;color:#666;font-weight:800;letter-spacing:1px;margin-bottom:8px;">ACCIONES</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px;">
      ${isPlayer?act(`window._fTab&&window._fTab('chat')`,'bx-chat','Chat'):''}
      ${act(`window.CancheroMatchPlayers&&window.CancheroMatchPlayers.openBetModal('${id}','${cap?'captain':isPlayer?'player':'spectator'}')`,'bx-gift','Apuesta','#ffaa00')}
      ${isPlayer?act(`window.CancheroPolls&&window.CancheroPolls.openCreator('match','${id}')`,'bx-poll','Encuesta','#64b4ff'):''}
      ${act(`window.shareMatch&&window.shareMatch('${id}','${nm}','${(m.venue||'').replace(/'/g,"\\'")}','')`,'bx-share-alt','Compartir','#aaa')}
      ${isPlayer?act(`window.CancheroCard&&window.CancheroCard.fromUser()`,'bx-id-card','Mi carta','#ffd700'):''}
      ${act(`window._fCopyInviteLink&&window._fCopyInviteLink()`,'bx-link','Invitar','#00e676')}
    </div>
    <!-- Gestión (capitán) → en el menú "..." de arriba para no saturar -->
    ${cap?`<button onclick="window._fMenu()" style="width:100%;margin-top:6px;background:rgba(186,255,0,0.06);color:var(--accent);border:1px solid rgba(186,255,0,0.25);border-radius:12px;padding:12px;font-weight:800;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;"><i class='bx bx-cog'></i> GESTIONAR PARTIDO</button>`:''}
    <!-- Reseña post-partido -->
    ${s==='finalizado'?`<div style="margin-top:16px;background:#111;border:1px solid #1a1a1a;border-radius:14px;padding:14px;">
      <h4 style="color:#fff;font-size:13px;margin:0 0 10px;">¿Cómo estuvo el partido?</h4>
      <div style="display:flex;justify-content:center;gap:14px;margin-bottom:10px;">${['😤','😐','😊','🔥','🤩'].map((e,i)=>`<button onclick="window._fReview(${i+1},'${e}')" style="font-size:26px;background:none;border:none;cursor:pointer;opacity:.7;">${e}</button>`).join('')}</div>
      <textarea id="f-review" placeholder="Comentario opcional..." style="width:100%;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:8px;color:#fff;font-size:13px;padding:10px;resize:none;height:60px;box-sizing:border-box;"></textarea>
      <button onclick="window._fSubmitReview('${id}')" style="margin-top:8px;width:100%;background:var(--accent);color:#000;border:none;border-radius:12px;font-weight:800;padding:10px;cursor:pointer;">Enviar reseña</button>
    </div>`:''}
  </div>`;
}

/* ── TIMELINE ── */
function _ftTimeline(){
  const ev = F.events||[], m=F.m, cap=_fIsCaptain(m);
  const sc = window._fScore();
  const homeName = m.home_club_name||m.team_home_name||'Local';
  const awayName = m.away_club_name||m.team_away_name||'Visitante';
  const finished = _fStatus(m)==='finalizado';
  const esc = (typeof escudo==='function') ? escudo : (l,n)=>'<div style="width:48px;height:48px;border-radius:50%;background:#0a0a0a;border:1px solid var(--accent);display:flex;align-items:center;justify-content:center;font-weight:900;color:var(--accent);">'+((n||'?')[0])+'</div>';

  // ── MARCADOR ──
  let html = `<div style="padding:16px;">
    <div style="background:linear-gradient(180deg,#0d160d,#0a0a0a);border:1px solid #1f2a1f;border-radius:18px;padding:18px 14px;margin-bottom:14px;">
      <div style="display:flex;align-items:center;justify-content:center;gap:14px;">
        <div style="flex:1;text-align:center;min-width:0;">${esc(m.home_club_logo||m.home_logo||'',homeName)}<div style="font-size:11px;font-weight:800;color:#fff;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${homeName}</div></div>
        <div style="text-align:center;"><div style="font-size:38px;font-weight:900;color:#fff;letter-spacing:2px;line-height:1;">${sc.h}<span style="color:var(--accent);margin:0 6px;">-</span>${sc.a}</div><div id="f-chrono-label" style="font-size:13px;color:var(--accent);margin-top:4px;font-weight:900;letter-spacing:1px;">${window._fChronoText?window._fChronoText():(finished?'FINAL':"0'")}</div></div>
        <div style="flex:1;text-align:center;min-width:0;">${esc(m.away_club_logo||m.away_logo||'',awayName,'#64b4ff')}<div style="font-size:11px;font-weight:800;color:#fff;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${awayName}</div></div>
      </div>`;

  // ── BOTONES CAPITÁN: registrar gol/asistencia ──
  if (cap && !finished) {
    html += `<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;">
        <button onclick="window._fAddEventPrompt('goal')" style="flex:1;min-width:calc(50% - 4px);background:var(--accent);color:#000;border:none;border-radius:10px;padding:10px;font-weight:900;font-size:12px;cursor:pointer;">⚽ Gol</button>
        <button onclick="window._fAddEventPrompt('assist')" style="flex:1;min-width:calc(50% - 4px);background:rgba(186,255,0,0.1);color:var(--accent);border:1px solid rgba(186,255,0,0.35);border-radius:10px;padding:10px;font-weight:800;font-size:12px;cursor:pointer;">🅰️ Asistencia</button>
        <button onclick="window._fAddEventPrompt('card')" style="flex:1;min-width:calc(50% - 4px);background:rgba(255,200,0,0.1);color:#ffc800;border:1px solid rgba(255,200,0,0.35);border-radius:10px;padding:10px;font-weight:800;font-size:12px;cursor:pointer;">🟨 Tarjeta</button>
        <button onclick="window._fAddSubstitution()" style="flex:1;min-width:calc(50% - 4px);background:rgba(100,180,255,0.1);color:#64b4ff;border:1px solid rgba(100,180,255,0.35);border-radius:10px;padding:10px;font-weight:800;font-size:12px;cursor:pointer;"><i class='bx bx-transfer'></i> Cambio</button>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button onclick="window._fChronoToggle()" style="flex:1;background:rgba(255,255,255,0.06);color:#fff;border:1px solid #2a2a2a;border-radius:10px;padding:9px;font-weight:800;font-size:12px;cursor:pointer;"><i class='bx ${window._fChronoRunning?'bx-pause':'bx-play'}'></i> ${window._fChronoRunning?'Pausa':'Iniciar'}</button>
        <button onclick="window._fChronoHalf()" style="flex:1;background:rgba(255,255,255,0.06);color:#fff;border:1px solid #2a2a2a;border-radius:10px;padding:9px;font-weight:800;font-size:12px;cursor:pointer;"><i class='bx bx-time'></i> ½ tiempo</button>
        <button onclick="window._fChronoStop()" style="flex:1;background:rgba(255,68,68,0.1);color:#ff5555;border:1px solid rgba(255,68,68,0.3);border-radius:10px;padding:9px;font-weight:800;font-size:12px;cursor:pointer;"><i class='bx bx-stop'></i> Fin</button>
      </div>
      <button onclick="window._fProposeResult()" style="width:100%;margin-top:8px;background:rgba(255,170,0,0.1);color:#ffaa00;border:1px solid rgba(255,170,0,0.35);border-radius:10px;padding:9px;font-weight:800;font-size:12px;cursor:pointer;"><i class='bx bx-flag'></i> Cerrar y proponer resultado</button>`;
  }
  html += `</div>`;

  // ── MVP ──
  const mvpHome = (ev.find(e=>e.type==='mvp'&&e.team==='home')||{}).player_name || m.mvp_home_name;
  const mvpAway = (ev.find(e=>e.type==='mvp'&&e.team==='away')||{}).player_name || m.mvp_away_name;
  html += `<div style="display:flex;gap:8px;margin-bottom:14px;">
      <div style="flex:1;background:linear-gradient(135deg,rgba(255,215,0,0.08),#0d0d0d);border:1px solid rgba(255,215,0,0.25);border-radius:12px;padding:10px;text-align:center;">
        <div style="font-size:9px;color:#ffd700;font-weight:800;letter-spacing:1px;">⭐ MVP ${homeName}</div>
        <div style="font-size:12px;color:#fff;font-weight:800;margin-top:3px;">${mvpHome||'—'}</div>
        ${cap?`<button onclick="window._fPickMVP('home')" style="margin-top:6px;background:transparent;border:1px solid #333;color:#888;border-radius:14px;padding:4px 10px;font-size:10px;cursor:pointer;">Elegir</button>`:''}
      </div>
      <div style="flex:1;background:linear-gradient(135deg,rgba(255,215,0,0.08),#0d0d0d);border:1px solid rgba(255,215,0,0.25);border-radius:12px;padding:10px;text-align:center;">
        <div style="font-size:9px;color:#ffd700;font-weight:800;letter-spacing:1px;">⭐ MVP ${awayName}</div>
        <div style="font-size:12px;color:#fff;font-weight:800;margin-top:3px;">${mvpAway||'—'}</div>
        ${cap?`<button onclick="window._fPickMVP('away')" style="margin-top:6px;background:transparent;border:1px solid #333;color:#888;border-radius:14px;padding:4px 10px;font-size:10px;cursor:pointer;">Elegir</button>`:''}
      </div>
    </div>`;

  // ── COMPARTIR FICHA ──
  html += `<button onclick="window._fShareFicha()" style="width:100%;margin-bottom:16px;background:rgba(186,255,0,0.08);color:var(--accent);border:1px solid rgba(186,255,0,0.3);border-radius:12px;padding:11px;font-weight:800;cursor:pointer;"><i class='bx bx-share-alt'></i> Compartir ficha en el feed</button>`;

  // ── TIMELINE DE EVENTOS ──
  const ic={goal:'⚽',assist:'🅰️',yellow_card:'🟡',red_card:'🔴',substitution:'🔄',start:'🟢',end:'⏹️',mvp:'⭐'};
  const evShown = ev.filter(e=>e.type!=='mvp');
  if (!evShown.length) {
    html += `<div style="text-align:center;padding:30px 20px;color:#555;"><i class='bx bx-time-five' style="font-size:36px;"></i><p style="margin-top:8px;font-size:13px;">Sin goles ni asistencias todavía.</p>${cap?'<p style="font-size:11px;color:#444;">Usá los botones de arriba para registrarlos.</p>':''}</div>`;
  } else {
    html += `<div style="font-size:10px;color:#666;font-weight:800;letter-spacing:1px;margin-bottom:10px;">DETALLE DEL PARTIDO</div>` + evShown.map(e=>`<div style="display:flex;gap:12px;margin-bottom:12px;align-items:center;">
      <div style="width:34px;text-align:center;flex-shrink:0;">${e.minute?`<div style="color:var(--accent);font-weight:800;font-size:12px;">${e.minute}'</div>`:''}<div style="font-size:17px;">${ic[e.type]||'•'}</div></div>
      <div style="flex:1;background:#111;border:1px solid #1a1a1a;border-radius:10px;padding:9px 12px;display:flex;align-items:center;gap:8px;"><div style="flex:1;min-width:0;"><div style="color:#fff;font-size:13px;font-weight:600;">${e.player_name||e.description||e.type}</div><div style="color:#777;font-size:11px;margin-top:2px;">${(e.type==='goal'?'Gol':e.type==='assist'?'Asistencia':e.type==='substitution'?'Cambio':e.type==='yellow_card'?'Amarilla':e.type==='red_card'?'Roja':e.type)} · ${e.team==='home'?homeName:awayName}</div></div>${(cap&&!finished&&e.id)?`<button onclick="window._fDeleteEvent('${e.id}','${e.type}','${(e.player_email||'').replace(/'/g,'')}')" title="Quitar" style="background:rgba(255,68,68,0.1);border:1px solid rgba(255,68,68,0.3);color:#ff5555;width:30px;height:30px;border-radius:8px;cursor:pointer;flex-shrink:0;"><i class='bx bx-trash'></i></button>`:''}</div>
    </div>`).join('');
  }
  // Reiniciar marcador (capitán, en vivo)
  if (cap && !finished) html += `<button onclick="window._fResetScore()" style="width:100%;margin-top:8px;background:rgba(255,170,0,0.08);color:#ffaa00;border:1px solid rgba(255,170,0,0.3);border-radius:10px;padding:10px;font-weight:800;font-size:12px;cursor:pointer;"><i class='bx bx-reset'></i> Reiniciar partido (marcador + cronómetro)</button>`;
  html += `</div>`;
  return html;
}

// Marcador derivado de los goles registrados
window._fScore = function(){
  const ev=(F.events||[]).filter(e=>e.type==='goal');
  return { h: ev.filter(e=>e.team==='home').length, a: ev.filter(e=>e.team==='away').length };
};

// ── CRONÓMETRO del partido (local) ──
window._fChronoSeconds = window._fChronoSeconds||0;
window._fChronoRunning = false;
window._fChronoText = function(){ var s=window._fChronoSeconds||0; var m=Math.floor(s/60); var ss=s%60; return m+"'"+(ss<10?'0':'')+ss+'"'; };
window._fMatchMinute = 0;
function _fChronoTick(){
  if(!window._fChronoRunning) return;
  window._fChronoSeconds=(window._fChronoSeconds||0)+1;
  window._fMatchMinute=Math.floor(window._fChronoSeconds/60);
  var lbl=document.getElementById('f-chrono-label'); if(lbl) lbl.textContent=window._fChronoText();
}
window._fChronoToggle = function(){
  window._fChronoRunning=!window._fChronoRunning;
  if(window._fChronoRunning){ if(!window._fChronoInt) window._fChronoInt=setInterval(_fChronoTick,1000); }
  if(typeof _renderFicha==='function') _renderFicha('timeline');
};
window._fChronoHalf = function(){
  // Medio tiempo: pausa y fija el reloj en 45'
  window._fChronoRunning=false; window._fChronoSeconds=Math.max(window._fChronoSeconds, 45*60); window._fMatchMinute=Math.floor(window._fChronoSeconds/60);
  if(window.showToast) showToast('Medio tiempo (45\').','info');
  if(typeof _renderFicha==='function') _renderFicha('timeline');
};
window._fChronoStop = function(){
  window._fChronoRunning=false; if(window._fChronoInt){ clearInterval(window._fChronoInt); window._fChronoInt=null; }
  if(typeof _renderFicha==='function') _renderFicha('timeline');
};

// Selector simple de jugador para registrar gol/asistencia
window._fAddEventPrompt = function(type){
  const ps=F.players||[], m=F.m;
  const homeName=m.home_club_name||m.team_home_name||'Local', awayName=m.away_club_name||m.team_away_name||'Visitante';
  const home=ps.filter(p=>p.team==='home'||!p.team), away=ps.filter(p=>p.team==='away');
  const ov=document.createElement('div'); ov.id='f-ev-picker';
  ov.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:16px;';
  const isCard = (type==='card');
  const _avatarHtml=(p)=>p.player_photo?`<img src="${window.avatarUrl?window.avatarUrl(p.player_photo,28):p.player_photo}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;object-position:center 28%;">`:`<div style="width:28px;height:28px;border-radius:50%;background:#1a2a1a;display:flex;align-items:center;justify-content:center;color:var(--accent);font-weight:900;font-size:12px;">${(p.player_name||'?')[0]}</div>`;
  const row=(p,team)=>{
    const em=(p.player_email||'').replace(/'/g,""), nm=(p.player_name||'Jugador').replace(/'/g,"");
    if (isCard){
      // Tarjeta: elegir amarilla o roja para ese jugador.
      return `<div style="display:flex;align-items:center;gap:8px;width:100%;background:#141414;border:1px solid #222;border-radius:10px;padding:9px;margin-bottom:6px;color:#fff;">
        ${_avatarHtml(p)}<span style="flex:1;min-width:0;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.player_name||'Jugador'}</span>
        <button onclick="window._fSaveEvent('yellow_card','${em}','${nm}','${team}')" title="Amarilla" style="width:26px;height:32px;border-radius:5px;background:#ffc800;border:none;cursor:pointer;flex-shrink:0;"></button>
        <button onclick="window._fSaveEvent('red_card','${em}','${nm}','${team}')" title="Roja" style="width:26px;height:32px;border-radius:5px;background:#ff3b30;border:none;cursor:pointer;flex-shrink:0;"></button>
      </div>`;
    }
    return `<button onclick="window._fSaveEvent('${type}','${em}','${nm}','${team}')" style="display:flex;align-items:center;gap:8px;width:100%;text-align:left;background:#141414;border:1px solid #222;border-radius:10px;padding:9px;margin-bottom:6px;cursor:pointer;color:#fff;">${_avatarHtml(p)}<span style="font-size:12px;font-weight:600;">${p.player_name||'Jugador'}</span></button>`;
  };
  const col=(arr,name,team)=>`<div style="flex:1;min-width:0;"><div style="font-size:11px;font-weight:800;color:#aaa;margin-bottom:8px;">${name}</div>${arr.length?arr.map(p=>row(p,team)).join(''):'<div style="color:#555;font-size:11px;">Sin jugadores</div>'}</div>`;
  const _title = type==='goal'?'⚽ ¿Quién hizo el gol?':type==='assist'?'🅰️ ¿Quién dio la asistencia?':'🟨🟥 Tarjeta — elegí jugador y color';
  ov.innerHTML=`<div style="background:#0f110f;border:1px solid #1f2a1f;border-radius:18px;width:100%;max-width:560px;padding:18px;max-height:80vh;overflow-y:auto;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;"><div style="font-size:14px;font-weight:900;">${_title}</div><button onclick="document.getElementById('f-ev-picker').remove()" style="background:rgba(255,255,255,0.06);border:1px solid #333;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;">&times;</button></div>
    <div style="display:flex;gap:14px;">${col(home,homeName,'home')}${col(away,awayName,'away')}</div>
  </div>`;
  ov.onclick=e=>{ if(e.target===ov) ov.remove(); };
  document.body.appendChild(ov);
};

// Quita un evento (gol/asistencia) y revierte la estadística del jugador.
window._fDeleteEvent = async function(eventId, type, email){
  const client = (typeof sb==='function'?sb():window._sb);
  if(!client || !eventId) return;
  if (!confirm('¿Quitar este '+(type==='goal'?'gol':type==='assist'?'asistencia':'evento')+'?')) return;
  try {
    await client.from('match_events').delete().eq('id', eventId);
    F.events = (F.events||[]).filter(e=> String(e.id)!==String(eventId));
    if (email && (type==='goal'||type==='assist')) { try { await window._fBumpStat(email, type==='goal'?'goals':'assists', -1); } catch(e){} }
    if (type==='goal'){ const sc=window._fScore(); try{ await client.from('matches').update({ home_score:sc.h, away_score:sc.a }).eq('id',F.id); F.m.home_score=sc.h; F.m.away_score=sc.a; }catch(e){} }
    if(window.showToast) showToast('Evento quitado.','success');
    if(typeof _renderFichaTab==='function') _renderFichaTab('timeline'); else _renderFicha('timeline');
  } catch(e){ if(window.showToast) showToast('No se pudo quitar.','error'); }
};
// Reinicia el marcador: borra todos los goles/asistencias del partido y revierte stats.
window._fResetScore = async function(){
  const client = (typeof sb==='function'?sb():window._sb);
  if(!client) return;
  if (!confirm('¿Reiniciar TODO el partido? Se borran goles, asistencias, cambios y se reinicia el cronómetro a 0.')) return;
  try {
    // Revertir stats de goles/asistencias del perfil de los jugadores
    const evs = (F.events||[]).filter(e=>e.type==='goal'||e.type==='assist');
    for (const e of evs){ if (e.player_email) { try { await window._fBumpStat(e.player_email, e.type==='goal'?'goals':'assists', -1); } catch(_){} } }
    // Borrar TODOS los eventos del partido (goles, asistencias, cambios, mvp, etc.)
    await client.from('match_events').delete().eq('match_id', F.id);
    F.events = [];
    // Reset del marcador
    try{ await client.from('matches').update({ home_score:0, away_score:0 }).eq('id',F.id); F.m.home_score=0; F.m.away_score=0; }catch(e){}
    // Reset del CRONÓMETRO (antes no se reiniciaba: el tiempo seguía corriendo)
    window._fChronoRunning = false;
    if (window._fChronoInt){ clearInterval(window._fChronoInt); window._fChronoInt = null; }
    window._fChronoSeconds = 0;
    window._fMatchMinute = 0;
    var lbl = document.getElementById('f-chrono-label'); if (lbl) lbl.textContent = window._fChronoText ? window._fChronoText() : "0'00\"";
    if(window.showToast) showToast('Partido reiniciado (marcador y cronómetro en 0).','success');
    if(typeof _renderFichaTab==='function') _renderFichaTab('timeline'); else _renderFicha('timeline');
  } catch(e){ if(window.showToast) showToast('No se pudo reiniciar.','error'); }
};

// Suma (o resta) a una estadística del jugador en users.stats. delta por defecto +1.
// Con RLS activo usa la RPC SECURITY DEFINER bump_player_event (validada por capitán);
// si la RPC no existe todavía (SQL no corrido), cae a update directo.
window._fBumpStat = async function(email, field, delta){
  delta = (typeof delta==='number') ? delta : 1;
  const client = (typeof sb==='function'?sb():window._sb);
  if(!client || !email || !field) return;
  if ((field==='goals'||field==='assists') && F && F.id) {
    try {
      const { error } = await client.rpc('bump_player_event', { p_match_id: F.id, p_email: email, p_field: field, p_delta: delta });
      if (!error) return; // RPC ok
    } catch(e){ /* RPC inexistente → fallback */ }
  }
  try{
    const { data:u } = await client.from('users').select('stats').eq('email', email).maybeSingle();
    const st = (u && u.stats) || {};
    st[field] = Math.max(0, (st[field]||0) + delta);
    await client.from('users').update({ stats: st }).eq('email', email);
  }catch(e){ console.warn('bumpStat', e); }
  // La valoracion se gana jugando: cada gol/asistencia/partido la recalcula.
  // Solo sube (ver docs/rating-system.md).
  try { if (window.CancheroRating) await window.CancheroRating.sincronizar(email); } catch(e){}
};

window._fSaveEvent = async function(type, email, name, team){
  const picker=document.getElementById('f-ev-picker'); if(picker) picker.remove();
  const client = (typeof sb==='function'?sb():window._sb);
  if(!client){ if(window.showToast) showToast('Sin conexión.','error'); return; }
  const minute = (typeof window._fMatchMinute==='number' && window._fMatchMinute>0) ? window._fMatchMinute : null;
  const row={ match_id:F.id, type, player_email:email||null, player_name:name||'Jugador', team, minute };
  try {
    const { data, error } = await client.from('match_events').insert(row).select().single();
    if(error) throw error;
    F.events=[...(F.events||[]), data||row];
    // Actualizar marcador del partido si es gol
    if(type==='goal'){ const sc=window._fScore(); try{ await client.from('matches').update({ home_score:sc.h, away_score:sc.a }).eq('id',F.id); F.m.home_score=sc.h; F.m.away_score=sc.a; }catch(e){} }
    // Sumar la estadística al PERFIL del jugador (goles/asistencias) — antes no se sumaba
    if(email && (type==='goal'||type==='assist')){ try{ await window._fBumpStat(email, type==='goal'?'goals':'assists'); }catch(e){} }
    if(window.showToast) showToast(type==='goal'?'¡Gol registrado!':'¡Asistencia registrada!','success');
    if(typeof _renderFichaTab==='function') _renderFichaTab('timeline'); else _renderFicha('timeline');
  } catch(e){ console.error('saveEvent',e); if(window.showToast) showToast('No se pudo registrar (¿permisos?).','error'); }
};

// ── SUSTITUCIÓN: elegir equipo → sale X (titular) → entra Y (banco) ──
window._fAddSubstitution = function(){
  const ps = F.players || [], m = F.m;
  const homeName = m.home_club_name || m.team_home_name || 'Local';
  const awayName = m.away_club_name || m.team_away_name || 'Visitante';
  const ov = document.createElement('div'); ov.id = 'f-sub-picker';
  ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:16px;';
  ov.innerHTML = `<div style="background:#0f110f;border:1px solid #1f2a1f;border-radius:18px;width:100%;max-width:520px;padding:18px;max-height:80vh;overflow-y:auto;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
      <div style="font-size:14px;font-weight:900;color:#64b4ff;"><i class='bx bx-transfer'></i> Registrar cambio</div>
      <button onclick="document.getElementById('f-sub-picker').remove()" style="background:rgba(255,255,255,0.06);border:1px solid #333;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;">&times;</button>
    </div>
    <div style="font-size:11px;color:#aaa;margin-bottom:10px;">1. Elegí el equipo del cambio:</div>
    <div style="display:flex;gap:8px;margin-bottom:14px;">
      <button onclick="window._fSubPickTeam('home')" style="flex:1;background:rgba(186,255,0,0.1);color:var(--accent);border:1px solid rgba(186,255,0,0.35);border-radius:10px;padding:10px;font-weight:800;font-size:12px;cursor:pointer;">${homeName}</button>
      <button onclick="window._fSubPickTeam('away')" style="flex:1;background:rgba(100,180,255,0.1);color:#64b4ff;border:1px solid rgba(100,180,255,0.35);border-radius:10px;padding:10px;font-weight:800;font-size:12px;cursor:pointer;">${awayName}</button>
    </div>
    <div id="f-sub-step2"></div>
  </div>`;
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  document.body.appendChild(ov);
};

window._fSubPickTeam = function(team){
  const ps = F.players || [];
  const titulares = ps.filter(p => (p.team || 'home') === team && !p.is_sub && ['confirmado','accepted','aceptado','titular'].includes(p.status || 'confirmado'));
  const suplentes = ps.filter(p => (p.team || 'home') === team && p.is_sub);
  const box = document.getElementById('f-sub-step2'); if (!box) return;
  const card = (p, kind) => `<button onclick="window._fSubPickPlayer('${kind}','${p.id}','${(p.player_email||'').replace(/'/g,'')}','${(p.player_name||'Jugador').replace(/'/g,'')}','${team}')" style="display:flex;align-items:center;gap:8px;width:100%;text-align:left;background:#141414;border:1px solid #222;border-radius:10px;padding:9px;margin-bottom:6px;cursor:pointer;color:#fff;">
    ${p.player_photo?`<img src="${window.avatarUrl?window.avatarUrl(p.player_photo,28):p.player_photo}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;object-position:center 28%;">`:`<div style="width:28px;height:28px;border-radius:50%;background:#1a2a1a;display:flex;align-items:center;justify-content:center;color:var(--accent);font-weight:900;font-size:12px;">${(p.player_name||'?')[0]}</div>`}
    <span style="font-size:12px;font-weight:600;flex:1;">${p.player_name||'Jugador'}</span>
    <span style="font-size:10px;color:#666;">${p.position||''}</span>
  </button>`;
  box.innerHTML = `<div style="display:flex;gap:14px;">
    <div style="flex:1;min-width:0;">
      <div style="font-size:11px;font-weight:800;color:#ff8a5b;margin-bottom:8px;">SALE (titular) ↑</div>
      ${titulares.length?titulares.map(p=>card(p,'out')).join(''):'<div style="color:#555;font-size:11px;">Sin titulares.</div>'}
    </div>
    <div style="flex:1;min-width:0;">
      <div style="font-size:11px;font-weight:800;color:#00e676;margin-bottom:8px;">ENTRA (banco) ↓</div>
      ${suplentes.length?suplentes.map(p=>card(p,'in')).join(''):'<div style="color:#555;font-size:11px;">Sin suplentes en el banco.</div>'}
    </div>
  </div>
  <div id="f-sub-selected" style="margin-top:14px;padding:10px;background:#0a0a0a;border:1px solid #1a1a1a;border-radius:10px;font-size:11px;color:#888;">Elegí 1 que sale y 1 que entra para confirmar.</div>`;
  window._fSubSel = { team, out: null, in: null };
};

window._fSubPickPlayer = function(kind, id, email, name, team){
  if (!window._fSubSel || window._fSubSel.team !== team) window._fSubSel = { team, out: null, in: null };
  window._fSubSel[kind] = { id, email, name };
  const box = document.getElementById('f-sub-selected'); if (!box) return;
  const s = window._fSubSel;
  if (s.out && s.in) {
    box.innerHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="color:#ff8a5b;font-weight:800;">↑ ${s.out.name}</span>
        <i class='bx bx-transfer' style="color:#64b4ff;"></i>
        <span style="color:#00e676;font-weight:800;">↓ ${s.in.name}</span>
      </div>
      <button onclick="window._fSaveSubstitution()" style="width:100%;background:#64b4ff;color:#000;border:none;border-radius:10px;padding:11px;font-weight:900;font-size:13px;cursor:pointer;"><i class='bx bx-check'></i> CONFIRMAR CAMBIO</button>`;
  } else {
    const parts = [];
    if (s.out) parts.push(`<span style="color:#ff8a5b;">↑ Sale: <b>${s.out.name}</b></span>`);
    if (s.in) parts.push(`<span style="color:#00e676;">↓ Entra: <b>${s.in.name}</b></span>`);
    box.innerHTML = parts.length ? parts.join(' · ') : 'Elegí 1 que sale y 1 que entra para confirmar.';
  }
};

window._fSaveSubstitution = async function(){
  const s = window._fSubSel; if (!s || !s.out || !s.in) return;
  const client = (typeof sb==='function'?sb():window._sb);
  if (!client) { if (window.showToast) showToast('Sin conexión.','error'); return; }
  // Minuto: usa el cronómetro si está corriendo; sino, derivar de started_at o pedir al usuario.
  let minute = (typeof window._fMatchMinute==='number' && window._fMatchMinute>0) ? window._fMatchMinute : null;
  if (minute == null && F.m && F.m.started_at) {
    minute = Math.max(1, Math.floor((Date.now() - new Date(F.m.started_at).getTime()) / 60000));
  }
  if (minute == null) {
    const ask = prompt('Minuto del cambio (ej. 60):', '60');
    minute = parseInt(ask) || null;
  }
  try {
    const row = {
      match_id: F.id, type: 'substitution', team: s.team, minute,
      player_email: s.in.email || null, player_name: s.in.name,
      description: 'Sale ' + s.out.name + ' · Entra ' + s.in.name
    };
    const { data } = await client.from('match_events').insert(row).select().single();
    F.events = [...(F.events||[]), data || row];
    // Intercambiar is_sub en match_players (titular ↔ banco)
    try {
      await client.from('match_players').update({ is_sub: true }).eq('id', s.out.id);
      await client.from('match_players').update({ is_sub: false }).eq('id', s.in.id);
      (F.players||[]).forEach(p => {
        if (String(p.id) === String(s.out.id)) p.is_sub = true;
        if (String(p.id) === String(s.in.id)) p.is_sub = false;
      });
    } catch(e) { console.warn('swap is_sub', e); }
    if (window.showToast) showToast('Cambio registrado.','success');
    document.getElementById('f-sub-picker')?.remove();
    window._fSubSel = null;
    if (typeof _renderFichaTab==='function') _renderFichaTab('timeline'); else if (typeof _renderFicha==='function') _renderFicha('timeline');
  } catch(e) {
    console.error('saveSub', e);
    if (window.showToast) showToast('No se pudo registrar el cambio.','error');
  }
};

window._fPickMVP = function(team){
  const ps=(F.players||[]).filter(p=>team==='home'?(p.team==='home'||!p.team):p.team==='away');
  const ov=document.createElement('div'); ov.id='f-mvp-picker';
  ov.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:16px;';
  ov.innerHTML=`<div style="background:#0f110f;border:1px solid #1f2a1f;border-radius:18px;width:100%;max-width:560px;padding:18px;max-height:75vh;overflow-y:auto;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;"><div style="font-size:14px;font-weight:900;">⭐ Elegí el MVP</div><button onclick="document.getElementById('f-mvp-picker').remove()" style="background:rgba(255,255,255,0.06);border:1px solid #333;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;">&times;</button></div>
    ${ps.length?ps.map(p=>`<button onclick="window._fSaveMVP('${team}','${(p.player_email||'').replace(/'/g,"")}','${(p.player_name||'Jugador').replace(/'/g,"")}')" style="display:flex;align-items:center;gap:8px;width:100%;text-align:left;background:#141414;border:1px solid #222;border-radius:10px;padding:10px;margin-bottom:6px;cursor:pointer;color:#fff;">${p.player_photo?`<img src="${window.avatarUrl?window.avatarUrl(p.player_photo,30):p.player_photo}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;object-position:center 28%;">`:`<div style="width:30px;height:30px;border-radius:50%;background:#1a2a1a;display:flex;align-items:center;justify-content:center;color:var(--accent);font-weight:900;">${(p.player_name||'?')[0]}</div>`}<span style="font-size:13px;font-weight:700;">${p.player_name||'Jugador'}</span></button>`).join(''):'<div style="color:#555;font-size:12px;padding:10px;">Sin jugadores en este equipo.</div>'}
  </div>`;
  ov.onclick=e=>{ if(e.target===ov) ov.remove(); };
  document.body.appendChild(ov);
};

window._fSaveMVP = async function(team, email, name){
  const picker=document.getElementById('f-mvp-picker'); if(picker) picker.remove();
  const client = (typeof sb==='function'?sb():window._sb); if(!client) return;
  try {
    // Quitar MVP previo de ese equipo y guardar el nuevo como evento
    F.events=(F.events||[]).filter(e=>!(e.type==='mvp'&&e.team===team));
    const row={ match_id:F.id, type:'mvp', player_email:email||null, player_name:name, team };
    const { data } = await client.from('match_events').insert(row).select().single();
    F.events.push(data||row);
    if(window.showToast) showToast('MVP elegido: '+name,'success');
    _renderFicha('timeline');
  } catch(e){ if(window.showToast) showToast('No se pudo guardar el MVP.','error'); }
};

window._fProposeResult = async function(){
  const sc=window._fScore();
  if(!confirm('¿Cerrar el partido con el resultado '+sc.h+' - '+sc.a+'? Se suman los partidos/estadísticas a los perfiles y el rival será notificado.')) return;
  const client=(typeof sb==='function'?sb():window._sb); if(!client) return;
  try {
    await client.from('matches').update({ home_score:sc.h, away_score:sc.a, status:'finished', result_proposed_by:(window.userData||{}).email||null }).eq('id',F.id);
    F.m.status='finished'; F.m.home_score=sc.h; F.m.away_score=sc.a;
    // ── Propagar PJ / V / E / D / GF / GC a perfiles de jugadores y clubes ──
    try { await window._fPropagateStats(sc); } catch(e){ console.warn('propagate stats', e); }
    // Notificar al rival
    const rival = (F.m.captain_away_email && F.m.captain_away_email!==(window.userData||{}).email) ? F.m.captain_away_email : F.m.captain_home_email;
    if(rival && window.CancheroNotif) CancheroNotif.create(rival,'match_result',(window.userData||{}).name||'Canchero','Se cerró el partido '+sc.h+'-'+sc.a+'. Revisá la ficha y confirmá el resultado.');
    if(window.showToast) showToast('Partido cerrado y estadísticas sumadas a los perfiles.','success');
    _renderFicha('timeline');
  } catch(e){ if(window.showToast) showToast('No se pudo cerrar el partido.','error'); }
};

// Propaga partidos jugados + resultado (V/E/D) + GF/GC a cada jugador y a los clubes.
// Guardia: marca matches.stats_propagated=true para no contar dos veces.
window._fPropagateStats = async function(sc){
  const client=(typeof sb==='function'?sb():window._sb); if(!client) return;
  // Evitar doble propagación
  if (F.m && F.m.stats_propagated) return;
  try { await client.from('matches').update({ stats_propagated:true }).eq('id', F.id); } catch(e){ /* la columna puede no existir; seguimos igual */ }
  if (F.m) F.m.stats_propagated = true;

  const hs = sc.h, as = sc.a;
  const homeRes = hs>as?'w':hs<as?'l':'e';
  const awayRes = as>hs?'w':as<hs?'l':'e';

  // Jugadores confirmados por equipo
  const players = (F.players||[]).filter(p => ['confirmado','accepted','aceptado','titular'].includes(p.status||'confirmado') || p.is_sub);
  for (const p of players){
    if (!p.player_email) continue;
    const team = p.team || 'home';
    const res = team==='home' ? homeRes : awayRes;
    const gf = team==='home' ? hs : as;
    const gc = team==='home' ? as : hs;
    const posStr = (p.position||p.position_slot||'').toString().toUpperCase();
    const isGk = posStr.startsWith('ARQ')||posStr.startsWith('GK')||posStr.startsWith('POR');
    // 1) RPC SECURITY DEFINER (sobrevive al RLS)
    let viaRpc = false;
    try {
      const { error } = await client.rpc('bump_player_match_stats', { p_match_id: F.id, p_email: p.player_email, p_result: res, p_gf: gf, p_gc: gc, p_is_gk: isGk });
      if (!error) viaRpc = true;
    } catch(e){ /* fallback */ }
    if (viaRpc) continue;
    // 2) Fallback update directo (sin RLS aún)
    try {
      const { data:u } = await client.from('users').select('stats').eq('email', p.player_email).maybeSingle();
      const st = (u && u.stats) || {};
      st.matches = (st.matches||st.partidos||0) + 1;
      st.partidos = st.matches;
      if (res==='w') st.wins = (st.wins||0)+1;
      else if (res==='e') st.draws = (st.draws||0)+1;
      else st.losses = (st.losses||0)+1;
      st.goals_for = (st.goals_for||0) + gf;
      st.goals_against = (st.goals_against||0) + gc;
      if (gc===0 && isGk) st.clean_sheets = (st.clean_sheets||0)+1;
      await client.from('users').update({ stats: st }).eq('email', p.player_email);
    } catch(e){ console.warn('player stat', p.player_email, e); }
  }

  // ── RACHA DE PARTIDOS (15 = partido gratis) ──
  // Registrar asistencia de cada jugador en este complejo y chequear el objetivo.
  const _complexName = (F.m && (F.m.complex_name || F.m.cancha || F.m.venue)) || null;
  if (_complexName) {
    for (const p of players) {
      if (!p.player_email) continue;
      try {
        await client.from('match_attendance').insert({
          user_email: p.player_email,
          user_name: p.player_name || (p.player_email||'').split('@')[0],
          complex_name: _complexName,
          match_id: F.id,
          created_at: new Date().toISOString()
        });
      } catch(e){ /* columna/tabla puede no existir o duplicado; seguimos */ }
      try { if (window._checkDuolingoStreak) await window._checkDuolingoStreak(p.player_email, p.player_name || '', _complexName); } catch(e){}
    }
  }

  // Clubes (si el partido es club vs club)
  const clubPairs = [ [F.m.home_club_id, homeRes, hs, as], [F.m.away_club_id, awayRes, as, hs] ];
  for (const [cid, res, gf, gc] of clubPairs){
    if (!cid) continue;
    let viaRpc = false;
    try {
      const { error } = await client.rpc('bump_club_match_stats', { p_club_id: cid, p_result: res, p_gf: gf, p_gc: gc });
      if (!error) viaRpc = true;
    } catch(e){ /* fallback */ }
    if (viaRpc) continue;
    try {
      const { data:c } = await client.from('clubs').select('stats').eq('id', cid).maybeSingle();
      const st = (c && c.stats) || {};
      st.pj = (st.pj||0)+1;
      if (res==='w') st.w = (st.w||0)+1;
      else if (res==='e') st.e = (st.e||0)+1;
      else st.l = (st.l||0)+1;
      st.gf = (st.gf||0)+gf;
      st.gc = (st.gc||0)+gc;
      st.pts = (st.w||0)*3 + (st.e||0);
      await client.from('clubs').update({ stats: st }).eq('id', cid);
    } catch(e){ console.warn('club stat', cid, e); }
  }
};

window._fShareFicha = function(){
  const m=F.m, sc=window._fScore();
  const homeName=m.home_club_name||m.team_home_name||'Local', awayName=m.away_club_name||m.team_away_name||'Visitante';
  const goles=(F.events||[]).filter(e=>e.type==='goal').map(e=>e.player_name).filter(Boolean);
  const mvpH=(F.events||[]).find(e=>e.type==='mvp'&&e.team==='home'); const mvpA=(F.events||[]).find(e=>e.type==='mvp'&&e.team==='away');
  let txt='⚽ '+homeName+' '+sc.h+' - '+sc.a+' '+awayName;
  if(goles.length) txt+='\n🥅 Goles: '+goles.join(', ');
  if(mvpH||mvpA) txt+='\n⭐ MVP: '+[mvpH&&mvpH.player_name, mvpA&&mvpA.player_name].filter(Boolean).join(' / ');
  txt+='\n\nvía Canchero';
  if(window.createPostFromText) { window.createPostFromText(txt); if(window.showToast) showToast('Ficha compartida en el feed.','success'); }
  else if(navigator.share){ navigator.share({text:txt}).catch(()=>{}); }
  else if(window.showToast){ try{navigator.clipboard.writeText(txt);}catch(e){} showToast('Ficha copiada. Pegala en tu feed.','success'); }
};

// Link de invitación universal: cualquiera (aunque no tenga cuenta) abre la ficha y se suma.
window._fCopyInviteLink = async function(){
  const id = F.id; if(!id) return;
  const base = (location.origin && location.origin.indexOf('http')===0) ? location.origin : 'https://canchero-app.vercel.app';
  const url = base + '/?invite=' + encodeURIComponent(id);
  const m = F.m||{};
  const txt = '⚽ Te invito a jugar' + (m.name?(' "'+m.name+'"'):'') + ' en Canchero. Sumate acá: ' + url;
  try {
    if (navigator.share){ await navigator.share({ title:'Partido en Canchero', text:txt, url }); return; }
  } catch(e){}
  try { await navigator.clipboard.writeText(url); if(window.showToast) showToast('Link de invitación copiado. ¡Pegalo en WhatsApp!','success'); }
  catch(e){ if(window.showToast) showToast(url,'info'); }
};

// Invitar jugadores: buscador simple → match_invites + notificación (acepta/rechaza en Mis Partidos > Invitados)
window._fInvitePlayers = function(){
  const ov=document.createElement('div'); ov.id='f-invite-modal';
  ov.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:16px;';
  ov.innerHTML=`<div style="background:#0f110f;border:1px solid #1f2a1f;border-radius:18px;width:100%;max-width:480px;padding:18px;max-height:80vh;display:flex;flex-direction:column;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;"><div style="font-size:14px;font-weight:900;">Invitar jugadores</div><button onclick="document.getElementById('f-invite-modal').remove()" style="background:rgba(255,255,255,0.06);border:1px solid #333;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;">&times;</button></div>
    <input id="f-invite-search" placeholder="Buscar por nombre o @usuario..." oninput="window._fInviteSearch(this.value)" style="width:100%;background:#141414;border:1px solid #2a2a2a;border-radius:10px;padding:10px 12px;color:#fff;font-size:13px;outline:none;margin-bottom:10px;">
    <div id="f-invite-results" style="overflow-y:auto;flex:1;"><div style="color:#555;font-size:12px;text-align:center;padding:20px;">Escribí para buscar jugadores.</div></div>
  </div>`;
  ov.onclick=e=>{ if(e.target===ov) ov.remove(); };
  document.body.appendChild(ov);
};
window._fInviteSearch = async function(q){
  const box=document.getElementById('f-invite-results'); if(!box) return;
  q=(q||'').trim(); if(q.length<2){ box.innerHTML='<div style="color:#555;font-size:12px;text-align:center;padding:20px;">Escribí al menos 2 letras.</div>'; return; }
  const client=(typeof sb==='function'?sb():window._sb); if(!client) return;
  box.innerHTML='<div style="text-align:center;padding:16px;color:#555;"><i class="bx bx-loader-alt bx-spin"></i></div>';
  try{
    const { data: us } = await client.from('users').select('email,name,photo,pos').or(`name.ilike.%${q}%,email.ilike.%${q}%`).limit(20);
    if(!us||!us.length){ box.innerHTML='<div style="color:#555;font-size:12px;text-align:center;padding:20px;">Sin resultados.</div>'; return; }
    box.innerHTML=us.map(u=>`<button onclick="window._fSendInvite('${(u.email||'').replace(/'/g,"")}','${(u.name||'').replace(/'/g,"")}')" style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:#141414;border:1px solid #222;border-radius:10px;padding:9px;margin-bottom:6px;cursor:pointer;color:#fff;">${u.photo?`<img src="${u.photo}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;">`:`<div style="width:34px;height:34px;border-radius:50%;background:#1a2a1a;display:flex;align-items:center;justify-content:center;color:var(--accent);font-weight:900;">${(u.name||'?')[0]}</div>`}<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:700;">${u.name||'Jugador'}</div><div style="font-size:10px;color:#666;">${u.pos||''}</div></div><i class='bx bx-user-plus' style="color:var(--accent);font-size:18px;"></i></button>`).join('');
  }catch(e){ box.innerHTML='<div style="color:#f44;font-size:12px;text-align:center;padding:20px;">Error buscando.</div>'; }
};
window._fSendInvite = async function(email,name){
  const client=(typeof sb==='function'?sb():window._sb); if(!client||!email) return;
  const me=window.userData||{};
  try{
    try{ await client.from('match_invites').insert({ match_id:F.id, to_email:email, from_email:me.email, from_name:me.name||me.email, status:'pendiente' }); }
    catch(_e){ await client.from('match_players').insert({ match_id:F.id, player_email:email, player_name:name||email, status:'invitado' }); }
    if(window.CancheroNotif) CancheroNotif.create(email,'match_invite',me.name||me.email,'⚽ '+(me.name||'Un capitán')+' te invitó a un partido. Mirá la ficha y aceptá o rechazá.',F.id);
    if(window.showToast) showToast('Invitación enviada a '+(name||email),'success');
  }catch(e){ if(window.showToast) showToast('No se pudo invitar.','error'); }
};

// Abrir las solicitudes recibidas del partido en estilo Tinder (modal)
window._fOpenRequests = function(){
  const ov=document.createElement('div'); ov.id='f-reqs-modal';
  ov.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.9);display:flex;flex-direction:column;';
  ov.innerHTML=`<div style="display:flex;align-items:center;gap:10px;padding:14px 16px;">
      <button onclick="document.getElementById('f-reqs-modal').remove()" style="background:rgba(255,255,255,0.08);border:none;color:#fff;width:38px;height:38px;border-radius:50%;font-size:20px;cursor:pointer;"><i class='bx bx-arrow-back'></i></button>
      <div style="font-size:15px;font-weight:900;">Solicitudes recibidas</div>
    </div>
    <div id="tinder-requests-container" style="flex:1;overflow-y:auto;padding:0 16px 24px;"></div>`;
  document.body.appendChild(ov);
  if(window.renderMatchRequestsTinder) window.renderMatchRequestsTinder(F.id);
};

// Crear un club con los jugadores del equipo del partido
window._fCreateClubFromMatch = function(team){
  const ps=(F.players||[]).filter(p=>team==='home'?(p.team==='home'||!p.team):p.team==='away');
  if(!ps.length){ if(window.showToast) showToast('No hay jugadores para armar el club.','warning'); return; }
  window._pendingClubMembers = ps.map(p=>({ email:p.player_email, name:p.player_name }));
  if(window.openClubCreator) { window.openClubCreator(); if(window.showToast) showToast('Completá el nombre y escudo. Los jugadores quedan precargados.','info'); }
  else if(window.switchDashboardTab){ window.switchDashboardTab('jugador','mis-clubes',null); if(window.showToast) showToast('Creá tu club y sumá a estos jugadores.','info'); }
};

/* ── JUGADORES ── */
function _ftJugadores(){
  const ps=F.players||[], m=F.m, cap=_fIsCaptain(m);
  const home=ps.filter(p=>p.team==='home'||!p.team), away=ps.filter(p=>p.team==='away');
  const col=(arr,name,color)=>`<div style="flex:1;"><div style="color:${color};font-weight:800;font-size:12px;margin-bottom:8px;">${name} (${arr.length})</div>${arr.length?arr.map(p=>{const em=(p.player_email||'').replace(/'/g,"\\'");const nm=(p.player_name||'Jugador').replace(/'/g,"\\'");const avail=p.available||p.isAvailable||p.is_available;return `<div onclick="window.openPlayerActions&&window.openPlayerActions('${em}','${nm}')" style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #161616;cursor:pointer;"><div style="position:relative;width:30px;height:30px;flex-shrink:0;">${p.player_photo?`<img src="${p.player_photo}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;">`:`<div style="width:30px;height:30px;border-radius:50%;background:#1a2a1a;display:flex;align-items:center;justify-content:center;font-weight:900;color:${color};font-size:12px;">${(p.player_name||'?')[0]}</div>`}${window.playerAvailDot?window.playerAvailDot(avail):''}</div><div style="font-size:12px;color:#ddd;">${p.player_name||'Jugador'}${p.is_captain?' ⭐':''}</div></div>`;}).join(''):'<div style="color:#444;font-size:11px;padding:8px 0;">Sin jugadores</div>'}</div>`;
  const totalSlots = slotsInfo(m).total || 0;
  const faltan = totalSlots ? Math.max(0, totalSlots - ps.length) : 0;
  const isFinished = _fStatus(m)==='finalizado';
  return `<div style="padding:16px;">
    ${faltan>0?`<div style="background:rgba(255,170,0,0.08);border:1px solid rgba(255,170,0,0.3);color:#ffaa00;border-radius:12px;padding:10px 12px;margin-bottom:12px;font-size:12px;font-weight:800;text-align:center;"><i class='bx bx-error-circle'></i> Falta${faltan!==1?'n':''} ${faltan} jugador${faltan!==1?'es':''} para completar</div>`:''}
    ${cap?(()=>{ const pend=(F.players||[]).filter(p=>(p.status||'').toLowerCase()==='pendiente').length; return `<div style="display:flex;gap:8px;margin-bottom:10px;">
      <button onclick="window._fInvitePlayers&&window._fInvitePlayers()" style="flex:1;background:var(--accent);color:#000;border:none;border-radius:12px;padding:11px;font-weight:900;cursor:pointer;"><i class='bx bx-user-plus'></i> Invitar jugadores</button>
      <button onclick="window.CancheroMatchPlayers&&window.CancheroMatchPlayers.openPlayersPanel('${F.id}')" style="flex:1;background:rgba(186,255,0,0.08);color:var(--accent);border:1px solid rgba(186,255,0,0.3);border-radius:12px;padding:11px;font-weight:800;cursor:pointer;"><i class='bx bx-user-pin'></i> Gestionar</button>
    </div>
    <button onclick="window._fOpenRequests&&window._fOpenRequests()" style="width:100%;background:${pend>0?'rgba(255,170,0,0.12)':'rgba(255,255,255,0.04)'};color:${pend>0?'#ffaa00':'#888'};border:1px solid ${pend>0?'rgba(255,170,0,0.4)':'#2a2a2a'};border-radius:12px;padding:11px;font-weight:800;cursor:pointer;margin-bottom:14px;display:flex;align-items:center;justify-content:center;gap:8px;"><i class='bx bx-user-voice'></i> Solicitudes recibidas ${pend>0?`<span style="background:#ffaa00;color:#000;border-radius:10px;padding:1px 8px;font-size:11px;font-weight:900;">${pend}</span>`:'(0)'}</button>`; })():''}
    ${cap&&isFinished?`<button onclick="window._fCreateClubFromMatch&&window._fCreateClubFromMatch('home')" style="width:100%;background:rgba(100,180,255,0.1);color:#64b4ff;border:1px solid rgba(100,180,255,0.3);border-radius:12px;padding:11px;font-weight:800;cursor:pointer;margin-bottom:14px;"><i class='bx bx-shield-plus'></i> Crear club con estos jugadores</button>`:''}
    <div style="background:#0d0f0d;border:1px solid #1c1c1c;border-radius:16px;padding:12px;margin-bottom:16px;">
      <div style="font-size:10px;color:#666;font-weight:900;letter-spacing:1.5px;margin-bottom:10px;">⚽ CANCHA Y POSICIONES <span style="font-weight:700;color:#444;letter-spacing:0;">· tocá un jugador para cambiar su posición</span></div>
      <div data-pitch data-team="home" id="vmd-pitch"></div>
    </div>
    <div style="display:flex;gap:16px;">${col(home,m.home_club_name||m.team_home_name||'LOCAL','var(--accent)')}${col(away,m.away_club_name||m.team_away_name||'VISITANTE','#64b4ff')}</div>
  </div>`;
}

/* ── ESTADÍSTICAS ── */
function _ftStats(){
  const ev=F.events||[], m=F.m;
  const g=ev.filter(e=>e.type==='goal');
  const hg=g.filter(e=>e.team==='home').length, ag=g.filter(e=>e.team==='away').length;
  const row=(label,h,a)=>{const t=(h+a)||1;return `<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;font-size:12px;color:#ccc;margin-bottom:4px;"><span style="font-weight:800;">${h}</span><span style="color:#666;">${label}</span><span style="font-weight:800;">${a}</span></div><div style="display:flex;gap:3px;height:5px;"><div style="flex:${h};background:var(--accent);border-radius:3px;"></div><div style="flex:${a};background:#64b4ff;border-radius:3px;"></div></div></div>`;};
  // Listado de goleadores y asistidores con minuto
  const evList=(t)=>ev.filter(e=>e.type===t);
  const scorerLine=(e)=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #161616;font-size:12px;"><span style="font-size:14px;">${e.type==='goal'?'⚽':'🅰️'}</span><span style="flex:1;color:#fff;font-weight:600;">${e.player_name||'Jugador'}</span><span style="font-size:10px;color:#888;">${e.team==='home'?(m.home_club_name||m.team_home_name||'Local'):(m.away_club_name||m.team_away_name||'Visitante')}</span>${e.minute?`<span style="color:var(--accent);font-weight:800;font-size:11px;">${e.minute}'</span>`:''}</div>`;
  const goleadores=evList('goal'), asistidores=evList('assist');
  const listBlock=(title,arr)=>arr.length?`<div style="background:#111;border:1px solid #1a1a1a;border-radius:14px;padding:14px;margin-top:12px;"><div style="font-size:11px;font-weight:900;color:var(--accent);letter-spacing:1px;margin-bottom:6px;">${title}</div>${arr.map(scorerLine).join('')}</div>`:'';
  return `<div style="padding:16px;">
    <div style="background:#111;border:1px solid #1a1a1a;border-radius:14px;padding:16px;">
      ${row('Goles',hg,ag)}
      ${row('Asistencias',ev.filter(e=>e.team==='home'&&e.type==='assist').length,ev.filter(e=>e.team==='away'&&e.type==='assist').length)}
      ${row('Amarillas',ev.filter(e=>e.team==='home'&&e.type==='yellow_card').length,ev.filter(e=>e.team==='away'&&e.type==='yellow_card').length)}
      ${row('Rojas',ev.filter(e=>e.team==='home'&&e.type==='red_card').length,ev.filter(e=>e.team==='away'&&e.type==='red_card').length)}
      <div style="text-align:center;color:#555;font-size:11px;margin-top:10px;">${ev.length?'':'Las estadísticas se completan durante el partido.'}</div>
    </div>
    ${listBlock('⚽ GOLEADORES',goleadores)}
    ${listBlock('🅰️ ASISTENCIAS',asistidores)}
    ${m.mvp_name?`<div style="margin-top:12px;background:linear-gradient(135deg,rgba(255,215,0,0.1),#111);border:1px solid rgba(255,215,0,0.25);border-radius:14px;padding:16px;text-align:center;"><div style="font-size:11px;color:#ffd700;font-weight:800;letter-spacing:1px;">⭐ MVP DEL PARTIDO</div><div style="color:#fff;font-size:16px;font-weight:900;margin-top:4px;">${m.mvp_name}</div></div>`:''}
  </div>`;
}

/* ── PREDICCIONES ── */
function _ftPred(){
  const m=F.m, preds=F.preds||[], me=window.userData?.email;
  const mine=preds.find(p=>p.user_email===me);
  const t=preds.length||1;
  const hw=preds.filter(p=>(p.home_score||0)>(p.away_score||0)).length;
  const dr=preds.filter(p=>(p.home_score||0)===(p.away_score||0)).length;
  const aw=preds.filter(p=>(p.home_score||0)<(p.away_score||0)).length;
  const done=_fStatus(m)==='finalizado';
  return `<div style="padding:16px;">
    ${preds.length?`<div style="background:#111;border:1px solid #1a1a1a;border-radius:14px;padding:14px;margin-bottom:12px;"><h4 style="color:#fff;font-size:13px;margin:0 0 12px;">Tendencia de la comunidad (${preds.length})</h4>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;">
      <div><div style="color:var(--accent);font-size:18px;font-weight:900;">${Math.round(hw/t*100)}%</div><div style="font-size:10px;color:#888;">Local</div></div>
      <div><div style="color:#aaa;font-size:18px;font-weight:900;">${Math.round(dr/t*100)}%</div><div style="font-size:10px;color:#888;">Empate</div></div>
      <div><div style="color:#64b4ff;font-size:18px;font-weight:900;">${Math.round(aw/t*100)}%</div><div style="font-size:10px;color:#888;">Visita</div></div>
    </div></div>`:''}
    ${!done?(mine?`<div style="background:#111;border:1px solid #1a1a1a;border-radius:14px;padding:16px;text-align:center;"><div style="color:#888;font-size:12px;">Tu predicción</div><div style="font-size:30px;font-weight:900;color:#fff;">${mine.home_score} - ${mine.away_score}</div><button onclick="window._fDelPred('${F.id}')" style="margin-top:8px;background:transparent;border:1px solid #2a2a2a;color:#888;border-radius:20px;padding:7px 16px;font-size:12px;cursor:pointer;">Cambiar</button></div>`
    :`<div style="background:#111;border:1px solid #1a1a1a;border-radius:14px;padding:16px;"><h4 style="color:#fff;font-size:13px;margin:0 0 12px;text-align:center;">Tu predicción</h4>
    <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:12px;">
      <div style="text-align:center;"><div style="font-size:11px;color:#888;margin-bottom:6px;">${m.home_club_name||m.team_home_name||'Local'}</div><input id="fp-h" type="number" min="0" value="0" style="width:54px;text-align:center;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;font-size:22px;font-weight:900;padding:8px;"></div>
      <div style="color:var(--accent);font-weight:900;">-</div>
      <div style="text-align:center;"><div style="font-size:11px;color:#888;margin-bottom:6px;">${m.away_club_name||m.team_away_name||'Visita'}</div><input id="fp-a" type="number" min="0" value="0" style="width:54px;text-align:center;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;font-size:22px;font-weight:900;padding:8px;"></div>
    </div>
    <button onclick="window._fSavePred('${F.id}')" style="width:100%;background:var(--accent);color:#000;border:none;border-radius:12px;font-weight:900;padding:12px;cursor:pointer;">Enviar predicción</button></div>`):''}
  </div>`;
}

/* ── MOMENTOS ── */
function _ftMomentos(){
  return `<div style="padding:16px;">
    <button onclick="window._fUploadMomento('${F.id}')" style="width:100%;background:rgba(186,255,0,0.08);color:var(--accent);border:1px solid rgba(186,255,0,0.3);border-radius:12px;padding:12px;font-weight:800;cursor:pointer;margin-bottom:14px;"><i class='bx bx-camera'></i> SUBIR FOTO / VIDEO DEL PARTIDO</button>
    <div id="f-momentos-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;">
      <div style="grid-column:1/-1;text-align:center;padding:40px 0;color:#555;"><i class='bx bx-camera' style="font-size:40px;"></i><p style="margin-top:8px;font-size:13px;">Los momentos del partido aparecerán acá.</p></div>
    </div>
  </div>`;
}

/* ── CHAT (3 scopes: mi equipo / ambos / capitanes) ── */
function _fMyTeam(){
  const m=F.m, e=window.userData?.email;
  if (m.captain_away_email===e) return 'away';
  if (m.captain_home_email===e || m.created_by===e) return 'home';
  const p=(F.players||[]).find(x=>x.player_email===e);
  return (p&&p.team==='away')?'away':'home';
}
function _fChatScopesFor(){
  const cap=_fIsCaptain(F.m);
  const base=[['equipo','Mi equipo','bx-group'],['ambos','Ambos','bx-conversation']];
  if (cap) base.push(['capitanes','Capitanes','bx-crown']);
  return base;
}
// Traduce el scope de UI al scope real en DB (equipo → equipo_home/equipo_away)
function _fResolveScope(uiScope){
  if (uiScope==='equipo') return 'equipo_'+_fMyTeam();
  return uiScope; // ambos | capitanes
}
function _ftChat(){
  const m=F.m, isPlayer=_fIsCaptain(m)||(F.players||[]).some(p=>p.player_email===window.userData?.email);
  if (!isPlayer) return `<div style="text-align:center;padding:50px 20px;color:#555;"><i class='bx bx-lock' style="font-size:40px;"></i><p style="margin-top:10px;">El chat es solo para participantes del partido.</p></div>`;
  if (!window._fChatScope) window._fChatScope='ambos';
  const scopes=_fChatScopesFor();
  // Si el scope activo no está disponible para este usuario, volver a 'ambos'
  if (!scopes.find(s=>s[0]===window._fChatScope)) window._fChatScope='ambos';
  const tabs=scopes.map(([id,lbl,ic])=>{const on=id===window._fChatScope;return `<button onclick="window._fSetChatScope('${id}')" style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;background:${on?'var(--accent)':'rgba(255,255,255,0.04)'};color:${on?'#000':'#aaa'};border:none;border-radius:10px;padding:8px 6px;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap;"><i class='bx ${ic}'></i> ${lbl}</button>`;}).join('');
  setTimeout(()=>{ if(window._fInitMatchChat) window._fInitMatchChat(); }, 60);
  return `<div style="display:flex;flex-direction:column;height:62vh;padding:12px;">
    <div style="display:flex;gap:6px;margin-bottom:8px;">${tabs}</div>
    <div id="f-chat-msgs" style="flex:1;overflow-y:auto;background:#0b0b0b;border:1px solid #1a1a1a;border-radius:12px;padding:12px;"><div style="text-align:center;color:#555;padding:20px;"><i class='bx bx-loader-alt bx-spin'></i></div></div>
    <div style="display:flex;gap:8px;margin-top:8px;">
      <input id="f-chat-input" placeholder="Escribí un mensaje..." onkeydown="if(event.key==='Enter')window._fSendChat()" style="flex:1;background:#141414;border:1px solid #2a2a2a;border-radius:22px;padding:10px 14px;color:#fff;font-size:13px;outline:none;">
      <button onclick="window._fSendChat()" style="background:var(--accent);color:#000;border:none;border-radius:50%;width:42px;height:42px;cursor:pointer;flex-shrink:0;"><i class='bx bx-send'></i></button>
    </div>
  </div>`;
}

window._fSetChatScope = function(scope){
  window._fChatScope = scope;
  window._fChatGid = null; // forzar recarga del grupo del nuevo scope
  if (typeof _fTab==='function') _fTab('chat'); else _renderFicha('chat');
};

// Chat embebido del partido (por scope)
window._fInitMatchChat = async function(){
  const client=(typeof sb==='function'?sb():window._sb), m=F.m; if(!client||!m) return;
  const uiScope=window._fChatScope||'ambos';
  const dbScope=_fResolveScope(uiScope);
  const scopeName={'ambos':'Ambos equipos','capitanes':'Capitanes','equipo_home':'Equipo local','equipo_away':'Equipo visitante'}[dbScope]||'Partido';
  let gid=null, scopeSupported=true;
  try {
    let r=await client.from('group_chats').select('id').eq('match_id',F.id).eq('scope',dbScope).maybeSingle();
    if (r&&r.error){ scopeSupported=false; } else if (r&&r.data){ gid=r.data.id; }
  } catch(e){ scopeSupported=false; }
  // Degradación: si no existe la columna scope, usar un único chat por match
  if (!scopeSupported){
    try { const r2=await client.from('group_chats').select('id').eq('match_id',F.id).maybeSingle(); if(r2&&r2.data) gid=r2.data.id; } catch(e){}
  }
  if (!gid){
    const row={ name:'⚽ '+(m.name||'Partido')+' · '+scopeName, created_by:(window.userData||{}).email, match_id:F.id };
    if (scopeSupported) row.scope=dbScope;
    try { const ins=await client.from('group_chats').insert(row).select('id').single(); if(ins&&ins.data) gid=ins.data.id; } catch(e){}
  }
  window._fChatGid=gid;
  window._fLoadChatMsgs();
  // Realtime
  try { if(window._fChatChan&&client.removeChannel) client.removeChannel(window._fChatChan);
    window._fChatChan=client.channel('mchat-'+gid).on('postgres_changes',{event:'INSERT',schema:'public',table:'group_messages',filter:'group_id=eq.'+gid},()=>window._fLoadChatMsgs()).subscribe();
  } catch(e){}
};
window._fLoadChatMsgs = async function(){
  const box=document.getElementById('f-chat-msgs'); const client=(typeof sb==='function'?sb():window._sb);
  if(!box||!client||!window._fChatGid) return;
  try {
    const { data: msgs } = await client.from('group_messages').select('*').eq('group_id',window._fChatGid).order('created_at',{ascending:true}).limit(200);
    const me=(window.userData||{}).email;
    if(!msgs||!msgs.length){ box.innerHTML='<div style="text-align:center;color:#555;padding:30px;font-size:12px;">Sin mensajes todavía. ¡Rompé el hielo!</div>'; return; }
    box.innerHTML=msgs.map(x=>{ const mine=x.sender_email===me; return `<div style="display:flex;justify-content:${mine?'flex-end':'flex-start'};margin-bottom:8px;"><div style="max-width:75%;background:${mine?'var(--accent)':'#1a1a1a'};color:${mine?'#000':'#fff'};padding:8px 12px;border-radius:14px;font-size:13px;word-break:break-word;">${!mine?`<div style="font-size:10px;color:var(--accent);font-weight:800;margin-bottom:2px;">${x.sender_name||'Jugador'}</div>`:''}${(x.content||'').replace(/</g,'&lt;')}</div></div>`; }).join('');
    box.scrollTop=box.scrollHeight;
  } catch(e){ box.innerHTML='<div style="color:#f44;font-size:12px;text-align:center;padding:20px;">No se pudo cargar el chat.</div>'; }
};
window._fSendChat = async function(){
  const inp=document.getElementById('f-chat-input'); const client=(typeof sb==='function'?sb():window._sb);
  if(!inp||!client||!window._fChatGid) return;
  const txt=(inp.value||'').trim(); if(!txt) return; inp.value='';
  const me=window.userData||{};
  try { await client.from('group_messages').insert({ group_id:window._fChatGid, sender_email:me.email, sender_name:me.name||me.email, content:txt }); window._fLoadChatMsgs(); }
  catch(e){ if(window.showToast) showToast('No se pudo enviar.','error'); }
};

/* ── Acciones ficha ── */
const _ok = (q)=>q.then(()=>{},()=>{}); // ejecuta sin depender de .catch del builder
const _q = (q,fb)=>q.then(r=>(r&&!r.error?r:{data:fb}),()=>({data:fb}));
window._fMenu = function(){
  const m=F.m, id=F.id; if(!m)return;
  const live=_fStatus(m)==='en-vivo';
  let sheet=document.getElementById('f-mgmt-sheet'); if(sheet)sheet.remove();
  sheet=document.createElement('div'); sheet.id='f-mgmt-sheet';
  sheet.style.cssText='position:fixed;inset:0;z-index:30060;background:rgba(0,0,0,0.7);display:flex;align-items:flex-end;justify-content:center;';
  const row=(onclick,icon,label,color)=>`<button onclick="document.getElementById('f-mgmt-sheet').remove();${onclick}" style="display:flex;align-items:center;gap:14px;width:100%;background:none;border:none;border-bottom:1px solid #1a1a1a;color:#fff;padding:15px 6px;font-size:14px;font-weight:600;cursor:pointer;text-align:left;"><i class='bx ${icon}' style="font-size:22px;color:${color||'var(--accent)'};width:26px;"></i>${label}</button>`;
  sheet.innerHTML=`<div style="background:#111;border-radius:20px 20px 0 0;width:100%;max-width:480px;padding:14px 16px calc(16px + env(safe-area-inset-bottom));" onclick="event.stopPropagation()">
    <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:0 auto 14px;"></div>
    <div style="font-size:13px;font-weight:900;color:#fff;margin-bottom:6px;">Gestionar partido</div>
    ${live?row(`window.MatchDashboard&&window.MatchDashboard.open('${id}')`,'bx-football','Gestión en vivo (gol, asist, tarjeta)','#ff3b3b'):''}
    ${row(`window.CancheroMatchPlayers&&window.CancheroMatchPlayers.openPlayersPanel('${id}')`,'bx-user-pin','Jugadores')}
    ${row(`window._loadAvailablePlayersForMatch&&window._loadAvailablePlayersForMatch('${id}','home')`,'bx-user-plus','Invitar jugadores','#00e676')}
    ${row(`window.MatchDashboard&&window.MatchDashboard.open('${id}')`,'bx-layout','Panel del partido','#64b4ff')}
    ${row(`window.editMatchOpen&&window.editMatchOpen('${id}')`,'bx-edit','Editar partido','#ffaa00')}
    ${row(`window.deleteMatch&&window.deleteMatch('${id}')`,'bx-trash','Eliminar partido','#ff4444')}
    <button onclick="document.getElementById('f-mgmt-sheet').remove()" style="width:100%;margin-top:10px;background:#1a1a1a;color:#888;border:none;border-radius:12px;padding:12px;font-weight:700;cursor:pointer;">Cancelar</button>
  </div>`;
  sheet.onclick=()=>sheet.remove();
  document.body.appendChild(sheet);
};
window._fReview = function(r,e){ F._rev=r; document.querySelectorAll('#mv2-ftab [onclick^="window._fReview"]').forEach(b=>b.style.opacity='0.4'); const c=document.querySelector(`#mv2-ftab [onclick*="'${e}'"]`); if(c){c.style.opacity='1';c.style.transform='scale(1.25)';} };
window._fSubmitReview = async function(id){ const t=document.getElementById('f-review')?.value||''; await _ok(sb().from('match_reviews').insert({match_id:id,user_email:window.userData?.email,user_name:window.userData?.name,rating:F._rev||3,comment:t,created_at:new Date().toISOString()})); if(window.showToast)showToast('¡Reseña enviada!','success'); };
window._fSavePred = async function(id){ const h=parseInt(document.getElementById('fp-h')?.value||0),a=parseInt(document.getElementById('fp-a')?.value||0); await _ok(sb().from('match_predictions').upsert({match_id:id,user_email:window.userData?.email,user_name:window.userData?.name,home_score:h,away_score:a,created_at:new Date().toISOString()},{onConflict:'match_id,user_email'})); const r=await _q(sb().from('match_predictions').select('*').eq('match_id',id),[]); F.preds=r.data||[]; _fTab('predicciones'); if(window.showToast)showToast('¡Predicción guardada!','success'); };
window._fDelPred = async function(id){ await _ok(sb().from('match_predictions').delete().eq('match_id',id).eq('user_email',window.userData?.email)); const r=await _q(sb().from('match_predictions').select('*').eq('match_id',id),[]); F.preds=r.data||[]; _fTab('predicciones'); };
window._fUploadMomento = function(id){ const inp=document.createElement('input');inp.type='file';inp.accept='image/*,video/*';inp.onchange=async e=>{const file=e.target.files[0];if(!file)return;const client=sb();const path=`momentos/${id}/${Date.now()}.${file.name.split('.').pop()}`;if(window.showToast)showToast('Subiendo...','info');let up;try{up=await client.storage.from('media').upload(path,file,{upsert:true});}catch(err){up={error:err};}if(up&&up.error){if(window.showToast)showToast('Error al subir','error');return;}const{data}=client.storage.from('media').getPublicUrl(path);await _ok(client.from('match_media').insert({match_id:id,url:data.publicUrl,type:file.type.startsWith('video')?'video':'photo',user_email:window.userData?.email,created_at:new Date().toISOString()}));if(window.showToast)showToast('¡Momento subido!','success');const grid=document.getElementById('f-momentos-grid');if(grid){if(grid.querySelector('[style*="grid-column"]'))grid.innerHTML='';grid.innerHTML+=`<div style="aspect-ratio:1;border-radius:6px;overflow:hidden;"><img src="${data.publicUrl}" style="width:100%;height:100%;object-fit:cover;"></div>`;}};inp.click(); };

/* ── UNIRSE A PARTIDO (robusto, sin .catch sobre builder, cliente admin) ── */
window.joinOpenMatch = window._requestJoinMatch = async function(matchId){
  if (window._mustBeJugador && !window._mustBeJugador('unirse a un partido')) return;
  const client = sb();
  const me = window.userData;
  if (!me){ if(window.showToast)showToast('Iniciá sesión para unirte','error'); return; }
  if (!client){ if(window.showToast)showToast('Sin conexión','error'); return; }
  try {
    // ¿ya anotado?
    const ex = await client.from('match_players').select('id,status').eq('match_id',matchId).eq('player_email',me.email);
    if (ex && ex.data && ex.data.length){ if(window.showToast)showToast('Ya estás anotado a este partido ('+(ex.data[0].status||'')+')','info'); return; }
    // ¿es mi propio partido?
    const mr = await client.from('matches').select('created_by,name').eq('id',matchId).single();
    if (mr && mr.data && mr.data.created_by === me.email){ if(window.showToast)showToast('Es tu propio partido: ya sos el organizador','info'); return; }
    // insertar solicitud (campos del esquema real)
    const ins = await client.from('match_players').insert({ match_id:matchId, player_email:me.email, player_name:me.name||me.email, position:(me.pos||'DEL'), status:'pendiente', is_captain:false });
    if (ins && ins.error){
      if (ins.error.code==='23505'){ if(window.showToast)showToast('Ya enviaste tu solicitud para este partido','info'); return; }
      console.error('[join] error:', ins.error);
      if(window.showToast)showToast('No se pudo unir: '+(ins.error.message||ins.error.hint||'error'),'error'); return;
    }
    if (window.showToast) showToast('¡Solicitud enviada! El capitán la revisará 📨','success');
    try { if (window.CancheroXP) CancheroXP.add('unirse_partido'); } catch(e){}
    try { if (mr && mr.data && mr.data.created_by && window.CancheroNotif) window.CancheroNotif.create(mr.data.created_by,'match_request',me.name||me.email,'⚽ '+(me.name||me.email)+' quiere unirse a tu partido "'+(mr.data.name||'')+'". Tocá para aprobar o rechazar.',matchId); } catch(e){}
    if (typeof loadMisPartidos==='function') try{ loadMisPartidos('abiertos'); }catch(e){}
  } catch(e){
    console.error('[join] exception:', e);
    if (window.showToast) showToast('Error al unirse al partido','error');
  }
};

console.log('[canchero-match-v2.1] ✅ Buscar Partidos + Ficha premium con tabs + join robusto');
})();
