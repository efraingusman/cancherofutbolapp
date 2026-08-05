// Importa escudos reales desde /tmp/escudos/<liga>/*.png y los convierte a img/clubs/<slug>.webp
// Mapeo: NOMBRE en el JS de LIGAS  →  archivo source
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'escudos_tmp');
const OUT = path.join(__dirname, '..', 'img', 'clubs');
fs.mkdirSync(OUT, { recursive: true });

// [nombreEnJuego, slugDeSalida, rutaOrigen]
const MAP = [
  // LaLiga
  ['Barcelona','barcelona-fc','laliga/barcelona.png'],
  ['Real Madrid','real-madrid','laliga/realmadrid.png'],
  ['Atlético','atletico','laliga/atlmadrid.png'],
  ['Sevilla','sevilla','laliga/sevilla.png'],
  ['Valencia','valencia','laliga/valencia.png'],
  ['Real Sociedad','real-sociedad','laliga/realsociedad.png'],
  ['Villarreal','villarreal','laliga/villarreal.png'],
  ['Betis','betis','laliga/betis.png'],
  ['Athletic','athletic','laliga/athletic.png'],
  ['Osasuna','osasuna','laliga/osasuna.png'],
  ['Getafe','getafe','laliga/getafe.png'],
  ['Celta','celta','laliga/celta.png'],
  ['Rayo Vallecano','rayo','laliga/rayovallecano.png'],
  ['Alavés','alaves','laliga/alaves.png'],
  // Premier
  ['Arsenal','arsenal','premier/arsenal.png'],
  ['Aston Villa','aston-villa','premier/astonvilla.png'],
  ['Bournemouth','bournemouth','premier/bournemouth.png'],
  ['Brentford','brentford','premier/brentford.png'],
  ['Brighton','brighton','premier/brighton.png'],
  ['Chelsea','chelsea','premier/chelsea.png'],
  ['Crystal Palace','crystal-palace','premier/crystalpalace.png'],
  ['Everton','everton','premier/everton.png'],
  ['Fulham','fulham','premier/fulham.png'],
  ['Liverpool','liverpool','premier/liverpool.png'],
  ['Man City','man-city','premier/manchestercity.png'],
  ['Man United','man-united','premier/manchesterunited.png'],
  ['Newcastle','newcastle','premier/newcastle.png'],
  ['Nottingham Forest','nott-forest','premier/nottingham_forest.png'],
  ['Tottenham','tottenham','premier/tottenham.png'],
  // Bundesliga
  ['Bayern','bayern','bundesliga/bayernmunchen.png'],
  ['Dortmund','dortmund','bundesliga/borussiadortmund.png'],
  ['Leverkusen','leverkusen','bundesliga/bayerleverkusen.png'],
  ['Leipzig','leipzig','bundesliga/rbleipzig.png'],
  ['Stuttgart','stuttgart','bundesliga/stuttgart.png'],
  ['Union Berlin','union-berlin','bundesliga/unionberlin.png'],
  ['Freiburg','freiburg','bundesliga/freiburg.png'],
  ['Frankfurt','frankfurt','bundesliga/eintrachtfrankfurt.png'],
  ['Gladbach','gladbach','bundesliga/bmonchengladbach.png'],
  ['Hoffenheim','hoffenheim','bundesliga/hoffenheim.png'],
  ['Mainz','mainz','bundesliga/mainz05.png'],
  ['Werder Bremen','werder','bundesliga/werderbremen.png'],
  // Ligue 1
  ['PSG','psg','ligue1/psg.png'],
  ['Marsella','marsella','ligue1/olimpiquemarsella.png'],
  ['Mónaco','monaco','ligue1/monaco.png'],
  ['Lyon','lyon','ligue1/olympiquelyon.png'],
  ['Lille','lille','ligue1/lille.png'],
  ['Rennes','rennes','ligue1/rennais.png'],
  ['Niza','niza','ligue1/niza.png'],
  ['Lens','lens','ligue1/racinglens.png'],
  ['Estrasburgo','estrasburgo','ligue1/racingetrasburgo.png'],
  ['Toulouse','toulouse','ligue1/toulouse.png'],
  // Primeira Portugal
  ['Benfica','benfica','primeiraliga/benfica.png'],
  ['Porto','porto','primeiraliga/porto.png'],
  ['Sporting','sporting','primeiraliga/sporting.png'],
  ['Braga','braga','primeiraliga/braga.png'],
  ['Vitória SC','vitoria-sc','primeiraliga/vitoria.png'],
  ['Famalicão','famalicao','primeiraliga/famalicao.png'],
  ['Gil Vicente','gil-vicente','primeiraliga/gilvicente.png'],
  // Eredivisie
  ['Ajax','ajax','eredivisie/ajax.png'],
  ['PSV','psv','eredivisie/psv.png'],
  ['Feyenoord','feyenoord','eredivisie/feyenoord.png'],
  ['AZ Alkmaar','az','eredivisie/az.png'],
  // Liga MX
  ['América','america-mx','ligamx/america.png'],
  ['Chivas','chivas','ligamx/guadalajara.png'],
  ['Monterrey','monterrey','ligamx/monterrey.png'],
  ['Tigres','tigres','ligamx/tigres.png'],
  ['Cruz Azul','cruz-azul','ligamx/cruzazul.png'],
  ['Pumas','pumas','ligamx/pumas.png'],
  ['Toluca','toluca','ligamx/toluca.png'],
  ['León','leon','ligamx/leon.png'],
  ['Pachuca','pachuca','ligamx/pachuca.png'],
  ['Santos Laguna','santos-laguna','ligamx/santos.png'],
  ['Atlas','atlas','ligamx/atlas.png'],
  ['Necaxa','necaxa','ligamx/necaxa.png'],
  // MLS
  ['Inter Miami','inter-miami','mls/intermiami.png'],
  ['LA Galaxy','la-galaxy','mls/losangelesgalaxy.png'],
  ['LAFC','lafc','mls/losangeles.png'],
  ['Atlanta United','atlanta-united','mls/atlanta.png'],
  ['Seattle Sounders','seattle','mls/seattle.png'],
  ['Portland Timbers','portland','mls/portland.png'],
  ['NY Red Bulls','ny-red-bulls','mls/newyork.png'],
  ['NYCFC','nycfc','mls/newyorkcity.png'],
  ['Columbus Crew','columbus','mls/columbus.png'],
  ['FC Cincinnati','cincinnati','mls/cincinnati.png'],
  // Argentina primeradivision
  ['Boca Juniors','boca','primeradivision/boca.png'],
  ['River Plate','river','primeradivision/river.png'],
  ['Racing','racing','primeradivision/racing.png'],
  ['Independiente','independiente','primeradivision/independiente.png'],
  ["Newell's",'newells','primeradivision/newells.png'],
  ['Estudiantes','estudiantes','primeradivision/estudiantes.png'],
  ['Talleres','talleres','primeradivision/talleres.png'],
  ['Huracán','huracan','primeradivision/huracan.png'],
  ['Lanús','lanus','primeradivision/lanus.png'],
  ['Banfield','banfield','primeradivision/banfield.png'],
  ['Defensa y Justicia','defensa','primeradivision/defensa.png'],
  ['Argentinos Jrs','argentinos','primeradivision/argentinos.png'],
  ['Gimnasia LP','gimnasia','primeradivision/gimnasia.png'],
  ['Instituto','instituto','primeradivision/instituto.png'],
  ['Belgrano','belgrano','primeradivision/belgrano.png'],
  ['Platense','platense','primeradivision/platense.png'],
  ['Central Córdoba','central-cordoba','primeradivision/centralcordoba.png'],
  // Uruguay primeradivision (3)
  ['Nacional','nacional-uy','primeradivision_(3)/nacional.png'],
  ['Peñarol','penarol','primeradivision_(3)/penarol.png'],
  ['Defensor Sporting','defensor-sporting','primeradivision_(3)/defensor.png'],
  ['Danubio','danubio','primeradivision_(3)/danubio.png'],
  ['Liverpool FC (UY)','liverpool-uy','primeradivision_(3)/liverpool.png'],
  ['Montevideo City','montevideo-city','primeradivision_(3)/montevideocity.png'],
  ['Boston River','boston-river','primeradivision_(3)/bostonriver.png'],
  ['Cerro','cerro','primeradivision_(3)/cerro.png'],
  ['Wanderers','wanderers-uy','primeradivision_(3)/wanderers.png'],
  ['Cerro Largo','cerro-largo','primeradivision_(3)/cerrolargo.png'],
  ['Progreso','progreso','primeradivision_(3)/progreso.png']
];

(async () => {
  let ok=0, miss=0;
  for (const [name, slug, rel] of MAP) {
    const src = path.join(SRC, rel);
    const dst = path.join(OUT, slug + '.webp');
    if (!fs.existsSync(src)) { console.log('MISS', rel); miss++; continue; }
    try {
      await sharp(src).resize(200,200,{fit:'inside'}).webp({quality:90}).toFile(dst);
      ok++;
    } catch(e){ console.log('ERR', slug, e.message); miss++; }
  }
  console.log('OK:', ok, 'MISS:', miss);
})();
