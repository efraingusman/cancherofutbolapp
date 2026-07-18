// ============================================================
// CANCHERO LIVE — Sistema de Directos en Vivo
// Broadcaster + Viewer + Realtime + Storage Chunks
// ============================================================
(function() {
'use strict';

// ── Estado Global del Broadcaster ────────────────────────────
let _stream        = null;   // MediaStream activo
let _recorder      = null;   // MediaRecorder
let _chunks        = [];     // chunks grabados
let _streamId      = null;   // ID del directo en Supabase
let _chunkIndex    = 0;      // contador de chunks subidos
let _chunkTimer    = null;   // intervalo de upload
let _facingMode    = 'environment'; // 'environment' | 'user'
let _isPaused      = false;
let _isLive        = false;
let _realtimeChannel = null;
let _currentLineup = [];     // [{name, pos, email, isGK, isSub}]
let _currentFormation = '4-3-3';
let _scoreHome     = 0;
let _scoreAway     = 0;
let _matchId       = null;
let _teamName      = '';
let _rivalName     = '';
let _teamLogo      = '';
let _rivalLogo     = '';
let _liveCity      = '';
let _liveCountry   = '';
let _matchMinute   = 0;
let _minuteTimer   = null;

// ── Estado Global del Viewer ─────────────────────────────────
let _viewStreamId  = null;
let _viewChannel   = null;
let _mediaSource   = null;
let _sourceBuffer  = null;
let _viewChunkNext = 0;
let _viewFetchTimer = null;

const sb = () => window._sb;

// ============================================================
// FLUJO: ABRIR MODAL PRE-DIRECTO
// ============================================================
async function openPreLiveModal() {
    if (!window.userData || !sb()) {
        if (typeof showToast === 'function') showToast('Iniciá sesión para iniciar un directo.', 'warning');
        return;
    }
    const myEmail = window.userData.email;

    // Cargar equipos del usuario (propios y como miembro)
    const [{ data: memberships }, { data: ownedClubs }] = await Promise.all([
        sb().from('club_members').select('club_id, clubs(id, name)').eq('member_email', myEmail),
        sb().from('clubs').select('id, name').eq('owner_email', myEmail)
    ]);

    const teams = [];
    if (memberships) memberships.forEach(m => {
        if (m.clubs) teams.push({ id: m.clubs.id, name: m.clubs.name });
    });
    if (ownedClubs) ownedClubs.forEach(c => {
        if (!teams.find(t => t.id === c.id)) teams.push(c);
    });

    const modal = document.getElementById('pre-live-modal');
    if (!modal) return;

    // Poblar select de equipos (puede estar vacío: se permite directo manual)
    const teamSel = document.getElementById('prelive-team-select');
    teamSel.innerHTML = '<option value="">Seleccioná tu equipo (o escribilo abajo)</option>';
    teams.forEach(t => teamSel.appendChild(new Option(t.name, t.id)));

    const titleEl = document.getElementById('prelive-title');
    if (titleEl) titleEl.value = '';
    ['prelive-myteam','prelive-rival','prelive-country','prelive-city'].forEach(function(id){
        var el = document.getElementById(id); if (el) el.value = '';
    });
    // reset escudos
    _teamLogo = ''; _rivalLogo = '';
    ['team','rival'].forEach(function(w){
        var img = document.getElementById('prelive-'+w+'-logo-preview');
        var icon = document.getElementById('prelive-'+w+'-logo-icon');
        if (img) { img.src=''; img.style.display='none'; }
        if (icon) icon.style.display='';
    });
    const lineupCont = document.getElementById('prelive-lineup-container');
    if (lineupCont) lineupCont.innerHTML = '';
    const matchSel = document.getElementById('prelive-match-select');
    if (matchSel) matchSel.innerHTML = '<option value="">Partido (opcional, si está anotado)</option>';

    modal.style.display = 'flex';
}

async function loadTeamDataForPreLive(teamId) {
    if (!teamId) return;
    const matchSel = document.getElementById('prelive-match-select');
    const lineupContainer = document.getElementById('prelive-lineup-container');

    const teamSel = document.getElementById('prelive-team-select');
    _teamName = teamSel?.options[teamSel.selectedIndex]?.text || '';

    // Capturar el escudo del club seleccionado (para la portada del directo)
    try {
        const { data: club } = await sb().from('clubs').select('logo_url, logo').eq('id', teamId).single();
        _teamLogo = (club && (club.logo_url || club.logo)) || '';
    } catch(e) { _teamLogo = ''; }

    if (matchSel) matchSel.innerHTML = '<option value="">Cargando partidos...</option>';

    const { data: matches } = await sb()
        .from('matches')
        .select('id, team_a_name, team_b_name, scheduled_at, status')
        .or(`team_a_name.ilike.%${_teamName}%,team_b_name.ilike.%${_teamName}%`)
        .in('status', ['scheduled', 'live', 'playing'])
        .order('scheduled_at', { ascending: true })
        .limit(20);

    if (matchSel) {
        matchSel.innerHTML = '<option value="">Seleccioná el partido</option>';
        if (matches && matches.length > 0) {
            matches.forEach(m => {
                const label = `${m.team_a_name || '?'} vs ${m.team_b_name || '?'}`;
                matchSel.appendChild(new Option(label, m.id));
            });
        } else {
            matchSel.innerHTML = '<option value="">Sin partidos programados — podés continuar igual</option>';
        }
    }

    // Cargar plantel — intentar con ambos nombres de columna (member_email / player_email)
    let membersRaw = [];
    try {
        const { data: d1 } = await sb().from('club_members').select('*').eq('club_id', teamId);
        membersRaw = d1 || [];
    } catch(e) {}
    // Normalizar columnas: member_email o player_email
    const members = membersRaw.map(m => ({
        member_email: m.member_email || m.player_email || m.email || '',
        member_name:  m.member_name  || m.player_name  || m.name  || (m.member_email||m.player_email||'').split('@')[0],
        position:     m.position || m.pos || '',
        is_goalkeeper: m.is_goalkeeper || m.role === 'portero' || false
    }));

    _currentLineup = [];
    if (lineupContainer) lineupContainer.innerHTML = '';

    if (members && members.length > 0) {
        if (lineupContainer) lineupContainer.innerHTML = `
            <div style="color:#baff00;font-size:11px;font-weight:900;letter-spacing:2px;margin:12px 0 8px;">TITULARES</div>
            <div id="prelive-starters" style="display:grid;gap:6px;"></div>
            <div style="color:#888;font-size:11px;font-weight:900;letter-spacing:2px;margin:16px 0 8px;">SUPLENTES</div>
            <div id="prelive-subs" style="display:grid;gap:6px;"></div>
        `;
        const startersDiv = document.getElementById('prelive-starters');
        const subsDiv = document.getElementById('prelive-subs');

        members.forEach((m, i) => {
            const isStarter = i < 11;
            const player = {
                name: m.member_name || m.member_email?.split('@')[0] || 'Jugador',
                email: m.member_email,
                pos: m.position || (m.is_goalkeeper ? 'ARQ' : 'JUG'),
                isGK: m.is_goalkeeper || false,
                isSub: !isStarter
            };
            _currentLineup.push(player);

            const div = document.createElement('div');
            div.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:10px;cursor:pointer;border:1px solid transparent;';
            div.dataset.email = m.member_email;
            div.innerHTML = `
                <div style="width:32px;height:32px;border-radius:50%;background:#111;border:2px solid ${m.is_goalkeeper?'#ff4444':'var(--accent)'};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#fff;">
                    ${player.name.substring(0,2).toUpperCase()}
                </div>
                <div style="flex:1;">
                    <div style="font-size:13px;font-weight:700;">${player.name}</div>
                    <div style="font-size:11px;color:#555;">${player.pos}</div>
                </div>
                <div style="font-size:11px;font-weight:600;color:${isStarter?'var(--accent)':'#555'};">${isStarter?'TITULAR':'SUP'}</div>
            `;
            if (isStarter && startersDiv) startersDiv.appendChild(div);
            else if (subsDiv) subsDiv.appendChild(div);
        });
    } else {
        if (lineupContainer) lineupContainer.innerHTML = '<div style="color:#555;font-size:13px;padding:16px 0;">No hay jugadores registrados en este equipo. Podés iniciar el directo igual.</div>';
    }

    // Formation selector
    const formationEl = document.getElementById('prelive-formation');
    if (formationEl) {
        const formations = ['4-3-3','4-4-2','3-5-2','4-2-3-1','5-3-2','2-3-1','3-2-1'];
        formationEl.innerHTML = formations.map(f =>
            `<option value="${f}"${f===_currentFormation?' selected':''}>${f}</option>`
        ).join('');
    }
}

// ============================================================
// FLUJO: INICIAR DIRECTO
// Elegir escudo (base64) para tu equipo o el rival, con preview
function pickLogo(event, which) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = e.target.result;
        if (which === 'rival') _rivalLogo = data; else _teamLogo = data;
        const img = document.getElementById('prelive-' + which + '-logo-preview');
        const icon = document.getElementById('prelive-' + which + '-logo-icon');
        if (img) { img.src = data; img.style.display = 'block'; }
        if (icon) icon.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// ============================================================
async function startLive() {
    // Equipo propio: del select o escrito a mano
    const myTeamManual = document.getElementById('prelive-myteam')?.value?.trim() || '';
    if (myTeamManual) _teamName = myTeamManual;
    const rivalName = document.getElementById('prelive-rival')?.value?.trim() || '';
    const country = document.getElementById('prelive-country')?.value?.trim() || '';
    const city = document.getElementById('prelive-city')?.value?.trim() || '';
    if (!_teamName) _teamName = (window.userData && (window.userData.name || window.userData.email)) || 'Mi equipo';

    const titleEl = document.getElementById('prelive-title');
    // Construir título: usa el escrito, o "Equipo vs Rival", agregando ciudad si hay
    let title = titleEl?.value?.trim() || '';
    if (!title) {
        title = rivalName ? `${_teamName} vs ${rivalName}` : `Partido en Vivo — ${_teamName}`;
        if (city || country) title += ` · ${[city, country].filter(Boolean).join(', ')}`;
    }
    // guardar metadatos para el resto del flujo
    _rivalName = rivalName; _liveCity = city; _liveCountry = country;
    const matchSel = document.getElementById('prelive-match-select');
    _matchId = matchSel?.value || null;
    _currentFormation = document.getElementById('prelive-formation')?.value || '4-3-3';
    _scoreHome = 0;
    _scoreAway = 0;
    _chunkIndex = 0;
    _isPaused = false;
    _matchMinute = 0;

    const { data: liveData, error } = await sb().from('live_streams').insert({
        title,
        streamer_name: window.userData.name || window.userData.email,
        streamer_email: window.userData.email,
        status: 'live',
        started_at: new Date().toISOString(),
        match_id: _matchId || null,
        team_name: _teamName,
        score_home: 0,
        score_away: 0,
        lineup: _currentLineup,
        formation: _currentFormation,
        viewer_count: 0,
        chunk_count: 0,
        rival_name: _rivalName || null,
        team_logo: _teamLogo || null,
        rival_logo: _rivalLogo || null,
        city: _liveCity || null,
        country: _liveCountry || null
    }).select().single();

    if (error || !liveData) {
        if (typeof showToast === 'function') showToast('Error al iniciar el directo: ' + (error?.message || 'desconocido'), 'error');
        return;
    }

    _streamId = liveData.id;
    _isLive = true;

    document.getElementById('pre-live-modal').style.display = 'none';
    openBroadcasterUI(title);
    await startCamera();

    // Suscribir a Realtime
    _realtimeChannel = sb().channel(`live-${_streamId}`)
        .on('broadcast', { event: 'score_update' }, ({ payload }) => {
            _scoreHome = payload.home;
            _scoreAway = payload.away;
            updateBroadcasterScore();
        });
    _realtimeChannel.subscribe();

    // Contador de minutos
    _minuteTimer = setInterval(() => {
        if (!_isPaused) {
            _matchMinute++;
            const el = document.getElementById('live-minute-display');
            if (el) el.textContent = `${_matchMinute}'`;
        }
    }, 60000);

    // Registros de fijado pendientes para el plantel
    if (_currentLineup.length > 0) {
        const pinnedRecords = _currentLineup
            .filter(p => p.email)
            .map(p => ({ stream_id: _streamId, user_email: p.email, user_name: p.name, accepted: null }));
        if (pinnedRecords.length > 0) {
            await sb().from('profile_pinned_lives').insert(pinnedRecords).catch(() => {});
        }
    }
    // El broadcaster acepta automáticamente
    await sb().from('profile_pinned_lives').upsert({
        stream_id: _streamId,
        user_email: window.userData.email,
        user_name: window.userData.name || window.userData.email,
        accepted: true
    }, { onConflict: 'stream_id,user_email' }).catch(() => {});

    if (typeof showToast === 'function') showToast('¡Directo iniciado! Estás en vivo.', 'success');
}

// ── Iniciar Cámara ───────────────────────────────────────────
async function startCamera() {
    if (_stream) { _stream.getTracks().forEach(t => t.stop()); }

    let stream;
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: _facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: true
        });
    } catch(e) {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: _facingMode }, audio: true });
        } catch(e2) {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        }
    }

    _stream = stream;
    const vid = document.getElementById('live-broadcast-video');
    if (vid) { vid.srcObject = stream; vid.play().catch(()=>{}); }

    startRecording();
}

