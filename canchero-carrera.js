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
// Barajado uniforme (Fisher-Yates). sort(()=>Math.random()-0.5) NO es uniforme:
// medido daba ~35.7% de las veces el primer elemento en su lugar original.
function shuffle(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }

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
  { liga:'Primera Uruguay', pais:'Uruguay', clubs:[['Nacional',78],['Peñarol',78],['Defensor Sporting',70],['Danubio',68],['Liverpool FC (UY)',67],['Montevideo City',66],['Boston River',64],['Cerro',62],['Wanderers',63],['Cerro Largo',61],['Plaza Colonia',60],['Progreso',59],['River Plate (UY)',60],['Racing (UY)',59]] },
  { liga:'Interior Uruguay', pais:'Uruguay', clubs:[['Salto FC',52],['Paysandú FC',52],['Maldonado',54],['Tacuarembó',53],['Rivera Central',51],['Artigas United',50],['Durazno FC',50],['Colonia FC',52],['Melo Sport',51],['Rocha FC',52],['Minas FC',49],['Florida CF',49],['Treinta y Tres',50]] },
  { liga:'Primera Nacional (ARG)', pais:'Argentina', clubs:[['Dep. Maipú',58],['San Martín',59],['Chacarita',58],['Gimnasia (Mza)',57],['Estudiantes (BA)',57],['Almirante Brown',56],['San Telmo',55],['Quilmes',57],['Ferro',56],['All Boys',55]] },
  { liga:'Liga Profesional (ARG)', pais:'Argentina', clubs:[['Boca Juniors',82],['River Plate',82],['Racing',78],['Independiente',76],['San Lorenzo',75],['Rosario Central',73],['Newell\'s',73],['Vélez',74],['Estudiantes',73],['Talleres',74],['Huracán',71],['Lanús',72],['Banfield',70],['Defensa y Justicia',72],['Argentinos Jrs',72],['Gimnasia LP',70],['Godoy Cruz',71],['Tigre',69],['Instituto',68],['Belgrano',69],['Platense',68],['Central Córdoba',68]] },
  { liga:'Brasileirão', pais:'Brasil', clubs:[['Flamengo',84],['Palmeiras',84],['São Paulo',80],['Corinthians',79],['Grêmio',78],['Internacional',78],['Santos',77],['Fluminense',79],['Atlético MG',80],['Botafogo',79],['Cruzeiro',77],['Vasco da Gama',75],['Bahia',74],['Fortaleza',75],['Athletico PR',76],['RB Bragantino',74],['Vitória',72],['Juventude',71]] },
  { liga:'LaLiga (ESP)', pais:'España', clubs:[['Real Madrid',90],['Barcelona',88],['Atlético',85],['Sevilla',80],['Valencia',77],['Real Sociedad',80],['Villarreal',79],['Betis',79],['Athletic',80],['Girona',79],['Osasuna',75],['Getafe',74],['Celta',74],['Rayo Vallecano',73],['Mallorca',73],['Alavés',72],['Las Palmas',72]] },
  { liga:'Premier (ING)', pais:'Inglaterra', clubs:[['Man City',90],['Liverpool',88],['Arsenal',87],['Man United',84],['Chelsea',84],['Tottenham',83],['Newcastle',82],['Aston Villa',82],['Brighton',80],['West Ham',79],['Everton',77],['Wolves',77],['Fulham',77],['Crystal Palace',77],['Brentford',77],['Nottingham Forest',76],['Bournemouth',76]] },
  { liga:'Serie A (ITA)', pais:'Italia', clubs:[['Juventus',84],['Inter',86],['Milan',85],['Napoli',85],['Roma',82],['Lazio',81],['Atalanta',83],['Fiorentina',80],['Bologna',79],['Torino',77],['Udinese',75],['Genoa',74],['Monza',73],['Empoli',72],['Como',72]] },
  { liga:'Ligue 1 (FRA)', pais:'Francia', clubs:[['PSG',88],['Marsella',80],['Mónaco',80],['Lyon',79],['Lille',78],['Rennes',78],['Niza',78],['Lens',78],['Nantes',73],['Estrasburgo',73],['Reims',73],['Toulouse',73]] },
  { liga:'Bundesliga (ALE)', pais:'Alemania', clubs:[['Bayern',90],['Dortmund',85],['Leipzig',83],['Leverkusen',84],['Frankfurt',80],['Stuttgart',80],['Union Berlin',77],['Freiburg',77],['Wolfsburg',76],['Mainz',74],['Gladbach',75],['Hoffenheim',75],['Werder Bremen',74]] },
  { liga:'Primeira (POR)', pais:'Portugal', clubs:[['Benfica',82],['Porto',82],['Sporting',82],['Braga',78],['Vitória SC',73],['Boavista',70],['Famalicão',70],['Gil Vicente',69]] },
  { liga:'Eredivisie (NED)', pais:'Países Bajos', clubs:[['Ajax',80],['PSV',81],['Feyenoord',80],['AZ Alkmaar',76],['Twente',75],['Utrecht',72],['Vitesse',70]] },
  { liga:'Jupiler Pro (BEL)', pais:'Bélgica', clubs:[['Anderlecht',76],['Club Brujas',78],['Genk',76],['Gante',74],['Standard',72],['Amberes',73]] },
  { liga:'Süper Lig (TUR)', pais:'Turquía', clubs:[['Galatasaray',80],['Fenerbahçe',80],['Beşiktaş',77],['Trabzonspor',76],['Başakşehir',73]] },
  { liga:'Liga MX (MEX)', pais:'México', clubs:[['América',78],['Chivas',76],['Monterrey',79],['Tigres',80],['Cruz Azul',77],['Pumas',74],['Toluca',75],['León',74],['Pachuca',75],['Santos Laguna',73],['Atlas',72],['Necaxa',71]] },
  { liga:'MLS (USA)', pais:'Estados Unidos', clubs:[['Inter Miami',78],['LA Galaxy',76],['LAFC',78],['Atlanta United',75],['Seattle Sounders',75],['Portland Timbers',73],['NY Red Bulls',73],['NYCFC',74],['Columbus Crew',75],['FC Cincinnati',75]] },
  { liga:'Primera Chile', pais:'Chile', clubs:[['Colo-Colo',73],['U. de Chile',72],['U. Católica',72],['Everton (CL)',66],['Palestino',65],['Cobreloa',63]] },
  { liga:'Primera Colombia', pais:'Colombia', clubs:[['Atl. Nacional',74],['Millonarios',73],['América de Cali',72],['Junior',72],['Ind. Medellín',70],['Deportivo Cali',70]] },
  { liga:'HNL (Croacia)', pais:'Croacia', clubs:[['Dinamo Zagreb',75],['Hajduk Split',72],['Rijeka',70],['Osijek',68]] },
  { liga:'Bundesliga (AUT)', pais:'Austria', clubs:[['RB Salzburg',77],['Sturm Graz',73],['Rapid Viena',71],['Austria Viena',69]] },
  { liga:'J-League (JPN)', pais:'Japón', clubs:[['Vissel Kobe',73],['Urawa Reds',72],['Kawasaki',73],['Yokohama FM',73],['Kashima',72]] },
  { liga:'Saudi Pro League', pais:'Arabia Saudita', clubs:[['Al-Nassr',80],['Al-Hilal',82],['Al-Ittihad',80],['Al-Ahli',78],['Al-Shabab',74],['Al-Ettifaq',73]] }
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
const TIERS_ORDER = ['Interior Uruguay','Primera Nacional (ARG)','Primera Chile','Primera Colombia','HNL (Croacia)','Bundesliga (AUT)','Primera Uruguay','J-League (JPN)','Liga MX (MEX)','MLS (USA)','Süper Lig (TUR)','Jupiler Pro (BEL)','Eredivisie (NED)','Primeira (POR)','Liga Profesional (ARG)','Saudi Pro League','Ligue 1 (FRA)','Serie A (ITA)','Bundesliga (ALE)','Premier (ING)','LaLiga (ESP)','Brasileirão'];
function ligaNivel(liga){ const i = TIERS_ORDER.indexOf(liga); return i<0?0:i; }
// Título de LIGA por país + copas nacionales/internacionales COHERENTES (nada de Champions
// con un club chileno). Cada liga define su torneo local, su copa nacional y a qué copa
// internacional clasifican sus mejores. Amateur no tiene copas internacionales.
const LIGA_TROFEOS = {
  'Primera Uruguay':      { local:'Campeonato Uruguayo', copaNac:'Copa AUF', inter:'Copa Libertadores', interLite:'Copa Sudamericana' },
  'Interior Uruguay':     { local:'Liga del Interior', copaNac:'Copa Nacional' },
  'Primera Nacional (ARG)':{ local:'Primera Nacional', copaNac:'Copa Argentina' },
  'Liga Profesional (ARG)':{ local:'Liga Profesional', copaNac:'Copa Argentina', inter:'Copa Libertadores', interLite:'Copa Sudamericana' },
  'Brasileirão':          { local:'Brasileirão', copaNac:'Copa do Brasil', inter:'Copa Libertadores', interLite:'Copa Sudamericana' },
  'LaLiga (ESP)':         { local:'LaLiga', copaNac:'Copa del Rey', inter:'Champions League', interLite:'Europa League' },
  'Premier (ING)':        { local:'Premier League', copaNac:'FA Cup', inter:'Champions League', interLite:'Europa League' },
  'Serie A (ITA)':        { local:'Serie A', copaNac:'Copa Italia', inter:'Champions League', interLite:'Europa League' },
  'Ligue 1 (FRA)':        { local:'Ligue 1', copaNac:'Copa de Francia', inter:'Champions League', interLite:'Europa League' },
  'Bundesliga (ALE)':     { local:'Bundesliga', copaNac:'DFB-Pokal', inter:'Champions League', interLite:'Europa League' },
  'Primeira (POR)':       { local:'Primeira Liga', copaNac:'Copa de Portugal', inter:'Champions League', interLite:'Europa League' },
  'Eredivisie (NED)':     { local:'Eredivisie', copaNac:'KNVB Beker', inter:'Champions League', interLite:'Europa League' },
  'Jupiler Pro (BEL)':    { local:'Jupiler Pro League', copaNac:'Copa de Bélgica', inter:'Champions League', interLite:'Conference League' },
  'Süper Lig (TUR)':      { local:'Süper Lig', copaNac:'Copa de Turquía', inter:'Champions League', interLite:'Europa League' },
  'Liga MX (MEX)':        { local:'Liga MX', copaNac:'Copa MX', inter:'Concachampions' },
  'MLS (USA)':            { local:'MLS Cup', copaNac:'US Open Cup', inter:'Concachampions' },
  'Primera Chile':        { local:'Primera División de Chile', copaNac:'Copa Chile', inter:'Copa Libertadores', interLite:'Copa Sudamericana' },
  'Primera Colombia':     { local:'Liga Colombiana', copaNac:'Copa Colombia', inter:'Copa Libertadores', interLite:'Copa Sudamericana' },
  'HNL (Croacia)':        { local:'HNL', copaNac:'Copa de Croacia', inter:'Champions League', interLite:'Conference League' },
  'Bundesliga (AUT)':     { local:'Bundesliga Austríaca', copaNac:'Copa de Austria', inter:'Champions League', interLite:'Europa League' },
  'J-League (JPN)':       { local:'J1 League', copaNac:'Copa del Emperador', inter:'Champions League de Asia' },
  'Saudi Pro League':     { local:'Saudi Pro League', copaNac:"King's Cup", inter:'Champions League de Asia' }
};
function trofeosDe(liga){ return LIGA_TROFEOS[liga] || { local: liga, copaNac: 'Copa Nacional' }; }
// Slug de imagen de trofeo (img/trofeos) según nombre. Fallback a un genérico.
// Cada nombre de torneo → slug del PNG real que subió el usuario a img/trofeos/.
// Ojo: mapping estricto (evita "Champions con Cobreloa"). Se resuelve por incluir keywords
// específicas del torneo, en orden de PRIORIDAD (más específicas primero).
// Mapeo EXPLÍCITO por nombre exacto (case-insensitive). Nada de "Champions con
// Cobreloa": si no hay imagen específica, devolvemos null y el UI muestra un
// trofeo genérico (icono) con el nombre del torneo.
// Los valores son el NOMBRE DE ARCHIVO COMPLETO (con extensión), porque conviven
// .webp y .png según de dónde salió cada imagen.
const TROFEO_MAP = {
  // ── Internacionales de clubes ──
  'champions league':'champions.webp','uefa champions league':'champions.webp',
  'europa league':'europa.webp',
  'conference league':'conference-league.webp',
  'copa libertadores':'libertadores.webp','copa sudamericana':'sudamericana.webp',
  'mundial de clubes':'mundial-clubes.webp','intercontinental':'intercontinental.webp',
  'concachampions':'concachampions.png',
  'champions league de asia':'champions-asia.png',
  // ── Selecciones ──
  'mundial':'mundial.webp','copa del mundo':'mundial.webp',
  'eurocopa':'eurocopa.webp','copa américa':'copa-america.webp','copa america':'copa-america.webp',
  'oro olímpico':'oro-olimpico.webp','oro olimpico':'oro-olimpico.webp',
  'juegos olímpicos':'oro-olimpico.webp','juegos olimpicos':'oro-olimpico.webp',
  'mundial sub-20':'mundial.webp','mundial sub-17':'mundial.webp','sudamericano sub-15':'copa-america.webp',
  // ── Ligas nacionales ──
  'laliga':'laliga.webp','la liga':'laliga.webp',
  'premier league':'premier.webp',
  'ligue 1':'ligue1.webp',
  'serie a':'coppa-italia.webp',
  'brasileirão':'copa-brasil.webp','brasileirao':'copa-brasil.webp',
  'primeira liga':'copa-portugal.webp',
  'campeonato uruguayo':'campeonato-uruguayo.png',
  // Ligas sin copa propia: se usa el LOGO OFICIAL de la liga (mejor que un genérico).
  'bundesliga':'liga-bundesliga.png',
  'eredivisie':'liga-eredivisie.png',
  'jupiler pro league':'liga-jupiler.png',
  'süper lig':'liga-superlig.png','super lig':'liga-superlig.png',
  'liga mx':'liga-mx.png',
  'mls cup':'liga-mls.png',
  'primera división de chile':'liga-chile.png','primera division de chile':'liga-chile.png',
  'liga colombiana':'liga-colombia.png',
  'hnl':'liga-hnl.png',
  'bundesliga austríaca':'liga-austria.png','bundesliga austriaca':'liga-austria.png',
  'j1 league':'liga-j1.png',
  'liga profesional':'liga-argentina.png',
  'primera nacional':'liga-primeranacional.png',
  'liga del interior':'liga-interior.png',
  'copa nacional':'copa-nacional-interior.png',
  'saudi pro league':'saudi-pro-league.png',
  // ── Copas nacionales ──
  'copa italia':'coppa-italia.webp','coppa italia':'coppa-italia.webp',
  'copa argentina':'copa-argentina.webp',
  'copa do brasil':'copa-brasil.webp',
  'copa de portugal':'copa-portugal.webp',
  'copa chile':'copa-chile.webp',
  'copa auf':'liga-uy.webp',
  'copa del rey':'copa-rey.png',
  'fa cup':'fa-cup.png',
  'dfb-pokal':'dfb-pokal.png','dfb pokal':'dfb-pokal.png',
  'copa de francia':'copa-francia.png',
  'knvb beker':'knvb-beker.webp',
  'copa de bélgica':'copa-belgica.webp','copa de belgica':'copa-belgica.webp',
  'copa de turquía':'copa-turquia.png','copa de turquia':'copa-turquia.png',
  'copa mx':'copa-mx.png',
  'us open cup':'us-open-cup.png',
  'copa colombia':'copa-colombia.png',
  'copa de croacia':'copa-croacia.png',
  'copa de austria':'copa-austria.webp',
  'copa del emperador':'copa-emperador.webp',
  "king's cup":'kings-cup.png','kings cup':'kings-cup.png'
};
function trofeoImgSlug(nombre){
  const n = (nombre||'').toLowerCase().trim();
  if (TROFEO_MAP[n]) return TROFEO_MAP[n];
  // Fuzzy sólo para nombres muy conocidos (no meter falsos positivos).
  // Ojo: "champions" solo si NO es la de Asia ni la Concacaf.
  if (n.includes('concacham')) return 'concachampions.png';
  if (n.includes('champions') && n.includes('asia')) return 'champions-asia.png';
  if (n.includes('champions')) return 'champions.webp';
  if (n.includes('conference')) return 'conference-league.webp';
  if (n.includes('libertadores')) return 'libertadores.webp';
  if (n.includes('sudamericana')) return 'sudamericana.webp';
  if (n.includes('europa league')) return 'europa.webp';
  if (n.includes('mundial de clubes')) return 'mundial-clubes.webp';
  if (n.includes('intercontinental')) return 'intercontinental.webp';
  if (n.includes('mundial')) return 'mundial.webp';
  // Sin match → null (UI renderiza icono genérico dorado con el nombre).
  return null;
}
// Renderiza un trofeo: usa imagen si hay archivo; si no, un icono genérico dorado.
function trofeoRender(nombre, size){
  const file = trofeoImgSlug(nombre);
  const s = size || 60;
  const generico = `<div style="width:${s}px;height:${s}px;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 35%, #facc15 0%, #b8860b 65%, #6b4d08 100%);border-radius:50%;box-shadow:0 4px 12px rgba(250,204,21,.35), inset 0 -6px 12px rgba(0,0,0,.35), inset 0 4px 8px rgba(255,255,255,.35);"><i class='bx bxs-trophy' style="font-size:${Math.round(s*0.55)}px;color:#fff8dc;text-shadow:0 1px 2px rgba(0,0,0,.4);"></i></div>`;
  if (!file) return generico;
  // Si la imagen falla, cae al trofeo dorado genérico (nunca a otra copa equivocada).
  return `<span style="display:inline-flex;align-items:center;justify-content:center;position:relative;"><img src="img/trofeos/${file}" alt="" style="max-height:${s}px;max-width:100%;object-fit:contain;filter:drop-shadow(0 4px 12px rgba(250,204,21,.35));" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><span style="display:none;">${generico}</span></span>`;
}
// Premios individuales — nombre de archivo completo (con extensión).
function premioImgSlug(nombre){
  const n = (nombre||'').toLowerCase();
  if (n.includes('balón de oro') || n.includes('balon de oro')) return 'balon-oro.webp';
  if (n.includes('the best')) return 'the-best.webp';
  if (n.includes('fifa mejor') || n.includes('mejor jugador de la fifa')) return 'fifa-mejor.png';
  if (n.includes('bota de oro')) return 'bota-oro.webp';
  if (n.includes('guante')) return 'guante-oro.png';
  if (n.includes('joven')) return 'mejor-joven.png';
  return null;
}
// Render de premio individual, con fallback a medalla dorada genérica.
function premioRender(nombre, size){
  const file = premioImgSlug(nombre);
  const s = size || 56;
  const gen = `<div style="width:${s}px;height:${s}px;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 35%, #fde68a 0%, #d97706 70%, #7c4a03 100%);border-radius:50%;box-shadow:0 4px 12px rgba(217,119,6,.4);"><i class='bx bxs-medal' style="font-size:${Math.round(s*0.55)}px;color:#fff8dc;"></i></div>`;
  if (!file) return gen;
  return `<span style="display:inline-flex;align-items:center;justify-content:center;"><img src="img/trofeos/${file}" alt="" style="max-height:${s}px;max-width:100%;object-fit:contain;filter:drop-shadow(0 4px 12px rgba(250,204,21,.35));" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><span style="display:none;">${gen}</span></span>`;
}
function todosClubs(){ const out=[]; LIGAS.forEach(L=>L.clubs.forEach(c=>out.push({name:c[0],str:c[1],liga:L.liga,pais:L.pais}))); return out; }
// ── ASCENSO / DESCENSO ─────────────────────────────────────────────────────────
// Mapea cada liga con su superior/inferior. Si no hay, undefined = no se mueve.
const LIGA_PAIR = {
  'Interior Uruguay':      { arriba:'Primera Uruguay' },
  'Primera Uruguay':       { abajo:'Interior Uruguay' },
  'Primera Nacional (ARG)':{ arriba:'Liga Profesional (ARG)' },
  'Liga Profesional (ARG)':{ abajo:'Primera Nacional (ARG)' }
};
function pairLiga(liga){ return LIGA_PAIR[liga] || null; }
// Nombre de club → slug del escudo (img/clubs). Los que no están usan iniciales.
const NAMESLUG = {
  // Uruguay
  'Nacional':'nacional-uy','Peñarol':'penarol','Defensor Sporting':'defensor-sporting','Danubio':'danubio',
  'Liverpool FC (UY)':'liverpool-uy','Montevideo City':'montevideo-city','Boston River':'boston-river','Cerro':'cerro',
  'Wanderers':'wanderers-uy','Cerro Largo':'cerro-largo','Progreso':'progreso',
  // Argentina
  'Boca Juniors':'boca','River Plate':'river','Racing':'racing','Independiente':'independiente','San Lorenzo':'san-lorenzo',
  'Rosario Central':'rosario-central',"Newell's":'newells','Vélez':'velez','Estudiantes':'estudiantes','Talleres':'talleres',
  'Huracán':'huracan','Lanús':'lanus','Banfield':'banfield','Defensa y Justicia':'defensa','Argentinos Jrs':'argentinos',
  'Gimnasia LP':'gimnasia','Instituto':'instituto','Belgrano':'belgrano','Platense':'platense','Central Córdoba':'central-cordoba',
  // Brasil
  'Flamengo':'flamengo','Palmeiras':'palmeiras','São Paulo':'sao-paulo','Corinthians':'corinthians','Grêmio':'gremio',
  'Internacional':'internacional','Santos':'santos','Fluminense':'fluminense',
  // LaLiga (barcelona-fc = FC Barcelona real; barcelona.webp era el de Ecuador)
  'Barcelona':'barcelona-fc','Real Madrid':'real-madrid','Atlético':'atletico','Sevilla':'sevilla','Valencia':'valencia',
  'Real Sociedad':'real-sociedad','Villarreal':'villarreal','Betis':'betis','Athletic':'athletic','Osasuna':'osasuna',
  'Getafe':'getafe','Celta':'celta','Rayo Vallecano':'rayo','Alavés':'alaves',
  // Premier
  'Arsenal':'arsenal','Aston Villa':'aston-villa','Bournemouth':'bournemouth','Brentford':'brentford','Brighton':'brighton',
  'Chelsea':'chelsea','Crystal Palace':'crystal-palace','Everton':'everton','Fulham':'fulham','Liverpool':'liverpool',
  'Man City':'man-city','Man United':'man-united','Newcastle':'newcastle','Nottingham Forest':'nott-forest','Tottenham':'tottenham',
  // Serie A
  'Juventus':'juventus','Inter':'inter','Milan':'milan','Napoli':'napoli','Roma':'roma','Lazio':'lazio','Fiorentina':'fiorentina',
  // Ligue 1
  'PSG':'psg','Marsella':'marsella','Mónaco':'monaco','Lyon':'lyon','Lille':'lille','Rennes':'rennes','Niza':'niza',
  'Lens':'lens','Estrasburgo':'estrasburgo','Toulouse':'toulouse',
  // Bundesliga
  'Bayern':'bayern','Dortmund':'dortmund','Leverkusen':'leverkusen','Leipzig':'leipzig','Frankfurt':'frankfurt',
  'Stuttgart':'stuttgart','Union Berlin':'union-berlin','Freiburg':'freiburg','Gladbach':'gladbach','Hoffenheim':'hoffenheim',
  'Mainz':'mainz','Werder Bremen':'werder',
  // Portugal
  'Benfica':'benfica','Porto':'porto','Sporting':'sporting','Braga':'braga','Vitória SC':'vitoria-sc',
  'Famalicão':'famalicao','Gil Vicente':'gil-vicente',
  // Eredivisie
  'Ajax':'ajax','PSV':'psv','Feyenoord':'feyenoord','AZ Alkmaar':'az',
  // Liga MX
  'América':'america-mx','Chivas':'chivas','Monterrey':'monterrey','Tigres':'tigres','Cruz Azul':'cruz-azul',
  'Pumas':'pumas','Toluca':'toluca','León':'leon','Pachuca':'pachuca','Santos Laguna':'santos-laguna',
  'Atlas':'atlas','Necaxa':'necaxa',
  // MLS
  'Inter Miami':'inter-miami','LA Galaxy':'la-galaxy','LAFC':'lafc','Atlanta United':'atlanta-united',
  'Seattle Sounders':'seattle','Portland Timbers':'portland','NY Red Bulls':'ny-red-bulls','NYCFC':'nycfc',
  'Columbus Crew':'columbus','FC Cincinnati':'cincinnati',
  // Otros
  'RB Salzburg':'salzburg','Dinamo Zagreb':'dinamo-zagreb','Vissel Kobe':'vissel-kobe','Palermo':'palermo'
};
// Escudo GENÉRICO: forma de crest de fútbol (pentágono redondeado) con dos tonos
// hash-deterministas + iniciales encima. Se ve como un escudo de verdad — cero
// bloques planos con una letra pelada.
function genericCrest(name, size){
  const s=size||44;
  const ini = (name||'?').replace(/[^A-Za-zÁÉÍÓÚÑ ]/g,'').split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,3).toUpperCase() || '?';
  let h=0; for(let i=0;i<(name||'').length;i++) h=(h*31+name.charCodeAt(i))>>>0;
  const hue=h%360;
  const c1 = `hsl(${hue} 65% 44%)`, c2 = `hsl(${(hue+30)%360} 55% 22%)`, c3 = `hsl(${(hue+180)%360} 45% 60%)`;
  const uid = 'cg'+(h%9999);
  const fs = Math.round(s*0.30);
  return `<svg viewBox="0 0 60 68" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,.5));display:block;">
    <defs>
      <linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
    </defs>
    <path d="M6 6 L30 3 L54 6 L54 34 Q54 52 30 65 Q6 52 6 34 Z" fill="url(#${uid})" stroke="rgba(0,0,0,.35)" stroke-width="1.3"/>
    <path d="M6 6 L30 3 L54 6 L54 22 L30 20 L6 22 Z" fill="rgba(255,255,255,.14)"/>
    <path d="M30 20 Q42 24 42 40 Q42 52 30 60 Q18 52 18 40 Q18 24 30 20 Z" fill="${c3}" opacity=".22"/>
    <text x="30" y="41" text-anchor="middle" font-family="Outfit,Arial" font-weight="900" font-size="${fs}" fill="#fff" style="paint-order:stroke;stroke:rgba(0,0,0,.55);stroke-width:.8;">${ini}</text>
  </svg>`;
}
function clubBadge(name, size){
  const s=size||44;
  const slug = NAMESLUG[name];
  const generic = `<div style="width:${s}px;height:${s}px;flex-shrink:0;">${genericCrest(name, s)}</div>`;
  if (!slug) return generic;
  // Escudo real con fallback al crest genérico si la imagen no existe (ya no letra pelada).
  return `<div style="width:${s}px;height:${s}px;flex-shrink:0;display:flex;align-items:center;justify-content:center;position:relative;">
    <img src="img/clubs/${slug}.webp" alt="" style="max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4));" onerror="this.style.display='none';this.nextElementSibling.style.display='block';">
    <div style="display:none;position:absolute;inset:0;">${genericCrest(name, s)}</div>
  </div>`;
}

// ── CAMISETA (template PNG real + tinte con mask + rayas + texto encima) ───────
// Estrategia: 1) capa base tintada usando la silueta del PNG como CSS mask; 2) patrón
// (rayas/sash) con la MISMA máscara y color secundario; 3) el PNG encima con
// mix-blend-mode: multiply para preservar pliegues/costuras/sombras del template;
// 4) apellido y número por SVG absoluto (textLength garantiza que entren SIEMPRE).
const JERSEY_PNG = 'img/carrera/jersey-back.png?v=3';
// ── CAMISETA PIXEL ART (SVG puro) ─────────────────────────────────────────────
// Reemplaza el PNG con mix-blend-mode que arrastraba un cuadrado negro de fondo.
// Se dibuja con la misma grilla de píxeles que el avatar: cero imágenes, cero
// blend modes, fondo 100% transparente en cualquier contexto.
// `kit` es {base, alt, txt, tipo} — lo que devuelve kitClub() o kitDe().
function jerseyKit(size, apellido, numero, kit){
  const k = kit || { base:'#1b7a3e', alt:'#ffffff', txt:'#ffffff', tipo:'solid' };
  const W = 40, H = 40, S = size / W;
  const base = k.base, alt = k.alt || '#ffffff', tipo = k.tipo || 'solid';
  const txt = k.txt || _avContraste(base);
  const dark = _avShade(base,-30), light = _avShade(base,18);
  const px = [];
  const R = (x,y,w,h,c)=>{ if(w<=0||h<=0) return; px.push(`<rect x="${(x*S).toFixed(2)}" y="${(y*S).toFixed(2)}" width="${(w*S).toFixed(2)}" height="${(h*S).toFixed(2)}" fill="${c}"/>`); };
  // Silueta: hombros + mangas + cuerpo (todo con rectángulos, look 8-bit)
  const cuerpoX = 11, cuerpoW = 18, cuerpoY = 9, cuerpoH = 25;
  R(cuerpoX, cuerpoY, cuerpoW, cuerpoH, base);            // cuerpo
  R(5, 9, 6, 10, base);  R(29, 9, 6, 10, base);           // mangas
  R(9, 7, 22, 3, base);                                    // línea de hombros
  // Patrón
  if (tipo === 'stripes'){
    for (let i = 0; i < cuerpoW; i += 6){ R(cuerpoX+i, cuerpoY, 3, cuerpoH, alt); R(cuerpoX+i, 7, 3, 3, alt); }
    R(5, 9, 3, 10, alt); R(32, 9, 3, 10, alt);
  } else if (tipo === 'sash'){
    for (let i = 0; i < cuerpoH; i++){
      const sx = cuerpoX + Math.round(i * (cuerpoW/cuerpoH)) - 4;
      const x0 = Math.max(cuerpoX, sx), x1 = Math.min(cuerpoX+cuerpoW, sx+6);
      if (x1 > x0) R(x0, cuerpoY+i, x1-x0, 1, alt);
    }
  } else if (tipo === 'banda'){
    R(cuerpoX, cuerpoY + Math.round(cuerpoH*0.34), cuerpoW, Math.max(2, Math.round(cuerpoH*0.24)), alt);
    R(5, 9, 3, 4, alt); R(32, 9, 3, 4, alt);
  }
  // Volumen
  R(cuerpoX, cuerpoY, 2, cuerpoH, dark);
  R(cuerpoX+cuerpoW-2, cuerpoY, 2, cuerpoH, dark);
  R(5, 9, 2, 10, dark); R(33, 9, 2, 10, dark);
  R(9, 7, 22, 1, light);
  R(cuerpoX, cuerpoY+cuerpoH-2, cuerpoW, 2, dark);
  R(5, 17, 6, 2, dark); R(29, 17, 6, 2, dark);            // puños
  // Cuello
  R(16, 7, 8, 3, _avShade(base,-52));
  R(17, 7, 6, 2, 'rgba(0,0,0,.28)');
  const ape = String(apellido||'').toUpperCase().slice(0,12);
  const num = String(numero==null?'':numero).slice(0,2);
  const cx = W/2;
  let textos = '';
  if (ape) textos += `<text x="${(cx*S).toFixed(1)}" y="${(15*S).toFixed(1)}" text-anchor="middle" font-family="Outfit,Arial Black,sans-serif" font-weight="900" font-size="${(3.4*S).toFixed(1)}" fill="${txt}" textLength="${(15*S).toFixed(1)}" lengthAdjust="spacingAndGlyphs" style="letter-spacing:.3px;">${esc(ape)}</text>`;
  if (num) textos += `<text x="${(cx*S).toFixed(1)}" y="${(29*S).toFixed(1)}" text-anchor="middle" font-family="Outfit,Arial Black,sans-serif" font-weight="900" font-size="${(13*S).toFixed(1)}" fill="${txt}" style="letter-spacing:-1px;">${esc(num)}</text>`;
  return `<svg viewBox="0 0 ${W*S} ${H*S}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" style="display:block;background:transparent;shape-rendering:crispEdges;overflow:visible;">${px.join('')}${textos}</svg>`;
}
// Compat: firma vieja por país (la usan pantallas antiguas).
function jersey(size, apellido, numero, pais){
  return jerseyKit(size, apellido, numero, kitDe(pais));
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
function save(){
  try{ localStorage.setItem(LS, JSON.stringify(G)); }catch(e){}
  // Los logros se revisan en cada guardado: no hace falta acordarse de llamarlos
  // desde cada evento suelto.
  try{ logrosChequear(); }catch(e){}
}
function load(){
  try{ return sanear(JSON.parse(localStorage.getItem(LS)||'null')); }catch(e){ return null; }
}
// SANEO DE PARTIDAS VIEJAS. El juego fue creciendo y cada tanto se sumó un campo
// nuevo; un save hecho antes no lo tiene, y el código que lo lee sin preguntar
// revienta. Ya pasó con el rival sin estadísticas, que rompía la pantalla de
// retiro entera después de quince temporadas. En vez de poner un guard en cada
// uno de los cincuenta lugares donde se leen, se completan acá una sola vez.
function sanear(g){
  if (!g || typeof g !== 'object') return g;
  const num = (v, d) => (typeof v === 'number' && isFinite(v)) ? v : d;
  g.tot = Object.assign({ pj:0, g:0, a:0 }, g.tot || {});
  g.tot.pj = num(g.tot.pj,0); g.tot.g = num(g.tot.g,0); g.tot.a = num(g.tot.a,0);
  g.familia = g.familia || {};
  g.familia.hijos = g.familia.hijos || [];
  g.familia.nietos = g.familia.nietos || [];
  g.vitrina = g.vitrina || [];
  g.timeline = g.timeline || [];
  g.flags = g.flags || {};
  g.idolatria = g.idolatria || {};
  g.idiomas = g.idiomas || [];
  g.titulos = num(g.titulos, 0);
  g.nivel = num(g.nivel, 60);
  g.dinero = num(g.dinero, 0);
  g.moral = num(g.moral, 60);
  g.fama = num(g.fama, 0);
  if (g.rival){
    g.rival.tot = Object.assign({ pj:0, g:0, a:0 }, g.rival.tot || {});
    g.rival.ganados = num(g.rival.ganados, 0);
    g.rival.perdidos = num(g.rival.perdidos, 0);
    g.rival.nivel = num(g.rival.nivel, 60);
    g.rival.titulos = num(g.rival.titulos, 0);
    g.rival.vitrina = g.rival.vitrina || [];
    g.rival.hist = g.rival.hist || [];
  }
  if (g.gestion){
    g.gestion.plantel = g.gestion.plantel || [];
    g.gestion.titulos = num(g.gestion.titulos, 0);
  }
  if (g.vidaStats) Object.keys(g.vidaStats).forEach(k=>{ g.vidaStats[k] = num(g.vidaStats[k], 50); });
  return g;
}
function overlay(){
  let m=document.getElementById('carrera-modal'); if(m) m.remove();
  m=document.createElement('div'); m.id='carrera-modal';
  // padding-top con safe-area para que el "← Juegos" no quede detrás del status bar.
  m.style.cssText='position:fixed;inset:0;z-index:100060;background:#0a0c0a;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-top:env(safe-area-inset-top, 0px);';
  document.body.appendChild(m);
  montarSalida();
  try { lyObservar(); } catch(e){}
  return m;
}
// ── SALIDA SIEMPRE DISPONIBLE ────────────────────────────────────────────────
// Antes sólo la intro y el hub tenían "volver". Durante toda la creación del
// personaje (identidad → potrero → cantera → juveniles → debut) y en cada
// pantalla de decisión el jugador quedaba encerrado en el modal, sin forma de
// volver al inicio de la app. Ahora el botón vive FUERA del innerHTML de cada
// pantalla, así ninguna re-renderización se lo lleva puesto.
// ── LA X Y EL AÑO SOLO EXISTEN JUGANDO ───────────────────────────────────────
// En la portada convivían la X y el botón "Ir a Canchero": dos formas de salir,
// una encima de la otra, y encima el cartel del año mostraba 2026 cuando todavía
// no habías empezado nada. Ahora aparecen recién cuando arranca el juego.
let LY_JUGANDO = false;
function lyChrome(on){
  LY_JUGANDO = !!on;
  const x = document.getElementById('carrera-exit');
  const a = document.getElementById('carrera-anio');
  if (x) x.style.display = on ? 'flex' : 'none';
  if (a) a.style.display = on ? 'flex' : 'none';
}
function montarSalida(){
  if (document.getElementById('carrera-exit')){ lyChrome(LY_JUGANDO); return; }
  const b = document.createElement('button');
  b.id = 'carrera-exit';
  b.type = 'button';
  b.title = 'Volver';
  b.setAttribute('aria-label', 'Volver');
  // ARRIBA A LA DERECHA, por encima de todo y sin pisar nada: la barra superior de
  // cada pantalla reserva su espacio (ver --ly-gutter) para que la X no tape ni el
  // titulo ni las estadisticas.
  b.style.cssText = 'position:fixed;z-index:100070;top:calc(env(safe-area-inset-top, 0px) + 82px);right:16px;width:32px;height:32px;border-radius:50%;background:rgba(10,12,10,.72);backdrop-filter:blur(6px);border:1px solid #2a3222;color:#9aa294;font-size:17px;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.5);opacity:.85;';
  b.innerHTML = "<i class='bx bx-arrow-back'></i>";
  b.onclick = function(){ window._lyConfirmarSalida(); };
  document.body.appendChild(b);
  // Cartel del AÑO: visible durante todo el juego, pero no antes de empezarlo.
  lyChrome(LY_JUGANDO);   // el año y la edad ya están en la barra de arriba
  // Traductor: a partir de acá cada pantalla se traduce sola al idioma elegido.
  try { lyObservar(); } catch(e){}
}
// ── EL AÑO, SIEMPRE VISIBLE ──────────────────────────────────────────────────
function anioActual(){
  try {
    if (G && G.anio) return G.anio;
    if (typeof _draft !== 'undefined' && _draft && _draft.anio) return _draft.anio;
  } catch(e){}
  return 2026;
}
function montarAnio(){
  if (document.getElementById('carrera-anio')) return;
  const d = document.createElement('div');
  d.id = 'carrera-anio';
  d.style.cssText = 'position:fixed;z-index:100069;top:calc(env(safe-area-inset-top, 0px) + 82px);right:56px;height:32px;display:flex;align-items:center;padding:0 10px;border-radius:16px;background:rgba(10,12,10,.72);backdrop-filter:blur(6px);border:1px solid #2a3222;color:#baff00;font-size:12px;font-weight:900;letter-spacing:1px;pointer-events:none;box-shadow:0 2px 10px rgba(0,0,0,.5);';
  document.body.appendChild(d);
  refrescarAnio();
  clearInterval(window._lyAnioT);
  window._lyAnioT = setInterval(refrescarAnio, 700);
}
function refrescarAnio(){
  const d = document.getElementById('carrera-anio'); if(!d) return;
  const a = anioActual();
  // La EDAD viaja junto al año: se lee de un vistazo en qué momento de la vida está.
  const ed = edadActual();
  const txt = String(a) + (ed ? ' · ' + ed + 'a' : '') + (epocaEtiqueta(a) ? ' · ' + epocaEtiqueta(a) : '');
  if (d.textContent !== txt) d.textContent = txt;
}
// Edad vigente según la etapa (carrera o vida post-retiro).
function edadActual(){
  try {
    if (typeof VJ !== 'undefined' && VJ && VJ.mundo === 'vida' && G && G.vidaEdad) return G.vidaEdad;
    if (G && G.edad) return G.edad;
  } catch(e){}
  return 0;
}
// Nombre corto de la era tecnologica: se nota que el mundo avanza.
function epocaEtiqueta(a){
  a = a || anioActual();
  return a >= 2075 ? 'ERA ORBITAL' : a >= 2062 ? 'ERA ROBOT' : a >= 2048 ? 'ERA HOLO' : a >= 2035 ? 'ERA DIGITAL' : '';
}
// Cierra el juego y devuelve al usuario a donde estaba la app. Funciona igual
// esté registrado o no: si la pestaña de Juegos existe se vuelve ahí, y si no
// (usuario anónimo en la landing) simplemente se destapa el home.
// ¿Estamos en leyenda.html (página propia) o dentro de la app grande?
function esStandalone(){ return !!window.CANCHERO_LEYENDA_STANDALONE; }
window._carreraSalir = function(){
  try { vjDetener(); } catch(e){}
  try { window._lyAuto(false); } catch(e){}   // el automático no sobrevive a salir
  try { if (G) save(); } catch(e){}
  // En la página propia no hay app detrás: salir del juego es volver a SU portada,
  // no dejar la pantalla en negro.
  if (esStandalone()){
    document.getElementById('carrera-exit')?.remove(); document.getElementById('carrera-anio')?.remove(); clearInterval(window._lyAnioT);
    window._carreraStart();
    return;
  }
  document.getElementById('carrera-modal')?.remove();
  document.getElementById('carrera-exit')?.remove(); document.getElementById('carrera-anio')?.remove(); clearInterval(window._lyAnioT);
  const vj = document.getElementById('view-jugador');
  const logueado = vj && getComputedStyle(vj).display !== 'none';
  if (logueado && window.openGamesModal) { try { window.openGamesModal(); } catch(e){} }
  else { document.getElementById('games-hub')?.remove(); try { window.scrollTo(0,0); } catch(e){} }
};

// ── INTRO ───────────────────────────────────────────────────────────────────────
window._carreraStart = function(){
  lyChrome(false);
  const m=overlay(); const saved=load();
  // Primera vez que alguien abre el juego: se le explica antes de tirarlo adentro.
  // (el tutorial ya no se abre solo: está en 'Cómo se juega')
  m.innerHTML=`
  <div style="position:relative;min-height:100%;background:#0a0c0a;">
    <!-- Fondo del juego (Maradona/Pelé/Messi/Ronaldinho/CR7): tapa toda la intro con
         opacidad para que el texto sea legible, y funde a negro abajo. -->
    <div style="position:absolute;inset:0;background:url('img/carrera/fondo-intro.webp?v=1') center/cover no-repeat;opacity:.42;pointer-events:none;"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(180deg, rgba(10,12,10,.35) 0%, rgba(10,12,10,.55) 55%, #0a0c0a 100%);pointer-events:none;"></div>
    <div style="position:absolute;inset:0;background:repeating-linear-gradient(90deg, rgba(186,255,0,.03) 0 2px, transparent 2px 40px);pointer-events:none;"></div>
    <div style="position:relative;max-width:560px;margin:0 auto;padding:20px 20px calc(30px + env(safe-area-inset-bottom));min-height:100%;display:flex;flex-direction:column;align-items:center;text-align:center;">
      <div class="cg-back-wrap">${esStandalone()
        ? `<a class="cg-back" href="index.html" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;"><i class='bx bx-arrow-back'></i> Ir a Canchero</a>`
        : `<button class="cg-back" onclick="window._carreraSalir()"><i class='bx bx-arrow-back'></i> Juegos</button>`}</div>
      <div style="font-size:12px;font-weight:900;letter-spacing:5px;color:${A};margin-top:26px;text-shadow:0 0 18px rgba(186,255,0,.5);">MODO CARRERA</div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:46px;line-height:1;color:#fff;margin-top:4px;letter-spacing:-1px;text-shadow:0 4px 30px rgba(0,0,0,.7);">CANCHERO<br><span style="color:${A};">LEYENDA</span></div>
      <div style="font-size:14px;color:#c4ccc0;margin-top:14px;max-width:360px;line-height:1.55;">Del potrero a la gloria. Naciste en un barrio cualquiera; tus decisiones —dentro y fuera de la cancha— escriben tu historia. ¿Llegás a leyenda?</div>
      <div style="width:100%;max-width:360px;margin-top:26px;">
        ${saved?`<button onclick="window._continuarPartida()" style="width:100%;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:15px;padding:16px;font-family:Outfit,sans-serif;font-weight:900;font-size:16px;cursor:pointer;box-shadow:0 10px 30px rgba(80,220,110,.32);"><i class='bx bx-play-circle'></i> CONTINUAR — ${esc(saved.apellido||'')} (${saved.edad})</button>`:''}
        <button onclick="window._carreraLen()" style="width:100%;margin-top:10px;background:${saved?'rgba(255,255,255,.06)':'linear-gradient(135deg,#16a34a,'+A+')'};color:${saved?'#fff':'#000'};border:${saved?'1px solid #2a2a2a':'none'};border-radius:15px;padding:16px;font-family:Outfit,sans-serif;font-weight:900;font-size:16px;cursor:pointer;${saved?'':'box-shadow:0 10px 30px rgba(80,220,110,.32);'}">${saved?'Nueva carrera':'EMPEZAR MI CARRERA'}</button>
        <button onclick="window._carreraRanking()" style="width:100%;margin-top:10px;background:rgba(255,255,255,.05);color:#fff;border:1px solid #242424;border-radius:15px;padding:14px;font-weight:800;font-size:14px;cursor:pointer;"><i class='bx bx-bar-chart-alt-2' style="color:${A};"></i> Ranking de leyendas</button>
        <button onclick="window._leyendaLogros()" style="width:100%;margin-top:10px;background:rgba(255,255,255,.05);color:#fff;border:1px solid #242424;border-radius:15px;padding:14px;font-weight:800;font-size:14px;cursor:pointer;"><i class='bx bx-medal' style="color:${A};"></i> Tus logros${haySesion()?'':' <span style="font-size:11px;color:#7d879a;">(iniciá sesión para guardarlos)</span>'}</button>
        <button onclick="window._lyComoSeJuega()" style="width:100%;margin-top:10px;background:rgba(255,255,255,.05);color:#fff;border:1px solid #242424;border-radius:15px;padding:14px;font-weight:800;font-size:14px;cursor:pointer;"><i class='bx bx-help-circle' style="color:${A};"></i> Cómo se juega</button>
        <button onclick="window._lyElegirIdioma()" style="width:100%;margin-top:10px;background:rgba(255,255,255,.04);color:#c4ccc0;border:1px solid #242424;border-radius:15px;padding:12px;font-weight:800;font-size:13px;cursor:pointer;"><i class='bx bx-globe' style="color:${A};"></i> Idioma: ${esc((LY_IDIOMAS.find(x=>x.id===LY_LANG)||LY_IDIOMAS[0]).n)}</button>
      </div>
    </div>
  </div>`;
};
// ── CÓMO SE JUEGA ────────────────────────────────────────────────────────────
// La primera partida se entendia a los tropezones: no quedaba claro que se
// camina, que las decisiones son el juego, ni que la vida sigue tras el retiro.
// Esto se muestra solo la primera vez, y despues queda a mano desde la portada.
const LY_VISTO_TUTO = 'canchero_leyenda_tuto_v1';
function tutoVisto(){ try { return localStorage.getItem(LY_VISTO_TUTO) === '1'; } catch(e){ return false; } }
function tutoMarcar(){ try { localStorage.setItem(LY_VISTO_TUTO, '1'); } catch(e){} }
const LY_TUTO_PASOS = [
  { i:'bx-walk',        t:'Caminás vos',
    d:'No es un menú: tu jugador camina por el barrio, el club y tu casa. Flechas o A/D en la compu, botones o tocando el piso en el celu. Si lo soltás, se maneja solo.' },
  { i:'bx-conversation',t:'Todo pasa hablando',
    d:'Acercate a la gente y tocá el botón de acción. Los personajes te cuentan cosas, te ofrecen negocios y te traen problemas. Podés escribirles lo que quieras y te contestan.' },
  { i:'bx-git-branch',  t:'Las decisiones son el juego',
    d:'Cada temporada te llegan decisiones: fichar, quedarte, pelearte, cuidar a tu familia. No hay opción correcta — hay consecuencias, y quedan para siempre.' },
  { i:'bx-time-five',   t:'La vida no termina al retirarte',
    d:'Después de colgar los botines elegís qué hacer: DT, comentarista, dirigente, empresario, escuela o vida tranquila. Y cuando se te acaba el tiempo, tu nieto toma la posta.' }
];
window._lyComoSeJuega = function(paso){
  lyChrome(false);
  paso = paso || 0;
  const P = LY_TUTO_PASOS[paso]; if(!P){ tutoMarcar(); window._carreraStart(); return; }
  const ultimo = paso === LY_TUTO_PASOS.length - 1;
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="min-height:100%;background:radial-gradient(120% 80% at 50% 0%, #16200e 0%, #0a0c0a 60%);display:flex;flex-direction:column;">
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:34px 24px;max-width:460px;margin:0 auto;">
      <div style="width:82px;height:82px;border-radius:50%;background:rgba(186,255,0,.1);border:2px solid ${A}55;display:flex;align-items:center;justify-content:center;margin-bottom:22px;">
        <i class='bx ${P.i}' style="font-size:40px;color:${A};"></i>
      </div>
      <div style="font-size:10px;font-weight:900;letter-spacing:2.6px;color:${A};margin-bottom:11px;">PASO ${paso+1} DE ${LY_TUTO_PASOS.length}</div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:27px;color:#fff;line-height:1.15;margin-bottom:13px;">${P.t}</div>
      <div style="font-size:14.5px;color:#b9c4ad;line-height:1.65;">${P.d}</div>
      <div style="display:flex;gap:7px;margin-top:26px;">
        ${LY_TUTO_PASOS.map((_,i)=>`<div style="width:${i===paso?22:7}px;height:7px;border-radius:4px;background:${i===paso?A:'rgba(255,255,255,.18)'};transition:.2s;"></div>`).join('')}
      </div>
    </div>
    <div style="max-width:460px;margin:0 auto;width:100%;padding:0 24px calc(30px + env(safe-area-inset-bottom));box-sizing:border-box;display:flex;gap:9px;">
      <button onclick="${paso===0?'window._lyTutoSalir()':`window._lyComoSeJuega(${paso-1})`}" style="background:rgba(255,255,255,.05);border:1px solid #2a3222;color:#cfd8c6;border-radius:14px;padding:15px 20px;font-weight:900;font-size:14px;cursor:pointer;">${paso===0?'Saltar':'Atrás'}</button>
      <button onclick="${ultimo?'window._lyTutoSalir()':`window._lyComoSeJuega(${paso+1})`}" style="flex:1;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:14px;padding:15px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;">${ultimo?'¡Dale, a jugar!':'Siguiente'} <i class='bx bx-right-arrow-alt'></i></button>
    </div>
  </div>`;
};
window._lyTutoSalir = function(){ tutoMarcar(); window._carreraStart(); };
// Elegiste "solo la carrera" pero al final te dieron ganas de seguir: se puede.
window._lySeguirVida = function(){
  if(!G) return;
  G.alcance = 'todo';
  save();
  retiro();
};


// ══════════════════════════════════════════════════════════════════════════════
// LOGROS
// Se desbloquean solos mientras jugás y quedan guardados en el navegador. Si
// además iniciaste sesión en Canchero, se sincronizan con tu cuenta y los ves
// desde cualquier dispositivo (tabla `leyenda_logros`).
// ══════════════════════════════════════════════════════════════════════════════
const LOGROS = [
  { id:'debut',      n:'Debut oficial',        d:'Jugaste tu primer partido como profesional.', i:'bx-football',   c:g=>!!g && (g.temporada||0) >= 1 },
  { id:'primergol',  n:'El primero de muchos', d:'Convertiste tu primer gol.',                  i:'bx-target-lock',c:g=>!!g && ((g.tot&&g.tot.g)||0) >= 1 },
  { id:'campeon',    n:'Campeón',              d:'Ganaste tu primer título.',                    i:'bx-trophy',     c:g=>!!g && (g.titulos||0) >= 1 },
  { id:'tricampeon', n:'Tricampeón',           d:'Ganaste tres títulos en una misma carrera.',   i:'bx-crown',      c:g=>!!g && (g.titulos||0) >= 3 },
  { id:'nivel90',    n:'Clase mundial',        d:'Llegaste a nivel 90.',                         i:'bx-star',       c:g=>!!g && (g.nivelMax||g.nivel||0) >= 90 },
  { id:'seleccion',  n:'La celeste (o la tuya)',d:'Te convocaron a la selección.',               i:'bx-world',      c:g=>!!g && !!g.jugoSeleccion },
  { id:'europa',     n:'Cruzar el charco',     d:'Jugaste en una liga europea.',                 i:'bx-plane',      c:g=>!!g && ligaNivel(g.liga||'') >= 14 },
  { id:'millonario', n:'Millonario',           d:'Juntaste un millón.',                          i:'bx-dollar',     c:g=>!!g && (g.dinero||0) >= 1000000 },
  { id:'familia',    n:'Formaste una familia', d:'Tuviste tu primer hijo.',                      i:'bx-home-heart', c:g=>!!g && (((g.familia||{}).hijos)||[]).length >= 1 },
  { id:'abuelo',     n:'Abuelo',               d:'Conociste a tus nietos.',                      i:'bx-child',      c:g=>!!g && (((g.familia||{}).nietos)||[]).length >= 1 },
  { id:'retiro',     n:'Colgar los botines',   d:'Llegaste al retiro jugando.',                  i:'bx-medal',      c:g=>!!g && !!g.retirado },
  { id:'segundavida',n:'Segunda vida',         d:'Elegiste qué hacer después del fútbol.',       i:'bx-briefcase',  c:g=>!!g && !!g.vidaRol },
  { id:'dtcampeon',  n:'Campeón desde el banco',d:'Ganaste un título como DT.',                  i:'bx-clipboard',  c:g=>!!g && !!(g.gestion && (g.gestion.titulos||0) >= 1) },
  { id:'seleccionDT',n:'Dirigir a tu país',    d:'Dirigiste a la selección.',                    i:'bx-flag',       c:g=>!!g && !!(g.gestion && g.gestion.esSeleccion) },
  { id:'legado',     n:'El legado',            d:'Seguiste la historia con un hijo o un nieto.', i:'bx-git-branch', c:g=>!!g && !!g.legado },
  { id:'superado',   n:'Mejor que el abuelo',  d:'Superaste al ancestro de tu apellido.',        i:'bx-trending-up',c:g=>!!g && !!g._legadoSuperado },
  { id:'gen3',       n:'Tercera generación',   d:'Llegaste a la tercera generación del apellido.',i:'bx-network-chart', c:g=>!!g && !!(g.legado && (g.legado.gen||1) >= 3) },
  { id:'futuro',     n:'Vi el futuro',         d:'Llegaste a un año con robots en la calle.',    i:'bx-chip',       c:g=>!!g && (g.anio||2026) >= 2062 },
  { id:'espacio',    n:'Fútbol en órbita',     d:'Jugaste un partido fuera del planeta.',        i:'bx-rocket',     c:g=>!!g && !!(g.flags && g.flags.espacio) },
  { id:'mundial',    n:'Campeón del mundo',    d:'Ganaste un Mundial (jugando o dirigiendo).',   i:'bx-globe',      c:g=>!!g && !!(g._vidaFlags && g._vidaFlags.campeonMundo) }
];
const LOGROS_LS = 'canchero_leyenda_logros';
function logrosLeer(){
  try { return JSON.parse(localStorage.getItem(LOGROS_LS) || '{}') || {}; } catch(e){ return {}; }
}
function logrosGuardar(o){ try { localStorage.setItem(LOGROS_LS, JSON.stringify(o)); } catch(e){} }
// Revisa TODOS los logros y avisa de los nuevos. Se llama al guardar la partida.
function logrosChequear(){
  if(!G) return;
  const tengo = logrosLeer();
  const nuevos = [];
  LOGROS.forEach(L=>{
    if (tengo[L.id]) return;
    let ok = false; try { ok = !!L.c(G); } catch(e){}
    if (ok){ tengo[L.id] = { fecha: Date.now(), anio: G.anio || null }; nuevos.push(L); }
  });
  if (nuevos.length){
    logrosGuardar(tengo);
    logrosSubir(tengo);
    try { vjFlash('LOGRO: ' + nuevos[0].n + (nuevos.length>1 ? ' (+' + (nuevos.length-1) + ' más)' : '')); } catch(e){}
  }
}
// Con sesión iniciada, los logros viajan con la cuenta.
async function logrosSubir(tengo){
  try{
    const c = window._sb, u = me();
    if(!c || !u || !u.email) return;
    await c.from('leyenda_logros').upsert({
      email: u.email, name: (u.name || u.email.split('@')[0]),
      logros: tengo, total: Object.keys(tengo).length,
      updated_at: new Date().toISOString()
    }, { onConflict:'email' });
  }catch(e){ /* sin conexión, los logros quedan igual en el dispositivo */ }
}
async function logrosBajar(){
  try{
    const c = window._sb, u = me();
    if(!c || !u || !u.email) return null;
    const { data } = await c.from('leyenda_logros').select('logros').eq('email', u.email).maybeSingle();
    if (data && data.logros){
      const local = logrosLeer();
      const unido = Object.assign({}, data.logros, local);
      logrosGuardar(unido);
      return unido;
    }
  }catch(e){}
  return null;
}
// ¿Hay sesión iniciada? La app grande deja el usuario en window.userData.
function haySesion(){ const u = me(); return !!(u && u.email); }
window._leyendaLogros = async function(){
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `<div style="max-width:520px;margin:0 auto;padding:60px 18px;text-align:center;color:#666;"><i class='bx bx-loader-alt bx-spin' style="font-size:30px;color:${A};"></i></div>`;
  if (haySesion()) await logrosBajar();
  const tengo = logrosLeer();
  const n = Object.keys(tengo).length;
  m.innerHTML = `
  <div style="max-width:540px;margin:0 auto;padding:52px 18px calc(30px + env(safe-area-inset-bottom));min-height:100%;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
      <button onclick="window._carreraStart()" style="background:rgba(255,255,255,.06);border:none;color:#aaa;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;"><i class='bx bx-arrow-back'></i></button>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:20px;color:#fff;">Tus logros</div>
    </div>
    <div style="font-size:12px;color:#8a9280;margin:0 0 14px 44px;">${n} de ${LOGROS.length} conseguidos${haySesion() ? ' · sincronizados con tu cuenta' : ' · guardados en este dispositivo'}</div>
    ${!haySesion() ? `<div style="background:rgba(125,211,252,.08);border:1px solid rgba(125,211,252,.3);color:#7dd3fc;border-radius:13px;padding:12px;font-size:12.5px;line-height:1.5;margin-bottom:14px;">Iniciá sesión en Canchero para que tus logros te sigan a cualquier dispositivo.</div>` : ''}
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${LOGROS.map(L=>{ const on = !!tengo[L.id]; return `
        <div style="display:flex;align-items:center;gap:12px;background:${on?'rgba(186,255,0,.08)':'rgba(255,255,255,.03)'};border:1px solid ${on?'rgba(186,255,0,.35)':'#1e2632'};border-radius:13px;padding:12px;opacity:${on?1:.55};">
          <i class='bx ${on?L.i:'bx-lock-alt'}' style="font-size:24px;color:${on?A:'#5d6879'};flex-shrink:0;"></i>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13.5px;font-weight:900;color:${on?'#fff':'#8a9280'};">${esc(L.n)}</div>
            <div style="font-size:11.5px;color:#8a9280;line-height:1.4;">${esc(L.d)}</div>
          </div>
          ${on && tengo[L.id].anio ? `<span style="font-size:10px;font-weight:900;color:${A};">${tengo[L.id].anio}</span>` : ''}
        </div>`; }).join('')}
    </div>
  </div>`;
};


// ══════════════════════════════════════════════════════════════════════════════
// IDIOMAS
// El juego se puede jugar en español (por defecto), inglés, portugués, francés e
// italiano. Se elige al entrar y queda guardado.
//
// CÓMO FUNCIONA: cada pantalla se dibuja en español y, justo después de pintarse,
// un traductor recorre el DOM y reemplaza los textos. Primero busca la frase
// completa en el diccionario; si no está, aplica un glosario de términos del
// juego (club, temporada, nivel, títulos...). Así no hubo que tocar ni una de las
// miles de líneas de texto ya escritas y cualquier frase nueva queda traducida en
// cuanto se agrega su entrada al diccionario.
// ══════════════════════════════════════════════════════════════════════════════
const LY_IDIOMAS = [
  { id:'es', n:'Español',    f:'uy' },
  { id:'en', n:'English',    f:'gb' },
  { id:'pt', n:'Português',  f:'br' },
  { id:'fr', n:'Français',   f:'fr' },
  { id:'it', n:'Italiano',   f:'it' }
];
const LY_LANG_LS = 'canchero_leyenda_idioma';
let LY_LANG = 'es';
try { LY_LANG = localStorage.getItem(LY_LANG_LS) || 'es'; } catch(e){}

// Frases completas. Clave = el texto tal cual aparece en español.
const LY_DIC = {
  en: {
    'MODO CARRERA':'CAREER MODE',
    'Del potrero a la gloria. Naciste en un barrio cualquiera; tus decisiones —dentro y fuera de la cancha— escriben tu historia. ¿Llegás a leyenda?':'From the dirt pitch to glory. You were born in any old neighbourhood; your decisions — on and off the pitch — write your story. Can you become a legend?',
    'Nueva carrera':'New career','EMPEZAR MI CARRERA':'START MY CAREER',
    'Ranking de leyendas':'Legends ranking','Tus logros':'Your achievements','Idioma':'Language',
    '¿QUÉ HACÉS?':'WHAT DO YOU DO?','IR A OTRO LADO':'GO SOMEWHERE ELSE',
    'ESTE TRAMO DE TU VIDA':'THIS STRETCH OF YOUR LIFE','DECISIÓN':'DECISION',
    'Tu casa':'Your home','El barrio':'The neighbourhood','Tu laburo':'Your job','Tu lugar':'Your place',
    'El baldío':'The empty lot','Tu cuadra':'Your block','La pensión':'The boarding house','El predio':'The training ground',
    'El vestuario':'The dressing room','La cancha':'The pitch','La oficina':'The office',
    'Ver fútbol':'Watch football','Ropero — cambiarte':'Wardrobe — get changed','Espejo — cambiar tu look':'Mirror — change your look',
    'Descansar un poco':'Rest a little','Ponerte a laburar':'Get to work','Tomarte un rato':'Take a break',
    'Dormir y pasar 5 años':'Sleep and skip 5 years','IR A CASA A DORMIR Y PASAR 5 AÑOS':'GO HOME TO SLEEP AND SKIP 5 YEARS',
    'PASARON CINCO AÑOS':'FIVE YEARS WENT BY','SEGUIR VIVIENDO':'KEEP LIVING','VOLVER':'BACK','LISTO':'DONE',
    'años':'years old','Cortar la charla':'End the conversation','Escribí acá...':'Type here...',
    'Escribile lo que quieras. Te va a contestar según quién es, qué le dijiste y cómo venís vos.':'Write whatever you want. They will answer based on who they are, what you said and how you are doing.',
    'Dejarlo para después':'Leave it for later','FRENTE AL ESPEJO':'IN FRONT OF THE MIRROR',
    'PEINADO':'HAIRSTYLE','COLOR DE PELO':'HAIR COLOUR','BARBA':'BEARD','TATUAJES':'TATTOOS','ACCESORIO':'ACCESSORY',
    'TU ROPERO':'YOUR WARDROBE','¿Cómo te vestís hoy?':'How do you dress today?',
    'EL LEGADO':'THE LEGACY','GENERACIÓN 2':'GENERATION 2','EMPEZAR MI PROPIO CAMINO':'START MY OWN PATH',
    'SEGUIR EL LEGADO CON TU HIJO':'CONTINUE THE LEGACY WITH YOUR CHILD','No, ver el resumen de mi vida':'No, show my life summary',
    'Tu historia terminó.':'Your story is over.','La de ellos empieza.':'Theirs begins.',
    'PONER':'SET','Escribí el nombre...':'Type the name...','Es nena':'It is a girl','Es varón':'It is a boy',
    'El nombre queda para toda la partida.':'The name stays for the whole game.',
    'CONVOCATORIA':'CALL-UP','Salir del juego':'Exit the game','Confirmar identidad':'Confirm identity',
    'Definí tu jugador':'Define your player','APELLIDO':'SURNAME','PIERNA':'FOOT',
    'tu pareja':'your partner','tu hijo':'your son','tu hija':'your daughter','tu nieto':'your grandson','tu nieta':'your granddaughter',
    'vecino':'neighbour','médico':'doctor','hincha':'supporter','capitán':'captain','representante':'agent','veterano':'veteran',
    'ERA DIGITAL':'DIGITAL ERA','ERA HOLO':'HOLO ERA','ERA ROBOT':'ROBOT ERA','ERA ORBITAL':'ORBITAL ERA'
  },
  pt: {
    'MODO CARRERA':'MODO CARREIRA',
    'Del potrero a la gloria. Naciste en un barrio cualquiera; tus decisiones —dentro y fuera de la cancha— escriben tu historia. ¿Llegás a leyenda?':'Do campinho à glória. Você nasceu num bairro qualquer; suas decisões — dentro e fora de campo — escrevem sua história. Vira lenda?',
    'Nueva carrera':'Nova carreira','EMPEZAR MI CARRERA':'COMEÇAR MINHA CARREIRA',
    'Ranking de leyendas':'Ranking de lendas','Tus logros':'Suas conquistas','Idioma':'Idioma',
    '¿QUÉ HACÉS?':'O QUE VOCÊ FAZ?','IR A OTRO LADO':'IR PARA OUTRO LUGAR',
    'ESTE TRAMO DE TU VIDA':'ESTA FASE DA SUA VIDA','DECISIÓN':'DECISÃO',
    'Tu casa':'Sua casa','El barrio':'O bairro','Tu laburo':'Seu trabalho','Tu lugar':'Seu lugar',
    'El baldío':'O terreno baldio','Tu cuadra':'Sua rua','La pensión':'A pensão','El predio':'O centro de treinamento',
    'El vestuario':'O vestiário','La cancha':'O campo','La oficina':'O escritório',
    'Ver fútbol':'Ver futebol','Ropero — cambiarte':'Guarda-roupa — trocar de roupa','Espejo — cambiar tu look':'Espelho — mudar o visual',
    'Descansar un poco':'Descansar um pouco','Ponerte a laburar':'Ir trabalhar','Tomarte un rato':'Tirar um tempo',
    'Dormir y pasar 5 años':'Dormir e pular 5 anos','IR A CASA A DORMIR Y PASAR 5 AÑOS':'IR PARA CASA DORMIR E PULAR 5 ANOS',
    'PASARON CINCO AÑOS':'PASSARAM CINCO ANOS','SEGUIR VIVIENDO':'CONTINUAR VIVENDO','VOLVER':'VOLTAR','LISTO':'PRONTO',
    'años':'anos','Cortar la charla':'Encerrar a conversa','Escribí acá...':'Escreva aqui...',
    'Escribile lo que quieras. Te va a contestar según quién es, qué le dijiste y cómo venís vos.':'Escreva o que quiser. A resposta depende de quem é a pessoa, do que você disse e de como você está.',
    'Dejarlo para después':'Deixar para depois','FRENTE AL ESPEJO':'DIANTE DO ESPELHO',
    'PEINADO':'CORTE DE CABELO','COLOR DE PELO':'COR DO CABELO','BARBA':'BARBA','TATUAJES':'TATUAGENS','ACCESORIO':'ACESSÓRIO',
    'TU ROPERO':'SEU GUARDA-ROUPA','¿Cómo te vestís hoy?':'Como você se veste hoje?',
    'EL LEGADO':'O LEGADO','GENERACIÓN 2':'GERAÇÃO 2','EMPEZAR MI PROPIO CAMINO':'COMEÇAR MEU PRÓPRIO CAMINHO',
    'SEGUIR EL LEGADO CON TU HIJO':'SEGUIR O LEGADO COM SEU FILHO','No, ver el resumen de mi vida':'Não, ver o resumo da minha vida',
    'Tu historia terminó.':'Sua história acabou.','La de ellos empieza.':'A deles começa.',
    'PONER':'DEFINIR','Escribí el nombre...':'Escreva o nome...','Es nena':'É menina','Es varón':'É menino',
    'El nombre queda para toda la partida.':'O nome fica para a partida inteira.',
    'CONVOCATORIA':'CONVOCAÇÃO','Salir del juego':'Sair do jogo','Confirmar identidad':'Confirmar identidade',
    'Definí tu jugador':'Defina seu jogador','APELLIDO':'SOBRENOME','PIERNA':'PERNA',
    'tu pareja':'seu par','tu hijo':'seu filho','tu hija':'sua filha','tu nieto':'seu neto','tu nieta':'sua neta',
    'vecino':'vizinho','médico':'médico','hincha':'torcedor','capitán':'capitão','representante':'empresário','veterano':'veterano',
    'ERA DIGITAL':'ERA DIGITAL','ERA HOLO':'ERA HOLO','ERA ROBOT':'ERA ROBÔ','ERA ORBITAL':'ERA ORBITAL'
  },
  fr: {
    'MODO CARRERA':'MODE CARRIÈRE',
    'Del potrero a la gloria. Naciste en un barrio cualquiera; tus decisiones —dentro y fuera de la cancha— escriben tu historia. ¿Llegás a leyenda?':"Du terrain vague à la gloire. Tu es né dans un quartier ordinaire ; tes décisions — sur et en dehors du terrain — écrivent ton histoire. Deviendras-tu une légende ?",
    'Nueva carrera':'Nouvelle carrière','EMPEZAR MI CARRERA':'COMMENCER MA CARRIÈRE',
    'Ranking de leyendas':'Classement des légendes','Tus logros':'Tes succès','Idioma':'Langue',
    '¿QUÉ HACÉS?':'QUE FAIS-TU ?','IR A OTRO LADO':'ALLER AILLEURS',
    'ESTE TRAMO DE TU VIDA':'CETTE ÉTAPE DE TA VIE','DECISIÓN':'DÉCISION',
    'Tu casa':'Chez toi','El barrio':'Le quartier','Tu laburo':'Ton boulot','Tu lugar':'Ton endroit',
    'El baldío':'Le terrain vague','Tu cuadra':'Ta rue','La pensión':'La pension','El predio':'Le centre d’entraînement',
    'El vestuario':'Le vestiaire','La cancha':'Le terrain','La oficina':'Le bureau',
    'Ver fútbol':'Regarder du foot','Ropero — cambiarte':'Armoire — te changer','Espejo — cambiar tu look':'Miroir — changer de look',
    'Descansar un poco':'Te reposer un peu','Ponerte a laburar':'Te mettre au travail','Tomarte un rato':'Prendre une pause',
    'Dormir y pasar 5 años':'Dormir et passer 5 ans','IR A CASA A DORMIR Y PASAR 5 AÑOS':'RENTRER DORMIR ET PASSER 5 ANS',
    'PASARON CINCO AÑOS':'CINQ ANS ONT PASSÉ','SEGUIR VIVIENDO':'CONTINUER À VIVRE','VOLVER':'RETOUR','LISTO':'TERMINÉ',
    'años':'ans','Cortar la charla':'Terminer la discussion','Escribí acá...':'Écris ici...',
    'Escribile lo que quieras. Te va a contestar según quién es, qué le dijiste y cómo venís vos.':"Écris ce que tu veux. La réponse dépend de qui il est, de ce que tu as dit et de comment tu vas.",
    'Dejarlo para después':'Laisser pour plus tard','FRENTE AL ESPEJO':'DEVANT LE MIROIR',
    'PEINADO':'COIFFURE','COLOR DE PELO':'COULEUR DE CHEVEUX','BARBA':'BARBE','TATUAJES':'TATOUAGES','ACCESORIO':'ACCESSOIRE',
    'TU ROPERO':'TON ARMOIRE','¿Cómo te vestís hoy?':"Comment t’habilles-tu aujourd’hui ?",
    'EL LEGADO':'L’HÉRITAGE','GENERACIÓN 2':'GÉNÉRATION 2','EMPEZAR MI PROPIO CAMINO':'COMMENCER MON PROPRE CHEMIN',
    'SEGUIR EL LEGADO CON TU HIJO':'POURSUIVRE L’HÉRITAGE AVEC TON ENFANT','No, ver el resumen de mi vida':'Non, voir le résumé de ma vie',
    'Tu historia terminó.':'Ton histoire est finie.','La de ellos empieza.':'La leur commence.',
    'PONER':'VALIDER','Escribí el nombre...':'Écris le prénom...','Es nena':'C’est une fille','Es varón':'C’est un garçon',
    'El nombre queda para toda la partida.':'Le prénom reste pour toute la partie.',
    'CONVOCATORIA':'SÉLECTION','Salir del juego':'Quitter le jeu','Confirmar identidad':'Confirmer l’identité',
    'Definí tu jugador':'Définis ton joueur','APELLIDO':'NOM','PIERNA':'PIED',
    'tu pareja':'ton/ta partenaire','tu hijo':'ton fils','tu hija':'ta fille','tu nieto':'ton petit-fils','tu nieta':'ta petite-fille',
    'vecino':'voisin','médico':'médecin','hincha':'supporter','capitán':'capitaine','representante':'agent','veterano':'vétéran',
    'ERA DIGITAL':'ÈRE NUMÉRIQUE','ERA HOLO':'ÈRE HOLO','ERA ROBOT':'ÈRE ROBOT','ERA ORBITAL':'ÈRE ORBITALE'
  },
  it: {
    'MODO CARRERA':'MODALITÀ CARRIERA',
    'Del potrero a la gloria. Naciste en un barrio cualquiera; tus decisiones —dentro y fuera de la cancha— escriben tu historia. ¿Llegás a leyenda?':'Dal campetto alla gloria. Sei nato in un quartiere qualunque; le tue scelte — dentro e fuori dal campo — scrivono la tua storia. Diventerai una leggenda?',
    'Nueva carrera':'Nuova carriera','EMPEZAR MI CARRERA':'INIZIA LA MIA CARRIERA',
    'Ranking de leyendas':'Classifica delle leggende','Tus logros':'I tuoi obiettivi','Idioma':'Lingua',
    '¿QUÉ HACÉS?':'COSA FAI?','IR A OTRO LADO':'ANDARE ALTROVE',
    'ESTE TRAMO DE TU VIDA':'QUESTA FASE DELLA TUA VITA','DECISIÓN':'DECISIONE',
    'Tu casa':'Casa tua','El barrio':'Il quartiere','Tu laburo':'Il tuo lavoro','Tu lugar':'Il tuo posto',
    'El baldío':'Il campetto','Tu cuadra':'Il tuo isolato','La pensión':'Il convitto','El predio':'Il centro sportivo',
    'El vestuario':'Lo spogliatoio','La cancha':'Il campo','La oficina':'L’ufficio',
    'Ver fútbol':'Guardare il calcio','Ropero — cambiarte':'Armadio — cambiarti','Espejo — cambiar tu look':'Specchio — cambiare look',
    'Descansar un poco':'Riposare un po’','Ponerte a laburar':'Metterti a lavorare','Tomarte un rato':'Prenderti una pausa',
    'Dormir y pasar 5 años':'Dormire e saltare 5 anni','IR A CASA A DORMIR Y PASAR 5 AÑOS':'TORNARE A CASA A DORMIRE E SALTARE 5 ANNI',
    'PASARON CINCO AÑOS':'SONO PASSATI CINQUE ANNI','SEGUIR VIVIENDO':'CONTINUARE A VIVERE','VOLVER':'INDIETRO','LISTO':'FATTO',
    'años':'anni','Cortar la charla':'Chiudere la conversazione','Escribí acá...':'Scrivi qui...',
    'Escribile lo que quieras. Te va a contestar según quién es, qué le dijiste y cómo venís vos.':'Scrivi quello che vuoi. Ti risponderà in base a chi è, a cosa gli hai detto e a come stai tu.',
    'Dejarlo para después':'Lasciare a dopo','FRENTE AL ESPEJO':'DAVANTI ALLO SPECCHIO',
    'PEINADO':'PETTINATURA','COLOR DE PELO':'COLORE DI CAPELLI','BARBA':'BARBA','TATUAJES':'TATUAGGI','ACCESORIO':'ACCESSORIO',
    'TU ROPERO':'IL TUO ARMADIO','¿Cómo te vestís hoy?':'Come ti vesti oggi?',
    'EL LEGADO':'L’EREDITÀ','GENERACIÓN 2':'GENERAZIONE 2','EMPEZAR MI PROPIO CAMINO':'INIZIARE LA MIA STRADA',
    'SEGUIR EL LEGADO CON TU HIJO':'CONTINUARE L’EREDITÀ CON TUO FIGLIO','No, ver el resumen de mi vida':'No, vedere il riassunto della mia vita',
    'Tu historia terminó.':'La tua storia è finita.','La de ellos empieza.':'La loro comincia.',
    'PONER':'CONFERMA','Escribí el nombre...':'Scrivi il nome...','Es nena':'È una bambina','Es varón':'È un maschio',
    'El nombre queda para toda la partida.':'Il nome resta per tutta la partita.',
    'CONVOCATORIA':'CONVOCAZIONE','Salir del juego':'Uscire dal gioco','Confirmar identidad':'Conferma identità',
    'Definí tu jugador':'Definisci il tuo giocatore','APELLIDO':'COGNOME','PIERNA':'PIEDE',
    'tu pareja':'il tuo partner','tu hijo':'tuo figlio','tu hija':'tua figlia','tu nieto':'tuo nipote','tu nieta':'tua nipote',
    'vecino':'vicino','médico':'medico','hincha':'tifoso','capitán':'capitano','representante':'procuratore','veterano':'veterano',
    'ERA DIGITAL':'ERA DIGITALE','ERA HOLO':'ERA OLO','ERA ROBOT':'ERA ROBOT','ERA ORBITAL':'ERA ORBITALE'
  }
};
// Glosario: se aplica DENTRO de las frases que no están en el diccionario, para
// que aunque el relato siga en español el vocabulario del juego se lea traducido.
const LY_GLOS = {
  en: [['Temporada','Season'],['temporada','season'],['Títulos','Titles'],['títulos','titles'],['Título','Title'],
    ['Nivel','Level'],['nivel','level'],['Moral','Morale'],['Fama','Fame'],['Dinero','Money'],['Salud','Health'],
    ['Felicidad','Happiness'],['Familia','Family'],['Soledad','Loneliness'],['Presión','Pressure'],['Resultados','Results'],
    ['Plantel','Squad'],['Club','Club'],['club','club'],['años','years'],['año','year'],['Goles','Goals'],['Asistencias','Assists'],
    ['Selección','National team'],['selección','national team'],['Jugador','Player'],['Director Técnico','Head Coach'],
    ['Comentarista','Pundit'],['Dirigente','Director'],['Empresario','Businessman'],['Escuela de fútbol','Football school'],
    ['Vida tranquila','Quiet life'],['Ranking','Ranking'],['Logros','Achievements'],['Continuar','Continue'],['Salir','Exit']],
  pt: [['Temporada','Temporada'],['Títulos','Títulos'],['Nivel','Nível'],['nivel','nível'],['Moral','Moral'],['Fama','Fama'],
    ['Dinero','Dinheiro'],['Salud','Saúde'],['Felicidad','Felicidade'],['Familia','Família'],['Soledad','Solidão'],
    ['Presión','Pressão'],['Resultados','Resultados'],['Plantel','Elenco'],['años','anos'],['año','ano'],['Goles','Gols'],
    ['Asistencias','Assistências'],['Selección','Seleção'],['selección','seleção'],['Jugador','Jogador'],
    ['Director Técnico','Treinador'],['Comentarista','Comentarista'],['Dirigente','Dirigente'],['Empresario','Empresário'],
    ['Escuela de fútbol','Escolinha de futebol'],['Vida tranquila','Vida tranquila'],['Logros','Conquistas'],
    ['Continuar','Continuar'],['Salir','Sair']],
  fr: [['Temporada','Saison'],['temporada','saison'],['Títulos','Titres'],['títulos','titres'],['Nivel','Niveau'],['nivel','niveau'],
    ['Moral','Moral'],['Fama','Notoriété'],['Dinero','Argent'],['Salud','Santé'],['Felicidad','Bonheur'],['Familia','Famille'],
    ['Soledad','Solitude'],['Presión','Pression'],['Resultados','Résultats'],['Plantel','Effectif'],['años','ans'],['año','an'],
    ['Goles','Buts'],['Asistencias','Passes déc.'],['Selección','Sélection'],['Jugador','Joueur'],
    ['Director Técnico','Entraîneur'],['Comentarista','Consultant'],['Dirigente','Dirigeant'],['Empresario','Entrepreneur'],
    ['Escuela de fútbol','École de foot'],['Vida tranquila','Vie tranquille'],['Logros','Succès'],['Continuar','Continuer'],['Salir','Quitter']],
  it: [['Temporada','Stagione'],['temporada','stagione'],['Títulos','Titoli'],['títulos','titoli'],['Nivel','Livello'],['nivel','livello'],
    ['Moral','Morale'],['Fama','Fama'],['Dinero','Soldi'],['Salud','Salute'],['Felicidad','Felicità'],['Familia','Famiglia'],
    ['Soledad','Solitudine'],['Presión','Pressione'],['Resultados','Risultati'],['Plantel','Rosa'],['años','anni'],['año','anno'],
    ['Goles','Gol'],['Asistencias','Assist'],['Selección','Nazionale'],['Jugador','Giocatore'],
    ['Director Técnico','Allenatore'],['Comentarista','Opinionista'],['Dirigente','Dirigente'],['Empresario','Imprenditore'],
    ['Escuela de fútbol','Scuola calcio'],['Vida tranquila','Vita tranquilla'],['Logros','Obiettivi'],['Continuar','Continua'],['Salir','Esci']]
};
function lyT(txt){
  if (LY_LANG === 'es') return txt;
  const D = LY_DIC[LY_LANG]; if(!D) return txt;
  const t = String(txt);
  const clave = t.trim();
  if (D[clave]) return t.replace(clave, D[clave]);
  // Glosario palabra por palabra sobre el resto.
  let out = t;
  (LY_GLOS[LY_LANG]||[]).forEach(pair=>{
    if (!pair || pair.length < 2) return;
    out = out.split(pair[0]).join(pair[1]);
  });
  return out;
}
// Recorre el DOM traduciendo textos y placeholders.
function lyTraducirDOM(root){
  if (LY_LANG === 'es') return;
  root = root || document.getElementById('carrera-modal');
  if(!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const pend = [];
  let n;
  while ((n = walker.nextNode())) if (n.nodeValue && n.nodeValue.trim()) pend.push(n);
  pend.forEach(n=>{ const t = lyT(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; });
  root.querySelectorAll('[placeholder]').forEach(el=>{ el.placeholder = lyT(el.placeholder); });
  root.querySelectorAll('[title]').forEach(el=>{ el.title = lyT(el.title); });
}
// Se engancha al modal: cada vez que una pantalla se repinta, se traduce sola.
function lyObservar(){
  // El modal se destruye y se vuelve a crear en cada pantalla (overlay()), asi que
  // el observador se reengancha al nodo nuevo cada vez.
  if (window._lyObs){ try { window._lyObs.disconnect(); } catch(e){} window._lyObs = null; }
  const arranca = ()=>{
    const m = document.getElementById('carrera-modal');
    if(!m) return false;
    window._lyObs = new MutationObserver(()=>{
      if (LY_LANG === 'es') return;
      clearTimeout(window._lyTO);
      window._lyTO = setTimeout(()=>lyTraducirDOM(m), 16);
    });
    window._lyObs.observe(m, { childList:true, subtree:true });
    lyTraducirDOM(m);
    return true;
  };
  if (!arranca()) setTimeout(lyObservar, 300);
}
window._lySetIdioma = function(id){
  LY_LANG = id;
  try { localStorage.setItem(LY_LANG_LS, id); } catch(e){}
  // Al cambiar de idioma se repinta la portada (y de ahí en adelante todo sale
  // traducido gracias al observador).
  window._carreraStart();
  setTimeout(()=>lyTraducirDOM(), 30);
};
window._lyElegirIdioma = function(){
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="max-width:420px;margin:0 auto;padding:70px 22px;text-align:center;">
    <div style="font-size:11px;font-weight:900;letter-spacing:3px;color:${A};margin-bottom:10px;">IDIOMA / LANGUAGE</div>
    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:24px;color:#fff;margin-bottom:18px;">¿En qué idioma querés jugar?</div>
    <div style="display:flex;flex-direction:column;gap:9px;">
      ${LY_IDIOMAS.map(L=>`<button onclick="window._lySetIdioma('${L.id}')" style="display:flex;align-items:center;gap:11px;background:${LY_LANG===L.id?'rgba(186,255,0,.14)':'rgba(255,255,255,.04)'};border:1.5px solid ${LY_LANG===L.id?A:'#242a20'};color:${LY_LANG===L.id?A:'#e0e4dc'};border-radius:13px;padding:14px;font-weight:800;font-size:14px;cursor:pointer;">
        <img src="https://flagcdn.com/w40/${L.f}.png" alt="" style="width:24px;height:auto;border-radius:3px;">${L.n}</button>`).join('')}
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
  lyChrome(false);
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
  lyChrome(false);
  // Nueva carrera: limpiar save y estado en memoria (antes se conservaba de la carrera
  // anterior, generando bugs al mezclar datos).
  try { localStorage.removeItem(LS); } catch(e) {}
  G = null; _draft = null;
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
    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:16px;color:#fff;margin:22px 0 4px;">Intensidad de decisiones</div>
    <div style="font-size:12px;color:#8a8f96;margin-bottom:12px;">Cuántas decisiones vas a tomar por temporada.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;" id="cr-dif-row">
      ${[['intenso','Intenso','4 por temporada','#ff5555'],['normal','Normal','1 por temporada',A],['leve','Leve','1 cada 2 años','#4fc3f7']].map(d=>`<button data-dif="${d[0]}" onclick="window._crDif='${d[0]}';document.querySelectorAll('#cr-dif-row button').forEach(function(b){b.style.borderColor='#262626';b.style.background='rgba(255,255,255,.04)'});this.style.borderColor='${d[3]}';this.style.background='rgba(255,255,255,.08)';" style="background:${'rgba(255,255,255,.04)'};border:1.5px solid ${'#262626'};border-radius:14px;padding:12px 8px;cursor:pointer;text-align:center;">
        <div style="font-weight:900;font-size:14px;color:${d[3]};">${d[1]}</div>
        <div style="font-size:10px;color:#999;margin-top:3px;">${d[2]}</div>
      </button>`).join('')}
    </div>
    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:16px;color:#fff;margin:22px 0 4px;">¿Hasta dónde querés jugar?</div>
    <div style="font-size:12px;color:#8a8f96;margin-bottom:12px;">Podés quedarte solo con la carrera del jugador, o seguir la vida entera.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;" id="cr-alc-row">
      ${[['todo','Vida completa','Carrera + retiro + legado del nieto',A],['carrera','Solo la carrera','Termina cuando colgás los botines','#4fc3f7']].map(d=>`<button data-alc="${d[0]}" onclick="window._crAlcance='${d[0]}';document.querySelectorAll('#cr-alc-row button').forEach(function(b){b.style.borderColor='#262626';b.style.background='rgba(255,255,255,.04)'});this.style.borderColor='${d[3]}';this.style.background='rgba(255,255,255,.08)';" style="background:rgba(255,255,255,.04);border:1.5px solid #262626;border-radius:14px;padding:13px 10px;cursor:pointer;text-align:left;">
        <div style="font-weight:900;font-size:13.5px;color:${d[3]};">${d[1]}</div>
        <div style="font-size:10.5px;color:#999;margin-top:4px;line-height:1.4;">${d[2]}</div>
      </button>`).join('')}
    </div>
  </div>`;
  if(!window._crDif) window._crDif='normal';
  if(!window._crAlcance) window._crAlcance='todo';
  setTimeout(function(){
    var b=document.querySelector('#cr-dif-row button[data-dif="'+(window._crDif)+'"]'); if(b){ b.style.borderColor=A; b.style.background='rgba(255,255,255,.08)'; }
    var a=document.querySelector('#cr-alc-row button[data-alc="'+(window._crAlcance)+'"]'); if(a){ a.style.borderColor=(window._crAlcance==='todo'?A:'#4fc3f7'); a.style.background='rgba(255,255,255,.08)'; }
  },30);
};

// ── IDENTIDAD ───────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
// AVATAR PIXEL ART — tu jugador dibujado a 48×72 "píxeles" (antes 32×40), en el
// estilo de los simuladores pixel-art modernos: figura de cuerpo entero de frente,
// proporciones humanas reales, sombreado en 3 tonos y CAMISETA con nombre y número
// legibles. Reacciona: respira, festeja, se agarra la cabeza, se lesiona.
// Todo es SVG generado (cero imágenes externas, cero librerías).
// ══════════════════════════════════════════════════════════════════════════════
const AV_PIELES = [
  { id:'clara',   n:'Clara',    c:'#f2cfa8', s:'#d9ad81', d:'#b8875e' },
  { id:'media',   n:'Media',    c:'#dda877', s:'#c08a55', d:'#9a6a3c' },
  { id:'trigena', n:'Trigueña', c:'#b57e52', s:'#96633c', d:'#754a2a' },
  { id:'morena',  n:'Morena',   c:'#8a5533', s:'#6d4126', d:'#4f2d19' },
  { id:'oscura',  n:'Oscura',   c:'#5c3520', s:'#452716', d:'#2e190e' }
];
const AV_PELOS = [
  { id:'corto',  n:'Corto' },   { id:'rapado', n:'Rapado' },
  { id:'largo',  n:'Largo' },   { id:'afro',   n:'Afro' },
  { id:'tupe',   n:'Tupé' },    { id:'mohawk', n:'Mohicano' },
  { id:'rastas', n:'Rastas' },  { id:'colita', n:'Colita' },
  { id:'calvo',  n:'Pelado' }
];
const AV_COLORES_PELO = [
  { id:'negro',   n:'Negro',     c:'#181410' },
  { id:'castano', n:'Castaño',   c:'#4a2f1a' },
  { id:'rubio',   n:'Rubio',     c:'#d9b45c' },
  { id:'rojo',    n:'Colorado',  c:'#9c3d1c' },
  { id:'canoso',  n:'Canoso',    c:'#a8a8a4' },
  { id:'platino', n:'Platinado', c:'#ece7d8' },
  { id:'fantasia',n:'Fantasía',  c:'#baff00' }
];
const AV_ACCS = [
  { id:'nada',     n:'Nada' },      { id:'cinta',   n:'Vincha' },
  { id:'guantes',  n:'Guantes' },   { id:'tatuajes',n:'Tatuajes' },
  { id:'muneq',    n:'Muñequera' }
];

// ══════════════════════════════════════════════════════════════════════════════
// GÉNERO: nombres, pronombres y cuerpo
// Una mujer tiene que llamarse como una mujer, verse como una mujer y que el
// juego le hable como a una mujer. Una nieta es una nieta, no "un nieto".
// ══════════════════════════════════════════════════════════════════════════════
const NOMBRES_M = ['Bruno','Nico','Joaco','Tomás','Iván','Beto','Ciro','Mateo','Lautaro','Thiago','Facundo','Santiago',
  'Diego','Rodrigo','Julián','Bautista','Franco','Gonzalo','Emiliano','Benjamín','Dante','Ramiro','Agustín','Ignacio'];
const NOMBRES_F = ['Valentina','Emma','Lucía','Mía','Ana','Sol','Camila','Martina','Julieta','Renata','Delfina','Malena',
  'Paula','Carolina','Florencia','Antonella','Isabella','Catalina','Rocío','Guadalupe','Abril','Milagros','Zoe','Amparo'];
// Nombres de pareja (adulta) — siempre mujer u hombre según a quién quiera el jugador.
const NOMBRES_PAREJA_F = ['Carolina','Silvana','Verónica','Natalia','Andrea','Mariana','Lucía','Gabriela','Cecilia','Romina','Paula','Valeria'];
const NOMBRES_PAREJA_M = ['Martín','Sebastián','Andrés','Federico','Leandro','Gustavo','Marcelo','Diego','Pablo','Rodrigo'];
// Compat: bancos viejos que hacían pick(NOMBRES_BEBE).
const NOMBRES_BEBE = NOMBRES_M.concat(NOMBRES_F);

// Deduce el género por el nombre. Si no está en las listas, cae en la regla del
// castellano (termina en A = femenino), que acierta la enorme mayoría.
function generoDe(nombre){
  const n = String(nombre||'').trim();
  if (!n) return 'm';
  const bajo = n.toLowerCase();
  if (NOMBRES_F.concat(NOMBRES_PAREJA_F).some(x=>x.toLowerCase()===bajo)) return 'f';
  if (NOMBRES_M.concat(NOMBRES_PAREJA_M).some(x=>x.toLowerCase()===bajo)) return 'm';
  return /a$/i.test(n) ? 'f' : 'm';
}
// Género GUARDADO en la ficha del familiar (manda sobre el nombre).
function genDe(p){ return (p && p.gen) ? p.gen : generoDe(p && p.nombre); }
// Palabras que cambian con el género. `gen` es 'm' o 'f'.
function gp(gen, m, f){ return gen === 'f' ? f : m; }
function palabraHijo(gen){ return gp(gen,'hijo','hija'); }
function palabraNieto(gen){ return gp(gen,'nieto','nieta'); }
// Un nombre nuevo del género pedido, sin repetir los que ya hay en casa.
function nombreNuevo(gen, usados){
  const L = gen === 'f' ? NOMBRES_F : NOMBRES_M;
  const libres = L.filter(n => (usados||[]).indexOf(n) < 0);
  return pick(libres.length ? libres : L);
}
function nombresEnCasa(){
  const f = (G && G.familia) || {};
  return [].concat((f.hijos||[]).map(h=>h.nombre), (f.nietos||[]).map(n=>n.nombre), f.pareja ? [f.pareja] : []);
}
// Crea una persona (hijo/nieto) con género y nombre coherentes.
function nacePersona(gen, extra){
  gen = gen || (Math.random() < 0.5 ? 'f' : 'm');
  return Object.assign({ nombre: nombreNuevo(gen, nombresEnCasa()), gen, edad:0, av: avHijo(gen) }, extra||{});
}
// La cara de un hijo SALE DE LOS PADRES. Antes cada hijo se dibujaba a partir del
// hash de su nombre: nacía un pelirrojo de piel clara de dos morochos y no había
// forma de creerse que fueran familia. Ahora cada rasgo se sortea entre el de la
// madre y el del padre, con una chance chica de variar (los genes hacen eso).
function avHijo(gen){
  const mio = (G && G.avatar) || avatarDefault();
  const dela = (G && G.familia && G.familia.parejaAv) || null;
  const de = (a, b, campo, alterno) => {
    const opciones = [a && a[campo], b && b[campo]].filter(v=>v != null);
    if (!opciones.length) return alterno;
    // 12% de las veces sale algo que no tiene ninguno de los dos: pasa en la vida.
    if (alterno !== undefined && Math.random() < 0.12) return alterno;
    return pick(opciones);
  };
  return {
    gen,
    piel: de(mio, dela, 'piel', pick(AV_PIELES).id),
    peloColor: de(mio, dela, 'peloColor', pick(AV_COLORES_PELO).id),
    pelo: gen === 'f' ? pick(['largo','colita','afro','rastas']) : pick(AV_PELOS).id,
    barba: 0, acc:'nada', calvicie:0, canas:0, cicatriz:0,
    peso: de(mio, dela, 'peso', 0) || 0, tatus:0, bling:0
  };
}
// A quién querés al lado: se elige una vez y el juego lo respeta toda la partida.
// Por defecto, mujer. La pareja se DIBUJA con ese género, no con uno al azar.
function parejaGen(){
  if (G && G.parejaGen) return G.parejaGen;
  return 'f';
}
// Tres candidatas/os DISTINTOS: distinto aspecto, distinta forma de ser y
// distinto efecto en tu vida. No es lo mismo salir con alguien del barrio que con
// alguien que vive de las cámaras.
const PAREJA_PERFILES = [
  { id:'barrio', t:'De toda la vida',   d:'La conocés desde el barrio. No le importa el fútbol: le importás vos.',
    piel:1, pelo:'largo',  color:'castano', peso:0,
    ef:(s)=>{ s.felicidad=clamp((s.felicidad||50)+16,0,100); s.soledad=clamp((s.soledad||40)-24,0,100); s.familia=clamp((s.familia||50)+14,0,100); },
    res:'Tranquila, de las que se quedan. Con ella la casa es un lugar donde descansás.' },
  { id:'figura', t:'Alguien de la tele', d:'Trabaja en los medios. Salir juntos es tapa de revista todas las semanas.',
    piel:0, pelo:'colita', color:'rubio',  peso:-1,
    ef:(s,g)=>{ s.felicidad=clamp((s.felicidad||50)+10,0,100); s.soledad=clamp((s.soledad||40)-16,0,100); g.fama=clamp((g.fama||40)+14,0,100); },
    res:'Se enteró todo el país en cuatro horas. Tu vida privada dejó de ser privada.' },
  { id:'colega', t:'Del ambiente',       d:'También vive del deporte. Entiende las concentraciones, los viajes y las malas rachas.',
    piel:2, pelo:'afro',   color:'negro',  peso:0,
    ef:(s,g)=>{ s.felicidad=clamp((s.felicidad||50)+12,0,100); s.soledad=clamp((s.soledad||40)-18,0,100); g.moral=clamp((g.moral||60)+8,0,100); },
    res:'No hay que explicarle nada. Eso, a esta altura, vale más que cualquier cosa.' }
];
// Arma los tres candidatos del momento (nombres distintos entre sí).
function parejaCandidatos(){
  const g = parejaGen();
  const pool = shuffle((g === 'f' ? NOMBRES_PAREJA_F : NOMBRES_PAREJA_M).slice());
  return PAREJA_PERFILES.map((P,i)=> Object.assign({}, P, {
    nombre: pool[i] || pool[0],
    gen: g,
    av: { gen:g, piel:AV_PIELES[P.piel].id, pelo:P.pelo, peloColor:P.color, barba:0, acc:'nada',
          calvicie:0, canas:0, cicatriz:0, peso:P.peso, tatus:0, bling:0 }
  }));
}
function nombreParejaNuevo(){
  const g = parejaGen();
  if (G) G.familia = G.familia || {};
  if (G && G.familia) G.familia.parejaGen = g;
  // Se dejan los tres candidatos listos y se marca que hay que elegir: la
  // pantalla de elección aparece apenas se cierra el evento.
  if (G){
    G._parejaOpts = parejaCandidatos();
    G._elegirPareja = true;
    // La cara provisional también se guarda. Si por lo que sea nunca llegás a la
    // pantalla de elección (un evento que te casa de una), igual hay UNA cara
    // fija y no una sorteada distinta en cada pantalla.
    G.familia.parejaAv = G.familia.parejaAv || G._parejaOpts[0].av;
    return G._parejaOpts[0].nombre;   // provisional: lo pisa lo que elijas
  }
  return pick(g === 'f' ? NOMBRES_PAREJA_F : NOMBRES_PAREJA_M);
}
// Red de seguridad: cualquier pareja que exista sin cara guardada recibe una y
// queda fija para siempre. Cubre partidas viejas y eventos que crean la pareja
// sin pasar por el selector.
function parejaAvAsegurar(){
  if (!G) return null;
  const fam = G.familia = G.familia || {};
  if (!fam.pareja) return null;
  if (!fam.parejaAv){
    const cands = parejaCandidatos();
    fam.parejaAv = (cands && cands.length) ? cands[0].av : null;
    save();
  }
  return fam.parejaAv;
}
window._vjElegirPareja = function(){
  if(!G || !(G._parejaOpts||[]).length){ window._vjParejaSeguir(); return; }
  const edad = (VJ.mundo === 'vida') ? (G.vidaEdad||40) : (G.edad||25);
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="min-height:100%;background:#05070a;display:flex;flex-direction:column;justify-content:center;position:relative;">
    ${fondoEscenaHTML()}
    <div style="position:relative;max-width:600px;margin:0 auto;width:100%;padding:52px 18px calc(24px + env(safe-area-inset-bottom));box-sizing:border-box;">
      <div style="font-size:10px;font-weight:900;letter-spacing:2px;color:#f9a8d4;margin-bottom:6px;text-align:center;">SE TE CRUZARON TRES</div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:22px;color:#fff;margin-bottom:14px;text-align:center;">¿Con quién te la jugás?</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${G._parejaOpts.map((c,i)=>`
        <button onclick="window._vjPareja(${i})" style="display:flex;align-items:center;gap:12px;background:rgba(244,114,182,.07);border:1.5px solid rgba(244,114,182,.32);border-radius:15px;padding:12px;cursor:pointer;text-align:left;">
          <div style="line-height:0;flex-shrink:0;">${avatarSprite(c.av,{ edad:Math.max(20,edad-2), escala:2, pose:'idle', ropa:'calle', num:'', apellido:'' })}</div>
          <div style="min-width:0;">
            <div style="font-size:15.5px;font-weight:900;color:#fff;">${esc(c.nombre)}</div>
            <div style="font-size:10px;font-weight:900;letter-spacing:1px;color:#f9a8d4;margin:2px 0 3px;">${esc(c.t.toUpperCase())}</div>
            <div style="font-size:12px;color:#c4ccc0;line-height:1.45;">${esc(c.d)}</div>
          </div>
        </button>`).join('')}
      </div>
      <button onclick="window._vjPareja(-1)" style="width:100%;margin-top:11px;background:rgba(255,255,255,.04);border:1px solid #242a20;color:#8a9280;border-radius:12px;padding:12px;font-weight:800;font-size:12.5px;cursor:pointer;">Ninguna: por ahora estoy bien solo</button>
    </div>
  </div>`;
};
window._vjPareja = function(i){
  if(!G) return;
  const opts = G._parejaOpts || [];
  const fam = G.familia = G.familia || {};
  const s = (VJ.mundo === 'vida') ? (G.vidaStats||{}) : personalAsegurar();
  let res;
  if (i < 0 || !opts[i]){
    fam.pareja = null; fam.parejaGen = null;
    s.soledad = clamp((s.soledad||40) + 10, 0, 100);
    res = 'Preferiste seguir solo. Hay épocas en que uno no está para eso.';
  } else {
    const c = opts[i];
    fam.pareja = c.nombre; fam.parejaGen = c.gen; fam.parejaAv = c.av; fam.parejaPerfil = c.id;
    try { c.ef(s, G); } catch(e){}
    res = c.res;
  }
  G._parejaOpts = null; G._elegirPareja = false;
  Object.keys(s).forEach(k=>{ if(typeof s[k]==='number') s[k]=clamp(s[k],0,100); });
  save();
  window._vjParejaSeguir(res);
};
window._vjParejaSeguir = function(res){
  const volver = ()=>{ if (VJ.mundo === 'vida') window._vidaJugable(); else window._clubMundo(VJ.escena); };
  if(!res){ volver(); return; }
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="min-height:100%;background:#05070a;display:flex;align-items:center;position:relative;">
    ${fondoEscenaHTML()}
    <div style="position:relative;max-width:520px;margin:0 auto;padding:24px 20px;text-align:center;">
      ${(G.familia||{}).pareja ? `<div style="display:flex;justify-content:center;margin-bottom:14px;">${avatarBox(`<div style="display:flex;align-items:flex-end;gap:2px;line-height:0;">
        <div style="line-height:0;">${vjSpriteJugador('orgullo')}</div>
        <div style="line-height:0;">${vjSpritePareja('orgullo', false, 3)}</div>
      </div>`, '14px 20px', 'casa')}</div>` : ''}
      <div style="font-size:15px;color:#fff;font-weight:700;line-height:1.6;margin-bottom:18px;">${esc(res)}</div>
      <button onclick="${VJ.mundo === 'vida' ? 'window._vidaJugable()' : "window._clubMundo('"+VJ.escena+"')"}" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:14px 30px;font-weight:900;font-size:14.5px;cursor:pointer;">SEGUIR <i class='bx bx-right-arrow-alt'></i></button>
    </div>
  </div>`;
};

// ══════════════════════════════════════════════════════════════════════════════
// ESTADO EVOLUTIVO DEL AVATAR
// Lo que elegís al crearlo es sólo el punto de partida. A partir de ahí el cuerpo
// va contando tu historia: se te cae el pelo, encanecés, engordás, te queda una
// cicatriz de una lesión, te llenás de cadenas cuando te hacés rico, te ponen el
// uniforme si vas preso. Cada decisión puede dejar una marca visible permanente.
// ══════════════════════════════════════════════════════════════════════════════
function avatarDefault(){
  return {
    // Base elegida por el jugador
    piel:'media', pelo:'corto', peloColor:'negro', barba:0, acc:'nada',
    // Evolutivo — se modifica solo con las decisiones y la edad
    calvicie:0,    // 0 nada · 1 entradas · 2 coronilla · 3 pelado
    implante:false,// se hizo el injerto (revierte la calvicie)
    canas:0,       // 0-2
    cicatriz:0,    // 0-2 (ceja / mejilla)
    peso:0,        // -1 flaco · 0 normal · 1 pasado de kilos
    tatus:0,       // 0-3 brazos
    bling:0,       // 0-2 cadenas y reloj de oro
    vendaje:false, // lesión activa (rodilla vendada)
    muletas:false,
    preso:false,   // uniforme carcelario
    traje:false,   // saco (dirigente / empresario)
    lentes:false,
    capitanPerm:false
  };
}
// Aplica cambios permanentes al avatar. Devuelve una frase describiendo lo visible.
function avMutar(cambios){
  if(!G) return '';
  if(!G.avatar) G.avatar = avatarDefault();
  const a = G.avatar;
  Object.keys(cambios||{}).forEach(k=>{
    const v = cambios[k];
    // El peso va de -1 (flaco) a 1 (pasado de kilos). El mínimo era 0, así que
    // "adelgazar" nunca se veía: avMutar({peso:-1}) sobre un peso 0 daba 0.
    if (typeof v === 'number' && typeof a[k] === 'number') a[k] = clamp(a[k] + v, k==='peso'?-1:0, k==='peso'?1:3);
    else a[k] = v;
  });
  return '';
}
// Envejecimiento automático: cada temporada el cuerpo acusa el paso del tiempo.
function avEnvejecer(edad){
  if(!G || !G.avatar) return;
  const a = G.avatar;
  // ── PESO: cambia solo, temporada a temporada, según cómo estés viviendo ──
  // Antes el peso sólo se movía en dos eventos puntuales que casi nunca salían,
  // así que el cuerpo del jugador era el mismo a los 18 que a los 38.
  const moral = G.moral != null ? G.moral : 60;
  const nivel = G.nivel != null ? G.nivel : 60;
  const F = G.flags || {};
  let engordar = 0.04;                          // base
  if (edad >= 31) engordar += 0.10;             // el metabolismo afloja
  if (edad >= 35) engordar += 0.12;
  if (moral <= 30) engordar += 0.10;            // bajón = descuido
  if (F.ludopata || F.fiestero) engordar += 0.10;
  if (a.muletas || a.vendaje) engordar += 0.14; // parado por lesión
  let adelgazar = 0.05;
  if (nivel >= 80) adelgazar += 0.14;           // en su mejor forma
  if (edad <= 24) adelgazar += 0.10;
  if (F.dopado) adelgazar += 0.10;
  if (F.limpio || F.mentoreado) adelgazar += 0.06;
  const r = Math.random();
  if (r < engordar) a.peso = clamp((a.peso||0) + 1, -1, 1);
  else if (r < engordar + adelgazar) a.peso = clamp((a.peso||0) - 1, -1, 1);
  // ── PELO Y VISTA ──
  if (a.implante) return;                       // el injerto frena la caída
  if (edad >= 29 && a.calvicie === 0 && Math.random() < 0.13) a.calvicie = 1;
  else if (edad >= 31 && a.calvicie === 1 && Math.random() < 0.22) a.calvicie = 2;
  else if (edad >= 36 && a.calvicie === 2 && Math.random() < 0.25) a.calvicie = 3;
  // A los 35 nadie tiene la cabeza blanca: las primeras canas asoman pasados los
  // 40 y el pelo blanco entero recien de viejo.
  if (edad >= 41 && a.canas === 0 && Math.random() < 0.22) a.canas = 1;
  else if (edad >= 54 && a.canas === 1 && Math.random() < 0.28) a.canas = 2;
  if (edad >= 38 && !a.lentes && Math.random() < 0.10) a.lentes = true;
  // La barba también crece con los años y con las malas rachas.
  if (edad >= 26 && (a.barba||0) < 3 && Math.random() < (moral <= 35 ? 0.22 : 0.10)) a.barba = (a.barba||0) + 1;
}

// Etapa física por edad.
function avEtapa(edad){
  // La cabeza de los chicos es grande (así se lee "pibe"), pero no tanto como para
  // dejarlos sin cuerpo: con 1.30 la cabeza ocupaba media figura.
  // Bebés y chicos: sin estas etapas, un recién nacido se dibujaba con el mismo
  // cuerpo que un pibe de 13 y parecía un adulto en miniatura.
  if (edad <= 1)  return { id:'bebe',     esc:0.30, hombro:0.58, cabeza:1.75, lbl:'Bebé' };
  if (edad <= 3)  return { id:'nene2',    esc:0.40, hombro:0.62, cabeza:1.55, lbl:'Nene' };
  if (edad <= 6)  return { id:'nene6',    esc:0.50, hombro:0.68, cabeza:1.40, lbl:'Nene' };
  if (edad <= 9)  return { id:'nene9',    esc:0.60, hombro:0.73, cabeza:1.28, lbl:'Pibe' };
  if (edad <= 13) return { id:'nene',     esc:0.70, hombro:0.78, cabeza:1.16, lbl:'Pibe' };
  if (edad <= 16) return { id:'juvenil',  esc:0.84, hombro:0.88, cabeza:1.08, lbl:'Juvenil' };
  if (edad <= 19) return { id:'joven',    esc:0.94, hombro:0.96, cabeza:1.03, lbl:'Joven' };
  if (edad <= 30) return { id:'adulto',   esc:1.00, hombro:1.00, cabeza:1.00, lbl:'Plenitud' };
  if (edad <= 35) return { id:'maduro',   esc:1.00, hombro:1.02, cabeza:1.00, lbl:'Veterano' };
  if (edad <= 45) return { id:'retirado', esc:0.99, hombro:1.01, cabeza:1.00, lbl:'Ex jugador' };
  if (edad <= 60) return { id:'mayor',    esc:0.97, hombro:0.98, cabeza:1.00, lbl:'Mayor' };
  return { id:'anciano', esc:0.93, hombro:0.93, cabeza:1.00, lbl:'Anciano' };
}
function _avShade(hex, amt){
  try{
    let h = String(hex||'#888').replace('#','');
    if (h.length === 3) h = h.split('').map(x=>x+x).join('');
    const n = parseInt(h,16);
    const r = clamp(((n>>16)&255) + amt, 0, 255);
    const g = clamp(((n>>8)&255) + amt, 0, 255);
    const b = clamp((n&255) + amt, 0, 255);
    return '#' + [r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
  }catch(e){ return hex; }
}
function _avContraste(hex){
  try{
    let h = String(hex||'#888').replace('#',''); if(h.length===3) h=h.split('').map(x=>x+x).join('');
    const n=parseInt(h,16); const lum=(0.299*((n>>16)&255)+0.587*((n>>8)&255)+0.114*(n&255))/255;
    return lum > 0.6 ? '#14140f' : '#ffffff';
  }catch(e){ return '#ffffff'; }
}
// Mezcla dos colores (para las canas)
function _avMix(a,b,t){
  const p=x=>{ let h=String(x||'#888').replace('#',''); if(h.length===3)h=h.split('').map(y=>y+y).join(''); const n=parseInt(h,16); return [(n>>16)&255,(n>>8)&255,n&255]; };
  const A=p(a),B=p(b);
  return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('');
}

// ── POSES Y MOVIMIENTOS ───────────────────────────────────────────────────────
// `piernas` define el ciclo: 0 = quieto, 1 = caminar, 2 = correr, 3 = paso corto.
// `gesto` engancha una animación de brazos propia de la pose (saludar, aplaudir,
// temblar de bronca, secarse la cara...). `ritmo` es la velocidad del ciclo base.
// Los brazos son SIMÉTRICOS salvo cuando la pose pide lo contrario: antes
// `posando` tenía los dos brazos girados hacia el mismo lado y el derecho
// quedaba cruzado por delante del cuerpo, tieso, apuntando al aire.
const AV_POSES = {
  idle:      { brazoL:0,    brazoR:0,    cabeza:0,  salto:0, cara:'normal', piernas:0, gesto:'respirar', ritmo:1 },
  caminar:   { brazoL:-26,  brazoR:26,   cabeza:0,  salto:1, cara:'normal', piernas:1, gesto:'braceo',   ritmo:1 },
  correr:    { brazoL:-52,  brazoR:52,   cabeza:-2, salto:2, cara:'normal', piernas:2, gesto:'braceo',   ritmo:1 },
  festejo:   { brazoL:-62,  brazoR:62,   cabeza:-4, salto:3, cara:'feliz',  piernas:0, gesto:'agitar',   ritmo:.75 },
  campeon:   { brazoL:-148, brazoR:148,  cabeza:-6, salto:5, cara:'feliz',  piernas:0, gesto:'levantar', ritmo:.9 },
  bajon:     { brazoL:8,    brazoR:-8,   cabeza:7,  salto:0, cara:'triste', piernas:0, gesto:'hundirse', ritmo:2.2 },
  lesion:    { brazoL:34,   brazoR:-16,  cabeza:9,  salto:0, cara:'dolor',  piernas:3, gesto:'dolor',    ritmo:1.6 },
  pensando:  { brazoL:4,    brazoR:-44,  cabeza:3,  salto:0, cara:'normal', piernas:0, gesto:'meditar',  ritmo:2 },
  saludo:    { brazoL:4,    brazoR:-74,  cabeza:0,  salto:0, cara:'feliz',  piernas:0, gesto:'saludar',  ritmo:1 },
  posando:   { brazoL:-118, brazoR:118,  cabeza:0,  salto:0, cara:'feliz',  piernas:0, gesto:'mostrar',  ritmo:1.4 },
  bronca:    { brazoL:26,   brazoR:-26,  cabeza:-2, salto:0, cara:'dolor',  piernas:0, gesto:'temblar',  ritmo:.6 },
  agotado:   { brazoL:14,   brazoR:-14,  cabeza:11, salto:0, cara:'triste', piernas:0, gesto:'jadear',   ritmo:1.1 },
  aplaudir:  { brazoL:-46,  brazoR:46,   cabeza:0,  salto:1, cara:'feliz',  piernas:0, gesto:'aplaudir', ritmo:.5 },
  pensativo: { brazoL:8,    brazoR:-88, cabeza:5,  salto:0, cara:'triste', piernas:0, gesto:'meditar',  ritmo:2.4 },
  orgullo:   { brazoL:-16,  brazoR:16,   cabeza:-3, salto:0, cara:'feliz',  piernas:0, gesto:'pecho',    ritmo:1.5 },
  esposado:  { brazoL:-8,   brazoR:8,    cabeza:8,  salto:0, cara:'triste', piernas:3, gesto:'hundirse', ritmo:2.4 },
  rico:      { brazoL:-32,  brazoR:32,   cabeza:-4, salto:0, cara:'feliz',  piernas:0, gesto:'mostrar',  ritmo:1.3 },
  entrenar:  { brazoL:-72,  brazoR:72,   cabeza:0,  salto:1, cara:'normal', piernas:3, gesto:'braceo',   ritmo:.7 },
  // Poses nuevas: el juego repetía cuatro caras para veinte situaciones distintas.
  llorar:    { brazoL:-92,  brazoR:92,  cabeza:12, salto:0, cara:'triste', piernas:0, gesto:'sollozar', ritmo:1.8 },
  gol:       { brazoL:-136, brazoR:136,  cabeza:-8, salto:4, cara:'feliz',  piernas:0, gesto:'agitar',   ritmo:.55 },
  taparse:   { brazoL:-98,  brazoR:98,  cabeza:10, salto:0, cara:'dolor',  piernas:0, gesto:'sollozar', ritmo:1.5 },
  desafiante:{ brazoL:30,   brazoR:-30,  cabeza:-5, salto:0, cara:'dolor',  piernas:0, gesto:'pecho',    ritmo:1 },
  alivio:    { brazoL:-20,  brazoR:20,   cabeza:6,  salto:0, cara:'normal', piernas:0, gesto:'jadear',   ritmo:1.4 },
  firmar:    { brazoL:8,    brazoR:-52,  cabeza:4,  salto:0, cara:'normal', piernas:0, gesto:'mostrar',  ritmo:1.2 },
  nervioso:  { brazoL:12,   brazoR:-12,  cabeza:2,  salto:0, cara:'normal', piernas:3, gesto:'temblar',  ritmo:.8 },
  // Poses de vida cotidiana: se sienta, salta, se estira, se seca la frente.
  sentado:   { brazoL:16,   brazoR:-16,  cabeza:2,  salto:0, cara:'normal', piernas:4, gesto:'respirar', ritmo:2.6 },
  saltar:    { brazoL:-120, brazoR:120,  cabeza:-6, salto:6, cara:'feliz',  piernas:0, gesto:'agitar',   ritmo:.45 },
  estirar:   { brazoL:-134, brazoR:134,  cabeza:-8, salto:0, cara:'normal', piernas:0, gesto:'mostrar',  ritmo:2.2 },
  sofocado:  { brazoL:26,   brazoR:-26,  cabeza:14, salto:0, cara:'triste', piernas:3, gesto:'jadear',   ritmo:.9 },
  // Alzar un bebé: los dos antebrazos se cierran hacia el pecho formando la cuna.
  // Antes los dos brazos giraban para el MISMO lado y el bebé quedaba flotando al
  // costado, sin nada que lo sostuviera.
  bebe:      { brazoL:64,   brazoR:-64,  cabeza:4,  salto:0, cara:'feliz',  piernas:0, gesto:'acunar',   ritmo:2.4 }
};
// Cada gesto define cuánto y cómo rotan los brazos ENCIMA de la pose base, y si
// el brazo derecho copia al izquierdo (espejo) o va en contrafase.
const AV_GESTOS = {
  respirar: { amp:3,  dur:3.6, espejo:true  },
  braceo:   { amp:26, dur:0.7, espejo:false },
  agitar:   { amp:22, dur:0.5, espejo:true  },
  levantar: { amp:9,  dur:1.1, espejo:true  },
  hundirse: { amp:4,  dur:4.0, espejo:true  },
  dolor:    { amp:7,  dur:1.2, espejo:false },
  meditar:  { amp:5,  dur:3.0, espejo:false },
  saludar:  { amp:24, dur:0.6, espejo:false },
  mostrar:  { amp:8,  dur:1.8, espejo:true  },
  temblar:  { amp:6,  dur:0.22,espejo:false },
  jadear:   { amp:5,  dur:1.0, espejo:true  },
  aplaudir: { amp:20, dur:0.34,espejo:false },
  pecho:    { amp:6,  dur:2.2, espejo:true  },
  sollozar: { amp:5,  dur:1.4, espejo:true  },
  acunar:   { amp:4,  dur:2.6, espejo:true  }
};

// Vestuarios disponibles. `pantalon` dibuja pierna larga (fuera de la cancha
// nadie anda en short), `sinNumero` saca el dorsal de la ropa de calle.
const AV_ROPAS = {
  dt:        { n:'Buzo de técnico', base:'#1d2a35', alt:'#33475a', pantalon:'#16202a', sinNumero:true, manga:'larga' },
  // Un médico tiene ropa de médico: ambo y guardapolvo blanco, no un saco de TV.
  medico:    { n:'Ambo de médico',  base:'#e9f2f5', alt:'#2e7d8f', tipo:'medico', pantalon:'#dbe7eb', sinNumero:true, manga:'larga' },
  enfermero: { n:'Ambo sanitario',  base:'#4fb3a1', alt:'#e9f2f5', tipo:'medico', pantalon:'#2f7f72', sinNumero:true, manga:'larga' },
  // 'sash' dibujaba una banda diagonal y parecia una camiseta de futbol. El traje
  // se arma con el saco (av.traje) y una camisa clara al medio.
  tv:        { n:'Saco de panelista', base:'#1b2330', alt:'#e8e8e0', tipo:'camisa', pantalon:'#141a24', sinNumero:true, saco:true, manga:'larga' },
  traje:     { n:'Traje', base:'#14181f', alt:'#dfe3ea', tipo:'camisa', pantalon:'#0e1116', sinNumero:true, saco:true, manga:'larga' },
  empresario:{ n:'Camisa y saco', base:'#1a2b22', alt:'#eef3ee', tipo:'camisa', pantalon:'#121d17', sinNumero:true, saco:true, manga:'larga' },
  escuela:   { n:'Buzo de la escuela', base:'#b8551a', alt:'#f5a05a', pantalon:'#2a2016', sinNumero:true, manga:'larga' },
  calle:     { n:'Ropa de calle', base:'#3a4550', alt:'#8894a0', pantalon:'#1e2730', sinNumero:true },
  abrigo:    { n:'Campera', base:'#2b3a46', alt:'#5d7488', pantalon:'#1c242c', sinNumero:true, manga:'larga' },
  jubilado:  { n:'Cárdigan', base:'#5a4a38', alt:'#8a7358', pantalon:'#2e2a24', sinNumero:true, manga:'larga' },
  hincha:    { n:'De hincha', base:null, alt:null, sinNumero:false }   // usa el kit del club
};
/**
 * Sprite del jugador. 48×72 lógicos, escalados por `escala`.
 * o = {edad, kitBase, kitAlt, kitTxt, kitTipo, num, apellido, escala, pose,
 *      aura, capitan, dorso, anim, trofeo}
 */
// ── BEBÉ ─────────────────────────────────────────────────────────────────────
// Un recién nacido NO es una persona chiquita: es una cabeza grande, un cuerpito
// envuelto y nada más. Se dibuja aparte porque la grilla del sprite adulto no da
// para esto (antes un bebé de 0 años salía como un nene de escuela).
function bebeSprite(av, o){
  o = o || {};
  av = av || {};
  const P = AV_PIELES.find(x=>x.id===av.piel) || AV_PIELES[1];
  const HC = (AV_COLORES_PELO.find(x=>x.id===av.peloColor) || AV_COLORES_PELO[0]).c;
  const S = (o.escala || 2.4) * 0.62;
  const manta = av.gen === 'f' ? '#f3c3d8' : '#bcd8f2';
  const W = 22, H = 20, p = [];
  const R = (x,y,w,h,c)=>p.push(`<rect x="${(x*S).toFixed(1)}" y="${(y*S).toFixed(1)}" width="${(w*S).toFixed(1)}" height="${(h*S).toFixed(1)}" fill="${c}"/>`);
  // Cuerpo envuelto
  R(3,10,16,10,manta); R(3,10,16,2,_avShade(manta,22)); R(3,18,16,2,_avShade(manta,-22));
  // Cabeza (grande, como corresponde)
  R(5,1,12,10,P.c); R(5,1,1,10,P.s); R(16,1,1,10,P.d);
  R(5,1,12,2,HC);                                   // pelusa
  if (o.durmiendo){ R(8,6,2,1,'#16130f'); R(13,6,2,1,'#16130f'); }
  else { R(8,5,2,2,'#16130f'); R(13,5,2,2,'#16130f'); }
  R(10,8,3,1,'#a8635c');                            // boquita
  R(4,4,1,3,_avShade(P.c,-14)); R(17,4,1,3,_avShade(P.c,-14));   // orejas
  // Manitos asomando
  R(2,13,2,3,P.c); R(18,13,2,3,P.c);
  return `<svg width="${(W*S).toFixed(0)}" height="${(H*S).toFixed(0)}" viewBox="0 0 ${(W*S).toFixed(1)} ${(H*S).toFixed(1)}" style="display:block;overflow:visible;shape-rendering:crispEdges;">${p.join('')}</svg>`;
}

function avatarSprite(av, o){
  av = Object.assign(avatarDefault(), av || {});
  o = o || {};
  // Los primeros años se dibujan con el sprite de bebé.
  if (o.edad != null && o.edad <= 2) return bebeSprite(av, o);
  const P  = AV_PIELES.find(x=>x.id===av.piel) || AV_PIELES[1];
  let HCbase = (AV_COLORES_PELO.find(x=>x.id===av.peloColor) || AV_COLORES_PELO[0]).c;
  // Canas: mezcla progresiva hacia el gris
  const HC = av.canas ? _avMix(HCbase, '#cfcfc8', av.canas === 1 ? 0.42 : 0.78) : HCbase;
  const edad = o.edad != null ? o.edad : 24;
  const E = avEtapa(edad);
  const pose = AV_POSES[o.pose || 'idle'] || AV_POSES.idle;
  const S = o.escala || 4;
  const W = 48, H = 72;
  // ── ROPA ──────────────────────────────────────────────────────────────────
  // El jugador no puede andar con la camiseta de fútbol el resto de su vida. Cada
  // etapa y cada rol tienen su propia ropa: buzo de técnico, saco de dirigente,
  // camisa de panelista, ropa de calle, cárdigan de jubilado.
  const ROPA = o.ropa ? (AV_ROPAS[o.ropa] || null) : null;
  // Si está preso, el kit se reemplaza por el uniforme naranja
  const preso = !!av.preso;
  const base = preso ? '#e07b18' : ROPA ? ROPA.base : (o.kitBase || '#1b7a3e');
  const alt  = preso ? '#f2a340' : ROPA ? ROPA.alt  : (o.kitAlt  || '#ffffff');
  const tipo = preso ? 'stripes' : ROPA ? (ROPA.tipo||'solid') : (o.kitTipo || 'solid');
  const kitTxt = preso ? '#3d1f04' : ROPA ? _avContraste(ROPA.base) : (o.kitTxt || _avContraste(base));
  const pantalon = ROPA && ROPA.pantalon ? ROPA.pantalon : null;   // pierna larga
  const sinNumero = !!(ROPA && ROPA.sinNumero);
  const baseS = _avShade(base, -26), baseL = _avShade(base, 20);
  const uid = 'av' + Math.random().toString(36).slice(2,8);
  const p = [];
  const R = (x,y,w,h,c,op)=>{ if(w<=0||h<=0) return; p.push(`<rect x="${(x*S).toFixed(1)}" y="${(y*S).toFixed(1)}" width="${(w*S).toFixed(1)}" height="${(h*S).toFixed(1)}" fill="${c}"${op?` opacity="${op}"`:''}/>`); };

  // ── Geometría ──
  const cx = W/2, pisoY = 68;
  const alturaTotal = 56 * E.esc;
  const topY = pisoY - alturaTotal;
  const cabezaH = Math.round(13 * E.cabeza * (0.85 + 0.15*E.esc));
  const cabezaW = Math.round(11 * E.cabeza * (0.85 + 0.15*E.esc));
  const headX = Math.round(cx - cabezaW/2);
  const headY = Math.round(topY) - pose.salto;
  const cuelloY = headY + cabezaH;
  // El peso cambia el ancho del torso
  const gordo = av.peso > 0 ? 3 : av.peso < 0 ? -2 : 0;
  // ── CUERPO FEMENINO ──
  // Hombros más angostos, cadera más ancha y cintura marcada. Sin esto, cambiar el
  // pelo no alcanzaba: la pareja del jugador se veía como un hombre con peluca.
  const fem = av.gen === 'f';
  const hombroW = Math.max(6, Math.round(18 * E.hombro * (fem ? 0.78 : 1)) + gordo);
  const torsoX = Math.round(cx - hombroW/2);
  const torsoY = cuelloY + 2;
  // El torso, el short y las piernas se REPARTEN el espacio que queda entre el
  // cuello y el piso. Antes cada tramo se calculaba por separado (20/9 × escala) y
  // en los cuerpos chicos la cabeza —que escala aparte, más grande— se comía todo
  // el alto: la altura de la pierna daba NEGATIVA y el pibe salía sin piernas.
  const cuerpoDisp = Math.max(6, (pisoY - 2) - torsoY);
  const torsoH = Math.max(3, Math.round(cuerpoDisp * 0.513));
  const shortH = Math.max(2, Math.round(cuerpoDisp * 0.231));
  const shortY = torsoY + torsoH;
  const piernaY = shortY + shortH;
  const piernaH = Math.max(2, (pisoY - 2) - piernaY);

  // Sombra
  p.push(`<ellipse cx="${(cx*S).toFixed(1)}" cy="${((pisoY+1.5)*S).toFixed(1)}" rx="${(hombroW*0.62*S).toFixed(1)}" ry="${(2.4*S).toFixed(1)}" fill="rgba(0,0,0,.34)"/>`);

  // ── PIERNAS (con ciclo de movimiento) ──
  const pw = Math.max(2, Math.round(hombroW*(fem ? 0.26 : 0.30))), gapP = Math.round(hombroW*0.10);
  const lx1 = Math.round(cx - gapP/2 - pw), lx2 = Math.round(cx + gapP/2);
  const piernaSVG = [];
  [[lx1,-1],[lx2,1]].forEach(([lx,dir],i)=>{
    const ang = pose.piernas === 0 ? 0
              : pose.piernas === 4 ? 74 * (i===0?1:1)      // sentado: las dos hacia adelante
              : (pose.piernas === 2 ? 34 : pose.piernas === 1 ? 20 : 9) * (i===0?-1:1);
    const ox = (lx + pw/2) * S, oy = piernaY * S;
    let seg = '';
    const SR=(x,y,w,h,c)=>{ if(w<=0||h<=0)return; seg += `<rect x="${(x*S).toFixed(1)}" y="${(y*S).toFixed(1)}" width="${(w*S).toFixed(1)}" height="${(h*S).toFixed(1)}" fill="${c}"/>`; };
    SR(lx, piernaY, pw, piernaH, P.c);
    SR(lx, piernaY, 1, piernaH, P.s);
    SR(lx+pw-1, piernaY, 1, piernaH, P.d);
    // Vendaje de lesión en la rodilla
    if (av.vendaje && i===0) SR(lx-1, piernaY+Math.round(piernaH*0.30), pw+2, 3, '#f0ece0');
    if (pantalon){
      // Pantalón largo: tapa la pierna entera hasta el zapato.
      SR(lx, piernaY, pw, piernaH-1, pantalon);
      SR(lx, piernaY, 1, piernaH-1, _avShade(pantalon,-24));
      SR(lx+pw-1, piernaY, 1, piernaH-1, _avShade(pantalon,-34));
    } else {
      const medH = Math.round(piernaH*0.42);
      SR(lx, piernaY+piernaH-medH, pw, medH, base);
      SR(lx, piernaY+piernaH-medH, 1, medH, baseS);
    }
    SR(lx-1, pisoY-2, pw+2, 2, '#15150f');
    SR(lx-1, pisoY-2, pw+2, 1, '#2a2a20');
    piernaSVG.push(ang ? `<g transform="rotate(${ang} ${ox.toFixed(1)} ${oy.toFixed(1)})">${seg}</g>` : seg);
  });

  // ── SHORT / PANTALÓN ── (la cadera manda: en el cuerpo femenino es más ancha)
  const shW = Math.max(4, (hombroW - 1) + (fem ? 6 : 0)), shX = Math.round(cx - shW/2);
  const shortCol = preso ? '#c96a10' : pantalon ? pantalon : ((alt||'').toLowerCase()===(base||'').toLowerCase() ? '#f2f2ee' : alt);
  // POLLERA: con ropa de civil, el cuerpo femenino usa pollera acampanada en vez
  // de pantalón. Es lo que más rápido hace leer "mujer" a este tamaño.
  const falda = fem && !!pantalon && !preso && av.falda !== false;
  if (falda){
    const fH = Math.max(3, Math.round(shortH * 2.1));
    for (let i = 0; i < fH; i++){
      const w = shW + Math.round((i / fH) * (shW * 0.85));
      R(Math.round(cx - w/2), shortY + i, w, 1, base);
    }
    R(Math.round(cx - (shW*1.85)/2), shortY + fH - 1, Math.round(shW*1.85), 1, _avShade(base,-32));
  }
  R(shX, shortY, shW, shortH, falda ? base : shortCol);
  R(shX, shortY, 1, shortH, _avShade(shortCol,-30));
  R(shX+shW-1, shortY, 1, shortH, _avShade(shortCol,-40));
  R(shX, shortY+shortH-1, shW, 1, _avShade(shortCol,-45));
  R(Math.round(cx)-1, shortY+2, 2, shortH-2, _avShade(shortCol,-22));

  // ── TORSO ──
  // SILUETA: en el cuerpo femenino el torso se dibuja fila por fila con un ancho
  // que cambia (hombros → busto → CINTURA → cadera). Los píxeles de la cintura
  // sencillamente no se pintan, así que la curva se ve de verdad; antes era un
  // rectángulo con una sombrita al costado y se leía como un hombre flaco.
  const _fw = (i)=>{                       // ancho de la fila i del torso
    if (!fem) return hombroW;
    const t = i / Math.max(1, torsoH - 1);
    if (t < 0.16) return hombroW;                       // hombros
    if (t < 0.44) return hombroW + 2;                   // busto
    if (t < 0.66) return Math.max(4, hombroW - 3);      // cintura
    return hombroW + 4;                                 // cadera
  };
  const _fx = (i)=> Math.round(cx - _fw(i)/2);
  if (fem){
    for (let i = 0; i < torsoH; i++) R(_fx(i), torsoY+i, _fw(i), 1, base);
  } else {
    R(torsoX, torsoY, hombroW, torsoH, base);
  }
  if (tipo === 'stripes'){
    const ancho = Math.max(1, Math.round(hombroW/9));
    for (let i = ancho; i < hombroW-1; i += ancho*2) R(torsoX+i, torsoY, ancho, torsoH, alt);
  } else if (tipo === 'sash'){
    for (let i = 0; i < torsoH; i++){
      const sx = torsoX + Math.round(i * (hombroW/torsoH)) - Math.round(hombroW*0.22);
      const w = Math.round(hombroW*0.26);
      const x0 = Math.max(torsoX, sx), x1 = Math.min(torsoX+hombroW, sx+w);
      if (x1 > x0) R(x0, torsoY+i, x1-x0, 1, alt);
    }
  } else if (tipo === 'banda'){
    R(torsoX, torsoY + Math.round(torsoH*0.36), hombroW, Math.max(2, Math.round(torsoH*0.24)), alt);
  } else if (tipo === 'camisa'){
    // Camisa clara al medio, saco a los costados: eso es un traje.
    const cW = Math.max(3, Math.round(hombroW*0.40));
    R(Math.round(cx - cW/2), torsoY, cW, torsoH, alt);
    R(Math.round(cx)-1, torsoY+2, 2, Math.round(torsoH*0.55), '#8a1f2a');   // corbata
    R(Math.round(cx - cW/2), torsoY, 1, torsoH, _avShade(alt,-30));
    R(Math.round(cx + cW/2)-1, torsoY, 1, torsoH, _avShade(alt,-30));
  } else if (tipo === 'medico'){
    // Guardapolvo: solapas y bolsillo, con el ambo asomando.
    R(torsoX+1, torsoY, hombroW-2, torsoH, base);
    R(Math.round(cx - hombroW*0.16), torsoY, Math.round(hombroW*0.32), torsoH, alt);
    R(torsoX+1, torsoY, 1, torsoH, _avShade(base,-28));
    R(torsoX+hombroW-2, torsoY, 1, torsoH, _avShade(base,-28));
    R(torsoX+2, torsoY+Math.round(torsoH*0.58), 3, 3, _avShade(base,-24));   // bolsillo
    R(Math.round(cx)-2, torsoY+2, 4, 1, '#c0392b');                          // estetoscopio
    R(Math.round(cx)-3, torsoY+3, 1, 3, '#c0392b'); R(Math.round(cx)+2, torsoY+3, 1, 3, '#c0392b');
  }
  if (fem){
    // Los bordes y las luces siguen la curva del cuerpo, no una caja.
    for (let i = 0; i < torsoH; i++){
      R(_fx(i), torsoY+i, 1, 1, baseS);
      R(_fx(i)+_fw(i)-1, torsoY+i, 1, 1, _avShade(base,-34));
    }
    // Busto: dos volúmenes con su sombra debajo.
    const buY = torsoY + Math.round(torsoH*0.26), buW = Math.max(2, Math.round(hombroW*0.34));
    R(Math.round(cx)-buW-1, buY, buW, 2, _avShade(base, 14));
    R(Math.round(cx)+1,     buY, buW, 2, _avShade(base, 14));
    R(Math.round(cx)-buW-1, buY+2, buW, 1, _avShade(base,-22));
    R(Math.round(cx)+1,     buY+2, buW, 1, _avShade(base,-22));
  } else {
    R(torsoX, torsoY, 2, torsoH, baseS);
    R(torsoX+hombroW-2, torsoY, 2, torsoH, baseS);
  }
  R(torsoX+2, torsoY, hombroW-4, 1, baseL);
  R(torsoX, torsoY+torsoH-2, hombroW, 2, baseS);
  // Panza si está pasado de kilos (se marca también fuera de la silueta del torso
  // para que el cambio de cuerpo se note de verdad, no sólo por un tono distinto).
  if (av.peso > 0){
    R(torsoX+1, torsoY+Math.round(torsoH*0.52), hombroW-2, Math.round(torsoH*0.46), _avShade(base,-12));
    R(torsoX-1, torsoY+Math.round(torsoH*0.60), 1, Math.round(torsoH*0.32), _avShade(base,-12));
    R(torsoX+hombroW, torsoY+Math.round(torsoH*0.60), 1, Math.round(torsoH*0.32), _avShade(base,-12));
  } else if (av.peso < 0){
    // Flaco: se le marcan las costillas/hombros con una sombra vertical.
    R(torsoX+2, torsoY+Math.round(torsoH*0.34), 1, Math.round(torsoH*0.34), _avShade(base,-16));
    R(torsoX+hombroW-3, torsoY+Math.round(torsoH*0.34), 1, Math.round(torsoH*0.34), _avShade(base,-16));
  }
  // Saco de dirigente/empresario encima de la camiseta
  if (av.traje){
    R(torsoX, torsoY, Math.round(hombroW*0.34), torsoH, '#1c2230');
    R(torsoX+hombroW-Math.round(hombroW*0.34), torsoY, Math.round(hombroW*0.34), torsoH, '#1c2230');
    R(torsoX, torsoY, Math.round(hombroW*0.34), 1, '#2c3444');
    R(torsoX+hombroW-Math.round(hombroW*0.34), torsoY, Math.round(hombroW*0.34), 1, '#2c3444');
    R(Math.round(cx)-1, torsoY+2, 2, Math.round(torsoH*0.45), '#8a1f2a');    // corbata
  }
  const cuW = Math.round(hombroW*0.36), cuX = Math.round(cx - cuW/2);
  R(cuX, torsoY, cuW, 2, _avShade(base,-48));
  R(cuX+1, torsoY, cuW-2, 1, P.d);
  // Cadenas de oro cuando te hacés rico
  if (av.bling >= 1){ R(cuX, torsoY+2, cuW, 1, '#f5d14e'); R(Math.round(cx)-1, torsoY+3, 2, 2, '#f5d14e'); }
  if (av.bling >= 2){ R(cuX-1, torsoY+4, cuW+2, 1, '#f5d14e'); }

  // ── NOMBRE Y NÚMERO ──
  const ape = String(o.apellido||'').toUpperCase().slice(0,12);
  const num = String(o.num||'');
  const dorso = !!o.dorso;
  let textos = '';
  if (!preso && dorso){
    if (ape) textos += `<text x="${(cx*S).toFixed(1)}" y="${((torsoY+5)*S).toFixed(1)}" text-anchor="middle" font-family="Outfit,Arial Black,sans-serif" font-weight="900" font-size="${(3.4*S).toFixed(1)}" fill="${kitTxt}" textLength="${(hombroW*0.82*S).toFixed(1)}" lengthAdjust="spacingAndGlyphs" style="letter-spacing:.4px">${esc(ape)}</text>`;
    if (num) textos += `<text x="${(cx*S).toFixed(1)}" y="${((torsoY+torsoH*0.82)*S).toFixed(1)}" text-anchor="middle" font-family="Outfit,Arial Black,sans-serif" font-weight="900" font-size="${(11*S*E.esc).toFixed(1)}" fill="${kitTxt}" style="letter-spacing:-.5px">${esc(num)}</text>`;
  } else if (!preso && !av.traje && !sinNumero && num){
    textos += `<text x="${((torsoX+hombroW*0.26)*S).toFixed(1)}" y="${((torsoY+torsoH*0.52)*S).toFixed(1)}" text-anchor="middle" font-family="Outfit,Arial Black,sans-serif" font-weight="900" font-size="${(4.6*S*E.esc).toFixed(1)}" fill="${kitTxt}">${esc(num)}</text>`;
  } else if (preso){
    textos += `<text x="${(cx*S).toFixed(1)}" y="${((torsoY+torsoH*0.5)*S).toFixed(1)}" text-anchor="middle" font-family="Outfit,monospace" font-weight="900" font-size="${(3.6*S).toFixed(1)}" fill="#3d1f04">${(o.num||'000')}</text>`;
  }
  if (!dorso && !preso && !av.traje && !sinNumero) R(Math.round(torsoX+hombroW*0.62), torsoY+Math.round(torsoH*0.28), 3, 4, kitTxt === '#ffffff' ? 'rgba(255,255,255,.75)' : 'rgba(0,0,0,.5)');
  if (o.capitan || av.capitanPerm) { R(torsoX-1, torsoY+Math.round(torsoH*0.22), 3, 4, '#facc15'); R(torsoX-1, torsoY+Math.round(torsoH*0.22), 3, 1, '#fde68a'); }

  // ── BRAZOS ──
  const brW = Math.max(2, Math.round(hombroW*0.19));
  const brH = Math.round(torsoH*0.92);
  const hombroY = torsoY + 2;
  const brazos = [
    { x: torsoX - brW, ang: pose.brazoL, i:0 },
    { x: torsoX + hombroW, ang: pose.brazoR, i:1 }
  ].map(b=>{
    const ox = (b.x + brW/2) * S, oy = (hombroY + 1) * S;
    const manoY = hombroY + brH;
    const mangaCol = av.traje ? '#1c2230' : (tipo==='medico' ? base : (tipo==='stripes' ? alt : base));
    // MANGA LARGA: un traje, un guardapolvo o un cárdigan no dejan el brazo al aire.
    // `manga` lo define la prenda; con el kit de fútbol sigue siendo corta.
    const mangaLarga = !!(ROPA && ROPA.manga === 'larga') || !!av.traje;
    const mangaF = mangaLarga ? 0.88 : 0.34;
    let g = '';
    g += `<rect x="${(b.x*S).toFixed(1)}" y="${(hombroY*S).toFixed(1)}" width="${(brW*S).toFixed(1)}" height="${(brH*Math.min(mangaF,0.34)*S).toFixed(1)}" fill="${mangaCol}"/>`;
    // Antebrazo levemente quebrado hacia adentro: sin esto, con los brazos muy
    // abiertos el miembro quedaba como un palo recto saliendo del hombro.
    const _cod = (Math.abs(b.ang) > 55) ? (b.i === 0 ? 1 : -1) : 0;
    g += `<rect x="${((b.x + _cod)*S).toFixed(1)}" y="${((hombroY+brH*0.34)*S).toFixed(1)}" width="${(brW*S).toFixed(1)}" height="${(brH*0.66*S).toFixed(1)}" fill="${P.c}"/>`;
    if (mangaLarga){
      g += `<rect x="${((b.x + _cod)*S).toFixed(1)}" y="${((hombroY+brH*0.34)*S).toFixed(1)}" width="${(brW*S).toFixed(1)}" height="${(brH*(mangaF-0.34)*S).toFixed(1)}" fill="${mangaCol}"/>`;
      g += `<rect x="${((b.x + _cod)*S).toFixed(1)}" y="${((hombroY+brH*mangaF-0.6)*S).toFixed(1)}" width="${(brW*S).toFixed(1)}" height="${(0.8*S).toFixed(1)}" fill="${_avShade(mangaCol,-26)}"/>`;
    }
    g += `<rect x="${(b.x*S).toFixed(1)}" y="${(hombroY*S).toFixed(1)}" width="${(1*S).toFixed(1)}" height="${(brH*S).toFixed(1)}" fill="${P.s}" opacity=".55"/>`;
    // Tatuajes acumulados
    const nt = Math.max(av.tatus||0, av.acc==='tatuajes'?1:0);
    for(let t=0;t<nt;t++) g += `<rect x="${(b.x*S).toFixed(1)}" y="${((hombroY+brH*(0.44+t*0.16))*S).toFixed(1)}" width="${(brW*S).toFixed(1)}" height="${(brH*0.11*S).toFixed(1)}" fill="${_avShade(P.c,-58)}" opacity=".78"/>`;
    if (av.acc==='muneq') g += `<rect x="${(b.x*S).toFixed(1)}" y="${((manoY-1.6)*S).toFixed(1)}" width="${(brW*S).toFixed(1)}" height="${(1.6*S).toFixed(1)}" fill="#baff00"/>`;
    // Reloj de oro
    if (av.bling >= 2 && b.i===1) g += `<rect x="${(b.x*S).toFixed(1)}" y="${((manoY-2)*S).toFixed(1)}" width="${(brW*S).toFixed(1)}" height="${(2*S).toFixed(1)}" fill="#f5d14e"/>`;
    g += `<rect x="${((b.x + _cod)*S).toFixed(1)}" y="${(manoY*S).toFixed(1)}" width="${(brW*S).toFixed(1)}" height="${(brW*1.1*S).toFixed(1)}" fill="${av.acc==='guantes'?'#f97316':P.c}"/>`;
    // El grupo EXTERNO es el que anima (la clase existía en el CSS pero no estaba
    // aplicada a ningún elemento, así que los brazos nunca se movían: de ahí la
    // sensación de "imagen firme"). El interno mantiene la rotación fija de la pose.
    return `<g class="${uid}arm${b.i===0?'L':'R'}" style="transform-origin:${ox.toFixed(1)}px ${oy.toFixed(1)}px;"><g transform="rotate(${b.ang} ${ox.toFixed(1)} ${oy.toFixed(1)})">${g}</g></g>`;
  }).join('');
  // Esposas si está detenido
  let extras = '';
  if (o.pose === 'esposado'){
    extras += `<rect x="${((cx-4)*S).toFixed(1)}" y="${((hombroY+brH+1)*S).toFixed(1)}" width="${(8*S).toFixed(1)}" height="${(2*S).toFixed(1)}" fill="#9aa0a6"/>`;
  }

  // ── CABEZA ──
  const cab = [];
  const CR = (x,y,w,h,c)=>{ if(w<=0||h<=0) return; cab.push(`<rect x="${(x*S).toFixed(1)}" y="${(y*S).toFixed(1)}" width="${(w*S).toFixed(1)}" height="${(h*S).toFixed(1)}" fill="${c}"/>`); };
  CR(Math.round(cx-cabezaW*0.20), cuelloY-1, Math.round(cabezaW*0.40), 3, P.s);
  CR(headX, headY, cabezaW, cabezaH, P.c);
  CR(headX, headY, 1, cabezaH, P.s);
  CR(headX+cabezaW-1, headY, 1, cabezaH, P.d);
  CR(headX+1, headY+cabezaH-2, cabezaW-2, 2, P.s);
  CR(headX+2, headY+1, cabezaW-5, 1, _avShade(P.c, 22));      // brillo en la frente
  CR(headX-1, headY+Math.round(cabezaH*0.42), 1, Math.round(cabezaH*0.22), P.s);
  CR(headX+cabezaW, headY+Math.round(cabezaH*0.42), 1, Math.round(cabezaH*0.22), P.s);
  const ojoY = headY + Math.round(cabezaH*0.42);
  const ojoW = Math.max(2, Math.round(cabezaW*0.20));
  const ojoIzq = headX + Math.round(cabezaW*0.18), ojoDer = headX + cabezaW - Math.round(cabezaW*0.18) - ojoW;
  const cejaOff = (pose.cara==='dolor' || pose.cara==='triste') ? 1 : 0;
  CR(ojoIzq, ojoY-2+cejaOff, ojoW, 1, _avShade(HC,-14));
  CR(ojoDer, ojoY-2+cejaOff, ojoW, 1, _avShade(HC,-14));
  if (pose.cara === 'feliz'){ CR(ojoIzq, ojoY+1, ojoW, 1, '#16130f'); CR(ojoDer, ojoY+1, ojoW, 1, '#16130f'); }
  else if (pose.cara === 'dolor'){ CR(ojoIzq, ojoY, ojoW, 1, '#16130f'); CR(ojoDer, ojoY, ojoW, 1, '#16130f'); }
  else {
    CR(ojoIzq, ojoY, ojoW, 2, '#f6f2e8'); CR(ojoDer, ojoY, ojoW, 2, '#f6f2e8');
    CR(ojoIzq+(ojoW>2?1:0), ojoY, 1, 2, '#16130f'); CR(ojoDer+(ojoW>2?1:0), ojoY, 1, 2, '#16130f');
  }
  // Anteojos
  if (av.lentes){
    CR(ojoIzq-1, ojoY-1, ojoW+2, 4, 'rgba(210,220,230,.30)');
    CR(ojoDer-1, ojoY-1, ojoW+2, 4, 'rgba(210,220,230,.30)');
    CR(ojoIzq-1, ojoY-1, ojoW+2, 1, '#2a2a2a'); CR(ojoDer-1, ojoY-1, ojoW+2, 1, '#2a2a2a');
    CR(ojoIzq-1, ojoY+3, ojoW+2, 1, '#2a2a2a'); CR(ojoDer-1, ojoY+3, ojoW+2, 1, '#2a2a2a');
    CR(ojoIzq+ojoW, ojoY, ojoDer-ojoIzq-ojoW, 1, '#2a2a2a');
  }
  // Párpados: rectángulos de piel encima de los ojos que aparecen al parpadear.
  if (pose.cara !== 'feliz' && pose.cara !== 'dolor'){
    cab.push(`<g class="${uid}eye" style="opacity:0">
      <rect x="${(ojoIzq*S).toFixed(1)}" y="${(ojoY*S).toFixed(1)}" width="${(ojoW*S).toFixed(1)}" height="${(2*S).toFixed(1)}" fill="${P.c}"/>
      <rect x="${(ojoDer*S).toFixed(1)}" y="${(ojoY*S).toFixed(1)}" width="${(ojoW*S).toFixed(1)}" height="${(2*S).toFixed(1)}" fill="${P.c}"/>
      <rect x="${(ojoIzq*S).toFixed(1)}" y="${((ojoY+1)*S).toFixed(1)}" width="${(ojoW*S).toFixed(1)}" height="${(0.6*S).toFixed(1)}" fill="${P.s}"/>
      <rect x="${(ojoDer*S).toFixed(1)}" y="${((ojoY+1)*S).toFixed(1)}" width="${(ojoW*S).toFixed(1)}" height="${(0.6*S).toFixed(1)}" fill="${P.s}"/>
    </g>`);
  }
  CR(headX+Math.round(cabezaW*0.45), ojoY+2, 1, 2, P.s);
  // Cicatrices de lesiones
  if (av.cicatriz >= 1) CR(ojoIzq-1, ojoY-3, 3, 1, _avShade(P.d,-20));
  if (av.cicatriz >= 2) CR(headX+cabezaW-3, ojoY+3, 2, 3, _avShade(P.d,-20));
  const bocaY = headY + Math.round(cabezaH*0.74);
  const bocaX = headX + Math.round(cabezaW*0.32), bocaW = Math.round(cabezaW*0.36);
  if (pose.cara === 'feliz'){ CR(bocaX, bocaY, bocaW, 2, '#7a3b34'); CR(bocaX, bocaY, bocaW, 1, '#f6f2e8'); }
  else if (pose.cara === 'triste'){ CR(bocaX, bocaY+1, bocaW, 1, P.d); CR(bocaX, bocaY, 1, 1, P.d); CR(bocaX+bocaW-1, bocaY, 1, 1, P.d); }
  else if (pose.cara === 'dolor'){ CR(bocaX, bocaY, bocaW, 2, '#5c2b26'); }
  else CR(bocaX, bocaY, bocaW, 1, P.d);
  // Barba
  // Un pibe no tiene barba, elija lo que elija en el editor.
  // Una mujer no tiene barba, la envejezca el juego lo que la envejezca.
  const barba = (fem || edad < 17) ? 0
              : Math.min(3, (edad < 20 ? Math.min(1, av.barba||0) : (av.barba||0)) + (edad>=32?1:0) + (edad>=45?1:0));
  if (barba >= 1){
    CR(headX+1, headY+Math.round(cabezaH*0.68), cabezaW-2, Math.round(cabezaH*0.30), HC);
    if (pose.cara==='feliz'){ CR(bocaX, bocaY, bocaW, 2, '#7a3b34'); CR(bocaX, bocaY, bocaW, 1, '#f6f2e8'); }
    else CR(bocaX, bocaY, bocaW, 1, _avShade(P.d,-18));
  }
  if (barba >= 2){
    CR(headX, headY+Math.round(cabezaH*0.48), 1, Math.round(cabezaH*0.42), HC);
    CR(headX+cabezaW-1, headY+Math.round(cabezaH*0.48), 1, Math.round(cabezaH*0.42), HC);
    CR(headX+Math.round(cabezaW*0.30), headY+Math.round(cabezaH*0.62), Math.round(cabezaW*0.40), 1, HC);
  }
  if (barba >= 3) CR(headX+1, headY+cabezaH-1, cabezaW-2, 3, HC);
  // PELO — la calvicie manda sobre el corte elegido
  // En el cuerpo femenino nunca hay calvicie de hombre grande y el corte por
  // defecto es largo: sin melena, cualquier mujer del juego se leía como varón.
  const pelo = fem ? ((['largo','colita','afro','rastas'].indexOf(av.pelo) >= 0) ? av.pelo : 'largo')
             : (av.calvicie >= 3 ? 'calvo' : av.calvicie === 2 ? 'coronilla' : av.pelo);
  // MELENA: cae por detrás de los hombros, hasta media espalda. Se dibuja en la
  // capa de la cabeza pero por debajo del pelo del cráneo.
  if (fem && (pelo === 'largo' || pelo === 'rastas' || pelo === 'afro')){
    const melH = Math.round((torsoH||10) * 0.62) + Math.round(cabezaH*0.5);
    CR(headX-1, headY+Math.round(cabezaH*0.30), 2, melH, HC);
    CR(headX+cabezaW-1, headY+Math.round(cabezaH*0.30), 2, melH, HC);
    CR(headX-1, headY+Math.round(cabezaH*0.30)+melH, cabezaW+2, 1, _avShade(HC,-18));
    CR(headX+1, headY+Math.round(cabezaH*0.30), cabezaW-2, 2, HC);
  }
  _avPelo(CR, pelo, headX, headY, cabezaW, cabezaH, HC, fem ? 0 : av.calvicie);
  // Pestañas y un toque de labio: detalles chicos que hacen leer la cara.
  if (fem){
    CR(ojoIzq-1, ojoY, 1, 1, _avShade(HC,-10));
    CR(ojoDer+ojoW, ojoY, 1, 1, _avShade(HC,-10));
    CR(bocaX, bocaY, bocaW, 1, '#a8515c');
  }
  // Cicatriz del implante capilar (línea fina en la frente)
  if (av.implante) CR(headX+2, headY+1, cabezaW-4, 1, _avShade(P.d,-6));
  if (av.acc === 'cinta') CR(headX-1, headY+Math.round(cabezaH*0.20), cabezaW+2, 2, '#baff00');

  // ── OBJETOS EN LAS MANOS ──
  let objeto = '';
  // EL BEBÉ EN BRAZOS. Se dibuja apoyado sobre los antebrazos, a la altura del
  // pecho, con una manito del adulto por encima: nunca más flotando en el aire.
  if (o.pose === 'bebe'){
    const bw = Math.max(7, Math.round(hombroW*0.62)), bh = Math.round(bw*0.62);
    const bx = Math.round(cx - bw/2), by = torsoY + Math.round(torsoH*0.34);
    const manta = (o.bebeGen === 'f') ? '#f3c3d8' : '#bcd8f2';
    const CO = (x,y,w,h,c)=>{ objeto += `<rect x="${(x*S).toFixed(1)}" y="${(y*S).toFixed(1)}" width="${(w*S).toFixed(1)}" height="${(h*S).toFixed(1)}" fill="${c}"/>`; };
    // Antebrazos cruzados POR DEBAJO: la cuna que lo sostiene.
    CO(bx-2, by+bh-1, bw+4, 2, P.c);
    CO(bx-2, by+bh+1, bw+4, 1, P.s);
    // El envuelto
    CO(bx, by+Math.round(bh*0.32), bw, Math.round(bh*0.68), manta);
    CO(bx, by+Math.round(bh*0.32), bw, 1, _avShade(manta,24));
    // Cabecita
    const cw = Math.round(bw*0.46), chh = Math.round(bh*0.50);
    CO(bx+bw-cw-1, by, cw, chh, P.c);
    CO(bx+bw-cw-1, by, cw, 1, _avShade(HC,0));
    CO(bx+bw-cw+1, by+Math.round(chh*0.5), 1, 1, '#16130f');
    CO(bx+bw-3, by+Math.round(chh*0.5), 1, 1, '#16130f');
    // Manito del adulto sobre la manta
    CO(bx+1, by+Math.round(bh*0.48), 2, 2, P.c);
  }
  if (o.pose === 'campeon'){
    const cxo = cx, cyo = headY - 11;
    const CO = (x,y,w,h,c)=>{ objeto += `<rect x="${(x*S).toFixed(1)}" y="${(y*S).toFixed(1)}" width="${(w*S).toFixed(1)}" height="${(h*S).toFixed(1)}" fill="${c}"/>`; };
    if (o.medalla){
      // En los Juegos Olimpicos se levanta una MEDALLA, no una copa.
      CO(cxo-1, cyo, 2, 7, '#3b6ea8'); CO(cxo-4, cyo, 3, 5, '#2a5488'); CO(cxo+1, cyo, 3, 5, '#2a5488');
      CO(cxo-4, cyo+7, 8, 8, '#f5d14e'); CO(cxo-3, cyo+8, 6, 6, '#fff3b0'); CO(cxo-2, cyo+10, 4, 3, '#c9a227');
    } else {
      CO(cxo-5, cyo, 10, 6, '#f5d14e'); CO(cxo-6, cyo, 1, 4, '#c9a227'); CO(cxo+5, cyo, 1, 4, '#c9a227');
      CO(cxo-4, cyo+1, 8, 2, '#fff3b0'); CO(cxo-2, cyo+6, 4, 3, '#c9a227'); CO(cxo-4, cyo+9, 8, 2, '#b8901f');
    }
  } else if (o.pose === 'posando'){
    // PRESENTACIÓN: el jugador SOSTIENE la camiseta con las dos manos, a la altura
    // de las manos levantadas. Antes la camiseta se dibujaba pegada al torso y los
    // brazos apuntaban los dos al mismo costado: parecía un maniquí con un palo.
    const manoDY = Math.cos(118*Math.PI/180) * brH;          // las manos suben
    const jh = Math.round(torsoH*0.86), jw = Math.round(hombroW*1.24);
    const jy = Math.round(hombroY + 1 + manoDY) - 1;
    const jx = Math.round(cx - jw/2);
    const mgW = Math.max(2, Math.round(jw*0.17)), mgH = Math.round(jh*0.34);
    const CO = (x,y,w,h,c)=>{ objeto += `<rect x="${(x*S).toFixed(1)}" y="${(y*S).toFixed(1)}" width="${(w*S).toFixed(1)}" height="${(h*S).toFixed(1)}" fill="${c}"/>`; };
    // Mangas colgando a los costados (le da silueta de camiseta, no de cartel)
    CO(jx - mgW, jy + 1, mgW, mgH, base);
    CO(jx + jw, jy + 1, mgW, mgH, base);
    CO(jx, jy, jw, jh, base);
    if (tipo === 'stripes'){ const an=Math.max(2,Math.round(jw/7)); for(let i=0;i<jw;i+=an*2) CO(jx+i, jy, an, jh, alt); }
    else if (tipo === 'sash'){
      for (let i=0;i<jh;i++){
        const sx = jx + Math.round(i*(jw/jh)) - Math.round(jw*0.22), w = Math.round(jw*0.26);
        const x0 = Math.max(jx, sx), x1 = Math.min(jx+jw, sx+w);
        if (x1 > x0) CO(x0, jy+i, x1-x0, 1, alt);
      }
    }
    else if (tipo === 'banda'){ CO(jx, jy + Math.round(jh*0.34), jw, Math.max(2, Math.round(jh*0.26)), alt); }
    CO(jx, jy, jw, 1, baseL); CO(jx, jy+jh-1, jw, 1, baseS);
    CO(jx, jy, 1, jh, baseS); CO(jx+jw-1, jy, 1, jh, baseS);
    CO(jx+Math.round(jw*0.38), jy, Math.round(jw*0.24), 2, _avShade(base,-50));   // cuello
    objeto += `<text x="${(cx*S).toFixed(1)}" y="${((jy+jh*0.74)*S).toFixed(1)}" text-anchor="middle" font-family="Outfit,Arial Black,sans-serif" font-weight="900" font-size="${(jh*0.62*S).toFixed(1)}" fill="${kitTxt}">${esc(String(o.num||''))}</text>`;
    if (o.apellido) objeto += `<text x="${(cx*S).toFixed(1)}" y="${((jy+jh*0.24)*S).toFixed(1)}" text-anchor="middle" font-family="Outfit,Arial Black,sans-serif" font-weight="900" font-size="${(2.9*S).toFixed(1)}" fill="${kitTxt}" textLength="${(jw*0.74*S).toFixed(1)}" lengthAdjust="spacingAndGlyphs">${esc(String(o.apellido).toUpperCase().slice(0,12))}</text>`;
  }
  // Muletas
  if (av.muletas){
    const mx = torsoX - brW - 3;
    objeto += `<rect x="${(mx*S).toFixed(1)}" y="${((hombroY+2)*S).toFixed(1)}" width="${(1.4*S).toFixed(1)}" height="${((pisoY-hombroY-2)*S).toFixed(1)}" fill="#8a8f86"/>`;
    objeto += `<rect x="${((mx-1)*S).toFixed(1)}" y="${((hombroY+2)*S).toFixed(1)}" width="${(3.4*S).toFixed(1)}" height="${(1.4*S).toFixed(1)}" fill="#6b7066"/>`;
  }

  // ── ENSAMBLADO ──
  // El viewBox se RECORTA al contenido real. Antes usaba el alto completo del
  // lienzo (72) y, como los personajes chicos arrancan más abajo, quedaba media
  // caja vacía arriba y las piernas apretadas contra el borde. Ahora el sprite
  // llena su marco a cualquier edad, con pies y sombra siempre visibles.
  // El aire de arriba se ajusta al PEINADO real: un mohicano necesita más que un
  // pelado. Así no queda media caja vacía cuando el corte es bajo.
  let overTop = pelo === 'mohawk' ? 8 : (pelo === 'afro' || pelo === 'tupe') ? 6 : 3;
  if (av.acc === 'cinta') overTop = Math.max(overTop, 3);
  if (o.pose === 'campeon') overTop = 17;              // la copa sube por encima de la cabeza
  if (pose.salto) overTop += pose.salto;
  const topContenido = headY - overTop;
  const botContenido = pisoY + 6;                      // piso + sombra + botines
  // ANCHO: los brazos muy rotados (festejo, campeón, saludo, posando) se abren
  // más allá del torso. Calculamos el alcance real para que la MANO nunca quede
  // cortada contra el borde del lienzo.
  // Se suma la amplitud del GESTO: si no, en mitad de la animación la mano se
  // sale del lienzo y queda cortada contra el borde.
  const _gAmp = ((AV_GESTOS[pose.gesto] || AV_GESTOS.respirar).amp) / 2;
  const alcance = Math.max(
    Math.abs(Math.sin((pose.brazoL - _gAmp) * Math.PI/180)),
    Math.abs(Math.sin((pose.brazoL + _gAmp) * Math.PI/180)),
    Math.abs(Math.sin((pose.brazoR - _gAmp) * Math.PI/180)),
    Math.abs(Math.sin((pose.brazoR + _gAmp) * Math.PI/180))
  ) * (brH + brW);
  const anchoObjeto = (o.pose === 'posando') ? (hombroW*1.24/2 + hombroW*0.17 + 2) : 0;
  const medioNecesario = Math.max((hombroW/2) + brW + alcance + 2, anchoObjeto + 2);
  const anchoLogico = Math.max(W, Math.ceil(medioNecesario * 2));
  const dx = (anchoLogico - W) / 2;                    // desplazamiento para centrar
  const vbY = topContenido * S;
  const vbH = (botContenido - topContenido) * S;
  const vbX = -dx * S;
  const cw = anchoLogico * S, ch = vbH;
  const cyBase = botContenido * S;                     // "suelo" en coordenadas del viewBox
  const aura = o.aura
    ? `<defs><radialGradient id="${uid}a"><stop offset="0%" stop-color="#facc15" stop-opacity=".42"/><stop offset="60%" stop-color="#facc15" stop-opacity=".12"/><stop offset="100%" stop-color="#facc15" stop-opacity="0"/></radialGradient></defs><ellipse cx="${(cx*S).toFixed(1)}" cy="${(vbY + vbH*0.6).toFixed(1)}" rx="${(cw*0.5).toFixed(1)}" ry="${(vbH*0.5).toFixed(1)}" fill="url(#${uid}a)"/>`
    : '';
  let anim = '';
  if (o.anim !== false){
    const ritmo = pose.ritmo || 1;
    const durN = pose.piernas === 2 ? 0.42 : pose.piernas === 1 ? 0.75 : 3.2 * ritmo;
    const dur = durN.toFixed(2) + 's';
    const amp = pose.piernas ? 1.1 : 0.5;
    const G_ = AV_GESTOS[pose.gesto] || AV_GESTOS.respirar;
    // Con las piernas en ciclo el braceo tiene que ir al compás del paso.
    const gDur = (pose.piernas ? durN : G_.dur).toFixed(2) + 's';
    // Desfases distintos por instancia para que dos avatares en pantalla no
    // parpadeen ni se muevan sincronizados (mata la sensación de "muñeco").
    const dp = (Math.random()*2.4).toFixed(2);
    const db = (2 + Math.random()*4).toFixed(1);
    const dh = (1.5 + Math.random()*3).toFixed(1);
    // Peso del cuerpo: los gordos se balancean más lento y más ancho.
    const bal = (av.peso > 0 ? 1.5 : av.peso < 0 ? 0.8 : 1);
    anim = `<style>
      /* Cuerpo: además del sube-baja, un cambio de apoyo lateral muy sutil.
         Un solo eje se lee como "imagen que late"; dos ejes se leen como cuerpo. */
      @keyframes ${uid}b{
        0%,100%{transform:translate(0,0) rotate(0deg)}
        28%{transform:translate(${(-0.25*bal*S).toFixed(2)}px,${(amp*0.7*S).toFixed(1)}px) rotate(-0.6deg)}
        50%{transform:translate(0,${(amp*S).toFixed(1)}px) rotate(0deg)}
        76%{transform:translate(${(0.25*bal*S).toFixed(2)}px,${(amp*0.7*S).toFixed(1)}px) rotate(0.6deg)}}
      .${uid}body{animation:${uid}b ${dur} ease-in-out infinite ${dp}s;transform-origin:${(cx*S).toFixed(1)}px ${cyBase.toFixed(1)}px}
      @keyframes ${uid}p{0%,100%{transform:rotate(0deg)}50%{transform:rotate(${pose.piernas===2?'-16':'-9'}deg)}}
      .${uid}pierna{animation:${uid}p ${dur} ease-in-out infinite;transform-origin:${(cx*S).toFixed(1)}px ${(piernaY*S).toFixed(1)}px}
      .${uid}pierna2{animation:${uid}p ${dur} ease-in-out infinite reverse;transform-origin:${(cx*S).toFixed(1)}px ${(piernaY*S).toFixed(1)}px}
      /* Cabeza: mira a los costados cada tanto — el gesto que más "da vida" */
      @keyframes ${uid}h{
        0%,42%{transform:translateX(0) rotate(0deg)}
        50%,62%{transform:translateX(${(-0.9*S).toFixed(1)}px) rotate(-3deg)}
        70%,86%{transform:translateX(${(0.9*S).toFixed(1)}px) rotate(3deg)}
        94%,100%{transform:translateX(0) rotate(0deg)}}
      .${uid}head{animation:${uid}h ${dh*3}s ease-in-out infinite ${dp}s;transform-origin:${(cx*S).toFixed(1)}px ${((cuelloY)*S).toFixed(1)}px}
      /* Parpadeo: los párpados bajan un instante */
      @keyframes ${uid}e{0%,95.5%{opacity:0}96%,98.5%{opacity:1}99%,100%{opacity:0}}
      .${uid}eye{animation:${uid}e ${db}s linear infinite ${dp}s}
      /* BRAZOS: el gesto propio de la pose. Antes esta regla apuntaba a una clase
         que no existía en el SVG y los brazos quedaban clavados. */
      @keyframes ${uid}aL{0%,100%{transform:rotate(${(-G_.amp/2).toFixed(1)}deg)}50%{transform:rotate(${(G_.amp/2).toFixed(1)}deg)}}
      @keyframes ${uid}aR{0%,100%{transform:rotate(${(G_.espejo?G_.amp/2:-G_.amp/2).toFixed(1)}deg)}50%{transform:rotate(${(G_.espejo?-G_.amp/2:G_.amp/2).toFixed(1)}deg)}}
      .${uid}armL{animation:${uid}aL ${gDur} ease-in-out infinite ${dp}s}
      .${uid}armR{animation:${uid}aR ${gDur} ease-in-out infinite ${dp}s}
      /* Con "reducir movimiento" activado NO apagamos todo: el personaje tiene que
         seguir sintiéndose vivo. Se cortan los desplazamientos grandes (caminar,
         correr, saltar) y se conservan el parpadeo y una respiración muy lenta,
         que no producen molestia vestibular. */
      @media (prefers-reduced-motion: reduce){
        .${uid}pierna,.${uid}pierna2{animation:none}
        .${uid}armL,.${uid}armR{animation-duration:7s}
        .${uid}body{animation-duration:6s}
        .${uid}head{animation-duration:14s}
      }
    </style>`;
  }
  const piernasHTML = (pose.piernas && pose.piernas !== 4)
    ? `<g class="${uid}pierna">${piernaSVG[0]}</g><g class="${uid}pierna2">${piernaSVG[1]}</g>`
    : piernaSVG.join('');
  // La cabeza va en su propio grupo para poder girarla sin mover el cuerpo.
  const cabezaHTML = `<g class="${uid}head">${cab.join('')}</g>`;
  return `<svg viewBox="${vbX.toFixed(1)} ${vbY.toFixed(1)} ${cw.toFixed(1)} ${vbH.toFixed(1)}" width="${cw.toFixed(1)}" height="${vbH.toFixed(1)}" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible;shape-rendering:crispEdges;">${anim}${aura}<g class="${uid}body">${piernasHTML}${p.join('')}${brazos}${extras}${textos}${cabezaHTML}${objeto}</g></svg>`;
}

function _avPelo(CR, tipo, hx, hy, hw, hh, c, calvicie){
  const cS = _avShade(c, -22), cL = _avShade(c, 26);
  // Entradas: el pelo retrocede en las sienes
  const ent = calvicie === 1 ? Math.round(hw*0.20) : 0;
  switch(tipo){
    case 'calvo':
      CR(hx+1, hy, hw-2, 1, _avShade(c, 40));
      CR(hx, hy+Math.round(hh*0.16), 1, Math.round(hh*0.14), c);
      CR(hx+hw-1, hy+Math.round(hh*0.16), 1, Math.round(hh*0.14), c); break;
    case 'coronilla':
      CR(hx, hy+Math.round(hh*0.06), 2, Math.round(hh*0.22), c);
      CR(hx+hw-2, hy+Math.round(hh*0.06), 2, Math.round(hh*0.22), c);
      CR(hx+1, hy, hw-2, 1, _avShade(c, 30)); break;
    case 'rapado':
      CR(hx+ent, hy, hw-ent*2, Math.round(hh*0.16), c);
      CR(hx+1+ent, hy, hw-2-ent*2, 1, cL); break;
    case 'corto':
      CR(hx-1+ent, hy-1, hw+2-ent*2, Math.round(hh*0.30), c);
      CR(hx-1, hy+Math.round(hh*0.18), 1, Math.round(hh*0.20), c);
      CR(hx+hw, hy+Math.round(hh*0.18), 1, Math.round(hh*0.20), c);
      CR(hx+1+ent, hy-1, hw-3-ent*2, 1, cL); break;
    case 'largo':
      CR(hx-1+ent, hy-1, hw+2-ent*2, Math.round(hh*0.28), c);
      CR(hx-2, hy, 2, Math.round(hh*1.05), c);
      CR(hx+hw, hy, 2, Math.round(hh*1.05), c);
      CR(hx+1+ent, hy-1, hw-3-ent*2, 1, cL); break;
    case 'afro':
      CR(hx-2, hy-4, hw+4, Math.round(hh*0.42), c);
      CR(hx-3, hy-2, 2, Math.round(hh*0.40), c);
      CR(hx+hw+1, hy-2, 2, Math.round(hh*0.40), c);
      CR(hx, hy-4, hw-2, 1, cL); break;
    case 'tupe':
      CR(hx-1+ent, hy-1, hw+2-ent*2, Math.round(hh*0.22), c);
      CR(hx+Math.round(hw*0.18), hy-Math.round(hh*0.30), Math.round(hw*0.62), Math.round(hh*0.32), c);
      CR(hx+Math.round(hw*0.22), hy-Math.round(hh*0.30), Math.round(hw*0.40), 1, cL); break;
    case 'mohawk':
      CR(hx, hy, hw, Math.round(hh*0.14), cS);
      CR(hx+Math.round(hw*0.34), hy-Math.round(hh*0.44), Math.round(hw*0.32), Math.round(hh*0.56), c);
      CR(hx+Math.round(hw*0.38), hy-Math.round(hh*0.44), Math.round(hw*0.16), Math.round(hh*0.20), cL); break;
    case 'rastas':
      CR(hx-1, hy-2, hw+2, Math.round(hh*0.26), c);
      // Mechas SOLO a los lados: por delante tapaban los ojos y la boca.
      [-2, -1, hw, hw+1].forEach((i,k)=> CR(hx+i, hy+Math.round(hh*0.10), 2, Math.round(hh*(0.85 + (k%2?0.25:0))), c));
      CR(hx+1, hy+Math.round(hh*0.20), 2, Math.round(hh*0.30), c);
      CR(hx+hw-3, hy+Math.round(hh*0.20), 2, Math.round(hh*0.30), c);
      break;
    case 'colita':
      CR(hx-1+ent, hy-1, hw+2-ent*2, Math.round(hh*0.26), c);
      CR(hx+hw, hy+Math.round(hh*0.16), 2, Math.round(hh*0.14), c);
      CR(hx+hw+1, hy+Math.round(hh*0.22), 3, Math.round(hh*0.44), c);
      CR(hx+1+ent, hy-1, hw-3-ent*2, 1, cL); break;
    default:
      CR(hx-1+ent, hy-1, hw+2-ent*2, Math.round(hh*0.28), c);
  }
}

// ── Kit del club actual (colores reales del país del CLUB, no del jugador) ─────
// Si estás con la selección, usa los colores de TU país.
// ── CAMISETAS DE CLUB (colores reales) ────────────────────────────────────────
// [base, secundario, tipo]. tipo: solid | stripes (rayas verticales) | sash (banda).
// El avatar usa SIEMPRE la del club donde juega; sólo con la selección usa la del país.
const CLUB_KITS = {
  // Uruguay
  'Nacional':['#ffffff','#1c4b9b','solid'], 'Peñarol':['#f5c400','#111111','stripes'],
  'Defensor Sporting':['#7b1fa2','#ffffff','solid'], 'Danubio':['#ffffff','#111111','sash'],
  'Liverpool FC (UY)':['#1a3d8f','#000000','stripes'], 'Montevideo City':['#7ec8e3','#ffffff','solid'],
  'Boston River':['#0d2b6b','#e63329','solid'], 'Cerro':['#1b6ec2','#ffffff','solid'],
  'Wanderers':['#000000','#ffffff','stripes'], 'Cerro Largo':['#1f7a3d','#ffffff','solid'],
  'Plaza Colonia':['#c8102e','#ffffff','solid'], 'Progreso':['#e63329','#ffffff','solid'],
  'River Plate (UY)':['#e2231a','#ffffff','sash'], 'Racing (UY)':['#1b6ec2','#ffffff','stripes'],
  // Argentina
  'Boca Juniors':['#0d1a5c','#f5c400','banda'], 'River Plate':['#ffffff','#e2231a','sash'],
  'Racing':['#7ec8e3','#ffffff','stripes'], 'Independiente':['#c8102e','#ffffff','solid'],
  'San Lorenzo':['#1a3d8f','#c8102e','stripes'], 'Rosario Central':['#f5c400','#1a3d8f','stripes'],
  "Newell's":['#c8102e','#000000','stripes'], 'Vélez':['#ffffff','#1a3d8f','sash'],
  'Estudiantes':['#c8102e','#ffffff','stripes'], 'Talleres':['#1b6ec2','#ffffff','stripes'],
  'Huracán':['#ffffff','#c8102e','solid'], 'Lanús':['#7b1c2e','#ffffff','solid'],
  'Banfield':['#1f7a3d','#ffffff','stripes'], 'Defensa y Justicia':['#f5c400','#1f7a3d','solid'],
  'Argentinos Jrs':['#c8102e','#ffffff','solid'], 'Gimnasia LP':['#1a3d8f','#ffffff','stripes'],
  'Godoy Cruz':['#1a3d8f','#f5c400','solid'], 'Tigre':['#1a3d8f','#c8102e','solid'],
  'Instituto':['#c8102e','#ffffff','stripes'], 'Belgrano':['#7ec8e3','#ffffff','stripes'],
  'Platense':['#ffffff','#7b2d8f','solid'], 'Central Córdoba':['#000000','#ffffff','stripes'],
  // Brasil
  'Flamengo':['#c8102e','#000000','stripes'], 'Palmeiras':['#1f7a3d','#ffffff','solid'],
  'São Paulo':['#ffffff','#c8102e','solid'], 'Corinthians':['#ffffff','#000000','solid'],
  'Grêmio':['#1b6ec2','#000000','stripes'], 'Internacional':['#c8102e','#ffffff','solid'],
  'Santos':['#ffffff','#000000','solid'], 'Fluminense':['#7b1c3d','#1f7a3d','stripes'],
  'Atlético MG':['#000000','#ffffff','stripes'], 'Botafogo':['#000000','#ffffff','stripes'],
  'Cruzeiro':['#1a3d8f','#ffffff','solid'], 'Vasco da Gama':['#000000','#ffffff','sash'],
  'Bahia':['#ffffff','#1b6ec2','solid'], 'Fortaleza':['#1a3d8f','#c8102e','stripes'],
  'Athletico PR':['#c8102e','#000000','stripes'], 'RB Bragantino':['#ffffff','#c8102e','solid'],
  'Vitória':['#c8102e','#000000','stripes'], 'Juventude':['#1f7a3d','#ffffff','stripes'],
  // España
  'Real Madrid':['#ffffff','#d4af37','solid'], 'Barcelona':['#0d2b6b','#a50044','stripes'],
  'Atlético':['#c8102e','#ffffff','stripes','#0d1a5c'], 'Sevilla':['#ffffff','#c8102e','solid'],
  'Valencia':['#ffffff','#f5820d','solid'], 'Real Sociedad':['#ffffff','#1b6ec2','stripes'],
  'Villarreal':['#f5d800','#1a3d8f','solid'], 'Betis':['#1f7a3d','#ffffff','stripes'],
  'Athletic':['#ffffff','#c8102e','stripes'], 'Girona':['#c8102e','#ffffff','stripes'],
  'Osasuna':['#c8102e','#0d2b6b','solid'], 'Getafe':['#1b6ec2','#ffffff','solid'],
  'Celta':['#7ec8e3','#ffffff','solid'], 'Rayo Vallecano':['#ffffff','#c8102e','sash'],
  'Mallorca':['#c8102e','#000000','solid'], 'Alavés':['#1a3d8f','#ffffff','stripes'],
  'Las Palmas':['#f5d800','#1b6ec2','solid'],
  // Inglaterra
  'Man City':['#7ec8e3','#ffffff','solid'], 'Liverpool':['#c8102e','#ffffff','solid'],
  'Arsenal':['#c8102e','#ffffff','solid'], 'Man United':['#c8102e','#000000','solid'],
  'Chelsea':['#1a3d8f','#ffffff','solid'], 'Tottenham':['#ffffff','#0d1a4a','solid'],
  'Newcastle':['#000000','#ffffff','stripes'], 'Aston Villa':['#7b1c3d','#7ec8e3','solid'],
  'Brighton':['#1b6ec2','#ffffff','stripes'], 'West Ham':['#7b1c3d','#7ec8e3','solid'],
  'Everton':['#0d2b6b','#ffffff','solid'], 'Wolves':['#f5a000','#000000','solid'],
  'Fulham':['#ffffff','#000000','solid'], 'Crystal Palace':['#c8102e','#1a3d8f','stripes'],
  'Brentford':['#c8102e','#ffffff','stripes'], 'Nottingham Forest':['#c8102e','#ffffff','solid'],
  'Bournemouth':['#c8102e','#000000','stripes'],
  // Italia
  'Juventus':['#ffffff','#000000','stripes'], 'Inter':['#1b6ec2','#000000','stripes'],
  'Milan':['#c8102e','#000000','stripes'], 'Napoli':['#1b9ee0','#ffffff','solid'],
  'Roma':['#7b1c2e','#f5a000','solid'], 'Lazio':['#7ec8e3','#ffffff','solid'],
  'Atalanta':['#1b6ec2','#000000','stripes'], 'Fiorentina':['#7b3d9e','#ffffff','solid'],
  'Bologna':['#c8102e','#0d2b6b','stripes'], 'Torino':['#7b1c2e','#ffffff','solid'],
  'Udinese':['#ffffff','#000000','stripes'], 'Genoa':['#c8102e','#0d2b6b','stripes'],
  'Monza':['#c8102e','#ffffff','solid'], 'Empoli':['#1b6ec2','#ffffff','solid'],
  'Como':['#1b6ec2','#ffffff','solid'],
  // Francia
  'PSG':['#0d1a4a','#c8102e','sash'], 'Marsella':['#ffffff','#7ec8e3','solid'],
  'Mónaco':['#c8102e','#ffffff','sash'], 'Lyon':['#ffffff','#1a3d8f','solid'],
  'Lille':['#c8102e','#1a3d8f','solid'], 'Rennes':['#c8102e','#000000','stripes'],
  'Niza':['#c8102e','#000000','stripes'], 'Lens':['#f5c400','#c8102e','stripes'],
  'Nantes':['#f5c400','#1f7a3d','solid'], 'Estrasburgo':['#1b6ec2','#ffffff','solid'],
  'Reims':['#c8102e','#ffffff','stripes'], 'Toulouse':['#7b3d9e','#ffffff','solid'],
  // Alemania
  'Bayern':['#c8102e','#ffffff','solid'], 'Dortmund':['#f5d800','#000000','solid'],
  'Leipzig':['#ffffff','#c8102e','solid'], 'Leverkusen':['#c8102e','#000000','solid'],
  'Frankfurt':['#000000','#c8102e','solid'], 'Stuttgart':['#ffffff','#c8102e','solid'],
  'Union Berlin':['#c8102e','#f5d800','solid'], 'Freiburg':['#c8102e','#ffffff','solid'],
  'Wolfsburg':['#1f7a3d','#ffffff','solid'], 'Mainz':['#c8102e','#ffffff','solid'],
  'Gladbach':['#ffffff','#000000','solid'], 'Hoffenheim':['#1b6ec2','#ffffff','solid'],
  'Werder Bremen':['#1f7a3d','#ffffff','solid'],
  // Portugal / Países Bajos / Bélgica / Turquía
  'Benfica':['#c8102e','#ffffff','solid'], 'Porto':['#1a3d8f','#ffffff','stripes'],
  'Sporting':['#1f9e5a','#ffffff','stripes'], 'Braga':['#c8102e','#ffffff','solid'],
  'Vitória SC':['#ffffff','#000000','solid'], 'Boavista':['#000000','#ffffff','stripes'],
  'Famalicão':['#ffffff','#1b6ec2','solid'], 'Gil Vicente':['#c8102e','#1a3d8f','stripes'],
  'Ajax':['#ffffff','#c8102e','sash'], 'PSV':['#c8102e','#ffffff','solid'],
  'Feyenoord':['#c8102e','#ffffff','solid'], 'AZ Alkmaar':['#c8102e','#ffffff','solid'],
  'Twente':['#c8102e','#ffffff','solid'], 'Utrecht':['#c8102e','#ffffff','solid'],
  'Vitesse':['#f5d800','#000000','solid'],
  'Anderlecht':['#7b1c8f','#ffffff','solid'], 'Club Brujas':['#1b6ec2','#000000','stripes'],
  'Genk':['#1b6ec2','#ffffff','solid'], 'Gante':['#1b6ec2','#ffffff','stripes'],
  'Standard':['#c8102e','#ffffff','solid'], 'Amberes':['#c8102e','#ffffff','solid'],
  'Galatasaray':['#c8102e','#f5c400','solid'], 'Fenerbahçe':['#f5d800','#0d2b6b','stripes'],
  'Beşiktaş':['#000000','#ffffff','stripes'], 'Trabzonspor':['#7b1c2e','#7ec8e3','solid'],
  'Başakşehir':['#f5820d','#0d2b6b','solid'],
  // México / USA
  'América':['#f5d800','#0d2b6b','solid'], 'Chivas':['#c8102e','#ffffff','stripes'],
  'Monterrey':['#1a3d8f','#ffffff','stripes'], 'Tigres':['#f5c400','#1a3d8f','solid'],
  'Cruz Azul':['#1a3d8f','#ffffff','solid'], 'Pumas':['#f5c400','#1a3d8f','solid'],
  'Toluca':['#c8102e','#ffffff','stripes'], 'León':['#1f7a3d','#ffffff','solid'],
  'Pachuca':['#1b6ec2','#ffffff','stripes'], 'Santos Laguna':['#1f7a3d','#ffffff','solid'],
  'Atlas':['#c8102e','#000000','stripes'], 'Necaxa':['#c8102e','#ffffff','solid'],
  'Inter Miami':['#f2a0c0','#000000','solid'], 'LA Galaxy':['#ffffff','#1a3d8f','solid'],
  'LAFC':['#000000','#d4af37','solid'], 'Atlanta United':['#c8102e','#000000','stripes'],
  'Seattle Sounders':['#1f9e5a','#1a3d8f','solid'], 'Portland Timbers':['#1f7a3d','#f5c400','solid'],
  'NY Red Bulls':['#ffffff','#c8102e','solid'], 'NYCFC':['#7ec8e3','#0d2b6b','solid'],
  'Columbus Crew':['#f5d800','#000000','solid'], 'FC Cincinnati':['#f5820d','#0d2b6b','solid'],
  // Resto
  'Colo-Colo':['#ffffff','#000000','solid'], 'U. de Chile':['#1a3d8f','#c8102e','solid'],
  'U. Católica':['#ffffff','#1a3d8f','sash'], 'Everton (CL)':['#1b6ec2','#f5d800','solid'],
  'Palestino':['#1f7a3d','#c8102e','solid'], 'Cobreloa':['#f5820d','#ffffff','solid'],
  'Atl. Nacional':['#1f7a3d','#ffffff','solid'], 'Millonarios':['#1a3d8f','#ffffff','solid'],
  'América de Cali':['#c8102e','#ffffff','solid'], 'Junior':['#c8102e','#ffffff','stripes'],
  'Ind. Medellín':['#c8102e','#1a3d8f','stripes'], 'Deportivo Cali':['#1f7a3d','#ffffff','solid'],
  'Dinamo Zagreb':['#1a3d8f','#ffffff','solid'], 'Hajduk Split':['#ffffff','#1b6ec2','solid'],
  'Rijeka':['#ffffff','#1a3d8f','stripes'], 'Osijek':['#1a3d8f','#ffffff','solid'],
  'RB Salzburg':['#c8102e','#ffffff','solid'], 'Sturm Graz':['#000000','#ffffff','solid'],
  'Rapid Viena':['#1f7a3d','#ffffff','solid'], 'Austria Viena':['#7b3d9e','#ffffff','solid'],
  'Vissel Kobe':['#7b1c2e','#ffffff','solid'], 'Urawa Reds':['#c8102e','#000000','solid'],
  'Kawasaki':['#1b6ec2','#000000','solid'], 'Yokohama FM':['#1a3d8f','#c8102e','solid'],
  'Kashima':['#7b1c2e','#ffffff','solid'],
  'Al-Nassr':['#f5d800','#1a3d8f','solid'], 'Al-Hilal':['#1a3d8f','#ffffff','solid'],
  'Al-Ittihad':['#f5d800','#000000','stripes'], 'Al-Ahli':['#1f7a3d','#ffffff','solid'],
  'Al-Shabab':['#ffffff','#000000','solid'], 'Al-Ettifaq':['#1f7a3d','#ffffff','solid']
};
// Kit del CLUB. Si el club no está en la tabla, genera colores estables a partir
// del nombre (hash) para que cada club amateur tenga igual su identidad propia.
function kitClub(nombre, paisFallback){
  const k = CLUB_KITS[nombre];
  // 4º valor opcional: color de texto forzado. En camisetas a rayas de dos
  // colores claros/fuertes (Atlético), el contraste automático contra el color
  // base no alcanza y el número se pierde sobre la franja contraria.
  if (k) return { base:k[0], alt:k[1], txt:k[3] || _avContraste(k[0]), tipo:k[2] };
  if (nombre){
    let h=0; for(let i=0;i<nombre.length;i++) h=(h*31+nombre.charCodeAt(i))>>>0;
    const hue = h % 360;
    // OJO: desplazamiento SIN SIGNO (>>>). Con >> los hashes grandes daban índice
    // negativo y `tipo` quedaba undefined, rompiendo el kit de los clubes amateur.
    const blanco = ((h>>>3) % 2) === 1;
    const tipo = ['solid','stripes','solid','sash'][(h>>>5) % 4] || 'solid';
    return {
      base: _hslHex(hue, 62, 42),
      alt:  blanco ? '#ffffff' : _hslHex((hue+180)%360, 55, 46),
      txt:  '#ffffff',
      tipo
    };
  }
  return kitDe(paisFallback);
}
function _hslHex(h,s,l){
  s/=100; l/=100;
  const k=n=>(n+h/30)%12, a=s*Math.min(l,1-l);
  const f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));
  return '#'+[f(0),f(8),f(4)].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('');
}
function kitDe(pais){
  const k = KITS[pais];
  if (k) return { base:k.c[0], alt:k.c[1]||'#ffffff', txt:k.txt||_avContraste(k.c[0]), tipo:k.t };
  return { base:'#1b7a3e', alt:'#ffffff', txt:'#ffffff', tipo:'solid' };
}
// Sprite del jugador ACTUAL de la partida.
function avatarDeG(escala, pose, opts){
  if(!G) return '';
  opts = opts || {};
  // Con la SELECCIÓN, la camiseta del país. En el club, la camiseta REAL DEL CLUB.
  const k = opts.seleccion ? kitDe(G.pais) : kitClub(G.club, G.clubPais || G.pais);
  return avatarSprite(G.avatar, {
    edad: opts.edad != null ? opts.edad : G.edad,
    kitBase:k.base, kitAlt:k.alt, kitTxt:k.txt, kitTipo:k.tipo,
    num: opts.seleccion ? (G.numSeleccion || G.num) : G.num,
    apellido: G.apellido,
    dorso: !!opts.dorso,
    pose: pose || 'idle',
    trofeo: opts.trofeo || null,
    medalla: !!opts.medalla,
    aura: opts.aura != null ? opts.aura : ((G.nivel||0) >= 88 || (G.titulos||0) >= 8),
    capitan: !!(G.idolatria && G.idolatria[G.club] >= 55),
    escala: escala || 4,
    anim: opts.anim
  });
}
// Marco reutilizable para mostrar el avatar (fondo de cancha nocturna, como el juego).
// overflow:visible para que el sprite NUNCA se corte (la copa y la camiseta
// levantada se dibujan por encima del alto nominal del lienzo).
// ── ESCENARIOS DEL RECUADRO ───────────────────────────────────────────────────
// El fondo cambia según el momento: no es lo mismo festejar un título en un
// estadio lleno que estar preso o entrenando de pibe en el potrero.
// Cada escenario define cielo, piso, borde y una CAPA DE FONDO propia (tribuna,
// paredón del potrero, azulejos del vestuario...). Antes eran nueve degradados
// casi idénticos y el recuadro se veía siempre igual pasara lo que pasara.
const AV_ESCENARIOS = {
  cancha:   { cielo:['#16200f','#0c1208'], piso:'rgba(70,140,50,.22)',  pisoSolido:'#2f5c24', borde:'#26361c', luz:null,      fondo:'cesped' },
  estadio:  { cielo:['#1a1030','#0a0716'], piso:'rgba(90,70,160,.20)',  pisoSolido:'#2d6b2a', borde:'#3a2a5c', luz:'#facc15', fondo:'tribuna' },
  potrero:  { cielo:['#2a1f10','#120d06'], piso:'rgba(150,110,50,.24)', pisoSolido:'#6b4a22', borde:'#3d2c15', luz:'#ff9c3c', fondo:'paredon' },
  vestuario:{ cielo:['#101a20','#070c10'], piso:'rgba(60,110,140,.18)', pisoSolido:'#243a44', borde:'#1e3038', luz:'#7dd3fc', fondo:'lockers' },
  carcel:   { cielo:['#1c1c1e','#0a0a0b'], piso:'rgba(120,120,120,.14)',pisoSolido:'#3a3a3c', borde:'#333',    luz:null,      fondo:'rejas' },
  hospital: { cielo:['#0e1a1c','#060c0e'], piso:'rgba(80,160,170,.18)', pisoSolido:'#2a4a4e', borde:'#1c3236', luz:'#67e8f9', fondo:'clinica' },
  noche:    { cielo:['#0d1424','#05080f'], piso:'rgba(50,80,140,.16)',  pisoSolido:'#2b3038', borde:'#1a2438', luz:null,      fondo:'ciudad' },
  oficina:  { cielo:['#1a1710','#0b0a07'], piso:'rgba(160,130,60,.16)', pisoSolido:'#4a3a22', borde:'#332c1a', luz:'#facc15', fondo:'ventanal' },
  casa:     { cielo:['#1e1628','#0c0912'], piso:'rgba(140,100,180,.16)',pisoSolido:'#4a3520', borde:'#2e2440', luz:null,      fondo:'living' },
  lluvia:   { cielo:['#131b22','#070b0e'], piso:'rgba(90,120,140,.18)', pisoSolido:'#2c3a42', borde:'#22303a', luz:null,      fondo:'lluvia' }
};
// Elige el escenario que corresponde a la pose y al estado del jugador.
function escenaDePose(pose, av, edad){
  if (av && av.preso) return 'carcel';
  if (av && (av.muletas || av.vendaje)) return 'hospital';
  if (pose === 'campeon' || pose === 'festejo' || pose === 'gol' || pose === 'aplaudir') return 'estadio';
  if (pose === 'esposado') return 'carcel';
  if (pose === 'lesion') return 'hospital';
  if (pose === 'rico') return 'oficina';
  if (pose === 'llorar' || pose === 'taparse') return 'vestuario';
  if (pose === 'bajon' || pose === 'pensativo') return 'lluvia';
  if (pose === 'nervioso' || pose === 'alivio' || pose === 'firmar') return 'vestuario';
  if (pose === 'posando') return 'estadio';
  if (edad != null && edad <= 15) return 'potrero';
  if (av && av.traje) return 'oficina';
  return 'cancha';
}
// Capa decorativa de fondo, en CSS puro (sin imágenes) y detrás del jugador.
function _escFondo(tipo){
  const S = 'position:absolute;inset:0;border-radius:11px;pointer-events:none;';
  switch(tipo){
    case 'cesped':
      return `<div style="${S}background:repeating-linear-gradient(90deg, rgba(90,170,60,.09) 0 9px, transparent 9px 18px);"></div>
        <div style="position:absolute;left:12%;right:12%;bottom:24%;height:1px;background:rgba(255,255,255,.13);pointer-events:none;"></div>`;
    case 'tribuna':
      return `<div style="${S}background:repeating-linear-gradient(90deg, rgba(255,255,255,.055) 0 3px, transparent 3px 7px), repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 2px, transparent 2px 9px);opacity:.85;"></div>
        <div style="position:absolute;left:0;right:0;top:38%;height:2px;background:rgba(0,0,0,.45);pointer-events:none;"></div>`;
    case 'paredon':
      return `<div style="${S}background:repeating-linear-gradient(0deg, rgba(255,255,255,.045) 0 1px, transparent 1px 8px), repeating-linear-gradient(90deg, rgba(255,255,255,.04) 0 1px, transparent 1px 15px);"></div>`;
    case 'lockers':
      return `<div style="${S}background:repeating-linear-gradient(90deg, rgba(125,211,252,.10) 0 1px, transparent 1px 16px);"></div>
        <div style="position:absolute;left:0;right:0;top:20%;height:1px;background:rgba(125,211,252,.16);pointer-events:none;"></div>`;
    case 'rejas':
      return `<div style="${S}background:repeating-linear-gradient(90deg, rgba(0,0,0,.55) 0 3px, transparent 3px 17px);"></div>`;
    case 'clinica':
      return `<div style="${S}background:repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 1px, transparent 1px 22px), repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 1px, transparent 1px 22px);"></div>`;
    case 'ciudad':
      return `<div style="${S}background:repeating-linear-gradient(90deg, rgba(255,220,140,.10) 0 2px, transparent 2px 6px, rgba(255,220,140,.06) 6px 7px, transparent 7px 14px);opacity:.7;"></div>`;
    case 'ventanal':
      return `<div style="${S}background:linear-gradient(115deg, rgba(250,204,21,.10) 0 18%, transparent 18% 34%, rgba(250,204,21,.07) 34% 48%, transparent 48%);"></div>`;
    case 'living':
      return `<div style="${S}background:repeating-linear-gradient(90deg, rgba(196,160,240,.06) 0 1px, transparent 1px 26px);"></div>`;
    case 'lluvia':
      return `<div style="${S}background:repeating-linear-gradient(74deg, rgba(190,220,240,.16) 0 1px, transparent 1px 7px);animation:crLluvia .5s linear infinite;"></div>
        <style>@keyframes crLluvia{0%{background-position:0 0}100%{background-position:-7px 24px}}</style>`;
    default: return '';
  }
}
// ── LO QUE COMPRASTE, AL LADO DEL AVATAR ─────────────────────────────────────
// Hasta ahora los bienes sólo existían como una lista de texto en la pantalla de
// finanzas. Si te comprás un yate, tiene que VERSE. Cada bien se dibuja como una
// mini-silueta pixelada apoyada en el piso de la escena, junto al jugador.
// Medidas en la MISMA grilla que el jugador (el muneco mide ~56 de alto), asi las
// proporciones son reales: el auto es mas largo que alto una persona, la casa le
// saca una cabeza, el yate y el avion son enormes.
const BIEN_PROPS = {
  auto:        { w:56, h:24, c:'#3b6ea8', d:[[0,10,56,12],[12,0,30,11],[15,2,11,7],[29,2,11,7],[7,21,10,3],[39,21,10,3],[0,13,56,2]] },
  casa:        { w:52, h:48, c:'#8b6d4a', d:[[3,16,46,32],[0,10,52,8],[21,30,10,18],[9,20,10,9],[33,20,10,9],[3,16,46,3]] },
  yate:        { w:78, h:40, c:'#e6ecf2', d:[[0,26,78,14],[12,12,46,14],[34,0,4,13],[38,2,20,8],[6,30,66,3]] },
  avion:       { w:88, h:34, c:'#c9d4de', d:[[6,14,74,11],[24,0,15,14],[18,25,30,7],[0,11,10,6],[76,11,12,6],[6,17,74,2]] },
  reloj:       { w:16, h:22, c:'#f5d14e', d:[[4,0,8,5],[0,5,16,12],[4,17,8,5],[5,9,6,4]] },
  restaurante: { w:52, h:40, c:'#d4763a', d:[[0,14,52,26],[2,6,48,8],[8,22,14,18],[31,22,14,12],[0,14,52,3]] },
  escuela:     { w:56, h:40, c:'#3f9c53', d:[[0,20,56,20],[5,8,46,12],[25,0,5,9],[11,26,11,14],[36,26,11,9],[0,20,56,3]] },
  fundacion:   { w:40, h:36, c:'#e8709e', d:[[6,5,11,11],[23,5,11,11],[2,14,36,9],[8,23,24,8],[14,31,12,5]] }
};
// ── EL AUTO ──────────────────────────────────────────────────────────────────
// Dibujado aparte y con formas: capot bajo, techo caido hacia atras, parabrisas
// inclinado, paragolpes, luces y ruedas REDONDAS con llanta. El de antes eran dos
// rectangulos apilados y se veia como un ladrillo con ruedas cuadradas.
// El modelo cambia con la epoca: cupe clasico, electrico aerodinamico y, mas
// adelante, un auto que ya no toca el piso.
function _autoSVG(escala){
  const s = escala || 2;
  const W = 66, H = 28, ep = (typeof epoca === 'function') ? epoca() : 0;
  const cuerpo = ep >= 3 ? '#7dd3fc' : ep >= 2 ? '#2fb8a8' : ep >= 1 ? '#c9d2dc' : '#2f6fb8';
  const oscuro = _avShade(cuerpo,-42), claro = _avShade(cuerpo,30);
  const vidrio = ep >= 2 ? '#0b2b3a' : '#16324a';
  let o = '';
  const R=(x,y,w,h,c)=>{ o += `<rect x="${x*s}" y="${y*s}" width="${w*s}" height="${h*s}" fill="${c}"/>`; };
  // Sombra bajo el auto
  o += `<ellipse cx="${33*s}" cy="${26.5*s}" rx="${30*s}" ry="${2*s}" fill="rgba(0,0,0,.45)"/>`;
  // Silueta: una sola forma con capot, techo y bau1
  o += `<path d="M ${2*s} ${22*s} L ${4*s} ${14*s} L ${14*s} ${13*s} L ${21*s} ${5*s} L ${44*s} ${5*s}
        L ${52*s} ${13*s} L ${63*s} ${14.5*s} L ${64*s} ${22*s} Z" fill="${cuerpo}"/>`;
  // Brillo superior y sombra inferior de chapa
  o += `<path d="M ${21*s} ${5*s} L ${44*s} ${5*s} L ${45*s} ${7*s} L ${20*s} ${7*s} Z" fill="${claro}"/>`;
  R(3,20,61,2,oscuro);
  // Parabrisas y ventanillas (inclinados, siguiendo el techo)
  o += `<path d="M ${23*s} ${7*s} L ${32*s} ${7*s} L ${32*s} ${13*s} L ${17*s} ${13*s} Z" fill="${vidrio}"/>`;
  o += `<path d="M ${34*s} ${7*s} L ${43*s} ${7*s} L ${49*s} ${13*s} L ${34*s} ${13*s} Z" fill="${vidrio}"/>`;
  R(32.4,7,1.2,6,oscuro);
  // Paragolpes, luces, manija
  R(1,19,4,3, ep>=2 ? '#7dd3fc' : '#e8e8e0');
  R(61,19,4,3,'#b03030');
  R(30,15,6,1.2,oscuro);
  // Ruedas redondas con llanta
  [16,50].forEach(function(rx){
    o += `<circle cx="${rx*s}" cy="${22*s}" r="${5.2*s}" fill="#15161a"/>`;
    o += `<circle cx="${rx*s}" cy="${22*s}" r="${2.6*s}" fill="#9aa4b0"/>`;
    o += `<circle cx="${rx*s}" cy="${22*s}" r="${1*s}" fill="#5a636e"/>`;
  });
  // En la era orbital flota: se le apagan las ruedas y se le enciende el colchon.
  if (ep >= 3){
    o += `<rect x="${8*s}" y="${25*s}" width="${50*s}" height="${2*s}" fill="#7dd3fc" opacity=".55"/>`;
    o += `<rect x="${12*s}" y="${27*s}" width="${42*s}" height="${1*s}" fill="#7dd3fc" opacity=".28"/>`;
  }
  return `<svg width="${W*s}" height="${H*s}" viewBox="0 0 ${W*s} ${H*s}" style="display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,.55));">${o}</svg>`;
}
function _propSVG(id, escala){
  if (id === 'auto') return _autoSVG(escala);
  const P = BIEN_PROPS[id]; if(!P) return '';
  const s = escala || 2;
  const dark = _avShade(P.c, -40), light = _avShade(P.c, 26);
  const rects = P.d.map((r,i)=>`<rect x="${r[0]*s}" y="${r[1]*s}" width="${r[2]*s}" height="${r[3]*s}" fill="${i===0?P.c:i===1?light:dark}"/>`).join('');
  return `<svg width="${P.w*s}" height="${P.h*s}" viewBox="0 0 ${P.w*s} ${P.h*s}" style="display:block;shape-rendering:crispEdges;filter:drop-shadow(0 2px 3px rgba(0,0,0,.55));">${rects}</svg>`;
}
// Bienes del jugador actual, ordenados del más grande al más chico, tope 3 para
// que no tapen al personaje.
function propsDeG(escala){
  escala = escala || 2.2;
  if(!G || !G.bienes || !G.bienes.length) return '';
  const orden = ['avion','yate','casa','auto','restaurante','escuela','fundacion','reloj'];
  const tengo = orden.filter(id => G.bienes.some(b=>b.id===id)).slice(0,3);
  if(!tengo.length) return '';
  return `<div style="display:flex;align-items:flex-end;gap:9px;">${tengo.map(id=>_propSVG(id, escala)).join('')}</div>`;
}
function avatarBox(inner, pad, escena, props){
  const E = AV_ESCENARIOS[escena] || AV_ESCENARIOS.cancha;
  const luz = E.luz
    ? `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 4%, ${E.luz}2e, transparent 66%);border-radius:11px;pointer-events:none;"></div>`
    : '';
  const focos = escena === 'estadio'
    ? `<div style="position:absolute;top:4px;left:0;right:0;display:flex;justify-content:space-around;pointer-events:none;">${[0,1,2,3].map(()=>`<div style="width:6px;height:3px;background:#fff8dc;border-radius:1px;box-shadow:0 0 9px 2px rgba(255,248,220,.75);"></div>`).join('')}</div>`
    : '';
  // El decorado va en su propia capa con overflow:hidden; el recuadro exterior
  // sigue SIN recortar para que la copa o la camiseta levantada no se corten.
  // EL PISO. Antes el recuadro era un degradado y el personaje flotaba en el aire:
  // ahora hay un suelo SOLIDO con linea de horizonte, el muneco apoya los pies
  // sobre el y proyecta su sombra sobre la superficie.
  const pisoCol = E.pisoSolido || _avShade(E.cielo[1], 14);
  // Piso mas alto: con 22px la franja casi no se veia y el personaje seguia
  // pareciendo suspendido. Con 34px hay suelo de verdad debajo de los pies.
  const pisoAlto = 34;
  return `<div style="background:linear-gradient(180deg,${E.cielo[0]} 0%,${E.cielo[1]} 100%);border:1px solid ${E.borde};border-radius:12px;padding:${pad||'10px 14px'};padding-bottom:${pisoAlto}px;display:inline-flex;align-items:flex-end;justify-content:center;position:relative;transition:background .35s;">
    <div style="position:absolute;inset:0;overflow:hidden;border-radius:11px;pointer-events:none;">
      ${_escFondo(E.fondo)}
      <div style="position:absolute;left:0;right:0;bottom:0;height:34%;background:linear-gradient(180deg,${E.piso},transparent);"></div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:${pisoAlto}px;background:linear-gradient(180deg,${pisoCol},${_avShade(pisoCol,-22)});"></div>
      <div style="position:absolute;left:0;right:0;bottom:${pisoAlto-1}px;height:1px;background:rgba(255,255,255,.16);"></div>
      <div style="position:absolute;left:0;right:0;bottom:${pisoAlto}px;height:10px;background:linear-gradient(0deg,rgba(0,0,0,.42),transparent);"></div>
      ${luz}${focos}
    </div>
    <div style="position:relative;display:flex;align-items:flex-end;gap:7px;line-height:0;margin-bottom:-2px;">
      <div style="position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);width:78%;height:11px;background:radial-gradient(ellipse at 50% 50%, rgba(0,0,0,.55) 0%, transparent 72%);pointer-events:none;"></div>
      <div style="position:relative;line-height:0;">${inner}</div>
      ${props ? `<div style="position:relative;line-height:0;">${props}</div>` : ''}
    </div>
  </div>`;
}

// ── BARRA SUPERIOR PERSISTENTE (estilo HUD de simulador) ──────────────────────
// Siempre visible: avatar chico, edad/etapa, club actual y el marcador del duelo
// con el némesis. Se toca para abrir la ficha completa del rival.
function hudHTML(){
  if(!G) return '';
  const E = avEtapa(G.edad);
  const R = G.rival;
  const dueloOn = R && (R.ganados + R.perdidos) > 0;
  const gano = dueloOn && R.ganados > R.perdidos;
  return `<div style="position:sticky;top:0;z-index:30;background:linear-gradient(180deg,rgba(8,10,7,.97),rgba(8,10,7,.88));backdrop-filter:blur(8px);border-bottom:1px solid #1e2619;padding:6px 10px;display:flex;align-items:center;gap:9px;margin:-16px -16px 12px;">
    <div style="background:linear-gradient(180deg,#16200f,#0a0f07);border:1px solid #26361c;border-radius:9px;padding:2px 5px;flex-shrink:0;">
      ${avatarDeG(0.95, 'idle', { anim:true })}
    </div>
    <div style="flex:1;min-width:0;">
      <div style="display:flex;align-items:center;gap:5px;">
        <span style="font-size:12.5px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(G.apellido||'—')}</span>
        <span style="font-size:9px;font-weight:900;color:${A};background:rgba(186,255,0,.12);border-radius:4px;padding:1px 5px;flex-shrink:0;">#${G.num}</span>
      </div>
      <div style="display:flex;align-items:center;gap:5px;margin-top:1px;">
        <span style="flex-shrink:0;">${clubBadge(G.club,14)}</span>
        <span style="font-size:10px;color:#8a9280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(G.club)}</span>
      </div>
    </div>
    <div style="text-align:center;flex-shrink:0;padding:0 6px;border-left:1px solid #1e2619;border-right:1px solid #1e2619;">
      <div style="font-size:8.5px;color:#5f6a58;font-weight:900;">EDAD</div>
      <div style="font-size:14px;font-weight:900;color:#fff;line-height:1;">${G.edad}</div>
      <div style="font-size:7.5px;color:#5f6a58;">${E.lbl}</div>
    </div>
    <div style="text-align:center;flex-shrink:0;">
      <div style="font-size:8.5px;color:#5f6a58;font-weight:900;">NIVEL</div>
      <div style="font-size:14px;font-weight:900;color:${A};line-height:1;">${Math.round(G.nivel)}</div>
    </div>
    ${dueloOn?`<button onclick="window._rivalFicha()" style="flex-shrink:0;background:${gano?'rgba(34,197,94,.1)':'rgba(239,68,68,.1)'};border:1px solid ${gano?'rgba(34,197,94,.35)':'rgba(239,68,68,.35)'};border-radius:8px;padding:4px 7px;cursor:pointer;text-align:center;">
      <div style="font-size:8px;color:#8a9280;font-weight:900;white-space:nowrap;">${esc(R.nombre).slice(0,8).toUpperCase()}</div>
      <div style="font-size:12px;font-weight:900;color:${gano?'#22c55e':'#ef4444'};line-height:1.1;">${R.ganados}-${R.perdidos}</div>
    </button>`:''}
  </div>`;
}
// Ficha completa del némesis: club por temporada, valor, stats y vitrina.
window._rivalFicha = function(){
  if(!G || !G.rival) return;
  const R = G.rival;
  const m = document.getElementById('carrera-modal') || overlay();
  const hist = (R.hist||[]).slice().reverse();
  const kR = kitDe(R.pais);
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:18px 16px calc(30px + env(safe-area-inset-bottom));">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <button onclick="window._carreraHub()" style="background:rgba(255,255,255,.06);border:none;color:#aaa;width:32px;height:32px;border-radius:50%;font-size:17px;cursor:pointer;"><i class='bx bx-arrow-back'></i></button>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:18px;color:#fff;">Tu némesis</div>
    </div>
    <div style="background:linear-gradient(160deg,rgba(239,68,68,.09),rgba(20,22,18,.6));border:1px solid rgba(239,68,68,.3);border-radius:16px;padding:16px;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:14px;">
        ${avatarBox(avatarSprite(R.avatar||avatarDefault(), { edad:G.edad, kitBase:kR.base, kitAlt:kR.alt, kitTxt:kR.txt, kitTipo:kR.tipo, num:R.num||9, apellido:R.nombre, escala:2.2 }), '8px 12px')}
        <div style="flex:1;min-width:0;">
          <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:20px;color:#fff;">${esc(R.nombre)}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:3px;">${flagImg(R.pais,16)}<span style="font-size:11.5px;color:#9aa294;">${esc(posLabelLargo(R.pos))}</span></div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:5px;">${clubBadge(R.club,20)}<span style="font-size:12px;color:#fff;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(R.club)}</span></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:13px;">
        ${cell('NIVEL', Math.round(R.nivel), '#ef4444')}
        ${cell('GOLES', R.tot.g, '#fff')}
        ${cell('ASIST', R.tot.a, '#fff')}
        ${cell('TÍTULOS', R.titulos, '#facc15')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">
        ${cell('VALOR', eur(R.valor||0), '#22d3ee')}
        ${cell('DUELO', R.ganados+'—'+R.perdidos, R.ganados>=R.perdidos?'#22c55e':'#ef4444')}
      </div>
      ${(R.vitrina&&R.vitrina.length)?`<div style="margin-top:12px;">
        <div style="font-size:9.5px;font-weight:900;color:#facc15;letter-spacing:1px;margin-bottom:6px;">SU VITRINA</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(66px,1fr));gap:9px 5px;justify-items:center;">
          ${R.vitrina.map(v=>`<div style="width:100%;text-align:center;"><div style="height:38px;display:flex;align-items:center;justify-content:center;">${trofeoRender(v.nombre,34)}</div><div style="font-size:8px;color:#999;margin-top:3px;line-height:1.2;word-break:break-word;">${esc(v.nombre)}</div></div>`).join('')}
        </div>
      </div>`:''}
    </div>
    <div style="font-size:10px;font-weight:900;color:#8a9280;letter-spacing:1.5px;margin-bottom:7px;">SU CARRERA TEMPORADA A TEMPORADA</div>
    <div style="background:#0d100d;border:1px solid #1c211a;border-radius:13px;overflow:hidden;">
      <div style="display:flex;font-size:9px;font-weight:900;color:#5f6a58;padding:8px 10px;border-bottom:1px solid #1c211a;"><span style="width:28px;">EDAD</span><span style="flex:1;">CLUB</span><span style="width:28px;text-align:center;">NIV</span><span style="width:26px;text-align:center;">G</span><span style="width:26px;text-align:center;">A</span><span style="width:22px;text-align:center;">🏆</span></div>
      ${hist.length ? hist.map(h=>`<div style="display:flex;align-items:center;font-size:11.5px;padding:8px 10px;border-bottom:1px solid #141814;color:#fff;">
        <span style="width:28px;font-weight:800;color:#8a9280;">${h.edad}</span>
        <span style="flex:1;display:flex;align-items:center;gap:6px;min-width:0;">${clubBadge(h.club,16)}<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(h.club)}</span>${h.cambio?`<i class='bx bx-transfer' title="Se cambió de club" style="color:#a78bfa;font-size:12px;flex-shrink:0;"></i>`:''}</span>
        <span style="width:28px;text-align:center;font-weight:900;color:#ef4444;">${h.niv}</span>
        <span style="width:26px;text-align:center;">${h.g}</span>
        <span style="width:26px;text-align:center;">${h.a}</span>
        <span style="width:22px;text-align:center;">${h.titulo?'<i class="bx bxs-trophy" style="color:#facc15;font-size:12px;"></i>':''}</span>
      </div>`).join('') : `<div style="padding:24px;text-align:center;color:#555;font-size:12px;">Todavía no jugó ninguna temporada.</div>`}
    </div>
  </div>`;
};

// Opciones de render durante la creación del personaje.
function _avOpts(d, escala){
  const k = kitDe(d.pais);
  return { edad:13, kitBase:k.base, kitAlt:k.alt, kitTxt:k.txt, kitTipo:k.tipo, num:d.num, apellido:d.apellido, escala:escala||4, pose:'idle' };
}
// Editor visual del personaje (compacto: chips en filas con scroll horizontal).
function _avEditorHTML(d){
  const av = d.avatar;
  const fila = (titulo, items, key, activo, swatch) => `
    <div style="margin-bottom:9px;">
      <div style="font-size:9px;font-weight:900;color:#5f6a58;letter-spacing:1.2px;margin-bottom:4px;">${titulo}</div>
      <div style="display:flex;gap:5px;overflow-x:auto;padding-bottom:2px;-webkit-overflow-scrolling:touch;">
        ${items.map(it=>`<button onclick="window._avSet('${key}','${it.id}')" style="flex-shrink:0;background:${activo===it.id?'rgba(186,255,0,.15)':'rgba(255,255,255,.04)'};border:1.5px solid ${activo===it.id?A:'#242a20'};border-radius:9px;padding:${swatch?'5px 7px':'6px 9px'};cursor:pointer;">
          ${swatch ? `<div style="width:22px;height:15px;border-radius:4px;background:${it.c};border:1px solid rgba(0,0,0,.35);"></div>` : `<span style="font-size:10.5px;color:${activo===it.id?A:'#9aa294'};font-weight:800;white-space:nowrap;">${esc(it.n)}</span>`}
        </button>`).join('')}
      </div>
    </div>`;
  return `<div class="cr-av-editor">
    ${fila('PIEL', AV_PIELES, 'piel', av.piel, true)}
    ${fila('PELO', AV_PELOS, 'pelo', av.pelo, false)}
    ${fila('COLOR', AV_COLORES_PELO, 'peloColor', av.peloColor, true)}
    ${fila('BARBA', [{id:'0',n:'Sin barba'},{id:'1',n:'Candado'},{id:'2',n:'Corta'},{id:'3',n:'Tupida'}], 'barba', String(av.barba||0), false)}
    ${fila('DETALLE', AV_ACCS, 'acc', av.acc, false)}
    <button onclick="window._avRandom()" style="width:100%;background:rgba(255,255,255,.05);border:1px solid #242a20;border-radius:9px;padding:8px;color:#9aa294;font-weight:800;font-size:11.5px;cursor:pointer;"><i class='bx bx-dice-5'></i> Sorprendeme</button>
  </div>`;
}
window._avSet = function(k, v){
  if(!_draft) return;
  if(!_draft.avatar) _draft.avatar = avatarDefault();
  _draft.avatar[k] = (k === 'barba') ? parseInt(v,10) : v;
  const el = document.getElementById('cr-avatar');
  if (el) el.innerHTML = avatarSprite(_draft.avatar, _avOpts(_draft, _avEscalaIdent()));
  const ed = document.querySelector('.cr-av-editor');
  if (ed) ed.outerHTML = _avEditorHTML(_draft);
};
window._avRandom = function(){
  if(!_draft) return;
  _draft.avatar = { piel:pick(AV_PIELES).id, pelo:pick(AV_PELOS).id, peloColor:pick(AV_COLORES_PELO).id, barba:ri(0,3), acc:pick(AV_ACCS).id };
  const el = document.getElementById('cr-avatar');
  if (el) el.innerHTML = avatarSprite(_draft.avatar, _avOpts(_draft, _avEscalaIdent()));
  const ed = document.querySelector('.cr-av-editor');
  if (ed) ed.outerHTML = _avEditorHTML(_draft);
};
function _avEscalaIdent(){ return (window.innerWidth||400) < 420 ? 3 : 3.6; }
let _draft=null;
window._carreraIdent = function(years){
  lyChrome(false);
  _draft = _draft || { years, apellido:(me().name||'').split(' ').slice(-1)[0]||'', num:10, pie:'Derecha', pais:(me().nat||me().country||'Uruguay'), pos:'DC', filtro:'', avatar:avatarDefault() };
  if(!_draft.avatar) _draft.avatar = avatarDefault();
  _draft.dif = window._crDif || 'normal';
  _draft.alcance = window._crAlcance || 'todo';   // 'todo' | 'carrera'
  _draft.years = years;
  renderIdent();
};
function renderIdent(){
  const d=_draft; const m=document.getElementById('carrera-modal')||overlay();
  const list = PAISES.filter(p=>p.toLowerCase().includes((d.filtro||'').toLowerCase()));
  m.innerHTML=`
  <div style="max-width:1040px;margin:0 auto;padding:18px 18px calc(96px + env(safe-area-inset-bottom));">
    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:19px;color:#fff;margin-bottom:10px;">Definí tu jugador</div>
    <div style="display:grid;grid-template-columns:1fr;gap:18px;">
      <!-- Panel compacto: avatar fijo arriba + pestañas abajo (entra en una pantalla) -->
      <div style="background:rgba(255,255,255,.03);border:1px solid #1c1c1c;border-radius:16px;padding:12px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
          ${avatarBox(`<div id="cr-avatar" style="display:flex;align-items:flex-end;justify-content:center;">${avatarSprite(d.avatar, _avOpts(d, _avEscalaIdent()))}</div>`, '10px 14px')}
          <div style="flex:1;min-width:0;">
            <div style="display:flex;gap:6px;">
              <div style="flex:2;"><label style="font-size:9px;font-weight:800;color:#5f6a58;display:block;margin-bottom:3px;">APELLIDO</label><input id="cr-ape" value="${esc(d.apellido)}" placeholder="APELLIDO" oninput="window._carreraSet('apellido',this.value)" style="${inp()};padding:8px;font-size:13px;"></div>
              <div style="width:62px;"><label style="font-size:9px;font-weight:800;color:#5f6a58;display:block;margin-bottom:3px;">Nº</label><input id="cr-num" type="number" min="1" max="99" value="${d.num}" oninput="window._carreraSet('num',this.value)" style="${inp()};padding:8px;font-size:13px;text-align:center;"></div>
            </div>
            <div style="margin-top:7px;"><label style="font-size:9px;font-weight:800;color:#5f6a58;display:block;margin-bottom:3px;">PIERNA</label>
              <div style="display:flex;gap:5px;">
                ${['Izquierda','Derecha'].map(x=>`<button onclick="window._carreraSet('pie','${x}')" style="flex:1;background:${d.pie===x?A:'#161616'};color:${d.pie===x?'#000':'#9aa294'};border:1px solid ${d.pie===x?A:'#242a20'};border-radius:8px;padding:7px 4px;font-weight:800;font-size:11.5px;cursor:pointer;">${x.slice(0,3)}</button>`).join('')}
              </div>
            </div>
            <div style="margin-top:7px;display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.03);border:1px solid #242a20;border-radius:8px;padding:6px 8px;">
              ${flagImg(d.pais,18)}<span style="font-size:11.5px;color:#c4ccc0;font-weight:700;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(d.pais)}</span>
              <span style="font-size:10px;font-weight:900;color:${A};background:rgba(186,255,0,.12);border-radius:5px;padding:2px 6px;">${esc(d.pos)}</span>
            </div>
          </div>
        </div>
        <!-- Pestañas -->
        <div style="display:flex;gap:5px;margin-bottom:10px;">
          ${[['look','Aspecto','bx-user'],['pais','País','bx-world'],['pos','Puesto','bx-football']].map(t=>`
            <button onclick="window._identTab('${t[0]}')" style="flex:1;background:${(d.tab||'look')===t[0]?'rgba(186,255,0,.13)':'rgba(255,255,255,.03)'};border:1.5px solid ${(d.tab||'look')===t[0]?A:'#242a20'};border-radius:10px;padding:8px 4px;cursor:pointer;color:${(d.tab||'look')===t[0]?A:'#8a9280'};font-weight:900;font-size:11.5px;"><i class='bx ${t[2]}'></i> ${t[1]}</button>`).join('')}
        </div>
        <div style="min-height:250px;">
          ${(d.tab||'look')==='look' ? _avEditorHTML(d) : ''}
          ${d.tab==='pais' ? `
            <input value="${esc(d.filtro)}" placeholder="Buscar país" oninput="window._carreraSet('filtro',this.value)" style="${inp()};margin-bottom:8px;padding:9px;">
            <div style="max-height:220px;overflow-y:auto;display:grid;grid-template-columns:1fr 1fr;gap:5px;">
              ${list.map(p=>`<button onclick="window._carreraSet('pais','${p.replace(/'/g,"\\'")}')" style="display:flex;align-items:center;gap:7px;background:${d.pais===p?'rgba(186,255,0,.1)':'transparent'};border:1px solid ${d.pais===p?'rgba(186,255,0,.3)':'#1c211a'};border-radius:9px;padding:8px;color:#fff;cursor:pointer;text-align:left;font-size:11.5px;font-weight:700;">${flagImg(p,18)}<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(p)}</span></button>`).join('')}
            </div>` : ''}
          ${d.tab==='pos' ? pitch(d.pos,'window._carreraSet.bind(null,\'pos\')') : ''}
        </div>
      </div>
    </div>
    <div style="position:fixed;left:0;right:0;bottom:0;z-index:20;background:#0a0c0a;border-top:1px solid #1c1c1c;padding:14px 18px calc(14px + env(safe-area-inset-bottom));display:flex;gap:10px;max-width:1040px;margin:0 auto;box-shadow:0 -8px 24px rgba(0,0,0,.6);">
      <button onclick="window._carreraLen()" style="flex:1;background:#161616;color:#aaa;border:1px solid #262626;border-radius:12px;padding:14px;font-weight:800;cursor:pointer;">Volver</button>
      <button onclick="window._potreroMundo()" style="flex:2;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:12px;padding:14px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;">Confirmar identidad</button>
    </div>
  </div>`;
}
window._identTab = function(t){ if(!_draft) return; _draft.tab = t; renderIdent(); };
window._carreraSet = function(k,v){
  if(k==='num') v=clamp(parseInt(v)||10,1,99);
  _draft[k]=v;
  // Refrescos parciales para no perder foco al tipear.
  if(k==='apellido'||k==='num'||k==='pais'){
    const av=document.getElementById('cr-avatar'); if(av) av.innerHTML=avatarSprite(_draft.avatar, _avOpts(_draft, _avEscalaIdent()));
  }
  if(k==='pais'||k==='pie'||k==='pos'||k==='filtro') renderIdent();
};
function inp(){ return 'width:100%;background:#161616;border:1px solid #262626;color:#fff;border-radius:10px;padding:11px;font-size:14px;box-sizing:border-box;outline:none;font-family:inherit;'; }

// ── POTRERO (10-15 años, antes de la carrera) ────────────────────────────────
// Tres mini-decisiones infantiles que dan un bonus/malus inicial a tu carrera.
// Rápido: 3 pantallas → cantera.
const POTRERO_POOL = [
  { t:'El picado del barrio', edad:11, d:'Clásico del barrio, tu equipo pierde 2-0 y te toca patear un penal decisivo.', opts:[
    { txt:'Amagar al arquero (arriesgado)', ef:g=>{ const gol=Math.random()<.55; g._potBonus=(g._potBonus||0)+(gol?3:-2); return gol?'¡Gol! Todo el barrio grita tu nombre.':'La atajó. Te vas llorando.'; } },
    { txt:'Definir al palo con potencia', ef:g=>{ const gol=Math.random()<.75; g._potBonus=(g._potBonus||0)+(gol?2:-1); return gol?'¡Gol! Los pibes te alzan en andas.':'La tiraste afuera.'; } }
  ] },
  { t:'Elegí tu ídolo', edad:12, d:'Ya sabés a quién imitar. ¿A quién vas a parecerte cuando jugás?', opts:[
    { txt:'Un 10 clásico (Riquelme / Zidane)', ef:g=>{ g._potBonus=(g._potBonus||0)+2; g._potStyle='crack'; return 'Vas a jugar con la cabeza levantada. La pausa es tu firma.'; } },
    { txt:'Un killer (Suárez / Ronaldo)', ef:g=>{ g._potBonus=(g._potBonus||0)+2; g._potStyle='killer'; return 'Ir al gol es tu religión.'; } },
    { txt:'Un guerrero (Vidal)', ef:g=>{ g._potBonus=(g._potBonus||0)+1; g._potStyle='guerrero'; return 'La cancha es guerra. Nunca te rendís.'; } }
  ] },
  { t:'Ojeadores te vinieron a ver', edad:14, d:'DOS ojeadores de distintos clubes de tu país te vieron jugar. Uno de un club grande, otro de uno chico. Ambos te invitan a probarte.', opts:[
    { txt:'Elegir dónde probarme', prueba:true },
    { txt:'No ir, seguir en el barrio', ef:g=>{ g._potBonus=(g._potBonus||0)+1; return 'Preferís madurar sin apuro.'; } }
  ] },
  { t:'Se rompió la pelota', edad:11, d:'Media cuadra juega descalzos y la única pelota se pinchó. Los pibes miran para vos.', opts:[
    { txt:'Poner mis ahorros para otra', ef:g=>{ g._potBonus=(g._potBonus||0)+2; return 'Te dejaste los pesos del kiosco pero salvaste la tarde. Sos líder.'; } },
    { txt:'Jugar con la pelota de trapo', ef:g=>{ g._potBonus=(g._potBonus||0)+1; return 'Aprendiste a pegarle sin superficie perfecta. Toque fino.'; } }
  ] },
  { t:'Prueba en un club grande vs debut en el chico', edad:13, d:'Un club chico te ofrece jugar oficial. El grande te dice "vení a probarte, después vemos".', opts:[
    { txt:'Ir a jugar al chico', ef:g=>{ g._potBonus=(g._potBonus||0)+2; return 'Debutás oficial. Rodaje real desde pibe.'; } },
    { txt:'Elegir club y probarme', prueba:true }
  ] },
  { t:'Mudanza familiar', edad:14, d:'Tu viejo consigue laburo en la capital y hay que mudarse. Chau equipo del barrio — pero allá hay clubes de verdad.', opts:[
    { txt:'Buscar dónde probarme en la ciudad nueva', prueba:true },
    { txt:'Rebelarme y no querer jugar', ef:g=>{ g._potBonus=(g._potBonus||0)-3; return 'Perdiste meses de fútbol. Costó volver al ritmo.'; } }
  ] },
  { t:'Bullying en la escuela', edad:12, d:'Un grupo del cole te carga por gastar tanto tiempo en la pelota. Te empujan.', opts:[
    { txt:'Callarme y seguir entrenando', ef:g=>{ g._potBonus=(g._potBonus||0)+2; return 'El fútbol fue tu refugio. Aprendiste a canalizar todo ahí.'; } },
    { txt:'Encararlos', ef:g=>{ const b=Math.random()<.5; g._potBonus=(g._potBonus||0)+(b?1:-2); return b?'Se calmó la cosa. Aprendiste a hacerte respetar.':'Terminaste suspendido. Casi te sacan de la cancha.'; } }
  ] },
  { t:'Torneo intercolegial', edad:13, d:'Tu escuela juega el interzonal. Un ojeador amateur promete estar en la final.', opts:[
    { txt:'Ser el capitán y organizar al equipo', ef:g=>{ g._potBonus=(g._potBonus||0)+2; return 'Metiste al equipo en la final. Te vieron mandar.'; } },
    { txt:'Jugar solo para lucirme', ef:g=>{ const b=Math.random()<.5; g._potBonus=(g._potBonus||0)+(b?3:-2); return b?'Metiste 4 goles y salieron campeones.':'Perdiste amigos y el partido.'; } }
  ] },
  { t:'Lesión temprana', edad:13, d:'Corrés descalzo por el baldío y te clavás algo en el pie. Duele feo.', opts:[
    { txt:'Parar y esperar cicatrización', ef:g=>{ g._potBonus=(g._potBonus||0)+1; return 'Un mes sin cancha. Volviste entero.'; } },
    { txt:'Aguantar y seguir jugando', ef:g=>{ const mal=Math.random()<.6; g._potBonus=(g._potBonus||0)+(mal?-3:1); return mal?'Se infectó. Perdiste toda la temporada.':'Aguantaste bien. Nadie se enteró.'; } }
  ] },
  { t:'Elección de posición', edad:12, d:'El técnico infantil te pregunta dónde te sentís cómodo. Es tu edad de definir.', opts:[
    { txt:'Donde el equipo me necesite', ef:g=>{ g._potBonus=(g._potBonus||0)+2; return 'Multifunción desde chico. El DT te ama.'; } },
    { txt:'De 10, siempre', ef:g=>{ g._potBonus=(g._potBonus||0)+1; return 'Elegiste el número mágico. Ahora hay que bancarlo.'; } }
  ] }
];
// 3 eventos al azar del pool (no repetidos), la carrera se siente distinta cada vez.
// Van ORDENADOS por la edad propia de cada evento: como el pool se baraja, antes
// podía tocar "a los 14 vinieron los ojeadores" en el paso 0 mientras el cartel
// decía "11 años". Ahora el cartel, el relato y el avatar usan siempre ev.edad.
function potreroEventosDeCarrera(){
  return shuffle(POTRERO_POOL).slice(0, 3).sort((a,b)=>(a.edad||12)-(b.edad||12));
}
const POTRERO_EVENTOS = [];  // se llena por carrera con potreroEventosDeCarrera()
window._carreraPotrero = function(paso){
  paso = paso || 0;
  const _draftGet = () => _draft;
  const d = _draftGet();
  if (!d) { window._carreraLen(); return; }
  // "Solo la carrera": se arranca directo en el club, sin infancia ni potrero.
  if (d.alcance === 'carrera'){ window._carreraOfertas(); return; }
  if (!d._potHist) d._potHist = [];
  // Elegí 3 eventos AL AZAR al inicio de la carrera (no siempre los mismos).
  if (!d._potSet) d._potSet = potreroEventosDeCarrera();
  if (paso >= d._potSet.length) { window._carreraOfertas(); return; }
  const ev = d._potSet[paso];
  const m = document.getElementById('carrera-modal') || overlay();
  const edadInfantil = ev.edad || (11 + paso);   // la edad la manda el evento, no el paso
  const kitPot = kitDe(d.pais);
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:22px 20px calc(30px + env(safe-area-inset-bottom));">
    <div class="cg-back-wrap"><button class="cg-back" onclick="window._carreraIdent(_draftYears())"><i class='bx bx-arrow-back'></i> Identidad</button></div>
    <div style="text-align:center;margin:14px 0 18px;">
      <!-- El pibe tiene que estar EN la pantalla de la decisión, no sólo en el
           resultado: es su historia y hasta ahora no se lo veía. -->
      <div style="display:flex;justify-content:center;margin-bottom:12px;">
        ${avatarBox(avatarSprite(d.avatar, { edad:edadInfantil, kitBase:kitPot.base, kitAlt:kitPot.alt, kitTxt:kitPot.txt, kitTipo:kitPot.tipo, num:d.num, apellido:d.apellido, pose:'idle', escala:2.6 }), '10px 16px', 'potrero')}
      </div>
      <div style="font-size:11px;font-weight:900;letter-spacing:2px;color:${A};">POTRERO · ${edadInfantil} AÑOS</div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:26px;color:#fff;margin-top:6px;line-height:1.1;">${esc(ev.t)}</div>
    </div>
    <div style="background:linear-gradient(160deg,rgba(186,255,0,.06),rgba(20,22,18,.5));border:1px solid #242424;border-radius:16px;padding:16px;">
      <div style="font-size:13.5px;color:#c4ccc0;line-height:1.6;margin-bottom:14px;">Tenés ${edadInfantil} años. ${ev.d}</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${ev.opts.map((o,i)=>`<button onclick="window._potElegir(${paso},${i})" style="${btn(i===0)}">${o.txt}</button>`).join('')}
      </div>
    </div>
  </div>`;
};
// ── SUB-FLUJO DE PRUEBA (ojeador / mudanza) ─────────────────────────────────
// Opciones con `prueba:true` abren: elegir club → decisión dentro de la prueba →
// resultado. El club elegido queda como preferido y aparece en la oferta de cantera.
function clubesPrueba(pais, n){
  let out = shuffle(todosClubs().filter(c=>c.pais===pais && c.str>=50 && c.str<=74)).slice(0, n||3);
  if(out.length < (n||3)){
    const ciudades = shuffle(CIUDADES[pais]||['Central','Norte','Sur','Unión']);
    const sufijos = ['FC','Atlético','Juventud','Deportivo','Sporting'];
    for(let i=out.length;i<(n||3);i++) out.push({ name: pick(sufijos)+' '+ciudades[i%ciudades.length], str: ri(48,58), liga:'Amateur '+pais, pais });
  }
  return out;
}
window._potPrueba = function(paso, idx){
  const d=_draft; const ev=(d._potSet||POTRERO_POOL)[paso];
  d._pruebaClubs = clubesPrueba(d.pais, 3);
  const m=document.getElementById('carrera-modal')||overlay();
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:22px 20px calc(30px + env(safe-area-inset-bottom));">
    <div style="text-align:center;margin-bottom:16px;">
      <div style="font-size:11px;font-weight:900;letter-spacing:2px;color:${A};">LA PRUEBA</div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:23px;color:#fff;margin-top:5px;line-height:1.15;">¿Dónde te vas a probar?</div>
      <div style="font-size:12.5px;color:#9aa0a6;margin-top:6px;">Cuanto más grande el club, más difícil quedar — pero mejor arranque.</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${d._pruebaClubs.map((c,i)=>`<button onclick="window._potPruebaClub(${paso},${idx},${i})" style="display:flex;align-items:center;gap:13px;background:rgba(255,255,255,.04);border:1.5px solid #242424;border-radius:15px;padding:14px;cursor:pointer;text-align:left;" onmouseover="this.style.borderColor='${A}'" onmouseout="this.style.borderColor='#242424'">
        ${clubBadge(c.name,46)}
        <div style="flex:1;min-width:0;"><div style="font-size:15px;font-weight:900;color:#fff;">${esc(c.name)}</div><div style="font-size:11px;color:#8a8f96;">${esc(c.liga)} · Nivel ${c.str}</div>
        <div style="font-size:10.5px;color:${c.str>=68?'#ef4444':c.str>=60?'#f59e0b':'#22c55e'};font-weight:800;margin-top:2px;">${c.str>=68?'Muy exigente':c.str>=60?'Exigente':'Accesible'}</div></div>
        <i class='bx bx-chevron-right' style="color:#444;font-size:22px;"></i>
      </button>`).join('')}
    </div>
  </div>`;
};
const PRUEBA_DECS = [
  { txt:'Jugar simple y sin errores', dif:0.72, bon:2, ok:'Prolijo, sin perder una. El captador te anotó como "seguro".', no:'Demasiado conservador. "No se le vio nada", dijeron.' },
  { txt:'Encarar y buscar la jugada de crack', dif:0.48, bon:4, ok:'Hiciste dos gambetas que levantaron a los captadores de la silla.', no:'Perdiste todas las que encaraste. Se te vio individualista.' },
  { txt:'Correr como loco y meter', dif:0.65, bon:3, ok:'Dejaste todo. Les encantó tu actitud y sacrificio.', no:'Te fundiste a los 20 minutos. Físico insuficiente.' },
  { txt:'Mandar al equipo, hablar, organizar', dif:0.58, bon:3, ok:'Los captadores vieron un líder. Eso no se enseña.', no:'Quisiste mandar sin nivel para respaldarlo. Quedó raro.' }
];
window._potPruebaClub = function(paso, idx, clubIdx){
  const d=_draft; const c=d._pruebaClubs[clubIdx]; d._pruebaClub=c;
  const decs = shuffle(PRUEBA_DECS).slice(0,3);
  d._pruebaDecs = decs;
  const m=document.getElementById('carrera-modal')||overlay();
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:22px 20px calc(30px + env(safe-area-inset-bottom));">
    <div style="text-align:center;margin-bottom:14px;">
      <div style="display:flex;justify-content:center;margin-bottom:8px;">${clubBadge(c.name,58)}</div>
      <div style="font-size:11px;font-weight:900;letter-spacing:2px;color:${A};">PRUEBA EN ${esc(c.name).toUpperCase()}</div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:22px;color:#fff;margin-top:5px;line-height:1.15;">Te dan 45 minutos</div>
    </div>
    <div style="background:linear-gradient(160deg,rgba(186,255,0,.06),rgba(20,22,18,.5));border:1px solid #242424;border-radius:16px;padding:16px;">
      <div style="font-size:13.5px;color:#c4ccc0;line-height:1.6;margin-bottom:14px;">Hay 40 pibes y toman a 3. Estás en cancha con la pechera puesta y los captadores anotando en la tribuna. ¿Cómo la jugás?</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${decs.map((dd,i)=>`<button onclick="window._potPruebaFin(${paso},${idx},${i})" style="${btn(i===0)}">${dd.txt}</button>`).join('')}
      </div>
    </div>
  </div>`;
};
window._potPruebaFin = function(paso, idx, decIdx){
  const d=_draft; const c=d._pruebaClub; const dec=d._pruebaDecs[decIdx];
  // Dificultad ajustada por fuerza del club: club grande = más difícil quedar.
  const penal = (c.str-52)*0.018;
  const quedo = Math.random() < clamp(dec.dif - penal, 0.12, 0.92);
  let res;
  if(quedo){ d._potBonus=(d._potBonus||0)+dec.bon; d._potClubPref=c; res = dec.ok + ' ¡Quedaste en ' + c.name + '!'; }
  else { d._potBonus=(d._potBonus||0)-1; res = dec.no + ' No quedaste esta vez, pero aprendiste.'; }
  const ev=(d._potSet||POTRERO_POOL)[paso];
  d._potHist.push({ t: ev.t, res });
  const m=document.getElementById('carrera-modal')||overlay();
  m.innerHTML = `
    <div style="max-width:520px;margin:0 auto;padding:50px 20px 40px;text-align:center;">
      <div style="display:flex;justify-content:center;margin-bottom:14px;">${clubBadge(c.name,64)}</div>
      <div style="font-size:11px;font-weight:900;letter-spacing:2px;color:${quedo?A:'#ef4444'};margin-bottom:12px;">${quedo?'QUEDASTE':'NO QUEDASTE'}</div>
      <div style="font-size:16px;color:#fff;font-weight:700;line-height:1.6;margin-bottom:26px;">${esc(res)}</div>
      <button onclick="window._potreroVolver(${paso+1})" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:13px 30px;font-weight:900;cursor:pointer;">${paso+1>=(d._potSet||[]).length?'Ir a la cantera':'Volver al baldío'} <i class='bx bx-right-arrow-alt'></i></button>
    </div>`;
};

window._potElegir = function(paso, idx){
  const ev = (_draft._potSet||POTRERO_POOL)[paso];
  const o = ev.opts[idx]; if (!o) return;
  // Opciones que abren el sub-flujo de prueba (elegir club + decisión en cancha).
  if (o.prueba) { window._potPrueba(paso, idx); return; }
  // El efecto opera sobre _draft (todavía no existe G).
  const res = o.ef(_draft);
  _draft._potHist.push({ t: ev.t, res });
  // Mostrar resultado y avanzar al siguiente paso.
  const pose = _poseReaccion(res, { nivel:0, moral:0, fama:0, dinero:0 });
  const kitPot = kitDe(_draft.pais);
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
    <div style="max-width:520px;margin:0 auto;padding:40px 20px 40px;text-align:center;">
      <div style="display:flex;justify-content:center;margin-bottom:14px;">
        ${avatarBox(avatarSprite(_draft.avatar, { edad:ev.edad||(11+paso), kitBase:kitPot.base, kitAlt:kitPot.alt, kitTxt:kitPot.txt, kitTipo:kitPot.tipo, num:_draft.num, apellido:_draft.apellido, pose, escala:2.8 }), '10px 16px', escenaDePose(pose, _draft.avatar, ev.edad||(11+paso)))}
      </div>
      <div style="font-size:11px;font-weight:900;letter-spacing:2px;color:${A};margin-bottom:12px;">${esc(ev.t)}</div>
      <div style="font-size:16px;color:#fff;font-weight:700;line-height:1.6;margin-bottom:22px;">${esc(res)}</div>
      <button onclick="window._potreroVolver(${paso+1})" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:13px 30px;font-weight:900;cursor:pointer;">${paso+1>=(_draft._potSet||[]).length?'Ir a la cantera':'Volver al baldío'} <i class='bx bx-right-arrow-alt'></i></button>
    </div>`;
};

// ── OFERTAS DE CANTERA ───────────────────────────────────────────────────────────
window._carreraOfertas = function(){
  const d=_draft;
  // Clubes de cantera DEL PAÍS del jugador (un brasileño no arranca en Salto). Se prioriza
  // clubes reales de ese país con str bajo/medio; si no alcanzan 3, se generan clubes
  // amateur/barrio de ciudades de ese país. Así el arranque es lógico y local.
  let cantera = shuffle(todosClubs().filter(c=>c.pais===d.pais && c.str>=50 && c.str<=72)).slice(0,3);
  // Si quedaste en una prueba del potrero, ese club encabeza la oferta (efecto real).
  if (d._potClubPref){
    cantera = cantera.filter(c=>c.name !== d._potClubPref.name).slice(0,2);
    cantera.unshift(d._potClubPref);
  }
  if (cantera.length < 3){
    const faltan = 3 - cantera.length;
    const ciudades = shuffle(CIUDADES[d.pais] || ['Central','Norte','Sur','Unión','Juventud','Barrio']);
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
// ── RIVAL / NÉMESIS ───────────────────────────────────────────────────────────
// Se genera al fichar: un jugador de tu misma camada y país que compite con vos
// TODA la carrera. Cada temporada simula sus números y se compara con los tuyos.
// Su relación con vos evoluciona (respeto / rivalidad / odio) según quién gane.
// ── REPRESENTANTES ───────────────────────────────────────────────────────────
// Se elige uno al firmar el primer contrato y se puede cambiar despues. Cada uno
// tiene su estilo y te sugiere cosas distintas.
const REPRES = [
  { id:'viejo',  n:'Don Aníbal',        edad:64, gen:'m', rasgo:'El de toda la vida',
    desc:'Representó a tu viejo club treinta años. No consigue Europa, pero jamás te va a vender.',
    comision:5,  contactos:35, honestidad:95,
    consejos:['No te apures con Europa: acá adentro todavía tenés cosas para ganar.',
              'Guardá la mitad de cada prima. La carrera dura menos de lo que parece.',
              'Renová ahora que estás bien; después te lo van a querer bajar.'] },
  { id:'tiburon',n:'Marcelo Brienza',   edad:47, gen:'m', rasgo:'El tiburón',
    desc:'Mueve jugadores a Europa como nadie. Se lleva su tajada y te suelta la mano si bajás.',
    comision:18, contactos:92, honestidad:35,
    consejos:['Hay una oferta afuera. Si no saltás ahora, a los 26 ya no te llama nadie.',
              'Pedí cláusula de salida. Sin eso quedás preso de un contrato largo.',
              'Rechazá la renovación: valés más de lo que te están ofreciendo.'] },
  { id:'joven',  n:'Sofía Aranda',      edad:34, gen:'f', rasgo:'La que arma marca',
    desc:'Menos contactos, pero te construye una marca: sponsors, medios, imagen.',
    comision:10, contactos:62, honestidad:78,
    consejos:['Firmá el sponsor: esa plata es la que te queda cuando dejás de jugar.',
              'Cuidá lo que decís en redes; hoy un video te cambia el precio.',
              'Invertí en algo tuyo antes de los 30, no después.'] },
  { id:'abogado',n:'Estudio Pereira',   edad:52, gen:'m', rasgo:'Los abogados',
    desc:'Un estudio serio: contratos blindados, cero sorpresas, cero calor humano.',
    comision:12, contactos:70, honestidad:90,
    consejos:['Que el contrato tenga los bonos por partido jugado, no por título.',
              'Pagá los impuestos ahora. Una inspección a los 35 es un desastre.',
              'No firmes nada de imagen a más de cinco años.'] }
];
function repreDeG(){ return REPRES.find(r=>r.id === (G && G.repre)) || null; }
// Apellidos típicos de cada país: los goleadores de la tabla y la gente del
// mundo dejan de llamarse todos igual sin importar dónde estés jugando.
const APELLIDOS_PAIS = {
  'Uruguay':['Suárez','Cavani','Forlán','Recoba','Francescoli','Godín','Bentancur','Valverde','Núñez','Olivera','Viña','Araújo','Pereyra','Cáceres','Rodríguez','Techera','Lemos','De Arrascaeta'],
  'Argentina':['Fernández','Gómez','Rodríguez','Álvarez','Paredes','Di María','Otamendi','Romero','Acuña','Molina','Palacios','Ocampos','Correa','Lautaro','Enzo','Mac Allister'],
  'Brasil':['Silva','Santos','Oliveira','Souza','Pereira','Costa','Almeida','Ribeiro','Carvalho','Gomes','Rodrigues','Barbosa','Fernandes','Cardoso','Nascimento'],
  'España':['García','Martínez','López','Sánchez','Fernández','Torres','Ramos','Iniesta','Morata','Olmo','Gavi','Pedri','Asensio','Rodri','Llorente'],
  'Inglaterra':['Smith','Johnson','Williams','Brown','Taylor','Wilson','Bellingham','Foden','Saka','Rice','Stones','Walker','Kane','Grealish'],
  'Italia':['Rossi','Russo','Ferrari','Esposito','Bianchi','Romano','Colombo','Barella','Verratti','Chiesa','Locatelli','Bastoni','Donnarumma'],
  'Francia':['Martin','Bernard','Dubois','Moreau','Laurent','Girard','Mbappé','Camavinga','Tchouaméni','Konaté','Coman','Rabiot','Upamecano'],
  'Alemania':['Müller','Schmidt','Schneider','Fischer','Weber','Wagner','Havertz','Gnabry','Kimmich','Goretzka','Rüdiger','Sané'],
  'Portugal':['Silva','Santos','Ferreira','Pereira','Costa','Rodrigues','Fernandes','Leão','Dalot','Neves','Palhinha','Félix'],
  'México':['Hernández','García','Martínez','López','Ramírez','Lozano','Álvarez','Vega','Antuna','Pineda','Ochoa'],
  'Colombia':['Rodríguez','Gómez','Cuadrado','Díaz','Sánchez','Muñoz','Borré','Lerma','Uribe','Arias','Ospina'],
  'Chile':['González','Muñoz','Rojas','Díaz','Vidal','Sánchez','Medel','Aránguiz','Isla','Bravo','Pulgar']
};
function apellidoDe(pais){
  const L = APELLIDOS_PAIS[pais];
  return L ? pick(L) : pick(RIVAL_NOMBRES);
}
const RIVAL_NOMBRES = ['Ferreyra','Cardozo','Almeida','Sosa','Benítez','Núñez','Vargas','Ibáñez','Quintana','Bermúdez','Olivera','Rojas','Silveira','Acuña','Zambrano','Da Silva','Moretti','Kovač','Bakayoko','Lindqvist','Van Dijk','Okafor','Petrov','Haaland','Mbeki'];
function crearRival(pais, pos, nivel){
  // Arranca en un club real del mismo país (no en "cantera rival" genérica).
  const locales = todosClubs().filter(c=>c.pais===pais && c.str>=50 && c.str<=72);
  const c0 = locales.length ? pick(locales) : { name:'Cantera '+pais, str:56, liga:'Amateur '+pais, pais };
  return {
    nombre: apellidoDe(pais),
    pais, pos,
    nivel: clamp(nivel + ri(-3, 5), 40, 70),
    club: c0.name, clubStr: c0.str, liga: c0.liga, clubPais: c0.pais,
    num: ri(7, 11),
    avatar: { piel:pick(AV_PIELES).id, pelo:pick(AV_PELOS).id, peloColor:pick(AV_COLORES_PELO).id, barba:ri(0,2), acc:pick(AV_ACCS).id },
    valor: Math.max(300, Math.round((c0.str-42) * 260 * (1 + ligaNivel(c0.liga)*0.28))),
    tot: { pj:0, g:0, a:0 },
    titulos: 0, vitrina: [],
    hist: [],                 // una fila por temporada: club, nivel, goles, título
    relacion: 0,
    ganados: 0, perdidos: 0
  };
}
// Simula la temporada del rival (independiente de la tuya) y devuelve quién ganó el año.
function simularRival(R, anioEdad){
  const atk = {POR:0.02,DFC:0.05,LI:0.08,LD:0.08,MCD:0.12,MI:0.35,MD:0.35,MC:0.25,MCO:0.5,EI:0.55,ED:0.55,DC:0.75}[R.pos]||0.3;
  const pj = ri(20, 36);
  const factor = (R.nivel/100) * (0.7 + Math.random()*0.6);
  const g = Math.round(pj*atk*factor);
  const a = Math.round(pj*(atk*0.6+0.1)*factor);
  R.tot.pj += pj; R.tot.g += g; R.tot.a += a;
  // Curva de nivel del rival igual que la tuya
  let dN;
  if(anioEdad<=20) dN=ri(2,5); else if(anioEdad<=24) dN=ri(1,4); else if(anioEdad<=28) dN=ri(0,2);
  else if(anioEdad<=31) dN=ri(-1,1); else if(anioEdad<=34) dN=ri(-3,0); else dN=ri(-5,-1);
  R.nivel = clamp(R.nivel + dN, 30, 99);
  // ── El rival TAMBIÉN tiene carrera: se transfiere si crece y gana títulos ──
  let cambio = false;
  if (anioEdad >= 18 && anioEdad <= 33 && Math.random() < 0.42){
    const mejores = todosClubs().filter(c =>
      c.name !== R.club && c.str > (R.clubStr||55) + 1 && R.nivel >= c.str - 10
    );
    if (mejores.length){
      const nuevo = pick(mejores);
      R.club = nuevo.name; R.clubStr = nuevo.str; R.liga = nuevo.liga; R.clubPais = nuevo.pais;
      cambio = true;
    }
  }
  // Títulos coherentes con la liga donde juega (no "Champions con Cobreloa").
  let titulo = null;
  const T = trofeosDe(R.liga || '');
  const chanceLiga = clamp(((R.clubStr||55) - 68) / 70, 0, 0.30);
  if (T.local && Math.random() < chanceLiga){ titulo = T.local; }
  else if (T.copaNac && Math.random() < clamp(((R.clubStr||55)-62)/150, 0.02, 0.16)){ titulo = T.copaNac; }
  else if (T.inter && (R.clubStr||55) >= 80 && Math.random() < 0.10){ titulo = T.inter; }
  if (titulo){
    R.titulos++;
    if(!R.vitrina) R.vitrina = [];
    R.vitrina.push({ nombre:titulo, edad:anioEdad, club:R.club });
  }
  // Valor de mercado del rival, con la misma fórmula que la tuya.
  const edadF = anioEdad<28?1.25:anioEdad<32?0.85:0.45;
  const ligaM = 0.05 + ligaNivel(R.liga||'')*0.10;
  const clubM = Math.max(0.15, ((R.clubStr||55)-45)/40);
  R.valor = Math.max(300, Math.round(((R.nivel**2.4)*edadF*20 + R.titulos*80000) * ligaM * clubM));
  if(!R.hist) R.hist = [];
  R.hist.push({ edad:anioEdad, club:R.club, niv:Math.round(R.nivel), g, a, titulo, cambio });
  return { pj, g, a, titulo, cambio };
}
window._draftYears = function(){ return _draft?_draft.years:15; };
function flagImgInline(p){ const c=FLAG[p]; return c?`<img src="https://flagcdn.com/w20/${c}.png" style="width:14px;height:auto;vertical-align:-2px;border-radius:2px;">`:''; }

window._carreraFichar = function(i){
  const d=_draft; const c=d._ofertas[i];
  const base = d.pos==='POR'?48:50;
  // Bonus del POTRERO (10-15 años): decisiones infantiles suman/restan nivel inicial.
  const potBonus = d._potBonus || 0;
  // Hijo de futbolista: algo se hereda (y algo pesa).
  const heredado = d.legado ? Math.round(Math.min(6, (d.legado.nivelMax - 70) / 5) + Math.min(4, (d.legado.titulos||0))) : 0;
  const nivelInicial = clamp(base + potBonus + Math.max(0, heredado), 40, 66);
  G = {
    apellido:d.apellido, num:d.num, pie:d.pie, pais:d.pais, pos:d.pos, years:d.years,
    edad:15, nivel:nivelInicial, club:c.name, liga:c.liga, clubStr:c.str, clubPais:c.pais,
    // El tiempo NO se reinicia entre generaciones: el hijo/nieto arranca en el año
    // en que terminó la vida del anterior. Sólo la primera carrera empieza en 2026.
    anio: (d.legado && d.legado.anio) ? d.legado.anio : 2026,
    // Valor inicial COHERENTE con el club: interior/amateur arrancan valiendo
    // €500-€2k (o "vales de comida"). Solo grandes ligas europeas dan un pibe €100k+.
    // Formula: (str-42) * 260 * ligaBoost. Mínimo €300.
    dinero:0, valor: Math.max(300, Math.round((c.str-42) * 260 * (1 + ligaNivel(c.liga)*0.28))),
    fama:5, moral:72, titulos:0, temporada:1,
    tot:{pj:0,g:0,a:0}, timeline:[], hist:[], vitrina:[], clasificadoInter:false,
    // Idolatría por club: -100 (odiado) .. +100 (ídolo eterno). Empezás con +10 por firmar.
    idolatria:{ [c.name]: 10 }, clubDesde:16,
    // BANDERAS persistentes: marcan lo que hiciste y bloquean/abren eventos futuros.
    // (traidor, dopado, ludopata, carcel, filantropo, doblenac, mediatico, leal...)
    flags:{},
    // NÉMESIS: te acompaña toda la carrera compitiendo por los mismos focos.
    legado: d.legado || null,
    rival: (function(){
      const r = crearRival(d.pais, d.pos, nivelInicial);
      // Si venís del legado, tu rival es el hijo del rival de tu viejo.
      if (d.legado && d.legado.rival) r.nombre = d.legado.rival;
      return r;
    })(),
    // Legado del potrero: estilo elegido (crack/killer/guerrero) + bonus aplicado.
    estilo: d._potStyle || null, potBonus,
    // Avatar 8-bit diseñado por el jugador (evoluciona con la edad y el club).
    avatar: d.avatar || avatarDefault(),
    dif:(d.dif||'normal'), alcance:(d.alcance||'todo'), creado:Date.now()
  };
  save();
  window._elegirRepre('primero');       // de pibe ya elegís quién te maneja
};

// ── JUVENILES / FORMACIÓN (15-18 años) ────────────────────────────────────────
// Etapa entre el potrero y el debut profesional. 3 decisiones que definen con qué
// nivel, disciplina y reputación interna llegás a primera. Acá se define también si
// DEBUTÁS TEMPRANO (16-17) o si te toca esperar.
const JUVENILES_POOL = [
  { t:'Primer día en la pensión', d:'Te toca vivir en la pensión del club con pibes de todo el país. Extrañás tu casa y hay un grupo que te hace la vida difícil.', opts:[
    { txt:'Bancar y ganarme el respeto solo', ef:g=>{ g.nivel+=2; g.moral+=4; g._juvDisc=(g._juvDisc||0)+2; return 'Te aguantaste todo sin llorar. Al mes te respetaban. Aprendiste a estar solo.'; } },
    { txt:'Llamar a mi viejo para que intervenga', ef:g=>{ g.moral+=6; g.nivel-=1; g._juvDisc=(g._juvDisc||0)-1; return 'Se calmó la cosa pero te quedó el mote de "el nene de papá" en el vestuario.'; } },
    { txt:'Pedir volver a casa y viajar cada día', ef:g=>{ g.moral+=8; g.nivel-=2; return 'Dormís en tu cama pero perdés 3 horas diarias en ómnibus. El cuerpo lo siente.'; } } ] },
  { t:'El técnico te cambia de puesto', d:'El DT de juveniles dice que en tu posición no vas a llegar, y te quiere probar en otra función del campo.', opts:[
    { txt:'Aceptar y reinventarme', ef:g=>{ g.nivel+=3; g._juvDisc=(g._juvDisc||0)+1; return 'Te adaptaste rápido. Ahora sos polifuncional y el club te ve más completo.'; } },
    { txt:'Negarme, yo juego donde siempre', ef:g=>{ const b=Math.random()<.45; g.nivel+=b?2:-3; g._juvDisc=(g._juvDisc||0)-2; return b?'Le demostraste que tenía razón en dudar... pero de tu puesto. Te ganaste el lugar.':'Te sentaron en el banco tres meses por cabeza dura.'; } } ] },
  { t:'Fiesta de fin de año de la categoría', d:'Los pibes armaron una salida enorme. Al otro día hay entrenamiento a las 8 y el DT dijo que iba a estar mirando.', opts:[
    { txt:'No ir, mañana entreno', ef:g=>{ g.nivel+=2; g._juvDisc=(g._juvDisc||0)+3; g.moral-=2; return 'Fuiste el único que entrenó bien. El DT lo anotó — y esas cosas se acuerdan.'; } },
    { txt:'Ir un rato y volver temprano', ef:g=>{ const b=Math.random()<.6; g.moral+=5; g.nivel+=b?1:-1; return b?'Te fuiste a las 2 y entrenaste bien. Equilibrio.':'"Un rato" terminó a las 6. Se te notó.'; } },
    { txt:'Salir con todo, soy pibe', ef:g=>{ g.moral+=8; g.nivel-=3; g._juvDisc=(g._juvDisc||0)-3; return 'La pasaste increíble. El DT te sacó del once por un mes.'; } } ] },
  { t:'Los estudios vs el fútbol', d:'Estás por repetir el año. En el club te dicen que si dejás el liceo tenés más horas de entrenamiento, pero es tirar el plan B.', opts:[
    { txt:'Dejar el liceo, todo al fútbol', ef:g=>{ g.nivel+=4; g.flags=g.flags||{}; g.flags.sinEstudios=true; return 'Todo o nada. Más horas de cancha, cero red de contención si esto no sale.'; } },
    { txt:'Bancar los dos aunque cueste', ef:g=>{ g.nivel+=1; g.moral+=4; g.flags=g.flags||{}; g.flags.estudioso=true; return 'Dormís poco pero tenés título y pelota. Tu vieja llora de orgullo.'; } } ] },
  { t:'Un veterano te toma de aprendiz', d:'Un jugador de primera, casi retirado, te ve entrenar y se ofrece a enseñarte lo que sabe. Pero pide que llegues una hora antes todos los días.', opts:[
    { txt:'Aceptar y llegar una hora antes', ef:g=>{ g.nivel+=4; g._juvDisc=(g._juvDisc||0)+3; g.flags=g.flags||{}; g.flags.mentoreado=true; return 'Un año entero llegando al alba. Te enseñó cosas que no se aprenden en ningún video.'; } },
    { txt:'Agradecer pero seguir mi ritmo', ef:g=>{ g.nivel+=1; return 'Educado pero cómodo. Años después te vas a preguntar qué habría pasado.'; } } ] },
  { t:'Lesión en un momento clave', d:'Justo cuando el DT de primera empezó a mirarte, te desgarrás. Te ofrecen infiltrarte para el partido donde va a estar mirando.', opts:[
    { txt:'Infiltrarme y jugar ese partido', ef:g=>{ const mal=Math.random()<.55; if(mal){ g.nivel-=5; g.moral-=8; return 'Se te agravó y estuviste 6 meses afuera. Perdiste la ventana.'; } g.nivel+=3; g.fama+=5; return 'Jugaste al 60% y aún así lo convenciste. Riesgo que salió bien.'; } },
    { txt:'Parar y recuperar bien', ef:g=>{ g.nivel+=1; g.moral+=3; return 'Volviste entero dos meses después. La ventana se cerró, pero el cuerpo quedó sano.'; } } ] },
  { t:'Oferta de un club del exterior', d:'Un club europeo quiere llevarte a su cantera a los 16. Es lejos, otro idioma, y tu familia queda acá.', opts:[
    { txt:'Cruzar el charco solo', ef:g=>{ const b=Math.random()<.5; if(b){ g.nivel+=5; g.fama+=6; g.flags=g.flags||{}; g.flags.emigroPibe=true; return 'Te adaptaste. Otra cultura de trabajo, otro nivel de exigencia. Volaste.'; } g.nivel-=2; g.moral-=12; return 'No aguantaste la soledad. Volviste a los 8 meses con la autoestima rota.'; } },
    { txt:'Quedarme y crecer en casa', ef:g=>{ g.nivel+=2; g.moral+=6; return 'Elegiste tus raíces. Progreso más lento pero con los tuyos al lado.'; } } ] },
  { t:'Te ponen de capitán de la categoría', d:'El cuerpo técnico te da la cinta de la juvenil. Implica hablar, poner la cara cuando se pierde y mediar en los quilombos.', opts:[
    { txt:'Aceptar y liderar de verdad', ef:g=>{ g.nivel+=2; g.moral+=6; g._juvDisc=(g._juvDisc||0)+2; g.flags=g.flags||{}; g.flags.lider=true; avMutar({capitanPerm:true}); return 'Te bancaste todas. Cuando subís a primera ya sabés hablar en un vestuario. Desde hoy llevás la cinta.'; } },
    { txt:'Rechazar, prefiero solo jugar', ef:g=>{ g.nivel+=1; return 'Sin cinta, sin presión extra. Concentrado en lo tuyo.'; } } ] },
  { t:'Un representante te busca a la salida', d:'Un agente te espera afuera del entrenamiento con un contrato de representación por 5 años y un adelanto en efectivo.', opts:[
    { txt:'Firmar y agarrar el adelanto', ef:g=>{ g.dinero+=12000; const b=Math.random()<.45; g.flags=g.flags||{}; g.flags.agenteMalo=!b; return b?'Resultó ser serio y te consiguió buenos contactos.':'Te ató 5 años a alguien que solo te quiere vender. Te va a costar zafar.'; } },
    { txt:'Consultarlo con mi familia primero', ef:g=>{ g._juvDisc=(g._juvDisc||0)+1; return 'Tu viejo lo hizo revisar por un abogado del sindicato. Te ahorraste un problema.'; } } ] }
];
function juvenilesDeCarrera(){ return shuffle(JUVENILES_POOL).slice(0,3); }
// Edad de retiro: la duración elegida se cuenta desde el DEBUT (17 o 18), no desde 16.
function edadRetiro(){ return ((G&&G.debutEdad)||16) + ((G&&G.years)||10); }
// ── SE VIENE EL RETIRO ───────────────────────────────────────────────────────
// El final llegaba de golpe: jugabas una temporada mas y de golpe se acababa
// todo. Ahora los ultimos años se avisan, para que la despedida se sienta venir
// y puedas decidir como querés cerrarla.
function anosParaRetiro(){ return edadRetiro() - ((G&&G.edad)||0); }
// ── LOS ESTADIOS ─────────────────────────────────────────────────────────────
// Los grandes partidos no se juegan "en una cancha": se juegan en un lugar con
// nombre, y ese nombre es parte del recuerdo. Son estadios inventados, con el
// aire del país que les toca.
const ESTADIOS = {
  'Uruguay':      ['el Coloso del Prado','el Estadio de los Cien Años','el Gigante de la Rambla'],
  'Argentina':    ['la Bombonera del Sur','el Coloso de Núñez','el Cilindro de Avellaneda'],
  'Brasil':       ['el Templo de Río','el Coloso de Ipiranga','la Catedral del Mineiro'],
  'España':       ['el Coliseo Blanco','la Catedral del Norte','el Estadio de la Alameda'],
  'Inglaterra':   ['el Templo de Wembley Park','el Coliseo del Támesis','Old Common Ground'],
  'Italia':       ['la Scala del Calcio','el Olímpico del Tíber','el Coloso de Turín'],
  'Francia':      ['el Parque de los Príncipes Nuevos','el Vélodrome del Sur','el Estadio de la República'],
  'Alemania':     ['el Muro Amarillo','el Coliseo de Baviera','el Olímpico del Spree'],
  'México':       ['el Coloso de Santa Úrsula','el Volcán del Norte','el Estadio de la Sultana'],
  'Portugal':     ['la Catedral de la Luz','el Dragón de Oporto','el Estadio del Tajo'],
  'Países Bajos': ['la Arena del Ámsterdam','el Coloso del Rin'],
  'Colombia':     ['el Campín de la Montaña','el Coloso del Atlántico'],
  'Chile':        ['el Monumental de la Cordillera','el Coloso del Pacífico']
};
function estadioDe(pais, semilla){
  const L = ESTADIOS[pais] || ['el estadio más grande del país','el coliseo de la capital'];
  if (semilla == null) return pick(L);
  let h = 0; const t = String(semilla);
  for (let i=0;i<t.length;i++) h = (h*31 + t.charCodeAt(i)) >>> 0;
  return L[h % L.length];       // el mismo partido siempre en el mismo estadio
}
// ── EL PARTIDO HOMENAJE ──────────────────────────────────────────────────────
// El club donde MAS temporadas jugaste te despide, y del otro lado está tu
// selección. Es la escena que le faltaba al final: la carrera no termina en una
// planilla de numeros, termina con el estadio de pie.
function clubMasJugado(){
  const c = {};
  (G && G.timeline || []).forEach(t=>{ if(t.club) c[t.club] = (c[t.club]||0) + 1; });
  let mejor = null, max = 0;
  Object.keys(c).forEach(k=>{ if(c[k] > max){ max = c[k]; mejor = k; } });
  return { club: mejor || (G && G.club) || '—', temporadas: max };
}
function homenajeHTML(){
  if(!G || !G.tot) return '';
  const H = clubMasJugado();
  const sel = 'Selección de ' + (G.pais || 'Uruguay');
  const publico = clamp(28000 + (G.titulos||0)*6000 + Math.round((G.nivelMax||G.nivel||60)*280), 12000, 85000);
  const idolo = ((G.idolatria||{})[H.club]||0) >= 40;
  return `
  <div class="cr-fade cr-fade-d1" style="margin-top:16px;background:linear-gradient(165deg,rgba(250,204,21,.1),rgba(10,13,8,.72));border:1.5px solid rgba(250,204,21,.36);border-radius:18px;padding:17px;">
    <div style="font-size:9.5px;font-weight:900;letter-spacing:2px;color:#facc15;margin-bottom:9px;">TU PARTIDO DESPEDIDA</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:13px;margin-bottom:13px;">
      <div style="text-align:center;flex:1;min-width:0;">
        ${clubBadge(H.club, 44)}
        <div style="font-size:11px;font-weight:900;color:#e9efe2;margin-top:6px;line-height:1.25;">${esc(H.club)}</div>
      </div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:15px;color:#facc15;flex-shrink:0;">VS</div>
      <div style="text-align:center;flex:1;min-width:0;">
        <div style="display:flex;justify-content:center;">${flagImg(G.pais, 40) || clubBadge(sel, 44)}</div>
        <div style="font-size:11px;font-weight:900;color:#e9efe2;margin-top:6px;line-height:1.25;">${esc(sel)}</div>
      </div>
    </div>
    <div style="font-size:13px;color:#d8dfcd;line-height:1.65;">
      ${esc(H.club)} te despidió con un amistoso contra ${esc(sel)}, en ${esc(estadioDe(G.pais, G.apellido))}. ${publico.toLocaleString('es')} personas, la camiseta con tu apellido colgada del alambrado y tus hijos en el círculo central.
      ${idolo ? 'Saliste a los veinte minutos y el estadio entero se puso de pie hasta que llegaste al túnel.' : 'Jugaste veinte minutos. Los que fueron, fueron por vos.'}
      Cuando levantaste la mano para saludar, ya no eras un jugador: eras un recuerdo.
    </div>
    <div style="display:flex;gap:7px;margin-top:12px;">
      <div style="flex:1;background:rgba(0,0,0,.3);border-radius:10px;padding:9px 4px;text-align:center;">
        <div style="font-size:15px;font-weight:900;color:#facc15;line-height:1;">${publico.toLocaleString('es')}</div>
        <div style="font-size:8px;color:#8a9280;font-weight:900;letter-spacing:1px;margin-top:4px;">EN EL ESTADIO</div>
      </div>
      <div style="flex:1;background:rgba(0,0,0,.3);border-radius:10px;padding:9px 4px;text-align:center;">
        <div style="font-size:15px;font-weight:900;color:#facc15;line-height:1;">${H.temporadas || 1}</div>
        <div style="font-size:8px;color:#8a9280;font-weight:900;letter-spacing:1px;margin-top:4px;">TEMP. EN EL CLUB</div>
      </div>
    </div>
  </div>`;
}
function avisoRetiroHTML(){
  if(!G) return '';
  const faltan = anosParaRetiro();
  if (faltan > 3 || faltan < 0) return '';
  const txt = faltan <= 0
    ? 'Esta es tu última temporada. Lo que hagas ahora es lo último que van a recordar.'
    : faltan === 1
      ? 'Te queda una temporada más. En el vestuario ya hablan de tu despedida.'
      : faltan === 2
        ? 'El cuerpo ya no responde como antes. Quedan dos temporadas, y la prensa lo sabe.'
        : 'Empezaron a preguntarte en cada nota hasta cuándo vas a jugar. Quedan tres temporadas.';
  return `<div style="margin-top:12px;display:flex;align-items:flex-start;gap:10px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.34);border-radius:13px;padding:12px 13px;">
    <i class='bx bx-hourglass' style="font-size:19px;color:#f59e0b;flex-shrink:0;margin-top:1px;"></i>
    <div style="min-width:0;">
      <div style="font-size:9px;font-weight:900;letter-spacing:1.5px;color:#f59e0b;">EL FINAL SE ACERCA</div>
      <div style="font-size:12.5px;color:#e2d9c4;line-height:1.5;margin-top:4px;">${txt}</div>
    </div>
  </div>`;
}
window._carreraJuveniles = function(paso){
  paso = paso || 0;
  if(!G){ G=load(); if(!G){ window._carreraStart(); return; } }
  if(!G._juvSet) G._juvSet = juvenilesDeCarrera();
  if(paso >= G._juvSet.length){ window._carreraDebut(); return; }
  const ev = G._juvSet[paso];
  const edadJuv = 15 + paso;
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:22px 20px calc(30px + env(safe-area-inset-bottom));">
    <div style="text-align:center;margin:6px 0 16px;">
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;">${clubBadge(G.club,34)}<span style="font-size:13px;font-weight:900;color:#fff;">${esc(G.club)}</span></div>
      <div style="font-size:11px;font-weight:900;letter-spacing:2px;color:#4fc3f7;">JUVENILES · ${edadJuv} AÑOS</div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:24px;color:#fff;margin-top:5px;line-height:1.15;">${esc(ev.t)}</div>
    </div>
    <div style="background:linear-gradient(160deg,rgba(79,195,247,.07),rgba(20,22,18,.5));border:1px solid rgba(79,195,247,.28);border-radius:16px;padding:16px;">
      <div style="font-size:13.5px;color:#c4ccc0;line-height:1.6;margin-bottom:14px;">${ev.d}</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${ev.opts.map((o,i)=>`<button onclick="window._juvElegir(${paso},${i})" style="${btn(i===0)}">${o.txt}</button>`).join('')}
      </div>
    </div>
  </div>`;
};
window._juvElegir = function(paso, idx){
  const ev = G._juvSet[paso]; const o = ev.opts[idx]; if(!o) return;
  const antesNiv = G.nivel;
  const res = o.ef(G);
  G.nivel = clamp(G.nivel, 30, 75);
  G.moral = clamp(G.moral, 0, 100);
  if(!G.juvHist) G.juvHist = [];
  G.juvHist.push({ edad:15+paso, t:ev.t, res });
  save();
  const dNiv = Math.round(G.nivel - antesNiv);
  const pose = _poseReaccion(res, { nivel:dNiv, moral:0, fama:0, dinero:0 });
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
    <div style="max-width:520px;margin:0 auto;padding:40px 20px 40px;text-align:center;">
      <div style="display:flex;justify-content:center;margin-bottom:14px;">${avatarBox(avatarDeG(2.8, pose, { edad:15+paso }), '10px 16px', escenaDePose(pose, G.avatar, 15+paso))}</div>
      <div style="font-size:11px;font-weight:900;letter-spacing:2px;color:#4fc3f7;margin-bottom:12px;">${esc(ev.t)}</div>
      <div style="font-size:16px;color:#fff;font-weight:700;line-height:1.6;margin-bottom:16px;">${esc(res)}</div>
      ${dNiv?`<div style="margin-bottom:22px;">${deltaChip('Nivel', dNiv)}</div>`:'<div style="margin-bottom:22px;"></div>'}
      <button onclick="window._juvenilesVolver(${paso+1})" style="background:linear-gradient(135deg,#0284c7,#4fc3f7);color:#fff;border:none;border-radius:13px;padding:13px 30px;font-weight:900;cursor:pointer;">${paso+1>=G._juvSet.length?'El día del debut':'Volver al predio'} <i class='bx bx-right-arrow-alt'></i></button>
    </div>`;
};
// Debut: la disciplina acumulada en juveniles define si subís a los 17 o a los 18.
window._carreraDebut = function(){
  const disc = G._juvDisc || 0;
  const temprano = disc >= 3 || (disc >= 1 && G.nivel >= 58);
  G.edad = temprano ? 17 : 18;
  G.debutEdad = G.edad;   // la duración elegida se cuenta DESDE el debut
  // Primer contrato profesional: sueldo coherente con el club donde debutás.
  G.sueldo = ofertaDe({ name:G.club, str:G.clubStr, liga:G.liga, pais:G.clubPais }).sueldo;
  G.contratoAnios = 3;
  G.anio = 2026 + (G.edad - 16);
  if(temprano){ G.nivel = clamp(G.nivel + 2, 30, 78); G.flags = G.flags||{}; G.flags.debutPrecoz = true; }
  // Desde acá el personaje tiene VIDA PRIVADA: salud, felicidad, familia y
  // soledad que van a acompañarlo toda la carrera y sobrevivir al retiro.
  if(!G.vidaStats) G.vidaStats = personalInit();
  if(!G.familia) G.familia = {};
  save();
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:50px 20px 40px;text-align:center;">
    <!-- PRESENTACIÓN OFICIAL: una sola escena, el jugador sosteniendo su camiseta
         en el estadio. Antes había un muñeco con el brazo tieso al costado y una
         camiseta suelta flotando al lado, sin relación entre las dos cosas. -->
    <div style="display:flex;justify-content:center;margin-bottom:16px;">
      <div style="position:relative;display:inline-block;">
        ${avatarBox(avatarDeG(3.6, 'posando', { edad:G.edad }), '16px 22px 12px', 'estadio')}
        <div style="position:absolute;left:50%;bottom:8px;transform:translateX(-50%);display:flex;align-items:center;gap:6px;background:rgba(8,10,7,.82);border:1px solid #2a3222;border-radius:20px;padding:3px 10px;white-space:nowrap;">
          ${clubBadge(G.club,16)}<span style="font-size:10px;font-weight:900;color:#fff;letter-spacing:.5px;">${esc(G.club).toUpperCase()}</span>
        </div>
      </div>
    </div>
    <div style="font-size:11px;font-weight:900;letter-spacing:3px;color:${A};margin-bottom:8px;">${temprano?'DEBUT PRECOZ':'DEBUT EN PRIMERA'}</div>
    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:28px;color:#fff;line-height:1.15;margin-bottom:10px;">${G.edad} años</div>
    <div style="font-size:14px;color:#c4ccc0;line-height:1.6;max-width:380px;margin:0 auto 22px;">${temprano
      ? `Tu trabajo en juveniles no pasó desapercibido. El técnico de primera te sube antes de tiempo: debutás en <b style="color:#fff;">${esc(G.club)}</b> con apenas ${G.edad} años.`
      : `Terminaste el proceso formativo completo. Subís a primera de <b style="color:#fff;">${esc(G.club)}</b> a los ${G.edad}, sin atajos pero con el oficio aprendido.`}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:320px;margin:0 auto 22px;">
      ${cell('NIVEL', Math.round(G.nivel), A)}
      ${cell('DISCIPLINA', disc>=3?'Alta':disc>=0?'Media':'Baja', disc>=3?'#22c55e':disc>=0?'#f59e0b':'#ef4444')}
    </div>
    <button onclick="window._clubMundo()" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:14px;padding:15px 34px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;box-shadow:0 10px 30px rgba(80,220,110,.3);">ENTRAR AL CLUB <i class='bx bx-right-arrow-alt'></i></button>
  </div>`;
};

// En el hub el jugador no se queda con la misma cara toda la carrera: refleja
// cómo viene (moral, plata, lesiones) y varía dentro de eso.
function _poseHub(){
  if(!G) return 'idle';
  const a = G.avatar || {};
  if (a.preso) return 'esposado';
  if (a.muletas || a.vendaje) return 'lesion';
  if ((G.moral||50) <= 25) return pick(['bajon','pensativo','agotado']);
  if ((G.titulos||0) >= 5 && (G.moral||50) >= 70) return pick(['orgullo','posando','aplaudir']);
  if ((G.bienes||[]).length >= 3) return pick(['rico','orgullo']);
  if ((G.moral||50) >= 75) return pick(['orgullo','festejo','idle']);
  return pick(['idle','pensando','caminar','entrenar','alivio']);
}

// ── ELEGIR REPRESENTANTE ─────────────────────────────────────────────────────
window._elegirRepre = function(motivo){
  if(!G){ G=load(); if(!G) return; }
  const actual = repreDeG();
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="max-width:560px;margin:0 auto;padding:22px 18px calc(30px + env(safe-area-inset-bottom));">
    <div style="text-align:center;margin-bottom:14px;">
      <div style="font-size:11px;font-weight:900;letter-spacing:2px;color:${A};">TU REPRESENTANTE</div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:22px;color:#fff;margin-top:5px;line-height:1.15;">${motivo==='cambio'?'¿Con quién seguís?':'¿Quién te va a manejar la carrera?'}</div>
      <div style="font-size:12.5px;color:#9aa0a6;margin-top:6px;">Cada uno cobra distinto y te va a aconsejar distinto. Se puede cambiar más adelante.</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${REPRES.map((r,i)=>`<button onclick="window._fijarRepre('${r.id}')" style="display:flex;align-items:flex-start;gap:12px;background:${actual&&actual.id===r.id?'rgba(186,255,0,.10)':'rgba(255,255,255,.04)'};border:1.5px solid ${actual&&actual.id===r.id?A:'#242424'};border-radius:15px;padding:14px;cursor:pointer;text-align:left;">
        <div style="flex-shrink:0;line-height:0;">${vjSpriteNPC('repre'+r.id+r.n, r.id==='joven'?'tv':'traje', r.edad, 'idle', r.gen)}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:15px;font-weight:900;color:#fff;">${esc(r.n)}</div>
          <div style="font-size:10.5px;color:${A};font-weight:800;margin-bottom:4px;">${esc(r.rasgo)}</div>
          <div style="font-size:11.5px;color:#9aa294;line-height:1.45;margin-bottom:7px;">${esc(r.desc)}</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;">
            <span style="font-size:9.5px;font-weight:800;color:#ff9b6b;background:rgba(255,155,107,.12);border-radius:6px;padding:2px 7px;">Comisión ${r.comision}%</span>
            <span style="font-size:9.5px;font-weight:800;color:#7dd3fc;background:rgba(125,211,252,.12);border-radius:6px;padding:2px 7px;">Contactos ${r.contactos}</span>
            <span style="font-size:9.5px;font-weight:800;color:#4ade80;background:rgba(74,222,128,.12);border-radius:6px;padding:2px 7px;">Honestidad ${r.honestidad}</span>
          </div>
        </div>
      </button>`).join('')}
    </div>
  </div>`;
};
window._fijarRepre = function(id){
  if(!G) return;
  const previo = G.repre;
  G.repre = id;
  const r = repreDeG();
  if (previo && previo !== id){ G.moral = clamp((G.moral||60) - 3, 0, 100); }
  save();
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:44px 20px 40px;text-align:center;">
    <div style="display:flex;justify-content:center;align-items:flex-end;gap:6px;margin-bottom:14px;">
      <div style="line-height:0;">${vjSpriteNPC('repre'+r.id+r.n, r.id==='joven'?'tv':'traje', r.edad, 'saludo', r.gen)}</div>
      <div style="line-height:0;">${avatarDeG(2.4,'firmar')}</div>
    </div>
    <div style="font-size:11px;font-weight:900;letter-spacing:2px;color:${A};margin-bottom:8px;">${esc(r.n).toUpperCase()}</div>
    <div style="font-size:15px;color:#fff;font-weight:700;line-height:1.55;margin-bottom:8px;">"${esc(pick(r.consejos))}"</div>
    <div style="font-size:12px;color:#8a9280;margin-bottom:20px;">Se queda con el ${r.comision}% de lo que firmes.</div>
    <button onclick="${G.debutEdad ? "window._clubMundo()" : "window._juvenilesMundo()"}" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:14px 30px;font-weight:900;cursor:pointer;">Seguir <i class='bx bx-right-arrow-alt'></i></button>
  </div>`;
};
// ── ENTRADAS A LOS MUNDOS CAMINABLES DE LA CARRERA ───────────────────────────
// El potrero, las juveniles y el club dejaron de ser una fila de tarjetas: son
// lugares por los que se camina. Las pantallas de decisión siguen existiendo,
// pero se abren al acercarse a la persona que te habla.
window._potreroMundo = function(){
  const d = _draft; if(!d){ window._carreraLen(); return; }
  if (!d._potSet) d._potSet = potreroEventosDeCarrera();
  if (d._potPaso == null) d._potPaso = 0;
  if (d._potPaso >= d._potSet.length){ window._carreraOfertas(); return; }
  d._potEdad = (d._potSet[d._potPaso] || {}).edad || 12;
  mundoAbrir('potrero', 'baldio');
};
window._potreroVolver = function(paso){
  const d = _draft; if(!d){ window._carreraLen(); return; }
  d._potPaso = paso;
  if (paso >= (d._potSet||[]).length){ window._carreraOfertas(); return; }
  d._potEdad = (d._potSet[paso] || {}).edad || 12;
  mundoAbrir('potrero', 'baldio');
};
window._juvenilesMundo = function(){
  if(!G){ G = load(); if(!G){ window._carreraStart(); return; } }
  if (!G._juvSet) G._juvSet = juvenilesDeCarrera();
  if (G._juvPaso == null) G._juvPaso = 0;
  if (G._juvPaso >= G._juvSet.length){ window._carreraDebut(); return; }
  G.edad = 15 + G._juvPaso;
  save();
  mundoAbrir('juveniles', 'predio');
};
window._juvenilesVolver = function(paso){
  if(!G) return;
  G._juvPaso = paso;
  if (paso >= (G._juvSet||[]).length){ save(); window._carreraDebut(); return; }
  G.edad = 15 + paso;
  save();
  mundoAbrir('juveniles', 'predio');
};
window._clubMundo = function(escena){
  if(!G){ G = load(); if(!G){ window._carreraStart(); return; } }
  mundoAbrir('club', escena || 'vestuario');
};
// "Continuar" desde la portada: retoma la etapa donde quedó la partida.
window._continuarPartida = function(){
  const g = load(); if(!g){ window._carreraLen(); return; }
  G = g;
  // Partidas viejas: si la pareja quedó sin cara guardada, se le fija una AHORA y
  // no cuando toque dibujarla. Así es la misma en la casa, en el diálogo y en
  // cualquier pantalla, que era justo lo que fallaba.
  try { parejaAvAsegurar(); } catch(e){}
  if (G.vidaRol) { window._vidaJugable(); return; }
  if (G._juvSet && (G._juvPaso == null || G._juvPaso < G._juvSet.length) && !G.debutEdad){ window._juvenilesMundo(); return; }
  window._clubMundo();
};
// ── HUB DE CARRERA ───────────────────────────────────────────────────────────────
window._carreraHub = function(){
  lyChrome(true);
  if(!G) G=load(); if(!G){ window._carreraStart(); return; }
  const m=document.getElementById('carrera-modal')||overlay();
  const [c1,c2]=kitOf(G.pais);
  const tline = (G.timeline||[]).slice().sort((a,b)=>a.edad-b.edad);
  m.innerHTML=`
  <div style="max-width:1040px;margin:0 auto;padding:16px 16px calc(96px + env(safe-area-inset-bottom));">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <button onclick="window._clubMundo()" style="background:rgba(255,255,255,.06);border:none;color:#aaa;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;"><i class='bx bx-arrow-back'></i></button>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:18px;color:#fff;">Tu carrera</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr;gap:16px;">
      <!-- Cabecera del jugador -->
      <div style="background:rgba(255,255,255,.03);border:1px solid #1c1c1c;border-radius:16px;padding:16px;">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0;">
            ${avatarBox(avatarDeG(2.6, _poseHub()), '6px 10px', escenaDePose(_poseHub(), G.avatar, G.edad))}
            <div style="width:64px;border-radius:10px;background:linear-gradient(150deg,#e08a1e,#a85e0e);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 0;"><div style="font-size:8px;font-weight:800;color:rgba(255,255,255,.8);letter-spacing:1px;">NIVEL</div><div style="font-size:20px;font-weight:900;color:#fff;line-height:1;">${Math.round(G.nivel)}</div></div>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:7px;margin-bottom:3px;">${flagImg(G.pais,20)}<span style="font-size:11px;font-weight:900;color:#fff;">${esc((G.pais||'').slice(0,3).toUpperCase())}</span><span style="font-size:10px;font-weight:900;color:${A};background:rgba(186,255,0,.12);border:1px solid rgba(186,255,0,.3);border-radius:6px;padding:2px 7px;">#${G.num} ${esc(G.pos)}</span></div>
            <div style="display:flex;align-items:center;gap:8px;font-size:15px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${clubBadge(G.club,22)} ${esc(G.club)}</div>
            <div style="font-size:11px;color:#8a8f96;margin-top:2px;">${esc(G.liga)}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;"><div style="font-size:10px;color:#666;font-weight:800;">EDAD</div><div style="font-size:20px;font-weight:900;color:#fff;">${G.edad}</div><div style="font-size:9px;color:#666;margin-top:4px;">VALOR</div><div style="font-size:12px;font-weight:900;color:${A};">${eur(G.valor||0)}</div></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:14px;text-align:center;">
          <div style="flex:1;"><div style="font-size:10px;color:#666;font-weight:800;">PJ</div><div style="font-size:18px;font-weight:900;color:#fff;">${G.tot.pj}</div></div>
          <div style="flex:1;"><div style="font-size:10px;color:#666;font-weight:800;">GLS</div><div style="font-size:18px;font-weight:900;color:#fff;">${G.tot.g}</div></div>
          <div style="flex:1;"><div style="font-size:10px;color:#666;font-weight:800;">AST</div><div style="font-size:18px;font-weight:900;color:#fff;">${G.tot.a}</div></div>
          <div style="flex:1;"><div style="font-size:10px;color:#666;font-weight:800;">TÍTULOS</div><div style="font-size:18px;font-weight:900;color:${A};">${G.titulos}</div></div>
        </div>
        ${(function(){ const R=G.rival; if(!R||!(R.ganados+R.perdidos)) return ''; const rel=R.relacion||0; const relTxt=rel<=-40?'Te odia':rel<=-15?'Rivalidad picante':rel>=30?'Respeto mutuo':'Rivalidad'; return `<div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.03);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:8px 12px;"><div style="font-size:11px;color:#8a8f96;font-weight:800;"><i class='bx bx-target-lock' style="color:#ef4444;"></i> Duelo con ${esc(R.nombre)} · ${relTxt}</div><div style="font-size:12px;font-weight:900;color:#fff;"><span style="color:#22c55e;">${R.ganados}</span>—<span style="color:#ef4444;">${R.perdidos}</span></div></div>`; })()}
        ${(function(){ const F=G.flags||{}; const badges=[]; if(F.marcado) badges.push(['En el banco','#ef4444']); if(F.pidioSalida) badges.push(['Pidió salida','#f59e0b']); if(F.rechazoRenov) badges.push(['Transferible','#f59e0b']); if(F.traidor) badges.push(['Traidor','#ef4444']); if(F.dopado&&!F.suspendido) badges.push(['Zona gris','#f59e0b']); if(F.suspendido) badges.push(['Sancionado','#ef4444']); if(F.ludopata) badges.push(['Ludopatía','#f59e0b']); if(F.deudaMafia) badges.push(['Deuda peligrosa','#dc2626']); if(F.arreglo) badges.push(['Amaño','#dc2626']); if(F.filantropo) badges.push(['Filántropo','#22c55e']); if(F.limpio) badges.push(['Limpio','#22c55e']); if(F.redimido) badges.push(['Redimido','#4fc3f7']); if(F.doblenac) badges.push(['Doble nacionalidad','#a78bfa']); if(F.villano) badges.push(['Villano','#ef4444']); if(!badges.length) return ''; return `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;">${badges.map(b=>`<span style="background:${b[1]}18;border:1px solid ${b[1]}55;color:${b[1]};border-radius:20px;padding:3px 9px;font-size:10px;font-weight:800;">${b[0]}</span>`).join('')}</div>`; })()}
        ${(function(){ const v=(G.idolatria&&G.idolatria[G.club])||0; const lbl=v>=70?'ÍDOLO ETERNO':v>=40?'Ídolo':v>=15?'Querido':v>=-10?'Uno más':v>=-40?'Cuestionado':'Odiado'; const col=v>=40?A:v>=15?'#4fc3f7':v>=-10?'#aaa':v>=-40?'#f59e0b':'#ef4444'; return `<div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.03);border:1px solid ${col}44;border-radius:10px;padding:8px 12px;"><div style="font-size:11px;color:#8a8f96;font-weight:800;"><i class='bx bx-heart' style="color:${col};"></i> Hinchada de ${esc(G.club)}</div><div style="font-size:12px;font-weight:900;color:${col};">${lbl} · ${v>0?'+':''}${v}</div></div>`; })()}
        ${avisoRetiroHTML()}
        <button onclick="window._carreraTemporada()" style="width:100%;margin-top:14px;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:12px;padding:14px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;">${G.edad>=edadRetiro()?'VER RETIRO':'JUGAR TEMPORADA '+G.temporada}  <i class='bx bx-right-arrow-alt'></i></button>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button onclick="window._carreraPedirSalida()" style="flex:1;background:rgba(239,68,68,.08);color:#f87171;border:1px solid rgba(239,68,68,.3);border-radius:12px;padding:11px;font-weight:800;font-size:12px;cursor:pointer;"><i class='bx bx-log-out'></i> Pedir salida</button>
          <button onclick="window._carreraBienes()" style="flex:1;background:rgba(250,204,21,.08);color:#facc15;border:1px solid rgba(250,204,21,.3);border-radius:12px;padding:11px;font-weight:800;font-size:12px;cursor:pointer;"><i class='bx bx-wallet'></i> Mis bienes</button>
        </div>
        <button onclick="window._lyAuto(true)" style="width:100%;margin-top:8px;background:rgba(167,139,250,.1);color:#c4b5fd;border:1px solid rgba(167,139,250,.35);border-radius:12px;padding:11px;font-weight:800;font-size:12px;cursor:pointer;"><i class='bx bx-play-circle'></i> Ver la carrera en automático</button>
        <button onclick="window._lyIntensidad()" style="width:100%;margin-top:8px;background:rgba(255,255,255,.04);color:#9aa48f;border:1px solid #262c22;border-radius:12px;padding:11px;font-weight:800;font-size:12px;cursor:pointer;"><i class='bx bx-slider-alt'></i> Ritmo: ${esc((DIF_INFO.find(d=>d[0]===(G.dif||'normal'))||DIF_INFO[1])[1])} — cambiar</button>
        ${ancestros().length?`<button onclick="window._verAncestros()" style="width:100%;margin-top:8px;background:rgba(167,139,250,.08);color:#c4b5fd;border:1px solid rgba(167,139,250,.3);border-radius:12px;padding:11px;font-weight:800;font-size:12px;cursor:pointer;"><i class='bx bx-sitemap'></i> Ver la carrera de mi ${esc((ancestros()[ancestros().length-1]||{}).parentesco||'padre')}</button>`:''}
        <div style="display:none;">
        </div>
      </div>
      <!-- Línea de tiempo: TODAS las temporadas jugadas, con posición y trofeo -->
      <div style="background:rgba(255,255,255,.03);border:1px solid #1c1c1c;border-radius:16px;padding:8px 14px;">
        <div style="font-size:11px;font-weight:900;color:#9aa0a6;letter-spacing:.5px;padding:4px 0 8px;">HISTORIAL POR TEMPORADA</div>
        <div style="display:flex;font-size:10px;font-weight:800;color:#666;padding:6px 0;border-bottom:1px solid #1c1c1c;"><span style="width:30px;">EDAD</span><span style="flex:1;">CLUB</span><span style="width:34px;text-align:center;">POS</span><span style="width:30px;text-align:center;">NIV</span><span style="width:28px;text-align:center;">PJ</span><span style="width:28px;text-align:center;">GLS</span><span style="width:28px;text-align:center;">AST</span></div>
        ${tline.length?tline.map(t=>`<div style="display:flex;align-items:center;font-size:12px;padding:9px 0;border-bottom:1px solid #131313;color:#fff;">
          <span style="width:30px;font-weight:800;">${t.edad}</span>
          <span style="flex:1;display:flex;align-items:center;gap:6px;min-width:0;"><span style="flex-shrink:0;">${clubBadge(t.club,20)}</span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(t.club)}</span>
            ${(t.titulos||(t.titulo?[t.titulo]:[])).map(tt=>`<span title="${esc(tt)}" style="flex-shrink:0;display:inline-flex;">${trofeoRender(tt,16)}</span>`).join('')}
            ${(t.premios||[]).map(pn=>`<span title="${esc(pn)}" style="flex-shrink:0;display:inline-flex;">${premioRender(pn,15)}</span>`).join('')}
          </span>
          <span style="width:34px;text-align:center;font-weight:800;color:${t.pos===1?A:t.pos<=4?'#4fc3f7':'#999'};">${t.pos?t.pos+'º':'—'}</span>
          <span style="width:30px;text-align:center;font-weight:900;color:${A};">${t.niv}</span>
          <span style="width:28px;text-align:center;">${t.pj}</span>
          <span style="width:28px;text-align:center;">${t.g}</span>
          <span style="width:28px;text-align:center;">${t.a}</span>
        </div>`).join(''):`<div style="text-align:center;padding:24px;color:#555;font-size:12px;">Jugá tu primera temporada para ver tu historial.</div>`}
      </div>
      ${(G.vitrina&&G.vitrina.length)?`<div style="background:rgba(255,255,255,.03);border:1px solid #1c1c1c;border-radius:16px;padding:14px;">
        <div style="font-size:11px;font-weight:900;color:#9aa0a6;letter-spacing:.5px;margin-bottom:10px;"><i class='bx bxs-trophy' style="color:${A};"></i> VITRINA · ${G.vitrina.length} título${G.vitrina.length!==1?'s':''}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:10px;">${G.vitrina.map(v=>`<div style="text-align:center;background:rgba(250,204,21,.05);border:1px solid rgba(250,204,21,.18);border-radius:11px;padding:8px 4px;"><div style="height:50px;display:flex;align-items:center;justify-content:center;">${trofeoRender(v.nombre, 46)}</div><div style="font-size:9px;color:#e4e4d8;font-weight:800;margin-top:5px;line-height:1.25;">${esc(v.nombre)}</div><div style="font-size:8px;color:#7a8070;margin-top:2px;">${esc(v.club||'')} · ${v.edad}a</div></div>`).join('')}</div>
      </div>`:''}
    </div>
  </div>`;
};

// ── TEMPORADA (simulación + decisión) ────────────────────────────────────────────
window._carreraTemporada = function(){
  if(G.edad>=edadRetiro()) return retiro();
  // ── Rendimiento individual ──
  // Si quedaste MARCADO (pediste salir o rechazaste renovar y te quedaste), jugás
  // muchísimo menos: el técnico te manda al banco. Efecto mariposa real.
  const _marcado = !!(G.flags && G.flags.marcado);
  const pj = _marcado ? ri(6,16) : ri(24,36);
  const atk = {POR:0.02,DFC:0.05,LI:0.08,LD:0.08,MCD:0.12,MI:0.35,MD:0.35,MC:0.25,MCO:0.5,EI:0.55,ED:0.55,DC:0.75}[G.pos]||0.3;
  const factor = (G.nivel/100) * (0.7+Math.random()*0.6) * (_marcado ? 0.75 : 1);
  const g = Math.round(pj*atk*factor);
  const a = Math.round(pj*(atk*0.6+0.1)*factor);
  G.tot.pj+=pj; G.tot.g+=g; G.tot.a+=a;
  const rend=(g+a)/pj;                        // rendimiento 0..~1.3
  // ── Nivel: CURVA por edad (sube joven, se estanca, baja de grande) + rendimiento ──
  let dN;
  if(G.edad<=20) dN=ri(2,5); else if(G.edad<=24) dN=ri(1,4); else if(G.edad<=28) dN=ri(0,2);
  else if(G.edad<=31) dN=ri(-1,1); else if(G.edad<=34) dN=ri(-3,0); else dN=ri(-5,-1);
  if(rend>0.6) dN+=2; else if(rend>0.35) dN+=1; else if(rend<0.15) dN-=1;   // el bajo rendimiento penaliza
  if(_marcado) dN -= 3;   // sin minutos no se crece: la decisión te cuesta nivel
  // El salto de la temporada pasa por el mismo freno: de 88 para arriba cuesta
  // cada vez mas y a 99 llegan cuatro en la historia del futbol.
  subirNivel(dN);
  // ── POSICIÓN en la liga: depende de fuerza del club + tu aporte + azar ──
  const clubs = (LIGAS.find(L=>L.liga===G.liga)||{}).clubs || [];
  const totalEq = Math.max(6, clubs.length);
  // Fuerza esperada del club (ranking) + tu aporte relativo → posición.
  const strengths = clubs.map(c=>c[1]).sort((a,b)=>b-a);
  let baseRank = strengths.indexOf(G.clubStr); if(baseRank<0) baseRank = Math.floor(totalEq/2);
  // Aporte del jugador REDUCIDO: un crack solo NO gana la liga; ayuda pero no decide todo.
  const aporte = clamp((rend-0.3)*2.2 + (G.nivel-G.clubStr)/18, -1.6, 1.6);
  // Ruido más amplio y con sesgo hacia abajo (rara vez todo sale perfecto).
  // También podés DESCENDER incluso siendo grande si tenés temporada horrible.
  let pos = Math.round(baseRank+1 - aporte + rnd(-2.0, 4.5));
  pos = clamp(pos, 1, totalEq);
  // ── MOMENTO CLAVE: si quedaste 2º, hay una última fecha que define el campeonato.
  // Se resuelve con una decisión tuya que puede darte el título o hundirte. Como
  // requiere input del usuario, se pausa acá y la temporada sigue en _finTemporada.
  if (pos === 2 && Math.random() < 0.75) {
    G._pend = { pj, g, a, dN, rend, totalEq };
    window._carreraMomentoClave();
    return;
  }
  return _finTemporada({ pj, g, a, dN, rend, pos, totalEq, momento:null });
};
// ── MOMENTO CLAVE (definición del campeonato) ────────────────────────────────
const MOMENTOS = [
  { t:'La última pelota del campeonato', d:'Último minuto de la última fecha. Empatados, el campeón se define con este partido. La pelota te queda a vos, solo contra el arquero, con el estadio de pie.', opts:[
    { txt:'Definir cruzado, como siempre', p:0.55, ok:'La clavaste en el ángulo lejano. El estadio explota. CAMPEÓN.', no:'El arquero adivinó y la sacó al córner. Se terminó ahí.' },
    { txt:'Amagar y sentarlo', p:0.42, ok:'Lo sentaste y la empujaste con el arco vacío. Un gol para la eternidad.', no:'Amagaste de más, volvió un defensor y despejó. Silencio total.' },
    { txt:'Pasarla al compañero mejor ubicado', p:0.62, ok:'Se la diste servida y la mandó a guardar. No fue tu gol, pero fue tu campeonato.', no:'Se la diste y la tiró afuera. Todos te van a preguntar por qué no pateaste.' } ] },
  { t:'Penal en el último minuto', d:'Penal a favor en el minuto 94 de la última fecha. Si entra, son campeones. El arquero rival te mira fijo y se para en el medio del arco.', opts:[
    { txt:'Fuerte y al medio', p:0.58, ok:'Se tiró y vos la reventaste por el centro. CAMPEÓN.', no:'Se quedó parado. Se la comió con el cuerpo. Increíble.' },
    { txt:'Colocada abajo a un palo', p:0.52, ok:'Rasante, pegadita al palo. Imposible. CAMPEONES.', no:'La colocaste bien pero el arquero voló y llegó con la punta de los dedos.' },
    { txt:'Picarla por el medio (Panenka)', p:0.35, ok:'La picaste con una frialdad de asesino. El estadio no lo puede creer. CAMPEÓN.', no:'El arquero no se movió. La agarró en el aire. El papelón de tu vida.' } ] },
  { t:'La final del torneo', d:'Se define en una final a partido único. El técnico te pregunta cómo querés que juguemos: vos sos el referente y va a hacer lo que digas.', opts:[
    { txt:'Salir a buscarlo desde el arranque', p:0.50, ok:'Los ahogamos en su campo y a los 20 ya ganábamos 2-0. Fiesta.', no:'Nos agarraron mal parados de contra. 0-2 en 25 minutos. No hubo vuelta.' },
    { txt:'Aguantar y golpear de contra', p:0.55, ok:'Aguantamos todo el primer tiempo y los liquidamos con dos contras. Inteligencia pura.', no:'Nos metimos atrás y nos ahogaron. Cayó el gol a los 80.' },
    { txt:'Jugar como siempre, sin cambiar nada', p:0.60, ok:'Fuimos fieles a lo nuestro y alcanzó. Campeones haciendo lo que sabemos.', no:'Ellos se prepararon mejor para esta final. Nos leyeron todo.' } ] }
];
window._carreraMomentoClave = function(){
  const mm = pick(MOMENTOS);
  G._momento = mm;
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:26px 20px calc(30px + env(safe-area-inset-bottom));">
    <div style="text-align:center;margin-bottom:16px;">
      <div style="font-size:11px;font-weight:900;letter-spacing:3px;color:#facc15;animation:crPulse 1.2s ease-in-out infinite;">⚡ MOMENTO CLAVE</div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:26px;color:#fff;margin-top:8px;line-height:1.15;">${esc(mm.t)}</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:7px;margin-top:8px;">${clubBadge(G.club,26)}<span style="font-size:12px;color:#9aa0a6;">${esc(G.club)} · ${esc(G.liga)}</span></div>
    </div>
    <div style="background:linear-gradient(160deg,rgba(250,204,21,.10),rgba(20,22,18,.6));border:1.5px solid rgba(250,204,21,.4);border-radius:16px;padding:18px;">
      <div style="font-size:14px;color:#e8e8e0;line-height:1.65;margin-bottom:16px;">${esc(mm.d)}</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${mm.opts.map((o,i)=>`<button onclick="window._momentoElegir(${i})" style="${btn(i===0)}">${o.txt}</button>`).join('')}
      </div>
    </div>
  </div>
  <style>@keyframes crPulse{0%,100%{opacity:1}50%{opacity:.45}}</style>`;
};
window._momentoElegir = function(i){
  const mm = G._momento; const o = mm.opts[i]; if(!o) return;
  // Tu nivel inclina la balanza: un crack define más seguido.
  const bonus = clamp((G.nivel - 70) / 220, -0.08, 0.12);
  const exito = Math.random() < clamp(o.p + bonus, 0.15, 0.88);
  const p = G._pend;
  const pos = exito ? 1 : 2;
  if(exito){ G.fama = clamp((G.fama||0) + 14, 0, 100); G.moral = clamp((G.moral||70) + 12, 0, 100); }
  else { G.moral = clamp((G.moral||70) - 10, 0, 100); }
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
    <div style="max-width:520px;margin:0 auto;padding:70px 20px 40px;text-align:center;">
      <div style="font-size:52px;margin-bottom:6px;">${exito?'🏆':'💔'}</div>
      <div style="font-size:11px;font-weight:900;letter-spacing:3px;color:${exito?A:'#ef4444'};margin-bottom:14px;">${exito?'LO LOGRASTE':'NO SE PUDO'}</div>
      <div style="font-size:17px;color:#fff;font-weight:700;line-height:1.6;margin-bottom:28px;max-width:400px;margin-left:auto;margin-right:auto;">${esc(exito?o.ok:o.no)}</div>
      <button onclick="window._momentoSeguir(${pos})" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:14px 32px;font-weight:900;cursor:pointer;font-size:15px;">Ver la temporada <i class='bx bx-right-arrow-alt'></i></button>
    </div>`;
};
window._momentoSeguir = function(pos){
  const p = G._pend; const mm = G._momento;
  G._pend = null; G._momento = null;
  _finTemporada({ pj:p.pj, g:p.g, a:p.a, dN:p.dN, rend:p.rend, pos, totalEq:p.totalEq, momento:{ t:mm.t, exito: pos===1 } });
};
// ── FIN DE TEMPORADA (títulos, premios, ascensos, valor, timeline, rival) ─────
// (al cerrar el año se revisa si ya superaste al ancestro del legado)
function _finTemporada(ctx){
  // `pos` se reasigna más abajo (anti-dinastía puede bajarte del 1º puesto),
  // por eso va con let y no con const.
  const { pj, g, a, dN, rend, totalEq, momento } = ctx;
  let pos = ctx.pos;
  // ── TÍTULOS coherentes con la liga (pueden acumularse en la misma temporada) ──
  const T = trofeosDe(G.liga);
  const titulosGanados = [];
  // ── ANTI-DINASTÍA ────────────────────────────────────────────────────────────
  // Ganar el mismo torneo muchos años seguidos no es realista ni divertido. Cada
  // título consecutivo reduce fuerte la chance del siguiente (fatiga de campeón,
  // rivales que refuerzan, presión). Se resetea cuando cortás la racha.
  if(!G.rachaTitulos) G.rachaTitulos = {};
  const _racha = (t)=> G.rachaTitulos[t] || 0;
  const _penal = (t)=> Math.pow(0.55, _racha(t));     // 1ª:100% 2ª:55% 3ª:30% 4ª:17%
  // Liga local: SOLO si sos primero — y si venís de ganarla, cuesta bastante más.
  if (pos === 1){
    if (_racha(T.local) === 0 || Math.random() < _penal(T.local)) titulosGanados.push(T.local);
    else { pos = ri(2,4); }   // el equipo se relajó: termina 2º-4º
  }
  // Copa nacional: chance INDEPENDIENTE de la liga (grandes la ganan más seguido, pero
  // con techo bajo — la copa es a eliminación directa, cualquiera te puede voltear).
  if (T.copaNac && Math.random() < clamp((G.clubStr-58)/160, 0.03, 0.22) * _penal(T.copaNac)) titulosGanados.push(T.copaNac);
  // Copa internacional (Champions/Libertadores): si el club es GRANDE y clasificó.
  // Guardo la RONDA alcanzada para mostrarla aunque no gane.
  let interRonda = null, interLiteRonda = null;
  const rondasInter = ['Fase de grupos','Octavos','Cuartos','Semifinal','Final'];
  if (G.clasificadoInter && T.inter) {
    const chance = clamp((G.clubStr-72)/85, 0, 0.28) * _penal(T.inter);
    const gano = Math.random() < chance;
    if (gano) { titulosGanados.push(T.inter); interRonda = 'CAMPEÓN'; }
    else {
      // Ronda alcanzada según fuerza del club.
      const maxR = clamp(Math.floor((G.clubStr-68)/5), 0, 4);
      interRonda = rondasInter[ri(0, maxR)];
    }
  }
  if (G.clasificadoInterLite && T.interLite) {
    const chance = clamp((G.clubStr-65)/95, 0, 0.26);
    const gano = Math.random() < chance;
    if (gano) { titulosGanados.push(T.interLite); interLiteRonda = 'CAMPEÓN'; }
    else {
      const maxR = clamp(Math.floor((G.clubStr-62)/5), 0, 4);
      interLiteRonda = rondasInter[ri(0, maxR)];
    }
  }
  // Persistir cada trofeo en la vitrina — guardando SIEMPRE el club donde se ganó.
  titulosGanados.forEach(t => {
    G.titulos++; if(!G.vitrina) G.vitrina=[];
    G.vitrina.push({ nombre:t, edad:G.edad, club:G.club, liga:G.liga, anio:G.anio, img:trofeoImgSlug(t) });
  });
  // Actualizar rachas: +1 a los ganados este año, reset a los que se cortaron.
  Object.keys(G.rachaTitulos).forEach(k => { if (titulosGanados.indexOf(k) < 0) G.rachaTitulos[k] = 0; });
  titulosGanados.forEach(t => { G.rachaTitulos[t] = (G.rachaTitulos[t] || 0) + 1; });
  // El "titulo" del resumen: prioriza internacional > copa nacional > liga (el mas importante).
  const priTitulo = (arr) => {
    if (!arr.length) return null;
    const orden = ['champions','libertadores','intercontinental','mundial-clubes','europa','sudamericana'];
    for (const clave of orden) { const t = arr.find(x => trofeoImgSlug(x) === clave); if (t) return t; }
    if (T.copaNac && arr.indexOf(T.copaNac) >= 0) return T.copaNac;
    return arr[0];
  };
  let titulo = priTitulo(titulosGanados);
  // ── PREMIOS INDIVIDUALES ────────────────────────────────────────────────────
  // Balón de Oro / Bota de Oro / The Best se otorgan segun rendimiento excepcional
  // de la temporada. NO todos juntos siempre, cada uno con umbral distinto.
  if(!G.premios) G.premios = [];
  if(!G.rachaTitulos) G.rachaTitulos = {};
  const premiosAnio = [];   // los de ESTA temporada, para mostrarlos ya en el resumen
  const _darPremio = (nombre) => {
    G.premios.push({ nombre, edad:G.edad, temporada:G.temporada, club:G.club, anio:G.anio });
    premiosAnio.push(nombre);
  };
  // El mismo premio dos años seguidos también cuesta más (anti-dinastía individual).
  const _pPen = (n)=> Math.pow(0.6, G.rachaTitulos['_p_'+n] || 0);
  if (g >= 30 && G.nivel >= 82 && Math.random() < 0.55 * _pPen('Bota de Oro')) _darPremio('Bota de Oro');
  if (G.nivel >= 88 && (titulosGanados.length >= 2 || (titulosGanados.includes(T.inter))) && Math.random() < 0.35 * _pPen('Balón de Oro')) {
    _darPremio('Balón de Oro');
  } else if (G.nivel >= 86 && titulosGanados.length >= 1 && Math.random() < 0.25 * _pPen('The Best')) {
    _darPremio('The Best');
  }
  if (G.pos === 'POR' && G.nivel >= 80 && Math.random() < 0.30 * _pPen('Guante de Oro')) _darPremio('Guante de Oro');
  // El mejor joven se gana UNA vez: despues ya no sos promesa.
  if (G.edad <= 21 && G.nivel >= 78 && !(G.premios||[]).some(x=>x.nombre==='Mejor Jugador Joven')
      && Math.random() < 0.30) _darPremio('Mejor Jugador Joven');
  // Rachas de premios
  ['Bota de Oro','Balón de Oro','The Best','Guante de Oro'].forEach(n=>{
    const k = '_p_'+n;
    G.rachaTitulos[k] = premiosAnio.indexOf(n) >= 0 ? (G.rachaTitulos[k]||0)+1 : 0;
  });
  // Clasificación a copa internacional del PRÓXIMO año según puesto.
  G.clasificadoInter = (pos<=4 && ligaNivel(G.liga)>=6);
  G.clasificadoInterLite = (pos>=5 && pos<=6 && ligaNivel(G.liga)>=6);
  // ── ASCENSOS / DESCENSOS ─────────────────────────────────────────────────────
  // Últimas 2 posiciones → DESCIENDE. Puestos 1-2 (o campeón) de una liga
  // secundaria → ASCIENDE. Cambia G.liga automáticamente y muestra en el timeline.
  G.moveLiga = null;
  const _pair = pairLiga(G.liga);
  if (pos >= totalEq - 1 && _pair && _pair.abajo) {
    // Descenso
    G.liga = _pair.abajo;
    G.clubStr = Math.max(38, G.clubStr - ri(6, 10)); // el club pierde fuerza al descender
    G.moveLiga = { tipo:'desc', a:_pair.abajo };
  } else if (pos === 1 && _pair && _pair.arriba) {
    // Ascenso (con el campeón)
    G.liga = _pair.arriba;
    G.clubStr = Math.min(90, G.clubStr + ri(4, 8));
    G.moveLiga = { tipo:'asc', a:_pair.arriba };
  }
  const clasifText = (T.inter && pos<=4 && ligaNivel(G.liga)>=6) ? ('Clasificaste a '+T.inter)
                   : (T.interLite && pos<=6 && ligaNivel(G.liga)>=6) ? ('Clasificaste a '+T.interLite) : null;
  // ── Valor de mercado ── Escalado por LIGA + CLUB (interior no vale como top europeo)
  const edadFactor = G.edad<28?1.25:G.edad<32?0.85:0.45;
  const ligaMult = 0.05 + ligaNivel(G.liga)*0.10;                     // 0.05 (interior) → 1.35 (Brasileirão)
  const clubMult = Math.max(0.15, (G.clubStr-45)/40);                  // 0.15 (str 51) → 1.35 (str 90)
  G.valor = Math.round(((G.nivel**2.4)*edadFactor*20 + G.titulos*80000) * ligaMult * clubMult);
  G.valor = Math.max(300, G.valor);
  // ── Timeline COMPLETO (una fila por temporada, con posición y trofeo) ──
  // Texto de participación en copa internacional (aunque no gane).
  const interCopa = interRonda ? `${T.inter}: ${interRonda}` : null;
  const interLiteCopa = interLiteRonda ? `${T.interLite}: ${interLiteRonda}` : null;
  G.timeline.push({ edad:G.edad, temporada:G.temporada, club:G.club, liga:G.liga, niv:Math.round(G.nivel), pj, g, a, dN, pos, totalEq, titulo, titulos:titulosGanados.slice(), premios:premiosAnio.slice(), clasif:clasifText, move:G.moveLiga, interCopa, interLiteCopa });
  // ── BALANCE ANUAL + RENDIMIENTO DE INVERSIONES ──────────────────────────────
  const bal = balanceAnual();
  const inv = rendirInversiones();
  G.dinero = Math.max(0, Math.round((G.dinero||0) + bal.neto));
  // Bancarrota: si el tren de vida te comió todo, tenés que vender.
  if(!G.flags) G.flags = {};
  if (G.dinero <= 0 && bal.egresos > bal.ingresos && (G.bienes||[]).length) G.flags.enRojo = true;
  else if (G.dinero > (bal.egresos||0)) G.flags.enRojo = false;
  // ── DUELO CON EL NÉMESIS ────────────────────────────────────────────────────
  // El rival juega su propia temporada. Se compara (G+A) y se define quién ganó el año.
  let duelo = null;
  if (!G.rival) G.rival = crearRival(G.pais, G.pos, Math.round(G.nivel));
  {
    const R = G.rival;
    const rs = simularRival(R, G.edad);
    const miAporte = g + a, suAporte = rs.g + rs.a;
    const gane = miAporte > suAporte;
    if (gane) R.ganados++; else R.perdidos++;
    // Relación: si le ganás seguido te odia; si te gana seguido y sos digno, hay respeto.
    R.relacion = clamp(R.relacion + (gane ? -6 : 3), -100, 100);
    duelo = {
      nombre: R.nombre, gane,
      mio: { g, a }, suyo: { g: rs.g, a: rs.a },
      nivel: Math.round(R.nivel), titulos: R.titulos,
      ganados: R.ganados, perdidos: R.perdidos,
      // Primera vez: el resumen lo PRESENTA en vez de tirar un marcador sin contexto.
      primero: (R.ganados + R.perdidos) === 1,
      pos: R.pos, pais: R.pais
    };
  }
  // IDOLATRÍA: cada temporada al mismo club suma. Títulos y buen rendimiento aceleran.
  if(!G.idolatria) G.idolatria = {};
  const idBase = 4 + (titulosGanados.length*10) + (pos===1?6:pos<=3?3:0) + (rend>0.5?4:rend<0.15?-3:0);
  G.idolatria[G.club] = clamp((G.idolatria[G.club]||0) + idBase, -100, 100);
  G.temporada++; G.edad++; G.anio = (G.anio||2026) + 1;
  // La temporada retro dura eso: una temporada. Después el mundo vuelve a ser el
  // que era, con su año y su tecnología.
  if (G._retro != null) G._retro = null;
  G.nivelMax = Math.max(G.nivelMax||0, Math.round(G.nivel||0));
  try { legadoChequear(); } catch(e){}
  // El cuerpo acusa el paso del tiempo: entradas, canas, anteojos.
  avEnvejecer(G.edad);
  // Los chicos crecen un año por temporada, no solo después del retiro.
  const _fam = G.familia || {};
  (_fam.hijos||[]).forEach(h=> h.edad = (h.edad||0) + 1);
  (_fam.nietos||[]).forEach(n=> n.edad = (n.edad||0) + 1);
  // Las lesiones se curan solas al pasar la temporada.
  if(G.avatar){ G.avatar.vendaje = false; G.avatar.muletas = false; }
  G._mercadoHecho = false;
  save();
  // Nota del diario local sobre tu temporada.
  const prensa = notaPrensa({ pj, g, a, pos, totalEq, titulo, rend });
  // Tablas de la temporada (posiciones, goleadores, asistencias) — deterministas.
  G._tablasData = {
    liga: G.liga, club: G.club, anio: (G.anio||2026)-1,
    tabla: generarTabla(G.liga, G.club, pos, (G.temporada||1)*7 + (G.anio||2026)),
    gol: generarIndividuales(G.liga, (G.temporada||1)*13 + (G.anio||2026), g, a).gol,
    asi: generarIndividuales(G.liga, (G.temporada||1)*13 + (G.anio||2026), g, a).asi
  };
  // ¿Alguna decisión vieja vence esta temporada? Se resuelve acá para que el
  // resumen la muestre junto al resto de lo que pasó en el año.
  const eco = resolverEco();
  resumenTemporada({pj,g,a,dN,pos,totalEq,titulo,titulos:titulosGanados,premios:premiosAnio,clasif:clasifText,move:G.moveLiga,interCopa,interLiteCopa,duelo,momento,bal,inv,prensa,eco});
}

// Vitrina completa agrupada por trofeo (Liga ×4, Champions ×2...). Se usa en el
// resumen de temporada para que la vitrina CREZCA con la carrera en vez de
// mostrar sólo lo del año y quedar recortada.
function vitrinaAgrupada(){
  const g = {};
  (G.vitrina||[]).forEach(v=>{ const k = v.nombre; if(!g[k]) g[k] = { nombre:k, count:0, seleccion:false }; g[k].count++; if(/selecci[oó]n/i.test(v.club||'')) g[k].seleccion = true; });
  return Object.values(g).sort((a,b)=>b.count-a.count);
}
function resumenTemporada(r){
  const m=document.getElementById('carrera-modal')||overlay();
  m.innerHTML=`
  <div style="max-width:520px;margin:0 auto;padding:30px 22px calc(30px + env(safe-area-inset-bottom));min-height:100%;display:flex;flex-direction:column;">
    <div style="text-align:center;margin-bottom:18px;">
      <div style="font-size:11px;font-weight:900;letter-spacing:2px;color:${A};">TEMPORADA ${G.temporada-1} · ${G.edad-1} AÑOS</div>
      <div style="display:flex;justify-content:center;margin:8px 0 4px;">${avatarBox(avatarDeG(3.2, _poseTemporada(r), { edad:G.edad-1 }), '10px 16px', escenaDePose(_poseTemporada(r), G.avatar, G.edad-1))}</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:6px;">${clubBadge(G.club,26)}<div style="font-family:Outfit,sans-serif;font-weight:900;font-size:20px;color:#fff;">${esc(G.club)}</div></div>
      <div style="font-size:12px;color:#9aa0a6;margin-top:2px;">${esc(G.liga)} · ${posLabel(r.pos)} de ${r.totalEq}</div>
      <!-- TODOS los títulos del año, no sólo el "más importante". Si ganaste liga,
           copa y una internacional en la misma temporada, se ven las tres copas
           una al lado de la otra, cada una con su nombre. -->
      ${(r.titulos&&r.titulos.length)?`<div style="margin-top:14px;">
        <div style="display:flex;flex-wrap:wrap;gap:14px;justify-content:center;align-items:flex-end;">
          ${r.titulos.map((t,i)=>{ const s = r.titulos.length===1?100:r.titulos.length===2?76:62; return `
          <div style="display:flex;flex-direction:column;align-items:center;max-width:140px;animation:crTrophy .7s cubic-bezier(.2,1.4,.4,1) ${(i*0.16).toFixed(2)}s both;">
            <div style="height:${s+6}px;display:flex;align-items:flex-end;justify-content:center;">${trofeoRender(t, s)}</div>
            <div style="margin-top:7px;font-size:${r.titulos.length===1?'16':'12.5'}px;font-weight:900;color:${A};text-align:center;line-height:1.2;">¡${esc(t)}!</div>
          </div>`; }).join('')}
        </div>
        <div style="font-size:11px;color:#8a8f96;margin-top:8px;">${r.titulos.length>1?`${r.titulos.length} títulos en una temporada con `:'Campeón con '}${esc(G.club)}</div>
      </div><style>@keyframes crTrophy{0%{transform:scale(.3) rotate(-12deg);opacity:0}100%{transform:scale(1) rotate(0);opacity:1}}@keyframes crPop{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}</style>`:''}
      <!-- PREMIOS INDIVIDUALES destacados aparte: un Balón de Oro no puede quedar
           mezclado como un ítem más de una lista. -->
      ${(r.premios&&r.premios.length)?`<div style="margin-top:16px;background:linear-gradient(160deg,rgba(245,158,11,.14),rgba(20,22,18,.6));border:1.5px solid rgba(245,158,11,.45);border-radius:16px;padding:14px;animation:crPop .5s .3s both;">
        <div style="font-size:9.5px;font-weight:900;letter-spacing:2px;color:#fbbf24;margin-bottom:10px;">🏅 PREMIO INDIVIDUAL${r.premios.length>1?'ES':''}</div>
        <div style="display:flex;gap:14px;align-items:center;justify-content:center;flex-wrap:wrap;">
          ${avatarBox(avatarDeG(2.4, 'orgullo', { edad:G.edad-1 }), '8px 12px', 'estadio')}
          <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
            ${r.premios.map(pn=>`<div style="text-align:center;max-width:110px;"><div style="height:56px;display:flex;align-items:flex-end;justify-content:center;">${premioRender(pn,52)}</div><div style="font-size:12px;font-weight:900;color:#fbbf24;margin-top:6px;line-height:1.2;">${esc(pn)}</div></div>`).join('')}
          </div>
        </div>
        <div style="font-size:11px;color:#c4a35a;margin-top:10px;">Esto no lo gana el equipo. Lo ganaste vos.</div>
      </div>`:''}
      ${r.momento?`<div style="margin-top:10px;display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:800;color:${r.momento.exito?'#facc15':'#94a3b8'};background:${r.momento.exito?'rgba(250,204,21,.1)':'rgba(148,163,184,.08)'};border:1px solid ${r.momento.exito?'rgba(250,204,21,.35)':'rgba(148,163,184,.25)'};border-radius:20px;padding:5px 12px;">⚡ ${esc(r.momento.t)} — ${r.momento.exito?'la metiste':'no se dio'}</div>`:''}
      ${r.clasif?`<div style="margin-top:12px;display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;color:#4fc3f7;background:rgba(79,195,247,.1);border:1px solid rgba(79,195,247,.3);border-radius:20px;padding:5px 12px;"><i class='bx bx-star'></i> ${esc(r.clasif)}</div>`:''}
      ${r.interCopa?`<div style="margin-top:8px;display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;color:#a78bfa;background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.3);border-radius:20px;padding:5px 12px;"><i class='bx bx-medal'></i> ${esc(r.interCopa)}</div>`:''}
      ${r.interLiteCopa?`<div style="margin-top:8px;display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;color:#f59e0b;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:20px;padding:5px 12px;"><i class='bx bx-medal'></i> ${esc(r.interLiteCopa)}</div>`:''}
      ${r.move?`<div style="margin-top:12px;display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:900;color:${r.move.tipo==='asc'?'#22c55e':'#ef4444'};background:${r.move.tipo==='asc'?'rgba(34,197,94,.12)':'rgba(239,68,68,.12)'};border:1px solid ${r.move.tipo==='asc'?'rgba(34,197,94,.4)':'rgba(239,68,68,.4)'};border-radius:20px;padding:6px 14px;"><i class='bx ${r.move.tipo==='asc'?'bx-up-arrow-alt':'bx-down-arrow-alt'}'></i> ${r.move.tipo==='asc'?'¡ASCENSO! ':'DESCENSO. '}Ahora en <b>${esc(r.move.a)}</b></div>`:''}
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px;">
      ${st('PJ',r.pj)}${st('GOLES',r.g)}${st('ASIST',r.a)}${st('NIVEL',(r.dN>=0?'+':'')+r.dN)}
    </div>
    <!-- VITRINA DE LA TEMPORADA. Antes era una tira horizontal con scroll: los
         trofeos que no entraban quedaban escondidos y los nombres largos se
         cortaban contra la caja. Ahora es una grilla que envuelve, así se ve
         TODO lo que ganaste ese año, con el nombre completo debajo. -->
    ${(G.vitrina&&G.vitrina.length)?`<div style="padding:12px;margin-bottom:12px;background:rgba(250,204,21,.06);border:1px solid rgba(250,204,21,.22);border-radius:12px;">
      <div style="font-size:9px;font-weight:900;letter-spacing:1.5px;color:#facc15;margin-bottom:10px;">TU VITRINA · ${G.vitrina.length} título${G.vitrina.length===1?'':'s'} en total</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(74px,1fr));gap:12px 8px;justify-items:center;align-items:end;">
        ${vitrinaAgrupada().map(v=>`<div style="width:100%;text-align:center;">
          <div style="height:52px;display:flex;align-items:flex-end;justify-content:center;overflow:visible;">${trofeoRender(v.nombre,46)}</div>
          <div style="font-size:8.5px;color:#e4e4d8;font-weight:800;margin-top:5px;line-height:1.3;overflow-wrap:anywhere;">${esc(v.nombre)}${v.count>1?` <span style="color:#facc15;">×${v.count}</span>`:''}</div>
        </div>`).join('')}
      </div>
    </div>`:''}
    ${(G.flags&&G.flags.marcado)?`<div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:12px;padding:10px 13px;margin-bottom:14px;font-size:11.5px;color:#f8b4b4;line-height:1.45;"><i class='bx bx-error-circle' style="color:#f87171;"></i> <b style="color:#f87171;">Temporada desde el banco.</b> Después de pedir salir jugaste apenas ${r.pj} partidos y perdiste nivel. Buscá club o vas a seguir así.</div>`:''}
    ${r.bal?(function(){ const b=r.bal; const pos=b.neto>=0; return `<div style="background:linear-gradient(160deg,rgba(250,204,21,.07),rgba(20,22,18,.5));border:1px solid rgba(250,204,21,.25);border-radius:14px;padding:12px 14px;margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;">
        <div style="font-size:10px;font-weight:900;letter-spacing:1.5px;color:#facc15;"><i class='bx bx-wallet'></i> BALANCE DEL AÑO</div>
        <div style="font-size:15px;font-weight:900;color:${pos?'#4ade80':'#ff6b6b'};">${pos?'+':'−'}${eur(Math.abs(b.neto))}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:10.5px;">
        <div style="display:flex;justify-content:space-between;color:#8a8f96;"><span>Sueldo</span><b style="color:#4ade80;">+${eur(b.sueldo)}</b></div>
        <div style="display:flex;justify-content:space-between;color:#8a8f96;"><span>Tren de vida</span><b style="color:#ff6b6b;">−${eur(b.vida)}</b></div>
        ${b.sponsors?`<div style="display:flex;justify-content:space-between;color:#8a8f96;"><span>Sponsors</span><b style="color:#4ade80;">+${eur(b.sponsors)}</b></div>`:''}
        ${b.mant?`<div style="display:flex;justify-content:space-between;color:#8a8f96;"><span>Mantenimiento</span><b style="color:#ff6b6b;">−${eur(b.mant)}</b></div>`:''}
        ${b.rentas?`<div style="display:flex;justify-content:space-between;color:#8a8f96;"><span>Rentas</span><b style="color:#4ade80;">+${eur(b.rentas)}</b></div>`:''}
        <div style="display:flex;justify-content:space-between;color:#8a8f96;"><span>Impuestos</span><b style="color:#ff6b6b;">−${eur(b.impuestos)}</b></div>
      </div>
      ${r.inv?`<div style="margin-top:9px;padding-top:9px;border-top:1px solid rgba(250,204,21,.18);display:flex;justify-content:space-between;align-items:center;font-size:11px;">
        <span style="color:#8a8f96;"><i class='bx bx-line-chart' style="color:${r.inv.col};"></i> ${esc(r.inv.perfil)}</span>
        <span style="font-weight:900;color:${r.inv.roi>=0?'#4ade80':'#ff6b6b'};">${r.inv.roi>=0?'+':''}${r.inv.roi}% → ${eur(r.inv.ahora)}</span>
      </div>`:''}
      <div style="margin-top:8px;text-align:center;font-size:11px;color:#8a8f96;">Capital: <b style="color:#facc15;font-size:13px;">${eur(G.dinero||0)}</b>${G.flags&&G.flags.enRojo?' <span style="color:#ef4444;font-weight:900;">· EN ROJO</span>':''}</div>
    </div>`; })():''}
    ${(r.duelo&&r.duelo.primero)?`<div style="background:linear-gradient(160deg,rgba(239,68,68,.12),rgba(20,22,18,.6));border:1.5px solid rgba(239,68,68,.4);border-radius:14px;padding:14px;margin-bottom:12px;">
      <div style="font-size:10px;font-weight:900;letter-spacing:2px;color:#ef4444;margin-bottom:8px;">⚔️ APARECE TU NÉMESIS</div>
      <div style="font-size:13px;color:#e8e8e0;line-height:1.6;">Toda tu camada habla de <b style="color:#fff;">${esc(r.duelo.nombre)}</b>, un ${esc(posLabelLargo(r.duelo.pos))} de ${esc(r.duelo.pais)} de tu misma edad. Arrancaron juntos y los van a comparar toda la carrera: quién mete más, quién gana más, quién llega más lejos.<br><br><span style="color:#f8b4b4;">Cada temporada vas a ver quién de los dos rindió más. No lo controlás — solo podés ser mejor.</span></div>
    </div>`:''}
    ${r.duelo?`<div style="background:linear-gradient(160deg,${r.duelo.gane?'rgba(34,197,94,.08)':'rgba(239,68,68,.08)'},rgba(20,22,18,.5));border:1px solid ${r.duelo.gane?'rgba(34,197,94,.35)':'rgba(239,68,68,.35)'};border-radius:14px;padding:12px 14px;margin-bottom:14px;">
      <div style="font-size:10px;font-weight:900;letter-spacing:1.5px;color:${r.duelo.gane?'#22c55e':'#ef4444'};margin-bottom:4px;"><i class='bx bx-target-lock'></i> DUELO CON ${esc(r.duelo.nombre).toUpperCase()}</div>
      <div style="font-size:10.5px;color:#8a8f96;margin-bottom:8px;">Quién rindió más esta temporada (goles + asistencias)</div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="flex:1;text-align:center;"><div style="font-size:10px;color:#8a8f96;font-weight:800;">VOS</div><div style="font-size:17px;font-weight:900;color:#fff;">${r.duelo.mio.g}G ${r.duelo.mio.a}A</div></div>
        <div style="font-size:12px;font-weight:900;color:${r.duelo.gane?'#22c55e':'#ef4444'};flex-shrink:0;">${r.duelo.gane?'GANASTE':'PERDISTE'}</div>
        <div style="flex:1;text-align:center;"><div style="font-size:10px;color:#8a8f96;font-weight:800;">${esc(r.duelo.nombre)} · Nv ${r.duelo.nivel}</div><div style="font-size:17px;font-weight:900;color:#fff;">${r.duelo.suyo.g}G ${r.duelo.suyo.a}A</div></div>
      </div>
      <div style="font-size:10.5px;color:#8a8f96;text-align:center;margin-top:7px;">Historial: <b style="color:#22c55e;">${r.duelo.ganados}</b> a <b style="color:#ef4444;">${r.duelo.perdidos}</b> · Él lleva ${r.duelo.titulos} título${r.duelo.titulos!==1?'s':''}</div>
    </div>`:''}
    <!-- VIDA PRIVADA: la mitad de la historia pasa fuera de la cancha. Se muestra
         acá para que no quede escondida en el escenario de la casa. -->
    ${(G.vidaStats)?(function(){ const s=G.vidaStats, f=G.familia||{};
      const barra=(lbl,val,col,inv)=>{ const v=clamp(Math.round(val||0),0,100); const mal = inv ? v>=60 : v<=25;
        return `<div style="flex:1;min-width:64px;"><div style="display:flex;justify-content:space-between;font-size:8.5px;font-weight:900;color:#6b7360;margin-bottom:3px;"><span>${lbl}</span><span style="color:${mal?'#ef4444':col};">${v}</span></div><div style="height:5px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden;"><div style="height:100%;width:${v}%;background:${mal?'#ef4444':col};"></div></div></div>`; };
      const gente=[];
      if(f.pareja) gente.push(`<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(244,114,182,.12);border:1px solid rgba(244,114,182,.35);color:#f9a8d4;border-radius:20px;padding:3px 9px;font-size:10px;font-weight:800;"><i class='bx bx-heart'></i>${esc(f.pareja)}${f.casado?' · casados':''}</span>`);
      (f.hijos||[]).forEach(h=>gente.push(`<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(167,139,250,.12);border:1px solid rgba(167,139,250,.35);color:#c4b5fd;border-radius:20px;padding:3px 9px;font-size:10px;font-weight:800;"><i class='bx bx-child'></i>${esc(h.nombre)} (${h.edad||0})</span>`));
      (f.nietos||[]).forEach(n=>gente.push(`<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(96,165,250,.12);border:1px solid rgba(96,165,250,.35);color:#93c5fd;border-radius:20px;padding:3px 9px;font-size:10px;font-weight:800;">👶 ${esc(n.nombre)} (${n.edad||0}) · nieto</span>`));
      (f.perdidas||[]).forEach(x=>gente.push(`<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(148,163,184,.10);border:1px solid rgba(148,163,184,.3);color:#94a3b8;border-radius:20px;padding:3px 9px;font-size:10px;font-weight:800;">🕯 ${esc(x)}</span>`));
      return `<div style="background:linear-gradient(160deg,rgba(167,139,250,.07),rgba(20,22,18,.5));border:1px solid rgba(167,139,250,.25);border-radius:14px;padding:12px 14px;margin-bottom:14px;">
        <div style="font-size:10px;font-weight:900;letter-spacing:1.5px;color:#c4b5fd;margin-bottom:9px;"><i class='bx bx-home-heart'></i> TU VIDA FUERA DE LA CANCHA</div>
        <div style="display:flex;gap:10px;margin-bottom:${gente.length?'10px':'0'};">
          ${barra('FELICIDAD', s.felicidad, '#a78bfa')}${barra('FAMILIA', s.familia, '#f472b6')}${barra('SOLEDAD', s.soledad, '#94a3b8', true)}${barra('SALUD', s.salud, '#22c55e')}
        </div>
        ${gente.length?`<div style="display:flex;flex-wrap:wrap;gap:5px;">${gente.join('')}</div>`:''}
      </div>`; })():''}
    ${(!r.prensa && r.eco)?`<div style="background:linear-gradient(175deg,#f4f1e8,#e8e4d8);border-radius:12px;padding:14px 15px;margin-bottom:14px;box-shadow:0 6px 20px rgba(0,0,0,.5);transform:rotate(-.4deg);">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #1a1a1a;padding-bottom:6px;margin-bottom:8px;">
        <div style="font-family:Georgia,serif;font-weight:900;font-size:13px;color:#1a1a1a;">${esc(prensaDe(G.clubPais||G.pais).diarios[0])}</div>
        <div style="font-size:9px;color:#666;font-weight:700;">${G.anio-1}</div>
      </div>
      <div style="display:flex;align-items:center;gap:5px;margin-bottom:5px;">
        <span style="font-size:8.5px;font-weight:900;letter-spacing:1.5px;color:#fff;background:${r.eco.tono==='malo'?'#a8281f':'#2a6b34'};padding:2px 7px;border-radius:3px;">${r.eco.tono==='malo'?'LO QUE VUELVE':'AQUELLO DIO SUS FRUTOS'}</span>
      </div>
      <div style="font-family:Georgia,serif;font-weight:900;font-size:15px;color:#111;line-height:1.25;margin-bottom:5px;">${esc(r.eco.titulo)}</div>
      <div style="font-family:Georgia,serif;font-size:12px;color:#333;line-height:1.55;">${esc(r.eco.texto)}</div>
      <div style="font-size:9.5px;color:#666;font-style:italic;margin-top:6px;">Todo empezó aquella vez que decidió: ${esc(r.eco.origen)}.</div>
    </div>`:''}
    ${r.prensa?(function(){ const p=r.prensa;
      const col = p.tono==='gloria'?'#facc15':p.tono==='bueno'?'#22c55e':p.tono==='malo'?'#ef4444':'#94a3b8';
      return `<div style="background:linear-gradient(175deg,#f4f1e8,#e8e4d8);border-radius:12px;padding:14px 15px;margin-bottom:14px;box-shadow:0 6px 20px rgba(0,0,0,.5);transform:rotate(-.5deg);">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #1a1a1a;padding-bottom:6px;margin-bottom:8px;">
        <div style="font-family:Georgia,serif;font-weight:900;font-size:13px;color:#1a1a1a;letter-spacing:-.3px;">${esc(p.diario)}</div>
        <div style="font-size:9px;color:#666;font-weight:700;">${G.anio-1}</div>
      </div>
      <div style="font-family:Georgia,serif;font-weight:900;font-size:16.5px;color:#111;line-height:1.25;margin-bottom:7px;">${esc(p.titular)}</div>
      <div style="font-family:Georgia,serif;font-size:12px;color:#333;line-height:1.55;">${esc(p.cuerpo)}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:9px;padding-top:7px;border-top:1px solid #c8c4b8;">
        <div style="width:5px;height:5px;border-radius:50%;background:${col};"></div>
        <div style="font-size:10px;color:#555;font-style:italic;">por ${esc(p.firma)}</div>
      </div>
      ${r.eco?`
      <!-- EFECTO MARIPOSA: la consecuencia de una decisión vieja, contada como
           columna del mismo diario. Es asi como se entera la gente. -->
      <div style="margin-top:10px;padding-top:9px;border-top:2px solid #1a1a1a;">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:5px;">
          <span style="font-size:8.5px;font-weight:900;letter-spacing:1.5px;color:#fff;background:${r.eco.tono==='malo'?'#a8281f':'#2a6b34'};padding:2px 7px;border-radius:3px;">${r.eco.tono==='malo'?'LO QUE VUELVE':'AQUELLO DIO SUS FRUTOS'}</span>
          <span style="font-size:9px;color:#777;font-style:italic;">columna</span>
        </div>
        <div style="font-family:Georgia,serif;font-weight:900;font-size:13.5px;color:#111;line-height:1.3;margin-bottom:4px;">${esc(r.eco.titulo)}</div>
        <div style="font-family:Georgia,serif;font-size:11.5px;color:#333;line-height:1.55;">${esc(r.eco.texto)}</div>
        <div style="font-size:9.5px;color:#666;font-style:italic;margin-top:5px;">Todo empezó aquella vez que decidió: ${esc(r.eco.origen)}.</div>
      </div>`:''}
    </div>`; })():''}
    <button onclick="window._verTablas('pos')" style="width:100%;background:rgba(255,255,255,.04);border:1px solid #242a20;border-radius:12px;padding:11px;color:#c4ccc0;font-weight:800;font-size:12.5px;cursor:pointer;margin-bottom:10px;"><i class='bx bx-list-ol' style="color:${A};"></i> Ver tabla de posiciones y goleadores</button>
    <div id="cr-evwrap">${contBtn()}</div>
  </div>`;
  // Las decisiones YA NO se cuelgan debajo del resumen (eso hacía que quedara la
  // temporada anterior arriba y lo nuevo abajo, desfasado). Ahora cada decisión
  // ocupa su propia pantalla, que se abre al tocar Continuar.
  G._evLeft = decisionsForSeason();
}
function decisionsForSeason(){
  const d=(G&&G.dif)||'normal';
  if(d==='intenso') return 4;
  if(d==='leve') return (G.temporada%2===0)?1:0;
  return 1;
}
function contBtn(){ return `<div style="text-align:center;padding:6px 0;"><button onclick="window._carreraContinuar()" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:13px 30px;font-weight:900;cursor:pointer;">Continuar <i class='bx bx-right-arrow-alt'></i></button></div>`; }
// ── CAMBIAR LA INTENSIDAD SIN EMPEZAR DE NUEVO ───────────────────────────────
// Elegis "intenso" al principio, te cansa, y hasta ahora la unica salida era
// arrancar otra partida. Ahora se cambia cuando quieras, desde el hub.
const DIF_INFO = [
  ['intenso','Intenso','4 decisiones por temporada','Mucho para elegir, partidas densas.','#ff5555'],
  ['normal','Normal','1 decisión por temporada','El ritmo equilibrado. Recomendado.','#baff00'],
  ['leve','Leve','1 decisión cada 2 años','Casi todo simulado. Para ver la carrera pasar.','#4fc3f7']
];
window._lyIntensidad = function(){
  if(!G) return;
  const m = document.getElementById('carrera-modal') || overlay();
  const act = G.dif || 'normal';
  m.innerHTML = `
  <div style="max-width:480px;margin:0 auto;padding:32px 18px calc(32px + env(safe-area-inset-bottom));">
    <div style="font-size:10.5px;font-weight:900;letter-spacing:2.4px;color:${A};margin-bottom:9px;">RITMO DE LA PARTIDA</div>
    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:24px;color:#fff;line-height:1.2;margin-bottom:8px;">¿Cuánto querés decidir vos?</div>
    <div style="font-size:13px;color:#9aa48f;line-height:1.6;margin-bottom:20px;">Lo podés cambiar todas las veces que quieras, sin perder la carrera.</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${DIF_INFO.map(d=>{
        const on = d[0] === act;
        return `<button onclick="window._lySetDif('${d[0]}')" style="width:100%;text-align:left;background:${on?d[4]+'18':'rgba(255,255,255,.04)'};border:1.5px solid ${on?d[4]:'#262c22'};border-radius:15px;padding:14px 16px;cursor:pointer;display:flex;align-items:center;gap:12px;">
          <i class='bx ${on?'bxs-check-circle':'bx-circle'}' style="font-size:21px;color:${on?d[4]:'#4a5142'};flex-shrink:0;"></i>
          <div style="min-width:0;flex:1;">
            <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:15px;color:${on?d[4]:'#e6ecdf'};line-height:1.2;">${d[1]}</div>
            <div style="font-size:11px;font-weight:800;color:#8d9782;margin-top:3px;">${d[2]}</div>
            <div style="font-size:11.5px;color:#79836f;margin-top:4px;line-height:1.45;">${d[3]}</div>
          </div>
        </button>`;
      }).join('')}
    </div>
    <button onclick="window._carreraHub()" style="width:100%;margin-top:18px;background:rgba(255,255,255,.05);border:1px solid #2a3222;color:#cfd8c6;border-radius:13px;padding:14px;font-weight:900;font-size:13.5px;cursor:pointer;">Volver</button>
  </div>`;
};
window._lySetDif = function(d){
  if(!G) return;
  G.dif = d;
  // El cupo de la temporada en curso se recalcula ya, no en la siguiente.
  G._evLeft = Math.min(G._evLeft != null ? G._evLeft : 99, decisionsForSeason());
  save();
  window._lyIntensidad();
};
// Marco de pantalla completa para decisiones. Reemplaza TODO el modal, así nunca
// convive lo nuevo con lo viejo.
function pantallaDecision(cuerpo, etiqueta, color){
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="max-width:560px;margin:0 auto;padding:52px 16px calc(28px + env(safe-area-inset-bottom));min-height:100%;display:flex;flex-direction:column;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <div style="font-size:10px;font-weight:900;letter-spacing:2px;color:${color||A};">${esc(etiqueta||'DECISIÓN')}</div>
      <div style="font-size:10px;color:#5f6a58;font-weight:800;">${G?G.edad+' años · '+esc(G.club):''}</div>
    </div>
    <div id="cr-evwrap" style="flex:1;">${cuerpo}</div>
  </div>`;
}
// Tras resolver una decisión: si quedan decisiones, otra. Si no, MERCADO forzado
// (siempre que haya clubes que te quieran o el actual quiera renovar), y luego hub.
window._carreraContinuar = function(){
  // Si acaba de haber una primera convocatoria, elegís número de selección.
  if(G && G._pedirNumSel){ G._pedirNumSel = false; save(); window._elegirNumero('seleccion'); return; }
  if(G && G._evLeft>0){ mostrarEvento(); return; }
  if(G && !G._mercadoHecho){ window._carreraMercadoForzado(); return; }
  G._mercadoHecho = false;
  window._clubMundo();
};
// Mercado de fin de temporada: SIEMPRE aparece con al menos renovación + ofertas
// (si hay), o un botón de "seguir en el club". Ya no queda al azar.
window._carreraMercadoForzado = function(){
  if(!G){ window._carreraHub(); return; }
  G._mercadoHecho = true;
  if(G.edad >= 34){ window._carreraHub(); return; }
  // Si acabás de firmar, NO puede haber mercado: hay que asentarse DOS temporadas
  // antes de que otros clubes vengan a buscarte. Con una sola temporada de espera
  // el jugador terminaba cambiando de club todos los años, que era lo que rompía
  // por completo la sensación de carrera.
  const temporadasEnClub = temporadasEnClubActual();
  if (temporadasEnClub < 2){ window._carreraHub(); return; }
  const mejores = todosClubs().filter(c => {
    if (c.name === G.club) return false;
    if (c.str <= G.clubStr - 4) return false;
    if (ligaNivel(c.liga) < ligaNivel(G.liga) - 1) return false;
    if (G.nivel < c.str - 12) return false;
    if (c.str > 82 && G.edad > 32 && G.nivel < 88) return false;
    if (c.str > 85 && G.edad < 20 && G.nivel < 70) return false;
    return true;
  });
  const picks = []; const seen = {};
  for(const c of shuffle(mejores)){ if(seen[c.name]) continue; seen[c.name]=1; picks.push(c); if(picks.length>=3) break; }
  G._offers = picks.map(ofertaDe);
  // Renovación: SOLO si no rompiste el vínculo. Si pediste salida o rechazaste
  // renovar, el club ya no te ofrece nada — tenés que irte o comerte el banco.
  const _roto = !!(G.flags && (G.flags.pidioSalida || G.flags.rechazoRenov));
  const base = { name:G.club, str:G.clubStr, liga:G.liga, pais:G.clubPais };
  const baseO = ofertaDe(base);
  const _anios = _edadAnios(G.edad);
  G._renov = _roto ? [] : [ Object.assign({}, baseO, { _v:'Renovar', anios: Math.max(1, _anios[0]) }) ];
  save();
  // Muestra ambos: renovación arriba, ofertas abajo.
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="max-width:640px;margin:0 auto;padding:22px 18px calc(30px + env(safe-area-inset-bottom));">
    <div style="text-align:center;margin-bottom:14px;">
      <div style="font-size:11px;font-weight:900;letter-spacing:2px;color:${A};">MERCADO DE PASES</div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:22px;color:#fff;margin-top:4px;">¿Qué hacés esta temporada?</div>
    </div>
    ${_roto?`<div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:13px;padding:12px 14px;margin-bottom:14px;font-size:12.5px;color:#f8b4b4;line-height:1.5;"><b style="color:#f87171;">${G.flags.pidioSalida?'Pediste salir':'Rechazaste renovar'}.</b> ${esc(G.club)} no te va a ofrecer contrato nuevo. Elegí destino o quedate a terminar el vínculo desde el banco.</div>`:''}
    <div id="cr-evwrap"></div>
    <button onclick="window._carreraElegirOferta('quedarme',-1)" style="width:100%;margin-top:14px;background:${_roto?'rgba(239,68,68,.08)':'#161616'};color:${_roto?'#f87171':'#aaa'};border:1px solid ${_roto?'rgba(239,68,68,.3)':'#262626'};border-radius:12px;padding:13px;font-weight:800;font-size:13px;cursor:pointer;"><i class='bx bx-home-heart'></i> ${_roto?'Quedarme igual (voy al banco)':'Seguir un año más en '+esc(G.club)+' sin renovar'}</button>
  </div>`;
  const w = document.getElementById('cr-evwrap');
  let html = '';
  if (G._renov.length) {
    html += `<div style="font-size:11px;font-weight:900;color:#8a8f96;letter-spacing:1px;margin-bottom:8px;">RENOVACIÓN</div>`;
    html += `<div style="display:grid;grid-template-columns:1fr;gap:9px;margin-bottom:14px;">${G._renov.map((o,i)=>ofertaCard(o,i,'renov')).join('')}</div>`;
  }
  if (picks.length) {
    html += `<div style="font-size:11px;font-weight:900;color:#8a8f96;letter-spacing:1px;margin-bottom:8px;">CLUBES QUE TE QUIEREN</div>`;
    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;">${G._offers.map((o,i)=>ofertaCard(o,i,'transfer')).join('')}</div>`;
  } else {
    html += `<div style="font-size:12px;color:#666;text-align:center;padding:10px;font-style:italic;">Ningún club te busca este mercado. Seguí demostrando en la cancha.</div>`;
  }
  w.innerHTML = html;
};
// La pose del avatar en el resumen refleja CÓMO te fue la temporada.
// ── TABLA DE POSICIONES Y TABLAS INDIVIDUALES ────────────────────────────────
// Se genera a partir de la fuerza real de los clubes de la liga, con tu equipo en
// la posición que sacaste. Determinista por temporada (misma tabla si volvés a mirar).
function generarTabla(liga, miClub, miPos, semilla){
  const L = LIGAS.find(x=>x.liga===liga);
  let clubs = L ? L.clubs.map(c=>({name:c[0], str:c[1]})) : [];
  if (!clubs.length) clubs = [{name:miClub, str:G.clubStr||60}];
  if (!clubs.some(c=>c.name===miClub)) clubs.push({ name:miClub, str:G.clubStr||60 });
  let rnd = (semilla*9301 + 49297) % 233280;
  const rr = ()=>{ rnd = (rnd*9301 + 49297) % 233280; return rnd/233280; };
  // Puntos coherentes con la fuerza + ruido estable
  const filas = clubs.map(c=>{
    const pj = 34;
    const fuerza = (c.str - 45) / 45;
    const gan = clamp(Math.round(pj*(0.18 + fuerza*0.45) + (rr()-0.5)*7), 2, pj-4);
    const emp = clamp(Math.round(pj*0.24 + (rr()-0.5)*5), 2, pj-gan);
    const per = pj - gan - emp;
    const gf = Math.round(gan*2.0 + emp*0.9 + per*0.5 + (rr()-0.5)*8);
    const gc = Math.round(per*2.0 + emp*0.9 + gan*0.5 + (rr()-0.5)*8);
    return { name:c.name, pj, gan, emp, per, gf, gc, dif:gf-gc, pts:gan*3+emp };
  });
  filas.sort((a,b)=> b.pts-a.pts || b.dif-a.dif || b.gf-a.gf);
  // Forzamos que TU club quede en la posición que sacaste realmente.
  const iMio = filas.findIndex(f=>f.name===miClub);
  const destino = clamp((miPos||1)-1, 0, filas.length-1);
  if (iMio >= 0 && iMio !== destino){
    const [mio] = filas.splice(iMio,1);
    filas.splice(destino,0,mio);
    // Reordenamos los puntos para que la tabla se lea coherente de arriba a abajo.
    const pts = filas.map(f=>f.pts).sort((a,b)=>b-a);
    filas.forEach((f,i)=>{ f.pts = pts[i]; });
  }
  return filas;
}
// Goleadores y asistidores de la liga, con vos incluido en tu lugar real.
function generarIndividuales(liga, semilla, misG, misA){
  const L = LIGAS.find(x=>x.liga===liga);
  const clubs = L ? L.clubs : [[G.club, G.clubStr||60]];
  let rnd = (semilla*4177 + 7919) % 233280;
  const rr = ()=>{ rnd = (rnd*4177 + 7919) % 233280; return rnd/233280; };
  const mk = (max)=>{
    const out = [];
    for (let i=0;i<9;i++){
      const c = clubs[Math.floor(rr()*clubs.length)];
      // El apellido acompaña al país de la liga donde estás jugando.
      const _p = (L && L.pais) || (G && G.clubPais) || 'Uruguay';
      out.push({ nombre: apellidoDe(_p), club: c[0], n: Math.max(1, Math.round(max*(0.95 - i*0.07) - rr()*3)) });
    }
    return out;
  };
  const gol = mk(Math.max(18, (misG||0)+6));
  const asi = mk(Math.max(12, (misA||0)+5));
  gol.push({ nombre:(G.apellido||'VOS'), club:G.club, n:misG||0, yo:true });
  asi.push({ nombre:(G.apellido||'VOS'), club:G.club, n:misA||0, yo:true });
  gol.sort((a,b)=>b.n-a.n); asi.sort((a,b)=>b.n-a.n);
  return { gol:gol.slice(0,10), asi:asi.slice(0,10) };
}
// Pantalla de tablas de la temporada (posiciones / goleadores / asistencias).
window._verTablas = function(tab){
  if(!G) G=load(); if(!G) return;
  const t = G._tablasData; if(!t){ window._carreraHub(); return; }
  tab = tab || 'pos';
  const m = document.getElementById('carrera-modal') || overlay();
  const tabBtn = (id,txt,ic)=>`<button onclick="window._verTablas('${id}')" style="flex:1;background:${tab===id?'rgba(186,255,0,.14)':'rgba(255,255,255,.03)'};border:1.5px solid ${tab===id?A:'#242a20'};border-radius:10px;padding:9px 4px;cursor:pointer;color:${tab===id?A:'#8a9280'};font-weight:900;font-size:11.5px;"><i class='bx ${ic}'></i> ${txt}</button>`;
  let cuerpo = '';
  if (tab === 'pos'){
    cuerpo = `<div style="background:#0d100d;border:1px solid #1c211a;border-radius:13px;overflow:hidden;">
      <div style="display:flex;font-size:9px;font-weight:900;color:#5f6a58;padding:8px 10px;border-bottom:1px solid #1c211a;">
        <span style="width:20px;">#</span><span style="flex:1;">CLUB</span>
        <span style="width:24px;text-align:center;">PJ</span><span style="width:22px;text-align:center;">G</span>
        <span style="width:22px;text-align:center;">E</span><span style="width:22px;text-align:center;">P</span>
        <span style="width:30px;text-align:center;">DIF</span><span style="width:28px;text-align:center;">PTS</span>
      </div>
      ${t.tabla.map((f,i)=>{
        const mio = f.name===t.club;
        const zona = i===0 ? '#facc15' : i<=3 ? '#22c55e' : i>=t.tabla.length-2 ? '#ef4444' : 'transparent';
        return `<div style="display:flex;align-items:center;font-size:11.5px;padding:7px 10px;border-bottom:1px solid #141814;background:${mio?'rgba(186,255,0,.09)':'transparent'};color:${mio?'#fff':'#c4ccc0'};font-weight:${mio?'900':'600'};">
          <span style="width:20px;display:flex;align-items:center;gap:3px;"><span style="width:2px;height:12px;background:${zona};border-radius:1px;"></span>${i+1}</span>
          <span style="flex:1;display:flex;align-items:center;gap:6px;min-width:0;">${clubBadge(f.name,15)}<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(f.name)}</span></span>
          <span style="width:24px;text-align:center;">${f.pj}</span><span style="width:22px;text-align:center;">${f.gan}</span>
          <span style="width:22px;text-align:center;">${f.emp}</span><span style="width:22px;text-align:center;">${f.per}</span>
          <span style="width:30px;text-align:center;color:${f.dif>0?'#4ade80':f.dif<0?'#ff6b6b':'#888'};">${f.dif>0?'+':''}${f.dif}</span>
          <span style="width:28px;text-align:center;font-weight:900;color:${mio?A:'#fff'};">${f.pts}</span>
        </div>`; }).join('')}
    </div>`;
  } else {
    const lista = tab === 'gol' ? t.gol : t.asi;
    const et = tab === 'gol' ? 'GOLES' : 'ASIST';
    cuerpo = `<div style="background:#0d100d;border:1px solid #1c211a;border-radius:13px;overflow:hidden;">
      <div style="display:flex;font-size:9px;font-weight:900;color:#5f6a58;padding:8px 10px;border-bottom:1px solid #1c211a;">
        <span style="width:20px;">#</span><span style="flex:1;">JUGADOR</span><span style="width:40px;text-align:center;">${et}</span>
      </div>
      ${lista.map((f,i)=>`<div style="display:flex;align-items:center;font-size:11.5px;padding:8px 10px;border-bottom:1px solid #141814;background:${f.yo?'rgba(186,255,0,.09)':'transparent'};color:${f.yo?'#fff':'#c4ccc0'};font-weight:${f.yo?'900':'600'};">
        <span style="width:20px;color:${i===0?'#facc15':'#5f6a58'};font-weight:900;">${i+1}</span>
        <span style="flex:1;display:flex;align-items:center;gap:6px;min-width:0;">${clubBadge(f.club,15)}<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(f.nombre)}${f.yo?' <span style="color:'+A+';font-size:9px;">(VOS)</span>':''}</span></span>
        <span style="width:40px;text-align:center;font-weight:900;color:${f.yo?A:'#fff'};">${f.n}</span>
      </div>`).join('')}
    </div>`;
  }
  m.innerHTML = `
  <div style="max-width:560px;margin:0 auto;padding:18px 16px calc(28px + env(safe-area-inset-bottom));">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
      <button onclick="window._carreraContinuar()" style="background:rgba(255,255,255,.06);border:none;color:#aaa;width:32px;height:32px;border-radius:50%;font-size:17px;cursor:pointer;"><i class='bx bx-arrow-back'></i></button>
      <div><div style="font-family:Outfit,sans-serif;font-weight:900;font-size:17px;color:#fff;">${esc(t.liga)}</div>
      <div style="font-size:10.5px;color:#5f6a58;">Temporada ${t.anio}</div></div>
    </div>
    <div style="display:flex;gap:6px;margin:12px 0;">
      ${tabBtn('pos','Posiciones','bx-list-ol')}${tabBtn('gol','Goleadores','bx-football')}${tabBtn('asi','Asistencias','bx-target-lock')}
    </div>
    ${cuerpo}
  </div>`;
};
function _poseTemporada(r){
  if (!r) return 'idle';
  if (r.titulo) return 'campeon';                       // levanta la copa
  if (G.flags && G.flags.marcado) return 'pensativo';   // temporada de banco
  if (r.premios && r.premios.length) return 'orgullo';
  if (r.move && r.move.tipo === 'asc') return 'festejo';
  if (r.move && r.move.tipo === 'desc') return 'bajon';
  if (r.pos === 1) return 'festejo';
  if (r.totalEq && r.pos >= r.totalEq - 1) return 'bajon';
  if (r.pj != null && r.pj < 14) return 'agotado';
  if (r.g != null && r.pj && (r.g + (r.a||0)) / r.pj > 0.55) return 'orgullo';
  return 'idle';
}
function posLabel(pos){ return pos===1?'1º 🏆':(pos+'º'); }
function posLabelLargo(p){
  return {POR:'arquero',LI:'lateral izquierdo',DFC:'defensor central',LD:'lateral derecho',MCD:'volante central',
    MI:'volante por izquierda',MC:'mediocampista',MD:'volante por derecha',MCO:'enganche',
    EI:'extremo izquierdo',DC:'delantero',ED:'extremo derecho'}[p] || 'jugador';
}

// ── PRENSA LOCAL ──────────────────────────────────────────────────────────────
// Cada país tiene sus diarios y sus periodistas. Opinan de TU temporada según cómo
// rendiste, qué ganó el equipo y en qué estado está tu vínculo con el club.
const PRENSA = {
  'Uruguay':        { diarios:['Ovación','El País Deportes','Referí','Tenfield Digital'], firmas:['Rodrigo Píriz','Martín Charquero','Alberto Kesman','Diego Muñoz'] },
  'Argentina':      { diarios:['Olé','TyC Sports','La Nación Deportes','Doble Amarilla'], firmas:['Juan Pablo Varsky','Liliana Caruso','Gastón Edul','Marcelo Benedetto'] },
  'Brasil':         { diarios:['Globo Esporte','Lance!','ESPN Brasil','UOL Esporte'], firmas:['Ana Thaís Matos','Tiago Leifert','Renata Fan','Mauro Cezar'] },
  'España':         { diarios:['MARCA','AS','Mundo Deportivo','Sport'], firmas:['Manolo Lama','Paco González','Ángels Barceló','Guillem Balagué'] },
  'Inglaterra':     { diarios:['The Guardian','Sky Sports','The Athletic','BBC Sport'], firmas:['Gary Lineker','Jamie Carragher','Alison Bender','Henry Winter'] },
  'Italia':         { diarios:['La Gazzetta dello Sport','Corriere dello Sport','Tuttosport','Sky Sport Italia'], firmas:['Fabrizio Romano','Paola Ferrari','Massimo Ambrosini','Giorgia Rossi'] },
  'Francia':        { diarios:['L\'Équipe','RMC Sport','Le Parisien Sports','Canal+ Foot'], firmas:['Daniel Riolo','Carine Galli','Pierre Ménès','Julien Laurens'] },
  'Alemania':       { diarios:['Kicker','BILD Sport','Sky Sport DE','SPORT1'], firmas:['Christoph Kramer','Laura Wontorra','Jan Åge Fjørtoft','Esther Sedlaczek'] },
  'Portugal':       { diarios:['A Bola','Record','O Jogo','Sport TV'], firmas:['Pedro Sousa','Cátia Fonseca','Nuno Matos','Rui Santos'] },
  'México':         { diarios:['Récord','ESTO','TUDN','Mediotiempo'], firmas:['David Faitelson','Marion Reimers','Christian Martinoli','Luis García'] },
  'Estados Unidos': { diarios:['ESPN FC','The Athletic US','Sports Illustrated','CBS Sports Golazo'], firmas:['Taylor Twellman','Kate Abdo','Alexi Lalas','Sebastian Salazar'] },
  'Colombia':       { diarios:['Win Sports','El Tiempo Deportes','Gol Caracol','AS Colombia'], firmas:['Carolina Bermúdez','Javier Hernández Bonnet','Andrés Marocco','Ricardo Orrego'] },
  'Chile':          { diarios:['El Mercurio Deportes','La Tercera Deportes','TNT Sports CL','ADN Deportes'], firmas:['Grace Lazcano','Rodrigo Herrera','Manuel de Tezanos','Danilo Díaz'] }
};
function prensaDe(pais){
  return PRENSA[pais] || { diarios:['Diario Deportivo','Radio Gol','Canal Deportes'], firmas:['un periodista local','el cronista del club','la prensa deportiva'] };
}
// Genera la nota del año. Combina rendimiento propio + resultado del equipo + estado
// del vínculo. Nunca repite el mismo titular dos años seguidos.
// Elige de un pool SIN repetir hasta agotarlo. Con `pick` puro, un titular podía
// salir tres temporadas seguidas y la sección de prensa se sentía copiada y pegada.
function sinRepetir(pool, clave){
  if(!pool || !pool.length) return '';
  if(!G._prensaHist) G._prensaHist = {};
  let usados = G._prensaHist[clave] || [];
  if (usados.length >= pool.length) usados = [];
  let libres = pool.map((_,i)=>i).filter(i => usados.indexOf(i) < 0);
  if(!libres.length) libres = pool.map((_,i)=>i);
  const idx = libres[Math.floor(Math.random()*libres.length)];
  usados.push(idx);
  G._prensaHist[clave] = usados;
  return pool[idx];
}
function notaPrensa(ctx){
  const { pj, g, a, pos, totalEq, titulo, rend } = ctx;
  const P = prensaDe(G.clubPais || G.pais);
  // No repetir diario/firma respecto de la temporada anterior.
  if(!G._prensaUsada) G._prensaUsada = {};
  const distinto = (arr, ult) => { const l = arr.filter(x=>x!==ult); return l.length ? pick(l) : pick(arr); };
  const diario = distinto(P.diarios, G._prensaUsada.diario);
  const firma  = distinto(P.firmas,  G._prensaUsada.firma);
  G._prensaUsada = { diario, firma };
  // Elección de titular/cuerpo SIN repetir. Se llama `variar` y no `pick` a
  // propósito: declarar un `pick` local acá tapaba al global en toda la función
  // (zona muerta temporal) y reventaba la línea de arriba que sí usa el global.
  const variar = (arr) => sinRepetir(arr, (titulo?'t':rend>0.55?'b':pos<=3?'p':'n') + ':' + arr.length + ':' + String(arr[0]).slice(0,12));
  const F = G.flags || {};
  const gaTot = g + a;
  let tono, titular, cuerpo;
  // El vínculo roto manda sobre todo lo demás: es LA noticia.
  if (F.marcado) {
    tono = 'malo';
    titular = variar([
      `"${G.apellido} ya no es del ${G.club}"`,
      `El ocaso de ${G.apellido} en ${G.club}`,
      `${G.apellido}, de titular indiscutido al banco`
    ]);
    cuerpo = variar([
      `Apenas ${pj} partidos en toda la temporada. Desde que pidió irse, el técnico dejó de contarlo y el vestuario se partió. En el club nadie lo dice en voz alta, pero todos saben que en junio se va.`,
      `Lo que empezó como una negociación terminó en divorcio. ${pj} partidos, la mayoría entrando desde el banco, y una hinchada que ya lo silba en el calentamiento. Una historia que se pudo escribir distinto.`
    ]);
  } else if (titulo) {
    tono = 'gloria';
    titular = variar([
      `¡${G.club} campeón! Y ${G.apellido} fue protagonista`,
      `${G.apellido} levantó la copa que ${G.club} esperaba`,
      `La temporada perfecta de ${G.apellido}`,
      `${G.apellido}, el nombre de esta vuelta olímpica`,
      `El año en que ${G.club} volvió a gritar campeón`,
      `${G.apellido} entró en la historia grande de ${G.club}`,
      `El ${titulo} se quedó en casa`
    ]);
    cuerpo = variar([
      `${g} goles y ${a} asistencias en ${pj} partidos. El ${titulo} tiene su firma. ${gaTot>=25?'Números de los que se recuerdan una década.':'Cuando el equipo lo necesitó, apareció.'}`,
      `Terminó con ${g} goles y ${a} asistencias. En el vestuario dicen que fue el que más empujó cuando la cosa se puso fea.`,
      `${pj} partidos, ${gaTot} participaciones en gol y un ${titulo} que ya está en la vitrina. Poco más se le puede pedir.`,
      `La estadística dice ${g} goles. El hincha dice bastante más que eso.`
    ]);
  } else if (rend > 0.55) {
    tono = 'bueno';
    titular = variar([
      `${G.apellido}, lo mejor de un ${G.club} irregular`,
      `Si no fuera por ${G.apellido}...`,
      `${G.apellido} juega en otra categoría`
    ]);
    cuerpo = `${g} goles y ${a} asistencias, y el equipo apenas ${pos}º de ${totalEq}. ${variar([`Los números individuales gritan lo que el equipo calla.`,`Habrá que ver cuánto lo aguanta un club que no está a su altura.`,`Los grandes de Europa ya preguntaron por él.`])}`;
  } else if (pos <= 3) {
    tono = 'bueno';
    titular = `${G.club} terminó ${pos}º y ${G.apellido} cumplió`;
    cuerpo = `${pj} partidos, ${g} goles, ${a} asistencias. Sin fuegos artificiales, pero siempre estuvo. ${variar(['El técnico lo pone todas las fechas por algo.','De esos que no salen en las fotos pero se notan cuando faltan.'])}`;
  } else if (rend < 0.15 && pj > 12) {
    tono = 'malo';
    titular = variar([
      `¿Qué le pasa a ${G.apellido}?`,
      `${G.apellido}, una temporada para olvidar`,
      `La sequía de ${G.apellido} preocupa en ${G.club}`
    ]);
    cuerpo = `${pj} partidos y apenas ${g} gol${g===1?'':'es'}. ${variar(['La hinchada empieza a impacientarse.','En el club dicen que es cuestión de tiempo. La tribuna no piensa lo mismo.','Necesita un gol urgente para sacarse la mochila.'])}`;
  } else {
    tono = 'neutro';
    titular = variar([
      `${G.apellido} cerró un año correcto en ${G.club}`,
      `Balance tibio para ${G.apellido}`,
      `${G.club} terminó ${pos}º: ni gloria ni tragedia`
    ]);
    cuerpo = `${pj} partidos, ${g} goles y ${a} asistencias. ${variar(['Cumplió sin brillar.','Un año de transición que ojalá sea sólo eso.','El equipo quedó a mitad de tabla y él acompañó.'])}`;
  }
  return { diario, firma, titular, cuerpo, tono };
}
function st(l,v){ return `<div style="background:rgba(255,255,255,.04);border:1px solid #1e1e1e;border-radius:12px;padding:11px 4px;text-align:center;"><div style="font-size:9px;color:#666;font-weight:800;">${l}</div><div style="font-size:19px;font-weight:900;color:${A};">${esc(v)}</div></div>`; }

// ── LÓGICA REALISTA DE OFERTAS ─────────────────────────────────────────────────
// Barcelona no ofrece lo mismo que Peñarol. Y por un jugador de 20 no ofrecen lo
// mismo que por uno de 34. Factores:
//   • edadMult: pico económico 24-28. Menor 22 tiene proyección pero menos sueldo
//     inmediato; mayor 30 baja fuerte y contratos cortos.
//   • clubMult: prestigio del club × liga tier. Un club top-5 europeo paga 6-8x
//     más que un club de Interior. Todo escalado a la moneda del juego.
//   • nivelMult: si sos figura (nivel muy alto) todos pagan más; si estás en tu
//     media, ofertas estándar.
function _edadMult(edad){
  if (edad <= 19) return 0.55;       // proyecto: sueldo bajo, contrato largo
  if (edad <= 22) return 0.85;
  if (edad <= 27) return 1.30;       // pico
  if (edad <= 30) return 1.10;
  if (edad <= 33) return 0.75;
  if (edad <= 35) return 0.50;
  return 0.30;                        // veterano: contratos cortos y magros
}
function _edadAnios(edad){
  if (edad <= 20) return [4, 6];      // ligan al proyecto
  if (edad <= 27) return [3, 5];
  if (edad <= 32) return [2, 4];
  if (edad <= 35) return [1, 3];
  return [1, 2];
}
function _clubMult(c){
  // Escalón por tier de liga (LaLiga/Premier/Brasileirão top; Interior UY piso).
  const tier = ligaNivel(c.liga);     // 0 = interior UY, 13 = Brasileirão
  const ligaBoost = 1 + tier * 0.32;  // hasta ~5.2× por top-league
  // Fuerza intrínseca del club (Real Madrid 90 vs Salto FC 52).
  const strBoost = Math.max(0.3, (c.str - 45) / 30); // rango ~0.3 a 1.8
  return ligaBoost * strBoost;
}
function _nivelMult(nivelJugador){
  // Sobre 78 empieza a pagarse extra; ídolo (>90) multiplica por 1.6.
  if (nivelJugador >= 90) return 1.7;
  if (nivelJugador >= 84) return 1.35;
  if (nivelJugador >= 78) return 1.15;
  return 1.0;
}
function ofertaDe(c){
  const edadM = _edadMult(G ? G.edad : 22);
  const clubM = _clubMult(c);
  const nivM  = _nivelMult(G ? G.nivel : 60);
  // Sueldo base: club grande × edad pico × jugador figura → 6M+/año
  // Club chico × veterano → 40k-80k/año (realista)
  const baseSueldo = 25000; // €/año min para un club de nivel 50
  const sueldo = Math.round(baseSueldo * clubM * edadM * nivM * rnd(0.85, 1.20) / 500) * 500;
  const [aMin, aMax] = _edadAnios(G ? G.edad : 22);
  const anios = ri(aMin, aMax);
  // Prima: los clubes GRANDES pagan prima gorda (compra). Los chicos, casi nada.
  const prima = clubM >= 3 ? Math.round(sueldo * rnd(0.6, 1.2) / 1000) * 1000
              : clubM >= 1.5 ? Math.round(sueldo * rnd(0.2, 0.6) / 1000) * 1000
              : 0;
  return { name:c.name, str:c.str, liga:c.liga, pais:c.pais, sueldo, anios, prima };
}
// ── CALENDARIO REAL DE SELECCIONES ─────────────────────────────────────────────
// Basado en el ciclo FIFA/CONMEBOL/UEFA. Arranca 2026 y responde a la edad real.
// Un jugador de 20 años en 2028 puede ir al Mundial Sub-20 Y a los JJOO (Sub-23).
// Un jugador de 24 años en 2030 puede ir al Mundial mayor.
function calendarioSelec(anio, edad){
  const out = [];
  // Mundial FIFA mayor: 2030, 2034, 2038...
  if ((anio - 2030) % 4 === 0 && anio >= 2030 && edad >= 20 && edad <= 36)
    out.push({ tipo:'Mundial', slug:'mundial', pais:true, subN:0 });
  // Copa América: 2028, 2032, 2036...  (post 2024, ciclo cada 4)
  if ((anio - 2028) % 4 === 0 && anio >= 2028 && edad >= 19 && edad <= 36)
    out.push({ tipo:'Copa América', slug:'copa-america', continente:'AMER', subN:0 });
  // Eurocopa: 2028, 2032, 2036...
  if ((anio - 2028) % 4 === 0 && anio >= 2028 && edad >= 19 && edad <= 36)
    out.push({ tipo:'Eurocopa', slug:'eurocopa', continente:'EUR', subN:0 });
  // JJOO fútbol (Sub-23 con 3 mayores permitidos): 2028, 2032, 2036...
  if ((anio - 2028) % 4 === 0 && anio >= 2028 && edad >= 18 && edad <= 26)
    out.push({ tipo:'Juegos Olímpicos', slug:'oro-olimpico', subN:23 });
  // Mundial Sub-20: años pares (2027 sería impar → salta a 2028)
  if ((anio - 2026) % 2 === 0 && anio >= 2026 && edad >= 18 && edad <= 20)
    out.push({ tipo:'Mundial Sub-20', slug:'mundial', subN:20 });
  // Mundial Sub-17: años impares (2027, 2029...)
  if ((anio - 2027) % 2 === 0 && anio >= 2027 && edad >= 15 && edad <= 17)
    out.push({ tipo:'Mundial Sub-17', slug:'mundial', subN:17 });
  // Sudamericano Sub-15: anual (Uruguay/CONMEBOL)
  if (edad === 14 || edad === 15)
    out.push({ tipo:'Sudamericano Sub-15', slug:'copa-america', subN:15 });
  return out;
}
// ¿Un club europeo cabe para "Eurocopa"? Chapuza rápida por país del club/jugador.
function _paisContinente(pais){
  const E = ['España','Inglaterra','Francia','Alemania','Italia','Portugal','Países Bajos','Bélgica','Croacia','Turquía','Suiza','Austria','Escocia','Grecia','Polonia','Ucrania','Rusia','Suecia','Noruega','Dinamarca','Irlanda','Serbia','Rumania','Hungría'];
  return E.indexOf(pais) !== -1 ? 'EUR' : 'AMER';
}
// Temporadas completas jugadas en el club actual. `clubDesde` guarda la edad a la
// que llegaste; si un guardado viejo no lo tiene, se asume que recién llegaste.
// ── CLÁSICOS ─────────────────────────────────────────────────────────────────
// Irse al rival de toda la vida no es lo mismo que irse a cualquier lado. Se listan
// los pares reales; para el resto se toma como rival a cualquier club del mismo
// país con fuerza parecida (los dos que se pelean la misma liga).
const CLASICOS = [
  ['Nacional','Peñarol'], ['Boca Juniors','River Plate'], ['Real Madrid','Barcelona'],
  ['Atlético Madrid','Real Madrid'], ['Manchester United','Manchester City'],
  ['Liverpool','Everton'], ['Arsenal','Tottenham'], ['Inter','Milan'],
  ['Roma','Lazio'], ['Juventus','Torino'], ['Flamengo','Fluminense'],
  ['Corinthians','Palmeiras'], ['São Paulo','Santos'], ['Grêmio','Internacional'],
  ['Racing','Independiente'], ['San Lorenzo','Huracán'], ['Colo-Colo','Universidad de Chile'],
  ['Millonarios','Santa Fe'], ['América','Chivas'], ['Benfica','Porto'],
  ['Sporting CP','Benfica'], ['Borussia Dortmund','Schalke 04'], ['Bayern Múnich','Borussia Dortmund'],
  ['Ajax','Feyenoord'], ['PSV','Ajax'], ['Galatasaray','Fenerbahçe'], ['Celtic','Rangers'],
  ['Olympique de Marsella','PSG'], ['Olympique de Lyon','Saint-Étienne'],
  ['Defensor Sporting','Danubio'], ['Boca Juniors','Racing']
];
function esRivalDirecto(clubA, clubB, paisA, paisB){
  if (!clubA || !clubB || clubA === clubB) return false;
  const hit = CLASICOS.some(p => (p[0]===clubA && p[1]===clubB) || (p[1]===clubA && p[0]===clubB));
  if (hit) return true;
  // Sin par declarado: se considera rival si son del mismo país, ambos grandes y
  // de la misma liga (se disputan el mismo campeonato todos los años).
  if (paisA && paisB && paisA === paisB){
    const a = todosClubs().find(c=>c.name===clubA), b = todosClubs().find(c=>c.name===clubB);
    if (a && b && a.liga === b.liga && a.str >= 72 && b.str >= 72) return true;
  }
  return false;
}
function temporadasEnClubActual(){
  if(!G) return 0;
  return Math.max(0, G.edad - (G.clubDesde != null ? G.clubDesde : G.edad));
}
function eventoSeleccionRandom(){
  if(!G) return null;
  const cand = calendarioSelec(G.anio || 2026, G.edad);
  const cont = _paisContinente(G.pais);
  const filt = cand.filter(c => !c.continente || c.continente === cont);
  if (!filt.length) return null;
  // Umbral de nivel: cuanto más chica la categoría, más fácil entrar; el Mundial mayor pide mucho.
  const req = t => {
    if (t.tipo === 'Mundial') return 82;
    if (t.tipo === 'Copa América' || t.tipo === 'Eurocopa') return 78;
    if (t.tipo === 'Juegos Olímpicos') return 74;
    if (t.tipo === 'Mundial Sub-20') return 68;
    if (t.tipo === 'Mundial Sub-17') return 62;
    return 55;
  };
  const elegibles = filt.filter(t => G.nivel >= req(t));
  if (!elegibles.length) return null;
  const t = pick(elegibles);
  const cat = t.subN ? ('Sub-'+t.subN) : 'Mayor';
  const desc = `¡Te convocan a la <b>selección ${cat}</b> de <b>${esc(G.pais)}</b> para el <b>${t.tipo} ${G.anio || 2026}</b>! Aceptar te agota, pero es tu chance de vitrina mundial.`;
  return {
    t: 'Selección: ' + t.tipo, img:'seleccion', d: desc,
    opts: [
      { txt: `${flagImg(G.pais,18)}&nbsp;Ir con todo — jugar el ${t.tipo}`, ef: g => {
        // Primera convocatoria: elegís el número de la selección.
        if (!g.numSeleccion) g._pedirNumSel = true;
        g.flags = g.flags || {}; g.flags.debutSel = true; g.selPj = (g.selPj||0) + 1;
        const bien = Math.random() < 0.55 + (g.nivel - req(t))/100; // más chance si estás por arriba del corte
        if (bien) {
          g.fama += 14; g.nivel += 1;
          g.valor = Math.round((g.valor||100000) * 1.20);
          // Si le va MUY bien, gana el torneo
          const gana = Math.random() < 0.30;
          if (gana) {
            g.titulos = (g.titulos||0) + 1;
            if(!g.vitrina) g.vitrina=[];
            g.vitrina.push({ nombre: t.tipo, edad:g.edad, club:'Selección '+g.pais, img: t.slug });
            g.fama += 8;
            return `¡GLORIA! ${g.pais} salió CAMPEÓN del ${t.tipo}. Tu nombre queda en la historia.`;
          }
          return `Torneo brillante con ${g.pais}. Todos hablan de vos, tu valor de mercado subió.`;
        } else {
          g.nivel -= 1; g.moral -= 4;
          return `${t.tipo} decepcionante. Te tocó jugar poco y el equipo no anduvo.`;
        }
      } },
      { txt: `Priorizar el club — decir no`, ef: g => {
        g.moral -= 3; g.nivel += 1;
        return `Rechazaste la convocatoria. El hincha del país te lo cuestiona, pero llegás fresco a la temporada de club.`;
      } }
    ]
  };
}
// Eventos de decisión (reusa impronta anterior + transferencias reales con VARIAS ofertas).
function mostrarEvento(){
  if(G) G._evLeft = Math.max(0, (G._evLeft||1) - 1);   // consume una decisión de la temporada
  // PRIORIDAD ALTA: convocatoria a la selección — pantalla propia y con protagonismo.
  if (Math.random() < 0.35) {
    const evSel = eventoSeleccionRandom();
    if (evSel) {
      G._ev = evSel;
      const kSel = kitDe(G.pais);
      pantallaDecision(`
        <div style="text-align:center;margin-bottom:14px;">
          <div style="display:flex;justify-content:center;margin-bottom:10px;">
            ${avatarBox(avatarDeG(3.2,'orgullo',{seleccion:true}), '12px 18px', 'estadio')}
          </div>
          <div style="display:inline-flex;align-items:center;gap:7px;background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.4);border-radius:20px;padding:5px 13px;">
            ${flagImg(G.pais,20)}<span style="font-size:12.5px;font-weight:900;color:#93c5fd;">SELECCIÓN DE ${esc(G.pais).toUpperCase()}</span>
          </div>
        </div>
        <div style="background:linear-gradient(160deg,rgba(59,130,246,.10),rgba(20,22,18,.5));border:1.5px solid rgba(59,130,246,.35);border-radius:16px;padding:16px;">
          <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:19px;color:#fff;margin-bottom:7px;line-height:1.2;">${esc(evSel.t)}</div>
          <div style="font-size:13.5px;color:#c4ccc0;line-height:1.55;margin-bottom:14px;">${evSel.d}</div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${evSel.opts.map((o,i)=>`<button onclick="window._carreraElegir(${i})" style="${btn(i===0)}">${o.txt}</button>`).join('')}
          </div>
        </div>`, 'CONVOCATORIA', '#93c5fd');
      return;
    }
  }
  // A veces: ofertas de transferencia (hasta 4 clubes distintos para ELEGIR).
  // FILTRO REALISTA: los clubes grandes (str>82) NO miran a jugadores viejos ni de bajo
  // nivel. Los clubes chicos SÍ pueden querer a un veterano figura.
  const mejores = todosClubs().filter(c => {
    if (c.name === G.club) return false;
    if (c.str <= G.clubStr + 2) return false;                    // solo si mejora
    if (ligaNivel(c.liga) < ligaNivel(G.liga)) return false;      // no bajar de liga
    if (G.nivel < c.str - 9) return false;                        // no te alcanza el nivel
    // Un club grande (str>82) NO ficha veteranos (edad>32) salvo que seas top mundial.
    if (c.str > 82 && G.edad > 32 && G.nivel < 88) return false;
    // Un club grande NO ficha proyectos flojos (edad<20 y nivel<70).
    if (c.str > 85 && G.edad < 20 && G.nivel < 70) return false;
    return true;
  });
  // Mercado de pases: si hay clubes que te quieren, aparece seguido — PERO nunca
  // antes de dos temporadas en el club actual. Recién fichado, nadie te viene a
  // buscar; a partir de la tercera temporada la presión sube año a año.
  const _tempClub = temporadasEnClubActual();
  const _chanceTransfer = _tempClub < 2 ? 0 : _tempClub === 2 ? 0.45 : 0.8;
  const ofertaTransfer = mejores.length && Math.random() < _chanceTransfer && G.edad<34;
  if(ofertaTransfer){
    // Barajar y tomar hasta 4 clubes únicos.
    const shuffled = shuffle(mejores);
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
    // 3 variantes de renovación calibradas por edad/nivel/club.
    const baseO = ofertaDe(base);
    const _anios = _edadAnios(G.edad);
    G._renov = [
      Object.assign({}, baseO, { _v:'Oferta base', anios: Math.max(1, _anios[0]) }),
      Object.assign({}, baseO, { _v:'Pedir aumento', sueldo: Math.round(baseO.sueldo * 1.55 / 500)*500, prima: Math.round(baseO.sueldo * 0.35 / 1000)*1000, _riesgo:true }),
      Object.assign({}, baseO, { _v:'Contrato largo', sueldo: Math.round(baseO.sueldo * 1.15 / 500)*500, anios: _anios[1] })
    ];
    save(); mostrarOfertas('renov');
    return;
  }
  // Si no hay transferencia, evento de decisión clásico.
  let ev=eventoRandom();
  // Eventos DINÁMICOS (opciones generadas al momento — ej: nacionalidad del abuelo).
  // EL IDOLO: se sabe quién es (el que elegiste de chico), se lo ve y te aconseja.
  if (ev && ev._dyn && ev.t.indexOf('ídolo')>=0){
    const porEstilo = { crack:['Riquelme','Zidane','Iniesta'], killer:['Suárez','Ronaldo','Batistuta'],
      guerrero:['Vidal','Gattuso','Simeone'] }[G.estilo] || ['Recoba','Francescoli','Forlán'];
    const nombre = pick(porEstilo);
    G._idoloNombre = nombre;
    const consejos = [
      { txt:'"No te creas nada de lo que digan de vos, ni lo bueno ni lo malo."', ef:g=>{ g.moral+=10; g.flags=g.flags||{}; g.flags.consejoIdolo=true; return nombre+' te miró a los ojos y te lo dijo despacio. Te lo vas a repetir toda la carrera.'; } },
      { txt:'"Cuidá el cuerpo. Yo me retiré tres años antes por no hacerlo."', ef:g=>{ g.nivel=subirNivel(1); g.flags=g.flags||{}; g.flags.cuidaCuerpo=true; return 'Le hiciste caso. Empezaste a entrenar distinto y el cuerpo te lo devolvió.'; } },
      { txt:'"Ganá algo con tu país. Lo demás se olvida."', ef:g=>{ g.fama+=6; g.moral+=6; return nombre+' te habló de la selección con los ojos brillosos. Te quedó grabado.'; } }
    ];
    ev = { t:'Conocés a tu ídolo: '+nombre, img:'seleccion', idolo:nombre,
      d:'Aparece <b>'+esc(nombre)+'</b>, el que mirabas de pibe. Te da diez minutos. ¿Qué te llevás de la charla?',
      opts: shuffle(consejos).slice(0,3) };
  }
  if (ev && ev._dyn && ev.t.indexOf('abuelo')>=0){
    // Elegir hasta 2 nacionalidades DISTINTAS al azar (ojo: opciones concretas, no "cambiar").
    const candidatas = shuffle(PAISES.filter(p => p !== G.pais)).slice(0, 2);
    const flagOf = p => flagImg(p, 18) + '&nbsp;';
    const dText = `Un periodista descubre que tu abuelo era de <b>${esc(candidatas[0])}</b>` + (candidatas[1]?` y también hay linaje de <b>${esc(candidatas[1])}</b>`:'') + `. Podés elegir para qué selección jugar.`;
    const opts = [
      { txt: flagOf(G.pais) + 'Seguir defendiendo a ' + G.pais, ef:g=>{ g.moral+=8; g.fama+=3; return 'Fidelidad a tus colores. El hincha te lo agradece de por vida.'; } },
      { txt: flagOf(candidatas[0]) + 'Jugar para ' + candidatas[0], ef:g=>{ g.pais = candidatas[0]; g.fama+=10; g.moral-=3; g.flags=g.flags||{}; g.flags.doblenac=true; return 'Aceptaste la convocatoria de '+g.pais+'. Nuevo himno, nueva historia.'; } }
    ];
    if (candidatas[1]) opts.push({ txt: flagOf(candidatas[1]) + 'Jugar para ' + candidatas[1], ef:g=>{ g.pais = candidatas[1]; g.fama+=10; g.moral-=3; g.flags=g.flags||{}; g.flags.doblenac=true; return 'Elegiste ' + g.pais + '. Debut internacional en camino.'; } });
    ev = { t: ev.t, img: ev.img, d: dText, opts };
  }
  G._ev=ev;
  pantallaDecision(`
    <div style="background:linear-gradient(160deg,rgba(186,255,0,.05),rgba(20,22,18,.5));border:1px solid #242424;border-radius:16px;padding:16px;">
      ${decoImg(ev.img)}
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:18px;color:#fff;margin-bottom:6px;line-height:1.2;">${esc(ev.t)}</div>
      <div style="font-size:13.5px;color:#c4ccc0;line-height:1.5;margin-bottom:14px;">${ev.d}</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${ev.opts.map((o,i)=>`<button onclick="window._carreraElegir(${i})" style="${btn(i===0)}">${o.txt}</button>`).join('')}
      </div>
    </div>`, 'DECISIÓN', A);
}
function btn(prim){ return prim?`background:rgba(186,255,0,.1);border:1.5px solid rgba(186,255,0,.4);color:${A};border-radius:13px;padding:14px 15px;font-weight:800;font-size:14px;text-align:left;cursor:pointer;`:'background:rgba(255,255,255,.04);border:1.5px solid #262626;color:#fff;border-radius:13px;padding:14px 15px;font-weight:800;font-size:14px;text-align:left;cursor:pointer;'; }
// Fotos reales disponibles en img/carrera/decisiones/<tipo>.webp
const DECO_FOTOS = ['fichaje','final','joda','lesion','mentoria','ojeador','potrero','prensa','seleccion','titulo'];
// Categorías SIN foto → banner con ícono + gradiente propio (así cada decisión tiene una
// imagen que CORRESPONDE, en vez de reutilizar una foto genérica que no pega).
// TODOS los banners de decisión usan iconos generados (sin las fotos que subió el usuario,
// que estaban mal posicionadas y no encajaban). Cada categoria tiene su propio color/icono.
const DECO_ICON = {
  dinero:    { i:'bx-dollar-circle',  c:['#2b220a','#c9a227'] },
  sponsor:   { i:'bx-purchase-tag',   c:['#082726','#14b8a6'] },
  familia:   { i:'bx-home-heart',     c:['#2a160a','#f97316'] },
  pelea:     { i:'bx-shield-x',       c:['#2a0a0a','#ef4444'] },
  redes:     { i:'bx-trending-up',    c:['#1a0a2a','#a855f7'] },
  agente:    { i:'bx-briefcase-alt',  c:['#0f1622','#3b82f6'] },
  capitan:   { i:'bxs-star',          c:['#241a05','#eab308'] },
  tactica:   { i:'bx-clipboard',      c:['#0a2216','#22c55e'] },
  joda:      { i:'bxs-cocktail',      c:['#1a0a24','#c026d3'] },
  lesion:    { i:'bx-first-aid',      c:['#2a0a0a','#ef4444'] },
  mentoria:  { i:'bx-conversation',   c:['#0a1a2a','#60a5fa'] },
  ojeador:   { i:'bx-search-alt-2',   c:['#0a2216','#22c55e'] },
  potrero:   { i:'bx-football',       c:['#161a0a','#a3e635'] },
  prensa:    { i:'bx-microphone',     c:['#1a1a1a','#e5e5e5'] },
  seleccion: { i:'bx-world',          c:['#0a1a2a','#3b82f6'] },
  titulo:    { i:'bx-trophy',         c:['#241a05','#facc15'] },
  fichaje:   { i:'bx-transfer',       c:['#0f1a0a','#baff00'] },
  final:     { i:'bx-medal',          c:['#241a05','#f59e0b'] }
};
// A cada tipo de decisión le corresponde un LUGAR, no un cuadrado de color.
const DECO_ESCENA = {
  potrero:'baldio', ojeador:'baldio', fichaje:'oficina', agente:'oficina', dinero:'oficina',
  contrato:'oficina', sponsor:'oficina', final:'cancha', titulo:'cancha', tactica:'cancha',
  seleccion:'cancha', prensa:'estudio', redes:'estudio', lesion:'clinica', salud:'clinica',
  mentoria:'predio', joda:'noche', familia:'casa', vida:'casa'
};
function decoImg(tipo){
  if(!tipo) return '';
  const k = DECO_ICON[tipo] || DECO_ICON.tactica;
  const W = 640, H = 150;
  const cual = DECO_ESCENA[tipo] || 'cancha';
  let fondo = '';
  try {
    fondo = cual === 'baldio'  ? vjFondoBaldio(W,H)
          : cual === 'cancha'  ? vjFondoCancha(W,H)
          : cual === 'oficina' ? vjFondoOficina(W,H)
          : cual === 'casa'    ? vjFondoCasa(W,H)
          : cual === 'predio'  ? vjFondoPredio(W,H)
          : cual === 'noche'   ? vjFondoBarrio(W,H)
          : cual === 'estudio' ? vjFondoLugarRol(W,H)
          : vjFondoBarrio(W,H);
  } catch(e){ fondo = ''; }
  return `<div style="height:120px;border-radius:12px;overflow:hidden;margin-bottom:12px;position:relative;background:#0b0f16;">
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" style="position:absolute;inset:0;width:100%;height:100%;shape-rendering:crispEdges;">${fondo}</svg>
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,11,16,.10),rgba(8,11,16,.72));"></div>
    <i class='bx ${k.i}' style="position:absolute;right:12px;bottom:10px;font-size:30px;color:${k.c[1]};opacity:.9;filter:drop-shadow(0 2px 8px rgba(0,0,0,.8));"></i>
  </div>`;
}
// Trofeo ilustrativo según la liga (img/trofeos/<n>.webp).
function trofeoDe(liga){
  const map={ 'LaLiga (ESP)':'laliga','Premier (ING)':'premier','Ligue 1 (FRA)':'ligue1','Primera Uruguay':'liga-uy','Liga Profesional (ARG)':'copa-argentina','Brasileirão':'copa-brasil' };
  return map[liga] || 'champions';
}

function eur(n){ if(n>=1e6) return '€'+(n/1e6).toFixed(1).replace('.0','')+'M'; if(n>=1000) return '€'+Math.round(n/1000)+'k'; return '€'+Math.round(n); }
// Tarjeta de una oferta (escudo + club + liga + sueldo/años/prima).
function ofertaCard(o, i, kind){
  const sub = kind==='renov' ? (o._v||'Renovación') : esc(o.liga);
  const riesgo = o._riesgo ? `<div style="font-size:10px;color:#ffb454;margin-top:3px;text-align:center;">⚠ Puede ofender al club</div>` : '';
  // Tarjeta con portada (escudo grande) arriba y datos abajo — cada oferta con su cover.
  return `<button onclick="window._carreraElegirOferta('${kind}',${i})" style="display:flex;flex-direction:column;align-items:center;text-align:center;background:linear-gradient(160deg,rgba(255,255,255,.06),rgba(20,22,18,.6));border:1.5px solid #262626;border-radius:14px;padding:12px 10px;cursor:pointer;transition:.15s;" onmouseover="this.style.borderColor='${A}'" onmouseout="this.style.borderColor='#262626'">
    <div style="height:56px;display:flex;align-items:center;justify-content:center;margin-bottom:6px;">${clubBadge(o.name,54)}</div>
    <div style="font-size:13px;font-weight:900;color:#fff;line-height:1.15;min-height:30px;">${esc(o.name)}</div>
    <div style="font-size:10px;color:#8a8f86;margin-top:2px;display:flex;align-items:center;justify-content:center;gap:4px;">${kind!=='renov'&&o.pais?flagImgInline(o.pais):''}<span>${sub}</span></div>
    ${kind!=='renov'&&o.pais&&G&&o.pais!==G.clubPais?`<div style="font-size:9.5px;color:#a78bfa;font-weight:800;margin-top:2px;"><i class='bx bx-plane'></i> Te vas a ${esc(o.pais)}</div>`:''}
    <div style="font-size:11px;color:#666;margin-top:1px;">Nivel ${o.str}</div>
    <div style="font-size:12px;color:${A};font-weight:900;margin-top:6px;">${eur(o.sueldo)}/año</div>
    <div style="font-size:10px;color:#aaa;">${o.anios} años${o.prima?' · prima '+eur(o.prima):''}</div>
    ${riesgo}
  </button>`;
}
function mostrarOfertas(kind){
  let wrap=document.getElementById('cr-evwrap');
  if(!wrap){ pantallaDecision('', 'MERCADO DE PASES', '#a78bfa'); wrap=document.getElementById('cr-evwrap'); }
  if(!wrap) return;
  const list = kind==='renov' ? (G._renov||[]) : (G._offers||[]);
  const titulo = kind==='renov' ? 'Tu club te quiere renovar' : 'Tenés ofertas sobre la mesa';
  const sub = kind==='renov' ? `Elegí cómo negociar tu continuidad en ${esc(G.club)}.` : 'Varios clubes te quieren. Elegí tu próximo destino... o quedate.';
  wrap.innerHTML=`
  <div style="background:linear-gradient(160deg,rgba(186,255,0,.06),rgba(20,22,18,.5));border:1px solid #242424;border-radius:16px;padding:16px;">
    ${decoImg('fichaje')}
    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:17px;color:#fff;margin-bottom:4px;">${titulo}</div>
    <div style="font-size:13px;color:#c4ccc0;line-height:1.5;margin-bottom:14px;">${sub}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;">
      ${list.map((o,i)=>ofertaCard(o,i,kind)).join('')}
    </div>
    <button onclick="window._carreraElegirOferta('${kind==='renov'?'rechazar_renov':'quedarme'}',-1)" style="width:100%;margin-top:10px;${btn(false)}"><i class='bx bx-home-heart' style="margin-right:6px;color:#8a8f86;"></i>${kind==='renov'?'Rechazar renovación (escuchar ofertas)':'Quedarme en '+esc(G.club)}</button>
  </div>`;
}
window._carreraElegirOferta = function(kind, i){
  let msg;
  if(!G.flags) G.flags = {};
  if(kind==='quedarme'){
    if (G.flags.pidioSalida) {
      // Pediste salir y ahora te quedás: NO es gratis. Quedás marcado.
      G.flags.marcado = true;          // el año que viene jugás menos
      G.moral = clamp(G.moral - 12, 0, 100);
      G.fama = clamp(G.fama - 4, 0, 100);
      if(!G.idolatria) G.idolatria = {};
      G.idolatria[G.club] = clamp((G.idolatria[G.club]||0) - 20, -100, 100);
      msg = 'Te quedás, pero después de haber pedido salir nada vuelve a ser igual. El técnico te bajó a rotación, la hinchada te silba en el calentamiento y la dirigencia ya busca reemplazo.';
    } else if (G.flags.rechazoRenov) {
      // Rechazaste renovar y no aceptaste ninguna oferta: te quedás a préstamo del tiempo.
      G.flags.marcado = true;
      G.moral = clamp(G.moral - 8, 0, 100);
      msg = 'Te quedás sin renovar. Vas a jugar el último año de contrato con la dirigencia enojada y sin lugar asegurado. En junio te vas libre.';
    } else {
      G.moral += 8; G.fama += 3;
      if(!G.idolatria) G.idolatria = {};
      G.idolatria[G.club] = clamp((G.idolatria[G.club]||0) + 12, -100, 100);
      msg = 'Rechazaste todas las ofertas y te quedás. La hinchada te lo reconoce: sos de los que no se van.';
    }
  } else if(kind==='rechazar_renov'){
    G._verOfertasYa = true;
    // Rechazar la renovación tiene consecuencia arrastrada: quedás en la lista de
    // transferibles y con el vínculo roto.
    G.flags.rechazoRenov = true;
    G.moral = clamp(G.moral - 8, 0, 100); G.fama = clamp(G.fama - 2, 0, 100);
    if(!G.idolatria) G.idolatria = {};
    G.idolatria[G.club] = clamp((G.idolatria[G.club]||0) - 15, -100, 100);
    msg = 'Rechazaste la renovación. La dirigencia te puso en la lista de transferibles y el técnico ya no te cuenta como intocable. Te conviene aparecer en el mercado.';
  } else {
    const o = (kind==='renov' ? (G._renov||[]) : (G._offers||[]))[i];
    if(!o){ window._carreraHub(); return; }
    if(kind==='renov'){
      if(o._riesgo && Math.random()<0.4){ G.moral-=6; G.fama-=2; G.sueldo=Math.round((G.sueldo||o.sueldo)*0.95); msg='El club se ofendió con tu pedido. Renovación fría y sin aumento, pero seguís.'; }
      else { G.dinero+=o.prima; G.sueldo=o.sueldo; G.moral+=6; msg='Renovaste con '+esc(G.club)+' por '+o.anios+' años ('+eur(o.sueldo)+'/año).'; }
      G.contratoAnios=o.anios; G.clubStr=Math.min(99,G.clubStr+1);
    } else {
      // Al irte: si eras ídolo (>50), la hinchada se siente traicionada (idolatría cae).
      // Si estabas <20 (poco tiempo, poco vínculo), el impacto es menor.
      if(!G.idolatria) G.idolatria = {};
      const idClub = G.idolatria[G.club]||0;
      // ── ¿ES TRAICIÓN O NO? ────────────────────────────────────────────────
      // Antes bastaba con ser ídolo: te ibas y quedabas marcado como traidor
      // para siempre, aunque te fueras a Europa después de diez años y con el
      // club cobrando una fortuna. Ahora pesa A DÓNDE vas y CÓMO te vas.
      const _aRival = esRivalDirecto(o.name, G.club, o.pais, G.clubPais);
      const _saltoReal = ligaNivel(o.liga) - ligaNivel(G.liga);   // ¿es un salto de verdad?
      const _anios = temporadasEnClubActual();
      const _seFueAlExterior = o.pais !== G.clubPais;
      const _cumplioCiclo = _anios >= 4;
      const _rompioVinculo = !!(G.flags && (G.flags.pidioSalida || G.flags.rechazoRenov));
      // Puntaje de traición: cuanto más alto, peor te lo toman.
      let traicion = 0;
      if (_aRival) traicion += 70;                       // al clásico rival: imperdonable
      if (idClub > 60) traicion += 25; else if (idClub > 30) traicion += 12;
      if (_rompioVinculo) traicion += 25;                // te fuiste dando un portazo
      if (_anios <= 1) traicion += 15;                   // pasaste de largo
      if (_saltoReal >= 3 || _seFueAlExterior) traicion -= 30;  // "se lo ganó", el sueño europeo
      if (_saltoReal <= -1) traicion += 20;              // te fuiste a peor: no se entiende
      if (_cumplioCiclo) traicion -= 20;                 // diste todo por muchos años
      if ((G.titulos||0) >= 3) traicion -= 10;           // les diste títulos
      const esTraicion = traicion >= 45;
      const caida = esTraicion ? (idClub > 60 ? -85 : -55)
                  : traicion >= 20 ? (idClub > 30 ? -30 : -15)
                  : (idClub > 60 ? -8 : -4);             // despedida en buenos términos
      G.idolatria[G.club] = clamp(idClub + caida, -100, 100);
      if(!G.flags) G.flags = {};
      if (esTraicion) { G.flags.traidor = true; G.flags.exClub = G.club; }
      else if (_cumplioCiclo && idClub > 40) { G.flags.leyendaDe = G.club; }   // ídolo eterno igual
      G.idolatria[o.name] = 8; // nuevo club te recibe con expectativa
      const _idioma = chequearIdioma(G, o.pais);
      G.club=o.name; G.clubStr=o.str; G.liga=o.liga; G.clubPais=o.pais; G.clubDesde=G.edad;
      G.sueldo=o.sueldo; G.contratoAnios=o.anios;
      // Club nuevo = borrón y cuenta nueva con la dirigencia y el técnico.
      G.flags.pidioSalida = false; G.flags.rechazoRenov = false; G.flags.marcado = false;
      G.fama+=8; G.moral+=4; G.dinero+=o.prima;
      G.valor=Math.round((G.valor||o.str*90000)*1.1);
      // ¿Ya habías jugado acá? La gente se acuerda de cómo te fuiste.
      const _volves = (G.timeline||[]).some(t=>t.club===o.name);
      const _idolAnterior = (G.idolatria && G.idolatria[o.name]) || 0;
      let _bienvenida = '';
      if (_volves){
        if (G.flags.exClub === o.name && G.flags.traidor) _bienvenida = ' Volvés al club que dejaste de mala manera: te esperan con silbidos y una parte de la hinchada no te perdona.';
        else if (_idolAnterior >= 40) _bienvenida = ' ¡Vuelve el hijo pródigo! Te esperaron en el aeropuerto con bombos: acá nunca te olvidaron.';
        else if (_idolAnterior <= -20) _bienvenida = ' Volvés a un club donde no dejaste buen recuerdo. Vas a tener que ganártelos de nuevo.';
        else _bienvenida = ' Volvés a una casa conocida. Los que quedaron del plantel anterior te abrazaron en la puerta.';
        G.moral = clamp(G.moral + (_idolAnterior >= 40 ? 12 : _idolAnterior <= -20 ? -6 : 5), 0, 100);
      }
      msg='¡Nuevo club: '+esc(o.name)+'! Firmaste por '+o.anios+' años ('+eur(o.sueldo)+'/año).' + _bienvenida
        + (_idioma ? ' Ojo: allá se habla ' + _idioma + ' y vos no lo hablás.' : '')
        + (esTraicion
            ? (_aRival ? ' Te fuiste al clásico rival. Esa hinchada no te lo va a perdonar nunca.'
                       : ' La hinchada de tu ex club se siente traicionada.')
            : _cumplioCiclo
              ? ' Después de ' + _anios + ' temporadas, te despidieron con aplausos: cumpliste un ciclo.'
              : _seFueAlExterior
                ? ' Nadie te lo reprocha: era el salto que todo pibe sueña.'
                : '');
    }
  }
  G.fama=clamp(G.fama,0,100); G.moral=clamp(G.moral,0,100); G.dinero=Math.max(0,G.dinero);
  G._offers=null; G._renov=null; save();
  // Si firmaste en un club nuevo, POSÁS con la camiseta recién estrenada.
  const _fichaje = (kind !== 'quedarme' && kind !== 'rechazar_renov' && kind !== 'renov');
  // Al firmar en un club nuevo, elegís la camiseta que vas a usar.
  if (_fichaje){ G._msgFichaje = msg; save(); window._elegirNumero('club'); return; }
  // El resultado reemplaza la PANTALLA ENTERA. Antes sólo se reescribía el bloque
  // de las ofertas: el botón "Seguir un año más en <club>" vivía fuera de ese
  // bloque y quedaba vivo debajo del resultado, así que se podía volver a elegir
  // una y otra vez sin que la temporada avanzara nunca. Era una trampa sin salida.
  // Si rechazaste renovar, lo logico es escuchar YA lo que hay en el mercado.
  if (G._verOfertasYa){
    G._verOfertasYa = false; G._mercadoHecho = false; save();
    window._carreraMercadoForzado();
    return;
  }
  const pose = (kind === 'quedarme' && !(G.flags.pidioSalida || G.flags.rechazoRenov)) ? 'aplaudir'
             : (kind === 'renov') ? 'firmar' : 'pensativo';
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:42px 20px calc(30px + env(safe-area-inset-bottom));text-align:center;">
    <div style="display:flex;justify-content:center;margin-bottom:14px;">${avatarBox(avatarDeG(2.8, pose), '10px 16px', escenaDePose(pose, G.avatar, G.edad))}</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px;">
      ${clubBadge(G.club,26)}<span style="font-size:16px;font-weight:900;color:#fff;">${esc(G.club)}</span>
    </div>
    <div style="font-size:15px;color:#fff;font-weight:700;margin-bottom:20px;line-height:1.55;">${msg}</div>
    <button onclick="window._carreraContinuar()" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:13px 30px;font-weight:900;cursor:pointer;">Continuar <i class='bx bx-right-arrow-alt'></i></button>
  </div>`;
};

// ── ELEGIR NÚMERO DE CAMISETA ─────────────────────────────────────────────────
// Al fichar por un club o al ser convocado a la selección. Los números "libres"
// dependen del club: en los grandes los emblemáticos suelen estar ocupados.
function numerosDisponibles(ctx){
  const pos = G.pos || 'DC';
  // Números típicos por puesto, primero los que más pegan.
  const porPuesto = {
    POR:[1,12,25], LI:[3,6,16], DFC:[2,4,5,14], LD:[4,2,13],
    MCD:[5,8,15], MI:[11,17,7], MC:[8,5,20], MD:[7,11,22], MCO:[10,21,14],
    EI:[11,7,17], DC:[9,19,29], ED:[7,11,27]
  }[pos] || [10,8,7];
  const base = [...new Set([...porPuesto, 10, 9, 7, 8, 11, 6, 5, 4, 3, 2, 1])];
  // En clubes fuertes, los números bajos suelen estar tomados.
  const fuerte = (G.clubStr||60) >= 78;
  let h = 0; const key = (G.club||'') + (G.temporada||0);
  for(let i=0;i<key.length;i++) h = (h*31 + key.charCodeAt(i)) >>> 0;
  const ocupados = new Set();
  if (ctx === 'club' && fuerte){
    // 3 números emblemáticos ocupados, estables para este club/temporada.
    [10,9,7].forEach((n,i)=>{ if (((h >>> (i*3)) % 3) !== 0) ocupados.add(n); });
  }
  const libres = base.filter(n => !ocupados.has(n)).slice(0, 8);
  // Siempre ofrecemos algunos altos como alternativa segura.
  [ (h%9)+20, (h%7)+30, 77, 99 ].forEach(n=>{ if(libres.length<12 && libres.indexOf(n)<0) libres.push(n); });
  return { libres, ocupados:[...ocupados] };
}
window._elegirNumero = function(ctx){
  if(!G) G=load(); if(!G) return;
  // ¿Ya elegiste numero para este club / para la seleccion? Entonces no se
  // vuelve a preguntar: se sigue de largo.
  G._numHecho = G._numHecho || {};
  const claveNum = (ctx === 'seleccion') ? 'sel' : ('club:' + G.club);
  if (G._numHecho[claveNum]){
    G._numCtx = ctx;
    window._confirmarNumero();
    return;
  }
  const { libres, ocupados } = numerosDisponibles(ctx);
  G._numCtx = ctx;
  const esSel = ctx === 'seleccion';
  const kit = esSel ? kitDe(G.pais) : kitClub(G.club, G.clubPais||G.pais);
  const actual = esSel ? (G.numSeleccion || G.num) : G.num;
  const titulo = esSel ? `Tu número en la selección` : `Tu número en ${esc(G.club)}`;
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:20px 18px calc(28px + env(safe-area-inset-bottom));text-align:center;">
    <div style="font-size:10px;font-weight:900;letter-spacing:2px;color:${esSel?'#93c5fd':A};margin-bottom:12px;">${esSel?'CONVOCATORIA':'PRESENTACIÓN'}</div>
    <div style="display:flex;align-items:flex-end;justify-content:center;gap:14px;margin-bottom:12px;flex-wrap:wrap;">
      ${avatarBox(avatarDeG(3.2,'posando',{ seleccion:esSel }), '12px 18px', esSel?'estadio':'vestuario')}
      <div id="num-jersey">${jerseyKit(112, G.apellido, actual, kit)}</div>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:6px;">
      ${esSel? flagImg(G.pais,22) : clubBadge(G.club,26)}
      <span style="font-size:16px;font-weight:900;color:#fff;">${esSel?esc(G.pais):esc(G.club)}</span>
    </div>
    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:19px;color:#fff;margin-bottom:4px;">${titulo}</div>
    <div style="font-size:12.5px;color:#8a9280;margin-bottom:16px;">Elegí la camiseta con la que te van a conocer.</div>
    ${ocupados.length?`<div style="font-size:11px;color:#f59e0b;margin-bottom:10px;"><i class='bx bx-lock-alt'></i> Ocupados en el plantel: ${ocupados.join(', ')}</div>`:''}
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(58px,1fr));gap:8px;margin-bottom:18px;">
      ${libres.map(n=>`<button onclick="window._setNumero(${n})" style="background:${n===actual?'rgba(186,255,0,.16)':'rgba(255,255,255,.04)'};border:1.5px solid ${n===actual?A:'#242a20'};border-radius:11px;padding:14px 4px;cursor:pointer;color:${n===actual?A:'#e0e4dc'};font-family:Outfit,sans-serif;font-weight:900;font-size:20px;">${n}</button>`).join('')}
    </div>
    <button onclick="window._confirmarNumero()" style="width:100%;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:14px;padding:15px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;">CONFIRMAR</button>
  </div>`;
};
window._setNumero = function(n){
  if(!G) return;
  if (G._numCtx === 'seleccion') G.numSeleccion = n; else G.num = n;
  save(); window._elegirNumero(G._numCtx);
};
window._confirmarNumero = function(){
  const ctx = G._numCtx; G._numCtx = null;
  // Si confirmaste sin elegir, queda el que ya tenias: igual se da por resuelto
  // para no volver a preguntar lo mismo una y otra vez.
  if (ctx === 'seleccion' && !G.numSeleccion) G.numSeleccion = G.num;
  G._numHecho = G._numHecho || {};
  G._numHecho[(ctx === 'seleccion') ? 'sel' : ('club:' + G.club)] = true;
  const msg = G._msgFichaje; G._msgFichaje = null; save();
  if (ctx === 'seleccion'){ window._carreraContinuar(); return; }
  // Presentación oficial con la camiseta y el número elegidos.
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:34px 20px calc(28px + env(safe-area-inset-bottom));text-align:center;">
    <div style="display:flex;justify-content:center;margin-bottom:12px;">${avatarBox(avatarDeG(3.6,'posando'), '16px 22px', 'estadio')}</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:9px;margin-bottom:10px;">
      ${clubBadge(G.club,30)}<span style="font-size:18px;font-weight:900;color:#fff;">${esc(G.club)}</span>
      <span style="font-size:12px;font-weight:900;color:${A};background:rgba(186,255,0,.14);border-radius:7px;padding:3px 9px;">#${G.num}</span>
    </div>
    <div style="font-size:14.5px;color:#c4ccc0;font-weight:700;margin-bottom:20px;line-height:1.55;">${esc(msg||'Nuevo club.')}</div>
    <button onclick="window._carreraContinuar()" style="width:100%;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:14px;padding:15px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;">Continuar</button>
  </div>`;
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
  // ══ ASPECTO — decisiones que dejan MARCA VISIBLE permanente en el avatar ════
  { t:'Se te está cayendo el pelo', img:'prensa', minAge:27, noFlag:'implante', d:'Te mirás en el espejo del vestuario y las entradas ya no se disimulan con nada. Los compañeros empezaron con las cargadas.', opts:[
    { txt:'Injerto capilar en Turquía',  ef:g=>{ g.dinero=Math.max(0,(g.dinero||0)-18000); g.flags=g.flags||{}; g.flags.implante=true; avMutar({implante:true, calvicie:-3}); return 'Volviste de Estambul con la cabeza vendada y el pelo nuevo. En dos meses no te reconocía nadie.'; } },
    { txt:'Raparme y asumirlo', ef:g=>{ g.moral+=6; avMutar({pelo:'rapado', calvicie:1}); return 'Te rapaste al cero y te quedó bien. Dejaste de pensar en eso para siempre.'; } },
    { txt:'Disimularlo como pueda', ef:g=>{ g.moral-=3; avMutar({calvicie:1}); return 'Gorra en toda foto y peinado estratégico. Todos se dan cuenta igual.'; } } ] },
  { t:'Te querés tatuar', img:'joda', minAge:19, d:'Un tatuador famoso te ofrece hacerte una manga completa. Es para siempre.', opts:[
    { txt:'Hacerme la manga entera', ef:g=>{ g.fama+=5; avMutar({tatus:2}); return 'Te tatuaste el brazo entero con la historia de tu vida. Ahora sos reconocible hasta de espaldas.'; } },
    { txt:'Algo chico y con sentido', ef:g=>{ g.moral+=4; avMutar({tatus:1}); return 'Un tatuaje discreto con la fecha de tu debut. Sólo vos sabés lo que significa.'; } },
    { txt:'Mi piel queda como está', ef:g=>{ return 'Le dijiste que no. No es lo tuyo y está bien.'; } } ] },
  { t:'Volviste pesado de las vacaciones', img:'lesion', minAge:24, d:'El control de peso de pretemporada no miente: volviste con cinco kilos de más.', opts:[
    { txt:'Dieta estricta y doble turno', ef:g=>{ g.nivel+=2; g.moral-=3; avMutar({peso:0}); return 'Dos meses de sacrificio y volviste al peso ideal. El cuerpo técnico lo notó.'; } },
    { txt:'Ya los bajo jugando', ef:g=>{ const mal=Math.random()<.6; g.nivel+=mal?-3:0; if(mal) avMutar({peso:1}); return mal?'Nunca los bajaste. Se te nota en la cancha y en las fotos.':'Los fuiste bajando de a poco. Zafaste.'; } } ] },
  { t:'Golpe en la cara', img:'lesion', d:'Un codazo en un córner te abre la ceja. Seis puntos y sangre por todos lados.', opts:[
    { txt:'Que me cosan y sigo jugando', ef:g=>{ g.fama+=6; g.moral+=5; avMutar({cicatriz:1}); return 'Volviste con la cabeza vendada y jugaste los 90. Te quedó la cicatriz de recuerdo y el respeto de todos.'; } },
    { txt:'Salir y que me revisen bien', ef:g=>{ avMutar({cicatriz:1}); return 'Te sacaron por precaución. Seis puntos y una cicatriz fina sobre la ceja.'; } } ] },
  { t:'Rotura de ligamentos', img:'lesion', minAge:22, d:'Caíste mal y el crujido lo escuchó todo el estadio. Los estudios confirman lo peor: ligamentos cruzados.', opts:[
    { txt:'Operarme y hacer la rehabilitación completa', ef:g=>{ g.nivel-=5; g.moral-=10; avMutar({vendaje:true, muletas:true, cicatriz:1});
      return 'Ocho meses afuera. Muletas, gimnasio y mucha cabeza. Volviste, pero nunca fuiste exactamente el mismo.'; } },
    { txt:'Tratamiento conservador para volver antes', ef:g=>{ const mal=Math.random()<.65; g.nivel-=mal?9:3; avMutar({vendaje:true, cicatriz:1});
      return mal?'Volviste antes y te rompiste de nuevo a los tres partidos. Un año perdido.':'Arriesgaste y salió bien. Volviste en cuatro meses con la rodilla vendada.'; } } ] },
  { t:'Sesión de fotos para una marca', img:'sponsor', minStr:70, minAge:23, d:'Una marca de lujo te quiere para su campaña global. Estilistas, relojes y cadenas de oro.', opts:[
    { txt:'Entrar al juego del lujo', ef:g=>{ g.dinero=(g.dinero||0)+180000; g.fama+=12; avMutar({bling:2}); return 'Cadena de oro, reloj carísimo y tu cara en Times Square. Bienvenido a las ligas mayores.'; } },
    { txt:'Hacerla, pero sin disfrazarme', ef:g=>{ g.dinero=(g.dinero||0)+90000; g.fama+=5; return 'Hiciste la campaña con tu ropa de siempre. La marca no quedó del todo conforme.'; } } ] },

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
  { t:'El técnico te cambia de posición', img:'tactica', d:'El DT te quiere probar en otra función del campo. Si aceptás, elegís vos a qué puesto te reconvertís.', opts:[
    // Aceptar abre el selector de puesto: hasta ahora "adaptarme" no cambiaba nada
    // y seguías jugando exactamente en el mismo lugar de siempre.
    { txt:'Aceptar y elegir mi nuevo puesto', reconversion:true },
    { txt:'Negarme, es mi puesto', ef:g=>{ g.moral-=5; g.fama-=2; return 'Roce con el cuerpo técnico. Te quedás donde siempre, pero te lo van a cobrar.'; } } ] },

  // ── REPRESENTANTE / CONTRATO / DINERO ─────────────────────────────────────
  { t:'Cambio de representante', img:'agente', minAge:19, d:'Un agente top te quiere manejar la carrera, pero pide el 15% de todo.', opts:[
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
  { t:'Casamiento en puerta', img:'familia', minAge:22, d:'Tu pareja quiere casarse esta temporada. Coincide con un momento clave del equipo.', opts:[
    { txt:'Casarme, la familia primero', ef:g=>{ g.moral+=12; g.nivel-=1; return 'Feliz y equilibrado. Rendís tranquilo.'; } },
    { txt:'Posponer por el fútbol', ef:g=>{ g.moral-=6; g.nivel+=1; return 'Enfocado, pero hay tensión en casa.'; } } ] },
  { t:'Nace tu hijo', img:'familia', minAge:23, d:'Vas a ser padre. Las noches de poco sueño se vienen.', opts:[
    { txt:'Vivirlo a pleno', ef:g=>{ g.moral+=14; return 'La motivación más grande. Jugás con el alma.'; } },
    { txt:'Contratar ayuda y descansar', ef:g=>{ g.dinero-=15000; g.nivel+=1; return 'Descansás bien y rendís. Cuesta plata.'; } } ] },
  // Solo aparece si estas jugando FUERA de tu pais: si no, no hay a donde volver.
  { t:'La familia quiere que vuelvas', img:'potrero', req:g=>!!(g.clubPais && g.pais && g.clubPais !== g.pais),
    d:'Tus viejos te piden que vuelvas a jugar a tu país. Están grandes y te ven una vez por año.', opts:[
    { txt:'Volver a mi país', ef:g=>{
        const destino = clubDeMiPais(g);
        if(!destino){ g.moral+=6; return 'Buscaste club en tu país y no apareció nada serio. Te quedás, pero con la cabeza allá.'; }
        const antes = g.club, afuera = g.clubPais;
        mudarseA(g, destino);
        g.moral += 14; g.fama -= 5; g.valor = Math.round((g.valor||100000) * 0.82);
        return 'Dejaste ' + esc(antes) + ' y volviste a ' + esc(g.pais) + ': firmaste en ' + esc(destino.name) +
               '. Resignás vidriera, pero almorzás con los tuyos los domingos.' + (afuera ? '' : '');
      } },
    { txt:'Seguir mi camino afuera', ef:g=>{ g.moral-=8; g.fama+=3; return 'Les dijiste que todavía no. Cortaste el teléfono con un nudo en la garganta.'; } } ] },

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
  { t:'No entendés nada en el vestuario', img:'fichaje', reqFlag:'barreraIdioma',
    d:'Cambiaste de país y no hablás el idioma. En los entrenamientos te perdés la mitad de lo que dice el técnico.', opts:[
    { txt:'Meterle clases todos los días', ef:g=>{
        g.dinero=Math.max(0,(g.dinero||0)-ri(3000,15000));
        const l = g.flags.barreraIdioma; (g.idiomas = g.idiomas || []).push(l); g.flags.barreraIdioma = null;
        g.nivel = subirNivel(2); g.moral += 8;
        return 'Seis meses de clases después del entrenamiento. Ahora entendés todo y el vestuario te adoptó. Hablás ' + ((IDIOMA_NOMBRE[l]||'el idioma')) + '.'; } },
    { txt:'Arreglarme con señas y un traductor', ef:g=>{
        g.nivel = subirNivel(-3); g.moral -= 6;
        return 'Seguís sin entender las charlas técnicas. Te perdiste dos jugadas ensayadas y el técnico lo notó.'; } } ] },
  { t:'Video viral tuyo', img:'redes', maxStr:80, d:'Un jueguito tuyo en el entrenamiento se hace viral en redes.', opts:[
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
  { t:'Sondeo de la Selección mayor', img:'seleccion', noFlag:'debutSel',
    d:'El técnico de la mayor te sigue. Hay un amistoso y podrías debutar.', opts:[
    { txt:'Pedir que me citen', ef:g=>{ const va=Math.random()<.5; g.fama+=va?12:2; g.valor=Math.round(g.valor*(va?1.15:1));
        if(va){ g.flags=g.flags||{}; g.flags.debutSel=true; g.selPj=(g.selPj||0)+1; }
        return va?'¡Debutaste con la mayor! Sueño cumplido.':'Quedaste en pre-lista. Cerca.'; } },
    { txt:'Dejar que llegue solo', ef:g=>{ g.nivel+=2; return 'Seguís rindiendo y esperando tu momento.'; } } ] },
  // Una vez que ya sos de la casa, la noticia es otra: te consolidas, no debutas.
  { t:'Sos fijo en la Selección', img:'seleccion', reqFlag:'debutSel',
    d:'Ya no te citan: directamente contás. El técnico te quiere de arranque en la próxima fecha.', opts:[
    { txt:'Ir y dejar todo', ef:g=>{ const bien=Math.random()<.6; g.selPj=(g.selPj||0)+1; g.fama+=bien?10:3; g.nivel+=bien?1:0;
        return bien?'Otro partidazo con la camiseta de tu país. Ya sos parte de la historia grande.':'Cumpliste sin brillar. Con la mayor eso también se paga.'; } },
    { txt:'Pedir descanso, vengo fundido', ef:g=>{ g.moral+=5; g.nivel+=1; g.fama-=4; return 'Te bajaste de la fecha. El técnico lo entendió; la prensa no tanto.'; } } ] },
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
    { txt:'Devolverle al barrio', ef:g=>{ g.dinero-=40000; g.fama+=10; g.moral+=10; g.flags=g.flags||{}; g.flags.filantropo=true; return 'Sos ejemplo. El barrio te lleva en el corazón.'; } },
    { txt:'Todavía no es momento', ef:g=>{ g.dinero+=5000; return 'Lo dejás para más adelante.'; } } ] },

  // ── AMATEUR / VIDA (con consecuencias reales, buenas Y malas) ──────────────
  { t:'El clásico del barrio por un lechón', img:'potrero', maxStr:65, d:'Se juega el clásico del barrio y la apuesta es un lechón entero. Media cuadra vino a verte.', opts:[
    { txt:'Jugar con todo por el honor', ef:g=>{ const gana=Math.random()<.55; g.moral+=gana?10:-8; g.fama+=gana?4:-2; return gana?'Metiste el gol del triunfo. Comés lechón como un rey y el barrio te aúpa.':'Erraste el penal decisivo. Te comen los asados ajenos y la cargada dura meses.'; } },
    { txt:'No arriesgar, es solo un picado', ef:g=>{ g.moral-=4; return 'Jugaste tibio. Perdieron y algunos te miran de reojo: "se cree profesional".'; } } ] },
  { t:'Trabajo en la construcción', img:'potrero', maxStr:65, d:'No te alcanza la plata. Te ofrecen changas en una obra, pero el esfuerzo físico te puede pasar factura.', opts:[
    { txt:'Aceptar la changa', ef:g=>{ g.dinero+=8000; const cansado=Math.random()<.5; g.nivel+=cansado?-2:0; return cansado?'Llegás muerto a los entrenamientos. El técnico nota que rendís menos.':'Te ganás unos pesos y mantenés la humildad. Todo bajo control.'; } },
    { txt:'Apostar todo al fútbol', ef:g=>{ g.dinero-=3000; g.moral+=3; g.nivel+=1; return 'La pasás justo de plata, pero descansás y entrenás enfocado.'; } } ] },
  { t:'Un ojeador en la tribuna', img:'ojeador', maxStr:72, d:'Corre el rumor de que hay un ojeador de un club grande mirando el partido de hoy.', opts:[
    { txt:'Salir a comerme la cancha', ef:g=>{ const bien=Math.random()<.5; g.fama+=bien?12:-2; g.nivel+=bien?2:-1; g.valor=Math.round((g.valor||100000)*(bien?1.2:0.95)); return bien?'Jugaste el partido de tu vida. El ojeador pidió tu teléfono.':'Quisiste hacer de más, forzaste jugadas y te fue mal. El ojeador ni te anotó.'; } },
    { txt:'Jugar tranquilo, lo mío', ef:g=>{ g.nivel+=1; return 'Partido sobrio y prolijo. Ni brillás ni fallás; quedás en un cajón de "a seguir".'; } } ] },
  { t:'Pelea en un boliche', img:'joda', d:'Salís de joda y un desconocido te busca pelea de la nada, filmando con el celular.', opts:[
    { txt:'Irme sin dar bola', ef:g=>{ g.moral+=3; g.fama+=2; return 'Te fuiste digno. Al otro día nadie habla de vos, y eso está perfecto.'; } },
    { txt:'Encararlo', ef:g=>{ const escandalo=Math.random()<.65; g.fama+=escandalo?-14:1; g.moral-=escandalo?8:0; g.dinero-=escandalo?15000:0; return escandalo?'El video se hizo viral. El club te multa y sale en todos lados. Papelón.':'No pasó a mayores, pero fue una imprudencia.'; } } ] },
  { t:'Conocés a tu ídolo', img:'seleccion', _dyn:true, d:'', opts:[] },
  { t:'Conocés a alguien del ambiente', img:'seleccion', d:'En un evento aparece un histórico y te da unos minutos de charla.', opts:[
    { txt:'Pedirle consejos y escuchar', ef:g=>{ g.moral+=10; g.nivel+=1; return 'Sus palabras te marcan. Entrenás con otra mentalidad, más profesional.'; } },
    { txt:'Solo la foto para redes', ef:g=>{ g.fama+=5; return 'Buena foto, muchos likes. Pero sentís que desaprovechaste el momento.'; } } ] },
  { t:'Oferta turbia de un apostador', img:'dinero', d:'Un apostador te ofrece una fortuna por "aflojar" en un partido puntual. Si te descubren, es escándalo penal.', opts:[
    { txt:'Aceptar (muy riesgoso)', ef:g=>{
      const cae = Math.random() < .6;
      if (cae) {
        g.fama -= 40; g.moral -= 30;
        // 35% de que además vayas PRESO por soborno deportivo → final alternativo.
        if (Math.random() < .35) { g._irCarcel = 'soborno'; avMutar({preso:true,bling:-3}); return 'Te descubrieron y hay causa penal. Vas preso por soborno deportivo.'; }
        return 'Te descubrieron. Suspensión, escándalo y tu carrera al borde del final.';
      }
      g.dinero += 200000; g.moral -= 6;
      return 'Nadie se enteró... pero no podés ni mirarte al espejo.';
    } },
    { txt:'Rechazar y denunciarlo', ef:g=>{ g.fama+=8; g.moral+=8; return 'Hiciste lo correcto. La AFA y la prensa te ponen de ejemplo.'; } } ] },
  { t:'Pelea en un after fuera de control', img:'joda', d:'A la salida de un boliche, se arma una pelea. Vos estás en el medio. Hay heridos.', opts:[
    { txt:'Encarar y bancar la parada', ef:g=>{
      const mal = Math.random() < .5;
      if (mal) { g.fama -= 25; g.moral -= 15; g._irCarcel = 'pelea'; avMutar({preso:true,cicatriz:1}); return 'Cámaras te filman siendo el más agresivo. La policía te lleva. Vas preso.'; }
      g.fama -= 8; return 'Te frenaron a tiempo. Escándalo mediano, no fue a mayores.';
    } },
    { txt:'Salir corriendo, no meterme', ef:g=>{ g.moral+=3; g.fama-=2; return 'Te fuiste. Bien hecho — no estabas para líos.'; } } ] },
  { t:'Sobrepeso en la pretemporada', img:'lesion', minAge:20, d:'Volviste de vacaciones con unos kilos de más y el preparador físico te marca.', opts:[
    { txt:'Ponerme a full con la dieta', ef:g=>{ g.nivel+=2; g.moral+=2; return 'Te pusiste en forma rápido. El cuerpo técnico valora tu compromiso.'; } },
    { txt:'Ya lo bajo jugando', ef:g=>{ const mal=Math.random()<.6; g.nivel+=mal?-3:0; return mal?'Arrancaste lento y pesado. Perdiste la titularidad las primeras fechas.':'Zafaste, lo fuiste bajando de a poco.'; } } ] },
  // Una vez que jugaste por tu pais no podes cambiar de seleccion: la FIFA no lo
  // permite y el evento no tenia sentido apareciendo despues del debut.
  { t:'Descubren un abuelo extranjero', img:'seleccion', _dyn:true, noFlag:'debutSel', maxAge:23, d:'', opts:[] },
  { t:'Amague de retiro anticipado', img:'prensa', d:'Venís golpeado y frustrado. Se te cruza por la cabeza colgar los botines antes de tiempo.', opts:[
    { txt:'Seguir peleándola', ef:g=>{ g.moral+=6; g.nivel+=1; return 'Sacaste fuerzas. La resiliencia te devuelve al primer plano.'; } },
    { txt:'Bajar un cambio y priorizar salud', ef:g=>{ g.moral+=4; g.nivel-=1; return 'Te cuidás más. Rendís un poco menos pero disfrutás de nuevo.'; } } ] },

  // ══ ÉTICA / LEGALIDAD — cadenas con consecuencias arrastradas ══════════════
  { t:'Te ofrecen "vitaminas" del médico del club', img:'lesion', minAge:20, noFlag:'dopado', d:'El médico te ofrece un tratamiento "de recuperación" que está en zona gris. Todos en el plantel lo usan.', opts:[
    { txt:'Aceptar el tratamiento', ef:g=>{ g.flags=g.flags||{}; g.flags.dopado=true; g.nivel+=4; avMutar({peso:-1}); return 'Te sentís una máquina. Recuperás en la mitad de tiempo. Nadie pregunta nada... por ahora.'; } },
    { txt:'Rechazar, prefiero mi cuerpo limpio', ef:g=>{ g.flags=g.flags||{}; g.flags.limpio=true; g.moral+=6; return 'Dijiste que no. Vas a tardar más en recuperar, pero dormís tranquilo.'; } } ] },
  { t:'Control antidopaje sorpresa', img:'prensa', reqFlag:'dopado', d:'Llega la AMA al entrenamiento sin aviso. Te toca a vos dar la muestra.', opts:[
    { txt:'Dar la muestra y esperar', ef:g=>{
      const cae = Math.random() < .55;
      if(cae){ g.flags.suspendido=true; g.fama-=30; g.nivel-=6; g.moral-=20; return 'POSITIVO. Suspensión de 9 meses. Tu nombre en todos los diarios como tramposo.'; }
      g.moral-=6; return 'Negativo. Zafaste por poco, pero el susto no te lo saca nadie.'; } },
    { txt:'Inventar una excusa y no presentarme', ef:g=>{ g.flags.suspendido=true; g.fama-=35; g.moral-=15; return 'No presentarse equivale a positivo. Suspensión automática de 12 meses. Papelón total.'; } } ] },
  { t:'Vuelta tras la suspensión', img:'titulo', reqFlag:'suspendido', d:'Se terminó la sanción. El vestuario te mira distinto y la hinchada está partida.', opts:[
    { txt:'Pedir perdón públicamente', ef:g=>{ g.flags.redimido=true; g.fama+=12; g.moral+=10; return 'Diste la cara, pediste disculpas sin excusas. Media hinchada te perdona.'; } },
    { txt:'Decir que fui víctima de un complot', ef:g=>{ g.fama-=8; g.moral-=5; return 'Nadie te creyó. Quedaste como el que ni siquiera asume.'; } } ] },

  { t:'Una app de apuestas te tienta', img:'dinero', minAge:19, noFlag:'ludopata', d:'Bajaste una app "solo para probar" con los partidos que ya mirás igual. Un amigo del plantel dice que él saca un sueldo extra.', opts:[
    { txt:'Meterle unos pesos, total es poco', ef:g=>{ g.flags=g.flags||{}; g.flags.ludopata=true; g.dinero+=15000; avMutar({bling:1}); return 'Ganaste la primera. Esa sensación no se olvida... y ahí empieza el problema.'; } },
    { txt:'Ni loco, conozco esas historias', ef:g=>{ g.moral+=4; return 'Borraste la app. Viste demasiados compañeros fundidos.'; } } ] },
  { t:'La apuesta se te fue de las manos', img:'dinero', reqFlag:'ludopata', noFlag:'deudaMafia', d:'Ya no apostás por diversión. Debés una cifra que no podés pagar y el prestamista no es del banco.', opts:[
    { txt:'Pedir ayuda al club y confesar', ef:g=>{ g.flags.enTratamiento=true; g.dinero=Math.max(0,g.dinero-80000); g.fama-=10; g.moral+=8; return 'El club te bancó y te puso en tratamiento. Fue humillante pero te salvó la vida.'; } },
    { txt:'Pedirle plata al prestamista', ef:g=>{ g.flags.deudaMafia=true; g.dinero+=120000; g.moral-=15; return 'Te prestaron sin preguntar. Ahora le debés a gente que no acepta "la semana que viene".'; } } ] },
  { t:'Vienen a cobrar la deuda', img:'pelea', reqFlag:'deudaMafia', d:'Te esperan afuera del entrenamiento. Quieren la plata o "un favor" en el próximo partido.', opts:[
    { txt:'Pagar todo aunque me funda', ef:g=>{ g.dinero=Math.max(0,g.dinero-250000); g.flags.deudaMafia=false; g.moral+=5; return 'Vendiste hasta el auto. Estás en cero, pero estás libre.'; } },
    { txt:'Aceptar el "favor" en el partido', ef:g=>{
      g.flags.arreglo=true;
      const cae=Math.random()<.55;
      if(cae){ g.fama-=45; g.moral-=25; if(Math.random()<.4){ g._irCarcel='arreglo'; avMutar({preso:true}); return 'Se abrió causa penal por amaño. Vas preso.'; } return 'Te descubrieron. Inhabilitación y carrera destruida.'; }
      g.moral-=18; return 'Nadie se dio cuenta. Pero vos sabés lo que hiciste, y eso no se borra.'; } } ] },
  { t:'Denuncia por el arreglo', img:'prensa', reqFlag:'arreglo', d:'Un periodista de investigación te encara con audios. Sabe todo.', opts:[
    { txt:'Confesar y colaborar con la justicia', ef:g=>{ g.flags.arreglo=false; g.flags.delator=true; g.fama-=15; g.moral+=12; return 'Colaboraste y desarmaste la red. Perdiste amigos y ganaste algo de paz.'; } },
    { txt:'Negar todo y contratar abogados', ef:g=>{ g.dinero=Math.max(0,g.dinero-200000); const zafa=Math.random()<.45; if(!zafa){ g._irCarcel='arreglo'; avMutar({preso:true}); return 'Los abogados no alcanzaron. Vas preso por amaño de partidos.'; } g.fama-=20; return 'Zafaste por falta de pruebas. La sombra te va a seguir siempre.'; } } ] },

  // ══ TRAIDOR — consecuencias de irte siendo ídolo ═══════════════════════════
  { t:'Volvés a jugar contra tu ex club', img:'pelea', reqFlag:'traidor', d:'Te toca visitar el estadio donde eras ídolo. Te reciben con insultos, billetes falsos y una bandera con tu nombre tachado.', opts:[
    { txt:'Meter el gol y no festejarlo', ef:g=>{ const gol=Math.random()<.5; if(gol){ g.fama+=10; g.moral+=6; return 'Marcaste y te quedaste quieto, pidiendo perdón con la mano. Hasta ellos lo respetaron.'; } g.moral-=3; return 'No pudiste marcar. Te fuiste silbado los 90 minutos.'; } },
    { txt:'Meterlo y festejarlo en su cara', ef:g=>{ const gol=Math.random()<.45; if(gol){ g.fama+=6; g.moral-=8; g.flags.villano=true; return 'Gol y festejo provocador. Sos oficialmente el villano de esa hinchada. Para siempre.'; } g.fama-=6; return 'No metiste y encima habías avisado que ibas a festejar. Quedaste en offside.'; } } ] },
  { t:'Ofertas del club que traicionaste', img:'fichaje', reqFlag:'traidor', minAge:31, d:'Increíblemente, el club del que te fuiste quiere que vuelvas para el final de tu carrera. La dirigencia cambió; los hinchas no.', opts:[
    { txt:'Volver a casa y bancar los silbidos', ef:g=>{
        g.flags.traidor=false; g.flags.redimido=true; g.moral+=15;
        const ex = g.flags.exClub;
        if(ex){
          g.idolatria = g.idolatria || {}; g.idolatria[ex] = 30;
          const c = todosClubs().find(x=>x.name===ex);
          if(c) mudarseA(g, c);   // volver de verdad, no solo de palabra
        }
        return 'Volviste a ' + esc(ex || 'tu club') + '. Los primeros meses fueron durísimos, pero terminaste reconciliado con la gente.';
      } },
    { txt:'Ya no es mi casa', ef:g=>{ g.moral-=5; return 'Cerraste la puerta definitivamente. Algunos capítulos no se reescriben.'; } } ] },

  // ══ FILANTROPÍA / LEGADO ══════════════════════════════════════════════════
  { t:'Un pibe de tu fundación llega a primera', img:'mentoria', reqFlag:'filantropo', d:'Uno de los chicos de tu fundación debuta en primera y dice en la nota que sos su ejemplo.', opts:[
    { txt:'Ir a verlo debutar', ef:g=>{ g.moral+=14; g.fama+=8; return 'Estuviste en la tribuna llorando. Ese pibe es tu obra maestra.'; } },
    { txt:'Mandarle un mensaje privado', ef:g=>{ g.moral+=7; return 'Le escribiste algo que se va a guardar toda la vida.'; } } ] },

  // ══ FINANZAS — cadenas de plata con consecuencias arrastradas ══════════════
  { t:'Estás gastando más de lo que entra', img:'dinero', reqFlag:'enRojo', d:'Tu contador te muestra los números: el tren de vida y el mantenimiento de tus cosas se comen todo lo que cobrás. Así no llegás a fin de año.', opts:[
    { txt:'Vender lo que más me drena', ef:g=>{
      const bienes=(g.bienes||[]).slice().sort((x,y)=>((bienByld(y.id)||{}).mant||0)-((bienByld(x.id)||{}).mant||0));
      if(!bienes.length) return 'No tenés nada para vender. Vas a tener que bajar el tren de vida a la fuerza.';
      const b=bienes[0]; const B=bienByld(b.id)||{n:'un bien'};
      const rec=Math.round((b.precio||B.p||0)*0.6);
      g.bienes=g.bienes.filter(x=>x.id!==b.id); g.dinero=(g.dinero||0)+rec;
      g.fama=clamp((g.fama||0)-Math.round((B.fama||0)/2),0,100); g.flags.enRojo=false;
      return 'Vendiste '+B.n+' por '+eur(rec)+'. Duele el orgullo, pero volviste a números negros.'; } },
    { txt:'Pedir un préstamo y seguir igual', ef:g=>{ g.dinero=(g.dinero||0)+300000; g.flags.endeudado=true; return 'El banco te dio el préstamo mirando tu contrato. Ahora debés con intereses y no cambiaste nada.'; } } ] },
  { t:'Vence el préstamo del banco', img:'dinero', reqFlag:'endeudado', d:'El banco quiere su plata de vuelta, con intereses. Son 420 mil y tu cuenta no está para eso.', opts:[
    { txt:'Liquidar inversiones y pagar', ef:g=>{
      let disp=(g.dinero||0)+((g.inversiones&&g.inversiones.monto)||0);
      if(disp>=420000){ const falta=Math.max(0,420000-(g.dinero||0)); if(falta&&g.inversiones){ g.inversiones.monto-=falta; if(g.inversiones.monto<=0) g.inversiones=null; }
        g.dinero=Math.max(0,(g.dinero||0)-Math.min(g.dinero||0,420000)); g.flags.endeudado=false;
        return 'Liquidaste todo y pagaste. Empezás de cero, pero sin deuda arriba.'; }
      g.flags.embargo=true; return 'No te alcanzó. El banco inició acciones y te embargan el sueldo.'; } },
    { txt:'Refinanciar a más años', ef:g=>{ g.dinero=Math.max(0,(g.dinero||0)-60000); const b=Math.random()<.5; if(b){ g.flags.endeudado=false; return 'Refinanciaste en buenos términos y en dos años lo cancelaste.'; } return 'Refinanciaste pero la cuota te va a seguir ahogando un buen tiempo.'; } } ] },
  { t:'Te embargan parte del sueldo', img:'dinero', reqFlag:'embargo', d:'Cada mes te descuentan directo del contrato. El vestuario se enteró y la prensa también.', opts:[
    { txt:'Poner la cara y ordenarme', ef:g=>{ g.flags.embargo=false; g.flags.endeudado=false; g.moral+=8; g.fama-=6; g.dinero=Math.max(0,(g.dinero||0)-120000); return 'Contrataste un administrador serio, vendiste lo que sobraba y saliste. Lección aprendida.'; } },
    { txt:'Buscar un contrato gordo en Arabia', ef:g=>{ g.dinero+=800000; g.flags.embargo=false; g.flags.endeudado=false; g.fama-=4; g.nivel-=2; return 'Firmaste en el Golfo por una fortuna. Pagaste todo, pero tu nivel competitivo se resintió.'; } } ] },
  { t:'Un amigo te propone un negocio', img:'dinero', minAge:24, noFlag:'socioEstafador', d:'Un amigo de toda la vida te ofrece entrar como socio en su empresa. Dice que en dos años se triplica. No hay papeles todavía.', opts:[
    { txt:'Poner plata sin contrato, es mi amigo', ef:g=>{ const monto=Math.min(g.dinero||0, 200000); g.dinero-=monto; const b=Math.random()<.4;
      if(b){ g.dinero+=monto*3; return 'Salió redondo. Triplicaste la inversión y siguen siendo amigos.'; }
      g.flags=g.flags||{}; g.flags.socioEstafador=true; return 'Se fundió (o te fundió). Sin papeles, no hay nada que reclamar. Perdiste '+eur(monto)+' y un amigo.'; } },
    { txt:'Que lo revise mi abogado primero', ef:g=>{ g.dinero=Math.max(0,(g.dinero||0)-8000); return 'El abogado encontró tres cláusulas raras. Le dijiste que no. Tu amigo se ofendió, pero te salvaste.'; } } ] },
  { t:'Crisis económica global', img:'dinero', minAge:25, d:'Se derrumban los mercados. Tus inversiones y ahorros están en riesgo, y todos los medios hablan de pánico financiero.', opts:[
    { txt:'Aguantar sin tocar nada', ef:g=>{ if(g.inversiones&&g.inversiones.monto){ const b=Math.random()<.6; g.inversiones.monto=Math.round(g.inversiones.monto*(b?1.35:0.55)); return b?'Aguantaste el temporal y cuando rebotó ganaste fuerte.':'Siguió cayendo. Perdiste casi la mitad de tu cartera.'; } return 'No tenías inversiones expuestas. Viste el incendio desde afuera.'; } },
    { txt:'Vender todo y pasarme a ladrillos', ef:g=>{ if(g.inversiones&&g.inversiones.monto){ g.dinero+=Math.round(g.inversiones.monto*0.8); g.inversiones=null; return 'Saliste con una pérdida del 20% pero dormís tranquilo. El ladrillo no cotiza en pánico.'; } return 'No tenías nada invertido. Pusiste tus ahorros en un departamento.'; } } ] },

  // ══ DOBLE NACIONALIDAD — se abre tras el evento del abuelo ═════════════════
  { t:'Te llama la selección de tu segundo país', img:'seleccion', reqFlag:'doblenac', d:'La federación del país que elegiste por linaje te quiere de titular. Pero la prensa del país donde naciste te trata de mercenario.', opts:[
    { txt:'Aceptar y bancar la crítica', ef:g=>{ g.fama+=12; g.moral-=5; return 'Debutaste con el otro himno. Media patria te aplaude, la otra media te putea.'; } },
    { txt:'Arrepentirme y volver a mis raíces', ef:g=>{ g.flags.doblenac=false; g.moral+=10; g.fama-=4; return 'Pediste volver. Burocracia FIFA de por medio, pero el corazón mandó.'; } } ] }
];
// No repetir: mezcla los eventos aún NO vistos en esta carrera; cuando se agotan, resetea.
// ── CAMBIAR DE CLUB DESDE UNA DECISION ───────────────────────────────────────
// Hasta ahora los eventos que hablaban de irse a otro lado solo movian moral y
// fama: seguias jugando en el mismo club, lo que no tenia ningun sentido.
// Idioma de cada pais: mudarte a donde no se habla lo tuyo tiene su costo.
const IDIOMAS = {
  'Uruguay':'es','Argentina':'es','España':'es','México':'es','Colombia':'es','Chile':'es','Perú':'es',
  'Paraguay':'es','Bolivia':'es','Ecuador':'es','Venezuela':'es','Costa Rica':'es','Panamá':'es',
  'Guatemala':'es','Honduras':'es','El Salvador':'es',
  'Brasil':'pt','Portugal':'pt',
  'Inglaterra':'en','Estados Unidos':'en','Escocia':'en','Gales':'en','Irlanda':'en','Australia':'en',
  'Italia':'it','Francia':'fr','Bélgica':'fr','Alemania':'de','Austria':'de','Suiza':'de',
  'Países Bajos':'nl','Turquía':'tr','Japón':'ja','China':'zh','Corea del Sur':'ko','Rusia':'ru',
  'Grecia':'el','Croacia':'hr','Serbia':'sr','Polonia':'pl','Ucrania':'uk','Suecia':'sv','Noruega':'no',
  'Dinamarca':'da','Arabia Saudita':'ar','Egipto':'ar','Marruecos':'ar'
};
const IDIOMA_NOMBRE = { es:'español', pt:'portugués', en:'inglés', it:'italiano', fr:'francés', de:'alemán',
  nl:'neerlandés', tr:'turco', ja:'japonés', zh:'chino', ko:'coreano', ru:'ruso', el:'griego', hr:'croata',
  sr:'serbio', pl:'polaco', uk:'ucraniano', sv:'sueco', no:'noruego', da:'danés', ar:'árabe' };
function idiomaDe(pais){ return IDIOMAS[pais] || 'es'; }
// ¿Te entendés con el vestuario del club nuevo?
function chequearIdioma(g, paisNuevo){
  const mio = idiomaDe(g.pais), alla = idiomaDe(paisNuevo);
  // El idioma NATIVO siempre esta en la lista, pase lo que pase. Sin esto podia
  // pasar el absurdo de "aprende español" a alguien nacido en un pais hispano
  // que se muda a España (partidas viejas donde g.idiomas quedo mal armado).
  g.idiomas = g.idiomas || [];
  if (g.idiomas.indexOf(mio) < 0) g.idiomas.push(mio);
  // Mismo idioma que el propio => no hay barrera posible. Nunca.
  if (alla === mio) { if (g.flags) g.flags.barreraIdioma = null; return null; }
  if (g.idiomas.indexOf(alla) >= 0) { if (g.flags) g.flags.barreraIdioma = null; return null; }
  g.flags = g.flags || {};
  g.flags.barreraIdioma = alla;                 // hasta que lo aprendas, cuesta
  return IDIOMA_NOMBRE[alla] || 'otro idioma';
}
function mudarseA(g, c){
  if(!g || !c) return;
  g.idolatria = g.idolatria || {};
  g.idolatria[c.name] = Math.max(g.idolatria[c.name] || 0, 12);
  chequearIdioma(g, c.pais);
  g.club = c.name; g.clubStr = c.str; g.liga = c.liga; g.clubPais = c.pais;
  g.clubDesde = g.edad;
  g.sueldo = ofertaDe(c).sueldo;
  g.contratoAnios = 3;
  g.flags = g.flags || {};
  g.flags.pidioSalida = false; g.flags.rechazoRenov = false; g.flags.marcado = false;
  g._msgFichaje = null;
}
// El mejor club razonable DE TU PAIS para volver: ni un grande que no te compraria
// ni el ultimo del interior. Se prioriza el que mas se acerca a tu nivel.
function clubDeMiPais(g){
  const locales = todosClubs().filter(c => c.pais === g.pais && c.name !== g.club);
  if(!locales.length) return null;
  const nivel = g.nivel || 60;
  const posibles = locales.filter(c => c.str <= nivel + 6);
  const lista = posibles.length ? posibles : locales;
  return lista.sort((a,b)=> Math.abs(a.str - nivel) - Math.abs(b.str - nivel))[0];
}
function eventoRandom(){
  try{
    if(!G) return pick(EVENTOS);
    if(!Array.isArray(G.evVistos)) G.evVistos=[];
    var str = G.clubStr || 60;
    // Filtra por nivel de club: nada de "changa" o "ojeador de barrio" si jugás
    // en el Barcelona; nada de "reunión con dirigente de élite" si estás en el interior.
    var edad = G.edad || 20;
    var F = G.flags || (G.flags = {});
    var ok = function(ev){
      if (ev.maxStr != null && str > ev.maxStr) return false;
      if (ev.minStr != null && str < ev.minStr) return false;
      if (ev.minAge != null && edad < ev.minAge) return false;
      if (ev.maxAge != null && edad > ev.maxAge) return false;
      // BANDERAS: reqFlag = solo si ya pasó eso; noFlag = nunca si ya pasó eso.
      if (ev.reqFlag && !F[ev.reqFlag]) return false;
      if (ev.noFlag && F[ev.noFlag]) return false;
      // Condicion libre: algunos eventos solo tienen sentido en cierta situacion
      // (volver al pais no se le puede ofrecer a alguien que ya juega en su pais).
      if (typeof ev.req === 'function' && !ev.req(G)) return false;
      return true;
    };
    var pool = EVENTOS.map(function(_,i){return i;}).filter(function(i){ return ok(EVENTOS[i]); });
    if(!pool.length) pool = EVENTOS.map(function(_,i){return i;});
    var idx = pool.filter(function(i){ return G.evVistos.indexOf(i)===-1; });
    if(!idx.length){ G.evVistos = G.evVistos.filter(function(i){ return pool.indexOf(i)===-1; }); idx = pool; }
    var chosen=idx[Math.floor(Math.random()*idx.length)];
    G.evVistos.push(chosen);
    return EVENTOS[chosen];
  }catch(e){ return pick(EVENTOS); }
}
// Chip de cambio de stat (verde si sube, rojo si baja).
function deltaChip(lbl, d, money){
  if(!d) return '';
  const up = d>0; const col = up?'#4ade80':'#ff6b6b';
  const val = money ? (up?'+':'−')+'€'+(Math.abs(d)>=1000?(Math.abs(d)/1000|0)+'k':Math.abs(d)) : (up?'+':'−')+Math.abs(d);
  return `<span style="display:inline-flex;align-items:center;gap:3px;background:${up?'rgba(74,222,128,.12)':'rgba(255,107,107,.12)'};border:1px solid ${col}55;color:${col};border-radius:8px;padding:3px 9px;font-size:11px;font-weight:800;"><i class='bx ${up?'bx-up-arrow-alt':'bx-down-arrow-alt'}'></i>${lbl} ${val}</span>`;
}
// Elige la POSE con la que el avatar reacciona al resultado de una decisión.
// Lee el texto del resultado y los deltas: si mejoró festeja, si empeoró se hunde.
// ── VARIACIÓN DE TEXTOS ───────────────────────────────────────────────────────
// Los resultados de las decisiones venían con una frase fija. Ahora se le suma un
// COLETILLA contextual que cambia según el club, la edad, la idolatría y el humor
// de la partida, de modo que la misma decisión nunca se lee igual dos veces.
const COLETILLAS = {
  bueno: [
    ()=>`En ${G.club} lo tomaron como una señal.`,
    ()=>`El vestuario se enteró antes que la prensa.`,
    ()=>`A los ${G.edad} ya no te sorprende nada, pero esta vez sonreíste.`,
    ()=>`Tu vieja lo contó en el barrio como si hubieras ganado un mundial.`,
    ()=>`El técnico no dijo nada, pero te miró distinto.`,
    ()=>`Esa noche dormiste tranquilo por primera vez en meses.`,
    ()=>`Los del grupo del plantel te llenaron el teléfono.`,
    ()=>`Alguien lo filmó y para la tarde ya estaba en todos lados.`
  ],
  malo: [
    ()=>`En ${G.club} nadie te lo dijo en la cara, pero se notó.`,
    ()=>`Volviste a tu casa sin ganas de hablar con nadie.`,
    ()=>`A los ${G.edad} estas cosas pegan distinto que a los veinte.`,
    ()=>`Tu representante te llamó tres veces y no atendiste.`,
    ()=>`Al otro día en el entrenamiento se hizo un silencio raro.`,
    ()=>`La radio del barrio lo comentó toda la semana.`,
    ()=>`Te quedaste pensando si no había otra manera.`,
    ()=>`Esa fue de las que te acordás veinte años después.`
  ],
  neutro: [
    ()=>`La vida siguió como si nada.`,
    ()=>`Al final, una más de las tantas que se toman sin pensarlas mucho.`,
    ()=>`En ${G.club} la temporada siguió su curso.`,
    ()=>`Ni tragedia ni fiesta: apenas un martes más.`,
    ()=>`Con los años vas a recordar esto de otra manera.`,
    ()=>`Nadie escribió una nota sobre esto, y estuvo bien así.`
  ]
};
// Une el texto base del evento con una coletilla, sin repetir la última usada.
function variarTexto(res, d){
  if (!res || typeof res !== 'string') return res;
  if (!G) return res;
  const suma = (d.moral||0) + (d.fama||0) + (d.nivel||0)*2;
  const tono = suma >= 6 ? 'bueno' : suma <= -6 ? 'malo' : 'neutro';
  const pool = COLETILLAS[tono];
  if (!G._coletillas) G._coletillas = {};
  const usadas = G._coletillas[tono] || [];
  let libres = pool.map((_,i)=>i).filter(i=>usadas.indexOf(i)<0);
  if (!libres.length){ G._coletillas[tono] = []; libres = pool.map((_,i)=>i); }
  const idx = libres[Math.floor(Math.random()*libres.length)];
  (G._coletillas[tono] = G._coletillas[tono]||[]).push(idx);
  let extra = '';
  try { extra = pool[idx](); } catch(e){ extra = ''; }
  // 30% de las veces no agrega nada, para que no se vuelva un tic.
  if (Math.random() < 0.30 || !extra) return res;
  return res.trim() + ' ' + extra;
}
function _poseReaccion(res, d){
  const t = (res||'').toLowerCase();
  // 0) LO QUE DICE EL TEXTO manda. Si el relato dice que te vas llorando, el
  //    muñeco tiene que irse llorando — no quedarse "pensando" como hasta ahora.
  if (/llor(ando|aste|ás|as|é)|lágrim|se te cayeron las l/.test(t)) return 'llorar';
  if (/te tapaste la cara|no pod[ií]as mirar|verg[üu]enza|humillac/.test(t)) return 'taparse';
  if (/¡gol!|metiste el gol|la clav|la mandaste a guardar|gol de|gritaste el gol/.test(t)) return 'gol';
  if (/te alzan en andas|te llevaron en andas|todo el barrio grita/.test(t)) return 'gol';
  if (/aplaud|ovaci[oó]n|de pie|reconocimiento del estadio/.test(t)) return 'aplaudir';
  if (/firmaste|firma del contrato|firmar el contrato|renovaste/.test(t)) return 'firmar';
  if (/zafaste|te salvaste|por poco|respiraste|falta de pruebas|volviste entero|volviste sano/.test(t)) return 'alivio';
  if (/les demostraste|se lo hiciste tragar|te hiciste respetar|nadie te calla|encaraste/.test(t)) return 'desafiante';
  if (/nervios|no dormiste|no pegaste un ojo|esperando el llamado|ansiedad/.test(t)) return 'nervioso';
  // 1) Estados físicos/legales — mandan sobre todo lo demás.
  if (/preso|cárcel|carcel|detenid|polic[ií]a|esposad/.test(t)) return 'esposado';
  if (/lesi[oó]n|rompi|desgarr|ligament|operar|quir[oó]fano|muleta|infiltr/.test(t)) return 'lesion';
  // 2) LA COPA sólo si es un título DEPORTIVO de verdad. Antes cualquier texto con
  //    "título" (por ejemplo el título del liceo) sacaba el trofeo, que no pegaba.
  // OJO: hay que descartar los textos NEGATIVOS. 'Copa decepcionante', 'perdimos
  // la final' o 'te eliminaron' contienen las mismas palabras que un titulo y
  // sacaban al muneco levantando el trofeo, justo cuando le habia ido mal.
  const malaNoticia = /decepcion|decepcionante|fracas|elimina|qued[oó] afuera|no pudiste|perdi(ste|mos|eron)|derrota|sin gloria|flojo|jugar poco|jugaste poco|no anduvo|te toc[oó] jugar poco|frustrac|amarg/.test(t);
  // Hace falta una senal EXPLICITA de haber ganado. Antes alcanzaba con que el
  // texto dijera 'torneo' o 'levantá' para sacar la copa.
  const gano = /sali(ó|o|eron) camp|es camp|fuiste camp|se consagr|dieron la vuelta|vuelta ol[ií]mpica|levantaste (la|el)|ganaste (la|el|el torneo)|campe[oó]n del|campe[oó]n de la|se qued[oó] con (la|el)|logr(aste|amos) el t[ií]tulo|ascendiste|ascenso a/.test(t);
  const tituloDeportivo = !malaNoticia && gano
                       && !/t[ií]tulo del liceo|secundari|bachiller|gradu|diploma|universi|doctorado/.test(t);
  if (tituloDeportivo) return 'campeon';
  // 3) Estudios / reconocimientos que NO son copas
  if (/gradu|diploma|t[ií]tulo del liceo|bachiller|universi|doctorado|honoris/.test(t)) return 'orgullo';
  // 4) Cambios de aspecto → posa
  if (/injerto|estambul|turqu[ií]a|rapaste|tatua|te cortaste/.test(t)) return 'posando';
  // 5) Plata
  if (/fortuna|mill[oó]n|millones|cadena de oro|reloj car|te llenaste de plata/.test(t)) return 'rico';
  // 6) Problemas
  if (/esc[aá]ndalo|papel[oó]n|suspensi[oó]n|te echaron|silbid|traidor|positivo|dopaje/.test(t)) return 'bronca';
  if (/perdiste|derrota|se te escap[oó]|no pudiste|fracas/.test(t)) return 'bajon';
  // 7) Por deltas
  if (d.moral <= -14) return 'llorar';
  if (d.moral <= -8 || d.fama <= -10) return 'bajon';
  if (d.nivel <= -3) return 'agotado';
  if (d.moral >= 8 || d.fama >= 8) return 'festejo';
  if (d.nivel >= 2) return 'orgullo';
  if (d.dinero >= 100000) return 'rico';
  // 8) Nada fuerte: igual no siempre la misma cara. Se elige entre gestos
  //    neutros distintos para que dos resultados seguidos no se vean clonados.
  return pick(['pensando','pensativo','idle','alivio','nervioso']);
}
// ── RECONVERSIÓN DE PUESTO ───────────────────────────────────────────────────
// Elegís a qué posición te pasás. El salto grande (de defensor a delantero) cuesta
// nivel; moverte a un puesto vecino casi no. Y el número puede quedar raro, así
// que después se ofrece elegir uno nuevo.
const POS_LINEA = { POR:0, DFC:1, LI:1, LD:1, MCD:2, MC:2, MI:2, MD:2, MCO:3, EI:3, ED:3, DC:4 };
window._carreraReconversion = function(){
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:22px 20px calc(30px + env(safe-area-inset-bottom));">
    <div style="text-align:center;margin-bottom:14px;">
      <div style="font-size:11px;font-weight:900;letter-spacing:2px;color:${A};">RECONVERSIÓN</div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:23px;color:#fff;margin-top:5px;line-height:1.15;">¿A qué puesto te pasás?</div>
      <div style="font-size:12.5px;color:#9aa0a6;margin-top:6px;">Hoy sos <b style="color:#fff;">${esc(posLabelLargo(G.pos))}</b>. Cuanto más lejos esté el puesto nuevo, más te cuesta adaptarte.</div>
    </div>
    ${pitch(G.pos, 'window._reconvertirA')}
  </div>`;
};
window._reconvertirA = function(nuevo){
  if(!G || !nuevo || nuevo === G.pos){ window._carreraContinuar(); return; }
  const salto = Math.abs((POS_LINEA[nuevo]||2) - (POS_LINEA[G.pos]||2));
  const viejo = G.pos;
  G.pos = nuevo;
  // Salto corto: te sale natural. Salto largo: perdés nivel mientras aprendés.
  const costo = salto <= 1 ? 0 : salto === 2 ? 3 : 6;
  const ganancia = salto <= 1 ? 3 : salto === 2 ? 1 : 0;
  G.nivel = clamp(G.nivel - costo + ganancia, 30, 99);
  G.moral = clamp(G.moral + (salto<=1?3:-2), 0, 100);
  G.flags = G.flags || {}; G.flags.reconvertido = true;
  const res = salto <= 1
    ? `Pasaste de ${posLabelLargo(viejo)} a ${posLabelLargo(nuevo)} y te salió natural: es prácticamente al lado. En dos semanas ya eras titular ahí.`
    : salto === 2
      ? `De ${posLabelLargo(viejo)} a ${posLabelLargo(nuevo)}. Te costó un semestre entender los movimientos, pero ahora sos otro jugador.`
      : `De ${posLabelLargo(viejo)} a ${posLabelLargo(nuevo)} hay un abismo. Aprendiste de cero y se te notó en la cancha todo el año.`;
  if(!G.hist) G.hist = [];
  G.hist.push({ t:'Reconversión de puesto', res });
  G._msgFichaje = `Ahora sos ${posLabelLargo(nuevo)} en ${G.club}. Elegí el número que te va a acompañar en tu nuevo puesto.`;
  save();
  const pose = salto <= 1 ? 'orgullo' : 'agotado';
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
    <div style="max-width:520px;margin:0 auto;padding:44px 20px 40px;text-align:center;">
      <div style="display:flex;justify-content:center;margin-bottom:14px;">${avatarBox(avatarDeG(2.8, pose), '10px 16px', escenaDePose(pose, G.avatar, G.edad))}</div>
      <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:12px;">
        <span style="font-size:12px;font-weight:900;color:#666;text-decoration:line-through;">${esc(viejo)}</span>
        <i class='bx bx-right-arrow-alt' style="color:${A};"></i>
        <span style="font-size:15px;font-weight:900;color:${A};background:rgba(186,255,0,.12);border:1px solid rgba(186,255,0,.35);border-radius:8px;padding:3px 10px;">${esc(nuevo)}</span>
      </div>
      <div style="font-size:15px;color:#fff;font-weight:700;line-height:1.55;margin-bottom:14px;">${esc(res)}</div>
      ${costo?`<div style="margin-bottom:16px;">${deltaChip('Nivel', ganancia-costo)}</div>`:`<div style="margin-bottom:16px;">${deltaChip('Nivel', ganancia)}</div>`}
      <button onclick="window._elegirNumero('club')" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:13px 28px;font-weight:900;cursor:pointer;">Elegir mi número <i class='bx bx-right-arrow-alt'></i></button>
    </div>`;
};
// ══════════════════════════════════════════════════════════════════════════════
// EFECTO MARIPOSA
// Dos mecanismos para que una misma decisión nunca se sienta igual:
//  1) INTENSIDAD variable — el impacto se multiplica por un factor aleatorio, así
//     "aceptar el sponsor" a veces te cambia la vida y a veces apenas se nota.
//  2) CONSECUENCIAS DIFERIDAS — lo que elegiste hoy vuelve en 1-4 temporadas, con
//     un texto que nombra la decisión original. Nada muere en la pantalla donde
//     se tomó.
// ══════════════════════════════════════════════════════════════════════════════
const ECOS = {
  bueno: [
    { t:'Aquello volvió multiplicado', f:g=>{ g.fama+=ri(4,12); g.moral+=ri(3,8); return 'Alguien se acordó de lo que hiciste aquella vez y te devolvió el favor cuando más lo necesitabas.'; } },
    { t:'Te llegó de rebote', f:g=>{ g.dinero+=ri(20000,140000); return 'Un contacto de entonces te metió en un negocio. Plata que no esperabas.'; } },
    { t:'El vestuario no se olvida', f:g=>{ g.moral+=ri(5,12); g.nivel+=ri(1,3); return 'Los que estuvieron aquella vez te bancaron ahora sin que tuvieras que pedirlo.'; } },
    { t:'La prensa lo desenterró', f:g=>{ g.fama+=ri(6,16); return 'Un periodista rescató aquella historia y la contó entera. Te hizo bien.'; } }
  ],
  malo: [
    { t:'Te pasó la factura', f:g=>{ g.fama-=ri(5,15); g.moral-=ri(4,12); return 'Lo que hiciste entonces reapareció en el peor momento. Nadie olvida.'; } },
    { t:'Se abrió una causa vieja', f:g=>{ g.dinero=Math.max(0,g.dinero-ri(30000,180000)); g.moral-=ri(3,9); return 'Abogados, papeles y una cuenta que no esperabas pagar por aquello.'; } },
    { t:'El que quedó dolido', f:g=>{ g.nivel-=ri(1,4); g.moral-=ri(5,12); return 'Alguien a quien perjudicaste terminó decidiendo sobre vos. Te lo cobró.'; } },
    { t:'La hinchada se acordó', f:g=>{ g.fama-=ri(4,10); g.moral-=ri(6,14); return 'Volviste a esa cancha y te lo cantaron los noventa minutos.'; } }
  ]
};
// Deja plantada una consecuencia para dentro de 1-4 temporadas.
function programarEco(origen, tono){
  if(!G) return;
  if(!G.ecos) G.ecos = [];
  if(G.ecos.length >= 6) return;                    // que no se acumulen infinitos
  G.ecos.push({ origen: String(origen||'una decisión tuya'), tono, edad: G.edad + ri(1,4) });
}
// Si hay algún eco vencido, lo resuelve y devuelve {titulo, texto, origen}.
function resolverEco(){
  if(!G || !G.ecos || !G.ecos.length) return null;
  const i = G.ecos.findIndex(e => G.edad >= e.edad);
  if (i < 0) return null;
  const e = G.ecos.splice(i,1)[0];
  const pool = ECOS[e.tono] || ECOS.bueno;
  const elegido = pick(pool);
  const texto = elegido.f(G);
  G.nivel=clamp(G.nivel,30,99); G.fama=clamp(G.fama,0,100); G.moral=clamp(G.moral,0,100); G.dinero=Math.max(0,G.dinero);
  save();
  return { titulo: elegido.t, texto, origen: e.origen, tono: e.tono };
}
window._carreraElegir = function(i){
  const ev=G._ev; const o=ev.opts[i]; if(!o) return;
  if (o.reconversion){ window._carreraReconversion(); return; }
  // Snapshot para medir el IMPACTO real de la decisión (stats y aspecto).
  const b={ nivel:G.nivel, moral:G.moral, fama:G.fama, dinero:G.dinero, valor:G.valor||0 };
  const avAntes = JSON.stringify(G.avatar||{});
  const vitAntes = (G.vitrina||[]).length;      // para detectar títulos ganados acá
  const res=o.ef(G);
  // INTENSIDAD: el mismo camino pega distinto cada vez que lo recorrés.
  const factor = rnd(0.55, 1.65);
  if (factor !== 1){
    G.nivel  = b.nivel  + (G.nivel  - b.nivel)  * factor;
    G.moral  = b.moral  + (G.moral  - b.moral)  * factor;
    G.fama   = b.fama   + (G.fama   - b.fama)   * factor;
    G.dinero = Math.round(b.dinero + (G.dinero - b.dinero) * factor);
  }
  // Lo que el evento sumo de nivel pasa por el freno; lo que resto, no.
  if (G.nivel > b.nivel){ const sube = G.nivel - b.nivel; G.nivel = b.nivel; subirNivel(sube); }
  G.nivel=clamp(G.nivel,30,99); G.fama=clamp(G.fama,0,100); G.moral=clamp(G.moral,0,100); G.dinero=Math.max(0,G.dinero);
  const d = { nivel:Math.round(G.nivel-b.nivel), moral:Math.round(G.moral-b.moral), fama:Math.round(G.fama-b.fama), dinero:Math.round(G.dinero-b.dinero) };
  const chips = [
    deltaChip('Nivel', d.nivel), deltaChip('Moral', d.moral),
    deltaChip('Fama', d.fama), deltaChip('$', d.dinero, true)
  ].filter(Boolean).join('');
  // ¿La decisión cambió el ASPECTO del avatar? Se avisa para que se note.
  const cambioAspecto = JSON.stringify(G.avatar||{}) !== avAntes;
  const resVar = variarTexto(res, d);
  G.hist.push({t:ev.t,res:resVar});
  // Toda decisión con peso deja una semilla que va a germinar más adelante.
  const _peso = (d.moral||0) + (d.fama||0) + (d.nivel||0)*2;
  if (_peso >= 7 && Math.random() < 0.55) programarEco(ev.t, 'bueno');
  else if (_peso <= -7 && Math.random() < 0.65) programarEco(ev.t, 'malo');
  save();
  if (G._irCarcel) {
    const motivo = G._irCarcel; G._irCarcel = null; save();
    setTimeout(()=>_carreraCarcel(motivo), 500);
  }
  const pose = _poseReaccion(res, d);
  // Si la decisión fue con la SELECCIÓN, el resultado se ve con la camiseta del
  // país — no con la del club. Ganar un Mundial vestido de tu club no tenía sentido.
  // Cualquier cosa que pase VESTIDO DE TU PAÍS se ve con la camiseta del país:
  // el evento de convocatoria, los amistosos, las eliminatorias, el Mundial. Antes
  // ganabas el Mundial con la camiseta del club, que era lo que más chirriaba.
  const esSeleccion = !!(ev && (ev.img === 'seleccion' || /selecci[oó]n|mundial|copa am[eé]rica|eurocopa|eliminatorias|juegos ol[ií]mpicos/i.test(ev.t||'')));
  const esOlimpico = /juegos ol[ií]mpicos|ol[ií]mpic/i.test((ev && ev.t) || '') || /juegos ol[ií]mpicos/i.test(res||'');
  const escenaRes = esSeleccion && (pose==='campeon'||pose==='festejo'||pose==='gol'||pose==='orgullo')
    ? 'estadio' : escenaDePose(pose, G.avatar, G.edad);
  // ¿Esta decisión terminó en un título? Se muestra el trofeo REAL al lado del
  // jugador, igual que en el resumen de temporada. Los títulos con la selección
  // se veían apenas como una frase de texto.
  const _nuevos = (G.vitrina||[]).slice(vitAntes);
  const trofeoNuevo = _nuevos.length ? _nuevos[_nuevos.length-1] : null;
  const wrap=document.getElementById('cr-evwrap');
  if(wrap) wrap.innerHTML=`<div style="text-align:center;padding:6px 0;">
    <div style="display:flex;justify-content:center;align-items:flex-end;gap:12px;margin-bottom:10px;flex-wrap:wrap;">
      ${avatarBox(avatarDeG(2.6, pose, { seleccion:esSeleccion, medalla:esOlimpico }), '10px 16px', escenaRes)}
      ${trofeoNuevo?`<div style="text-align:center;animation:crTrophy .7s cubic-bezier(.2,1.4,.4,1) both;"><div style="height:88px;display:flex;align-items:flex-end;justify-content:center;">${trofeoRender(trofeoNuevo.nombre,80)}</div><div style="font-size:12px;font-weight:900;color:#facc15;margin-top:6px;max-width:130px;line-height:1.2;">${esc(trofeoNuevo.nombre)}</div></div><style>@keyframes crTrophy{0%{transform:scale(.3) rotate(-12deg);opacity:0}100%{transform:scale(1) rotate(0);opacity:1}}</style>`:''}
    </div>
    ${esSeleccion?`<div style="display:inline-flex;align-items:center;gap:6px;background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.4);border-radius:20px;padding:3px 11px;font-size:10.5px;font-weight:900;color:#93c5fd;margin-bottom:9px;">${flagImg(G.pais,14)} SELECCIÓN DE ${esc(G.pais).toUpperCase()}</div>`:''}
    ${cambioAspecto?`<div style="display:inline-flex;align-items:center;gap:5px;background:rgba(167,139,250,.12);border:1px solid rgba(167,139,250,.35);color:#c4b5fd;border-radius:20px;padding:3px 11px;font-size:10.5px;font-weight:800;margin-bottom:9px;"><i class='bx bx-body'></i> Esto te cambió por dentro y por fuera</div>`:''}
    <div style="font-size:15px;color:#fff;font-weight:700;line-height:1.55;margin-bottom:12px;">${esc(resVar)}</div>
    ${chips?`<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:16px;">${chips}</div>`:'<div style="height:6px;"></div>'}
    <button onclick="window._carreraContinuar()" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:13px 28px;font-weight:900;cursor:pointer;">Continuar</button>
  </div>`;
};

// ── CÁRCEL: FINAL ALTERNATIVO (lechón) ─────────────────────────────────────
// Si terminaste preso, se te ofrece un DESAFÍO ÚNICO: en el patio de la cárcel se
// organiza un partido apostando por un lechón. Si ganás la final → salís antes
// (con moral rota) y podés seguir la carrera con handicap. Si perdés → retiro
// forzado con etiqueta CÁRCEL en el resumen final tipo Copero.
function _carreraCarcel(motivo){
  const m = document.getElementById('carrera-modal') || overlay();
  const titulo = motivo === 'soborno' ? 'PRESO POR SOBORNO' : 'PRESO POR ESCÁNDALO';
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:26px 20px calc(30px + env(safe-area-inset-bottom));min-height:100%;">
    <div style="text-align:center;">
      <div style="width:96px;height:96px;border-radius:50%;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.4);display:flex;align-items:center;justify-content:center;margin:8px auto 14px;"><i class='bx bx-lock-alt' style="font-size:52px;color:#ef4444;"></i></div>
      <div style="font-size:11px;font-weight:900;letter-spacing:3px;color:#ef4444;">${titulo}</div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:26px;color:#fff;line-height:1.15;margin-top:6px;">Se acabó todo — ¿o no?</div>
      <div style="font-size:13.5px;color:#c4ccc0;line-height:1.55;margin:14px 6px 22px;">${motivo==='soborno' ? 'Cayeron todos los del entramado. Tu carrera y tu nombre están en el barro.' : 'La causa judicial no perdona. Adiós al fútbol profesional.'}</div>
    </div>
    <div style="background:linear-gradient(160deg,rgba(250,204,21,.10),rgba(20,22,18,.6));border:1px solid rgba(250,204,21,.28);border-radius:16px;padding:18px;margin-bottom:14px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        <i class='bx bxs-pizza' style="font-size:32px;color:#facc15;"></i>
        <div>
          <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:15px;color:#fff;">El clásico del patio por un lechón</div>
          <div style="font-size:11.5px;color:#c4ccc0;">Los presos organizan un partido. El equipo que gana la final se lleva un lechón entero y el ganador clave zafa antes por buena conducta.</div>
        </div>
      </div>
      <button onclick="window._carreraLechon()" style="width:100%;background:linear-gradient(135deg,#facc15,#f59e0b);color:#000;border:none;border-radius:13px;padding:15px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;box-shadow:0 8px 24px rgba(250,204,21,.25);">JUGAR LA FINAL POR EL LECHÓN <i class='bx bx-right-arrow-alt'></i></button>
    </div>
    <button onclick="window._carreraRetiroForzado()" style="width:100%;background:rgba(239,68,68,.08);color:#f87171;border:1px solid rgba(239,68,68,.3);border-radius:13px;padding:13px;font-weight:800;font-size:13px;cursor:pointer;">Aceptar el fin — retiro forzado</button>
  </div>`;
}
window._carreraLechon = function(){
  // Chance de ganar la final: depende de tu nivel actual (skill sigue estando).
  const gana = Math.random() < clamp((G.nivel-45)/70, 0.15, 0.75);
  const m = document.getElementById('carrera-modal') || overlay();
  if (gana) {
    // Salís antes: se registra el hecho en la vitrina como "logro atípico" y podés
    // seguir jugando (con handicap: -15 fama, -10 nivel, dinero a 0).
    G.nivel = Math.max(35, G.nivel - 10);
    G.fama = Math.max(0, G.fama - 15);
    G.dinero = 0;
    if(!G.vitrina) G.vitrina=[];
    G.vitrina.push({ nombre:'Final del lechón (cárcel)', edad:G.edad, club:'Patio', img:'champions' });
    G.titulos = (G.titulos||0) + 1;
    G.carcelPasada = true;
    save();
    m.innerHTML = `
      <div style="max-width:520px;margin:0 auto;padding:60px 22px 30px;text-align:center;">
        <div style="width:100px;height:100px;border-radius:50%;background:rgba(250,204,21,.15);border:1px solid rgba(250,204,21,.4);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;"><i class='bx bxs-pizza' style="font-size:56px;color:#facc15;"></i></div>
        <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:26px;color:#fff;">¡GANASTE EL LECHÓN!</div>
        <div style="font-size:14px;color:#c4ccc0;margin:12px 0 26px;line-height:1.55;">Salís antes por buena conducta. Volvés al fútbol con la ropa rota y todo por reconstruir. El barrio te espera.</div>
        <button onclick="window._carreraHub()" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:14px 30px;font-weight:900;cursor:pointer;font-family:Outfit,sans-serif;">Seguir carrera <i class='bx bx-right-arrow-alt'></i></button>
      </div>`;
  } else {
    // Perdiste la final → retiro forzado.
    m.innerHTML = `
      <div style="max-width:520px;margin:0 auto;padding:60px 22px 30px;text-align:center;">
        <div style="width:100px;height:100px;border-radius:50%;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.4);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;"><i class='bx bx-sad' style="font-size:56px;color:#ef4444;"></i></div>
        <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:24px;color:#fff;">Perdieron la final</div>
        <div style="font-size:14px;color:#c4ccc0;margin:12px 0 26px;line-height:1.55;">Sin lechón, sin salida anticipada. Cumplís condena entera y el fútbol te suelta la mano. Te retirás desde la cárcel.</div>
        <button onclick="window._carreraRetiroForzado()" style="background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.3);border-radius:13px;padding:14px 30px;font-weight:900;cursor:pointer;font-family:Outfit,sans-serif;">Ver mi vida <i class='bx bx-right-arrow-alt'></i></button>
      </div>`;
  }
};
window._carreraRetiroForzado = function(){
  G.retiroForzado = true;
  G.years = G.temporada; // corta la carrera acá
  save();
  retiro();
};

// ── PEDIR SALIDA DEL CLUB ──────────────────────────────────────────────────────
// Genera hasta 4 ofertas de clubes que te quieran (mejor liga o similar) para irse
// en el mercado. Antes te quedabas atado si no salía oferta random — ahora vos
// decidís cuándo golpear la puerta y buscarte un nuevo destino.
window._carreraPedirSalida = function(){
  if(!G) G=load(); if(!G) return;
  // Todos los clubes distintos al actual que te "aguantan" (no mucho abajo de tu nivel).
  const candidatos = todosClubs().filter(c => {
    if (c.name === G.club) return false;
    if (G.nivel < c.str - 12) return false;
    if (c.str > 82 && G.edad > 32 && G.nivel < 88) return false;
    return true;
  });
  if(!candidatos.length){ if(window.showToast) window.showToast('Ningún club te está mirando ahora. Rendí más una temporada.', 'info'); return; }
  const shuffled = shuffle(candidatos);
  const seen={}; const picks=[];
  for(const c of shuffled){ if(seen[c.name])continue; seen[c.name]=1; picks.push(c); if(picks.length>=4)break; }
  G._offers = picks.map(ofertaDe);
  // EFECTO MARIPOSA REAL: pedir salida es un acto público. La dirigencia y la
  // hinchada se enteran. Si después te quedás, NO es "como si nada": quedás
  // marcado, perdés lugar en el equipo y la gente te lo cobra.
  if(!G.flags) G.flags = {};
  G.flags.pidioSalida = true;
  G.moral = clamp((G.moral||60)-6, 0, 100);
  if(!G.idolatria) G.idolatria = {};
  G.idolatria[G.club] = clamp((G.idolatria[G.club]||0) - 25, -100, 100);
  save();
  const m = overlay();
  m.innerHTML = `
    <div style="max-width:560px;margin:0 auto;padding:22px 18px calc(30px + env(safe-area-inset-bottom));">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <button onclick="window._carreraHub()" style="background:rgba(255,255,255,.06);border:none;color:#aaa;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;"><i class='bx bx-arrow-back'></i></button>
        <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:19px;color:#fff;">Pediste salir del club</div>
      </div>
      <div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:13px;padding:12px 14px;margin-bottom:14px;font-size:12.5px;color:#f8b4b4;line-height:1.5;">
        <b style="color:#f87171;">Ya no hay vuelta atrás.</b> Se filtró a la prensa que querés irte de ${esc(G.club)}. La hinchada te silba y la dirigencia te bajó del proyecto. Si al final te quedás, va a ser desde el banco.
      </div>
      <div id="cr-evwrap"></div>
    </div>`;
  setTimeout(()=>mostrarOfertas('transfer'), 60);
};

// ── MIS BIENES: comprar/vender con el capital acumulado ────────────────────────
// Ítems tienen precio, efecto en fama/moral/valor y valor de reventa. Podés vender
// para recuperar 60-80% del precio original.
// `mant` = costo de mantenimiento ANUAL. Los lujos drenan plata todos los años;
// los negocios (renta) la generan. Un yate sin sueldo que lo banque te funde.
const BIENES = [
  { id:'auto',        n:'Auto de lujo',          i:'bx-car',         p:120000,  fama:8,  moral:2,  mant:9000 },
  { id:'casa',        n:'Casa premium',          i:'bx-home',        p:600000,  fama:6,  moral:8,  mant:28000 },
  { id:'yate',        n:'Yate',                  i:'bxs-ship',       p:1500000, fama:20, moral:5,  mant:180000 },
  { id:'avion',       n:'Avión privado',         i:'bx-plane-alt',   p:5000000, fama:35, moral:3,  mant:700000 },
  { id:'reloj',       n:'Reloj de colección',    i:'bx-time-five',   p:80000,   fama:5,  moral:1,  mant:1500 },
  { id:'restaurante', n:'Restaurante propio',    i:'bx-restaurant',  p:400000,  fama:6,  moral:5,  renta:60000, mant:22000 },
  { id:'escuela',     n:'Escuela de fútbol',     i:'bx-award',       p:250000,  fama:10, moral:12, renta:40000, mant:12000 },
  { id:'fundacion',   n:'Fundación benéfica',    i:'bxs-donate-heart', p:200000, fama:15, moral:20, mant:35000 }
];
function bienByld(id){ return BIENES.find(b=>b.id===id); }

// ── MOTOR FINANCIERO ──────────────────────────────────────────────────────────
// Cada temporada: cobrás sueldo + rentas + sponsors, y pagás mantenimiento de tus
// lujos + tren de vida (escala con tu fama) + impuestos. Si gastás más de lo que
// entra, te fundís y te obligan a vender. La plata dejó de ser decorativa.
function trenDeVida(){
  // Un ídolo mundial no vive como un juvenil: entorno, seguridad, viajes, familia.
  const f = G.fama || 0;
  const base = 8000 + (G.sueldo||0) * 0.18;      // vivís acorde a lo que ganás
  return Math.round(base * (1 + f/90));
}
function balanceAnual(){
  const sueldo = G.sueldo || 0;
  const rentas = (G.bienes||[]).reduce((s,b)=>{ const B=bienByld(b.id); return s+((B&&B.renta)?B.renta:0); },0);
  // Sponsors: solo si tenés fama real. Escala fuerte arriba de 60.
  const sponsors = G.fama >= 25 ? Math.round((G.fama-20) * (G.fama>=60?2600:900)) : 0;
  const mant = (G.bienes||[]).reduce((s,b)=>{ const B=bienByld(b.id); return s+((B&&B.mant)?B.mant:0); },0);
  const vida = trenDeVida();
  const impuestos = Math.round((sueldo + sponsors) * 0.30);
  const ingresos = sueldo + rentas + sponsors;
  const egresos = mant + vida + impuestos;
  return { sueldo, rentas, sponsors, mant, vida, impuestos, ingresos, egresos, neto: ingresos - egresos };
}
// Portfolio de inversiones: crece (o se hunde) SOLO, año a año, según el perfil.
const PERFILES_INV = {
  conservador: { n:'Plazo fijo', i:'bx-lock-alt',    min:0.01, max:0.06, riesgo:'Bajo',  col:'#4fc3f7' },
  moderado:    { n:'Fondo mixto', i:'bx-line-chart', min:-0.12, max:0.22, riesgo:'Medio', col:'#facc15' },
  agresivo:    { n:'Cripto y startups', i:'bx-rocket', min:-0.55, max:0.95, riesgo:'Alto', col:'#ef4444' }
};
function rendirInversiones(){
  if(!G.inversiones || !G.inversiones.monto) return null;
  const P = PERFILES_INV[G.inversiones.perfil] || PERFILES_INV.moderado;
  const roi = rnd(P.min, P.max);
  const antes = G.inversiones.monto;
  G.inversiones.monto = Math.max(0, Math.round(antes * (1 + roi)));
  G.inversiones.hist = (G.inversiones.hist||[]).concat([{ edad:G.edad, roi:+(roi*100).toFixed(1) }]).slice(-25);
  return { roi:+(roi*100).toFixed(1), antes, ahora:G.inversiones.monto, perfil:P.n, col:P.col };
}
window._carreraBienes = function(){
  if(!G) G=load(); if(!G) return;
  if(!G.bienes) G.bienes = [];
  const rentaTotal = G.bienes.reduce((s,b)=>{ const B=bienByld(b.id); return s+((B&&B.renta)?B.renta:0); },0);
  const m = overlay();
  m.innerHTML = `
    <div style="max-width:560px;margin:0 auto;padding:22px 18px calc(30px + env(safe-area-inset-bottom));">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <button onclick="window._carreraHub()" style="background:rgba(255,255,255,.06);border:none;color:#aaa;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;"><i class='bx bx-arrow-back'></i></button>
        <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:19px;color:#fff;">Mis bienes</div>
      </div>
      <div style="background:linear-gradient(160deg,rgba(250,204,21,.12),rgba(20,22,18,.5));border:1px solid rgba(250,204,21,.28);border-radius:14px;padding:14px 16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
        <div><div style="font-size:10px;color:#a89060;font-weight:800;letter-spacing:1px;">CAPITAL</div><div style="font-size:22px;font-weight:900;color:#facc15;">${eur(G.dinero||0)}</div></div>
        ${rentaTotal>0?`<div style="text-align:right;"><div style="font-size:10px;color:#a89060;font-weight:800;letter-spacing:1px;">RENTA/AÑO</div><div style="font-size:16px;font-weight:900;color:#22c55e;">+${eur(rentaTotal)}</div></div>`:''}
      </div>
      ${(function(){ const b=balanceAnual(); const p=b.neto>=0; return `<div style="background:#0d100d;border:1px solid ${p?'#1c2a1c':'rgba(239,68,68,.35)'};border-radius:14px;padding:13px 15px;margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><div style="font-size:10px;color:#8a8f96;font-weight:900;letter-spacing:1px;">FLUJO ANUAL</div><div style="font-size:16px;font-weight:900;color:${p?'#4ade80':'#ff6b6b'};">${p?'+':'−'}${eur(Math.abs(b.neto))}/año</div></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 12px;font-size:10.5px;">
          <div style="display:flex;justify-content:space-between;color:#777;"><span>Sueldo</span><b style="color:#4ade80;">+${eur(b.sueldo)}</b></div>
          <div style="display:flex;justify-content:space-between;color:#777;"><span>Tren de vida</span><b style="color:#ff6b6b;">−${eur(b.vida)}</b></div>
          <div style="display:flex;justify-content:space-between;color:#777;"><span>Sponsors</span><b style="color:#4ade80;">+${eur(b.sponsors)}</b></div>
          <div style="display:flex;justify-content:space-between;color:#777;"><span>Mantenimiento</span><b style="color:#ff6b6b;">−${eur(b.mant)}</b></div>
          <div style="display:flex;justify-content:space-between;color:#777;"><span>Rentas</span><b style="color:#4ade80;">+${eur(b.rentas)}</b></div>
          <div style="display:flex;justify-content:space-between;color:#777;"><span>Impuestos</span><b style="color:#ff6b6b;">−${eur(b.impuestos)}</b></div>
        </div>
        ${!p?`<div style="margin-top:9px;font-size:11px;color:#f87171;line-height:1.4;"><i class='bx bx-error'></i> Gastás más de lo que ganás. Vendé algún lujo o conseguí un contrato mejor.</div>`:''}
      </div>`; })()}
      <div style="font-size:11px;color:#9aa0a6;font-weight:800;letter-spacing:1px;margin:6px 0 8px;">INVERSIONES</div>
      ${(function(){
        const I = G.inversiones;
        if(I && I.monto){
          const P = PERFILES_INV[I.perfil]||PERFILES_INV.moderado;
          const h = (I.hist||[]).slice(-6);
          return `<div style="background:#0d100d;border:1px solid ${P.col}44;border-radius:12px;padding:13px 15px;margin-bottom:7px;">
            <div style="display:flex;align-items:center;gap:11px;margin-bottom:8px;">
              <i class='bx ${P.i}' style="font-size:26px;color:${P.col};"></i>
              <div style="flex:1;"><div style="font-size:13.5px;font-weight:900;color:#fff;">${P.n}</div><div style="font-size:10.5px;color:#666;">Riesgo ${P.riesgo} · rinde solo cada temporada</div></div>
              <div style="text-align:right;"><div style="font-size:17px;font-weight:900;color:${P.col};">${eur(I.monto)}</div></div>
            </div>
            ${h.length?`<div style="display:flex;gap:4px;align-items:flex-end;height:26px;margin-bottom:8px;">${h.map(x=>`<div title="${x.edad} años: ${x.roi}%" style="flex:1;height:${Math.min(100,Math.abs(x.roi)*2+8)}%;background:${x.roi>=0?'#4ade80':'#ff6b6b'};border-radius:2px;opacity:.75;"></div>`).join('')}</div>`:''}
            <div style="display:flex;gap:7px;">
              <button onclick="window._carreraInvertirMas()" style="flex:1;background:${P.col}1a;color:${P.col};border:1px solid ${P.col}55;border-radius:10px;padding:8px;font-weight:800;font-size:11px;cursor:pointer;">Poner más</button>
              <button onclick="window._carreraRetirarInv()" style="flex:1;background:rgba(255,255,255,.05);color:#aaa;border:1px solid #2a2a2a;border-radius:10px;padding:8px;font-weight:800;font-size:11px;cursor:pointer;">Retirar todo</button>
            </div>
          </div>`;
        }
        return `<div style="background:#0d100d;border:1px solid #1c1c1c;border-radius:12px;padding:13px 15px;margin-bottom:7px;">
          <div style="font-size:12px;color:#c4ccc0;line-height:1.5;margin-bottom:10px;">Poné a trabajar tu plata. Rinde (o se hunde) solo cada temporada según el perfil que elijas.</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">
            ${Object.keys(PERFILES_INV).map(k=>{ const P=PERFILES_INV[k]; return `<button onclick="window._carreraAbrirInv('${k}')" style="background:#111;border:1px solid ${P.col}44;border-radius:10px;padding:11px 6px;cursor:pointer;text-align:center;">
              <i class='bx ${P.i}' style="font-size:20px;color:${P.col};display:block;margin-bottom:4px;"></i>
              <div style="font-size:11px;font-weight:900;color:#fff;line-height:1.2;">${P.n}</div>
              <div style="font-size:9px;color:${P.col};margin-top:3px;font-weight:800;">Riesgo ${P.riesgo}</div>
            </button>`; }).join('')}
          </div>
        </div>`;
      })()}
      ${(function(){
        // El avatar posando en su patrimonio: la escena cambia según lo que tenga.
        const tiene = id => (G.bienes||[]).some(b=>b.id===id);
        const escena = tiene('avion') ? 'oficina' : tiene('casa') ? 'casa' : tiene('yate') ? 'noche' : tiene('escuela') ? 'potrero' : 'cancha';
        const pose = (G.bienes||[]).length >= 3 ? 'rico' : (G.bienes||[]).length ? 'orgullo' : 'pensando';
        const props = [];
        if (tiene('casa'))        props.push(['bx-home','Su casa','#f59e0b']);
        if (tiene('auto'))        props.push(['bx-car','Su auto','#60a5fa']);
        if (tiene('yate'))        props.push(['bxs-ship','Su yate','#22d3ee']);
        if (tiene('avion'))       props.push(['bx-plane-alt','Su avión','#a78bfa']);
        if (tiene('reloj'))       props.push(['bx-time-five','Su reloj','#facc15']);
        if (tiene('restaurante')) props.push(['bx-restaurant','Su restaurante','#f97316']);
        if (tiene('escuela'))     props.push(['bx-award','Su escuela','#22c55e']);
        if (tiene('fundacion'))   props.push(['bxs-donate-heart','Su fundación','#f472b6']);
        return `<div style="display:flex;align-items:center;gap:14px;background:#0d100d;border:1px solid #1c211a;border-radius:14px;padding:12px;margin-bottom:14px;">
          ${avatarBox(avatarDeG(2.4, pose), '8px 12px', escena)}
          <div style="flex:1;min-width:0;">
            <div style="font-size:12.5px;font-weight:900;color:#fff;">${props.length?'Tu patrimonio':'Todavía sin nada propio'}</div>
            <div style="font-size:11px;color:#7a8070;margin-top:2px;line-height:1.4;">${props.length?'Esto es lo que construiste con el fútbol.':'Comprá tu primera propiedad y vas a verte distinto acá.'}</div>
            ${props.length?`<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:7px;">${props.map(p=>`<span style="display:inline-flex;align-items:center;gap:4px;background:${p[2]}14;border:1px solid ${p[2]}44;color:${p[2]};border-radius:20px;padding:3px 9px;font-size:10px;font-weight:800;"><i class='bx ${p[0]}'></i>${p[1]}</span>`).join('')}</div>`:''}
          </div>
        </div>`;
      })()}
      <div style="font-size:11px;color:#9aa0a6;font-weight:800;letter-spacing:1px;margin:18px 0 8px;">TUS PERTENENCIAS (${G.bienes.length})</div>
      ${G.bienes.length ? G.bienes.map(b => { const B=bienByld(b.id)||{n:b.id,i:'bx-box'}; const reventa=Math.round((b.precio||B.p)*0.65); return `<div style="display:flex;align-items:center;gap:12px;background:#0d100d;border:1px solid #1c1c1c;border-radius:12px;padding:11px 13px;margin-bottom:7px;">
        <i class='bx ${B.i}' style="font-size:26px;color:#facc15;"></i>
        <div style="flex:1;min-width:0;"><div style="font-size:13.5px;font-weight:900;color:#fff;">${esc(B.n)}</div><div style="font-size:10.5px;color:#666;">Comprado a ${eur(b.precio||B.p)}${B.renta?' · Renta '+eur(B.renta)+'/año':''}</div></div>
        <button onclick="window._carreraVender('${b.id}',${reventa})" style="background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:7px 12px;font-weight:800;font-size:11px;cursor:pointer;white-space:nowrap;">Vender ${eur(reventa)}</button>
      </div>`; }).join('') : `<div style="padding:20px;text-align:center;color:#666;font-size:12px;background:#0d100d;border:1px solid #1c1c1c;border-radius:12px;">Todavía no compraste nada.</div>`}
      <div style="font-size:11px;color:#9aa0a6;font-weight:800;letter-spacing:1px;margin:18px 0 8px;">TIENDA</div>
      ${BIENES.map(B => { const own = G.bienes.some(b=>b.id===B.id); const puedo = (G.dinero||0) >= B.p; return `<div style="display:flex;align-items:center;gap:12px;background:#0d100d;border:1px solid #1c1c1c;border-radius:12px;padding:11px 13px;margin-bottom:7px;${own?'opacity:.55':''}">
        <i class='bx ${B.i}' style="font-size:26px;color:${A};"></i>
        <div style="flex:1;min-width:0;"><div style="font-size:13.5px;font-weight:900;color:#fff;">${esc(B.n)}</div><div style="font-size:10.5px;color:#8a8f96;">${B.fama?'+':''}${B.fama} fama · ${B.moral?'+':''}${B.moral} moral</div><div style="font-size:10.5px;margin-top:1px;">${B.renta?`<span style="color:#4ade80;font-weight:800;">+${eur(B.renta)}/año</span> `:''}${B.mant?`<span style="color:#ff6b6b;font-weight:800;">−${eur(B.mant)}/año mant.</span>`:''}</div></div>
        <button ${own||!puedo?'disabled':''} onclick="window._carreraComprar('${B.id}')" style="background:${own?'transparent':puedo?A:'rgba(255,255,255,.05)'};color:${own?'#666':puedo?'#000':'#666'};border:${own?'1px solid #2a2a2a':'none'};border-radius:10px;padding:7px 12px;font-weight:900;font-size:11px;cursor:${own||!puedo?'default':'pointer'};white-space:nowrap;">${own?'TENÉS':eur(B.p)}</button>
      </div>`; }).join('')}
    </div>`;
};
// ── INVERSIONES: abrir / ampliar / retirar ────────────────────────────────────
function _invPrompt(titulo, max, cb){
  const v = prompt(titulo + '\nDisponible: ' + eur(max) + '\n\nMonto a invertir (€):', String(Math.round(max*0.3)));
  if(v===null) return;
  const n = Math.round(parseFloat(String(v).replace(/[^\d.]/g,'')) || 0);
  if(!n || n<1000){ if(window.showToast) window.showToast('Mínimo €1.000', 'warning'); return; }
  if(n > max){ if(window.showToast) window.showToast('No te alcanza.', 'warning'); return; }
  cb(n);
}
window._carreraAbrirInv = function(perfil){
  if(!G) return;
  const P = PERFILES_INV[perfil]; if(!P) return;
  _invPrompt('Abrir posición en ' + P.n + ' (riesgo ' + P.riesgo + ')', G.dinero||0, function(n){
    G.dinero -= n;
    G.inversiones = { perfil, monto:n, hist:[] };
    save(); window._carreraBienes();
  });
};
window._carreraInvertirMas = function(){
  if(!G || !G.inversiones) return;
  const P = PERFILES_INV[G.inversiones.perfil] || PERFILES_INV.moderado;
  _invPrompt('Agregar capital a ' + P.n, G.dinero||0, function(n){
    G.dinero -= n; G.inversiones.monto += n;
    save(); window._carreraBienes();
  });
};
window._carreraRetirarInv = function(){
  if(!G || !G.inversiones || !G.inversiones.monto) return;
  G.dinero = (G.dinero||0) + G.inversiones.monto;
  G.inversiones = null;
  save(); window._carreraBienes();
};
window._carreraComprar = function(id){
  const B = bienByld(id); if(!B||!G) return;
  if((G.dinero||0) < B.p){ if(window.showToast) window.showToast('No te alcanza.', 'warning'); return; }
  if(!G.bienes) G.bienes = [];
  if(G.bienes.some(x=>x.id===id)){ return; }
  G.dinero -= B.p; G.bienes.push({ id, precio:B.p });
  G.fama = clamp((G.fama||0) + (B.fama||0), 0, 100);
  G.moral = clamp((G.moral||0) + (B.moral||0), 0, 100);
  // Aviso si el bien te deja en flujo negativo (los lujos cuestan todos los años).
  if (B.mant && window.showToast) {
    const b = balanceAnual();
    if (b.neto < 0) showToast('Ojo: ahora gastás ' + eur(Math.abs(b.neto)) + ' más de lo que ganás por año.', 'warning');
  }
  save(); window._carreraBienes();
};
window._carreraVender = function(id, reventa){
  if(!G||!G.bienes) return;
  const idx = G.bienes.findIndex(x=>x.id===id); if(idx<0) return;
  const B = bienByld(id) || {};
  G.bienes.splice(idx, 1); G.dinero = (G.dinero||0) + reventa;
  // Perder lo que aportaba en fama/moral (a la mitad, no revierte al 100%).
  G.fama = clamp((G.fama||0) - Math.round((B.fama||0)/2), 0, 100);
  G.moral = clamp((G.moral||0) - Math.round((B.moral||0)/2), 0, 100);
  save(); window._carreraBienes();
};

// ── RESUMEN FINAL TIPO COPERO ──────────────────────────────────────────────────
// Pantalla de retiro: hero con camiseta + país, honores, stats totales, vitrina
// de trofeos (imagen real), timeline por temporada con escudo real del club y sus
// stats. Todo scrolleable, con animación de entrada.
// EL HOMENAJE SE VE. Antes el partido despedida era un párrafo dentro de la
// ficha final: lo más emotivo de la carrera pasaba como una línea de texto.
// Ahora hay una escena propia, con el estadio, la gente y vos saludando, y
// recién después llega el resumen.
function homenajeEscena(){
  const m = document.getElementById('carrera-modal') || overlay();
  const H = clubMasJugado();
  const sel = 'Selección de ' + (G.pais || 'Uruguay');
  const publico = clamp(28000 + (G.titulos||0)*6000 + Math.round((G.nivelMax||G.nivel||60)*280), 12000, 85000);
  const kb = kitOf(G.pais || 'Uruguay');
  m.innerHTML = `
  <div style="min-height:100%;background:radial-gradient(120% 80% at 50% 0%, #1a2a12 0%, #05070a 62%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:26px 18px calc(28px + env(safe-area-inset-bottom));box-sizing:border-box;text-align:center;">
    <div style="font-size:10px;font-weight:900;letter-spacing:2.6px;color:#facc15;margin-bottom:8px;">TU PARTIDO DESPEDIDA</div>
    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:26px;color:#fff;line-height:1.15;margin-bottom:6px;">${esc(H.club)} &nbsp;vs&nbsp; ${esc(sel)}</div>
    <div style="font-size:12.5px;color:#8d9782;font-weight:700;margin-bottom:16px;">${esc(estadioDe(G.pais, G.apellido))} · ${publico.toLocaleString('es')} personas</div>
    <div style="display:flex;justify-content:center;margin-bottom:18px;">
      ${avatarBox(avatarSprite(G.avatar||avatarDefault(), { edad:(G.edad||34), kitBase:kb[0], kitTxt:kb[1], num:G.num||10, apellido:G.apellido||'', escala:3, pose:'orgullo' }), '16px 26px', 'estadio')}
    </div>
    <div style="max-width:440px;font-size:14px;color:#d8dfcd;line-height:1.7;margin-bottom:22px;">
      Saliste a los veinte minutos. El estadio entero se puso de pie y no se sentó hasta que llegaste al túnel.
      Tu camiseta colgada del alambrado, tus hijos en el círculo central, y cuarenta mil personas cantando tu apellido.
      Levantaste la mano una vez. Alcanzó.
    </div>
    <button onclick="window._lyHomenajeSeguir()" style="width:100%;max-width:360px;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:14px;padding:15px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;">VER MI CARRERA <i class='bx bx-right-arrow-alt'></i></button>
  </div>`;
}
window._lyHomenajeSeguir = function(){ if(G) G._homenajeVisto = true; retiro(); };
function retiro(){
  const m=document.getElementById('carrera-modal')||overlay();
  // Primero la escena, una sola vez.
  if (G && !G._homenajeVisto && G.tot && (G.timeline||[]).length){ homenajeEscena(); return; }
  try{ saveCareer(G); }catch(e){}
  const nivelF = Math.round(G.nivel);
  const anios = (G.timeline||[]).length || G.years || 0;
  const promedio = G.tot.pj>0 ? ((G.tot.g/G.tot.pj)*100).toFixed(0) : 0;   // goles/100PJ
  const leyenda = G.titulos>=8 || nivelF>=88;
  const grande  = G.titulos>=4 || nivelF>=80;
  // Retiro forzado por cárcel → rango especial ROJO, y honor CARCELARIO en el resumen.
  const preso   = !!G.retiroForzado;
  const rangoTxt = preso ? 'RETIRO EN LA CÁRCEL' : leyenda ? 'LEYENDA DEL FÚTBOL' : (grande?'GRAN CARRERA':'CARRERA COMPLETA');
  const rangoColor = preso ? '#ef4444' : leyenda ? '#facc15' : grande ? A : '#94a3b8';
  const rangoIcon = preso ? 'bx-lock-alt' : leyenda ? 'bx-crown' : grande ? 'bx-medal' : 'bx-shield';
  const scoreN = careerScore(G);
  // Honores adicionales (badges dinámicos)
  const honores = [];
  if (G.tot.g >= 200) honores.push({i:'bx-football', c:'#22c55e', t:'+200 goles'});
  if (G.tot.a >= 100) honores.push({i:'bx-target-lock', c:'#22d3ee', t:'+100 asist.'});
  if (G.titulos >= 10) honores.push({i:'bx-crown', c:'#facc15', t:'Multicampeón'});
  if (anios >= 18)    honores.push({i:'bx-time', c:'#a78bfa', t:'Longevidad'});
  if (nivelF >= 90)   honores.push({i:'bxs-star', c:'#f59e0b', t:'Élite mundial'});
  if (G.tot.pj >= 400) honores.push({i:'bx-calendar-check', c:'#60a5fa', t:'+400 PJ'});
  if (G.carcelPasada) honores.push({i:'bxs-pizza', c:'#facc15', t:'Ganó el lechón'});
  if (preso) honores.push({i:'bx-lock-alt', c:'#ef4444', t:'Pasó por la cárcel'});
  // Vitrina: agrupa por trofeo y cuenta (Champions ×2, etc.)
  const grupTrof = {};
  (G.vitrina||[]).forEach(v=>{ const k=v.nombre; grupTrof[k]=(grupTrof[k]||{n:v.nombre,slug:trofeoImgSlug(v.nombre),count:0,clubes:[]}); grupTrof[k].count++; if(v.club) grupTrof[k].clubes.push({club:v.club, edad:v.edad}); });
  const trofArr = Object.values(grupTrof).sort((a,b)=>b.count-a.count);
  // Timeline: fila por temporada
  const timelineHtml = (G.timeline||[]).slice().reverse().map(t=>{
    const tit = t.titulo ? `<div style="display:inline-flex;align-items:center;gap:4px;background:rgba(250,204,21,.14);border:1px solid rgba(250,204,21,.35);color:#facc15;border-radius:8px;padding:2px 8px;font-size:10px;font-weight:800;margin-top:3px;"><i class='bx bx-trophy'></i>${esc(t.titulo)}</div>`:'';
    const mv  = t.move ? `<div style="display:inline-flex;align-items:center;gap:4px;background:${t.move.tipo==='asc'?'rgba(34,197,94,.14)':'rgba(239,68,68,.14)'};border:1px solid ${t.move.tipo==='asc'?'rgba(34,197,94,.4)':'rgba(239,68,68,.4)'};color:${t.move.tipo==='asc'?'#22c55e':'#ef4444'};border-radius:8px;padding:2px 8px;font-size:10px;font-weight:800;margin-top:3px;margin-left:${t.titulo?'4px':'0'};"><i class='bx ${t.move.tipo==='asc'?'bx-up-arrow-alt':'bx-down-arrow-alt'}'></i>${t.move.tipo==='asc'?'Ascenso':'Descenso'}</div>`:'';
    return `<div style="display:flex;align-items:center;gap:11px;padding:10px 4px;border-bottom:1px solid #141614;">
      ${clubBadge(t.club, 38)}
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:10px;color:#666;font-weight:800;">${t.edad} años</span>
          <span style="font-size:13.5px;color:#fff;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(t.club)}</span>
        </div>
        <div style="font-size:11px;color:#aaa;margin-top:2px;">Nv <b style="color:#fff;">${t.niv}</b> · ${t.pj} PJ · <b style="color:${A};">${t.g}</b>G · ${t.a}A</div>
        ${tit}${mv}
      </div>
    </div>`;
  }).join('');
  // Camiseta grande al centro (con país)
  const jerseyHtml = jerseyKit(140, G.apellido, G.num, kitClub(G.club, G.clubPais||G.pais));
  m.innerHTML = `
  <style>@keyframes crFadeUp{0%{transform:translateY(18px);opacity:0}100%{transform:none;opacity:1}}
   .cr-fade{animation:crFadeUp .6s cubic-bezier(.2,1,.3,1) both}
   .cr-fade-d1{animation-delay:.12s}.cr-fade-d2{animation-delay:.24s}.cr-fade-d3{animation-delay:.36s}.cr-fade-d4{animation-delay:.48s}</style>
  <div style="max-width:640px;margin:0 auto;padding:24px 18px calc(40px + env(safe-area-inset-bottom));min-height:100%;">
    ${(!G.segundaVida && G.alcance !== 'carrera') ? `
    <!-- ELECCIÓN DE SEGUNDA VIDA — cada camino se explica, con su color y lo que
         mide. Antes eran seis botones iguales con un icono y no se entendia en
         que se diferenciaban. -->
    <div class="cr-fade" style="background:linear-gradient(160deg,rgba(167,139,250,.12),rgba(20,22,18,.5));border:1.5px solid rgba(167,139,250,.4);border-radius:18px;padding:17px;margin-bottom:16px;">
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:19px;color:#fff;text-align:center;">Se acabó el fútbol. Ahora, ¿qué?</div>
      <div style="font-size:12.5px;color:#c4ccc0;text-align:center;margin:6px 0 14px;line-height:1.55;">Elegí un camino y vivilo hasta los ${VIDA_LAPSOS[VIDA_LAPSOS.length-1].a}: caminás tu casa, tu barrio y tu laburo, hablás con la gente y decidís.</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${['dt','comentarista','escuela','disfrutar'].map(id=>{
          const R = VIDA_ROLES[id];
          const mide = R.barras.filter(b=>b[1]!=='salud').map(b=>b[0].toLowerCase()).join(' · ');
          return `<button onclick="window._carreraSegundaVida('${id}')" style="width:100%;display:flex;align-items:center;gap:12px;background:linear-gradient(160deg,${R.color}12,rgba(13,16,13,.7));border:1.5px solid ${R.color}3a;border-radius:14px;padding:13px 14px;color:#fff;cursor:pointer;text-align:left;" onmouseover="this.style.borderColor='${R.color}'" onmouseout="this.style.borderColor='${R.color}3a'">
            <div style="width:42px;height:42px;flex-shrink:0;border-radius:11px;background:${R.color}1e;border:1px solid ${R.color}55;display:flex;align-items:center;justify-content:center;">
              <i class='bx ${R.icon}' style="font-size:23px;color:${R.color};"></i>
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:15px;color:${R.color};line-height:1.2;">${R.n}</div>
              <div style="font-size:11.5px;color:#b3bda8;margin-top:4px;line-height:1.45;">${esc(R.intro)}</div>
              <div style="font-size:9.5px;color:#6f7a65;font-weight:800;letter-spacing:.6px;margin-top:5px;text-transform:uppercase;">Se mide por: ${esc(mide)}</div>
            </div>
            <i class='bx bx-chevron-right' style="font-size:22px;color:${R.color};flex-shrink:0;"></i>
          </button>`;
        }).join('')}
      </div>
    </div>` : ''}
    ${(G.alcance === 'carrera' && !G.segundaVida) ? `
    <div class="cr-fade" style="background:linear-gradient(160deg,rgba(79,195,247,.1),rgba(20,22,18,.5));border:1.5px solid rgba(79,195,247,.35);border-radius:16px;padding:15px;margin-bottom:16px;text-align:center;">
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:16px;color:#fff;">Hasta acá llega tu carrera</div>
      <div style="font-size:12.5px;color:#c4ccc0;margin:6px 0 12px;line-height:1.55;">Elegiste jugar solo la carrera del jugador. Si querés seguir con la vida después del retiro, el legado y todo lo demás, podés hacerlo igual.</div>
      <button onclick="window._lySeguirVida()" style="width:100%;background:rgba(255,255,255,.06);border:1px solid #2a3222;color:#cfd8c6;border-radius:12px;padding:12px;font-weight:900;font-size:13px;cursor:pointer;">Seguir con la vida después del retiro</button>
    </div>` : ''}
    <!-- HERO -->
    <div class="cr-fade" style="position:relative;background:radial-gradient(120% 90% at 50% 0%,${leyenda?'#3a2a06':'#14340f'} 0%,#0a0c0a 60%);border:1px solid ${rangoColor}55;border-radius:22px;padding:22px 18px 20px;overflow:hidden;text-align:center;">
      <div style="position:absolute;inset:0;background-image:radial-gradient(circle at 20% 20%, ${rangoColor}22, transparent 55%),radial-gradient(circle at 80% 80%, ${rangoColor}22, transparent 55%);pointer-events:none;"></div>
      <div style="position:relative;">
        <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(0,0,0,.35);border:1px solid ${rangoColor}88;border-radius:99px;padding:5px 14px;font-size:11px;font-weight:900;letter-spacing:2px;color:${rangoColor};margin-bottom:14px;"><i class='bx ${rangoIcon}'></i>${rangoTxt}</div>
        <div style="display:flex;align-items:flex-end;justify-content:center;gap:14px;margin-bottom:10px;flex-wrap:wrap;">
          <div style="background:linear-gradient(180deg,#1a2416,#0d120b);border:1px solid #2a3a22;border-radius:14px;padding:12px 16px;">${avatarDeG(4.2)}</div>
          ${jerseyHtml}
        </div>
        <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:30px;color:#fff;letter-spacing:-.5px;">${esc(G.apellido)} <span style="color:${A};">#${G.num}</span></div>
        <div style="font-size:12.5px;color:#c4ccc0;margin-top:4px;display:inline-flex;align-items:center;gap:6px;">${flagImg(G.pais,18)} ${esc(G.pais)} · <span style="color:#888;">${anios} temp. · ${anios+16-G.years+G.years}—</span></div>
      </div>
    </div>

    ${homenajeHTML()}

    <!-- STATS TOTALES -->
    <div class="cr-fade cr-fade-d1" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:16px;">
      ${cell('NIVEL FINAL', nivelF, A)}
      ${cell('TEMPORADAS', anios)}
      ${cell('PARTIDOS', G.tot.pj)}
      ${cell('TÍTULOS', G.titulos, '#facc15')}
    </div>
    <div class="cr-fade cr-fade-d1" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px;">
      ${cell('GOLES', G.tot.g, A)}
      ${cell('ASIST.', G.tot.a, '#22d3ee')}
      ${cell('SCORE', scoreN, '#f59e0b')}
    </div>

    ${seccion('honores','bx-award','RECONOCIMIENTOS','#a78bfa', honores.length?`
      <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;">
      ${honores.map(h=>`<span style="display:inline-flex;align-items:center;gap:5px;background:${h.c}18;border:1px solid ${h.c}55;color:${h.c};border-radius:20px;padding:5px 11px;font-size:11px;font-weight:800;"><i class='bx ${h.i}'></i>${h.t}</span>`).join('')}
    </div>`:'', false, honores.length)}
    <div style="font-size:10.5px;color:#5f6a58;text-align:center;margin-top:14px;margin-bottom:4px;"><i class='bx bx-chevrons-down'></i> Tocá cada sección para abrirla</div>

    <!-- CÓMO CAMBIASTE (evolución del sprite a lo largo de la carrera) -->
    ${(function(){
      const tl = G.timeline || []; if(!tl.length) return '';
      const hitos = [{ edad:12, lbl:'Potrero' }];
      const paso = Math.max(1, Math.floor(tl.length / 4));
      for(let i=0;i<tl.length;i+=paso){ if(hitos.length>=5) break; hitos.push({ edad:tl[i].edad, lbl:tl[i].club }); }
      const ult = tl[tl.length-1];
      if(ult && hitos[hitos.length-1].edad !== ult.edad) hitos.push({ edad:ult.edad, lbl:ult.club });
      const k = KITS[G.clubPais||G.pais] || { t:'solid', c:['#1b7a3e'], txt:'#fff' };
      return seccion('evolucion','bx-git-commit','CÓMO CAMBIASTE',A,`
        <div style="background:linear-gradient(180deg,#141a10,#0a0d08);border:1px solid #1f2a1a;border-radius:14px;padding:14px 10px;display:flex;gap:10px;overflow-x:auto;align-items:flex-end;">
          ${hitos.map(h=>`<div style="flex-shrink:0;text-align:center;min-width:66px;">
              ${avatarSprite(G.avatar, { edad:h.edad, kitBase:k.c[0], kitAlt:k.c[1]||'#fff', kitTxt:k.txt, kitTipo:k.t, num:G.num, escala:2.2, aura:(ult&&h.edad===ult.edad&&(nivelF>=88||G.titulos>=8)) })}
              <div style="font-size:9px;color:#8a9580;font-weight:900;margin-top:5px;">${h.edad} años</div>
              <div style="font-size:8.5px;color:#5c6655;margin-top:1px;max-width:66px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(h.lbl||'')}</div>
            </div>`).join('')}
        </div>`, false); })()}

    <!-- PATRIMONIO FINAL -->
    ${(function(){
      const inv = (G.inversiones&&G.inversiones.monto)||0;
      const bienesVal = (G.bienes||[]).reduce((s,b)=>{ const B=bienByld(b.id)||{}; return s+Math.round((b.precio||B.p||0)*0.65); },0);
      const total = (G.dinero||0) + inv + bienesVal;
      const F = G.flags||{};
      const estado = F.embargo ? ['Embargado','#ef4444','Terminaste con el sueldo embargado.']
        : F.endeudado ? ['Endeudado','#f59e0b','Arrastrás deudas del banco.']
        : total >= 20000000 ? ['Fortuna asegurada','#facc15','No vas a tener que trabajar nunca más.']
        : total >= 3000000 ? ['Bien parado','#22c55e','Tu familia queda cubierta de por vida.']
        : total >= 300000 ? ['Ordenado','#4fc3f7','Ni rico ni pobre. Manejaste bien lo tuyo.']
        : ['Sin colchón','#94a3b8','Ganaste plata pero no queda mucho.'];
      return seccion('patrimonio','bx-wallet','PATRIMONIO AL RETIRO','#facc15',`
        <div style="background:linear-gradient(160deg,rgba(250,204,21,.10),rgba(20,22,18,.6));border:1px solid rgba(250,204,21,.28);border-radius:14px;padding:15px;">
          <div style="text-align:center;margin-bottom:12px;">
            <div style="font-family:Outfit,sans-serif;font-size:30px;font-weight:900;color:#facc15;line-height:1;">${eur(total)}</div>
            <div style="display:inline-flex;align-items:center;gap:5px;margin-top:8px;background:${estado[1]}18;border:1px solid ${estado[1]}55;color:${estado[1]};border-radius:20px;padding:4px 12px;font-size:11px;font-weight:800;">${estado[0]}</div>
            <div style="font-size:11.5px;color:#9aa0a6;margin-top:6px;">${estado[2]}</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;">
            ${cell('EFECTIVO', eur(G.dinero||0), '#4ade80')}
            ${cell('INVERSIONES', eur(inv), '#4fc3f7')}
            ${cell('BIENES', eur(bienesVal), '#a78bfa')}
          </div>
          ${(G.bienes||[]).length?`<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:10px;justify-content:center;">${G.bienes.map(b=>{const B=bienByld(b.id)||{n:b.id,i:'bx-box'};return `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,.05);border:1px solid #2a2a2a;border-radius:20px;padding:4px 10px;font-size:10.5px;color:#ccc;font-weight:700;"><i class='bx ${B.i}' style="color:#facc15;"></i>${esc(B.n)}</span>`;}).join('')}</div>`:''}
        </div>`, false); })()}

    <!-- FORMACIÓN EN JUVENILES (plegable) -->
    ${seccion('juveniles','bx-child','CÓMO TE FORMASTE','#4fc3f7', (G.juvHist&&G.juvHist.length)?`
      <div style="background:linear-gradient(160deg,rgba(79,195,247,.08),rgba(20,22,18,.5));border:1px solid rgba(79,195,247,.25);border-radius:14px;padding:13px 15px;">
        ${G.juvHist.map(v=>`<div style="display:flex;gap:9px;padding:5px 0;font-size:11.5px;color:#c4ccc0;line-height:1.45;"><span style="font-weight:900;color:#4fc3f7;flex-shrink:0;">${v.edad}</span><span style="flex:1;"><b style="color:#fff;">${esc(v.t)}.</b> ${esc(v.res)}</span></div>`).join('')}
        <div style="margin-top:9px;padding-top:9px;border-top:1px solid rgba(79,195,247,.18);font-size:11px;color:#8a8f96;">Debutaste en primera a los <b style="color:#fff;">${G.debutEdad||18}</b> años${G.flags&&G.flags.debutPrecoz?' — <span style="color:#facc15;font-weight:800;">antes de tiempo</span>':''}.</div>
      </div>`:'', false)}

    <!-- DUELO FINAL CON EL NÉMESIS -->
    ${(G.rival && (G.rival.ganados+G.rival.perdidos)>0) ? (function(){
      const R=G.rival; const gane=R.ganados>R.perdidos; const col=gane?'#22c55e':'#ef4444';
      const veredicto = gane ? `Le ganaste el pulso de toda una generación.` : R.ganados===R.perdidos ? `Empate técnico: dos carreras que nunca se soltaron.` : `Él terminó arriba. Siempre vas a saber que estuvo ahí.`;
      return seccion('rivalidad','bx-target-lock','LA RIVALIDAD DE TU VIDA',col,`
      <div style="background:linear-gradient(160deg,${col}12,rgba(20,22,18,.6));border:1px solid ${col}44;border-radius:14px;padding:16px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
          <div style="flex:1;text-align:center;"><div style="font-size:10px;color:#8a8f96;font-weight:800;">VOS</div><div style="font-size:22px;font-weight:900;color:#fff;">${G.tot.g}</div><div style="font-size:9px;color:#666;">GOLES · Nv ${nivelF} · ${G.titulos} tít.</div></div>
          <div style="font-size:26px;font-weight:900;color:${col};flex-shrink:0;">${R.ganados}—${R.perdidos}</div>
          <div style="flex:1;text-align:center;"><div style="font-size:10px;color:#8a8f96;font-weight:800;">${esc(R.nombre).toUpperCase()}</div><div style="font-size:22px;font-weight:900;color:#fff;">${(R.tot&&R.tot.g)||0}</div><div style="font-size:9px;color:#666;">GOLES · Nv ${Math.round(R.nivel||60)} · ${R.titulos||0} tít.</div></div>
        </div>
        <div style="font-size:12.5px;color:#c4ccc0;text-align:center;line-height:1.5;font-style:italic;">${veredicto}</div>
      </div>`, false); })() : ''}

    <!-- MARCAS DE TU HISTORIA (banderas) -->
    ${(function(){ const F=G.flags||{}; const b=[];
      if(F.traidor) b.push(['bx-run','#ef4444','Traidor','Te fuiste siendo ídolo. No te lo perdonaron.']);
      if(F.redimido) b.push(['bx-heart','#4fc3f7','Redimido','Diste la cara y volviste a ganarte a la gente.']);
      if(F.suspendido) b.push(['bx-block','#ef4444','Sancionado','Pasaste por una suspensión que marcó tu carrera.']);
      if(F.limpio) b.push(['bx-shield-quarter','#22c55e','Siempre limpio','Rechazaste todos los atajos.']);
      if(F.ludopata&&!F.enTratamiento) b.push(['bx-dice-5','#f59e0b','Ludopatía','El juego te siguió toda la carrera.']);
      if(F.enTratamiento) b.push(['bx-plus-medical','#4fc3f7','Salió adelante','Pediste ayuda a tiempo con la ludopatía.']);
      if(F.arreglo) b.push(['bx-money-withdraw','#dc2626','Amaño','Vendiste un partido. Nunca se supo del todo.']);
      if(F.delator) b.push(['bx-microphone','#4fc3f7','Delator','Colaboraste y desarmaste una red de amaños.']);
      if(F.filantropo) b.push(['bx-donate-heart','#22c55e','Filántropo','Tu fundación cambió vidas en el barrio.']);
      if(F.doblenac) b.push(['bx-world','#a78bfa','Doble nacionalidad','Elegiste otro himno para tu selección.']);
      if(F.villano) b.push(['bx-mask','#ef4444','Villano','Festejaste en la cara de tu ex hinchada.']);
      if(!b.length) return '';
      return seccion('marcas','bx-bookmark','LAS MARCAS DE TU HISTORIA','#94a3b8', `
        <div style="display:flex;flex-direction:column;gap:7px;">
          ${b.map(x=>`<div style="display:flex;align-items:center;gap:11px;background:${x[1]}0f;border:1px solid ${x[1]}44;border-radius:12px;padding:10px 13px;">
            <i class='bx ${x[0]}' style="font-size:22px;color:${x[1]};flex-shrink:0;"></i>
            <div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:900;color:${x[1]};">${x[2]}</div><div style="font-size:11px;color:#aaa;margin-top:1px;line-height:1.35;">${x[3]}</div></div>
          </div>`).join('')}
        </div>`, false, b.length); })()}

    <!-- PREMIOS INDIVIDUALES (se guardaban pero nunca se mostraban) -->
    ${(function(){
      const pr = G.premios || []; if(!pr.length) return '';
      const grup = {};
      pr.forEach(p=>{ grup[p.nombre] = grup[p.nombre] || { n:p.nombre, count:0, edades:[] }; grup[p.nombre].count++; grup[p.nombre].edades.push(p.edad); });
      const arr = Object.values(grup).sort((a,b)=>b.count-a.count);
      return seccion('premios','bxs-medal','PREMIOS INDIVIDUALES','#f59e0b', `
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(88px,1fr));gap:10px;">
          ${arr.map(p=>`<div style="background:linear-gradient(160deg,rgba(245,158,11,.10),rgba(20,22,18,.6));border:1px solid rgba(245,158,11,.3);border-radius:14px;padding:10px 6px;text-align:center;">
            <div style="position:relative;height:60px;display:flex;align-items:center;justify-content:center;">
              ${premioRender(p.n, 56)}
              ${p.count>1?`<span style="position:absolute;top:-4px;right:-4px;background:#f59e0b;color:#000;font-size:10px;font-weight:900;border-radius:11px;padding:2px 7px;">×${p.count}</span>`:''}
            </div>
            <div style="font-size:9.5px;color:#eee;font-weight:800;margin-top:6px;line-height:1.2;">${esc(p.n)}</div>
            <div style="font-size:8.5px;color:#777;margin-top:2px;">${p.edades.slice(0,3).join(', ')} años</div>
          </div>`).join('')}
        </div>`, false, pr.length); })()}

    <!-- VITRINA DE TROFEOS (plegable, con el club de cada título) -->
    ${seccion('vitrina','bx-trophy','VITRINA DE TÍTULOS','#facc15', trofArr.length ? `
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${trofArr.map(t=>`<div style="display:flex;align-items:center;gap:12px;background:linear-gradient(160deg,rgba(250,204,21,.09),rgba(20,22,18,.6));border:1px solid rgba(250,204,21,.25);border-radius:13px;padding:10px 12px;">
          <div style="position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            ${trofeoRender(t.n, 46)}
            ${t.count>1?`<span style="position:absolute;top:-3px;right:-6px;background:${A};color:#000;font-size:9.5px;font-weight:900;border-radius:10px;padding:1px 6px;">×${t.count}</span>`:''}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;color:#fff;font-weight:900;line-height:1.2;">${esc(t.n)}</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px;">
              ${t.clubes.map(c=>`<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,.05);border:1px solid #2a2a24;border-radius:20px;padding:2px 8px 2px 3px;font-size:10px;color:#d4d4c8;font-weight:700;">${clubBadge(c.club,14)}${esc(c.club)} <span style="color:#7a8070;">·${c.edad}a</span></span>`).join('')}
            </div>
          </div>
        </div>`).join('')}
      </div>` : '', true, G.titulos)}

    <!-- TIMELINE POR TEMPORADA (plegable) -->
    ${seccion('timeline','bx-timer','LÍNEA DE TIEMPO', A, timelineHtml ? `
      <div style="background:#0d100d;border:1px solid #1c1c1c;border-radius:14px;padding:6px 12px;">${timelineHtml}</div>` : '', false, anios + ' temp.')}

    ${G.segundaVida ? `
    <!-- SEGUNDA VIDA + CRONOLOGÍA POST-RETIRO -->
    <div class="cr-fade cr-fade-d3" style="margin-top:20px;">
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:12px;letter-spacing:2px;color:#a78bfa;margin-bottom:8px;padding-left:2px;"><i class='bx bx-refresh'></i> DESPUÉS DEL FÚTBOL</div>
      <div style="background:linear-gradient(160deg,rgba(167,139,250,.10),rgba(20,22,18,.5));border:1px solid rgba(167,139,250,.28);border-radius:14px;padding:14px 16px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <i class='bx ${G.segundaVida.icon}' style="font-size:34px;color:#a78bfa;"></i>
          <div style="flex:1;">
            <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:16px;color:#fff;">${esc(G.segundaVida.rol)}</div>
            <div style="font-size:12px;color:#c4ccc0;margin-top:4px;line-height:1.5;">${esc(G.segundaVida.res)}</div>
          </div>
        </div>
        ${(G.vidaHist&&G.vidaHist.length)?`<div style="margin-top:14px;border-top:1px solid rgba(167,139,250,.2);padding-top:12px;">
          <div style="font-size:10px;font-weight:800;color:#a78bfa;letter-spacing:1px;margin-bottom:8px;">TU VIDA AÑO A AÑO</div>
          ${G.vidaHist.map(v=>`<div style="display:flex;gap:8px;padding:5px 0;font-size:11.5px;color:#c4ccc0;line-height:1.4;"><span style="font-weight:900;color:#a78bfa;flex-shrink:0;white-space:nowrap;">${esc(v.lapso||v.edad||"")}</span><span style="flex:1;"><b style="color:#fff;">${esc(v.t)}.</b> ${esc(v.res)}</span></div>`).join('')}
          ${(G.vidaLapso!=null && G.vidaLapso<VIDA_LAPSOS.length)?`<button onclick="window._carreraVida()" style="width:100%;margin-top:10px;background:rgba(167,139,250,.15);color:#c4b5fd;border:1px solid rgba(167,139,250,.4);border-radius:10px;padding:10px;font-weight:800;font-size:12px;cursor:pointer;">Seguir con mi vida (${G.vidaEdad} años) <i class='bx bx-right-arrow-alt'></i></button>`:''}
        </div>`:''}
      </div>
    </div>` : ''}

    <!-- ACCIONES -->
    <div class="cr-fade cr-fade-d4" style="display:flex;flex-direction:column;gap:9px;margin-top:22px;">
      <button onclick="window._carreraCompartir()" style="width:100%;background:linear-gradient(135deg,#7c3aed,#facc15);color:#000;border:none;border-radius:14px;padding:14px;font-family:Outfit,sans-serif;font-weight:900;font-size:14px;cursor:pointer;"><i class='bx bx-share-alt'></i> COMPARTIR MI CARRERA</button>
      <button onclick="window._carreraLen()" style="width:100%;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:14px;padding:15px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;box-shadow:0 10px 30px rgba(80,220,110,.28);">EMPEZAR NUEVA CARRERA</button>
      <button onclick="window._carreraRanking()" style="width:100%;background:rgba(255,255,255,.05);color:#fff;border:1px solid #242424;border-radius:14px;padding:13px;font-weight:800;font-size:14px;cursor:pointer;"><i class='bx bx-bar-chart-alt-2' style="color:${A};"></i> Ver ranking global</button>
      <button onclick="window._carreraSalir()" style="width:100%;background:transparent;color:#888;border:none;padding:11px;font-weight:800;font-size:13px;cursor:pointer;">${esStandalone()?'Volver al inicio del juego':'Volver a Juegos'}</button>
    </div>
  </div>`;
  // NO borrar el save inmediatamente: si el jugador elige una segunda vida, la app la
  // guarda ahí y vuelve a mostrar el resumen actualizado. Se limpia al empezar NUEVA carrera.
}

// ══════════════════════════════════════════════════════════════════════════════
// MODO VIDA — post-carrera en VISTA LATERAL, al estilo de los simuladores de vida
// pixel art. La pantalla es una habitación vista de costado, teñida según el ánimo,
// con tu avatar parado adentro. Arriba: barras de necesidades. Arriba a la derecha:
// el período y los objetivos. Abajo: la decisión del lapso.
//
// El tiempo NO avanza año a año: avanza por LAPSOS de 5 años (36-40, 41-45, ...).
// Cada rol tiene su propia habitación, sus propias barras y su propio banco de
// eventos: un DT no vive lo mismo que un comentarista.
// ══════════════════════════════════════════════════════════════════════════════

// ── LAPSOS DE TIEMPO ──────────────────────────────────────────────────────────
const VIDA_LAPSOS = [
  { de:36, a:40, lbl:'36—40', t:'Recién colgados los botines' },
  { de:41, a:45, lbl:'41—45', t:'Encontrando tu lugar' },
  { de:46, a:50, lbl:'46—50', t:'Consolidación' },
  { de:51, a:55, lbl:'51—55', t:'Media vida' },
  { de:56, a:60, lbl:'56—60', t:'Balance' },
  { de:61, a:65, lbl:'61—65', t:'Legado' },
  { de:66, a:70, lbl:'66—70', t:'Los setenta a la vuelta' },
  { de:71, a:75, lbl:'71—75', t:'Abuelo de barrio' },
  { de:76, a:80, lbl:'76—80', t:'El último tramo' }
];

// ── ROLES: cada uno con su escena, su paleta y sus barras propias ─────────────
const VIDA_ROLES = {
  dt: {
    n:'Director Técnico', icon:'bx-clipboard', color:'#baff00',
    tinte:'#16240f', luz:'#3d6b1f', piso:'#1c2a14',
    barras:[['PRESIÓN','presion','#ef4444',true],['RESULTADOS','resultados','#baff00'],['PLANTEL','plantel','#4fc3f7'],['SALUD','salud','#22c55e']],
    estado:g=>g.resultados>=70?'INVICTO':g.resultados>=45?'ESTABLE':g.presion>=70?'EN LA CUERDA FLOJA':'CUESTIONADO',
    intro:'Cambiaste los botines por la pizarra. El vestuario ahora se dirige, no se comparte.'
  },
  comentarista: {
    n:'Comentarista', icon:'bx-microphone', color:'#64b4ff',
    tinte:'#0d1626', luz:'#2a4d8f', piso:'#111a2b',
    barras:[['RATING','rating','#64b4ff'],['POLÉMICA','polemica','#f59e0b'],['CREDIBILIDAD','credibilidad','#22c55e'],['SALUD','salud','#22c55e']],
    estado:g=>g.rating>=70?'FIGURA DE LA TV':g.polemica>=70?'EN EL OJO DE LA TORMENTA':g.credibilidad>=60?'VOZ RESPETADA':'UNO MÁS EN EL PANEL',
    intro:'Colgaste los botines y agarraste el micrófono. Ahora opinás de los que juegan.'
  },
  dirigente: {
    n:'Dirigente', icon:'bx-briefcase', color:'#facc15',
    tinte:'#241c08', luz:'#8f6f1a', piso:'#2b2210',
    barras:[['PODER','poder','#facc15'],['CAJA','caja','#22c55e'],['SOCIOS','socios','#4fc3f7'],['SALUD','salud','#22c55e']],
    estado:g=>g.poder>=70?'MANDA EN EL CLUB':g.caja<=25?'CLUB FUNDIDO':g.socios>=65?'QUERIDO POR EL SOCIO':'DIRIGENTE GRIS',
    intro:'Te metiste del otro lado del mostrador. Ahora las decisiones difíciles son tuyas.'
  },
  empresario: {
    n:'Empresario', icon:'bx-store', color:'#22c55e',
    tinte:'#0a2118', luz:'#1f7a52', piso:'#0f2a1e',
    barras:[['PATRIMONIO','patrimonio','#22c55e'],['RIESGO','riesgo','#ef4444',true],['CONTACTOS','contactos','#4fc3f7'],['SALUD','salud','#22c55e']],
    estado:g=>g.patrimonio>=75?'MAGNATE':g.patrimonio<=25?'AL BORDE DE LA QUIEBRA':g.riesgo>=70?'JUGANDO CON FUEGO':'NEGOCIOS ESTABLES',
    intro:'Tu plata ahora trabaja para vos. O eso decís cada vez que firmás algo.'
  },
  escuela: {
    n:'Escuela de fútbol', icon:'bx-award', color:'#f97316',
    tinte:'#241505', luz:'#9c5a12', piso:'#1f3d12',
    barras:[['PIBES','pibes','#f97316'],['PRESTIGIO','prestigio','#facc15'],['ECONOMÍA','economia','#22c55e'],['SALUD','salud','#22c55e']],
    estado:g=>g.prestigio>=70?'CANTERA DE CRACKS':g.economia<=25?'A PURO PULMÓN':g.pibes>=65?'LLENA DE CHICOS':'ESCUELITA DE BARRIO',
    intro:'Abriste tu escuela en el barrio. Todo lo que sabés, ahora se lo pasás a ellos.'
  },
  disfrutar: {
    n:'Vida tranquila', icon:'bx-glasses', color:'#a78bfa',
    tinte:'#1a1428', luz:'#5b3f9e', piso:'#221a33',
    barras:[['FELICIDAD','felicidad','#a78bfa'],['FAMILIA','familia','#f472b6'],['SOLEDAD','soledad','#94a3b8',true],['SALUD','salud','#22c55e']],
    estado:g=>g.felicidad>=70?'EN PAZ':g.soledad>=70?'DEMASIADO SOLO':g.familia>=65?'RODEADO DE LOS TUYOS':'TRANQUILO',
    intro:'El fútbol ya te dio todo. Ahora te toca a vos.'
  }
};

// ── ESCENA LATERAL: habitación dibujada en SVG, distinta por rol ──────────────
// Mismo lenguaje visual que el sprite: rectángulos, sin antialias, con sombreado.
function vidaEscena(rol, ancho, alto){
  const R = VIDA_ROLES[rol] || VIDA_ROLES.disfrutar;
  const W = ancho || 320, H = alto || 150;
  const pisoY = Math.round(H * 0.76);
  const pared = R.tinte, paredL = _avShade(pared, 16), piso = R.piso;
  let o = '';
  // Pared con degradado de luz + piso
  o += `<defs>
    <linearGradient id="vp${rol}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${paredL}"/><stop offset="1" stop-color="${pared}"/></linearGradient>
    <radialGradient id="vl${rol}" cx="50%" cy="18%" r="70%"><stop offset="0%" stop-color="${R.luz}" stop-opacity=".38"/><stop offset="100%" stop-color="${R.luz}" stop-opacity="0"/></radialGradient>
  </defs>`;
  o += `<rect width="${W}" height="${pisoY}" fill="url(#vp${rol})"/>`;
  o += `<rect width="${W}" height="${pisoY}" fill="url(#vl${rol})"/>`;
  o += `<rect y="${pisoY}" width="${W}" height="${H-pisoY}" fill="${piso}"/>`;
  o += `<rect y="${pisoY}" width="${W}" height="2" fill="${_avShade(piso,26)}"/>`;
  // Zócalo
  o += `<rect y="${pisoY-4}" width="${W}" height="4" fill="${_avShade(pared,-22)}"/>`;

  const M = (x,y,w,h,c)=>{ o += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`; };
  const g1 = _avShade(pared,-30), g2 = _avShade(pared,34), acc = R.color;

  if (rol === 'dt'){
    // Vestuario: pizarra táctica, banco, botines colgados, lockers
    M(18, pisoY-70, 74, 52, '#0f1a0a'); M(21, pisoY-67, 68, 46, '#16250d');       // pizarra
    for(let i=0;i<5;i++) M(28+i*12, pisoY-56+((i%2)*10), 5, 5, acc);              // jugadas
    M(30, pisoY-40, 46, 1, '#5c7a3a'); M(52, pisoY-56, 1, 26, '#5c7a3a');
    M(W-96, pisoY-88, 84, 84, g1); M(W-93, pisoY-85, 36, 78, _avShade(g1,10));    // lockers
    M(W-55, pisoY-85, 36, 78, _avShade(g1,6));
    M(W-78, pisoY-52, 3, 3, g2); M(W-40, pisoY-52, 3, 3, g2);
    M(W-120, pisoY-16, 40, 16, '#2a1c0e'); M(W-120, pisoY-19, 40, 3, '#3d2a15');  // banco
    M(112, pisoY-96, 2, 22, g1); M(105, pisoY-76, 16, 7, '#1a1a12');              // botines colgados
    M(126, pisoY-96, 2, 22, g1); M(119, pisoY-76, 16, 7, '#1a1a12');
    M(150, pisoY-10, 10, 10, '#e8e8dc'); M(153, pisoY-7, 4, 4, '#141410');        // pelota
  } else if (rol === 'comentarista'){
    // Estudio de TV: escritorio, monitores, micrófono, luces
    M(0, 8, W, 3, acc);                                                           // riel de luces
    for(let i=0;i<6;i++){ M(18+i*((W-36)/6), 11, 10, 6, '#f5f0d8'); }
    M(24, pisoY-74, 96, 54, '#0a1220'); M(27, pisoY-71, 90, 48, '#12325c');       // pantalla grande
    M(34, pisoY-62, 34, 4, '#4d8fd6'); M(34, pisoY-52, 62, 3, '#2a5f9e');
    M(34, pisoY-44, 48, 3, '#2a5f9e');
    M(W-118, pisoY-30, 106, 30, '#141c2e'); M(W-118, pisoY-33, 106, 4, '#22304d'); // escritorio
    M(W-96, pisoY-52, 3, 20, g1); M(W-100, pisoY-58, 11, 7, '#1a1a1a');           // micrófono
    M(W-56, pisoY-48, 30, 16, '#0a1220'); M(W-53, pisoY-45, 24, 10, '#1e4a80');   // monitor chico
  } else if (rol === 'dirigente'){
    // Despacho: escritorio grande, vitrina con copas, banderín, cuadro
    M(W-128, pisoY-40, 116, 40, '#2b1d08'); M(W-128, pisoY-44, 116, 5, '#4a3312');
    M(W-120, pisoY-58, 22, 15, '#0f1420'); M(W-118, pisoY-56, 18, 11, '#2a4d80'); // notebook
    M(20, pisoY-96, 70, 92, '#241a06'); M(24, pisoY-92, 62, 84, '#100c04');       // vitrina
    for(let i=0;i<3;i++){ const cy=pisoY-84+i*28;
      M(30, cy, 50, 2, '#3d2c0d');
      M(36, cy-14, 6, 14, '#d4af37'); M(33, cy-3, 12, 3, '#b8952e');
      M(58, cy-11, 5, 11, '#d4af37'); M(55, cy-3, 11, 3, '#b8952e'); }
    M(W-70, pisoY-104, 30, 42, acc); M(W-70, pisoY-104, 30, 4, _avShade(acc,-40)); // banderín
    M(W-62, pisoY-92, 14, 14, '#f5f0d8');
  } else if (rol === 'empresario'){
    // Oficina moderna: ventanal con ciudad, escritorio, gráfico de bolsa, planta
    M(16, 14, 118, 78, '#071a12'); M(19, 17, 112, 72, '#0d3326');                 // ventanal
    for(let i=0;i<7;i++){ const bh=18+((i*13)%36); M(24+i*15, 89-bh, 11, bh, '#0a2a1e');
      for(let j=0;j<3;j++) M(26+i*15, 93-bh+j*7, 3, 3, '#3ba578'); }              // edificios
    M(W-124, pisoY-36, 112, 36, '#0f2419'); M(W-124, pisoY-40, 112, 5, '#1c4030');
    M(W-112, pisoY-70, 62, 30, '#061410');                                        // gráfico
    let px=W-108, py=pisoY-48;
    for(let i=0;i<8;i++){ const ny=pisoY-48-((i*i)%22); M(px+i*7, ny, 5, pisoY-44-ny, i%3===2?'#ef4444':'#22c55e'); }
    M(150, pisoY-30, 4, 30, '#2d1f10'); M(140, pisoY-44, 24, 16, '#1f6b45');      // planta
    M(146, pisoY-52, 12, 10, '#288a58');
  } else if (rol === 'escuela'){
    // Cancha de barrio al atardecer: arco, conos, pelotas, red
    M(0, pisoY-2, W, 2, '#3f6b22');
    M(20, pisoY-62, 3, 62, '#d8d8cc'); M(20, pisoY-62, 74, 3, '#d8d8cc');         // arco
    M(91, pisoY-62, 3, 62, '#d8d8cc');
    for(let i=0;i<10;i++) M(23+i*7, pisoY-59, 1, 56, 'rgba(230,230,220,.30)');    // red
    for(let i=0;i<7;i++) M(23, pisoY-56+i*8, 68, 1, 'rgba(230,230,220,.30)');
    [130,152,174,196].forEach((x,i)=>{ M(x, pisoY-10, 9, 10, '#f97316'); M(x+2, pisoY-14, 5, 4, '#fb923c'); }); // conos
    M(W-40, pisoY-11, 11, 11, '#e8e8dc'); M(W-37, pisoY-8, 5, 5, '#141410');      // pelota
    M(W-64, pisoY-9, 9, 9, '#e8e8dc');
    M(W-96, pisoY-52, 40, 26, '#3d2a12'); M(W-96, pisoY-55, 40, 4, '#5c4020');    // bancos
  } else {
    // Living de casa: sillón, TV, ventana, mate, cuadro
    M(W-130, pisoY-42, 112, 42, '#3b2c52'); M(W-130, pisoY-52, 112, 12, '#4a3866'); // sillón
    M(W-130, pisoY-42, 14, 42, '#2e2242'); M(W-32, pisoY-42, 14, 42, '#2e2242');
    M(22, pisoY-62, 76, 46, '#0c0a14'); M(25, pisoY-59, 70, 40, '#1a1630');       // TV
    M(34, pisoY-50, 24, 3, '#4a3f7a'); M(34, pisoY-42, 44, 3, '#3a3160');
    M(56, pisoY-16, 8, 16, '#0c0a14'); M(44, pisoY-2, 32, 2, '#0c0a14');
    M(W-92, 20, 62, 46, '#100c1c'); M(W-89, 23, 56, 40, '#2a2352');               // ventana
    M(W-61, 23, 2, 40, '#100c1c'); M(W-89, 41, 56, 2, '#100c1c');
    M(118, pisoY-14, 12, 14, '#5c3a18'); M(121, pisoY-20, 3, 8, '#c8c8bc');       // mate
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;shape-rendering:crispEdges;">${o}</svg>`;
}

// ── BARRA DE NECESIDAD (etiqueta arriba + barra segmentada, como el juego) ────
function vidaBarra(lbl, val, col, invertida){
  const v = clamp(Math.round(val||0), 0, 100);
  // En las barras "malas" (presión, riesgo, soledad) el color se enciende al subir.
  const activo = invertida ? (v >= 60 ? '#ef4444' : col) : (v <= 25 ? '#ef4444' : col);
  const segs = 10, llenos = Math.round(v/10);
  let s = '';
  for(let i=0;i<segs;i++){
    s += `<div style="flex:1;height:7px;background:${i<llenos?activo:'rgba(255,255,255,.07)'};border-radius:1px;"></div>`;
  }
  return `<div style="flex:1;min-width:64px;">
    <div style="font-size:8px;font-weight:900;letter-spacing:.8px;color:${activo};margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${lbl}</div>
    <div style="display:flex;gap:1.5px;">${s}</div>
  </div>`;
}

// ── ESTADO INICIAL DEL MODO VIDA ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
// VIDA PERSONAL DURANTE LA CARRERA
// Antes la vida privada existía sólo después del retiro: como jugador no te
// casabas, no se te moría nadie y no te robaban. Ahora estas barras arrancan el
// día del debut, te acompañan toda la carrera y se las lleva puestas la segunda
// vida — la familia que armaste a los 24 sigue ahí a los 60.
// ══════════════════════════════════════════════════════════════════════════════
function personalInit(){
  return {
    salud: clamp(88 - Math.max(0, (G.edad||18) - 30), 40, 100),
    felicidad: clamp(58 + Math.round(((G.moral||60) - 60) / 3), 20, 90),
    familia: 55,
    soledad: 30
  };
}
function personalAsegurar(){
  if(!G) return null;
  if(!G.vidaStats) { G.vidaStats = personalInit(); save(); }
  else {
    // Guardados viejos: completar las barras que falten sin pisar las que hay.
    const base = personalInit();
    ['salud','felicidad','familia','soledad'].forEach(k=>{ if(G.vidaStats[k] == null) G.vidaStats[k] = base[k]; });
  }
  return G.vidaStats;
}
// Lo personal se contagia a lo deportivo: nadie rinde igual con la casa en llamas.
// Subir de nivel cuesta cada vez mas: de 90 para arriba casi no se mueve, y a
// 99 llegan cuatro en la historia. Bajar, en cambio, baja igual de rapido.
function subirNivel(delta){
  if(!G) return 0;
  const n = G.nivel || 60;
  if (delta > 0){
    const freno = n >= 95 ? 0.12 : n >= 92 ? 0.25 : n >= 88 ? 0.45 : n >= 84 ? 0.7 : 1;
    G.nivel = clamp(n + delta * freno, 30, 99);
  } else {
    G.nivel = clamp(n + delta, 30, 99);
  }
  return G.nivel;
}
function personalPuente(antes){
  if(!G || !G.vidaStats) return { moral:0, nivel:0 };
  const s = G.vidaStats;
  const dFel = (s.felicidad||0) - (antes.felicidad||0);
  const dSol = (s.soledad||0) - (antes.soledad||0);
  const dSal = (s.salud||0) - (antes.salud||0);
  const dMoral = Math.round(dFel * 0.5 - dSol * 0.25);
  const dNivel = Math.round(dSal * 0.10);
  if (dMoral) G.moral = clamp(G.moral + dMoral, 0, 100);
  if (dNivel) G.nivel = subirNivel(dNivel);
  return { moral:dMoral, nivel:dNivel };
}
function vidaInit(rol){
  const R = VIDA_ROLES[rol] || VIDA_ROLES.disfrutar;
  // Los valores de arranque dependen de CÓMO TERMINÓ la carrera (efecto mariposa).
  const F = G.flags || {};
  const fama = G.fama || 40, nivelF = Math.round(G.nivel||60), tit = G.titulos||0;
  const plataTotal = (G.dinero||0) + ((G.inversiones&&G.inversiones.monto)||0);
  const rico = plataTotal >= 3000000 ? 25 : plataTotal >= 500000 ? 10 : plataTotal <= 50000 ? -15 : 0;
  const st = { salud: clamp(78 - Math.max(0, (G.edad||36)-34)*1.2 + (F.limpio?8:0) - (F.dopado?12:0), 20, 100) };
  if (rol === 'dt'){
    st.presion = 45; st.resultados = clamp(35 + tit*3 + (F.lider?12:0), 10, 80); st.plantel = clamp(45 + fama*0.25, 15, 90);
  } else if (rol === 'comentarista'){
    st.rating = clamp(30 + fama*0.5, 15, 90); st.polemica = 25; st.credibilidad = clamp(50 + (F.limpio?15:0) - (F.arreglo?30:0) - (F.suspendido?18:0), 5, 95);
  } else if (rol === 'dirigente'){
    st.poder = clamp(30 + tit*2 + (F.traidor?-12:8), 10, 80); st.caja = clamp(45 + rico, 10, 90); st.socios = clamp(45 + (G.idolatria&&G.idolatria[G.club]>50?20:0) - (F.traidor?22:0), 5, 95);
  } else if (rol === 'empresario'){
    st.patrimonio = clamp(35 + rico*1.6, 10, 92); st.riesgo = 30; st.contactos = clamp(35 + fama*0.4, 10, 90);
  } else if (rol === 'escuela'){
    st.pibes = clamp(40 + fama*0.3, 15, 90); st.prestigio = clamp(30 + tit*4 + nivelF*0.2, 10, 92); st.economia = clamp(40 + rico, 10, 85);
  } else {
    st.felicidad = clamp(55 + (F.filantropo?12:0) - (F.ludopata?15:0), 15, 95); st.familia = clamp(55 + (F.filantropo?10:0), 10, 95); st.soledad = clamp(30 - (F.filantropo?10:0) + (F.traidor?12:0), 5, 85);
  }
  // Lo que construiste COMO JUGADOR no se borra al colgar los botines: la salud,
  // la felicidad, la familia y la soledad que traías siguen siendo las tuyas.
  const prev = G.vidaStats || {};
  ['salud','felicidad','familia','soledad'].forEach(k=>{
    if (prev[k] != null) st[k] = (st[k] != null) ? Math.round((st[k] + prev[k]) / 2) : prev[k];
  });
  return st;
}

// ── BANCOS DE EVENTOS POR ROL ────────────────────────────────────────────────
// Cada opción: {txt, ef:(s,g)=>texto}. `s` = stats del rol, `g` = la partida.
// `req` opcional: solo aparece si la función devuelve true.
const VIDA_EVENTOS = {
  dt: [
    { t:'Tu primer plantel', d:'Te dan tu primer equipo. El vestuario te mira: para ellos seguís siendo un jugador, no un técnico.', opts:[
      { txt:'Marcar autoridad desde el día uno', ef:(s)=>{ s.plantel-=8; s.resultados+=10; s.presion-=5; return 'Pusiste reglas duras. Algunos se quejaron, pero el equipo empezó a competir.'; } },
      { txt:'Ser uno más y ganármelos', ef:(s)=>{ s.plantel+=15; s.resultados-=4; return 'El vestuario te adora. Todavía no se sabe si eso alcanza para ganar.'; } } ] },
    { t:'Racha de derrotas', d:'Cuatro fechas sin ganar. La prensa pide tu cabeza y el presidente no atiende el teléfono.', opts:[
      { txt:'Bancar el equipo en la conferencia', ef:(s)=>{ s.plantel+=14; s.presion+=8; return 'Diste la cara por ellos. El plantel te lo devolvió en la cancha.'; } },
      { txt:'Apuntar a los jugadores', ef:(s)=>{ s.plantel-=22; s.presion-=6; return 'Te sacaste la presión de encima, pero rompiste el vestuario.'; } },
      { txt:'Renunciar antes de que me echen', ef:(s,g)=>{ s.presion=20; s.resultados-=12; g._vidaFlags.renuncio=true; return 'Te fuiste con dignidad. Tardaste dos años en volver a dirigir.'; } } ] },
    { t:'La joya de la cantera', d:'Aparece un pibe de 17 con condiciones enormes. El presidente lo quiere vender ya.', opts:[
      { txt:'Ponerlo a jugar y bancarlo', ef:(s,g)=>{ const b=Math.random()<.6; s.resultados+=b?14:-6; s.plantel+=8; if(b) g._vidaFlags.descubrio=true; return b?'Explotó. Hoy juega en Europa y siempre dice que vos lo hiciste debutar.':'Le pesó la camiseta. Tardó en arrancar y te costó puntos.'; } },
      { txt:'Aceptar la venta, el club necesita plata', ef:(s)=>{ s.resultados-=8; s.presion+=10; return 'Se fue por dos monedas. Un año después valía veinte veces más.'; } } ] },
    { t:'Oferta de la selección', d:'Te llaman para dirigir a tu selección. Es el sueño, pero dejás un proyecto a medias.', opts:[
      { txt:'Aceptar sin dudar', ef:(s,g)=>{ s.presion+=25; s.resultados+=6; g._vidaFlags.seleccionador=true; return 'Dirigiste a tu país. Ese escudo en el pecho no se compara con nada.'; } },
      { txt:'Terminar lo que empecé', ef:(s)=>{ s.plantel+=18; s.resultados+=8; return 'Elegiste la lealtad. El club te hizo un mural en el estadio.'; } } ] },
    { t:'Final del torneo', d:'Llegaste a la final. Enfrente está el equipo que te echó hace tres años.', opts:[
      { txt:'Salir a ganarla', ef:(s,g)=>{ const b=Math.random()<.5+(s.resultados-50)/220; s.resultados+=b?20:-10; s.presion+=b?-20:15; if(b){ g.titulos=(g.titulos||0)+1; g._vidaFlags.campeonDT=true; if(!g.vitrina)g.vitrina=[]; g.vitrina.push({comoDT:true,nombre:'Título como DT',edad:g.vidaEdad,club:'Como DT'}); } return b?'CAMPEÓN. Y en la cara de los que no te bancaron.':'Se te escapó en el último minuto. Dolió como jugador y dolió más como técnico.'; } },
      { txt:'Especular y jugar al empate', ef:(s,g)=>{ const b=Math.random()<.35; s.resultados+=b?15:-6; if(b){ g.titulos=(g.titulos||0)+1; if(!g.vitrina)g.vitrina=[]; g.vitrina.push({comoDT:true,nombre:'Título como DT',edad:g.vidaEdad,club:'Como DT'}); } return b?'Ganaste por penales. Feo, pero campeón es campeón.':'Te metiste atrás y te comieron. La gente no te lo perdonó.'; } } ] },
    { t:'Un dirigente te pide poner a alguien', d:'El presidente te "sugiere" que pongas de titular al hijo de un sponsor.', opts:[
      { txt:'Ni loco, yo elijo el equipo', ef:(s)=>{ s.presion+=18; s.plantel+=12; return 'Te la jugaste. El plantel supo que sos de fiar.'; } },
      { txt:'Ponerlo un partido para no pelear', ef:(s)=>{ s.plantel-=15; s.presion-=8; return 'El vestuario se enteró en dos horas. Perdiste autoridad.'; } } ] },
    { t:'Te llega la propuesta del Golfo', d:'Un club árabe ofrece una fortuna por dos años. Nadie mira ese fútbol, pero la plata es real.', opts:[
      { txt:'Ir por la plata', ef:(s,g)=>{ g.dinero=(g.dinero||0)+2500000; s.presion-=15; s.resultados-=5; return 'Te llenaste de plata dirigiendo partidos que nadie vio. Tu familia quedó cubierta de por vida.'; } },
      { txt:'Quedarme donde se juega en serio', ef:(s)=>{ s.resultados+=8; s.presion+=6; return 'Elegiste competir. La billetera lo sintió, el ego no.'; } } ] },
    { t:'Problemas de salud', minLapso:3, d:'Un cuadro de estrés te manda al hospital en pleno campeonato. El médico es claro: o bajás un cambio o esto termina mal.', opts:[
      { txt:'Tomarme una licencia', ef:(s)=>{ s.salud+=18; s.resultados-=10; return 'Volviste entero tres meses después. El equipo aguantó como pudo.'; } },
      { txt:'Seguir dirigiendo igual', ef:(s)=>{ const mal=Math.random()<.6; s.salud-=mal?24:8; s.resultados+=mal?-6:10; return mal?'Recaíste peor. Estuviste internado y casi no la contás.':'Aguantaste el año a pura pastilla. No lo recomendás.'; } } ] },
    { t:'Escribís tu método', minLapso:2, d:'Una editorial quiere publicar tu libro de entrenamiento. Significa abrir todo lo que sabés.', opts:[
      { txt:'Contar todo, sin guardarme nada', ef:(s,g)=>{ g.dinero=(g.dinero||0)+150000; s.presion-=8; return 'El libro se volvió material de estudio en toda Sudamérica. Tu método sobrevive a vos.'; } },
      { txt:'Los secretos me los llevo', ef:(s)=>{ s.resultados+=5; return 'Preferís que tu ventaja siga siendo tuya.'; } } ] }
  ],
  comentarista: [
    { t:'Tu primera transmisión', d:'Debut en cabina. El director te avisa que hay medio millón de personas escuchando.', opts:[
      { txt:'Jugarla técnica y seria', ef:(s)=>{ s.credibilidad+=15; s.rating+=4; return 'Análisis fino, sin gritar. Los que saben te empezaron a seguir.'; } },
      { txt:'Meterle show y personalidad', ef:(s)=>{ s.rating+=18; s.credibilidad-=6; s.polemica+=8; return 'Te hiciste viral en la primera fecha. Hay quien te ama y quien te odia.'; } } ] },
    { t:'Criticar a un ex compañero', d:'Un amigo tuyo de la selección está jugando pésimo. Te toca analizarlo al aire.', opts:[
      { txt:'Decir la verdad aunque duela', ef:(s,g)=>{ s.credibilidad+=18; s.polemica+=12; g._vidaFlags.perdioAmigo=true; return 'Fuiste honesto. Él dejó de hablarte cinco años.'; } },
      { txt:'Suavizarlo, es mi amigo', ef:(s)=>{ s.credibilidad-=14; s.rating-=4; return 'Se te notó que lo protegías. La audiencia lo leyó al toque.'; } } ] },
    { t:'Te ofrecen el programa central', d:'El canal quiere darte el prime time. Más plata, más exposición, más enemigos.', opts:[
      { txt:'Aceptar y ser la cara del canal', ef:(s,g)=>{ s.rating+=22; s.polemica+=14; g.dinero=(g.dinero||0)+400000; return 'Tu cara en la vía pública. Ya no podés ir al supermercado tranquilo.'; } },
      { txt:'Seguir en la cabina, es lo mío', ef:(s)=>{ s.credibilidad+=14; return 'Elegiste el fútbol antes que la tele. Los puristas te lo agradecen.'; } } ] },
    { t:'Te cruzás con un DT en vivo', d:'Un técnico al que criticaste te encara en plena entrevista, con las cámaras encendidas.', opts:[
      { txt:'Bancarle la discusión al aire', ef:(s)=>{ s.polemica+=25; s.rating+=16; s.credibilidad+=6; return 'El video dio la vuelta al mundo. Fue el momento más visto del año.'; } },
      { txt:'Bajar el tono y cortar', ef:(s)=>{ s.credibilidad+=10; s.rating-=6; return 'Manejaste la situación con altura. Aburrido pero elegante.'; } } ] },
    { t:'Sobre de un empresario', d:'Un representante te ofrece plata para hablar bien de sus jugadores. Nadie se enteraría.', opts:[
      { txt:'Aceptar el arreglo', ef:(s,g)=>{ g.dinero=(g.dinero||0)+300000; const cae=Math.random()<.45; s.credibilidad-=cae?45:12; s.polemica+=cae?35:0; if(cae) g._vidaFlags.escandalo=true; return cae?'Se filtraron los chats. Te echaron del canal y quedaste marcado.':'Cobraste sin que nadie se entere. Pero cada vez que hablás sabés que estás mintiendo.'; } },
      { txt:'Rechazarlo y contarlo al aire', ef:(s)=>{ s.credibilidad+=25; s.polemica+=18; s.rating+=10; return 'Lo contaste con nombre y apellido. Te convertiste en referencia de honestidad.'; } } ] },
    { t:'El Mundial', minLapso:1, d:'Te mandan a cubrir el Mundial. Un mes lejos de casa, en el evento más grande del planeta.', opts:[
      { txt:'Ir y dejar todo ahí', ef:(s,g)=>{ s.rating+=20; s.credibilidad+=10; g.dinero=(g.dinero||0)+120000; return 'Un mes irrepetible. Relataste una final. Eso no te lo saca nadie.'; } },
      { txt:'Quedarme con la familia', ef:(s)=>{ s.rating-=10; s.salud+=8; return 'Lo viste por TV como uno más. Estuviste presente en casa, que también vale.'; } } ] },
    { t:'Un pibe te pide consejo', minLapso:2, d:'Un periodista joven te escribe: quiere saber cómo se hace para entrar al medio.', opts:[
      { txt:'Ayudarlo y abrirle puertas', ef:(s)=>{ s.credibilidad+=12; return 'Hoy es uno de los mejores del país y siempre te nombra.'; } },
      { txt:'No tengo tiempo para eso', ef:(s)=>{ s.credibilidad-=6; return 'Nunca contestaste. Quedó la sensación de que te la creíste.'; } } ] },
    { t:'Te bajan del aire', minLapso:3, d:'Cambió la gerencia del canal y tu estilo "ya no encaja". Te ofrecen un horario marginal.', opts:[
      { txt:'Aceptar y remarla desde abajo', ef:(s)=>{ s.rating-=12; s.credibilidad+=10; return 'Volviste a construir audiencia desde la medianoche. Te llevó tres años.'; } },
      { txt:'Irme y armar mi propio canal', ef:(s,g)=>{ const b=Math.random()<.55; s.rating+=b?25:-20; g.dinero=(g.dinero||0)+(b?600000:-200000); return b?'Tu canal de streaming explotó. Hoy factura más que la TV.':'No funcionó. Perdiste plata y relevancia.'; } } ] }
  ],
  dirigente: [
    { t:'Asumís la presidencia', d:'Ganaste las elecciones. Al abrir los libros descubrís que el club debe tres veces lo que dijeron.', opts:[
      { txt:'Blanquear todo públicamente', ef:(s)=>{ s.socios+=20; s.caja-=10; s.poder-=8; return 'Contaste la verdad. El socio te creyó y bancó el ajuste.'; } },
      { txt:'Taparlo y arreglarlo de a poco', ef:(s,g)=>{ const cae=Math.random()<.5; s.socios-=cae?30:5; s.poder+=cae?-15:12; if(cae) g._vidaFlags.escandalo=true; return cae?'Se filtró el balance real. Te acusaron de encubrimiento.':'Lo fuiste maquillando hasta ordenarlo. Nadie se enteró.'; } } ] },
    { t:'Vender al ídolo', d:'Llega una oferta enorme por la figura del equipo. La necesitás para pagar sueldos.', opts:[
      { txt:'Venderlo, el club está primero', ef:(s)=>{ s.caja+=30; s.socios-=25; return 'Salvaste las cuentas. La hinchada colgó banderas en tu contra.'; } },
      { txt:'Rechazar la oferta', ef:(s)=>{ s.socios+=22; s.caja-=18; return 'La gente te aplaudió de pie. Los sueldos se pagaron tarde tres meses.'; } } ] },
    { t:'Obra del estadio', d:'Podés remodelar la tribuna o reforzar el plantel. La plata alcanza para una sola cosa.', opts:[
      { txt:'El estadio, es para siempre', ef:(s,g)=>{ s.poder+=15; s.socios+=12; s.caja-=20; g._vidaFlags.obra=true; return 'La tribuna nueva lleva tu nombre. Va a estar mucho después que vos.'; } },
      { txt:'El plantel, hay que ganar ahora', ef:(s)=>{ const b=Math.random()<.5; s.socios+=b?25:-15; s.caja-=22; return b?'Salieron campeones. Fue el año más feliz del socio en décadas.':'Se gastó todo y no se ganó nada. Papelón deportivo y económico.'; } } ] },
    { t:'La barra te aprieta', d:'Los referentes de la barra te piden entradas, micros y "un sueldito". Vinieron a tu casa.', opts:[
      { txt:'Denunciarlos a la policía', ef:(s,g)=>{ s.poder+=18; s.socios+=15; const r=Math.random()<.4; if(r) g._vidaFlags.amenazado=true; return r?'Los denunciaste y quedaste con custodia policial dos años. Pero limpiaste el club.':'La justicia actuó rápido. Sos el dirigente que se animó.'; } },
      { txt:'Negociar y comprar paz', ef:(s)=>{ s.caja-=15; s.poder-=12; s.socios-=8; return 'Compraste tranquilidad con la plata del socio. Y ahora te tienen agarrado.'; } } ] },
    { t:'Elecciones de nuevo', minLapso:2, d:'Se vienen las elecciones. Una lista opositora promete el oro y el moro.', opts:[
      { txt:'Presentarme a la reelección', ef:(s,g)=>{ const b=Math.random()<(0.3+s.socios/160); s.poder+=b?20:-25; if(!b) g._vidaFlags.perdioElecciones=true; return b?'Reelecto con amplia mayoría. El proyecto sigue.':'Perdiste. Te fuiste con la sensación de haber quedado a mitad de camino.'; } },
      { txt:'Dar un paso al costado', ef:(s)=>{ s.poder-=10; s.socios+=10; s.salud+=12; return 'Te fuiste por la puerta grande, antes de que te echaran. Pocos saben hacerlo.'; } } ] },
    { t:'Un club grande te quiere de manager', minLapso:2, d:'Un gigante europeo te ofrece ser su director deportivo. Otro país, otro nivel, otra plata.', opts:[
      { txt:'Cruzar el charco', ef:(s,g)=>{ g.dinero=(g.dinero||0)+1500000; s.poder+=18; s.socios-=20; g._vidaFlags.emigroDirigente=true; return 'Te fuiste a Europa. En tu club te trataron de mercenario; en el nuevo, de crack.'; } },
      { txt:'Mi lugar está acá', ef:(s)=>{ s.socios+=25; s.poder+=8; return 'Rechazaste una fortuna por el escudo. Eso el hincha no lo olvida nunca.'; } } ] },
    { t:'Descenso', minLapso:3, d:'El equipo se fue al descenso bajo tu gestión. Es la peor página de la historia del club.', opts:[
      { txt:'Quedarme a reconstruir', ef:(s,g)=>{ const b=Math.random()<.55; s.socios+=b?30:-20; s.poder+=b?15:-20; if(b) g._vidaFlags.reconstruyo=true; return b?'Los devolviste a primera en dos años. De villano pasaste a héroe.':'No pudiste. El club siguió cayendo y te fuiste odiado.'; } },
      { txt:'Renunciar esa misma noche', ef:(s)=>{ s.poder-=25; s.socios-=10; s.salud+=10; return 'Renunciaste en la conferencia, llorando. Al menos asumiste la responsabilidad.'; } } ] }
  ],
  empresario: [
    { t:'Tu primera inversión grande', d:'Tenés el capital de toda tu carrera en la mano. Un asesor te propone tres caminos.', opts:[
      { txt:'Ladrillos: comprar propiedades', ef:(s)=>{ s.patrimonio+=12; s.riesgo-=10; return 'Compraste seis departamentos. Renta segura, aburrida y dormís de noche.'; } },
      { txt:'Meterle a un fondo agresivo', ef:(s)=>{ const b=Math.random()<.5; s.patrimonio+=b?28:-25; s.riesgo+=18; return b?'Duplicaste el capital en tres años.':'El fondo se hundió. Perdiste un tercio de todo.'; } },
      { txt:'Montar mi propia empresa', ef:(s)=>{ s.contactos+=15; s.patrimonio-=8; s.riesgo+=12; return 'Arrancaste de cero con marca propia. Va a costar, pero es tuya.'; } } ] },
    { t:'Un socio te propone algo raro', d:'Un contacto te ofrece un negocio con retornos imposibles. No quiere explicarte de dónde sale la plata.', opts:[
      { txt:'No pregunto y entro', ef:(s,g)=>{ const cae=Math.random()<.5; s.patrimonio+=cae?-35:40; s.riesgo+=25; if(cae){ g._vidaFlags.causaPenal=true; return 'Era lavado. Te allanaron la casa y quedaste procesado.'; } return 'Ganaste una fortuna. Todavía no sabés de dónde salió y preferís no averiguarlo.'; } },
      { txt:'Pedir que abra los libros', ef:(s)=>{ s.contactos-=8; s.riesgo-=12; return 'Se ofendió y cortó el vínculo. Dos años después cayó preso. Zafaste.'; } } ] },
    { t:'Comprar un club', minLapso:1, d:'Está en venta el club de tu barrio, el que te formó. Está fundido y con deudas.', opts:[
      { txt:'Comprarlo y salvarlo', ef:(s,g)=>{ s.patrimonio-=22; s.contactos+=18; g._vidaFlags.duenoClub=true; return 'Compraste el club de tu vida. Es un pozo sin fondo, pero es tuyo y está vivo.'; } },
      { txt:'Es corazón, no negocio', ef:(s)=>{ s.patrimonio+=6; return 'Dijiste que no. Un año después desafilió. Te quedó la culpa.'; } } ] },
    { t:'Crisis global', minLapso:2, d:'Se derrumban los mercados. Tu patrimonio se evapora en la pantalla mientras mirás.', opts:[
      { txt:'Aguantar sin vender nada', ef:(s)=>{ const b=Math.random()<.6; s.patrimonio+=b?25:-30; return b?'Aguantaste el temporal. Cuando rebotó, ganaste como nunca.':'Siguió cayendo un año más. Perdiste casi la mitad.'; } },
      { txt:'Liquidar y salir a efectivo', ef:(s)=>{ s.patrimonio-=12; s.riesgo-=20; return 'Saliste con pérdida controlada. No ganaste el rebote, pero no te fundiste.'; } } ] },
    { t:'Tu marca deportiva', minLapso:1, d:'Podés lanzar tu propia marca de indumentaria. Tu nombre todavía vende.', opts:[
      { txt:'Lanzarla a lo grande', ef:(s,g)=>{ const b=Math.random()<.5; s.patrimonio+=b?30:-20; s.contactos+=10; if(b) g._vidaFlags.marcaPropia=true; return b?'La marca pegó. Hoy la usan pibes que no te vieron jugar.':'No enganchó. Quedaste con un depósito lleno de camisetas.'; } },
      { txt:'Licenciar el nombre y listo', ef:(s,g)=>{ g.dinero=(g.dinero||0)+250000; return 'Cobrás regalías sin mover un dedo. Poco glamour, cero riesgo.'; } } ] },
    { t:'Te piden ayuda', minLapso:2, d:'Un ex compañero, de los que jugaron con vos, quedó en la calle. Te pide plata.', opts:[
      { txt:'Ayudarlo y darle trabajo', ef:(s,g)=>{ s.patrimonio-=6; s.contactos+=12; g._vidaFlags.ayudo=true; return 'Le diste laburo en tu empresa. Se recuperó y nunca lo olvidó.'; } },
      { txt:'Un préstamo y nada más', ef:(s)=>{ s.patrimonio-=3; return 'Le pasaste unos pesos. Nunca te devolvió ni la llamada.'; } },
      { txt:'Cada uno se arregla como puede', ef:(s)=>{ s.contactos-=10; return 'Le dijiste que no. En el ambiente se supo y no cayó bien.'; } } ] },
    { t:'Oferta de compra', minLapso:3, d:'Un grupo internacional quiere comprarte todo. Es la cifra que soñaste, pero dejás de ser dueño.', opts:[
      { txt:'Vender y retirarme del todo', ef:(s,g)=>{ s.patrimonio+=35; s.riesgo-=25; g.dinero=(g.dinero||0)+5000000; return 'Vendiste todo. Ya no trabajás nunca más, ni vos ni tus nietos.'; } },
      { txt:'No vendo, esto lo hice yo', ef:(s)=>{ s.patrimonio+=8; s.riesgo+=8; return 'Seguiste al mando. La empresa lleva tu apellido y no lo vas a soltar.'; } } ] }
  ],
  escuela: [
    { t:'Abrís las puertas', d:'Primer día de la escuelita. Se anotaron doce pibes y llovió toda la mañana.', opts:[
      { txt:'Entrenar bajo la lluvia igual', ef:(s)=>{ s.pibes+=15; s.prestigio+=8; return 'Ninguno se fue. Esos doce se convirtieron en el núcleo duro de la escuela.'; } },
      { txt:'Suspender y reprogramar', ef:(s)=>{ s.pibes-=5; return 'Prudente, pero tres no volvieron.'; } } ] },
    { t:'Un pibe no puede pagar', d:'Uno de los chicos con más talento deja de venir: en la casa no llegan a la cuota.', opts:[
      { txt:'Que entrene gratis', ef:(s,g)=>{ s.economia-=8; s.pibes+=14; s.prestigio+=10; g._vidaFlags.becaPibe=true; return 'Lo becaste sin decirle a nadie. Años después debutó en primera y lo contó en su primera entrevista.'; } },
      { txt:'No puedo hacer excepciones', ef:(s)=>{ s.economia+=4; s.prestigio-=12; return 'Se fue a otra escuela. Terminó llegando igual, pero con otro escudo.'; } } ] },
    { t:'Un club grande quiere convenio', d:'Un club de primera te propone ser su filial: te mandan material y se llevan a los mejores.', opts:[
      { txt:'Firmar el convenio', ef:(s)=>{ s.economia+=20; s.prestigio+=15; s.pibes+=10; return 'Llegó material, canchas y visibilidad. Perdés a los cracks, pero los cracks llegan.'; } },
      { txt:'Seguir independiente', ef:(s)=>{ s.prestigio+=8; s.economia-=6; return 'Nadie te dice a quién formar ni a quién soltar. Cuesta más, pero es tuyo.'; } } ] },
    { t:'Padres complicados', d:'Un grupo de padres se pelea en el borde de la cancha durante un partido de niños.', opts:[
      { txt:'Suspender el partido y hablarles', ef:(s)=>{ s.prestigio+=14; s.pibes-=4; return 'Paraste todo y les hablaste a los padres. Se puso incómodo, pero no volvió a pasar.'; } },
      { txt:'Dejar que se acomode solo', ef:(s)=>{ s.prestigio-=12; s.pibes-=8; return 'Escaló. Se fueron varias familias y quedó fama de escuela conflictiva.'; } } ] },
    { t:'Debut de uno de los tuyos', minLapso:1, d:'Un chico que pasó por tus manos debuta en primera. Los medios te buscan.', opts:[
      { txt:'Ir a la cancha a verlo', ef:(s,g)=>{ s.prestigio+=20; s.pibes+=15; g._vidaFlags.formoCrack=true; return 'Estuviste en la tribuna llorando. Él te buscó con la mirada al entrar.'; } },
      { txt:'Es su momento, no el mío', ef:(s)=>{ s.prestigio+=8; return 'Lo viste por TV en la escuelita, rodeado de los que vienen atrás.'; } } ] },
    { t:'Se te cae el techo', minLapso:2, d:'Un temporal destruye el vestuario y parte del alambrado. No tenés seguro.', opts:[
      { txt:'Poner plata propia', ef:(s,g)=>{ s.economia-=22; s.pibes+=8; g.dinero=Math.max(0,(g.dinero||0)-90000); return 'Lo arreglaste de tu bolsillo. Los pibes no perdieron un solo entrenamiento.'; } },
      { txt:'Organizar una colecta del barrio', ef:(s)=>{ s.economia-=6; s.prestigio+=18; s.pibes+=12; return 'El barrio entero se puso la escuela al hombro. Fue más lindo que arreglarlo solo.'; } } ] },
    { t:'Te ofrecen franquiciar', minLapso:2, d:'Un inversor quiere abrir veinte sedes con tu nombre en todo el país.', opts:[
      { txt:'Escalar la escuela', ef:(s,g)=>{ s.economia+=28; s.prestigio+=10; s.pibes+=20; g._vidaFlags.franquicia=true; return 'Hoy hay miles de chicos entrenando con tu método en todo el país.'; } },
      { txt:'Una sola, hecha bien', ef:(s)=>{ s.prestigio+=15; return 'Preferiste conocer el nombre de cada pibe antes que tener veinte sedes.'; } } ] },
    { t:'Ya no das abasto', minLapso:3, d:'Estás grande y la escuela creció. No podés estar en todas las canchas como antes.', opts:[
      { txt:'Formar entrenadores que sigan mi línea', ef:(s)=>{ s.prestigio+=18; s.salud+=12; return 'Formaste formadores. Tu método vive sin que estés presente.'; } },
      { txt:'Seguir haciéndolo todo yo', ef:(s)=>{ s.salud-=18; s.prestigio+=6; return 'No delegaste nunca. Te dejó el cuerpo, pero cada pibe pasó por tus manos.'; } } ] }
  ],
  disfrutar: [
    { t:'El primer año sin fútbol', d:'Se terminó. Por primera vez en treinta años, en agosto no hay pretemporada.', opts:[
      { txt:'Viajar sin fecha de vuelta', ef:(s,g)=>{ s.felicidad+=18; s.soledad-=10; g.dinero=Math.max(0,(g.dinero||0)-120000); return 'Recorriste el mundo sin agenda. Descubriste que existía la vida.'; } },
      { txt:'Quedarme quieto un tiempo', ef:(s)=>{ s.soledad+=15; s.felicidad-=8; return 'Te costó muchísimo. El vacío del después es más duro de lo que cuentan.'; } } ] },
    { t:'Tus hijos crecieron sin vos', d:'Te das cuenta de que te perdiste años enteros entre concentraciones y viajes.', opts:[
      { txt:'Hablarlo de frente y recuperar el tiempo', ef:(s)=>{ s.familia+=25; s.felicidad+=15; s.soledad-=15; return 'Fue una charla larga y difícil. Hoy son lo más cercano que tenés.'; } },
      { txt:'No sé cómo abrir ese tema', ef:(s)=>{ s.familia-=12; s.soledad+=15; return 'Nunca lo hablaste. Se saludan en los cumpleaños y poco más.'; } } ] },
    { t:'Los ex compañeros organizan un partido', d:'Los del plantel campeón arman un partido a beneficio. Todos con veinte kilos de más.', opts:[
      { txt:'Ir y jugarlo en serio', ef:(s)=>{ s.felicidad+=20; s.soledad-=18; s.salud-=6; return 'Te desgarraste a los quince minutos y fue el día más feliz en años.'; } },
      { txt:'Ir sólo a saludar', ef:(s)=>{ s.felicidad+=8; s.soledad-=8; return 'Fuiste de traje, saludaste a todos y te fuiste temprano.'; } } ] },
    { t:'Te ofrecen volver al fútbol', minLapso:1, d:'Un club te llama para sumarte al cuerpo técnico. La pelota siempre vuelve a buscarte.', opts:[
      { txt:'Volver, lo extraño demasiado', ef:(s,g)=>{ s.felicidad+=12; s.familia-=10; s.soledad-=15; g._vidaFlags.volvioAlFutbol=true; return 'Volviste al vestuario. El olor a linimento te devolvió veinte años.'; } },
      { txt:'Ya está, cerré esa puerta', ef:(s)=>{ s.felicidad+=10; s.familia+=12; return 'Dijiste que no sin dudar. Estás en paz con lo que fuiste.'; } } ] },
    { t:'Nacen los nietos', minLapso:2, d:'Sos abuelo. Y esta vez no hay concentración que te lo impida.', opts:[
      { txt:'Estar en todo, malcriarlos', ef:(s,g)=>{ s.felicidad+=25; s.familia+=20; s.soledad-=20; g.dinero=Math.max(0,(g.dinero||0)-40000); return 'Los buscás del colegio, les comprás todo y les enseñás a pegarle con la zurda.'; } },
      { txt:'Ser abuelo de visitas', ef:(s)=>{ s.felicidad+=10; s.familia+=8; return 'Los ves los domingos. Te quieren, pero a la distancia.'; } } ] },
    { t:'Un susto de salud', minLapso:3, d:'Un dolor en el pecho te lleva a la guardia. Los médicos hablan bajito entre ellos.', opts:[
      { txt:'Operarme y cuidarme en serio', ef:(s,g)=>{ s.salud+=22; s.felicidad+=8; g.dinero=Math.max(0,(g.dinero||0)-150000); return 'Te operaron a tiempo. Cambiaste la dieta, caminás todos los días y estás mejor que a los cincuenta.'; } },
      { txt:'Fue un susto nomás, sigo igual', ef:(s)=>{ const mal=Math.random()<.65; s.salud-=mal?30:10; return mal?'Volviste peor a los dos años. Perdiste autonomía y te arrepentís de no haber parado.':'Zafaste de milagro. No lo volvés a contar.'; } } ] },
    { t:'El club te quiere homenajear', minLapso:2, d:'Tu club te propone un homenaje en el entretiempo del clásico, con el estadio lleno.', opts:[
      { txt:'Aceptar y dar la vuelta olímpica', ef:(s,g)=>{ s.felicidad+=22; s.soledad-=18; g._vidaFlags.homenajeado=true; return 'Cincuenta mil personas cantando tu nombre. Lloraste como un pibe en el medio de la cancha.'; } },
      { txt:'Prefiero el bajo perfil', ef:(s)=>{ s.felicidad+=6; s.soledad+=8; return 'Dijiste que no. Algunos entendieron; otros pensaron que estabas dolido.'; } } ] },
    { t:'Escribís tus memorias', minLapso:2, d:'Una editorial quiere tu autobiografía. Implica revisar todo lo que hiciste, también lo que duele.', opts:[
      { txt:'Contar todo, sin maquillaje', ef:(s,g)=>{ s.felicidad+=15; g.dinero=(g.dinero||0)+200000; g._vidaFlags.libro=true; return 'Contaste hasta lo que te avergonzaba. El libro ayudó a mucha gente que se sintió identificada.'; } },
      { txt:'Sólo la parte linda', ef:(s,g)=>{ g.dinero=(g.dinero||0)+60000; return 'Un libro correcto y olvidable. Vos sabés lo que dejaste afuera.'; } } ] }
  ]
};

// ── BANCO EXTRA DE EVENTOS ───────────────────────────────────────────────────
// El reclamo mas fuerte era que "siempre pasa lo mismo": con 7-9 eventos por rol
// el banco se agotaba en dos tramos y empezaba a reciclar. Acá se triplica el
// repertorio de cada rol. Va en un objeto aparte y se fusiona abajo: editar el
// literal gigante de arriba es fragil, y asi se puede seguir sumando sin riesgo.
const VIDA_EVENTOS_EXTRA = {
  dt: [
    { t:'Te echan del club', minLapso:1, d:'Perdiste tres clásicos seguidos. El presidente te espera en su oficina con cara de velorio.', opts:[
      { txt:'Irme con la frente alta', ef:(s,g)=>{ s.presion=25; s.resultados-=6; g._vidaFlags.despedido=true; return 'Saludaste a cada empleado del club antes de irte. Eso también se recuerda.'; } },
      { txt:'Pelear la indemnización', ef:(s,g)=>{ g.dinero=(g.dinero||0)+ri(180000,420000); s.plantel-=8; return 'Cobraste hasta el último peso. Te ganaste fama de conflictivo.'; } } ] },
    { t:'Otro club te viene a buscar', minLapso:1, d:'Un club más grande te ofrece hacerte cargo del proyecto. Firmarías mañana mismo.', opts:[
      { txt:'Aceptar el salto', ef:(s,g)=>{ s.presion+=18; s.resultados+=8; g.dinero=(g.dinero||0)+ri(200000,600000); g._vidaFlags.cambioClub=true; return 'Cambiaste de club y de escala. Ahora te miran de verdad.'; } },
      { txt:'Quedarme donde estoy', ef:(s)=>{ s.plantel+=16; s.presion-=8; return 'Renovaste. El vestuario te lo agradeció con puntos.'; } } ] },
    { t:'Mercado de pases', d:'Tenés presupuesto para un refuerzo. El scout te trae tres carpetas distintas.', opts:[
      { txt:'Un crack caro y consagrado', ef:(s,g)=>{ g.dinero=Math.max(0,(g.dinero||0)-ri(50000,150000)); s.resultados+=12; s.plantel-=4; return 'Llegó la figura. Sube el nivel, pero también los egos.'; } },
      { txt:'Tres pibes con hambre', ef:(s)=>{ s.plantel+=14; s.resultados+=5; return 'Apostaste a la juventud. El equipo corre como nunca.'; } },
      { txt:'No traer a nadie y confiar en lo que tengo', ef:(s)=>{ s.plantel+=18; s.resultados-=3; return 'Les dijiste que confiabas en ellos. Se rompieron el alma para devolvértelo.'; } } ] },
    { t:'El equipo se va al descenso', minLapso:2, d:'Faltan tres fechas y estás en zona roja. El club nunca descendió en su historia.', opts:[
      { txt:'Jugármela con los pibes de la cantera', ef:(s,g)=>{ const b=Math.random()<.5; s.resultados+=b?18:-14; if(!b) g._vidaFlags.descendio=true; return b?'Los pibes salvaron al club. Una de esas noches que no se olvidan.':'Se consumó el descenso. El estadio en silencio, y vos en el medio.'; } },
      { txt:'Jugar con los veteranos y especular', ef:(s,g)=>{ const b=Math.random()<.42; s.resultados+=b?12:-16; if(!b) g._vidaFlags.descendio=true; return b?'Zafaron en la última fecha, sufriendo.':'No alcanzó. Descendieron y te fuiste esa misma noche.'; } } ] },
    { t:'Tu hijo está para debutar', minLapso:2, req:(g)=>!!(g.hijos && g.hijos.some(h=>h.futbol)), d:'En la cantera hay un apellido conocido: el tuyo. El pibe está para jugar, pero si lo ponés van a decir que es por vos.', opts:[
      { txt:'Hacerlo debutar, se lo ganó', ef:(s,g)=>{ s.plantel-=5; s.felicidad=(s.felicidad||50)+20; g._vidaFlags.debutoHijo=true; return 'Lo pusiste y la rompió. Se abrazaron en el medio de la cancha con el estadio de pie.'; } },
      { txt:'Que lo haga debutar otro técnico', ef:(s)=>{ s.credibilidad=(s.credibilidad||50)+8; return 'Preferiste que nadie dudara de él. Debutó dos años después, sin tu apellido encima.'; } } ] },
    { t:'Guerra con el árbitro', d:'Te expulsaron por protestar y el informe arbitral te deja al borde de una fecha larga de suspensión.', opts:[
      { txt:'Pedir disculpas públicas', ef:(s)=>{ s.presion-=10; s.credibilidad=(s.credibilidad||50)+6; return 'Bajaste el tono. El tribunal te dio la mínima.'; } },
      { txt:'Redoblar la apuesta en conferencia', ef:(s)=>{ s.presion+=16; s.plantel+=12; return 'Te comiste seis fechas, pero el plantel vio que los bancabas contra todos.'; } } ] },
    { t:'Te llaman de la selección juvenil', minLapso:2, d:'La federación te ofrece el proceso Sub-20. Menos plata, menos ruido, más semilla.', opts:[
      { txt:'Tomar el proceso juvenil', ef:(s,g)=>{ s.presion-=12; g._vidaFlags.juveniles=true; return 'Trabajaste con una camada entera. Diez de esos pibes llegaron a Europa.'; } },
      { txt:'Seguir en clubes', ef:(s)=>{ s.resultados+=6; return 'Te quedaste donde se juega todas las semanas.'; } } ] },
    { t:'Copa internacional', minLapso:1, d:'Clasificaste a la copa continental. Es la vitrina más grande a la que llegaste como técnico.', opts:[
      { txt:'Poner todo en la copa', ef:(s,g)=>{ const b=Math.random()<.45; s.resultados+=b?18:-8; if(b){ g.titulos=(g.titulos||0)+1; if(!g.vitrina)g.vitrina=[]; g.vitrina.push({comoDT:true,nombre:'Copa internacional (DT)',edad:g.vidaEdad,club:'Como DT'}); } return b?'Levantaste la copa afuera. Entraste en la historia grande del club.':'Quedaste en semis. Doloroso, pero el club creció.'; } },
      { txt:'Priorizar la liga local', ef:(s)=>{ s.resultados+=10; s.presion-=6; return 'Cuidaste el torneo doméstico. Menos épica, más puntos.'; } } ] },
    { t:'Un referente te pide salir del equipo', d:'El capitán, ídolo del club, ya no rinde. Todos lo ven menos él.', opts:[
      { txt:'Sentarlo y bancar el quilombo', ef:(s)=>{ s.resultados+=12; s.plantel-=14; s.presion+=10; return 'Lo sacaste del once. Media hinchada te puteó, pero el equipo mejoró.'; } },
      { txt:'Darle una despedida digna', ef:(s)=>{ s.plantel+=18; s.resultados-=4; return 'Le armaste el partido despedida. El vestuario entendió qué clase de tipo sos.'; } } ] }
  ],
  comentarista: [
    { t:'Te mandan al Mundial', minLapso:1, d:'El canal te manda un mes entero a cubrir la Copa del Mundo.', opts:[
      { txt:'Ir y dejar la vida ahí', ef:(s,g)=>{ s.rating+=20; s.credibilidad+=10; g.dinero=(g.dinero||0)+ri(60000,140000); return 'Relataste una final de Mundial. Muy poca gente puede decir eso.'; } },
      { txt:'Quedarme con la familia', ef:(s)=>{ s.rating-=8; s.felicidad=(s.felicidad||50)+14; return 'Lo viste por tele, con los tuyos al lado. No te arrepentís.'; } } ] },
    { t:'Un blooper en vivo', d:'Confundiste dos nombres y dijiste una barbaridad al aire. Ya está en todos lados.', opts:[
      { txt:'Reírme de mí mismo al día siguiente', ef:(s)=>{ s.rating+=14; s.credibilidad-=3; return 'Lo tomaste con humor y te ganaste a la gente. El clip todavía circula.'; } },
      { txt:'Hacer como que no pasó', ef:(s)=>{ s.credibilidad-=10; s.polemica+=6; return 'El silencio quedó peor que el error.'; } } ] },
    { t:'Te ofrecen un podcast propio', minLapso:1, d:'Sin canal, sin filtro, sin jefes. Solo vos y un micrófono.', opts:[
      { txt:'Armarlo y decir lo que pienso', ef:(s,g)=>{ s.credibilidad+=16; s.rating+=10; g.dinero=(g.dinero||0)+ri(80000,250000); g._vidaFlags.podcast=true; return 'Tu podcast se volvió referencia. Los jugadores van ahí antes que a la tele.'; } },
      { txt:'No, prefiero la estructura del canal', ef:(s)=>{ s.rating+=5; return 'Te quedaste en lo seguro.'; } } ] },
    { t:'Presión del sponsor', d:'Un anunciante pide que dejes de criticar al club que le pone la plata al programa.', opts:[
      { txt:'Mandarlos al diablo', ef:(s,g)=>{ s.credibilidad+=22; s.rating-=6; g.dinero=Math.max(0,(g.dinero||0)-ri(20000,80000)); return 'Perdiste el sponsor y ganaste respeto. La gente sabe cuándo alguien no se vende.'; } },
      { txt:'Bajar un cambio', ef:(s)=>{ s.credibilidad-=18; s.rating+=4; return 'Se te notó el freno de mano. Los que te seguían por honesto se fueron.'; } } ] },
    { t:'Entrevista al crack del momento', d:'Tenés media hora a solas con el mejor jugador del mundo.', opts:[
      { txt:'Preguntarle lo incómodo', ef:(s)=>{ s.credibilidad+=18; s.polemica+=14; s.rating+=12; return 'La nota se citó en todos lados. Nadie se había animado a preguntarle eso.'; } },
      { txt:'Hacerla amable y ganármelo', ef:(s)=>{ s.rating+=10; s.credibilidad-=4; return 'Quedaron bien. Te va a dar la próxima nota también.'; } } ] },
    { t:'Debate a los gritos en el panel', d:'Un panelista te trata de "ex jugador resentido" en vivo.', opts:[
      { txt:'Contestarle con datos', ef:(s)=>{ s.credibilidad+=16; s.rating+=8; return 'Lo dejaste sin respuesta con números. Clase magistral.'; } },
      { txt:'Contestarle a los gritos', ef:(s)=>{ s.polemica+=22; s.rating+=16; s.credibilidad-=10; return 'Se armó un escándalo. Rating récord y una citación de la gerencia.'; } } ] },
    { t:'Te ofrecen volver al vestuario', minLapso:2, d:'Un club te tienta para ser su director deportivo. Dejarías el micrófono.', opts:[
      { txt:'Volver al fútbol de verdad', ef:(s,g)=>{ g._vidaFlags.volvioAlClub=true; s.credibilidad+=6; return 'Colgaste el micrófono. Extrañabas el olor a vestuario.'; } },
      { txt:'Quedarme en la tele', ef:(s)=>{ s.rating+=10; return 'Elegiste la cabina. Es tu lugar en el mundo ahora.'; } } ] }
  ],
  dirigente: [
    { t:'Elecciones en el club', minLapso:1, d:'Se vienen elecciones. Podés presentarte a presidente o quedarte en tu cargo.', opts:[
      { txt:'Presentarme a presidente', ef:(s,g)=>{ const b=Math.random()<.55; if(b) g._vidaFlags.presidente=true; return b?'Ganaste la elección. El club es tuyo para conducir.':'Perdiste por poco. Igual quedaste como referente del socio.'; } },
      { txt:'Apoyar a otro y quedarme atrás', ef:(s)=>{ s.presion=(s.presion||50)-10; return 'Preferiste el poder sin la foto. A veces rinde más.'; } } ] },
    { t:'Obra del estadio', minLapso:1, d:'El estadio se cae a pedazos. Remodelarlo cuesta una fortuna y varios años.', opts:[
      { txt:'Endeudarme y hacerlo', ef:(s,g)=>{ g._vidaFlags.estadio=true; return 'Cinco años después, el club juega en un estadio moderno con tu nombre en una placa.'; } },
      { txt:'Parchear lo justo', ef:(s)=>{ return 'Aguantó unos años más. La deuda no creció, el club tampoco.'; } } ] },
    { t:'Contratar al nuevo DT', d:'Se fue el técnico. Tenés que elegir quién agarra el equipo.', opts:[
      { txt:'Un nombre grande y caro', ef:(s,g)=>{ g.dinero=Math.max(0,(g.dinero||0)-ri(30000,90000)); return 'Trajiste un técnico de renombre. La ilusión volvió al socio.'; } },
      { txt:'Un ex compañero mío', ef:(s)=>{ return 'Le diste la oportunidad a un amigo. Si sale mal, te la van a cobrar a vos.'; } },
      { txt:'El técnico de la cantera', ef:(s)=>{ return 'Apostaste a la casa. Al club le cambió la identidad.'; } } ] },
    { t:'Crisis económica del club', minLapso:2, d:'No hay plata ni para los sueldos. El plantel amenaza con no entrenar.', opts:[
      { txt:'Poner plata de mi bolsillo', ef:(s,g)=>{ g.dinero=Math.max(0,(g.dinero||0)-ri(100000,400000)); return 'Bancaste vos los sueldos. Nadie se enteró, pero el club sobrevivió.'; } },
      { txt:'Vender a la joya del plantel', ef:(s)=>{ return 'Vendiste al mejor y pagaste todo. Deportivamente dolió un año entero.'; } } ] },
    { t:'Escándalo de un jugador', d:'Un titular apareció en un video que no debería existir. La prensa lo tiene.', opts:[
      { txt:'Bancarlo puertas adentro', ef:(s)=>{ return 'Lo protegiste y lo hiciste trabajar el doble. Terminó siendo capitán.'; } },
      { txt:'Rescindirle el contrato ya', ef:(s)=>{ return 'Cortaste por lo sano. El vestuario entendió el mensaje.'; } } ] }
  ],
  empresario: [
    { t:'Abrir una segunda sucursal', minLapso:1, d:'Al negocio le va bien. Podés abrir otro local o quedarte con lo seguro.', opts:[
      { txt:'Expandirme', ef:(s,g)=>{ const b=Math.random()<.6; g.dinero=(g.dinero||0)+(b?ri(150000,500000):-ri(80000,250000)); return b?'La segunda sucursal explotó. Ya sos una marca.':'La segunda no funcionó. Perdiste plata y aprendiste caro.'; } },
      { txt:'Quedarme con lo que tengo', ef:(s,g)=>{ g.dinero=(g.dinero||0)+ri(30000,80000); return 'Sin sobresaltos. Rinde poco pero rinde siempre.'; } } ] },
    { t:'Te ofrecen comprar un club', minLapso:2, d:'Un club chico está en venta. Con lo que tenés, podés ser dueño.', opts:[
      { txt:'Comprarlo y meterme de lleno', ef:(s,g)=>{ g.dinero=Math.max(0,(g.dinero||0)-ri(400000,1200000)); g._vidaFlags.duenoClub=true; return 'Sos dueño de un club de fútbol. El pibe del potrero no lo hubiera creído.'; } },
      { txt:'Mirar de afuera', ef:(s)=>{ return 'Los números no cerraban. El fútbol como negocio es otra cosa.'; } } ] },
    { t:'Un socio te quiere estafar', d:'Los números del balance no cierran y tu socio esquiva las reuniones.', opts:[
      { txt:'Ir a fondo con abogados', ef:(s,g)=>{ g.dinero=(g.dinero||0)+ri(50000,300000); return 'Recuperaste casi todo. Perdiste un amigo de veinte años.'; } },
      { txt:'Cortar por lo sano y salir', ef:(s,g)=>{ g.dinero=Math.max(0,(g.dinero||0)-ri(50000,200000)); return 'Perdiste plata pero dormís tranquilo.'; } } ] },
    { t:'Invertir en tecnología deportiva', minLapso:1, d:'Una startup de análisis de datos para clubes te ofrece entrar como inversor.', opts:[
      { txt:'Entrar fuerte', ef:(s,g)=>{ const b=Math.random()<.5; g.dinero=(g.dinero||0)+(b?ri(300000,1500000):-ri(100000,400000)); return b?'La startup se vendió a un gigante. Multiplicaste la inversión por diez.':'No prosperó. Escribiste esa plata como aprendizaje.'; } },
      { txt:'Pasar, no entiendo del tema', ef:(s)=>{ return 'Te quedaste afuera. Dos años después leíste que se vendieron por millones.'; } } ] },
    { t:'Tu marca de ropa deportiva', minLapso:1, d:'Podés lanzar tu propia línea con tu nombre y tu número.', opts:[
      { txt:'Lanzarla a lo grande', ef:(s,g)=>{ const b=Math.random()<.58; g.dinero=(g.dinero||0)+(b?ri(200000,900000):-ri(60000,200000)); return b?'Se agotó la primera camada. Los pibes usan tu número en la calle.':'Quedó stock sin vender en un depósito. Doloroso.'; } },
      { txt:'Licenciar el nombre y cobrar', ef:(s,g)=>{ g.dinero=(g.dinero||0)+ri(80000,220000); return 'Cobrás regalías sin mover un dedo. Aburrido y rentable.'; } } ] }
  ],
  escuela: [
    { t:'Un pibe que no tiene para el micro', d:'El más talentoso de la escuelita falta seguido. No es vagancia: no tiene plata para viajar.', opts:[
      { txt:'Pagarle el viaje y la comida', ef:(s,g)=>{ g.dinero=Math.max(0,(g.dinero||0)-ri(5000,20000)); s.felicidad=(s.felicidad||50)+18; g._vidaFlags.becoPibe=true; return 'Diez años después debutó en primera y lo primero que dijo fue tu nombre.'; } },
      { txt:'No puedo hacerlo con todos', ef:(s)=>{ s.felicidad=(s.felicidad||50)-10; return 'Dejó de venir. Nunca supiste qué fue de él y eso te quedó adentro.'; } } ] },
    { t:'Un club grande quiere tus juveniles', minLapso:1, d:'Vienen a llevarse a los tres mejores de la categoría, sin dejar casi nada.', opts:[
      { txt:'Negociar duro por los pibes', ef:(s,g)=>{ g.dinero=(g.dinero||0)+ri(40000,180000); return 'Les sacaste un porcentaje de futura venta. Los pibes se fueron cubiertos.'; } },
      { txt:'Dejarlos ir, es su oportunidad', ef:(s)=>{ s.felicidad=(s.felicidad||50)+10; return 'No cobraste un peso. Los tres llegaron a primera y siempre volvieron a saludarte.'; } } ] },
    { t:'Gira internacional con los chicos', minLapso:1, d:'Los invitan a un torneo en Europa. Hay que juntar la plata del pasaje.', opts:[
      { txt:'Salir a golpear puertas', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+16; return 'Rifas, asados y sponsors chicos. Viajaron todos. Ninguno lo va a olvidar.'; } },
      { txt:'Que viajen solo los que pueden pagarlo', ef:(s)=>{ s.felicidad=(s.felicidad||50)-12; return 'Se rompió el grupo. Los que quedaron nunca lo dijeron pero lo sintieron.'; } } ] },
    { t:'Una nena quiere jugar en tu escuela', d:'Se anota una piba en la categoría de varones. Algunos padres se quejan.', opts:[
      { txt:'Que juegue, y el que se queje que se vaya', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+18; g._vidaFlags.abrioFemenino=true; return 'Abriste la rama femenina. Hoy tenés cuatro categorías de mujeres y una jugando en la selección.'; } },
      { txt:'Derivarla a otro lado', ef:(s)=>{ s.felicidad=(s.felicidad||50)-14; return 'Se fue a otra escuela. Años después la viste en la tele con la celeste puesta.'; } } ] },
    { t:'Te ofrecen dirigir la cantera de un club grande', minLapso:2, d:'Un club de primera quiere que armes su formativa entera.', opts:[
      { txt:'Aceptar y llevarme el método', ef:(s,g)=>{ g.dinero=(g.dinero||0)+ri(100000,300000); g._vidaFlags.canteraGrande=true; return 'Armaste una formativa que sacó jugadores durante veinte años.'; } },
      { txt:'Quedarme en el barrio', ef:(s)=>{ s.felicidad=(s.felicidad||50)+14; return 'Te quedaste donde te conocen por el nombre. No todo es escalar.'; } } ] }
  ],
  disfrutar: [
    { t:'Viaje que siempre postergaste', d:'Toda la vida dijiste "cuando me retire". Bueno, ya está.', opts:[
      { txt:'Irme dos meses a recorrer', ef:(s,g)=>{ g.dinero=Math.max(0,(g.dinero||0)-ri(20000,90000)); s.felicidad+=22; s.soledad-=10; return 'Volviste distinto. Hay cosas que no se ven desde un hotel de concentración.'; } },
      { txt:'Prefiero mi casa y mi rutina', ef:(s)=>{ s.felicidad+=6; return 'La rutina también es un lujo cuando elegiste tenerla.'; } } ] },
    { t:'Partido de veteranos', d:'Se juntan los campeones de aquel equipo para un partido a beneficio.', opts:[
      { txt:'Jugarlo aunque me duela todo', ef:(s)=>{ s.felicidad+=20; s.soledad-=16; s.salud-=6; return 'Corriste veinte minutos y te dolió una semana. Valió cada minuto.'; } },
      { txt:'Ir a mirar desde la tribuna', ef:(s)=>{ s.felicidad+=10; s.soledad-=8; return 'Los viste a todos, te reíste de todo. También es estar.'; } } ] },
    { t:'Una leyenda te invita a su casa', minLapso:1, d:'Uno de los más grandes de la historia te manda un mensaje: quiere que vayas a comer a su casa.', opts:[
      { txt:'Ir sin dudarlo', ef:(s,g)=>{ s.felicidad+=24; s.soledad-=14; g._vidaFlags.leyendaAmiga=true; return 'Comieron, hablaron de fútbol seis horas y te mostró su perro, que es del tamaño de un ternero. Quedaron amigos.'; } },
      { txt:'Agradecer y no ir, me da vergüenza', ef:(s)=>{ s.felicidad-=6; return 'No fuiste. Cada tanto te preguntás cómo hubiera sido.'; } } ] },
    { t:'Fútbol en la playa con los cracks', minLapso:1, d:'Te invitan a un picadito en la playa con varios ex cracks. Cámaras incluidas.', opts:[
      { txt:'Ir y jugar descalzo como en el potrero', ef:(s)=>{ s.felicidad+=20; s.soledad-=12; return 'Volviste a ser el pibe del baldío por dos horas. El video lo vieron millones.'; } },
      { txt:'Paso, ya no estoy para eso', ef:(s)=>{ s.felicidad-=4; return 'Lo miraste por Instagram desde el sillón.'; } } ] },
    { t:'La velada del año', minLapso:1, d:'Te proponen una pelea de exhibición en un evento de boxeo. Enfrente: tu rival de toda la vida.', opts:[
      { txt:'Aceptar la pelea', ef:(s,g)=>{ const b=Math.random()<.5; g.dinero=(g.dinero||0)+ri(150000,600000); s.felicidad+=b?20:4; g._vidaFlags.velada=true; return b?'Le ganaste por puntos. Se abrazaron al final y cerraron treinta años de rivalidad.':'Perdiste por decisión. Igual se abrazaron: ya nada de eso importaba.'; } },
      { txt:'No me presto al circo', ef:(s)=>{ s.felicidad+=4; return 'Dijiste que no. Algunos te trataron de aburrido, vos dormiste bien.'; } } ] },
    { t:'Poker con los pesos pesados', minLapso:1, d:'Un ex compañero te invita a una noche de poker con gente muy conocida y apuestas altas.', opts:[
      { txt:'Sentarme a la mesa', ef:(s,g)=>{ const b=Math.random()<.45; g.dinero=(g.dinero||0)+(b?ri(30000,200000):-ri(20000,150000)); s.felicidad+=b?12:-8; return b?'Te levantaste de la mesa con más plata de la que llevaste. Y con anécdotas.':'Perdiste una fortuna en una noche. Nunca más volviste.'; } },
      { txt:'Ir solo a mirar y charlar', ef:(s)=>{ s.felicidad+=10; s.soledad-=10; return 'No apostaste un peso y te reíste toda la noche. Ganancia igual.'; } } ] },
    { t:'Vida de fiestas', d:'Después de años de dieta y concentración, tenés todas las puertas abiertas y ningún horario.', opts:[
      { txt:'Salir todo lo que no salí', ef:(s,g)=>{ s.felicidad+=16; s.salud-=14; g._vidaFlags.fiestero=true; return 'Te sacaste las ganas. El cuerpo pasó factura, pero te reíste mucho.'; } },
      { txt:'Vida tranquila y familia', ef:(s)=>{ s.felicidad+=12; s.salud+=10; s.soledad-=14; return 'Elegiste las cenas en casa. Los tuyos lo notaron.'; } } ] },
    { t:'Te licencian para un videojuego', minLapso:1, d:'Una desarrolladora quiere tu cara y tu nombre para un juego con vos de protagonista.', opts:[
      { txt:'Firmar la licencia', ef:(s,g)=>{ g.dinero=(g.dinero||0)+ri(200000,800000); s.felicidad+=14; g._vidaFlags.videojuego=true; return 'Salió el juego. Millones de pibes juegan siendo vos. Tu nieto es el que más lo juega.'; } },
      { txt:'Mi imagen no se vende', ef:(s)=>{ s.felicidad+=4; return 'Dijiste que no. Tu imagen sigue siendo solo tuya.'; } } ] }
  ]
};
// Fusion: el banco extra se suma al principal al cargar el archivo.
Object.keys(VIDA_EVENTOS_EXTRA).forEach(rol=>{
  if (VIDA_EVENTOS[rol]) VIDA_EVENTOS[rol] = VIDA_EVENTOS[rol].concat(VIDA_EVENTOS_EXTRA[rol]);
  else VIDA_EVENTOS[rol] = VIDA_EVENTOS_EXTRA[rol].slice();
});

// ── ARRANQUE DEL MODO VIDA ───────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
// SEGUNDA VIDA JUGABLE
// El personaje deja de ser una ilustración fija en el medio de la pantalla. Ahora
// se camina: flechas o A/D en PC, botones en pantalla o toque en el piso en el
// celular. Hay escenarios que se recorren (casa, barrio, trabajo), personajes que
// están AHÍ parados esperándote y objetos con los que se interactúa. Nada de "te
// ofrecen algo" por texto: el que te ofrece está dibujado y hay que ir hasta él.
// ══════════════════════════════════════════════════════════════════════════════
// `mundo` dice QUÉ etapa se está caminando: el potrero de pibe, las juveniles, el
// club ya como profesional, o la vida después del retiro. Cada mundo aporta sus
// escenarios, su gente y sus cosas para hacer; el motor (caminar, cámara,
// cercanía, controles) es siempre el mismo.
const VJ = { activo:false, mundo:'vida', escena:'casa', x:120, dir:1, mov:0, pose:'idle', raf:0, ultT:0, hot:null, hotspots:[], destino:null, keys:{}, onKeyDown:null, onKeyUp:null, onResize:null, ocio:0, meta:null };

// Edad con la que se dibuja al jugador en el mundo actual.
function vjEdad(){
  if (VJ.mundo === 'vida') return G ? (G.vidaEdad || 40) : 40;
  if (VJ.mundo === 'potrero') return (_draft && _draft._potEdad) || 12;
  return G ? G.edad : 20;
}
// Ropa según el mundo, el rol, la etapa y dónde está. En casa nadie anda de traje;
// en el potrero se juega de calle; en el club, con el kit del club.
function vjRopa(){
  // Si te vestiste vos, mandás vos — salvo adentro de una cancha, donde va el kit.
  const enCancha = ['baldio','predio','cancha'].indexOf(VJ.escena) >= 0;
  if (G && G.gestion && G.gestion.esSeleccion && VJ.escena === 'trabajo') return 'traje';
  if (G && G.ropaElegida && !enCancha && !(G.avatar && G.avatar.preso)) return G.ropaElegida;
  if (VJ.mundo === 'potrero') return VJ.escena === 'baldio' ? null : 'calle';
  if (VJ.mundo === 'juveniles') return VJ.escena === 'pension' ? 'calle' : null;
  if (VJ.mundo === 'club') return (VJ.escena === 'oficina' || VJ.escena === 'casa') ? 'calle' : null;
  if(!G) return 'calle';
  if(G.avatar && G.avatar.preso) return null;
  const edad = G.vidaEdad || 40;
  if (VJ.escena !== 'trabajo') return edad >= 66 ? 'jubilado' : 'calle';
  if (G.vidaPausa > 0) return edad >= 66 ? 'jubilado' : 'calle';
  return { dt:'dt', comentarista:'tv', dirigente:'traje', empresario:'empresario', escuela:'escuela',
           disfrutar: edad >= 66 ? 'jubilado' : 'calle' }[G.vidaRol] || 'calle';
}
// Kit con el que se dibuja cuando NO lleva ropa de calle (mundos de fútbol).
function vjKit(){
  if (VJ.mundo === 'potrero') { const k = kitDe(_draft ? _draft.pais : 'Uruguay'); return k; }
  if (!G) return { base:'#3a4550', alt:'#8894a0', txt:'#fff', tipo:'solid' };
  return kitClub(G.club, G.clubPais || G.pais);
}
function vjSpriteJugador(pose){
  const ropa = vjRopa();
  const av = (G && G.avatar) || (_draft && _draft.avatar) || avatarDefault();
  const k = vjKit();
  const num = (VJ.mundo === 'vida') ? '' : String((G && G.num) || (_draft && _draft.num) || '');
  return avatarSprite(av, { edad:vjEdad(), escala:2.4, pose:pose||'idle', ropa: ropa||undefined,
    kitBase:k.base, kitAlt:k.alt, kitTxt:k.txt, kitTipo:k.tipo, num: ropa?'':num, apellido:'' });
}
// Nombre estable para cada personaje del mundo (siempre el mismo por semilla).
const VJ_NOMBRES = ['Ferreyra','Cardozo','Almeida','Sosa','Benítez','Núñez','Vargas','Ibáñez','Quintana',
  'Bermúdez','Olivera','Rojas','Silveira','Acuña','Zambrano','Da Silva','Moretti','Correa','Techera',
  'Lemos','Pereyra','Cabrera','Méndez','Larrosa','Fagúndez','Bentancur','Viera','Umpiérrez'];
function vjNombreNPC(semilla, gen){
  let h = 0; const t = String(semilla || '');
  for(let i=0;i<t.length;i++) h = (h*31 + t.charCodeAt(i)) >>> 0;
  // Si estás jugando en otro país, la gente de alrededor tiene apellidos de ahí.
  const pais = (G && (VJ.escena === 'casa' || VJ.escena === 'barrio' ? G.pais : (G.clubPais || G.pais))) || 'Uruguay';
  const L = APELLIDOS_PAIS[pais] || VJ_NOMBRES;
  // NOMBRE + APELLIDO. Con el apellido solo, y con listas de 20 entradas, el
  // veterano de primera y el compañero de pensión terminaban llamándose igual una
  // de cada veinte veces. Con nombre de pila el choque es prácticamente imposible,
  // y además el nombre respeta el género del personaje.
  if (gen == null) gen = ((h >>> 17) % 100) < 50 ? 'f' : 'm';
  const pila = (gen === 'f' ? NOMBRES_F : NOMBRES_M)[(h >>> 5) % (gen === 'f' ? NOMBRES_F : NOMBRES_M).length];
  return pila + ' ' + L[h % L.length];
}

// Género de un personaje de la escena. Si tiene nombre propio, MANDA EL NOMBRE:
// no puede llamarse Don Aníbal y estar dibujado con pollera.
function vjGen(h){
  if (!h) return null;
  if (h.gen) return h.gen;
  if (h.nombre){
    // Se mira la última palabra: "Don Aníbal" → Aníbal, "Paula Suárez" → Suárez no
    // sirve, así que se prueba también la primera y gana la que esté en las listas.
    const partes = String(h.nombre).trim().split(/\s+/);
    for (const w of partes){
      const bajo = w.toLowerCase();
      if (NOMBRES_F.concat(NOMBRES_PAREJA_F).some(x=>x.toLowerCase()===bajo)) return 'f';
      if (NOMBRES_M.concat(NOMBRES_PAREJA_M).some(x=>x.toLowerCase()===bajo)) return 'm';
    }
    return generoDe(partes[partes.length-1]);
  }
  // Sin nombre y sin gen explícito: se deduce de la SEMILLA, igual que el sprite.
  // Antes el nombre lo sorteaba 50/50 por hash y el dibujo lo sacaba del rol, así
  // que un hincha salía llamándose "Valentina" con cuerpo y cara de hombre.
  if (h.semilla){ const g = generoDeSemilla(h.semilla); if (g) return g; }
  return null;
}
// Vecinos, familiares, dirigentes... cada uno con su cara, estable por nombre.
// `gen` ('m'/'f') fuerza el género; si no se pasa, sale del hash.
// Roles que el juego nombra SIEMPRE en masculino o en femenino en sus textos.
// Si el sprite sale con el género equivocado, el texto y el dibujo se contradicen
// ("tu amigo" dibujado como mujer), que es el error más caro de todos.
const NPC_ROL_GEN = [
  [/(repre|agente|jefe|dirigent|presidente|tecnico|técnico|dt|entrenador|ojeador|scout|periodista|comentarista|utilero|medico|médico|preparador|arbitro|árbitro|barra|hincha|pibe|amigo|companero|compañero|jugador|vecino|padre|viejo|abuelo|hermano|hijo|nieto|suegro|cunado|cuñado|patron|patrón|empresario|socio|abogado|contador|profe)/i, 'm'],
  [/(amiga|companera|compañera|jugadora|vecina|madre|vieja|abuela|hermana|hija|nieta|suegra|novia|esposa|pareja|periodista_f|doctora|profesora)/i, 'f']
];
function generoDeSemilla(semilla){
  const s = String(semilla||'');
  // 1) El NOMBRE manda: la semilla suele ser rol+nombre ("hijoPaula"), y ahí la
  //    persona concreta pesa más que la palabra del rol.
  const todos = NOMBRES_F.concat(NOMBRES_PAREJA_F).map(x=>[x.toLowerCase(),'f'])
    .concat(NOMBRES_M.concat(NOMBRES_PAREJA_M).map(x=>[x.toLowerCase(),'m']));
  const bajo = s.toLowerCase();
  let mejor = null, largo = 0;
  for (const [n, g] of todos){
    if (n.length > largo && bajo.indexOf(n) >= 0){ mejor = g; largo = n.length; }
  }
  if (mejor) return mejor;
  // 2) Si no hay nombre, decide el rol.
  for (const [re, g] of NPC_ROL_GEN) if (re.test(s)) return g;
  return null;
}
function vjSpriteHab(h, pose){
  // La pareja NO se genera por hash: se dibuja con el avatar exacto que elegiste,
  // si no cambiaba de cara entre la escena de la boda y la de la casa.
  if (h && h._pareja) return vjSpritePareja(pose||'idle', false, 2.2);
  return vjSpriteNPC(h.semilla, h.ropa, h.edad, pose||'idle', vjGen(h), h.av);
}
function vjSpriteNPC(semilla, ropa, edad, pose, gen, avFijo){
  edad = edad || 40;
  let h = 0; for(let i=0;i<String(semilla).length;i++) h = (h*31 + String(semilla).charCodeAt(i)) >>> 0;
  // Si el personaje TRAE su propia cara (los hijos y nietos, que heredan rasgos
  // de los padres), se respeta y no se inventa nada por hash.
  if (avFijo){
    const g2 = gen || avFijo.gen || generoDeSemilla(semilla) || 'm';
    const av2 = Object.assign({}, avFijo, { gen:g2,
      barba: (g2 === 'f' || edad < 20) ? 0 : (avFijo.barba || 0),
      canas: edad >= 45 ? (avFijo.canas || ((h>>>13)%2)) : 0,
      calvicie: (g2 !== 'f' && edad >= 30) ? (avFijo.calvicie || 0) : 0 });
    return avatarSprite(av2, { edad, escala:2.2, pose: pose||'idle', ropa: ropa||'calle', num:'', apellido:'', bebeGen:g2 });
  }
  // Antes esto era un 50/50 por hash: por eso un representante o un amigo salían
  // dibujados como mujer. Ahora manda el rol/nombre de la semilla.
  if (gen == null) gen = generoDeSemilla(semilla);
  if (gen == null) gen = ((h >>> 17) % 100) < 50 ? 'f' : 'm';
  // Desplazamiento SIN signo: con `>>` el hash pasaba a negativo, el módulo daba
  // un índice negativo y el vecino salía `undefined` (rompía toda la escena).
  const sel = (arr, corr) => arr[((h >>> corr) % arr.length)];
  const av = { gen, piel: sel(AV_PIELES,0).id,
    pelo: gen === 'f' ? ['largo','colita','afro','rastas'][(h>>>3)%4] : sel(AV_PELOS,3).id,
    // Un pibe de juveniles no tiene barba de hombre grande; una mujer, nunca.
    peloColor: sel(AV_COLORES_PELO,6).id, barba: (gen === 'f' || (edad||40) < 20) ? 0 : (h>>>9)%3, acc:'nada',
    calvicie: (gen !== 'f' && edad >= 30 ? (h>>>11)%2 : 0), canas: (edad >= 45 ? (h>>>13)%2 : 0),
    cicatriz:0, peso:((h>>>15)%3)-1, tatus:0, bling:0 };
  return avatarSprite(av, { edad: edad||40, escala:2.2, pose: pose||'idle', ropa: ropa||'calle', num:'', apellido:'',
    bebeGen: gen });
}

// ── ESCENARIOS RECORRIBLES, POR MUNDO ────────────────────────────────────────
const VJ_MUNDOS = {
  potrero: {
    baldio:  { n:'El baldío',   ancho:940, sale:{ der:'esquina' } },
    esquina: { n:'Tu cuadra',   ancho:860, sale:{ izq:'baldio' } }
  },
  juveniles: {
    pension: { n:'La pensión',  ancho:820, sale:{ der:'predio' } },
    predio:  { n:'El predio',   ancho:1000, sale:{ izq:'pension' } }
  },
  club: {
    // La casa está a la izquierda de todo: como jugador también tenés una vida
    // fuera del club, y ahí es donde pasan las cosas que no son fútbol.
    casa:      { n:'Tu casa',      ancho:880, sale:{ der:'vestuario' } },
    vestuario: { n:'El vestuario', ancho:860, sale:{ izq:'casa', der:'cancha' } },
    cancha:    { n:'La cancha',    ancho:1040, sale:{ izq:'vestuario', der:'oficina' } },
    oficina:   { n:'La oficina',   ancho:820, sale:{ izq:'cancha' } }
  },
  vida: {
    casa:    { n:'Tu casa',   ancho:880,  sale:{ der:'barrio' } },
    barrio:  { n:'El barrio', ancho:980,  sale:{ izq:'casa', der:'trabajo' } },
    trabajo: { n:'Tu laburo', ancho:860,  sale:{ izq:'barrio', der:'extra' } },
    // El cuarto lugar depende de en qué te convertiste: el campo de
    // entrenamiento, el piso de TV, el palco, tu negocio, la canchita.
    extra:   { n:'Tu lugar',  ancho:1000, sale:{ izq:'trabajo' } }
  }
};
// Compatibilidad: el motor consulta siempre las escenas del mundo activo.
// El nombre del cuarto escenario cambia con el rol.
const ROL_LUGAR = {
  dt:          { n:'El campo de entrenamiento', icon:'bx-football' },
  comentarista:{ n:'El piso de TV',             icon:'bx-broadcast' },
  dirigente:   { n:'El palco',                  icon:'bx-crown' },
  empresario:  { n:'Tu negocio',                icon:'bx-store' },
  escuela:     { n:'La canchita de los pibes',  icon:'bx-football' },
  disfrutar:   { n:'La plaza del barrio',       icon:'bx-tree' }
};
function vjEscenas(){
  const m = VJ_MUNDOS[VJ.mundo] || VJ_MUNDOS.vida;
  if (VJ.mundo === 'vida' && G && G.vidaRol){
    const L = ROL_LUGAR[G.vidaRol] || ROL_LUGAR.disfrutar;
    return Object.assign({}, m, { extra: Object.assign({}, m.extra, { n:L.n }) });
  }
  return m;
}
function vjEscena(){ return vjEscenas()[VJ.escena] || Object.values(vjEscenas())[0]; }
// ══════════════════════════════════════════════════════════════════════════════
// DÓNDE VIVÍS
// La casa no es un decorado fijo: sube y BAJA con tu patrimonio. Empezás en la
// pieza de la casa de tus viejos y podés terminar en una mansión — o volver a un
// monoambiente si te fundiste. Lo que comprás también se ve adentro, y por la
// ventana se ve el lugar donde estás jugando.
// ══════════════════════════════════════════════════════════════════════════════
const CASAS = [
  { id:0, n:'La pieza de la casa de tus viejos', pared:'#3a2f26', paredL:'#4a3c30', piso:'#4a3520' },
  { id:1, n:'Un monoambiente alquilado',         pared:'#2e3038', paredL:'#3c3f49', piso:'#3d3229' },
  { id:2, n:'Tu primer departamento propio',     pared:'#2b2338', paredL:'#3a2f4c', piso:'#3a2b1e' },
  { id:3, n:'Una casa con jardín',               pared:'#232a3a', paredL:'#31394e', piso:'#40301f' },
  { id:4, n:'Una casa que sale en las revistas', pared:'#1c2233', paredL:'#2a3348', piso:'#4a3a24' }
];
function patrimonioTotal(){
  if(!G) return 0;
  const inv = (G.inversiones && G.inversiones.monto) || 0;
  const bienes = (G.bienes||[]).reduce((s,b)=>{ const B=bienByld(b.id)||{}; return s + (b.precio || B.p || 0); }, 0);
  return (G.dinero||0) + inv + bienes + (G.sueldo||0) * 0.5;
}
function casaNivel(){
  if(!G) return 0;
  const tiene = id => (G.bienes||[]).some(b=>b.id===id);
  if (tiene('avion') || tiene('yate')) return 4;
  const p = patrimonioTotal();
  let n = p >= 4000000 ? 4 : p >= 800000 ? 3 : p >= 150000 ? 2 : p >= 30000 ? 1 : 0;
  if (tiene('casa')) n = Math.max(n, 3);
  // Si te fundiste (embargo, en rojo), la casa baja aunque hayas tenido de todo.
  const F = G.flags || {};
  if (F.embargo) n = Math.min(n, 1);
  else if (F.enRojo) n = Math.min(n, 2);
  return n;
}
// Vista por la ventana: dice DÓNDE estás viviendo, no sólo cuánto tenés.
// Época del juego: cambia lo que se ve en las casas y en la calle.
// Si estás viviendo la temporada retro, el mundo entero se dibuja como esa época:
// no alcanza con contarlo en un texto, se tiene que VER.
function epoca(){
  if (G && G._retro != null) return 0;
  const a = (G && G.anio) || 2026;
  // 0 hoy · 1 digital · 2 holo · 3 robots · 4 orbital (se viaja al espacio)
  return a >= 2075 ? 4 : a >= 2062 ? 3 : a >= 2048 ? 2 : a >= 2035 ? 1 : 0;
}
function casaVista(){
  if(!G) return 'barrio';
  const tier = ligaNivel(G.liga || '');
  const afuera = G.clubPais && G.pais && G.clubPais !== G.pais;
  if (tier >= 15) return 'metropoli';        // ligas top: rascacielos
  if (afuera) return 'ciudad';
  if (tier <= 1) return 'pueblo';            // interior / amateur
  return 'barrio';
}
// Fondo de casa y barrio (el de "trabajo" lo aporta vidaEscena, ya existente).
function vjFondoCasa(W,H){
  const nv = casaNivel();
  const C = CASAS[nv] || CASAS[0];
  const vista = casaVista();
  const tiene = id => !!(G && (G.bienes||[]).some(b=>b.id===id));
  const trofeos = (G && (G.vitrina||[]).length) || 0;
  const ep = epoca();
  const pisoY = Math.round(H*0.78);
  let o='';
  const M=(x,y,w,h,c)=>{ o+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`; };
  o += `<defs><linearGradient id="vjc${nv}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.paredL}"/><stop offset="1" stop-color="${C.pared}"/></linearGradient></defs>`;
  M(0,0,W,pisoY,`url(#vjc${nv})`);
  M(0,pisoY,W,H-pisoY,C.piso); M(0,pisoY,W,3,_avShade(C.piso,26));
  M(0,pisoY-6,W,6,_avShade(C.pared,-26));
  // A partir de aca se dibuja SOLO EL INTERIOR: el ancho util termina donde
  // empieza la pared que da a la calle. Sin esto, el sofa, la planta y la vitrina
  // se dibujaban encima de la vereda y de la puerta.
  const Wtot = W;
  W = Math.round(Wtot*0.78);

  // ── PISO: de baldosa gastada a parquet o mármol ──
  if (nv <= 1) for(let i=0;i<W;i+=40) M(i,pisoY,2,H-pisoY,_avShade(C.piso,-22));
  else if (nv === 2) for(let i=0;i<W;i+=56) M(i,pisoY,3,H-pisoY,_avShade(C.piso,-18));
  else { for(let i=0;i<W;i+=90) M(i,pisoY,2,H-pisoY,_avShade(C.piso,18));
         M(0,pisoY+10,W,2,'rgba(255,255,255,.07)'); }

  // ── PAREDES: humedad y grietas abajo, cuadros y molduras arriba ──
  if (nv === 0){
    M(70,pisoY-120,54,34,_avShade(C.pared,-16));       // mancha de humedad
    M(300,pisoY-60,3,44,_avShade(C.pared,-24));        // grieta
    M(0,pisoY-8,W,2,_avShade(C.pared,-34));
  } else if (nv >= 3){
    M(0,26,W,4,_avShade(C.pared,22));                  // moldura de techo
    M(0,pisoY-16,W,4,_avShade(C.pared,14));            // zócalo prolijo
  }

  // ── VENTANA: el tamaño lo da la casa; lo que se ve, dónde estás jugando ──
  const vw = Math.min(Math.round(W*0.42), nv <= 0 ? 76 : nv === 1 ? 108 : nv === 2 ? 150 : nv === 3 ? 220 : 300);
  const vh = Math.min(Math.round(pisoY*0.52), nv <= 0 ? 60 : nv === 1 ? 78 : nv === 2 ? 96 : nv === 3 ? 118 : 140);
  // La ventana vive en la pared LIBRE, lejos de la puerta de calle y a altura de
  // ojos. Antes con casas grandes la ventana crecia hasta meterse debajo de la
  // puerta y quedaban las dos superpuestas.
  const vx = 54, vy = Math.max(18, Math.round(pisoY*0.16));
  M(vx-4,vy-4,vw+8,vh+8,_avShade(C.pared,-30));
  M(vx,vy,vw,vh,'#070b16');
  if (vista === 'metropoli'){
    for(let i=0;i<9;i++){ const bh=Math.round(vh*(0.25+((i*23)%60)/100)), bw=Math.round(vw/9);
      M(vx+i*bw, vy+vh-bh, bw-2, bh, '#101a2e');
      for(let j=0;j<Math.floor(bh/12);j++) for(let k=0;k<2;k++)
        if(((i*5+j*3+k)%3)!==0) M(vx+i*bw+3+k*7, vy+vh-bh+5+j*12, 4, 5, '#f2dc9a'); }
  } else if (vista === 'ciudad'){
    for(let i=0;i<6;i++){ const bh=Math.round(vh*(0.35+((i*31)%40)/100)), bw=Math.round(vw/6);
      M(vx+i*bw, vy+vh-bh, bw-3, bh, '#16243a');
      for(let j=0;j<Math.floor(bh/14);j++) M(vx+i*bw+4, vy+vh-bh+6+j*14, 6, 6, '#e8d79a'); }
  } else if (vista === 'pueblo'){
    M(vx, vy+Math.round(vh*0.55), vw, Math.round(vh*0.45), '#1b2a1c');
    for(let i=0;i<4;i++){ const bw=Math.round(vw/4); M(vx+i*bw+3, vy+Math.round(vh*0.42), bw-8, Math.round(vh*0.16), '#2b2a20'); }
    M(vx+Math.round(vw*0.6), vy+8, 12, 12, '#f5e7a8');   // luna
  } else {
    for(let i=0;i<5;i++){ const bw=Math.round(vw/5); M(vx+i*bw+2, vy+Math.round(vh*0.4), bw-6, Math.round(vh*0.6), '#20252e');
      if(i%2) M(vx+i*bw+7, vy+Math.round(vh*0.5), 8, 8, '#f0d78a'); }
  }
  // Cruceta de la ventana (las caras se achican cuando la casa es mejor)
  if (nv <= 2){ M(vx+Math.round(vw/2)-2, vy, 4, vh, _avShade(C.pared,-30)); M(vx, vy+Math.round(vh/2)-2, vw, 4, _avShade(C.pared,-30)); }
  else M(vx+Math.round(vw/2)-1, vy, 2, vh, _avShade(C.pared,-30));
  // Pileta al fondo si es mansión (se ve por el ventanal)
  if (nv >= 4){ M(vx+10, vy+vh-26, vw-20, 20, '#1b7fa8'); M(vx+14, vy+vh-22, vw-28, 4, '#4fc3f7'); }

  // ── MUEBLES: crecen con la casa ──
  if (nv === 0){
    M(210,pisoY-34,90,34,'#4a3a2a'); M(214,pisoY-42,82,10,'#6b5540');       // catre
    M(206,pisoY-46,14,12,'#c9c2b0');
    M(W-150,pisoY-26,52,26,'#3a2f22');                                       // cajón
    M(W-140,pisoY-52,32,26,'#0d1016'); M(W-136,pisoY-48,24,18,'#1c3a52');    // tele chica
    M(150,20,3,26,'#2a2a2a'); M(140,44,24,10,'#f2e6a8');                      // bombita colgando
  } else if (nv === 1){
    M(230,pisoY-40,120,40,'#3f3f4c'); M(230,pisoY-54,120,16,'#4c4c5c');       // futón
    M(430,pisoY-26,86,26,'#2e2a24');
    M(440,pisoY-64,66,38,'#0a0d12'); M(444,pisoY-60,58,30,'#16304d');         // tele
    M(W-120,pisoY-30,8,30,'#2d1f10'); M(W-134,pisoY-48,36,20,'#1f6b45');      // plantita
  } else if (nv === 2){
    M(250,pisoY-46,132,46,'#4a2f3d'); M(250,pisoY-62,132,18,'#5c3b4c');       // sofá
    M(244,pisoY-52,10,52,'#3d2632'); M(378,pisoY-52,10,52,'#3d2632');
    M(450,pisoY-30,104,30,'#2e2118'); M(462,pisoY-76,80,46,'#0a0d12'); M(466,pisoY-72,72,38,'#16304d');
    M(W-130,pisoY-32,8,32,'#2d1f10'); M(W-148,pisoY-54,44,24,'#1f6b45'); M(W-138,pisoY-64,24,12,'#288a58');
  } else {
    M(240,pisoY-54,180,54,'#3d3550'); M(240,pisoY-72,180,20,'#4c4266');       // sofá grande
    M(232,pisoY-62,12,62,'#2e2840'); M(416,pisoY-62,12,62,'#2e2840');
    M(300,pisoY-88,60,18,'#2a2438');                                          // respaldo/almohadones
    M(470,pisoY-34,140,34,'#2a2118'); M(486,pisoY-96,108,62,'#080b10'); M(490,pisoY-92,100,54,'#16304d');
    if (nv >= 4){
      M(Math.round(W/2)-22,10,44,8,'#c9a227');                                // araña
      for(let i=0;i<5;i++) M(Math.round(W/2)-18+i*9, 18, 3, 14, '#f5e6a8');
      M(W-190,pisoY-30,12,30,'#2d1f10'); M(W-214,pisoY-58,60,30,'#1f6b45');   // planta grande
      M(W-206,pisoY-72,44,16,'#288a58');
    }
  }

  // ── LO QUE COMPRASTE, ADENTRO ──
  // ÉPOCA: de la tele de tubo al panel gigante y al holograma flotante.
  if (ep >= 1){
    M(Math.round(W*0.30), pisoY-96, 96, 4, ep>=3 ? '#7dd3fc' : '#2a3140');       // panel colgado
    M(Math.round(W*0.30), pisoY-94, 96, 40, '#070b12');
    M(Math.round(W*0.31), pisoY-92, 92, 36, ep>=3 ? '#0d3a4f' : '#16304d');
  }
  if (ep >= 2){
    // Luz ambiental de colores y un dron chico en el aire.
    o += `<rect x="0" y="${pisoY-8}" width="${W}" height="3" fill="#7dd3fc" opacity=".28"/>`;
    M(Math.round(W*0.55), 40, 10, 4, '#9aa4b0'); M(Math.round(W*0.55)+2, 44, 6, 2, '#7dd3fc');
  }
  if (ep >= 3){
    // Holograma sobre la mesa.
    o += `<ellipse cx="${Math.round(W*0.46)}" cy="${pisoY-34}" rx="26" ry="7" fill="#7dd3fc" opacity=".22"/>`;
    o += `<rect x="${Math.round(W*0.44)}" y="${pisoY-64}" width="24" height="30" fill="#7dd3fc" opacity=".16"/>`;
  }
  if (tiene('reloj')){ M(W-96,60,26,30,'#1a1408'); M(W-92,64,18,22,'#0b0904'); M(W-86,70,7,9,'#f5d14e'); }
  if (tiene('auto') && nv >= 1){                                              // el auto, por la ventana
    M(vx+8, vy+vh-14, 34, 9, '#3b6ea8'); M(vx+14, vy+vh-20, 20, 7, '#5a8fd0');
    M(vx+12, vy+vh-6, 6, 4, '#141414'); M(vx+32, vy+vh-6, 6, 4, '#141414');
  }
  if (tiene('fundacion')){ M(120,pisoY-70,40,30,'#2a1c24'); M(124,pisoY-66,32,22,'#e8709e'); }

  // ── VITRINA DE TROFEOS: cuantos más ganaste, más llena ──
  if (trofeos > 0){
    const cx0 = nv <= 1 ? W-120 : 100, cy0 = pisoY - (nv <= 1 ? 92 : 124);
    const anchoV = nv <= 1 ? 66 : 96, altoV = nv <= 1 ? 56 : 92;
    M(cx0, cy0, anchoV, altoV, _avShade(C.pared,-40));
    M(cx0+3, cy0+3, anchoV-6, altoV-6, '#0b0904');
    const filas = nv <= 1 ? 2 : 3;
    const porFila = Math.max(2, Math.floor((anchoV-14)/20));
    let puestos = Math.min(trofeos, filas*porFila);
    for(let f=0; f<filas && puestos>0; f++){
      const yy = cy0 + 12 + f*Math.floor((altoV-16)/filas);
      M(cx0+6, yy+Math.floor((altoV-16)/filas)-4, anchoV-12, 2, '#3d2c0d');
      for(let k=0; k<porFila && puestos>0; k++, puestos--){
        const xx = cx0 + 9 + k*20, alt = 10 + ((f+k)%3)*3;
        M(xx, yy+Math.floor((altoV-16)/filas)-4-alt, 5, alt, '#d4af37');
        M(xx-2, yy+Math.floor((altoV-16)/filas)-6, 9, 2, '#b8952e');
      }
    }
  }
  // ══════════════════════════════════════════════════════════════════════════
  // DONDE TERMINA LA CASA Y EMPIEZA LA CALLE
  // Antes la division era una tirita de 14px a media altura: parecia un mueble,
  // no una pared, y el vecino quedaba adentro del living. Ahora hay una PARED
  // ENTERA del piso al techo, con una puerta a escala humana (el marco mide lo
  // que mide una persona y pico), vereda, cordon y calle asfaltada con su
  // marcacion. Todo lo de afuera vive del otro lado de esa pared.
  // ══════════════════════════════════════════════════════════════════════════
  W = Wtot;
  const muroX = Math.round(W*0.80);
  const grosor = 10;
  // La pared, del techo al piso
  M(muroX, 0, grosor, pisoY, _avShade(C.pared,-46));
  M(muroX, 0, 3, pisoY, _avShade(C.pared,-20));
  M(muroX+grosor-2, 0, 2, pisoY, '#05070a');
  // La puerta: 1.9 veces la altura de una persona en esta escala. El personaje
  // mide ~56 unidades de sprite; a esta escala, ~86px de alto.
  const puertaH = Math.round(H*0.40), puertaW = Math.round(puertaH*0.46);
  const puertaX = muroX - Math.round(puertaW*0.5) + Math.round(grosor/2);
  const puertaY = pisoY - puertaH;
  M(puertaX-3, puertaY-3, puertaW+6, puertaH+3, _avShade(C.pared,-58));   // marco
  M(puertaX, puertaY, puertaW, puertaH, '#4a3324');
  M(puertaX+2, puertaY+3, puertaW-4, Math.round(puertaH*0.42), '#5c4130');
  M(puertaX+2, puertaY+Math.round(puertaH*0.52), puertaW-4, Math.round(puertaH*0.40), '#5c4130');
  M(puertaX+puertaW-5, puertaY+Math.round(puertaH*0.52), 2, 2, '#d4af37');  // picaporte
  // Vereda (afuera)
  const vereda = W - (muroX+grosor);
  M(muroX+grosor, pisoY-4, vereda, 4, '#6e737a');
  M(muroX+grosor, pisoY, vereda, Math.round((H-pisoY)*0.45), '#8a9099');
  for(let i=muroX+grosor;i<W;i+=26) M(i, pisoY, 1, Math.round((H-pisoY)*0.45), '#767c85');
  // Cordon y calle asfaltada
  const calleY = pisoY + Math.round((H-pisoY)*0.45);
  M(muroX+grosor, calleY, vereda, 3, '#5c6169');
  M(muroX+grosor, calleY+3, vereda, H-calleY-3, '#2b2e33');
  for(let i=muroX+grosor+6;i<W;i+=30) M(i, calleY+Math.round((H-calleY)*0.55), 16, 2, '#c8cbd0');
  // Cielo de la calle por encima de la pared (se ve el barrio del otro lado)
  M(muroX+grosor, 0, vereda, pisoY-4, '#0d1422');
  for(let i=0;i<4;i++){ const bh = 40+((i*37)%70);
    M(muroX+grosor+4+i*Math.max(14,Math.round(vereda/4)), pisoY-4-bh, Math.max(10,Math.round(vereda/5)), bh, '#141d2e');
    for(let j=0;j<Math.floor(bh/20);j++) M(muroX+grosor+7+i*Math.max(14,Math.round(vereda/4)), pisoY-8-bh+10+j*20, 5, 6, '#f0d78a'); }
  // Farol de la calle
  const farolX = Math.min(W-14, muroX+grosor+Math.round(vereda*0.55));
  M(farolX, pisoY-92, 4, 92, '#2f353d');
  M(farolX-8, pisoY-100, 20, 8, ep >= 3 ? '#a5f3fc' : ep >= 2 ? '#dbeafe' : '#f5e6a8');
  return o;
}

function vjFondoBarrio(W,H){
  // El barrio acompaña: de casas bajas y cables a torres con luces y veredas
  // limpias. Vivir mejor se nota antes de entrar a tu casa.
  const nv = casaNivel();
  const pisoY = Math.round(H*0.80); let o='';
  const M=(x,y,w,h,c)=>{ o+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`; };
  o += `<defs><linearGradient id="vjb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#243657"/><stop offset="45%" stop-color="#16223a"/>
      <stop offset="100%" stop-color="#0a0f1a"/></linearGradient></defs>`;
  M(0,0,W,pisoY,'url(#vjb)');
  // Estrellas y luna: el barrio es de noche, que se note.
  for(let i=0;i<Math.ceil(W/26);i++){ const sx=(i*97)%W, sy=8+((i*53)%54);
    M(sx, sy, ((i%5)===0)?2:1, ((i%5)===0)?2:1, 'rgba(232,240,255,.75)'); }
  o += `<circle cx="${Math.round(W*0.82)}" cy="42" r="16" fill="#f2f0dc" opacity=".9"/>`;
  o += `<circle cx="${Math.round(W*0.82)}" cy="42" r="34" fill="#cfe0ff" opacity=".10"/>`;
  // edificios de fondo: más altos y mejor iluminados cuanto mejor vivís
  const alto = nv >= 4 ? 180 : nv === 3 ? 140 : nv === 2 ? 110 : 90;
  for(let i=0;i<12;i++){ const bh = Math.round(alto*0.55)+((i*53)%Math.round(alto*0.6)), bx = i*84, bw = 70;
    M(bx,pisoY-bh,bw,bh, i%2?(nv>=3?'#182236':'#141c2b'):(nv>=3?'#131c2e':'#101827'));
    for(let j=0;j<Math.floor(bh/22);j++) for(let k=0;k<3;k++)
      if(((i*7+j*3+k)%(nv>=3?3:4))!==0) M(bx+9+k*20, pisoY-bh+12+j*22, 9, 11, nv>=3?'#f7e6ad':'#f0d78a');
  }
  // Cables cruzados: sólo en los barrios humildes
  if (nv <= 1){ M(0,pisoY-118,W,2,'#0d1219'); M(0,pisoY-104,W,1,'#0d1219'); }
  M(0,pisoY,W,H-pisoY,'#22262b'); M(0,pisoY,W,3,'#31363d');
  for(let i=0;i<W;i+=60) M(i,pisoY+6,34,2,'#2b3037');
  // faroles: de la lámpara amarilla al neón frío del futuro
  const _ep = epoca();
  const luz = _ep >= 3 ? '#a5f3fc' : _ep >= 2 ? '#dbeafe' : '#f5e6a8';
  [150,470,790].forEach(x=>{ M(x,pisoY-96,4,96,'#2f353d'); M(x-8,pisoY-102,20,8,luz); });
  if (_ep >= 2){
    // Carteles de neón y una vía elevada al fondo.
    M(240,pisoY-186,120,10,'#7dd3fc'); M(600,pisoY-206,90,8,'#f472b6');
    if (_ep >= 3){ M(0,pisoY-238,W,6,'#243b55'); for(let i=0;i<W;i+=160) M(i,pisoY-232,70,4,'#7dd3fc'); }
  }
  // ── LO QUE SE VE DE LA ÉPOCA EN LA CALLE ──────────────────────────────────
  // No alcanza con cambiar el color de los faroles: el avance tiene que verse.
  if (_ep >= 2){
    // Autos que ya no tocan el suelo, pasando bajo la vía.
    [120, 520].forEach(function(cx0){
      M(cx0, pisoY-52, 34, 9, '#2fb8a8'); M(cx0+7, pisoY-58, 20, 7, '#0b2b3a');
      M(cx0+3, pisoY-42, 28, 2, '#7dd3fc');
    });
  }
  if (_ep >= 3){
    // ROBOTS: uno repartiendo en la vereda y un dron de vigilancia.
    [400, 720].forEach(function(rx){
      M(rx, pisoY-40, 14, 20, '#9aa4b0'); M(rx+2, pisoY-46, 10, 8, '#c3ccd6');
      M(rx+4, pisoY-44, 2, 2, '#7dd3fc'); M(rx+8, pisoY-44, 2, 2, '#7dd3fc');
      M(rx-3, pisoY-36, 3, 12, '#7b848f'); M(rx+14, pisoY-36, 3, 12, '#7b848f');
      M(rx+2, pisoY-20, 4, 20, '#6b737d'); M(rx+8, pisoY-20, 4, 20, '#6b737d');
      M(rx-2, pisoY-52, 18, 3, 'rgba(125,211,252,.35)');
    });
    M(300, pisoY-150, 12, 4, '#c3ccd6'); M(303, pisoY-146, 6, 2, '#7dd3fc');
  }
  if (_ep >= 4){
    // ERA ORBITAL: ascensor espacial al fondo y una nave despegando.
    M(Math.round(W*0.90), 0, 7, pisoY-6, '#33465e');
    M(Math.round(W*0.90)-3, 0, 13, 8, '#7dd3fc');
    for(let y=20;y<pisoY-20;y+=48) M(Math.round(W*0.90)-4, y, 15, 3, '#4f6b8c');
    const nx = Math.round(W*0.30);
    M(nx, 26, 8, 26, '#e6ecf2'); M(nx+2, 20, 4, 8, '#c9d4de');
    M(nx-4, 40, 4, 12, '#b9c4ce'); M(nx+8, 40, 4, 12, '#b9c4ce');
    M(nx+1, 52, 6, 14, '#f5a524'); M(nx+2, 66, 4, 10, '#ffd98a');
  }
  // kiosco
  M(560,pisoY-84,120,84,'#20303f'); M(560,pisoY-92,120,10,'#2e4557');
  M(576,pisoY-64,88,40,'#0d1620'); M(582,pisoY-58,34,28,'#f5a524'); M(624,pisoY-58,34,28,'#4fc3f7');
  // banco de plaza
  M(300,pisoY-20,72,7,'#4a3a24'); M(300,pisoY-32,72,7,'#4a3a24'); M(304,pisoY-20,5,20,'#2b2115'); M(366,pisoY-20,5,20,'#2b2115');
  return o;
}

// ── FONDOS DE LAS ETAPAS DE FÚTBOL ───────────────────────────────────────────
function vjFondoBaldio(W,H){
  const pisoY = Math.round(H*0.76); let o='';
  const M=(x,y,w,h,c)=>{ o+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`; };
  o += `<defs><linearGradient id="vjbd" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f0a04b"/><stop offset="34%" stop-color="#a15f2e"/>
      <stop offset="72%" stop-color="#4a2d15"/><stop offset="100%" stop-color="#20130a"/></linearGradient></defs>`;
  M(0,0,W,pisoY,'url(#vjbd)');
  // Sol bajo y su reflejo: atardecer de potrero.
  o += `<circle cx="${Math.round(W*0.18)}" cy="${Math.round(pisoY*0.30)}" r="26" fill="#ffd27a" opacity=".85"/>`;
  o += `<circle cx="${Math.round(W*0.18)}" cy="${Math.round(pisoY*0.30)}" r="52" fill="#ffb457" opacity=".18"/>`;
  // Casas bajas del barrio a lo lejos, en silueta.
  for(let i=0;i<Math.ceil(W/70);i++){ const bh=26+((i*37)%26), bx=i*70;
    M(bx, pisoY-118-bh, 62, bh, '#2a1a0f');
    M(bx+12, pisoY-118-bh+8, 9, 9, '#3a2614'); M(bx+34, pisoY-118-bh+8, 9, 9, '#3a2614'); }
  // Arboles detras del paredon.
  for(let i=0;i<Math.ceil(W/150);i++){ const tx=40+i*150;
    M(tx+9, pisoY-140, 5, 24, '#241608'); M(tx, pisoY-166, 24, 28, '#2f3d18'); M(tx+4, pisoY-176, 16, 12, '#3a4a1e'); }
  // paredón con pintadas
  M(0,pisoY-118,W,118,'#241a10');
  for(let i=0;i<W;i+=34) M(i,pisoY-118,2,118,'#1c1409');
  for(let j=0;j<5;j++) M(0,pisoY-118+j*24,W,2,'#1c1409');
  M(120,pisoY-96,86,26,'#4a6b22'); M(128,pisoY-90,70,6,'#7fae3a');
  M(520,pisoY-88,60,20,'#6b2a2a'); M(526,pisoY-83,48,5,'#a83f3f');
  // tierra
  M(0,pisoY,W,H-pisoY,'#5c4321'); M(0,pisoY,W,3,'#6e5229');
  for(let i=0;i<W;i+=17) M(i,pisoY+7+((i*7)%9),9,2,'#4a3519');
  // arco de caño
  M(240,pisoY-84,4,84,'#c8c8bc'); M(240,pisoY-84,110,4,'#c8c8bc'); M(346,pisoY-84,4,84,'#c8c8bc');
  for(let i=0;i<14;i++) M(244+i*8,pisoY-80,1,78,'rgba(220,220,205,.28)');
  for(let i=0;i<10;i++) M(244,pisoY-80+i*8,104,1,'rgba(220,220,205,.28)');
  // pelota gastada y una piedra de arco
  M(700,pisoY-12,12,12,'#ddd8c8'); M(703,pisoY-9,5,5,'#2a2a22');
  M(800,pisoY-6,16,6,'#8a8272');
  return o;
}
function vjFondoEsquina(W,H){
  const pisoY = Math.round(H*0.80); let o='';
  const M=(x,y,w,h,c)=>{ o+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`; };
  o += `<defs><linearGradient id="vjes" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2f3a"/><stop offset="1" stop-color="#12151c"/></linearGradient></defs>`;
  M(0,0,W,pisoY,'url(#vjes)');
  // casas bajas del barrio
  for(let i=0;i<7;i++){ const bx=i*126, bh=88+((i*29)%40);
    M(bx,pisoY-bh,116,bh, i%2?'#3a2e26':'#33383f');
    M(bx,pisoY-bh,116,5,'#4a3b30');
    M(bx+16,pisoY-bh+22,26,24,'#0f1319'); M(bx+64,pisoY-bh+22,26,24,'#0f1319');
    M(bx+40,pisoY-40,26,40,'#221a14');
    if(i%2) { M(bx+18,pisoY-bh+24,22,20,'#f2d68a'); }
  }
  M(0,pisoY,W,H-pisoY,'#2a2d33'); M(0,pisoY,W,3,'#3a3e46');
  M(0,pisoY+16,W,3,'#232629');
  return o;
}
function vjFondoPension(W,H){
  const pisoY = Math.round(H*0.78); let o='';
  const M=(x,y,w,h,c)=>{ o+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`; };
  o += `<defs><linearGradient id="vjpe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d2630"/><stop offset="1" stop-color="#0d1218"/></linearGradient></defs>`;
  M(0,0,W,pisoY,'url(#vjpe)');
  M(0,pisoY,W,H-pisoY,'#3a3128'); M(0,pisoY,W,3,'#4c4033');
  // cuchetas
  for(let c=0;c<3;c++){ const bx=60+c*230;
    M(bx,pisoY-104,120,8,'#4a5560'); M(bx,pisoY-56,120,8,'#4a5560');
    M(bx,pisoY-104,7,104,'#39434c'); M(bx+113,pisoY-104,7,104,'#39434c');
    M(bx+6,pisoY-96,108,10,'#8fa3b5'); M(bx+6,pisoY-48,108,10,'#a8b8c6');
    M(bx+10,pisoY-100,26,8,'#e6ecf2'); M(bx+10,pisoY-52,26,8,'#e6ecf2');
  }
  // póster y bolso
  M(W-120,44,64,50,'#0d1a12'); M(W-114,50,52,38,'#1f6b45');
  M(W-96,pisoY-20,54,20,'#2a2118'); M(W-96,pisoY-24,54,5,'#3d3122');
  return o;
}
function vjFondoPredio(W,H){
  const pisoY = Math.round(H*0.72); let o='';
  const M=(x,y,w,h,c)=>{ o+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`; };
  o += `<defs><linearGradient id="vjpr" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7fb2d9"/><stop offset="40%" stop-color="#3d6f96"/>
      <stop offset="100%" stop-color="#12293a"/></linearGradient></defs>`;
  M(0,0,W,pisoY,'url(#vjpr)');
  // Nubes y arboleda del predio, de manana.
  o += `<ellipse cx="${Math.round(W*0.22)}" cy="34" rx="54" ry="14" fill="#eaf2f8" opacity=".55"/>`;
  o += `<ellipse cx="${Math.round(W*0.28)}" cy="28" rx="34" ry="12" fill="#eaf2f8" opacity=".45"/>`;
  o += `<ellipse cx="${Math.round(W*0.68)}" cy="46" rx="66" ry="15" fill="#eaf2f8" opacity=".40"/>`;
  for(let i=0;i<Math.ceil(W/120);i++){ const tx=30+i*120;
    M(tx+10, pisoY-118, 6, 26, '#243318'); M(tx, pisoY-146, 26, 30, '#2f4a1e'); M(tx+5, pisoY-158, 16, 14, '#3b5c26'); }
  // alambrado
  for(let i=0;i<W;i+=12) M(i,pisoY-92,1,92,'rgba(180,200,210,.22)');
  for(let j=0;j<8;j++) M(0,pisoY-92+j*12,W,1,'rgba(180,200,210,.18)');
  for(let i=0;i<W;i+=150) M(i,pisoY-100,4,100,'#5a6670');
  // césped con franjas de corte
  M(0,pisoY,W,H-pisoY,'#1f5c2a');
  for(let i=0;i<W;i+=52) M(i,pisoY,26,H-pisoY,'#245f2f');
  M(0,pisoY,W,3,'#2f7a3c');
  // conos y escalerita de coordinación
  [180,220,260,300].forEach(x=>{ M(x,pisoY-12,10,12,'#f97316'); M(x+2,pisoY-16,6,5,'#fb923c'); });
  for(let i=0;i<7;i++) M(560+i*30,pisoY+4,26,2,'#e8e8dc');
  M(560,pisoY+2,2,20,'#e8e8dc'); M(560+7*30,pisoY+2,2,20,'#e8e8dc');
  return o;
}
function vjFondoCancha(W,H){
  const pisoY = Math.round(H*0.62); let o='';
  const M=(x,y,w,h,c)=>{ o+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`; };
  o += `<defs><linearGradient id="vjca" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1330"/><stop offset="1" stop-color="#0a0716"/></linearGradient></defs>`;
  M(0,0,W,pisoY,'url(#vjca)');
  // tribuna llena
  M(0,pisoY-120,W,120,'#191436');
  for(let f=0;f<9;f++) for(let i=0;i<W;i+=9){
    const c = ((i*7+f*13)%5);
    M(i, pisoY-118+f*13, 6, 8, ['#3a2f66','#4a3d7d','#2d2450','#55468c','#241d44'][c]);
  }
  M(0,pisoY-24,W,6,'#0d0a1c');
  // focos
  for(let i=0;i<5;i++){ M(70+i*((W-140)/4),8,26,7,'#fff8dc'); M(80+i*((W-140)/4),15,6,26,'#3a3450'); }
  // Humo de bengala sobre la popular.
  o += `<ellipse cx="${Math.round(W*0.3)}" cy="${pisoY-96}" rx="120" ry="34" fill="#ff6b3d" opacity=".08"/>`;
  o += `<ellipse cx="${Math.round(W*0.72)}" cy="${pisoY-84}" rx="150" ry="30" fill="#e8eef5" opacity=".06"/>`;
  // Cesped con franjas, lineas y area chica.
  M(0,pisoY,W,H-pisoY,'#1e6b2c');
  for(let i=0;i<W;i+=64) M(i,pisoY,32,H-pisoY,'#238032');
  M(0,pisoY+4,W,2,'#e8f0e4');
  M(Math.round(W/2)-1,pisoY+4,2,H-pisoY,'rgba(232,240,228,.75)');
  // Circulo central en perspectiva.
  o += `<ellipse cx="${Math.round(W/2)}" cy="${pisoY+Math.round((H-pisoY)*0.62)}" rx="96" ry="26" fill="none" stroke="rgba(232,240,228,.55)" stroke-width="2"/>`;
  // Arco a la izquierda, con red.
  M(30,pisoY-46,3,48,'#e8f0e4'); M(30,pisoY-46,96,3,'#e8f0e4'); M(123,pisoY-46,3,48,'#e8f0e4');
  for(let i=0;i<12;i++) M(33+i*8,pisoY-43,1,45,'rgba(240,245,240,.30)');
  for(let j=0;j<6;j++) M(33,pisoY-43+j*8,90,1,'rgba(240,245,240,.30)');
  return o;
}
function vjFondoOficina(W,H){
  const pisoY = Math.round(H*0.78); let o='';
  const M=(x,y,w,h,c)=>{ o+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`; };
  o += `<defs><linearGradient id="vjof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2314"/><stop offset="1" stop-color="#12100a"/></linearGradient></defs>`;
  M(0,0,W,pisoY,'url(#vjof)');
  M(0,pisoY,W,H-pisoY,'#2b2118'); M(0,pisoY,W,3,'#3d3022');
  // ventanal
  M(40,30,150,96,'#0a1220'); M(45,35,140,86,'#12325c');
  for(let i=0;i<9;i++){ const bh=20+((i*17)%50); M(50+i*15,121-bh,11,bh,'#0a2038'); }
  M(114,30,4,96,'#3d3022');
  // escritorio + papeles + vitrina de contratos
  M(W-190,pisoY-42,170,42,'#2e2118'); M(W-190,pisoY-46,170,5,'#4a3620');
  M(W-170,pisoY-58,40,12,'#e8e4d8'); M(W-120,pisoY-62,28,16,'#0d1620'); M(W-116,pisoY-58,20,10,'#2a6ba8');
  M(240,pisoY-96,66,90,'#1a1408'); M(245,pisoY-91,56,80,'#0b0904');
  for(let i=0;i<3;i++){ M(252,pisoY-84+i*26,42,2,'#3d2c0d'); M(262,pisoY-96+i*26+14,10,12,'#d4af37'); }
  return o;
}
// El cuarto escenario, distinto para cada camino que hayas elegido.
function vjFondoLugarRol(W,H){
  const rol = (G && G.vidaRol) || 'disfrutar';
  const pisoY = Math.round(H*0.74); let o='';
  const M=(x,y,w,h,c)=>{ o+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`; };
  if (rol === 'dt' || rol === 'escuela'){
    // Cancha de entrenamiento / canchita de barrio, de tarde.
    o += `<defs><linearGradient id="vjrol" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${rol==='dt'?'#8fc0e0':'#f0a04b'}"/>
      <stop offset="55%" stop-color="${rol==='dt'?'#3d6f96':'#a15f2e'}"/>
      <stop offset="100%" stop-color="#16304a"/></linearGradient></defs>`;
    M(0,0,W,pisoY,'url(#vjrol)');
    for(let i=0;i<Math.ceil(W/130);i++){ const tx=20+i*130;
      M(tx+10,pisoY-104,6,26,'#243318'); M(tx,pisoY-132,26,30,'#2f4a1e'); M(tx+5,pisoY-144,16,14,'#3b5c26'); }
    for(let i=0;i<W;i+=12) M(i,pisoY-78,1,78,'rgba(180,200,210,.20)');
    M(0,pisoY,W,H-pisoY,'#1f5c2a');
    for(let i=0;i<W;i+=54) M(i,pisoY,27,H-pisoY,'#245f2f');
    M(0,pisoY,W,3,'#2f7a3c');
    M(60,pisoY-58,3,58,'#e8f0e4'); M(60,pisoY-58,90,3,'#e8f0e4'); M(147,pisoY-58,3,58,'#e8f0e4');
    for(let i=0;i<11;i++) M(63+i*8,pisoY-55,1,55,'rgba(240,245,240,.28)');
    [300,340,380,420].forEach(x=>{ M(x,pisoY-12,10,12,'#f97316'); M(x+2,pisoY-16,6,5,'#fb923c'); });
    M(W-150,pisoY-16,44,16,'#2a1c0e'); M(W-150,pisoY-20,44,4,'#3d2a15');
    for(let i=0;i<5;i++) M(W-260+i*16,pisoY-10,11,10,'#e8e8dc');
  } else if (rol === 'comentarista'){
    // Piso de TV en vivo: pantallas, luces, cámara.
    o += `<defs><linearGradient id="vjrol" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a2740"/><stop offset="100%" stop-color="#080d16"/></linearGradient></defs>`;
    M(0,0,W,pisoY,'url(#vjrol)');
    M(0,6,W,4,'#64b4ff');
    for(let i=0;i<Math.ceil(W/90);i++) M(20+i*90,10,14,7,'#f5f0d8');
    M(40,pisoY-140,220,110,'#050a12'); M(46,pisoY-134,208,98,'#12325c');
    M(58,pisoY-116,80,8,'#4d8fd6'); M(58,pisoY-96,140,6,'#2a5f9e'); M(58,pisoY-80,110,6,'#2a5f9e');
    M(300,pisoY-100,120,70,'#050a12'); M(306,pisoY-94,108,58,'#1b4a2a');
    M(W-190,pisoY-44,170,44,'#141c2e'); M(W-190,pisoY-49,170,6,'#22304d');
    M(W-120,pisoY-76,4,28,'#2a3140'); M(W-126,pisoY-86,16,10,'#1a1a1a');
    M(W-300,pisoY-96,34,54,'#20252e'); M(W-292,pisoY-88,18,18,'#0a0d12'); M(W-286,pisoY-82,8,8,'#4fc3f7');
    M(W-296,pisoY-42,26,42,'#2a3140');
    M(0,pisoY,W,H-pisoY,'#151a24'); M(0,pisoY,W,3,'#222a38');
  } else if (rol === 'dirigente'){
    // Palco del estadio: tribuna abajo, cristal y butacas.
    o += `<defs><linearGradient id="vjrol" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#241c08"/><stop offset="100%" stop-color="#0d0a04"/></linearGradient></defs>`;
    M(0,0,W,pisoY,'url(#vjrol)');
    M(0,pisoY-150,W,96,'#0d1a26');
    for(let f=0;f<6;f++) for(let i=0;i<W;i+=9)
      M(i,pisoY-146+f*15,6,9,['#1e3a52','#2a4a66','#16304a','#33587a'][(i*7+f*3)%4]);
    M(0,pisoY-56,W,6,'#c9a227'); M(0,pisoY-50,W,50,'#1a1408');
    for(let i=0;i<W;i+=64){ M(i+10,pisoY-40,44,40,'#3a2a10'); M(i+10,pisoY-46,44,8,'#4a3616'); }
    M(0,pisoY,W,H-pisoY,'#2b2110'); M(0,pisoY,W,3,'#3d3018');
  } else if (rol === 'empresario'){
    // Tu negocio: vidriera, cartel con tu apellido, vereda.
    o += `<defs><linearGradient id="vjrol" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#16243a"/><stop offset="100%" stop-color="#0a1018"/></linearGradient></defs>`;
    M(0,0,W,pisoY,'url(#vjrol)');
    M(40,pisoY-160,W-80,120,'#122a20'); M(46,pisoY-154,W-92,26,'#1f6b45');
    M(60,pisoY-120,W-120,74,'#0a1a14');
    for(let i=0;i<Math.ceil((W-120)/90);i++) M(76+i*90,pisoY-110,60,54,'#123a2a');
    M(40,pisoY-40,W-80,40,'#0d1f18');
    M(Math.round(W/2)-70,pisoY-36,140,32,'#0a1410'); M(Math.round(W/2)-64,pisoY-30,128,20,'#22c55e');
    M(0,pisoY,W,H-pisoY,'#2a2d33'); M(0,pisoY,W,3,'#3a3e46');
    for(let i=0;i<W;i+=70) M(i,pisoY+8,40,2,'#232629');
  } else {
    // La plaza del barrio: árboles, banco, farol, cielo de tarde.
    o += `<defs><linearGradient id="vjrol" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e0a15c"/><stop offset="45%" stop-color="#7a5a7a"/>
      <stop offset="100%" stop-color="#241a33"/></linearGradient></defs>`;
    M(0,0,W,pisoY,'url(#vjrol)');
    o += `<circle cx="${Math.round(W*0.72)}" cy="${Math.round(pisoY*0.34)}" r="22" fill="#ffd9a0" opacity=".9"/>`;
    for(let i=0;i<Math.ceil(W/160);i++){ const tx=40+i*160;
      M(tx+12,pisoY-116,8,32,'#33240f'); M(tx,pisoY-152,32,38,'#2d4a20'); M(tx+6,pisoY-166,20,18,'#3a5c28'); }
    M(0,pisoY,W,H-pisoY,'#4a4436'); M(0,pisoY,W,3,'#5c5442');
    M(260,pisoY-22,84,8,'#4a3a24'); M(260,pisoY-36,84,8,'#4a3a24');
    M(264,pisoY-22,6,22,'#2b2115'); M(338,pisoY-22,6,22,'#2b2115');
    M(W-200,pisoY-104,5,104,'#2f353d'); M(W-210,pisoY-112,25,10,'#f5e6a8');
  }
  return o;
}
// ── SUCESOS DE VIDA (además de los del rol) ──────────────────────────────────
// Nacimientos, muertes, casamientos, robos, multas, enfermedades. Lo que le pasa
// a cualquiera, le pase o no algo en el laburo.
const VIDA_SUCESOS = {
  // ── LA TECNOLOGÍA QUE AVANZA ──────────────────────────────────────────────
  // El mundo del juego se mueve: cada era trae cosas que antes no existían y que
  // te tocan de cerca. Se desbloquean SOLAS con el calendario (anioMin), así que
  // una carrera larga o un legado de tres generaciones ve el mundo cambiar.
  epoca: [
    { t:'La pelota que se mide sola', anioMin:2035, npc:{ semilla:'tecnico2035', ropa:'dt', edad:44, gen:'m' },
      d:'Trajeron un sistema que mide cada pase, cada carrera y cada latido tuyo en tiempo real.', opts:[
      { txt:'Usarlo para todo, los datos no mienten', ef:(s,g)=>{ g.nivel=clamp((g.nivel||60)+3,30,99); s.felicidad=(s.felicidad||50)-4; return 'Entrenás con una pantalla al lado. Rendís más y disfrutás un poco menos.'; } },
      { txt:'Yo juego, no soy una planilla', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+10; return 'Los pibes te miran raro. Vos seguís mirando la pelota.'; } } ] },
    { t:'El estadio holográfico', anioMin:2048, npc:{ semilla:'dirigefut', ropa:'traje', edad:52, gen:'f' },
      d:'Estrenaron un estadio donde la publicidad, el marcador y hasta la hinchada visitante son proyecciones.', opts:[
      { txt:'Me encanta: esto es el futuro', ef:(s,g)=>{ g.fama=clamp((g.fama||40)+6,0,100); s.felicidad=(s.felicidad||50)+8; return 'Saliste en todas las pantallas del planeta a la vez. Da un poco de vértigo.'; } },
      { txt:'Prefiero el barro y la tribuna de verdad', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+12; return 'Te fuiste a ver un partido de barrio. Volviste feliz y embarrado.'; } } ] },
    { t:'Robots en el entrenamiento', anioMin:2062, npc:{ semilla:'ingeniera', ropa:'medico', edad:36, gen:'f' },
      d:'El club compró arqueros robot para las prácticas de definición. No se cansan y no fallan.', opts:[
      { txt:'Entrenar contra ellos hasta romperlos', ef:(s,g)=>{ g.nivel=clamp((g.nivel||60)+4,30,99); s.salud=(s.salud||70)-6; return 'Le metiste 400 tiros por día a una máquina. Y ahora le hacés goles.'; } },
      { txt:'Que los usen los pibes, yo prefiero gente', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+9; return 'Seguiste pateándole al arquero suplente. Se hicieron amigos.'; } } ] },
    { t:'Un partido fuera del planeta', anioMin:2075, npc:{ semilla:'astro', ropa:'traje', edad:41, gen:'m' },
      d:'Organizan el primer amistoso en la estación orbital. Gravedad baja, cancha corta y el mundo entero mirando.', opts:[
      { txt:'Subirme a la nave', ef:(s,g)=>{ g.fama=clamp((g.fama||40)+18,0,100); s.felicidad=(s.felicidad||50)+16; g.flags=g.flags||{}; g.flags.espacio=true; return 'Jugaste en órbita. Viste tu país desde arriba y no lo vas a poder explicar nunca.'; } },
      { txt:'Ni loco me subo a eso', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+4; return 'Lo viste por holo desde el sillón, como todo el mundo. Igual fue impresionante.'; } } ] },
    { t:'Te ofrecen una prótesis inteligente', anioMin:2062, npc:{ semilla:'medico2062', ropa:'medico', edad:49, gen:'m' },
      d:'Después de tantos años, la rodilla dice basta. Hay un reemplazo que la deja mejor que nueva.', opts:[
      { txt:'Operarme: quiero volver a correr', ef:(s,g)=>{ s.salud=clamp((s.salud||60)+22,0,100); g.dinero=Math.max(0,(g.dinero||0)-ri(20000,120000)); return 'Volviste a correr a los sesenta y pico. La ciencia hace cosas.'; } },
      { txt:'Prefiero envejecer con lo que tengo', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+8; return 'Cojeás un poco. Pero seguís siendo vos, entero.'; } } ] }
  ],
  familia: [
    { t:'Se agranda la familia', d:'Tu pareja te dice que viene un hijo en camino.', req:g=>!!(g.familia&&g.familia.pareja), opts:[
      { txt:'Salir corriendo a comprar la cuna', ef:(s,g)=>{ (g.familia.hijos=g.familia.hijos||[]).push(nacePersona()); s.felicidad=(s.felicidad||50)+18; s.familia=(s.familia||50)+22; s.soledad=(s.soledad||40)-25; return 'Nació. Te temblaban las manos más que antes de un penal. Nada de lo que ganaste se le parece.'; } },
      { txt:'Tomarlo con miedo y hacerte el fuerte', ef:(s,g)=>{ (g.familia.hijos=g.familia.hijos||[]).push(nacePersona()); s.felicidad=(s.felicidad||50)+9; s.familia=(s.familia||50)+14; return 'Tardaste en caer. Cuando lo tuviste en brazos entendiste que no había con qué compararlo.'; } } ] },
    { t:'Te querés casar', edadMax:66, d:'Después de años, alguien te propone dar el paso. O lo proponés vos.', req:g=>!(g.familia&&g.familia.casado), opts:[
      { txt:'Casarme', ef:(s,g)=>{ g.familia = g.familia||{}; g.familia.casado = true; g.familia.pareja = g.familia.pareja || nombreParejaNuevo(); s.felicidad=(s.felicidad||50)+16; s.familia=(s.familia||50)+20; s.soledad=(s.soledad||40)-22; return 'Fiesta chica, la gente que importa. Por una vez, ninguna cámara.'; } },
      { txt:'Todavía no', ef:(s,g)=>{ s.soledad=(s.soledad||40)+10; s.felicidad=(s.felicidad||50)-4; return 'Lo dejaste para más adelante. "Más adelante" es una palabra peligrosa.'; } } ] },
    { t:'Se te fue alguien', d:'Una llamada de madrugada. Se murió alguien de los tuyos.', peso:'duro', opts:[
      { txt:'Volver al barrio y bancar a la familia', ef:(s,g)=>{ g.familia=g.familia||{}; (g.familia.perdidas=g.familia.perdidas||[]).push(pick(['tu viejo','tu vieja','tu abuelo','tu mejor amigo de la infancia','tu tío'])); s.felicidad=(s.felicidad||50)-22; s.familia=(s.familia||50)+8; s.salud=(s.salud||70)-5; return 'Volviste al barrio. Estuviste ahí todos los días. Se te fue una parte y no vuelve.'; } },
      { txt:'No poder ir, quedarte trabajando', ef:(s,g)=>{ g.familia=g.familia||{}; (g.familia.perdidas=g.familia.perdidas||[]).push('alguien que te esperaba'); s.felicidad=(s.felicidad||50)-30; s.familia=(s.familia||50)-14; s.soledad=(s.soledad||40)+20; return 'No llegaste. Es la clase de cosa que te vuelve a la cabeza a las tres de la mañana, veinte años después.'; } } ] },
    // NIETOS: solo si tenes un hijo de 22 o mas y vos pasaste los 50. La edad del
    // hijo se calcula desde tu edad de ahora menos la que tenias cuando nacio.
    { t:'Vas a ser abuelo', req:g=>{
        const fam = g.familia||{}; const yo = g.vidaEdad || g.edad || 0;
        if (yo < 50) return false;
        return (fam.hijos||[]).some(h => (h.edad != null ? h.edad : (yo - (h.nacioConPadreDe||30))) >= 22);
      }, opts:[
      { txt:'Estar ahí para lo que necesiten', ef:(s,g)=>{
          const fam = g.familia = g.familia||{}; const yo = g.vidaEdad || g.edad || 60;
          const padres = (fam.hijos||[]).filter(h => (h.edad != null ? h.edad : (yo - (h.nacioConPadreDe||30))) >= 22);
          const madre = padres.length ? pick(padres).nombre : 'tu hijo';
          (fam.nietos = fam.nietos || []).push(nacePersona(null,{ de: madre }));
          s.felicidad = (s.felicidad||50) + 22; s.familia = (s.familia||50) + 20; s.soledad = (s.soledad||40) - 18;
          g._momentoVisual = 'bebe';
          return 'Naciste de nuevo. Lo tuviste en brazos y entendiste que todo lo demás era ruido.';
        } },
      { txt:'Alegrarme de lejos, ya di lo mío', ef:(s,g)=>{
          const fam = g.familia = g.familia||{}; const yo = g.vidaEdad || g.edad || 60;
          const padres = (fam.hijos||[]).filter(h => (h.edad != null ? h.edad : (yo - (h.nacioConPadreDe||30))) >= 22);
          (fam.nietos = fam.nietos || []).push(nacePersona(null,{ de: padres.length?pick(padres).nombre:'tu hijo' }));
          s.felicidad = (s.felicidad||50) + 8; s.soledad = (s.soledad||40) + 10;
          return 'Mandaste un regalo enorme y fuiste al mes. Te lo vas a reprochar cuando el pibe crezca sin conocerte.';
        } } ],
      d:'Uno de tus hijos te llama: viene un nieto en camino.' },
    { t:'El nieto quiere que le enseñes', req:g=>!!((g.familia||{}).nietos||[]).some(n=>(n.edad||0)>=5), opts:[
      { txt:'Llevarlo a la canchita todos los sábados', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+18; s.familia=(s.familia||50)+14; s.salud=(s.salud||70)+4; return 'Sábado tras sábado, con el termo y la pelota gastada. Es lo mejor que te pasó después del fútbol.'; } },
      { txt:'Pagarle la mejor escuelita', ef:(s,g)=>{ g.dinero=Math.max(0,(g.dinero||0)-ri(5000,25000)); s.familia=(s.familia||50)+6; return 'Va a la mejor academia de la ciudad. Lo ves por video.'; } } ],
      d:'Tu nieto agarró la pelota y no la suelta. Quiere que le enseñes vos.' },
    { t:'Tu hijo pisa una cancha por primera vez', req:g=>((g.familia||{}).hijos||[]).some(h=>(h.edad||0)>=5&&(h.edad||0)<=9), opts:[
      { txt:'Llevarlo al club y bancarlo', ef:(s,g)=>{ const h=((g.familia||{}).hijos||[]).find(x=>(x.edad||0)>=5); if(h) h.futbol=true; s.familia+=14; s.felicidad+=12; return (h?h.nombre:'Tu hijo')+' pidió la camiseta tuya para dormir. Empezó a entrenar.'; } },
      { txt:'Dejar que elija otra cosa', ef:(s,g)=>{ s.familia+=8; s.felicidad+=6; return 'Le compraste una guitarra. Nunca le pesó tu apellido.'; } } ],
      d:'Uno de tus hijos agarró la pelota y no la suelta.' },
    { t:'A tu hijo lo prueban en un club', req:g=>((g.familia||{}).hijos||[]).some(h=>h.futbol&&(h.edad||0)>=13), opts:[
      { txt:'Aconsejarlo con todo lo que aprendí', ef:(s,g)=>{ const h=((g.familia||{}).hijos||[]).find(x=>x.futbol); if(h){ h.nivel=(h.nivel||50)+8; } s.familia+=16; return 'Le contaste los errores que cometiste vos. Quedó. Y quedó por lo suyo.'; } },
      { txt:'No meterme, que aprenda solo', ef:(s,g)=>{ const h=((g.familia||{}).hijos||[]).find(x=>x.futbol); if(h){ h.nivel=(h.nivel||50)+3; } s.familia+=4; return 'Se la bancó solo. Le costó más, pero es todo suyo.'; } } ],
      d:'Tu apellido abre puertas y también pesa. Hoy le toca a él.' },
    { t:'Tu hijo quiere jugar al fútbol', d:'Uno de tus hijos te pide que lo lleves a probarse. Lleva tu apellido y eso pesa.', req:g=>!!(g.familia&&(g.familia.hijos||[]).length), opts:[
      { txt:'Llevarlo y no meterme en nada', ef:(s,g)=>{ s.familia=(s.familia||50)+16; s.felicidad=(s.felicidad||50)+10; return 'Lo dejaste hacer su camino sin tu sombra encima. Te lo va a agradecer toda la vida.'; } },
      { txt:'Mover mis contactos', ef:(s,g)=>{ const b=Math.random()<.45; s.familia=(s.familia||50)+(b?8:-16); s.felicidad=(s.felicidad||50)+(b?6:-12); return b?'Le abriste una puerta y la aprovechó él solo.':'Se le hizo insoportable el peso de tu apellido. Dejó a los 17 y te lo echó en cara.'; } } ] }
  ],
  dinero: [
    { t:'Te entraron a robar', d:'Volviste a casa y estaba todo revuelto. Se llevaron hasta las medallas.', opts:[
      { txt:'Denunciar y poner alarma', ef:(s,g)=>{ g.dinero=Math.max(0,(g.dinero||0)-ri(15000,60000)); s.felicidad=(s.felicidad||50)-10; s.salud=(s.salud||70)-3; return 'Nunca aparecieron. Lo que más te dolió no valía plata.'; } },
      { txt:'Salir a buscarlos por el barrio', ef:(s,g)=>{ const mal=Math.random()<.5; if(mal){ s.salud=(s.salud||70)-14; s.felicidad=(s.felicidad||50)-12; return 'Te agarraste a las piñas con dos pibes. Terminaste en la comisaría explicando quién eras.'; } s.felicidad=(s.felicidad||50)+6; return 'Alguien habló, aparecieron dos cosas. El resto quedó en el camino.'; } } ] },
    { t:'Multa e inspección', d:'Te cae una inspección impositiva por los años de contratos en el exterior.', opts:[
      { txt:'Pagar y cerrar el tema', ef:(s,g)=>{ g.dinero=Math.max(0,(g.dinero||0)-ri(40000,250000)); s.felicidad=(s.felicidad||50)-6; return 'Dolió, pero dormís tranquilo. Muchos colegas no pueden decir lo mismo.'; } },
      { txt:'Pelearla con abogados', ef:(s,g)=>{ const gana=Math.random()<.5; g.dinero=Math.max(0,(g.dinero||0)-(gana?ri(10000,40000):ri(120000,400000))); s.felicidad=(s.felicidad||50)+(gana?4:-16); return gana?'Ganaste el reclamo. Los honorarios igual te comieron una parte.':'Perdiste en todas las instancias. Salió el triple de caro.'; } } ] },
    { t:'Un viejo compañero te pide plata', d:'Un ex compañero, de los que estuvieron con vos en las malas, está fundido y te llama.', opts:[
      { txt:'Prestarle sin preguntar', ef:(s,g)=>{ g.dinero=Math.max(0,(g.dinero||0)-ri(20000,90000)); const vuelve=Math.random()<.4; s.felicidad=(s.felicidad||50)+(vuelve?10:2); s.soledad=(s.soledad||40)-8; return vuelve?'Te devolvió todo dos años después, con una carta.':'No te devolvió nada y dejó de atender. Igual dormís bien.'; } },
      { txt:'Decirle que no puedo', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)-8; s.soledad=(s.soledad||40)+12; return 'Se cortó la relación. A veces te preguntás qué habrá sido de él.'; } } ] }
  ],
  salud: [
    { t:'El cuerpo pasa factura', d:'Las rodillas de tantos años te tienen a maltraer. El médico habla de prótesis.', opts:[
      { txt:'Operarme ahora', ef:(s,g)=>{ g.dinero=Math.max(0,(g.dinero||0)-ri(20000,70000)); s.salud=(s.salud||70)+18; avMutar({cicatriz:1}); return 'Seis meses de rehabilitación a los cincuenta y pico. Volviste a caminar sin dolor.'; } },
      { txt:'Aguantar con calmantes', ef:(s,g)=>{ s.salud=(s.salud||70)-16; return 'Cada mañana te levantás peor. Aguantar dejó de ser una virtud hace rato.'; } } ] },
    { t:'Un susto grande', d:'Te agarró un dolor en el pecho. Te internaron 48 horas.', opts:[
      { txt:'Cambiar la vida de raíz', ef:(s,g)=>{ s.salud=(s.salud||70)+16; s.felicidad=(s.felicidad||50)+6; avMutar({peso:-1}); return 'Dejaste todo lo que te hacía mal. Los que te quieren respiraron.'; } },
      { txt:'Seguir igual, fue un susto', ef:(s,g)=>{ s.salud=(s.salud||70)-18; avMutar({peso:1}); return 'Volviste a lo mismo a la semana. El cuerpo lleva la cuenta.'; } } ] }
  ],
  futuro: [
    { t:'Te ofrecen un cuerpo nuevo', anioMin:2062, opts:[
      { txt:'Ponerme las rodillas biónicas', ef:(s,g)=>{ g.dinero=Math.max(0,(g.dinero||0)-ri(80000,400000)); s.salud=clamp((s.salud||60)+32,0,100); avMutar({cicatriz:1}); return 'Caminás sin dolor por primera vez en treinta años. A veces te olvidás de que no son tuyas.'; } },
      { txt:'Morir con las mías', ef:(s,g)=>{ s.salud=clamp((s.salud||60)-8,0,100); s.felicidad=(s.felicidad||50)+8; return 'Preferiste el dolor conocido. Hay una dignidad rara en eso.'; } } ],
      d:'Una clínica ofrece prótesis inteligentes. Dicen que vas a correr como a los 25.' },
    { t:'Un robot te pide un autógrafo', anioMin:2058, opts:[
      { txt:'Firmarle la carcasa', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+12; return 'Le firmaste el pecho de aluminio. Te dio las gracias con la voz de tu relator favorito y te quedaste mudo.'; } },
      { txt:'Negarme, no es una persona', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)-4; s.soledad=(s.soledad||40)+6; return 'Se fue sin insistir. Después pensaste que capaz el viejo del cuento eras vos.'; } } ],
      d:'Un asistente doméstico se te acerca en la plaza: dice que archivó todos tus goles.' },
    { t:'Tu clon digital', anioMin:2055, opts:[
      { txt:'Vender mi imagen para siempre', ef:(s,g)=>{ g.dinero=(g.dinero||0)+ri(400000,2500000); s.felicidad=(s.felicidad||50)-10; return 'Ahora hay un vos de veinte años metiendo goles en partidos que nunca jugaste. Cobrás por cada uno.'; } },
      { txt:'Mi cara no se vende', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+14; return 'Dijiste que no. Tus nietos lo van a contar con orgullo.'; } } ],
      d:'Una liga virtual quiere licenciar tu imagen de joven para que juegue por siempre.' },
    { t:'El fútbol cambió', anioMin:2065, opts:[
      { txt:'Aceptarlo, el juego es de los que vienen', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+10; return 'Miraste el partido con los ojos de tu nieto y te divertiste como un pibe.'; } },
      { txt:'Renegar en cada sobremesa', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)-6; s.soledad=(s.soledad||40)+8; return 'Te convertiste en ese viejo que dice que antes era mejor. Un poco tenés razón.'; } } ],
      d:'Cambiaron las reglas: hay árbitros automáticos y los partidos duran menos.' }
  ],
  social: [
    { t:'Se termina el matrimonio', req:g=>!!(g.familia&&g.familia.casado), opts:[
      { txt:'Separarnos en buenos términos', ef:(s,g)=>{ g.familia.casado=false; g.familia.exPareja=g.familia.pareja; g.familia.pareja=null; s.felicidad-=12; s.soledad+=20; return 'Se terminó sin gritos. Siguen hablando por los chicos.'; } },
      { txt:'Pelear por todo', ef:(s,g)=>{ g.familia.casado=false; g.familia.exPareja=g.familia.pareja; g.familia.pareja=null; g.dinero=Math.max(0,(g.dinero||0)-ri(50000,400000)); s.felicidad-=22; s.soledad+=26; s.familia-=18; return 'Abogados, dos años de juicio y media fortuna. Nadie ganó.'; } } ],
      d:'Hace rato que no se hablan. Uno de los dos lo dice en voz alta.' },
    { t:'Volvés a enamorarte', req:g=>!!(g.familia&&!g.familia.pareja&&(g.familia.exPareja||g.familia.viudo)), opts:[
      { txt:'Darle una oportunidad', ef:(s,g)=>{ g.familia.pareja=nombreParejaNuevo(); g.familia.casado=true; s.felicidad+=20; s.soledad-=26; return 'A esta altura ya no se busca a nadie: aparece. Y apareció.'; } },
      { txt:'Prefiero mi tranquilidad', ef:(s,g)=>{ s.soledad+=8; s.felicidad+=4; return 'Elegiste tu rutina. Hay una paz en eso también.'; } } ],
      d:'Alguien te mira distinto en el club social.' },
    { t:'Homenaje en tu viejo club', d:'Te llaman para hacerte un homenaje en el estadio donde debutaste.', opts:[
      { txt:'Ir y dar la vuelta olímpica', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+20; s.soledad=(s.soledad||40)-14; return 'El estadio entero cantó tu nombre. Lloraste como un pibe en el medio de la cancha.'; } },
      { txt:'Agradecer y no ir', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)-6; s.soledad=(s.soledad||40)+10; return 'No fuiste. Después viste el video y te arrepentiste.'; } } ] },
    { t:'Un pibe te para en la calle', d:'Un chico de doce años te reconoce y te dice que por vos empezó a jugar.', opts:[
      { txt:'Sentarme a charlar con él', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+12; s.soledad=(s.soledad||40)-10; return 'Media hora en la vereda. Le regalaste la camiseta que tenías en el auto. Se fue corriendo a contarlo.'; } },
      { txt:'Sacarme la foto y seguir', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+2; return 'Foto, sonrisa y a seguir. Para él fue el mejor día del año igual.'; } } ] }
  ]
};
// ══════════════════════════════════════════════════════════════════════════════
// LAS LEYENDAS
// Se los VE. Cada uno tiene su semilla fija, asi que siempre se dibuja igual: el
// mismo pelo, la misma ropa, la misma cara. Aparecen solo cuando tu fama alcanza,
// porque a un desconocido no lo invita nadie a su jet.
// Son personajes ORIGINALES, no versiones disimuladas de jugadores reales. Cada
// uno es un arquetipo de crack —el brasileño que juega riéndose, el obsesivo que
// se levanta a las cinco, el callado que habla poco y ve todo— con su nombre, su
// país y su forma de ser. El jugador los va a querer por lo que son.
// ══════════════════════════════════════════════════════════════════════════════
const LEYENDAS = [
  // ── EL ALEGRE: juega como si todavía estuviera en la playa de su barrio ──
  { id:'zeca', n:'Zeca Andrade', apodo:'O Sorriso', semilla:'leyZecaAndrade', ropa:'calle', edad:45, gen:'m', fama:52,
    t:'Zeca Andrade te lleva a jugar a la playa',
    d:'Te llega un audio de dos minutos, mitad en portugués y mitad riéndose. Es Zeca Andrade, "O Sorriso": armó un picadito en la arena y no acepta un no.',
    opts:[
      { txt:'Ir y jugar descalzo hasta que se haga de noche', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+18; s.soledad=(s.soledad||40)-14; g._vidaFlags=g._vidaFlags||{}; g._vidaFlags.playa=true; return 'Cuatro horas de arena, caños y carcajadas. Te hizo un sombrero, se tiró al piso de la risa y te abrazó como si te conociera de toda la vida. Volviste a tener diez años por una tarde.'; } },
      { txt:'Agradecer, estoy en pretemporada', ef:(s)=>{ s.felicidad=(s.felicidad||50)-4; return 'Dijiste que no. Después viste los videos y te quisiste morir.'; } } ] },
  // ── EL CALLADO: no habla, no posa, no falla ──
  { id:'duende', n:'Emiliano Ruiz', apodo:'El Duende', semilla:'leyEmilianoRuiz', ropa:'calle', edad:39, gen:'m', fama:64,
    t:'El Duende te invita a comer a su casa',
    d:'Un mensaje de tres palabras: "¿Venís a comer?". Es Emiliano Ruiz, el tipo más callado y más determinante que pisó una cancha. Nunca pensaste que ibas a leer eso.',
    opts:[
      { txt:'Ir con la familia', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+22; s.soledad=(s.soledad||40)-16; g._vidaFlags=g._vidaFlags||{}; g._vidaFlags.leyendaAmiga=true; return 'Asado, mate y un perro enorme que se llevó puesta a media mesa. Habla bajito y escucha el triple de lo que dice. A tus hijos les preguntó el nombre uno por uno y se los acordó toda la noche.'; } },
      { txt:'Ir solo, sin hacer ruido', ef:(s)=>{ s.felicidad=(s.felicidad||50)+14; return 'Comieron los dos, hablando de fútbol y de hijos. Se despidieron con un abrazo largo y ni una foto.'; } } ] },
  // ── EL OBSESIVO: llegó ahí por trabajo, y no deja que se te olvide ──
  { id:'maquina', n:'Rui Bettencourt', apodo:'A Máquina', semilla:'leyRuiBettencourt', ropa:'traje', edad:41, gen:'m', fama:70,
    t:'Rui Bettencourt te lleva en su jet',
    d:'Coincidieron en una gala. Al final de la noche te dice que a la mañana siguiente vuela y que hay un asiento libre.',
    opts:[
      { txt:'Subirme al jet', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+16; g.fama=clamp((g.fama||0)+6,0,100); g._vidaFlags=g._vidaFlags||{}; g._vidaFlags.jet=true; return 'Cuero blanco, agua mineral y tres horas de charla sobre disciplina. No tomó una gota de alcohol y se levantó a las cinco a entrenar en el hotel. Entendiste que el talento era la mitad más chica del asunto.'; } },
      { txt:'Prefiero volar en línea, gracias', ef:(s)=>{ s.felicidad=(s.felicidad||50)+4; return 'Te reíste y dijiste que no. Él también se rió. Quedaron bien igual.'; } } ] },
  // ── EL SHOWMAN: la fiesta lo sigue a él ──
  { id:'palmeira', n:'Vinicius Palmeira', apodo:'O Rei da Noite', semilla:'leyVinPalmeira', ropa:'calle', edad:36, gen:'m', fama:58,
    t:'Vinicius Palmeira te sienta a la mesa de póker',
    d:'Un piso altísimo, doce personas que reconocés de la tele y fichas que valen más que tu primer contrato.',
    opts:[
      { txt:'Sentarme y jugar en serio', ef:(s,g)=>{ const b=Math.random()<0.45; g.dinero=(g.dinero||0)+(b?ri(40000,260000):-ri(30000,180000)); s.felicidad=(s.felicidad||50)+(b?14:-10); return b?'Te levantaste a las seis de la mañana con más plata de la que llevaste y una anécdota para toda la vida.':'Perdiste una barbaridad en cuatro manos. Te palmeó la espalda y te juró que a él le pasó peor.'; } },
      { txt:'Mirar, charlar y no apostar', ef:(s)=>{ s.felicidad=(s.felicidad||50)+10; s.soledad=(s.soledad||40)-8; return 'No pusiste una ficha y te reíste toda la noche. Ganancia igual.'; } } ] },
  // ── EL VELOCISTA: el fútbol es el trabajo, el hobby es otra cosa ──
  { id:'craddock', n:'Owen Craddock', apodo:'El Galés', semilla:'leyOwenCraddock', ropa:'calle', edad:38, gen:'m', fama:54,
    t:'Owen Craddock te arrastra a un campo de golf',
    d:'Te manda la ubicación de un campo de golf a las siete de la mañana. Vos nunca agarraste un palo en tu vida.',
    opts:[
      { txt:'Ir y hacer el ridículo con ganas', ef:(s)=>{ s.felicidad=(s.felicidad||50)+14; s.soledad=(s.soledad||40)-10; return 'Erraste doce veces seguidas y él se rió las doce. Al final te enseñó a agarrar el palo y metiste una. Terminaron tomando cerveza a las once de la mañana.'; } },
      { txt:'El golf no es lo mío', ef:(s)=>{ s.felicidad=(s.felicidad||50)+2; return 'Le dijiste que preferías una canchita de cinco. Te contestó que él también, pero que ya no le da el cuerpo.'; } } ] },
  // ── EL CAUDILLO: el que iba al frente aunque doliera ──
  { id:'mariscal', n:'Nelson Iturralde', apodo:'El Mariscal', semilla:'leyNelsonIturralde', ropa:'calle', edad:52, gen:'m', fama:50,
    t:'El Mariscal te invita al asado de los viejos cracks',
    d:'Nelson Iturralde, el capitán que jugó una final con la nariz rota, junta a los campeones de su generación. Te quiere ahí aunque seas de otra época.',
    opts:[
      { txt:'Ir y escucharlos toda la tarde', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+16; s.soledad=(s.soledad||40)-14; g._vidaFlags=g._vidaFlags||{}; g._vidaFlags.asadoViejos=true; return 'Seis horas de historias que no están en ningún libro. Cuando te ibas te agarró del brazo: "Vos jugá siempre como si te estuvieran mirando los de tu barrio". No te lo olvidaste más.'; } },
      { txt:'Pasar a saludar y volverme', ef:(s)=>{ s.felicidad=(s.felicidad||50)+6; return 'Media hora, un abrazo y a casa. Igual te trataron como uno más.'; } } ] },
  // ── EL PRODIGIO: la generación que te empieza a pasar por arriba ──
  { id:'sylla', n:'Amadou Sylla', apodo:'Le Gamin', semilla:'leyAmadouSylla', ropa:'calle', edad:22, gen:'m', fama:60,
    t:'El pibe del momento te pide consejo',
    d:'Amadou Sylla tiene veintidós años, ya ganó todo y está aterrado. Te escribe porque dice que sos el único que no le va a mentir.',
    opts:[
      { txt:'Decirle la verdad, aunque no le guste', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+12; g._vidaFlags=g._vidaFlags||{}; g._vidaFlags.mentor=true; return 'Le dijiste que la fama se va más rápido de lo que llegó y que se guarde gente de verdad al lado. Años después, en su discurso de retiro, dijo tu nombre.'; } },
      { txt:'Decirle que disfrute y no piense tanto', ef:(s)=>{ s.felicidad=(s.felicidad||50)+6; return 'Se rió, te agradeció y siguió su camino. No era el consejo que necesitaba, pero tampoco le hizo mal.'; } } ] },
  // ── EL ARQUERO: loco, enorme y con una memoria terrible ──
  { id:'fioravanti', n:'Gigi Fioravanti', apodo:'Il Muro', semilla:'leyGigiFioravanti', ropa:'calle', edad:47, gen:'m', fama:53,
    t:'Gigi Fioravanti te recuerda aquel gol',
    d:'Te lo cruzás en un evento. Lo primero que te dice, sin saludar: "Vos me hiciste un gol en el 34, por abajo, palo izquierdo. Todavía lo sueño".',
    opts:[
      { txt:'Cargarlo un rato', ef:(s)=>{ s.felicidad=(s.felicidad||50)+13; return 'Le hiciste el gesto del gol ahí mismo. Se agarró la cabeza y terminaron los dos llorando de risa en un rincón.'; } },
      { txt:'Decirle que fue suerte', ef:(s)=>{ s.felicidad=(s.felicidad||50)+8; return 'Te miró serio: "No fue suerte. Por eso me duele". Y recién ahí se rió.'; } } ] },
  // ── EL FILÓSOFO: entiende el juego como nadie y no se calla nada ──
  { id:'haaren', n:'Ruud van Haaren', apodo:'El Profesor', semilla:'leyRuudVanHaaren', ropa:'traje', edad:58, gen:'m', fama:56,
    t:'El Profesor te quiere explicar el juego',
    d:'Ruud van Haaren te invita a su casa a ver un partido. Trae un cuaderno. Vos pensaste que era una charla; era una clase.',
    opts:[
      { txt:'Escucharlo y tomar nota', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+10; g.nivel=clamp((g.nivel||60)+2,30,99); g._vidaFlags=g._vidaFlags||{}; g._vidaFlags.profesor=true; return 'Cuatro horas y dieciocho páginas. Te explicó por qué el espacio importa más que la pelota. Después de esa noche viste el fútbol distinto para siempre.'; } },
      { txt:'Discutirle de igual a igual', ef:(s)=>{ s.felicidad=(s.felicidad||50)+15; return 'Le peleaste cada idea. Se le iluminó la cara: hacía años que nadie lo contradecía. Terminaron a los gritos y felices a las tres de la mañana.'; } } ] },
  // ── EL PIONERO: abrió la puerta por la que después pasaron todos ──
  { id:'asante', n:'Kwame Asante', apodo:'El Primero', semilla:'leyKwameAsante', ropa:'traje', edad:63, gen:'m', fama:51,
    t:'Kwame Asante te cuenta cómo era antes',
    d:'El primero de su país en jugar en Europa. Llegó a los diecisiete, solo, sin hablar el idioma, y aguantó cosas que hoy no se cuentan.',
    opts:[
      { txt:'Preguntarle todo lo que aguantó', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+12; g._vidaFlags=g._vidaFlags||{}; g._vidaFlags.pionero=true; return 'Te contó lo que le gritaban desde la tribuna y cómo salía igual a jugar. "Yo no aguanté por mí", te dijo. "Aguanté para que ustedes no tuvieran que aguantar". Te quedaste sin palabras.'; } },
      { txt:'Agradecerle y no hurgar', ef:(s)=>{ s.felicidad=(s.felicidad||50)+8; return 'Le dijiste simplemente gracias. Te apretó la mano con las dos suyas y no hizo falta nada más.'; } } ] },
  // ── LA NÚMERO UNO: la mejor del mundo, y encima tuvo que demostrarlo el doble ──
  { id:'valente', n:'Camila Valente', apodo:'La Diez', semilla:'leyCamilaValente', ropa:'calle', edad:34, gen:'f', fama:57,
    t:'Camila Valente te invita a su despedida',
    d:'La mejor jugadora de la historia de tu país se retira. Te manda una invitación escrita a mano para el partido homenaje.',
    opts:[
      { txt:'Ir y jugar el partido de exhibición', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+18; s.soledad=(s.soledad||40)-12; g._vidaFlags=g._vidaFlags||{}; g._vidaFlags.despedidaCamila=true; return 'Estadio lleno, y ella jugando descalza los últimos diez minutos. Te gambeteó dos veces y te pidió perdón riéndose. Al final agarró el micrófono y agradeció a las que vinieron antes que ella.'; } },
      { txt:'Ir de público, con mis hijos', ef:(s)=>{ s.felicidad=(s.felicidad||50)+14; s.familia=(s.familia||50)+10; return 'Tu hija no le sacó los ojos de encima en todo el partido. A la salida te pidió una pelota.'; } } ] },
  // ── EL QUE NO LLEGÓ: el mejor que viste, y no lo conoce nadie ──
  { id:'tordo', n:'Hugo Peralta', apodo:'El Tordo', semilla:'leyHugoPeralta', ropa:'calle', edad:49, gen:'m', fama:40,
    t:'El mejor que viste jugar atiende un kiosco',
    d:'Hugo Peralta era mejor que todos ustedes a los quince. Una rodilla, una mala junta y la vida. Lo cruzás atendiendo un kiosco a dos cuadras del club.',
    opts:[
      { txt:'Quedarme a charlar como si nada', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+10; s.soledad=(s.soledad||40)-8; g._vidaFlags=g._vidaFlags||{}; g._vidaFlags.tordo=true; return 'Dos horas de charla y ni una lástima. Te contó jugadas de hace treinta años como si fueran ayer. Cuando te ibas te dijo: "Yo te vi debutar, eh". Y se le llenaron los ojos.'; } },
      { txt:'Ofrecerle trabajo en mi escuela', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+16; g.dinero=Math.max(0,(g.dinero||0)-ri(8000,30000)); return 'Le ofreciste dirigir una categoría. Aceptó llorando. Resultó el mejor formador que pasó por ahí: sabía exactamente qué se siente quedarse afuera.'; } } ] }
];
// Las leyendas entran al banco de sucesos como una categoria mas, pero con el
// `npc` cargado: por eso vjDialogo las DIBUJA en vez de mostrar un cartel.
function leyendasComoSucesos(){
  return LEYENDAS.map(L=>({
    t: L.t, d: L.d, opts: L.opts,
    // `nombre` es lo que se lee arriba del diálogo: "ZECA ANDRADE · O SORRISO".
    npc: { semilla:L.semilla, ropa:L.ropa, edad:L.edad, gen:L.gen,
           nombre: L.apodo ? (L.n + ' · ' + L.apodo) : L.n },
    req: g => (g.fama || 0) >= L.fama
  }));
}
// Sucesos propios de la etapa de JUGADOR: pasan mientras todavía competís, y por
// eso chocan con el fútbol (una final el día del velorio, un hijo que nace en
// pleno campeonato, un juicio que te come la cabeza).
const SUCESOS_JUGADOR = {
  // ── LA TECNOLOGÍA QUE AVANZA ──────────────────────────────────────────────
  // El mundo del juego se mueve: cada era trae cosas que antes no existían y que
  // te tocan de cerca. Se desbloquean SOLAS con el calendario (anioMin), así que
  // una carrera larga o un legado de tres generaciones ve el mundo cambiar.
  epoca: [
    { t:'La pelota que se mide sola', anioMin:2035, npc:{ semilla:'tecnico2035', ropa:'dt', edad:44, gen:'m' },
      d:'Trajeron un sistema que mide cada pase, cada carrera y cada latido tuyo en tiempo real.', opts:[
      { txt:'Usarlo para todo, los datos no mienten', ef:(s,g)=>{ g.nivel=clamp((g.nivel||60)+3,30,99); s.felicidad=(s.felicidad||50)-4; return 'Entrenás con una pantalla al lado. Rendís más y disfrutás un poco menos.'; } },
      { txt:'Yo juego, no soy una planilla', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+10; return 'Los pibes te miran raro. Vos seguís mirando la pelota.'; } } ] },
    { t:'El estadio holográfico', anioMin:2048, npc:{ semilla:'dirigefut', ropa:'traje', edad:52, gen:'f' },
      d:'Estrenaron un estadio donde la publicidad, el marcador y hasta la hinchada visitante son proyecciones.', opts:[
      { txt:'Me encanta: esto es el futuro', ef:(s,g)=>{ g.fama=clamp((g.fama||40)+6,0,100); s.felicidad=(s.felicidad||50)+8; return 'Saliste en todas las pantallas del planeta a la vez. Da un poco de vértigo.'; } },
      { txt:'Prefiero el barro y la tribuna de verdad', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+12; return 'Te fuiste a ver un partido de barrio. Volviste feliz y embarrado.'; } } ] },
    { t:'Robots en el entrenamiento', anioMin:2062, npc:{ semilla:'ingeniera', ropa:'medico', edad:36, gen:'f' },
      d:'El club compró arqueros robot para las prácticas de definición. No se cansan y no fallan.', opts:[
      { txt:'Entrenar contra ellos hasta romperlos', ef:(s,g)=>{ g.nivel=clamp((g.nivel||60)+4,30,99); s.salud=(s.salud||70)-6; return 'Le metiste 400 tiros por día a una máquina. Y ahora le hacés goles.'; } },
      { txt:'Que los usen los pibes, yo prefiero gente', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+9; return 'Seguiste pateándole al arquero suplente. Se hicieron amigos.'; } } ] },
    { t:'Un partido fuera del planeta', anioMin:2075, npc:{ semilla:'astro', ropa:'traje', edad:41, gen:'m' },
      d:'Organizan el primer amistoso en la estación orbital. Gravedad baja, cancha corta y el mundo entero mirando.', opts:[
      { txt:'Subirme a la nave', ef:(s,g)=>{ g.fama=clamp((g.fama||40)+18,0,100); s.felicidad=(s.felicidad||50)+16; g.flags=g.flags||{}; g.flags.espacio=true; return 'Jugaste en órbita. Viste tu país desde arriba y no lo vas a poder explicar nunca.'; } },
      { txt:'Ni loco me subo a eso', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+4; return 'Lo viste por holo desde el sillón, como todo el mundo. Igual fue impresionante.'; } } ] },
    { t:'Te ofrecen una prótesis inteligente', anioMin:2062, npc:{ semilla:'medico2062', ropa:'medico', edad:49, gen:'m' },
      d:'Después de tantos años, la rodilla dice basta. Hay un reemplazo que la deja mejor que nueva.', opts:[
      { txt:'Operarme: quiero volver a correr', ef:(s,g)=>{ s.salud=clamp((s.salud||60)+22,0,100); g.dinero=Math.max(0,(g.dinero||0)-ri(20000,120000)); return 'Volviste a correr a los sesenta y pico. La ciencia hace cosas.'; } },
      { txt:'Prefiero envejecer con lo que tengo', ef:(s,g)=>{ s.felicidad=(s.felicidad||50)+8; return 'Cojeás un poco. Pero seguís siendo vos, entero.'; } } ] }
  ],
  familia: [
    { t:'Conocés a alguien', edadMin:18, req:g=>!((g.familia||{}).pareja), opts:[
      { txt:'Jugármela', ef:(s,g)=>{ g.familia=g.familia||{}; g.familia.pareja=nombreParejaNuevo(); s.felicidad+=14; s.soledad-=18; return "Empezaron a salir. Por primera vez en años pensás en algo que no es fútbol."; } },
      { txt:'Ahora no, estoy en otra', ef:(s,g)=>{ s.soledad+=10; s.felicidad-=4; return "Dijiste que no había tiempo. Es la excusa de siempre."; } } ],
      d:'Alguien te viene rondando hace rato y hoy se anima a decírtelo.' },
    { t:'Nace tu primer hijo en plena temporada', edadMin:20, req:g=>!!(g.familia&&g.familia.pareja), opts:[
      { txt:'Pedir permiso y estar en el parto', ef:(s,g)=>{ (g.familia.hijos=g.familia.hijos||[]).push(nacePersona()); s.felicidad+=20; s.familia+=24; s.soledad-=20; g.moral=clamp((g.moral||60)+8,0,100); g._momentoVisual='bebe'; g._pedirNombreHijo=true; return 'Te perdiste un partido y estuviste ahí. Después metiste gol y señalaste a la tribuna. Nadie te lo discutió.'; } },
      { txt:'Jugar igual, es un partido clave', ef:(s,g)=>{ (g.familia.hijos=g.familia.hijos||[]).push(nacePersona()); s.felicidad+=6; s.familia-=12; g.nivel=clamp((g.nivel||60)+1,30,99); g._momentoVisual='bebe'; g._pedirNombreHijo=true; return 'Jugaste. Ganaron. Llegaste a la clínica a las dos de la mañana y te lo vas a reprochar mucho tiempo.'; } } ],
      d:'Tu pareja rompió bolsa y hay partido decisivo en 36 horas.' },
    { t:'Casarte en pleno campeonato', edadMin:21, edadMax:38, req:g=>!(g.familia&&g.familia.casado), opts:[
      { txt:'Casarme ahora, la vida es una', ef:(s,g)=>{ g.familia=g.familia||{}; g.familia.casado=true; g.familia.pareja=g.familia.pareja||nombreParejaNuevo(); s.felicidad+=18; s.familia+=22; s.soledad-=24; g.moral=clamp((g.moral||60)+6,0,100); g._momentoVisual='boda'; return 'Fiesta en enero, luna de miel de cuatro días y a la pretemporada. Volviste liviano.'; } },
      { txt:'Esperar a que termine el torneo', ef:(s,g)=>{ s.familia-=10; s.felicidad-=6; g.nivel=clamp((g.nivel||60)+1,30,99); return 'Postergaste. El torneo terminó, después vino otro, y después otro.'; } } ],
      d:'Quieren casarse, pero estás peleando el campeonato y el club no larga a nadie.' },
    { t:'Se murió alguien de los tuyos', edadMin:18, opts:[
      { txt:'Viajar al velorio aunque haya partido', ef:(s,g)=>{ g.familia=g.familia||{}; (g.familia.perdidas=g.familia.perdidas||[]).push(pick(['tu viejo','tu vieja','tu abuelo','tu mejor amigo de la infancia'])); s.felicidad-=24; s.familia+=10; g.moral=clamp((g.moral||60)-10,0,100); return 'Viajaste. El club puso mala cara y vos no te enteraste: estabas donde tenías que estar.'; } },
      { txt:'Quedarme concentrado y jugar', ef:(s,g)=>{ g.familia=g.familia||{}; (g.familia.perdidas=g.familia.perdidas||[]).push('alguien que te crió'); s.felicidad-=32; s.familia-=16; s.soledad+=22; g.moral=clamp((g.moral||60)-16,0,100); g.fama=clamp((g.fama||0)+4,0,100); return 'Jugaste con una cinta negra en el brazo y metiste el gol. Lo festejaste mirando el cielo y llorando.'; } } ],
      d:'Sonó el teléfono a las cuatro de la mañana en la concentración.' },
    { t:'Tu familia quedó lejos', edadMin:19, req:g=>!!(g.clubPais && g.pais && g.clubPais !== g.pais), opts:[
      { txt:'Traerlos a vivir conmigo', ef:(s,g)=>{ g.dinero=Math.max(0,(g.dinero||0)-ri(15000,60000)); s.soledad-=28; s.familia+=20; s.felicidad+=14; return 'Alquilaste algo grande y se vinieron todos. La casa volvió a tener ruido.'; } },
      { txt:'Bancarme la distancia', ef:(s,g)=>{ s.soledad+=20; s.felicidad-=10; g.dinero=(g.dinero||0)+ri(5000,20000); return 'Videollamadas de domingo y un departamento en silencio. Ahorrás, pero se siente.'; } } ],
      d:'Estás jugando en otro país y los tuyos siguen del otro lado del océano.' }
  ],
  dinero: [
    { t:'Te entraron a robar', edadMin:19, opts:[
      { txt:'Poner seguridad y seguir', ef:(s,g)=>{ g.dinero=Math.max(0,(g.dinero||0)-ri(20000,90000)); s.felicidad-=10; return 'Se llevaron hasta la camiseta de tu debut. Eso no se recupera con un seguro.'; } },
      { txt:'Mudarme a un barrio cerrado', ef:(s,g)=>{ g.dinero=Math.max(0,(g.dinero||0)-ri(80000,300000)); s.felicidad-=4; s.soledad+=14; return 'Ahora vivís seguro, entre gente que no conocés y lejos de todo lo que eras.'; } } ],
      d:'Volviste de una concentración y te habían dado vuelta la casa.' },
    { t:'Un familiar te pide plata', edadMin:19, opts:[
      { txt:'Darle sin preguntar', ef:(s,g)=>{ g.dinero=Math.max(0,(g.dinero||0)-ri(15000,70000)); s.familia+=12; s.felicidad+=4; return 'Le diste. Nunca te lo va a devolver y los dos lo sabían de antemano.'; } },
      { txt:'Ponerle un límite', ef:(s,g)=>{ s.familia-=14; s.felicidad-=6; return 'Dijiste que no y se armó. En las fiestas se nota quién no te habla.'; } } ],
      d:'Desde que firmaste el contrato grande, el teléfono no para.' },
    { t:'Inspección impositiva', edadMin:23, opts:[
      { txt:'Pagar y cerrarlo', ef:(s,g)=>{ g.dinero=Math.max(0,(g.dinero||0)-ri(50000,280000)); s.felicidad-=6; return 'Dolió, pero dormís tranquilo. Muchos colegas no pueden decir lo mismo.'; } },
      { txt:'Pelearlo en la Justicia', ef:(s,g)=>{ const gana=Math.random()<0.5; g.dinero=Math.max(0,(g.dinero||0)-(gana?ri(10000,50000):ri(150000,500000))); s.felicidad+=gana?4:-18; if(!gana) g.fama=clamp((g.fama||0)-6,0,100); return gana?'Ganaste el reclamo. Los abogados igual se llevaron lo suyo.':'Perdiste y salió en todos lados. Encima te cargaron en la cancha.'; } } ],
      d:'Revisan los contratos de tus años en el exterior.' }
  ],
  salud: [
    { t:'No estás durmiendo', edadMin:19, opts:[
      { txt:'Consultar con un psicólogo deportivo', ef:(s,g)=>{ g.dinero=Math.max(0,(g.dinero||0)-ri(3000,12000)); s.salud+=10; s.felicidad+=12; g.nivel=clamp((g.nivel||60)+2,30,99); return 'Empezaste a hablar de lo que te pasaba. Te sacaste una mochila que ni sabías que llevabas.'; } },
      { txt:'Aguantar, es parte del oficio', ef:(s,g)=>{ s.salud-=14; s.felicidad-=10; g.nivel=clamp((g.nivel||60)-2,30,99); return 'Tres meses durmiendo cuatro horas. En cancha se te notó y nadie entendía por qué.'; } } ],
      d:'Hace semanas que mirás el techo hasta las cinco de la mañana.' },
    { t:'Presión de la tribuna', edadMin:19, opts:[
      { txt:'Cerrar las redes un tiempo', ef:(s,g)=>{ s.felicidad+=14; s.salud+=6; g.fama=clamp((g.fama||0)-4,0,100); g.nivel=clamp((g.nivel||60)+2,30,99); return 'Te borraste de todo un semestre. Volviste a disfrutar de jugar.'; } },
      { txt:'Contestarles uno por uno', ef:(s,g)=>{ const mal=Math.random()<0.55; s.felicidad+=mal?-16:6; g.fama=clamp((g.fama||0)+(mal?-8:10),0,100); return mal?'Se te fue de las manos y terminó en portada. Un desastre.':'Les contestaste con altura y la gente te bancó.'; } } ],
      d:'Te putean por redes desde que erraste aquel penal.' }
  ],
  social: [
    { t:'Un pibe te espera en la puerta', edadMin:19, npc:{ semilla:'pibehincha', ropa:'calle', edad:10, gen:'m' }, opts:[
      { txt:'Firmarle todo y sacarme la foto', ef:(s,g)=>{ s.felicidad+=10; s.soledad-=8; g.fama=clamp((g.fama||0)+3,0,100); return 'Se fue corriendo con la camiseta firmada. Vos también fuiste ese pibe alguna vez.'; } },
      { txt:'Pasar de largo, estoy cansado', ef:(s,g)=>{ s.felicidad-=8; g.fama=clamp((g.fama||0)-3,0,100); return 'Alguien lo filmó. No fue tu mejor día y quedó grabado.'; } } ],
      d:'Salís del entrenamiento y hay un nene esperándote desde hace dos horas.' },
    { t:'Vuelta al barrio', edadMin:21, opts:[
      { txt:'Poner luces en la canchita donde jugabas', ef:(s,g)=>{ g.dinero=Math.max(0,(g.dinero||0)-ri(15000,50000)); s.felicidad+=18; s.soledad-=12; g.fama=clamp((g.fama||0)+6,0,100); g.flags=g.flags||{}; g.flags.filantropo=true; return 'Le pusieron tu nombre al playón. Los pibes ahora juegan de noche.'; } },
      { txt:'Ir, saludar y volverme', ef:(s,g)=>{ s.felicidad+=6; return 'Un asado, veinte abrazos y de vuelta a la rutina.'; } } ],
      d:'Los del club de tu infancia te invitan a la inauguración de algo.' }
  ]
};
// Las leyendas viven en los DOS bancos: te pueden invitar mientras seguís jugando
// o ya retirado. Se agregan una sola vez, al cargar el archivo.
VIDA_SUCESOS.leyendas = leyendasComoSucesos();
SUCESOS_JUGADOR.leyendas = leyendasComoSucesos();
// ── VOLVER AL CLUB QUE TRAICIONASTE ──────────────────────────────────────────
// Irte al clásico rival tenía consecuencias en un número (la idolatría) pero no
// se veía nunca. Ahora la hinchada te lo cobra en la cara.
// ── LA TEMPORADA QUE NO EXISTIÓ ──────────────────────────────────────────────
// Una vez por carrera, y solo entrada la vida, aparece la rareza: jugar un año
// en otra época. Mientras dura, el mundo se dibuja como entonces (lo maneja
// epoca()), y al terminar volvés como si nada. Nadie te va a creer.
SUCESOS_JUGADOR.rareza = [
  { t:'Una temporada en otro tiempo', edadMin:26,
    req:g=>!g._retroHecho && (g.temporada||0) >= 6,
    d:'Un dirigente viejísimo te invita a jugar un torneo de exhibición en un club que ya no existe. Aceptás sin entender del todo. Cuando entrás al vestuario los botines son de cuero, no hay un solo teléfono y el año que figura en la pizarra no es este.',
    opts:[
      { txt:'Jugar la temporada entera ahí', ef:(s,g)=>{
          g._retro = g.anio; g._retroHecho = true;
          g.nivel = clamp((g.nivel||60)+3,30,99); g.moral = clamp((g.moral||60)+14,0,100);
          g.flags = g.flags||{}; g.flags.viajero = true;
          return 'Jugaste un año entero con canchas de barro, sin cámaras y con gente que fumaba en la tribuna. Aprendiste a pararte de otra manera. Cuando volviste no habían pasado ni dos horas.'; } },
      { txt:'Jugar un partido y volverme', ef:(s,g)=>{
          g._retroHecho = true; g.moral = clamp((g.moral||60)+7,0,100);
          return 'Jugaste noventa minutos y te fuiste. Te quedó la camiseta de lana, que todavía guardás y no le mostrás a nadie.'; } },
      { txt:'No entrar a esa cancha', ef:(s,g)=>{
          g._retroHecho = true;
          return 'Diste media vuelta. Cada tanto te preguntás qué había del otro lado.'; } } ] }
];
SUCESOS_JUGADOR.exclub = [
  { t:'Volvés al estadio del que te fuiste', edadMin:20,
    req:g=>!!(g.flags && g.flags.traidor && g.flags.exClub && g.flags.exClub !== g.club),
    d:'Se juega en la cancha de tu ex club. Desde que baja el micro es un solo insulto. Hay banderas con tu nombre y una palabra al lado que no se puede repetir.',
    opts:[
      { txt:'Salir a la cancha como si nada', ef:(s,g)=>{ const b=Math.random()<0.5;
          g.moral=clamp((g.moral||60)+(b?8:-12),0,100);
          if(b){ g.fama=clamp((g.fama||0)+7,0,100); return 'Aguantaste noventa minutos de silbidos y jugaste uno de tus mejores partidos. Al final aplaudieron hasta los que te puteaban.'; }
          return 'No pudiste con la presión. Errante todo el partido, te sacaron a los sesenta y salió peor: se burlaron hasta que entraste al túnel.'; } },
      { txt:'Festejarles el gol en la cara', ef:(s,g)=>{
          g.flags=g.flags||{}; g.flags.villano=true;
          g.idolatria=g.idolatria||{}; g.idolatria[g.flags.exClub]=clamp((g.idolatria[g.flags.exClub]||0)-30,-100,100);
          g.fama=clamp((g.fama||0)+12,0,100);
          return 'Metiste el gol y corriste a festejarles debajo de la tribuna. Volaron monedas, un encendedor y de todo. Te quedaste ahí igual. Esa foto la van a usar treinta años.'; } },
      { txt:'Meter el gol y pedir disculpas', ef:(s,g)=>{
          g.moral=clamp((g.moral||60)+10,0,100);
          g.idolatria=g.idolatria||{}; g.idolatria[g.flags.exClub]=clamp((g.idolatria[g.flags.exClub]||0)+18,-100,100);
          return 'Lo festejaste con las manos abiertas, pidiendo perdón. Media tribuna se calló. Con el tiempo esa imagen les ablandó el rencor.'; } } ] },
  { t:'El clásico de tu vida', edadMin:21,
    req:g=>!!(g.rival && g.rival.nombre && (g.temporada||0) >= 3),
    d:'Se cruzan otra vez, y esta vez hay un título en juego, en el estadio más grande del país. Enfrente está el que te viene marcando desde juveniles.',
    opts:[
      { txt:'Salir a comérmelo', ef:(s,g)=>{ const b=Math.random()<0.5+((g.nivel||60)-70)/220;
          if(!g.rival.ganados) g.rival.ganados=0; if(!g.rival.perdidos) g.rival.perdidos=0;
          if(b){ g.rival.ganados++; g.moral=clamp((g.moral||60)+14,0,100); g.fama=clamp((g.fama||0)+8,0,100);
            return 'Le ganaste el duelo y el partido. Al final se abrazaron largo, sin decirse nada. Los dos sabían lo que había sido.'; }
          g.rival.perdidos++; g.moral=clamp((g.moral||60)-12,0,100);
          return 'Te ganó él. Te dio la mano y te dijo "la próxima". Odiás que sea buen tipo.'; } },
      { txt:'Jugar para el equipo y olvidarme de él', ef:(s,g)=>{
          g.moral=clamp((g.moral||60)+6,0,100);
          if(g.rival) g.rival.relacion=clamp((g.rival.relacion||0)+12,-100,100);
          return 'Te sacaste la personal de la cabeza y jugaste para los once. Salió bien, y encima dejaste de vivir pendiente de él.'; } } ] }
];
// Elige un suceso disponible. En la carrera usa el repertorio del jugador; después
// del retiro, el de la segunda vida.
function vjSucesoDisponible(catPreferida){
  const enCarrera = VJ.mundo !== 'vida';
  const banco = enCarrera ? SUCESOS_JUGADOR : VIDA_SUCESOS;
  const edad = enCarrera ? (G.edad || 20) : (G.vidaEdad || 40);
  const vistos = G._vjSucVistos = G._vjSucVistos || [];
  const cats = shuffle(Object.keys(banco));
  if (catPreferida && banco[catPreferida]) cats.unshift(catPreferida);
  for(const c of cats){
    const pool = banco[c] || [];
    for(const ev of shuffle(pool)){
      const clave = c + '|' + ev.t;
      if (vistos.indexOf(clave) >= 0) continue;
      if (ev.edadMin != null && edad < ev.edadMin) continue;
      // Los sucesos de ciencia ficcion solo aparecen cuando el calendario llego ahi.
      if (ev.anioMin != null && (G.anio || 2026) < ev.anioMin) continue;
      if (ev.req && !ev.req(G)) continue;
      return { cat:c, ev, clave };
    }
  }
  return null;
}

// ── HOTSPOTS: lo que hay para hacer en cada escenario ────────────────────────
// LA ACCION QUE HACE AVANZAR LA VIDA. Va SIEMPRE primera y en TODOS los
// escenarios de la etapa: antes estaba escondida en un escenario puntual y se
// podia dar vueltas para siempre sin encontrar como seguir.
// Dónde vive cada personaje que hace avanzar la etapa.
function vjAvisoDe(npc, escena, texto){
  // Si estás en su lugar, es él en persona. Si no, un aviso que te manda para allá.
  if (VJ.escena === escena) return npc;
  const nombre = (vjEscenas()[escena] || {}).n || 'otro lado';
  return { x: npc.x, tipo:'obj', obj:'cartel', icono:'bx-map-pin', destacado:true,
    accion:'irEscena', destino:escena, lbl: texto + ' — está en ' + nombre };
}
function vjPrincipal(){
  const W = vjEscena().ancho, mid = Math.round(W*0.5);
  if (VJ.mundo === 'potrero'){
    const d = _draft; if(!d) return null;
    const ev = (d._potSet||[])[d._potPaso||0]; if(!ev) return null;
    return vjAvisoDe({ x:330, tipo:'npc', semilla:'pibes'+(d.pais||''), ropa:'calle', edad:d._potEdad||12, gen:'m',
      lbl:esc(ev.t), accion:'potrero', icono:'bx-football', destacado:true, nombre:'Los pibes', rol:'del baldío' },
      'baldio', esc(ev.t));
  }
  if (VJ.mundo === 'juveniles'){
    if(!G) return null;
    const ev = (G._juvSet||[])[G._juvPaso||0]; if(!ev) return null;
    return vjAvisoDe({ x:380, tipo:'npc', semilla:'dtjuv'+G.club, ropa:'dt', edad:52, gen:'m',
      lbl:esc(ev.t), accion:'juvenil', icono:'bx-clipboard', destacado:true, rol:'DT juveniles' },
      'predio', esc(ev.t));
  }
  if (VJ.mundo === 'club'){
    if(!G) return null;
    return ((G._evLeft||0) > 0)
      ? vjAvisoDe({ x:mid, tipo:'npc', semilla:'dt'+G.club, ropa:'dt', edad:55, gen:'m', lbl:'El técnico te quiere hablar', accion:'decision', icono:'bx-clipboard', destacado:true, rol:'DT' },
          'vestuario', 'El técnico te quiere hablar')
      : vjAvisoDe({ x:mid, tipo:'obj', obj:'pelota', escala:0.9, lbl:'JUGAR LA TEMPORADA ' + (G.anio||''), accion:'jugar', icono:'bx-play-circle', destacado:true },
          'cancha', 'JUGAR LA TEMPORADA ' + (G.anio||''));
  }
  if (VJ.mundo === 'vida'){
    if(!G || !G.vidaRol) return null;
    const hechos = G._vjHechos || {};
    // Primero lo del oficio: conseguir club, salvar el puesto, fichar, etc.
    const ar = asuntoDeRol();
    if (ar && !(G.vidaPausa > 0))
      return { x:mid, tipo:'obj', obj:'cartel', lbl:ar.txt, accion:'gestion', icono:ar.icono, destacado:true };
    if (!hechos.lapso && !(G.vidaPausa > 0))
      return vjAvisoDe({ x:mid, tipo:'npc', semilla:'jefe'+G.vidaRol, ropa: G.vidaRol==='escuela'?'escuela':'traje', edad:58,
        lbl:'Hablar con ' + vjNombreJefe().toLowerCase() + ' (decisión del tramo)', accion:'rol', icono:'bx-briefcase', destacado:true, rol:vjNombreJefe() },
        'trabajo', 'Hablar con ' + vjNombreJefe().toLowerCase());
    return vjDormirHotspot(mid);
  }
  return null;
}
// ── GESTIÓN PROPIA DE CADA ROL ───────────────────────────────────────────────
// El estado de tu carrera como DT / dirigente / etc. Se guarda en G.gestion.
function gestionAsegurar(){
  if(!G || !G.vidaRol) return null;
  if(!G.gestion){
    const pais = G.pais || 'Uruguay';
    const locales = todosClubs().filter(c=>c.pais===pais && c.str>=52 && c.str<=72);
    const c0 = locales.length ? pick(locales) : { name:'Club '+pais, str:58, liga:'Amateur '+pais, pais };
    G.gestion = { club:c0.name, str:c0.str, liga:c0.liga, pais:c0.pais, anios:0, titulos:0, sinTrabajo:false, plantel:[] };
  }
  return G.gestion;
}
// ══════════════════════════════════════════════════════════════════════════════
// EL ESCRITORIO DEL DT
// Faltaba lo mas basico del oficio: ver a quien dirigis, comprar y vender, saber
// en que puesto quedaste y mirar lo que ganaste. Sin esto "ser DT" eran cuatro
// decisiones sueltas y nada mas.
// ══════════════════════════════════════════════════════════════════════════════
const DT_POS = ['ARQ','DEF','DEF','DEF','DEF','MED','MED','MED','DEL','DEL','DEL'];
// Genera un jugador coherente con la fuerza del club y el pais de la liga.
function dtJugador(str, pais, pos){
  const edad = ri(17, 35);
  // Los pibes valen menos ahora pero pueden crecer; los veteranos ya no.
  const base = clamp(str + ri(-12, 10), 35, 96);
  const nivel = clamp(edad <= 20 ? base - ri(3,9) : edad >= 33 ? base - ri(2,7) : base, 32, 96);
  const proy = edad <= 21 ? clamp(nivel + ri(4, 16), nivel, 97) : nivel;
  return {
    n: pick(NOMBRES_M) + ' ' + apellidoDe(pais),
    pos: pos || pick(DT_POS), edad, nivel, proy,
    valor: Math.round(Math.pow(nivel/10, 4) * (edad <= 23 ? 1.5 : edad >= 32 ? 0.45 : 1) * 900)
  };
}
// Arma (una sola vez) el plantel del club que dirigis. Si cambiaste de club, se
// rehace: no podes seguir dirigiendo a los jugadores del equipo anterior.
function dtPlantelAsegurar(){
  const g = gestionAsegurar(); if(!g) return null;
  let nuevo = false;
  if (!g.plantel || !g.plantel.length || g._plantelDe !== g.club){
    g._plantelDe = g.club;
    g.plantel = DT_POS.concat(shuffle(DT_POS).slice(0,7)).map(p => dtJugador(g.str, g.pais || G.pais, p));
    g.plantel.sort((a,b)=> DT_POS.indexOf(a.pos) - DT_POS.indexOf(b.pos) || b.nivel - a.nivel);
    nuevo = true;
  }
  if (!g.mercado || g._mercadoTemp !== (G.vidaLapso||0)){
    g._mercadoTemp = G.vidaLapso || 0;
    g.mercado = Array.from({length:6}, ()=> dtJugador(g.str + 6, pick([g.pais||G.pais,'Argentina','Brasil','Uruguay']), null));
    nuevo = true;
  }
  // Se GUARDA apenas se genera. Sin esto el plantel se rearmaba de cero cada vez
  // que abrias el escritorio: otros nombres, otros numeros, nada tuyo.
  if (nuevo) save();
  return g;
}
function dtMediaPlantel(g){
  const p = (g.plantel||[]); if(!p.length) return g.str||58;
  return Math.round(p.slice(0,11).reduce((s,j)=>s+j.nivel,0) / Math.min(11, p.length));
}
// Tabla de posiciones del torneo que dirigis, con tu equipo marcado.
function dtTabla(){
  const g = dtPlantelAsegurar(); if(!g) return [];
  if (g._tabla && g._tablaTemp === (G.vidaLapso||0)) return g._tabla;
  const L = LIGAS.find(x=>x.liga===g.liga);
  const rivales = L ? L.clubs.filter(c=>c[0]!==g.club).slice(0,13) : [];
  const media = dtMediaPlantel(g);
  const filas = rivales.map(c=>({ club:c[0], str:c[1], pts: Math.round(c[1]*0.75 + rnd(-11,11)) }));
  filas.push({ club:g.club, str:media, pts: Math.round(media*0.75 + rnd(-6,14)), yo:true });
  filas.sort((a,b)=> b.pts - a.pts);
  g._tabla = filas; g._tablaTemp = G.vidaLapso||0;
  return filas;
}
window._vjEscritorio = function(tab){
  const g = dtPlantelAsegurar(); if(!g){ window._carreraHub(); return; }
  tab = tab || 'plantel';
  const R = VIDA_ROLES[G.vidaRol] || VIDA_ROLES.dt;
  const col = R.color;
  const m = document.getElementById('carrera-modal') || overlay();
  const tabBtn = (id, lbl, ic) => `<button onclick="window._vjEscritorio('${id}')" style="flex:1;background:${tab===id?col+'1e':'transparent'};border:0;border-bottom:2px solid ${tab===id?col:'transparent'};color:${tab===id?col:'#7d8a74'};padding:11px 4px;font-weight:900;font-size:11px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;"><i class='bx ${ic}' style="font-size:16px;"></i>${lbl}</button>`;
  const fichaJug = (j, extra) => `
    <div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.04);border:1px solid #232a1f;border-radius:12px;padding:9px 11px;">
      <div style="width:34px;height:26px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:${col}1c;border:1px solid ${col}44;border-radius:7px;font-size:9.5px;font-weight:900;color:${col};">${j.pos}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:12.5px;font-weight:900;color:#e9efe2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(j.n)}</div>
        <div style="font-size:10px;color:#79836f;font-weight:700;margin-top:2px;">${j.edad} años${j.proy>j.nivel?` · proyección ${j.proy}`:''}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:16px;font-weight:900;color:${j.nivel>=80?'#facc15':j.nivel>=68?col:'#9aa48f'};line-height:1;">${j.nivel}</div>
        <div style="font-size:9px;color:#6b7362;font-weight:800;margin-top:2px;">${eur(j.valor)}</div>
      </div>
      ${extra||''}
    </div>`;
  let cuerpo = '';
  if (tab === 'plantel'){
    const media = dtMediaPlantel(g);
    cuerpo = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:13px;">
        ${[['MEDIA XI',media],['JUGADORES',(g.plantel||[]).length],['AÑOS ACÁ',g.anios||0]].map(c=>`
          <div style="background:rgba(255,255,255,.04);border:1px solid #232a1f;border-radius:11px;padding:10px 4px;text-align:center;">
            <div style="font-size:18px;font-weight:900;color:#fff;line-height:1;">${c[1]}</div>
            <div style="font-size:8px;color:#79836f;font-weight:900;letter-spacing:1px;margin-top:4px;">${c[0]}</div>
          </div>`).join('')}
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${(g.plantel||[]).map((j,i)=>fichaJug(j, `<button onclick="window._dtVender(${i})" title="Vender" style="flex-shrink:0;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#f87171;border-radius:8px;padding:6px 8px;font-size:11px;font-weight:900;cursor:pointer;">Vender</button>`)).join('')}
      </div>`;
  } else if (tab === 'mercado'){
    cuerpo = `
      <div style="background:rgba(250,204,21,.07);border:1px solid rgba(250,204,21,.28);border-radius:12px;padding:11px 13px;margin-bottom:12px;">
        <div style="font-size:9px;font-weight:900;letter-spacing:1.4px;color:#facc15;">CAJA DEL CLUB</div>
        <div style="font-size:19px;font-weight:900;color:#fff;margin-top:3px;">${eur(G.dinero||0)}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${(g.mercado||[]).map((j,i)=>fichaJug(j, `<button onclick="window._dtFichar(${i})" style="flex-shrink:0;background:${col}1e;border:1px solid ${col}55;color:${col};border-radius:8px;padding:6px 9px;font-size:11px;font-weight:900;cursor:pointer;">Fichar</button>`)).join('')}
      </div>
      <div style="font-size:11px;color:#79836f;line-height:1.55;margin-top:11px;">El mercado se renueva cada tramo. Los pibes con proyección alta valen menos hoy de lo que van a valer.</div>`;
  } else if (tab === 'tabla'){
    const filas = dtTabla();
    const miPos = filas.findIndex(f=>f.yo) + 1;
    cuerpo = `
      <div style="background:${col}12;border:1px solid ${col}40;border-radius:12px;padding:12px 14px;margin-bottom:12px;">
        <div style="font-size:9px;font-weight:900;letter-spacing:1.4px;color:${col};">${esc(g.liga||'')}</div>
        <div style="font-size:15px;font-weight:900;color:#fff;margin-top:4px;">${esc(g.club)} va ${miPos}º de ${filas.length}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:3px;">
        ${filas.map((f,i)=>`
          <div style="display:flex;align-items:center;gap:9px;background:${f.yo?col+'16':'rgba(255,255,255,.03)'};border:1px solid ${f.yo?col+'50':'#1e241a'};border-radius:9px;padding:8px 11px;">
            <span style="width:19px;font-size:11px;font-weight:900;color:${i===0?'#facc15':f.yo?col:'#6b7362'};">${i+1}</span>
            <span style="flex:1;min-width:0;font-size:12px;font-weight:${f.yo?900:700};color:${f.yo?'#fff':'#b9c4ad'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(f.club)}</span>
            <span style="font-size:12.5px;font-weight:900;color:${f.yo?col:'#8d9782'};">${f.pts}</span>
          </div>`).join('')}
      </div>`;
  } else {
    const v = (G.vitrina || []).filter(t=>t.comoDT);   // acá va lo del banco, no lo de jugador
    cuerpo = v.length ? `
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${v.slice().reverse().map(t=>`
          <div style="display:flex;align-items:center;gap:11px;background:rgba(250,204,21,.06);border:1px solid rgba(250,204,21,.22);border-radius:12px;padding:10px 12px;">
            <div style="flex-shrink:0;">${trofeoRender(t.nombre, 34)}</div>
            <div style="min-width:0;">
              <div style="font-size:12.5px;font-weight:900;color:#fff;">${esc(t.nombre)}</div>
              <div style="font-size:10px;color:#79836f;font-weight:700;margin-top:2px;">${esc(t.club||'')}${t.edad?` · a los ${t.edad}`:''}</div>
            </div>
          </div>`).join('')}
      </div>`
      : `<div style="text-align:center;padding:34px 16px;color:#79836f;font-size:13px;line-height:1.6;"><i class='bx bx-trophy' style="font-size:38px;display:block;margin-bottom:10px;opacity:.4;"></i>Todavía no ganaste nada.<br>La vitrina se llena dirigiendo.</div>`;
  }
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:26px 16px calc(28px + env(safe-area-inset-bottom));">
    <div style="font-size:10px;font-weight:900;letter-spacing:2.2px;color:${col};margin-bottom:7px;">${esc(String(R.n).toUpperCase())}</div>
    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:23px;color:#fff;line-height:1.15;margin-bottom:3px;">${esc(g.club)}</div>
    <div style="font-size:12px;color:#8d9782;font-weight:700;margin-bottom:16px;">${esc(g.liga||'')} · ${g.titulos||0} título${(g.titulos||0)===1?'':'s'} dirigiendo</div>
    <div style="display:flex;background:rgba(255,255,255,.03);border:1px solid #232a1f;border-radius:13px;overflow:hidden;margin-bottom:15px;">
      ${tabBtn('plantel','Plantel','bx-group')}${tabBtn('mercado','Mercado','bx-transfer')}${tabBtn('tabla','Tabla','bx-list-ol')}${tabBtn('vitrina','Vitrina','bx-trophy')}
    </div>
    ${cuerpo}
    <button onclick="window._vidaJugable()" style="width:100%;margin-top:18px;background:rgba(255,255,255,.05);border:1px solid #2a3222;color:#cfd8c6;border-radius:13px;padding:14px;font-weight:900;font-size:13.5px;cursor:pointer;">Volver</button>
  </div>`;
};
window._dtFichar = function(i){
  const g = dtPlantelAsegurar(); if(!g) return;
  const j = (g.mercado||[])[i]; if(!j) return;
  if ((G.dinero||0) < j.valor){ alert('No te alcanza la caja para fichar a ' + j.n + '.'); return; }
  G.dinero = (G.dinero||0) - j.valor;
  g.plantel.push(j);
  g.plantel.sort((a,b)=> DT_POS.indexOf(a.pos) - DT_POS.indexOf(b.pos) || b.nivel - a.nivel);
  g.mercado.splice(i,1);
  g.str = clamp(Math.round((g.str||58)*0.85 + dtMediaPlantel(g)*0.15), 30, 95);
  g._tablaTemp = null;                       // la tabla se recalcula con el refuerzo
  save();
  window._vjEscritorio('mercado');
};
window._dtVender = function(i){
  const g = dtPlantelAsegurar(); if(!g) return;
  const j = (g.plantel||[])[i]; if(!j) return;
  if ((g.plantel||[]).length <= 11){ alert('No podés quedarte con menos de once. Fichá antes de vender.'); return; }
  G.dinero = (G.dinero||0) + Math.round(j.valor * 0.85);
  g.plantel.splice(i,1);
  g.str = clamp(Math.round((g.str||58)*0.85 + dtMediaPlantel(g)*0.15), 30, 95);
  g._tablaTemp = null;
  save();
  window._vjEscritorio('plantel');
};
// Los clubes a los que podés ir según cómo te fue.
function clubesParaDirigir(){
  const g = gestionAsegurar(); if(!g) return [];
  const techo = 55 + (g.titulos||0)*8 + Math.min(20, (G.fama||40)/4);
  return shuffle(todosClubs().filter(c => c.name !== g.club && c.str <= techo && c.str >= techo - 26)).slice(0,3);
}

// ══════════════════════════════════════════════════════════════════════════════
// LA AGENDA DE CADA OFICIO
// Antes el juego pedía SIEMPRE lo mismo ("reforzá el plantel", "mirá tele",
// "descansá") y nada de lo que elegías cambiaba el mundo. Ahora cada rol tiene su
// propia agenda de asuntos distintos, que se van desbloqueando según cómo te va:
// un DT arranca en el ascenso y puede terminar dirigiendo la selección y ganando
// una copa internacional; un dirigente puede comprar el club; un comentarista
// puede terminar con su propio programa. Nada se repite dentro de una partida
// mientras queden asuntos nuevos.
//
// Cada asunto: { id, txt, icono, req(g,s), titulo, texto(g), opts:[{txt, ef(g,s,G)}] }
// `ef` devuelve el texto del resultado y puede tocar TODO: club, liga, títulos,
// plata, barras y flags.
// ══════════════════════════════════════════════════════════════════════════════
function _gsubir(g, salto){
  // Ascender de categoría: el club sube de fuerza y, si toca, de liga.
  g.str = clamp((g.str||58) + (salto||6), 30, 95);
  const sup = (LIGA_PAIR[g.liga] || {}).arriba;
  if (sup && (g.str >= 70)) g.liga = sup;
  return g;
}
function _gtitulo(g, G, nombre){
  g.titulos = (g.titulos||0) + 1;
  G.titulos = (G.titulos||0) + 1;
  if(!G.vitrina) G.vitrina = [];
  G.vitrina.push({ comoDT:true, nombre: nombre || 'Título como ' + (VIDA_ROLES[G.vidaRol]||{n:'dirigente'}).n,
    edad: G.vidaEdad, club: g.club || '' });
  return g;
}
const GESTION_AGENDA = {
  dt: [
    { id:'dt_idea', txt:'Definir la idea de juego del equipo', icono:'bx-clipboard',
      titulo:'¿Cómo va a jugar tu equipo?', texto:g=>'Primera pretemporada en ' + esc(g.club) + '. Lo que decidas acá te va a definir como técnico.',
      opts:[
        { txt:'Presión alta y salida jugada', ef:(g,s)=>{ s.resultados=clamp((s.resultados||50)+12,0,100); s.plantel=clamp((s.plantel||50)-6,0,100); return 'El equipo juega bien y el que no corre, no juega. Te ganaste fama de exigente.'; } },
        { txt:'Orden, bloque bajo y contra', ef:(g,s)=>{ s.resultados=clamp((s.resultados||50)+8,0,100); s.presion=clamp((s.presion||45)-8,0,100); return 'Feo pero eficaz. Suman de a tres y la tribuna se calla cuando gana.'; } },
        { txt:'Adaptarme a lo que tenga', ef:(g,s)=>{ s.plantel=clamp((s.plantel||50)+14,0,100); return 'Los jugadores sintieron que los escuchabas. El vestuario es tuyo.'; } } ] },
    { id:'dt_mercado', txt:'Armar el plantel para la temporada', icono:'bx-user-plus',
      titulo:'Se abre el mercado', texto:g=>'Hay una sola bala en ' + esc(g.club) + ' y tres formas de gastarla.',
      opts:[
        { txt:'Traer un 9 caro y probado', ef:(g,s,G)=>{ G.dinero=Math.max(0,(G.dinero||0)-ri(20000,90000)); const b=Math.random()<0.6; s.resultados=clamp((s.resultados||50)+(b?16:-8),0,100); return b?'Metió 22 goles. Te salvó el año él solo.':'No la metió nunca. Un desastre carísimo.'; } },
        { txt:'Subir tres pibes de la cantera', ef:(g,s,G)=>{ const b=Math.random()<0.55; s.plantel=clamp((s.plantel||50)+12,0,100); s.resultados=clamp((s.resultados||50)+(b?10:-6),0,100); if(b){ G._vidaFlags=G._vidaFlags||{}; G._vidaFlags.descubrio=true; } return b?'Uno de los tres explotó y hoy juega en Europa. Lo hiciste debutar vos.':'Les pesó. Pagaste el aprendizaje con puntos.'; } },
        { txt:'No traer a nadie y bancar al grupo', ef:(g,s)=>{ s.plantel=clamp((s.plantel||50)+18,0,100); s.presion=clamp((s.presion||45)+8,0,100); return 'El plantel se sintió respaldado. La prensa te mató igual.'; } } ] },
    { id:'dt_clasico', txt:'Preparar el clásico', icono:'bx-shield',
      titulo:'La semana del clásico', texto:g=>'En ' + esc(g.club) + ' el año se mide por este partido y nada más.',
      opts:[
        { txt:'Calentar la semana en la conferencia', ef:(g,s,G)=>{ const b=Math.random()<0.5; s.resultados=clamp((s.resultados||50)+(b?14:-12),0,100); s.presion=clamp((s.presion||45)+(b?-10:18),0,100); return b?'Ganaron 3-0 y quedaste como un profeta.':'Perdieron y todo lo que dijiste te volvió como un boomerang.'; } },
        { txt:'Bajar el ruido y trabajar tranquilo', ef:(g,s)=>{ const b=Math.random()<0.58; s.resultados=clamp((s.resultados||50)+(b?10:-5),0,100); return b?'Ganaron sin hacer ruido. Así también se gana.':'Empate gris. Nadie se acuerda de los empates.'; } } ] },
    { id:'dt_copa', txt:'Jugar la copa internacional', icono:'bx-trophy', req:(g)=>(g.titulos||0)>=1,
      titulo:'Cruce de copa', texto:g=>esc(g.club) + ' se metió en la copa. Enfrente hay un equipo con cuatro veces tu presupuesto.',
      opts:[
        { txt:'Salir a jugarles de igual a igual', ef:(g,s,G)=>{ const b=Math.random()<0.42+(s.resultados-50)/300; if(b){ _gtitulo(g,G,'Copa internacional'); s.resultados=clamp(s.resultados+22,0,100); return 'LA GANARON. Una noche que se cuenta toda la vida.'; } s.resultados=clamp(s.resultados-8,0,100); return 'Cayeron con honor. Nadie te lo reprocha, pero duele.'; } },
        { txt:'Priorizar el torneo local', ef:(g,s,G)=>{ const b=Math.random()<0.5; if(b){ _gtitulo(g,G,'Liga nacional'); return 'Dejaste la copa y saliste campeón local. Nadie discute un título.'; } s.presion=clamp(s.presion+14,0,100); return 'Te fuiste de la copa y tampoco ganaste la liga. Lo peor de los dos mundos.'; } } ] },
    { id:'dt_salto', txt:'Escuchar una oferta de otro club', icono:'bx-transfer', req:(g,s)=>(s.resultados||50)>=58,
      titulo:'Te vienen a buscar', texto:g=>'Un club más grande que ' + esc(g.club) + ' quiere que dirijas vos.',
      opts:[
        { txt:'Aceptar y dar el salto', ef:(g,s,G)=>{ const cand=clubesParaDirigir(); const c=cand[0]; if(c){ g.club=c.name; g.str=c.str; g.liga=c.liga; g.pais=c.pais; g.anios=0; } s.presion=clamp((s.presion||45)+16,0,100); return 'Te fuiste a ' + esc(g.club) + '. Otra escala, otra exigencia, otro sueldo.'; } },
        { txt:'Quedarme y terminar el proyecto', ef:(g,s)=>{ s.plantel=clamp((s.plantel||50)+16,0,100); s.resultados=clamp((s.resultados||50)+8,0,100); return 'La gente te lo agradeció con un mural en el estadio.'; } },
        { txt:'Usar la oferta para renegociar', ef:(g,s,G)=>{ G.dinero=(G.dinero||0)+ri(40000,180000); s.plantel=clamp((s.plantel||50)-8,0,100); return 'Te subieron el sueldo. En el vestuario se enteraron y no cayó bien.'; } } ] },
    { id:'dt_seleccion', txt:'Responder el llamado de la selección', icono:'bx-world', req:(g)=>(g.titulos||0)>=2 && !g.esSeleccion,
      titulo:'Te llama tu país', texto:g=>'La federación quiere que dirijas la selección de ' + esc(G.pais||'tu país') + '.',
      opts:[
        { txt:'Aceptar: es el escudo de mi país', ef:(g,s,G)=>{ g.club='Selección de '+(G.pais||'Uruguay'); g.str=82; g.liga='Selección'; g.esSeleccion=true; g.sinTrabajo=false; g.anios=0; s.presion=clamp((s.presion||45)+22,0,100); G._vidaFlags=G._vidaFlags||{}; G._vidaFlags.seleccionador=true; return 'Dirigís a tu país. Himno, escudo y un país entero encima.'; } },
        { txt:'Todavía no, quiero seguir en clubes', ef:(g,s)=>{ s.resultados=clamp((s.resultados||50)+6,0,100); return 'Dijiste que no. En el club te lo valoraron; en la federación, no tanto.'; } } ] },
    { id:'dt_mundial', txt:'Dirigir el Mundial', icono:'bx-trophy', req:(g)=>!!g.esSeleccion,
      titulo:'El Mundial', texto:g=>'Cuatro años de trabajo se juegan en un mes. Todo el país mirando.',
      opts:[
        { txt:'Ir con los de siempre', ef:(g,s,G)=>{ const b=Math.random()<0.30+(s.resultados-50)/260; if(b){ _gtitulo(g,G,'Mundial'); G._vidaFlags=G._vidaFlags||{}; G._vidaFlags.campeonMundo=true; return 'CAMPEONES DEL MUNDO. Tu nombre ya no se borra nunca más.'; } s.presion=clamp(s.presion+20,0,100); return 'Quedaron afuera en cuartos. Media hora mala y cuatro años a la basura.'; } },
        { txt:'Apostar a una camada nueva', ef:(g,s,G)=>{ const b=Math.random()<0.24; if(b){ _gtitulo(g,G,'Mundial'); return 'Los pibes dieron el golpe. Campeones, y con un equipo para diez años.'; } s.resultados=clamp(s.resultados-10,0,100); return 'Se les notó la falta de rodaje. Pero dejaste una base enorme.'; } } ] },
    { id:'dt_ascenso', txt:'Pelear el ascenso', icono:'bx-trending-up', req:(g)=>(g.str||58)<=62,
      titulo:'La final del ascenso', texto:g=>esc(g.club) + ' llegó a la final por subir de categoría. No hay revancha.',
      opts:[
        { txt:'Salir a ganarla como sea', ef:(g,s,G)=>{ const b=Math.random()<0.52; if(b){ _gsubir(g,10); _gtitulo(g,G,'Ascenso'); s.resultados=clamp(s.resultados+18,0,100); return '¡ASCENDIERON! Cancha llena, gente llorando y vos en el medio.'; } s.presion=clamp(s.presion+18,0,100); return 'Se perdió por penales. Un año entero por la borda.'; } },
        { txt:'Jugar al empate y confiar en la vuelta', ef:(g,s,G)=>{ const b=Math.random()<0.40; if(b){ _gsubir(g,8); _gtitulo(g,G,'Ascenso'); return 'Subieron sufriendo. Feo, pero están arriba.'; } return 'Los agarraron de contra. Un año más en la B.'; } } ] },
    { id:'dt_legado', txt:'Dejar algo que te sobreviva', icono:'bx-medal', req:(g,s,G)=>(G.vidaEdad||40)>=58,
      titulo:'¿Qué dejás?', texto:g=>'Ya no dirigís por el sueldo. Dirigís por lo que quede después.',
      opts:[
        { txt:'Formar técnicos jóvenes', ef:(g,s,G)=>{ G._vidaFlags=G._vidaFlags||{}; G._vidaFlags.escuelaDT=true; s.plantel=clamp((s.plantel||50)+18,0,100); return 'Media liga la dirigen ayudantes tuyos. Eso también es ganar.'; } },
        { txt:'Ir por un último título grande', ef:(g,s,G)=>{ const b=Math.random()<0.4; if(b){ _gtitulo(g,G,'Último título'); return 'Lo diste vuelta a los 60 y pico. Los viejos también ganan.'; } s.salud=clamp((s.salud||70)-10,0,100); return 'Te dejaste la salud en el intento. No alcanzó.'; } } ] }
  ],
  dirigente: [
    { id:'di_caja', txt:'Decidir en qué se gasta la plata del club', icono:'bx-wallet',
      titulo:'Hay caja para una sola cosa', texto:g=>'El presupuesto de ' + esc(g.club) + ' da para una decisión, no para tres.',
      opts:[
        { txt:'Refuerzos: el socio quiere ganar ya', ef:(g,s)=>{ s.socios=clamp((s.socios||50)+16,0,100); s.caja=clamp((s.caja||50)-18,0,100); return 'Cinco caras nuevas y la platea llena. La caja quedó en el hueso.'; } },
        { txt:'Arreglar el estadio', ef:(g,s)=>{ s.caja=clamp((s.caja||50)-12,0,100); s.poder=clamp((s.poder||50)+12,0,100); return 'La tribuna nueva lleva tu nombre. La gente lo va a recordar.'; } },
        { txt:'Guardarla: primero sanear el club', ef:(g,s)=>{ s.caja=clamp((s.caja||50)+22,0,100); s.socios=clamp((s.socios||50)-14,0,100); return 'Aburrido pero sano. Por primera vez en años el club no debe nada.'; } } ] },
    { id:'di_cantera', txt:'Poner en marcha las inferiores', icono:'bx-user-plus',
      titulo:'La cantera está abandonada', texto:g=>'Hace años que ' + esc(g.club) + ' no saca un jugador propio.',
      opts:[
        { txt:'Invertir fuerte en formativas', ef:(g,s,G)=>{ s.caja=clamp((s.caja||50)-14,0,100); G._vidaFlags=G._vidaFlags||{}; G._vidaFlags.canteraViva=true; return 'Cinco años después el club vende dos juveniles a Europa. Fue idea tuya.'; } },
        { txt:'Comprar hecho, es más rápido', ef:(g,s)=>{ s.caja=clamp((s.caja||50)-20,0,100); s.socios=clamp((s.socios||50)+10,0,100); return 'Ganás hoy y pagás mañana. Clásico.'; } } ] },
    { id:'di_eleccion', txt:'Jugarte la elección del club', icono:'bx-crown',
      titulo:'Elecciones en el club', texto:g=>'Se vota la presidencia de ' + esc(g.club) + '. Enfrente hay una lista con mucha más plata.',
      opts:[
        { txt:'Ir de candidato a presidente', ef:(g,s,G)=>{ const b=Math.random()<0.45+((s.socios||50)-50)/160; if(b){ s.poder=clamp((s.poder||50)+28,0,100); G._vidaFlags=G._vidaFlags||{}; G._vidaFlags.presidente=true; return 'PRESIDENTE. El club que te formó ahora lo dirigís vos.'; } s.poder=clamp((s.poder||50)-16,0,100); return 'Perdiste por poco. Te quedaste sin cargo y con enemigos nuevos.'; } },
        { txt:'Negociar un lugar en la lista ganadora', ef:(g,s)=>{ s.poder=clamp((s.poder||50)+10,0,100); s.socios=clamp((s.socios||50)-8,0,100); return 'Quedaste adentro, pero de prestado. Sos el segundo de alguien.'; } } ] },
    { id:'di_venta', txt:'Resolver la venta de la joya del club', icono:'bx-dollar-circle',
      titulo:'Ofertan por el pibe', texto:g=>'Llega una oferta enorme por el juvenil que ' + esc(g.club) + ' hizo debutar.',
      opts:[
        { txt:'Venderlo: esa plata salva al club', ef:(g,s,G)=>{ s.caja=clamp((s.caja||50)+26,0,100); s.socios=clamp((s.socios||50)-18,0,100); G.dinero=(G.dinero||0)+ri(10000,60000); return 'El club quedó saneado por diez años. La hinchada nunca te lo perdonó.'; } },
        { txt:'Bancarlo un año más', ef:(g,s)=>{ const b=Math.random()<0.5; s.socios=clamp((s.socios||50)+16,0,100); s.caja=clamp((s.caja||50)+(b?18:-14),0,100); return b?'Se fue un año después por el triple. Le ganaste al mercado.':'Se lesionó y se fue gratis. Un desastre.'; } } ] },
    { id:'di_dueno', txt:'Decidir si comprás el club', icono:'bx-buildings', req:(g,s)=>(s.poder||50)>=62,
      titulo:'Te ofrecen quedarte con el club', texto:g=>'Un fondo quiere comprar ' + esc(g.club) + '. Vos podés adelantarte.',
      opts:[
        { txt:'Comprarlo yo, no lo entrego', ef:(g,s,G)=>{ G.dinero=Math.max(0,(G.dinero||0)-ri(200000,900000)); s.poder=clamp((s.poder||50)+24,0,100); G._vidaFlags=G._vidaFlags||{}; G._vidaFlags.duenoClub=true; return 'El club es tuyo. Pusiste casi todo lo que ganaste jugando, y dormís tranquilo.'; } },
        { txt:'Dejar entrar al fondo y quedarme de socio', ef:(g,s,G)=>{ G.dinero=(G.dinero||0)+ri(300000,1200000); s.socios=clamp((s.socios||50)-22,0,100); return 'Cobraste una fortuna. La gente puso banderas en tu contra.'; } } ] }
  ],
  escuela: [
    { id:'es_pibes', txt:'Salir a buscar chicos para la escuelita', icono:'bx-user-plus',
      titulo:'Faltan pibes', texto:()=>'La escuelita tiene más pelotas que chicos.',
      opts:[
        { txt:'Recorrer los barrios uno por uno', ef:(g,s)=>{ s.pibes=clamp((s.pibes||50)+20,0,100); s.economia=clamp((s.economia||50)-8,0,100); return 'Cuarenta chicos nuevos. Nafta, tiempo y ninguna queja.'; } },
        { txt:'Bajar la cuota a la mitad', ef:(g,s)=>{ s.pibes=clamp((s.pibes||50)+26,0,100); s.economia=clamp((s.economia||50)-18,0,100); return 'Se llenó. Ahora hay que ver cómo se paga la luz.'; } },
        { txt:'Quedarme con los que ya están', ef:(g,s)=>{ s.economia=clamp((s.economia||50)+12,0,100); s.prestigio=clamp((s.prestigio||50)-6,0,100); return 'Menos chicos, más plata, menos alma.'; } } ] },
    { id:'es_cancha', txt:'Conseguir una cancha propia', icono:'bx-map',
      titulo:'La cancha prestada se termina', texto:()=>'El club que te presta el predio quiere el terreno de vuelta.',
      opts:[
        { txt:'Comprar un terreno con lo mío', ef:(g,s,G)=>{ G.dinero=Math.max(0,(G.dinero||0)-ri(60000,300000)); s.prestigio=clamp((s.prestigio||50)+22,0,100); G._vidaFlags=G._vidaFlags||{}; G._vidaFlags.predioPropio=true; return 'Tenés tu predio. Con tu nombre en el portón y sin depender de nadie.'; } },
        { txt:'Buscar un sponsor que lo banque', ef:(g,s)=>{ const b=Math.random()<0.55; s.economia=clamp((s.economia||50)+(b?20:-6),0,100); return b?'Una empresa puso la plata. Ahora la escuela lleva su logo, pero existe.':'Nadie quiso poner un peso. Siguen jugando en el baldío.'; } } ] },
    { id:'es_crack', txt:'Decidir el futuro de tu mejor alumno', icono:'bx-star',
      titulo:'Vinieron a buscar a uno tuyo', texto:()=>'Un club grande quiere llevarse al pibe que formaste desde los seis años.',
      opts:[
        { txt:'Dejarlo ir y pedir un porcentaje', ef:(g,s,G)=>{ s.prestigio=clamp((s.prestigio||50)+18,0,100); G.dinero=(G.dinero||0)+ri(20000,120000); return 'Se fue, la rompió, y cada venta suya te deja algo. Tu escuela quedó en el mapa.'; } },
        { txt:'Frenarlo un año más, todavía es chico', ef:(g,s)=>{ const b=Math.random()<0.5; s.pibes=clamp((s.pibes||50)+10,0,100); s.prestigio=clamp((s.prestigio||50)+(b?14:-12),0,100); return b?'Maduró un año más y llegó mejor parado. Te lo agradece siempre.':'La familia se enojó y se lo llevaron igual. Quedaste como el malo.'; } } ] }
  ],
  comentarista: [
    { id:'co_tono', txt:'Definir el tono de tu programa', icono:'bx-microphone',
      titulo:'Arranca la temporada al aire', texto:()=>'El canal quiere saber qué clase de panelista sos.',
      opts:[
        { txt:'Ir al hueso con los dirigentes', ef:(g,s)=>{ s.polemica=clamp((s.polemica||50)+22,0,100); s.rating=clamp((s.rating||50)+16,0,100); s.credibilidad=clamp((s.credibilidad||50)+8,0,100); return 'Rompiste el rating y te cerraron tres vestuarios.'; } },
        { txt:'Hablar de fútbol y nada más', ef:(g,s)=>{ s.credibilidad=clamp((s.credibilidad||50)+20,0,100); s.rating=clamp((s.rating||50)-4,0,100); return 'Los que saben te escuchan. El rating no vuela, pero nadie te discute.'; } },
        { txt:'Hacer show, la tele es espectáculo', ef:(g,s)=>{ s.rating=clamp((s.rating||50)+22,0,100); s.credibilidad=clamp((s.credibilidad||50)-18,0,100); return 'Sos un personaje. Te imitan en los programas de humor.'; } } ] },
    { id:'co_primicia', txt:'Decidir qué hacés con una primicia', icono:'bx-news',
      titulo:'Te llega una bomba', texto:()=>'Tenés en la mano algo que hunde a un dirigente. Y una llamada pidiéndote que no lo saques.',
      opts:[
        { txt:'Sacarla al aire', ef:(g,s,G)=>{ s.polemica=clamp((s.polemica||50)+26,0,100); s.credibilidad=clamp((s.credibilidad||50)+16,0,100); G._vidaFlags=G._vidaFlags||{}; G._vidaFlags.periodista=true; return 'Se cayó una comisión directiva entera. Nadie más te invita a un asado dirigencial.'; } },
        { txt:'Guardarla a cambio de acceso', ef:(g,s,G)=>{ G.dinero=(G.dinero||0)+ri(20000,90000); s.credibilidad=clamp((s.credibilidad||50)-20,0,100); return 'Cobraste el silencio. Vos sabés lo que hiciste.'; } } ] },
    { id:'co_propio', txt:'Poner tu propio programa', icono:'bx-broadcast', req:(g,s)=>(s.rating||50)>=60,
      titulo:'Te ofrecen un programa propio', texto:()=>'Tu nombre arriba del título. Y todo el riesgo también.',
      opts:[
        { txt:'Jugármela con mi propio programa', ef:(g,s,G)=>{ const b=Math.random()<0.55; s.rating=clamp((s.rating||50)+(b?24:-18),0,100); if(b){ G._vidaFlags=G._vidaFlags||{}; G._vidaFlags.programaPropio=true; G.dinero=(G.dinero||0)+ri(80000,400000); } return b?'Líder de su horario. Tu apellido vale más que el del canal.':'Duró cuatro meses. Volviste al panel con la cola entre las patas.'; } },
        { txt:'Seguir de panelista, es más seguro', ef:(g,s)=>{ s.credibilidad=clamp((s.credibilidad||50)+10,0,100); return 'Elegiste la estabilidad. Cobrás igual todos los meses y dormís bien.'; } } ] },
    { id:'co_mundial', txt:'Relatar el Mundial', icono:'bx-world', req:(g,s)=>(s.credibilidad||50)>=55,
      titulo:'Te mandan al Mundial', texto:()=>'Un mes afuera, la voz de tu país en la transmisión.',
      opts:[
        { txt:'Ir y dejar todo ahí', ef:(g,s,G)=>{ s.rating=clamp((s.rating||50)+20,0,100); s.credibilidad=clamp((s.credibilidad||50)+14,0,100); G._vidaFlags=G._vidaFlags||{}; G._vidaFlags.relatoMundial=true; return 'Tu relato del gol quedó en la memoria del país. Lo pasan cada cuatro años.'; } },
        { txt:'No ir: no me quiero perder a los míos', ef:(g,s)=>{ s.felicidad=clamp((s.felicidad||50)+14,0,100); s.rating=clamp((s.rating||50)-10,0,100); return 'Lo viste con tus nietos en el sillón. No te arrepentís ni un poco.'; } } ] }
  ],
  empresario: [
    { id:'em_negocio', txt:'Mover un negocio nuevo', icono:'bx-store',
      titulo:'Una oportunidad sobre la mesa', texto:()=>'Un conocido te trae un negocio. Como siempre.',
      opts:[
        { txt:'Entrar fuerte', ef:(g,s,G)=>{ const b=Math.random()<0.5; s.riesgo=clamp((s.riesgo||40)+18,0,100); s.patrimonio=clamp((s.patrimonio||50)+(b?22:-20),0,100); G.dinero=Math.max(0,(G.dinero||0)+(b?ri(100000,600000):-ri(80000,400000))); return b?'Salió redondo. Multiplicaste la apuesta.':'Se cayó todo. Perdiste una fortuna y un amigo.'; } },
        { txt:'Entrar con poco y mirar', ef:(g,s,G)=>{ s.patrimonio=clamp((s.patrimonio||50)+8,0,100); s.contactos=clamp((s.contactos||50)+8,0,100); return 'Ganaste poco, perdiste poco y aprendiste cómo funciona.'; } },
        { txt:'Pasar: no entiendo el rubro', ef:(g,s)=>{ s.riesgo=clamp((s.riesgo||40)-14,0,100); return 'No entraste. Dos años después el negocio quebró. Bien ahí.'; } } ] },
    { id:'em_marca', txt:'Decidir qué hacés con tu apellido', icono:'bx-purchase-tag',
      titulo:'Tu nombre es una marca', texto:()=>'Te ofrecen licenciar tu apellido para una línea de ropa deportiva.',
      opts:[
        { txt:'Licenciarlo y cobrar', ef:(g,s,G)=>{ G.dinero=(G.dinero||0)+ri(150000,800000); s.patrimonio=clamp((s.patrimonio||50)+16,0,100); return 'Tu apellido está en camisetas de medio continente. Y en tu cuenta.'; } },
        { txt:'Armar mi propia marca, sin socios', ef:(g,s,G)=>{ const b=Math.random()<0.45; s.riesgo=clamp((s.riesgo||40)+20,0,100); s.patrimonio=clamp((s.patrimonio||50)+(b?28:-18),0,100); return b?'Tu marca se vende sola. Es tuya, entera.':'Sin estructura no se puede. Cerraste con deudas.'; } } ] },
    { id:'em_club', txt:'Meterte en el fútbol como inversor', icono:'bx-football', req:(g,s)=>(s.patrimonio||50)>=60,
      titulo:'Comprar un club', texto:()=>'Un club chico está en venta. Podrías ser dueño.',
      opts:[
        { txt:'Comprarlo y hacerlo crecer', ef:(g,s,G)=>{ G.dinero=Math.max(0,(G.dinero||0)-ri(200000,900000)); G._vidaFlags=G._vidaFlags||{}; G._vidaFlags.duenoClub=true; s.riesgo=clamp((s.riesgo||40)+18,0,100); return 'Sos dueño de un club. La ilusión de todos los que jugaron alguna vez.'; } },
        { txt:'El fútbol es un pozo sin fondo, paso', ef:(g,s)=>{ s.patrimonio=clamp((s.patrimonio||50)+10,0,100); return 'Te lo dijeron mil veces y por una vez hiciste caso.'; } } ] }
  ],
  disfrutar: [
    { id:'ds_tiempo', txt:'Decidir en qué se te va el tiempo', icono:'bx-glasses',
      titulo:'Un día cualquiera', texto:()=>'Nadie te espera en ningún lado. Por primera vez en la vida.',
      opts:[
        { txt:'Meterme en el club del barrio', ef:(g,s)=>{ s.felicidad=clamp((s.felicidad||50)+16,0,100); s.soledad=clamp((s.soledad||40)-22,0,100); return 'Los sábados sos el que abre la cancha. Te hace bien.'; } },
        { txt:'Viajar a los lugares que nunca viste', ef:(g,s,G)=>{ G.dinero=Math.max(0,(G.dinero||0)-ri(10000,80000)); s.felicidad=clamp((s.felicidad||50)+20,0,100); return 'Conociste el mundo sin un partido en el medio. Otra cosa.'; } },
        { txt:'Quedarme quieto, ya corrí bastante', ef:(g,s)=>{ s.salud=clamp((s.salud||70)+10,0,100); s.soledad=clamp((s.soledad||40)+14,0,100); return 'Descansaste como nunca. Y te aburriste como nunca.'; } } ] },
    { id:'ds_familia', txt:'Ocuparte de los tuyos', icono:'bx-home-heart',
      titulo:'Los que te bancaron', texto:()=>'Toda la vida se ocuparon ellos de vos. Ahora hay tiempo.',
      opts:[
        { txt:'Estar todos los días con los chicos', ef:(g,s)=>{ s.familia=clamp((s.familia||50)+22,0,100); s.felicidad=clamp((s.felicidad||50)+14,0,100); return 'Los llevás a la escuela, los buscás, los ves crecer. Nada de eso se compra.'; } },
        { txt:'Juntar a toda la familia una vez por mes', ef:(g,s)=>{ s.familia=clamp((s.familia||50)+16,0,100); s.soledad=clamp((s.soledad||40)-18,0,100); return 'Treinta personas en tu casa cada mes. Un quilombo hermoso.'; } } ] },
    { id:'ds_libro', txt:'Contar tu historia', icono:'bx-book', req:(g,s,G)=>(G.vidaLapso||0)>=2,
      titulo:'Quieren tu historia', texto:()=>'Un periodista quiere escribir tu biografía. O la escribís vos.',
      opts:[
        { txt:'Contarlo todo, sin filtro', ef:(g,s,G)=>{ G.dinero=(G.dinero||0)+ri(30000,200000); G._vidaFlags=G._vidaFlags||{}; G._vidaFlags.biografia=true; s.felicidad=clamp((s.felicidad||50)+10,0,100); return 'Vendió muchísimo. Y varios dejaron de hablarte.'; } },
        { txt:'Guardarme lo mío', ef:(g,s)=>{ s.felicidad=clamp((s.felicidad||50)+8,0,100); return 'Algunas cosas se las lleva uno. Está bien que así sea.'; } } ] }
  ]
};
// El asunto de ESTE tramo, sin repetir los que ya resolviste.
function agendaDeRol(){
  if(!G || !G.vidaRol) return null;
  const g = gestionAsegurar(), s = G.vidaStats || {};
  const pool = GESTION_AGENDA[G.vidaRol] || GESTION_AGENDA.disfrutar;
  const hechas = G._agendaHecha = G._agendaHecha || [];
  let libres = pool.filter(a => hechas.indexOf(a.id) < 0 && (!a.req || a.req(g, s, G)));
  // Si ya resolviste toda la agenda, se recicla (pero nunca repitiendo la última).
  if (!libres.length){
    G._agendaHecha = [G._agendaUltima].filter(Boolean);
    libres = pool.filter(a => a.id !== G._agendaUltima && (!a.req || a.req(g, s, G)));
  }
  if (!libres.length) libres = pool.slice();
  // Determinista por tramo: dentro del mismo tramo siempre te pide lo mismo.
  const semilla = (G.vidaLapso||0) * 7 + String(G.vidaRol||'').length;
  return libres[semilla % libres.length] || null;
}

// Lo que tenés que resolver ESTE tramo según tu rol.
function asuntoDeRol(){
  const rol = G.vidaRol, g = gestionAsegurar();
  if(!g) return null;
  const s = G.vidaStats || {};
  // Sin trabajo o al borde del despido: eso manda por encima de todo.
  if ((rol === 'dt' || rol === 'escuela' || rol === 'dirigente') && g.sinTrabajo)
    return { id:'club', txt: rol==='dt' ? 'Conseguir club para dirigir' : 'Conseguir un lugar donde trabajar', icono:'bx-briefcase' };
  if ((rol === 'dt' || rol === 'dirigente') && ((s.presion||0) >= 72 || (s.resultados||50) <= 22))
    return { id:'crisis', txt:'Salvar tu puesto: te quieren echar', icono:'bx-error' };
  // Si no, el asunto propio del tramo, sacado de la agenda del oficio: cada tramo
  // uno distinto, con su propia pantalla y sus propias consecuencias.
  if ((G._vjHechos||{}).fichaje) return null;
  const a = agendaDeRol();
  return a ? { id:'agenda', agenda:a.id, txt:a.txt, icono:a.icono } : null;
}
// ── LOS ASUNTOS DE CADA TRAMO ────────────────────────────────────────────────
// Para que pasen cinco años hay que ocuparse de lo importante. Uno es obligatorio
// (la decisión de tu rol); los otros son opcionales pero se anotan, y el resumen
// final cuenta cuántos tramos viviste a fondo.
function vjPendientesTramo(){
  if(!G) return [];
  const h = G._vjHechos || {};
  const s = G.vidaStats || {};
  const rol = VIDA_ROLES[G.vidaRol] || VIDA_ROLES.disfrutar;
  const lista = [
    { id:'lapso', obliga:true, hecho: !!h.lapso || (G.vidaPausa > 0),
      txt: (G.vidaPausa > 0) ? 'Estás de licencia' : ('Decidir lo de ' + rol.n.toLowerCase()) },
    { id:'sucesos', obliga:false, hecho: (h.sucesos || 0) >= 1, txt:'Ocuparte de algo tuyo (familia, plata, salud)' },
    { id:'descanso', obliga:false, hecho: !!h.descanso, txt:'Descansar un poco' }
  ];
  const ar = asuntoDeRol();
  if (ar) lista.splice(1, 0, { id:'gestion', obliga:true, hecho:false, txt:ar.txt });
  if ((s.salud || 100) < 55) lista.push({ id:'salud', obliga:false, hecho: !!h.cuidoSalud, txt:'Cuidarte: la salud viene mal' });
  if ((s.soledad || 0) > 60) lista.push({ id:'gente', obliga:false, hecho: (h.sucesos || 0) >= 2, txt:'Ver gente: estás muy solo' });
  return lista;
}
// La opcion de pasar el tiempo, con la edad de ahora, la que viene y cuanto
// resolviste del tramo.
function vjDormirHotspot(x){
  const pend = vjPendientesTramo();
  const listo = pend.filter(p=>p.obliga).every(p=>p.hecho);
  const hechos = pend.filter(p=>p.hecho).length;
  const falta = pend.find(p=>p.obliga && !p.hecho);
  const hoy = G.vidaEdad || 36;
  const prox = (VIDA_LAPSOS[(G.vidaLapso||0) + 1] || {}).de;
  // Una cama en el piso de TV o en la vereda no existe: fuera de casa la opcion
  // es un cartel que te manda a casa a dormir.
  const enCasa = VJ.escena === 'casa';
  return { x:x || 400, tipo:'obj', obj: enCasa ? 'cama' : 'cartel', icono: enCasa ? 'bx-moon' : 'bx-home',
    accion: enCasa ? 'dormir' : 'irACasa', destacado:listo, bloqueado:!listo,
    lbl: !enCasa ? (listo ? 'IR A CASA A DORMIR Y PASAR 5 AÑOS' : ('Antes de dormir: ' + (falta ? falta.txt.toLowerCase() : 'resolvé lo del tramo')))
      : listo
      ? ('DORMIR Y PASAR 5 AÑOS' + (prox ? ' (' + hoy + ' → ' + prox + ')' : ' — el último tramo') +
         '  ·  ' + hechos + '/' + pend.length + ' resuelto' + (hechos===1?'':'s'))
      : ('Antes de dormir: ' + (falta ? falta.txt.toLowerCase() : 'resolvé lo del tramo')) };
}
// ¿Esta accion puede hacer algo AHORA? Si no, no se muestra.
function vjPuede(h){
  if(!h) return false;
  switch(h.accion){
    case 'suceso': {
      if(!G) return false;
      const enCarrera = VJ.mundo !== 'vida';
      if (enCarrera){
        const temp = G.temporada || 1;
        const hechos = (G._sucTemp === temp) ? (G._sucHechos || 0) : 0;
        if (hechos >= 2) return false;
      } else if (((G._vjHechos||{}).sucesos || 0) >= 2) return false;
      return !!vjSucesoDisponible(h.cat);
    }
    case 'entrenarClub':
    case 'entrenarJuv':   return (G && (G._entrenos || 0) < 3);
    case 'patear':        return (_draft && (_draft._pateos || 0) < 3);
    case 'rol':           return !!(G && vidaEventoDe(G.vidaRol, G.vidaLapso, G._vidaSeen || []));
    case 'tablas':        return !!(G && G._tablasData);
    case 'licencia':      return !(G && G.vidaPausa > 0);
    case 'ropero':        return true;
    case 'consejo':       return true;
    case 'gestion':       return !!asuntoDeRol();
    case 'cambiarRepre':  return true;
    default:              return true;
  }
}
function vjHotspots(){
  let lista = vjHotspotsBase().filter(h => h.bloqueado || vjPuede(h));
  const pr = vjPrincipal();
  // En la segunda vida el tiempo se mueve durmiendo: esa opcion no puede faltar
  // nunca de la lista, y siempre con el MISMO texto claro (antes la cama de la
  // casa decia "Todavia no hiciste nada este tramo", que no explicaba nada).
  if (VJ.mundo === 'vida' && G && G.vidaRol){
    lista = lista.map(h => h.accion === 'dormir' ? vjDormirHotspot(h.x) : h);
    if (!lista.some(h => h.accion === 'dormir') && !(pr && pr.accion === 'dormir'))
      lista.push(vjDormirHotspot(Math.round(vjEscena().ancho * 0.72)));
  }
  if (pr){
    // Se quita el duplicado y la accion que avanza queda SIEMPRE primera. Antes,
    // si el escenario ya la tenia mas abajo, arriba quedaba algo que no avanzaba
    // (la tele, por ejemplo) y se podia clickear para siempre sin pasar el tiempo.
    const otras = lista.filter(h => h.accion !== pr.accion);
    lista = [pr].concat(otras);
  }
  return lista;
}
function vjHotspotsBase(){
  if (VJ.mundo === 'potrero')   return vjHotspotsPotrero();
  if (VJ.mundo === 'juveniles') return vjHotspotsJuveniles();
  if (VJ.mundo === 'club')      return vjHotspotsClub();
  const E = vjEscena();
  const W = E.ancho, out = [];
  const hechos = G._vjHechos = G._vjHechos || {};
  const fam = G.familia = G.familia || {};
  if (VJ.escena === 'casa'){
    if (fam.pareja) out.push({ x:250, tipo:'npc', _pareja:true, semilla:'pareja'+fam.pareja, ropa:'calle', edad:(G.vidaEdad||40)-2,
      gen: fam.parejaGen || parejaGen(),
      lbl:'Hablar con ' + esc(fam.pareja), accion:'suceso', cat:'familia', icono:'bx-heart', nombre:esc(fam.pareja), rol:'tu pareja' });
    // EL ABUELO. Si estás jugando el legado y el viejo llegó vivo, está en la casa:
    // se lo ve, se le habla y te cuenta lo suyo. Antes el ancestro era solo un
    // número a superar en un cartel.
    const _L = G.legado;
    if (_L && _L.vivo && (_L.parentesco === 'abuelo' || _L.parentesco === 'padre'))
      out.push({ x:262, tipo:'npc', semilla:'ancestro'+(_L.padre||''), ropa:'jubilado',
        edad: _L.edadAncestro || 74, gen:'m', av: _L.avAncestro,
        lbl:'Hablar con tu ' + esc(_L.parentesco), accion:'abuelo', icono:'bx-conversation',
        nombre: esc(_L.padre || 'tu ' + _L.parentesco), rol:'tu ' + _L.parentesco });
    // `av` viaja con el hotspot: así el hijo se dibuja con los rasgos que heredó
    // de sus padres y no con una cara sorteada por el hash de su nombre.
    (fam.hijos||[]).slice(0,2).forEach((h,i)=> out.push({ x:318+i*62, tipo:'npc', semilla:'hijo'+h.nombre, ropa:'calle',
      edad: (h.edad != null ? h.edad : ((G.vidaEdad||40) - 30 + i*3)), gen: genDe(h), av: h.av,
      lbl:'Estar con ' + esc(h.nombre), accion:'suceso', cat:'familia', icono:'bx-child', nombre:esc(h.nombre),
      rol:'tu ' + palabraHijo(genDe(h)) }));
    (fam.nietos||[]).slice(0,2).forEach((n,i)=> out.push({ x:452+i*60, tipo:'npc', semilla:'nieto'+n.nombre, ropa:'calle',
      edad: (n.edad != null ? n.edad : 3), gen: genDe(n), av: n.av,
      lbl: (n.edad||0) <= 2 ? ('Alzar a ' + esc(n.nombre)) : ('Jugar con ' + esc(n.nombre)),
      accion:'suceso', cat:'familia', icono:'bx-child',
      nombre:esc(n.nombre), rol:'tu ' + palabraNieto(genDe(n)) }));
    out.push({ x:452, tipo:'obj', obj:'tele', lbl:'Ver fútbol', accion:'descansar', icono:'bx-tv' });
    // La mesa del truco: partida completa contra la máquina, con envido y todo.
    out.push({ x:392, tipo:'obj', obj:'trabajo', escala:1.1, lbl:'La mesa — jugar al truco', accion:'truco', icono:'bx-joystick' });
    // Si licenciaste tu imagen, el videojuego existe de verdad y se puede jugar.
    if ((G._vidaFlags||{}).videojuego)
      out.push({ x:352, tipo:'obj', obj:'tele', escala:0.9, lbl:'Tu videojuego — jugarlo', accion:'videojuego', icono:'bx-game' });
    out.push({ x:512, tipo:'obj', obj:'ropero', escala:1.5, lbl:'Ropero — cambiarte', accion:'ropero', icono:'bx-closet' });
    out.push({ x:568, tipo:'obj', obj:'espejo', escala:1.4, lbl:'Espejo — cambiar tu look', accion:'look', icono:'bx-cut' });
    // La cama va lejos del borde: pegada a la salida uno se pasaba de largo al
    // barrio antes de poder tocarla. Y va SOLO en casa: una cama en el piso de TV
    // o en la vereda no tiene ningun sentido.
    out.push({ x:626, tipo:'obj', obj:'cama', lbl: hechos.lapso ? 'Dormir y pasar 5 años' : 'Todavía no hiciste nada este tramo',
      accion:'dormir', icono:'bx-moon', bloqueado: !hechos.lapso });
  } else if (VJ.escena === 'barrio'){
    out.push({ x:330, tipo:'npc', semilla:'amigo'+(G.apellido||'x'), ropa:'calle', edad:(G.vidaEdad||40),
      lbl:'Un amigo de siempre', accion:'suceso', cat:'social', icono:'bx-conversation', rol:'amigo' });
    out.push({ x:610, tipo:'obj', obj:'kiosco', lbl:'El kiosco', accion:'suceso', cat:'dinero', icono:'bx-store' });
    out.push({ x:830, tipo:'npc', semilla:'medico', ropa:'medico', edad:52, lbl:'El médico del barrio', accion:'suceso', cat:'salud', icono:'bx-plus-medical', rol:'médico' });
  } else if (VJ.escena === 'extra'){
    const rol = G.vidaRol || 'disfrutar';
    const L = ROL_LUGAR[rol] || ROL_LUGAR.disfrutar;
    const gente = {
      dt:          ['Un juvenil que promete', 'juvenil'],
      escuela:     ['Un pibe de la escuelita', 'alumno'],
      comentarista:['Tu compañero de panel', 'panelista'],
      dirigente:   ['Un socio histórico', 'socio'],
      empresario:  ['Tu encargado', 'encargado'],
      disfrutar:   ['Un vecino de la plaza', 'vecino']
    }[rol] || ['Alguien conocido','conocido'];
    out.push({ x:Math.round(W*0.34), tipo:'npc', semilla:'extra'+rol, ropa: rol==='dt'?'dt':(rol==='escuela'?'escuela':'calle'),
      edad: (rol==='dt'||rol==='escuela') ? 19 : 45, lbl:'Hablar con ' + gente[0].toLowerCase(),
      accion:'suceso', cat:'social', icono:'bx-conversation', rol:gente[1] });
    out.push({ x:Math.round(W*0.66), tipo:'obj', obj:(rol==='dt'||rol==='escuela')?'pelota':'trabajo', escala:1.6,
      lbl:'Meterle horas acá', accion:'trabajar', icono:L.icon });
    out.push({ x:Math.round(W*0.86), tipo:'obj', obj:'descanso', lbl:'Tomarte un rato', accion:'descansar', icono:'bx-coffee' });
  } else {
    // TRABAJO: el que te viene a ofrecer algo está PARADO ahí, no es un texto.
    const R = VIDA_ROLES[G.vidaRol] || VIDA_ROLES.disfrutar;
    if (G.vidaPausa > 0){
      out.push({ x:Math.round(W*0.5), tipo:'obj', obj:'cartel', lbl:'Estás de licencia — no dirigís este tramo', accion:'nada', icono:'bx-pause-circle' });
    } else {
      out.push({ x:Math.round(W*0.42), tipo:'npc', semilla:'jefe'+G.vidaRol, ropa: G.vidaRol==='escuela'?'escuela':'traje',
        edad:58, lbl: vjNombreJefe(), accion:'rol', icono:R.icon });
      out.push({ x:Math.round(W*0.74), tipo:'obj', obj:'trabajo', lbl:'Ponerte a laburar', accion:'trabajar', icono:'bx-wrench' });
      // EL ESCRITORIO: plantel, mercado de pases, tabla y vitrina. Lo que faltaba
      // para que dirigir se sienta como dirigir y no como elegir opciones sueltas.
      if (G.vidaRol === 'dt')
        out.push({ x:Math.round(W*0.58), tipo:'obj', obj:'trabajo', lbl:'Tu escritorio — plantel, mercado y tabla', accion:'escritorio', icono:'bx-clipboard', destacado:true });
      if (G.vidaRol === 'dt' || G.vidaRol === 'dirigente' || G.vidaRol === 'escuela')
        out.push({ x:Math.round(W*0.16), tipo:'obj', obj:'descanso', lbl:'Pedir una licencia', accion:'licencia', icono:'bx-pause' });
    }
  }
  return out;
}
// ── HOTSPOTS DEL POTRERO (11-14 años) ────────────────────────────────────────
// Cada decisión de la infancia dejó de ser una tarjeta: los pibes del baldío
// están ahí, hay que ir hasta ellos. El ojeador aparece sólo cuando toca.
function vjHotspotsPotrero(){
  const d = _draft; if(!d) return [];
  const paso = d._potPaso || 0;
  const ev = (d._potSet || [])[paso];
  const out = [];
  if (VJ.escena === 'baldio'){
    const edadPibe = d._potEdad || 12;
    if (ev) out.push({ x:330, tipo:'npc', semilla:'pibes'+(d.pais||''), ropa:'calle', edad:edadPibe, gen:'m',
      lbl:esc(ev.t), accion:'potrero', icono:'bx-football', destacado:true });
    if (ev && ev.opts.some(o=>o.prueba)) out.push({ x:800, tipo:'npc', semilla:'ojeador', ropa:'tv', edad:50,
      lbl:'Hablar con el ojeador', accion:'potrero', icono:'bx-search-alt', rol:'ojeador' });
  } else {
    out.push({ x:250, tipo:'npc', semilla:'viejo'+(d.apellido||''), ropa:'calle', edad:44, gen:'m',
      lbl:'Charlar con tu viejo', accion:'charlaPotrero', icono:'bx-conversation', rol:'tu viejo' });
    out.push({ x:560, tipo:'obj', obj:'kiosco', escala:1.6, lbl:'Pasar por el kiosco', accion:'charlaPotrero', icono:'bx-store' });
  }
  return out;
}
// ── HOTSPOTS DE JUVENILES (15-17 años) ───────────────────────────────────────
function vjHotspotsJuveniles(){
  if(!G) return [];
  const paso = G._juvPaso || 0;
  const ev = (G._juvSet || [])[paso];
  const out = [];
  if (VJ.escena === 'pension'){
    out.push({ x:230, tipo:'npc', semilla:'companero'+G.club, ropa:'calle', edad:16, gen:'m',
      lbl:'Un compañero de cuarto', accion:'charlaJuv', icono:'bx-conversation', rol:'compañero' });
    // A los 16, lejos de casa, lo que pasa en tu familia también te pega.
    out.push({ x:440, tipo:'obj', obj:'kiosco', lbl:'Llamar a casa', accion:'suceso', cat:'familia', icono:'bx-phone' });
    out.push({ x:660, tipo:'obj', obj:'cama', lbl:'Descansar bien', accion:'descansarJuv', icono:'bx-moon' });
  } else {
    if (ev) out.push({ x:380, tipo:'npc', semilla:'dtjuv'+G.club, ropa:'dt', edad:52, gen:'m',
      lbl:'El técnico de juveniles', accion:'juvenil', icono:'bx-clipboard', rol:'DT juveniles' });
    out.push({ x:660, tipo:'obj', obj:'gimnasio', escala:1.7, lbl:'Quedarte entrenando aparte', accion:'entrenarJuv', icono:'bx-dumbbell' });
    out.push({ x:880, tipo:'npc', semilla:'veterano'+G.club, ropa:null, edad:34, gen:'m',
      lbl:'Un veterano de primera', accion:'charlaJuv', icono:'bx-medal', rol:'veterano' });
  }
  return out;
}
// ── HOTSPOTS DEL CLUB (la carrera profesional) ───────────────────────────────
function vjHotspotsClub(){
  if(!G) return [];
  const out = [];
  const pend = (G._evLeft || 0) > 0;
  if (VJ.escena === 'casa'){
    // TU VIDA PRIVADA, mientras seguís jugando. Acá están los tuyos, y acá pasan
    // los nacimientos, los casamientos, los robos y las malas noticias.
    const fam = G.familia = G.familia || {};
    if (!fam.pareja) out.push({ x:288, tipo:'obj', obj:'tele', escala:0.9, lbl:'Salir, ver gente, hacer vida',
      accion:'suceso', cat:'familia', icono:'bx-heart' });
    if (fam.pareja) out.push({ x:250, tipo:'npc', _pareja:true, semilla:'pareja'+fam.pareja, ropa:'calle', edad:Math.max(18,(G.edad||24)-1),
      gen: fam.parejaGen || parejaGen(),
      lbl:'Hablar con ' + esc(fam.pareja), accion:'suceso', cat:'familia', icono:'bx-heart', nombre:esc(fam.pareja), rol:'tu pareja' });
    // Los bebés NO caminan por el living: están en la cuna. Sólo los que ya andan
    // aparecen parados en la escena.
    (fam.hijos||[]).filter(h=>(h.edad||0) > 2).slice(0,3).forEach((h,i)=> out.push({ x:330+i*58, tipo:'npc', semilla:'hijo'+h.nombre, ropa:'calle',
      edad: (h.edad || 5), gen: genDe(h), lbl:'Estar con ' + esc(h.nombre), accion:'suceso', cat:'familia', icono:'bx-child',
      nombre:esc(h.nombre), rol:'tu ' + palabraHijo(genDe(h)) }));
    out.push({ x:452, tipo:'obj', obj:'tele', lbl:'Ver los goles de la fecha', accion:'descansarCasa', icono:'bx-tv' });
    out.push({ x:520, tipo:'obj', obj:'ropero', escala:1.5, lbl:'Ropero — cambiarte', accion:'ropero', icono:'bx-closet' });
    out.push({ x:588, tipo:'obj', obj:'espejo', escala:1.4, lbl:'Espejo — cambiar tu look', accion:'look', icono:'bx-cut' });
    // La cuna aparece cuando hay un bebé de verdad en la casa, con el bebé adentro.
    const _bebe = (fam.hijos||[]).find(h=>(h.edad||0) <= 2);
    if (_bebe)
      out.push({ x:186, tipo:'obj', obj:'cuna', escala:1.4, bebe:_bebe,
        lbl:'Alzar a ' + esc(_bebe.nombre), accion:'suceso', cat:'familia', icono:'bx-heart' });
    out.push({ x:392, tipo:'obj', obj:'kiosco', lbl:'Papeles, plata y quilombos', accion:'suceso', cat:'dinero', icono:'bx-wallet' });
    // EL VECINO VIVE AFUERA. Antes estaba parado en el medio del living, que no
    // tenía ningún sentido: ahora está del otro lado de la puerta, en la vereda.
    out.push({ x:Math.round(vjEscena().ancho*0.94), afuera:true, tipo:'npc', semilla:'vecino'+(G.apellido||''), ropa:'calle', edad:46,
      lbl:'La gente del barrio (en la vereda)', accion:'suceso', cat:'social', icono:'bx-conversation', rol:'vecino' });
    return out;
  }
  if (VJ.escena === 'vestuario'){
    out.push({ x:250, tipo:'npc', semilla:'dt'+G.club, ropa:'dt', edad:55, gen:'m',
      lbl: pend ? 'Hablar con el técnico' : 'Charlar con el técnico', accion: pend ? 'decision' : 'charlaClub',
      icono:'bx-clipboard', destacado: pend, rol:'DT' });
    out.push({ x:520, tipo:'npc', semilla:'capi'+G.club, ropa:null, edad:29, gen:'m',
      lbl:'Hablar con el capitán', accion:'charlaClub', icono:'bx-conversation', rol:'capitán' });
    out.push({ x:720, tipo:'obj', obj:'trabajo', lbl:'Tu casillero — ver tu ficha', accion:'ficha', icono:'bx-id-card' });
  } else if (VJ.escena === 'cancha'){
    out.push({ x:260, tipo:'obj', obj:'gimnasio', escala:1.7, lbl:'Levantar pesas en el gimnasio', accion:'entrenarClub', icono:'bx-dumbbell' });
    out.push({ x:560, tipo:'obj', obj:'pelota', escala:0.9, lbl: pend ? 'Primero hablá con el técnico' : 'JUGAR LA TEMPORADA',
      accion:'jugar', icono:'bx-play-circle', destacado: !pend, bloqueado: pend });
    out.push({ x:860, tipo:'npc', semilla:'hincha'+G.club, ropa:'calle', edad:38,
      lbl:'Hablar con un hincha', accion:'charlaClub', icono:'bx-group', rol:'hincha' });
    // TU RIVAL DE TODA LA VIDA, en carne y hueso. Existía desde el principio pero
    // sólo como una fila de números en una pantalla: nunca se lo veía ni se le
    // podía hablar. Ahora aparece antes de los partidos, con SU cara (la que tiene
    // guardada desde que se cruzaron en juveniles), y envejece con vos.
    if (G.rival && G.rival.nombre && (G.temporada||0) >= 2)
      out.push({ x:700, tipo:'npc', semilla:'rival'+G.rival.nombre, ropa:null,
        edad:(G.edad||24), gen:'m', av:G.rival.avatar,
        lbl:'Cruzarte con ' + esc(G.rival.nombre), accion:'rival', icono:'bx-target-lock',
        nombre:esc(G.rival.nombre), rol:'tu rival' });
  } else {
    const _rp = repreDeG();
    out.push({ x:230, tipo:'npc', semilla:'repre'+(_rp?_rp.id:'x'), ropa:(_rp&&_rp.id==='joven')?'tv':'traje', edad:(_rp?_rp.edad:47),
      gen: generoDe(String((_rp&&_rp.n)||'Anibal').replace(/^(Don|Do\u00f1a|Sr\.?|Sra\.?)\s+/i,'').split(/\s+/)[0]),
      lbl:'Ver qué te ofrece ' + (_rp?_rp.n:'tu representante'), accion:'mercado', icono:'bx-briefcase',
      nombre:(_rp?_rp.n:'Tu representante'), rol:'representante' });
    out.push({ x:400, tipo:'obj', obj:'cartel', lbl:'Pedir consejo', accion:'consejo', icono:'bx-message-rounded-dots' });
    out.push({ x:640, tipo:'obj', obj:'trabajo', lbl:'Cambiar de representante', accion:'cambiarRepre', icono:'bx-transfer' });
    out.push({ x:520, tipo:'obj', obj:'trabajo', lbl:'Tu contador — plata y bienes', accion:'bienes', icono:'bx-wallet' });
    out.push({ x:700, tipo:'obj', obj:'cartel', lbl:'Tabla y goleadores', accion:'tablas', icono:'bx-list-ol' });
  }
  return out;
}
function vjNombreJefe(){
  return { dt:'El presidente del club', comentarista:'El productor del canal', dirigente:'El vice del club',
    empresario:'Tu socio', escuela:'El profe de la escuelita', disfrutar:'Un viejo compañero' }[G.vidaRol] || 'Alguien';
}
// Dibujo de los objetos del mundo (sin imágenes, mismo pixel-art).
function vjObjSVG(tipo, escala, extra){
  const k = escala || 1.25;   // los objetos se veian diminutos al lado de la gente
  const R=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
  const wrap = (w,h,inner)=>`<svg width="${(w*k).toFixed(0)}" height="${(h*k).toFixed(0)}" viewBox="0 0 ${w} ${h}" style="display:block;shape-rendering:crispEdges;">${inner}</svg>`;
  switch(tipo){
    // Cama de verdad: respaldo alto, somier, sabana, acolchado con dobladillo,
    // dos almohadas y patas. La de antes eran cuatro cajas y parecia una repisa.
    case 'cama':   return wrap(88,50,
        R(2,6,12,44,'#4a3324')+R(2,6,12,3,'#6b4a34')
        +R(76,20,10,30,'#3d2a1e')
        +R(8,22,74,6,'#8a7f92')
        +R(8,16,74,7,'#efeaf5')
        +R(30,20,52,12,'#6d4f7a')+R(30,20,52,2,'#8a679c')
        +R(30,30,52,2,'#4e3459')
        +R(15,11,17,7,'#fbfaff')+R(15,11,17,2,'#ffffff')
        +R(33,12,15,6,'#e8e2f0')
        +R(8,28,74,3,'#2e2038')
        +R(9,31,5,15,'#241a2e')+R(76,31,5,15,'#241a2e')
        +R(8,46,74,2,'rgba(0,0,0,.35)'));
    case 'tele':   return wrap(60,46,
        R(6,0,48,34,'#0a0d12')+R(9,3,42,28,'#14361f')                       // marco y cancha
        +R(9,3,42,2,'#1e5c31')+R(9,16,42,1,'#cfe6d4')                        // linea del medio
        +R(29,10,1,14,'#cfe6d4')+R(9,10,4,14,'#cfe6d4')+R(47,10,4,14,'#cfe6d4') // arcos
        +R(18,12,3,4,'#e84a4a')+R(24,20,3,4,'#e84a4a')+R(36,14,3,4,'#f0f0f0') // jugadores
        +R(30,17,2,2,'#ffffff')                                              // pelota
        +R(9,27,16,4,'#0a0d12')+R(11,28,12,2,'#f5c542')                      // zocalo de resultado
        +R(26,34,8,8,'#2a2a2a')+R(14,42,32,4,'#3a3a3a'));
    case 'kiosco': return wrap(70,52, R(0,8,70,44,'#20303f')+R(0,0,70,10,'#2e4557')+R(8,20,24,20,'#f5a524')+R(38,20,24,20,'#4fc3f7')+R(0,48,70,4,'#16222d'));
    case 'trabajo':return wrap(64,50, R(0,26,64,24,'#2a2118')+R(0,22,64,5,'#443521')+R(8,4,30,20,'#0d1620')+R(11,7,24,14,'#2a6ba8')+R(44,10,14,14,'#d4af37'));
    case 'descanso':return wrap(46,52, R(6,10,34,42,'#2f3a2a')+R(10,14,26,10,'#4a5a40')+R(18,26,10,20,'#8fae74')+R(0,48,46,4,'#1b2117'));
    case 'cartel': return wrap(56,56, R(24,20,8,36,'#3a3a3a')+R(0,0,56,24,'#4a3a12')+R(4,4,48,16,'#f5c542'));
    case 'cuna': return wrap(46,34,
        R(2,10,42,24,'#8b6d4a')+R(0,6,46,5,'#a3855e')+R(6,14,34,16,'#efe6d4')
        // El bebé DENTRO de la cuna: cabecita, manta y ojitos cerrados. Antes la
        // cuna estaba vacía y al bebé no se lo veía nunca.
        +R(8,20,30,9, extra==='f' ? '#f3c3d8' : '#bcd8f2')
        +R(14,15,11,9,'#dda877')+R(16,18,2,1,'#16130f')+R(21,18,2,1,'#16130f')
        +R(14,15,11,2,'#4a2f1a')+R(18,21,3,1,'#a8635c')
        +R(2,30,4,4,'#6b5238')+R(40,30,4,4,'#6b5238'));
    case 'espejo': return wrap(30,58,
        R(0,0,30,58,'#4a3626')+R(3,3,24,52,'#0e141a')+R(5,5,20,48,'#28394a')
        +R(7,8,6,40,'rgba(255,255,255,.18)')+R(16,14,4,28,'rgba(255,255,255,.10)')
        +R(0,54,30,4,'#3a2a1c'));
    case 'ropero': return wrap(40,54,
        R(0,0,40,54,'#3a2a1c')+R(2,2,17,50,'#4a3626')+R(21,2,17,50,'#4a3626')
        +R(17,24,3,6,'#c9a227')+R(20,24,3,6,'#c9a227')
        +R(5,6,11,16,'#8a4a4a')+R(24,6,11,16,'#3a5a7a')+R(5,26,11,14,'#5a5a5a'));
    case 'gimnasio': return wrap(58,40,
        R(4,30,50,6,'#2b3038')+R(10,20,10,10,'#3a424e')+R(38,20,10,10,'#3a424e')   // banco
        +R(2,8,54,4,'#9aa4b0')+R(0,2,10,16,'#20252c')+R(48,2,10,16,'#20252c')      // barra con discos
        +R(2,0,6,4,'#2b3038')+R(50,0,6,4,'#2b3038'));
    case 'pelota': return wrap(26,26, R(3,3,20,20,'#e8e8dc')+R(0,8,26,10,'#e8e8dc')+R(8,0,10,26,'#e8e8dc')
                     +R(9,9,8,8,'#1a1a14')+R(4,4,5,5,'#1a1a14')+R(17,17,5,5,'#1a1a14')+R(3,3,20,2,'#fbfbf2'));
    default:       return wrap(30,30, R(0,0,30,30,'#555'));
  }
}
// ── MONTAJE DEL MUNDO ────────────────────────────────────────────────────────
window._vidaJugable = function(){
  if(!G){ G = load(); if(!G) { window._carreraStart(); return; } }
  if(!G.vidaRol){ retiro(); return; }
  VJ.mundo = 'vida';
  if (!VJ_MUNDOS.vida[VJ.escena]) VJ.escena = 'casa';
  mundoRender();
};
// Abre cualquier mundo caminable (potrero, juveniles, club, vida).
function mundoAbrir(mundo, escena){
  lyChrome(true);
  VJ.mundo = mundo;
  VJ.escena = escena || Object.keys(VJ_MUNDOS[mundo])[0];
  VJ.x = Math.round((VJ_MUNDOS[mundo][VJ.escena].ancho) * 0.22);
  VJ.destino = null; VJ.keys = {}; VJ.hot = null; VJ.meta = null; VJ.ultInput = 0; VJ.proxDecision = 0;
  mundoRender();
}
// Fondo del escenario activo.
function vjFondo(W,H){
  switch(VJ.escena){
    case 'casa':      return vjFondoCasa(W,H);
    case 'barrio':    return vjFondoBarrio(W,H);
    case 'trabajo':   return vidaEscena(G.vidaRol, W, H);
    case 'baldio':    return vjFondoBaldio(W,H);
    case 'esquina':   return vjFondoEsquina(W,H);
    case 'pension':   return vjFondoPension(W,H);
    case 'predio':    return vjFondoPredio(W,H);
    case 'vestuario': return vidaEscena('dt', W, H);
    case 'cancha':    return vjFondoCancha(W,H);
    case 'oficina':   return vjFondoOficina(W,H);
    case 'extra':     return vjFondoLugarRol(W,H);
    default:          return vjFondoCasa(W,H);
  }
}
function vjPisoPct(){
  return { barrio:0.80, casa:0.78, trabajo:0.76, baldio:0.76, esquina:0.80,
           pension:0.78, predio:0.72, vestuario:0.76, cancha:0.62, oficina:0.78, extra:0.74 }[VJ.escena] || 0.76;
}
// Barra superior: cambia segun la etapa que estes caminando.
function vjHud(){
  if (VJ.mundo === 'vida'){
    const R = VIDA_ROLES[G.vidaRol] || VIDA_ROLES.disfrutar;
    const _sel = !!(G.gestion && G.gestion.esSeleccion);
    const L = VIDA_LAPSOS[G.vidaLapso] || VIDA_LAPSOS[VIDA_LAPSOS.length-1];
    const s = G.vidaStats || {};
    return { titulo:`${(G.gestion&&G.gestion.esSeleccion)?flagImg(G.pais,15)+' ':''}${esc(G.apellido||'')} · ${G.vidaEdad} años`,
      sub:`${G.anio||''} · ${esc(R.n)}${(G.gestion&&G.gestion.club&&!G.gestion.sinTrabajo)?(' · '+esc(G.gestion.club)):(G.gestion&&G.gestion.sinTrabajo?' · SIN CLUB':'')}${G.vidaPausa>0?' · DE LICENCIA':''}`, color:R.color,
      datos:R.barras.map(b=>[b[0], Math.round(s[b[1]]||0), b[2]]) };
  }
  if (VJ.mundo === 'potrero'){
    const d = _draft || {};
    return { titulo:`${esc(d.apellido||'Pibe')} · ${vjEdad()} años`,
      sub:`EL POTRERO · ${(d._potPaso||0)+1} de ${((d._potSet||[]).length)||3}`,
      color:A, datos:[['PAÍS', esc((d.pais||'').slice(0,3).toUpperCase()), '#fff'], ['PUESTO', esc(d.pos||'DC'), A]] };
  }
  if (VJ.mundo === 'juveniles'){
    return { titulo:`${esc(G.apellido||'')} · ${G.edad} años`, sub:`JUVENILES DE ${esc(G.club).toUpperCase()}`,
      color:'#4fc3f7', datos:[['NIVEL', Math.round(G.nivel), '#4fc3f7'], ['MORAL', Math.round(G.moral), '#22c55e']] };
  }
  // En casa se ven las barras de la VIDA; en el club, las del fútbol.
  const ps = (G && G.vidaStats) || {};
  if (VJ.escena === 'casa'){
    return { titulo:`${esc(G.apellido||'')} · ${G.edad} años`, sub:esc((CASAS[casaNivel()]||CASAS[0]).n.toUpperCase()), color:'#a78bfa',
      datos:[['FELICIDAD', Math.round(ps.felicidad||0), '#a78bfa'], ['FAMILIA', Math.round(ps.familia||0), '#f472b6'],
             ['SOLEDAD', Math.round(ps.soledad||0), '#94a3b8'], ['SALUD', Math.round(ps.salud||0), '#22c55e']] };
  }
  return { titulo:`${esc(G.apellido||'')} · ${G.edad} años`, sub:`${G.anio||''} · ${esc(G.club)} · TEMPORADA ${G.temporada||1}`,
    color:A, datos:[['NIVEL', Math.round(G.nivel), A], ['MORAL', Math.round(G.moral), '#22c55e'],
      ['FAMA', Math.round(G.fama), '#facc15'], ['DINERO', eur(G.dinero||0), '#4ade80']] };
}
// ¿Hay algo esperándote en otro escenario? Se marca el cartel de la salida para
// que la vida privada no quede escondida detrás de una puerta que nadie cruza.
function _avisoEn(escena){
  if (escena !== 'casa' || VJ.mundo !== 'club' || !G) return false;
  const temp = G.temporada || 1;
  const hechos = (G._sucTemp === temp) ? (G._sucHechos || 0) : 0;
  if (hechos >= 2) return false;
  const guardado = VJ.mundo;                    // vjSucesoDisponible mira VJ.mundo
  const hay = !!vjSucesoDisponible();
  VJ.mundo = guardado;
  return hay;
}
// ── MUDANZAS ─────────────────────────────────────────────────────────────────
// Cuando el patrimonio te cambia de casa (para arriba o para abajo), se avisa la
// primera vez que entrás. No es sólo decorado: es la historia de cómo te fue.
function vjChequearMudanza(){
  if(!G || VJ.escena !== 'casa') return;
  const nv = casaNivel();
  if (G._casaNivel == null){ G._casaNivel = nv; save(); return; }
  if (nv === G._casaNivel) return;
  const subio = nv > G._casaNivel;
  G._casaNivel = nv; save();
  const nombre = (CASAS[nv] || CASAS[0]).n;
  setTimeout(()=> vjFlash(subio
    ? 'TE MUDASTE: ' + nombre + '. Lo que ganás en la cancha se ve acá adentro.'
    : 'TUVISTE QUE MUDARTE: ' + nombre + '. La plata no alcanzó para sostener lo de antes.'), 450);
}
// Atmosfera: se dibuja ENCIMA del fondo y DEBAJO de los personajes.
function vjAtmosfera(W, H, pisoPct){
  const pisoY = Math.round(H * pisoPct);
  return `<defs>
      <linearGradient id="atmNiebla" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8fa6c0" stop-opacity=".00"/>
        <stop offset="72%" stop-color="#8fa6c0" stop-opacity=".13"/>
        <stop offset="100%" stop-color="#8fa6c0" stop-opacity=".22"/>
      </linearGradient>
      <radialGradient id="atmLuz" cx="50%" cy="0%" r="88%">
        <stop offset="0%" stop-color="#ffe9b0" stop-opacity=".16"/>
        <stop offset="100%" stop-color="#ffe9b0" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="atmPiso" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000" stop-opacity=".38"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0"/>
      </linearGradient>
      <radialGradient id="atmVineta" cx="50%" cy="52%" r="72%">
        <stop offset="55%" stop-color="#000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000" stop-opacity=".55"/>
      </radialGradient>
    </defs>
    <rect x="0" y="${Math.round(pisoY*0.45)}" width="${W}" height="${pisoY - Math.round(pisoY*0.45)}" fill="url(#atmNiebla)"/>
    <rect width="${W}" height="${pisoY}" fill="url(#atmLuz)"/>
    <rect x="0" y="${pisoY}" width="${W}" height="${Math.round((H-pisoY)*0.7)}" fill="url(#atmPiso)"/>
    <rect width="${W}" height="${H}" fill="url(#atmVineta)"/>`;
}
// El auto no entra al living. Lo que es de afuera (autos, yate, avion) va del otro
// lado de la puerta, en el garage / la vereda; lo chico queda adentro.
const BIENES_AFUERA = ['auto','yate','avion'];
function vjPatioHTML(W, H, pisoPct){
  if(!G || !(G.bienes||[]).length) return '';
  const base = Math.round(H*(1-pisoPct));
  const tiene = id => (G.bienes||[]).some(b=>b.id===id);
  const afuera = BIENES_AFUERA.filter(tiene);
  const adentro = ['reloj'].filter(tiene);   // lo unico que puede estar adentro
  let o = '';
  if (adentro.length)
    o += `<div style="position:absolute;left:${Math.round(W*0.62)}px;bottom:${base-4}px;transform:translateX(-50%);line-height:0;display:flex;align-items:flex-end;gap:9px;">${adentro.map(id=>_propSVG(id,2.2)).join('')}</div>`;
  if (afuera.length){
    // La pared, la puerta, la vereda y la calle ya las dibuja el FONDO de la casa
    // (vjFondoCasa): aca solo se apoyan las cosas sobre la vereda, del otro lado.
    o += `<div style="position:absolute;left:${Math.round(W*0.93)}px;bottom:${base-2}px;transform:translateX(-50%);line-height:0;display:flex;align-items:flex-end;gap:12px;">${afuera.map(id=>_propSVG(id, id==='auto' ? 1.5 : 2.4)).join('')}</div>`;
    o += `<div style="position:absolute;left:${Math.round(W*0.93)}px;bottom:${base+Math.round(H*pisoPct*0.62)}px;transform:translateX(-50%);white-space:nowrap;font-size:8px;font-weight:900;color:#8fa0b4;letter-spacing:1px;">LA CALLE</div>`;
  }
  return o;
}
// Pinta el mundo entero (fondo, gente, objetos, jugador, controles).
// ── NADIE SE PARA ENCIMA DE NADIE ────────────────────────────────────────────
// Dos hotspots con la misma x se dibujaban uno sobre el otro y no se entendia
// nada; y al entrar a un escenario el jugador aparecia clavado dentro de otro
// personaje. Se separan en el eje X respetando un minimo y, despues, se busca
// para el jugador el hueco mas cercano que este libre.
function vjSepararHotspots(lista, ancho){
  const MIN = 78;
  // En la casa el mundo util termina donde empieza la pared que da a la calle:
  // un ropero, un espejo o una cama NO pueden terminar empujados a la vereda.
  const tope = (VJ.escena === 'casa') ? Math.round(ancho*0.72) : (ancho - 50);
  const dentro = lista.filter(h => !h.afuera);
  const orden = dentro.slice().sort((a,b)=>a.x-b.x);
  for (let i=1;i<orden.length;i++){
    if (orden[i].x - orden[i-1].x < MIN) orden[i].x = orden[i-1].x + MIN;
  }
  // Si al empujar se pasaron del borde, se corre todo el grupo hacia la izquierda.
  const exceso = orden.length ? (orden[orden.length-1].x - tope) : 0;
  if (exceso > 0){
    // No entran con la separacion ideal: se reparten parejo por TODO el ancho util
    // (antes se amontonaban contra la pared de la izquierda y sobraba media casa).
    const paso = Math.max(46, (tope - 50) / Math.max(1, orden.length - 1));
    orden.forEach((h,i) => { h.x = Math.round(clamp(50 + i*paso, 50, tope)); });
  }
  return lista;
}
function vjLugarLibre(x, ancho, ocupados){
  const MIN = 62;
  const choca = v => ocupados.some(o => Math.abs(o - v) < MIN);
  if (!choca(x)) return clamp(x, 40, ancho - 40);
  for (let d = MIN; d < ancho; d += 24){
    if (x - d > 40 && !choca(x - d)) return x - d;
    if (x + d < ancho - 40 && !choca(x + d)) return x + d;
  }
  return clamp(x, 40, ancho - 40);
}
function mundoRender(){
  vjDetener();
  VJ.activo = true;
  VJ.hotspots = vjHotspots();
  const E = vjEscena();
  const escenas = vjEscenas();
  vjSepararHotspots(VJ.hotspots, E.ancho);
  VJ.x = clamp(VJ.x, 60, E.ancho - 60);
  const topeX = (VJ.escena === 'casa') ? Math.round(E.ancho*0.74) : (E.ancho - 40);
  VJ.x = clamp(VJ.x, 40, topeX);
  VJ.x = vjLugarLibre(VJ.x, topeX + 40, VJ.hotspots.filter(h=>!h.afuera).map(h=>h.x));
  const H = 250, W = E.ancho;
  const fondo = vjFondo(W,H);
  const pisoPct = vjPisoPct();
  const hud = vjHud();
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="height:100%;max-height:100%;overflow:hidden;background:#05070a;display:flex;flex-direction:column;">
    <div style="position:sticky;top:0;z-index:6;background:linear-gradient(180deg,rgba(5,7,10,.97),rgba(5,7,10,.86));backdrop-filter:blur(8px);border-bottom:1px solid #1a2230;padding:8px 12px;">
      <div style="max-width:720px;margin:0 auto;display:flex;align-items:center;gap:10px;padding-right:118px;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${hud.titulo}</div>
          <div style="font-size:10px;color:${hud.color};font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${hud.sub}</div>
          ${legadoChipHTML()}
        </div>
        <div style="display:flex;gap:5px;">
          ${hud.datos.map(d=>`<div style="text-align:center;min-width:44px;background:rgba(255,255,255,.04);border:1px solid #1e2632;border-radius:8px;padding:4px 5px;">
            <div style="font-size:13px;font-weight:900;color:${d[2]};line-height:1;">${d[1]}</div>
            <div style="font-size:7px;color:#6b7688;font-weight:800;margin-top:2px;">${d[0]}</div></div>`).join('')}
        </div>
      </div>
    </div>
    <div id="vj-view" style="position:relative;flex:0 0 auto;height:min(250px, 46dvh);overflow:hidden;background:#05070a;">
      <!-- vj-escala estira la escena para llenar el ancho: antes se dibujaba a
           tamano fijo pegada a la izquierda y quedaba media pantalla en negro. -->
      <div id="vj-escala" style="position:absolute;left:0;bottom:0;width:${W}px;height:${H}px;transform-origin:0 100%;">
      <div id="vj-world" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;will-change:transform;">
        <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0;shape-rendering:crispEdges;">${fondo}</svg>
        <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0;pointer-events:none;">${vjAtmosfera(W,H,pisoPct)}</svg>
        ${VJ.hotspots.map((h,i)=>`
          <div id="vj-hs-${i}" style="position:absolute;left:${h.x}px;bottom:${Math.round(H*(1-pisoPct)) - (h.tipo==='npc'?14:2)}px;transform:translateX(-50%);line-height:0;${h.bloqueado?'opacity:.45;':''}">
            ${h.tipo==='npc' ? vjSpriteHab(h,'idle') : vjObjSVG(h.obj, h.escala, h.bebe ? genDe(h.bebe) : null)}
            ${h.tipo==='npc' ? `<div style="position:absolute;left:50%;top:-26px;transform:translateX(-50%);white-space:nowrap;text-align:center;line-height:1.15;pointer-events:none;text-shadow:0 1px 3px rgba(0,0,0,.9);">
              <div style="font-size:9px;font-weight:900;color:#e8eef5;">${esc(h.nombre || vjNombreNPC(h.semilla, vjGen(h)))}</div>
              <div style="font-size:7.5px;font-weight:800;color:${h.destacado?A:'#8fa0b4'};letter-spacing:.4px;">${esc((h.rol||'').toUpperCase())}</div>
            </div>` : ''}
          </div>`).join('')}
        <div id="vj-player" style="position:absolute;left:0;bottom:${Math.round(H*(1-pisoPct))-15}px;line-height:0;will-change:transform;">${vjSpriteJugador('idle')}</div>
        <!-- Lo que compraste, apoyado en el piso de tu casa y a escala real. -->
        ${(VJ.escena === 'casa') ? vjPatioHTML(W, H, pisoPct) : ''}
        ${E.sale.izq?`<div style="position:absolute;left:6px;bottom:${Math.round(H*(1-pisoPct))}px;font-size:9px;font-weight:900;color:${_avisoEn(E.sale.izq)?'#0a0d08':'#7dd3fc'};background:${_avisoEn(E.sale.izq)?A:'rgba(5,7,10,.7)'};border:1px solid ${_avisoEn(E.sale.izq)?A:'#1e3a5c'};border-radius:8px;padding:3px 6px;">◀ ${esc(escenas[E.sale.izq].n)}${_avisoEn(E.sale.izq)?' •':''}</div>`:''}
        ${E.sale.der?`<div style="position:absolute;right:6px;bottom:${Math.round(H*(1-pisoPct))}px;font-size:9px;font-weight:900;color:#7dd3fc;background:rgba(5,7,10,.7);border:1px solid #1e3a5c;border-radius:8px;padding:3px 6px;">${esc(escenas[E.sale.der].n)} ▶</div>`:''}
      </div>
      </div>
      <div id="vj-prompt" style="position:absolute;left:50%;bottom:12px;transform:translateX(-50%);display:none;background:rgba(186,255,0,.14);border:1.5px solid ${A};color:${A};border-radius:22px;padding:7px 16px;font-size:12.5px;font-weight:900;pointer-events:none;white-space:nowrap;"></div>
    </div>
    <!-- LAS OPCIONES, COMO SIEMPRE. El personaje se mueve solo por la escena;
         vos elegis de esta lista. Nunca hace falta caminar hasta nada. -->
    <div style="flex:1 1 auto;min-height:0;background:linear-gradient(180deg,#080b0f,#05070a);border-top:1px solid #161d28;padding:14px 14px calc(20px + env(safe-area-inset-bottom));overflow-y:auto;-webkit-overflow-scrolling:touch;">
      <!-- En PC las acciones van en COLUMNAS: en una sola fila por accion, con
           pantalla ancha, sobraba lugar a los costados y faltaba abajo, y habia
           que usar la barra de scroll para ver las ultimas opciones. -->
      <div style="max-width:1100px;margin:0 auto;">
        <div style="font-size:10px;font-weight:900;letter-spacing:2px;color:#5d6879;margin-bottom:9px;">¿QUÉ HACÉS?</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:8px;align-items:start;">
          ${VJ.hotspots.map((h,i)=>`<div style="display:flex;gap:7px;">
            <button onclick="window._vjAccion(${i})" ${h.bloqueado?'disabled':''} style="flex:1;min-width:0;display:flex;align-items:center;gap:11px;background:${h.destacado?'rgba(186,255,0,.13)':'rgba(255,255,255,.04)'};border:1.5px solid ${h.destacado?A:'#242a20'};color:${h.bloqueado?'#5d6879':(h.destacado?A:'#e0e4dc')};border-radius:13px;padding:13px 14px;font-weight:800;font-size:13.5px;text-align:left;cursor:${h.bloqueado?'default':'pointer'};opacity:${h.bloqueado?.55:1};line-height:1.3;"><i class='bx ${h.icono}' style="font-size:20px;flex-shrink:0;"></i><span>${h.lbl}</span></button>
            ${vjCharlable(h) ? `<button onclick="window._vjHablar(${i})" title="Escribirle" style="flex:0 0 auto;background:rgba(125,211,252,.10);border:1.5px solid rgba(125,211,252,.35);color:#7dd3fc;border-radius:13px;padding:13px 12px;font-size:18px;cursor:pointer;line-height:1;"><i class='bx bx-message-rounded-dots'></i></button>` : ''}
          </div>`).join('')}
        </div>
        ${(VJ.mundo === 'vida' && G && G.vidaRol) ? (function(){ const pend = vjPendientesTramo(); return `
        <div style="margin-top:16px;background:rgba(255,255,255,.03);border:1px solid #1e2632;border-radius:13px;padding:12px 13px;">
          <div style="font-size:10px;font-weight:900;letter-spacing:2px;color:#5d6879;margin-bottom:8px;">ESTE TRAMO DE TU VIDA</div>
          ${pend.map(x=>`<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:${x.hecho?'#4ade80':'#9aa4b2'};margin-bottom:5px;">
            <i class='bx ${x.hecho?'bx-check-circle':'bx-circle'}' style="font-size:15px;flex-shrink:0;"></i>
            <span style="${x.hecho?'text-decoration:line-through;opacity:.7;':''}">${esc(x.txt)}${x.obliga?'':' <span style="font-size:9px;color:#5d6879;">(opcional)</span>'}</span>
          </div>`).join('')}
        </div>`; })() : ''}
        <div style="font-size:10px;font-weight:900;letter-spacing:2px;color:#5d6879;margin:16px 0 9px;">IR A OTRO LADO</div>
        <div style="display:flex;gap:9px;flex-wrap:wrap;">
          ${['izq','der'].filter(k=>E.sale[k]).map(k=>`<button onclick="window._vjIr('${E.sale[k]}')" style="flex:1;min-width:140px;background:rgba(125,211,252,.10);border:1.5px solid rgba(125,211,252,.4);color:#7dd3fc;border-radius:13px;padding:13px 14px;font-weight:900;font-size:13px;cursor:pointer;">${k==='izq'?'◀ ':''}${esc(escenas[E.sale[k]].n)}${k==='der'?' ▶':''}</button>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
  vjArrancarLoop();
  vjChequearMudanza();
  // La gente empieza a hablar sola al ratito de entrar, y sigue cada tanto.
  clearInterval(VJ.ambT);
  clearTimeout(VJ.ambT0);
  VJ.ambT0 = setTimeout(vjAmbienteTick, 3500);
  VJ.ambT = setInterval(vjAmbienteTick, 26000);
}

// Elegir una accion de la lista: el personaje se acerca solo y pasa lo que tenga
// que pasar. No hace falta caminar ni apuntarle a nada.
window._vjAccion = function(i){
  const h = (VJ.hotspots || [])[i]; if(!h) return;
  if (h.bloqueado || h.accion === 'nada'){ VJ.hot = h; vjInteractuar(); return; }
  // El personaje CAMINA hasta la persona o la cosa y recien ahi pasa algo. Antes
  // se disparaba desde donde estuviera parado, que no tenia sentido.
  // Si volves a tocar la misma opcion mientras camina, se resuelve al toque:
  // nadie tiene que esperar a que el muneco llegue si no quiere.
  if (VJ.pendiente === h){ VJ.pendiente = null; VJ.destino = null; VJ.hot = h; vjInteractuar(); return; }
  VJ.meta = null;
  VJ.pendiente = h;
  VJ.pendienteHasta = performance.now() + 2600;   // si tarda demasiado, se resuelve igual
  VJ.destino = clamp(h.x + (VJ.x <= h.x ? -54 : 54), 40, vjEscena().ancho - 40);
};
window._vjIr = function(escena){
  if(!escena || !vjEscenas()[escena]) return;
  vjCambiarEscena(escena, 'izq');
};
window._vidaMapa = function(){
  const E = vjEscena(); const escenas = vjEscenas();
  alert('Estás en: ' + E.n + '\n\n' + (E.sale.izq ? '◀ A la izquierda: ' + escenas[E.sale.izq].n + '\n' : '') + (E.sale.der ? '▶ A la derecha: ' + escenas[E.sale.der].n : ''));
};
function vjDetener(){
  VJ.activo = false;
  clearInterval(VJ.ambT); clearTimeout(VJ.ambT0); VJ.ambT = VJ.ambT0 = 0;
  vjLimpiarBurbujas();
  if (VJ.raf) cancelAnimationFrame(VJ.raf);
  if (VJ.timer) clearInterval(VJ.timer);
  clearTimeout(VJ.wd);
  VJ.raf = 0; VJ.timer = 0; VJ.modo = null;
  if (VJ.onKeyDown) window.removeEventListener('keydown', VJ.onKeyDown);
  if (VJ.onKeyUp) window.removeEventListener('keyup', VJ.onKeyUp);
  if (VJ.onResize){ window.removeEventListener('resize', VJ.onResize); window.removeEventListener('orientationchange', VJ.onResize); }
  VJ.onKeyDown = VJ.onKeyUp = VJ.onResize = null;
  VJ.keys = {}; VJ.destino = null; VJ.mov = 0; VJ.pendiente = null;
}
function vjArrancarLoop(){
  const view = document.getElementById('vj-view');
  const world = document.getElementById('vj-world');
  const player = document.getElementById('vj-player');
  const prompt = document.getElementById('vj-prompt');
  if(!view || !world || !player) return;
  const E = vjEscena();

  // ── Teclado (PC) ──
  VJ.onKeyDown = (e)=>{
    if(!VJ.activo) return;
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A'){ VJ.keys.izq = 1; VJ.destino = null; e.preventDefault(); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D'){ VJ.keys.der = 1; VJ.destino = null; e.preventDefault(); }
    else if (k === ' ' || k === 'e' || k === 'E' || k === 'Enter'){ vjInteractuar(); e.preventDefault(); }
    else if (k === 'Escape'){ vjDetener(); window._carreraSalir(); }
  };
  VJ.onKeyUp = (e)=>{
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') VJ.keys.izq = 0;
    if (k === 'ArrowRight' || k === 'd' || k === 'D') VJ.keys.der = 0;
  };
  window.addEventListener('keydown', VJ.onKeyDown);
  window.addEventListener('keyup', VJ.onKeyUp);

  // ── Botones en pantalla (celular) ──
  const hold = (id, key)=>{
    const b = document.getElementById(id); if(!b) return;
    const on = (ev)=>{ ev.preventDefault(); VJ.keys[key] = 1; VJ.destino = null; };
    const off = ()=>{ VJ.keys[key] = 0; };
    ['pointerdown','touchstart'].forEach(t=>b.addEventListener(t, on, {passive:false}));
    ['pointerup','pointerleave','pointercancel','touchend','touchcancel'].forEach(t=>b.addEventListener(t, off));
  };
  hold('vj-izq','izq'); hold('vj-der','der');
  const acc = document.getElementById('vj-accion');
  if (acc) acc.addEventListener('click', (e)=>{ e.preventDefault(); vjInteractuar(); });

  // ── Tocar el piso: camina hasta ahí ──
  view.addEventListener('click', (ev)=>{
    if (ev.target.closest('button')) return;
    const r = view.getBoundingClientRect();
    const capa = document.getElementById('vj-escala');
    const offX = capa ? (parseFloat(capa.style.left) || 0) : 0;
    const sc = VJ.escala || 1;
    VJ.destino = clamp((ev.clientX - r.left - offX) / sc + vjCamara(), 40, E.ancho - 40);
  });
  VJ.onResize = ()=>{ if(VJ.activo) vjAjustarEscala(); };
  window.addEventListener('resize', VJ.onResize);
  window.addEventListener('orientationchange', VJ.onResize);

  VJ.ultT = 0;
  const paso = (t)=>{
    if(!VJ.activo) return;
    if (t == null) t = performance.now();
    VJ.latido = t;                       // marca de vida para el watchdog
    const dt = VJ.ultT ? Math.min(0.05, (t - VJ.ultT)/1000) : 0.016;
    VJ.ultT = t;
    // La edad manda en la velocidad: un pibe de 12 corretea, a los 75 no.
    // Se usa vjEdad() porque en el potrero todavía no existe G (se juega sobre
    // el borrador del personaje) y leer G.vidaEdad rompía el bucle entero.
    const edad = vjEdad();
    const vel = (edad <= 14 ? 118 : edad >= 70 ? 74 : edad >= 60 ? 92 : 110)
              * ((G && G.vidaStats && G.vidaStats.salud < 35) ? 0.7 : 1);
    let dx = 0;
    if (VJ.keys.izq) dx -= 1;
    if (VJ.keys.der) dx += 1;
    if (dx || VJ.destino != null){ VJ.ultInput = t; VJ.meta = null; }   // mandás vos
    if (!dx && VJ.destino != null){
      const dif = VJ.destino - VJ.x;
      if (Math.abs(dif) > 4) dx = dif > 0 ? 1 : -1; else VJ.destino = null;
    }
    // ── VIDA PROPIA ──
    // Sin órdenes tuyas durante unos segundos, el personaje se maneja solo.
    // El ocio se mide con el RELOJ, no sumando `dt`: cuando el navegador estrangula
    // los temporizadores (pestaña en segundo plano, ahorro de energía) `dt` viene
    // recortado y el personaje tardaría minutos en "aburrirse".
    if (!dx && VJ.destino == null){
      if (!VJ.ultInput) VJ.ultInput = t;
      if ((t - VJ.ultInput) / 1000 > 1.2){
        if (!VJ.proxDecision || t >= VJ.proxDecision) vjDecidirSolo(t);
        if (VJ.meta != null){
          const dif = VJ.meta - VJ.x;
          if (Math.abs(dif) > 6) dx = dif > 0 ? 1 : -1; else VJ.meta = null;
        }
      }
    }
    // SANEAR POSICION: si por cualquier via VJ.x quedo en NaN/Infinity el personaje
    // desaparece y no responde nunca mas. Se detecta y se lo devuelve al centro.
    if (!isFinite(VJ.x)) VJ.x = Math.round((E.ancho || 900) / 2);
    if (dx){
      VJ.x += dx * vel * dt;
      VJ.dir = dx;
      // Cruzar los bordes cambia de escenario.
      if (VJ.x <= 30 && E.sale.izq){ vjCambiarEscena(E.sale.izq, 'der'); return; }
      if (VJ.x >= E.ancho - 30 && E.sale.der){ vjCambiarEscena(E.sale.der, 'izq'); return; }
      VJ.x = clamp(VJ.x, 30, E.ancho - 30);
    }
    // SALVAVIDAS 1: si esta yendo a un destino y no avanza (queda trabado contra un
    // borde o contra otro personaje), se cancela el destino y vuelve el control.
    if (VJ.destino != null){
      if (VJ.ultX == null || Math.abs(VJ.x - VJ.ultX) > 1.5){ VJ.ultX = VJ.x; VJ.trabado = t; }
      else if (t - (VJ.trabado || t) > 2200){ VJ.destino = null; VJ.pendiente = null; VJ.trabado = t; }
    } else { VJ.ultX = VJ.x; VJ.trabado = t; }
    // SALVAVIDAS 2 (el que faltaba): el jugador APRIETA una direccion y el personaje
    // no se mueve. Pasa cuando queda clavado en un borde de una escena sin salida por
    // ese lado, o cuando un hotspot pendiente nunca se resuelve. Sin esto el juego se
    // "traba y no camina mas", que es exactamente el bug reportado.
    if (dx){
      if (VJ.manX == null || Math.abs(VJ.x - VJ.manX) > 1.0){ VJ.manX = VJ.x; VJ.manT = t; }
      else if (t - (VJ.manT || t) > 1500){
        // Despegue forzado: se limpia todo lo que puede estar reteniendolo y se lo
        // corre unos pixeles hacia adentro para que salga del borde.
        VJ.pendiente = null; VJ.destino = null; VJ.meta = null;
        VJ.x = clamp(VJ.x + (VJ.x < E.ancho/2 ? 45 : -45), 40, E.ancho - 40);
        VJ.manX = VJ.x; VJ.manT = t;
      }
    } else { VJ.manX = VJ.x; VJ.manT = t; }
    // SALVAVIDAS 3: un hotspot pendiente que nunca llega tiene fecha de vencimiento.
    if (VJ.pendiente && VJ.pendienteHasta && t > VJ.pendienteHasta + 4000){
      VJ.pendiente = null; VJ.destino = null;
    }
    // ¿Estaba yendo hacia algo? Al llegar (o si tarda de mas), se resuelve.
    if (VJ.pendiente){
      if (Math.abs(VJ.pendiente.x - VJ.x) < 72 || t > VJ.pendienteHasta){
        const objetivo = VJ.pendiente;
        VJ.pendiente = null; VJ.destino = null; VJ.hot = objetivo;
        vjInteractuar();
        return;
      }
    }
    const moviendo = !!dx;
    if (moviendo !== !!VJ.mov){
      VJ.mov = moviendo ? 1 : 0;
      VJ.poseActual = moviendo ? 'caminar' : vjPoseQuieto();
      VJ.proxPose = t + 4200 + Math.random()*3600;
      player.innerHTML = vjSpriteJugador(VJ.poseActual);
    } else if (!moviendo && t >= (VJ.proxPose || 0)){
      // Quieto: cambia de actitud CADA VARIOS SEGUNDOS, no en cada cuadro.
      VJ.proxPose = t + 4200 + Math.random()*3600;
      const nueva = vjPoseQuieto();
      if (nueva !== VJ.poseActual){ VJ.poseActual = nueva; player.innerHTML = vjSpriteJugador(nueva); }
    }
    player.style.transform = `translateX(${(VJ.x - 24).toFixed(1)}px) scaleX(${VJ.dir < 0 ? -1 : 1})`;
    const _bur = document.getElementById('vj-burbuja');
    if (_bur) _bur.style.left = VJ.x + 'px';
    world.style.transform = `translateX(${(-vjCamara()).toFixed(1)}px)`;
    // ¿Hay algo cerca?
    let cerca = null, mejor = 62;
    VJ.hotspots.forEach(h=>{ const d = Math.abs(h.x - VJ.x); if (d < mejor){ mejor = d; cerca = h; } });
    if (cerca !== VJ.hot){
      VJ.hot = cerca;
      if (prompt){
        if (cerca){ prompt.style.display = 'block'; prompt.innerHTML = `<i class='bx ${cerca.icono}'></i> ${cerca.lbl}`; }
        else prompt.style.display = 'none';
      }
    }
    if (VJ.modo === 'raf') VJ.raf = requestAnimationFrame(paso);
  };
  vjAjustarEscala();
  VJ.paso = paso;
  VJ.modo = 'raf';
  VJ.latido = performance.now();
  VJ.raf = requestAnimationFrame(paso);
  // WATCHDOG: en algunos contextos (pestaña en segundo plano, webviews sin
  // composición, modo ahorro de batería) requestAnimationFrame no dispara nunca y
  // el personaje quedaría clavado sin que el juego avise. Si en 300 ms no hubo ni
  // un cuadro, se pasa a un temporizador común.
  clearTimeout(VJ.wd);
  VJ.wd = setTimeout(()=>{
    if (!VJ.activo || VJ.modo !== 'raf') return;
    if (performance.now() - VJ.latido > 280){
      cancelAnimationFrame(VJ.raf);
      VJ.modo = 'timer';
      VJ.timer = setInterval(()=>{ if(VJ.activo) paso(performance.now()); else clearInterval(VJ.timer); }, 33);
    }
  }, 320);
}
// ══════════════════════════════════════════════════════════════════════════════
// VIDA PROPIA DEL PERSONAJE
// Si lo soltás, no se queda clavado esperando órdenes: se aburre, se pone a
// caminar solo, se acerca a la gente que hay en la escena, patea una pelota
// imaginaria, se queda pensando. En cuanto tocás una tecla o la pantalla, el
// control vuelve a vos al instante.
//
// GANCHO DE IA (opcional, apagado por defecto):
// si definís `window.CANCHERO_LEYENDA_IA = async (ctx) => "texto"`, esa función
// se usa para escribir lo que el personaje está pensando, en lugar del repertorio
// local. Recibe { mundo, escena, edad, club, apellido, cerca, animo, stats }.
// Mientras no la definas NO se hace ninguna llamada de red: cero costo, cero
// latencia y el juego funciona igual sin conexión.
// ══════════════════════════════════════════════════════════════════════════════
const VJ_PENSAMIENTOS = {
  potrero:   ['¿Y si algún día juego en primera?', 'Una más y me voy, en serio.', 'Mañana traigo la pelota buena.',
              'Ese caño no me lo olvido más.', 'Tengo hambre.'],
  juveniles: ['Extraño mi casa.', 'Si me ve el técnico, subo.', 'Me duelen los gemelos.',
              'Uno de estos veinte va a llegar. ¿Por qué no yo?', 'Tengo que llamar a mi vieja.'],
  club:      ['El domingo hay que ganar.', '¿Me estarán mirando de afuera?', 'Me sigue tirando la rodilla.',
              'La gente canta mi nombre. Todavía no me acostumbro.', 'Hoy tengo piernas.'],
  vida:      ['Cómo pasó rápido todo.', '¿Habré tomado las decisiones correctas?', 'Me haría bien caminar más.',
              'Tendría que llamar a los muchachos.', 'Todavía sueño que juego.']
};
// Elige un pensamiento. Si hay IA conectada, se la usa; si no, el repertorio local.
function vjPensar(){
  const cerca = VJ.hot ? VJ.hot.lbl : null;
  const local = () => {
    const pool = VJ_PENSAMIENTOS[VJ.mundo] || VJ_PENSAMIENTOS.vida;
    return cerca ? pick([pool[Math.floor(Math.random()*pool.length)], 'Ahí está ' + cerca.toLowerCase() + '.']) : pick(pool);
  };
  if (typeof window.CANCHERO_LEYENDA_IA === 'function'){
    const ctx = { mundo:VJ.mundo, escena:VJ.escena, edad:vjEdad(), club:(G&&G.club)||null,
      apellido:(G&&G.apellido)||(_draft&&_draft.apellido)||'', cerca,
      animo: G ? (G.moral != null ? G.moral : 60) : 60, stats: (G && G.vidaStats) || null };
    try {
      Promise.resolve(window.CANCHERO_LEYENDA_IA(ctx))
        .then(txt => { if (txt && VJ.activo) vjBurbuja(String(txt).slice(0,120)); })
        .catch(()=> vjBurbuja(local()));
      return null;                       // la burbuja la pinta la promesa
    } catch(e){ /* si la IA falla, se sigue con lo local */ }
  }
  return local();
}
// Globo de pensamiento sobre la cabeza del personaje.
function vjBurbuja(txt){
  const world = document.getElementById('vj-world'); if(!world || !txt) return;
  let b = document.getElementById('vj-burbuja'); if(b) b.remove();
  b = document.createElement('div'); b.id = 'vj-burbuja';
  b.style.cssText = 'position:absolute;bottom:'+(Math.round(250*(1-vjPisoPct()))+96)+'px;transform:translateX(-50%);background:rgba(240,244,248,.94);color:#12161c;border-radius:12px;padding:5px 10px;font-size:11px;font-weight:700;line-height:1.35;max-width:190px;text-align:center;pointer-events:none;box-shadow:0 3px 10px rgba(0,0,0,.5);transition:opacity .4s;';
  b.textContent = txt;
  b.style.left = VJ.x + 'px';
  world.appendChild(b);
  setTimeout(()=>{ if(b) { b.style.opacity='0'; setTimeout(()=>b.remove(), 420); } }, 3200);
}
// Decide qué hace el personaje cuando lo dejaste solo.
function vjDecidirSolo(ahora){
  const E = vjEscena();
  const r = Math.random();
  if (r < 0.45 && VJ.hotspots.length){
    // Se acerca a alguien o a algo de la escena: la curiosidad primero.
    const h = pick(VJ.hotspots);
    const lado = Math.random() < 0.5 ? -1 : 1;
    VJ.meta = clamp(h.x + lado * ri(52, 88), 50, E.ancho - 50);
  } else if (r < 0.72){
    VJ.meta = clamp(VJ.x + ri(-220, 220), 50, E.ancho - 50);   // paseo sin rumbo
  } else if (r < 0.86){
    // Se queda haciendo algo: se sienta, salta, se estira, resopla.
    VJ.meta = null;
    VJ.gestoLibre = pick(['sentado','saltar','estirar','sofocado','aplaudir','pensativo']);
    VJ.gestoHasta = (ahora || performance.now()) + 2600 + Math.random()*2600;
    VJ.proxPose = 0;   // que se aplique enseguida, y despues aguante
  } else {
    VJ.meta = null;                                             // se queda quieto pensando
    const p = vjPensar(); if (p) vjBurbuja(p);
  }
  // Próxima decisión propia, en tiempo de reloj.
  VJ.proxDecision = (ahora || performance.now()) + (4 + Math.random()*5) * 1000;
}
// Cuando está quieto, la pose depende de cómo viene la vida (no siempre la misma).
function vjPoseQuieto(){
  // ¿Esta en medio de un gesto propio? Se respeta hasta que se le pase.
  if (VJ.gestoLibre && performance.now() < (VJ.gestoHasta || 0)) return VJ.gestoLibre;
  VJ.gestoLibre = null;
  // Al lado de las pesas, entrena; no se queda mirando el infinito.
  if (VJ.hot && /^entrenar/.test(VJ.hot.accion || '')) return 'entrenar';
  if (VJ.mundo !== 'vida') return pick(['idle','pensando','idle','orgullo','alivio']);
  const s = (G && G.vidaStats) || {};
  if ((s.salud||70) <= 25) return 'agotado';
  const fel = s.felicidad != null ? s.felicidad : (s.resultados != null ? s.resultados : 55);
  if (fel >= 72) return pick(['orgullo','idle','aplaudir']);
  if (fel <= 28) return pick(['bajon','pensativo']);
  return pick(['idle','pensando','alivio']);
}
function vjCamara(){
  const view = document.getElementById('vj-view');
  const E = vjEscena();
  const s = VJ.escala || 1;
  const vw = (view ? view.clientWidth : 360) / s;   // ancho visible EN unidades del mundo
  return clamp(VJ.x - vw/2, 0, Math.max(0, E.ancho - vw));
}
// Zoom para que la escena llene el ancho de la pantalla (y se centre si sobra).
function vjAjustarEscala(){
  const view = document.getElementById('vj-view');
  const capa = document.getElementById('vj-escala');
  if(!view || !capa) return;
  const VW = view.clientWidth;
  const W = vjEscena().ancho, H = 250;
  // El zoom lo manda el ANCHO: la escena tiene que llenar la pantalla de lado a
  // lado siempre. En el celular queda en 1 y la camara acompana al personaje; en
  // PC se agranda hasta cubrir todo. El alto se deduce del zoom, asi no quedan
  // franjas negras ni arriba ni a los costados.
  // En PC el zoom por ancho llegaba a 2.4 y la escena se comía hasta 600px de
  // alto, dejando el panel de acciones fuera de la pantalla. Ahora el alto tiene
  // tope (46% del viewport) y el zoom se recalcula para respetarlo.
  const topeAlto = Math.max(150, Math.round((window.innerHeight || 700) * 0.56));
  // El zoom lo manda SIEMPRE el ancho: si se lo bajaba para respetar el tope de
  // alto, la escena dejaba de llegar al borde y quedaba un rectangulo negro a la
  // derecha en PC. Ahora el ancho se cubre igual y lo que sobra de alto se
  // recorta ARRIBA (cielo), anclando la capa abajo: el piso nunca se pierde.
  const s = clamp(VW / W, 1, 2.4);
  view.style.height = Math.min(Math.round(H * s), topeAlto) + 'px';
  capa.style.transformOrigin = 'left bottom';
  capa.style.transform = 'scale(' + s.toFixed(3) + ')';
  capa.style.left = '0px';
  capa.style.top = 'auto';
  capa.style.bottom = '0px';
  VJ.escala = s;
}
function vjCambiarEscena(nueva, entrarPor){
  VJ.escena = nueva;
  const E = vjEscenas()[nueva];
  VJ.x = entrarPor === 'izq' ? 46 : E.ancho - 46;
  VJ.destino = null; VJ.keys = {}; VJ.hot = null;
  vjDetener();
  mundoRender();
}
// ── INTERACCIÓN ──────────────────────────────────────────────────────────────
function vjInteractuar(){
  const h = VJ.hot; if(!h) return;
  if (h.bloqueado || h.accion === 'nada') return;
  // ── ACCIONES DE LAS ETAPAS DE FÚTBOL ──
  switch(h.accion){
    case 'potrero':      vjDetener(); window._carreraPotrero(_draft._potPaso || 0); return;
    case 'juvenil':      vjDetener(); window._carreraJuveniles(G._juvPaso || 0); return;
    case 'decision':     vjDetener(); window._carreraContinuar(); return;
    case 'jugar':        vjDetener(); window._carreraTemporada(); return;
    case 'mercado':      vjDetener(); window._carreraMercadoForzado(); return;
    case 'consejo':      vjConsejoRepre(); return;
    case 'gestion':      vjDetener(); window._vjGestion(); return;
    case 'escritorio':   vjDetener(); window._vjEscritorio('plantel'); return;
    case 'truco':
      if (!window._trucoAbrir){ vjFlash('El truco no está disponible acá.'); return; }
      vjDetener();
      window._trucoVolverA = function(){ window._vidaJugable(); };  // al salir, volvés a tu casa
      window._trucoAbrir();
      return;
    case 'abuelo':       vjAbuelo(h); return;
    case 'rival':        vjRival(h); return;
    case 'videojuego':
      if (!window._platAbrir){ vjFlash('El videojuego no está disponible acá.'); return; }
      vjDetener();
      window._platVolverA = function(){ window._vidaJugable(); };
      window._platAbrir({ apellido:G.apellido, num:G.num, colores:kitOf(G.pais||'Uruguay') });
      return;
    case 'cambiarRepre': vjDetener(); window._elegirRepre('cambio'); return;
    case 'bienes':       vjDetener(); window._carreraBienes(); return;
    case 'tablas':       vjDetener(); if(G._tablasData) window._verTablas('pos'); else vjFlash('Todavía no jugaste una temporada completa.'); return;
    case 'ficha':        vjDetener(); window._carreraHub(); return;
    case 'patear':       vjPatear(); return;
    case 'ropero':       vjDetener(); window._vjRopero(); return;
    case 'look':         vjDetener(); window._vjLook(); return;
    case 'entrenarJuv':  vjEntrenar(2, 'Te quedaste una hora más pateando al arco. Se nota.'); return;
    case 'entrenarClub': vjEntrenar(1, 'Doble turno en el gimnasio. El cuerpo responde.'); return;
    case 'descansarJuv': vjDescansarJuv(); return;
    case 'descansarCasa':vjDescansarCasa(); return;
    case 'charlaPotrero':vjCharla(h, 'potrero'); return;
    case 'charlaJuv':    vjCharla(h, 'juveniles'); return;
    case 'charlaClub':   vjCharla(h, 'club'); return;
  }
  const hechos = G._vjHechos = G._vjHechos || {};
  if (h.accion === 'descansar'){
    // La tele DURA: te sentás, pasa un rato, y recién ahí sentís el descanso.
    vjActividad({ icono:'bx-tv', color:'#7dd3fc', dur:3000, titulo: pick([
      'Mirando el partido en la tele...','Repetición del gol, por décima vez...',
      'Programa de debate futbolero de fondo...','Un rato de tele y nada más...'
    ]), onDone:()=>{
      const s = G.vidaStats; s.salud = clamp((s.salud||70) + ri(2,6), 0, 100);
      if (s.felicidad != null) s.felicidad = clamp(s.felicidad + ri(1,4), 0, 100);
      (G._vjHechos = G._vjHechos || {}).descanso = true;
      if ((s.salud||100) >= 55) G._vjHechos.cuidoSalud = true;
      save(); mundoRender();
      vjFlash(pick([
        'Te quedaste dormido en el sillón con el partido puesto. Descansaste.',
        'Nada del otro mundo, pero el cuerpo lo agradeció.',
        'Dos horas de tele y la cabeza quedó en cero. Hacía falta.'
      ]));
    }});
    return;
  }
  if (h.accion === 'trabajar'){
    const R0 = VIDA_ROLES[G.vidaRol];
    vjActividad({ icono:'bx-briefcase', color: (R0 && R0.color) || '#baff00', dur:3000, titulo: pick([
      'Metiéndole horas al laburo...','Jornada larga, de las que cansan...',
      'Cabeza en el trabajo, todo el día...'
    ]), onDone:()=>{
      const s = G.vidaStats, R = VIDA_ROLES[G.vidaRol];
      const barra = R.barras.find(b=>!b[3] && b[1] !== 'salud');
      if (barra) s[barra[1]] = clamp((s[barra[1]]||50) + ri(2,6), 0, 100);
      s.salud = clamp((s.salud||70) - ri(1,3), 0, 100);
      save(); mundoRender();
      vjFlash('Le metiste horas. Se nota en ' + (barra ? barra[0].toLowerCase() : 'el laburo') + '.');
    }});
    return;
  }
  if (h.accion === 'licencia'){ vjLicencia(); return; }
  if (h.accion === 'irACasa'){ vjCambiarEscena('casa','izq'); return; }
  if (h.accion === 'irEscena'){ vjCambiarEscena(h.destino, 'izq'); return; }
  if (h.accion === 'dormir'){ vjDormir(); return; }
  if (h.accion === 'rol'){
    if (hechos.lapso){ vjFlash('Ya tomaste la decisión importante de este tramo. Andá a dormir para que pasen los años.'); return; }
    let picked = vidaEventoDe(G.vidaRol, G.vidaLapso, G._vidaSeen || []);
    if(!picked){ G._vidaSeen = []; picked = vidaEventoDe(G.vidaRol, G.vidaLapso, []); }
    if(!picked){
      // Ultimo recurso: se cierra el tramo igual para que la vida siga avanzando.
      hechos.lapso = true; save(); mundoRender();
      vjFlash('Un tramo tranquilo: nada grande para decidir. Ya podés ir a dormir.');
      return;
    }
    G._vidaEv = picked; save();
    vjDialogo(picked.ev, 'rol', vjNombreJefe(), h);
    return;
  }
  if (h.accion === 'suceso'){
    // En la carrera el cupo es POR TEMPORADA (si no, se te acaba la vida en una
    // tarde); después del retiro, por tramo de cinco años.
    const enCarrera = VJ.mundo !== 'vida';
    if (enCarrera){
      personalAsegurar();
      const temp = G.temporada || 1;
      if (G._sucTemp !== temp){ G._sucTemp = temp; G._sucHechos = 0; }
      if ((G._sucHechos || 0) >= 2){ vjFlash('Ya pasaron bastantes cosas esta temporada. Andá a jugar.'); return; }
    } else {
      hechos.sucesos = hechos.sucesos || 0;
      if (hechos.sucesos >= 2){ vjFlash('Ya pasó bastante por hoy. El tiempo tiene que correr.'); return; }
    }
    let suc = vjSucesoDisponible(h.cat);
    if(!suc){ G._vjSucVistos = []; suc = vjSucesoDisponible(h.cat); }
    if(!suc){ vjFlash('Por ahora no hay nada pendiente por acá.'); mundoRender(); return; }
    G._vjSuc = suc;
    // Si el suceso trae un personaje con nombre propio (las leyendas), el que
    // habla es ÉL, no el cartel que tocaste. Sin esto una leyenda aparecía
    // dibujada pero rotulada como "La gente del barrio".
    vjDialogo(suc.ev, 'suceso', (suc.ev.npc && suc.ev.npc.nombre) || h.lbl, h);
    return;
  }
}
// ── ACCIONES LIBRES DE LOS MUNDOS DE FÚTBOL ──────────────────────────────────
// No dan una decisión: son cosas que hacés porque sí, y que igual dejan marca.
// Patear al arco en el baldío suma (poco) al bonus con el que arrancás.
function vjPatear(){
  const d = _draft; if(!d) return;
  d._pateos = (d._pateos || 0) + 1;
  if (d._pateos <= 3){
    const bien = Math.random() < 0.6;
    if (bien) d._potBonus = (d._potBonus || 0) + 1;
    vjFlash(bien ? 'La clavaste en un ángulo. Cada tarde acá te hace un poco mejor.'
                 : 'Le pegaste afuera. Igual, pateaste doscientas veces más.');
  } else {
    vjFlash('Ya pateaste bastante por hoy. Andá a hablar con los pibes.');
  }
}
// Entrenar aparte: nivel a cambio de un poco de moral (cuesta).
function vjEntrenar(cuanto, txt){
  if(!G) return;
  G._entrenos = (G._entrenos || 0) + 1;
  if (G._entrenos > 3){ vjFlash('Ya entrenaste de más. Un cuerpo también necesita parar.'); return; }
  vjActividad({ icono:'bx-dumbbell', color:'#f59e0b', dur:3200, titulo: pick([
    'Entrenando fuerte...','Doble turno, sin bajar los brazos...',
    'Repeticiones, y otras cien más...','Solo vos, la pelota y el arco...'
  ]), onDone:()=>{
    G.nivel = subirNivel(cuanto);
    G.moral = clamp(G.moral - 2, 0, 100);
    save();
    mundoRender();
    vjFlash(txt + ' (+' + cuanto + ' nivel, −2 moral)');
  }});
}
// ── CRUZARTE CON TU RIVAL ────────────────────────────────────────────────────
// Lo que te dice sale del historial real del duelo: cuántas le ganaste, cuántas
// te ganó, y cómo quedó la relación entre ustedes después de tantos años.
function vjRival(h){
  if(!G || !G.rival) return;
  const R = G.rival;
  const g = R.ganados || 0, p = R.perdidos || 0;
  const rel = R.relacion || 0;
  const miNivel = G.nivel || 60, suNivel = R.nivel || 60;
  let frases;
  if (rel <= -35){
    frases = [
      'Ni me saludes. Nos vemos en la cancha.',
      'Todavía me acuerdo de lo que dijiste en esa nota. No se te olvida a vos tampoco, ¿no?',
      'Vos y yo no tenemos nada que hablar. Noventa minutos y listo.'
    ];
  } else if (rel >= 35){
    frases = [
      'Che, ¿te acordás cuando nos echaron a los dos en juveniles? Éramos dos pendejos.',
      'Me alegro de verte, en serio. Después en la cancha te reviento igual.',
      'Cuando esto se termine tenemos que juntarnos a comer, sin cámaras.'
    ];
  } else {
    frases = [
      'Otra vez vos. Ya perdí la cuenta de las veces que nos cruzamos.',
      'Suerte hoy. Pero suerte de la justa, eh.',
      'Nos siguen comparando. Van veinte años y no aflojan.'
    ];
  }
  const datos = [];
  if (g + p > 0) datos.push('Vamos ' + g + ' a ' + p + '. Los llevo contados, no te hagás el que no.');
  if (suNivel > miNivel + 5) datos.push('Este año ando mejor que vos y los dos lo sabemos.');
  else if (miNivel > suNivel + 5) datos.push('Estás en un momento bárbaro. Me da bronca reconocerlo.');
  if ((R.titulos||0) > (G.titulos||0)) datos.push('Te falta una vitrina como la mía, eh.');
  else if ((G.titulos||0) > (R.titulos||0)) datos.push('Ganaste más que yo. Es lo único que no te voy a discutir.');
  vjBurbujaEn(h.x, pick(frases.concat(datos)), 5000);
  // Cruzárselo y bancarle la mirada te deja algo: o se calienta la cosa, o se
  // ablanda. Nunca queda igual.
  R.relacion = clamp(rel + ri(-4, 6), -100, 100);
  G.moral = clamp((G.moral||60) + ri(0, 3), 0, 100);
  save();
}
// ── HABLAR CON EL ABUELO ─────────────────────────────────────────────────────
// Lo que dice depende de dónde estás parado respecto a él: si todavía te falta,
// te empuja; si lo pasaste, te lo reconoce. Es el cierre del legado.
function vjAbuelo(h){
  if(!G || !G.legado) return;
  const L = G.legado, E = legadoEstado();
  const quien = L.padre || 'tu ' + (L.parentesco||'abuelo');
  let frases;
  if (E && E.superado){
    frases = [
      'Ya me pasaste, pibe. Y te lo digo con la cara alta: no hay orgullo más grande que ese.',
      'Toda la vida me compararon con otros. A vos ya no te comparan con nadie.',
      'Yo llegué hasta donde pude. Vos llegaste más lejos, y encima jugando lindo.'
    ];
  } else if (E && (E.nivel >= E.techoN - 6)){
    frases = [
      'Estás ahí nomás. Lo que falta no se entrena: se aguanta.',
      'Te falta poco. Yo en tu lugar no cambiaría nada, seguí como venís.',
      'Cuando yo tenía tu edad estaba peor parado que vos, te lo juro.'
    ];
  } else {
    frases = [
      'No mires lo que hice yo. Mirá lo que podés hacer vos, que es otra cosa.',
      'A mí me tocó otra época. Vos tenés cosas que yo ni soñaba. Usalas.',
      'El apellido abre la puerta una vez. Después la tenés que sostener solo.',
      'Entrená los días que no tenés ganas. Los otros no cuentan.'
    ];
  }
  const extra = [];
  if (L.club) extra.push('En ' + esc(L.club) + ' me hicieron hombre. Andá alguna vez, aunque sea a mirar.');
  if (L.rival) extra.push('Mi rival de toda la vida fue ' + esc(L.rival) + '. Terminamos amigos, mirá vos.');
  if ((L.vitrina||[]).length) extra.push('Lo que más me llené el pecho fue ganar ' + esc(L.vitrina[0]) + '.');
  vjBurbujaEn(h.x, pick(frases.concat(extra)), 5200);
  const s = personalAsegurar();
  if (s){
    s.felicidad = clamp((s.felicidad||55) + ri(1,4), 0, 100);
    s.soledad = clamp((s.soledad||30) - ri(2,5), 0, 100);
    save();
  }
}
// Un rato en casa: recupera salud y felicidad, y baja la soledad.
function vjDescansarCasa(){
  if(!G) return;
  vjActividad({ icono:'bx-home-heart', color:'#a78bfa', dur:2900, titulo: pick([
    'Una tarde tranquila en casa...','Mate, sillón y nada más...',
    'Sin apuro, por una vez...','Mirando la fecha en la tele de casa...'
  ]), onDone:()=>{
    const s = personalAsegurar();
    s.salud = clamp((s.salud||80) + ri(1,4), 0, 100);
    s.felicidad = clamp((s.felicidad||55) + ri(2,5), 0, 100);
    s.soledad = clamp((s.soledad||30) - ri(1,4), 0, 100);
    save();
    mundoRender();
    vjFlash(pick([
      'Una tarde en casa mirando la fecha. De esas que no cuenta nadie pero hacen falta.',
      'Nada épico. Pero saliste de ahí con la cabeza en su lugar.',
      'Silencio, sillón y descanso. El cuerpo lo pedía.'
    ]));
  }});
}
function vjDescansarJuv(){
  if(!G) return;
  vjActividad({ icono:'bx-moon', color:'#818cf8', dur:2800, titulo: pick([
    'Durmiendo de verdad, por una noche...','Ocho horas seguidas, sin despertador...',
    'La pensión en silencio, por fin...'
  ]), onDone:()=>{
    G.moral = clamp(G.moral + ri(3,7), 0, 100);
    G._entrenos = Math.max(0, (G._entrenos||0) - 1);
    save();
    mundoRender();
    vjFlash('Dormiste ocho horas de verdad. A esta edad eso también es entrenar.');
  }});
}

// ══════════════════════════════════════════════════════════════════════════════
// HABLARLE A LA GENTE (y que te contesten distinto)
// Podés escribirle lo que se te ocurra a cualquier personaje. La respuesta no sale
// de una lista fija: el NPC "piensa" — lee lo que le escribiste, ve de qué tema se
// trata, mira quién es él, quién sos vos, cómo venís (moral, plata, títulos, club,
// edad, familia) y arma una contestación propia. Dos personajes distintos
// contestan distinto la misma pregunta, y el mismo personaje no repite.
// Si conectás `window.CANCHERO_LEYENDA_IA`, se usa esa función; si no, todo se
// resuelve local, sin red y sin costo.
// ══════════════════════════════════════════════════════════════════════════════
const NPC_TEMAS = [
  { id:'saludo',  k:/^(hola|buenas|que tal|qué tal|como andas|cómo andás|como estas|cómo estás|ey|hey|holis)/i },
  { id:'futbol',  k:/(f[uú]tbol|partido|gol|jugar|equipo|cancha|pelota|clasico|clásico|final|torneo|liga|campeon|campeón)/i },
  { id:'plata',   k:/(plata|dinero|guita|sueldo|contrato|caro|pobre|rico|pagar|deuda|millon|millón)/i },
  { id:'familia', k:/(familia|hijo|hija|mujer|marido|pareja|nieto|nieta|padre|madre|viejo|vieja|casa)/i },
  { id:'consejo', k:/(qu[eé] hago|consejo|me conviene|recomend|deber[ií]a|pensas|pensás|opinas|opinás)/i },
  { id:'futuro',  k:/(futuro|retir|despu[eé]s|ma[ñn]ana|proyecto|plan|sue[ñn]o|robot|espacio|marte|nave)/i },
  { id:'pelea',   k:/(idiota|est[uú]pido|callate|callate|mentira|traidor|basta|odio|mal[ií]simo|pesimo|pésimo)/i },
  { id:'elogio',  k:/(crack|grande|genio|gracias|te quiero|felicit|maestro|[ií]dolo|admiro)/i },
  { id:'pregunta',k:/\?$/ }
];
function npcTema(txt){
  const t = String(txt||'').trim();
  for (const T of NPC_TEMAS) if (T.k.test(t)) return T.id;
  return 'general';
}
// Cómo habla cada personaje. El mismo tema suena distinto según quién sea.
const NPC_VOCES = {
  'tu pareja':   { trato:'cercano', muletilla:['amor','che'],        sesgo:'familia' },
  'tu hijo':     { trato:'chico',   muletilla:['pa','papá'],         sesgo:'futuro'  },
  'tu hija':     { trato:'chico',   muletilla:['pa','papá'],         sesgo:'futuro'  },
  'tu nieto':    { trato:'chico',   muletilla:['abu','abuelo'],      sesgo:'futbol'  },
  'tu nieta':    { trato:'chico',   muletilla:['abu','abuela'],      sesgo:'futbol'  },
  'DT':          { trato:'seco',    muletilla:['pibe','escuchame'],  sesgo:'futbol'  },
  'DT juveniles':{ trato:'seco',    muletilla:['pibe'],              sesgo:'futbol'  },
  'capitán':     { trato:'compa',   muletilla:['tranquilo','mirá'],  sesgo:'futbol'  },
  'hincha':      { trato:'pasion',  muletilla:['maestro','crack'],   sesgo:'futbol'  },
  'vecino':      { trato:'barrio',  muletilla:['vecino','che'],      sesgo:'general' },
  'representante':{trato:'negocio', muletilla:['escuchame bien'],    sesgo:'plata'   },
  'médico':      { trato:'formal',  muletilla:['mirá'],              sesgo:'salud'   },
  'ojeador':     { trato:'formal',  muletilla:['pibe'],              sesgo:'futbol'  },
  'tu viejo':    { trato:'cercano', muletilla:['hijo','nene'],       sesgo:'familia' },
  'veterano':    { trato:'seco',    muletilla:['pibe'],              sesgo:'futbol'  },
  'compañero':   { trato:'compa',   muletilla:['bo','che'],          sesgo:'general' },
  'amigo':       { trato:'compa',   muletilla:['bo','loco'],         sesgo:'general' }
};
// Los ladrillos con los que se arma la respuesta, por tema y por trato.
const NPC_RESP = {
  saludo:{
    cercano:['Hola. ¿Todo bien? Te noto raro.','Ey. Justo estaba pensando en vos.'],
    chico:['¡Hola! ¿Jugamos un rato?','Hola. ¿Hoy te quedás en casa?'],
    seco:['Buenas. Al grano, que tengo entrenamiento.','Qué haces. ¿Necesitás algo?'],
    compa:['Ey, apareciste. Hacía rato.','Todo bien. ¿Y vos?'],
    pasion:['¡Grande! Un gusto encontrarte acá.','¡Eh, mirá quién anda por el barrio!'],
    barrio:['Buenas. Justo iba a golpearte la puerta.','Qué decís. Todo tranquilo por acá.'],
    negocio:['Decime, que tengo dos llamadas esperando.','Al fin atendés. Tenemos que hablar.'],
    formal:['Buenas. Pase, lo estaba esperando.','Buen día. ¿Cómo se ha sentido?']
  },
  futbol:{
    cercano:['Del fútbol vos sabés más que yo. Yo miro cómo volvés a casa.','Ganes o pierdas acá te esperamos igual.'],
    chico:['¿Y si jugamos como jugabas vos?','Yo quiero ser como vos cuando sea grande.'],
    seco:['El fútbol es simple: corré, pensá y no la compliques.','Se juega como se entrena. Nada más.'],
    compa:['Si sale bien nadie se acuerda, si sale mal te lo cobran diez años.','En la cancha se arregla todo.'],
    pasion:['¡Ese equipo con vos adentro es otra cosa!','Yo te vi jugar. No me lo cuenta nadie.'],
    barrio:['Acá el domingo no se habla de otra cosa.','Mi señora me echa del living cuando juegan ustedes.'],
    negocio:['El fútbol es lindo, pero lo que se firma es lo que queda.','Jugá bien tres meses y te cambio la vida.'],
    formal:['Cuide el cuerpo y el fútbol le va a durar el doble.','Yo veo rodillas todo el día. Escúchelas.']
  },
  plata:{
    cercano:['La plata está bien, pero no te compres otro auto, por favor.','Mientras alcance, a mí me sobra.'],
    chico:['¿Somos ricos? En la escuela dicen que sí.','No entiendo nada de eso, pa.'],
    seco:['Con la plata no se entrena. Concentrate en lo tuyo.','Eso arreglalo con tu representante, yo pongo el equipo.'],
    compa:['Todos cobramos distinto y todos corremos igual. Así es esto.','Guardá algo, en serio. Se termina rápido.'],
    pasion:['Ojalá te paguen lo que valés, maestro.','A mí lo que me importa es que no te vayas.'],
    barrio:['Se dice de todo con lo que ganás, pero nadie sabe.','Con lo tuyo yo ya no laburaba más.'],
    negocio:['Los números son estos y no los invento yo.','Si firmás ahora te sacás diez años de encima.'],
    formal:['La salud es más cara que cualquier contrato.','Eso no es lo mío. Pero cuídese.']
  },
  familia:{
    cercano:['Los chicos preguntan por vos. Eso es todo lo que te voy a decir.','Estamos bien. Cansados, pero bien.'],
    chico:['¿Vas a estar en mi cumpleaños esta vez?','Mamá dice que trabajás mucho.'],
    seco:['Arreglá lo de tu casa. Adentro de la cancha se nota.','Yo también tuve familia y también me equivoqué.'],
    compa:['La familia banca todo hasta que un día no banca más.','Llamalos. En serio. Llamalos.'],
    pasion:['Mi hijo tiene tu camiseta. Duerme con ella.','En casa te tratan como si fueras de la familia.'],
    barrio:['Tu vieja siempre para en la puerta a saludar.','Los tuyos son buena gente, eso se ve.'],
    negocio:['La familia después. Primero firmemos.','Tranquilo, con esto los dejás cubiertos de por vida.'],
    formal:['Traiga a la familia a la próxima consulta.','El apoyo de la casa cura más que lo que receto yo.']
  },
  consejo:{
    cercano:['Hacé lo que te deje dormir. El resto es ruido.','Yo te apoyo, decidas lo que decidas.'],
    chico:['¡Yo digo que sí! Siempre sí.','No sé. ¿Qué harías vos?'],
    seco:['Trabajá y callate. Las respuestas aparecen solas.','No preguntes: elegí y bancate lo que venga.'],
    compa:['Yo en tu lugar me la jugaría. Total, una sola vez se vive.','Pensalo dos días. Nunca decidas caliente.'],
    pasion:['¡Quedate! ¿Qué querés que te diga?','Vos hacé lo tuyo que nosotros te seguimos.'],
    barrio:['Escuchá poco a los que no se juegan nada.','Preguntale a los tuyos, no a la gente del barrio.'],
    negocio:['Mi consejo vale plata, pero te lo doy gratis: aceptá.','No firmes lo primero. Nunca.'],
    formal:['Mi consejo es siempre el mismo: descanse.','Menos partidos y más sueño.']
  },
  futuro:{
    cercano:['Cuando esto termine me gustaría estar tranquilos, nada más.','El futuro me da igual si estamos juntos.'],
    chico:['¿Es verdad que vamos a poder viajar al espacio?','Dicen que en unos años los robots van a jugar al fútbol.'],
    seco:['El futuro se prepara hoy, en el entrenamiento de mañana.','No pienses en el futuro. Pensá en el domingo.'],
    compa:['Todo cambia. Hace poco no había nada de esto y mirá ahora.','Yo el futuro lo veo raro, pero me pinta bien.'],
    pasion:['¡Ojalá te pueda ver jugar diez años más!','El día que te retires este barrio se para.'],
    barrio:['Cada año inventan algo nuevo y uno cada vez entiende menos.','Antes esto era todo campo, ¿sabés?'],
    negocio:['El negocio del futuro ya arrancó y vos no estás adentro.','Posicionate ahora y en diez años cobrás sin moverte.'],
    formal:['Con lo que viene, vas a vivir muchísimo más que tu abuelo.','La medicina de hoy no se parece en nada a la de antes.']
  },
  pelea:{
    cercano:['No me hables así. En serio.','Uh. Mejor hablamos mañana.'],
    chico:['...','No te enojes conmigo.'],
    seco:['Cuidado con cómo me hablás. Yo pongo el equipo.','Mirá que a mí no me temblo la mano.'],
    compa:['Pará, pará. ¿Qué te pasa?','Tomate un vaso de agua y volvé.'],
    pasion:['Bueno, tampoco. Yo te banqué siempre.','No hace falta, eh.'],
    barrio:['Vení, no arranquemos así.','Yo no me meto con nadie, ¿eh?'],
    negocio:['Con esa actitud te quedás sin contrato.','Tranquilo. Yo trabajo para vos.'],
    formal:['Le pido que se calme, por su presión.','Así no vamos a poder ayudarlo.']
  },
  elogio:{
    cercano:['Dale, no seas chupamedias.','Gracias. Vos también, aunque no lo digas nunca.'],
    chico:['¡Vos sos el mejor del mundo!','¡Sabía que ibas a decir eso!'],
    seco:['Guardate los elogios para el domingo.','Está bien. Ahora, a trabajar.'],
    compa:['Pará que me pongo colorado.','Ojalá todos pensaran así.'],
    pasion:['¡El crack sos vos! ¡Una foto, dale!','Gracias por todo lo que nos diste.'],
    barrio:['Qué buen tipo que sos, en serio.','Se agradece que sigas siendo el mismo.'],
    negocio:['Con esa cabeza llegamos lejos.','Así me gusta. Positivo.'],
    formal:['Le agradezco. Pero igual haga el estudio.','Muy amable. Nos vemos en tres meses.']
  },
  general:{
    cercano:['Mmm. No sé qué decirte, la verdad.','Contame más, que así no te sigo.'],
    chico:['¿Y eso qué quiere decir?','Bueno. ¿Después jugamos?'],
    seco:['No me hagas perder tiempo con eso.','Concreto: ¿qué necesitás?'],
    compa:['Mirá vos. Nunca lo había pensado así.','Puede ser. O puede que no.'],
    pasion:['¡Lo que vos digas, campeón!','Se te extraña por el barrio, che.'],
    barrio:['Y bueno, así son las cosas por acá.','Yo te escucho, eh. Cuando quieras.'],
    negocio:['Anotado. Lo veo y te aviso.','Dejámelo a mí.'],
    formal:['Entiendo. Tomo nota.','Lo vemos con calma.']
  }
};
// Datos REALES de tu partida que el NPC puede meter en la respuesta.
function npcContexto(){
  const c = [];
  if (!G) return c;
  if (G.club) c.push('lo de ' + G.club + ' te queda grande o te queda chico, todavía no sé');
  if ((G.titulos||0) >= 3) c.push('con ' + G.titulos + ' títulos encima ya podés hablar de igual a igual');
  if ((G.moral||60) < 40) c.push('te veo la cara: no me digas que estás bien');
  if ((G.dinero||0) > 500000) c.push('con la plata que juntaste, no sé qué hacés todavía acá');
  if (G.familia && G.familia.pareja) c.push('¿cómo anda ' + G.familia.pareja + '?');
  if (((G.familia||{}).hijos||[]).length) c.push('los chicos están enormes, ¿eh?');
  const ep = (typeof epoca === 'function') ? epoca() : 0;
  if (ep >= 3) c.push('ahora hasta los arqueros de las inferiores entrenan con robots');
  if (ep >= 4) c.push('mi sobrino se fue a jugar un amistoso en la órbita, ¿podés creer?');
  return c;
}
// La respuesta: se elige tema, voz y se arma la frase sin repetir la anterior.
function npcResponder(txt, rol, semilla, quien){
  const V = NPC_VOCES[String(rol||'').toLowerCase()] || NPC_VOCES['vecino'];
  let tema = npcTema(txt);
  // Si no entendió nada concreto, tira para su propio tema.
  if (tema === 'general' && Math.random() < 0.5) tema = V.sesgo || 'general';
  if (tema === 'pregunta') tema = 'consejo';
  if (tema === 'salud') tema = 'consejo';
  const banco = (NPC_RESP[tema] || NPC_RESP.general);
  const linea = banco[V.trato] || NPC_RESP.general[V.trato] || NPC_RESP.general.compa;
  let frase = pick(linea);
  // Que no repita la última.
  G && (G._npcUlt = G._npcUlt || {});
  if (G && G._npcUlt[semilla] === frase && linea.length > 1)
    frase = linea[(linea.indexOf(frase)+1) % linea.length];
  if (G) G._npcUlt[semilla] = frase;
  // A veces engancha algo real de tu partida: eso es lo que hace que "piense".
  // Nunca le pregunta a alguien por si mismo ("Carolina: como anda Carolina?").
  const ctx = npcContexto().filter(t => !quien || t.toLowerCase().indexOf(String(quien).toLowerCase()) < 0);
  if (ctx.length && Math.random() < 0.45){
    let extra = pick(ctx);
    // Mayuscula respetando los signos de apertura del castellano.
    extra = extra.replace(/^([¿¡]?)(.)/, (m,a,b)=>a + b.toUpperCase());
    if (!/[.!?]$/.test(extra)) extra += '.';
    frase += ' ' + extra;
  }
  // Y de vez en cuando arranca con su muletilla.
  if (V.muletilla && V.muletilla.length && Math.random() < 0.4)
    frase = pick(V.muletilla).replace(/^./, c=>c.toUpperCase()) + ', ' + frase.replace(/^./, c=>c.toLowerCase());
  return frase;
}

// ¿A esto se le puede escribir? Sólo a PERSONAS con identidad propia. Las
// acciones que hacen avanzar la etapa se dibujan con un muñeco pero son
// situaciones ("Lesión temprana", "El picado del barrio"): no son alguien.
const VJ_ACCIONES_SITUACION = ['potrero','juvenil','decision','rol','gestion','jugar','dormir','irACasa','nada'];
function vjCharlable(h){
  return !!(h && h.tipo === 'npc' && h.rol && !h.bloqueado &&
            VJ_ACCIONES_SITUACION.indexOf(h.accion) < 0);
}
// ══════════════════════════════════════════════════════════════════════════════
// EL MUNDO HABLA SOLO
// Si hay dos personas en la escena, cada tanto se ponen a charlar entre ellas sin
// que vos escribas nada: aparecen los globitos sobre sus cabezas. Si querés meterte,
// el botón de escribir sigue estando.
// ══════════════════════════════════════════════════════════════════════════════
function vjBurbujaEn(x, texto, ms){
  const world = document.getElementById('vj-world'); if(!world) return;
  const d = document.createElement('div');
  d.className = 'vj-amb';
  d.style.cssText = 'position:absolute;left:'+x+'px;bottom:'+Math.round(250*(1-vjPisoPct())+96)+'px;'+
    'transform:translateX(-50%);max-width:190px;background:rgba(8,11,16,.94);border:1px solid #35506b;'+
    'color:#e8eef5;border-radius:11px;padding:6px 9px;font-size:11px;font-weight:600;line-height:1.35;'+
    'text-align:center;pointer-events:none;z-index:5;box-shadow:0 3px 12px rgba(0,0,0,.6);opacity:0;transition:opacity .25s;';
  d.textContent = texto;
  world.appendChild(d);
  requestAnimationFrame(()=>{ d.style.opacity = '1'; });
  setTimeout(()=>{ d.style.opacity = '0'; setTimeout(()=>d.remove(), 300); }, ms || 4200);
}
function vjLimpiarBurbujas(){ document.querySelectorAll('.vj-amb').forEach(e=>e.remove()); }
// Temas de los que puede hablar la gente, según dónde estés.
function vjTemaAmbiente(){
  const t = { casa:['la familia','la casa','lo que se cocina','los chicos'],
    barrio:['el barrio','el partido del domingo','lo caro que está todo'],
    vestuario:['el partido que viene','el técnico','cómo viene el grupo'],
    cancha:['el entrenamiento','la cancha','el rival'],
    oficina:['contratos y plata','el mercado de pases'],
    trabajo:['el laburo','cómo viene la temporada'],
    baldio:['el picado','quién juega mejor'],
    predio:['quién sube a primera','el entrenamiento'],
    pension:['la comida de la pensión','extrañar la casa'] }[VJ.escena];
  return pick(t || ['cualquier cosa','lo de siempre']);
}
// Cada tanto, dos personas de la escena se ponen a hablar.
function vjAmbienteTick(){
  if (!VJ.activo || VJ._chatCon) return;
  const gente = (VJ.hotspots || []).filter(vjCharlable);
  if (gente.length < 2) return;
  const par = shuffle(gente.slice()).slice(0,2);
  const A = par[0], B = par[1];
  const ficha = h => ({ nombre: h.nombre || vjNombreNPC(h.semilla, vjGen(h)), rol: h.rol, edad: h.edad });
  const mostrar = (la, lb)=>{
    if (!VJ.activo) return;
    vjBurbujaEn(A.x, la, 4200);
    setTimeout(()=>{ if (VJ.activo) vjBurbujaEn(B.x, lb, 4200); }, 2000);
  };
  const localA = vjFraseViva(VJ.mundo === 'vida' ? 'vida' : (VJ.mundo === 'potrero' ? 'potrero' : 'club'));
  const localB = vjFraseViva(VJ.mundo === 'vida' ? 'vida' : (VJ.mundo === 'potrero' ? 'potrero' : 'club'));
  if (window._lyChatIA === false){ mostrar(localA, localB); return; }
  fetch('/api/game-judge', {
    method:'POST', headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ modo:'ambiente', a:ficha(A), b:ficha(B), tema:vjTemaAmbiente(),
      lugar:(vjEscena()||{}).n || '', anio:(G&&G.anio)||2026, apellido:(G&&G.apellido)||'',
      edad:vjEdad(), club:(G&&G.club)||null, titulos:(G&&G.titulos)||0 })
  })
  .then(r=> r.status === 200 ? r.json() : null)
  .then(d=>{ if (d && d.a && d.b) mostrar(d.a, d.b); else mostrar(localA, localB); })
  .catch(()=> mostrar(localA, localB));
}

// Pantalla de conversación: escribís, te contesta, y podés seguir.
window._vjHablar = function(indice){
  const h = (VJ.hotspots||[])[indice];
  if(!h) return;
  vjDetener();
  VJ._chatCon = h;
  VJ._chatHilo = [];
  vjPintarChat();
};
function vjPintarChat(){
  const h = VJ._chatCon; if(!h) return;
  const nombre = h.nombre || vjNombreNPC(h.semilla, vjGen(h));
  const rol = (h.rol || 'vecino');
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <!-- La charla ocupa TODA la pantalla y el hilo se estira: antes vivía en una
       cajita de 210px y había que deslizar para leer tres mensajes. -->
  <div style="height:100%;min-height:100%;background:#05070a;display:flex;flex-direction:column;position:relative;">
    ${fondoEscenaHTML()}
    <div style="position:relative;flex:1;min-height:0;max-width:640px;margin:0 auto;width:100%;padding:52px 18px calc(18px + env(safe-area-inset-bottom));box-sizing:border-box;display:flex;flex-direction:column;">
      <div style="flex:0 0 auto;display:flex;align-items:flex-end;justify-content:center;gap:6px;margin-bottom:10px;">
        <div style="line-height:0;">${h.tipo==='npc' ? vjSpriteHab(h,'idle') : vjObjSVG(h.obj, h.escala)}</div>
        <div style="line-height:0;transform:scaleX(-1);">${vjSpriteJugador('idle')}</div>
      </div>
      <div style="flex:1;min-height:0;display:flex;flex-direction:column;background:rgba(10,13,8,.82);border:1.5px solid #2a3a4c;border-radius:18px;padding:14px;">
        <div style="flex:0 0 auto;font-size:10px;font-weight:900;letter-spacing:1.5px;color:${A};margin-bottom:9px;">${esc(nombre.toUpperCase())} · ${esc(String(rol).toUpperCase())}</div>
        <div id="ly-chat-hilo" style="flex:1;min-height:96px;overflow-y:auto;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column;gap:7px;margin-bottom:11px;">
          ${VJ._chatHilo.length ? VJ._chatHilo.map(l=>`
            <div style="align-self:${l.yo?'flex-end':'flex-start'};max-width:84%;background:${l.yo?'rgba(186,255,0,.14)':'rgba(255,255,255,.06)'};border:1px solid ${l.yo?'rgba(186,255,0,.35)':'#243040'};color:${l.yo?A:'#dbe3ee'};border-radius:13px;padding:8px 11px;font-size:13px;line-height:1.45;${l.pensando?'opacity:.6;letter-spacing:2px;':''}">${l.pensando?'···':esc(l.t)}</div>`).join('')
            : `<div style="font-size:12.5px;color:#7d879a;">Escribile lo que quieras. Te va a contestar según quién es, qué le dijiste y cómo venís vos.</div>`}
        </div>
        <div style="flex:0 0 auto;display:flex;gap:8px;">
          <input id="ly-chat-in" maxlength="160" ${VJ._chatHilo.some(x=>x.pensando)?'disabled':''} placeholder="Escribí acá..." style="flex:1;min-width:0;background:rgba(255,255,255,.05);border:1px solid #243040;color:#fff;border-radius:12px;padding:12px;font-size:16px;font-family:inherit;">
          <button onclick="window._vjChatEnviar()" style="background:rgba(186,255,0,.16);border:1px solid ${A};color:${A};border-radius:12px;padding:12px 16px;font-weight:900;font-size:13px;cursor:pointer;"><i class='bx bx-send'></i></button>
        </div>
        <button onclick="window._vjChatCerrar()" style="flex:0 0 auto;width:100%;margin-top:9px;background:transparent;border:none;color:#5d6879;font-size:12px;font-weight:800;cursor:pointer;padding:8px;">Cortar la charla</button>
      </div>
    </div>
  </div>`;
  const inp = document.getElementById('ly-chat-in');
  if (inp){
    inp.focus();
    inp.addEventListener('keydown', e=>{ if(e.key === 'Enter'){ e.preventDefault(); window._vjChatEnviar(); } });
  }
  const hilo = document.getElementById('ly-chat-hilo');
  if (hilo) hilo.scrollTop = hilo.scrollHeight;
}
// Ficha completa para que el personaje entienda de qué se está hablando: quién es
// él, quién sos vos y cómo viene la partida. Sin esto la respuesta sería genérica.
function vjChatContexto(h){
  const fam = (G && G.familia) || {};
  const nombres = a => (a||[]).map(x => x.nombre + ' (' + (x.edad||0) + ')').join(', ');
  const etapa = VJ.mundo === 'potrero' ? 'todavía es un pibe en el potrero'
    : VJ.mundo === 'juveniles' ? 'está en las juveniles, peleando por debutar'
    : VJ.mundo === 'vida' ? ('ya se retiró y ahora es ' + ((VIDA_ROLES[G && G.vidaRol] || {}).n || 'otra cosa').toLowerCase())
    : 'está en plena carrera profesional';
  const lugar = (vjEscena() || {}).n || '';
  return {
    nombre: h.nombre || vjNombreNPC(h.semilla, vjGen(h)),
    rol: h.rol || 'un conocido',
    edadNPC: h.edad || null,
    relacion: h.rol || '',
    apellido: (G && G.apellido) || (_draft && _draft.apellido) || '',
    edad: vjEdad(),
    etapa, lugar,
    anio: (G && G.anio) || 2026,
    era: (typeof epocaEtiqueta === 'function' ? epocaEtiqueta((G && G.anio) || 2026) : ''),
    club: (G && (VJ.mundo === 'vida' ? (G.gestion && G.gestion.club) : G.club)) || null,
    liga: (G && G.liga) || null,
    nivel: G ? Math.round(G.nivel || 0) : null,
    titulos: G ? (G.titulos || 0) : null,
    moral: G ? Math.round(G.moral || 0) : null,
    dinero: G ? eur(G.dinero || 0) : null,
    pareja: fam.pareja || null,
    hijos: nombres(fam.hijos) || null,
    nietos: nombres(fam.nietos) || null
  };
}
window._vjChatEnviar = function(){
  const inp = document.getElementById('ly-chat-in');
  const txt = inp ? String(inp.value||'').trim() : '';
  if(!txt) return;
  const h = VJ._chatCon; if(!h) return;
  VJ._chatHilo.push({ yo:true, t:txt });
  const semilla = h.semilla || h.obj || 'x';
  const rol = h.rol || 'vecino';
  const nombreNPC = h.nombre || '';
  const responder = (r)=>{
    // Se saca el "pensando..." si estaba, y se agrega la respuesta.
    if (VJ._chatHilo.length && VJ._chatHilo[VJ._chatHilo.length-1].pensando) VJ._chatHilo.pop();
    VJ._chatHilo.push({ yo:false, t:r });
    if(G) save();
    vjPintarChat();
  };
  const local = ()=> responder(npcResponder(txt, rol, semilla, nombreNPC));

  // 1) Gancho propio, si alguien lo definió (tiene prioridad).
  if (typeof window.CANCHERO_LEYENDA_IA === 'function'){
    VJ._chatHilo.push({ yo:false, t:'...', pensando:true });
    vjPintarChat();
    Promise.resolve(window.CANCHERO_LEYENDA_IA(Object.assign({ tipo:'respuesta', dijo:txt,
      hilo: VJ._chatHilo.filter(x=>!x.pensando), mundo:VJ.mundo, escena:VJ.escena }, vjChatContexto(h))))
      .then(t=> t ? responder(String(t).slice(0,240)) : local())
      .catch(local);
    return;
  }

  // 2) EL PERSONAJE PIENSA DE VERDAD: se le manda la charla entera y la ficha de
  //    la partida a nuestro endpoint, que responde en personaje y AL TEMA.
  //    Si no hay endpoint (o no está la key, o no hay red) cae al generador local
  //    sin que el jugador note un error.
  if (window._lyChatIA !== false){
    VJ._chatHilo.push({ yo:false, t:'...', pensando:true });
    vjPintarChat();
    const ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
    const corte = setTimeout(()=>{ try{ ctrl && ctrl.abort(); }catch(e){} }, 9000);
    fetch('/api/game-judge', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      signal: ctrl ? ctrl.signal : undefined,
      body: JSON.stringify(Object.assign({ modo:'chat', hilo: VJ._chatHilo.filter(x=>!x.pensando) }, vjChatContexto(h)))
    })
    .then(r=>{
      clearTimeout(corte);
      if (r.status === 204){ vjAvisarSinIA(); return null; }   // sin IA ahora; se reintenta la proxima
      if (!r.ok) return null;
      return r.json();
    })
    .then(d=>{ if (d && d.texto) responder(d.texto); else local(); })
    .catch(()=>{ clearTimeout(corte); vjAvisarSinIA(); local(); });
    return;
  }
  local();
};
window._vjChatCerrar = function(){
  VJ._chatCon = null; VJ._chatHilo = [];
  if (VJ.mundo === 'vida') window._vidaJugable();
  else if (VJ.mundo === 'club') window._clubMundo(VJ.escena);
  else mundoRender();
};

// Charlas ambientales: no cambian el rumbo, pero el mundo tiene que tener voz.
const VJ_CHARLAS = {
  potrero: [
    'Tu viejo te mira jugar desde la vereda. No dice nada, pero no se pierde una.',
    '"Cuando yo tenía tu edad también corría atrás de la pelota. Después la vida se puso seria."',
    '"No le contés a tu madre que llegaste con las rodillas así."',
    'El del kiosco te fía un alfajor: "cuando seas famoso me lo pagás".',
    '"Los pibes de la otra cuadra dicen que les ganamos de suerte."'
  ],
  juveniles: [
    '"Al principio la pensión te parte. Después te acostumbrás, y eso también asusta un poco."',
    'Un veterano de primera te mira entrenar y no dice nada. Al irse te tira: "no aflojes con la zurda".',
    '"El técnico te está mirando más de lo que pensás. No lo arruines haciéndote el vivo."',
    '"Acá suben dos por año, y este año somos veinte."',
    '"Llamá a tu vieja, en serio. Los que no llaman se quiebran a los tres meses."'
  ],
  club: [
    '"Con vos en el equipo la gente viene con otra cara, pibe."',
    'El capitán te palmea la espalda: "cuando te silben, jugá igual. Se les pasa."',
    '"Mi hijo tiene tu camiseta. Se la puso hasta para dormir."',
    '"En este club te bancan mientras corras. El día que no corras, andate."',
    '"El de la tribuna de arriba te putea todos los domingos y después te pide una foto."'
  ]
};
// Generador local: arma la frase combinando arranque + tema + cierre, con datos
// reales de tu partida. Sin llamadas de red y sin repetirse.
const HABLA = {
  arranque:['Che,','Escuchame,','Te digo una cosa:','Mirá,','Entre nosotros,','La verdad,','Nada,'],
  cierre:['¿o no?','y punto.','...en fin.','pero bueno.','así es esto.','te lo digo yo.','y no lo digo por decir.', ''],
  temas:{
    potrero:['acá el que no corre no juega','mi vieja me mata si llego tarde otra vez','en la otra cuadra dicen que nos ganan',
      'la pelota está pinchada de nuevo','el que hace el último gol se la lleva','si sigo así me van a ver'],
    juveniles:['el técnico anotó algo cuando te vio','en la pensión no se duerme, se sobrevive','este año suben dos, nada más',
      'te vi hacer eso en el entrenamiento y me quedé duro','si te lesionás ahora, adiós','llamá a tu casa, en serio'],
    club:['el domingo hay que dejar todo','la gente te tiene fe','en el vestuario se habla mucho y se dice poco',
      'el que juega tranquilo dura más','si ganamos esta, cambia el año','a vos te miran de afuera, se nota'],
    vida:['el tiempo pasó volando','todavía te recuerdan por aquel gol','uno se acostumbra a todo menos a no jugar',
      'los pibes de ahora no saben lo que era eso','hay que moverse, quedarse quieto mata']
  }
};
function vjFraseViva(cat){
  const T = HABLA.temas[cat] || HABLA.temas.vida;
  const ctx = [];
  if (G && G.club) ctx.push('en ' + G.club + ' te siguen de cerca');
  if (G && (G.titulos||0) >= 3) ctx.push('con lo que ganaste ya podés hablar de igual a igual');
  if (G && (G.moral||60) < 40) ctx.push('te veo la cara, no me digas que estás bien');
  if (G && G.familia && G.familia.pareja) ctx.push('¿cómo anda ' + G.familia.pareja + '?');
  if (G && (G.familia||{}).hijos && G.familia.hijos.length) ctx.push('el pibe está grande ya, ¿eh?');
  const pool = T.concat(ctx);
  return (pick(HABLA.arranque) + ' ' + pool[Math.floor(Math.random()*pool.length)] + ' ' + pick(HABLA.cierre)).replace(/\s+/g,' ').trim();
}
function vjCharla(h, cat){
  // Charlar es CONVERSAR: se abre el hilo y el personaje arranca hablando.
  // Antes esto tiraba una frase del banco y se terminaba ahi.
  if (h && h.tipo === 'npc'){
    vjDetener();
    VJ._chatCon = h;
    VJ._chatHilo = [{ yo:false, t: pick(VJ_CHARLAS[cat] || VJ_CHARLAS.club) }];
    vjPintarChat();
    return;
  }
  return vjCharlaFlash(h, cat);
}
function vjCharlaFlash(h, cat){
  // Mitad del repertorio escrito, mitad generado al momento: nunca dos veces igual.
  const pool = VJ_CHARLAS[cat] || VJ_CHARLAS.club;
  const quien = (h && (h.nombre || h.rol)) ? ((h.nombre || h.rol) + ': ') : '';
  if (typeof window.CANCHERO_LEYENDA_IA === 'function'){
    try {
      Promise.resolve(window.CANCHERO_LEYENDA_IA({ tipo:'charla', con:(h&&h.rol)||'alguien', mundo:VJ.mundo,
        escena:VJ.escena, edad:vjEdad(), club:(G&&G.club)||null, animo:(G&&G.moral)||60 }))
        .then(t=>{ if(t) vjFlash(quien + '"' + String(t).slice(0,140) + '"'); })
        .catch(()=> vjFlash(quien + '"' + vjFraseViva(cat) + '"'));
      return;
    } catch(e){}
  }
  const frase = Math.random() < 0.55 ? vjFraseViva(cat) : pick(pool);
  if (G) save();
  vjFlash(quien + '"' + frase + '"');
}
// Telon de fondo con el escenario actual. Las pantallas de dialogo y de
// resultado quedaban sobre negro y el personaje parecia flotar en el vacio.
function fondoEscenaHTML(){
  try{
    const W = vjEscena().ancho, H = 250;
    return `<div style="position:absolute;inset:0;overflow:hidden;pointer-events:none;">
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" style="position:absolute;inset:0;width:100%;height:100%;shape-rendering:crispEdges;">${vjFondo(W,H)}</svg>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" style="position:absolute;inset:0;width:100%;height:100%;">${vjAtmosfera(W,H,vjPisoPct())}</svg>
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,7,10,.30) 0%,rgba(5,7,10,.72) 48%,#05070a 88%);"></div>
    </div>`;
  }catch(e){ return ''; }
}
// Escenas especiales para los momentos que merecen verse, no solo leerse.
// La pareja siempre se dibuja igual y con su propio aspecto.
function vjSpritePareja(pose, embarazada, escala){
  const fam = (G && G.familia) || {};
  try { parejaAvAsegurar(); } catch(e){}   // que nunca quede sin cara propia
  const nom = fam.pareja || 'pareja';
  let h=0; for(let i=0;i<nom.length;i++) h=(h*31+nom.charCodeAt(i))>>>0;
  // El género de la pareja NO se sortea: es el que elegiste. Antes salía el hash y
  // tu mujer podía dibujarse con cuerpo y cara de hombre.
  const gen = (fam.parejaGen) || parejaGen();
  // Si la elegiste entre las tres, se dibuja con el aspecto que viste al elegir.
  if (fam.parejaAv)
    return avatarSprite(Object.assign({}, fam.parejaAv, embarazada ? { peso:1 } : {}),
      { edad: Math.max(20, ((VJ.mundo==='vida'?(G.vidaEdad||40):(G.edad||25)) - 2)),
        escala: escala||3, pose: pose||'idle', ropa:'calle', num:'', apellido:'' });
  const av = { gen, piel: AV_PIELES[h%AV_PIELES.length].id,
    pelo: gen === 'f' ? ['largo','colita','afro','rastas'][(h>>>3)%4] : ['corto','rapado','tupe','colita'][(h>>>3)%4],
    peloColor: AV_COLORES_PELO[(h>>>6)%AV_COLORES_PELO.length].id, barba: gen==='f' ? 0 : (h>>>9)%2, acc:'nada',
    calvicie:0, canas:0, cicatriz:0, peso: embarazada ? 1 : 0, tatus:0, bling:0 };
  const edad = Math.max(20, ((VJ.mundo==='vida'?(G.vidaEdad||40):(G.edad||25)) - 2));
  return avatarSprite(av, { edad, escala:escala||3, pose:pose||'idle', ropa:'calle', num:'', apellido:'' });
}
function vjEscenaEspecial(){
  if(!G || !G._momentoVisual) return '';
  const tipo = G._momentoVisual; G._momentoVisual = null;
  const fam = G.familia || {};
  const edad = (VJ.mundo === 'vida') ? (G.vidaEdad||40) : (G.edad||25);
  const yo = (pose) => avatarSprite(G.avatar, { edad, escala:3, pose, ropa:(tipo==='boda'?'traje':(vjRopa()||undefined)), num:'', apellido:'' });
  if (tipo === 'bebe'){
    // EL NACIMIENTO. Antes el bebé era un rectángulo flotando al costado, pegado
    // con posiciones absolutas a ojo. Ahora se alza EN BRAZOS (pose 'bebe', que
    // dibuja la cuna de los antebrazos) y la escena pasa en una clínica, con
    // piso, los dos parados juntos y el nombre abajo.
    const bebe = (fam.hijos||[])[(fam.hijos||[]).length-1] || {};
    const bg = genDe(bebe);
    const yoConBebe = avatarSprite(G.avatar, { edad, escala:3, pose:'bebe', bebeGen:bg,
      ropa:(vjRopa()||'calle'), num:'', apellido:'' });
    return `<div style="text-align:center;">
      ${avatarBox(`<div style="display:flex;align-items:flex-end;gap:2px;line-height:0;">
        <div style="line-height:0;">${vjSpritePareja('orgullo', false, 3)}</div>
        <div style="line-height:0;">${yoConBebe}</div>
      </div>`, '14px 20px', 'hospital')}
      ${bebe.nombre ? `<div style="margin-top:8px;font-size:13px;font-weight:900;color:#f9a8d4;">
        ${esc(bebe.nombre)} · ${bg === 'f' ? 'tu hija' : 'tu hijo'}</div>` : ''}
    </div>`;
  }
  if (tipo === 'boda'){
    return avatarBox(`<div style="display:flex;align-items:flex-end;gap:2px;line-height:0;">
      <div style="line-height:0;">${yo('orgullo')}</div>
      <div style="line-height:0;">${vjSpritePareja('orgullo', false, 3)}</div>
    </div>`, '14px 20px', 'estadio');
  }
  return '';
}
// El consejo de tu representante, según quién sea y cómo venís.
function vjConsejoRepre(){
  const r = repreDeG();
  if(!r){ vjDetener(); window._elegirRepre('primero'); return; }
  const propios = [];
  if ((G.dinero||0) > 300000) propios.push('Tenés plata parada. Comprate algo que rinda, no un auto más.');
  if ((G.edad||20) >= 30) propios.push('Empezá a pensar en el después: a los 34 el teléfono suena menos.');
  if ((G.moral||60) < 40) propios.push('Te veo mal. Arreglá lo de afuera y lo de adentro se acomoda solo.');
  if (G.flags && G.flags.barreraIdioma) propios.push('Aprendé el idioma ya. Sin eso no vas a jugar, por más que corras.');
  if ((G.nivel||0) >= 85 && ligaNivel(G.liga||'') < 14) propios.push('Estás para una liga grande. No te duermas.');
  vjFlash(r.n + ': "' + pick(propios.length ? propios.concat(r.consejos) : r.consejos) + '"');
}
// Si la IA no contesta, se avisa UNA vez por sesión en vez de fingir que las
// respuestas enlatadas son del personaje. Antes se apagaba la IA para siempre
// ante un solo fallo y no había manera de darse cuenta.
// Salir no puede ser un toque en falso: antes la X te sacaba de una. Ahora
// pregunta, y el cartel es chico y se cierra tocando al lado.
window._lyConfirmarSalida = function(){
  if (document.getElementById('ly-salir')) return;
  const d = document.createElement('div');
  d.id = 'ly-salir';
  d.style.cssText = 'position:fixed;inset:0;z-index:100080;background:rgba(3,5,3,.72);display:flex;align-items:center;justify-content:center;padding:20px;';
  d.innerHTML = '<div style="max-width:330px;width:100%;background:#0d120b;border:1.5px solid #2a3222;border-radius:18px;padding:20px;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.65);">'
    + '<div style="font-family:Outfit,sans-serif;font-weight:900;font-size:18px;color:#fff;margin-bottom:7px;">¿Salís del juego?</div>'
    + '<div style="font-size:12.5px;color:#9aa48f;line-height:1.55;margin-bottom:16px;">Tu carrera queda guardada. Podés volver cuando quieras.</div>'
    + '<div style="display:flex;gap:9px;">'
    + '<button id="ly-salir-no" style="flex:1;background:rgba(255,255,255,.06);border:1px solid #2a3222;color:#cfd8c6;border-radius:12px;padding:13px;font-weight:900;font-size:13.5px;cursor:pointer;">Seguir jugando</button>'
    + '<button id="ly-salir-si" style="flex:1;background:' + A + ';border:0;color:#0a0d07;border-radius:12px;padding:13px;font-weight:900;font-size:13.5px;cursor:pointer;">Salir</button>'
    + '</div></div>';
  document.body.appendChild(d);
  const cerrar = ()=> d.remove();
  d.addEventListener('click', e=>{ if (e.target === d) cerrar(); });
  d.querySelector('#ly-salir-no').onclick = cerrar;
  d.querySelector('#ly-salir-si').onclick = function(){ cerrar(); window._carreraSalir(); };
};
function vjAvisarSinIA(){
  if (window._lyAvisoIA) return;
  window._lyAvisoIA = true;
  try { vjFlash('La IA de los diálogos no respondió. Van respuestas propias del personaje hasta que vuelva.'); } catch(e){}
  try { console.warn('[leyenda] /api/game-judge no devolvió texto: ¿falta la API key en el servidor?'); } catch(e){}
}
// Aviso breve sin sacarte del mundo.
function vjFlash(txt){
  const view = document.getElementById('vj-view'); if(!view) return;
  let f = document.getElementById('vj-flash'); if(f) f.remove();
  f = document.createElement('div'); f.id = 'vj-flash';
  f.style.cssText = 'position:absolute;left:50%;top:14px;transform:translateX(-50%);max-width:86%;background:rgba(5,7,10,.92);border:1px solid #2a3a4c;color:#dbe3ee;border-radius:12px;padding:9px 14px;font-size:12.5px;font-weight:700;line-height:1.45;text-align:center;z-index:8;';
  f.textContent = txt;
  view.appendChild(f);
  setTimeout(()=>{ f.style.transition='opacity .4s'; f.style.opacity='0'; setTimeout(()=>f.remove(), 420); }, 2600);
}
// ── ACTIVIDADES CON DURACION ────────────────────────────────────────────────
// Mirar tele, entrenar, laburar, ir al kiosco: antes eran un cambio de numero y
// un cartelito, y se sentian como que "duraban un segundo". Ahora ocupan un rato
// real: se ve al personaje en la accion, con una barra que corre, y recien
// despues se aplica el efecto. Es lo que hace que la accion se SIENTA.
function vjActividad(cfg){
  const view = document.getElementById('vj-view');
  const fin = ()=>{ try { cfg.onDone && cfg.onDone(); } catch(e){} };
  if (!view){ fin(); return; }
  if (VJ._act) return;                 // no encimar dos actividades
  VJ._act = true;
  const dur = cfg.dur || 2800;
  const col = cfg.color || '#baff00';
  const cap = document.createElement('div');
  cap.id = 'vj-actividad';
  cap.style.cssText = 'position:absolute;inset:0;z-index:9;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:26px;background:linear-gradient(180deg,rgba(3,5,8,.05) 0%,rgba(3,5,8,.55) 100%);pointer-events:auto;';
  cap.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;max-width:88%;">
      <div style="width:62px;height:62px;border-radius:50%;background:rgba(5,8,4,.82);border:2px solid ${col}66;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 22px rgba(0,0,0,.55);">
        <i class='bx ${cfg.icono || 'bx-time-five'}' style="font-size:30px;color:${col};animation:vjActPulso 1.1s ease-in-out infinite;"></i>
      </div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:15px;color:#fff;text-align:center;line-height:1.25;">${esc(cfg.titulo || 'Un rato...')}</div>
      <div style="width:190px;height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden;">
        <div id="vj-act-barra" style="height:100%;width:0%;background:${col};border-radius:3px;transition:width ${dur}ms linear;"></div>
      </div>
    </div>
    <style>@keyframes vjActPulso{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.14);opacity:1}}</style>`;
  view.appendChild(cap);
  requestAnimationFrame(()=>{ const b = document.getElementById('vj-act-barra'); if(b) b.style.width = '100%'; });
  setTimeout(()=>{
    cap.style.transition = 'opacity .3s'; cap.style.opacity = '0';
    setTimeout(()=>{ cap.remove(); VJ._act = false; fin(); }, 310);
  }, dur);
}
// Diálogo con el personaje que tenés enfrente: se ve QUIÉN te habla.
function vjDialogo(ev, tipo, quien, h){
  vjDetener();
  const R = VIDA_ROLES[G.vidaRol] || VIDA_ROLES.disfrutar;
  // El dialogo pasa EN el lugar donde estas, no sobre una pantalla negra.
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="min-height:100%;background:#05070a;display:flex;flex-direction:column;justify-content:flex-end;position:relative;">
    ${fondoEscenaHTML()}
    <div style="position:relative;max-width:640px;margin:0 auto;width:100%;padding:20px 18px calc(24px + env(safe-area-inset-bottom));box-sizing:border-box;">
      <div style="display:flex;align-items:flex-end;justify-content:center;gap:6px;margin-bottom:14px;">
        ${(function(){
          // QUIÉN te habla lo decide el EVENTO, no el objeto que tocaste. Si el
          // texto dice "un nene te espera", tiene que verse un nene — antes salía
          // el vecino de 46 con barba porque el retrato lo ponía el hotspot.
          const N = (ev && ev.npc) || null;
          if (N) return `<div style="line-height:0;">${vjSpriteNPC(N.semilla || ('ev'+ev.t), N.ropa || 'calle', N.edad || 40, 'pensando', N.gen)}</div>`;
          // Tu pareja se dibuja SIEMPRE por su propia vía. Sin esto, caminando por
          // la casa se veía la que elegiste, pero al hablarle el retrato salía del
          // hash: era otra mujer, y encima cambiaba de una charla a otra.
          if (h && h._pareja) return `<div style="line-height:0;">${vjSpritePareja('pensando', false, 2.2)}</div>`;
          if (h && h.tipo==='npc') return `<div style="line-height:0;">${vjSpriteNPC(h.semilla, h.ropa, h.edad, 'pensando', vjGen(h), h.av)}</div>`;
          return `<div style="line-height:0;">${vjObjSVG(h?h.obj:'cartel')}</div>`;
        })()}
        <div style="line-height:0;transform:scaleX(-1);">${vjSpriteJugador('pensando')}</div>
      </div>
      <div style="background:linear-gradient(160deg,${R.color}14,rgba(10,13,8,.75));border:1.5px solid ${R.color}55;border-radius:18px;padding:16px;">
        <div style="font-size:10px;font-weight:900;letter-spacing:1.5px;color:${R.color};margin-bottom:7px;">${esc(String(quien||'').toUpperCase())}</div>
        <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:18px;color:#fff;margin-bottom:7px;line-height:1.2;">${esc(ev.t)}</div>
        <div style="font-size:13.5px;color:#c4ccc0;line-height:1.6;margin-bottom:14px;">${esc(ev.d)}</div>
        <div style="display:flex;flex-direction:column;gap:9px;">
          ${ev.opts.map((o,i)=>`<button onclick="window._vjResolver('${tipo}',${i})" style="background:${i===0?R.color+'18':'rgba(255,255,255,.04)'};border:1.5px solid ${i===0?R.color+'66':'#242a20'};color:${i===0?R.color:'#e0e4dc'};border-radius:12px;padding:13px 14px;font-weight:800;font-size:13.5px;text-align:left;cursor:pointer;line-height:1.35;">${esc(o.txt)}</button>`).join('')}
        </div>
        <button onclick="window._vidaJugable()" style="width:100%;margin-top:10px;background:transparent;border:none;color:#5d6879;font-size:12px;font-weight:800;cursor:pointer;padding:8px;">Dejarlo para después</button>
      </div>
    </div>
  </div>`;
}
window._vjResolver = function(tipo, i){
  // El mismo resolutor sirve para la carrera y para la segunda vida. Lo que cambia
  // es a dónde se vuelve y qué se muestra: como jugador, lo personal además se
  // contagia a la moral y al nivel.
  const enCarrera = VJ.mundo !== 'vida';
  const s = enCarrera ? personalAsegurar() : G.vidaStats;
  const antes = JSON.parse(JSON.stringify(s));
  const dineroAntes = G.dinero || 0;
  const moralAntes = G.moral || 0, nivelAntes = G.nivel || 0;
  let res = '', ev = null;
  if (tipo === 'rol'){
    const picked = G._vidaEv; if(!picked){ window._vidaJugable(); return; }
    ev = picked.ev;
    res = ev.opts[i].ef(s, G) || '';
    (G._vidaSeen = G._vidaSeen || []).push(picked.idx);
    (G._vjHechos = G._vjHechos || {}).lapso = true;
  } else {
    const suc = G._vjSuc; if(!suc){ enCarrera ? window._clubMundo(VJ.escena) : window._vidaJugable(); return; }
    ev = suc.ev;
    res = ev.opts[i].ef(s, G) || '';
    (G._vjSucVistos = G._vjSucVistos || []).push(suc.clave);
    if (enCarrera) G._sucHechos = (G._sucHechos || 0) + 1;
    else { const hechos = G._vjHechos = G._vjHechos || {}; hechos.sucesos = (hechos.sucesos || 0) + 1; }
  }
  Object.keys(s).forEach(k=>{ s[k] = clamp(s[k], 0, 100); });
  G.dinero = Math.max(0, G.dinero || 0);
  G.moral = clamp(G.moral || 0, 0, 100);
  G.nivel = clamp(G.nivel || 0, 30, 99);
  G.fama = clamp(G.fama || 0, 0, 100);
  // Puente vida → fútbol: la felicidad, la soledad y la salud mueven moral y nivel.
  const puente = enCarrera ? personalPuente(antes) : { moral:0, nivel:0 };
  if(!G.vidaHist) G.vidaHist = [];
  const etiqueta = enCarrera ? ((G.edad||0) + ' años') : ((VIDA_LAPSOS[G.vidaLapso] || VIDA_LAPSOS[VIDA_LAPSOS.length-1]).lbl);
  G.vidaHist.push({ lapso:etiqueta, t:ev.t, res, rol:G.vidaRol || 'jugador' });
  if (enCarrera){ if(!G.hist) G.hist = []; G.hist.push({ t:ev.t, res }); }
  save();

  // Chips: en la carrera se muestran las barras personales + lo que movió en el juego.
  const PERSONALES = [['FELICIDAD','felicidad'],['FAMILIA','familia'],['SOLEDAD','soledad',true],['SALUD','salud']];
  let chips = '';
  if (enCarrera){
    chips = PERSONALES.map(b=>{
      const d = Math.round((s[b[1]]||0) - (antes[b[1]]||0));
      if(!d) return '';
      const bueno = b[2] ? d < 0 : d > 0;
      const col = bueno ? '#4ade80' : '#ff6b6b';
      return `<span style="display:inline-flex;align-items:center;gap:3px;background:${col}18;border:1px solid ${col}55;color:${col};border-radius:8px;padding:3px 9px;font-size:11px;font-weight:800;"><i class='bx bx-${d>0?'up':'down'}-arrow-alt'></i>${b[0]} ${d>0?'+':''}${d}</span>`;
    }).filter(Boolean).join('');
    chips += deltaChip('Moral', Math.round((G.moral||0) - moralAntes));
    chips += deltaChip('Nivel', Math.round((G.nivel||0) - nivelAntes));
    chips += deltaChip('$', Math.round((G.dinero||0) - dineroAntes), true);
  } else {
    const R0 = VIDA_ROLES[G.vidaRol] || VIDA_ROLES.disfrutar;
    chips = R0.barras.map(b=>{
      const d = Math.round((s[b[1]]||0) - (antes[b[1]]||0));
      if(!d) return '';
      const bueno = b[3] ? d < 0 : d > 0;
      const col = bueno ? '#4ade80' : '#ff6b6b';
      return `<span style="display:inline-flex;align-items:center;gap:3px;background:${col}18;border:1px solid ${col}55;color:${col};border-radius:8px;padding:3px 9px;font-size:11px;font-weight:800;"><i class='bx bx-${d>0?'up':'down'}-arrow-alt'></i>${b[0]} ${d>0?'+':''}${d}</span>`;
    }).filter(Boolean).join('') + deltaChip('$', Math.round((G.dinero||0) - dineroAntes), true);
  }

  const pose = _poseReaccion(res, { nivel:puente.nivel, moral:Math.round((s.felicidad||50)-(antes.felicidad||50)), fama:0, dinero:Math.round((G.dinero||0)-dineroAntes) });
  const edadR = enCarrera ? (G.edad || 20) : (G.vidaEdad || 40);
  const color = enCarrera ? A : ((VIDA_ROLES[G.vidaRol] || VIDA_ROLES.disfrutar).color);
  const volver = enCarrera ? `window._clubMundo('${VJ.escena === 'pension' ? 'casa' : VJ.escena}')` : 'window._vidaJugable()';
  const volverJuv = (VJ.mundo === 'juveniles');
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="min-height:100%;background:#05070a;display:flex;flex-direction:column;justify-content:center;position:relative;">
    ${fondoEscenaHTML()}
    <div style="position:relative;max-width:560px;margin:0 auto;width:100%;padding:24px 20px calc(24px + env(safe-area-inset-bottom));box-sizing:border-box;text-align:center;">
      <div style="display:flex;justify-content:center;margin-bottom:14px;">${
        (G._momentoVisual ? vjEscenaEspecial()
                          : avatarBox(avatarSprite(G.avatar,{ edad:edadR, escala:2.8, pose, ropa:vjRopa()||undefined, num:'', apellido:'' }), '12px 18px', escenaDePose(pose, G.avatar, edadR)))
      }</div>
      <div style="font-size:15px;color:#fff;font-weight:700;line-height:1.6;margin-bottom:14px;">${esc(res)}</div>
      ${chips?`<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:18px;">${chips}</div>`:'<div style="margin-bottom:18px;"></div>'}
      ${G._pedirNombreHijo ? vjElegirNombreHTML() : `
      <button onclick="${(G && G._elegirPareja) ? 'window._vjElegirPareja()' : (volverJuv ? "window._juvenilesMundo()" : volver)}" style="background:linear-gradient(135deg,${_avShade(color,-70)},${color});color:#05070a;border:none;border-radius:13px;padding:14px 30px;font-family:Outfit,sans-serif;font-weight:900;font-size:14.5px;cursor:pointer;">VOLVER <i class='bx bx-right-arrow-alt'></i></button>`}
    </div>
  </div>`;
};

// ── PONERLE NOMBRE AL HIJO ───────────────────────────────────────────────────
// El nombre lo ELEGÍS VOS: sugerencias del género que le tocó, o lo escribís.
function vjElegirNombreHTML(){
  const fam = (G && G.familia) || {};
  const ultimo = (fam.hijos||[])[(fam.hijos||[]).length-1] || {};
  const gen = ultimo.gen || 'm';
  const opciones = shuffle((gen === 'f' ? NOMBRES_F : NOMBRES_M).slice()).slice(0,6);
  const quien = gen === 'f' ? 'Es nena' : 'Es varón';
  return `
  <div style="background:rgba(244,114,182,.08);border:1.5px solid rgba(244,114,182,.35);border-radius:16px;padding:14px;margin-top:4px;">
    <div style="font-size:10px;font-weight:900;letter-spacing:2px;color:#f9a8d4;margin-bottom:4px;">${quien.toUpperCase()} · ¿CÓMO LE PONÉS?</div>
    <div style="font-size:12.5px;color:#c4ccc0;margin-bottom:11px;">El nombre queda para toda la partida.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
      ${opciones.map(n=>`<button onclick="window._nombrarHijo('${n}')" style="background:rgba(255,255,255,.05);border:1.5px solid #3a2a34;color:#fff;border-radius:11px;padding:11px 6px;font-weight:800;font-size:13px;cursor:pointer;">${n}</button>`).join('')}
    </div>
    <div style="display:flex;gap:8px;margin-top:9px;">
      <input id="ly-nombre-hijo" maxlength="14" placeholder="Escribí el nombre..." style="flex:1;min-width:0;background:rgba(255,255,255,.04);border:1px solid #3a2a34;color:#fff;border-radius:11px;padding:11px;font-size:13px;font-weight:700;font-family:inherit;">
      <button onclick="window._nombrarHijo((document.getElementById('ly-nombre-hijo')||{}).value)" style="background:rgba(244,114,182,.18);border:1px solid rgba(244,114,182,.5);color:#f9a8d4;border-radius:11px;padding:11px 15px;font-weight:900;font-size:12.5px;cursor:pointer;">PONER</button>
    </div>
  </div>`;
}
window._nombrarHijo = function(nombre){
  if(!G) return;
  nombre = String(nombre||'').trim().slice(0,14);
  if (!nombre) return;
  const fam = G.familia = G.familia || {};
  const hijos = fam.hijos = fam.hijos || [];
  if (hijos.length) hijos[hijos.length-1].nombre = nombre;
  else hijos.push(nacePersona(null, { nombre }));
  // Si el nombre escrito es claramente de mujer/hombre, manda el nombre.
  hijos[hijos.length-1].gen = generoDe(nombre);
  // La edad del padre al nacer: sirve despues para los nietos.
  hijos[hijos.length-1].nacioConPadreDe = (VJ.mundo === 'vida') ? (G.vidaEdad||40) : (G.edad||25);
  G._pedirNombreHijo = false;
  save();
  if (VJ.mundo === 'vida') window._vidaJugable();
  else window._clubMundo(VJ.escena === 'pension' ? 'casa' : VJ.escena);
};
// ── GESTIÓN DEL ROL: lo que de verdad hacés en tu segunda vida ───────────────
window._vjGestion = function(){
  if(!G) return;
  const ar = asuntoDeRol(); if(!ar){ window._vidaJugable(); return; }
  const g = gestionAsegurar(), rol = G.vidaRol;
  const R = VIDA_ROLES[rol] || VIDA_ROLES.disfrutar;
  let titulo = ar.txt, texto = '', ops = [];
  if (ar.id === 'club'){
    const cand = clubesParaDirigir();
    texto = (g.anios>0 ? 'Otra vez sin equipo. ' : 'Estás sin equipo. ') + (rol==='dt' ? 'Estos proyectos te llamaron.' : 'Estas puertas se abrieron.');
    ops = cand.map((c,i)=>({ txt: c.name + ' — ' + c.liga + ' (nivel ' + c.str + ')', dato:i }));
    if (rol === 'dt' && (g.titulos||0) >= 2 && !g.esSeleccion)
      ops.push({ txt:'Dirigir a la selección de ' + esc(G.pais), dato:'seleccion' });
    ops.push({ txt:'Esperar algo mejor', dato:-1 });
    if ((G.vidaEdad||40) >= 60) ops.push({ txt:'Colgar el buzo: me retiro de esto', dato:'retiro' });
  } else if (ar.id === 'crisis'){
    texto = 'La dirigencia de ' + esc(g.club) + ' se juntó a hablar de vos. Los resultados no acompañan y la presión está al límite.';
    ops = [{ txt:'Pararme firme y pedir refuerzos', dato:'firme' },
           { txt:'Bajar el perfil y aguantar', dato:'aguantar' },
           { txt:'Renunciar antes de que me echen', dato:'renuncio' }];
  } else {
    // ASUNTO DE LA AGENDA: cada tramo trae uno distinto, con su propio texto y sus
    // propias opciones. Se acabo el "reforza el plantel" todos los tramos.
    const A_ = agendaDeRol();
    if (A_){
      titulo = A_.titulo || A_.txt;
      texto  = typeof A_.texto === 'function' ? A_.texto(g, G) : (A_.texto || '');
      ops    = A_.opts.map((o,i)=>({ txt:o.txt, dato:i }));
      G._agendaActual = A_.id;
    } else {
      titulo = 'Un tramo tranquilo';
      texto  = 'No hay nada urgente sobre la mesa. A veces la vida también es esto.';
      ops    = [{ txt:'Aprovechar y ocuparme de lo mío', dato:0 }];
    }
  }
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="min-height:100%;background:#05070a;display:flex;flex-direction:column;justify-content:flex-end;position:relative;">
    ${fondoEscenaHTML()}
    <div style="position:relative;max-width:640px;margin:0 auto;width:100%;padding:20px 18px calc(24px + env(safe-area-inset-bottom));box-sizing:border-box;">
      <div style="display:flex;align-items:flex-end;justify-content:center;gap:4px;margin-bottom:14px;">
        <div style="line-height:0;">${vjSpriteNPC('jefe'+rol,'traje',58,'pensando')}</div>
        <div style="line-height:0;transform:scaleX(-1);">${vjSpriteJugador('pensando')}</div>
      </div>
      <div style="background:linear-gradient(160deg,${R.color}14,rgba(10,13,8,.75));border:1.5px solid ${R.color}55;border-radius:18px;padding:16px;">
        <div style="font-size:10px;font-weight:900;letter-spacing:1.5px;color:${R.color};margin-bottom:6px;">${esc(R.n.toUpperCase())}${g.club?(' · '+esc(g.club)):''}</div>
        <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:19px;color:#fff;margin-bottom:7px;line-height:1.2;">${esc(titulo)}</div>
        <div style="font-size:13.5px;color:#c4ccc0;line-height:1.6;margin-bottom:14px;">${texto}</div>
        <div style="display:flex;flex-direction:column;gap:9px;">
          ${ops.map((o,i)=>`<button onclick="window._vjGestionElegir('${ar.id}',${JSON.stringify(o.dato).replace(/"/g,'&quot;')},${i})" style="background:${i===0?R.color+'18':'rgba(255,255,255,.04)'};border:1.5px solid ${i===0?R.color+'66':'#242a20'};color:${i===0?R.color:'#e0e4dc'};border-radius:12px;padding:13px 14px;font-weight:800;font-size:13.5px;text-align:left;cursor:pointer;line-height:1.35;">${esc(o.txt)}</button>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
  G._gestCand = (ar.id === 'club') ? clubesParaDirigir.__ultima : null;
};
window._vjGestionElegir = function(tipo, dato, idx){
  const g = gestionAsegurar(), s = G.vidaStats || {}, rol = G.vidaRol;
  let res = '';
  if (tipo === 'club'){
    if (dato === 'retiro'){
      G.vidaRol = 'disfrutar'; G.vidaStats = vidaInit('disfrutar'); G.gestion = null;
      res = 'Colgaste el buzo. Se terminó el oficio y arranca otra cosa.';
      (G._vjHechos = G._vjHechos||{}).lapso = true;
    } else if (dato === 'seleccion'){
      g.club = 'Selección de ' + (G.pais||'Uruguay'); g.str = 80; g.liga = 'Selección'; g.pais = G.pais;
      g.esSeleccion = true; g.sinTrabajo = false; g.anios = 0;
      s.presion = clamp((s.presion||45) + 20, 0, 100);
      res = 'Vas a dirigir a tu país. Traje, escudo en el pecho y un país entero mirándote.';
    } else if (dato === -1){
      g.sinTrabajo = true; s.felicidad = clamp((s.felicidad||50) - 6, 0, 100);
      res = 'Dijiste que no. El teléfono puede tardar en volver a sonar.';
      (G._vjHechos = G._vjHechos||{}).lapso = true;
    } else {
      const cand = clubesParaDirigir();
      const c = cand[idx] || cand[0];
      if (c){ g.club=c.name; g.str=c.str; g.liga=c.liga; g.pais=c.pais; g.anios=0; g.sinTrabajo=false; }
      s.presion = clamp((s.presion||45) + 10, 0, 100);
      s.resultados = clamp((s.resultados||45), 0, 100);
      res = 'Firmaste en ' + esc(g.club) + '. Presentación, foto con la camiseta y a laburar.';
    }
  } else if (tipo === 'crisis'){
    if (dato === 'firme'){
      const ok = Math.random() < 0.45;
      if (ok){ s.presion = clamp((s.presion||70) - 22, 0, 100); s.resultados = clamp((s.resultados||30) + 14, 0, 100); res = 'Te bancaron. Llegaron dos refuerzos y el equipo reaccionó.'; }
      else { g.sinTrabajo = true; s.presion = clamp((s.presion||70) - 30, 0, 100); res = 'Te echaron esa misma semana. Así es esto.'; }
    } else if (dato === 'aguantar'){
      const ok = Math.random() < 0.55;
      if (ok){ s.presion = clamp((s.presion||70) - 12, 0, 100); res = 'Bajaste el perfil, ganaste dos seguidos y se calmó todo.'; }
      else { g.sinTrabajo = true; res = 'No alcanzó. Te agradecieron los servicios el lunes.'; }
    } else {
      g.sinTrabajo = true; s.presion = clamp((s.presion||70) - 35, 0, 100); s.felicidad = clamp((s.felicidad||50) + 6, 0, 100);
      res = 'Renunciaste vos. Te fuiste con la frente alta y sin indemnización.';
    }
    (G._vjHechos = G._vjHechos||{}).lapso = true;
  } else {
    // El efecto lo define la propia opcion del asunto: mueve barras, cambia de
    // club, gana titulos, te hace presidente o te funde. Nada generico.
    const pool = GESTION_AGENDA[rol] || GESTION_AGENDA.disfrutar;
    const A_ = pool.find(a => a.id === G._agendaActual);
    if (A_ && A_.opts[idx]){
      res = A_.opts[idx].ef(g, s, G) || 'Quedó decidido.';
      (G._agendaHecha = G._agendaHecha || []).push(A_.id);
      G._agendaUltima = A_.id;
    } else {
      s.salud = clamp((s.salud||70) + 6, 0, 100);
      res = 'Un tramo sin sobresaltos. No siempre pasa algo, y eso también se agradece.';
    }
    G._agendaActual = null;
    (G._vjHechos = G._vjHechos||{}).fichaje = true;
  }
  g.anios = (g.anios||0) + 5;
  Object.keys(s).forEach(k=>{ s[k] = clamp(s[k], 0, 100); });
  if(!G.vidaHist) G.vidaHist = [];
  G.vidaHist.push({ lapso:(VIDA_LAPSOS[G.vidaLapso]||{}).lbl, t:'Gestión', res, rol });
  save();
  const R = VIDA_ROLES[rol] || VIDA_ROLES.disfrutar;
  const pose = /echaron|renunci|no funcion|no alcanz/i.test(res) ? 'bajon' : /levantando|barbaro|bárbaro/i.test(res) ? 'festejo' : 'orgullo';
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="min-height:100%;background:#05070a;display:flex;flex-direction:column;justify-content:center;position:relative;">
    ${fondoEscenaHTML()}
    <div style="position:relative;max-width:560px;margin:0 auto;width:100%;padding:24px 20px calc(24px + env(safe-area-inset-bottom));box-sizing:border-box;text-align:center;">
      <div style="display:flex;justify-content:center;margin-bottom:14px;">${avatarBox(avatarSprite(G.avatar,{ edad:G.vidaEdad||40, escala:2.8, pose, ropa:vjRopa()||undefined, num:'', apellido:'' }), '12px 18px', escenaDePose(pose, G.avatar, G.vidaEdad||40))}</div>
      <div style="font-size:15px;color:#fff;font-weight:700;line-height:1.6;margin-bottom:18px;">${esc(res)}</div>
      <button onclick="window._vidaJugable()" style="background:linear-gradient(135deg,${_avShade(R.color,-70)},${R.color});color:#05070a;border:none;border-radius:13px;padding:14px 30px;font-weight:900;font-size:14.5px;cursor:pointer;">VOLVER <i class='bx bx-right-arrow-alt'></i></button>
    </div>
  </div>`;
};

// ══════════════════════════════════════════════════════════════════════════════
// EL LEGADO, SIEMPRE A LA VISTA
// Si venís de una generación anterior, el juego te lo recuerda en cada pantalla
// del mundo: cuánto te falta para superar al abuelo (nivel y títulos). Cuando lo
// superás, te lo festeja una vez y el listón pasa a ser TUYO para el que venga
// después. Así la cadena no se corta nunca: hijo, nieto, bisnieto.
// ══════════════════════════════════════════════════════════════════════════════
function legadoEstado(){
  const L = G && G.legado; if(!L) return null;
  const nivel = Math.round(G.nivelMax || G.nivel || 0);
  const tit = G.titulos || 0;
  const techoN = L.techoNivel || L.nivelMax || 0;
  const techoT = L.techoTitulos != null ? L.techoTitulos : (L.titulos || 0);
  const superado = nivel > techoN && tit >= techoT;
  return { L, nivel, tit, techoN, techoT, superado,
    quien: L.techoNombre || L.padre || 'tu familia',
    parentesco: L.parentesco || 'padre', gen: L.gen || 2 };
}
// El chip del legado se veia como un renglon apretado e ilegible. Ahora es una
// tarjeta con jerarquia: titulo arriba, y las dos metas con barra de progreso.
function legadoChipHTML(){
  const E = legadoEstado(); if(!E) return '';
  const col = E.superado ? A : '#facc15';
  const bg  = E.superado ? 'rgba(186,255,0,.10)' : 'rgba(250,204,21,.08)';
  const metaN = E.techoN + 1, metaT = Math.max(1, E.techoT);
  const pN = clamp(Math.round((E.nivel / Math.max(1, metaN)) * 100), 0, 100);
  const pT = clamp(Math.round((E.tit / metaT) * 100), 0, 100);
  const barra = (lbl, val, meta, pct) => `
    <div style="flex:1;min-width:0;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:6px;margin-bottom:4px;">
        <span style="font-size:8.5px;font-weight:900;letter-spacing:1.2px;color:#8b9480;">${lbl}</span>
        <span style="font-size:11px;font-weight:900;color:${col};white-space:nowrap;">${val}<span style="color:#6b7362;font-size:9.5px;">/${meta}</span></span>
      </div>
      <div style="height:4px;border-radius:2px;background:rgba(255,255,255,.09);overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${col};border-radius:2px;"></div>
      </div>
    </div>`;
  if (E.superado){
    return `<div style="background:${bg};border:1px solid ${col}88;border-radius:14px;padding:11px 13px;">
      <div style="display:flex;align-items:center;gap:7px;">
        <i class='bx bx-crown' style="font-size:17px;color:${col};flex-shrink:0;"></i>
        <div style="min-width:0;">
          <div style="font-size:8.5px;font-weight:900;letter-spacing:1.4px;color:${col};">GENERACIÓN ${E.gen}</div>
          <div style="font-size:12.5px;font-weight:900;color:#fff;line-height:1.3;margin-top:2px;">Superaste a ${esc(E.quien)}. El apellido ya es tuyo.</div>
        </div>
      </div>
    </div>`;
  }
  return `<div style="background:${bg};border:1px solid ${col}55;border-radius:14px;padding:11px 13px;">
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:9px;">
      <i class='bx bx-medal' style="font-size:16px;color:${col};flex-shrink:0;"></i>
      <div style="font-size:11.5px;font-weight:900;color:#e6ecdf;line-height:1.3;">Superar a <span style="color:${col};">${esc(E.quien)}</span></div>
    </div>
    <div style="display:flex;gap:14px;">
      ${barra('NIVEL', E.nivel, metaN, pN)}
      ${barra('TÍTULOS', E.tit, metaT, pT)}
    </div>
  </div>`;
}
// Se chequea al cerrar cada temporada: si superaste al ancestro, se avisa UNA vez.
function legadoChequear(){
  const E = legadoEstado(); if(!E || !G) return;
  if (E.superado && !G._legadoSuperado){
    G._legadoSuperado = true;
    // El nuevo techo para la generación que venga sos vos.
    G.legado.techoNivel = E.nivel;
    G.legado.techoTitulos = E.tit;
    G.legado.techoNombre = G.apellido;
    save();
    try { vjFlash('SUPERASTE A TU ' + String(E.parentesco).toUpperCase() + '. A partir de acá el apellido es tuyo.'); } catch(e){}
  }
}

// ── EL LEGADO: empezar de nuevo, siendo tu hijo ──────────────────────────────
// Quién puede tomar la posta. A los 40 años ya nadie empieza una carrera: si tus
// hijos son grandes, sigue un NIETO, y despues un bisnieto. El legado no se corta.
function legadoCandidatos(){
  const fam = (G && G.familia) || {};
  // Un heredero solo puede EMPEZAR de niño: si ya es grande, se saltea a la
  // generacion siguiente. Asi el nieto arranca a la misma edad que arranco el abuelo.
  const EDAD_INICIO = 12;
  const edadJugable = x => (x.edad == null) || (x.edad <= 14);
  const hijos  = (fam.hijos||[]).filter(edadJugable);
  const nietos = (fam.nietos||[]).filter(edadJugable);
  const marca = (arr, rel) => arr.map(x => Object.assign({}, x, { _rel: rel }));
  // EL NIETO VA PRIMERO. Cuando el abuelo se retira ya pasaron decadas: el hijo
  // suele estar cerca de los 40 y no puede empezar una carrera. El que toma la
  // posta es el nieto, y el hijo queda como alternativa solo si todavia es chico.
  let cand = marca(nietos.filter(n=>n.futbol), 'nieto').concat(marca(hijos.filter(h=>h.futbol), 'hijo'));
  if (!cand.length) cand = marca(nietos, 'nieto').concat(marca(hijos, 'hijo'));
  // Si toda la descendencia ya es grande, aparece la generación que sigue.
  if (!cand.length && ((fam.hijos||[]).length || (fam.nietos||[]).length)){
    // Siempre hay un varon disponible para tomar la posta, como pidio el juego.
    cand = [Object.assign(nacePersona('m'), { edad:EDAD_INICIO, _rel:'nieto', _nuevo:true })];
  }
  return cand;
}
window._legadoOferta = function(){
  if(!G) return;
  const cand = legadoCandidatos();
  const m = document.getElementById('carrera-modal') || overlay();
  if(!cand.length){ retiro(); return; }
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:40px 20px 40px;text-align:center;">
    <div style="font-size:11px;font-weight:900;letter-spacing:3px;color:${A};margin-bottom:10px;">EL LEGADO</div>
    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:26px;color:#fff;line-height:1.15;margin-bottom:12px;">Tu historia terminó.<br>La de ellos empieza.</div>
    <div style="font-size:13.5px;color:#c4ccc0;line-height:1.6;margin-bottom:20px;">La posta la toma tu sangre. Arranca de cero, en su propio potrero, en su propia época — pero cargando tu apellido y la sombra de todo lo que hiciste.</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${cand.map((h,i)=>`<button onclick="window._legadoJugar(${i})" style="display:flex;align-items:center;gap:12px;background:rgba(186,255,0,.08);border:1.5px solid rgba(186,255,0,.35);border-radius:15px;padding:14px;cursor:pointer;text-align:left;">
        <div style="line-height:0;flex-shrink:0;">${vjSpriteNPC(h._rel+h.nombre,'calle',Math.max(12,h.edad||16),'idle',genDe(h),h.av)}</div>
        <div><div style="font-size:16px;font-weight:900;color:#fff;">${esc(h.nombre)} ${esc(G.apellido||'')}</div>
        <div style="font-size:11.5px;color:#9aa294;">Tu ${h._rel==='nieto'?palabraNieto(genDe(h)):palabraHijo(genDe(h))} · ${h.futbol?'Ya juega. ':'Nunca pisó una cancha en serio. '}${(h.edad||0)} años</div></div>
      </button>`).join('')}
    </div>
    <button onclick="window._carreraResumenFinal()" style="width:100%;margin-top:14px;background:rgba(255,255,255,.04);border:1px solid #242a20;color:#8a9280;border-radius:12px;padding:12px;font-weight:800;font-size:12.5px;cursor:pointer;">No, ver el resumen de mi vida</button>
  </div>`;
};
window._legadoJugar = function(i){
  const padre = G;
  const cand = legadoCandidatos();
  const h = cand[i] || cand[0]; if(!h) return;
  // Se guarda el legado del ancestro y se arranca una partida nueva. Cada
  // generacion suma: el chico carga con TODO lo que hicieron los anteriores y el
  // juego se lo recuerda hasta que logre superarlo.
  const previo = (padre.legado || {});
  const legado = {
    padre: padre.apellido, club: padre.club, titulos: padre.titulos||0,
    nivelMax: Math.round(padre.nivel||60), vitrina: (padre.vitrina||[]).map(v=>v.nombre).slice(0,8),
    anio: (padre.vidaEdad && padre.anio) ? (padre.anio + Math.max(0, padre.vidaEdad - (padre.edad||36))) : (padre.anio || 2026),
    rival: padre.rival ? padre.rival.nombre : null,
    idolo: padre._idoloNombre || null,
    gen: (previo.gen || 1) + 1,
    parentesco: h._rel === 'nieto' ? 'abuelo' : 'padre',
    // El techo a superar es el MEJOR de toda la estirpe, no solo el ultimo.
    techoNivel: Math.max(previo.techoNivel || 0, Math.round(padre.nivel||60)),
    techoTitulos: Math.max(previo.techoTitulos || 0, padre.titulos||0),
    techoNombre: ((previo.techoNivel||0) > Math.round(padre.nivel||60)) ? (previo.techoNombre || padre.apellido) : padre.apellido,
    // Donde nacio: si la familia emigro, el chico puede elegir donde jugar.
    paisNac: padre.clubPais || padre.pais,
    paisOrigen: padre.pais,
    // La CARA del ancestro viaja con el legado: así el abuelo se puede dibujar en
    // la casa tal como era, y no como un viejo genérico cualquiera.
    avAncestro: padre.avatar || null,
    edadAncestro: Math.min(88, (padre.vidaEdad || padre.edad || 70) + 6),
    vivo: (padre.vidaEdad || 0) < 84
  };
  try { localStorage.setItem('canchero_legado', JSON.stringify(legado)); } catch(e){}
  // Archivo de ancestros: se guarda la partida entera para poder REVISARLA despues.
  try {
    const arch = JSON.parse(localStorage.getItem('canchero_ancestros') || '[]');
    arch.push({ gen: (previo.gen||1), apellido: padre.apellido, nombre: padre.nombre || padre.apellido,
      parentesco: legado.parentesco, anioFin: legado.anio, partida: padre });
    localStorage.setItem('canchero_ancestros', JSON.stringify(arch.slice(-4)));
  } catch(e){}
  try { localStorage.removeItem(LS); } catch(e){}
  G = null;
  // La apariencia y el nombre YA ESTAN: sale de la familia, no se vuelve a crear.
  // Se hereda el avatar del ancestro con variaciones propias y el genero del chico.
  const avHered = Object.assign({}, padre.avatar || avatarDefault(), {
    gen: genDe(h),
    barba: genDe(h) === 'f' ? 0 : 0,
    canas: 0, calvicie: 0, cicatriz: 0, tatus: 0, bling: 0, lentes: false, preso: false,
    pelo: genDe(h) === 'f' ? 'largo' : pick(['corto','rapado','tupe','colita','largo'])
  });
  _draft = { years:15, apellido: padre.apellido, num: padre.num || 10, pie:'Derecha',
    pais: legado.paisNac || padre.pais,
    pos: padre.pos || 'DC', filtro:'', avatar: avHered, nombreHijo: h.nombre, nombre: h.nombre,
    gen: genDe(h), legado };
  _draft.dif = padre.dif || 'normal';
  // Si la familia estaba viviendo en otro país cuando nació, puede elegir por cuál
  // jugar: el país donde nació o el de la familia.
  _draft._eligePais = (legado.paisNac && legado.paisOrigen && legado.paisNac !== legado.paisOrigen)
    ? [legado.paisOrigen, legado.paisNac] : null;
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:44px 20px 40px;text-align:center;">
    <div style="font-size:11px;font-weight:900;letter-spacing:3px;color:${A};margin-bottom:10px;">GENERACIÓN 2</div>
    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:26px;color:#fff;margin-bottom:12px;">${esc(h.nombre)} ${esc(padre.apellido||'')}</div>
    <div style="font-size:13.5px;color:#c4ccc0;line-height:1.65;margin-bottom:8px;">Creciste escuchando lo que hizo tu viejo: ${legado.titulos} título${legado.titulos===1?'':'s'}, nivel ${legado.nivelMax}, ${legado.vitrina.length?('la vitrina llena de cosas como ' + esc(legado.vitrina[0])):'una carrera entera'}.</div>
    <div style="font-size:13.5px;color:#c4ccc0;line-height:1.65;margin-bottom:18px;">Te van a comparar con tu ${esc(legado.parentesco)} toda la vida. Para que dejen de hacerlo tenés que ser mejor que él: pasar de nivel ${legado.techoNivel} y de ${legado.techoTitulos} título${legado.techoTitulos===1?'':'s'}.</div>
    ${_draft._eligePais ? `
      <div style="font-size:11px;font-weight:900;letter-spacing:2px;color:#7dd3fc;margin-bottom:8px;">NACISTE EN ${esc(legado.paisNac).toUpperCase()} · ¿POR QUÉ PAÍS JUGÁS?</div>
      <div style="display:flex;gap:9px;margin-bottom:18px;">
        ${_draft._eligePais.map(pa=>`<button onclick="window._legadoPais('${esc(pa)}')" style="flex:1;background:rgba(125,211,252,.10);border:1.5px solid rgba(125,211,252,.4);color:#7dd3fc;border-radius:13px;padding:13px;font-weight:900;font-size:13px;cursor:pointer;">${flagImg(pa,18)} ${esc(pa)}</button>`).join('')}
      </div>` : ''}
    <div style="display:flex;justify-content:center;margin-bottom:16px;">
      ${avatarBox(avatarSprite(avHered,{ edad:15, escala:3, pose:'orgullo', num:String(_draft.num||10), apellido:'' }), '12px 18px', 'potrero')}
    </div>
    <button onclick="window._legadoArrancar()" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:14px;padding:15px 32px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;">EMPEZAR MI PROPIO CAMINO <i class='bx bx-right-arrow-alt'></i></button>
    <button onclick="window._carreraIdent(15)" style="width:100%;margin-top:10px;background:rgba(255,255,255,.04);border:1px solid #242a20;color:#8a9280;border-radius:12px;padding:11px;font-weight:800;font-size:12px;cursor:pointer;">Prefiero retocar el look y el puesto</button>
  </div>`;
};
// Elegir por qué país juega el heredero.
window._legadoPais = function(pais){
  if(!_draft) return;
  _draft.pais = pais;
  window._legadoJugarPintar();
};
// Arranca directo en el potrero: nombre, cara y apellido ya vienen de la familia.
window._legadoArrancar = function(){
  if(!_draft){ window._carreraStart(); return; }
  _draft.years = _draft.years || 15;
  window._potreroMundo();
};
// Repinta la pantalla de generación (para que el país elegido quede marcado).
window._legadoJugarPintar = function(){
  const d = _draft; if(!d || !d.legado) return;
  const btn = document.querySelectorAll('button');
  // Marca visual simple: se vuelve a pintar el bloque de países.
  const cont = document.querySelectorAll('[data-ly-pais]');
  vjFlash && null;
  // Se repinta todo el bloque llamando de nuevo a la pantalla.
  const m = document.getElementById('carrera-modal');
  if (m) m.querySelectorAll('button').forEach(b=>{
    if (b.textContent && d.pais && b.textContent.trim().indexOf(d.pais) >= 0){
      b.style.background = 'rgba(186,255,0,.16)'; b.style.borderColor = A; b.style.color = A;
    }
  });
};
// ── EL ESPEJO: peinarte, teñirte, dejarte la barba, tatuarte ────────────────
// Durante TODA la vida, no sólo al crear el personaje. Lo que cambiás acá queda
// en el avatar para siempre (hasta que lo vuelvas a cambiar).
window._vjLook = function(){
  if(!G) return;
  const av = G.avatar = G.avatar || avatarDefault();
  const edad = (VJ.mundo === 'vida') ? (G.vidaEdad||40) : (G.edad||25);
  const fem = av.gen === 'f';
  const cortes = fem ? ['largo','colita','afro','rastas'] : ['corto','rapado','largo','afro','tupe','mohawk','rastas','colita'];
  const m = document.getElementById('carrera-modal') || overlay();
  const bloque = (tit, items) => `
    <div style="text-align:left;margin-bottom:14px;">
      <div style="font-size:10px;font-weight:900;letter-spacing:2px;color:#8fa0b4;margin-bottom:7px;">${tit}</div>
      <div style="display:flex;flex-wrap:wrap;gap:7px;">${items}</div>
    </div>`;
  const chip = (on, onclick, txt, col) => `<button onclick="${onclick}" style="background:${on?(col||A)+'22':'rgba(255,255,255,.04)'};border:1.5px solid ${on?(col||A):'#242a20'};color:${on?(col||A):'#e0e4dc'};border-radius:11px;padding:9px 12px;font-weight:800;font-size:12.5px;cursor:pointer;">${txt}</button>`;
  m.innerHTML = `
  <div style="min-height:100%;background:#05070a;display:flex;flex-direction:column;justify-content:center;position:relative;">
    ${fondoEscenaHTML()}
    <div style="position:relative;max-width:560px;margin:0 auto;width:100%;padding:52px 20px calc(24px + env(safe-area-inset-bottom));box-sizing:border-box;text-align:center;">
      <div style="font-size:10px;font-weight:900;letter-spacing:2px;color:${A};margin-bottom:10px;">FRENTE AL ESPEJO</div>
      <div style="display:flex;justify-content:center;margin-bottom:16px;">
        ${avatarBox(avatarSprite(av,{ edad, escala:3, pose:'orgullo', ropa:(G.ropaElegida||vjRopa()||'calle'), num:'', apellido:'' }), '12px 18px', 'casa')}
      </div>
      ${bloque('PEINADO', cortes.map(c=>chip(av.pelo===c, "window._vjLookSet('pelo','"+c+"')", esc((AV_PELOS.find(x=>x.id===c)||{n:c}).n))).join(''))}
      ${bloque('COLOR DE PELO', AV_COLORES_PELO.map(c=>`<button onclick="window._vjLookSet('peloColor','${c.id}')" title="${esc(c.n)}" style="width:34px;height:34px;border-radius:9px;background:${c.c};border:2px solid ${av.peloColor===c.id?A:'#242a20'};cursor:pointer;"></button>`).join(''))}
      ${fem ? '' : bloque('BARBA', [0,1,2,3].map(b=>chip((av.barba||0)===b, "window._vjLookSet('barba',"+b+")", ['Afeitado','Candado','Barba','Barbón'][b])).join(''))}
      ${bloque('TATUAJES', [0,1,2,3].map(t=>chip((av.tatus||0)===t, "window._vjLookSet('tatus',"+t+")", ['Ninguno','Uno','Media manga','Manga completa'][t], '#a78bfa')).join(''))}
      ${bloque('ACCESORIO', AV_ACCS.map(a=>chip(av.acc===a.id, "window._vjLookSet('acc','"+a.id+"')", esc(a.n), '#4fc3f7')).join(''))}
      <button onclick="window._vjLookVolver()" style="width:100%;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:14px;font-weight:900;font-size:14px;cursor:pointer;">LISTO <i class='bx bx-check'></i></button>
    </div>
  </div>`;
};
window._vjLookSet = function(campo, valor){
  if(!G) return;
  G.avatar = G.avatar || avatarDefault();
  G.avatar[campo] = valor;
  // Teñirte o raparte borra las marcas que puso la edad: si te pintás el pelo, no
  // seguís con canas; si elegís corte, la calvicie deja de mandar sobre el corte.
  if (campo === 'peloColor') G.avatar.canas = 0;
  if (campo === 'pelo' && valor !== 'calvo') G.avatar.calvicie = Math.min(G.avatar.calvicie||0, 1);
  save();
  window._vjLook();
};
window._vjLookVolver = function(){
  if (VJ.mundo === 'vida') window._vidaJugable();
  else if (VJ.mundo === 'club') window._clubMundo(VJ.escena);
  else mundoRender();
};
// ── ROPERO ───────────────────────────────────────────────────────────────────
// Vestirte como quieras, porque sí. En la cancha manda el kit del club.
window._vjRopero = function(){
  if(!G) return;
  const edad = (VJ.mundo === 'vida') ? (G.vidaEdad||40) : (G.edad||25);
  const opciones = ['calle','traje','tv','dt','empresario','escuela','jubilado'];
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="min-height:100%;background:#05070a;display:flex;flex-direction:column;justify-content:center;position:relative;">
    ${fondoEscenaHTML()}
    <div style="position:relative;max-width:560px;margin:0 auto;width:100%;padding:24px 20px calc(24px + env(safe-area-inset-bottom));box-sizing:border-box;text-align:center;">
      <div style="font-size:10px;font-weight:900;letter-spacing:2px;color:${A};margin-bottom:10px;">TU ROPERO</div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:22px;color:#fff;margin-bottom:14px;">¿Cómo te vestís hoy?</div>
      <div style="display:flex;justify-content:center;margin-bottom:16px;">
        ${avatarBox(avatarSprite(G.avatar,{ edad, escala:3, pose:'orgullo', ropa:(G.ropaElegida||'calle'), num:'', apellido:'' }), '12px 18px', 'casa')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;">
        ${opciones.map(id=>{ const R=AV_ROPAS[id]; const on = (G.ropaElegida||'calle')===id;
          return `<button onclick="window._vjVestir('${id}')" style="background:${on?'rgba(186,255,0,.14)':'rgba(255,255,255,.04)'};border:1.5px solid ${on?A:'#242a20'};color:${on?A:'#e0e4dc'};border-radius:13px;padding:13px 10px;font-weight:800;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:9px;text-align:left;">
            <span style="width:16px;height:16px;border-radius:4px;background:${R.base};border:1px solid rgba(0,0,0,.4);flex-shrink:0;"></span>${esc(R.n)}</button>`; }).join('')}
      </div>
      <button onclick="window._vjVestir('')" style="width:100%;margin-top:9px;background:rgba(255,255,255,.03);border:1px solid #242a20;color:#8a9280;border-radius:12px;padding:11px;font-weight:800;font-size:12.5px;cursor:pointer;">Que decida el momento (según dónde esté)</button>
      <button onclick="${VJ.mundo==='vida'?'window._vidaJugable()':"window._clubMundo('casa')"}" style="width:100%;margin-top:12px;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:14px;font-weight:900;font-size:14px;cursor:pointer;">Listo</button>
    </div>
  </div>`;
};
window._vjVestir = function(id){
  if(!G) return;
  G.ropaElegida = id || null;
  save();
  window._vjRopero();
};
// ── LICENCIA: si te tomás un descanso, DEJÁS de dirigir ──────────────────────
function vjLicencia(){
  vjDetener();
  const R = VIDA_ROLES[G.vidaRol] || VIDA_ROLES.disfrutar;
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="min-height:100%;background:#05070a;display:flex;align-items:center;position:relative;">
    ${fondoEscenaHTML()}
    <div style="position:relative;max-width:520px;margin:0 auto;padding:24px 20px;text-align:center;">
      <div style="display:flex;justify-content:center;margin-bottom:14px;">${avatarBox(avatarSprite(G.avatar,{edad:G.vidaEdad||40,escala:2.8,pose:'pensativo',ropa:vjRopa()||undefined,num:'',apellido:''}), '12px 18px', 'casa')}</div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:22px;color:#fff;margin-bottom:8px;">¿Te tomás una licencia?</div>
      <div style="font-size:13.5px;color:#c4ccc0;line-height:1.6;margin-bottom:20px;">Si parás, parás de verdad: durante el próximo tramo <b style="color:#fff;">no vas a ${G.vidaRol==='dt'?'dirigir':'estar en el cargo'}</b>, no vas a sumar resultados y tu lugar lo va a ocupar otro. Ganás salud y tiempo con los tuyos. Cuando vuelvas, vas a tener que reconstruir.</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button onclick="window._vjTomarLicencia(1)" style="background:rgba(167,139,250,.15);border:1.5px solid rgba(167,139,250,.5);color:#c4b5fd;border-radius:13px;padding:14px;font-weight:900;font-size:14px;cursor:pointer;">Sí, me tomo el tramo entero</button>
        <button onclick="window._vidaJugable()" style="background:rgba(255,255,255,.04);border:1.5px solid #242a20;color:#e0e4dc;border-radius:13px;padding:14px;font-weight:800;font-size:14px;cursor:pointer;">No, sigo al frente</button>
      </div>
    </div>
  </div>`;
}
window._vjTomarLicencia = function(tramos){
  const s = G.vidaStats;
  G.vidaPausa = (G.vidaPausa || 0) + (tramos || 1);
  s.salud = clamp((s.salud||70) + ri(8,16), 0, 100);
  if (s.felicidad != null) s.felicidad = clamp(s.felicidad + ri(6,14), 0, 100);
  if (s.familia != null) s.familia = clamp(s.familia + ri(8,16), 0, 100);
  // Lo que dejás de hacer se paga: el cargo lo ocupa otro.
  const R = VIDA_ROLES[G.vidaRol];
  R.barras.forEach(b=>{ if(!b[3] && b[1] !== 'salud' && s[b[1]] != null) s[b[1]] = clamp(s[b[1]] - ri(6,14), 0, 100); });
  (G._vjHechos = G._vjHechos || {}).lapso = true;   // la licencia ES la decisión del tramo
  if(!G.vidaHist) G.vidaHist = [];
  G.vidaHist.push({ lapso:(VIDA_LAPSOS[G.vidaLapso]||{}).lbl, t:'Licencia', res:'Te bajaste del cargo por un tiempo. Descansaste; el lugar lo ocupó otro.', rol:G.vidaRol });
  save();
  VJ.escena = 'casa'; VJ.x = 200;
  window._vidaJugable();
};
// ── DORMIR: pasan cinco años ─────────────────────────────────────────────────
function vjDormir(){
  const s = G.vidaStats;
  s.salud = clamp((s.salud||70) - ri(3,8), 0, 100);
  G.vidaLapso++;
  G._vjHechos = {};
  if (G.vidaPausa > 0) G.vidaPausa--;
  // Los hijos crecen, uno envejece.
  const fam = G.familia = G.familia || {};
  (fam.hijos||[]).forEach(h=> h.edad = (h.edad||0) + 5);
  (fam.nietos||[]).forEach(n=> n.edad = (n.edad||0) + 5);
  const L = VIDA_LAPSOS[G.vidaLapso];
  G.vidaEdad = L ? L.de : (G.vidaEdad || 40) + 5;
  G.anio = (G.anio || 2026) + 5;      // el calendario tambien avanza: el futuro llega
  avEnvejecer(G.vidaEdad);
  save();
  if ((s.salud||0) <= 0){ G._vidaFlags = G._vidaFlags || {}; G._vidaFlags.murioAntes = true; vjDetener(); window._vidaFinal(); return; }
  if (G.vidaLapso >= VIDA_LAPSOS.length){ vjDetener(); window._vidaFinal(); return; }
  vjDetener();
  // Pantalla de paso del tiempo, con el cuerpo ya cambiado.
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="min-height:100%;background:#05070a;display:flex;align-items:center;position:relative;">
    ${fondoEscenaHTML()}
    <div style="position:relative;max-width:520px;margin:0 auto;padding:24px 20px;text-align:center;">
      <div style="font-size:10px;font-weight:900;letter-spacing:3px;color:#5d6879;margin-bottom:10px;">PASARON CINCO AÑOS</div>
      <div style="display:flex;justify-content:center;margin-bottom:14px;">${avatarBox(camaConPersonaHTML(), '14px 20px', 'casa')}</div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:26px;color:#fff;">${G.vidaEdad} años</div>
      <div style="font-size:13px;color:#8a9280;margin:6px 0 20px;">${esc(L ? L.t : '')}</div>
      <button onclick="window._vidaJugable()" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:14px 30px;font-weight:900;font-size:14.5px;cursor:pointer;">SEGUIR VIVIENDO <i class='bx bx-right-arrow-alt'></i></button>
    </div>
  </div>`;
}

// ── ACOSTADO EN LA CAMA ──────────────────────────────────────────────────────
// Antes se agarraba el muñeco PARADO y se lo rotaba 90° con el origen abajo: el
// cuerpo quedaba corrido de la cama y se leía como una persona de pie volcada,
// no como alguien durmiendo. Ahora la escala está calculada contra el colchón, la
// rotación gira sobre el CENTRO (que es predecible) y un acolchado le tapa las
// piernas, que es lo que termina de venderlo como "está acostado".
function camaConPersonaHTML(){
  const S = 2.1;                       // misma escala que el SVG de la cama
  const W = Math.round(88 * S), H = Math.round(50 * S);
  // Colchón útil dentro del dibujo de la cama (coords base × escala).
  const colchonX = 8 * S, colchonW = 74 * S;
  const almohadaCx = (15 + 17/2) * S;  // centro de la almohada: ahí va la cabeza
  const colchonY = 16 * S;
  // El cuerpo entra a lo largo del colchón: se elige la escala para que quepa.
  const escala = 1.35;
  const cuerpoLargo = 72 * escala;     // alto del sprite = largo al acostarse
  // Centro del cuerpo: arranca en la almohada y se extiende hacia los pies.
  const cx = almohadaCx + cuerpoLargo / 2 - 8;
  const cy = colchonY + 10;
  return `
  <div style="position:relative;width:${W}px;height:${H}px;">
    <div style="position:absolute;left:0;bottom:0;line-height:0;">${vjObjSVG('cama', S)}</div>
    <div style="position:absolute;left:${cx}px;top:${cy}px;transform:translate(-50%,-50%) rotate(-90deg);transform-origin:50% 50%;line-height:0;">
      ${avatarSprite(G.avatar, { edad:G.vidaEdad, escala, pose:'idle', ropa:vjRopa()||undefined, num:'', apellido:'' })}
    </div>
    <!-- Acolchado por encima: tapa de la cintura a los pies -->
    <div style="position:absolute;left:${colchonX + colchonW*0.42}px;top:${colchonY + 2}px;width:${colchonW*0.56}px;height:${26}px;background:linear-gradient(180deg,#7d5a8c,#54395f);border-radius:3px;box-shadow:inset 0 2px 0 rgba(255,255,255,.18);"></div>
  </div>`;
}
window._carreraSegundaVida = function(rol){
  if (!G) G = load(); if (!G) return;
  if (!VIDA_ROLES[rol]) rol = 'disfrutar';
  G.vidaRol = rol;
  G.vidaStats = vidaInit(rol);
  G.vidaLapso = 0;
  G.vidaEdad = VIDA_LAPSOS[0].de;
  G.vidaHist = [];
  G._vidaSeen = [];
  G._vidaFlags = {};
  G.segundaVida = { rol: VIDA_ROLES[rol].n, icon: VIDA_ROLES[rol].icon, res: VIDA_ROLES[rol].intro, key: rol };
  G.vidaDestinos = [];      // historial de clubes/medios/empresas por los que pasaste
  save();
  // Antes de arrancar, elegís DÓNDE: club si sos DT, cadena si sos periodista, etc.
  if (DESTINOS[rol]) { window._elegirDestino(true); return; }
  VJ.escena = 'casa'; VJ.x = 200;
  window._vidaJugable();
};

// ── ELEGIR DÓNDE TRABAJÁS (y cambiar de lugar más adelante) ──────────────────
// Cada rol tiene su propio tipo de destino. Se puede cambiar entre lapsos, así la
// vida post-carrera también es una sucesión de decisiones y no un texto fijo.
const DESTINOS = {
  dt: { que:'club', titulo:'¿Qué equipo vas a dirigir?', icono:'bx-clipboard',
    opciones(){
      // Clubes acordes a tu prestigio: sin títulos no te llama un grande.
      const pres = (G.titulos||0)*6 + (G.nivel||60)*0.5 + ((G.vidaStats&&G.vidaStats.resultados)||40)*0.4;
      const techo = clamp(52 + pres*0.35, 55, 92);
      const pool = todosClubs().filter(c => c.str <= techo && c.str >= techo-26 && c.name !== (G.vidaLugar||''));
      return shuffle(pool).slice(0,3).map(c=>({
        id:c.name, n:c.name, sub:c.liga, pais:c.pais, str:c.str,
        badge:clubBadge(c.name,40),
        nota: c.str>=82?'Exigencia máxima':c.str>=70?'Proyecto serio':'Para hacerte de abajo'
      }));
    } },
  dirigente: { que:'club', titulo:'¿En qué club te postulás?', icono:'bx-briefcase',
    opciones(){
      const pool = todosClubs().filter(c => c.pais === (G.clubPais||G.pais) && c.name !== (G.vidaLugar||''));
      return shuffle(pool).slice(0,3).map(c=>({ id:c.name, n:c.name, sub:c.liga, pais:c.pais, str:c.str,
        badge:clubBadge(c.name,40), nota: c.str>=78?'Club grande, socios exigentes':'Club chico, todo por hacer' }));
    } },
  comentarista: { que:'medio', titulo:'¿Dónde vas a trabajar?', icono:'bx-microphone',
    opciones(){
      const P = prensaDe(G.clubPais || G.pais);
      const medios = shuffle(P.diarios).slice(0,2).concat(['Streaming propio']);
      return medios.map((m,i)=>({ id:m, n:m, sub: m==='Streaming propio'?'Tu canal, tus reglas':'Medio establecido',
        badge:`<div style="width:40px;height:40px;border-radius:9px;background:${i===2?'#7c3aed':'#1e3a5f'};display:flex;align-items:center;justify-content:center;"><i class='bx ${i===2?'bx-broadcast':'bx-tv'}' style="font-size:22px;color:#fff;"></i></div>`,
        nota: m==='Streaming propio'?'Más riesgo, todo tuyo':'Sueldo seguro, menos libertad' }));
    } },
  escuela: { que:'sede', titulo:'¿Dónde abrís la escuela?', icono:'bx-award',
    opciones(){
      const c = (CIUDADES[G.pais] || ['tu barrio','el centro','las afueras']);
      return shuffle(c).slice(0,3).map(x=>({ id:x, n:x, sub:'Sede de la escuela',
        badge:`<div style="width:40px;height:40px;border-radius:9px;background:#7a3d0d;display:flex;align-items:center;justify-content:center;"><i class='bx bx-map' style="font-size:22px;color:#fb923c;"></i></div>`,
        nota:'Cada zona trae sus propios pibes' }));
    } },
  empresario: { que:'rubro', titulo:'¿En qué te metés?', icono:'bx-store',
    opciones(){
      const r = [['Inmobiliaria','Ladrillos: lento y seguro'],['Marca deportiva','Tu nombre en la ropa'],
        ['Tecnología','Alto riesgo, alto retorno'],['Gastronomía','Restaurantes y franquicias'],
        ['Representación','Manejar jugadores jóvenes']];
      return shuffle(r).slice(0,3).map(x=>({ id:x[0], n:x[0], sub:x[1],
        badge:`<div style="width:40px;height:40px;border-radius:9px;background:#0f3d2a;display:flex;align-items:center;justify-content:center;"><i class='bx bx-briefcase-alt-2' style="font-size:22px;color:#22c55e;"></i></div>`,
        nota:'' }));
    } }
};
window._elegirDestino = function(primeraVez){
  if(!G) G=load(); if(!G) return;
  const rol = G.vidaRol, D = DESTINOS[rol];
  if(!D){ VJ.escena='casa'; VJ.x=200; window._vidaJugable(); return; }
  const R = VIDA_ROLES[rol];
  const ops = D.opciones();
  G._destinoOps = ops; save();
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="max-width:540px;margin:0 auto;padding:20px 16px calc(28px + env(safe-area-inset-bottom));">
    <div style="text-align:center;margin-bottom:16px;">
      <div style="font-size:10px;font-weight:900;letter-spacing:2px;color:${R.color};">${esc(R.n).toUpperCase()}</div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:21px;color:#fff;margin-top:5px;">${esc(D.titulo)}</div>
      ${G.vidaLugar?`<div style="font-size:11.5px;color:#8a9280;margin-top:4px;">Venís de ${esc(G.vidaLugar)}</div>`:''}
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${ops.map((o,i)=>`<button onclick="window._tomarDestino(${i})" style="display:flex;align-items:center;gap:13px;background:rgba(255,255,255,.04);border:1.5px solid #262c22;border-radius:14px;padding:13px;cursor:pointer;text-align:left;">
        ${o.badge}
        <div style="flex:1;min-width:0;">
          <div style="font-size:15px;font-weight:900;color:#fff;">${esc(o.n)}</div>
          <div style="font-size:11px;color:#8a9280;margin-top:1px;">${o.pais?flagImgInline(o.pais)+' ':''}${esc(o.sub||'')}</div>
          ${o.nota?`<div style="font-size:10px;color:${R.color};font-weight:800;margin-top:3px;">${esc(o.nota)}</div>`:''}
        </div>
        <i class='bx bx-chevron-right' style="color:#444;font-size:22px;"></i>
      </button>`).join('')}
    </div>
    ${!primeraVez?`<button onclick="window._vidaJugable()" style="width:100%;margin-top:12px;background:#161616;color:#9aa294;border:1px solid #262c22;border-radius:12px;padding:12px;font-weight:800;font-size:12.5px;cursor:pointer;">Seguir donde estoy</button>`:''}
  </div>`;
};
window._tomarDestino = function(i){
  const o = (G._destinoOps||[])[i]; if(!o) return;
  const rol = G.vidaRol, s = G.vidaStats || {};
  if (G.vidaLugar && G.vidaLugar !== o.id){
    (G.vidaDestinos = G.vidaDestinos || []).push({ lugar:G.vidaLugar, hasta:G.vidaEdad });
  }
  G.vidaLugar = o.id; G.vidaLugarSub = o.sub || '';
  if (rol === 'dt' || rol === 'dirigente'){
    G.vidaClubStr = o.str || 60;
    // SINCRONIZAR con el club que usa la gestión. Había dos ideas distintas de
    // "tu equipo": elegías Flamengo acá y el escritorio te seguía mostrando el
    // club random que se había inventado al empezar el rol.
    const g = gestionAsegurar();
    if (g){
      g.club = o.id; g.str = o.str || g.str; g.liga = o.sub || g.liga; g.pais = o.pais || g.pais;
      g.anios = 0; g.sinTrabajo = false;
      g.plantel = []; g._plantelDe = null; g.mercado = null; g._tabla = null;  // plantel nuevo
    }
    // Un club grande sube la exigencia; uno chico da aire.
    if (rol === 'dt'){ s.presion = clamp((s.presion||45) + (o.str>=82?18:o.str>=70?6:-10), 0, 100); }
    else { s.poder = clamp((s.poder||40) + (o.str>=78?-8:8), 0, 100); }
  } else if (rol === 'comentarista'){
    if (o.id === 'Streaming propio'){ s.credibilidad = clamp((s.credibilidad||50)+8,0,100); s.rating = clamp((s.rating||40)-10,0,100); }
    else { s.rating = clamp((s.rating||40)+8,0,100); }
  } else if (rol === 'empresario'){
    const riesgoso = /Tecnolog|Represent/.test(o.id);
    s.riesgo = clamp((s.riesgo||30) + (riesgoso?18:-8), 0, 100);
  }
  G._destinoOps = null; save();
  VJ.escena = 'casa'; VJ.x = 200;
  window._vidaJugable();
};

// Elige el evento del lapso, respetando lo ya visto y el mínimo de lapso.
function vidaEventoDe(rol, lapso, seen){
  const pool = (VIDA_EVENTOS[rol] || VIDA_EVENTOS.disfrutar);
  let idx = pool.map((_,i)=>i).filter(i=>{
    const e = pool[i];
    if (e.minLapso != null && lapso < e.minLapso) return false;
    if (seen.indexOf(i) >= 0) return false;
    return true;
  });
  if (!idx.length) idx = pool.map((_,i)=>i).filter(i=>seen.indexOf(i)<0);
  // Si ya viste todo, se recicla el banco entero en vez de devolver nada (que era
  // lo que dejaba el tramo sin decision y la partida trabada).
  if (!idx.length) idx = pool.map((_,i)=>i).filter(i=>{
    const e = pool[i];
    return !(e.minLapso != null && lapso < e.minLapso);
  });
  if (!idx.length) idx = pool.map((_,i)=>i);
  if (!idx.length) return null;
  const c = idx[Math.floor(Math.random()*idx.length)];
  return { idx:c, ev:pool[c] };
}

// ── PANTALLA PRINCIPAL DEL LAPSO (vista lateral) ─────────────────────────────
window._vidaLapso = function(){
  if(!G) G=load(); if(!G || !G.vidaRol){ retiro(); return; }
  const rol = G.vidaRol, R = VIDA_ROLES[rol];
  if (G.vidaLapso >= VIDA_LAPSOS.length){ window._vidaFinal(); return; }
  const L = VIDA_LAPSOS[G.vidaLapso];
  G.vidaEdad = L.de;
  const picked = vidaEventoDe(rol, G.vidaLapso, G._vidaSeen || []);
  if (!picked){ window._vidaFinal(); return; }
  G._vidaEv = picked;
  const s = G.vidaStats;
  const estado = R.estado(s);
  const m = document.getElementById('carrera-modal') || overlay();
  const kit = kitClub(G.club, G.clubPais || G.pais);
  m.innerHTML = `
  <div style="min-height:100%;background:#000;display:flex;flex-direction:column;">
    <!-- Título del período (como el nombre de ánimo del juego) -->
    <div style="text-align:center;padding:10px 12px 4px;">
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:15px;letter-spacing:3px;color:${R.color};text-shadow:0 0 18px ${R.color}55;">${esc(estado)}</div>
    </div>
    <!-- HUD de barras -->
    <div style="display:flex;gap:9px;padding:6px 14px 10px;align-items:flex-end;">
      ${R.barras.map(b=>vidaBarra(b[0], s[b[1]], b[2], b[3])).join('')}
    </div>
    <!-- ESCENA LATERAL -->
    <div style="position:relative;width:100%;background:#000;">
      <div style="position:relative;max-width:640px;margin:0 auto;">
        ${vidaEscena(rol, 320, 150)}
        <!-- Avatar parado en la habitación -->
        <div style="position:absolute;left:50%;bottom:11%;transform:translateX(-50%);">
          ${avatarSprite(G.avatar, { edad:G.vidaEdad, kitBase:kit.base, kitAlt:kit.alt, kitTxt:kit.txt, kitTipo:kit.tipo, num:G.num, apellido:G.apellido, escala:2.1, pose:'idle' })}
        </div>
        <!-- Panel de período y objetivos, arriba a la derecha -->
        <div style="position:absolute;top:6px;right:6px;background:rgba(10,14,8,.82);border:1px solid ${R.color}44;border-radius:7px;padding:7px 10px;max-width:52%;">
          <div style="font-size:9.5px;font-weight:900;color:${R.color};letter-spacing:1px;">EDAD: ${L.lbl}</div>
          <div style="font-size:8.5px;color:#9aa294;margin-top:2px;line-height:1.35;">${esc(L.t)}</div>
          <div style="font-size:8.5px;color:#6b7360;margin-top:4px;border-top:1px solid ${R.color}22;padding-top:4px;"><i class='bx ${R.icon}' style="color:${R.color};"></i> ${esc(R.n)}</div>
          ${G.vidaLugar?`<div style="font-size:9px;color:${R.color};font-weight:900;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(G.vidaLugar)}</div>`:''}
        </div>
        <!-- Etapa del lapso, arriba a la izquierda -->
        <div style="position:absolute;top:6px;left:6px;background:rgba(10,14,8,.72);border-radius:7px;padding:5px 9px;">
          <div style="font-size:9px;font-weight:900;color:#8a9280;letter-spacing:1px;">LAPSO ${G.vidaLapso+1}/${VIDA_LAPSOS.length}</div>
        </div>
      </div>
    </div>
    <!-- Prompt + decisión, abajo (siempre visible sin scrollear) -->
    <div style="flex:1;background:linear-gradient(180deg,#000,#0a0d08);padding:14px 16px calc(20px + env(safe-area-inset-bottom));max-width:640px;margin:0 auto;width:100%;box-sizing:border-box;">
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:17px;color:#fff;line-height:1.2;margin-bottom:7px;">${esc(picked.ev.t)}</div>
      <div style="font-size:13px;color:#b8c0b0;line-height:1.55;margin-bottom:13px;">${esc(picked.ev.d)}</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${picked.ev.opts.map((o,i)=>`<button onclick="window._vidaElegir(${i})" style="background:${i===0?R.color+'18':'rgba(255,255,255,.04)'};border:1.5px solid ${i===0?R.color+'66':'#242a20'};color:${i===0?R.color:'#e0e4dc'};border-radius:12px;padding:13px 14px;font-weight:800;font-size:13.5px;text-align:left;cursor:pointer;line-height:1.35;">${o.txt}</button>`).join('')}
      </div>
    </div>
  </div>`;
};

// ── RESOLUCIÓN DE LA DECISIÓN ────────────────────────────────────────────────
window._vidaElegir = function(i){
  const picked = G._vidaEv; if(!picked) return;
  const o = picked.ev.opts[i]; if(!o) return;
  const rol = G.vidaRol, R = VIDA_ROLES[rol];
  const s = G.vidaStats;
  const antes = JSON.parse(JSON.stringify(s));
  if(!G._vidaFlags) G._vidaFlags = {};
  const res = o.ef(s, G) || '';
  // Clamp de todas las barras
  Object.keys(s).forEach(k=>{ s[k] = clamp(s[k], 0, 100); });
  // Desgaste natural del paso del tiempo (5 años por lapso)
  s.salud = clamp(s.salud - ri(3, 8), 0, 100);
  (G._vidaSeen = G._vidaSeen || []).push(picked.idx);
  avEnvejecer(G.vidaEdad + 5);
  if(G.vidaRol==='dirigente'||G.vidaRol==='empresario') avMutar({traje:true});
  const L = VIDA_LAPSOS[G.vidaLapso];
  G.vidaHist.push({ lapso:L.lbl, t:picked.ev.t, res, rol });
  save();
  // Chips de cambio
  const chips = R.barras.map(b=>{
    const d = Math.round((s[b[1]]||0) - (antes[b[1]]||0));
    if(!d) return '';
    const bueno = b[3] ? d < 0 : d > 0;
    const col = bueno ? '#4ade80' : '#ff6b6b';
    return `<span style="display:inline-flex;align-items:center;gap:3px;background:${col}18;border:1px solid ${col}55;color:${col};border-radius:8px;padding:3px 9px;font-size:11px;font-weight:800;"><i class='bx bx-${d>0?'up':'down'}-arrow-alt'></i>${b[0]} ${d>0?'+':''}${d}</span>`;
  }).filter(Boolean).join('');
  const kit = kitClub(G.club, G.clubPais || G.pais);
  const ultimo = G.vidaLapso >= VIDA_LAPSOS.length - 1;
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="min-height:100%;background:#000;display:flex;flex-direction:column;">
    <div style="position:relative;width:100%;">
      <div style="position:relative;max-width:640px;margin:0 auto;">
        ${vidaEscena(rol, 320, 150)}
        <div style="position:absolute;left:50%;bottom:11%;transform:translateX(-50%);">
          ${avatarSprite(G.avatar, { edad:G.vidaEdad, kitBase:kit.base, kitAlt:kit.alt, kitTxt:kit.txt, kitTipo:kit.tipo, num:G.num, apellido:G.apellido, escala:2.1, pose:'idle' })}
        </div>
      </div>
    </div>
    <div style="flex:1;background:linear-gradient(180deg,#000,#0a0d08);padding:18px 18px calc(24px + env(safe-area-inset-bottom));max-width:640px;margin:0 auto;width:100%;box-sizing:border-box;text-align:center;">
      <div style="font-size:10px;font-weight:900;letter-spacing:2px;color:${R.color};margin-bottom:10px;">${esc(VIDA_LAPSOS[G.vidaLapso].lbl)} AÑOS</div>
      <div style="font-size:15px;color:#fff;font-weight:700;line-height:1.6;margin-bottom:14px;">${esc(res)}</div>
      ${chips?`<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:16px;">${chips}</div>`:'<div style="margin-bottom:16px;"></div>'}
      <button onclick="window._vidaSiguiente()" style="background:linear-gradient(135deg,${_avShade(R.color,-70)},${R.color});color:#0a0d08;border:none;border-radius:13px;padding:14px 30px;font-family:Outfit,sans-serif;font-weight:900;font-size:14.5px;cursor:pointer;">${ultimo?'VER CÓMO TERMINÓ TODO':'SIGUIENTE ETAPA'} <i class='bx bx-right-arrow-alt'></i></button>
    </div>
  </div>`;
};

window._vidaSiguiente = function(){
  G.vidaLapso++;
  // Si la salud llegó a cero, la vida se termina antes.
  if ((G.vidaStats && G.vidaStats.salud <= 0)){ G._vidaFlags.murioAntes = true; window._vidaFinal(); return; }
  save();
  if (G.vidaLapso >= VIDA_LAPSOS.length){ window._vidaFinal(); return; }
  // Entre lapsos podés cambiar de club, de medio o de rubro. Si te está yendo
  // mal, además te pueden echar y la elección se vuelve obligatoria.
  if (DESTINOS[G.vidaRol]){
    const s = G.vidaStats || {};
    const echado = (G.vidaRol==='dt' && (s.presion>=82 || s.resultados<=18))
                || (G.vidaRol==='comentarista' && s.rating<=15)
                || (G.vidaRol==='dirigente' && s.socios<=15);
    if (echado){ G._vidaFlags.echado = true; window._elegirDestino(true); return; }
    if (Math.random() < 0.55){ window._elegirDestino(false); return; }
  }
  window._vidaLapso();
};

// ── CIERRE DEL MODO VIDA: epílogo según cómo terminaron las barras ───────────
window._vidaFinal = function(){
  const rol = G.vidaRol, R = VIDA_ROLES[rol] || VIDA_ROLES.disfrutar;
  const s = G.vidaStats || {};
  const F = G._vidaFlags || {};
  // Balance del rol → veredicto final del camino elegido
  const claves = R.barras.filter(b=>!b[3]).map(b=>s[b[1]]||0);
  const prom = claves.reduce((a,b)=>a+b,0) / Math.max(1, claves.length);
  let titulo, texto;
  if (F.murioAntes){
    titulo = 'No llegaste al final';
    texto = 'El cuerpo dijo basta antes de tiempo. Te fuiste rodeado de los tuyos, con la certeza de haber vivido más en cuarenta años que muchos en noventa.';
  } else if (rol === 'dt'){
    titulo = prom>=68?'Maestro':prom>=45?'Técnico de oficio':'Un técnico más';
    texto = prom>=68 ? `Dirigiste ${F.seleccionador?'a tu selección y ':''}a los mejores planteles del continente. ${F.campeonDT?'Levantaste títulos desde el banco, algo que muy pocos logran después de haberlos levantado como jugador. ':''}Tu nombre se estudia.` : prom>=45 ? 'Tuviste equipos, tuviste momentos y tuviste dignidad. No todos los grandes jugadores logran siquiera eso desde el banco.' : 'Descubriste que dirigir no era lo tuyo. Te costó aceptarlo, pero al final lo hiciste.';
  } else if (rol === 'comentarista'){
    titulo = prom>=68?'La voz del fútbol':prom>=45?'Panelista respetado':'Pasaste por la tele';
    texto = F.escandalo ? 'Un escándalo te sacó de la pantalla y nunca volviste del todo. La televisión no perdona.' : prom>=68 ? 'Te convertiste en la voz que la gente busca para entender el fútbol. Una generación entera creció escuchándote.' : prom>=45 ? 'Trabajaste con seriedad y te ganaste el respeto del ambiente sin necesidad de gritar.' : 'La tele te usó mientras tu nombre vendía y te soltó cuando dejó de hacerlo.';
  } else if (rol === 'dirigente'){
    titulo = prom>=68?'Presidente histórico':prom>=45?'Dirigente correcto':'Gestión olvidable';
    texto = prom>=68 ? `Dejaste el club mejor de como lo encontraste. ${F.obra?'La tribuna que construiste lleva tu nombre. ':''}${F.reconstruyo?'Y lo devolviste a primera cuando todos lo daban por muerto. ':''}Eso es más difícil que ganar un partido.` : prom>=45 ? 'Hiciste lo que pudiste con lo que había. Ni héroe ni villano: un tipo que puso la cara.' : 'La gestión terminó mal. Vas a ser recordado más por lo que se perdió que por lo que hiciste.';
  } else if (rol === 'empresario'){
    titulo = (s.patrimonio||0)>=70?'Magnate':(s.patrimonio||0)>=40?'Bien parado':'Se fue en llamas';
    texto = F.causaPenal ? 'La causa penal te persiguió el resto de tus días. Perdiste la plata y perdiste el nombre, que era lo único que no se compra.' : (s.patrimonio||0)>=70 ? `Multiplicaste todo lo que ganaste jugando. ${F.duenoClub?'Y salvaste al club que te formó, que no se paga con plata. ':''}Tus nietos no van a necesitar trabajar.` : (s.patrimonio||0)>=40 ? 'Cuidaste lo que hiciste. No te volviste millonario, pero nunca más tuviste que preocuparte.' : 'Los negocios no eran lo tuyo. Perdiste buena parte de lo que habías ganado en la cancha.';
  } else if (rol === 'escuela'){
    titulo = prom>=68?'Formador de una generación':prom>=45?'Maestro del barrio':'Una escuelita más';
    texto = prom>=68 ? `Cientos de pibes pasaron por tus manos. ${F.formoCrack?'Varios llegaron a primera y todos dicen tu nombre en la primera entrevista. ':''}${F.franquicia?'Tu método se enseña en todo el país. ':''}Devolviste todo lo que el fútbol te dio, y con intereses.` : prom>=45 ? 'La escuelita aguantó los años a puro pulmón. Nunca fue negocio; siempre fue otra cosa.' : 'Costó más de lo que imaginabas. Igual, cada pibe que pasó se acuerda de vos.';
  } else {
    titulo = (s.soledad||0)>=65?'Se apagó de a poco':prom>=68?'En paz':'Una vida tranquila';
    texto = (s.soledad||0)>=65 ? 'Los últimos años fueron silenciosos. El teléfono sonaba poco y la casa quedaba grande. La fama se va mucho antes que uno.' : prom>=68 ? `Elegiste vivir y lo hiciste bien. ${F.homenajeado?'El estadio lleno cantando tu nombre fue el cierre perfecto. ':''}${F.libro?'Y dejaste escrito todo, sin maquillaje. ':''}Rodeado de los tuyos hasta el final.` : 'Una vida sin sobresaltos, con los tuyos cerca y la pelota lejos. No está nada mal.';
  }
  // Trayectoria post-carrera: por dónde pasaste como DT, periodista, dirigente...
  const recorrido = (G.vidaDestinos||[]).map(d=>d.lugar).concat(G.vidaLugar?[G.vidaLugar]:[]);
  if (recorrido.length){
    texto += ` Pasaste por ${recorrido.length === 1 ? recorrido[0] : recorrido.slice(0,-1).join(', ') + ' y ' + recorrido[recorrido.length-1]}.`;
  }
  G.segundaVida = { rol:R.n, icon:R.icon, res:texto, titulo, key:rol, prom:Math.round(prom), recorrido };
  try { saveCareer(G); } catch(e) {}
  save();
  const kit = kitClub(G.club, G.clubPais || G.pais);
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="min-height:100%;background:#000;display:flex;flex-direction:column;">
    <div style="position:relative;width:100%;">
      <div style="position:relative;max-width:640px;margin:0 auto;">
        ${vidaEscena(rol, 320, 150)}
        <div style="position:absolute;left:50%;bottom:11%;transform:translateX(-50%);">
          ${avatarSprite(G.avatar, { edad:70, kitBase:kit.base, kitAlt:kit.alt, kitTxt:kit.txt, kitTipo:kit.tipo, num:G.num, apellido:G.apellido, escala:2.1, pose:F.murioAntes?'bajon':'saludo' })}
        </div>
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.75));"></div>
      </div>
    </div>
    <div style="flex:1;background:linear-gradient(180deg,#000,#0a0d08);padding:20px 20px calc(26px + env(safe-area-inset-bottom));max-width:640px;margin:0 auto;width:100%;box-sizing:border-box;text-align:center;">
      <div style="font-size:10px;font-weight:900;letter-spacing:3px;color:${R.color};margin-bottom:6px;">${F.murioAntes?'FIN':(VIDA_LAPSOS[VIDA_LAPSOS.length-1].a + ' AÑOS')}</div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:24px;color:#fff;line-height:1.15;margin-bottom:10px;">${esc(titulo)}</div>
      <div style="font-size:13.5px;color:#b8c0b0;line-height:1.65;margin-bottom:18px;">${esc(texto)}</div>
      <div style="display:flex;gap:7px;margin-bottom:18px;">
        ${R.barras.map(b=>`<div style="flex:1;background:rgba(255,255,255,.04);border:1px solid #1e2419;border-radius:10px;padding:8px 4px;">
          <div style="font-size:15px;font-weight:900;color:${b[2]};line-height:1;">${Math.round(s[b[1]]||0)}</div>
          <div style="font-size:7.5px;color:#6b7360;font-weight:800;letter-spacing:.5px;margin-top:4px;">${b[0]}</div>
        </div>`).join('')}
      </div>
      <!-- La función retiro() es interna del módulo: en un onclick inline el
           navegador la busca en window y no la encuentra, así que el botón no
           hacía absolutamente nada. Va por el alias público. -->
      ${(((G.familia||{}).hijos||[]).length) ? `<button onclick="window._legadoOferta()" style="width:100%;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:14px;padding:15px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;margin-bottom:9px;"><i class='bx bx-child'></i> SEGUIR EL LEGADO CON TU HIJO</button>` : ''}
      <button onclick="window._carreraResumenFinal()" style="width:100%;background:${((G.familia||{}).hijos||[]).length?'rgba(255,255,255,.05)':'linear-gradient(135deg,#16a34a,'+A+')'};color:${((G.familia||{}).hijos||[]).length?'#c4ccc0':'#000'};border:${((G.familia||{}).hijos||[]).length?'1px solid #242a20':'none'};border-radius:14px;padding:15px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;">VER EL RESUMEN DE TODA MI VIDA</button>
    </div>
  </div>`;
};
// Alias público del resumen final (los onclick inline sólo ven window).
// ── ARCHIVO DE ANCESTROS ─────────────────────────────────────────────────────
// La carrera del padre/abuelo queda guardada y se puede volver a ver en cualquier
// momento mientras jugás con el heredero.
function ancestros(){ try { return JSON.parse(localStorage.getItem('canchero_ancestros')||'[]'); } catch(e){ return []; } }
window._verAncestros = function(){
  const AN = ancestros();
  const m = document.getElementById('carrera-modal') || overlay();
  if(!AN.length){ window._carreraHub(); return; }
  const filas = AN.slice().reverse().map((a, i) => {
    const p = a.partida || {};
    const idx = AN.length - 1 - i;
    return `<button onclick="window._verAncestro(${idx})" style="width:100%;display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.04);border:1.5px solid #262c22;border-radius:14px;padding:13px;cursor:pointer;text-align:left;margin-bottom:9px;">
      <div style="line-height:0;flex-shrink:0;">${avatarSprite(p.avatar||avatarDefault(),{edad:Math.min(70,(p.vidaEdad||p.edad||40)),escala:1.7,pose:'idle',num:'',apellido:''})}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:15px;font-weight:900;color:#fff;">${esc(p.apellido||a.apellido||'—')}</div>
        <div style="font-size:11px;color:#8a9280;margin-top:2px;">Tu ${esc(a.parentesco||'ancestro')} · ${(p.titulos||0)} títulos · nivel ${Math.round(p.nivel||0)}</div>
        <div style="font-size:10px;color:#5f6a58;margin-top:1px;">Terminó en ${a.anioFin||'—'}</div>
      </div>
      <i class='bx bx-chevron-right' style="color:#444;font-size:22px;"></i>
    </button>`;
  }).join('');
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:20px 16px calc(28px + env(safe-area-inset-bottom));">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <button onclick="window._carreraHub()" style="background:rgba(255,255,255,.06);border:none;color:#aaa;width:32px;height:32px;border-radius:50%;font-size:17px;cursor:pointer;"><i class='bx bx-arrow-back'></i></button>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:18px;color:#fff;">Tu estirpe</div>
    </div>
    ${filas}
  </div>`;
};
// Muestra el resumen final del ancestro SIN perder la partida en curso.
window._verAncestro = function(idx){
  const AN = ancestros(); const a = AN[idx]; if(!a || !a.partida) return;
  const actual = G;
  G = a.partida;
  try { retiro(); } catch(e){}
  G = actual;
  setTimeout(function(){
    const m = document.getElementById('carrera-modal'); if(!m) return;
    const cont = m.firstElementChild || m;
    const b = document.createElement('button');
    b.style.cssText = 'position:sticky;bottom:10px;width:100%;margin-top:14px;background:linear-gradient(135deg,#16a34a,'+A+');color:#000;border:none;border-radius:13px;padding:14px;font-weight:900;font-size:14px;cursor:pointer;z-index:5;';
    b.textContent = 'Volver a mi carrera';
    b.onclick = function(){ window._carreraHub(); };
    cont.appendChild(b);
  }, 40);
};
window._carreraResumenFinal = function(){ try{ retiro(); }catch(e){ console.warn('resumen final', e); window._carreraHub(); } };
// Compat con guardados viejos que usaban el sistema año a año.
window._carreraVida = function(){ if(G && G.vidaRol) window._vidaJugable(); else retiro(); };
window._carreraVidaFin = function(){ save(); retiro(); };
// Compartir/descargar la carrera: arma texto resumen + intenta Web Share API,
// con fallback a copiar al portapapeles. Simple y sin dependencias externas.
window._carreraCompartir = function(){
  if(!G) G=load(); if(!G) return;
  const clubes = Array.from(new Set((G.timeline||[]).map(t=>t.club)));
  const trofArr = (G.vitrina||[]).map(v=>v.nombre);
  const nivelF = Math.round(G.nivel||0);
  const valor = eur(G.valor||0);
  const rango = G.titulos>=8||nivelF>=88 ? 'LEYENDA' : G.titulos>=4||nivelF>=80 ? 'GRAN CARRERA' : 'CARRERA';
  const lines = [
    `🏆 CANCHERO LEYENDA — ${G.apellido||'—'} #${G.num||10}`,
    `${rango} · Nivel ${nivelF} · Valor ${valor}`,
    `⚽ ${G.tot.pj} PJ · ${G.tot.g} goles · ${G.tot.a} asist.`,
    `🥇 ${G.titulos||0} títulos${trofArr.length?': '+trofArr.slice(0,4).join(', ')+(trofArr.length>4?`, +${trofArr.length-4}`:''):''}`,
    `👕 Trayectoria: ${clubes.slice(0,5).join(' → ')}${clubes.length>5?` (+${clubes.length-5})`:''}`,
    ...(G.rival&&(G.rival.ganados+G.rival.perdidos)?[`⚔️ Duelo con ${G.rival.nombre}: ${G.rival.ganados}—${G.rival.perdidos}`]:[]),
    `💰 Patrimonio: ${eur((G.dinero||0)+((G.inversiones&&G.inversiones.monto)||0)+(G.bienes||[]).reduce((s,b)=>{const B=bienByld(b.id)||{};return s+Math.round((b.precio||B.p||0)*0.65);},0))}`,
    ``,
    `Jugalo en canchero.uy`
  ];
  const texto = lines.join('\n');
  // Antes esto compartia un chorro de texto pelado. Ahora se muestra una FICHA:
  // se ve el jugador, el rango, los numeros grandes y la vitrina, como una figurita.
  // Desde ahi se comparte (imagen si el navegador deja, texto si no).
  fichaCompartir({ rango, nivelF, valor, clubes, trofArr, texto });
};
// Ficha visual de fin de carrera, estilo figurita/carta.
function fichaCompartir(D){
  const m = document.getElementById('carrera-modal') || overlay();
  const esLeyenda = D.rango === 'LEYENDA';
  const oro = esLeyenda ? '#facc15' : A;
  const kb = kitOf(G.pais || 'Uruguay');
  m.innerHTML = `
  <div style="min-height:100%;background:radial-gradient(120% 90% at 50% 0%, #16200e 0%, #05070a 62%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:22px 16px calc(26px + env(safe-area-inset-bottom));box-sizing:border-box;">
    <div id="ly-ficha" style="width:100%;max-width:380px;border-radius:22px;overflow:hidden;position:relative;background:linear-gradient(165deg,#1b2411 0%,#0a0d07 55%,#05070a 100%);border:2px solid ${oro}66;box-shadow:0 18px 60px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.08);">
      <div style="position:absolute;inset:0;background:radial-gradient(70% 45% at 50% 0%, ${oro}22 0%, transparent 70%);pointer-events:none;"></div>
      <div style="position:relative;padding:16px 18px 0;display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:9.5px;font-weight:900;letter-spacing:2px;color:${oro};">CANCHERO LEYENDA</div>
        <div style="font-size:9.5px;font-weight:900;letter-spacing:1.5px;color:#7d8a74;">${esc(String(G.pais||''))}</div>
      </div>
      <div style="position:relative;display:flex;align-items:flex-end;justify-content:center;padding:6px 0 0;min-height:120px;">
        ${avatarSprite(G.avatar||avatarDefault(), { edad:(G.edad||30), kitBase:kb[0], kitTxt:kb[1], num:G.num||10, apellido:G.apellido||'', escala:1.9 })}
      </div>
      <div style="position:relative;text-align:center;padding:2px 18px 0;">
        <div style="display:inline-flex;align-items:center;gap:6px;background:${oro}1f;border:1px solid ${oro}55;border-radius:20px;padding:4px 13px;margin-bottom:7px;">
          <i class='bx bxs-trophy' style="font-size:13px;color:${oro};"></i>
          <span style="font-size:10.5px;font-weight:900;letter-spacing:1.6px;color:${oro};">${esc(D.rango)}</span>
        </div>
        <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:30px;color:#fff;line-height:1;letter-spacing:-.5px;">${esc(G.apellido||'—')}</div>
        <div style="font-size:11.5px;color:#8c9781;font-weight:800;margin-top:5px;letter-spacing:.8px;">#${G.num||10} · ${esc(G.pos||'')} · ${esc(D.valor)}</div>
      </div>
      <div style="position:relative;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:14px 14px 0;">
        ${[['NIVEL',D.nivelF],['PJ',G.tot.pj],['GOLES',G.tot.g],['ASIST',G.tot.a]].map(c=>`
          <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:11px;padding:9px 2px;text-align:center;">
            <div style="font-size:18px;font-weight:900;color:#fff;line-height:1;">${esc(String(c[1]))}</div>
            <div style="font-size:8px;color:#79836f;font-weight:900;letter-spacing:1px;margin-top:4px;">${c[0]}</div>
          </div>`).join('')}
      </div>
      ${D.trofArr.length?`
      <div style="position:relative;padding:12px 16px 0;">
        <div style="font-size:8.5px;font-weight:900;letter-spacing:1.6px;color:${oro};margin-bottom:7px;">VITRINA · ${D.trofArr.length}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;">
          ${D.trofArr.slice(0,6).map(t=>`<span style="font-size:9.5px;font-weight:800;color:#d8e0cf;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:9px;padding:4px 8px;">${esc(t)}</span>`).join('')}
          ${D.trofArr.length>6?`<span style="font-size:9.5px;font-weight:900;color:${oro};padding:4px 6px;">+${D.trofArr.length-6}</span>`:''}
        </div>
      </div>`:''}
      <div style="position:relative;padding:12px 16px 16px;">
        <div style="font-size:8.5px;font-weight:900;letter-spacing:1.6px;color:#79836f;margin-bottom:6px;">TRAYECTORIA</div>
        <div style="font-size:10.5px;color:#b9c4ad;font-weight:700;line-height:1.6;">${esc(D.clubes.slice(0,6).join(' → '))}${D.clubes.length>6?' +'+(D.clubes.length-6):''}</div>
      </div>
      <div style="position:relative;background:rgba(0,0,0,.42);border-top:1px solid rgba(255,255,255,.07);padding:9px;text-align:center;font-size:9.5px;font-weight:900;letter-spacing:1.4px;color:#6d7766;">canchero.uy</div>
    </div>
    <div style="display:flex;gap:9px;width:100%;max-width:380px;margin-top:16px;">
      <button onclick="window._lyFichaCompartir()" style="flex:1;background:${oro};border:0;color:#0a0d07;border-radius:13px;padding:14px;font-weight:900;font-size:13.5px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;">
        <i class='bx bx-share-alt' style="font-size:17px;"></i> Compartir
      </button>
      <button onclick="window._carreraHub()" style="background:rgba(255,255,255,.06);border:1px solid #2a3222;color:#cfd8c6;border-radius:13px;padding:14px 18px;font-weight:900;font-size:13.5px;cursor:pointer;">Volver</button>
    </div>
  </div>`;
  window._lyFichaTexto = D.texto;
  window._lyFichaDatos = D;   // lo usa el canvas al compartir
}
// Compartir desde la ficha: intenta imagen; si no se puede, va el texto.
// Compartir de verdad una IMAGEN. Antes esto dependía de html2canvas, que nunca
// estuvo cargado en la página: la promesa fallaba y siempre terminabas
// compartiendo texto pelado. Ahora la ficha se dibuja a mano en un canvas, sin
// librerías y sin pedir nada de afuera, así que la imagen sale siempre.
function fichaCanvas(D){
  const W = 720, H = 1080, S = 1;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  const oro = D.rango === 'LEYENDA' ? '#facc15' : A;
  // Fondo
  const g = x.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#1b2411'); g.addColorStop(.55,'#0a0d07'); g.addColorStop(1,'#05070a');
  x.fillStyle = g; x.fillRect(0,0,W,H);
  const halo = x.createRadialGradient(W/2,0,10,W/2,0,W*0.9);
  halo.addColorStop(0, oro+'33'); halo.addColorStop(1,'transparent');
  x.fillStyle = halo; x.fillRect(0,0,W,H*0.6);
  // Marco
  x.strokeStyle = oro+'88'; x.lineWidth = 5;
  x.strokeRect(10,10,W-20,H-20);
  const centro = (t, y, size, col, peso) => {
    x.font = (peso||900)+' '+size+'px Outfit, Arial, sans-serif';
    x.fillStyle = col; x.textAlign = 'center'; x.fillText(t, W/2, y);
  };
  centro('CANCHERO LEYENDA', 62, 20, oro);
  centro((G.pais||'').toUpperCase(), 92, 15, '#7d8a74');
  // Rango
  centro(D.rango, 168, 26, oro);
  // Nombre y datos
  centro((G.apellido||'—').toUpperCase(), 250, 74, '#ffffff');
  centro('#'+(G.num||10)+'   ·   '+(G.pos||'')+'   ·   '+D.valor, 292, 22, '#8c9781');
  // Números grandes
  const cifras = [['NIVEL',D.nivelF],['PJ',G.tot.pj],['GOLES',G.tot.g],['ASIST',G.tot.a]];
  cifras.forEach((cf,i)=>{
    const cw = (W-80)/4, cx = 40 + cw*i + cw/2;
    x.fillStyle = 'rgba(255,255,255,.06)';
    x.fillRect(40 + cw*i + 6, 340, cw-12, 108);
    x.font = '900 40px Outfit, Arial'; x.fillStyle = '#fff'; x.textAlign='center';
    x.fillText(String(cf[1]), cx, 392);
    x.font = '900 15px Outfit, Arial'; x.fillStyle = '#79836f';
    x.fillText(cf[0], cx, 424);
  });
  // Vitrina
  let y = 512;
  x.textAlign = 'left';
  x.font = '900 17px Outfit, Arial'; x.fillStyle = oro;
  x.fillText('VITRINA · ' + D.trofArr.length, 46, y); y += 34;
  x.font = '700 20px Outfit, Arial'; x.fillStyle = '#d8e0cf';
  D.trofArr.slice(0,7).forEach(t=>{ x.fillText('•  ' + t, 52, y); y += 32; });
  if (D.trofArr.length > 7){ x.fillStyle = oro; x.fillText('+ ' + (D.trofArr.length-7) + ' más', 52, y); y += 32; }
  // Trayectoria
  y = Math.max(y + 22, 810);
  x.font = '900 17px Outfit, Arial'; x.fillStyle = '#79836f';
  x.fillText('TRAYECTORIA', 46, y); y += 32;
  x.font = '700 19px Outfit, Arial'; x.fillStyle = '#b9c4ad';
  // El recorrido puede ser largo: se parte en renglones que entren en la ficha.
  let linea = '';
  D.clubes.forEach((cl,i)=>{
    const prueba = linea ? (linea + ' → ' + cl) : cl;
    if (x.measureText(prueba).width > W-100){ x.fillText(linea, 52, y); y += 30; linea = cl; }
    else linea = prueba;
  });
  if (linea) x.fillText(linea, 52, y);
  // Pie
  x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, H-70, W, 70);
  centro('canchero.uy', H-28, 20, '#8d9782');
  return c;
}
window._lyFichaCompartir = function(){
  const texto = window._lyFichaTexto || '';
  const D = window._lyFichaDatos;
  const soloTexto = ()=>{
    try{
      if (navigator.share){ navigator.share({ title:'Mi carrera en Canchero Leyenda', text: texto }).catch(()=>{}); return; }
    }catch(e){}
    try{ navigator.clipboard.writeText(texto); alert('¡Copiado! Pegalo en tus redes.\n\n'+texto); }
    catch(e){ prompt('Copiá y compartí tu carrera:', texto); }
  };
  if (!D){ soloTexto(); return; }
  let canvas;
  try { canvas = fichaCanvas(D); } catch(e){ soloTexto(); return; }
  canvas.toBlob(function(blob){
    if (!blob){ soloTexto(); return; }
    const file = new File([blob], 'canchero-leyenda.png', { type:'image/png' });
    // Compartir la imagen si el sistema deja; si no, se descarga.
    try{
      if (navigator.canShare && navigator.canShare({ files:[file] })){
        navigator.share({ files:[file], title:'Mi carrera en Canchero Leyenda', text: texto }).catch(()=>{});
        return;
      }
    }catch(e){}
    try{
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'canchero-leyenda.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
    }catch(e){ soloTexto(); }
  }, 'image/png');
};
// ══════════════════════════════════════════════════════════════════════════════
// MODO AUTOMÁTICO ("play")
// Apretás play y la vida se juega sola: el personaje decide, juega las
// temporadas y avanza los años mientras vos mirás. En cuanto tocás Pausa (o
// cualquier cosa de la pantalla) el control vuelve a ser tuyo, en el punto exacto
// donde estaba. Se puede prender y apagar todas las veces que quieras.
//
// No simula por dentro: MANEJA LA MISMA INTERFAZ que usarías vos. Asi no hay dos
// motores que se puedan desincronizar, y lo que ves es lo que hubiera pasado.
// ══════════════════════════════════════════════════════════════════════════════
let AUTO = { on:false, timer:null, pasos:0 };
// Botones que el automático NUNCA toca: sacan del juego o borran la partida.
const AUTO_PROHIBIDO = /(salir|volver|atr[áa]s|nueva carrera|cerrar|ranking|idioma|c[óo]mo se juega|saltar|compartir|ritmo|listo|logros|ir a canchero)/i;
// Botones que hacen AVANZAR el juego: tienen prioridad sobre las decisiones.
const AUTO_AVANZA = /(continuar|seguir|jugar temporada|ver retiro|empezar|dale|siguiente|entrar|confirmar|aceptar|firmar)/i;
function autoBotones(){
  const m = document.getElementById('carrera-modal'); if(!m) return [];
  return Array.prototype.slice.call(m.querySelectorAll('button'))
    .filter(b=>{
      if (b.disabled) return false;
      const t = (b.textContent||'').trim();
      if (!t) return false;                       // botones de solo icono (X, flechas)
      if (AUTO_PROHIBIDO.test(t)) return false;
      return true;
    });
}
function autoPaso(){
  if (!AUTO.on) return;
  try{
    // 1) Si estás caminando por el mundo, el personaje va solo a lo importante.
    if (VJ && VJ.activo && !document.getElementById('carrera-modal')){
      const destacado = (VJ.hotspots||[]).filter(h=>h.destacado && !h.bloqueado && h.accion!=='nada');
      const obj = destacado.length ? destacado[0] : null;
      if (obj){ VJ.hot = obj; vjInteractuar(); }
      return;
    }
    // 2) En pantalla: primero lo que hace avanzar, si no una decisión al azar.
    const btns = autoBotones();
    if (!btns.length) return;
    const avanzar = btns.filter(b=>AUTO_AVANZA.test((b.textContent||'').trim()));
    const elegido = avanzar.length ? avanzar[avanzar.length-1] : pick(btns);
    AUTO.pasos++;
    elegido.click();
  }catch(e){ /* si algo falla, el automático no puede romper la partida */ }
}
window._lyAuto = function(encender){
  AUTO.on = (encender == null) ? !AUTO.on : !!encender;
  clearInterval(AUTO.timer); AUTO.timer = null;
  if (AUTO.on){
    AUTO.pasos = 0;
    // Ritmo tranquilo: se tiene que poder LEER lo que va pasando.
    AUTO.timer = setInterval(autoPaso, 1800);
  }
  autoIndicador();
};
// Cartelito flotante: siempre se ve si está en automático, y se apaga desde ahí.
function autoIndicador(){
  let d = document.getElementById('carrera-auto');
  if (!AUTO.on){ if(d) d.remove(); return; }
  if (!d){
    d = document.createElement('div');
    d.id = 'carrera-auto';
    d.style.cssText = 'position:fixed;z-index:100071;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom, 0px) + 14px);display:flex;align-items:center;gap:9px;background:rgba(10,12,10,.92);backdrop-filter:blur(8px);border:1.5px solid '+A+'88;border-radius:22px;padding:9px 15px;box-shadow:0 6px 24px rgba(0,0,0,.6);cursor:pointer;';
    d.innerHTML = "<i class='bx bx-pause-circle' style=\"font-size:19px;color:"+A+";\"></i><span style=\"font-size:12px;font-weight:900;letter-spacing:.6px;color:"+A+";\">AUTOMÁTICO — tocá para retomar</span>";
    d.onclick = function(){ window._lyAuto(false); };
    document.body.appendChild(d);
  }
}
// ── SECCIÓN PLEGABLE (para que el resumen final no sea un muro infinito) ──────
// Por defecto cerrada salvo que se pida abierta. Guarda el estado en G._abiertas.
function seccion(id, icono, titulo, color, contenido, abierta, badge){
  if(!contenido) return '';
  const ab = (G && G._abiertas && G._abiertas[id] != null) ? G._abiertas[id] : !!abierta;
  return `<div class="cr-fade cr-fade-d2" style="margin-top:10px;">
    <button onclick="window._toggleSec('${id}')" style="width:100%;display:flex;align-items:center;gap:9px;background:linear-gradient(160deg,${color}12,rgba(20,22,18,.55));border:1px solid ${color}35;border-radius:13px;padding:12px 14px;cursor:pointer;text-align:left;">
      <i class='bx ${icono}' style="font-size:19px;color:${color};flex-shrink:0;"></i>
      <span style="flex:1;font-family:Outfit,sans-serif;font-weight:900;font-size:12.5px;letter-spacing:1.2px;color:${color};">${titulo}</span>
      ${badge?`<span style="font-size:11px;font-weight:900;color:#fff;background:${color}28;border-radius:11px;padding:2px 9px;">${badge}</span>`:''}
      <i class='bx bx-chevron-${ab?'up':'down'}' id="sec-i-${id}" style="font-size:20px;color:${color};flex-shrink:0;"></i>
    </button>
    <div id="sec-${id}" style="display:${ab?'block':'none'};padding-top:9px;">${contenido}</div>
  </div>`;
}
window._toggleSec = function(id){
  const el = document.getElementById('sec-'+id), ic = document.getElementById('sec-i-'+id);
  if(!el) return;
  const ab = el.style.display !== 'none';
  el.style.display = ab ? 'none' : 'block';
  if(ic) ic.className = 'bx bx-chevron-' + (ab ? 'down' : 'up');
  if(G){ if(!G._abiertas) G._abiertas = {}; G._abiertas[id] = !ab; save(); }
};
function cell(l, v, col){ col = col || '#fff'; return `<div style="background:#0d100d;border:1px solid #1c1c1c;border-radius:12px;padding:11px 4px;text-align:center;"><div style="font-size:20px;font-weight:900;color:${col};line-height:1;">${esc(v)}</div><div style="font-size:9px;color:#666;font-weight:800;letter-spacing:1px;margin-top:5px;">${l}</div></div>`; }
function st2(l,v){ return `<div style="background:rgba(255,255,255,.04);border:1px solid #1e1e1e;border-radius:12px;padding:12px;"><div style="font-size:9px;color:#666;font-weight:800;letter-spacing:1px;">${l}</div><div style="font-size:16px;font-weight:900;color:${A};margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(v)}</div></div>`; }

// ── ENLACE DIRECTO AL JUEGO ──────────────────────────────────────────────────
// Si alguien entra por /leyenda (o con ?juego=leyenda) y por lo que sea le llega
// el index de Canchero en vez de leyenda.html —porque todavía no se desplegó la
// página nueva, porque un proxy sirvió el shell de la PWA, o porque compartieron
// el link con parámetros— el juego se abre igual, encima del home. Así el link
// nunca "no hace nada".
(function(){
  try{
    if (window.CANCHERO_LEYENDA_STANDALONE) return;          // ya está en su propia página
    const ruta = (location.pathname || '').replace(/\/+$/, '').toLowerCase();
    const q = (location.search || '').toLowerCase();
    const pide = /\/leyenda$/.test(ruta) || /[?&]juego=leyenda/.test(q) || /[?&]leyenda(=|&|$)/.test(q);
    if (!pide) return;
    const abrir = function(){
      if (document.getElementById('carrera-modal')) return;
      try { window._carreraStart(); } catch(e){ console.warn('[carrera] no se pudo abrir', e); }
    };
    if (document.readyState === 'complete') setTimeout(abrir, 400);
    else window.addEventListener('load', function(){ setTimeout(abrir, 400); });
  }catch(e){}
})();

console.log('[canchero-carrera] v2 cargado');
})();
