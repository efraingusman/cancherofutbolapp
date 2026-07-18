/**
 * Canchero — API-Football proxy (api-sports.io)
 * Da fixtures, eventos minuto a minuto, alineaciones, estadísticas y
 * perfiles de jugadores (con foto). Token del lado del servidor.
 * Requiere env var API_FOOTBALL_KEY (key gratis de dashboard.api-football.com).
 * Uso: /api/apifootball?path=fixtures?league=1%26season=2026
 */
const https = require('https');
function _envClean(v){ return String(v||'').replace(/[^\x20-\x7E]/g,'').trim(); }

// Whitelist de endpoints permitidos
const ALLOWED = /^(fixtures|fixtures\/events|fixtures\/lineups|fixtures\/statistics|standings|players|players\/topscorers|players\/topassists|teams)(\?.*)?$/;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
  const key = _envClean(process.env.API_FOOTBALL_KEY);
  if (!key) { res.status(503).json({ error: 'no_token' }); return; }
  let path = decodeURIComponent((req.query && req.query.path) || '');
  if (!ALLOWED.test(path)) { res.status(400).json({ error: 'bad_path', path: path }); return; }
  const options = {
    hostname: 'v3.football.api-sports.io',
    path: '/' + path,
    method: 'GET',
    headers: { 'x-apisports-key': key, 'Accept': 'application/json' }
  };
  try {
    const data = await new Promise((resolve, reject) => {
      const r = https.request(options, (resp) => { let b=''; resp.on('data',c=>b+=c); resp.on('end',()=>resolve({status:resp.statusCode,body:b})); });
      r.on('error', reject);
      r.setTimeout(13000, () => { r.destroy(new Error('timeout')); });
      r.end();
    });
    res.status(data.status || 200);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(data.body);
  } catch (e) { res.status(502).json({ error: 'upstream', message: String(e && e.message || e) }); }
};
