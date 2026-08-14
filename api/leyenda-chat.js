/**
 * Canchero Leyenda — charla con los NPC
 *
 * El personaje del juego responde LO QUE SE LE DIJO, no una frase de un banco.
 * Recibe el hilo completo de la conversación y la ficha de quién habla + el
 * estado real de la partida, y contesta en personaje.
 *
 * Usa OPENAI_API_KEY (la misma que game-judge y generate-shield).
 * Sin key configurada devuelve 204 y el juego cae solo al generador local.
 */

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST' });

  const apiKey = process.env.OPENAI_API_KEY;
  // Sin key el juego funciona igual: responde el generador local del cliente.
  if (!apiKey) return res.status(204).end();

  const b = req.body || {};
  const hilo = Array.isArray(b.hilo) ? b.hilo.slice(-10) : [];
  if (!hilo.length) return res.status(400).json({ error: 'hilo vacío' });

  // Ficha del personaje: quién es, cómo habla y qué sabe.
  const quien = [
    `Sos ${b.nombre || 'alguien del entorno'}, ${b.rol || 'un conocido'} de ${b.apellido || 'el jugador'}.`,
    b.edadNPC ? `Tenés ${b.edadNPC} años.` : '',
    b.relacion ? `Tu relación con él/ella: ${b.relacion}.` : ''
  ].filter(Boolean).join(' ');

  // Estado real de la partida: esto es lo que hace que la charla sea SOBRE la
  // partida y no una conversación genérica.
  const ctx = [
    b.anio ? `Estamos en ${b.anio}.` : '',
    b.era ? `El mundo está en la ${b.era.toLowerCase()}.` : '',
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
};
