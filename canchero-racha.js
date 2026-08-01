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
  const c1 = activo ? '#16a34a' : '#3a3f45';
  const c2 = activo ? '#a3e635' : '#4a4f55';
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
  m.style.cssText = 'position:fixed;inset:0;z-index:100050;background:radial-gradient(120% 80% at 50% 0%,#0a1c0e,#0a0a0a 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px 22px calc(28px + env(safe-area-inset-bottom));overflow-y:auto;';
  m.innerHTML = `
    <div style="position:absolute;top:calc(12px + env(safe-area-inset-top));right:16px;">
      <button onclick="document.getElementById('racha-modal').remove()" style="background:rgba(255,255,255,.08);border:none;color:#aaa;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer;line-height:1;">&times;</button>
    </div>

    <div id="racha-fuego" style="filter:drop-shadow(0 0 34px rgba(80,220,110,.5));animation:rachaPop .5s cubic-bezier(.2,1.3,.4,1) both;">
      ${llama(132, true)}
    </div>

    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:64px;color:#4ade80;line-height:1;margin-top:6px;text-shadow:0 3px 20px rgba(80,220,110,.35);">${dias}</div>
    <div style="font-family:Outfit,sans-serif;font-weight:800;font-size:15px;color:#a3e635;letter-spacing:2px;margin-top:2px;">${dias === 1 ? 'DÍA DE RACHA' : 'DÍAS DE RACHA'}</div>

    <!-- Semana -->
    <div style="display:flex;gap:9px;margin:26px 0 4px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:14px 12px;">
      ${dd.map(d => `<div style="display:flex;flex-direction:column;align-items:center;gap:7px;">
        <span style="font-size:11px;font-weight:800;color:${d.esHoy ? '#4ade80' : '#8a8f96'};">${d.n}</span>
        <span style="width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;
          background:${d.cumplido ? 'linear-gradient(135deg,#16a34a,#a3e635)' : 'rgba(255,255,255,.06)'};
          ${d.esHoy && !d.cumplido ? 'border:2px solid #4ade80;' : ''}">
          ${d.cumplido ? `<i class='bx bx-check' style="color:#fff;font-size:17px;"></i>` : ''}
        </span>
      </div>`).join('')}
    </div>

    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:18px;color:#fff;margin-top:22px;text-align:center;">${msg.t}</div>
    <div style="font-size:13px;color:#9aa0a6;margin-top:5px;text-align:center;line-height:1.5;max-width:280px;">${msg.s}</div>

    <div style="width:100%;max-width:360px;margin-top:26px;">
      <button onclick="window.CancheroRacha.compartir(${dias})" style="width:100%;background:linear-gradient(135deg,#16a34a,#a3e635);color:#000;border:none;border-radius:15px;padding:15px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;box-shadow:0 8px 26px rgba(80,220,110,.32);"><i class='bx bx-share-alt'></i> COMPARTIR MI RACHA</button>
      <button onclick="document.getElementById('racha-modal').remove()" style="width:100%;background:transparent;color:#8a8f96;border:none;border-radius:15px;padding:13px;font-family:Outfit,sans-serif;font-weight:800;font-size:14px;cursor:pointer;margin-top:6px;">CONTINUAR</button>
    </div>

    <style>
      @keyframes rachaPop { 0%{transform:scale(.4);opacity:0;} 100%{transform:scale(1);opacity:1;} }
      #racha-fuego svg path:first-child { animation: rachaFlicker 1.8s ease-in-out infinite alternate; transform-origin:center bottom; }
      @keyframes rachaFlicker { 0%{transform:scaleY(1) scaleX(1);} 100%{transform:scaleY(1.05) scaleX(.97);} }
    </style>`;
  document.body.appendChild(m);
};

