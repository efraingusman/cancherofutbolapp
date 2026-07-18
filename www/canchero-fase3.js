// canchero-fase3.js - Modulos Fase 3: Check-in, Live Stream WebRTC, Party Chat, Block
(function() {
'use strict';

// Usar siempre el cliente Supabase compartido (ya autenticado) — nunca crear uno nuevo
function getSb() {
    return window._sb || window.supabaseClient || null;
}
function getUser() { return window.userData; }

// =====================================================================
// CHECK-IN MODULE
// =====================================================================
const checkin = {
    async show(matchId) {
        const sb = getSb(); const user = getUser();
        if (!sb || !user) { alert('Iniciá sesión primero.'); return; }
        const { data: match } = await sb.from('matches').select('*').eq('id', matchId).single();
        if (!match) { alert('Partido no encontrado.'); return; }
        const modal = document.getElementById('checkin-modal') || checkin._createModal();
        modal.querySelector('#checkin-match-name').textContent = (match.team_a_name||'?') + ' vs ' + (match.team_b_name||'?');
        modal.querySelector('#checkin-complex-name').textContent = match.complex_name || 'Complejo';
        modal.querySelector('#checkin-time').textContent = match.scheduled_at ? new Date(match.scheduled_at).toLocaleString('es-UY') : '';
        modal.dataset.matchId = matchId;
        modal.style.display = 'flex';
    },

    async confirm(matchId) {
        const sb = getSb(); const user = getUser();
        if (!sb || !user) return;
        await sb.from('match_checkins').upsert({ match_id: matchId, user_email: user.email, checked_in_at: new Date().toISOString() }, { onConflict: 'match_id,user_email' });
        alert('Check-in confirmado. Que arranque el partido!');
        document.getElementById('checkin-modal') && (document.getElementById('checkin-modal').style.display = 'none');
    },

    async completeCuadro(matchId) {
        const sb = getSb(); const user = getUser();
        if (!sb || !user) return;
        const qty = parseInt(prompt('Cuantos jugadores faltan?') || '0');
        if (!qty || qty < 1) return;
        await sb.from('squad_requests').insert({
            match_id: matchId, captain_email: user.email, missing_count: qty,
            city: user.dept || user.city || '', status: 'open'
        });
        alert('Notificacion enviada. Tus amigos y jugadores cercanos sabran que faltan ' + qty + ' jugadores.');
    },

    _createModal() {
        const div = document.createElement('div');
        div.id = 'checkin-modal';
        div.style.cssText = 'display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);align-items:center;justify-content:center;padding:20px;';
        div.innerHTML = '<div style="background:#111;border:1px solid #333;border-radius:20px;padding:28px;max-width:380px;width:100%;position:relative;">'
            + '<button onclick="document.getElementById(\'checkin-modal\').style.display=\'none\'" style="position:absolute;top:12px;right:16px;background:none;border:none;color:#666;font-size:22px;cursor:pointer;">X</button>'
            + '<div style="text-align:center;margin-bottom:20px;">'
            + '<div style="font-size:36px;margin-bottom:8px;">&#127967;</div>'
            + '<div style="font-weight:900;font-size:16px;color:var(--accent);" id="checkin-match-name">Cargando...</div>'
            + '<div style="font-size:12px;color:#888;margin-top:4px;" id="checkin-complex-name"></div>'
            + '<div style="font-size:11px;color:#666;" id="checkin-time"></div>'
            + '</div>'
            + '<div class="checkin-options-grid">'
            + '<button class="btn btn-primary" style="padding:16px;font-size:13px;font-weight:900;" onclick="window.f3.checkin.confirm(document.getElementById(\'checkin-modal\').dataset.matchId)"><i class=\'bx bx-map-pin\'></i><br>CHECK-IN</button>'
            + '<button class="btn btn-glass" style="padding:16px;font-size:13px;font-weight:900;" onclick="window.f3.checkin.completeCuadro(document.getElementById(\'checkin-modal\').dataset.matchId)"><i class=\'bx bx-user-plus\'></i><br>COMPLETAR CUADRO</button>'
            + '</div></div>';
        document.body.appendChild(div);
        return div;
    }
};

// =====================================================================
// LIVE STREAM MODULE
// =====================================================================
const liveStream = {
    _stream: null,
    _timer: null,

    async start() {
        const titleEl = document.getElementById('live-title');
        const title = titleEl ? titleEl.value.trim() : '';
        if (!title) {
            if (typeof showToast === 'function') showToast('Ingresá un título para el directo.', 'warning');
            else alert('Ingresá un título para el directo.');
            return;
        }
        const user = getUser(); const sb = getSb();
        if (!user || !sb) {
            if (typeof showToast === 'function') showToast('Iniciá sesión primero.', 'warning');
            return;
        }

        // Pedir acceso a cámara/micrófono
        try {
            this._stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch(e) {
            if (typeof showToast === 'function') showToast('No se pudo acceder a la cámara/micrófono: ' + e.message, 'error');
            else alert('No se pudo acceder a la cámara/micrófono: ' + e.message);
            return;
        }

        const matchIdEl = document.getElementById('live-match-id');
        const matchId = matchIdEl ? matchIdEl.value || null : null;

        // Intentar guardar en Supabase (la tabla puede no existir aún)
        let streamId = 'local_' + Date.now();
        try {
            const { data: streamData, error } = await sb.from('live_streams').insert({
                title: title,
                streamer_email: user.email,
                streamer_name: user.name || user.email,
                match_id: matchId,
                status: 'live',
                started_at: new Date().toISOString(),
                viewer_count: 0
            }).select().single();
            if (!error && streamData) streamId = streamData.id;
        } catch(e) {
            // Tabla no existe — continuar con ID local de todas formas
            console.warn('live_streams table not found, running local only');
        }

        liveStream._showBroadcastUI({ id: streamId, title: title }, this._stream);
    },

    _showBroadcastUI(stream, mediaStream) {
        var panel = document.getElementById('live-setup-panel');
        if (panel) panel.style.display = 'none';
        var existingUI = document.getElementById('live-broadcast-ui');
        if (existingUI) existingUI.remove();

        var div = document.createElement('div');
        div.id = 'live-broadcast-ui';
        div.style.cssText = 'background:#0a0000;border:2px solid #ff4444;border-radius:16px;padding:20px;margin-bottom:20px;';
        div.innerHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">'
            + '<div style="width:10px;height:10px;background:#ff4444;border-radius:50%;"></div>'
            + '<span style="color:#ff4444;font-weight:900;letter-spacing:2px;">EN VIVO</span>'
            + '<span style="color:#666;font-size:11px;margin-left:auto;" id="live-timer">0:00</span></div>'
            + '<video id="live-preview-video" autoplay muted playsinline style="width:100%;border-radius:10px;max-height:200px;background:#000;display:block;"></video>'
            + '<div style="display:flex;gap:8px;margin-top:12px;">'
            + '<button class="btn btn-glass btn-sm" onclick="window.f3.liveStream.end(\'' + stream.id + '\')"><i class=\'bx bx-stop\'></i> FINALIZAR</button>'
            + '<span style="font-size:11px;color:#666;line-height:32px;">0 viendo</span></div>';

        var list = document.getElementById('live-streams-list');
        if (list) list.prepend(div); else document.body.appendChild(div);

        var video = document.getElementById('live-preview-video');
        if (video) video.srcObject = mediaStream;

        var secs = 0;
        liveStream._timer = setInterval(function() {
            secs++;
            var el = document.getElementById('live-timer');
            if (el) el.textContent = Math.floor(secs/60) + ':' + String(secs%60).padStart(2,'0');
        }, 1000);
    },

    async end(streamId) {
        if (liveStream._stream) { liveStream._stream.getTracks().forEach(function(t) { t.stop(); }); liveStream._stream = null; }
        if (liveStream._timer) { clearInterval(liveStream._timer); liveStream._timer = null; }
        var sb = getSb();
        if (sb && streamId) await sb.from('live_streams').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', streamId);
        var ui = document.getElementById('live-broadcast-ui');
        if (ui) ui.remove();
        if (typeof showToast === 'function') showToast('Directo finalizado.', 'success'); else alert('Directo finalizado.');
        if (typeof loadLiveStreams === 'function') loadLiveStreams();
    }
};

// =====================================================================
// PARTY CHAT MODULE
// =====================================================================
const partyChat = {
    _channel: null,
    _matchId: null,

    async open(matchId) {
        var sb = getSb(); var user = getUser();
        if (!sb || !user) { alert('Iniciá sesion primero.'); return; }
        this._matchId = matchId;
        var panel = document.getElementById('party-chat-panel') || partyChat._createPanel();
        panel.style.display = 'flex';
        partyChat._loadMessages(matchId, sb);
        if (partyChat._channel) partyChat._channel.unsubscribe();
        partyChat._channel = sb.channel('party-chat-' + matchId)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'party_messages', filter: 'match_id=eq.' + matchId },
                function(payload) { partyChat._appendMessage(payload.new); })
            .subscribe();
    },

    close() {
        var panel = document.getElementById('party-chat-panel');
        if (panel) panel.style.display = 'none';
        if (partyChat._channel) { partyChat._channel.unsubscribe(); partyChat._channel = null; }
    },

    async send() {
        var input = document.getElementById('party-chat-input');
        var text = input ? input.value.trim() : '';
        if (!text) return;
        var sb = getSb(); var user = getUser();
        if (!sb || !user) return;
        input.value = '';
        await sb.from('party_messages').insert({ match_id: partyChat._matchId, user_email: user.email, user_name: user.name, content: text });
    },

    async _loadMessages(matchId, sb) {
        var container = document.getElementById('party-chat-messages');
        if (!container) return;
        container.innerHTML = '<div style="padding:10px;color:#555;text-align:center;font-size:12px;">Cargando...</div>';
        var result = await sb.from('party_messages').select('*').eq('match_id', matchId).order('created_at').limit(50);
        var data = result.data;
        if (!data || !data.length) { container.innerHTML = '<div style="padding:10px;color:#555;text-align:center;font-size:12px;">No hay mensajes aun.</div>'; return; }
        container.innerHTML = data.map(function(m) { return partyChat._msgHTML(m); }).join('');
        container.scrollTop = container.scrollHeight;
    },

    _appendMessage(msg) {
        var container = document.getElementById('party-chat-messages');
        if (!container) return;
        container.insertAdjacentHTML('beforeend', partyChat._msgHTML(msg));
        container.scrollTop = container.scrollHeight;
    },

    _msgHTML(m) {
        var isMe = m.user_email === (getUser() ? getUser().email : '');
        return '<div style="margin-bottom:10px;display:flex;flex-direction:column;align-items:' + (isMe?'flex-end':'flex-start') + ';">'
            + '<div style="font-size:10px;color:#555;margin-bottom:2px;">' + (m.user_name||'?') + '</div>'
            + '<div style="background:' + (isMe?'var(--accent)':'#1a1a1a') + ';color:' + (isMe?'#000':'#fff') + ';padding:8px 12px;border-radius:' + (isMe?'12px 12px 0 12px':'12px 12px 12px 0') + ';max-width:75%;font-size:13px;">' + (m.content||'') + '</div>'
            + '</div>';
    },

    _createPanel() {
        var div = document.createElement('div');
        div.id = 'party-chat-panel';
        div.className = 'party-chat-panel';
        div.innerHTML = '<div class="party-chat-header" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #222;">'
            + '<span style="font-weight:900;font-size:13px;letter-spacing:1px;">CHAT DEL PARTIDO</span>'
            + '<button onclick="window.f3.partyChat.close()" style="background:none;border:none;color:#aaa;font-size:20px;cursor:pointer;line-height:1;">X</button></div>'
            + '<div id="party-chat-messages" style="flex:1;overflow-y:auto;padding:12px;"></div>'
            + '<div style="display:flex;gap:8px;padding:10px;border-top:1px solid #222;">'
            + '<input id="party-chat-input" class="live-input" placeholder="Mensaje..." style="flex:1;margin:0;" onkeydown="if(event.key===\'Enter\')window.f3.partyChat.send()">'
            + '<button class="btn btn-primary btn-sm" onclick="window.f3.partyChat.send()"><i class=\'bx bx-send\'></i></button></div>';
        document.body.appendChild(div);
        return div;
    }
};

// =====================================================================
// EXPOSE API
// =====================================================================
window.f3 = { checkin: checkin, liveStream: liveStream, partyChat: partyChat };

})();
