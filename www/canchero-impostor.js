/**
 * canchero-impostor.js — Impostor Futbolero (presencial + online)
 * Presencial: pasás el celu, cada uno ve su rol; debaten en vivo; votan en la app.
 * Online: creás sala con código, invitás, todos ven su tarjeta secreta, chat de
 *   pistas, y votan al impostor. (Realtime por polling cada 3s.)
 */
(function(){
'use strict';
const sb = () => window._sb;
const me = () => window.userData;
function toast(m,t){ if(window.showToast) showToast(m,t); }
function q(b,fb){ return b.then(r=>(r&&!r.error?r:{data:fb}),()=>({data:fb})); }
const WORDS=['Messi','Cristiano Ronaldo','Maradona','Pelé','Ronaldinho','Zidane','Mbappé','Haaland','Neymar','Suárez','Cavani','Iniesta','Modrić','Buffon','Forlán','Riquelme','Recoba','Cristian Rodríguez'];
function _shuffle(a){ return a.map(x=>[Math.random(),x]).sort((p,q)=>p[0]-q[0]).map(p=>p[1]); }
function code4(){ return Math.random().toString(36).slice(2,6).toUpperCase(); }

const _origLaunch = window._launchCancheroGame;
window._launchCancheroGame = function(id){ if(id==='impostor'){ document.getElementById('games-hub')?.remove(); window._impStart(); return; } if(_origLaunch) return _origLaunch(id); };

function shell(html){
  let m=document.getElementById('imp-pro'); if(m)m.remove();
  m=document.createElement('div'); m.id='imp-pro'; m.style.cssText='position:fixed;inset:0;z-index:9960;background:#0a0a0a;display:flex;flex-direction:column;overflow-y:auto;';
  m.innerHTML=html; document.body.appendChild(m);
  ['player-bottom-nav','club-bottom-nav'].forEach(n=>document.getElementById(n)?.style.setProperty('display','none','important'));
}
window._impClose=function(){ clearInterval(window._impPoll); const m=document.getElementById('imp-pro'); if(m)m.remove(); ['player-bottom-nav','club-bottom-nav'].forEach(n=>document.getElementById(n)?.style.removeProperty('display')); if(window.openGamesModal)window.openGamesModal(); };
const back=`<button onclick="window._impClose()" style="background:rgba(255,255,255,0.06);border:none;border-radius:50%;width:36px;height:36px;color:#fff;font-size:18px;cursor:pointer;"><i class='bx bx-arrow-back'></i></button>`;

window._impStart=function(){
  shell(`<div style="flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:max(8px,env(safe-area-inset-top)) 14px 8px;">${back}<div style="font-size:18px;font-weight:900;color:#fff;">🎭 Impostor Futbolero</div></div>
  <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;">
    <div style="font-size:54px;">🕵️</div>
    <div style="color:#aaa;font-size:13px;text-align:center;max-width:320px;">Todos reciben el nombre de un futbolista, menos el <b style="color:#ff4444;">impostor</b>. Den pistas y descubran quién es. Si el impostor adivina el jugador, ¡gana!</div>
    <button onclick="window._impPresencial()" style="width:100%;max-width:300px;background:var(--accent);color:#000;border:none;border-radius:14px;padding:14px;font-weight:900;font-size:14px;cursor:pointer;"><i class='bx bx-group'></i> PRESENCIAL (un solo celu)</button>
    <button onclick="window._impOnlineMenu()" style="width:100%;max-width:300px;background:#1a1a1a;color:#fff;border:1px solid #333;border-radius:14px;padding:14px;font-weight:800;font-size:14px;cursor:pointer;"><i class='bx bx-wifi'></i> ONLINE (invitar amigos)</button>
  </div>`);
};

/* ════ PRESENCIAL ════ */
window._impPresencial=function(){
  shell(`<div style="flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:max(8px,env(safe-area-inset-top)) 14px 8px;">${back}<div style="font-size:16px;font-weight:900;color:#fff;">Presencial</div></div>
  <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;">
    <div style="color:#aaa;font-size:13px;text-align:center;">¿Cuántos juegan? (mínimo 4)</div>
    <input id="imp-n" type="number" min="4" max="12" value="5" style="width:120px;text-align:center;background:#1a1a1a;border:1px solid #333;border-radius:12px;color:#fff;padding:14px;font-size:22px;font-weight:900;">
    <button onclick="window._impDeal()" style="background:var(--accent);color:#000;border:none;border-radius:14px;padding:13px 28px;font-weight:900;cursor:pointer;">REPARTIR ROLES</button>
  </div>`);
};
window._impDeal=function(){
  const n=Math.max(4,Math.min(12,parseInt(document.getElementById('imp-n').value)||4));
  const word=WORDS[Math.floor(Math.random()*WORDS.length)];
  const impostor=Math.floor(Math.random()*n);
  window._impState={n,word,impostor,cur:0,mode:'presencial',votes:{},eliminated:[]};
  _impReveal();
};
function _impReveal(){
  const s=window._impState;
  if(s.cur>=s.n){ return _impDebate(); }
  shell(`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px;text-align:center;">
    <div style="font-size:13px;color:#888;">Pasale el celu al</div>
    <div style="font-size:26px;font-weight:900;color:#fff;">Jugador ${s.cur+1}</div>
    <div id="imp-card"><button onclick="window._impShowCard()" style="background:#1a1a1a;color:#fff;border:1px solid #2a2a2a;border-radius:16px;padding:18px 28px;font-weight:800;font-size:15px;cursor:pointer;"><i class='bx bx-show'></i> Ver mi rol</button></div>
  </div>`);
}
window._impShowCard=function(){
  const s=window._impState; const isImp=s.cur===s.impostor;
  document.getElementById('imp-card').innerHTML=`
    <div style="background:${isImp?'rgba(255,68,68,0.1)':'rgba(186,255,0,0.08)'};border:1px solid ${isImp?'#ff4444':'var(--accent)'};border-radius:16px;padding:24px 28px;margin-bottom:14px;">
      <div style="font-size:11px;color:#888;">Tu rol:</div>
      <div style="font-size:26px;font-weight:900;color:${isImp?'#ff4444':'var(--accent)'};margin-top:4px;">${isImp?'🤫 IMPOSTOR':s.word}</div>
      <div style="font-size:12px;color:#888;margin-top:8px;">${isImp?'No sabés el jugador. Disimulá con pistas vagas.':'Dá una pista sin decir el nombre.'}</div>
    </div>
    <button onclick="window._impNextCard()" style="background:var(--accent);color:#000;border:none;border-radius:12px;padding:11px 22px;font-weight:900;cursor:pointer;">Ocultar y pasar →</button>`;
};
window._impNextCard=function(){ window._impState.cur++; _impReveal(); };
function _impDebate(){
  const s=window._impState;
  const alive=[...Array(s.n).keys()].filter(i=>!s.eliminated.includes(i));
  shell(`<div style="flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:max(8px,env(safe-area-inset-top)) 14px 8px;">${back}<div style="font-size:16px;font-weight:900;color:#fff;">Votación</div></div>
  <div style="flex:1;padding:20px 16px;">
    <div style="background:#0d120d;border:1px solid #1f2a14;border-radius:12px;padding:14px;margin-bottom:16px;font-size:13px;color:#aaa;text-align:center;">Debatan en voz alta dando pistas. Cuando estén listos, <b style="color:#fff;">voten quién creen que es el impostor</b>.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      ${alive.map(i=>`<button onclick="window._impVotePres(${i})" style="background:#111;border:1px solid #2a2a2a;color:#fff;border-radius:12px;padding:16px;font-weight:800;cursor:pointer;">Jugador ${i+1}</button>`).join('')}
    </div>
  </div>`);
}
window._impVotePres=function(i){
  const s=window._impState;
  if(i===s.impostor){
    _impResult(true, s.impostor, s.word);
  } else {
    s.eliminated.push(i);
    const alive=[...Array(s.n).keys()].filter(x=>!s.eliminated.includes(x));
    if(alive.length<=2){ _impResult(false, s.impostor, s.word); }
    else { toast(`Jugador ${i+1} no era el impostor. ¡Queda eliminado!`,'info'); _impDebate(); }
  }
};
function _impResult(caught, impIdx, word){
  shell(`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;">
    <div style="font-size:60px;">${caught?'🎯':'🤫'}</div>
    <div style="font-size:22px;font-weight:900;color:${caught?'var(--accent)':'#ff4444'};">${caught?'¡Atraparon al impostor!':'¡El impostor ganó!'}</div>
    <div style="font-size:14px;color:#aaa;">El impostor era el <b style="color:#fff;">Jugador ${impIdx+1}</b>.<br>El jugador secreto era <b style="color:var(--accent);">${word}</b>.</div>
    <div style="display:flex;gap:10px;margin-top:10px;">
      <button onclick="window._impPresencial()" style="background:var(--accent);color:#000;border:none;border-radius:14px;padding:12px 22px;font-weight:900;cursor:pointer;">🔄 Otra ronda</button>
    </div>
    <button onclick="window._impClose()" style="margin-top:10px;background:none;border:none;color:#888;font-size:13px;cursor:pointer;">← Volver a Juegos</button>
  </div>`);
}

/* ════ ONLINE ════ */
window._impOnlineMenu=function(){
  if(!me()){ toast('Iniciá sesión para jugar online','error'); return; }
  shell(`<div style="flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:max(8px,env(safe-area-inset-top)) 14px 8px;">${back}<div style="font-size:16px;font-weight:900;color:#fff;">Online</div></div>
  <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;">
    <button onclick="window._impCreateRoom()" style="width:100%;max-width:300px;background:var(--accent);color:#000;border:none;border-radius:14px;padding:14px;font-weight:900;cursor:pointer;"><i class='bx bx-plus-circle'></i> CREAR SALA</button>
    <div style="color:#666;font-size:12px;">o uníte con un código</div>
    <div style="display:flex;gap:8px;width:100%;max-width:300px;">
      <input id="imp-code" placeholder="CÓDIGO" maxlength="4" style="flex:1;text-transform:uppercase;background:#1a1a1a;border:1px solid #333;border-radius:12px;color:#fff;padding:12px;font-size:18px;font-weight:900;text-align:center;letter-spacing:3px;">
      <button onclick="window._impJoinRoom()" style="background:#1a1a1a;color:#fff;border:1px solid #333;border-radius:12px;padding:12px 18px;font-weight:800;cursor:pointer;">UNIRME</button>
    </div>
  </div>`);
};
window._impCreateRoom=async function(){
  const c=code4();
  const r=await q(sb().from('game_rooms').insert({game:'impostor',host_email:me().email,host_name:me().name||me().email,status:'esperando',mode:'online',state:{code:c,phase:'lobby'},created_at:new Date().toISOString()}).select().single(),null);
  if(!r.data){ toast('No se pudo crear la sala','error'); return; }
  window._impRoom=r.data.id; window._impCode=c;
  await q(sb().from('game_players').upsert({room_id:r.data.id,user_email:me().email,user_name:me().name||me().email,accepted:true},{onConflict:'room_id,user_email'}),null);
  _impLobby();
};
window._impJoinRoom=async function(){
  const c=(document.getElementById('imp-code')?.value||'').toUpperCase().trim(); if(c.length<4){toast('Código inválido','error');return;}
  const r=await q(sb().from('game_rooms').select('*').eq('game','impostor').eq('status','esperando').limit(50),[]);
  const room=(r.data||[]).find(x=>(x.state&&x.state.code)===c);
  if(!room){ toast('Sala no encontrada','error'); return; }
  window._impRoom=room.id; window._impCode=c;
  await q(sb().from('game_players').upsert({room_id:room.id,user_email:me().email,user_name:me().name||me().email,accepted:true},{onConflict:'room_id,user_email'}),null);
  _impLobby();
};
async function _impLoadRoom(){ const r=await q(sb().from('game_rooms').select('*').eq('id',window._impRoom).single(),null); const p=await q(sb().from('game_players').select('*').eq('room_id',window._impRoom),[]); return {room:r.data, players:p.data||[]}; }

async function _impLobby(){
  const {room,players}=await _impLoadRoom(); if(!room)return;
  const isHost=room.host_email===me().email;
  if(room.status==='en_curso') return _impGame();
  shell(`<div style="flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:max(8px,env(safe-area-inset-top)) 14px 8px;">${back}<div style="font-size:16px;font-weight:900;color:#fff;">Sala de Impostor</div></div>
  <div style="flex:1;padding:20px 16px;text-align:center;">
    <div style="font-size:12px;color:#888;">CÓDIGO DE LA SALA</div>
    <div style="font-size:40px;font-weight:900;color:var(--accent);letter-spacing:8px;margin:4px 0 4px;">${window._impCode}</div>
    <button onclick="navigator.clipboard&&navigator.clipboard.writeText('${window._impCode}');window.showToast&&showToast('Código copiado','success')" style="background:rgba(186,255,0,0.06);color:var(--accent);border:1px solid rgba(186,255,0,0.25);border-radius:18px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;margin-bottom:18px;"><i class='bx bx-copy'></i> Copiar y compartir</button>
    <div style="font-size:11px;color:#888;font-weight:800;letter-spacing:1px;margin-bottom:10px;text-align:left;">JUGADORES (${players.length}/4 mín.)</div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${players.map(p=>`<div style="display:flex;align-items:center;gap:10px;background:#111;border:1px solid #1e1e1e;border-radius:12px;padding:11px 14px;"><div style="width:32px;height:32px;border-radius:50%;background:#1a3a1a;display:flex;align-items:center;justify-content:center;color:var(--accent);font-weight:900;">${(p.user_name||'?')[0].toUpperCase()}</div><span style="font-size:14px;color:#fff;font-weight:700;">${p.user_name||p.user_email}</span>${p.user_email===room.host_email?'<span style="margin-left:auto;font-size:9px;color:#ffd700;font-weight:800;">HOST</span>':''}</div>`).join('')}
    </div>
    ${isHost?`<button onclick="window._impStartGame()" ${players.length<4?'disabled':''} style="width:100%;margin-top:18px;background:${players.length>=4?'var(--accent)':'#1a1a1a'};color:${players.length>=4?'#000':'#555'};border:none;border-radius:14px;padding:14px;font-weight:900;cursor:${players.length>=4?'pointer':'default'};">${players.length>=4?'▶ EMPEZAR PARTIDA':'Esperando jugadores (mín. 4)'}</button>`:`<div style="margin-top:18px;color:#888;font-size:13px;">Esperando que el host inicie...</div>`}
  </div>`);
  clearInterval(window._impPoll); window._impPoll=setInterval(()=>{ if(document.getElementById('imp-pro')) _impLobbyRefresh(); },3000);
}
async function _impLobbyRefresh(){ const {room}=await _impLoadRoom(); if(room&&room.status==='en_curso'){ _impGame(); } else { _impLobby(); } }

window._impStartGame=async function(){
  const {players}=await _impLoadRoom(); if(players.length<4){toast('Faltan jugadores','info');return;}
  const word=WORDS[Math.floor(Math.random()*WORDS.length)];
  const order=_shuffle(players.map(p=>p.user_email));
  const impostor=order[0];
  // asignar roles
  for(const p of players){ await q(sb().from('game_players').update({role:p.user_email===impostor?'IMPOSTOR':word, eliminated:false}).eq('room_id',window._impRoom).eq('user_email',p.user_email),null); }
  await q(sb().from('game_rooms').update({status:'en_curso', state:{code:window._impCode,phase:'pistas',word,impostor,round:1,votes:{}}}).eq('id',window._impRoom),null);
  _impGame();
};

async function _impGame(){
  const {room,players}=await _impLoadRoom(); if(!room)return;
  const st=room.state||{};
  const mine=players.find(p=>p.user_email===me().email);
  const isImp=mine&&mine.role==='IMPOSTOR';
  const alive=players.filter(p=>!p.eliminated);
  const msgs=(await q(sb().from('game_messages').select('*').eq('room_id',window._impRoom).order('created_at',{ascending:true}).limit(100),[])).data;
  const amElim=mine&&mine.eliminated;
  shell(`<div style="flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:max(8px,env(safe-area-inset-top)) 14px 8px;border-bottom:1px solid #1a1a1a;">${back}<div style="flex:1;"><div style="font-size:15px;font-weight:900;color:#fff;">🎭 Impostor · Ronda ${st.round||1}</div><div style="font-size:11px;color:#888;">${amElim?'Estás eliminado (mirás desde afuera)':'Dá pistas y votá'}</div></div>
    <button onclick="window._impShowMyCard()" style="background:rgba(186,255,0,0.08);color:var(--accent);border:1px solid rgba(186,255,0,0.25);border-radius:18px;padding:7px 12px;font-size:11px;font-weight:800;cursor:pointer;">Mi tarjeta</button></div>
  <div id="imp-chat" style="flex:1 1 auto;min-height:0;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:8px;">
    ${msgs.map(c=>c.kind==='vote'?`<div style="text-align:center;font-size:11px;color:#888;">🗳️ ${c.text}</div>`:`<div style="background:#141414;border-radius:12px;padding:9px 12px;align-self:${c.user_email===me().email?'flex-end':'flex-start'};max-width:80%;"><div style="font-size:11px;color:var(--accent);font-weight:700;">${c.user_name||'Jugador'}</div><div style="font-size:14px;color:#ddd;">${(c.text||'').replace(/</g,'&lt;')}</div></div>`).join('')||'<div style="text-align:center;color:#555;padding:20px;font-size:13px;">Den pistas sobre el jugador (sin decir el nombre).</div>'}
  </div>
  <div style="flex:0 0 auto;padding:8px 14px;border-top:1px solid #1a1a1a;">
    <div style="font-size:10px;color:#888;font-weight:800;margin-bottom:6px;">VOTÁ AL IMPOSTOR:</div>
    <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;">
      ${alive.filter(p=>p.user_email!==me().email).map(p=>`<button onclick="window._impVote('${p.user_email}')" ${amElim?'disabled':''} style="flex-shrink:0;background:#1a1a1a;border:1px solid #2a2a2a;color:#fff;border-radius:16px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;">${(p.user_name||p.user_email).split(' ')[0]}</button>`).join('')}
    </div>
    ${isImp&&!amElim?`<button onclick="window._impGuess()" style="width:100%;margin:6px 0;background:rgba(255,68,68,0.12);color:#ff4444;border:1px solid rgba(255,68,68,0.3);border-radius:10px;padding:9px;font-weight:800;font-size:12px;cursor:pointer;">🤫 Soy el impostor: adivinar el jugador</button>`:''}
    ${amElim?'':`<div style="display:flex;gap:8px;margin-top:4px;"><input id="imp-msg" placeholder="Tu pista..." onkeydown="if(event.key==='Enter')window._impSend()" style="flex:1;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:18px;color:#fff;padding:9px 14px;font-size:14px;outline:none;"><button onclick="window._impSend()" style="background:var(--accent);color:#000;border:none;border-radius:50%;width:40px;height:40px;cursor:pointer;"><i class='bx bx-send'></i></button></div>`}
  </div>`);
  const box=document.getElementById('imp-chat'); if(box)box.scrollTop=box.scrollHeight;
  clearInterval(window._impPoll); window._impPoll=setInterval(()=>{ if(document.getElementById('imp-pro')&&document.getElementById('imp-chat')) _impGameRefresh(); },3000);
}
async function _impGameRefresh(){ const {room}=await _impLoadRoom(); if(room&&room.state&&room.state.phase==='fin'){ _impOnlineResult(room.state); return; } _impGame(); }
window._impShowMyCard=async function(){
  const {players}=await _impLoadRoom(); const mine=players.find(p=>p.user_email===me().email); if(!mine)return;
  const isImp=mine.role==='IMPOSTOR';
  let s=document.createElement('div'); s.style.cssText='position:fixed;inset:0;z-index:30090;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:24px;'; s.onclick=()=>s.remove();
  s.innerHTML=`<div style="background:${isImp?'rgba(255,68,68,0.1)':'rgba(186,255,0,0.08)'};border:2px solid ${isImp?'#ff4444':'var(--accent)'};border-radius:18px;padding:30px;text-align:center;"><div style="font-size:11px;color:#888;">Tu rol secreto</div><div style="font-size:28px;font-weight:900;color:${isImp?'#ff4444':'var(--accent)'};margin-top:6px;">${isImp?'🤫 IMPOSTOR':mine.role}</div></div>`;
  document.body.appendChild(s);
};
window._impSend=async function(){ const t=document.getElementById('imp-msg')?.value?.trim(); if(!t)return; document.getElementById('imp-msg').value=''; await q(sb().from('game_messages').insert({room_id:window._impRoom,user_email:me().email,user_name:me().name||me().email,kind:'chat',text:t}),null); _impGame(); };
window._impVote=async function(email){
  const {room,players}=await _impLoadRoom(); const st=room.state||{}; st.votes=st.votes||{}; st.votes[me().email]=email;
  await q(sb().from('game_messages').insert({room_id:window._impRoom,user_email:me().email,user_name:me().name,kind:'vote',text:`${me().name||'Alguien'} votó`}),null);
  // contar votos de vivos
  const alive=players.filter(p=>!p.eliminated);
  const voters=Object.keys(st.votes).filter(e=>alive.find(p=>p.user_email===e));
  if(voters.length>=alive.length){
    // tally
    const tally={}; Object.values(st.votes).forEach(v=>tally[v]=(tally[v]||0)+1);
    const top=Object.entries(tally).sort((a,b)=>b[1]-a[1])[0];
    const elimEmail=top[0];
    if(elimEmail===st.impostor){ st.phase='fin'; st.result='caught'; }
    else {
      await q(sb().from('game_players').update({eliminated:true}).eq('room_id',window._impRoom).eq('user_email',elimEmail),null);
      const remaining=alive.filter(p=>p.user_email!==elimEmail);
      if(remaining.length<=2){ st.phase='fin'; st.result='impostor'; }
      else { st.round=(st.round||1)+1; st.votes={}; }
    }
    await q(sb().from('game_rooms').update({state:st}).eq('id',window._impRoom),null);
  } else {
    await q(sb().from('game_rooms').update({state:st}).eq('id',window._impRoom),null);
  }
  _impGame();
};
window._impGuess=async function(){
  const g=prompt('¿Quién es el jugador secreto?'); if(!g)return;
  const {room}=await _impLoadRoom(); const st=room.state||{};
  if((g||'').toLowerCase().includes((st.word||'').toLowerCase().split(' ')[0].toLowerCase())){ st.phase='fin'; st.result='impostor_guess'; await q(sb().from('game_rooms').update({state:st}).eq('id',window._impRoom),null); _impOnlineResult(st); }
  else { toast('No es. Seguí disimulando.','info'); }
};
function _impOnlineResult(st){
  clearInterval(window._impPoll);
  const groupWon=st.result==='caught';
  shell(`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;">
    <div style="font-size:60px;">${groupWon?'🎯':'🤫'}</div>
    <div style="font-size:22px;font-weight:900;color:${groupWon?'var(--accent)':'#ff4444'};">${groupWon?'¡Atraparon al impostor!':'¡Ganó el impostor!'}</div>
    <div style="font-size:14px;color:#aaa;">El jugador secreto era <b style="color:var(--accent);">${st.word}</b>.</div>
    <button onclick="window._impClose()" style="margin-top:14px;background:var(--accent);color:#000;border:none;border-radius:14px;padding:12px 24px;font-weight:900;cursor:pointer;">Volver a Juegos</button>
  </div>`);
}

console.log('[canchero-impostor] ✅ Impostor Futbolero (presencial + online) cargado');
})();
