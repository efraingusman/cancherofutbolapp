/**
 * canchero-games-core.js — Infraestructura común de juegos
 * - Ranking global por juego (tabla game_scores)
 * - Desafíos 1v1 asincrónicos con expiración de 10 minutos (game_challenges)
 * - Notificaciones por campana al desafiado y al resolverse el duelo
 * Usado por: Adivina el Jugador, 11 Ideal (y futuros juegos).
 */
(function(){
'use strict';
function sb(){ return window._sb || window.supabaseClient || null; }
function me(){ return window.userData || null; }
function toast(m,t){ if(window.showToast) showToast(m,t); }
const GAME_NAMES = { adivina:'Adivina el Jugador', 'once-ideal':'11 Ideal', impostor:'Impostor Futbolero', 'tiros-libres':'Tiros Libres', cabezones:'Cabezones' };

const CGCore = {};

/* ── PUNTAJES / RANKING ─────────────────────────────────── */
CGCore.saveScore = async function(gameId, points){
  const c = sb(), u = me();
  if (!c || !u || !points) return;
  try { await c.from('game_scores').insert({ game_id: gameId, user_email: u.email, user_name: u.name || u.email, points: points }); } catch(e){}
  // Mostrar EN QUÉ PUESTO del ranking quedé (pedido 2026-07-08)
  try {
    const pos = await CGCore.myRank(gameId);
    if (pos && pos.rank) toast(`🏆 Ranking de ${GAME_NAMES[gameId]||gameId}: quedaste #${pos.rank} de ${pos.total}`, 'success');
  } catch(e){}
};
// Posición del usuario en el ranking (por puntos acumulados)
CGCore.myRank = async function(gameId){
  const c = sb(), u = me();
  if (!c || !u) return null;
  try {
    const { data } = await c.from('game_scores').select('user_email,points').eq('game_id', gameId).limit(2000);
    const agg = {};
    (data||[]).forEach(r => { agg[r.user_email] = (agg[r.user_email]||0) + (r.points||0); });
    const sorted = Object.entries(agg).sort((a,b)=>b[1]-a[1]);
    const idx = sorted.findIndex(([e]) => e === u.email);
    return { rank: idx >= 0 ? idx+1 : null, total: sorted.length };
  } catch(e){ return null; }
};

CGCore.openRanking = async function(gameId){
  const c = sb();
  let m = document.getElementById('cg-ranking'); if (m) m.remove();
  m = document.createElement('div'); m.id = 'cg-ranking';
  m.style.cssText = 'position:fixed;inset:0;z-index:9970;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;';
  m.onclick = (e)=>{ if(e.target===m) m.remove(); };
  m.innerHTML = `<div style="background:#0d0d0d;border:1px solid #1e1e1e;border-radius:22px 22px 0 0;width:100%;max-width:480px;max-height:78vh;display:flex;flex-direction:column;">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 18px 12px;border-bottom:1px solid #1a1a1a;">
      <div><div style="font-size:10px;color:var(--accent);font-weight:900;letter-spacing:2px;">RANKING</div><div style="font-size:16px;font-weight:900;color:#fff;">${GAME_NAMES[gameId]||gameId}</div></div>
      <button onclick="document.getElementById('cg-ranking').remove()" style="background:rgba(255,255,255,0.06);border:none;border-radius:50%;width:34px;height:34px;color:#fff;cursor:pointer;font-size:17px;"><i class='bx bx-x'></i></button>
    </div>
    <div id="cg-rank-body" style="flex:1;overflow-y:auto;padding:10px 14px calc(20px + env(safe-area-inset-bottom));"><div style="text-align:center;padding:24px;color:#555;"><i class='bx bx-loader-alt bx-spin' style="font-size:22px;"></i></div></div>
  </div>`;
  document.body.appendChild(m);
  if (!c) { document.getElementById('cg-rank-body').innerHTML = '<div style="padding:20px;color:#666;text-align:center;">Sin conexión.</div>'; return; }
  try {
    const { data } = await c.from('game_scores').select('user_email,user_name,points').eq('game_id', gameId).order('created_at',{ascending:false}).limit(500);
    const agg = {};
    (data||[]).forEach(r => { const k=r.user_email; if(!agg[k]) agg[k]={name:r.user_name||k, total:0, best:0, n:0}; agg[k].total+=r.points; agg[k].best=Math.max(agg[k].best,r.points); agg[k].n++; });
    const rows = Object.entries(agg).map(([email,v])=>({email,...v})).sort((a,b)=>b.total-a.total).slice(0,30);
    const myEmail = me() && me().email;
    const body = document.getElementById('cg-rank-body');
    if (!rows.length){ body.innerHTML = '<div style="padding:26px;color:#666;text-align:center;"><i class="bx bx-trophy" style="font-size:36px;opacity:0.3;display:block;margin-bottom:8px;"></i>Nadie jugó todavía.<br>¡Sé el primero del ranking!</div>'; return; }
    const medal = i => i===0?'#FFD700':i===1?'#C0C0C0':i===2?'#CD7F32':'#333';
    body.innerHTML = rows.map((r,i)=>`<div style="display:flex;align-items:center;gap:12px;padding:10px 8px;border-bottom:1px solid #141414;${r.email===myEmail?'background:rgba(186,255,0,0.05);border-radius:10px;':''}">
        <div style="width:30px;height:30px;border-radius:50%;background:${medal(i)}22;border:1.5px solid ${medal(i)};color:${i<3?medal(i):'#888'};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;flex-shrink:0;">${i+1}</div>
        <div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${(r.name||'').replace(/</g,'&lt;')}${r.email===myEmail?' <span style="font-size:9px;color:var(--accent);">(VOS)</span>':''}</div>
        <div style="font-size:10px;color:#666;">${r.n} partida${r.n!==1?'s':''} · mejor: ${r.best}</div></div>
        <div style="font-weight:900;color:var(--accent);font-size:15px;">${r.total}</div>
      </div>`).join('');
  } catch(e){ const body=document.getElementById('cg-rank-body'); if(body) body.innerHTML='<div style="padding:20px;color:#f66;text-align:center;">No se pudo cargar el ranking.</div>'; }
};

/* ── NOTIFICACIONES (campana) ───────────────────────────── */
async function notify(recipientEmail, type, message){
  const c = sb(), u = me();
  if (!c || !u || !recipientEmail) return;
  try { await c.from('notifications').insert({ recipient_email: recipientEmail, type: type, actor_name: u.name || u.email, actor_email: u.email, message: message, read: false }); } catch(e){}
}
CGCore.notify = notify;

/* ── DESAFÍOS 1v1 (10 min para aceptar) ─────────────────── */
CGCore.sendChallenge = async function(gameId, payload, fromScore){
  const c = sb(), u = me();
  if (!c || !u){ toast('Iniciá sesión.','warning'); return; }
  // Selector de amigo (seguidos)
  let sheet = document.getElementById('cg-chal-pick'); if (sheet) sheet.remove();
  sheet = document.createElement('div'); sheet.id = 'cg-chal-pick';
  sheet.style.cssText = 'position:fixed;inset:0;z-index:9975;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;';
  sheet.onclick = (e)=>{ if(e.target===sheet) sheet.remove(); };
  sheet.innerHTML = `<div style="background:#0d0d0d;border:1px solid #1e1e1e;border-radius:22px 22px 0 0;width:100%;max-width:480px;max-height:70vh;display:flex;flex-direction:column;">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 18px 10px;">
      <div><div style="font-size:10px;color:var(--accent);font-weight:900;letter-spacing:2px;">DESAFIAR</div><div style="font-size:15px;font-weight:900;color:#fff;">${GAME_NAMES[gameId]||gameId}</div></div>
      <button onclick="document.getElementById('cg-chal-pick').remove()" style="background:rgba(255,255,255,0.06);border:none;border-radius:50%;width:34px;height:34px;color:#fff;cursor:pointer;"><i class='bx bx-x'></i></button>
    </div>
    <div style="padding:0 18px 8px;font-size:11px;color:#888;">Tu rival tiene <b style="color:var(--accent);">10 minutos</b> para aceptar. Si expira, podés reenviarlo.</div>
    <div id="cg-chal-list" style="flex:1;overflow-y:auto;padding:6px 14px calc(20px + env(safe-area-inset-bottom));"><div style="text-align:center;padding:20px;color:#555;"><i class='bx bx-loader-alt bx-spin'></i></div></div>
  </div>`;
  document.body.appendChild(sheet);
  try {
    const { data: follows } = await c.from('follows').select('following_email').eq('follower_email', u.email).limit(50);
    const emails = (follows||[]).map(f=>f.following_email);
    if (!emails.length){ document.getElementById('cg-chal-list').innerHTML = '<div style="padding:18px;color:#666;text-align:center;">Seguí a alguien para poder desafiarlo.</div>'; return; }
    const { data: users } = await c.from('users').select('email,name,photo').in('email', emails).limit(50);
    document.getElementById('cg-chal-list').innerHTML = (users||[]).map(f=>{
      const init=(f.name||'?')[0].toUpperCase();
      const av = (f.photo && !f.photo.includes('ui-avatars')) ? `<div style="width:38px;height:38px;border-radius:50%;background:#000 url('${f.photo}') center/cover;flex-shrink:0;"></div>` : `<div style="width:38px;height:38px;border-radius:50%;background:var(--accent);color:#000;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${init}</div>`;
      return `<div onclick="window.CGCore._doSend('${gameId}','${f.email.replace(/'/g,"\\'")}','${(f.name||'').replace(/'/g,"\\'")}')" style="display:flex;align-items:center;gap:12px;padding:10px 8px;border-bottom:1px solid #141414;cursor:pointer;">${av}
        <div style="flex:1;font-size:13px;font-weight:800;color:#fff;">${(f.name||f.email).replace(/</g,'&lt;')}</div>
        <span style="font-size:10px;color:var(--accent);font-weight:800;border:1px solid rgba(186,255,0,0.4);border-radius:14px;padding:4px 10px;">DESAFIAR ⚔</span>
      </div>`;
    }).join('') || '<div style="padding:18px;color:#666;text-align:center;">Seguí a alguien para poder desafiarlo.</div>';
    CGCore._pending = { gameId, payload, fromScore };
  } catch(e){ document.getElementById('cg-chal-list').innerHTML = '<div style="padding:18px;color:#f66;text-align:center;">Error al cargar tus seguidos.</div>'; }
};

CGCore._doSend = async function(gameId, toEmail, toName){
  const c = sb(), u = me();
  const pend = CGCore._pending || {};
  document.getElementById('cg-chal-pick')?.remove();
  if (!c || !u) return;
  try {
    const { error } = await c.from('game_challenges').insert({
      game: gameId, mode: 'duelo', from_email: u.email, from_name: u.name || u.email,
      to_email: toEmail, to_name: toName || toEmail, status: 'pending',
      payload: pend.payload || null, from_score: (typeof pend.fromScore==='number') ? pend.fromScore : null,
      expires_at: new Date(Date.now() + 10*60000).toISOString()
    });
    if (error) throw error;
    await notify(toEmail, 'game_challenge', `⚔ ¡${u.name||'Alguien'} te desafió a ${GAME_NAMES[gameId]||gameId}! Tenés 10 minutos para aceptar.`);
    toast(`Desafío enviado a ${toName||toEmail} ⚔ (expira en 10 min)`, 'success');
  } catch(e){ toast('No se pudo enviar el desafío.', 'error'); }
};

/* Desafíos pendientes para mí (no expirados) + los que envié */
CGCore.loadMyChallenges = async function(){
  const c = sb(), u = me();
  if (!c || !u) return { incoming: [], sent: [] };
  const now = new Date().toISOString();
  try {
    // marcar expirados (lazy)
    await c.from('game_challenges').update({ status:'expired' }).eq('status','pending').lt('expires_at', now);
  } catch(e){}
  try {
    const { data: incoming } = await c.from('game_challenges').select('*').eq('to_email', u.email).in('status',['pending','accepted']).order('created_at',{ascending:false}).limit(10);
    const { data: sent } = await c.from('game_challenges').select('*').eq('from_email', u.email).in('status',['pending','expired','finished']).order('created_at',{ascending:false}).limit(10);
    return { incoming: incoming||[], sent: sent||[] };
  } catch(e){ return { incoming: [], sent: [] }; }
};

/* Banner de desafíos en el hub de juegos */
CGCore.renderChallengesBanner = async function(containerId){
  const box = document.getElementById(containerId);
  if (!box) return;
  const { incoming, sent } = await CGCore.loadMyChallenges();
  // expirados: visibles solo 3h desde que vencieron, después se limpian solos
  const _3h = 3*3600*1000;
  const expired = sent.filter(s=>s.status==='expired' && s.expires_at && (Date.now() - new Date(s.expires_at)) < _3h).slice(0,3);
  let html = '';
  incoming.filter(ch=>ch.status==='pending').forEach(ch=>{
    const mins = Math.max(0, Math.round((new Date(ch.expires_at) - Date.now())/60000));
    html += `<div style="background:linear-gradient(135deg,#141a0a,#0d0d0d);border:1px solid rgba(186,255,0,0.4);border-radius:16px;padding:13px 14px;margin-bottom:10px;display:flex;align-items:center;gap:12px;">
      <div style="font-size:22px;">⚔</div>
      <div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:800;color:#fff;">${(ch.from_name||'Alguien').replace(/</g,'&lt;')} te desafió</div>
      <div style="font-size:11px;color:#888;">${GAME_NAMES[ch.game]||ch.game} · expira en ${mins} min</div></div>
      <button onclick="window.CGCore.acceptChallenge('${ch.id}')" style="background:var(--accent);color:#000;border:none;border-radius:12px;padding:8px 14px;font-weight:900;font-size:12px;cursor:pointer;flex-shrink:0;">ACEPTAR</button>
      <button onclick="window.CGCore.declineChallenge('${ch.id}')" style="background:none;border:1px solid #333;color:#888;border-radius:12px;padding:8px 10px;font-size:12px;cursor:pointer;flex-shrink:0;">✕</button>
    </div>`;
  });
  expired.forEach(ch=>{
    html += `<div style="background:#0d0d0d;border:1px solid #2a2a2a;border-radius:16px;padding:11px 14px;margin-bottom:10px;display:flex;align-items:center;gap:12px;">
      <div style="font-size:18px;opacity:0.6;">⌛</div>
      <div style="flex:1;min-width:0;font-size:12px;color:#888;">Tu desafío a <b style="color:#ccc;">${(ch.to_name||ch.to_email||'').replace(/</g,'&lt;')}</b> expiró sin respuesta.</div>
      <button onclick="window.CGCore.resendChallenge('${ch.id}')" style="background:rgba(186,255,0,0.08);color:var(--accent);border:1px solid rgba(186,255,0,0.35);border-radius:12px;padding:7px 12px;font-weight:800;font-size:11px;cursor:pointer;flex-shrink:0;">REENVIAR</button>
    </div>`;
  });
  box.innerHTML = html;
};

CGCore.acceptChallenge = async function(id){
  const c = sb(), u = me();
  if (!c || !u) return;
  try {
    const { data: ch } = await c.from('game_challenges').select('*').eq('id', id).single();
    if (!ch) return;
    if (new Date(ch.expires_at) < new Date()){ toast('El desafío expiró. Pedile que lo reenvíe.','warning'); await c.from('game_challenges').update({status:'expired'}).eq('id', id); CGCore.renderChallengesBanner('cg-challenges-banner'); return; }
    await c.from('game_challenges').update({ status:'accepted' }).eq('id', id);
    await notify(ch.from_email, 'game_challenge', `🔥 ${u.name||'Tu rival'} aceptó tu desafío de ${GAME_NAMES[ch.game]||ch.game}. ¡Está jugando!`);
    // Lanzar el juego correspondiente en modo desafío
    if (ch.game === 'adivina' && window._adivinaChallengePlay) window._adivinaChallengePlay(ch);
    else if (ch.game === 'once-ideal' && window._onceChallengePlay) window._onceChallengePlay(ch);
    else toast('Este juego todavía no soporta duelos.','info');
  } catch(e){ toast('No se pudo aceptar.','error'); }
};

CGCore.declineChallenge = async function(id){
  const c = sb(); if (!c) return;
  try { await c.from('game_challenges').update({ status:'declined' }).eq('id', id); } catch(e){}
  CGCore.renderChallengesBanner('cg-challenges-banner');
};

CGCore.resendChallenge = async function(id){
  const c = sb(), u = me(); if (!c || !u) return;
  try {
    const { data: ch } = await c.from('game_challenges').select('*').eq('id', id).single();
    if (!ch) return;
    await c.from('game_challenges').update({ status:'pending', expires_at: new Date(Date.now()+10*60000).toISOString() }).eq('id', id);
    await notify(ch.to_email, 'game_challenge', `⚔ ${u.name||'Alguien'} te volvió a desafiar a ${GAME_NAMES[ch.game]||ch.game}. ¡10 minutos para aceptar!`);
    toast('Desafío reenviado ⚔','success');
    CGCore.renderChallengesBanner('cg-challenges-banner');
  } catch(e){}
};

/* El desafiado terminó su partida → resolver duelo */
CGCore.finishChallenge = async function(id, myScore, verdict){
  const c = sb(), u = me(); if (!c || !u) return null;
  try {
    const { data: ch } = await c.from('game_challenges').select('*').eq('id', id).single();
    if (!ch) return null;
    const fromScore = ch.from_score || 0;
    const winner = myScore > fromScore ? u.email : (myScore < fromScore ? ch.from_email : null);
    await c.from('game_challenges').update({ status:'finished', to_score: myScore, winner_email: winner, verdict: verdict||null }).eq('id', id);
    const resTxt = winner === null ? '¡Empate!' : (winner === u.email ? `Ganó ${u.name||'tu rival'}` : `Ganaste vos`);
    await notify(ch.from_email, 'game_result', `🏁 Duelo de ${GAME_NAMES[ch.game]||ch.game} terminado: ${ch.from_name} ${fromScore} - ${myScore} ${u.name}. ${resTxt}`);
    return { ch, fromScore, myScore, winner };
  } catch(e){ return null; }
};

/* Compartir resultado al perfil (post) o por DM */
// Publica un resultado de juego. Acepta texto (compat) o un objeto estructurado
// { gameId, gameName, emoji, headline, detail, text } → se guarda meta.game_result
// para renderizar un BLOQUE moderno en el feed con botón "JUGAR".
CGCore.shareResult = async function(payload){
  const c = sb(), u = me();
  if (!c || !u){ toast('Iniciá sesión.','warning'); return; }
  const isObj = payload && typeof payload === 'object';
  const text = isObj ? (payload.text || payload.headline || '¡Jugué en Canchero!') : String(payload||'');
  const base = {
    user_email: u.email, user_name: u.name, user_avatar: u.photo||null, user_role: u.role||'jugador',
    content: text, media_type:'text', likes_count: 0,
    expires_at: new Date(Date.now()+12*3600000).toISOString()
  };
  try {
    if (isObj && payload.gameId){
      const withMeta = Object.assign({}, base, { meta: { game_result: {
        gameId: payload.gameId, gameName: payload.gameName||payload.gameId, emoji: payload.emoji||'🎮',
        headline: payload.headline||'', detail: payload.detail||'', kind: payload.kind||'result'
      } } });
      let r = await c.from('posts').insert(withMeta);
      if (r.error && /meta/.test(r.error.message||'')) r = await c.from('posts').insert(base);
      if (r.error) throw r.error;
    } else {
      const r = await c.from('posts').insert(base);
      if (r.error) throw r.error;
    }
    toast('Resultado publicado en tu perfil 🎉','success');
    try { if (window.loadMainFeed) window.loadMainFeed(); } catch(e){}
  } catch(e){ toast('No se pudo publicar.','error'); }
};

window.CGCore = CGCore;
console.log('[canchero-games-core] ✅ Ranking + desafíos cargado');
})();
