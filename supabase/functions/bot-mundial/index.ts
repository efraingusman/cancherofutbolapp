// Supabase Edge Function: bot-mundial
// Publica NOTICIAS REALES de futbol internacional EN ESPANOL
// Fuentes RSS en espanol: Marca, AS, Mundo Deportivo, ESPN Deportes, BBC Mundo
// Filtro estricto: solo futbol, descarta otros deportes
// Posts duran 12hs y se eliminan automaticamente

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const sb = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const BOT_EMAIL = 'bot-mundial@canchero.app';
const EXPIRES_HOURS = 12;

// ── Parser RSS ────────────────────────────────────────────────
function parseRSSItems(xml: string): Array<{ title: string; description: string }> {
  const items: Array<{ title: string; description: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < 12) {
    const block = match[1];
    const title = (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || block.match(/<title>([\s\S]*?)<\/title>/))?.[1]?.trim() || '';
    const desc  = (block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || block.match(/<description>([\s\S]*?)<\/description>/))?.[1]?.trim() || '';
    if (title && title.length > 12) {
      items.push({ title, description: desc.replace(/<[^>]+>/g, '').slice(0, 240) });
    }
  }
  return items;
}

// Fuentes en espanol especificas de futbol
const RSS_SOURCES = [
  { name: 'Marca',          url: 'https://e00-marca.uecdn.es/rss/futbol/primera.xml' },
  { name: 'Marca Internacional', url: 'https://e00-marca.uecdn.es/rss/futbol/futbol-internacional.xml' },
  { name: 'AS',             url: 'https://as.com/rss/futbol/primera.xml' },
  { name: 'Mundo Deportivo', url: 'https://www.mundodeportivo.com/feed/rss/futbol' },
  { name: 'ESPN Deportes',  url: 'https://www.espn.com.mx/espn/rss/futbol/news' },
];

const FUTBOL_KW = ['futbol','fútbol','gol','goles','liga','champions','libertadores','mundial','seleccion','selección','penal','penalti','delantero','arquero','portero','mediocampista','defensa','dt','entrenador','fichaje','fichajes','traspaso','messi','cristiano','mbappe','mbappé','madrid','barcelona','boca','river','peñarol','nacional','uruguay','argentina','copa','eliminatorias','clasico','clásico','derbi','equipo','club','partido','torneo','premier','laliga','serie a','fifa','uefa','conmebol'];
const NO_KW = ['tenis','basquet','básquet','nba','formula 1','fórmula 1',' f1 ','golf','rugby','boxeo','ufc','djokovic','nadal','alcaraz','voley','vóley','ciclismo','natacion','natación','atletismo','beisbol','béisbol','nfl','wwe','padel','pádel','motogp','space','nasa','spacex'];

function esFutbol(text: string): boolean {
  const t = ' ' + text.toLowerCase() + ' ';
  if (NO_KW.some(k => t.includes(k))) return false;
  return FUTBOL_KW.some(k => t.includes(k));
}

async function fetchFutbolNews(): Promise<Array<{ title: string; description: string; source: string }>> {
  const out: Array<{ title: string; description: string; source: string }> = [];
  for (const src of RSS_SOURCES) {
    try {
      const res = await fetch(src.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CancheroBot/1.0)' },
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = parseRSSItems(xml);
      for (const it of items) {
        if (esFutbol(it.title + ' ' + it.description)) {
          out.push({ ...it, source: src.name });
        }
        if (out.length >= 8) break;
      }
      if (out.length >= 8) break;
    } catch(_e) { /* skip */ }
  }
  return out;
}

function clean(s: string): string {
  return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&aacute;/g,'á').replace(/&eacute;/g,'é').replace(/&iacute;/g,'í').replace(/&oacute;/g,'ó').replace(/&uacute;/g,'ú').replace(/&ntilde;/g,'ñ');
}

const INTROS = ['⚽ ÚLTIMA HORA','🔥 LO QUE PASA EN EL MUNDO','📰 NOTICIA','⚡ AHORA MISMO','🌍 FÚTBOL INTERNACIONAL'];

