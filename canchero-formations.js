/**
 * canchero-formations.js — Motor de formaciones y posiciones
 * - Catálogo de formaciones válidas por formato (F5 / F7 / F11), confirmadas.
 * - Normalización de posición natural del jugador → línea (ARQ/DEF/MED/DEL).
 * - Asignación por posición natural: un DC nunca cae de arquero ni de
 *   defensa por defecto; el GK solo va al arco.
 * - Validación de cupos exactos (titulares según formato + máx 3 suplentes).
 */
(function(){
'use strict';

/* Línea natural a partir de la posición declarada del jugador */
var LINE_MAP = {
  // Arqueros
  'ARQ':'ARQ','GK':'ARQ','POR':'ARQ','PORTERO':'ARQ','ARQUERO':'ARQ','GOLERO':'ARQ',
  // Defensas
  'DEF':'DEF','DFC':'DEF','LD':'DEF','LI':'DEF','LTD':'DEF','LTI':'DEF','CB':'DEF','LB':'DEF','RB':'DEF','ZAG':'DEF','DEFENSA':'DEF','LATERAL':'DEF','ZAGUERO':'DEF',
  // Mediocampistas
  'MED':'MED','MC':'MED','MCD':'MED','MCO':'MED','MD':'MED','MI':'MED','VOL':'MED','CM':'MED','CDM':'MED','CAM':'MED','VOLANTE':'MED','MEDIO':'MED','MEDIOCAMPISTA':'MED',
  // Delanteros
  'DEL':'DEL','DC':'DEL','SD':'DEL','ED':'DEL','EI':'DEL','EXT':'DEL','ST':'DEL','CF':'DEL','LW':'DEL','RW':'DEL','DELANTERO':'DEL','EXTREMO':'DEL','PUNTA':'DEL','9':'DEL'
};
function lineOf(pos){
  var p = String(pos||'').toUpperCase().trim();
  if (LINE_MAP[p]) return LINE_MAP[p];
  // prefijos comunes ("DEL IZQ", "DEF CENTRAL"…)
  for (var k in LINE_MAP){ if (k.length>=2 && p.indexOf(k)===0) return LINE_MAP[k]; }
  return 'MED'; // neutro si no se sabe
}

/* Catálogo: cada slot = { k: línea, label, x, y } (x,y en % de la cancha,
   y=0 arriba (arco rival), y=100 abajo (arco propio)) */
var CATALOG = {
  '5v5': {
    '1-1-2-1': [ {k:'ARQ',x:50,y:88},{k:'DEF',x:50,y:66},{k:'MED',x:28,y:44},{k:'MED',x:72,y:44},{k:'DEL',x:50,y:20} ],
    '1-2-1-1': [ {k:'ARQ',x:50,y:88},{k:'DEF',x:32,y:66},{k:'DEF',x:68,y:66},{k:'MED',x:50,y:44},{k:'DEL',x:50,y:20} ]
  },
  '7v7': {
    '1-2-3-1': [ {k:'ARQ',x:50,y:90},{k:'DEF',x:32,y:70},{k:'DEF',x:68,y:70},{k:'MED',x:24,y:46},{k:'MED',x:50,y:50},{k:'MED',x:76,y:46},{k:'DEL',x:50,y:20} ],
    '1-3-2-1': [ {k:'ARQ',x:50,y:90},{k:'DEF',x:22,y:70},{k:'DEF',x:50,y:74},{k:'DEF',x:78,y:70},{k:'MED',x:34,y:46},{k:'MED',x:66,y:46},{k:'DEL',x:50,y:20} ],
    '1-3-1-2': [ {k:'ARQ',x:50,y:90},{k:'DEF',x:22,y:70},{k:'DEF',x:50,y:74},{k:'DEF',x:78,y:70},{k:'MED',x:50,y:48},{k:'DEL',x:34,y:22},{k:'DEL',x:66,y:22} ]
  },
  '11v11': {
    '1-4-3-3': [ {k:'ARQ',x:50,y:91},{k:'DEF',x:16,y:72},{k:'DEF',x:38,y:75},{k:'DEF',x:62,y:75},{k:'DEF',x:84,y:72},
                 {k:'MED',x:28,y:50},{k:'MED',x:50,y:53},{k:'MED',x:72,y:50},{k:'DEL',x:24,y:25},{k:'DEL',x:50,y:19},{k:'DEL',x:76,y:25} ],
    '1-4-4-2': [ {k:'ARQ',x:50,y:91},{k:'DEF',x:16,y:72},{k:'DEF',x:38,y:75},{k:'DEF',x:62,y:75},{k:'DEF',x:84,y:72},
                 {k:'MED',x:16,y:48},{k:'MED',x:39,y:52},{k:'MED',x:61,y:52},{k:'MED',x:84,y:48},{k:'DEL',x:36,y:22},{k:'DEL',x:64,y:22} ],
    '1-3-5-2': [ {k:'ARQ',x:50,y:91},{k:'DEF',x:26,y:74},{k:'DEF',x:50,y:77},{k:'DEF',x:74,y:74},
                 {k:'MED',x:12,y:48},{k:'MED',x:32,y:53},{k:'MED',x:50,y:56},{k:'MED',x:68,y:53},{k:'MED',x:88,y:48},{k:'DEL',x:36,y:22},{k:'DEL',x:64,y:22} ],
    '1-5-3-2': [ {k:'ARQ',x:50,y:91},{k:'DEF',x:12,y:70},{k:'DEF',x:31,y:74},{k:'DEF',x:50,y:77},{k:'DEF',x:69,y:74},{k:'DEF',x:88,y:70},
                 {k:'MED',x:30,y:50},{k:'MED',x:50,y:54},{k:'MED',x:70,y:50},{k:'DEL',x:36,y:22},{k:'DEL',x:64,y:22} ]
  }
};
var DEFAULTS = { '5v5':'1-1-2-1', '7v7':'1-2-3-1', '11v11':'1-4-3-3' };
var MAX_SUBS = 3;

/* Deriva el formato real de un PARTIDO completo (no solo de un string):
   mira format, match_type, modality, name y, si no, slots_total (10/14/22). */
function formatOf(m){
  if (!m) return '11v11';
  if (typeof m === 'string') return normFormat(m);
  var f = ((m.format||'')+' '+(m.match_type||'')+' '+(m.modality||'')+' '+(m.name||'')).toLowerCase();
  if (/5v5|f5|futbol 5|fútbol 5/.test(f)) return '5v5';
  if (/7v7|f7|futbol 7|fútbol 7/.test(f)) return '7v7';
  if (/11v11|f11|futbol 11|fútbol 11|11/.test(f)) return '11v11';
  if (m.slots_total === 10) return '5v5';
  if (m.slots_total === 14) return '7v7';
  return '11v11';
}

function normFormat(f){
  var s = String(f||'').toLowerCase();
  if (s.indexOf('5')!==-1) return '5v5';
  if (s.indexOf('7')!==-1) return '7v7';
  return '11v11';
}
function formationsFor(format){ return Object.keys(CATALOG[normFormat(format)]); }
function slotsFor(format, formation){
  var fmt = normFormat(format);
  var f = (formation && CATALOG[fmt][formation]) ? formation : DEFAULTS[fmt];
  return CATALOG[fmt][f].map(function(s,i){ return { k:s.k, x:s.x, y:s.y, idx:i }; });
}
function capacity(format){ return slotsFor(format).length; }

/* Orden de fallback por línea: jugador de campo NUNCA cae al arco,
   y el arquero SOLO va al arco. */
var FALLBACK = {
  'ARQ': ['ARQ','DEF'],          // arquero: arco; si está tomado, defensa
  'DEF': ['DEF','MED','DEL'],
  'MED': ['MED','DEL','DEF'],
  'DEL': ['DEL','MED','DEF']
};

/**
 * assign(players, slots) → array paralelo a slots con el jugador o null.
 * Prioridad: 1) position_slot exacto ("DEF3"), 2) línea natural,
 * 3) línea de fallback (sin ARQ para jugadores de campo).
 */
function assign(players, slots){
  var res = slots.map(function(){ return null; });
  var used = {};
  var list = (players||[]).slice();

  function naturalLine(p){ return lineOf(p.position_slot || p.position || p.pos); }

  // Pase 1: slot exacto (position_slot tipo "DEF3" o índice)
  list.forEach(function(p){
    if (used[p.id]) return;
    var ps = String(p.position_slot||'');
    var m = ps.match(/^([A-Z]+)(\d+)$/);
    if (m){
      var i = parseInt(m[2],10);
      if (slots[i] && !res[i] && slots[i].k===m[1]){ res[i]=p; used[p.id]=1; }
    }
  });
  // Pase 2 y 3: línea natural y fallback
  [0,1].forEach(function(pass){
    list.forEach(function(p){
      if (used[p.id]) return;
      var ln = naturalLine(p);
      var order = FALLBACK[ln] || ['MED','DEL','DEF'];
      var tries = pass===0 ? [order[0]] : order.slice(1);
      for (var t=0;t<tries.length;t++){
        for (var i=0;i<slots.length;i++){
          if (!res[i] && slots[i].k===tries[t]){ res[i]=p; used[p.id]=1; return; }
        }
      }
    });
  });
  return res;
}

/* Validación de cupos: titulares exactos según formato + máx 3 suplentes */
function validate(format, players){
  var cap = capacity(format);
  var starters = (players||[]).filter(function(p){ return !p.is_sub; }).length;
  var subs = (players||[]).filter(function(p){ return p.is_sub; }).length;
  return {
    capacity: cap, starters: starters, subs: subs, maxSubs: MAX_SUBS,
    startersFull: starters >= cap,
    subsFull: subs >= MAX_SUBS,
    full: starters >= cap && subs >= MAX_SUBS,
    canJoinStarter: starters < cap,
    canJoinSub: subs < MAX_SUBS
  };
}

window.CancheroFormations = {
  lineOf: lineOf,
  formatOf: formatOf,
  normFormat: normFormat,
  formationsFor: formationsFor,
  slotsFor: slotsFor,
  capacity: capacity,
  defaultFormation: function(f){ return DEFAULTS[normFormat(f)]; },
  assign: assign,
  validate: validate,
  MAX_SUBS: MAX_SUBS
};
console.log('[canchero-formations] ✅ cargado');
})();
