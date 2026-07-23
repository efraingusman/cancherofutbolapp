/**
 * canchero-racha.js — Racha diaria estilo Duolingo
 *
 * Al abrir Canchero cada día se muestra una pantalla grande y celebratoria con la
 * racha, la semana (L M M J V S D con los días cumplidos), un mensaje motivador y
 * el botón de compartir. Reemplaza al toast chiquito de antes.
 *
 * La LÓGICA de contar la racha ya vive en script.js (_updateDailyStreak): este
 * módulo solo se encarga de mostrarla bien. Se le pasa el resultado.
 *
 * Regla de la app: sin emojis en la UI, solo iconos. (El fueguito es un SVG propio.)
 */
(function(){
'use strict';

const R = {};

// Fueguito SVG (no emoji). Tamaño y si está "prendido" (color) o "apagado" (gris).
function llama(size, activo){
  const c1 = activo ? '#ff9500' : '#3a3f45';
  const c2 = activo ? '#ffcc00' : '#4a4f55';
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">
    <path d="M24 3c1 7-4 9-8 14-3 4-4 8-4 12 0 7 5.4 13 12 13s12-6 12-13c0-6-4-10-6-14-1.6 2-3 3-4 3 1-6-1-11-2-15Z" fill="${c1}"/>
    <path d="M24 20c.7 4-2.5 5.5-4.5 8.4-1.3 1.9-1.5 3.6-1.5 5.1 0 3.4 2.7 6 6 6s6-2.6 6-6c0-3-2.2-5-3.5-7.4-.8 1-1.6 1.5-2.2 1.5.6-3-.3-6-.3-7.6Z" fill="${c2}"/>
  </svg>`;
}

// Frase motivadora según la racha (como Duolingo: celebra y empuja al próximo hito).
function mensaje(dias){
  if (dias <= 1) return { t:'¡Arrancó tu racha!', s:'Volvé mañana para llegar a 2 días seguidos.' };
  const proximo = [3,7,15,30,50,100,200,365].find(h => h > dias) || (dias + 1);
  const faltan = proximo - dias;
  const cuenta = faltan === 1 ? 'un día' : (faltan + ' días');
  return { t:'¡Racha de ' + dias + ' días!', s:'Estás a ' + cuenta + ' de tu racha de ' + proximo + ' días.' };
}

// Etiquetas de la semana empezando en lunes; marca los últimos `dias` como cumplidos,
// terminando en hoy.
function semana(dias){
  const nombres = ['L','M','M','J','V','S','D'];
  const hoy = new Date();
  // 0=domingo..6=sabado → índice lunes-primero
  const idxHoy = (hoy.getDay() + 6) % 7;
  return nombres.map((n, i) => {
    // Distancia hacia atrás desde hoy (0 = hoy, 6 = hace 6 días).
    // Un día de la semana está cumplido si cae dentro de los últimos `dias`. Con racha
    // de 7+ toda la semana queda marcada (como Duolingo); los días FUTUROS no.
    const atras = (idxHoy - i + 7) % 7;
    const esFuturo = i > idxHoy;
    const cumplido = !esFuturo && atras < dias;
    return { n, cumplido, esHoy: i === idxHoy };
  });
}

/**
 * Muestra la pantalla grande de racha.
 * Solo una vez por día por usuario (localStorage), para no ser molesto — salvo que
 * se pida explícito con {force:true} (desde el perfil, "ver mi racha").
 */
R.mostrar = function(dias, opts){
  opts = opts || {};
  dias = parseInt(dias) || 0;
  if (dias < 1) return;

  if (!opts.force) {
    try {
      const clave = 'canchero_racha_vista_' + new Date().toISOString().slice(0,10);
      if (localStorage.getItem(clave)) return;         // ya se mostró hoy
      localStorage.setItem(clave, '1');
    } catch(e){}
  }

  const ex = document.getElementById('racha-modal'); if (ex) ex.remove();
  const msg = mensaje(dias);
  const dd = semana(dias);

  const m = document.createElement('div');
  m.id = 'racha-modal';
  m.style.cssText = 'position:fixed;inset:0;z-index:100050;background:radial-gradient(120% 80% at 50% 0%,#1b1200,#0a0a0a 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px 22px calc(28px + env(safe-area-inset-bottom));overflow-y:auto;';
  m.innerHTML = `
    <div style="position:absolute;top:calc(12px + env(safe-area-inset-top));right:16px;">
      <button onclick="document.getElementById('racha-modal').remove()" style="background:rgba(255,255,255,.08);border:none;color:#aaa;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer;line-height:1;">&times;</button>
    </div>

    <div id="racha-fuego" style="filter:drop-shadow(0 0 34px rgba(255,150,0,.5));animation:rachaPop .5s cubic-bezier(.2,1.3,.4,1) both;">
      ${llama(132, true)}
    </div>

    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:64px;color:#ff9f0a;line-height:1;margin-top:6px;text-shadow:0 3px 20px rgba(255,150,0,.35);">${dias}</div>
    <div style="font-family:Outfit,sans-serif;font-weight:800;font-size:15px;color:#ffcc66;letter-spacing:2px;margin-top:2px;">${dias === 1 ? 'DÍA DE RACHA' : 'DÍAS DE RACHA'}</div>

    <!-- Semana -->
    <div style="display:flex;gap:9px;margin:26px 0 4px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:14px 12px;">
      ${dd.map(d => `<div style="display:flex;flex-direction:column;align-items:center;gap:7px;">
        <span style="font-size:11px;font-weight:800;color:${d.esHoy ? '#ff9f0a' : '#8a8f96'};">${d.n}</span>
        <span style="width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;
          background:${d.cumplido ? 'linear-gradient(135deg,#ff9500,#ffcc00)' : 'rgba(255,255,255,.06)'};
          ${d.esHoy && !d.cumplido ? 'border:2px solid #ff9f0a;' : ''}">
          ${d.cumplido ? `<i class='bx bx-check' style="color:#fff;font-size:17px;"></i>` : ''}
        </span>
      </div>`).join('')}
    </div>

    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:18px;color:#fff;margin-top:22px;text-align:center;">${msg.t}</div>
    <div style="font-size:13px;color:#9aa0a6;margin-top:5px;text-align:center;line-height:1.5;max-width:280px;">${msg.s}</div>

    <div style="width:100%;max-width:360px;margin-top:26px;">
      <button onclick="window.CancheroRacha.compartir(${dias})" style="width:100%;background:linear-gradient(135deg,#ff9500,#ffb300);color:#000;border:none;border-radius:15px;padding:15px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;box-shadow:0 8px 26px rgba(255,150,0,.32);"><i class='bx bx-share-alt'></i> COMPARTIR MI RACHA</button>
      <button onclick="document.getElementById('racha-modal').remove()" style="width:100%;background:transparent;color:#8a8f96;border:none;border-radius:15px;padding:13px;font-family:Outfit,sans-serif;font-weight:800;font-size:14px;cursor:pointer;margin-top:6px;">CONTINUAR</button>
    </div>

    <style>
      @keyframes rachaPop { 0%{transform:scale(.4);opacity:0;} 100%{transform:scale(1);opacity:1;} }
      #racha-fuego svg path:first-child { animation: rachaFlicker 1.8s ease-in-out infinite alternate; transform-origin:center bottom; }
      @keyframes rachaFlicker { 0%{transform:scaleY(1) scaleX(1);} 100%{transform:scaleY(1.05) scaleX(.97);} }
    </style>`;
  document.body.appendChild(m);
};

// Compartir la racha: dentro (feed / chat) o fuera de Canchero.
R.compartir = function(dias){
  const texto = 'Llevo ' + dias + (dias === 1 ? ' día' : ' días') + ' de racha en Canchero. ¿Me seguís el ritmo?';
  const url = (location.origin && location.origin.indexOf('http') === 0) ? location.origin : 'https://canchero-app.vercel.app';
  // Se reusa la hoja de compartir de la Hinchada (feed / chat / fuera).
  if (window.CancheroHinchada && window.CancheroHinchada.compartir) {
    window.CancheroHinchada.compartir({ titulo:'Racha de ' + dias + ' días', texto: texto, url: url });
    return;
  }
  if (navigator.share) { navigator.share({ title:'Mi racha en Canchero', text: texto, url: url }).catch(()=>{}); return; }
  try { navigator.clipboard.writeText(texto + '\n' + url); if (window.showToast) showToast('Copiado','success'); }
  catch(e){ prompt('Copiá tu racha:', texto + '\n' + url); }
};

// Chip chico para el perfil (todos los roles): "12" con el fueguito. Vacío si no hay racha.
R.chip = function(dias){
  dias = parseInt(dias) || 0;
  if (dias < 1) return '';
  return `<span onclick="window.CancheroRacha.verMia()" title="Tu racha en Canchero" style="display:inline-flex;align-items:center;gap:4px;background:rgba(255,150,0,.12);border:1px solid rgba(255,150,0,.3);border-radius:20px;padding:3px 9px;cursor:pointer;vertical-align:middle;">
    ${llama(14, true)}<span style="font-size:12px;font-weight:900;color:#ff9f0a;">${dias}</span>
  </span>`;
};

// Abre la pantalla grande con la racha actual del usuario (desde el chip del perfil).
R.verMia = function(){
  const u = window.userData || {};
  const dias = parseInt(u.streak_days || u.streak || 0) || 0;
  if (dias < 1) { if (window.showToast) showToast('Todavía no tenés racha. Entrá mañana para arrancarla.', 'info'); return; }
  R.mostrar(dias, { force:true });
};

window.CancheroRacha = R;
console.log('[canchero-racha] listo');
})();