const FALLBACK = [
  '⚽ La UEFA Champions League sigue encendida. Las mejores noches del fútbol europeo, donde los gigantes del continente se miden por la gloria. ¿Quién levanta la Orejona esta temporada? Dejá tu predicción 👇 #Champions',
  '🏆 La Copa Libertadores late fuerte en Sudamérica. El sueño de todo club del continente. Garra, pasión y noches inolvidables. ¿Tu equipo está en carrera? ⭐ #Libertadores',
  '🇺🇾 La Celeste siempre presente. Uruguay y su garra charrúa, escribiendo historia en cada partido. El fútbol uruguayo nunca se rinde. 💙🤍 #Uruguay',
  '⚡ Las eliminatorias sudamericanas rumbo al Mundial 2026 prometen emoción hasta el final. Cada punto vale oro. ¿Quién se queda con los cupos? 🌎 #Eliminatorias',
  '🌟 Debate: Messi, Mbappé, Vinicius, Haaland... ¿quién es el mejor del mundo hoy? Comentá tu top 3 🗳️ #FútbolMundial',
];

// Palabras inapropiadas — nunca publicar contenido con estas
const BLOCKED_WORDS = ['sexo','sexual','desnud','porno','xxx','violaci','erotic','escort','prostitu','fetich','obscen'];

function isAppropriate(text: string): boolean {
  const lower = text.toLowerCase();
  return !BLOCKED_WORDS.some(w => lower.includes(w));
}

// Deduplicacion: hash simple del titulo
function titleHash(title: string): string {
  const s = title.toLowerCase().replace(/[^a-z0-9áéíóúñ]/g, '').slice(0, 60);
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return 'h' + Math.abs(h).toString(36);
}

Deno.serve(async (_req: Request) => {
  try {
    const cutoff = new Date(Date.now() - EXPIRES_HOURS * 3_600_000).toISOString();
    await sb.from('posts').delete().eq('user_email', BOT_EMAIL).lt('created_at', cutoff);

    // Obtener hashes de posts recientes (ultimas 24hs) para deduplicar
    const since24h = new Date(Date.now() - 24 * 3_600_000).toISOString();
    const { data: recentPosts } = await sb.from('posts').select('tags').eq('user_email', BOT_EMAIL).gte('created_at', since24h);
    const usedHashes = new Set<string>((recentPosts || []).flatMap(p => (Array.isArray(p.tags) ? p.tags : [])).filter((t: string) => t.startsWith('h')));

    const news = await fetchFutbolNews();
    let content: string | null = null;
    let postHash = '';
    let source = 'fallback';

    // Intentar encontrar noticia no duplicada y apropiada
    if (news.length > 0) {
      const shuffled = news.sort(() => Math.random() - 0.5);
      for (const item of shuffled) {
        const h = titleHash(item.title);
        if (usedHashes.has(h)) continue;
        const rawContent = clean(item.title) + ' ' + clean(item.description);
        if (!isAppropriate(rawContent)) continue;
        const intro = INTROS[Math.floor(Math.random() * INTROS.length)];
        const title = clean(item.title);
        const desc = clean(item.description);
        content = intro + '\n\n' + title;
        if (desc && desc.length > 20 && !title.includes(desc.slice(0, 30))) content += '\n\n' + desc;
        content += '\n\nFuente: ' + item.source + ' 📡';
        source = item.source;
        postHash = h;
        break;
      }
    }

    if (!content) {
      // Elegir fallback no usado recientemente
      const unusedFallbacks = FALLBACK.filter(f => !usedHashes.has(titleHash(f)));
      const fb = unusedFallbacks.length > 0 ? unusedFallbacks : FALLBACK;
      content = fb[Math.floor(Date.now() / (6 * 3_600_000)) % fb.length];
      postHash = titleHash(content);
    }

    const { error } = await sb.from('posts').insert({
      user_email: BOT_EMAIL, content,
      tags: [postHash],
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + EXPIRES_HOURS * 3_600_000).toISOString(),
    });
    if (error) throw error;
    await sb.from('bots').update({ last_posted_at: new Date().toISOString() }).eq('email', BOT_EMAIL).catch(() => {});

    return new Response(JSON.stringify({ ok: true, source, preview: content.slice(0, 90) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), { status: 500 });
  }
});
