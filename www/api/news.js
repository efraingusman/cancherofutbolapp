/**
 * Canchero — Noticias de fútbol (gratis) proxy
 * Fuentes:
 *   1) RSS de medios deportivos (sin token, siempre disponible) → varias por día.
 *   2) GNews (si hay GNEWS_TOKEN) → se mezcla con el RSS.
 * Si todo falla, devuelve un set curado (fallback) para no romper el feed.
 * Respuesta: { source, articles:[{title,description,url,image,source,publishedAt}] }
 */
const https = require('https');
function _envClean(v){ return String(v||'').replace(/[^\x20-\x7E]/g,'').trim(); }

const FALLBACK = [
  { title:'Arranca la cuenta regresiva para el Mundial 2026', description:'48 selecciones, 16 sedes en Norteamérica. Todo lo que tenés que saber del próximo Mundial.', url:'https://www.fifa.com/es/tournaments/mens/worldcup/canadamexicousa2026', image:'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=640&q=70&auto=format&fit=crop', source:'Canchero', publishedAt:new Date().toISOString() },
  { title:'Guía del hincha: cómo seguir cada partido en Canchero', description:'Fixture, grupos, goleadores y predictor en vivo, todo gratis dentro de la app.', url:'#', image:'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=640&q=70&auto=format&fit=crop', source:'Canchero', publishedAt:new Date().toISOString() },
];

// RSS de fútbol en español (sin token). Se intentan todos; los que fallen se ignoran.
const RSS_FEEDS = [
  { url:'https://www.mundodeportivo.com/mvc/feed/rss/futbol', source:'Mundo Deportivo' },
  { url:'https://as.com/rss/futbol/portada.xml', source:'AS' },
  { url:'https://e00-marca.uecdn.es/rss/futbol/primera-division.xml', source:'Marca' },
  { url:'https://www.ole.com.ar/rss/futbol-internacional/', source:'Olé' },
  { url:'https://www.espn.com.ar/espn/rss/soccer/news', source:'ESPN' },
  // Prensa uruguaya: sin ella los clubes locales casi no aparecian en el feed.
  { url:'https://www.elobservador.com.uy/rss/pages/referi.xml', source:'Referí' },
  { url:'https://www.ovaciondigital.com.uy/rss/', source:'Ovación' },
];


// ── Alias por club (para /api/news?club=<slug>) ───────────────────────────
// Cada club tiene varias formas de nombrarse en la prensa. Se exige una de ellas
// como palabra completa para no traer ruido (ej: 'nacional' suelto aparece en
// cualquier nota, por eso pide el contexto del club).
const CLUB_RX = {
  'penarol':      /pe(ñ|n)arol|manya|carbonero/i,
  // 'nacional' suelto aparece en cualquier nota ("seleccionado nacional de Brasil"),
  // por eso pide nombre completo, apodo o contexto. En prensa uruguaya alcanza con el
  // nombre: ahí "Nacional" es el club (ver CLUB_RX_LOCAL).
  'nacional':     /(club )?nacional de football|bols(o|ill)|tricolor|nacional\b(?=.*(uruguay|campeonato|apertura|clausura|torneo|copa|libertadores|sudamericana|auf))/i,
  'danubio':      /danubio/i,
  'defensor':     /defensor sporting|violeta/i,
  'liverpool-uy': /liverpool (de )?montevideo|liverpool f\.?c\.? uruguay/i,
  'boca':         /boca juniors|xeneize/i,
  'river':        /river plate|millonario/i,
  'racing':       /racing club|la academia/i,
  'independiente':/independiente\b/i,
  'san-lorenzo':  /san lorenzo|ciclon/i,
  'barcelona':    /barcelona|bar(ç|c)a|blaugrana|cul(é|e)/i,
  'real-madrid':  /real madrid|merengue|blanco de chamart(í|i)n/i,
  'atletico':     /atl(é|e)tico de madrid|atleti|colchoner/i,
  'sevilla':      /sevilla f|sevillista/i,
  'man-united':   /manchester united|man united|red devils|diablos rojos/i,
  'man-city':     /manchester city|man city|citizens/i,
  'liverpool':    /liverpool (fc|f\.c\.)|anfield|reds\b/i,
  'arsenal':      /arsenal|gunners/i,
  'chelsea':      /chelsea|blues\b/i,
  'tottenham':    /tottenham|spurs/i,
  'juventus':     /juventus|juve\b|bianconeri/i,
  'milan':        /(ac |a\.c\. )?milan\b|rossoneri/i,
  'inter':        /inter de mil(á|a)n|internazionale|nerazzurri/i,
  'napoli':       /napoli|n(á|a)poles/i,
  'roma':         /(as |a\.s\. )?roma\b|giallorossi/i,
  'bayern':       /bayern|munich/i,
  'dortmund':     /dortmund|borussia/i,
  'psg':          /psg|paris saint|par(í|i)s sg/i,
  'flamengo':     /flamengo|mengao/i,
  'palmeiras':    /palmeiras|verd(ã|a)o/i,
};

