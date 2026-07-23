/**
 * canchero-rating.js — Valoración del jugador y balance de equipos
 *
 * La valoración se GANA jugando (partidos, goles, asistencias, MVP) y NUNCA baja.
 * La fórmula y el porqué de cada peso están en docs/rating-system.md.
 *
 * No rompe nada de lo que ya existe: si un jugador no tiene estadísticas, sigue
 * en 50, que es exactamente lo que se mostraba antes.
 */
(function(){
'use strict';

const BASE = 50;
const TECHO = 99;
const PESOS = { partidos: 1, goles: 1.5, asistencias: 1, mvp: 3 };

const NIVELES = [
  { id:'principiante', label:'Principiante', min:50, max:59, color:'#7aa2ff' },
  { id:'intermedio',   label:'Intermedio',   min:60, max:74, color:'#00c8ff' },
  { id:'avanzado',     label:'Avanzado',     min:75, max:89, color:'#baff00' },
  { id:'crack',        label:'Crack',        min:90, max:99, color:'#ffd23f' },
];

const R = {};
R.NIVELES = NIVELES;
R.BASE = BASE;

// stats acepta las dos convenciones que conviven en la app (goals/goles, etc.)
function _num(v){ const n = parseInt(v); return isNaN(n) ? 0 : Math.max(0, n); }
function _leer(stats){
  const s = stats || {};
  return {
    partidos:     _num(s.matches != null ? s.matches : s.partidos),
    goles:        _num(s.goals   != null ? s.goals   : s.goles),
    asistencias:  _num(s.assists != null ? s.assists : s.asistencias),
    mvp:          _num(s.mvp     != null ? s.mvp     : s.mvps),
  };
}

R.calcular = function(stats){
  const s = _leer(stats);
  const puntos = s.partidos * PESOS.partidos
               + s.goles * PESOS.goles
               + s.asistencias * PESOS.asistencias
               + s.mvp * PESOS.mvp;
  return Math.min(TECHO, BASE + Math.round(puntos));
};

R.nivel = function(valoracion){
  const v = _num(valoracion) || BASE;
  return NIVELES.find(n => v >= n.min && v <= n.max) || NIVELES[0];
};

// Chip de nivel, para las tarjetas de partido y los listados de jugadores.
R.chipNivel = function(valoracion){
  const n = R.nivel(valoracion);
  return `<span style="display:inline-flex;align-items:center;gap:4px;background:${n.color}1a;
    border:1px solid ${n.color}55;color:${n.color};border-radius:7px;padding:2px 8px;
    font-size:10px;font-weight:800;white-space:nowrap;">${n.label}</span>`;
};

/**
 * Recalcula la valoración de un usuario y la guarda SOLO si subió.
 * Se llama después de cargar goles, asistencias o MVP. Es idempotente.
 */
R.sincronizar = async function(email){
  try {
    const sb = window._sb || window.supabaseClient;
    const em = (email||'').toLowerCase().trim();
    if (!sb || !em) return null;
    const { data: u } = await sb.from('users').select('stats').eq('email', em).maybeSingle();
    if (!u) return null;
    const stats = (u.stats && typeof u.stats === 'object') ? u.stats : {};
    const nueva = R.calcular(stats);
    const actual = _num(stats.rating) || BASE;
    // NUNCA baja: si el calculo diera menos, se queda como esta.
    if (nueva <= actual) return actual;
    const merged = Object.assign({}, stats, { rating: nueva });
    await sb.from('users').update({ stats: merged }).eq('email', em);
    // Reflejarlo en la sesion abierta para que se vea sin recargar.
    try {
      if (window.userData && (window.userData.email||'').toLowerCase() === em) {
        window.userData.stats = merged;
        localStorage.setItem('canchero_user', JSON.stringify(window.userData));
        const el = document.getElementById('p-rating-value');
        if (el) el.innerText = nueva;
      }
    } catch(e){}
    return nueva;
  } catch(e){ console.warn('[rating] sincronizar:', e && e.message); return null; }
};

/**
 * Reparte jugadores en dos equipos parejos.
 * Serpiente por valoracion: el mejor a A, el 2do y 3ro a B, el 4to y 5to a A...
 * Devuelve { a, b, promedioA, promedioB, diferencia }.
 */
R.balancear = function(jugadores){
  const lista = (jugadores||[]).map(p => ({
    ref: p,
    val: _num(p.rating != null ? p.rating : (p.stats && p.stats.rating)) || BASE
  })).sort((x,y) => y.val - x.val);

  const a = [], b = [];
  let sa = 0, sb2 = 0;
  lista.forEach((p, i) => {
    // Patron serpiente: A, B, B, A, A, B, B, A...
    const vaEnA = (Math.floor(i / 2) % 2 === 0) ? (i % 2 === 0) : (i % 2 === 1);
    if (vaEnA) { a.push(p.ref); sa += p.val; } else { b.push(p.ref); sb2 += p.val; }
  });
  const pa = a.length ? Math.round(sa / a.length) : 0;
  const pb = b.length ? Math.round(sb2 / b.length) : 0;
  return { a, b, promedioA: pa, promedioB: pb, diferencia: Math.abs(pa - pb) };
};

window.CancheroRating = R;
console.log('[canchero-rating] listo');
})();