// Dibuja una tarjeta cuadrada (1080×1080) con el fueguito verde, el número y el texto,
// lista para compartir como imagen (stories / posts / whatsapp).
R._buildShareCanvas = function(dias){
  const c = document.createElement('canvas');
  c.width = 1080; c.height = 1080;
  const x = c.getContext('2d');
  // Fondo verde oscuro (mismo clima que el modal de racha).
  const g = x.createRadialGradient(540, 320, 60, 540, 760, 920);
  g.addColorStop(0, '#0d3018'); g.addColorStop(1, '#070707');
  x.fillStyle = g; x.fillRect(0, 0, 1080, 1080);
  // Fueguito (paths del viewBox 0 0 48 48, escalados ×9 = 432px de ancho, centrado).
  x.save();
  x.translate(540 - (48 * 9) / 2, 165);
  x.scale(9, 9);
  x.shadowColor = 'rgba(80,220,110,.45)'; x.shadowBlur = 26;
  x.fillStyle = '#16a34a';
  x.fill(new Path2D('M24 3c1 7-4 9-8 14-3 4-4 8-4 12 0 7 5.4 13 12 13s12-6 12-13c0-6-4-10-6-14-1.6 2-3 3-4 3 1-6-1-11-2-15Z'));
  x.shadowBlur = 0;
  x.fillStyle = '#a3e635';
  x.fill(new Path2D('M24 20c.7 4-2.5 5.5-4.5 8.4-1.3 1.9-1.5 3.6-1.5 5.1 0 3.4 2.7 6 6 6s6-2.6 6-6c0-3-2.2-5-3.5-7.4-.8 1-1.6 1.5-2.2 1.5.6-3-.3-6-.3-7.6Z'));
  x.restore();
  // Número grande.
  x.textAlign = 'center';
  x.fillStyle = '#4ade80';
  x.font = '900 300px Outfit, Arial, sans-serif';
  x.fillText(String(dias), 540, 830);
  // Etiqueta.
  x.fillStyle = '#a3e635';
  x.font = '800 46px Outfit, Arial, sans-serif';
  x.fillText((dias === 1 ? 'DÍA' : 'DÍAS') + ' DE RACHA', 540, 900);
  // Pie con la marca.
  x.fillStyle = '#ffffff';
  x.font = '700 40px Outfit, Arial, sans-serif';
  x.fillText('Canchero · canchero.app', 540, 1015);
  return c;
};

// Compartir la racha con una IMAGEN diseñada, en un overlay centrado por ENCIMA del
// modal de racha (z-index mayor a 100050) — antes se abría detrás y había que cerrar racha.
R.compartir = function(dias){
  dias = parseInt(dias) || 0;
  R._texto = 'Llevo ' + dias + (dias === 1 ? ' día' : ' días') + ' de racha en Canchero. ¿Me seguís el ritmo? https://cancherofutbolapp.vercel.app';
  R._dias = dias;
  let imgSrc = '';
  try { R._canvas = R._buildShareCanvas(dias); imgSrc = R._canvas.toDataURL('image/png'); } catch(e){ console.warn('[racha canvas]', e); R._canvas = null; }

  const ex = document.getElementById('racha-share'); if (ex) ex.remove();
  const ov = document.createElement('div');
  ov.id = 'racha-share';
  // Centrado y por ENCIMA del modal de racha.
  ov.style.cssText = 'position:fixed;inset:0;z-index:100070;background:rgba(0,0,0,.82);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:22px;box-sizing:border-box;overflow-y:auto;';
  ov.onclick = function(e){ if (e.target === ov) ov.remove(); };
  const btn = 'width:100%;display:flex;align-items:center;gap:11px;border-radius:14px;padding:13px 15px;font-family:Outfit,sans-serif;font-weight:800;font-size:13.5px;cursor:pointer;margin-top:8px;text-align:left;';
  ov.innerHTML = `
    <div style="width:100%;max-width:330px;">
      ${imgSrc ? `<img src="${imgSrc}" alt="Mi racha" style="width:100%;border-radius:18px;display:block;box-shadow:0 12px 40px rgba(0,0,0,.6);margin-bottom:4px;">` : ''}
      <button onclick="window.CancheroRacha._compartirVia('feed')" style="${btn}background:rgba(186,255,0,.12);color:var(--accent);border:1px solid rgba(186,255,0,.3);"><i class='bx bx-home-alt' style="font-size:18px;"></i> Publicar en el inicio</button>
      <button onclick="window.CancheroRacha._compartirVia('chat')" style="${btn}background:rgba(255,255,255,.05);color:#ddd;border:1px solid rgba(255,255,255,.12);"><i class='bx bx-message-dots' style="font-size:18px;"></i> Enviar por chat</button>
      <button onclick="window.CancheroRacha._compartirVia('fuera')" style="${btn}background:rgba(255,255,255,.05);color:#ddd;border:1px solid rgba(255,255,255,.12);"><i class='bx bxl-whatsapp' style="font-size:18px;"></i> WhatsApp · redes</button>
      <button onclick="document.getElementById('racha-share').remove()" style="${btn}background:transparent;color:#8a8f96;border:1px solid #222;justify-content:center;">Cerrar</button>
    </div>`;
  document.body.appendChild(ov);
};