function startRecording() {
    if (_recorder && _recorder.state !== 'inactive') {
        try { _recorder.stop(); } catch(e) {}
    }
    clearInterval(_chunkTimer);

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

    try {
        _recorder = new MediaRecorder(_stream, { mimeType, videoBitsPerSecond: 2500000 });
    } catch(e) {
        _recorder = new MediaRecorder(_stream);
    }
    _chunks = [];

    _recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) _chunks.push(e.data);
    };

    _recorder.onstop = () => {
        if (_chunks.length > 0 && _streamId) uploadChunk();
    };

    // Chunk cada 5 segundos
    _chunkTimer = setInterval(() => {
        if (_recorder && _recorder.state === 'recording') {
            _recorder.stop();
            setTimeout(() => {
                if (_isLive && !_isPaused) {
                    try { _recorder.start(); } catch(e) {}
                }
            }, 200);
        }
    }, 5000);

    try { _recorder.start(); } catch(e) {}
}

async function uploadChunk() {
    if (!_streamId || _chunks.length === 0) return;
    const mimeType = (_recorder && _recorder.mimeType) ? _recorder.mimeType : 'video/webm';
    const blob = new Blob(_chunks, { type: mimeType });
    _chunks = [];
    const path = `${_streamId}/chunk_${String(_chunkIndex).padStart(5,'0')}.webm`;
    _chunkIndex++;

    const { error } = await sb().storage.from('live-chunks').upload(path, blob, {
        contentType: mimeType,
        upsert: true
    });

    if (!error) {
        await sb().from('live_streams').update({ chunk_count: _chunkIndex }).eq('id', _streamId).catch(()=>{});
    }
}

