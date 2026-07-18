// ════════════════════════════════════════════════════════════════════════════
// CANCHERO FEATURES V2 — Tags, Captains, Bookings, Subs, Requests
// ════════════════════════════════════════════════════════════════════════════
(function(){
'use strict';

const sb = () => window._sb || window.supabaseClient;
const me = () => window.currentUser || window.userData || {};
const meEmail = () => (me().email || '').toLowerCase();
const meName = () => me().name || me().full_name || me().email || 'Anónimo';

// ─── Helper: notificar a un user ─────────────────────────────────────────
async function notify(toEmail, type, title, body, refId, refType){
  if(!sb()) return;
  try {
    await sb().from('notifications').insert([{
      user_email: toEmail, type, title, body, ref_id: refId, ref_type: refType
    }]);
  } catch(e){ console.warn('notify failed', e); }
}

// ════════════════════════════════════════════════════════════════════════
// TAG SYSTEM — @autocomplete + tag profiles
// ════════════════════════════════════════════════════════════════════════
const tagSystem = {
  _searchCache: {},
  _debounce: null,

  // Buscar usuarios/complejos/clubes por nombre o email
  async search(query){
    if(!sb() || !query || query.length < 2) return [];
    const key = query.toLowerCase();
    if(this._searchCache[key]) return this._searchCache[key];
    try {
      const { data } = await sb()
        .from('users')
        .select('email, name, role, avatar_url')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(8);
      this._searchCache[key] = data || [];
      return data || [];
    } catch(e){ console.warn('tag search err', e); return []; }
  },

  // Instalar autocomplete en un textarea/input
  attachAutocomplete(input){
    if(!input || input._tagAttached) return;
    input._tagAttached = true;

    const dropdown = document.createElement('div');
    dropdown.className = 'tag-autocomplete';
    dropdown.style.cssText = 'position:absolute;background:#0a0c0a;border:1px solid #baff00;border-radius:8px;min-width:240px;max-height:260px;overflow-y:auto;z-index:9999;display:none;box-shadow:0 8px 24px rgba(0,0,0,0.5);';
    document.body.appendChild(dropdown);

    let activeIdx = 0; let results = [];

    const render = (rs) => {
      results = rs;
      dropdown.innerHTML = rs.map((u, i) => `
        <div class="tag-opt" data-idx="${i}" style="padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;border-bottom:1px solid #1a1a1a;${i===activeIdx?'background:rgba(186,255,0,0.15);':''}">
          <div style="width:32px;height:32px;border-radius:50%;background:#222;display:flex;align-items:center;justify-content:center;color:#baff00;font-weight:900;font-size:14px;">
            ${u.avatar_url ? `<img src="${u.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : (u.name||u.email||'?').charAt(0).toUpperCase()}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="color:#fff;font-weight:700;font-size:13px;">${u.name || u.email}</div>
            <div style="color:#888;font-size:10px;">${u.role || 'jugador'} · ${u.email}</div>
          </div>
        </div>
      `).join('');
      dropdown.querySelectorAll('.tag-opt').forEach(el => {
        el.onclick = () => insertTag(parseInt(el.dataset.idx));
      });
    };

    const positionDropdown = () => {
      const r = input.getBoundingClientRect();
      dropdown.style.top = (r.bottom + window.scrollY + 4) + 'px';
      dropdown.style.left = (r.left + window.scrollX) + 'px';
    };

    const getCurrentTagQuery = () => {
      const val = input.value;
      const cursor = input.selectionStart;
      const before = val.slice(0, cursor);
      const m = before.match(/@(\w*)$/);
      return m ? { query: m[1], start: cursor - m[1].length - 1 } : null;
    };

    const insertTag = (idx) => {
      const u = results[idx]; if(!u) return;
      const ctx = getCurrentTagQuery(); if(!ctx) return;
      const val = input.value;
      const before = val.slice(0, ctx.start);
      const after = val.slice(input.selectionStart);
      const tagText = `@${u.name || u.email.split('@')[0]} `;
      input.value = before + tagText + after;
      input.dataset.tags = JSON.stringify([
        ...(JSON.parse(input.dataset.tags || '[]')),
        { email: u.email, name: u.name || u.email, role: u.role }
      ]);
      dropdown.style.display = 'none';
      input.focus();
      const newPos = before.length + tagText.length;
      input.setSelectionRange(newPos, newPos);
    };

    input.addEventListener('input', () => {
      const ctx = getCurrentTagQuery();
      if(!ctx || ctx.query.length < 1){ dropdown.style.display='none'; return; }
      clearTimeout(this._debounce);
      this._debounce = setTimeout(async () => {
        const rs = await this.search(ctx.query);
        if(!rs.length){ dropdown.style.display='none'; return; }
        activeIdx = 0;
        render(rs);
        positionDropdown();
        dropdown.style.display = 'block';
      }, 200);
    });

    input.addEventListener('keydown', (e) => {
      if(dropdown.style.display === 'none') return;
      if(e.key === 'ArrowDown'){ e.preventDefault(); activeIdx = Math.min(activeIdx+1, results.length-1); render(results); }
      else if(e.key === 'ArrowUp'){ e.preventDefault(); activeIdx = Math.max(activeIdx-1, 0); render(results); }
      else if(e.key === 'Enter' || e.key === 'Tab'){ e.preventDefault(); insertTag(activeIdx); }
      else if(e.key === 'Escape'){ dropdown.style.display='none'; }
    });

    input.addEventListener('blur', () => setTimeout(() => dropdown.style.display='none', 200));
  },

  // Cuando se publica un post, extraer tags y notificar
  async onPostPublished(postId, tags){
    if(!tags || !tags.length) return;
    for(const t of tags){
      await notify(t.email, 'tag', 'Te etiquetaron', `${meName()} te etiquetó en una publicación`, postId, 'post');
    }
  },

  // El user etiquetado puede ocultar el tag de su perfil
  async removeMyTag(postId){
    if(!sb() || !meEmail()) return false;
    try {
      await sb().from('tags_removed').upsert([{ user_email: meEmail(), post_id: postId }]);
      return true;
    } catch(e){ console.warn(e); return false; }
  },

  // Listar posts donde aparezco etiquetado (para mostrar en mi perfil)
  async getPostsTaggingMe(){
    if(!sb() || !meEmail()) return [];
    try {
      const [{ data: posts }, { data: removed }] = await Promise.all([
        sb().from('posts').select('*').contains('tags', [{email: meEmail()}]).order('created_at', { ascending: false }).limit(50),
        sb().from('tags_removed').select('post_id').eq('user_email', meEmail())
      ]);
      const rmSet = new Set((removed||[]).map(r => r.post_id));
      return (posts || []).filter(p => !rmSet.has(p.id));
    } catch(e){ console.warn(e); return []; }
  },

  // Render tag badges en un post (con botón ✕ si soy yo)
  renderTagsHtml(tags, postId){
    if(!tags || !tags.length) return '';
    return `<div class="post-tags" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">
      ${tags.map(t => `
        <span class="tag-chip" data-tag-email="${t.email}" style="background:rgba(186,255,0,0.12);color:#baff00;padding:3px 9px;border-radius:12px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:5px;">
          @${t.name || t.email}
          ${t.email === meEmail() ? `<button onclick="window.cancheroFeatures.tags.removeMyTag('${postId}').then(()=>this.closest('.tag-chip').remove())" style="background:none;border:none;color:#ff4444;cursor:pointer;font-weight:900;padding:0;font-size:13px;" title="Quitar etiqueta de mi perfil">×</button>` : ''}
        </span>
      `).join('')}
    </div>`;
  }
};

// ════════════════════════════════════════════════════════════════════════
// CAPTAIN SYSTEM — solo capitanes cargan resultado, doble confirmación
// ════════════════════════════════════════════════════════════════════════
const captainSystem = {
  MAX_ATTEMPTS: 10,

  async isCaptainOf(matchId){
    if(!sb() || !meEmail()) return null;
    const { data } = await sb().from('matches').select('captain_home_email, captain_away_email').eq('id', matchId).single();
    if(!data) return null;
    if(data.captain_home_email === meEmail()) return 'home';
    if(data.captain_away_email === meEmail()) return 'away';
    return null;
  },

  async proposeResult(matchId, homeScore, awayScore){
    if(!sb()) return { ok:false, error:'No DB' };
    const side = await this.isCaptainOf(matchId);
    if(!side) return { ok:false, error:'No sos capitán de este partido' };

    const { data: match } = await sb().from('matches').select('*').eq('id', matchId).single();
    if(!match) return { ok:false, error:'Partido no encontrado' };
    if (match.scheduled_at && (new Date(match.scheduled_at) - Date.now()) < 20*60000) return { ok:false, error:'Las solicitudes cierran 20 minutos antes del partido.' };
    if(match.result_locked) return { ok:false, error:'Resultado ya confirmado' };
    if(match.result_voided) return { ok:false, error:'Partido anulado' };
    if(match.attempts_count >= this.MAX_ATTEMPTS) return { ok:false, error:'Se agotaron los 10 intentos. Esperá decisión del admin.' };

    const attempt = (match.attempts_count || 0) + 1;
    await sb().from('result_proposals').insert([{
      match_id: matchId, captain_email: meEmail(), side,
      home_score: homeScore, away_score: awayScore, attempt_number: attempt
    }]);
    await sb().from('matches').update({ attempts_count: attempt }).eq('id', matchId);

    // Notificar al otro capitán
    const otherEmail = side === 'home' ? match.captain_away_email : match.captain_home_email;
    if(otherEmail){
      await notify(otherEmail, 'result_proposed',
        `Propuesta de resultado: ${match.home_team} ${homeScore} - ${awayScore} ${match.away_team}`,
        `${meName()} propuso un resultado. Confirmá o proponé el tuyo (intento ${attempt}/${this.MAX_ATTEMPTS})`,
        matchId, 'match');
    }

    // Buscar última propuesta del otro lado y comparar
    const otherSide = side === 'home' ? 'away' : 'home';
    const { data: otherProp } = await sb().from('result_proposals')
      .select('*').eq('match_id', matchId).eq('side', otherSide)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();

    if(otherProp && otherProp.home_score === homeScore && otherProp.away_score === awayScore){
      // ¡Coinciden! Lockear resultado
      await sb().from('matches').update({
        final_home_score: homeScore, final_away_score: awayScore,
        result_locked: true, result_disputed: false
      }).eq('id', matchId);
      await this._propagateStats(matchId);
      return { ok:true, locked:true, message:'¡Resultado confirmado!' };
    }

    if(attempt >= this.MAX_ATTEMPTS){
      await sb().from('matches').update({ result_disputed: true }).eq('id', matchId);
      // Notificar a admins
      const { data: admins } = await sb().from('users').select('email').eq('is_admin', true);
      for(const a of (admins||[])){
        await notify(a.email, 'admin', 'Disputa de resultado',
          `El partido ${match.home_team} vs ${match.away_team} llegó a 10 intentos sin acuerdo`, matchId, 'match');
      }
      return { ok:true, locked:false, disputed:true, message:'Sin acuerdo en 10 intentos. Admin decidirá.' };
    }

    return { ok:true, locked:false, attempt, message:`Propuesta enviada (intento ${attempt}/${this.MAX_ATTEMPTS})` };
  },

  async _propagateStats(matchId){
    // Recalcula stats para todos los participantes
    const { data: parts } = await sb().from('match_participants').select('user_email').eq('match_id', matchId);
    for(const p of (parts||[])){
      try { await sb().rpc('recalc_player_stats', { p_email: p.user_email }); } catch(e){ console.warn(e); }
    }
  },

  async sendChat(matchId, body){
    if(!sb() || !body.trim()) return;
    const side = await this.isCaptainOf(matchId);
    if(!side) return { ok:false, error:'Solo capitanes pueden chatear acá' };
    await sb().from('match_chat').insert([{
      match_id: matchId, sender_email: meEmail(), sender_name: meName(), body: body.trim()
    }]);
    return { ok:true };
  },

  async loadChat(matchId){
    if(!sb()) return [];
    const { data } = await sb().from('match_chat').select('*').eq('match_id', matchId).order('created_at');
    return data || [];
  },

  // ADMIN: forzar resultado o anular
  async adminSetResult(matchId, homeScore, awayScore, reason){
    if(!me().is_admin) return { ok:false, error:'Solo admin' };
    await sb().from('matches').update({
      final_home_score: homeScore, final_away_score: awayScore,
      result_locked: true, result_disputed: false
    }).eq('id', matchId);
    await sb().from('admin_match_overrides').insert([{
      match_id: matchId, admin_email: meEmail(), action:'set_result',
      home_score: homeScore, away_score: awayScore, reason
    }]);
    await this._propagateStats(matchId);
    return { ok:true };
  },

  async adminVoidMatch(matchId, reason){
    if(!me().is_admin) return { ok:false, error:'Solo admin' };
    await sb().from('matches').update({ result_voided: true, result_locked: true }).eq('id', matchId);
    await sb().from('admin_match_overrides').insert([{
      match_id: matchId, admin_email: meEmail(), action:'void', reason
    }]);
    return { ok:true };
  }
};

// ════════════════════════════════════════════════════════════════════════
// MATCH REQUESTS — abiertos/cerrados con solicitudes
// ════════════════════════════════════════════════════════════════════════
const matchRequests = {
  async requestJoin(matchId, sidePref='any'){
    if(!sb() || !meEmail()) return { ok:false, error:'Login requerido' };
    const { data: match } = await sb().from('matches').select('*').eq('id', matchId).single();
    if(!match) return { ok:false, error:'Partido no encontrado' };
    if (match.scheduled_at && (new Date(match.scheduled_at) - Date.now()) < 20*60000) return { ok:false, error:'Las solicitudes cierran 20 minutos antes del partido.' };
    if(match.match_type === 'open' && match.slots_taken < match.slots_total){
      // Auto-aceptar
      await sb().from('match_requests').upsert([{
        match_id: matchId, user_email: meEmail(), user_name: meName(),
        side_pref: sidePref, status: 'accepted'
      }]);
      // slots_taken lo mantiene el trigger de Postgres (RLS)
      return { ok:true, autoAccepted:true };
    }
    // Cerrado: pending, notifica al creador
    await sb().from('match_requests').upsert([{
      match_id: matchId, user_email: meEmail(), user_name: meName(),
      side_pref: sidePref, status: 'pending'
    }]);
    if(match.created_by){
      await notify(match.created_by, 'request_accepted',
        'Solicitud para tu partido',
        `${meName()} quiere unirse a ${match.home_team} vs ${match.away_team}`,
        matchId, 'match');
    }
    return { ok:true, pending:true };
  },

  async listRequests(matchId){
    if(!sb()) return [];
    const { data } = await sb().from('match_requests').select('*').eq('match_id', matchId).order('created_at');
    return data || [];
  },

  async respondRequest(requestId, accept){
    if(!sb()) return { ok:false };
    const status = accept ? 'accepted' : 'rejected';
    const { data: req } = await sb().from('match_requests').select('*').eq('id', requestId).single();
    if(!req) return { ok:false };
    await sb().from('match_requests').update({ status }).eq('id', requestId);
    if(accept && req.type === 'club' && req.club_id){
      // Paso 6: club entero aceptado → setear escudo/nombre y AUTOCOMPLETAR la
      // plantilla respetando la posición natural de cada jugador
      try {
        const team = req.team || 'away';
        const { data: club } = await sb().from('clubs').select('id,name,logo_url,logo').eq('id', req.club_id).single();
        const { data: members } = await sb().from('club_members').select('player_email,player_name,position,role').eq('club_id', req.club_id);
        const upd = {};
        upd[team==='home'?'home_club_id':'away_club_id'] = req.club_id;
        upd[team==='home'?'home_club_name':'away_club_name'] = (club && club.name) || req.club_name;
        upd[team==='home'?'home_club_logo':'away_club_logo'] = club && (club.logo_url || club.logo) || null;
        await sb().from('matches').update(upd).eq('id', req.match_id);
        const { data: mFmt } = await sb().from('matches').select('format,match_type').eq('id', req.match_id).single();
        const cap = window.CancheroFormations ? CancheroFormations.capacity(mFmt && (mFmt.format||mFmt.match_type)) : 11;
        const maxSubs = window.CancheroFormations ? CancheroFormations.MAX_SUBS : 3;
        const rows = (members||[]).slice(0, cap + maxSubs).map((p, i) => ({
          match_id: req.match_id, player_email: p.player_email, player_name: p.player_name || p.player_email,
          team: team, position: p.position || 'MED', is_sub: i >= cap,
          is_captain: p.player_email === req.user_email, status: 'confirmado'
        }));
        if (rows.length) await sb().from('match_players').upsert(rows, { onConflict: 'match_id,player_email' });
      } catch(e){}
      await notify(req.user_email, 'request_accepted', 'Club aceptado',
        `Tu club ${req.club_name||''} fue aceptado en el partido. ¡A jugar! 🛡`, req.match_id, 'match');
      return { ok:true };
    }
    if(accept){
      const { data: m } = await sb().from('matches').select('slots_taken').eq('id', req.match_id).single();
      // slots_taken lo mantiene el trigger de Postgres (RLS)
      // CLAVE: el aceptado pasa a ser jugador del partido (aparece en Mis Partidos)
      try {
        // Posición por defecto = posición natural del jugador (su perfil), no 'DEL' fijo
        let natural = null;
        try {
          const { data: u } = await sb().from('users').select('pos, position').eq('email', req.user_email).single();
          natural = u && (u.pos || u.position) || null;
        } catch(e2){}
        await sb().from('match_players').upsert([{
          match_id: req.match_id, player_email: req.user_email, player_name: req.user_name,
          team: req.team || (req.side_pref!=='any' ? req.side_pref : null),
          position_slot: req.position_slot || null,
          position: req.position_slot || natural || 'MED', status: 'confirmado'
        }], { onConflict: 'match_id,player_email' }).catch?.(()=>{});
      } catch(e){}
    }
    await notify(req.user_email, 'request_accepted',
      accept ? 'Solicitud aceptada' : 'Solicitud rechazada',
      `Tu solicitud al partido fue ${accept?'aceptada':'rechazada'}`,
      req.match_id, 'match');
    return { ok:true };
  }
};

// ════════════════════════════════════════════════════════════════════════
// SERVICE BOOKINGS — contratar árbitros, complejos, profesionales
// ════════════════════════════════════════════════════════════════════════
const bookings = {
  async create({ providerEmail, providerType, serviceLabel, matchId, scheduledAt, price, notes }){
    if(!sb() || !meEmail()) return { ok:false, error:'Login requerido' };
    const { data, error } = await sb().from('service_bookings').insert([{
      client_email: meEmail(), client_name: meName(),
      provider_email: providerEmail, provider_type: providerType,
      service_label: serviceLabel, match_id: matchId || null,
      scheduled_at: scheduledAt, price, notes, status:'pending'
    }]).select().single();
    if(error) return { ok:false, error: error.message };
    await notify(providerEmail, 'booking', 'Nueva solicitud de contratación',
      `${meName()} solicita: ${serviceLabel}`, data.id, 'booking');
    return { ok:true, booking: data };
  },

  async respond(bookingId, status){
    if(!sb()) return { ok:false };
    const { data: b } = await sb().from('service_bookings').select('*').eq('id', bookingId).single();
    if(!b) return { ok:false };
    if(b.provider_email !== meEmail()) return { ok:false, error:'No autorizado' };
    await sb().from('service_bookings').update({ status }).eq('id', bookingId);
    await notify(b.client_email, 'booking',
      status==='accepted'?'Contratación aceptada':status==='rejected'?'Contratación rechazada':'Estado actualizado',
      `${meName()} actualizó tu solicitud: ${b.service_label}`, bookingId, 'booking');
    return { ok:true };
  },

  async listMine(role='client'){
    if(!sb() || !meEmail()) return [];
    const col = role === 'client' ? 'client_email' : 'provider_email';
    const { data } = await sb().from('service_bookings').select('*').eq(col, meEmail()).order('created_at', { ascending: false });
    return data || [];
  },

  // Helper UI: modal genérico de contratación
  openModal({ providerEmail, providerName, providerType, defaultLabel = 'Servicio' }){
    const html = `
      <div id="booking-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div style="background:#0a0c0a;border:2px solid #baff00;border-radius:14px;padding:24px;max-width:440px;width:100%;max-height:90vh;overflow-y:auto;">
          <h3 style="color:#baff00;margin-bottom:6px;font-size:18px;">Contratar a ${providerName}</h3>
          <p style="color:#888;font-size:12px;margin-bottom:18px;">${providerType.toUpperCase()}</p>
          <label style="color:#fff;font-size:11px;font-weight:700;display:block;margin-bottom:4px;">SERVICIO</label>
          <input id="bk-label" value="${defaultLabel}" style="width:100%;padding:10px;background:#111;border:1px solid #222;color:#fff;border-radius:8px;margin-bottom:12px;">
          <label style="color:#fff;font-size:11px;font-weight:700;display:block;margin-bottom:4px;">FECHA Y HORA</label>
          <input id="bk-date" type="datetime-local" style="width:100%;padding:10px;background:#111;border:1px solid #222;color:#fff;border-radius:8px;margin-bottom:12px;">
          <label style="color:#fff;font-size:11px;font-weight:700;display:block;margin-bottom:4px;">PRECIO ESTIMADO (UYU)</label>
          <input id="bk-price" type="number" placeholder="2000" style="width:100%;padding:10px;background:#111;border:1px solid #222;color:#fff;border-radius:8px;margin-bottom:12px;">
          <label style="color:#fff;font-size:11px;font-weight:700;display:block;margin-bottom:4px;">NOTAS</label>
          <textarea id="bk-notes" placeholder="Detalles adicionales..." style="width:100%;padding:10px;background:#111;border:1px solid #222;color:#fff;border-radius:8px;margin-bottom:16px;min-height:70px;"></textarea>
          <div style="display:flex;gap:10px;">
            <button onclick="document.getElementById('booking-modal').remove()" style="flex:1;padding:11px;background:#222;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">CANCELAR</button>
            <button id="bk-send" style="flex:2;padding:11px;background:#baff00;color:#000;border:none;border-radius:8px;font-weight:900;cursor:pointer;">ENVIAR SOLICITUD</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('bk-send').onclick = async () => {
      const r = await this.create({
        providerEmail, providerType,
        serviceLabel: document.getElementById('bk-label').value,
        scheduledAt: document.getElementById('bk-date').value,
        price: parseFloat(document.getElementById('bk-price').value) || null,
        notes: document.getElementById('bk-notes').value
      });
      if(r.ok){ alert('✅ Solicitud enviada'); document.getElementById('booking-modal').remove(); }
      else alert('❌ ' + (r.error || 'Error'));
    };
  }
};

// ════════════════════════════════════════════════════════════════════════
// SUBSCRIPTIONS / GATING — ligas/torneos solo Profesional/Organización
// ════════════════════════════════════════════════════════════════════════
const subs = {
  PAID_TIERS: ['profesional','organizacion','complejo','tienda'],

  isActiveSub(user){
    user = user || me();
    if(!user) return false;
    if(user.sub_status !== 'active') return false;
    if(user.sub_expires_at && new Date(user.sub_expires_at) < new Date()) return false;
    return this.PAID_TIERS.includes(user.sub_tier);
  },

  canCreateLeague(user){
    user = user || me();
    return this.isActiveSub(user) && ['profesional','organizacion'].includes(user.sub_tier);
  },

  canCreateMatch(){
    return !!meEmail(); // cualquier jugador logueado
  },

  // Bloqueo UI con mensaje claro
  gateLeagueCreation(){
    if(this.canCreateLeague()) return true;
    alert('⛔ Solo Profesionales y Organizaciones con suscripción activa pueden crear ligas o torneos.\n\nSi querés crear ligas/torneos:\n1. Registrate como Profesional u Organización\n2. Activá tu suscripción mensual\n\n¿Querés ver los planes?');
    if(window.cancheroFeatures && window.cancheroFeatures.subs.openPlans) window.cancheroFeatures.subs.openPlans();
    return false;
  },

  openPlans(){
    const html = `
      <div id="plans-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;">
        <div style="background:#0a0c0a;border:2px solid #baff00;border-radius:14px;padding:24px;max-width:720px;width:100%;max-height:92vh;overflow-y:auto;">
          <h2 style="color:#baff00;margin-bottom:8px;text-align:center;">PLANES CANCHERO</h2>
          <p style="color:#888;text-align:center;margin-bottom:22px;font-size:12px;">Activá tu cuenta paga para desbloquear ligas, torneos y herramientas pro</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
            ${[
              { tier:'profesional', name:'PROFESIONAL', price:'UYU 1.200/mes', perks:['Crear ligas y torneos','Recibir contrataciones','Stats avanzadas','Verificación oficial'] },
              { tier:'organizacion', name:'ORGANIZACIÓN', price:'UYU 2.500/mes', perks:['Todo Profesional','Multi-admin','Branding propio','Reportes detallados'] },
              { tier:'complejo', name:'COMPLEJO', price:'UYU 1.800/mes', perks:['Listado en directorio','Reservas online','Pagos integrados','Estadísticas'] },
              { tier:'tienda', name:'TIENDA', price:'UYU 900/mes', perks:['Productos en feed','Sponsor visibility','Promos a usuarios'] }
            ].map(p => `
              <div style="background:#111;border:1px solid #333;border-radius:12px;padding:16px;">
                <h3 style="color:#baff00;font-size:14px;margin-bottom:4px;">${p.name}</h3>
                <div style="color:#fff;font-size:18px;font-weight:900;margin-bottom:10px;">${p.price}</div>
                <ul style="list-style:none;padding:0;margin:0 0 14px 0;">
                  ${p.perks.map(perk => `<li style="color:#ccc;font-size:11px;padding:3px 0;">✓ ${perk}</li>`).join('')}
                </ul>
                <button onclick="window.cancheroFeatures.subs.subscribe('${p.tier}')" style="width:100%;padding:9px;background:#baff00;color:#000;border:none;border-radius:8px;font-weight:900;cursor:pointer;font-size:12px;">SUSCRIBIRME</button>
              </div>
            `).join('')}
          </div>
          <div style="text-align:center;margin-top:18px;">
            <button onclick="document.getElementById('plans-modal').remove()" style="background:none;border:1px solid #444;color:#888;padding:8px 18px;border-radius:8px;cursor:pointer;">CERRAR</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  },

  async subscribe(tier){
    if(!sb() || !meEmail()){ alert('Iniciá sesión primero'); return; }
    const prices = { profesional:1200, organizacion:2500, complejo:1800, tienda:900 };
    const expires = new Date(); expires.setMonth(expires.getMonth()+1);
    try {
      await sb().from('subscriptions').insert([{
        user_email: meEmail(), tier, amount: prices[tier] || 0,
        starts_at: new Date().toISOString(), expires_at: expires.toISOString(), status:'active'
      }]);
      await sb().from('users').update({
        sub_tier: tier, sub_status:'active', sub_expires_at: expires.toISOString(), role: tier
      }).eq('email', meEmail());
      alert('✅ Suscripción activada (DEMO — sin cobro real). Recargá la página para ver los cambios.');
      const m = document.getElementById('plans-modal'); if(m) m.remove();
    } catch(e){ alert('Error: ' + e.message); }
  }
};

// ════════════════════════════════════════════════════════════════════════
// LEAGUES / TOURNAMENTS — creación con gate
// ════════════════════════════════════════════════════════════════════════
const leagues = {
  async create({ name, format, startsAt, endsAt, maxTeams, description }){
    if(!subs.gateLeagueCreation()) return { ok:false, error:'Gate' };
    const u = me();
    const { data, error } = await sb().from('leagues').insert([{
      name, format, owner_email: meEmail(), owner_tier: u.sub_tier,
      starts_at: startsAt, ends_at: endsAt, max_teams: maxTeams, description, status:'open'
    }]).select().single();
    if(error) return { ok:false, error: error.message };
    return { ok:true, league: data };
  },

  async list(){
    if(!sb()) return [];
    const { data } = await sb().from('leagues').select('*').order('created_at', { ascending: false }).limit(50);
    return data || [];
  },

  openCreateModal(){
    if(!subs.gateLeagueCreation()) return;
    const html = `
      <div id="league-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div style="background:#0a0c0a;border:2px solid #baff00;border-radius:14px;padding:24px;max-width:480px;width:100%;max-height:92vh;overflow-y:auto;">
          <h3 style="color:#baff00;margin-bottom:18px;">CREAR LIGA / TORNEO</h3>
          <input id="lg-name" placeholder="Nombre" style="width:100%;padding:10px;background:#111;border:1px solid #222;color:#fff;border-radius:8px;margin-bottom:10px;">
          <select id="lg-format" style="width:100%;padding:10px;background:#111;border:1px solid #222;color:#fff;border-radius:8px;margin-bottom:10px;">
            <option value="liga">Liga</option><option value="torneo">Torneo</option><option value="copa">Copa</option>
          </select>
          <label style="color:#888;font-size:11px;">Inicio</label>
          <input id="lg-start" type="date" style="width:100%;padding:10px;background:#111;border:1px solid #222;color:#fff;border-radius:8px;margin-bottom:10px;">
          <label style="color:#888;font-size:11px;">Fin</label>
          <input id="lg-end" type="date" style="width:100%;padding:10px;background:#111;border:1px solid #222;color:#fff;border-radius:8px;margin-bottom:10px;">
          <input id="lg-teams" type="number" placeholder="Máx equipos" value="8" style="width:100%;padding:10px;background:#111;border:1px solid #222;color:#fff;border-radius:8px;margin-bottom:10px;">
          <textarea id="lg-desc" placeholder="Descripción..." style="width:100%;padding:10px;background:#111;border:1px solid #222;color:#fff;border-radius:8px;margin-bottom:16px;min-height:60px;"></textarea>
          <div style="display:flex;gap:10px;">
            <button onclick="document.getElementById('league-modal').remove()" style="flex:1;padding:11px;background:#222;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">CANCELAR</button>
            <button id="lg-send" style="flex:2;padding:11px;background:#baff00;color:#000;border:none;border-radius:8px;font-weight:900;cursor:pointer;">CREAR</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('lg-send').onclick = async () => {
      const r = await this.create({
        name: document.getElementById('lg-name').value,
        format: document.getElementById('lg-format').value,
        startsAt: document.getElementById('lg-start').value,
        endsAt: document.getElementById('lg-end').value,
        maxTeams: parseInt(document.getElementById('lg-teams').value) || 8,
        description: document.getElementById('lg-desc').value
      });
      if(r.ok){ alert('✅ Liga creada'); document.getElementById('league-modal').remove(); }
      else alert('❌ ' + (r.error || 'Error'));
    };
  }
};

// ════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS — listado + marcar leído
// ════════════════════════════════════════════════════════════════════════
const notifs = {
  async list(unreadOnly=false){
    if(!sb() || !meEmail()) return [];
    let q = sb().from('notifications').select('*').eq('user_email', meEmail()).order('created_at', { ascending: false }).limit(50);
    if(unreadOnly) q = q.is('read_at', null);
    const { data } = await q;
    return data || [];
  },
  async markRead(id){
    if(!sb()) return;
    await sb().from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
  },
  async unreadCount(){
    if(!sb() || !meEmail()) return 0;
    const { count } = await sb().from('notifications').select('*', { count:'exact', head:true }).eq('user_email', meEmail()).is('read_at', null);
    return count || 0;
  }
};

// ════════════════════════════════════════════════════════════════════════
// PLAYER NEEDED — alerta en tiempo real "faltan jugadores en X complejo"
// ════════════════════════════════════════════════════════════════════════
const playerNeeded = {
  _realtimeChan: null,

  async broadcast({ matchId, venue, missing, urgency='normal', whenAt }){
    if(!sb() || !meEmail()) return { ok:false, error:'Login requerido' };
    const body = `🚨 Faltan ${missing} jugador(es) en ${venue}${whenAt ? ' · ' + new Date(whenAt).toLocaleString('es-UY', {timeZone:'America/Montevideo'}) : ''}`;

    // 1) Guardar como notificación broadcast (user_email='*' = a todos)
    await sb().from('notifications').insert([{
      user_email: '*',
      type: 'player_needed',
      title: `Buscan ${missing} jugador${missing>1?'es':''}`,
      body,
      ref_id: matchId,
      ref_type: 'match'
    }]);

    // 2) Crear post en feed con flag urgent
    await sb().from('posts').insert([{
      user_email: meEmail(),
      user_name: meName(),
      user_role: 'jugador',
      content: body + (urgency==='urgent' ? '\n\n⚡ URGENTE — empezamos ya' : '\n\nResponde a este post si querés jugar.'),
      media_type: 'text',
      tags: []
    }]);

    // 3) Emitir realtime broadcast
    try {
      const ch = sb().channel('player-needed-broadcast');
      ch.send({ type:'broadcast', event:'player_needed', payload:{ matchId, venue, missing, urgency, by: meName() }});
    } catch(e){}

    return { ok:true };
  },

  // Suscribirse a alertas (mostrar toast cuando entra una)
  subscribe(){
    if(!sb() || this._realtimeChan) return;
    try {
      this._realtimeChan = sb().channel('player-needed-broadcast');
      this._realtimeChan.on('broadcast', { event:'player_needed' }, (payload) => {
        this._showToast(payload.payload);
      }).subscribe();
    } catch(e){ console.warn('realtime err', e); }
  },

  _showToast(p){
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;top:80px;right:20px;background:linear-gradient(135deg,#baff00,#7ace00);color:#000;padding:14px 18px;border-radius:12px;z-index:99999;box-shadow:0 6px 24px rgba(186,255,0,0.5);font-family:Inter,sans-serif;max-width:320px;animation:slideInRight .3s ease;';
    div.innerHTML = `
      <div style="font-weight:900;font-size:13px;margin-bottom:4px;">🚨 BUSCAN JUGADORES</div>
      <div style="font-size:12px;line-height:1.4;">${p.by} necesita ${p.missing} en ${p.venue}</div>
      <div style="margin-top:8px;display:flex;gap:6px;">
        <button onclick="this.closest('div').parentElement.remove();window.cancheroFeatures.playerNeeded.acceptCall('${p.matchId}')" style="background:#000;color:#baff00;border:none;padding:5px 10px;border-radius:6px;font-weight:800;font-size:10px;cursor:pointer;">VOY!</button>
        <button onclick="this.closest('div').parentElement.remove()" style="background:transparent;border:1px solid #000;padding:5px 10px;border-radius:6px;font-weight:800;font-size:10px;cursor:pointer;">No</button>
      </div>`;
    document.body.appendChild(div);
    setTimeout(() => { if(div.parentElement) div.remove(); }, 20000);
  },

  async acceptCall(matchId){
    if(!matchId) return;
    const r = await matchRequests.requestJoin(matchId, 'any');
    alert(r.autoAccepted ? '✅ Te sumaste al partido' : r.ok ? '✅ Solicitud enviada' : '❌ ' + r.error);
  },

  openComposer(){
    const html = `
      <div id="pn-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div style="background:#0a0c0a;border:2px solid #baff00;border-radius:14px;padding:24px;max-width:420px;width:100%;">
          <h3 style="color:#baff00;margin-bottom:6px;">🚨 BUSCAR JUGADORES</h3>
          <p style="color:#888;font-size:12px;margin-bottom:16px;">Notificá a todos los jugadores activos que te faltan personas</p>
          <label style="color:#fff;font-size:11px;font-weight:700;display:block;margin-bottom:4px;">COMPLEJO / CANCHA</label>
          <input id="pn-venue" placeholder="Ej: Cancha El Galpón" style="width:100%;padding:10px;background:#111;border:1px solid #222;color:#fff;border-radius:8px;margin-bottom:10px;">
          <label style="color:#fff;font-size:11px;font-weight:700;display:block;margin-bottom:4px;">¿CUÁNTOS FALTAN?</label>
          <input id="pn-missing" type="number" value="2" min="1" max="11" style="width:100%;padding:10px;background:#111;border:1px solid #222;color:#fff;border-radius:8px;margin-bottom:10px;">
          <label style="color:#fff;font-size:11px;font-weight:700;display:block;margin-bottom:4px;">CUÁNDO</label>
          <input id="pn-when" type="datetime-local" style="width:100%;padding:10px;background:#111;border:1px solid #222;color:#fff;border-radius:8px;margin-bottom:10px;">
          <label style="display:flex;align-items:center;gap:8px;color:#fff;font-size:12px;margin-bottom:16px;cursor:pointer;">
            <input id="pn-urgent" type="checkbox"> ⚡ URGENTE (empezamos ya)
          </label>
          <div style="display:flex;gap:10px;">
            <button onclick="document.getElementById('pn-modal').remove()" style="flex:1;padding:11px;background:#222;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">CANCELAR</button>
            <button id="pn-send" style="flex:2;padding:11px;background:#baff00;color:#000;border:none;border-radius:8px;font-weight:900;cursor:pointer;">🚀 ENVIAR ALERTA</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('pn-send').onclick = async () => {
      const venue = document.getElementById('pn-venue').value.trim();
      const missing = parseInt(document.getElementById('pn-missing').value) || 1;
      const whenAt = document.getElementById('pn-when').value;
      const urgency = document.getElementById('pn-urgent').checked ? 'urgent' : 'normal';
      if(!venue){ alert('Indicá el complejo/cancha'); return; }
      const r = await this.broadcast({ venue, missing, whenAt, urgency });
      if(r.ok){ alert('✅ Alerta enviada a todos los jugadores'); document.getElementById('pn-modal').remove(); }
      else alert('❌ ' + r.error);
    };
  }
};

// ════════════════════════════════════════════════════════════════════════
// MATCH CREATION — auto-asignar capitán al creador + permitir cambio
// ════════════════════════════════════════════════════════════════════════
const matchCreation = {
  async create({ homeTeam, awayTeam, matchAt, venue, league, slotsTotal=10, matchType='open', side='home' }){
    if(!sb() || !meEmail()) return { ok:false, error:'Login requerido' };
    const captainField = side === 'home' ? 'captain_home_email' : 'captain_away_email';
    const insert = {
      home_team: homeTeam, away_team: awayTeam, match_at: matchAt,
      venue, league, slots_total: slotsTotal, slots_taken: 1,
      match_type: matchType, created_by: meEmail(),
      [captainField]: meEmail()
    };
    const { data, error } = await sb().from('matches').insert([insert]).select().single();
    if(error) return { ok:false, error: error.message };
    // Marcar al user como capitán
    await sb().from('users').update({ is_captain: true }).eq('email', meEmail());
    // Agregar como participante
    await sb().from('match_participants').insert([{
      match_id: data.id, user_email: meEmail(), side
    }]);
    return { ok:true, match: data, captainSide: side };
  },

  // Cambiar capitán a otro jugador del equipo
  async transferCaptain(matchId, newCaptainEmail, side){
    if(!sb()) return { ok:false };
    const field = side === 'home' ? 'captain_home_email' : 'captain_away_email';
    const { data: m } = await sb().from('matches').select(field+', created_by').eq('id', matchId).single();
    if(!m) return { ok:false, error:'Partido no encontrado' };
    // Solo el capitán actual o el creador pueden transferir
    if(m[field] !== meEmail() && m.created_by !== meEmail()) return { ok:false, error:'No autorizado' };
    await sb().from('matches').update({ [field]: newCaptainEmail }).eq('id', matchId);
    await sb().from('users').update({ is_captain: true }).eq('email', newCaptainEmail);
    await notify(newCaptainEmail, 'admin', 'Sos el nuevo capitán',
      `${meName()} te transfirió la capitanía del partido`, matchId, 'match');
    return { ok:true };
  },

  openTransferModal(matchId, side){
    const html = `
      <div id="tc-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div style="background:#0a0c0a;border:2px solid #baff00;border-radius:14px;padding:24px;max-width:380px;width:100%;">
          <h3 style="color:#baff00;margin-bottom:14px;">CAMBIAR CAPITÁN (${side==='home'?'LOCAL':'VISITANTE'})</h3>
          <p style="color:#888;font-size:12px;margin-bottom:12px;">Escribí el email del nuevo capitán</p>
          <input id="tc-email" type="email" placeholder="jugador@ejemplo.com" style="width:100%;padding:10px;background:#111;border:1px solid #222;color:#fff;border-radius:8px;margin-bottom:16px;">
          <div style="display:flex;gap:10px;">
            <button onclick="document.getElementById('tc-modal').remove()" style="flex:1;padding:11px;background:#222;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">CANCELAR</button>
            <button id="tc-send" style="flex:2;padding:11px;background:#baff00;color:#000;border:none;border-radius:8px;font-weight:900;cursor:pointer;">TRANSFERIR</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('tc-send').onclick = async () => {
      const email = document.getElementById('tc-email').value.trim().toLowerCase();
      if(!email){ alert('Email requerido'); return; }
      const r = await this.transferCaptain(matchId, email, side);
      if(r.ok){ alert('✅ Capitanía transferida'); document.getElementById('tc-modal').remove(); }
      else alert('❌ ' + r.error);
    };
  }
};

// ════════════════════════════════════════════════════════════════════════
// REAL PAYMENTS — MercadoPago checkout (stub con redirect)
// ════════════════════════════════════════════════════════════════════════
const payments = {
  // Reemplaza el subscribe() demo del subs module con un checkout real
  async checkout(tier){
    if(!sb() || !meEmail()){ alert('Iniciá sesión primero'); return; }
    const prices = { profesional:1200, organizacion:2500, complejo:1800, tienda:900 };
    const amount = prices[tier] || 0;
    try {
      const r = await fetch('/api/create-payment', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ tier, amount, email: meEmail(), name: meName() })
      });
      const data = await r.json();
      if(data.init_point){
        window.location.href = data.init_point;
      } else if(data.error){
        alert('Error: ' + data.error + '\n\nFallback: activando suscripción DEMO sin cobro.');
        return subs.subscribe(tier);
      }
    } catch(e){
      console.warn('Pago no disponible, fallback demo', e);
      return subs.subscribe(tier);
    }
  }
};

// Reemplazar handler de planes para usar checkout real
subs.subscribe_demo = subs.subscribe;
subs.subscribe = async (tier) => {
  if(confirm(`Iniciar pago por ${tier.toUpperCase()}?\n\nSi MercadoPago no está configurado, se activará en modo DEMO.`)){
    return payments.checkout(tier);
  }
};

// ════════════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS — Web Push API + FCM ready
// ════════════════════════════════════════════════════════════════════════
const push = {
  async requestPermission(){
    if(!('Notification' in window)){ alert('Tu navegador no soporta notificaciones'); return false; }
    const p = await Notification.requestPermission();
    if(p === 'granted'){
      // Guardar suscripción para que el server pueda mandar push
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          // Cambiar por tu VAPID public key real
          applicationServerKey: this._urlBase64ToUint8Array('BNvCmKp0pVHN1BPiNN6Yk5sQz_DLAVT5jLVPmK4t-Q9XwYRsJYpJh3ZxKlVNgPNqVqLAA8UJxqzKvKGz0L0sR1A')
        }).catch(() => null);
        if(sub && sb()){
          await sb().from('push_subscriptions').upsert([{
            user_email: meEmail(),
            endpoint: sub.endpoint,
            sub_json: JSON.stringify(sub)
          }]);
        }
      } catch(e){ console.warn(e); }
      return true;
    }
    return false;
  },

  // Notificación local (sin server) — útil para tests / fallback
  showLocal(title, body, data={}){
    if(Notification.permission !== 'granted') return;
    new Notification(title, { body, icon:'/logo.png', badge:'/logo.png', data });
  },

  _urlBase64ToUint8Array(b64){
    const padding = '='.repeat((4 - b64.length % 4) % 4);
    const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++) out[i] = raw.charCodeAt(i);
    return out;
  }
};

