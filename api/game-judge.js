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

    // Un 204 mudo no dejaba saber si faltaba la key o si el proveedor rechazaba.
    // Con ?debug=1 se consulta el estado. Nunca se devuelve el valor de una key.
    if (req.query && req.query.debug === '1') {
        const prueba = await pensarIA(messages);
        return res.status(200).json({ diagnostico: {
            groq: !!process.env.GROQ_API_KEY,
            openrouter: !!process.env.OPENROUTER_API_KEY,
            gemini: !!process.env.GEMINI_API_KEY,
            openai: !!process.env.OPENAI_API_KEY,
            resultado: prueba ? ('respondio: ' + prueba.slice(0, 80)) : 'ningun proveedor devolvio texto'
        }});
    }
    const txt = await pensarIA(messages);
    if (!txt) return res.status(204).end();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ texto: txt.slice(0, 240) });
}

// ── MOTOR DE IA: gratis y sin depender de una sola cuenta ────────────────────
// Se prueban los proveedores en orden y se usa el primero que conteste. Todos son
// gratuitos; el ÚLTIMO no necesita registrarse ni configurar nada, así que el
// juego habla con IA aunque no haya ninguna variable de entorno cargada.
// Si mañana cargás una key gratuita de Gemini o de Groq, pasa a usarla sola.
async function pensarIA(messages, opt) {
    const conTiempo = (pr, ms) => Promise.race([
        pr, new Promise(r => setTimeout(() => r(null), ms))
    ]);
    // Hay 10 segundos de límite para toda la función: 4 por proveedor y se corta.
    const hayKey = !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY ||
                      process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY);
    // Pollinations sólo se intenta si NO hay ninguna key: es el último recurso y
    // hoy suele responder 402 (dejó de ser gratis para anónimos). Se deja en la
    // cadena porque no cuesta nada y si vuelve a abrirse funciona solo.
    const cadena = hayKey ? [openaiCompat, gemini] : [pollinations];
    for (const intento of cadena) {
        try {
            const t = await conTiempo(intento(messages, opt || {}), 4000);
            if (t && t.trim()) return t.trim();
        } catch (e) { /* se prueba el siguiente */ }
    }
    return null;
}

// Groq, OpenRouter y OpenAI hablan el mismo formato. Se usa el que tenga key.
async function openaiCompat(messages, opt = {}) {
    const opciones = [
        { key: process.env.GROQ_API_KEY,       url: 'https://api.groq.com/openai/v1/chat/completions',  model: 'llama-3.3-70b-versatile' },
        { key: process.env.OPENROUTER_API_KEY, url: 'https://openrouter.ai/api/v1/chat/completions',    model: 'meta-llama/llama-3.3-70b-instruct:free' },
        { key: process.env.OPENAI_API_KEY,     url: 'https://api.openai.com/v1/chat/completions',       model: 'gpt-4o-mini' }
    ].filter(o => o.key);
    for (const o of opciones) {
        const r = await fetch(o.url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${o.key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: o.model, temperature: opt.temp ?? 0.9, presence_penalty: 0.6, frequency_penalty: 0.4, max_tokens: opt.max ?? 90, messages })
        });
        if (!r.ok) continue;
        const d = await r.json();
        const t = d?.choices?.[0]?.message?.content;
        if (t) return String(t);
    }
    return null;
}

// Google Gemini: tiene capa gratuita generosa. Usa GEMINI_API_KEY.
async function gemini(messages, opt = {}) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    const sys = messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
    const turnos = messages.filter(m => m.role !== 'system')
        .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: sys }] },
            contents: turnos,
            generationConfig: { temperature: opt.temp ?? 0.9, maxOutputTokens: opt.max ?? 120 }
        })
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d?.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

// Pollinations: gratis y SIN key. Es el que hace que esto funcione de una.
async function pollinations(messages, opt = {}) {
    const r = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'openai', temperature: 0.9, max_tokens: 90, private: true, messages })
    });
    if (r.ok) {
        const cuerpo = await r.text();
        try {
            const d = JSON.parse(cuerpo);
            const t = d?.choices?.[0]?.message?.content;
            if (t) return String(t);
        } catch (e) { if (cuerpo && cuerpo.length < 600) return cuerpo; }
    }
    // Plan B del plan B: la variante por URL, que devuelve texto pelado.
    const sys = messages.filter(m => m.role === 'system').map(m => m.content).join(' ');
    const ult = [...messages].reverse().find(m => m.role === 'user');
    if (!ult) return null;
    const prompt = encodeURIComponent(sys + '\n\nTe dicen: "' + ult.content + '"\nContestá:');
    const r2 = await fetch(`https://text.pollinations.ai/${prompt}?model=openai&private=true`);
    if (!r2.ok) return null;
    const t2 = await r2.text();
    return (t2 && t2.length < 600) ? t2 : null;
}


