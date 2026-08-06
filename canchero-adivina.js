/**
 * canchero-adivina.js — "Adivina el Jugador" estilo FIFA WhoAmI
 * Pistas progresivas (posición, nacionalidad, clubes donde jugó, títulos, apodo).
 * Escribís el nombre para adivinar. Dificultad creciente. Puntos por velocidad/pistas.
 */
(function(){
'use strict';
function toast(m,t){ if(window.showToast) showToast(m,t); }

const PLAYERS = [
  { n:'Lionel Messi', alias:['messi','leo messi','la pulga'], nat:'Argentina', pos:'Delantero', clubs:['Barcelona','PSG','Inter Miami'], titles:'8 Balones de Oro · Mundial 2022', diff:1 },
  { n:'Cristiano Ronaldo', alias:['cristiano','cr7','ronaldo'], nat:'Portugal', pos:'Delantero', clubs:['Sporting','Man United','Real Madrid','Juventus','Al Nassr'], titles:'5 Champions · 5 Balones de Oro', diff:1 },
  { n:'Neymar', alias:['neymar','ney'], nat:'Brasil', pos:'Delantero', clubs:['Santos','Barcelona','PSG','Al Hilal'], titles:'Champions 2015 · Oro Río 2016', diff:1 },
  { n:'Luis Suárez', alias:['suarez','luis suarez','el pistolero'], nat:'Uruguay', pos:'Delantero', clubs:['Nacional','Ajax','Liverpool','Barcelona','Atlético','Inter Miami'], titles:'Champions 2015 · Pichichi', diff:2 },
  { n:'Kylian Mbappé', alias:['mbappe','kylian'], nat:'Francia', pos:'Delantero', clubs:['Mónaco','PSG','Real Madrid'], titles:'Mundial 2018 · Goleador', diff:1 },
  { n:'Erling Haaland', alias:['haaland','erling'], nat:'Noruega', pos:'Delantero', clubs:['Salzburg','Dortmund','Man City'], titles:'Champions 2023 · Récord de goles', diff:2 },
  { n:'Ronaldinho', alias:['ronaldinho','dinho'], nat:'Brasil', pos:'Volante ofensivo', clubs:['Gremio','PSG','Barcelona','Milan'], titles:'Balón de Oro 2005 · Mundial 2002', diff:2 },
  { n:'Zinedine Zidane', alias:['zidane','zizou'], nat:'Francia', pos:'Volante', clubs:['Cannes','Bordeaux','Juventus','Real Madrid'], titles:'Mundial 1998 · Champions 2002', diff:2 },
  { n:'Diego Forlán', alias:['forlan','diego forlan'], nat:'Uruguay', pos:'Delantero', clubs:['Independiente','Man United','Villarreal','Atlético','Inter'], titles:'MVP Mundial 2010', diff:3 },
  { n:'Edinson Cavani', alias:['cavani','el matador'], nat:'Uruguay', pos:'Delantero', clubs:['Danubio','Palermo','Napoli','PSG','Man United','Boca'], titles:'Goleador histórico PSG', diff:3 },
  { n:'Andrés Iniesta', alias:['iniesta'], nat:'España', pos:'Volante', clubs:['Barcelona','Vissel Kobe'], titles:'Mundial 2010 (gol final)', diff:3 },
  { n:'Luka Modrić', alias:['modric','luka modric'], nat:'Croacia', pos:'Volante', clubs:['Dinamo Zagreb','Tottenham','Real Madrid'], titles:'Balón de Oro 2018', diff:3 },
  { n:'Vinícius Júnior', alias:['vinicius','vini','vinicius jr'], nat:'Brasil', pos:'Extremo', clubs:['Flamengo','Real Madrid'], titles:'Champions 2022 (gol final)', diff:2 },
  { n:'Karim Benzema', alias:['benzema'], nat:'Francia', pos:'Delantero', clubs:['Lyon','Real Madrid','Al Ittihad'], titles:'Balón de Oro 2022', diff:3 },
  { n:'Robert Lewandowski', alias:['lewandowski','lewa'], nat:'Polonia', pos:'Delantero', clubs:['Dortmund','Bayern','Barcelona'], titles:'The Best 2020-21', diff:2 },
  { n:'Mohamed Salah', alias:['salah','mo salah'], nat:'Egipto', pos:'Extremo', clubs:['Basilea','Chelsea','Roma','Liverpool'], titles:'Champions 2019', diff:3 },
  { n:'Álvaro Recoba', alias:['recoba','el chino','chino recoba'], nat:'Uruguay', pos:'Volante ofensivo', clubs:['Danubio','Nacional','Inter'], titles:'Ídolo de Nacional · Zurda mágica', diff:4 },
  { n:'Enzo Francescoli', alias:['francescoli','el principe','enzo'], nat:'Uruguay', pos:'Volante ofensivo', clubs:['River','Marsella','Cagliari'], titles:'Libertadores 1996 · Ídolo de River', diff:4 },
  { n:'Diego Godín', alias:['godin','el faraon'], nat:'Uruguay', pos:'Defensor', clubs:['Nacional','Villarreal','Atlético','Inter'], titles:'Copa América 2011 · Capitán celeste', diff:4 },
  { n:'Clarence Seedorf', alias:['seedorf'], nat:'Países Bajos', pos:'Volante', clubs:['Ajax','Real Madrid','Inter','Milan'], titles:'4 Champions con 3 clubes distintos', diff:4 },
  { n:'Rivaldo', alias:['rivaldo'], nat:'Brasil', pos:'Volante ofensivo', clubs:['Barcelona','Milan'], titles:'Balón de Oro 1999 · Mundial 2002', diff:4 },
  { n:'Gabriel Batistuta', alias:['batistuta','batigol'], nat:'Argentina', pos:'Delantero', clubs:['Boca','River','Fiorentina','Roma'], titles:'Goleador histórico argentino', diff:4 },
  { n:'Pablo Aimar', alias:['aimar','el payaso'], nat:'Argentina', pos:'Volante ofensivo', clubs:['River','Valencia','Benfica'], titles:'Ídolo de Messi · 2 Ligas con Valencia', diff:5 },
  { n:'Hernán Crespo', alias:['crespo'], nat:'Argentina', pos:'Delantero', clubs:['River','Palermo','Inter','Chelsea','Milan'], titles:'Goleador Libertadores 1996', diff:5 },
  { n:"Fabián O'Neill", alias:['oneill','o neill','el mago'], nat:'Uruguay', pos:'Volante', clubs:['Nacional','Cagliari','Juventus'], titles:'"El mejor con el que jugué" — Zidane', diff:5 },
  { n:'Rubén Sosa', alias:['ruben sosa','el principito'], nat:'Uruguay', pos:'Delantero', clubs:['Danubio','Lazio','Inter'], titles:'Ídolo celeste de los 90', diff:5 },
  { n:'Edgar Davids', alias:['davids','el pitbull'], nat:'Países Bajos', pos:'Volante', clubs:['Ajax','Milan','Juventus','Barcelona','Inter','Tottenham'], titles:'Champions 1995 · Lentes icónicos', diff:4 },
];

let A=null;
const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z ]/g,'').trim();
function _shuffle(a){ return a.map(x=>[Math.random(),x]).sort((p,q)=>p[0]-q[0]).map(p=>p[1]); }

