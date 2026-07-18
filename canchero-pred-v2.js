/**
 * canchero-pred-v2.js — Predicciones: lógica de puntos + ranking de aciertos
 * Puntos: 3 = marcador exacto · 1 = acertás el resultado (1/X/2) · 0 = fallaste.
 * Ranking para competir (Todos / Amigos). "Mis predicciones" con aciertos.
 * Usa la tabla `predictions` (score_a/score_b) + el resultado real del partido.
 */
(function(){
'use strict';
const sb = () => window._sb;
const me = () => window.userData;

function _calcPts(pa, pb, ha, hb){
  if (pa==null||pb==null||ha==null||hb==null) return null; // pendiente
  if (pa===ha && pb===hb) return 3;
  const pr = pa>pb?'1':pa<pb?'2':'X';
  const rr = ha>hb?'1':ha<hb?'2':'X';
  return pr===rr ? 1 : 0;
}

// Carga predicciones + resultados y calcula puntos
async function _loadPredData(){
  const r = await sb().from('predictions').select('*').limit(800).then(x=>x,()=>({data:[]}));
  const preds = (r&&r.data)||[];
  const ids = [...new Set(preds.map(p=>p.match_id).filter(Boolean))];
  let mById={};
  if (ids.length){
    const mr = await sb().from('matches').select('id,home_score,away_score,status,scheduled_at,name,home_club_name,away_club_name,team_a_name,team_b_name').in('id',ids).then(x=>x,()=>({data:[]}));
    ((mr&&mr.data)||[]).forEach(m=>mById[m.id]=m);
  }
  preds.forEach(p=>{
    const m=mById[p.match_id]||{};
    const pa=p.score_a!=null?p.score_a:p.home_score, pb=p.score_b!=null?p.score_b:p.away_score;
    p._pts=_calcPts(pa,pb,m.home_score,m.away_score);
    p._m=m;
  });
  return preds;
}

window._openPredRanking = async function(tab){
  tab = tab || 'ranking';
  let modal=document.getElementById('pred-ranking'); if(modal)modal.remove();
  modal=document.createElement('div'); modal.id='pred-ranking';
  modal.style.cssText='position:fixed;inset:0;z-index:30050;background:var(--bg-main,#070907);display:flex;flex-direction:column;';
  modal.innerHTML='<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#555;"><i class="bx bx-loader-alt bx-spin" style="font-size:30px;"></i></div>';
  document.body.appendChild(modal);
  ['player-bottom-nav','club-bottom-nav'].forEach(n=>document.getElementById(n)?.style.setProperty('display','none','important'));
  window._predData = await _loadPredData();
  window._predTab = tab; window._predScope='todos';
  _renderPredRanking();
};
window._closePredRanking = function(){ const m=document.getElementById('pred-ranking'); if(m)m.remove(); ['player-bottom-nav','club-bottom-nav'].forEach(n=>document.getElementById(n)?.style.removeProperty('display')); };

function _renderPredRanking(){
  const modal=document.getElementById('pred-ranking'); if(!modal) return;
  const tab=window._predTab;
  modal.innerHTML=`
    <div style="flex:0 0 auto;background:var(--bg-main,#070907);border-bottom:1px solid #1a1f12;padding:max(8px,env(safe-area-inset-top)) 14px 0;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <button onclick="window._closePredRanking()" style="background:rgba(255,255,255,0.06);border:1px solid #2a2a2a;border-radius:50%;width:36px;height:36px;color:#fff;font-size:18px;cursor:pointer;"><i class='bx bx-arrow-back'></i></button>
        <div style="font-size:16px;font-weight:900;color:var(--accent);flex:1;"><i class='bx bx-trophy'></i> Predicciones</div>
      </div>
      <div style="display:flex;gap:4px;">
        <button onclick="window._predSetTab('ranking')" style="flex:1;padding:10px;background:none;border:none;border-bottom:2px solid ${tab==='ranking'?'var(--accent)':'transparent'};color:${tab==='ranking'?'var(--accent)':'#888'};font-weight:800;font-size:13px;cursor:pointer;">RANKING</button>
        <button onclick="window._predSetTab('mis')" style="flex:1;padding:10px;background:none;border:none;border-bottom:2px solid ${tab==='mis'?'var(--accent)':'transparent'};color:${tab==='mis'?'var(--accent)':'#888'};font-weight:800;font-size:13px;cursor:pointer;">MIS PREDICCIONES</button>
      </div>
    </div>
    <div id="pred-rk-body" style="flex:1 1 auto;min-height:0;overflow-y:auto;padding:14px;">${tab==='ranking'?_predRankingBody():_predMisBody()}</div>`;
}
window._predSetTab=function(t){ window._predTab=t; _renderPredRanking(); };
window._predSetScope=function(s){ window._predScope=s; _renderPredRanking(); };

function _predRankingBody(){
  const preds=window._predData||[];
  // agregar por usuario
  const byUser={};
  preds.forEach(p=>{ if(p._pts==null)return; const u=byUser[p.user_email]=byUser[p.user_email]||{name:p.user_name||p.user_email,email:p.user_email,pts:0,n:0,ac:0}; u.pts+=p._pts; u.n++; if(p._pts>0)u.ac++; });
  let list=Object.values(byUser).sort((a,b)=>b.pts-a.pts);
  // scope amigos
  const scope=window._predScope||'todos';
  const follows=window._myFollowing||[];
  if (scope==='amigos' && me()) list=list.filter(u=>u.email===me().email || follows.includes(u.email));
  const explainer=`<div style="background:#0d120d;border:1px solid #1f2a14;border-radius:12px;padding:12px;margin-bottom:12px;font-size:12px;color:#aaa;line-height:1.5;"><b style="color:var(--accent);">¿Cómo se ganan puntos?</b><br>🎯 <b style="color:#fff;">3 pts</b> si clavás el marcador exacto · ✅ <b style="color:#fff;">1 pt</b> si acertás el resultado (gana/empate) · 0 si fallás. ¡Competí por el podio!</div>`;
  const toggle=`<div style="display:flex;gap:8px;margin-bottom:12px;"><button onclick="window._predSetScope('todos')" style="flex:1;padding:8px;border-radius:10px;border:1px solid ${scope==='todos'?'var(--accent)':'#2a2a2a'};background:${scope==='todos'?'rgba(186,255,0,0.1)':'transparent'};color:${scope==='todos'?'var(--accent)':'#888'};font-weight:800;font-size:12px;cursor:pointer;">TODOS</button><button onclick="window._predSetScope('amigos')" style="flex:1;padding:8px;border-radius:10px;border:1px solid ${scope==='amigos'?'var(--accent)':'#2a2a2a'};background:${scope==='amigos'?'rgba(186,255,0,0.1)':'transparent'};color:${scope==='amigos'?'var(--accent)':'#888'};font-weight:800;font-size:12px;cursor:pointer;">AMIGOS</button></div>`;
  if(!list.length) return explainer+toggle+`<div style="text-align:center;padding:40px;color:#555;"><i class='bx bx-trophy' style="font-size:44px;opacity:.4;display:block;margin-bottom:10px;"></i>Todavía no hay predicciones resueltas.<br><span style="font-size:12px;">Predecí partidos y cuando terminen sumás puntos.</span></div>`;
  return explainer+toggle+list.map((u,i)=>{
    const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':`<span style="color:#666;font-weight:800;">${i+1}</span>`;
    const mine=me()&&u.email===me().email;
    return `<div style="display:flex;align-items:center;gap:12px;padding:11px 12px;border-bottom:1px solid #161616;${mine?'background:rgba(186,255,0,0.06);border-radius:10px;':''}">
      <div style="width:28px;text-align:center;font-size:18px;">${medal}</div>
      <div style="flex:1;min-width:0;"><div style="font-weight:700;font-size:14px;color:${mine?'var(--accent)':'#fff'};">${u.name}${mine?' (vos)':''}</div><div style="font-size:11px;color:#666;">${u.ac}/${u.n} aciertos · ${u.n?Math.round(u.ac/u.n*100):0}%</div></div>
      <div style="font-weight:900;font-size:17px;color:var(--accent);">${u.pts}<span style="font-size:10px;color:#666;"> pts</span></div>
    </div>`;
  }).join('');
}

function _predMisBody(){
  const preds=(window._predData||[]).filter(p=>p.user_email===me()?.email).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  const tot=preds.reduce((s,p)=>s+(p._pts||0),0);
  const resolved=preds.filter(p=>p._pts!=null);
  const ac=resolved.filter(p=>p._pts>0).length;
  const head=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">
    <div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:900;color:var(--accent);">${tot}</div><div style="font-size:10px;color:#888;">PUNTOS</div></div>
    <div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:900;color:#fff;">${ac}</div><div style="font-size:10px;color:#888;">ACIERTOS</div></div>
    <div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:900;color:#fff;">${resolved.length?Math.round(ac/resolved.length*100):0}%</div><div style="font-size:10px;color:#888;">EFECTIVIDAD</div></div>
  </div>`;
  if(!preds.length) return head+`<div style="text-align:center;padding:30px;color:#555;">Todavía no hiciste predicciones.<br><span style="font-size:12px;">Andá a un partido y predecí el marcador.</span></div>`;
  return head+preds.map(p=>{
    const m=p._m||{}; const home=m.home_club_name||m.team_a_name||'Local', away=m.away_club_name||m.team_b_name||'Visita';
    const pa=p.score_a!=null?p.score_a:p.home_score, pb=p.score_b!=null?p.score_b:p.away_score;
    const status=p._pts==null?`<span style="color:#888;font-size:11px;">Pendiente</span>`:p._pts>0?`<span style="color:#00e676;font-size:11px;font-weight:800;">✓ +${p._pts} pts</span>`:`<span style="color:#ff4444;font-size:11px;font-weight:800;">✗ Falló</span>`;
    const real=(m.home_score!=null)?` · Real: ${m.home_score}-${m.away_score}`:'';
    return `<div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:12px;margin-bottom:8px;">
      <div style="display:flex;align-items:center;justify-content:space-between;"><div style="font-size:13px;color:#fff;font-weight:700;">${home} <span style="color:var(--accent);">${pa}-${pb}</span> ${away}</div>${status}</div>
      <div style="font-size:10px;color:#666;margin-top:3px;">${m.name||'Partido'}${real}</div>
    </div>`;
  }).join('');
}

// Inyectar botón "Ranking de aciertos" en la sección de predicciones (mundo-futbol)
function injectBtn(){
  const panel=document.getElementById('mc-panel-predicciones');
  if(!panel || document.getElementById('pred-ranking-btn')) return;
  const list=document.getElementById('mc-pred-list');
  if(!list) return;
  const btn=document.createElement('button');
  btn.id='pred-ranking-btn';
  btn.onclick=()=>window._openPredRanking('ranking');
  btn.style.cssText='width:100%;background:linear-gradient(135deg,rgba(186,255,0,0.12),rgba(186,255,0,0.04));color:var(--accent);border:1px solid rgba(186,255,0,0.3);border-radius:12px;padding:12px;font-weight:800;font-size:13px;cursor:pointer;margin-bottom:12px;display:flex;align-items:center;justify-content:center;gap:8px;';
  btn.innerHTML="<i class='bx bx-trophy'></i> RANKING DE ACIERTOS · COMPETÍ CON TUS AMIGOS";
  list.parentElement.insertBefore(btn, list);
}
// cargar lista de seguidos para el scope amigos
async function loadFollowing(){
  if(!me()||window._myFollowing) return;
  try{ const r=await sb().from('follows').select('following_email').eq('follower_email',me().email).limit(200); window._myFollowing=((r&&r.data)||[]).map(x=>x.following_email); }catch(e){ window._myFollowing=[]; }
}
const _obs=new MutationObserver(()=>{ injectBtn(); });
try{ _obs.observe(document.body,{childList:true,subtree:true}); }catch(e){}
setInterval(injectBtn, 2000);
setTimeout(loadFollowing, 1500);

console.log('[canchero-pred-v2] ✅ Ranking de predicciones cargado');
})();
