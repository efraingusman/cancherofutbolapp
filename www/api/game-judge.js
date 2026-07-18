// api/game-judge.js — Vercel Serverless Function
// Juez de "11 Ideal": valida que cada jugador haya jugado en el club Y sea de
// la selección sorteada, puntúa jerarquía y elige ganador con argumento.
// Usa OPENAI_API_KEY (igual que generate-shield). Sin key → heurística local.

const STARS = { messi:10, 'cristiano ronaldo':10, cristiano:10, ronaldo:9, maradona:10, pele:10, 'pelé':10, ronaldinho:9, zidane:9, 'mbappe':9, 'mbappé':9, haaland:9, neymar:8, 'suarez':8, 'suárez':8, cavani:7, 'forlan':7, 'forlán':7, iniesta:8, xavi:8, 'modric':8, 'modrić':8, benzema:8, lewandowski:8, salah:8, 'de bruyne':9, vinicius:8, bellingham:8, kroos:8, ramos:7, puyol:7, casillas:8, buffon:8, maldini:8, pirlo:8, gerrard:8, henry:8 };

function heuristic(team) {
    let s = 0;
    (team || []).forEach(p => {
        const k = (p.name || '').toLowerCase().trim();
        const star = Object.keys(STARS).find(st => k.includes(st));
        s += star ? STARS[star] : 4;
    });
    return Math.min(99, Math.round((s / (11 * 10)) * 99));
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { teamA, teamB, nameA, nameB } = req.body || {};
    if (!Array.isArray(teamA) || !Array.isArray(teamB)) return res.status(400).json({ error: 'teamA y teamB requeridos' });

    const apiKey = process.env.OPENAI_API_KEY;
    const fmt = t => t.map((p, i) => `${i + 1}. ${p.name} (sorteo: club ${p.eq} + selección ${p.sel}${p.pos ? ` + posición ${p.pos}` : ''})`).join('\n');

    if (apiKey) {
        try {
            const r = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0.4,
                    response_format: { type: 'json_object' },
                    messages: [
                        { role: 'system', content: 'Sos juez del juego "11 Ideal" de fútbol. Cada jugador del once debía: (a) haber jugado en el club sorteado Y (b) ser de la selección sorteada. Penalizá fuerte los que no cumplen ambas condiciones o no existen. Si el sorteo incluye una posición, penalizá también a los jugadores puestos en una posición en la que nunca jugaron (ej.: un delantero de arquero). Premiá jerarquía histórica. Respondé SOLO JSON: {"scoreA":0-99,"scoreB":0-99,"winner":"A"|"B"|"tie","argument":"2-3 frases en español rioplatense, concretas, mencionando aciertos/errores clave de cada equipo"}' },
                        { role: 'user', content: `EQUIPO A (${nameA || 'Jugador A'}):\n${fmt(teamA)}\n\nEQUIPO B (${nameB || 'Jugador B'}):\n${fmt(teamB)}` }
                    ]
                })
            });
            const data = await r.json();
            const out = JSON.parse(data.choices[0].message.content);
            if (typeof out.scoreA === 'number' && typeof out.scoreB === 'number') {
                return res.status(200).json({ ...out, ai: true });
            }
        } catch (e) { /* cae a heurística */ }
    }

    const scoreA = heuristic(teamA), scoreB = heuristic(teamB);
    return res.status(200).json({
        scoreA, scoreB,
        winner: scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'tie',
        argument: scoreA === scoreB
            ? 'Dos onces muy parejos en jerarquía. Empate técnico.'
            : `El equipo de ${scoreA > scoreB ? (nameA || 'A') : (nameB || 'B')} reúne más figuras de peso histórico. Diferencia de jerarquía en ataque y mediocampo.`,
        ai: false
    });
}