// Sube la imagen de la racha a storage y devuelve la URL (para feed/chat). null si falla.
R._subirImagen = async function(){
  try {
    if (!R._canvas) return null;
    const sb = window._sb; const u = window.userData || {};
    if (!sb || !u.email) return null;
    const blob = await new Promise(res => R._canvas.toBlob(res, 'image/png'));
    if (!blob) return null;
    const path = 'racha/' + (u.email||'anon').replace(/[^a-z0-9]/gi,'_') + '/' + Date.now() + '.png';
    const up = await sb.storage.from('media').upload(path, blob, { upsert:true, contentType:'image/png' });
    if (up.error) return null;
    const { data } = sb.storage.from('media').getPublicUrl(path);
    return (data && data.publicUrl) || null;
  } catch(e){ console.warn('[racha subir]', e && e.message); return null; }
};

// Comparte la IMAGEN por dentro (feed/chat) o fuera (whatsapp/redes) de Canchero.
R._compartirVia = async function(via){
  const texto = R._texto || '';
  if (via === 'fuera') {
    document.getElementById('racha-share')?.remove();
    if (R._canvas && navigator.canShare) {
      R._canvas.toBlob(function(blob){
        const file = new File([blob], 'racha-canchero.png', { type:'image/png' });
        if (navigator.canShare({ files:[file] })) { navigator.share({ files:[file], text: texto }).catch(()=>{}); }
        else if (navigator.share) { navigator.share({ text: texto }).catch(()=>{}); }
        else { const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='racha-canchero.png'; a.click(); if(window.showToast) showToast('Imagen descargada','success'); }
      }, 'image/png');
      return;
    }
    if (navigator.share) { navigator.share({ text: texto }).catch(()=>{}); return; }
    try { await navigator.clipboard.writeText(texto); if(window.showToast) showToast('Copiado','success'); } catch(e){}
    return;
  }
  // feed / chat: subir imagen y crear un post con ella.
  if (window.showToast) showToast('Preparando...', 'info');
  const url = await R._subirImagen();
  const sb = window._sb; const u = window.userData || {};
  if (!sb || !u.email) { if(window.showToast) showToast('Iniciá sesión','error'); return; }
  try {
    const rol = (window._pubRole && window._pubRole()) || u.role || 'jugador';
    let nombre = u.name, foto = u.photo;
    try { const b = window._activeBiz && window._activeBiz(); if (b && b.name) { nombre = b.name; foto = b.photo || foto; } } catch(e){}
    const fila = { user_email: u.email, user_name: nombre || u.email, user_role: rol, user_avatar: foto || null,
      content: 'Llevo ' + (R._dias||0) + ((R._dias===1)?' día':' días') + ' de racha en Canchero.' };
    if (url) { fila.media_url = url; fila.media_type = 'image'; }
    const { data: post, error } = await sb.from('posts').insert(fila).select('id').single();
    if (error) throw error;
    document.getElementById('racha-share')?.remove();
    if (via === 'chat' && window.social && typeof window.social.sharePost === 'function' && post && post.id) {
      // Reusa el selector de "enviar a" de la app para mandarlo por chat.
      window.social.sharePost(post.id);
      return;
    }
    if (window.showToast) showToast('Publicado en el inicio','success');
    try { if (window.social && window.social.loadFeed) window.social.loadFeed(); } catch(e){}
  } catch(e){ if(window.showToast) showToast('No se pudo compartir: ' + (e.message||''), 'error'); }
};

// Chip chico para el perfil (todos los roles): "12" con el fueguito. Vacío si no hay racha.
R.chip = function(dias){
  dias = parseInt(dias) || 0;
  if (dias < 1) return '';
  return `<span onclick="window.CancheroRacha.verMia()" title="Tu racha en Canchero" style="display:inline-flex;align-items:center;gap:4px;background:rgba(80,220,110,.12);border:1px solid rgba(80,220,110,.3);border-radius:20px;padding:3px 9px;cursor:pointer;vertical-align:middle;">
    ${llama(14, true)}<span style="font-size:12px;font-weight:900;color:#4ade80;">${dias}</span>
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