// ── Cambiar Cámara ───────────────────────────────────────────
async function flipCamera() {
    _facingMode = _facingMode === 'environment' ? 'user' : 'environment';
    await startCamera();
}

// ── Pausar / Reanudar ────────────────────────────────────────
function togglePause() {
    _isPaused = !_isPaused;
    const btn = document.getElementById('live-pause-btn');
    if (_isPaused) {
        if (_recorder && _recorder.state === 'recording') { try { _recorder.pause(); } catch(e) {} }
        if (btn) btn.innerHTML = `<i class='bx bx-play' style="font-size:22px;"></i><span style="font-size:11px;">REANUDAR</span>`;
        if (typeof showToast === 'function') showToast('Directo pausado', 'info');
    } else {
        if (_recorder && _recorder.state === 'paused') { try { _recorder.resume(); } catch(e) {} }
        if (btn) btn.innerHTML = `<i class='bx bx-pause' style="font-size:22px;"></i><span style="font-size:11px;">PAUSAR</span>`;
        if (typeof showToast === 'function') showToast('Directo reanudado', 'success');
    }
}

// ── Terminar Directo ─────────────────────────────────────────
function endLive() {
    if (!confirm('¿Terminar el directo?')) return;

    clearInterval(_chunkTimer);
    clearInterval(_minuteTimer);

    if (_recorder && _recorder.state !== 'inactive') { try { _recorder.stop(); } catch(e) {} }
    if (_stream) _stream.getTracks().forEach(t => t.stop());
    if (_realtimeChannel) { try { sb().removeChannel(_realtimeChannel); } catch(e) {} }

    if (_streamId) {
        sb().from('live_streams').update({
            status: 'ended',
            ended_at: new Date().toISOString()
        }).eq('id', _streamId).catch(()=>{});
    }

    _isLive = false;
    const ui = document.getElementById('live-broadcaster-ui');
    if (ui) ui.style.display = 'none';

    // Unlock orientation
    if (screen.orientation && screen.orientation.unlock) {
        try { screen.orientation.unlock(); } catch(e) {}
    }

    openSaveMatchModal();
}

// ── Terminar un directo atascado (desde la lista, sin estar transmitiendo) ──
async function finishStuckLive(streamId) {
    if (!streamId) return;
    const choice = confirm('Este directo sigue marcado como EN VIVO.\n\nAceptar = Terminar y guardar (queda disponible 12h)\nCancelar = no hacer nada');
    if (!choice) return;
    try {
        await sb().from('live_streams').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', streamId);
        if (typeof showToast === 'function') showToast('✅ Directo finalizado y guardado.', 'success');
    } catch(e) {
        if (typeof showToast === 'function') showToast('No se pudo finalizar: ' + (e.message||''), 'error');
    }
    loadLiveStreamsList();
}

// ── Detectar directos propios sin terminar al abrir/volver a la app ──
async function checkUnfinishedLives() {
    if (!window.userData || !window.userData.email || !sb()) return;
    try {
        const { data } = await sb().from('live_streams')
            .select('id,title,started_at').eq('streamer_email', window.userData.email).eq('status', 'live')
            .order('started_at', { ascending: false }).limit(1);
        if (data && data.length) {
            const s = data[0];
            // Aviso discreto para terminarlo
            if (confirm('Tenés un directo sin finalizar ("' + (s.title||'Partido') + '").\n\n¿Querés terminarlo y guardarlo ahora?')) {
                await finishStuckLive(s.id);
            }
        }
    } catch(e) {}
}

// ── Pausar automáticamente al minimizar/salir de la app durante un directo ──
let _pausedByVisibility = false;
document.addEventListener('visibilitychange', function() {
    if (!_isLive) return;
    if (document.hidden) {
        // Pausar la grabación al salir de la app
        if (!_isPaused) { try { togglePause(); _pausedByVisibility = true; } catch(e) {} }
    } else if (_pausedByVisibility) {
        _pausedByVisibility = false;
        // Volvió a la app: preguntar qué hacer
        setTimeout(function() {
            const cont = confirm('Volviste al directo (estaba pausado).\n\nAceptar = Reanudar la transmisión\nCancelar = Terminar y guardar/publicar');
            if (cont) {
                if (_isPaused) { try { togglePause(); } catch(e) {} }
            } else {
                try { endLive(); } catch(e) {}
            }
        }, 300);
    }
});

