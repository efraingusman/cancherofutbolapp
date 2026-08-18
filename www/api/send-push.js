// api/send-push.js — Vercel Serverless Function
// Envía Web Push (VAPID) a todas las suscripciones de un usuario.
// El payload incluye `notif` (type, actor_email, post_id, match_id…) para que
// el Service Worker / la app deep-linkeen al contenido exacto.
//
// Env vars requeridas (Vercel → Settings → Environment Variables):
//   VAPID_PUBLIC_KEY   — la misma que está en canchero-notifications.js
//   VAPID_PRIVATE_KEY  — par privado (npx web-push generate-vapid-keys)
//   SUPABASE_URL       — https://<proyecto>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY — service key (solo vive en el servidor)

const webpush = require('web-push');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { to_email, title, body, notif } = req.body || {};
    if (!to_email || !title) return res.status(400).json({ error: 'to_email y title requeridos' });

    const PUB = process.env.VAPID_PUBLIC_KEY;
    const PRIV = process.env.VAPID_PRIVATE_KEY;
    const SB_URL = process.env.SUPABASE_URL;
    const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!PUB || !PRIV || !SB_URL || !SB_KEY) return res.status(500).json({ error: 'Push no configurado (faltan env vars)' });

    webpush.setVapidDetails('mailto:neurostudio.uy@gmail.com', PUB, PRIV);

    // Suscripciones del destinatario
    const r = await fetch(`${SB_URL}/rest/v1/push_subscriptions?user_email=eq.${encodeURIComponent(to_email)}&select=endpoint,sub_json`, {
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
    });
    const subs = r.ok ? await r.json() : [];
    if (!subs.length) return res.status(200).json({ ok: true, sent: 0 });

    const payload = JSON.stringify({
        title,
        body: body || '',
        icon: '/logo-oficial.png',
        url: 'https://cancherofutbolapp.vercel.app/',
        notif: notif || null
    });

    let sent = 0;
    await Promise.all(subs.map(async (s) => {
        try {
            const sub = typeof s.sub_json === 'string' ? JSON.parse(s.sub_json) : s.sub_json;
            await webpush.sendNotification(sub, payload);
            sent++;
        } catch (e) {
            // Suscripción muerta (404/410) → limpiarla
            if (e.statusCode === 404 || e.statusCode === 410) {
                try {
                    await fetch(`${SB_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(s.endpoint)}`, {
                        method: 'DELETE', headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
                    });
                } catch (e2) {}
            }
        }
    }));
    return res.status(200).json({ ok: true, sent });
};
