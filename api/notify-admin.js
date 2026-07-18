// api/notify-admin.js — Vercel Serverless Function
// Avisa al admin por email (Resend) cuando llega una solicitud de negocio.
// En modo prueba de Resend solo se puede enviar a la casilla del dueño de la
// cuenta (neurovidstudioia@gmail.com) — justo lo que necesitamos acá.
//
// Env vars: RESEND_API_KEY

const ADMIN_EMAIL = 'neurovidstudioia@gmail.com';

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const KEY = process.env.RESEND_API_KEY;
    if (!KEY) return res.status(500).json({ error: 'RESEND_API_KEY no configurada' });

    const { name, email, role, plan, sub_type, phone, code_request } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: 'name y email requeridos' });

    const esc = (s) => String(s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    const row = (label, val) => `<tr><td style="padding:7px 14px;color:#777;font-size:13px;">${label}</td><td style="padding:7px 14px;color:#111;font-size:14px;font-weight:600;">${esc(val) || '—'}</td></tr>`;

    const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;background:#0c0e0c;border-radius:16px;overflow:hidden;">
      <div style="background:#baff00;padding:18px 24px;">
        <div style="font-size:20px;font-weight:900;color:#000;letter-spacing:1px;">CANCHERO</div>
        <div style="font-size:13px;color:#222;font-weight:700;">Nueva solicitud de negocio</div>
      </div>
      <div style="padding:20px 24px;background:#ffffff;">
        <p style="font-size:14px;color:#333;margin:0 0 14px;">Llegó una solicitud nueva para usar Canchero como negocio. Revisala y generá el código de activación desde tu panel de administrador.</p>
        <table style="width:100%;border-collapse:collapse;background:#f6f8f4;border-radius:10px;overflow:hidden;">
          ${row('Negocio', name)}
          ${row('Email', email)}
          ${row('Tipo', role + (sub_type ? ' · ' + sub_type : ''))}
          ${row('Plan elegido', plan)}
          ${row('Teléfono', phone)}
          ${row('Fecha', new Date().toLocaleString('es-UY', { timeZone: 'America/Montevideo' }))}
        </table>
        <a href="https://canchero-app.vercel.app/?goto=admin-negocios" style="display:block;text-align:center;background:#baff00;color:#000;font-weight:900;font-size:14px;text-decoration:none;border-radius:10px;padding:13px;margin-top:18px;">ABRIR PANEL DE ADMIN</a>
        <p style="font-size:11px;color:#999;margin:14px 0 0;">Al aprobar se genera el código; envíaselo por WhatsApp o email y el negocio activa su cuenta ingresándolo al iniciar sesión.</p>
      </div>
    </div>`;

    try {
        const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: 'Canchero <onboarding@resend.dev>',
                to: [ADMIN_EMAIL],
                subject: (code_request ? 'PEDIDO DE CODIGO: ' : 'Nueva solicitud de negocio: ') + name + ' (' + (role || 'negocio') + ')',
                text: 'Nueva solicitud de negocio en Canchero. Negocio: ' + name + ' / Email: ' + email + ' / Tipo: ' + (role || '-') + '. Aprobala desde https://canchero-app.vercel.app/?goto=admin-negocios',
                html
            })
        });
        const data = await r.json();
        if (!r.ok) return res.status(502).json({ error: data.message || 'resend error' });
        return res.status(200).json({ ok: true, id: data.id });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
