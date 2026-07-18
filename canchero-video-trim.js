/**
 * canchero-video-trim.js — Editor de recorte de video tipo TikTok/Reels.
 *
 * Cuando un video dura más del máximo (60s) en vez de mostrar error abrimos un
 * editor a pantalla completa con timeline + dos manijas (inicio/fin, ventana
 * máx 60s) y subimos SOLO ese tramo.
 *
 * API:
 *   const out = await window.openVideoTrimmer(file, { max:60 });
 *     → null                       si el usuario cancela
 *     → { file }                   recorte real client-side (MediaRecorder)
 *     → { file, trim:{start,du} }  fallback: subir original + recortar por URL
 *                                  de Cloudinary (so_/du_). El que sube debe
 *                                  pasar la URL final por window.cloudTrimUrl().
 *
 * Aditivo y a prueba de fallos: si nada de esto está disponible, degrada a
 * devolver el archivo original sin recorte.
 */
(function(){
'use strict';
const MAXW = 60;            // ventana máxima de recorte (s)
function toast(m,t){ if(window.showToast) showToast(m,t); }
function fmt(s){ s=Math.max(0,Math.floor(s)); return Math.floor(s/60)+':'+((s%60)<10?'0':'')+(s%60); }

// ¿Puede el navegador recortar de verdad (captureStream + MediaRecorder)?
function canRealTrim(){
  try {
    const v = document.createElement('video');
    const cap = v.captureStream || v.mozCaptureStream;
    return !!(cap && window.MediaRecorder);
  } catch(e){ return false; }
}

// Aplica el recorte a una URL de Cloudinary (para el fallback). so_=start_offset,
// du_=duration. Para no-Cloudinary devuelve la URL igual.
window.cloudTrimUrl = function(url, start, du){
  if (!url || url.indexOf('res.cloudinary.com') < 0) return url;
  const t = 'so_'+(+start).toFixed(2)+',du_'+(+du).toFixed(2);
  if (url.indexOf('/upload/'+t) >= 0) return url;
  return url.replace('/upload/', '/upload/'+t+'/');
};

window.openVideoTrimmer = function(file, opts){
  opts = opts || {};
  const MAX = opts.max || MAXW;
  return new Promise(function(resolve){
    const url = URL.createObjectURL(file);
    let total = 0, start = 0, end = MAX, dragging = null, done = false;

    const m = document.createElement('div');
    m.id = 'video-trim-editor';
    m.style.cssText = 'position:fixed;inset:0;z-index:30075;background:#000;display:flex;flex-direction:column;';
    m.innerHTML = `
      <div style="flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;padding:max(env(safe-area-inset-top,0px),10px) 16px 8px;background:#000;">
        <button id="vt-cancel" style="background:rgba(255,255,255,0.1);border:none;color:#fff;padding:9px 16px;border-radius:20px;font-weight:800;font-size:14px;cursor:pointer;">Cancelar</button>
        <div style="color:#fff;font-weight:900;font-size:15px;">Recortar video</div>
        <button id="vt-done" style="background:var(--accent);color:#000;border:none;padding:9px 18px;border-radius:20px;font-weight:900;font-size:14px;cursor:pointer;">Listo</button>
      </div>
      <div style="flex:1;position:relative;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden;">
        <video id="vt-video" src="${url}" playsinline muted style="max-width:100%;max-height:100%;"></video>
        <div id="vt-play" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;"><i class='bx bx-pause' style="font-size:54px;color:rgba(255,255,255,0.85);text-shadow:0 2px 12px rgba(0,0,0,0.6);"></i></div>
      </div>
      <div style="flex:0 0 auto;padding:6px 18px;background:#000;color:#aaa;font-size:12px;font-weight:700;display:flex;justify-content:space-between;">
        <span>Tramo: <span id="vt-len" style="color:var(--accent);">0:00</span></span>
        <span>Máx ${fmt(MAX)}</span>
      </div>
      <div style="flex:0 0 auto;padding:10px 18px calc(20px + env(safe-area-inset-bottom));background:#000;">
        <div id="vt-track" style="position:relative;height:54px;border-radius:12px;background:#161616;border:1px solid #262626;touch-action:none;user-select:none;">
          <div id="vt-sel" style="position:absolute;top:0;bottom:0;background:rgba(186,255,0,0.14);border:2px solid var(--accent);border-radius:10px;"></div>
          <div id="vt-h-start" data-h="start" style="position:absolute;top:0;bottom:0;width:22px;border-radius:10px 0 0 10px;background:var(--accent);display:flex;align-items:center;justify-content:center;cursor:ew-resize;touch-action:none;"><div style="width:3px;height:22px;background:#000;border-radius:2px;"></div></div>
          <div id="vt-h-end" data-h="end" style="position:absolute;top:0;bottom:0;width:22px;border-radius:0 10px 10px 0;background:var(--accent);display:flex;align-items:center;justify-content:center;cursor:ew-resize;touch-action:none;"><div style="width:3px;height:22px;background:#000;border-radius:2px;"></div></div>
          <div id="vt-cursor" style="position:absolute;top:-3px;bottom:-3px;width:2px;background:#fff;box-shadow:0 0 6px rgba(0,0,0,0.6);pointer-events:none;"></div>
        </div>
      </div>`;
    document.body.appendChild(m);
    ['player-bottom-nav','club-bottom-nav'].forEach(n=>document.getElementById(n)?.style.setProperty('display','none','important'));

    const vid = m.querySelector('#vt-video');
    const track = m.querySelector('#vt-track');
    const sel = m.querySelector('#vt-sel');
    const hS = m.querySelector('#vt-h-start');
    const hE = m.querySelector('#vt-h-end');
    const cursor = m.querySelector('#vt-cursor');
    const lenEl = m.querySelector('#vt-len');
    const playIco = m.querySelector('#vt-play').querySelector('i');

    function close(result){ if(done) return; done=true; try{ vid.pause(); }catch(e){} URL.revokeObjectURL(url); m.remove(); ['player-bottom-nav','club-bottom-nav'].forEach(n=>document.getElementById(n)?.style.removeProperty('display')); resolve(result); }

    function paint(){
      const w = track.clientWidth || 1;
      const ps = total ? (start/total)*w : 0;
      const pe = total ? (end/total)*w : w;
      hS.style.left = Math.max(0, ps-0) + 'px';
      hE.style.left = Math.min(w-22, pe-22) + 'px';
      sel.style.left = ps + 'px';
      sel.style.width = Math.max(0, pe-ps) + 'px';
      lenEl.textContent = fmt(end-start);
    }
    function paintCursor(){
      const w = track.clientWidth || 1;
      cursor.style.left = (total ? (vid.currentTime/total)*w : 0) + 'px';
    }

    vid.addEventListener('loadedmetadata', function(){
      total = vid.duration || MAX;
      start = 0; end = Math.min(MAX, total);
      paint();
      vid.currentTime = 0;
      vid.play().catch(()=>{});
    });
    // loop dentro de la ventana seleccionada
    vid.addEventListener('timeupdate', function(){
      if (vid.currentTime >= end || vid.currentTime < start-0.05){ vid.currentTime = start; }
      paintCursor();
    });
    m.querySelector('#vt-video').addEventListener('click', function(){
      if (vid.paused){ vid.play().catch(()=>{}); playIco.className='bx bx-pause'; }
      else { vid.pause(); playIco.className='bx bx-play'; }
    });

    // arrastre de manijas
    function startDrag(which, e){ e.preventDefault(); dragging = which; }
    hS.addEventListener('pointerdown', e=>startDrag('start',e));
    hE.addEventListener('pointerdown', e=>startDrag('end',e));
    document.addEventListener('pointermove', function(e){
      if (!dragging || done) return;
      const r = track.getBoundingClientRect();
      let t = ((e.clientX - r.left) / (r.width||1)) * total;
      t = Math.max(0, Math.min(total, t));
      if (dragging==='start'){
        start = Math.min(t, end-0.5);
        if (end-start > MAX) end = start + MAX;       // mantener ventana ≤ MAX
        vid.currentTime = start;
      } else {
        end = Math.max(t, start+0.5);
        if (end-start > MAX) start = end - MAX;
        vid.currentTime = start;
      }
      paint(); paintCursor();
    });
    document.addEventListener('pointerup', function(){ dragging=null; });

    m.querySelector('#vt-cancel').onclick = ()=>close(null);
    m.querySelector('#vt-done').onclick = async function(){
      const btn = this; btn.disabled = true; btn.textContent = 'Procesando...';
      const du = end - start;
      // si ya estaba dentro del máximo y no se movió, devolver original
      if (start <= 0.05 && du >= total-0.1){ close({ file }); return; }
      if (canRealTrim()){
        try {
          const out = await realTrim(vid, start, end);
          if (out){ close({ file: out }); return; }
        } catch(e){ /* cae a fallback */ }
      }
      // Fallback: subir original y recortar por URL de Cloudinary
      toast('Tu dispositivo recortará el video al subirlo','info');
      close({ file, trim:{ start, du } });
    };
  });
};

// Recorte real client-side: reproduce el tramo y graba el captureStream (con audio).
function realTrim(srcVideo, start, end){
  return new Promise(function(resolve, reject){
    try {
      const v = document.createElement('video');
      v.src = srcVideo.currentSrc || srcVideo.src;
      v.muted = false; v.playsInline = true;
      v.onloadedmetadata = function(){
        v.currentTime = start;
        v.onseeked = function(){
          v.onseeked = null;
          let stream;
          try { stream = (v.captureStream||v.mozCaptureStream).call(v); }
          catch(e){ reject(e); return; }
          let mime = '';
          ['video/mp4;codecs=h264,aac','video/mp4','video/webm;codecs=vp9,opus','video/webm']
            .forEach(mm=>{ if(!mime && MediaRecorder.isTypeSupported(mm)) mime=mm; });
          const rec = new MediaRecorder(stream, mime?{mimeType:mime, videoBitsPerSecond:6000000}:undefined);
          const chunks = [];
          rec.ondataavailable = e=>{ if(e.data&&e.data.size) chunks.push(e.data); };
          rec.onstop = function(){
            try{ stream.getTracks().forEach(t=>t.stop()); }catch(_){}
            const type = rec.mimeType || mime || 'video/webm';
            const ext = type.indexOf('mp4')>=0 ? 'mp4' : 'webm';
            const blob = new Blob(chunks, { type });
            resolve(blob.size ? new File([blob], 'recorte.'+ext, { type }) : null);
          };
          const stop = function(){ if (rec.state==='recording') rec.stop(); v.pause(); };
          const tick = function(){
            if (v.currentTime >= end || v.ended){ stop(); return; }
            requestAnimationFrame(tick);
          };
          rec.start();
          v.play().then(()=>requestAnimationFrame(tick)).catch(reject);
          // tope de seguridad
          setTimeout(stop, (end-start)*1000 + 1500);
        };
      };
      v.onerror = ()=>reject(new Error('video'));
    } catch(e){ reject(e); }
  });
}

console.log('[canchero-video-trim] ✅ Editor de recorte listo');
})();
