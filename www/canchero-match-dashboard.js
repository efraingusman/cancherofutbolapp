// canchero-match-dashboard.js — Dashboard completo de partido
// Tabs: RESUMEN | PLANTILLA | FORMACION | CHATS | COSTOS | REGLAS
// IMPORTANTE: inicializar el objeto ANTES del IIFE para que las asignaciones
// internas (window.MatchDashboard._confirm = ...) no fallen con "undefined".
window.MatchDashboard = window.MatchDashboard || {};
(function() {
    var _currentMatchId = null;
    var _currentMatch = null;
    var _players = [];
    var _miniMap = null;

    var FORMATIONS = {
        '4-3-3': { pos: [
            {x:50,y:90,lbl:'POR'},{x:15,y:70,lbl:'LD'},{x:37,y:70,lbl:'DC'},{x:63,y:70,lbl:'DC'},{x:85,y:70,lbl:'LI'},
            {x:25,y:47,lbl:'MC'},{x:50,y:45,lbl:'MC'},{x:75,y:47,lbl:'MC'},
            {x:15,y:22,lbl:'EX'},{x:50,y:18,lbl:'DC'},{x:85,y:22,lbl:'EX'}
        ]},
        '4-4-2': { pos: [
            {x:50,y:90,lbl:'POR'},{x:15,y:70,lbl:'LD'},{x:37,y:70,lbl:'DC'},{x:63,y:70,lbl:'DC'},{x:85,y:70,lbl:'LI'},
            {x:15,y:47,lbl:'MC'},{x:37,y:47,lbl:'MC'},{x:63,y:47,lbl:'MC'},{x:85,y:47,lbl:'MC'},
            {x:35,y:20,lbl:'DC'},{x:65,y:20,lbl:'DC'}
        ]},
        '3-5-2': { pos: [
            {x:50,y:90,lbl:'POR'},{x:22,y:70,lbl:'DC'},{x:50,y:70,lbl:'DC'},{x:78,y:70,lbl:'DC'},
            {x:10,y:50,lbl:'CL'},{x:28,y:47,lbl:'MC'},{x:50,y:45,lbl:'MC'},{x:72,y:47,lbl:'MC'},{x:90,y:50,lbl:'CR'},
            {x:35,y:20,lbl:'DC'},{x:65,y:20,lbl:'DC'}
        ]},
        '5v5': { pos: [
            {x:50,y:90,lbl:'POR'},{x:22,y:60,lbl:'DF'},{x:78,y:60,lbl:'DF'},
            {x:22,y:30,lbl:'MC'},{x:78,y:30,lbl:'MC'},{x:50,y:15,lbl:'DC'}
        ]},
        '7v7': { pos: [
            {x:50,y:90,lbl:'POR'},{x:22,y:72,lbl:'LD'},{x:50,y:70,lbl:'DC'},{x:78,y:72,lbl:'LI'},
            {x:22,y:45,lbl:'MC'},{x:78,y:45,lbl:'MC'},
            {x:35,y:20,lbl:'DC'},{x:65,y:20,lbl:'DC'}
        ]}
    };

    function _getSb() { return window._sb; }
    function _getEmail() { return window.userData && window.userData.email; }

    async function open(matchId) {
        _currentMatchId = matchId;
        var existing = document.getElementById('match-dashboard-overlay');
        if (existing) existing.remove();
        if (_miniMap) { try { _miniMap.remove(); } catch(e){} _miniMap = null; }

        // Preservar visibilidad del header global (logo + campana + ajustes):
        // el panel del partido SIEMPRE arranca debajo del header
        var _globalHeader = document.getElementById('main-nav') || document.querySelector('.navbar, .main-header, #main-header, .top-bar, .app-header');
        if (_globalHeader && getComputedStyle(_globalHeader).display === 'none') {
            _globalHeader.style.display = 'flex';
        }
        var headerH = (typeof window._navH === 'function') ? window._navH() : (_globalHeader ? (_globalHeader.offsetHeight || 60) : 0);

        var overlay = document.createElement('div');
        overlay.id = 'match-dashboard-overlay';
        overlay.style.cssText = 'position:fixed;left:0;right:0;bottom:0;top:var(--nav-h,' + headerH + 'px);z-index:899;background:#0a0a0a;overflow-y:auto;display:flex;flex-direction:column;overscroll-behavior-y:contain;';
        overlay.innerHTML = '<div id="mdb-header" style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid #1e1e1e;position:sticky;top:0;background:#0a0a0a;z-index:10;">' +
            '<button onclick="MatchDashboard.close()" style="background:rgba(255,255,255,0.06);border:1px solid #222;color:#fff;cursor:pointer;font-size:18px;padding:10px 14px;line-height:1;border-radius:12px;display:flex;align-items:center;gap:6px;font-weight:700;font-family:inherit;min-height:44px;"><i class="bx bx-arrow-back"></i> <span style="font-size:12px;letter-spacing:1px;">VOLVER</span></button>' +
            '<div id="mdb-title" style="font-weight:900;font-size:15px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Cargando partido...</div>' +
        '</div>' +
        '<div id="mdb-tabs" style="display:flex;overflow-x:auto;border-bottom:1px solid #1e1e1e;scrollbar-width:none;-webkit-overflow-scrolling:touch;position:sticky;top:62px;background:#0a0a0a;z-index:9;" ontouchstart="window._mdbTouchX=event.touches[0].clientX" ontouchend="window._mdbSwipe(event)">' +
            _tabBtn('cancha','<i class=\'bx bx-map-alt\'></i>','Cancha',true) +
            _tabBtn('resumen','<i class=\'bx bx-info-circle\'></i>','RESUMEN',true) +
            _tabBtn('chats','<i class=\'bx bx-chat\'></i>','CHATS') +
            _tabBtn('momentos','<i class=\'bx bx-camera\'></i>','Momentos') +
            _tabBtn('resultado','<i class=\'bx bx-trophy\'></i>','Resultado') +
            _tabBtn('costos','<i class=\'bx bx-dollar\'></i>','COSTOS') +
            _tabBtn('reglas','<i class=\'bx bx-book\'></i>','REGLAS') +
        '</div>' +
        '<div id="mdb-content" style="flex:1;padding:16px 16px calc(170px + env(safe-area-inset-bottom));max-width:600px;margin:0 auto;width:100%;box-sizing:border-box;">' +
            '<div style="text-align:center;padding:40px;color:#555;"><i class="bx bx-loader-alt bx-spin" style="font-size:30px;"></i></div>' +
        '</div>';
        document.body.appendChild(overlay);

        // Cargar datos
        var sb = _getSb();
        if (!sb) { _setContent('<div style="color:#f44;padding:20px;">Sin conexion.</div>'); return; }
        var mRes = await sb.from('matches').select('*').eq('id', matchId).single();
        if (!mRes.data) { _setContent('<div style="color:#f44;padding:20px;">Partido no encontrado.</div>'); return; }
        _currentMatch = mRes.data;
        // Si faltan los escudos, intentar cargarlos desde los clubes del creador/capitanes
        try {
            if (!_currentMatch.home_club_logo || !_currentMatch.away_club_logo) {
                var emails = [_currentMatch.created_by, _currentMatch.captain_home_email, _currentMatch.captain_away_email].filter(Boolean);
                if (emails.length) {
                    var clubsRes = await sb.from('clubs').select('name,logo,logo_url,owner_email').in('owner_email', emails);
                    var clubs = clubsRes.data || [];
                    if (clubs.length) {
                        if (!_currentMatch.home_club_logo) {
                            var hc = clubs.find(function(c){ return c.owner_email === (_currentMatch.captain_home_email || _currentMatch.created_by); }) || clubs[0];
                            if (hc) { _currentMatch.home_club_logo = hc.logo_url || hc.logo; if (!_currentMatch.home_club_name) _currentMatch.home_club_name = hc.name; }
                        }
                        if (!_currentMatch.away_club_logo && clubs.length > 1) {
                            var ac = clubs.find(function(c){ return c.owner_email === _currentMatch.captain_away_email; });
                            if (ac) { _currentMatch.away_club_logo = ac.logo_url || ac.logo; if (!_currentMatch.away_club_name) _currentMatch.away_club_name = ac.name; }
                        }
                    }
                }
            }
        } catch(e) {}
        window._currentMdbMatch = _currentMatch;
        document.getElementById('mdb-title').textContent = _currentMatch.name || 'Partido';
        var pRes = await sb.from('match_players').select('*').eq('match_id', matchId);
        _players = pRes.data || [];
        window._currentMdbPlayers = _players;
        _renderHeaderBadges();
        switchTab('cancha');
    }

    function _tabBtn(id, icon, label, active) {
        return '<button class="mdb-tab' + (active?' active':'') + '" onclick="MatchDashboard.switchTab(' + JSON.stringify(id) + ')" data-tab="' + id + '" ' +
            'style="flex-shrink:0;padding:8px 14px 6px;background:none;border:none;border-bottom:2px solid ' + (active?'var(--accent)':'transparent') + ';' +
            'color:' + (active?'var(--accent)':'#555') + ';font-weight:700;font-size:9px;letter-spacing:0.5px;cursor:pointer;transition:all .2s;font-family:Outfit,sans-serif;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:52px;">' +
            '<span title="' + label + '" style="font-size:20px;line-height:1;">' + icon + '</span></button>';
    }

    // Swipe para cambiar tabs del partido
    window._mdbSwipe = function(e) {
        var dx = e.changedTouches[0].clientX - (window._mdbTouchX || 0);
        if (Math.abs(dx) < 40) return;
        var tabs = ['cancha','resumen','chats','momentos','resultado','costos','reglas'];
        var active = document.querySelector('.mdb-tab.active, .mdb-tab[style*="var(--accent)"]');
        var btns = Array.from(document.querySelectorAll('.mdb-tab'));
        var idx = active ? btns.indexOf(active) : 0;
        var next = dx < 0 ? Math.min(idx+1, tabs.length-1) : Math.max(idx-1, 0);
        if (next !== idx) window.MatchDashboard.switchTab(tabs[next]);
    };

    function _setContent(html) {
        var el = document.getElementById('mdb-content');
        if (el) el.innerHTML = html;
    }

    function switchTab(tab) {
        // Update tab styles
        document.querySelectorAll('.mdb-tab').forEach(function(b) {
            var t = b.getAttribute('data-tab');
            b.style.borderBottomColor = t === tab ? 'var(--accent)' : 'transparent';
            b.style.color = t === tab ? 'var(--accent)' : '#555';
        });
        // Render defensivo: si una pestaña falla, no rompe la navegación
        try {
            if (tab === 'cancha')    _renderCancha();
            else if (tab === 'resumen')   _renderResumen();
            else if (tab === 'chats')     _renderChatsV2();
            else if (tab === 'momentos')  _renderMomentosTab();
            else if (tab === 'resultado') _renderResultado();
            else if (tab === 'costos')    _renderCostos();
            else if (tab === 'reglas')    _renderReglas();
        } catch(e) {
            console.error('[MatchDashboard] error en tab', tab, e);
            _setContent('<div style="padding:30px;text-align:center;color:#f44;font-size:13px;">No se pudo cargar esta sección.<br><span style="color:#888;font-size:11px;">' + (e.message||'') + '</span></div>');
        }
    }
    window.MatchDashboard.switchTab = switchTab;


    /* ======== V2: badges, cancha, chat, momentos, resultado ======== */
    function _phase(m){ return (window.CancheroPitch && CancheroPitch.matchPhase(m)) || 'proximo'; }
    function _isCaptain(){ var e=_getEmail(); if(!e||!_currentMatch) return false;
        if (_currentMatch.captain_home_email===e || _currentMatch.captain_away_email===e) return true;
        return (_players||[]).some(function(p){ return p.player_email===e && p.is_captain; }); }
    function _amPlayer(){ var e=_getEmail(); return (_players||[]).some(function(p){ return p.player_email===e && ['confirmado','accepted','aceptado','titular'].includes(p.status||'confirmado'); }); }

    function _renderHeaderBadges(){
        var t = document.getElementById('mdb-title');
        if (!t || !_currentMatch) return;
        var m = _currentMatch;
        var ph = _phase(m);
        var phTxt = { proximo:'PRÓXIMO', en_juego:'EN JUEGO', jugado:'JUGADO' }[ph];
        var phCol = { proximo:'#64b4ff', en_juego:'#00e676', jugado:'#aaa' }[ph];
        var openTxt = (m.is_open || m.match_type==='open' || m.modality==='abierto') ? 'ABIERTO' : 'CERRADO';
        t.innerHTML = '<div style="display:flex;align-items:center;gap:8px;min-width:0;">'+
            '<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+(m.name||m.title||'Partido')+'</span>'+
            '<span style="flex-shrink:0;font-size:9px;font-weight:900;letter-spacing:1px;color:'+phCol+';background:'+phCol+'22;border:1px solid '+phCol+'55;border-radius:10px;padding:3px 8px;">'+phTxt+'</span>'+
            '<span style="flex-shrink:0;font-size:9px;font-weight:900;letter-spacing:1px;color:var(--accent);background:rgba(186,255,0,0.08);border:1px solid rgba(186,255,0,0.3);border-radius:10px;padding:3px 8px;">'+openTxt+'</span></div>';
    }

    function _renderCancha(){
        var m=_currentMatch; if(!m) return;
        var joinable = !_amPlayer();
        var html = '<div data-pitch data-team="home" id="mdb-pitch"></div>';
        var mins = m.scheduled_at ? Math.round((new Date(m.scheduled_at)-Date.now())/60000) : 9999;
        if (_amPlayer()) html += '<div style="text-align:center;margin-top:14px;color:var(--accent);font-weight:800;font-size:13px;">✓ Ya sos parte de este partido</div>';
        else if (mins < 20) html += '<div style="text-align:center;margin-top:14px;color:#888;font-weight:700;font-size:12px;">⏱ Solicitudes cerradas (20 min antes)</div>';
        else {
            html += '<button onclick="MatchDashboard.requestJoin()" style="width:100%;margin-top:14px;background:var(--accent);color:#000;border:none;border-radius:14px;padding:14px;font-weight:900;font-size:14px;cursor:pointer;font-family:inherit;"><i class=\'bx bx-user-plus\'></i> ENVIAR SOLICITUD PARA JUGAR</button>';
            html += '<button onclick="MatchDashboard.requestClubJoin()" style="width:100%;margin-top:8px;background:rgba(100,180,255,0.07);color:#64b4ff;border:1px solid rgba(100,180,255,0.35);border-radius:14px;padding:12px;font-weight:900;font-size:13px;cursor:pointer;font-family:inherit;"><i class=\'bx bxs-shield\'></i> POSTULAR MI CLUB COMPLETO</button>';
        }
        var e=_getEmail();
        var myTeamNoCap = null;
        ['home','away'].forEach(function(tm){
            var capEmail = tm==='home' ? m.captain_home_email : m.captain_away_email;
            var inTeam = (_players||[]).some(function(p){ return p.player_email===e && (p.team||'home')===tm; });
            if (inTeam && !capEmail && !(_players||[]).some(function(p){return (p.team||'home')===tm && p.is_captain;})) myTeamNoCap = tm;
        });
        if (myTeamNoCap) html += '<button onclick="MatchDashboard.takeCaptain(\''+myTeamNoCap+'\')" style="width:100%;margin-top:10px;background:rgba(255,215,0,0.08);color:#FFD700;border:1px solid rgba(255,215,0,0.4);border-radius:14px;padding:12px;font-weight:900;font-size:13px;cursor:pointer;font-family:inherit;">👑 TOMAR LA CINTA DE CAPITÁN</button>';
        if (_isCaptain() && (_phase(m)==='proximo'||_phase(m)==='en_juego')) html += '<button onclick="MatchDashboard.openUrgentModal()" style="width:100%;margin-top:10px;background:linear-gradient(135deg,#ff3b3b,#c00);color:#fff;border:none;border-radius:14px;padding:14px;font-weight:900;font-size:14px;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 6px 18px rgba(255,59,59,0.25);"><i class="bx bx-user-plus" style="font-size:20px;"></i> FALTAN JUGADORES — PUBLICAR AVISO</button>';
        _setContent(html);
        var pe = document.getElementById('mdb-pitch');
        if (pe && window.CancheroPitch) CancheroPitch.render(pe, m, _players, {
            canJoin: joinable,
            canManage: _isCaptain(),
            onJoin: function(team, slotKey){ MatchDashboard.requestJoin(team, slotKey); },
            onTapPlayer: function(p){ CancheroPitch.changePosition(p); }
        });
    }

    window.MatchDashboard.requestJoin = async function(team, slotKey){
        var sbc=_getSb(), e=_getEmail(); var m=_currentMatch;
        if(!sbc||!e||!m){ if(window.showToast)showToast('Iniciá sesión.','warning'); return; }
        if (m.scheduled_at && (new Date(m.scheduled_at)-Date.now()) < 20*60000){ if(window.showToast)showToast('Las solicitudes cierran 20 minutos antes. ⏱','warning'); return; }
        if (!team){
            team = confirm('¿Querés jugar en el equipo LOCAL? (Cancelar = VISITANTE)') ? 'home' : 'away';
        }
        // Cupo exacto por formato: si el equipo está completo, no dejar unirse
        try {
            if (window.CancheroFormations){
                var v = CancheroFormations.validate(CancheroFormations.formatOf ? CancheroFormations.formatOf(m) : (m.format||m.match_type), (_players||[]).filter(function(p){ return (p.team||'home')===team; }));
                if (v.full){ if(window.showToast)showToast('Ese equipo ya está completo ('+v.capacity+' titulares + '+v.maxSubs+' suplentes).','warning'); return; }
                if (v.startersFull && slotKey!=='SUP'){ if(window.showToast)showToast('Titulares completos: podés entrar como SUPLENTE.','info'); slotKey='SUP'; }
            }
        } catch(ev){}
        // Posición por defecto = la posición NATURAL del jugador (no 'DEL' fijo)
        var natural = (window.userData && (window.userData.pos || window.userData.position)) || null;
        var posFinal = slotKey && slotKey!=='SUP' ? slotKey : (natural || 'MED');
        try {
            await sbc.from('match_requests').upsert([{ match_id:m.id, user_email:e, user_name:(window.userData&&window.userData.name)||e, team:team, position_slot:slotKey||null, status:'pending', type:'player' }], { onConflict:'match_id,user_email' });
            try { await sbc.from('match_players').insert({ match_id:m.id, player_email:e, player_name:(window.userData&&window.userData.name)||e, team:team, position_slot:slotKey||null, position:posFinal, is_sub: slotKey==='SUP', status:'pendiente' }); } catch(err){}
            if (m.created_by && window.CGCore) CGCore.notify(m.created_by, 'dm', '⚽ '+((window.userData&&window.userData.name)||e)+' quiere jugar en tu partido "'+(m.name||'')+'" ('+(team==='home'?'local':'visitante')+(slotKey?(', '+slotKey):'')+').');
            if(window.showToast)showToast('¡Solicitud enviada! 📨','success');
        } catch(err){ if(window.showToast)showToast('No se pudo enviar.','error'); }
    };

    // Paso 6 — Postular un CLUB ENTERO a un partido abierto
    window.MatchDashboard.requestClubJoin = async function(clubId){
        var sbc=_getSb(), e=_getEmail(); var m=_currentMatch;
        if(!sbc||!e||!m){ if(window.showToast)showToast('Iniciá sesión.','warning'); return; }
        if (m.scheduled_at && (new Date(m.scheduled_at)-Date.now()) < 20*60000){ if(window.showToast)showToast('Las solicitudes cierran 20 minutos antes. ⏱','warning'); return; }
        try {
            // Clubes propios (dueño o capitán)
            var r1 = await sbc.from('clubs').select('id,name,logo_url,logo').eq('owner_email', e).limit(10);
            var clubs = (r1 && r1.data) || [];
            if (!clubs.length){
                var r2 = await sbc.from('club_members').select('club_id').eq('player_email', e).in('role', ['captain','capitan','dt','owner']).limit(10);
                var ids = ((r2&&r2.data)||[]).map(function(x){return x.club_id;});
                if (ids.length){ var r3 = await sbc.from('clubs').select('id,name,logo_url,logo').in('id', ids); clubs = (r3&&r3.data)||[]; }
            }
            if (!clubs.length){ if(window.showToast)showToast('No tenés un club propio para postular. Crealo desde Equipos.','info'); return; }
            var club = clubId ? clubs.find(function(c){return String(c.id)===String(clubId);}) : null;
            if (!club && clubs.length === 1) club = clubs[0];
            if (!club){
                // Chooser simple si hay más de un club
                var mm = document.createElement('div'); mm.id='club-join-chooser';
                mm.style.cssText='position:fixed;inset:0;z-index:10500;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:20px;';
                mm.innerHTML = '<div style="background:#111;border:1px solid #222;border-radius:18px;width:100%;max-width:320px;padding:18px;">'
                    + '<div style="font-weight:900;font-size:14px;margin-bottom:12px;color:#fff;">¿Con qué club querés postularte?</div>'
                    + clubs.map(function(c){ return '<div class="menu-item" style="padding:12px;border-radius:12px;font-weight:700;cursor:pointer;" onclick="document.getElementById(\'club-join-chooser\').remove();MatchDashboard.requestClubJoin(\''+c.id+'\')">🛡 '+(c.name||'Club')+'</div>'; }).join('')
                    + '<button onclick="document.getElementById(\'club-join-chooser\').remove()" style="width:100%;margin-top:10px;background:transparent;border:1px solid #333;color:#888;border-radius:10px;padding:9px;cursor:pointer;">Cancelar</button></div>';
                mm.onclick=function(ev){ if(ev.target===mm) mm.remove(); };
                document.body.appendChild(mm);
                return;
            }
            // Lado libre: si ya hay club local, va de visitante (y viceversa)
            var team = m.away_club_id || m.away_club_name ? (m.home_club_id || m.home_club_name ? null : 'home') : 'away';
            if (!team){ if(window.showToast)showToast('El partido ya tiene los dos equipos definidos.','warning'); return; }
            await sbc.from('match_requests').upsert([{ match_id:m.id, user_email:e, user_name:(window.userData&&window.userData.name)||e, team:team, status:'pending', type:'club', club_id:club.id, club_name:club.name }], { onConflict:'match_id,user_email' });
            if (m.created_by && window.CGCore) CGCore.notify(m.created_by, 'dm', '🛡 El club "'+club.name+'" quiere jugar tu partido "'+(m.name||'')+'" completo ('+(team==='home'?'local':'visitante')+').');
            if(window.showToast)showToast('¡Solicitud de club enviada! 🛡','success');
        } catch(err){ if(window.showToast)showToast('No se pudo enviar la solicitud de club.','error'); }
    };

    window.MatchDashboard.takeCaptain = async function(team){
        var sbc=_getSb(), e=_getEmail(); var m=_currentMatch; if(!sbc||!e||!m) return;
        try {
            var upd={}; upd[team==='home'?'captain_home_email':'captain_away_email']=e;
            await sbc.from('matches').update(upd).eq('id', m.id);
            await sbc.from('match_players').update({ is_captain:true }).eq('match_id', m.id).eq('player_email', e);
            _currentMatch[team==='home'?'captain_home_email':'captain_away_email']=e;
            (_players||[]).forEach(function(p){ if(p.player_email===e) p.is_captain=true; });
            if(window.showToast)showToast('¡Sos el capitán! 👑','success');
            _renderCancha();
        } catch(err){}
    };

    // Carga las encuestas creadas DENTRO de este partido (context='match'). Antes
    // se publicaban al feed; ahora viven solo acá.
    window.MatchDashboard._loadMatchPolls = async function(matchId){
        var box = document.getElementById('mdb-polls-block'); if(!box) return;
        var sbc = _getSb(); if(!sbc) { box.innerHTML=''; return; }
        try {
            var r = await sbc.from('polls').select('*').eq('context','match').eq('context_id', matchId).order('created_at',{ascending:false}).limit(10);
            var polls = (r && r.data) || [];
            if (!polls.length) {
                box.innerHTML = '<div style="background:rgba(100,180,255,0.06);border:1px dashed rgba(100,180,255,0.25);border-radius:14px;padding:14px;text-align:center;color:#7fb3ff;font-size:12px;">' +
                  'No hay encuestas en este partido. ' +
                  '<button onclick="window.CancheroPolls&&CancheroPolls.openCreator(\'match\',\''+matchId+'\')" style="margin-left:6px;background:transparent;border:none;color:var(--accent);font-weight:800;cursor:pointer;text-decoration:underline;">Crear una</button>' +
                '</div>'; return;
            }
            var header = '<div style="font-size:11px;font-weight:900;color:#7fb3ff;letter-spacing:1px;margin-bottom:8px;"><i class="bx bx-poll"></i> ENCUESTAS DEL PARTIDO ('+polls.length+')</div>';
            var cards = polls.map(function(p){
                if (window.CancheroPolls && window.CancheroPolls.renderPollCard) {
                    try { return window.CancheroPolls.renderPollCard(p, null); } catch(e){}
                }
                var opts = (p.options||[]).map(function(o,i){ return '<div style="padding:8px 10px;border:1px solid #2a2a2a;border-radius:10px;margin-bottom:6px;font-size:12px;color:#ccc;">'+ (o.text||o) +'</div>'; }).join('');
                return '<div style="background:#0f110f;border:1px solid #1f2a1f;border-radius:14px;padding:12px;margin-bottom:10px;"><div style="font-size:13px;font-weight:800;color:#fff;margin-bottom:8px;">'+ (p.title||'Encuesta') +'</div>'+opts+'</div>';
            }).join('');
            box.innerHTML = header + cards;
        } catch(e){ box.innerHTML=''; }
    };

    // Modal claro con detalles (cantidad + posición + urgencia + mensaje)
    window.MatchDashboard.openUrgentModal = function(){
        var m = _currentMatch; if(!m) return;
        var ex = document.getElementById('urgent-need-modal'); if (ex) ex.remove();
        var modal = document.createElement('div'); modal.id='urgent-need-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:10010;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:16px;';
        modal.innerHTML =
            '<div style="background:#111;border:1px solid #2a2a2a;border-radius:18px;width:100%;max-width:420px;padding:22px;max-height:90vh;overflow-y:auto;">' +
              '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">' +
                '<i class="bx bx-user-plus" style="font-size:28px;color:#ff5555;"></i>' +
                '<div><div style="font-size:17px;font-weight:900;">Faltan jugadores</div><div style="font-size:12px;color:#888;">Publicá un aviso al feed y a Equipos Buscan</div></div>' +
              '</div>' +
              '<label style="font-size:11px;color:#888;font-weight:700;display:block;margin-bottom:4px;">¿CUÁNTOS FALTAN?</label>' +
              '<div style="display:flex;gap:6px;margin-bottom:14px;">' +
                [1,2,3,4,5].map(function(n){return '<button onclick="window._un_count='+n+';this.parentElement.querySelectorAll(\'button\').forEach(function(b){b.style.background=\'#1a1a1a\';b.style.color=\'#fff\';});this.style.background=\'var(--accent)\';this.style.color=\'#000\';" style="flex:1;background:'+(n===1?'var(--accent)':'#1a1a1a')+';color:'+(n===1?'#000':'#fff')+';border:1px solid #333;border-radius:10px;padding:10px;font-weight:900;cursor:pointer;">'+n+'</button>';}).join('') +
              '</div>' +
              '<label style="font-size:11px;color:#888;font-weight:700;display:block;margin-bottom:4px;">POSICIÓN PREFERIDA (opcional)</label>' +
              '<select id="un-pos" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px;margin-bottom:14px;font-size:13px;">' +
                '<option value="">Cualquiera</option><option value="ARQ">Arquero</option><option value="DEF">Defensor</option><option value="MED">Mediocampista</option><option value="DEL">Delantero</option>' +
              '</select>' +
              '<label style="font-size:11px;color:#888;font-weight:700;display:block;margin-bottom:4px;">URGENCIA</label>' +
              '<div style="display:flex;gap:6px;margin-bottom:14px;">' +
                '<button onclick="window._un_urg=\'alta\';this.parentElement.querySelectorAll(\'button\').forEach(function(b){b.style.background=\'#1a1a1a\';b.style.color=\'#aaa\';});this.style.background=\'#ff3b3b\';this.style.color=\'#fff\';" style="flex:1;background:#ff3b3b;color:#fff;border:1px solid #333;border-radius:10px;padding:10px;font-weight:800;cursor:pointer;">🚨 URGENTE</button>' +
                '<button onclick="window._un_urg=\'media\';this.parentElement.querySelectorAll(\'button\').forEach(function(b){b.style.background=\'#1a1a1a\';b.style.color=\'#aaa\';});this.style.background=\'#ffaa00\';this.style.color=\'#000\';" style="flex:1;background:#1a1a1a;color:#aaa;border:1px solid #333;border-radius:10px;padding:10px;font-weight:800;cursor:pointer;">⚠ MEDIA</button>' +
              '</div>' +
              '<label style="font-size:11px;color:#888;font-weight:700;display:block;margin-bottom:4px;">MENSAJE (opcional)</label>' +
              '<textarea id="un-msg" rows="2" placeholder="Ej: Sumate, jugamos a las 21h…" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px;margin-bottom:14px;font-size:13px;resize:vertical;"></textarea>' +
              '<div style="display:flex;gap:8px;">' +
                '<button onclick="MatchDashboard.publishUrgent()" style="flex:2;background:linear-gradient(135deg,#ff3b3b,#c00);color:#fff;border:none;border-radius:12px;padding:12px;font-weight:900;cursor:pointer;">PUBLICAR AVISO</button>' +
                '<button onclick="document.getElementById(\'urgent-need-modal\').remove()" style="flex:1;background:#1a1a1a;color:#888;border:1px solid #333;border-radius:12px;padding:12px;font-weight:700;cursor:pointer;">Cancelar</button>' +
              '</div>' +
            '</div>';
        modal.onclick = function(e){ if(e.target===modal) modal.remove(); };
        window._un_count = 1; window._un_urg = 'alta';
        document.body.appendChild(modal);
    };
    // Construye el contenido del aviso "faltan jugadores" (formato rico para feed/chat/fuera)
    function _buildNeedText(m, e, count, urg, pos, msg){
        var head = '⚡ FALTAN ' + count + ' JUGADOR' + (count!==1?'ES':'') + ' · ' + (m.name||'PARTIDO').toUpperCase();
        var bits = [];
        if (pos) bits.push('Posición: ' + pos);
        if (m.scheduled_at) bits.push(new Date(m.scheduled_at).toLocaleString('es-UY',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}));
        if (m.venue) bits.push(m.venue);
        if (m.city) bits.push(m.city);
        if (urg==='alta') bits.push('URGENTE');
        var link = 'https://canchero-app.vercel.app/#partido/' + m.id;
        return head + '\n\n' + bits.join(' · ') + (msg?('\n\n' + msg):'') + '\n\n→ Sumate al partido: ' + link + '\n\n#FaltanJugadores #Canchero';
    }

    window.MatchDashboard.publishUrgent = async function(){
        var sbc=_getSb(), e=_getEmail(); var m=_currentMatch; if(!sbc||!e||!m) return;
        var count = window._un_count || 1;
        var urg = window._un_urg || 'alta';
        var pos = (document.getElementById('un-pos')||{}).value || '';
        var msg = ((document.getElementById('un-msg')||{}).value || '').trim();
        try {
            await sbc.from('matches').update({ urgent_need:true, need_player:true, missing_count:count }).eq('id', m.id);
            try { await sbc.from('squad_requests').insert({ club_name:(m.home_club_name||m.name||'Partido'), match_id:m.id, captain_email:e, city:m.city||null, country:m.country||null, missing_count:count, status:'open', urgency:urg, position:pos||null }); } catch(e2){}
        } catch(err){ if(window.showToast)showToast('No se pudo actualizar el partido.','error'); return; }
        document.getElementById('urgent-need-modal').remove();
        // Modal "Dónde compartir": feed / WhatsApp/etc. (afuera) / cerrar
        window._needCtx = { m: m, e: e, count: count, urg: urg, pos: pos, msg: msg };
        var pick = document.createElement('div');
        pick.style.cssText = 'position:fixed;inset:0;z-index:30100;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;padding:18px;';
        pick.innerHTML = '<div style="background:#0d100d;border:1px solid #1f2a14;border-radius:18px;padding:18px;max-width:400px;width:100%;">'+
          '<div style="font-size:13px;font-weight:900;color:var(--accent);margin-bottom:6px;text-align:center;"><i class="bx bx-user-plus"></i> ¿DÓNDE COMPARTIR EL AVISO?</div>'+
          '<div style="font-size:11px;color:#888;text-align:center;margin-bottom:14px;">Faltan ' + count + ' jugador' + (count!==1?'es':'') + (pos?(' · ' + pos):'') + '</div>'+
          '<div style="display:flex;flex-direction:column;gap:8px;">'+
            '<button onclick="MatchDashboard._needShareFeed();this.closest(\'div[style*=fixed]\').remove();" style="background:var(--accent);color:#000;border:none;border-radius:12px;padding:12px;font-weight:900;font-size:13px;cursor:pointer;"><i class="bx bx-broadcast"></i> Publicar al feed de Canchero</button>'+
            '<button onclick="MatchDashboard._needShareExternal();this.closest(\'div[style*=fixed]\').remove();" style="background:rgba(37,211,102,0.10);color:#25d366;border:1px solid rgba(37,211,102,0.3);border-radius:12px;padding:12px;font-weight:900;font-size:13px;cursor:pointer;"><i class="bx bxl-whatsapp"></i> Compartir fuera (WhatsApp/X/IG…)</button>'+
            '<button onclick="MatchDashboard._needShareChat();this.closest(\'div[style*=fixed]\').remove();" style="background:rgba(100,180,255,0.10);color:#64b4ff;border:1px solid rgba(100,180,255,0.3);border-radius:12px;padding:12px;font-weight:900;font-size:13px;cursor:pointer;"><i class="bx bx-chat"></i> Copiar para chat</button>'+
            '<button onclick="this.closest(\'div[style*=fixed]\').remove()" style="background:transparent;color:#888;border:none;padding:8px;font-size:12px;cursor:pointer;">Cerrar</button>'+
          '</div></div>';
        document.body.appendChild(pick);
    };
    window.MatchDashboard._needShareFeed = async function(){
        var c = window._needCtx; if (!c) return;
        var sbc = _getSb(); if (!sbc) return;
        var txt = _buildNeedText(c.m, c.e, c.count, c.urg, c.pos, c.msg);
        try {
            await sbc.from('posts').insert({
                user_email: c.e, user_name: (window.userData&&window.userData.name)||c.e,
                user_role: (window.userData&&window.userData.role)||'jugador',
                content: txt, media_type:'text', likes_count:0,
                tags:['faltan_jugadores','partido'],
                meta:{ match_id: c.m.id, missing_count: c.count, position: c.pos, urgency: c.urg, venue: c.m.venue, scheduled_at: c.m.scheduled_at, city: c.m.city },
                expires_at: new Date(Date.now()+12*3600000).toISOString()
            });
            if (window.showToast) showToast('Aviso publicado al feed ✓','success');
        } catch(err){ if(window.showToast) showToast('No se pudo publicar.','error'); }
    };
    window.MatchDashboard._needShareExternal = async function(){
        var c = window._needCtx; if (!c) return;
        var txt = _buildNeedText(c.m, c.e, c.count, c.urg, c.pos, c.msg);
        var url = 'https://canchero-app.vercel.app/#partido/' + c.m.id;
        try { if (navigator.share){ await navigator.share({ title:'Faltan jugadores', text:txt, url:url }); return; } } catch(e){}
        try { await navigator.clipboard.writeText(txt); if(window.showToast) showToast('Aviso copiado ✓','success'); } catch(e){ alert(txt); }
    };
    window.MatchDashboard._needShareChat = async function(){
        var c = window._needCtx; if (!c) return;
        var txt = _buildNeedText(c.m, c.e, c.count, c.urg, c.pos, c.msg);
        try { await navigator.clipboard.writeText(txt); if(window.showToast) showToast('Texto copiado — pegalo en cualquier chat de Canchero','success'); } catch(e){ alert(txt); }
    };
    // Alias retrocompatible (otras vistas pueden llamarlo)
    window.MatchDashboard.urgentNeed = function(){ window.MatchDashboard.openUrgentModal(); };

    function _renderChatsV2(){
        var m=_currentMatch; if(!m) return;
        _setContent('<div id="mdb-chat-list" style="min-height:200px;max-height:46vh;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-bottom:8px;"></div>'+
          '<div style="display:flex;gap:8px;align-items:center;position:sticky;bottom:0;background:#0a0a0a;padding:8px 0;">'+
          '<input id="mdb-chat-input" placeholder="Mensaje al partido..." style="flex:1;background:#161616;border:1px solid #2a2a2a;border-radius:22px;color:#fff;padding:11px 16px;font-size:13px;outline:none;" onkeydown="if(event.key===\'Enter\')MatchDashboard.sendChat()">'+
          '<button onclick="MatchDashboard.sendChat()" style="background:var(--accent);color:#000;border:none;border-radius:50%;width:42px;height:42px;cursor:pointer;flex-shrink:0;"><i class=\'bx bx-send\'></i></button></div>');
        MatchDashboard.loadChat();
    }
    window.MatchDashboard.loadChat = async function(){
        var sbc=_getSb(); var m=_currentMatch; var box=document.getElementById('mdb-chat-list');
        if(!sbc||!m||!box) return;
        try {
            var r = await sbc.from('match_chat').select('*').eq('match_id', m.id).order('created_at',{ascending:true}).limit(100);
            if (r.error) { box.innerHTML='<div style="color:#f66;padding:16px;font-size:12px;">Chat no disponible: '+(r.error.message||'error')+'<br><span style="color:#888;font-size:11px;">Falta crear la tabla match_chat en Supabase.</span></div>'; return; }
            var msgs=r.data||[]; var e=_getEmail();
            box.innerHTML = msgs.length ? msgs.map(function(c){
                var mine=c.user_email===e;
                return '<div style="align-self:'+(mine?'flex-end':'flex-start')+';max-width:80%;background:'+(mine?'rgba(186,255,0,0.12)':'#161616')+';border:1px solid '+(mine?'rgba(186,255,0,0.25)':'#242424')+';border-radius:14px;padding:8px 12px;">'+
                    (mine?'':'<div style="font-size:10px;color:var(--accent);font-weight:800;">'+(c.user_name||'')+'</div>')+
                    '<div style="font-size:13px;color:#eee;word-break:break-word;">'+String(c.content||'').replace(/</g,'&lt;')+'</div></div>';
            }).join('') : '<div style="text-align:center;color:#555;font-size:12px;padding:30px;">Sin mensajes. ¡Rompé el hielo!</div>';
            box.scrollTop = box.scrollHeight;
        } catch(err){ box.innerHTML='<div style="color:#f66;padding:16px;">No se pudo cargar el chat.</div>'; }
    };
    window.MatchDashboard.sendChat = async function(){
        var sbc=_getSb(), e=_getEmail(); var m=_currentMatch;
        var inp=document.getElementById('mdb-chat-input'); if(!sbc||!e||!m||!inp||!inp.value.trim()) return;
        var txt=inp.value.trim(); inp.value='';
        try { const r = await sbc.from('match_chat').insert({ match_id:m.id, user_email:e, user_name:(window.userData&&window.userData.name)||e, content:txt }); if(r.error){ if(window.showToast) showToast('No se pudo enviar: '+(r.error.message||''),'error'); inp.value=txt; return; } MatchDashboard.loadChat(); } catch(err){ if(window.showToast) showToast('Error: '+(err&&err.message||''),'error'); inp.value=txt; }
    };

    function _renderMomentosTab(){
        var m=_currentMatch; if(!m) return;
        var ph=_phase(m);
        var winOpen = ph==='en_juego' || (ph==='jugado' && (!m.finished_at || (Date.now()-new Date(m.finished_at)) < 2*3600000));
        _setContent('<div style="text-align:center;padding:10px 0 16px;">'+
          (winOpen
            ? '<button onclick="window._openCrearMomento&&window._openCrearMomento(\'Partidos\')" style="background:var(--accent);color:#000;border:none;border-radius:14px;padding:14px 22px;font-weight:900;font-size:14px;cursor:pointer;font-family:inherit;">📸 SUBIR MOMENTO DEL PARTIDO</button>'
            : '<div style="color:#888;font-size:12.5px;">Los momentos se pueden subir durante el partido y hasta 2 horas después.</div>')+
          '</div><div id="mdb-momentos" style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;"></div>');
        var sbc=_getSb(); if(!sbc) return;
        sbc.from('momentos').select('*').eq('category','Partidos').gt('expires_at', new Date().toISOString()).order('created_at',{ascending:false}).limit(30).then(function(r){
            var box=document.getElementById('mdb-momentos'); if(!box) return;
            var items=r.data||[];
            box.innerHTML = items.length ? items.map(function(mo){
                var v=(mo.media_type||'').startsWith('video');
                return '<div onclick="window._openMomento&&window._openMomento(\''+mo.id+'\')" style="aspect-ratio:1;background:#111;overflow:hidden;cursor:pointer;border-radius:4px;">'+(v?'<video src="'+mo.url+'" muted playsinline style="width:100%;height:100%;object-fit:cover;"></video>':'<img src="'+mo.url+'" style="width:100%;height:100%;object-fit:cover;" loading="lazy">')+'</div>';
            }).join('') : '<div style="grid-column:1/-1;text-align:center;color:#555;font-size:12px;padding:24px;">Todavía no hay momentos de partidos.</div>';
        });
    }

    function _renderResultado(){
        var m=_currentMatch; if(!m) return;
        var ph=_phase(m);
        if (!_isCaptain()){
            _setContent('<div style="text-align:center;padding:30px;color:#888;font-size:13px;"><i class=\'bx bx-trophy\' style="font-size:36px;opacity:0.3;display:block;margin-bottom:10px;"></i>El resultado lo cargan los capitanes de cada equipo<br>durante el partido o hasta 2 horas después.'+
              (m.home_score!=null?'<div style="margin-top:18px;font-size:30px;font-weight:900;color:#fff;">'+(m.home_score||0)+' - '+(m.away_score||0)+'</div>'+(m.result_disputed?'<div style="color:#ffaa00;font-size:11px;margin-top:6px;">⚠ Resultado en disputa — lo resuelve el admin</div>':''):'')+'</div>');
            return;
        }
        var editable = ph==='en_juego' || (ph==='jugado' && (!m.finished_at || (Date.now()-new Date(m.finished_at)) < 2*3600000)) || ph==='proximo';
        var html='';
        if (ph==='proximo') html += '<button onclick="MatchDashboard.startMatch()" style="width:100%;background:rgba(0,230,118,0.1);color:#00e676;border:1px solid rgba(0,230,118,0.4);border-radius:14px;padding:14px;font-weight:900;font-size:14px;cursor:pointer;font-family:inherit;margin-bottom:14px;">▶ INICIAR PARTIDO</button>';
        if (ph==='en_juego') html += '<button onclick="MatchDashboard.finishMatch()" style="width:100%;background:rgba(255,80,80,0.08);color:#ff6b6b;border:1px solid rgba(255,80,80,0.4);border-radius:14px;padding:14px;font-weight:900;font-size:14px;cursor:pointer;font-family:inherit;margin-bottom:14px;">⏹ FINALIZAR PARTIDO</button>';
        if (ph!=='proximo' && editable){
            html += '<div style="background:#111;border:1px solid #1e1e1e;border-radius:16px;padding:16px;margin-bottom:14px;">'+
              '<div style="font-size:10px;color:#888;font-weight:900;letter-spacing:1.5px;margin-bottom:10px;">MARCADOR</div>'+
              '<div style="display:flex;align-items:center;justify-content:center;gap:14px;">'+
              '<input id="mdb-score-h" type="number" min="0" value="'+(m.home_score!=null?m.home_score:'')+'" placeholder="0" style="width:64px;text-align:center;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;color:#fff;font-size:24px;font-weight:900;padding:10px;">'+
              '<span style="color:#555;font-weight:900;">-</span>'+
              '<input id="mdb-score-a" type="number" min="0" value="'+(m.away_score!=null?m.away_score:'')+'" placeholder="0" style="width:64px;text-align:center;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;color:#fff;font-size:24px;font-weight:900;padding:10px;"></div>'+
              '<button onclick="MatchDashboard.saveScore()" style="width:100%;margin-top:12px;background:var(--accent);color:#000;border:none;border-radius:12px;padding:12px;font-weight:900;cursor:pointer;font-family:inherit;">GUARDAR MARCADOR</button></div>';
            var opts=(_players||[]).filter(function(p){return ['confirmado','accepted','aceptado','titular'].includes(p.status||'confirmado');}).map(function(p){return '<option value="'+p.player_email+'|'+(p.player_name||'')+'">'+(p.player_name||p.player_email)+'</option>';}).join('');
            html += '<div style="background:#111;border:1px solid #1e1e1e;border-radius:16px;padding:16px;">'+
              '<div style="font-size:10px;color:#888;font-weight:900;letter-spacing:1.5px;margin-bottom:10px;">GOLES Y ASISTENCIAS</div>'+
              '<div style="display:flex;flex-direction:column;gap:8px;">'+
              '<select id="mdb-goal-p" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;padding:10px;font-size:13px;"><option value="">⚽ Goleador...</option>'+opts+'</select>'+
              '<select id="mdb-assist-p" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;padding:10px;font-size:13px;"><option value="">🎯 Asistencia (opcional)...</option>'+opts+'</select>'+
              '<button onclick="MatchDashboard.addGoal()" style="background:rgba(186,255,0,0.08);color:var(--accent);border:1px solid rgba(186,255,0,0.3);border-radius:10px;padding:11px;font-weight:800;cursor:pointer;font-family:inherit;">+ AGREGAR GOL</button>'+
              '<div id="mdb-goals-list" style="font-size:12px;color:#aaa;"></div></div></div>';
        } else if (!editable) {
            html += '<div style="text-align:center;color:#888;padding:20px;font-size:13px;">La ventana para editar el resultado cerró (2 horas después del final).</div>';
        }
        _setContent(html);
        MatchDashboard.loadGoals();
    }
    window.MatchDashboard.startMatch = async function(){
        var sbc=_getSb(); var m=_currentMatch; if(!sbc||!m) return;
        await sbc.from('matches').update({ status:'en_juego', started_at:new Date().toISOString() }).eq('id', m.id);
        m.status='en_juego'; m.started_at=new Date().toISOString();
        _renderHeaderBadges(); _renderResultado();
        if(window.showToast)showToast('¡Partido iniciado! ⚽','success');
    };
    window.MatchDashboard.finishMatch = async function(){
        var sbc=_getSb(); var m=_currentMatch; if(!sbc||!m) return;
        await sbc.from('matches').update({ status:'jugado', finished_at:new Date().toISOString() }).eq('id', m.id);
        m.status='jugado'; m.finished_at=new Date().toISOString();
        _renderHeaderBadges(); _renderResultado();
        if(window.showToast)showToast('Partido finalizado. Tenés 2 horas para cargar el resultado. 🏁','success');
    };
    window.MatchDashboard.saveScore = async function(){
        var sbc=_getSb(), e=_getEmail(); var m=_currentMatch; if(!sbc||!m) return;
        var h=parseInt(document.getElementById('mdb-score-h').value)||0, a=parseInt(document.getElementById('mdb-score-a').value)||0;
        var isHome = m.captain_home_email===e;
        var upd={}; upd[isHome?'result_home_by_home':'result_home_by_away']=h; upd[isHome?'result_away_by_home':'result_away_by_away']=a;
        var otherH = isHome ? m.result_home_by_away : m.result_home_by_home;
        var otherA = isHome ? m.result_away_by_away : m.result_away_by_home;
        var consolidated = false;
        if (otherH!=null && (otherH!==h || otherA!==a)) { upd.result_disputed=true; if(window.showToast)showToast('⚠ Los capitanes cargaron resultados distintos. Queda en disputa para el admin.','warning'); }
        else { upd.home_score=h; upd.away_score=a; upd.result_disputed=false; consolidated = true; if(window.showToast)showToast('Resultado guardado ✓','success'); }
        await sbc.from('matches').update(upd).eq('id', m.id);
        Object.assign(m, upd);
        // Propagar stats del club + racha por complejo (solo si no quedó en disputa)
        if (consolidated && !m._stats_propagated) {
            m._stats_propagated = true;
            try { await window.MatchDashboard._propagateMatchStats(m); } catch(err){ console.warn('propagate stats', err); }
        }
    };

    // Suma 1 partido y su resultado al club + actualiza racha por complejo para
    // todos los jugadores anotados. Idempotente por partido (usa flag local).
    window.MatchDashboard._propagateMatchStats = async function(m){
        var sbc = _getSb(); if(!sbc || !m) return;
        var h = (m.home_score!=null) ? +m.home_score : null;
        var a = (m.away_score!=null) ? +m.away_score : null;
        if (h==null || a==null) return;
        // Helper para actualizar stats de un club por owner_email o id
        async function bumpClub(opts, sideScore, oppScore){
            try {
                var q = sbc.from('clubs').select('id,stats');
                if (opts.id) q = q.eq('id', opts.id); else if (opts.email) q = q.eq('owner_email', opts.email);
                else return;
                var r = await q.maybeSingle();
                if (!r || !r.data) return;
                var st = (r.data.stats && typeof r.data.stats==='object') ? r.data.stats : {};
                st.pj = (st.pj||0) + 1;
                st.gf = (st.gf||0) + sideScore;
                st.gc = (st.gc||0) + oppScore;
                if (sideScore > oppScore) st.w = (st.w||0) + 1;
                else if (sideScore < oppScore) st.l = (st.l||0) + 1;
                else st.e = (st.e||0) + 1;
                st.pts = (st.w||0)*3 + (st.e||0);
                await sbc.from('clubs').update({ stats: st }).eq('id', r.data.id);
            } catch(err){ console.warn('bumpClub', err); }
        }
        var homeOpts = m.home_club_id ? {id:m.home_club_id} : (m.captain_home_email ? {email:m.captain_home_email} : (m.created_by?{email:m.created_by}:null));
        var awayOpts = m.away_club_id ? {id:m.away_club_id} : (m.captain_away_email ? {email:m.captain_away_email} : null);
        if (homeOpts) await bumpClub(homeOpts, h, a);
        if (awayOpts) await bumpClub(awayOpts, a, h);
        // Racha por complejo: para cada jugador anotado, sumar 1 a venue_counts[venue]
        try {
            var venue = (m.venue || '').toString().trim();
            if (venue) {
                var pp = await sbc.from('match_players').select('player_email').eq('match_id', m.id);
                var emails = Array.from(new Set(((pp&&pp.data)||[]).map(function(p){return p.player_email;}).filter(Boolean)));
                for (var i=0;i<emails.length;i++){
                    try {
                        var ur = await sbc.from('users').select('venue_counts').eq('email', emails[i]).maybeSingle();
                        if (ur && ur.data){
                            var vc = (ur.data.venue_counts && typeof ur.data.venue_counts==='object') ? ur.data.venue_counts : {};
                            vc[venue] = (vc[venue]||0) + 1;
                            await sbc.from('users').update({ venue_counts: vc }).eq('email', emails[i]);
                        }
                    } catch(err){}
                }
            }
        } catch(err){ console.warn('venue streak', err); }
    };
    window.MatchDashboard.addGoal = async function(){
        var sbc=_getSb(), e=_getEmail(); var m=_currentMatch; if(!sbc||!m) return;
        var g=document.getElementById('mdb-goal-p').value; if(!g){ if(window.showToast)showToast('Elegí el goleador.','info'); return; }
        var a=document.getElementById('mdb-assist-p').value;
        var gp=g.split('|'), ap=a?a.split('|'):null;
        var min = m.started_at ? Math.max(1, Math.round((Date.now()-new Date(m.started_at))/60000)) : null;
        var teamOf=(_players||[]).find(function(p){return p.player_email===gp[0];});
        await sbc.from('match_events').insert({ match_id:m.id, type:'goal', minute:min, player_email:gp[0], player_name:gp[1]||null, assist_email:ap?ap[0]:null, assist_name:ap?(ap[1]||null):null, team:(teamOf&&teamOf.team)||'home', created_by:e, created_at:new Date().toISOString() });
        if(window.showToast)showToast('Gol anotado ⚽','success');
        MatchDashboard.loadGoals();
    };
    window.MatchDashboard.loadGoals = async function(){
        var sbc=_getSb(); var m=_currentMatch; var box=document.getElementById('mdb-goals-list'); if(!sbc||!m||!box) return;
        var r=await sbc.from('match_events').select('*').eq('match_id', m.id).eq('type','goal').order('minute',{ascending:true});
        box.innerHTML=(r.data||[]).map(function(ev){ return '<div style="padding:6px 0;border-bottom:1px solid #1a1a1a;">⚽ <b style="color:#fff;">'+(ev.player_name||ev.player_email||'')+'</b>'+(ev.minute?(' <span style="color:#666;">'+ev.minute+"′</span>"):'')+(ev.assist_name?(' · 🎯 '+ev.assist_name):'')+'</div>'; }).join('') || '<div style="color:#555;padding:6px 0;">Sin goles anotados.</div>';
    };

    // ── RESUMEN (estilo Google Sports) ──────────────────────────
    function _renderResumen() {
        if (_miniMap) { try { _miniMap.remove(); } catch(e){} _miniMap = null; }
        var m = _currentMatch;
        if (!m) return;
        var date = m.scheduled_at ? new Date(m.scheduled_at) : null;
        var dateStr = date ? date.toLocaleDateString('es-UY', {weekday:'short',day:'numeric',month:'short'}) : 'Sin fecha';
        var timeStr = date ? date.toLocaleTimeString('es-UY', {hour:'2-digit',minute:'2-digit'}) : '';
        var confirmed = _players.filter(function(p){ return p.status === 'confirmado'; }).length;
        // Calcular total según modalidad real del partido
        var modalityMap = { '5v5':10, '7v7':14, '11v11':22, '5':10, '7':14, '11':22, 'futbol5':10, 'futbol7':14, 'futbol11':22 };
        var modKey = (m.football_type || m.modality || m.match_type || '').toLowerCase().replace(/\s/g,'').replace('x','v');
        var total = m.slots_total || modalityMap[modKey] || 22;
        var slots = Math.max(0, total - (m.slots_taken || confirmed || 0));
        var jitsiRoom = 'canchero-' + (m.id || '').slice(0, 8);
        var jitsiUrl = 'https://meet.jit.si/' + jitsiRoom;
        var hasMap = m.venue_lat && m.venue_lng;

        // Nombres de equipos
        var homeName = m.home_club_name || 'LOCAL';
        var awayName = m.away_club_name || 'VISITANTE';
        var homeLogo = m.home_club_logo;
        var awayLogo = m.away_club_logo;
        var homeInitial = homeName[0] || 'L';
        var awayInitial = awayName[0] || 'V';
        var homeScore = m.home_score != null ? m.home_score : '-';
        var awayScore = m.away_score != null ? m.away_score : '-';
        var isFinished = m.status === 'finalizado' || m.status === 'finished';
        var statusText = isFinished ? 'Finalizado' : (date && date < new Date() ? 'En curso' : dateStr + ', ' + timeStr);
        var statusColor = isFinished ? '#888' : '#00e676';
        var myEmail = _getEmail();
        var isMyMatch = myEmail && (m.created_by === myEmail || m.captain_home_email === myEmail || m.captain_away_email === myEmail);
        var isRecentFinished = isFinished && m.scheduled_at && (Date.now() - new Date(m.scheduled_at).getTime() < 5*3600*1000);

        function _teamBadge(name, logo, initial, score) {
            var logoHtml = logo
                ? '<img src="' + logo + '" style="width:48px;height:48px;border-radius:10px;object-fit:cover;border:2px solid #222;" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
                  + '<div style="display:none;width:48px;height:48px;border-radius:10px;background:var(--accent);color:#000;font-weight:900;font-size:22px;align-items:center;justify-content:center;">' + initial + '</div>'
                : '<div style="width:48px;height:48px;border-radius:10px;background:var(--accent);color:#000;font-weight:900;font-size:22px;display:flex;align-items:center;justify-content:center;">' + initial + '</div>';
            return '<div style="text-align:center;flex:1;">' +
                logoHtml +
                '<div style="font-size:12px;font-weight:800;margin-top:6px;letter-spacing:.5px;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:6px auto 0;">' + name + '</div>' +
            '</div>';
        }

        _setContent(
            // Scoreboard estilo Google
            '<div style="background:#111;border:1px solid #1e1e1e;border-radius:16px;overflow:hidden;margin-bottom:12px;">' +
                // Header con estado
                '<div style="padding:10px 16px;font-size:11px;color:' + statusColor + ';font-weight:700;letter-spacing:.5px;border-bottom:1px solid #1a1a1a;">' +
                    (m.modality || m.match_type || '').toUpperCase() + ' · ' + statusText +
                '</div>' +
                // Marcador central
                '<div style="display:flex;align-items:center;justify-content:center;padding:24px 16px;gap:16px;">' +
                    _teamBadge(homeName, homeLogo, homeInitial, homeScore) +
                    '<div style="text-align:center;min-width:70px;">' +
                        '<div style="font-size:36px;font-weight:900;color:#fff;letter-spacing:4px;">' + homeScore + ' - ' + awayScore + '</div>' +
                        '<div style="font-size:10px;color:#555;margin-top:4px;">' + timeStr + '</div>' +
                    '</div>' +
                    _teamBadge(awayName, awayLogo, awayInitial, awayScore) +
                '</div>' +
            '</div>' +
            // Info del partido en grid
            '<div style="background:#111;border:1px solid #1e1e1e;border-radius:16px;padding:16px;margin-bottom:12px;">' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
                    _statBox('FECHA', dateStr) + _statBox('HORA', timeStr) +
                    _statBox('CANCHA', m.venue || m.city || 'Sin definir') + _statBox('MODALIDAD', (m.modality || m.match_type || 'abierto').toUpperCase()) +
                    _statBox('CONFIRMADOS', confirmed + ' / ' + total) + _statBox('LUGARES LIBRES', slots > 0 ? slots : 'LLENO') +
                '</div>' +
            '</div>' +
            // Mapa
            (hasMap ? '<div id="mdb-mini-map" style="height:180px;border-radius:12px;border:1px solid #2a2a2a;overflow:hidden;margin-bottom:12px;"></div>' : '') +
            // Lugar
            '<div style="background:#111;border:1px solid #1e1e1e;border-radius:16px;padding:14px 16px;margin-bottom:12px;">' +
                '<div style="font-size:10px;color:var(--accent);font-weight:800;letter-spacing:1px;margin-bottom:4px;">LUGAR</div>' +
                '<div style="font-size:14px;font-weight:700;">' + (m.venue || m.city || 'Por definir') + '</div>' +
            '</div>' +
            // Acciones
            '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">' +
                '<a href="' + jitsiUrl + '" target="_blank" style="flex:1;min-width:140px;display:flex;align-items:center;justify-content:center;gap:8px;background:rgba(186,255,0,0.08);color:var(--accent);border:1px solid rgba(186,255,0,0.3);border-radius:12px;padding:12px;font-weight:700;font-size:13px;text-decoration:none;">' +
                    '<i class="bx bx-video" style="font-size:18px;"></i> VIDEOLLAMADA' +
                '</a>' +
                '<button onclick="shareMatch(' + JSON.stringify(m.id) + ',' + JSON.stringify(m.name||'') + ',' + JSON.stringify(m.venue||'') + ',\'\')" style="flex:1;min-width:120px;display:flex;align-items:center;justify-content:center;gap:8px;background:rgba(255,255,255,0.04);color:#aaa;border:1px solid #2a2a2a;border-radius:12px;padding:12px;font-weight:700;font-size:13px;cursor:pointer;">' +
                    '<i class="bx bx-share-alt" style="font-size:18px;"></i> COMPARTIR' +
                '</button>' +
            '</div>' +
            // Panel de gestión en tiempo real
            (isMyMatch ? _liveControlHtml(m) : '') +
            // Encuestas del partido (las que se crean con context='match' viven acá, NO en el feed)
            '<div id="mdb-polls-block" style="margin-top:12px;"></div>' +
            // Botón carga post-partido (hasta 5hs después)
            (!isMyMatch && isRecentFinished ? '<button onclick="MatchDashboard._openPostMatchLoad(' + JSON.stringify(m.id) + ')" style="width:100%;background:rgba(186,255,0,0.08);color:var(--accent);border:1px solid rgba(186,255,0,0.3);border-radius:12px;padding:12px;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="bx bx-edit"></i> CARGAR RESULTADO</button>' : '')
        );
        // Cargar encuestas del partido (context='match', context_id=m.id) en el panel
        setTimeout(function(){ try { window.MatchDashboard._loadMatchPolls(m.id); } catch(e){} }, 100);
        if (hasMap && typeof L !== 'undefined') {
            setTimeout(function() {
                var mapEl = document.getElementById('mdb-mini-map');
                if (!mapEl) return;
                _miniMap = L.map('mdb-mini-map', { zoomControl:false, dragging:false, scrollWheelZoom:false })
                    .setView([m.venue_lat, m.venue_lng], 16);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(_miniMap);
                L.marker([m.venue_lat, m.venue_lng]).addTo(_miniMap);
            }, 100);
        }
        // Re-enganchar el cronómetro si venía corriendo (sobrevive cambios de tab)
        if (isMyMatch) setTimeout(function(){ try{ window.MatchDashboard._syncTimerUI(); }catch(e){} }, 60);
    }

    function _statBox(label, val) {
        return '<div style="background:#0d0d0d;border:1px solid #1a1a1a;border-radius:10px;padding:12px;">' +
            '<div style="font-size:9px;color:#555;font-weight:700;letter-spacing:1px;margin-bottom:4px;">' + label + '</div>' +
            '<div style="font-size:13px;font-weight:700;color:#fff;word-break:break-word;">' + (val||'---') + '</div>' +
        '</div>';
    }

    // ── PLANTILLA ──────────────────────────────────────────────────
    async function _renderPlantilla() {
        var myEmail = _getEmail();
        var sb = _getSb();
        var m = _currentMatch;
        if (!sb || !m) return;
        _setContent('<div style="text-align:center;padding:30px;color:#555;"><i class="bx bx-loader-alt bx-spin" style="font-size:24px;"></i></div>');
        // Cargar confirmaciones
        var confRes = await sb.from('match_confirmations').select('*').eq('match_id', m.id).then(undefined, function(){ return {data:[]}; });
        var confs = (confRes && confRes.data) || [];
        var confMap = {};
        confs.forEach(function(c){ confMap[c.player_email] = c.status; });
        // Cargar fotos de jugadores
        var emails = _players.map(function(p){ return p.player_email; });
        var usersData = {};
        if (emails.length) {
            var uRes = await sb.from('users').select('email,name,photo').in('email', emails).then(undefined, function(){return {data:[]};});
            (uRes.data||[]).forEach(function(u){ usersData[u.email] = u; });
        }
        var isMine = m.created_by === myEmail || m.captain_home_email === myEmail;
        var myConfStatus = confMap[myEmail] || 'pendiente';
        var html = '';
        // Botones de confirmación propia
        if (myEmail && _players.find(function(p){ return p.player_email === myEmail; })) {
            html += '<div style="background:#111;border:1px solid #1e1e1e;border-radius:16px;padding:16px;margin-bottom:12px;">' +
                '<div style="font-size:12px;color:#888;font-weight:700;margin-bottom:10px;">TU ASISTENCIA</div>' +
                '<div style="display:flex;gap:8px;">' +
                    '<button onclick="MatchDashboard._confirm(' + JSON.stringify(m.id) + ',\'confirmado\')" style="flex:1;background:' + (myConfStatus==='confirmado'?'var(--accent)':'#1a1a1a') + ';color:' + (myConfStatus==='confirmado'?'#000':'#aaa') + ';border:1px solid ' + (myConfStatus==='confirmado'?'var(--accent)':'#333') + ';border-radius:10px;padding:10px;font-weight:900;cursor:pointer;font-size:13px;">VOY</button>' +
                    '<button onclick="MatchDashboard._confirm(' + JSON.stringify(m.id) + ',\'no_va\')" style="flex:1;background:' + (myConfStatus==='no_va'?'#ff4444':'#1a1a1a') + ';color:' + (myConfStatus==='no_va'?'#fff':'#aaa') + ';border:1px solid ' + (myConfStatus==='no_va'?'#ff4444':'#333') + ';border-radius:10px;padding:10px;font-weight:900;cursor:pointer;font-size:13px;">NO VOY</button>' +
                '</div>' +
            '</div>';
        }
        html += '<div style="font-size:11px;color:#888;font-weight:700;letter-spacing:1px;margin-bottom:8px;">PLANTILLA (' + _players.length + ' jugadores)</div>';
        _players.forEach(function(p) {
            var u = usersData[p.player_email] || {};
            var photo = u.photo || '';
            var name = u.name || p.player_name || p.player_email;
            var pos = (p.position || '').toUpperCase();
            var conf = confMap[p.player_email] || 'pendiente';
            var confColor = conf === 'confirmado' ? 'var(--accent)' : conf === 'no_va' ? '#ff4444' : '#555';
            var confIcon = conf === 'confirmado' ? 'bx-check-circle' : conf === 'no_va' ? 'bx-x-circle' : 'bx-time';
            html += '<div style="background:#111;border:1px solid #1e1e1e;border-radius:12px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:12px;">' +
                '<div style="width:40px;height:40px;border-radius:50%;background:#1a1a1a;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;">' +
                    (photo ? '<img src="' + photo + '" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\'">' : '<span style="font-weight:900;color:var(--accent);">' + (name[0]||'?').toUpperCase() + '</span>') +
                '</div>' +
                '<div style="flex:1;min-width:0;">' +
                    '<div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + name + (p.is_captain?'  <span style="font-size:10px;color:var(--accent);">CAPITAN</span>':'') + '</div>' +
                    '<div style="font-size:11px;color:#555;">' + pos + '</div>' +
                '</div>' +
                '<i class="bx ' + confIcon + '" style="font-size:20px;color:' + confColor + ';flex-shrink:0;"></i>' +
                '<button onclick="viewUserProfile(' + JSON.stringify(p.player_email) + ')" style="background:none;border:1px solid #2a2a2a;color:#888;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:11px;flex-shrink:0;">PERFIL</button>' +
            '</div>';
        });
        if (isMine || true) { // mostrar siempre el botón de buscar disponibles
            html += '<button onclick="window.openBuscarDisponibles&&window.openBuscarDisponibles()" style="width:100%;background:rgba(0,230,118,0.08);color:#00e676;border:1px solid rgba(0,230,118,0.3);border-radius:12px;padding:12px;font-weight:700;cursor:pointer;margin-top:8px;font-size:13px;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="bx bx-search-alt" style="font-size:18px;"></i> BUSCAR JUGADORES DISPONIBLES</button>';
        }
        _setContent(html);
    }

    window.MatchDashboard._confirm = async function(matchId, status) {
        var sb = _getSb();
        var email = _getEmail();
        if (!sb || !email) return;
        await sb.from('match_confirmations').upsert(
            { match_id: matchId, player_email: email, status: status },
            { onConflict: 'match_id,player_email' }
        ).then(undefined, function(){});
        if(typeof showToast==='function') showToast(status === 'confirmado' ? 'Confirmaste que VAS!' : 'Marcaste que no vas.', 'success');
        _renderPlantilla();
    };

    window.MatchDashboard._needPlayer = async function() {
        var m = _currentMatch;
        if (!m) return;
        var sb = _getSb();
        var me = window.userData;
        if (!sb || !me) return;
        var city = m.city || me.city || 'tu ciudad';
        var { data: avail } = await sb.from('users').select('email').eq('isAvailable', true).eq('city', city).limit(50).then(undefined, function(){ return {data:[]}; });
        if (avail && avail.length) {
            var inserts = avail.map(function(u){ return { user_email: u.email, type: 'need_player', content: 'Se necesita jugador en ' + (m.name||'un partido') + ' en ' + city }; });
            await sb.from('notifications').insert(inserts).then(undefined, function(){});
        }
        if(typeof showToast==='function') showToast('Notificacion enviada a jugadores disponibles en ' + city, 'success');
    };

    // ── FORMACION ──────────────────────────────────────────────────
    function _renderFormacion() {
        var m = _currentMatch;
        var formation = (m && m.formation) || '4-3-3';
        var isMine = m && (m.created_by === _getEmail() || m.captain_home_email === _getEmail());
        var formOpts = Object.keys(FORMATIONS).map(function(f) {
            return '<option value="' + f + '"' + (f === formation ? ' selected' : '') + '>' + f + '</option>';
        }).join('');
        var html = '';
        if (isMine) {
            html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">' +
                '<label style="font-size:11px;color:#888;font-weight:700;white-space:nowrap;">FORMACION:</label>' +
                '<select onchange="MatchDashboard._saveFormation(this.value)" style="flex:1;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:8px;font-size:14px;">' + formOpts + '</select>' +
            '</div>';
        }
        var fData = FORMATIONS[formation] || FORMATIONS['4-3-3'];
        var posArr = fData.pos;
        var confirmed = _players.filter(function(p){ return p.status === 'confirmado' || p.status === 'pendiente'; });
        html += '<div style="position:relative;width:100%;max-width:320px;margin:0 auto;padding-bottom:154%;background:linear-gradient(180deg,#1a4d1a 0%,#1e6b1e 50%,#1a4d1a 100%);border-radius:12px;border:2px solid rgba(255,255,255,0.08);overflow:hidden;">' +
            // Lineas de cancha
            '<div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.15);transform:translateX(-50%);"></div>' +
            '<div style="position:absolute;top:50%;left:15%;right:15%;height:1px;background:rgba(255,255,255,0.15);"></div>' +
            '<div style="position:absolute;top:50%;left:50%;width:60px;height:60px;border:1px solid rgba(255,255,255,0.15);border-radius:50%;transform:translate(-50%,-50%);"></div>';
        posArr.forEach(function(p, i) {
            var player = confirmed[i];
            var name = player ? (player.player_name || player.player_email || '').split(' ')[0].slice(0,8) : '?';
            html += '<div style="position:absolute;left:' + p.x + '%;top:' + p.y + '%;transform:translate(-50%,-50%);text-align:center;">' +
                '<div style="width:32px;height:32px;border-radius:50%;background:var(--accent);color:#000;font-weight:900;font-size:10px;display:flex;align-items:center;justify-content:center;margin:0 auto 2px;border:2px solid rgba(0,0,0,0.3);">' + p.lbl + '</div>' +
                '<div style="font-size:8px;color:#fff;font-weight:700;text-shadow:0 1px 2px rgba(0,0,0,0.8);max-width:40px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + name + '</div>' +
            '</div>';
        });
        html += '</div>';
        _setContent(html);
    }

    window.MatchDashboard._saveFormation = async function(formation) {
        var sb = _getSb();
        var m = _currentMatch;
        if (!sb || !m) return;
        await sb.from('matches').update({ formation: formation }).eq('id', m.id).then(undefined, function(){});
        _currentMatch.formation = formation;
        _renderFormacion();
    };

    // ── CHATS ──────────────────────────────────────────────────────
    function _renderChats() {
        var m = _currentMatch;
        if (!m) return;
        var myEmail = _getEmail();
        var captAway = m.captain_away_email;
        var html = '<div style="display:flex;flex-direction:column;gap:10px;">' +
            _chatBtn('bx-group', 'Chat grupal — Mi equipo', 'Hablar solo con tu equipo', function() {
                _openGroupChat(m.id, m.name, 'home');
            }) +
            _chatBtn('bx-conversation', 'Chat grupal — Ambos equipos', 'Canal general del partido', function() {
                _openGroupChat(m.id, m.name, 'all');
            }) +
            (captAway ? _chatBtn('bx-shield', 'Chat entre capitanes', 'Privado con el capitan rival', function() {
                if(window.CancheroMessaging) CancheroMessaging.openThread('dm', null, captAway, 'Capitan rival');
            }) : '') +
        '</div>' +
        '<div style="margin-top:16px;">' +
        '<div style="font-size:11px;color:#888;font-weight:700;letter-spacing:1px;margin-bottom:8px;">MENSAJES INDIVIDUALES</div>';
        _players.forEach(function(p) {
            if (p.player_email === myEmail) return;
            var name = p.player_name || p.player_email;
            html += '<div style="background:#111;border:1px solid #1e1e1e;border-radius:12px;padding:12px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">' +
                '<span style="font-size:13px;font-weight:700;">' + name + '</span>' +
                '<button onclick="(function(){if(window.CancheroMessaging)CancheroMessaging.openThread(\'dm\',null,' + JSON.stringify(p.player_email) + ',' + JSON.stringify(name) + ');})()" ' +
                    'style="background:rgba(186,255,0,0.1);color:var(--accent);border:1px solid rgba(186,255,0,0.3);border-radius:10px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;">MENSAJE</button>' +
            '</div>';
        });
        html += '</div>';
        _setContent(html);
    }

    function _chatBtn(icon, title, sub, fn) {
        var fnKey = '_chatFn_' + Math.random().toString(36).slice(2);
        window[fnKey] = fn;
        return '<button onclick="window[' + JSON.stringify(fnKey) + ']()" style="display:flex;align-items:center;gap:14px;width:100%;background:#111;border:1px solid #1e1e1e;border-radius:14px;padding:16px;cursor:pointer;text-align:left;">' +
            '<div style="width:44px;height:44px;border-radius:50%;background:rgba(186,255,0,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="bx ' + icon + '" style="font-size:22px;color:var(--accent);"></i></div>' +
            '<div><div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:2px;">' + title + '</div><div style="font-size:11px;color:#555;">' + sub + '</div></div>' +
            '<i class="bx bx-chevron-right" style="margin-left:auto;color:#333;font-size:20px;"></i>' +
        '</button>';
    }

    async function _openGroupChat(matchId, matchName, team) {
        var sb = _getSb();
        if (!sb) return;
        var me = window.userData;
        if (!me) return;
        // Buscar o crear group_chat del partido
        var name = (team === 'home' ? 'Mi equipo — ' : 'Todos — ') + (matchName || 'Partido');
        var res = await sb.from('group_chats').select('*').eq('match_id', matchId).eq('name', name).maybeSingle().then(undefined, function(){return {data:null};});
        var group = res.data;
        if (!group) {
            var ins = await sb.from('group_chats').insert({ name: name, created_by: me.email, match_id: matchId }).select().single().then(undefined, function(){return {data:null};});
            group = ins.data;
        }
        if (group && window.CancheroMessaging) {
            CancheroMessaging.openThread('group', null, null, null, group.id, group.name);
        }
    }

    // ── COSTOS ──────────────────────────────────────────────────────
    async function _renderCostos() {
        var m = _currentMatch;
        var sb = _getSb();
        if (!sb || !m) return;
        _setContent('<div style="text-align:center;padding:30px;color:#555;"><i class="bx bx-loader-alt bx-spin" style="font-size:24px;"></i></div>');
        var res = await sb.from('match_costs').select('*').eq('match_id', m.id).maybeSingle().then(undefined, function(){return {data:null};});
        var costs = res ? res.data : null;
        var cancha = costs ? costs.cancha_price : 0;
        var extra  = costs ? costs.extra_costs  : 0;
        var notes  = costs ? (costs.notes || '') : '';
        var confirmed = _players.filter(function(p){ return p.status === 'confirmado'; }).length || 1;
        var total = parseFloat(cancha||0) + parseFloat(extra||0);
        var perPerson = confirmed > 0 ? (total / confirmed).toFixed(0) : 0;
        var isMine = m.created_by === _getEmail() || m.captain_home_email === _getEmail();
        var html = '<div style="background:#111;border:1px solid #1e1e1e;border-radius:16px;padding:20px;margin-bottom:12px;">' +
            '<div style="font-size:12px;color:#888;font-weight:700;letter-spacing:1px;margin-bottom:16px;">COSTOS DEL PARTIDO</div>';
        if (isMine) {
            html += '<label style="font-size:11px;color:#888;font-weight:700;display:block;margin-bottom:4px;">PRECIO DE LA CANCHA ($)</label>' +
                '<input id="mc-cancha" type="number" value="' + (cancha||0) + '" oninput="MatchDashboard._recalcCost()" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px;margin-bottom:12px;font-size:16px;box-sizing:border-box;">' +
                '<label style="font-size:11px;color:#888;font-weight:700;display:block;margin-bottom:4px;">COSTOS EXTRA ($)</label>' +
                '<input id="mc-extra" type="number" value="' + (extra||0) + '" oninput="MatchDashboard._recalcCost()" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px;margin-bottom:12px;font-size:16px;box-sizing:border-box;">' +
                '<label style="font-size:11px;color:#888;font-weight:700;display:block;margin-bottom:4px;">NOTAS</label>' +
                '<input id="mc-notes" type="text" value="' + (notes||'') + '" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px;margin-bottom:16px;font-size:14px;box-sizing:border-box;">';
        }
        html += '<div id="mc-calc" style="background:rgba(186,255,0,0.06);border:1px solid rgba(186,255,0,0.2);border-radius:12px;padding:16px;margin-bottom:' + (isMine?'12px':'0') + ';">' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#888;font-size:13px;">Total</span><span style="font-weight:700;font-size:14px;" id="mc-total">$' + total.toFixed(0) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;"><span style="color:#888;font-size:13px;">Confirmados</span><span style="font-weight:700;font-size:14px;">' + confirmed + '</span></div>' +
            '<div style="border-top:1px solid rgba(186,255,0,0.2);margin-top:10px;padding-top:10px;display:flex;justify-content:space-between;">' +
                '<span style="color:var(--accent);font-weight:900;font-size:14px;">Cada uno lleva</span>' +
                '<span id="mc-per-person" style="color:var(--accent);font-weight:900;font-size:22px;">$' + perPerson + '</span>' +
            '</div>' +
        '</div>';
        if (isMine) {
            html += '<button onclick="MatchDashboard._saveCosts(' + JSON.stringify(m.id) + ')" style="width:100%;background:var(--accent);color:#000;border:none;border-radius:12px;padding:12px;font-weight:900;cursor:pointer;font-size:14px;">GUARDAR COSTOS</button>';
        }
        html += '</div>';
        _setContent(html);
    }

    window.MatchDashboard._recalcCost = function() {
        var cancha = parseFloat((document.getElementById('mc-cancha')||{}).value)||0;
        var extra  = parseFloat((document.getElementById('mc-extra')||{}).value)||0;
        var total = cancha + extra;
        var confirmed = _players.filter(function(p){ return p.status === 'confirmado'; }).length || 1;
        var per = (total / confirmed).toFixed(0);
        var t = document.getElementById('mc-total');
        var p = document.getElementById('mc-per-person');
        if (t) t.textContent = '$' + total.toFixed(0);
        if (p) p.textContent = '$' + per;
    };

    window.MatchDashboard._saveCosts = async function(matchId) {
        var sb = _getSb();
        if (!sb) return;
        var cancha = parseFloat((document.getElementById('mc-cancha')||{}).value)||0;
        var extra  = parseFloat((document.getElementById('mc-extra')||{}).value)||0;
        var notes  = (document.getElementById('mc-notes')||{}).value||'';
        await sb.from('match_costs').upsert(
            { match_id: matchId, cancha_price: cancha, extra_costs: extra, notes: notes },
            { onConflict: 'match_id' }
        ).then(undefined, function(){});
        if(typeof showToast==='function') showToast('Costos guardados!', 'success');
    };

    // ── APUESTA ──────────────────────────────────────────────────────
    async function _renderApuesta() {
        var m = _currentMatch;
        var myEmail = _getEmail();
        var sb = _getSb();
        if (!m || !sb) return;
        var isPlayer = _players.some(function(p){ return p.player_email === myEmail; });
        var isCaptain = m.created_by === myEmail || m.captain_home_email === myEmail || m.captain_away_email === myEmail;

        _setContent('<div style="text-align:center;padding:30px;color:#555;"><i class="bx bx-loader-alt bx-spin" style="font-size:24px;"></i></div>');

        var betRes = await sb.from('match_bets').select('*').eq('match_id', m.id).maybeSingle().then(undefined, function(){return {data:null};});
        var bet = betRes.data;

        var html = '<div style="background:#111;border:1px solid #1e1e1e;border-radius:16px;padding:20px;margin-bottom:12px;">';
        html += '<div style="font-size:12px;color:#ffaa00;font-weight:900;letter-spacing:1px;margin-bottom:14px;">🏆 APUESTA / PREMIO DEL PARTIDO</div>';

        if (!bet) {
            // Proponer apuesta
            if (isPlayer) {
                html += '<div style="font-size:13px;color:#888;margin-bottom:12px;">Ningún equipo ha propuesto una apuesta todavía.</div>';
                html += '<textarea id="mdb-bet-text" placeholder="Ej: La coca, pizza para todos, 5 euros por jugador..." rows="3" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:12px;font-size:13px;resize:none;margin-bottom:10px;box-sizing:border-box;"></textarea>';
                html += '<button onclick="MatchDashboard._proposeBet(' + JSON.stringify(m.id) + ')" style="width:100%;background:rgba(255,170,0,0.15);color:#ffaa00;border:1px solid rgba(255,170,0,0.4);border-radius:12px;padding:12px;font-weight:900;cursor:pointer;font-size:13px;">PROPONER APUESTA</button>';
            } else {
                html += '<div style="font-size:13px;color:#555;text-align:center;padding:20px;">Aún no hay apuesta activa.</div>';
            }
        } else {
            var statusLabel = { proposed:'Propuesta', countered:'Contraoferta', accepted:'✅ ACEPTADA', rejected:'❌ Rechazada' }[bet.status] || bet.status;
            var statusColor = { proposed:'#ffaa00', countered:'#64b4ff', accepted:'#00e676', rejected:'#ff4444' }[bet.status] || '#888';
            html += '<div style="background:#0a0a0a;border:1px solid #252525;border-radius:12px;padding:14px;margin-bottom:12px;">';
            html += '<div style="font-size:10px;color:#555;font-weight:700;letter-spacing:1px;margin-bottom:6px;">APUESTA ACTUAL</div>';
            html += '<div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:8px;">"' + (bet.bet_text||'') + '"</div>';
            if (bet.counter_text) {
                html += '<div style="font-size:12px;color:#64b4ff;margin-bottom:6px;">Contraoferta: "' + bet.counter_text + '"</div>';
            }
            html += '<div style="display:flex;align-items:center;gap:8px;">';
            html += '<span style="font-size:11px;font-weight:700;color:' + statusColor + ';">' + statusLabel + '</span>';
            html += '<span style="font-size:10px;color:#555;">· Propuesta por ' + (bet.proposer_team==='home'?'Local':'Visitante') + '</span>';
            html += '</div>';
            // Votos de aprobación
            var approvals = (bet.approvals_json ? JSON.parse(bet.approvals_json) : []) ;
            var myApproved = approvals.includes(myEmail);
            html += '<div style="margin-top:10px;font-size:11px;color:#555;">' + approvals.length + ' / ' + _players.length + ' jugadores aprobaron</div>';
            html += '</div>';

            if (bet.status !== 'accepted' && bet.status !== 'rejected' && isPlayer) {
                if (!myApproved) {
                    html += '<button onclick="MatchDashboard._approveBet(' + JSON.stringify(m.id) + ',' + JSON.stringify(bet.id) + ')" style="width:100%;background:rgba(0,230,118,0.12);color:#00e676;border:1px solid rgba(0,230,118,0.3);border-radius:12px;padding:12px;font-weight:900;cursor:pointer;margin-bottom:8px;font-size:13px;">✅ APROBAR APUESTA</button>';
                } else {
                    html += '<div style="text-align:center;padding:10px;font-size:12px;color:#00e676;font-weight:700;margin-bottom:8px;">✅ Ya aprobaste esta apuesta</div>';
                }
                if (bet.edits_count < 4) {
                    html += '<textarea id="mdb-counter-text" placeholder="Contraoferta (opcional)..." rows="2" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px;font-size:13px;resize:none;margin-bottom:8px;box-sizing:border-box;"></textarea>';
                    html += '<button onclick="MatchDashboard._counterBet(' + JSON.stringify(m.id) + ',' + JSON.stringify(bet.id) + ')" style="width:100%;background:rgba(100,180,255,0.1);color:#64b4ff;border:1px solid rgba(100,180,255,0.3);border-radius:12px;padding:10px;font-weight:700;cursor:pointer;font-size:12px;">CONTRAOFERTA (' + (4-bet.edits_count) + ' restantes)</button>';
                }
                html += '<button onclick="MatchDashboard._rejectBet(' + JSON.stringify(m.id) + ',' + JSON.stringify(bet.id) + ')" style="width:100%;background:rgba(255,68,68,0.1);color:#ff4444;border:1px solid rgba(255,68,68,0.3);border-radius:12px;padding:10px;font-weight:700;cursor:pointer;font-size:12px;margin-top:6px;">RECHAZAR APUESTA</button>';
            }
        }

        html += '</div>';
        _setContent(html);
    }

    window.MatchDashboard._proposeBet = async function(matchId) {
        var sb = _getSb(); var myEmail = _getEmail();
        var text = (document.getElementById('mdb-bet-text')||{}).value || 'La coca';
        if (!sb || !myEmail || !text.trim()) return;
        var myPlayer = _players.find(function(p){ return p.player_email === myEmail; });
        var team = myPlayer ? (myPlayer.team || 'home') : 'home';
        var payload = { match_id: matchId, proposer_email: myEmail, proposer_team: team, bet_text: text.trim(), status:'proposed', edits_count:0, approvals_json: JSON.stringify([myEmail]) };
        // Sin upsert/onConflict (la tabla puede no tener UNIQUE en match_id): buscar y actualizar o insertar
        var existing = await sb.from('match_bets').select('id').eq('match_id', matchId).maybeSingle().then(undefined, function(){ return { data: null }; });
        var betErr;
        if (existing && existing.data && existing.data.id) {
            var u1 = await sb.from('match_bets').update(payload).eq('id', existing.data.id).then(undefined, function(e){ return { error: e }; });
            betErr = u1 && u1.error;
        } else {
            var i1 = await sb.from('match_bets').insert(payload).then(undefined, function(e){ return { error: e }; });
            betErr = i1 && i1.error;
        }
        if (betErr) { if (typeof showToast==='function') showToast('Error al proponer apuesta', 'error'); return; }
        if (typeof showToast==='function') showToast('Apuesta propuesta!', 'success');
        switchTab('apuesta');
    };

    window.MatchDashboard._approveBet = async function(matchId, betId) {
        var sb = _getSb(); var myEmail = _getEmail();
        if (!sb || !myEmail) return;
        var res = await sb.from('match_bets').select('approvals_json,status').eq('id', betId).single().then(undefined, function(){return {data:null};});
        if (!res.data) return;
        var approvals = res.data.approvals_json ? JSON.parse(res.data.approvals_json) : [];
        if (approvals.includes(myEmail)) { showToast&&showToast('Ya aprobaste esta apuesta','info'); return; }
        approvals.push(myEmail);
        var newStatus = approvals.length >= _players.length ? 'accepted' : res.data.status;
        await sb.from('match_bets').update({ approvals_json: JSON.stringify(approvals), status: newStatus }).eq('id', betId).then(undefined, function(){});
        if (newStatus === 'accepted' && typeof showToast==='function') showToast('🏆 Apuesta aceptada por todos!', 'success');
        else if (typeof showToast==='function') showToast('Aprobaste la apuesta ✅', 'success');
        switchTab('apuesta');
    };

    window.MatchDashboard._counterBet = async function(matchId, betId) {
        var sb = _getSb();
        var counter = (document.getElementById('mdb-counter-text')||{}).value || '';
        if (!sb || !counter.trim()) return;
        var res = await sb.from('match_bets').select('edits_count').eq('id', betId).single().then(undefined, function(){return{data:null};});
        var edits = (res.data && res.data.edits_count)||0;
        if (edits >= 4) { showToast&&showToast('Máximo de contraofertas alcanzado','error'); return; }
        await sb.from('match_bets').update({ counter_text: counter.trim(), status:'countered', edits_count: edits+1, approvals_json: '[]' }).eq('id', betId).then(undefined, function(){});
        showToast&&showToast('Contraoferta enviada', 'success');
        switchTab('apuesta');
    };

    window.MatchDashboard._rejectBet = async function(matchId, betId) {
        var sb = _getSb();
        if (!sb) return;
        await sb.from('match_bets').update({ status:'rejected' }).eq('id', betId).then(undefined, function(){});
        showToast&&showToast('Apuesta rechazada', 'info');
        switchTab('apuesta');
    };

    // ── REGLAS ──────────────────────────────────────────────────────
    function _renderReglas() {
        var m = _currentMatch;
        if (!m) return;
        var isMine = m.created_by === _getEmail() || m.captain_home_email === _getEmail();
        var rules = m.rules || '';
        var html = '<div style="background:#111;border:1px solid #1e1e1e;border-radius:16px;padding:20px;">' +
            '<div style="font-size:12px;color:#888;font-weight:700;letter-spacing:1px;margin-bottom:12px;">REGLAS DEL PARTIDO</div>';
        if (isMine) {
            html += '<textarea id="mdb-rules" rows="8" placeholder="Ej: Duración 90 min, árbitro designado, pelota del complejo, cambios ilimitados..." style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:12px;font-size:14px;resize:vertical;margin-bottom:12px;box-sizing:border-box;line-height:1.5;">' + rules + '</textarea>' +
                '<button onclick="MatchDashboard._saveRules(' + JSON.stringify(m.id) + ')" style="width:100%;background:var(--accent);color:#000;border:none;border-radius:12px;padding:12px;font-weight:900;cursor:pointer;">GUARDAR REGLAS</button>';
        } else {
            html += '<div style="font-size:14px;color:#aaa;line-height:1.6;white-space:pre-wrap;">' + (rules || 'Sin reglas definidas aun.') + '</div>';
        }
        html += '</div>';
        _setContent(html);
    }

    window.MatchDashboard._saveRules = async function(matchId) {
        var sb = _getSb();
        if (!sb) return;
        var rulesEl = document.getElementById('mdb-rules');
        var rules = rulesEl ? rulesEl.value.trim() : '';
        await sb.from('matches').update({ rules: rules }).eq('id', matchId).then(undefined, function(){});
        if (_currentMatch) _currentMatch.rules = rules;
        if(typeof showToast==='function') showToast('Reglas guardadas!', 'success');
    };

    // ── CLOSE ──────────────────────────────────────────────────────
    function close() {
        var overlay = document.getElementById('match-dashboard-overlay');
        if (overlay) overlay.remove();
        if (_miniMap) { try { _miniMap.remove(); } catch(e){} _miniMap = null; }
        // Detener el cronómetro al cerrar (no dejar un intervalo huérfano corriendo)
        try { clearInterval(_liveTimer); } catch(e){} _liveTimer = null; _liveRunning = false; _liveSeconds = 0;
        _currentMatchId = null;
        _currentMatch = null;
        _players = [];
    }

    // ── NOTIFICACIONES DISCRETAS EN PARTIDO ──────────────────────
    function _showMatchNotif(message, type) {
        var container = document.getElementById('mdb-notif-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'mdb-notif-container';
            container.style.cssText = 'position:fixed;top:60px;right:12px;z-index:8500;display:flex;flex-direction:column;gap:6px;pointer-events:none;max-width:280px;';
            var overlay = document.getElementById('match-dashboard-overlay');
            if (overlay) overlay.appendChild(container);
            else document.body.appendChild(container);
        }
        var notif = document.createElement('div');
        var bgColor = type === 'chat' ? 'rgba(100,180,255,0.15)' : type === 'join' ? 'rgba(186,255,0,0.15)' : 'rgba(255,255,255,0.1)';
        var borderColor = type === 'chat' ? 'rgba(100,180,255,0.3)' : type === 'join' ? 'rgba(186,255,0,0.3)' : 'rgba(255,255,255,0.15)';
        var icon = type === 'chat' ? 'bx-chat' : type === 'join' ? 'bx-user-plus' : 'bx-bell';
        notif.style.cssText = 'background:' + bgColor + ';backdrop-filter:blur(10px);border:1px solid ' + borderColor + ';border-radius:12px;padding:10px 14px;display:flex;align-items:center;gap:8px;pointer-events:auto;animation:slideInRight .3s ease;cursor:pointer;';
        notif.innerHTML = '<i class="bx ' + icon + '" style="font-size:16px;color:var(--accent);flex-shrink:0;"></i><div style="font-size:12px;color:#ddd;font-weight:600;line-height:1.3;">' + message + '</div>';
        notif.onclick = function() { notif.remove(); };
        container.appendChild(notif);
        setTimeout(function() { try { notif.remove(); } catch(e){} }, 5000);
    }
    window.MatchDashboard._showNotif = _showMatchNotif;

    // Adjuntar los métodos principales al objeto ya inicializado (las funciones
    // _confirm, _proposeBet, etc. ya se asignaron a window.MatchDashboard arriba).
    window.MatchDashboard.open = open;
    window.MatchDashboard.close = close;
    window.MatchDashboard.switchTab = switchTab;
    window.MatchDashboard._openPostMatchLoad = _openPostMatchLoad;
})();

