/**
 * canchero-truco.js — TRUCO URUGUAYO jugable contra la IA.
 *
 * Partida completa: mano de 3 cartas, envido y truco con todos sus escalones,
 * tres bazas por mano, y se juega a 15 (buenas y malas) o a 30.
 *
 * Reglas implementadas (truco uruguayo / rioplatense):
 *  - Mazo español de 40 (sin 8, 9 ni comodines).
 *  - Jerarquía: 1 espada > 1 basto > 7 espada > 7 oro > 3 > 2 > 1 (falsos) >
 *    12 > 11 > 10 > 7 (falsos) > 6 > 5 > 4.
 *  - Envido: 20 + las dos cartas más altas del mismo palo (figuras valen 0);
 *    sin dos del mismo palo, la carta más alta suelta.
 *  - Cantos de envido: Envido (2), Envido-Envido (4), Real Envido (3),
 *    Falta Envido (lo que falta al ganador para las buenas).
 *  - Truco (2) → Retruco (3) → Vale Cuatro (4). No querer paga el anterior.
 *  - Parda (empate de baza) resuelta como manda el juego: la primera parda la
 *    gana quien gane la siguiente; parda-parda-parda gana el mano.
 *
 * Se abre con window._trucoAbrir(). Es autónomo: no depende del modo carrera.
 */
