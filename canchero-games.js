/**
 * canchero-games.js — HUB DE JUEGOS
 * - Pantalla de selección con 5 juegos (badges jugable/embebido/online/presencial).
 * - Embebidos: Tiros Libres (Baggio) y Cabezones (iframe existente).
 * - Nativo jugable: "Adivina el Jugador" (solo, por rondas, con pistas y puntaje).
 * - Impostor Futbolero y 11 Ideal: base preparada (presencial) — marcados como beta.
 * No rompe el acceso actual a Baggio (reusa launchGame).
 */
(function(){
'use strict';
function toast(m,t){ if(window.showToast) showToast(m,t); }

// Altura del header de la app (logo + campana + ajustes) — los modales de juegos
// arrancan debajo para que el header quede siempre visible.
function _cgTop(){
  try {
    const nav = document.getElementById('main-nav');
    if (nav) {
      const cs = getComputedStyle(nav);
      const r = nav.getBoundingClientRect();
      if (cs.display !== 'none' && cs.visibility !== 'hidden' && r.height > 0 && r.bottom > 0) return Math.round(r.bottom) + 'px';
    }
  } catch(e){}
  return '0px';
}

// Tiros Libres retirado (2026-08-01). Se agregan Trivia (tipo Preguntados de fútbol) y
// Modo Carrera (tipo Copero, más adictivo) — implementación nativa en progreso.
const GAMES = [
  { id:'trivia', name:'Trivia Futbolera', emoji:'🧠', desc:'Preguntados de fútbol: escudos, jugadores y datos. Niveles y ranking.', badges:['Nuevo','Online'], type:'native' },
  { id:'carrera', name:'Modo Carrera', emoji:'🌟', desc:'Empezá en el potrero y llegá a lo más alto. Decisiones, fichajes y títulos.', badges:['Nuevo','Online'], type:'native' },
  { id:'adivina', name:'Adivina el Jugador', emoji:'🕵️', desc:'¿Quién es? Adiviná por las pistas. Duelo de conocimiento.', badges:['Jugable','Solo / Presencial'], type:'native' },
  { id:'impostor', name:'Impostor Futbolero', emoji:'🎭', desc:'Encontrá al impostor. Mínimo 4 jugadores (presencial).', badges:['Beta','Presencial'], type:'native' },
  { id:'once-ideal', name:'11 Ideal', emoji:'📋', desc:'Armá tu once ideal y compará.', badges:['Beta','Presencial'], type:'native' },
  { id:'higher-lower', name:'Más o Menos', emoji:'📈', desc:'¿Fichaje más caro? ¿Más títulos? Adiviná entre dos cracks.', badges:['Jugable','Online'], type:'native' },
];

/* Portadas con FOTO por juego (img/games/) */
/* Portadas diseñadas (premium, sin fotos de stock): gradiente + icono grande
   + patrón sutil. Cabezones mantiene su arte. */
function _cover(grad, icon, title, sub){
  return `<div style="width:100%;height:100%;position:relative;background:${grad};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;overflow:hidden;">
    <div style="position:absolute;inset:0;background-image:radial-gradient(circle at 80% 15%, rgba(255,255,255,0.14), transparent 45%), radial-gradient(circle at 15% 85%, rgba(0,0,0,0.3), transparent 50%);"></div>
    <div style="position:absolute;top:-22px;right:-18px;font-size:110px;opacity:0.12;transform:rotate(18deg);line-height:1;"><i class='bx ${icon}'></i></div>
    <i class='bx ${icon}' style="position:relative;font-size:38px;color:#fff;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.4));"></i>
    <div style="position:relative;font-weight:900;font-size:14px;color:#fff;letter-spacing:1px;text-shadow:0 2px 6px rgba(0,0,0,0.5);">${title}</div>
    <div style="position:relative;font-size:9px;font-weight:800;letter-spacing:2px;color:rgba(255,255,255,0.75);">${sub}</div>
  </div>`;
}
// Portada con imagen real del juego (img/games/), con respaldo a gradiente si falla.
function _coverImg(file, fallbackGrad, icon, title, sub){
  return `<div style="width:100%;height:100%;background:#0a0a0a url('img/games/${file}') center/cover no-repeat;"></div>`;
}
const GAME_ART = {
  'trivia': _coverImg('trivia.png'),
  'carrera': _coverImg('carrera.png'),
  'adivina': _coverImg('adivina.png'),
  'impostor': _coverImg('impostor.png'),
  'once-ideal': _coverImg('once-ideal.png'),
  'higher-lower': _coverImg('higher-lower.png')
};

const EMBED_URLS = {
  'tiros-libres': 'https://magical-kicks.netlify.app/',
};

/* Renderiza el hub DENTRO de la pestaña #jugador-juegos (deslizable como
   cualquier sección). Si la pestaña no existe (rol club, etc.) cae al
   overlay fijo de siempre. */
window._renderGamesHub = function(container){
  let m = document.getElementById('games-hub');
  if (m) m.remove();
  m = document.createElement('div'); m.id='games-hub';
  if (container){
    m.style.cssText='background:#0a0a0a;min-height:60vh;padding-bottom:calc(90px + env(safe-area-inset-bottom));';
  } else {
    m.style.cssText='position:fixed;left:0;right:0;bottom:0;top:'+_cgTop()+';z-index:9900;background:#0a0a0a;overflow-y:auto;';
  }
  const badgeColor = b => b==='Jugable'?'#00e676':b==='Embebido'?'#64b4ff':b==='Beta'?'#ffaa00':b.includes('Online')?'#9c88ff':'#aaa';
  m.innerHTML = `
    <div style="padding:14px 16px 4px;display:flex;align-items:center;gap:10px;">
      ${container?'':`<button onclick="document.getElementById('games-hub').remove()" style="background:rgba(255,255,255,0.06);border:1px solid #2a2a2a;border-radius:50%;width:36px;height:36px;color:#fff;font-size:18px;cursor:pointer;flex-shrink:0;"><i class='bx bx-arrow-back'></i></button>`}
      <h2 class="panel-title pt-mundial" style="margin:0;"><i class='bx bx-joystick'></i><span class="pt-text"><span class="pt-main">JUEGOS</span><span class="pt-sub">Jugá y subí en el ranking de Canchero</span></span></h2>
    </div>
    <div id="cg-challenges-banner" style="padding:14px 16px 0;"></div>
    <div style="padding:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;">
      ${GAMES.map(g=>`<div onclick="window._launchCancheroGame('${g.id}')" style="background:#0d0d0d;border:1px solid #1c1c1c;border-radius:18px;overflow:hidden;cursor:pointer;transition:.18s;display:flex;flex-direction:column;" onmouseover="this.style.borderColor='rgba(186,255,0,0.45)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='#1c1c1c';this.style.transform='none'">
        <div style="position:relative;aspect-ratio:16/9;overflow:hidden;">${GAME_ART[g.id]||''}
          <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,rgba(0,0,0,0.55));"></div>
          <div style="position:absolute;bottom:8px;right:8px;width:30px;height:30px;border-radius:50%;background:rgba(186,255,0,0.92);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.5);"><i class='bx bx-play' style="color:#000;font-size:19px;margin-left:1px;"></i></div>
          ${(g.id==='adivina'||g.id==='once-ideal'||g.id==='higher-lower') ? `<button onclick="event.stopPropagation();window.CGCore&&CGCore.openRanking('${g.id}')" title="Ranking" style="position:absolute;top:8px;right:8px;width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,0.55);border:1px solid rgba(255,215,0,0.5);display:flex;align-items:center;justify-content:center;cursor:pointer;"><i class='bx bx-trophy' style="color:#FFD700;font-size:14px;"></i></button>` : ''}
        </div>
        <div style="padding:11px 12px 12px;display:flex;flex-direction:column;gap:5px;flex:1;">
          <div style="font-weight:900;font-size:13.5px;color:#fff;line-height:1.2;">${g.name}</div>
          <div style="font-size:11px;color:#888;line-height:1.4;flex:1;">${g.desc}</div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;">${g.badges.map(b=>`<span style="font-size:8.5px;font-weight:800;color:${badgeColor(b)};background:${badgeColor(b)}22;padding:2px 7px;border-radius:8px;letter-spacing:.4px;">${b.toUpperCase()}</span>`).join('')}</div>
        </div>
      </div>`).join('')}
    </div>
    <div style="padding:0 16px calc(90px + env(safe-area-inset-bottom));text-align:center;color:#555;font-size:11px;">Modo online con salas y desafíos: próximamente.</div>`;
  if (container){ container.innerHTML=''; container.appendChild(m); }
  else document.body.appendChild(m);
  // Desafíos pendientes / expirados (ranking + duelos)
  try { if (window.CGCore) CGCore.renderChallengesBanner('cg-challenges-banner'); } catch(e){}
};

window.openGamesModal = function(){
  // El header de la app (logo + campana + ajustes) debe verse SIEMPRE en Juegos
  try { const nav = document.getElementById('main-nav'); if (nav && getComputedStyle(nav).display === 'none') nav.style.display = 'flex'; } catch(e){}
  const tab = document.getElementById('jugador-juegos');
  const viewJugador = document.getElementById('view-jugador');
  const jugadorVisible = viewJugador && viewJugador.style.display !== 'none';
  if (tab && jugadorVisible){
    window._renderGamesHub(tab);
    // Mostrar la pestaña SIN pasar por switchDashboardTab (cierra games-hub)
    viewJugador.querySelectorAll('.dashboard-tab-content').forEach(t=>{ t.style.display='none'; });
    tab.style.display='block';
    try { localStorage.setItem('canchero_last_tab', JSON.stringify({dashboard:'jugador', tab:'juegos', menuIndex:-1})); } catch(e){}
    try { window._ruleta2SyncById && window._ruleta2SyncById('juegos'); } catch(e){}
    try { window.scrollTo(0,0); } catch(e){}
  } else {
    window._renderGamesHub(null);
  }
};

window._launchCancheroGame = function(id){
  const g = GAMES.find(x=>x.id===id);
  if (!g) return;
  if (g.type==='embed'){
    document.getElementById('games-hub')?.remove();
    _embedGame(id, g.name);
  } else if (id==='adivina'){
    // usar la versión PRO global si existe (canchero-adivina.js)
    if (window._adivinaProStart){ document.getElementById('games-hub')?.remove(); window._adivinaProStart(); } else _adivinaStart();
  } else if (id==='impostor'){
    if (window._impStart){ document.getElementById('games-hub')?.remove(); window._impStart(); } else _impostorStart();
  } else if (id==='once-ideal'){
    // usar la versión con ruletas + cancha (canchero-once-ideal.js), no la local básica
    if (window._onceStart && window._onceStart !== _onceStart) window._onceStart();
    else _onceStart();
  } else if (id==='higher-lower'){
    if (window._higherLowerStart){ document.getElementById('games-hub')?.remove(); window._higherLowerStart(); }
  } else if (id==='trivia'){
    if (window._triviaStart){ document.getElementById('games-hub')?.remove(); window._triviaStart(); }
    else _gameComingSoon('Trivia Futbolera', '🧠', 'Preguntados de fútbol: adiviná escudos y jugadores por foto, subí de nivel y competí en el ranking. ¡Muy pronto!');
  } else if (id==='carrera'){
    if (window._carreraStart){ document.getElementById('games-hub')?.remove(); window._carreraStart(); }
    else _gameComingSoon('Modo Carrera', '🌟', 'Empezá en un club de barrio o jugando en la calle, hacete ver por un ojeador y escalá hasta la elite. Decisiones futbolísticas, económicas y sociales. ¡En construcción!');
  }
};

// Pantalla "Próximamente" para juegos en construcción (Trivia, Carrera).
function _gameComingSoon(name, emoji, desc){
  let m = document.getElementById('game-soon-modal'); if (m) m.remove();
  m = document.createElement('div'); m.id = 'game-soon-modal';
  m.style.cssText = 'position:fixed;inset:0;z-index:9970;background:rgba(0,0,0,0.9);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:24px;';
  m.innerHTML = `<div style="max-width:380px;text-align:center;background:linear-gradient(160deg,#101410,#0a0a0a);border:1px solid rgba(186,255,0,0.25);border-radius:22px;padding:32px 24px;box-shadow:0 20px 60px rgba(0,0,0,0.7);">
    <div style="font-size:52px;line-height:1;margin-bottom:12px;">${emoji}</div>
    <div style="font-family:'Outfit',sans-serif;font-size:22px;font-weight:900;color:#fff;margin-bottom:8px;">${name}</div>
    <div style="display:inline-block;font-size:10px;font-weight:900;letter-spacing:2px;color:var(--accent);background:rgba(186,255,0,0.1);border:1px solid rgba(186,255,0,0.3);padding:4px 12px;border-radius:20px;margin-bottom:16px;">PRÓXIMAMENTE</div>
    <div style="font-size:13.5px;color:#aaa;line-height:1.55;margin-bottom:22px;">${desc}</div>
    <button onclick="document.getElementById('game-soon-modal').remove();window.openGamesModal&&window.openGamesModal()" style="background:var(--accent);color:#000;border:none;border-radius:14px;padding:12px 26px;font-weight:900;font-size:14px;cursor:pointer;">← Volver a Juegos</button>
  </div>`;
  m.addEventListener('click', e => { if (e.target === m) m.remove(); });
  document.body.appendChild(m);
}

function _embedGame(id, name){
  let p = document.getElementById('cg-player'); if(p)p.remove();
  p = document.createElement('div'); p.id='cg-player';
  // Pantalla completa real: ocultar la barra inferior para que no corte el juego
  ['player-bottom-nav','club-bottom-nav'].forEach(n=>document.getElementById(n)?.style.setProperty('display','none','important'));
  p.style.cssText='position:fixed;left:0;right:0;bottom:0;top:'+_cgTop()+';z-index:9950;background:#000;display:flex;flex-direction:column;';
  var _url = EMBED_URLS[id]||'';
  p.innerHTML=`<div style="display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top,0px) + 8px) 12px 8px;background:#0a0a0a;flex-shrink:0;">
      <button onclick="window._cgCloseEmbed()" style="background:rgba(255,255,255,0.08);border:none;border-radius:50%;width:36px;height:36px;color:#fff;font-size:18px;cursor:pointer;"><i class='bx bx-arrow-back'></i></button>
      <div style="font-weight:800;color:#fff;font-size:14px;flex:1;">${name}</div>
      <button onclick="window.open('${_url}','_blank')" title="Abrir en pantalla completa" style="background:rgba(186,255,0,0.12);border:1px solid var(--accent);border-radius:10px;padding:7px 12px;color:var(--accent);font-size:12px;font-weight:800;cursor:pointer;"><i class='bx bx-link-external'></i></button></div>
    <div id="cg-embed-wrap" style="position:relative;flex:1;">
      <div id="cg-embed-loading" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#000;color:#888;z-index:2;text-align:center;padding:24px;">
        <i class='bx bx-loader-alt bx-spin' style="font-size:40px;color:var(--accent);"></i>
        <div style="font-size:13px;">Cargando el juego…</div>
        <div style="font-size:11px;color:#666;max-width:280px;">Es un juego clásico (Flash) que puede tardar unos segundos. Si no carga, abrilo en pantalla completa.</div>
        <button onclick="window.open('${_url}','_blank')" style="background:var(--accent);color:#000;border:none;border-radius:12px;padding:11px 18px;font-weight:900;font-size:13px;cursor:pointer;"><i class='bx bx-link-external'></i> ABRIR EN PANTALLA COMPLETA</button>
      </div>
      <iframe src="${_url}" allow="autoplay; fullscreen" allowfullscreen onload="var l=document.getElementById('cg-embed-loading');if(l)setTimeout(function(){l.style.display='none';},1200);" style="width:100%;height:100%;border:0;background:#000;padding-bottom:env(safe-area-inset-bottom,0px);"></iframe>
    </div>`;
  document.body.appendChild(p);
}
window._cgCloseEmbed = function(){
  document.getElementById('cg-player')?.remove();
  ['player-bottom-nav','club-bottom-nav'].forEach(n=>document.getElementById(n)?.style.removeProperty('display'));
  window.openGamesModal && window.openGamesModal();
};

/* ════════════ ADIVINA EL JUGADOR (nativo, jugable) ════════════ */
const PLAYERS = [
  { n:'Lionel Messi', clues:['🇦🇷 Argentino','Campeón del mundo 2022','Histórico del Barcelona','8 Balones de Oro','Apodo: La Pulga'] },
  { n:'Cristiano Ronaldo', clues:['🇵🇹 Portugués','5 Champions','Jugó en Madrid y United','Récord goleador histórico','Apodo: CR7'] },
  { n:'Luis Suárez', clues:['🇺🇾 Uruguayo','Goleador histórico de la Celeste','Jugó en Liverpool y Barça','Apodo: El Pistolero','Mordió rivales'] },
  { n:'Diego Forlán', clues:['🇺🇾 Uruguayo','MVP del Mundial 2010','Jugó en Atlético de Madrid','Goleador zurdo','Hijo de Pablo Forlán'] },
  { n:'Kylian Mbappé', clues:['🇫🇷 Francés','Campeón del mundo 2018','Velocidad extrema','Jugó en PSG','Hat-trick en final del Mundial'] },
  { n:'Neymar', clues:['🇧🇷 Brasileño','Jugó en Santos, Barça y PSG','Gambeta y lujo','Apodo: Ney','Récord goleador de Brasil'] },
  { n:'Erling Haaland', clues:['🇳🇴 Noruego','Killer del área','Jugó en Dortmund','Llegó al Manchester City','Hijo de exfutbolista'] },
  { n:'Edinson Cavani', clues:['🇺🇾 Uruguayo','Apodo: El Matador','Goleador del PSG','Dupla con Suárez','Sacrificio y gol'] },
  { n:'Ronaldinho', clues:['🇧🇷 Brasileño','Magia y sonrisa','Balón de Oro 2005','Barcelona y Milan','Elásticos imposibles'] },
  { n:'Vinícius Júnior', clues:['🇧🇷 Brasileño','Extremo del Real Madrid','Velocidad y regate','Camiseta 7','Decisivo en Champions'] },
];
let _adv = null;
function _shuffle(a){ return a.map(x=>[Math.random(),x]).sort((p,q)=>p[0]-q[0]).map(p=>p[1]); }

function _adivinaStart(){
  document.getElementById('games-hub')?.remove();
  _adv = { round:0, score:0, total:5, t:0, pool:_shuffle([...PLAYERS]).slice(0,5) };
  _adivinaRound();
}
function _adivinaRound(){
  if (_adv.round >= _adv.total) return _adivinaEnd();
  const target = _adv.pool[_adv.round];
  const others = _shuffle(PLAYERS.filter(p=>p.n!==target.n)).slice(0,3);
  const options = _shuffle([target, ...others]);
  _adv.cluesShown = 1; _adv.answered=false; _adv.t = Date.now();
  let m = document.getElementById('adivina-modal'); if(m)m.remove();
  m=document.createElement('div'); m.id='adivina-modal';
  m.style.cssText='position:fixed;inset:0;z-index:9960;background:#0a0a0a;display:flex;flex-direction:column;';
  m.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #1a1a1a;">
      <button onclick="document.getElementById('adivina-modal').remove();window.openGamesModal()" style="background:rgba(255,255,255,0.06);border:none;border-radius:50%;width:34px;height:34px;color:#fff;cursor:pointer;"><i class='bx bx-x'></i></button>
      <div style="font-size:13px;font-weight:800;color:#fff;">Ronda ${_adv.round+1}/${_adv.total}</div>
      <div style="font-size:13px;font-weight:900;color:var(--accent);">⭐ ${_adv.score}</div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;">
      <div style="font-size:70px;margin-bottom:10px;filter:drop-shadow(0 0 20px rgba(186,255,0,0.3));">🕵️</div>
      <div style="font-size:12px;color:#888;letter-spacing:1px;margin-bottom:14px;">¿QUIÉN ES ESTE JUGADOR?</div>
      <div id="adv-clues" style="display:flex;flex-direction:column;gap:6px;align-items:center;margin-bottom:18px;min-height:60px;"></div>
      <button id="adv-more" onclick="window._advMoreClue()" style="background:rgba(186,255,0,0.06);color:var(--accent);border:1px solid rgba(186,255,0,0.25);border-radius:20px;padding:7px 16px;font-size:12px;font-weight:700;cursor:pointer;margin-bottom:18px;">+ Pista (resta puntos)</button>
      <div id="adv-options" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;max-width:420px;">
        ${options.map(o=>`<button onclick="window._advAnswer(this,'${o.n.replace(/'/g,"\\'")}','${target.n.replace(/'/g,"\\'")}')" style="background:#141414;border:1px solid #2a2a2a;color:#fff;border-radius:12px;padding:14px 10px;font-size:13px;font-weight:700;cursor:pointer;">${o.n}</button>`).join('')}
      </div>
    </div>`;
  document.body.appendChild(m);
  window._advTarget = target;
  _advRenderClues();
}
function _advRenderClues(){
  const box=document.getElementById('adv-clues'); if(!box)return;
  box.innerHTML = _advTarget.clues.slice(0,_adv.cluesShown).map(c=>`<div style="background:#141414;border:1px solid #233316;border-radius:20px;padding:7px 16px;font-size:13px;color:#ddd;">${c}</div>`).join('');
}
window._advMoreClue = function(){
  if (_adv.cluesShown >= _advTarget.clues.length){ toast('No hay más pistas','info'); return; }
  _adv.cluesShown++; _advRenderClues();
  if (_adv.cluesShown>=_advTarget.clues.length){ const b=document.getElementById('adv-more'); if(b)b.style.display='none'; }
};
window._advAnswer = function(btn, picked, correct){
  if (_adv.answered) return; _adv.answered=true;
  const ok = picked===correct;
  const secs = (Date.now()-_adv.t)/1000;
  let pts = 0;
  if (ok){ pts = Math.max(10, 50 - Math.floor(secs)*2 - (_adv.cluesShown-1)*8); _adv.score += pts; }
  document.querySelectorAll('#adv-options button').forEach(b=>{
    b.disabled=true;
    if (b.textContent===correct){ b.style.background='rgba(0,230,118,0.18)'; b.style.borderColor='#00e676'; }
    else if (b===btn && !ok){ b.style.background='rgba(255,68,68,0.18)'; b.style.borderColor='#ff4444'; }
  });
  toast(ok?`✅ ¡Correcto! +${pts} pts`:`❌ Era ${correct}`, ok?'success':'error');
  setTimeout(()=>{ _adv.round++; _adivinaRound(); }, 1400);
};
function _adivinaEnd(){
  let m=document.getElementById('adivina-modal'); if(m)m.remove();
  m=document.createElement('div'); m.id='adivina-modal';
  m.style.cssText='position:fixed;inset:0;z-index:9960;background:#0a0a0a;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;';
  const max=_adv.total*50;
  m.innerHTML=`
    <div style="font-size:64px;margin-bottom:6px;">${_adv.score>=max*0.7?'🏆':_adv.score>=max*0.4?'⚽':'🧤'}</div>
    <div style="font-size:13px;color:#888;letter-spacing:1px;">PUNTAJE FINAL</div>
    <div style="font-size:48px;font-weight:900;color:var(--accent);margin:4px 0 6px;">${_adv.score}</div>
    <div style="font-size:13px;color:#aaa;margin-bottom:24px;">${_adv.score>=max*0.7?'¡Crack futbolero! 🔥':_adv.score>=max*0.4?'Buen nivel, seguí jugando.':'A repasar fútbol 😄'}</div>
    <div style="display:flex;gap:10px;">
      <button onclick="window._adivinaShare(${_adv.score})" style="background:rgba(186,255,0,0.06);color:var(--accent);border:1px solid rgba(186,255,0,0.3);border-radius:14px;padding:12px 18px;font-weight:800;cursor:pointer;"><i class='bx bx-share-alt'></i> Compartir</button>
      <button onclick="document.getElementById('adivina-modal').remove();window._launchCancheroGame('adivina')" style="background:var(--accent);color:#000;border:none;border-radius:14px;padding:12px 22px;font-weight:900;cursor:pointer;">🔄 Revancha</button>
    </div>
    <button onclick="document.getElementById('adivina-modal').remove();window.openGamesModal()" style="margin-top:14px;background:transparent;color:#888;border:none;font-size:13px;cursor:pointer;">← Volver a Juegos</button>`;
  document.body.appendChild(m);
}
window._adivinaShare = function(score){
  const text = `🕵️ Saqué ${score} puntos en Adivina el Jugador de Canchero. ¿Me superás? ⚽`;
  if (navigator.share) navigator.share({ title:'Adivina el Jugador', text }).catch(()=>{});
  else { try{ navigator.clipboard.writeText(text); toast('Resultado copiado','success'); }catch(e){ toast(text,'info'); } }
};

/* ════════════ IMPOSTOR (presencial básico) ════════════ */
function _impostorStart(){
  document.getElementById('games-hub')?.remove();
  let m=document.getElementById('impostor-modal'); if(m)m.remove();
  m=document.createElement('div'); m.id='impostor-modal';
  m.style.cssText='position:fixed;inset:0;z-index:9960;background:#0a0a0a;display:flex;flex-direction:column;padding:20px;overflow-y:auto;';
  m.innerHTML=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;"><button onclick="document.getElementById('impostor-modal').remove();window.openGamesModal()" style="background:rgba(255,255,255,0.06);border:none;border-radius:50%;width:34px;height:34px;color:#fff;cursor:pointer;"><i class='bx bx-arrow-back'></i></button><div style="font-size:18px;font-weight:900;color:#fff;">🎭 Impostor Futbolero</div></div>
    <div style="background:#111;border:1px solid #1e1e1e;border-radius:14px;padding:16px;margin-bottom:14px;">
      <div style="font-size:13px;color:#aaa;margin-bottom:10px;">Modo presencial. Pasá el celu entre los jugadores: cada uno ve su rol en secreto. Todos reciben el mismo jugador futbolero, menos el <b style="color:#ff4444;">impostor</b>.</div>
      <label style="font-size:12px;color:#888;">Cantidad de jugadores (mín. 4)</label>
      <input id="imp-n" type="number" min="4" max="12" value="4" style="width:100%;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;padding:10px;font-size:14px;box-sizing:border-box;margin-top:6px;">
    </div>
    <button onclick="window._impostorDeal()" style="width:100%;background:var(--accent);color:#000;border:none;border-radius:12px;padding:13px;font-weight:900;cursor:pointer;">REPARTIR ROLES</button>
    <div id="imp-area" style="margin-top:16px;"></div>`;
  document.body.appendChild(m);
}
const IMP_WORDS=['Messi','Cristiano','Suárez','Forlán','Maradona','Pelé','Ronaldinho','Mbappé','Haaland','Cavani','Neymar','Zidane','Cristiano Ronaldo','Iniesta'];
window._impostorDeal=function(){
  const n=Math.max(4,parseInt(document.getElementById('imp-n').value)||4);
  const word=IMP_WORDS[Math.floor(Math.random()*IMP_WORDS.length)];
  const impostor=Math.floor(Math.random()*n);
  window._impState={n,word,impostor,cur:0};
  _impShow();
};
function _impShow(){
  const s=window._impState; const area=document.getElementById('imp-area'); if(!area)return;
  if (s.cur>=s.n){ area.innerHTML=`<div style="text-align:center;padding:20px;"><div style="font-size:15px;font-weight:800;color:#fff;margin-bottom:10px;">¡Listo! Debatan y voten al impostor.</div><div style="font-size:13px;color:#888;margin-bottom:16px;">Cada uno da una pista del jugador sin decir el nombre. El impostor improvisa.</div><button onclick="window._impState.cur=0;document.getElementById('imp-area').innerHTML='';" style="background:var(--accent);color:#000;border:none;border-radius:12px;padding:11px 20px;font-weight:900;cursor:pointer;">Nueva ronda</button></div>`; return; }
  area.innerHTML=`<div style="background:#111;border:1px solid #1e1e1e;border-radius:14px;padding:24px;text-align:center;">
    <div style="font-size:13px;color:#888;">Jugador ${s.cur+1} de ${s.n}</div>
    <div id="imp-card" style="margin-top:14px;"><button onclick="window._impReveal()" style="background:#1a1a1a;color:#fff;border:1px solid #2a2a2a;border-radius:12px;padding:16px 24px;font-weight:800;cursor:pointer;">👁 Ver mi rol (tocá y ocultá)</button></div>
  </div>`;
}
window._impReveal=function(){
  const s=window._impState; const card=document.getElementById('imp-card');
  const isImp=s.cur===s.impostor;
  card.innerHTML=`<div style="font-size:11px;color:#888;">Tu jugador es:</div><div style="font-size:24px;font-weight:900;color:${isImp?'#ff4444':'var(--accent)'};margin:6px 0;">${isImp?'🤫 IMPOSTOR':s.word}</div><div style="font-size:12px;color:#888;margin-bottom:12px;">${isImp?'No sabés el jugador. Disimulá.':'Dá pistas sin decir el nombre.'}</div><button onclick="window._impState.cur++;document.querySelector('#impostor-modal #imp-area')&&(function(){})();(function(){window._impNext()})()" style="background:var(--accent);color:#000;border:none;border-radius:12px;padding:11px 20px;font-weight:900;cursor:pointer;">Ocultar y pasar →</button>`;
};
window._impNext=function(){ _impShow(); };

/* ════════════ 11 IDEAL (básico) ════════════ */
function _onceStart(){
  document.getElementById('games-hub')?.remove();
  let m=document.getElementById('once-modal'); if(m)m.remove();
  m=document.createElement('div'); m.id='once-modal';
  m.style.cssText='position:fixed;inset:0;z-index:9960;background:#0a0a0a;display:flex;flex-direction:column;padding:20px;overflow-y:auto;';
  const consignas=['Mejor 11 de la historia','Mejor 11 de Uruguay','Mejor 11 del Mundial 2022','Mejor 11 de la Libertadores','Mejor 11 zurdo','Mejor 11 de los 2000s'];
  const c=consignas[Math.floor(Math.random()*consignas.length)];
  const pos=['ARQ','DEF','DEF','DEF','DEF','MED','MED','MED','DEL','DEL','DEL'];
  m.innerHTML=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;"><button onclick="document.getElementById('once-modal').remove();window.openGamesModal()" style="background:rgba(255,255,255,0.06);border:none;border-radius:50%;width:34px;height:34px;color:#fff;cursor:pointer;"><i class='bx bx-arrow-back'></i></button><div style="font-size:18px;font-weight:900;color:#fff;">📋 11 Ideal</div></div>
    <div style="background:linear-gradient(135deg,#0c2a14,#0a0a0a);border:1px solid #1f3a1f;border-radius:14px;padding:16px;margin-bottom:14px;text-align:center;"><div style="font-size:11px;color:var(--accent);font-weight:800;letter-spacing:1px;">CONSIGNA</div><div style="font-size:18px;font-weight:900;color:#fff;margin-top:4px;">${c}</div></div>
    <div style="display:grid;gap:8px;">${pos.map((p,i)=>`<div style="display:flex;align-items:center;gap:10px;"><span style="width:42px;font-size:11px;font-weight:800;color:#888;">${p}</span><input placeholder="Jugador ${i+1}" style="flex:1;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;padding:9px;font-size:13px;"></div>`).join('')}</div>
    <button onclick="window.showToast&&showToast('¡Tu 11 quedó armado! Compará con tus amigos (modo online próximamente).','success')" style="width:100%;margin-top:14px;background:var(--accent);color:#000;border:none;border-radius:12px;padding:13px;font-weight:900;cursor:pointer;">GUARDAR MI 11</button>`;
  document.body.appendChild(m);
}

console.log('[canchero-games] ✅ Hub de juegos cargado');
})();