/* Banderas y colores de clubes para pistas visuales */
const FLAG_ISO={Argentina:'ar',Portugal:'pt',Brasil:'br',Uruguay:'uy',Francia:'fr',Noruega:'no',Croacia:'hr',Polonia:'pl',Egipto:'eg',Inglaterra:'gb-eng',Alemania:'de',Italia:'it','Países Bajos':'nl'};
FLAG_ISO['España']='es';
const FLAGS=new Proxy({},{get:(t,k)=>{const iso=FLAG_ISO[k];return iso?`<img src="https://flagcdn.com/w40/${iso}.png" alt="${k}" style="width:26px;height:18px;object-fit:cover;border-radius:3px;vertical-align:-3px;box-shadow:0 1px 3px rgba(0,0,0,0.5);">`:'';}});
const CLUB_COLORS={
  'Barcelona':['#a50044','#004d98'],'PSG':['#004170','#da291c'],'Inter Miami':['#f7b5cd','#231f20'],
  'Sporting':['#008658','#ffffff'],'Man United':['#da291c','#fbe122'],'Real Madrid':['#ffffff','#febe10'],
  'Juventus':['#000000','#ffffff'],'Al Nassr':['#ffe14d','#1d3a8f'],'Santos':['#ffffff','#000000'],
  'Al Hilal':['#1b4fa0','#ffffff'],'Nacional':['#ffffff','#c8102e'],'Ajax':['#d2122e','#ffffff'],
  'Liverpool':['#c8102e','#00b2a9'],'Atlético':['#cb3524','#ffffff'],'Mónaco':['#e51b22','#ffffff'],
  'Salzburg':['#d20515','#ffffff'],'Dortmund':['#fde100','#000000'],'Man City':['#6cabdd','#ffffff'],
  'Gremio':['#0d80bf','#000000'],'Milan':['#fb090b','#000000'],'Cannes':['#e30613','#ffffff'],
  'Bordeaux':['#001b50','#ffffff'],'Independiente':['#e30613','#ffffff'],'Villarreal':['#ffe667','#005187'],
  'Inter':['#0068a8','#221f20'],'Danubio':['#ffffff','#000000'],'Palermo':['#ff69b4','#000000'],
  'Napoli':['#12a0d7','#ffffff'],'Boca':['#103f79','#fdc52c'],'Vissel Kobe':['#76020c','#ffffff'],
  'Dinamo Zagreb':['#0044aa','#ffffff'],'Tottenham':['#ffffff','#132257'],'Flamengo':['#c52613','#000000'],
  'Lyon':['#ffffff','#da001a'],'Al Ittihad':['#ffd400','#000000'],'Bayern':['#dc052d','#ffffff'],
  'Basilea':['#d2001e','#0064b0'],'Chelsea':['#034694','#ffffff'],'Roma':['#8e1f2f','#f0bc42']
};
const CLUB_SLUGS={
  'Barcelona':'barcelona','PSG':'psg','Inter Miami':'inter-miami','Sporting':'sporting','Man United':'man-united',
  'Real Madrid':'real-madrid','Juventus':'juventus','Al Nassr':'al-nassr','Santos':'santos','Al Hilal':'al-hilal',
  'Nacional':'nacional','Ajax':'ajax','Liverpool':'liverpool','Atlético':'atletico','Mónaco':'monaco',
  'Salzburg':'salzburg','Dortmund':'dortmund','Man City':'man-city','Gremio':'gremio','Milan':'milan',
  'Cannes':'cannes','Bordeaux':'bordeaux','Independiente':'independiente','Villarreal':'villarreal','Inter':'inter',
  'Danubio':'danubio','Palermo':'palermo','Napoli':'napoli','Boca':'boca','Vissel Kobe':'vissel-kobe',
  'Dinamo Zagreb':'dinamo-zagreb','Tottenham':'tottenham','Flamengo':'flamengo','Lyon':'lyon',
  'Al Ittihad':'al-ittihad','Bayern':'bayern','Basilea':'basilea','Chelsea':'chelsea','Roma':'roma',
  'Peñarol':'penarol','River':'river','Fiorentina':'fiorentina','Valencia':'valencia','Sevilla':'sevilla'
};
function _shield(club,size){
  size=size||34;
  // PNGs verificados visualmente (2026-06-12). psg/basilea estaban mal y se
  // eliminaron: esos usan el fallback. onerror cubre cualquier faltante.
  const slug=CLUB_SLUGS[club];
  if (slug && slug!=='psg' && slug!=='basilea'){
    return `<span title="${club}" style="display:inline-flex;flex-direction:column;align-items:center;gap:3px;width:${size+18}px;">
      <img src="img/clubs/${slug}.png" alt="${club}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'" style="width:${size+4}px;height:${size+4}px;object-fit:contain;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.6));">
      <span style="display:none;"></span>
      <span style="font-size:8.5px;color:#aaa;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:${size+18}px;">${club}</span>
    </span>`;
  }
  return _shieldFallback(club,size);
}
function _shieldFallback(club,size){
  size=size||34;
  const c=CLUB_COLORS[club]||['#2a2a2a','#888'];
  const ini=club.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const txt=(c[0]==='#ffffff'||c[0]==='#fde100'||c[0]==='#ffe14d'||c[0]==='#ffe667'||c[0]==='#ffd400'||c[0]==='#f7b5cd'||c[0]==='#6cabdd')?'#111':'#fff';
  return `<span title="${club}" style="display:inline-flex;flex-direction:column;align-items:center;gap:3px;width:${size+18}px;">
    <span style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 50% / 42% 42% 58% 58%;background:linear-gradient(135deg,${c[0]} 50%,${c[1]} 50%);border:1.5px solid rgba(255,255,255,0.35);display:inline-flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.34)}px;font-weight:900;color:${txt};text-shadow:0 1px 2px rgba(0,0,0,0.5);box-shadow:0 2px 8px rgba(0,0,0,0.45);">${ini}</span>
    <span style="font-size:8.5px;color:#aaa;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:${size+18}px;">${club}</span>
  </span>`;
}

