// ── 30 países con regiones/ciudades ──────────────────────────
window.COUNTRIES = [
  {name:'Uruguay',regions:['Artigas','Canelones','Cerro Largo','Colonia','Durazno','Flores','Florida','Lavalleja','Maldonado','Montevideo','Paysandú','Río Negro','Rivera','Rocha','Salto','San José','Soriano','Tacuarembó','Treinta y Tres']},
  {name:'Argentina',regions:['Buenos Aires','Catamarca','Chaco','Chubut','Ciudad Autónoma de Buenos Aires','Córdoba','Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe','Santiago del Estero','Tierra del Fuego','Tucumán']},
  {name:'Brasil',regions:['Acre','Alagoas','Amapá','Amazonas','Bahia','Ceará','Distrito Federal','Espírito Santo','Goiás','Maranhão','Mato Grosso','Mato Grosso do Sul','Minas Gerais','Pará','Paraíba','Paraná','Pernambuco','Piauí','Rio de Janeiro','Rio Grande do Norte','Rio Grande do Sul','Rondônia','Roraima','Santa Catarina','São Paulo','Sergipe','Tocantins']},
  {name:'Chile',regions:['Aisén del General Carlos Ibáñez del Campo','Antofagasta','Arica y Parinacota','Atacama','Biobío','Coquimbo','La Araucanía','Libertador General Bernardo O\'Higgins','Los Lagos','Los Ríos','Magallanes','Maule','Región Metropolitana de Santiago','Tarapacá','Valparaíso','Ñuble']},
  {name:'Paraguay',regions:['Alto Paraguay','Alto Paraná','Amambay','Asunción','Boquerón','Caaguazú','Caazapá','Canindeyú','Central','Concepción','Cordillera','Guairá','Itapúa','Misiones','Ñeembucú','Paraguarí','Presidente Hayes','San Pedro']},
  {name:'Costa Rica',regions:['San José','Alajuela','Cartago','Heredia','Guanacaste','Puntarenas','Limón']},
  {name:'Panamá',regions:['Bocas del Toro','Coclé','Colón','Chiriquí','Darién','Herrera','Los Santos','Panamá','Panamá Oeste','Veraguas']},
  {name:'Cuba',regions:['Pinar del Río','Artemisa','La Habana','Mayabeque','Matanzas','Cienfuegos','Villa Clara','Sancti Spíritus','Ciego de Ávila','Camagüey','Las Tunas','Holguín','Granma','Santiago de Cuba','Guantánamo','Isla de la Juventud']},
  {name:'Haití',regions:['Artibonite','Centre','Grand\'Anse','Nippes','Nord','Nord-Est','Nord-Ouest','Ouest','Sud','Sud-Est']},
  {name:'Jamaica',regions:['Clarendon','Hanover','Kingston','Manchester','Portland','Saint Andrew','Saint Ann','Saint Catherine','Saint Elizabeth','Saint James','Saint Mary','Saint Thomas','Trelawny','Westmoreland']},
  {name:'España',regions:['Andalucía','Aragón','Asturias','Islas Baleares','Canarias','Cantabria','Castilla-La Mancha','Castilla y León','Cataluña','Comunitat Valenciana','Extremadura','Galicia','La Rioja','Comunidad de Madrid','Región de Murcia','Navarra','País Vasco','Ceuta','Melilla']},
  {name:'Portugal',regions:['Aveiro','Beja','Braga','Bragança','Castelo Branco','Coimbra','Évora','Faro','Guarda','Leiria','Lisboa','Portalegre','Porto','Santarém','Setúbal','Viana do Castelo','Vila Real','Viseu','Región Autónoma de Azores','Región Autónoma de Madeira']},
  {name:'Alemania',regions:['Baden-Württemberg','Bayern','Berlín','Brandeburgo','Bremen','Hamburgo','Hessen','Mecklemburgo-Pomerania Occidental','Niedersachsen','Renania del Norte-Westfalia','Renania-Palatinado','Saarland','Sajonia','Sajonia-Anhalt','Schleswig-Holstein','Turingia']},
  {name:'Italia',regions:['Abruzzo','Basilicata','Calabria','Campania','Emilia-Romaña','Friuli-Venezia Giulia','Lazio','Liguria','Lombardia','Marche','Molise','Piemonte','Puglia','Sardegna','Sicilia','Toscana','Trentino-Alto Adige/Südtirol','Umbria','Valle de Aosta/Vallée d\'Aoste','Veneto']},
  {name:'Polonia',regions:['Baja Silesia','Cuyavia y Pomerania','Lublin','Lubusz','Łódź','Pequeña Polonia','Mazovia','Opole','Subcarpacia','Podlaquia','Pomerania','Silesia','Santa Cruz','Varmia y Masuria','Gran Polonia','Pomerania Occidental']},
  {name:'Nigeria',regions:['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Níger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara','Territorio de la Capital Federal']},
  {name:'Sudáfrica',regions:['Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','North West','Northern Cape','Western Cape']},
  {name:'Kenia',regions:['Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa','Homa Bay','Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi','Kirinyaga','Kisii','Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos','Makueni','Mandera','Marsabit','Meru','Migori','Mombasa','Murang\'a','Nairobi City','Nakuru','Nandi','Narok','Nyamira','Nyandarua','Nyeri','Samburu','Siaya','Taita-Taveta','Tana River','Tharaka-Nithi','Trans Nzoia','Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot']},
  {name:'Marruecos',regions:['Casablanca-Settat','Marrakech-Safi','Rabat-Salé-Kénitra','Fès-Meknès','Tanger-Tetuán-Alhucemas','Oriental','Béni Mellal-Khénifra','Drâa-Tafilalet','Souss-Massa','Guelmim-Oued Noun','Laâyoune-Sakia El Hamra','Dakhla-Oued Ed-Dahab']},
  {name:'Tanzania',regions:['Arusha','Dar es Salaam','Dodoma','Geita','Iringa','Kagera','Katavi','Kigoma','Kilimanjaro','Lindi','Manyara','Mara','Mbeya','Morogoro','Mtwara','Mwanza','Njombe','Pwani','Rukwa','Ruvuma','Shinyanga','Simiyu','Singida','Songwe','Tabora','Tanga','Kaskazini Pemba','Kusini Pemba','Kaskazini Unguja','Kusini Unguja','Mjini Magharibi']},
  {name:'Japón',regions:['Aichi','Akita','Aomori','Chiba','Ehime','Fukui','Fukuoka','Fukushima','Gifu','Gunma','Hiroshima','Hokkaido','Hyogo','Ibaraki','Ishikawa','Iwate','Kagawa','Kagoshima','Kanagawa','Kochi','Kumamoto','Kyoto','Mie','Miyagi','Miyazaki','Nagano','Nagasaki','Nara','Niigata','Oita','Okayama','Okinawa','Osaka','Saga','Saitama','Shiga','Shimane','Shizuoka','Tochigi','Tokushima','Tokio','Tottori','Toyama','Wakayama','Yamagata','Yamaguchi','Yamanashi']},
  {name:'India',regions:['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','Bengala Occidental','Andaman y Nicobar','Chandigarh','Dadra y Nagar Haveli y Daman y Diu','Delhi','Jammu y Cachemira','Ladakh','Lakshadweep','Puducherry']},
  {name:'Turquía',regions:['Adana','Adıyaman','Afyonkarahisar','Ağrı','Aksaray','Amasya','Ankara','Antalya','Ardahan','Artvin','Aydın','Balıkesir','Bartın','Batman','Bayburt','Bilecik','Bingöl','Bitlis','Bolu','Burdur','Bursa','Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Düzce','Edirne','Elazığ','Erzincan','Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkâri','Hatay','Iğdır','Isparta','Estambul','Esmirna','Kahramanmaraş','Karabük','Karaman','Kars','Kastamonu','Kayseri','Kırıkkale','Kırklareli','Kırşehir','Kilis','Kocaeli','Konya','Kütahya','Malatya','Manisa','Mardin','Mersin','Muğla','Muş','Nevşehir','Niğde','Ordu','Osmaniye','Rize','Sakarya','Samsun','Şanlıurfa','Siirt','Sinop','Sivas','Şırnak','Tekirdağ','Tokat','Trabzon','Tunceli','Uşak','Van','Yalova','Yozgat','Zonguldak']},
  {name:'Indonesia',regions:['Aceh','Bali','Bangka Belitung','Banten','Bengkulu','Java Central','Kalimantan Central','Sulawesi Central','Java Oriental','Kalimantan Oriental','Nusa Tenggara Oriental','Gorontalo','Yakarta','Jambi','Lampung','Maluku','Kalimantan del Norte','Maluku del Norte','Sulawesi del Norte','Sumatra del Norte','Papúa','Riau','Islas Riau','Kalimantan del Sur','Sulawesi del Sur','Sumatra del Sur','Sulawesi del Sureste','Java Occidental','Kalimantan Occidental','Nusa Tenggara Occidental','Papúa Occidental','Sulawesi Occidental','Sumatra Occidental','Yogyakarta','Papúa Central','Papúa de las Tierras Altas','Papúa del Sur','Papúa del Suroeste']},
  {name:'Malasia',regions:['Johor','Kedah','Kelantan','Malaca','Negeri Sembilan','Pahang','Penang','Perak','Perlis','Sabah','Sarawak','Selangor','Terengganu','Territorio Federal de Kuala Lumpur','Territorio Federal de Labuán','Territorio Federal de Putrajaya']},
  {name:'Australia',regions:['Nueva Gales del Sur','Victoria','Queensland','Australia Occidental','Australia Meridional','Tasmania','Territorio del Norte','Territorio de la Capital Australiana']},
  {name:'Papúa Nueva Guinea',regions:['Central','Chimbu','East New Britain','East Sepik','Eastern Highlands','Enga','Gulf','Hela','Jiwaka','Madang','Manus','Milne Bay','Morobe','New Ireland','Northern','Southern Highlands','West New Britain','West Sepik','Western','Western Highlands','Región Autónoma de Bougainville','Distrito de la Capital Nacional']},
  {name:'Fiji',regions:['Central','Eastern','Northern','Western','Rotuma']},
  {name:'Islas Salomón',regions:['Central','Choiseul','Guadalcanal','Isabel','Makira-Ulawa','Malaita','Rennell y Bellona','Temotu','Western','Ciudad de Honiara']},
  {name:'Vanuatu',regions:['Malampa','Penama','Sanma','Shefa','Tafea','Torba']}
];

