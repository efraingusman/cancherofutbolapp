// Supabase Edge Function: bot-historia-futbol
// Efemerides REALES del futbol en ESPANOL segun la fecha del dia
// Fuente: base curada en espanol (prioridad) + Wikipedia ES "On This Day" (filtro futbol estricto)
// Posts duran 12hs y se eliminan automaticamente

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const sb = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const BOT_EMAIL = 'bot-historia@canchero.app';
const EXPIRES_HOURS = 12;

const FUTBOL_KW = ['futbol','fútbol','gol','liga','champions','libertadores','mundial','seleccion','selección','copa','fifa','uefa','conmebol','club de futbol','club de fútbol','futbolista','delantero','arquero','estadio','maracana','maracaná','wembley','pele','pelé','maradona','messi','cristiano','real madrid','barcelona','boca','river','peñarol','nacional','penal','futbolistico','futbolístico'];
const NO_KW = ['space','nasa','spacex','crew dragon','tenis','nba','basket','golf','formula','f1','rugby','boxeo','guerra','batalla','elecciones','presidente','volcan','volcán','terremoto','huracan','huracán','pelicula','película','astronauta','satelite','satélite','cohete'];

async function fetchWikipediaES(month: number, day: number): Promise<string | null> {
  try {
    const url = 'https://es.wikipedia.org/api/rest_v1/feed/onthisday/events/' + month + '/' + day;
    const res = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'CancheroBot/1.0' }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json();
    const events: Array<{ year: number; text: string }> = data.events || [];
    const futbol = events.filter(e => {
      const t = ' ' + (e.text || '').toLowerCase() + ' ';
      if (NO_KW.some(k => t.includes(k))) return false;
      return FUTBOL_KW.some(k => t.includes(k));
    });
    if (!futbol.length) return null;
    const e = futbol[0];
    return '📅 Un día como hoy en ' + e.year + ':\n\n' + e.text;
  } catch(_e) { return null; }
}

// Base curada en espanol (verificada). Clave: MM-DD
const EFEMERIDES: Record<string, string[]> = {
  '01-01': ['🎆 1902: Se fundó el Real Madrid (originalmente "Madrid Football Club"). Más de 120 años después es el club más ganador de la Champions League con 15 títulos. 👑 #RealMadrid'],
  '02-06': ['🖤 1958: La tragedia aérea de Múnich. El avión del Manchester United se estrelló al despegar y murieron 8 jugadores del equipo "Busby Babes". Uno de los días más tristes del fútbol inglés. 🙏'],
  '02-14': ['🧡 1974: Johan Cruyff firmó por el FC Barcelona, un traspaso que cambió la historia del club. El "Profeta" del fútbol total. 🔵🔴 #Cruyff'],
  '03-07': ['💙🤍 1950: Uruguay venció a Brasil 2-1 en el Maracaná, el legendario "Maracanazo", la mayor sorpresa de la historia de los Mundiales. 🏆 #Uruguay'],
  '04-10': ['🔥 1960: Real Madrid 7-3 Eintracht Frankfurt en la final de la Copa de Europa. Puskas marcó 4 y Di Stéfano 3. Considerado uno de los mejores partidos de la historia. 👑'],
  '04-22': ['🇦🇷 1964: Nació Diego Armando Maradona en Lanús. El Gol del Siglo, la Mano de Dios y un Mundial. D10S eterno. 💙🤍 #Maradona'],
  '05-25': ['🟢 1967: Celtic de Glasgow ganó la Copa de Europa, primer club británico en lograrlo. Los "Leones de Lisboa". ☘️'],
  '05-26': ['🔴 1999: Manchester United 2-1 Bayern Múnich. Dos goles en el descuento (Sheringham y Solskjaer) para ganar la Champions. La mayor remontada de una final. 🔴'],
  '05-28': ['💙 2009: Barcelona 2-0 Manchester United en Roma. El Barça de Guardiola, Xavi, Iniesta y Messi mostró el mejor fútbol jamás visto. 🔵🔴'],
  '05-29': ['⭐ 1968: Manchester United 4-1 Benfica en Wembley, su primera Copa de Europa, dedicada a los Busby Babes. ✨ #ManUtd'],
  '05-30': ['🧡 1974: Holanda deslumbró al mundo con el "Fútbol Total" de Cruyff y Michels en el Mundial de Alemania. Una revolución táctica eterna. 🇳🇱'],
  '06-17': ['💛💚 1970: Brasil 4-1 Italia en la final del Mundial de México. Pelé, Jairzinho y Rivelino. El mejor Brasil de la historia se quedó con el trofeo Jules Rimet. 👑 #Brasil70'],
  '06-21': ['🤽 1986: Argentina 2-1 Inglaterra. La "Mano de Dios" y el "Gol del Siglo" de Maradona en el mismo partido del Mundial de México. 🇦🇷'],
  '06-29': ['👑 1970: Pelé levantó su tercera Copa del Mundo con Brasil, el único futbolista en ganar tres mundiales. 💛💚'],
  '07-08': ['😱 2014: Alemania 7-1 Brasil en el Mundial, el "Mineirazo". El mayor golpe al fútbol brasileño en su propia casa. 🇩🇪'],
  '07-13': ['🏆 1930: Uruguay 4-2 Argentina en la primera final del Mundial de la historia, en el Estadio Centenario de Montevideo. Primeros campeones del mundo. 💙🤍 #Uruguay1930'],
  '07-30': ['🦁 1966: Inglaterra 4-2 Alemania en Wembley, su único título mundial. Geoff Hurst marcó un hat-trick histórico. 🔴⬜🔵'],
  '08-06': ['⚡ 1993: Nació Kylian Mbappé en Bondy, Francia. Campeón del mundo y uno de los mejores de su generación. 🇫🇷 #Mbappé'],
  '08-22': ['🔵🔴 1899: Se fundó el FC Barcelona. De Cruyff a Messi, el club del "Mes que un club". 🔵🔴'],
  '11-25': ['💔 2020: Falleció Diego Maradona a los 60 años. El mundo del fútbol se detuvo para llorar al más grande. D10S eterno. 💙🤍 #Maradona'],
  '12-18': ['🏆 2022: Argentina 3-3 Francia (4-2 en penales) en la final de Qatar. Messi por fin campeón del mundo, Mbappé con un hat-trick. La mejor final de la historia. 🇦🇷🥇'],
};

