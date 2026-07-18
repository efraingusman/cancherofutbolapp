/**
 * canchero-avatars.js — Helpers únicos de avatar (Fase 2.1).
 * Foto de perfil consistente en TODOS los renders: misma forma (círculo),
 * misma optimización (Cloudinary f_auto,q_auto + recorte a la cara) y mismo
 * fallback a iniciales cuando no hay foto o falla la carga.
 *
 * API:
 *   window.avatarUrl(src, size)          → URL optimizada (o la original si no es Cloudinary)
 *   window.userAvatar(user, size, opts)  → HTML de un avatar redondo (foto o iniciales)
 *   window.bizAvatar(biz, size, opts)    → idem para negocios (logo/photo)
 *
 * Aditivo y a prueba de fallos: si algo falta, degrada a iniciales.
 */
(function(){
'use strict';

function esc(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function initial(name, email){
  const n = (name||'').trim() || (email||'').trim();
  return n ? n[0].toUpperCase() : '?';
}
// Color estable a partir del nombre/email (mismo usuario → mismo color)
function hueFor(key){
  let h=0; const s=(key||'?'); for(let i=0;i<s.length;i++) h=(h*31 + s.charCodeAt(i))>>>0;
  return h % 360;
}

// Optimiza la URL: Cloudinary → f_auto,q_auto + (si hay size) recorte cuadrado a la cara.
window.avatarUrl = function(src, size){
  if (!src) return '';
  if (src.indexOf('res.cloudinary.com') < 0) return src;          // data: / otros hosts → sin tocar
  let t = 'f_auto,q_auto';
  if (size){ const px = Math.round(size*2); t += `,c_fill,g_face,w_${px},h_${px}`; }  // 2x para retina
  if (src.indexOf('/upload/'+t) >= 0) return src;
  return src.replace('/upload/', '/upload/'+t+'/');
};

function _hasPhoto(p){ return p && typeof p==='string' && p.trim() && !/ui-avatars|placehold/i.test(p); }

function _render(photo, name, email, size, opts){
  opts = opts || {};
  size = size || 40;
  const fs = Math.max(11, Math.round(size*0.42));
  const ring = opts.ring ? `box-shadow:0 0 0 2px #070907,0 0 0 4px ${opts.ring};` : '';
  const extra = opts.style || '';
  const dataAttr = email ? ` data-user-avatar="${esc(email)}"` : '';
  const hue = hueFor(name||email);
  const initStyle = `background:linear-gradient(135deg,hsl(${hue},55%,28%),hsl(${hue},60%,16%));color:#fff;`;
  const ini = esc(initial(name,email));
  // Iniciales SIEMPRE de fondo; la <img> encima las tapa si carga. Si falla,
  // onerror solo oculta la <img> y quedan visibles las iniciales. Sin escapes
  // raros en el atributo (el bug previo rompía el HTML con \').
  const initialsLayer = `<div style="position:absolute;inset:0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:${fs}px;${initStyle}">${ini}</div>`;
  if (_hasPhoto(photo)){
    const url = esc(window.avatarUrl(photo, size));
    return `<div${dataAttr} style="position:relative;width:${size}px;height:${size}px;border-radius:50%;flex-shrink:0;overflow:hidden;${ring}${extra}">${initialsLayer}<img src="${url}" onerror="this.style.display='none'" loading="lazy" style="position:relative;width:100%;height:100%;object-fit:cover;display:block;">` + `</div>`;
  }
  return `<div${dataAttr} style="position:relative;width:${size}px;height:${size}px;border-radius:50%;flex-shrink:0;overflow:hidden;${ring}${extra}">${initialsLayer}</div>`;
}

// Mapa nombre→ISO2 de países más comunes (para mostrar la banderita junto al nombre).
const _CC = {
  'uruguay':'uy','argentina':'ar','brasil':'br','brazil':'br','chile':'cl','paraguay':'py',
  'colombia':'co','méxico':'mx','mexico':'mx','perú':'pe','peru':'pe','ecuador':'ec',
  'venezuela':'ve','bolivia':'bo','españa':'es','espana':'es','spain':'es',
  'estados unidos':'us','united states':'us','usa':'us','italia':'it','italy':'it',
  'francia':'fr','france':'fr','alemania':'de','germany':'de','inglaterra':'gb','reino unido':'gb','uk':'gb',
  'portugal':'pt','países bajos':'nl','holanda':'nl','japón':'jp','japan':'jp','china':'cn',
  'cuba':'cu','república dominicana':'do','panamá':'pa','panama':'pa','costa rica':'cr',
  'guatemala':'gt','honduras':'hn','el salvador':'sv','nicaragua':'ni','canadá':'ca','canada':'ca'
};
// Devuelve el HTML de la banderita (img 14×10 inline). Si no tenemos código, vacío.
window.countryFlag = function(name, size){
  if (!name) return '';
  const cc = _CC[String(name).trim().toLowerCase()];
  if (!cc) return '';
  const h = size || 12;
  return `<img src="https://flagcdn.com/w40/${cc}.png" alt="${esc(name)}" title="${esc(name)}" style="display:inline-block;width:${Math.round(h*1.45)}px;height:${h}px;border-radius:2px;object-fit:cover;vertical-align:-1px;border:1px solid rgba(255,255,255,0.12);" loading="lazy">`;
};

// Avatar de usuario/jugador/fanático.
window.userAvatar = function(user, size, opts){
  user = user || {};
  const photo = user.photo || user.avatar || user.user_avatar || user.foto || null;
  const name  = user.name || user.user_name || user.nombre || '';
  const email = user.email || user.user_email || '';
  return _render(photo, name, email, size, opts);
};

// Avatar de negocio (tienda/complejo/profesional/organización).
window.bizAvatar = function(biz, size, opts){
  biz = biz || {};
  const photo = biz.logo || biz.photo || biz.image_url || biz.avatar || null;
  const name  = biz.name || biz.business_name || biz.nombre || '';
  const email = biz.email || biz.user_email || '';
  return _render(photo, name, email, size, opts);
};

console.log('[canchero-avatars] ✅ Helpers de avatar listos');
})();
