/**
 * canchero-momentos-editor.js — Editor de Momentos estilo Instagram Stories
 * - Pantalla completa: cámara o galería.
 * - Filtros (CSS), texto (arrastrable), stickers/emoji, dibujo a mano.
 * - Publica como momento de 12h (anillo rojo en avatar, quién lo vio).
 * Las imágenes se "aplanan" en un canvas (todo queda incrustado).
 */
(function(){
'use strict';
const sb = () => window._sb;
const me = () => window.userData;
function toast(m,t){ if(window.showToast) showToast(m,t); }

/* Filtros: pocos, en UNA línea y con ICONO (no nombre) — pedido 2026-07-08 */
const FILTERS = [
  { n:'Normal',  ic:'bx-image',     f:'none' },
  { n:'B/N',     ic:'bx-adjust',    f:'grayscale(1)' },
  { n:'Vintage', ic:'bx-time-five', f:'sepia(0.5) contrast(1.1) brightness(1.05)' },
  { n:'Frío',    ic:'bx-moon',      f:'hue-rotate(-15deg) saturate(1.2)' },
  { n:'Cálido',  ic:'bx-sun',       f:'sepia(0.25) saturate(1.5) brightness(1.05)' },
];
const STICKERS = ['GOLAZO','VAMOS','CRACK','MVP','GOL','NIVEL','DALE','FINAL','PICADO','TITULAR','DE TAQUITO','MINUTO 90'];

// Categorías para momentos (deben coincidir con canchero-momentos.js).
// 6 tipos fijos (pedido 2026-07-08). 'Mi Día' es la clave interna legacy → se muestra "Momentos".
const MOM_CATS = ['Mi Día','Jugadas','Celebraciones','Detrás de la cancha','Ventas','Convocatorias'];
const MOM_CAT_LABEL = { 'Mi Día':'Momentos', 'Detrás de la cancha':'Detrás' };
// OJO: bx-megaphone NO existe en la versión de boxicons de la app (glifo vacío) — usar bx-user-plus
const MOM_CAT_BX = { 'Mi Día':'bx-camera','Jugadas':'bx-football','Celebraciones':'bx-party','Detrás de la cancha':'bx-camera-movie','Ventas':'bx-purchase-tag','Convocatorias':'bx-user-plus' };
const MOM_CAT_ICONS = new Proxy({}, { get:(t,k)=>`<i class='bx ${MOM_CAT_BX[k]||'bx-camera'}' style='vertical-align:-2px;'></i>` });

let E = {}; // estado editor

window._openCrearMomento = function(){
  if (!me()){ toast('Iniciá sesión para subir un momento','error'); return; }
  E = { filter:'none', texts:[], stickers:[], drawing:false, mediaType:null, mediaURL:null, file:null, category:'Mi Día' };
  let m=document.getElementById('mom-editor'); if(m)m.remove();
  m=document.createElement('div'); m.id='mom-editor';
  m.style.cssText='position:fixed;inset:0;z-index:30070;background:#000;display:flex;flex-direction:column;';
  m.innerHTML=`
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px;">
      <div style="width:84px;height:84px;border-radius:50%;background:rgba(186,255,0,0.08);border:1px solid rgba(186,255,0,0.3);display:flex;align-items:center;justify-content:center;"><i class='bx bx-camera' style="font-size:40px;color:var(--accent);"></i></div>
      <div style="color:#fff;font-size:18px;font-weight:900;">Nuevo Momento</div>
      <div style="color:#888;font-size:13px;text-align:center;">Sacá una foto o elegí de tu galería. Dura 12 horas, como una historia.</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:10px;">
        <button onclick="window._momCamera()" style="background:var(--accent);color:#000;border:none;border-radius:14px;padding:14px 22px;font-weight:900;font-size:14px;cursor:pointer;display:flex;align-items:center;gap:8px;"><i class='bx bx-camera'></i> Cámara</button>
        <button onclick="window._momPickGallery()" style="background:#1a1a1a;color:#fff;border:1px solid #333;border-radius:14px;padding:14px 22px;font-weight:800;font-size:14px;cursor:pointer;display:flex;align-items:center;gap:8px;"><i class='bx bx-image'></i> Galería</button>
      </div>
      <button onclick="document.getElementById('mom-editor').remove()" style="margin-top:8px;background:none;border:none;color:#666;font-size:13px;cursor:pointer;">Cancelar</button>
    </div>
    <input type="file" id="mom-file-in" accept="image/*,video/*" style="display:none;" onchange="window._momFileSel(this)">`;
  document.body.appendChild(m);
  ['player-bottom-nav','club-bottom-nav'].forEach(n=>document.getElementById(n)?.style.setProperty('display','none','important'));
};
window._closeMomEditor = function(){ try{ if(E._stream) E._stream.getTracks().forEach(t=>t.stop()); }catch(e){} const m=document.getElementById('mom-editor'); if(m)m.remove(); ['player-bottom-nav','club-bottom-nav'].forEach(n=>document.getElementById(n)?.style.removeProperty('display')); };

window._momPickGallery = function(){ document.getElementById('mom-file-in').click(); };
window._momFileSel = async function(input){
  let f=input.files[0]; if(!f) return;
  E._trim = null;
  // Video largo → editor de recorte (no error)
  if (f.type.startsWith('video') && window.checkVideoDuration){
    const ok = await window.checkVideoDuration(f, 60);
    if (!ok && window.openVideoTrimmer){
      const out = await window.openVideoTrimmer(f, { max:60 });
      if (!out){ input.value=''; return; }   // canceló
      f = out.file; E._trim = out.trim || null;
    } else if (!ok){ toast('El video puede durar máximo 1 minuto.','error'); input.value=''; return; }
  }
  E.file=f; E.mediaType=f.type.startsWith('video')?'video':'photo'; E.mediaURL=URL.createObjectURL(f);
  _momShowEditor();
};
window._momFacing = window._momFacing || 'environment';
window._momCamera = async function(){
  try{
    // Alta calidad: pedir la mayor resolución posible + audio (para grabar video)
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video:{ facingMode: window._momFacing, width:{ ideal:1920 }, height:{ ideal:1080 } },
        audio:true
      });
    } catch(e1) {
      // fallback sin audio (algunos navegadores deniegan el mic)
      stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode: window._momFacing }, audio:false });
    }
    E._stream=stream;
    const m=document.getElementById('mom-editor');
    m.innerHTML=`<div style="flex:1;position:relative;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden;">
      <video id="mom-cam" autoplay playsinline muted style="width:100%;height:100%;object-fit:cover;"></video>
      <button onclick="window._closeMomEditor()" style="position:absolute;top:14px;left:14px;background:rgba(0,0,0,0.5);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer;"><i class='bx bx-x'></i></button>
      <button onclick="window._momFlip()" style="position:absolute;top:14px;right:14px;background:rgba(0,0,0,0.5);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer;"><i class='bx bx-rotate-right'></i></button>
      <div id="mom-rec-timer" style="display:none;position:absolute;top:14px;left:50%;transform:translateX(-50%);background:rgba(229,57,53,0.9);color:#fff;font-size:12px;font-weight:900;padding:4px 12px;border-radius:20px;">● REC 0:00</div>
    </div>
    <div style="flex:0 0 auto;padding:16px 18px calc(16px + env(safe-area-inset-bottom));display:flex;align-items:center;justify-content:center;gap:34px;background:#000;">
      <div style="font-size:11px;color:#888;width:60px;text-align:center;">Tocá:<br>foto</div>
      <button id="mom-shutter" onclick="window._momSnap()" style="width:74px;height:74px;border-radius:50%;background:#fff;border:4px solid var(--accent);cursor:pointer;flex-shrink:0;"></button>
      <button id="mom-rec-btn" onclick="window._momToggleRec()" style="width:60px;height:60px;border-radius:50%;background:rgba(229,57,53,0.15);border:3px solid #e53935;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class='bx bxs-circle' style="color:#e53935;font-size:24px;"></i></button>
    </div>`;
    document.getElementById('mom-cam').srcObject=stream;
  }catch(e){ toast('No se pudo abrir la cámara. Usá Galería.','error'); }
};
window._momFlip = async function(){
  window._momFacing = (window._momFacing==='environment')?'user':'environment';
  try{ if(E._stream) E._stream.getTracks().forEach(t=>t.stop()); }catch(e){}
  window._momCamera();
};
window._momSnap = function(){
  const v=document.getElementById('mom-cam'); if(!v)return;
  const c=document.createElement('canvas'); c.width=v.videoWidth||1080; c.height=v.videoHeight||1920;
  c.getContext('2d').drawImage(v,0,0);
  // Calidad alta (0.95)
  c.toBlob(b=>{ E.file=new File([b],'cam.jpg',{type:'image/jpeg'}); E.mediaType='photo'; E.mediaURL=URL.createObjectURL(b); try{E._stream.getTracks().forEach(t=>t.stop());}catch(e){} _momShowEditor(); },'image/jpeg',0.95);
};
// ── Grabación de video (MediaRecorder) ──
window._momRec = null; window._momRecChunks = []; window._momRecT0 = 0; window._momRecTimer = null;
window._momToggleRec = function(){
  if (window._momRec && window._momRec.state === 'recording') { window._momStopRec(); return; }
  window._momStartRec();
};
window._momStartRec = function(){
  if (!E._stream) return;
  try {
    let mime = '';
    ['video/mp4;codecs=h264,aac','video/mp4','video/webm;codecs=vp9,opus','video/webm'].forEach(m=>{ if(!mime && window.MediaRecorder && MediaRecorder.isTypeSupported(m)) mime=m; });
    window._momRec = new MediaRecorder(E._stream, mime?{mimeType:mime, videoBitsPerSecond:6000000}:undefined);
    window._momRecChunks = [];
    window._momRec.ondataavailable = e => { if(e.data && e.data.size) window._momRecChunks.push(e.data); };
    window._momRec.onstop = () => {
      const type = (window._momRec && window._momRec.mimeType) || 'video/webm';
      const blob = new Blob(window._momRecChunks, { type });
      const ext = type.includes('mp4')?'mp4':'webm';
      E.file = new File([blob], 'momento.'+ext, { type });
      E.mediaType = 'video'; E.mediaURL = URL.createObjectURL(blob);
      try{ E._stream.getTracks().forEach(t=>t.stop()); }catch(e){}
      clearInterval(window._momRecTimer);
      _momShowEditor();
    };
    window._momRec.start();
    window._momRecT0 = Date.now();
    const timer = document.getElementById('mom-rec-timer'); if(timer) timer.style.display='block';
    const btn = document.getElementById('mom-rec-btn'); if(btn) btn.querySelector('i').className='bx bxs-square';
    window._momRecTimer = setInterval(()=>{
      const s = Math.floor((Date.now()-window._momRecT0)/1000);
      const t = document.getElementById('mom-rec-timer'); if(t) t.textContent='● REC '+Math.floor(s/60)+':'+((s%60)<10?'0':'')+(s%60);
      if (s >= 300) window._momStopRec(); // tope 5 min
    }, 500);
  } catch(e){ toast('No se pudo grabar video.','error'); }
};
window._momStopRec = function(){
  try{ if(window._momRec && window._momRec.state==='recording') window._momRec.stop(); }catch(e){}
};

