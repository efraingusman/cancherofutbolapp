/**
 * canchero-analytics.js — Tracking de uso (estilo Meta, liviano)
 * Registra eventos (vistas de sección, clicks clave) en la tabla analytics_events.
 * Batch + fire-and-forget para no afectar la experiencia ni el egress (los writes no cuentan egress).
 * API: window.CancheroTrack.event(name, props)
 */
window.CancheroTrack = (function(){
  'use strict';
  function sb(){ return window._sb || null; }
  function me(){ return window.userData || null; }
  let queue = [];
  let timer = null;

  function event(name, props){
    try {
      const u = me();
      queue.push({
        user_email: u ? u.email : null,
        role: u ? (u.role||'jugador') : 'anon',
        country: u ? (u.nat || u.country || null) : null,
        city: u ? (u.city || null) : null,
        event: name,
        props: props || null,
        created_at: new Date().toISOString()
      });
      if (queue.length >= 10) flush();
      else schedule();
    } catch(e){}
  }
  function schedule(){ if (timer) return; timer = setTimeout(flush, 15000); }
  async function flush(){
    timer = null;
    if (!queue.length) return;
    const client = sb(); if (!client) { queue = []; return; }
    const batch = queue.splice(0, queue.length);
    try { await client.from('analytics_events').insert(batch); } catch(e){ /* tabla puede no existir: ignorar */ }
  }
  // Flush al cerrar/ocultar
  try {
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'hidden') flush(); });
  } catch(e){}

  // Auto-track de vistas de sección (hook a switchDashboardTab)
  function _hookSections(){
    if (typeof window.switchDashboardTab === 'function' && !window.switchDashboardTab._tracked){
      const orig = window.switchDashboardTab;
      window.switchDashboardTab = function(role, tab){ try{ event('section_view', { section: tab, role: role }); }catch(e){} return orig.apply(this, arguments); };
      window.switchDashboardTab._tracked = true;
    }
  }
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(_hookSections, 1500); });
  setTimeout(_hookSections, 3000);

  return { event, flush };
})();
console.log('[canchero-analytics] ✅ tracking de uso');
