/**
 * Canchero — Noticias de fútbol (gratis) proxy
 * Usa GNews (token gratis) del lado del servidor y resuelve CORS.
 * Requiere env var GNEWS_TOKEN (https://gnews.io — free tier).
 * Si no hay token o la API falla, devuelve un set curado (fallback) para no romper el feed.
 * Respuesta: { source:'gnews'|'fallback', articles:[{title,description,url,image,source,publishedAt}] }
 */
const https = require('https');
function _envClean(v){ return String(v||'').replace(/[^\x20-\x7E]/g,'').trim(); }

const FALLBACK = [
  { title:'Arranca la cuenta regresiva para el Mundial 2026', description:'48 selecciones, 16 sedes en Norteamérica. Todo lo que tenés que saber del próximo Mundial.', url:'https://www.fifa.com/es/tournaments/mens/worldcup/canadamexicousa2026', image:'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=640&q=70&auto=format&fit=crop', source:'Canchero', publishedAt:new Date().toISOString() },
  { title:'Guía del hincha: cómo seguir cada partido en Canchero', description:'Fixture, grupos, goleadores y predictor en vivo, todo gratis dentro de la app.', url:'#', image:'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=640&q=70&auto=format&fit=crop', source:'Canchero', publishedAt:new Date().toISOString() },
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Caché CDN ~20 min → como máximo 3 llamadas reales a GNews por hora (72/día < 100 del free tier).
  // Las noticias NO se guardan en la base de Canchero: se sirven en vivo desde el CDN, cero impacto en storage.
  res.setHeader('Cache-Control', 's-maxage=1200, stale-while-revalidate=3600');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const token = _envClean(process.env.GNEWS_TOKEN);
  if (!token) { res.status(200).json({ source:'fallback', articles: FALLBACK.slice(0,3) }); return; }

  // País del usuario para diversificar (query string ?country=Uruguay).
  // Si viene, se incluye el país y algunos equipos típicos en la query.
  const country = _envClean((req.query && req.query.country) || '').slice(0, 40);
  const CLUBS = {
    Uruguay: 'Uruguay OR "Peñarol" OR "Nacional"',
    Argentina: 'Argentina OR "Boca Juniors" OR "River Plate" OR "Selección Argentina"',
    Brasil: 'Brasil OR Brazil OR Flamengo OR Palmeiras',
    España: 'España OR "Real Madrid" OR "Barcelona" OR Spain',
    México: 'México OR Mexico OR "Club América" OR Chivas',
    Colombia: 'Colombia OR "Atlético Nacional" OR "Millonarios"',
    Chile: 'Chile OR "Colo-Colo" OR "Universidad de Chile"'
  };
  const countryClause = (country && CLUBS[country]) ? (' OR ' + CLUBS[country]) : (country ? (' OR ' + JSON.stringify(country)) : '');
  // Fútbol + país del usuario, SOLO de los últimos 2 días (sin viejas). 6 (más diversidad).
  const q = encodeURIComponent('(fútbol OR football OR soccer OR "world cup" OR mundial' + countryClause + ')');
  const fromISO = new Date(Date.now() - 2*24*3600*1000).toISOString();
  const path = `/api/v4/search?q=${q}&lang=es&category=sports&max=6&sortby=publishedAt&from=${encodeURIComponent(fromISO)}&token=${token}`;
  const options = { hostname: 'gnews.io', path, method: 'GET' };
  try {
    const data = await new Promise((resolve, reject) => {
      const r = https.request(options, (resp) => { let b=''; resp.on('data',c=>b+=c); resp.on('end',()=>resolve({status:resp.statusCode,body:b})); });
      r.on('error', reject);
      r.setTimeout(12000, () => { r.destroy(new Error('timeout')); });
      r.end();
    });
    let parsed = {};
    try { parsed = JSON.parse(data.body||'{}'); } catch(e){}
    const arts = (parsed.articles||[]).map(a => ({
      title: a.title, description: a.description, url: a.url,
      image: a.image, source: (a.source && a.source.name) || 'GNews', publishedAt: a.publishedAt
    }));
    // Filtro de frescura extra: SOLO últimos 2 días, no traer noticias viejas
    const cutoff = Date.now() - 2*24*3600*1000;
    // Filtro ESTRICTO de fútbol: la noticia debe mencionar palabras clave de fútbol
    // en title o description. Antes salía lotería / otros deportes.
    const FOOT_RX = /(f[uú]tbol|football|soccer|gol(?:es)?|mundial|world cup|champions|liga|copa|partid|jugador|delanter|arquer|portero|messi|cristiano|ronaldo|neymar|peñarol|nacional|boca|river|barcelona|madrid|flamengo|palmeiras|brasil|argentina|uruguay)/i;
    const BLOCK_RX = /(lotería|loter[ií]a|quini|powerball|quiniela|tenis|tennis|baloncesto|basketball|nba|f[oó]rmula 1|formula 1|f1|automovilismo|pol[ií]tic|elecci[oó]n|narco)/i;
    const fresh = arts.filter(a => {
      const t = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      if (t <= cutoff) return false;
      const txt = ((a.title||'') + ' ' + (a.description||'')).toLowerCase();
      if (!FOOT_RX.test(txt)) return false;
      if (BLOCK_RX.test(txt)) return false;
      return true;
    });
    if (!fresh.length) { res.status(200).json({ source:'fallback', articles: FALLBACK.slice(0,3) }); return; }
    res.status(200).json({ source:'gnews', articles: fresh.slice(0,6) });
  } catch (e) {
    res.status(200).json({ source:'fallback', articles: FALLBACK.slice(0,3) });
  }
};