// Sobrescribir el lanzador para que 'adivina' use esta versión
const _origLaunch = window._launchCancheroGame;
window._launchCancheroGame = function(id){
  if (id==='adivina'){ document.getElementById('games-hub')?.remove(); window._adivinaProStart(); return; }
  if (_origLaunch) return _origLaunch(id);
};

window._advToggleDuel = function(btn){
  window.__advDuel = window.__advDuel ? 0 : 1;
  btn.style.background = window.__advDuel ? 'rgba(100,180,255,0.20)' : 'rgba(100,180,255,0.08)';
  btn.querySelector('span').textContent = window.__advDuel
    ? '⚔ MODO DUELO ACTIVADO — al terminar elegís a quién desafiar'
    : '⚔ DESAFIAR A UN AMIGO (jugás y le mandás el duelo)';
};

window._advPickLevel = function(){
  let m=document.getElementById('adv-level'); if(m)m.remove();
  m=document.createElement('div'); m.id='adv-level';
  m.style.cssText='position:fixed;left:0;right:0;bottom:0;top:'+(window._navH?window._navH():0)+'px;z-index:9958;background:linear-gradient(rgba(10,10,10,0.72),rgba(10,10,10,0.90)),url(img/games-bg/adivina.webp) center/cover no-repeat;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;gap:10px;';
  const NAMES=['Aficionado','Hincha','Canchero','Crack','Leyenda'];
  m.innerHTML='<div style="font-size:11px;color:var(--accent);font-weight:900;letter-spacing:2px;">ADIVINA EL JUGADOR</div>'+
    '<div style="font-size:19px;font-weight:900;color:#fff;margin-bottom:2px;">Elegí la dificultad</div>'+
    '<button id="adv-duel-btn" onclick="window._advToggleDuel(this)" style="width:100%;max-width:320px;background:rgba(100,180,255,0.08);color:#64b4ff;border:1px solid rgba(100,180,255,0.4);border-radius:14px;padding:13px;font-weight:800;font-size:12.5px;cursor:pointer;font-family:inherit;margin-bottom:6px;"><span>⚔ DESAFIAR A UN AMIGO (jugás y le mandás el duelo)</span></button>'+
    NAMES.map((n,i)=>`<button onclick="this.parentElement.remove();window._adivinaProStart(null,${i+1})" style="width:100%;max-width:320px;background:#111;border:1px solid ${i>=3?'rgba(255,80,80,0.4)':'#2a2a2a'};border-radius:14px;padding:14px;color:#fff;font-weight:800;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;font-family:inherit;"><span>${n}</span><span style="color:${i>=3?'#ff6b6b':'var(--accent)'};">${'★'.repeat(i+1)}</span></button>`).join('')+
    '<button class="cg-back" onclick="this.parentElement.remove();window.openGamesModal&&openGamesModal()"><i class="bx bx-arrow-back"></i> Juegos</button>';
  document.body.appendChild(m);
};

