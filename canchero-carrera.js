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
function trofeoImgSlug(nombre){
  const n = (nombre||'').toLowerCase();
  // Internacionales
  if (n.includes('mundial de clubes') || n.includes('mundial clubes')) return 'mundial-clubes';
  if (n.includes('intercontinental')) return 'intercontinental';
  if (n.includes('champions')) return 'champions';
  if (n.includes('libertadores')) return 'libertadores';
  if (n.includes('europa league') || n.includes('europa')) return 'europa';
  if (n.includes('sudamericana')) return 'sudamericana';
  // Selecciones
  if (n.includes('mundial')) return 'mundial';
  if (n.includes('eurocopa') || n.includes('eurocup')) return 'eurocopa';
  if (n.includes('copa américa') || n.includes('copa america')) return 'copa-america';
  if (n.includes('olímpico') || n.includes('olimpic')) return 'oro-olimpico';
  // Ligas nacionales
  if (n.includes('laliga') || n.includes('la liga')) return 'laliga';
  if (n.includes('premier')) return 'premier';
  if (n.includes('ligue') || n.includes('francia')) return 'ligue1';
  if (n.includes('serie a') || n.includes('coppa italia') || n.includes('copa italia')) return 'coppa-italia';
  if (n.includes('portugal')) return 'copa-portugal';
  if (n.includes('bundesliga') || n.includes('alemana')) return 'coppa-italia'; // fallback
  if (n.includes('brasil')) return 'copa-brasil';
  if (n.includes('copa argentina') || n.includes('copa arg')) return 'copa-argentina';
  if (n.includes('argentin')) return 'copa-argentina';
  if (n.includes('chile')) return 'copa-chile';
  if (n.includes('uruguay') || n.includes('uruguayo')) return 'liga-uy';
  return 'champions';
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
    <img src="${JERSEY_PNG}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;mix-blend-mode:multiply;pointer-events:none;background:transparent;">
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
    // Frecuencia REAL: la carrera arranca en 2026 (año del debut). Cada temporada +1 año.
    // Mundial 2030, Copa América 2028, Eurocopa 2028, JJOO 2028/2032.
    anio:2026,
    dinero:0, valor:100000, fama:5, moral:72, titulos:0, temporada:1,
    tot:{pj:0,g:0,a:0}, timeline:[], hist:[], vitrina:[], clasificadoInter:false,
    dif:(d.dif||'normal'), creado:Date.now()
  };
  save(); window._carreraHub();
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
          <div style="text-align:right;flex-shrink:0;"><div style="font-size:10px;color:#666;font-weight:800;">EDAD</div><div style="font-size:20px;font-weight:900;color:#fff;">${G.edad}</div><div style="font-size:9px;color:#666;margin-top:4px;">VALOR</div><div style="font-size:12px;font-weight:900;color:${A};">€${(G.valor>=1e6?(G.valor/1e6).toFixed(1)+'M':(G.valor/1e3|0)+'K')}</div></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:14px;text-align:center;">
          <div style="flex:1;"><div style="font-size:10px;color:#666;font-weight:800;">PJ</div><div style="font-size:18px;font-weight:900;color:#fff;">${G.tot.pj}</div></div>
          <div style="flex:1;"><div style="font-size:10px;color:#666;font-weight:800;">GLS</div><div style="font-size:18px;font-weight:900;color:#fff;">${G.tot.g}</div></div>
          <div style="flex:1;"><div style="font-size:10px;color:#666;font-weight:800;">AST</div><div style="font-size:18px;font-weight:900;color:#fff;">${G.tot.a}</div></div>
          <div style="flex:1;"><div style="font-size:10px;color:#666;font-weight:800;">TÍTULOS</div><div style="font-size:18px;font-weight:900;color:${A};">${G.titulos}</div></div>
        </div>
        <button onclick="window._carreraTemporada()" style="width:100%;margin-top:14px;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:12px;padding:14px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;">${G.edad>=16+G.years?'VER RETIRO':'JUGAR TEMPORADA '+G.temporada}  <i class='bx bx-right-arrow-alt'></i></button>
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
        <div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;">${G.vitrina.map(v=>`<div style="flex-shrink:0;width:78px;text-align:center;"><img src="img/trofeos/${trofeoImgSlug(v.nombre)}.webp" onerror="this.onerror=null;this.src='img/trofeos/champions.webp'" style="height:54px;object-fit:contain;filter:drop-shadow(0 4px 10px rgba(186,255,0,.25));"><div style="font-size:9px;color:#ccc;font-weight:700;margin-top:4px;line-height:1.2;">${esc(v.nombre)}</div><div style="font-size:8px;color:#666;">${v.edad} años</div></div>`).join('')}</div>
      </div>`:''}
    </div>
  </div>`;
};

