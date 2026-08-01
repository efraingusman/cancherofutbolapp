// canchero-match-players.js
// Sistema completo de gestión de jugadores en partidos
// Invites tipo Tinder, cambio de equipo, capitán cambiable, apuestas/premios
// v2026-05-31

window.CancheroMatchPlayers = (function () {
    'use strict';

    function getSb() { return window._sb; }
    function getUser() { return window.userData || null; }
    function toast(msg, type) { if (typeof showToast === 'function') showToast(msg, type || 'success'); }

    // ═══════════════════════════════════════════════════════════
    // PANEL PRINCIPAL — Gestión de jugadores del partido
    // ═══════════════════════════════════════════════════════════
    async function openPlayersPanel(matchId) {
        const sb = getSb(); const user = getUser();
        if (!sb) { toast('Sin conexión.', 'error'); return; }

        const { data: match } = await sb.from('matches').select('*').eq('id', matchId).single();
        if (!match) { toast('Partido no encontrado.', 'error'); return; }

        const { data: players } = await sb.from('match_players').select('*').eq('match_id', matchId);
        const isCaptainHome = user && (match.created_by === user.email || match.captain_home_email === user.email);
        const isCaptainAway = user && match.captain_away_email === user.email;
        const isCaptain = isCaptainHome || isCaptainAway;
        const myTeam = isCaptainHome ? 'home' : isCaptainAway ? 'away' : null;

        const teamHome = (players || []).filter(p => p.team === 'home' || !p.team);
        const teamAway = (players || []).filter(p => p.team === 'away');

        const existing = document.getElementById('match-players-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'match-players-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:9990;background:rgba(0,0,0,0.92);overflow-y:auto;padding:16px;';

        const slotsTotal = match.slots_total || 10;
        const perTeam = Math.floor(slotsTotal / 2);

        modal.innerHTML = `
        <div style="max-width:600px;margin:0 auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0 16px;">
                <h2 style="font-family:Outfit,sans-serif;font-weight:900;font-size:18px;"><i class='bx bx-group' style="color:var(--accent);"></i> Jugadores del Partido</h2>
                <button onclick="document.getElementById('match-players-modal').remove()" style="background:none;border:none;color:#888;font-size:24px;cursor:pointer;">&times;</button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                <!-- LOCAL -->
                <div style="background:#111;border:1px solid #1e1e1e;border-radius:14px;padding:14px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <div style="font-size:11px;color:var(--accent);font-weight:900;letter-spacing:1px;">⚽ LOCAL (${teamHome.length}/${perTeam})</div>
                        ${isCaptainHome ? `<button onclick="CancheroMatchPlayers.openInvitePlayer('${matchId}','home')" style="background:rgba(186,255,0,0.1);color:var(--accent);border:1px solid rgba(186,255,0,0.3);border-radius:8px;padding:3px 8px;font-size:10px;font-weight:700;cursor:pointer;"><i class='bx bx-plus'></i> INVITAR</button>` : ''}
                    </div>
                    ${_buildTeamList(teamHome, 'home', matchId, isCaptainHome, match.captain_home_changes || 0)}
                </div>
                <!-- VISITANTE -->
                <div style="background:#111;border:1px solid #1e1e1e;border-radius:14px;padding:14px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <div style="font-size:11px;color:#9c88ff;font-weight:900;letter-spacing:1px;">⚽ VISIT. (${teamAway.length}/${perTeam})</div>
                        ${isCaptainAway ? `<button onclick="CancheroMatchPlayers.openInvitePlayer('${matchId}','away')" style="background:rgba(156,136,255,0.1);color:#9c88ff;border:1px solid rgba(156,136,255,0.3);border-radius:8px;padding:3px 8px;font-size:10px;font-weight:700;cursor:pointer;"><i class='bx bx-plus'></i> INVITAR</button>` : ''}
                    </div>
                    ${_buildTeamList(teamAway, 'away', matchId, isCaptainAway, match.captain_away_changes || 0)}
                </div>
            </div>
            ${isCaptainHome ? `
            <button onclick="CancheroMatchPlayers.balancearEquipos('${matchId}')" style="width:100%;background:linear-gradient(135deg,#baff00,#8fd400);color:#000;border:none;border-radius:12px;padding:12px;font-weight:900;font-size:14px;cursor:pointer;margin-bottom:10px;box-shadow:0 4px 16px rgba(186,255,0,0.22);">
                <i class='bx bx-transfer-alt'></i> BALANCEAR EQUIPOS
            </button>
            <div style="font-size:10px;color:#555;text-align:center;margin:-4px 0 12px;">Reparte los jugadores parejos por valoración. Los capitanes no se mueven.</div>` : ''}
            ${isCaptain ? `
            <div style="background:#111;border:1px solid #222;border-radius:12px;padding:12px;margin-bottom:10px;">
                <div style="font-size:11px;color:#555;font-weight:900;letter-spacing:1px;margin-bottom:8px;">CAMBIAR CAPITÁN (máx 2 veces por equipo)</div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    ${isCaptainHome ? `<button onclick="CancheroMatchPlayers.openChangeCaptain('${matchId}','home',${match.captain_home_changes||0})" style="flex:1;background:rgba(186,255,0,0.06);color:var(--accent);border:1px solid rgba(186,255,0,0.2);border-radius:10px;padding:8px;font-size:11px;font-weight:700;cursor:pointer;" ${(match.captain_home_changes||0)>=2?'disabled style="opacity:0.4;cursor:default;"':''}>
                        <i class='bx bx-crown'></i> Local (${2-(match.captain_home_changes||0)} restante${(2-(match.captain_home_changes||0))!==1?'s':''})
                    </button>` : ''}
                    ${isCaptainAway ? `<button onclick="CancheroMatchPlayers.openChangeCaptain('${matchId}','away',${match.captain_away_changes||0})" style="flex:1;background:rgba(156,136,255,0.06);color:#9c88ff;border:1px solid rgba(156,136,255,0.2);border-radius:10px;padding:8px;font-size:11px;font-weight:700;cursor:pointer;" ${(match.captain_away_changes||0)>=2?'disabled style="opacity:0.4;cursor:default;"':''}>
                        <i class='bx bx-crown'></i> Visitante (${2-(match.captain_away_changes||0)} restante${(2-(match.captain_away_changes||0))!==1?'s':''})
                    </button>` : ''}
                </div>
            </div>` : ''}
        </div>`;

        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    }

    // ═══════════════════════════════════════════════════════════
    // BALANCEAR EQUIPOS — reparte parejo por valoración, anclando capitanes
    // ═══════════════════════════════════════════════════════════
    async function balancearEquipos(matchId) {
        const sb = getSb(); const user = getUser();
        if (!sb || !user) { toast('Sin conexión.', 'error'); return; }

        const { data: match } = await sb.from('matches').select('*').eq('id', matchId).single();
        if (!match) { toast('Partido no encontrado.', 'error'); return; }
        const isCaptainHome = match.created_by === user.email || match.captain_home_email === user.email;
        if (!isCaptainHome) { toast('Solo el organizador puede balancear.', 'error'); return; }

        const { data: players } = await sb.from('match_players').select('*').eq('match_id', matchId);
        if (!players || players.length < 2) { toast('Hacen falta al menos 2 jugadores.', 'info'); return; }

        // Valoraciones desde users.stats.rating (fallback 50 = base).
        const emails = players.map(p => (p.player_email || '').toLowerCase()).filter(Boolean);
        const ratingBy = {};
        try {
            const { data: us } = await sb.from('users').select('email,stats').in('email', emails);
            (us || []).forEach(u => {
                const r = u.stats && typeof u.stats === 'object' ? u.stats.rating : null;
                ratingBy[(u.email || '').toLowerCase()] = parseInt(r) || 50;
            });
        } catch(e) { console.warn('[balancear] ratings:', e && e.message); }
        const val = p => ratingBy[(p.player_email || '').toLowerCase()] || 50;

        // Capitanes anclados: se quedan en su equipo. El resto se reparte.
        const homeCapEmail = (match.captain_home_email || match.created_by || '').toLowerCase();
        const awayCapEmail = (match.captain_away_email || '').toLowerCase();
        const perTeam = Math.floor((match.slots_total || players.length) / 2);

        const home = [], away = [];
        let sumHome = 0, sumAway = 0;
        const resto = [];
        players.forEach(p => {
            const em = (p.player_email || '').toLowerCase();
            if (em && em === homeCapEmail) { home.push(p); sumHome += val(p); }
            else if (em && em === awayCapEmail) { away.push(p); sumAway += val(p); }
            else resto.push(p);
        });
        // Greedy: del mejor al peor, al equipo con menor suma (respetando cupo).
        resto.sort((a, b) => val(b) - val(a));
        resto.forEach(p => {
            const homeFull = home.length >= perTeam && away.length < perTeam;
            const awayFull = away.length >= perTeam && home.length < perTeam;
            const toHome = homeFull ? false : awayFull ? true : (sumHome <= sumAway);
            if (toHome) { home.push(p); sumHome += val(p); }
            else { away.push(p); sumAway += val(p); }
        });

        // Persistir solo los que cambiaron de equipo.
        const updates = [];
        home.forEach(p => { if ((p.team || 'home') !== 'home') updates.push({ p, team: 'home' }); });
        away.forEach(p => { if (p.team !== 'away') updates.push({ p, team: 'away' }); });
        try {
            for (const u of updates) {
                await sb.from('match_players').update({ team: u.team })
                    .eq('match_id', matchId).eq('player_email', u.p.player_email);
            }
        } catch(e) { console.warn('[balancear] update:', e && e.message); toast('No se pudo guardar el balance.', 'error'); return; }

        const promH = home.length ? Math.round(sumHome / home.length) : 0;
        const promA = away.length ? Math.round(sumAway / away.length) : 0;
        toast('Equipos balanceados — Local ' + promH + ' vs Visitante ' + promA + ' (dif ' + Math.abs(promH - promA) + ')', 'success');
        openPlayersPanel(matchId);
    }

    function _buildTeamList(players, team, matchId, isCaptain, captainChanges) {
        if (!players.length) return `<div style="text-align:center;padding:20px 0;color:#444;font-size:12px;">Sin jugadores aún</div>`;
        return players.map(p => {
            const n = (p.player_name || 'Jugador').slice(0, 20);
            const isCapt = p.is_captain;
            const color = team === 'home' ? 'var(--accent)' : '#9c88ff';
            return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #111;">
                <div style="width:30px;height:30px;border-radius:50%;background:${color}22;border:1px solid ${color}44;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:11px;color:${color};flex-shrink:0;">${n[0]?.toUpperCase()||'?'}</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${n}${isCapt?' <i class="bx bx-crown" style="color:#FFD600;font-size:10px;"></i>':''}</div>
                    <div style="font-size:9px;color:#555;">${p.position||p.pos||'JUG'}</div>
                </div>
                ${isCaptain && !isCapt ? `<button onclick="CancheroMatchPlayers.toggleCoCaptain('${matchId}','${(p.player_email||'').replace(/'/g,"\\'")}',true)" style="background:none;border:none;color:#FFD600;cursor:pointer;font-size:16px;padding:2px;" title="Hacer capitán extra"><i class='bx bx-crown'></i></button>` : ''}
                ${isCaptain && isCapt && (p.player_email !== (window.userData&&window.userData.email)) ? `<button onclick="CancheroMatchPlayers.toggleCoCaptain('${matchId}','${(p.player_email||'').replace(/'/g,"\\'")}',false)" style="background:none;border:none;color:#888;cursor:pointer;font-size:14px;padding:2px;" title="Quitar capitanía">✪</button>` : ''}
                ${isCaptain && !isCapt ? `<button onclick="CancheroMatchPlayers.removePlayer('${matchId}','${p.player_email||p.id}')" style="background:none;border:none;color:#444;cursor:pointer;font-size:16px;padding:2px;" title="Quitar">✕</button>` : ''}
            </div>`;
        }).join('');
    }

    // ═══════════════════════════════════════════════════════════
    // INVITAR JUGADOR
    // ═══════════════════════════════════════════════════════════
    async function openInvitePlayer(matchId, team) {
        const user = getUser();
        if (!user) { toast('Iniciá sesión.', 'warning'); return; }
        const modal = document.createElement('div');
        modal.id = 'invite-player-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;padding:16px;';
        const teamLabel = team === 'home' ? '<span style="color:var(--accent)">LOCAL</span>' : '<span style="color:#9c88ff">VISITANTE</span>';
        modal.innerHTML = `
        <div style="background:#0d0d0d;border:1px solid #222;border-radius:20px;width:100%;max-width:420px;padding:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                <h3 style="font-weight:900;font-size:15px;">Invitar jugador al equipo ${teamLabel}</h3>
                <button onclick="document.getElementById('invite-player-modal').remove()" style="background:none;border:none;color:#888;font-size:22px;cursor:pointer;">&times;</button>
            </div>
            <div style="display:flex;gap:8px;margin-bottom:12px;">
                <input id="invite-search-input" type="text" placeholder="Buscar jugador..." oninput="CancheroMatchPlayers._searchPlayers(this.value,'${matchId}','${team}')"
                    style="flex:1;background:#111;border:1px solid #333;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;">
            </div>
            <div id="invite-suggested-label" style="font-size:10px;color:#666;font-weight:900;letter-spacing:1px;margin-bottom:6px;display:none;">SUGERIDOS PARA ESTE PARTIDO</div>
            <div id="invite-search-results" style="max-height:300px;overflow-y:auto;">
                <div style="text-align:center;padding:16px;color:#555;"><i class="bx bx-loader-alt bx-spin"></i></div>
            </div>
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
        _suggestPlayers(matchId, team);
    }

    // Sugiere jugadores para el partido: prioriza los que cubren una posición faltante
    // del equipo y cuya valoración está más cerca del nivel del partido.
    async function _suggestPlayers(matchId, team) {
        const results = document.getElementById('invite-search-results');
        const label = document.getElementById('invite-suggested-label');
        if (!results) return;
        const sb = getSb();
        if (!sb) return;
        try {
            const { data: match } = await sb.from('matches').select('*').eq('id', matchId).single();
            const { data: inMatch } = await sb.from('match_players').select('player_email,position,team').eq('match_id', matchId);
            const taken = new Set((inMatch || []).map(p => (p.player_email || '').toLowerCase()));

            // Posiciones que ya tiene ESTE equipo → las faltantes valen más.
            const POS = ['ARQ', 'DEF', 'MED', 'DEL'];
            const normPos = p => {
                const s = (p || '').toUpperCase();
                if (/ARQ|GK|ARQUERO|PORTERO/.test(s)) return 'ARQ';
                if (/DEF|ZAG|LAT|BACK/.test(s)) return 'DEF';
                if (/MED|VOL|MID|CARRIL/.test(s)) return 'MED';
                if (/DEL|PUN|ATA|FWD|EXT/.test(s)) return 'DEL';
                return s || 'MED';
            };
            const teamPos = new Set((inMatch || []).filter(p => (p.team || 'home') === team).map(p => normPos(p.position)));
            const faltantes = POS.filter(p => !teamPos.has(p));

            // Nivel objetivo: del partido si lo declaró; si no, el del organizador.
            const R = window.CancheroRating;
            let target = 65;
            if (match && match.skill_level && R && R.NIVELES) {
                const n = R.NIVELES.find(x => x.id === match.skill_level);
                if (n) target = Math.round((n.min + n.max) / 2);
            } else if (window.userData && window.userData.stats && window.userData.stats.rating) {
                target = parseInt(window.userData.stats.rating) || 65;
            }

            // Candidatos: misma ciudad primero, sin bots, no ya anotados.
            const _cols = 'email,name,photo,city,pos,stats,availability_schedule';
            let q = sb.from('users').select(_cols).neq('role', 'bot');
            if (match && match.city) q = q.eq('city', match.city);
            let { data: cands, error: _ce } = await q.limit(60);
            if (_ce && /availability_schedule/.test(_ce.message||'')) {
                // La columna puede no existir aún: reintentar sin ella.
                const r0 = await sb.from('users').select('email,name,photo,city,pos,stats').neq('role','bot').eq('city', (match&&match.city)||'').limit(60);
                cands = r0.data || [];
            }
            if ((!cands || cands.length < 5)) {
                const r2 = await sb.from('users').select(_cols).neq('role', 'bot').limit(60);
                cands = r2.data || cands || [];
                if (r2.error && /availability_schedule/.test(r2.error.message||'')) {
                    const r3 = await sb.from('users').select('email,name,photo,city,pos,stats').neq('role','bot').limit(60);
                    cands = r3.data || cands || [];
                }
            }
            // ¿El partido cae en la franja de disponibilidad del candidato?
            const matchDate = (match && match.scheduled_at) ? new Date(match.scheduled_at) : null;
            const dispEnHorario = u => {
                if (!matchDate || !window._scheduleCoversDate) return false;
                return window._scheduleCoversDate(u.availability_schedule, matchDate);
            };
            const me = (window.userData && window.userData.email || '').toLowerCase();
            const ranked = (cands || [])
                .filter(u => u.email && !taken.has(u.email.toLowerCase()) && u.email.toLowerCase() !== me && !(window._esCuentaPrueba && window._esCuentaPrueba(u)))
                .map(u => {
                    const rating = (u.stats && typeof u.stats === 'object' ? parseInt(u.stats.rating) : 0) || 50;
                    const pos = normPos(u.pos);
                    const cubre = faltantes.includes(pos);
                    const dispo = dispEnHorario(u);
                    // Puntaje: disponible en el horario del partido + cubrir posición faltante + cercanía de nivel.
                    const score = (dispo ? 120 : 0) + (cubre ? 100 : 0) - Math.abs(rating - target);
                    return { u, rating, pos, cubre, dispo, score };
                })
                .sort((a, b) => b.score - a.score)
                .slice(0, 8);

            if (!ranked.length) {
                results.innerHTML = '<div style="text-align:center;padding:20px;color:#555;">Buscá un jugador por nombre</div>';
                return;
            }
            if (label) label.style.display = 'block';
            results.innerHTML = ranked.map(({ u, rating, pos, cubre, dispo }) => `
                <div onclick="CancheroMatchPlayers._sendInvite('${matchId}','${u.email.replace(/'/g,"\\'")}','${(u.name||'').replace(/'/g,"\\'")}','${team}')"
                    style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid #1a1a1a;cursor:pointer;transition:.15s;" onmouseover="this.style.background='rgba(186,255,0,0.05)'" onmouseout="this.style.background='transparent'">
                    ${u.photo ? `<img src="${u.photo}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0;">` : `<div style="width:40px;height:40px;border-radius:50%;background:rgba(186,255,0,0.1);display:flex;align-items:center;justify-content:center;font-weight:900;color:var(--accent);flex-shrink:0;">${(u.name||'?')[0].toUpperCase()}</div>`}
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.name||u.email}</div>
                        <div style="font-size:10px;color:#666;">${pos} · Nv ${rating} · ${u.city||''}</div>
                    </div>
                    ${dispo ? `<span style="background:rgba(0,230,118,0.12);color:#00e676;border-radius:6px;padding:2px 6px;font-size:9px;font-weight:900;margin-right:4px;white-space:nowrap;">DISPONIBLE</span>` : ''}
                    ${cubre ? `<span style="background:rgba(186,255,0,0.12);color:var(--accent);border-radius:6px;padding:2px 6px;font-size:9px;font-weight:900;margin-right:4px;">CUBRE ${pos}</span>` : ''}
                    <button style="background:var(--accent);color:#000;border:none;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:900;cursor:pointer;">INVITAR</button>
                </div>`).join('');
        } catch(e) {
            console.warn('[sugerir jugadores]', e && e.message);
            results.innerHTML = '<div style="text-align:center;padding:20px;color:#555;">Buscá un jugador por nombre</div>';
        }
    }

    window.CancheroMatchPlayers = window.CancheroMatchPlayers || {};

    let _searchTimeout = null;
    async function _searchPlayers(query, matchId, team) {
        clearTimeout(_searchTimeout);
        const results = document.getElementById('invite-search-results');
        const label = document.getElementById('invite-suggested-label');
        if (!results) return;
        if (!query || query.length < 2) {
            // Sin texto: volver a mostrar los sugeridos del partido.
            _suggestPlayers(matchId, team);
            return;
        }
        if (label) label.style.display = 'none';
        _searchTimeout = setTimeout(async () => {
            results.innerHTML = '<div style="text-align:center;padding:16px;color:#555;"><i class="bx bx-loader-alt bx-spin"></i></div>';
            const sb = getSb();
            if (!sb) return;
            const { data: users } = await sb.from('users').select('email,name,photo,city,pos')
                .ilike('name', `%${query}%`)
                .neq('role', 'bot')
                .limit(10);
            if (!users || !users.length) {
                results.innerHTML = '<div style="text-align:center;padding:20px;color:#555;">Sin resultados</div>';
                return;
            }
            results.innerHTML = users.map(u => `
                <div onclick="CancheroMatchPlayers._sendInvite('${matchId}','${u.email.replace(/'/g,"\\'")}','${(u.name||'').replace(/'/g,"\\'")}','${team}')"
                    style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid #1a1a1a;cursor:pointer;transition:.15s;" onmouseover="this.style.background='rgba(186,255,0,0.05)'" onmouseout="this.style.background='transparent'">
                    ${u.photo ? `<img src="${u.photo}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0;">` : `<div style="width:40px;height:40px;border-radius:50%;background:rgba(186,255,0,0.1);display:flex;align-items:center;justify-content:center;font-weight:900;color:var(--accent);flex-shrink:0;">${(u.name||'?')[0].toUpperCase()}</div>`}
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:700;font-size:13px;">${u.name||u.email}</div>
                        <div style="font-size:10px;color:#666;">${u.pos||'JUG'} · ${u.city||''}</div>
                    </div>
                    <button style="background:var(--accent);color:#000;border:none;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:900;cursor:pointer;">INVITAR</button>
                </div>`).join('');
        }, 400);
    }

    async function _sendInvite(matchId, toEmail, toName, team) {
        const sb = getSb(); const user = getUser();
        if (!sb || !user) return;
        // Check if already invited
        const { data: existing } = await sb.from('match_invites').select('id,status').eq('match_id', matchId).eq('to_email', toEmail).maybeSingle();
        if (existing && existing.status === 'pendiente') { toast('Ya enviaste una invitación a este jugador.', 'warning'); return; }

        const { error } = await sb.from('match_invites').upsert({
            match_id: matchId,
            from_email: user.email,
            to_email: toEmail,
            team,
            status: 'pendiente'
        }, { onConflict: 'match_id,to_email' });
        if (error) { toast('Error al invitar: ' + error.message, 'error'); return; }

        // Notificación solo si no fue notificado antes
        try {
            const sbN = sb;
            await sbN.from('notifications').insert({
                recipient_email: toEmail,
                type: 'match_invite',
                actor_name: user.name || user.email,
                message: `${user.name||'Alguien'} te invitó a jugar un partido (equipo ${team === 'home' ? 'local' : 'visitante'})`,
                read: false
            });
        } catch(_e) {}

        toast(`✓ Invitación enviada a ${toName}`, 'success');
        document.getElementById('invite-player-modal')?.remove();
        openPlayersPanel(matchId);
    }

    // ═══════════════════════════════════════════════════════════
    // ACEPTAR / RECHAZAR INVITE
    // ═══════════════════════════════════════════════════════════
    async function acceptMatchInviteV2(inviteId, matchId, team) {
        const sb = getSb(); const user = getUser();
        if (!sb || !user) return;
        await sb.from('match_invites').update({ status: 'aceptada' }).eq('id', inviteId);
        try {
            await sb.from('match_players').upsert({
                match_id: matchId,
                player_email: user.email,
                player_name: user.name || user.email,
                position: user.pos || user.position || 'JUG',
                team: team || 'home',
                status: 'confirmado',
                is_captain: false
            }, { onConflict: 'match_id,player_email' });
        } catch(_e) {}
        toast('¡Unido al partido! ⚽🎉', 'success');
        if (typeof loadMisPartidos === 'function') loadMisPartidos('invitados');
    }

    async function rejectMatchInviteV2(inviteId) {
        const sb = getSb();
        if (!sb) return;
        await sb.from('match_invites').update({ status: 'rechazada' }).eq('id', inviteId);
        toast('Invitación rechazada.', 'default');
        if (typeof loadMisPartidos === 'function') loadMisPartidos('invitados');
    }

    async function removePlayer(matchId, playerEmail) {
        if (!confirm(`¿Quitar a este jugador del partido?`)) return;
        const sb = getSb();
        await sb.from('match_players').delete().eq('match_id', matchId).eq('player_email', playerEmail);
        await sb.from('match_invites').update({ status: 'pendiente' }).eq('match_id', matchId).eq('to_email', playerEmail);
        toast('Jugador removido.', 'success');
        openPlayersPanel(matchId);
    }

    // ═══════════════════════════════════════════════════════════
    // CAMBIAR CAPITÁN
    // ═══════════════════════════════════════════════════════════
    async function openChangeCaptain(matchId, team, changesCount) {
        if (changesCount >= 2) { toast('Ya usaste los 2 cambios de capitán para este equipo.', 'warning'); return; }
        const sb = getSb();
        const { data: players } = await sb.from('match_players').select('player_email,player_name').eq('match_id', matchId).eq('team', team).eq('is_captain', false);
        if (!players || !players.length) { toast('No hay jugadores disponibles para ser capitán.', 'warning'); return; }
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;padding:16px;';
        modal.innerHTML = `<div style="background:#0d0d0d;border:1px solid #222;border-radius:18px;width:100%;max-width:360px;padding:20px;">
            <h3 style="font-weight:900;margin-bottom:14px;font-size:15px;"><i class='bx bx-crown' style="color:#FFD600;"></i> Elegir nuevo capitán</h3>
            <div style="font-size:11px;color:#555;margin-bottom:12px;">Cambios restantes: ${2 - changesCount}</div>
            ${players.map(p => `<div onclick="CancheroMatchPlayers._doChangeCaptain('${matchId}','${team}','${p.player_email.replace(/'/g,"\\'")}','${(p.player_name||'').replace(/'/g,"\\'")}');this.closest('[style*=fixed]').remove();"
                style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid #1a1a1a;cursor:pointer;" onmouseover="this.style.background='rgba(255,214,0,0.05)'" onmouseout="this.style.background='transparent'">
                <div style="width:36px;height:36px;border-radius:50%;background:#FFD60022;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;color:#FFD600;">${(p.player_name||'?')[0].toUpperCase()}</div>
                <div style="font-weight:700;font-size:13px;">${p.player_name||p.player_email}</div>
            </div>`).join('')}
            <button onclick="this.closest('[style*=fixed]').remove()" style="width:100%;margin-top:10px;background:transparent;border:1px solid #333;color:#888;border-radius:10px;padding:8px;cursor:pointer;">Cancelar</button>
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    }

    async function _doChangeCaptain(matchId, team, newEmail, newName) {
        const sb = getSb(); const user = getUser();
        if (!sb || !user) return;
        const { data: match } = await sb.from('matches').select('*').eq('id', matchId).single();
        if (!match) return;
        const changesField = team === 'home' ? 'captain_home_changes' : 'captain_away_changes';
        const captainField = team === 'home' ? 'captain_home_email' : 'captain_away_email';
        const currentChanges = match[changesField] || 0;
        if (currentChanges >= 2) { toast('Cambios agotados.', 'warning'); return; }
        const oldCaptain = match[captainField];
        await sb.from('matches').update({
            [captainField]: newEmail,
            [changesField]: currentChanges + 1
        }).eq('id', matchId);
        await sb.from('match_players').update({ is_captain: false }).eq('match_id', matchId).eq('player_email', oldCaptain || '');
        await sb.from('match_players').update({ is_captain: true }).eq('match_id', matchId).eq('player_email', newEmail);
        await sb.from('match_captain_log').insert({
            match_id: matchId, team, old_captain_email: oldCaptain, new_captain_email: newEmail, changed_by: user.email
        });
        toast(`${newName} es el nuevo capitán 👑`, 'success');
        openPlayersPanel(matchId);
    }

    // Capitán extra (co-capitán): marca/desmarca is_captain sin quitar a los demás
    async function toggleCoCaptain(matchId, playerEmail, makeCaptain) {
        const sb = getSb();
        if (!sb || !playerEmail) return;
        try {
            await sb.from('match_players').update({ is_captain: !!makeCaptain }).eq('match_id', matchId).eq('player_email', playerEmail);
            // Si se hace capitán extra y no hay captain_away, asignarlo ahí
            if (makeCaptain) {
                const { data: m } = await sb.from('matches').select('captain_home_email,captain_away_email').eq('id', matchId).single();
                if (m && !m.captain_away_email && m.captain_home_email !== playerEmail) {
                    await sb.from('matches').update({ captain_away_email: playerEmail }).eq('id', matchId).catch(function(){});
                }
            }
            toast(makeCaptain ? 'Capitán extra asignado 👑' : 'Capitanía quitada', 'success');
            openPlayersPanel(matchId);
        } catch(e) { toast('Error: ' + e.message, 'error'); }
    }

    // ═══════════════════════════════════════════════════════════
    // SISTEMA DE APUESTAS / PREMIOS
    // ═══════════════════════════════════════════════════════════
    async function openBetModal(matchId, userRole) {
        const sb = getSb(); const user = getUser();
        if (!sb) { toast('Sin conexión.', 'error'); return; }
        const { data: match } = await sb.from('matches').select('*').eq('id', matchId).single();
        const { data: bet } = await sb.from('match_bets').select('*').eq('match_id', matchId).maybeSingle();
        const isCaptain = userRole === 'captain' || userRole === 'player';
        const isCaptainHome = user && (match?.created_by === user.email || match?.captain_home_email === user.email);
        const isCaptainAway = user && match?.captain_away_email === user.email;
        const myTeam = isCaptainHome ? 'home' : isCaptainAway ? 'away' : null;

        const existing = document.getElementById('bet-modal');
        if (existing) existing.remove();
        const modal = document.createElement('div');
        modal.id = 'bet-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;padding:16px;';

        let content = '';
        if (!bet) {
            // Crear apuesta
            content = myTeam ? `
                <div style="font-size:12px;color:#aaa;margin-bottom:12px;line-height:1.6;">
                    Proponé algo que se lleve el equipo ganador. Puede ser cualquier cosa.<br>
                    <em style="color:#666;">Ejemplo: "la coca", "los almuerzos", "las remeras"</em>
                </div>
                <input id="bet-text-input" type="text" value="La coca" placeholder="¿Qué apuestan?"
                    style="width:100%;background:#111;border:1px solid #333;color:#fff;border-radius:10px;padding:10px 12px;font-size:14px;margin-bottom:12px;">
                <button onclick="CancheroMatchPlayers._proposeBet('${matchId}','${myTeam}')" style="width:100%;background:var(--accent);color:#000;border:none;border-radius:12px;padding:12px;font-weight:900;font-size:14px;cursor:pointer;">
                    <i class='bx bx-gift'></i> PROPONER APUESTA
                </button>`
                : '<div style="padding:20px;text-align:center;color:#888;">Aún no hay apuesta propuesta para este partido.</div>';
        } else {
            const statusMap = { proposed: '⏳ Propuesta pendiente', countered: '↩️ Contraoferta', accepted: '✅ Aceptada', rejected: '❌ Rechazada' };
            const betTeamLabel = bet.proposer_team === 'home' ? 'equipo local' : 'equipo visitante';
            content = `
                <div style="background:rgba(255,170,0,0.06);border:1px solid rgba(255,170,0,0.2);border-radius:12px;padding:14px;margin-bottom:14px;">
                    <div style="font-size:10px;color:#ffaa00;font-weight:900;letter-spacing:1px;margin-bottom:6px;">${statusMap[bet.status] || bet.status}</div>
                    <div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:4px;">"${bet.bet_text}"</div>
                    <div style="font-size:11px;color:#666;">Propuesto por el ${betTeamLabel} · ${bet.edits_count}/4 modificaciones</div>
                    ${bet.counter_text ? `<div style="margin-top:8px;padding:8px;background:#1a1a1a;border-radius:8px;font-size:12px;color:#aaa;">Contraoferta: "${bet.counter_text}"</div>` : ''}
                </div>
                ${bet.status === 'accepted' ? '<div style="text-align:center;padding:20px;font-size:24px;">🎉 Apuesta aceptada por ambos equipos</div>' : ''}
                ${(myTeam && bet.status !== 'accepted' && bet.status !== 'rejected' && bet.edits_count < 4) ? `
                <div style="display:flex;flex-direction:column;gap:8px;">
                    ${(bet.status === 'proposed' && myTeam !== bet.proposer_team) || (bet.status === 'countered' && myTeam === bet.proposer_team) ? `
                    <button onclick="CancheroMatchPlayers._acceptBet('${bet.id}','${myTeam}','${matchId}')" style="background:#00e676;color:#000;border:none;border-radius:10px;padding:10px;font-weight:900;cursor:pointer;">✅ ACEPTAR</button>
                    <input id="counter-text" type="text" placeholder="Contraoferta..." style="background:#111;border:1px solid #333;color:#fff;border-radius:10px;padding:9px 12px;font-size:13px;">
                    <button onclick="CancheroMatchPlayers._counterBet('${bet.id}','${myTeam}','${matchId}')" style="background:rgba(255,170,0,0.1);color:#ffaa00;border:1px solid rgba(255,170,0,0.3);border-radius:10px;padding:9px;font-weight:700;cursor:pointer;">↩️ CONTRAOFERTA</button>
                    <button onclick="CancheroMatchPlayers._rejectBet('${bet.id}','${matchId}')" style="background:rgba(255,68,68,0.08);color:#ff4444;border:1px solid rgba(255,68,68,0.2);border-radius:10px;padding:9px;font-weight:700;cursor:pointer;">❌ RECHAZAR</button>
                    ` : '<div style="text-align:center;padding:12px;color:#555;font-size:12px;">Esperando respuesta del otro equipo...</div>'}
                </div>` : ''}`;
        }

        modal.innerHTML = `<div style="background:#0d0d0d;border:1px solid #222;border-radius:20px;width:100%;max-width:400px;padding:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3 style="font-weight:900;font-size:16px;"><i class='bx bx-gift' style="color:#ffaa00;"></i> Apuesta / Premio</h3>
                <button onclick="document.getElementById('bet-modal').remove()" style="background:none;border:none;color:#888;font-size:22px;cursor:pointer;">&times;</button>
            </div>
            ${content}
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    }

    async function _proposeBet(matchId, proposerTeam) {
        const sb = getSb(); const user = getUser();
        const text = document.getElementById('bet-text-input')?.value.trim();
        if (!text) { toast('Escribí qué apostás.', 'warning'); return; }
        if (_containsOffensive(text)) { toast('El contenido no está permitido.', 'error'); return; }
        // No usar upsert con onConflict: la tabla puede no tener UNIQUE en match_id.
        // Buscar apuesta existente y actualizar, o insertar una nueva.
        const payload = {
            match_id: matchId,
            proposer_email: user.email,
            proposer_team: proposerTeam,
            bet_text: text,
            status: 'proposed',
            edits_count: 0,
            accepted_home: false,
            accepted_away: false
        };
        const { data: existingBet } = await sb.from('match_bets').select('id').eq('match_id', matchId).maybeSingle();
        let error;
        if (existingBet && existingBet.id) {
            ({ error } = await sb.from('match_bets').update(payload).eq('id', existingBet.id));
        } else {
            ({ error } = await sb.from('match_bets').insert(payload));
        }
        if (error) { toast('Error: ' + error.message, 'error'); return; }
        toast('Apuesta propuesta ✓', 'success');
        document.getElementById('bet-modal')?.remove();
        openBetModal(matchId, 'captain');
    }

    async function _acceptBet(betId, acceptorTeam, matchId) {
        const sb = getSb();
        const field = acceptorTeam === 'home' ? 'accepted_home' : 'accepted_away';
        const { data: bet } = await sb.from('match_bets').update({ [field]: true }).eq('id', betId).select().single();
        // Si ambos aceptaron → status = accepted
        if (bet && bet.accepted_home && bet.accepted_away) {
            await sb.from('match_bets').update({ status: 'accepted' }).eq('id', betId);
        }
        toast('Apuesta aceptada ✓', 'success');
        document.getElementById('bet-modal')?.remove();
        openBetModal(matchId, 'captain');
    }

    async function _counterBet(betId, counterTeam, matchId) {
        const sb = getSb();
        const text = document.getElementById('counter-text')?.value.trim();
        if (!text) { toast('Escribí tu contraoferta.', 'warning'); return; }
        if (_containsOffensive(text)) { toast('El contenido no está permitido.', 'error'); return; }
        const { data: bet } = await sb.from('match_bets').select('edits_count').eq('id', betId).single();
        if (!bet || bet.edits_count >= 4) { toast('Se agotaron las modificaciones.', 'warning'); return; }
        await sb.from('match_bets').update({
            counter_text: text,
            status: 'countered',
            edits_count: (bet.edits_count || 0) + 1,
            accepted_home: false,
            accepted_away: false
        }).eq('id', betId);
        toast('Contraoferta enviada ✓', 'success');
        document.getElementById('bet-modal')?.remove();
        openBetModal(matchId, 'captain');
    }

    async function _rejectBet(betId, matchId) {
        const sb = getSb();
        await sb.from('match_bets').update({ status: 'rejected' }).eq('id', betId);
        toast('Apuesta rechazada.', 'default');
        document.getElementById('bet-modal')?.remove();
        openBetModal(matchId, 'captain');
    }

    function _containsOffensive(text) {
        const forbidden = ['puta','mierda','culo','pene','vagina','nazi','hitler','concha','carajo','pelotudo','boludo','hdp','hdm','forro','sorete'];
        const lower = (text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
        return forbidden.some(w => lower.includes(w));
    }

    // ═══════════════════════════════════════════════════════════
    // INVITACIONES en tab "invitados" — override para team support
    // ═══════════════════════════════════════════════════════════
    async function loadMatchInvitesV2(container, email) {
        const sb = getSb();
        const { data } = await sb.from('match_invites').select('*, matches(*)').eq('to_email', email).eq('status', 'pendiente').order('created_at', { ascending: false });
        if (!data || !data.length) {
            container.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#555;font-size:13px;"><i class="bx bx-envelope-open" style="font-size:32px;display:block;margin-bottom:8px;opacity:0.4;"></i>No tenés invitaciones pendientes.</div>';
            return;
        }
        container.innerHTML = data.map(inv => {
            const match = inv.matches;
            const teamLabel = inv.team === 'away' ? '🟣 Equipo Visitante' : '🟢 Equipo Local';
            const dateStr = match?.scheduled_at ? new Date(match.scheduled_at).toLocaleDateString('es-UY', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '';
            return `<div style="background:#111;border:1px solid #222;border-radius:14px;padding:16px;margin-bottom:12px;">
                <div style="font-size:11px;color:var(--accent);font-weight:700;margin-bottom:6px;">⚽ INVITACIÓN A PARTIDO</div>
                <div style="font-weight:900;font-size:15px;margin-bottom:4px;">${match?.name || 'Partido'}</div>
                <div style="display:flex;gap:8px;font-size:11px;color:#888;margin-bottom:10px;flex-wrap:wrap;">
                    <span>📅 ${dateStr}</span>
                    <span>📍 ${match?.venue || match?.city || 'Sin cancha'}</span>
                    <span style="color:${inv.team==='away'?'#9c88ff':'var(--accent)'};font-weight:700;">${teamLabel}</span>
                </div>
                <div style="display:flex;gap:8px;">
                    <button onclick="CancheroMatchPlayers.acceptMatchInviteV2('${inv.id}','${inv.match_id}','${inv.team}')" style="flex:1;background:var(--accent);color:#000;border:none;border-radius:10px;padding:10px;font-weight:900;font-size:12px;cursor:pointer;">✓ ACEPTAR</button>
                    <button onclick="CancheroMatchPlayers.rejectMatchInviteV2('${inv.id}')" style="flex:1;background:#1a1a1a;color:#ff4444;border:1px solid #ff4444;border-radius:10px;padding:10px;font-weight:700;font-size:12px;cursor:pointer;">✗ RECHAZAR</button>
                    <button onclick="window.viewMatchDetails&&window.viewMatchDetails('${inv.match_id}')" style="background:#1a1a1a;color:#aaa;border:1px solid #222;border-radius:10px;padding:10px;font-size:11px;cursor:pointer;" title="Ver partido"><i class='bx bx-info-circle'></i></button>
                </div>
            </div>`;
        }).join('');
    }

    return {
        openPlayersPanel,
        balancearEquipos,
        openInvitePlayer,
        _searchPlayers,
        _sendInvite,
        acceptMatchInviteV2,
        rejectMatchInviteV2,
        removePlayer,
        openChangeCaptain,
        _doChangeCaptain,
        toggleCoCaptain,
        openBetModal,
        _proposeBet,
        _acceptBet,
        _counterBet,
        _rejectBet,
        loadMatchInvitesV2,
    };
})();