window._adivinaProStart = function(challenge, level){
  // 6 rondas, dificultad creciente y EXIGENTE: 1 fácil, 2 medias, 3 difíciles
  let pool;
  if (challenge && challenge.payload && Array.isArray(challenge.payload.players)){
    // Duelo: mismas preguntas que el desafiante
    pool = challenge.payload.players.map(n=>PLAYERS.find(p=>p.n===n)).filter(Boolean);
  }
  if (!pool || !pool.length){
    if (!level){ window._advPickLevel(); return; }
    // Nivel 1-5 → mezcla de dificultades acorde
    const mix={1:[1,1,2],2:[2,2,3],3:[2,3,3],4:[3,4,4],5:[4,4,5]}[level]||[2,3,4];
    const pick=d=>_shuffle(PLAYERS.filter(p=>p.diff===d || (d>=5&&p.diff>=5)))[0];
    const used=new Set(); pool=[];
    [...mix,...mix].forEach(d=>{ // 6 rondas
      let p=_shuffle(PLAYERS.filter(x=>x.diff===Math.min(d,5)&&!used.has(x.n)))[0]
           ||_shuffle(PLAYERS.filter(x=>!used.has(x.n)))[0];
      if(p){used.add(p.n);pool.push(p);}
    });
    pool.sort((a,b)=>a.diff-b.diff);
  }
  A={ round:0, score:0, total:pool.length, pool, cluesShown:1, t:0, answered:false, challenge: challenge||null };
  ['player-bottom-nav','club-bottom-nav'].forEach(n=>document.getElementById(n)?.style.setProperty('display','none','important'));
  _advRound();
};
window._adivinaClose=function(){ const m=document.getElementById('adivina-pro'); if(m)m.remove(); ['player-bottom-nav','club-bottom-nav'].forEach(n=>document.getElementById(n)?.style.removeProperty('display')); if(window.openGamesModal)window.openGamesModal(); };