// Aviso si intenta cerrar la pestaña mientras transmite
window.addEventListener('beforeunload', function(e) {
    if (_isLive) {
        e.preventDefault();
        e.returnValue = 'Tenés un directo en curso. Si salís se pausará — terminalo para guardarlo.';
        return e.returnValue;
    }
});

// ── Modal Guardar Partido ────────────────────────────────────
function openSaveMatchModal() {
    const modal = document.getElementById('live-save-modal');
    if (!modal) return;
    const defaultName = `${_teamName || 'Mi Equipo'} — Partido ${new Date().toLocaleDateString('es-UY')}`;
    const nameEl = document.getElementById('save-match-name');
    if (nameEl) nameEl.value = defaultName;
    modal.style.display = 'flex';
}

async function saveMatchRecording(name) {
    if (!_streamId) {
        const modal = document.getElementById('live-save-modal');
        if (modal) modal.style.display = 'none';
        return;
    }
    const expiresAt = new Date(Date.now() + 12 * 3600 * 1000).toISOString();
    await sb().from('live_streams').update({
        title: name || 'Partido guardado',
        status: 'ended',
        ended_at: new Date().toISOString(),
        expires_at: expiresAt
    }).eq('id', _streamId).catch(()=>{});
    const modal = document.getElementById('live-save-modal');
    if (modal) modal.style.display = 'none';
    if (typeof showToast === 'function') showToast('¡Directo guardado! Disponible por 12 horas.', 'success');
    loadLiveStreamsList();
}

// ============================================================
// MARCADOR Y EVENTOS DE PARTIDO
// ============================================================
function openScoreModal() {
    const modal = document.getElementById('live-score-modal');
    if (!modal) return;
    const hEl = document.getElementById('score-home-val');
    const aEl = document.getElementById('score-away-val');
    if (hEl) hEl.textContent = _scoreHome;
    if (aEl) aEl.textContent = _scoreAway;
    modal.style.display = 'flex';
}

function adjustScore(team, delta) {
    if (team === 'home') _scoreHome = Math.max(0, _scoreHome + delta);
    else _scoreAway = Math.max(0, _scoreAway + delta);
    const hEl = document.getElementById('score-home-val');
    const aEl = document.getElementById('score-away-val');
    if (hEl) hEl.textContent = _scoreHome;
    if (aEl) aEl.textContent = _scoreAway;
    updateBroadcasterScore();
    syncScoreToSupabase();
}

async function syncScoreToSupabase() {
    if (!_streamId) return;
    await sb().from('live_streams').update({
        score_home: _scoreHome,
        score_away: _scoreAway
    }).eq('id', _streamId).catch(()=>{});

    if (_realtimeChannel) {
        _realtimeChannel.send({
            type: 'broadcast',
            event: 'score_update',
            payload: { home: _scoreHome, away: _scoreAway }
        }).catch(()=>{});
    }
}

function updateBroadcasterScore() {
    const el = document.getElementById('live-score-display');
    if (el) el.textContent = `${_scoreHome} - ${_scoreAway}`;
}

// ── Modal Evento (Gol / Asistencia) ─────────────────────────
function openEventModal(eventType) {
    const modal = document.getElementById('live-event-modal');
    if (!modal) return;
    const titleEl = document.getElementById('event-modal-title');
    if (titleEl) titleEl.textContent =
        eventType === 'goal' ? '⚽ GOL — ¿Quién metió?' :
        eventType === 'assist' ? '🎯 ASISTENCIA — ¿Quién asistió?' : '📢 EVENTO';
    const hiddenEl = document.getElementById('event-type-hidden');
    if (hiddenEl) hiddenEl.value = eventType;

    const list = document.getElementById('event-players-list');
    if (!list) return;
    list.innerHTML = '';

    const players = _currentLineup.filter(p => !p.isSub);
    if (players.length === 0) {
        list.innerHTML = '<div style="color:#555;padding:16px;">No hay jugadores titulares en el plantel.</div>';
    } else {
        players.forEach(p => {
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;align-items:center;gap:12px;padding:14px;border-bottom:1px solid #1a1a1a;cursor:pointer;transition:background 0.2s;';
            div.innerHTML = `
                <div style="width:36px;height:36px;border-radius:50%;background:#111;border:2px solid ${p.isGK?'#ff4444':'var(--accent)'};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#fff;">${p.name.substring(0,2).toUpperCase()}</div>
                <div><div style="font-size:14px;font-weight:700;">${p.name}</div><div style="font-size:11px;color:#555;">${p.pos}</div></div>
            `;
            div.onclick = () => registerEvent(eventType, p);
            div.onmouseenter = () => { div.style.background = 'rgba(186,255,0,0.06)'; };
            div.onmouseleave = () => { div.style.background = ''; };
            list.appendChild(div);
        });
    }
    modal.style.display = 'flex';
}

async function registerEvent(eventType, player) {
    const modal = document.getElementById('live-event-modal');
    if (modal) modal.style.display = 'none';
    if (!_streamId) return;

    if (eventType === 'goal') {
        _scoreHome++;
        updateBroadcasterScore();
        syncScoreToSupabase();
        if (typeof showToast === 'function') showToast(`⚽ ¡Gol de ${player.name}!`, 'success');
    } else if (eventType === 'assist') {
        if (typeof showToast === 'function') showToast(`🎯 Asistencia de ${player.name}`, 'success');
    }

    await sb().from('live_stream_events').insert({
        stream_id: _streamId,
        event_type: eventType,
        player_name: player.name,
        player_email: player.email,
        minute: _matchMinute,
        team: 'home'
    }).catch(()=>{});

    if (_realtimeChannel) {
        _realtimeChannel.send({
            type: 'broadcast',
            event: 'match_event',
            payload: { type: eventType, player: player.name, minute: _matchMinute }
        }).catch(()=>{});
    }
}