// ── TEMPORADA (simulación + decisión) ────────────────────────────────────────────
window._carreraTemporada = function(){
  if(G.edad>=16+G.years) return retiro();
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
  const aporte = clamp((rend-0.3)*4 + (G.nivel-G.clubStr)/12, -2.5, 2.5);   // buen jugador sube al equipo
  // Ruido MAS AMPLIO (rnd -2.5 a 2.5) → los grandes NO ganan siempre (aunque tengan
  // el mejor plantel, hay temporadas malas). Antes ganaba siempre el mismo equipo.
  let pos = Math.round(baseRank+1 - aporte + rnd(-2.5, 2.5));
  pos = clamp(pos, 1, totalEq);
  // ── TÍTULOS coherentes con la liga (pueden acumularse en la misma temporada) ──
  const T = trofeosDe(G.liga);
  const titulosGanados = [];
  // Liga local: SOLO si sos primero
  if (pos === 1) titulosGanados.push(T.local);
  // Copa nacional: chance INDEPENDIENTE de la liga (grandes la ganan mas seguido).
  // Antes con "else if" no podia ganar copa+liga en el mismo año, cosa comun en la realidad.
  if (T.copaNac && Math.random() < clamp((G.clubStr-58)/120, 0.05, 0.32)) titulosGanados.push(T.copaNac);
  // Copa internacional: si el club es GRANDE y clasificó.
  if (G.clasificadoInter && T.inter && Math.random() < clamp((G.clubStr-72)/85, 0, 0.30)) titulosGanados.push(T.inter);
  // Copa internacional "lite" (Europa League / Sudamericana): clubes medianos.
  if (G.clasificadoInterLite && T.interLite && Math.random() < clamp((G.clubStr-65)/95, 0, 0.28)) titulosGanados.push(T.interLite);
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
  // ── Valor de mercado ──
  const edadFactor = G.edad<28?1.25:G.edad<32?0.85:0.45;
  G.valor = Math.round((G.nivel**2.4)*edadFactor*20 + G.titulos*80000);
  // ── Timeline COMPLETO (una fila por temporada, con posición y trofeo) ──
  G.timeline.push({ edad:G.edad, temporada:G.temporada, club:G.club, liga:G.liga, niv:Math.round(G.nivel), pj, g, a, dN, pos, totalEq, titulo, clasif:clasifText, move:G.moveLiga });
  // Rentas anuales de bienes (restaurante/escuela): entran una vez por temporada.
  if(G.bienes && G.bienes.length){
    const renta = G.bienes.reduce((s,b)=>{ const B=bienByld(b.id); return s+((B&&B.renta)?B.renta:0); },0);
    if(renta>0) G.dinero = (G.dinero||0) + renta;
  }
  G.temporada++; G.edad++; G.anio = (G.anio||2026) + 1;
  save();
  resumenTemporada({pj,g,a,dN,pos,totalEq,titulo,clasif:clasifText,move:G.moveLiga});
};

