/**
 * canchero-gamification.js — XP, nivel y racha honesta (participación real)
 * Aditivo y a prueba de fallos: si falta la columna xp/level en DB, no rompe nada.
 * API:
 *   CancheroXP.add(amount, reason)      → suma XP al usuario actual (+ animación)
 *   CancheroXP.levelOf(xp)              → nivel a partir de XP
 *   CancheroXP.bumpStreak()             → suma racha por participación (1×/día)
 *   CancheroXP.badgeHtml(level)         → chip de nivel para feed/perfil
 * Curva de nivel: 100 XP * nivel (acumulativo suave).
 */
window.CancheroXP = (function(){
  'use strict';
  function sb(){ return window._sb || null; }
  function me(){ return window.userData || null; }

  // XP necesaria para alcanzar un nivel (acumulado): nivel n requiere 50*n*(n-1)
  function levelOf(xp){ xp = xp||0; let lvl=1; while (50*lvl*(lvl+1) <= xp) lvl++; return lvl; }
  function xpForNext(xp){ const l=levelOf(xp); return 50*l*(l+1); }

  const XP_TABLE = {
    organizar_partido: 50,
    jugar_partido: 30,
    unirse_partido: 20,
    subir_momento: 15,
    publicar_post: 10,
    votar: 5,
    debate_arg: 8,
    recibir_mvp: 40,
    invitar: 25,
  };

  async function add(amountOrReason, maybeReason){
    const m = me(); const client = sb();
    if (!m || !client) return;
    let amount = amountOrReason, reason = maybeReason;
    if (typeof amountOrReason === 'string'){ reason = amountOrReason; amount = XP_TABLE[amountOrReason] || 5; }
    amount = amount || 5;
    try {
      // Leer xp actual (si la columna no existe, el catch evita romper)
      const { data, error } = await client.from('users').select('xp,level').eq('email', m.email).maybeSingle();
      if (error) return;
      const curXp = (data && data.xp) || 0;
      const newXp = curXp + amount;
      const oldLvl = levelOf(curXp), newLvl = levelOf(newXp);
      await client.from('users').update({ xp: newXp, level: newLvl }).eq('email', m.email);
      if (window.userData){ window.userData.xp = newXp; window.userData.level = newLvl; }
      _xpAnim(amount, newLvl > oldLvl ? newLvl : null);
    } catch(e){ /* columna inexistente u otro: ignorar */ }
  }

  async function bumpStreak(){
    const m = me(); const client = sb();
    if (!m || !client) return;
    try {
      const { data, error } = await client.from('users').select('streak,streak_best,last_active').eq('email', m.email).maybeSingle();
      if (error) return;
      const today = new Date().toISOString().slice(0,10);
      const last = data && data.last_active;
      if (last === today) return; // ya contó hoy
      let streak = (data && data.streak) || 0;
      const y = new Date(Date.now()-86400000).toISOString().slice(0,10);
      streak = (last === y) ? streak + 1 : 1; // sigue si jugó ayer; si no, reinicia (con gracia)
      const best = Math.max((data && data.streak_best) || 0, streak);
      await client.from('users').update({ streak, streak_best: best, last_active: today }).eq('email', m.email);
      if (window.userData){ window.userData.streak = streak; window.userData.streak_best = best; }
    } catch(e){}
  }

  function badgeHtml(level){
    level = level || 1;
    return `<span title="Nivel ${level}" style="display:inline-flex;align-items:center;gap:3px;background:rgba(186,255,0,0.12);border:1px solid rgba(186,255,0,0.35);color:var(--accent);border-radius:8px;padding:1px 6px;font-size:9px;font-weight:900;letter-spacing:.3px;"><i class='bx bxs-zap'></i> Nv ${level}</span>`;
  }

  function _xpAnim(amount, newLevel){
    try {
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;left:50%;bottom:120px;transform:translateX(-50%);z-index:200000;background:rgba(10,10,10,0.92);border:1px solid var(--accent);color:var(--accent);border-radius:22px;padding:8px 16px;font-weight:900;font-size:14px;box-shadow:0 6px 24px rgba(0,0,0,0.5);pointer-events:none;opacity:0;transition:opacity .25s, transform .5s;';
      el.innerHTML = `<i class='bx bxs-zap'></i> +${amount} XP` + (newLevel?` · ¡Nivel ${newLevel}!`:'');
      document.body.appendChild(el);
      requestAnimationFrame(()=>{ el.style.opacity='1'; el.style.transform='translateX(-50%) translateY(-14px)'; });
      setTimeout(()=>{ el.style.opacity='0'; setTimeout(()=>el.remove(), 300); }, 1600);
    } catch(e){}
  }

  return { add, bumpStreak, levelOf, xpForNext, badgeHtml };
})();
console.log('[canchero-gamification] ✅ XP/nivel/racha');
