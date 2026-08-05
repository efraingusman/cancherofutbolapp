/**
 * canchero-higher-lower.js — "Más o Menos" (Higher or Lower) modo FÚTBOL.
 * FLUJO: 1) elegís una de 10 TEMÁTICAS · 2) elegís DIFICULTAD y modo · 3) jugás SIEMPRE sobre
 * esa temática (no cambia la pregunta). Los duelos son aleatorios (no se repite igual cada vez).
 * Fotos automáticas de TheSportsDB (misma API que "Adivina"). Ranking (game_scores) + compartir
 * en el FEED. Modos: Solo (racha), vs IA y vs amigo (pasar y jugar).
 */
(function(){
'use strict';

// Dataset. Valores aproximados y de conocimiento público (juego). born=año de nacimiento.
const P = [
  { s:'messi',    n:'Lionel Messi',       fee:0,   goals:850, titles:44, ballon:8, ucl:4, caps:190, teams:3, born:1987, wcFinal:true,  wcWon:true  },
  { s:'ronaldo',  n:'Cristiano Ronaldo',  fee:117, goals:900, titles:34, ballon:5, ucl:5, caps:210, teams:5, born:1985, wcFinal:false, wcWon:false },
  { s:'neymar',   n:'Neymar',             fee:222, goals:450, titles:31, ballon:0, ucl:1, caps:128, teams:5, born:1992, wcFinal:false, wcWon:false },
  { s:'mbappe',   n:'Kylian Mbappé',      fee:180, goals:320, titles:19, ballon:0, ucl:0, caps:86,  teams:3, born:1998, wcFinal:true,  wcWon:true  },
  { s:'benzema',  n:'Karim Benzema',      fee:35,  goals:430, titles:32, ballon:1, ucl:5, caps:97,  teams:3, born:1987, wcFinal:false, wcWon:false },
  { s:'modric',   n:'Luka Modrić',        fee:35,  goals:100, titles:28, ballon:1, ucl:6, caps:180, teams:4, born:1985, wcFinal:true,  wcWon:false },
  { s:'lewa',     n:'Robert Lewandowski', fee:45,  goals:650, titles:34, ballon:0, ucl:1, caps:150, teams:5, born:1988, wcFinal:false, wcWon:false },
  { s:'haaland',  n:'Erling Haaland',     fee:60,  goals:300, titles:11, ballon:0, ucl:1, caps:40,  teams:4, born:2000, wcFinal:false, wcWon:false },
  { s:'debruyne', n:'Kevin De Bruyne',    fee:76,  goals:200, titles:18, ballon:0, ucl:1, caps:100, teams:5, born:1991, wcFinal:false, wcWon:false },
  { s:'salah',    n:'Mohamed Salah',      fee:42,  goals:350, titles:9,  ballon:0, ucl:1, caps:100, teams:6, born:1992, wcFinal:false, wcWon:false },
  { s:'suarez',   n:'Luis Suárez',        fee:82,  goals:500, titles:24, ballon:0, ucl:1, caps:140, teams:7, born:1987, wcFinal:false, wcWon:false },
  { s:'dimaria',  n:'Ángel Di María',     fee:75,  goals:250, titles:34, ballon:0, ucl:1, caps:145, teams:6, born:1988, wcFinal:true,  wcWon:true  },
  { s:'ramos',    n:'Sergio Ramos',       fee:27,  goals:130, titles:33, ballon:0, ucl:4, caps:180, teams:3, born:1986, wcFinal:true,  wcWon:true  },
  { s:'kane',     n:'Harry Kane',         fee:100, goals:400, titles:1,  ballon:0, ucl:0, caps:90,  teams:5, born:1993, wcFinal:false, wcWon:false },
  { s:'pele',     n:'Pelé',               fee:0,   goals:1000,titles:30, ballon:0, ucl:0, caps:92,  teams:2, born:1940, wcFinal:true,  wcWon:true  },
  { s:'maradona', n:'Diego Maradona',     fee:10,  goals:350, titles:12, ballon:0, ucl:0, caps:91,  teams:5, born:1960, wcFinal:true,  wcWon:true  },
  { s:'cruyff',   n:'Johan Cruyff',       fee:2,   goals:400, titles:22, ballon:3, ucl:3, caps:48,  teams:5, born:1947, wcFinal:true,  wcWon:false },
  { s:'beckenbauer', n:'Franz Beckenbauer', fee:0, goals:100, titles:20, ballon:2, ucl:3, caps:103, teams:3, born:1945, wcFinal:true,  wcWon:true  },
  { s:'zidane',   n:'Zinedine Zidane',    fee:77,  goals:150, titles:16, ballon:1, ucl:1, caps:108, teams:4, born:1972, wcFinal:true,  wcWon:true  },
  { s:'ronaldinho', n:'Ronaldinho',       fee:30,  goals:250, titles:18, ballon:1, ucl:1, caps:97,  teams:6, born:1980, wcFinal:true,  wcWon:true  },
  { s:'r9',       n:'Ronaldo Nazário',    fee:47,  goals:420, titles:16, ballon:2, ucl:0, caps:98,  teams:7, born:1976, wcFinal:true,  wcWon:true  },
  { s:'romario',  n:'Romário',            fee:5,   goals:750, titles:20, ballon:0, ucl:0, caps:70,  teams:9, born:1966, wcFinal:true,  wcWon:true  },
  { s:'baggio',   n:'Roberto Baggio',     fee:8,   goals:320, titles:5,  ballon:1, ucl:0, caps:56,  teams:6, born:1967, wcFinal:true,  wcWon:false },
  { s:'platini',  n:'Michel Platini',     fee:2,   goals:350, titles:8,  ballon:3, ucl:1, caps:72,  teams:3, born:1955, wcFinal:false, wcWon:false },
  { s:'vanbasten',n:'Marco van Basten',   fee:1.5, goals:300, titles:14, ballon:3, ucl:2, caps:58,  teams:2, born:1964, wcFinal:false, wcWon:false },
  { s:'figo',     n:'Luís Figo',          fee:62,  goals:170, titles:18, ballon:1, ucl:1, caps:127, teams:4, born:1972, wcFinal:false, wcWon:false },
  { s:'kaka',     n:'Kaká',               fee:65,  goals:260, titles:13, ballon:1, ucl:1, caps:92,  teams:4, born:1982, wcFinal:true,  wcWon:true  },
  { s:'xavi',     n:'Xavi Hernández',     fee:0,   goals:130, titles:32, ballon:0, ucl:4, caps:133, teams:2, born:1980, wcFinal:true,  wcWon:true  },
  { s:'iniesta',  n:'Andrés Iniesta',     fee:0,   goals:150, titles:35, ballon:0, ucl:4, caps:131, teams:3, born:1984, wcFinal:true,  wcWon:true  },
  { s:'buffon',   n:'Gianluigi Buffon',   fee:52,  goals:0,   titles:28, ballon:0, ucl:0, caps:176, teams:4, born:1978, wcFinal:true,  wcWon:true  },
];

// 10 TEMÁTICAS. better: 'higher' gana el valor más alto, 'lower' el más bajo. bool: verdadero/falso.
const CATS = [
  { k:'fee',    label:'Fichaje más caro',        icon:'bx-euro',       q:'¿Quién tuvo el fichaje más caro?',            better:'higher', fmt:v=>v>0?('€'+v+'M'):'sin fichaje récord' },
  { k:'goals',  label:'Más goles',               icon:'bx-football',   q:'¿Quién hizo más goles en su carrera?',        better:'higher', fmt:v=>v+' goles' },
  { k:'titles', label:'Más títulos',             icon:'bx-trophy',     q:'¿Quién ganó más títulos?',                    better:'higher', fmt:v=>v+' títulos' },
  { k:'ballon', label:'Balones de Oro',          icon:'bx-medal',      q:'¿Quién ganó más Balones de Oro?',             better:'higher', fmt:v=>v+(v===1?' Balón':' Balones')+' de Oro' },
  { k:'ucl',    label:'Champions League',        icon:'bx-star',       q:'¿Quién ganó más Champions League?',           better:'higher', fmt:v=>v+' Champions' },
  { k:'caps',   label:'Partidos con su selección',icon:'bx-flag',      q:'¿Quién jugó más partidos con su selección?',  better:'higher', fmt:v=>v+' partidos' },
  { k:'teams',  label:'Más clubes',              icon:'bx-transfer',   q:'¿Quién jugó en más clubes?',                  better:'higher', fmt:v=>v+' clubes' },
  { k:'born',   label:'El más veterano',         icon:'bx-time-five',  q:'¿Quién es más veterano (nació antes)?',       better:'lower',  fmt:v=>'nació en '+v },
  { k:'wcFinal',label:'Final de Mundial',        icon:'bx-world',      q:'¿Quién jugó una final de Copa del Mundo?',    bool:true, boolText:'jugó una final de Copa del Mundo' },
  { k:'wcWon',  label:'Campeón del Mundo',        icon:'bx-crown',      q:'¿Quién es campeón del Mundo?',                bool:true, boolText:'ganó la Copa del Mundo' },
];

let ST = null;

function _rng(a){ return a[Math.floor(Math.random()*a.length)]; }
function _shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function _boolVal(cat,p){ return !!p[cat.k]; }

// Elige dos jugadores según la temática y la dificultad. La dificultad controla qué tan CERCA
// están los valores (fácil = diferencia grande y obvia; difícil = valores parecidos).
function _pickPair(cat, diff){
  const recent = ST && ST.recent || [];
  const notRecent = p => !recent.includes(p.s);
  for (let attempt=0; attempt<40; attempt++){
    let a, b;
    if (cat.bool){
      const yes=P.filter(p=>_boolVal(cat,p)&&notRecent(p)), no=P.filter(p=>!_boolVal(cat,p)&&notRecent(p));
      if(!yes.length||!no.length) { a=_rng(P.filter(p=>_boolVal(cat,p))); b=_rng(P.filter(p=>!_boolVal(cat,p))); }
      else { a=_rng(yes); b=_rng(no); }
      if(a&&b&&a.s!==b.s) return Math.random()<.5?[a,b]:[b,a];
      continue;
    }
    const pool=P.filter(p=>p[cat.k]!=null).slice().sort((x,y)=>x[cat.k]-y[cat.k]);
    const n=pool.length;
    const band = diff==='facil' ? [Math.max(2,Math.floor(n*0.45)), n-1]
               : diff==='dificil' ? [1, 2]
               : [Math.floor(n*0.15), Math.floor(n*0.4)];
    let i=Math.floor(Math.random()*n);
    let dist=band[0]+Math.floor(Math.random()*(Math.max(1,band[1]-band[0])+1));
    let j = Math.random()<.5 ? i+dist : i-dist;
    j=Math.max(0,Math.min(n-1,j)); if(j===i) j=i>0?i-1:i+1;
    a=pool[i]; b=pool[j];
    if(a.s===b.s || a[cat.k]===b[cat.k]) continue;
    if(!notRecent(a)&&!notRecent(b)) continue;
    return Math.random()<.5?[a,b]:[b,a];
  }
  // fallback
  let a=_rng(P), b=_rng(P.filter(x=>x.s!==a.s));
  return [a,b];
}

// ── Foto (TheSportsDB) ──
const _hlPhotoCache={};
async function _hlPhoto(pl){
  const k=(pl.n||'').toLowerCase();
  if(k in _hlPhotoCache) return _hlPhotoCache[k];
  // Probar: override manual (api) → nombre → nombre sin acentos (mejora el match en la API).
  const stripped=(pl.n||'').normalize('NFD').replace(/[̀-ͯ]/g,'');
  const names=[...new Set([pl.api, pl.n, stripped].filter(Boolean))];
  let found=null;
  for(const nm of names){
    try{
      const r=await fetch('https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p='+encodeURIComponent(nm));
      const j=await r.json();
      const p=((j&&j.player)||[]).filter(x=>(x.strSport||'Soccer')==='Soccer')[0];
      if(p&&(p.strCutout||p.strThumb)){ found=p.strCutout||p.strThumb; break; }
    }catch(e){}
  }
  _hlPhotoCache[k]=found;
  return found;
}
function _avatar(pl,size,pick){
  const init=(pl.n||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  // Círculo estilo "cancha": césped radial + línea sutil. La foto cutout (PNG transparente)
  // queda sobre el césped (moderno). Las iniciales SOLO se ven si no hay foto y se esconden
  // cuando la foto carga (antes se veían raras detrás del PNG).
  return `<div id="hl-av-${pick}" data-slug="${pl.s}" style="position:relative;width:${size}px;height:${size}px;margin:0 auto;border-radius:50%;overflow:hidden;border:3px solid rgba(186,255,0,0.65);box-shadow:0 8px 26px rgba(0,0,0,0.55),inset 0 0 22px rgba(0,0,0,0.45);">
    <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 32%,#226b33,#0a2414 72%);"></div>
    <div style="position:absolute;inset:0;background-image:radial-gradient(circle at 50% 50%,transparent 40%,rgba(255,255,255,0.08) 41%,transparent 43%),linear-gradient(90deg,transparent 49.3%,rgba(255,255,255,0.06) 49.3%,rgba(255,255,255,0.06) 50.7%,transparent 50.7%);"></div>
    <div class="hl-init" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:${Math.round(size*0.3)}px;color:rgba(186,255,0,0.92);text-shadow:0 2px 6px rgba(0,0,0,0.5);">${init}</div>
    <img src="img/games/players/${pl.s}.jpg" alt="" onload="var b=this.closest('[id^=hl-av-]');var i=b&&b.querySelector('.hl-init');if(i)i.style.display='none';" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top;" onerror="this.remove()">
  </div>`;
}
async function _hlHydratePhotos(){
  ['a','b'].forEach(async(pick)=>{
    const pl=pick==='a'?ST.a:ST.b; if(!pl) return;
    const box=document.getElementById('hl-av-'+pick); if(!box||box.getAttribute('data-slug')!==pl.s) return;
    const url=await _hlPhoto(pl);
    const box2=document.getElementById('hl-av-'+pick);
    if(!url||!box2||box2.getAttribute('data-slug')!==pl.s||box2.querySelector('img.hl-api-photo')) return;
    const img=document.createElement('img'); img.className='hl-api-photo'; img.src=url;
    // Cutout PNG sobre el césped → object-fit contain para que se vea el jugador completo.
    img.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top;';
    img.onload=function(){ const i=box2.querySelector('.hl-init'); if(i) i.style.display='none'; };
    box2.appendChild(img);
  });
}

// Fondo estilo cancha de fútbol (césped en franjas + líneas: mediocampo y círculo central).
const _PITCH_BG = "background:#0a1f10;background-image:repeating-linear-gradient(0deg,#0c2413 0px,#0c2413 46px,#0a1f10 46px,#0a1f10 92px),radial-gradient(circle at 50% 50%,rgba(255,255,255,0.05),transparent 60%);";
const _PITCH_LINES = `<div style="position:absolute;inset:0;pointer-events:none;opacity:.5;">
  <div style="position:absolute;top:50%;left:0;right:0;height:2px;background:rgba(255,255,255,0.18);"></div>
  <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:120px;height:120px;border:2px solid rgba(255,255,255,0.18);border-radius:50%;"></div>
  <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:8px;height:8px;background:rgba(255,255,255,0.25);border-radius:50%;"></div>
</div>`;
function _shell(inner){
  let m=document.getElementById('hl-modal'); if(m) m.remove();
  m=document.createElement('div'); m.id='hl-modal';
  m.style.cssText="position:fixed;inset:0;z-index:9950;overflow-y:auto;background:linear-gradient(rgba(10,10,10,0.72),rgba(10,10,10,0.9)),url('img/games-bg/higher-lower.webp') center/cover no-repeat;";
  m.innerHTML=`<div style="position:absolute;inset:0;">${_PITCH_LINES}</div>
    <div style="position:relative;max-width:520px;margin:0 auto;min-height:100%;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top,0px) + 12px) 16px calc(24px + env(safe-area-inset-bottom));">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
      <button onclick="window._hlBack()" style="background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.15);border-radius:50%;width:36px;height:36px;color:#fff;font-size:18px;cursor:pointer;flex-shrink:0;backdrop-filter:blur(6px);"><i class='bx bx-arrow-back'></i></button>
      <div style="font-weight:900;color:#fff;font-size:16px;display:flex;align-items:center;gap:8px;text-shadow:0 2px 6px rgba(0,0,0,0.6);"><i class='bx bx-trending-up' style="color:var(--accent);"></i> Más o Menos</div>
      <button onclick="window.CGCore&&CGCore.openRanking('higher-lower')" style="margin-left:auto;background:rgba(0,0,0,0.45);border:1px solid rgba(255,215,0,0.5);border-radius:50%;width:34px;height:34px;color:#FFD700;cursor:pointer;backdrop-filter:blur(6px);" title="Ranking"><i class='bx bx-trophy'></i></button>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">${inner}</div>
  </div>`;
  document.body.appendChild(m);
}
// Volver contextual: del juego → a la config de la temática; de la config → al menú; del menú → a Juegos.
window._hlBack = function(){
  if (ST && ST.phase==='play'){ _hlConfig(ST.cat.k); return; }
  if (ST && ST.phase==='config'){ window._higherLowerStart(); return; }
  document.getElementById('hl-modal')?.remove();
  try{ window.openGamesModal && window.openGamesModal(); }catch(e){}
};

// ── 1) MENÚ DE TEMÁTICAS (10) ──
window._higherLowerStart = function(){
  try{ ['player-bottom-nav','club-bottom-nav'].forEach(n=>document.getElementById(n)?.style.setProperty('display','none','important')); }catch(e){}
  ST = { phase:'menu' };
  const card = (c)=>`<button onclick="window._hlConfig('${c.k}')" style="background:#0d0d0d;border:1px solid #1c1c1c;border-radius:16px;padding:16px 10px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;transition:.15s;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='#1c1c1c'">
      <i class='bx ${c.icon}' style="font-size:26px;color:var(--accent);"></i>
      <span style="font-size:12px;font-weight:800;color:#fff;text-align:center;line-height:1.2;">${c.label}</span>
    </button>`;
  _shell(`
    <div style="text-align:center;margin-bottom:14px;">
      <div style="font-weight:900;font-size:20px;color:#fff;">Elegí una temática</div>
      <div style="font-size:12px;color:#888;margin-top:4px;">Vas a jugar siempre sobre lo que elijas.</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">${CATS.map(card).join('')}</div>`);
};

// ── 2) CONFIG: dificultad + modo ──
window._hlConfig = function(catKey){
  const cat = CATS.find(c=>c.k===catKey); if(!cat) return;
  ST = { phase:'config', cat, diff:'media', mode:'solo' };
  const diffBtn=(v,l)=>`<button data-hl-diff="${v}" onclick="window._hlSetDiff('${v}',this)" style="flex:1;background:${v==='media'?'var(--accent)':'rgba(255,255,255,0.05)'};color:${v==='media'?'#000':'#ccc'};border:1px solid ${v==='media'?'var(--accent)':'rgba(255,255,255,0.1)'};border-radius:10px;padding:10px;font-weight:800;font-size:12px;cursor:pointer;">${l}</button>`;
  const modeBtn=(v,l,ic)=>`<button data-hl-mode="${v}" onclick="window._hlSetMode('${v}',this)" style="flex:1;background:${v==='solo'?'var(--accent)':'rgba(255,255,255,0.05)'};color:${v==='solo'?'#000':'#ccc'};border:1px solid ${v==='solo'?'var(--accent)':'rgba(255,255,255,0.1)'};border-radius:10px;padding:10px;font-weight:800;font-size:11px;cursor:pointer;"><i class='bx ${ic}'></i> ${l}</button>`;
  _shell(`
    <div style="text-align:center;margin-bottom:18px;">
      <i class='bx ${cat.icon}' style="font-size:44px;color:var(--accent);"></i>
      <div style="font-weight:900;font-size:20px;color:#fff;margin-top:6px;">${cat.label}</div>
      <div style="font-size:12.5px;color:#999;margin-top:4px;">${cat.q}</div>
    </div>
    <div style="max-width:360px;margin:0 auto;width:100%;">
      <div style="font-size:11px;font-weight:800;color:#666;letter-spacing:1px;margin-bottom:6px;">DIFICULTAD</div>
      <div style="display:flex;gap:8px;margin-bottom:16px;">${diffBtn('facil','Fácil')}${diffBtn('media','Media')}${diffBtn('dificil','Difícil')}</div>
      <div style="font-size:11px;font-weight:800;color:#666;letter-spacing:1px;margin-bottom:6px;">MODO</div>
      <div style="display:flex;gap:8px;margin-bottom:22px;">${modeBtn('solo','Solo','bx-user')}${modeBtn('ia','vs IA','bx-bot')}${modeBtn('amigo','vs Amigo','bx-group')}</div>
      <button onclick="window._hlBegin()" style="width:100%;background:linear-gradient(135deg,#baff00,#8fd400);color:#000;border:none;border-radius:14px;padding:15px;font-weight:900;font-size:16px;cursor:pointer;"><i class='bx bx-play'></i> Jugar</button>
    </div>`);
};
window._hlSetDiff=function(v,btn){ ST.diff=v; document.querySelectorAll('[data-hl-diff]').forEach(b=>{const on=b===btn;b.style.background=on?'var(--accent)':'rgba(255,255,255,0.05)';b.style.color=on?'#000':'#ccc';b.style.borderColor=on?'var(--accent)':'rgba(255,255,255,0.1)';}); };
window._hlSetMode=function(v,btn){ ST.mode=v; document.querySelectorAll('[data-hl-mode]').forEach(b=>{const on=b===btn;b.style.background=on?'var(--accent)':'rgba(255,255,255,0.05)';b.style.color=on?'#000':'#ccc';b.style.borderColor=on?'var(--accent)':'rgba(255,255,255,0.1)';}); };

// ── 3) JUGAR ──
window._hlBegin=function(){
  const cat=ST.cat, diff=ST.diff, mode=ST.mode;
  ST={ phase:'play', cat, diff, mode, score:0, best:0, round:0, maxRounds: mode==='solo'?Infinity:10, scoreP1:0, scoreP2:0, turn:1, locked:false, recent:[] };
  _nextRound(); _renderRound();
};
function _nextRound(){
  const [a,b]=_pickPair(ST.cat, ST.diff);
  ST.a=a; ST.b=b; ST.locked=false;
  ST.recent=[a.s,b.s].concat(ST.recent).slice(0,6); // evita repetir los últimos jugadores
}
function _correct(pick){
  const a=ST.a,b=ST.b,cat=ST.cat;
  if(cat.bool){ const chosen=pick==='a'?a:b; return _boolVal(cat,chosen); }
  const av=a[cat.k], bv=b[cat.k];
  if(av===bv) return true;
  const aIsBetter = cat.better==='lower' ? (av<bv) : (av>bv);
  return pick==='a' ? aIsBetter : !aIsBetter;
}
function _winner(){
  const a=ST.a,b=ST.b,cat=ST.cat;
  if(cat.bool) return _boolVal(cat,a)?a:b;
  return (cat.better==='lower' ? a[cat.k]<=b[cat.k] : a[cat.k]>=b[cat.k]) ? a : b;
}
function _renderRound(){
  const a=ST.a,b=ST.b,cat=ST.cat, isVs=ST.mode!=='solo';
  const turnLabel = ST.mode==='amigo' ? ('Turno de Jugador '+ST.turn) : (ST.mode==='ia'?'Tu turno':'');
  const header = isVs
    ? `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:12px;font-weight:800;">
         <span style="color:var(--accent);">${ST.mode==='ia'?'Vos':'Jug 1'}: ${ST.scoreP1}</span>
         <span style="color:#888;">Ronda ${ST.round+1}/10 · ${cat.label}</span>
         <span style="color:#4a9eff;">${ST.mode==='ia'?'IA':'Jug 2'}: ${ST.scoreP2}</span>
       </div>${turnLabel?`<div style="text-align:center;font-size:11px;color:#aaa;margin-bottom:10px;">${turnLabel}</div>`:''}`
    : `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;font-size:13px;font-weight:800;">
         <span style="color:var(--accent);">Racha: ${ST.score}</span>
         <span style="color:#888;">${cat.label} · ${ST.diff}</span>
         <span style="color:#888;">Mejor: ${ST.best}</span>
       </div>`;
  const cardBtn=(pl,pick)=>`<button onclick="window._hlPick('${pick}')" ${ST.locked?'disabled':''} style="flex:1;min-width:0;background:rgba(6,20,10,0.66);border:1.5px solid rgba(186,255,0,0.28);border-radius:20px;padding:22px 10px;cursor:${ST.locked?'default':'pointer'};display:flex;flex-direction:column;align-items:center;gap:12px;backdrop-filter:blur(8px);box-shadow:0 8px 30px rgba(0,0,0,0.4);" ${ST.locked?'':'onmouseover="this.style.borderColor=\'var(--accent)\';this.style.transform=\'translateY(-3px)\'" onmouseout="this.style.borderColor=\'rgba(186,255,0,0.28)\';this.style.transform=\'none\'"'}>
      ${_avatar(pl,104,pick)}
      <div style="font-weight:900;font-size:15px;color:#fff;text-align:center;line-height:1.2;text-shadow:0 2px 6px rgba(0,0,0,0.6);">${pl.n}</div>
      <div id="hl-val-${pick}" style="font-size:13px;color:#8aa;height:18px;font-weight:800;"></div>
    </button>`;
  _shell(`${header}
    <div style="text-align:center;font-weight:900;font-size:18px;color:#fff;margin-bottom:20px;padding:10px 14px;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.1);border-radius:16px;backdrop-filter:blur(6px);">${cat.q}</div>
    <div style="display:flex;gap:14px;align-items:stretch;">${cardBtn(a,'a')}
      <div style="align-self:center;display:flex;flex-direction:column;align-items:center;"><div style="width:44px;height:44px;border-radius:50%;background:rgba(0,0,0,0.5);border:2px solid var(--accent);display:flex;align-items:center;justify-content:center;font-weight:900;color:var(--accent);font-size:15px;backdrop-filter:blur(6px);">VS</div></div>
      ${cardBtn(b,'b')}</div>
    <div id="hl-reveal" style="margin-top:20px;min-height:52px;text-align:center;"></div>`);
  _hlHydratePhotos();
}

window._hlPick=function(pick){
  if(!ST||ST.locked) return; ST.locked=true;
  const ok=_correct(pick), w=_winner(), cat=ST.cat;
  const setVal=(id,pl)=>{ const el=document.getElementById(id); if(!el) return;
    if(cat.bool){ el.innerHTML=`<b style="color:${_boolVal(cat,pl)?'var(--accent)':'#888'};">${_boolVal(cat,pl)?'Sí':'No'}</b>`; }
    else { const isW=(cat.better==='lower'?pl[cat.k]<=w[cat.k]:pl[cat.k]>=w[cat.k]); el.innerHTML=`<b style="color:${isW?'var(--accent)':'#888'};">${cat.fmt(pl[cat.k])}</b>`; }
  };
  setVal('hl-val-a',ST.a); setVal('hl-val-b',ST.b);
  const argTxt = cat.bool ? `${w.n} ${cat.boolText}.` : `${w.n}: ${cat.fmt(w[cat.k])}.`;
  const rev=document.getElementById('hl-reveal');
  const nextBtn=(lbl)=>`<button onclick="window._hlNext()" style="margin-top:12px;background:var(--accent);color:#000;border:none;border-radius:12px;padding:10px 22px;font-weight:900;cursor:pointer;">${lbl||'Siguiente'}</button>`;

  if(ST.mode==='solo'){
    if(ok){ ST.score++; ST.best=Math.max(ST.best,ST.score);
      if(rev) rev.innerHTML=`<div style="color:var(--accent);font-weight:900;font-size:15px;"><i class='bx bx-check-circle'></i> ¡Correcto!</div><div style="color:#999;font-size:12px;margin-top:4px;">${argTxt}</div>${nextBtn()}`;
    } else {
      if(rev) rev.innerHTML=`<div style="color:#ff5a5a;font-weight:900;font-size:15px;"><i class='bx bx-x-circle'></i> ¡Fallaste!</div><div style="color:#999;font-size:12px;margin-top:4px;">${argTxt}</div>`;
      _hlGameOver();
    }
    return;
  }
  if(ST.mode==='ia'){
    if(ok) ST.scoreP1++;
    const iaOk=Math.random()<(ST.diff==='dificil'?0.6:ST.diff==='facil'?0.8:0.7); if(iaOk) ST.scoreP2++;
    if(rev) rev.innerHTML=`<div style="font-weight:900;font-size:14px;color:${ok?'var(--accent)':'#ff5a5a'};">${ok?'Acertaste':'Fallaste'} · IA ${iaOk?'acertó':'falló'}</div><div style="color:#999;font-size:12px;margin-top:4px;">${argTxt}</div>${nextBtn()}`;
  } else {
    if(ok){ if(ST.turn===1) ST.scoreP1++; else ST.scoreP2++; }
    if(rev) rev.innerHTML=`<div style="font-weight:900;font-size:14px;color:${ok?'var(--accent)':'#ff5a5a'};">Jugador ${ST.turn}: ${ok?'acertó':'falló'}</div><div style="color:#999;font-size:12px;margin-top:4px;">${argTxt}</div>${nextBtn((ST.turn===1)?'Pasar al Jugador 2':'Siguiente')}`;
  }
};
window._hlNext=function(){
  if(ST.mode==='amigo' && ST.turn===1){ ST.turn=2; ST.locked=false; _nextRound(); _renderRound(); return; }
  ST.round++; ST.turn=1;
  if(ST.round>=ST.maxRounds){ _hlVersusOver(); return; }
  _nextRound(); _renderRound();
};

function _hlGameOver(){
  const pts=ST.best; const cat=ST.cat;
  try{ if(window.CGCore) CGCore.saveScore('higher-lower', pts); }catch(e){}
  setTimeout(()=>{
    _shell(`<div style="text-align:center;">
      <div style="font-size:46px;"><i class='bx bx-trophy' style="color:#FFD700;"></i></div>
      <div style="font-weight:900;font-size:22px;color:#fff;margin-top:6px;">Racha: ${pts}</div>
      <div style="font-size:13px;color:#888;margin:6px 0 20px;">${cat.label} · ${pts>=10?'¡Crack absoluto!':pts>=5?'¡Muy bien!':'Seguí practicando.'}</div>
      <div style="display:flex;flex-direction:column;gap:10px;max-width:300px;margin:0 auto;">
        <button onclick="window._hlBegin()" style="background:linear-gradient(135deg,#baff00,#8fd400);color:#000;border:none;border-radius:14px;padding:14px;font-weight:900;cursor:pointer;">Jugar otra vez</button>
        <button onclick="window._hlShareFeed(${pts})" style="background:rgba(186,255,0,0.1);color:var(--accent);border:1px solid rgba(186,255,0,0.4);border-radius:14px;padding:13px;font-weight:900;cursor:pointer;"><i class='bx bx-share-alt'></i> Compartir en el feed</button>
        <button onclick="window.CGCore&&CGCore.openRanking('higher-lower')" style="background:rgba(0,0,0,0.4);color:#FFD700;border:1px solid rgba(255,215,0,0.4);border-radius:14px;padding:13px;font-weight:900;cursor:pointer;"><i class='bx bx-trophy'></i> Ver ranking</button>
        <button onclick="window._higherLowerStart()" style="background:none;color:#888;border:none;padding:8px;font-size:13px;cursor:pointer;">Cambiar temática</button>
      </div>
    </div>`);
  },900);
}
function _hlVersusOver(){
  const p1=ST.scoreP1,p2=ST.scoreP2, iaMode=ST.mode==='ia';
  const n1=iaMode?'Vos':'Jugador 1', n2=iaMode?'IA':'Jugador 2';
  const win=p1>p2?n1:p2>p1?n2:'Empate';
  if(iaMode){ try{ if(window.CGCore) CGCore.saveScore('higher-lower', p1); }catch(e){} }
  _shell(`<div style="text-align:center;">
    <div style="font-size:46px;"><i class='bx bx-trophy' style="color:#FFD700;"></i></div>
    <div style="font-weight:900;font-size:20px;color:#fff;margin-top:6px;">${win==='Empate'?'¡Empate!':(win+' gana')}</div>
    <div style="font-size:12px;color:#888;margin-top:2px;">${ST.cat.label}</div>
    <div style="display:flex;justify-content:center;gap:26px;margin:14px 0 20px;">
      <div><div style="font-size:12px;color:var(--accent);font-weight:800;">${n1}</div><div style="font-size:30px;font-weight:900;color:#fff;">${p1}</div></div>
      <div style="align-self:center;color:#333;font-weight:900;">—</div>
      <div><div style="font-size:12px;color:#4a9eff;font-weight:800;">${n2}</div><div style="font-size:30px;font-weight:900;color:#fff;">${p2}</div></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;max-width:300px;margin:0 auto;">
      <button onclick="window._hlBegin()" style="background:linear-gradient(135deg,#baff00,#8fd400);color:#000;border:none;border-radius:14px;padding:14px;font-weight:900;cursor:pointer;">Revancha</button>
      <button onclick="window._hlShareFeed(${Math.max(p1,p2)},'${win.replace(/'/g,'')}')" style="background:rgba(186,255,0,0.1);color:var(--accent);border:1px solid rgba(186,255,0,0.4);border-radius:14px;padding:13px;font-weight:900;cursor:pointer;"><i class='bx bx-share-alt'></i> Compartir en el feed</button>
      <button onclick="window._higherLowerStart()" style="background:none;color:#888;border:none;padding:8px;font-size:13px;cursor:pointer;">Cambiar temática</button>
    </div>
  </div>`);
}

// Compartir en el FEED (post real), no por WhatsApp. Usa la identidad activa.
window._hlShareFeed = async function(pts, win){
  const sb = window._sb; const u = window.userData;
  if(!sb || !u || !u.email){ if(window.showToast) showToast('Iniciá sesión para compartir.','warning'); return; }
  const tema = (ST&&ST.cat)?ST.cat.label:'fútbol';
  const content = win
    ? `🎮 Jugué "Más o Menos · ${tema}" en Canchero — resultado: ${win}. ¿Te animás a superarme?`
    : `🎮 Hice una racha de ${pts} en "Más o Menos · ${tema}" de Canchero ⚽🔥 ¿La superás?`;
  const post = {
    user_email: u.email,
    user_name: (window._pubAvatar && window._pubAvatar().name) || u.name || u.email,
    user_role: (window._pubRole && window._pubRole()) || u.role || 'jugador',
    user_avatar: (window._pubAvatar && window._pubAvatar().photo) || u.photo || null,
    content, media_type:'text', likes_count:0, comments_count:0,
    expires_at: new Date(Date.now()+12*3600000).toISOString()
  };
  const bizId = (window._pubBizId && window._pubBizId()) || null; if(bizId) post.business_id = bizId;
  try{
    const { error } = await sb.from('posts').insert(post);
    if(error) throw error;
    if(window.showToast) showToast('¡Compartido en el feed!','success');
    try{ document.getElementById('hl-modal')?.remove(); if(window.switchDashboardTab) switchDashboardTab('jugador','feed'); }catch(e){}
  }catch(e){ if(window.showToast) showToast('No se pudo compartir.','error'); }
};

console.log('[canchero-higher-lower] ✅ Juego Más o Menos (temáticas) cargado');
})();