function _advRound(){
  if(A.round>=A.total) return _advEnd();
  const p=A.pool[A.round]; A.cluesShown=1; A.answered=false; A.t=Date.now();
  let m=document.getElementById('adivina-pro'); if(m)m.remove();
  m=document.createElement('div'); m.id='adivina-pro';
  m.style.cssText='position:fixed;left:0;right:0;bottom:0;top:'+(window._navH?window._navH():0)+'px;z-index:9960;background:#0a0a0a;display:flex;flex-direction:column;';
  m.innerHTML=`
    <div style="flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;padding:max(8px,env(safe-area-inset-top)) 16px 10px;border-bottom:1px solid #1a1a1a;">
      <button onclick="window._adivinaClose()" style="background:rgba(255,255,255,0.06);border:none;border-radius:50%;width:34px;height:34px;color:#fff;cursor:pointer;"><i class='bx bx-x'></i></button>
      <div style="font-size:13px;font-weight:800;color:#fff;">Ronda ${A.round+1}/${A.total} <span style="color:#666;">· dif ${'★'.repeat(p.diff)}</span></div>
      <div style="display:flex;align-items:center;gap:8px;">
        <button onclick="window.CGCore&&CGCore.openRanking('adivina')" title="Ranking" style="background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.35);border-radius:50%;width:32px;height:32px;color:#FFD700;cursor:pointer;font-size:15px;"><i class='bx bx-trophy'></i></button>
        <div style="font-size:13px;font-weight:900;color:var(--accent);">⭐ ${A.score}</div>
      </div>
    </div>
    <div style="flex:1 1 auto;min-height:0;overflow-y:auto;padding:20px 16px;display:flex;flex-direction:column;align-items:center;">
      <div style="font-size:64px;margin-bottom:6px;filter:drop-shadow(0 0 20px rgba(186,255,0,0.3));">🕵️</div>
      <div style="font-size:12px;color:#888;letter-spacing:1px;margin-bottom:16px;">¿QUIÉN ES?</div>
      <div id="adv-clues" style="display:flex;flex-direction:column;gap:8px;width:100%;max-width:420px;margin-bottom:16px;"></div>
      <button id="adv-more" onclick="window._advMore()" style="background:rgba(186,255,0,0.06);color:var(--accent);border:1px solid rgba(186,255,0,0.25);border-radius:20px;padding:8px 16px;font-size:12px;font-weight:700;cursor:pointer;">+ Pista (−10 pts)</button>
    </div>
    <div style="flex:0 0 auto;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:#0d0d0d;border-top:1px solid #1a1a1a;">
      <div id="adv-feedback" style="text-align:center;font-size:13px;font-weight:800;margin-bottom:8px;min-height:18px;"></div>
      <div style="display:flex;gap:8px;">
        <input id="adv-guess" placeholder="Escribí el nombre del jugador..." style="flex:1;background:#1a1a1a;border:1px solid #333;border-radius:22px;color:#fff;padding:12px 16px;font-size:14px;outline:none;" onkeydown="if(event.key==='Enter')window._advGuess()">
        <button onclick="window._advGuess()" style="background:var(--accent);color:#000;border:none;border-radius:50%;width:46px;height:46px;font-size:18px;cursor:pointer;"><i class='bx bx-check'></i></button>
      </div>
      <button onclick="window._advSkip()" style="width:100%;margin-top:8px;background:none;border:none;color:#666;font-size:12px;cursor:pointer;">No sé · pasar</button>
    </div>`;
  document.body.appendChild(m);
  window._advTarget=p; _advRenderClues();
  setTimeout(()=>document.getElementById('adv-guess')?.focus(),100);
}
function _advClueList(p){
  // orden de revelado (de más difícil a más fácil) — pistas visuales
  return [
    {label:'POSICIÓN', html:`<span style="display:inline-flex;align-items:center;gap:8px;"><span style="width:30px;height:30px;border-radius:8px;background:rgba(186,255,0,0.12);border:1px solid rgba(186,255,0,0.4);display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:var(--accent);">${(p.pos||'').split(' ')[0].slice(0,3).toUpperCase()}</span><span style="font-size:15px;color:#fff;font-weight:700;">${p.pos}</span></span>`, ic:'bx-football'},
    {label:'NACIONALIDAD', html:`<span style="font-size:15px;color:#fff;font-weight:700;">${FLAGS[p.nat]||''} ${p.nat}</span>`, ic:'bx-flag'},
    {label:'JUGÓ EN', html:`<span style="display:inline-flex;gap:8px;flex-wrap:wrap;">${_shield(p.clubs[0],36)}</span>`, ic:'bx-shield'},
    {label:'TAMBIÉN JUGÓ EN', html:`<span style="display:inline-flex;gap:8px;flex-wrap:wrap;">${p.clubs.slice(0,Math.max(2,Math.ceil(p.clubs.length/2))).map(c=>_shield(c,32)).join('')}</span>`, ic:'bx-shield'},
    {label:'TÍTULOS', html:`<span style="font-size:14px;color:#fff;font-weight:700;">🏆 ${p.titles}</span>`, ic:'bx-trophy'},
    {label:'TODOS SUS CLUBES', html:`<span style="display:inline-flex;gap:8px;flex-wrap:wrap;">${p.clubs.map(c=>_shield(c,32)).join('')}</span>`, ic:'bx-shield'},
    // Última pista: iniciales + huecos por letra (pedido 2026-07-08)
    {label:'SU NOMBRE', html:`<span style="font-size:18px;font-weight:900;color:var(--accent);letter-spacing:3px;font-family:monospace;">${_advNameHint(p.n)}</span>`, ic:'bx-font'},
  ];
}
// "Lionel Messi" → "L_____ M____"
function _advNameHint(name){
  return String(name||'').split(' ').map(w => w ? (w[0].toUpperCase() + '_'.repeat(Math.max(0, w.length-1))) : '').join('&nbsp;&nbsp;');
}
// Foto REAL del jugador (TheSportsDB, gratis) — se muestra al acertar o al revelar
const _advPhotoCache = {};
async function _advPhoto(name){
  const k=(name||'').toLowerCase();
  if (k in _advPhotoCache) return _advPhotoCache[k];
  try {
    const r = await fetch('https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=' + encodeURIComponent(name));
    const j = await r.json();
    const pl = ((j&&j.player)||[]).filter(x=>(x.strSport||'Soccer')==='Soccer')[0];
    _advPhotoCache[k] = (pl && (pl.strCutout || pl.strThumb)) || null;
  } catch(e){ _advPhotoCache[k] = null; }
  return _advPhotoCache[k];
}
// Muestra la foto del jugador revelado arriba del feedback
async function _advShowPhoto(name){
  const url = await _advPhoto(name);
  if (!url) return;
  const box = document.getElementById('adv-clues');
  if (box) box.insertAdjacentHTML('afterbegin',
    `<div style="display:flex;justify-content:center;margin-bottom:4px;"><div style="width:96px;height:96px;border-radius:50%;background:url('${url.replace(/'/g,'')}') center top/cover;border:3px solid var(--accent);box-shadow:0 0 24px rgba(186,255,0,0.35);"></div></div>`);
}
function _advRenderClues(){
  const box=document.getElementById('adv-clues'); if(!box)return;
  const clues=_advClueList(window._advTarget);
  box.innerHTML=clues.slice(0,A.cluesShown).map(c=>`<div style="background:#111;border:1px solid #233316;border-radius:12px;padding:11px 14px;display:flex;align-items:center;gap:12px;">
    <i class='bx ${c.ic}' style="color:var(--accent);font-size:20px;flex-shrink:0;"></i>
    <div style="min-width:0;"><div style="font-size:9px;color:#888;font-weight:800;letter-spacing:1px;margin-bottom:4px;">${c.label}</div>${c.html}</div>
  </div>`).join('');
  if(A.cluesShown>=clues.length){ const b=document.getElementById('adv-more'); if(b)b.style.display='none'; }
}
window._advMore=function(){ const max=_advClueList(window._advTarget).length; if(A.cluesShown>=max)return; A.cluesShown++; _advRenderClues(); };
window._advGuess=function(){
  if(A.answered)return;
  const g=norm(document.getElementById('adv-guess')?.value); if(!g){toast('Escribí un nombre','info');return;}
  const p=window._advTarget;
  // Match estricto: nombre completo, alias exacto, o apellido completo (>=5 letras)
  const surname = norm(p.n).split(' ').pop();
  const ok = norm(p.n)===g || p.alias.some(a=>norm(a)===g) || (g===surname && surname.length>=5);
  if(ok){ A.answered=true;
    const secs=(Date.now()-A.t)/1000;
    const pts=Math.max(8, 20 + p.diff*12 - Math.floor(secs)*2 - (A.cluesShown-1)*12);
    A.score+=pts;
    const fb=document.getElementById('adv-feedback'); if(fb){fb.style.color='#00e676'; fb.textContent=`✅ ¡Correcto! Es ${p.n}. +${pts} pts`;}
    _advShowPhoto(p.n);
    setTimeout(()=>{ A.round++; _advRound(); },2200);
  } else {
    const fb=document.getElementById('adv-feedback'); if(fb){fb.style.color='#ff5555'; fb.textContent='❌ No es. Probá de nuevo o pedí otra pista.';}
    const inp=document.getElementById('adv-guess'); if(inp){inp.value='';inp.focus();}
  }
};
window._advSkip=function(){ if(A.answered)return; A.answered=true; const fb=document.getElementById('adv-feedback'); if(fb){fb.style.color='#888';fb.textContent=`Era ${window._advTarget.n}`;} _advShowPhoto(window._advTarget.n); setTimeout(()=>{A.round++;_advRound();},2200); };

