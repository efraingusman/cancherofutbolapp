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

// ── KIT POR PAÍS: tipo (solid/stripes/sash), colores y color de texto/número ────
const KITS = {
  'Argentina':{t:'stripes',c:['#75aadb','#ffffff'],txt:'#0a3b6b'},
  'Uruguay':{t:'solid',c:['#4aa3df'],txt:'#ffffff'},
  'Brasil':{t:'solid',c:['#f7d117'],txt:'#0a8f3c'},
  'Colombia':{t:'solid',c:['#fcd116'],txt:'#003893'},
  'México':{t:'solid',c:['#0a7d3b'],txt:'#ffffff'},
  'España':{t:'solid',c:['#c60b1e'],txt:'#ffcc00'},
  'Francia':{t:'solid',c:['#1b3a8f'],txt:'#ffffff'},
  'Inglaterra':{t:'solid',c:['#ffffff'],txt:'#c8102e'},
  'Italia':{t:'solid',c:['#1666c4'],txt:'#ffffff'},
  'Alemania':{t:'solid',c:['#ffffff'],txt:'#111111'},
  'Portugal':{t:'solid',c:['#b81b2c'],txt:'#0b6e2e'},
  'Nigeria':{t:'stripes',c:['#12a150','#ffffff'],txt:'#0a5a2c'},
  'Chile':{t:'solid',c:['#d52b1e'],txt:'#ffffff'},
  'Paraguay':{t:'stripes',c:['#d52b1e','#ffffff'],txt:'#0038a8'},
  'Perú':{t:'sash',c:['#ffffff','#d91023'],txt:'#d91023'},
  'Croacia':{t:'stripes',c:['#e01a2b','#ffffff'],txt:'#0a2a6b'},
  'Países Bajos':{t:'solid',c:['#f36c21'],txt:'#ffffff'},
  'Bélgica':{t:'solid',c:['#c8102e'],txt:'#111111'},
  'Ecuador':{t:'solid',c:['#f7d117'],txt:'#0038a8'},
  'Bolivia':{t:'solid',c:['#12a150'],txt:'#ffffff'},
  'Venezuela':{t:'solid',c:['#8c1414'],txt:'#ffffff'},
  'Estados Unidos':{t:'solid',c:['#ffffff'],txt:'#1e3a6e'}
};
function kitOf(pais){ const k=KITS[pais]; return k?[k.c[0], k.txt]:['#1b7a3e','#ffffff']; }

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
// Ciudades por país para generar clubes amateur locales lógicos.
const CIUDADES = {
  'Uruguay':['Salto','Paysandú','Maldonado','Tacuarembó','Rivera','Melo','Colonia','Durazno','Rocha','Minas'],
  'Argentina':['Rosario','Córdoba','Mendoza','La Plata','Mar del Plata','Tucumán','Salta','Santa Fe','Bahía Blanca'],
  'Brasil':['São Paulo','Río','Belo Horizonte','Porto Alegre','Curitiba','Salvador','Recife','Fortaleza'],
  'España':['Madrid','Sevilla','Bilbao','Valencia','Málaga','Zaragoza','Vigo','Granada'],
  'Inglaterra':['Londres','Mánchester','Liverpool','Birmingham','Leeds','Newcastle','Bristol'],
  'Italia':['Roma','Milán','Nápoles','Turín','Florencia','Génova','Palermo'],
  'Francia':['París','Marsella','Lyon','Lille','Burdeos','Niza','Toulouse'],
  'Alemania':['Berlín','Múnich','Hamburgo','Colonia','Frankfurt','Dortmund','Stuttgart'],
  'Colombia':['Bogotá','Medellín','Cali','Barranquilla','Cartagena','Bucaramanga'],
  'México':['Ciudad de México','Guadalajara','Monterrey','Puebla','Tijuana','León'],
  'Chile':['Santiago','Valparaíso','Concepción','Antofagasta','Temuco'],
  'Paraguay':['Asunción','Ciudad del Este','Encarnación','Luque'],
  'Perú':['Lima','Arequipa','Trujillo','Cusco','Piura'],
  'Portugal':['Lisboa','Oporto','Braga','Coímbra','Faro'],
  'Estados Unidos':['Nueva York','Los Ángeles','Miami','Chicago','Dallas','Atlanta']
};
const TIERS_ORDER = ['Interior Uruguay','Primera Nacional (ARG)','Primera Uruguay','Liga MX (MEX)','MLS (USA)','Primeira (POR)','Liga Profesional (ARG)','Saudi Pro League','Ligue 1 (FRA)','Serie A (ITA)','Bundesliga (ALE)','Premier (ING)','LaLiga (ESP)','Brasileirão'];
function ligaNivel(liga){ const i = TIERS_ORDER.indexOf(liga); return i<0?0:i; }
function todosClubs(){ const out=[]; LIGAS.forEach(L=>L.clubs.forEach(c=>out.push({name:c[0],str:c[1],liga:L.liga,pais:L.pais}))); return out; }
// Nombre de club → slug del escudo (img/clubs). Los que no están usan iniciales.
const NAMESLUG = {
  'Nacional':'nacional','Peñarol':'penarol','Defensor Sporting':'defensor-sporting','Danubio':'danubio',
  'Montevideo City':'montevideo-city','Boston River':'boston-river','Cerro':'cerro',
  'Boca Juniors':'boca','River Plate':'river','Racing':'racing','Independiente':'independiente','San Lorenzo':'san-lorenzo',
  'Rosario Central':'rosario-central',"Newell's":'newells','Vélez':'velez','Estudiantes':'estudiantes','Talleres':'talleres',
  'Flamengo':'flamengo','Palmeiras':'palmeiras','São Paulo':'sao-paulo','Corinthians':'corinthians','Grêmio':'gremio',
  'Internacional':'internacional','Santos':'santos','Fluminense':'fluminense',
  'Real Madrid':'real-madrid','Barcelona':'barcelona','Atlético':'atletico','Sevilla':'sevilla','Valencia':'valencia',
  'Real Sociedad':'real-sociedad','Villarreal':'villarreal','Betis':'betis',
  'Man City':'man-city','Liverpool':'liverpool','Arsenal':'arsenal','Man United':'man-united','Chelsea':'chelsea','Tottenham':'tottenham','Newcastle':'newcastle',
  'Juventus':'juventus','Inter':'inter','Milan':'milan','Napoli':'napoli','Roma':'roma','Lazio':'lazio',
  'PSG':'psg','Marsella':'marsella','Mónaco':'monaco','Lyon':'lyon','Lille':'lille',
  'Bayern':'bayern','Dortmund':'dortmund','Leipzig':'leipzig','Leverkusen':'leverkusen','Frankfurt':'frankfurt',
  'Benfica':'benfica','Porto':'porto','Sporting':'sporting','Braga':'braga',
  'América':'america-mx','Monterrey':'monterrey','Tigres':'tigres','Cruz Azul':'cruz-azul',
  'Inter Miami':'inter-miami','LA Galaxy':'la-galaxy','Atlanta United':'atlanta-united'
};
function clubBadge(name, size){
  const s=size||44;
  const ini = name.replace(/[^A-Za-zÁÉÍÓÚÑ ]/g,'').split(' ').map(w=>w[0]).join('').slice(0,3).toUpperCase();
  let h=0; for(let i=0;i<name.length;i++) h=(h*31+name.charCodeAt(i))>>>0;
  const hue=h%360;
  const fb = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:${Math.round(s*0.34)}px;color:#fff;background:linear-gradient(150deg,hsl(${hue} 55% 34%),hsl(${(hue+40)%360} 55% 22%));border-radius:${Math.round(s*0.24)}px;">${ini}</div>`;
  const slug = NAMESLUG[name];
  if (!slug) return `<div style="width:${s}px;height:${s}px;flex-shrink:0;border:1px solid rgba(255,255,255,.14);border-radius:${Math.round(s*0.24)}px;overflow:hidden;">${fb}</div>`;
  // Escudo real con fallback a iniciales si la imagen no existe.
  return `<div style="width:${s}px;height:${s}px;flex-shrink:0;display:flex;align-items:center;justify-content:center;position:relative;">
    <img src="img/clubs/${slug}.webp" alt="" style="max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4));" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
    <div style="display:none;position:absolute;inset:0;">${fb}</div>
  </div>`;
}

