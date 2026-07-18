// ============================================================
// CANCHERO POLLS — Sistema de Encuestas
// ============================================================
// Tablas requeridas (ejecutar en Supabase):
//   CREATE TABLE public.polls (...)
//   CREATE TABLE public.poll_votes (...)
// Ver db/polls-2026-05-31.sql
// ============================================================

window.CancheroPolls = (function () {
    'use strict';

    function getSb() { return window._sb || null; }
    function getMe() { return window.userData || null; }
    // Encuestas ya votadas (para no re-mostrarlas en el feed). Persistido en localStorage.
    function _getVotedSet() {
        try { return new Set(JSON.parse(localStorage.getItem('poll_voted') || '[]')); } catch(e) { return new Set(); }
    }
    function _markVoted(pollId) {
        try { const s = _getVotedSet(); s.add(pollId); localStorage.setItem('poll_voted', JSON.stringify([...s])); } catch(e) {}
    }
    function esc(s) { return (s || '').replace(/'/g, "\\'"); }
    function escH(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    // ── Tiempo restante ──────────────────────────────────────
    function timeLeft(expiresAt) {
        if (!expiresAt) return null;
        const left = new Date(expiresAt) - Date.now();
        if (left <= 0) return 'Finalizada';
        const h = Math.floor(left / 3600000);
        const m = Math.floor((left % 3600000) / 60000);
        if (h >= 24) return `${Math.floor(h/24)}d ${h%24}h`;
        if (h >= 1) return `${h}h ${m}m`;
        return `${m}m`;
    }

    // ── Renderizar card de encuesta ──────────────────────────
    function renderPollCard(poll, myVote, opts) {
        opts = opts || {};
        const me = getMe();
        const isOwn = me && (me.email||'').toLowerCase() === (poll.creator_email||'').toLowerCase();
        const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();
        const voted = myVote !== null && myVote !== undefined;
        const showResults = voted || isOwn || isExpired || opts.alwaysShowResults;
        const options = Array.isArray(poll.options) ? poll.options : [];
        const totalVotes = poll.total_votes || options.reduce((s, o) => s + (o.votes_count || 0), 0);
        const remaining = poll.is_pinned ? null : timeLeft(poll.expires_at);
        const avatarSrc = (isOwn && me && me.photo) ? me.photo : (poll.creator_photo || '');
        const initials = ((poll.creator_name || '?')[0]).toUpperCase();
        const isPinned = poll.is_pinned;

        // MISMO encuadre que toda la app (photoStyle del dueño o rostro center 25%)
        const _avCssP = (window._avatarBgCss && window._avatarBgCss({ photo: avatarSrc, photo_style: (isOwn && me) ? (me.photoStyle || me.photo_style) : (poll._creator_pstyle || null) })) || null;
        const avatarHtml = avatarSrc
            ? `<div onclick="window.viewUserProfile('${esc(poll.creator_email)}')" style="width:42px;height:42px;border-radius:50%;${_avCssP || `background-image:url('${avatarSrc}');background-size:cover;background-position:center 25%;`}flex-shrink:0;cursor:pointer;border:2px solid #222;"></div>`
            : `<div onclick="window.viewUserProfile('${esc(poll.creator_email)}')" style="width:42px;height:42px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:17px;color:#000;flex-shrink:0;cursor:pointer;border:2px solid #222;">${initials}</div>`;

        const menuBtn = isOwn
            ? `<div style="display:flex;gap:2px;flex-shrink:0;">
                <button onclick="CancheroPolls.togglePin('${esc(poll.id)}')" title="${isPinned?'Desfijar':'Fijar'}" style="background:none;border:none;cursor:pointer;padding:4px 5px;border-radius:8px;color:${isPinned?'var(--accent)':'#555'};font-size:18px;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='none'"><i class='bx bx-pin'></i></button>
                <button onclick="CancheroPolls.deletePoll('${esc(poll.id)}')" title="Eliminar" style="background:none;border:none;cursor:pointer;padding:4px 5px;border-radius:8px;color:#555;font-size:18px;" onmouseover="this.style.color='#ff4d4d'" onmouseout="this.style.color='#555'"><i class='bx bx-trash'></i></button>
               </div>`
            : `<button onclick="CancheroPolls.openShareMenu('${esc(poll.id)}')" style="background:none;border:none;color:#555;cursor:pointer;font-size:22px;padding:0 4px;flex-shrink:0;line-height:1;">⋯</button>`;

        const optionsHtml = options.map((opt, i) => {
            const cnt = opt.votes_count || 0;
            const pct = totalVotes > 0 ? Math.round((cnt / totalVotes) * 100) : 0;
            const isMyVote = voted && myVote === i;
            const winnerPct = showResults ? Math.max(...options.map(o => totalVotes > 0 ? Math.round(((o.votes_count||0)/totalVotes)*100) : 0)) : 0;
            const isWinner = showResults && pct === winnerPct && pct > 0;
            // Permitir cambiar el voto las veces que quiera mientras la encuesta esté activa
            const canVote = !isExpired && me;

            return `<div id="poll-opt-${poll.id}-${i}" onclick="${canVote ? `CancheroPolls.vote('${esc(poll.id)}',${i})` : ''}"
                style="position:relative;padding:11px 14px;border-radius:12px;border:1.5px solid ${isMyVote ? 'var(--accent)' : isWinner && showResults ? 'rgba(186,255,0,0.35)' : '#252525'};margin-bottom:8px;cursor:${canVote?'pointer':'default'};overflow:hidden;transition:.2s;background:${isMyVote ? 'rgba(186,255,0,0.06)' : '#0d0d0d'};"
                ${canVote ? 'onmouseover="this.style.borderColor=\'rgba(186,255,0,0.4)\'" onmouseout="this.style.borderColor=\'#252525\'"' : ''}>
                ${showResults ? `<div style="position:absolute;top:0;left:0;height:100%;width:${pct}%;background:${isMyVote?'rgba(186,255,0,0.12)':'rgba(255,255,255,0.04)'};border-radius:10px;transition:width .5s;"></div>` : ''}
                <div style="position:relative;display:flex;align-items:center;justify-content:space-between;gap:8px;">
                    <span style="font-size:13px;font-weight:${isMyVote||isWinner?'700':'500'};color:${isMyVote?'var(--accent)':isWinner&&showResults?'#e0e0e0':'#ccc'};">
                        ${isMyVote ? '<i class=\'bx bx-check-circle\' style="color:var(--accent);margin-right:5px;"></i>' : ''}${escH(opt.text)}
                    </span>
                    ${showResults ? `<span style="font-size:12px;font-weight:700;color:${isMyVote?'var(--accent)':'#666'};white-space:nowrap;">${pct}% <span style="font-size:10px;color:#444;">(${cnt})</span></span>` : ''}
                </div>
            </div>`;
        }).join('');

        const shareHtml = `<div style="display:flex;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid #1a1a1a;">
            <button onclick="CancheroPolls.openShareMenu('${esc(poll.id)}')" style="background:none;border:none;color:#666;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:5px;padding:6px 0;flex:1;justify-content:flex-end;">
                <i class='bx bx-share-alt' style="font-size:18px;"></i> <span style="font-size:12px;">Compartir</span>
            </button>
        </div>`;

        const border = isPinned ? 'rgba(186,255,0,0.2)' : '#1e1e1e';
        const pinBadge = isPinned ? `<span style="font-size:9px;background:rgba(186,255,0,0.12);color:var(--accent);border:1px solid rgba(186,255,0,0.25);border-radius:10px;padding:2px 8px;font-weight:700;white-space:nowrap;"><i class='bx bx-pin'></i> FIJADA</span>` : '';
        const pollBadge = `<span style="font-size:9px;background:rgba(100,180,255,0.12);color:#64b4ff;border:1px solid rgba(100,180,255,0.25);border-radius:10px;padding:2px 8px;font-weight:700;">📊 ENCUESTA</span>`;

        return `<article id="poll-card-${poll.id}" class="poll-card" data-poll-id="${poll.id}" style="background:#111;border:1px solid ${border};border-radius:16px;padding:14px 16px;margin-bottom:12px;${isPinned?'box-shadow:0 0 16px rgba(186,255,0,0.06);':''}">
  <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
    ${avatarHtml}
    <div style="flex:1;min-width:0;">
      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:3px;">
        <span onclick="window.viewUserProfile('${esc(poll.creator_email)}')" style="font-weight:800;font-size:13px;cursor:pointer;" onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color=''">${escH(poll.creator_name||'Usuario')}</span>
        ${pinBadge}${pollBadge}
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:10px;color:#555;">${formatTimeAgo ? formatTimeAgo(poll.created_at) : ''}</span>
        ${remaining ? `<span style="font-size:10px;color:${isExpired?'#f44':'#555'};"><i class='bx bx-time-five'></i> ${remaining}</span>` : ''}
        <span style="font-size:10px;color:#444;">${totalVotes} voto${totalVotes !== 1 ? 's' : ''}</span>
      </div>
    </div>
    ${menuBtn}
  </div>
  <p style="font-size:15px;font-weight:800;color:#fff;margin:0 0 4px;line-height:1.4;">${escH(poll.title)}</p>
  ${poll.description ? `<p style="font-size:13px;color:#888;margin:0 0 12px;line-height:1.5;">${escH(poll.description)}</p>` : '<div style="margin-bottom:10px;"></div>'}
  <div id="poll-options-${poll.id}">${optionsHtml}</div>
  ${!me && !voted ? `<p style="font-size:11px;color:#555;text-align:center;margin:8px 0 0;">Iniciá sesión para votar</p>` : ''}
  ${isExpired ? `<p style="font-size:11px;color:#f44;text-align:center;margin:8px 0 0;font-weight:700;">⏱ Encuesta finalizada</p>` : ''}
  ${shareHtml}
</article>`;
    }

    // ── Votar ───────────────────────────────────────────────
    async function vote(pollId, optionIndex) {
        const sb = getSb(); const me = getMe();
        if (!sb || !me) { showToast && showToast('Iniciá sesión para votar', 'info'); return; }


        try {
            // Permitir CAMBIAR el voto: ver si ya votó y a qué opción
            const { data: prevVote } = await sb.from('poll_votes')
                .select('option_index').eq('poll_id', pollId).eq('voter_email', me.email).maybeSingle();
            const prevIdx = prevVote ? prevVote.option_index : null;
            if (prevIdx === optionIndex) { showToast && showToast('Ya votaste esa opción', 'info'); return; }

            if (prevVote) {
                await sb.from('poll_votes').update({ option_index: optionIndex }).eq('poll_id', pollId).eq('voter_email', me.email);
            } else {
                await sb.from('poll_votes').insert({ poll_id: pollId, voter_email: me.email, option_index: optionIndex });
            }
            // Actualizar votes_count: -1 a la opción anterior (si había), +1 a la nueva
            const { data: poll } = await sb.from('polls').select('options,total_votes').eq('id', pollId).single();
            if (poll) {
                const opts = [...(poll.options || [])];
                if (opts[optionIndex]) opts[optionIndex] = { ...opts[optionIndex], votes_count: (opts[optionIndex].votes_count || 0) + 1 };
                let newTotal = (poll.total_votes || 0) + (prevVote ? 0 : 1);
                if (prevIdx != null && opts[prevIdx]) opts[prevIdx] = { ...opts[prevIdx], votes_count: Math.max(0, (opts[prevIdx].votes_count || 0) - 1) };
                await sb.from('polls').update({ options: opts, total_votes: newTotal }).eq('id', pollId);
                // Re-render opciones
                const optContainer = document.getElementById(`poll-options-${pollId}`);
                if (optContainer) {
                    const full = { ...poll, id: pollId, options: opts, total_votes: newTotal };
                    optContainer.innerHTML = renderPollCard(full, optionIndex).match(/<div id="poll-options[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*[^<]/)?.[1] || optContainer.innerHTML;
                    // Reconstruir completo
                    const newCard = document.getElementById(`poll-card-${pollId}`);
                    if (newCard) {
                        const { data: freshPoll } = await sb.from('polls').select('*').eq('id', pollId).single();
                        if (freshPoll) newCard.outerHTML = renderPollCard(freshPoll, optionIndex);
                    }
                }
            }
            _markVoted(pollId);
            showToast && showToast('¡Voto registrado! No volverá a aparecer en tu feed.', 'success');
        } catch(e) {
            if (e.code === '23505') { showToast && showToast('Ya votaste en esta encuesta', 'info'); }
            else { showToast && showToast('Error al votar: ' + e.message, 'error'); }
        }
    }

    // ── Cargar encuestas del feed ────────────────────────────
    async function loadFeedPolls(containerEl, followingEmails) {
        const sb = getSb(); const me = getMe();
        if (!sb) return [];
        try {
            let q = sb.from('polls').select('*')
                .or(`expires_at.gt.${new Date().toISOString()},is_pinned.eq.true`)
                .eq('context', 'feed')
                .order('created_at', { ascending: false })
                .limit(30);
            if (followingEmails && followingEmails.length > 0) {
                // Incluir MIS propias encuestas en el feed (uno no se sigue a sí mismo)
                const list = me && me.email ? [...new Set([...followingEmails, me.email])] : followingEmails;
                q = q.in('creator_email', list);
            }
            const { data: polls } = await q;
            if (!polls || !polls.length) return [];
            // Identidad VIVA (IG): foto/nombre/encuadre ACTUALES del creador
            try {
                const ems = [...new Set(polls.map(p=>p.creator_email).filter(Boolean))];
                if (ems.length) {
                    const { data: us } = await sb.from('users').select('email,name,photo,photo_style').in('email', ems);
                    const um = {}; (us||[]).forEach(u=>um[u.email]=u);
                    polls.forEach(p => { const u = um[p.creator_email]; if (u) {
                        if (u.photo && !String(u.photo).includes('ui-avatars')) p.creator_photo = u.photo;
                        if (u.name) p.creator_name = u.name;
                        p._creator_pstyle = u.photo_style || null;
                    }});
                }
            } catch(e){}

            // Cargar mis votos en estas encuestas
            let myVotesMap = {};
            if (me) {
                const { data: myVotes } = await sb.from('poll_votes')
                    .select('poll_id, option_index')
                    .eq('voter_email', me.email)
                    .in('poll_id', polls.map(p => p.id));
                (myVotes || []).forEach(v => { myVotesMap[v.poll_id] = v.option_index; });
            }
            // Ocultar del feed las encuestas YA respondidas (DB o localStorage), salvo las propias y las fijadas
            const localVoted = _getVotedSet();
            const visible = polls.filter(p => {
                const isOwn = me && (p.creator_email||'').toLowerCase() === (me.email||'').toLowerCase();
                if (isOwn || p.is_pinned) return true;
                return !(p.id in myVotesMap) && !localVoted.has(p.id);
            });
            return visible.map(p => ({ ...p, _type: 'poll', _myVote: myVotesMap[p.id] ?? null }));
        } catch(e) { return []; }
    }

    // ── Cargar encuestas de un perfil ────────────────────────
    async function loadProfilePolls(email) {
        const sb = getSb(); const me = getMe();
        if (!sb) return [];
        try {
            const { data: polls } = await sb.from('polls').select('*')
                .ilike('creator_email', email)
                .or(`expires_at.gt.${new Date().toISOString()},is_pinned.eq.true`)
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(20);
            if (!polls || !polls.length) return [];
            let myVotesMap = {};
            if (me) {
                const { data: mv } = await sb.from('poll_votes').select('poll_id,option_index').eq('voter_email', me.email).in('poll_id', polls.map(p => p.id));
                (mv || []).forEach(v => { myVotesMap[v.poll_id] = v.option_index; });
            }
            return polls.map(p => ({ ...p, _type: 'poll', _myVote: myVotesMap[p.id] ?? null }));
        } catch(e) { return []; }
    }

    // ── Abrir creador de encuesta ────────────────────────────
    function openCreator(context, contextId, opts) {
        context = context || 'feed';
        opts = opts || {};
        const existing = document.getElementById('poll-creator-modal');
        if (existing) existing.remove();

        const contextLabel = context === 'chat' ? 'Chat' : context === 'match' ? 'Partido' : context === 'story' ? 'Historia' : 'Feed';

        const m = document.createElement('div');
        m.id = 'poll-creator-modal';
        m.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
        m.innerHTML = `
        <div style="background:#0f110f;border:1px solid #1e1e1e;border-radius:20px;width:100%;max-width:440px;max-height:88vh;overflow-y:auto;padding:20px 18px 22px;box-shadow:0 12px 50px rgba(0,0,0,0.7);">
            <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:0 auto 18px;"></div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
                <h3 style="font-size:16px;font-weight:900;margin:0;">📊 CREAR ENCUESTA <span style="font-size:10px;color:#555;font-weight:400;">· ${contextLabel}</span></h3>
                <button onclick="this.closest('#poll-creator-modal').remove()" style="background:rgba(255,255,255,0.06);border:1px solid #333;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">&times;</button>
            </div>

            <div class="form-group" style="margin-bottom:12px;">
                <label class="form-label" style="font-size:10px;letter-spacing:1px;color:#555;font-weight:700;">PREGUNTA / TÍTULO *</label>
                <input id="poll-title-input" type="text" placeholder="Escribí tu pregunta…" maxlength="120"
                    style="width:100%;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:12px 14px;color:#fff;font-size:14px;outline:none;font-family:inherit;box-sizing:border-box;"
                    onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='#2a2a2a'">
            </div>
            <div class="form-group" style="margin-bottom:16px;">
                <label class="form-label" style="font-size:10px;letter-spacing:1px;color:#555;font-weight:700;">DESCRIPCIÓN (opcional)</label>
                <textarea id="poll-desc-input" placeholder="Descripción adicional..." maxlength="280" rows="2"
                    style="width:100%;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:12px 14px;color:#fff;font-size:13px;outline:none;font-family:inherit;resize:none;box-sizing:border-box;"
                    onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='#2a2a2a'"></textarea>
            </div>

            <div style="font-size:10px;letter-spacing:1px;color:#555;font-weight:700;margin-bottom:8px;">OPCIONES (mín. 2, máx. 10)</div>
            <div id="poll-options-inputs">
                ${[0,1,2].map(i => `
                <div id="poll-opt-row-${i}" style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
                    <input type="text" id="poll-opt-${i}" placeholder="Opción ${i+1}${i<2?' *':''}" maxlength="60"
                        style="flex:1;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:10px 12px;color:#fff;font-size:13px;outline:none;font-family:inherit;"
                        onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='#2a2a2a'">
                    ${i >= 2 ? `<button onclick="document.getElementById('poll-opt-row-${i}').remove()" style="background:rgba(255,68,68,0.1);border:none;color:#ff4444;border-radius:8px;padding:6px 8px;cursor:pointer;flex-shrink:0;"><i class='bx bx-x'></i></button>` : '<div style="width:32px;"></div>'}
                </div>`).join('')}
            </div>
            <button onclick="CancheroPolls._addOption()" id="add-option-btn" style="display:flex;align-items:center;gap:6px;background:transparent;border:1px dashed #333;border-radius:10px;padding:8px 14px;color:#555;font-size:12px;font-weight:700;cursor:pointer;margin-bottom:16px;width:100%;justify-content:center;">
                <i class='bx bx-plus'></i> Agregar opción
            </button>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                <div>
                    <label style="font-size:10px;letter-spacing:1px;color:#555;font-weight:700;display:block;margin-bottom:6px;">DURACIÓN</label>
                    <select id="poll-duration-select" style="width:100%;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:10px 12px;color:#fff;font-size:13px;font-family:inherit;cursor:pointer;">
                        <option value="12">12 horas (default)</option>
                        <option value="24">24 horas</option>
                        <option value="48">2 días</option>
                        <option value="72">3 días</option>
                        <option value="168">7 días</option>
                        <option value="custom">Fecha personalizada</option>
                    </select>
                </div>
                <div id="poll-custom-date-wrap" style="display:none;">
                    <label style="font-size:10px;letter-spacing:1px;color:#555;font-weight:700;display:block;margin-bottom:6px;">FECHA FIN</label>
                    <input type="datetime-local" id="poll-custom-date" style="width:100%;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:9px 12px;color:#fff;font-size:12px;font-family:inherit;box-sizing:border-box;">
                </div>
            </div>

            <button onclick="CancheroPolls._submit('${context}','${contextId||''}')" style="width:100%;background:var(--accent);color:#000;border:none;border-radius:14px;padding:14px;font-weight:900;font-size:15px;cursor:pointer;letter-spacing:0.5px;">
                📊 PUBLICAR ENCUESTA
            </button>
        </div>`;

        m.onclick = e => { if (e.target === m) m.remove(); };
        document.body.appendChild(m);

        // Watch duration select
        document.getElementById('poll-duration-select').addEventListener('change', function() {
            document.getElementById('poll-custom-date-wrap').style.display = this.value === 'custom' ? 'block' : 'none';
        });

        setTimeout(() => { const t = document.getElementById('poll-title-input'); if (t) t.focus(); }, 100);
    }

    let _optionCount = 3;
    function _addOption() {
        if (_optionCount >= 10) { showToast && showToast('Máximo 10 opciones', 'info'); return; }
        const container = document.getElementById('poll-options-inputs');
        const addBtn = document.getElementById('add-option-btn');
        if (!container) return;
        const i = _optionCount;
        const row = document.createElement('div');
        row.id = `poll-opt-row-${i}`;
        row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px;';
        row.innerHTML = `<input type="text" id="poll-opt-${i}" placeholder="Opción ${i+1}" maxlength="60"
            style="flex:1;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:10px 12px;color:#fff;font-size:13px;outline:none;font-family:inherit;"
            onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='#2a2a2a'">
            <button onclick="document.getElementById('poll-opt-row-${i}').remove();window.CancheroPolls._optCount--;" style="background:rgba(255,68,68,0.1);border:none;color:#ff4444;border-radius:8px;padding:6px 8px;cursor:pointer;flex-shrink:0;"><i class='bx bx-x'></i></button>`;
        container.insertBefore(row, addBtn);
        _optionCount++;
        if (_optionCount >= 10) document.getElementById('add-option-btn').style.display = 'none';
    }

    async function _submit(context, contextId) {
        const sb = getSb(); const me = getMe();
        if (!sb || !me) { showToast && showToast('Iniciá sesión primero', 'info'); return; }

        const title = document.getElementById('poll-title-input')?.value?.trim();
        if (!title) { showToast && showToast('Escribí un título para la encuesta', 'error'); return; }

        // Recolectar opciones
        const optInputs = document.querySelectorAll('#poll-options-inputs input[type="text"]');
        const options = [];
        optInputs.forEach(inp => { const v = inp.value.trim(); if (v) options.push({ text: v, votes_count: 0 }); });
        if (options.length < 2) { showToast && showToast('Necesitás al menos 2 opciones', 'error'); return; }

        // Duración
        let expiresAt;
        const durSel = document.getElementById('poll-duration-select')?.value;
        if (durSel === 'custom') {
            const customDate = document.getElementById('poll-custom-date')?.value;
            expiresAt = customDate ? new Date(customDate).toISOString() : new Date(Date.now() + 12 * 3600000).toISOString();
        } else {
            expiresAt = new Date(Date.now() + parseInt(durSel || '12') * 3600000).toISOString();
        }

        const desc = document.getElementById('poll-desc-input')?.value?.trim() || null;

        const submitBtn = document.querySelector('#poll-creator-modal button:last-child');
        if (submitBtn) { submitBtn.textContent = 'Publicando...'; submitBtn.disabled = true; }

        try {
            const { data: poll, error } = await sb.from('polls').insert({
                creator_email: me.email,
                creator_name: me.name || me.email,
                creator_photo: me.photo || null,
                title,
                description: desc,
                options,
                expires_at: expiresAt,
                is_pinned: false,
                context: context || 'feed',
                context_id: contextId || null,
                total_votes: 0,
            }).select('*').single();

            if (error) throw error;

            document.getElementById('poll-creator-modal')?.remove();
            showToast && showToast('¡Encuesta publicada! 📊', 'success');

            // Notificar a seguidores
            _notifyFollowers(poll, me);

            // Si es en un chat, enviar mensaje especial
            if (context === 'chat' && contextId) {
                _sendPollToChat(poll.id, contextId, 'dm');
            } else if (context === 'group' && contextId) {
                _sendPollToChat(poll.id, contextId, 'group');
            } else if (context === 'match' && contextId) {
                _sendPollToChat(poll.id, contextId, 'match');
            } else if (context === 'story') {
                _sharePollAsStory(poll);
            } else {
                // Insertar card en feed o perfil
                _insertPollCardInUI(poll);
            }

            _optionCount = 3;
        } catch(e) {
            showToast && showToast('Error al publicar: ' + e.message, 'error');
            if (submitBtn) { submitBtn.textContent = '📊 PUBLICAR ENCUESTA'; submitBtn.disabled = false; }
        }
    }

    function _insertPollCardInUI(poll) {
        const feedContainers = [
            document.getElementById('main-feed-container'),
            document.getElementById('jugador-profile-feed-posts'),
            document.getElementById('jugador-profile-posts'),
            document.getElementById('amigos-feed'),
        ];
        let inserted = false;
        feedContainers.forEach(c => {
            if (c) { c.insertAdjacentHTML('afterbegin', renderPollCard(poll, null)); inserted = true; }
        });
        // si el feed está scrolleado, subir para ver la nueva encuesta arriba
        if (inserted) { try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e) {} }
    }

    async function _notifyFollowers(poll, me) {
        const sb = getSb();
        if (!sb || !me) return;
        try {
            const { data: followers } = await sb.from('follows').select('follower_email').eq('following_email', me.email).limit(100);
            if (!followers || !followers.length) return;
            const inserts = followers.map(f => ({
                recipient_email: f.follower_email,
                type: 'poll',
                actor_name: me.name || me.email,
                actor_email: me.email,
                message: `📊 ${me.name || me.email} creó una encuesta: "${poll.title}"`,
                post_id: poll.id,
                read: false,
            }));
            // Insertar en lotes de 20
            for (let i = 0; i < inserts.length; i += 20) {
                await sb.from('notifications').insert(inserts.slice(i, i + 20)).catch(() => {});
            }
        } catch(e) {}
    }

    async function _sendPollToChat(pollId, chatId, chatType) {
        const sb = getSb(); const me = getMe();
        if (!sb || !me || !chatId) return;
        // Usar el esquema real: 'messages' (DM, recipient_email) y 'group_messages' (group_id).
        // El contenido lleva el marcador [ENCUESTA] {id}; el chat lo detecta y renderiza la card.
        const content = `[ENCUESTA] ${pollId}`;
        try {
            if (chatType === 'dm') {
                await sb.from('messages').insert({
                    sender_email: me.email, sender_name: me.name || me.email,
                    recipient_email: chatId, content, type: 'poll', read: false
                });
            } else {
                // group y match comparten group_messages
                await sb.from('group_messages').insert({
                    group_id: chatId, sender_email: me.email, sender_name: me.name || me.email,
                    content, type: 'poll'
                });
            }
            // Refrescar el hilo activo si está abierto
            if (window.CancheroMessaging && window.CancheroMessaging._activeThread) {
                try { window.CancheroMessaging.openThread(
                    window.CancheroMessaging._activeThread.type, null,
                    window.CancheroMessaging._activeThread.partnerEmail,
                    window.CancheroMessaging._activeThread.partnerName,
                    window.CancheroMessaging._activeThread.groupId,
                    window.CancheroMessaging._activeThread.groupName
                ); } catch(e) {}
            }
        } catch(e) { showToast && showToast('No se pudo enviar la encuesta al chat', 'error'); }
    }

    function _sharePollAsStory(poll) {
        const me = getMe();
        if (!me) return;
        // Crear historia con contenido de encuesta
        const storyContent = `📊 ${poll.title}`;
        if (typeof window.createStoryWithContent === 'function') {
            window.createStoryWithContent({ content: storyContent, poll_id: poll.id, type: 'poll' });
        }
        showToast && showToast('Encuesta compartida en historia', 'success');
    }

    // ── Compartir encuesta ───────────────────────────────────
    async function openShareMenu(pollId) {
        const sb = getSb();
        const { data: poll } = sb ? await sb.from('polls').select('title,creator_email').eq('id', pollId).single().catch(() => ({data:null})) : { data: null };

        const m = document.createElement('div');
        m.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.75);display:flex;align-items:flex-end;justify-content:center;';
        m.innerHTML = `
        <div style="background:#111;border:1px solid #1e1e1e;border-radius:20px 20px 0 0;width:100%;max-width:480px;padding:20px 16px 32px;">
            <div style="font-weight:800;font-size:14px;margin-bottom:16px;">Compartir encuesta</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <button onclick="CancheroPolls._sharePollToMyStory('${esc(pollId)}');this.closest('div[style*=fixed]').remove()" style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid #2a2a2a;border-radius:12px;padding:12px;color:#ccc;cursor:pointer;font-size:12px;font-weight:700;text-align:left;">
                    <i class='bx bx-camera' style="font-size:20px;color:var(--accent);flex-shrink:0;"></i><div><div>Historia</div><div style="font-size:10px;color:#555;">Compartir en mi historia</div></div>
                </button>
                <button onclick="CancheroPolls._sharePollViaChat('${esc(pollId)}');this.closest('div[style*=fixed]').remove()" style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid #2a2a2a;border-radius:12px;padding:12px;color:#ccc;cursor:pointer;font-size:12px;font-weight:700;text-align:left;">
                    <i class='bx bx-message-rounded' style="font-size:20px;color:var(--accent);flex-shrink:0;"></i><div><div>Chat</div><div style="font-size:10px;color:#555;">Enviar a un chat</div></div>
                </button>
            </div>
            <button onclick="this.closest('div[style*=fixed]').remove()" style="width:100%;background:rgba(255,255,255,0.04);border:1px solid #2a2a2a;border-radius:12px;padding:12px;color:#888;cursor:pointer;font-size:13px;margin-top:10px;">Cancelar</button>
        </div>`;
        m.onclick = e => { if (e.target === m) m.remove(); };
        document.body.appendChild(m);
    }

    async function _sharePollToMyStory(pollId) {
        const sb = getSb(); const me = getMe();
        if (!sb || !me) return;
        const { data: poll } = await sb.from('polls').select('*').eq('id', pollId).single().catch(() => ({data:null}));
        if (poll) _sharePollAsStory(poll);
    }

    async function _sharePollViaChat(pollId) {
        // Abrir selector de chat
        showToast && showToast('Seleccioná un chat para enviar la encuesta', 'info');
        if (typeof window.CancheroMessaging !== 'undefined') {
            window._pendingSharePollId = pollId;
            window.CancheroMessaging.openChatSelector({ onSelect: (chatId, chatType) => {
                _sendPollToChat(pollId, chatId, chatType);
                showToast && showToast('Encuesta enviada al chat', 'success');
            }});
        }
    }

    // ── Fijar / desfijar ─────────────────────────────────────
    async function togglePin(pollId) {
        const sb = getSb(); const me = getMe();
        if (!sb || !me) return;
        const { data: p } = await sb.from('polls').select('is_pinned,creator_email').eq('id', pollId).single().catch(() => ({data:null}));
        if (!p || p.creator_email !== me.email) return;
        await sb.from('polls').update({ is_pinned: !p.is_pinned }).eq('id', pollId).catch(() => {});
        showToast && showToast(p.is_pinned ? 'Encuesta desfijada' : 'Encuesta fijada al perfil', 'success');
    }

    // ── Eliminar encuesta ────────────────────────────────────
    async function deletePoll(pollId) {
        if (!confirm('¿Eliminar esta encuesta?')) return;
        const sb = getSb(); const me = getMe();
        if (!sb || !me) return;
        // Borrar votos primero (por si hay FK) y luego la encuesta; verificar resultado
        try { await sb.from('poll_votes').delete().eq('poll_id', pollId); } catch(e) {}
        const { error } = await sb.from('polls').delete().eq('id', pollId).eq('creator_email', me.email);
        if (error) {
            showToast && showToast('No se pudo eliminar: ' + error.message, 'error');
            return;
        }
        const card = document.getElementById(`poll-card-${pollId}`);
        if (card) { card.style.opacity = '0'; card.style.transition = 'opacity .3s'; setTimeout(() => card.remove(), 300); }
        showToast && showToast('Encuesta eliminada', 'success');
    }

    // ── Renderizar mini poll en chat ─────────────────────────
    async function renderChatPoll(pollId, containerEl) {
        const sb = getSb(); const me = getMe();
        if (!sb || !containerEl) return;
        try {
            const { data: poll } = await sb.from('polls').select('*').eq('id', pollId).single();
            if (!poll) { containerEl.innerHTML = '<span style="color:#555;font-size:12px;">[Encuesta no disponible]</span>'; return; }
            let myVote = null;
            if (me) {
                const { data: mv } = await sb.from('poll_votes').select('option_index').eq('poll_id', pollId).eq('voter_email', me.email).maybeSingle();
                if (mv) myVote = mv.option_index;
            }
            containerEl.innerHTML = `<div style="background:#0d0d0d;border:1px solid #252525;border-radius:14px;padding:14px;max-width:320px;">${renderPollCard(poll, myVote, { compact: true })}</div>`;
        } catch(e) {}
    }

    // ── Hook: interceptar mensajes de chat con poll ──────────
    function patchChatRendering() {
        const orig = window.CancheroMessaging;
        if (!orig) return;
        const origRender = orig.renderMessage;
        if (origRender) {
            orig.renderMessage = function(msg, ...args) {
                if (msg.message_type === 'poll' && msg.metadata && msg.metadata.poll_id) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'chat-poll-wrapper';
                    wrapper.style.cssText = 'max-width:340px;margin:4px 0;';
                    renderChatPoll(msg.metadata.poll_id, wrapper);
                    return wrapper.outerHTML;
                }
                return origRender.call(orig, msg, ...args);
            };
        }
    }

    // ── Integración en el feed principal ────────────────────
    async function injectPollsInFeed(containerEl) {
        if (!containerEl) return;
        const sb = getSb(); const me = getMe();
        if (!sb) return;
        try {
            // Cargar quién sigo
            let followingEmails = [];
            if (me) {
                const { data: follows } = await sb.from('follows').select('following_email').eq('follower_email', me.email).limit(200);
                followingEmails = (follows || []).map(f => f.following_email);
                followingEmails.push(me.email);
            }
            const polls = await loadFeedPolls(containerEl, followingEmails.length > 0 ? followingEmails : null);
            if (!polls.length) return;

            // Insertar polls entre posts existentes — mezclar por fecha
            polls.forEach(poll => {
                const html = renderPollCard(poll, poll._myVote);
                // Encontrar la posición correcta por fecha
                const articles = containerEl.querySelectorAll('article.post-card, article.poll-card');
                let inserted = false;
                for (const art of articles) {
                    const postDate = art.dataset.createdAt ? new Date(art.dataset.createdAt) : null;
                    const pollDate = new Date(poll.created_at);
                    if (postDate && pollDate > postDate) {
                        art.insertAdjacentHTML('beforebegin', html);
                        inserted = true;
                        break;
                    }
                }
                if (!inserted) containerEl.insertAdjacentHTML('afterbegin', html);
            });
        } catch(e) {}
    }

    // ── Agregar botón de encuesta al compositor ──────────────
    function addPollButtonToComposer() {
        const composers = document.querySelectorAll('.post-composer-icons');
        composers.forEach(icons => {
            // No duplicar: si ya existe cualquier icono de encuesta (hardcoded o dinámico), salir
            if (icons.querySelector('.poll-btn') || icons.querySelector('.bx-poll')) return;
            const btn = document.createElement('i');
            btn.className = 'bx bx-poll poll-btn';
            btn.title = 'Crear encuesta';
            btn.style.cssText = 'cursor:pointer;font-size:20px;color:var(--text-muted);transition:.2s;';
            btn.onmouseover = () => btn.style.color = 'var(--accent)';
            btn.onmouseout = () => btn.style.color = 'var(--text-muted)';
            btn.onclick = () => openCreator('feed');
            icons.appendChild(btn);
        });
    }

    // ── API pública ──────────────────────────────────────────
    return {
        openCreator,
        renderPollCard,
        vote,
        loadFeedPolls,
        loadProfilePolls,
        togglePin,
        deletePoll,
        renderChatPoll,
        openShareMenu,
        injectPollsInFeed,
        addPollButtonToComposer,
        _addOption,
        _submit,
        _optCount: 3,
    };
})();

// ── Auto-inicializar cuando el DOM esté listo ────────────────
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        if (window.CancheroPolls) {
            window.CancheroPolls.addPollButtonToComposer();
        }
    }, 1500);
});

// ── Patch applyUserData para agregar botón poll al login ─────
(function() {
    var _origApply = window.applyUserData;
    window.applyUserData = function() {
        if (_origApply) _origApply.apply(this, arguments);
        setTimeout(function() {
            if (window.CancheroPolls) window.CancheroPolls.addPollButtonToComposer();
        }, 800);
    };
})();