async function _advEnd(){
  const max=A.total*60;
  // Modo duelo elegido ANTES de jugar: abrir el selector de rival automáticamente
  if (window.__advDuel && !A.challenge){ window.__advDuel=0; setTimeout(()=>{ try{ window._advChallenge(); }catch(e){} }, 600); }
  // Guardar puntaje en el ranking global
  try { if (window.CGCore) CGCore.saveScore('adivina', A.score); } catch(e){}
  // Si era un duelo: resolverlo
  let duelHtml = '';
  if (A.challenge && window.CGCore){
    const res = await CGCore.finishChallenge(A.challenge.id, A.score);
    if (res){
      const win = res.winner === (window.userData&&window.userData.email);
      const tie = res.winner === null;
      duelHtml = `<div style="background:#111;border:1px solid ${tie?'#444':win?'rgba(186,255,0,0.4)':'rgba(255,80,80,0.4)'};border-radius:16px;padding:14px 18px;margin-bottom:18px;">
        <div style="font-size:10px;color:#888;font-weight:900;letter-spacing:2px;margin-bottom:6px;">DUELO vs ${(A.challenge.from_name||'rival').replace(/</g,'&lt;')}</div>
        <div style="font-size:20px;font-weight:900;color:#fff;">${res.fromScore} <span style="color:#555;font-size:13px;">vs</span> ${A.score}</div>
        <div style="font-size:14px;font-weight:900;color:${tie?'#ccc':win?'var(--accent)':'#ff6b6b'};margin-top:4px;">${tie?'🤝 ¡Empate!':win?'🏆 ¡GANASTE EL DUELO!':'😬 Perdiste el duelo'}</div>
      </div>`;
    }
  }
  let m=document.getElementById('adivina-pro'); if(m)m.remove();
  m=document.createElement('div'); m.id='adivina-pro';
  m.style.cssText='position:fixed;left:0;right:0;bottom:0;top:'+(window._navH?window._navH():0)+'px;z-index:9960;background:linear-gradient(rgba(10,10,10,0.72),rgba(10,10,10,0.90)),url(img/games-bg/adivina.webp) center/cover no-repeat;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;overflow-y:auto;';
  m.innerHTML=`
    <div style="font-size:64px;">${A.score>=max*0.6?'🏆':A.score>=max*0.35?'⚽':'🧤'}</div>
    <div style="font-size:13px;color:#888;letter-spacing:1px;">PUNTAJE FINAL</div>
    <div style="font-size:48px;font-weight:900;color:var(--accent);margin:4px 0 6px;">${A.score}</div>
    <div style="font-size:13px;color:#aaa;margin-bottom:18px;">${A.score>=max*0.6?'¡Sos un fenómeno del fútbol! 🔥':A.score>=max*0.35?'Buen nivel futbolero.':'A repasar la historia del fútbol 😄'}</div>
    ${duelHtml}
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
      <button onclick="window.CGCore&&CGCore.openRanking('adivina')" style="background:rgba(255,215,0,0.07);color:#FFD700;border:1px solid rgba(255,215,0,0.35);border-radius:14px;padding:12px 16px;font-weight:800;cursor:pointer;"><i class='bx bx-trophy'></i> Ranking</button>
      <button onclick="window._advChallenge()" style="background:rgba(100,180,255,0.07);color:#64b4ff;border:1px solid rgba(100,180,255,0.35);border-radius:14px;padding:12px 16px;font-weight:800;cursor:pointer;">⚔ Desafiar</button>
      <button onclick="window._advShare(${A.score})" style="background:rgba(186,255,0,0.06);color:var(--accent);border:1px solid rgba(186,255,0,0.3);border-radius:14px;padding:12px 16px;font-weight:800;cursor:pointer;"><i class='bx bx-share-alt'></i> Compartir</button>
      <button onclick="window._adivinaProStart()" style="background:var(--accent);color:#000;border:none;border-radius:14px;padding:12px 18px;font-weight:900;cursor:pointer;">🔄 Revancha</button>
    </div>
    <button onclick="window._adivinaClose()" style="margin-top:14px;background:none;border:none;color:#888;font-size:13px;cursor:pointer;">← Volver a Juegos</button>`;
  document.body.appendChild(m);
}

