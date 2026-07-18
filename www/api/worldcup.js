/**
 * Canchero — World Cup data proxy (football-data.org)
 * Mantiene el token del lado del servidor y resuelve CORS para el browser.
 * Requiere env var FOOTBALL_DATA_TOKEN (token gratis de football-data.org).
 * Endpoints expuestos vía ?path=  ej: ?path=competitions/WC/matches
 * Solo se permiten paths de competición (lista blanca) por seguridad.
 */
const https = require('https');

// Sanitiza env vars (saca BOM / no-ASCII que rompen headers)
function _envClean(v){ return String(v||'').replace(/[^\x20-\x7E]/g,'').trim(); }

const ALLOWED = /^(competitions\/(WC|CL|EC)\/(matches|standings|scorers|teams)|matches\/\d+|teams\/\d+|persons\/\d+)(\?.*)?$/;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
  const token = _envClean(process.env.FOOTBALL_DATA_TOKEN);
  if (!token) { res.status(503).json({ error: 'no_token', message: 'FOOTBALL_DATA_TOKEN no configurado' }); return; }
  let path = (req.query && req.query.path) || '';
  path = decodeURIComponent(path);
  if (!ALLOWED.test(path)) { res.status(400).json({ error: 'bad_path' }); return; }

  const options = {
    hostname: 'api.football-data.org',
    path: '/v4/' + path,
    method: 'GET',
    headers: { 'X-Auth-Token': token }
  };
  try {
    const data = await new Promise((resolve, reject) => {
      const r = https.request(options, (resp) => {
        let body = '';
        resp.on('data', c => body += c);
        resp.on('end', () => resolve({ status: resp.statusCode, body }));
      });
      r.on('error', reject);
      r.setTimeout(12000, () => { r.destroy(new Error('timeout')); });
      r.end();
    });
    res.status(data.status || 200);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(data.body);
  } catch (e) {
    res.status(502).json({ error: 'upstream', message: String(e && e.message || e) });
  }
};
