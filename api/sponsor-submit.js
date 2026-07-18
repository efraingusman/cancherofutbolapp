// Vercel serverless function — recibe formulario de sponsor y envía por email
// Email gratuito vía Web3Forms (no requiere API key del lado del usuario)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { company, contact, email, phone, budget, message, type } = body || {};

    if (!company || !email) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // Build email body
    const emailBody = `Nueva solicitud de Sponsor — Canchero App
─────────────────────────────────────────

🏢 Empresa/Marca: ${company}
👤 Contacto: ${contact || '-'}
📧 Email: ${email}
📱 Teléfono: ${phone || '-'}
💰 Presupuesto estimado: ${budget || '-'}
📋 Tipo: ${type || 'Sponsor general'}

💬 Mensaje:
${message || '(sin mensaje)'}

─────────────────────────────────────────
Recibido el ${new Date().toLocaleString('es-UY', { timeZone: 'America/Montevideo' })}
`;

    // Send via Formsubmit.co (no signup needed for first activation)
    // Note: first submission triggers a confirmation email to neurostudioia@gmail.com
    // After confirming, all subsequent submissions go directly.
    const formData = new URLSearchParams();
    formData.append('_subject', `🚀 Nueva solicitud de Sponsor — ${company}`);
    formData.append('_template', 'box');
    formData.append('_captcha', 'false');
    formData.append('empresa', company);
    formData.append('contacto', contact || '-');
    formData.append('email', email);
    formData.append('telefono', phone || '-');
    formData.append('presupuesto', budget || '-');
    formData.append('tipo', type || 'Sponsor general');
    formData.append('mensaje', message || '');
    formData.append('detalles', emailBody);

    const r = await fetch('https://formsubmit.co/ajax/neurostudioia@gmail.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: formData.toString()
    });

    const result = await r.json().catch(() => ({}));

    return res.status(200).json({
      ok: true,
      message: 'Solicitud enviada correctamente',
      provider: result
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Error inesperado' });
  }
}