// ── Modal Cambio / Sustitución ───────────────────────────────
function openSubModal() {
    const modal = document.getElementById('live-sub-modal');
    if (!modal) return;

    const startersList = document.getElementById('sub-starters-list');
    const subsList = document.getElementById('sub-bench-list');
    if (startersList) startersList.innerHTML = '';
    if (subsList) subsList.innerHTML = '';

    let selectedOut = null;

    _currentLineup.filter(p => !p.isSub).forEach(p => {
        const div = document.createElement('div');
        div.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px;border-bottom:1px solid #1a1a1a;cursor:pointer;transition:background 0.2s;';
        div.innerHTML = `<div style="width:32px;height:32px;border-radius:50%;background:#111;border:2px solid var(--accent);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;">${p.name.substring(0,2).toUpperCase()}</div><div><div style="font-size:13px;font-weight:700;">${p.name}</div><div style="font-size:11px;color:#555;">${p.pos}</div></div>`;
        div.onclick = () => {
            if (startersList) startersList.querySelectorAll('div[data-sel]').forEach(d => { d.style.background = ''; delete d.dataset.sel; });
            div.style.background = 'rgba(186,255,0,0.1)';
            div.dataset.sel = '1';
            selectedOut = p;
        };
        if (startersList) startersList.appendChild(div);
    });

    _currentLineup.filter(p => p.isSub).forEach(p => {
        const div = document.createElement('div');
        div.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px;border-bottom:1px solid #1a1a1a;cursor:pointer;transition:background 0.2s;';
        div.innerHTML = `<div style="width:32px;height:32px;border-radius:50%;background:#111;border:2px solid #555;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;">${p.name.substring(0,2).toUpperCase()}</div><div><div style="font-size:13px;font-weight:700;">${p.name}</div><div style="font-size:11px;color:#555;">${p.pos} — SUPLENTE</div></div>`;
        div.onclick = () => {
            if (!selectedOut) {
                if (typeof showToast === 'function') showToast('Primero seleccioná quién sale.', 'warning');
                return;
            }
            confirmSubstitution(selectedOut, p);
        };
        if (subsList) subsList.appendChild(div);
    });

    if (_currentLineup.filter(p => p.isSub).length === 0 && subsList) {
        subsList.innerHTML = '<div style="color:#555;font-size:13px;padding:12px;">No hay suplentes registrados.</div>';
    }

    modal.style.display = 'flex';
}

async function confirmSubstitution(playerOut, playerIn) {
    const modal = document.getElementById('live-sub-modal');
    if (modal) modal.style.display = 'none';

    const outIdx = _currentLineup.findIndex(p => p.email === playerOut.email);
    const inIdx  = _currentLineup.findIndex(p => p.email === playerIn.email);
    if (outIdx !== -1) _currentLineup[outIdx].isSub = true;
    if (inIdx !== -1)  _currentLineup[inIdx].isSub = false;

    if (typeof showToast === 'function') showToast(`🔄 Cambio: entra ${playerIn.name}, sale ${playerOut.name}`, 'success');

    await sb().from('live_stream_events').insert({
        stream_id: _streamId,
        event_type: 'substitution',
        player_name: `${playerIn.name} ↔ ${playerOut.name}`,
        minute: _matchMinute,
        team: 'home'
    }).catch(()=>{});

    await sb().from('live_streams').update({ lineup: _currentLineup }).eq('id', _streamId).catch(()=>{});

    if (_realtimeChannel) {
        _realtimeChannel.send({
            type: 'broadcast',
            event: 'match_event',
            payload: { type: 'substitution', player: `${playerIn.name} por ${playerOut.name}`, minute: _matchMinute }
        }).catch(()=>{});
    }
}

// ============================================================
// UI BROADCASTER FULLSCREEN
// ============================================================
function openBroadcasterUI(title) {
    const ui = document.getElementById('live-broadcaster-ui');
    if (!ui) return;
    const titleEl = document.getElementById('live-broadcast-title');
    if (titleEl) titleEl.textContent = title;
    updateBroadcasterScore();
    ui.style.display = 'flex';

    // Intentar lock landscape
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
    }

    // Toggle controls al tocar pantalla
    const vid = document.getElementById('live-broadcast-video');
    const controls = document.getElementById('live-broadcast-controls');
    if (vid && controls) {
        vid.onclick = () => {
            controls.style.opacity = controls.style.opacity === '0' ? '1' : '0';
            controls.style.pointerEvents = controls.style.opacity === '0' ? 'none' : 'auto';
        };
    }
}

// ============================================================
// VIEWER — Espectador
// ============================================================
async function joinLiveStream(streamId) {
    _viewStreamId = streamId;
    _viewChunkNext = 0;

    const { data: stream } = await sb().from('live_streams').select('*').eq('id', streamId).single();
    if (!stream) {
        if (typeof showToast === 'function') showToast('Directo no disponible.', 'error');
        return;
    }

    const modal = document.getElementById('live-viewer-modal');
    if (!modal) return;

    const titleEl = document.getElementById('viewer-title');
    const scoreEl = document.getElementById('viewer-score');
    const teamEl  = document.getElementById('viewer-team');
    if (titleEl) titleEl.textContent = stream.title || 'Partido en Vivo';
    if (scoreEl) scoreEl.textContent = `${stream.score_home || 0} - ${stream.score_away || 0}`;
    if (teamEl)  teamEl.textContent  = stream.team_name || '';

    const commentInput = document.getElementById('viewer-comment-input');
    const commentsList = document.getElementById('viewer-comments-list');
    const predList = document.getElementById('viewer-predictions-list');
    if (commentInput) commentInput.value = '';
    if (commentsList) commentsList.innerHTML = '';
    if (predList) predList.innerHTML = '';

    modal.style.display = 'flex';

    // Suscribir a Realtime
    if (_viewChannel) { try { sb().removeChannel(_viewChannel); } catch(e) {} }
    _viewChannel = sb().channel(`live-${streamId}`)
        .on('broadcast', { event: 'score_update' }, ({ payload }) => {
            const el = document.getElementById('viewer-score');
            if (el) {
                el.textContent = `${payload.home} - ${payload.away}`;
                el.style.animation = 'none';
                setTimeout(() => { el.style.animation = 'scoreFlash 0.5s ease'; }, 10);
            }
        })
        .on('broadcast', { event: 'match_event' }, ({ payload }) => {
            addViewerEventNotification(payload);
        })
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'live_stream_comments',
            filter: `stream_id=eq.${streamId}`
        }, ({ new: comment }) => {
            appendComment(comment);
        });
    _viewChannel.subscribe();

    // Incrementar viewer_count
    sb().from('live_streams').update({ viewer_count: (stream.viewer_count || 0) + 1 }).eq('id', streamId).catch(()=>{});

    // Cargar contenido existente
    loadViewerComments(streamId);
    loadViewerPredictions(streamId);
    loadLikeCount(streamId);

    // Iniciar playback de chunks
    startViewerChunkPlayback(streamId, stream.chunk_count || 0);
}