// ── Gestión en tiempo real del partido ─────────────────────────────
var _liveTimer = null;
var _liveSeconds = 0;
var _liveRunning = false;

function _liveControlHtml(m) {
    var matchDuration = m.duration_minutes || 90;
    return '<div style="background:#0a1a0a;border:1px solid rgba(186,255,0,0.25);border-radius:16px;padding:16px;margin-bottom:12px;">' +
        '<div style="font-size:11px;color:var(--accent);font-weight:900;letter-spacing:1px;margin-bottom:12px;display:flex;align-items:center;gap:6px;"><i class="bx bx-time-five" style="font-size:16px;"></i> GESTIÓN EN VIVO</div>' +
        // Cronómetro
        '<div style="text-align:center;margin-bottom:14px;">' +
            '<div id="live-timer" style="font-size:48px;font-weight:900;color:#fff;letter-spacing:4px;font-variant-numeric:tabular-nums;">00:00</div>' +
            '<div style="display:flex;gap:8px;justify-content:center;margin-top:10px;">' +
                '<button onclick="MatchDashboard._startTimer(' + matchDuration + ')" style="background:var(--accent);color:#000;border:none;border-radius:10px;padding:9px 18px;font-weight:900;font-size:12px;cursor:pointer;"><i class="bx bx-play"></i> INICIAR</button>' +
                '<button onclick="MatchDashboard._pauseTimer()" style="background:#111;color:#aaa;border:1px solid #333;border-radius:10px;padding:9px 14px;font-weight:700;font-size:12px;cursor:pointer;"><i class="bx bx-pause"></i></button>' +
                '<button onclick="MatchDashboard._resetTimer()" style="background:#111;color:#555;border:1px solid #222;border-radius:10px;padding:9px 14px;font-weight:700;font-size:12px;cursor:pointer;"><i class="bx bx-reset"></i></button>' +
            '</div>' +
        '</div>' +
        // Marcador
        '<div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:14px;">' +
            '<div style="text-align:center;">' +
                '<div style="font-size:11px;color:#888;margin-bottom:6px;">' + (m.home_club_name||'LOCAL') + '</div>' +
                '<div style="display:flex;align-items:center;gap:6px;">' +
                    '<button onclick="MatchDashboard._addGoal(\'home\')" style="background:var(--accent);color:#000;border:none;border-radius:8px;width:36px;height:36px;font-size:22px;font-weight:900;cursor:pointer;line-height:1;">+</button>' +
                    '<div id="live-home-score" style="font-size:40px;font-weight:900;min-width:50px;text-align:center;">' + (m.home_score||0) + '</div>' +
                    '<button onclick="MatchDashboard._removeGoal(\'home\')" style="background:#1a1a1a;color:#888;border:1px solid #2a2a2a;border-radius:8px;width:36px;height:36px;font-size:22px;cursor:pointer;line-height:1;">-</button>' +
                '</div>' +
            '</div>' +
            '<div style="font-size:20px;color:#555;font-weight:900;">VS</div>' +
            '<div style="text-align:center;">' +
                '<div style="font-size:11px;color:#888;margin-bottom:6px;">' + (m.away_club_name||'VISITANTE') + '</div>' +
                '<div style="display:flex;align-items:center;gap:6px;">' +
                    '<button onclick="MatchDashboard._addGoal(\'away\')" style="background:var(--accent);color:#000;border:none;border-radius:8px;width:36px;height:36px;font-size:22px;font-weight:900;cursor:pointer;line-height:1;">+</button>' +
                    '<div id="live-away-score" style="font-size:40px;font-weight:900;min-width:50px;text-align:center;">' + (m.away_score||0) + '</div>' +
                    '<button onclick="MatchDashboard._removeGoal(\'away\')" style="background:#1a1a1a;color:#888;border:1px solid #2a2a2a;border-radius:8px;width:36px;height:36px;font-size:22px;cursor:pointer;line-height:1;">-</button>' +
                '</div>' +
            '</div>' +
        '</div>' +
        // Botones de acción
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
            '<button onclick="MatchDashboard._logGoal()" style="flex:1;background:rgba(186,255,0,0.08);color:var(--accent);border:1px solid rgba(186,255,0,0.25);border-radius:10px;padding:10px;font-size:11px;font-weight:700;cursor:pointer;"><i class="bx bx-football"></i> GOL / ASIST</button>' +
            '<button onclick="MatchDashboard._endMatch()" style="flex:1;background:rgba(255,77,77,0.08);color:#ff4d4d;border:1px solid rgba(255,77,77,0.25);border-radius:10px;padding:10px;font-size:11px;font-weight:700;cursor:pointer;"><i class="bx bx-stop"></i> FINALIZAR</button>' +
        '</div>' +
    '</div>';
}