// Helper to populate country <select>
window._fillCountrySelect = function(sel, selected) {
  if (!sel) return;
  sel.innerHTML = '<option value="">Todos los países</option>' + window.COUNTRIES.map(c => `<option value="${c.name}"${c.name===selected?' selected':''}>${c.name}</option>`).join('');
};
// Helper to populate region <select> based on country
window._fillRegionSelect = function(sel, country, selected) {
  if (!sel) return;
  const c = window.COUNTRIES.find(x => x.name === country);
  sel.innerHTML = '<option value="">Todas las regiones</option>' + (c ? c.regions.map(r => `<option value="${r}"${r===selected?' selected':''}>${r}</option>`).join('') : '');
};

const UY=[{n:"Montevideo",x:62,y:82},{n:"Canelones",x:58,y:76},{n:"Maldonado",x:74,y:74},{n:"Rocha",x:80,y:66},{n:"Colonia",x:30,y:68},{n:"San José",x:42,y:66},{n:"Flores",x:35,y:50},{n:"Florida",x:52,y:58},{n:"Lavalleja",x:64,y:60},{n:"Treinta y Tres",x:74,y:48},{n:"Cerro Largo",x:76,y:32},{n:"Durazno",x:48,y:45},{n:"Soriano",x:24,y:52},{n:"Río Negro",x:22,y:40},{n:"Paysandú",x:18,y:30},{n:"Salto",x:22,y:16},{n:"Artigas",x:38,y:6},{n:"Rivera",x:58,y:10},{n:"Tacuarembó",x:50,y:22}];

