/**
 * canchero-plataformas.js — "CANCHERO WORLD"
 *
 * El videojuego que sale cuando licenciás tu imagen: un plataformero clásico
 * donde el personaje sos VOS, con tu apellido y tu número. Se juega entero:
 * cuatro niveles, enemigos, monedas (pelotas), vidas y final.
 *
 * Se abre con window._platAbrir({ apellido, num, colores }).
 *
 * Todo es canvas + tiles. Física de paso fijo (60 Hz lógicos) para que sea
 * igual en cualquier dispositivo, sin importar los FPS reales de la pantalla.
 */
(function(){
'use strict';
const A = '#baff00';

// ── NIVELES ───────────────────────────────────────────────────────────────────
// '#' piso · '=' plataforma · 'o' pelota · 'e' enemigo · '^' pinches
// 'P' arranque · 'F' meta · ' ' aire
// Reglas de diseño, para que se pueda jugar de verdad (y en un celular):
//  - El salto llega ~90px de largo y ~82px de alto. Los pozos son de 2 tiles
//    (44px) y las plataformas están a 3 tiles como mucho: siempre queda margen,
//    nunca hace falta un salto perfecto al píxel.
//  - Los pinches van en la fila de ARRIBA del piso, apoyados sobre '#'. Un '^'
//    no es sólido: si se pusiera en la fila del piso, sería un pozo disfrazado.
const NIVELES_SPEC = [
  { n:'El potrero', cielo:['#5fb8e8','#bfe6ff'], fondo:'barrio', ancho:56, bloque:10, plats:2, enemigos:2, pinches:0 },
  { n:'La cantera', cielo:['#4aa3df','#a8dcff'], fondo:'club',   ancho:62, bloque:10, plats:3, enemigos:3, pinches:0 },
  { n:'El estadio', cielo:['#2b4a7a','#6f9fd0'], fondo:'estadio',ancho:70, bloque:8,  plats:4, enemigos:5, pinches:0 },
  { n:'La final',   cielo:['#1a1030','#4a2f7a'], fondo:'noche',  ancho:78, bloque:8,  plats:5, enemigos:7, pinches:0 }
];
// Los niveles se ARMAN por código en vez de dibujarse a mano en strings. Escritos
// a mano se colaban errores invisibles —una plataforma justo encima de un pozo
// (te golpeás la cabeza y caés adentro), un pinche flotando sin piso, un pozo de
// tres tiles que no se puede saltar— y cada arreglo rompía otro. Generados, esas
// tres cosas no pueden pasar: el generador solo elige columnas seguras.
function construirNivel(cfg){
  const W = cfg.ancho, H = 12, pisoY = H - 2;
  const filas = Array.from({length:H}, ()=> new Array(W).fill(' '));
  // 1) Piso: bloques sólidos separados por pozos de 2 tiles (siempre saltables).
  const solido = new Array(W).fill(false);
  let x = 0;
  while (x < W){
    for (let k=0; k<cfg.bloque && x<W; k++, x++) solido[x] = true;
    x += 2;
  }
  for (let k=Math.max(0,W-6); k<W; k++) solido[k] = true;   // la meta pisa firme
  for (let k=0; k<4; k++) solido[k] = true;                 // el arranque también
  for (let i=0;i<W;i++) if (solido[i]){ filas[pisoY][i] = '#'; filas[pisoY+1][i] = '#'; }
  // Columna segura: sólida y con margen a los lados, para no colgar nada sobre un pozo.
  const seguro = i => solido[i] && solido[Math.max(0,i-1)] && solido[Math.min(W-1,i+1)];
  // Lejos de un pozo: sirve para enemigos y pinches. Si caen en la zona donde uno
  // ATERRIZA después de saltar un pozo, te matan sin que puedas hacer nada — no es
  // dificultad, es una trampa.
  const lejosDePozo = (i, d) => {
    for (let k=i-d; k<=i+d; k++){ if (k<0 || k>=W) continue; if (!solido[k]) return false; }
    return true;
  };
  const ventana = (desde, ancho, margen) => {
    for (let i=Math.max(0,desde); i<W-ancho-2; i++){
      let bien = true;
      for (let k=0;k<ancho;k++){
        if (!seguro(i+k)) { bien = false; break; }
        if (margen && !lejosDePozo(i+k, margen)) { bien = false; break; }
      }
      if (bien) return i;
    }
    return -1;
  };
  const paso = Math.max(6, Math.floor((W-14) / Math.max(1,cfg.plats)));
  // 2) Plataformas, repartidas a lo largo y siempre sobre piso firme.
  for (let p=0; p<cfg.plats; p++){
    const anchoP = 6;
    const c = ventana(8 + p*paso, anchoP);
    if (c < 0) continue;
    const fila = (p % 2 === 0) ? pisoY-6 : pisoY-3;
    for (let k=0;k<anchoP;k++) filas[fila][c+k] = '=';
    filas[fila-1][c+2] = 'o'; filas[fila-1][c+3] = 'o';  // pelotas sobre la plataforma
  }
  // 3) Enemigos, sobre piso firme y lejos del arranque.
  for (let e=0; e<cfg.enemigos; e++){
    const c = ventana(12 + e*paso, 3, 2);   // 4 tiles de aire entre un enemigo y cualquier pozo
    if (c >= 0 && filas[pisoY-1][c+1] === ' ') filas[pisoY-1][c+1] = 'e';
  }
  // 4) Pinches, apoyados sobre '#' y nunca pegados al arranque ni a la meta.
  for (let s=0; s<cfg.pinches; s++){
    const c = ventana(18 + s*paso, 2, 2);   // idem para los pinches
    if (c > 6 && c < W-10 && filas[pisoY-1][c] === ' ') filas[pisoY-1][c] = '^';
  }
  // 5) Pelotas sueltas a nivel del piso.
  for (let b=0; b<cfg.plats+1; b++){
    const c = ventana(10 + b*paso + 3, 1);
    if (c >= 0 && filas[pisoY-1][c] === ' ') filas[pisoY-1][c] = 'o';
  }
  // 6) Arranque y meta.
  filas[pisoY-1][2] = 'P';
  filas[pisoY-1][W-4] = 'F';
  return { n:cfg.n, cielo:cfg.cielo, fondo:cfg.fondo, mapa: filas.map(f=>f.join('')) };
}
const NIVELES = NIVELES_SPEC.map(construirNivel);

const TILE = 22;
const GRAV = 0.62;
const VEL = 2.9;
const SALTO = -12.2;   // el salto llegaba justo al borde del pozo de 44px y todo dependia del cuadro exacto
const CAIDA_MAX = 11;          // menor que TILE: nunca se atraviesa un piso
const PASO = 1000/60;          // el mundo avanza a 60 pasos por segundo

let P = null;                  // estado de la partida
let raf = null, acum = 0, ultT = 0;

function esc(s){ return window.escH ? window.escH(s) : String(s==null?'':s); }

// ── CARGA DE NIVEL ────────────────────────────────────────────────────────────
function cargarNivel(i){
  const N = NIVELES[i];
  const mapa = N.mapa.map(f=>f.split(''));
  const alto = mapa.length, ancho = Math.max(...mapa.map(f=>f.length));
  mapa.forEach(f=>{ while(f.length < ancho) f.push(' '); });
  const pelotas = [], enemigos = [], pinches = [];
  let inicio = { x:2*TILE, y:2*TILE }, meta = { x:(ancho-3)*TILE, y:2*TILE };
  for (let y=0;y<alto;y++){
    for (let x=0;x<ancho;x++){
      const c = mapa[y][x];
      if (c === 'o'){ pelotas.push({ x:x*TILE+TILE/2, y:y*TILE+TILE/2, tomada:false }); mapa[y][x] = ' '; }
      else if (c === 'e'){ enemigos.push({ x:x*TILE, y:y*TILE, vx:1.15, vivo:true, w:18, h:18 }); mapa[y][x] = ' '; }
      else if (c === 'P'){ inicio = { x:x*TILE, y:y*TILE }; mapa[y][x] = ' '; }
      else if (c === 'F'){ meta = { x:x*TILE, y:y*TILE }; mapa[y][x] = ' '; }
      else if (c === '^'){ pinches.push({ x:x*TILE, y:y*TILE }); }
    }
  }
  P.mapa = mapa; P.ancho = ancho; P.alto = alto;
  P.pelotas = pelotas; P.enemigos = enemigos; P.pinches = pinches;
  P.meta = meta; P.inicio = inicio;
  P.nivel = i; P.nombreNivel = N.n; P.cielo = N.cielo; P.fondo = N.fondo;
  reubicar();
}
function reubicar(){
  P.j = { x:P.inicio.x, y:P.inicio.y, vx:0, vy:0, w:15, h:20, piso:false, dir:1, inv:0, paso:0 };
  P.cam = 0;
  P.ganado = false;
  P.tiros = []; P.misTiros = []; P.recargaPatada = 0;
}
// ¿El tile de esa coordenada es sólido?
function solido(px, py){
  const tx = Math.floor(px/TILE), ty = Math.floor(py/TILE);
  if (tx < 0 || tx >= P.ancho) return true;         // paredes invisibles a los costados
  if (ty < 0) return false;
  if (ty >= P.alto) return false;                   // abajo se cae al vacío
  const c = P.mapa[ty][tx];
  return c === '#' || c === '=';
}
// Caja SEMIABIERTA: el borde derecho e inferior se miden un pelo hacia adentro.
// Con la caja cerrada, estar parado sobre el piso ya contaba como choque (los pies
// caen justo en el límite del tile) y el eje X lo leía como una pared: el muñeco
// se teletransportaba un tile por cuadro.
const EPS = 0.01;
function chocaCaja(x, y, w, h){
  const x2 = x + w - EPS, y2 = y + h - EPS;
  return solido(x, y) || solido(x2, y) || solido(x, y2) || solido(x2, y2)
      || solido(x + w/2, y) || solido(x + w/2, y2);
}

// ── FÍSICA (un paso fijo) ─────────────────────────────────────────────────────
function paso(){
  if (!P || P.fin || P.pausa) return;
  const j = P.j;
  if (P.ganado){ return; }

  // Movimiento horizontal
  j.vx = 0;
  if (P.k.izq) { j.vx = -VEL; j.dir = -1; }
  if (P.k.der) { j.vx =  VEL; j.dir =  1; }
  if (j.vx !== 0) j.paso += 0.22;

  // Eje X. Al chocar se ENCAJA contra el borde exacto del tile. Retroceder de a
  // un píxel parece equivalente pero no lo es: se pasa del punto de contacto y
  // el error se acumula cuadro a cuadro (así el muñeco terminaba flotando).
  let nx = j.x + j.vx;
  if (j.vx !== 0 && chocaCaja(nx, j.y, j.w, j.h)){
    if (j.vx > 0) nx = Math.floor((nx + j.w) / TILE) * TILE - j.w - EPS;
    else          nx = (Math.floor(nx / TILE) + 1) * TILE + EPS;
  }
  j.x = nx;

  // Salto
  if (P.k.salto && j.piso){ j.vy = SALTO; j.piso = false; P.k.salto = false; }
  // Gravedad
  j.vy = Math.min(CAIDA_MAX, j.vy + GRAV);

  // Eje Y, con el mismo encaje exacto.
  let ny = j.y + j.vy;
  j.piso = false;
  if (chocaCaja(j.x, ny, j.w, j.h)){
    if (j.vy > 0){                                 // venía cayendo: apoya
      ny = Math.floor((ny + j.h) / TILE) * TILE - j.h;
      j.piso = true;
    } else {                                       // se golpeó la cabeza
      ny = (Math.floor(ny / TILE) + 1) * TILE;
    }
    j.vy = 0;
  }
  j.y = ny;

  // Bordes del mundo
  if (j.x < 0) j.x = 0;
  if (j.x > (P.ancho-1)*TILE) j.x = (P.ancho-1)*TILE;

  if (j.inv > 0) j.inv--;

  // Caer al vacío
  if (j.y > P.alto*TILE + 40){ perderVida(); return; }

  // Pinches
  for (const s of P.pinches){
    if (j.x + j.w > s.x+3 && j.x < s.x+TILE-3 && j.y + j.h > s.y+6 && j.y < s.y+TILE){
      perderVida(); return;
    }
  }

  // Pelotas
  for (const b of P.pelotas){
    if (b.tomada) continue;
    if (Math.abs((j.x+j.w/2) - b.x) < 14 && Math.abs((j.y+j.h/2) - b.y) < 15){
      b.tomada = true; P.puntos += 100; P.pelotasTomadas++;
    }
  }

  // ── TU PATADA ──
  // Podes defenderte: pateas una pelota y el rival que le pegue queda afuera.
  P.misTiros = P.misTiros || [];
  if (P.k.patear && (P.recargaPatada||0) <= 0){
    P.recargaPatada = 26;
    P.misTiros.push({ x:j.x + (j.dir>0? j.w+2 : -6), y:j.y + 9, vx: j.dir*5.2, r:5, vida:80, giro:0 });
    j.pateando = 10;
  }
  P.k.patear = false;
  if (P.recargaPatada > 0) P.recargaPatada--;
  if (j.pateando > 0) j.pateando--;
  for (let i=P.misTiros.length-1; i>=0; i--){
    const t = P.misTiros[i];
    t.x += t.vx; t.giro += 0.35;
    if (--t.vida <= 0 || chocaCaja(t.x-t.r, t.y-t.r, t.r*2, t.r*2)){ P.misTiros.splice(i,1); continue; }
    let pego = false;
    for (const e of P.enemigos){
      if (!e.vivo) continue;
      if (t.x + t.r > e.x && t.x - t.r < e.x + e.w && t.y + t.r > e.y && t.y - t.r < e.y + e.h){
        e.vivo = false; P.puntos += 150; pego = true; break;
      }
    }
    if (pego) P.misTiros.splice(i,1);
  }
  // ── PELOTAZOS ──
  // Los rivales no solo caminan: te tiran pelotas y hay que esquivarlas.
  P.tiros = P.tiros || [];
  for (const e of P.enemigos){
    if (!e.vivo) continue;
    const cerca = Math.abs(e.x - j.x) < 105 && Math.abs(e.y - j.y) < 24 && j.piso;
    e.recarga = (e.recarga || 0) - 1;
    if (cerca && e.recarga <= 0){
      e.recarga = 380 + Math.floor(Math.random()*200);
      P.tiros.push({ x:e.x + e.w/2, y:e.y + 6, vx: (j.x < e.x ? -1.9 : 1.9), r:5, vida:70 });
    }
  }
  for (let i=P.tiros.length-1; i>=0; i--){
    const t = P.tiros[i];
    t.x += t.vx;
    t.giro = (t.giro || 0) + 0.25;
    if (--t.vida <= 0){ P.tiros.splice(i,1); continue; }
    if (t.x < P.cam - 200 || t.x > P.cam + 1400){ P.tiros.splice(i,1); continue; }
    if (j.x + j.w > t.x - t.r && j.x < t.x + t.r && j.y + j.h > t.y - t.r && j.y < t.y + t.r){
      P.tiros.splice(i,1);
      if (j.inv <= 0){ perderVida(); return; }
    }
  }
  for (const e of P.enemigos){
    if (!e.vivo) continue;
    // Camina y se da vuelta contra una pared o al borde de la plataforma.
    let ex = e.x + e.vx;
    const hayPiso = solido(ex + (e.vx>0 ? e.w : 0), e.y + e.h + 2);
    if (chocaCaja(ex, e.y, e.w, e.h) || !hayPiso){ e.vx = -e.vx; }
    else e.x = ex;
    // Le caen encima: muere. De costado: perdés vida.
    const chocan = j.x + j.w > e.x && j.x < e.x + e.w && j.y + j.h > e.y && j.y < e.y + e.h;
    if (chocan){
      const desdeArriba = (j.vy > 0) && ((j.y + j.h) - e.y < 13);
      if (desdeArriba){ e.vivo = false; P.puntos += 200; j.vy = SALTO * 0.62; }
      else if (j.inv <= 0){ perderVida(); return; }
    }
  }

  // Meta
  if (j.x + j.w > P.meta.x && j.x < P.meta.x + TILE && Math.abs(j.y - P.meta.y) < TILE*2.2){
    P.ganado = true;
    P.puntos += 500 + P.vidas*150;
    setTimeout(siguienteNivel, 900);
  }

  // Cámara
  const vista = P.cnv ? P.cnv.width / P.zoom : 320;
  P.cam = Math.max(0, Math.min(P.ancho*TILE - vista, j.x - vista/2));
}
function perderVida(){
  P.vidas--;
  if (P.vidas < 0){ P.fin = 'perdiste'; avisarDesafio(false); dibujar(); return; }
  reubicar();
  P.j.inv = 70;
}
function siguienteNivel(){
  if (!P) return;
  if (P.nivel + 1 >= NIVELES.length){ P.fin = 'ganaste'; avisarDesafio(true); dibujar(); return; }
  cargarNivel(P.nivel + 1);
  dibujar();
}

// ── DIBUJO ────────────────────────────────────────────────────────────────────
function dibujar(){
  if (!P || !P.ctx) return;
  const c = P.ctx, W = P.cnv.width, H = P.cnv.height, Z = P.zoom;
  c.setTransform(1,0,0,1,0,0);
  // Cielo
  const g = c.createLinearGradient(0,0,0,H);
  g.addColorStop(0, P.cielo[0]); g.addColorStop(1, P.cielo[1]);
  c.fillStyle = g; c.fillRect(0,0,W,H);
  fondoDecorado(c, W, H, Z);
  c.setTransform(Z,0,0,Z, -P.cam*Z, 0);

  // Tiles
  const x0 = Math.floor(P.cam/TILE) - 1, x1 = x0 + Math.ceil((W/Z)/TILE) + 2;
  for (let y=0;y<P.alto;y++){
    for (let x=Math.max(0,x0); x<Math.min(P.ancho,x1); x++){
      const t = P.mapa[y][x]; if (t !== '#' && t !== '=') continue;
      const px = x*TILE, py = y*TILE;
      if (t === '#'){
        c.fillStyle = '#6b4a28'; c.fillRect(px,py,TILE,TILE);
        c.fillStyle = '#3f9a3f'; c.fillRect(px,py,TILE,5);
        c.fillStyle = '#57381d'; c.fillRect(px,py+TILE-3,TILE,3);
        c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(px+TILE-2,py,2,TILE);
      } else {
        c.fillStyle = '#8a6a3a'; c.fillRect(px,py,TILE,8);
        c.fillStyle = '#a98a56'; c.fillRect(px,py,TILE,3);
        c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(px,py+8,TILE,2);
      }
    }
  }
  // Pinches
  c.fillStyle = '#c0c6cc';
  P.pinches.forEach(s=>{
    if (s.x < P.cam-TILE || s.x > P.cam + W/Z + TILE) return;
    for (let k=0;k<3;k++){
      c.beginPath();
      c.moveTo(s.x + k*7 + 1, s.y + TILE);
      c.lineTo(s.x + k*7 + 4, s.y + 7);
      c.lineTo(s.x + k*7 + 7, s.y + TILE);
      c.closePath(); c.fill();
    }
  });
  // Meta
  const m = P.meta;
  // Un ARCO con red: es un juego de futbol, la meta no puede ser una banderita.
  const aY = m.y + TILE, aH = 44, aW = 54;
  c.fillStyle = 'rgba(255,255,255,.10)'; c.fillRect(m.x, aY-aH, aW, aH);
  c.strokeStyle = 'rgba(255,255,255,.30)'; c.lineWidth = 1;
  for (let k=4;k<aW;k+=7){ c.beginPath(); c.moveTo(m.x+k, aY-aH); c.lineTo(m.x+k, aY); c.stroke(); }
  for (let k=6;k<aH;k+=7){ c.beginPath(); c.moveTo(m.x, aY-k); c.lineTo(m.x+aW, aY-k); c.stroke(); }
  c.fillStyle = P.ganado ? A : '#f2f2ea';
  c.fillRect(m.x-3, aY-aH-4, aW+6, 5);          // travesano
  c.fillRect(m.x-3, aY-aH-4, 5, aH+4);          // palo izq
  c.fillRect(m.x+aW-2, aY-aH-4, 5, aH+4);       // palo der

  // Pelotas
  P.pelotas.forEach(b=>{
    if (b.tomada) return;
    if (b.x < P.cam-TILE || b.x > P.cam + W/Z + TILE) return;
    pelotaSVG(c, b.x, b.y, 7, 0);
  });
  // Enemigos
  P.enemigos.forEach(e=>{
    if (!e.vivo) return;
    if (e.x < P.cam-TILE*2 || e.x > P.cam + W/Z + TILE*2) return;
    const rc = P.rivalCol || ['#b02a2a','#ffffff'];
    c.fillStyle = '#1a1a2a'; c.fillRect(e.x+3, e.y+13, 4, 5); c.fillRect(e.x+e.w-7, e.y+13, 4, 5);
    c.fillStyle = rc[0]; c.fillRect(e.x+1, e.y+5, e.w-2, 9);
    c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(e.x+1, e.y+11, e.w-2, 3);
    c.fillStyle = rc[0]; c.fillRect(e.x-1, e.y+6, 3, 6); c.fillRect(e.x+e.w-2, e.y+6, 3, 6);
    c.fillStyle = '#d9a07a'; c.fillRect(e.x+5, e.y-1, 8, 7);
    c.fillStyle = '#20140c'; c.fillRect(e.x+5, e.y-1, 8, 3);
    c.fillStyle = '#111'; c.fillRect(e.vx>0? e.x+10 : e.x+6, e.y+3, 2, 2);
  });
  // Mis pelotazos
  (P.misTiros||[]).forEach(t=>{
    if (t.x < P.cam-30 || t.x > P.cam + W/Z + 30) return;
    c.save(); c.shadowColor = A; c.shadowBlur = 8;
    pelotaSVG(c, t.x, t.y, t.r, t.giro);
    c.restore();
  });
  // Pelotazos en el aire
  (P.tiros||[]).forEach(t=>{
    if (t.x < P.cam-30 || t.x > P.cam + W/Z + 30) return;
    pelotaSVG(c, t.x, t.y, t.r + 1, t.giro);
  });
  // Jugador
  dibujarJugador(c);

  c.setTransform(1,0,0,1,0,0);
  hud(c, W);
  if (P.fin) pantallaFin(c, W, H);
}
function dibujarJugador(c){
  const j = P.j;
  if (j.inv > 0 && Math.floor(j.inv/4) % 2 === 0) return;   // parpadea al revivir
  const col = P.colores || ['#4aa3df','#ffffff'];
  const x = j.x, y = j.y;
  const anda = (j.vx !== 0 && j.piso) ? Math.sin(j.paso)*2 : 0;
  // piernas
  c.fillStyle = '#1a1a2a';
  c.fillRect(x+2, y+14, 5, 6+anda);
  c.fillRect(x+8, y+14, 5, 6-anda);
  // botines
  c.fillStyle = '#111';
  c.fillRect(x+1, y+19+anda, 6, 2);
  c.fillRect(x+8, y+19-anda, 6, 2);
  // camiseta
  c.fillStyle = col[0];
  c.fillRect(x+1, y+6, 13, 9);
  c.fillStyle = 'rgba(0,0,0,.16)'; c.fillRect(x+1, y+12, 13, 3);
  // brazos
  c.fillStyle = col[0]; c.fillRect(x-1, y+7, 3, 6); c.fillRect(x+13, y+7, 3, 6);
  // número
  c.fillStyle = col[1]; c.font = 'bold 6px Outfit, Arial'; c.textAlign = 'center';
  c.fillText(String(P.num||10), x+7.5, y+13);
  // cabeza
  c.fillStyle = P.piel || '#e0a878'; c.fillRect(x+3, y, 9, 7);
  c.fillStyle = P.pelo || '#2b1b10'; c.fillRect(x+3, y, 9, 3);
  c.fillStyle = '#111';
  c.fillRect(j.dir > 0 ? x+9 : x+4, y+4, 2, 2);
  c.textAlign = 'left';
}
function fondoDecorado(c, W, H, Z){
  const off = -(P.cam*0.35) % 220;
  if (P.fondo === 'estadio' || P.fondo === 'noche'){
    c.fillStyle = P.fondo === 'noche' ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.14)';
    for (let i=-1;i<W/60+2;i++) c.fillRect(off*0.4 + i*60, H*0.28, 44, H*0.4);
    if (P.fondo === 'noche'){
      c.fillStyle = 'rgba(255,255,255,.75)';
      for (let i=0;i<26;i++) c.fillRect((i*97)%W, (i*53)%(H*0.4), 2, 2);
    }
  } else {
    c.fillStyle = 'rgba(255,255,255,.5)';
    for (let i=-1;i<W/220+2;i++){
      const bx = off + i*220;
      c.beginPath(); c.arc(bx, H*0.2, 20, 0, Math.PI*2); c.arc(bx+22, H*0.2, 26, 0, Math.PI*2); c.arc(bx+46, H*0.2, 18, 0, Math.PI*2); c.fill();
    }
  }
}
// Pelota con gajos. Antes era un circulo blanco con un punto negro en el medio y
// parecia un ojo mirandote.
function pelotaSVG(c, x, y, r, giro){
  c.save(); c.translate(x, y); c.rotate(giro || 0);
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI*2);
  const g = c.createRadialGradient(-r*0.3, -r*0.4, r*0.15, 0, 0, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#cfd4d8');
  c.fillStyle = g; c.fill();
  c.strokeStyle = '#2a2f35'; c.lineWidth = Math.max(1, r*0.16); c.stroke();
  // pentagono central y tres gajos: se lee como pelota aunque sea chiquita
  c.fillStyle = '#2a2f35';
  c.beginPath();
  for (let k=0;k<5;k++){
    const a = -Math.PI/2 + k*Math.PI*2/5, rr = r*0.42;
    k ? c.lineTo(Math.cos(a)*rr, Math.sin(a)*rr) : c.moveTo(Math.cos(a)*rr, Math.sin(a)*rr);
  }
  c.closePath(); c.fill();
  c.lineWidth = Math.max(1, r*0.13);
  for (let k=0;k<5;k++){
    const a = -Math.PI/2 + k*Math.PI*2/5;
    c.beginPath();
    c.moveTo(Math.cos(a)*r*0.42, Math.sin(a)*r*0.42);
    c.lineTo(Math.cos(a)*r*0.95, Math.sin(a)*r*0.95);
    c.stroke();
  }
  c.restore();
}
function corazon(c, x, y, r, lleno){
  c.beginPath();
  c.moveTo(x, y + r*0.75);
  c.bezierCurveTo(x - r*1.4, y - r*0.5, x - r*0.5, y - r*1.3, x, y - r*0.45);
  c.bezierCurveTo(x + r*0.5, y - r*1.3, x + r*1.4, y - r*0.5, x, y + r*0.75);
  c.closePath();
  if (lleno){ c.fillStyle = '#ff3b52'; c.fill(); c.strokeStyle = '#7a0d1c'; }
  else { c.fillStyle = 'rgba(255,255,255,.10)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,.35)'; }
  c.lineWidth = 2; c.stroke();
}
function hud(c, W){
  const h = 46;
  const g = c.createLinearGradient(0,0,0,h);
  g.addColorStop(0,'rgba(60,20,14,.95)'); g.addColorStop(1,'rgba(30,10,7,.92)');
  c.fillStyle = g; c.fillRect(0,0,W,h);
  c.fillStyle = 'rgba(255,255,255,.16)'; c.fillRect(0,h-3,W,3);
  // Vidas, a la izquierda y bien visibles
  for (let i=0;i<3;i++) corazon(c, 24 + i*30, 22, 10, i <= P.vidas);
  // Puntos
  c.font = '900 13px Outfit, Arial'; c.textAlign = 'left';
  c.fillStyle = 'rgba(255,255,255,.6)'; c.fillText('PUNTOS', 128, 17);
  c.fillStyle = '#ffd75e'; c.font = '900 20px Outfit, Arial'; c.fillText(String(P.puntos).padStart(6,'0'), 128, 37);
  // Pelotas juntadas
  c.fillStyle = '#fff'; c.beginPath(); c.arc(244, 24, 9, 0, Math.PI*2); c.fill();
  c.strokeStyle='#222'; c.lineWidth=1.5; c.stroke();
  c.fillStyle='#222'; c.beginPath(); c.arc(244,24,3,0,Math.PI*2); c.fill();
  c.fillStyle = '#fff'; c.font = '900 17px Outfit, Arial'; c.fillText('x ' + (P.pelotasTomadas||0), 258, 30);
  // Nivel
  c.fillStyle = A; c.font = '900 14px Outfit, Arial'; c.textAlign = 'right';
  c.fillText(P.nombreNivel + '  ' + (P.nivel+1) + '/' + NIVELES.length, W-14, 29);
  c.textAlign = 'left';
}
function pantallaFin(c, W, H){
  c.fillStyle = 'rgba(4,7,4,.86)'; c.fillRect(0,0,W,H);
  const gano = P.fin === 'ganaste';
  c.textAlign = 'center';
  c.fillStyle = gano ? A : '#ff6b6b';
  c.font = 'bold 30px Outfit, Arial';
  c.fillText(gano ? '¡CAMPEÓN!' : 'SE ACABÓ', W/2, H/2 - 14);
  c.fillStyle = '#fff'; c.font = 'bold 15px Outfit, Arial';
  c.fillText(P.puntos + ' puntos', W/2, H/2 + 12);
  c.fillStyle = '#9aa48f'; c.font = '12px Outfit, Arial';
  c.fillText(gano ? 'Terminaste los cuatro niveles.' : 'Tocá REINTENTAR para volver a empezar.', W/2, H/2 + 34);
  c.textAlign = 'left';
}

// ── BUCLE ─────────────────────────────────────────────────────────────────────
function loop(t){
  if (!P) return;
  if (!ultT) ultT = t;
  let dt = t - ultT; ultT = t;
  if (dt > 250) dt = 250;                 // volvés de otra pestaña: no simules un minuto
  acum += dt;
  let n = 0;
  while (acum >= PASO && n < 6){ paso(); acum -= PASO; n++; }
  dibujar();
  raf = requestAnimationFrame(loop);
}

// ── PANTALLA ──────────────────────────────────────────────────────────────────
function overlay(){
  let m = document.getElementById('plat-modal');
  if (!m){
    m = document.createElement('div');
    m.id = 'plat-modal';
    m.style.cssText = 'position:fixed;inset:0;z-index:100062;background:#050805;overflow:hidden;';
    document.body.appendChild(m);
  }
  return m;
}
function montarCanvas(){
  const m = overlay();
  m.innerHTML = `
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;">
    <div style="flex:1;position:relative;overflow:hidden;">
      <canvas id="plat-cnv" style="position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;touch-action:none;"></canvas>

      <div id="plat-reintentar" style="display:none;position:absolute;left:50%;bottom:22%;transform:translateX(-50%);z-index:5;">
        <button onclick="window._platReiniciar()" style="background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:13px;padding:13px 26px;font-weight:900;font-size:14px;cursor:pointer;">REINTENTAR</button>
      </div>
    </div>
    <div id="plat-mandos" style="flex:0 0 auto;display:flex;gap:10px;padding:12px 14px calc(14px + env(safe-area-inset-bottom));background:rgba(6,10,6,.9);">
      <button data-k="izq" style="flex:1;background:rgba(255,255,255,.07);border:1.5px solid #2a3222;color:#e0e4dc;border-radius:14px;padding:17px;font-size:22px;cursor:pointer;user-select:none;"><i class='bx bx-left-arrow-alt'></i></button>
      <button data-k="der" style="flex:1;background:rgba(255,255,255,.07);border:1.5px solid #2a3222;color:#e0e4dc;border-radius:14px;padding:17px;font-size:22px;cursor:pointer;user-select:none;"><i class='bx bx-right-arrow-alt'></i></button>
      <button data-k="patear" style="flex:1;background:rgba(255,214,94,.16);border:1.5px solid rgba(255,214,94,.55);color:#ffd65e;border-radius:14px;padding:17px;font-weight:900;font-size:14px;cursor:pointer;user-select:none;">PATEAR</button>
      <button data-k="salto" style="flex:1.5;background:${A}22;border:1.5px solid ${A}66;color:${A};border-radius:14px;padding:17px;font-weight:900;font-size:15px;cursor:pointer;user-select:none;">SALTAR</button>
    </div>
  </div>`;
  const cnv = document.getElementById('plat-cnv');
  P.cnv = cnv; P.ctx = cnv.getContext('2d');
  ajustar();
  // Mandos táctiles: sostener funciona, no hace falta repetir el toque.
  m.querySelectorAll('#plat-mandos button').forEach(b=>{
    const k = b.getAttribute('data-k');
    // Saltar y patear son de UN toque; las flechas se sostienen.
    const on = ev=>{ ev.preventDefault(); P.k[k] = true; };
    const off = ev=>{ ev.preventDefault(); if (k!=='salto' && k!=='patear') P.k[k] = false; };
    b.addEventListener('touchstart', on, {passive:false});
    b.addEventListener('touchend', off, {passive:false});
    b.addEventListener('touchcancel', off, {passive:false});
    b.addEventListener('mousedown', on);
    b.addEventListener('mouseup', off);
    b.addEventListener('mouseleave', off);
  });
}
function ajustar(){
  if (!P || !P.cnv) return;
  const r = P.cnv.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  P.cnv.width = Math.round(r.width * dpr);
  P.cnv.height = Math.round(r.height * dpr);
  // Zoom para que entren ~15 tiles de alto sin importar la pantalla.
  P.zoom = Math.max(1.2, (P.cnv.height / (11.5*TILE)));
}
function teclado(e, abajo){
  if (!P) return;
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A'){ P.k.izq = abajo; e.preventDefault(); }
  if (k === 'ArrowRight' || k === 'd' || k === 'D'){ P.k.der = abajo; e.preventDefault(); }
  if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W'){ if (abajo) P.k.salto = true; e.preventDefault(); }
  if (k === 'ArrowDown' || k === 's' || k === 'S' || k === 'x' || k === 'X'){ if (abajo) P.k.patear = true; e.preventDefault(); }
}

// ── ENTRADA ───────────────────────────────────────────────────────────────────
// Modo DESAFIO: el juego decide algo de la carrera (una final, un titulo). Se
// avisa el resultado UNA sola vez y de ahi el juego se cierra solo.
function avisarDesafio(gano){
  if (!P || !P.desafio || P._avisado) return;
  P._avisado = true;
  const cb = P.onFin;
  setTimeout(function(){ try { window._platSalir(); } catch(e){} try { cb && cb(gano); } catch(e){} }, 1900);
}
window._platAbrir = function(opts){
  opts = opts || {};
  P = {
    k:{ izq:false, der:false, salto:false, patear:false },
    vidas:2, puntos:0, pelotasTomadas:0, fin:null, pausa:false,
    apellido: opts.apellido || 'CANCHERO',
    num: opts.num || 10,
    colores: opts.colores || ['#4aa3df','#ffffff'],
    zoom: 2,
    desafio: !!opts.desafio, onFin: opts.onFin || null, titulo: opts.titulo || null,
    piel: opts.piel || null, pelo: opts.pelo || null,
    rivalCol: (function(){
      const mio = (opts.colores||['#4aa3df'])[0], suyo = (opts.rivalCol||['#b02a2a'])[0];
      const dist = (a,b)=>{ const h=x=>parseInt(x.slice(1),16); const A=h(a),B=h(b);
        return Math.abs((A>>16)-(B>>16)) + Math.abs(((A>>8)&255)-((B>>8)&255)) + Math.abs((A&255)-(B&255)); };
      return dist(mio,suyo) < 120 ? ['#b02a2a','#ffffff'] : (opts.rivalCol||['#b02a2a','#ffffff']);
    })(), rival: opts.rival || null
  };
  cargarNivel(0);
  montarCanvas();
  P.onResize = ()=>{ ajustar(); };
  window.addEventListener('resize', P.onResize);
  P.onKeyDown = e=>teclado(e,true); P.onKeyUp = e=>teclado(e,false);
  window.addEventListener('keydown', P.onKeyDown);
  window.addEventListener('keyup', P.onKeyUp);
  acum = 0; ultT = 0;
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
  // El botón de reintentar aparece solo cuando se terminó.
  P.tickUI = setInterval(()=>{
    const b = document.getElementById('plat-reintentar');
    if (b) b.style.display = P.fin ? 'block' : 'none';
  }, 300);
};
window._platReiniciar = function(){
  if (!P) return;
  P.vidas = 2; P.puntos = 0; P.fin = null;
  cargarNivel(0);
};
window._platSalir = function(){
  if (P){
    window.removeEventListener('resize', P.onResize);
    window.removeEventListener('keydown', P.onKeyDown);
    window.removeEventListener('keyup', P.onKeyUp);
    clearInterval(P.tickUI);
  }
  cancelAnimationFrame(raf); raf = null;
  P = null;
  document.getElementById('plat-modal')?.remove();
  const vuelta = window._platVolverA;
  window._platVolverA = null;
  if (typeof vuelta === 'function'){ try { vuelta(); } catch(e){} }
};

// Se expone para poder probar la física sin navegador.
window.__platTest = { NIVELES, cargar:(i)=>{ P = { k:{}, vidas:2, puntos:0, fin:null, zoom:2 }; cargarNivel(i); return P; },
  paso:()=>paso(), estado:()=>P, TILE };

console.log('[canchero-plataformas] cargado');
})();
