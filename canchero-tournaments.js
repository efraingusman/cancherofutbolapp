// canchero-tournaments.js — Sistema completo de torneos para Canchero
// Fixture, grupos, eliminación directa, estadísticas, rankings, inscripción con pago
// v2026-05-31

window.CancheroTournaments = (function() {
    'use strict';

    function getSb() { return window._sb; }
    function getUser() { return window.userData || null; }
    function toast(msg, type) { if (typeof showToast === 'function') showToast(msg, type || 'success'); }

    const POSICIONES = ['ARQ','DEF','LAT','MED','VOL','ENG','DEL','EXT'];
    const POS_LABEL = { ARQ:'Arquero', DEF:'Defensor', LAT:'Lateral', MED:'Mediocampista', VOL:'Volante', ENG:'Enganche', DEL:'Delantero', EXT:'Extremo' };

    function _esc(s){ return String(s==null?'':s).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])); }

    // ISO → valor de <input datetime-local> (YYYY-MM-DDTHH:mm) en hora local.
    function _toLocalInput(iso){
        try { const d = new Date(iso); if (isNaN(d)) return ''; const p = n => String(n).padStart(2,'0');
            return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes()); } catch(e){ return ''; }
    }

    // Subir imagen al bucket 'media' y devolver la URL pública.
    async function _uploadImg(file, folder) {
        const sb = getSb();
        if (!sb || !file) return null;
        const path = (folder||'torneos') + '/' + (Date.now()) + '-' + Math.random().toString(36).slice(2,7) + '.jpg';
        try {
            const up = await sb.storage.from('media').upload(path, file, { upsert:true, contentType: file.type || 'image/jpeg' });
            if (up.error) return null;
            return sb.storage.from('media').getPublicUrl(path).data.publicUrl;
        } catch(e){ return null; }
    }

    // Logo del equipo en CÍRCULO con aro verde — igual que en la ficha de Partidos.
    function _shieldHTML(url, name, size) {
        size = size || 40;
        const initials = (name||'?').trim().slice(0,2).toUpperCase();
        const inner = url
            ? `<img src="${_esc(url)}" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:50%;" onerror="this.parentNode.innerHTML='<span style=\\'font-size:${Math.round(size*0.32)}px;font-weight:900;color:var(--accent);display:flex;align-items:center;justify-content:center;width:100%;height:100%;\\'>${initials}</span>'">`
            : `<span style="font-size:${Math.round(size*0.32)}px;font-weight:900;color:var(--accent);display:flex;align-items:center;justify-content:center;width:100%;height:100%;">${initials}</span>`;
        return `<span style="width:${size}px;height:${size}px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:#0d120d;border:2px solid rgba(186,255,0,0.75);box-shadow:0 0 10px rgba(186,255,0,0.25);overflow:hidden;">${inner}</span>`;
    }

    // ¿El usuario actual es LA ORGANIZACIÓN creadora, con su identidad de organización activa?
    // (Multi-identidad: el mismo email puede entrar como jugador/fanático — en esos roles
    //  NO debe poder gestionar el torneo.)
    function _isOrgActive(organizerEmail) {
        const u = getUser();
        if (!u || !u.email || !organizerEmail) return false;
        if ((u.email||'').toLowerCase() !== (organizerEmail||'').toLowerCase()) return false;
        try {
            const r = String((window._trueRole && window._trueRole()) || u.role || '').toLowerCase();
            return r === 'organizacion';
        } catch(e) { return String(u.role||'').toLowerCase() === 'organizacion'; }
    }

    // Rol activo actual (para reglas como "solo jugador/equipo se inscribe").
    function _activeRole() {
        const u = getUser();
        try { return String((window._trueRole && window._trueRole()) || (u && u.role) || '').toLowerCase(); }
        catch(e) { return String((u && u.role) || '').toLowerCase(); }
    }

    // Abrir el perfil REAL de un club/equipo/jugador registrado.
    // Acepta un email de usuario o 'club:<id>' para equipos de la tabla clubs.
    // Dentro de la app navega in-place; fuera (CRM/torneo.html) abre el deep-link.
    // Abre el perfil ENCIMA del torneo, sin cerrarlo: al volver seguís donde estabas.
    // Antes se cerraban todos los modales del torneo (_closeAll) y "te sacaba del torneo".
    // El overlay del perfil vive en z-index 900, muy por debajo de la ficha (100004) y
    // de las fichas de equipo/jugador (100008): hay que elevarlo cuando viene de acá.
    function _liftProfileOverlay() {
        let intentos = 0;
        const subir = () => {
            const ov = document.getElementById('vup-modal-overlay');
            if (ov) {
                ov.style.zIndex = '100011';   // debajo del match-detail forzado (100012)
                ov.style.top = '0px';         // arriba de todo: el header del torneo no aplica
                return true;
            }
            return false;
        };
        if (subir()) return;
        const iv = setInterval(() => { if (subir() || ++intentos > 20) clearInterval(iv); }, 60);
    }
    function _openProfile(ref) {
        if (!ref) { toast('No está registrado en Canchero.', 'info'); return; }
        const s = String(ref);
        if (s.indexOf('club:') === 0) {
            const clubId = s.slice(5);
            if (typeof window.viewClubProfile === 'function') { window.viewClubProfile(clubId); _liftProfileOverlay(); return; }
            window.open('index.html?club=' + encodeURIComponent(clubId), '_blank');
            return;
        }
        if (typeof window.viewUserProfile === 'function') { window.viewUserProfile(s); _liftProfileOverlay(); return; }
        window.open('index.html?perfil=' + encodeURIComponent(s), '_blank');
    }

    // ═══════════════════════════════════════════════════════════
    // FICHA DE EQUIPO DEL TORNEO
    // Si el equipo está registrado → su perfil real. Si no → esta ficha con
    // plantel, estadísticas e info. NUNCA una pestaña en blanco.
    // ═══════════════════════════════════════════════════════════
    async function _openTeamInfo(teamId) {
        const sb = getSb();
        const { data: team } = await sb.from('tournament_teams').select('*').eq('id', teamId).single();
        if (!team) { toast('Equipo no encontrado.', 'error'); return; }
        // Registrado → perfil real
        if (team.club_email) { _openProfile(team.club_email); return; }

        const { data: players } = await sb.from('tournament_players').select('*').eq('team_id', teamId).order('number');
        const { data: t } = await sb.from('tournaments').select('name,organizer_email').eq('id', team.tournament_id).single();
        const isOrg = _isOrgActive(t?.organizer_email);
        const pj = (team.wins||0)+(team.draws||0)+(team.losses||0);
        const dg = (team.goals_for||0)-(team.goals_against||0);
        const stat = (v, l) => `<div style="flex:1;min-width:52px;text-align:center;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:10px 4px;"><div style="font-size:18px;font-weight:900;color:var(--accent);">${v}</div><div style="font-size:9px;color:#777;font-weight:800;letter-spacing:.5px;">${l}</div></div>`;

        const ex = document.getElementById('cti-modal'); if (ex) ex.remove();
        const modal = document.createElement('div');
        modal.id = 'cti-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:100008;background:#070907;overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;' ; modal.classList.add('ct-noscrollbar'); _injectTabCss();
        modal.innerHTML = `
        <div style="max-width:560px;margin:0 auto;padding:14px 16px calc(130px + env(safe-area-inset-bottom));">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0 14px;position:sticky;top:0;background:rgba(7,9,7,0.9);backdrop-filter:blur(10px);z-index:2;">
                <button onclick="document.getElementById('cti-modal').remove()" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:12px;padding:8px 12px;font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class='bx bx-arrow-back'></i> Volver</button>
                ${isOrg ? `<label style="background:rgba(186,255,0,0.1);color:var(--accent);border:1px solid rgba(186,255,0,0.25);border-radius:12px;padding:8px 12px;font-size:12px;font-weight:800;cursor:pointer;"><i class='bx bx-camera'></i> Escudo<input type="file" accept="image/*" style="display:none;" onchange="CancheroTournaments._teamSetLogo('${teamId}',this)"></label>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:18px 16px;backdrop-filter:blur(10px);">
                ${_shieldHTML(team.logo_url, team.team_name, 72)}
                <div style="min-width:0;flex:1;">
                    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:19px;line-height:1.15;">${_esc(team.team_name)}</div>
                    <div style="font-size:11.5px;color:#888;margin-top:3px;">${_esc(t?.name||'')}${team.group_letter?' · Grupo '+team.group_letter:''}</div>
                    <div style="font-size:11.5px;color:#666;margin-top:2px;"><i class='bx bx-user' style="color:var(--accent);"></i> ${_esc(team.captain_name||team.captain_email||'Sin capitán')}</div>
                    <div style="font-size:10px;color:#555;margin-top:6px;">Equipo no registrado en Canchero</div>
                    ${isOrg ? `<button onclick="CancheroTournaments._inviteTeam('${teamId}')" style="margin-top:9px;background:rgba(186,255,0,0.12);color:var(--accent);border:1px solid rgba(186,255,0,0.3);border-radius:11px;padding:8px 14px;font-size:11.5px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px;"><i class='bx bx-user-plus'></i> Invitarlo a Canchero</button>` : ''}
                </div>
            </div>
            <div style="display:flex;gap:6px;margin:14px 0;flex-wrap:wrap;">
                ${stat(team.points||0,'PTS')}${stat(pj,'PJ')}${stat(team.wins||0,'G')}${stat(team.draws||0,'E')}${stat(team.losses||0,'P')}${stat((dg>0?'+':'')+dg,'DG')}
            </div>
            <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
                ${stat(team.goals_for||0,'GOLES A FAVOR')}${stat(team.goals_against||0,'EN CONTRA')}
            </div>
            <div style="font-size:10px;font-weight:900;color:#555;letter-spacing:1px;margin-bottom:10px;">PLANTEL (${(players||[]).length})</div>
            ${(players||[]).length ? (players||[]).map(p => `
                <div onclick="CancheroTournaments._openPlayerInfo('${p.id}')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;margin-bottom:6px;cursor:pointer;">
                    <span style="width:34px;height:34px;border-radius:50%;flex-shrink:0;background:${p.avatar_url?`#222 center/cover url('${_esc(p.avatar_url)}')`:'rgba(186,255,0,0.1)'};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:var(--accent);">${p.avatar_url?'':(p.number||'—')}</span>
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:700;font-size:13px;">${_esc(p.player_name)}</div>
                        <div style="font-size:10px;color:#666;">${p.position?(POS_LABEL[p.position]||p.position):'Sin posición'}</div>
                    </div>
                    <div style="font-size:11px;color:#666;white-space:nowrap;"><i class='bx bx-football'></i>${p.goals||0} · <i class='bx bx-run'></i>${p.assists||0}</div>
                    <i class='bx bx-chevron-right' style="color:#444;"></i>
                </div>`).join('') : '<div style="text-align:center;padding:26px;color:#555;font-size:12px;">Este equipo todavía no cargó jugadores.</div>'}
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    }

    // ═══════════════════════════════════════════════════════════
    // FICHA DE JUGADOR DEL TORNEO (si está registrado → su perfil real)
    // ═══════════════════════════════════════════════════════════
    async function _openPlayerInfo(playerId) {
        const sb = getSb();
        const { data: p } = await sb.from('tournament_players').select('*,tournament_teams(team_name,logo_url)').eq('id', playerId).single();
        if (!p) { toast('Jugador no encontrado.', 'error'); return; }
        if (p.user_email) { _openProfile(p.user_email); return; }

        const { data: t } = await sb.from('tournaments').select('name,organizer_email').eq('id', p.tournament_id).single();
        const isOrg = _isOrgActive(t?.organizer_email);
        const susp = (p.suspended_matches||0) > 0;
        const stat = (v, l) => `<div style="flex:1;min-width:60px;text-align:center;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:12px 4px;"><div style="font-size:20px;font-weight:900;color:var(--accent);">${v}</div><div style="font-size:9px;color:#777;font-weight:800;letter-spacing:.5px;">${l}</div></div>`;

        const ex = document.getElementById('cti-modal'); if (ex) ex.remove();
        const modal = document.createElement('div');
        modal.id = 'cti-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:100008;background:#070907;overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;' ; modal.classList.add('ct-noscrollbar'); _injectTabCss();
        modal.innerHTML = `
        <div style="max-width:520px;margin:0 auto;padding:14px 16px calc(130px + env(safe-area-inset-bottom));">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0 14px;position:sticky;top:0;background:rgba(7,9,7,0.9);backdrop-filter:blur(10px);z-index:2;">
                <button onclick="document.getElementById('cti-modal').remove()" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:12px;padding:8px 12px;font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class='bx bx-arrow-back'></i> Volver</button>
                ${isOrg ? `<div style="display:flex;gap:6px;">
                    <label style="background:rgba(255,255,255,0.05);color:#aaa;border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:8px 12px;font-size:12px;font-weight:800;cursor:pointer;"><i class='bx bx-camera'></i><input type="file" accept="image/*" style="display:none;" onchange="CancheroTournaments._playerSetPhoto('${playerId}',this)"></label>
                    <button onclick="CancheroTournaments._openEditPlayer('${playerId}','${_esc(p.team_id||'')}','')" style="background:rgba(186,255,0,0.1);color:var(--accent);border:1px solid rgba(186,255,0,0.25);border-radius:12px;padding:8px 14px;font-size:12px;font-weight:800;cursor:pointer;"><i class='bx bx-edit'></i> Editar perfil</button>
                </div>` : ''}
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:10px;background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:22px 16px;backdrop-filter:blur(10px);">
                <span style="width:88px;height:88px;border-radius:50%;border:3px solid rgba(186,255,0,0.7);background:${p.avatar_url?`#111 center/cover url('${_esc(p.avatar_url)}')`:'rgba(186,255,0,0.1)'};display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:900;color:var(--accent);box-shadow:0 0 18px rgba(186,255,0,0.2);">${p.avatar_url?'':((p.player_name||'?')[0]||'?').toUpperCase()}</span>
                <div style="text-align:center;">
                    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:20px;">${_esc(p.player_name)}${susp?' <span style="font-size:9px;font-weight:900;color:#ff6b6b;background:rgba(255,68,68,0.1);border-radius:6px;padding:2px 7px;vertical-align:3px;">SUSPENDIDO</span>':''}</div>
                    <div style="font-size:12px;color:#888;margin-top:3px;">${p.number?('#'+p.number+' · '):''}${p.position?(POS_LABEL[p.position]||p.position):'Sin posición'}</div>
                    <div style="font-size:12px;color:var(--accent);margin-top:4px;display:flex;align-items:center;justify-content:center;gap:7px;">${_shieldHTML(p.tournament_teams?.logo_url, p.tournament_teams?.team_name, 22)} ${_esc(p.tournament_teams?.team_name||'Sin equipo')}</div>
                    <div style="font-size:10px;color:#555;margin-top:8px;">Jugador no registrado en Canchero</div>
                    ${isOrg ? `<button onclick="CancheroTournaments._invitePlayer('${playerId}')" style="margin-top:10px;background:rgba(186,255,0,0.12);color:var(--accent);border:1px solid rgba(186,255,0,0.3);border-radius:12px;padding:9px 16px;font-size:12px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:7px;"><i class='bx bx-user-plus'></i> Invitarlo a Canchero</button>
                    <div style="font-size:10px;color:#555;margin-top:6px;max-width:250px;line-height:1.5;">Si se registra con el mismo email, estos datos pasan solos a su perfil y suman al ranking general.</div>` : ''}
                </div>
            </div>
            <div style="display:flex;gap:6px;margin:14px 0;flex-wrap:wrap;">
                ${stat(p.goals||0,'GOLES')}${stat(p.assists||0,'ASISTENCIAS')}${stat(p.yellow_cards||0,'AMARILLAS')}${stat(p.red_cards||0,'ROJAS')}
            </div>
            <div style="font-size:11.5px;color:#666;text-align:center;padding:10px;">Torneo: ${_esc(t?.name||'—')}</div>
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    }

    // Foto del jugador cargada a mano por la organización (los registrados la traen sola).
    async function _playerSetPhoto(playerId, input) {
        const f = input.files && input.files[0]; if (!f) return;
        toast('Subiendo foto...', 'info');
        const url = await _uploadImg(f, 'torneos/jugadores');
        if (!url) { toast('No se pudo subir la foto.', 'error'); return; }
        const sb = getSb();
        const { error } = await sb.from('tournament_players').update({ avatar_url: url }).eq('id', playerId);
        if (error) { toast('Error: ' + error.message, 'error'); return; }
        toast('Foto actualizada.', 'success');
        _openPlayerInfo(playerId);
    }
    window.CancheroTournaments = window.CancheroTournaments || {};
    window.CancheroTournaments._openProfile = _openProfile;

    // ═══════════════════════════════════════════════════════════
    // CREAR TORNEO
    // ═══════════════════════════════════════════════════════════
    async function openCreateTournament(organizerEmail) {
        const existing = document.getElementById('ct-modal');
        if (existing) existing.remove();
        const modal = document.createElement('div');
        modal.id = 'ct-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.9);overflow-y:auto;padding:20px;display:flex;align-items:flex-start;justify-content:center;';
        modal.innerHTML = `
        <div style="background:#0d0d0d;border:1px solid #222;border-radius:20px;width:100%;max-width:520px;padding:24px;margin-top:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <h2 style="font-family:Outfit,sans-serif;font-weight:900;font-size:20px;"><i class='bx bx-trophy' style="color:var(--accent);"></i> Crear Torneo</h2>
                <button onclick="document.getElementById('ct-modal').remove()" style="background:none;border:none;color:#888;font-size:24px;cursor:pointer;">&times;</button>
            </div>
            <div style="display:flex;flex-direction:column;gap:14px;">
                <div><label style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:5px;">NOMBRE DEL TORNEO *</label>
                    <input id="ct-name" type="text" style="width:100%;background:#111;border:1px solid #222;color:#fff;border-radius:10px;padding:10px 14px;font-size:14px;" placeholder="Ej: Copa Nocturna 2026"></div>
                <div><label style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:5px;">DESCRIPCIÓN</label>
                    <textarea id="ct-desc" rows="2" style="width:100%;background:#111;border:1px solid #222;color:#fff;border-radius:10px;padding:10px 14px;font-size:13px;resize:vertical;" placeholder="Reglas, premios, información general..."></textarea></div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div><label style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:5px;">FORMATO *</label>
                        <select id="ct-format" onchange="var g=this.value==='groups';document.getElementById('ct-gs-wrap').style.visibility=(g?'visible':'hidden');document.getElementById('ct-po-wrap').style.display=(g?'block':'none')" style="width:100%;background:#111;border:1px solid #222;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;">
                            <option value="groups">Fase de grupos + eliminación</option>
                            <option value="elimination">Eliminación directa</option>
                            <option value="league">Liga (todos vs todos)</option>
                        </select></div>
                    <div><label style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:5px;">MÁX. EQUIPOS *</label>
                        <select id="ct-max-teams" style="width:100%;background:#111;border:1px solid #222;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;">
                            <option value="4">4 equipos</option>
                            <option value="8" selected>8 equipos</option>
                            <option value="12">12 equipos</option>
                            <option value="16">16 equipos</option>
                            <option value="32">32 equipos</option>
                        </select></div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div><label style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:5px;">TIPO DE FÚTBOL</label>
                        <select id="ct-match-format" style="width:100%;background:#111;border:1px solid #222;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;">
                            <option value="">Sin especificar</option>
                            <option value="5">Fútbol 5</option>
                            <option value="7">Fútbol 7</option>
                            <option value="11">Fútbol 11</option>
                        </select></div>
                    <div id="ct-gs-wrap"><label style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:5px;">EQUIPOS POR GRUPO</label>
                        <select id="ct-group-size" style="width:100%;background:#111;border:1px solid #222;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;">
                            <option value="3">3 por grupo</option>
                            <option value="4" selected>4 por grupo</option>
                            <option value="5">5 por grupo</option>
                            <option value="6">6 por grupo</option>
                        </select></div>
                </div>
                <div id="ct-po-wrap"><label style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:5px;">PLAYOFFS (ARRANCAN EN)</label>
                    <select id="ct-playoff" style="width:100%;background:#111;border:1px solid #222;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;">
                        <option value="auto">Automático (2 por grupo)</option>
                        <option value="r32">16avos de final</option>
                        <option value="r16">Octavos de final</option>
                        <option value="quarterfinal">Cuartos de final</option>
                        <option value="semifinal">Semifinales</option>
                        <option value="final">Final directa</option>
                        <option value="none">Sin playoffs (solo grupos)</option>
                    </select></div>
                <label style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:11px 13px;cursor:pointer;">
                    <input id="ct-double" type="checkbox" style="width:17px;height:17px;accent-color:var(--accent);cursor:pointer;">
                    <span style="font-size:13px;font-weight:800;">Ida y vuelta</span>
                    <span style="font-size:11px;color:#666;margin-left:auto;">Se juega el doble de partidos</span>
                </label>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div><label style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:5px;">FECHA INICIO</label>
                        <input id="ct-start" type="date" style="width:100%;background:#111;border:1px solid #222;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;"></div>
                    <div><label style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:5px;">FECHA FIN</label>
                        <input id="ct-end" type="date" style="width:100%;background:#111;border:1px solid #222;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;"></div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div><label style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:5px;">CIUDAD</label>
                        <input id="ct-city" type="text" style="width:100%;background:#111;border:1px solid #222;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;" placeholder="Montevideo"></div>
                    <div><label style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:5px;">PREMIO</label>
                        <input id="ct-prize" type="text" style="width:100%;background:#111;border:1px solid #222;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;" placeholder="Trofeo + $500"></div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div><label style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:5px;">PRECIO INSCRIPCIÓN ($)</label>
                        <input id="ct-fee" type="number" min="0" value="0" style="width:100%;background:#111;border:1px solid #222;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;"></div>
                    <div><label style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:5px;">LINK DE PAGO (opcional)</label>
                        <input id="ct-payment-link" type="url" style="width:100%;background:#111;border:1px solid #222;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;" placeholder="https://mpago.la/..."></div>
                </div>
                <div><label style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:5px;">REGLAS (opcional)</label>
                    <textarea id="ct-rules" rows="2" style="width:100%;background:#111;border:1px solid #222;color:#fff;border-radius:10px;padding:10px 14px;font-size:13px;resize:vertical;" placeholder="Reglamento, sanciones, sistema de puntos..."></textarea></div>
                <button onclick="CancheroTournaments._submitCreate('${(organizerEmail||'').replace(/'/g,"\\'")}' )" style="width:100%;background:var(--accent);color:#000;border:none;border-radius:14px;padding:14px;font-weight:900;font-size:15px;cursor:pointer;font-family:Outfit,sans-serif;"><i class='bx bx-plus-circle'></i> CREAR TORNEO</button>
            </div>
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    }

    async function _submitCreate(organizerEmail) {
        const sb = getSb();
        const email = organizerEmail || getUser()?.email;
        if (!sb || !email) { toast('Iniciá sesión primero.', 'error'); return; }
        const name = document.getElementById('ct-name')?.value.trim();
        if (!name) { toast('Ingresá el nombre del torneo.', 'warning'); return; }
        const btn = document.querySelector('#ct-modal button[onclick*="_submitCreate"]');
        if (btn) { btn.textContent = 'Creando...'; btn.disabled = true; }
        try {
            const row = {
                organizer_email: email,
                name,
                description: document.getElementById('ct-desc')?.value.trim() || null,
                format: document.getElementById('ct-format')?.value || 'groups',
                double_round: !!document.getElementById('ct-double')?.checked,
                group_size: parseInt(document.getElementById('ct-group-size')?.value) || 4,
                match_format: document.getElementById('ct-match-format')?.value || null,
                playoff_from: document.getElementById('ct-playoff')?.value || 'auto',
                max_teams: parseInt(document.getElementById('ct-max-teams')?.value) || 8,
                start_date: document.getElementById('ct-start')?.value || null,
                end_date: document.getElementById('ct-end')?.value || null,
                city: document.getElementById('ct-city')?.value.trim() || null,
                prize_pool: document.getElementById('ct-prize')?.value.trim() || null,
                entry_fee: parseFloat(document.getElementById('ct-fee')?.value) || 0,
                payment_link: document.getElementById('ct-payment-link')?.value.trim() || null,
                rules: document.getElementById('ct-rules')?.value.trim() || null,
                status: 'registration'
            };
            let { data, error } = await sb.from('tournaments').insert(row).select('id').single();
            if (error) {
                // La base puede no tener todavía group_size / match_format: reintentar sin ellas.
                const bare = { ...row }; delete bare.group_size; delete bare.match_format; delete bare.playoff_from;
                const retry = await sb.from('tournaments').insert(bare).select('id').single();
                if (retry.error) throw retry.error;
                data = retry.data;
                toast('Torneo creado. Corré la migración SQL para tipo de fútbol y tamaño de grupo.', 'warning');
            }
            document.getElementById('ct-modal')?.remove();
            toast('¡Torneo creado!', 'success');
            openTournamentManager(data.id, email);
        } catch(e) {
            toast('Error al crear: ' + (e.message || ''), 'error');
            if (btn) { btn.textContent = 'CREAR TORNEO'; btn.disabled = false; }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // PANEL DE GESTIÓN DEL ORGANIZADOR
    // ═══════════════════════════════════════════════════════════
    async function openTournamentManager(tournamentId, organizerEmail) {
        const sb = getSb();
        if (!sb) return;
        const { data: t, error } = await sb.from('tournaments').select('*').eq('id', tournamentId).single();
        if (error || !t) { toast('Torneo no encontrado.', 'error'); return; }

        const existing = document.getElementById('ctm-modal');
        if (existing) existing.remove();
        const isOrgMgr = _isOrgActive(organizerEmail);
        const modal = document.createElement('div');
        modal.id = 'ctm-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#070907;overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;' ; modal.classList.add('ct-noscrollbar'); _injectTabCss();
        modal.innerHTML = `
        <div style="max-width:720px;margin:0 auto;padding:14px 16px calc(120px + env(safe-area-inset-bottom));">
            <div style="display:flex;align-items:center;gap:12px;padding:6px 0 14px;position:sticky;top:0;background:#070907;z-index:2;">
                <button onclick="document.getElementById('ctm-modal').remove()" style="background:rgba(255,255,255,0.05);border:1px solid #222;color:#fff;border-radius:10px;padding:8px 12px;font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px;flex-shrink:0;"><i class='bx bx-arrow-back'></i> Volver</button>
                <div style="min-width:0;flex:1;">
                    <h2 style="font-family:Outfit,sans-serif;font-weight:900;font-size:17px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"><i class='bx bx-trophy' style="color:var(--accent);"></i> ${_esc(t.name)}</h2>
                    <div style="font-size:11px;color:#555;">${_esc(t.city||'')} · ${_formatStatus(t.status)} · ${t.format === 'groups' ? 'Grupos' : t.format === 'league' ? 'Liga' : 'Eliminación directa'}${t.double_round ? ' (ida y vuelta)' : ''}${t.match_format ? ' · Fútbol ' + _esc(t.match_format) : ''}</div>
                </div>
                ${isOrgMgr ? `<button onclick="CancheroTournaments._openEditTournament('${tournamentId}')" title="Editar información del torneo" style="background:rgba(186,255,0,0.1);border:1px solid rgba(186,255,0,0.25);color:var(--accent);border-radius:10px;padding:8px 11px;font-size:15px;cursor:pointer;flex-shrink:0;"><i class='bx bx-edit'></i></button>` : ''}
            </div>
            <!-- Portada + logo del torneo -->
            <div style="position:relative;border-radius:16px;overflow:hidden;margin-bottom:16px;height:140px;background:${t.cover_url?'#000':'linear-gradient(135deg,#141914,#0b0d0b)'};border:1px solid #1a1a1a;">
                ${t.cover_url ? `<img src="${_esc(t.cover_url)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">` : `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#2a2a2a;"><i class='bx bx-trophy' style="font-size:44px;"></i></div>`}
                <div style="position:absolute;left:12px;bottom:10px;display:flex;align-items:center;gap:10px;">
                    <span style="width:52px;height:52px;border-radius:14px;overflow:hidden;border:2px solid #070907;background:#111 center/cover;${t.logo_url?`background-image:url('${_esc(t.logo_url)}')`:''};display:flex;align-items:center;justify-content:center;">${t.logo_url?'':"<i class='bx bx-trophy' style=\"color:var(--accent);font-size:24px;\"></i>"}</span>
                </div>
                ${isOrgMgr ? `<div style="position:absolute;right:10px;bottom:10px;display:flex;gap:6px;">
                    <label style="background:rgba(0,0,0,0.6);color:#fff;border:1px solid #333;border-radius:8px;padding:5px 9px;font-size:11px;font-weight:700;cursor:pointer;"><i class='bx bx-image'></i> Portada<input type="file" accept="image/*" style="display:none;" onchange="CancheroTournaments._ctmSetImg('${tournamentId}','cover_url',this)"></label>
                    <label style="background:rgba(0,0,0,0.6);color:#fff;border:1px solid #333;border-radius:8px;padding:5px 9px;font-size:11px;font-weight:700;cursor:pointer;"><i class='bx bx-camera'></i> Logo<input type="file" accept="image/*" style="display:none;" onchange="CancheroTournaments._ctmSetImg('${tournamentId}','logo_url',this)"></label>
                </div>` : ''}
            </div>
            <!-- Tabs: UNA sola línea (icono+texto en PC, solo icono en celular) -->
            <div class="ctm-tabbar" style="display:flex;flex-wrap:nowrap;gap:5px;margin-bottom:16px;">
                ${_ctmTabBtn('equipos','bx-shield-quarter','Equipos',tournamentId,organizerEmail,true)}
                ${_ctmTabBtn('fixture','bx-calendar','Fixture',tournamentId,organizerEmail)}
                ${_ctmTabBtn('tabla','bx-list-ol','Tabla',tournamentId,organizerEmail)}
                ${_ctmTabBtn('jugadores','bx-group','Jugadores',tournamentId,organizerEmail)}
                ${_ctmTabBtn('goleadores','bx-football','Goleadores',tournamentId,organizerEmail)}
                ${_ctmTabBtn('info','bx-info-circle','Info',tournamentId,organizerEmail)}
                ${isOrgMgr ? _ctmTabBtn('solicitudes','bx-user-plus','Solicitudes',tournamentId,organizerEmail) : ''}
            </div>
            <div id="ctm-content" style="min-height:300px;"></div>
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
        _injectTabCss();
        if (isOrgMgr) _refreshSolicBadge(tournamentId);
        _ctmTab('equipos', tournamentId, organizerEmail, modal.querySelector('.ctm-tab'));
    }

    // Botón de tab compacto (label se oculta en celular vía CSS inyectado).
    function _ctmTabBtn(tab, icon, label, tournamentId, organizerEmail, active) {
        const on = `CancheroTournaments._ctmTab('${tab}','${tournamentId}','${(organizerEmail||'').replace(/'/g,"\\'")}',this)`;
        return `<button class="ctm-tab${active?' active':''}" data-tab="${tab}" title="${label}" onclick="${on}" style="flex:1;min-width:0;display:flex;align-items:center;justify-content:center;gap:5px;background:${active?'rgba(186,255,0,0.12)':'transparent'};color:${active?'var(--accent)':'#888'};border:1px solid ${active?'rgba(186,255,0,0.3)':'#222'};border-radius:14px;padding:9px 4px;font-size:11.5px;font-weight:700;cursor:pointer;white-space:nowrap;transition:.15s;position:relative;overflow:visible;"><i class='bx ${icon}' style="font-size:16px;flex-shrink:0;"></i><span class="ctm-tab-label" style="overflow:hidden;text-overflow:ellipsis;">${label}</span><span class="ctm-tab-badge" data-badge="${tab}" style="display:none;position:absolute;top:-5px;right:-2px;background:#ff4444;color:#fff;font-size:9px;font-weight:900;min-width:15px;height:15px;border-radius:8px;padding:0 3px;align-items:center;justify-content:center;line-height:15px;"></span></button>`;
    }

    // En celular las tabs quedan solo-icono para que entren TODAS en una línea.
    function _injectTabCss() {
        if (document.getElementById('ctm-tab-css')) return;
        const st = document.createElement('style');
        st.id = 'ctm-tab-css';
        st.textContent = '@media (max-width:640px){ .ctm-tab .ctm-tab-label{display:none;} .ctm-tabbar .ctm-tab{padding:10px 2px !important;} .ctm-tab i{font-size:19px !important;} }'
            // Sin barra de scroll a la derecha en las pantallas del torneo (se sigue
            // pudiendo scrollear; solo se oculta la barra, que se veía fea y estrecha).
            + ' .ct-noscrollbar::-webkit-scrollbar{width:0;height:0;display:none;}'
            + ' .ct-noscrollbar{scrollbar-width:none;-ms-overflow-style:none;}'
            // Colchón inferior: la barra de opciones tapaba el último botón de cada
            // pantalla del torneo. Se aplica al contenido de todos los modales.
            + ' .ct-noscrollbar > div{padding-bottom:calc(130px + env(safe-area-inset-bottom)) !important;}';
        document.head.appendChild(st);
    }

    // Contador de solicitudes pendientes en la tab Solicitudes.
    async function _refreshSolicBadge(tournamentId) {
        try {
            const sb = getSb();
            const { count } = await sb.from('tournament_teams').select('id',{count:'exact',head:true}).eq('tournament_id',tournamentId).eq('status','pending');
            const el = document.querySelector('.ctm-tab-badge[data-badge="solicitudes"]');
            if (el) { el.textContent = count || 0; el.style.display = count ? 'inline-flex' : 'none'; }
        } catch(e){}
    }

    window.CancheroTournaments = window.CancheroTournaments || {};

    function _formatStatus(s) {
        const map = { draft:'Borrador', registration:'Inscripciones abiertas', active:'En curso', finished:'Finalizado', cancelled:'Cancelado' };
        return map[s] || s;
    }

    // Subir/actualizar portada (cover_url) o logo (logo_url) del torneo.
    async function _ctmSetImg(tournamentId, field, input) {
        const f = input.files && input.files[0]; if (!f) return;
        toast('Subiendo imagen...', 'info');
        const url = await _uploadImg(f, 'torneos');
        if (!url) { toast('No se pudo subir la imagen.', 'error'); return; }
        const sb = getSb();
        const { error } = await sb.from('tournaments').update({ [field]: url }).eq('id', tournamentId);
        if (error) { toast('Error: ' + error.message, 'error'); return; }
        toast(field === 'cover_url' ? 'Portada actualizada' : 'Logo actualizado', 'success');
        const { data: t } = await sb.from('tournaments').select('organizer_email').eq('id', tournamentId).single();
        openTournamentManager(tournamentId, t?.organizer_email);
    }
    window.CancheroTournaments._ctmSetImg = _ctmSetImg;

    // ── Gestión de equipos ──────────────────────────────────
    async function _ctmEquipos(tournamentId, organizerEmail) {
        const sb = getSb();
        const { data: t } = await sb.from('tournaments').select('entry_fee,payment_link,max_teams').eq('id', tournamentId).single();
        const { data: teams } = await sb.from('tournament_teams').select('*').eq('tournament_id', tournamentId).order('created_at');
        const container = document.getElementById('ctm-content');
        if (!container) return;
        const isOrg = _isOrgActive(organizerEmail);
        // Auto-escudo: si el equipo está vinculado a un club registrado y no tiene escudo,
        // tomar la foto/escudo del perfil del club (y persistirla para fixture/tabla).
        try { await _healTeamLogos(teams, isOrg); } catch(e){}
        const fee = t?.entry_fee || 0;
        container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
            <div style="font-size:13px;color:#888;">${(teams||[]).length} / ${t?.max_teams||8} equipos inscriptos</div>
            ${fee > 0 ? `<div style="font-size:11px;color:var(--accent);background:rgba(186,255,0,0.08);border:1px solid rgba(186,255,0,0.2);border-radius:8px;padding:4px 10px;"><i class='bx bx-dollar-circle'></i> Inscripción: $${fee}</div>` : ''}
        </div>
        ${(teams||[]).map(team => _renderTeamCard(team, isOrg, t?.payment_link)).join('') || '<div style="text-align:center;padding:40px;color:#555;">Aún no hay equipos inscriptos.</div>'}
        ${!isOrg ? `<div style="margin-top:16px;padding:16px;background:#111;border:1px solid #1e1e1e;border-radius:14px;">
            <div style="font-weight:900;font-size:14px;margin-bottom:10px;"><i class='bx bx-clipboard'></i> Inscribir mi equipo</div>
            ${fee > 0 ? `<div style="font-size:12px;color:#aaa;margin-bottom:10px;">Precio de inscripción: <strong style="color:var(--accent);">$${fee}</strong>${t?.payment_link ? ` · <a href="${t.payment_link}" target="_blank" style="color:var(--accent);">Pagar aquí</a>` : ''}</div>` : ''}
            <div style="display:flex;gap:8px;">
                <input id="ctm-team-name" type="text" placeholder="Nombre de tu equipo" style="flex:1;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:9px 12px;font-size:13px;">
                <button onclick="CancheroTournaments._inscribeTeam('${tournamentId}','${(organizerEmail||'').replace(/'/g,"\\'")}' )" style="background:var(--accent);color:#000;border:none;border-radius:10px;padding:9px 16px;font-weight:900;font-size:13px;cursor:pointer;">Inscribir</button>
            </div>
            ${fee > 0 ? `<div style="margin-top:8px;"><input id="ctm-payment-proof" type="url" placeholder="URL del comprobante de pago (opcional)" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:9px 12px;font-size:12px;"></div>` : ''}
        </div>` : `<button onclick="CancheroTournaments._openAddTeam('${tournamentId}')" style="width:100%;margin-top:12px;background:rgba(186,255,0,0.08);color:var(--accent);border:1px solid rgba(186,255,0,0.25);border-radius:12px;padding:11px;font-weight:700;font-size:13px;cursor:pointer;"><i class='bx bx-plus'></i> Agregar equipo manualmente</button>`}
        ${isOrg && (teams||[]).some(t => t.status === 'approved') ? `<button onclick="CancheroTournaments._generateFixture('${tournamentId}')" style="width:100%;margin-top:10px;background:var(--accent);color:#000;border:none;border-radius:12px;padding:12px;font-weight:900;font-size:14px;cursor:pointer;"><i class='bx bx-shuffle'></i> GENERAR FIXTURE</button>` : ''}`;
    }

    // Completa logo_url de equipos vinculados a un club registrado (busca la foto del
    // perfil del club, tanto en users como en business_requests.payload).
    async function _healTeamLogos(teams, persist) {
        const sb = getSb();
        const missing = (teams||[]).filter(x => x.club_email && !x.logo_url);
        if (!missing.length) return;
        const refs = [...new Set(missing.map(x => (x.club_email||'').toLowerCase()))];
        const clubIds = refs.filter(r => r.indexOf('club:') === 0).map(r => r.slice(5));
        const emails = refs.filter(r => r.indexOf('club:') !== 0);
        const byRef = {};
        // Equipos reales (tabla clubs)
        if (clubIds.length) {
            try {
                const { data: cs } = await sb.from('clubs').select('id,logo,logo_url').in('id', clubIds);
                (cs||[]).forEach(c => { const p = c.logo_url || c.logo; if (p) byRef['club:'+String(c.id).toLowerCase()] = p; });
            } catch(e){}
        }
        // Vínculos por email (perfiles / negocios)
        if (emails.length) {
            try {
                const { data: us } = await sb.from('users').select('email,photo,logo_url').in('email', emails);
                (us||[]).forEach(u => { const p = u.logo_url || u.photo; if (p) byRef[(u.email||'').toLowerCase()] = p; });
            } catch(e){}
            try {
                const { data: brs } = await sb.from('business_requests').select('email,payload').in('email', emails);
                (brs||[]).forEach(b => {
                    let pl = b.payload || {}; try { if (typeof pl === 'string') pl = JSON.parse(pl); } catch(e){ pl = {}; }
                    const p = pl.logo || pl.photo; const em = (b.email||'').toLowerCase();
                    if (p && !byRef[em]) byRef[em] = p;
                });
            } catch(e){}
        }
        for (const team of missing) {
            const p = byRef[(team.club_email||'').toLowerCase()];
            if (!p) continue;
            team.logo_url = p; // para este render
            if (persist) { try { await sb.from('tournament_teams').update({ logo_url: p }).eq('id', team.id); } catch(e){} }
        }
    }

    // Subir el escudo de un equipo del torneo (lo ve fixture/tabla/ficha/goleadores).
    async function _teamSetLogo(teamId, input) {
        const f = input.files && input.files[0]; if (!f) return;
        toast('Subiendo escudo...', 'info');
        const url = await _uploadImg(f, 'torneos/equipos');
        if (!url) { toast('No se pudo subir el escudo.', 'error'); return; }
        const sb = getSb();
        const { data: team, error } = await sb.from('tournament_teams').update({ logo_url: url }).eq('id', teamId).select('tournament_id').single();
        if (error) { toast('Error: ' + error.message, 'error'); return; }
        toast('Escudo actualizado', 'success');
        if (team) {
            const { data: t } = await sb.from('tournaments').select('organizer_email').eq('id', team.tournament_id).single();
            _ctmEquipos(team.tournament_id, t?.organizer_email);
        }
    }

    function _renderTeamCard(team, isOrg, paymentLink) {
        const statusColors = { pending:'#ffaa00', approved:'#00e676', rejected:'#ff4444', eliminated:'#555' };
        const statusLabels = { pending:"<i class='bx bx-time-five'></i> Pendiente", approved:"<i class='bx bx-check'></i> Aprobado", rejected:"<i class='bx bx-x'></i> Rechazado", eliminated:"<i class='bx bx-block'></i> Eliminado" };
        const payColors = { pending:'#ffaa00', paid:'#00e676', waived:'#4fc3f7' };
        const payLabels = { pending:'Sin pago', paid:'Pagado', waived:'Exento' };
        return `<div style="background:#111;border:1px solid #1e1e1e;border-radius:14px;padding:14px 16px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                <div style="flex:1;min-width:0;display:flex;align-items:flex-start;gap:10px;">
                    <span onclick="CancheroTournaments._openTeamInfo('${team.id}')" style="cursor:pointer;">${_shieldHTML(team.logo_url, team.team_name, 48)}</span>
                    <div style="min-width:0;">
                    <div onclick="CancheroTournaments._openTeamInfo('${team.id}')" style="cursor:pointer;font-weight:800;font-size:14px;">${_esc(team.team_name)} <i class='bx bx-chevron-right' style="font-size:12px;color:var(--accent);"></i></div>
                    <div style="font-size:11px;color:#666;margin-top:2px;">Capitán: ${_esc(team.captain_name||team.captain_email||'—')} · ${team.players_count||0} jugadores</div>
                    <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
                        <span style="font-size:10px;font-weight:700;color:${statusColors[team.status]||'#888'};background:rgba(255,255,255,0.05);border-radius:6px;padding:2px 8px;">${statusLabels[team.status]||team.status}</span>
                        ${team.payment_status !== 'waived' ? `<span style="font-size:10px;font-weight:700;color:${payColors[team.payment_status]||'#888'};background:rgba(255,255,255,0.05);border-radius:6px;padding:2px 8px;">${payLabels[team.payment_status]||''}</span>` : ''}
                    </div>
                    </div>
                </div>
                ${isOrg ? `<div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
                    ${team.status === 'pending' ? `<button onclick="CancheroTournaments._approveTeam('${team.id}','approved')" style="background:rgba(0,230,118,0.12);color:#00e676;border:1px solid rgba(0,230,118,0.3);border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;"><i class='bx bx-check'></i> Aprobar</button>
                    <button onclick="CancheroTournaments._approveTeam('${team.id}','rejected')" style="background:rgba(255,68,68,0.08);color:#ff4444;border:1px solid rgba(255,68,68,0.2);border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;"><i class='bx bx-x'></i> Rechazar</button>` : ''}
                    ${team.payment_status === 'pending' ? `<button onclick="CancheroTournaments._markPaid('${team.id}')" style="background:rgba(186,255,0,0.08);color:var(--accent);border:1px solid rgba(186,255,0,0.25);border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;"><i class='bx bx-dollar-circle'></i> Marcar pagado</button>` : ''}
                    <button onclick="CancheroTournaments._openTeamPlayers('${team.id}','${team.team_name.replace(/'/g,"\\'")}')" style="background:rgba(255,255,255,0.04);color:#aaa;border:1px solid #222;border-radius:8px;padding:5px 10px;font-size:11px;cursor:pointer;"><i class='bx bx-group'></i> Jugadores</button>
                    <button onclick="CancheroTournaments._openEditTeam('${team.id}')" title="Editar nombre, capitán, escudo, grupo y pago" style="background:rgba(186,255,0,0.06);color:var(--accent);border:1px solid rgba(186,255,0,0.22);border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;"><i class='bx bx-edit'></i> Editar</button>
                    ${team.club_email && String(team.club_email).indexOf('club:') === 0 ? `<button onclick="CancheroTournaments._syncRoster('${team.id}')" title="Vuelve a importar el plantel actual del equipo registrado" style="background:rgba(255,255,255,0.04);color:#aaa;border:1px solid #222;border-radius:8px;padding:5px 10px;font-size:11px;cursor:pointer;"><i class='bx bx-refresh'></i> Sincronizar</button>` : ''}
                </div>` : ''}
            </div>
            ${team.payment_proof_url ? `<div style="margin-top:8px;"><a href="${team.payment_proof_url}" target="_blank" style="font-size:11px;color:var(--accent);"><i class='bx bx-paperclip'></i> Ver comprobante</a></div>` : ''}
        </div>`;
    }

    async function _inscribeTeam(tournamentId, organizerEmail) {
        const sb = getSb();
        const user = getUser();
        if (!sb || !user) { toast('Iniciá sesión.', 'warning'); return; }
        // Solo JUGADORES o EQUIPOS/CLUBES pueden solicitar unirse a un torneo
        // (no tiendas/complejos/organizaciones ni otras identidades de negocio).
        const role = _activeRole();
        if (['tienda','complejo','organizacion','sponsor','profesional'].indexOf(role) !== -1) {
            toast('Solo los jugadores o equipos pueden inscribirse. Cambiá a tu identidad de jugador/equipo.', 'warning');
            return;
        }
        const name = document.getElementById('ctm-team-name')?.value.trim();
        if (!name) { toast('Ingresá el nombre del equipo.', 'warning'); return; }
        const proofUrl = document.getElementById('ctm-payment-proof')?.value.trim() || null;
        const fila = {
            tournament_id: tournamentId,
            team_name: name,
            captain_email: user.email,
            captain_name: user.name || user.email,
            status: 'pending',
            payment_status: proofUrl ? 'pending' : 'pending',
            payment_proof_url: proofUrl
        };
        // Si eligió un equipo YA registrado en Canchero, se lleva el escudo y queda vinculado.
        const clubId = window.__ctInscribeClub;
        if (clubId) {
            try {
                const { data: c } = await sb.from('clubs').select('id,name,logo,logo_url,city,owner_email').eq('id', clubId).maybeSingle();
                if (c) {
                    fila.club_id = c.id;
                    fila.club_email = c.owner_email || null;
                    fila.logo_url = c.logo_url || c.logo || null;
                }
            } catch(e){}
        }
        let { error } = await sb.from('tournament_teams').insert(fila);
        if (error && clubId) {
            // Si faltan las columnas de vínculo, se anota igual con el nombre.
            const bare = { ...fila }; delete bare.club_id; delete bare.club_email; delete bare.logo_url;
            const r2 = await sb.from('tournament_teams').insert(bare);
            error = r2.error;
        }
        if (error) { toast('Error: ' + (error.message||''), 'error'); return; }
        window.__ctInscribeClub = null;
        // Notificar a la organización creadora (le llega en su campana)
        try {
            let orgEmail = organizerEmail;
            let tName = '';
            const { data: t } = await sb.from('tournaments').select('name,organizer_email').eq('id', tournamentId).single();
            if (t) { orgEmail = t.organizer_email || orgEmail; tName = t.name || ''; }
            if (orgEmail) await sb.from('notifications').insert({
                recipient_email: orgEmail,
                type: 'torneo_solicitud',
                actor_name: user.name || user.email,
                actor_email: user.email,
                message: `${name} solicitó unirse a tu torneo${tName ? ' ' + tName : ''}. Revisalo en Gestión → Solicitudes.`,
                post_id: tournamentId,
                read: false
            });
        } catch(e){}
        toast('¡Solicitud enviada! El organizador la va a revisar.', 'success');
        _ctmEquipos(tournamentId, organizerEmail);
    }

    // Modal para agregar/registrar un equipo (manual o vinculando un club registrado).
    async function _openAddTeam(tournamentId) {
        window.__ctTeam = { logo_url:null, club_email:null };
        const ex = document.getElementById('ctat-modal'); if (ex) ex.remove();
        const modal = document.createElement('div');
        modal.id = 'ctat-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.9);overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:20px;';
        modal.innerHTML = `
        <div style="background:#0d0d0d;border:1px solid #222;border-radius:18px;width:100%;max-width:440px;padding:20px;margin-top:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                <h3 style="font-family:Outfit,sans-serif;font-weight:900;font-size:15px;">Agregar equipo</h3>
                <button onclick="document.getElementById('ctat-modal').remove()" style="background:none;border:none;color:#888;font-size:22px;cursor:pointer;">&times;</button>
            </div>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                <label style="cursor:pointer;position:relative;" title="Escudo del equipo">
                    <span id="ctat-shield">${_shieldHTML(null,'?',64)}</span>
                    <input id="ctat-logo" type="file" accept="image/*" style="display:none;" onchange="CancheroTournaments._ctatLogo(this)">
                    <span style="position:absolute;bottom:-2px;right:-2px;background:var(--accent);color:#000;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:12px;"><i class='bx bx-camera'></i></span>
                </label>
                <input id="ctat-name" type="text" placeholder="Nombre del equipo" style="flex:1;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:11px 12px;font-size:14px;">
            </div>
            <div style="font-size:10px;font-weight:900;color:#555;letter-spacing:1px;margin-bottom:6px;">¿ES UN CLUB YA REGISTRADO EN CANCHERO?</div>
            <input id="ctat-search" type="text" placeholder="Buscar club por nombre..." oninput="CancheroTournaments._ctatSearch('${tournamentId}')" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:6px;">
            <div id="ctat-results" style="display:flex;flex-direction:column;gap:4px;margin-bottom:12px;max-height:180px;overflow-y:auto;"></div>
            <div style="font-size:10px;color:#666;margin-bottom:12px;">Podés vincular un club registrado (usa su escudo y perfil) o crear uno manual.</div>
            <button onclick="CancheroTournaments._ctatSave('${tournamentId}')" style="width:100%;background:var(--accent);color:#000;border:none;border-radius:12px;padding:12px;font-weight:900;font-size:14px;cursor:pointer;">Agregar equipo</button>
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    }
    async function _ctatLogo(input) {
        const f = input.files && input.files[0]; if (!f) return;
        toast('Subiendo escudo...', 'info');
        const url = await _uploadImg(f, 'torneos/equipos');
        if (url) { window.__ctTeam.logo_url = url; const el = document.getElementById('ctat-shield'); if (el) el.innerHTML = _shieldHTML(url, document.getElementById('ctat-name')?.value||'?', 56); }
    }
    let _ctatT = null;
    // Busca EQUIPOS registrados en Canchero (tabla clubs — los equipos que crean los jugadores).
    async function _ctatSearch(tournamentId) {
        const term = (document.getElementById('ctat-search')?.value||'').trim();
        const box = document.getElementById('ctat-results'); if (!box) return;
        if (term.length < 2) { box.innerHTML = ''; return; }
        clearTimeout(_ctatT);
        _ctatT = setTimeout(async () => {
            const sb = getSb();
            const { data } = await sb.from('clubs').select('*').ilike('name', '%'+term+'%').limit(8);
            box.innerHTML = (data||[]).map(c => {
                const logo = c.logo_url || c.logo || '';
                const cap = c.captain_email || c.owner_email || '';
                return `<button onclick="CancheroTournaments._ctatPick('club:${String(c.id)}','${(c.name||'').replace(/'/g,"\\'")}','${(logo||'').replace(/'/g,"\\'")}','${(cap||'').replace(/'/g,"\\'")}')" style="display:flex;align-items:center;gap:10px;background:#141414;border:1px solid #222;border-radius:10px;padding:8px 10px;cursor:pointer;text-align:left;color:#fff;width:100%;">
                    ${_shieldHTML(logo, c.name, 34)}
                    <span style="flex:1;min-width:0;font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;">${_esc(c.name||'')}</span>
                    ${c.city?`<span style="font-size:10px;color:#666;">${_esc(c.city)}</span>`:''}
                </button>`;
            }).join('') || '<div style="font-size:11px;color:#555;padding:6px;">Sin equipos registrados con ese nombre.</div>';
        }, 300);
    }
    function _ctatPick(ref, name, logo, captainEmail) {
        window.__ctTeam.club_email = ref;                      // 'club:<id>' → abre el perfil del equipo
        window.__ctTeam.captain_email = captainEmail || null;  // capitán real del equipo
        window.__ctTeam.logo_url = logo || window.__ctTeam.logo_url;
        const ni = document.getElementById('ctat-name'); if (ni) ni.value = name || '';
        const sh = document.getElementById('ctat-shield'); if (sh) sh.innerHTML = _shieldHTML(window.__ctTeam.logo_url, name, 64);
        const box = document.getElementById('ctat-results'); if (box) box.innerHTML = `<div style="font-size:12px;color:var(--accent);padding:4px;"><i class='bx bx-check'></i> Vinculado a ${_esc(name)} — su plantel se importa automáticamente</div>`;
    }
    async function _ctatSave(tournamentId) {
        const sb = getSb();
        const name = (document.getElementById('ctat-name')?.value||'').trim();
        if (!name) { toast('Poné el nombre del equipo.', 'warning'); return; }
        const t = window.__ctTeam || {};
        const { data: newTeam, error } = await sb.from('tournament_teams').insert({
            tournament_id: tournamentId,
            team_name: name,
            logo_url: t.logo_url || null,
            club_email: t.club_email || null,
            captain_email: t.captain_email || getUser()?.email || null,
            captain_name: name,
            status: 'approved',
            payment_status: 'waived'
        }).select('id').single();
        if (error) { toast('Error: ' + (error.message||''), 'error'); return; }
        // Equipo registrado → importar su plantel automáticamente al torneo
        if (newTeam && t.club_email && String(t.club_email).indexOf('club:') === 0) {
            try { await _importClubRoster(String(t.club_email).slice(5), newTeam.id, tournamentId); } catch(e){}
        }
        document.getElementById('ctat-modal')?.remove();
        toast('Equipo agregado.', 'success');
        const { data: tt } = await sb.from('tournaments').select('organizer_email').eq('id', tournamentId).single();
        _ctmEquipos(tournamentId, tt?.organizer_email);
    }

    // Re-sincroniza el plantel de un equipo vinculado (agrega los que faltan).
    async function _syncRoster(teamId) {
        const sb = getSb();
        const { data: team } = await sb.from('tournament_teams').select('tournament_id,club_email').eq('id', teamId).single();
        if (!team || !team.club_email || String(team.club_email).indexOf('club:') !== 0) { toast('Este equipo no está vinculado a un equipo registrado.', 'info'); return; }
        const added = await _importClubRoster(String(team.club_email).slice(5), teamId, team.tournament_id);
        if (!added) toast('El plantel ya está al día.', 'info');
        const { data: t } = await sb.from('tournaments').select('organizer_email').eq('id', team.tournament_id).single();
        _ctmEquipos(team.tournament_id, t?.organizer_email);
    }

    // Importa los jugadores del equipo registrado (club_members + users) al torneo.
    // Se puede re-correr: solo agrega los que faltan (sync manual con "Sincronizar plantel").
    async function _importClubRoster(clubId, teamId, tournamentId) {
        const sb = getSb();
        const { data: members } = await sb.from('club_members').select('player_email').eq('club_id', clubId).limit(60);
        const emails = [...new Set((members||[]).map(m => (m.player_email||'').toLowerCase()).filter(Boolean))];
        if (!emails.length) return 0;
        const { data: users } = await sb.from('users').select('email,name,photo,position,pos').in('email', emails);
        const byEmail = {}; (users||[]).forEach(u => byEmail[(u.email||'').toLowerCase()] = u);
        // No duplicar: jugadores ya cargados en este equipo del torneo
        const { data: existing } = await sb.from('tournament_players').select('user_email').eq('team_id', teamId);
        const have = new Set((existing||[]).map(p => (p.user_email||'').toLowerCase()).filter(Boolean));
        let added = 0;
        for (const em of emails) {
            if (have.has(em)) continue;
            const u = byEmail[em] || {};
            const pos = String(u.position || u.pos || '').toUpperCase().slice(0,3);
            try {
                await sb.from('tournament_players').insert({
                    tournament_id: tournamentId,
                    team_id: teamId,
                    player_name: u.name || em,
                    position: POSICIONES.indexOf(pos) !== -1 ? pos : null,
                    user_email: em,
                    avatar_url: u.photo || null
                });
                added++;
            } catch(e){}
        }
        if (added) {
            try { await sb.from('tournament_teams').update({ players_count: ((await sb.from('tournament_players').select('*',{count:'exact',head:true}).eq('team_id',teamId)).count) }).eq('id', teamId); } catch(e){}
            toast(added + ' jugadores importados del equipo.', 'success');
        }
        return added;
    }

    async function _approveTeam(teamId, status) {
        const sb = getSb();
        // Se traen los datos del equipo ANTES de resolver, para poder avisarle al capitán.
        const { data: team } = await sb.from('tournament_teams')
            .update({ status }).eq('id', teamId)
            .select('tournament_id,team_name,captain_email,captain_name,club_email').single();
        toast(status === 'approved' ? 'Equipo aprobado ✓' : 'Equipo rechazado.', status === 'approved' ? 'success' : 'warning');
        if (team) {
            const { data: t } = await sb.from('tournaments').select('organizer_email,name').eq('id', team.tournament_id).single();
            // Avisar al equipo que lo aceptaron o rechazaron. Antes la solicitud se
            // resolvía en silencio y el que se inscribía nunca se enteraba.
            try {
                let dest = team.captain_email || '';
                if (!dest && team.club_email && String(team.club_email).indexOf('club:') !== 0) dest = team.club_email;
                if (dest) {
                    const tName = (t && t.name) ? (' "' + t.name + '"') : '';
                    const aprobado = status === 'approved';
                    const msg = aprobado
                        ? `Tu equipo ${team.team_name || ''} fue ACEPTADO en el torneo${tName}. ¡Ya estás dentro!`
                        : `Tu solicitud para el torneo${tName} con ${team.team_name || 'tu equipo'} fue rechazada.`;
                    await sb.from('notifications').insert({
                        recipient_email: dest,
                        type: aprobado ? 'torneo_aceptado' : 'torneo_rechazado',
                        actor_name: (t && t.organizer_email) || 'La organización',
                        actor_email: (t && t.organizer_email) || null,
                        message: msg,
                        post_id: team.tournament_id,
                        read: false
                    });
                }
            } catch(e){ console.warn('notif resolucion torneo:', e); }
            _ctmEquipos(team.tournament_id, t?.organizer_email);
        }
    }

    async function _markPaid(teamId) {
        const sb = getSb();
        const { data: team } = await sb.from('tournament_teams').update({ payment_status: 'paid' }).eq('id', teamId).select('*').single();
        toast('Pago registrado ✓', 'success');
        if (team) {
            const { data: t } = await sb.from('tournaments').select('organizer_email,name,entry_fee').eq('id', team.tournament_id).single();
            // Sumar a la Caja del CRM (con aviso previo) + agradecer al capitán
            try {
                const fee = (t && t.entry_fee) || 0;
                if (fee > 0 && confirm(`¿Registrar el ingreso de $${fee} de ${team.team_name} en la Caja del panel?`)) {
                    await sb.from('business_cashflow').insert({ business_email: t.organizer_email, type: 'ingreso', concept: 'Inscripción: ' + team.team_name + (t.name ? ' — ' + t.name : ''), amount: fee });
                    toast('Ingreso registrado en Caja.', 'success');
                }
                if (team.captain_email) { try { await sb.from('notifications').insert({ recipient_email: team.captain_email, type: 'torneo_pago', actor_name: (t && t.name) || 'Torneo', actor_email: t?.organizer_email || null, message: `Recibimos el pago de inscripción de ${team.team_name}. ¡Gracias! Nos vemos en la cancha.`, post_id: team.tournament_id, read: false }); } catch(e){} }
            } catch(e){}
            _ctmEquipos(team.tournament_id, t?.organizer_email);
        }
    }

    async function _openTeamPlayers(teamId, teamName) {
        const sb = getSb();
        const { data: players } = await sb.from('tournament_players').select('*').eq('team_id', teamId).order('number');
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;padding:20px;';
        modal.innerHTML = `<div data-team-players="${teamId}" style="background:#0d0d0d;border:1px solid #222;border-radius:18px;width:100%;max-width:420px;max-height:85vh;overflow-y:auto;padding:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3 style="font-weight:900;font-size:15px;"><i class='bx bx-shield-quarter' style="color:var(--accent);"></i> ${teamName}</h3>
                <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;color:#888;font-size:22px;cursor:pointer;">&times;</button>
            </div>
            ${(players||[]).map(p => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #1a1a1a;">
                <div style="width:30px;height:30px;border-radius:50%;flex-shrink:0;${p.avatar_url ? `background:#222 url('${_esc(p.avatar_url)}') center/cover;` : 'background:rgba(186,255,0,0.1);'}display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:var(--accent);">${p.avatar_url ? '' : ('#' + (p.number||'—'))}</div>
                <div style="flex:1;min-width:0;"><div style="font-weight:700;font-size:13px;">${_esc(p.player_name)}${p.avatar_url && p.number != null ? ` <span style="color:#666;font-weight:600;">#${p.number}</span>` : ''}</div><div style="font-size:10px;color:#666;">${p.position ? (POS_LABEL[p.position]||p.position) : '—'}</div></div>
                <div style="font-size:10px;color:#666;white-space:nowrap;"><i class='bx bx-football'></i>${p.goals||0} · <i class='bx bx-run'></i>${p.assists||0}</div>
                <button onclick="CancheroTournaments._openEditPlayer('${p.id}','${teamId}','${String(teamName||'').replace(/'/g,"\\'")}')" title="Editar jugador" style="background:rgba(255,255,255,0.04);border:1px solid #222;color:#aaa;border-radius:8px;padding:5px 8px;font-size:13px;cursor:pointer;flex-shrink:0;"><i class='bx bx-edit'></i></button>
            </div>`).join('') || '<div style="text-align:center;padding:20px;color:#555;">Sin jugadores registrados.</div>'}
            <button onclick="CancheroTournaments._addPlayerToTeam('${teamId}')" style="width:100%;margin-top:12px;background:rgba(186,255,0,0.08);color:var(--accent);border:1px solid rgba(186,255,0,0.25);border-radius:10px;padding:10px;font-weight:700;cursor:pointer;font-size:13px;"><i class='bx bx-user-plus'></i> Agregar jugador</button>
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    }

    // Modal para agregar jugador (manual o vinculando un jugador registrado → autocompleta).
    async function _addPlayerToTeam(teamId) {
        window.__ctPlayer = { user_email:null, avatar_url:null };
        const ex = document.getElementById('ctap-modal'); if (ex) ex.remove();
        const modal = document.createElement('div');
        modal.id = 'ctap-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,0.9);overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:20px;';
        modal.innerHTML = `
        <div style="background:#0d0d0d;border:1px solid #222;border-radius:18px;width:100%;max-width:420px;padding:20px;margin-top:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                <h3 style="font-family:Outfit,sans-serif;font-weight:900;font-size:15px;">Agregar jugador</h3>
                <button onclick="document.getElementById('ctap-modal').remove()" style="background:none;border:none;color:#888;font-size:22px;cursor:pointer;">&times;</button>
            </div>
            <div style="font-size:10px;font-weight:900;color:#555;letter-spacing:1px;margin-bottom:6px;">¿JUGADOR YA REGISTRADO?</div>
            <input id="ctap-search" type="text" placeholder="Buscar jugador por nombre..." oninput="CancheroTournaments._ctapSearch()" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:6px;">
            <div id="ctap-results" style="display:flex;flex-direction:column;gap:4px;margin-bottom:12px;max-height:150px;overflow-y:auto;"></div>
            <div style="border-top:1px solid #1a1a1a;padding-top:12px;">
                <input id="ctap-name" type="text" placeholder="Nombre del jugador" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px 12px;font-size:14px;margin-bottom:8px;">
                <div style="display:flex;gap:8px;margin-bottom:12px;">
                    <input id="ctap-number" type="number" min="1" max="99" placeholder="N°" style="width:70px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px;font-size:14px;text-align:center;">
                    <select id="ctap-pos" style="flex:1;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px;font-size:13px;">
                        <option value="">Posición...</option>
                        ${POSICIONES.map(p => `<option value="${p}">${p} — ${POS_LABEL[p]}</option>`).join('')}
                    </select>
                </div>
            </div>
            <button onclick="CancheroTournaments._ctapSave('${teamId}')" style="width:100%;background:var(--accent);color:#000;border:none;border-radius:12px;padding:12px;font-weight:900;font-size:14px;cursor:pointer;">Agregar</button>
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    }
    let _ctapT = null;
    function _ctapSearch() {
        const term = (document.getElementById('ctap-search')?.value||'').trim();
        const box = document.getElementById('ctap-results'); if (!box) return;
        if (term.length < 2) { box.innerHTML = ''; return; }
        clearTimeout(_ctapT);
        _ctapT = setTimeout(async () => {
            const sb = getSb();
            const { data } = await sb.from('users').select('email,name,photo,position,pos,role')
                .eq('role','jugador').ilike('name','%'+term+'%').limit(8);
            box.innerHTML = (data||[]).map(u => `<button onclick="CancheroTournaments._ctapPick('${(u.email||'').replace(/'/g,"\\'")}','${(u.name||'').replace(/'/g,"\\'")}','${(u.photo||'').replace(/'/g,"\\'")}','${(u.position||u.pos||'').replace(/'/g,"\\'")}')" style="display:flex;align-items:center;gap:10px;background:#141414;border:1px solid #222;border-radius:10px;padding:7px 10px;cursor:pointer;text-align:left;color:#fff;">
                <span style="width:26px;height:26px;border-radius:50%;background:#222 center/cover;${u.photo?`background-image:url('${_esc(u.photo)}')`:''};flex-shrink:0;"></span>
                <span style="font-size:13px;font-weight:700;">${_esc(u.name||u.email)}</span>
            </button>`).join('') || '<div style="font-size:11px;color:#555;padding:6px;">Sin jugadores con ese nombre.</div>';
        }, 300);
    }
    function _ctapPick(email, name, photo, pos) {
        window.__ctPlayer = { user_email: email, avatar_url: photo||null };
        const ni = document.getElementById('ctap-name'); if (ni) ni.value = name || '';
        const ps = document.getElementById('ctap-pos'); if (ps && pos) { const up = pos.toUpperCase().slice(0,3); if (POSICIONES.indexOf(up) !== -1) ps.value = up; }
        const box = document.getElementById('ctap-results'); if (box) box.innerHTML = `<div style="font-size:12px;color:var(--accent);padding:4px;"><i class='bx bx-check'></i> Vinculado a ${_esc(name)} (podés editar)</div>`;
    }
    async function _ctapSave(teamId) {
        const sb = getSb();
        const name = (document.getElementById('ctap-name')?.value||'').trim();
        if (!name) { toast('Poné el nombre del jugador.', 'warning'); return; }
        const number = parseInt(document.getElementById('ctap-number')?.value) || null;
        const position = document.getElementById('ctap-pos')?.value || null;
        const p = window.__ctPlayer || {};
        const { data: team } = await sb.from('tournament_teams').select('tournament_id').eq('id', teamId).single();
        const { error } = await sb.from('tournament_players').insert({
            tournament_id: team?.tournament_id,
            team_id: teamId,
            player_name: name,
            number: number,
            position: position,
            user_email: p.user_email || null,
            avatar_url: p.avatar_url || null
        });
        if (error) { toast('Error: ' + (error.message||''), 'error'); return; }
        await sb.from('tournament_teams').update({ players_count: ((await sb.from('tournament_players').select('*',{count:'exact',head:true}).eq('team_id',teamId)).count) }).eq('id', teamId);
        document.getElementById('ctap-modal')?.remove();
        toast('Jugador agregado.', 'success');
        // refrescar el modal de jugadores del equipo si está abierto
        // Si veníamos del editor de resultado, volver ahí: ahora sí hay plantel y se
        // pueden cargar goleadores, asistencias y tarjetas.
        if (window.__cmeVolverA) {
            const v = window.__cmeVolverA; window.__cmeVolverA = null;
            _openMatchLoad(v.matchId, v.tournamentId);
            return;
        }
        const openTeamModal = document.querySelector('[data-team-players="'+teamId+'"]');
        if (openTeamModal) { openTeamModal.closest('[style*=fixed]')?.remove(); _openTeamPlayers(teamId, ''); }
    }

    // ═══════════════════════════════════════════════════════════
    // EDITAR JUGADOR / EQUIPO DEL TORNEO (solo la organización)
    // Columnas confirmadas contra el esquema real (2026-07-18):
    //   tournament_players: player_name, number, position, avatar_url, photo_style,
    //     player_email, user_email, goals, assists, yellow_cards, red_cards,
    //     matches_played, suspended_matches
    //   tournament_teams: team_name, captain_name, captain_email, group_letter, logo_url,
    //     status, payment_status, paid_amount, paid_at, next_payment_at, notes,
    //     payment_proof_url, points, wins, draws, losses, goals_for, goals_against
    // ═══════════════════════════════════════════════════════════

    // Guarda solo las columnas que existen: si alguna faltara, el update entero daría 400
    // y la edición fallaría en silencio. Se reintenta sin la columna que el server rechaza.
    async function _safeUpdate(table, id, fields) {
        const sb = getSb();
        let payload = Object.assign({}, fields);
        for (let intento = 0; intento < 6; intento++) {
            const { error } = await sb.from(table).update(payload).eq('id', id);
            if (!error) return { ok: true };
            const m = /column "?([a-z_]+)"?/i.exec(error.message || '');
            if (m && Object.prototype.hasOwnProperty.call(payload, m[1])) {
                delete payload[m[1]];           // columna inexistente → sacarla y reintentar
                if (!Object.keys(payload).length) return { ok: false, error };
                continue;
            }
            return { ok: false, error };
        }
        return { ok: false, error: { message: 'demasiados reintentos' } };
    }

    function _num(id, def) {
        const v = document.getElementById(id);
        if (!v || v.value === '') return def === undefined ? null : def;
        const n = parseInt(v.value, 10);
        return isNaN(n) ? (def === undefined ? null : def) : n;
    }
    function _val(id) { return (document.getElementById(id)?.value || '').trim() || null; }

    // ── EDITAR JUGADOR ─────────────────────────────────────────
    async function _openEditPlayer(playerId, teamId, teamName) {
        const sb = getSb();
        const { data: p } = await sb.from('tournament_players').select('*').eq('id', playerId).single();
        if (!p) { toast('Jugador no encontrado.', 'error'); return; }
        const ex = document.getElementById('ctep-modal'); if (ex) ex.remove();
        const modal = document.createElement('div');
        modal.id = 'ctep-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:100010;background:rgba(0,0,0,0.92);overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:20px;';
        const av = p.avatar_url ? `background-image:url('${_esc(p.avatar_url)}');background-size:cover;background-position:center;` : '';
        modal.innerHTML = `
        <div style="background:#0d0d0d;border:1px solid #222;border-radius:18px;width:100%;max-width:420px;padding:20px;margin-top:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                <h3 style="font-family:Outfit,sans-serif;font-weight:900;font-size:15px;"><i class='bx bx-edit' style="color:var(--accent);"></i> Editar jugador</h3>
                <button onclick="document.getElementById('ctep-modal').remove()" style="background:none;border:none;color:#888;font-size:22px;cursor:pointer;">&times;</button>
            </div>

            <div style="display:flex;justify-content:center;margin-bottom:14px;">
                <label style="position:relative;cursor:pointer;">
                    <div id="ctep-photo" style="width:84px;height:84px;border-radius:50%;border:2px solid rgba(186,255,0,0.4);background:#161616;${av}display:flex;align-items:center;justify-content:center;color:var(--accent);">${p.avatar_url ? '' : "<i class='bx bx-camera' style=\"font-size:24px;\"></i>"}</div>
                    <div style="position:absolute;bottom:-2px;right:-2px;width:26px;height:26px;border-radius:50%;background:var(--accent);color:#000;display:flex;align-items:center;justify-content:center;border:2px solid #0d0d0d;"><i class='bx bx-plus' style="font-size:14px;"></i></div>
                    <input type="file" accept="image/*" style="display:none;" onchange="CancheroTournaments._ctepPickPhoto(event)">
                </label>
            </div>

            <div style="font-size:10px;font-weight:900;color:#555;letter-spacing:1px;margin-bottom:6px;">DATOS</div>
            <input id="ctep-name" type="text" placeholder="Nombre del jugador" value="${_esc(p.player_name||'')}" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px 12px;font-size:14px;margin-bottom:8px;box-sizing:border-box;">
            <div style="display:flex;gap:8px;margin-bottom:8px;">
                <input id="ctep-number" type="number" min="1" max="99" placeholder="N°" value="${p.number != null ? p.number : ''}" style="width:78px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px;font-size:14px;text-align:center;box-sizing:border-box;">
                <select id="ctep-pos" style="flex:1;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px;font-size:13px;">
                    <option value="">Posición...</option>
                    ${POSICIONES.map(x => `<option value="${x}"${p.position === x ? ' selected' : ''}>${x} — ${POS_LABEL[x]}</option>`).join('')}
                </select>
            </div>
            <input id="ctep-email" type="email" placeholder="Email del jugador (opcional)" value="${_esc(p.player_email||p.user_email||'')}" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:8px;box-sizing:border-box;">
            <input id="ctep-nat" type="text" placeholder="País (ej: Uruguay) — para la banderita" value="${_esc(p.nationality||'')}" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:14px;box-sizing:border-box;">

            <div style="font-size:10px;font-weight:900;color:#555;letter-spacing:1px;margin-bottom:6px;">ESTADÍSTICAS</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
                ${_statInput('ctep-goals', 'Goles', p.goals)}
                ${_statInput('ctep-assists', 'Asistencias', p.assists)}
                ${_statInput('ctep-yellow', 'Amarillas', p.yellow_cards)}
                ${_statInput('ctep-red', 'Rojas', p.red_cards)}
                ${_statInput('ctep-mp', 'Partidos', p.matches_played)}
                ${_statInput('ctep-susp', 'Fechas susp.', p.suspended_matches)}
            </div>
            <div style="font-size:10px;color:#555;margin-bottom:14px;line-height:1.5;">Editar las estadísticas a mano pisa lo que se cargó por partido.</div>

            <div style="display:flex;gap:10px;">
                <button onclick="CancheroTournaments._deletePlayerFrom('${playerId}','${teamId}','${String(teamName||'').replace(/'/g,"\\'")}')" style="background:rgba(255,68,68,0.08);color:#ff4444;border:1px solid rgba(255,68,68,0.25);border-radius:12px;padding:12px 14px;font-weight:800;font-size:13px;cursor:pointer;"><i class='bx bx-trash'></i></button>
                <button onclick="CancheroTournaments._saveEditPlayer('${playerId}','${teamId}','${String(teamName||'').replace(/'/g,"\\'")}')" style="flex:1;background:var(--accent);color:#000;border:none;border-radius:12px;padding:12px;font-weight:900;font-size:14px;cursor:pointer;">GUARDAR CAMBIOS</button>
            </div>
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
        window.__ctepPhoto = null;
    }

    function _statInput(id, label, v) {
        return `<div><div style="font-size:10px;color:#777;margin-bottom:3px;">${label}</div>
            <input id="${id}" type="number" min="0" value="${v != null ? v : 0}" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:9px;font-size:13px;text-align:center;box-sizing:border-box;"></div>`;
    }

    function _ctepPickPhoto(event) {
        const f = event.target.files && event.target.files[0]; if (!f) return;
        window.__ctepPhoto = f;
        const r = new FileReader();
        r.onload = e => {
            const prev = document.getElementById('ctep-photo');
            if (prev) { prev.style.backgroundImage = `url('${e.target.result}')`; prev.style.backgroundSize = 'cover'; prev.style.backgroundPosition = 'center'; prev.innerHTML = ''; }
        };
        r.readAsDataURL(f);
    }

    async function _saveEditPlayer(playerId, teamId, teamName) {
        const name = _val('ctep-name');
        if (!name) { toast('El nombre no puede quedar vacío.', 'warning'); return; }
        const fields = {
            player_name: name,
            number: _num('ctep-number'),
            position: _val('ctep-pos'),
            player_email: _val('ctep-email'),
            nationality: _val('ctep-nat'),   // _safeUpdate la saca si la columna no existe
            goals: _num('ctep-goals', 0),
            assists: _num('ctep-assists', 0),
            yellow_cards: _num('ctep-yellow', 0),
            red_cards: _num('ctep-red', 0),
            matches_played: _num('ctep-mp', 0),
            suspended_matches: _num('ctep-susp', 0)
        };
        if (window.__ctepPhoto) {
            toast('Subiendo foto...', 'info');
            const url = await _uploadImg(window.__ctepPhoto, 'torneos/jugadores');
            if (url) fields.avatar_url = url;
        }
        const r = await _safeUpdate('tournament_players', playerId, fields);
        if (!r.ok) { toast('Error: ' + (r.error?.message || ''), 'error'); return; }
        window.__ctepPhoto = null;
        document.getElementById('ctep-modal')?.remove();
        toast('Jugador actualizado.', 'success');
        _refreshTeamPlayers(teamId, teamName);
    }

    async function _deletePlayerFrom(playerId, teamId, teamName) {
        if (!confirm('¿Eliminar este jugador del equipo?')) return;
        const sb = getSb();
        const { error } = await sb.from('tournament_players').delete().eq('id', playerId);
        if (error) { toast('Error: ' + error.message, 'error'); return; }
        try {
            const { count } = await sb.from('tournament_players').select('*', { count:'exact', head:true }).eq('team_id', teamId);
            await sb.from('tournament_teams').update({ players_count: count }).eq('id', teamId);
        } catch(e){}
        document.getElementById('ctep-modal')?.remove();
        toast('Jugador eliminado.', 'success');
        _refreshTeamPlayers(teamId, teamName);
    }

    // Vuelve a abrir el plantel para que se vean los cambios sin recargar.
    function _refreshTeamPlayers(teamId, teamName) {
        const open = document.querySelector('[data-team-players="' + teamId + '"]');
        if (open) { open.closest('[style*=fixed]')?.remove(); _openTeamPlayers(teamId, teamName || ''); }
    }

    // ── EDITAR EQUIPO ──────────────────────────────────────────
    async function _openEditTeam(teamId) {
        const sb = getSb();
        const { data: t } = await sb.from('tournament_teams').select('*').eq('id', teamId).single();
        if (!t) { toast('Equipo no encontrado.', 'error'); return; }
        const ex = document.getElementById('ctet-modal'); if (ex) ex.remove();
        const modal = document.createElement('div');
        modal.id = 'ctet-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:100010;background:rgba(0,0,0,0.92);overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:20px;';
        const lg = t.logo_url ? `background-image:url('${_esc(t.logo_url)}');background-size:cover;background-position:center;` : '';
        const dateVal = v => { try { return v ? String(v).slice(0, 10) : ''; } catch(e){ return ''; } };
        modal.innerHTML = `
        <div style="background:#0d0d0d;border:1px solid #222;border-radius:18px;width:100%;max-width:420px;padding:20px;margin-top:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                <h3 style="font-family:Outfit,sans-serif;font-weight:900;font-size:15px;"><i class='bx bx-edit' style="color:var(--accent);"></i> Editar equipo</h3>
                <button onclick="document.getElementById('ctet-modal').remove()" style="background:none;border:none;color:#888;font-size:22px;cursor:pointer;">&times;</button>
            </div>

            <div style="display:flex;justify-content:center;margin-bottom:14px;">
                <label style="position:relative;cursor:pointer;">
                    <div id="ctet-logo" style="width:84px;height:84px;border-radius:14px;border:2px solid rgba(186,255,0,0.4);background:#161616;${lg}display:flex;align-items:center;justify-content:center;color:var(--accent);">${t.logo_url ? '' : "<i class='bx bx-camera' style=\"font-size:24px;\"></i>"}</div>
                    <div style="position:absolute;bottom:-2px;right:-2px;width:26px;height:26px;border-radius:50%;background:var(--accent);color:#000;display:flex;align-items:center;justify-content:center;border:2px solid #0d0d0d;"><i class='bx bx-plus' style="font-size:14px;"></i></div>
                    <input type="file" accept="image/*" style="display:none;" onchange="CancheroTournaments._ctetPickLogo(event)">
                </label>
            </div>

            <div style="font-size:10px;font-weight:900;color:#555;letter-spacing:1px;margin-bottom:6px;">DATOS</div>
            <input id="ctet-name" type="text" placeholder="Nombre del equipo" value="${_esc(t.team_name||'')}" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px 12px;font-size:14px;margin-bottom:8px;box-sizing:border-box;">
            <input id="ctet-captain" type="text" placeholder="Nombre del capitán" value="${_esc(t.captain_name||'')}" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:8px;box-sizing:border-box;">
            <input id="ctet-captain-email" type="email" placeholder="Email del capitán" value="${_esc(t.captain_email||'')}" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:8px;box-sizing:border-box;">
            <div style="display:flex;gap:8px;margin-bottom:14px;">
                <input id="ctet-group" type="text" maxlength="2" placeholder="Grupo" value="${_esc(t.group_letter||'')}" style="width:80px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px;font-size:13px;text-align:center;text-transform:uppercase;box-sizing:border-box;">
                <select id="ctet-status" style="flex:1;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px;font-size:13px;">
                    ${[['pending','Pendiente'],['approved','Aprobado'],['rejected','Rechazado'],['eliminated','Eliminado']].map(([v,l]) => `<option value="${v}"${t.status === v ? ' selected' : ''}>${l}</option>`).join('')}
                </select>
            </div>

            <div style="font-size:10px;font-weight:900;color:#555;letter-spacing:1px;margin-bottom:6px;">PAGO</div>
            <div style="display:flex;gap:8px;margin-bottom:8px;">
                <select id="ctet-pay" style="flex:1;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px;font-size:13px;">
                    ${[['pending','Sin pago'],['paid','Pagado'],['waived','Exento']].map(([v,l]) => `<option value="${v}"${t.payment_status === v ? ' selected' : ''}>${l}</option>`).join('')}
                </select>
                <input id="ctet-amount" type="number" min="0" step="0.01" placeholder="Monto" value="${t.paid_amount != null ? t.paid_amount : ''}" style="width:110px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px;font-size:13px;text-align:center;box-sizing:border-box;">
            </div>
            <div style="font-size:10px;color:#777;margin-bottom:3px;">Próximo pago</div>
            <input id="ctet-next" type="date" value="${dateVal(t.next_payment_at)}" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:8px;box-sizing:border-box;">
            <textarea id="ctet-notes" rows="2" placeholder="Notas internas (no las ve el equipo)" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;font-family:inherit;resize:none;margin-bottom:14px;box-sizing:border-box;">${_esc(t.notes||'')}</textarea>

            <div style="display:flex;gap:10px;">
                <button onclick="CancheroTournaments._deleteTeam('${teamId}','${String(t.tournament_id||'').replace(/'/g,"\\'")}')" style="background:rgba(255,68,68,0.08);color:#ff4444;border:1px solid rgba(255,68,68,0.25);border-radius:12px;padding:12px 14px;font-weight:800;font-size:13px;cursor:pointer;"><i class='bx bx-trash'></i></button>
                <button onclick="CancheroTournaments._saveEditTeam('${teamId}')" style="flex:1;background:var(--accent);color:#000;border:none;border-radius:12px;padding:12px;font-weight:900;font-size:14px;cursor:pointer;">GUARDAR CAMBIOS</button>
            </div>
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
        window.__ctetLogo = null;
    }

    function _ctetPickLogo(event) {
        const f = event.target.files && event.target.files[0]; if (!f) return;
        window.__ctetLogo = f;
        const r = new FileReader();
        r.onload = e => {
            const prev = document.getElementById('ctet-logo');
            if (prev) { prev.style.backgroundImage = `url('${e.target.result}')`; prev.style.backgroundSize = 'cover'; prev.style.backgroundPosition = 'center'; prev.innerHTML = ''; }
        };
        r.readAsDataURL(f);
    }

    async function _saveEditTeam(teamId) {
        const sb = getSb();
        const name = _val('ctet-name');
        if (!name) { toast('El nombre del equipo no puede quedar vacío.', 'warning'); return; }
        const pay = _val('ctet-pay');
        const amountEl = document.getElementById('ctet-amount');
        const fields = {
            team_name: name,
            captain_name: _val('ctet-captain'),
            captain_email: _val('ctet-captain-email'),
            group_letter: (_val('ctet-group') || '').toUpperCase() || null,
            status: _val('ctet-status'),
            payment_status: pay,
            paid_amount: (amountEl && amountEl.value !== '') ? parseFloat(amountEl.value) : null,
            next_payment_at: _val('ctet-next'),
            notes: _val('ctet-notes')
        };
        // Sellar la fecha de pago al pasar a "pagado" (si no tenía).
        if (pay === 'paid') fields.paid_at = new Date().toISOString();
        if (window.__ctetLogo) {
            toast('Subiendo escudo...', 'info');
            const url = await _uploadImg(window.__ctetLogo, 'torneos/equipos');
            if (url) fields.logo_url = url;
        }
        const r = await _safeUpdate('tournament_teams', teamId, fields);
        if (!r.ok) { toast('Error: ' + (r.error?.message || ''), 'error'); return; }
        window.__ctetLogo = null;
        const { data: t } = await sb.from('tournament_teams').select('tournament_id').eq('id', teamId).single();
        document.getElementById('ctet-modal')?.remove();
        toast('Equipo actualizado.', 'success');
        if (t?.tournament_id) _ctmEquipos(t.tournament_id, null);
    }

    async function _deleteTeam(teamId, tournamentId) {
        const sb = getSb();
        const { data: t } = await sb.from('tournament_teams').select('team_name,tournament_id').eq('id', teamId).single();
        if (!confirm('¿Eliminar "' + (t?.team_name || 'este equipo') + '" del torneo?\n\nSe borra también su plantel. Los partidos ya jugados quedan igual.')) return;
        try { await sb.from('tournament_players').delete().eq('team_id', teamId); } catch(e){}
        const { error } = await sb.from('tournament_teams').delete().eq('id', teamId);
        if (error) { toast('Error: ' + error.message, 'error'); return; }
        document.getElementById('ctet-modal')?.remove();
        toast('Equipo eliminado del torneo.', 'success');
        const tid = tournamentId || t?.tournament_id;
        if (tid) _ctmEquipos(tid, null);
    }

    // ═══════════════════════════════════════════════════════════
    // GENERAR FIXTURE
    // ═══════════════════════════════════════════════════════════
    // Paso 1 de generar fixture: NO crea nada, muestra un resumen de lo que va a pasar
    // (formato, ida/vuelta, equipos, cuántos partidos y cuántas fechas) y pide confirmar.
    async function _generateFixture(tournamentId) {
        const sb = getSb();
        const { data: t } = await sb.from('tournaments').select('*').eq('id', tournamentId).single();
        const { data: allTeams } = await sb.from('tournament_teams').select('*').eq('tournament_id', tournamentId).eq('status','approved');
        if (!allTeams || allTeams.length < 2) { toast('Necesitás al menos 2 equipos aprobados.', 'warning'); return; }
        const { data: prev } = await sb.from('tournament_matches').select('id,home_score').eq('tournament_id', tournamentId);
        const conResultado = (prev||[]).filter(m => m.home_score !== null).length;

        const plan = _planFixture(t, allTeams);
        const fmtLabel = t.format === 'groups' ? 'Fase de grupos' : t.format === 'league' ? 'Liga (todos contra todos)' : 'Eliminación directa';
        const row = (l, v) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.06);"><span style="font-size:12px;color:#888;">${l}</span><span style="font-size:12px;font-weight:800;color:#fff;text-align:right;">${v}</span></div>`;
        const ex = document.getElementById('ctgf-modal'); if (ex) ex.remove();
        const modal = document.createElement('div');
        modal.id = 'ctgf-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:100010;background:rgba(0,0,0,0.92);backdrop-filter:blur(6px);overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:20px;';
        modal.innerHTML = `
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(14px);border-radius:20px;width:100%;max-width:420px;padding:20px;margin-top:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                <h3 style="font-family:Outfit,sans-serif;font-weight:900;font-size:16px;"><i class='bx bx-shuffle' style="color:var(--accent);"></i> Generar fixture</h3>
                <button onclick="document.getElementById('ctgf-modal').remove()" style="background:none;border:none;color:#888;font-size:22px;cursor:pointer;">&times;</button>
            </div>
            ${row('Formato', fmtLabel)}
            ${row('Ida y vuelta', t.double_round ? 'Sí' : 'No')}
            ${row('Equipos aprobados', allTeams.length)}
            ${plan.groupsCount ? row('Grupos', `${plan.groupsCount} de hasta ${plan.groupSize}`) : ''}
            ${plan.matchdays ? row('Fechas', plan.matchdays) : ''}
            ${plan.byeNote ? row('Descansa por fecha', plan.byeNote) : ''}
            ${plan.qualifiers ? row('Playoffs', `${plan.qualifiers} clasificados — desde ${plan.playoffLabel}`) : ''}
            ${row('Partidos a crear', `<span style="color:var(--accent);font-size:15px;">${plan.total}</span>`)}
            ${plan.note ? `<div style="margin-top:10px;font-size:11px;color:#888;line-height:1.5;">${plan.note}</div>` : ''}
            ${(prev||[]).length ? `<div style="margin-top:12px;background:rgba(255,68,68,0.08);border:1px solid rgba(255,68,68,0.25);border-radius:12px;padding:10px 12px;font-size:11px;color:#ff9b9b;line-height:1.5;"><i class='bx bx-error'></i> Ya hay ${prev.length} partidos generados${conResultado ? ` y <b>${conResultado} con resultado cargado</b>` : ''}. Regenerar los borra${conResultado ? ' y se pierden esos resultados' : ''}.</div>` : ''}
            <button onclick="CancheroTournaments._doGenerateFixture('${tournamentId}')" id="ctgf-go" style="width:100%;margin-top:14px;background:var(--accent);color:#000;border:none;border-radius:14px;padding:13px;font-weight:900;font-size:14px;cursor:pointer;font-family:Outfit,sans-serif;">${(prev||[]).length ? 'REGENERAR FIXTURE' : 'GENERAR FIXTURE'}</button>
            <button onclick="document.getElementById('ctgf-modal').remove()" style="width:100%;margin-top:8px;background:rgba(255,255,255,0.05);color:#aaa;border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:11px;font-weight:800;font-size:13px;cursor:pointer;">Cancelar</button>
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    }

    // Paso 2: acá sí se borra el fixture viejo y se escribe el nuevo.
    async function _doGenerateFixture(tournamentId) {
        const sb = getSb();
        const btn = document.getElementById('ctgf-go');
        if (btn) { btn.textContent = 'Generando...'; btn.disabled = true; }
        const { data: t } = await sb.from('tournaments').select('*').eq('id', tournamentId).single();
        const { data: allTeams } = await sb.from('tournament_teams').select('*').eq('tournament_id', tournamentId).eq('status','approved');
        if (!allTeams || allTeams.length < 2) { toast('Necesitás al menos 2 equipos aprobados.', 'warning'); return; }

        const plan = _planFixture(t, allTeams);

        // Eliminar fixture anterior si existe
        await sb.from('tournament_matches').delete().eq('tournament_id', tournamentId);

        // Grabar la letra de grupo que quedó asignada en el plan
        for (const [teamId, letter] of Object.entries(plan.groupOf || {})) {
            await sb.from('tournament_teams').update({ group_letter: letter }).eq('id', teamId);
        }

        let total = 0;
        if (plan.flat.length) {
            const ok = await _insertMatches(sb, plan.flat.map(m => ({ ...m, tournament_id: tournamentId })));
            if (!ok) { if (btn) { btn.textContent = 'GENERAR FIXTURE'; btn.disabled = false; } return; }
            total += plan.flat.length;
        }
        if (plan.rounds && plan.rounds.length) {
            total += await _insertBracket(sb, tournamentId, plan.rounds);
        }

        document.getElementById('ctgf-modal')?.remove();
        await sb.from('tournaments').update({ status: 'active' }).eq('id', tournamentId);
        toast(`Fixture generado: ${total} partidos`, 'success');
        _ctmTab('fixture', tournamentId, t.organizer_email, null);
    }

    // Inserta partidos tolerando que falten las columnas nuevas (matchday / next_match_id /
    // next_slot). Si la base todavía no tiene la migración, reintenta sin ellas.
    const _OPT_COLS = ['matchday', 'next_match_id', 'next_slot'];
    async function _insertMatches(sb, rows) {
        let { error } = await sb.from('tournament_matches').insert(rows);
        if (error) {
            const bare = rows.map(r => { const c = { ...r }; _OPT_COLS.forEach(k => delete c[k]); return c; });
            const retry = await sb.from('tournament_matches').insert(bare);
            if (retry.error) { toast('Error al guardar fixture: ' + retry.error.message, 'error'); return false; }
            toast('Fixture guardado. Corré la migración SQL para fechas y bracket automático.', 'warning');
        }
        return true;
    }

    // El bracket se escribe de la FINAL hacia atrás: cada ronda necesita el id de la ronda
    // siguiente para poder encadenar al ganador.
    async function _insertBracket(sb, tournamentId, rounds) {
        // Mapa posición-en-la-ronda → id, no por índice del array: la primera ronda descarta
        // los cruces con BYE y quedaría desalineada si se encadenara por índice.
        let nextById = {};
        let total = 0;
        for (let r = rounds.length - 1; r >= 0; r--) {
            const rows = rounds[r].map(m => {
                const { _pos, ...rest } = m;
                return {
                    ...rest,
                    tournament_id: tournamentId,
                    next_match_id: nextById[Math.floor(_pos / 2)] || null,
                    next_slot: nextById[Math.floor(_pos / 2)] ? (_pos % 2 === 0 ? 'home' : 'away') : null
                };
            });
            let { data, error } = await sb.from('tournament_matches').insert(rows).select('id');
            if (error) {
                const bare = rows.map(x => { const c = { ...x }; _OPT_COLS.forEach(k => delete c[k]); return c; });
                const retry = await sb.from('tournament_matches').insert(bare).select('id');
                if (retry.error) { toast('Error al guardar fixture: ' + retry.error.message, 'error'); return total; }
                data = retry.data;
                if (r === rounds.length - 1) toast('Bracket creado. Corré la migración SQL para que el ganador avance solo.', 'warning');
            }
            nextById = {};
            (data || []).forEach((x, i) => { nextById[rounds[r][i]._pos] = x.id; });
            total += rows.length;
        }
        return total;
    }

    // ── Planificador: calcula TODO el fixture en memoria, sin tocar la base. Lo usan tanto
    // el modal de confirmación (para mostrar los números) como la generación real.
    // Devuelve siempre { flat, rounds, total, ... }:
    //   flat   = partidos sueltos (liga / fase de grupos), se insertan de una
    //   rounds = llaves encadenadas (playoffs), se insertan de la final hacia atrás
    function _planFixture(t, allTeams) {
        const dbl = !!t.double_round;
        if (t.format === 'groups') {
            const size = Math.max(3, Math.min(8, parseInt(t.group_size) || 4));
            const groups = _splitGroups(allTeams, size);
            const letters = _GROUP_LETTERS;
            const flat = [];
            const groupOf = {};
            let maxDays = 0, byeNames = [];
            for (let gi = 0; gi < groups.length; gi++) {
                const letter = letters[gi] || 'A';
                groups[gi].forEach(tm => { groupOf[tm.id] = letter; });
                const rr = _roundRobin(groups[gi], 'groups', letter, dbl);
                maxDays = Math.max(maxDays, rr.matchdays);
                if (rr.hasBye) byeNames.push('Grupo ' + letter);
                flat.push(...rr.matches);
            }
            // Playoffs: llaves vacías rotuladas con el puesto de origen ("1º Grupo A"), que se
            // completan solas cuando termina la fase de grupos.
            const po = _buildPlayoffs(t, groups.length, allTeams.length);
            return { flat, rounds: po.rounds, total: flat.length + po.rounds.flat().length,
                groupOf, groupsCount: groups.length, groupSize: size, matchdays: maxDays,
                playoffLabel: po.label, qualifiers: po.size,
                byeNote: byeNames.length ? '1 equipo (' + byeNames.join(', ') + ')' : '',
                note: 'Cada grupo juega todos contra todos' + (dbl ? ', ida y vuelta.' : '.') +
                      (po.size ? ` Clasifican ${po.size} a ${po.label}; los cruces se completan solos al terminar los grupos.` : '') };
        }
        if (t.format === 'league') {
            const rr = _roundRobin(allTeams, 'groups', 'L', dbl);
            const groupOf = {}; allTeams.forEach(tm => { groupOf[tm.id] = 'L'; });
            return { flat: rr.matches, rounds: [], total: rr.matches.length, groupOf, matchdays: rr.matchdays,
                byeNote: rr.hasBye ? '1 equipo' : '',
                note: 'Todos contra todos' + (dbl ? ', ida y vuelta.' : '.') };
        }
        // Eliminación directa: bracket completo con cruces a definir en las rondas siguientes.
        const br = _buildBracket(allTeams);
        return { flat: [], rounds: br.rounds, total: br.rounds.flat().length, groupOf: {},
            note: br.byes ? `${br.byes} equipo(s) pasan directo a la ronda siguiente. El ganador de cada llave avanza solo al cargar el resultado.`
                          : 'El ganador de cada llave avanza solo al cargar el resultado.' };
    }

    // Cuántos equipos entran a playoffs según lo elegido por la organización. 'auto' ajusta
    // al tamaño más grande que entre con los equipos que hay (2 clasificados por grupo).
    const _PLAYOFF_SIZES = { r32:32, r16:16, quarterfinal:8, semifinal:4, final:2 };
    // Siempre devuelve una POTENCIA DE 2 (o 0): un bracket con 6 lugares no existe, y si se
    // devolvía 6 quedaban llaves con rótulos vacíos.
    function _playoffSize(t, groupsCount, teamsCount) {
        const pick = t.playoff_from || 'auto';
        if (pick === 'none') return 0;
        const pedido = (pick !== 'auto' && _PLAYOFF_SIZES[pick]) ? _PLAYOFF_SIZES[pick]
                                                                 : groupsCount * 2;
        const tope = Math.min(pedido, teamsCount);
        let size = 1; while (size * 2 <= tope) size *= 2;   // mayor potencia de 2 que entra
        return size >= 2 ? size : 0;
    }

    const _GROUP_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    // Ningún cruce de la primera llave debe ser entre dos clasificados del MISMO grupo
    // (ya se enfrentaron en la fase de grupos). La siembra por espejado sola no lo garantiza
    // con cualquier combinación de grupos y clasificados, así que se repara intercambiando
    // visitantes entre llaves hasta que no queden choques.
    function _evitarMismoGrupo(slots) {
        const gr = s => { const m = /Grupo ([A-Z])/.exec(s || ''); return m ? m[1] : null; };
        for (let pass = 0; pass < 6; pass++) {
            let limpio = true;
            for (let i = 0; i < slots.length; i += 2) {
                if (!gr(slots[i]) || gr(slots[i]) !== gr(slots[i + 1])) continue;
                limpio = false;
                for (let j = 0; j < slots.length; j += 2) {
                    if (j === i) continue;
                    // El intercambio tiene que arreglar esta llave sin romper la otra.
                    if (gr(slots[j + 1]) !== gr(slots[i]) && gr(slots[i + 1]) !== gr(slots[j])) {
                        const tmp = slots[i + 1]; slots[i + 1] = slots[j + 1]; slots[j + 1] = tmp;
                        break;
                    }
                }
            }
            if (limpio) break;
        }
        return slots;
    }

    // Bracket de playoffs SIN equipos todavía: cada posición lleva el rótulo de su origen
    // ("1º Grupo A"). Al cerrarse la fase de grupos se reemplazan por los clasificados reales.
    function _buildPlayoffs(t, groupsCount, teamsCount) {
        const size = _playoffSize(t, groupsCount, teamsCount);
        if (size < 2) return { rounds: [], size: 0, label: '' };
        // Orden de clasificación: todos los 1º, después todos los 2º, etc. Si el último
        // puesto entra sólo en parte (ej: 3 grupos y 4 clasificados), esos lugares van como
        // "Mejor 2º" y se comparan entre todos los grupos, igual que las copas de verdad.
        const labelFor = k => {
            if (groupsCount <= 1) return `${k + 1}º`;
            const pos = Math.floor(k / groupsCount) + 1;
            if (pos * groupsCount <= size) return `${pos}º Grupo ${_GROUP_LETTERS[k % groupsCount]}`;
            const j = k - (pos - 1) * groupsCount;              // orden dentro de los "mejores"
            return j === 0 ? `Mejor ${pos}º` : `${j + 1}º mejor ${pos}º`;
        };
        const order = _seedOrder(size);
        const slots = new Array(size).fill(null);
        for (let k = 0; k < size; k++) slots[order[k]] = labelFor(k);
        _evitarMismoGrupo(slots);

        const rounds = [];
        let cur = slots;
        let phaseSize = size;
        while (phaseSize >= 2) {
            const phase = _getPhase(phaseSize);
            const round = [];
            const next = [];
            for (let i = 0; i < cur.length; i += 2) {
                round.push({ _pos: i / 2, phase, round: 1,
                    home_team_id: null, away_team_id: null,
                    home_team_name: cur[i], away_team_name: cur[i + 1],
                    status: 'scheduled' });
                next.push(null);
            }
            rounds.push(round);
            cur = next;
            phaseSize = phaseSize / 2;
        }
        return { rounds, size, label: _PHASE_LABEL[_getPhase(size)] || 'playoffs' };
    }
    const _PHASE_LABEL = { r64:'32avos', r32:'16avos', r16:'octavos', quarterfinal:'cuartos', semifinal:'semifinales', final:'la final' };

    function _splitGroups(teams, perGroup) {
        const shuffled = [...teams].sort(() => Math.random() - 0.5);
        // Reparto parejo: en vez de dejar un grupo colgado con 1 equipo, se calcula cuántos
        // grupos entran y se distribuye de a uno (8 equipos de a 3 → 3+3+2, no 3+3+1+1).
        const n = shuffled.length;
        const count = Math.max(1, Math.round(n / perGroup));
        const groups = Array.from({ length: count }, () => []);
        shuffled.forEach((tm, i) => groups[i % count].push(tm));
        return groups.filter(g => g.length);
    }

    // Round-robin por el método del círculo: además de los cruces devuelve la FECHA
    // (matchday) de cada partido y marca si hay descanso (cantidad impar de equipos).
    function _roundRobin(teams, phase, groupLetter, doubleRound) {
        const list = [...teams];
        const hasBye = list.length % 2 === 1;
        if (hasBye) list.push(null);            // equipo fantasma = el rival descansa
        const n = list.length;
        const days = n - 1;
        const matches = [];
        const idx = list.map((_, i) => i);
        for (let d = 0; d < days; d++) {
            for (let i = 0; i < n / 2; i++) {
                const a = list[idx[i]], b = list[idx[n - 1 - i]];
                if (!a || !b) continue;         // ese cruce es el descanso
                // Alterna localía por fecha para que no juegue siempre de local el mismo.
                const [h, aw] = (d % 2 === 0) ? [a, b] : [b, a];
                matches.push({ phase, round: 1, matchday: d + 1, group_letter: groupLetter,
                    home_team_id: h.id, away_team_id: aw.id,
                    home_team_name: h.team_name, away_team_name: aw.team_name, status: 'scheduled' });
            }
            idx.splice(1, 0, idx.pop());        // rotar dejando fijo el primero
        }
        if (doubleRound) {
            matches.push(..._reverseMatches(matches, groupLetter, days));
        }
        return { matches, matchdays: doubleRound ? days * 2 : days, hasBye };
    }

    // Partidos de vuelta: invierte local/visitante, marca round 2 y sigue numerando las fechas.
    function _reverseMatches(matches, groupLetter, dayOffset) {
        const off = dayOffset || 0;
        return matches.map(m => ({ phase: m.phase, round: 2, matchday: (m.matchday || 0) + off,
            group_letter: groupLetter, home_team_id: m.away_team_id, away_team_id: m.home_team_id,
            home_team_name: m.away_team_name, away_team_name: m.home_team_name, status: 'scheduled' }));
    }

    const _PHASE_BY_SIZE = { 2:'final', 4:'semifinal', 8:'quarterfinal', 16:'r16', 32:'r32', 64:'r64' };
    function _getPhase(n) { return _PHASE_BY_SIZE[n] || (n > 64 ? 'r64' : 'final'); }

    // Bracket real de eliminación directa: completa hasta la potencia de 2, reparte los BYE
    // (los mejores sembrados pasan directo) y crea las rondas siguientes con cruces "a definir"
    // encadenados, para que el ganador avance solo.
    function _buildBracket(teams) {
        const shuffled = [...teams].sort(() => Math.random() - 0.5);
        let size = 2; while (size < shuffled.length) size *= 2;
        const byes = size - shuffled.length;

        // Siembra estándar: el 1 contra el último, el 2 contra el anteúltimo, etc.
        const slots = new Array(size).fill(null);
        const order = _seedOrder(size);
        shuffled.forEach((tm, i) => { slots[order[i]] = tm; });

        const rounds = [];
        let cur = slots;
        let phaseSize = size;
        while (phaseSize >= 2) {
            const phase = _getPhase(phaseSize);
            const round = [];
            const next = [];
            for (let i = 0; i < cur.length; i += 2) {
                const h = cur[i], a = cur[i + 1];
                // Si un lado está vacío el otro pasa sin jugar (BYE), pero igual se crea la
                // llave para que el bracket tenga todas sus posiciones visibles.
                round.push({ _pos: i / 2, phase, round: 1,
                    home_team_id: h ? h.id : null, away_team_id: a ? a.id : null,
                    home_team_name: h ? h.team_name : null,
                    away_team_name: a ? a.team_name : null,
                    status: 'scheduled' });
                next.push((h && !a) ? h : (a && !h) ? a : null);
            }
            rounds.push(round);
            cur = next;
            phaseSize = phaseSize / 2;
        }
        // Las llaves con un solo equipo (BYE) no son partidos: el equipo ya está sembrado en
        // la ronda siguiente, así que la primera ronda descarta esos cruces vacíos.
        rounds[0] = rounds[0].filter(m => m.home_team_id && m.away_team_id);
        return { rounds: rounds.filter(r => r.length), byes };
    }

    // Orden de siembra de un bracket (1 vs N, 2 vs N-1, ...) construido por espejado.
    function _seedOrder(size) {
        let arr = [0];
        while (arr.length < size) {
            const n = arr.length * 2;
            const out = [];
            for (const s of arr) { out.push(s); out.push(n - 1 - s); }
            arr = out;
        }
        return arr;
    }

    // Cuando ya se jugó TODA la fase de grupos, los rótulos ("1º Grupo A") de la primera
    // ronda de playoffs se reemplazan por los equipos que realmente clasificaron.
    // Es idempotente: si ya están puestos no hace nada.
    async function _maybeSeedPlayoffs(sb, tournamentId) {
        try {
            const { data: t } = await sb.from('tournaments').select('format').eq('id', tournamentId).single();
            if (!t || t.format !== 'groups') return;
            const { data: all } = await sb.from('tournament_matches').select('*').eq('tournament_id', tournamentId);
            if (!all || !all.length) return;
            const grupos = all.filter(m => m.phase === 'groups');
            if (!grupos.length) return;
            if (grupos.some(m => m.home_score === null || m.away_score === null)) return;  // todavía se juega

            // Llaves de playoffs que siguen con rótulo (sin equipo asignado)
            const pendientes = all.filter(m => m.phase !== 'groups' && (!m.home_team_id || !m.away_team_id));
            if (!pendientes.length) return;

            const { data: teams } = await sb.from('tournament_teams').select('*').eq('tournament_id', tournamentId).eq('status','approved');
            if (!teams || !teams.length) return;
            // Tabla por grupo: puntos, después diferencia de gol, después goles a favor.
            const porGrupo = {};
            for (const tm of teams) {
                const g = tm.group_letter || 'A';
                (porGrupo[g] = porGrupo[g] || []).push(tm);
            }
            Object.values(porGrupo).forEach(arr => arr.sort((a, b) =>
                (b.points||0) - (a.points||0) ||
                ((b.goals_for||0)-(b.goals_against||0)) - ((a.goals_for||0)-(a.goals_against||0)) ||
                (b.goals_for||0) - (a.goals_for||0)));

            const mejorQue = (a, b) =>
                (b.points||0) - (a.points||0) ||
                ((b.goals_for||0)-(b.goals_against||0)) - ((a.goals_for||0)-(a.goals_against||0)) ||
                (b.goals_for||0) - (a.goals_for||0);

            // Rótulos posibles:
            //   "1º Grupo A"      → el 1º de ese grupo
            //   "Mejor 2º" / "2º mejor 2º" → los mejores de ese puesto entre TODOS los grupos
            //   "3º"              → puesto global (torneo de un solo grupo)
            const resolver = (label) => {
                if (!label) return null;
                const s = label.trim();
                let m = /^(\d+)[ºo]\s+Grupo\s+([A-H])$/i.exec(s);
                if (m) return (porGrupo[m[2].toUpperCase()] || [])[parseInt(m[1]) - 1] || null;
                m = /^Mejor\s+(\d+)[ºo]$/i.exec(s) || /^(\d+)[ºo]\s+mejor\s+(\d+)[ºo]$/i.exec(s);
                if (m) {
                    const esSimple = /^Mejor/i.test(s);
                    const pos = parseInt(esSimple ? m[1] : m[2]);
                    const j   = esSimple ? 0 : parseInt(m[1]) - 1;
                    const candidatos = Object.values(porGrupo)
                        .map(arr => arr[pos - 1]).filter(Boolean).sort(mejorQue);
                    return candidatos[j] || null;
                }
                m = /^(\d+)[ºo]$/i.exec(s);
                if (m) return Object.values(porGrupo).flat().sort(mejorQue)[parseInt(m[1]) - 1] || null;
                return null;
            };

            let puestos = 0;
            for (const match of pendientes) {
                const upd = {};
                if (!match.home_team_id) {
                    const eq = resolver(match.home_team_name);
                    if (eq) { upd.home_team_id = eq.id; upd.home_team_name = eq.team_name; }
                }
                if (!match.away_team_id) {
                    const eq = resolver(match.away_team_name);
                    if (eq) { upd.away_team_id = eq.id; upd.away_team_name = eq.team_name; }
                }
                if (Object.keys(upd).length) {
                    await sb.from('tournament_matches').update(upd).eq('id', match.id);
                    puestos++;
                }
            }
            if (puestos) toast('Fase de grupos cerrada: se armaron los cruces de playoffs.', 'success');
        } catch(e) { console.warn('_maybeSeedPlayoffs:', e && e.message); }
    }

    // Al cerrarse una llave, el ganador ocupa su lugar en la ronda siguiente.
    async function _advanceWinner(sb, match, winnerId) {
        if (!match || !match.next_match_id || !winnerId) return;
        const name = winnerId === match.home_team_id ? match.home_team_name : match.away_team_name;
        const slot = match.next_slot === 'away' ? 'away' : 'home';
        const upd = {};
        upd[slot + '_team_id'] = winnerId;
        upd[slot + '_team_name'] = name;
        try { await sb.from('tournament_matches').update(upd).eq('id', match.next_match_id); } catch(e) {}
    }

    // ═══════════════════════════════════════════════════════════
    // INVITAR A CANCHERO (jugadores y equipos que la org cargó a mano)
    // La idea: que el que todavía no está en Canchero reciba un link lindo, se registre
    // con el MISMO email y se quede con todo lo que la organización ya le cargó.
    // ═══════════════════════════════════════════════════════════
    function _invitacionUrl(tipo, id) {
        const base = (location.origin && location.origin.startsWith('http'))
            ? location.origin : 'https://canchero-app.vercel.app';
        return `${base}/invitacion.html?${tipo === 'equipo' ? 'e' : 'p'}=${id}`;
    }

    // Abre el compartir con un mensaje ya escrito. WhatsApp/Telegram muestran la tarjeta
    // del link (Open Graph), así que llega con imagen y no sólo texto.
    async function _invitePlayer(playerId) {
        const sb = getSb();
        const { data: p } = await sb.from('tournament_players')
            .select('player_name,goals,assists,matches_played,user_email,tournament_teams(team_name),tournaments(name)')
            .eq('id', playerId).maybeSingle();
        if (!p) { toast('Jugador no encontrado.', 'error'); return; }
        if (p.user_email) { toast('Este jugador ya tiene cuenta en Canchero.', 'info'); return; }
        const equipo = p.tournament_teams?.team_name || '';
        const torneo = p.tournaments?.name || 'el torneo';
        const stats = [];
        if (p.goals) stats.push(`${p.goals} ${p.goals === 1 ? 'gol' : 'goles'}`);
        if (p.assists) stats.push(`${p.assists} ${p.assists === 1 ? 'asistencia' : 'asistencias'}`);
        const detalle = stats.length ? ` Ya tenés ${stats.join(' y ')} cargados.` : '';
        const texto = `${p.player_name}, te anotamos en ${torneo}${equipo ? ` con ${equipo}` : ''}.${detalle}\n\n`
            + `Creá tu cuenta gratis en Canchero y tus estadísticas quedan en tu perfil y suman al ranking general:`;
        _shareInvite(texto, _invitacionUrl('jugador', playerId), p.player_name);
    }

    async function _inviteTeam(teamId) {
        const sb = getSb();
        const { data: tm } = await sb.from('tournament_teams')
            .select('team_name,club_email,tournaments(name)').eq('id', teamId).maybeSingle();
        if (!tm) { toast('Equipo no encontrado.', 'error'); return; }
        const torneo = tm.tournaments?.name || 'el torneo';
        const texto = `${tm.team_name} está anotado en ${torneo}.\n\n`
            + `Creá la cuenta del equipo en Canchero (es gratis) y el plantel, los partidos y las estadísticas quedan atados a ustedes:`;
        _shareInvite(texto, _invitacionUrl('equipo', teamId), tm.team_name);
    }

    // Hoja de compartir: WhatsApp directo, compartir del sistema o copiar.
    function _shareInvite(texto, url, quien) {
        const full = texto + '\n' + url;
        const ex = document.getElementById('ctinv-modal'); if (ex) ex.remove();
        const modal = document.createElement('div');
        modal.id = 'ctinv-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:100012;background:rgba(0,0,0,0.92);backdrop-filter:blur(6px);overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:20px;';
        const btn = 'width:100%;margin-bottom:8px;border-radius:14px;padding:13px;font-weight:800;font-size:13.5px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;';
        modal.innerHTML = `
        <div style="background:rgba(255,255,255,0.045);border:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(16px);border-radius:20px;width:100%;max-width:400px;padding:20px;margin-top:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <h3 style="font-family:Outfit,sans-serif;font-weight:900;font-size:15px;"><i class='bx bx-user-plus' style="color:var(--accent);"></i> Invitar a Canchero</h3>
                <button onclick="document.getElementById('ctinv-modal').remove()" style="background:none;border:none;color:#888;font-size:22px;cursor:pointer;">&times;</button>
            </div>
            <div style="font-size:11.5px;color:#888;line-height:1.5;margin-bottom:14px;">Le llega una tarjeta con sus datos del torneo y un botón para crear la cuenta. Si se registra con el mismo email, todo lo que cargaste se le pasa solo.</div>
            <div style="background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:11px 12px;font-size:11.5px;color:#b9c0b9;line-height:1.55;white-space:pre-wrap;margin-bottom:14px;max-height:150px;overflow:auto;">${_esc(full)}</div>
            <button onclick="CancheroTournaments._inviteVia('wa')" style="${btn}background:#25D366;color:#000;border:none;"><i class='bx bxl-whatsapp' style="font-size:18px;"></i> Enviar por WhatsApp</button>
            <button onclick="CancheroTournaments._inviteVia('share')" style="${btn}background:rgba(186,255,0,0.12);color:var(--accent);border:1px solid rgba(186,255,0,0.28);"><i class='bx bx-share-alt'></i> Compartir por otra app</button>
            <button onclick="CancheroTournaments._inviteVia('copy')" style="${btn}background:rgba(255,255,255,0.05);color:#ccc;border:1px solid rgba(255,255,255,0.12);"><i class='bx bx-copy'></i> Copiar mensaje</button>
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
        window.__ctInvite = { texto, url, full, quien };
    }

    function _inviteVia(via) {
        const inv = window.__ctInvite; if (!inv) return;
        if (via === 'wa') {
            window.open('https://wa.me/?text=' + encodeURIComponent(inv.full), '_blank');
        } else if (via === 'share' && navigator.share) {
            navigator.share({ title: 'Sumate a Canchero', text: inv.texto, url: inv.url }).catch(()=>{});
        } else {
            try { navigator.clipboard.writeText(inv.full); toast('Mensaje copiado.', 'success'); }
            catch(e) { prompt('Copiá la invitación:', inv.full); }
            return;
        }
        document.getElementById('ctinv-modal')?.remove();
    }

    // ═══════════════════════════════════════════════════════════
    // TRASPASO AUTOMÁTICO DE DATOS AL REGISTRARSE
    // El organizador carga a un jugador con su email. Cuando esa persona entra a Canchero
    // con ESE email, sus filas de tournament_players se atan a su cuenta y las estadísticas
    // se suman a users.stats, que es lo que lee el ranking general de Buscar.
    // ═══════════════════════════════════════════════════════════
    async function claimPendingPlayerData(email) {
        try {
            const sb = getSb();
            const em = (email || '').toLowerCase().trim();
            if (!sb || !em) return { claimed: 0 };
            // Filas cargadas a mano con ese email y todavía sin cuenta asociada
            const { data: filas } = await sb.from('tournament_players')
                .select('*').ilike('player_email', em).is('user_email', null);
            if (!filas || !filas.length) return { claimed: 0 };

            let g = 0, a = 0, am = 0, ro = 0, pj = 0;
            for (const f of filas) {
                const upd = { user_email: em };
                // stats_claimed evita volver a sumar lo mismo si el usuario re-entra.
                if (!f.stats_claimed) {
                    g += f.goals || 0; a += f.assists || 0;
                    am += f.yellow_cards || 0; ro += f.red_cards || 0;
                    pj += f.matches_played || 0;
                    upd.stats_claimed = true;
                }
                let { error } = await sb.from('tournament_players').update(upd).eq('id', f.id);
                if (error) { // la base puede no tener stats_claimed todavía
                    await sb.from('tournament_players').update({ user_email: em }).eq('id', f.id);
                }
            }
            if (g || a || am || ro || pj) {
                await _bumpUserStats(em, { goals:g, assists:a, yellow_cards:am, red_cards:ro, matches:pj });
            }
            const torneos = new Set(filas.map(f => f.tournament_id)).size;
            toast(`Se te asignaron tus datos de ${torneos} torneo${torneos===1?'':'s'}: ${g} goles y ${a} asistencias ya suman en tu ranking.`, 'success');
            return { claimed: filas.length, goals: g, assists: a };
        } catch(e) { console.warn('claimPendingPlayerData:', e && e.message); return { claimed: 0 }; }
    }

    // Suma (o resta) al acumulado del perfil, que es lo que rankea Buscar → Ranking.
    async function _bumpUserStats(email, delta) {
        try {
            const sb = getSb();
            const em = (email || '').toLowerCase().trim(); if (!em) return;
            const { data: u } = await sb.from('users').select('stats').eq('email', em).maybeSingle();
            if (!u) return;                      // todavía no existe la cuenta: se suma al reclamar
            const s = (u.stats && typeof u.stats === 'object') ? { ...u.stats } : {};
            const add = (k, v) => { if (v) s[k] = Math.max(0, (parseInt(s[k]) || 0) + v); };
            add('goals', delta.goals); add('assists', delta.assists);
            add('yellow_cards', delta.yellow_cards); add('red_cards', delta.red_cards);
            add('matches', delta.matches);
            await sb.from('users').update({ stats: s }).eq('email', em);
        } catch(e) { console.warn('_bumpUserStats:', e && e.message); }
    }

    // ── Agregar un partido suelto al fixture (fuera de lo que generó el motor)
    async function _openAddMatch(tournamentId) {
        const sb = getSb();
        const { data: teams } = await sb.from('tournament_teams').select('id,team_name,group_letter').eq('tournament_id', tournamentId).eq('status','approved').order('team_name');
        if (!teams || teams.length < 2) { toast('Necesitás al menos 2 equipos aprobados.', 'warning'); return; }
        const opts = (teams||[]).map(x => `<option value="${x.id}">${_esc(x.team_name)}</option>`).join('');
        const ex = document.getElementById('ctam-modal'); if (ex) ex.remove();
        const modal = document.createElement('div');
        modal.id = 'ctam-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:100011;background:rgba(0,0,0,0.92);backdrop-filter:blur(6px);overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:20px;';
        const sty = 'width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;box-sizing:border-box;';
        const lbl = 'font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:4px;';
        modal.innerHTML = `
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(14px);border-radius:18px;width:100%;max-width:400px;padding:20px;margin-top:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                <h3 style="font-family:Outfit,sans-serif;font-weight:900;font-size:15px;"><i class='bx bx-plus' style="color:var(--accent);"></i> Agregar partido</h3>
                <button onclick="document.getElementById('ctam-modal').remove()" style="background:none;border:none;color:#888;font-size:22px;cursor:pointer;">&times;</button>
            </div>
            <label style="${lbl}">LOCAL</label>
            <select id="ctam-home" style="${sty}margin-bottom:12px;">${opts}</select>
            <label style="${lbl}">VISITANTE</label>
            <select id="ctam-away" style="${sty}margin-bottom:12px;">${opts}</select>
            <label style="${lbl}">INSTANCIA</label>
            <select id="ctam-phase" style="${sty}margin-bottom:12px;">
                <option value="groups">Fase de grupos / liga</option>
                <option value="r32">16avos de final</option>
                <option value="r16">Octavos de final</option>
                <option value="quarterfinal">Cuartos de final</option>
                <option value="semifinal">Semifinales</option>
                <option value="third_place">3er y 4to puesto</option>
                <option value="final">Final</option>
            </select>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
                <div><label style="${lbl}">FECHA Nº</label><input id="ctam-day" type="number" min="1" placeholder="Ej: 3" style="${sty}"></div>
                <div><label style="${lbl}">DÍA Y HORA</label><input id="ctam-when" type="datetime-local" style="${sty}"></div>
            </div>
            <label style="${lbl}">CANCHA</label>
            <input id="ctam-venue" type="text" placeholder="Cancha 2" style="${sty}margin-bottom:14px;">
            <button onclick="CancheroTournaments._saveAddMatch('${tournamentId}')" style="width:100%;background:var(--accent);color:#000;border:none;border-radius:12px;padding:12px;font-weight:900;font-size:14px;cursor:pointer;">Agregar al fixture</button>
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
        // Por comodidad, el visitante arranca en el segundo equipo y no repetido con el local.
        const away = document.getElementById('ctam-away');
        if (away && teams[1]) away.value = teams[1].id;
    }
    async function _saveAddMatch(tournamentId) {
        const sb = getSb();
        const hId = document.getElementById('ctam-home')?.value;
        const aId = document.getElementById('ctam-away')?.value;
        if (!hId || !aId) { toast('Elegí los dos equipos.', 'warning'); return; }
        if (hId === aId) { toast('Un equipo no puede jugar contra sí mismo.', 'warning'); return; }
        const { data: teams } = await sb.from('tournament_teams').select('id,team_name,group_letter').eq('tournament_id', tournamentId);
        const of = id => (teams||[]).find(x => x.id === id);
        const h = of(hId), a = of(aId);
        const phase = document.getElementById('ctam-phase')?.value || 'groups';
        const when = document.getElementById('ctam-when')?.value;
        const row = {
            tournament_id: tournamentId, phase, round: 1,
            group_letter: phase === 'groups' ? (h?.group_letter || null) : null,
            matchday: parseInt(document.getElementById('ctam-day')?.value) || null,
            home_team_id: hId, away_team_id: aId,
            home_team_name: h?.team_name, away_team_name: a?.team_name,
            scheduled_at: when ? new Date(when).toISOString() : null,
            venue: (document.getElementById('ctam-venue')?.value || '').trim() || null,
            status: 'scheduled'
        };
        const ok = await _insertMatches(sb, [row]);
        if (!ok) return;
        document.getElementById('ctam-modal')?.remove();
        toast('Partido agregado.', 'success');
        const { data: t } = await sb.from('tournaments').select('organizer_email').eq('id', tournamentId).single();
        _ctmFixture(tournamentId, t?.organizer_email);
    }

    // ── Editar un cruce a mano (cambiar los equipos de un partido ya generado)
    async function _openEditMatchTeams(matchId, tournamentId) {
        const sb = getSb();
        const { data: m } = await sb.from('tournament_matches').select('*').eq('id', matchId).single();
        if (!m) { toast('Partido no encontrado.', 'error'); return; }
        const { data: teams } = await sb.from('tournament_teams').select('id,team_name').eq('tournament_id', tournamentId).eq('status','approved').order('team_name');
        const opts = (sel) => `<option value="">— A definir —</option>` + (teams||[]).map(x => `<option value="${x.id}" ${x.id===sel?'selected':''}>${_esc(x.team_name)}</option>`).join('');
        const ex = document.getElementById('ctmt-modal'); if (ex) ex.remove();
        const modal = document.createElement('div');
        modal.id = 'ctmt-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:100011;background:rgba(0,0,0,0.92);backdrop-filter:blur(6px);overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:20px;';
        const sty = 'width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;box-sizing:border-box;';
        modal.innerHTML = `
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(14px);border-radius:18px;width:100%;max-width:400px;padding:20px;margin-top:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                <h3 style="font-family:Outfit,sans-serif;font-weight:900;font-size:15px;">Editar cruce</h3>
                <button onclick="document.getElementById('ctmt-modal').remove()" style="background:none;border:none;color:#888;font-size:22px;cursor:pointer;">&times;</button>
            </div>
            <label style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:4px;">LOCAL</label>
            <select id="ctmt-home" style="${sty}margin-bottom:12px;">${opts(m.home_team_id)}</select>
            <label style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:4px;">VISITANTE</label>
            <select id="ctmt-away" style="${sty}margin-bottom:14px;">${opts(m.away_team_id)}</select>
            ${m.home_score !== null ? `<div style="font-size:11px;color:#ff9b9b;margin-bottom:12px;line-height:1.5;"><i class='bx bx-error'></i> Este partido ya tiene resultado. Cambiar los equipos no recalcula la tabla: borrá el resultado antes.</div>` : ''}
            <button onclick="CancheroTournaments._saveMatchTeams('${matchId}','${tournamentId}')" style="width:100%;background:var(--accent);color:#000;border:none;border-radius:12px;padding:12px;font-weight:900;font-size:14px;cursor:pointer;">Guardar cruce</button>
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    }
    async function _saveMatchTeams(matchId, tournamentId) {
        const sb = getSb();
        const hId = document.getElementById('ctmt-home')?.value || null;
        const aId = document.getElementById('ctmt-away')?.value || null;
        if (hId && aId && hId === aId) { toast('Un equipo no puede jugar contra sí mismo.', 'warning'); return; }
        const { data: teams } = await sb.from('tournament_teams').select('id,team_name').eq('tournament_id', tournamentId);
        const nameOf = id => (teams||[]).find(x => x.id === id)?.team_name || null;
        const { error } = await sb.from('tournament_matches').update({
            home_team_id: hId || null, away_team_id: aId || null,
            home_team_name: nameOf(hId), away_team_name: nameOf(aId)
        }).eq('id', matchId);
        if (error) { toast('Error: ' + error.message, 'error'); return; }
        document.getElementById('ctmt-modal')?.remove();
        toast('Cruce actualizado.', 'success');
        const { data: t } = await sb.from('tournaments').select('organizer_email').eq('id', tournamentId).single();
        _ctmFixture(tournamentId, t?.organizer_email);
    }

    // ═══════════════════════════════════════════════════════════
    // FIXTURE TAB
    // ═══════════════════════════════════════════════════════════
    async function _ctmFixture(tournamentId, organizerEmail) {
        const sb = getSb();
        const { data: matches } = await sb.from('tournament_matches').select('*').eq('tournament_id', tournamentId).order('phase').order('round').order('group_letter');
        const container = document.getElementById('ctm-content');
        if (!container) return;
        const isOrg = _isOrgActive(organizerEmail);
        const regenBtn = isOrg ? `<div style="display:flex;gap:8px;margin-bottom:14px;">
            <button onclick="CancheroTournaments._generateFixture('${tournamentId}')" style="flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);color:#ddd;border-radius:12px;padding:11px;font-weight:800;font-size:13px;cursor:pointer;"><i class='bx bx-refresh'></i> Regenerar</button>
            <button onclick="CancheroTournaments._openAddMatch('${tournamentId}')" style="flex:1;background:rgba(186,255,0,0.1);border:1px solid rgba(186,255,0,0.25);color:var(--accent);border-radius:12px;padding:11px;font-weight:800;font-size:13px;cursor:pointer;"><i class='bx bx-plus'></i> Agregar partido</button>
        </div>` : '';
        if (!matches || !matches.length) {
            container.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#555;">No hay fixture generado aún.<br><span style="font-size:11px;">Primero aprobá los equipos y luego generá el fixture.</span></div>'
                + (isOrg ? `<div style="display:flex;gap:8px;">
                    <button onclick="CancheroTournaments._generateFixture('${tournamentId}')" style="flex:1;background:var(--accent);color:#000;border:none;border-radius:12px;padding:12px;font-weight:900;font-size:13px;cursor:pointer;"><i class='bx bx-shuffle'></i> Generar fixture</button>
                    <button onclick="CancheroTournaments._openAddMatch('${tournamentId}')" style="flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);color:#ddd;border-radius:12px;padding:12px;font-weight:800;font-size:13px;cursor:pointer;"><i class='bx bx-plus'></i> Agregar partido</button>
                </div>` : '');
            return;
        }
        // Equipos del torneo: hacen falta para saber quién descansa en cada fecha.
        let allTeamNames = [];
        try {
            const { data: ats } = await sb.from('tournament_teams').select('id,team_name,group_letter').eq('tournament_id', tournamentId).eq('status','approved');
            allTeamNames = ats || [];
        } catch(e){}
        // Escudos por equipo (para pintarlos junto a los nombres)
        let logoById = {};
        try {
            const { data: tms } = await sb.from('tournament_teams').select('id,logo_url,club_email').eq('tournament_id', tournamentId);
            try { await _healTeamLogos(tms, isOrg); } catch(e){}
            (tms||[]).forEach(x => { if (x.logo_url) logoById[x.id] = x.logo_url; });
        } catch(e){}
        // Agrupar por fase y grupo
        const grouped = {};
        for (const m of matches) {
            const key = m.phase + (m.group_letter ? '_' + m.group_letter : '');
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(m);
        }
        const phaseLabels = { groups:'Fase de Grupos', league:'Liga', r64:'32avos de Final', r32:'16avos de Final', r16:'Octavos de Final', quarterfinal:'Cuartos de Final', semifinal:'Semifinales', final:'Final', third_place:'3er y 4to Puesto' };
        // Las fases van en orden de torneo, no alfabético (si no la Final salía primera).
        const phaseOrder = { groups:0, league:0, r64:1, r32:2, r16:3, quarterfinal:4, semifinal:5, third_place:6, final:7 };
        const ordenadas = Object.entries(grouped).sort((a, b) => {
            const pa = phaseOrder[a[1][0].phase] ?? 9, pb = phaseOrder[b[1][0].phase] ?? 9;
            return pa - pb || String(a[1][0].group_letter||'').localeCompare(String(b[1][0].group_letter||''));
        });
        container.innerHTML = regenBtn + ordenadas.map(([key, groupMatches]) => {
            const phase = groupMatches[0].phase;
            const gl = groupMatches[0].group_letter;
            const title = `${phaseLabels[phase]||phase}${gl && phase === 'groups' ? ` — Grupo ${gl}` : ''}`;
            // Si el fixture trae fechas (matchday), se separan por fecha y se muestra quién
            // descansa. Sin la migración corrida no hay matchday y se lista plano como antes.
            const byDay = {};
            let tieneFechas = false;
            for (const m of groupMatches) {
                const d = m.matchday || 0;
                if (d) tieneFechas = true;
                (byDay[d] = byDay[d] || []).push(m);
            }
            let cuerpo;
            if (tieneFechas) {
                // Equipos de este grupo, para deducir el que descansa en cada fecha.
                const delGrupo = allTeamNames.filter(x => !gl || x.group_letter === gl);
                cuerpo = Object.keys(byDay).sort((a,b) => a-b).map(d => {
                    const dayMatches = byDay[d];
                    const jugando = new Set();
                    dayMatches.forEach(m => { jugando.add(m.home_team_id); jugando.add(m.away_team_id); });
                    const libres = delGrupo.filter(x => !jugando.has(x.id)).map(x => x.team_name);
                    return `<div style="font-size:10px;font-weight:900;color:var(--accent);letter-spacing:1px;margin:10px 0 6px;">FECHA ${d}</div>
                        ${dayMatches.map(m => _renderMatchRow(m, isOrg, tournamentId, logoById)).join('')}
                        ${libres.length ? `<div style="font-size:10px;color:#666;padding:6px 12px;background:rgba(255,255,255,0.02);border-radius:8px;margin-bottom:6px;"><i class='bx bx-coffee'></i> Descansa: ${libres.map(_esc).join(', ')}</div>` : ''}`;
                }).join('');
            } else {
                cuerpo = groupMatches.map(m => _renderMatchRow(m, isOrg, tournamentId, logoById)).join('');
            }
            return `<div style="margin-bottom:16px;">
                <div style="font-size:11px;font-weight:900;color:#555;letter-spacing:1px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #1a1a1a;">${title.toUpperCase()}</div>
                ${cuerpo}
            </div>`;
        }).join('');
    }

    function _renderMatchRow(m, isOrg, tournamentId, logoById) {
        logoById = logoById || {};
        const hasResult = m.home_score !== null && m.away_score !== null;
        const isLive = m.status === 'live';
        const dateStr = m.scheduled_at ? new Date(m.scheduled_at).toLocaleDateString('es-UY', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : 'Por confirmar';
        const hLogo = logoById[m.home_team_id], aLogo = logoById[m.away_team_id];
        // Bracket: hasta que se define el cruce, el lugar muestra su origen ("1º Grupo A")
        // o "A definir", en gris y cursiva para que se distinga de un equipo real.
        const slot = (name, id) => id ? _esc(name)
            : `<span style="color:#666;font-style:italic;">${name ? _esc(name) : 'A definir'}</span>`;
        const hName = slot(m.home_team_name, m.home_team_id);
        const aName = slot(m.away_team_name, m.away_team_id);
        const editBtn = isOrg ? `<button onclick="event.stopPropagation();CancheroTournaments._openEditMatchTeams('${m.id}','${tournamentId}')" title="Editar cruce" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#888;border-radius:8px;padding:4px 7px;font-size:13px;cursor:pointer;flex-shrink:0;"><i class='bx bx-edit-alt'></i></button>` : '';
        // Toda la fila abre la ficha del partido (org o invitado).
        return `<div onclick="CancheroTournaments._openMatchDetail('${m.id}')" style="background:#111;border:1px solid ${isLive?'rgba(0,230,118,0.4)':'#1e1e1e'};border-radius:12px;padding:12px 14px;margin-bottom:6px;cursor:pointer;transition:.15s;" onmouseover="this.style.borderColor='rgba(186,255,0,0.3)'" onmouseout="this.style.borderColor='${isLive?'rgba(0,230,118,0.4)':'#1e1e1e'}'">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <div style="flex:1;min-width:0;display:flex;align-items:center;justify-content:flex-end;gap:6px;font-weight:700;font-size:13px;"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${hName}</span>${_shieldHTML(hLogo, m.home_team_name || '?', 30)}</div>
                <div style="flex-shrink:0;text-align:center;min-width:80px;">
                    ${hasResult
                        ? `<div style="font-size:18px;font-weight:900;color:var(--accent);">${m.home_score} — ${m.away_score}</div>`
                        : (isLive ? `<div style="font-size:11px;font-weight:900;color:#00e676;"><i class='bx bxs-circle' style="font-size:7px;"></i> EN VIVO</div>` : `<div style="font-size:10px;color:#555;font-weight:700;">VS</div>`)}
                    <div style="font-size:9px;color:#444;margin-top:2px;">${dateStr}${m.venue?" · "+_esc(m.venue):''}</div>
                </div>
                <div style="flex:1;min-width:0;display:flex;align-items:center;justify-content:flex-start;gap:6px;font-weight:700;font-size:13px;">${_shieldHTML(aLogo, m.away_team_name || '?', 30)}<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${aName}</span></div>
                ${editBtn}
                <i class='bx bx-chevron-right' style="color:#444;font-size:18px;flex-shrink:0;"></i>
            </div>
            ${hasResult && (m.events&&m.events.length) ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #1a1a1a;display:flex;flex-wrap:wrap;gap:6px;justify-content:center;">
                ${m.events.map(ev => `<span style="font-size:10px;color:#888;background:rgba(255,255,255,0.04);border-radius:6px;padding:2px 7px;">${_evIcon(ev.type)} ${_esc(ev.player_name||'')}</span>`).join('')}
            </div>` : ''}
        </div>`;
    }

    // Iconos de evento (sin emojis — regla de diseño). gol/asistencia/amarilla/roja.
    function _evIcon(type) {
        if (type === 'gol') return "<i class='bx bx-football'></i>";
        if (type === 'asistencia') return "<i class='bx bx-run'></i>";
        if (type === 'amarilla') return "<span style=\"display:inline-block;width:7px;height:10px;background:#ffcc00;border-radius:1px;vertical-align:-1px;\"></span>";
        if (type === 'roja') return "<span style=\"display:inline-block;width:7px;height:10px;background:#ff3b30;border-radius:1px;vertical-align:-1px;\"></span>";
        return '';
    }
    const _EV_COL = { gol:'goals', asistencia:'assists', amarilla:'yellow_cards', roja:'red_cards' };
    function _evName(type) { return ({ gol:'Gol', asistencia:'Asistencia', amarilla:'Amarilla', roja:'Roja' })[type] || 'Evento'; }

    // Ajusta las estadísticas de un equipo por un resultado. sign=+1 aplica, -1 revierte.
    async function _applyTeamResult(teamId, gf, ga, sign) {
        const sb = getSb();
        const { data: team } = await sb.from('tournament_teams').select('*').eq('id', teamId).single();
        if (!team) return;
        const won = gf > ga, drew = gf === ga;
        await sb.from('tournament_teams').update({
            wins:         Math.max(0,(team.wins||0)   + sign*(won?1:0)),
            draws:        Math.max(0,(team.draws||0)  + sign*(drew?1:0)),
            losses:       Math.max(0,(team.losses||0) + sign*(!won&&!drew?1:0)),
            points:       Math.max(0,(team.points||0) + sign*(won?3:drew?1:0)),
            goals_for:    Math.max(0,(team.goals_for||0)     + sign*gf),
            goals_against:Math.max(0,(team.goals_against||0) + sign*ga)
        }).eq('id', teamId);
    }

    // Aplica/revierte los eventos de gol/asistencia/tarjeta sobre las estadísticas del jugador.
    async function _applyEvents(events, sign) {
        const sb = getSb();
        // Agrupar por jugador+columna para minimizar updates
        const delta = {}; // { playerId: { goals:n, assists:n, ... } }
        (events||[]).forEach(ev => {
            const col = _EV_COL[ev.type]; if (!col || !ev.player_id) return;
            delta[ev.player_id] = delta[ev.player_id] || {};
            delta[ev.player_id][col] = (delta[ev.player_id][col] || 0) + sign;
        });
        for (const pid of Object.keys(delta)) {
            const { data: p } = await sb.from('tournament_players').select('*').eq('id', pid).single();
            if (!p) continue;
            const upd = {};
            for (const col of Object.keys(delta[pid])) upd[col] = Math.max(0, (p[col]||0) + delta[pid][col]);
            try { await sb.from('tournament_players').update(upd).eq('id', pid); } catch(e) { /* columna faltante → ignorar */ }
            // Si el jugador ya tiene cuenta, lo del torneo también suma al ranking general.
            // Si todavía no la tiene, queda en la fila y se le pasa al registrarse (claim).
            if (p.user_email) {
                await _bumpUserStats(p.user_email, {
                    goals: delta[pid].goals || 0,
                    assists: delta[pid].assists || 0,
                    yellow_cards: delta[pid].yellow_cards || 0,
                    red_cards: delta[pid].red_cards || 0
                });
            }
        }
    }

    // Modal de carga de resultado: marcador + goleadores/asistencias/tarjetas por jugador.
    async function _openMatchLoad(matchId, tournamentId) {
        const sb = getSb();
        const { data: m } = await sb.from('tournament_matches').select('*').eq('id', matchId).single();
        if (!m) { toast('Partido no encontrado.', 'error'); return; }
        // Roster con FOTO y POSICIÓN (avatar_url/position) para el selector visual por equipo.
        const { data: roster } = await sb.from('tournament_players').select('id,player_name,team_id,number,avatar_url,position')
            .in('team_id', [m.home_team_id, m.away_team_id].filter(Boolean)).order('number');
        // Logos de los equipos para el encabezado del marcador.
        const { data: _tteams } = await sb.from('tournament_teams').select('id,team_name,logo_url')
            .in('id', [m.home_team_id, m.away_team_id].filter(Boolean));
        const _homeT = (_tteams||[]).find(x => x.id === m.home_team_id) || { team_name: m.home_team_name };
        const _awayT = (_tteams||[]).find(x => x.id === m.away_team_id) || { team_name: m.away_team_name };
        // Canchas sugeridas: la sede del torneo + complejos registrados en Canchero
        let venueOpts = [];
        try {
            const { data: tt } = await sb.from('tournaments').select('venue').eq('id', m.tournament_id).single();
            if (tt && tt.venue) venueOpts.push(tt.venue);
        } catch(e){}
        try {
            const { data: cx } = await sb.from('users').select('name,city').in('role',['complejo','club']).limit(100);
            (cx||[]).forEach(c => { if (c.name) venueOpts.push(c.name + (c.city ? ' · ' + c.city : '')); });
        } catch(e){}
        venueOpts = [...new Set(venueOpts)];
        window.__cmeEvents = Array.isArray(m.events) ? JSON.parse(JSON.stringify(m.events)) : [];
        window.__cmeRoster = roster || [];
        window.__cmeMatch = { home_team_id: m.home_team_id, away_team_id: m.away_team_id, home_team_name: _homeT.team_name || m.home_team_name, away_team_name: _awayT.team_name || m.away_team_name };
        window.__cmeType = 'gol';
        // Fecha AUTOMÁTICA: si el partido no tiene fecha, se propone la de ahora (redondeada).
        const _whenVal = m.scheduled_at ? _toLocalInput(m.scheduled_at) : _toLocalInput(new Date().toISOString());
        const ex = document.getElementById('cme-modal'); if (ex) ex.remove();
        const modal = document.createElement('div');
        modal.id = 'cme-modal';
        // z-index MAYOR que la ficha del partido (cmd-modal=100004): si no, el modal de
        // carga quedaba DETRÁS y "aparecía recién al tocar Volver".
        modal.style.cssText = 'position:fixed;inset:0;z-index:100006;background:rgba(0,0,0,0.92);backdrop-filter:blur(6px);overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:20px;';
        const hasRoster = (roster||[]).length > 0;
        // Columna de jugadores de un equipo: chips tappeables con FOTO + número + posición.
        const _teamCol = (tid, teamObj) => {
            const ps = (roster||[]).filter(p => p.team_id === tid);
            return `<div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:6px;justify-content:center;margin-bottom:8px;">
                    ${_shieldHTML(teamObj.logo_url, teamObj.team_name, 26)}
                    <span style="font-size:10px;font-weight:900;color:#aaa;letter-spacing:.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px;">${_esc(teamObj.team_name||'')}</span>
                </div>
                ${ps.length ? ps.map(p => `<div onclick="CancheroTournaments._cmeAddPlayer('${p.id}')" style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:6px 8px;margin-bottom:5px;cursor:pointer;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.07)'">
                    <span style="width:28px;height:28px;border-radius:50%;flex-shrink:0;background:${p.avatar_url?`#222 center/cover url('${_esc(p.avatar_url)}')`:'rgba(186,255,0,0.1)'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:var(--accent);">${p.avatar_url?'':(p.number||'—')}</span>
                    <span style="flex:1;min-width:0;line-height:1.15;"><span style="display:block;font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_esc(p.player_name)}</span>${p.position?`<span style="font-size:9px;color:#666;">${_esc(p.position)}</span>`:''}</span>
                </div>`).join('') : '<div style="text-align:center;color:#444;font-size:10px;padding:10px 4px;">Sin jugadores</div>'}
            </div>`;
        };
        const typeBtn = (val, label, active) => `<button type="button" data-cme-type="${val}" onclick="CancheroTournaments._cmeSetType('${val}',this)" style="flex:1;background:${active?'var(--accent)':'rgba(255,255,255,0.04)'};color:${active?'#000':'#aaa'};border:1px solid ${active?'var(--accent)':'rgba(255,255,255,0.08)'};border-radius:10px;padding:8px 4px;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap;">${label}</button>`;
        modal.innerHTML = `
        <div style="background:#0d0d0d;border:1px solid #222;border-radius:18px;width:100%;max-width:480px;padding:20px;margin-top:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3 style="font-family:Outfit,sans-serif;font-weight:900;font-size:16px;">${(m.home_score!=null&&m.away_score!=null)?'Editar resultado':'Cargar resultado'}</h3>
                <button onclick="document.getElementById('cme-modal').remove()" style="background:rgba(255,255,255,0.05);border:1px solid #222;color:#888;font-size:20px;line-height:1;cursor:pointer;border-radius:10px;width:32px;height:32px;">&times;</button>
            </div>
            <!-- Marcador con LOGOS. Se auto-suma desde los goles cargados; editable a mano. -->
            <div style="display:flex;align-items:center;justify-content:center;gap:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:16px 12px;margin-bottom:14px;">
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0;">
                    ${_shieldHTML(_homeT.logo_url, _homeT.team_name, 44)}
                    <span style="font-size:11px;font-weight:800;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">${_esc(_homeT.team_name||m.home_team_name||'')}</span>
                </div>
                <input id="cme-hs" type="number" min="0" max="40" value="${m.home_score??''}" style="width:48px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:8px 4px;font-size:20px;text-align:center;font-weight:900;">
                <span style="color:#555;font-weight:900;">—</span>
                <input id="cme-as" type="number" min="0" max="40" value="${m.away_score??''}" style="width:48px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:8px 4px;font-size:20px;text-align:center;font-weight:900;">
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0;">
                    ${_shieldHTML(_awayT.logo_url, _awayT.team_name, 44)}
                    <span style="font-size:11px;font-weight:800;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">${_esc(_awayT.team_name||m.away_team_name||'')}</span>
                </div>
            </div>
            <!-- Fecha/hora (automática), cancha y árbitro del partido -->
            <div style="font-size:10px;font-weight:900;color:#555;letter-spacing:1px;margin-bottom:6px;">DÍA, HORA Y CANCHA</div>
            <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">
                <input id="cme-when" type="datetime-local" value="${_whenVal}" style="flex:1;min-width:150px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:9px;font-size:12px;">
            </div>
            <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
                <input id="cme-venue" type="text" list="cme-venues" placeholder="Cancha / complejo (elegí o escribí)" value="${_esc(m.venue||'')}" style="flex:1;min-width:130px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:9px;font-size:12px;">
                <datalist id="cme-venues">${venueOpts.map(v => `<option value="${_esc(v)}"></option>`).join('')}</datalist>
                <input id="cme-ref" type="text" placeholder="Árbitro" value="${_esc(m.referee||'')}" style="flex:1;min-width:110px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:9px;font-size:12px;">
            </div>
            ${hasRoster ? `
            <div style="font-size:10px;font-weight:900;color:#555;letter-spacing:1px;margin-bottom:8px;">EVENTOS · tocá un jugador para sumar</div>
            <div style="display:flex;gap:6px;margin-bottom:10px;">
                ${typeBtn('gol','Gol',true)}${typeBtn('asistencia','Asist.',false)}${typeBtn('amarilla','Amarilla',false)}${typeBtn('roja','Roja',false)}${typeBtn('cambio','Cambio',false)}
                <input id="cme-min" type="number" min="1" max="130" placeholder="min" style="width:50px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:8px 4px;font-size:12px;text-align:center;">
            </div>
            <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;">
                ${_teamCol(m.home_team_id, _homeT)}
                <div style="width:1px;align-self:stretch;background:rgba(255,255,255,0.06);"></div>
                ${_teamCol(m.away_team_id, _awayT)}
            </div>
            <div style="font-size:10px;font-weight:900;color:#555;letter-spacing:1px;margin-bottom:6px;">CARGADOS</div>
            <div id="cme-list" style="display:flex;flex-direction:column;gap:4px;margin-bottom:16px;"></div>`
            : `<div style="font-size:11px;color:#888;background:#111;border:1px solid #1e1e1e;border-radius:10px;padding:12px;margin-bottom:10px;line-height:1.5;">Para registrar goleadores, asistencias y tarjetas hacen falta los jugadores del equipo. Podés cargarlos acá mismo:</div>
            <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
                <button onclick="CancheroTournaments._cmeCargarJugador('${m.home_team_id||''}','${matchId}','${(tournamentId||'').replace(/'/g,"\\'")}' )" style="flex:1;min-width:130px;background:rgba(186,255,0,0.08);color:var(--accent);border:1px solid rgba(186,255,0,0.25);border-radius:10px;padding:10px;font-weight:800;font-size:12px;cursor:pointer;"><i class='bx bx-user-plus'></i> ${_esc((_homeT.team_name||m.home_team_name||'Local')).slice(0,16)}</button>
                <button onclick="CancheroTournaments._cmeCargarJugador('${m.away_team_id||''}','${matchId}','${(tournamentId||'').replace(/'/g,"\\'")}' )" style="flex:1;min-width:130px;background:rgba(74,158,255,0.08);color:#4a9eff;border:1px solid rgba(74,158,255,0.25);border-radius:10px;padding:10px;font-weight:800;font-size:12px;cursor:pointer;"><i class='bx bx-user-plus'></i> ${_esc((_awayT.team_name||m.away_team_name||'Visitante')).slice(0,16)}</button>
            </div>
            <div style="font-size:10.5px;color:#555;margin-bottom:16px;line-height:1.5;">También podés cargarlos desde Equipos → Jugadores. Igual podés guardar solo el marcador.</div>`}
            <button onclick="CancheroTournaments._saveMatchLoad('${matchId}','${(tournamentId||'').replace(/'/g,"\\'")}' )" style="width:100%;background:linear-gradient(135deg,#baff00,#8fd400);color:#000;border:none;border-radius:12px;padding:13px;font-weight:900;font-size:14px;cursor:pointer;box-shadow:0 4px 16px rgba(186,255,0,0.25);">Guardar</button>
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
        _cmeRenderList();
    }

    // Auto-suma: el marcador refleja los goles cargados. NO pisa un marcador manual si
    // todavía no hay ningún gol cargado (así no borra un resultado escrito a mano).
    function _cmeSyncScore() {
        const m = window.__cmeMatch || {};
        const evs = window.__cmeEvents || [];
        if (!evs.some(e => e.type === 'gol')) return;
        const g = (tid) => evs.filter(e => e.type === 'gol' && e.team_id === tid).length;
        const hs = document.getElementById('cme-hs'), as = document.getElementById('cme-as');
        if (hs) hs.value = g(m.home_team_id);
        if (as) as.value = g(m.away_team_id);
    }
    function _cmeRenderList() {
        _cmeSyncScore();
        const el = document.getElementById('cme-list'); if (!el) return;
        const m = window.__cmeMatch || {};
        const evs = window.__cmeEvents || [];
        // Ordenar por minuto (los sin minuto al final) para que se lea como un timeline.
        // Se excluyen los eventos de CONTROL del cronómetro (inicio/pausa/½ tiempo/fin):
        // no son de un jugador y aparecían como filas vacías con una X para borrar.
        // Se conserva el índice REAL del array para que _cmeRemove siga siendo correcto.
        const order = evs.map((e,i)=>({e,i}))
            .filter(x => !_isCtrl(x.e.type))
            .sort((a,b)=>((a.e.minute==null?9999:a.e.minute)-(b.e.minute==null?9999:b.e.minute))||(a.i-b.i));
        el.innerHTML = order.length ? order.map(({e:ev,i}) => {
            const isHome = ev.team_id === m.home_team_id;
            const teamName = isHome ? (m.home_team_name||'Local') : (m.away_team_name||'Visitante');
            return `<div style="display:flex;align-items:center;gap:8px;background:#111;border:1px solid #1e1e1e;border-left:3px solid ${isHome?'var(--accent)':'#4a9eff'};border-radius:8px;padding:6px 10px;">
                <span style="font-size:12px;">${_evIcon(ev.type)}</span>
                ${ev.minute!=null?`<span style="font-size:10px;color:var(--accent);font-weight:900;min-width:26px;">${ev.minute}'</span>`:''}
                <span style="flex:1;min-width:0;line-height:1.2;"><span style="display:block;font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_esc(ev.player_name||'')}</span><span style="font-size:9px;color:#666;">${_esc(teamName)}</span></span>
                <button onclick="CancheroTournaments._cmeRemove(${i})" style="background:none;border:none;color:#ff4444;cursor:pointer;font-size:16px;line-height:1;">&times;</button>
            </div>`;
        }).join('') : '<div style="font-size:11px;color:#555;text-align:center;padding:4px;">Sin eventos cargados.</div>';
    }
    // Selector de tipo de evento (Gol/Asistencia/Amarilla/Roja) para el próximo jugador tappeado.
    function _cmeSetType(val, btn) {
        window.__cmeType = val;
        document.querySelectorAll('[data-cme-type]').forEach(b => {
            const on = b === btn;
            b.style.background = on ? 'var(--accent)' : 'rgba(255,255,255,0.04)';
            b.style.color = on ? '#000' : '#aaa';
            b.style.borderColor = on ? 'var(--accent)' : 'rgba(255,255,255,0.08)';
        });
    }
    // Tap en un jugador → agrega un evento del tipo activo para ese jugador (queda claro
    // a QUÉ equipo pertenece porque las columnas están divididas por equipo).
    function _cmeAddPlayer(pid) {
        const p = (window.__cmeRoster||[]).find(x => String(x.id) === String(pid));
        if (!p) return;
        const mnt = document.getElementById('cme-min');
        const min = mnt && mnt.value !== '' ? parseInt(mnt.value) : null;
        window.__cmeEvents = window.__cmeEvents || [];
        const _tipo = window.__cmeType || 'gol';
        window.__cmeEvents.push({ player_id: pid, player_name: p.player_name, team_id: p.team_id, type: _tipo, minute: (isNaN(min)?null:min) });
        if (mnt) mnt.value = '';
        _cmeRenderList();
        try { if (window.showToast) showToast(_evName(_tipo) + ': ' + p.player_name, 'success', 1200); } catch(e){}
        // Igual que en vivo: después de un GOL se sugiere la asistencia entre los
        // compañeros. Se puede omitir — un gol sin asistencia es válido.
        if (_tipo === 'gol') _cmeSugerirAsist(p);
    }

    // Sugerencia de asistencia dentro del EDITOR de resultado (sin cronómetro).
    function _cmeSugerirAsist(goleador) {
        const companeros = (window.__cmeRoster||[]).filter(x =>
            String(x.team_id) === String(goleador.team_id) && String(x.id) !== String(goleador.id));
        if (!companeros.length) return;
        const ex = document.getElementById('cmeasist-modal'); if (ex) ex.remove();
        const d = document.createElement('div');
        d.id = 'cmeasist-modal';
        d.style.cssText = 'position:fixed;inset:0;z-index:100012;background:rgba(0,0,0,0.93);overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:20px;';
        d.innerHTML = `
        <div style="background:#0d0d0d;border:1px solid #222;border-radius:18px;width:100%;max-width:400px;padding:20px;margin-top:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <h3 style="font-family:Outfit,sans-serif;font-weight:900;font-size:15px;">${_evIcon('asistencia')} ¿Quién asistió?</h3>
                <button onclick="document.getElementById('cmeasist-modal').remove()" style="background:none;border:none;color:#888;font-size:22px;cursor:pointer;">&times;</button>
            </div>
            <div style="font-size:11.5px;color:#888;margin-bottom:14px;">Gol de <b style="color:var(--accent);">${_esc(goleador.player_name||'')}</b>.</div>
            <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;">
                ${companeros.map(x => `<button onclick="CancheroTournaments._cmeAsist('${x.id}')" style="display:flex;align-items:center;gap:9px;width:100%;background:#141414;border:1px solid #222;border-radius:10px;padding:9px 11px;cursor:pointer;color:#fff;text-align:left;">
                    <span style="width:28px;height:28px;border-radius:50%;flex-shrink:0;${x.avatar_url?`background:#222 url('${_esc(x.avatar_url)}') center/cover;`:`background:rgba(186,255,0,0.12);`}display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:var(--accent);">${x.avatar_url?'':(x.number||'')}</span>
                    <span style="font-size:13px;font-weight:700;">${_esc(x.player_name)}</span>
                </button>`).join('')}
            </div>
            <button onclick="document.getElementById('cmeasist-modal').remove()" style="width:100%;background:rgba(255,255,255,0.05);color:#aaa;border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:12px;font-weight:800;font-size:13px;cursor:pointer;">Sin asistencia</button>
        </div>`;
        d.onclick = e => { if (e.target === d) d.remove(); };
        document.body.appendChild(d);
    }
    // Suma la asistencia elegida al mismo minuto que el gol recién cargado.
    function _cmeAsist(pid) {
        const p = (window.__cmeRoster||[]).find(x => String(x.id) === String(pid));
        document.getElementById('cmeasist-modal')?.remove();
        if (!p) return;
        const evs = window.__cmeEvents || [];
        const ultimoGol = [...evs].reverse().find(e => e.type === 'gol');
        evs.push({ player_id: p.id, player_name: p.player_name, team_id: p.team_id,
                   type: 'asistencia', minute: ultimoGol ? ultimoGol.minute : null });
        _cmeRenderList();
        try { if (window.showToast) showToast('Asistencia: ' + p.player_name, 'success', 1200); } catch(e){}
    }
    // Compat: el selector viejo por <select> (por si algún flujo aún lo llama).
    function _cmeAdd() {
        const psel = document.getElementById('cme-player'), tsel = document.getElementById('cme-type'), mnt = document.getElementById('cme-min');
        if (!psel || !psel.value) return;
        const p = (window.__cmeRoster||[]).find(x => String(x.id) === String(psel.value));
        const min = mnt && mnt.value !== '' ? parseInt(mnt.value) : null;
        window.__cmeEvents = window.__cmeEvents || [];
        window.__cmeEvents.push({ player_id: psel.value, player_name: p?p.player_name:'', team_id: p?p.team_id:null, type: (tsel?tsel.value:'gol'), minute: (isNaN(min)?null:min) });
        if (mnt) mnt.value = '';
        _cmeRenderList();
    }
    function _cmeRemove(i) { (window.__cmeEvents||[]).splice(i, 1); _cmeRenderList(); }

    // Cargar un jugador SIN salir del editor de resultado: si el equipo no tiene plantel
    // no se podían registrar goleadores y había que irse a Equipos → Jugadores.
    // Al terminar se reabre el editor, ya con el selector de eventos disponible.
    function _cmeCargarJugador(teamId, matchId, tournamentId) {
        if (!teamId) { toast('Ese equipo todavía no está vinculado al partido.', 'warning'); return; }
        window.__cmeVolverA = { matchId, tournamentId };
        document.getElementById('cme-modal')?.remove();
        _addPlayerToTeam(teamId);
    }

    async function _saveMatchLoad(matchId, tid) {
        const sb = getSb();
        const whenRaw = document.getElementById('cme-when')?.value || '';
        const venue = (document.getElementById('cme-venue')?.value || '').trim() || null;
        const referee = (document.getElementById('cme-ref')?.value || '').trim() || null;
        const scheduledAt = whenRaw ? new Date(whenRaw).toISOString() : null;
        const { data: m } = await sb.from('tournament_matches').select('*').eq('id', matchId).single();
        if (!m) { toast('Partido no encontrado.', 'error'); return; }
        const newEvents = window.__cmeEvents || [];
        // El marcador se AUTO-DERIVA de los goles cargados (un gol = uno al marcador de su
        // equipo). Si el org además escribió un score manual, ese manda; si no, usamos los goles.
        const _goals = (tid) => newEvents.filter(e => e.type === 'gol' && e.team_id === tid).length;
        const hsRaw = document.getElementById('cme-hs')?.value;
        const asRaw = document.getElementById('cme-as')?.value;
        const _manualScore = hsRaw !== '' && asRaw !== '' && !isNaN(parseInt(hsRaw)) && !isNaN(parseInt(asRaw));
        const _hasGoals = newEvents.some(e => e.type === 'gol');
        const hasScore = _manualScore || _hasGoals;
        // Campos de agenda (fecha/cancha/árbitro) — siempre se guardan
        const upd = { scheduled_at: scheduledAt, venue: venue, referee: referee };
        // Los EVENTOS se guardan SIEMPRE (antes solo entraban si había score → un timeline
        // cargado sin resultado se perdía y "no cargaba nada").
        upd.events = newEvents;
        // Reconciliar SIEMPRE las stats por jugador (goles/asistencias/tarjetas): revertir los
        // eventos guardados antes y aplicar los nuevos, haya o no marcador. Antes esto vivía
        // dentro del if(hasScore) y las tarjetas/goleadores no se contaban sin resultado.
        await _applyEvents(m.events || [], -1);
        await _applyEvents(newEvents, +1);
        if (hasScore) {
            const homeScore = _manualScore ? parseInt(hsRaw) : _goals(m.home_team_id);
            const awayScore = _manualScore ? parseInt(asRaw) : _goals(m.away_team_id);
            const winnerId = homeScore > awayScore ? m.home_team_id : awayScore > homeScore ? m.away_team_id : null;
            // Revertir el resultado de equipo anterior (puntos/PG/PE/PP) para no duplicar
            if (m.home_score !== null && m.away_score !== null) {
                await _applyTeamResult(m.home_team_id, m.home_score, m.away_score, -1);
                await _applyTeamResult(m.away_team_id, m.away_score, m.home_score, -1);
            }
            // Aplicar el nuevo resultado de equipo
            await _applyTeamResult(m.home_team_id, homeScore, awayScore, +1);
            await _applyTeamResult(m.away_team_id, awayScore, homeScore, +1);
            upd.home_score = homeScore; upd.away_score = awayScore; upd.status = 'finished'; upd.winner_team_id = winnerId || null;
            // Eliminación directa: el ganador ocupa su lugar en la llave siguiente.
            await _advanceWinner(sb, m, winnerId);
            // Y si con este resultado se cerró la fase de grupos, se arman los playoffs.
            await _maybeSeedPlayoffs(sb, tid);
        }
        let { error } = await sb.from('tournament_matches').update(upd).eq('id', matchId);
        if (error) {
            // Fallback: sacar columnas que puedan faltar (venue/referee/scheduled_at). Los
            // eventos y el marcador SÍ se intentan preservar (esas columnas existen).
            const safe = { events: newEvents };
            if (hasScore) { safe.home_score = upd.home_score; safe.away_score = upd.away_score; safe.status = 'finished'; safe.winner_team_id = upd.winner_team_id; }
            await sb.from('tournament_matches').update(safe).eq('id', matchId);
            toast('Guardado. Corré la migración SQL para día/cancha por partido.', 'warning');
        } else {
            toast(hasScore ? 'Resultado guardado' : (newEvents.length ? 'Eventos guardados' : 'Partido programado'), 'success');
        }
        document.getElementById('cme-modal')?.remove();
        const { data: t } = await sb.from('tournaments').select('organizer_email').eq('id', tid).single();
        _ctmFixture(tid, t?.organizer_email);
        // Si la ficha del partido está abierta, refrescarla
        if (document.getElementById('cmd-modal')) _openMatchDetail(matchId);
    }

    // ═══════════════════════════════════════════════════════════
    // FICHA DEL PARTIDO (estilo "Partidos": marcador, cronómetro, timeline)
    // ═══════════════════════════════════════════════════════════
    function _cmdClose() {
        try { clearInterval(window.__cmdCrono); } catch(e){}
        try { clearInterval(window.__ctLiveInt); } catch(e){}
        window.__ctLiveInt = null; window.__ctLiveSale = null;
        document.getElementById('cmd-modal')?.remove();
    }

    // Cambia de panel en la ficha del partido (Resumen / Timeline / Jugadores).
    function _cmdTab(id, btn) {
        window.__cmdTabActivo = id;   // para volver al MISMO tab tras recargar la ficha
        document.querySelectorAll('.cmd-panel').forEach(p => { p.style.display = 'none'; });
        const panel = document.getElementById('cmd-panel-' + id);
        if (panel) panel.style.display = 'block';
        document.querySelectorAll('.cmd-tab').forEach(b => {
            const on = b === btn;
            b.style.background = on ? 'rgba(186,255,0,0.12)' : 'rgba(255,255,255,0.03)';
            b.style.color = on ? 'var(--accent)' : '#888';
            b.style.borderColor = on ? 'rgba(186,255,0,0.3)' : 'rgba(255,255,255,0.07)';
        });
    }
    async function _openMatchDetail(matchId) {
        const sb = getSb();
        let { data: m } = await sb.from('tournament_matches').select('*').eq('id', matchId).single();
        if (!m) { toast('Partido no encontrado.', 'error'); return; }
        // Si tiene Ficha completa vinculada, traer el resultado del partido real al torneo
        // antes de renderizar (así la tabla/marcador reflejan lo cargado en el partido real).
        if (m.match_id) {
            try { await _syncTournamentFromRealMatch(m.match_id); const r = await sb.from('tournament_matches').select('*').eq('id', matchId).single(); if (r.data) m = r.data; } catch(e){}
        }
        const { data: t } = await sb.from('tournaments').select('id,name,organizer_email').eq('id', m.tournament_id).single();
        const isOrg = _isOrgActive(t?.organizer_email);
        const { data: teams } = await sb.from('tournament_teams').select('id,team_name,logo_url,club_email')
            .in('id', [m.home_team_id, m.away_team_id].filter(Boolean));
        const home = (teams||[]).find(x => x.id === m.home_team_id) || { team_name: m.home_team_name };
        const away = (teams||[]).find(x => x.id === m.away_team_id) || { team_name: m.away_team_name };
        const hasResult = m.home_score != null && m.away_score != null;
        const events = Array.isArray(m.events) ? m.events : [];
        const evSorted = events.map((e,i)=>({e,i}))
            .sort((a,b)=> ((a.e.minute==null?9999:a.e.minute)-(b.e.minute==null?9999:b.e.minute)) || (a.i-b.i))
            .map(x=>x.e);
        const dateStr = m.scheduled_at ? new Date(m.scheduled_at).toLocaleString('es-UY',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : 'Por confirmar';
        const phaseLabels = { groups:'Fase de Grupos', league:'Liga', r16:'Octavos', quarterfinal:'Cuartos', semifinal:'Semifinal', final:'Final', third_place:'3er puesto' };
        const isLive = m.status === 'live' && m.kickoff_at;
        const centerBig = hasResult
            ? `<div style="font-size:40px;font-weight:900;font-family:Outfit,sans-serif;line-height:1;">${m.home_score}<span style="color:#444;margin:0 8px;">-</span>${m.away_score}</div>`
            : (isLive ? `<div id="cmd-crono" style="font-size:30px;font-weight:900;color:#00e676;font-family:Outfit,sans-serif;">0'</div>` : `<div style="font-size:22px;font-weight:900;color:#555;">VS</div>`);
        const statusPill = isLive ? `<span style="font-size:10px;font-weight:900;color:var(--accent);background:rgba(186,255,0,0.1);border:1px solid rgba(186,255,0,0.3);border-radius:20px;padding:4px 14px;letter-spacing:1.5px;"><i class='bx bxs-circle' style="font-size:8px;"></i> EN VIVO</span>`
            : (hasResult ? `<span style="font-size:10px;font-weight:900;color:#ccc;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:4px 14px;letter-spacing:1.5px;">FINALIZADO</span>`
            : `<span style="font-size:10px;font-weight:900;color:#888;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:4px 14px;letter-spacing:1.5px;">PRÓXIMO</span>`);

        const teamCol = (tm, side) => `<div style="flex:1;text-align:center;cursor:pointer;" ${tm.id?`onclick="CancheroTournaments._openTeamInfo('${tm.id}')"`:''}>
            <div style="display:flex;justify-content:center;margin-bottom:8px;">${_shieldHTML(tm.logo_url, tm.team_name, 80)}</div>
            <div style="font-weight:800;font-size:14px;line-height:1.15;">${_esc(tm.team_name||'')}</div>
        </div>`;

        // Hitos del cronómetro: van centrados, como separadores del partido.
        const _CTRL_LABEL = { inicio:'Arranca el partido', medio_tiempo:'Entretiempo', reanudar:'Se reanuda', pausa:'Pausa', fin:'Final del partido' };
        const timeline = evSorted.length ? evSorted.map(ev => {
            if (_isCtrl(ev.type)) {
                return `<div style="display:flex;justify-content:center;margin:10px 0;">
                    <span style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:20px;padding:5px 14px;font-size:11px;color:#888;font-weight:800;letter-spacing:.5px;">
                        <i class='bx bx-flag' style="color:var(--accent);"></i>${_CTRL_LABEL[ev.type]||ev.type}${ev.minute?` · ${ev.minute}'`:''}</span></div>`;
            }
            const homeSide = ev.team_id === m.home_team_id;
            const texto = ev.type === 'cambio'
                ? `<span style="color:#00e676;">${_esc(ev.in_name||'')}</span> <span style="color:#666;">por</span> <span style="color:#ff8888;">${_esc(ev.out_name||'')}</span>`
                : _esc(ev.player_name||'');
            const icono = ev.type === 'cambio' ? "<i class='bx bx-transfer'></i>" : _evIcon(ev.type);
            const chip = `<span style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:6px 12px;font-size:12px;backdrop-filter:blur(6px);">${ev.minute!=null?`<b style="color:var(--accent);">${ev.minute}'</b>`:''} ${icono} ${texto}</span>`;
            return `<div style="display:flex;${homeSide?'justify-content:flex-start':'justify-content:flex-end'};margin-bottom:6px;">${chip}</div>`;
        }).join('') : '<div style="text-align:center;color:#555;padding:20px;font-size:12px;">Sin eventos cargados.</div>';

        // Ficha completa (partido real de la sección Partidos): la org la habilita;
        // los demás la ven cuando ya está vinculada.
        // Botón "Ficha completa" QUITADO por pedido del usuario: confusía y "sacaba de todo".
        // La gestión del partido de torneo se hace desde esta misma ficha (Iniciar / Cargar
        // resultado / tabs). La función _openFullMatch y el sync a torneo quedan en el código
        // por si se reactivan, pero no hay botón que los dispare.
        const fullBtn = '';
        const orgActions = (isOrg || fullBtn) ? `<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">
            ${isOrg && !hasResult && !isLive ? `<button onclick="CancheroTournaments._startMatch('${matchId}')" style="flex:1;min-width:130px;background:rgba(255,255,255,0.05);color:#fff;border:1px solid rgba(186,255,0,0.35);border-radius:14px;padding:12px;font-weight:900;font-size:13px;cursor:pointer;backdrop-filter:blur(6px);"><i class='bx bx-play' style="color:var(--accent);"></i> Iniciar partido</button>` : ''}
            ${fullBtn}
            ${isOrg ? `<button onclick="CancheroTournaments._openMatchLoad('${matchId}','${(m.tournament_id||'').replace(/'/g,"\\'")}' )" style="flex:1;min-width:130px;background:linear-gradient(135deg,#baff00,#8fd400);color:#000;border:none;border-radius:14px;padding:12px;font-weight:900;font-size:13px;cursor:pointer;box-shadow:0 4px 16px rgba(186,255,0,0.3);"><i class='bx bx-edit'></i> ${hasResult?'Editar resultado':'Cargar resultado'}</button>` : ''}
            ${isOrg ? `<button onclick="CancheroTournaments._deleteTournamentMatch('${matchId}')" title="Eliminar partido del fixture" style="flex:0 0 auto;background:rgba(255,68,68,0.08);color:#ff4444;border:1px solid rgba(255,68,68,0.25);border-radius:14px;padding:12px 16px;font-weight:900;font-size:13px;cursor:pointer;"><i class='bx bx-trash'></i></button>` : ''}
        </div>` : '';

        // Plantel de ambos equipos (tab Jugadores)
        let roster = [];
        try { const { data: rp } = await sb.from('tournament_players').select('*').in('team_id', [m.home_team_id, m.away_team_id].filter(Boolean)).order('number'); roster = rp || []; } catch(e){}
        // País para la banderita: propio (nationality, si ya existe la columna) o el del
        // perfil registrado (users.nat) cuando el jugador está vinculado.
        try {
            const _mails = [...new Set(roster.map(p => (p.user_email||'').toLowerCase()).filter(Boolean))];
            if (_mails.length) {
                const { data: _us } = await sb.from('users').select('email,nat').in('email', _mails);
                const _byMail = {}; (_us||[]).forEach(u => { _byMail[(u.email||'').toLowerCase()] = u.nat; });
                roster.forEach(p => { if (!p.nationality) p.nationality = _byMail[(p.user_email||'').toLowerCase()] || null; });
            }
        } catch(e){}
        // Bandera + posición al lado del nombre (helper global de canchero-avatars.js).
        const _flag = (p, size) => { try { return (window.countryFlag && p.nationality) ? window.countryFlag(p.nationality, size||11) : ''; } catch(e){ return ''; } };
        const _posTag = (p) => p.position ? `<span style="font-size:8.5px;font-weight:900;color:#000;background:var(--accent);border-radius:4px;padding:1px 4px;margin-left:4px;vertical-align:1px;">${_esc(p.position)}</span>` : '';
        // Cancha con posiciones: el local ocupa la mitad de arriba, el visitante la de abajo.
        const _posLine = (pos)=>{ const p=(pos||'').toLowerCase();
            if(/arq|gk|portero|golero|arquero/.test(p)) return 0;
            if(/def|lat|zag|cb|rb|lb|central|marca/.test(p)) return 1;
            if(/del|fwd|dc|punta|ext|wing|atacante|delantero|9/.test(p)) return 3;
            return 2; };
        const _pitchDot = (p, accent)=>`<div onclick="CancheroTournaments._openPlayerInfo('${p.id}')" style="display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;width:58px;">
            <span style="width:30px;height:30px;border-radius:50%;flex-shrink:0;background:${p.avatar_url?`#0a0a0a center/cover url('${_esc(p.avatar_url)}')`:accent};border:2px solid ${accent};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#000;box-shadow:0 2px 8px rgba(0,0,0,0.5);">${p.avatar_url?'':(p.number||'')}</span>
            <span style="display:flex;align-items:center;gap:3px;max-width:58px;">
                ${_flag(p, 8)}
                <span style="font-size:8.5px;font-weight:800;color:#fff;text-shadow:0 1px 3px #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_esc((p.player_name||'').split(' ')[0])}</span>
            </span>
            ${p.position?`<span style="font-size:7.5px;font-weight:900;color:#000;background:${accent};border-radius:4px;padding:0 4px;">${_esc(p.position)}</span>`:''}
        </div>`;
        const _teamRows = (teamId, isHome, accent)=>{
            const ps = roster.filter(p=>p.team_id===teamId);
            const byLine = [0,1,2,3].map(L=>ps.filter(p=>_posLine(p.position)===L));
            const rows = byLine.map((line)=>`<div style="display:flex;justify-content:space-evenly;align-items:center;flex:1;padding:0 6px;">${line.map(p=>_pitchDot(p,accent)).join('')}</div>`);
            // Local: arquero arriba (fila 0 primero). Visitante: espejado (arquero abajo).
            return (isHome?rows:rows.slice().reverse()).join('');
        };
        // Cancha COMPLETA: antes solo se dibujaba la línea de mitad y el círculo, así que
        // "se veía solo el medio del campo". Ahora lleva perímetro, áreas grandes y chicas,
        // arcos, puntos de penal y semicírculos.
        const _lin = 'rgba(255,255,255,0.20)';
        const pitchHTML = `<div style="position:relative;background:repeating-linear-gradient(0deg,#0c2413 0px,#0c2413 30px,#0a1f10 30px,#0a1f10 60px);border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:26px 10px;margin-bottom:14px;overflow:hidden;">
            <!-- perímetro -->
            <div style="position:absolute;inset:10px;border:2px solid ${_lin};border-radius:4px;pointer-events:none;"></div>
            <!-- línea de mitad + círculo central + punto -->
            <div style="position:absolute;top:50%;left:10px;right:10px;height:2px;background:${_lin};pointer-events:none;"></div>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:76px;height:76px;border:2px solid ${_lin};border-radius:50%;pointer-events:none;"></div>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:5px;height:5px;background:${_lin};border-radius:50%;pointer-events:none;"></div>
            <!-- ARCO LOCAL (arriba): área grande, área chica, arco, penal, semicírculo -->
            <div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);width:56%;height:62px;border:2px solid ${_lin};border-top:none;border-radius:0 0 4px 4px;pointer-events:none;"></div>
            <div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);width:28%;height:28px;border:2px solid ${_lin};border-top:none;border-radius:0 0 3px 3px;pointer-events:none;"></div>
            <div style="position:absolute;top:4px;left:50%;transform:translateX(-50%);width:16%;height:7px;border:2px solid ${_lin};border-top:none;pointer-events:none;"></div>
            <div style="position:absolute;top:52px;left:50%;transform:translateX(-50%);width:4px;height:4px;background:${_lin};border-radius:50%;pointer-events:none;"></div>
            <div style="position:absolute;top:56px;left:50%;transform:translateX(-50%);width:52px;height:26px;border:2px solid ${_lin};border-top:none;border-radius:0 0 26px 26px;pointer-events:none;"></div>
            <!-- ARCO VISITANTE (abajo) -->
            <div style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);width:56%;height:62px;border:2px solid ${_lin};border-bottom:none;border-radius:4px 4px 0 0;pointer-events:none;"></div>
            <div style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);width:28%;height:28px;border:2px solid ${_lin};border-bottom:none;border-radius:3px 3px 0 0;pointer-events:none;"></div>
            <div style="position:absolute;bottom:4px;left:50%;transform:translateX(-50%);width:16%;height:7px;border:2px solid ${_lin};border-bottom:none;pointer-events:none;"></div>
            <div style="position:absolute;bottom:52px;left:50%;transform:translateX(-50%);width:4px;height:4px;background:${_lin};border-radius:50%;pointer-events:none;"></div>
            <div style="position:absolute;bottom:56px;left:50%;transform:translateX(-50%);width:52px;height:26px;border:2px solid ${_lin};border-bottom:none;border-radius:26px 26px 0 0;pointer-events:none;"></div>
            <div style="position:relative;display:flex;flex-direction:column;min-height:170px;">${_teamRows(m.home_team_id,true,'var(--accent)')}</div>
            <div style="position:relative;display:flex;flex-direction:column;min-height:170px;">${_teamRows(m.away_team_id,false,'#4a9eff')}</div>
        </div>`;
        const rosterCol = (teamId, teamName) => {
            const ps = roster.filter(p => p.team_id === teamId);
            return `<div style="flex:1;min-width:0;">
                <div style="font-size:10px;font-weight:900;color:#666;letter-spacing:1px;margin-bottom:8px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_esc(teamName||'').toUpperCase()}</div>
                ${ps.length ? ps.map(p => `<div onclick="CancheroTournaments._openPlayerInfo('${p.id}')" style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:7px 10px;margin-bottom:5px;cursor:pointer;">
                    <span style="width:26px;height:26px;border-radius:50%;flex-shrink:0;background:${p.avatar_url?`#222 center/cover url('${_esc(p.avatar_url)}')`:'rgba(186,255,0,0.1)'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:var(--accent);">${p.avatar_url?'':(p.number||'—')}</span>
                    <span style="flex:1;min-width:0;font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:4px;">${_flag(p,10)}<span style="overflow:hidden;text-overflow:ellipsis;">${_esc(p.player_name)}</span></span>
                    ${_posTag(p)}
                </div>`).join('') : '<div style="text-align:center;color:#444;font-size:11px;padding:14px 4px;">Sin jugadores</div>'}
            </div>`;
        };

        // Estadísticas del partido desde los eventos (para el Resumen)
        const cnt = (teamId, type) => evSorted.filter(ev => ev.team_id === teamId && ev.type === type).length;
        const statRow = (label, icon, hv, av) => `<div style="display:flex;align-items:center;gap:10px;padding:9px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;margin-bottom:6px;">
            <span style="width:28px;text-align:center;font-size:14px;font-weight:900;color:${hv>av?'var(--accent)':'#ccc'};">${hv}</span>
            <span style="flex:1;text-align:center;font-size:11px;color:#888;display:flex;align-items:center;justify-content:center;gap:6px;">${icon} ${label}</span>
            <span style="width:28px;text-align:center;font-size:14px;font-weight:900;color:${av>hv?'var(--accent)':'#ccc'};">${av}</span>
        </div>`;
        const resumenStats = statRow('Goles', _evIcon('gol'), cnt(m.home_team_id,'gol'), cnt(m.away_team_id,'gol'))
            + statRow('Asistencias', _evIcon('asistencia'), cnt(m.home_team_id,'asistencia'), cnt(m.away_team_id,'asistencia'))
            + statRow('Amarillas', _evIcon('amarilla'), cnt(m.home_team_id,'amarilla'), cnt(m.away_team_id,'amarilla'))
            + statRow('Rojas', _evIcon('roja'), cnt(m.home_team_id,'roja'), cnt(m.away_team_id,'roja'));

        const tabBtn = (id, icon, label, active) => `<button class="cmd-tab" data-panel="${id}" onclick="CancheroTournaments._cmdTab('${id}',this)" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;background:${active?'rgba(186,255,0,0.12)':'rgba(255,255,255,0.03)'};color:${active?'var(--accent)':'#888'};border:1px solid ${active?'rgba(186,255,0,0.3)':'rgba(255,255,255,0.07)'};border-radius:14px;padding:9px 4px;font-size:11.5px;font-weight:800;cursor:pointer;white-space:nowrap;backdrop-filter:blur(6px);"><i class='bx ${icon}' style="font-size:15px;"></i><span class="ctm-tab-label">${label}</span></button>`;

        const ex = document.getElementById('cmd-modal'); if (ex) _cmdClose();
        const modal = document.createElement('div');
        modal.id = 'cmd-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:100004;background:#070907;overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;' ; modal.classList.add('ct-noscrollbar'); _injectTabCss();
        modal.innerHTML = `
        <div style="max-width:560px;margin:0 auto;padding:14px 16px calc(130px + env(safe-area-inset-bottom));">
            <div style="display:flex;align-items:center;padding:6px 0 14px;position:sticky;top:0;background:rgba(7,9,7,0.9);backdrop-filter:blur(10px);z-index:2;">
                <div style="flex:1;display:flex;justify-content:flex-start;">
                    <button onclick="CancheroTournaments._cmdClose()" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:12px;padding:8px 12px;font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px;backdrop-filter:blur(6px);"><i class='bx bx-arrow-back'></i> Volver</button>
                </div>
                <div style="flex:0 0 auto;text-align:center;">${statusPill}</div>
                <div style="flex:1;display:flex;justify-content:flex-end;">
                    <button onclick="CancheroTournaments._matchShare('${matchId}','${(m.tournament_id||'').replace(/'/g,"\\'")}' )" style="background:rgba(186,255,0,0.1);color:var(--accent);border:1px solid rgba(186,255,0,0.25);border-radius:12px;padding:8px 12px;font-size:13px;font-weight:800;cursor:pointer;backdrop-filter:blur(6px);"><i class='bx bx-share-alt'></i></button>
                </div>
            </div>
            <div style="font-size:11px;color:#666;text-align:center;margin-bottom:12px;">${phaseLabels[m.phase]||''}${m.group_letter&&m.phase==='groups'?' · Grupo '+m.group_letter:''}</div>
            <!-- Hero glass -->
            <div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:22px 14px;backdrop-filter:blur(10px);box-shadow:inset 0 1px 0 rgba(255,255,255,0.06);">
                ${teamCol(home,'home')}
                <div style="flex-shrink:0;text-align:center;min-width:90px;">${centerBig}${!hasResult&&!isLive&&m.scheduled_at?`<div style="font-size:11px;color:#888;margin-top:4px;">${new Date(m.scheduled_at).toLocaleTimeString('es-UY',{hour:'2-digit',minute:'2-digit'})}</div>`:''}</div>
                ${teamCol(away,'away')}
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:12px 0;font-size:11.5px;color:#999;">
                <span ${isOrg?`onclick="CancheroTournaments._openMatchLoad('${matchId}','${(m.tournament_id||'').replace(/'/g,"\\'")}' )" style="cursor:pointer;background:rgba(186,255,0,0.06);border:1px solid rgba(186,255,0,0.28);border-radius:20px;padding:5px 12px;color:var(--accent);"`:`style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:20px;padding:5px 12px;"`}><i class='bx bx-calendar' style="color:var(--accent);"></i> ${dateStr}${isOrg?` <i class='bx bx-pencil' style="font-size:11px;opacity:.8;"></i>`:''}</span>
                ${m.venue?`<span style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:20px;padding:5px 12px;"><i class='bx bx-map' style="color:var(--accent);"></i> ${_esc(m.venue)}</span>`:''}
                ${m.referee?`<span style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:20px;padding:5px 12px;"><i class='bx bx-user-voice' style="color:var(--accent);"></i> ${_esc(m.referee)}</span>`:''}
            </div>
            ${orgActions}
            <!-- Tabs de la ficha -->
            <div style="display:flex;gap:6px;margin:16px 0 12px;">
                ${isOrg ? tabBtn('envivo','bx-broadcast','En vivo',false) : ''}
                ${tabBtn('resumen','bx-info-circle','Resumen',true)}
                ${tabBtn('timeline','bx-time-five','Timeline',false)}
                ${tabBtn('jugadores','bx-group','Jugadores',false)}
            </div>
            ${isOrg ? `<div id="cmd-panel-envivo" class="cmd-panel" style="display:none;">${_livePanel(matchId, m)}</div>` : ''}
            <div id="cmd-panel-resumen" class="cmd-panel">${resumenStats}</div>
            <div id="cmd-panel-timeline" class="cmd-panel" style="display:none;">${timeline}</div>
            <div id="cmd-panel-jugadores" class="cmd-panel" style="display:none;">
                <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:10px;font-size:11px;font-weight:800;"><span style="color:var(--accent);"><i class='bx bxs-circle' style="font-size:8px;"></i> ${_esc(home.team_name||'Local')}</span><span style="color:#555;">vs</span><span style="color:#4a9eff;"><i class='bx bxs-circle' style="font-size:8px;"></i> ${_esc(away.team_name||'Visitante')}</span></div>
                ${pitchHTML}
                <div style="display:flex;gap:10px;align-items:flex-start;">${rosterCol(m.home_team_id, home.team_name)}${rosterCol(m.away_team_id, away.team_name)}</div>
            </div>
        </div>`;
        // NO cerrar al tocar el fondo: el usuario tocaba "bastante abajo" y se salía de la
        // gestión sin querer. Se sale solo con "Volver" o la barra inferior.
        document.body.appendChild(modal);
        _injectTabCss();
        // Volver al tab en el que estabas: cargar un evento recarga la ficha y te
        // devolvía a Resumen, sacándote de EN VIVO en cada toque.
        try {
            const _t = window.__cmdTabActivo;
            if (_t && document.getElementById('cmd-panel-' + _t)) {
                _cmdTab(_t, document.querySelector('.cmd-tab[data-panel="' + _t + '"]'));
            }
        } catch(e){}
        // Cronómetro del tab EN VIVO: corre segundo a segundo mientras el partido esté en juego.
        try { clearInterval(window.__ctLiveInt); } catch(e){}
        window.__ctLiveInt = null;
        window.__ctLiveEvents = Array.isArray(m.events) ? m.events : [];
        if (isOrg && _liveMinute(window.__ctLiveEvents).corriendo) {
            window.__ctLiveInt = setInterval(_liveTick, 1000);
        }
        // Cronómetro en vivo
        if (isLive) {
            const tick = () => {
                const el = document.getElementById('cmd-crono'); if (!el) { clearInterval(window.__cmdCrono); return; }
                const mins = Math.max(0, Math.min(130, Math.floor((Date.now() - new Date(m.kickoff_at).getTime())/60000)));
                el.textContent = mins + "'";
            };
            tick();
            try { clearInterval(window.__cmdCrono); } catch(e){}
            window.__cmdCrono = setInterval(tick, 15000);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // GESTIÓN EN VIVO — dentro de la ficha del torneo (P1)
    // Cronómetro real (iniciar · pausa · ½ tiempo · fin) + gol/asistencia/
    // tarjeta/cambio por jugador. Todo se guarda en tournament_matches.events
    // (jsonb que YA existe) como eventos de control, así no hace falta migrar.
    // ═══════════════════════════════════════════════════════════
    const _CTRL = ['inicio','pausa','reanudar','medio_tiempo','fin'];
    function _isCtrl(t){ return _CTRL.indexOf(t) !== -1; }

    // Minuto corrido = suma de los tramos jugados. El cronómetro no puede
    // derivarse solo de kickoff_at porque hay pausas y entretiempo.
    function _liveMinute(events) {
        const ctrl = (events||[]).filter(e => _isCtrl(e.type) && e.at)
            .sort((a,b) => new Date(a.at) - new Date(b.at));
        let ms = 0, abierto = null;
        for (const e of ctrl) {
            const t = new Date(e.at).getTime();
            if (e.type === 'inicio' || e.type === 'reanudar') { if (abierto == null) abierto = t; }
            else if (abierto != null) { ms += t - abierto; abierto = null; }
        }
        if (abierto != null) ms += Date.now() - abierto;
        // TOPE: si el partido queda corriendo (se olvidaron de darle Fin), el reloj seguía
        // sumando y llegaba a valores absurdos tipo 2400'. El partido dura lo que se
        // configuró; se deja un margen de 15' para descuento/alargue y ahí se planta.
        const dur = _liveDuracion(events);
        const topeMs = (dur + 15) * 60000;
        const tope = ms > topeMs;
        if (tope) ms = topeMs;
        return { minute: Math.floor(ms/60000), seconds: Math.floor(ms/1000),
                 corriendo: abierto != null && !tope, topado: tope };
    }
    function _liveEstado(events) {
        const ctrl = (events||[]).filter(e => _isCtrl(e.type) && e.at)
            .sort((a,b) => new Date(a.at) - new Date(b.at));
        if (!ctrl.length) return 'sin_empezar';
        const u = ctrl[ctrl.length-1].type;
        if (u === 'fin') return 'terminado';
        if (u === 'medio_tiempo') return 'entretiempo';
        if (u === 'pausa') return 'pausado';
        return 'corriendo';
    }
    function _liveDuracion(events) {
        const ini = (events||[]).filter(e => e.type === 'inicio')[0];
        return (ini && ini.duration) || 90;
    }
    function _mmss(seg){ const m = Math.floor(seg/60), s = seg%60; return m + "'" + (s<10?'0':'') + s + '"'; }

    // Agrega eventos al partido sin pisar lo que otro haya cargado en el medio:
    // relee events, concatena y guarda.
    async function _liveAppend(matchId, nuevos, extraFields) {
        const sb = getSb();
        const { data: m } = await sb.from('tournament_matches').select('events,home_score,away_score').eq('id', matchId).single();
        const events = (Array.isArray(m?.events) ? m.events : []).concat(nuevos);
        const upd = Object.assign({ events }, extraFields || {});
        const { error } = await sb.from('tournament_matches').update(upd).eq('id', matchId);
        if (error) { toast('Error: ' + error.message, 'error'); return null; }
        return { events, m };
    }

    async function _liveChrono(matchId, accion) {
        const sb = getSb();
        const { data: m } = await sb.from('tournament_matches').select('events,status').eq('id', matchId).single();
        const events = Array.isArray(m?.events) ? m.events : [];
        const est = _liveEstado(events);
        const min = _liveMinute(events).minute;
        const ahora = new Date().toISOString();
        let ev = null, campos = null;

        if (accion === 'toggle') {
            if (est === 'corriendo') ev = { type:'pausa', at: ahora, minute: min };
            else if (est === 'sin_empezar') {
                const dur = parseInt(document.getElementById('cmd-live-dur')?.value, 10) || 90;
                ev = { type:'inicio', at: ahora, minute: 0, duration: dur };
                campos = { status:'live', kickoff_at: ahora };
            } else if (est === 'terminado') {
                // Reabrir: si terminaste por error (o hay alargue) se puede volver a arrancar.
                if (!confirm('El partido está finalizado. ¿Reabrirlo y seguir contando?')) return;
                ev = { type:'reanudar', at: ahora, minute: min };
                campos = { status:'live' };
            }
            else ev = { type:'reanudar', at: ahora, minute: min };
        } else if (accion === 'medio') {
            if (est !== 'corriendo') { toast('El cronómetro no está corriendo.', 'warning'); return; }
            ev = { type:'medio_tiempo', at: ahora, minute: min };
        } else if (accion === 'fin') {
            if (est === 'sin_empezar') { toast('El partido no arrancó.', 'warning'); return; }
            if (est === 'terminado') { toast('El partido ya terminó.', 'info'); return; }
            if (!confirm('¿Terminar el partido? Se cierra el cronómetro y queda el resultado actual.')) return;
            ev = { type:'fin', at: ahora, minute: min };
            campos = { status:'finished' };
        } else if (accion === 'reiniciar') {
            // Volver el cronómetro a CERO: se quitan los hitos de tiempo (inicio, pausas,
            // entretiempo, fin) y el partido queda listo para arrancar de nuevo. Los goles
            // y tarjetas YA cargados se conservan: se borran con "Deshacer" si hace falta.
            if (est === 'sin_empezar') { toast('El cronómetro ya está en cero.', 'info'); return; }
            if (!confirm('¿Reiniciar el cronómetro a cero?\n\nEl tiempo vuelve a 0 y el partido queda listo para arrancar de nuevo. Los goles y tarjetas cargados NO se borran.')) return;
            const _limpios = events.filter(e => !_isCtrl(e.type));
            const { error: _e } = await sb.from('tournament_matches')
                .update({ events: _limpios, status: 'scheduled', kickoff_at: null }).eq('id', matchId);
            if (_e) { toast('Error: ' + _e.message, 'error'); return; }
            toast('Cronómetro reiniciado.', 'success');
            _openMatchDetail(matchId);
            return;
        }
        if (!ev) return;
        const r = await _liveAppend(matchId, [ev], campos);
        if (!r) return;
        const labels = { inicio:'¡Arrancó el partido!', pausa:'Cronómetro pausado.', reanudar:'Cronómetro reanudado.', medio_tiempo:'Entretiempo.', fin:'Partido finalizado.' };
        toast(labels[ev.type] || 'Listo.', 'success');
        _openMatchDetail(matchId);
    }

    // Elimina un partido del fixture revirtiendo TODO lo que aporto: las estadisticas
    // de los jugadores (goles/asistencias/tarjetas) y los puntos del resultado en la
    // tabla de posiciones. Sin esto, borrar dejaba la tabla inflada.
    async function _deleteTournamentMatch(matchId) {
        const sb = getSb();
        const { data: m } = await sb.from('tournament_matches').select('*').eq('id', matchId).single();
        if (!m) { toast('Partido no encontrado.', 'error'); return; }
        const rotulo = `${m.home_team_name || 'Local'} vs ${m.away_team_name || 'Visitante'}`;
        const tieneResultado = m.home_score != null && m.away_score != null;
        if (!confirm('¿Eliminar el partido ' + rotulo + ' del fixture?\n\n' +
            (tieneResultado ? 'Se descuentan los puntos de la tabla y las estadísticas de los jugadores.\n\n' : '') +
            'Esta acción no se puede deshacer.')) return;
        // 1) Revertir estadísticas de los jugadores
        try { await _applyEvents((Array.isArray(m.events) ? m.events : []).filter(e => !_isCtrl(e.type)), -1); } catch(e){}
        // 2) Revertir el resultado en la tabla de posiciones
        if (tieneResultado && m.home_team_id && m.away_team_id) {
            try {
                await _applyTeamResult(m.home_team_id, m.home_score, m.away_score, -1);
                await _applyTeamResult(m.away_team_id, m.away_score, m.home_score, -1);
            } catch(e){}
        }
        // 3) Borrar el partido
        const { error } = await sb.from('tournament_matches').delete().eq('id', matchId);
        if (error) { toast('Error al eliminar: ' + error.message, 'error'); return; }
        toast('Partido eliminado del fixture.', 'success');
        _cmdClose();
        if (m.tournament_id) {
            const { data: t } = await sb.from('tournaments').select('organizer_email').eq('id', m.tournament_id).single();
            try { _ctmTab('fixture', m.tournament_id, t?.organizer_email, document.querySelector('.ctm-tab[data-tab="fixture"]')); } catch(e){}
        }
    }

    // Reinicia el MARCADOR: 0-0, borra los eventos de jugador y revierte lo que esos
    // eventos sumaron a las estadísticas (goles, asistencias, tarjetas). El cronómetro
    // no se toca: para eso está "Reiniciar cronómetro".
    async function _liveResetMarcador(matchId) {
        const sb = getSb();
        const { data: m } = await sb.from('tournament_matches').select('*').eq('id', matchId).single();
        if (!m) return;
        const events = Array.isArray(m.events) ? m.events : [];
        const deJugador = events.filter(e => !_isCtrl(e.type));
        if (!deJugador.length && !m.home_score && !m.away_score) { toast('El marcador ya está en cero.', 'info'); return; }
        if (!confirm('¿Reiniciar el marcador?\n\nVuelve a 0-0 y se borran los ' + deJugador.length + ' evento(s) cargados (goles, asistencias, tarjetas y cambios). Las estadísticas de los jugadores se descuentan.')) return;
        const { error } = await sb.from('tournament_matches')
            .update({ events: events.filter(e => _isCtrl(e.type)), home_score: 0, away_score: 0 })
            .eq('id', matchId);
        if (error) { toast('Error: ' + error.message, 'error'); return; }
        try { await _applyEvents(deJugador, -1); } catch(e){}
        toast('Marcador reiniciado.', 'success');
        _openMatchDetail(matchId);
    }

    // Selector de jugador para cargar un evento en vivo.
    async function _liveEvent(matchId, tipo) {
        const sb = getSb();
        const { data: m } = await sb.from('tournament_matches').select('*').eq('id', matchId).single();
        if (!m) return;
        const { data: roster } = await sb.from('tournament_players').select('*')
            .in('team_id', [m.home_team_id, m.away_team_id].filter(Boolean)).order('number');
        const min = _liveMinute(Array.isArray(m.events) ? m.events : []).minute;
        const titulos = { gol:'¿Quién hizo el gol?', asistencia:'¿Quién dio la asistencia?', amarilla:'¿Quién vio la amarilla?', roja:'¿Quién vio la roja?', cambio:'¿Quién SALE?' };
        const ex = document.getElementById('cmdlive-modal'); if (ex) ex.remove();
        const modal = document.createElement('div');
        modal.id = 'cmdlive-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:100009;background:rgba(0,0,0,0.93);overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:20px;';
        const col = (teamId, teamName, accent) => {
            const ps = (roster||[]).filter(p => p.team_id === teamId);
            return `<div style="flex:1;min-width:0;">
                <div style="font-size:11px;font-weight:900;color:${accent};margin-bottom:8px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_esc(teamName||'')}</div>
                ${ps.map(p => `<button onclick="CancheroTournaments._liveSave('${matchId}','${tipo}','${p.id}')" style="display:flex;align-items:center;gap:8px;width:100%;background:#141414;border:1px solid #222;border-radius:10px;padding:8px 10px;margin-bottom:6px;cursor:pointer;color:#fff;text-align:left;">
                    <span style="width:26px;height:26px;border-radius:50%;flex-shrink:0;${p.avatar_url?`background:#222 url('${_esc(p.avatar_url)}') center/cover;`:`background:rgba(186,255,0,0.12);`}display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:var(--accent);">${p.avatar_url?'':(p.number||'')}</span>
                    <span style="font-size:12.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_esc(p.player_name)}</span>
                </button>`).join('') || '<div style="font-size:11px;color:#555;text-align:center;padding:10px;">Sin plantel cargado.</div>'}
            </div>`;
        };
        modal.innerHTML = `
        <div style="background:#0d0d0d;border:1px solid #222;border-radius:18px;width:100%;max-width:520px;padding:20px;margin-top:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <h3 style="font-family:Outfit,sans-serif;font-weight:900;font-size:15px;">${_evIcon(tipo)} ${titulos[tipo]||'Elegí el jugador'}</h3>
                <button onclick="document.getElementById('cmdlive-modal').remove()" style="background:none;border:none;color:#888;font-size:22px;cursor:pointer;">&times;</button>
            </div>
            <div style="font-size:11px;color:var(--accent);margin-bottom:14px;font-weight:800;">Minuto ${min}'</div>
            <div style="display:flex;gap:10px;align-items:flex-start;">
                ${col(m.home_team_id, m.home_team_name, 'var(--accent)')}
                ${col(m.away_team_id, m.away_team_name, '#4a9eff')}
            </div>
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    }

    // Guarda el evento elegido. Un gol además mueve el marcador.
    async function _liveSave(matchId, tipo, playerId) {
        const sb = getSb();
        const { data: p } = await sb.from('tournament_players').select('*').eq('id', playerId).single();
        if (!p) { toast('Jugador no encontrado.', 'error'); return; }
        const { data: m } = await sb.from('tournament_matches').select('*').eq('id', matchId).single();
        const events = Array.isArray(m?.events) ? m.events : [];
        const min = _liveMinute(events).minute;

        // Un cambio necesita el jugador que ENTRA: segundo paso.
        if (tipo === 'cambio' && !window.__ctLiveSale) {
            window.__ctLiveSale = { id: p.id, name: p.player_name, team_id: p.team_id };
            const cont = document.querySelector('#cmdlive-modal h3');
            if (cont) cont.innerHTML = `${_evIcon('cambio')} Sale ${_esc(p.player_name)} — ¿quién ENTRA?`;
            return;
        }

        const ev = { type: tipo, at: new Date().toISOString(), minute: min,
                     player_id: p.id, player_name: p.player_name, team_id: p.team_id };
        if (tipo === 'cambio' && window.__ctLiveSale) {
            ev.out_id = window.__ctLiveSale.id; ev.out_name = window.__ctLiveSale.name;
            ev.in_id = p.id; ev.in_name = p.player_name;
            window.__ctLiveSale = null;
        }

        // Marcador: el gol suma al equipo del goleador.
        let campos = null;
        if (tipo === 'gol') {
            const esLocal = String(p.team_id) === String(m.home_team_id);
            campos = esLocal ? { home_score: (m.home_score||0) + 1 }
                             : { away_score: (m.away_score||0) + 1 };
        }
        const r = await _liveAppend(matchId, [ev], campos);
        if (!r) return;
        // Estadística acumulada del jugador (goles/asistencias/tarjetas).
        if (_EV_COL[tipo]) { try { await _applyEvents([ev], 1); } catch(e){} }
        document.getElementById('cmdlive-modal')?.remove();
        document.getElementById('cmdasist-modal')?.remove();   // si vino del paso de asistencia
        const nombres = { gol:'Gol', asistencia:'Asistencia', amarilla:'Amarilla', roja:'Roja', cambio:'Cambio' };
        toast((nombres[tipo]||'Evento') + ' de ' + p.player_name + " (" + min + "')", 'success');
        // Después de un GOL se pregunta la asistencia en el momento (es cuando se sabe).
        // Se puede omitir: una asistencia sin gol no tiene sentido, pero un gol sin
        // asistencia sí (jugada individual, penal, rebote).
        if (tipo === 'gol') { _liveAsistDeGol(matchId, p.team_id, p.id, p.player_name); return; }
        _openMatchDetail(matchId);
    }

    // Selector de ASISTENCIA para el gol recién cargado: solo compañeros del goleador.
    async function _liveAsistDeGol(matchId, teamId, golPlayerId, golPlayerName) {
        const sb = getSb();
        const { data: roster } = await sb.from('tournament_players').select('*').eq('team_id', teamId).order('number');
        const companeros = (roster||[]).filter(x => String(x.id) !== String(golPlayerId));
        if (!companeros.length) { _openMatchDetail(matchId); return; }
        const ex = document.getElementById('cmdasist-modal'); if (ex) ex.remove();
        const modal = document.createElement('div');
        modal.id = 'cmdasist-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:100009;background:rgba(0,0,0,0.93);overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:20px;';
        modal.innerHTML = `
        <div style="background:#0d0d0d;border:1px solid #222;border-radius:18px;width:100%;max-width:420px;padding:20px;margin-top:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <h3 style="font-family:Outfit,sans-serif;font-weight:900;font-size:15px;">${_evIcon('asistencia')} ¿Quién dio la asistencia?</h3>
                <button onclick="CancheroTournaments._liveSinAsist('${matchId}')" style="background:none;border:none;color:#888;font-size:22px;cursor:pointer;">&times;</button>
            </div>
            <div style="font-size:11.5px;color:#888;margin-bottom:14px;">Gol de <b style="color:var(--accent);">${_esc(golPlayerName||'')}</b>. Si fue jugada individual o no la sabés, tocá "Sin asistencia".</div>
            <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;">
                ${companeros.map(x => `<button onclick="CancheroTournaments._liveSave('${matchId}','asistencia','${x.id}')" style="display:flex;align-items:center;gap:9px;width:100%;background:#141414;border:1px solid #222;border-radius:10px;padding:9px 11px;cursor:pointer;color:#fff;text-align:left;">
                    <span style="width:28px;height:28px;border-radius:50%;flex-shrink:0;${x.avatar_url?`background:#222 url('${_esc(x.avatar_url)}') center/cover;`:`background:rgba(186,255,0,0.12);`}display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:var(--accent);">${x.avatar_url?'':(x.number||'')}</span>
                    <span style="font-size:13px;font-weight:700;">${_esc(x.player_name)}</span>
                </button>`).join('')}
            </div>
            <button onclick="CancheroTournaments._liveSinAsist('${matchId}')" style="width:100%;background:rgba(255,255,255,0.05);color:#aaa;border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:12px;font-weight:800;font-size:13px;cursor:pointer;">Sin asistencia</button>
        </div>`;
        modal.onclick = e => { if (e.target === modal) { modal.remove(); _openMatchDetail(matchId); } };
        document.body.appendChild(modal);
    }
    function _liveSinAsist(matchId) {
        document.getElementById('cmdasist-modal')?.remove();
        _openMatchDetail(matchId);
    }

    // Deshacer el último evento cargado (con su efecto en marcador y estadísticas).
    async function _liveUndo(matchId) {
        const sb = getSb();
        const { data: m } = await sb.from('tournament_matches').select('*').eq('id', matchId).single();
        const events = Array.isArray(m?.events) ? m.events : [];
        const idx = (() => { for (let i = events.length-1; i >= 0; i--) if (!_isCtrl(events[i].type)) return i; return -1; })();
        if (idx === -1) { toast('No hay eventos para deshacer.', 'info'); return; }
        const ev = events[idx];
        if (!confirm('¿Deshacer "' + (ev.player_name||'') + '" (' + ev.type + ", " + (ev.minute||0) + "')?")) return;
        const restantes = events.slice(0, idx).concat(events.slice(idx+1));
        let campos = { events: restantes };
        if (ev.type === 'gol') {
            const esLocal = String(ev.team_id) === String(m.home_team_id);
            if (esLocal) campos.home_score = Math.max(0, (m.home_score||0) - 1);
            else campos.away_score = Math.max(0, (m.away_score||0) - 1);
        }
        const { error } = await sb.from('tournament_matches').update(campos).eq('id', matchId);
        if (error) { toast('Error: ' + error.message, 'error'); return; }
        if (_EV_COL[ev.type]) { try { await _applyEvents([ev], -1); } catch(e){} }
        toast('Evento deshecho.', 'success');
        _openMatchDetail(matchId);
    }

    // Panel del tab EN VIVO (solo lo ve la organización).
    function _livePanel(matchId, m) {
        const events = Array.isArray(m.events) ? m.events : [];
        const est = _liveEstado(events);
        const lm = _liveMinute(events);
        const dur = _liveDuracion(events);
        const terminado = est === 'terminado';
        const labelToggle = est === 'corriendo' ? 'Pausar'
            : (est === 'sin_empezar' ? 'Iniciar' : (terminado ? 'Reabrir' : 'Reanudar'));
        const iconToggle  = est === 'corriendo' ? 'bx-pause' : (terminado ? 'bx-revision' : 'bx-play');
        const estLabel = { sin_empezar:'Sin empezar', corriendo:'En juego', pausado:'Pausado', entretiempo:'Entretiempo', terminado:'Finalizado' }[est];
        // Con el partido terminado, 'toggle' sigue activo (es "Reabrir"); ½ tiempo y Fin no.
        const _off = (accion) => terminado && accion !== 'toggle';
        const btn = (accion, icon, label, extra) => `<button onclick="CancheroTournaments._liveChrono('${matchId}','${accion}')" ${_off(accion)?'disabled':''} style="flex:1;background:${extra||'rgba(255,255,255,0.05)'};color:#fff;border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:11px 6px;font-weight:800;font-size:12px;cursor:${_off(accion)?'not-allowed':'pointer'};opacity:${_off(accion)?'0.4':'1'};display:flex;align-items:center;justify-content:center;gap:5px;"><i class='bx ${icon}'></i> ${label}</button>`;
        const evBtn = (tipo, icon, label, color) => `<button onclick="CancheroTournaments._liveEvent('${matchId}','${tipo}')" ${est==='sin_empezar'||terminado?'disabled':''} style="flex:1;min-width:calc(33% - 6px);background:rgba(255,255,255,0.04);color:${color||'#fff'};border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:12px 6px;font-weight:800;font-size:12px;cursor:${est==='sin_empezar'||terminado?'not-allowed':'pointer'};opacity:${est==='sin_empezar'||terminado?'0.4':'1'};display:flex;flex-direction:column;align-items:center;gap:5px;"><span style="font-size:17px;line-height:1;">${icon}</span>${label}</button>`;

        return `
        <div style="background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:18px 16px;backdrop-filter:blur(10px);margin-bottom:12px;text-align:center;">
            <div style="font-size:10px;font-weight:900;letter-spacing:2px;color:${est==='corriendo'?'#00e676':'#888'};margin-bottom:6px;">${estLabel.toUpperCase()}</div>
            <div id="cmd-live-crono" data-matchid="${matchId}" style="font-size:44px;font-weight:900;font-family:Outfit,sans-serif;color:#fff;line-height:1;letter-spacing:1px;">${_mmss(lm.seconds)}</div>
            <div style="font-size:11px;color:#666;margin-top:4px;">de ${dur}' reglamentarios</div>
            ${est === 'sin_empezar' ? `<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px;">
                <span style="font-size:11px;color:#888;">Duración</span>
                <input id="cmd-live-dur" type="number" min="10" max="130" value="${dur}" style="width:74px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:8px;font-size:13px;text-align:center;">
                <span style="font-size:11px;color:#888;">min</span>
            </div>` : ''}
            <div style="display:flex;gap:8px;margin-top:14px;">
                ${btn('toggle', iconToggle, labelToggle, est==='corriendo'?'rgba(255,170,0,0.12)':'rgba(0,230,118,0.12)')}
                ${btn('medio', 'bx-time', '½ tiempo')}
                ${btn('fin', 'bx-stop', 'Fin', 'rgba(255,68,68,0.12)')}
            </div>
            <div style="display:flex;gap:8px;margin-top:8px;">
                ${est !== 'sin_empezar' ? `<button onclick="CancheroTournaments._liveChrono('${matchId}','reiniciar')" style="flex:1;background:rgba(255,255,255,0.04);color:#888;border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:9px 6px;font-weight:800;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;"><i class='bx bx-reset'></i> Reiniciar tiempo</button>` : ''}
                <button onclick="CancheroTournaments._liveResetMarcador('${matchId}')" style="flex:1;background:rgba(255,255,255,0.04);color:#888;border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:9px 6px;font-weight:800;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;"><i class='bx bx-refresh'></i> Reiniciar marcador</button>
            </div>
        </div>
        <div style="font-size:10px;font-weight:900;color:#555;letter-spacing:1px;margin-bottom:8px;">CARGAR EVENTO</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
            ${evBtn('gol', _evIcon('gol'), 'Gol')}
            ${evBtn('asistencia', _evIcon('asistencia'), 'Asistencia')}
            ${evBtn('cambio', "<i class='bx bx-transfer'></i>", 'Cambio')}
            ${evBtn('amarilla', _evIcon('amarilla'), 'Amarilla', '#ffcc00')}
            ${evBtn('roja', _evIcon('roja'), 'Roja', '#ff3b30')}
            <button onclick="CancheroTournaments._liveUndo('${matchId}')" style="flex:1;min-width:calc(33% - 6px);background:rgba(255,255,255,0.04);color:#888;border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:12px 6px;font-weight:800;font-size:12px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;"><span style="font-size:17px;line-height:1;"><i class='bx bx-undo'></i></span>Deshacer</button>
        </div>
        <div style="font-size:10.5px;color:#555;line-height:1.5;">Los goles mueven el marcador y suman a las estadísticas del jugador y del torneo. "Deshacer" revierte el último evento con su efecto.</div>`;
    }

    // Tick del cronómetro del tab EN VIVO (segundo a segundo, solo si corre).
    function _liveTick() {
        const el = document.getElementById('cmd-live-crono');
        if (!el) { try { clearInterval(window.__ctLiveInt); } catch(e){} window.__ctLiveInt = null; return; }
        if (!window.__ctLiveEvents) return;
        const lm = _liveMinute(window.__ctLiveEvents);
        if (!lm.corriendo) return;
        el.textContent = _mmss(lm.seconds);
    }

    async function _startMatch(matchId) {
        const sb = getSb();
        const ahora = new Date().toISOString();
        // Sella también el evento 'inicio': es lo que arranca el cronómetro del tab EN VIVO.
        // Sin esto el partido quedaba "live" pero el cronómetro decía "sin empezar".
        const { data: m } = await sb.from('tournament_matches').select('events').eq('id', matchId).single();
        const events = Array.isArray(m?.events) ? m.events : [];
        if (!events.some(e => e.type === 'inicio')) events.push({ type:'inicio', at: ahora, minute: 0, duration: 90 });
        const { error } = await sb.from('tournament_matches').update({ status: 'live', kickoff_at: ahora, events }).eq('id', matchId);
        if (error) { toast('Error: ' + error.message, 'error'); return; }
        toast('¡Partido en vivo!', 'success');
        _openMatchDetail(matchId);
    }

    // ═══════════════════════════════════════════════════════════
    // FICHA COMPLETA — vincula el partido del torneo con un partido REAL de la
    // sección Partidos (hereda chat, momentos, estadísticas, timeline en vivo).
    // ═══════════════════════════════════════════════════════════
    function _gotoRealMatch(realMatchId) {
        if (typeof window.viewMatchDetails === 'function') {
            // NO cerramos el modal del torneo: abrimos el partido real ENCIMA (forceModal, z alto)
            // para que quede DENTRO del torneo y al cerrarlo volvás a la ficha del torneo. Antes
            // llamábamos viewMatchDetails sin forceModal → switchDashboardTab te sacaba a otra
            // sección del dashboard ("me saca de todo").
            window.viewMatchDetails(realMatchId, { forceModal: true });
            return;
        }
        // Fuera de la app (CRM / torneo.html): abrir por deep-link
        window.open('index.html?invite=' + encodeURIComponent(realMatchId), '_blank');
    }
    async function _openFullMatch(tournamentMatchId) {
        const sb = getSb();
        const { data: tm } = await sb.from('tournament_matches').select('*').eq('id', tournamentMatchId).single();
        if (!tm) { toast('Partido no encontrado.', 'error'); return; }
        if (tm.match_id) { _gotoRealMatch(tm.match_id); return; }
        const { data: t } = await sb.from('tournaments').select('*').eq('id', tm.tournament_id).single();
        if (!_isOrgActive(t?.organizer_email)) { toast('La organización todavía no habilitó la ficha completa de este partido.', 'info'); return; }
        // Crear el partido real (mismo formato que "crear partido" de la app)
        const nuevo = {
            name: `${tm.home_team_name} vs ${tm.away_team_name} — ${t.name}`,
            created_by: getUser().email,
            venue: tm.venue || t.venue || null,
            city: t.city || null,
            country: t.country || null,
            home_club_name: tm.home_team_name,
            away_club_name: tm.away_team_name,
            scheduled_at: tm.scheduled_at || null,
            is_open: false,
            status: 'proximo'
        };
        // El tipo de fútbol del torneo define la modalidad de la ficha (F5 / F7 / F11).
        if (t.match_format) nuevo.format = 'F' + String(t.match_format).replace(/\D/g, '');
        let { data: created, error } = await sb.from('matches').insert(nuevo).select('id').single();
        if (error && nuevo.format) {
            // Si la columna format no existe en esta base, crear la ficha igual.
            const bare = { ...nuevo }; delete bare.format;
            const retry = await sb.from('matches').insert(bare).select('id').single();
            created = retry.data; error = retry.error;
        }
        if (error) { toast('No se pudo crear la ficha: ' + error.message, 'error'); return; }
        try { await sb.from('tournament_matches').update({ match_id: created.id }).eq('id', tournamentMatchId); }
        catch(e){ /* si falta la columna match_id, la ficha igual queda creada */ }
        // Poblar la ficha con los planteles del torneo: así Timeline/Jugadores/Estadísticas
        // funcionan IGUAL que en un partido común (Gol/Asistencia/Cambio por jugador).
        try {
            const { data: roster } = await sb.from('tournament_players').select('player_name,user_email,position,number,team_id')
                .in('team_id', [tm.home_team_id, tm.away_team_id].filter(Boolean)).limit(60);
            for (const p of (roster||[])) {
                const side = p.team_id === tm.home_team_id ? 'home' : 'away';
                const row = {
                    match_id: created.id,
                    player_email: p.user_email || ('torneo+' + (p.number||'x') + '-' + side + '@canchero.local'),
                    player_name: p.player_name,
                    team: side,
                    position: p.position || null,
                    is_sub: false,
                    status: 'confirmado'
                };
                try { await sb.from('match_players').upsert([row], { onConflict: 'match_id,player_email' }); } catch(e){}
            }
        } catch(e){}
        toast('Ficha completa habilitada.', 'success');
        _gotoRealMatch(created.id);
    }

    // ═══════════════════════════════════════════════════════════
    // EDITAR INFORMACIÓN DEL TORNEO (siempre disponible para la org)
    // ═══════════════════════════════════════════════════════════
    async function _openEditTournament(tournamentId) {
        const sb = getSb();
        const { data: t } = await sb.from('tournaments').select('*').eq('id', tournamentId).single();
        if (!t) { toast('Torneo no encontrado.', 'error'); return; }
        if (!_isOrgActive(t.organizer_email)) { toast('Solo la organización creadora puede editar.', 'warning'); return; }
        const ex = document.getElementById('cte-modal'); if (ex) ex.remove();
        const inp = (id, label, val, type, ph) => `<div style="margin-bottom:10px;"><label style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:4px;">${label}</label><input id="${id}" type="${type||'text'}" value="${_esc(val==null?'':val)}" placeholder="${ph||''}" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;box-sizing:border-box;"></div>`;
        const selSty = 'width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;box-sizing:border-box;';
        const modal = document.createElement('div');
        modal.id = 'cte-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:100007;background:rgba(0,0,0,0.92);backdrop-filter:blur(6px);overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:20px;';
        modal.innerHTML = `
        <div style="background:#0d0d0d;border:1px solid #222;border-radius:18px;width:100%;max-width:460px;padding:20px;margin-top:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                <h3 style="font-family:Outfit,sans-serif;font-weight:900;font-size:15px;">Editar torneo</h3>
                <button onclick="document.getElementById('cte-modal').remove()" style="background:none;border:none;color:#888;font-size:22px;cursor:pointer;">&times;</button>
            </div>
            ${inp('cte-name','NOMBRE',t.name)}
            <div style="margin-bottom:10px;"><label style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:4px;">DESCRIPCIÓN / AVISOS</label><textarea id="cte-desc" rows="2" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;box-sizing:border-box;resize:vertical;">${_esc(t.description||'')}</textarea></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                ${inp('cte-city','CIUDAD',t.city)}
                ${inp('cte-venue','CANCHA / SEDE',t.venue)}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div style="margin-bottom:10px;"><label style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:4px;">FORMATO</label>
                    <select id="cte-format" onchange="document.getElementById('cte-gs-wrap').style.visibility=(this.value==='groups'?'visible':'hidden')" style="${selSty}">
                        <option value="groups" ${t.format==='groups'?'selected':''}>Fase de grupos</option>
                        <option value="elimination" ${t.format==='elimination'?'selected':''}>Eliminación directa</option>
                        <option value="league" ${t.format==='league'?'selected':''}>Liga (todos vs todos)</option>
                    </select></div>
                <div id="cte-gs-wrap" style="margin-bottom:10px;visibility:${t.format==='groups'?'visible':'hidden'};"><label style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:4px;">EQUIPOS POR GRUPO</label>
                    <select id="cte-group-size" style="${selSty}">
                        ${[3,4,5,6].map(n => `<option value="${n}" ${(parseInt(t.group_size)||4)===n?'selected':''}>${n} por grupo</option>`).join('')}
                    </select></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div style="margin-bottom:10px;"><label style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:4px;">TIPO DE FÚTBOL</label>
                    <select id="cte-match-format" style="${selSty}">
                        <option value="" ${!t.match_format?'selected':''}>Sin especificar</option>
                        ${[5,7,11].map(n => `<option value="${n}" ${String(t.match_format)===String(n)?'selected':''}>Fútbol ${n}</option>`).join('')}
                    </select></div>
                <div style="margin-bottom:10px;"><label style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:4px;">MÁX. EQUIPOS</label>
                    <select id="cte-max-teams" style="${selSty}">
                        ${[4,8,12,16,24,32,48,64].map(n => `<option value="${n}" ${(parseInt(t.max_teams)||8)===n?'selected':''}>${n} equipos</option>`).join('')}
                    </select></div>
            </div>
            <div style="margin-bottom:10px;"><label style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:4px;">PLAYOFFS (arrancan en)</label>
                <select id="cte-playoff" style="${selSty}">
                    ${[['auto','Automático (2 por grupo)'],['r32','16avos de final'],['r16','Octavos de final'],['quarterfinal','Cuartos de final'],['semifinal','Semifinales'],['final','Final directa'],['none','Sin playoffs (solo grupos)']]
                        .map(([v,l]) => `<option value="${v}" ${(t.playoff_from||'auto')===v?'selected':''}>${l}</option>`).join('')}
                </select>
                <div style="font-size:10px;color:#666;margin-top:4px;">Solo aplica al formato de grupos. Los cruces se completan solos al terminar la fase de grupos.</div></div>
            <label style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:11px 13px;cursor:pointer;margin-bottom:12px;">
                <input id="cte-double" type="checkbox" ${t.double_round?'checked':''} style="width:17px;height:17px;accent-color:var(--accent);cursor:pointer;">
                <span style="font-size:13px;font-weight:800;">Ida y vuelta</span>
            </label>
            <div style="font-size:11px;color:#777;margin:-4px 0 12px;line-height:1.5;"><i class='bx bx-info-circle'></i> Cambiar formato, tamaño de grupo o ida y vuelta no reescribe el fixture: hay que volver a generarlo.</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                ${inp('cte-start','INICIO',t.start_date,'date')}
                ${inp('cte-end','FIN',t.end_date,'date')}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                ${inp('cte-fee','INSCRIPCIÓN ($)',t.entry_fee,'number')}
                ${inp('cte-prize','PREMIOS',t.prize_pool,'text','Trofeo + $...')}
            </div>
            ${inp('cte-paylink','LINK DE PAGO',t.payment_link,'url','https://mpago.la/...')}
            <div style="margin-bottom:12px;"><label style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;display:block;margin-bottom:4px;">REGLAMENTO</label><textarea id="cte-rules" rows="3" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;box-sizing:border-box;resize:vertical;">${_esc(t.rules||'')}</textarea></div>
            <button onclick="CancheroTournaments._saveEditTournament('${tournamentId}')" style="width:100%;background:var(--accent);color:#000;border:none;border-radius:12px;padding:12px;font-weight:900;font-size:14px;cursor:pointer;">Guardar cambios</button>
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    }
    async function _saveEditTournament(tournamentId) {
        const sb = getSb();
        const v = id => document.getElementById(id)?.value ?? '';
        const upd = {
            name: v('cte-name').trim() || undefined,
            description: v('cte-desc').trim() || null,
            city: v('cte-city').trim() || null,
            venue: v('cte-venue').trim() || null,
            start_date: v('cte-start') || null,
            end_date: v('cte-end') || null,
            entry_fee: parseFloat(v('cte-fee')) || 0,
            prize_pool: v('cte-prize').trim() || null,
            payment_link: v('cte-paylink').trim() || null,
            rules: v('cte-rules').trim() || null,
            format: v('cte-format') || 'groups',
            double_round: !!document.getElementById('cte-double')?.checked,
            group_size: parseInt(v('cte-group-size')) || 4,
            match_format: v('cte-match-format') || null,
            max_teams: parseInt(v('cte-max-teams')) || 8,
            playoff_from: v('cte-playoff') || 'auto'
        };
        if (!upd.name) { toast('El nombre no puede quedar vacío.', 'warning'); return; }
        let { error } = await sb.from('tournaments').update(upd).eq('id', tournamentId);
        if (error) {
            const bare = { ...upd }; delete bare.group_size; delete bare.match_format; delete bare.playoff_from;
            const retry = await sb.from('tournaments').update(bare).eq('id', tournamentId);
            if (retry.error) { toast('Error: ' + retry.error.message, 'error'); return; }
            toast('Guardado. Corré la migración SQL para tipo de fútbol y tamaño de grupo.', 'warning');
        }
        document.getElementById('cte-modal')?.remove();
        toast('Torneo actualizado.', 'success');
        const { data: t } = await sb.from('tournaments').select('organizer_email').eq('id', tournamentId).single();
        document.getElementById('ctm-modal')?.remove();
        openTournamentManager(tournamentId, t?.organizer_email);
    }

    // Compartir el partido: DENTRO de Canchero (feed o mensaje) o fuera (link nativo).
    // Antes solo ofrecía el compartir del sistema y no había forma de publicarlo.
    async function _matchShare(matchId, tournamentId) {
        const sb = getSb();
        const { data: m } = await sb.from('tournament_matches')
            .select('home_team_name,away_team_name,home_score,away_score,scheduled_at').eq('id', matchId).single();
        const score = (m && m.home_score != null) ? ` ${m.home_score}-${m.away_score}` : ' vs ';
        const txt = m ? `${m.home_team_name}${score}${m.away_team_name}` : 'Partido';
        const url = (location.origin || 'https://canchero-app.vercel.app') + '/torneo.html?id=' + tournamentId;
        window.__ctShare = { matchId, tournamentId, txt, url };
        const ex = document.getElementById('ctshare-modal'); if (ex) ex.remove();
        const modal = document.createElement('div');
        modal.id = 'ctshare-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:100011;background:rgba(0,0,0,0.93);display:flex;align-items:center;justify-content:center;padding:20px;';
        const op = (fn, icon, titulo, sub) => `<button onclick="${fn}" style="display:flex;align-items:center;gap:12px;width:100%;background:#141414;border:1px solid #222;border-radius:14px;padding:14px;margin-bottom:8px;cursor:pointer;color:#fff;text-align:left;">
            <span style="width:40px;height:40px;border-radius:10px;background:rgba(186,255,0,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class='bx ${icon}' style="font-size:20px;color:var(--accent);"></i></span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:14px;font-weight:800;">${titulo}</span><span style="display:block;font-size:11px;color:#777;">${sub}</span></span>
            <i class='bx bx-chevron-right' style="color:#444;font-size:18px;"></i></button>`;
        modal.innerHTML = `
        <div style="background:#0d0d0d;border:1px solid #222;border-radius:18px;width:100%;max-width:400px;padding:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <h3 style="font-family:Outfit,sans-serif;font-weight:900;font-size:15px;"><i class='bx bx-share-alt' style="color:var(--accent);"></i> Compartir partido</h3>
                <button onclick="document.getElementById('ctshare-modal').remove()" style="background:none;border:none;color:#888;font-size:22px;cursor:pointer;">&times;</button>
            </div>
            <div style="font-size:12px;color:#888;margin-bottom:14px;">${_esc(txt)}</div>
            ${op("CancheroTournaments._shareToFeed()", 'bx-broadcast', 'Publicar en el feed', 'Lo ven quienes te siguen')}
            ${op("CancheroTournaments._shareToChat()", 'bx-message-dots', 'Enviar por mensaje', 'Elegí a quién mandárselo')}
            ${op("CancheroTournaments._shareOut()", 'bx-link-external', 'Compartir fuera de Canchero', 'WhatsApp, redes o copiar el link')}
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    }

    // Publica el partido en el feed, sellado con la identidad ACTIVA.
    async function _shareToFeed() {
        const s = window.__ctShare; if (!s) return;
        const sb = getSb(); const u = getUser();
        if (!u || !u.email) { toast('Iniciá sesión.', 'warning'); return; }
        const av = (window._pubAvatar && window._pubAvatar()) || {};
        const post = {
            user_email: u.email,
            user_name: av.name || u.name || u.email,
            user_role: (window._pubRole && window._pubRole()) || 'jugador',
            user_avatar: av.photo || u.photo || null,
            content: s.txt + '\n' + s.url,
            created_at: new Date().toISOString()
        };
        try { const bid = window._pubBizId && window._pubBizId(); if (bid) post.business_id = bid; } catch(e){}
        let r = await sb.from('posts').insert(post);
        if (r && r.error) {   // reintento sin las columnas que el esquema pueda no tener
            delete post.business_id; delete post.user_avatar;
            r = await sb.from('posts').insert(post);
        }
        document.getElementById('ctshare-modal')?.remove();
        if (r && r.error) { toast('No se pudo publicar: ' + r.error.message, 'error'); return; }
        toast('Partido publicado en tu feed.', 'success');
        try { if (window.loadFeed) window.loadFeed(); } catch(e){}
    }

    // Manda el partido por mensaje: abre el buscador de chats con el texto listo.
    function _shareToChat() {
        const s = window.__ctShare; if (!s) return;
        document.getElementById('ctshare-modal')?.remove();
        try { window._msgPrefill = s.txt + '\n' + s.url; } catch(e){}
        try {
            if (typeof switchDashboardTab === 'function') switchDashboardTab((window.userData && window.userData.role) || 'jugador', 'mensajes', null);
            if (window.CancheroMessaging) {
                window.CancheroMessaging.init();
                setTimeout(function(){
                    if (window.CancheroMessaging.openNewChatSearch) window.CancheroMessaging.openNewChatSearch();
                    toast('Elegí el chat: el partido se pega en el mensaje.', 'info');
                }, 400);
            }
        } catch(e){}
    }

    async function _shareOut() {
        const s = window.__ctShare; if (!s) return;
        document.getElementById('ctshare-modal')?.remove();
        try {
            if (navigator.share) { await navigator.share({ title: s.txt + ' · Canchero', text: s.txt, url: s.url }); return; }
        } catch(e){ return; }
        try { await navigator.clipboard.writeText(s.txt + ' — ' + s.url); toast('Link copiado'); }
        catch(e){ toast(s.url); }
    }

    // ═══════════════════════════════════════════════════════════
    // TABLA DE POSICIONES
    // ═══════════════════════════════════════════════════════════
    async function _ctmTabla(tournamentId, organizerEmail) {
        const sb = getSb();
        const { data: teams } = await sb.from('tournament_teams').select('*').eq('tournament_id', tournamentId).in('status', ['approved','eliminated']).order('points', { ascending: false }).order('goals_for', { ascending: false });
        const container = document.getElementById('ctm-content');
        if (!container) return;
        if (!teams || !teams.length) { container.innerHTML = '<div style="text-align:center;padding:40px;color:#555;">Sin datos de posiciones aún.</div>'; return; }
        // Agrupar por grupo_letter si hay grupos
        const hasGroups = teams.some(t => t.group_letter);
        if (hasGroups) {
            const groups = {};
            teams.forEach(t => { const g = t.group_letter || 'L'; if (!groups[g]) groups[g] = []; groups[g].push(t); });
            container.innerHTML = Object.entries(groups).map(([letter, groupTeams]) =>
                `<div style="margin-bottom:20px;">
                    <div style="font-size:11px;font-weight:900;color:#555;letter-spacing:1px;margin-bottom:8px;">GRUPO ${letter}</div>
                    ${_renderStandingsTable(groupTeams)}
                </div>`).join('');
        } else {
            container.innerHTML = _renderStandingsTable(teams);
        }
    }

    // Render de la tabla de posiciones en CUALQUIER contenedor (p.ej. la sección
    // "Tabla de Posiciones" del CRM) — muestra a todos los equipos aunque tengan 0 puntos.
    async function renderStandingsInto(tournamentId, el) {
        if (!el) return;
        const sb = getSb();
        el.innerHTML = '<div style="text-align:center;padding:24px;color:#555;"><i class="bx bx-loader-alt bx-spin" style="font-size:22px;"></i></div>';
        const { data: teams } = await sb.from('tournament_teams').select('*').eq('tournament_id', tournamentId).in('status', ['approved','eliminated']).order('points', { ascending: false });
        if (!teams || !teams.length) { el.innerHTML = '<div style="text-align:center;padding:28px;color:#555;">Sin equipos aprobados todavía.</div>'; return; }
        try { await _healTeamLogos(teams, false); } catch(e){}
        const hasGroups = teams.some(t => t.group_letter);
        if (hasGroups) {
            const groups = {};
            teams.forEach(t => { const g = t.group_letter || 'L'; if (!groups[g]) groups[g] = []; groups[g].push(t); });
            el.innerHTML = Object.entries(groups).map(([letter, groupTeams]) =>
                `<div style="margin-bottom:18px;"><div style="font-size:11px;font-weight:900;color:#555;letter-spacing:1px;margin-bottom:8px;">GRUPO ${letter}</div>${_renderStandingsTable(groupTeams)}</div>`).join('');
        } else {
            el.innerHTML = _renderStandingsTable(teams);
        }
    }

    function _renderStandingsTable(teams) {
        const sorted = [...teams].sort((a,b) => (b.points-a.points) || ((b.goals_for-b.goals_against)-(a.goals_for-a.goals_against)) || (b.goals_for-a.goals_for));
        return `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead><tr style="color:#555;font-weight:900;letter-spacing:0.5px;font-size:10px;">
                <th style="text-align:left;padding:6px 8px;">#</th>
                <th style="text-align:left;padding:6px 8px;">EQUIPO</th>
                <th style="padding:6px 5px;text-align:center;">PJ</th>
                <th style="padding:6px 5px;text-align:center;">G</th>
                <th style="padding:6px 5px;text-align:center;">E</th>
                <th style="padding:6px 5px;text-align:center;">P</th>
                <th style="padding:6px 5px;text-align:center;">GF</th>
                <th style="padding:6px 5px;text-align:center;">GC</th>
                <th style="padding:6px 5px;text-align:center;">DG</th>
                <th style="padding:6px 6px;text-align:center;color:var(--accent);">PTS</th>
            </tr></thead>
            <tbody>
                ${sorted.map((t, i) => {
                    const pj = (t.wins||0)+(t.draws||0)+(t.losses||0);
                    const dg = (t.goals_for||0)-(t.goals_against||0);
                    // Liquid glass: sin colores mezclados — solo acento verde y neutros.
                    const top = i === 0;
                    const rowStyle = top ? 'background:rgba(186,255,0,0.06);' : (i < 2 ? 'background:rgba(255,255,255,0.025);' : '');
                    const clickable = 'cursor:pointer;';
                    const onclick = `onclick="CancheroTournaments._openTeamInfo('${t.id}')"`;
                    return `<tr ${onclick} style="${rowStyle}${clickable}border-bottom:1px solid rgba(255,255,255,0.05);">
                        <td style="padding:9px 8px;font-weight:900;"><span style="display:inline-flex;width:22px;height:22px;border-radius:8px;align-items:center;justify-content:center;font-size:11px;${top?'background:var(--accent);color:#000;':'background:rgba(255,255,255,0.05);color:#888;border:1px solid rgba(255,255,255,0.08);'}">${i+1}</span></td>
                        <td style="padding:9px 8px;font-weight:700;"><span style="display:inline-flex;align-items:center;gap:9px;">${_shieldHTML(t.logo_url, t.team_name, 32)}<span style="overflow:hidden;text-overflow:ellipsis;">${_esc(t.team_name)}</span></span></td>
                        <td style="padding:9px 5px;text-align:center;color:#888;">${pj}</td>
                        <td style="padding:9px 5px;text-align:center;color:#ccc;">${t.wins||0}</td>
                        <td style="padding:9px 5px;text-align:center;color:#888;">${t.draws||0}</td>
                        <td style="padding:9px 5px;text-align:center;color:#888;">${t.losses||0}</td>
                        <td style="padding:9px 5px;text-align:center;color:#888;">${t.goals_for||0}</td>
                        <td style="padding:9px 5px;text-align:center;color:#888;">${t.goals_against||0}</td>
                        <td style="padding:9px 5px;text-align:center;color:${dg>0?'var(--accent)':'#888'};font-weight:${dg>0?'800':'400'};">${dg>0?'+':''}${dg}</td>
                        <td style="padding:9px 6px;text-align:center;font-weight:900;color:var(--accent);font-size:14px;">${t.points||0}</td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table></div>`;
    }

    // ═══════════════════════════════════════════════════════════
    // JUGADORES DEL TORNEO
    // ═══════════════════════════════════════════════════════════
    async function _ctmJugadores(tournamentId, organizerEmail) {
        const sb = getSb();
        const { data: players } = await sb.from('tournament_players').select('*,tournament_teams(team_name)').eq('tournament_id', tournamentId).order('player_name');
        const container = document.getElementById('ctm-content');
        if (!container) return;
        const isOrg = _isOrgActive(organizerEmail);
        if (!players || !players.length) { container.innerHTML = '<div style="text-align:center;padding:40px;color:#555;">Sin jugadores registrados aún.</div>'; return; }
        container.innerHTML = `<div style="font-size:11px;color:#555;margin-bottom:10px;">${players.length} jugadores en el torneo</div>
        <div style="display:grid;gap:6px;">
            ${players.map(p => { const susp = (p.suspended_matches||0) > 0; return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.03);border:1px solid ${susp?'rgba(255,68,68,0.3)':'rgba(255,255,255,0.06)'};border-radius:12px;">
                <div onclick="CancheroTournaments._openPlayerInfo('${p.id}')" style="width:34px;height:34px;border-radius:50%;flex-shrink:0;background:${p.avatar_url?`#222 center/cover url('${_esc(p.avatar_url)}')`:'rgba(186,255,0,0.1)'};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:var(--accent);cursor:pointer;">${p.avatar_url?'':(p.number||'—')}</div>
                <div onclick="CancheroTournaments._openPlayerInfo('${p.id}')" style="flex:1;min-width:0;cursor:pointer;">
                    <div style="font-weight:700;font-size:13px;">${_esc(p.player_name)} <i class='bx bx-chevron-right' style="font-size:11px;color:var(--accent);"></i>${susp?" <span style='font-size:9px;font-weight:900;color:#ff6b6b;background:rgba(255,68,68,0.1);border-radius:6px;padding:1px 6px;vertical-align:1px;'>SUSPENDIDO</span>":''}</div>
                    <div style="font-size:10px;color:#666;">${_esc(p.tournament_teams?.team_name||'—')} · ${p.position?(POS_LABEL[p.position]||p.position):'—'}</div>
                </div>
                <div style="font-size:11px;color:#666;white-space:nowrap;"><i class='bx bx-football'></i>${p.goals||0} · <i class='bx bx-run'></i>${p.assists||0} · <span style="display:inline-block;width:8px;height:11px;background:#ffcc00;border-radius:1px;vertical-align:-1px;"></span>${p.yellow_cards||0}</div>
                ${isOrg ? `<div style="display:flex;gap:4px;flex-shrink:0;">
                    <button onclick="CancheroTournaments._toggleSuspend('${p.id}','${tournamentId}','${(organizerEmail||'').replace(/'/g,"\\'")}' )" title="${susp?'Quitar suspensión':'Suspender'}" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);color:${susp?'#ff6b6b':'#888'};border-radius:8px;padding:6px 8px;font-size:13px;cursor:pointer;"><i class='bx bx-block'></i></button>
                    <button onclick="CancheroTournaments._deletePlayer('${p.id}','${tournamentId}','${(organizerEmail||'').replace(/'/g,"\\'")}' )" title="Eliminar del torneo" style="background:rgba(255,68,68,0.08);border:1px solid rgba(255,68,68,0.2);color:#ff4444;border-radius:8px;padding:6px 8px;font-size:13px;cursor:pointer;"><i class='bx bx-trash'></i></button>
                </div>` : ''}
            </div>`; }).join('')}
        </div>`;
    }

    // Suspender / quitar suspensión de un jugador del torneo.
    async function _toggleSuspend(playerId, tournamentId, organizerEmail) {
        const sb = getSb();
        const { data: p } = await sb.from('tournament_players').select('suspended_matches,player_name').eq('id', playerId).single();
        if (!p) return;
        const now = (p.suspended_matches||0) > 0 ? 0 : 1;
        const { error } = await sb.from('tournament_players').update({ suspended_matches: now }).eq('id', playerId);
        if (error) { toast('Error: ' + error.message, 'error'); return; }
        toast(now ? `${p.player_name} suspendido.` : `Suspensión quitada a ${p.player_name}.`, now ? 'warning' : 'success');
        _ctmJugadores(tournamentId, organizerEmail);
    }

    // Eliminar un jugador del torneo (org o el propio club vía Jugadores del equipo).
    async function _deletePlayer(playerId, tournamentId, organizerEmail) {
        if (!confirm('¿Eliminar este jugador del torneo?')) return;
        const sb = getSb();
        const { data: p } = await sb.from('tournament_players').select('team_id').eq('id', playerId).single();
        const { error } = await sb.from('tournament_players').delete().eq('id', playerId);
        if (error) { toast('Error: ' + error.message, 'error'); return; }
        if (p && p.team_id) {
            try { await sb.from('tournament_teams').update({ players_count: ((await sb.from('tournament_players').select('*',{count:'exact',head:true}).eq('team_id',p.team_id)).count) }).eq('id', p.team_id); } catch(e){}
        }
        toast('Jugador eliminado del torneo.', 'success');
        _ctmJugadores(tournamentId, organizerEmail);
    }

    // ═══════════════════════════════════════════════════════════
    // GOLEADORES / RANKING
    // ═══════════════════════════════════════════════════════════
    // ── Podio 1-2-3 al estilo de Buscar → Ranking: el 1º al medio y más grande.
    // items: [{ id, nombre, equipo, valor, avatar }]
    function _podioHTML(items, unidad) {
        if (!items || items.length < 3) return '';
        const [p1, p2, p3] = items;
        const medalla = { 1:'#ffd23f', 2:'#c8d2dc', 3:'#cd7f32' };
        const col = (p, puesto, alto, tam) => `
        <div onclick="${p.id ? `CancheroTournaments._openPlayerInfo('${p.id}')` : ''}" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0;cursor:${p.id?'pointer':'default'};">
            <span style="position:relative;width:${tam}px;height:${tam}px;border-radius:50%;flex-shrink:0;background:${p.avatar?`#111 center/cover url('${_esc(p.avatar)}')`:'rgba(186,255,0,0.1)'};border:2.5px solid ${medalla[puesto]};box-shadow:0 0 16px ${medalla[puesto]}44;display:flex;align-items:center;justify-content:center;font-size:${Math.round(tam*0.36)}px;font-weight:900;color:var(--accent);">${p.avatar?'':((p.nombre||'?')[0]||'?').toUpperCase()}
                <span style="position:absolute;bottom:-6px;right:-4px;width:22px;height:22px;border-radius:50%;background:${medalla[puesto]};color:#000;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid #070907;">${puesto}</span>
            </span>
            <span style="font-size:12px;font-weight:800;text-align:center;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_esc(p.nombre||'')}</span>
            <span style="font-size:9.5px;color:#666;text-align:center;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_esc(p.equipo||'—')}</span>
            <div style="width:100%;height:${alto}px;background:linear-gradient(180deg,rgba(186,255,0,0.16),rgba(186,255,0,0.03));border:1px solid rgba(186,255,0,0.2);border-bottom:none;border-radius:10px 10px 0 0;display:flex;align-items:flex-start;justify-content:center;padding-top:8px;">
                <span style="font-size:17px;font-weight:900;color:var(--accent);">${p.valor}</span>
            </div>
        </div>`;
        return `<div style="display:flex;align-items:flex-end;gap:8px;margin:14px 0 4px;padding:16px 10px 0;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.07);border-radius:16px;backdrop-filter:blur(10px);overflow:hidden;">
            ${col(p2, 2, 54, 50)}${col(p1, 1, 76, 66)}${col(p3, 3, 40, 46)}
        </div><div style="text-align:center;font-size:10px;color:#555;margin-bottom:6px;">${unidad}</div>`;
    }

    async function _ctmGoleadores(tournamentId) {
        const sb = getSb();
        const { data: players } = await sb.from('tournament_players').select('*,tournament_teams(team_name)').eq('tournament_id', tournamentId).order('goals', {ascending:false}).order('assists',{ascending:false}).limit(60);
        const container = document.getElementById('ctm-content');
        if (!container) return;
        const topGoals = (players||[]).filter(p => (p.goals||0) > 0 || (p.assists||0) > 0);

        // ── Rankings extra: asistencias y arqueros (vallas invictas) ──────────
        // Las vallas se calculan de los partidos ya jugados: no hay columna propia,
        // así que se cuentan los partidos con 0 goles en contra por equipo.
        let bloquesExtra = '';
        try {
            const { data: matches } = await sb.from('tournament_matches')
                .select('home_team_id,away_team_id,home_score,away_score')
                .eq('tournament_id', tournamentId);
            const vallas = {};   // teamId -> partidos sin goles en contra
            (matches||[]).forEach(mm => {
                if (mm.home_score == null || mm.away_score == null) return;
                if (mm.away_score === 0 && mm.home_team_id) vallas[mm.home_team_id] = (vallas[mm.home_team_id]||0) + 1;
                if (mm.home_score === 0 && mm.away_team_id) vallas[mm.away_team_id] = (vallas[mm.away_team_id]||0) + 1;
            });
            const arqueros = (players||[])
                .filter(p => /arq|gk|golero|portero/i.test(p.position||''))
                .map(p => ({ p, v: vallas[p.team_id] || 0 }))
                .filter(x => x.v > 0)
                .sort((a,b) => b.v - a.v).slice(0, 10);
            const asistidores = (players||[]).filter(p => (p.assists||0) > 0)
                .sort((a,b) => (b.assists||0) - (a.assists||0)).slice(0, 10);

            const fila = (i, nombre, equipo, valor, avatar) => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                <span style="display:inline-flex;width:22px;height:22px;border-radius:8px;align-items:center;justify-content:center;font-size:11px;font-weight:900;flex-shrink:0;${i<3?'background:var(--accent);color:#000;':'background:rgba(255,255,255,0.05);color:#888;'}">${i+1}</span>
                <span style="width:26px;height:26px;border-radius:50%;flex-shrink:0;background:${avatar?`#222 center/cover url('${_esc(avatar)}')`:'rgba(186,255,0,0.1)'};"></span>
                <span style="flex:1;min-width:0;"><span style="display:block;font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_esc(nombre)}</span><span style="display:block;font-size:10px;color:#666;">${_esc(equipo||'—')}</span></span>
                <span style="font-size:14px;font-weight:900;color:var(--accent);flex-shrink:0;">${valor}</span>
            </div>`;
            const bloque = (titulo, icono, filas, vacio) => `<div style="margin-top:22px;">
                <div style="font-size:11px;font-weight:900;color:#555;letter-spacing:1px;margin-bottom:8px;display:flex;align-items:center;gap:6px;"><i class='bx ${icono}' style="color:var(--accent);"></i>${titulo}</div>
                ${filas || `<div style="text-align:center;padding:18px;color:#555;font-size:12px;">${vacio}</div>`}</div>`;

            const aPodio = asistidores.map(p => ({ id:p.id, nombre:p.player_name, equipo:p.tournament_teams?.team_name, valor:p.assists||0, avatar:p.avatar_url }));
            const kPodio = arqueros.map(x => ({ id:x.p.id, nombre:x.p.player_name, equipo:x.p.tournament_teams?.team_name, valor:x.v, avatar:x.p.avatar_url }));
            bloquesExtra =
                bloque('MEJORES ASISTIDORES', 'bx-run',
                    _podioHTML(aPodio, 'asistencias') +
                    asistidores.slice(aPodio.length >= 3 ? 3 : 0).map((p,i) => fila(i + (aPodio.length >= 3 ? 3 : 0), p.player_name, p.tournament_teams?.team_name, p.assists||0, p.avatar_url)).join(''),
                    'Sin asistencias registradas aún.')
              + bloque('ARQUEROS · VALLAS INVICTAS', 'bx-shield',
                    _podioHTML(kPodio, 'partidos con la valla invicta') +
                    arqueros.slice(kPodio.length >= 3 ? 3 : 0).map((x,i) => fila(i + (kPodio.length >= 3 ? 3 : 0), x.p.player_name, x.p.tournament_teams?.team_name, x.v, x.p.avatar_url)).join(''),
                    'Todavía no hay partidos con la valla invicta.')
              + `<div style="margin-top:18px;font-size:10.5px;color:#555;line-height:1.5;"><i class='bx bx-info-circle'></i> El MVP por partido se va a sumar cuando esté la votación; hoy no hay dato para rankearlo.</div>`;
        } catch(e){ console.warn('rankings extra:', e); }

        const gPodio = topGoals.filter(p => (p.goals||0) > 0)
            .map(p => ({ id:p.id, nombre:p.player_name, equipo:p.tournament_teams?.team_name, valor:p.goals||0, avatar:p.avatar_url }));
        container.innerHTML = `<div style="font-size:11px;font-weight:900;color:#555;letter-spacing:1px;margin-bottom:10px;">TABLA DE GOLEADORES</div>
        ${_podioHTML(gPodio, 'goles')}
        ${!topGoals.length ? '<div style="text-align:center;padding:30px;color:#555;">Sin goles registrados aún.</div>' :
        `<table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead><tr style="color:#555;font-size:10px;font-weight:900;">
                <th style="text-align:left;padding:6px 8px;">#</th>
                <th style="text-align:left;padding:6px 8px;">JUGADOR</th>
                <th style="text-align:left;padding:6px 8px;">EQUIPO</th>
                <th style="padding:6px 6px;text-align:center;" title="Goles"><i class='bx bx-football'></i></th>
                <th style="padding:6px 6px;text-align:center;" title="Asistencias"><i class='bx bx-run'></i></th>
                <th style="padding:6px 6px;text-align:center;" title="Amarillas"><span style="display:inline-block;width:8px;height:11px;background:#ffcc00;border-radius:1px;"></span></th>
            </tr></thead>
            <tbody>
                ${topGoals.map((p,i) => { const top3 = i < 3; return `<tr onclick="CancheroTournaments._openPlayerInfo('${p.id}')" style="border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;">
                    <td style="padding:9px 8px;font-weight:900;"><span style="display:inline-flex;width:22px;height:22px;border-radius:8px;align-items:center;justify-content:center;font-size:11px;${top3?'background:var(--accent);color:#000;':'background:rgba(255,255,255,0.05);color:#888;border:1px solid rgba(255,255,255,0.08);'}">${i+1}</span></td>
                    <td style="padding:9px 8px;font-weight:700;"><span style="display:inline-flex;align-items:center;gap:8px;"><span style="width:26px;height:26px;border-radius:50%;flex-shrink:0;background:${p.avatar_url?`#222 center/cover url('${_esc(p.avatar_url)}')`:'rgba(186,255,0,0.1)'};"></span>${_esc(p.player_name)}</span></td>
                    <td style="padding:8px 8px;color:#666;">${_esc(p.tournament_teams?.team_name||'—')}</td>
                    <td style="padding:8px 6px;text-align:center;font-weight:700;color:var(--accent);">${p.goals||0}</td>
                    <td style="padding:8px 6px;text-align:center;">${p.assists||0}</td>
                    <td style="padding:8px 6px;text-align:center;color:#ffaa00;">${p.yellow_cards||0}</td>
                </tr>`; }).join('')}
            </tbody>
        </table>`}${bloquesExtra}`;
    }

    // ═══════════════════════════════════════════════════════════
    // TAB SWITCHER
    // ═══════════════════════════════════════════════════════════
    async function _ctmTab(tab, tournamentId, organizerEmail, btn) {
        document.querySelectorAll('.ctm-tab').forEach(b => {
            b.style.background = 'transparent'; b.style.color = '#666'; b.style.borderColor = '#222';
        });
        if (btn) { btn.style.background = 'rgba(186,255,0,0.12)'; btn.style.color = 'var(--accent)'; btn.style.borderColor = 'rgba(186,255,0,0.3)'; }
        const content = document.getElementById('ctm-content');
        if (content) content.innerHTML = '<div style="text-align:center;padding:30px;color:#555;"><i class="bx bx-loader-alt bx-spin" style="font-size:24px;"></i></div>';
        if (tab === 'equipos') await _ctmEquipos(tournamentId, organizerEmail);
        else if (tab === 'fixture') await _ctmFixture(tournamentId, organizerEmail);
        else if (tab === 'tabla') await _ctmTabla(tournamentId, organizerEmail);
        else if (tab === 'jugadores') await _ctmJugadores(tournamentId, organizerEmail);
        else if (tab === 'goleadores') await _ctmGoleadores(tournamentId);
        else if (tab === 'info') { const c = document.getElementById('ctm-content'); if (c) await _ctpInfo(tournamentId, organizerEmail, c); }
        else if (tab === 'solicitudes') await _ctmSolicitudes(tournamentId, organizerEmail);
    }

    // ═══════════════════════════════════════════════════════════
    // SOLICITUDES DE PARTICIPACIÓN (equipos pendientes)
    // ═══════════════════════════════════════════════════════════
    async function _ctmSolicitudes(tournamentId, organizerEmail) {
        const sb = getSb();
        const { data: teams } = await sb.from('tournament_teams').select('*').eq('tournament_id', tournamentId).eq('status','pending').order('created_at');
        const container = document.getElementById('ctm-content');
        if (!container) return;
        if (!teams || !teams.length) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:#555;"><i class="bx bx-user-plus" style="font-size:36px;color:#222;display:block;margin-bottom:10px;"></i>Sin solicitudes pendientes.<br><span style="font-size:11px;">Cuando un equipo pida unirse al torneo, aparece acá.</span></div>';
            return;
        }
        container.innerHTML = teams.map(team => `
        <div style="background:#111;border:1px solid #1e1e1e;border-radius:14px;padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            ${_shieldHTML(team.logo_url, team.team_name, 46)}
            <div style="flex:1;min-width:140px;">
                <div style="font-weight:800;font-size:14px;">${_esc(team.team_name)}</div>
                <div style="font-size:11px;color:#666;margin-top:2px;">Capitán: ${_esc(team.captain_name||team.captain_email||'—')}${team.payment_proof_url?` · <a href="${_esc(team.payment_proof_url)}" target="_blank" style="color:var(--accent);">comprobante</a>`:''}</div>
            </div>
            <div style="display:flex;gap:6px;">
                <button onclick="CancheroTournaments._solicAction('${team.id}','approved','${tournamentId}','${(organizerEmail||'').replace(/'/g,"\\'")}' )" style="background:rgba(0,230,118,0.12);color:#00e676;border:1px solid rgba(0,230,118,0.3);border-radius:10px;padding:8px 14px;font-size:12px;font-weight:800;cursor:pointer;"><i class='bx bx-check'></i> Aceptar</button>
                <button onclick="CancheroTournaments._solicAction('${team.id}','rejected','${tournamentId}','${(organizerEmail||'').replace(/'/g,"\\'")}' )" style="background:rgba(255,68,68,0.08);color:#ff4444;border:1px solid rgba(255,68,68,0.2);border-radius:10px;padding:8px 14px;font-size:12px;font-weight:800;cursor:pointer;"><i class='bx bx-x'></i> Rechazar</button>
            </div>
        </div>`).join('');
    }

    async function _solicAction(teamId, status, tournamentId, organizerEmail) {
        const sb = getSb();
        const { data: team } = await sb.from('tournament_teams').update({ status }).eq('id', teamId).select('*').single();
        toast(status === 'approved' ? 'Equipo aceptado en el torneo.' : 'Solicitud rechazada.', status === 'approved' ? 'success' : 'warning');
        // Inscripción paga → ofrecer registrar el ingreso en la Caja del CRM (con aviso previo)
        if (status === 'approved' && team) {
            try {
                const { data: tf } = await sb.from('tournaments').select('name,entry_fee').eq('id', tournamentId).single();
                const fee = (tf && tf.entry_fee) || 0;
                if (fee > 0 && team.payment_status !== 'paid' && team.payment_status !== 'waived') {
                    if (confirm(`El torneo tiene inscripción de $${fee}. ¿Registrar el ingreso de ${team.team_name} en Caja y marcarlo como PAGADO?\n(Cancelar = queda pendiente de pago)`)) {
                        await sb.from('business_cashflow').insert({ business_email: organizerEmail, type: 'ingreso', concept: 'Inscripción: ' + team.team_name + (tf && tf.name ? ' — ' + tf.name : ''), amount: fee });
                        await sb.from('tournament_teams').update({ payment_status: 'paid' }).eq('id', teamId);
                        if (team.captain_email) { try { await sb.from('notifications').insert({ recipient_email: team.captain_email, type: 'torneo_pago', actor_name: (tf && tf.name) || 'Torneo', actor_email: organizerEmail, message: `Recibimos el pago de inscripción de ${team.team_name}. ¡Gracias! Nos vemos en la cancha.`, post_id: tournamentId, read: false }); } catch(e){} }
                        toast('Ingreso registrado en Caja.', 'success');
                    }
                }
            } catch(e){}
        }
        // Avisar al capitán del equipo
        try {
            if (team && team.captain_email) {
                const { data: t } = await sb.from('tournaments').select('name').eq('id', tournamentId).single();
                await sb.from('notifications').insert({
                    recipient_email: team.captain_email,
                    type: 'torneo_solicitud',
                    actor_name: (t && t.name) || 'Torneo',
                    actor_email: organizerEmail || null,
                    message: status === 'approved'
                        ? `Tu equipo ${team.team_name} fue ACEPTADO en ${t?t.name:'el torneo'}`
                        : `Tu equipo ${team.team_name} fue rechazado en ${t?t.name:'el torneo'}`,
                    post_id: tournamentId,
                    read: false
                });
            }
        } catch(e){}
        _refreshSolicBadge(tournamentId);
        _ctmSolicitudes(tournamentId, organizerEmail);
    }

    // ═══════════════════════════════════════════════════════════
    // VISTA PÚBLICA DEL TORNEO (para cualquier usuario)
    // ═══════════════════════════════════════════════════════════
    async function openPublicView(tournamentId) {
        const sb = getSb();
        const { data: t } = await sb.from('tournaments').select('*').eq('id', tournamentId).single();
        if (!t) { toast('Torneo no encontrado.', 'error'); return; }
        const isOrg = _isOrgActive(t.organizer_email);
        const existing = document.getElementById('ctp-modal');
        if (existing) existing.remove();
        const modal = document.createElement('div');
        modal.id = 'ctp-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#070907;overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;' ; modal.classList.add('ct-noscrollbar'); _injectTabCss();
        const statusColors = { draft:'#555', registration:'#ffaa00', active:'#00e676', finished:'#4fc3f7', cancelled:'#ff4444' };
        modal.innerHTML = `
        <div style="max-width:680px;margin:0 auto;padding:20px 20px calc(120px + env(safe-area-inset-bottom));">
            <!-- Header del torneo -->
            <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 0 8px;">
                <button onclick="document.getElementById('ctp-modal').remove()" style="background:none;border:none;color:#888;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class='bx bx-arrow-back'></i> Volver</button>
                ${isOrg ? `<button onclick="CancheroTournaments.openTournamentManager('${tournamentId}','${(t.organizer_email||'').replace(/'/g,"\\'")}' )" style="background:rgba(186,255,0,0.08);color:var(--accent);border:1px solid rgba(186,255,0,0.25);border-radius:10px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;"><i class='bx bx-edit'></i> Gestionar</button>` : ''}
            </div>
            ${t.cover_url ? `<img src="${t.cover_url}" style="width:100%;height:160px;object-fit:cover;border-radius:16px;margin-bottom:16px;" onerror="this.style.display='none'">` : ''}
            <div style="padding:0 4px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;">
                    <h1 style="font-family:Outfit,sans-serif;font-weight:900;font-size:22px;margin:0;">${t.name}</h1>
                    <span style="font-size:11px;font-weight:700;color:${statusColors[t.status]||'#888'};background:rgba(255,255,255,0.05);border-radius:8px;padding:3px 10px;">${_formatStatus(t.status)}</span>
                </div>
                <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
                    ${t.city ? `<span style="font-size:12px;color:#666;"><i class='bx bx-map'></i> ${t.city}</span>` : ''}
                    ${t.start_date ? `<span style="font-size:12px;color:#666;"><i class='bx bx-calendar'></i> ${new Date(t.start_date+'T00:00').toLocaleDateString('es-UY',{day:'numeric',month:'short',year:'numeric'})}</span>` : ''}
                    ${t.prize_pool ? `<span style="font-size:12px;color:var(--accent);"><i class='bx bx-trophy'></i> ${t.prize_pool}</span>` : ''}
                    ${t.entry_fee > 0 ? `<span style="font-size:12px;color:#ffaa00;"><i class='bx bx-dollar-circle'></i> Inscripción: $${t.entry_fee}</span>` : '<span style="font-size:12px;color:#00e676;"><i class=\'bx bx-dollar-circle\'></i> Gratis</span>'}
                </div>
                ${t.description ? `<p style="font-size:13px;color:#aaa;line-height:1.6;margin-bottom:12px;">${t.description}</p>` : ''}
            </div>
            <!-- Tabs públicas (envuelven para verse todas) -->
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">
                <button class="ctp-tab active" onclick="CancheroTournaments._ctpTab('tabla','${tournamentId}','${(t.organizer_email||'').replace(/'/g,"\\'")}',this)" style="background:rgba(186,255,0,0.12);color:var(--accent);border:1px solid rgba(186,255,0,0.3);border-radius:10px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;"><i class='bx bx-list-ol'></i> Tabla</button>
                <button class="ctp-tab" onclick="CancheroTournaments._ctpTab('fixture','${tournamentId}','${(t.organizer_email||'').replace(/'/g,"\\'")}',this)" style="background:transparent;color:#666;border:1px solid #222;border-radius:10px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;"><i class='bx bx-calendar'></i> Fixture</button>
                <button class="ctp-tab" onclick="CancheroTournaments._ctpTab('equipos','${tournamentId}','${(t.organizer_email||'').replace(/'/g,"\\'")}',this)" style="background:transparent;color:#666;border:1px solid #222;border-radius:10px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;"><i class='bx bx-shield-quarter'></i> Equipos</button>
                <button class="ctp-tab" onclick="CancheroTournaments._ctpTab('goleadores','${tournamentId}','${(t.organizer_email||'').replace(/'/g,"\\'")}',this)" style="background:transparent;color:#666;border:1px solid #222;border-radius:10px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;"><i class='bx bx-football'></i> Goleadores</button>
                <button class="ctp-tab" onclick="CancheroTournaments._ctpTab('jugadores','${tournamentId}','${(t.organizer_email||'').replace(/'/g,"\\'")}',this)" style="background:transparent;color:#666;border:1px solid #222;border-radius:10px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;"><i class='bx bx-group'></i> Jugadores</button>
                <button class="ctp-tab" onclick="CancheroTournaments._ctpTab('info','${tournamentId}','${(t.organizer_email||'').replace(/'/g,"\\'")}',this)" style="background:transparent;color:#666;border:1px solid #222;border-radius:10px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;"><i class='bx bx-info-circle'></i> Info</button>
                ${t.status === 'registration' && !isOrg ? `<button class="ctp-tab" onclick="CancheroTournaments._ctpTab('inscribir','${tournamentId}','${(t.organizer_email||'').replace(/'/g,"\\'")}',this)" style="background:rgba(186,255,0,0.05);color:var(--accent);border:1px solid rgba(186,255,0,0.2);border-radius:10px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;"><i class='bx bx-edit'></i> Inscribirme</button>` : ''}
            </div>
            <div id="ctp-content" style="min-height:200px;"></div>
            ${t.rules ? `<div style="margin-top:16px;padding:14px;background:#111;border:1px solid #1e1e1e;border-radius:12px;"><div style="font-size:10px;font-weight:900;color:#555;letter-spacing:1px;margin-bottom:8px;">REGLAMENTO</div><p style="font-size:12px;color:#888;line-height:1.6;white-space:pre-wrap;">${t.rules}</p></div>` : ''}
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
        _ctpTab('tabla', tournamentId, t.organizer_email, modal.querySelector('.ctp-tab'));
    }

    // ═══════════════════════════════════════════════════════════
    // VISTA PÚBLICA · INSCRIBIRME
    // Se puede elegir un equipo YA registrado en Canchero (se lleva escudo y ciudad) o
    // cargar uno suelto si todavía no existe.
    // ═══════════════════════════════════════════════════════════
    async function _ctpInscribir(tournamentId, organizerEmail, el) {
        const sb = getSb();
        const user = getUser();
        const caja = 'padding:16px;background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.08);border-radius:16px;backdrop-filter:blur(10px);';
        if (!user || !user.email) {
            el.innerHTML = `<div style="${caja}text-align:center;">
                <i class='bx bx-lock-alt' style="font-size:32px;color:var(--accent);"></i>
                <div style="font-weight:900;font-size:15px;margin:10px 0 6px;">Iniciá sesión para inscribirte</div>
                <div style="font-size:12px;color:#888;line-height:1.5;">Con tu cuenta de Canchero podés anotar tu equipo y seguir el torneo.</div>
            </div>`;
            return;
        }
        // Equipos del usuario: los que creó y los que capitanea.
        let míos = [];
        try {
            const { data: a } = await sb.from('clubs').select('id,name,city,logo,logo_url').eq('owner_email', user.email).limit(20);
            const { data: b } = await sb.from('clubs').select('id,name,city,logo,logo_url').eq('captain_email', user.email).limit(20);
            const map = {};
            [...(a||[]), ...(b||[])].forEach(c => { map[c.id] = c; });
            míos = Object.values(map);
        } catch(e){}
        // Los que ya están anotados en ESTE torneo no se ofrecen de nuevo.
        let yaAnotados = new Set();
        try {
            const { data: ya } = await sb.from('tournament_teams').select('team_name,club_id,captain_email').eq('tournament_id', tournamentId);
            (ya||[]).forEach(x => { if (x.club_id) yaAnotados.add(x.club_id); });
            if ((ya||[]).some(x => (x.captain_email||'').toLowerCase() === user.email.toLowerCase())) {
                el.innerHTML = `<div style="${caja}text-align:center;">
                    <i class='bx bx-check-circle' style="font-size:32px;color:#00e676;"></i>
                    <div style="font-weight:900;font-size:15px;margin:10px 0 6px;">Ya enviaste tu solicitud</div>
                    <div style="font-size:12px;color:#888;line-height:1.5;">La organización la va a revisar. Te avisamos cuando la aprueben.</div>
                </div>`;
                return;
            }
        } catch(e){}
        const disponibles = míos.filter(c => !yaAnotados.has(c.id));

        el.innerHTML = `
        <div style="${caja}margin-bottom:12px;">
            <div style="font-weight:900;font-size:14px;margin-bottom:4px;"><i class='bx bx-shield-quarter' style="color:var(--accent);"></i> Inscribir mi equipo</div>
            <div style="font-size:11.5px;color:#888;line-height:1.5;margin-bottom:12px;">Elegí un equipo que ya tengas en Canchero — se lleva el escudo y el plantel — o cargá uno nuevo.</div>
            ${disponibles.length ? disponibles.map(c => `
                <div onclick="CancheroTournaments._inscribePick('${c.id}')" id="ctpick-${c.id}" class="ctp-pick" style="display:flex;align-items:center;gap:11px;padding:10px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;margin-bottom:7px;cursor:pointer;transition:.15s;">
                    ${_shieldHTML(c.logo_url || c.logo, c.name, 36)}
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:13px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_esc(c.name)}</div>
                        <div style="font-size:10.5px;color:#666;">${_esc(c.city||'Sin ciudad')}</div>
                    </div>
                    <i class='bx bx-circle' style="color:#444;font-size:19px;"></i>
                </div>`).join('')
            : `<div style="font-size:12px;color:#666;padding:10px 12px;background:rgba(255,255,255,0.02);border-radius:10px;margin-bottom:10px;"><i class='bx bx-info-circle'></i> Todavía no tenés equipos en Canchero. Cargá uno acá abajo.</div>`}
        </div>
        <div style="${caja}">
            <div style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;margin-bottom:6px;">${disponibles.length ? 'O CARGÁ UNO NUEVO' : 'NOMBRE DEL EQUIPO'}</div>
            <input id="ctm-team-name" type="text" placeholder="Nombre de tu equipo" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:11px 12px;font-size:13px;box-sizing:border-box;margin-bottom:10px;">
            <button onclick="CancheroTournaments._inscribeTeam('${tournamentId}','${(organizerEmail||'').replace(/'/g,"\\'")}' )" style="width:100%;background:var(--accent);color:#000;border:none;border-radius:12px;padding:12px;font-weight:900;font-size:14px;cursor:pointer;">Enviar solicitud</button>
        </div>`;
        window.__ctInscribeClub = null;
    }

    // Marca visualmente el equipo elegido y completa el nombre en el formulario.
    function _inscribePick(clubId) {
        const prev = window.__ctInscribeClub;
        document.querySelectorAll('.ctp-pick').forEach(d => {
            d.style.borderColor = 'rgba(255,255,255,0.08)';
            d.style.background = 'rgba(255,255,255,0.03)';
            const ic = d.querySelector('i.bx'); if (ic) { ic.className = 'bx bx-circle'; ic.style.color = '#444'; }
        });
        if (prev === clubId) { window.__ctInscribeClub = null; const n = document.getElementById('ctm-team-name'); if (n) n.value = ''; return; }
        const box = document.getElementById('ctpick-' + clubId);
        if (box) {
            box.style.borderColor = 'rgba(186,255,0,0.45)';
            box.style.background = 'rgba(186,255,0,0.08)';
            const ic = box.querySelector('i.bx'); if (ic) { ic.className = 'bx bxs-check-circle'; ic.style.color = 'var(--accent)'; }
            const nombre = box.querySelector('div > div');
            const n = document.getElementById('ctm-team-name');
            if (n && nombre) n.value = nombre.textContent.trim();
        }
        window.__ctInscribeClub = clubId;
    }

    // ═══════════════════════════════════════════════════════════
    // VISTA PÚBLICA · INFO (premio, sponsors y contacto con la organización)
    // ═══════════════════════════════════════════════════════════
    async function _ctpInfo(tournamentId, organizerEmail, el) {
        const sb = getSb();
        const { data: t } = await sb.from('tournaments').select('*').eq('id', tournamentId).single();
        if (!t) { el.innerHTML = ''; return; }
        const isOrg = _isOrgActive(t.organizer_email);
        const caja = 'padding:16px;background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.08);border-radius:16px;backdrop-filter:blur(10px);margin-bottom:12px;';

        const org = await _orgContacto(t.organizer_email);
        const wsp = org.whatsapp;

        // Sponsors del torneo (tabla propia; si no existe todavía, no se muestra la sección)
        let sponsors = [];
        try {
            const { data } = await sb.from('tournament_sponsors')
                .select('*').eq('tournament_id', tournamentId).order('orden');
            sponsors = data || [];
        } catch(e){ sponsors = null; }   // null = la tabla no existe (falta migración)

        const premio = `
        <div style="${caja}text-align:center;">
            <div style="font-size:10px;color:#666;font-weight:900;letter-spacing:1.4px;margin-bottom:10px;">PREMIO</div>
            ${t.prize_pool ? `
                <i class='bx bxs-trophy' style="font-size:38px;color:#ffd23f;filter:drop-shadow(0 0 14px rgba(255,210,63,.4));"></i>
                <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:20px;margin-top:8px;line-height:1.2;">${_esc(t.prize_pool)}</div>`
            : `<div style="font-size:12.5px;color:#666;">La organización todavía no cargó el premio.</div>`}
            ${t.entry_fee > 0
                ? `<div style="font-size:12px;color:#ffaa00;margin-top:10px;"><i class='bx bx-dollar-circle'></i> Inscripción: $${t.entry_fee}</div>`
                : `<div style="font-size:12px;color:#00e676;margin-top:10px;"><i class='bx bx-dollar-circle'></i> Inscripción gratis</div>`}
        </div>`;

        const contacto = `
        <div style="${caja}">
            <div style="font-size:10px;color:#666;font-weight:900;letter-spacing:1.4px;margin-bottom:10px;">CONTACTAR A LA ORGANIZACIÓN</div>
            <div style="font-size:13px;font-weight:800;margin-bottom:12px;">${_esc(org.name || t.organizer_email || 'Organización')}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button onclick="CancheroTournaments._contactOrg('chat','${tournamentId}')" style="flex:1;min-width:140px;background:rgba(186,255,0,0.12);color:var(--accent);border:1px solid rgba(186,255,0,0.3);border-radius:12px;padding:12px;font-weight:800;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;"><i class='bx bx-message-dots'></i> Chat de Canchero</button>
                ${wsp ? `<button onclick="CancheroTournaments._contactOrg('wa','${tournamentId}')" style="flex:1;min-width:140px;background:#25D366;color:#000;border:none;border-radius:12px;padding:12px;font-weight:800;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;"><i class='bx bxl-whatsapp' style="font-size:17px;"></i> WhatsApp</button>` : ''}
            </div>
            ${!wsp ? `<div style="font-size:10.5px;color:#555;margin-top:8px;">${isOrg ? 'Cargá tu WhatsApp en el perfil del negocio para que también te puedan escribir por ahí.' : 'Esta organización no publicó WhatsApp.'}</div>` : ''}
        </div>`;

        let bloqueSponsors = '';
        if (sponsors === null) {
            bloqueSponsors = isOrg ? `<div style="${caja}font-size:11.5px;color:#888;line-height:1.5;"><i class='bx bx-error-circle' style="color:#ffaa00;"></i> Para cargar sponsors falta correr la migración SQL de <b>tournament_sponsors</b>.</div>` : '';
        } else if (sponsors.length || isOrg) {
            bloqueSponsors = `
            <div style="${caja}">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <div style="font-size:10px;color:#666;font-weight:900;letter-spacing:1.4px;">SPONSORS</div>
                    ${isOrg ? `<button onclick="CancheroTournaments._openAddSponsor('${tournamentId}')" style="background:rgba(186,255,0,0.1);color:var(--accent);border:1px solid rgba(186,255,0,0.25);border-radius:9px;padding:5px 10px;font-size:11px;font-weight:800;cursor:pointer;"><i class='bx bx-plus'></i> Agregar</button>` : ''}
                </div>
                ${sponsors.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:10px;">
                    ${sponsors.map(s => `<div style="position:relative;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:13px;padding:12px 8px;text-align:center;">
                        ${isOrg ? `<button onclick="event.stopPropagation();CancheroTournaments._deleteSponsor('${s.id}','${tournamentId}')" title="Quitar" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,.55);border:none;color:#ff6b6b;border-radius:7px;width:20px;height:20px;font-size:13px;cursor:pointer;line-height:1;">&times;</button>` : ''}
                        <a ${s.link ? `href="${_esc(s.link)}" target="_blank" rel="noopener noreferrer"` : ''} style="text-decoration:none;color:inherit;display:block;">
                            ${s.logo_url
                                ? `<img src="${_esc(s.logo_url)}" alt="${_esc(s.name)}" style="width:56px;height:56px;object-fit:contain;border-radius:10px;background:#fff;padding:4px;" onerror="this.style.display='none'">`
                                : `<div style="width:56px;height:56px;margin:0 auto;border-radius:10px;background:rgba(186,255,0,.1);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:var(--accent);">${_esc((s.name||'?')[0].toUpperCase())}</div>`}
                            <div style="font-size:10.5px;font-weight:700;margin-top:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_esc(s.name)}</div>
                        </a>
                    </div>`).join('')}
                </div>` : `<div style="font-size:12px;color:#666;">Todavía no hay sponsors cargados.</div>`}
            </div>`;
        }

        el.innerHTML = premio + bloqueSponsors + contacto
            + (t.rules ? `<div style="${caja}"><div style="font-size:10px;color:#666;font-weight:900;letter-spacing:1.4px;margin-bottom:8px;">REGLAMENTO</div><p style="font-size:12.5px;color:#999;line-height:1.6;white-space:pre-wrap;margin:0;">${_esc(t.rules)}</p></div>` : '');
    }

    // Nombre y WhatsApp de la organización. El negocio vive en business_requests; como
    // respaldo se mira users.whatsapp_number, que es donde lo guardan otros rubros.
    async function _orgContacto(email) {
        const sb = getSb();
        const out = { name: '', whatsapp: '' };
        if (!email) return out;
        try {
            const { data } = await sb.from('business_requests')
                .select('name,whatsapp,phone').ilike('email', email).maybeSingle();
            if (data) { out.name = data.name || ''; out.whatsapp = data.whatsapp || data.phone || ''; }
        } catch(e){}
        if (!out.whatsapp) {
            try {
                const { data } = await sb.from('users')
                    .select('name,whatsapp_number,phone').ilike('email', email).maybeSingle();
                if (data) { out.name = out.name || data.name || ''; out.whatsapp = data.whatsapp_number || data.phone || ''; }
            } catch(e){}
        }
        out.whatsapp = String(out.whatsapp || '').replace(/[^0-9]/g, '');
        return out;
    }

    // Contactar a la organización: por el chat de Canchero o por WhatsApp, a elección.
    async function _contactOrg(via, tournamentId) {
        const sb = getSb();
        const { data: t } = await sb.from('tournaments').select('name,organizer_email').eq('id', tournamentId).single();
        if (!t) return;
        if (via === 'wa') {
            const num = (await _orgContacto(t.organizer_email)).whatsapp;
            if (!num) { toast('La organización no publicó WhatsApp.', 'info'); return; }
            const txt = `Hola! Te escribo por el torneo ${t.name} que vi en Canchero.`;
            window.open(`https://wa.me/${num}?text=${encodeURIComponent(txt)}`, '_blank');
            return;
        }
        // Chat interno de Canchero
        const user = getUser();
        if (!user || !user.email) { toast('Iniciá sesión para escribirle a la organización.', 'warning'); return; }
        if (typeof window.openChatWith === 'function') { window.openChatWith(t.organizer_email); return; }
        if (typeof window.abrirChatCon === 'function') { window.abrirChatCon(t.organizer_email); return; }
        // Sin función de chat a mano (torneo.html público): avisamos por notificación.
        try {
            await sb.from('notifications').insert({
                recipient_email: t.organizer_email,
                type: 'torneo_consulta',
                actor_name: user.name || user.email,
                actor_email: user.email,
                message: `${user.name || user.email} quiere contactarte por el torneo ${t.name}.`,
                post_id: tournamentId,
                read: false
            });
            toast('Le avisamos a la organización. Te van a escribir por el chat.', 'success');
        } catch(e) { toast('No se pudo enviar el mensaje.', 'error'); }
    }

    // ── Sponsors del torneo (sin límite y gratis)
    async function _openAddSponsor(tournamentId) {
        window.__ctSponsorLogo = null;
        const ex = document.getElementById('ctsp-modal'); if (ex) ex.remove();
        const modal = document.createElement('div');
        modal.id = 'ctsp-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:100011;background:rgba(0,0,0,0.92);backdrop-filter:blur(6px);overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:20px;';
        const sty = 'width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;box-sizing:border-box;margin-bottom:10px;';
        modal.innerHTML = `
        <div style="background:rgba(255,255,255,0.045);border:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(16px);border-radius:18px;width:100%;max-width:380px;padding:20px;margin-top:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                <h3 style="font-family:Outfit,sans-serif;font-weight:900;font-size:15px;"><i class='bx bx-store' style="color:var(--accent);"></i> Agregar sponsor</h3>
                <button onclick="document.getElementById('ctsp-modal').remove()" style="background:none;border:none;color:#888;font-size:22px;cursor:pointer;">&times;</button>
            </div>
            <div style="text-align:center;margin-bottom:14px;">
                <label style="cursor:pointer;display:inline-block;">
                    <span id="ctsp-logo-box" style="width:80px;height:80px;border-radius:14px;border:1px dashed #444;display:flex;align-items:center;justify-content:center;color:#666;font-size:22px;background-size:cover;background-position:center;"><i class='bx bx-image-add'></i></span>
                    <input type="file" accept="image/*" style="display:none;" onchange="CancheroTournaments._ctspPickLogo(this)">
                </label>
                <div style="font-size:10px;color:#555;margin-top:5px;">Logo (opcional)</div>
            </div>
            <input id="ctsp-name" type="text" placeholder="Nombre del sponsor" style="${sty}">
            <input id="ctsp-link" type="url" placeholder="Link (opcional) https://..." style="${sty}">
            <button onclick="CancheroTournaments._saveSponsor('${tournamentId}')" style="width:100%;background:var(--accent);color:#000;border:none;border-radius:12px;padding:12px;font-weight:900;font-size:14px;cursor:pointer;">Agregar sponsor</button>
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    }
    async function _ctspPickLogo(input) {
        const f = input.files && input.files[0]; if (!f) return;
        toast('Subiendo logo...', 'info');
        const url = await _uploadImg(f, 'torneos/sponsors');
        if (!url) { toast('No se pudo subir el logo.', 'error'); return; }
        window.__ctSponsorLogo = url;
        const box = document.getElementById('ctsp-logo-box');
        if (box) { box.style.backgroundImage = `url('${url}')`; box.innerHTML = ''; box.style.border = '1px solid rgba(186,255,0,.4)'; }
    }
    async function _saveSponsor(tournamentId) {
        const sb = getSb();
        const name = (document.getElementById('ctsp-name')?.value || '').trim();
        if (!name) { toast('Ingresá el nombre del sponsor.', 'warning'); return; }
        const { error } = await sb.from('tournament_sponsors').insert({
            tournament_id: tournamentId,
            name,
            logo_url: window.__ctSponsorLogo || null,
            link: (document.getElementById('ctsp-link')?.value || '').trim() || null,
            orden: Date.now() % 100000
        });
        if (error) { toast('Error: ' + error.message + ' (¿corriste la migración?)', 'error'); return; }
        window.__ctSponsorLogo = null;
        document.getElementById('ctsp-modal')?.remove();
        toast('Sponsor agregado.', 'success');
        _ctpRefreshInfo(tournamentId);
    }
    async function _deleteSponsor(sponsorId, tournamentId) {
        if (!confirm('¿Quitar este sponsor del torneo?')) return;
        const sb = getSb();
        const { error } = await sb.from('tournament_sponsors').delete().eq('id', sponsorId);
        if (error) { toast('Error: ' + error.message, 'error'); return; }
        toast('Sponsor quitado.', 'success');
        _ctpRefreshInfo(tournamentId);
    }
    // Vuelve a pintar el tab Info donde esté abierto (vista pública o panel de gestión).
    function _ctpRefreshInfo(tournamentId) {
        const cont = document.getElementById('ctp-content') || document.getElementById('ctm-content');
        if (cont) _ctpInfo(tournamentId, null, cont);
    }

    async function _ctpTab(tab, tournamentId, organizerEmail, btn) {
        document.querySelectorAll('.ctp-tab').forEach(b => { b.style.background='transparent'; b.style.color='#666'; b.style.borderColor='#222'; });
        if (btn) { btn.style.background='rgba(186,255,0,0.12)'; btn.style.color='var(--accent)'; btn.style.borderColor='rgba(186,255,0,0.3)'; }
        // Reusar el contenido en el modal público usando el mismo id ctm-content pero en ctp-content
        const realContent = document.getElementById('ctm-content');
        const ctpContent = document.getElementById('ctp-content');
        // Hacemos que las funciones de render usen ctp-content
        if (ctpContent) ctpContent.innerHTML = '<div style="text-align:center;padding:30px;color:#555;"><i class="bx bx-loader-alt bx-spin" style="font-size:24px;"></i></div>';
        // Override temporal del container para las funciones de render
        const tempEl = document.createElement('div');
        tempEl.id = 'ctm-content';
        tempEl.style.display = 'none';
        document.body.appendChild(tempEl);
        if (tab === 'tabla') await _ctmTabla(tournamentId, organizerEmail);
        else if (tab === 'fixture') await _ctmFixture(tournamentId, organizerEmail);
        else if (tab === 'equipos') await _ctmEquipos(tournamentId, organizerEmail);
        else if (tab === 'jugadores') await _ctmJugadores(tournamentId);
        else if (tab === 'goleadores') await _ctmGoleadores(tournamentId);
        else if (tab === 'inscribir') { await _ctpInscribir(tournamentId, organizerEmail, tempEl); }
        else if (tab === 'info') { await _ctpInfo(tournamentId, organizerEmail, tempEl); }
        if (ctpContent) ctpContent.innerHTML = tempEl.innerHTML;
        tempEl.remove();
    }

    // ═══════════════════════════════════════════════════════════
    // LISTA DE TORNEOS DE UN ORGANIZADOR
    // ═══════════════════════════════════════════════════════════
    async function renderOrgTournaments(organizerEmail, container) {
        const sb = getSb();
        if (!container) return;
        const { data: torneos } = await sb.from('tournaments').select('*').eq('organizer_email', organizerEmail).order('created_at', {ascending:false});
        const isOwner = _isOrgActive(organizerEmail);
        container.innerHTML = (torneos && torneos.length ? torneos.map(t => {
            const statusColors = { draft:'#555', registration:'#ffaa00', active:'#00e676', finished:'#4fc3f7', cancelled:'#ff4444' };
            return `<div onclick="CancheroTournaments.openPublicView('${t.id}')" style="background:rgba(255,255,255,0.02);border:1px solid #1e1e1e;border-radius:14px;padding:14px 16px;margin-bottom:8px;cursor:pointer;transition:.15s;" onmouseover="this.style.background='rgba(186,255,0,0.04)'" onmouseout="this.style.background='rgba(255,255,255,0.02)'">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:800;font-size:14px;">${t.name}</div>
                        <div style="font-size:11px;color:#666;margin-top:3px;">${t.city||''} · ${t.teams_count||0}/${t.max_teams} equipos · ${t.format==='groups'?'Grupos':'Liga/Eliminación'}</div>
                        ${t.prize_pool ? `<div style="font-size:11px;color:var(--accent);margin-top:2px;"><i class='bx bx-trophy'></i> ${t.prize_pool}</div>` : ''}
                    </div>
                    <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
                        <span style="font-size:10px;font-weight:700;color:${statusColors[t.status]||'#888'};background:rgba(255,255,255,0.05);border-radius:6px;padding:2px 8px;">${_formatStatus(t.status)}</span>
                        ${isOwner ? `<button onclick="event.stopPropagation();CancheroTournaments.openTournamentManager('${t.id}','${(organizerEmail||'').replace(/'/g,"\\'")}' )" style="font-size:10px;background:rgba(186,255,0,0.08);color:var(--accent);border:1px solid rgba(186,255,0,0.2);border-radius:6px;padding:2px 8px;cursor:pointer;">Gestionar</button>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('') : '<div style="text-align:center;padding:40px;color:#555;">Sin torneos aún.<br><span style="font-size:12px;">Creá tu primer torneo desde el panel de organización.</span></div>') +
        (isOwner ? `<button onclick="CancheroTournaments.openCreateTournament('${(organizerEmail||'').replace(/'/g,"\\'")}' )" style="width:100%;margin-top:8px;background:var(--accent);color:#000;border:none;border-radius:14px;padding:12px;font-weight:900;font-size:14px;cursor:pointer;font-family:Outfit,sans-serif;"><i class='bx bx-plus-circle'></i> CREAR TORNEO</button>` : '');
    }

    // ═══════════════════════════════════════════════════════════
    // RESULTADO DEL PARTIDO REAL → TORNEO
    // Cuando un partido REAL (Ficha completa) vinculado a un tournament_match se finaliza
    // con marcador, lo copiamos al torneo y re-aplicamos la tabla de posiciones. Así el
    // resultado "vuelve" al torneo sin recargarlo a mano. Idempotente (revierte lo anterior).
    // ═══════════════════════════════════════════════════════════
    async function _syncTournamentFromRealMatch(matchId) {
        try {
            const sb = getSb(); if (!sb || !matchId) return;
            const { data: tm } = await sb.from('tournament_matches').select('*').eq('match_id', matchId).maybeSingle();
            if (!tm) return; // el partido real no pertenece a ningún torneo
            const { data: rm } = await sb.from('matches').select('score_a,score_b,mvp,status').eq('id', matchId).maybeSingle();
            if (!rm || rm.score_a == null || rm.score_b == null) return; // todavía sin resultado
            const homeScore = parseInt(rm.score_a), awayScore = parseInt(rm.score_b);
            if (isNaN(homeScore) || isNaN(awayScore)) return;
            // No re-aplicar si ya está sincronizado con el mismo marcador.
            if (tm.home_score === homeScore && tm.away_score === awayScore && tm.status === 'finished') return;
            // Revertir el resultado anterior del torneo (si había) para no duplicar puntos.
            if (tm.home_score != null && tm.away_score != null) {
                await _applyTeamResult(tm.home_team_id, tm.home_score, tm.away_score, -1);
                await _applyTeamResult(tm.away_team_id, tm.away_score, tm.home_score, -1);
            }
            await _applyTeamResult(tm.home_team_id, homeScore, awayScore, +1);
            await _applyTeamResult(tm.away_team_id, awayScore, homeScore, +1);
            const winnerId = homeScore > awayScore ? tm.home_team_id : awayScore > homeScore ? tm.away_team_id : null;
            await sb.from('tournament_matches').update({ home_score: homeScore, away_score: awayScore, status: 'finished', winner_team_id: winnerId || null }).eq('id', tm.id);
            await _advanceWinner(sb, tm, winnerId);
            await _maybeSeedPlayoffs(sb, tm.tournament_id);
            try { if (window.showToast) showToast('Resultado sincronizado con el torneo.', 'success', 2000); } catch(e){}
        } catch(e) { console.warn('_syncTournamentFromRealMatch:', e && e.message); }
    }

    // ═══════════════════════════════════════════════════════════
    // EXPORTS PÚBLICOS
    // ═══════════════════════════════════════════════════════════
    return {
        openCreateTournament,
        _syncTournamentFromRealMatch,
        openTournamentManager,
        openPublicView,
        renderOrgTournaments,
        renderStandingsInto,
        _openFullMatch,
        _openEditTournament,
        _saveEditTournament,
        _toggleSuspend,
        _deletePlayer,
        _ctmTab,
        _ctpTab,
        _submitCreate,
        _inscribeTeam,
        _openAddTeam,
        _approveTeam,
        _markPaid,
        _openTeamPlayers,
        _addPlayerToTeam,
        _openEditPlayer,
        _saveEditPlayer,
        _ctepPickPhoto,
        _deletePlayerFrom,
        _openEditTeam,
        _saveEditTeam,
        _ctetPickLogo,
        _deleteTeam,
        _generateFixture,
        _doGenerateFixture,
        _openEditMatchTeams,
        _saveMatchTeams,
        _openAddMatch,
        _saveAddMatch,
        _ctpInscribir,
        _inscribePick,
        _ctpInfo,
        _contactOrg,
        _openAddSponsor,
        _ctspPickLogo,
        _saveSponsor,
        _deleteSponsor,
        _invitePlayer,
        _inviteTeam,
        _inviteVia,
        claimPendingPlayerData,
        _openMatchLoad,
        _cmeAdd,
        _cmeAddPlayer,
        _cmeSetType,
        _cmeRemove,
        _cmeCargarJugador,
        _cmeAsist,
        _saveMatchLoad,
        _openMatchDetail,
        _liveChrono,
        _liveEvent,
        _liveSave,
        _liveUndo,
        _liveResetMarcador,
        _deleteTournamentMatch,
        _liveAsistDeGol,
        _liveSinAsist,
        _shareToFeed,
        _shareToChat,
        _shareOut,
        _cmdClose,
        _cmdTab,
        _startMatch,
        _matchShare,
        _openProfile,
        _openTeamInfo,
        _openPlayerInfo,
        _playerSetPhoto,
        _ctmSetImg,
        _teamSetLogo,
        _syncRoster,
        _solicAction,
        _ctatLogo,
        _ctatSearch,
        _ctatPick,
        _ctatSave,
        _ctapSearch,
        _ctapPick,
        _ctapSave,
    };
})();