// Nombre simple del club, válido SOLO dentro de prensa uruguaya (ahí no hay ambigüedad).
const CLUB_RX_LOCAL = {
  'penarol':      /pe(ñ|n)arol/i,
  'nacional':     /nacional/i,
  'danubio':      /danubio/i,
  'defensor':     /defensor/i,
  'liverpool-uy': /liverpool/i,
};

const FOOT_RX = /(f[uú]tbol|football|soccer|gol(?:es)?|mundial|world cup|champions|liga|copa|partid|jugador|delanter|arquer|portero|messi|cristiano|ronaldo|neymar|peñarol|nacional|boca|river|barcelona|madrid|flamengo|palmeiras|brasil|argentina|uruguay|selecci[oó]n)/i;
const BLOCK_RX = /(lotería|loter[ií]a|quini|powerball|quiniela|tenis|tennis|baloncesto|basketball|nba|f[oó]rmula 1|formula 1|\bf1\b|automovilismo|pol[ií]tic|elecci[oó]n|narco)/i;

function _get(url){
  return new Promise((resolve) => {
    try {
      const r = https.get(url, { headers:{ 'User-Agent':'Mozilla/5.0 CancheroBot' } }, (resp) => {
        // Redirecciones simples
        if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
          resp.destroy(); return resolve(_get(resp.headers.location));
        }
        let b=''; resp.on('data',c=>b+=c); resp.on('end',()=>resolve(b));
      });
      r.on('error', ()=>resolve(''));
      r.setTimeout(8000, ()=>{ r.destroy(); resolve(''); });
    } catch(e){ resolve(''); }
  });
}

function _tag(block, name){
  const m = block.match(new RegExp('<'+name+'[^>]*>([\\s\\S]*?)<\\/'+name+'>','i'));
  if (!m) return '';
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]+>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#039;|&apos;/g,"'").trim();
}
function _img(block){
  let m = block.match(/<enclosure[^>]*url=["']([^"']+)["']/i);
  if (m) return m[1];
  m = block.match(/<media:content[^>]*url=["']([^"']+)["']/i);
  if (m) return m[1];
  m = block.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i);
  if (m) return m[1];
  m = block.match(/<img[^>]*src=["']([^"']+)["']/i);
  if (m) return m[1];
  return '';
}
async function fetchRss(feed){
  const xml = await _get(feed.url);
  if (!xml || xml.indexOf('<item') === -1) return [];
  const items = xml.split(/<item[\s>]/i).slice(1);
  const out = [];
  for (const raw of items.slice(0, 12)){
    const block = raw;
    const title = _tag(block,'title');
    const link = (block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)||[])[1] ? _tag(block,'link') : ((block.match(/<link[^>]*href=["']([^"']+)["']/i)||[])[1]||'');
    const description = _tag(block,'description') || _tag(block,'summary');
    const pub = _tag(block,'pubDate') || _tag(block,'published') || _tag(block,'updated');
    if (!title) continue;
    out.push({
      title, description: (description||'').slice(0, 240),
      url: link || '#', image: _img(block) || '',
      source: feed.source, publishedAt: pub ? new Date(pub).toISOString() : new Date().toISOString()
    });
  }
  return out;
}