// ════════════════════════════════════════════════════════════════════════
// DIRECTORY — añadir botón "Contratar" a cards de profesionales/complejos
// ════════════════════════════════════════════════════════════════════════
const directory = {
  injectHireButtons(){
    document.querySelectorAll('[data-provider-email]:not([data-hire-injected])').forEach(card => {
      const email = card.dataset.providerEmail;
      const type = card.dataset.providerType || 'profesional';
      const name = card.dataset.providerName || 'Proveedor';
      if(!email) return;
      card.dataset.hireInjected = 'true';
      const btn = document.createElement('button');
      btn.textContent = '📅 CONTRATAR';
      btn.style.cssText = 'background:#baff00;color:#000;border:none;padding:8px 14px;border-radius:8px;font-weight:900;font-size:11px;cursor:pointer;margin-top:8px;width:100%;';
      btn.onclick = (e) => {
        e.stopPropagation();
        bookings.openModal({ providerEmail: email, providerName: name, providerType: type, defaultLabel: type === 'arbitro' ? 'Arbitraje partido' : type === 'complejo' ? 'Reserva de cancha' : 'Servicio profesional' });
      };
      card.appendChild(btn);
    });
  }
};

// Auto-inject cada 2s para captar cards renderizados dinámicamente
setInterval(() => directory.injectHireButtons(), 2000);

// Auto-suscribirse a alertas de jugadores cuando hay user logueado
setTimeout(() => { if(meEmail()) playerNeeded.subscribe(); }, 3000);

// ════════════════════════════════════════════════════════════════════════
// EXPORT GLOBAL
// ════════════════════════════════════════════════════════════════════════
window.cancheroFeatures = {
  tags: tagSystem,
  captains: captainSystem,
  matchRequests,
  matchCreation,
  playerNeeded,
  bookings,
  subs,
  leagues,
  notifs,
  payments,
  push,
  directory,
  notify,
  attachTags: (sel) => {
    document.querySelectorAll(sel).forEach(el => tagSystem.attachAutocomplete(el));
  }
};

// Auto-attach a inputs de post creation cada 1s (catch dinámicos)
setInterval(() => {
  document.querySelectorAll('textarea[data-tags-enabled], .post-input, #post-text, #story-caption').forEach(el => {
    if(!el._tagAttached) tagSystem.attachAutocomplete(el);
  });
}, 1500);

console.log('✓ Canchero Features V2 cargado');
})();
