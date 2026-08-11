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
const TROFEO_MAP = {
  // Internacionales de clubes
  'champions league':'champions','uefa champions league':'champions',
  'champions league de asia':'champions','concachampions':'champions',
  'europa league':'europa','conference league':'europa',
  'copa libertadores':'libertadores','copa sudamericana':'sudamericana',
  'mundial de clubes':'mundial-clubes','intercontinental':'intercontinental',
  // Selecciones
  'mundial':'mundial','copa del mundo':'mundial',
  'eurocopa':'eurocopa','copa américa':'copa-america','copa america':'copa-america',
  'oro olímpico':'oro-olimpico','oro olimpico':'oro-olimpico',
  // Ligas nacionales (torneo local)
  'laliga':'laliga','la liga':'laliga',
  'premier league':'premier',
  'ligue 1':'ligue1',
  'serie a':'coppa-italia',
  'brasileirão':'copa-brasil','brasileirao':'copa-brasil',
  'primeira liga':'copa-portugal',
  'campeonato uruguayo':'liga-uy',
  // Copas nacionales con imagen propia
  'copa italia':'coppa-italia','coppa italia':'coppa-italia',
  'copa argentina':'copa-argentina',
  'copa do brasil':'copa-brasil',
  'copa de portugal':'copa-portugal',
  'copa chile':'copa-chile',
  'copa auf':'liga-uy'
};
function trofeoImgSlug(nombre){
  const n = (nombre||'').toLowerCase().trim();
  if (TROFEO_MAP[n]) return TROFEO_MAP[n];
  // Fuzzy sólo para nombres muy conocidos (no meter falsos positivos).
  if (n.includes('champions')) return 'champions';
  if (n.includes('libertadores')) return 'libertadores';
  if (n.includes('sudamericana')) return 'sudamericana';
  if (n.includes('europa') || n.includes('conference')) return 'europa';
  if (n.includes('mundial de clubes')) return 'mundial-clubes';
  if (n.includes('intercontinental')) return 'intercontinental';
  // Sin match → null (UI renderiza icono genérico dorado con el nombre).
  return null;
}
// Renderiza un trofeo: usa imagen si hay slug; si no, un icono genérico dorado.
function trofeoRender(nombre, size){
  const slug = trofeoImgSlug(nombre);
  const s = size || 60;
  if (slug) return `<img src="img/trofeos/${slug}.webp" alt="" style="max-height:${s}px;max-width:100%;object-fit:contain;filter:drop-shadow(0 4px 12px rgba(250,204,21,.35));" onerror="this.style.display='none'">`;
  return `<div style="width:${s}px;height:${s}px;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 35%, #facc15 0%, #b8860b 65%, #6b4d08 100%);border-radius:50%;box-shadow:0 4px 12px rgba(250,204,21,.35), inset 0 -6px 12px rgba(0,0,0,.35), inset 0 4px 8px rgba(255,255,255,.35);"><i class='bx bxs-trophy' style="font-size:${Math.round(s*0.55)}px;color:#fff8dc;text-shadow:0 1px 2px rgba(0,0,0,.4);"></i></div>`;
}
// Premios individuales — se mostrarán como logros aparte.
function premioImgSlug(nombre){
  const n = (nombre||'').toLowerCase();
  if (n.includes('balón de oro') || n.includes('balon de oro')) return 'balon-oro';
  if (n.includes('the best')) return 'the-best';
  if (n.includes('fifa mejor') || n.includes('mejor jugador de la fifa')) return 'fifa-mejor';
  if (n.includes('bota de oro')) return 'bota-oro';
  if (n.includes('guante')) return 'guante-oro';
  if (n.includes('joven')) return 'mejor-joven';
  return null;
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
  const apeLen = Math.min(140, 11*apeUp.length);
  const numLen = num.length>=2 ? 92 : 50;
  // Sin ningún background alrededor (transparent). Nombre MÁS ARRIBA (y=82) y número
  // MÁS GRANDE (font 76) — más parecido a camiseta real.
  return `<div style="position:relative;width:${s}px;height:${s}px;display:inline-block;background:transparent;">
    <div style="position:absolute;inset:0;background:${base};${maskCSS}"></div>
    ${pattern}
    <img src="${JERSEY_PNG}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;mix-blend-mode:multiply;pointer-events:none;background:transparent;-webkit-mask:url('${JERSEY_PNG}') center/contain no-repeat;mask:url('${JERSEY_PNG}') center/contain no-repeat;">
    <svg viewBox="0 0 240 240" width="${s}" height="${s}" style="position:absolute;inset:0;pointer-events:none;background:transparent;" xmlns="http://www.w3.org/2000/svg">
      <text x="120" y="82" text-anchor="middle" font-family="Outfit,Arial" font-weight="800" font-size="16" fill="${txt}" textLength="${apeLen}" lengthAdjust="spacingAndGlyphs" style="letter-spacing:1.2px;paint-order:stroke;stroke:rgba(0,0,0,.28);stroke-width:.5;">${apeUp}</text>
      <text x="120" y="168" text-anchor="middle" font-family="Outfit,Arial" font-weight="900" font-size="76" fill="${txt}" textLength="${numLen}" lengthAdjust="spacingAndGlyphs" style="paint-order:stroke;stroke:rgba(0,0,0,.30)  ;stroke-width:1;">${num}</text>
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
  // padding-top con safe-area para que el "← Juegos" no quede detrás del status bar.
  m.style.cssText='position:fixed;inset:0;z-index:100060;background:#0a0c0a;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-top:env(safe-area-inset-top, 0px);';
  document.body.appendChild(m); return m;
}

// ── INTRO ───────────────────────────────────────────────────────────────────────
window._carreraStart = function(){
  const m=overlay(); const saved=load();
  m.innerHTML=`
  <div style="position:relative;min-height:100%;background:#0a0c0a;">
    <!-- Fondo del juego (Maradona/Pelé/Messi/Ronaldinho/CR7): tapa toda la intro con
         opacidad para que el texto sea legible, y funde a negro abajo. -->
    <div style="position:absolute;inset:0;background:url('img/carrera/fondo-intro.webp?v=1') center/cover no-repeat;opacity:.42;pointer-events:none;"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(180deg, rgba(10,12,10,.35) 0%, rgba(10,12,10,.55) 55%, #0a0c0a 100%);pointer-events:none;"></div>
    <div style="position:absolute;inset:0;background:repeating-linear-gradient(90deg, rgba(186,255,0,.03) 0 2px, transparent 2px 40px);pointer-events:none;"></div>
    <div style="position:relative;max-width:560px;margin:0 auto;padding:20px 20px calc(30px + env(safe-area-inset-bottom));min-height:100%;display:flex;flex-direction:column;align-items:center;text-align:center;">
      <div class="cg-back-wrap"><button class="cg-back" onclick="document.getElementById('carrera-modal').remove();window.openGamesModal&&window.openGamesModal()"><i class='bx bx-arrow-back'></i> Juegos</button></div>
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
  </div>`;
  if(!window._crDif) window._crDif='normal';
  setTimeout(function(){ var b=document.querySelector('#cr-dif-row button[data-dif="'+(window._crDif)+'"]'); if(b){ b.style.borderColor=A; b.style.background='rgba(255,255,255,.08)'; } },30);
};

// ── IDENTIDAD ───────────────────────────────────────────────────────────────────
let _draft=null;
window._carreraIdent = function(years){
  _draft = _draft || { years, apellido:(me().name||'').split(' ').slice(-1)[0]||'', num:10, pie:'Derecha', pais:(me().nat||me().country||'Uruguay'), pos:'DC', filtro:'' };
  _draft.dif = window._crDif || 'normal';
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
      <button onclick="window._carreraPotrero()" style="flex:2;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:12px;padding:14px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;">Confirmar identidad</button>
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

// ── POTRERO (10-15 años, antes de la carrera) ────────────────────────────────
// Tres mini-decisiones infantiles que dan un bonus/malus inicial a tu carrera.
// Rápido: 3 pantallas → cantera.
const POTRERO_POOL = [
  { t:'El picado del barrio', d:'Tenés 11 años. Clásico del barrio, tu equipo pierde 2-0 y te toca patear un penal decisivo.', opts:[
    { txt:'Amagar al arquero (arriesgado)', ef:g=>{ const gol=Math.random()<.55; g._potBonus=(g._potBonus||0)+(gol?3:-2); return gol?'¡Gol! Todo el barrio grita tu nombre.':'La atajó. Te vas llorando.'; } },
    { txt:'Definir al palo con potencia', ef:g=>{ const gol=Math.random()<.75; g._potBonus=(g._potBonus||0)+(gol?2:-1); return gol?'¡Gol! Los pibes te alzan en andas.':'La tiraste afuera.'; } }
  ] },
  { t:'Elegí tu ídolo', d:'A los 12 ya sabés a quién imitar. ¿A quién vas a parecerte cuando jugás?', opts:[
    { txt:'Un 10 clásico (Riquelme / Zidane)', ef:g=>{ g._potBonus=(g._potBonus||0)+2; g._potStyle='crack'; return 'Vas a jugar con la cabeza levantada. La pausa es tu firma.'; } },
    { txt:'Un killer (Suárez / Ronaldo)', ef:g=>{ g._potBonus=(g._potBonus||0)+2; g._potStyle='killer'; return 'Ir al gol es tu religión.'; } },
    { txt:'Un guerrero (Vidal)', ef:g=>{ g._potBonus=(g._potBonus||0)+1; g._potStyle='guerrero'; return 'La cancha es guerra. Nunca te rendís.'; } }
  ] },
  { t:'Ojeadores te vinieron a ver', d:'A los 14 años, DOS ojeadores de distintos clubes de tu país te vieron. Uno grande, otro chico. Ambos te invitan a probarte.', opts:[
    { txt:'Elegir dónde probarme', prueba:true },
    { txt:'No ir, seguir en el barrio', ef:g=>{ g._potBonus=(g._potBonus||0)+1; return 'Preferís madurar sin apuro.'; } }
  ] },
  { t:'Se rompió la pelota', d:'Media cuadra juega descalzos y la única pelota se pinchó. Los pibes miran para vos.', opts:[
    { txt:'Poner mis ahorros para otra', ef:g=>{ g._potBonus=(g._potBonus||0)+2; return 'Te dejaste los pesos del kiosco pero salvaste la tarde. Sos líder.'; } },
    { txt:'Jugar con la pelota de trapo', ef:g=>{ g._potBonus=(g._potBonus||0)+1; return 'Aprendiste a pegarle sin superficie perfecta. Toque fino.'; } }
  ] },
  { t:'Prueba en un club grande vs debut en el chico', d:'Con 13, un club chico te ofrece jugar oficial. El grande te dice "vení a probarte, después vemos".', opts:[
    { txt:'Ir a jugar al chico', ef:g=>{ g._potBonus=(g._potBonus||0)+2; return 'Debutás oficial. Rodaje real desde pibe.'; } },
    { txt:'Elegir club y probarme', prueba:true }
  ] },
  { t:'Mudanza familiar', d:'Tu viejo consigue laburo en la capital y hay que mudarse. Chau equipo del barrio — pero allá hay clubes de verdad.', opts:[
    { txt:'Buscar dónde probarme en la ciudad nueva', prueba:true },
    { txt:'Rebelarme y no querer jugar', ef:g=>{ g._potBonus=(g._potBonus||0)-3; return 'Perdiste meses de fútbol. Costó volver al ritmo.'; } }
  ] },
  { t:'Bullying en la escuela', d:'Un grupo del cole te carga por gastar tanto tiempo en la pelota. Te empujan.', opts:[
    { txt:'Callarme y seguir entrenando', ef:g=>{ g._potBonus=(g._potBonus||0)+2; return 'El fútbol fue tu refugio. Aprendiste a canalizar todo ahí.'; } },
    { txt:'Encararlos', ef:g=>{ const b=Math.random()<.5; g._potBonus=(g._potBonus||0)+(b?1:-2); return b?'Se calmó la cosa. Aprendiste a hacerte respetar.':'Terminaste suspendido. Casi te sacan de la cancha.'; } }
  ] },
  { t:'Torneo intercolegial', d:'Tu escuela juega el interzonal. Un ojeador amateur promete estar en la final.', opts:[
    { txt:'Ser el capitán y organizar al equipo', ef:g=>{ g._potBonus=(g._potBonus||0)+2; return 'Metiste al equipo en la final. Te vieron mandar.'; } },
    { txt:'Jugar solo para lucirme', ef:g=>{ const b=Math.random()<.5; g._potBonus=(g._potBonus||0)+(b?3:-2); return b?'Metiste 4 goles y salieron campeones.':'Perdiste amigos y el partido.'; } }
  ] },
  { t:'Lesión temprana', d:'Con 13, corrés descalzo y te clavás algo en el pie. Duele feo.', opts:[
    { txt:'Parar y esperar cicatrización', ef:g=>{ g._potBonus=(g._potBonus||0)+1; return 'Un mes sin cancha. Volviste entero.'; } },
    { txt:'Aguantar y seguir jugando', ef:g=>{ const mal=Math.random()<.6; g._potBonus=(g._potBonus||0)+(mal?-3:1); return mal?'Se infectó. Perdiste toda la temporada.':'Aguantaste bien. Nadie se enteró.'; } }
  ] },
  { t:'Elección de posición', d:'El técnico infantil te pregunta dónde te sentís cómodo. Es tu edad de definir.', opts:[
    { txt:'Donde el equipo me necesite', ef:g=>{ g._potBonus=(g._potBonus||0)+2; return 'Multifunción desde chico. El DT te ama.'; } },
    { txt:'De 10, siempre', ef:g=>{ g._potBonus=(g._potBonus||0)+1; return 'Elegiste el número mágico. Ahora hay que bancarlo.'; } }
  ] }
];
// 3 eventos al azar del pool (no repetidos), la carrera se siente distinta cada vez.
function potreroEventosDeCarrera(){
  const shuffled = POTRERO_POOL.slice().sort(()=>Math.random()-0.5);
  return shuffled.slice(0, 3);
}
const POTRERO_EVENTOS = [];  // se llena por carrera con potreroEventosDeCarrera()
window._carreraPotrero = function(paso){
  paso = paso || 0;
  const _draftGet = () => _draft;
  const d = _draftGet();
  if (!d) { window._carreraLen(); return; }
  if (!d._potHist) d._potHist = [];
  // Elegí 3 eventos AL AZAR al inicio de la carrera (no siempre los mismos).
  if (!d._potSet) d._potSet = potreroEventosDeCarrera();
  if (paso >= d._potSet.length) { window._carreraOfertas(); return; }
  const ev = d._potSet[paso];
  const m = document.getElementById('carrera-modal') || overlay();
  const edadInfantil = 11 + paso * (paso===0?0:paso===1?1:2); // 11, 12, 14
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:22px 20px calc(30px + env(safe-area-inset-bottom));">
    <div class="cg-back-wrap"><button class="cg-back" onclick="window._carreraIdent(_draftYears())"><i class='bx bx-arrow-back'></i> Identidad</button></div>
    <div style="text-align:center;margin:14px 0 18px;">
      <div style="font-size:11px;font-weight:900;letter-spacing:2px;color:${A};">POTRERO · ${edadInfantil} AÑOS</div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:26px;color:#fff;margin-top:6px;line-height:1.1;">${esc(ev.t)}</div>
    </div>
    <div style="background:linear-gradient(160deg,rgba(186,255,0,.06),rgba(20,22,18,.5));border:1px solid #242424;border-radius:16px;padding:16px;">
      ${decoImg('potrero')}
      <div style="font-size:13.5px;color:#c4ccc0;line-height:1.6;margin-bottom:14px;">${ev.d}</div>
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
  let out = todosClubs().filter(c=>c.pais===pais && c.str>=50 && c.str<=74).sort(()=>Math.random()-0.5).slice(0, n||3);
  if(out.length < (n||3)){
    const ciudades = (CIUDADES[pais]||['Central','Norte','Sur','Unión']).slice().sort(()=>Math.random()-0.5);
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
  const decs = PRUEBA_DECS.slice().sort(()=>Math.random()-0.5).slice(0,3);
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
      <button onclick="window._carreraPotrero(${paso+1})" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:13px 30px;font-weight:900;cursor:pointer;">${paso+1>=(d._potSet||[]).length?'Ir a la cantera':'Continuar'} <i class='bx bx-right-arrow-alt'></i></button>
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
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
    <div style="max-width:520px;margin:0 auto;padding:60px 20px 40px;text-align:center;">
      <div style="font-size:11px;font-weight:900;letter-spacing:2px;color:${A};margin-bottom:12px;">${esc(ev.t)}</div>
      <div style="font-size:16px;color:#fff;font-weight:700;line-height:1.6;margin-bottom:26px;">${esc(res)}</div>
      <button onclick="window._carreraPotrero(${paso+1})" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:13px 30px;font-weight:900;cursor:pointer;">${paso+1>=(_draft._potSet||[]).length?'Ir a la cantera':'Continuar'} <i class='bx bx-right-arrow-alt'></i></button>
    </div>`;
};

// ── OFERTAS DE CANTERA ───────────────────────────────────────────────────────────
window._carreraOfertas = function(){
  const d=_draft;
  // Clubes de cantera DEL PAÍS del jugador (un brasileño no arranca en Salto). Se prioriza
  // clubes reales de ese país con str bajo/medio; si no alcanzan 3, se generan clubes
  // amateur/barrio de ciudades de ese país. Así el arranque es lógico y local.
  let cantera = todosClubs().filter(c=>c.pais===d.pais && c.str>=50 && c.str<=72).sort(()=>Math.random()-0.5).slice(0,3);
  // Si quedaste en una prueba del potrero, ese club encabeza la oferta (efecto real).
  if (d._potClubPref){
    cantera = cantera.filter(c=>c.name !== d._potClubPref.name).slice(0,2);
    cantera.unshift(d._potClubPref);
  }
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
// ── RIVAL / NÉMESIS ───────────────────────────────────────────────────────────
// Se genera al fichar: un jugador de tu misma camada y país que compite con vos
// TODA la carrera. Cada temporada simula sus números y se compara con los tuyos.
// Su relación con vos evoluciona (respeto / rivalidad / odio) según quién gane.
const RIVAL_NOMBRES = ['Ferreyra','Cardozo','Almeida','Sosa','Benítez','Núñez','Vargas','Ibáñez','Quintana','Bermúdez','Olivera','Rojas','Silveira','Acuña','Zambrano','Da Silva','Moretti','Kovač','Bakayoko','Lindqvist','Van Dijk','Okafor','Petrov','Haaland','Mbeki'];
function crearRival(pais, pos, nivel){
  return {
    nombre: pick(RIVAL_NOMBRES),
    pais,
    pos,
    nivel: clamp(nivel + ri(-3, 5), 40, 70),   // arranca parejo o un poco arriba
    club: 'Cantera rival',
    tot: { pj:0, g:0, a:0 },
    titulos: 0,
    // Relación: 0 = neutro, sube a "respeto" si te va bien y sos noble; baja a "odio".
    relacion: 0,
    // Historial de duelos ganados/perdidos
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
  if (Math.random() < clamp((R.nivel-70)/90, 0, 0.28)) R.titulos++;
  return { pj, g, a };
}
window._draftYears = function(){ return _draft?_draft.years:15; };
function flagImgInline(p){ const c=FLAG[p]; return c?`<img src="https://flagcdn.com/w20/${c}.png" style="width:14px;height:auto;vertical-align:-2px;border-radius:2px;">`:''; }

window._carreraFichar = function(i){
  const d=_draft; const c=d._ofertas[i];
  const base = d.pos==='POR'?48:50;
  // Bonus del POTRERO (10-15 años): decisiones infantiles suman/restan nivel inicial.
  const potBonus = d._potBonus || 0;
  const nivelInicial = clamp(base + potBonus, 40, 62);
  G = {
    apellido:d.apellido, num:d.num, pie:d.pie, pais:d.pais, pos:d.pos, years:d.years,
    edad:15, nivel:nivelInicial, club:c.name, liga:c.liga, clubStr:c.str, clubPais:c.pais,
    // Frecuencia REAL: la carrera arranca en 2026 (año del debut). Cada temporada +1 año.
    // Mundial 2030, Copa América 2028, Eurocopa 2028, JJOO 2028/2032.
    anio:2026,
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
    rival: crearRival(d.pais, d.pos, nivelInicial),
    // Legado del potrero: estilo elegido (crack/killer/guerrero) + bonus aplicado.
    estilo: d._potStyle || null, potBonus,
    dif:(d.dif||'normal'), creado:Date.now()
  };
  save(); window._carreraJuveniles(0);
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
    { txt:'Aceptar y liderar de verdad', ef:g=>{ g.nivel+=2; g.moral+=6; g._juvDisc=(g._juvDisc||0)+2; g.flags=g.flags||{}; g.flags.lider=true; return 'Te bancaste todas. Cuando subís a primera ya sabés hablar en un vestuario.'; } },
    { txt:'Rechazar, prefiero solo jugar', ef:g=>{ g.nivel+=1; return 'Sin cinta, sin presión extra. Concentrado en lo tuyo.'; } } ] },
  { t:'Un representante te busca a la salida', d:'Un agente te espera afuera del entrenamiento con un contrato de representación por 5 años y un adelanto en efectivo.', opts:[
    { txt:'Firmar y agarrar el adelanto', ef:g=>{ g.dinero+=12000; const b=Math.random()<.45; g.flags=g.flags||{}; g.flags.agenteMalo=!b; return b?'Resultó ser serio y te consiguió buenos contactos.':'Te ató 5 años a alguien que solo te quiere vender. Te va a costar zafar.'; } },
    { txt:'Consultarlo con mi familia primero', ef:g=>{ g._juvDisc=(g._juvDisc||0)+1; return 'Tu viejo lo hizo revisar por un abogado del sindicato. Te ahorraste un problema.'; } } ] }
];
function juvenilesDeCarrera(){ return JUVENILES_POOL.slice().sort(()=>Math.random()-0.5).slice(0,3); }
// Edad de retiro: la duración elegida se cuenta desde el DEBUT (17 o 18), no desde 16.
function edadRetiro(){ return ((G&&G.debutEdad)||16) + ((G&&G.years)||10); }
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
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
    <div style="max-width:520px;margin:0 auto;padding:60px 20px 40px;text-align:center;">
      <div style="font-size:11px;font-weight:900;letter-spacing:2px;color:#4fc3f7;margin-bottom:12px;">${esc(ev.t)}</div>
      <div style="font-size:16px;color:#fff;font-weight:700;line-height:1.6;margin-bottom:16px;">${esc(res)}</div>
      ${dNiv?`<div style="margin-bottom:22px;">${deltaChip('Nivel', dNiv)}</div>`:'<div style="margin-bottom:22px;"></div>'}
      <button onclick="window._carreraJuveniles(${paso+1})" style="background:linear-gradient(135deg,#0284c7,#4fc3f7);color:#fff;border:none;border-radius:13px;padding:13px 30px;font-weight:900;cursor:pointer;">${paso+1>=G._juvSet.length?'El día del debut':'Continuar'} <i class='bx bx-right-arrow-alt'></i></button>
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
  save();
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:50px 20px 40px;text-align:center;">
    <div style="display:flex;justify-content:center;margin-bottom:16px;">${jersey(140, G.apellido, G.num, G.pais)}</div>
    <div style="font-size:11px;font-weight:900;letter-spacing:3px;color:${A};margin-bottom:8px;">${temprano?'DEBUT PRECOZ':'DEBUT EN PRIMERA'}</div>
    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:28px;color:#fff;line-height:1.15;margin-bottom:10px;">${G.edad} años</div>
    <div style="font-size:14px;color:#c4ccc0;line-height:1.6;max-width:380px;margin:0 auto 22px;">${temprano
      ? `Tu trabajo en juveniles no pasó desapercibido. El técnico de primera te sube antes de tiempo: debutás en <b style="color:#fff;">${esc(G.club)}</b> con apenas ${G.edad} años.`
      : `Terminaste el proceso formativo completo. Subís a primera de <b style="color:#fff;">${esc(G.club)}</b> a los ${G.edad}, sin atajos pero con el oficio aprendido.`}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:320px;margin:0 auto 22px;">
      ${cell('NIVEL', Math.round(G.nivel), A)}
      ${cell('DISCIPLINA', disc>=3?'Alta':disc>=0?'Media':'Baja', disc>=3?'#22c55e':disc>=0?'#f59e0b':'#ef4444')}
    </div>
    <button onclick="window._carreraHub()" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:14px;padding:15px 34px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;box-shadow:0 10px 30px rgba(80,220,110,.3);">EMPEZAR MI CARRERA <i class='bx bx-right-arrow-alt'></i></button>
  </div>`;
};

// ── HUB DE CARRERA ───────────────────────────────────────────────────────────────
window._carreraHub = function(){
  if(!G) G=load(); if(!G){ window._carreraStart(); return; }
  const m=document.getElementById('carrera-modal')||overlay();
  const [c1,c2]=kitOf(G.pais);
  const tline = (G.timeline||[]).slice().sort((a,b)=>a.edad-b.edad);
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
          <div style="text-align:right;flex-shrink:0;"><div style="font-size:10px;color:#666;font-weight:800;">EDAD</div><div style="font-size:20px;font-weight:900;color:#fff;">${G.edad}</div><div style="font-size:9px;color:#666;margin-top:4px;">VALOR</div><div style="font-size:12px;font-weight:900;color:${A};">${eur(G.valor||0)}</div></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:14px;text-align:center;">
          <div style="flex:1;"><div style="font-size:10px;color:#666;font-weight:800;">PJ</div><div style="font-size:18px;font-weight:900;color:#fff;">${G.tot.pj}</div></div>
          <div style="flex:1;"><div style="font-size:10px;color:#666;font-weight:800;">GLS</div><div style="font-size:18px;font-weight:900;color:#fff;">${G.tot.g}</div></div>
          <div style="flex:1;"><div style="font-size:10px;color:#666;font-weight:800;">AST</div><div style="font-size:18px;font-weight:900;color:#fff;">${G.tot.a}</div></div>
          <div style="flex:1;"><div style="font-size:10px;color:#666;font-weight:800;">TÍTULOS</div><div style="font-size:18px;font-weight:900;color:${A};">${G.titulos}</div></div>
        </div>
        ${(function(){ const R=G.rival; if(!R||!(R.ganados+R.perdidos)) return ''; const rel=R.relacion||0; const relTxt=rel<=-40?'Te odia':rel<=-15?'Rivalidad picante':rel>=30?'Respeto mutuo':'Rivalidad'; return `<div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.03);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:8px 12px;"><div style="font-size:11px;color:#8a8f96;font-weight:800;"><i class='bx bx-target-lock' style="color:#ef4444;"></i> Duelo con ${esc(R.nombre)} · ${relTxt}</div><div style="font-size:12px;font-weight:900;color:#fff;"><span style="color:#22c55e;">${R.ganados}</span>—<span style="color:#ef4444;">${R.perdidos}</span></div></div>`; })()}
        ${(function(){ const F=G.flags||{}; const badges=[]; if(F.traidor) badges.push(['Traidor','#ef4444']); if(F.dopado&&!F.suspendido) badges.push(['Zona gris','#f59e0b']); if(F.suspendido) badges.push(['Sancionado','#ef4444']); if(F.ludopata) badges.push(['Ludopatía','#f59e0b']); if(F.deudaMafia) badges.push(['Deuda peligrosa','#dc2626']); if(F.arreglo) badges.push(['Amaño','#dc2626']); if(F.filantropo) badges.push(['Filántropo','#22c55e']); if(F.limpio) badges.push(['Limpio','#22c55e']); if(F.redimido) badges.push(['Redimido','#4fc3f7']); if(F.doblenac) badges.push(['Doble nacionalidad','#a78bfa']); if(F.villano) badges.push(['Villano','#ef4444']); if(!badges.length) return ''; return `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;">${badges.map(b=>`<span style="background:${b[1]}18;border:1px solid ${b[1]}55;color:${b[1]};border-radius:20px;padding:3px 9px;font-size:10px;font-weight:800;">${b[0]}</span>`).join('')}</div>`; })()}
        ${(function(){ const v=(G.idolatria&&G.idolatria[G.club])||0; const lbl=v>=70?'ÍDOLO ETERNO':v>=40?'Ídolo':v>=15?'Querido':v>=-10?'Uno más':v>=-40?'Cuestionado':'Odiado'; const col=v>=40?A:v>=15?'#4fc3f7':v>=-10?'#aaa':v>=-40?'#f59e0b':'#ef4444'; return `<div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.03);border:1px solid ${col}44;border-radius:10px;padding:8px 12px;"><div style="font-size:11px;color:#8a8f96;font-weight:800;"><i class='bx bx-heart' style="color:${col};"></i> Hinchada de ${esc(G.club)}</div><div style="font-size:12px;font-weight:900;color:${col};">${lbl} · ${v>0?'+':''}${v}</div></div>`; })()}
        <button onclick="window._carreraTemporada()" style="width:100%;margin-top:14px;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:12px;padding:14px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;">${G.edad>=edadRetiro()?'VER RETIRO':'JUGAR TEMPORADA '+G.temporada}  <i class='bx bx-right-arrow-alt'></i></button>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button onclick="window._carreraPedirSalida()" style="flex:1;background:rgba(239,68,68,.08);color:#f87171;border:1px solid rgba(239,68,68,.3);border-radius:12px;padding:11px;font-weight:800;font-size:12px;cursor:pointer;"><i class='bx bx-log-out'></i> Pedir salida</button>
          <button onclick="window._carreraBienes()" style="flex:1;background:rgba(250,204,21,.08);color:#facc15;border:1px solid rgba(250,204,21,.3);border-radius:12px;padding:11px;font-weight:800;font-size:12px;cursor:pointer;"><i class='bx bx-wallet'></i> Mis bienes</button>
        </div>
      </div>
      <!-- Línea de tiempo: TODAS las temporadas jugadas, con posición y trofeo -->
      <div style="background:rgba(255,255,255,.03);border:1px solid #1c1c1c;border-radius:16px;padding:8px 14px;">
        <div style="font-size:11px;font-weight:900;color:#9aa0a6;letter-spacing:.5px;padding:4px 0 8px;">HISTORIAL POR TEMPORADA</div>
        <div style="display:flex;font-size:10px;font-weight:800;color:#666;padding:6px 0;border-bottom:1px solid #1c1c1c;"><span style="width:30px;">EDAD</span><span style="flex:1;">CLUB</span><span style="width:34px;text-align:center;">POS</span><span style="width:30px;text-align:center;">NIV</span><span style="width:28px;text-align:center;">PJ</span><span style="width:28px;text-align:center;">GLS</span><span style="width:28px;text-align:center;">AST</span></div>
        ${tline.length?tline.map(t=>`<div style="display:flex;align-items:center;font-size:12px;padding:9px 0;border-bottom:1px solid #131313;color:#fff;">
          <span style="width:30px;font-weight:800;">${t.edad}</span>
          <span style="flex:1;display:flex;align-items:center;gap:7px;min-width:0;"><span style="flex-shrink:0;">${clubBadge(t.club,20)}</span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(t.club)}</span>${t.titulo?`<i class='bx bxs-trophy' title="${esc(t.titulo)}" style="color:${A};font-size:13px;flex-shrink:0;"></i>`:''}</span>
          <span style="width:34px;text-align:center;font-weight:800;color:${t.pos===1?A:t.pos<=4?'#4fc3f7':'#999'};">${t.pos?t.pos+'º':'—'}</span>
          <span style="width:30px;text-align:center;font-weight:900;color:${A};">${t.niv}</span>
          <span style="width:28px;text-align:center;">${t.pj}</span>
          <span style="width:28px;text-align:center;">${t.g}</span>
          <span style="width:28px;text-align:center;">${t.a}</span>
        </div>`).join(''):`<div style="text-align:center;padding:24px;color:#555;font-size:12px;">Jugá tu primera temporada para ver tu historial.</div>`}
      </div>
      ${(G.vitrina&&G.vitrina.length)?`<div style="background:rgba(255,255,255,.03);border:1px solid #1c1c1c;border-radius:16px;padding:14px;">
        <div style="font-size:11px;font-weight:900;color:#9aa0a6;letter-spacing:.5px;margin-bottom:10px;"><i class='bx bxs-trophy' style="color:${A};"></i> VITRINA · ${G.vitrina.length} título${G.vitrina.length!==1?'s':''}</div>
        <div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;">${G.vitrina.map(v=>`<div style="flex-shrink:0;width:78px;text-align:center;"><div style="height:54px;display:flex;align-items:center;justify-content:center;">${trofeoRender(v.nombre, 54)}</div><div style="font-size:9px;color:#ccc;font-weight:700;margin-top:4px;line-height:1.2;">${esc(v.nombre)}</div><div style="font-size:8px;color:#666;">${v.edad} años</div></div>`).join('')}</div>
      </div>`:''}
    </div>
  </div>`;
};

// ── TEMPORADA (simulación + decisión) ────────────────────────────────────────────
window._carreraTemporada = function(){
  if(G.edad>=edadRetiro()) return retiro();
  // ── Rendimiento individual ──
  const pj = ri(24,36);
  const atk = {POR:0.02,DFC:0.05,LI:0.08,LD:0.08,MCD:0.12,MI:0.35,MD:0.35,MC:0.25,MCO:0.5,EI:0.55,ED:0.55,DC:0.75}[G.pos]||0.3;
  const factor = (G.nivel/100) * (0.7+Math.random()*0.6);
  const g = Math.round(pj*atk*factor);
  const a = Math.round(pj*(atk*0.6+0.1)*factor);
  G.tot.pj+=pj; G.tot.g+=g; G.tot.a+=a;
  const rend=(g+a)/pj;                        // rendimiento 0..~1.3
  // ── Nivel: CURVA por edad (sube joven, se estanca, baja de grande) + rendimiento ──
  let dN;
  if(G.edad<=20) dN=ri(2,5); else if(G.edad<=24) dN=ri(1,4); else if(G.edad<=28) dN=ri(0,2);
  else if(G.edad<=31) dN=ri(-1,1); else if(G.edad<=34) dN=ri(-3,0); else dN=ri(-5,-1);
  if(rend>0.6) dN+=2; else if(rend>0.35) dN+=1; else if(rend<0.15) dN-=1;   // el bajo rendimiento penaliza
  G.nivel=clamp(G.nivel+dN,30,99);
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
function _finTemporada(ctx){
  const { pj, g, a, dN, rend, pos, totalEq, momento } = ctx;
  // ── TÍTULOS coherentes con la liga (pueden acumularse en la misma temporada) ──
  const T = trofeosDe(G.liga);
  const titulosGanados = [];
  // Liga local: SOLO si sos primero
  if (pos === 1) titulosGanados.push(T.local);
  // Copa nacional: chance INDEPENDIENTE de la liga (grandes la ganan más seguido, pero
  // con techo bajo — la copa es a eliminación directa, cualquiera te puede voltear).
  if (T.copaNac && Math.random() < clamp((G.clubStr-58)/160, 0.03, 0.22)) titulosGanados.push(T.copaNac);
  // Copa internacional (Champions/Libertadores): si el club es GRANDE y clasificó.
  // Guardo la RONDA alcanzada para mostrarla aunque no gane.
  let interRonda = null, interLiteRonda = null;
  const rondasInter = ['Fase de grupos','Octavos','Cuartos','Semifinal','Final'];
  if (G.clasificadoInter && T.inter) {
    const chance = clamp((G.clubStr-72)/85, 0, 0.28);
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
  // Persistir cada trofeo ganado en la vitrina.
  titulosGanados.forEach(t => {
    G.titulos++; if(!G.vitrina) G.vitrina=[];
    G.vitrina.push({ nombre:t, edad:G.edad, club:G.club, img:trofeoImgSlug(t) });
  });
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
  const gpPJ = pj > 0 ? g / pj : 0;
  if (g >= 30 && G.nivel >= 82 && Math.random() < 0.55) {
    G.premios.push({ nombre:'Bota de Oro', edad:G.edad, temporada:G.temporada, img:'bota-oro' });
  }
  if (G.nivel >= 88 && (titulosGanados.length >= 2 || (titulosGanados.includes(T.inter))) && Math.random() < 0.35) {
    G.premios.push({ nombre:'Balón de Oro', edad:G.edad, temporada:G.temporada, img:'balon-oro' });
  } else if (G.nivel >= 86 && titulosGanados.length >= 1 && Math.random() < 0.25) {
    G.premios.push({ nombre:'The Best', edad:G.edad, temporada:G.temporada, img:'the-best' });
  }
  if (G.pos === 'POR' && G.nivel >= 80 && Math.random() < 0.30) {
    G.premios.push({ nombre:'Guante de Oro', edad:G.edad, temporada:G.temporada, img:'guante-oro' });
  }
  if (G.edad <= 21 && G.nivel >= 78 && Math.random() < 0.30) {
    G.premios.push({ nombre:'Mejor Jugador Joven', edad:G.edad, temporada:G.temporada, img:'mejor-joven' });
  }
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
  G.timeline.push({ edad:G.edad, temporada:G.temporada, club:G.club, liga:G.liga, niv:Math.round(G.nivel), pj, g, a, dN, pos, totalEq, titulo, clasif:clasifText, move:G.moveLiga, interCopa, interLiteCopa });
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
      ganados: R.ganados, perdidos: R.perdidos
    };
  }
  // IDOLATRÍA: cada temporada al mismo club suma. Títulos y buen rendimiento aceleran.
  if(!G.idolatria) G.idolatria = {};
  const idBase = 4 + (titulosGanados.length*10) + (pos===1?6:pos<=3?3:0) + (rend>0.5?4:rend<0.15?-3:0);
  G.idolatria[G.club] = clamp((G.idolatria[G.club]||0) + idBase, -100, 100);
  G.temporada++; G.edad++; G.anio = (G.anio||2026) + 1;
  G._mercadoHecho = false;
  save();
  resumenTemporada({pj,g,a,dN,pos,totalEq,titulo,clasif:clasifText,move:G.moveLiga,interCopa,interLiteCopa,duelo,momento,bal,inv});
}

function resumenTemporada(r){
  const m=document.getElementById('carrera-modal')||overlay();
  m.innerHTML=`
  <div style="max-width:520px;margin:0 auto;padding:30px 22px calc(30px + env(safe-area-inset-bottom));min-height:100%;display:flex;flex-direction:column;">
    <div style="text-align:center;margin-bottom:18px;">
      <div style="font-size:11px;font-weight:900;letter-spacing:2px;color:${A};">TEMPORADA ${G.temporada-1} · ${G.edad-1} AÑOS</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:6px;">${clubBadge(G.club,26)}<div style="font-family:Outfit,sans-serif;font-weight:900;font-size:20px;color:#fff;">${esc(G.club)}</div></div>
      <div style="font-size:12px;color:#9aa0a6;margin-top:2px;">${esc(G.liga)} · ${posLabel(r.pos)} de ${r.totalEq}</div>
      ${r.titulo?`<div style="margin-top:14px;display:flex;flex-direction:column;align-items:center;">
        <div style="animation:crTrophy .7s cubic-bezier(.2,1.4,.4,1) both;">${trofeoRender(r.titulo, 100)}</div>
        <div style="margin-top:8px;font-size:16px;font-weight:900;color:${A};letter-spacing:.5px;animation:crPop .5s .2s both;"><i class='bx bxs-trophy'></i> ¡${esc(r.titulo)}!</div>
        <div style="font-size:11px;color:#8a8f96;margin-top:2px;">Campeón con ${esc(G.club)}</div>
      </div><style>@keyframes crTrophy{0%{transform:scale(.3) rotate(-12deg);opacity:0}100%{transform:scale(1) rotate(0);opacity:1}}@keyframes crPop{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}</style>`:''}
      ${r.momento?`<div style="margin-top:10px;display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:800;color:${r.momento.exito?'#facc15':'#94a3b8'};background:${r.momento.exito?'rgba(250,204,21,.1)':'rgba(148,163,184,.08)'};border:1px solid ${r.momento.exito?'rgba(250,204,21,.35)':'rgba(148,163,184,.25)'};border-radius:20px;padding:5px 12px;">⚡ ${esc(r.momento.t)} — ${r.momento.exito?'la metiste':'no se dio'}</div>`:''}
      ${r.clasif?`<div style="margin-top:12px;display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;color:#4fc3f7;background:rgba(79,195,247,.1);border:1px solid rgba(79,195,247,.3);border-radius:20px;padding:5px 12px;"><i class='bx bx-star'></i> ${esc(r.clasif)}</div>`:''}
      ${r.interCopa?`<div style="margin-top:8px;display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;color:#a78bfa;background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.3);border-radius:20px;padding:5px 12px;"><i class='bx bx-medal'></i> ${esc(r.interCopa)}</div>`:''}
      ${r.interLiteCopa?`<div style="margin-top:8px;display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;color:#f59e0b;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:20px;padding:5px 12px;"><i class='bx bx-medal'></i> ${esc(r.interLiteCopa)}</div>`:''}
      ${r.move?`<div style="margin-top:12px;display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:900;color:${r.move.tipo==='asc'?'#22c55e':'#ef4444'};background:${r.move.tipo==='asc'?'rgba(34,197,94,.12)':'rgba(239,68,68,.12)'};border:1px solid ${r.move.tipo==='asc'?'rgba(34,197,94,.4)':'rgba(239,68,68,.4)'};border-radius:20px;padding:6px 14px;"><i class='bx ${r.move.tipo==='asc'?'bx-up-arrow-alt':'bx-down-arrow-alt'}'></i> ${r.move.tipo==='asc'?'¡ASCENSO! ':'DESCENSO. '}Ahora en <b>${esc(r.move.a)}</b></div>`:''}
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;">
      ${st('PJ',r.pj)}${st('GOLES',r.g)}${st('ASIST',r.a)}${st('NIVEL',(r.dN>=0?'+':'')+r.dN)}
    </div>
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
    ${r.duelo?`<div style="background:linear-gradient(160deg,${r.duelo.gane?'rgba(34,197,94,.08)':'rgba(239,68,68,.08)'},rgba(20,22,18,.5));border:1px solid ${r.duelo.gane?'rgba(34,197,94,.35)':'rgba(239,68,68,.35)'};border-radius:14px;padding:12px 14px;margin-bottom:14px;">
      <div style="font-size:10px;font-weight:900;letter-spacing:1.5px;color:${r.duelo.gane?'#22c55e':'#ef4444'};margin-bottom:8px;"><i class='bx bx-target-lock'></i> DUELO CON ${esc(r.duelo.nombre).toUpperCase()}</div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="flex:1;text-align:center;"><div style="font-size:10px;color:#8a8f96;font-weight:800;">VOS</div><div style="font-size:17px;font-weight:900;color:#fff;">${r.duelo.mio.g}G ${r.duelo.mio.a}A</div></div>
        <div style="font-size:12px;font-weight:900;color:${r.duelo.gane?'#22c55e':'#ef4444'};flex-shrink:0;">${r.duelo.gane?'GANASTE':'PERDISTE'}</div>
        <div style="flex:1;text-align:center;"><div style="font-size:10px;color:#8a8f96;font-weight:800;">${esc(r.duelo.nombre)} · Nv ${r.duelo.nivel}</div><div style="font-size:17px;font-weight:900;color:#fff;">${r.duelo.suyo.g}G ${r.duelo.suyo.a}A</div></div>
      </div>
      <div style="font-size:10.5px;color:#8a8f96;text-align:center;margin-top:7px;">Historial: <b style="color:#22c55e;">${r.duelo.ganados}</b> a <b style="color:#ef4444;">${r.duelo.perdidos}</b> · Él lleva ${r.duelo.titulos} título${r.duelo.titulos!==1?'s':''}</div>
    </div>`:''}
    <div id="cr-evwrap"></div>
  </div>`;
  // Decisiones de esta temporada según dificultad. Si hay título ganado, NO
  // encimamos una decisión random — el momento del trofeo tiene que respirar.
  // Las decisiones se muestran cuando el usuario aprieta "Continuar".
  G._evLeft = decisionsForSeason();
  const w = document.getElementById('cr-evwrap');
  if (r.titulo) {
    if (w) w.innerHTML = contBtn();
  } else if (G._evLeft > 0) {
    setTimeout(()=>mostrarEvento(), 50);
  } else {
    if (w) w.innerHTML = contBtn();
  }
}
function decisionsForSeason(){
  const d=(G&&G.dif)||'normal';
  if(d==='intenso') return 4;
  if(d==='leve') return (G.temporada%2===0)?1:0;
  return 1;
}
function contBtn(){ return `<div style="text-align:center;padding:6px 0;"><button onclick="window._carreraHub()" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:13px 30px;font-weight:900;cursor:pointer;">Continuar <i class='bx bx-right-arrow-alt'></i></button></div>`; }
// Tras resolver una decisión: si quedan decisiones, otra. Si no, MERCADO forzado
// (siempre que haya clubes que te quieran o el actual quiera renovar), y luego hub.
window._carreraContinuar = function(){
  if(G && G._evLeft>0){ mostrarEvento(); return; }
  if(G && !G._mercadoHecho){ window._carreraMercadoForzado(); return; }
  G._mercadoHecho = false;
  window._carreraHub();
};
// Mercado de fin de temporada: SIEMPRE aparece con al menos renovación + ofertas
// (si hay), o un botón de "seguir en el club". Ya no queda al azar.
window._carreraMercadoForzado = function(){
  if(!G){ window._carreraHub(); return; }
  G._mercadoHecho = true;
  if(G.edad >= 34){ window._carreraHub(); return; }
  const mejores = todosClubs().filter(c => {
    if (c.name === G.club) return false;
    if (c.str <= G.clubStr - 4) return false;
    if (ligaNivel(c.liga) < ligaNivel(G.liga) - 1) return false;
    if (G.nivel < c.str - 12) return false;
    if (c.str > 82 && G.edad > 32 && G.nivel < 88) return false;
    if (c.str > 85 && G.edad < 20 && G.nivel < 70) return false;
    return true;
  }).sort(()=>Math.random()-0.5);
  const picks = []; const seen = {};
  for(const c of mejores){ if(seen[c.name]) continue; seen[c.name]=1; picks.push(c); if(picks.length>=3) break; }
  G._offers = picks.map(ofertaDe);
  // Renovación siempre disponible con el club actual.
  const base = { name:G.club, str:G.clubStr, liga:G.liga, pais:G.clubPais };
  const baseO = ofertaDe(base);
  const _anios = _edadAnios(G.edad);
  G._renov = [ Object.assign({}, baseO, { _v:'Renovar', anios: Math.max(1, _anios[0]) }) ];
  save();
  // Muestra ambos: renovación arriba, ofertas abajo.
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="max-width:640px;margin:0 auto;padding:22px 18px calc(30px + env(safe-area-inset-bottom));">
    <div style="text-align:center;margin-bottom:14px;">
      <div style="font-size:11px;font-weight:900;letter-spacing:2px;color:${A};">MERCADO DE PASES</div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:22px;color:#fff;margin-top:4px;">¿Qué hacés esta temporada?</div>
    </div>
    <div id="cr-evwrap"></div>
    <button onclick="window._carreraElegirOferta('quedarme',-1)" style="width:100%;margin-top:14px;background:#161616;color:#aaa;border:1px solid #262626;border-radius:12px;padding:13px;font-weight:800;font-size:13px;cursor:pointer;"><i class='bx bx-home-heart'></i> Seguir un año más en ${esc(G.club)} sin renovar</button>
  </div>`;
  const w = document.getElementById('cr-evwrap');
  let html = '';
  html += `<div style="font-size:11px;font-weight:900;color:#8a8f96;letter-spacing:1px;margin-bottom:8px;">RENOVACIÓN</div>`;
  html += `<div style="display:grid;grid-template-columns:1fr;gap:9px;margin-bottom:14px;">${G._renov.map((o,i)=>ofertaCard(o,i,'renov')).join('')}</div>`;
  if (picks.length) {
    html += `<div style="font-size:11px;font-weight:900;color:#8a8f96;letter-spacing:1px;margin-bottom:8px;">CLUBES QUE TE QUIEREN</div>`;
    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;">${G._offers.map((o,i)=>ofertaCard(o,i,'transfer')).join('')}</div>`;
  } else {
    html += `<div style="font-size:12px;color:#666;text-align:center;padding:10px;font-style:italic;">Ningún club te busca este mercado. Seguí demostrando en la cancha.</div>`;
  }
  w.innerHTML = html;
};
function posLabel(pos){ return pos===1?'1º 🏆':(pos+'º'); }
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
  const wrap=document.getElementById('cr-evwrap'); if(!wrap) return;
  if(G) G._evLeft = Math.max(0, (G._evLeft||1) - 1);   // consume una decisión de la temporada
  // PRIORIDAD ALTA: si hay convocatoria a selección este año, mostrarla (a veces).
  if (Math.random() < 0.35) {
    const evSel = eventoSeleccionRandom();
    if (evSel) {
      G._ev = evSel;
      wrap.innerHTML = `
        <div style="background:linear-gradient(160deg,rgba(59,130,246,.08),rgba(20,22,18,.5));border:1px solid rgba(59,130,246,.3);border-radius:16px;padding:16px;">
          ${decoImg(evSel.img)}
          <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:17px;color:#fff;margin-bottom:6px;">${esc(evSel.t)}</div>
          <div style="font-size:13.5px;color:#c4ccc0;line-height:1.55;margin-bottom:14px;">${evSel.d}</div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${evSel.opts.map((o,i)=>`<button onclick="window._carreraElegir(${i})" style="${btn(i===0)}">${o.txt}</button>`).join('')}
          </div>
        </div>`;
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
  // Mercado de pases más regular: si hay clubes que te quieren, aparece 85% del tiempo
  // (antes 50% → sensación de que "no hay mercado"). Sub-34 años.
  const ofertaTransfer = mejores.length && Math.random()<0.85 && G.edad<34;
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
  if (ev && ev._dyn && ev.t.indexOf('abuelo')>=0){
    // Elegir hasta 2 nacionalidades DISTINTAS al azar (ojo: opciones concretas, no "cambiar").
    const candidatas = PAISES.filter(p => p !== G.pais).sort(()=>Math.random()-0.5).slice(0, 2);
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
  wrap.innerHTML=`
    <div style="background:linear-gradient(160deg,rgba(186,255,0,.05),rgba(20,22,18,.5));border:1px solid #242424;border-radius:16px;padding:16px;">
      ${decoImg(ev.img)}
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:17px;color:#fff;margin-bottom:6px;">${esc(ev.t)}</div>
      <div style="font-size:13.5px;color:#c4ccc0;line-height:1.5;margin-bottom:14px;">${ev.d}</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${ev.opts.map((o,i)=>`<button onclick="window._carreraElegir(${i})" style="${btn(i===0)}">${o.txt}</button>`).join('')}
      </div>
    </div>`;
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
function decoImg(tipo){
  if(!tipo) return '';
  const k=DECO_ICON[tipo] || DECO_ICON.tactica;
  return `<div style="height:120px;border-radius:12px;overflow:hidden;margin-bottom:12px;background:linear-gradient(135deg,${k.c[0]},#0d0d0d);display:flex;align-items:center;justify-content:center;position:relative;">
    <div style="position:absolute;inset:0;background:radial-gradient(120% 80% at 30% 20%, ${k.c[1]}22, transparent 60%);"></div>
    <div style="position:absolute;inset:0;background-image:repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0 2px, transparent 2px 12px);"></div>
    <i class='bx ${k.i}' style="font-size:56px;color:${k.c[1]};filter:drop-shadow(0 4px 14px ${k.c[1]}66);z-index:1;"></i>
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
    <div style="font-size:10px;color:#8a8f86;margin-top:2px;">${sub}</div>
    <div style="font-size:11px;color:#666;margin-top:1px;">Nivel ${o.str}</div>
    <div style="font-size:12px;color:${A};font-weight:900;margin-top:6px;">${eur(o.sueldo)}/año</div>
    <div style="font-size:10px;color:#aaa;">${o.anios} años${o.prima?' · prima '+eur(o.prima):''}</div>
    ${riesgo}
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
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;">
      ${list.map((o,i)=>ofertaCard(o,i,kind)).join('')}
    </div>
    <button onclick="window._carreraElegirOferta('${kind==='renov'?'rechazar_renov':'quedarme'}',-1)" style="width:100%;margin-top:10px;${btn(false)}"><i class='bx bx-home-heart' style="margin-right:6px;color:#8a8f86;"></i>${kind==='renov'?'Rechazar renovación (escuchar ofertas)':'Quedarme en '+esc(G.club)}</button>
  </div>`;
}
window._carreraElegirOferta = function(kind, i){
  let msg;
  if(kind==='quedarme'){
    G.moral+=8; G.fama+=3; msg='Te quedás. La hinchada lo valora.';
  } else if(kind==='rechazar_renov'){
    // Bug reportado: al rechazar renovar salía "te quedás, la hinchada lo valora" como si
    // hubieras aceptado. Ahora tiene su propio mensaje + consecuencia real (queda tenso).
    G.moral-=4; G.fama-=1;
    msg='Rechazaste la renovación. La dirigencia queda dolida y te van a buscar en el mercado. Podés terminar cedido o transferido.';
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
      const caida = idClub > 60 ? -80 : idClub > 30 ? -40 : idClub > 10 ? -20 : -5;
      G.idolatria[G.club] = clamp(idClub + caida, -100, 100);
      // BANDERA: irte siendo ídolo te marca como traidor para siempre.
      if(!G.flags) G.flags = {};
      if (idClub > 50) { G.flags.traidor = true; G.flags.exClub = G.club; }
      G.idolatria[o.name] = 8; // nuevo club te recibe con expectativa
      G.club=o.name; G.clubStr=o.str; G.liga=o.liga; G.clubPais=o.pais; G.clubDesde=G.edad;
      G.sueldo=o.sueldo; G.contratoAnios=o.anios;
      G.fama+=8; G.moral+=4; G.dinero+=o.prima;
      G.valor=Math.round((G.valor||o.str*90000)*1.1);
      msg='¡Nuevo club: '+esc(o.name)+'! Firmaste por '+o.anios+' años ('+eur(o.sueldo)+'/año).' + (caida<=-40?' La hinchada de tu ex club nunca te va a perdonar.':'');
    }
  }
  G.fama=clamp(G.fama,0,100); G.moral=clamp(G.moral,0,100); G.dinero=Math.max(0,G.dinero);
  G._offers=null; G._renov=null; save();
  const wrap=document.getElementById('cr-evwrap');
  if(wrap) wrap.innerHTML=`<div style="text-align:center;padding:10px 0;"><div style="font-size:15px;color:#fff;font-weight:700;margin-bottom:16px;line-height:1.5;">${msg}</div><button onclick="window._carreraContinuar()" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:13px 28px;font-weight:900;cursor:pointer;">Continuar</button></div>`;
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
  { t:'Conocés a tu ídolo', img:'seleccion', d:'En un evento aparece tu ídolo de la infancia y te da unos minutos de charla.', opts:[
    { txt:'Pedirle consejos y escuchar', ef:g=>{ g.moral+=10; g.nivel+=1; return 'Sus palabras te marcan. Entrenás con otra mentalidad, más profesional.'; } },
    { txt:'Solo la foto para redes', ef:g=>{ g.fama+=5; return 'Buena foto, muchos likes. Pero sentís que desaprovechaste el momento.'; } } ] },
  { t:'Oferta turbia de un apostador', img:'dinero', d:'Un apostador te ofrece una fortuna por "aflojar" en un partido puntual. Si te descubren, es escándalo penal.', opts:[
    { txt:'Aceptar (muy riesgoso)', ef:g=>{
      const cae = Math.random() < .6;
      if (cae) {
        g.fama -= 40; g.moral -= 30;
        // 35% de que además vayas PRESO por soborno deportivo → final alternativo.
        if (Math.random() < .35) { g._irCarcel = 'soborno'; return 'Te descubrieron y hay causa penal. Vas preso por soborno deportivo.'; }
        return 'Te descubrieron. Suspensión, escándalo y tu carrera al borde del final.';
      }
      g.dinero += 200000; g.moral -= 6;
      return 'Nadie se enteró... pero no podés ni mirarte al espejo.';
    } },
    { txt:'Rechazar y denunciarlo', ef:g=>{ g.fama+=8; g.moral+=8; return 'Hiciste lo correcto. La AFA y la prensa te ponen de ejemplo.'; } } ] },
  { t:'Pelea en un after fuera de control', img:'joda', d:'A la salida de un boliche, se arma una pelea. Vos estás en el medio. Hay heridos.', opts:[
    { txt:'Encarar y bancar la parada', ef:g=>{
      const mal = Math.random() < .5;
      if (mal) { g.fama -= 25; g.moral -= 15; g._irCarcel = 'pelea'; return 'Cámaras te filman siendo el más agresivo. La policía te lleva. Vas preso.'; }
      g.fama -= 8; return 'Te frenaron a tiempo. Escándalo mediano, no fue a mayores.';
    } },
    { txt:'Salir corriendo, no meterme', ef:g=>{ g.moral+=3; g.fama-=2; return 'Te fuiste. Bien hecho — no estabas para líos.'; } } ] },
  { t:'Sobrepeso en la pretemporada', img:'lesion', minAge:20, d:'Volviste de vacaciones con unos kilos de más y el preparador físico te marca.', opts:[
    { txt:'Ponerme a full con la dieta', ef:g=>{ g.nivel+=2; g.moral+=2; return 'Te pusiste en forma rápido. El cuerpo técnico valora tu compromiso.'; } },
    { txt:'Ya lo bajo jugando', ef:g=>{ const mal=Math.random()<.6; g.nivel+=mal?-3:0; return mal?'Arrancaste lento y pesado. Perdiste la titularidad las primeras fechas.':'Zafaste, lo fuiste bajando de a poco.'; } } ] },
  { t:'Descubren un abuelo extranjero', img:'seleccion', _dyn:true, d:'', opts:[] },
  { t:'Amague de retiro anticipado', img:'prensa', d:'Venís golpeado y frustrado. Se te cruza por la cabeza colgar los botines antes de tiempo.', opts:[
    { txt:'Seguir peleándola', ef:g=>{ g.moral+=6; g.nivel+=1; return 'Sacaste fuerzas. La resiliencia te devuelve al primer plano.'; } },
    { txt:'Bajar un cambio y priorizar salud', ef:g=>{ g.moral+=4; g.nivel-=1; return 'Te cuidás más. Rendís un poco menos pero disfrutás de nuevo.'; } } ] },

  // ══ ÉTICA / LEGALIDAD — cadenas con consecuencias arrastradas ══════════════
  { t:'Te ofrecen "vitaminas" del médico del club', img:'lesion', minAge:20, noFlag:'dopado', d:'El médico te ofrece un tratamiento "de recuperación" que está en zona gris. Todos en el plantel lo usan.', opts:[
    { txt:'Aceptar el tratamiento', ef:g=>{ g.flags=g.flags||{}; g.flags.dopado=true; g.nivel+=4; return 'Te sentís una máquina. Recuperás en la mitad de tiempo. Nadie pregunta nada... por ahora.'; } },
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
    { txt:'Meterle unos pesos, total es poco', ef:g=>{ g.flags=g.flags||{}; g.flags.ludopata=true; g.dinero+=15000; return 'Ganaste la primera. Esa sensación no se olvida... y ahí empieza el problema.'; } },
    { txt:'Ni loco, conozco esas historias', ef:g=>{ g.moral+=4; return 'Borraste la app. Viste demasiados compañeros fundidos.'; } } ] },
  { t:'La apuesta se te fue de las manos', img:'dinero', reqFlag:'ludopata', noFlag:'deudaMafia', d:'Ya no apostás por diversión. Debés una cifra que no podés pagar y el prestamista no es del banco.', opts:[
    { txt:'Pedir ayuda al club y confesar', ef:g=>{ g.flags.enTratamiento=true; g.dinero=Math.max(0,g.dinero-80000); g.fama-=10; g.moral+=8; return 'El club te bancó y te puso en tratamiento. Fue humillante pero te salvó la vida.'; } },
    { txt:'Pedirle plata al prestamista', ef:g=>{ g.flags.deudaMafia=true; g.dinero+=120000; g.moral-=15; return 'Te prestaron sin preguntar. Ahora le debés a gente que no acepta "la semana que viene".'; } } ] },
  { t:'Vienen a cobrar la deuda', img:'pelea', reqFlag:'deudaMafia', d:'Te esperan afuera del entrenamiento. Quieren la plata o "un favor" en el próximo partido.', opts:[
    { txt:'Pagar todo aunque me funda', ef:g=>{ g.dinero=Math.max(0,g.dinero-250000); g.flags.deudaMafia=false; g.moral+=5; return 'Vendiste hasta el auto. Estás en cero, pero estás libre.'; } },
    { txt:'Aceptar el "favor" en el partido', ef:g=>{
      g.flags.arreglo=true;
      const cae=Math.random()<.55;
      if(cae){ g.fama-=45; g.moral-=25; if(Math.random()<.4){ g._irCarcel='arreglo'; return 'Se abrió causa penal por amaño. Vas preso.'; } return 'Te descubrieron. Inhabilitación y carrera destruida.'; }
      g.moral-=18; return 'Nadie se dio cuenta. Pero vos sabés lo que hiciste, y eso no se borra.'; } } ] },
  { t:'Denuncia por el arreglo', img:'prensa', reqFlag:'arreglo', d:'Un periodista de investigación te encara con audios. Sabe todo.', opts:[
    { txt:'Confesar y colaborar con la justicia', ef:g=>{ g.flags.arreglo=false; g.flags.delator=true; g.fama-=15; g.moral+=12; return 'Colaboraste y desarmaste la red. Perdiste amigos y ganaste algo de paz.'; } },
    { txt:'Negar todo y contratar abogados', ef:g=>{ g.dinero=Math.max(0,g.dinero-200000); const zafa=Math.random()<.45; if(!zafa){ g._irCarcel='arreglo'; return 'Los abogados no alcanzaron. Vas preso por amaño de partidos.'; } g.fama-=20; return 'Zafaste por falta de pruebas. La sombra te va a seguir siempre.'; } } ] },

  // ══ TRAIDOR — consecuencias de irte siendo ídolo ═══════════════════════════
  { t:'Volvés a jugar contra tu ex club', img:'pelea', reqFlag:'traidor', d:'Te toca visitar el estadio donde eras ídolo. Te reciben con insultos, billetes falsos y una bandera con tu nombre tachado.', opts:[
    { txt:'Meter el gol y no festejarlo', ef:g=>{ const gol=Math.random()<.5; if(gol){ g.fama+=10; g.moral+=6; return 'Marcaste y te quedaste quieto, pidiendo perdón con la mano. Hasta ellos lo respetaron.'; } g.moral-=3; return 'No pudiste marcar. Te fuiste silbado los 90 minutos.'; } },
    { txt:'Meterlo y festejarlo en su cara', ef:g=>{ const gol=Math.random()<.45; if(gol){ g.fama+=6; g.moral-=8; g.flags.villano=true; return 'Gol y festejo provocador. Sos oficialmente el villano de esa hinchada. Para siempre.'; } g.fama-=6; return 'No metiste y encima habías avisado que ibas a festejar. Quedaste en offside.'; } } ] },
  { t:'Ofertas del club que traicionaste', img:'fichaje', reqFlag:'traidor', minAge:31, d:'Increíblemente, el club del que te fuiste quiere que vuelvas para el final de tu carrera. La dirigencia cambió; los hinchas no.', opts:[
    { txt:'Volver a casa y bancar los silbidos', ef:g=>{ g.flags.traidor=false; g.flags.redimido=true; g.moral+=15; if(g.flags.exClub){ g.idolatria=g.idolatria||{}; g.idolatria[g.flags.exClub]=30; } return 'Volviste. Los primeros meses fueron durísimos, pero terminaste reconciliado con la gente.'; } },
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
window._carreraElegir = function(i){
  const ev=G._ev; const o=ev.opts[i]; if(!o) return;
  // Snapshot para medir el IMPACTO real de la decisión.
  const b={ nivel:G.nivel, moral:G.moral, fama:G.fama, dinero:G.dinero, valor:G.valor||0 };
  const res=o.ef(G);
  G.nivel=clamp(G.nivel,30,99); G.fama=clamp(G.fama,0,100); G.moral=clamp(G.moral,0,100); G.dinero=Math.max(0,G.dinero);
  const chips = [
    deltaChip('Nivel', Math.round(G.nivel-b.nivel)),
    deltaChip('Moral', Math.round(G.moral-b.moral)),
    deltaChip('Fama', Math.round(G.fama-b.fama)),
    deltaChip('$', Math.round(G.dinero-b.dinero), true)
  ].filter(Boolean).join('');
  G.hist.push({t:ev.t,res}); save();
  // ¿La decisión terminó en la cárcel? → pantalla especial con desafío del lechón.
  if (G._irCarcel) {
    const motivo = G._irCarcel; G._irCarcel = null; save();
    setTimeout(()=>_carreraCarcel(motivo), 500);
  }
  const wrap=document.getElementById('cr-evwrap');
  if(wrap) wrap.innerHTML=`<div style="text-align:center;padding:6px 0;">
    <div style="font-size:15px;color:#fff;font-weight:700;line-height:1.55;margin-bottom:12px;">${esc(res)}</div>
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
  if(!candidatos.length){ if(window.showToast) showToast('Ningún club te está mirando ahora. Rendí más una temporada.', 'info'); return; }
  const shuffled = candidatos.slice().sort(()=>Math.random()-0.5);
  const seen={}; const picks=[];
  for(const c of shuffled){ if(seen[c.name])continue; seen[c.name]=1; picks.push(c); if(picks.length>=4)break; }
  G._offers = picks.map(ofertaDe); G.moral = clamp((G.moral||60)-4, 0, 100); save();
  const m = overlay();
  m.innerHTML = `
    <div style="max-width:560px;margin:0 auto;padding:22px 18px calc(30px + env(safe-area-inset-bottom));">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <button onclick="window._carreraHub()" style="background:rgba(255,255,255,.06);border:none;color:#aaa;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;"><i class='bx bx-arrow-back'></i></button>
        <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:19px;color:#fff;">Pediste salir del club</div>
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
  if(!n || n<1000){ if(window.showToast) showToast('Mínimo €1.000', 'warning'); return; }
  if(n > max){ if(window.showToast) showToast('No te alcanza.', 'warning'); return; }
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
  if((G.dinero||0) < B.p){ if(window.showToast) showToast('No te alcanza.', 'warning'); return; }
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
function retiro(){
  const m=document.getElementById('carrera-modal')||overlay();
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
  (G.vitrina||[]).forEach(v=>{ const k=v.nombre; grupTrof[k]=(grupTrof[k]||{n:v.nombre,slug:trofeoImgSlug(v.nombre),count:0}); grupTrof[k].count++; });
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
  const jerseyHtml = jersey(140, G.apellido, G.num, G.pais);
  m.innerHTML = `
  <style>@keyframes crFadeUp{0%{transform:translateY(18px);opacity:0}100%{transform:none;opacity:1}}
   .cr-fade{animation:crFadeUp .6s cubic-bezier(.2,1,.3,1) both}
   .cr-fade-d1{animation-delay:.12s}.cr-fade-d2{animation-delay:.24s}.cr-fade-d3{animation-delay:.36s}.cr-fade-d4{animation-delay:.48s}</style>
  <div style="max-width:640px;margin:0 auto;padding:24px 18px calc(40px + env(safe-area-inset-bottom));min-height:100%;">
    ${(!G.segundaVida) ? `
    <!-- ELECCIÓN DE SEGUNDA VIDA — arriba, prominente para que no quede enterrada -->
    <div class="cr-fade" style="background:linear-gradient(160deg,rgba(167,139,250,.12),rgba(20,22,18,.5));border:1.5px solid rgba(167,139,250,.4);border-radius:16px;padding:16px;margin-bottom:16px;">
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:16px;color:#fff;text-align:center;">Se acabó el fútbol. Ahora, ¿qué?</div>
      <div style="font-size:12.5px;color:#c4ccc0;text-align:center;margin:4px 0 12px;">Elegí un camino. Vas a vivir año por año hasta los 70 con decisiones cada temporada.</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <button onclick="window._carreraSegundaVida('dt')" style="background:#0d100d;border:1px solid #1c1c1c;border-radius:12px;padding:14px 8px;color:#fff;cursor:pointer;text-align:center;" onmouseover="this.style.borderColor='${A}'" onmouseout="this.style.borderColor='#1c1c1c'"><i class='bx bx-clipboard' style="font-size:24px;color:${A};display:block;margin-bottom:4px;"></i><div style="font-weight:900;font-size:12.5px;">Ser DT</div></button>
        <button onclick="window._carreraSegundaVida('comentarista')" style="background:#0d100d;border:1px solid #1c1c1c;border-radius:12px;padding:14px 8px;color:#fff;cursor:pointer;text-align:center;" onmouseover="this.style.borderColor='#64b4ff'" onmouseout="this.style.borderColor='#1c1c1c'"><i class='bx bx-microphone' style="font-size:24px;color:#64b4ff;display:block;margin-bottom:4px;"></i><div style="font-weight:900;font-size:12.5px;">Comentarista</div></button>
        <button onclick="window._carreraSegundaVida('dirigente')" style="background:#0d100d;border:1px solid #1c1c1c;border-radius:12px;padding:14px 8px;color:#fff;cursor:pointer;text-align:center;" onmouseover="this.style.borderColor='#facc15'" onmouseout="this.style.borderColor='#1c1c1c'"><i class='bx bx-briefcase' style="font-size:24px;color:#facc15;display:block;margin-bottom:4px;"></i><div style="font-weight:900;font-size:12.5px;">Dirigente</div></button>
        <button onclick="window._carreraSegundaVida('empresario')" style="background:#0d100d;border:1px solid #1c1c1c;border-radius:12px;padding:14px 8px;color:#fff;cursor:pointer;text-align:center;" onmouseover="this.style.borderColor='#22c55e'" onmouseout="this.style.borderColor='#1c1c1c'"><i class='bx bx-store' style="font-size:24px;color:#22c55e;display:block;margin-bottom:4px;"></i><div style="font-weight:900;font-size:12.5px;">Empresario</div></button>
        <button onclick="window._carreraSegundaVida('escuela')" style="background:#0d100d;border:1px solid #1c1c1c;border-radius:12px;padding:14px 8px;color:#fff;cursor:pointer;text-align:center;" onmouseover="this.style.borderColor='#f97316'" onmouseout="this.style.borderColor='#1c1c1c'"><i class='bx bx-award' style="font-size:24px;color:#f97316;display:block;margin-bottom:4px;"></i><div style="font-weight:900;font-size:12.5px;">Escuela</div></button>
        <button onclick="window._carreraSegundaVida('disfrutar')" style="background:#0d100d;border:1px solid #1c1c1c;border-radius:12px;padding:14px 8px;color:#fff;cursor:pointer;text-align:center;" onmouseover="this.style.borderColor='#a78bfa'" onmouseout="this.style.borderColor='#1c1c1c'"><i class='bx bx-glasses' style="font-size:24px;color:#a78bfa;display:block;margin-bottom:4px;"></i><div style="font-weight:900;font-size:12.5px;">Disfrutar</div></button>
      </div>
    </div>` : ''}
    <!-- HERO -->
    <div class="cr-fade" style="position:relative;background:radial-gradient(120% 90% at 50% 0%,${leyenda?'#3a2a06':'#14340f'} 0%,#0a0c0a 60%);border:1px solid ${rangoColor}55;border-radius:22px;padding:22px 18px 20px;overflow:hidden;text-align:center;">
      <div style="position:absolute;inset:0;background-image:radial-gradient(circle at 20% 20%, ${rangoColor}22, transparent 55%),radial-gradient(circle at 80% 80%, ${rangoColor}22, transparent 55%);pointer-events:none;"></div>
      <div style="position:relative;">
        <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(0,0,0,.35);border:1px solid ${rangoColor}88;border-radius:99px;padding:5px 14px;font-size:11px;font-weight:900;letter-spacing:2px;color:${rangoColor};margin-bottom:14px;"><i class='bx ${rangoIcon}'></i>${rangoTxt}</div>
        <div style="display:flex;justify-content:center;margin-bottom:10px;">${jerseyHtml}</div>
        <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:30px;color:#fff;letter-spacing:-.5px;">${esc(G.apellido)} <span style="color:${A};">#${G.num}</span></div>
        <div style="font-size:12.5px;color:#c4ccc0;margin-top:4px;display:inline-flex;align-items:center;gap:6px;">${flagImg(G.pais,18)} ${esc(G.pais)} · <span style="color:#888;">${anios} temp. · ${anios+16-G.years+G.years}—</span></div>
      </div>
    </div>

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

    ${honores.length?`<div class="cr-fade cr-fade-d2" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;justify-content:center;">
      ${honores.map(h=>`<span style="display:inline-flex;align-items:center;gap:5px;background:${h.c}18;border:1px solid ${h.c}55;color:${h.c};border-radius:20px;padding:5px 11px;font-size:11px;font-weight:800;"><i class='bx ${h.i}'></i>${h.t}</span>`).join('')}
    </div>`:''}

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
      return `<div class="cr-fade cr-fade-d2" style="margin-top:20px;">
        <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:12px;letter-spacing:2px;color:#facc15;margin-bottom:10px;padding-left:2px;"><i class='bx bx-wallet'></i> PATRIMONIO AL RETIRO</div>
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
        </div>
      </div>`; })()}

    <!-- FORMACIÓN EN JUVENILES -->
    ${(G.juvHist&&G.juvHist.length)?`<div class="cr-fade cr-fade-d2" style="margin-top:20px;">
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:12px;letter-spacing:2px;color:#4fc3f7;margin-bottom:10px;padding-left:2px;"><i class='bx bx-child'></i> CÓMO TE FORMASTE</div>
      <div style="background:linear-gradient(160deg,rgba(79,195,247,.08),rgba(20,22,18,.5));border:1px solid rgba(79,195,247,.25);border-radius:14px;padding:13px 15px;">
        ${G.juvHist.map(v=>`<div style="display:flex;gap:9px;padding:5px 0;font-size:11.5px;color:#c4ccc0;line-height:1.45;"><span style="font-weight:900;color:#4fc3f7;flex-shrink:0;">${v.edad}</span><span style="flex:1;"><b style="color:#fff;">${esc(v.t)}.</b> ${esc(v.res)}</span></div>`).join('')}
        <div style="margin-top:9px;padding-top:9px;border-top:1px solid rgba(79,195,247,.18);font-size:11px;color:#8a8f96;">Debutaste en primera a los <b style="color:#fff;">${G.debutEdad||18}</b> años${G.flags&&G.flags.debutPrecoz?' — <span style="color:#facc15;font-weight:800;">antes de tiempo</span>':''}.</div>
      </div>
    </div>`:''}

    <!-- DUELO FINAL CON EL NÉMESIS -->
    ${(G.rival && (G.rival.ganados+G.rival.perdidos)>0) ? (function(){
      const R=G.rival; const gane=R.ganados>R.perdidos; const col=gane?'#22c55e':'#ef4444';
      const veredicto = gane ? `Le ganaste el pulso de toda una generación.` : R.ganados===R.perdidos ? `Empate técnico: dos carreras que nunca se soltaron.` : `Él terminó arriba. Siempre vas a saber que estuvo ahí.`;
      return `<div class="cr-fade cr-fade-d2" style="margin-top:20px;">
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:12px;letter-spacing:2px;color:${col};margin-bottom:10px;padding-left:2px;"><i class='bx bx-target-lock'></i> LA RIVALIDAD DE TU VIDA</div>
      <div style="background:linear-gradient(160deg,${col}12,rgba(20,22,18,.6));border:1px solid ${col}44;border-radius:14px;padding:16px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
          <div style="flex:1;text-align:center;"><div style="font-size:10px;color:#8a8f96;font-weight:800;">VOS</div><div style="font-size:22px;font-weight:900;color:#fff;">${G.tot.g}</div><div style="font-size:9px;color:#666;">GOLES · Nv ${nivelF} · ${G.titulos} tít.</div></div>
          <div style="font-size:26px;font-weight:900;color:${col};flex-shrink:0;">${R.ganados}—${R.perdidos}</div>
          <div style="flex:1;text-align:center;"><div style="font-size:10px;color:#8a8f96;font-weight:800;">${esc(R.nombre).toUpperCase()}</div><div style="font-size:22px;font-weight:900;color:#fff;">${R.tot.g}</div><div style="font-size:9px;color:#666;">GOLES · Nv ${Math.round(R.nivel)} · ${R.titulos} tít.</div></div>
        </div>
        <div style="font-size:12.5px;color:#c4ccc0;text-align:center;line-height:1.5;font-style:italic;">${veredicto}</div>
      </div>
    </div>`; })() : ''}

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
      return `<div class="cr-fade cr-fade-d2" style="margin-top:20px;">
        <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:12px;letter-spacing:2px;color:#94a3b8;margin-bottom:10px;padding-left:2px;"><i class='bx bx-bookmark'></i> LAS MARCAS DE TU HISTORIA</div>
        <div style="display:flex;flex-direction:column;gap:7px;">
          ${b.map(x=>`<div style="display:flex;align-items:center;gap:11px;background:${x[1]}0f;border:1px solid ${x[1]}44;border-radius:12px;padding:10px 13px;">
            <i class='bx ${x[0]}' style="font-size:22px;color:${x[1]};flex-shrink:0;"></i>
            <div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:900;color:${x[1]};">${x[2]}</div><div style="font-size:11px;color:#aaa;margin-top:1px;line-height:1.35;">${x[3]}</div></div>
          </div>`).join('')}
        </div>
      </div>`; })()}

    <!-- VITRINA DE TROFEOS -->
    ${trofArr.length ? `<div class="cr-fade cr-fade-d2" style="margin-top:20px;">
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:12px;letter-spacing:2px;color:#facc15;margin-bottom:10px;padding-left:2px;"><i class='bx bx-trophy'></i> VITRINA DE TÍTULOS · ${G.titulos}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(88px,1fr));gap:10px;">
        ${trofArr.map(t=>`<div style="background:linear-gradient(160deg,rgba(250,204,21,.10),rgba(20,22,18,.6));border:1px solid rgba(250,204,21,.28);border-radius:14px;padding:10px 6px;text-align:center;">
          <div style="position:relative;height:64px;display:flex;align-items:center;justify-content:center;">
            ${trofeoRender(t.n, 60)}
            ${t.count>1?`<span style="position:absolute;top:-4px;right:-4px;background:${A};color:#000;font-size:10px;font-weight:900;border-radius:11px;padding:2px 7px;">×${t.count}</span>`:''}
          </div>
          <div style="font-size:9.5px;color:#eee;font-weight:800;margin-top:6px;line-height:1.2;">${esc(t.n)}</div>
        </div>`).join('')}
      </div>
    </div>` : ''}

    <!-- TIMELINE POR TEMPORADA -->
    ${timelineHtml ? `<div class="cr-fade cr-fade-d3" style="margin-top:20px;">
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:12px;letter-spacing:2px;color:${A};margin-bottom:6px;padding-left:2px;"><i class='bx bx-timer'></i> LÍNEA DE TIEMPO</div>
      <div style="background:#0d100d;border:1px solid #1c1c1c;border-radius:14px;padding:6px 12px;">
        ${timelineHtml}
      </div>
    </div>` : ''}

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
          ${G.vidaHist.map(v=>`<div style="display:flex;gap:8px;padding:5px 0;font-size:11.5px;color:#c4ccc0;line-height:1.4;"><span style="font-weight:900;color:#a78bfa;flex-shrink:0;">${v.edad}</span><span style="flex:1;"><b style="color:#fff;">${esc(v.t)}.</b> ${esc(v.res)}</span></div>`).join('')}
          ${G.vidaEdad<70?`<button onclick="window._carreraVida()" style="width:100%;margin-top:10px;background:rgba(167,139,250,.15);color:#c4b5fd;border:1px solid rgba(167,139,250,.4);border-radius:10px;padding:10px;font-weight:800;font-size:12px;cursor:pointer;">Seguir con mi vida (${G.vidaEdad} años) <i class='bx bx-right-arrow-alt'></i></button>`:''}
        </div>`:''}
      </div>
    </div>` : ''}

    <!-- ACCIONES -->
    <div class="cr-fade cr-fade-d4" style="display:flex;flex-direction:column;gap:9px;margin-top:22px;">
      <button onclick="window._carreraCompartir()" style="width:100%;background:linear-gradient(135deg,#7c3aed,#facc15);color:#000;border:none;border-radius:14px;padding:14px;font-family:Outfit,sans-serif;font-weight:900;font-size:14px;cursor:pointer;"><i class='bx bx-share-alt'></i> COMPARTIR MI CARRERA</button>
      <button onclick="window._carreraLen()" style="width:100%;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:14px;padding:15px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;box-shadow:0 10px 30px rgba(80,220,110,.28);">EMPEZAR NUEVA CARRERA</button>
      <button onclick="window._carreraRanking()" style="width:100%;background:rgba(255,255,255,.05);color:#fff;border:1px solid #242424;border-radius:14px;padding:13px;font-weight:800;font-size:14px;cursor:pointer;"><i class='bx bx-bar-chart-alt-2' style="color:${A};"></i> Ver ranking global</button>
      <button onclick="document.getElementById('carrera-modal').remove();window.openGamesModal&&window.openGamesModal()" style="width:100%;background:transparent;color:#888;border:none;padding:11px;font-weight:800;font-size:13px;cursor:pointer;">Volver a Juegos</button>
    </div>
  </div>`;
  // NO borrar el save inmediatamente: si el jugador elige una segunda vida, la app la
  // guarda ahí y vuelve a mostrar el resumen actualizado. Se limpia al empezar NUEVA carrera.
}

// ── SEGUNDA VIDA (post-retiro) ──────────────────────────────────────────────
// Simula 20-40 años más de vida con el rol elegido. Cada rol tiene una historia
// que se muestra en el Copero, y afecta al puntaje/ranking.
// Banco de eventos de vida post-retiro (36-70 años). Cada año se muestra UNO al azar.
const LIFE_EVENTS = [
  { t:'Un club te llama para dirigir', opts:[
    { txt:'Aceptar el desafío', ef:g=>{ const b=Math.random()<.55; if(b){ g.titulos=(g.titulos||0)+1; if(!g.vitrina)g.vitrina=[]; g.vitrina.push({nombre:'Título como DT',edad:g.vidaEdad,club:'Como DT',img:'champions'}); return 'Ganaste un torneo dirigiendo. La prensa te elogia.'; } return 'Fue una etapa dura, pero aprendiste el oficio.'; } },
    { txt:'Prefiero mirar por TV', ef:g=>{ g.dinero=(g.dinero||0)+30000; return 'Rechazaste. Preferís la vida tranquila del ex-jugador.'; } }
  ] },
  { t:'Tu hijo debuta en primera', minAge:40, opts:[
    { txt:'Emocionarme hasta las lágrimas', ef:g=>{ g.moral=Math.min(100,(g.moral||70)+10); return 'Lo viste debutar. Un momento imborrable.'; } },
    { txt:'Ser exigente como siempre', ef:g=>{ return 'Le pediste más de lo que le pedías a vos mismo. Complicado.'; } }
  ] },
  { t:'Aparecés en un documental', opts:[
    { txt:'Contar TODA la verdad', ef:g=>{ g.fama=Math.min(100,(g.fama||50)+8); return 'El documental fue un éxito. Millones lo vieron.'; } },
    { txt:'Guardar los secretos', ef:g=>{ return 'Preferís que algunas cosas se las lleve el tiempo.'; } }
  ] },
  { t:'Problema de salud', minAge:55, opts:[
    { txt:'Operarme y cuidarme', ef:g=>{ g.dinero=Math.max(0,(g.dinero||0)-50000); return 'La operación salió bien. Estás cuidándote.'; } },
    { txt:'Aguantar y seguir', ef:g=>{ g.moral=Math.max(0,(g.moral||70)-8); return 'Aguantaste, pero te pasa factura con los años.'; } }
  ] },
  { t:'Ofrecen una plaza con tu nombre', opts:[
    { txt:'Aceptar el homenaje', ef:g=>{ g.fama=Math.min(100,(g.fama||50)+6); return 'La plaza de tu barrio ahora lleva tu nombre. Emoción total.'; } },
    { txt:'Preferir el bajo perfil', ef:g=>{ return 'Rechazaste el homenaje. Preferís la gloria silenciosa.'; } }
  ] },
  { t:'Un club te quiere en la dirigencia', opts:[
    { txt:'Meterme en la política', ef:g=>{ const b=Math.random()<.5; return b?'Ganaste elecciones. Sos parte del CD del club.':'Perdiste la interna. Volvés a casa.'; } },
    { txt:'No, gracias — el fútbol quedó atrás', ef:g=>{ return 'Preferís la playa antes que las reuniones.'; } }
  ] },
  { t:'Se casa un hijo', minAge:48, opts:[
    { txt:'Pagar un casorio bomba', ef:g=>{ g.dinero=Math.max(0,(g.dinero||0)-80000); g.moral=Math.min(100,(g.moral||70)+10); return 'Fiestón inolvidable. Toda la familia feliz.'; } },
    { txt:'Casorio íntimo', ef:g=>{ g.moral=Math.min(100,(g.moral||70)+6); return 'Ceremonia con los más cercanos. Perfecto.'; } }
  ] },
  { t:'Escribís tu autobiografía', opts:[
    { txt:'Contar hasta lo que duele', ef:g=>{ g.fama=Math.min(100,(g.fama||50)+10); g.dinero=(g.dinero||0)+120000; return 'Best-seller. Todos hablan de vos otra vez.'; } },
    { txt:'Solo lo bonito', ef:g=>{ g.dinero=(g.dinero||0)+40000; return 'Libro correcto. Se vendió tibio.'; } }
  ] },
  { t:'Te invitan a un despedida-homenaje en tu ex club', opts:[
    { txt:'Ir con la camiseta puesta', ef:g=>{ g.moral=Math.min(100,(g.moral||70)+12); return 'El estadio de pie coreando tu nombre. Épico.'; } },
    { txt:'Mandar un video', ef:g=>{ return 'Estabas ocupado. Mandaste unas palabras grabadas.'; } }
  ] },
  { t:'Aparece un joven crack que te compara', opts:[
    { txt:'Apadrinarlo', ef:g=>{ g.moral=Math.min(100,(g.moral||70)+6); return 'Le diste consejos. Terminó siendo tu discípulo.'; } },
    { txt:'Ignorarlo, mi tiempo pasó', ef:g=>{ return 'Cada uno con su historia. No te metiste.'; } }
  ] },
  { t:'Nietos!', minAge:55, opts:[
    { txt:'Ser el abuelo que malcría', ef:g=>{ g.moral=Math.min(100,(g.moral||70)+14); g.dinero=Math.max(0,(g.dinero||0)-20000); return 'Cada visita es una fiesta. Nunca fuiste tan feliz.'; } },
    { txt:'Ser abuelo estricto', ef:g=>{ g.moral=Math.min(100,(g.moral||70)+6); return 'Amor con reglas. Los nietos te respetan.'; } }
  ] },
  { t:'Se te acerca alguien de tu barrio', opts:[
    { txt:'Ayudarlo con una changa', ef:g=>{ g.dinero=Math.max(0,(g.dinero||0)-5000); g.moral=Math.min(100,(g.moral||70)+8); return 'Le tendiste la mano. El barrio te lo devuelve con cariño.'; } },
    { txt:'No es problema mío', ef:g=>{ g.moral=Math.max(0,(g.moral||70)-4); return 'Le diste la espalda. Te queda una espinita.'; } }
  ] },
  { t:'Un viaje pendiente', minAge:45, opts:[
    { txt:'Recorrer el mundo con mi pareja', ef:g=>{ g.dinero=Math.max(0,(g.dinero||0)-60000); g.moral=Math.min(100,(g.moral||70)+12); return 'Un año de mochilero-veterano. Recuerdos para toda la vida.'; } },
    { txt:'Un finde en la playa alcanza', ef:g=>{ g.moral=Math.min(100,(g.moral||70)+3); return 'Cortito pero disfrutado.'; } }
  ] },
  { t:'Te ofrecen ser Ministro de Deporte', minAge:50, opts:[
    { txt:'Aceptar y hacer política pública', ef:g=>{ const b=Math.random()<.5; g.fama=Math.min(100,(g.fama||50)+(b?12:-5)); return b?'Reformaste el deporte del país. Estatua en camino.':'La política te devoró. Mucha crítica, poca reforma.'; } },
    { txt:'El fútbol es mi mundo, no la política', ef:g=>{ return 'Preferís mantener las manos limpias.'; } }
  ] },
  { t:'Reunión de amigos del vestuario', opts:[
    { txt:'Ir y viajar a verlos', ef:g=>{ g.moral=Math.min(100,(g.moral||70)+8); return 'Charla, asado y anécdotas. Los años no borran nada.'; } },
    { txt:'Muy lejos, mando saludos', ef:g=>{ return 'Los saludás por video. No es lo mismo.'; } }
  ] },
  { t:'Se muere un compañero de época', minAge:55, opts:[
    { txt:'Ir al velorio y hablar de él', ef:g=>{ g.moral=Math.max(0,(g.moral||70)-6); return 'Un adiós difícil. La camada empieza a partir.'; } },
    { txt:'Mandar flores y no ir', ef:g=>{ g.moral=Math.max(0,(g.moral||70)-3); return 'Preferís recordarlo como era. Cada uno hace el duelo a su manera.'; } }
  ] },
  { t:'Un chico del barrio te pide una entrevista', opts:[
    { txt:'Darle una tarde entera', ef:g=>{ g.moral=Math.min(100,(g.moral||70)+6); return 'Le contaste todo. El pibe salió emocionado.'; } },
    { txt:'Que la coordine mi representante', ef:g=>{ return 'Media hora, lo justo. Profesional.'; } }
  ] },
  { t:'Un empresario te propone un club de fútbol propio', opts:[
    { txt:'Poner plata y fundarlo', ef:g=>{ g.dinero=Math.max(0,(g.dinero||0)-150000); const b=Math.random()<.55; return b?'El club creció. Sos presidente-fundador.':'No prosperó. Perdiste guita y ganas.'; } },
    { txt:'No, ya di lo mío al fútbol', ef:g=>{ return 'Rechazaste. Tu paz vale más que otra aventura.'; } }
  ] },
  { t:'Divorcio', minAge:42, opts:[
    { txt:'Aceptar el fin con dignidad', ef:g=>{ g.dinero=Math.max(0,(g.dinero||0)-100000); g.moral=Math.max(0,(g.moral||70)-8); return 'Fue duro pero maduro. Cada uno para su lado.'; } },
    { txt:'Pelear para salvarlo', ef:g=>{ const b=Math.random()<.4; g.moral=(g.moral||70)+(b?6:-10); return b?'Terapia, tiempo y perdón. Volvieron a empezar.':'No hubo forma. Terminó peor.'; } }
  ] },
  { t:'Serie de streaming basada en tu vida', minAge:45, opts:[
    { txt:'Dar los derechos', ef:g=>{ g.dinero=(g.dinero||0)+250000; g.fama=Math.min(100,(g.fama||50)+15); return 'Éxito global. Toda una generación te conoce ahora.'; } },
    { txt:'Mi historia es mía', ef:g=>{ return 'Rechazaste. Guardás tu historia como un tesoro personal.'; } }
  ] },
  { t:'Fundás una ONG', opts:[
    { txt:'Fútbol para pibes de bajos recursos', ef:g=>{ g.dinero=Math.max(0,(g.dinero||0)-40000); g.moral=Math.min(100,(g.moral||70)+15); return 'Cientos de pibes patean por tu ONG. Tu legado más grande.'; } },
    { txt:'Ya tuve suficiente exposición', ef:g=>{ return 'Preferís donar en silencio.'; } }
  ] },
  { t:'Rival histórico quiere hacer las paces', opts:[
    { txt:'Aceptar y reconciliarse', ef:g=>{ g.moral=Math.min(100,(g.moral||70)+8); return 'Un café y todo el rencor se fue. Ahora son amigos.'; } },
    { txt:'Lo pasado, pasado', ef:g=>{ g.moral=Math.max(0,(g.moral||70)-4); return 'No fuiste. Te quedó el nudo por un tiempo.'; } }
  ] },
  { t:'Volvés al barrio a jugar el picadito', opts:[
    { txt:'Bajar del pedestal', ef:g=>{ g.moral=Math.min(100,(g.moral||70)+10); return 'Los pibes flipando, vos disfrutando. Como al principio.'; } },
    { txt:'Ya no juego, solo miro', ef:g=>{ g.moral=Math.min(100,(g.moral||70)+3); return 'Miraste el partido desde el borde con una birra.'; } }
  ] },
  { t:'Recibís un doctorado honoris causa', minAge:55, opts:[
    { txt:'Ir con tu familia', ef:g=>{ g.fama=Math.min(100,(g.fama||50)+8); return 'Toga, birrete, discurso. Tu vieja llora en primera fila.'; } },
    { txt:'Mandar un video de agradecimiento', ef:g=>{ return 'No te sentís cómodo con la solemnidad.'; } }
  ] }
];
function lifeEventRandom(edad, seen){
  const pool = LIFE_EVENTS.map((_,i)=>i).filter(i=>{
    const e = LIFE_EVENTS[i];
    if(e.minAge && edad < e.minAge) return false;
    if(seen.indexOf(i)>=0) return false;
    return true;
  });
  if(!pool.length){ seen.length=0; return lifeEventRandom(edad, seen); }
  const idx = pool[Math.floor(Math.random()*pool.length)];
  return { idx, ev: LIFE_EVENTS[idx] };
}
// Loop anual post-retiro: muestra 1 decisión por año hasta 70 o hasta que el jugador termine.
window._carreraVida = function(){
  if(!G) G=load(); if(!G) return;
  if(!G.vidaEdad) G.vidaEdad = G.edad || (16 + (G.years||10));
  if(!G.vidaHist) G.vidaHist = [];
  if(!G._vidaSeen) G._vidaSeen = [];
  if(G.vidaEdad >= 70){ save(); retiro(); return; }
  const pick = lifeEventRandom(G.vidaEdad, G._vidaSeen);
  if(!pick){ save(); retiro(); return; }
  G._vidaEv = pick;
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:22px 20px calc(30px + env(safe-area-inset-bottom));">
    <div style="text-align:center;margin-bottom:16px;">
      <div style="font-size:11px;font-weight:900;letter-spacing:2px;color:#a78bfa;">VIDA · ${G.vidaEdad} AÑOS</div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:24px;color:#fff;margin-top:6px;line-height:1.15;">${esc(pick.ev.t)}</div>
    </div>
    <div style="background:linear-gradient(160deg,rgba(167,139,250,.08),rgba(20,22,18,.5));border:1px solid rgba(167,139,250,.3);border-radius:16px;padding:16px;">
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${pick.ev.opts.map((o,i)=>`<button onclick="window._carreraVidaElegir(${i})" style="${btn(i===0)}">${o.txt}</button>`).join('')}
      </div>
    </div>
    <button onclick="window._carreraVidaFin()" style="width:100%;margin-top:14px;background:#161616;color:#aaa;border:1px solid #262626;border-radius:12px;padding:12px;font-weight:800;font-size:12.5px;cursor:pointer;">Terminar y ver resumen final</button>
  </div>`;
};
window._carreraVidaElegir = function(i){
  const pick = G._vidaEv; const o = pick.ev.opts[i]; if(!o) return;
  const res = o.ef(G);
  G.vidaHist.push({ edad:G.vidaEdad, t:pick.ev.t, res });
  G._vidaSeen.push(pick.idx);
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
    <div style="max-width:520px;margin:0 auto;padding:60px 20px 40px;text-align:center;">
      <div style="font-size:11px;font-weight:900;letter-spacing:2px;color:#a78bfa;margin-bottom:12px;">${G.vidaEdad} AÑOS · ${esc(pick.ev.t)}</div>
      <div style="font-size:16px;color:#fff;font-weight:700;line-height:1.6;margin-bottom:26px;">${esc(res)}</div>
      <button onclick="window._carreraVidaSig()" style="background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;border:none;border-radius:13px;padding:13px 30px;font-weight:900;cursor:pointer;">Siguiente año <i class='bx bx-right-arrow-alt'></i></button>
      <button onclick="window._carreraVidaFin()" style="display:block;margin:14px auto 0;background:transparent;color:#888;border:none;font-weight:800;font-size:12px;cursor:pointer;">Terminar y ver resumen</button>
    </div>`;
};
window._carreraVidaSig = function(){ G.vidaEdad++; save(); window._carreraVida(); };
window._carreraVidaFin = function(){ save(); retiro(); };

window._carreraSegundaVida = function(rol){
  if (!G) G = load(); if (!G) return;
  const nivelF = Math.round(G.nivel);
  const roles = {
    dt: () => {
      const buenDT = Math.random() < clamp((nivelF - 60) / 40, 0.15, 0.75);
      const anios = ri(15, 25);
      const titsExtra = buenDT ? ri(2, 6) : ri(0, 1);
      G.titulos = (G.titulos || 0) + titsExtra;
      if (titsExtra > 0 && !G.vitrina) G.vitrina = [];
      for (let i = 0; i < titsExtra; i++) G.vitrina.push({ nombre:'Título como DT', edad:38+ri(1,anios), club:'Como DT', img:'champions' });
      return { rol:'Director Técnico', icon:'bx-clipboard', res: buenDT ? `Dirigiste ${anios} años y ganaste ${titsExtra} títulos importantes. Te ganaste el respeto del ambiente y hoy sos referente técnico.` : `Dirigiste ${anios} años con altibajos, pero siempre con dignidad. No fue tan fácil como jugar, pero disfrutaste el oficio.` };
    },
    comentarista: () => {
      return { rol:'Comentarista de TV', icon:'bx-microphone', res:`Colgaste los botines y agarraste el micrófono. Te convertiste en una voz querida del fútbol. Tus análisis marcan tendencia y tu carisma llena programas.` };
    },
    dirigente: () => {
      const bienDirigente = Math.random() < 0.5;
      return { rol:'Dirigente', icon:'bx-briefcase', res: bienDirigente ? `Llegaste a la presidencia del club de tu vida. Reformaste todo, saneaste las cuentas y ganaste el corazón del socio.` : `Te metiste en la política del club. Un desafío enorme, con peleas internas y satisfacciones a medias.` };
    },
    empresario: () => {
      const bienes = (G.bienes||[]).length;
      const ganancia = ri(500000, 3000000) + bienes * 200000;
      G.dinero = (G.dinero || 0) + ganancia;
      return { rol:'Empresario', icon:'bx-store', res:`Multiplicaste tu patrimonio con inversiones. Sumaste €${(ganancia/1e6).toFixed(1)}M en los años post-retiro. Vives de rentas.` };
    },
    escuela: () => {
      return { rol:'Escuela de fútbol', icon:'bx-award', res:`Abriste una escuela de fútbol en tu barrio. Cientos de pibes pasaron por tus manos. Algunos ya juegan en primera. Devolviste todo lo que te dio el fútbol.` };
    },
    disfrutar: () => {
      return { rol:'Vida tranquila', icon:'bx-glasses', res:`Elegiste retirarte del todo. Familia, viajes, amigos. El fútbol ya te dio todo; ahora te tocaba a vos disfrutar.` };
    }
  };
  const r = (roles[rol] || roles.disfrutar)();
  G.segundaVida = r;
  G.vidaEdad = G.edad || (16 + (G.years||10));
  try { saveCareer(G); } catch(e) {}
  try { localStorage.setItem(LS, JSON.stringify(G)); } catch(e) {}
  // Arranca el loop anual de vida (año por año hasta 70 o hasta que el usuario termine).
  window._carreraVida();
};
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
  try{
    if (navigator.share) {
      navigator.share({ title:'Mi carrera en Canchero Leyenda', text: texto }).catch(()=>{});
      return;
    }
  }catch(e){}
  try{
    navigator.clipboard.writeText(texto);
    alert('¡Copiado! Pegalo en tus redes.\n\n'+texto);
  }catch(e){
    prompt('Copiá y compartí tu carrera:', texto);
  }
};
function cell(l, v, col){ col = col || '#fff'; return `<div style="background:#0d100d;border:1px solid #1c1c1c;border-radius:12px;padding:11px 4px;text-align:center;"><div style="font-size:20px;font-weight:900;color:${col};line-height:1;">${esc(v)}</div><div style="font-size:9px;color:#666;font-weight:800;letter-spacing:1px;margin-top:5px;">${l}</div></div>`; }
function st2(l,v){ return `<div style="background:rgba(255,255,255,.04);border:1px solid #1e1e1e;border-radius:12px;padding:12px;"><div style="font-size:9px;color:#666;font-weight:800;letter-spacing:1px;">${l}</div><div style="font-size:16px;font-weight:900;color:${A};margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(v)}</div></div>`; }

console.log('[canchero-carrera] v2 cargado');
})();