const CNAMES = [
  "Complejo Rentistas","Complejo Fénix","Complejo El Prado","SportCenter Norte","La Cancha del Pueblo",
  "Arena Fútbol 5","Deportivo Charrúa","Complejo Sur","El Galpón Fútbol","Complejo Defensor",
  "Centro Deportivo MVD","Complejo Danubio","Complejo Central Park","Sport Norte","Fútbol 5 Mvd"
];
const TNAMES = [
  "C.A. Peñarol","Club Nacional","Defensor Sporting","Danubio F.C.","Liverpool F.C.",
  "Racing Club","Rampla Juniors","Wanderers","Cerro F.C.","Fénix F.C.",
  "Plaza Colonia","Boston River","Cerro Largo F.C.","Progreso F.C.","Rentistas F.C.",
  "Deportivo Maldonado","Atenas F.C.","Sud América","Juventud de Las Piedras","Central Español"
];
const FIRST = [
  "Martín","Diego","Nicolás","Lucas","Santiago","Agustín","Facundo","Mateo",
  "Joaquín","Tomás","Franco","Pablo","Sebastián","Rodrigo","Andrés",
  "Cristian","Emmanuel","Brian","Maximiliano","Damián"
];
const LAST = [
  "García","Rodríguez","González","Fernández","López","Martínez","Pérez",
  "Suárez","Díaz","Álvarez","Romero","Sosa","Torres","Cabrera","Núñez",
  "Herrera","Acosta","Flores","Castro","Méndez"
];
const POS = ["Arquero","Defensa","Mediocampo","Delantero"];

