// Supabase Edge Function: bot-canchero-news
// Publica noticias de la comunidad Canchero + tips y contenido útil para jugadores
// Estilo: periodista deportivo cercano, no robótico
// Posts duran 12hs y se eliminan automáticamente

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const sb = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const BOT_EMAIL = 'bot-news@canchero.app';
const EXPIRES_HOURS = 12;

// ── Obtener stats reales de la app ────────────────────────────
async function getAppStats() {
  try {
    const [usersRes, matchesRes, postsRes] = await Promise.all([
      sb.from('users').select('email', { count: 'exact', head: true }),
      sb.from('matches').select('id', { count: 'exact', head: true }),
      sb.from('posts').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 3_600_000).toISOString()),
    ]);
    return {
      players: usersRes.count || 0,
      matches: matchesRes.count || 0,
      weeklyPosts: postsRes.count || 0,
    };
  } catch(_e) {
    return { players: 0, matches: 0, weeklyPosts: 0 };
  }
}

// ── Templates con stats reales ─────────────────────────────────
type AppStats = { players: number; matches: number; weeklyPosts: number };

const TEMPLATES: Array<(s: AppStats) => string> = [
  (s) => `🟢 LA COMUNIDAD CANCHERO SIGUE CRECIENDO\n\nMás de ${s.players > 0 ? s.players.toLocaleString('es-UY') : 'cientos de'} jugadores ya forman parte de la plataforma de fútbol más grande de Uruguay.\n\nSi todavía no armaste tu perfil con tus estadísticas, posición y bio — es el momento. Los reclutadores y capitanes de equipo están buscando. ⚽\n\n¿Ya completaste tu perfil? 👇 #CancheroApp`,

  (s) => `⚽ ESTA SEMANA EN CANCHERO\n\n${s.matches > 0 ? s.matches + ' partidos' : 'Decenas de partidos'} organizados, ${s.weeklyPosts > 0 ? s.weeklyPosts + ' publicaciones' : 'nueva actividad'} en el feed, y la comunidad más activa del fútbol uruguayo.\n\n¿Ya buscaste rivales en tu zona? Entrá al mapa y encontrá partidos disponibles ahora mismo. La pelota siempre está rodando. 🔍 #Partidos #Uruguay`,

  (s) => `💡 CONSEJO DE LA SEMANA\n\n¿Sabés cómo diferenciarte en Canchero?\n\n✅ Completá tus estadísticas reales (goles, asistencias, partidos)\n✅ Ponete como "Disponible" cuando podés jugar\n✅ Publicá en el feed para que te conozcan\n✅ Uníte o creá tu equipo\n\nLos jugadores con perfil completo reciben 5x más solicitudes. ⚡ #Tips`,

  (s) => `🏟️ CANCHERO: MÁS QUE UNA RED SOCIAL\n\nEn Canchero podés:\n\n⚽ Crear y unirte a partidos en segundos\n👥 Formar o buscar equipo\n📊 Llevar tus estadísticas reales\n🏆 Competir en torneos y ligas\n🔴 Transmitir tus partidos en vivo\n🏅 Desbloquear logros y subir en el ranking\n\n¿Ya exploraste todo lo que tiene la app? 💬`,

  (_s) => `📈 ¿QUERÉS SUBIR EN EL RANKING DE CANCHERO?\n\nEl ranking global premia a los mejores jugadores de la comunidad. Para subir posiciones:\n\n⚽ Jugá partidos y registrá resultados\n🥅 Anotá tus goles y asistencias\n⭐ Ganá el MVP del partido\n🏆 Participá en torneos\n👥 Seguí a otros jugadores y conectate\n\n¿En qué posición estás hoy? 🔝 #Ranking #CancheroApp`,

  (s) => `🟢 JUGADORES DISPONIBLES AHORA\n\nEn este momento hay jugadores en tu zona esperando para jugar. ¿Te falta completar el equipo? ¿Buscás rival?\n\nEntrá a Buscar → Disponibles y encontrá con quién jugar hoy. El fútbol no espera. ⚡\n\n${s.players > 0 ? `+${s.players} jugadores registrados en Uruguay.` : 'La comunidad uruguaya de fútbol más activa.'} 📍 #Disponibles`,

  (_s) => `🔴 EN VIVO EN CANCHERO\n\nSabías que podés transmitir tus partidos en directo desde la app?\n\nCrea tu stream, compartí el link con tus amigos y que vivan el partido como si estuvieran en la cancha. Comentarios, predicciones y reacciones en tiempo real.\n\n¿Vas a jugar este finde? ¡Transmitilo! 📱🎙️ #CancheroLive`,

  (_s) => `🏅 ¿YA DESBLOQUEASTE TUS PRIMEROS LOGROS?\n\nCanchero tiene un sistema de achievements tipo FIFA. Cada meta que alcanzás te da una insignia:\n\n🔔 Primer gol marcado\n⚽ 10 partidos jugados\n🥇 Primer torneo ganado\n👑 100 goles en carrera\n\nEntrá a tu perfil → Logros y mirá cuántos conseguiste. ¿Cuál fue el tuyo? 💬 #Logros #CancheroApp`,
];

function titleHash(title: string): string {
  const s = title.toLowerCase().replace(/[^a-z0-9áéíóúñ]/g,'').slice(0,60);
  let h=0; for(let i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;}
  return 'h'+Math.abs(h).toString(36);
}

Deno.serve(async (_req: Request) => {
  try {
    // 1. Borrar posts viejos
    const cutoff = new Date(Date.now() - EXPIRES_HOURS * 3_600_000).toISOString();
    await sb.from('posts').delete().eq('user_email', BOT_EMAIL).lt('created_at', cutoff);

    // Deduplicacion: hashes de las ultimas 24hs
    const since24h = new Date(Date.now() - 24 * 3_600_000).toISOString();
    const { data: recentPosts } = await sb.from('posts').select('tags').eq('user_email', BOT_EMAIL).gte('created_at', since24h);
    const usedHashes = new Set<string>((recentPosts||[]).flatMap(p=>(Array.isArray(p.tags)?p.tags:[])).filter((t:string)=>t.startsWith('h')));

    // 2. Obtener stats reales de la app
    const stats = await getAppStats();

    // 3. Elegir template no usado recientemente
    const hourSlot = Math.floor(Date.now() / (6 * 3_600_000));
    let content = '';
    let postHash = '';
    // Intentar templates en orden rotado, saltar ya usados
    for (let i = 0; i < TEMPLATES.length; i++) {
      const fn = TEMPLATES[(hourSlot + i) % TEMPLATES.length];
      const c = fn(stats);
      const h = titleHash(c.slice(0, 60));
      if (!usedHashes.has(h)) { content = c; postHash = h; break; }
    }
    if (!content) {
      const fn = TEMPLATES[hourSlot % TEMPLATES.length];
      content = fn(stats);
      postHash = titleHash(content.slice(0,60));
    }

    // 4. Publicar
    const { error } = await sb.from('posts').insert({
      user_email: BOT_EMAIL,
      content,
      tags: [postHash],
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + EXPIRES_HOURS * 3_600_000).toISOString(),
    });
    if (error) throw error;

    await sb.from('bots').update({ last_posted_at: new Date().toISOString() }).eq('email', BOT_EMAIL).catch(()=>{});

    return new Response(
      JSON.stringify({ ok: true, stats, preview: content.slice(0, 80) }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), { status: 500 });
  }
});
