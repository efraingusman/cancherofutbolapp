// Servidor estático mínimo (sin dependencias) para servir el build de www/
// durante los tests E2E de Playwright.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'www');
const PORT = process.env.CANCHERO_TEST_PORT ? parseInt(process.env.CANCHERO_TEST_PORT) : 4178;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.mp4': 'video/mp4', '.webmanifest': 'application/manifest+json'
};

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
    let filePath = path.join(ROOT, path.normalize(urlPath));
    // Evitar path traversal fuera de ROOT
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
    fs.stat(filePath, (err, st) => {
      if (err || !st.isFile()) {
        // SPA fallback: servir index.html para rutas no encontradas
        filePath = path.join(ROOT, 'index.html');
      }
      fs.readFile(filePath, (e2, data) => {
        if (e2) { res.writeHead(404); res.end('Not found'); return; }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
  } catch (e) {
    res.writeHead(500); res.end('Error');
  }
});

server.listen(PORT, () => {
  console.log('canchero test server on http://localhost:' + PORT);
});
