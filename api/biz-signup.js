// api/biz-signup.js — Vercel Serverless Function
// Crea (o confirma) la cuenta de un negocio SIN requerir confirmacion por email.
// Usa la Admin API de Supabase (service role) para crear el usuario con
// email_confirm:true. Asi el negocio puede iniciar sesion al instante con
// email + contrasena, aunque "Confirm email" este activado en Supabase y no
// haya SMTP configurado (que es justo nuestro caso).
//
// Env vars requeridas (Vercel → Settings → Environment Variables):
//   SUPABASE_URL                — https://<proyecto>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   — service key (solo vive en el servidor)
//
// POST { email, password }  →  { ok:true, created:bool }

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // Limpiar BOM / caracteres no-ASCII que se cuelan al pegar env vars en Vercel
    // y rompen los headers HTTP ("Cannot convert argument to a ByteString").
    const _envClean = (s) => String(s || '').replace(/[^\x20-\x7E]/g, '').trim();
    const SB_URL = _envClean(process.env.SUPABASE_URL);
    const SB_KEY = _envClean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'Supabase admin no configurado (faltan env vars)' });

    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email y password requeridos' });
    if (String(password).length < 6) return res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres.' });

    const em = String(email).trim().toLowerCase();
    const adminHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };

    try {
        // 1) Crear usuario ya confirmado
        const createRes = await fetch(`${SB_URL}/auth/v1/admin/users`, {
            method: 'POST',
            headers: adminHeaders,
            body: JSON.stringify({ email: em, password: String(password), email_confirm: true })
        });
        const createData = await createRes.json().catch(() => ({}));

        if (createRes.ok) {
            return res.status(200).json({ ok: true, created: true });
        }

        // 2) Si ya existe, buscarlo y asegurar que este confirmado + setear la contrasena
        const msg = String(createData.msg || createData.message || createData.error_description || '').toLowerCase();
        const alreadyExists = createRes.status === 422 || msg.includes('already') || msg.includes('registered') || msg.includes('exists');

        if (alreadyExists) {
            // Buscar el id del usuario por email
            const listRes = await fetch(`${SB_URL}/auth/v1/admin/users?email=${encodeURIComponent(em)}`, { headers: adminHeaders });
            const listData = await listRes.json().catch(() => ({}));
            const user = (listData.users || []).find(u => (u.email || '').toLowerCase() === em) || (listData.users || [])[0];
            if (!user) {
                // No pudimos ubicarlo; la cuenta existe → que pruebe con su contrasena
                return res.status(200).json({ ok: true, created: false, existed: true });
            }
            // Confirmar el email (no tocamos la contrasena para no pisar la del dueno)
            await fetch(`${SB_URL}/auth/v1/admin/users/${user.id}`, {
                method: 'PUT',
                headers: adminHeaders,
                body: JSON.stringify({ email_confirm: true })
            });
            return res.status(200).json({ ok: true, created: false, existed: true });
        }

        return res.status(502).json({ error: createData.msg || createData.message || 'No se pudo crear la cuenta.' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