(function(){
'use strict';
const A = '#baff00';
function esc(s){ return window.escH ? window.escH(s) : String(s==null?'':s); }
function ri(a,b){ return a + Math.floor(Math.random()*(b-a+1)); }
function shuffle(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }

// ── EL MAZO ───────────────────────────────────────────────────────────────────
const PALOS = [
  { id:'espada', n:'Espada', c:'#4a7fd4' },
  { id:'basto',  n:'Basto',  c:'#3f9a5c' },
  { id:'oro',    n:'Oro',    c:'#d9a520' },
  { id:'copa',   n:'Copa',   c:'#c0392b' }
];
const VALORES = [1,2,3,4,5,6,7,10,11,12];
// Fuerza de cada carta al enfrentarse. Más alto = mejor. Las cuatro bravas van
// aparte porque no siguen el orden natural.
function fuerza(c){
  if (c.v === 1 && c.p === 'espada') return 14;
  if (c.v === 1 && c.p === 'basto')  return 13;
  if (c.v === 7 && c.p === 'espada') return 12;
  if (c.v === 7 && c.p === 'oro')    return 11;
  if (c.v === 3) return 10;
  if (c.v === 2) return 9;
  if (c.v === 1) return 8;                    // los 1 falsos (oro y copa)
  if (c.v === 12) return 7;
  if (c.v === 11) return 6;
  if (c.v === 10) return 5;
  if (c.v === 7) return 4;                    // los 7 falsos (basto y copa)
  return c.v - 3;                             // 6→3, 5→2, 4→1 (quedan bajo el 7 falso)
}
// Valor de la carta PARA EL ENVIDO: las figuras no suman.
function valEnvido(c){ return c.v >= 10 ? 0 : c.v; }
// ── LA FLOR ───────────────────────────────────────────────────────────────────
// Tres cartas del mismo palo. Vale 20 + las tres (las figuras no suman). Se canta
// antes de la primera baza y tapa el envido: si hay flor, no hay envido.
// Si los dos tienen, es CONTRAFLOR y se lleva 6 el que tenga más.
function florDe(mano){
  if (!mano || mano.length < 3) return 0;
  if (!(mano[0].p === mano[1].p && mano[1].p === mano[2].p)) return 0;
  return 20 + valEnvido(mano[0]) + valEnvido(mano[1]) + valEnvido(mano[2]);
}
function tantoDe(mano){
  let mejor = 0;
  for (let i=0;i<mano.length;i++){
    // Carta suelta: cuenta sola.
    mejor = Math.max(mejor, valEnvido(mano[i]));
    for (let j=i+1;j<mano.length;j++){
      if (mano[i].p === mano[j].p)
        mejor = Math.max(mejor, 20 + valEnvido(mano[i]) + valEnvido(mano[j]));
    }
  }
  return mejor;
}
function mazoNuevo(){
  const m = [];
  PALOS.forEach(p => VALORES.forEach(v => m.push({ v, p:p.id })));
  return shuffle(m);
}
function nombreCarta(c){
  const p = PALOS.find(x=>x.id===c.p) || PALOS[0];
  return c.v + ' de ' + p.n;
}

// ── ESTADO DE LA PARTIDA ──────────────────────────────────────────────────────
let T = null;
const LS = 'canchero_truco_v1';

// Modo DESAFIO: la partida decide algo de la carrera. Se avisa el resultado una
// sola vez y el truco se cierra solo.
function avisarDesafio(gano){
  if (!T || !T.desafio || T._avisado) return;
  T._avisado = true;   // el resultado lo cierra el botón de la pantalla final
}
window._trucoCerrarDesafio = function(){
  if (!T) return;
  const cb = T.onFin, gano = T.fin === 0;
  T.onFin = null;
  try { window._trucoSalir(); } catch(e){}
  try { cb && cb(gano); } catch(e){}
};
function nuevaPartida(meta){
  T = {
    meta: meta || 30,
    ptsYo: 0, ptsEl: 0, golesYo: 0, golesEl: 0,
    mano: 0,                 // quién es mano: 0 = vos, 1 = la IA
    log: [],
    fin: null
  };
  repartir();
}
function repartir(){
  const m = mazoNuevo();
  T.yo = m.slice(0,3);
  T.el = m.slice(3,6);
  T.bazas = [];              // [{yo, el, gana}] gana: 0 vos, 1 IA, -1 parda
  T.turno = T.mano;          // a quién le toca tirar
  T.jugadasYo = [];          // cartas ya tiradas
  T.jugadasEl = [];
  T.envido = { cantado:false, resuelto:false, nivel:0, puntos:0, pendiente:null, quien:null };
  T.truco = { nivel:0, puntos:1, pendiente:null, quien:null };
  T.esperando = null;        // canto esperando tu respuesta
  T.finMano = null;
  T.log = [];
  T.tantoYo = tantoDe(T.yo);
  T.tantoEl = tantoDe(T.el);
  T.florYo = florDe(T.yo);
  T.florEl = florDe(T.el);
  T.flor = { cantada:false, resuelta:false };
  if (T.florYo) log('¡TENÉS FLOR! ' + T.florYo + ' puntos. Cantala antes de tirar.');
  log(T.mano === 0 ? 'Sos mano.' : 'Es mano la máquina.');
}
// Se canta la flor (la tuya o la de la maquina) y se reparte lo que corresponde.
function resolverFlor(quienCanta){
  if (!T || T.flor.cantada) return;
  T.flor.cantada = true;
  T.flor.resuelta = true;
  T.envido.cantado = true;          // con flor no hay envido
  T.envido.resuelto = true;
  const mia = T.florYo, suya = T.florEl;
  // En la final, la flor también hace gol para quien la gana.
  if (mia && suya){
    // Contraflor: se lleva 6 el que tenga mas; empate, el mano.
    const ganaYo = mia > suya || (mia === suya && T.mano === 0);
    log('CONTRAFLOR: ' + mia + ' contra ' + suya + '.');
    sumar(ganaYo ? 0 : 1, 6, ganaYo ? 'Ganaste la contraflor' : 'La contraflor fue de la máquina');
    desafioGol(ganaYo ? 0 : 1);
  } else if (mia){
    log('Cantás FLOR: ' + mia + '.');
    sumar(0, 3, 'Tu flor');
    desafioGol(0);
  } else if (suya){
    log('La máquina canta FLOR: ' + suya + '.');
    sumar(1, 3, 'La flor de la máquina');
    desafioGol(1);
  }
}
function log(txt){ T.log.push(txt); if (T.log.length > 7) T.log.shift(); }

// Puntos que se llevan si el rival NO QUIERE el canto de truco actual.
function puntosNoQuiero(nivel){ return nivel <= 1 ? 1 : nivel; }
// Puntos en juego si SE QUIERE.
function puntosQuerido(nivel){ return nivel + 1; }

function faltaEnvidoPuntos(){
  // Lo que le falta al que va ganando para llegar a las buenas.
  const mayor = Math.max(T.ptsYo, T.ptsEl);
  const mitad = Math.floor(T.meta/2);
  return (mayor >= mitad) ? (T.meta - mayor) : (mitad - mayor);
}

// ── LA MÁQUINA ────────────────────────────────────────────────────────────────
// No hace trampa: decide solo con SUS cartas y con lo que ya se jugó.
function iaFuerzaMano(){
  return T.el.reduce((s,c)=>s+fuerza(c), 0) / Math.max(1, T.el.length);
}
function iaQuiereEnvido(puntosEnJuego){
  const t = T.tantoEl;
  const umbral = puntosEnJuego >= 5 ? 27 : puntosEnJuego >= 3 ? 25 : 23;
  // Un poco de sal: a veces se juega una que no debería.
  return t >= umbral || (t >= umbral - 3 && Math.random() < 0.3);
}
function iaCantaEnvido(){
  if (T.envido.cantado || T.bazas.length > 0) return false;
  const t = T.tantoEl;
  if (t >= 29) return Math.random() < 0.92;
  if (t >= 26) return Math.random() < 0.7;
  if (t >= 22) return Math.random() < 0.35;
  return Math.random() < 0.12;             // bluff
}
function iaQuiereTruco(nivel){
  const f = iaFuerzaMano();
  // Si ya ganó una baza, se envalentona.
  const ganadas = T.bazas.filter(b=>b.gana===1).length;
  const umbral = nivel >= 3 ? 9.5 : nivel >= 2 ? 8.5 : 7.5;
  return (f + ganadas*1.6) >= umbral || Math.random() < 0.12;
}
function iaCantaTruco(){
  if (T.truco.nivel >= 1) return false;
  const f = iaFuerzaMano();
  const ganadas = T.bazas.filter(b=>b.gana===1).length;
  if (f >= 10 || ganadas >= 1) return Math.random() < 0.55;
  if (f >= 8) return Math.random() < 0.3;
  return Math.random() < 0.08;             // bluff
}
// Qué carta tira la máquina.
function iaElegirCarta(){
  const cartas = T.el.slice().sort((a,b)=>fuerza(a)-fuerza(b));
  const miCarta = T.jugadasYo[T.bazas.length];   // ¿ya tiraste vos en esta baza?
  if (miCarta){
    // Responde: la más baja que gane; si no puede, la más baja de todas.
    const mata = cartas.filter(c=>fuerza(c) > fuerza(miCarta));
    return mata.length ? mata[0] : cartas[0];
  }
  // Sale: primera baza con la más alta, después administra.
  if (T.bazas.length === 0) return cartas[cartas.length-1];
  return cartas[Math.floor(cartas.length/2)];
}

// ── FLUJO DE LA MANO ──────────────────────────────────────────────────────────
function resolverBaza(){
  const i = T.bazas.length;
  const cy = T.jugadasYo[i], ce = T.jugadasEl[i];
  if (!cy || !ce) return;
  const fy = fuerza(cy), fe = fuerza(ce);
  const gana = fy > fe ? 0 : fe > fy ? 1 : -1;
  T.bazas.push({ yo:cy, el:ce, gana });
  log(gana === 0 ? 'Ganaste la ' + (i+1) + 'ª.' : gana === 1 ? 'Perdiste la ' + (i+1) + 'ª.' : 'Parda la ' + (i+1) + 'ª.');
  // El que gana la baza sale en la siguiente; si fue parda, sale el mismo.
  T.turno = gana === -1 ? T.turno : gana;
  const res = ganadorDeMano();
  if (res != null){ terminarMano(res); return; }
  // Si la siguiente baza la abre la máquina, hay que DARLE el turno. Sin esto la
  // partida quedaba clavada apenas la máquina ganaba una baza: nadie la movía.
  if (T.turno === 1) setTimeout(turnoIA, 700);
}
// ¿Ya está definida la mano? Devuelve 0/1, o null si sigue.
function ganadorDeMano(){
  const b = T.bazas;
  const g = n => b.filter(x=>x.gana===n).length;
  if (b.length >= 2){
    if (g(0) >= 2) return 0;
    if (g(1) >= 2) return 1;
    // Con una parda de por medio, gana el que ganó la otra.
    if (b.length === 2 && b[0].gana === -1 && b[1].gana !== -1) return b[1].gana;
    if (b.length === 2 && b[1].gana === -1 && b[0].gana !== -1) return b[0].gana;
  }
  if (b.length === 3){
    if (g(0) > g(1)) return 0;
    if (g(1) > g(0)) return 1;
    return T.mano;                     // todo parda: gana el mano
  }
  return null;
}
function terminarMano(ganador){
  const pts = T.truco.nivel >= 1 ? puntosQuerido(T.truco.nivel) : 1;
  sumar(ganador, pts, ganador === 0 ? 'Ganaste la mano' : 'La mano fue para la máquina');
  desafioGol(ganador);
  T.finMano = true;
}
// En una final, la mano ganada vale un GOL. El primero que llega a dos, gana.
function desafioGol(quien){
  if (!T || !T.desafio) return;
  if (quien === 0) T.golesYo = (T.golesYo||0) + 1; else T.golesEl = (T.golesEl||0) + 1;
  log(quien === 0 ? '¡GOL TUYO! ' + T.golesYo + '-' + (T.golesEl||0)
                  : 'Gol de ellos. ' + (T.golesYo||0) + '-' + T.golesEl);
  if ((T.golesYo||0) >= 2 || (T.golesEl||0) >= 2){
    T.fin = (T.golesYo||0) >= 2 ? 0 : 1;
    avisarDesafio(T.fin === 0);
  }
}
function sumar(quien, pts, motivo){
  if (quien === 0) T.ptsYo += pts; else T.ptsEl += pts;
  log(motivo + ' (+' + pts + ').');
  if (T.ptsYo >= T.meta || T.ptsEl >= T.meta){ T.fin = T.ptsYo >= T.meta ? 0 : 1; avisarDesafio(T.fin === 0); }
  guardar();
}
function siguienteMano(){
  if (T.fin != null){ render(); return; }
  T.mano = 1 - T.mano;
  repartir();
  T.finMano = null;
  if (T.turno === 1) setTimeout(turnoIA, 700);
  render();
}

// ── TURNO DE LA MÁQUINA ───────────────────────────────────────────────────────
function turnoIA(){
  if (!T || T.fin != null || T.finMano) return;
  if (T.esperando) return;                 // te toca contestar a vos
  if (T.turno !== 1) return;
  // ¿Canta algo antes de tirar?
  if (T.florEl && !T.flor.cantada && T.bazas.length === 0){
    resolverFlor(1); render(); return;
  }
  if (!T.envido.cantado && T.bazas.length === 0 && iaCantaEnvido()){
    T.envido.cantado = true; T.envido.nivel = 1; T.envido.quien = 1;
    T.esperando = { tipo:'envido', nivel:1 };
    log('La máquina canta ENVIDO.');
    render(); return;
  }
  if (T.truco.nivel === 0 && iaCantaTruco()){
    T.truco.nivel = 1; T.truco.quien = 1;
    T.esperando = { tipo:'truco', nivel:1 };
    log('La máquina canta TRUCO.');
    render(); return;
  }
  tirarIA();
}
function tirarIA(){
  const c = iaElegirCarta();
  T.el = T.el.filter(x=>!(x.v===c.v && x.p===c.p));
  T.jugadasEl[T.bazas.length] = c;
  log('La máquina tira ' + nombreCarta(c) + '.');
  if (T.jugadasYo[T.bazas.length]) resolverBaza();
  else T.turno = 0;
  render();
}

// ── ACCIONES TUYAS ────────────────────────────────────────────────────────────
window._trucoTirar = function(idx){
  if (!T || T.fin != null || T.finMano || T.esperando) return;
  if (T.turno !== 0) return;
  const c = T.yo[idx]; if (!c) return;
  // Flor no cantada, flor perdida: acá no. Si tenés flor y tirás sin cantarla,
  // se canta sola. Nadie tiene que acordarse de una regla para no perder puntos.
  if (T.florYo && !T.flor.cantada && T.bazas.length === 0){ resolverFlor(0); }
  T.yo = T.yo.filter((_,i)=>i!==idx);
  T.jugadasYo[T.bazas.length] = c;
  log('Tirás ' + nombreCarta(c) + '.');
  if (T.jugadasEl[T.bazas.length]) resolverBaza();
  else { T.turno = 1; setTimeout(turnoIA, 750); }
  render();
};
window._trucoCantar = function(que){
  if (!T || T.fin != null || T.finMano || T.esperando) return;
  if (que === 'flor'){ if (T.florYo && !T.flor.cantada && T.bazas.length === 0){ resolverFlor(0); render(); } return; }
  if (que === 'envido' || que === 'real' || que === 'falta'){
    if (T.envido.cantado || T.bazas.length > 0) return;
    T.envido.cantado = true; T.envido.quien = 0;
    T.envido.nivel = que === 'envido' ? 1 : que === 'real' ? 2 : 3;
    log('Cantás ' + (que === 'envido' ? 'ENVIDO' : que === 'real' ? 'REAL ENVIDO' : 'FALTA ENVIDO') + '.');
    // Contesta la máquina
    const enJuego = que === 'envido' ? 2 : que === 'real' ? 3 : faltaEnvidoPuntos();
    setTimeout(()=>{
      if (iaQuiereEnvido(enJuego)) resolverEnvido(true, enJuego);
      // No querer un envido paga 1, sea el canto que sea.
      // OJO: hay que repintar. Sin el render() la pantalla quedaba con el estado
      // viejo y, si ese punto cerraba la partida, el final no se mostraba nunca.
      else { sumar(0, 1, 'La máquina no quiso el envido'); T.envido.resuelto = true; trasEnvido(); render(); }
    }, 800);
    render(); return;
  }
  if (que === 'truco'){
    if (T.truco.nivel !== 0) return;
    T.truco.nivel = 1; T.truco.quien = 0;
    log('Cantás TRUCO.');
    setTimeout(()=>{
      if (iaQuiereTruco(1)){ log('Quiero.'); T.truco.quien = null; }
      else { sumar(0, 1, 'La máquina no quiso el truco'); desafioGol(0); T.finMano = true; }
      render();
    }, 800);
    render(); return;
  }
  if (que === 'retruco' || que === 'vale4'){
    const n = que === 'retruco' ? 2 : 3;
    if (T.truco.nivel !== n-1) return;
    T.truco.nivel = n; T.truco.quien = 0;
    log('Cantás ' + (n===2?'RETRUCO':'VALE CUATRO') + '.');
    setTimeout(()=>{
      if (iaQuiereTruco(n)){ log('Quiero.'); T.truco.quien = null; }
      else { sumar(0, puntosNoQuiero(n-1)+1, 'La máquina no quiso'); desafioGol(0); T.finMano = true; }
      render();
    }, 800);
    render(); return;
  }
  if (que === 'irme'){
    const pts = T.truco.nivel >= 1 ? puntosNoQuiero(T.truco.nivel) : 1;
    sumar(1, pts, 'Te fuiste al mazo');
    desafioGol(1); T.finMano = true; render(); return;
  }
};
// Respondés a un canto de la máquina.
window._trucoResponder = function(resp){
  if (!T || !T.esperando) return;
  const E = T.esperando;
  if (E.tipo === 'envido'){
    const enJuego = E.nivel === 1 ? 2 : E.nivel === 2 ? 3 : faltaEnvidoPuntos();
    if (resp === 'quiero'){ T.esperando = null; resolverEnvido(true, enJuego); return; }
    if (resp === 'no'){ T.esperando = null; sumar(1, 1, 'No quisiste el envido'); T.envido.resuelto = true; trasEnvido(); render(); return; }
    if (resp === 'subir'){
      // Envido-envido: sube a 4 y contesta la máquina.
      T.esperando = null; T.envido.nivel = 2; log('Subís: ENVIDO ENVIDO.');
      setTimeout(()=>{
        if (iaQuiereEnvido(4)) resolverEnvido(true, 4);
        else { sumar(0, 2, 'La máquina no quiso'); T.envido.resuelto = true; trasEnvido(); render(); }
      }, 800);
      render(); return;
    }
    if (resp === 'falta'){
      T.esperando = null; T.envido.nivel = 3; log('Subís: FALTA ENVIDO.');
      const f = faltaEnvidoPuntos();
      setTimeout(()=>{
        if (iaQuiereEnvido(f)) resolverEnvido(true, f);
        else { sumar(0, 2, 'La máquina no quiso la falta'); T.envido.resuelto = true; trasEnvido(); render(); }
      }, 800);
      render(); return;
    }
  }
  if (E.tipo === 'truco'){
    if (resp === 'quiero'){ T.esperando = null; log('Quiero.'); T.truco.quien = null; tirarSiTocaIA(); render(); return; }
    if (resp === 'no'){ T.esperando = null; sumar(1, puntosNoQuiero(E.nivel), 'No quisiste el truco'); desafioGol(1); T.finMano = true; render(); return; }
    if (resp === 'subir'){
      const n = E.nivel + 1;
      T.esperando = null; T.truco.nivel = n; T.truco.quien = 0;
      log('Subís a ' + (n===2?'RETRUCO':'VALE CUATRO') + '.');
      setTimeout(()=>{
        if (iaQuiereTruco(n)){ log('Quiero.'); T.truco.quien = null; tirarSiTocaIA(); }
        else { sumar(0, puntosNoQuiero(n-1)+1, 'La máquina no quiso'); desafioGol(0); T.finMano = true; }
        render();
      }, 800);
      render(); return;
    }
  }
};
function tirarSiTocaIA(){ if (T.turno === 1 && !T.finMano) setTimeout(tirarIA, 650); }
function resolverEnvido(querido, puntos){
  T.envido.resuelto = true;
  if (!querido) return;
  log('Tu tanto: ' + T.tantoYo + ' · el de la máquina: ' + T.tantoEl + '.');
  // Empate: gana el mano.
  const gana = T.tantoYo > T.tantoEl ? 0 : T.tantoEl > T.tantoYo ? 1 : T.mano;
  sumar(gana, puntos, gana === 0 ? 'Ganaste el envido' : 'El envido fue para la máquina');
  // En la final, el envido también vale: cuenta como gol para quien lo gana. Antes
  // solo las manos hacían gol y por eso "siempre ganaba el que hacía truco".
  desafioGol(gana);
  trasEnvido();
  render();
}
function trasEnvido(){
  T.esperando = null;
  if (T.fin != null) return;
  if (T.turno === 1) setTimeout(turnoIA, 700);
}

// ── GUARDADO ──────────────────────────────────────────────────────────────────
function guardar(){ try { localStorage.setItem(LS, JSON.stringify({ ptsYo:T.ptsYo, ptsEl:T.ptsEl, meta:T.meta })); } catch(e){} }

// ── DIBUJO DE LAS CARTAS ──────────────────────────────────────────────────────
// Carta española dibujada en SVG: sin imágenes, se ve igual en todos lados.
// ── LAS CARTAS ────────────────────────────────────────────────────────────────
// Baraja española dibujada en SVG: espada, basto, oro y copa con su forma real,
// y las figuras (10, 11, 12) con su personaje. Antes cada palo era un triangulo
// o un rectangulo y no se distinguia ninguno de otro.
function paloSVG(p, cx, cy, s, col){
  const o = { espada:'#2f5fa8', basto:'#2f7a4a', oro:'#c8901a', copa:'#b0342c' }[p] || col;
  const osc = { espada:'#1d3f75', basto:'#1d5233', oro:'#8f6410', copa:'#7c231d' }[p] || col;
  if (p === 'espada'){
    // Hoja recta con guarda y empuñadura.
    return `<g>
      <path d="M${cx} ${cy-s} L${cx+s*0.16} ${cy+s*0.25} L${cx} ${cy+s*0.42} L${cx-s*0.16} ${cy+s*0.25} Z" fill="${o}" stroke="${osc}" stroke-width="${s*0.06}"/>
      <rect x="${cx-s*0.42}" y="${cy+s*0.24}" width="${s*0.84}" height="${s*0.13}" rx="${s*0.05}" fill="${osc}"/>
      <rect x="${cx-s*0.09}" y="${cy+s*0.37}" width="${s*0.18}" height="${s*0.4}" fill="${osc}"/>
      <circle cx="${cx}" cy="${cy+s*0.82}" r="${s*0.13}" fill="${o}" stroke="${osc}" stroke-width="${s*0.05}"/>
    </g>`;
  }
  if (p === 'basto'){
    // Garrote con nudos.
    return `<g>
      <path d="M${cx-s*0.14} ${cy+s*0.9} L${cx-s*0.09} ${cy-s*0.62} Q${cx} ${cy-s*0.95} ${cx+s*0.09} ${cy-s*0.62} L${cx+s*0.14} ${cy+s*0.9} Z" fill="${o}" stroke="${osc}" stroke-width="${s*0.06}"/>
      <circle cx="${cx-s*0.2}" cy="${cy-s*0.2}" r="${s*0.15}" fill="${o}" stroke="${osc}" stroke-width="${s*0.05}"/>
      <circle cx="${cx+s*0.21}" cy="${cy+s*0.18}" r="${s*0.14}" fill="${o}" stroke="${osc}" stroke-width="${s*0.05}"/>
      <circle cx="${cx-s*0.18}" cy="${cy+s*0.5}" r="${s*0.12}" fill="${o}" stroke="${osc}" stroke-width="${s*0.05}"/>
    </g>`;
  }
  if (p === 'oro'){
    // Moneda con doble aro y destello.
    return `<g>
      <circle cx="${cx}" cy="${cy}" r="${s*0.82}" fill="${o}" stroke="${osc}" stroke-width="${s*0.1}"/>
      <circle cx="${cx}" cy="${cy}" r="${s*0.55}" fill="none" stroke="${osc}" stroke-width="${s*0.07}"/>
      <circle cx="${cx-s*0.26}" cy="${cy-s*0.28}" r="${s*0.16}" fill="#ffe9a8" opacity=".85"/>
    </g>`;
  }
  // copa
  return `<g>
    <path d="M${cx-s*0.55} ${cy-s*0.62} L${cx+s*0.55} ${cy-s*0.62} L${cx+s*0.38} ${cy+s*0.05} Q${cx} ${cy+s*0.3} ${cx-s*0.38} ${cy+s*0.05} Z" fill="${o}" stroke="${osc}" stroke-width="${s*0.06}"/>
    <rect x="${cx-s*0.08}" y="${cy+s*0.16}" width="${s*0.16}" height="${s*0.42}" fill="${osc}"/>
    <ellipse cx="${cx}" cy="${cy+s*0.66}" rx="${s*0.42}" ry="${s*0.13}" fill="${o}" stroke="${osc}" stroke-width="${s*0.05}"/>
    <path d="M${cx-s*0.55} ${cy-s*0.62} q${s*0.55} ${s*0.22} ${s*1.1} 0" fill="none" stroke="${osc}" stroke-width="${s*0.06}"/>
  </g>`;
}
function cartaSVG(c, ancho, tapada){
  const w = ancho || 62, h = Math.round(w*1.55);
  if (tapada){
    return `<svg viewBox="0 0 62 96" width="${w}" height="${h}" style="display:block;">
      <rect x="1" y="1" width="60" height="94" rx="6" fill="#1d2b45" stroke="#33436a" stroke-width="2"/>
      <rect x="6" y="6" width="50" height="84" rx="4" fill="none" stroke="#3d5180" stroke-width="1.5"/>
      <g opacity=".55">${[18,34,50,66,82].map(y=>[16,31,46].map(x=>`<circle cx="${x}" cy="${y}" r="3" fill="#3d5180"/>`).join('')).join('')}</g>
    </svg>`;
  }
  const P = PALOS.find(x=>x.id===c.p) || PALOS[0];
  const col = P.c;
  const figura = c.v >= 10;
  let cuerpo = '';
  if (figura){
    // Figuras: un personaje simple con el palo en la mano, distinto por valor.
    const capa = c.v === 10 ? '#6c4bb0' : c.v === 11 ? '#2f7a4a' : '#b0342c';
    cuerpo = `
      <rect x="17" y="34" width="28" height="32" rx="4" fill="${capa}" opacity=".85"/>
      <circle cx="31" cy="30" r="8" fill="#e8c9a0" stroke="#8a6a45" stroke-width="1"/>
      <rect x="22" y="20" width="18" height="7" rx="3" fill="${capa}"/>
      <circle cx="28" cy="30" r="1.2" fill="#2b2016"/><circle cx="34" cy="30" r="1.2" fill="#2b2016"/>
      ${paloSVG(c.p, 31, 52, 9, col)}`;
  } else {
    // Números: el palo repetido, distribuido como en la baraja real.
    const pos = {
      1:[[31,48]], 2:[[31,34],[31,62]], 3:[[31,30],[31,48],[31,66]],
      4:[[21,34],[41,34],[21,62],[41,62]],
      5:[[21,32],[41,32],[31,48],[21,64],[41,64]],
      6:[[21,30],[41,30],[21,48],[41,48],[21,66],[41,66]],
      7:[[21,30],[41,30],[21,48],[41,48],[31,58],[21,68],[41,68]]
    }[c.v] || [[31,48]];
    const tam = c.v === 1 ? 13 : pos.length <= 3 ? 9 : 7.5;
    cuerpo = pos.map(pt => paloSVG(c.p, pt[0], pt[1], tam, col)).join('');
  }
  return `<svg viewBox="0 0 62 96" width="${w}" height="${h}" style="display:block;">
    <rect x="1" y="1" width="60" height="94" rx="6" fill="#fdfbf4" stroke="${col}" stroke-width="2"/>
    <rect x="4.5" y="4.5" width="53" height="87" rx="4" fill="none" stroke="${col}" stroke-width="1" opacity=".5"/>
    <text x="7" y="16" font-family="Outfit,Arial" font-weight="900" font-size="13" fill="${col}">${c.v}</text>
    <text x="55" y="88" font-family="Outfit,Arial" font-weight="900" font-size="13" fill="${col}" text-anchor="end" transform="rotate(180 55 84)">${c.v}</text>
    ${cuerpo}
  </svg>`;
}

// ── PANTALLA ──────────────────────────────────────────────────────────────────
function overlay(){
  let m = document.getElementById('truco-modal');
  if (!m){
    m = document.createElement('div');
    m.id = 'truco-modal';
    m.style.cssText = 'position:fixed;inset:0;z-index:100060;background:#070a06;overflow-y:auto;-webkit-overflow-scrolling:touch;';
    document.body.appendChild(m);
  }
  return m;
}
function btn(txt, onclick, col, chico){
  col = col || A;
  return `<button onclick="${onclick}" style="background:${col}1c;border:1.5px solid ${col}66;color:${col};border-radius:11px;padding:${chico?'8px 11px':'11px 14px'};font-weight:900;font-size:${chico?'12px':'13px'};cursor:pointer;">${txt}</button>`;
}
function render(){
  if (!T) return;
  const m = overlay();
  if (T.fin != null){ renderFin(m); return; }
  const puedeEnvido = !T.envido.cantado && !T.florYo && !T.florEl && T.bazas.length === 0 && !T.esperando && !T.finMano;
  const puedeTruco  = T.truco.nivel === 0 && !T.esperando && !T.finMano;
  const puedeSubir  = T.truco.nivel >= 1 && T.truco.nivel < 3 && T.truco.quien === 1 && !T.esperando && !T.finMano;
  const tuTurno = T.turno === 0 && !T.esperando && !T.finMano;

  const mesaEl = [0,1,2].map(i=> T.jugadasEl[i] ? `<div style="line-height:0;">${cartaSVG(T.jugadasEl[i], 46)}</div>` : `<div style="width:46px;height:71px;border:1.5px dashed #232c1e;border-radius:6px;"></div>`).join('');
  const mesaYo = [0,1,2].map(i=> T.jugadasYo[i] ? `<div style="line-height:0;">${cartaSVG(T.jugadasYo[i], 46)}</div>` : `<div style="width:46px;height:71px;border:1.5px dashed #232c1e;border-radius:6px;"></div>`).join('');

  m.innerHTML = `
  <div style="min-height:100%;background:radial-gradient(120% 80% at 50% 0%, #16260f 0%, #070a06 62%);display:flex;flex-direction:column;">
    <div style="max-width:520px;margin:0 auto;width:100%;padding:16px 16px calc(20px + env(safe-area-inset-bottom));box-sizing:border-box;">

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <button onclick="window._trucoSalir()" style="background:rgba(255,255,255,.06);border:1px solid #2a3222;color:#9aa48f;border-radius:10px;padding:8px 12px;font-weight:800;font-size:12px;cursor:pointer;"><i class='bx bx-arrow-back'></i> Salir</button>
        <div style="font-size:10px;font-weight:900;letter-spacing:2.4px;color:${A};">TRUCO</div>
      </div>

      <!-- TANTEADOR. En una final el marcador son GOLES: cada mano que ganás
           es un gol y el partido se define a dos. Los puntos del truco quedan
           abajo, chiquitos, que es lo que son en ese contexto. -->
      <div style="display:flex;gap:9px;margin-bottom:14px;">
        ${(T.desafio
          ? [['VOS', T.golesYo||0, A],['ELLOS', T.golesEl||0, '#f87171']]
          : [['VOS', T.ptsYo, A],['MÁQUINA', T.ptsEl, '#f87171']]).map(x=>`
          <div style="flex:1;background:rgba(255,255,255,.04);border:1.5px solid ${x[2]}44;border-radius:13px;padding:10px;text-align:center;">
            <div style="font-size:8.5px;font-weight:900;letter-spacing:1.4px;color:#8a9480;">${x[0]}</div>
            <div style="font-size:26px;font-weight:900;color:${x[2]};line-height:1.1;">${x[1]}</div>
            ${T.desafio?`<div style="font-size:8px;color:#79836f;font-weight:800;margin-top:2px;">${x[0]==='VOS'?T.ptsYo:T.ptsEl} pts</div>`:''}
          </div>`).join('')}
        <div style="flex:0 0 auto;background:rgba(255,255,255,.03);border:1px solid #232a1f;border-radius:13px;padding:10px 12px;text-align:center;display:flex;flex-direction:column;justify-content:center;">
          <div style="font-size:8.5px;font-weight:900;letter-spacing:1.2px;color:#79836f;">${T.desafio?'GOLES':'A'}</div>
          <div style="font-size:15px;font-weight:900;color:#cfd8c6;">${T.desafio?2:T.meta}</div>
        </div>
      </div>
      ${T.desafio?`<div style="text-align:center;font-size:11px;color:#8a9480;font-weight:800;margin:-8px 0 12px;">Cada mano que ganás es un gol. Gana el que llega a 2.</div>`:''}

      <!-- MESA -->
      <div style="background:linear-gradient(165deg,rgba(31,74,26,.5),rgba(9,14,8,.7));border:1.5px solid #24361c;border-radius:18px;padding:14px;margin-bottom:12px;">
        <div style="font-size:8.5px;font-weight:900;letter-spacing:1.6px;color:#7f8a74;margin-bottom:7px;">LA MÁQUINA ${T.mano===1?'· MANO':''}</div>
        <div style="display:flex;gap:7px;margin-bottom:6px;">${T.el.map(()=>`<div style="line-height:0;">${cartaSVG(null,38,true)}</div>`).join('')}</div>
        <div style="display:flex;gap:7px;justify-content:center;margin:10px 0;">${mesaEl}</div>
        <div style="height:1px;background:rgba(255,255,255,.08);margin:4px 0;"></div>
        <div style="display:flex;gap:7px;justify-content:center;margin:10px 0;">${mesaYo}</div>
        <div style="font-size:8.5px;font-weight:900;letter-spacing:1.6px;color:#7f8a74;text-align:right;">VOS ${T.mano===0?'· MANO':''} · TANTO ${T.tantoYo}</div>
      </div>

      <!-- RELATO -->
      <div style="background:rgba(0,0,0,.35);border:1px solid #1e241a;border-radius:12px;padding:10px 12px;margin-bottom:12px;min-height:56px;">
        ${T.log.map((l,i)=>`<div style="font-size:11.5px;color:${i===T.log.length-1?'#dfe7d6':'#6f7a65'};line-height:1.55;">${esc(l)}</div>`).join('')}
      </div>

      ${T.esperando ? `
      <div style="background:rgba(250,204,21,.1);border:1.5px solid rgba(250,204,21,.45);border-radius:14px;padding:13px;margin-bottom:12px;">
        <div style="font-size:13px;font-weight:900;color:#facc15;margin-bottom:9px;">Te cantaron ${T.esperando.tipo === 'envido' ? (T.esperando.nivel===1?'ENVIDO':'REAL ENVIDO') : (T.esperando.nivel===1?'TRUCO':T.esperando.nivel===2?'RETRUCO':'VALE CUATRO')}. ¿Qué hacés?</div>
        <div style="display:flex;flex-wrap:wrap;gap:7px;">
          ${btn('Quiero', "window._trucoResponder('quiero')", A)}
          ${btn('No quiero', "window._trucoResponder('no')", '#f87171')}
          ${T.esperando.tipo === 'envido'
            ? btn('Envido envido', "window._trucoResponder('subir')", '#facc15') + btn('Falta envido', "window._trucoResponder('falta')", '#fb923c')
            : (T.esperando.nivel < 3 ? btn(T.esperando.nivel===1?'Retruco':'Vale cuatro', "window._trucoResponder('subir')", '#facc15') : '')}
        </div>
      </div>` : ''}

      ${T.finMano ? `
      <button onclick="window._trucoSiguiente()" style="width:100%;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:14px;font-weight:900;font-size:15px;cursor:pointer;margin-bottom:12px;">SIGUIENTE MANO <i class='bx bx-right-arrow-alt'></i></button>` : ''}

      <!-- TUS CARTAS -->
      <div style="display:flex;gap:9px;justify-content:center;margin-bottom:12px;">
        ${T.yo.map((c,i)=>`
          <button onclick="window._trucoTirar(${i})" ${tuTurno?'':'disabled'} style="background:none;border:0;padding:0;cursor:${tuTurno?'pointer':'default'};opacity:${tuTurno?1:.5};transform:translateY(0);transition:transform .12s;" ${tuTurno?`onmouseover="this.style.transform='translateY(-7px)'" onmouseout="this.style.transform='translateY(0)'"`:''}>
            ${cartaSVG(c, 66)}
          </button>`).join('')}
      </div>

      <!-- CANTOS -->
      <div style="display:flex;flex-wrap:wrap;gap:7px;justify-content:center;">
        ${(T.florYo && !T.flor.cantada && T.bazas.length === 0 && !T.finMano) ? btn('¡FLOR! (' + T.florYo + ')', "window._trucoCantar('flor')", '#f472b6') : ''}
        ${puedeEnvido ? btn('Envido', "window._trucoCantar('envido')", '#4fc3f7', true) : ''}
        ${puedeEnvido ? btn('Real envido', "window._trucoCantar('real')", '#4fc3f7', true) : ''}
        ${puedeEnvido ? btn('Falta envido', "window._trucoCantar('falta')", '#fb923c', true) : ''}
        ${puedeTruco ? btn('Truco', "window._trucoCantar('truco')", '#facc15', true) : ''}
        ${puedeSubir ? btn(T.truco.nivel===1?'Retruco':'Vale cuatro', "window._trucoCantar('"+(T.truco.nivel===1?'retruco':'vale4')+"')", '#facc15', true) : ''}
        ${!T.finMano && !T.esperando ? btn('Me voy al mazo', "window._trucoCantar('irme')", '#f87171', true) : ''}
      </div>

      ${!tuTurno && !T.esperando && !T.finMano ? `<div style="text-align:center;font-size:11.5px;color:#79836f;margin-top:11px;">Pensando la máquina...</div>` : ''}
    </div>
  </div>`;
}
function renderFin(m){
  const gane = T.fin === 0;
  m.innerHTML = `
  <div style="min-height:100%;background:radial-gradient(120% 80% at 50% 0%, ${gane?'#1d3a10':'#3a1010'} 0%, #070a06 62%);display:flex;align-items:center;justify-content:center;padding:30px 20px;">
    <div style="max-width:400px;width:100%;text-align:center;">
      <div style="font-size:56px;margin-bottom:10px;">${gane?'🏆':'💀'}</div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:30px;color:#fff;line-height:1.15;margin-bottom:9px;">${gane?'¡Ganaste!':'Te ganó la máquina'}</div>
      ${T.desafio ? `<div style="font-size:13px;color:${gane?'#facc15':'#f87171'};font-weight:900;margin-bottom:6px;">${gane?'La final es tuya.':'Se te escapó la final.'}</div>` : ''}
      <div style="font-size:14px;color:#b9c4ad;margin-bottom:22px;">${T.desafio ? ((T.golesYo||0) + ' a ' + (T.golesEl||0)) : (T.ptsYo + ' a ' + T.ptsEl)}${gane?'. A cobrar.':'. La próxima.'}</div>
      ${T.desafio
        ? `<button onclick="window._trucoCerrarDesafio()" style="width:100%;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:14px;padding:15px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;">VOLVER A LA CANCHA <i class='bx bx-right-arrow-alt'></i></button>`
        : `<button onclick="window._trucoNueva(${T.meta})" style="width:100%;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:14px;padding:15px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;">OTRA</button>
      <button onclick="window._trucoSalir()" style="width:100%;margin-top:9px;background:rgba(255,255,255,.05);border:1px solid #2a3222;color:#cfd8c6;border-radius:14px;padding:14px;font-weight:900;font-size:14px;cursor:pointer;">Salir</button>`}
    </div>
  </div>`;
}

// ── ENTRADA ───────────────────────────────────────────────────────────────────
window._trucoAbrir = function(){
  try { window._lyOcultarSalir && window._lyOcultarSalir(true); } catch(e){}
  const m = overlay();
  m.innerHTML = `
  <div style="min-height:100%;background:radial-gradient(120% 80% at 50% 0%, #16260f 0%, #070a06 62%);display:flex;align-items:center;justify-content:center;padding:30px 20px;">
    <div style="max-width:400px;width:100%;text-align:center;">
      <div style="font-size:10px;font-weight:900;letter-spacing:3px;color:${A};margin-bottom:10px;">CANCHERO</div>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:42px;color:#fff;line-height:1;margin-bottom:12px;">TRUCO</div>
      <div style="font-size:13.5px;color:#b9c4ad;line-height:1.6;margin-bottom:26px;">Envido, truco y las cuatro bravas. Contra la máquina, que miente igual que tu primo.</div>
      <button onclick="window._trucoNueva(30)" style="width:100%;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:14px;padding:15px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;">JUGAR A 30</button>
      <button onclick="window._trucoNueva(15)" style="width:100%;margin-top:9px;background:rgba(255,255,255,.05);border:1px solid #2a3222;color:#cfd8c6;border-radius:14px;padding:14px;font-weight:900;font-size:14px;cursor:pointer;">Partida corta (a 15)</button>
      <button onclick="window._trucoSalir()" style="width:100%;margin-top:9px;background:none;border:0;color:#79836f;padding:12px;font-weight:800;font-size:13px;cursor:pointer;">Volver</button>
    </div>
  </div>`;
};
window._trucoNueva = function(meta, desafio, onFin){
  try { window._lyOcultarSalir && window._lyOcultarSalir(true); } catch(e){}
  nuevaPartida(meta);
  if (desafio){ T.desafio = true; T.onFin = onFin || null; }
  if (T.turno === 1) setTimeout(turnoIA, 800);
  render();
};
window._trucoSiguiente = function(){ siguienteMano(); };
window._trucoSalir = function(){
  try { window._lyOcultarSalir && window._lyOcultarSalir(false); } catch(e){}
  T = null;
  document.getElementById('truco-modal')?.remove();
  // Si entraste desde Leyenda, volvés EXACTAMENTE a donde estabas. Nunca hay que
  // llamar a _carreraStart() acá: eso reinicia el juego y te tira a la portada.
  const vuelta = window._trucoVolverA;
  window._trucoVolverA = null;
  if (typeof vuelta === 'function'){ try { vuelta(); return; } catch(e){} }
};

console.log('[canchero-truco] cargado');
})();
