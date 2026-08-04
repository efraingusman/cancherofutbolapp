// canchero-messaging.js — Sistema completo de mensajería
// DMs + Grupos, Realtime, Imágenes, Reacciones, Reply, Typing, Online/Offline
// Se carga después de script.js y canchero-notifications.js
// v2026-05-28c

window.CancheroMessaging = (function() {
    'use strict';

    const SB_URL = 'https://dofbxgqzcvfjpnvcvdjb.supabase.co';

    // Reutilizar el cliente Supabase de script.js para evitar problemas de API key
    let _sb = null;
    function getSb() {
        if (window._sb) return window._sb;
        if (_sb) return _sb;
        return null;
    }

    let _myEmail = null;
    let _myName = null;
    let _myPhoto = null;
    let _activeThread = null; // { type: 'dm'|'group', partnerEmail, partnerName, groupId, groupName }
    let _channels = {};       // realtime channels keyed by threadId
    let _typingTimeout = null;
    let _pendingGroupMembers = []; // emails para el modal crear grupo
    let _pendingGroupMembersData = {}; // { email: { name, photo } }
    let _groupPhotoBase64 = null;
    let _replyingTo = null;   // { id, content, senderName }
    let _mediaRecorder = null;
    let _audioChunks = [];
    let _recTimer = null;
    let _recSeconds = 0;

    // ── P0.5: CHATS POR IDENTIDAD ────────────────────────────
    // Cada identidad tiene su bandeja: jugador / fanatico / negocio.
    // Los mensajes se sellan con sender_profile y recipient_profile.
    const _BIZ_ROLES_MSG = ['club','complejo','tienda','organizacion','profesional','sponsor','cancha','periodismo'];
    // La bandeja es de la identidad ACTIVA y de ninguna otra. Antes TODOS los negocios
    // colapsaban a 'negocio': con Tienda + Ligas compartían la misma bandeja y
    // los chats "se abrían como si fueras otro". Ahora cada negocio es 'biz:<id>'.
    // Bandeja EXACTA de la identidad activa. Una identidad = una bandeja:
    // jugador · fanatico · team:<id> (cada equipo la suya) · biz:<id> (cada negocio la suya).
    function _chatTag() {
        try {
            const t = (window._activeProfileType && window._activeProfileType()) || 'jugador';
            if (t === 'fanatico') return 'fanatico';
            if (String(t).indexOf('biz:') === 0) return t;              // negocio concreto
            if (String(t).indexOf('team:') === 0) return t;
            if (t === 'team') {
                // El equipo tiene bandeja PROPIA (antes compartía la de jugador).
                try {
                    let id = (window.userData && window.userData._activeClubId) || null;
                    if (!id) { const s = JSON.parse(localStorage.getItem('canchero_active_team') || 'null'); id = s && s.id; }
                    if (id) return 'team:' + id;
                } catch(e){}
                return 'jugador';
            }
            if (t === 'negocio') {                                       // legacy: resolver a su id
                try {
                    const id = window._activeBizId && window._activeBizId();
                    if (id && id !== '__primary__') return 'biz:' + id;
                } catch(e){}
                return 'negocio';
            }
            return 'jugador';
        } catch(e){ return 'jugador'; }
    }
    // Id del negocio PRIMARIO (el primero de la cuenta). Los mensajes viejos sellados
    // 'negocio' sin id son suyos: hay que dejarlos en UNA sola bandeja, si no todos
    // los negocios seguían viendo lo mismo.
    function _primaryBizTag() {
        try {
            const l = window._myBusinesses || [];
            if (l.length) return 'biz:' + l[0].id;
        } catch(e){}
        return 'negocio';
    }
    // Etiqueta de un mensaje respecto de MÍ. Se devuelve CRUDA (sin colapsar los biz:<id>),
    // porque colapsar era justamente lo que mezclaba las bandejas.
    function _msgTag(m, mineAsSender) {
        let raw = mineAsSender ? m.sender_profile : m.recipient_profile;
        if (raw) return String(raw);
        // Legacy sin sello: va a la bandeja del rol PRIMARIO (con el que se registró la
        // cuenta). Antes usaba _baseStoredRole(): si users.role era de negocio, TODO el
        // historial caía en 'negocio' y en la bandeja de jugador no aparecía nada propio.
        try {
            const prim = (window._primaryRole && window._primaryRole())
                      || (window._baseStoredRole && window._baseStoredRole()) || 'jugador';
            if (prim === 'fanatico') return 'fanatico';
            return _BIZ_ROLES_MSG.indexOf(prim) !== -1 ? 'negocio' : 'jugador';
        } catch(e){ return 'jugador'; }
    }
    // ¿El mensaje pertenece a la bandeja abierta? ESTRICTO: cada identidad ve lo suyo.
    // Única concesión al historial: los mensajes viejos sellados 'negocio' (sin id) se
    // muestran en el negocio PRIMARIO — así no se pierden, pero tampoco aparecen
    // duplicados en todos los negocios (que era el motivo de que "siguieran mal").
    function _tagMatch(msgTag, boxTag) {
        if (msgTag === boxTag) return true;
        if (msgTag === 'negocio') return boxTag === _primaryBizTag();
        if (boxTag === 'negocio') return msgTag === _primaryBizTag();
        return false;
    }
    // Expuestos para que el badge global (script.js) cuente solo lo de la identidad activa.
    window._chatTagNow = _chatTag;
    window._msgTagMatch = _tagMatch;
    window._msgTagOf = _msgTag;

    // DIAGNÓSTICO: muestra qué bandeja calcula la app y con qué etiqueta quedó cada
    // mensaje. Sirve para ver por qué un chat aparece (o no) en una identidad.
    // Se abre escribiendo  _diagChats()  en la consola, o desde ?diagchats=1
    window._diagChats = async function() {
        const me = getUser() || {};
        const box = _chatTag();
        let filas = [];
        try {
            const [{ data: s }, { data: r }] = await Promise.all([
                getSb().from('messages').select('*').eq('sender_email', me.email).order('created_at',{ascending:false}).limit(60),
                getSb().from('messages').select('*').eq('recipient_email', me.email).order('created_at',{ascending:false}).limit(60)
            ]);
            filas = [...(s||[]), ...(r||[])];
        } catch(e){}
        const info = filas.map(m => {
            const mio = m.sender_email === me.email;
            const tag = _msgTag(m, mio);
            return { con: mio ? m.recipient_email : m.sender_email, yoSoy: mio ? 'emisor' : 'receptor',
                     sello: mio ? (m.sender_profile||'(vacío)') : (m.recipient_profile||'(vacío)'),
                     etiqueta: tag, entra: _tagMatch(tag, box) };
        });
        const negocios = (window._myBusinesses||[]).map(b => b.role + ':' + b.id + ' (' + b.name + ')');
        const resumen = {
            bandejaActual: box,
            activeProfile: localStorage.getItem('canchero_active_profile'),
            primaryRole: (window._primaryRole && window._primaryRole()) || '?',
            baseStoredRole: (window._baseStoredRole && window._baseStoredRole()) || '?',
            negocios: negocios,
            negocioPrimario: _primaryBizTag(),
            totalMensajes: filas.length,
            entranEnEstaBandeja: info.filter(x => x.entra).length
        };
        const ex = document.getElementById('diag-chats'); if (ex) ex.remove();
        const d = document.createElement('div');
        d.id = 'diag-chats';
        d.style.cssText = 'position:fixed;inset:0;z-index:200000;background:rgba(0,0,0,0.95);overflow-y:auto;padding:20px;font-family:monospace;font-size:12px;color:#0f0;';
        d.innerHTML = '<button onclick="this.parentNode.remove()" style="position:sticky;top:0;background:#baff00;color:#000;border:none;border-radius:8px;padding:8px 16px;font-weight:900;cursor:pointer;margin-bottom:12px;">CERRAR</button>'
            + '<pre style="white-space:pre-wrap;word-break:break-all;">' + JSON.stringify(resumen, null, 2)
            + '\n\n--- MENSAJES ---\n' + JSON.stringify(info, null, 2) + '</pre>';
        document.body.appendChild(d);
        console.log('[DIAG CHATS]', resumen, info);
        return resumen;
    };
    // Sin auto-apertura: el panel de diagnóstico solo se abre a mano desde la consola
    // (_diagChats()). Antes se abría con ?diagchats=1 y quedaba saltando en cada carga.

    // Al CAMBIAR de identidad hay que tirar el cache y repintar: si no, la bandeja
    // y el badge seguían mostrando los del rol anterior ("me abre los chats como si
    // fuese de otro"). Lo llama _switchToProfile / _switchToTeam en script.js.
    window._msgOnIdentityChange = function() {
        try {
            window._msgConvosCache = {};
            const box = document.getElementById('mobile-msg-badge');
            if (box) box.style.display = 'none';
            if (window.CancheroMessaging && window.CancheroMessaging.renderConversationList) {
                window.CancheroMessaging.renderConversationList();
            }
            if (window._refreshMsgBadge) window._refreshMsgBadge();
        } catch(e){}
    };

    // ¿A qué identidad del destinatario le escribo? Explícita (seteada al abrir el chat
    // desde un perfil de negocio) o derivada del rol base del destinatario. Con cache.
    const _rpCache = {};
    async function _recipientTag(email) {
        const k = (email || '').toLowerCase();
        try { if (window._msgTargetProfileMap && window._msgTargetProfileMap[k]) return window._msgTargetProfileMap[k]; } catch(e){}
        if (_rpCache[k]) return _rpCache[k];
        try {
            const { data } = await getSb().from('users').select('role').eq('email', email).maybeSingle();
            _rpCache[k] = (data && _BIZ_ROLES_MSG.indexOf((data.role || '').toLowerCase()) !== -1) ? 'negocio' : 'jugador';
        } catch(e){ _rpCache[k] = 'jugador'; }
        return _rpCache[k];
    }
    // API pública: marcar que el próximo chat con <email> va dirigido a su identidad <tag>
    window.CancheroMessagingSetTarget = function(email, tag) {
        (window._msgTargetProfileMap = window._msgTargetProfileMap || {})[(email || '').toLowerCase()] = tag || 'jugador';
    };

    // ── Helpers ───────────────────────────────────────────────
    function getUser() {
        const u = window.userData || {};
        return {
            email: u.email || localStorage.getItem('canchero_email') || '',
            name: u.name || localStorage.getItem('canchero_name') || 'Jugador',
            photo: u.photo || null
        };
    }

    function timeAgo(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const now = new Date();
        const hh = d.getHours().toString().padStart(2,'0');
        const mm = d.getMinutes().toString().padStart(2,'0');
        const timeStr = `${hh}:${mm}`;
        // Mismo día
        if (d.toDateString() === now.toDateString()) return timeStr;
        // Ayer
        const yesterday = new Date(now); yesterday.setDate(now.getDate()-1);
        if (d.toDateString() === yesterday.toDateString()) return `Ayer ${timeStr}`;
        // Esta semana (menos de 7 días)
        const diffDays = Math.floor((now - d) / 86400000);
        if (diffDays < 7) {
            const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
            return `${days[d.getDay()]} ${timeStr}`;
        }
        // Más viejo: dd/mm/aaaa
        return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
    }

    function threadId(type, partnerEmail, groupId) {
        if (type === 'group') return `group:${groupId}`;
        const emails = [_myEmail, partnerEmail].sort();
        return `dm:${emails[0]}:${emails[1]}`;
    }

    // Distintivo por tipo de negocio (icono + color) para la lista de chats
    window._bizBadge = function(role) {
        const map = {
            club:       { i: 'bx-football',     c: '#64b4ff', t: 'Canchas' },
            complejo:   { i: 'bx-football',     c: '#64b4ff', t: 'Canchas' },
            tienda:     { i: 'bx-store',        c: '#ff9800', t: 'Tienda' },
            profesional:{ i: 'bx-user-voice',   c: '#9c88ff', t: 'Profesional' },
            organizacion:{ i: 'bx-trophy',      c: '#ff96c8', t: 'Ligas' },
            sponsor:    { i: 'bx-bolt-circle',  c: '#baff00', t: 'Sponsor' }
        };
        const b = map[role];
        if (!b) return '';
        return `<span title="${b.t}" style="flex-shrink:0;display:inline-flex;align-items:center;gap:3px;background:${b.c}1f;border:1px solid ${b.c}55;color:${b.c};border-radius:6px;padding:1px 6px;font-size:9px;font-weight:800;letter-spacing:.3px;"><i class='bx ${b.i}' style="font-size:11px;"></i>${b.t.toUpperCase()}</span>`;
    };

    function avatarHtml(name, photo, size = 44, photoStyle = null) {
        const initials = (name || '?')[0].toUpperCase();
        if (photo && !photo.includes('undefined')) {
            // Respetar el ENCUADRE del usuario (x/y/zoom): sin esto la foto
            // salia mal recortada (dorso en vez de cara)
            let pos = 'center 25%', bgsize = 'cover';
            if (photoStyle) {
                try {
                    const st = typeof photoStyle === 'string' ? JSON.parse(photoStyle) : photoStyle;
                    pos = (50 + parseInt(st.x || 0)) + '% ' + (50 + parseInt(st.y || 0)) + '%';
                    const z = parseFloat(st.zoom || 100);
                    if (z > 100) bgsize = z + '%';
                } catch(e) {}
            }
            return `<div style="width:${size}px;height:${size}px;border-radius:50%;flex-shrink:0;background-image:url('${photo}');background-size:${bgsize};background-position:${pos};background-color:#111;"></div>`;
        }
        if (false && photo) {
            return `<img src="${photo}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0;" onerror="this.outerHTML='<div style=\'width:${size}px;height:${size}px;border-radius:50%;background:var(--accent);color:#000;font-weight:900;font-size:${Math.floor(size*0.4)}px;display:flex;align-items:center;justify-content:center;flex-shrink:0;\'>${initials}</div>'" alt="">`;
        }
        return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:var(--accent);color:#000;font-weight:900;font-size:${Math.floor(size*0.4)}px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${initials}</div>`;
    }

    // ── Eliminar chat (long press / right click) ────
    window._chatItemMenu = function(id, name, type) {
        const existing = document.getElementById('chat-ctx-menu');
        if (existing) existing.remove();
        const m = document.createElement('div');
        m.id = 'chat-ctx-menu';
        m.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;justify-content:center;padding:20px;';
        m.onclick = function(e){ if(e.target===m) m.remove(); };
        m.innerHTML = `<div style="background:#1a1a1a;border-radius:16px;width:100%;max-width:400px;overflow:hidden;">
            <div style="padding:16px;border-bottom:1px solid #222;font-size:13px;font-weight:700;text-align:center;">${(name||'Chat').toUpperCase()}</div>
            <button onclick="window._deleteChat('${id.replace(/'/g,"\\'")}','${type}');document.getElementById('chat-ctx-menu').remove();" style="width:100%;padding:14px;background:none;border:none;border-bottom:1px solid #222;color:#ff4444;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;"><i class='bx bx-trash' style="margin-right:8px;"></i>Eliminar chat</button>
            <button onclick="document.getElementById('chat-ctx-menu').remove();" style="width:100%;padding:14px;background:none;border:none;color:#888;font-size:14px;cursor:pointer;font-family:inherit;">Cancelar</button>
        </div>`;
        document.body.appendChild(m);
    };

    window._deleteChat = async function(id, type) {
        try {
            const sb = getSb();
            if (type === 'group') {
                await sb.from('group_members').delete().eq('group_id', id).eq('email', _myEmail);
            } else {
                // Borrar (de mi lado) los mensajes de esta conversación: los que envié a esa persona
                // y los que esa persona me envió. Schema real: sender_email / recipient_email.
                await sb.from('messages').delete().eq('sender_email', _myEmail).eq('recipient_email', id);
                await sb.from('messages').delete().eq('sender_email', id).eq('recipient_email', _myEmail);
            }
            if (window.showToast) showToast('Chat eliminado','success');
            renderConversationList();
        } catch(e) { console.warn('delete chat error:', e); if (window.showToast) showToast('No se pudo eliminar','error'); }
    };

    // ── DMs estilo IG: vista, aceptar/eliminar/bloquear, privacidad ────
    window._dmSetView = function(v) { window._dmView = v; renderConversationList(); };
    async function _dmThreadOf(otherEmail) {
        const meLc = (_myEmail || '').toLowerCase(), o = (otherEmail || '').toLowerCase();
        const a = meLc < o ? meLc : o, b = meLc < o ? o : meLc;
        const { data } = await getSb().from('dm_threads').select('*').eq('user_a', a).eq('user_b', b).limit(1);
        return (data && data[0]) || null;
    }
    window._dmAcceptRequest = async function(otherEmail) {
        try {
            const t = await _dmThreadOf(otherEmail);
            if (t) await getSb().from('dm_threads').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', t.id);
            window._dmView = 'inbox';
            if (window.showToast) showToast('Chat aceptado: ya pueden hablar.', 'success');
            renderConversationList();
        } catch(e) { if (window.showToast) showToast('No se pudo aceptar.', 'error'); }
    };
    window._dmDeleteRequest = async function(otherEmail) {
        if (!confirm('Eliminar esta solicitud?')) return;
        try {
            const t = await _dmThreadOf(otherEmail);
            if (t) await getSb().from('dm_threads').update({ status: 'declined' }).eq('id', t.id);
            renderConversationList();
        } catch(e) {}
    };
    window._dmBlockRequest = async function(otherEmail) {
        if (!confirm('Bloquear a este usuario? No va a poder escribirte mas.')) return;
        try {
            await getSb().from('blocks').insert({ blocker_email: _myEmail, blocked_email: otherEmail });
            const t = await _dmThreadOf(otherEmail);
            if (t) await getSb().from('dm_threads').update({ status: 'declined' }).eq('id', t.id);
            if (window.showToast) showToast('Usuario bloqueado.', 'success');
            renderConversationList();
        } catch(e) { if (window.showToast) showToast('No se pudo bloquear.', 'error'); }
    };
    window._dmOpenPrivacy = async function() {
        let cur = 'todos';
        try { const { data } = await getSb().from('users').select('dm_privacy').eq('email', _myEmail).limit(1); cur = (data && data[0] && data[0].dm_privacy) || 'todos'; } catch(e) {}
        let m = document.getElementById('dm-privacy-modal'); if (m) m.remove();
        m = document.createElement('div'); m.id = 'dm-privacy-modal';
        m.style.cssText = 'position:fixed;inset:0;z-index:100080;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px;';
        const opt = (val, label, desc) => `<button onclick="window._dmSetPrivacy('${val}')" style="display:flex;align-items:center;gap:12px;width:100%;background:${cur===val?'rgba(186,255,0,0.08)':'transparent'};border:1px solid ${cur===val?'rgba(186,255,0,0.35)':'#222'};border-radius:14px;padding:13px;margin-bottom:8px;cursor:pointer;text-align:left;font-family:inherit;">
            <i class='bx ${cur===val?'bx-radio-circle-marked':'bx-radio-circle'}' style="font-size:20px;color:${cur===val?'var(--accent)':'#555'};"></i>
            <span style="flex:1;"><span style="display:block;color:#fff;font-size:13px;font-weight:800;">${label}</span><span style="display:block;color:#777;font-size:11px;">${desc}</span></span></button>`;
        m.innerHTML = `<div style="background:#111;border:1px solid #2a2a2a;border-radius:20px;width:100%;max-width:340px;padding:20px;" onclick="event.stopPropagation()">
            <div style="font-weight:900;font-size:15px;color:#fff;margin-bottom:4px;">Privacidad de mensajes</div>
            <div style="font-size:12px;color:#888;margin-bottom:14px;">Elegi quien puede enviarte una solicitud de mensaje.</div>
            ${opt('todos','Todos','Cualquier futbolero puede escribirte (entra como solicitud).')}
            ${opt('seguidores','Solo gente que sigo','Unicamente jugadores a los que seguis.')}
            ${opt('nadie','Nadie','Nadie nuevo puede iniciar un chat con vos.')}
        </div>`;
        m.onclick = (ev) => { if (ev.target === m) m.remove(); };
        document.body.appendChild(m);
    };
    window._dmSetPrivacy = async function(val) {
        try {
            await getSb().from('users').update({ dm_privacy: val }).eq('email', _myEmail);
            document.getElementById('dm-privacy-modal')?.remove();
            if (window.showToast) showToast('Privacidad actualizada.', 'success');
        } catch(e) { if (window.showToast) showToast('No se pudo guardar.', 'error'); }
    };

    // ── Init ──────────────────────────────────────────────────
    function init() {
        const u = getUser();
        const email = u && u.email;
        if (!email) return;
        // Idempotente: actualizar datos del usuario pero no re-suscribir canales
        _myEmail = email;
        _myName = u.name;
        _myPhoto = u.photo;
        if (window._cancheroMsgInitialized) { renderConversationList(); return; }
        window._cancheroMsgInitialized = true;
        _updatePresence('online');
        renderConversationList();
        // Heartbeat: refrescar last_seen cada 60s mientras la pestaña está visible
        if (!window._presenceHeartbeat) {
            window._presenceHeartbeat = setInterval(() => {
                if (document.visibilityState === 'visible') _updatePresence('online');
            }, 60000);
        }
        // Marcar offline al cerrar / ocultar la pestaña
        window.addEventListener('beforeunload', () => _updatePresence('offline'));
        document.addEventListener('visibilitychange', () => {
            _updatePresence(document.visibilityState === 'visible' ? 'online' : 'offline');
        });
    }

    // ── Presencia ─────────────────────────────────────────────
    async function _updatePresence(status) {
        if (!getSb() || !_myEmail) return;
        try {
            await getSb().from('user_presence').upsert({ email: _myEmail, status, last_seen: new Date().toISOString() }, { onConflict: 'email' });
        } catch(e) {}
    }

    async function _getPresence(email) {
        if (!getSb()) return null;
        try {
            const { data } = await getSb().from('user_presence').select('*').eq('email', email).single();
            return data;
        } catch(e) { return null; }
    }

    // ── Lista de conversaciones ───────────────────────────────
    async function renderConversationList() {
        const list = document.getElementById('msg-chat-list');
        if (!list) return;
        try { if (window._msgSyncBackBtn) window._msgSyncBackBtn(); } catch(e){}
        const u = getUser();
        _myEmail = u.email;
        _myName = u.name;
        if (!_myEmail || !getSb()) {
            list.innerHTML = '<div style="padding:20px;text-align:center;color:#555;font-size:12px;">Iniciá sesión para ver mensajes.</div>';
            return;
        }
        list.innerHTML = '<div style="padding:20px;text-align:center;"><i class="bx bx-loader-alt bx-spin" style="color:#555;font-size:20px;"></i></div>';
        try {
            // Cargar DMs — dos queries separadas para evitar problemas con .or() y emails
            const [{ data: sentMsgs, error: e1 }, { data: recvMsgs, error: e2 }] = await Promise.all([
                getSb().from('messages').select('*').eq('sender_email', _myEmail).order('created_at', { ascending: false }).limit(200),
                getSb().from('messages').select('*').eq('recipient_email', _myEmail).order('created_at', { ascending: false }).limit(200)
            ]);
            if (e1) console.warn('[MSG] sent query error:', e1);
            if (e2) console.warn('[MSG] recv query error:', e2);
            let msgs = [...(sentMsgs || []), ...(recvMsgs || [])];
            // P0.5: cada identidad su bandeja — filtrar por la etiqueta de identidad
            msgs = msgs.filter(m => _tagMatch(_msgTag(m, m.sender_email === _myEmail), _chatTag()));

            // Agrupar por conversación
            const convos = {};
            (msgs || []).forEach(m => {
                const partner = m.sender_email === _myEmail ? m.recipient_email : m.sender_email;
                const partnerName = m.sender_email === _myEmail
                    ? (m.recipient_name || m.recipient_email?.split('@')[0] || partner)
                    : (m.sender_name || m.sender_email?.split('@')[0] || partner);
                if (!convos[partner]) {
                    convos[partner] = { type: 'dm', email: partner, name: partnerName, lastMsg: '', time: m.created_at, unread: 0, mediaType: null };
                }
                // Actualizar solo si este mensaje es más reciente
                if (new Date(m.created_at) >= new Date(convos[partner].time)) {
                    convos[partner].time = m.created_at;
                    convos[partner].mediaType = m.media_type || null;
                    if (m.type === 'story_reply') convos[partner].lastMsg = '📷 Respondió a tu historia';
                    else if (m.media_type === 'image') convos[partner].lastMsg = '🖼️ Imagen';
                    else if (m.media_type === 'audio') convos[partner].lastMsg = '🎤 Audio';
                    else convos[partner].lastMsg = m.content || '';
                }
                if (m.recipient_email === _myEmail && !m.read) convos[partner].unread++;
            });

            // Cargar Grupos
            const { data: myGroups } = await getSb().from('group_members').select('group_id, role').eq('email', _myEmail);
            const groupIds = (myGroups || []).map(g => g.group_id);
            let groups = [];
            // Los GRUPOS también son por identidad. Antes se cargaban solo por email y
            // aparecían idénticos en fanático, equipo, complejo, tienda y organización:
            // por eso "el único que distinguía era jugador" (los DM sí se filtraban).
            // Un chat de PARTIDO es de quien juega → la bandeja del jugador.
            const _boxGrupos = _chatTag();
            if (groupIds.length > 0 && _boxGrupos === 'jugador') {
                const { data: groupData } = await getSb().from('group_chats').select('*').in('id', groupIds);
                for (const g of (groupData || [])) {
                    // Último mensaje del grupo
                    const { data: lastMsgArr } = await getSb().from('group_messages').select('*').eq('group_id', g.id).order('created_at', { ascending: false }).limit(1);
                    const lastMsg = lastMsgArr && lastMsgArr[0];
                    groups.push({
                        type: 'group',
                        groupId: g.id,
                        name: g.name,
                        photo: g.photo_url,
                        lastMsg: lastMsg ? (lastMsg.media_type === 'image' ? '🖼️ Imagen' : (lastMsg.media_type === 'audio' ? '🎤 Audio' : (lastMsg.content || ''))) : 'Sin mensajes',
                        time: lastMsg ? lastMsg.created_at : g.created_at,
                        unread: 0
                    });
                }
            }

            // Cargar fotos de perfil de los contactos (DM)
            try {
                const dmEmails = Object.keys(convos);
                if (dmEmails.length) {
                    // RPC security-definer: trae nombre+foto de TODOS (RLS suele bloquear leer otros usuarios)
                    let us = null;
                    try { const r = await getSb().rpc('get_users_info', { p_emails: dmEmails }); if (!r.error) us = r.data; } catch(e){}
                    // Fallback al query directo (si la RPC no existe o no devuelve)
                    if (!us || !us.length) { const r2 = await getSb().from('users').select('email,photo,cover_photo,name,role,photo_style').in('email', dmEmails); us = r2.data; }
                    const _bizRoles = ['club','complejo','tienda','profesional','organizacion','sponsor'];
                    const _bizEmails = [];
                    (us || []).forEach(u => {
                        if (convos[u.email]) {
                            const photo = u.photo || u.avatar_url || u.cover_photo;
                            if (photo && !photo.includes('ui-avatars') && !photo.includes('undefined')) convos[u.email].photo = photo;
                            if (u.photo_style) convos[u.email].photoStyle = u.photo_style;
                            if (u.name) convos[u.email].name = u.name;
                            if (u.role) convos[u.email].role = u.role; // para distintivo de negocio
                            if (_bizRoles.includes(u.role)) _bizEmails.push(u.email);
                        }
                    });
                    // Para negocios, mostrar el NOMBRE COMERCIAL + tipo (no el nombre personal).
                    // Via RPC security-definer (RLS bloquea leer business_requests de otros).
                    if (_bizEmails.length) {
                        try {
                            const { data: brs } = await getSb().rpc('get_business_info', { p_emails: _bizEmails });
                            (brs || []).forEach(b => {
                                if (convos[b.email]) {
                                    if (b.name) convos[b.email].name = b.name;
                                    if (b.role) convos[b.email].role = b.role;
                                }
                            });
                        } catch(e) {
                            // Fallback: intento directo (funciona si soy admin o dueño)
                            try {
                                const { data: brs2 } = await getSb().from('business_requests').select('email,name,role').in('email', _bizEmails);
                                (brs2 || []).forEach(b => { if (convos[b.email] && b.name) convos[b.email].name = b.name; });
                            } catch(e2) {}
                        }
                    }
                }
            } catch(e) {}

            // ── DMs ESTILO IG: separar inbox de SOLICITUDES via dm_threads ──
            let _threads = [];
            try { const r = await getSb().from('dm_threads').select('*'); _threads = r.data || []; } catch(e) {}
            const meLc = (_myEmail || '').toLowerCase();
            const thByPartner = {};
            _threads.forEach(t => {
                const other = t.user_a === meLc ? t.user_b : t.user_a;
                thByPartner[other] = t;
            });
            const requests = [];
            Object.keys(convos).forEach(em => {
                const t = thByPartner[(em || '').toLowerCase()];
                if (t && t.status === 'request' && (t.requested_by || '') !== meLc) {
                    convos[em]._isRequest = true;
                    requests.push(convos[em]);
                } else if (t && t.status === 'declined') {
                    delete convos[em]; // eliminado/bloqueado: fuera del inbox
                }
            });
            requests.forEach(r => { delete convos[r.email]; });
            window._dmRequests = requests;
            window._dmView = window._dmView || 'inbox';

            // Unir y ordenar por tiempo
            const allConvos = window._dmView === 'requests'
                ? requests.sort((a, b) => new Date(b.time) - new Date(a.time))
                : [...Object.values(convos), ...groups].sort((a, b) => new Date(b.time) - new Date(a.time));

            // Chips Mensajes / Solicitudes (arriba de la lista)
            const chips = `<div style="display:flex;gap:8px;padding:4px 12px 10px;">
                <button onclick="window._dmSetView('inbox')" style="flex:0 0 auto;background:${window._dmView!=='requests'?'rgba(255,255,255,0.12)':'transparent'};color:${window._dmView!=='requests'?'#fff':'#777'};border:1px solid ${window._dmView!=='requests'?'rgba(255,255,255,0.14)':'#222'};border-radius:18px;padding:7px 16px;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit;">Mensajes</button>
                <button onclick="window._dmSetView('requests')" style="flex:0 0 auto;background:${window._dmView==='requests'?'rgba(255,255,255,0.12)':'transparent'};color:${window._dmView==='requests'?'#fff':'#777'};border:1px solid ${window._dmView==='requests'?'rgba(255,255,255,0.14)':'#222'};border-radius:18px;padding:7px 16px;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit;">Solicitudes${requests.length?` <span style="background:var(--accent);color:#000;border-radius:10px;padding:1px 7px;font-size:10px;font-weight:900;">${requests.length}</span>`:''}</button>
            </div>`;
            window._dmChipsHtml = chips;

            // Chats de EQUIPO fijados arriba de la bandeja (uno por equipo del usuario)
            let teamRows = '';
            if (window._dmView !== 'requests') {
                try { teamRows = await (window._buildTeamChatRows ? window._buildTeamChatRows() : ''); } catch(e) {}
            }

            if (!allConvos.length) {
                list.innerHTML = (window._dmChipsHtml || '') + teamRows + `<div style="padding:30px 20px;text-align:center;color:#555;font-size:12px;">
                    <i class='bx bx-message-dots' style="font-size:32px;display:block;margin-bottom:10px;opacity:0.4;"></i>
                    ${window._dmView==='requests' ? 'Sin solicitudes pendientes.' : 'Sin mensajes aún.<br><span style="font-size:11px;">Buscá jugadores y escribiles.</span>'}
                </div>`;
                return;
            }

            // Guardar cache para badge count
            window._msgConvosCache = {};
            allConvos.forEach(c => { window._msgConvosCache[c.email || c.groupId] = c; });

            list.innerHTML = (window._dmChipsHtml || '') + teamRows + allConvos.map(c => {
                const isGroup = c.type === 'group';
                const avatar = isGroup
                    ? (c.photo ? `<img src="${c.photo}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'">` : `<div style="width:44px;height:44px;border-radius:50%;background:#9c88ff22;border:1px solid #9c88ff44;color:#9c88ff;font-weight:900;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class='bx bx-group'></i></div>`)
                    : avatarHtml(c.name, c.photo || null, 44, c.photoStyle || null);
                const clickHandler = isGroup
                    ? `CancheroMessaging.openThread('group',null,null,null,'${c.groupId}','${(c.name||'').replace(/'/g,"\\'")}' )`
                    : `CancheroMessaging.openThread('dm',null,'${c.email}','${(c.name||'').replace(/'/g,"\\'")}')`;
                return `
                <div class="msg-chat-item ${_activeThread && ((_activeThread.partnerEmail && _activeThread.partnerEmail === c.email) || (_activeThread.groupId && _activeThread.groupId === c.groupId)) ? 'active' : ''}"
                     onclick="${clickHandler}"
                     oncontextmenu="event.preventDefault();window._chatItemMenu('${(c.email||c.groupId||'').replace(/'/g,"\\'")}','${(c.name||'').replace(/'/g,"\\'")}','${c.type||'dm'}')"
                     data-longpress-timer=""
                     ontouchstart="this.dataset.longpressTimer=setTimeout(()=>{window._chatItemMenu('${(c.email||c.groupId||'').replace(/'/g,"\\'")}','${(c.name||'').replace(/'/g,"\\'")}','${c.type||'dm'}')},600)"
                     ontouchend="clearTimeout(this.dataset.longpressTimer)"
                     ontouchmove="clearTimeout(this.dataset.longpressTimer)">
                    <div style="position:relative;flex-shrink:0;">${avatar}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;justify-content:space-between;align-items:center;gap:4px;">
                            <span style="font-weight:${c.unread>0?'900':'700'};font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:5px;min-width:0;"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${(c.name||'').toUpperCase()}</span>${window._bizBadge?window._bizBadge(c.role):''}</span>
                            <span style="font-size:10px;color:#555;white-space:nowrap;flex-shrink:0;">${timeAgo(c.time)}</span>
                        </div>
                        <div style="font-size:11px;color:${c.unread>0?'#ccc':'#666'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:${c.unread>0?'600':'400'};">${c.lastMsg||''}</div>
                    </div>
                    ${c.unread > 0 ? `<div style="width:20px;height:20px;background:var(--accent);border-radius:50%;color:#000;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${c.unread > 9 ? '9+' : c.unread}</div>` : ''}
                    ${!c._isRequest ? `<button onclick="event.stopPropagation();window._chatItemMenu('${(c.email||c.groupId||'').replace(/'/g,"\\'")}','${(c.name||'').replace(/'/g,"\\'")}','${c.type||'dm'}')" style="background:none;border:none;color:#555;cursor:pointer;flex-shrink:0;padding:4px 2px;font-size:18px;line-height:1;" title="Opciones">⋯</button>` : ''}
                </div>
                ${c._isRequest ? `<div style="display:flex;gap:6px;padding:0 14px 12px;margin-top:-4px;">
                    <button onclick="event.stopPropagation();window._dmAcceptRequest('${c.email}')" style="flex:1.4;background:var(--accent);color:#000;border:none;border-radius:10px;padding:8px;font-size:11px;font-weight:900;cursor:pointer;font-family:inherit;">ACEPTAR</button>
                    <button onclick="event.stopPropagation();window._dmDeleteRequest('${c.email}')" style="flex:1;background:transparent;color:#888;border:1px solid #2a2a2a;border-radius:10px;padding:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;">Eliminar</button>
                    <button onclick="event.stopPropagation();window._dmBlockRequest('${c.email}')" style="flex:1;background:rgba(255,68,68,0.08);color:#ff5555;border:1px solid rgba(255,68,68,0.3);border-radius:10px;padding:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;">Bloquear</button>
                </div>` : ''}`;
            }).join('');

        } catch(e) {
            console.error('[CancheroMessaging] renderConversationList error:', e);
            list.innerHTML = '<div style="padding:15px;color:#f44;font-size:12px;">Error cargando mensajes.</div>';
        }
        // Actualizar badge del botón CHATS en nav móvil
        try {
            const totalUnread = Object.values(window._msgConvosCache || {}).reduce((s, c) => s + (c.unread || 0), 0);
            const badge = document.getElementById('mobile-msg-badge');
            if (badge) {
                if (totalUnread > 0) { badge.textContent = totalUnread > 9 ? '9+' : String(totalUnread); badge.style.display = 'flex'; }
                else { badge.style.display = 'none'; }
            }
        } catch(e2) {}
    }

    // ── Abrir thread ──────────────────────────────────────────
    async function openThread(type, _unusedId, partnerEmail, partnerName, groupId, groupName) {
        const chatArea = document.getElementById('msg-chat-area');
        if (!chatArea || !getSb()) return;
        const u = getUser();
        _myEmail = u.email;
        _myName = u.name;
        if (!_myEmail) return;

        const isGroup = type === 'group';
        _activeThread = { type, partnerEmail, partnerName, groupId, groupName };
        _replyingTo = null;
        window._pendingMediaFile = null; // limpiar media pendiente

        // Persistir thread activo para restaurar en recargas
        try {
            localStorage.setItem('canchero_last_thread', JSON.stringify({ type, partnerEmail, partnerName, groupId, groupName }));
        } catch(e) {}

        // Cancelar canal anterior
        const tid = threadId(type, partnerEmail, groupId);
        if (_channels[tid]) {
            try { getSb().removeChannel(_channels[tid]); } catch(e) {}
            delete _channels[tid];
        }

        // Swipe derecha para cerrar el thread
        chatArea.addEventListener('touchstart', function(e) {
            chatArea._touchStartX = e.touches[0].clientX;
            chatArea._touchStartY = e.touches[0].clientY;
        }, { passive: true, once: false });
        chatArea.addEventListener('touchend', function(e) {
            const dx = e.changedTouches[0].clientX - (chatArea._touchStartX || 0);
            const dy = Math.abs(e.changedTouches[0].clientY - (chatArea._touchStartY || 0));
            if (dx > 70 && dy < 60) { // swipe derecha pronunciado
                CancheroMessaging._closeMobileThread();
            }
        }, { passive: true });

        // En mobile: modo overlay + ocultar nav bar
        chatArea.classList.add('mobile-open');
        if (window.innerWidth <= 900) {
            document.getElementById('player-bottom-nav')?.style.setProperty('display','none','important');
            document.getElementById('club-bottom-nav')?.style.setProperty('display','none','important');
        }

        // Obtener presencia (solo DM)
        let presenceHtml = '';
        let _partnerPhoto = null;
        if (!isGroup && partnerEmail) {
            const presence = await _getPresence(partnerEmail);
            if (presence) {
                // "En línea" SOLO si está marcado online Y su última señal es de hace
                // menos de 2 minutos (sino quedaba "en línea" gente que ya se fue).
                const recent = presence.last_seen && (Date.now() - new Date(presence.last_seen).getTime() < 120000);
                const isOnline = presence.status === 'online' && recent;
                presenceHtml = `<span style="font-size:10px;color:${isOnline?'#4caf50':'#666'};">
                    ${isOnline ? '● En línea' : (presence.last_seen ? `Última vez ${timeAgo(presence.last_seen)}` : '')}</span>`;
            }
            // Foto del contacto para el header
            let _partnerStyle = null; try { const { data: pu } = await getSb().from('users').select('photo,photo_style').eq('email', partnerEmail).maybeSingle(); if (pu && pu.photo && !pu.photo.includes('ui-avatars')) _partnerPhoto = pu.photo; if (pu && pu.photo_style) _partnerStyle = pu.photo_style; } catch(e){}
        }

        // Renderizar estructura del chat
        chatArea.innerHTML = `
            <div class="msg-thread-header">
                ${isGroup
                    ? `<div style="width:38px;height:38px;border-radius:50%;background:#9c88ff22;border:1px solid #9c88ff44;color:#9c88ff;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class='bx bx-group' style="font-size:18px;"></i></div>`
                    : `<div onclick="window.viewUserProfile&&window.viewUserProfile('${(partnerEmail||'').replace(/'/g,"\\'")}')" style="cursor:pointer;flex-shrink:0;">${avatarHtml(partnerName || groupName, _partnerPhoto, 38, (typeof _partnerStyle !== 'undefined' ? _partnerStyle : null))}</div>`
                }
                <div style="flex:1;min-width:0;${isGroup?'':'cursor:pointer;'}" ${isGroup?'':`onclick="window.viewUserProfile&&window.viewUserProfile('${(partnerEmail||'').replace(/'/g,"\\'")}')"`}>
                    <div style="font-weight:800;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${(isGroup ? groupName : partnerName || '').toUpperCase()}</div>
                    ${presenceHtml}
                </div>
                <button onclick="CancheroMessaging._closeMobileThread()" class="msg-mobile-back-btn" style="background:rgba(186,255,0,0.08);border:1px solid rgba(186,255,0,0.2);color:var(--accent);cursor:pointer;font-size:18px;min-width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;line-height:1;flex-shrink:0;order:-1;" aria-label="Volver">&#8592;</button>
                <button onclick="window._toggleChatSearch()" title="Buscar en la conversación" style="background:none;border:none;color:#888;cursor:pointer;font-size:20px;padding:4px;line-height:1;flex-shrink:0;"><i class='bx bx-search'></i></button>
                <button onclick="CancheroMessaging._startCall()" title="Videollamada" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:21px;padding:4px;line-height:1;flex-shrink:0;"><i class='bx bx-video'></i></button>
                <button id="mute-thread-btn" onclick="CancheroMessaging._toggleMuteThread()" title="${window.CancheroNotif?.isMuted(partnerEmail||groupId||'') ? 'Activar notificaciones' : 'Silenciar chat'}" style="background:none;border:none;color:${window.CancheroNotif?.isMuted(partnerEmail||groupId||'') ? '#ff4444' : '#555'};cursor:pointer;font-size:20px;padding:4px;line-height:1;transition:.2s;"><i class='bx ${window.CancheroNotif?.isMuted(partnerEmail||groupId||'') ? 'bx-bell-off' : 'bx-bell'}'></i></button>
                <button onclick="CancheroMessaging._threadOptions()" style="background:none;border:none;color:#888;cursor:pointer;font-size:22px;padding:4px;"><i class='bx bx-dots-vertical-rounded'></i></button>
            </div>
            <div id="msg-search-bar" style="display:none;padding:8px 14px;background:#111;border-bottom:1px solid #1a1a1a;align-items:center;gap:8px;">
                <i class='bx bx-search' style="color:#666;"></i>
                <input id="msg-search-input" placeholder="Buscar en esta conversación..." oninput="window._chatSearchFilter()" style="flex:1;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:18px;color:#fff;font-size:13px;padding:7px 14px;outline:none;">
                <button onclick="window._toggleChatSearch()" style="background:none;border:none;color:#666;font-size:18px;cursor:pointer;">✕</button>
            </div>
            <div id="msg-thread-messages" class="msg-thread-messages"></div>
            <div id="msg-typing-indicator" class="msg-typing" style="display:none;">
                <div class="msg-typing-dots"><span></span><span></span><span></span></div>
                <span id="msg-typing-name" style="font-size:11px;color:#666;"></span>
            </div>
            <div id="msg-reply-preview" style="display:none;padding:6px 14px;background:#1a1a1a;border-left:3px solid var(--accent);margin:0 14px 6px;border-radius:6px;font-size:11px;color:#aaa;justify-content:space-between;align-items:center;">
                <span id="msg-reply-text"></span>
                <button onclick="CancheroMessaging._cancelReply()" style="background:none;border:none;color:#555;cursor:pointer;font-size:14px;">✕</button>
            </div>
            <div class="msg-input-area">
                <button class="msg-attach-btn" id="msg-attach-toggle" onclick="window._msgToggleAttachMenu()" title="Adjuntar"><i class='bx bx-paperclip'></i></button>
                <!-- Menú de adjuntos oculto -->
                <div id="msg-attach-menu" style="display:none;position:absolute;bottom:68px;left:8px;background:#111;border:1px solid #2a2a2a;border-radius:14px;padding:8px;z-index:100;box-shadow:0 4px 24px rgba(0,0,0,0.7);display:none;flex-direction:column;gap:2px;min-width:160px;">
                    <button onclick="window._msgPickFile('image/*,video/*')" style="display:flex;align-items:center;gap:10px;background:none;border:none;color:#ccc;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:13px;text-align:left;width:100%;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='none'"><i class='bx bx-image' style="font-size:18px;color:var(--accent);"></i> Foto / Video</button>
                    <button onclick="window._msgPickFile('audio/*')" style="display:flex;align-items:center;gap:10px;background:none;border:none;color:#ccc;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:13px;text-align:left;width:100%;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='none'"><i class='bx bx-music' style="font-size:18px;color:#9c88ff;"></i> Audio</button>
                    <button onclick="window._openChatPoll()" style="display:flex;align-items:center;gap:10px;background:none;border:none;color:#ccc;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:13px;text-align:left;width:100%;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='none'"><i class='bx bx-poll' style="font-size:18px;color:#64b4ff;"></i> Encuesta</button>
                    <button onclick="window._msgPickFile('application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar')" style="display:flex;align-items:center;gap:10px;background:none;border:none;color:#ccc;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:13px;text-align:left;width:100%;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='none'"><i class='bx bx-file' style="font-size:18px;color:#4fc3f7;"></i> Documento</button>
                </div>
                <input type="file" id="msg-file-input" style="display:none;" onchange="CancheroMessaging._handleFileSelect(this)">
                <!-- Picker de emojis -->
                <button onclick="window._toggleMsgEmojiPicker()" title="Emojis" style="background:none;border:none;color:#888;cursor:pointer;font-size:20px;padding:4px 6px;flex-shrink:0;line-height:1;" type="button">😊</button>
                <div id="msg-emoji-picker" style="display:none;position:absolute;bottom:64px;left:8px;background:#111;border:1px solid #2a2a2a;border-radius:14px;padding:10px;z-index:200;box-shadow:0 4px 24px rgba(0,0,0,0.8);">
                    <div style="display:flex;flex-wrap:wrap;gap:4px;max-width:240px;">
                        ${['😀','😂','🥹','😍','🤩','😎','🤔','😤','🥳','😴','⚽','🏆','🔥','💪','🎯','⚡','🦁','🏅','👊','🎉','🙌','💥','🥅','👟','❤️','💚','👍','💯','🚀','😈'].map(e=>`<button onclick="window._insertMsgEmoji('${e}')" style="background:none;border:none;cursor:pointer;font-size:20px;padding:3px;border-radius:6px;transition:background .1s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='none'">${e}</button>`).join('')}
                    </div>
                    <div style="font-size:10px;color:#666;font-weight:700;margin:8px 0 4px;letter-spacing:1px;">STICKERS</div>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;max-width:240px;">
                        ${['⚽','🏆','🥅','🧤','👟','🦁','🔥','💪','🎯','😱','🤯','🥳'].map(e=>`<button onclick="window._sendSticker('${e}')" style="background:rgba(255,255,255,0.04);border:1px solid #222;cursor:pointer;font-size:30px;padding:6px;border-radius:10px;" onmouseover="this.style.background='rgba(186,255,0,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.04)'">${e}</button>`).join('')}
                    </div>
                </div>
                <button onclick="window._openChicanaPicker&&window._openChicanaPicker()" title="Chicana" style="background:rgba(186,255,0,0.12);border:1px solid rgba(186,255,0,0.4);color:var(--accent);cursor:pointer;font-size:18px;padding:6px 9px;flex-shrink:0;line-height:1;border-radius:10px;font-weight:900;" type="button">🔥</button>
                <textarea id="msg-input" class="msg-input" placeholder="Mensaje..." rows="1"
                    onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();CancheroMessaging.sendMessage();}"
                    oninput="CancheroMessaging._onTyping();this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px';window._msgCheckMention&&window._msgCheckMention(this);"></textarea>
                <button class="msg-send-btn" onclick="CancheroMessaging.sendMessage()"><i class='bx bx-send'></i></button>
            </div>
        `;

        // Marcar como leídos
        if (!isGroup) {
            try {
                await getSb().from('messages').update({ read: true })
                    .eq('sender_email', partnerEmail)
                    .eq('recipient_email', _myEmail)
                    .eq('read', false);
                // Refrescar el badge de mensajes (bajar el contador al leer)
                if (typeof window._refreshMsgBadge === 'function') window._refreshMsgBadge();
            } catch(e) {}
        }

        // Cargar mensajes
        await _loadMessages();

        // Suscribir Realtime
        _subscribeToThread(type, partnerEmail, groupId);

        // Actualizar lista (para reflejar unread = 0)
        renderConversationList();
    }

    async function _loadMessages() {
        const el = document.getElementById('msg-thread-messages');
        if (!el || !_activeThread || !getSb()) return;
        const { type, partnerEmail, groupId } = _activeThread;

        try {
            let msgs = [];
            if (type === 'group') {
                const { data } = await getSb().from('group_messages').select('*')
                    .eq('group_id', groupId).order('created_at', { ascending: true }).limit(80);
                msgs = data || [];
            } else {
                const { data } = await getSb().from('messages').select('*')
                    .or(`and(sender_email.eq.${_myEmail},recipient_email.eq.${partnerEmail}),and(sender_email.eq.${partnerEmail},recipient_email.eq.${_myEmail})`)
                    .order('created_at', { ascending: true }).limit(80);
                // P0.5: el hilo también respeta la identidad activa
                msgs = (data || []).filter(m => _tagMatch(_msgTag(m, m.sender_email === _myEmail), _chatTag()));
            }

            if (!msgs.length) {
                el.innerHTML = '<div id="msg-empty-state" style="text-align:center;color:#555;font-size:12px;padding:30px;">Sin mensajes aún. ¡Rompé el hielo!</div>';
                return;
            }

            el.innerHTML = msgs.map(m => _renderMessageHtml(m)).join('');
            el.scrollTop = el.scrollHeight;
        } catch(e) {
            console.error('[CancheroMessaging] _loadMessages error:', e);
        }
    }

    function _renderMessageHtml(m) {
        const isMine = m.sender_email === _myEmail;
        const wrapClass = isMine ? 'mine' : 'theirs';
        const bubbleClass = isMine ? 'mine' : 'theirs';
        const senderLabel = (!isMine && _activeThread?.type === 'group')
            ? `<div style="font-size:10px;color:var(--accent);font-weight:700;margin-bottom:3px;">${m.sender_name || m.sender_email?.split('@')[0] || ''}</div>` : '';

        let contentHtml = '';
        if (m.message_type === 'poll' && m.metadata && m.metadata.poll_id) {
            // Render encuesta inline en chat
            const pid = m.metadata.poll_id;
            const wrId = 'chat-poll-' + pid.slice(0,8) + '-' + Math.random().toString(36).slice(2,6);
            contentHtml = `<div id="${wrId}" style="min-width:240px;max-width:300px;">
                <div style="font-size:10px;color:#64b4ff;font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:4px;"><i class='bx bx-poll'></i> ENCUESTA</div>
                <div id="${wrId}-inner" style="color:#888;font-size:12px;">Cargando encuesta...</div>
            </div>`;
            setTimeout(() => {
                const inner = document.getElementById(wrId + '-inner');
                if (inner && window.CancheroPolls) window.CancheroPolls.renderChatPoll(pid, inner.parentElement);
            }, 200);
        } else if (m.type === 'story_reply') {
            contentHtml = `<div style="background:rgba(255,255,255,0.06);border-left:3px solid #ffb400;padding:5px 8px;border-radius:6px;margin-bottom:5px;font-size:10px;color:#aaa;">📷 Respondió a tu historia</div>${m.content || ''}`;
        } else if (m.media_type === 'image' && m.media_url) {
            contentHtml = `<img src="${m.media_url}" style="max-width:220px;max-height:200px;border-radius:10px;display:block;cursor:pointer;" onclick="window.open('${m.media_url}','_blank')" alt="imagen">`;
            if (m.content) contentHtml += `<div style="margin-top:5px;">${m.content}</div>`;
        } else if (m.media_type === 'video' && m.media_url) {
            contentHtml = `<video controls src="${m.media_url}" style="max-width:240px;max-height:200px;border-radius:10px;display:block;" playsinline></video>`;
            if (m.content) contentHtml += `<div style="margin-top:5px;">${m.content}</div>`;
        } else if (m.media_type === 'audio' && m.media_url) {
            contentHtml = `<audio controls src="${m.media_url}" style="max-width:220px;height:38px;border-radius:8px;"></audio>`;
        } else if (m.media_type === 'file' && m.media_url) {
            const fname = decodeURIComponent(m.media_url.split('/').pop().replace(/^\d+_/, ''));
            contentHtml = `<a href="${m.media_url}" target="_blank" download style="display:flex;align-items:center;gap:8px;color:inherit;text-decoration:none;background:rgba(255,255,255,0.07);border-radius:10px;padding:8px 12px;max-width:220px;">
                <i class='bx bx-file' style="font-size:22px;flex-shrink:0;color:#4fc3f7;"></i>
                <span style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${fname}</span>
                <i class='bx bx-download' style="font-size:16px;flex-shrink:0;opacity:0.6;"></i>
            </a>`;
        } else if ((m.content || '').match(/^\[ENCUESTA\]\s+(\S+)/)) {
            // Encuesta compartida en chat (marcador en el contenido, sin depender de columnas extra)
            const pid = (m.content || '').match(/^\[ENCUESTA\]\s+(\S+)/)[1];
            const wrId = 'chat-poll-' + String(pid).slice(0,8) + '-' + Math.random().toString(36).slice(2,6);
            contentHtml = `<div id="${wrId}" style="min-width:240px;max-width:300px;">
                <div style="font-size:10px;color:#64b4ff;font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:4px;"><i class='bx bx-poll'></i> ENCUESTA</div>
                <div id="${wrId}-inner" style="color:#888;font-size:12px;">Cargando encuesta...</div>
            </div>`;
            setTimeout(() => {
                const inner = document.getElementById(wrId + '-inner');
                if (inner && window.CancheroPolls) window.CancheroPolls.renderChatPoll(pid, inner.parentElement);
            }, 200);
        } else {
            const rawContent = m.content || '';
            // Detectar post compartido (contiene #post-<uuid>)
            const postMatch = rawContent.match(/#post-([0-9a-f-]{36})/i);
            if (postMatch) {
                const postId = postMatch[1];
                const postUrl = `${window.location.origin}${window.location.pathname}#post-${postId}`;
                const cardId = 'shared-post-' + postId.slice(0,8) + '-' + Math.random().toString(36).slice(2,6);
                contentHtml = `<div id="${cardId}" onclick="window._openSharedPost('${postId}')" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:14px;overflow:hidden;cursor:pointer;width:240px;transition:.15s;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.1)'">
                    <div id="${cardId}-preview" style="font-size:12px;color:#ccc;padding:10px 12px;">Cargando...</div>
                </div>`;
                // Cargar preview de forma async
                setTimeout(async () => {
                    const card = document.getElementById(cardId);
                    const el = document.getElementById(cardId + '-preview');
                    if (!el || !card) return;
                    try {
                        const sb = getSb() || window._sb;
                        if (!sb) return;
                        const { data: post } = await sb.from('posts').select('id,content,media_url,media_type,user_name,user_email,is_reel').eq('id', postId).single();
                        if (!post) { el.textContent = 'Publicación no disponible'; return; }
                        const isReel = post.is_reel || post.media_type === 'video';
                        let mediaHtml = '';
                        if (post.media_url) {
                            if (isReel) {
                                // Reel: thumbnail vertical 9:16 con overlay de play
                                mediaHtml = `<div style="position:relative;width:100%;aspect-ratio:9/16;max-height:280px;background:#000;overflow:hidden;">
                                    <video src="${post.media_url}#t=0.1" muted preload="metadata" style="width:100%;height:100%;object-fit:cover;display:block;" playsinline></video>
                                    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.15);">
                                        <div style="width:54px;height:54px;border-radius:50%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.7);"><i class='bx bx-play' style="color:#fff;font-size:32px;margin-left:3px;"></i></div>
                                    </div>
                                    <div style="position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.6);padding:3px 8px;border-radius:8px;font-size:9px;font-weight:900;color:#fff;letter-spacing:1px;"><i class='bx bx-movie-play'></i> REEL</div>
                                </div>`;
                            } else if (post.media_type === 'image') {
                                mediaHtml = `<img src="${post.media_url}" style="width:100%;max-height:200px;object-fit:cover;display:block;" onerror="this.style.display='none'">`;
                            }
                        }
                        el.outerHTML = `${mediaHtml}<div style="padding:8px 10px;">
                            <div style="font-size:11px;font-weight:800;color:#fff;margin-bottom:2px;">${post.user_name||'Usuario'}</div>
                            <div style="font-size:11px;color:#aaa;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${(post.content||(isReel?'🎬 Reel':'')).slice(0,80)}</div>
                        </div>`;
                    } catch(e) { el.textContent = 'Ver publicación'; }
                }, 100);
            } else if (/^\s*[⚡🔥]/.test(rawContent)) {
                // TOQUE / CHICANA: se muestra con estilo propio, bien diferenciado del resto de mensajes
                const chicanaText = rawContent.replace(/^\s*[⚡🔥]\s*/, '');
                contentHtml = `<div class="msg-chicana" style="display:flex;align-items:center;gap:9px;background:linear-gradient(135deg,rgba(255,180,0,0.18),rgba(255,80,0,0.12));border:1px solid rgba(255,180,0,0.5);border-radius:12px;padding:9px 12px;margin:-2px 0;">
                    <span style="font-size:22px;filter:drop-shadow(0 0 6px rgba(255,180,0,0.8));flex-shrink:0;">⚡</span>
                    <div><div style="font-size:8px;font-weight:900;color:#ffb400;letter-spacing:1.5px;margin-bottom:1px;">TOQUE</div><div style="font-weight:700;color:#fff;font-size:13px;line-height:1.3;">${chicanaText.replace(/\n/g,'<br>')}</div></div>
                </div>`;
            } else {
                contentHtml = rawContent.replace(/\n/g, '<br>');
            }
        }

        // Reply preview
        const replyHtml = m.reply_preview
            ? `<div style="background:rgba(255,255,255,0.07);border-left:3px solid var(--accent);padding:4px 8px;border-radius:5px;font-size:10px;color:#aaa;margin-bottom:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.reply_preview}</div>`
            : '';

        // Read tick (solo DMs propios)
        const tick = (isMine && _activeThread?.type === 'dm')
            ? `<span class="msg-read-tick">${m.read ? '✓✓' : '✓'}</span>` : '';

        const msgId = m.id;
        const msgSnippet = (m.content||'').replace(/'/g,"\\'").replace(/"/g,'&quot;').slice(0,80);
        // Botón de opciones (···) SOLO en mis mensajes, pegado al lado derecho del globo
        const optsBtn = isMine
            ? `<button onclick="event.stopPropagation();CancheroMessaging._showMsgOptions('${msgId}','${msgSnippet}')"
                class="msg-opts-btn" title="Opciones"
                style="position:absolute;top:50%;right:100%;transform:translateY(-50%);margin-right:4px;background:rgba(30,30,30,0.9);border:none;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;font-size:16px;line-height:1;opacity:0;transition:opacity .15s;z-index:5;">⋯</button>`
            : '';
        // Reacciones / long-press en TODOS los mensajes (estilo Instagram: reaccionás a cualquiera)
        const bubbleHandlers = `oncontextmenu="event.preventDefault();window._showMsgReactions(this,'${msgId}')"
                 ondblclick="window._showMsgReactions(this,'${msgId}')"
                 ontouchstart="window._lpTimer=setTimeout(()=>{window._lpFired=true;window._showMsgReactions(this,'${msgId}');},500)"
                 ontouchend="clearTimeout(window._lpTimer);if(window._lpFired){event.preventDefault();event.stopPropagation();window._lpFired=false;}"
                 ontouchmove="clearTimeout(window._lpTimer);window._lpFired=false;"`;
        return `
        <div class="msg-bubble-wrap ${wrapClass}" id="msg-${msgId}" data-mine="${isMine?'1':'0'}" style="position:relative;margin-top:6px;">
            ${senderLabel}
            <div class="msg-bubble ${bubbleClass}" style="position:relative;" ${bubbleHandlers}>
                ${optsBtn}
                ${replyHtml}
                ${contentHtml}
                <div class="msg-time">${timeAgo(m.created_at)}${tick}</div>
            </div>
            <div class="msg-reactions" id="reactions-${msgId}"></div>
        </div>`;
    }

    // ── Subscripción Realtime ─────────────────────────────────
    function _subscribeToThread(type, partnerEmail, groupId) {
        if (!getSb() || !_myEmail) return;
        const tid = threadId(type, partnerEmail, groupId);
        const tableName = type === 'group' ? 'group_messages' : 'messages';
        const filterKey = type === 'group' ? 'group_id' : 'recipient_email';
        const filterVal = type === 'group' ? groupId : _myEmail;

        try {
            _channels[tid] = getSb().channel(`thread:${tid}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: tableName,
                    filter: `${filterKey}=eq.${filterVal}`
                }, (payload) => {
                    const m = payload.new;
                    if (!m) return;
                    // Si el mensaje es de esta conversación activa, agregarlo
                    const isThisThread = type === 'group'
                        ? m.group_id === groupId
                        : (m.sender_email === partnerEmail || m.sender_email === _myEmail);
                    if (!isThisThread) return;
                    // P0.5: si el mensaje va dirigido a OTRA identidad mía, no mostrarlo acá
                    if (type === 'dm' && !_tagMatch(_msgTag(m, m.sender_email === _myEmail), _chatTag())) return;

                    // Solo actuar si el thread sigue abierto y visible
                    if (!_activeThread) return;

                    const el = document.getElementById('msg-thread-messages');
                    if (el) {
                        // Anti-duplicado: el emisor ya pintó su propio mensaje al enviarlo
                        // (render optimista con el id real). En grupos, realtime devuelve ese
                        // mismo mensaje → sin este guard aparecía DOS veces. Dedupe por id.
                        if (m.id && document.getElementById('msg-' + m.id)) return;
                        var _es0 = document.getElementById('msg-empty-state'); if (_es0) _es0.remove();
                        el.insertAdjacentHTML('beforeend', _renderMessageHtml(m));
                        el.scrollTop = el.scrollHeight;
                    }

                    // Marcar como leído si es de la contraparte
                    if (type === 'dm' && m.sender_email !== _myEmail) {
                        getSb().from('messages').update({ read: true }).eq('id', m.id).then(() => {});
                    }

                    // Ocultar typing indicator
                    _hideTyping();
                    renderConversationList();
                })
                .on('broadcast', { event: 'typing' }, (payload) => {
                    if (payload.payload?.email !== _myEmail) {
                        _showTyping(payload.payload?.name || 'Alguien');
                    }
                })
                .subscribe();
        } catch(e) { console.warn('[CancheroMessaging] subscribe error:', e); }
    }

    // ── Enviar mensaje ────────────────────────────────────────
    async function sendMessage(content, type = 'text', mediaUrl = null, mediaType = null) {
        const input = document.getElementById('msg-input');
        const msgContent = content || (input ? input.value.trim() : '');

        // Si hay media pendiente (preview), subir primero con el caption
        if (window._pendingMediaFile && !mediaUrl) {
            const file = window._pendingMediaFile;
            const caption = msgContent;
            if (input) { input.value = ''; input.style.height = 'auto'; }
            _clearMediaPreview();
            await _uploadAndSend(file, caption);
            return;
        }

        if (!msgContent && !mediaUrl) return;
        if (window._isGuest) { if (window._promptRegister) window._promptRegister('enviar mensajes'); return; }
        if (!_activeThread || !getSb() || !_myEmail) return;
        if (input) { input.value = ''; input.style.height = 'auto'; }

        const { type: threadType, partnerEmail, groupId } = _activeThread;
        const replyTo = _replyingTo ? _replyingTo.id : null;
        const replyPreview = _replyingTo ? `${_replyingTo.senderName}: ${_replyingTo.content}`.slice(0, 80) : null;
        _cancelReply();

        try {
            if (threadType === 'group') {
                const fullPayload = {
                    group_id: groupId,
                    sender_email: _myEmail,
                    sender_name: _myName,
                    content: msgContent,
                    type,
                    reply_to: replyTo,
                    reply_preview: replyPreview,
                    media_url: mediaUrl,
                    media_type: mediaType
                };
                let { data: insertedGroupMsg, error: gInsertErr } = await getSb().from('group_messages').insert(fullPayload).select().single();
                if (gInsertErr) {
                    // Reintento con columnas mínimas (alguna columna opcional puede no existir)
                    console.warn('[Messaging] group insert error, retry minimal:', gInsertErr.message);
                    const minimal = { group_id: groupId, sender_email: _myEmail, sender_name: _myName, content: msgContent };
                    if (mediaUrl) { minimal.media_url = mediaUrl; minimal.media_type = mediaType; }
                    const retry = await getSb().from('group_messages').insert(minimal).select().single();
                    insertedGroupMsg = retry.data; gInsertErr = retry.error;
                }
                if (gInsertErr) {
                    if (typeof showToast === 'function') showToast('No se pudo enviar: ' + gInsertErr.message, 'error');
                    if (input && !mediaUrl) input.value = msgContent;
                    return;
                }
                if (!gInsertErr) {
                    // Mostrar mensaje de grupo inmediatamente para el emisor
                    const el = document.getElementById('msg-thread-messages');
                    if (el) {
                        const _es1 = document.getElementById('msg-empty-state'); if (_es1) _es1.remove();
                        const m = insertedGroupMsg || {
                            id: `tmp_${Date.now()}`,
                            group_id: groupId,
                            sender_email: _myEmail,
                            sender_name: _myName,
                            content: msgContent,
                            type,
                            media_url: mediaUrl,
                            media_type: mediaType,
                            created_at: new Date().toISOString(),
                            reply_to: replyTo,
                            reply_preview: replyPreview
                        };
                        el.insertAdjacentHTML('beforeend', _renderMessageHtml(m));
                        el.scrollTop = el.scrollHeight;
                    }
                }
                // Notificar a los miembros del grupo
                const { data: members } = await getSb().from('group_members').select('email').eq('group_id', groupId);
                if (window.CancheroNotif) {
                    for (const m of (members || [])) {
                        if (m.email !== _myEmail) {
                            window.CancheroNotif.create(m.email, 'group', _myName, `💬 ${_myName} (grupo): ${(msgContent||mediaType||'').slice(0, 60)}`);
                        }
                    }
                }
            } else {
                const fullDm = {
                    sender_email: _myEmail,
                    sender_name: _myName,
                    recipient_email: partnerEmail,
                    content: msgContent,
                    type,
                    reply_to: replyTo,
                    reply_preview: replyPreview,
                    media_url: mediaUrl,
                    media_type: mediaType,
                    read: false,
                    // P0.5: sellar identidades (mi identidad activa + a qué identidad del otro le escribo)
                    sender_profile: _chatTag(),
                    recipient_profile: await _recipientTag(partnerEmail)
                };
                let { data: insertedMsg, error: insertErr } = await getSb().from('messages').insert(fullDm).select().single();
                if (insertErr) {
                    console.warn('[Messaging] dm insert error, retry minimal:', insertErr.message);
                    const minimal = { sender_email: _myEmail, sender_name: _myName, recipient_email: partnerEmail, content: msgContent };
                    if (mediaUrl) { minimal.media_url = mediaUrl; minimal.media_type = mediaType; }
                    const retry = await getSb().from('messages').insert(minimal).select().single();
                    insertedMsg = retry.data; insertErr = retry.error;
                }
                if (insertErr) {
                    if (typeof showToast === 'function') showToast('No se pudo enviar: ' + insertErr.message, 'error');
                    if (input && !mediaUrl) input.value = msgContent;
                    return;
                }
                // Push fuera de la app al destinatario (deep-link al chat exacto)
                try {
                    if (window._sendPush) window._sendPush(partnerEmail, '💬 ' + _myName,
                        mediaType === 'image' ? '📷 Foto' : (mediaType === 'audio' ? '🎤 Audio' : (msgContent || 'Nuevo mensaje')),
                        { type: 'dm', actor_email: _myEmail, actor_name: _myName });
                } catch(e) {}
                if (!insertErr) {
                    // Mostrar el mensaje enviado inmediatamente para el emisor
                    const el = document.getElementById('msg-thread-messages');
                    if (el) {
                        const _es2 = document.getElementById('msg-empty-state'); if (_es2) _es2.remove();
                        const m = insertedMsg || {
                            id: `tmp_${Date.now()}`,
                            sender_email: _myEmail,
                            sender_name: _myName,
                            recipient_email: partnerEmail,
                            content: msgContent,
                            type,
                            media_url: mediaUrl,
                            media_type: mediaType,
                            created_at: new Date().toISOString(),
                            read: false,
                            reply_to: replyTo,
                            reply_preview: replyPreview
                        };
                        el.insertAdjacentHTML('beforeend', _renderMessageHtml(m));
                        el.scrollTop = el.scrollHeight;
                    }
                }
                // Crear notificación para el receptor
                if (window.CancheroNotif) {
                    window.CancheroNotif.create(partnerEmail, 'dm', _myName, `💬 ${_myName}: ${(msgContent || '🖼️ Imagen').slice(0, 60)}`);
                }
            }
        } catch(e) {
            console.error('[CancheroMessaging] sendMessage error:', e);
            if (typeof showToast === 'function') showToast('Error al enviar el mensaje.', 'error');
        }
    }

    // ── Manejo de archivos — preview antes de enviar ──────────
    function _handleFileSelect(input) {
        const file = input.files[0];
        if (!file) return;
        input.value = '';
        _showMediaPreview(file);
    }

    function _showMediaPreview(file) {
        window._pendingMediaFile = file;
        // Quitar preview anterior si existe
        document.getElementById('msg-media-preview-bar')?.remove();

        const bar = document.createElement('div');
        bar.id = 'msg-media-preview-bar';
        bar.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 14px;background:#111;border-top:1px solid #2a2a2a;flex-shrink:0;';

        let previewContent = '';
        const isImage = file.type.startsWith('image');
        const isVideo = file.type.startsWith('video');
        const isAudio = file.type.startsWith('audio');

        if (isImage) {
            const url = URL.createObjectURL(file);
            previewContent = `<img src="${url}" style="width:52px;height:52px;object-fit:cover;border-radius:8px;flex-shrink:0;" id="msg-preview-img">`;
        } else if (isVideo) {
            previewContent = `<div style="width:52px;height:52px;background:#1a1a1a;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class='bx bx-video' style="font-size:24px;color:#9c88ff;"></i></div>`;
        } else if (isAudio) {
            previewContent = `<div style="width:52px;height:52px;background:#1a1a1a;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class='bx bx-music' style="font-size:24px;color:#4fc3f7;"></i></div>`;
        } else {
            previewContent = `<div style="width:52px;height:52px;background:#1a1a1a;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class='bx bx-file' style="font-size:24px;color:#4fc3f7;"></i></div>`;
        }

        bar.innerHTML = `
            ${previewContent}
            <div style="flex:1;min-width:0;">
                <div style="font-size:12px;font-weight:700;color:#ccc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${file.name}</div>
                <div style="font-size:10px;color:#555;">${(file.size/1024).toFixed(0)} KB · ${file.type||'archivo'}</div>
                <div style="font-size:10px;color:var(--accent);margin-top:2px;">Agregá un texto y presioná Enviar</div>
            </div>
            <button onclick="CancheroMessaging._clearMediaPreview()" style="background:rgba(255,255,255,0.1);border:none;color:#aaa;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">✕</button>
        `;

        // Insertar ANTES del input-area
        const inputArea = document.querySelector('.msg-input-area');
        if (inputArea) inputArea.parentNode.insertBefore(bar, inputArea);

        // Foco en el texto
        setTimeout(() => document.getElementById('msg-input')?.focus(), 100);
    }

    function _clearMediaPreview() {
        window._pendingMediaFile = null;
        document.getElementById('msg-media-preview-bar')?.remove();
        // Revocar object URL si había imagen
        const img = document.getElementById('msg-preview-img');
        if (img) URL.revokeObjectURL(img.src);
    }

    async function _uploadAndSend(file, caption = '') {
        const sb = getSb();
        if (!sb) return;
        const sendBtn = document.querySelector('.msg-send-btn');
        const attachBtn = document.getElementById('msg-attach-toggle');
        if (sendBtn) { sendBtn.disabled = true; sendBtn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i>`; }
        if (attachBtn) { attachBtn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i>`; attachBtn.disabled = true; }
        // Cerrar menú de adjuntos si está abierto
        const menu = document.getElementById('msg-attach-menu');
        if (menu) menu.style.display = 'none';
        try {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `chat/${_myEmail}/${Date.now()}_${safeName}`;
            // Subir al bucket 'media' (existe y tiene política pública)
            const { error } = await sb.storage.from('media').upload(path, file, { upsert: true, contentType: file.type });
            if (error) throw error;
            const { data: urlData } = sb.storage.from('media').getPublicUrl(path);
            const url = urlData?.publicUrl;
            if (!url) throw new Error('No se pudo obtener URL del archivo');
            const mtype = file.type.startsWith('image') ? 'image'
                : file.type.startsWith('video') ? 'video'
                : file.type.startsWith('audio') ? 'audio'
                : 'file';
            // sendMessage con caption como contenido
            await sendMessage(caption, 'media', url, mtype);
        } catch(e) {
            console.warn('[CancheroMessaging] upload error, fallback base64:', e);
            // Fallback: si el storage falla (bucket/RLS), enviar como base64 (audios/fotos chicas)
            try {
                if (file.size > 4 * 1024 * 1024) {
                    if (typeof window.showToast === 'function') window.showToast('Archivo muy grande para enviar sin storage (máx 4MB).', 'error');
                } else {
                    const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
                    const mtype = file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'file';
                    await sendMessage(caption, 'media', dataUrl, mtype);
                }
            } catch(e2) {
                if (typeof window.showToast === 'function') window.showToast('Error al enviar archivo: ' + (e2.message||e.message), 'error');
            }
        } finally {
            if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = `<i class='bx bx-send'></i>`; }
            if (attachBtn) { attachBtn.innerHTML = `<i class='bx bx-paperclip'></i>`; attachBtn.disabled = false; }
        }
    }

    // ── Videollamada (Jitsi) ──────────────────────────────────
    async function _startCall() {
        if (!_activeThread) return;
        const { type, partnerEmail, groupId } = _activeThread;
        // Sala estable por hilo para que ambos caigan en la misma
        const roomKey = type === 'group' ? ('grp_' + groupId) : ('dm_' + [_myEmail, partnerEmail].sort().join('_'));
        const room = 'canchero_' + roomKey.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 40);
        const url = 'https://meet.jit.si/' + room + '#userInfo.displayName="' + encodeURIComponent(_myName || 'Jugador') + '"';
        // Avisar en el chat con el link para que el otro se una
        try { await sendMessage('📹 Te invito a una videollamada: ' + 'https://meet.jit.si/' + room, 'text'); } catch(e) {}
        // Abrir la llamada
        window.open(url, '_blank');
    }

    // ── Grabación de audio (tap para grabar / tap para enviar) ──
    function _isRecording() { return _mediaRecorder && _mediaRecorder.state === 'recording'; }

    async function _toggleRecording() {
        if (_isRecording()) { _stopRecording(); }
        else { await _startRecording(); }
    }

    async function _startRecording() {
        const btn = document.getElementById('msg-audio-btn');
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            if (typeof showToast === 'function') showToast('Tu navegador no permite grabar audio.', 'error');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Elegir un mime soportado (Safari/iOS no soporta audio/webm)
            let mime = '';
            if (window.MediaRecorder && MediaRecorder.isTypeSupported) {
                if (MediaRecorder.isTypeSupported('audio/webm')) mime = 'audio/webm';
                else if (MediaRecorder.isTypeSupported('audio/mp4')) mime = 'audio/mp4';
                else if (MediaRecorder.isTypeSupported('audio/ogg')) mime = 'audio/ogg';
            }
            _mediaRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
            _audioChunks = [];
            _mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) _audioChunks.push(e.data); };
            _mediaRecorder.start();
            // Indicador visual + timer
            if (btn) { btn.style.color = '#ff4444'; btn.querySelector('i').className = 'bx bxs-circle'; btn.classList.add('recording'); }
            _recSeconds = 0;
            _recTimer = setInterval(() => {
                _recSeconds++;
                if (btn) btn.title = '🔴 Grabando ' + _recSeconds + 's — tocá para enviar';
                if (_recSeconds >= 120) _stopRecording(); // máx 2 min
            }, 1000);
        } catch(e) {
            console.warn('[CancheroMessaging] Mic not available:', e);
            if (typeof showToast === 'function') showToast('No se pudo acceder al micrófono. Revisá los permisos.', 'error');
        }
    }

    function _stopRecording() {
        const btn = document.getElementById('msg-audio-btn');
        if (_recTimer) { clearInterval(_recTimer); _recTimer = null; }
        if (btn) { btn.style.color = ''; btn.classList.remove('recording'); const ic = btn.querySelector('i'); if (ic) ic.className = 'bx bx-microphone'; btn.title = 'Tocá para grabar, tocá de nuevo para enviar'; }
        if (!_mediaRecorder || _mediaRecorder.state === 'inactive') return;
        _mediaRecorder.onstop = async () => {
            try {
                const mime = (_mediaRecorder && _mediaRecorder.mimeType) || 'audio/webm';
                const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
                const blob = new Blob(_audioChunks, { type: mime });
                if (blob.size < 500) { if (typeof showToast === 'function') showToast('Audio muy corto.', 'warning'); }
                else {
                    const file = new File([blob], `audio_${Date.now()}.${ext}`, { type: mime });
                    await _uploadAndSend(file);
                }
            } catch(e) { if (typeof showToast === 'function') showToast('Error con el audio: ' + e.message, 'error'); }
            try { _mediaRecorder.stream.getTracks().forEach(t => t.stop()); } catch(_) {}
        };
        _mediaRecorder.stop();
    }

    // ── Typing indicator ──────────────────────────────────────
    function _onTyping() {
        if (!_channels || !_activeThread) return;
        const tid = threadId(_activeThread.type, _activeThread.partnerEmail, _activeThread.groupId);
        const ch = _channels[tid];
        if (ch) {
            try {
                ch.send({ type: 'broadcast', event: 'typing', payload: { email: _myEmail, name: _myName } });
            } catch(e) {}
        }
        if (_typingTimeout) clearTimeout(_typingTimeout);
        _typingTimeout = setTimeout(() => {}, 2000);
    }

    function _showTyping(name) {
        const el = document.getElementById('msg-typing-indicator');
        const nameEl = document.getElementById('msg-typing-name');
        if (el) el.style.display = 'flex';
        if (nameEl) nameEl.textContent = `${name} está escribiendo...`;
        if (_typingTimeout) clearTimeout(_typingTimeout);
        _typingTimeout = setTimeout(_hideTyping, 3000);
    }

    function _hideTyping() {
        const el = document.getElementById('msg-typing-indicator');
        if (el) el.style.display = 'none';
    }

    // ── Opciones de mensaje (reply, react, copy, delete) ─────
    function _showMsgOptions(msgId, msgContent) {
        // Quitar menú anterior
        const prev = document.getElementById('msg-options-menu');
        if (prev) prev.remove();

        const msgEl = document.getElementById(`msg-${msgId}`);
        if (!msgEl) return;

        const isMine = msgEl.dataset?.mine === '1';

        const overlay = document.createElement('div');
        overlay.id = 'msg-options-menu';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.01);';
        overlay.onclick = () => overlay.remove();

        const menu = document.createElement('div');
        menu.style.cssText = 'position:absolute;background:#1e1e1e;border:1px solid #333;border-radius:14px;padding:8px;display:flex;flex-direction:column;gap:0;box-shadow:0 8px 32px rgba(0,0,0,0.7);min-width:200px;max-width:280px;overflow:hidden;';

        // Fila de reacciones
        const emojis = ['❤️', '😂', '👍', '😮', '😢', '🔥'];
        const reactRow = document.createElement('div');
        reactRow.style.cssText = 'display:flex;gap:2px;padding:4px 4px 8px;border-bottom:1px solid #2a2a2a;';
        emojis.forEach(e => {
            const btn = document.createElement('button');
            btn.textContent = e;
            btn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:22px;padding:4px 6px;border-radius:8px;transition:transform .15s;';
            btn.onclick = (ev) => { ev.stopPropagation(); CancheroMessaging._addReaction(msgId, e); overlay.remove(); };
            btn.onmouseover = () => btn.style.transform = 'scale(1.25)';
            btn.onmouseout = () => btn.style.transform = 'scale(1)';
            reactRow.appendChild(btn);
        });
        menu.appendChild(reactRow);

        // Opciones de acción
        const actions = [
            { icon: 'bx-reply', label: 'Responder', color: '#aaa', fn: () => { CancheroMessaging._setReply(msgId, msgContent); overlay.remove(); } },
            { icon: 'bx-copy', label: 'Copiar texto', color: '#aaa', fn: () => { navigator.clipboard?.writeText(msgContent.replace(/&quot;/g,'"')); overlay.remove(); } },
        ];
        if (isMine) {
            actions.push({ icon: 'bx-trash', label: 'Eliminar mensaje', color: '#ff5555', fn: () => { CancheroMessaging._deleteMsg(msgId); overlay.remove(); } });
        }

        actions.forEach(a => {
            const btn = document.createElement('button');
            btn.innerHTML = `<i class='bx ${a.icon}' style="font-size:18px;flex-shrink:0;"></i><span>${a.label}</span>`;
            btn.style.cssText = `display:flex;align-items:center;gap:12px;background:none;border:none;cursor:pointer;color:${a.color};font-size:13px;font-weight:600;padding:10px 12px;border-radius:8px;width:100%;text-align:left;transition:background .15s;`;
            btn.onmouseover = () => btn.style.background = '#2a2a2a';
            btn.onmouseout = () => btn.style.background = 'none';
            btn.onclick = (ev) => { ev.stopPropagation(); a.fn(); };
            menu.appendChild(btn);
        });

        overlay.appendChild(menu);
        document.body.appendChild(overlay);

        // Posicionar el menú cerca del elemento
        const rect = msgEl.getBoundingClientRect();
        const menuW = 220;
        const menuH = 180;
        let top = rect.top - menuH - 8;
        if (top < 8) top = rect.bottom + 8;
        if (top + menuH > window.innerHeight - 8) top = window.innerHeight - menuH - 8;
        let left = isMine ? rect.right - menuW : rect.left;
        left = Math.max(8, Math.min(left, window.innerWidth - menuW - 8));
        menu.style.top = `${top}px`;
        menu.style.left = `${left}px`;
    }

    // ── Eliminar mensaje (regla WhatsApp: solo si no fue respondido) ──
    async function _deleteMsg(msgId) {
        if (!getSb() || !_myEmail) return;
        const isGroup = _activeThread?.type === 'group';
        const table = isGroup ? 'group_messages' : 'messages';
        try {
            // 1. Obtener el mensaje a eliminar (incluyendo si fue leído)
            const { data: msgData } = await getSb().from(table)
                .select('created_at, sender_email, read')
                .eq('id', msgId)
                .maybeSingle();
            if (!msgData) {
                if (typeof window.showToast === 'function') window.showToast('Mensaje no encontrado', 'error');
                return;
            }

            // 2. REGLA: no se puede eliminar un mensaje que ya fue visto/leído (DMs)
            if (!isGroup && msgData.read === true) {
                if (typeof window.showToast === 'function') window.showToast('No podés eliminar: el mensaje ya fue visto ✓✓', 'warning');
                return;
            }

            // 3. Para chats directos: verificar también si hay respuesta posterior
            if (!isGroup) {
                const partnerEmail = _activeThread?.partnerEmail;
                if (partnerEmail) {
                    const { data: laterMsgs } = await getSb().from(table)
                        .select('id')
                        .eq('sender_email', partnerEmail)
                        .gt('created_at', msgData.created_at)
                        .limit(1);
                    if (laterMsgs && laterMsgs.length > 0) {
                        if (typeof window.showToast === 'function') window.showToast('No podés eliminar: el mensaje ya fue respondido', 'warning');
                        return;
                    }
                }
            }

            // 3. Eliminar
            const { error } = await getSb().from(table).delete().eq('id', msgId).eq('sender_email', _myEmail);
            if (error) throw error;

            // 4. Animación en DOM
            const el = document.getElementById(`msg-${msgId}`);
            if (el) {
                el.style.transition = 'opacity .2s,transform .2s';
                el.style.opacity = '0';
                el.style.transform = 'scale(0.9)';
                setTimeout(() => el.remove(), 200);
            }
            if (typeof window.showToast === 'function') window.showToast('Mensaje eliminado', 'success');
        } catch(e) {
            console.error('[deleteMsg]', e);
            if (typeof window.showToast === 'function') window.showToast('No se pudo eliminar el mensaje', 'error');
        }
    }

    // ── Reacciones ────────────────────────────────────────────
    async function _addReaction(messageId, emoji) {
        if (!getSb() || !_myEmail) return;
        const isGroup = _activeThread?.type === 'group';
        try {
            // Toggle: si ya existe, eliminar
            const { data: existing } = await getSb().from('message_reactions')
                .select('id').eq('message_id', messageId).eq('user_email', _myEmail).eq('emoji', emoji).single();
            if (existing) {
                await getSb().from('message_reactions').delete().eq('id', existing.id);
            } else {
                await getSb().from('message_reactions').insert({ message_id: messageId, user_email: _myEmail, emoji });
            }
            // Actualizar UI de reacciones
            _loadReactions(messageId);
        } catch(e) {}
    }

    async function _loadReactions(messageId) {
        if (!getSb()) return;
        try {
            const { data } = await getSb().from('message_reactions').select('emoji,user_email').eq('message_id', messageId);
            const el = document.getElementById(`reactions-${messageId}`);
            if (!el || !data) return;
            const counts = {};
            const myReactions = new Set();
            data.forEach(r => {
                counts[r.emoji] = (counts[r.emoji] || 0) + 1;
                if (r.user_email === _myEmail) myReactions.add(r.emoji);
            });
            el.innerHTML = Object.entries(counts).map(([emoji, count]) =>
                `<div class="msg-reaction-pill ${myReactions.has(emoji) ? 'style="background:rgba(186,255,0,0.15);border-color:var(--accent);"' : ''}" onclick="CancheroMessaging._addReaction('${messageId}','${emoji}')">${emoji} ${count}</div>`
            ).join('');
        } catch(e) {}
    }

    // ── Reply ─────────────────────────────────────────────────
    function _setReply(msgId, content) {
        _replyingTo = { id: msgId, content, senderName: 'Mensaje' };
        const preview = document.getElementById('msg-reply-preview');
        const text = document.getElementById('msg-reply-text');
        if (preview) preview.style.display = 'flex';
        if (text) text.textContent = content.slice(0, 60);
        document.getElementById('msg-input')?.focus();
    }

    function _cancelReply() {
        _replyingTo = null;
        const preview = document.getElementById('msg-reply-preview');
        if (preview) preview.style.display = 'none';
    }

    // ── Mobile close ──────────────────────────────────────────
    function _closeMobileThread() {
        const chatArea = document.getElementById('msg-chat-area');
        if (chatArea) chatArea.classList.remove('mobile-open');
        // Limpiar canales realtime para que no marquen mensajes como leídos en background
        try {
            Object.keys(_channels).forEach(tid => {
                try { getSb().removeChannel(_channels[tid]); } catch(e) {}
            });
            _channels = {};
        } catch(e) {}
        _activeThread = null;
        window._pendingMediaFile = null;
        try { localStorage.removeItem('canchero_last_thread'); } catch(e) {}
        // Restaurar nav bar mobile
        const role = window.userData?.role || 'jugador';
        const navId = role === 'club' ? 'club-bottom-nav' : 'player-bottom-nav';
        const nav = document.getElementById(navId);
        if (nav) { nav.style.removeProperty('display'); nav.style.display = 'flex'; }
    }

    // ── Thread options (silenciar, etc.) ──────────────────────
    function _threadOptions() {
        if (!_activeThread) return;
        const { type, partnerEmail, partnerName, groupId, groupName } = _activeThread;
        const isMuted = window.CancheroNotif?.isMuted(partnerEmail || groupId || '');

        const sheet = document.createElement('div');
        sheet.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99998;display:flex;align-items:center;justify-content:center;padding:16px;';
        sheet.innerHTML = `
            <div style="background:#111;border-radius:20px;width:100%;max-width:480px;padding:20px;max-height:80vh;overflow-y:auto;">
                <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:0 auto 16px;"></div>
                <div style="font-weight:800;font-size:13px;margin-bottom:16px;">${(isGroup ? groupName : partnerName || '').toUpperCase()}</div>
                <div onclick="CancheroMessaging._toggleMuteThread()" style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #1a1a1a;cursor:pointer;">
                    <i class='bx ${isMuted ? 'bx-bell' : 'bx-bell-off'}' style="font-size:20px;color:#888;"></i>
                    <span style="font-size:13px;">${isMuted ? 'Activar notificaciones' : 'Silenciar conversación'}</span>
                </div>
                ${!isGroup && partnerEmail ? `
                <div onclick="window.navigateToProfile && navigateToProfile('${partnerEmail}');this.closest('[style*=fixed]').remove()" style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #1a1a1a;cursor:pointer;">
                    <i class='bx bx-user' style="font-size:20px;color:#888;"></i>
                    <span style="font-size:13px;">Ver perfil</span>
                </div>` : ''}
                ${isGroup ? `
                <div onclick="CancheroMessaging._showGroupMembers('${groupId}');this.closest('[style*=fixed]').remove()" style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #1a1a1a;cursor:pointer;">
                    <i class='bx bx-group' style="font-size:20px;color:#888;"></i>
                    <span style="font-size:13px;">Ver miembros</span>
                </div>
                <div onclick="CancheroMessaging._leaveGroup('${groupId}');this.closest('[style*=fixed]').remove()" style="display:flex;align-items:center;gap:12px;padding:12px 0;cursor:pointer;">
                    <i class='bx bx-exit' style="font-size:20px;color:#ff4444;"></i>
                    <span style="font-size:13px;color:#ff4444;">Salir del grupo</span>
                </div>` : ''}
                <button onclick="this.closest('[style*=fixed]').remove()" style="width:100%;margin-top:14px;padding:12px;background:#1a1a1a;border:none;color:#fff;border-radius:12px;cursor:pointer;font-weight:700;">CANCELAR</button>
            </div>`;
        sheet.addEventListener('click', e => { if (e.target === sheet) sheet.remove(); });
        document.body.appendChild(sheet);
    }

    function _toggleMuteThread() {
        if (!_activeThread || !window.CancheroNotif) return;
        const id = _activeThread.partnerEmail || _activeThread.groupId || '';
        const wasMuted = window.CancheroNotif.isMuted(id);
        window.CancheroNotif.muteConversation(id, !wasMuted);
        // Actualizar botón del header
        const btn = document.getElementById('mute-thread-btn');
        if (btn) {
            const nowMuted = !wasMuted;
            btn.title = nowMuted ? 'Activar notificaciones' : 'Silenciar chat';
            btn.style.color = nowMuted ? '#ff4444' : '#555';
            btn.innerHTML = `<i class='bx ${nowMuted ? 'bx-bell-off' : 'bx-bell'}'></i>`;
        }
        // Toast feedback
        if (typeof window.showToast === 'function') {
            window.showToast(!wasMuted ? 'Chat silenciado' : 'Notificaciones activadas', !wasMuted ? 'info' : 'success');
        }
        // Cerrar sheet si vino del menú ⋮
        document.querySelector('[style*="position:fixed"][style*="inset:0"][style*="rgba(0,0,0,0.7)"]')?.remove();
    }

    // ── Buscar usuario nuevo chat ─────────────────────────────
    async function openNewChatSearch() {
        const existing = document.getElementById('new-chat-search-modal');
        if (existing) { existing.remove(); return; }
        const modal = document.createElement('div');
        modal.id = 'new-chat-search-modal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:flex-end;justify-content:center;';
        modal.innerHTML = `
            <div style="background:#111;border-radius:20px 20px 0 0;width:100%;max-width:480px;padding:20px;max-height:80vh;display:flex;flex-direction:column;">
                <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:0 auto 16px;"></div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                    <span style="font-weight:900;font-size:14px;">NUEVO MENSAJE</span>
                    <button onclick="document.getElementById('new-chat-search-modal').remove()" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;">&times;</button>
                </div>
                <div style="position:relative;margin-bottom:10px;">
                    <i class='bx bx-search' style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#555;font-size:16px;"></i>
                    <input id="new-chat-search-input" type="text" placeholder="Buscar jugadores, clubes, tiendas..."
                        style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;padding:10px 14px 10px 36px;border-radius:12px;outline:none;font-size:13px;box-sizing:border-box;">
                </div>
                <div id="new-chat-search-results" style="overflow-y:auto;flex:1;min-height:120px;">
                    <div style="padding:20px;text-align:center;color:#555;font-size:12px;">Escribí un nombre para buscar...</div>
                </div>
                <button onclick="document.getElementById('new-chat-search-modal').remove(); CancheroMessaging.openCreateGroupModal();"
                    style="margin-top:12px;width:100%;padding:12px;background:rgba(186,255,0,0.1);border:1px solid rgba(186,255,0,0.3);color:var(--accent);border-radius:12px;cursor:pointer;font-weight:900;font-size:13px;">
                    <i class='bx bx-group'></i> CREAR GRUPO
                </button>
            </div>`;
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
        document.body.appendChild(modal);
        const input = document.getElementById('new-chat-search-input');
        if (input) { input.focus(); input.addEventListener('input', _debounceSearch); }
    }

    let _searchDebounceTimer = null;
    function _debounceSearch(e) {
        clearTimeout(_searchDebounceTimer);
        _searchDebounceTimer = setTimeout(() => _doUserSearch(e.target.value.trim(), 'new-chat-search-results', false), 280);
    }

    async function _doUserSearch(term, containerId, forGroup) {
        const el = document.getElementById(containerId);
        if (!el) return;
        if (!term || term.length < 2) {
            el.innerHTML = '<div style="padding:20px;text-align:center;color:#555;font-size:12px;">Escribí un nombre para buscar...</div>';
            return;
        }
        el.innerHTML = '<div style="padding:20px;text-align:center;"><i class="bx bx-loader-alt bx-spin" style="color:#555;font-size:20px;"></i></div>';
        try {
            // Usar _sbAdmin para evitar restricciones RLS en tabla users; solo columnas existentes
            const sbSearch = getSb();
            const { data } = await sbSearch.from('users').select('name,email,role').ilike('name', `%${term}%`).neq('email', _myEmail || '').limit(12);
            if (!data || data.length === 0) {
                el.innerHTML = '<div style="padding:20px;text-align:center;color:#555;font-size:12px;">Sin resultados.</div>';
                return;
            }
            const roleLabel = { jugador:'Jugador', club:'Canchas', organizacion:'Ligas', tienda:'Tienda', profesional:'Profesional' };
            el.innerHTML = data.map(u => {
                const initials = (u.name||'?')[0].toUpperCase();
                const avatarHtml = `<div style="width:42px;height:42px;border-radius:50%;background:var(--accent);color:#000;font-weight:900;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${initials}</div>`;
                const emailSafe = (u.email||'').replace(/'/g,"\\'");
                const nameSafe = (u.name||'').replace(/'/g,"\\'");
                const clickHandler = forGroup
                    ? `CancheroMessaging._addGroupMemberByData('${emailSafe}','${nameSafe}')`
                    : `document.getElementById('new-chat-search-modal')?.remove(); if(typeof switchDashboardTab==='function') switchDashboardTab(window.userData?.role||'jugador','mensajes',null); setTimeout(()=>{ if(window.CancheroMessaging){window.CancheroMessaging.init();setTimeout(()=>window.CancheroMessaging.openThread('dm',null,'${emailSafe}','${nameSafe}'),200);} },100);`;
                return `<div onclick="${clickHandler}" style="display:flex;align-items:center;gap:12px;padding:10px 4px;border-bottom:1px solid #1a1a1a;cursor:pointer;transition:background .15s;border-radius:10px;" onmouseover="this.style.background='#1a1a1a'" onmouseout="this.style.background='transparent'">
                    ${avatarHtml}
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:700;font-size:13px;">${u.name||u.email}</div>
                        <div style="font-size:11px;color:#555;">${roleLabel[u.role]||u.role||''}</div>
                    </div>
                    <i class='bx bx-message-rounded' style="color:#444;font-size:18px;"></i>
                </div>`;
            }).join('');
        } catch(e) {
            el.innerHTML = '<div style="padding:20px;text-align:center;color:#f44;font-size:12px;">Error al buscar.</div>';
        }
    }

    // ── Grupos ────────────────────────────────────────────────
    function openCreateGroupModal() {
        const modal = document.getElementById('create-group-modal');
        if (!modal) return;
        modal.style.display = 'flex';
        _pendingGroupMembers = [];
        _pendingGroupMembersData = {};
        _groupPhotoBase64 = null;
        const membersList = document.getElementById('group-members-list');
        if (membersList) membersList.innerHTML = '';
        const nameInput = document.getElementById('group-name-input');
        if (nameInput) nameInput.value = '';
        const photoPreview = document.getElementById('group-photo-preview');
        if (photoPreview) photoPreview.innerHTML = `<i class='bx bx-camera' style="font-size:22px;color:#555;"></i>`;
        // Agregar buscador al modal si no existe
        const memberInput = document.getElementById('group-member-input');
        if (memberInput) {
            memberInput.setAttribute('placeholder', 'Buscar por nombre...');
            memberInput.setAttribute('type', 'text');
            memberInput.oninput = function() {
                clearTimeout(_searchDebounceTimer);
                _searchDebounceTimer = setTimeout(() => _doUserSearch(this.value.trim(), 'group-member-search-results', true), 280);
            };
            // Agregar contenedor de resultados si no existe
            if (!document.getElementById('group-member-search-results')) {
                const resultsDiv = document.createElement('div');
                resultsDiv.id = 'group-member-search-results';
                resultsDiv.style.cssText = 'max-height:160px;overflow-y:auto;border:1px solid #222;border-radius:8px;margin-top:4px;background:#0d0d0d;';
                memberInput.parentNode.insertBefore(resultsDiv, memberInput.nextSibling);
            }
        }
    }

    function _previewGroupPhoto(input) {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            _groupPhotoBase64 = e.target.result;
            const preview = document.getElementById('group-photo-preview');
            if (preview) preview.innerHTML = `<img src="${e.target.result}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;">`;
        };
        reader.readAsDataURL(file);
    }

    function _addGroupMember() {
        const input = document.getElementById('group-member-input');
        if (!input) return;
        const email = input.value.trim();
        if (!email || !email.includes('@')) return;
        if (_pendingGroupMembers.includes(email) || email === _myEmail) return;
        _pendingGroupMembers.push(email);
        input.value = '';
        _renderGroupMemberChips();
    }

    function _renderGroupMemberChips() {
        const list = document.getElementById('group-members-list');
        if (!list) return;
        list.innerHTML = _pendingGroupMembers.map(e => {
            const d = _pendingGroupMembersData[e];
            const label = d ? d.name : e.split('@')[0];
            return `<div style="background:#1a1a1a;border:1px solid #333;border-radius:20px;padding:4px 10px;font-size:11px;display:flex;align-items:center;gap:6px;">
                ${label}
                <button onclick="CancheroMessaging._removeGroupMember('${e}')" style="background:none;border:none;color:#555;cursor:pointer;font-size:13px;padding:0;">✕</button>
            </div>`;
        }).join('');
    }

    function _addGroupMemberByData(email, name) {
        if (!email || _pendingGroupMembers.includes(email) || email === _myEmail) return;
        _pendingGroupMembers.push(email);
        _pendingGroupMembersData[email] = { name };
        _renderGroupMemberChips();
        // Limpiar input y resultados
        const input = document.getElementById('group-member-input');
        if (input) input.value = '';
        const results = document.getElementById('group-member-search-results');
        if (results) results.innerHTML = '';
    }

    function _removeGroupMember(email) {
        _pendingGroupMembers = _pendingGroupMembers.filter(e => e !== email);
        delete _pendingGroupMembersData[email];
        _renderGroupMemberChips();
    }

    async function _submitCreateGroup() {
        const nameInput = document.getElementById('group-name-input');
        const name = nameInput ? nameInput.value.trim() : '';
        if (!name) { alert('Ingresá un nombre para el grupo.'); return; }
        if (_pendingGroupMembers.length === 0) { alert('Agregá al menos un miembro.'); return; }
        if (!getSb() || !_myEmail) return;

        try {
            // Subir foto si hay
            let photoUrl = null;
            if (_groupPhotoBase64) {
                const blob = await (await fetch(_groupPhotoBase64)).blob();
                const path = `groups/${Date.now()}.jpg`;
                const { error } = await getSb().storage.from('chat-media').upload(path, blob, { upsert: true });
                if (!error) {
                    const { data: urlData } = getSb().storage.from('chat-media').getPublicUrl(path);
                    photoUrl = urlData?.publicUrl;
                }
            }

            // Crear grupo
            const { data: group, error: gErr } = await getSb().from('group_chats').insert({ name, photo_url: photoUrl, created_by: _myEmail }).select().single();
            if (gErr || !group) throw gErr;

            // Agregar miembros
            const members = [{ group_id: group.id, email: _myEmail, role: 'admin' },
                ..._pendingGroupMembers.map(e => ({ group_id: group.id, email: e, role: 'member' }))];
            await getSb().from('group_members').insert(members);

            // Cerrar modal y abrir el grupo
            const modal = document.getElementById('create-group-modal');
            if (modal) modal.style.display = 'none';
            renderConversationList();
            setTimeout(() => openThread('group', null, null, null, group.id, name), 300);
        } catch(e) {
            console.error('[CancheroMessaging] createGroup error:', e);
            alert('Error al crear el grupo.');
        }
    }

    async function _showGroupMembers(groupId) {
        if (!getSb()) return;
        try {
            const { data } = await getSb().from('group_members').select('*').eq('group_id', groupId);
            const sheet = document.createElement('div');
            sheet.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:flex-end;';
            sheet.innerHTML = `
                <div style="background:#111;border-radius:20px 20px 0 0;width:100%;padding:20px;max-height:60vh;overflow-y:auto;">
                    <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:0 auto 16px;"></div>
                    <div style="font-weight:800;font-size:13px;margin-bottom:16px;">MIEMBROS</div>
                    ${(data || []).map(m => `
                        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #1a1a1a;">
                            <div style="width:38px;height:38px;border-radius:50%;background:var(--accent);color:#000;font-weight:900;font-size:14px;display:flex;align-items:center;justify-content:center;">${(m.email[0]||'?').toUpperCase()}</div>
                            <div style="flex:1;">
                                <div style="font-size:13px;font-weight:600;">${m.email.split('@')[0]}</div>
                                <div style="font-size:10px;color:#555;">${m.role === 'admin' ? '👑 Admin' : 'Miembro'}</div>
                            </div>
                        </div>`).join('')}
                    <button onclick="this.closest('[style*=fixed]').remove()" style="width:100%;margin-top:14px;padding:12px;background:#1a1a1a;border:none;color:#fff;border-radius:12px;cursor:pointer;font-weight:700;">CERRAR</button>
                </div>`;
            sheet.addEventListener('click', e => { if (e.target === sheet) sheet.remove(); });
            document.body.appendChild(sheet);
        } catch(e) {}
    }

    async function _leaveGroup(groupId) {
        if (!getSb() || !_myEmail) return;
        if (!confirm('¿Seguro que querés salir del grupo?')) return;
        try {
            await getSb().from('group_members').delete().eq('group_id', groupId).eq('email', _myEmail);
            _closeMobileThread();
            renderConversationList();
        } catch(e) {}
    }

    // ── Story reply → DM ──────────────────────────────────────
    async function storyReplyToDM(storyOwnerEmail, storyOwnerName, storyContent, replyText) {
        if (!getSb() || !_myEmail || !replyText) return;
        try {
            await getSb().from('messages').insert({
                sender_email: _myEmail,
                sender_name: _myName,
                recipient_email: storyOwnerEmail,
                content: replyText,
                type: 'story_reply',
                reply_preview: (storyContent || 'historia').slice(0, 80),
                read: false
            });
            if (window.CancheroNotif) {
                window.CancheroNotif.create(storyOwnerEmail, 'story_reply', _myName, `${_myName} respondió a tu historia: ${replyText.slice(0, 50)}`);
            }
            // Abrir el DM
            if (typeof window.switchDashboardTab === 'function') {
                window.switchDashboardTab('jugador', 'mensajes', null);
            }
            setTimeout(() => openThread('dm', null, storyOwnerEmail, storyOwnerName), 400);
        } catch(e) { console.error('[CancheroMessaging] storyReplyToDM error:', e); }
    }

    // ── Public API ────────────────────────────────────────────
    return {
        init,
        renderConversationList,
        openThread,
        sendMessage,
        openCreateGroupModal,
        openNewChatSearch,
        storyReplyToDM,
        // Internos expuestos para handlers HTML
        _handleFileSelect,
        _onTyping,
        _showMsgOptions,
        _deleteMsg,
        _addReaction,
        _setReply,
        _cancelReply,
        _clearMediaPreview,
        _closeMobileThread,
        _threadOptions,
        _toggleMuteThread,
        _previewGroupPhoto,
        _addGroupMember,
        _addGroupMemberByData,
        _removeGroupMember,
        _submitCreateGroup,
        _showGroupMembers,
        _leaveGroup,
        _toggleRecording,
        _startRecording,
        _stopRecording,
        _startCall,
        // Devuelve el email del chat DM activo (o null) — usado por notificaciones
        _activeThreadEmail: function() { return (_activeThread && _activeThread.type === 'dm') ? _activeThread.partnerEmail : null; },
        // Exponer hilo activo para encuestas de chat
        get _activeThread() { return _activeThread; }
    };
})();