// ── DOS PERSONAJES HABLANDO ENTRE ELLOS ──────────────────────────────────────
// No hace falta que el jugador escriba nada: el mundo tiene que sonar vivo. Se
// piden las DOS líneas en una sola llamada para no gastar el doble.
async function charlaAmbiente(req, res) {
    const b = req.body || {};
    const A = b.a || {}, B = b.b || {};
    const ctx = [
        b.anio ? `Estamos en ${b.anio}.` : '',
        b.lugar ? `Están en ${b.lugar}.` : '',
        b.apellido ? `Cerca anda ${b.apellido}${b.edad ? `, de ${b.edad} años` : ''}${b.club ? `, de ${b.club}` : ''}. NO hace falta que hablen de él; mencionalo solo si viene al caso.` : '',
        b.tema ? `Tema del que están hablando: ${b.tema}.` : ''
    ].filter(Boolean).join(' ');

    const system = [
        `Escribí un intercambio MUY corto entre dos personas de un juego de fútbol.`,
        `PERSONA A: ${A.nombre || 'Alguien'}, ${A.rol || 'un conocido'}${A.edad ? `, ${A.edad} años` : ''}.`,
        `PERSONA B: ${B.nombre || 'Alguien'}, ${B.rol || 'un conocido'}${B.edad ? `, ${B.edad} años` : ''}.`,
        ctx,
        '',
        'REGLAS:',
        '- A dice algo y B le contesta. Dos líneas, nada más.',
        '- Español rioplatense (vos, tenés, querés), natural, como se habla de verdad.',
        '- ENTRE 45 Y 100 CARACTERES CADA UNO. Ni telegramas ni discursos.',
        '- La respuesta de B tiene que APORTAR algo: una opinión, un dato, una queja,',
        '  una cargada. Prohibido contestar "sí", "claro", "todo bien" y nada más.',
        '- NO empieces con "Che". Variá el arranque; que no suene a plantilla.',
        '- Sin comillas y sin poner el nombre adelante.',
        '- Que se note quién es cada uno: un nene de 6 no habla como un DT de 55,',
        '  y un médico no habla como un hincha.',
        '- Que hablen de algo concreto, no en abstracto.',
        '- La mayoría de las veces NO hablen del jugador: hablá del tema y listo.',
        '- Los familiares no lo llaman por el apellido: es "papá", "tu padre", "él".',
        '- Español CORRECTO. No inventes palabras ni conjugaciones raras.',
        '- Respondé SOLO JSON: {"a":"...","b":"..."}'
    ].join('\n');

    const txt = await pensarIA([
        { role: 'system', content: system },
        // Ejemplos de cómo tiene que sonar. Con la instrucción sola el modelo
        // devolvía frases cortadas o con palabras inventadas.
        { role: 'user', content: 'Ejemplo: un DT de 55 y su capitán de 29, en el vestuario, sobre el partido que viene.' },
        { role: 'assistant', content: '{"a":"Si salimos a presionarlos arriba nos comen los espacios","b":"Yo los aguanto atrás, pero alguien tiene que correr por afuera"}' },
        { role: 'user', content: 'Ejemplo: una madre de 34 y su hija de 6, en casa, sobre los chicos.' },
        { role: 'assistant', content: '{"a":"Terminá la leche que hoy hay que salir temprano","b":"¿Y podemos pasar por la plaza a la vuelta?"}' },
        { role: 'user', content: 'Ahora la de verdad. Solo el JSON.' }
    ], { temp: 0.55, max: 120 });
    if (!txt) return res.status(204).end();
    try {
        const limpio = txt.replace(/```json|```/g, '').trim();
        const d = JSON.parse(limpio.slice(limpio.indexOf('{'), limpio.lastIndexOf('}') + 1));
        if (d && d.a && d.b) {
            res.setHeader('Cache-Control', 'no-store');
            return res.status(200).json({ a: String(d.a).slice(0, 110), b: String(d.b).slice(0, 110) });
        }
    } catch (e) { /* si no vino JSON limpio, mejor nada */ }
    return res.status(204).end();
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // Charla con un NPC de Canchero Leyenda (misma función, otro modo).
    if (req.body && req.body.modo === 'chat') return charlaNPC(req, res);
    if (req.body && req.body.modo === 'ambiente') return charlaAmbiente(req, res);

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
