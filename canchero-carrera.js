/**
 * canchero-carrera.js — Modo Carrera (simulador tipo Copero, con impronta Canchero)
 * Flujo: elegir DURACIÓN → definir IDENTIDAD (camiseta con apellido/número, color por país,
 * pierna hábil, nacionalidad con banderas, POSICIÓN en la cancha) → OFERTA DE CANTERA
 * (clubes de ligas del mundo + interior de Uruguay) → HUB de carrera (puntaje "NIVEL",
 * línea de tiempo por edad, PJ/GLS/AST, vitrina de títulos, valor de mercado) → temporadas
 * con simulación de rendimiento + decisiones (futbolísticas/económicas/sociales).
 * Guardado local (continuar partida). Se lanza con window._carreraStart() desde Juegos.
 */
(function(){
'use strict';
const A = '#baff00';
const LS = 'canchero_carrera_v2';
function esc(s){ return window.escH ? window.escH(s) : String(s==null?'':s); }
function me(){ return window.userData || {}; }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function rnd(a,b){ return a + Math.random()*(b-a); }
function ri(a,b){ return Math.floor(rnd(a,b+1)); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

// ── POSICIONES (como Copero) con coords en la cancha (x,y en %) ────────────────
const POSICIONES = [
  { id:'POR', lbl:'POR', x:50, y:90, linea:'ARQ' },
  { id:'LI',  lbl:'LI',  x:16, y:72, linea:'DEF' },
  { id:'DFC', lbl:'DFC', x:50, y:74, linea:'DEF' },
  { id:'LD',  lbl:'LD',  x:84, y:72, linea:'DEF' },
  { id:'MCD', lbl:'MCD', x:50, y:60, linea:'MED' },
  { id:'MI',  lbl:'MI',  x:20, y:48, linea:'MED' },
  { id:'MC',  lbl:'MC',  x:50, y:46, linea:'MED' },
  { id:'MD',  lbl:'MD',  x:80, y:48, linea:'MED' },
  { id:'MCO', lbl:'MCO', x:50, y:33, linea:'MED' },
  { id:'EI',  lbl:'EI',  x:20, y:20, linea:'DEL' },
  { id:'DC',  lbl:'DC',  x:50, y:16, linea:'DEL' },
  { id:'ED',  lbl:'ED',  x:80, y:20, linea:'DEL' }
];

// ── COLORES DE CAMISETA POR PAÍS (primario, secundario para número/texto) ──────
const KIT = {
  'Uruguay':['#4aa3df','#ffffff'], 'Argentina':['#75aadb','#ffffff'], 'Brasil':['#f7d117','#0a8f3c'],
  'Colombia':['#fcd116','#003893'], 'México':['#006341','#ffffff'], 'España':['#c60b1e','#ffcc00'],
  'Francia':['#0055a4','#ffffff'], 'Inglaterra':['#ffffff','#c8102e'], 'Italia':['#0072bb','#ffffff'],
  'Alemania':['#111111','#ffffff'], 'Portugal':['#c8102e','#006600'], 'Nigeria':['#009639','#ffffff'],
  'Chile':['#d52b1e','#ffffff'], 'Paraguay':['#d52b1e','#0038a8'], 'Perú':['#d91023','#ffffff'],
  'Croacia':['#c8102e','#ffffff'], 'Países Bajos':['#f36c21','#ffffff'], 'Bélgica':['#111111','#ffcc00']
};
function kitOf(pais){ return KIT[pais] || ['#1b7a3e','#ffffff']; }

// ── BANDERA (flagcdn) por nombre de país ───────────────────────────────────────
const FLAG = { 'Afganistán':'af','Albania':'al','Alemania':'de','Andorra':'ad','Angola':'ao','Anguila':'ai','Antigua y Barbuda':'ag','Arabia Saudita':'sa','Argelia':'dz','Argentina':'ar','Armenia':'am','Aruba':'aw','Australia':'au','Austria':'at','Bélgica':'be','Bolivia':'bo','Brasil':'br','Camerún':'cm','Canadá':'ca','Chile':'cl','China':'cn','Colombia':'co','Corea del Sur':'kr','Costa Rica':'cr','Croacia':'hr','Dinamarca':'dk','Ecuador':'ec','Egipto':'eg','El Salvador':'sv','Escocia':'gb-sct','Eslovaquia':'sk','Eslovenia':'si','España':'es','Estados Unidos':'us','Francia':'fr','Gales':'gb-wls','Ghana':'gh','Grecia':'gr','Guatemala':'gt','Honduras':'hn','Hungría':'hu','Inglaterra':'gb-eng','Irlanda':'ie','Islandia':'is','Israel':'il','Italia':'it','Japón':'jp','Marruecos':'ma','México':'mx','Nigeria':'ng','Noruega':'no','Países Bajos':'nl','Panamá':'pa','Paraguay':'py','Perú':'pe','Polonia':'pl','Portugal':'pt','Rumania':'ro','Rusia':'ru','Senegal':'sn','Serbia':'rs','Suecia':'se','Suiza':'ch','Turquía':'tr','Ucrania':'ua','Uruguay':'uy','Venezuela':'ve' };
const PAISES = Object.keys(FLAG).sort();
function flagImg(p, size){ const c=FLAG[p]; return c?`<img src="https://flagcdn.com/w40/${c}.png" alt="" style="width:${size||22}px;height:auto;border-radius:2px;flex-shrink:0;">`:''; }

// ── CLUBES POR LIGA (mundo + interior de Uruguay). str = fuerza/nivel del club ──
const LIGAS = [
  { liga:'Primera Uruguay', pais:'Uruguay', clubs:[['Nacional',78],['Peñarol',78],['Defensor Sporting',70],['Danubio',68],['Liverpool FC (UY)',67],['Montevideo City',66],['Boston River',64],['Cerro',62]] },
  { liga:'Interior Uruguay', pais:'Uruguay', clubs:[['Salto FC',52],['Paysandú FC',52],['Maldonado',54],['Tacuarembó',53],['Rivera Central',51],['Artigas United',50],['Durazno FC',50],['Colonia FC',52],['Melo Sport',51],['Rocha FC',52]] },
  { liga:'Primera Nacional (ARG)', pais:'Argentina', clubs:[['Dep. Maipú',58],['San Martín',59],['Chacarita',58],['Gimnasia (Mza)',57],['Estudiantes (BA)',57]] },
  { liga:'Liga Profesional (ARG)', pais:'Argentina', clubs:[['Boca Juniors',82],['River Plate',82],['Racing',78],['Independiente',76],['San Lorenzo',75],['Rosario Central',73],['Newell\'s',73],['Vélez',74],['Estudiantes',73],['Talleres',74]] },
  { liga:'Brasileirão', pais:'Brasil', clubs:[['Flamengo',84],['Palmeiras',84],['São Paulo',80],['Corinthians',79],['Grêmio',78],['Internacional',78],['Santos',77],['Fluminense',79]] },
  { liga:'LaLiga (ESP)', pais:'España', clubs:[['Real Madrid',90],['Barcelona',88],['Atlético',85],['Sevilla',80],['Valencia',77],['Real Sociedad',80],['Villarreal',79],['Betis',79]] },
  { liga:'Premier (ING)', pais:'Inglaterra', clubs:[['Man City',90],['Liverpool',88],['Arsenal',87],['Man United',84],['Chelsea',84],['Tottenham',83],['Newcastle',82]] },
  { liga:'Serie A (ITA)', pais:'Italia', clubs:[['Juventus',84],['Inter',86],['Milan',85],['Napoli',85],['Roma',82],['Lazio',81]] },
  { liga:'Ligue 1 (FRA)', pais:'Francia', clubs:[['PSG',88],['Marsella',80],['Mónaco',80],['Lyon',79],['Lille',78]] },
  { liga:'Bundesliga (ALE)', pais:'Alemania', clubs:[['Bayern',90],['Dortmund',85],['Leipzig',83],['Leverkusen',84],['Frankfurt',80]] },
  { liga:'Primeira (POR)', pais:'Portugal', clubs:[['Benfica',82],['Porto',82],['Sporting',82],['Braga',78]] },
  { liga:'Liga MX (MEX)', pais:'México', clubs:[['América',78],['Chivas',76],['Monterrey',79],['Tigres',80],['Cruz Azul',77]] },
  { liga:'MLS (USA)', pais:'Estados Unidos', clubs:[['Inter Miami',78],['LA Galaxy',76],['LAFC',78],['Atlanta United',75]] },
  { liga:'Saudi Pro League', pais:'Arabia Saudita', clubs:[['Al-Nassr',80],['Al-Hilal',82],['Al-Ittihad',80],['Al-Ahli',78]] }
];
const TIERS_ORDER = ['Interior Uruguay','Primera Nacional (ARG)','Primera Uruguay','Liga MX (MEX)','MLS (USA)','Primeira (POR)','Liga Profesional (ARG)','Saudi Pro League','Ligue 1 (FRA)','Serie A (ITA)','Bundesliga (ALE)','Premier (ING)','LaLiga (ESP)','Brasileirão'];
function ligaNivel(liga){ const i = TIERS_ORDER.indexOf(liga); return i<0?0:i; }
function todosClubs(){ const out=[]; LIGAS.forEach(L=>L.clubs.forEach(c=>out.push({name:c[0],str:c[1],liga:L.liga,pais:L.pais}))); return out; }
function clubBadge(name, size){
  // Escudo genérico con iniciales y color por hash del nombre.
  const ini = name.replace(/[^A-Za-zÁÉÍÓÚÑ ]/g,'').split(' ').map(w=>w[0]).join('').slice(0,3).toUpperCase();
  let h=0; for(let i=0;i<name.length;i++) h=(h*31+name.charCodeAt(i))>>>0;
  const hue=h%360; const s=size||44;
  return `<div style="width:${s}px;height:${s}px;border-radius:${Math.round(s*0.28)}px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:${Math.round(s*0.34)}px;color:#fff;background:linear-gradient(150deg,hsl(${hue} 55% 34%),hsl(${(hue+40)%360} 55% 22%));border:1px solid rgba(255,255,255,.14);">${ini}</div>`;
}

// ── CAMISETA SVG (con apellido y número, color por país) ───────────────────────
function jersey(size, apellido, numero, pais){
  const [c1,c2] = kitOf(pais);
  const s = size;
  return `<svg width="${s}" height="${s}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style="display:block;filter:drop-shadow(0 12px 24px rgba(0,0,0,.5));">
    <path d="M60 34 L40 46 L20 70 L38 92 L52 82 L52 168 Q52 176 60 176 L140 176 Q148 176 148 168 L148 82 L162 92 L180 70 L160 46 L140 34 Q120 52 100 52 Q80 52 60 34 Z" fill="${c1}" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
    <path d="M60 34 Q80 52 100 52 Q120 52 140 34 L128 30 Q100 44 72 30 Z" fill="${c2}" opacity="0.85"/>
    <text x="100" y="86" text-anchor="middle" font-family="Outfit,Arial" font-weight="800" font-size="17" fill="${c2}" style="letter-spacing:1px;">${esc((apellido||'APELLIDO').toUpperCase()).slice(0,12)}</text>
    <text x="100" y="150" text-anchor="middle" font-family="Outfit,Arial" font-weight="900" font-size="64" fill="${c2}">${esc(String(numero||10)).slice(0,2)}</text>
  </svg>`;
}

// ── CANCHA (para elegir posición) ──────────────────────────────────────────────
function pitch(selId, onClickName){
  const dots = POSICIONES.map(p=>{
    const on = p.id===selId;
    return `<button type="button" onclick="${onClickName}('${p.id}')" style="position:absolute;left:${p.x}%;top:${p.y}%;transform:translate(-50%,-50%);width:46px;height:26px;border-radius:13px;border:1.5px solid ${on?A:'rgba(255,255,255,.4)'};background:${on?A:'rgba(0,0,0,.55)'};color:${on?'#000':'#fff'};font-size:11px;font-weight:900;cursor:pointer;z-index:2;">${p.lbl}</button>`;
  }).join('');
  return `<div style="position:relative;width:100%;aspect-ratio:3/4;max-width:280px;margin:0 auto;background:linear-gradient(180deg,#14521f,#0d3d17);border:2px solid rgba(255,255,255,.25);border-radius:8px;overflow:hidden;">
    <div style="position:absolute;inset:8px;border:1.5px solid rgba(255,255,255,.22);border-radius:4px;"></div>
    <div style="position:absolute;top:50%;left:8px;right:8px;height:1.5px;background:rgba(255,255,255,.22);"></div>
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:70px;height:70px;border:1.5px solid rgba(255,255,255,.22);border-radius:50%;"></div>
    ${dots}
  </div>`;
}

let G = null;
function save(){ try{ localStorage.setItem(LS, JSON.stringify(G)); }catch(e){} }
function load(){ try{ return JSON.parse(localStorage.getItem(LS)||'null'); }catch(e){ return null; } }
function overlay(){
  let m=document.getElementById('carrera-modal'); if(m) m.remove();
  m=document.createElement('div'); m.id='carrera-modal';
  m.style.cssText='position:fixed;inset:0;z-index:100060;background:#0a0c0a;overflow-y:auto;-webkit-overflow-scrolling:touch;';
  document.body.appendChild(m); return m;
}

// ── INTRO ───────────────────────────────────────────────────────────────────────
window._carreraStart = function(){
  const m=overlay(); const saved=load();
  m.innerHTML=`
  <div style="max-width:560px;margin:0 auto;padding:24px 20px calc(30px + env(safe-area-inset-bottom));min-height:100%;display:flex;flex-direction:column;align-items:center;text-align:center;">
    <div style="width:100%;display:flex;justify-content:flex-start;"><button onclick="document.getElementById('carrera-modal').remove();window.openGamesModal&&window.openGamesModal()" style="background:rgba(255,255,255,.06);border:none;color:#aaa;font-size:13px;border-radius:20px;padding:8px 14px;cursor:pointer;"><i class='bx bx-arrow-back'></i> Juegos</button></div>
    <div style="width:96px;height:96px;border-radius:24px;background:rgba(186,255,0,.1);border:1px solid rgba(186,255,0,.3);display:flex;align-items:center;justify-content:center;margin:16px 0 12px;"><i class='bx bx-trophy' style="font-size:50px;color:${A};"></i></div>
    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:28px;color:#fff;">MODO CARRERA</div>
    <div style="font-size:14px;color:#9aa0a6;margin-top:6px;max-width:380px;line-height:1.5;">Del potrero a la gloria. Elegí club, país y posición; tomá decisiones dentro y fuera de la cancha, y escribí tu historia.</div>
    ${saved?`<button onclick="window._carreraHub()" style="width:100%;max-width:360px;margin-top:22px;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:15px;padding:15px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;"><i class='bx bx-play'></i> CONTINUAR (${esc(saved.apellido)}, ${saved.edad} años)</button>`:''}
    <button onclick="window._carreraLen()" style="width:100%;max-width:360px;margin-top:${saved?'10px':'22px'};background:${saved?'rgba(255,255,255,.05)':'linear-gradient(135deg,#16a34a,'+A+')'};color:${saved?'#fff':'#000'};border:${saved?'1px solid #242424':'none'};border-radius:15px;padding:15px;font-weight:900;font-size:15px;cursor:pointer;"><i class='bx bx-plus'></i> ${saved?'Nueva carrera':'NUEVA CARRERA'}</button>
  </div>`;
};

// ── DURACIÓN DE CARRERA ──────────────────────────────────────────────────────────
window._carreraLen = function(){
  const m=overlay();
  const ops=[10,15,20,25];
  m.innerHTML=`
  <div style="max-width:520px;margin:0 auto;padding:22px 20px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;"><button onclick="window._carreraStart()" style="background:rgba(255,255,255,.06);border:none;color:#aaa;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;"><i class='bx bx-arrow-back'></i></button><div style="font-family:Outfit,sans-serif;font-weight:900;font-size:20px;color:#fff;">¿Cuántos años durará tu carrera?</div></div>
    <div style="font-size:12.5px;color:#8a8f96;margin:0 0 18px 44px;">Empezás a los 16. Más años = más historia, más decisiones.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      ${ops.map(y=>`<button onclick="window._carreraIdent(${y})" style="background:rgba(255,255,255,.04);border:1.5px solid #262626;border-radius:16px;padding:22px;cursor:pointer;transition:.12s;" onmouseover="this.style.borderColor='${A}'" onmouseout="this.style.borderColor='#262626'">
        <div style="font-family:Outfit,sans-serif;font-size:34px;font-weight:900;color:${A};">${y}</div>
        <div style="font-size:12px;color:#c4ccc0;font-weight:700;">años de carrera</div>
        <div style="font-size:10px;color:#666;margin-top:3px;">hasta los ${16+y}</div>
      </button>`).join('')}
    </div>
  </div>`;
};

// ── IDENTIDAD ───────────────────────────────────────────────────────────────────
let _draft=null;
window._carreraIdent = function(years){
  _draft = _draft || { years, apellido:(me().name||'').split(' ').slice(-1)[0]||'', num:10, pie:'Derecha', pais:(me().nat||me().country||'Uruguay'), pos:'DC', filtro:'' };
  _draft.years = years;
  renderIdent();
};
function renderIdent(){
  const d=_draft; const m=document.getElementById('carrera-modal')||overlay();
  const list = PAISES.filter(p=>p.toLowerCase().includes((d.filtro||'').toLowerCase()));
  m.innerHTML=`
  <div style="max-width:1040px;margin:0 auto;padding:18px 18px calc(96px + env(safe-area-inset-bottom));">
    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:22px;color:#fff;margin-bottom:16px;">Definí tu identidad</div>
    <div style="display:grid;grid-template-columns:1fr;gap:18px;">
      <!-- Identidad: camiseta -->
      <div style="background:rgba(255,255,255,.03);border:1px solid #1c1c1c;border-radius:16px;padding:18px;text-align:center;">
        <div style="font-size:12px;font-weight:900;letter-spacing:1px;color:#9aa0a6;margin-bottom:12px;">IDENTIDAD</div>
        <div id="cr-jersey" style="display:flex;justify-content:center;margin-bottom:14px;">${jersey(150, d.apellido, d.num, d.pais)}</div>
        <div style="display:flex;gap:8px;max-width:320px;margin:0 auto;">
          <div style="flex:2;"><label style="font-size:10px;font-weight:800;color:#666;display:block;margin-bottom:4px;">APELLIDO</label><input id="cr-ape" value="${esc(d.apellido)}" placeholder="APELLIDO" oninput="window._carreraSet('apellido',this.value)" style="${inp()}"></div>
          <div style="flex:1;"><label style="font-size:10px;font-weight:800;color:#666;display:block;margin-bottom:4px;">NÚMERO</label><input id="cr-num" type="number" min="1" max="99" value="${d.num}" oninput="window._carreraSet('num',this.value)" style="${inp()}"></div>
        </div>
        <div style="max-width:320px;margin:12px auto 0;"><label style="font-size:10px;font-weight:800;color:#666;display:block;margin-bottom:4px;">PIERNA HÁBIL</label>
          <div style="display:flex;gap:6px;">
            ${['Izquierda','Derecha'].map(x=>`<button onclick="window._carreraSet('pie','${x}')" style="flex:1;background:${d.pie===x?A:'#161616'};color:${d.pie===x?'#000':'#aaa'};border:1px solid ${d.pie===x?A:'#262626'};border-radius:10px;padding:11px;font-weight:800;font-size:13px;cursor:pointer;">${x}</button>`).join('')}
          </div>
        </div>
      </div>
      <!-- Nacionalidad -->
      <div style="background:rgba(255,255,255,.03);border:1px solid #1c1c1c;border-radius:16px;padding:18px;">
        <div style="font-size:12px;font-weight:900;letter-spacing:1px;color:#9aa0a6;text-align:center;margin-bottom:12px;">NACIONALIDAD</div>
        <input value="${esc(d.filtro)}" placeholder="Buscar país" oninput="window._carreraSet('filtro',this.value)" style="${inp()};margin-bottom:12px;">
        <div style="max-height:230px;overflow-y:auto;display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          ${list.map(p=>`<button onclick="window._carreraSet('pais','${p.replace(/'/g,"\\'")}')" style="display:flex;align-items:center;gap:8px;background:${d.pais===p?'rgba(186,255,0,.1)':'transparent'};border:1px solid ${d.pais===p?'rgba(186,255,0,.3)':'#1c1c1c'};border-radius:10px;padding:9px 10px;color:#fff;cursor:pointer;text-align:left;font-size:12.5px;font-weight:700;">${flagImg(p,22)}<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(p)}</span></button>`).join('')}
        </div>
      </div>
      <!-- Posición -->
      <div style="background:rgba(255,255,255,.03);border:1px solid #1c1c1c;border-radius:16px;padding:18px;">
        <div style="font-size:12px;font-weight:900;letter-spacing:1px;color:#9aa0a6;text-align:center;margin-bottom:12px;">POSICIÓN</div>
        ${pitch(d.pos,'window._carreraSet.bind(null,\'pos\')')}
      </div>
    </div>
    <div style="position:fixed;left:0;right:0;bottom:0;background:#0a0c0a;border-top:1px solid #1c1c1c;padding:14px 18px calc(14px + env(safe-area-inset-bottom));display:flex;gap:10px;max-width:1040px;margin:0 auto;">
      <button onclick="window._carreraLen()" style="flex:1;background:#161616;color:#aaa;border:1px solid #262626;border-radius:12px;padding:14px;font-weight:800;cursor:pointer;">Volver</button>
      <button onclick="window._carreraOfertas()" style="flex:2;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:12px;padding:14px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;">Confirmar identidad</button>
    </div>
  </div>`;
}
window._carreraSet = function(k,v){
  if(k==='num') v=clamp(parseInt(v)||10,1,99);
  _draft[k]=v;
  // Refrescos parciales para no perder foco al tipear.
  if(k==='apellido'||k==='num'||k==='pais'){ const j=document.getElementById('cr-jersey'); if(j) j.innerHTML=jersey(150,_draft.apellido,_draft.num,_draft.pais); }
  if(k==='pais'||k==='pie'||k==='pos'||k==='filtro') renderIdent();
};
function inp(){ return 'width:100%;background:#161616;border:1px solid #262626;color:#fff;border-radius:10px;padding:11px;font-size:14px;box-sizing:border-box;outline:none;font-family:inherit;'; }

// ── OFERTAS DE CANTERA ───────────────────────────────────────────────────────────
window._carreraOfertas = function(){
  const d=_draft;
  // 3 clubes juveniles: str bajo (interior UY / primera nacional / primera UY chicos).
  const cantera = todosClubs().filter(c=>c.str>=50 && c.str<=68).sort(()=>Math.random()-0.5).slice(0,3);
  d._ofertas = cantera;
  const m=document.getElementById('carrera-modal')||overlay();
  m.innerHTML=`
  <div style="max-width:560px;margin:0 auto;padding:22px 20px calc(30px + env(safe-area-inset-bottom));">
    <div style="text-align:center;margin-bottom:6px;">${jersey(96,d.apellido,d.num,d.pais)}</div>
    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:22px;color:#fff;text-align:center;">Oferta de cantera</div>
    <div style="font-size:13px;color:#9aa0a6;text-align:center;margin:4px 0 20px;">Tres clubes quieren sumarte a su proyecto juvenil. Elegí dónde empieza tu carrera.</div>
    <div style="display:flex;flex-direction:column;gap:12px;">
      ${cantera.map((c,i)=>`<button onclick="window._carreraFichar(${i})" style="display:flex;align-items:center;gap:14px;background:rgba(255,255,255,.03);border:1.5px solid #242424;border-radius:16px;padding:15px;cursor:pointer;text-align:left;" onmouseover="this.style.borderColor='${A}'" onmouseout="this.style.borderColor='#242424'">
        ${clubBadge(c.name,50)}
        <div style="flex:1;min-width:0;"><div style="font-size:10px;color:#666;font-weight:800;">Fichar por</div><div style="font-size:16px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(c.name)}</div><div style="font-size:11px;color:#8a8f96;">${flagImgInline(c.pais)} ${esc(c.liga)}</div></div>
        <i class='bx bx-chevron-right' style="color:#444;font-size:22px;"></i>
      </button>`).join('')}
    </div>
    <button onclick="window._carreraIdent(_draftYears())" style="width:100%;margin-top:16px;background:#161616;color:#aaa;border:1px solid #262626;border-radius:12px;padding:13px;font-weight:800;cursor:pointer;">Volver a identidad</button>
  </div>`;
};
window._draftYears = function(){ return _draft?_draft.years:15; };
function flagImgInline(p){ const c=FLAG[p]; return c?`<img src="https://flagcdn.com/w20/${c}.png" style="width:14px;height:auto;vertical-align:-2px;border-radius:2px;">`:''; }

window._carreraFichar = function(i){
  const d=_draft; const c=d._ofertas[i];
  const base = d.pos==='POR'?48:50;
  G = {
    apellido:d.apellido, num:d.num, pie:d.pie, pais:d.pais, pos:d.pos, years:d.years,
    edad:16, nivel:base, club:c.name, liga:c.liga, clubStr:c.str, clubPais:c.pais,
    dinero:0, valor:100000, fama:5, moral:72, titulos:0, temporada:1,
    tot:{pj:0,g:0,a:0}, timeline:[], hist:[], creado:Date.now()
  };
  save(); window._carreraHub();
};

// ── HUB DE CARRERA ───────────────────────────────────────────────────────────────
window._carreraHub = function(){
  if(!G) G=load(); if(!G){ window._carreraStart(); return; }
  const m=document.getElementById('carrera-modal')||overlay();
  const [c1,c2]=kitOf(G.pais);
  const rows=[]; for(let e=16;e<=16+G.years;e+=2){ rows.push(e); }
  const tl = {}; (G.timeline||[]).forEach(t=>{ tl[t.edad]=t; });
  m.innerHTML=`
  <div style="max-width:1040px;margin:0 auto;padding:16px 16px calc(96px + env(safe-area-inset-bottom));">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <button onclick="window._carreraStart()" style="background:rgba(255,255,255,.06);border:none;color:#aaa;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;"><i class='bx bx-arrow-back'></i></button>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:18px;color:#fff;">Tu carrera</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr;gap:16px;">
      <!-- Cabecera del jugador -->
      <div style="background:rgba(255,255,255,.03);border:1px solid #1c1c1c;border-radius:16px;padding:16px;">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="width:64px;height:64px;border-radius:14px;background:linear-gradient(150deg,#e08a1e,#a85e0e);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;"><div style="font-size:9px;font-weight:800;color:rgba(255,255,255,.8);letter-spacing:1px;">NIVEL</div><div style="font-size:26px;font-weight:900;color:#fff;line-height:1;">${Math.round(G.nivel)}</div></div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:7px;margin-bottom:3px;">${flagImg(G.pais,20)}<span style="font-size:11px;font-weight:900;color:#fff;">${esc((G.pais||'').slice(0,3).toUpperCase())}</span><span style="font-size:10px;font-weight:900;color:${A};background:rgba(186,255,0,.12);border:1px solid rgba(186,255,0,.3);border-radius:6px;padding:2px 7px;">#${G.num} ${esc(G.pos)}</span></div>
            <div style="display:flex;align-items:center;gap:8px;font-size:15px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${clubBadge(G.club,22)} ${esc(G.club)}</div>
            <div style="font-size:11px;color:#8a8f96;margin-top:2px;">${esc(G.liga)}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;"><div style="font-size:10px;color:#666;font-weight:800;">EDAD</div><div style="font-size:20px;font-weight:900;color:#fff;">${G.edad}</div><div style="font-size:9px;color:#666;margin-top:4px;">VALOR</div><div style="font-size:12px;font-weight:900;color:${A};">€${(G.valor>=1e6?(G.valor/1e6).toFixed(1)+'M':(G.valor/1e3|0)+'K')}</div></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:14px;text-align:center;">
          <div style="flex:1;"><div style="font-size:10px;color:#666;font-weight:800;">PJ</div><div style="font-size:18px;font-weight:900;color:#fff;">${G.tot.pj}</div></div>
          <div style="flex:1;"><div style="font-size:10px;color:#666;font-weight:800;">GLS</div><div style="font-size:18px;font-weight:900;color:#fff;">${G.tot.g}</div></div>
          <div style="flex:1;"><div style="font-size:10px;color:#666;font-weight:800;">AST</div><div style="font-size:18px;font-weight:900;color:#fff;">${G.tot.a}</div></div>
          <div style="flex:1;"><div style="font-size:10px;color:#666;font-weight:800;">TÍTULOS</div><div style="font-size:18px;font-weight:900;color:${A};">${G.titulos}</div></div>
        </div>
        <button onclick="window._carreraTemporada()" style="width:100%;margin-top:14px;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:12px;padding:14px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;">${G.edad>=16+G.years?'VER RETIRO':'JUGAR TEMPORADA '+G.temporada}  <i class='bx bx-right-arrow-alt'></i></button>
      </div>
      <!-- Línea de tiempo -->
      <div style="background:rgba(255,255,255,.03);border:1px solid #1c1c1c;border-radius:16px;padding:8px 14px;">
        <div style="display:flex;font-size:10px;font-weight:800;color:#666;padding:8px 0;border-bottom:1px solid #1c1c1c;"><span style="width:34px;">EDAD</span><span style="flex:1;">CLUB</span><span style="width:38px;text-align:center;">NIV</span><span style="width:32px;text-align:center;">PJ</span><span style="width:32px;text-align:center;">GLS</span><span style="width:32px;text-align:center;">AST</span></div>
        ${rows.map(e=>{ const t=tl[e]; return `<div style="display:flex;align-items:center;font-size:12px;padding:9px 0;border-bottom:1px solid #131313;color:${t?'#fff':'#3a3a3a'};">
          <span style="width:34px;font-weight:800;">${e}</span>
          <span style="flex:1;display:flex;align-items:center;gap:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t?clubBadge(t.club,20)+' '+esc(t.club):'—'}</span>
          <span style="width:38px;text-align:center;font-weight:900;color:${t?A:'#3a3a3a'};">${t?t.niv:''}</span>
          <span style="width:32px;text-align:center;">${t?t.pj:''}</span>
          <span style="width:32px;text-align:center;">${t?t.g:''}</span>
          <span style="width:32px;text-align:center;">${t?t.a:''}</span>
        </div>`; }).join('')}
      </div>
    </div>
  </div>`;
};

// ── TEMPORADA (simulación + decisión) ────────────────────────────────────────────
window._carreraTemporada = function(){
  if(G.edad>=16+G.years) return retiro();
  // Simular rendimiento de la temporada según nivel, posición y fuerza del club.
  const pj = ri(22,34);
  const atk = {POR:0.02,DFC:0.05,LI:0.08,LD:0.08,MCD:0.12,MI:0.35,MD:0.35,MC:0.25,MCO:0.5,EI:0.55,ED:0.55,DC:0.75}[G.pos]||0.3;
  const factor = (G.nivel/100) * (0.7+Math.random()*0.6);
  const g = Math.round(pj*atk*factor);
  const a = Math.round(pj*(atk*0.6+0.1)*factor);
  G.tot.pj+=pj; G.tot.g+=g; G.tot.a+=a;
  // Crecimiento/decadencia por edad.
  let dN; if(G.edad<24) dN=ri(2,5); else if(G.edad<30) dN=ri(0,3); else if(G.edad<33) dN=ri(-1,2); else dN=ri(-4,0);
  // Bonus por buena temporada.
  const rend=(g+a)/pj; if(rend>0.6) dN+=2; else if(rend>0.35) dN+=1;
  G.nivel=clamp(G.nivel+dN,30,99);
  // Título (probabilidad por fuerza del club y nivel).
  const gano = Math.random() < clamp((G.clubStr-55)/100 + (G.nivel-50)/200, 0.05, 0.6);
  if(gano) G.titulos++;
  // Valor de mercado.
  const edadFactor = G.edad<28?1.2:G.edad<32?0.8:0.4;
  G.valor = Math.round((G.nivel**2.4)*edadFactor*20);
  // Registrar en timeline.
  G.timeline.push({ edad:G.edad, club:G.club, niv:Math.round(G.nivel), pj, g, a, titulo:gano });
  G.temporada++; G.edad++;
  save();
  // Mostrar resumen de temporada + evento de decisión.
  resumenTemporada({pj,g,a,gano,dN});
};

function resumenTemporada(r){
  const m=document.getElementById('carrera-modal')||overlay();
  m.innerHTML=`
  <div style="max-width:520px;margin:0 auto;padding:30px 22px calc(30px + env(safe-area-inset-bottom));min-height:100%;display:flex;flex-direction:column;">
    <div style="text-align:center;margin-bottom:18px;">
      <div style="font-size:11px;font-weight:900;letter-spacing:2px;color:${A};">TEMPORADA ${G.temporada-1} · ${G.edad-1} AÑOS</div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:22px;color:#fff;margin-top:4px;">${esc(G.club)}</div>
      ${r.gano?`<div style="margin-top:8px;font-size:13px;font-weight:900;color:${A};"><i class='bx bx-trophy'></i> ¡CAMPEÓN! Sumaste un título</div>`:''}
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;">
      ${st('PJ',r.pj)}${st('GOLES',r.g)}${st('ASIST',r.a)}${st('NIVEL',(r.dN>=0?'+':'')+r.dN)}
    </div>
    <div id="cr-evwrap"></div>
  </div>`;
  setTimeout(()=>mostrarEvento(),50);
}
function st(l,v){ return `<div style="background:rgba(255,255,255,.04);border:1px solid #1e1e1e;border-radius:12px;padding:11px 4px;text-align:center;"><div style="font-size:9px;color:#666;font-weight:800;">${l}</div><div style="font-size:19px;font-weight:900;color:${A};">${esc(v)}</div></div>`; }

// Eventos de decisión (reusa impronta anterior + transferencias reales).
function mostrarEvento(){
  const wrap=document.getElementById('cr-evwrap'); if(!wrap) return;
  // A veces: oferta de transferencia a un club mejor.
  const mejores = todosClubs().filter(c=>c.str>G.clubStr+3 && ligaNivel(c.liga)>=ligaNivel(G.liga) && G.nivel>=c.str-8);
  const ofertaTransfer = mejores.length && Math.random()<0.5 && G.edad<33;
  if(ofertaTransfer){
    const c=pick(mejores);
    wrap.innerHTML=`
    <div style="background:linear-gradient(160deg,rgba(186,255,0,.06),rgba(20,22,18,.5));border:1px solid #242424;border-radius:16px;padding:16px;">
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:17px;color:#fff;margin-bottom:6px;">Oferta de ${esc(c.name)}</div>
      <div style="font-size:13.5px;color:#c4ccc0;line-height:1.5;margin-bottom:14px;">${esc(c.name)} (${esc(c.liga)}) te quiere. Más nivel, más presión, más plata. ¿Das el salto?</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button onclick="window._carreraTransfer(1,'${c.name.replace(/'/g,"\\'")}',${c.str},'${c.liga.replace(/'/g,"\\'")}','${c.pais.replace(/'/g,"\\'")}')" style="${btn(true)}">Fichar por ${esc(c.name)} (€${(c.str*90000/1e6).toFixed(1)}M)</button>
        <button onclick="window._carreraTransfer(0)" style="${btn(false)}">Quedarme en ${esc(G.club)}</button>
      </div>
    </div>`;
    return;
  }
  // Si no hay transferencia, evento de decisión clásico.
  const ev=eventoRandom(); G._ev=ev;
  wrap.innerHTML=`
    <div style="background:linear-gradient(160deg,rgba(186,255,0,.05),rgba(20,22,18,.5));border:1px solid #242424;border-radius:16px;padding:16px;">
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:17px;color:#fff;margin-bottom:6px;">${esc(ev.t)}</div>
      <div style="font-size:13.5px;color:#c4ccc0;line-height:1.5;margin-bottom:14px;">${esc(ev.d)}</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${ev.opts.map((o,i)=>`<button onclick="window._carreraElegir(${i})" style="${btn(i===0)}">${esc(o.txt)}</button>`).join('')}
      </div>
    </div>`;
}
function btn(prim){ return prim?`background:rgba(186,255,0,.1);border:1.5px solid rgba(186,255,0,.4);color:${A};border-radius:13px;padding:14px 15px;font-weight:800;font-size:14px;text-align:left;cursor:pointer;`:'background:rgba(255,255,255,.04);border:1.5px solid #262626;color:#fff;border-radius:13px;padding:14px 15px;font-weight:800;font-size:14px;text-align:left;cursor:pointer;'; }

window._carreraTransfer = function(go,name,str,liga,pais){
  if(go){ G.club=name; G.clubStr=str; G.liga=liga; G.clubPais=pais; G.fama+=8; G.moral+=4; G.dinero+=str*3000; }
  else { G.moral+=8; G.fama+=3; }
  save();
  const wrap=document.getElementById('cr-evwrap');
  if(wrap) wrap.innerHTML=`<div style="text-align:center;padding:10px 0;"><div style="font-size:15px;color:#fff;font-weight:700;margin-bottom:16px;">${go?'¡Nuevo club: '+esc(name)+'!':'Te quedás. La hinchada lo valora.'}</div><button onclick="window._carreraHub()" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:13px 28px;font-weight:900;cursor:pointer;">Continuar</button></div>`;
};

// Banco de eventos (impronta Canchero).
const EVENTOS=[
  { t:'Noche de joda antes del partido', d:'Te invitan a salir la noche previa a un partido clave.', opts:[
    { txt:'Salir con los pibes', ef:g=>{ const mal=Math.random()<.6; g.moral+=4; g.nivel+=mal?-2:0; return mal?'Rendiste mal, el DT te marcó.':'Zafaste, pero fue un riesgo.'; } },
    { txt:'Quedarme descansando', ef:g=>{ g.nivel+=1; return 'Profesionalismo puro. Rendís mejor.'; } } ] },
  { t:'Tentación fácil', d:'Te ofrecen un negocio turbio para ganar plata rápida.', opts:[
    { txt:'Aceptar (riesgoso)', ef:g=>{ const mal=Math.random()<.5; g.dinero+=mal?0:50000; g.fama+=mal?-15:0; g.moral+=mal?-14:2; return mal?'Se supo todo. Escándalo.':'Salió bien... esta vez.'; } },
    { txt:'Rechazar y seguir limpio', ef:g=>{ g.moral+=6; return 'Buena decisión. Tu carrera va por buen camino.'; } } ] },
  { t:'Molestia física', d:'Sentís una molestia fuerte en el entrenamiento.', opts:[
    { txt:'Parar y recuperarte', ef:g=>{ g.moral-=4; return 'Te perdés unos partidos pero volvés entero.'; } },
    { txt:'Jugar infiltrado', ef:g=>{ const peor=Math.random()<.5; g.nivel+=peor?-4:1; g.moral-=peor?8:0; g.fama+=peor?0:4; return peor?'La lesión empeoró.':'Aguantaste y fuiste figura.'; } } ] },
  { t:'Mentoría a un juvenil', d:'Un pibe del club te admira y te pide consejos.', opts:[
    { txt:'Ayudarlo y guiarlo', ef:g=>{ g.moral+=8; g.fama+=4; return 'Te ganás el respeto del vestuario.'; } },
    { txt:'Cada uno a lo suyo', ef:g=>{ g.moral-=3; return 'Fría decisión. Algunos lo notan.'; } } ] },
  { t:'La prensa te apunta', d:'Los medios te critican tras una mala racha.', opts:[
    { txt:'Responder en la cancha', ef:g=>{ g.moral+=3; g.nivel+=2; return 'Callaste bocas jugando. Respeto.'; } },
    { txt:'Contestar en redes', ef:g=>{ const mal=Math.random()<.5; g.fama+=mal?-6:6; g.moral+=mal?-4:2; return mal?'Se te fue de las manos.':'La gente te bancó.'; } } ] }
];
function eventoRandom(){ return pick(EVENTOS); }
window._carreraElegir = function(i){
  const ev=G._ev; const o=ev.opts[i]; if(!o) return;
  const res=o.ef(G);
  G.nivel=clamp(G.nivel,30,99); G.fama=clamp(G.fama,0,100); G.moral=clamp(G.moral,0,100); G.dinero=Math.max(0,G.dinero);
  G.hist.push({t:ev.t,res}); save();
  const wrap=document.getElementById('cr-evwrap');
  if(wrap) wrap.innerHTML=`<div style="text-align:center;padding:6px 0;"><div style="font-size:15px;color:#fff;font-weight:700;line-height:1.5;margin-bottom:16px;">${esc(res)}</div><button onclick="window._carreraHub()" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:13px 28px;font-weight:900;cursor:pointer;">Continuar</button></div>`;
};

function retiro(){
  const m=document.getElementById('carrera-modal')||overlay();
  const leyenda=G.titulos>=8||G.nivel>=88;
  m.innerHTML=`
  <div style="max-width:520px;margin:0 auto;padding:36px 22px calc(30px + env(safe-area-inset-bottom));min-height:100%;display:flex;flex-direction:column;align-items:center;text-align:center;">
    <div style="width:88px;height:88px;border-radius:50%;background:rgba(186,255,0,.12);border:1px solid rgba(186,255,0,.35);display:flex;align-items:center;justify-content:center;margin-bottom:14px;"><i class='bx ${leyenda?'bx-crown':'bx-medal'}' style="font-size:46px;color:${A};"></i></div>
    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:24px;color:#fff;">${esc(G.apellido)} #${G.num}</div>
    <div style="font-size:13px;color:#9aa0a6;margin:4px 0 18px;">${leyenda?'¡Te retirás como LEYENDA del fútbol!':'Colgaste los botines. Gran carrera.'}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;max-width:360px;margin-bottom:20px;">
      ${st2('NIVEL FINAL',Math.round(G.nivel))}${st2('TÍTULOS',G.titulos)}${st2('PARTIDOS',G.tot.pj)}${st2('GOLES',G.tot.g)}${st2('ASISTENCIAS',G.tot.a)}${st2('ÚLTIMO CLUB',G.club)}
    </div>
    <button onclick="window._carreraLen()" style="width:100%;max-width:360px;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:14px;padding:15px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;">NUEVA CARRERA</button>
    <button onclick="document.getElementById('carrera-modal').remove();window.openGamesModal&&window.openGamesModal()" style="width:100%;max-width:360px;margin-top:9px;background:transparent;color:#888;border:none;padding:11px;font-weight:800;font-size:13px;cursor:pointer;">Volver a Juegos</button>
  </div>`;
  try{ localStorage.removeItem(LS); }catch(e){}
}
function st2(l,v){ return `<div style="background:rgba(255,255,255,.04);border:1px solid #1e1e1e;border-radius:12px;padding:12px;"><div style="font-size:9px;color:#666;font-weight:800;letter-spacing:1px;">${l}</div><div style="font-size:16px;font-weight:900;color:${A};margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(v)}</div></div>`; }

console.log('[canchero-carrera] v2 cargado');
})();