// ── CAMISETA (template PNG real + tinte con mask + rayas + texto encima) ───────
// Estrategia: 1) capa base tintada usando la silueta del PNG como CSS mask; 2) patrón
// (rayas/sash) con la MISMA máscara y color secundario; 3) el PNG encima con
// mix-blend-mode: multiply para preservar pliegues/costuras/sombras del template;
// 4) apellido y número por SVG absoluto (textLength garantiza que entren SIEMPRE).
const JERSEY_PNG = 'img/carrera/jersey-back.png?v=1';
function jersey(size, apellido, numero, pais){
  const k = KITS[pais] || {t:'solid',c:['#1b7a3e'],txt:'#ffffff'};
  const base = k.c[0]; const alt = k.c[1] || '#ffffff'; const txt = k.txt || '#111';
  const s = size;
  const maskCSS = `-webkit-mask:url('${JERSEY_PNG}') center/contain no-repeat;mask:url('${JERSEY_PNG}') center/contain no-repeat;`;
  let pattern = '';
  if (k.t === 'stripes'){
    // Franjas verticales del color secundario sobre base.
    pattern = `<div style="position:absolute;inset:0;background:repeating-linear-gradient(90deg,${alt} 0 ${(s/6).toFixed(1)}px,transparent ${(s/6).toFixed(1)}px ${(s/3).toFixed(1)}px);${maskCSS}"></div>`;
  } else if (k.t === 'sash'){
    pattern = `<div style="position:absolute;inset:0;background:linear-gradient(120deg,transparent 42%,${alt} 42%,${alt} 58%,transparent 58%);${maskCSS}"></div>`;
  }
  const apeUp = esc((apellido||'APELLIDO').toUpperCase()).slice(0,14);
  const num   = esc(String(numero||10)).slice(0,2);
  const apeLen = Math.min(160, 12*apeUp.length);
  const numLen = num.length>=2 ? 110 : 60;
  return `<div style="position:relative;width:${s}px;height:${s}px;display:inline-block;">
    <div style="position:absolute;inset:0;background:${base};${maskCSS}"></div>
    ${pattern}
    <img src="${JERSEY_PNG}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;mix-blend-mode:multiply;pointer-events:none;">
    <svg viewBox="0 0 240 240" width="${s}" height="${s}" style="position:absolute;inset:0;pointer-events:none;" xmlns="http://www.w3.org/2000/svg">
      <text x="120" y="78" text-anchor="middle" font-family="Outfit,Arial" font-weight="800" font-size="18" fill="${txt}" textLength="${apeLen}" lengthAdjust="spacingAndGlyphs" style="letter-spacing:1.5px;paint-order:stroke;stroke:rgba(0,0,0,.35);stroke-width:.6;">${apeUp}</text>
      <text x="120" y="140" text-anchor="middle" font-family="Outfit,Arial" font-weight="900" font-size="64" fill="${txt}" textLength="${numLen}" lengthAdjust="spacingAndGlyphs" style="paint-order:stroke;stroke:rgba(0,0,0,.35);stroke-width:1;">${num}</text>
    </svg>
  </div>`;
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
  <div style="position:relative;min-height:100%;background:radial-gradient(130% 60% at 50% 0%, #14340f 0%, #0a0c0a 55%);">
    <div style="position:absolute;inset:0;background:repeating-linear-gradient(90deg, rgba(186,255,0,.03) 0 2px, transparent 2px 40px);pointer-events:none;"></div>
    <div style="position:relative;max-width:560px;margin:0 auto;padding:20px 20px calc(30px + env(safe-area-inset-bottom));min-height:100%;display:flex;flex-direction:column;align-items:center;text-align:center;">
      <div style="width:100%;display:flex;justify-content:flex-start;"><button onclick="document.getElementById('carrera-modal').remove();window.openGamesModal&&window.openGamesModal()" style="background:rgba(255,255,255,.08);border:none;color:#ccc;font-size:13px;border-radius:20px;padding:8px 14px;cursor:pointer;"><i class='bx bx-arrow-back'></i> Juegos</button></div>
      <div style="font-size:12px;font-weight:900;letter-spacing:5px;color:${A};margin-top:26px;text-shadow:0 0 18px rgba(186,255,0,.5);">MODO CARRERA</div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:46px;line-height:1;color:#fff;margin-top:4px;letter-spacing:-1px;text-shadow:0 4px 30px rgba(0,0,0,.7);">CANCHERO<br><span style="color:${A};">LEYENDA</span></div>
      <div style="font-size:14px;color:#c4ccc0;margin-top:14px;max-width:360px;line-height:1.55;">Del potrero a la gloria. Naciste en un barrio cualquiera; tus decisiones —dentro y fuera de la cancha— escriben tu historia. ¿Llegás a leyenda?</div>
      <div style="width:100%;max-width:360px;margin-top:26px;">
        ${saved?`<button onclick="window._carreraHub()" style="width:100%;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:15px;padding:16px;font-family:Outfit,sans-serif;font-weight:900;font-size:16px;cursor:pointer;box-shadow:0 10px 30px rgba(80,220,110,.32);"><i class='bx bx-play-circle'></i> CONTINUAR — ${esc(saved.apellido||'')} (${saved.edad})</button>`:''}
        <button onclick="window._carreraLen()" style="width:100%;margin-top:10px;background:${saved?'rgba(255,255,255,.06)':'linear-gradient(135deg,#16a34a,'+A+')'};color:${saved?'#fff':'#000'};border:${saved?'1px solid #2a2a2a':'none'};border-radius:15px;padding:16px;font-family:Outfit,sans-serif;font-weight:900;font-size:16px;cursor:pointer;${saved?'':'box-shadow:0 10px 30px rgba(80,220,110,.32);'}">${saved?'Nueva carrera':'EMPEZAR MI CARRERA'}</button>
        <button onclick="window._carreraRanking()" style="width:100%;margin-top:10px;background:rgba(255,255,255,.05);color:#fff;border:1px solid #242424;border-radius:15px;padding:14px;font-weight:800;font-size:14px;cursor:pointer;"><i class='bx bx-bar-chart-alt-2' style="color:${A};"></i> Ranking de leyendas</button>
      </div>
    </div>
  </div>`;
};

// ── RANKING DE CARRERAS ──────────────────────────────────────────────────────────
function careerScore(g){ return Math.round(g.nivel*10 + g.titulos*60 + g.tot.g*3 + g.tot.a*1.5 + (g.years>=20?100:0)); }
async function saveCareer(g){
  try{ const c=window._sb; const u=me(); if(!c||!u.email) return;
    await c.from('carrera_scores').upsert({ email:u.email, name:(u.name||u.email.split('@')[0]), score:careerScore(g), nivel:Math.round(g.nivel), titulos:g.titulos, club:g.club, updated_at:new Date().toISOString() }, { onConflict:'email' });
  }catch(e){ console.warn('saveCareer', e); }
}
window._carreraRanking = async function(){
  const m=overlay();
  m.innerHTML=`<div style="max-width:520px;margin:0 auto;padding:24px 18px;text-align:center;color:#666;"><i class='bx bx-loader-alt bx-spin' style="font-size:30px;color:${A};"></i></div>`;
  let rows=[]; try{ const c=window._sb; if(c){ const {data}=await c.from('carrera_scores').select('name,email,score,nivel,titulos,club').order('score',{ascending:false}).limit(20); rows=data||[]; } }catch(e){}
  const myEmail=(me().email||'').toLowerCase();
  m.innerHTML=`
  <div style="max-width:520px;margin:0 auto;padding:22px 18px calc(30px + env(safe-area-inset-bottom));min-height:100%;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;"><button onclick="window._carreraStart()" style="background:rgba(255,255,255,.06);border:none;color:#aaa;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;"><i class='bx bx-arrow-back'></i></button><div style="font-family:Outfit,sans-serif;font-weight:900;font-size:20px;color:#fff;">Ranking de leyendas</div></div>
    ${rows.length?rows.map((r,i)=>`<div style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:12px;margin-bottom:6px;background:${(r.email||'').toLowerCase()===myEmail?'rgba(186,255,0,.08)':'rgba(255,255,255,.02)'};">
        <span style="width:26px;font-weight:900;color:${i<3?A:'#888'};font-size:15px;">${i+1}</span>
        <div style="flex:1;min-width:0;"><div style="font-size:13.5px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(r.name||'—')}</div><div style="font-size:10.5px;color:#777;">${esc(r.club||'')} · Niv ${r.nivel||'—'} · ${r.titulos||0} títulos</div></div>
        <span style="font-size:15px;font-weight:900;color:${A};">${r.score}</span>
      </div>`).join(''):`<div style="text-align:center;padding:40px;color:#666;"><i class='bx bx-trophy' style="font-size:44px;opacity:.3;display:block;margin-bottom:10px;"></i>Todavía no hay leyendas. ¡Terminá una carrera!</div>`}
    <button onclick="window._carreraLen()" style="width:100%;margin-top:16px;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:14px;padding:14px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;">EMPEZAR MI CARRERA</button>
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
    <div style="position:fixed;left:0;right:0;bottom:0;z-index:20;background:#0a0c0a;border-top:1px solid #1c1c1c;padding:14px 18px calc(14px + env(safe-area-inset-bottom));display:flex;gap:10px;max-width:1040px;margin:0 auto;box-shadow:0 -8px 24px rgba(0,0,0,.6);">
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
  // Clubes de cantera DEL PAÍS del jugador (un brasileño no arranca en Salto). Se prioriza
  // clubes reales de ese país con str bajo/medio; si no alcanzan 3, se generan clubes
  // amateur/barrio de ciudades de ese país. Así el arranque es lógico y local.
  let cantera = todosClubs().filter(c=>c.pais===d.pais && c.str>=50 && c.str<=72).sort(()=>Math.random()-0.5).slice(0,3);
  if (cantera.length < 3){
    const faltan = 3 - cantera.length;
    const ciudades = (CIUDADES[d.pais] || ['Central','Norte','Sur','Unión','Juventud','Barrio']).slice().sort(()=>Math.random()-0.5);
    const sufijos = ['FC','Atlético','Juventud','Deportivo','United','Sporting'];
    for (let i=0;i<faltan;i++){
      const nom = pick(sufijos)+' '+ciudades[i%ciudades.length];
      cantera.push({ name:nom, str:ri(48,56), liga:'Amateur '+d.pais, pais:d.pais });
    }
  }
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
      ${r.gano?`<div style="margin-top:12px;display:flex;flex-direction:column;align-items:center;">
        <img src="img/trofeos/${trofeoDe(G.liga)}.webp" alt="" style="height:96px;object-fit:contain;filter:drop-shadow(0 8px 20px rgba(186,255,0,.35));animation:crTrophy .7s cubic-bezier(.2,1.4,.4,1) both;" onerror="this.style.display='none'">
        <div style="margin-top:6px;font-size:14px;font-weight:900;color:${A};letter-spacing:1px;"><i class='bx bx-trophy'></i> ¡CAMPEÓN!</div>
      </div><style>@keyframes crTrophy{0%{transform:scale(.3) rotate(-12deg);opacity:0}100%{transform:scale(1) rotate(0);opacity:1}}</style>`:''}
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;">
      ${st('PJ',r.pj)}${st('GOLES',r.g)}${st('ASIST',r.a)}${st('NIVEL',(r.dN>=0?'+':'')+r.dN)}
    </div>
    <div id="cr-evwrap"></div>
  </div>`;
  setTimeout(()=>mostrarEvento(),50);
}
function st(l,v){ return `<div style="background:rgba(255,255,255,.04);border:1px solid #1e1e1e;border-radius:12px;padding:11px 4px;text-align:center;"><div style="font-size:9px;color:#666;font-weight:800;">${l}</div><div style="font-size:19px;font-weight:900;color:${A};">${esc(v)}</div></div>`; }

// Sueldo/años/prima de una oferta según fuerza del club y azar (da variedad entre ofertas).
function ofertaDe(c){
  const sueldo=Math.round(c.str*rnd(9,16))*10000;      // €/año aprox
  const anios=ri(2,5);
  const prima=Math.round(c.str*rnd(20,60))*1000;        // prima de fichaje
  return { name:c.name, str:c.str, liga:c.liga, pais:c.pais, sueldo, anios, prima };
}
// Eventos de decisión (reusa impronta anterior + transferencias reales con VARIAS ofertas).
function mostrarEvento(){
  const wrap=document.getElementById('cr-evwrap'); if(!wrap) return;
  // A veces: ofertas de transferencia (hasta 4 clubes distintos para ELEGIR).
  const mejores = todosClubs().filter(c=>c.str>G.clubStr+2 && ligaNivel(c.liga)>=ligaNivel(G.liga) && G.nivel>=c.str-9 && c.name!==G.club);
  const ofertaTransfer = mejores.length && Math.random()<0.5 && G.edad<34;
  if(ofertaTransfer){
    // Barajar y tomar hasta 4 clubes únicos.
    const shuffled = mejores.slice().sort(()=>Math.random()-0.5);
    const seen={}; const picks=[];
    for(const c of shuffled){ if(seen[c.name])continue; seen[c.name]=1; picks.push(c); if(picks.length>=4)break; }
    G._offers = picks.map(ofertaDe); save();
    mostrarOfertas('transfer');
    return;
  }
  // A veces: renovación con el club actual (varias condiciones para elegir).
  const ofertaRenov = Math.random()<0.28 && G.edad<36;
  if(ofertaRenov){
    const base={ name:G.club, str:G.clubStr, liga:G.liga, pais:G.clubPais };
    // 3 variantes de renovación: conservadora, ambiciosa, larga.
    G._renov = [
      Object.assign(ofertaDe(base), { _v:'Oferta base', sueldo:Math.round(G.clubStr*11)*10000, anios:2, prima:0 }),
      Object.assign(ofertaDe(base), { _v:'Pedir aumento', sueldo:Math.round(G.clubStr*17)*10000, anios:3, prima:Math.round(G.clubStr*30)*1000, _riesgo:true }),
      Object.assign(ofertaDe(base), { _v:'Contrato largo', sueldo:Math.round(G.clubStr*13)*10000, anios:5, prima:Math.round(G.clubStr*15)*1000 })
    ];
    save(); mostrarOfertas('renov');
    return;
  }
  // Si no hay transferencia, evento de decisión clásico.
  const ev=eventoRandom(); G._ev=ev;
  wrap.innerHTML=`
    <div style="background:linear-gradient(160deg,rgba(186,255,0,.05),rgba(20,22,18,.5));border:1px solid #242424;border-radius:16px;padding:16px;">
      ${decoImg(ev.img)}
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:17px;color:#fff;margin-bottom:6px;">${esc(ev.t)}</div>
      <div style="font-size:13.5px;color:#c4ccc0;line-height:1.5;margin-bottom:14px;">${esc(ev.d)}</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${ev.opts.map((o,i)=>`<button onclick="window._carreraElegir(${i})" style="${btn(i===0)}">${esc(o.txt)}</button>`).join('')}
      </div>
    </div>`;
}
function btn(prim){ return prim?`background:rgba(186,255,0,.1);border:1.5px solid rgba(186,255,0,.4);color:${A};border-radius:13px;padding:14px 15px;font-weight:800;font-size:14px;text-align:left;cursor:pointer;`:'background:rgba(255,255,255,.04);border:1.5px solid #262626;color:#fff;border-radius:13px;padding:14px 15px;font-weight:800;font-size:14px;text-align:left;cursor:pointer;'; }
// Fotos reales disponibles en img/carrera/decisiones/<tipo>.webp
const DECO_FOTOS = ['fichaje','final','joda','lesion','mentoria','ojeador','potrero','prensa','seleccion','titulo'];
// Categorías SIN foto → banner con ícono + gradiente propio (así cada decisión tiene una
// imagen que CORRESPONDE, en vez de reutilizar una foto genérica que no pega).
const DECO_ICON = {
  dinero:   { i:'bx-dollar-circle', c:['#2b220a','#c9a227'] },
  sponsor:  { i:'bx-purchase-tag',  c:['#082726','#14b8a6'] },
  familia:  { i:'bx-home-heart',    c:['#2a160a','#f97316'] },
  pelea:    { i:'bx-shield-x',      c:['#2a0a0a','#ef4444'] },
  redes:    { i:'bx-trending-up',   c:['#1a0a2a','#a855f7'] },
  agente:   { i:'bx-briefcase-alt', c:['#0f1622','#3b82f6'] },
  capitan:  { i:'bxs-star',         c:['#241a05','#eab308'] },
  tactica:  { i:'bx-clipboard',     c:['#0a2216','#22c55e'] }
};
// Banner ilustrativo de una decisión: foto real si existe la categoría, si no ícono temático.
function decoImg(tipo){
  if(!tipo) return '';
  if(DECO_ICON[tipo]){
    const k=DECO_ICON[tipo];
    return `<div style="height:120px;border-radius:12px;overflow:hidden;margin-bottom:12px;background:linear-gradient(135deg,${k.c[0]},#0d0d0d);display:flex;align-items:center;justify-content:center;position:relative;">
      <div style="position:absolute;inset:0;background:radial-gradient(120% 80% at 30% 20%, ${k.c[1]}22, transparent 60%);"></div>
      <i class='bx ${k.i}' style="font-size:56px;color:${k.c[1]};filter:drop-shadow(0 4px 14px ${k.c[1]}66);z-index:1;"></i>
    </div>`;
  }
  return `<div style="height:120px;border-radius:12px;overflow:hidden;margin-bottom:12px;background:#0d0d0d;"><img src="img/carrera/decisiones/${tipo}.webp" alt="" style="width:100%;height:100%;object-fit:cover;opacity:.92;" onerror="this.parentElement.style.display='none'"></div>`;
}
// Trofeo ilustrativo según la liga (img/trofeos/<n>.webp).
function trofeoDe(liga){
  const map={ 'LaLiga (ESP)':'laliga','Premier (ING)':'premier','Ligue 1 (FRA)':'ligue1','Primera Uruguay':'liga-uy','Liga Profesional (ARG)':'copa-argentina','Brasileirão':'copa-brasil' };
  return map[liga] || 'champions';
}

function eur(n){ return n>=1e6 ? '€'+(n/1e6).toFixed(1).replace('.0','')+'M' : '€'+Math.round(n/1000)+'k'; }
// Tarjeta de una oferta (escudo + club + liga + sueldo/años/prima).
function ofertaCard(o, i, kind){
  const sub = kind==='renov' ? (o._v||'Renovación') : esc(o.liga);
  const riesgo = o._riesgo ? `<div style="font-size:10px;color:#ffb454;margin-top:2px;">⚠ El club puede ofenderse si pedís de más</div>` : '';
  return `<button onclick="window._carreraElegirOferta('${kind}',${i})" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:rgba(255,255,255,.04);border:1.5px solid #262626;border-radius:14px;padding:12px;cursor:pointer;">
    ${clubBadge(o.name,42)}
    <div style="flex:1;min-width:0;">
      <div style="font-size:14.5px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(o.name)}</div>
      <div style="font-size:11px;color:#8a8f86;margin-top:1px;">${sub} · Nivel club ${o.str}</div>
      <div style="font-size:11.5px;color:${A};font-weight:800;margin-top:3px;">${eur(o.sueldo)}/año · ${o.anios} años${o.prima?' · prima '+eur(o.prima):''}</div>
      ${riesgo}
    </div>
    <i class='bx bx-chevron-right' style="color:#444;font-size:20px;"></i>
  </button>`;
}
function mostrarOfertas(kind){
  const wrap=document.getElementById('cr-evwrap'); if(!wrap) return;
  const list = kind==='renov' ? (G._renov||[]) : (G._offers||[]);
  const titulo = kind==='renov' ? 'Tu club te quiere renovar' : 'Tenés ofertas sobre la mesa';
  const sub = kind==='renov' ? `Elegí cómo negociar tu continuidad en ${esc(G.club)}.` : 'Varios clubes te quieren. Elegí tu próximo destino... o quedate.';
  wrap.innerHTML=`
  <div style="background:linear-gradient(160deg,rgba(186,255,0,.06),rgba(20,22,18,.5));border:1px solid #242424;border-radius:16px;padding:16px;">
    ${decoImg('fichaje')}
    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:17px;color:#fff;margin-bottom:4px;">${titulo}</div>
    <div style="font-size:13px;color:#c4ccc0;line-height:1.5;margin-bottom:14px;">${sub}</div>
    <div style="display:flex;flex-direction:column;gap:9px;">
      ${list.map((o,i)=>ofertaCard(o,i,kind)).join('')}
      <button onclick="window._carreraElegirOferta('quedarme',-1)" style="${btn(false)}"><i class='bx bx-home-heart' style="margin-right:6px;color:#8a8f86;"></i>${kind==='renov'?'Rechazar y escuchar ofertas después':'Quedarme en '+esc(G.club)}</button>
    </div>
  </div>`;
}
window._carreraElegirOferta = function(kind, i){
  let msg;
  if(kind==='quedarme'){
    G.moral+=8; G.fama+=3; msg='Te quedás. La hinchada lo valora.';
  } else {
    const o = (kind==='renov' ? (G._renov||[]) : (G._offers||[]))[i];
    if(!o){ window._carreraHub(); return; }
    if(kind==='renov'){
      if(o._riesgo && Math.random()<0.4){ G.moral-=6; G.fama-=2; msg='El club se ofendió con tu pedido. Renovación fría, pero seguís.'; }
      else { G.dinero+=o.prima+Math.round(o.sueldo*0.15); G.moral+=6; msg='Renovaste con '+esc(G.club)+' por '+o.anios+' años ('+eur(o.sueldo)+'/año).'; }
      G.clubStr=Math.min(99,G.clubStr+1);
    } else {
      G.club=o.name; G.clubStr=o.str; G.liga=o.liga; G.clubPais=o.pais;
      G.fama+=8; G.moral+=4; G.dinero+=o.prima+Math.round(o.sueldo*0.15);
      G.valor=Math.round((G.valor||o.str*90000)*1.1);
      msg='¡Nuevo club: '+esc(o.name)+'! Firmaste por '+o.anios+' años ('+eur(o.sueldo)+'/año).';
    }
  }
  G.fama=clamp(G.fama,0,100); G.moral=clamp(G.moral,0,100); G.dinero=Math.max(0,G.dinero);
  G._offers=null; G._renov=null; save();
  const wrap=document.getElementById('cr-evwrap');
  if(wrap) wrap.innerHTML=`<div style="text-align:center;padding:10px 0;"><div style="font-size:15px;color:#fff;font-weight:700;margin-bottom:16px;line-height:1.5;">${msg}</div><button onclick="window._carreraHub()" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:13px 28px;font-weight:900;cursor:pointer;">Continuar</button></div>`;
};
// Compat: viejos guardados que quedaron a mitad de camino.
window._carreraTransfer = function(go,name,str,liga,pais){
  if(go){ G.club=name; G.clubStr=str; G.liga=liga; G.clubPais=pais; G.fama+=8; G.moral+=4; G.dinero+=str*3000; }
  else { G.moral+=8; G.fama+=3; }
  save();
  const wrap=document.getElementById('cr-evwrap');
  if(wrap) wrap.innerHTML=`<div style="text-align:center;padding:10px 0;"><div style="font-size:15px;color:#fff;font-weight:700;margin-bottom:16px;">${go?'¡Nuevo club: '+esc(name)+'!':'Te quedás.'}</div><button onclick="window._carreraHub()" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:13px 28px;font-weight:900;cursor:pointer;">Continuar</button></div>`;
};