/* Desafiar: el rival juega con LOS MISMOS jugadores que vos */
window._advChallenge = function(){
  if (!window.CGCore){ toast('No disponible.','error'); return; }
  CGCore.sendChallenge('adivina', { players: (A&&A.pool||[]).map(p=>p.n) }, A ? A.score : 0);
};
/* Entrada cuando ACEPTÁS un desafío (desde el banner del hub) */
window._adivinaChallengePlay = function(ch){
  document.getElementById('games-hub')?.remove();
  window._adivinaProStart(ch);
};
window._advShare=function(score){
  const text=`🕵️ Saqué ${score} pts en Adivina el Jugador de Canchero. ¿Sabés más de fútbol que yo? ⚽`;
  // Publicar bloque moderno con botón JUGAR en el feed (además de compartir externo)
  try { if (window.CGCore) CGCore.shareResult({ gameId:'adivina', gameName:'Adivina el Jugador', emoji:'🕵️', headline:`Saqué ${score} puntos`, detail:'¿Sabés más de fútbol que yo? Tocá para jugar.', text }); } catch(e){}
  if(navigator.share)navigator.share({title:'Adivina el Jugador',text}).catch(()=>{}); else{try{navigator.clipboard.writeText(text);toast('Copiado','success');}catch(e){toast(text,'info');}}
};

console.log('[canchero-adivina] ✅ Adivina el Jugador (FIFA WhoAmI style) cargado');
})();
