// api/generate-shield.js — Vercel Serverless Function
// Genera escudos de equipos con DALL-E 3 (OpenAI)
// Si no hay API key, retorna placeholder

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'prompt requerido' });

    const apiKey = process.env.OPENAI_API_KEY;

    // Sin API key → placeholder temático de fútbol
    if (!apiKey) {
        const name = prompt.split('"')[1] || 'TEAM';
        const initials = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
        return res.status(200).json({
            url: `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=0a0a0a&color=baff00&bold=true&size=400&rounded=true`,
            fallback: true
        });
    }

    try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                prompt: prompt + '. Football club badge/crest style. Transparent or white background. Clean vector art. Professional sports logo.',
                n: 1,
                size: '1024x1024',
                quality: 'standard',
                style: 'vivid'
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err?.error?.message || 'OpenAI API error');
        }

        const data = await response.json();
        const url = data.data?.[0]?.url;
        if (!url) throw new Error('No image returned from OpenAI');

        return res.status(200).json({ url });

    } catch (e) {
        console.error('[generate-shield] Error:', e.message);
        return res.status(500).json({ error: e.message });
    }
}
