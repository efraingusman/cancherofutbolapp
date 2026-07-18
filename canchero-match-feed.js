/**
 * canchero-match-feed.js — Sección 1: integraciones avanzadas
 * - Contenido automático en el Feed al finalizar un partido:
 *     resultado, MVP, hat-trick, predicciones acertadas.
 * - Resolución de predicciones (marca acertadas y suma cuántos acertaron).
 * - Progresión de complejos (helper) + reseñas (promedio/cantidad/distribución).
 * No toca el feed social: solo INSERTA publicaciones del sistema.
 */
(function(){
'use strict';
const sb = () => window._sb;
function q(builder, fb){ return builder.then(r=>(r&&!r.error?r:{data:fb}),()=>({data:fb})); }

// Publica una entrada del sistema en el feed
async function systemPost(content, mediaUrl){
  if (!sb()) return;
  try {
    await sb().from('posts').insert({
      user_email: 'sistema@canchero', user_name: 'Canchero ⚽', user_role: 'sistema',
      user_avatar: '/logo-oficial.png', content, media_type: mediaUrl?'image':'text',
      media_url: mediaUrl||null, likes_count: 0, is_system: true
    });
  } catch(e){
    // Si la columna is_system no existe, reintentar sin ella
    try { await sb().from('posts').insert({ user_email:'sistema@canchero', user_name:'Canchero ⚽', user_role:'sistema', content, media_type:'text', likes_count:0 }); } catch(_e){}
  }
}

// Genera todo el contenido automático de un partido finalizado
window.generateMatchFeedContent = async function(matchId){
  if (!sb() || !matchId) return;
  // Evitar duplicados
  if (window['_mfDone_'+matchId]) return; window['_mfDone_'+matchId] = true;

  const mR = await q(sb().from('matches').select('*').eq('id',matchId).single(), null);
  const m = mR.data; if (!m) return;
  const home = m.home_club_name||m.team_home_name||m.team_a_name||'Local';
  const away = m.away_club_name||m.team_away_name||m.team_b_name||'Visitante';
  const hs = m.home_score, as = m.away_score;

  // 1) Resultado
  if (hs!=null && as!=null){
    const winner = hs>as?home:as>hs?away:null;
    const txt = winner ? `🏆 ${winner} ganó ${Math.max(hs,as)}-${Math.min(hs,as)}` : `🤝 ${home} ${hs} - ${as} ${away} (empate)`;
    await systemPost(`⚽ Final del partido — ${home} ${hs}-${as} ${away}. ${txt}. #Canchero`);
  }

  // 2) MVP
  if (m.mvp_name) await systemPost(`⭐ ${m.mvp_name} fue el MVP del partido ${home} vs ${away}. ¡Crack! #MVP`);

  // 3) Hat-trick / goleadores (desde match_events)
  const evR = await q(sb().from('match_events').select('*').eq('match_id',matchId).eq('type','goal'), []);
  const goals = evR.data||[];
  const byScorer = {};
  goals.forEach(g=>{ if(g.player_name){ byScorer[g.player_name]=(byScorer[g.player_name]||0)+1; } });
  for (const [name,count] of Object.entries(byScorer)){
    if (count>=3) await systemPost(`🎩 ¡HAT-TRICK de ${name}! ${count} goles en ${home} vs ${away}. 🔥`);
  }

  // 4) Predicciones acertadas
  if (hs!=null && as!=null){
    const prR = await q(sb().from('predictions').select('*').eq('match_id',matchId), []);
    const preds = prR.data||[];
    if (preds.length){
      let exact=0, result=0;
      const realRes = hs>as?'1':as>hs?'2':'X';
      for (const p of preds){
        const pa = p.score_a!=null?p.score_a:p.home_score, pb = p.score_b!=null?p.score_b:p.away_score;
        const pr = (pa>pb)?'1':(pb>pa)?'2':'X';
        let pts=0;
        if (pa===hs && pb===as){ exact++; pts=3; }
        else if (pr===realRes){ result++; pts=1; }
        if (pts){ try{ await sb().from('predictions').update({ points:pts, correct:true }).eq('match_id',matchId).eq('user_email',p.user_email); }catch(e){} }
      }
      const acertaron = exact+result;
      if (acertaron>0) await systemPost(`🎯 ${acertaron} usuario${acertaron!==1?'s':''} acertó el resultado de ${home} vs ${away}${exact>0?` (${exact} clavó el marcador exacto)`:''}. #Predicciones`);
    }
  }

  // 5) Fotos / momentos del partido
  const mediaR = await q(sb().from('match_media').select('id').eq('match_id',matchId), []);
  const nMedia = (mediaR.data||[]).length;
  if (nMedia>=3) await systemPost(`📸 Se subieron ${nMedia} momentos del partido ${home} vs ${away}. Mirá el resumen en la ficha. #Momentos`);

  if (window.showToast) showToast('Resumen del partido publicado en el feed ✓','success');
  try { if (typeof loadMainFeed==='function') loadMainFeed(); } catch(e){}
};

// Envolver la finalización del partido para disparar el contenido automático
function wrapFinish(){
  if (!window.MatchDashboard) return false;
  if (window.MatchDashboard._savePostMatch && !window.MatchDashboard._savePostMatch._wrapped){
    const orig = window.MatchDashboard._savePostMatch;
    window.MatchDashboard._savePostMatch = async function(matchId){
      const r = await orig.apply(this, arguments);
      setTimeout(()=>window.generateMatchFeedContent(matchId), 600);
      return r;
    };
    window.MatchDashboard._savePostMatch._wrapped = true;
    return true;
  }
  return false;
}
let _tries=0; const _iv = setInterval(()=>{ if (wrapFinish() || ++_tries>20) clearInterval(_iv); }, 500);

/* ── Helpers para la ficha (progresión de complejos + reseñas) ── */
// Progreso del complejo: cuántos partidos se jugaron en esa cancha
window.getComplexProgress = async function(venue, goal){
  goal = goal || 15;
  if (!sb() || !venue) return null;
  const r = await q(sb().from('matches').select('id').or(`venue.ilike.%${venue}%,complex_name.ilike.%${venue}%`).eq('status','finalizado'), []);
  const played = (r.data||[]).length;
  return { played, goal, pct: Math.min(100, Math.round(played/goal*100)), reward: played>=goal };
};

// Resumen de reseñas: promedio, cantidad, distribución 1-5
window.getMatchReviewsSummary = async function(matchId){
  if (!sb() || !matchId) return null;
  const r = await q(sb().from('match_reviews').select('rating').eq('match_id',matchId), []);
  const rows = r.data||[];
  const dist = [0,0,0,0,0];
  let sum=0;
  rows.forEach(x=>{ const v=Math.min(5,Math.max(1,x.rating||0)); if(v){ dist[v-1]++; sum+=v; } });
  return { count: rows.length, avg: rows.length? (sum/rows.length).toFixed(1):'0.0', dist };
};

console.log('[canchero-match-feed] ✅ Contenido automático de partidos cargado');
})();
