/**
 * canchero-player-card.js — Carta del jugador estilo FIFA (canvas → imagen)
 * Aditivo. Se puede invocar al cerrar un partido o desde el perfil.
 * API: CancheroCard.open({ name, photo, position, club, rating, goals, assists, mvp })
 *      CancheroCard.fromUser()  → arma la carta con userData
 */
window.CancheroCard = (function(){
  'use strict';

  function _draw(o){
    return new Promise(function(resolve){
      const W=640, H=900;
      const c=document.createElement('canvas'); c.width=W; c.height=H;
      const x=c.getContext('2d');
      // Fondo degradé oscuro con acento
      const g=x.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#16210a'); g.addColorStop(0.5,'#0a0a0a'); g.addColorStop(1,'#0d1505');
      x.fillStyle=g; _round(x,0,0,W,H,40); x.fill();
      // Borde acento
      x.strokeStyle='#baff00'; x.lineWidth=6; _round(x,12,12,W-24,H-24,34); x.stroke();
      // Rating grande
      x.fillStyle='#baff00'; x.font='900 120px Inter, Arial'; x.textAlign='left';
      x.fillText(String(o.rating||75), 48, 150);
      x.fillStyle='#fff'; x.font='800 30px Inter, Arial';
      x.fillText((o.position||'JUG').toUpperCase(), 54, 195);
      // Logo Canchero arriba derecha
      x.fillStyle='#baff00'; x.font='900 26px Inter, Arial'; x.textAlign='right';
      x.fillText('CANCHERO', W-48, 70);

      const finish=function(){
        // Nombre
        x.textAlign='center'; x.fillStyle='#fff'; x.font='900 46px Inter, Arial';
        x.fillText((o.name||'JUGADOR').toUpperCase().slice(0,16), W/2, 640);
        // Club
        if(o.club){ x.fillStyle='#9c9'; x.font='700 24px Inter, Arial'; x.fillText(String(o.club).slice(0,22), W/2, 678); }
        // Línea
        x.strokeStyle='rgba(186,255,0,0.4)'; x.lineWidth=2; x.beginPath(); x.moveTo(90,706); x.lineTo(W-90,706); x.stroke();
        // Stats
        const stats=[['GOL',o.goals||0],['ASI',o.assists||0],['PJ',o.matches||0],['MVP',o.mvp||0]];
        const colW=(W-120)/stats.length;
        stats.forEach(function(s,i){
          const cx=60+colW*i+colW/2;
          x.fillStyle='#baff00'; x.font='900 40px Inter, Arial'; x.fillText(String(s[1]), cx, 770);
          x.fillStyle='#888'; x.font='700 18px Inter, Arial'; x.fillText(s[0], cx, 800);
        });
        resolve(c.toDataURL('image/png'));
      };

      // Foto (circular) centrada
      if(o.photo){
        const img=new Image(); img.crossOrigin='anonymous';
        img.onload=function(){ x.save(); x.beginPath(); x.arc(W/2,420,150,0,Math.PI*2); x.closePath(); x.clip();
          x.drawImage(img, W/2-150, 270, 300, 300); x.restore();
          x.strokeStyle='#baff00'; x.lineWidth=5; x.beginPath(); x.arc(W/2,420,150,0,Math.PI*2); x.stroke(); finish(); };
        img.onerror=function(){ _initials(x,o,W); finish(); };
        img.src=o.photo;
      } else { _initials(x,o,W); finish(); }
    });
  }
  function _initials(x,o,W){ x.save(); x.beginPath(); x.arc(W/2,420,150,0,Math.PI*2); x.fillStyle='#1d2a1d'; x.fill();
    x.strokeStyle='#baff00'; x.lineWidth=5; x.stroke(); x.fillStyle='#baff00'; x.font='900 130px Inter, Arial'; x.textAlign='center';
    x.fillText(((o.name||'?')[0]||'?').toUpperCase(), W/2, 465); x.restore(); }
  function _round(x,xx,yy,w,h,r){ x.beginPath(); x.moveTo(xx+r,yy); x.arcTo(xx+w,yy,xx+w,yy+h,r); x.arcTo(xx+w,yy+h,xx,yy+h,r); x.arcTo(xx,yy+h,xx,yy,r); x.arcTo(xx,yy,xx+w,yy,r); x.closePath(); }

  async function open(o){
    o=o||{};
    const dataUrl=await _draw(o);
    let m=document.getElementById('player-card-modal'); if(m)m.remove();
    m=document.createElement('div'); m.id='player-card-modal';
    m.style.cssText='position:fixed;inset:0;z-index:100070;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;gap:14px;';
    m.innerHTML='<img src="'+dataUrl+'" style="max-width:300px;width:100%;border-radius:18px;box-shadow:0 10px 40px rgba(0,0,0,0.6);">'+
      '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">'+
      '<button id="pc-share" style="background:var(--accent);color:#000;border:none;border-radius:24px;padding:12px 22px;font-weight:900;cursor:pointer;"><i class="bx bx-share-alt"></i> Compartir</button>'+
      '<button id="pc-feed" style="background:rgba(186,255,0,0.1);color:var(--accent);border:1px solid rgba(186,255,0,0.35);border-radius:24px;padding:12px 22px;font-weight:800;cursor:pointer;"><i class="bx bx-news"></i> Al feed</button>'+
      '<button id="pc-close" style="background:rgba(255,255,255,0.08);color:#aaa;border:none;border-radius:24px;padding:12px 20px;font-weight:700;cursor:pointer;">Cerrar</button>'+
      '</div>';
    document.body.appendChild(m);
    document.getElementById('pc-close').onclick=function(){ m.remove(); };
    document.getElementById('pc-share').onclick=async function(){
      try {
        const blob=await (await fetch(dataUrl)).blob();
        const file=new File([blob],'mi-carta-canchero.png',{type:'image/png'});
        if(navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file], title:'Mi carta Canchero', text:'Mi carta en Canchero'}); return; }
      } catch(e){}
      // Fallback: descargar
      const a=document.createElement('a'); a.href=dataUrl; a.download='mi-carta-canchero.png'; a.click();
      if(window.showToast) showToast('Carta descargada. ¡Compartila!','success');
    };
    document.getElementById('pc-feed').onclick=async function(){
      try {
        if(window.createPostFromText){ await window.createPostFromText('Mi carta Canchero ⚡', dataUrl, 'image'); if(window.showToast) showToast('Carta publicada en el feed','success'); m.remove(); return; }
      } catch(e){}
      if(window.showToast) showToast('No se pudo publicar; probá Compartir.','error');
    };
  }

  function fromUser(extra){
    const u=window.userData||{}; const s=u.stats||{};
    return open(Object.assign({
      name:u.name||u.email, photo:u.photo, position:(u.pos||u.position||'JUG'),
      club:u.club_name, rating:(u.rating|| (s.rating)||75),
      goals:s.goals||0, assists:s.assists||0, matches:s.matches||s.played||0, mvp:s.mvp||0
    }, extra||{}));
  }

  return { open, fromUser };
})();
console.log('[canchero-player-card] ✅ carta FIFA');
