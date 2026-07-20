/**
 * canchero-comunidades.js — Comunidades estilo Reddit (Fase 2.4)
 * Secciones temáticas donde los usuarios crean comunidades, se unen, publican y votan.
 * Aislado: no toca el feed ni el login. Usa Supabase (tablas communities / community_posts / community_members).
 * Sin emojis: solo iconos boxicons.
 */
(function(){
'use strict';
function sb(){ return window._sb || window.supabaseClient; }
function me(){ return window.userData || {}; }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function toast(t,k){ if(window.showToast) window.showToast(t,k||'info'); }
function ago(iso){ if(!iso)return''; const s=Math.floor((Date.now()-new Date(iso))/1000); if(s<60)return'ahora'; if(s<3600)return Math.floor(s/60)+'m'; if(s<86400)return Math.floor(s/3600)+'h'; return Math.floor(s/86400)+'d'; }

const C = {};

C.open = async function(){
  let v = document.getElementById('comunidades-view');
  if (v) v.remove();
  v = document.createElement('div');
  v.id = 'comunidades-view';
  // El overlay arranca DEBAJO del header (logo, campana, cambio de rol, ajustes):
  // con inset:0 lo tapaba y al entrar a Comunidades desaparecia la barra de arriba.
  var _nhC = (window._navH ? window._navH() : 0);
  v.style.cssText = 'position:fixed;left:0;right:0;bottom:0;top:' + _nhC + 'px;z-index:900;background:#0a0a0a;overflow-y:auto;-webkit-overflow-scrolling:touch;';
  // FANÁTICO: Comunidades es una sección propia de su barra inferior → SIN botón volver
  const _isFan = !!(window._activeProfileType && window._activeProfileType() === 'fanatico');
  const bar = _isFan
    ? `<div style="position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:10px;padding:calc(10px + env(safe-area-inset-top)) 16px 10px;background:#0a0a0a;border-bottom:1px solid #1a1a1a;"><span style="font-weight:900;font-size:16px;color:#fff;">Comunidades</span></div>`
    : (typeof window._appTopBar === 'function')
      ? window._appTopBar("document.getElementById('comunidades-view').remove()", 'Comunidades')
      : `<div style="position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:10px;padding:calc(10px + env(safe-area-inset-top)) 16px 10px;background:#0a0a0a;border-bottom:1px solid #1a1a1a;"><button onclick="document.getElementById('comunidades-view').remove()" style="background:rgba(255,255,255,0.08);border:none;color:#fff;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer;"><i class='bx bx-arrow-back'></i></button><span style="font-weight:900;font-size:16px;color:#fff;">Comunidades</span></div>`;
  v.innerHTML = bar +
    `<div style="max-width:640px;margin:0 auto;padding:14px 16px calc(90px + env(safe-area-inset-bottom));">
       <button onclick="window.CancheroComunidades.createModal()" style="width:100%;display:flex;align-items:center;gap:10px;background:rgba(186,255,0,0.08);border:1px solid rgba(186,255,0,0.3);color:var(--accent);border-radius:14px;padding:13px 16px;font-weight:800;font-size:14px;cursor:pointer;margin-bottom:16px;font-family:inherit;"><i class='bx bx-plus-circle' style="font-size:20px;"></i> Crear comunidad</button>
       <div id="comunidades-list"><div style="text-align:center;padding:40px;color:#555;"><i class='bx bx-loader-alt bx-spin' style="font-size:26px;color:var(--accent);"></i></div></div>
     </div>`;
  document.body.appendChild(v);
  C.loadList();
};

C.loadList = async function(){
  const box = document.getElementById('comunidades-list'); if (!box) return;
  const s = sb(); if (!s){ box.innerHTML = '<div style="color:#666;text-align:center;padding:30px;">Sin conexión.</div>'; return; }
  try {
    const { data, error } = await s.from('communities').select('*').order('members_count', { ascending:false }).limit(60);
    if (error) throw error;
    if (!data || !data.length){ box.innerHTML = '<div style="text-align:center;padding:40px;color:#666;font-size:13px;"><i class="bx bx-group" style="font-size:40px;display:block;margin-bottom:10px;opacity:.4;"></i>No hay comunidades todavía.<br>¡Creá la primera!</div>'; return; }
    box.innerHTML = data.map(c => C.cardHtml(c)).join('');
  } catch(e){
    box.innerHTML = `<div style="text-align:center;padding:30px;color:#f66;font-size:12px;">No se pudieron cargar las comunidades.<br><span style="color:#888;">${esc(e.message||'')}</span></div>`;
  }
};

C.cardHtml = function(c){
  const icon = c.icon || 'bx-group';
  return `<div onclick="window.CancheroComunidades.openCommunity('${c.id}')" style="display:flex;align-items:center;gap:12px;background:#111;border:1px solid #1e1e1e;border-radius:14px;padding:13px 14px;margin-bottom:10px;cursor:pointer;transition:border-color .15s;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='#1e1e1e'">
    <div style="width:46px;height:46px;border-radius:50%;background:rgba(186,255,0,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class='bx ${esc(icon)}' style="font-size:24px;color:var(--accent);"></i></div>
    <div style="flex:1;min-width:0;">
      <div style="font-weight:800;font-size:14px;color:#fff;">c/${esc(c.name)}</div>
      <div style="font-size:11px;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(c.description||'Sin descripción')}</div>
      <div style="font-size:10px;color:#555;margin-top:2px;"><i class='bx bx-user'></i> ${c.members_count||0} miembros</div>
    </div>
    <i class='bx bx-chevron-right' style="color:#444;font-size:22px;"></i>
  </div>`;
};

C.createModal = function(){
  const ex = document.getElementById('comu-create-modal'); if (ex) ex.remove();
  const icons = ['bx-group','bx-football','bx-shield','bx-trophy','bx-star','bx-flag','bx-map','bx-news','bx-crown','bx-fire'];
  const m = document.createElement('div');
  m.id = 'comu-create-modal';
  m.style.cssText = 'position:fixed;inset:0;z-index:21000;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
  m.onclick = function(e){ if (e.target===m) m.remove(); };
  m.innerHTML = `<div style="width:100%;max-width:420px;background:#0d0d0d;border:1px solid #1e1e1e;border-radius:18px;padding:20px 16px;">
    <div style="font-size:14px;font-weight:900;color:#fff;margin-bottom:14px;">Nueva comunidad</div>
    <label style="font-size:11px;color:#888;font-weight:700;">NOMBRE</label>
    <input id="comu-name" maxlength="30" placeholder="Ej: PenarolHinchas" style="width:100%;box-sizing:border-box;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;padding:11px;margin:6px 0 12px;font-size:14px;outline:none;">
    <label style="font-size:11px;color:#888;font-weight:700;">DESCRIPCIÓN</label>
    <textarea id="comu-desc" maxlength="140" rows="2" placeholder="¿De qué trata?" style="width:100%;box-sizing:border-box;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;padding:11px;margin:6px 0 12px;font-size:13px;outline:none;resize:none;"></textarea>
    <label style="font-size:11px;color:#888;font-weight:700;">ICONO</label>
    <div id="comu-icons" style="display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 16px;">${icons.map((ic,i)=>`<button type="button" onclick="window.CancheroComunidades._pickIcon(this,'${ic}')" data-ic="${ic}" style="width:42px;height:42px;border-radius:50%;background:${i===0?'rgba(186,255,0,0.15)':'#1a1a1a'};border:1px solid ${i===0?'var(--accent)':'#2a2a2a'};color:var(--accent);cursor:pointer;"><i class='bx ${ic}' style="font-size:20px;"></i></button>`).join('')}</div>
    <div style="display:flex;gap:8px;">
      <button onclick="document.getElementById('comu-create-modal').remove()" style="flex:1;background:transparent;border:1px solid #2a2a2a;color:#aaa;border-radius:12px;padding:12px;font-weight:700;cursor:pointer;font-family:inherit;">Cancelar</button>
      <button onclick="window.CancheroComunidades.create()" style="flex:2;background:var(--accent);border:none;color:#000;border-radius:12px;padding:12px;font-weight:900;cursor:pointer;font-family:inherit;">Crear</button>
    </div>
  </div>`;
  document.body.appendChild(m);
  C._pickedIcon = 'bx-group';
};
C._pickIcon = function(btn,ic){
  C._pickedIcon = ic;
  document.querySelectorAll('#comu-icons button').forEach(b=>{ b.style.background='#1a1a1a'; b.style.borderColor='#2a2a2a'; });
  btn.style.background='rgba(186,255,0,0.15)'; btn.style.borderColor='var(--accent)';
};
C.create = async function(){
  const s = sb(); if (!s || !me().email){ toast('Iniciá sesión','error'); return; }
  const name = (document.getElementById('comu-name').value||'').trim().replace(/\s+/g,'');
  const desc = (document.getElementById('comu-desc').value||'').trim();
  if (name.length < 3){ toast('El nombre debe tener al menos 3 letras','warning'); return; }
  try {
    const { data, error } = await s.from('communities').insert({
      name, description: desc || null, icon: C._pickedIcon || 'bx-group',
      created_by: me().email, members_count: 1
    }).select().single();
    if (error) throw error;
    try { await s.from('community_members').insert({ community_id: data.id, user_email: me().email }); } catch(e){}
    document.getElementById('comu-create-modal')?.remove();
    toast('Comunidad creada','success');
    C.loadList();
    C.openCommunity(data.id);
  } catch(e){ toast('Error: ' + (e.message||''), 'error'); }
};

C.openCommunity = async function(id){
  const s = sb(); if (!s) return;
  let v = document.getElementById('comunidad-detail'); if (v) v.remove();
  v = document.createElement('div');
  v.id = 'comunidad-detail';
  // El overlay arranca DEBAJO del header (logo, campana, cambio de rol, ajustes):
  // con inset:0 lo tapaba y al entrar a Comunidades desaparecia la barra de arriba.
  var _nhC = (window._navH ? window._navH() : 0);
  v.style.cssText = 'position:fixed;left:0;right:0;bottom:0;top:' + _nhC + 'px;z-index:901;background:#0a0a0a;overflow-y:auto;-webkit-overflow-scrolling:touch;';
  v.innerHTML = `<div style="text-align:center;padding:60px;color:#555;"><i class='bx bx-loader-alt bx-spin' style="font-size:26px;color:var(--accent);"></i></div>`;
  document.body.appendChild(v);
  try {
    const [{ data: c }, { data: mem }] = await Promise.all([
      s.from('communities').select('*').eq('id', id).single(),
      me().email ? s.from('community_members').select('id').eq('community_id', id).eq('user_email', me().email).maybeSingle() : Promise.resolve({data:null})
    ]);
    if (!c){ v.innerHTML = '<div style="padding:40px;text-align:center;color:#666;">Comunidad no encontrada.</div>'; return; }
    const joined = !!mem;
    const bar = (typeof window._appTopBar === 'function')
      ? window._appTopBar("document.getElementById('comunidad-detail').remove()", 'c/' + c.name)
      : `<div style="position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:10px;padding:calc(10px + env(safe-area-inset-top)) 16px 10px;background:#0a0a0a;border-bottom:1px solid #1a1a1a;"><button onclick="document.getElementById('comunidad-detail').remove()" style="background:rgba(255,255,255,0.08);border:none;color:#fff;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer;"><i class='bx bx-arrow-back'></i></button><span style="font-weight:900;font-size:16px;color:#fff;">c/${esc(c.name)}</span></div>`;
    v.innerHTML = bar +
      `<div style="max-width:640px;margin:0 auto;padding:14px 16px calc(90px + env(safe-area-inset-bottom));">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <div style="width:56px;height:56px;border-radius:50%;background:rgba(186,255,0,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class='bx ${esc(c.icon||'bx-group')}' style="font-size:28px;color:var(--accent);"></i></div>
          <div style="flex:1;min-width:0;"><div style="font-weight:900;font-size:18px;color:#fff;">c/${esc(c.name)}</div><div style="font-size:12px;color:#888;">${esc(c.description||'')}</div><div style="font-size:11px;color:#555;margin-top:2px;"><i class='bx bx-user'></i> <span id="comu-members-${c.id}">${c.members_count||0}</span> miembros</div></div>
          <button onclick="window.cancheroShare&&window.cancheroShare({type:'comunidad',id:'${c.id}',title:'c/${esc(c.name)} en Canchero',text:'Sumate a la comunidad c/${esc(c.name)} en Canchero'})" title="Compartir comunidad" style="flex-shrink:0;background:rgba(255,255,255,0.06);border:1px solid #333;color:#ccc;border-radius:50%;width:34px;height:34px;font-size:16px;cursor:pointer;margin-right:6px;"><i class='bx bx-share-alt'></i></button>
          <button id="comu-join-btn" onclick="window.CancheroComunidades.toggleJoin('${c.id}',${joined})" style="flex-shrink:0;background:${joined?'transparent':'var(--accent)'};border:1px solid ${joined?'#444':'var(--accent)'};color:${joined?'#fff':'#000'};border-radius:20px;padding:8px 16px;font-weight:800;font-size:12px;cursor:pointer;font-family:inherit;">${joined?'Unido':'Unirme'}</button>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:16px;">
          <input id="comu-post-input" placeholder="Compartí algo con la comunidad..." style="flex:1;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;color:#fff;padding:11px 14px;font-size:13px;outline:none;">
          <button onclick="window.CancheroComunidades.post('${c.id}')" style="background:var(--accent);border:none;color:#000;border-radius:12px;padding:0 16px;font-weight:900;cursor:pointer;font-family:inherit;">Postear</button>
        </div>
        <div id="comu-posts"><div style="text-align:center;padding:30px;color:#555;"><i class='bx bx-loader-alt bx-spin' style="font-size:22px;color:var(--accent);"></i></div></div>
      </div>`;
    C.loadPosts(id);
  } catch(e){ v.innerHTML = `<div style="padding:40px;text-align:center;color:#f66;">Error: ${esc(e.message||'')}</div>`; }
};

C.toggleJoin = async function(id, joined){
  const s = sb(); if (!s || !me().email){ toast('Iniciá sesión','error'); return; }
  const btn = document.getElementById('comu-join-btn');
  const memEl = document.getElementById('comu-members-'+id);
  try {
    if (joined){
      await s.from('community_members').delete().eq('community_id', id).eq('user_email', me().email);
      await s.rpc('bump_community_members', { p_id: id, p_delta: -1 }).catch(async()=>{ const {data:c}=await s.from('communities').select('members_count').eq('id',id).single(); await s.from('communities').update({members_count:Math.max(0,(c?.members_count||1)-1)}).eq('id',id); });
      if (btn){ btn.textContent='Unirme'; btn.style.background='var(--accent)'; btn.style.color='#000'; btn.style.borderColor='var(--accent)'; btn.setAttribute('onclick',`window.CancheroComunidades.toggleJoin('${id}',false)`); }
      if (memEl) memEl.textContent = Math.max(0,(parseInt(memEl.textContent)||1)-1);
    } else {
      await s.from('community_members').insert({ community_id: id, user_email: me().email });
      await s.rpc('bump_community_members', { p_id: id, p_delta: 1 }).catch(async()=>{ const {data:c}=await s.from('communities').select('members_count').eq('id',id).single(); await s.from('communities').update({members_count:(c?.members_count||0)+1}).eq('id',id); });
      if (btn){ btn.textContent='Unido'; btn.style.background='transparent'; btn.style.color='#fff'; btn.style.borderColor='#444'; btn.setAttribute('onclick',`window.CancheroComunidades.toggleJoin('${id}',true)`); }
      if (memEl) memEl.textContent = (parseInt(memEl.textContent)||0)+1;
    }
  } catch(e){ toast('Error: '+(e.message||''),'error'); }
};

C.post = async function(id){
  const s = sb(); if (!s || !me().email){ toast('Iniciá sesión','error'); return; }
  const inp = document.getElementById('comu-post-input');
  const txt = (inp.value||'').trim();
  if (!txt){ toast('Escribí algo','warning'); return; }
  try {
    var _base = { community_id: id, user_email: me().email, user_name: me().name || (me().email||'').split('@')[0], user_photo: me().photo || null, content: txt, votes: 0 };
    var _r = await s.from('community_posts').insert(Object.assign({ user_country: me().nat || me().country || me().nationality || null }, _base));
    // Si la columna user_country aún no existe, reintentar sin ella.
    if (_r && _r.error && /user_country/.test(_r.error.message||'')) _r = await s.from('community_posts').insert(_base);
    if (_r && _r.error) { toast('Error: '+_r.error.message,'error'); return; }
    inp.value = '';
    C.loadPosts(id);
  } catch(e){ toast('Error: '+(e.message||''),'error'); }
};

C.loadPosts = async function(id){
  const box = document.getElementById('comu-posts'); if (!box) return;
  const s = sb(); if (!s) return;
  try {
    const { data, error } = await s.from('community_posts').select('*').eq('community_id', id).order('votes',{ascending:false}).order('created_at',{ascending:false}).limit(60);
    if (error) throw error;
    if (!data || !data.length){ box.innerHTML = '<div style="text-align:center;padding:30px;color:#666;font-size:13px;">Todavía no hay posts. ¡Sé el primero!</div>'; return; }
    // Enriquecer con el ENCUADRE de la foto de perfil (photo_style) para que el
    // avatar se vea IGUAL que en el resto de la app (mismo recorte/posición).
    try {
      const ems = [...new Set(data.map(p=>p.user_email).filter(Boolean))];
      if (ems.length) {
        const { data: us } = await s.from('users').select('email,photo_style').in('email', ems);
        const umap = {}; (us||[]).forEach(u=>umap[u.email]=u);
        data.forEach(p => { const u = umap[p.user_email]; if (u) p._pstyle = u.photo_style || null; });
      }
    } catch(e){}
    box.innerHTML = data.map(p => C.postHtml(p)).join('');
  } catch(e){ box.innerHTML = `<div style="text-align:center;padding:20px;color:#f66;font-size:12px;">${esc(e.message||'')}</div>`; }
};

// Editar un post PROPIO de la comunidad (solo el autor, desde cualquier rol suyo)
C.editPost = async function(pid, communityId){
  const s = sb(); if (!s || !me().email) return;
  try {
    const { data: p } = await s.from('community_posts').select('*').eq('id', pid).single();
    if (!p || (p.user_email||'').toLowerCase() !== (me().email||'').toLowerCase()){ toast('Solo podés editar tus propios comentarios.','warning'); return; }
    const ex = document.getElementById('comu-edit-modal'); if (ex) ex.remove();
    const m = document.createElement('div');
    m.id = 'comu-edit-modal';
    m.style.cssText = 'position:fixed;inset:0;z-index:21500;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
    m.onclick = function(e){ if (e.target===m) m.remove(); };
    m.innerHTML = `<div style="width:100%;max-width:420px;background:#0d0d0d;border:1px solid #1e1e1e;border-radius:18px;padding:18px 16px;">
      <div style="font-size:14px;font-weight:900;color:#fff;margin-bottom:12px;">Editar comentario</div>
      <textarea id="comu-edit-txt" rows="4" maxlength="500" style="width:100%;box-sizing:border-box;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;padding:11px;font-size:13px;outline:none;resize:none;margin-bottom:12px;">${esc(p.content||'')}</textarea>
      <div style="display:flex;gap:8px;">
        <button onclick="document.getElementById('comu-edit-modal').remove()" style="flex:1;background:transparent;border:1px solid #2a2a2a;color:#aaa;border-radius:12px;padding:12px;font-weight:700;cursor:pointer;font-family:inherit;">Cancelar</button>
        <button id="comu-edit-save" style="flex:2;background:var(--accent);border:none;color:#000;border-radius:12px;padding:12px;font-weight:900;cursor:pointer;font-family:inherit;">Guardar</button>
      </div></div>`;
    document.body.appendChild(m);
    m.querySelector('#comu-edit-save').onclick = async function(){
      const txt = (m.querySelector('#comu-edit-txt').value||'').trim();
      if (!txt){ toast('Escribí algo','warning'); return; }
      const r = await s.from('community_posts').update({ content: txt }).eq('id', pid).eq('user_email', me().email);
      if (r.error){ toast('Error: '+r.error.message,'error'); return; }
      m.remove(); toast('Comentario editado','success'); C.loadPosts(communityId);
    };
  } catch(e){ toast('Error: '+(e.message||''),'error'); }
};
// Eliminar un post PROPIO de la comunidad
C.deletePost = async function(pid, communityId){
  const s = sb(); if (!s || !me().email) return;
  if (!confirm('¿Eliminar tu comentario? Esta acción no se puede deshacer.')) return;
  try {
    const r = await s.from('community_posts').delete().eq('id', pid).eq('user_email', me().email);
    if (r.error) throw r.error;
    toast('Comentario eliminado','success');
    C.loadPosts(communityId);
  } catch(e){ toast('Error: '+(e.message||''),'error'); }
};
C.postHtml = function(p){
  // Avatar: círculo con la foto centrada (o inicial si no hay). Antes el background suelto
  // se veía mal posicionado; ahora es un contenedor con overflow y flex centrado.
  const _init = ((p.user_name||'?').trim()[0]||'?').toUpperCase();
  // Avatar con el MISMO encuadre que toda la app (_avatarBgCss: photoStyle o rostro 25%)
  const _avCss = p.user_photo ? ((window._avatarBgCss && window._avatarBgCss({ photo: p.user_photo, photo_style: p._pstyle })) || `background-image:url('${p.user_photo}');background-size:cover;background-position:center 25%;`) : '';
  const av = p.user_photo
    ? `<div style="width:26px;height:26px;border-radius:50%;flex-shrink:0;${_avCss}"></div>`
    : `<div style="width:26px;height:26px;border-radius:50%;flex-shrink:0;background:#1a1a1a;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:var(--accent);">${_init}</div>`;
  // Acciones del AUTOR: editar / eliminar su propio comentario
  const _mine = me().email && (p.user_email||'').toLowerCase() === (me().email||'').toLowerCase();
  const ownBtns = _mine
    ? `<span style="margin-left:auto;display:inline-flex;gap:2px;flex-shrink:0;">
        <button onclick="window.CancheroComunidades.editPost('${p.id}','${p.community_id}')" title="Editar" style="background:none;border:none;color:#555;cursor:pointer;font-size:15px;padding:2px 4px;line-height:1;"><i class='bx bx-edit'></i></button>
        <button onclick="window.CancheroComunidades.deletePost('${p.id}','${p.community_id}')" title="Eliminar" style="background:none;border:none;color:#555;cursor:pointer;font-size:15px;padding:2px 4px;line-height:1;"><i class='bx bx-trash'></i></button>
      </span>`
    : '';
  // Bandera del país junto al nombre (P4.2).
  const _flag = (p.user_country && window.countryFlag) ? window.countryFlag(p.user_country, 13) : '';
  return `<div style="display:flex;gap:10px;background:#111;border:1px solid #1e1e1e;border-radius:14px;padding:12px 14px;margin-bottom:10px;">
    <div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0;">
      <button onclick="window.CancheroComunidades.vote('${p.id}',1)" style="background:none;border:none;color:#888;cursor:pointer;font-size:20px;line-height:1;"><i class='bx bx-upvote'></i></button>
      <span id="comu-votes-${p.id}" style="font-size:12px;font-weight:900;color:var(--accent);">${p.votes||0}</span>
      <button onclick="window.CancheroComunidades.vote('${p.id}',-1)" style="background:none;border:none;color:#888;cursor:pointer;font-size:20px;line-height:1;"><i class='bx bx-downvote'></i></button>
    </div>
    <div style="flex:1;min-width:0;">
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;">
        ${av}
        <span style="font-size:12px;font-weight:700;color:#ddd;">${esc(p.user_name||'Usuario')}</span>
        ${_flag ? `<span style="flex-shrink:0;line-height:1;">${_flag}</span>` : ''}
        <span style="font-size:10px;color:#555;">· ${ago(p.created_at)}</span>
        ${ownBtns}
      </div>
      <div style="font-size:14px;color:#eee;line-height:1.5;word-break:break-word;">${esc(p.content||'')}</div>
    </div>
  </div>`;
};

C.vote = async function(pid, delta){
  const s = sb(); if (!s || !me().email){ toast('Iniciá sesión','error'); return; }
  const el = document.getElementById('comu-votes-'+pid);
  // Optimista
  if (el) el.textContent = (parseInt(el.textContent)||0) + delta;
  try {
    const ok = await s.rpc('bump_community_post_votes', { p_id: pid, p_delta: delta });
    if (ok && ok.error) throw ok.error;
  } catch(e){
    try { const { data:p } = await s.from('community_posts').select('votes').eq('id',pid).single(); await s.from('community_posts').update({ votes:(p?.votes||0)+delta }).eq('id',pid); } catch(_){}
  }
};

window.CancheroComunidades = C;
console.log('[canchero-comunidades] ✅ comunidades cargadas');
})();