// ── Attach menu helpers (called from inline HTML) ─────────────
window._msgToggleAttachMenu = function() {
    const menu = document.getElementById('msg-attach-menu');
    if (!menu) return;
    const isVisible = menu.style.display === 'flex';
    menu.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) {
        // Cerrar al hacer click fuera
        setTimeout(() => {
            const close = (e) => {
                const m = document.getElementById('msg-attach-menu');
                const btn = document.getElementById('msg-attach-toggle');
                if (m && !m.contains(e.target) && e.target !== btn) {
                    m.style.display = 'none';
                    document.removeEventListener('click', close);
                }
            };
            document.addEventListener('click', close);
        }, 50);
    }
};

window._msgPickFile = function(accept) {
    const menu = document.getElementById('msg-attach-menu');
    if (menu) menu.style.display = 'none';
    const input = document.getElementById('msg-file-input');
    if (!input) return;
    input.accept = accept;
    input.click();
};

window._openChatPoll = function() {
    const menu = document.getElementById('msg-attach-menu');
    if (menu) menu.style.display = 'none';
    if (!window.CancheroPolls) { showToast && showToast('Módulo de encuestas no disponible', 'error'); return; }
    // Detectar el contexto actual del chat (id correcto: groupId para grupo, partnerEmail para DM)
    const thread = window.CancheroMessaging && window.CancheroMessaging._activeThread;
    const isGroup = thread && thread.type === 'group';
    const contextId = thread ? (isGroup ? thread.groupId : thread.partnerEmail) : null;
    // 'group' → _sendPollToChat(...,'group'); 'chat' → _sendPollToChat(...,'dm'). Ambos ya soportados.
    window.CancheroPolls.openCreator(isGroup ? 'group' : 'chat', contextId);
};