function seed(s) {
  const x = Math.sin(s + 1) * 10000;
  return x - Math.floor(x);
}

function genComplexes(deptIndex) {
  const dept = UY[deptIndex % UY.length].n;
  return Array.from({length: 3 + Math.floor(seed(deptIndex * 7) * 4)}, (_, i) => ({
    id: deptIndex * 100 + i,
    name: CNAMES[(deptIndex + i * 3) % CNAMES.length],
    city: dept,
    canchas: 2 + Math.floor(seed(deptIndex + i) * 4),
    precio: 300 + Math.floor(seed(deptIndex * i + 1) * 700),
    rating: (3.5 + seed(deptIndex + i * 2) * 1.5).toFixed(1),
    piso: ['Sintético','Natural','Híbrido'][Math.floor(seed(deptIndex + i) * 3)],
    phone: '09' + Math.floor(seed(deptIndex + i) * 9) + '' + (Math.floor(seed(i * 17) * 9000000) + 1000000)
  }));
}

function genTeams(deptIndex) {
  const dept = UY[deptIndex % UY.length].n;
  return Array.from({length: 3 + Math.floor(seed(deptIndex * 13) * 5)}, (_, i) => ({
    id: deptIndex * 200 + i,
    name: TNAMES[(deptIndex + i * 7) % TNAMES.length],
    city: dept,
    members: 6 + Math.floor(seed(deptIndex + i * 5) * 11),
    wins: Math.floor(seed(deptIndex + i) * 30),
    draws: Math.floor(seed(deptIndex + i + 1) * 10),
    losses: Math.floor(seed(deptIndex + i + 2) * 15),
    stars: Math.floor(seed(deptIndex + i * 3) * 4)
  }));
}

function genPlayers(deptIndex) {
  const dept = UY[deptIndex % UY.length].n;
  return Array.from({length: 5 + Math.floor(seed(deptIndex * 11) * 8)}, (_, i) => ({
    id: deptIndex * 300 + i,
    name: FIRST[(deptIndex + i * 3) % FIRST.length] + ' ' + LAST[(deptIndex + i * 7) % LAST.length],
    city: dept,
    pos: POS[Math.floor(seed(deptIndex + i) * 4)],
    rating: Math.floor(60 + seed(deptIndex + i * 2) * 35),
    goals: Math.floor(seed(deptIndex + i) * 50),
    matches: Math.floor(seed(deptIndex + i + 1) * 80) + 5,
    foot: ['Derecha','Izquierda','Ambidiestro'][Math.floor(seed(deptIndex + i) * 3)]
  }));
}

function genNews() {
  return [
    { title: 'Liga Apertura 2026: Arranca la competencia', body: 'Más de 32 equipos se inscriben para la liga más importante del año en Uruguay.', date: 'Hoy' },
    { title: 'Nuevo complejo en Maldonado', body: 'Abrió sus puertas el complejo Arena Fútbol con 4 canchas sintéticas de última generación.', date: 'Ayer' },
    { title: 'Record de jugadores registrados', body: 'Canchero supera los 5.000 jugadores registrados en todo el país.', date: 'Hace 2 días' },
    { title: 'Torneos de verano en Montevideo', body: 'Inscripciones abiertas para el torneo nocturno de fútbol 5 en La Teja.', date: 'Hace 3 días' }
  ];
}

function genFeed() {
  const users = FIRST.slice(0, 8).map((n, i) => ({ name: n + ' ' + LAST[i], avatar: n[0] + LAST[i][0] }));
  const texts = [
    '¡Golazo del partido! La pelota no iba a entrar de ninguna manera 🔥',
    'Buscando jugadores para completar el equipo el sábado 20hs. Zona Pocitos 🟢',
    'Primer partido con el nuevo equipo. ¡Victoria 3-1! 🏆',
    'Alguien sabe de un complejo con canchas F7 libres este domingo?',
    'El arquero voló hoy. Increíble actuación 🧤',
    'Torneo inscripto. A dar todo este fin de semana ⚽',
    'Nuevo record personal: 4 goles en un partido! 🎯'
  ];
  return users.map((u, i) => ({
    id: i + 1,
    user: u.name,
    avatar: u.avatar,
    text: texts[i % texts.length],
    likes: Math.floor(seed(i * 7) * 80) + 5,
    time: ['Hace 5 min','Hace 20 min','Hace 1h','Hace 2h','Hace 3h','Hace 5h','Ayer'][i]
  }));
}
