/**
 * Canchero — Game Proxy
 * Sirve el contenido del juego removiendo X-Frame-Options y CSP
 * para poder embeberse en un iframe dentro de la app.
 * Inyecta <base href> para que los assets relativos resuelvan correctamente.
 */

const https = require('https');
const http  = require('http');
const { URL } = require('url');

// Solo dominios de juegos autorizados
const ALLOWED_DOMAINS = [
    'gatoconbota.com',
];

module.exports = async (req, res) => {
    const { url } = req.query;

    if (!url) {
        res.status(400).end('Missing ?url parameter');
        return;
    }

    let targetUrl;
    try {
        targetUrl = new URL(decodeURIComponent(url));
    } catch (e) {
        res.status(400).end('Invalid URL');
        return;
    }

    const isAllowed = ALLOWED_DOMAINS.some(d => targetUrl.hostname === d || targetUrl.hostname.endsWith('.' + d));
    if (!isAllowed) {
        res.status(403).end('Domain not allowed');
        return;
    }

    const protocol = targetUrl.protocol === 'https:' ? https : http;
    // Base para resolver URLs relativas: origin + ruta hasta el último /
    const pathBase = targetUrl.pathname.replace(/[^/]*$/, '');
    const baseHref = `${targetUrl.protocol}//${targetUrl.host}${pathBase}`;

    const options = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
        path: targetUrl.pathname + targetUrl.search,
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'es-UY,es;q=0.9,en;q=0.8',
            'Accept-Encoding': 'identity',
            'Connection': 'keep-alive',
        },
    };

    const proxyReq = protocol.request(options, (proxyRes) => {
        const contentType = (proxyRes.headers['content-type'] || 'text/html').toLowerCase();
        const isHtml = contentType.includes('text/html');

        // Cabeceras de respuesta: eliminar las que bloquean el iframe
        const respHeaders = {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
        };

        if (proxyRes.headers['cache-control']) {
            respHeaders['Cache-Control'] = proxyRes.headers['cache-control'];
        }

        // NO copiar: x-frame-options, content-security-policy, x-content-type-options

        res.writeHead(proxyRes.statusCode || 200, respHeaders);

        if (isHtml) {
            // Acumular HTML para inyectar <base href>
            let body = '';
            proxyRes.setEncoding('utf8');
            proxyRes.on('data', chunk => { body += chunk; });
            proxyRes.on('end', () => {
                const baseTag = `<base href="${baseHref}">`;

                // Intentar insertar después de <head> o <head ...>
                if (/<head[\s>]/i.test(body)) {
                    body = body.replace(/(<head[^>]*>)/i, `$1${baseTag}`);
                } else if (/<html[\s>]/i.test(body)) {
                    body = body.replace(/(<html[^>]*>)/i, `$1${baseTag}`);
                } else {
                    body = baseTag + body;
                }

                // Ocultar scrollbars nativos del juego para que se vea limpio
                const styleInject = `<style>
                    html,body{margin:0!important;padding:0!important;overflow:hidden!important;background:#000!important;}
                    ::-webkit-scrollbar{display:none!important;}
                </style>`;
                body = body.replace(/<\/head>/i, `${styleInject}</head>`);

                res.end(body);
            });
        } else {
            proxyReq.pipe ? proxyRes.pipe(res) : res.end();
            proxyRes.pipe(res);
        }
    });

    proxyReq.on('error', (e) => {
        console.error('gameproxy error:', e.message);
        res.status(502).end('Proxy error: ' + e.message);
    });

    proxyReq.end();
};