// ── Backward compatibility aliases ────────────────────────────
window.renderMensajes = function() { window.CancheroMessaging.renderConversationList(); };
window.openDmThread = function(email, name) { window.CancheroMessaging.openThread('dm', null, email, name); };
window.openDM = function(email, name) {
    if (typeof window.switchDashboardTab === 'function') window.switchDashboardTab('jugador', 'mensajes', null);
    setTimeout(() => window.CancheroMessaging.openThread('dm', null, email, name), 300);
};

// ── Emoji picker helpers ──────────────────────────────────────
window._toggleMsgEmojiPicker = function() {
    const picker = document.getElementById('msg-emoji-picker');
    if (!picker) return;
    picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
    if (picker.style.display === 'block') {
        setTimeout(() => document.addEventListener('click', function handler(e) {
            if (!picker.contains(e.target) && !e.target.closest('[onclick="_toggleMsgEmojiPicker"]')) {
                picker.style.display = 'none'; document.removeEventListener('click', handler);
            }
        }), 10);
    }
};
window._insertMsgEmoji = function(emoji) {
    const inp = document.getElementById('msg-input');
    if (!inp) return;
    const pos = inp.selectionStart || inp.value.length;
    inp.value = inp.value.slice(0, pos) + emoji + inp.value.slice(pos);
    inp.setSelectionRange(pos + emoji.length, pos + emoji.length);
    inp.focus();
    const picker = document.getElementById('msg-emoji-picker');
    if (picker) picker.style.display = 'none';
};