const CLOSINGS = ['\n\n¿Lo recordabas? 💬', '\n\n¿Dónde estabas cuando pasó? 🤔', '\n\nUna página de oro del fútbol. 📖', '\n\n¿El mejor momento de ese año? 👇'];

const FALLBACK_ES = [
  '📅 Este día en la historia del fútbol...\n\nCada fecha guarda un gol mítico, un héroe inesperado, una final inolvidable. El fútbol es la pasión que une al mundo. ¿Cuál es el partido que más te marcó? 💬 #HistoriaDelFutbol',
  '🏟️ Maracaná, Wembley, Azteca, Monumental, Centenario...\n\nLos grandes estadios guardan la memoria de mil batallas. ¿En cuál soñás jugar algún día? ⚽',
  '🌟 Los números de las leyendas:\n\n⚽ Pelé: más de 1.000 goles\n🇦🇷 Maradona: el Gol del Siglo\n🐐 Messi: 8 Balones de Oro\n\n¿Quién es el más grande para vos? Solo fútbol, sin peleas 💬',
];

const BLOCKED_WORDS = ['sexo','sexual','desnud','porno','xxx','violaci','erotic','escort','prostitu','obscen'];
function isAppropriate(text: string): boolean {
  const lower = text.toLowerCase();
  return !BLOCKED_WORDS.some(w => lower.includes(w));
}
function titleHash(title: string): string {
  const s = title.toLowerCase().replace(/[^a-z0-9áéíóúñ]/g,'').slice(0,60);
  let h = 0; for (let i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;}
  return 'h'+Math.abs(h).toString(36);
}

Deno.serve(async (_req: Request) => {
  try {
    const cutoff = new Date(Date.now() - EXPIRES_HOURS * 3_600_000).toISOString();
    await sb.from('posts').delete().eq('user_email', BOT_EMAIL).lt('created_at', cutoff);

    // Deduplicacion: hashes de las ultimas 24hs
    const since24h = new Date(Date.now() - 24 * 3_600_000).toISOString();
    const { data: recentPosts } = await sb.from('posts').select('tags').eq('user_email', BOT_EMAIL).gte('created_at', since24h);
    const usedHashes = new Set<string>((recentPosts||[]).flatMap(p=>(Array.isArray(p.tags)?p.tags:[])).filter((t:string)=>t.startsWith('h')));

    const today = new Date();
    const m = today.getMonth() + 1, d = today.getDate();
    const key = String(m).padStart(2,'0') + '-' + String(d).padStart(2,'0');

    let content: string | null = null;
    let postHash = '';
    let source = 'fallback';

    // 1. Base curada (prioridad)
    if (EFEMERIDES[key]) {
      for (const opt of EFEMERIDES[key]) {
        const h = titleHash(opt);
        if (!usedHashes.has(h) && isAppropriate(opt)) { content = opt; postHash = h; source = 'curada'; break; }
      }
    }

    // 2. Wikipedia ES
    if (!content) {
      const wiki = await fetchWikipediaES(m, d);
      if (wiki && isAppropriate(wiki)) {
        const h = titleHash(wiki);
        if (!usedHashes.has(h)) { content = wiki + CLOSINGS[Math.floor(Math.random()*CLOSINGS.length)]; postHash = h; source = 'wikipedia-es'; }
      }
    }

    // 3. Fallback
    if (!content) {
      const unused = FALLBACK_ES.filter(f => !usedHashes.has(titleHash(f)));
      const fb = unused.length > 0 ? unused : FALLBACK_ES;
      content = fb[Math.floor(Date.now()/(6*3_600_000)) % fb.length];
      postHash = titleHash(content);
    }

    const { error } = await sb.from('posts').insert({
      user_email: BOT_EMAIL, content, tags: [postHash],
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + EXPIRES_HOURS * 3_600_000).toISOString(),
    });
    if (error) throw error;
    await sb.from('bots').update({ last_posted_at: new Date().toISOString() }).eq('email', BOT_EMAIL).catch(()=>{});

    return new Response(JSON.stringify({ ok: true, date: key, source, preview: content.slice(0,90) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message||'Unknown error' }), { status: 500 });
  }
});
