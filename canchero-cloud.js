/**
 * canchero-cloud.js — Media en Cloudinary (saca fotos/videos de Supabase → baja egress a casi cero)
 * Subidas SIN firmar con el preset "Canchero". Solo se guarda la URL en Supabase.
 * API:
 *   await window.cloudUpload(file, { folder, onProgress }) → { url, type, publicId } | null
 *   window.cloudUrl(url, transform) → URL con transformaciones (f_auto,q_auto,...)
 */
(function(){
'use strict';
const CLOUD = 'dpgvigyc3';
const PRESET = 'Canchero';
const ENDPOINT = 'https://api.cloudinary.com/v1_1/' + CLOUD + '/auto/upload';

window.cloudUpload = function(file, opts){
  opts = opts || {};
  return new Promise(function(resolve){
    if (!file){ resolve(null); return; }
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', PRESET);
      if (opts.folder) fd.append('folder', opts.folder);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', ENDPOINT, true);
      if (opts.onProgress && xhr.upload){ xhr.upload.onprogress = function(e){ if(e.lengthComputable) try{ opts.onProgress(Math.round(e.loaded/e.total*100)); }catch(_){} }; }
      xhr.onload = function(){
        try {
          const r = JSON.parse(xhr.responseText||'{}');
          if (r && r.secure_url) resolve({ url: r.secure_url, type: r.resource_type, publicId: r.public_id, duration: r.duration });
          else resolve(null);
        } catch(e){ resolve(null); }
      };
      xhr.onerror = function(){ resolve(null); };
      xhr.send(fd);
    } catch(e){ resolve(null); }
  });
};

// Inserta transformaciones en una URL de Cloudinary (después de /upload/).
// Para imágenes: f_auto,q_auto,w_1280. Para no-Cloudinary devuelve la URL igual.
window.cloudUrl = function(url, transform){
  if (!url || url.indexOf('res.cloudinary.com') < 0) return url;
  transform = transform || 'f_auto,q_auto';
  // Evitar duplicar transformaciones
  if (url.indexOf('/upload/' + transform) >= 0) return url;
  return url.replace('/upload/', '/upload/' + transform + '/');
};

// Helper opcional: sube y, si es imagen, comprime antes (menos datos a Cloudinary).
window.cloudUploadSmart = async function(file, opts){
  opts = opts || {};
  let f = file;
  try {
    if (f && f.type && f.type.indexOf('image/') === 0 && window._compressImageFile) {
      f = await window._compressImageFile(f, 1600, 0.78);
    }
  } catch(e){}
  return window.cloudUpload(f, opts);
};

console.log('[canchero-cloud] ✅ Cloudinary (' + CLOUD + ') listo');
})();