// ── Reacciones a mensajes (long press) ────────────────────────
window._msgLongPressTimer = null;
window._startMsgLongPress = function(msgEl, msgId) {
    window._msgLongPressTimer = setTimeout(() => {
        window._showMsgReactions(msgEl, msgId);
    }, 500);
};
window._cancelMsgLongPress = function() {
    if (window._msgLongPressTimer) clearTimeout(window._msgLongPressTimer);
};
window._showMsgReactions = function(msgEl, msgId) {
    const existing = document.getElementById('msg-reactions-bar');
    if (existing) existing.remove();
    const bar = document.createElement('div');
    bar.id = 'msg-reactions-bar';
    const rect = msgEl ? msgEl.getBoundingClientRect() : { top: window.innerHeight/2, left: window.innerWidth/2 };
    bar.style.cssText = `position:fixed;top:${Math.max(8, rect.top - 60)}px;left:50%;transform:translateX(-50%);background:#111;border:1px solid #2a2a2a;border-radius:30px;padding:8px 14px;z-index:19999;box-shadow:0 4px 20px rgba(0,0,0,0.8);display:flex;gap:8px;`;
    const reactions = ['❤️','😂','😮','😢','👍','⚽'];
    bar.innerHTML = reactions.map(r => `<button onclick="window._sendMsgReaction('${msgId}','${r}');document.getElementById('msg-reactions-bar').remove()" style="font-size:24px;background:none;border:none;cursor:pointer;padding:4px;border-radius:50%;transition:transform .1s;" onmouseover="this.style.transform='scale(1.3)'" onmouseout="this.style.transform='scale(1)'">${r}</button>`).join('');
    bar.innerHTML += `<button onclick="document.getElementById('msg-reactions-bar').remove()" style="font-size:18px;background:rgba(255,255,255,0.06);border:none;color:#aaa;cursor:pointer;padding:4px 8px;border-radius:50%;">✕</button>`;
    document.body.appendChild(bar);
    setTimeout(() => document.addEventListener('click', function h(e){ if(!bar.contains(e.target)){bar.remove();document.removeEventListener('click',h);} }), 50);
};
window._sendMsgReaction = async function(msgId, emoji) {
    const sb = window._sb;
    const me = window.userData;
    if (!me || !msgId) return;
    // Mostrar la reacción inmediatamente en el DOM (optimistic UI)
    try {
        const msgEl0 = document.querySelector(`[data-msg-id="${msgId}"]`);
        if (msgEl0) {
            let reacDiv0 = msgEl0.querySelector('.msg-reactions-display');
            if (!reacDiv0) { reacDiv0 = document.createElement('div'); reacDiv0.className = 'msg-reactions-display'; reacDiv0.style.cssText = 'display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;'; msgEl0.appendChild(reacDiv0); }
            const ex0 = reacDiv0.querySelector(`[data-emoji="${emoji}"]`);
            if (!ex0) { const sp0 = document.createElement('span'); sp0.dataset.emoji = emoji; sp0.dataset.count = 1; sp0.textContent = emoji + ' 1'; sp0.style.cssText = 'background:rgba(186,255,0,0.15);border:1px solid rgba(186,255,0,0.3);border-radius:12px;padding:2px 8px;font-size:12px;'; reacDiv0.appendChild(sp0); }
        }
    } catch(e) {}
    if (!sb) return;
    try {
        // Intentar insert simple primero (más compatible)
        const ins = await sb.from('message_reactions').insert({ message_id: msgId, user_email: me.email, emoji });
        if (ins.error && ins.error.code !== '23505') {
            // 23505 = unique violation (ya existe). Si es otro error, intentar upsert
            await sb.from('message_reactions').upsert({ message_id: msgId, user_email: me.email, emoji }, { onConflict: 'message_id,user_email' });
        }
        // Mostrar en el DOM
        const msgEl = document.querySelector(`[data-msg-id="${msgId}"]`);
        if (msgEl) {
            let reacDiv = msgEl.querySelector('.msg-reactions-display');
            if (!reacDiv) { reacDiv = document.createElement('div'); reacDiv.className = 'msg-reactions-display'; reacDiv.style.cssText = 'display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;'; msgEl.appendChild(reacDiv); }
            const existing = reacDiv.querySelector(`[data-emoji="${emoji}"]`);
            if (existing) { existing.dataset.count = parseInt(existing.dataset.count||0)+1; existing.textContent = emoji + ' ' + existing.dataset.count; }
            else { const sp = document.createElement('span'); sp.dataset.emoji = emoji; sp.dataset.count = 1; sp.textContent = emoji + ' 1'; sp.style.cssText = 'background:rgba(255,255,255,0.1);border-radius:12px;padding:2px 8px;font-size:12px;cursor:pointer;'; reacDiv.appendChild(sp); }
        }
    } catch(e) {}
};

