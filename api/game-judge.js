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


// ── CHARLA CON LOS NPC DE CANCHERO LEYENDA ───────────────────────────────────
// Vive acá adentro y no en su propio archivo a propósito: el plan tiene un tope
// de 12 serverless functions y agregar una decimotercera hacía FALLAR el build
// entero (el deploy se quedaba en la versión anterior sin avisar).
// Se entra con { modo:'chat', ... }.
async function charlaNPC(req, res) {
    const apiKey = process.env.OPENAI_API_KEY;
    // Sin key el juego funciona igual: responde el generador local del cliente.
    if (!apiKey) return res.status(204).end();

    const b = req.body || {};
    const hilo = Array.isArray(b.hilo) ? b.hilo.slice(-10) : [];
    if (!hilo.length) return res.status(400).json({ error: 'hilo vacío' });

    // Ficha del personaje: quién es y cómo habla.
    const quien = [
        `Sos ${b.nombre || 'alguien del entorno'}, ${b.rol || 'un conocido'} de ${b.apellido || 'el jugador'}.`,
        b.edadNPC ? `Tenés ${b.edadNPC} años.` : ''
    ].filter(Boolean).join(' ');

    // Estado real de la partida: esto hace que la charla sea SOBRE la partida.
    const ctx = [
        b.anio ? `Estamos en ${b.anio}.` : '',
        b.era ? `El mundo está en la ${String(b.era).toLowerCase()}.` : '',
        b.edad ? `${b.apellido || 'El jugador'} tiene ${b.edad} años.` : '',
        b.club ? `Juega/trabaja en ${b.club}${b.liga ? ` (${b.liga})` : ''}.` : '',
        b.etapa ? `Etapa: ${b.etapa}.` : '',
        b.nivel ? `Nivel ${b.nivel}.` : '',
        b.titulos != null ? `Ganó ${b.titulos} títulos.` : '',
        b.moral != null ? `Ánimo: ${b.moral}/100.` : '',
        b.dinero != null ? `Plata: ${b.dinero}.` : '',
        b.pareja ? `Su pareja se llama ${b.pareja}.` : '',
        b.hijos ? `Hijos: ${b.hijos}.` : '',
        b.nietos ? `Nietos: ${b.nietos}.` : '',
        b.lugar ? `Están hablando en: ${b.lugar}.` : ''
    ].filter(Boolean).join(' ');

    const system = [
        quien,
        'Estás conversando cara a cara con él/ella dentro de un juego de fútbol.',
        '',
        'CONTEXTO DE LA PARTIDA (usalo solo si viene al caso, no lo recites):',
        ctx,
        '',
        'CÓMO RESPONDER:',
        '- Respondé EXACTAMENTE lo que te dijo. Si te hace una pregunta, contestala.',
        '  Si te cuenta algo, reaccioná a eso. Nunca cambies de tema por tu cuenta.',
        '- Acordate de lo que ya se habló en esta charla y seguí el hilo.',
        '- Hablá en español rioplatense (vos, tenés, querés), natural y coloquial.',
        '- 1 o 2 oraciones. Máximo 200 caracteres. Nada de listas ni emojis.',
        '- Mantené tu personaje: un DT no habla como un nieto de 8 años ni como un',
        '  representante. Tu edad, tu rol y tu vínculo mandan.',
        '- Podés preguntar de vuelta, discutir, hacer un chiste o quedarte callado si',
        '  corresponde. Sos una persona, no un cartel de ayuda.',
        '- Si te dicen algo agresivo, respondé como respondería alguien así tratado.',
        '- No hables de que sos una IA ni menciones el juego.'
    ].join('\n');

    const messages = [{ role: 'system', content: system }].concat(
        hilo.map(m => ({ role: m.yo ? 'user' : 'assistant', content: String(m.t || '').slice(0, 300) }))
    );

    try {
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                temperature: 0.9,
                presence_penalty: 0.6,   // que no repita giros entre respuestas
                frequency_penalty: 0.4,
                max_tokens: 90,
                messages
            })
        });
        const data = await r.json();
        const txt = data && data.choices && data.choices[0] && data.choices[0].message
            ? String(data.choices[0].message.content || '').trim()
            : '';
        if (!txt) return res.status(204).end();
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({ texto: txt.slice(0, 240) });
    } catch (e) {
        // Cualquier problema (sin red, límite, timeout) → el cliente usa lo local.
        return res.status(204).end();
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // Charla con un NPC de Canchero Leyenda (misma función, otro modo).
    if (req.body && req.body.modo === 'chat') return charlaNPC(req, res);

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