function _momShowEditor(){
  const m=document.getElementById('mom-editor'); if(!m) return;
  const isVid=E.mediaType==='video';
  m.innerHTML=`
    <!-- Header app (logo + campana + ajustes) para que las herramientas no queden pegadas al borde superior del celular -->
    <div style="flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;padding:max(env(safe-area-inset-top,0px),8px) 14px 6px;background:#000;z-index:6;">
      <div style="display:flex;align-items:center;gap:8px;"><img src="img/logo.png" onerror="this.style.display='none'" style="height:22px;width:auto;"><span style="font-weight:900;color:var(--accent);font-size:15px;letter-spacing:.5px;">Canchero</span></div>
      <div style="display:flex;align-items:center;gap:6px;">
        <button onclick="window.CancheroNotif?window.CancheroNotif.togglePanel():(window.openNotificationsPanel&&window.openNotificationsPanel())" style="background:rgba(255,255,255,0.08);border:none;color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;"><i class='bx bx-bell'></i></button>
        <button onclick="window.switchDashboardTab&&switchDashboardTab((window.userData&&window.userData.role)||'jugador','ajustes',null)" style="background:rgba(255,255,255,0.08);border:none;color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;"><i class='bx bx-cog'></i></button>
      </div>
    </div>
    <!-- Sin herramientas de edición arriba (pedido 2026-07-08): solo cerrar -->
    <div style="flex:0 0 auto;display:flex;align-items:center;justify-content:flex-start;padding:6px 14px 12px;background:#000;z-index:5;">
      <button onclick="window._openCrearMomento()" style="background:rgba(255,255,255,0.1);border:none;color:#fff;width:38px;height:38px;border-radius:50%;font-size:20px;cursor:pointer;"><i class='bx bx-x'></i></button>
    </div>
    <!-- Media con bordes redondeados (estilo instantáneas de Instagram) -->
    <div id="mom-canvas-wrap" style="flex:1;position:relative;overflow:hidden;background:#000;display:flex;align-items:center;justify-content:center;margin:0 10px;border-radius:22px;">
      ${isVid
        ? `<video id="mom-media" src="${E.mediaURL}" autoplay loop muted playsinline style="max-width:100%;max-height:100%;filter:${E.filter};border-radius:22px;"></video>`
        : `<img id="mom-media" src="${E.mediaURL}" style="max-width:100%;max-height:100%;filter:${E.filter};border-radius:22px;">`}
      <canvas id="mom-draw" style="position:absolute;inset:0;width:100%;height:100%;display:none;touch-action:none;"></canvas>
      <div id="mom-overlays" style="position:absolute;inset:0;pointer-events:none;"></div>
    </div>
    <!-- Filtros: una sola línea, ICONOS -->
    <div style="flex:0 0 auto;display:flex;gap:6px;flex-wrap:nowrap;justify-content:center;padding:8px 12px;background:#000;">
      ${FILTERS.map(f=>`<button onclick="window._momSetFilter('${f.f}',this)" data-f="${f.f}" title="${f.n}" aria-label="${f.n}" style="flex:0 0 44px;width:44px;height:44px;background:${f.f===E.filter?'var(--accent)':'#1a1a1a'};color:${f.f===E.filter?'#000':'#aaa'};border:none;border-radius:50%;font-size:20px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class='bx ${f.ic}'></i></button>`).join('')}
    </div>
    <!-- Stickers (oculto) -->
    <div id="mom-sticker-bar" style="display:none;flex-wrap:wrap;gap:6px;padding:10px 14px;background:#111;max-height:120px;overflow-y:auto;">
      ${STICKERS.map(s=>`<button onclick="window._momAddSticker('${s}')" style="background:rgba(186,255,0,0.1);border:1px solid rgba(186,255,0,0.35);color:var(--accent);border-radius:14px;font-size:13px;font-weight:900;letter-spacing:1px;cursor:pointer;padding:8px 14px;font-family:inherit;">${s}</button>`).join('')}
    </div>
    <!-- Categoría (requerida) -->
    <div style="flex:0 0 auto;padding:8px 14px 4px;background:#000;">
      <div style="font-size:10px;font-weight:900;color:var(--accent);letter-spacing:.5px;margin-bottom:6px;">CATEGORÍA <span style="color:#ff4444;">*</span></div>
      <!-- 6 categorías en UNA sola línea (icono arriba, etiqueta completa que puede ir a 2 líneas) -->
      <div id="mom-cat-bar" style="display:flex;gap:5px;flex-wrap:nowrap;padding-bottom:2px;">
        ${MOM_CATS.map(c=>`<button onclick="window._momSetCategory('${c}',this)" data-cat="${c}" style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 1px;border-radius:12px;border:2px solid ${c===E.category?'var(--accent)':'#2a2a2a'};background:${c===E.category?'rgba(186,255,0,0.12)':'transparent'};color:${c===E.category?'var(--accent)':'#888'};font-size:8.5px;font-weight:700;cursor:pointer;"><i class='bx ${MOM_CAT_BX[c]||'bx-camera'}' style='font-size:17px;'></i><span style="max-width:100%;white-space:normal;word-break:break-word;line-height:1.1;text-align:center;">${MOM_CAT_LABEL[c]||c}</span></button>`).join('')}
      </div>
    </div>
    <!-- Publicar: icono compacto de enviar al lado de la barra (pedido 2026-07-08) -->
    <div style="flex:0 0 auto;padding:8px 14px calc(12px + env(safe-area-inset-bottom));background:#000;display:flex;gap:8px;align-items:center;">
      <input id="mom-caption" placeholder="Escribí algo..." style="flex:1;min-width:0;background:#1a1a1a;border:1px solid #333;border-radius:22px;color:#fff;padding:11px 16px;font-size:14px;outline:none;">
      <button onclick="window._momPublishStory()" id="mom-pub-btn" title="Compartir" aria-label="Compartir" style="flex:0 0 42px;width:42px;height:42px;background:var(--accent);color:#000;border:none;border-radius:50%;font-size:19px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class='bx bx-send'></i></button>
    </div>`;
  E.texts=[]; E.stickers=[];
}

window._momSetCategory = function(cat, btn){
  E.category = cat;
  document.querySelectorAll('#mom-cat-bar button').forEach(b=>{
    const on = b.dataset.cat === cat;
    b.style.borderColor = on ? 'var(--accent)' : '#2a2a2a';
    b.style.background = on ? 'rgba(186,255,0,0.12)' : 'transparent';
    b.style.color = on ? 'var(--accent)' : '#888';
  });
};
window._momSetFilter = function(f, btn){
  E.filter=f;
  const media=document.getElementById('mom-media'); if(media) media.style.filter=f;
  document.querySelectorAll('#mom-editor [data-f]').forEach(b=>{ const on=b.dataset.f===f; b.style.background=on?'var(--accent)':'#1a1a1a'; b.style.color=on?'#000':'#aaa'; });
};
window._momToggleStickers = function(){ const b=document.getElementById('mom-sticker-bar'); if(b) b.style.display=b.style.display==='none'?'flex':'none'; };
/* Editor de texto estilo Instagram: input real (el prompt() nativo está
   bloqueado en el WebView del APK y el teclado nunca aparecía) */
window._momAddText = function(){
  let sh=document.getElementById('mom-text-sheet'); if(sh){sh.remove();return;}
  sh=document.createElement('div'); sh.id='mom-text-sheet';
  sh.style.cssText='position:fixed;inset:0;z-index:100060;background:rgba(0,0,0,0.55);backdrop-filter:blur(8px);display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:18vh;';
  const COLORS=['#ffffff','#baff00','#64b4ff','#ff6b9d','#ffaa00','#00e676','#111111'];
  sh.innerHTML =
    '<input id="mom-text-in" placeholder="Escribí algo..." autocomplete="off" style="background:transparent;border:none;outline:none;color:#fff;font-size:28px;font-weight:900;text-align:center;width:90%;text-shadow:0 2px 10px rgba(0,0,0,0.7);caret-color:var(--accent);">'
    + '<div style="display:flex;gap:10px;margin-top:22px;">'
    + COLORS.map(c=>"<button data-c=\""+c+"\" onclick=\"window._momTextColor=this.dataset.c;document.getElementById('mom-text-in').style.color=this.dataset.c;\" style=\"width:30px;height:30px;border-radius:50%;background:"+c+";border:2px solid rgba(255,255,255,0.6);cursor:pointer;\"></button>").join('')
    + '</div>'
    + '<div style="position:fixed;top:max(12px,env(safe-area-inset-top));right:16px;"><button onclick="window._momTextDone()" style="background:transparent;border:none;color:#fff;font-size:16px;font-weight:900;cursor:pointer;letter-spacing:.5px;">Listo</button></div>';
  sh.onclick=function(ev){ if(ev.target===sh) window._momTextDone(); };
  document.body.appendChild(sh);
  const inp=document.getElementById('mom-text-in');
  inp.addEventListener('keydown',function(ev){ if(ev.key==='Enter') window._momTextDone(); });
  setTimeout(()=>{ try{ inp.focus(); }catch(e){} }, 80);
};
window._momTextDone = function(){
  const sh=document.getElementById('mom-text-sheet'); if(!sh) return;
  const inp=document.getElementById('mom-text-in');
  const txt=(inp&&inp.value.trim())||'';
  const color=window._momTextColor||'#ffffff';
  sh.remove();
  // Modo edición: actualizar el texto existente
  if (E._editId){
    const ex=E.texts.find(a=>a.id===E._editId); E._editId=null;
    if (ex){ if(!txt){ window._momDelOverlay(ex.id); return; } ex.txt=txt; ex.color=color; _momRenderOverlays(); return; }
  }
  if(!txt) return;
  const id='t'+Date.now(); E.texts.push({id,txt,x:50,y:40,color,size:28});
  E.sel=id; _momRenderOverlays();
};
window._momAddSticker = function(s){ const id='s'+Date.now(); E.stickers.push({id,s,x:50,y:50}); E.sel=id; _momRenderOverlays(); window._momToggleStickers(); };

// Controles del overlay seleccionado (borrar / tamaño / editar texto)
function _momCtrls(id, isText){
  const edit = isText ? `<button onpointerdown="event.stopPropagation()" onclick="event.stopPropagation();window._momEditText('${id}')" title="Editar" style="background:#1a1a1a;border:1px solid #444;color:#fff;width:26px;height:26px;border-radius:50%;font-size:13px;cursor:pointer;"><i class='bx bx-pencil'></i></button>` : '';
  const size = isText ? `<button onpointerdown="event.stopPropagation()" onclick="event.stopPropagation();window._momTextSize('${id}',-4)" title="Más chico" style="background:#1a1a1a;border:1px solid #444;color:#fff;width:26px;height:26px;border-radius:50%;font-size:11px;font-weight:900;cursor:pointer;">A-</button><button onpointerdown="event.stopPropagation()" onclick="event.stopPropagation();window._momTextSize('${id}',4)" title="Más grande" style="background:#1a1a1a;border:1px solid #444;color:#fff;width:26px;height:26px;border-radius:50%;font-size:13px;font-weight:900;cursor:pointer;">A+</button>` : '';
  const del = `<button onpointerdown="event.stopPropagation()" onclick="event.stopPropagation();window._momDelOverlay('${id}')" title="Borrar" style="background:#e53935;border:none;color:#fff;width:26px;height:26px;border-radius:50%;font-size:14px;cursor:pointer;"><i class='bx bx-trash'></i></button>`;
  return `<div style="position:absolute;left:50%;top:-40px;transform:translateX(-50%);display:flex;gap:6px;pointer-events:auto;">${edit}${size}${del}</div>`;
}
function _momRenderOverlays(){
  const ov=document.getElementById('mom-overlays'); if(!ov) return;
  ov.innerHTML = E.texts.map(t=>{
    const selOn = E.sel===t.id;
    return `<div data-ov="${t.id}" style="position:absolute;left:${t.x}%;top:${t.y}%;transform:translate(-50%,-50%);color:${t.color||'#fff'};font-size:${t.size||28}px;font-weight:900;text-shadow:0 2px 8px rgba(0,0,0,0.8);pointer-events:auto;cursor:move;white-space:nowrap;${selOn?'outline:1px dashed rgba(255,255,255,0.5);outline-offset:6px;border-radius:4px;':''}" onpointerdown="window._momDragStart(event,'${t.id}','text')">${t.txt.replace(/</g,'&lt;')}${selOn?_momCtrls(t.id,true):''}</div>`;
  }).join('')
    + E.stickers.map(t=>{
      const selOn = E.sel===t.id;
      return `<div data-ov="${t.id}" style="position:absolute;left:${t.x}%;top:${t.y}%;transform:translate(-50%,-50%) rotate(-4deg);background:var(--accent);color:#000;border-radius:12px;padding:6px 14px;font-size:22px;font-weight:900;letter-spacing:1px;pointer-events:auto;cursor:move;box-shadow:0 4px 14px rgba(0,0,0,0.45);${selOn?'outline:1px dashed rgba(255,255,255,0.6);outline-offset:6px;':''}" onpointerdown="window._momDragStart(event,'${t.id}','sticker')">${t.s}${selOn?_momCtrls(t.id,false):''}</div>`;
    }).join('');
}
window._momDelOverlay = function(id){
  E.texts = E.texts.filter(t=>t.id!==id);
  E.stickers = E.stickers.filter(t=>t.id!==id);
  if (E.sel===id) E.sel=null;
  _momRenderOverlays();
};
window._momTextSize = function(id, delta){
  const t = E.texts.find(a=>a.id===id); if(!t) return;
  t.size = Math.max(14, Math.min(80, (t.size||28)+delta));
  _momRenderOverlays();
};
window._momEditText = function(id){
  const t = E.texts.find(a=>a.id===id); if(!t) return;
  E._editId = id; window._momTextColor = t.color;
  window._momAddText();
  setTimeout(()=>{ const inp=document.getElementById('mom-text-in'); if(inp){ inp.value=t.txt; inp.style.color=t.color||'#fff'; } }, 100);
};
window._momDragStart = function(e, id, type){
  e.preventDefault();
  const wrap=document.getElementById('mom-canvas-wrap'); const rect=wrap.getBoundingClientRect();
  let moved=false; const sx=e.clientX, sy=e.clientY;
  const move=ev=>{ if(Math.abs(ev.clientX-sx)>4||Math.abs(ev.clientY-sy)>4) moved=true;
    const x=((ev.clientX-rect.left)/rect.width)*100, y=((ev.clientY-rect.top)/rect.height)*100;
    const arr=type==='text'?E.texts:E.stickers; const o=arr.find(a=>a.id===id); if(o){o.x=Math.max(2,Math.min(98,x));o.y=Math.max(4,Math.min(96,y));} _momRenderOverlays(); };
  const up=()=>{ document.removeEventListener('pointermove',move); document.removeEventListener('pointerup',up);
    if(!moved){ E.sel = (E.sel===id)?null:id; _momRenderOverlays(); } };  // tap → seleccionar/deseleccionar
  document.addEventListener('pointermove',move); document.addEventListener('pointerup',up);
};
window._momToggleDraw = function(btn){
  E.drawing=!E.drawing;
  const cv=document.getElementById('mom-draw'); if(!cv) return;
  if(E.drawing){
    cv.style.display='block'; btn.style.background='var(--accent)'; btn.style.color='#000';
    const wrap=document.getElementById('mom-canvas-wrap'); cv.width=wrap.clientWidth; cv.height=wrap.clientHeight;
    const ctx=cv.getContext('2d'); ctx.strokeStyle='#baff00'; ctx.lineWidth=4; ctx.lineCap='round';
    let drawing=false;
    cv.onpointerdown=e=>{ drawing=true; const r=cv.getBoundingClientRect(); ctx.beginPath(); ctx.moveTo(e.clientX-r.left,e.clientY-r.top); };
    cv.onpointermove=e=>{ if(!drawing)return; const r=cv.getBoundingClientRect(); ctx.lineTo(e.clientX-r.left,e.clientY-r.top); ctx.stroke(); };
    cv.onpointerup=()=>drawing=false; cv.onpointerleave=()=>drawing=false;
  } else { cv.style.display='none'; btn.style.background='rgba(255,255,255,0.1)'; btn.style.color='#fff'; }
};

window._momPublishStory = async function(){
  const btn=document.getElementById('mom-pub-btn'); if(btn){btn.disabled=true;btn.innerHTML="<i class='bx bx-loader-alt bx-spin'></i>";}
  const caption=document.getElementById('mom-caption')?.value?.trim()||null;
  let file=E.file;
  // Para fotos: aplanar filtro + dibujo + textos + stickers en un canvas
  if (E.mediaType==='photo'){
    try { file = await _momFlatten(); } catch(e){ /* si falla, sube el original */ }
  }
  const _isImg = E.mediaType==='photo' || (file.type||'').startsWith('image/');
  if (_isImg && window._compressImageFile) { try { file = await window._compressImageFile(file, 1280, 0.72); } catch(e){} }
  let url;
  try{
    if (window.cloudUpload) {
      const r = await window.cloudUpload(file, { folder:'canchero/momentos' });
      if (!r || !r.url) throw new Error('cloud');
      url = r.url;
      // Fallback de recorte: aplicar so_/du_ a la URL del video
      if (E.mediaType==='video' && E._trim && window.cloudTrimUrl){ url = window.cloudTrimUrl(url, E._trim.start, E._trim.du); }
    } else {
      const path=`momentos/${me().email}/${Date.now()}.${_isImg?'jpg':((file.name||'mp4').split('.').pop())}`;
      const up=await sb().storage.from('media').upload(path,file,{upsert:true,contentType:_isImg?'image/jpeg':(file.type||undefined)});
      if(up&&up.error)throw up.error;
      url=sb().storage.from('media').getPublicUrl(path).data.publicUrl;
    }
  }catch(e){ if(btn){btn.disabled=false;btn.innerHTML='Compartir';} toast('Error al subir','error'); return; }
  try{
    const r=await sb().from('momentos').insert({
      user_email:me().email, user_name:me().name||me().email, url, media_type:E.mediaType,
      title:caption, category:E.category||'Mi Día', is_story:true, filter:E.mediaType==='video'?E.filter:null,
      likes_count:0, created_at:new Date().toISOString(), expires_at:new Date(Date.now()+12*3600000).toISOString()
    });
    if(r&&r.error)throw r.error;
  }catch(e){ if(btn){btn.disabled=false;btn.innerHTML='Compartir';} toast('No se pudo publicar','error'); return; }
  window._closeMomEditor();
  toast('Momento publicado — dura 12 horas','success');
  if(window._loadMomentosBlock) window._loadMomentosBlock();
  if(window._refreshMomentoRings) window._refreshMomentoRings();
};

// Aplana imagen + filtro + dibujo + textos + stickers en un canvas
function _momFlatten(){
  return new Promise((resolve,reject)=>{
    const img=document.getElementById('mom-media'); const wrap=document.getElementById('mom-canvas-wrap');
    if(!img){ reject('no img'); return; }
    const iw=img.naturalWidth||img.clientWidth, ih=img.naturalHeight||img.clientHeight;
    const c=document.createElement('canvas'); c.width=iw; c.height=ih; const ctx=c.getContext('2d');
    ctx.filter=E.filter==='none'?'none':E.filter;
    ctx.drawImage(img,0,0,iw,ih); ctx.filter='none';
    // dibujo (escalar desde wrap a imagen)
    const draw=document.getElementById('mom-draw');
    if(draw && E.drawing){ ctx.drawImage(draw,0,0,iw,ih); }
    // textos y stickers (posición en % del wrap → imagen)
    const wrapH = (wrap&&wrap.clientHeight)||ih, scale = ih/wrapH;   // px en pantalla → px en imagen
    E.texts.forEach(t=>{ const fs=Math.round((t.size||28)*scale); ctx.fillStyle=t.color||'#fff'; ctx.strokeStyle='rgba(0,0,0,0.7)'; ctx.lineWidth=Math.max(2,fs*0.16); ctx.font=`900 ${fs}px Outfit, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; const x=t.x/100*iw, y=t.y/100*ih; ctx.strokeText(t.txt,x,y); ctx.fillText(t.txt,x,y); });
    // stickers tipo chip: fondo verde redondeado + texto negro (igual que en pantalla)
    E.stickers.forEach(t=>{
      const fs=Math.round(iw*0.055); ctx.font=`900 ${fs}px Outfit, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
      const x=t.x/100*iw, y=t.y/100*ih, w=ctx.measureText(t.s).width+fs*1.2, h=fs*1.8, r=fs*0.5;
      ctx.save(); ctx.translate(x,y); ctx.rotate(-4*Math.PI/180);
      ctx.fillStyle='#baff00'; ctx.beginPath();
      ctx.moveTo(-w/2+r,-h/2); ctx.arcTo(w/2,-h/2,w/2,h/2,r); ctx.arcTo(w/2,h/2,-w/2,h/2,r); ctx.arcTo(-w/2,h/2,-w/2,-h/2,r); ctx.arcTo(-w/2,-h/2,w/2,-h/2,r); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#000'; ctx.fillText(t.s,0,fs*0.06); ctx.restore();
    });
    c.toBlob(b=>{ if(b)resolve(new File([b],'momento.jpg',{type:'image/jpeg'})); else reject('blob'); },'image/jpeg',0.9);
  });
}

/* ── Registrar vista + lista de quién lo vio (engancha al visor existente) ── */
const _origOpenMomento = window._openMomento;
window._openMomento = async function(id){
  if (_origOpenMomento) await _origOpenMomento(id);
  // registrar vista
  if (me()){ try{ await sb().from('momento_views').upsert({momento_id:id,user_email:me().email,user_name:me().name||me().email,created_at:new Date().toISOString()},{onConflict:'momento_id,user_email'}); }catch(e){} }
  // si soy el dueño, mostrar botón "quién lo vio"
  setTimeout(async()=>{
    const mo=window._curMomento; const viewer=document.getElementById('momento-viewer'); if(!viewer)return;
    const r=await sb().from('momentos').select('user_email').eq('id',id).single().then(x=>x,()=>({data:null}));
    if(r&&r.data&&r.data.user_email===me()?.email && !document.getElementById('mom-viewers-btn')){
      const vr=await sb().from('momento_views').select('*').eq('momento_id',id).then(x=>x,()=>({data:[]}));
      const views=(vr&&vr.data)||[];
      const bar=viewer.querySelector('div[style*="border-top"]');
      if(bar){ const b=document.createElement('button'); b.id='mom-viewers-btn'; b.onclick=()=>window._momViewers(id);
        b.style.cssText='background:none;border:none;color:#fff;display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;';
        b.innerHTML=`<i class='bx bx-show' style="font-size:22px;"></i> ${views.length}`; bar.insertBefore(b,bar.firstChild); }
    }
  },400);
};
window._momViewers = async function(id){
  const r=await sb().from('momento_views').select('*').eq('momento_id',id).order('created_at',{ascending:false}).then(x=>x,()=>({data:[]}));
  const views=(r&&r.data)||[];
  let s=document.getElementById('mom-viewers-sheet'); if(s)s.remove();
  s=document.createElement('div'); s.id='mom-viewers-sheet';
  s.style.cssText='position:fixed;inset:0;z-index:30080;background:rgba(0,0,0,0.7);display:flex;align-items:flex-end;';
  s.innerHTML=`<div style="background:#111;border-radius:20px 20px 0 0;width:100%;max-width:480px;max-height:70vh;overflow-y:auto;padding:16px;" onclick="event.stopPropagation()">
    <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:0 auto 12px;"></div>
    <div style="font-weight:900;color:#fff;margin-bottom:12px;"><i class='bx bx-show'></i> Visto por ${views.length}</div>
    ${views.length?views.map(v=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #1a1a1a;"><div style="width:34px;height:34px;border-radius:50%;background:#1a3a1a;display:flex;align-items:center;justify-content:center;color:var(--accent);font-weight:900;">${(v.user_name||'?')[0].toUpperCase()}</div><div style="font-size:14px;color:#fff;">${v.user_name||v.user_email}</div></div>`).join(''):'<div style="text-align:center;color:#555;padding:20px;">Todavía nadie lo vio.</div>'}
  </div>`;
  s.onclick=()=>s.remove(); document.body.appendChild(s);
};

/* ── Anillo rojo en avatares con momentos activos (12h) ── */
window._refreshMomentoRings = async function(){
  try{
    const cutoff=new Date(Date.now()-12*3600000).toISOString();
    const r=await sb().from('momentos').select('user_email').gte('created_at',cutoff).limit(300);
    const emails=new Set(((r&&r.data)||[]).map(x=>x.user_email));
    document.querySelectorAll('[data-user-avatar]').forEach(av=>{
      const em=av.getAttribute('data-user-avatar');
      if(emails.has(em)){ av.style.boxShadow='0 0 0 2px #070907, 0 0 0 4px #ff3b3b'; av.style.borderRadius='50%'; }
    });
  }catch(e){}
};
setTimeout(()=>window._refreshMomentoRings&&window._refreshMomentoRings(), 3000);

console.log('[canchero-momentos-editor] ✅ Editor IG-style cargado');
})();