// ── Buscar dentro de la conversación ──────────────────────────
window._toggleChatSearch = function() {
    const bar = document.getElementById('msg-search-bar');
    if (!bar) return;
    const showing = bar.style.display !== 'none';
    bar.style.display = showing ? 'none' : 'flex';
    if (showing) { const i = document.getElementById('msg-search-input'); if (i) i.value=''; window._chatSearchFilter(); }
    else { setTimeout(()=>document.getElementById('msg-search-input')?.focus(), 50); }
};
window._chatSearchFilter = function() {
    const q = (document.getElementById('msg-search-input')?.value||'').toLowerCase().trim();
    document.querySelectorAll('#msg-thread-messages .msg-bubble-wrap').forEach(w => {
        const txt = (w.textContent||'').toLowerCase();
        const match = !q || txt.includes(q);
        w.style.display = match ? '' : 'none';
        // resaltar
        const b = w.querySelector('.msg-bubble');
        if (b) b.style.outline = (q && match) ? '2px solid var(--accent)' : 'none';
    });
};
// ── Enviar sticker (emoji grande) ─────────────────────────────
window._sendSticker = function(emoji) {
    const picker = document.getElementById('msg-emoji-picker'); if (picker) picker.style.display='none';
    try { if (window.CancheroMessaging && CancheroMessaging.sendMessage) CancheroMessaging.sendMessage(emoji); } catch(e) {}
};

console.log('[CancheroMessaging] loaded ✓');
