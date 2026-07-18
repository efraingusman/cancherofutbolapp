/**
 * canchero-player-actions.js
 * Micro-interacciones uniformes sobre un jugador:
 *  - window.openPlayerActions(email, name): hoja con "Ver perfil completo" + "Seguir / Dejar de seguir".
 *  - window.playerAvailDot(isAvail): devuelve el HTML de un punto verde de disponibilidad
 *    (posición absoluta sobre el avatar). El contenedor del avatar debe ser position:relative.
 * Degrada con gracia si falta Supabase o las funciones globales.
 */
(function(){
'use strict';
const sb = () => window._sb || window.supabaseClient || null;
const me = () => window.userData || null;

// Punto verde de disponibilidad (badge absoluto sobre el avatar)
window.playerAvailDot = function(isAvail){
  if (!isAvail) return '';
  return `<span class="player-avail-dot" title="Disponible para jugar" style="position:absolute;bottom:-1px;right:-1px;width:12px;height:12px;border-radius:50%;background:#00e676;border:2px solid #0a0a0a;box-shadow:0 0 6px rgba(0,230,118,0.6);"></span>`;
};

window.openPlayerActions = async function(email, name){
  email = (email||'').trim();
  if (!email) return;
  const my = me();
  // Si es mi propio perfil, abrir directo
  if (my && (my.email||'').toLowerCase() === email.toLowerCase()){
    if (window.viewUserProfile) window.viewUserProfile(email);
    return;
  }

  let sheet = document.getElementById('player-actions-sheet');
  if (sheet) sheet.remove();
  sheet = document.createElement('div');
  sheet.id = 'player-actions-sheet';
  sheet.style.cssText = 'position:fixed;inset:0;z-index:100050;background:rgba(0,0,0,0.7);display:flex;align-items:flex-end;justify-content:center;';

  const nmEsc = (name||email.split('@')[0]).replace(/'/g,"\\'");
  const emEsc = email.replace(/'/g,"\\'");

  sheet.innerHTML = `<div onclick="event.stopPropagation()" style="background:#111;border-radius:20px 20px 0 0;width:100%;max-width:480px;padding:14px 16px calc(16px + env(safe-area-inset-bottom));">
    <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:0 auto 14px;"></div>
    <div style="font-size:14px;font-weight:900;color:#fff;margin-bottom:8px;">${(name||email.split('@')[0]).replace(/</g,'&lt;')}</div>
    <button onclick="document.getElementById('player-actions-sheet').remove();window.viewUserProfile&&window.viewUserProfile('${emEsc}')" style="display:flex;align-items:center;gap:14px;width:100%;background:none;border:none;border-bottom:1px solid #1a1a1a;color:#fff;padding:15px 6px;font-size:14px;font-weight:600;cursor:pointer;text-align:left;"><i class='bx bx-user' style="font-size:22px;color:var(--accent);width:26px;"></i>Ver perfil completo</button>
    <button id="pa-follow-btn" onclick="window._paToggleFollow('${emEsc}','${nmEsc}')" style="display:flex;align-items:center;gap:14px;width:100%;background:none;border:none;border-bottom:1px solid #1a1a1a;color:#fff;padding:15px 6px;font-size:14px;font-weight:600;cursor:pointer;text-align:left;"><i class='bx bx-loader-alt bx-spin' style="font-size:22px;color:var(--accent);width:26px;"></i>Cargando…</button>
    <button onclick="document.getElementById('player-actions-sheet').remove();window.openDM&&window.openDM('${emEsc}','${nmEsc}')" style="display:flex;align-items:center;gap:14px;width:100%;background:none;border:none;color:#fff;padding:15px 6px;font-size:14px;font-weight:600;cursor:pointer;text-align:left;"><i class='bx bx-message-dots' style="font-size:22px;color:var(--accent);width:26px;"></i>Mensaje</button>
    <button onclick="document.getElementById('player-actions-sheet').remove()" style="width:100%;margin-top:10px;background:#1a1a1a;color:#888;border:none;border-radius:12px;padding:12px;font-weight:700;cursor:pointer;">Cancelar</button>
  </div>`;
  sheet.onclick = () => sheet.remove();
  document.body.appendChild(sheet);

  // Estado de seguimiento actual
  let following = false;
  try {
    const client = sb();
    if (client && my){
      const { data } = await client.from('follows').select('follower_email').eq('follower_email', my.email).eq('following_email', email).maybeSingle();
      following = !!data;
    }
  } catch(e){}
  _paRenderFollow(following);
};

function _paRenderFollow(following){
  const btn = document.getElementById('pa-follow-btn');
  if (!btn) return;
  btn.dataset.following = following ? 'true' : 'false';
  btn.innerHTML = following
    ? `<i class='bx bx-user-check' style="font-size:22px;color:#888;width:26px;"></i>Dejar de seguir`
    : `<i class='bx bx-user-plus' style="font-size:22px;color:var(--accent);width:26px;"></i>Seguir`;
}

window._paToggleFollow = async function(email, name){
  const my = me(); const client = sb();
  if (!my || !client){ if(window.showToast) showToast('Iniciá sesión','error'); return; }
  const btn = document.getElementById('pa-follow-btn');
  const following = btn && btn.dataset.following === 'true';
  try {
    if (following){
      await client.from('follows').delete().eq('follower_email', my.email).eq('following_email', email);
      if (window.showToast) showToast('Dejaste de seguir a '+(name||''),'info');
    } else {
      await client.from('follows').insert({ follower_email: my.email, following_email: email });
      if (window.notif) try{ window.notif.create(email,'follow',my.name,(my.name||'Alguien')+' ahora te sigue.'); }catch(e){}
      if (window.showToast) showToast('Ahora seguís a '+(name||''),'success');
    }
    _paRenderFollow(!following);
  } catch(e){ if(window.showToast) showToast('No se pudo actualizar','error'); }
};

console.log('[canchero-player-actions] ✅ openPlayerActions + playerAvailDot');
})();