function resumenTemporada(r){
  const m=document.getElementById('carrera-modal')||overlay();
  m.innerHTML=`
  <div style="max-width:520px;margin:0 auto;padding:30px 22px calc(30px + env(safe-area-inset-bottom));min-height:100%;display:flex;flex-direction:column;">
    <div style="text-align:center;margin-bottom:18px;">
      <div style="font-size:11px;font-weight:900;letter-spacing:2px;color:${A};">TEMPORADA ${G.temporada-1} · ${G.edad-1} AÑOS</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:6px;">${clubBadge(G.club,26)}<div style="font-family:Outfit,sans-serif;font-weight:900;font-size:20px;color:#fff;">${esc(G.club)}</div></div>
      <div style="font-size:12px;color:#9aa0a6;margin-top:2px;">${esc(G.liga)} · ${posLabel(r.pos)} de ${r.totalEq}</div>
      ${r.titulo?`<div style="margin-top:14px;display:flex;flex-direction:column;align-items:center;">
        <img src="img/trofeos/${trofeoImgSlug(r.titulo)}.webp" alt="" style="height:100px;object-fit:contain;filter:drop-shadow(0 8px 22px rgba(186,255,0,.4));animation:crTrophy .7s cubic-bezier(.2,1.4,.4,1) both;" onerror="this.onerror=null;this.src='img/trofeos/champions.webp';this.style.opacity=.9">
        <div style="margin-top:8px;font-size:16px;font-weight:900;color:${A};letter-spacing:.5px;animation:crPop .5s .2s both;"><i class='bx bxs-trophy'></i> ¡${esc(r.titulo)}!</div>
        <div style="font-size:11px;color:#8a8f96;margin-top:2px;">Campeón con ${esc(G.club)}</div>
      </div><style>@keyframes crTrophy{0%{transform:scale(.3) rotate(-12deg);opacity:0}100%{transform:scale(1) rotate(0);opacity:1}}@keyframes crPop{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}</style>`:''}
      ${r.clasif?`<div style="margin-top:12px;display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;color:#4fc3f7;background:rgba(79,195,247,.1);border:1px solid rgba(79,195,247,.3);border-radius:20px;padding:5px 12px;"><i class='bx bx-star'></i> ${esc(r.clasif)}</div>`:''}
      ${r.move?`<div style="margin-top:12px;display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:900;color:${r.move.tipo==='asc'?'#22c55e':'#ef4444'};background:${r.move.tipo==='asc'?'rgba(34,197,94,.12)':'rgba(239,68,68,.12)'};border:1px solid ${r.move.tipo==='asc'?'rgba(34,197,94,.4)':'rgba(239,68,68,.4)'};border-radius:20px;padding:6px 14px;"><i class='bx ${r.move.tipo==='asc'?'bx-up-arrow-alt':'bx-down-arrow-alt'}'></i> ${r.move.tipo==='asc'?'¡ASCENSO! ':'DESCENSO. '}Ahora en <b>${esc(r.move.a)}</b></div>`:''}
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;">
      ${st('PJ',r.pj)}${st('GOLES',r.g)}${st('ASIST',r.a)}${st('NIVEL',(r.dN>=0?'+':'')+r.dN)}
    </div>
    <div id="cr-evwrap"></div>
  </div>`;
  // Decisiones de esta temporada según dificultad.
  G._evLeft = decisionsForSeason();
  if(G._evLeft>0){ setTimeout(()=>mostrarEvento(),50); }
  else { const w=document.getElementById('cr-evwrap'); if(w) w.innerHTML=contBtn(); }
}
function decisionsForSeason(){
  const d=(G&&G.dif)||'normal';
  if(d==='intenso') return 4;
  if(d==='leve') return (G.temporada%2===0)?1:0;
  return 1;
}
function contBtn(){ return `<div style="text-align:center;padding:6px 0;"><button onclick="window._carreraHub()" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:13px 30px;font-weight:900;cursor:pointer;">Continuar <i class='bx bx-right-arrow-alt'></i></button></div>`; }
// Tras resolver una decisión: si quedan decisiones esta temporada, mostrar otra; si no, al hub.
window._carreraContinuar = function(){
  if(G && G._evLeft>0){ mostrarEvento(); }
  else { window._carreraHub(); }
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
      { txt: flagOf(candidatas[0]) + 'Jugar para ' + candidatas[0], ef:g=>{ g.pais = candidatas[0]; g.fama+=10; g.moral-=3; return 'Aceptaste la convocatoria de '+g.pais+'. Nuevo himno, nueva historia.'; } }
    ];
    if (candidatas[1]) opts.push({ txt: flagOf(candidatas[1]) + 'Jugar para ' + candidatas[1], ef:g=>{ g.pais = candidatas[1]; g.fama+=10; g.moral-=3; return 'Elegiste ' + g.pais + '. Debut internacional en camino.'; } });
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
      <button onclick="window._carreraElegirOferta('${kind==='renov'?'rechazar_renov':'quedarme'}',-1)" style="${btn(false)}"><i class='bx bx-home-heart' style="margin-right:6px;color:#8a8f86;"></i>${kind==='renov'?'Rechazar renovación (escuchar ofertas)':'Quedarme en '+esc(G.club)}</button>
    </div>
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
    { txt:'Todavía no es momento', ef:g=>{ g.dinero+=5000; return 'Lo dejás para más adelante.'; } } ] },

  // ── AMATEUR / VIDA (con consecuencias reales, buenas Y malas) ──────────────
  { t:'El clásico del barrio por un lechón', img:'potrero', d:'Se juega el clásico del barrio y la apuesta es un lechón entero. Media cuadra vino a verte.', opts:[
    { txt:'Jugar con todo por el honor', ef:g=>{ const gana=Math.random()<.55; g.moral+=gana?10:-8; g.fama+=gana?4:-2; return gana?'Metiste el gol del triunfo. Comés lechón como un rey y el barrio te aúpa.':'Erraste el penal decisivo. Te comen los asados ajenos y la cargada dura meses.'; } },
    { txt:'No arriesgar, es solo un picado', ef:g=>{ g.moral-=4; return 'Jugaste tibio. Perdieron y algunos te miran de reojo: "se cree profesional".'; } } ] },
  { t:'Trabajo en la construcción', img:'potrero', d:'No te alcanza la plata. Te ofrecen changas en una obra, pero el esfuerzo físico te puede pasar factura.', opts:[
    { txt:'Aceptar la changa', ef:g=>{ g.dinero+=8000; const cansado=Math.random()<.5; g.nivel+=cansado?-2:0; return cansado?'Llegás muerto a los entrenamientos. El técnico nota que rendís menos.':'Te ganás unos pesos y mantenés la humildad. Todo bajo control.'; } },
    { txt:'Apostar todo al fútbol', ef:g=>{ g.dinero-=3000; g.moral+=3; g.nivel+=1; return 'La pasás justo de plata, pero descansás y entrenás enfocado.'; } } ] },
  { t:'Un ojeador en la tribuna', img:'ojeador', d:'Corre el rumor de que hay un ojeador de un club grande mirando el partido de hoy.', opts:[
    { txt:'Salir a comerme la cancha', ef:g=>{ const bien=Math.random()<.5; g.fama+=bien?12:-2; g.nivel+=bien?2:-1; g.valor=Math.round((g.valor||100000)*(bien?1.2:0.95)); return bien?'Jugaste el partido de tu vida. El ojeador pidió tu teléfono.':'Quisiste hacer de más, forzaste jugadas y te fue mal. El ojeador ni te anotó.'; } },
    { txt:'Jugar tranquilo, lo mío', ef:g=>{ g.nivel+=1; return 'Partido sobrio y prolijo. Ni brillás ni fallás; quedás en un cajón de "a seguir".'; } } ] },
  { t:'Pelea en un boliche', img:'joda', d:'Salís de joda y un desconocido te busca pelea de la nada, filmando con el celular.', opts:[
    { txt:'Irme sin dar bola', ef:g=>{ g.moral+=3; g.fama+=2; return 'Te fuiste digno. Al otro día nadie habla de vos, y eso está perfecto.'; } },
    { txt:'Encararlo', ef:g=>{ const escandalo=Math.random()<.65; g.fama+=escandalo?-14:1; g.moral-=escandalo?8:0; g.dinero-=escandalo?15000:0; return escandalo?'El video se hizo viral. El club te multa y sale en todos lados. Papelón.':'No pasó a mayores, pero fue una imprudencia.'; } } ] },
  { t:'Conocés a tu ídolo', img:'seleccion', d:'En un evento aparece tu ídolo de la infancia y te da unos minutos de charla.', opts:[
    { txt:'Pedirle consejos y escuchar', ef:g=>{ g.moral+=10; g.nivel+=1; return 'Sus palabras te marcan. Entrenás con otra mentalidad, más profesional.'; } },
    { txt:'Solo la foto para redes', ef:g=>{ g.fama+=5; return 'Buena foto, muchos likes. Pero sentís que desaprovechaste el momento.'; } } ] },
  { t:'Oferta turbia de un apostador', img:'dinero', d:'Un apostador te ofrece una fortuna por "aflojar" en un partido puntual.', opts:[
    { txt:'Aceptar (muy riesgoso)', ef:g=>{ const cae=Math.random()<.6; g.dinero+=cae?0:200000; g.fama+=cae?-40:0; g.moral-=cae?30:6; return cae?'Te descubrieron. Suspensión, escándalo y tu carrera al borde del final.':'Nadie se enteró... pero no podés ni mirarte al espejo.'; } },
    { txt:'Rechazar y denunciarlo', ef:g=>{ g.fama+=8; g.moral+=8; return 'Hiciste lo correcto. La AFA y la prensa te ponen de ejemplo.'; } } ] },
  { t:'Sobrepeso en la pretemporada', img:'lesion', d:'Volviste de vacaciones con unos kilos de más y el preparador físico te marca.', opts:[
    { txt:'Ponerme a full con la dieta', ef:g=>{ g.nivel+=2; g.moral+=2; return 'Te pusiste en forma rápido. El cuerpo técnico valora tu compromiso.'; } },
    { txt:'Ya lo bajo jugando', ef:g=>{ const mal=Math.random()<.6; g.nivel+=mal?-3:0; return mal?'Arrancaste lento y pesado. Perdiste la titularidad las primeras fechas.':'Zafaste, lo fuiste bajando de a poco.'; } } ] },
  { t:'Descubren un abuelo extranjero', img:'seleccion', _dyn:true, d:'', opts:[] },
  { t:'Amague de retiro anticipado', img:'prensa', d:'Venís golpeado y frustrado. Se te cruza por la cabeza colgar los botines antes de tiempo.', opts:[
    { txt:'Seguir peleándola', ef:g=>{ g.moral+=6; g.nivel+=1; return 'Sacaste fuerzas. La resiliencia te devuelve al primer plano.'; } },
    { txt:'Bajar un cambio y priorizar salud', ef:g=>{ g.moral+=4; g.nivel-=1; return 'Te cuidás más. Rendís un poco menos pero disfrutás de nuevo.'; } } ] }
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
  const wrap=document.getElementById('cr-evwrap');
  if(wrap) wrap.innerHTML=`<div style="text-align:center;padding:6px 0;">
    <div style="font-size:15px;color:#fff;font-weight:700;line-height:1.55;margin-bottom:12px;">${esc(res)}</div>
    ${chips?`<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:16px;">${chips}</div>`:'<div style="height:6px;"></div>'}
    <button onclick="window._carreraContinuar()" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:13px 28px;font-weight:900;cursor:pointer;">Continuar</button>
  </div>`;
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
const BIENES = [
  { id:'auto',        n:'Auto de lujo',          i:'bx-car',         p:120000,  fama:8,  moral:2 },
  { id:'casa',        n:'Casa premium',          i:'bx-home',        p:600000,  fama:6,  moral:8 },
  { id:'yate',        n:'Yate',                  i:'bxs-ship',       p:1500000, fama:20, moral:5 },
  { id:'avion',       n:'Avión privado',         i:'bx-plane-alt',   p:5000000, fama:35, moral:3 },
  { id:'reloj',       n:'Reloj de colección',    i:'bx-time-five',   p:80000,   fama:5,  moral:1 },
  { id:'restaurante', n:'Restaurante propio',    i:'bx-restaurant',  p:400000,  fama:6,  moral:5, renta:60000 },
  { id:'escuela',     n:'Escuela de fútbol',     i:'bx-award',       p:250000,  fama:10, moral:12, renta:40000 },
  { id:'fundacion',   n:'Fundación benéfica',    i:'bxs-donate-heart', p:200000, fama:15, moral:20 },
  { id:'inversion',   n:'Inversión bursátil',    i:'bx-line-chart',  p:100000,  fama:0,  moral:0,  invert:true }
];
function bienByld(id){ return BIENES.find(b=>b.id===id); }
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
      <div style="font-size:11px;color:#9aa0a6;font-weight:800;letter-spacing:1px;margin:6px 0 8px;">TUS PERTENENCIAS (${G.bienes.length})</div>
      ${G.bienes.length ? G.bienes.map(b => { const B=bienByld(b.id)||{n:b.id,i:'bx-box'}; const reventa=Math.round((b.precio||B.p)*0.65); return `<div style="display:flex;align-items:center;gap:12px;background:#0d100d;border:1px solid #1c1c1c;border-radius:12px;padding:11px 13px;margin-bottom:7px;">
        <i class='bx ${B.i}' style="font-size:26px;color:#facc15;"></i>
        <div style="flex:1;min-width:0;"><div style="font-size:13.5px;font-weight:900;color:#fff;">${esc(B.n)}</div><div style="font-size:10.5px;color:#666;">Comprado a ${eur(b.precio||B.p)}${B.renta?' · Renta '+eur(B.renta)+'/año':''}</div></div>
        <button onclick="window._carreraVender('${b.id}',${reventa})" style="background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:7px 12px;font-weight:800;font-size:11px;cursor:pointer;white-space:nowrap;">Vender ${eur(reventa)}</button>
      </div>`; }).join('') : `<div style="padding:20px;text-align:center;color:#666;font-size:12px;background:#0d100d;border:1px solid #1c1c1c;border-radius:12px;">Todavía no compraste nada.</div>`}
      <div style="font-size:11px;color:#9aa0a6;font-weight:800;letter-spacing:1px;margin:18px 0 8px;">TIENDA</div>
      ${BIENES.map(B => { const own = G.bienes.some(b=>b.id===B.id); const puedo = (G.dinero||0) >= B.p; return `<div style="display:flex;align-items:center;gap:12px;background:#0d100d;border:1px solid #1c1c1c;border-radius:12px;padding:11px 13px;margin-bottom:7px;${own?'opacity:.55':''}">
        <i class='bx ${B.i}' style="font-size:26px;color:${A};"></i>
        <div style="flex:1;min-width:0;"><div style="font-size:13.5px;font-weight:900;color:#fff;">${esc(B.n)}</div><div style="font-size:10.5px;color:#8a8f96;">${B.fama?'+':''}${B.fama} fama · ${B.moral?'+':''}${B.moral} moral${B.renta?' · Renta '+eur(B.renta)+'/año':''}${B.invert?' · Puede rendir o perder':''}</div></div>
        <button ${own||!puedo?'disabled':''} onclick="window._carreraComprar('${B.id}')" style="background:${own?'transparent':puedo?A:'rgba(255,255,255,.05)'};color:${own?'#666':puedo?'#000':'#666'};border:${own?'1px solid #2a2a2a':'none'};border-radius:10px;padding:7px 12px;font-weight:900;font-size:11px;cursor:${own||!puedo?'default':'pointer'};white-space:nowrap;">${own?'TENÉS':eur(B.p)}</button>
      </div>`; }).join('')}
    </div>`;
};
window._carreraComprar = function(id){
  const B = bienByld(id); if(!B||!G) return;
  if((G.dinero||0) < B.p){ if(window.showToast) showToast('No te alcanza.', 'warning'); return; }
  if(!G.bienes) G.bienes = [];
  if(G.bienes.some(x=>x.id===id)){ return; }
  G.dinero -= B.p; G.bienes.push({ id, precio:B.p });
  G.fama = clamp((G.fama||0) + (B.fama||0), 0, 100);
  G.moral = clamp((G.moral||0) + (B.moral||0), 0, 100);
  // Inversión: efecto random ±50% al momento (rendimiento pasivo, no ligado a renta).
  if (B.invert) {
    const roi = rnd(-0.4, 0.9); G.dinero += Math.round(B.p * roi);
    if (window.showToast) showToast(roi>0? 'La inversión rindió +'+eur(Math.round(B.p*roi)) : 'Perdiste '+eur(Math.round(B.p*-roi)) , roi>0?'success':'error');
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
  const rangoTxt = leyenda ? 'LEYENDA DEL FÚTBOL' : (grande?'GRAN CARRERA':'CARRERA COMPLETA');
  const rangoColor = leyenda ? '#facc15' : grande ? A : '#94a3b8';
  const rangoIcon = leyenda ? 'bx-crown' : grande ? 'bx-medal' : 'bx-shield';
  const scoreN = careerScore(G);
  // Honores adicionales (badges dinámicos)
  const honores = [];
  if (G.tot.g >= 200) honores.push({i:'bx-football', c:'#22c55e', t:'+200 goles'});
  if (G.tot.a >= 100) honores.push({i:'bx-target-lock', c:'#22d3ee', t:'+100 asist.'});
  if (G.titulos >= 10) honores.push({i:'bx-crown', c:'#facc15', t:'Multicampeón'});
  if (anios >= 18)    honores.push({i:'bx-time', c:'#a78bfa', t:'Longevidad'});
  if (nivelF >= 90)   honores.push({i:'bxs-star', c:'#f59e0b', t:'Élite mundial'});
  if (G.tot.pj >= 400) honores.push({i:'bx-calendar-check', c:'#60a5fa', t:'+400 PJ'});
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

    <!-- VITRINA DE TROFEOS -->
    ${trofArr.length ? `<div class="cr-fade cr-fade-d2" style="margin-top:20px;">
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:12px;letter-spacing:2px;color:#facc15;margin-bottom:10px;padding-left:2px;"><i class='bx bx-trophy'></i> VITRINA DE TÍTULOS · ${G.titulos}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(88px,1fr));gap:10px;">
        ${trofArr.map(t=>`<div style="background:linear-gradient(160deg,rgba(250,204,21,.10),rgba(20,22,18,.6));border:1px solid rgba(250,204,21,.28);border-radius:14px;padding:10px 6px;text-align:center;">
          <div style="position:relative;height:64px;display:flex;align-items:center;justify-content:center;">
            <img src="img/trofeos/${t.slug}.webp" alt="" style="max-height:60px;max-width:100%;object-fit:contain;filter:drop-shadow(0 4px 12px rgba(250,204,21,.35));" onerror="this.style.display='none'">
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

    <!-- ACCIONES -->
    <div class="cr-fade cr-fade-d4" style="display:flex;flex-direction:column;gap:9px;margin-top:22px;">
      <button onclick="window._carreraLen()" style="width:100%;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:14px;padding:15px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;box-shadow:0 10px 30px rgba(80,220,110,.28);">EMPEZAR NUEVA CARRERA</button>
      <button onclick="window._carreraRanking()" style="width:100%;background:rgba(255,255,255,.05);color:#fff;border:1px solid #242424;border-radius:14px;padding:13px;font-weight:800;font-size:14px;cursor:pointer;"><i class='bx bx-bar-chart-alt-2' style="color:${A};"></i> Ver ranking global</button>
      <button onclick="document.getElementById('carrera-modal').remove();window.openGamesModal&&window.openGamesModal()" style="width:100%;background:transparent;color:#888;border:none;padding:11px;font-weight:800;font-size:13px;cursor:pointer;">Volver a Juegos</button>
    </div>
  </div>`;
  try{ localStorage.removeItem(LS); }catch(e){}
}
function cell(l, v, col){ col = col || '#fff'; return `<div style="background:#0d100d;border:1px solid #1c1c1c;border-radius:12px;padding:11px 4px;text-align:center;"><div style="font-size:20px;font-weight:900;color:${col};line-height:1;">${esc(v)}</div><div style="font-size:9px;color:#666;font-weight:800;letter-spacing:1px;margin-top:5px;">${l}</div></div>`; }
function st2(l,v){ return `<div style="background:rgba(255,255,255,.04);border:1px solid #1e1e1e;border-radius:12px;padding:12px;"><div style="font-size:9px;color:#666;font-weight:800;letter-spacing:1px;">${l}</div><div style="font-size:16px;font-weight:900;color:${A};margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(v)}</div></div>`; }

console.log('[canchero-carrera] v2 cargado');
})();