async function startViewerChunkPlayback(streamId, totalChunks) {
    const vid = document.getElementById('live-viewer-video');
    if (!vid) return;

    if (!window.MediaSource || !MediaSource.isTypeSupported('video/webm;codecs=vp9,opus')) {
        // Fallback: ocultar video, solo mostrar datos en tiempo real
        vid.style.display = 'none';
        const placeholder = document.getElementById('viewer-video-placeholder');
        if (placeholder) placeholder.style.display = 'flex';
        return;
    }

    _mediaSource = new MediaSource();
    vid.src = URL.createObjectURL(_mediaSource);

    _mediaSource.addEventListener('sourceopen', async () => {
        const mimeType = 'video/webm;codecs=vp9,opus';
        try {
            _sourceBuffer = _mediaSource.addSourceBuffer(mimeType);
        } catch(e) { return; }

        _viewChunkNext = Math.max(0, totalChunks - 3);

        const fetchNextChunk = async () => {
            if (!_viewStreamId) return;
            try {
                const path = `${streamId}/chunk_${String(_viewChunkNext).padStart(5,'0')}.webm`;
                const { data: blob } = await sb().storage.from('live-chunks').download(path);
                if (blob && _sourceBuffer && !_sourceBuffer.updating) {
                    const buf = await blob.arrayBuffer();
                    _sourceBuffer.appendBuffer(buf);
                    _viewChunkNext++;
                    if (vid.paused) vid.play().catch(()=>{});
                }
            } catch(e) {}
            _viewFetchTimer = setTimeout(fetchNextChunk, 6000);
        };

        fetchNextChunk();
    });
}

async function loadViewerComments(streamId) {
    const { data } = await sb().from('live_stream_comments')
        .select('*').eq('stream_id', streamId)
        .order('created_at', { ascending: true }).limit(50);
    if (data) data.forEach(appendComment);
}

function appendComment(c) {
    const list = document.getElementById('viewer-comments-list');
    if (!list) return;
    const div = document.createElement('div');
    div.style.cssText = 'padding:8px 0;border-bottom:1px solid #111;';
    div.innerHTML = `<span style="font-size:12px;font-weight:700;color:var(--accent);">${c.user_name || 'Anón'}</span> <span style="font-size:12px;color:#ccc;">${c.content}</span>`;
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
}

async function sendViewerComment() {
    if (!window.userData || !_viewStreamId) {
        if (typeof showToast === 'function') showToast('Iniciá sesión para comentar.', 'warning');
        return;
    }
    const input = document.getElementById('viewer-comment-input');
    const content = input?.value?.trim();
    if (!content) return;
    input.value = '';
    await sb().from('live_stream_comments').insert({
        stream_id: _viewStreamId,
        user_email: window.userData.email,
        user_name: window.userData.name || window.userData.email,
        content
    }).catch(()=>{});
}

async function toggleViewerLike() {
    if (!window.userData || !_viewStreamId) {
        if (typeof showToast === 'function') showToast('Iniciá sesión para dar like.', 'warning');
        return;
    }
    const { data: existing } = await sb().from('live_stream_reactions')
        .select('id').eq('stream_id', _viewStreamId).eq('user_email', window.userData.email).maybeSingle();
    if (existing) {
        await sb().from('live_stream_reactions').delete().eq('id', existing.id).catch(()=>{});
        if (typeof showToast === 'function') showToast('Like quitado', 'info');
    } else {
        await sb().from('live_stream_reactions').insert({ stream_id: _viewStreamId, user_email: window.userData.email }).catch(()=>{});
        if (typeof showToast === 'function') showToast('❤️ Le diste like al directo', 'success');
    }
    loadLikeCount(_viewStreamId);
}

async function loadLikeCount(streamId) {
    const { count } = await sb().from('live_stream_reactions').select('*', { count: 'exact', head: true }).eq('stream_id', streamId);
    const el = document.getElementById('viewer-like-count');
    if (el) el.textContent = count || 0;
}

async function loadViewerPredictions(streamId) {
    const { data } = await sb().from('live_stream_predictions').select('*').eq('stream_id', streamId).order('created_at', { ascending: false }).limit(20);
    const list = document.getElementById('viewer-predictions-list');
    if (!list) return;
    if (!data || data.length === 0) { list.innerHTML = '<div style="color:#555;font-size:12px;padding:12px 0;">Aún no hay predicciones.</div>'; return; }
    list.innerHTML = data.map(p =>
        `<div style="padding:8px 12px;background:#111;border-radius:8px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:12px;color:#aaa;">${p.user_name||'Anón'}</span>
            <span style="font-size:14px;font-weight:900;color:var(--accent);">${p.predicted_home} - ${p.predicted_away}</span>
        </div>`
    ).join('');
}

async function submitViewerPrediction() {
    if (!window.userData || !_viewStreamId) {
        if (typeof showToast === 'function') showToast('Iniciá sesión para predecir.', 'warning');
        return;
    }
    const h = parseInt(document.getElementById('pred-home')?.value) || 0;
    const a = parseInt(document.getElementById('pred-away')?.value) || 0;
    await sb().from('live_stream_predictions').upsert({
        stream_id: _viewStreamId,
        user_email: window.userData.email,
        user_name: window.userData.name || window.userData.email,
        predicted_home: h,
        predicted_away: a
    }, { onConflict: 'stream_id,user_email' }).catch(()=>{});
    if (typeof showToast === 'function') showToast('¡Predicción enviada!', 'success');
    loadViewerPredictions(_viewStreamId);
    const form = document.getElementById('viewer-predict-form');
    if (form) form.style.display = 'none';
}

