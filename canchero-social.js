/**
 * canchero-social.js — Buscador del feed, guardados (bookmark), estadísticas y tendencias.
 * Aditivo y a prueba de fallos (degradado si faltan tablas/columnas en DB).
 */
// Verifica que un video no dure más de maxSec (default 60s). Resuelve true si es válido.
window.checkVideoDuration = function(file, maxSec){
  maxSec = maxSec || 60;
  return new Promise(function(resolve){
    try {
      if (!file || !file.type || file.type.indexOf('video/') !== 0) { resolve(true); return; }
      const v = document.createElement('video');
      v.preload = 'metadata';
      const url = URL.createObjectURL(file);
      v.onloadedmetadata = function(){ URL.revokeObjectURL(url); resolve(!v.duration || v.duration <= maxSec + 0.5); };
      v.onerror = function(){ URL.revokeObjectURL(url); resolve(true); }; // si no se puede leer, no bloquear
      v.src = url;
    } catch(e){ resolve(true); }
  });
};

window.CancheroSocial = (function(){
  'use strict';
  function sb(){ return window._sb || null; }
  function me(){ return window.userData || null; }
  function escH(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // ── BUSCADOR ────────────────────────────────────────────────
  function openSearch(){
    let m = document.getElementById('feed-search-overlay'); if (m) m.remove();
    m = document.createElement('div'); m.id = 'feed-search-overlay';
    m.style.cssText = 'position:fixed;inset:0;z-index:100090;background:#0a0a0a;display:flex;flex-direction:column;';
    m.innerHTML = `
      <!-- Barra superior estándar (logo + campana + ajustes) -->
      <div style="flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;padding:max(env(safe-area-inset-top,0px),10px) 14px 6px;background:#0d0d0d;">
        <img src="logo-oficial.png" onerror="this.src='logo.png'" style="height:32px;width:auto;">
        <div style="display:flex;align-items:center;gap:8px;">
          <button onclick="window.CancheroNotif?window.CancheroNotif.togglePanel():(window.openNotificationsPanel&&window.openNotificationsPanel())" style="background:rgba(255,255,255,0.06);border:1px solid #333;color:#aaa;width:36px;height:36px;border-radius:50%;font-size:17px;cursor:pointer;"><i class='bx bx-bell'></i></button>
          <button onclick="window.switchDashboardTab&&switchDashboardTab((window.userData&&window.userData.role)||'jugador','ajustes',null)" style="background:rgba(255,255,255,0.06);border:1px solid #333;color:#aaa;width:36px;height:36px;border-radius:50%;font-size:17px;cursor:pointer;"><i class='bx bx-cog'></i></button>
        </div>
      </div>
      <div style="flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:4px 12px 10px;background:#0d0d0d;border-bottom:1px solid #1a1a1a;">
        <button onclick="document.getElementById('feed-search-overlay').remove()" style="background:none;border:none;color:#fff;width:38px;height:38px;font-size:22px;cursor:pointer;flex-shrink:0;"><i class='bx bx-arrow-back'></i></button>
        <div style="flex:1;display:flex;align-items:center;gap:8px;background:#161616;border:1px solid #262626;border-radius:22px;padding:9px 14px;">
          <i class='bx bx-search' style="color:#777;"></i>
          <input id="feed-search-input" autocomplete="off" placeholder="Buscar jugadores, posts, #messi..." oninput="window.CancheroSocial._onSearch(this.value)" style="flex:1;background:none;border:none;outline:none;color:#fff;font-size:14px;">
        </div>
      </div>
      <div id="feed-search-tabs" style="flex:0 0 auto;display:flex;border-bottom:1px solid #1a1a1a;background:#0d0d0d;">
        ${['Top','Posts','Personas'].map((t,i)=>`<button data-tab="${t.toLowerCase()}" onclick="window.CancheroSocial._tab('${t.toLowerCase()}')" style="flex:1;background:none;border:none;border-bottom:2px solid ${i===0?'var(--accent)':'transparent'};color:${i===0?'var(--accent)':'#888'};font-size:13px;font-weight:800;padding:11px;cursor:pointer;">${t}</button>`).join('')}
      </div>
      <div id="feed-search-results" style="flex:1;overflow-y:auto;padding:12px;"><div style="text-align:center;color:#555;padding:40px;font-size:13px;">Escribí para buscar. Probá un nombre, un tema o #hashtag.</div></div>`;
    document.body.appendChild(m);
    setTimeout(()=>{ const i=document.getElementById('feed-search-input'); if(i) i.focus(); }, 80);
    _state = { q:'', tab:'top' };
    _renderTrendsInSearch();
  }
  let _state = { q:'', tab:'top' }, _timer=null;
  function _tab(t){ _state.tab=t; document.querySelectorAll('#feed-search-tabs button').forEach(b=>{ const on=b.dataset.tab===t; b.style.color=on?'var(--accent)':'#888'; b.style.borderBottom='2px solid '+(on?'var(--accent)':'transparent'); }); _run(); }
  function _onSearch(v){ _state.q=(v||'').trim(); clearTimeout(_timer); _timer=setTimeout(_run, 280); }

  async function _run(){
    const box = document.getElementById('feed-search-results'); if(!box) return;
    const q = _state.q;
    if (!q){ _renderTrendsInSearch(); return; }
    box.innerHTML = '<div style="text-align:center;color:#555;padding:30px;"><i class="bx bx-loader-alt bx-spin" style="font-size:22px;"></i></div>';
    const term = q.replace(/^#/,'');
    // Guardar el término buscado (alimenta el criterio de "A quién seguir")
    try { if (term.length>=2){ let r=JSON.parse(localStorage.getItem('recent_searches')||'[]'); r=[term.toLowerCase()].concat(r.filter(x=>x!==term.toLowerCase())).slice(0,12); localStorage.setItem('recent_searches', JSON.stringify(r)); } } catch(e){}
    let postsHtml='', peopleHtml='';
    try {
      if (_state.tab!=='personas'){
        const { data: posts } = await sb().from('posts').select('*').ilike('content','%'+term+'%').order('created_at',{ascending:false}).limit(40);
        const ranked = _rank(posts||[]);
        postsHtml = ranked.length ? ranked.map(p=> (typeof buildPostCard==='function'? buildPostCard(p) : `<div style="background:#111;border:1px solid #1e1e1e;border-radius:12px;padding:12px;margin-bottom:10px;color:#ddd;">${escH(p.content)}</div>`)).join('')
          : '<div style="text-align:center;color:#555;padding:24px;font-size:13px;">Sin posts sobre "'+escH(q)+'".</div>';
      }
      if (_state.tab!=='posts'){
        const { data: users } = await sb().from('users').select('email,name,photo,pos,city').or('name.ilike.%'+term+'%,email.ilike.%'+term+'%').limit(20);
        peopleHtml = (users||[]).map(u=>`<div onclick="document.getElementById('feed-search-overlay').remove();window.viewUserProfile&&window.viewUserProfile('${(u.email||'').replace(/'/g,"\\'")}')" style="display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid #161616;cursor:pointer;">
          <div style="width:42px;height:42px;border-radius:50%;${u.photo?`background-image:url('${u.photo}');background-size:cover;background-position:center;`:'background:var(--accent);display:flex;align-items:center;justify-content:center;color:#000;font-weight:900;'}flex-shrink:0;">${u.photo?'':(u.name||'?')[0].toUpperCase()}</div>
          <div style="flex:1;min-width:0;"><div style="font-size:14px;font-weight:700;color:#fff;">${escH(u.name||u.email)}</div><div style="font-size:11px;color:#777;">${escH([u.pos,u.city].filter(Boolean).join(' · '))}</div></div>
          <i class='bx bx-chevron-right' style="color:#555;"></i></div>`).join('');
      }
    } catch(e){}
    if (_state.tab==='personas') box.innerHTML = peopleHtml || '<div style="text-align:center;color:#555;padding:24px;font-size:13px;">Sin personas.</div>';
    else if (_state.tab==='posts') box.innerHTML = postsHtml;
    else box.innerHTML = (peopleHtml?`<div style="font-size:11px;color:#666;font-weight:800;letter-spacing:1px;margin:4px 0 8px;">PERSONAS</div>${peopleHtml}<div style="height:14px;"></div>`:'') + `<div style="font-size:11px;color:#666;font-weight:800;letter-spacing:1px;margin:4px 0 8px;">POSTS</div>${postsHtml}`;
  }

  // Relevancia: engagement + recencia
  function _rank(posts){
    const now = Date.now();
    return posts.map(p=>{
      const eng = (p.likes_count||0)*1 + (p.comments_count||0)*2 + (p.shares_count||0)*3;
      const ageH = Math.max(1, (now - new Date(p.created_at||now))/3600000);
      p._score = eng + 50/ageH; return p;
    }).sort((a,b)=>b._score-a._score);
  }

  // ── TENDENCIAS ──────────────────────────────────────────────
  async function getTrends(){
    try {
      const since = new Date(Date.now()-2*24*3600000).toISOString();
      const { data: posts } = await sb().from('posts').select('content').gte('created_at', since).limit(300);
      const freq = {};
      (posts||[]).forEach(p=>{
        const tags = (p.content||'').match(/#[\wáéíóúñ]+/gi) || [];
        tags.forEach(t=>{ const k=t.toLowerCase(); freq[k]=(freq[k]||0)+1; });
      });
      return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([tag,n])=>({tag,n}));
    } catch(e){ return []; }
  }
  async function _renderTrendsInSearch(){
    const box = document.getElementById('feed-search-results'); if(!box) return;
    const trends = await getTrends();
    if (!trends.length){ box.innerHTML = '<div style="text-align:center;color:#555;padding:40px;font-size:13px;">Escribí para buscar. Las tendencias aparecen cuando la gente usa #hashtags.</div>'; return; }
    box.innerHTML = '<div style="font-size:11px;color:#666;font-weight:800;letter-spacing:1px;margin:4px 0 10px;"><i class="bx bx-trending-up" style="color:var(--accent);"></i> TENDENCIAS</div>'+
      trends.map((t,i)=>`<div onclick="document.getElementById('feed-search-input').value='${t.tag}';window.CancheroSocial._onSearch('${t.tag}')" style="display:flex;align-items:center;gap:10px;padding:11px 6px;border-bottom:1px solid #161616;cursor:pointer;">
        <span style="font-size:13px;color:#555;font-weight:900;width:18px;">${i+1}</span>
        <div style="flex:1;"><div style="font-size:14px;font-weight:800;color:var(--accent);">${escH(t.tag)}</div><div style="font-size:11px;color:#777;">${t.n} publicación${t.n!==1?'es':''}</div></div>
        <i class='bx bx-trending-up' style="color:#555;"></i></div>`).join('');
  }

  // ── GUARDADOS (bookmark) — POR ROL/IDENTIDAD ────────────────
  // N2: los guardados son por identidad activa (jugador/fanatico/team/negocio). Se
  // guardan con la columna `profile` y se abren filtrando por ella. Fallback: si la
  // columna aún no existe en la DB, se opera igual que antes (por email).
  function activeIdent(){ try { return (window._activeProfileType && window._activeProfileType()) || 'jugador'; } catch(e){ return 'jugador'; } }
  async function _saveInsert(row){
    const client = sb();
    let r = await client.from('saved_posts').insert(row);
    if (r && r.error && /profile|column/i.test(r.error.message||'')){
      const rest = Object.assign({}, row); delete rest.profile;
      r = await client.from('saved_posts').insert(rest);
    }
    return r;
  }
  async function _saveDelete(postId){
    const client = sb(); const u = me();
    let q = client.from('saved_posts').delete().eq('email',u.email).eq('post_id',postId).eq('profile', activeIdent());
    let r = await q;
    if (r && r.error && /profile|column/i.test(r.error.message||'')){
      r = await client.from('saved_posts').delete().eq('email',u.email).eq('post_id',postId);
    }
    return r;
  }

  async function toggleSave(postId, btn){
    const u = me(); const client = sb();
    if (!u || !client){ if(window.showToast) showToast('Iniciá sesión','error'); return; }
    const icon = btn && btn.querySelector('i');
    const saved = icon && icon.classList.contains('bxs-bookmark');
    try {
      if (saved){
        await _saveDelete(postId);
        if(icon){ icon.className='bx bx-bookmark'; } btn.style.color='#666';
        if(window.showToast) showToast('Quitado de guardados','info');
        // Si estamos en la pantalla de Guardados, sacar la tarjeta
        if (document.getElementById('saved-overlay')){ const card=document.getElementById('post-card-'+postId)||document.getElementById('poll-card-'+postId)||(btn.closest('article')); if(card){ card.style.opacity='0'; setTimeout(()=>card.remove(),250); } }
      } else {
        await _saveInsert({ email:u.email, post_id:postId, profile: activeIdent() });
        if(icon){ icon.className='bx bxs-bookmark'; } btn.style.color='var(--accent)';
        if(window.showToast) showToast('Guardado. Mirá tus guardados en el perfil.','success');
      }
    } catch(e){ if(window.showToast) showToast('No se pudo guardar','error'); }
  }

  async function toggleSaveMomento(momId, btn){
    const u = me(); const client = sb();
    if (!u || !client){ if(window.showToast) showToast('Iniciá sesión','error'); return; }
    const icon = btn && btn.querySelector('i');
    const saved = icon && icon.classList.contains('bxs-bookmark');
    try {
      if (saved){ await _saveDelete(momId); if(icon) icon.className='bx bx-bookmark'; if(window.showToast) showToast('Quitado de guardados','info'); }
      else { await _saveInsert({ email:u.email, post_id:momId, kind:'momento', profile: activeIdent() }); if(icon) icon.className='bx bxs-bookmark'; if(window.showToast) showToast('Reel guardado','success'); }
    } catch(e){ if(window.showToast) showToast('No se pudo guardar','error'); }
  }

  async function openSaved(){
    const client = sb(); const u = me();
    let m = document.getElementById('saved-overlay'); if(m) m.remove();
    m = document.createElement('div'); m.id='saved-overlay';
    m.style.cssText = 'position:fixed;inset:0;z-index:100090;background:#0a0a0a;display:flex;flex-direction:column;';
    m.innerHTML = `<div style="flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:max(env(safe-area-inset-top,0px),10px) 12px 10px;background:#0d0d0d;border-bottom:1px solid #1a1a1a;">
      <button onclick="document.getElementById('saved-overlay').remove()" style="background:none;border:none;color:#fff;width:38px;height:38px;font-size:22px;cursor:pointer;"><i class='bx bx-arrow-back'></i></button>
      <div style="font-size:15px;font-weight:900;color:#fff;"><i class='bx bxs-bookmark' style="color:var(--accent);"></i> Guardados</div></div>
      <div id="saved-body" style="flex:1;overflow-y:auto;padding:12px;"><div style="text-align:center;color:#555;padding:40px;"><i class="bx bx-loader-alt bx-spin" style="font-size:24px;"></i></div></div>`;
    document.body.appendChild(m);
    const body = document.getElementById('saved-body');
    if (!client || !u){ body.innerHTML='<div style="text-align:center;color:#555;padding:30px;">Iniciá sesión.</div>'; return; }
    try {
      // N2.2: filtrar por identidad activa. Fallback a solo-email si no existe `profile`.
      const _ident = activeIdent();
      let sres = await client.from('saved_posts').select('post_id,kind').eq('email',u.email).eq('profile', _ident).order('created_at',{ascending:false}).limit(150);
      if (sres && sres.error && /profile|column/i.test(sres.error.message||'')){
        sres = await client.from('saved_posts').select('post_id,kind').eq('email',u.email).order('created_at',{ascending:false}).limit(150);
      }
      const saved = sres && sres.data;
      if (!saved || !saved.length){ body.innerHTML='<div style="text-align:center;color:#555;padding:40px;font-size:13px;"><i class="bx bx-bookmark" style="font-size:42px;display:block;margin-bottom:10px;opacity:0.4;"></i>No guardaste nada todavía con este perfil. Tocá el marcador en cualquier publicación o reel.</div>'; return; }
      const postIds = saved.filter(s=>s.kind!=='momento').map(s=>s.post_id);
      const momIds  = saved.filter(s=>s.kind==='momento').map(s=>s.post_id);
      let html='';
      if (postIds.length){
        const { data: posts } = await client.from('posts').select('*').in('id', postIds).limit(100);
        const order={}; postIds.forEach((id,i)=>order[id]=i);
        (posts||[]).sort((a,b)=>(order[a.id]??99)-(order[b.id]??99));
        html += (posts||[]).map(p=> typeof buildPostCard==='function'? buildPostCard(p) : `<div style="background:#111;border:1px solid #1e1e1e;border-radius:12px;padding:12px;margin-bottom:10px;color:#ddd;">${escH(p.content)}</div>`).join('');
      }
      if (momIds.length){
        const { data: moms } = await client.from('momentos').select('id,media_url,thumbnail_url,title').in('id', momIds).limit(60);
        if (moms && moms.length){
          html += '<div style="font-size:11px;color:#666;font-weight:800;letter-spacing:1px;margin:14px 0 8px;">REELS GUARDADOS</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;">'+
            moms.map(m=>`<div onclick="window._openMomento&&window._openMomento('${m.id}')" style="aspect-ratio:9/16;border-radius:8px;overflow:hidden;background:#111 ${m.thumbnail_url||m.media_url?`url('${m.thumbnail_url||m.media_url}') center/cover`:''};cursor:pointer;"></div>`).join('')+'</div>';
        }
      }
      body.innerHTML = html || '<div style="text-align:center;color:#555;padding:30px;">Tus guardados no están disponibles.</div>';
      // Marcar como guardados (bookmark relleno) para poder DESguardar desde acá
      setTimeout(()=>{ body.querySelectorAll('[id^="save-btn-"]').forEach(b=>{ const i=b.querySelector('i'); if(i) i.className='bx bxs-bookmark'; b.style.color='var(--accent)'; }); }, 60);
    } catch(e){ body.innerHTML='<div style="text-align:center;color:#555;padding:30px;font-size:13px;">No se pudieron cargar los guardados (¿falta el SQL?).</div>'; }
  }

  // Marcar como guardados los bookmarks visibles (al cargar el feed)
  async function refreshSavedMarks(){
    const client = sb(); const u = me(); if(!client||!u) return;
    try {
      // Marcar solo los guardados de la identidad activa (fallback a email si no hay `profile`).
      let sres = await client.from('saved_posts').select('post_id').eq('email',u.email).eq('profile', activeIdent()).limit(200);
      if (sres && sres.error && /profile|column/i.test(sres.error.message||'')){
        sres = await client.from('saved_posts').select('post_id').eq('email',u.email).limit(200);
      }
      const saved = sres && sres.data;
      const set = new Set((saved||[]).map(s=>s.post_id));
      document.querySelectorAll('[id^="save-btn-"]').forEach(btn=>{
        const id = btn.id.replace('save-btn-','');
        if (set.has(id)){ const i=btn.querySelector('i'); if(i) i.className='bx bxs-bookmark'; btn.style.color='var(--accent)'; }
      });
    } catch(e){}
  }

  // ── ESTADÍSTICAS de un post propio ──────────────────────────
  async function showStats(postId){
    const client = sb(); if(!client) return;
    try {
      const { data: p } = await client.from('posts').select('*').eq('id',postId).maybeSingle();
      if (!p) return;
      const row=(l,v,ic)=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid #161616;"><span style="font-size:13px;color:#aaa;"><i class='bx ${ic}' style="color:var(--accent);margin-right:6px;"></i>${l}</span><span style="font-size:16px;font-weight:900;color:#fff;">${v||0}</span></div>`;
      let m=document.getElementById('post-stats-modal'); if(m)m.remove();
      m=document.createElement('div'); m.id='post-stats-modal';
      m.style.cssText='position:fixed;inset:0;z-index:100095;background:rgba(0,0,0,0.8);display:flex;align-items:flex-end;justify-content:center;';
      m.innerHTML=`<div onclick="event.stopPropagation()" style="background:#111;border-radius:20px 20px 0 0;width:100%;max-width:480px;padding:16px 18px calc(18px + env(safe-area-inset-bottom));">
        <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:0 auto 14px;"></div>
        <div style="font-size:14px;font-weight:900;color:#fff;margin-bottom:8px;">Estadísticas de la publicación</div>
        ${row('Alcance (personas que la vieron)',p.views_count,'bx-show')}${row('Me gusta',p.likes_count,'bx-heart')}${row('Comentarios',p.comments_count,'bx-comment')}${row('Compartidos',p.shares_count,'bx-share-alt')}
        <button onclick="document.getElementById('post-stats-modal').remove()" style="width:100%;margin-top:12px;background:#1a1a1a;color:#888;border:none;border-radius:12px;padding:12px;font-weight:700;cursor:pointer;">Cerrar</button>
      </div>`;
      m.onclick=()=>m.remove(); document.body.appendChild(m);
    } catch(e){}
  }

  // Sumar 1 vista por post (1×/día por usuario, vía localStorage para no spamear)
  function countView(postId){
    try {
      const k='pv_'+new Date().toISOString().slice(0,10);
      const seen = JSON.parse(localStorage.getItem(k)||'[]');
      if (seen.includes(postId)) return; seen.push(postId); localStorage.setItem(k, JSON.stringify(seen));
      const client=sb(); if(!client) return;
      client.rpc('increment_post_views',{ p_id:postId }).catch(()=>{
        // Fallback sin RPC: update +1 leyendo el valor (best-effort)
        client.from('posts').select('views_count').eq('id',postId).maybeSingle().then(({data})=>{ if(data) client.from('posts').update({views_count:(data.views_count||0)+1}).eq('id',postId); });
      });
    } catch(e){}
  }

  // ── SUGERENCIAS PARA SEGUIR (jugadores, clubes, negocios) ──
  async function renderSuggestions(){
    const client = sb(); const u = me();
    const cont = document.getElementById('main-feed-container') || document.getElementById('amigos-feed');
    if (!client || !cont || !u) return;
    if (document.getElementById('follow-suggestions')) return; // ya está
    if (window._sugBusy) return; window._sugBusy = true;            // evita duplicados por doble carga
    try {
      // No mostrar si el usuario lo cerró en esta sesión
      if (sessionStorage.getItem('sug_dismissed')) return;
      // A quién ya sigo (para no sugerirlo)
      let following = new Set();
      const { data: f } = await client.from('follows').select('following_email').eq('follower_email', u.email).limit(300);
      (f||[]).forEach(x=>following.add((x.following_email||'').toLowerCase()));
      // Sutil: para perfiles nuevos / con pocos seguidos (no invasivo)
      if (following.size > 15) return;
      const myCity = (u && (u.city||u.department)||'').toLowerCase();
      // Términos que el usuario buscó (para sugerir según sus búsquedas/usos)
      let recent = [];
      try { recent = (JSON.parse(localStorage.getItem('recent_searches')||'[]')||[]).map(s=>(s||'').toLowerCase()); } catch(e){}
      // Traer candidatos (columnas mínimas → menos egress)
      const { data: users } = await client.from('users').select('email,name,photo,photo_style,role,city').limit(120);
      const seenEm = new Set();
      let cands = (users||[]).filter(x => {
        const e=(x.email||'').toLowerCase();
        if (!e || e===(u.email||'').toLowerCase() || following.has(e) || seenEm.has(e)) return false;
        seenEm.add(e); return true; // dedupe por email
      });
      // Criterio: lo que buscaste > misma ciudad > con foto > resto
      cands.sort((a,b)=>{
        const am = recent.some(t=>t && (a.name||'').toLowerCase().includes(t))?1:0;
        const bm = recent.some(t=>t && (b.name||'').toLowerCase().includes(t))?1:0;
        if (am!==bm) return bm-am;
        const ac=(a.city||'').toLowerCase()===myCity?1:0, bc=(b.city||'').toLowerCase()===myCity?1:0;
        if (ac!==bc) return bc-ac;
        const ap=a.photo?1:0, bp=b.photo?1:0; return bp-ap;
      });
      cands = cands.slice(0, 10);
      if (!cands.length) return;
      const roleLabel = { jugador:'Jugador', club:'Club', complejo:'Canchas', tienda:'Tienda', profesional:'Profesional', organizacion:'Ligas' };
      const card = x => {
        const em=(x.email||'').replace(/'/g,"\\'"); const nm=(x.name||x.email.split('@')[0]).replace(/'/g,"\\'");
        // MISMO encuadre que toda la app (photoStyle del usuario o rostro center 25%)
        const av = x.photo
          ? ((window._avatarBgCss && window._avatarBgCss({ photo: x.photo, photo_style: x.photo_style })) || `background-image:url('${x.photo}');background-size:cover;background-position:center 25%;`)
          : 'background:var(--accent);display:flex;align-items:center;justify-content:center;color:#000;font-weight:900;font-size:22px;';
        return `<div style="flex:0 0 auto;width:130px;background:#111;border:1px solid #1e1e1e;border-radius:14px;padding:14px 10px;text-align:center;">
          <div onclick="window.viewUserProfile&&window.viewUserProfile('${em}')" style="width:60px;height:60px;border-radius:50%;margin:0 auto 8px;${av}cursor:pointer;">${x.photo?'':(x.name||'?')[0].toUpperCase()}</div>
          <div onclick="window.viewUserProfile&&window.viewUserProfile('${em}')" style="font-size:12px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;">${escH(x.name||x.email.split('@')[0])}</div>
          <div style="font-size:10px;color:#777;margin-bottom:8px;">${roleLabel[x.role]||'Jugador'}</div>
          <button onclick="window.CancheroSocial._followFromSug(this,'${em}','${nm}')" style="width:100%;background:var(--accent);color:#000;border:none;border-radius:18px;padding:6px;font-size:11px;font-weight:900;cursor:pointer;">Seguir</button>
        </div>`;
      };
      if (document.getElementById('follow-suggestions')) return; // re-chequeo anti-duplicado
      const wrap = document.createElement('div');
      wrap.id = 'follow-suggestions';
      wrap.style.cssText = 'margin:14px 0;background:#0d0d0d;border:1px solid #1a1a1a;border-radius:14px;padding:12px;';
      wrap.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin:0 0 10px;">
          <span style="font-size:12px;font-weight:800;color:#fff;letter-spacing:.3px;"><i class='bx bx-user-plus' style="color:var(--accent);"></i> A quién seguir</span>
          <button onclick="window.CancheroSocial._dismissSuggestions()" title="Ocultar" style="background:rgba(255,255,255,0.06);border:none;color:#888;width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:16px;line-height:1;">&times;</button>
        </div>
        <div style="display:flex;flex-wrap:nowrap;gap:10px;overflow-x:auto;overflow-y:visible;scrollbar-width:none;padding-bottom:4px;touch-action:pan-x pan-y;-webkit-overflow-scrolling:touch;">${cands.slice(0,8).map(card).join('')}</div>`;
      // No al tope: insertar después de la 3ª publicación (o al final si hay menos)
      const posts = cont.querySelectorAll('article.post-card, article.poll-card');
      if (posts.length >= 3) posts[2].insertAdjacentElement('afterend', wrap);
      else cont.appendChild(wrap);
    } catch(e){} finally { window._sugBusy = false; }
  }
  function _dismissSuggestions(){
    try { sessionStorage.setItem('sug_dismissed','1'); } catch(e){}
    const el = document.getElementById('follow-suggestions'); if (el) el.remove();
  }
  async function _followFromSug(btn, email, name){
    const client = sb(); const u = me();
    if (!u || !client){ if(window.showToast) showToast('Iniciá sesión','error'); return; }
    try {
      await client.from('follows').insert({ follower_email: u.email, following_email: email });
      if (window.notif) try{ window.notif.create(email,'follow',u.name,(u.name||'Alguien')+' ahora te sigue.'); }catch(e){}
      btn.textContent = 'Siguiendo'; btn.style.background='transparent'; btn.style.color='#888'; btn.style.border='1px solid #333'; btn.disabled=true;
    } catch(e){}
  }

  return { openSearch, _onSearch, _tab, _run, toggleSave, toggleSaveMomento, openSaved, refreshSavedMarks, showStats, getTrends, countView, renderSuggestions, _followFromSug, _dismissSuggestions };
})();

// Tras cargar el feed, marcar guardados + activar autoplay de videos
(function(){
  const _orig = window.loadMainFeed;
  if (typeof _orig === 'function'){
    window.loadMainFeed = function(){ const r=_orig.apply(this, arguments); setTimeout(()=>{ try{ window.CancheroSocial.refreshSavedMarks(); }catch(e){} try{ window.CancheroSocial.initAutoplay(); }catch(e){} try{ window.CancheroSocial.renderSuggestions(); }catch(e){} }, 900); return r; };
  }
})();

// ── Autoplay de videos al scrollear (estilo Twitter): se reproducen al entrar en pantalla, se pausan al salir ──
window.CancheroSocial.initAutoplay = (function(){
  let observer = null;
  return function(){
    if (!('IntersectionObserver' in window)) return;
    if (!observer){
      observer = new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          const v = en.target;
          if (en.isIntersecting && en.intersectionRatio >= 0.6){
            // Pausar los demás antes de reproducir éste (un solo video a la vez)
            document.querySelectorAll('video[data-autoplay]').forEach(function(o){ if(o!==v && !o.paused) o.pause(); });
            const pr = v.play(); if (pr && pr.catch) pr.catch(function(){});
          } else {
            if (!v.paused) v.pause();
          }
        });
      }, { threshold: [0, 0.6, 1] });
    }
    document.querySelectorAll('video[data-autoplay]').forEach(function(v){
      if (!v._obs){ v._obs = true; try{ observer.observe(v); }catch(e){} }
    });
  };
})();
console.log('[canchero-social] ✅ buscador + guardados + estadísticas + tendencias');