// Banco de eventos (impronta Canchero).
const EVENTOS=[
  { t:'Noche de joda antes del partido', img:'joda', d:'Te invitan a salir la noche previa a un partido clave.', opts:[
    { txt:'Salir con los pibes', ef:g=>{ const mal=Math.random()<.6; g.moral+=4; g.nivel+=mal?-2:0; return mal?'Rendiste mal, el DT te marcó.':'Zafaste, pero fue un riesgo.'; } },
    { txt:'Quedarme descansando', ef:g=>{ g.nivel+=1; return 'Profesionalismo puro. Rendís mejor.'; } } ] },
  { t:'Tentación fácil', img:'dinero', d:'Te ofrecen un negocio turbio para ganar plata rápida.', opts:[
    { txt:'Aceptar (riesgoso)', ef:g=>{ const mal=Math.random()<.5; g.dinero+=mal?0:50000; g.fama+=mal?-15:0; g.moral+=mal?-14:2; return mal?'Se supo todo. Escándalo.':'Salió bien... esta vez.'; } },
    { txt:'Rechazar y seguir limpio', ef:g=>{ g.moral+=6; return 'Buena decisión. Tu carrera va por buen camino.'; } } ] },
  { t:'Molestia física', img:'lesion', d:'Sentís una molestia fuerte en el entrenamiento.', opts:[
    { txt:'Parar y recuperarte', ef:g=>{ g.moral-=4; return 'Te perdés unos partidos pero volvés entero.'; } },
    { txt:'Jugar infiltrado', ef:g=>{ const peor=Math.random()<.5; g.nivel+=peor?-4:1; g.moral-=peor?8:0; g.fama+=peor?0:4; return peor?'La lesión empeoró.':'Aguantaste y fuiste figura.'; } } ] },
  { t:'Mentoría a un juvenil', img:'mentoria', d:'Un pibe del club te admira y te pide consejos.', opts:[
    { txt:'Ayudarlo y guiarlo', ef:g=>{ g.moral+=8; g.fama+=4; return 'Te ganás el respeto del vestuario.'; } },
    { txt:'Cada uno a lo suyo', ef:g=>{ g.moral-=3; return 'Fría decisión. Algunos lo notan.'; } } ] },
  { t:'La prensa te apunta', img:'prensa', d:'Los medios te critican tras una mala racha.', opts:[
    { txt:'Responder en la cancha', ef:g=>{ g.moral+=3; g.nivel+=2; return 'Callaste bocas jugando. Respeto.'; } },
    { txt:'Contestar en redes', ef:g=>{ const mal=Math.random()<.5; g.fama+=mal?-6:6; g.moral+=mal?-4:2; return mal?'Se te fue de las manos.':'La gente te bancó.'; } } ] },
  { t:'Te cita la Selección', img:'seleccion', d:'El entrenador de tu selección te llama para los amistosos. Es un salto de vitrina.', opts:[
    { txt:'Ir con todo a la Selección', ef:g=>{ const bien=Math.random()<.6; g.fama+=bien?12:4; g.nivel+=bien?2:0; g.valor=Math.round(g.valor*(bien?1.15:1.03)); return bien?'Jugaste bárbaro con tu país. Todos hablan de vos.':'Sumaste minutos, seguís en el radar.'; } },
    { txt:'Priorizar el club (rechazar)', ef:g=>{ g.moral-=3; g.nivel+=1; return 'Descansaste y rendís en el club, pero el hincha lo cuestiona.'; } } ] },
  { t:'El técnico te cambia de posición', img:'tactica', d:'El DT te quiere probar en otra función del campo.', opts:[
    { txt:'Adaptarme y aprender', ef:g=>{ g.nivel+=2; g.moral+=2; return 'Te volvés más completo. Buena decisión.'; } },
    { txt:'Negarme, es mi puesto', ef:g=>{ g.moral-=5; g.fama-=2; return 'Roce con el cuerpo técnico. Riesgoso.'; } } ] },

  // ── REPRESENTANTE / CONTRATO / DINERO ─────────────────────────────────────
  { t:'Cambio de representante', img:'agente', d:'Un agente top te quiere manejar la carrera, pero pide el 15% de todo.', opts:[
    { txt:'Firmar con el crack', ef:g=>{ const bien=Math.random()<.6; g.fama+=bien?10:2; g.valor=Math.round(g.valor*(bien?1.2:0.98)); return bien?'Te consigue vidriera y sponsors. Gran movida.':'Prometió mucho y cumplió poco.'; } },
    { txt:'Seguir con el de siempre', ef:g=>{ g.moral+=4; return 'Lealtad. El entorno te lo agradece.'; } } ] },
  { t:'Renovación con negociación', img:'fichaje', d:'El club quiere renovarte. Tu representante dice que pidas más.', opts:[
    { txt:'Pedir aumento y cláusula alta', ef:g=>{ const ok=Math.random()<.55; g.dinero+=ok?80000:0; g.moral+=ok?4:-6; g.fama+=ok?0:-3; return ok?'Renovaste con mejor sueldo. Bien jugado.':'La dirigencia se ofendió. Frío el vínculo.'; } },
    { txt:'Aceptar lo que ofrecen', ef:g=>{ g.dinero+=30000; g.moral+=3; return 'Renovación tranquila. El club feliz.'; } } ] },
  { t:'Oferta de un sponsor', img:'sponsor', d:'Una marca deportiva te ofrece ser su cara. Mucha exposición.', opts:[
    { txt:'Firmar el contrato', ef:g=>{ g.dinero+=60000; g.fama+=8; return 'Tu cara en todos lados. La billetera engorda.'; } },
    { txt:'Enfocarme solo en jugar', ef:g=>{ g.nivel+=2; return 'Menos ruido, más fútbol. El DT lo nota.'; } } ] },
  { t:'Inversión que te ofrecen', img:'dinero', d:'Un conocido te propone invertir tus ahorros en su negocio.', opts:[
    { txt:'Invertir fuerte', ef:g=>{ const bien=Math.random()<.5; g.dinero+=bien?120000:-70000; return bien?'El negocio explotó. Gran retorno.':'Se fundió todo. Dura lección.'; } },
    { txt:'Guardar la plata', ef:g=>{ g.dinero+=10000; return 'Conservador. Tus ahorros siguen ahí.'; } } ] },
  { t:'Préstamo para tener minutos', img:'fichaje', d:'No estás jugando. Te ofrecen salir a préstamo a un club más chico para sumar rodaje.', opts:[
    { txt:'Ir a jugar a préstamo', ef:g=>{ g.nivel+=3; g.moral+=5; return 'Jugaste todo. Volvés enchufado y con confianza.'; } },
    { txt:'Quedarme a pelear el puesto', ef:g=>{ const gana=Math.random()<.5; g.nivel+=gana?2:-2; g.moral+=gana?4:-6; return gana?'Te ganaste el puesto. Carácter.':'Seguiste en el banco. Frustrante.'; } } ] },
  { t:'Cláusula y un club grande', img:'fichaje', d:'Un grande de Europa quiere pagar tu cláusula, pero jugarías menos.', opts:[
    { txt:'Dar el salto al grande', ef:g=>{ g.fama+=14; g.valor=Math.round(g.valor*1.25); g.moral-=2; return 'Ficha en un gigante. Presión máxima, vidriera mundial.'; } },
    { txt:'Quedarme donde soy figura', ef:g=>{ g.nivel+=2; g.moral+=5; return 'Seguís siendo el ídolo. La hinchada te ama.'; } } ] },

  // ── FAMILIA / VIDA PERSONAL ───────────────────────────────────────────────
  { t:'Casamiento en puerta', img:'familia', d:'Tu pareja quiere casarse esta temporada. Coincide con un momento clave del equipo.', opts:[
    { txt:'Casarme, la familia primero', ef:g=>{ g.moral+=12; g.nivel-=1; return 'Feliz y equilibrado. Rendís tranquilo.'; } },
    { txt:'Posponer por el fútbol', ef:g=>{ g.moral-=6; g.nivel+=1; return 'Enfocado, pero hay tensión en casa.'; } } ] },
  { t:'Nace tu hijo', img:'familia', d:'Vas a ser padre. Las noches de poco sueño se vienen.', opts:[
    { txt:'Vivirlo a pleno', ef:g=>{ g.moral+=14; return 'La motivación más grande. Jugás con el alma.'; } },
    { txt:'Contratar ayuda y descansar', ef:g=>{ g.dinero-=15000; g.nivel+=1; return 'Descansás bien y rendís. Cuesta plata.'; } } ] },
  { t:'La familia quiere que vuelvas', img:'potrero', d:'Tus viejos te piden que juegues cerca de casa. Hay una oferta del club del barrio.', opts:[
    { txt:'Volver a mis raíces', ef:g=>{ g.moral+=10; g.fama-=4; g.valor=Math.round(g.valor*0.9); return 'Feliz en casa, aunque resignás vidriera.'; } },
    { txt:'Seguir mi camino afuera', ef:g=>{ g.moral-=4; g.fama+=3; return 'Duro, pero tu carrera sigue en alza.'; } } ] },

  // ── HINCHADA / CONFLICTOS ─────────────────────────────────────────────────
  { t:'Un hincha te invita a pelear', img:'pelea', d:'Tras una derrota, un hincha te encara en la calle y te provoca.', opts:[
    { txt:'Ignorarlo y seguir', ef:g=>{ g.moral+=4; g.fama+=2; return 'Madurez total. Buena imagen.'; } },
    { txt:'Contestarle mal', ef:g=>{ const mal=Math.random()<.7; g.fama+=mal?-10:2; g.moral-=mal?6:0; return mal?'Alguien lo filmó. Se hizo viral, mala prensa.':'Zafaste, nadie lo grabó.'; } } ] },
  { t:'La barra te aprieta', img:'pelea', d:'Un referente de la barra te pide entradas y "colaboración". Se pone denso.', opts:[
    { txt:'Plantarme y avisar al club', ef:g=>{ g.moral+=6; g.fama+=4; return 'El club te respalda. Hiciste lo correcto.'; } },
    { txt:'Ceder para evitar quilombo', ef:g=>{ g.moral-=8; g.dinero-=10000; return 'Compraste paz, pero te sentís pésimo.'; } } ] },
  { t:'Gesto con la tribuna popular', img:'titulo', d:'Después de un gol, podés ir a festejar con la popular.', opts:[
    { txt:'Ir a festejar con la gente', ef:g=>{ g.fama+=8; g.moral+=6; return 'La hinchada te idolatra. Momento épico.'; } },
    { txt:'Festejo sobrio', ef:g=>{ g.moral+=2; return 'Profesional, pero pasó sin ruido.'; } } ] },

  // ── PRENSA / REDES ────────────────────────────────────────────────────────
  { t:'Rumor de prensa sobre tu futuro', img:'prensa', d:'Sale una nota diciendo que te querés ir. No es verdad.', opts:[
    { txt:'Desmentir con un comunicado', ef:g=>{ g.moral+=4; g.fama+=2; return 'Aclaraste todo. El vestuario tranquilo.'; } },
    { txt:'No decir nada', ef:g=>{ const mal=Math.random()<.5; g.moral+=mal?-5:2; return mal?'El silencio alimentó el rumor.':'Se desinfló solo.'; } } ] },
  { t:'Video viral tuyo', img:'redes', d:'Un jueguito tuyo en el entrenamiento se hace viral en redes.', opts:[
    { txt:'Subirlo a mis redes', ef:g=>{ g.fama+=10; return 'Millones de views. Sos tendencia.'; } },
    { txt:'Mantener perfil bajo', ef:g=>{ g.moral+=3; g.nivel+=1; return 'Preferís que hablen tus partidos.'; } } ] },
  { t:'Entrevista polémica', img:'prensa', d:'Un periodista te tira preguntas para que critiques al DT.', opts:[
    { txt:'Bancar al técnico', ef:g=>{ g.moral+=5; g.nivel+=1; return 'El DT te lo devuelve con minutos.'; } },
    { txt:'Tirar un palo', ef:g=>{ const mal=Math.random()<.6; g.fama+=mal?-6:5; g.moral-=mal?6:-2; return mal?'Guerra interna. Mal clima.':'La gente te dio la razón.'; } } ] },

  // ── FÚTBOL / DEPORTIVO ────────────────────────────────────────────────────
  { t:'Penal en la final', img:'final', d:'Final empatada, definición por penales. El DT pregunta quién patea el quinto.', opts:[
    { txt:'Agarrar la pelota y patear', ef:g=>{ const gol=Math.random()<.6; g.fama+=gol?16:-4; g.moral+=gol?12:-10; g.titulos+=gol?0:0; return gol?'¡GOOOL! Héroe. Tu nombre queda en la historia.':'La atajó el arquero. Momento amargo.'; } },
    { txt:'Dejárselo a otro', ef:g=>{ g.moral-=2; return 'Otro asumió. No fue tu noche de gloria.'; } } ] },
  { t:'Chance de golazo o pase', img:'final', d:'Encarás solo, pero tenés un compañero mejor ubicado.', opts:[
    { txt:'Definir yo (egoísta)', ef:g=>{ const gol=Math.random()<.5; g.fama+=gol?8:-3; g.moral+=gol?4:-4; return gol?'¡Golazo! Todos lo gritan.':'Erraste y el banco se agarró la cabeza.'; } },
    { txt:'Asistir al compañero', ef:g=>{ const gol=Math.random()<.7; g.moral+=gol?6:0; g.fama+=gol?4:0; return gol?'Asistencia y gol. Juego colectivo.':'No la metió, pero mostraste generosidad.'; } } ] },
  { t:'Capitanía vacante', img:'capitan', d:'Se fue el capitán. El plantel podría elegirte a vos.', opts:[
    { txt:'Postularme de líder', ef:g=>{ const si=Math.random()<.55; g.fama+=si?8:0; g.moral+=si?8:-4; return si?'Te dieron la cinta. Referente del grupo.':'Eligieron a otro. Golpe al ego.'; } },
    { txt:'No buscar el rol', ef:g=>{ g.nivel+=1; return 'Preferís liderar dentro de la cancha, callado.'; } } ] },
  { t:'Sondeo de la Selección mayor', img:'seleccion', d:'El técnico de la mayor te sigue. Hay un amistoso y podrías debutar.', opts:[
    { txt:'Pedir que me citen', ef:g=>{ const va=Math.random()<.5; g.fama+=va?12:2; g.valor=Math.round(g.valor*(va?1.15:1)); return va?'¡Debutaste con la mayor! Sueño cumplido.':'Quedaste en pre-lista. Cerca.'; } },
    { txt:'Dejar que llegue solo', ef:g=>{ g.nivel+=2; return 'Seguís rindiendo y esperando tu momento.'; } } ] },
  { t:'Eliminatorias importantes', img:'seleccion', d:'Te citan para un partido decisivo de Eliminatorias.', opts:[
    { txt:'Jugar aunque estés cansado', ef:g=>{ const bien=Math.random()<.55; g.fama+=bien?12:2; g.nivel+=bien?1:-2; return bien?'Figura con la Selección. Vidriera mundial.':'Se te notó el cansancio, partido flojo.'; } },
    { txt:'Cuidarme para el club', ef:g=>{ g.moral-=4; g.nivel+=1; return 'El hincha de la Selección lo cuestiona.'; } } ] },
  { t:'DT nuevo, borrón y cuenta nueva', img:'tactica', d:'Llega un técnico que no te tiene en sus planes iniciales.', opts:[
    { txt:'Ganarme el puesto entrenando', ef:g=>{ const ok=Math.random()<.6; g.nivel+=ok?3:0; g.moral+=ok?6:-4; return ok?'Lo convenciste. Titular de nuevo.':'Sigue sin verte. Difícil.'; } },
    { txt:'Pedir salir', ef:g=>{ g.moral+=2; g.fama-=3; return 'Buscás nuevos aires. Riesgo de banca.'; } } ] },
  { t:'Molestia muscular en la previa', img:'lesion', d:'Sentís una pequeña sobrecarga antes de un clásico.', opts:[
    { txt:'Avisar y no arriesgar', ef:g=>{ g.moral+=2; return 'Prudencia. Te perdés el clásico pero cuidás el año.'; } },
    { txt:'Jugar el clásico igual', ef:g=>{ const peor=Math.random()<.45; g.nivel+=peor?-3:2; g.fama+=peor?0:6; return peor?'Recaída fea. Semanas afuera.':'Jugaste el clásico y la rompiste.'; } } ] },
  { t:'Oferta del fútbol árabe', img:'fichaje', d:'Un club árabe ofrece una fortuna, pero es menos competitivo.', opts:[
    { txt:'Ir por la plata', ef:g=>{ g.dinero+=300000; g.fama-=4; g.nivel-=2; return 'Te hacés millonario, resignás vitrina deportiva.'; } },
    { txt:'Priorizar mi nivel', ef:g=>{ g.nivel+=2; g.moral+=4; return 'Seguís compitiendo al máximo. Ambición pura.'; } } ] },
  { t:'Amistad vs competencia', img:'mentoria', d:'Tu mejor amigo del plantel pelea tu mismo puesto.', opts:[
    { txt:'Competencia sana', ef:g=>{ g.nivel+=2; g.moral+=4; return 'Se exigen mutuamente y crecen los dos.'; } },
    { txt:'Marcar territorio', ef:g=>{ g.moral-=5; g.nivel+=1; return 'Ganaste el puesto pero perdiste un amigo.'; } } ] },
  { t:'Fundación o causa benéfica', img:'potrero', d:'Podés armar una fundación en tu barrio con parte de tus ingresos.', opts:[
    { txt:'Devolverle al barrio', ef:g=>{ g.dinero-=40000; g.fama+=10; g.moral+=10; return 'Sos ejemplo. El barrio te lleva en el corazón.'; } },
    { txt:'Todavía no es momento', ef:g=>{ g.dinero+=5000; return 'Lo dejás para más adelante.'; } } ] }
];
// No repetir: mezcla los eventos aún NO vistos en esta carrera; cuando se agotan, resetea.
function eventoRandom(){
  try{
    if(!G) return pick(EVENTOS);
    if(!Array.isArray(G.evVistos)) G.evVistos=[];
    var idx=EVENTOS.map(function(_,i){return i;}).filter(function(i){ return G.evVistos.indexOf(i)===-1; });
    if(!idx.length){ G.evVistos=[]; idx=EVENTOS.map(function(_,i){return i;}); }
    var chosen=idx[Math.floor(Math.random()*idx.length)];
    G.evVistos.push(chosen);
    return EVENTOS[chosen];
  }catch(e){ return pick(EVENTOS); }
}
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
  try{ saveCareer(G); }catch(e){}
  m.innerHTML=`
  <div style="max-width:520px;margin:0 auto;padding:36px 22px calc(30px + env(safe-area-inset-bottom));min-height:100%;display:flex;flex-direction:column;align-items:center;text-align:center;">
    <div style="width:88px;height:88px;border-radius:50%;background:rgba(186,255,0,.12);border:1px solid rgba(186,255,0,.35);display:flex;align-items:center;justify-content:center;margin-bottom:14px;"><i class='bx ${leyenda?'bx-crown':'bx-medal'}' style="font-size:46px;color:${A};"></i></div>
    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:24px;color:#fff;">${esc(G.apellido)} #${G.num}</div>
    <div style="font-size:13px;color:#9aa0a6;margin:4px 0 18px;">${leyenda?'¡Te retirás como LEYENDA del fútbol!':'Colgaste los botines. Gran carrera.'}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;max-width:360px;margin-bottom:20px;">
      ${st2('NIVEL FINAL',Math.round(G.nivel))}${st2('TÍTULOS',G.titulos)}${st2('PARTIDOS',G.tot.pj)}${st2('GOLES',G.tot.g)}${st2('ASISTENCIAS',G.tot.a)}${st2('ÚLTIMO CLUB',G.club)}
    </div>
    <button onclick="window._carreraLen()" style="width:100%;max-width:360px;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:14px;padding:15px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;">NUEVA CARRERA</button>
    <button onclick="window._carreraRanking()" style="width:100%;max-width:360px;margin-top:9px;background:rgba(255,255,255,.05);color:#fff;border:1px solid #242424;border-radius:14px;padding:13px;font-weight:800;font-size:14px;cursor:pointer;"><i class='bx bx-bar-chart-alt-2' style="color:${A};"></i> Ver ranking</button>
    <button onclick="document.getElementById('carrera-modal').remove();window.openGamesModal&&window.openGamesModal()" style="width:100%;max-width:360px;margin-top:9px;background:transparent;color:#888;border:none;padding:11px;font-weight:800;font-size:13px;cursor:pointer;">Volver a Juegos</button>
  </div>`;
  try{ localStorage.removeItem(LS); }catch(e){}
}
function st2(l,v){ return `<div style="background:rgba(255,255,255,.04);border:1px solid #1e1e1e;border-radius:12px;padding:12px;"><div style="font-size:9px;color:#666;font-weight:800;letter-spacing:1px;">${l}</div><div style="font-size:16px;font-weight:900;color:${A};margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(v)}</div></div>`; }

console.log('[canchero-carrera] v2 cargado');
})();