function addViewerEventNotification(ev) {
    const banner = document.getElementById('viewer-event-banner');
    if (!banner) return;
    const icons = { goal: '⚽', assist: '🎯', substitution: '🔄', yellow_card: '🟨', red_card: '🟥' };
    banner.innerHTML = `${icons[ev.type]||'📢'} <strong>${ev.player || ''}</strong>${ev.minute ? ` (${ev.minute}')` : ''}`;
    banner.style.display = 'block';
    clearTimeout(banner._hideTimer);
    banner._hideTimer = setTimeout(() => { banner.style.display = 'none'; }, 5000);
}

function closeViewer() {
    if (_viewChannel) { try { sb().removeChannel(_viewChannel); } catch(e) {} }
    clearTimeout(_viewFetchTimer);
    if (_mediaSource && _mediaSource.readyState === 'open') { try { _mediaSource.endOfStream(); } catch(e) {} }
    _viewStreamId = null;
    const modal = document.getElementById('live-viewer-modal');
    if (modal) modal.style.display = 'none';
}

function shareStream() {
    const id = _viewStreamId;
    if (!id) return;
    const url = `https://canchero-app.vercel.app/?live=${id}`;
    if (navigator.share) {
        navigator.share({ title: 'Partido en Vivo — Canchero', url }).catch(()=>{});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
            if (typeof showToast === 'function') showToast('Enlace copiado!', 'success');
        }).catch(()=>{});
    }
}

// ============================================================
// CARGAR LISTA DE DIRECTOS
// ============================================================
let _liveListCache = [];   // directos cargados (en vivo + guardados 12h)

// Mostrar sección VER / HACER dentro de Directos
function showLiveSection(which) {
    const ver = document.getElementById('live-section-ver');
    const hacer = document.getElementById('live-section-hacer');
    const bVer = document.getElementById('live-seg-ver');
    const bHacer = document.getElementById('live-seg-hacer');
    const on = (b)=>{ if(b){ b.style.background='#ff4444'; b.style.color='#fff'; } };
    const off = (b)=>{ if(b){ b.style.background='transparent'; b.style.color='#fff'; } };
    if (which === 'hacer') {
        if (ver) ver.style.display='none';
        if (hacer) hacer.style.display='block';
        on(bHacer); off(bVer);
    } else {
        if (ver) ver.style.display='block';
        if (hacer) hacer.style.display='none';
        on(bVer); off(bHacer);
        loadLiveStreamsList();
    }
}

function _minutesSince(iso) {
    if (!iso) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

function _renderLiveCards(items) {
    const list = document.getElementById('live-streams-list');
    if (!list) return;
    if (!items || items.length === 0) {
        list.innerHTML = `<div class="mc-empty-state"><i class='bx bx-broadcast'></i><h3>No hay directos</h3><p>Cuando alguien transmita aparecerá acá.<br>Tocá “HACER DIRECTO” para empezar el tuyo.</p></div>`;
        return;
    }
    list.innerHTML = items.map(s => {
        const ended = s.status === 'ended';
        const mins = ended ? _minutesSince(s.started_at) : _minutesSince(s.started_at);
        const rival = s._rival || '';
        const homeName = s.team_name || (s.streamer_name||'Local');
        const shield = (logo, name, accent) => logo
            ? `<div style="width:46px;height:46px;border-radius:50%;margin:0 auto 6px;background:#000;border:2px solid ${accent?'var(--accent)':'#333'};background-image:url('${logo}');background-size:cover;background-position:center;"></div>`
            : `<div style="width:46px;height:46px;border-radius:50%;margin:0 auto 6px;background:rgba(255,255,255,0.06);border:2px solid ${accent?'var(--accent)':'#333'};display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;">${(name&&name[0]||'?').toUpperCase()}</div>`;
        return `
        <div style="background:#111;border:1px solid #1a1a1a;border-radius:16px;overflow:hidden;cursor:pointer;transition:border-color 0.2s;" onclick="CancheroLive.joinLiveStream('${s.id}')" onmouseenter="this.style.borderColor='#ff4444'" onmouseleave="this.style.borderColor='#1a1a1a'">
            <div style="background:${ended?'#101010':'#1a0000'};padding:12px 16px;display:flex;align-items:center;gap:10px;">
                ${ended
                  ? `<i class='bx bx-time-five' style="color:#888;font-size:14px;"></i><span style="color:#888;font-weight:900;font-size:11px;letter-spacing:2px;">GUARDADO 12H</span>`
                  : `<div style="width:10px;height:10px;background:#ff4444;border-radius:50%;animation:pulse 1s infinite;flex-shrink:0;"></div><span style="color:#ff4444;font-weight:900;font-size:11px;letter-spacing:2px;">EN VIVO</span>`}
                <span style="color:#666;font-size:11px;margin-left:auto;">${ended?'Finalizado':(s.viewer_count||0)+' viendo'}</span>
                ${(!ended && window.userData && s.streamer_email === window.userData.email)
                  ? `<button onclick="event.stopPropagation();CancheroLive.finishStuckLive('${s.id}')" style="background:#ff4444;color:#fff;border:none;border-radius:8px;padding:5px 10px;font-size:10px;font-weight:900;cursor:pointer;margin-left:8px;flex-shrink:0;">TERMINAR</button>`
                  : ''}
            </div>
            <!-- Portada: escudos + marcador + tiempo -->
            <div style="padding:18px 16px;display:flex;align-items:center;justify-content:space-around;gap:10px;background:radial-gradient(ellipse at 50% 0%, rgba(255,68,68,0.06), transparent);">
                <div style="text-align:center;flex:1;min-width:0;">
                    ${shield(s.team_logo, homeName, true)}
                    <div style="font-size:12px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${homeName}</div>
                </div>
                <div style="text-align:center;flex-shrink:0;">
                    <div style="font-size:30px;font-weight:900;color:#fff;line-height:1;">${s.score_home||0} <span style="color:#444;">-</span> ${s.score_away||0}</div>
                    <div style="font-size:11px;color:#ff4444;font-weight:800;margin-top:4px;">${mins}'</div>
                </div>
                <div style="text-align:center;flex:1;min-width:0;">
                    ${shield(s.rival_logo, rival||'VS', false)}
                    <div style="font-size:12px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${rival||'Rival'}</div>
                </div>
            </div>
            <div style="padding:0 16px 16px;">
                <div style="font-weight:800;font-size:13px;margin-bottom:4px;color:#ddd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.title||'Partido en directo'}</div>
                <div style="font-size:11px;color:#666;display:flex;gap:10px;flex-wrap:wrap;">
                    <span><i class='bx bx-user'></i> ${s.streamer_name||''}</span>
                    ${s._place?`<span><i class='bx bx-map'></i> ${s._place}</span>`:''}
                    ${s.formation?`<span><i class='bx bx-grid-alt'></i> ${s.formation}</span>`:''}
                </div>
            </div>
        </div>`;
    }).join('');
}

// Resuelve rival/lugar: usa columnas reales si existen, si no parsea el título
function _parseLiveMeta(s) {
    let title = s.title || '';
    let place = '';
    const dot = title.split(' · ');
    if (dot.length > 1) { place = dot.slice(1).join(' · ').trim(); title = dot[0]; }
    let rival = '';
    const vs = title.split(/\s+vs\s+/i);
    if (vs.length === 2) rival = vs[1].trim();
    // preferir columnas reales
    s._rival = s.rival_name || rival || '';
    const placeCols = [s.city, s.country].filter(Boolean).join(', ');
    s._place = placeCols || place;
    return s;
}

async function loadLiveStreamsList() {
    const list = document.getElementById('live-streams-list');
    if (!list || !sb()) return;
    list.innerHTML = '<div style="text-align:center;padding:30px;color:#555;"><i class="bx bx-loader-alt bx-spin" style="font-size:28px;"></i></div>';

    // En vivo + finalizados en las últimas 12h (se guardan 12h y luego se ocultan)
    const now = new Date().toISOString();
    const cutoff = new Date(Date.now() - 12*3600*1000).toISOString();
    let live = [], ended = [];
    try { const r = await sb().from('live_streams').select('*').eq('status','live').order('started_at',{ascending:false}); live = r.data||[]; } catch(e){}
    try {
        let q = sb().from('live_streams').select('*').eq('status','ended').gte('ended_at', cutoff).order('ended_at',{ascending:false});
        const r = await q;
        // Filtrar los que ya expiraron (si tienen expires_at)
        ended = (r.data||[]).filter(s => !s.expires_at || s.expires_at > now);
    } catch(e){}

    _liveListCache = [...live, ...ended].map(_parseLiveMeta);
    const f = document.getElementById('live-filter-input');
    filterLiveList(f ? f.value : '');
}

function filterLiveList(q) {
    q = (q||'').trim().toLowerCase();
    let items = _liveListCache;
    if (q) items = _liveListCache.filter(s => {
        const hay = [s.title, s.team_name, s.streamer_name, s._rival, s._place].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
    });
    _renderLiveCards(items);
}

// ============================================================
// FIJADO EN PERFILES — Aceptar / Rechazar
// ============================================================
async function loadPinnedLivesForProfile(userEmail, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !sb()) return;

    const { data } = await sb().from('profile_pinned_lives')
        .select('*, live_streams(id, title, score_home, score_away, team_name, ended_at, status)')
        .eq('user_email', userEmail)
        .eq('accepted', true)
        .order('created_at', { ascending: false })
        .limit(5);

    if (!data || data.length === 0) { container.innerHTML = ''; return; }

    container.innerHTML = `
        <div style="font-size:11px;font-weight:900;color:#ff4444;letter-spacing:2px;margin-bottom:10px;">🔴 PARTIDOS</div>
        ${data.map(p => {
            const s = p.live_streams;
            if (!s) return '';
            return `<div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:14px;margin-bottom:8px;cursor:pointer;" onclick="CancheroLive.joinLiveStream('${s.id}')">
                <div style="font-weight:900;font-size:13px;margin-bottom:4px;">${s.title||'Partido'}</div>
                <div style="font-size:11px;color:#666;margin-bottom:8px;">${s.team_name||''}</div>
                <div style="font-size:22px;font-weight:900;font-family:var(--font-display,sans-serif);">${s.score_home||0} - ${s.score_away||0}</div>
                <div style="font-size:10px;color:#555;margin-top:4px;">${s.status==='live'?'🔴 EN VIVO':'Finalizado'}</div>
            </div>`;
        }).join('')}
    `;
}

