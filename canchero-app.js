// ════════════════════════════════════════════════════════════════════════════
// CANCHERO APP MODULE — Notifs, Friends, Stories, Reservations, Biz Dashboards
// Depende de: window.supabaseClient (Supabase client) y window.cancheroFeatures
// ════════════════════════════════════════════════════════════════════════════
(function(){
'use strict';

const sb = () => window.supabaseClient;
const me = () => window.userData || JSON.parse(localStorage.getItem('canchero_user')||'null');
const meEmail = () => ((me() && me().email) || '').toLowerCase();
const meName  = () => (me() && (me().name || me().email)) || 'Anónimo';
const isLogged = () => !!meEmail();

function toast(msg, type){
  if (typeof window.showToast === 'function') return window.showToast(msg, type||'info');
  console.log('[toast]', msg);
}

// ════════════════════════════════════════════════════════════════════════
// 1. NOTIFICATIONS — bell badge + panel + realtime
// ════════════════════════════════════════════════════════════════════════
const Notifs = {
  _unread: 0,
  _items: [],
  _channel: null,

  async load(){
    if(!sb() || !isLogged()) return [];
    try {
      const { data } = await sb().from('notifications')
        .select('*')
        .or(`user_email.eq.${meEmail()},user_email.eq.*`)
        .order('created_at',{ascending:false})
        .limit(50);
      this._items = data || [];
      this._unread = this._items.filter(n => !n.read_at).length;
      this._updateBadge();
      return this._items;
    } catch(e){ console.warn('notifs load:', e.message); return []; }
  },

  async markAllRead(){
    if(!sb() || !isLogged()) return;
    try {
      await sb().from('notifications').update({ read_at: new Date().toISOString() })
        .eq('user_email', meEmail()).is('read_at', null);
      this._unread = 0;
      this._updateBadge();
    } catch(e){}
  },

  _updateBadge(){
    const badge = document.getElementById('notif-badge');
    const wrap  = document.getElementById('notif-bell-wrap');
    if (wrap)  wrap.style.display = isLogged() ? 'inline-block' : 'none';
    const gear = document.getElementById('nav-gear-wrap');
    if (gear)  gear.style.display = isLogged() ? 'flex' : 'none';
    if (badge) {
      if (this._unread > 0) {
        badge.textContent = this._unread > 99 ? '99+' : String(this._unread);
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  },

  togglePanel(){
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    const open = panel.style.display === 'flex';
    if (open) { panel.style.display = 'none'; return; }
    this.load().then(() => {
      panel.style.display = 'flex';
      this.render();
      this.markAllRead();
    });
  },

  render(){
    const body = document.getElementById('notif-panel-body');
    if (!body) return;
    if (!this._items.length) {
      body.innerHTML = `<div style="padding:30px 16px;text-align:center;color:#666;font-size:12px;">
        <i class='bx bx-bell-off' style="font-size:32px;display:block;margin-bottom:8px;opacity:0.4;"></i>
        Sin notificaciones por ahora.
      </div>`;
      return;
    }
    body.innerHTML = this._items.slice(0,30).map(n => {
      const when = _timeAgo(n.created_at);
      const icon = ({tag:'bx-purchase-tag',result_proposed:'bx-football',request_accepted:'bx-check-circle',booking:'bx-calendar',admin:'bx-shield',friend:'bx-user-plus',post:'bx-message-square-detail'})[n.type] || 'bx-bell';
      return `<div style="padding:11px 14px;border-bottom:1px solid #1a1c1a;display:flex;gap:10px;align-items:flex-start;${n.read_at?'':'background:rgba(186,255,0,0.04);'}">
        <i class='bx ${icon}' style="font-size:18px;color:#baff00;flex-shrink:0;margin-top:2px;"></i>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:700;color:#fff;">${(n.title||'').replace(/</g,'&lt;')}</div>
          ${n.body?`<div style="font-size:11px;color:#888;margin-top:2px;line-height:1.4;">${(n.body||'').replace(/</g,'&lt;')}</div>`:''}
          <div style="font-size:10px;color:#555;margin-top:4px;">${when}</div>
        </div>
      </div>`;
    }).join('');
  },

  subscribeRealtime(){
    if (!sb() || !isLogged() || this._channel) return;
    try {
      this._channel = sb().channel('notif-'+meEmail())
        .on('postgres_changes', { event:'INSERT', schema:'public', table:'notifications', filter:`user_email=eq.${meEmail()}` }, payload => {
          this._items.unshift(payload.new);
          this._unread++;
          this._updateBadge();
        })
        .subscribe();
    } catch(e){ console.warn('notifs realtime:', e.message); }
  },

  send(toEmail, type, title, body, refId, refType){
    if(!sb()) return Promise.resolve();
    return sb().from('notifications').insert([{
      user_email: toEmail, type, title, body, ref_id: refId, ref_type: refType
    }]);
  }
};
window.notif = {
  togglePanel: () => Notifs.togglePanel(),
  showBell: () => Notifs._updateBadge(),
  load: () => Notifs.load(),
  send: (...a) => Notifs.send(...a)
};

function _timeAgo(iso){
  if (!iso) return '';
  const d = new Date(iso).getTime(), now = Date.now();
  const s = Math.floor((now-d)/1000);
  if (s < 60) return 'ahora';
  if (s < 3600) return Math.floor(s/60)+' min';
  if (s < 86400) return Math.floor(s/3600)+' h';
  return Math.floor(s/86400)+' d';
}

// ════════════════════════════════════════════════════════════════════════
// 2. FRIEND REQUESTS — send, accept, list
// ════════════════════════════════════════════════════════════════════════
const Friends = {
  async sendRequest(toEmail, toName){
    if (!sb() || !isLogged()) return toast('Iniciá sesión', 'warning');
    if (toEmail === meEmail()) return toast('No podés agregarte a vos mismo','warning');
    try {
      await sb().from('friend_requests').insert([{
        from_email: meEmail(), from_name: meName(),
        to_email: toEmail.toLowerCase(), to_name: toName||toEmail,
        status: 'pending'
      }]);
      await Notifs.send(toEmail.toLowerCase(), 'friend', 'Nueva solicitud de amistad', `${meName()} te quiere agregar`, meEmail(), 'friend_request');
      toast('Solicitud enviada','success');
    } catch(e){
      if (String(e.message).includes('duplicate')) return toast('Ya enviaste solicitud a este usuario','info');
      toast('Error: '+e.message,'error');
    }
  },
  async respondRequest(requestId, accept){
    if (!sb()) return;
    try {
      await sb().from('friend_requests').update({ status: accept?'accepted':'rejected' }).eq('id', requestId);
      if (accept) toast('¡Nuevo amigo!','success');
    } catch(e){ toast('Error: '+e.message,'error'); }
  },
  async listMyRequests(){
    if (!sb() || !isLogged()) return [];
    try {
      const { data } = await sb().from('friend_requests').select('*').eq('to_email', meEmail()).eq('status','pending');
      return data||[];
    } catch(e){ return []; }
  },
  async listMyFriends(){
    if (!sb() || !isLogged()) return [];
    try {
      const { data } = await sb().from('friend_requests').select('*')
        .or(`from_email.eq.${meEmail()},to_email.eq.${meEmail()}`).eq('status','accepted');
      return (data||[]).map(r => r.from_email === meEmail() ? { email: r.to_email, name: r.to_name } : { email: r.from_email, name: r.from_name });
    } catch(e){ return []; }
  }
};
window.cancheroFriends = Friends;

// ════════════════════════════════════════════════════════════════════════
// 3. STORIES — 24h ephemeral posts
// ════════════════════════════════════════════════════════════════════════
const Stories = {
  async list(){
    if (!sb()) return [];
    try {
      const cutoff = new Date(Date.now() - 24*3600*1000).toISOString();
      const { data } = await sb().from('stories').select('*').gt('created_at', cutoff).order('created_at',{ascending:false}).limit(30);
      return data || [];
    } catch(e){ return []; }
  },
  async publish(text, mediaUrl){
    if (!sb() || !isLogged()) return toast('Iniciá sesión','warning');
    try {
      await sb().from('stories').insert([{
        user_email: meEmail(), user_name: meName(), text: text||null, media_url: mediaUrl||null
      }]);
      toast('Historia publicada','success');
      Stories.renderStrip();
    } catch(e){ toast('Error: '+e.message,'error'); }
  },
  async renderStrip(){
    const strip = document.getElementById('stories-strip');
    if (!strip) return;
    const items = await this.list();
    const meItem = `<div class="story-bubble story-mine" onclick="cancheroStories.openComposer()" title="Crear historia">
      <div class="story-avatar story-add"><i class='bx bx-plus' style="font-size:24px;color:#baff00;"></i></div>
      <div class="story-label">Tu historia</div>
    </div>`;
    const others = items.map(s => `<div class="story-bubble" onclick="cancheroStories.view('${s.id}')">
      <div class="story-avatar"><img src="${s.media_url||('https://ui-avatars.com/api/?name='+encodeURIComponent(s.user_name||'?')+'&background=000&color=baff00')}"></div>
      <div class="story-label">${(s.user_name||'').slice(0,12)}</div>
    </div>`).join('');
    strip.innerHTML = meItem + others;
  },
  openComposer(){
    const text = prompt('¿Qué está pasando? (historia, dura 24h)');
    if (text) this.publish(text, null);
  },
  async view(id){
    if (!sb()) return;
    const { data } = await sb().from('stories').select('*').eq('id', id).limit(1);
    if (!data || !data[0]) return;
    const s = data[0];
    const html = `<div id="story-viewer" style="position:fixed;inset:0;background:#000;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;" onclick="document.getElementById('story-viewer').remove()">
      <div style="position:absolute;top:24px;left:24px;color:#fff;font-weight:700;">${s.user_name||''} · ${_timeAgo(s.created_at)}</div>
      <button onclick="event.stopPropagation();document.getElementById('story-viewer').remove()" style="position:absolute;top:24px;right:24px;background:rgba(255,255,255,0.1);border:none;color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:18px;">×</button>
      ${s.media_url?`<img src="${s.media_url}" style="max-width:90vw;max-height:80vh;object-fit:contain;">`:''}
      ${s.text?`<div style="color:#fff;font-size:18px;text-align:center;margin-top:20px;max-width:560px;">${(s.text||'').replace(/</g,'&lt;')}</div>`:''}
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  }
};
window.cancheroStories = Stories;

// ════════════════════════════════════════════════════════════════════════
// 4. RESERVATIONS — complejo publica canchas, jugador reserva
// ════════════════════════════════════════════════════════════════════════
const Reservations = {
  async listAvailableCanchas(complexEmail){
    if (!sb()) return [];
    try {
      const { data } = await sb().from('biz_items').select('*').eq('owner_email', complexEmail).eq('type','court').eq('active', true);
      return data||[];
    } catch(e){ return []; }
  },
  async myComplexCanchas(){
    if (!sb() || !isLogged()) return [];
    return this.listAvailableCanchas(meEmail());
  },
  async myComplexReservations(){
    if (!sb() || !isLogged()) return [];
    try {
      const { data } = await sb().from('service_bookings').select('*')
        .eq('provider_email', meEmail()).eq('provider_type','complejo')
        .order('scheduled_at', {ascending: true});
      return data||[];
    } catch(e){ return []; }
  },
  async myReservations(){
    if (!sb() || !isLogged()) return [];
    try {
      const { data } = await sb().from('service_bookings').select('*')
        .eq('client_email', meEmail())
        .order('scheduled_at', {ascending: false});
      return data||[];
    } catch(e){ return []; }
  },
  async bookSlot({ providerEmail, providerName, providerType='complejo', courtLabel, scheduledAt, durationMin=60, price=0, notes='' }){
    if (!sb() || !isLogged()) return toast('Iniciá sesión','warning');
    try {
      const { data, error } = await sb().from('service_bookings').insert([{
        client_email: meEmail(), client_name: meName(),
        provider_email: providerEmail.toLowerCase(), provider_type: providerType,
        service_label: courtLabel || 'Reserva',
        scheduled_at: scheduledAt, price: price||0, notes,
        status: 'pending'
      }]).select().single();
      if (error) throw error;
      await Notifs.send(providerEmail.toLowerCase(), 'booking', 'Nueva reserva pendiente', `${meName()} reservó ${courtLabel||'una cancha'}`, data.id, 'booking');
      toast('Reserva enviada. Esperando confirmación del complejo.','success');
      return data;
    } catch(e){ toast('Error: '+e.message,'error'); }
  },
  async respondBooking(bookingId, accept){
    if (!sb()) return;
    try {
      const status = accept ? 'accepted' : 'rejected';
      const { data } = await sb().from('service_bookings').update({ status }).eq('id', bookingId).select().single();
      if (data) {
        await Notifs.send(data.client_email, 'booking', accept?'Reserva confirmada ✓':'Reserva rechazada',
          accept?`Tu reserva en ${data.service_label||'la cancha'} fue confirmada`:`Tu reserva fue rechazada`, bookingId, 'booking');
      }
      toast(accept?'Reserva confirmada':'Reserva rechazada','success');
    } catch(e){ toast('Error: '+e.message,'error'); }
  }
};
window.cancheroReservations = Reservations;

// ════════════════════════════════════════════════════════════════════════
// 5. BUSINESS DASHBOARDS — render adaptados por tipo
// ════════════════════════════════════════════════════════════════════════
const BizDash = {
  init(){
    const u = me();
    if (!u || u.role === 'jugador' || u.role === 'admin') return;
    this.injectShell(u);
  },
  injectShell(u){
    // LEGACY DESACTIVADO — la experiencia de negocio ahora es NATIVA dentro de la
    // app (barra inferior PANEL → iframe del CRM, perfil de negocio inline, feed).
    // Este shell viejo se agregaba al <body> y se solapaba: aparecía dentro del
    // PANEL (productos activos/stock total) y ABAJO del perfil al scrollear.
    // Lo removemos si quedó de una versión anterior y no inyectamos nada.
    const old = document.getElementById('biz-dash-shell');
    if (old) old.remove();
    // No tocar la visibilidad de las vistas: navigate() decide cuál se muestra.
    // (Antes se des-ocultaba view-club y aparecía contenido de canchas/reservas
    //  colgando debajo del perfil de la tienda.)
    return;
  },
  _html(u){
    const role = u.role;
    const sub = u.subType || '';
    const roleLabels = { club:'COMPLEJO', profesional:'PROFESIONAL', organizacion:'ORGANIZACIÓN', tienda:'TIENDA', sponsor:'SPONSOR' };
    const subLabels = { arbitro:'Árbitro', tecnico:'Técnico/DT', preparador:'Preparador Físico', nutricionista:'Nutricionista', medico:'Médico', scout:'Ojeador',
                        club:'Club Deportivo', liga:'Liga', escuela:'Escuela de Fútbol', eventos:'Org. de Eventos' };
    const tabs = this._tabsFor(role);
    return `<div style="max-width:1100px;margin:0 auto;">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
        <div style="width:54px;height:54px;border-radius:14px;background:var(--accent,#baff00);display:flex;align-items:center;justify-content:center;"><i class='bx ${this._roleIcon(role)}' style="font-size:28px;color:#000;"></i></div>
        <div>
          <div style="font-size:11px;color:#888;letter-spacing:2px;font-weight:800;">${roleLabels[role]||role.toUpperCase()}</div>
          <div style="font-size:22px;font-weight:900;color:#fff;font-family:Outfit,sans-serif;">${u.name||''}</div>
          ${sub?`<div style="font-size:11px;color:#baff00;">${subLabels[sub]||sub}</div>`:''}
        </div>
        <button onclick="cancheroAuth.logout()" style="margin-left:auto;background:rgba(255,68,68,0.12);border:1px solid rgba(255,68,68,0.3);color:#ff4444;padding:9px 16px;border-radius:8px;font-weight:700;cursor:pointer;font-size:12px;">CERRAR SESIÓN</button>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:20px;border-bottom:1px solid #1e201e;overflow-x:auto;padding-bottom:0;">
        ${tabs.map((t,i)=>`<button onclick="bizDashSwitchTab('${t.id}',this)" class="biz-tab ${i===0?'active':''}" style="background:none;border:none;color:${i===0?'var(--accent,#baff00)':'#888'};padding:12px 16px;font-weight:700;font-size:12px;letter-spacing:1px;cursor:pointer;white-space:nowrap;border-bottom:2px solid ${i===0?'var(--accent,#baff00)':'transparent'};">${t.label}</button>`).join('')}
      </div>
      <div id="biz-dash-body" style="min-height:400px;"></div>
    </div>`;
  },
  _roleIcon(role){
    return ({club:'bx-building-house',profesional:'bx-id-card',organizacion:'bx-trophy',tienda:'bx-store',sponsor:'bx-megaphone'})[role] || 'bx-briefcase';
  },
  _tabsFor(role){
    const base = { id:'overview', label:'RESUMEN' };
    const profile = { id:'profile', label:'PERFIL PÚBLICO' };
    const settings = { id:'settings', label:'AJUSTES' };
    if (role === 'club') return [ base, { id:'canchas', label:'MIS CANCHAS' }, { id:'reservas', label:'RESERVAS' }, { id:'calendario', label:'CALENDARIO' }, profile, settings ];
    if (role === 'profesional') return [ base, { id:'tarifas', label:'TARIFAS' }, { id:'agenda', label:'AGENDA' }, { id:'resenas', label:'RESEÑAS' }, profile, settings ];
    if (role === 'organizacion') return [ base, { id:'torneos', label:'TORNEOS' }, { id:'equipos', label:'EQUIPOS' }, { id:'jugadores', label:'JUGADORES' }, profile, settings ];
    if (role === 'tienda') return [ base, { id:'productos', label:'PRODUCTOS' }, { id:'ventas', label:'VENTAS' }, { id:'stock', label:'STOCK' }, profile, settings ];
    if (role === 'sponsor') return [ base, { id:'campanas', label:'CAMPAÑAS' }, { id:'metricas', label:'MÉTRICAS' }, { id:'contrato', label:'CONTRATO' }, profile, settings ];
    return [base, profile, settings];
  },
  async load(u){
    this.switchTab('overview');
  },
  switchTab(tabId){
    const body = document.getElementById('biz-dash-body');
    if (!body) return;
    const u = me();
    if (!u) return;
    document.querySelectorAll('.biz-tab').forEach(b => { b.style.color = '#888'; b.style.borderBottomColor = 'transparent'; });
    if (tabId === 'overview') return this._renderOverview(body, u);
    if (tabId === 'canchas')  return this._renderCanchas(body, u);
    if (tabId === 'reservas') return this._renderReservasComplejo(body, u);
    if (tabId === 'calendario') return this._renderCalendario(body, u);
    if (tabId === 'tarifas')  return this._renderTarifas(body, u);
    if (tabId === 'agenda')   return this._renderAgenda(body, u);
    if (tabId === 'resenas')  return this._renderResenas(body, u);
    if (tabId === 'torneos')  return this._renderTorneos(body, u);
    if (tabId === 'equipos')  return this._renderEquipos(body, u);
    if (tabId === 'jugadores')return this._renderJugadoresOrg(body, u);
    if (tabId === 'productos')return this._renderProductos(body, u);
    if (tabId === 'ventas')   return this._renderVentas(body, u);
    if (tabId === 'stock')    return this._renderStock(body, u);
    if (tabId === 'campanas') return this._renderCampanas(body, u);
    if (tabId === 'metricas') return this._renderMetricas(body, u);
    if (tabId === 'contrato') return this._renderContrato(body, u);
    if (tabId === 'profile')  return this._renderPublicProfile(body, u);
    if (tabId === 'settings') return this._renderSettings(body, u);
    body.innerHTML = '<div style="padding:40px;text-align:center;color:#888;">Sección en construcción.</div>';
  },
  async _renderOverview(body, u){
    body.innerHTML = `<div id="ov-loading" style="text-align:center;padding:30px;color:#666;">Cargando estadísticas...</div>`;
    let stats = '';
    if (u.role === 'club') {
      const canchas = await Reservations.myComplexCanchas();
      const reservas = await Reservations.myComplexReservations();
      const pendientes = reservas.filter(r => r.status === 'pending').length;
      const confirmadas = reservas.filter(r => r.status === 'accepted').length;
      stats = this._statGrid([
        { label:'Canchas activas', value: canchas.length, icon:'bx-football' },
        { label:'Reservas pendientes', value: pendientes, icon:'bx-time' },
        { label:'Reservas confirmadas', value: confirmadas, icon:'bx-check-circle' },
        { label:'Ingresos del mes', value: '$' + reservas.filter(r=>r.status==='accepted').reduce((s,r)=>s+(parseFloat(r.price)||0),0).toFixed(0), icon:'bx-dollar' }
      ]);
    } else if (u.role === 'profesional') {
      const bookings = sb() ? (await sb().from('service_bookings').select('*').eq('provider_email', meEmail()).eq('provider_type','profesional')).data || [] : [];
      stats = this._statGrid([
        { label:'Servicios brindados', value: bookings.filter(b=>b.status==='completed').length, icon:'bx-check-double' },
        { label:'Solicitudes pendientes', value: bookings.filter(b=>b.status==='pending').length, icon:'bx-time' },
        { label:'Próximas citas', value: bookings.filter(b=>b.status==='accepted' && new Date(b.scheduled_at)>new Date()).length, icon:'bx-calendar' },
        { label:'Especialidad', value: u.subType||'—', icon:'bx-medal' }
      ]);
    } else if (u.role === 'organizacion') {
      const leagues = sb() ? (await sb().from('leagues').select('*').eq('owner_email', meEmail())).data || [] : [];
      stats = this._statGrid([
        { label:'Torneos creados', value: leagues.length, icon:'bx-trophy' },
        { label:'En curso', value: leagues.filter(l=>l.status==='in_progress').length, icon:'bx-play-circle' },
        { label:'Finalizados', value: leagues.filter(l=>l.status==='finished').length, icon:'bx-flag-checkered' },
        { label:'Tipo', value: u.subType||'—', icon:'bx-shield' }
      ]);
    } else if (u.role === 'tienda') {
      const prods = sb() ? (await sb().from('products').select('*').eq('seller_email', meEmail())).data || [] : [];
      stats = this._statGrid([
        { label:'Productos activos', value: prods.filter(p=>p.active).length, icon:'bx-package' },
        { label:'Stock total', value: prods.reduce((s,p)=>s+(p.stock||0),0), icon:'bx-store' },
        { label:'Ventas (mes)', value: '$0', icon:'bx-dollar' },
        { label:'Vistas', value: '0', icon:'bx-show' }
      ]);
    } else if (u.role === 'sponsor') {
      stats = this._statGrid([
        { label:'Alcance estimado', value: '0', icon:'bx-trending-up' },
        { label:'Impresiones', value: '0', icon:'bx-show' },
        { label:'Campañas activas', value: '0', icon:'bx-megaphone' },
        { label:'Engagement', value: '0%', icon:'bx-heart' }
      ]);
    }
    const aprov = u.isComplexApproved===false ? `<div style="background:rgba(255,180,0,0.1);border:1px solid rgba(255,180,0,0.3);padding:14px 18px;border-radius:12px;margin-bottom:18px;color:#ffb400;font-size:13px;">
      ⏳ <strong>Cuenta pendiente de aprobación.</strong> Recibirás un email cuando esté lista.
    </div>` : '';
    body.innerHTML = aprov + stats + `<div style="margin-top:24px;padding:20px;background:rgba(255,255,255,0.02);border:1px solid #1e201e;border-radius:12px;">
      <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:10px;">¡Bienvenido, ${u.name}!</div>
      <div style="font-size:12px;color:#888;line-height:1.6;">Desde acá podés gestionar tu ${({club:'complejo',profesional:'perfil profesional',organizacion:'organización',tienda:'tienda',sponsor:'campaña de sponsoreo'})[u.role]}. Usá las pestañas de arriba para navegar.</div>
    </div>`;
  },
  _statGrid(stats){
    return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;">
      ${stats.map(s=>`<div style="background:rgba(255,255,255,0.03);border:1px solid #1e201e;border-radius:12px;padding:18px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;color:#888;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
          <i class='bx ${s.icon}' style="color:#baff00;font-size:16px;"></i> ${s.label}
        </div>
        <div style="font-size:26px;font-weight:900;color:#fff;font-family:Outfit,sans-serif;">${s.value}</div>
      </div>`).join('')}
    </div>`;
  },
  async _renderCanchas(body, u){
    const canchas = await Reservations.myComplexCanchas();
    body.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h3 style="margin:0;color:#fff;font-size:18px;">Mis canchas</h3>
      <button onclick="bizDashCreateCancha()" style="background:#baff00;color:#000;border:none;padding:10px 18px;border-radius:10px;font-weight:900;cursor:pointer;font-size:12px;"><i class='bx bx-plus'></i> AGREGAR CANCHA</button>
    </div>${canchas.length===0?`<div style="text-align:center;padding:50px;color:#666;border:1px dashed #333;border-radius:14px;"><i class='bx bx-football' style="font-size:48px;display:block;margin-bottom:10px;opacity:0.3;"></i>Aún no agregaste canchas.<br>Empezá agregando tu primera cancha para recibir reservas.</div>`:
      `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;">${canchas.map(c=>`
        <div style="background:rgba(255,255,255,0.04);border:1px solid #1e201e;border-radius:12px;overflow:hidden;">
          ${c.image_url?`<img src="${c.image_url}" style="width:100%;height:140px;object-fit:cover;">`:`<div style="height:140px;background:linear-gradient(135deg,#0a1a0a,#1a3a1a);display:flex;align-items:center;justify-content:center;"><i class='bx bx-football' style="font-size:40px;color:#333;"></i></div>`}
          <div style="padding:14px;">
            <div style="font-weight:800;color:#fff;">${c.title||'Cancha'}</div>
            <div style="font-size:11px;color:#888;margin-top:4px;">${c.payload?.sizes?.join(', ')||''}</div>
            <div style="font-size:13px;color:#baff00;margin-top:8px;font-weight:700;">${c.price?'$'+c.price+'/hora':'Sin precio'}</div>
          </div>
        </div>`).join('')}</div>`}`;
  },
  async _renderReservasComplejo(body, u){
    const reservas = await Reservations.myComplexReservations();
    body.innerHTML = `<h3 style="color:#fff;font-size:18px;margin:0 0 16px;">Reservas</h3>
    ${reservas.length===0?`<div style="text-align:center;padding:50px;color:#666;border:1px dashed #333;border-radius:14px;"><i class='bx bx-calendar-x' style="font-size:48px;display:block;margin-bottom:10px;opacity:0.3;"></i>Sin reservas todavía.<br>Cuando un jugador reserve, lo verás acá.</div>`:
      reservas.map(r => {
        const when = r.scheduled_at ? new Date(r.scheduled_at).toLocaleString('es-UY') : '—';
        const statusColor = { pending:'#ffb400', accepted:'#22c55e', rejected:'#ff4444', completed:'#666' }[r.status] || '#888';
        return `<div style="background:rgba(255,255,255,0.03);border:1px solid #1e201e;border-radius:12px;padding:14px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;">
          <div>
            <div style="font-weight:800;color:#fff;">${r.client_name||r.client_email}</div>
            <div style="font-size:12px;color:#888;margin-top:4px;"><i class='bx bx-football'></i> ${r.service_label||'Cancha'} · <i class='bx bx-time'></i> ${when}</div>
            ${r.price?`<div style="font-size:13px;color:#baff00;margin-top:4px;">$${r.price}</div>`:''}
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span style="color:${statusColor};font-size:11px;font-weight:800;text-transform:uppercase;">${r.status}</span>
            ${r.status==='pending'?`<button onclick="cancheroReservations.respondBooking('${r.id}',true).then(()=>bizDashSwitchTab('reservas'))" style="background:#22c55e;color:#000;border:none;padding:8px 14px;border-radius:8px;font-weight:800;cursor:pointer;font-size:11px;">✓ ACEPTAR</button>
            <button onclick="cancheroReservations.respondBooking('${r.id}',false).then(()=>bizDashSwitchTab('reservas'))" style="background:rgba(255,68,68,0.15);color:#ff4444;border:1px solid rgba(255,68,68,0.3);padding:8px 14px;border-radius:8px;font-weight:800;cursor:pointer;font-size:11px;">✗ RECHAZAR</button>`:''}
          </div>
        </div>`;
      }).join('')}`;
  },
  _renderCalendario(body, u){
    body.innerHTML = `<div style="padding:40px;text-align:center;color:#666;border:1px dashed #333;border-radius:14px;">
      <i class='bx bx-calendar' style="font-size:48px;display:block;margin-bottom:10px;opacity:0.3;"></i>
      Vista de calendario disponible próximamente.<br>Mientras tanto, usá la pestaña RESERVAS.
    </div>`;
  },
  _renderTarifas(body, u){
    const t = u.tarifas || { hora: '', match: '', torneo: '' };
    body.innerHTML = `<h3 style="color:#fff;margin:0 0 16px;">Mis tarifas</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">
      ${[{k:'hora',l:'Por hora'},{k:'match',l:'Por partido'},{k:'torneo',l:'Por torneo'}].map(x=>`
        <div style="background:rgba(255,255,255,0.03);border:1px solid #1e201e;border-radius:12px;padding:16px;">
          <div style="font-size:11px;color:#888;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">${x.l}</div>
          <input type="number" placeholder="0" id="tar-${x.k}" value="${t[x.k]||''}" style="width:100%;background:rgba(0,0,0,0.4);border:1px solid #2a2c2a;color:#fff;font-size:22px;padding:10px;border-radius:8px;font-weight:800;outline:none;">
          <div style="font-size:10px;color:#666;margin-top:4px;">UYU</div>
        </div>`).join('')}
    </div>
    <button onclick="bizDashSaveTarifas()" style="margin-top:16px;background:#baff00;color:#000;border:none;padding:11px 22px;border-radius:10px;font-weight:900;cursor:pointer;">GUARDAR TARIFAS</button>`;
  },
  async _renderAgenda(body, u){
    const bookings = sb() ? (await sb().from('service_bookings').select('*').eq('provider_email', meEmail()).order('scheduled_at',{ascending:true})).data || [] : [];
    body.innerHTML = `<h3 style="color:#fff;margin:0 0 16px;">Mi agenda</h3>
    ${bookings.length===0?`<div style="text-align:center;padding:50px;color:#666;border:1px dashed #333;border-radius:14px;"><i class='bx bx-calendar' style="font-size:48px;display:block;margin-bottom:10px;opacity:0.3;"></i>Sin citas agendadas.</div>`:
      bookings.map(b=>`<div style="background:rgba(255,255,255,0.03);border:1px solid #1e201e;border-radius:12px;padding:12px 16px;margin-bottom:8px;">
        <div style="font-weight:800;color:#fff;">${b.client_name||b.client_email} · <span style="color:#baff00;">${b.service_label||''}</span></div>
        <div style="font-size:12px;color:#888;margin-top:4px;">${b.scheduled_at?new Date(b.scheduled_at).toLocaleString('es-UY'):'—'} · Estado: ${b.status}</div>
      </div>`).join('')}`;
  },
  _renderResenas(body, u){
    body.innerHTML = `<div style="text-align:center;padding:50px;color:#666;border:1px dashed #333;border-radius:14px;">
      <i class='bx bx-star' style="font-size:48px;display:block;margin-bottom:10px;opacity:0.3;"></i>
      Aún no recibiste reseñas.<br>Las reseñas aparecen cuando los clientes te califican después de un servicio.
    </div>`;
  },
  async _renderTorneos(body, u){
    const { data } = sb() ? await sb().from('leagues').select('*').eq('owner_email', meEmail()).order('created_at',{ascending:false}) : { data: [] };
    body.innerHTML = `<div style="display:flex;justify-content:space-between;margin-bottom:16px;">
      <h3 style="color:#fff;margin:0;">Mis torneos</h3>
      <button onclick="bizDashCreateTorneo()" style="background:#baff00;color:#000;border:none;padding:10px 18px;border-radius:10px;font-weight:900;cursor:pointer;font-size:12px;"><i class='bx bx-plus'></i> CREAR TORNEO</button>
    </div>${!data||!data.length?`<div style="text-align:center;padding:50px;color:#666;border:1px dashed #333;border-radius:14px;"><i class='bx bx-trophy' style="font-size:48px;display:block;margin-bottom:10px;opacity:0.3;"></i>No tenés torneos. Creá tu primer torneo o liga.</div>`:
      data.map(l=>`<div style="background:rgba(255,255,255,0.03);border:1px solid #1e201e;border-radius:12px;padding:14px;margin-bottom:10px;">
        <div style="font-weight:800;color:#fff;">${l.name}</div>
        <div style="font-size:12px;color:#888;margin-top:4px;">${l.format||'Liga'} · ${l.max_teams||8} equipos · Estado: ${l.status}</div>
      </div>`).join('')}`;
  },
  _renderEquipos(body, u){
    body.innerHTML = `<div style="text-align:center;padding:50px;color:#666;border:1px dashed #333;border-radius:14px;"><i class='bx bx-group' style="font-size:48px;display:block;margin-bottom:10px;opacity:0.3;"></i>Próximamente: gestión de equipos.</div>`;
  },
  _renderJugadoresOrg(body, u){
    body.innerHTML = `<div style="text-align:center;padding:50px;color:#666;border:1px dashed #333;border-radius:14px;"><i class='bx bx-user' style="font-size:48px;display:block;margin-bottom:10px;opacity:0.3;"></i>Próximamente: gestión de jugadores de la organización.</div>`;
  },
  async _renderProductos(body, u){
    const { data } = sb() ? await sb().from('products').select('*').eq('seller_email', meEmail()).order('created_at',{ascending:false}) : { data: [] };
    body.innerHTML = `<div style="display:flex;justify-content:space-between;margin-bottom:16px;">
      <h3 style="color:#fff;margin:0;">Mis productos</h3>
      <button onclick="bizDashCreateProducto()" style="background:#baff00;color:#000;border:none;padding:10px 18px;border-radius:10px;font-weight:900;cursor:pointer;font-size:12px;"><i class='bx bx-plus'></i> AGREGAR</button>
    </div>${!data||!data.length?`<div style="text-align:center;padding:50px;color:#666;border:1px dashed #333;border-radius:14px;"><i class='bx bx-package' style="font-size:48px;display:block;margin-bottom:10px;opacity:0.3;"></i>Sin productos cargados.</div>`:
      `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;">${data.map(p=>`<div style="background:rgba(255,255,255,0.04);border:1px solid #1e201e;border-radius:12px;overflow:hidden;">
        ${p.image_url?`<img src="${p.image_url}" style="width:100%;height:140px;object-fit:cover;">`:`<div style="height:140px;background:#0f110f;display:flex;align-items:center;justify-content:center;"><i class='bx bx-package' style="font-size:36px;color:#333;"></i></div>`}
        <div style="padding:12px;">
          <div style="font-weight:800;color:#fff;">${p.title||'Producto'}</div>
          <div style="font-size:13px;color:#baff00;margin-top:6px;font-weight:700;">$${p.price||0}</div>
          <div style="font-size:10px;color:#888;margin-top:4px;">Stock: ${p.stock||0}</div>
        </div>
      </div>`).join('')}</div>`}`;
  },
  _renderVentas(body, u){
    body.innerHTML = `<div style="text-align:center;padding:50px;color:#666;border:1px dashed #333;border-radius:14px;"><i class='bx bx-receipt' style="font-size:48px;display:block;margin-bottom:10px;opacity:0.3;"></i>Sin ventas registradas.</div>`;
  },
  _renderStock(body, u){
    body.innerHTML = `<div style="text-align:center;padding:50px;color:#666;border:1px dashed #333;border-radius:14px;"><i class='bx bx-box' style="font-size:48px;display:block;margin-bottom:10px;opacity:0.3;"></i>Gestión de stock unificada con la pestaña PRODUCTOS.</div>`;
  },
  _renderCampanas(body, u){
    body.innerHTML = `<h3 style="color:#fff;margin:0 0 16px;">Mis campañas de sponsoreo</h3>
    <div style="text-align:center;padding:50px;color:#666;border:1px dashed #333;border-radius:14px;"><i class='bx bx-megaphone' style="font-size:48px;display:block;margin-bottom:10px;opacity:0.3;"></i>Aún no tenés campañas activas.<br>Contactá a soporte para activar tu sponsoreo.</div>`;
  },
  _renderMetricas(body, u){
    body.innerHTML = `<div style="text-align:center;padding:50px;color:#666;border:1px dashed #333;border-radius:14px;"><i class='bx bx-bar-chart-alt-2' style="font-size:48px;display:block;margin-bottom:10px;opacity:0.3;"></i>Métricas disponibles cuando una campaña esté activa.</div>`;
  },
  _renderContrato(body, u){
    body.innerHTML = `<div style="padding:24px;background:rgba(255,255,255,0.03);border:1px solid #1e201e;border-radius:12px;color:#ccc;font-size:13px;line-height:1.7;">
      <h3 style="color:#fff;margin:0 0 12px;">Términos del sponsoreo</h3>
      Tu marca aparecerá en las áreas pactadas. Pagos mensuales. Cancelación con 30 días de aviso.
      <br><br>Para ajustes o renovación, escribinos a <strong style="color:#baff00;">sponsors@canchero.app</strong>.
    </div>`;
  },
  _renderPublicProfile(body, u){
    body.innerHTML = `<h3 style="color:#fff;margin:0 0 16px;">Perfil público</h3>
    <div style="background:rgba(255,255,255,0.03);border:1px solid #1e201e;border-radius:12px;padding:18px;">
      <div style="display:flex;gap:14px;align-items:center;">
        <img src="${u.photo||('https://ui-avatars.com/api/?name='+encodeURIComponent(u.name||'')+'&background=000&color=baff00')}" style="width:72px;height:72px;border-radius:14px;object-fit:cover;">
        <div>
          <div style="font-size:20px;font-weight:900;color:#fff;">${u.name||''}</div>
          <div style="font-size:12px;color:#888;">${u.role}${u.subType?' · '+u.subType:''}</div>
          <div style="font-size:12px;color:#666;">${u.city||''}${u.city&&u.nat?', ':''}${u.nat||''}</div>
        </div>
      </div>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid #1e201e;font-size:13px;color:#ccc;">
        ${u.bio||'<em>Sin biografía. Editá tu perfil para agregar una descripción.</em>'}
      </div>
      <button onclick="bizDashEditProfile()" style="margin-top:14px;background:#baff00;color:#000;border:none;padding:10px 18px;border-radius:10px;font-weight:900;cursor:pointer;font-size:12px;"><i class='bx bx-edit'></i> EDITAR PERFIL</button>
    </div>`;
  },
  _renderSettings(body, u){
    body.innerHTML = `<h3 style="color:#fff;margin:0 0 16px;">Ajustes de cuenta</h3>
    <div style="background:rgba(255,255,255,0.03);border:1px solid #1e201e;border-radius:12px;padding:18px;color:#ccc;font-size:13px;line-height:1.8;">
      <div><strong>Email:</strong> ${u.email}</div>
      <div><strong>Rol:</strong> ${u.role}${u.subType?' · '+u.subType:''}</div>
      <div><strong>Suscripción:</strong> ${u.planSelected||'Free'}</div>
      <div><strong>Aprobación:</strong> ${u.isComplexApproved?'✓ Aprobada':'⏳ Pendiente'}</div>
      <div style="margin-top:14px;display:flex;gap:10px;">
        <button onclick="cancheroAuth.logout()" style="background:rgba(255,68,68,0.12);border:1px solid rgba(255,68,68,0.3);color:#ff4444;padding:9px 18px;border-radius:8px;font-weight:700;cursor:pointer;">Cerrar sesión</button>
      </div>
    </div>`;
  }
};
window.bizDash = BizDash;
window.bizDashSwitchTab = (tabId, el) => {
  BizDash.switchTab(tabId);
  if (el) {
    document.querySelectorAll('.biz-tab').forEach(b => { b.style.color='#888'; b.style.borderBottomColor='transparent'; });
    el.style.color = 'var(--accent,#baff00)'; el.style.borderBottomColor='var(--accent,#baff00)';
  }
};
window.bizDashCreateCancha = async () => {
  const title = prompt('Nombre de la cancha (ej: Cancha 1, F5)');
  if (!title) return;
  const price = parseFloat(prompt('Precio por hora (UYU)') || '0');
  if (!sb()) return;
  await sb().from('biz_items').insert([{
    owner_email: meEmail(), type:'court', active:true, title, price,
    payload:{ sizes:[ prompt('Modalidad (F5/F7/F11)') || 'F5' ] }
  }]);
  toast('Cancha agregada','success');
  BizDash.switchTab('canchas');
};
window.bizDashCreateTorneo = async () => {
  if (window.cancheroFeatures && window.cancheroFeatures.subs && !window.cancheroFeatures.subs.gateLeagueCreation()) return;
  const name = prompt('Nombre del torneo');
  if (!name) return;
  const format = prompt('Formato (liga / torneo / copa)','liga');
  const teams = parseInt(prompt('Cantidad máxima de equipos','8')) || 8;
  if (!sb()) return;
  await sb().from('leagues').insert([{
    name, format, owner_email: meEmail(), owner_tier: me().role,
    max_teams: teams, status:'open'
  }]);
  toast('Torneo creado','success');
  BizDash.switchTab('torneos');
};
window.bizDashCreateProducto = async () => {
  const title = prompt('Nombre del producto');
  if (!title) return;
  const price = parseFloat(prompt('Precio (UYU)') || '0');
  const stock = parseInt(prompt('Stock disponible') || '0');
  if (!sb()) return;
  await sb().from('products').insert([{
    seller_email: meEmail(), title, price, stock, active:true
  }]);
  toast('Producto agregado','success');
  BizDash.switchTab('productos');
};
window.bizDashSaveTarifas = () => {
  const u = me();
  if (!u) return;
  u.tarifas = {
    hora: document.getElementById('tar-hora')?.value || '',
    match: document.getElementById('tar-match')?.value || '',
    torneo: document.getElementById('tar-torneo')?.value || ''
  };
  localStorage.setItem('canchero_user', JSON.stringify(u));
  window.userData = u;
  toast('Tarifas guardadas','success');
};
window.bizDashEditProfile = () => {
  const u = me();
  if (!u) return;
  const newBio = prompt('Tu biografía / descripción del negocio:', u.bio||'');
  if (newBio !== null) {
    u.bio = newBio;
    localStorage.setItem('canchero_user', JSON.stringify(u));
    window.userData = u;
    if (sb()) sb().from('users').update({ bio: newBio }).eq('email', meEmail()).then(()=>{});
    BizDash.switchTab('profile');
    toast('Perfil actualizado','success');
  }
};

// ════════════════════════════════════════════════════════════════════════
// 6. AUTH HELPERS — logout cleanup
// ════════════════════════════════════════════════════════════════════════
window.cancheroAuth = {
  logout(){
    if (!confirm('¿Cerrar sesión?')) return;
    try { if (sb()) sb().auth.signOut(); } catch(e){}
    localStorage.removeItem('canchero_user');
    window.userData = null;
    location.href = '/';
  }
};

// ════════════════════════════════════════════════════════════════════════
// 7. INIT — al cargar el DOM y cuando user cambia
// ════════════════════════════════════════════════════════════════════════
function init(){
  // Notif bell
  Notifs._updateBadge();
  if (isLogged()) {
    Notifs.load().then(() => Notifs.subscribeRealtime());
  }
  // Stories strip — si existe el contenedor
  setTimeout(() => Stories.renderStrip(), 800);

  // Si user logueado y rol business, mostrar dashboard especial
  const u = me();
  if (u && ['club','profesional','organizacion','tienda','sponsor'].includes(u.role)) {
    setTimeout(() => BizDash.injectShell(u), 500);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Hook en applyUserData (cuando un user se loguea)
const _origApply = window.applyUserData;
window.applyUserData = function(){
  if (_origApply) _origApply();
  Notifs._updateBadge();
  if (isLogged()) Notifs.load().then(() => Notifs.subscribeRealtime());
  const u = me();
  if (u && ['club','profesional','organizacion','tienda','sponsor'].includes(u.role)) {
    setTimeout(() => BizDash.injectShell(u), 300);
  }
};

console.log('✓ Canchero App Module cargado');
})();
