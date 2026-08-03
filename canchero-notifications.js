// canchero-notifications.js — Sistema de notificaciones in-app + push
// Se carga después de script.js. Reemplaza/extiende window.notif.
// v2026-05-28

window.CancheroNotif = (function() {
    'use strict';

    const SB_URL = 'https://dofbxgqzcvfjpnvcvdjb.supabase.co';
    const SB_KEY = 'sb_publishable_gPwLXkMHk3HvFz9nm9hgKA_1D0IJBKA';

    let _sb = null;
    let _realtimeChannel = null;
    let _msgChannel = null;
    let _postsChannel = null;
    let _panelOpen = false;
    let _toastContainer = null;
    let _toastCount = 0;

    try { _sb = window.supabase ? window.supabase.createClient(SB_URL, SB_KEY) : null; } catch(e) {}

    // Cliente compartido (admin/autenticado) — evita que RLS devuelva vacío.
    // El cliente anónimo propio (_sb) se usa sólo como último recurso / realtime.
    function sbc() { return window._sb || window.supabaseClient || _sb; }

    // ── Settings ──────────────────────────────────────────────
    const DEFAULT_SETTINGS = {
        inApp: true, push: false, sound: true, vibration: true, preview: true,
        notifMessages: true, notifLikes: true, notifComments: true, notifShares: true, notifFollows: true,
        muted: []
    };

    function getSettings() {
        try {
            const s = localStorage.getItem('canchero_notif_settings');
            return s ? Object.assign({}, DEFAULT_SETTINGS, JSON.parse(s)) : Object.assign({}, DEFAULT_SETTINGS);
        } catch(e) { return Object.assign({}, DEFAULT_SETTINGS); }
    }

    function saveSettings(s) {
        try { localStorage.setItem('canchero_notif_settings', JSON.stringify(s)); } catch(e) {}
    }

    function isMuted(id) {
        return getSettings().muted.includes(id);
    }

    function muteConversation(id, mute) {
        const s = getSettings();
        if (mute) { if (!s.muted.includes(id)) s.muted.push(id); }
        else { s.muted = s.muted.filter(x => x !== id); }
        saveSettings(s);
    }

    // ── Helpers ───────────────────────────────────────────────
    function getEmail() {
        return (window.userData && window.userData.email) || localStorage.getItem('canchero_email') || null;
    }

    function timeStr(d) {
        if (!d) return '';
        const s = Math.floor((new Date() - new Date(d)) / 1000);
        if (s < 60) return 'Ahora';
        if (s < 3600) return `${Math.floor(s/60)} min`;
        if (s < 86400) return `${Math.floor(s/3600)}h`;
        return `${Math.floor(s/86400)}d`;
    }

    // ── Toast Container ───────────────────────────────────────
    function getToastContainer() {
        if (!_toastContainer || !document.body.contains(_toastContainer)) {
            _toastContainer = document.createElement('div');
            _toastContainer.id = 'canchero-toasts';
            document.body.appendChild(_toastContainer);
        }
        return _toastContainer;
    }

    // ── Toast in-app ──────────────────────────────────────────
    const TOAST_COLORS = {
        message: { bg: '#1a2a3a', icon: '#4fc3f7', bx: 'bx-message-dots' },
        like:    { bg: '#2a1a1a', icon: '#ff4444', bx: 'bxs-heart' },
        comment: { bg: '#1a2a1a', icon: '#baff00', bx: 'bx-comment' },
        follow:  { bg: '#1a2a2a', icon: '#4fc3f7', bx: 'bx-user-plus' },
        story:   { bg: '#2a2010', icon: '#ffb400', bx: 'bx-radio-circle' },
        group:   { bg: '#201a2a', icon: '#9c88ff', bx: 'bx-group' },
        default: { bg: '#1a1a1a', icon: '#888',    bx: 'bx-bell' }
    };

    function showToast(type, title, body, onClick) {
        const settings = getSettings();
        if (!settings.inApp) return;

        const container = getToastContainer();

        // Máximo 3 toasts
        const existing = container.querySelectorAll('.canchero-toast');
        if (existing.length >= 3) {
            existing[0].remove();
            _toastCount--;
        }

        const colors = TOAST_COLORS[type] || TOAST_COLORS.default;
        const displayBody = settings.preview ? (body || '') : '••••••';

        const toast = document.createElement('div');
        toast.className = 'canchero-toast';
        toast.style.cssText = `border-left: 3px solid ${colors.icon};`;
        toast.innerHTML = `
            <div class="toast-icon" style="background:${colors.bg};">
                <i class='bx ${colors.bx}' style="color:${colors.icon};"></i>
            </div>
            <div class="toast-body">
                <div class="toast-title">${title || ''}</div>
                <div class="toast-msg">${displayBody}</div>
            </div>
            <button class="toast-close" onclick="this.closest('.canchero-toast').remove()">✕</button>
        `;

        if (typeof onClick === 'function') {
            toast.style.cursor = 'pointer';
            toast.addEventListener('click', (e) => {
                if (e.target.classList.contains('toast-close')) return;
                onClick();
                toast.remove();
            });
        }

        container.appendChild(toast);
        _toastCount++;

        // Sound
        if (settings.sound) {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = type === 'message' ? 880 : 660;
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.3);
            } catch(e) {}
        }

        // Vibration
        if (settings.vibration && navigator.vibrate) {
            navigator.vibrate(type === 'message' ? [100, 50, 100] : [200]);
        }

        // Auto-dismiss
        const timeout = setTimeout(() => {
            if (document.body.contains(toast)) {
                toast.classList.add('toast-out');
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);

        toast.addEventListener('mouseenter', () => clearTimeout(timeout));

        return toast;
    }

    // ── Push Notifications (Web Push VAPID — sin Firebase) ───────
    // VAPID public key — generada con: npx web-push generate-vapid-keys
    // Debe coincidir con VAPID_PUBLIC_KEY en la Edge Function de Supabase
    const VAPID_PUBLIC_KEY = 'BIKlmm0WMXsrYVRbWs5__kKhrP9LVOBOEV8QjZjuMmM4NjDv_0m64FvtFz7FnZ2pYh6cXYAOXMJul93jqflvoc4';

    function _urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
        return outputArray;
    }

    function _showIOSInstallGuide() {
        const existing = document.getElementById('ios-push-guide');
        if (existing) existing.remove();
        const modal = document.createElement('div');
        modal.id = 'ios-push-guide';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.9);display:flex;align-items:flex-end;';
        modal.innerHTML = `<div style="background:#111;border-radius:20px 20px 0 0;width:100%;padding:28px 24px;padding-bottom:max(28px,env(safe-area-inset-bottom,28px));">
            <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:0 auto 20px;"></div>
            <h3 style="font-family:Outfit,sans-serif;font-weight:900;margin-bottom:14px;font-size:17px;">📲 Activar notificaciones en iPhone</h3>
            <div style="font-size:13px;color:#aaa;line-height:1.9;">
                Para recibir notificaciones en iPhone, instalá Canchero como app:<br><br>
                <span style="color:#fff;font-weight:700;">1.</span> Abrí esta página en <span style="color:var(--accent);font-weight:700;">Safari</span> (no Chrome)<br>
                <span style="color:#fff;font-weight:700;">2.</span> Tocá el botón <span style="color:var(--accent);font-weight:700;">⎙ Compartir</span> abajo<br>
                <span style="color:#fff;font-weight:700;">3.</span> Elegí <span style="color:var(--accent);font-weight:700;">"Añadir a pantalla de inicio"</span><br>
                <span style="color:#fff;font-weight:700;">4.</span> Abrí la app desde tu pantalla de inicio<br>
                <span style="color:#fff;font-weight:700;">5.</span> Volvé a activar las notificaciones desde aquí
            </div>
            <button onclick="document.getElementById('ios-push-guide').remove()" style="width:100%;margin-top:20px;background:var(--accent);color:#000;border:none;border-radius:14px;padding:14px;font-weight:900;font-size:15px;cursor:pointer;font-family:Outfit,sans-serif;">Entendido</button>
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    }

    // Banner iOS: activar push con un tap real (requisito de Apple)
    function _showIOSEnableBanner() {
        if (document.getElementById('ios-push-banner')) return;
        if (sessionStorage.getItem('canchero_ios_push_banner_dismissed')) return;
        const b = document.createElement('div');
        b.id = 'ios-push-banner';
        b.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(86px + env(safe-area-inset-bottom));z-index:100020;background:#111;border:1px solid rgba(186,255,0,0.35);border-radius:16px;padding:12px 14px;display:flex;align-items:center;gap:10px;box-shadow:0 8px 30px rgba(0,0,0,0.6);';
        b.innerHTML = '<i class="bx bx-bell" style="font-size:22px;color:var(--accent);flex-shrink:0;"></i>'
            + '<div style="flex:1;font-size:12px;color:#ddd;line-height:1.4;"><b>Activá las notificaciones</b><br>para enterarte de partidos, mensajes y solicitudes.</div>'
            + '<button id="ios-push-on" style="background:var(--accent);color:#000;border:none;border-radius:10px;padding:9px 13px;font-weight:900;font-size:12px;cursor:pointer;flex-shrink:0;">ACTIVAR</button>'
            + '<button id="ios-push-x" style="background:none;border:none;color:#666;font-size:16px;cursor:pointer;flex-shrink:0;padding:4px;">✕</button>';
        document.body.appendChild(b);
        document.getElementById('ios-push-on').onclick = function(){ b.remove(); try { requestPushPermission(); } catch(e){} };
        document.getElementById('ios-push-x').onclick = function(){ b.remove(); try { sessionStorage.setItem('canchero_ios_push_banner_dismissed','1'); } catch(e){} };
    }

    async function requestPushPermission() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isStandalone = window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
        const hasPushManager = 'PushManager' in window && 'serviceWorker' in navigator;

        // iOS Safari sin PWA instalada — guía de instalación
        if (isIOS && !isStandalone) {
            _showIOSInstallGuide();
            return;
        }

        // iOS con PWA pero Safari viejo (< 16.4) sin PushManager
        if (isIOS && isStandalone && !hasPushManager) {
            if (typeof showToast === 'function') showToast('Actualizá iOS a 16.4 o superior para recibir notificaciones push.', 'warning');
            const statusEl = document.getElementById('push-status-text');
            if (statusEl) statusEl.textContent = '⚠️ iOS 16.4+ requerido para push';
            return;
        }

        // Navegadores sin soporte (no iOS)
        if (!hasPushManager || !('Notification' in window)) {
            if (typeof showToast === 'function') showToast('Tu navegador no soporta notificaciones push. Usá Chrome o Safari 16.4+.', 'warning');
            return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            if (typeof showToast === 'function') showToast('Permiso denegado. Habilitá las notificaciones en Configuración del browser.', 'warning');
            const statusEl = document.getElementById('push-status-text');
            if (statusEl) statusEl.textContent = '✗ Permiso denegado';
            return;
        }

        try {
            // Asegurar que el SW esté registrado
            let reg;
            try {
                reg = await Promise.race([
                    navigator.serviceWorker.ready,
                    new Promise((_, rej) => setTimeout(() => rej(new Error('SW timeout')), 5000))
                ]);
            } catch(_e) {
                reg = await navigator.serviceWorker.register('/sw.js');
                await navigator.serviceWorker.ready;
                reg = await navigator.serviceWorker.ready;
            }
            // Suscribirse con la VAPID public key
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: _urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            // Guardar en tabla push_subscriptions (ya existe en Supabase)
            const email = getEmail();
            if (email && _sb) {
                const subJson = JSON.stringify(sub.toJSON());
                await _sb.from('push_subscriptions').upsert(
                    { user_email: email, endpoint: sub.endpoint, sub_json: subJson },
                    { onConflict: 'user_email,endpoint' }
                );
            }

            // Guardar en settings
            const s = getSettings();
            s.push = true;
            saveSettings(s);

            // Sin toast ni notificación de prueba de "Push activado" (pedido del usuario):
            // solo se actualiza el texto de estado dentro de Ajustes.
            const statusEl = document.getElementById('push-status-text');
            if (statusEl) statusEl.textContent = '✓ Push activado — recibirás notificaciones fuera de la app';

        } catch(e) {
            // El push todavía no está 100% configurado (VAPID/backend): si falla, fallar EN SILENCIO.
            // Solo se muestra feedback si el usuario lo activó manualmente desde Ajustes.
            console.warn('[push] no se pudo activar (silencioso):', e && e.message);
            const statusEl = document.getElementById('push-status-text');
            if (statusEl) statusEl.textContent = '✗ Push no disponible por ahora';
            if (window._pushManualRequest) {
                const _detail = (e && e.message && e.message.includes('row-level security'))
                    ? 'Cerrá sesión y volvé a entrar para reactivar el push.'
                    : 'Revisá los permisos de notificaciones del navegador.';
                showToast('default', 'Error', 'No se pudo activar el push. ' + _detail, null);
            }
        }
    }

    // ── Settings UI ───────────────────────────────────────────
    function openSettings() {
        const modal = document.getElementById('notif-settings-modal');
        if (!modal) return;
        modal.style.display = 'flex';
        _renderSettingsContent();
    }

    function _renderSettingsContent() {
        const el = document.getElementById('notif-settings-content');
        if (!el) return;
        const s = getSettings();
        const toggleRow = (key, label, icon, subtitle) => {
            const on = !!s[key];
            return `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #1a1a1a;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <i class='bx ${icon}' style="color:#888;font-size:18px;width:20px;flex-shrink:0;"></i>
                    <div>
                        <div style="font-size:13px;font-weight:600;">${label}</div>
                        ${subtitle ? `<div style="font-size:10px;color:#555;">${subtitle}</div>` : ''}
                    </div>
                </div>
                <label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;flex-shrink:0;margin-left:8px;">
                    <input type="checkbox" ${on ? 'checked' : ''} onchange="CancheroNotif._toggleSetting('${key}',this.checked)" style="opacity:0;width:0;height:0;position:absolute;">
                    <span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:${on?'var(--accent)':'#333'};border-radius:24px;transition:.3s;">
                        <span style="position:absolute;height:18px;width:18px;left:${on?'23px':'3px'};bottom:3px;background:${on?'#000':'#666'};border-radius:50%;transition:.3s;"></span>
                    </span>
                </label>
            </div>`;
        };
        const collapsible = (id, title, icon, bodyHtml, open) => `
            <div style="border:1px solid #1e1e1e;border-radius:14px;margin-bottom:10px;overflow:hidden;background:rgba(255,255,255,0.02);">
                <button onclick="CancheroNotif._toggleNotifGroup('${id}')" style="width:100%;display:flex;align-items:center;justify-content:space-between;background:none;border:none;color:#fff;cursor:pointer;padding:14px 14px;font-family:inherit;">
                    <span style="display:flex;align-items:center;gap:10px;font-size:13px;font-weight:800;letter-spacing:.5px;"><i class='bx ${icon}' style="color:var(--accent);font-size:18px;"></i> ${title}</span>
                    <i class='bx bx-chevron-down' id="notif-chev-${id}" style="font-size:20px;color:#888;transition:transform .2s;transform:rotate(${open?'180deg':'0deg'});"></i>
                </button>
                <div id="notif-group-${id}" style="display:${open?'block':'none'};padding:0 14px 6px;">${bodyHtml}</div>
            </div>`;

        const generalBody =
            toggleRow('inApp', 'Notificaciones in-app', 'bx-bell', 'Alertas dentro de la app') +
            toggleRow('push', 'Notificaciones push', 'bx-broadcast', 'Alertas con la app cerrada') +
            toggleRow('sound', 'Sonido', 'bx-volume-full', '') +
            toggleRow('vibration', 'Vibración', 'bx-pulse', 'Vibrar al recibir alertas') +
            toggleRow('preview', 'Preview de mensajes', 'bx-show', 'Mostrar contenido en notificaciones');

        const categoriasBody =
            toggleRow('notifMessages', 'Mensajes directos', 'bx-message-dots', 'Nuevos mensajes y respuestas') +
            toggleRow('notifLikes', 'Likes', 'bx-heart', 'Cuando dan like a tus posts') +
            toggleRow('notifComments', 'Comentarios', 'bx-comment', 'Cuando comentan tus posts') +
            toggleRow('notifShares', 'Compartidos', 'bx-share-alt', 'Cuando comparten tus posts') +
            toggleRow('notifFollows', 'Nuevos seguidores', 'bx-user-plus', 'Cuando alguien te sigue');

        // Toggle de rol jugador ↔ fanático en la misma cuenta
        const _ud = window.userData || {};
        const _curRole = (_ud.role || 'jugador').toLowerCase();
        const _altRole = _curRole === 'fanatico' ? 'jugador' : (_curRole === 'jugador' ? 'fanatico' : null);
        const roleSwitchBody = _altRole ? `
            <div style="padding:12px 0;">
                <div style="font-size:13px;font-weight:700;margin-bottom:4px;">Estás usando Canchero como <span style="color:var(--accent);text-transform:uppercase;">${_curRole}</span></div>
                <div style="font-size:11px;color:#888;margin-bottom:10px;">${_curRole==='jugador'?'Si seguís fútbol y querés crear contenido sin jugar, pasá a Fanático.':'Si jugás al fútbol y querés que se carguen tus partidos/estadísticas, pasá a Jugador.'}</div>
                <button onclick="CancheroNotif._switchRole('${_altRole}')" style="width:100%;background:linear-gradient(135deg,rgba(186,255,0,0.18),rgba(186,255,0,0.04));border:1px solid rgba(186,255,0,0.4);color:var(--accent);border-radius:10px;padding:12px;font-weight:900;font-size:13px;cursor:pointer;"><i class='bx bx-transfer-alt'></i> Cambiar a ${_altRole.toUpperCase()}</button>
            </div>
        ` : '<div style="padding:12px 0;font-size:12px;color:#888;">Tu cuenta es de negocio. El cambio de rol no aplica.</div>';

        el.innerHTML = `
            ${collapsible('rol', 'Cambiar tipo de perfil', 'bx-transfer-alt', roleSwitchBody, true)}
            ${collapsible('general', 'General', 'bx-cog', generalBody, false)}
            ${collapsible('categorias', 'Categorías', 'bx-category', categoriasBody, false)}
            <div id="push-status-text" style="font-size:11px;color:#555;padding:4px 2px 10px;">${s.push ? '✓ Push configurado' : 'Push no configurado — activá el botón de abajo'}</div>
            <button onclick="CancheroNotif._testNotif()" style="width:100%;background:rgba(186,255,0,0.1);border:1px solid rgba(186,255,0,0.3);color:var(--accent,#baff00);border-radius:10px;padding:11px;font-weight:900;font-size:12px;cursor:pointer;margin-bottom:8px;"><i class='bx bx-bell'></i> ENVIAR NOTIFICACIÓN DE PRUEBA</button>
        `;
    }

    async function _switchRole(newRole){
        if (newRole !== 'jugador' && newRole !== 'fanatico') return;
        const u = window.userData || {};
        if (!u.email) return;
        if (!confirm('¿Cambiar tu perfil a ' + newRole.toUpperCase() + '?\n\nTu información, posts y seguidores se mantienen. Solo cambia cómo se muestra tu tarjeta y las funciones del feed.')) return;
        try {
            const sb = window._sb;
            if (sb) await sb.from('users').update({ role: newRole }).eq('email', u.email);
            u.role = newRole; window.userData.role = newRole;
            try { localStorage.setItem('canchero_user', JSON.stringify(u)); } catch(e){}
            if (window.showToast) showToast('Perfil cambiado a ' + newRole.toUpperCase() + '. Recargando…','success');
            setTimeout(()=>{ try { location.reload(); } catch(e){} }, 700);
        } catch(e) {
            if (window.showToast) showToast('No se pudo cambiar el rol: '+(e.message||e), 'error');
        }
    }

    function _toggleNotifGroup(id) {
        const body = document.getElementById('notif-group-' + id);
        const chev = document.getElementById('notif-chev-' + id);
        if (!body) return;
        const open = body.style.display !== 'none';
        body.style.display = open ? 'none' : 'block';
        if (chev) chev.style.transform = open ? 'rotate(0deg)' : 'rotate(180deg)';
    }

    function _toggleSetting(key, value) {
        const s = getSettings();
        s[key] = value;
        saveSettings(s);
        // Re-render para actualizar colores de los toggles
        setTimeout(_renderSettingsContent, 50);
    }

    // ── Notification panel (campana) ─────────────────────────
    async function load() {
        const email = getEmail();
        const _c = sbc();
        if (!email || !_c) return;
        // El esquema de la tabla puede usar recipient_email/read O user_email/read_at.
        // Consultamos ambas variantes y unimos para que el panel nunca quede vacío
        // cuando la campana marca que hay notificaciones.
        const emails = [email];
        if (email.toLowerCase() !== email) emails.push(email.toLowerCase());
        async function q(col, val){
            try {
                const { data, error } = await _c.from('notifications')
                    .select('*').eq(col, val)
                    .order('created_at', { ascending: false }).limit(40);
                if (error) return [];
                return data || [];
            } catch(e){ return []; }
        }
        const cols = ['recipient_email', 'user_email'];
        const results = [];
        for (const c of cols){ for (const v of emails){ results.push(...await q(c, v)); } }
        const map = {};
        results.forEach(r => { if (r && r.id != null) map[r.id] = r; });
        let items = Object.values(map);
        items.forEach(n => { n._read = !!(n.read || n.read_at); });
        items.sort((a,b) => new Date(b.created_at||0) - new Date(a.created_at||0));
        _render(items.slice(0, 40));
    }

    function _render(items) {
        const list = document.getElementById('notif-list');
        if (!list) return;
        items.forEach(n => { if (n._read === undefined) n._read = !!(n.read || n.read_at); });
        const unread = items.filter(n => !n._read).length;

        // Actualizar badge de campana (navbar principal)
        const mainBadge = document.getElementById('notif-badge');
        if (mainBadge) {
            mainBadge.textContent = unread > 9 ? '9+' : String(unread);
            mainBadge.style.display = unread > 0 ? 'flex' : 'none';
        }
        // Badge del feed
        const feedBadge = document.getElementById('feed-notif-badge');
        if (feedBadge) {
            feedBadge.textContent = unread > 9 ? '9+' : String(unread);
            feedBadge.style.display = unread > 0 ? 'flex' : 'none';
        }
        // Icono campana (navbar + feed)
        ['notif-bell-icon', 'feed-notif-bell-icon'].forEach(id => {
            const icon = document.getElementById(id);
            if (icon) icon.className = unread > 0 ? 'bx bxs-bell' : 'bx bx-bell';
        });

        // Mobile badge en mensajes
        const mobileBadge = document.getElementById('mobile-msg-badge');
        if (mobileBadge) {
            const unreadMsgs = items.filter(n => !n.read && n.type === 'dm').length;
            if (unreadMsgs > 0) {
                mobileBadge.textContent = unreadMsgs > 9 ? '9+' : String(unreadMsgs);
                mobileBadge.style.display = 'flex';
            } else {
                mobileBadge.style.display = 'none';
            }
        }

        if (!items.length) {
            list.innerHTML = '<div style="padding:24px;text-align:center;color:#555;font-size:13px;"><i class=\'bx bx-bell-off\' style="font-size:28px;display:block;margin-bottom:8px;"></i>Sin notificaciones aún.</div>';
            return;
        }

        const icons = { like: 'bxs-heart', comment: 'bx-comment', follow: 'bx-user-plus', story: 'bx-radio-circle', dm: 'bx-message-dots', group: 'bx-group', achievement: 'bxs-trophy' };
        const colors = { like: '#ff4444', comment: '#baff00', follow: '#4fc3f7', story: '#ffb400', dm: '#4fc3f7', group: '#9c88ff', achievement: '#FFD700' };
        window.__notifItems = items;  // cache para deep-link
        list.innerHTML = items.map(n => {
            // Todas las notificaciones llevan a su contenido (estilo Instagram)
            const clickAction = `CancheroNotif.openNotif('${n.id}')`;
            return `
            <div onclick="${clickAction}" style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;background:${n._read ? 'transparent' : 'rgba(186,255,0,0.03)'};" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='${n._read?'transparent':'rgba(186,255,0,0.03)'}'">
                <div style="width:32px;height:32px;border-radius:50%;background:${colors[n.type]||'#555'}22;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class='bx ${icons[n.type]||'bx-bell'}' style="color:${colors[n.type]||'#888'};font-size:16px;"></i>
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:12px;line-height:1.4;">${n.message||(n.actor_name?(n.actor_name+' '):'')||''}</div>
                    <div style="font-size:10px;color:#555;margin-top:3px;">${timeStr(n.created_at)}</div>
                </div>
                ${!n._read ? '<div style="width:7px;height:7px;border-radius:50%;background:#baff00;flex-shrink:0;margin-top:4px;"></div>' : ''}
            </div>`;
        }).join('');
    }

    async function markRead(id) {
        const _c = sbc();
        if (!_c) return;
        // soporta ambos esquemas (read / read_at)
        try { await _c.from('notifications').update({ read: true }).eq('id', id); } catch(e) {}
        try { await _c.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id); } catch(e) {}
        load();
    }

    // Deep-link: lleva a la notificación a su contenido (mensaje, post, perfil, etc.)
    async function openNotif(id) {
        try { markRead(id); } catch(e) {}
        const panel = document.getElementById('notif-panel');
        if (panel) panel.style.display = 'none';
        _panelOpen = false;
        const n = (window.__notifItems || []).find(x => String(x.id) === String(id)) || {};
        routeNotifData(n);
    }

    // Enrutamiento por tipo (reutilizable desde push notifications del Service Worker)
    function routeNotifData(n) {
        n = n || {};
        const t = n.type || '';
        const actor = n.actor_email || n.sender_email || n.from_email;
        const postId = n.post_id || n.target_id || n.entity_id;
        const isMatchType = ['match','match_invite','match_accept','request_accepted','desafio'].includes(t);
        const matchId = n.match_id || (n.ref_type === 'match' ? n.ref_id : null) || (isMatchType ? postId : null);
        try {
            if (t === 'dm' || t === 'message' || t === 'mensaje' || t === 'reserva' || t === 'compra' || t === 'venta' || t === 'purchase') {
                // Mensajes y reservas → abrir el chat con esa persona/negocio
                if (typeof switchDashboardTab === 'function') switchDashboardTab('jugador','mensajes',null);
                setTimeout(()=>{ if (actor && typeof window.openChatWith === 'function') window.openChatWith(actor, n.actor_name); }, 250);
            } else if (t === 'match_request') {
                // Solicitud de un jugador → pantalla de aprobación estilo Tinder.
                // El id del partido viene en post_id (así lo guarda CancheroNotif.create).
                var mid = n.post_id || matchId || n.ref_id || n.match_id;
                if (mid && typeof window.renderMatchRequestsTinder === 'function') {
                    if (typeof switchDashboardTab === 'function') switchDashboardTab('jugador','mis-partidos',null);
                    setTimeout(()=>{ try { if (typeof switchMisPartidosTab === 'function') switchMisPartidosTab('solicitudes', document.getElementById('mpt-solicitudes')); } catch(e){} window.renderMatchRequestsTinder(mid); }, 350);
                } else if (typeof switchDashboardTab === 'function') {
                    switchDashboardTab('jugador','mis-partidos',null);
                }
            } else if (t === 'desafio' || t === 'match_challenge') {
                // Desafío entrante → mostrar aceptar / rechazar
                var did = matchId || n.ref_id || n.match_id || postId;
                if (typeof window.showDesafioAnimation === 'function') window.showDesafioAnimation(n.message || '', n.actor_name || n.sender_name || 'Un equipo', did);
                else if (did && typeof window.viewMatchDetails === 'function') window.viewMatchDetails(did);
            } else if (t === 'match_result' || t === 'revancha') {
                // Resultado → abrir la ficha del partido
                var cid = matchId || n.ref_id || n.match_id;
                if (cid && typeof window.viewMatchDetails === 'function') window.viewMatchDetails(cid);
            } else if (t === 'follow') {
                if (actor && typeof window.viewUserProfile === 'function') window.viewUserProfile(actor);
                else if (actor && typeof window.openUserProfile === 'function') window.openUserProfile(actor);
            } else if (t === 'achievement') {
                if (typeof switchDashboardTab === 'function') { switchDashboardTab('jugador','perfil',null); setTimeout(()=>{ if(typeof switchProfileTab==='function') switchProfileTab('jugador','logros',null); },300); }
            } else if (t === 'like' || t === 'comment') {
                if (postId && typeof window.openPostById === 'function') window.openPostById(postId);
                else if (postId && typeof window.openComments === 'function') window.openComments(postId);
                else if (typeof switchDashboardTab === 'function') switchDashboardTab('jugador','feed',null);
            } else if (t === 'chicana') {
                if (actor && typeof window.openChatWith === 'function') { if(typeof switchDashboardTab==='function') switchDashboardTab('jugador','mensajes',null); setTimeout(()=>window.openChatWith(actor, n.actor_name),250); }
            } else if (t === 'game_challenge') {
                // Llevarlo DIRECTO a jugar el desafío pendiente más nuevo
                (async () => {
                    try {
                        if (window.CGCore && CGCore.loadMyChallenges) {
                            const { incoming } = await CGCore.loadMyChallenges();
                            const pend = (incoming || []).find(ch => ch.status === 'pending');
                            if (pend) { CGCore.acceptChallenge(pend.id); return; }
                            const acc = (incoming || []).find(ch => ch.status === 'accepted');
                            if (acc) { CGCore.acceptChallenge(acc.id); return; }
                        }
                    } catch(e) {}
                    if (typeof window.openGamesModal === 'function') window.openGamesModal();
                })();
            } else if (t === 'club_request') {
                // Llevar DIRECTO al visor tinder de solicitudes (aceptar/rechazar ya)
                const cid = n.post_id || n.ref_id || null;
                if (cid) { window.currentEditingClubId = cid; }
                if (cid && typeof window.renderClubRequestsTinder === 'function') {
                    window.renderClubRequestsTinder(cid);
                } else if (typeof switchDashboardTab === 'function') {
                    switchDashboardTab('jugador', 'club-gestion', null);
                    setTimeout(() => { try { window.switchClubGestionTab && switchClubGestionTab('planilla', null); } catch(e) {} }, 400);
                }
            } else if (t === 'club_accept' || t === 'club_reject') {
                if (typeof switchDashboardTab === 'function') switchDashboardTab('jugador', 'mis-clubes', null);
            } else if (t === 'biz_approved') {
                if (window._showBizActivation && window.userData) window._showBizActivation(window.userData.email);
            } else if (t === 'torneo_solicitud' || t === 'torneo_comunicado' || t === 'torneo_pago') {
                // Torneos: si soy la organización creadora → gestión con la pestaña
                // Solicitudes abierta (aceptar/rechazar ya); si no → vista pública.
                (async function(){
                    var tid2 = n.post_id || n.ref_id || null;
                    if (!tid2 || !window.CancheroTournaments) return;
                    try {
                        var rT = await window._sb.from('tournaments').select('organizer_email').eq('id', tid2).single();
                        var orgE = rT && rT.data && rT.data.organizer_email;
                        var meE = ((window.userData && window.userData.email) || '').toLowerCase();
                        if (t === 'torneo_solicitud' && orgE && orgE.toLowerCase() === meE) {
                            CancheroTournaments.openTournamentManager(tid2, orgE);
                            setTimeout(function(){ try { CancheroTournaments._ctmTab('solicitudes', tid2, orgE, document.querySelector('.ctm-tab[data-tab="solicitudes"]')); } catch(e){} }, 800);
                        } else {
                            CancheroTournaments.openPublicView(tid2);
                        }
                    } catch(e) { try { CancheroTournaments.openPublicView(tid2); } catch(e2){} }
                })();
            } else if (t === 'game_result') {
                if (typeof window.openGamesModal === 'function') window.openGamesModal();
            } else if (matchId) {
                // Aceptado/invitado a un partido: directo al PANEL del partido
                if (window.MatchDashboard && typeof window.MatchDashboard.open === 'function') window.MatchDashboard.open(matchId);
                else if (typeof window.viewMatchDetails === 'function') window.viewMatchDetails(matchId);
            } else if (typeof switchDashboardTab === 'function') {
                switchDashboardTab('jugador','feed',null);
            }
        } catch(e) { console.warn('[notif] openNotif route error', e); }
    }

    async function markAllRead() {
        const email = getEmail();
        const _c = sbc();
        if (!email || !_c) return;
        // soporta ambos esquemas (recipient_email/read y user_email/read_at)
        try { await _c.from('notifications').update({ read: true }).eq('recipient_email', email).eq('read', false); } catch(e) {}
        try { await _c.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_email', email).is('read_at', null); } catch(e) {}
        load();
        const panel = document.getElementById('notif-panel');
        if (panel) panel.style.display = 'none';
        _panelOpen = false;
    }

    function togglePanel() {
        const panel = document.getElementById('notif-panel');
        if (!panel) return;
        _panelOpen = !_panelOpen;
        panel.style.display = _panelOpen ? 'flex' : 'none';
        if (_panelOpen) { load(); _markAllReadSilent(); }
    }

    // Limpia el badge (número rojo) apenas se abre la campana, marcando todo como
    // leído en la DB, SIN cerrar el panel (los items siguen visibles y clickeables).
    async function _markAllReadSilent() {
        ['notif-badge','feed-notif-badge'].forEach(id => { const b = document.getElementById(id); if (b) b.style.display = 'none'; });
        ['notif-bell-icon','feed-notif-bell-icon'].forEach(id => { const i = document.getElementById(id); if (i) i.className = 'bx bx-bell'; });
        const email = getEmail(); const _c = sbc();
        if (!email || !_c) return;
        try { await _c.from('notifications').update({ read: true }).eq('recipient_email', email).eq('read', false); } catch(e) {}
        try { await _c.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_email', email).is('read_at', null); } catch(e) {}
    }

    // Envío de Web Push vía serverless (fire-and-forget). El payload lleva la
    // notificación entera para que el tap deep-linkee al contenido exacto.
    function sendPush(recipientEmail, title, body, notifData) {
        try {
            fetch('/api/send-push', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to_email: recipientEmail, title: title, body: body, notif: notifData || null })
            }).catch(()=>{});
        } catch(e) {}
    }
    window._sendPush = sendPush;

    async function create(recipientEmail, type, actorName, message, postId = null) {
        const senderEmail = getEmail();
        const _c = sbc();
        if (!_c || !recipientEmail || recipientEmail === senderEmail) return;
        // Push fuera de la app (Android PWA / iOS PWA instalada)
        sendPush(recipientEmail, actorName || 'Canchero', message || '', {
            type, actor_email: senderEmail, actor_name: actorName, post_id: postId
        });
        // Intentar el esquema recipient_email/read; si la tabla usa user_email/read_at, reintentar
        try {
            const { error } = await _c.from('notifications').insert({
                recipient_email: recipientEmail, type, actor_name: actorName,
                actor_email: senderEmail, post_id: postId, message, read: false,
            });
            if (!error) return;
        } catch(e) {}
        try {
            await _c.from('notifications').insert({
                user_email: recipientEmail, type, actor_name: actorName,
                actor_email: senderEmail, post_id: postId, message, read_at: null,
            });
        } catch(e) {}
    }

    function showBell(show) {
        // Mostrar/ocultar campana en el navbar principal
        const wrap = document.getElementById('notif-bell-wrap');
        if (wrap) wrap.style.display = show ? 'flex' : 'none';
        const gear = document.getElementById('nav-gear-wrap');
        if (gear) gear.style.display = show ? 'flex' : 'none';
        if (show) {
            load();
            startRealtime();
            // También actualizar badge de mensajes directamente desde tabla messages
            _updateMsgBadge();
        }
    }

    // Actualizar badge de chats leyendo mensajes no leídos directamente
    async function _updateMsgBadge() {
        const email = getEmail();
        const _c = sbc();
        if (!email || !_c) return;
        try {
            const { count } = await _c.from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('recipient_email', email)
                .eq('read', false);
            const mobileBadge = document.getElementById('mobile-msg-badge');
            if (mobileBadge) {
                if (count > 0) {
                    mobileBadge.textContent = count > 9 ? '9+' : String(count);
                    mobileBadge.style.display = 'flex';
                } else {
                    mobileBadge.style.display = 'none';
                }
            }
        } catch(e) {}
    }

    // ── Realtime: escuchar notificaciones en tiempo real ──────
    function startRealtime() {
        if (!_sb || _realtimeChannel) return;
        const email = getEmail();
        if (!email) return;
        try {
            // Canales SEPARADOS y ESCALONADOS. Un canal por tabla evita el quirk de
            // multi-binding (donde solo dispara el primer binding); el escalonado evita
            // que varios .subscribe() sincrónicos se cierren entre sí.

            // 1) NOTIFICACIONES (inmediato)
            _realtimeChannel = _sb.channel(`notif-rt:${email}`)
                .on('postgres_changes', {
                    event: 'INSERT', schema: 'public', table: 'notifications',
                    filter: `recipient_email=eq.${email}`
                }, (payload) => {
                    const n = payload.new;
                    if (!n) return;
                    load();
                    if (n.type === 'dm') { _updateMsgBadge(); return; }
                    // CHICANA: mostrar animación grande al centro de la pantalla
                    if (n.type === 'chicana') {
                        var raw = n.message || '';
                        var m = raw.match(/"([^"]+)"/);
                        var text = m ? m[1] : raw.replace(/^⚡\s*[^:]+:\s*/, '');
                        if (typeof window.showChicanaAnimation === 'function') {
                            window.showChicanaAnimation(text, n.actor_name || 'Alguien');
                        }
                        return;
                    }
                    // DESAFÍO: mostrar tarjeta grande al centro de la pantalla (igual que las chicanas)
                    if (n.type === 'desafio') {
                        if (typeof window.showDesafioAnimation === 'function') {
                            window.showDesafioAnimation(n.message || '', n.actor_name || 'Un equipo', n.post_id || null);
                        }
                        return;
                    }
                    const settings = getSettings();
                    if (!settings.inApp || isMuted(n.actor_email || '')) return;
                    const typeMap = { like: 'like', comment: 'comment', follow: 'follow', story: 'story', group: 'group', achievement: 'default' };
                    showToast(typeMap[n.type] || 'default', n.actor_name || 'Canchero', n.message || '', null);
                })
                .subscribe();

            // 2) MENSAJES (escalonado +700ms) — clave para el badge en tiempo real
            setTimeout(() => {
                if (_msgChannel) return;
                _msgChannel = _sb.channel(`msg-rt:${email}`)
                    .on('postgres_changes', {
                        event: 'INSERT', schema: 'public', table: 'messages',
                        filter: `recipient_email=eq.${email}`
                    }, (payload) => {
                        const m = payload.new;
                        if (!m) return;
                        _updateMsgBadge();
                        const viewingThisChat = window.CancheroMessaging
                            && window.CancheroMessaging._activeThreadEmail
                            && window.CancheroMessaging._activeThreadEmail() === m.sender_email;
                        if (viewingThisChat) return;
                        const settings = getSettings();
                        const senderName = m.sender_name || (m.sender_email || '').split('@')[0] || 'Mensaje';
                        const preview = m.media_type === 'image' ? '📷 Foto' : (m.media_type === 'audio' ? '🎤 Audio' : (m.content || 'Nuevo mensaje'));
                        if (settings.inApp !== false && !isMuted(m.sender_email || '')) {
                            showToast('message', senderName, preview, () => {
                                if (typeof window.switchDashboardTab === 'function') window.switchDashboardTab('jugador', 'mensajes', null);
                                setTimeout(() => { if (window.CancheroMessaging) window.CancheroMessaging.openThread('dm', null, m.sender_email, senderName); }, 300);
                            });
                        }
                        _showLocalNotification('💬 ' + senderName, preview, m.sender_email, senderName);
                    })
                    .subscribe();
            }, 700);

            // 3) POSTS del feed (escalonado +1400ms)
            setTimeout(() => {
                if (_postsChannel) return;
                _postsChannel = _sb.channel(`posts-rt:${email}`)
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
                        const feedEl = document.getElementById('amigos-feed');
                        if (feedEl && document.getElementById('jugador-amigos') && document.getElementById('jugador-amigos').style.display !== 'none') {
                            if (typeof social !== 'undefined' && typeof social.loadFeed === 'function') social.loadFeed('amigos-feed');
                        }
                    })
                    .subscribe();
            }, 1400);
        } catch(e) { console.warn('[CancheroNotif] Realtime error:', e); }
    }

    // Notificación nativa del navegador (in-app cuando la pestaña está abierta o en background)
    function _showLocalNotification(title, body, senderEmail, senderName) {
        try {
            if (!('Notification' in window) || Notification.permission !== 'granted') return;
            if (document.visibilityState === 'visible') return; // si está mirando la app, basta el toast
            const n = new Notification(title, { body: body, icon: '/logo-oficial.png', tag: 'msg-' + (senderEmail||''), badge: '/logo-oficial.png' });
            n.onclick = function() {
                window.focus();
                if (typeof window.switchDashboardTab === 'function') window.switchDashboardTab('jugador', 'mensajes', null);
                setTimeout(() => { if (window.CancheroMessaging) window.CancheroMessaging.openThread('dm', null, senderEmail, senderName); }, 300);
                n.close();
            };
        } catch(e) {}
    }

    // ── Test notification ─────────────────────────────────────
    function _testNotif() {
        const me = window.userData;
        // Toast in-app de prueba
        showToast('like', me ? (me.name || 'Vos') : 'Canchero', '¡Las notificaciones están funcionando! 🎉', null);
        // Si tiene push activado, disparar notificación nativa
        const s = getSettings();
        if (s.push && 'Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification('¡Canchero! 🟢', {
                    body: 'Las notificaciones push están activas.',
                    icon: '/logo-oficial.png'
                });
            } catch(e) {}
        }
        // Crear notificación real en DB para probarla en el panel
        if (me && me.email) {
            create(me.email, 'like', 'Canchero', '🔔 Notificación de prueba — ¡todo funciona!', null);
        }
    }

    // ── Init ──────────────────────────────────────────────────
    function init() {
        // Idempotente: solo inicializar una vez por sesión de página
        if (window._cancheroNotifInitialized) { load(); _updateMsgBadge(); return; }
        window._cancheroNotifInitialized = true;
        startRealtime();
        load();
        _updateMsgBadge();
        // Pedir permiso de notificaciones solo si nunca se pidió antes
        setTimeout(() => {
            try {
                // NUNCA pedir notificaciones sin sesión (en el home). El aviso solo tiene sentido
                // adentro, logueado — antes salía en la landing sin haber entrado.
                if (!(window.userData && window.userData.email)) return;
                // Los intentos de push al ENTRAR son automáticos → nunca mostrar el toast de error
                // (el error solo se muestra si el usuario lo activa a mano desde Ajustes).
                window._pushManualRequest = false;
                // iOS instalado (PWA): requestPermission SOLO funciona con un tap
                // del usuario — el pedido automático falla en silencio. Mostrar
                // un banner con botón (gesto real) en vez de pedirlo solo.
                const _isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                const _isStandalone = window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
                if (_isIOS && _isStandalone && 'Notification' in window && Notification.permission === 'default') {
                    // El banner iOS solo una vez (antes reaparecía en cada carga).
                    if (!localStorage.getItem('canchero_ios_banner_shown')) {
                        localStorage.setItem('canchero_ios_banner_shown', '1');
                        _showIOSEnableBanner();
                    }
                    return;
                }
                if (_isIOS && _isStandalone && 'Notification' in window && Notification.permission === 'granted') {
                    try { requestPushPermission(); } catch(e) {}
                    return;
                }
                if (localStorage.getItem('canchero_push_asked')) {
                    // Ya se pidió: si está granted, asegurar suscripción
                    if ('Notification' in window && Notification.permission === 'granted') {
                        try { requestPushPermission(); } catch(e) {}
                    }
                    return;
                }
                if ('Notification' in window && Notification.permission === 'default') {
                    localStorage.setItem('canchero_push_asked', '1');
                    Notification.requestPermission().then((perm) => {
                        if (perm === 'granted') {
                            try { requestPushPermission(); } catch(e) {}
                        }
                    });
                } else if ('Notification' in window && Notification.permission === 'granted') {
                    localStorage.setItem('canchero_push_asked', '1');
                    try { requestPushPermission(); } catch(e) {}
                }
            } catch(e) {}
        }, 2500);
    }

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
        if (_panelOpen && !e.target.closest('#notif-bell-wrap')) {
            const panel = document.getElementById('notif-panel');
            if (panel) panel.style.display = 'none';
            _panelOpen = false;
        }
    });

    // ── Public API ────────────────────────────────────────────
    return {
        init,
        load,
        togglePanel,
        markRead,
        openNotif,
        routeNotifData,
        markAllRead,
        create,
        showBell,
        showToast,
        requestPushPermission,
        openSettings,
        _switchRole: _switchRole,
        muteConversation,
        isMuted,
        getSettings,
        _toggleSetting,
        _toggleNotifGroup,
        startRealtime,
        // Alias para compatibilidad con script.js antiguo
        _render,
        _testNotif
    };
})();

// Sobreescribir window.notif con el nuevo sistema (mantiene backward compat)
window.notif = window.CancheroNotif;

// Deep-link desde el Service Worker (tap en push notification) → navegar al contenido
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', function(ev) {
        if (ev.data && ev.data.type === 'OPEN_NOTIF' && window.CancheroNotif && window.CancheroNotif.routeNotifData) {
            try { window.CancheroNotif.routeNotifData(ev.data.notif || {}); } catch(e) {}
        }
    });
}

// Deep-link al ABRIR la app desde una push (app cerrada → openWindow con ?notif=)
(function(){
    try {
        var p = new URLSearchParams(location.search).get('notif');
        if (!p) return;
        var n = JSON.parse(decodeURIComponent(p));
        // limpiar la URL y rutear cuando la sesión esté cargada
        try { history.replaceState(null, '', location.pathname); } catch(e){}
        var tries = 0;
        var iv = setInterval(function(){
            tries++;
            if (window.userData && window.CancheroNotif && window.CancheroNotif.routeNotifData) {
                clearInterval(iv);
                try { window.CancheroNotif.routeNotifData(n); } catch(e){}
            } else if (tries > 40) clearInterval(iv);
        }, 500);
    } catch(e) {}
})();

console.log('[CancheroNotif] loaded ✓');
