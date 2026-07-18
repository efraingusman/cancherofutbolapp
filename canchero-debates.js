/**
 * canchero-debates.js — DEBATES v2 (salas con argumentos, finalistas y jurado)
 * Flujo:
 *  1) ABIERTO (12h): todos argumentan eligiendo un bando; se votan los argumentos.
 *  2) FINAL: los 2 con más votos se enfrentan; cada uno envía hasta 10 mensajes.
 *  3) VOTACIÓN: el resto (jurado) vota al ganador.
 *  4) CERRADO: se muestra el ganador.
 * Tablas: debates, debate_arguments, argument_votes, debate_jury.
 */
(function(){
'use strict';
const sb = () => window._sb;
const me = () => window.userData;
function toast(m,t){ if(window.showToast) showToast(m,t); }
function q(b,fb){ return b.then(r=>(r&&!r.error?r:{data:fb}),()=>({data:fb})); }
const PHASE_MS = 12*3600*1000; // 12h por fase
const SIDE_COLORS = ['#baff00','#64b4ff','#ff6b9d','#ffaa00','#9c88ff','#00e676'];

const CATS = ['Todos','Mundial','Jugadores','Clubes'];
const CREATE_CATS = ['Mundial','Jugadores','Clubes','General'];
// Portadas sin copyright: gradientes premium + ícono según categoría (no fotos con derechos)
const CAT_COVER = {
  Mundial:  { grad:'linear-gradient(135deg,#0a3d2e,#0a0a0a)', icon:'bx-trophy' },
  Jugadores:{ grad:'linear-gradient(135deg,#1a2a14,#0a0a0a)', icon:'bx-football' },
  Clubes:   { grad:'linear-gradient(135deg,#10233a,#0a0a0a)', icon:'bx-shield' },
  General:  { grad:'linear-gradient(135deg,#1d1a2e,#0a0a0a)', icon:'bx-conversation' },
};
// Imágenes libres (Unsplash CDN, sin copyright) por defecto para las portadas de las semillas
const COVER_IMG = {
  trophy:  'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=640&q=70&auto=format&fit=crop',
  stadium: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=640&q=70&auto=format&fit=crop',
  player:  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=640&q=70&auto=format&fit=crop',
  ball:    'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=640&q=70&auto=format&fit=crop',
  shield:  'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=640&q=70&auto=format&fit=crop',
};
// Portada propia opcional: dejá una imagen en img/debates/<archivo> y poné esa ruta en local_cover.
// Si el archivo no existe, se usa la imagen libre de COVER_IMG como respaldo.
const SEED = [
  { title:'Messi vs Cristiano', category:'Jugadores', options:['Messi','Cristiano'], local_cover:'img/debates/messi-cristiano.jpg', cover_url:COVER_IMG.player },
  { title:'Maradona vs Pelé', category:'Jugadores', options:['Maradona','Pelé'], local_cover:'img/debates/maradona-pele.jpg', cover_url:COVER_IMG.player },
  { title:'Uruguay vs Argentina', category:'Mundial', options:['Uruguay','Argentina'], local_cover:'img/debates/uruguay-argentina.jpg', cover_url:COVER_IMG.stadium },
  // Debate del Mundial LIBRE (sin bandos fijos — pedido 2026-07-08)
  { title:'¿Quién gana el Mundial 2026?', category:'Mundial', options:[], local_cover:'img/debates/mundial-2026.jpg', cover_url:COVER_IMG.trophy },
  { title:'Peñarol vs Nacional', category:'Clubes', options:['Peñarol','Nacional'], local_cover:'img/debates/penarol-nacional.jpg', cover_url:COVER_IMG.shield },
  { title:'Barcelona vs Real Madrid', category:'Clubes', options:['Barcelona','Real Madrid'], local_cover:'img/debates/barsa-madrid.jpg', cover_url:COVER_IMG.stadium },
  { title:'Boca vs River', category:'Clubes', options:['Boca','River'], local_cover:'img/debates/boca-river.jpg', cover_url:COVER_IMG.shield },
  { title:'Mbappé vs Haaland', category:'Jugadores', options:['Mbappé','Haaland'], local_cover:'img/debates/mbappe-haaland.jpg', cover_url:COVER_IMG.ball },
];
// Resuelve la portada: la del debate, o si no tiene, la de la semilla con el mismo título (debates ya creados sin cover)
function _debResolveCover(d){
  if (d && d.cover_url) return d.cover_url;
  if (d && d.title){
    const s = SEED.find(x => x.title.trim().toLowerCase() === (d.title||'').trim().toLowerCase());
    if (s) return s.local_cover || s.cover_url || '';
  }
  return '';
}
function _debCoverStyle(d){
  const cat = d.category||'General';
  const cfg = CAT_COVER[cat] || CAT_COVER.General;
  const cover = _debResolveCover(d);
  if (cover) return `background:linear-gradient(180deg,rgba(0,0,0,0.15),rgba(0,0,0,0.78)),url('${cover}') center 22%/cover no-repeat;`;
  return `background:${cfg.grad};`;
}
function _debCoverIcon(d){ const cfg=CAT_COVER[d.category||'General']||CAT_COVER.General; return cfg.icon; }
window._debCat = 'Todos';

window._switchMensajes = function(which){
  const chats = document.getElementById('chats-panel');
  const deb = document.getElementById('debates-panel');
  const tc = document.getElementById('mtab-chats'), td = document.getElementById('mtab-debates');
  const base='flex:1;padding:12px 0 11px;border:none;font-size:13px;font-weight:800;cursor:pointer;background:transparent;font-family:inherit;letter-spacing:.5px;';
  const on=base+'border-bottom:2px solid var(--accent);color:var(--accent);';
  const off=base+'border-bottom:2px solid transparent;color:#777;';
  if (which==='debates'){
    if(chats)chats.style.display='none'; if(deb)deb.style.display='block';
    if(tc)tc.style.cssText=off;
    if(td)td.style.cssText=on;
    window._loadDebates();
  } else {
    if(chats)chats.style.display=''; if(deb)deb.style.display='none';
    if(tc)tc.style.cssText=on;
    if(td)td.style.cssText=off;
  }
};

window._loadDebates = async function(){
  const panel = document.getElementById('debates-panel');
  if (!panel) return;
  panel.innerHTML = `
    <div style="padding:4px 4px 0;">
      <button onclick="window._openCrearDebate()" style="width:100%;background:var(--accent);color:#000;border:none;border-radius:12px;padding:12px;font-weight:900;font-size:13px;cursor:pointer;margin-bottom:12px;"><i class='bx bx-plus'></i> CREAR DEBATE</button>
      <div style="display:flex;gap:7px;overflow-x:auto;padding-bottom:8px;scrollbar-width:none;">
        ${CATS.map(c=>`<button onclick="window._debSetCat('${c}')" id="debcat-${c}" style="flex-shrink:0;padding:6px 13px;border-radius:18px;border:none;font-size:12px;font-weight:700;cursor:pointer;background:${c===window._debCat?'var(--accent)':'#1a1a1a'};color:${c===window._debCat?'#000':'#aaa'};">${c}</button>`).join('')}
      </div>
      <div id="debates-list"><div style="text-align:center;padding:30px;color:#555;"><i class="bx bx-loader-alt bx-spin" style="font-size:24px;"></i></div></div>
    </div>`;
  window._renderDebatesList();
};
window._debSetCat = function(c){ window._debCat=c; CATS.forEach(x=>{const b=document.getElementById('debcat-'+x); if(b){b.style.background=x===c?'var(--accent)':'#1a1a1a';b.style.color=x===c?'#000':'#aaa';}}); window._renderDebatesList(); };

window._renderDebatesList = async function(){
  const list = document.getElementById('debates-list'); if(!list) return;
  let rows = (await q(sb().from('debates').select('*').order('created_at',{ascending:false}).limit(120),[])).data;
  // Dedupe reales por título (quedarse con el más reciente)
  const seen = {}; const realByTitle = {}; const realUnique = [];
  rows.forEach(d=>{ const k=(d.title||'').trim().toLowerCase(); if(!seen[k]){ seen[k]=1; realByTitle[k]=d; realUnique.push(d); } });
  // ORDEN ESTABLE (pedido 2026-07-08): primero las semillas en su orden fijo
  // (usando el debate real si ya existe), después el resto por fecha de creación ASC.
  const seedTitles = {};
  const ordered = SEED.map((s,i)=>{
    const k = s.title.trim().toLowerCase(); seedTitles[k]=1;
    return realByTitle[k] || { id:'seed-'+i, _seed:true, title:s.title, category:s.category, options:s.options, cover_url:(s.local_cover||s.cover_url) };
  });
  const others = realUnique.filter(d=>!seedTitles[(d.title||'').trim().toLowerCase()])
    .sort((a,b)=>String(a.created_at||'').localeCompare(String(b.created_at||'')));
  let all = [...ordered, ...others];
  // Filtro por categoría (Todos = todos)
  if (window._debCat!=='Todos') all = all.filter(d=>(d.category||'General')===window._debCat);
  if(!all.length){ list.innerHTML=`<div style="text-align:center;padding:40px;color:#555;"><i class='bx bx-conversation' style="font-size:42px;opacity:.4;display:block;margin-bottom:10px;"></i>Sin debates. Creá el primero.</div>`; return; }
  const ids = all.filter(d=>!d._seed).map(d=>d.id);
  let argCount={};
  if(ids.length){ const a=(await q(sb().from('debate_arguments').select('debate_id').in('debate_id',ids),[])).data; a.forEach(x=>argCount[x.debate_id]=(argCount[x.debate_id]||0)+1); }
  list.innerHTML = all.map(d=>{
    const opts = Array.isArray(d.options)?d.options:(()=>{try{return JSON.parse(d.options||'[]')}catch(e){return[]}})();
    const phase = d._seed?'abierto':_phaseOf(d);
    const phaseLabel = {abierto:'EN VIVO',final:'FINAL',votacion:'VOTACIÓN',cerrado:'CERRADO'}[phase];
    const phaseColor = {abierto:'#00e676',final:'#ff8c00',votacion:'#ffd700',cerrado:'var(--accent)'}[phase];
    return `<div onclick="window._openDebate('${d.id}')" style="background:var(--bg-panel,#111311);border:1px solid #1e1e1e;border-radius:16px;padding:0;margin-bottom:12px;cursor:pointer;overflow:hidden;transition:.15s;" onmouseover="this.style.borderColor='rgba(186,255,0,0.35)'" onmouseout="this.style.borderColor='#1e1e1e'">
      <div style="position:relative;height:112px;${_debCoverStyle(d)}display:flex;align-items:flex-end;padding:11px 14px;">
        <i class='bx ${_debCoverIcon(d)}' style="position:absolute;top:10px;right:14px;font-size:46px;color:rgba(255,255,255,0.12);"></i>
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
          <span style="font-size:10px;font-weight:800;color:#fff;letter-spacing:1px;background:rgba(0,0,0,0.45);padding:3px 9px;border-radius:8px;">${(d.category||'General').toUpperCase()}</span>
          <span style="font-size:10px;font-weight:800;color:#fff;display:flex;align-items:center;gap:4px;background:${phaseColor}cc;padding:3px 9px;border-radius:8px;"><span style="width:6px;height:6px;border-radius:50%;background:#fff;"></span>${phaseLabel}</span>
        </div>
      </div>
      <div style="padding:12px 14px 14px;">
        <div style="font-size:17px;font-weight:900;color:#fff;margin-bottom:12px;line-height:1.2;">${(d.title||'').replace(/</g,'&lt;')}</div>
        <div style="display:flex;align-items:center;gap:8px;">
          ${opts.slice(0,3).map((o,i)=>`${i>0?`<span style="color:#444;font-size:11px;font-weight:800;">vs</span>`:''}<span style="flex:1;text-align:center;background:${SIDE_COLORS[i%6]}14;color:${SIDE_COLORS[i%6]};border-radius:9px;padding:8px 6px;font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${o}</span>`).join('')}
        </div>
        <div style="display:flex;align-items:center;margin-top:12px;color:#666;font-size:11px;">
          <span><i class='bx bx-message-rounded-dots'></i> ${d._seed?0:(argCount[d.id]||0)} argumentos</span>
          <span style="margin-left:auto;color:var(--accent);font-weight:800;">Entrar →</span>
        </div>
      </div>
    </div>`;
  }).join('');
};

function _phaseOf(d){
  if (d.winner) return 'cerrado';
  if (d.phase==='votacion') return 'votacion';
  if (d.phase==='final') return 'final';
  return 'abierto';
}

/* ════════ SALA DE DEBATE ════════ */
window._openDebate = async function(id){
  // Semilla → crear debate real al entrar
  if (String(id).startsWith('seed-')){
    const s = SEED[parseInt(id.split('-')[1])];
    if (!me()){ toast('Iniciá sesión para debatir','error'); return; }
    const _seedRow={ title:s.title, category:s.category, options:s.options, created_by:me().email, phase:'abierto', phase_started:new Date().toISOString(), created_at:new Date().toISOString() };
    const _seedCover = s.local_cover || s.cover_url;
    if (_seedCover) _seedRow.cover_url=_seedCover;
    let r = await q(sb().from('debates').insert(_seedRow).select().single(), null);
    if (!r.data && s.cover_url){ delete _seedRow.cover_url; r = await q(sb().from('debates').insert(_seedRow).select().single(), null); }
    if (!r.data){ toast('No se pudo abrir el debate','error'); return; }
    id = r.data.id; window._renderDebatesList&&window._renderDebatesList();
  }
  let modal = document.getElementById('debate-room'); if(modal)modal.remove();
  modal = document.createElement('div'); modal.id='debate-room';
  // Debajo del header global (logo/rol/campana/ajustes siguen visibles — pedido 2026-07-08)
  modal.style.cssText='position:fixed;left:0;right:0;bottom:0;top:var(--nav-h,70px);z-index:899;background:var(--bg-main,#070907);display:flex;flex-direction:column;';
  modal.innerHTML='<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#555;"><i class="bx bx-loader-alt bx-spin" style="font-size:30px;"></i></div>';
  document.body.appendChild(modal);
  // ocultar barra inferior para que no tape el input
  ['player-bottom-nav','club-bottom-nav'].forEach(n=>document.getElementById(n)?.style.setProperty('display','none','important'));
  window._debRoomId = id;
  await _debRoomLoad();
  clearInterval(window._debPoll);
  window._debPoll = setInterval(_debRoomLoad, 6000);
};
window._closeDebate = function(){ clearInterval(window._debPoll); const m=document.getElementById('debate-room'); if(m)m.remove(); ['player-bottom-nav','club-bottom-nav'].forEach(n=>document.getElementById(n)?.style.removeProperty('display')); window._renderDebatesList&&window._renderDebatesList(); };

async function _debRoomLoad(){
  const id = window._debRoomId;
  const dR = await q(sb().from('debates').select('*').eq('id',id).single(), null);
  let d = dR.data; if(!d){ return; }
  const args = (await q(sb().from('debate_arguments').select('*').eq('debate_id',id).order('created_at',{ascending:true}).limit(300),[])).data;
  // Enriquecer con foto de perfil de cada autor (para mostrarla en cada mensaje)
  try {
    const emails = [...new Set(args.map(a=>a.user_email).filter(Boolean))];
    if (emails.length){
      const us = (await q(sb().from('users').select('email,photo,name').in('email',emails),[])).data;
      const umap={}; us.forEach(u=>umap[(u.email||'').toLowerCase()]=u);
      args.forEach(a=>{ const u=umap[(a.user_email||'').toLowerCase()]; if(u){ a._photo=u.photo; if(!a.user_name) a.user_name=u.name; } });
    }
  } catch(e){}
  const myVotes = me()? (await q(sb().from('argument_votes').select('argument_id').eq('user_email',me().email),[])).data.map(v=>v.argument_id) : [];
  const jury = (await q(sb().from('debate_jury').select('*').eq('debate_id',id),[])).data;
  // Avanzar fase por tiempo
  d = await _maybeAdvance(d, args);
  window._debData = { d, args, myVotes, jury };
  // No re-renderizar (y borrar lo que estás escribiendo) si estás tipeando un argumento.
  const inp = document.getElementById('deb-arg-input');
  if (inp && document.activeElement === inp) {
    // Actualizar solo el feed de mensajes, sin tocar el input
    const body = document.getElementById('deb-room-body');
    const phase = _phaseOf(d);
    const opts = Array.isArray(d.options)?d.options:(()=>{try{return JSON.parse(d.options||'[]')}catch(e){return[]}})();
    if (body) body.innerHTML = _debBody(phase, d, args, opts);
    return;
  }
  _debRender();
}

async function _maybeAdvance(d, args){
  if (d.winner) return d;
  const started = new Date(d.phase_started||d.created_at).getTime();
  const elapsed = Date.now()-started;
  // abierto → final
  if ((d.phase||'abierto')==='abierto' && elapsed>PHASE_MS && args.length>=2){
    // top 2 usuarios por votos totales
    const byUser={}; args.forEach(a=>{ byUser[a.user_email]=byUser[a.user_email]||{votes:0,name:a.user_name}; byUser[a.user_email].votes+=(a.votes||0); });
    const top=Object.entries(byUser).sort((x,y)=>y[1].votes-x[1].votes).slice(0,2);
    if (top.length===2){
      const upd={ phase:'final', phase_started:new Date().toISOString(), finalist_a:top[0][0], finalist_a_name:top[0][1].name, finalist_b:top[1][0], finalist_b_name:top[1][1].name };
      await q(sb().from('debates').update(upd).eq('id',d.id),null); Object.assign(d,upd);
    }
  }
  // final → votacion (cuando ambos finalistas mandaron 10, o pasaron 12h)
  else if (d.phase==='final'){
    const fa=args.filter(a=>a.is_final&&a.user_email===d.finalist_a).length;
    const fb=args.filter(a=>a.is_final&&a.user_email===d.finalist_b).length;
    if ((fa>=10&&fb>=10) || elapsed>PHASE_MS){
      const upd={ phase:'votacion', phase_started:new Date().toISOString() }; await q(sb().from('debates').update(upd).eq('id',d.id),null); Object.assign(d,upd);
    }
  }
  return d;
}

function _debRender(){
  const { d, args } = window._debData;
  const modal=document.getElementById('debate-room'); if(!modal) return;
  const phase=_phaseOf(d);
  const opts = Array.isArray(d.options)?d.options:(()=>{try{return JSON.parse(d.options||'[]')}catch(e){return[]}})();
  const phaseBadge={abierto:'<span style="color:#00e676;">🟢 ABIERTO · argumentá y votá</span>',final:'<span style="color:#ff6b00;">🔥 FINAL · los 2 mejores debaten</span>',votacion:'<span style="color:#ffd700;">⚖️ VOTÁ al ganador</span>',cerrado:'<span style="color:var(--accent);">🏆 CERRADO</span>'}[phase];
  modal.innerHTML=`
    <div style="flex:0 0 auto;background:rgba(7,9,7,0.92);border-bottom:1px solid #1a1f12;padding:max(env(safe-area-inset-top,0px),9px) 12px 9px;position:relative;z-index:2;">
      <div style="display:flex;align-items:center;gap:10px;">
        <button onclick="window._closeDebate()" title="Volver" style="background:rgba(255,255,255,0.06);border:1px solid #2a2a2a;border-radius:50%;width:34px;height:34px;color:#fff;font-size:18px;cursor:pointer;flex-shrink:0;"><i class='bx bx-arrow-back'></i></button>
        <div style="flex:1;min-width:0;"><div style="font-weight:900;font-size:15px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2;">${(d.title||'').replace(/</g,'&lt;')}</div><div style="font-size:11px;font-weight:700;">${phaseBadge}</div></div>
      </div>
    </div>
    <div id="deb-room-body" style="flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:12px 14px;">${_debBody(phase,d,args,opts)}</div>
    ${_debInput(phase,d,opts)}`;
  // Fondo con la portada en el contenedor fijo (no se mueve al scrollear)
  const cover=_debResolveCover(d);
  modal.style.background = cover ? `linear-gradient(180deg,rgba(7,9,7,0.90),rgba(7,9,7,0.97)),url('${cover}') center top/cover no-repeat` : 'var(--bg-main,#070907)';
  const body=document.getElementById('deb-room-body'); if(body) body.scrollTop=body.scrollHeight;
}

function _debBody(phase,d,args,opts){
  const {myVotes,jury}=window._debData;
  if (phase==='cerrado'){
    return `<div style="text-align:center;padding:30px 16px;"><div style="font-size:54px;">🏆</div><div style="font-size:13px;color:#888;">GANADOR DEL DEBATE</div><div style="font-size:22px;font-weight:900;color:var(--accent);margin:6px 0 16px;">${d.winner_name||d.winner||'—'}</div></div>` + _debArgsFeed(args,myVotes,true);
  }
  if (phase==='votacion'){
    const va=jury.filter(j=>j.voted_finalist===d.finalist_a).length, vb=jury.filter(j=>j.voted_finalist===d.finalist_b).length, tot=(va+vb)||1;
    const myJury=jury.find(j=>j.user_email===me()?.email);
    const fbtn=(em,nm,v)=>`<button ${myJury?'':`onclick="window._debJuryVote('${em}')"`} style="flex:1;background:#111;border:2px solid ${myJury&&myJury.voted_finalist===em?'var(--accent)':'#2a2a2a'};border-radius:14px;padding:16px;cursor:${myJury?'default':'pointer'};color:#fff;">
        <div style="font-weight:900;font-size:15px;margin-bottom:8px;">${nm||'Finalista'}</div>
        <div style="font-size:24px;font-weight:900;color:var(--accent);">${Math.round(v/tot*100)}%</div>
        <div style="font-size:11px;color:#888;">${v} voto${v!==1?'s':''}</div>
      </button>`;
    return `<div style="background:#0d120d;border:1px solid #1f2a14;border-radius:14px;padding:14px;margin-bottom:14px;text-align:center;">
        <div style="font-size:12px;color:#ffd700;font-weight:800;margin-bottom:12px;">⚖️ EL JURADO DECIDE · votá al ganador</div>
        <div style="display:flex;gap:10px;">${fbtn(d.finalist_a,d.finalist_a_name,va)}${fbtn(d.finalist_b,d.finalist_b_name,vb)}</div>
        ${myJury?`<div style="margin-top:10px;font-size:11px;color:#666;">Ya votaste ✓</div>`:''}
      </div>
      <div style="font-size:11px;color:#888;font-weight:700;margin-bottom:8px;">LA FINAL</div>
      ${_debArgsFeed(args.filter(a=>a.is_final),myVotes,true)}`;
  }
  if (phase==='final'){
    const fa=args.filter(a=>a.is_final&&a.user_email===d.finalist_a).length, fb=args.filter(a=>a.is_final&&a.user_email===d.finalist_b).length;
    return `<div style="display:flex;gap:10px;margin-bottom:14px;">
        <div style="flex:1;background:${SIDE_COLORS[0]}14;border:1px solid ${SIDE_COLORS[0]}55;border-radius:12px;padding:10px;text-align:center;"><div style="font-weight:900;font-size:13px;color:${SIDE_COLORS[0]};">${d.finalist_a_name||'Finalista A'}</div><div style="font-size:10px;color:#888;">${fa}/10 mensajes</div></div>
        <div style="display:flex;align-items:center;font-weight:900;color:#ff6b00;">VS</div>
        <div style="flex:1;background:${SIDE_COLORS[1]}14;border:1px solid ${SIDE_COLORS[1]}55;border-radius:12px;padding:10px;text-align:center;"><div style="font-weight:900;font-size:13px;color:${SIDE_COLORS[1]};">${d.finalist_b_name||'Finalista B'}</div><div style="font-size:10px;color:#888;">${fb}/10 mensajes</div></div>
      </div>
      ${_debArgsFeed(args.filter(a=>a.is_final),myVotes,true) || '<div style="text-align:center;color:#555;padding:20px;font-size:13px;">Los finalistas todavía no escribieron.</div>'}`;
  }
  // abierto — sin opciones = DEBATE LIBRE (opinás lo que quieras)
  const sideHeader = opts.length
    ? `<div style="display:flex;gap:8px;margin-bottom:12px;">${opts.map((o,i)=>{const c=args.filter(a=>a.side===i).length;return `<div style="flex:1;text-align:center;background:${SIDE_COLORS[i%6]}14;border:1px solid ${SIDE_COLORS[i%6]}44;border-radius:10px;padding:8px 4px;"><div style="font-weight:800;font-size:12px;color:${SIDE_COLORS[i%6]};">${o}</div><div style="font-size:10px;color:#888;">${c} arg.</div></div>`;}).join('')}</div>`
    : `<div style="text-align:center;background:rgba(186,255,0,0.06);border:1px solid rgba(186,255,0,0.2);border-radius:10px;padding:8px;margin-bottom:12px;font-size:11px;font-weight:800;color:var(--accent);">DEBATE LIBRE — opiná con total libertad</div>`;
  return sideHeader + (_debArgsFeed(args,myVotes,false) || `<div style="text-align:center;color:#555;padding:24px;font-size:13px;">${opts.length?'Sé el primero en argumentar. Elegí tu bando abajo 👇':'Sé el primero en opinar 👇'}</div>`);
}

function _debArgsFeed(args, myVotes, hideVote){
  if(!args.length) return '';
  const {d}=window._debData;
  const opts = Array.isArray(d.options)?d.options:[];
  // ordenar por votos desc en abierto
  const sorted=[...args].sort((a,b)=>(b.votes||0)-(a.votes||0));
  return sorted.map(a=>{
    const c=SIDE_COLORS[(a.side||0)%6];
    const voted=myVotes.includes(a.id);
    const mine=a.user_email===me()?.email;
    const em=(a.user_email||'').replace(/'/g,"\\'"); const nm=(a.user_name||'Hincha').replace(/'/g,"\\'");
    const prof=`window.openPlayerActions?window.openPlayerActions('${em}','${nm}'):(window.viewUserProfile&&window.viewUserProfile('${em}'))`;
    const av=a._photo?`<div onclick="${prof}" style="width:26px;height:26px;border-radius:50%;background-image:url('${a._photo}');background-size:cover;background-position:center 25%;flex-shrink:0;cursor:pointer;border:1.5px solid ${c};"></div>`:`<div onclick="${prof}" style="width:26px;height:26px;border-radius:50%;background:${c}33;display:flex;align-items:center;justify-content:center;color:${c};font-weight:900;font-size:12px;flex-shrink:0;cursor:pointer;">${(a.user_name||'?')[0].toUpperCase()}</div>`;
    return `<div style="background:rgba(16,19,13,0.92);border:1px solid #1d2416;border-left:3px solid ${c};border-radius:10px;padding:10px 12px;margin-bottom:8px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
        ${av}
        <span onclick="${prof}" style="font-size:12px;font-weight:800;color:${c};cursor:pointer;">${a.user_name||'Hincha'}</span>
        ${opts[a.side]?`<span style="font-size:9px;color:${c};background:${c}22;padding:1px 7px;border-radius:6px;">${opts[a.side]}</span>`:''}
        ${a.is_final?'<span style="font-size:9px;color:#ff6b00;font-weight:800;">FINAL</span>':''}
      </div>
      <div style="font-size:14px;color:#eaeaea;line-height:1.4;">${(a.text||'').replace(/</g,'&lt;')}</div>
      ${hideVote?'':`<div style="margin-top:6px;"><button ${mine?'disabled':''} onclick="window._debVoteArg('${a.id}')" style="background:${voted?'rgba(186,255,0,0.15)':'rgba(255,255,255,0.04)'};border:1px solid ${voted?'var(--accent)':'#2a2a2a'};color:${voted?'var(--accent)':'#aaa'};border-radius:16px;padding:4px 12px;font-size:11px;font-weight:700;cursor:${mine?'default':'pointer'};" title="${voted?'Quitar voto':'Votar'}"><i class='bx bx-upvote'></i> ${a.votes||0}${voted?' ✓':''}</button></div>`}
    </div>`;
  }).join('');
}

function _debInput(phase,d,opts){
  if (phase==='abierto'){
    if(!window._debSide&&window._debSide!==0) window._debSide=0;
    return `<div style="flex:0 0 auto;background:var(--bg-panel,#111311);border-top:1px solid #1a1f12;padding:8px 12px calc(8px + env(safe-area-inset-bottom));">
      <div style="display:flex;gap:6px;margin-bottom:8px;overflow-x:auto;">${opts.map((o,i)=>`<button onclick="window._debPickSide(${i})" id="debside-${i}" style="flex-shrink:0;padding:5px 12px;border-radius:14px;border:1px solid ${i===(window._debSide||0)?SIDE_COLORS[i%6]:'#2a2a2a'};background:${i===(window._debSide||0)?SIDE_COLORS[i%6]+'22':'transparent'};color:${i===(window._debSide||0)?SIDE_COLORS[i%6]:'#888'};font-size:12px;font-weight:800;cursor:pointer;">${o}</button>`).join('')}</div>
      <div style="display:flex;gap:8px;align-items:flex-end;">
        <textarea id="deb-arg-input" rows="1" placeholder="Tu argumento..." style="flex:1;background:#0a0d08;border:1px solid #2a2a2a;border-radius:18px;color:#fff;font-size:14px;padding:10px 14px;outline:none;resize:none;max-height:100px;font-family:inherit;"></textarea>
        <button onclick="window._debPostArg()" style="background:var(--accent);color:#000;border:none;border-radius:50%;width:42px;height:42px;cursor:pointer;font-size:18px;flex-shrink:0;"><i class='bx bx-send'></i></button>
      </div></div>`;
  }
  if (phase==='final'){
    const amFinalist = me() && (me().email===d.finalist_a || me().email===d.finalist_b);
    if (amFinalist){
      const {args}=window._debData; const sent=args.filter(a=>a.is_final&&a.user_email===me().email).length;
      if (sent>=10) return `<div style="flex:0 0 auto;background:var(--bg-panel,#111311);border-top:1px solid #1a1f12;padding:14px;text-align:center;color:#888;font-size:13px;">Ya usaste tus 10 mensajes. Esperá la votación.</div>`;
      return `<div style="flex:0 0 auto;background:var(--bg-panel,#111311);border-top:1px solid #1a1f12;padding:8px 12px calc(8px + env(safe-area-inset-bottom));">
        <div style="font-size:10px;color:#ff6b00;font-weight:700;margin-bottom:5px;text-align:center;">FINAL · te quedan ${10-sent} mensajes</div>
        <div style="display:flex;gap:8px;align-items:flex-end;"><textarea id="deb-arg-input" rows="1" placeholder="Tu argumento final..." style="flex:1;background:#0a0d08;border:1px solid #2a2a2a;border-radius:18px;color:#fff;font-size:14px;padding:10px 14px;outline:none;resize:none;font-family:inherit;"></textarea><button onclick="window._debPostFinal()" style="background:#ff6b00;color:#fff;border:none;border-radius:50%;width:42px;height:42px;cursor:pointer;font-size:18px;"><i class='bx bx-send'></i></button></div></div>`;
    }
    return `<div style="flex:0 0 auto;background:var(--bg-panel,#111311);border-top:1px solid #1a1f12;padding:14px;text-align:center;color:#888;font-size:13px;">🔥 Están debatiendo los finalistas. Cuando terminen, votás al ganador.</div>`;
  }
  return ''; // votacion / cerrado: sin input
}

window._debPickSide=function(i){ window._debSide=i; const opts=window._debData.d.options; opts.forEach((o,j)=>{const b=document.getElementById('debside-'+j); if(b){const c=SIDE_COLORS[j%6]; const on=j===i; b.style.border='1px solid '+(on?c:'#2a2a2a'); b.style.background=on?c+'22':'transparent'; b.style.color=on?c:'#888';}}); };
window._debPostArg=async function(){
  const t=document.getElementById('deb-arg-input')?.value?.trim(); if(!t||!me())return;
  await q(sb().from('debate_arguments').insert({debate_id:window._debRoomId,user_email:me().email,user_name:me().name||me().email,side:window._debSide||0,text:t,votes:0,created_at:new Date().toISOString()}),null);
  document.getElementById('deb-arg-input').value=''; await _debRoomLoad();
};
window._debPostFinal=async function(){
  const t=document.getElementById('deb-arg-input')?.value?.trim(); if(!t||!me())return;
  await q(sb().from('debate_arguments').insert({debate_id:window._debRoomId,user_email:me().email,user_name:me().name||me().email,side:0,text:t,is_final:true,votes:0,created_at:new Date().toISOString()}),null);
  document.getElementById('deb-arg-input').value=''; await _debRoomLoad();
};
window._debVoteArg=async function(argId){
  if(!me())return;
  const a=window._debData.args.find(x=>x.id===argId);
  const already=window._debData.myVotes.includes(argId);
  if (already){
    // quitar voto
    await q(sb().from('argument_votes').delete().eq('argument_id',argId).eq('user_email',me().email),null);
    await q(sb().from('debate_arguments').update({votes:Math.max(0,(a?.votes||1)-1)}).eq('id',argId),null);
  } else {
    await q(sb().from('argument_votes').insert({argument_id:argId,user_email:me().email}),null);
    await q(sb().from('debate_arguments').update({votes:(a?.votes||0)+1}).eq('id',argId),null);
  }
  await _debRoomLoad();
};
window._debJuryVote=async function(finalistEmail){
  if(!me())return;
  await q(sb().from('debate_jury').insert({debate_id:window._debRoomId,user_email:me().email,voted_finalist:finalistEmail}),null);
  await _debRoomLoad();
};

/* ════════ CREAR DEBATE ════════ */
window._openCrearDebate = function(){
  if (!me()){ toast('Iniciá sesión para crear un debate','error'); return; }
  let m = document.getElementById('crear-debate-modal'); if(m)m.remove();
  m = document.createElement('div'); m.id='crear-debate-modal';
  m.style.cssText='position:fixed;inset:0;z-index:30060;background:rgba(0,0,0,0.88);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;';
  m.innerHTML = `<div style="background:#0f110f;border:1px solid #1e1e1e;border-radius:20px;width:100%;max-width:420px;padding:20px;max-height:92vh;overflow-y:auto;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><h3 style="margin:0;font-size:16px;font-weight:900;">💬 Crear debate</h3><button onclick="document.getElementById('crear-debate-modal').remove()" style="background:rgba(255,255,255,0.06);border:1px solid #333;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:18px;">&times;</button></div>
    <div id="deb-cover-wrap" onclick="document.getElementById('deb-cover-file').click()" style="width:100%;height:120px;border:1px dashed #2a2a2a;border-radius:12px;margin-bottom:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer;background-size:cover;background-position:center;color:#777;">
      <i class='bx bx-image-add' style="font-size:30px;color:var(--accent);"></i>
      <span style="font-size:12px;font-weight:700;">Subir portada (opcional)</span>
    </div>
    <input type="file" id="deb-cover-file" accept="image/*" style="display:none;" onchange="window._debPreviewCover(this)">
    <input id="deb-title" placeholder="Tema (ej: ¿Mejor 10 de la historia?)" style="width:100%;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;padding:11px;font-size:13px;box-sizing:border-box;margin-bottom:8px;">
    <textarea id="deb-desc" rows="2" placeholder="Descripción (opcional)" style="width:100%;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;padding:11px;font-size:13px;box-sizing:border-box;margin-bottom:8px;resize:none;font-family:inherit;"></textarea>
    <select id="deb-cat" style="width:100%;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;padding:11px;font-size:13px;box-sizing:border-box;margin-bottom:12px;">${CREATE_CATS.map(c=>`<option value="${c}">${c}</option>`).join('')}</select>
    <div style="font-size:11px;color:#888;font-weight:700;margin-bottom:6px;">BANDOS (2 a 6)</div>
    <div id="deb-opts">${[0,1].map(i=>`<input class="deb-opt" placeholder="Bando ${i+1}" style="width:100%;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;padding:10px;font-size:13px;box-sizing:border-box;margin-bottom:7px;">`).join('')}</div>
    <button onclick="window._debAddOpt()" style="width:100%;background:rgba(186,255,0,0.06);color:var(--accent);border:1px dashed rgba(186,255,0,0.3);border-radius:10px;padding:9px;font-size:12px;font-weight:700;cursor:pointer;margin-bottom:14px;"><i class='bx bx-plus'></i> Agregar bando</button>
    <button onclick="window._debCreate()" style="width:100%;background:var(--accent);color:#000;border:none;border-radius:12px;padding:13px;font-weight:900;font-size:14px;cursor:pointer;">PUBLICAR DEBATE</button>
  </div>`;
  m.onclick=e=>{ if(e.target===m) m.remove(); };
  document.body.appendChild(m);
};
window._debAddOpt=function(){ const box=document.getElementById('deb-opts'); if(!box||box.children.length>=6){toast('Máx 6','info');return;} const inp=document.createElement('input'); inp.className='deb-opt'; inp.placeholder='Bando '+(box.children.length+1); inp.style.cssText='width:100%;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;padding:10px;font-size:13px;box-sizing:border-box;margin-bottom:7px;'; box.appendChild(inp); };
window._debPreviewCover=function(input){
  const f=input.files&&input.files[0]; if(!f) return;
  const wrap=document.getElementById('deb-cover-wrap'); if(!wrap) return;
  const url=URL.createObjectURL(f);
  wrap.style.backgroundImage=`linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.6)),url('${url}')`;
  wrap.innerHTML='<span style="font-size:11px;font-weight:700;color:#fff;background:rgba(0,0,0,0.5);padding:4px 10px;border-radius:8px;">Portada lista · tocá para cambiar</span>';
};
async function _debUploadCover(){
  const input=document.getElementById('deb-cover-file');
  const f=input&&input.files&&input.files[0]; if(!f) return null;
  try {
    const client=sb();
    const fUp = window._compressImageFile ? await window._compressImageFile(f, 1280, 0.74) : f;
    if (window.cloudUpload){ const r = await window.cloudUpload(fUp, { folder:'canchero/debates' }); return r && r.url || null; }
    const path=`debates/${me().email}/${Date.now()}.jpg`;
    let up; try{ up=await client.storage.from('media').upload(path,fUp,{upsert:true,contentType:'image/jpeg'}); }catch(e){ up={error:e}; }
    if(up&&up.error) return null;
    const { data } = client.storage.from('media').getPublicUrl(path);
    return data&&data.publicUrl||null;
  } catch(e){ return null; }
}
window._debCreate=async function(){
  const title=document.getElementById('deb-title')?.value?.trim(); const desc=document.getElementById('deb-desc')?.value?.trim()||null; const cat=document.getElementById('deb-cat')?.value||'General';
  const opts=Array.from(document.querySelectorAll('.deb-opt')).map(i=>i.value.trim()).filter(Boolean);
  if(!title){toast('Poné el tema','error');return;} if(opts.length<2){toast('Mínimo 2 bandos','error');return;}
  toast('Publicando...','info');
  const cover=await _debUploadCover();
  const row={title,description:desc,category:cat,options:opts,created_by:me().email,phase:'abierto',phase_started:new Date().toISOString(),created_at:new Date().toISOString()};
  if(cover) row.cover_url=cover;
  let r=await q(sb().from('debates').insert(row).select().single(),null);
  // Si la columna cover_url no existe aún, reintentar sin ella (degradación con gracia)
  if(!r.data && cover){ delete row.cover_url; r=await q(sb().from('debates').insert(row).select().single(),null); }
  if(!r.data){toast('No se pudo crear','error');return;}
  document.getElementById('crear-debate-modal')?.remove(); toast('¡Debate publicado!','success'); window._debCat=cat; window._loadDebates();
};

console.log('[canchero-debates v2] ✅ Debates con salas, finalistas y jurado');
})();
