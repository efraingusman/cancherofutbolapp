/**
 * canchero-once-ideal.js — Juego "11 Ideal"
 * Dos ruletas (10 equipos / 10 selecciones) que giran con un botón.
 * Cancha con 11 posiciones; tras cada giro elegís un jugador y lo ubicás.
 * Al completar el 11: la IA hace cuenta regresiva, puntúa y declara ganador.
 * Revancha / Compartir. (Solo / vs IA; base lista para 1v1 online.)
 */
(function(){
'use strict';
function toast(m,t){ if(window.showToast) showToast(m,t); }

const EQUIPOS = ['Barcelona','Real Madrid','Manchester City','Liverpool','Bayern Múnich','PSG','Juventus','Milan','Boca Juniors','Peñarol'];
const SELECCIONES = ['Brasil','Argentina','Francia','Uruguay','España','Alemania','Inglaterra','Portugal','Países Bajos','Italia'];
const POS = [
  {k:'ARQ',x:50,y:90}, {k:'DEF',x:18,y:72},{k:'DEF',x:39,y:75},{k:'DEF',x:61,y:75},{k:'DEF',x:82,y:72},
  {k:'MED',x:30,y:50},{k:'MED',x:50,y:53},{k:'MED',x:70,y:50},
  {k:'DEL',x:25,y:25},{k:'DEL',x:50,y:20},{k:'DEL',x:75,y:25}
];
/* Etiqueta específica de cada slot (1-4-3-3) — para la 3ª ruleta de posición */
const POS_LABEL = ['ARQ','LI','DFC','DFC','LD','MC','MC','MC','EI','DC','ED'];
// jugadores estrella (para puntuar) — nombre→puntos
const STARS = {messi:10,'cristiano':10,ronaldo:9,maradona:10,pele:10,'pelé':10,ronaldinho:9,zidane:9,mbappe:9,'mbappé':9,haaland:9,neymar:8,suarez:8,'suárez':8,cavani:7,forlan:7,'forlán':7,iniesta:8,xavi:8,modric:8,'modrić':8,benzema:8,lewandowski:8,salah:8,debruyne:9,'de bruyne':9,vinicius:8,bellingham:8,kroos:8,ramos:7,puyol:7,casillas:8,buffon:8,maldini:8,pirlo:8,gerrard:8,lampard:7,henry:8,ronaldo9:9};

let G = {};

window._onceStart = function(challenge){
  document.getElementById('games-hub')?.remove();
  // Al entrar sin desafío: elegir modo
  if (!challenge && !window.__onceModePicked){
    let mm=document.getElementById('once-mode'); if(mm)mm.remove();
    mm=document.createElement('div'); mm.id='once-mode';
    mm.style.cssText='position:fixed;left:0;right:0;bottom:0;top:'+(window._navH?window._navH():0)+'px;z-index:9958;background:#0a0a0a;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;gap:12px;';
    mm.innerHTML='<div style="font-size:11px;color:var(--accent);font-weight:900;letter-spacing:2px;">11 IDEAL</div>'+
      '<div style="font-size:19px;font-weight:900;color:#fff;margin-bottom:8px;">¿Cómo querés jugar?</div>'+
      '<button onclick="this.parentElement.remove();window.__onceModePicked=1;window._onceStart();window.__onceModePicked=0;" style="width:100%;max-width:320px;background:var(--accent);color:#000;border:none;border-radius:14px;padding:16px;font-weight:900;font-size:15px;cursor:pointer;font-family:inherit;">🎮 JUGAR SOLO (vs IA)</button>'+
      '<button onclick="this.parentElement.remove();window.__onceModePicked=1;window.__onceDuel=1;window._onceStart();window.__onceModePicked=0;" style="width:100%;max-width:320px;background:rgba(100,180,255,0.08);color:#64b4ff;border:1px solid rgba(100,180,255,0.4);border-radius:14px;padding:16px;font-weight:900;font-size:15px;cursor:pointer;font-family:inherit;">⚔ DESAFIAR A UN AMIGO</button>'+
      '<button onclick="this.parentElement.remove();window.openGamesModal&&openGamesModal()" style="margin-top:6px;background:none;border:none;color:#777;font-size:13px;cursor:pointer;">← Volver</button>';
    document.body.appendChild(mm);
    return;
  }
  G = { roll:null, placed:Array(11).fill(null), idx:0, challenge: challenge||null, duelIntent: !!(challenge),
        vsIA: (!challenge && !window.__onceDuel), ia: Array(11).fill(null) };
  let m=document.getElementById('once-modal'); if(m)m.remove();
  m=document.createElement('div'); m.id='once-modal';
  m.style.cssText='position:fixed;inset:0;z-index:9960;background:#0a0a0a;display:flex;flex-direction:column;';
  document.body.appendChild(m);
  ['player-bottom-nav','club-bottom-nav'].forEach(n=>document.getElementById(n)?.style.setProperty('display','none','important'));
  _onceRender();
};
window._onceClose = function(){ const m=document.getElementById('once-modal'); if(m)m.remove(); ['player-bottom-nav','club-bottom-nav'].forEach(n=>document.getElementById(n)?.style.removeProperty('display')); if(window.openGamesModal)window.openGamesModal(); };

function _onceRender(){
  const m=document.getElementById('once-modal'); if(!m)return;
  const filled=G.placed.filter(Boolean).length;
  m.innerHTML=`
    <div style="flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:max(8px,env(safe-area-inset-top)) 14px 8px;background:#0a0a0a;border-bottom:1px solid #1a1a1a;">
      <button onclick="window._onceClose()" style="background:rgba(255,255,255,0.06);border:none;border-radius:50%;width:36px;height:36px;color:#fff;font-size:18px;cursor:pointer;"><i class='bx bx-arrow-back'></i></button>
      <div style="flex:1;"><div style="font-size:16px;font-weight:900;color:#fff;">📋 11 Ideal</div><div style="font-size:11px;color:#888;">Armá tu once · ${filled}/11</div></div>
      <button onclick="window.CGCore&&CGCore.openRanking('once-ideal')" title="Ranking" style="background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.35);border-radius:50%;width:34px;height:34px;color:#FFD700;cursor:pointer;font-size:16px;"><i class='bx bx-trophy'></i></button>
    </div>
    <!-- Ruletas (equipo + selección + posición) -->
    <div style="flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:12px 14px;background:#0d0d0d;">
      <div style="flex:1;text-align:center;min-width:0;"><div style="font-size:9px;color:#888;font-weight:800;letter-spacing:1px;">EQUIPO</div><div id="roul-eq" style="background:#111;border:1px solid #243018;border-radius:10px;padding:10px 4px;font-weight:900;font-size:12px;color:var(--accent);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">—</div></div>
      <div style="flex:1;text-align:center;min-width:0;"><div style="font-size:9px;color:#888;font-weight:800;letter-spacing:1px;">SELECCIÓN</div><div id="roul-sel" style="background:#111;border:1px solid #1a3a5c;border-radius:10px;padding:10px 4px;font-weight:900;font-size:12px;color:#64b4ff;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">—</div></div>
      <div style="flex:0 0 64px;text-align:center;"><div style="font-size:9px;color:#888;font-weight:800;letter-spacing:1px;">POSICIÓN</div><div id="roul-pos" style="background:#111;border:1px solid #4a3a14;border-radius:10px;padding:10px 4px;font-weight:900;font-size:12px;color:#FFD700;overflow:hidden;white-space:nowrap;">—</div></div>
      <button onclick="window._onceSpin()" id="once-spin" ${filled>=11?'disabled':''} style="flex-shrink:0;width:54px;height:54px;border-radius:50%;background:${filled>=11?'#1a1a1a':'var(--accent)'};color:${filled>=11?'#555':'#000'};border:none;font-size:22px;font-weight:900;cursor:${filled>=11?'default':'pointer'};box-shadow:${filled>=11?'none':'0 0 18px rgba(186,255,0,0.4)'};"><i class='bx bx-rotate-right'></i></button>
    </div>
    ${G.vsIA ? `<div id="once-ia-banner" style="flex:0 0 auto;padding:6px 14px;min-height:20px;text-align:center;"></div>` : ''}
    ${filled>=11 ? `<div style="flex:0 0 auto;padding:4px 14px;text-align:center;font-size:11px;color:var(--accent);font-weight:800;">✓ Tu 11 está completo — tocá FINALIZAR abajo</div>` : ''}
    <div id="once-prompt" style="flex:0 0 auto;padding:0 14px;"></div>
    <!-- Cancha(s) -->
    <div style="flex:1 1 auto;min-height:0;overflow-y:auto;padding:12px;">
      ${G.vsIA ? `<div style="display:flex;gap:8px;justify-content:center;align-items:stretch;">
        <div style="flex:1;min-width:0;">
          <div style="text-align:center;font-size:10px;font-weight:900;color:var(--accent);letter-spacing:1px;margin-bottom:5px;">TU 11 (${G.placed.filter(Boolean).length}/11)</div>
          ${_onceBoardHtml(G.placed, 'me')}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="text-align:center;font-size:10px;font-weight:900;color:#64b4ff;letter-spacing:1px;margin-bottom:5px;">11 DE LA IA (${G.ia.filter(Boolean).length}/11)</div>
          ${_onceBoardHtml(G.ia, 'ia')}
        </div>
      </div>`
      : `<div style="max-width:420px;margin:0 auto;">${_onceBoardHtml(G.placed, 'me')}</div>`}
    </div>
    <!-- Acción -->
    <div style="flex:0 0 auto;padding:12px 14px calc(12px + env(safe-area-inset-bottom));background:#0a0a0a;">
      <button onclick="window._onceFinish()" ${filled<11?'disabled':''} style="width:100%;background:${filled>=11?'var(--accent)':'#1a1a1a'};color:${filled>=11?'#000':'#555'};border:none;border-radius:14px;padding:14px;font-weight:900;font-size:15px;cursor:${filled>=11?'pointer':'default'};">${filled>=11?(G.vsIA?'⚡ FINALIZAR — QUE EL JUEZ DECIDA':'⚡ FINALIZAR — QUE LA IA DECIDA'):`Completá tu once (${filled}/11)`}</button>
    </div>`;
}

/* Dibuja una cancha (mía o de la IA). side='me' verde, 'ia' azul. Sólo mi cancha
   es tappeable para quitar. */
function _onceBoardHtml(board, side){
  const accent = side==='ia' ? '#64b4ff' : 'var(--accent)';
  const tap = side==='me' ? 'onclick="window._onceSlotTap(%I%)"' : '';
  return `<div style="position:relative;width:100%;aspect-ratio:2/3;margin:0 auto;background:linear-gradient(180deg,${side==='ia'?'#0c1a2a':'#0c2a14'},${side==='ia'?'#0a121f':'#0a1f0e'});border:2px solid ${side==='ia'?'#1f2f3a':'#1f3a1f'};border-radius:14px;overflow:hidden;">
    <div style="position:absolute;top:50%;left:0;right:0;height:2px;background:rgba(255,255,255,0.15);"></div>
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:60px;height:60px;border:2px solid rgba(255,255,255,0.15);border-radius:50%;"></div>
    ${POS.map((p,i)=>{ const pl=board[i]; const _ph = pl && pl.photo; const t=tap.replace('%I%',i); return `<div ${t} style="position:absolute;left:${p.x}%;top:${p.y}%;transform:translate(-50%,-50%);width:46px;text-align:center;${side==='me'?'cursor:pointer;':''}">
      <div style="width:32px;height:32px;margin:0 auto;border-radius:50%;${_ph?`background:url('${_ph}') center 20%/cover;`:`background:${pl?accent:'rgba(255,255,255,0.08)'};`}border:2px solid ${pl?accent:'rgba(255,255,255,0.25)'};display:flex;align-items:center;justify-content:center;color:${pl?'#000':'#888'};font-weight:900;font-size:12px;">${_ph?'':(pl?(pl.name[0].toUpperCase()):p.k[0])}</div>
      <div style="font-size:8px;color:${pl?'#fff':'#888'};font-weight:700;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${pl?pl.name.split(' ').slice(-1)[0]:POS_LABEL[i]}</div>
    </div>`; }).join('')}
  </div>`;
}
/* La IA juega su turno: GIRA su propia ruleta (visible) y elige un jugador de los
   disponibles para ese puesto. Su equipo/selección son propios (no los míos). */
async function _iaPlaceNext(){
  if (!G.vsIA) return;
  const slot = G.ia.findIndex(x=>!x);
  if (slot<0) return;
  const posLabel = POS_LABEL[slot];
  const g = SLOT_GROUP[posLabel] || 'mid';
  const usedIa = new Set(G.ia.filter(Boolean).map(p=>(p.name||'').toLowerCase().trim()));
  // Combinaciones (equipo+selección) que TIENEN una leyenda libre para este puesto
  let combos = [];
  LEGENDS.forEach(L => {
    if (L.pos!==g || usedIa.has(L.n.toLowerCase().trim())) return;
    (L.eq||[]).forEach(eq => combos.push({ eq, sel:L.nat }));
  });
  if (!combos.length){ G.ia[slot] = { name:'Suplente', pos:posLabel }; _onceRender(); return; }
  const target = combos[Math.floor(Math.random()*combos.length)];
  // Mostrar la ruleta de la IA girando y luego su elección
  const banner = document.getElementById('once-ia-banner');
  if (banner){
    let t=0;
    await new Promise(res=>{
      const iv=setInterval(()=>{
        t++;
        const re = EQUIPOS[Math.floor(Math.random()*EQUIPOS.length)];
        const rs = SELECCIONES[Math.floor(Math.random()*SELECCIONES.length)];
        banner.innerHTML = _iaBannerHtml(t>=14?target.eq:re, t>=14?target.sel:rs, posLabel, null);
        if (t>=14){ clearInterval(iv); res(); }
      }, 70);
    });
  }
  // Elegir la MEJOR leyenda de esa combinación+puesto
  let cands = LEGENDS.filter(L => L.pos===g && (L.eq||[]).indexOf(target.eq)!==-1 && L.nat===target.sel && !usedIa.has(L.n.toLowerCase().trim()));
  cands.sort((a,b)=> ((STARS[b.n.toLowerCase()]||5)+Math.random()*2) - ((STARS[a.n.toLowerCase()]||5)+Math.random()*2));
  const pick = cands[0];
  if (!pick){ G.ia[slot] = { name:'Suplente', pos:posLabel }; _onceRender(); return; }
  if (banner) banner.innerHTML = _iaBannerHtml(target.eq, target.sel, posLabel, pick.n);
  G.ia[slot] = { name: pick.n, eq: target.eq, sel: target.sel, pos: posLabel, photo:null };
  setTimeout(_onceRender, 650);
  try {
    const list = await _tsdbPlayers(pick.n, true);
    const hit = (list||[]).filter(pl => pl.strCutout || pl.strThumb)[0];
    if (hit && G.ia[slot] && G.ia[slot].name === pick.n) { G.ia[slot].photo = hit.strCutout || hit.strThumb; _onceRender(); }
  } catch(e){}
}
function _iaBannerHtml(eq, sel, pos, name){
  return `<div style="display:flex;align-items:center;gap:8px;justify-content:center;flex-wrap:wrap;font-size:11px;">
    <span style="color:#64b4ff;font-weight:900;">🤖 IA:</span>
    <span style="background:#111;border:1px solid #243018;border-radius:8px;padding:3px 8px;color:var(--accent);font-weight:800;">${eq}</span>
    <span style="background:#111;border:1px solid #1a3a5c;border-radius:8px;padding:3px 8px;color:#64b4ff;font-weight:800;">${sel}</span>
    <span style="background:#111;border:1px solid #4a3a14;border-radius:8px;padding:3px 8px;color:#FFD700;font-weight:800;">${pos}</span>
    ${name?`<span style="color:#fff;font-weight:900;">→ ${name}</span>`:'<i class="bx bx-loader-alt bx-spin" style="color:#64b4ff;"></i>'}
  </div>`;
}
/* Tras cada jugada mía, la IA responde con la suya (turno cada uno) */
function _iaRespond(){
  if (!G.vsIA) return;
  if (G.ia.filter(Boolean).length >= G.placed.filter(Boolean).length) return; // ya está a la par
  setTimeout(function(){ _iaPlaceNext(); }, 400);
}
/* Grupo de posición de cada slot y matcheo con strPosition de TheSportsDB */
const SLOT_GROUP = { 'ARQ':'gk','LI':'def','LD':'def','DFC':'def','MC':'mid','EI':'fwd','ED':'fwd','DC':'fwd' };
function _posMatches(strPosition, slotLabel){
  const g = SLOT_GROUP[slotLabel] || 'mid';
  const p = (strPosition||'').toLowerCase();
  if (!p) return true; // sin dato de posición → no descartar
  if (g==='gk')  return /keeper|portero|arquero/.test(p);
  if (g==='def') return /back|defen|defensa/.test(p);
  if (g==='mid') return /midfield|medio|volante/.test(p);
  return /wing|striker|forward|attack|delanter|extremo|centre-forward/.test(p);
}
/* ¿Jugadores del club <eq> con nacionalidad <sel> en la posición del slot?
   EXCLUYE a los que ya están elegidos en la cancha (no se repiten). */
function _onceAlreadyPlaced(name){
  return (G.placed||[]).some(x => x && (x.name||'').toLowerCase() === (name||'').toLowerCase());
}
async function _onceMatches(eq, sel, posLabel){
  // LEYENDAS de toda la historia (catálogo propio) + plantel ACTUAL (API)
  const legends = _legendMatches(eq, sel, posLabel);
  const list = await _tsdbPlayers(EQ_EN[eq]||eq, false);
  if (list === null) return legends.length ? legends : null; // API caída → al menos leyendas
  const natEn = NAT_EN[sel] || sel;
  const current = list.filter(pl => (pl.strNationality||'') === natEn && _posMatches(pl.strPosition, posLabel) && !_onceAlreadyPlaced(pl.strPlayer));
  // Unir sin duplicar (leyendas primero — historia antes que actuales)
  const seen = {};
  const merged = [];
  legends.concat(current).forEach(pl => {
    const k = (pl.strPlayer||'').toLowerCase().trim();
    if (!k || seen[k]) return; seen[k] = 1; merged.push(pl);
  });
  return merged;
}
window._onceSpin = function(){
  const eqEl=document.getElementById('roul-eq'), selEl=document.getElementById('roul-sel'), posEl=document.getElementById('roul-pos'), btn=document.getElementById('once-spin');
  // Pool de posiciones LIBRES (no se repiten: cada slot se sortea una sola vez)
  const freeIdx = G.placed.map((p,i)=>p?null:i).filter(i=>i!==null);
  if(!freeIdx.length){ toast('Ya está completo','info'); return; }
  if(btn){btn.disabled=true; btn.style.opacity='0.5';}
  let t=0; const iv=setInterval(()=>{
    eqEl.textContent=EQUIPOS[Math.floor(Math.random()*EQUIPOS.length)];
    selEl.textContent=SELECCIONES[Math.floor(Math.random()*SELECCIONES.length)];
    if(posEl) posEl.textContent=POS_LABEL[freeIdx[Math.floor(Math.random()*freeIdx.length)]];
    t++;
    if(t>18){ clearInterval(iv);
      // SOLO combinaciones que TENGAN jugadores reales (club + selección + posición),
      // evitando repetir combinaciones recientes de club+selección (pedido 2026-07-09).
      (async () => {
        const posIdx = freeIdx[Math.floor(Math.random()*freeIdx.length)];
        const posLabel = POS_LABEL[posIdx];
        G.recentCombos = G.recentCombos || [];
        let eq=null, sel=null, matches=null;
        for (let tries=0; tries<14; tries++){
          const _eq=EQUIPOS[Math.floor(Math.random()*EQUIPOS.length)];
          const _sel=SELECCIONES[Math.floor(Math.random()*SELECCIONES.length)];
          const combo = _eq + '|' + _sel;
          // No repetir las últimas combinaciones (salvo que ya agotamos intentos)
          if (tries < 10 && G.recentCombos.indexOf(combo) !== -1) continue;
          eqEl.textContent=_eq; selEl.textContent=_sel; if(posEl) posEl.textContent=posLabel;
          const m = await _onceMatches(_eq, _sel, posLabel);
          if (m === null) { eq=_eq; sel=_sel; matches=null; break; }   // sin API → texto libre
          if (m.length)   { eq=_eq; sel=_sel; matches=m; break; }
          eq=_eq; sel=_sel; matches=[];
        }
        G.recentCombos.push(eq + '|' + sel);
        if (G.recentCombos.length > 6) G.recentCombos.shift();
        eqEl.textContent=eq; selEl.textContent=sel; if(posEl) posEl.textContent=posLabel;
        G.roll={eq,sel,posIdx,posLabel,matches};
        if(btn){btn.disabled=false; btn.style.opacity='1';}
        _oncePrompt();
      })();
    }
  },70);
};
/* ── P5.3: jugadores REALES con foto (TheSportsDB — API gratuita) ─────────
   Tras girar, se listan jugadores reales del club sorteado (priorizando la
   nacionalidad de la selección sorteada). No se aceptan nombres inventados:
   se elige de la lista o del buscador de jugadores reales. */
const TSDB = 'https://www.thesportsdb.com/api/v1/json/3';
const NAT_EN = { 'Brasil':'Brazil','Argentina':'Argentina','Francia':'France','Uruguay':'Uruguay','España':'Spain','Alemania':'Germany','Inglaterra':'England','Portugal':'Portugal','Países Bajos':'Netherlands','Italia':'Italy' };
const EQ_EN = { 'Bayern Múnich':'Bayern Munich','Milan':'AC Milan','PSG':'Paris SG' };
const _tsdbCache = {};
/* ── LEYENDAS DE TODA LA HISTORIA ─────────────────────────────────────────
   La API gratuita solo devuelve el plantel ACTUAL. Este catálogo suma jugadores
   históricos por club+selección para que las opciones no sean solo actuales.
   pos: gk/def/mid/fwd */
const LEGENDS = [
  // ── Barcelona ──
  {n:'Ronaldinho',eq:['Barcelona','Milan','PSG'],nat:'Brasil',pos:'fwd'},
  {n:'Rivaldo',eq:['Barcelona','Milan'],nat:'Brasil',pos:'mid'},
  {n:'Romário',eq:['Barcelona'],nat:'Brasil',pos:'fwd'},
  {n:'Neymar',eq:['Barcelona','PSG'],nat:'Brasil',pos:'fwd'},
  {n:'Dani Alves',eq:['Barcelona','Juventus','PSG'],nat:'Brasil',pos:'def'},
  {n:'Lionel Messi',eq:['Barcelona','PSG'],nat:'Argentina',pos:'fwd'},
  {n:'Javier Mascherano',eq:['Barcelona','Liverpool'],nat:'Argentina',pos:'mid'},
  {n:'Diego Maradona',eq:['Barcelona','Boca Juniors'],nat:'Argentina',pos:'mid'},
  {n:'Juan Román Riquelme',eq:['Barcelona','Boca Juniors'],nat:'Argentina',pos:'mid'},
  {n:'Luis Suárez',eq:['Barcelona','Liverpool'],nat:'Uruguay',pos:'fwd'},
  {n:'Xavi Hernández',eq:['Barcelona'],nat:'España',pos:'mid'},
  {n:'Andrés Iniesta',eq:['Barcelona'],nat:'España',pos:'mid'},
  {n:'Carles Puyol',eq:['Barcelona'],nat:'España',pos:'def'},
  {n:'Gerard Piqué',eq:['Barcelona','Manchester City'],nat:'España',pos:'def'},
  {n:'Sergio Busquets',eq:['Barcelona'],nat:'España',pos:'mid'},
  {n:'Jordi Alba',eq:['Barcelona'],nat:'España',pos:'def'},
  {n:'David Villa',eq:['Barcelona'],nat:'España',pos:'fwd'},
  {n:'Antoine Griezmann',eq:['Barcelona'],nat:'Francia',pos:'fwd'},
  {n:'Ousmane Dembélé',eq:['Barcelona','PSG'],nat:'Francia',pos:'fwd'},
  {n:'Samuel Umtiti',eq:['Barcelona'],nat:'Francia',pos:'def'},
  {n:'Thierry Henry',eq:['Barcelona'],nat:'Francia',pos:'fwd'},
  {n:'Frenkie de Jong',eq:['Barcelona'],nat:'Países Bajos',pos:'mid'},
  {n:'Johan Cruyff',eq:['Barcelona'],nat:'Países Bajos',pos:'fwd'},
  {n:'Patrick Kluivert',eq:['Barcelona','Milan'],nat:'Países Bajos',pos:'fwd'},
  {n:'Memphis Depay',eq:['Barcelona'],nat:'Países Bajos',pos:'fwd'},
  {n:'Marc-André ter Stegen',eq:['Barcelona'],nat:'Alemania',pos:'gk'},
  {n:'Robert Lewandowski',eq:['Barcelona','Bayern Múnich'],nat:'Polonia',pos:'fwd'},
  // ── Real Madrid ──
  {n:'Roberto Carlos',eq:['Real Madrid'],nat:'Brasil',pos:'def'},
  {n:'Ronaldo Nazário',eq:['Real Madrid','Barcelona','Milan'],nat:'Brasil',pos:'fwd'},
  {n:'Kaká',eq:['Real Madrid','Milan'],nat:'Brasil',pos:'mid'},
  {n:'Casemiro',eq:['Real Madrid'],nat:'Brasil',pos:'mid'},
  {n:'Marcelo',eq:['Real Madrid'],nat:'Brasil',pos:'def'},
  {n:'Vinícius Júnior',eq:['Real Madrid'],nat:'Brasil',pos:'fwd'},
  {n:'Rodrygo',eq:['Real Madrid'],nat:'Brasil',pos:'fwd'},
  {n:'Éder Militão',eq:['Real Madrid'],nat:'Brasil',pos:'def'},
  {n:'Ángel Di María',eq:['Real Madrid','PSG','Juventus'],nat:'Argentina',pos:'fwd'},
  {n:'Gonzalo Higuaín',eq:['Real Madrid','Juventus'],nat:'Argentina',pos:'fwd'},
  {n:'Alfredo Di Stéfano',eq:['Real Madrid','Barcelona'],nat:'Argentina',pos:'fwd'},
  {n:'Federico Valverde',eq:['Real Madrid','Peñarol'],nat:'Uruguay',pos:'mid'},
  {n:'José María Giménez',eq:[],nat:'Uruguay',pos:'def'},
  {n:'Sergio Ramos',eq:['Real Madrid','PSG'],nat:'España',pos:'def'},
  {n:'Iker Casillas',eq:['Real Madrid'],nat:'España',pos:'gk'},
  {n:'Raúl González',eq:['Real Madrid'],nat:'España',pos:'fwd'},
  {n:'Isco',eq:['Real Madrid'],nat:'España',pos:'mid'},
  {n:'Zinedine Zidane',eq:['Real Madrid','Juventus'],nat:'Francia',pos:'mid'},
  {n:'Karim Benzema',eq:['Real Madrid'],nat:'Francia',pos:'fwd'},
  {n:'Raphaël Varane',eq:['Real Madrid'],nat:'Francia',pos:'def'},
  {n:'Ferland Mendy',eq:['Real Madrid'],nat:'Francia',pos:'def'},
  {n:'Toni Kroos',eq:['Real Madrid','Bayern Múnich'],nat:'Alemania',pos:'mid'},
  {n:'Mesut Özil',eq:['Real Madrid'],nat:'Alemania',pos:'mid'},
  {n:'David Beckham',eq:['Real Madrid','PSG'],nat:'Inglaterra',pos:'mid'},
  {n:'Michael Owen',eq:['Real Madrid','Liverpool'],nat:'Inglaterra',pos:'fwd'},
  {n:'Jude Bellingham',eq:['Real Madrid'],nat:'Inglaterra',pos:'mid'},
  {n:'Cristiano Ronaldo',eq:['Real Madrid','Juventus'],nat:'Portugal',pos:'fwd'},
  {n:'Luís Figo',eq:['Real Madrid','Barcelona'],nat:'Portugal',pos:'fwd'},
  {n:'Pepe',eq:['Real Madrid'],nat:'Portugal',pos:'def'},
  {n:'Fábio Coentrão',eq:['Real Madrid'],nat:'Portugal',pos:'def'},
  {n:'Arjen Robben',eq:['Real Madrid','Bayern Múnich'],nat:'Países Bajos',pos:'fwd'},
  {n:'Wesley Sneijder',eq:['Real Madrid'],nat:'Países Bajos',pos:'mid'},
  {n:'Luka Modrić',eq:['Real Madrid'],nat:'Croacia',pos:'mid'},
  // ── Manchester City ──
  {n:'Sergio Agüero',eq:['Manchester City','Barcelona'],nat:'Argentina',pos:'fwd'},
  {n:'Carlos Tévez',eq:['Manchester City','Juventus','Boca Juniors'],nat:'Argentina',pos:'fwd'},
  {n:'Julián Álvarez',eq:['Manchester City'],nat:'Argentina',pos:'fwd'},
  {n:'Nicolás Otamendi',eq:['Manchester City'],nat:'Argentina',pos:'def'},
  {n:'Gabriel Jesus',eq:['Manchester City'],nat:'Brasil',pos:'fwd'},
  {n:'Ederson',eq:['Manchester City'],nat:'Brasil',pos:'gk'},
  {n:'Fernandinho',eq:['Manchester City'],nat:'Brasil',pos:'mid'},
  {n:'David Silva',eq:['Manchester City'],nat:'España',pos:'mid'},
  {n:'Rodri',eq:['Manchester City'],nat:'España',pos:'mid'},
  {n:'Aymeric Laporte',eq:['Manchester City'],nat:'España',pos:'def'},
  {n:'Raheem Sterling',eq:['Manchester City','Liverpool'],nat:'Inglaterra',pos:'fwd'},
  {n:'Phil Foden',eq:['Manchester City'],nat:'Inglaterra',pos:'mid'},
  {n:'Kyle Walker',eq:['Manchester City'],nat:'Inglaterra',pos:'def'},
  {n:'John Stones',eq:['Manchester City'],nat:'Inglaterra',pos:'def'},
  {n:'Joe Hart',eq:['Manchester City'],nat:'Inglaterra',pos:'gk'},
  {n:'İlkay Gündoğan',eq:['Manchester City','Barcelona'],nat:'Alemania',pos:'mid'},
  {n:'Leroy Sané',eq:['Manchester City','Bayern Múnich'],nat:'Alemania',pos:'fwd'},
  {n:'Bernardo Silva',eq:['Manchester City'],nat:'Portugal',pos:'mid'},
  {n:'Rúben Dias',eq:['Manchester City'],nat:'Portugal',pos:'def'},
  {n:'Nathan Aké',eq:['Manchester City'],nat:'Países Bajos',pos:'def'},
  // ── Liverpool ──
  {n:'Steven Gerrard',eq:['Liverpool'],nat:'Inglaterra',pos:'mid'},
  {n:'Trent Alexander-Arnold',eq:['Liverpool'],nat:'Inglaterra',pos:'def'},
  {n:'Jordan Henderson',eq:['Liverpool'],nat:'Inglaterra',pos:'mid'},
  {n:'Jamie Carragher',eq:['Liverpool'],nat:'Inglaterra',pos:'def'},
  {n:'Virgil van Dijk',eq:['Liverpool'],nat:'Países Bajos',pos:'def'},
  {n:'Georginio Wijnaldum',eq:['Liverpool','PSG'],nat:'Países Bajos',pos:'mid'},
  {n:'Cody Gakpo',eq:['Liverpool'],nat:'Países Bajos',pos:'fwd'},
  {n:'Fernando Torres',eq:['Liverpool'],nat:'España',pos:'fwd'},
  {n:'Xabi Alonso',eq:['Liverpool','Real Madrid','Bayern Múnich'],nat:'España',pos:'mid'},
  {n:'Pepe Reina',eq:['Liverpool','Milan'],nat:'España',pos:'gk'},
  {n:'Roberto Firmino',eq:['Liverpool'],nat:'Brasil',pos:'fwd'},
  {n:'Alisson Becker',eq:['Liverpool'],nat:'Brasil',pos:'gk'},
  {n:'Fabinho',eq:['Liverpool'],nat:'Brasil',pos:'mid'},
  {n:'Lucas Leiva',eq:['Liverpool'],nat:'Brasil',pos:'mid'},
  {n:'Darwin Núñez',eq:['Liverpool','Peñarol'],nat:'Uruguay',pos:'fwd'},
  {n:'Sebastián Coates',eq:['Liverpool'],nat:'Uruguay',pos:'def'},
  {n:'Ibrahima Konaté',eq:['Liverpool'],nat:'Francia',pos:'def'},
  // ── Bayern Múnich ──
  {n:'Manuel Neuer',eq:['Bayern Múnich'],nat:'Alemania',pos:'gk'},
  {n:'Thomas Müller',eq:['Bayern Múnich'],nat:'Alemania',pos:'fwd'},
  {n:'Bastian Schweinsteiger',eq:['Bayern Múnich'],nat:'Alemania',pos:'mid'},
  {n:'Philipp Lahm',eq:['Bayern Múnich'],nat:'Alemania',pos:'def'},
  {n:'Jérôme Boateng',eq:['Bayern Múnich'],nat:'Alemania',pos:'def'},
  {n:'Joshua Kimmich',eq:['Bayern Múnich'],nat:'Alemania',pos:'mid'},
  {n:'Oliver Kahn',eq:['Bayern Múnich'],nat:'Alemania',pos:'gk'},
  {n:'Franz Beckenbauer',eq:['Bayern Múnich'],nat:'Alemania',pos:'def'},
  {n:'Gerd Müller',eq:['Bayern Múnich'],nat:'Alemania',pos:'fwd'},
  {n:'Serge Gnabry',eq:['Bayern Múnich'],nat:'Alemania',pos:'fwd'},
  {n:'Kingsley Coman',eq:['Bayern Múnich','Juventus','PSG'],nat:'Francia',pos:'fwd'},
  {n:'Franck Ribéry',eq:['Bayern Múnich'],nat:'Francia',pos:'fwd'},
  {n:'Benjamin Pavard',eq:['Bayern Múnich'],nat:'Francia',pos:'def'},
  {n:'Lucas Hernández',eq:['Bayern Múnich','PSG'],nat:'Francia',pos:'def'},
  {n:'Corentin Tolisso',eq:['Bayern Múnich'],nat:'Francia',pos:'mid'},
  {n:'Dayot Upamecano',eq:['Bayern Múnich'],nat:'Francia',pos:'def'},
  {n:'Matthijs de Ligt',eq:['Bayern Múnich','Juventus'],nat:'Países Bajos',pos:'def'},
  {n:'Harry Kane',eq:['Bayern Múnich'],nat:'Inglaterra',pos:'fwd'},
  {n:'James Rodríguez',eq:['Bayern Múnich','Real Madrid'],nat:'Colombia',pos:'mid'},
  // ── PSG ──
  {n:'Kylian Mbappé',eq:['PSG','Real Madrid'],nat:'Francia',pos:'fwd'},
  {n:'Presnel Kimpembe',eq:['PSG'],nat:'Francia',pos:'def'},
  {n:'Adrien Rabiot',eq:['PSG','Juventus'],nat:'Francia',pos:'mid'},
  {n:'Blaise Matuidi',eq:['PSG','Juventus'],nat:'Francia',pos:'mid'},
  {n:'Thiago Silva',eq:['PSG','Milan'],nat:'Brasil',pos:'def'},
  {n:'Marquinhos',eq:['PSG'],nat:'Brasil',pos:'def'},
  {n:'Lucas Moura',eq:['PSG'],nat:'Brasil',pos:'fwd'},
  {n:'Raí',eq:['PSG'],nat:'Brasil',pos:'mid'},
  {n:'Ronaldinho Gaúcho',eq:['PSG','Barcelona','Milan'],nat:'Brasil',pos:'fwd'},
  {n:'Leandro Paredes',eq:['PSG','Juventus'],nat:'Argentina',pos:'mid'},
  {n:'Mauro Icardi',eq:['PSG'],nat:'Argentina',pos:'fwd'},
  {n:'Javier Pastore',eq:['PSG'],nat:'Argentina',pos:'mid'},
  {n:'Edinson Cavani',eq:['PSG'],nat:'Uruguay',pos:'fwd'},
  {n:'Keylor Navas',eq:['PSG','Real Madrid'],nat:'Costa Rica',pos:'gk'},
  {n:'Gianluigi Donnarumma',eq:['PSG','Milan'],nat:'Italia',pos:'gk'},
  {n:'Marco Verratti',eq:['PSG'],nat:'Italia',pos:'mid'},
  {n:'Achraf Hakimi',eq:['PSG','Real Madrid'],nat:'Marruecos',pos:'def'},
  // ── Juventus ──
  {n:'Gianluigi Buffon',eq:['Juventus','PSG'],nat:'Italia',pos:'gk'},
  {n:'Alessandro Del Piero',eq:['Juventus'],nat:'Italia',pos:'fwd'},
  {n:'Andrea Pirlo',eq:['Juventus','Milan'],nat:'Italia',pos:'mid'},
  {n:'Giorgio Chiellini',eq:['Juventus'],nat:'Italia',pos:'def'},
  {n:'Leonardo Bonucci',eq:['Juventus','Milan'],nat:'Italia',pos:'def'},
  {n:'Claudio Marchisio',eq:['Juventus'],nat:'Italia',pos:'mid'},
  {n:'Federico Chiesa',eq:['Juventus','Liverpool'],nat:'Italia',pos:'fwd'},
  {n:'Roberto Baggio',eq:['Juventus','Milan'],nat:'Italia',pos:'fwd'},
  {n:'Paulo Dybala',eq:['Juventus'],nat:'Argentina',pos:'fwd'},
  {n:'Rodrigo Bentancur',eq:['Juventus','Boca Juniors'],nat:'Uruguay',pos:'mid'},
  {n:'Michel Platini',eq:['Juventus'],nat:'Francia',pos:'mid'},
  {n:'Paul Pogba',eq:['Juventus'],nat:'Francia',pos:'mid'},
  {n:'David Trezeguet',eq:['Juventus'],nat:'Francia',pos:'fwd'},
  {n:'Zinédine Zidane',eq:['Juventus','Real Madrid'],nat:'Francia',pos:'mid'},
  {n:'Wojciech Szczęsny',eq:['Juventus','Barcelona'],nat:'Polonia',pos:'gk'},
  // ── Milan ──
  {n:'Paolo Maldini',eq:['Milan'],nat:'Italia',pos:'def'},
  {n:'Franco Baresi',eq:['Milan'],nat:'Italia',pos:'def'},
  {n:'Alessandro Nesta',eq:['Milan'],nat:'Italia',pos:'def'},
  {n:'Gennaro Gattuso',eq:['Milan'],nat:'Italia',pos:'mid'},
  {n:'Filippo Inzaghi',eq:['Milan','Juventus'],nat:'Italia',pos:'fwd'},
  {n:'Sandro Tonali',eq:['Milan'],nat:'Italia',pos:'mid'},
  {n:'Cafú',eq:['Milan'],nat:'Brasil',pos:'def'},
  {n:'Alexandre Pato',eq:['Milan'],nat:'Brasil',pos:'fwd'},
  {n:'Serginho',eq:['Milan'],nat:'Brasil',pos:'def'},
  {n:'Theo Hernández',eq:['Milan','Real Madrid'],nat:'Francia',pos:'def'},
  {n:'Olivier Giroud',eq:['Milan'],nat:'Francia',pos:'fwd'},
  {n:'Mike Maignan',eq:['Milan'],nat:'Francia',pos:'gk'},
  {n:'Marcel Desailly',eq:['Milan'],nat:'Francia',pos:'def'},
  {n:'Clarence Seedorf',eq:['Milan','Real Madrid'],nat:'Países Bajos',pos:'mid'},
  {n:'Ruud Gullit',eq:['Milan'],nat:'Países Bajos',pos:'mid'},
  {n:'Marco van Basten',eq:['Milan'],nat:'Países Bajos',pos:'fwd'},
  {n:'Frank Rijkaard',eq:['Milan'],nat:'Países Bajos',pos:'mid'},
  {n:'Fikayo Tomori',eq:['Milan'],nat:'Inglaterra',pos:'def'},
  {n:'Ruud van Nistelrooy',eq:['Real Madrid'],nat:'Países Bajos',pos:'fwd'},
  // ── Boca Juniors ──
  {n:'Martín Palermo',eq:['Boca Juniors'],nat:'Argentina',pos:'fwd'},
  {n:'Fernando Gago',eq:['Boca Juniors','Real Madrid'],nat:'Argentina',pos:'mid'},
  {n:'Óscar Córdoba',eq:['Boca Juniors'],nat:'Colombia',pos:'gk'},
  {n:'Sebastián Battaglia',eq:['Boca Juniors'],nat:'Argentina',pos:'mid'},
  {n:'Rodrigo Palacio',eq:['Boca Juniors'],nat:'Argentina',pos:'fwd'},
  {n:'Hugo Ibarra',eq:['Boca Juniors'],nat:'Argentina',pos:'def'},
  {n:'Edinson Cavani ',eq:['Boca Juniors'],nat:'Uruguay',pos:'fwd'},
  {n:'Nahitan Nández',eq:['Boca Juniors','Peñarol'],nat:'Uruguay',pos:'mid'},
  {n:'Miguel Merentiel',eq:['Boca Juniors'],nat:'Uruguay',pos:'fwd'},
  {n:'Marcelo Weigandt',eq:['Boca Juniors'],nat:'Argentina',pos:'def'},
  // ── Peñarol ──
  {n:'Diego Forlán',eq:['Peñarol'],nat:'Uruguay',pos:'fwd'},
  {n:'Antonio Pacheco',eq:['Peñarol'],nat:'Uruguay',pos:'fwd'},
  {n:'Marcelo Zalayeta',eq:['Peñarol','Juventus'],nat:'Uruguay',pos:'fwd'},
  {n:'Fernando Muslera',eq:[],nat:'Uruguay',pos:'gk'},
  {n:'Diego Godín',eq:[],nat:'Uruguay',pos:'def'},
  {n:'Cristian Rodríguez',eq:['Peñarol','PSG'],nat:'Uruguay',pos:'mid'},
  {n:'Walter Gargano',eq:['Peñarol'],nat:'Uruguay',pos:'mid'},
  {n:'Giorgian de Arrascaeta',eq:[],nat:'Uruguay',pos:'mid'},
  {n:'Maxi Gómez',eq:[],nat:'Uruguay',pos:'fwd'},
  {n:'Agustín Canobbio',eq:['Peñarol'],nat:'Uruguay',pos:'fwd'}
];
function _legendMatches(eq, sel, posLabel){
  const g = SLOT_GROUP[posLabel] || 'mid';
  return LEGENDS
    .filter(L => (L.eq||[]).indexOf(eq) !== -1 && L.nat === sel && L.pos === g && !_onceAlreadyPlaced(L.n))
    .map(L => ({ strPlayer: L.n, strNationality: NAT_EN[L.nat]||L.nat, strPosition: '', strCutout: '', _legend: true }));
}
// fetch con timeout: en un A12/conexión lenta un fetch colgado congelaba el juego
// (el spin hace varias llamadas en serie). Con AbortController cortamos a los 4s y
// caemos al catálogo de leyendas / texto libre en vez de trabar el turno.
function _tsdbFetch(url, ms){
  ms = ms || 4000;
  var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  var t = setTimeout(function(){ try { ctrl && ctrl.abort(); } catch(e){} }, ms);
  return fetch(url, ctrl ? { signal: ctrl.signal } : undefined)
    .then(function(r){ return r.json(); })
    .finally(function(){ clearTimeout(t); });
}
async function _tsdbPlayers(query, byName){
  const key = (byName?'p:':'t:')+query;
  if (_tsdbCache[key] !== undefined) return _tsdbCache[key];
  try {
    let list = [];
    if (byName) {
      const j = await _tsdbFetch(TSDB + '/searchplayers.php?p=' + encodeURIComponent(query));
      list = ((j && j.player)||[]).filter(pl => (pl.strSport||'Soccer')==='Soccer');
    } else {
      // Plantel por equipo (la búsqueda ?t= está paga): searchteams → lookup_all_players
      const jt = await _tsdbFetch(TSDB + '/searchteams.php?t=' + encodeURIComponent(query));
      const team = ((jt && jt.teams)||[]).filter(t => (t.strSport||'')==='Soccer')[0];
      if (team && team.idTeam) {
        const jp = await _tsdbFetch(TSDB + '/lookup_all_players.php?id=' + team.idTeam);
        list = ((jp && jp.player)||[]).filter(pl => (pl.strSport||'Soccer')==='Soccer');
      }
    }
    _tsdbCache[key] = list; // cachear también [] para no reintentar equipos sin datos
    return list;
  } catch(e){ return null; } // null = API caída/timeout (fallback a texto libre)
}
function _oncePlayerChip(pl){
  const nm = (pl.strPlayer||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');
  const img = (pl.strCutout || pl.strThumb || '').replace(/'/g,'');
  return `<div onclick="window._oncePickReal('${nm}','${img}')" style="flex:0 0 88px;background:#111;border:1px solid #242a1c;border-radius:12px;padding:8px 4px;text-align:center;cursor:pointer;">
    <div style="width:46px;height:46px;border-radius:50%;margin:0 auto 5px;${img?`background:url('${img}') center top/cover;`:'background:#1a1a1a;display:flex;align-items:center;justify-content:center;color:#555;font-weight:900;'}">${img?'':(pl.strPlayer||'?')[0]}</div>
    <div style="font-size:10px;font-weight:800;color:#fff;line-height:1.1;overflow:hidden;max-height:24px;">${pl.strPlayer||''}</div>
    <div style="font-size:8.5px;color:#777;">${(pl.strNationality||'')}${pl.strPosition?(' · '+pl.strPosition):''}</div>
  </div>`;
}
async function _onceLoadSuggestions(){
  const box = document.getElementById('once-suggest'); if (!box || !G.roll) return;
  // La ruleta ya validó la combinación: usa los matches exactos (club + selección + posición)
  if (G.roll.matches === null || G.roll.matches === undefined) {
    if (G.roll.matches === null) { G.freeText = true; box.innerHTML = '<div style="text-align:center;padding:8px;color:#666;font-size:10.5px;">Sin conexión al listado — escribí el nombre y OK.</div>'; return; }
  }
  const show = (G.roll.matches||[]).slice(0, 24);
  if (!show.length) { box.innerHTML = '<div style="text-align:center;padding:8px;color:#666;font-size:10.5px;">Buscá por NOMBRE un jugador de ' + G.roll.sel + ' que haya jugado en ' + G.roll.eq + ' (vale cualquier época) 👇</div>'; return; }
  box.innerHTML = '<div style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding-bottom:3px;">' + show.map(_oncePlayerChip).join('') + '</div>';
}
window._onceSearchReal = async function(){
  const q = (document.getElementById('once-pname')?.value||'').trim();
  const box = document.getElementById('once-suggest');
  if (!q || q.length < 3 || !box) return;
  box.innerHTML = '<div style="text-align:center;padding:12px;color:#555;font-size:11px;"><i class="bx bx-loader-alt bx-spin"></i> Buscando...</div>';
  const list = await _tsdbPlayers(q, true);
  if (list === null) { G.freeText = true; box.innerHTML = '<div style="text-align:center;padding:8px;color:#666;font-size:10.5px;">Sin conexión — escribí el nombre y OK.</div>'; return; }
  if (!list.length) { box.innerHTML = '<div style="text-align:center;padding:8px;color:#f66;font-size:10.5px;">No existe ningún jugador real con ese nombre. Probá de nuevo.</div>'; return; }
  // Vale cualquier ÉPOCA, pero debe respetar la SELECCIÓN y la POSICIÓN sorteadas
  // y NO estar ya elegido en la cancha.
  const natEn = NAT_EN[G.roll && G.roll.sel] || (G.roll && G.roll.sel) || '';
  const valid = list.filter(pl => (!natEn || (pl.strNationality||'') === natEn) && _posMatches(pl.strPosition, G.roll && G.roll.posLabel) && !_onceAlreadyPlaced(pl.strPlayer));
  if (!valid.length) {
    box.innerHTML = '<div style="text-align:center;padding:8px;color:#f66;font-size:10.5px;">Ese jugador existe pero NO cumple: tiene que ser de ' + (G.roll?G.roll.sel:'') + ' y jugar de ' + (G.roll?G.roll.posLabel:'') + '.</div>';
    return;
  }
  box.innerHTML = '<div style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding-bottom:3px;">' + valid.slice(0,12).map(_oncePlayerChip).join('') + '</div>';
};
window._oncePickReal = function(name, photo){
  if(!G.roll){toast('Girá la ruleta primero','info');return;}
  if(_onceAlreadyPlaced(name)){toast('Ese jugador ya está en tu once','warning');return;}
  let slot = (typeof G.roll.posIdx==='number' && !G.placed[G.roll.posIdx]) ? G.roll.posIdx : G.placed.findIndex(x=>!x);
  if(slot<0){toast('Ya está completo','info');return;}
  G.placed[slot]={name, photo: photo||null, eq:G.roll.eq, sel:G.roll.sel, pos:POS_LABEL[slot]}; G.roll=null; G.freeText=false;
  _onceRender();
  _iaRespond();
  // Leyendas sin foto: buscarla por nombre en segundo plano y pintarla si aparece
  if (!photo) {
    (async () => {
      try {
        const list = await _tsdbPlayers(name, true);
        const hit = (list||[]).filter(pl => pl.strCutout || pl.strThumb)[0];
        if (hit && G.placed[slot] && G.placed[slot].name === name) {
          G.placed[slot].photo = hit.strCutout || hit.strThumb;
          _onceRender();
        }
      } catch(e){}
    })();
  }
};
function _oncePrompt(){
  const p=document.getElementById('once-prompt'); if(!p||!G.roll)return;
  G.freeText = false;
  p.innerHTML=`<div style="background:#0d120d;border:1px solid #1f2a14;border-radius:12px;padding:10px 12px;margin-bottom:4px;">
    <div style="font-size:12px;color:#aaa;margin-bottom:8px;">Jugador que haya jugado en <b style="color:var(--accent);">${G.roll.eq}</b> <u>y</u> sea de <b style="color:#64b4ff;">${G.roll.sel}</b> — va de <b style="color:#FFD700;">${G.roll.posLabel}</b>. Elegí de la lista:</div>
    <div id="once-suggest" style="margin-bottom:8px;"></div>
    <div style="display:flex;gap:8px;align-items:center;">
      <input id="once-pname" placeholder="Buscar jugador real..." style="flex:1;min-width:0;background:#1a1a1a;border:1px solid #333;border-radius:10px;color:#fff;padding:8px 10px;font-size:13px;outline:none;" onkeydown="if(event.key==='Enter')window._oncePlace()">
      <button onclick="window._oncePlace()" style="background:var(--accent);color:#000;border:none;border-radius:10px;padding:8px 12px;font-weight:900;cursor:pointer;flex-shrink:0;">OK</button>
    </div>
  </div>`;
  _onceLoadSuggestions();
  setTimeout(()=>document.getElementById('once-pname')?.focus(),50);
}
window._oncePlace = function(){
  const name=document.getElementById('once-pname')?.value?.trim(); if(!name){toast('Escribí o elegí un jugador','error');return;}
  if(!G.roll){toast('Girá la ruleta primero','info');return;}
  // Sin conexión al listado → aceptar texto (mejor que trabar el juego).
  // Con conexión: el OK BUSCA jugadores reales con ese nombre (no acepta inventados).
  if (!G.freeText) { window._onceSearchReal(); return; }
  let slot = (typeof G.roll.posIdx==='number' && !G.placed[G.roll.posIdx]) ? G.roll.posIdx : G.placed.findIndex(x=>!x);
  if(slot<0){toast('Ya está completo','info');return;}
  G.placed[slot]={name, eq:G.roll.eq, sel:G.roll.sel, pos:POS_LABEL[slot]}; G.roll=null;
  _onceRender();
  _iaRespond();
};
window._onceSlotTap = function(i){ if(G.placed[i]){ if(confirm('¿Quitar a '+G.placed[i].name+'?')){ G.placed[i]=null; _onceRender(); } } };

function _rate(team){
  let s=0; team.forEach(p=>{ const k=(p.name||'').toLowerCase().trim(); s += (STARS[k]||4); }); // base 4 por jugador
  return Math.min(99, Math.round(s/ (11*10) * 99));
}
window._onceFinish = function(){
  if(G.placed.filter(Boolean).length<11)return;
  if (G.challenge){ _onceDuelResolve(); return; }
  if (window.__onceDuel){ window.__onceDuel=0; window._onceChallenge(); return; }
  // vs IA: asegurar que la IA también completó su 11 antes de juzgar
  if (G.vsIA){
    if (G.ia.filter(Boolean).length < 11){
      let _g=0; const iv=setInterval(function(){ _g++; if(G.ia.filter(Boolean).length>=11||_g>30){ clearInterval(iv); _onceVsIaResolve(); } else if(G.ia.findIndex(x=>!x)>=0){ _iaPlaceNext(); } }, 250);
      return;
    }
    _onceVsIaResolve();
    return;
  }
  const myRate=_rate(G.placed);
  const cpuRate = 70 + Math.floor(Math.random()*25);
  _onceCountdown(()=>_onceResult(myRate,cpuRate));
};
// vs IA: el juez compara MI 11 con el de la IA y da veredicto con puntos + argumento
async function _onceVsIaResolve(){
  const me = window.userData || {};
  _onceCountdown(async ()=>{
    const m=document.getElementById('once-modal');
    if (m) m.innerHTML = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;"><i class='bx bx-loader-alt bx-spin' style="font-size:40px;color:var(--accent);"></i><div style="margin-top:14px;color:#888;font-size:13px;">El juez está deliberando...</div></div>`;
    const j = await _onceJudge(G.placed, G.ia, me.name||'Vos', 'La IA');
    try { if (window.CGCore) CGCore.saveScore('once-ideal', j.scoreA); } catch(e){}
    _onceVsIaScreen(j);
  });
}
function _onceVsIaScreen(j){
  const me = window.userData || {};
  const iWon = j.winner==='A', tie = j.winner==='tie';
  const m=document.getElementById('once-modal'); if(!m) return;
  const shareTxt = `📋 11 Ideal vs IA en Canchero: Yo ${j.scoreA} - ${j.scoreB} IA. ${tie?'¡Empate!':(iWon?'¡Le gané a la IA! 🏆':'Ganó la IA')} ⚖ ${j.argument}`;
  const shareBlock = { gameId:'once-ideal', gameName:'11 Ideal', emoji:'📋',
    headline: `${tie?'Empaté':iWon?'Le gané':'Perdí'} vs la IA: ${j.scoreA} - ${j.scoreB}`,
    detail: 'Armé mi 11 ideal de toda la historia. ¿Podés superarlo?', text: shareTxt };
  const xiRow = (board, color) => '<div style="display:flex;flex-wrap:wrap;gap:3px;justify-content:center;max-width:300px;">' + board.filter(Boolean).map(p=>`<span style="font-size:9px;color:#ccc;background:rgba(255,255,255,0.05);border:1px solid ${color};border-radius:8px;padding:2px 6px;">${(p.name||'').split(' ').slice(-1)[0]}</span>`).join('') + '</div>';
  m.innerHTML=`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:24px 18px calc(24px + env(safe-area-inset-bottom));text-align:center;overflow-y:auto;">
    <div style="font-size:56px;">${tie?'🤝':iWon?'🏆':'🤖'}</div>
    <div style="font-size:21px;font-weight:900;color:${tie?'#ccc':iWon?'var(--accent)':'#64b4ff'};margin:6px 0 16px;">${tie?'¡EMPATE!':iWon?'¡LE GANASTE A LA IA!':'GANÓ LA IA'}</div>
    <div style="display:flex;gap:22px;align-items:center;margin-bottom:16px;">
      <div><div style="font-size:11px;color:#888;">TU 11</div><div style="font-size:36px;font-weight:900;color:var(--accent);">${j.scoreA}</div></div>
      <div style="color:#444;font-weight:900;">VS</div>
      <div><div style="font-size:11px;color:#888;">IA</div><div style="font-size:36px;font-weight:900;color:#64b4ff;">${j.scoreB}</div></div>
    </div>
    <div style="background:#111;border:1px solid #2a2a2a;border-radius:14px;padding:13px 16px;max-width:360px;margin-bottom:16px;">
      <div style="font-size:9px;color:var(--accent);font-weight:900;letter-spacing:2px;margin-bottom:5px;">⚖ VEREDICTO DEL JUEZ${j.ai?' IA':''}</div>
      <div style="font-size:12.5px;color:#ccc;line-height:1.55;">${(j.argument||'').replace(/</g,'&lt;')}</div>
    </div>
    ${(j.breakdown && j.breakdown.length) ? `<div style="width:100%;max-width:360px;margin-bottom:8px;">
      <div style="font-size:9px;color:#888;font-weight:900;letter-spacing:1px;margin-bottom:6px;">1 VS 1 POR PUESTO</div>
      ${j.breakdown.map(d=>`<div style="display:flex;align-items:center;gap:6px;font-size:10px;padding:3px 0;border-bottom:1px solid #161616;">
        <span style="width:34px;flex-shrink:0;color:#FFD700;font-weight:900;">${d.pos}</span>
        <span style="flex:1;text-align:right;color:${d.win==='a'?'var(--accent)':'#888'};font-weight:${d.win==='a'?'900':'400'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${(d.a||'—').split(' ').slice(-1)[0]} ${d.win==='a'?'✓':''}</span>
        <span style="color:#444;flex-shrink:0;">${d.sa}-${d.sb}</span>
        <span style="flex:1;color:${d.win==='b'?'#64b4ff':'#888'};font-weight:${d.win==='b'?'900':'400'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${d.win==='b'?'✓':''} ${(d.b||'—').split(' ').slice(-1)[0]}</span>
      </div>`).join('')}
    </div>` : ''}
    <div style="margin-bottom:6px;font-size:9px;color:var(--accent);font-weight:900;letter-spacing:1px;">TU 11</div>${xiRow(G.placed,'rgba(186,255,0,0.3)')}
    <div style="margin:12px 0 6px;font-size:9px;color:#64b4ff;font-weight:900;letter-spacing:1px;">11 DE LA IA</div>${xiRow(G.ia,'rgba(100,180,255,0.3)')}
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:20px;">
      <button onclick='window.CGCore&&CGCore.shareResult(${JSON.stringify(shareBlock).replace(/'/g,"&#39;")})' style="background:rgba(186,255,0,0.06);color:var(--accent);border:1px solid rgba(186,255,0,0.3);border-radius:14px;padding:12px 16px;font-weight:800;cursor:pointer;"><i class='bx bx-news'></i> Publicar</button>
      <button onclick="window._onceStart()" style="background:var(--accent);color:#000;border:none;border-radius:14px;padding:12px 18px;font-weight:900;cursor:pointer;">🔄 Revancha</button>
    </div>
    <button onclick="window._onceClose()" style="margin-top:14px;background:none;border:none;color:#888;font-size:13px;cursor:pointer;">← Volver a Juegos</button>
  </div>`;
}

function _onceCountdown(done){
  let m=document.getElementById('once-modal');
  m.innerHTML=`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;">
    <div style="font-size:14px;color:#888;letter-spacing:2px;">LA IA ESTÁ EVALUANDO</div>
    <div id="once-count" style="font-size:72px;font-weight:900;color:var(--accent);margin:14px 0;">3</div>
    <div style="font-size:13px;color:#666;">Analizando los onces...</div>
  </div>`;
  let n=3; const iv=setInterval(()=>{ n--; const el=document.getElementById('once-count'); if(n>0){ if(el)el.textContent=n; } else { clearInterval(iv); done(); } },900);
}

function _starOf(name){ return STARS[(name||'').toLowerCase().trim()] || 5; }
/* Juez (serverless con IA; si falla, heurística local con 1v1 POR PUESTO) */
async function _onceJudge(teamA, teamB, nameA, nameB){
  try {
    const r = await fetch('/api/game-judge', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ teamA, teamB, nameA, nameB }) });
    if (r.ok){ const j = await r.json(); if (typeof j.scoreA==='number' && j.argument) return j; }
  } catch(e){}
  // Heurística: comparar puesto por puesto (mismo índice = misma posición)
  const bd = []; let a=0, b=0, winsA=0, winsB=0;
  for (let i=0;i<11;i++){
    const pa = teamA[i]||{}, pb = teamB[i]||{};
    const sa = _starOf(pa.name), sbb = _starOf(pb.name);
    a += sa; b += sbb;
    const win = sa>sbb?'a':sbb>sa?'b':'tie';
    if (win==='a') winsA++; else if (win==='b') winsB++;
    bd.push({ pos: POS_LABEL[i], a: pa.name||'—', b: pb.name||'—', sa, sb: sbb, win });
  }
  const scoreA = Math.min(99, Math.round(a/110*99));
  const scoreB = Math.min(99, Math.round(b/110*99));
  // Argumento: mencionar los duelos más decisivos
  const decisivos = bd.filter(x=>x.win!=='tie').sort((x,y)=>Math.abs(y.sa-y.sb)-Math.abs(x.sa-x.sb)).slice(0,3);
  const frases = decisivos.map(d=>{
    const gan = d.win==='a' ? (nameA||'A') : (nameB||'B');
    const gN = d.win==='a' ? d.a : d.b, pN = d.win==='a' ? d.b : d.a;
    return `${d.pos}: ${gN} le gana a ${pN}`;
  });
  const winner = scoreA>scoreB?'A':scoreB>scoreA?'B':'tie';
  let argument = winner==='tie'
    ? `Empate técnico: ${winsA} puestos para ${nameA||'A'} y ${winsB} para ${nameB||'B'}. Onces muy parejos en jerarquía.`
    : `${(winner==='A'?nameA:nameB)||'El ganador'} se impone ${winner==='A'?winsA:winsB}-${winner==='A'?winsB:winsA} en los duelos por puesto. Clave: ${frases.join('; ')}.`;
  return { scoreA, scoreB, winner, argument, breakdown: bd, ai:false };
}

/* Resolver duelo: yo soy el DESAFIADO; el board del desafiante viene en payload */
async function _onceDuelResolve(){
  const ch = G.challenge;
  const me = window.userData || {};
  const teamA = (ch.payload && ch.payload.board) || [];   // desafiante
  const teamB = G.placed;                                  // yo
  _onceCountdown(async ()=>{
    const m=document.getElementById('once-modal');
    if (m) m.innerHTML = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;"><i class='bx bx-loader-alt bx-spin' style="font-size:40px;color:var(--accent);"></i><div style="margin-top:14px;color:#888;font-size:13px;">El juez está deliberando...</div></div>`;
    const j = await _onceJudge(teamA, teamB, ch.from_name, me.name);
    const iWon = j.winner==='B', tie = j.winner==='tie';
    // Persistir resultado + notificar al desafiante
    try {
      const c = window._sb;
      if (c){
        await c.from('game_challenges').update({ status:'finished', from_score:j.scoreA, to_score:j.scoreB, winner_email: tie?null:(iWon?me.email:ch.from_email), verdict:j.argument }).eq('id', ch.id);
      }
      if (window.CGCore) CGCore.notify(ch.from_email, 'game_result', `🏁 Duelo 11 Ideal vs ${me.name||'rival'}: ${j.scoreA} - ${j.scoreB}. ${tie?'Empate':(iWon?(me.name||'Tu rival')+' ganó':'¡Ganaste vos!')} ⚖ ${j.argument}`);
    } catch(e){}
    _onceDuelScreen(j, ch, iWon, tie);
  });
}

function _onceDuelScreen(j, ch, iWon, tie){
  const me = window.userData || {};
  const m=document.getElementById('once-modal'); if(!m) return;
  const shareTxt = `📋 Duelo 11 Ideal en Canchero: ${ch.from_name} ${j.scoreA} - ${j.scoreB} ${me.name||'Yo'}. ${tie?'¡Empate!':(iWon?'¡Gané yo! 🏆':'Ganó '+ch.from_name)} · Veredicto del juez: ${j.argument}`;
  m.innerHTML=`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;overflow-y:auto;">
    <div style="font-size:60px;">${tie?'🤝':iWon?'🏆':'😬'}</div>
    <div style="font-size:21px;font-weight:900;color:${tie?'#ccc':iWon?'var(--accent)':'#ff6b6b'};margin:6px 0 16px;">${tie?'¡EMPATE!':iWon?'¡GANASTE EL DUELO!':'GANÓ '+(ch.from_name||'TU RIVAL').toUpperCase()}</div>
    <div style="display:flex;gap:22px;align-items:center;margin-bottom:16px;">
      <div><div style="font-size:11px;color:#888;max-width:90px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${(ch.from_name||'Rival').replace(/</g,'&lt;')}</div><div style="font-size:36px;font-weight:900;color:#64b4ff;">${j.scoreA}</div></div>
      <div style="color:#444;font-weight:900;">VS</div>
      <div><div style="font-size:11px;color:#888;">VOS</div><div style="font-size:36px;font-weight:900;color:var(--accent);">${j.scoreB}</div></div>
    </div>
    <div style="background:#111;border:1px solid #2a2a2a;border-radius:14px;padding:13px 16px;max-width:340px;margin-bottom:20px;">
      <div style="font-size:9px;color:var(--accent);font-weight:900;letter-spacing:2px;margin-bottom:5px;">⚖ VEREDICTO DEL JUEZ${j.ai?' IA':''}</div>
      <div style="font-size:12.5px;color:#ccc;line-height:1.55;">${(j.argument||'').replace(/</g,'&lt;')}</div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
      <button onclick='window.CGCore&&CGCore.shareResult(${JSON.stringify(shareTxt)})' style="background:rgba(186,255,0,0.06);color:var(--accent);border:1px solid rgba(186,255,0,0.3);border-radius:14px;padding:12px 16px;font-weight:800;cursor:pointer;"><i class='bx bx-news'></i> Publicar en mi perfil</button>
      <button onclick='(navigator.share?navigator.share({title:"11 Ideal",text:${JSON.stringify(shareTxt)}}).catch(()=>{}):navigator.clipboard.writeText(${JSON.stringify(shareTxt)}))' style="background:rgba(100,180,255,0.07);color:#64b4ff;border:1px solid rgba(100,180,255,0.35);border-radius:14px;padding:12px 16px;font-weight:800;cursor:pointer;"><i class='bx bx-send'></i> Enviar</button>
    </div>
    <button onclick="window._onceClose()" style="margin-top:16px;background:none;border:none;color:#888;font-size:13px;cursor:pointer;">← Volver a Juegos</button>
  </div>`;
}

/* Entrada cuando ACEPTÁS un desafío (banner del hub) */
window._onceChallengePlay = function(ch){
  document.getElementById('games-hub')?.remove();
  window._onceStart(ch);
  if (window.showToast) showToast('Armá tu 11: girá la ruleta y completá la cancha. Al terminar, el juez decide. ⚖','info');
};
/* Desafiar con el once recién armado: el rival arma el suyo y el juez decide */
window._onceChallenge = function(){
  if (!window.CGCore){ toast('No disponible.','error'); return; }
  const board = (G.placed||[]).filter(Boolean);
  if (board.length < 11){ toast('Armá tu 11 completo primero.','info'); return; }
  CGCore.sendChallenge('once-ideal', { board: board }, null);
};

function _onceResult(my,cpu){
  // guardar puntaje del modo solo en el ranking
  try { if (window.CGCore) CGCore.saveScore('once-ideal', my); } catch(e){}
  const win = my>=cpu;
  let m=document.getElementById('once-modal');
  m.innerHTML=`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;overflow-y:auto;">
    <div style="font-size:64px;">${win?'🏆':'😬'}</div>
    <div style="font-size:22px;font-weight:900;color:${win?'var(--accent)':'#ff6b6b'};margin:4px 0 18px;">${win?'¡GANASTE!':'Perdiste por poco'}</div>
    <div style="display:flex;gap:24px;align-items:center;margin-bottom:20px;">
      <div><div style="font-size:11px;color:#888;">TU 11</div><div style="font-size:38px;font-weight:900;color:var(--accent);">${my}</div></div>
      <div style="color:#444;font-weight:900;">VS</div>
      <div><div style="font-size:11px;color:#888;">IA</div><div style="font-size:38px;font-weight:900;color:#64b4ff;">${cpu}</div></div>
    </div>
    <div style="font-size:12px;color:#888;max-width:300px;margin-bottom:24px;">${win?'Tu once tiene más jerarquía. ¡Crack del fútbol!':'La IA armó un equipazo. Probá con más estrellas.'}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
      <button onclick="window._onceChallenge()" style="background:rgba(100,180,255,0.07);color:#64b4ff;border:1px solid rgba(100,180,255,0.35);border-radius:14px;padding:12px 16px;font-weight:800;cursor:pointer;">⚔ Desafiar</button>
      <button onclick="window.CGCore&&CGCore.openRanking('once-ideal')" style="background:rgba(255,215,0,0.07);color:#FFD700;border:1px solid rgba(255,215,0,0.35);border-radius:14px;padding:12px 16px;font-weight:800;cursor:pointer;"><i class='bx bx-trophy'></i> Ranking</button>
      <button onclick="window._onceShare(${my},${win})" style="background:rgba(186,255,0,0.06);color:var(--accent);border:1px solid rgba(186,255,0,0.3);border-radius:14px;padding:12px 16px;font-weight:800;cursor:pointer;"><i class='bx bx-share-alt'></i> Compartir</button>
      <button onclick="window._onceStart()" style="background:var(--accent);color:#000;border:none;border-radius:14px;padding:12px 18px;font-weight:900;cursor:pointer;">🔄 Revancha</button>
    </div>
    <button onclick="window._onceClose()" style="margin-top:14px;background:none;border:none;color:#888;font-size:13px;cursor:pointer;">← Volver a Juegos</button>
  </div>`;
}
window._onceShare = function(rate,win){
  const text=`📋 Armé mi 11 Ideal en Canchero con rating ${rate}/99 y ${win?'le gané a la IA 🏆':'casi le gano a la IA'}. ¿Podés superarlo? ⚽`;
  if(navigator.share) navigator.share({title:'11 Ideal',text}).catch(()=>{});
  else { try{navigator.clipboard.writeText(text);toast('Resultado copiado','success');}catch(e){toast(text,'info');} }
};

console.log('[canchero-once-ideal] ✅ 11 Ideal cargado');
})();
