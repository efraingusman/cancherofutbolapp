/**
 * canchero-carrera.js — Modo Carrera (simulador de carrera futbolística)
 * Empezás desde el fútbol amateur / la calle, te hacés ver por un ojeador y escalás
 * (o no) según tus decisiones — futbolísticas, económicas y sociales. Cada temporada
 * envejecés, podés fichar a otros clubes con tu dinero, ganar títulos y hacer historia.
 * Decisiones inspiradas INDIRECTAMENTE en arcos reales de jugadores (sin nombres reales).
 * Guardado local (localStorage) + opcional Supabase (career_saves). Se lanza con
 * window._carreraStart() desde el hub de juegos.
 */
(function(){
'use strict';
const A = '#baff00';
const LS = 'canchero_carrera_save_v1';
function esc(s){ return window.escH ? window.escH(s) : String(s==null?'':s); }
function me(){ return window.userData || {}; }

const TIERS = ['Amateur','Regional','Profesional','Internacional','Elite','Leyenda'];
const POS = ['Arquero','Defensor','Mediocampista','Delantero'];
const PAISES = ['Uruguay','Argentina','Brasil','Colombia','México','España','Francia','Nigeria'];

let G = null; // estado del juego

function nuevo(p){
  return {
    nombre: p.nombre, pais: p.pais, pos: p.pos, num: p.num,
    club: p.club || 'Club de barrio', tierIdx: 0,
    edad: 16, hab: 45, fama: 5, moral: 70, dinero: 0,
    titulos: 0, temporada: 1, hist: [], creado: Date.now()
  };
}
function tier(){ return TIERS[G.tierIdx]; }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

// ── BANCO DE EVENTOS (decisiones) ─────────────────────────────────────────────
// cada evento: { t:titulo, d:desc, req(g):bool opcional, min/maxTier, opts:[{txt, ef(g), res}] }
// ef(g) aplica efectos y devuelve un texto de resultado.
const EVENTOS = [
  { t:'Picadito en el potrero', d:'Se arma un picado en la canchita del barrio contra los más grandes. Podés arriesgar tus gambetas o jugar seguro.', maxTier:1,
    opts:[
      { txt:'Gambetear a todos (arriesgado)', ef:g=>{ const ok=Math.random()<.6; g.hab+=ok?4:1; g.fama+=ok?4:0; g.moral+=ok?6:-4; return ok?'Dejaste a tres en el camino. El barrio habla de vos.':'Te la sacaron y quedaste expuesto, pero aprendiste.'; } },
      { txt:'Jugar simple y asistir', ef:g=>{ g.hab+=2; g.moral+=2; return 'Jugada sobria, buena asistencia. Sumás de a poco.'; } }
    ] },
  { t:'Un ojeador en la tribuna', d:'Dicen que hay un ojeador de un club regional mirando el partido. Es tu oportunidad.', maxTier:0, req:g=>g.hab>=50,
    opts:[
      { txt:'Salir a comerte la cancha', ef:g=>{ const ok=Math.random()<(g.hab-40)/60+.3; if(ok){ g.tierIdx=1; g.club='Club regional'; g.fama+=10; g.moral+=12; g.dinero+=500; return '¡Te vio y te ofrecieron una prueba! Firmás tu primer contrato regional.'; } g.moral-=6; return 'No tuviste tu mejor día. El ojeador no volvió... por ahora.'; } },
      { txt:'Ponerte nervioso y jugar tranquilo', ef:g=>{ g.moral-=2; return 'Preferiste no arriesgar. La chance pasó, pero seguís sumando.'; } }
    ] },
  { t:'Video viral', d:'Un amigo subió un video tuyo haciendo jueguitos. Puede explotar o quedar en la nada.', maxTier:2,
    opts:[
      { txt:'Meterle contenido y viralizarlo', ef:g=>{ const v=Math.random()<.5; g.fama+=v?15:5; g.moral+=v?8:2; return v?'¡El video explotó! Miles de vistas, clubes preguntan por vos.':'Anduvo ok, sumaste algunos seguidores.'; } },
      { txt:'Enfocarte solo en entrenar', ef:g=>{ g.hab+=4; return 'Nada de redes. Cabeza en el laburo: mejorás tu técnica.'; } }
    ] },
  { t:'Oferta de un club más grande', d:'Llega una oferta para dar el salto de nivel. Más presión, más plata, menos minutos asegurados.', req:g=>g.tierIdx>=1 && g.tierIdx<5 && g.hab>=55,
    opts:[
      { txt:'Aceptar el desafío', ef:g=>{ g.tierIdx=clamp(g.tierIdx+1,0,5); g.dinero+=2000*g.tierIdx; g.fama+=8; g.moral+=5; g.club=tier()+' FC'; return '¡Firmaste con un club de '+tier()+'! El salto es grande.'; } },
      { txt:'Quedarte y ser figura', ef:g=>{ g.fama+=5; g.moral+=8; g.hab+=2; return 'Elegís la continuidad. Sos el ídolo local y jugás todo.'; } }
    ] },
  { t:'Noche de joda antes del partido', d:'Te invitan a salir la noche previa a un partido importante.', minTier:1,
    opts:[
      { txt:'Salir con los amigos', ef:g=>{ const mal=Math.random()<.6; g.moral+=4; g.hab+=mal?-3:0; g.fama+=mal?-2:0; return mal?'Jugaste cansado y rendiste mal. El DT te marcó.':'Zafaste, pero fue un riesgo.'; } },
      { txt:'Quedarte descansando', ef:g=>{ g.hab+=2; g.moral-=1; return 'Profesionalismo. Al otro día rendís bien.'; } }
    ] },
  { t:'Lesión', d:'Sentís una molestia fuerte en el entrenamiento.', minTier:1,
    opts:[
      { txt:'Parar y recuperarte bien', ef:g=>{ g.moral-=6; g.hab+=1; return 'Te perdés unos partidos pero volvés entero.'; } },
      { txt:'Jugar infiltrado', ef:g=>{ const peor=Math.random()<.5; g.hab+=peor?-6:2; g.fama+=peor?0:4; g.moral-=peor?8:0; return peor?'La lesión empeoró. Larga recuperación.':'Aguantaste y fuiste figura. Riesgoso.'; } }
    ] },
  { t:'Cláusula millonaria', d:'Un club de otro país pone una fortuna sobre la mesa. Tu club actual te quiere retener.', req:g=>g.tierIdx>=2 && g.tierIdx<5,
    opts:[
      { txt:'Irte por la plata', ef:g=>{ g.dinero+=8000*(g.tierIdx+1); g.tierIdx=clamp(g.tierIdx+1,0,5); g.moral-=4; g.fama+=10; g.club=tier()+' United'; return '¡Transferencia récord! Más dinero, más presión, lejos de casa.'; } },
      { txt:'Ser leal a tu club', ef:g=>{ g.moral+=12; g.fama+=6; g.dinero+=1000; return 'La hinchada te ama. La lealtad tiene su recompensa emocional.'; } }
    ] },
  { t:'Final de temporada', d:'Tu equipo llega a la definición del título.', minTier:1,
    opts:[
      { txt:'Ser protagonista', ef:g=>{ const gana=Math.random()<clamp((g.hab-40)/80+.3,.2,.85); if(gana){ g.titulos++; g.fama+=12; g.moral+=15; g.dinero+=1500*(g.tierIdx+1); g.hab+=2; return '¡CAMPEÓN! Levantás el trofeo y sos la figura.'; } g.moral-=8; return 'Perdieron la final. Dolió, pero se aprende.'; } }
    ] },
  { t:'Tentación fácil', d:'Alguien te ofrece un negocio turbio para ganar plata rápida fuera de la cancha.', minTier:2,
    opts:[
      { txt:'Aceptar (riesgoso)', ef:g=>{ const mal=Math.random()<.5; g.dinero+=mal?0:5000; g.fama+=mal?-15:0; g.moral+=mal?-15:2; return mal?'Se supo todo. Escándalo, tu imagen cae fuerte.':'Salió bien... esta vez.'; } },
      { txt:'Rechazar y seguir limpio', ef:g=>{ g.moral+=6; return 'Buena decisión. Tu carrera va por el camino correcto.'; } }
    ] },
  { t:'Mentoría a un pibe', d:'Un juvenil del club te admira y te pide ayuda.', minTier:2,
    opts:[
      { txt:'Ayudarlo y guiarlo', ef:g=>{ g.moral+=8; g.fama+=4; return 'Te ganás el respeto del vestuario y la afición.'; } },
      { txt:'Ignorarlo, cada uno a lo suyo', ef:g=>{ g.moral-=3; return 'Fría decisión. Algunos compañeros lo notan.'; } }
    ] }
];

function eventoRandom(){
  const pool = EVENTOS.filter(e => (e.minTier==null||G.tierIdx>=e.minTier) && (e.maxTier==null||G.tierIdx<=e.maxTier) && (!e.req||e.req(G)));
  if (!pool.length) return EVENTOS.find(e=>e.t==='Final de temporada');
  return pool[Math.floor(Math.random()*pool.length)];
}

// ── UI ────────────────────────────────────────────────────────────────────────
function overlay(){
  let m = document.getElementById('carrera-modal'); if (m) m.remove();
  m = document.createElement('div'); m.id='carrera-modal';
  m.style.cssText='position:fixed;inset:0;z-index:100060;background:radial-gradient(120% 90% at 50% 0%,#0e1a0a,#070707 72%);overflow-y:auto;-webkit-overflow-scrolling:touch;';
  document.body.appendChild(m); return m;
}
function save(){ try{ localStorage.setItem(LS, JSON.stringify(G)); }catch(e){} }
function load(){ try{ return JSON.parse(localStorage.getItem(LS)||'null'); }catch(e){ return null; } }

window._carreraStart = function(){
  const m = overlay();
  const saved = load();
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:24px 20px calc(30px + env(safe-area-inset-bottom));min-height:100%;display:flex;flex-direction:column;align-items:center;text-align:center;">
    <div style="width:100%;display:flex;justify-content:flex-start;"><button onclick="document.getElementById('carrera-modal').remove();window.openGamesModal&&window.openGamesModal()" style="background:rgba(255,255,255,.06);border:none;color:#aaa;font-size:13px;border-radius:20px;padding:8px 14px;cursor:pointer;"><i class='bx bx-arrow-back'></i> Juegos</button></div>
    <div style="width:96px;height:96px;border-radius:24px;background:rgba(186,255,0,.1);border:1px solid rgba(186,255,0,.3);display:flex;align-items:center;justify-content:center;margin:18px 0 12px;"><i class='bx bx-trophy' style="font-size:50px;color:${A};"></i></div>
    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:28px;color:#fff;">MODO CARRERA</div>
    <div style="font-size:14px;color:#9aa0a6;margin-top:6px;max-width:360px;line-height:1.5;">Empezás en el potrero. Tus decisiones —dentro y fuera de la cancha— escriben tu historia. ¿Llegás a leyenda?</div>
    ${saved ? `<button onclick="window._carreraContinuar()" style="width:100%;max-width:340px;margin-top:24px;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:15px;padding:15px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;"><i class='bx bx-play'></i> CONTINUAR (${esc(saved.nombre)}, ${saved.edad} años)</button>` : ''}
    <button onclick="window._carreraCrear()" style="width:100%;max-width:340px;margin-top:${saved?'10px':'24px'};background:${saved?'rgba(255,255,255,.05)':'linear-gradient(135deg,#16a34a,'+A+')'};color:${saved?'#fff':'#000'};border:${saved?'1px solid #242424':'none'};border-radius:15px;padding:15px;font-weight:900;font-size:15px;cursor:pointer;"><i class='bx bx-user-plus'></i> ${saved?'Nueva carrera':'CREAR JUGADOR'}</button>
  </div>`;
};

window._carreraCrear = function(){
  const m = overlay();
  const u = me();
  m.innerHTML = `
  <div style="max-width:480px;margin:0 auto;padding:22px 20px calc(30px + env(safe-area-inset-bottom));">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;"><button onclick="window._carreraStart()" style="background:rgba(255,255,255,.06);border:none;color:#aaa;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;"><i class='bx bx-arrow-back'></i></button><div style="font-family:Outfit,sans-serif;font-weight:900;font-size:20px;color:#fff;">Creá tu jugador</div></div>
    ${campo('NOMBRE', `<input id="cr-nombre" value="${esc((u.name||'').split(' ')[0]||'')}" placeholder="Tu nombre" style="${inp()}">`)}
    ${campo('PAÍS', `<select id="cr-pais" style="${inp()}">${PAISES.map(p=>`<option ${((u.nat||u.country||'Uruguay'))===p?'selected':''}>${p}</option>`).join('')}</select>`)}
    ${campo('POSICIÓN', `<select id="cr-pos" style="${inp()}">${POS.map(p=>`<option>${p}</option>`).join('')}</select>`)}
    ${campo('NÚMERO', `<input id="cr-num" type="number" min="1" max="99" value="10" style="${inp()}">`)}
    <button onclick="window._carreraIniciar()" style="width:100%;margin-top:12px;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:14px;padding:15px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;">EMPEZAR EN EL POTRERO <i class='bx bx-right-arrow-alt'></i></button>
  </div>`;
};
function campo(l,inner){ return `<div style="margin-bottom:12px;"><label style="font-size:10px;font-weight:800;letter-spacing:1px;color:#666;display:block;margin-bottom:5px;">${l}</label>${inner}</div>`; }
function inp(){ return 'width:100%;background:#161616;border:1px solid #262626;color:#fff;border-radius:11px;padding:12px;font-size:14px;box-sizing:border-box;outline:none;font-family:inherit;'; }

window._carreraIniciar = function(){
  const nombre = (document.getElementById('cr-nombre').value||'').trim() || 'Crack';
  G = nuevo({ nombre, pais:document.getElementById('cr-pais').value, pos:document.getElementById('cr-pos').value, num:parseInt(document.getElementById('cr-num').value)||10 });
  save(); turno();
};
window._carreraContinuar = function(){ G = load(); if(!G){ window._carreraCrear(); return; } turno(); };

function barra(lbl, val, max, col){
  const p = clamp(val/max*100,0,100);
  return `<div style="flex:1;min-width:0;"><div style="display:flex;justify-content:space-between;font-size:9px;font-weight:800;color:#888;margin-bottom:3px;"><span>${lbl}</span><span style="color:${col};">${Math.round(val)}</span></div><div style="height:6px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden;"><div style="height:100%;width:${p}%;background:${col};border-radius:4px;"></div></div></div>`;
}

function turno(){
  if (G.edad >= 37) return retiro();
  const m = document.getElementById('carrera-modal') || overlay();
  const ev = eventoRandom();
  G._ev = ev;
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:20px 18px calc(28px + env(safe-area-inset-bottom));min-height:100%;display:flex;flex-direction:column;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
      <button onclick="window._carreraStart()" style="background:rgba(255,255,255,.06);border:none;color:#aaa;width:32px;height:32px;border-radius:50%;font-size:17px;cursor:pointer;">&times;</button>
      <div style="flex:1;min-width:0;"><div style="font-size:14px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(G.nombre)} <span style="color:${A};">#${G.num}</span></div><div style="font-size:11px;color:#8a8f96;">${esc(G.club)} · ${esc(G.pos)} · ${G.edad} años</div></div>
      <span style="font-size:10px;font-weight:900;letter-spacing:1px;color:${A};background:rgba(186,255,0,.1);border:1px solid rgba(186,255,0,.3);border-radius:7px;padding:4px 9px;">${tier().toUpperCase()}</span>
    </div>
    <div style="display:flex;gap:10px;background:rgba(255,255,255,.03);border:1px solid #1c1c1c;border-radius:12px;padding:11px 13px;margin-bottom:8px;">
      ${barra('HABILIDAD',G.hab,100,'#4fc3f7')}${barra('FAMA',G.fama,100,'#ffcc00')}${barra('MORAL',G.moral,100,'#4ade80')}
    </div>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#9aa0a6;padding:0 4px 14px;"><span><i class='bx bx-dollar' style="color:${A};"></i> $${G.dinero.toLocaleString('es-UY')}</span><span><i class='bx bx-trophy' style="color:${A};"></i> ${G.titulos} títulos</span><span>Temporada ${G.temporada}</span></div>
    <div style="background:linear-gradient(160deg,rgba(186,255,0,.05),rgba(20,22,18,.5));border:1px solid #242424;border-radius:16px;padding:18px 16px;margin-bottom:14px;">
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:18px;color:#fff;margin-bottom:8px;">${esc(ev.t)}</div>
      <div style="font-size:14px;color:#c4ccc0;line-height:1.5;">${esc(ev.d)}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${ev.opts.map((o,i)=>`<button onclick="window._carreraElegir(${i})" style="background:rgba(255,255,255,.04);border:1.5px solid #262626;border-radius:14px;padding:15px 16px;color:#fff;font-size:14.5px;font-weight:700;text-align:left;cursor:pointer;transition:.12s;" onmouseover="this.style.borderColor='${A}'" onmouseout="this.style.borderColor='#262626'">${esc(o.txt)}</button>`).join('')}
    </div>
  </div>`;
}

window._carreraElegir = function(i){
  const ev = G._ev; const opt = ev.opts[i]; if(!opt) return;
  const res = opt.ef(G);
  G.hab=clamp(G.hab,1,99); G.fama=clamp(G.fama,0,100); G.moral=clamp(G.moral,0,100); G.dinero=Math.max(0,G.dinero);
  G.hist.push({ t:ev.t, res, temp:G.temporada });
  // Cada 3 decisiones pasa una temporada (envejece).
  G._pasos = (G._pasos||0)+1;
  if (G._pasos % 3 === 0){ G.temporada++; G.edad++; }
  save();
  const m = document.getElementById('carrera-modal') || overlay();
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:40px 22px;min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
    <div style="width:76px;height:76px;border-radius:50%;background:rgba(186,255,0,.12);border:1px solid rgba(186,255,0,.35);display:flex;align-items:center;justify-content:center;margin-bottom:16px;"><i class='bx bx-message-square-detail' style="font-size:38px;color:${A};"></i></div>
    <div style="font-size:16px;color:#fff;font-weight:700;line-height:1.5;max-width:360px;">${esc(res)}</div>
    <button onclick="window._carreraSiguiente()" style="margin-top:26px;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:14px;padding:14px 30px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;">Seguir <i class='bx bx-right-arrow-alt'></i></button>
  </div>`;
};
window._carreraSiguiente = function(){ if(G.tierIdx>=5 && G.titulos>=5) return retiro(true); turno(); };

function retiro(leyenda){
  const m = document.getElementById('carrera-modal') || overlay();
  const resumen = leyenda ? '¡Te retirás como LEYENDA del fútbol!' : 'Colgaste los botines. Así fue tu carrera:';
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:36px 22px calc(30px + env(safe-area-inset-bottom));min-height:100%;display:flex;flex-direction:column;align-items:center;text-align:center;">
    <div style="width:88px;height:88px;border-radius:50%;background:rgba(186,255,0,.12);border:1px solid rgba(186,255,0,.35);display:flex;align-items:center;justify-content:center;margin-bottom:14px;"><i class='bx ${leyenda?'bx-crown':'bx-medal'}' style="font-size:46px;color:${A};"></i></div>
    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:24px;color:#fff;">${esc(G.nombre)}</div>
    <div style="font-size:13px;color:#9aa0a6;margin:4px 0 18px;">${resumen}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;max-width:360px;margin-bottom:20px;">
      ${stat('NIVEL ALCANZADO',tier())}${stat('TÍTULOS',G.titulos)}${stat('FAMA',Math.round(G.fama))}${stat('DINERO','$'+G.dinero.toLocaleString('es-UY'))}
    </div>
    <button onclick="window._carreraCrear()" style="width:100%;max-width:360px;background:linear-gradient(135deg,#16a34a,${A});color:#000;border:none;border-radius:14px;padding:15px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;">EMPEZAR DE NUEVO</button>
    <button onclick="document.getElementById('carrera-modal').remove();window.openGamesModal&&window.openGamesModal()" style="width:100%;max-width:360px;margin-top:9px;background:transparent;color:#888;border:none;padding:11px;font-weight:800;font-size:13px;cursor:pointer;">Volver a Juegos</button>
  </div>`;
  try{ localStorage.removeItem(LS); }catch(e){}
}
function stat(l,v){ return `<div style="background:rgba(255,255,255,.04);border:1px solid #1e1e1e;border-radius:12px;padding:12px;"><div style="font-size:9px;color:#666;font-weight:800;letter-spacing:1px;">${l}</div><div style="font-size:17px;font-weight:900;color:${A};margin-top:3px;">${esc(v)}</div></div>`; }

console.log('[canchero-carrera] cargado');
})();