async function respondToPinnedLive(streamId, accepted) {
    if (!window.userData) return;
    await sb().from('profile_pinned_lives')
        .update({ accepted })
        .eq('stream_id', streamId)
        .eq('user_email', window.userData.email)
        .catch(()=>{});
    if (typeof showToast === 'function') showToast(accepted ? 'Partido fijado en tu perfil ✅' : 'Partido rechazado', accepted ? 'success' : 'info');
    loadPinnedLiveNotifications();
}

async function loadPinnedLiveNotifications() {
    if (!window.userData || !sb()) return;
    const { data } = await sb().from('profile_pinned_lives')
        .select('*, live_streams(title, team_name)')
        .eq('user_email', window.userData.email)
        .is('accepted', null);

    const container = document.getElementById('pinned-live-notifications');
    if (!container) return;

    if (!data || data.length === 0) { container.innerHTML = ''; return; }

    container.innerHTML = data.map(p => `
        <div style="background:#111;border:1px solid #ff4444;border-radius:12px;padding:14px;margin-bottom:10px;">
            <div style="font-size:13px;font-weight:700;margin-bottom:4px;">📺 ${p.live_streams?.title || 'Partido'}</div>
            <div style="font-size:11px;color:#666;margin-bottom:12px;">${p.live_streams?.team_name || ''} — ¿Querés fijar este partido en tu perfil?</div>
            <div style="display:flex;gap:8px;">
                <button class="btn btn-primary btn-sm" style="flex:1;" onclick="CancheroLive.respondToPinnedLive('${p.stream_id}', true)">✅ Sí, fijar</button>
                <button class="btn btn-glass btn-sm" style="flex:1;" onclick="CancheroLive.respondToPinnedLive('${p.stream_id}', false)">✕ No</button>
            </div>
        </div>
    `).join('');
}

// ============================================================
// API PÚBLICA
// ============================================================
window.CancheroLive = {
    openPreLiveModal,
    loadTeamDataForPreLive,
    startLive,
    flipCamera,
    togglePause,
    endLive,
    openSaveMatchModal,
    saveMatchRecording,
    openScoreModal,
    adjustScore,
    openEventModal,
    registerEvent,
    openSubModal,
    joinLiveStream,
    closeViewer,
    sendViewerComment,
    toggleViewerLike,
    submitViewerPrediction,
    shareStream,
    loadLiveStreamsList,
    showLiveSection,
    filterLiveList,
    pickLogo,
    loadPinnedLivesForProfile,
    respondToPinnedLive,
    loadPinnedLiveNotifications,
    finishStuckLive,
    checkUnfinishedLives
};

console.log('[CancheroLive] Módulo cargado ✓');

})();