async function fetchGNews(country){
  const token = _envClean(process.env.GNEWS_TOKEN);
  if (!token) return [];
  const CLUBS = {
    Uruguay:'Uruguay OR "Peñarol" OR "Nacional"', Argentina:'Argentina OR "Boca Juniors" OR "River Plate"',
    Brasil:'Brasil OR Flamengo OR Palmeiras', España:'España OR "Real Madrid" OR "Barcelona"',
    México:'México OR "Club América" OR Chivas', Colombia:'Colombia OR "Atlético Nacional"', Chile:'Chile OR "Colo-Colo"'
  };
  const cc = (country && CLUBS[country]) ? (' OR ' + CLUBS[country]) : '';
  const q = encodeURIComponent('(fútbol OR football OR soccer OR mundial' + cc + ')');
  const fromISO = new Date(Date.now() - 2*24*3600*1000).toISOString();
  const url = `https://gnews.io/api/v4/search?q=${q}&lang=es&category=sports&max=10&sortby=publishedAt&from=${encodeURIComponent(fromISO)}&token=${token}`;
  const body = await _get(url);
  let parsed = {}; try { parsed = JSON.parse(body||'{}'); } catch(e){}
  return (parsed.articles||[]).map(a => ({ title:a.title, description:a.description, url:a.url, image:a.image, source:(a.source&&a.source.name)||'GNews', publishedAt:a.publishedAt }));
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=1200, stale-while-revalidate=3600');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const country = _envClean((req.query && req.query.country) || '').slice(0, 40);
  const club = _envClean((req.query && req.query.club) || '').slice(0, 40).toLowerCase();

  try {
    // Traer RSS (todas en paralelo) + GNews
    const results = await Promise.all([
      ...RSS_FEEDS.map(f => fetchRss(f).catch(()=>[])),
      fetchGNews(country).catch(()=>[])
    ]);
    let all = [].concat.apply([], results);

    // Filtro de fútbol + frescura (7 días) + bloqueo de temas no-fútbol
    const cutoff = Date.now() - 7*24*3600*1000;
    all = all.filter(a => {
      const txt = ((a.title||'') + ' ' + (a.description||'')).toLowerCase();
      if (!FOOT_RX.test(txt)) return false;
      if (BLOCK_RX.test(txt)) return false;
      const t = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      if (t && t <= cutoff) return false;
      return true;
    });

    // Dedupe por título normalizado
    const seen = new Set();
    all = all.filter(a => { const k=(a.title||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,50); if(seen.has(k))return false; seen.add(k); return true; });

    // Ordenar por fecha desc
    all.sort((a,b) => new Date(b.publishedAt||0) - new Date(a.publishedAt||0));

    // Filtro por CLUB: solo las notas que lo nombran. Si el club no da resultados se
    // devuelve la lista vacia a proposito — es mas honesto que mostrar noticias de otro
    // equipo como si fueran del suyo.
    if (club) {
      const rx = CLUB_RX[club];
      if (!rx) { res.status(200).json({ source:'club', club: club, articles: [] }); return; }
      // En una fuente URUGUAYA, el nombre del club local no necesita contexto: si Referí
      // dice "Nacional" está hablando del club, no de una selección nacional. Sin esto se
      // perdían casi todas las notas locales, que son justo las que le importan al hincha.
      const rxLocal = CLUB_RX_LOCAL[club];
      const esFuenteUY = (a) => /^(referí|referi|ovación|ovacion)$/i.test(String(a.source||''));
      const delClub = all.filter(a => {
        const txt = (a.title||'') + ' ' + (a.description||'');
        if (rxLocal && esFuenteUY(a) && rxLocal.test(txt)) return true;
        return rx.test(txt);
      });
      res.status(200).json({ source:'club', club: club, articles: delClub.slice(0, 30) });
      return;
    }

    if (!all.length) { res.status(200).json({ source:'fallback', articles: FALLBACK }); return; }
    res.status(200).json({ source:'mix', articles: all.slice(0, 40) });
  } catch (e) {
    res.status(200).json({ source:'fallback', articles: FALLBACK });
  }
};
