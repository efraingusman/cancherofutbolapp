// canchero-tournaments.js — Sistema completo de torneos para Canchero
// Fixture, grupos, eliminación directa, estadísticas, rankings, inscripción con pago
// v2026-05-31

window.CancheroTournaments = (function() {
    'use strict';

    function getSb() { return window._sb; }
    function getUser() { return window.userData || null; }
    function toast(msg, type) { if (typeof showToast === 'function') showToast(msg, type || 'success'); }

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
                        <select id="ct-format" style="width:100%;background:#111;border:1px solid #222;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;">
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
            const { data, error } = await sb.from('tournaments').insert({
                organizer_email: email,
                name,
                description: document.getElementById('ct-desc')?.value.trim() || null,
                format: document.getElementById('ct-format')?.value || 'groups',
                max_teams: parseInt(document.getElementById('ct-max-teams')?.value) || 8,
                start_date: document.getElementById('ct-start')?.value || null,
                end_date: document.getElementById('ct-end')?.value || null,
                city: document.getElementById('ct-city')?.value.trim() || null,
                prize_pool: document.getElementById('ct-prize')?.value.trim() || null,
                entry_fee: parseFloat(document.getElementById('ct-fee')?.value) || 0,
                payment_link: document.getElementById('ct-payment-link')?.value.trim() || null,
                rules: document.getElementById('ct-rules')?.value.trim() || null,
                status: 'registration'
            }).select('id').single();
            if (error) throw error;
            document.getElementById('ct-modal')?.remove();
            toast('¡Torneo creado! 🏆', 'success');
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
        const modal = document.createElement('div');
        modal.id = 'ctm-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.93);overflow-y:auto;';
        modal.innerHTML = `
        <div style="max-width:700px;margin:0 auto;padding:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 0 12px;">
                <div>
                    <h2 style="font-family:Outfit,sans-serif;font-weight:900;font-size:18px;margin-bottom:2px;"><i class='bx bx-trophy' style="color:var(--accent);"></i> ${t.name}</h2>
                    <div style="font-size:11px;color:#555;">${t.city||''} · ${_formatStatus(t.status)} · ${t.format === 'groups' ? 'Grupos + Eliminación' : t.format === 'league' ? 'Liga' : 'Eliminación directa'}</div>
                </div>
                <button onclick="document.getElementById('ctm-modal').remove()" style="background:none;border:none;color:#888;font-size:24px;cursor:pointer;">&times;</button>
            </div>
            <!-- Tabs -->
            <div style="display:flex;gap:6px;margin-bottom:16px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding-bottom:2px;">
                <button class="ctm-tab active" onclick="CancheroTournaments._ctmTab('equipos','${tournamentId}','${(organizerEmail||'').replace(/'/g,"\\'")}',this)" style="display:flex;align-items:center;gap:6px;background:rgba(186,255,0,0.12);color:var(--accent);border:1px solid rgba(186,255,0,0.3);border-radius:20px;padding:8px 16px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;transition:.15s;"><i class='bx bx-shield-quarter'></i> Equipos</button>
                <button class="ctm-tab" onclick="CancheroTournaments._ctmTab('fixture','${tournamentId}','${(organizerEmail||'').replace(/'/g,"\\'")}',this)" style="display:flex;align-items:center;gap:6px;background:transparent;color:#888;border:1px solid #222;border-radius:20px;padding:8px 16px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;transition:.15s;"><i class='bx bx-calendar'></i> Fixture</button>
                <button class="ctm-tab" onclick="CancheroTournaments._ctmTab('tabla','${tournamentId}','${(organizerEmail||'').replace(/'/g,"\\'")}',this)" style="display:flex;align-items:center;gap:6px;background:transparent;color:#888;border:1px solid #222;border-radius:20px;padding:8px 16px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;transition:.15s;"><i class='bx bx-list-ol'></i> Tabla</button>
                <button class="ctm-tab" onclick="CancheroTournaments._ctmTab('jugadores','${tournamentId}','${(organizerEmail||'').replace(/'/g,"\\'")}',this)" style="display:flex;align-items:center;gap:6px;background:transparent;color:#888;border:1px solid #222;border-radius:20px;padding:8px 16px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;transition:.15s;"><i class='bx bx-group'></i> Jugadores</button>
                <button class="ctm-tab" onclick="CancheroTournaments._ctmTab('goleadores','${tournamentId}','${(organizerEmail||'').replace(/'/g,"\\'")}',this)" style="display:flex;align-items:center;gap:6px;background:transparent;color:#888;border:1px solid #222;border-radius:20px;padding:8px 16px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;transition:.15s;"><i class='bx bx-football'></i> Goleadores</button>
            </div>
            <div id="ctm-content" style="min-height:300px;"></div>
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
        _ctmTab('equipos', tournamentId, organizerEmail, modal.querySelector('.ctm-tab'));
    }

    window.CancheroTournaments = window.CancheroTournaments || {};

    function _formatStatus(s) {
        const map = { draft:'Borrador', registration:'Inscripciones abiertas', active:'En curso', finished:'Finalizado', cancelled:'Cancelado' };
        return map[s] || s;
    }

    // ── Gestión de equipos ──────────────────────────────────
    async function _ctmEquipos(tournamentId, organizerEmail) {
        const sb = getSb();
        const { data: t } = await sb.from('tournaments').select('entry_fee,payment_link,max_teams').eq('id', tournamentId).single();
        const { data: teams } = await sb.from('tournament_teams').select('*').eq('tournament_id', tournamentId).order('created_at');
        const container = document.getElementById('ctm-content');
        if (!container) return;
        const isOrg = getUser()?.email === organizerEmail;
        const fee = t?.entry_fee || 0;
        container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
            <div style="font-size:13px;color:#888;">${(teams||[]).length} / ${t?.max_teams||8} equipos inscriptos</div>
            ${fee > 0 ? `<div style="font-size:11px;color:var(--accent);background:rgba(186,255,0,0.08);border:1px solid rgba(186,255,0,0.2);border-radius:8px;padding:4px 10px;"><i class='bx bx-dollar-circle'></i> Inscripción: $${fee}</div>` : ''}
        </div>
        ${(teams||[]).map(team => _renderTeamCard(team, isOrg, t?.payment_link)).join('') || '<div style="text-align:center;padding:40px;color:#555;">Aún no hay equipos inscriptos.</div>'}
        ${!isOrg ? `<div style="margin-top:16px;padding:16px;background:#111;border:1px solid #1e1e1e;border-radius:14px;">
            <div style="font-weight:900;font-size:14px;margin-bottom:10px;">📋 Inscribir mi equipo</div>
            ${fee > 0 ? `<div style="font-size:12px;color:#aaa;margin-bottom:10px;">Precio de inscripción: <strong style="color:var(--accent);">$${fee}</strong>${t?.payment_link ? ` · <a href="${t.payment_link}" target="_blank" style="color:var(--accent);">Pagar aquí</a>` : ''}</div>` : ''}
            <div style="display:flex;gap:8px;">
                <input id="ctm-team-name" type="text" placeholder="Nombre de tu equipo" style="flex:1;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:9px 12px;font-size:13px;">
                <button onclick="CancheroTournaments._inscribeTeam('${tournamentId}','${(organizerEmail||'').replace(/'/g,"\\'")}' )" style="background:var(--accent);color:#000;border:none;border-radius:10px;padding:9px 16px;font-weight:900;font-size:13px;cursor:pointer;">Inscribir</button>
            </div>
            ${fee > 0 ? `<div style="margin-top:8px;"><input id="ctm-payment-proof" type="url" placeholder="URL del comprobante de pago (opcional)" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:9px 12px;font-size:12px;"></div>` : ''}
        </div>` : `<button onclick="CancheroTournaments._openAddTeam('${tournamentId}')" style="width:100%;margin-top:12px;background:rgba(186,255,0,0.08);color:var(--accent);border:1px solid rgba(186,255,0,0.25);border-radius:12px;padding:11px;font-weight:700;font-size:13px;cursor:pointer;"><i class='bx bx-plus'></i> Agregar equipo manualmente</button>`}
        ${isOrg && (teams||[]).some(t => t.status === 'approved') ? `<button onclick="CancheroTournaments._generateFixture('${tournamentId}')" style="width:100%;margin-top:10px;background:var(--accent);color:#000;border:none;border-radius:12px;padding:12px;font-weight:900;font-size:14px;cursor:pointer;"><i class='bx bx-shuffle'></i> GENERAR FIXTURE</button>` : ''}`;
    }

    function _renderTeamCard(team, isOrg, paymentLink) {
        const statusColors = { pending:'#ffaa00', approved:'#00e676', rejected:'#ff4444', eliminated:'#555' };
        const statusLabels = { pending:'⏳ Pendiente', approved:'✅ Aprobado', rejected:'❌ Rechazado', eliminated:'💀 Eliminado' };
        const payColors = { pending:'#ffaa00', paid:'#00e676', waived:'#4fc3f7' };
        const payLabels = { pending:'Sin pago', paid:'Pagado', waived:'Exento' };
        return `<div style="background:#111;border:1px solid #1e1e1e;border-radius:14px;padding:14px 16px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:800;font-size:14px;">${team.team_name}</div>
                    <div style="font-size:11px;color:#666;margin-top:2px;">Capitán: ${team.captain_name||team.captain_email||'—'} · ${team.players_count||0} jugadores</div>
                    <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
                        <span style="font-size:10px;font-weight:700;color:${statusColors[team.status]||'#888'};background:rgba(255,255,255,0.05);border-radius:6px;padding:2px 8px;">${statusLabels[team.status]||team.status}</span>
                        ${team.payment_status !== 'waived' ? `<span style="font-size:10px;font-weight:700;color:${payColors[team.payment_status]||'#888'};background:rgba(255,255,255,0.05);border-radius:6px;padding:2px 8px;">${payLabels[team.payment_status]||''}</span>` : ''}
                    </div>
                </div>
                ${isOrg ? `<div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
                    ${team.status === 'pending' ? `<button onclick="CancheroTournaments._approveTeam('${team.id}','approved')" style="background:rgba(0,230,118,0.12);color:#00e676;border:1px solid rgba(0,230,118,0.3);border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;"><i class='bx bx-check'></i> Aprobar</button>
                    <button onclick="CancheroTournaments._approveTeam('${team.id}','rejected')" style="background:rgba(255,68,68,0.08);color:#ff4444;border:1px solid rgba(255,68,68,0.2);border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;"><i class='bx bx-x'></i> Rechazar</button>` : ''}
                    ${team.payment_status === 'pending' ? `<button onclick="CancheroTournaments._markPaid('${team.id}')" style="background:rgba(186,255,0,0.08);color:var(--accent);border:1px solid rgba(186,255,0,0.25);border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;">💰 Marcar pagado</button>` : ''}
                    <button onclick="CancheroTournaments._openTeamPlayers('${team.id}','${team.team_name.replace(/'/g,"\\'")}')" style="background:rgba(255,255,255,0.04);color:#aaa;border:1px solid #222;border-radius:8px;padding:5px 10px;font-size:11px;cursor:pointer;">👥 Jugadores</button>
                </div>` : ''}
            </div>
            ${team.payment_proof_url ? `<div style="margin-top:8px;"><a href="${team.payment_proof_url}" target="_blank" style="font-size:11px;color:var(--accent);">📎 Ver comprobante</a></div>` : ''}
        </div>`;
    }

    async function _inscribeTeam(tournamentId, organizerEmail) {
        const sb = getSb();
        const user = getUser();
        if (!sb || !user) { toast('Iniciá sesión.', 'warning'); return; }
        const name = document.getElementById('ctm-team-name')?.value.trim();
        if (!name) { toast('Ingresá el nombre del equipo.', 'warning'); return; }
        const proofUrl = document.getElementById('ctm-payment-proof')?.value.trim() || null;
        const { error } = await sb.from('tournament_teams').insert({
            tournament_id: tournamentId,
            team_name: name,
            captain_email: user.email,
            captain_name: user.name || user.email,
            status: 'pending',
            payment_status: proofUrl ? 'pending' : 'pending',
            payment_proof_url: proofUrl
        });
        if (error) { toast('Error: ' + (error.message||''), 'error'); return; }
        toast('¡Equipo inscripto! Esperá la aprobación del organizador.', 'success');
        _ctmEquipos(tournamentId, organizerEmail);
    }

    async function _openAddTeam(tournamentId) {
        const name = prompt('Nombre del equipo:');
        if (!name) return;
        const sb = getSb();
        const user = getUser();
        const { error } = await sb.from('tournament_teams').insert({
            tournament_id: tournamentId,
            team_name: name.trim(),
            captain_email: user?.email || null,
            captain_name: user?.name || null,
            status: 'approved',
            payment_status: 'waived'
        });
        if (error) { toast('Error: ' + (error.message||''), 'error'); return; }
        toast('Equipo agregado.', 'success');
        const { data: t } = await getSb().from('tournaments').select('organizer_email').eq('id', tournamentId).single();
        _ctmEquipos(tournamentId, t?.organizer_email);
    }

    async function _approveTeam(teamId, status) {
        const sb = getSb();
        const { data: team } = await sb.from('tournament_teams').update({ status }).eq('id', teamId).select('tournament_id').single();
        toast(status === 'approved' ? 'Equipo aprobado ✓' : 'Equipo rechazado.', status === 'approved' ? 'success' : 'warning');
        if (team) {
            const { data: t } = await sb.from('tournaments').select('organizer_email').eq('id', team.tournament_id).single();
            _ctmEquipos(team.tournament_id, t?.organizer_email);
        }
    }

    async function _markPaid(teamId) {
        const sb = getSb();
        await sb.from('tournament_teams').update({ payment_status: 'paid' }).eq('id', teamId);
        toast('Pago registrado ✓', 'success');
        const { data: team } = await sb.from('tournament_teams').select('tournament_id').eq('id', teamId).single();
        if (team) {
            const { data: t } = await sb.from('tournaments').select('organizer_email').eq('id', team.tournament_id).single();
            _ctmEquipos(team.tournament_id, t?.organizer_email);
        }
    }

    async function _openTeamPlayers(teamId, teamName) {
        const sb = getSb();
        const { data: players } = await sb.from('tournament_players').select('*').eq('team_id', teamId).order('number');
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;padding:20px;';
        modal.innerHTML = `<div style="background:#0d0d0d;border:1px solid #222;border-radius:18px;width:100%;max-width:420px;max-height:85vh;overflow-y:auto;padding:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3 style="font-weight:900;font-size:15px;">👥 ${teamName}</h3>
                <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;color:#888;font-size:22px;cursor:pointer;">&times;</button>
            </div>
            ${(players||[]).map(p => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #1a1a1a;">
                <div style="width:28px;height:28px;border-radius:50%;background:rgba(186,255,0,0.1);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:var(--accent);">#${p.number||'—'}</div>
                <div style="flex:1;"><div style="font-weight:700;font-size:13px;">${p.player_name}</div><div style="font-size:10px;color:#666;">${p.position||'—'}</div></div>
                <div style="font-size:10px;color:#666;">⚽${p.goals||0} 🎯${p.assists||0}</div>
            </div>`).join('') || '<div style="text-align:center;padding:20px;color:#555;">Sin jugadores registrados.</div>'}
            <button onclick="CancheroTournaments._addPlayerToTeam('${teamId}')" style="width:100%;margin-top:12px;background:rgba(186,255,0,0.08);color:var(--accent);border:1px solid rgba(186,255,0,0.25);border-radius:10px;padding:10px;font-weight:700;cursor:pointer;font-size:13px;"><i class='bx bx-user-plus'></i> Agregar jugador</button>
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    }

    async function _addPlayerToTeam(teamId) {
        const name = prompt('Nombre del jugador:');
        if (!name) return;
        const number = prompt('Número de camiseta:') || '';
        const position = prompt('Posición (DEL, MED, DEF, ARQ):') || '';
        const sb = getSb();
        const { data: team } = await sb.from('tournament_teams').select('tournament_id').eq('id', teamId).single();
        await sb.from('tournament_players').insert({
            tournament_id: team?.tournament_id,
            team_id: teamId,
            player_name: name.trim(),
            number: parseInt(number) || null,
            position: position.toUpperCase() || null
        });
        await sb.from('tournament_teams').update({ players_count: ((await sb.from('tournament_players').select('*',{count:'exact',head:true}).eq('team_id',teamId)).count) }).eq('id', teamId);
        toast('Jugador agregado.', 'success');
    }

    // ═══════════════════════════════════════════════════════════
    // GENERAR FIXTURE
    // ═══════════════════════════════════════════════════════════
    async function _generateFixture(tournamentId) {
        const sb = getSb();
        const { data: t } = await sb.from('tournaments').select('*').eq('id', tournamentId).single();
        const { data: allTeams } = await sb.from('tournament_teams').select('*').eq('tournament_id', tournamentId).eq('status','approved');
        if (!allTeams || allTeams.length < 2) { toast('Necesitás al menos 2 equipos aprobados.', 'warning'); return; }
        if (!confirm(`¿Generar fixture para ${allTeams.length} equipos? Esto creará todos los partidos del torneo.`)) return;

        // Eliminar fixture anterior si existe
        await sb.from('tournament_matches').delete().eq('tournament_id', tournamentId);

        const matches = [];
        if (t.format === 'groups') {
            // Dividir en grupos de 4 (o menos si pocos equipos)
            const teamsPerGroup = Math.min(4, Math.ceil(allTeams.length / Math.max(1, Math.floor(allTeams.length / 4))));
            const groups = _splitGroups(allTeams, teamsPerGroup);
            const letters = 'ABCDEFGH'.split('');
            // Asignar letras de grupo
            for (let gi = 0; gi < groups.length; gi++) {
                const letter = letters[gi];
                for (const team of groups[gi]) {
                    await sb.from('tournament_teams').update({ group_letter: letter }).eq('id', team.id);
                }
                // Round-robin en el grupo
                const groupMatches = _roundRobin(groups[gi], 'groups', 1, letter);
                matches.push(...groupMatches);
            }
        } else if (t.format === 'league') {
            // Todos contra todos
            const leagueMatches = _roundRobin(allTeams, 'groups', 1, 'L');
            matches.push(...leagueMatches);
        } else {
            // Eliminación directa pura
            const elimMatches = _generateElimination(allTeams, _getPhase(allTeams.length));
            matches.push(...elimMatches);
        }

        // Insertar en DB
        if (matches.length > 0) {
            const { error } = await sb.from('tournament_matches').insert(
                matches.map(m => ({ ...m, tournament_id: tournamentId }))
            );
            if (error) { toast('Error al guardar fixture: ' + error.message, 'error'); return; }
        }

        await sb.from('tournaments').update({ status: 'active' }).eq('id', tournamentId);
        toast(`Fixture generado: ${matches.length} partidos ⚽`, 'success');
        _ctmTab('fixture', tournamentId, t.organizer_email, null);
    }

    function _splitGroups(teams, perGroup) {
        const shuffled = [...teams].sort(() => Math.random() - 0.5);
        const groups = [];
        for (let i = 0; i < shuffled.length; i += perGroup) groups.push(shuffled.slice(i, i + perGroup));
        return groups;
    }

    function _roundRobin(teams, phase, round, groupLetter) {
        const matches = [];
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                matches.push({ phase, round, group_letter: groupLetter, home_team_id: teams[i].id, away_team_id: teams[j].id, home_team_name: teams[i].team_name, away_team_name: teams[j].team_name, status: 'scheduled' });
            }
        }
        return matches;
    }

    function _getPhase(n) {
        if (n >= 16) return 'r16';
        if (n >= 8) return 'quarterfinal';
        if (n >= 4) return 'semifinal';
        return 'final';
    }

    function _generateElimination(teams, phase) {
        const matches = [];
        const pairs = [];
        for (let i = 0; i < teams.length; i += 2) {
            if (teams[i + 1]) pairs.push([teams[i], teams[i + 1]]);
        }
        for (const [h, a] of pairs) {
            matches.push({ phase, round: 1, home_team_id: h.id, away_team_id: a.id, home_team_name: h.team_name, away_team_name: a.team_name, status: 'scheduled' });
        }
        return matches;
    }

    // ═══════════════════════════════════════════════════════════
    // FIXTURE TAB
    // ═══════════════════════════════════════════════════════════
    async function _ctmFixture(tournamentId, organizerEmail) {
        const sb = getSb();
        const { data: matches } = await sb.from('tournament_matches').select('*').eq('tournament_id', tournamentId).order('phase').order('round').order('group_letter');
        const container = document.getElementById('ctm-content');
        if (!container) return;
        const isOrg = getUser()?.email === organizerEmail;
        if (!matches || !matches.length) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:#555;">No hay fixture generado aún.<br><span style="font-size:11px;">Primero aprobá los equipos y luego generá el fixture.</span></div>';
            return;
        }
        // Agrupar por fase y grupo
        const grouped = {};
        for (const m of matches) {
            const key = m.phase + (m.group_letter ? '_' + m.group_letter : '');
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(m);
        }
        const phaseLabels = { groups:'Fase de Grupos', league:'Liga', r16:'Octavos de Final', quarterfinal:'Cuartos de Final', semifinal:'Semifinales', final:'Final', third_place:'3er y 4to Puesto' };
        container.innerHTML = Object.entries(grouped).map(([key, groupMatches]) => {
            const phase = groupMatches[0].phase;
            const gl = groupMatches[0].group_letter;
            const title = `${phaseLabels[phase]||phase}${gl && phase === 'groups' ? ` — Grupo ${gl}` : ''}`;
            return `<div style="margin-bottom:16px;">
                <div style="font-size:11px;font-weight:900;color:#555;letter-spacing:1px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #1a1a1a;">${title.toUpperCase()}</div>
                ${groupMatches.map(m => _renderMatchRow(m, isOrg, tournamentId)).join('')}
            </div>`;
        }).join('');
    }

    function _renderMatchRow(m, isOrg, tournamentId) {
        const hasResult = m.home_score !== null && m.away_score !== null;
        const dateStr = m.scheduled_at ? new Date(m.scheduled_at).toLocaleDateString('es-UY', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : 'Por confirmar';
        return `<div style="background:#111;border:1px solid #1e1e1e;border-radius:12px;padding:12px 14px;margin-bottom:6px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <div style="flex:1;min-width:0;text-align:right;font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.home_team_name}</div>
                <div style="flex-shrink:0;text-align:center;min-width:80px;">
                    ${hasResult
                        ? `<div style="font-size:18px;font-weight:900;color:var(--accent);">${m.home_score} — ${m.away_score}</div>`
                        : `<div style="font-size:10px;color:#555;font-weight:700;">VS</div>`}
                    <div style="font-size:9px;color:#444;margin-top:2px;">${dateStr}</div>
                </div>
                <div style="flex:1;min-width:0;text-align:left;font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.away_team_name}</div>
            </div>
            ${isOrg ? `<div style="margin-top:8px;display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap;">
                <input id="hs-${m.id}" type="number" min="0" max="30" value="${m.home_score??''}" placeholder="Local" style="width:60px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:8px;padding:5px 8px;font-size:13px;text-align:center;">
                <span style="color:#555;font-size:14px;">—</span>
                <input id="as-${m.id}" type="number" min="0" max="30" value="${m.away_score??''}" placeholder="Visit." style="width:60px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:8px;padding:5px 8px;font-size:13px;text-align:center;">
                <button onclick="CancheroTournaments._saveResult('${m.id}','${m.tournament_id}','${m.home_team_id}','${m.away_team_id}','${(tournamentId||'').replace(/'/g,"\\'")}' )" style="background:var(--accent);color:#000;border:none;border-radius:8px;padding:5px 12px;font-weight:900;font-size:11px;cursor:pointer;">Guardar</button>
            </div>` : ''}
        </div>`;
    }

    async function _saveResult(matchId, tournamentId, homeTeamId, awayTeamId, tid) {
        const sb = getSb();
        const homeScore = parseInt(document.getElementById('hs-' + matchId)?.value);
        const awayScore = parseInt(document.getElementById('as-' + matchId)?.value);
        if (isNaN(homeScore) || isNaN(awayScore)) { toast('Ingresá ambos marcadores.', 'warning'); return; }
        const winnerId = homeScore > awayScore ? homeTeamId : awayScore > homeScore ? awayTeamId : null;
        await sb.from('tournament_matches').update({ home_score: homeScore, away_score: awayScore, status: 'finished', winner_team_id: winnerId || null }).eq('id', matchId);
        // Actualizar puntos de los equipos
        await _updateTeamStats(homeTeamId, homeScore, awayScore);
        await _updateTeamStats(awayTeamId, awayScore, homeScore);
        toast('Resultado guardado ✓', 'success');
        const { data: t } = await sb.from('tournaments').select('organizer_email').eq('id', tid).single();
        _ctmFixture(tid, t?.organizer_email);
    }

    async function _updateTeamStats(teamId, goalsFor, goalsAgainst) {
        const sb = getSb();
        const { data: team } = await sb.from('tournament_teams').select('*').eq('id', teamId).single();
        if (!team) return;
        const won = goalsFor > goalsAgainst;
        const drew = goalsFor === goalsAgainst;
        await sb.from('tournament_teams').update({
            wins: (team.wins||0) + (won ? 1 : 0),
            draws: (team.draws||0) + (drew ? 1 : 0),
            losses: (team.losses||0) + (!won && !drew ? 1 : 0),
            points: (team.points||0) + (won ? 3 : drew ? 1 : 0),
            goals_for: (team.goals_for||0) + goalsFor,
            goals_against: (team.goals_against||0) + goalsAgainst
        }).eq('id', teamId);
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
                    const rowStyle = i < 2 ? 'background:rgba(186,255,0,0.04);' : '';
                    return `<tr style="${rowStyle}border-bottom:1px solid #111;">
                        <td style="padding:8px 8px;color:${i<2?'var(--accent)':'#555'};font-weight:900;">${i+1}</td>
                        <td style="padding:8px 8px;font-weight:700;">${t.team_name}</td>
                        <td style="padding:8px 5px;text-align:center;color:#888;">${pj}</td>
                        <td style="padding:8px 5px;text-align:center;color:#00e676;">${t.wins||0}</td>
                        <td style="padding:8px 5px;text-align:center;color:#ffaa00;">${t.draws||0}</td>
                        <td style="padding:8px 5px;text-align:center;color:#ff4444;">${t.losses||0}</td>
                        <td style="padding:8px 5px;text-align:center;">${t.goals_for||0}</td>
                        <td style="padding:8px 5px;text-align:center;">${t.goals_against||0}</td>
                        <td style="padding:8px 5px;text-align:center;color:${dg>0?'#00e676':dg<0?'#ff4444':'#888'};">${dg>0?'+':''}${dg}</td>
                        <td style="padding:8px 6px;text-align:center;font-weight:900;color:var(--accent);font-size:14px;">${t.points||0}</td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table></div>`;
    }

    // ═══════════════════════════════════════════════════════════
    // JUGADORES DEL TORNEO
    // ═══════════════════════════════════════════════════════════
    async function _ctmJugadores(tournamentId) {
        const sb = getSb();
        const { data: players } = await sb.from('tournament_players').select('*,tournament_teams(team_name)').eq('tournament_id', tournamentId).order('player_name');
        const container = document.getElementById('ctm-content');
        if (!container) return;
        if (!players || !players.length) { container.innerHTML = '<div style="text-align:center;padding:40px;color:#555;">Sin jugadores registrados aún.</div>'; return; }
        container.innerHTML = `<div style="font-size:11px;color:#555;margin-bottom:10px;">${players.length} jugadores en el torneo</div>
        <div style="display:grid;gap:6px;">
            ${players.map(p => `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#111;border:1px solid #1e1e1e;border-radius:10px;">
                <div style="width:30px;height:30px;border-radius:50%;background:rgba(186,255,0,0.1);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:var(--accent);flex-shrink:0;">${p.number||'—'}</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;font-size:13px;">${p.player_name}</div>
                    <div style="font-size:10px;color:#666;">${p.tournament_teams?.team_name||'—'} · ${p.position||'—'}</div>
                </div>
                <div style="font-size:11px;color:#666;white-space:nowrap;">⚽${p.goals||0} 🎯${p.assists||0} 🟨${p.yellow_cards||0}</div>
            </div>`).join('')}
        </div>`;
    }

    // ═══════════════════════════════════════════════════════════
    // GOLEADORES / RANKING
    // ═══════════════════════════════════════════════════════════
    async function _ctmGoleadores(tournamentId) {
        const sb = getSb();
        const { data: players } = await sb.from('tournament_players').select('*,tournament_teams(team_name)').eq('tournament_id', tournamentId).order('goals', {ascending:false}).order('assists',{ascending:false}).limit(20);
        const container = document.getElementById('ctm-content');
        if (!container) return;
        const topGoals = (players||[]).filter(p => (p.goals||0) > 0 || (p.assists||0) > 0);
        container.innerHTML = `<div style="font-size:11px;font-weight:900;color:#555;letter-spacing:1px;margin-bottom:10px;">TABLA DE GOLEADORES</div>
        ${!topGoals.length ? '<div style="text-align:center;padding:30px;color:#555;">Sin goles registrados aún.</div>' :
        `<table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead><tr style="color:#555;font-size:10px;font-weight:900;">
                <th style="text-align:left;padding:6px 8px;">#</th>
                <th style="text-align:left;padding:6px 8px;">JUGADOR</th>
                <th style="text-align:left;padding:6px 8px;">EQUIPO</th>
                <th style="padding:6px 6px;text-align:center;">⚽</th>
                <th style="padding:6px 6px;text-align:center;">🎯</th>
                <th style="padding:6px 6px;text-align:center;">🟨</th>
            </tr></thead>
            <tbody>
                ${topGoals.map((p,i) => `<tr style="border-bottom:1px solid #111;">
                    <td style="padding:8px 8px;color:${i<3?'var(--accent)':'#555'};font-weight:900;">${i+1}</td>
                    <td style="padding:8px 8px;font-weight:700;">${p.player_name}</td>
                    <td style="padding:8px 8px;color:#666;">${p.tournament_teams?.team_name||'—'}</td>
                    <td style="padding:8px 6px;text-align:center;font-weight:700;color:var(--accent);">${p.goals||0}</td>
                    <td style="padding:8px 6px;text-align:center;">${p.assists||0}</td>
                    <td style="padding:8px 6px;text-align:center;color:#ffaa00;">${p.yellow_cards||0}</td>
                </tr>`).join('')}
            </tbody>
        </table>`}`;
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
        else if (tab === 'jugadores') await _ctmJugadores(tournamentId);
        else if (tab === 'goleadores') await _ctmGoleadores(tournamentId);
    }

    // ═══════════════════════════════════════════════════════════
    // VISTA PÚBLICA DEL TORNEO (para cualquier usuario)
    // ═══════════════════════════════════════════════════════════
    async function openPublicView(tournamentId) {
        const sb = getSb();
        const { data: t } = await sb.from('tournaments').select('*').eq('id', tournamentId).single();
        if (!t) { toast('Torneo no encontrado.', 'error'); return; }
        const isOrg = getUser()?.email === t.organizer_email;
        const existing = document.getElementById('ctp-modal');
        if (existing) existing.remove();
        const modal = document.createElement('div');
        modal.id = 'ctp-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.95);overflow-y:auto;';
        const statusColors = { draft:'#555', registration:'#ffaa00', active:'#00e676', finished:'#4fc3f7', cancelled:'#ff4444' };
        modal.innerHTML = `
        <div style="max-width:680px;margin:0 auto;padding:20px;">
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
            <!-- Tabs públicas -->
            <div style="display:flex;gap:4px;margin-bottom:16px;overflow-x:auto;scrollbar-width:none;">
                <button class="ctp-tab active" onclick="CancheroTournaments._ctpTab('tabla','${tournamentId}','${(t.organizer_email||'').replace(/'/g,"\\'")}',this)" style="background:rgba(186,255,0,0.12);color:var(--accent);border:1px solid rgba(186,255,0,0.3);border-radius:10px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">📊 Tabla</button>
                <button class="ctp-tab" onclick="CancheroTournaments._ctpTab('fixture','${tournamentId}','${(t.organizer_email||'').replace(/'/g,"\\'")}',this)" style="background:transparent;color:#666;border:1px solid #222;border-radius:10px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">📅 Fixture</button>
                <button class="ctp-tab" onclick="CancheroTournaments._ctpTab('equipos','${tournamentId}','${(t.organizer_email||'').replace(/'/g,"\\'")}',this)" style="background:transparent;color:#666;border:1px solid #222;border-radius:10px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">⚽ Equipos</button>
                <button class="ctp-tab" onclick="CancheroTournaments._ctpTab('goleadores','${tournamentId}','${(t.organizer_email||'').replace(/'/g,"\\'")}',this)" style="background:transparent;color:#666;border:1px solid #222;border-radius:10px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">⚽ Goleadores</button>
                <button class="ctp-tab" onclick="CancheroTournaments._ctpTab('jugadores','${tournamentId}','${(t.organizer_email||'').replace(/'/g,"\\'")}',this)" style="background:transparent;color:#666;border:1px solid #222;border-radius:10px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">👥 Jugadores</button>
                ${t.status === 'registration' && !isOrg ? `<button class="ctp-tab" onclick="CancheroTournaments._ctpTab('inscribir','${tournamentId}','${(t.organizer_email||'').replace(/'/g,"\\'")}',this)" style="background:rgba(186,255,0,0.05);color:var(--accent);border:1px solid rgba(186,255,0,0.2);border-radius:10px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">✍️ Inscribirme</button>` : ''}
            </div>
            <div id="ctp-content" style="min-height:200px;"></div>
            ${t.rules ? `<div style="margin-top:16px;padding:14px;background:#111;border:1px solid #1e1e1e;border-radius:12px;"><div style="font-size:10px;font-weight:900;color:#555;letter-spacing:1px;margin-bottom:8px;">REGLAMENTO</div><p style="font-size:12px;color:#888;line-height:1.6;white-space:pre-wrap;">${t.rules}</p></div>` : ''}
        </div>`;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
        _ctpTab('tabla', tournamentId, t.organizer_email, modal.querySelector('.ctp-tab'));
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
        else if (tab === 'inscribir') { tempEl.innerHTML = `<div style="padding:16px;background:#111;border:1px solid #1e1e1e;border-radius:14px;"><div style="font-weight:900;font-size:14px;margin-bottom:10px;">📋 Inscribir mi equipo</div><div style="display:flex;gap:8px;"><input id="ctm-team-name" type="text" placeholder="Nombre de tu equipo" style="flex:1;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:10px;padding:9px 12px;font-size:13px;"><button onclick="CancheroTournaments._inscribeTeam('${tournamentId}','${(organizerEmail||'').replace(/'/g,"\\'")}' )" style="background:var(--accent);color:#000;border:none;border-radius:10px;padding:9px 16px;font-weight:900;font-size:13px;cursor:pointer;">Inscribir</button></div></div>`; }
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
        const isOwner = getUser()?.email === organizerEmail;
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
    // EXPORTS PÚBLICOS
    // ═══════════════════════════════════════════════════════════
    return {
        openCreateTournament,
        openTournamentManager,
        openPublicView,
        renderOrgTournaments,
        _ctmTab,
        _ctpTab,
        _submitCreate,
        _inscribeTeam,
        _openAddTeam,
        _approveTeam,
        _markPaid,
        _openTeamPlayers,
        _addPlayerToTeam,
        _generateFixture,
        _saveResult,
    };
})();