var _liveMaxMin = 90;
function _fmtLive(sec){ var m=Math.floor(sec/60), s=sec%60; return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'); }
function _liveTick(){
    _liveSeconds++;
    var el = document.getElementById('live-timer');
    if (el) el.textContent = _fmtLive(_liveSeconds);
    if (Math.floor(_liveSeconds/60) >= (_liveMaxMin||90)) {
        clearInterval(_liveTimer); _liveTimer = null; _liveRunning = false;
        if(typeof showToast==='function') showToast('⏱ ¡Tiempo! El partido terminó.','success');
    }
}
window.MatchDashboard._startTimer = function(maxMin) {
    _liveMaxMin = maxMin || _liveMaxMin || 90;
    clearInterval(_liveTimer);            // idempotente: nunca dos intervalos a la vez
    _liveRunning = true;
    var el = document.getElementById('live-timer'); if (el) el.textContent = _fmtLive(_liveSeconds);
    _liveTimer = setInterval(_liveTick, 1000);
};
window.MatchDashboard._pauseTimer = function() { clearInterval(_liveTimer); _liveTimer = null; _liveRunning = false; };
window.MatchDashboard._resetTimer = function() { clearInterval(_liveTimer); _liveTimer = null; _liveRunning = false; _liveSeconds = 0; var el=document.getElementById('live-timer'); if(el) el.textContent='00:00'; };
// Tras re-renderizar el panel (cambio de tab), refleja el tiempo actual y
// re-engancha el intervalo si estaba corriendo (sin duplicarlo ni perderlo).
window.MatchDashboard._syncTimerUI = function() {
    var el = document.getElementById('live-timer'); if (!el) return;
    el.textContent = _fmtLive(_liveSeconds);
    if (_liveRunning) { clearInterval(_liveTimer); _liveTimer = setInterval(_liveTick, 1000); }
};

window.MatchDashboard._addGoal = async function(team) {
    var m = window.MatchDashboard._currentMatch || {};
    var field = team === 'home' ? 'home_score' : 'away_score';
    var newVal = ((m[field]||0) + 1);
    m[field] = newVal;
    var el = document.getElementById('live-' + team + '-score');
    if (el) el.textContent = newVal;
    var sb = window._sb;
    if (sb && m.id) { var upd = {}; upd[field] = newVal; await sb.from('matches').update(upd).eq('id', m.id).then(undefined, function(){}); }
};
window.MatchDashboard._removeGoal = async function(team) {
    var m = window.MatchDashboard._currentMatch || {};
    var field = team === 'home' ? 'home_score' : 'away_score';
    var newVal = Math.max(0, (m[field]||0) - 1);
    m[field] = newVal;
    var el = document.getElementById('live-' + team + '-score');
    if (el) el.textContent = newVal;
    var sb = window._sb;
    if (sb && m.id) { var upd = {}; upd[field] = newVal; await sb.from('matches').update(upd).eq('id', m.id).then(undefined, function(){}); }
};

window.MatchDashboard._currentMatch = null;
// Sincronizar _currentMatch con el abierto
var _origOpen = window.MatchDashboard.open;
window.MatchDashboard.open = async function(matchId) {
    await _origOpen(matchId);
    // Esperar a que se carguen los datos
    setTimeout(function() {
        var overlay = document.getElementById('match-dashboard-overlay');
        if (overlay) {
            // _currentMatch es variable local dentro del IIFE - acceder desde el objeto global
        }
    }, 500);
};

window.MatchDashboard._logGoal = function() {
    var m = window._currentMdbMatch || {};
    var players = window._currentMdbPlayers || [];
    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
    var playerOpts = players.map(function(p){ return '<option value="' + (p.player_email||'') + '">' + (p.player_name||p.player_email||'Jugador') + '</option>'; }).join('');
    modal.innerHTML = '<div style="background:#111;border:1px solid #2a2a2a;border-radius:16px;width:100%;max-width:340px;padding:20px;">' +
        '<div style="font-size:14px;font-weight:900;margin-bottom:14px;"><i class="bx bx-football" style="color:var(--accent);margin-right:6px;"></i>Registrar Gol</div>' +
        '<label style="font-size:10px;color:#555;font-weight:700;display:block;margin-bottom:4px;">GOLEADOR</label>' +
        '<select id="goal-scorer" style="width:100%;background:#1a1a1a;border:1px solid #2a2a2a;color:#fff;border-radius:10px;padding:10px;font-size:13px;margin-bottom:10px;box-sizing:border-box;">' + playerOpts + '</select>' +
        '<label style="font-size:10px;color:#555;font-weight:700;display:block;margin-bottom:4px;">ASISTENTE (opcional)</label>' +
        '<select id="goal-assist" style="width:100%;background:#1a1a1a;border:1px solid #2a2a2a;color:#fff;border-radius:10px;padding:10px;font-size:13px;margin-bottom:14px;box-sizing:border-box;"><option value="">Sin asistencia</option>' + playerOpts + '</select>' +
        '<div style="display:flex;gap:8px;"><button onclick="this.closest(\'[style*=fixed]\').remove()" style="flex:1;padding:11px;background:transparent;border:1px solid #333;color:#aaa;border-radius:10px;cursor:pointer;font-weight:700;font-size:12px;">Cancelar</button>' +
        '<button onclick="MatchDashboard._saveGoalEvent(document.getElementById(\'goal-scorer\').value,document.getElementById(\'goal-assist\').value);this.closest(\'[style*=fixed]\').remove()" style="flex:2;padding:11px;background:var(--accent);color:#000;border:none;border-radius:10px;cursor:pointer;font-weight:900;font-size:12px;">⚽ GUARDAR</button></div>' +
    '</div>';
    modal.onclick = function(e) { if(e.target===modal) modal.remove(); };
    document.body.appendChild(modal);
};

window.MatchDashboard._saveGoalEvent = async function(scorerEmail, assistEmail) {
    var m = window._currentMdbMatch || {};
    var sb = window._sb;
    if (!sb || !m.id) return;
    var min = Math.floor(_liveSeconds / 60);
    try {
        await sb.from('match_events').insert({ match_id: m.id, type: 'goal', minute: min, player_email: scorerEmail, assist_email: assistEmail||null, team: 'home', created_at: new Date().toISOString() }).then(undefined, function(){});
        // Actualizar stats del goleador
        if (scorerEmail) {
            var { data: u } = await sb.from('users').select('stats').eq('email', scorerEmail).maybeSingle();
            if (u) { var st = u.stats||{}; st.goals = (st.goals||0)+1; await sb.from('users').update({stats:st}).eq('email', scorerEmail).then(undefined, function(){}); }
        }
        if (assistEmail) {
            var { data: ua } = await sb.from('users').select('stats').eq('email', assistEmail).maybeSingle();
            if (ua) { var sta = ua.stats||{}; sta.assists = (sta.assists||0)+1; await sb.from('users').update({stats:sta}).eq('email', assistEmail).then(undefined, function(){}); }
        }
        if(typeof showToast==='function') showToast('⚽ Gol registrado!','success');
    } catch(e) {}
};

window.MatchDashboard._endMatch = async function() {
    if (!confirm('¿Finalizar el partido?')) return;
    var m = window._currentMdbMatch || {};
    var sb = window._sb;
    if (sb && m.id) {
        await sb.from('matches').update({ status: 'finalizado' }).eq('id', m.id).then(undefined, function(){});
    }
    clearInterval(_liveTimer); _liveRunning = false;
    if(typeof showToast==='function') showToast('Partido finalizado. Podés cargar MVP y estadísticas.','success');
    // Reabrir para mostrar opción post-partido
    if(window.MatchDashboard.open) setTimeout(function(){ window.MatchDashboard.open(m.id); }, 500);
};

function _openPostMatchLoad(matchId) {
    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;overflow-y:auto;';
    modal.innerHTML = '<div style="background:#111;border:1px solid #2a2a2a;border-radius:20px;width:100%;max-width:400px;padding:20px;">' +
        '<div style="font-size:14px;font-weight:900;margin-bottom:14px;color:var(--accent);"><i class="bx bx-edit"></i> CARGAR RESULTADO</div>' +
        '<div style="display:flex;gap:10px;margin-bottom:10px;">' +
            '<div style="flex:1;"><label style="font-size:10px;color:#555;font-weight:700;display:block;margin-bottom:4px;">LOCAL</label><input id="pml-home" type="number" min="0" value="0" style="width:100%;background:#1a1a1a;border:1px solid #2a2a2a;color:#fff;border-radius:10px;padding:10px;font-size:20px;text-align:center;font-weight:900;box-sizing:border-box;"></div>' +
            '<div style="display:flex;align-items:flex-end;padding-bottom:10px;font-size:20px;color:#555;font-weight:900;">-</div>' +
            '<div style="flex:1;"><label style="font-size:10px;color:#555;font-weight:700;display:block;margin-bottom:4px;">VISITANTE</label><input id="pml-away" type="number" min="0" value="0" style="width:100%;background:#1a1a1a;border:1px solid #2a2a2a;color:#fff;border-radius:10px;padding:10px;font-size:20px;text-align:center;font-weight:900;box-sizing:border-box;"></div>' +
        '</div>' +
        '<label style="font-size:10px;color:#555;font-weight:700;display:block;margin-bottom:4px;">MVP DEL PARTIDO</label>' +
        '<input id="pml-mvp" type="text" placeholder="Nombre del MVP..." style="width:100%;background:#1a1a1a;border:1px solid #2a2a2a;color:#fff;border-radius:10px;padding:10px;font-size:13px;margin-bottom:14px;box-sizing:border-box;">' +
        '<div style="display:flex;gap:8px;">' +
            '<button onclick="this.closest(\'[style*=fixed]\').remove()" style="flex:1;padding:12px;background:transparent;border:1px solid #333;color:#aaa;border-radius:12px;cursor:pointer;font-weight:700;font-size:12px;">Cancelar</button>' +
            '<button onclick="MatchDashboard._savePostMatch(\'' + matchId + '\');this.closest(\'[style*=fixed]\').remove()" style="flex:2;padding:12px;background:var(--accent);color:#000;border:none;border-radius:12px;cursor:pointer;font-weight:900;font-size:12px;">GUARDAR</button>' +
        '</div>' +
    '</div>';
    modal.onclick = function(e) { if(e.target===modal) modal.remove(); };
    document.body.appendChild(modal);
}
window.MatchDashboard._openPostMatchLoad = _openPostMatchLoad;

window.MatchDashboard._savePostMatch = async function(matchId) {
    var home = parseInt(document.getElementById('pml-home')?.value||'0');
    var away = parseInt(document.getElementById('pml-away')?.value||'0');
    var mvp = (document.getElementById('pml-mvp')?.value||'').trim();
    var sb = window._sb;
    if (!sb) return;
    try {
        await sb.from('matches').update({ home_score: home, away_score: away, status: 'finalizado', mvp_name: mvp||null }).eq('id', matchId);
        if(typeof showToast==='function') showToast('Resultado cargado ✓','success');
    } catch(e) { if(typeof showToast==='function') showToast('Error: '+e.message,'error'); }
};
