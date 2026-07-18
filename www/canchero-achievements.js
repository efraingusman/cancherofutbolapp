// canchero-achievements.js
// Motor de logros/achievements tipo FIFA para Canchero
// Evaluación en cliente, UI de insignias con filtros, notificación al desbloquear

window.CancheroAchievements = (function() {

    // Catálogo local de logros (debe coincidir con tabla achievements en Supabase)
    const CATALOG = [
        { id: 'social_first',      name: 'Bienvenido a Canchero', desc: 'Te registraste en la app',                    icon: '🟢', rarity: 'común',      category: 'social',      check: (s) => true },
        { id: 'first_match',       name: 'Primer Arranque',       desc: 'Jugaste tu 1er partido',                      icon: '⚽', rarity: 'común',      category: 'partidos',    check: (s) => (s.matches||0) >= 1,  metric: (s)=>s.matches||0, target:1 },
        { id: 'first_goal',        name: 'El Primer Gol',         desc: 'Marcaste tu primer gol',                      icon: '🔔', rarity: 'común',      category: 'goles',       check: (s) => (s.goals||0) >= 1,    metric: (s)=>s.goals||0, target:1 },
        { id: 'matches_10',        name: 'En Forma',              desc: '10 partidos jugados',                         icon: '🔥', rarity: 'común',      category: 'partidos',    check: (s) => (s.matches||0) >= 10, metric: (s)=>s.matches||0, target:10 },
        { id: 'matches_50',        name: 'Veterano',              desc: '50 partidos jugados',                         icon: '💪', rarity: 'raro',       category: 'partidos',    check: (s) => (s.matches||0) >= 50, metric: (s)=>s.matches||0, target:50 },
        { id: 'matches_100',       name: 'Leyenda',               desc: '100 partidos jugados',                        icon: '🏆', rarity: 'épico',      category: 'partidos',    check: (s) => (s.matches||0) >= 100, metric: (s)=>s.matches||0, target:100 },
        { id: 'goals_10',          name: 'Goleador Joven',        desc: '10 goles marcados',                           icon: '⚽', rarity: 'común',      category: 'goles',       check: (s) => (s.goals||0) >= 10,  metric: (s)=>s.goals||0, target:10 },
        { id: 'goals_20',          name: 'Artillero',             desc: '20 goles marcados',                           icon: '🎯', rarity: 'común',      category: 'goles',       check: (s) => (s.goals||0) >= 20,  metric: (s)=>s.goals||0, target:20 },
        { id: 'goals_50',          name: 'Máquina de Goles',      desc: '50 goles en carrera',                         icon: '💥', rarity: 'raro',       category: 'goles',       check: (s) => (s.goals||0) >= 50,  metric: (s)=>s.goals||0, target:50 },
        { id: 'goals_100',         name: 'Centenario',            desc: '100 goles — una leyenda',                     icon: '👑', rarity: 'legendario', category: 'goles',       check: (s) => (s.goals||0) >= 100, metric: (s)=>s.goals||0, target:100 },
        { id: 'assists_10',        name: 'El Asistidor',          desc: '10 asistencias',                              icon: '🤝', rarity: 'común',      category: 'asistencias', check: (s) => (s.assists||0) >= 10, metric: (s)=>s.assists||0, target:10 },
        { id: 'assists_50',        name: 'Generoso',              desc: '50 asistencias',                              icon: '🎁', rarity: 'raro',       category: 'asistencias', check: (s) => (s.assists||0) >= 50, metric: (s)=>s.assists||0, target:50 },
        { id: 'wins_10',           name: 'Ganador Nato',          desc: '10 victorias',                                icon: '✅', rarity: 'común',      category: 'victorias',   check: (s) => (s.wins||0) >= 10,   metric: (s)=>s.wins||0, target:10 },
        { id: 'wins_50',           name: 'Dominador',             desc: '50 victorias',                                icon: '😤', rarity: 'raro',       category: 'victorias',   check: (s) => (s.wins||0) >= 50,   metric: (s)=>s.wins||0, target:50 },
        { id: 'mvp_5',             name: 'El Elegido',            desc: '5 veces MVP',                                 icon: '⭐', rarity: 'raro',       category: 'mvp',         check: (s) => (s.mvp||0) >= 5,     metric: (s)=>s.mvp||0, target:5 },
        { id: 'mvp_20',            name: 'Estrella del Campo',    desc: '20 veces MVP',                                icon: '🌟', rarity: 'épico',      category: 'mvp',         check: (s) => (s.mvp||0) >= 20,    metric: (s)=>s.mvp||0, target:20 },
        { id: 'rating_80',         name: 'Alta Calificación',     desc: 'Rating 80 o más',                             icon: '📈', rarity: 'raro',       category: 'rating',      check: (s) => (s.rating||50) >= 80, metric: (s)=>s.rating||50, target:80 },
        { id: 'follows_10',        name: 'Conectado',             desc: '10 jugadores seguidos',                       icon: '👥', rarity: 'común',      category: 'social',      check: (s) => (s.following||0) >= 10, metric: (s)=>s.following||0, target:10 },
        { id: 'tournament_win',    name: 'Campeón',               desc: 'Ganaste un torneo',                           icon: '🥇', rarity: 'épico',      category: 'torneo',      check: (s) => (s.tournaments_won||0) >= 1, metric: (s)=>s.tournaments_won||0, target:1 },
        { id: 'tournaments_3',     name: 'Serial Winner',         desc: '3 torneos ganados',                           icon: '🏅', rarity: 'legendario', category: 'torneo',      check: (s) => (s.tournaments_won||0) >= 3, metric: (s)=>s.tournaments_won||0, target:3 },
        { id: 'goalkeeper_10',     name: 'Muro',                  desc: '10 partidos sin goles en contra (arquero)',   icon: '🧤', rarity: 'raro',       category: 'arquero',     check: (s) => (s.clean_sheets||0) >= 10, metric: (s)=>s.clean_sheets||0, target:10 },
        { id: 'goalkeeper_clean_5',name: 'Invicto',               desc: '5 partidos consecutivos sin goles',           icon: '🛡️', rarity: 'común',     category: 'arquero',     check: (s) => (s.clean_streak||0) >= 5, metric: (s)=>s.clean_streak||0, target:5 },

        // ── SOCIAL — Seguidores recibidos ────────────────────────
        { id: 'followers_10',      name: 'Popular',               desc: '10 personas te siguen',                       icon: '🌟', rarity: 'común',      category: 'social',      check: (s) => (s.followers||0) >= 10,  metric: (s)=>s.followers||0, target:10 },
        { id: 'followers_50',      name: 'Referente',             desc: '50 seguidores en Canchero',                   icon: '💫', rarity: 'raro',       category: 'social',      check: (s) => (s.followers||0) >= 50,  metric: (s)=>s.followers||0, target:50 },
        { id: 'followers_100',     name: 'Influencer Futbolero',  desc: '100 seguidores',                              icon: '🔥', rarity: 'épico',      category: 'social',      check: (s) => (s.followers||0) >= 100, metric: (s)=>s.followers||0, target:100 },
        { id: 'following_20',      name: 'Explorador',            desc: 'Seguís a 20 jugadores',                       icon: '🗺️', rarity: 'común',     category: 'social',      check: (s) => (s.following||0) >= 20,  metric: (s)=>s.following||0, target:20 },

        // ── PUBLICACIONES ────────────────────────────────────────
        { id: 'posts_5',           name: 'Creador',               desc: 'Publicaste 5 posts',                          icon: '✍️', rarity: 'común',     category: 'posts',       check: (s) => (s.posts_count||0) >= 5,   metric: (s)=>s.posts_count||0, target:5 },
        { id: 'posts_20',          name: 'Comunicador',           desc: '20 publicaciones',                            icon: '📣', rarity: 'raro',       category: 'posts',       check: (s) => (s.posts_count||0) >= 20,  metric: (s)=>s.posts_count||0, target:20 },
        { id: 'posts_50',          name: 'Cronista del Campo',    desc: '50 publicaciones en Canchero',                icon: '📰', rarity: 'épico',      category: 'posts',       check: (s) => (s.posts_count||0) >= 50,  metric: (s)=>s.posts_count||0, target:50 },

        // ── HISTORIAS ────────────────────────────────────────────
        { id: 'stories_1',         name: 'Primera Historia',      desc: 'Subiste tu primera historia',                 icon: '📸', rarity: 'común',      category: 'social',      check: (s) => (s.stories_count||0) >= 1,  metric: (s)=>s.stories_count||0, target:1 },
        { id: 'stories_10',        name: 'El Momento',            desc: '10 historias subidas',                        icon: '🎬', rarity: 'común',      category: 'social',      check: (s) => (s.stories_count||0) >= 10, metric: (s)=>s.stories_count||0, target:10 },
        { id: 'stories_50',        name: 'Documentalista',        desc: '50 historias — tu vida en el campo',          icon: '🎥', rarity: 'raro',       category: 'social',      check: (s) => (s.stories_count||0) >= 50, metric: (s)=>s.stories_count||0, target:50 },

        // ── CAPITÁN ───────────────────────────────────────────────
        { id: 'captain_1',         name: 'El Capitán',            desc: 'Creaste tu primer partido',                   icon: '🦅', rarity: 'común',      category: 'partidos',    check: (s) => (s.matches_created||0) >= 1,  metric: (s)=>s.matches_created||0, target:1 },
        { id: 'captain_5',         name: 'Organizador',           desc: 'Creaste 5 partidos como capitán',             icon: '📋', rarity: 'raro',       category: 'partidos',    check: (s) => (s.matches_created||0) >= 5,  metric: (s)=>s.matches_created||0, target:5 },
        { id: 'captain_20',        name: 'Líder del Campo',       desc: '20 partidos organizados',                     icon: '👑', rarity: 'épico',      category: 'partidos',    check: (s) => (s.matches_created||0) >= 20, metric: (s)=>s.matches_created||0, target:20 },

        // ── TIENDA / COMPRAS ─────────────────────────────────────
        { id: 'first_purchase',    name: 'Primer Equipamiento',   desc: 'Compraste tu primer producto',                icon: '🛒', rarity: 'común',      category: 'tienda',      check: (s) => (s.products_bought||0) >= 1, metric: (s)=>s.products_bought||0, target:1 },
        { id: 'purchases_5',       name: 'Equipado',              desc: '5 compras en la tienda',                      icon: '👕', rarity: 'raro',       category: 'tienda',      check: (s) => (s.products_bought||0) >= 5, metric: (s)=>s.products_bought||0, target:5 },

        // ── PROFESIONALES ────────────────────────────────────────
        { id: 'hired_pro',         name: 'Pro Contratado',        desc: 'Contrataste un profesional',                  icon: '🤝', rarity: 'raro',       category: 'profesional', check: (s) => (s.pros_hired||0) >= 1, metric: (s)=>s.pros_hired||0, target:1 },

        // ── COMPLEJOS / RESERVAS ─────────────────────────────────
        { id: 'first_booking',     name: 'Reserva Hecha',         desc: 'Reservaste una cancha por primera vez',       icon: '🏟️', rarity: 'común',     category: 'complejo',    check: (s) => (s.bookings||0) >= 1,  metric: (s)=>s.bookings||0, target:1 },
        { id: 'bookings_10',       name: 'Cliente Frecuente',     desc: '10 reservas de cancha',                       icon: '🔑', rarity: 'raro',       category: 'complejo',    check: (s) => (s.bookings||0) >= 10, metric: (s)=>s.bookings||0, target:10 },

        // ── TORNEOS ───────────────────────────────────────────────
        { id: 'tournament_play',   name: 'Jugador de Torneo',     desc: 'Participaste en tu primer torneo',            icon: '🏆', rarity: 'raro',       category: 'torneo',      check: (s) => (s.tournaments_played||0) >= 1,  metric: (s)=>s.tournaments_played||0, target:1 },
        { id: 'tournaments_5',     name: 'Competidor',            desc: 'Participaste en 5 torneos',                   icon: '🎖️', rarity: 'épico',     category: 'torneo',      check: (s) => (s.tournaments_played||0) >= 5,  metric: (s)=>s.tournaments_played||0, target:5 },
        { id: 'tournament_win',    name: 'Campeón',               desc: 'Ganaste un torneo',                           icon: '🥇', rarity: 'épico',      category: 'torneo',      check: (s) => (s.tournaments_won||0) >= 1,     metric: (s)=>s.tournaments_won||0, target:1 },
        { id: 'tournaments_3',     name: 'Serial Winner',         desc: '3 torneos ganados',                           icon: '🏅', rarity: 'legendario', category: 'torneo',      check: (s) => (s.tournaments_won||0) >= 3,     metric: (s)=>s.tournaments_won||0, target:3 },

        // ── CHECK-IN ─────────────────────────────────────────────
        { id: 'first_checkin',     name: 'Presente',              desc: 'Hiciste check-in en tu primer partido',       icon: '✅', rarity: 'común',      category: 'partidos',    check: (s) => (s.checkins||0) >= 1,  metric: (s)=>s.checkins||0, target:1 },
        { id: 'checkins_10',       name: 'Puntual',               desc: '10 check-ins realizados',                     icon: '⏰', rarity: 'raro',       category: 'partidos',    check: (s) => (s.checkins||0) >= 10, metric: (s)=>s.checkins||0, target:10 },
    ];

    const RARITY_COLORS = {
        'común':      '#888',
        'raro':       '#4fc3f7',
        'épico':      '#9c88ff',
        'legendario': '#FFD700'
    };

    // ── Evaluar logros al login ───────────────────────────────
    async function evaluate(userData) {
        const sb = window._sb;
        if (!sb || !userData?.email) return;
        const stats = { ...(userData.stats || {}) };
        const email = userData.email;

        // Cargar métricas adicionales en paralelo (nuevas categorías)
        try {
            const [
                { count: postsCount },
                { count: storiesCount },
                { count: matchesCreated },
                { count: followersCount },
                { count: followingCount },
                { count: purchasesCount },
                { count: bookingsCount },
                { count: tournamentsPlayed },
                { count: checkinsCount }
            ] = await Promise.all([
                sb.from('posts').select('*',{count:'exact',head:true}).eq('user_email',email),
                sb.from('stories').select('*',{count:'exact',head:true}).eq('user_email',email),
                sb.from('matches').select('*',{count:'exact',head:true}).eq('created_by',email),
                sb.from('follows').select('*',{count:'exact',head:true}).eq('following_email',email),
                sb.from('follows').select('*',{count:'exact',head:true}).eq('follower_email',email),
                sb.from('business_orders').select('*',{count:'exact',head:true}).eq('client_email',email).eq('estado','entregado'),
                sb.from('business_reservations').select('*',{count:'exact',head:true}).eq('client_email',email),
                sb.from('tournament_teams').select('*',{count:'exact',head:true}).eq('captain_email',email),
                sb.from('match_checkins').select('*',{count:'exact',head:true}).eq('user_email',email)
            ]);
            stats.posts_count = postsCount || 0;
            stats.stories_count = storiesCount || 0;
            stats.matches_created = matchesCreated || 0;
            stats.followers = followersCount || 0;
            stats.following = Math.max(stats.following || 0, followingCount || 0);
            stats.products_bought = purchasesCount || 0;
            stats.bookings = bookingsCount || 0;
            stats.tournaments_played = tournamentsPlayed || 0;
            stats.checkins = checkinsCount || 0;
        } catch(e) { console.warn('[Achievements] metrics load error:', e); }

        try {
            const { data: unlocked } = await sb.from('player_achievements')
                .select('achievement_id')
                .eq('player_email', email);
            const unlockedIds = new Set((unlocked || []).map(u => u.achievement_id));

            const newAchievements = [];
            for (const ach of CATALOG) {
                if (!unlockedIds.has(ach.id) && ach.check(stats)) {
                    newAchievements.push(ach);
                }
            }

            if (newAchievements.length > 0) {
                await sb.from('player_achievements').insert(
                    newAchievements.map(a => ({ player_email: userData.email, achievement_id: a.id }))
                ).catch(() => {});

                for (const ach of newAchievements) {
                    // Notificación in-app
                    await sb.from('notifications').insert({
                        recipient_email: userData.email,
                        type: 'achievement',
                        actor_name: 'Canchero',
                        message: `🏅 ¡Logro desbloqueado! "${ach.name}" — ${ach.desc}`,
                        read: false
                    }).catch(() => {});
                    // Toast inmediato
                    if (typeof showToast === 'function') {
                        setTimeout(() => showToast('¡Nuevo logro! ' + ach.icon + ' ' + ach.name, 'success'), 1500);
                    }
                }
            }

            return [...unlockedIds, ...newAchievements.map(a => a.id)];
        } catch(e) {
            console.warn('[Achievements] evaluate error:', e);
            return [];
        }
    }

    // ── Renderizar grid de logros ─────────────────────────────
    // Muestra TODOS los logros inmediatamente en gris, luego actualiza colores async
    async function renderAchievements(containerEl, playerEmail, opts) {
        if (!containerEl) return;
        opts = opts || {};

        // PASO 1: Mostrar inmediatamente todos los logros en gris (sin esperar BD)
        _renderGrid(containerEl, {}, {}, opts);

        // PASO 2: Cargar desbloqueados async y actualizar colores
        const sb = window._sb || window.supabaseClient;
        if (!sb || !playerEmail) return;
        try {
            // Auto-desbloquear "social_first" si el usuario está registrado y aún no lo tiene
            const isOwnProfile = window.userData && window.userData.email === playerEmail;
            if (isOwnProfile) {
                try {
                    await sb.from('player_achievements')
                        .upsert({ player_email: playerEmail, achievement_id: 'social_first' }, { onConflict: 'player_email,achievement_id' });
                } catch(_e) {}
            }

            const { data: unlocked, error } = await sb.from('player_achievements')
                .select('achievement_id, unlocked_at')
                .eq('player_email', playerEmail);
            if (error) { console.warn('[Achievements] load error:', error); return; }
            const unlockedMap = {};
            (unlocked || []).forEach(function(u) { unlockedMap[u.achievement_id] = u.unlocked_at; });
            // Re-renderizar con datos reales + stats para progreso
            _renderGrid(containerEl, unlockedMap, (window.userData && window.userData.stats) || {}, opts);
        } catch(e) {
            console.warn('[Achievements] renderAchievements async error:', e);
            // El grid ya está visible en gris — no hacer nada más
        }
    }

    // ── Grid builder (sync, no spinner) ──────────────────────
    function _renderGrid(containerEl, unlockedMap, stats, opts) {
        stats = stats || {};
        opts = opts || {};
        var unlockedCount = Object.keys(unlockedMap).length;
        var pct = CATALOG.length > 0 ? Math.round(unlockedCount / CATALOG.length * 100) : 0;

        // Modo compacto/embebido: sólo una grilla corta (máx N), sin filtros ni barra
        if (opts.compact) {
            // priorizar desbloqueados, completar con bloqueados, hasta opts.max
            var maxN = opts.max || 5;
            var ordered = CATALOG.slice().sort(function(a,b){
                return (unlockedMap[b.id]?1:0) - (unlockedMap[a.id]?1:0);
            }).slice(0, maxN);
            var ch = '<div style="display:grid;grid-template-columns:repeat(' + maxN + ',1fr);gap:6px;">';
            ordered.forEach(function(ach){
                var on = !!unlockedMap[ach.id];
                var color = RARITY_COLORS[ach.rarity] || '#888';
                ch += '<div title="' + ach.name.replace(/"/g,'') + '" style="display:flex;flex-direction:column;align-items:center;gap:3px;background:' + (on?'#111':'#0d0d0d') + ';border:1px solid ' + (on?color:'#222') + ';border-radius:10px;padding:6px 2px;opacity:' + (on?'1':'0.45') + ';">' +
                    '<div style="font-size:17px;filter:' + (on?'none':'grayscale(1)') + ';">' + (ach.icon||'🏅') + '</div>' +
                    '<div style="font-size:7px;font-weight:700;color:' + (on?'#fff':'#666') + ';text-align:center;line-height:1.05;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + ach.name + '</div>' +
                '</div>';
            });
            ch += '</div>';
            containerEl.innerHTML = ch;
            return;
        }

        var html = '<div style="padding:8px 0;">';

        // Filtros por categoría
        html += '<div style="display:flex;gap:8px;margin-bottom:16px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch;scrollbar-width:none;">';
        var cats = ['todos','goles','asistencias','partidos','victorias','torneo','arquero','social'];
        cats.forEach(function(cat, i) {
            var active = i === 0;
            html += '<button class="ach-cat-btn' + (active ? ' ach-cat-active' : '') + '" onclick="window.filterAchievements(\'' + cat + '\',this)"' +
                ' style="flex-shrink:0;padding:6px 14px;border-radius:20px;border:1px solid ' + (active ? 'var(--accent)' : '#333') +
                ';background:' + (active ? 'rgba(186,255,0,0.1)' : 'transparent') +
                ';color:' + (active ? 'var(--accent)' : '#888') +
                ';font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all .15s;">' +
                cat.toUpperCase() + '</button>';
        });
        html += '</div>';

        // Barra de progreso
        html += '<div style="background:#111;border:1px solid #1e1e1e;border-radius:12px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:12px;">' +
            '<div style="font-size:28px;">🏅</div>' +
            '<div style="flex:1;">' +
            '<div style="font-size:12px;color:#fff;font-weight:700;margin-bottom:4px;">' + unlockedCount + ' / ' + CATALOG.length + ' logros desbloqueados</div>' +
            '<div style="background:#1a1a1a;border-radius:4px;height:6px;overflow:hidden;">' +
            '<div style="background:var(--accent);height:100%;width:' + pct + '%;border-radius:4px;transition:width .5s;"></div>' +
            '</div></div>' +
            '<div style="font-size:18px;font-weight:900;color:var(--accent);">' + pct + '%</div>' +
            '</div>';

        // PRÓXIMOS LOGROS — los 3 más cercanos a desbloquear
        var proximosCandidates = CATALOG.filter(function(a) {
            return !unlockedMap[a.id] && a.metric && a.target;
        }).map(function(a) {
            var cur = Math.min(a.metric(stats), a.target);
            return { ach: a, cur: cur, ratio: cur / a.target };
        }).sort(function(a, b) { return b.ratio - a.ratio; }).slice(0, 3);

        if (proximosCandidates.length) {
            html += '<div style="margin-bottom:14px;">';
            html += '<div style="font-size:10px;color:var(--accent);font-weight:900;letter-spacing:1.5px;margin-bottom:8px;">🎯 PRÓXIMOS LOGROS</div>';
            html += '<div style="display:flex;flex-direction:column;gap:8px;">';
            proximosCandidates.forEach(function(item) {
                var a = item.ach;
                var color = RARITY_COLORS[a.rarity] || '#888';
                var remaining = a.target - item.cur;
                var motiveTxt = remaining === 1 ? '¡Solo falta 1!' : 'Te faltan ' + remaining;
                html += '<div style="background:#0f1a0f;border:1px solid ' + color + '44;border-radius:12px;padding:10px 12px;display:flex;align-items:center;gap:10px;">' +
                    '<div style="font-size:22px;filter:drop-shadow(0 0 4px ' + color + '66);">' + a.icon + '</div>' +
                    '<div style="flex:1;">' +
                    '<div style="font-size:11px;font-weight:900;color:#fff;">' + a.name + '</div>' +
                    '<div style="font-size:10px;color:#777;margin-bottom:4px;">' + a.desc + '</div>' +
                    '<div style="background:#1a1a1a;border-radius:3px;height:4px;overflow:hidden;margin-bottom:2px;">' +
                    '<div style="background:' + color + ';height:100%;width:' + Math.round(item.ratio*100) + '%;border-radius:3px;transition:width .5s;"></div>' +
                    '</div>' +
                    '<div style="font-size:9px;color:' + (item.ratio >= 0.8 ? '#FFD700' : '#666') + ';font-weight:700;">' + item.cur + '/' + a.target + ' · ' + motiveTxt + '</div>' +
                    '</div>' +
                    '<div style="font-size:9px;color:' + color + ';font-weight:900;border:1px solid ' + color + ';border-radius:6px;padding:3px 7px;">' + a.rarity.toUpperCase() + '</div>' +
                    '</div>';
            });
            html += '</div></div>';
        } else if (!unlockedCount) {
            // No hay logros con métrica, mostrar el primero bloqueado como motivación
            var first = CATALOG.find(function(a){ return !unlockedMap[a.id]; });
            if (first) {
                html += '<div style="background:#0f1a0f;border:1px solid rgba(186,255,0,0.15);border-radius:12px;padding:10px 12px;margin-bottom:12px;display:flex;align-items:center;gap:10px;">' +
                    '<div style="font-size:22px;">' + first.icon + '</div>' +
                    '<div><div style="font-size:11px;font-weight:900;color:#aaa;">🎯 Próximo: ' + first.name + '</div><div style="font-size:10px;color:#666;">' + first.desc + '</div></div>' +
                    '</div>';
            }
        }

        // Grid de insignias — todos visibles (grises si locked, coloreados si unlocked)
        html += '<div id="ach-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">';
        CATALOG.forEach(function(ach) {
            var isUnlocked = !!unlockedMap[ach.id];
            var color = RARITY_COLORS[ach.rarity] || '#888';
            var dateStr = isUnlocked ? new Date(unlockedMap[ach.id]).toLocaleDateString('es-UY') : '';
            var nameSafe = ach.name.replace(/'/g, "\\'");
            var descSafe = ach.desc.replace(/'/g, "\\'");

            // Progreso para logros con meta numérica
            var progressHtml = '';
            var nearBorder = '';
            if (!isUnlocked && ach.metric && ach.target) {
                var cur = Math.min(ach.metric(stats), ach.target);
                var ratio = ach.target > 0 ? cur / ach.target : 0;
                if (ratio >= 0.7) nearBorder = '#FFD700'; // casi
                progressHtml = '<div style="margin-top:5px;"><div style="background:#1a1a1a;border-radius:3px;height:4px;overflow:hidden;"><div style="background:' + (ratio>=0.7?'#FFD700':'var(--accent)') + ';height:100%;width:' + Math.round(ratio*100) + '%;"></div></div>' +
                    '<div style="font-size:8px;color:' + (ratio>=0.7?'#FFD700':'#777') + ';margin-top:2px;font-weight:700;">' + cur + '/' + ach.target + (ratio>=0.7?' ¡Casi!':'') + '</div></div>';
            }

            html += '<div class="ach-card" data-category="' + ach.category + '"' +
                ' style="background:' + (isUnlocked ? '#111' : '#0d0d0d') + ';border:1px solid ' + (isUnlocked ? color : (nearBorder||'#222')) +
                ';border-radius:12px;padding:12px 8px;text-align:center;cursor:pointer;transition:all .2s;opacity:' + (isUnlocked ? '1' : (nearBorder?'0.75':'0.5')) + ';"' +
                ' onclick="window.showAchievementDetail(\'' + ach.id + '\',\'' + nameSafe + '\',\'' + descSafe + '\',\'' + ach.icon + '\',\'' + ach.rarity + '\',\'' + dateStr + '\')">' +
                '<div style="font-size:28px;margin-bottom:6px;">' + ach.icon + '</div>' +
                '<div style="font-size:10px;font-weight:900;color:' + (isUnlocked ? '#fff' : '#777') + ';line-height:1.2;margin-bottom:4px;">' + ach.name + '</div>' +
                (isUnlocked
                    ? '<div style="font-size:8px;color:' + color + ';font-weight:700;">' + ach.rarity.toUpperCase() + '</div>'
                    : (progressHtml || '<div style="font-size:8px;color:#444;">🔒 BLOQUEADO</div>')) +
                '</div>';
        });
        html += '</div>';
        html += '<div style="margin-top:12px;text-align:center;font-size:11px;color:#555;">' + unlockedCount + ' / ' + CATALOG.length + ' desbloqueados</div>';
        html += '</div>';

        containerEl.innerHTML = html;
    }

    // ── Filtrar logros por categoría ──────────────────────────
    window.filterAchievements = function(cat, btn) {
        document.querySelectorAll('.ach-cat-btn').forEach(b => {
            b.style.borderColor = '#333';
            b.style.color = '#888';
            b.style.background = 'transparent';
        });
        if (btn) {
            btn.style.borderColor = 'var(--accent)';
            btn.style.color = 'var(--accent)';
            btn.style.background = 'rgba(186,255,0,0.1)';
        }
        document.querySelectorAll('.ach-card').forEach(card => {
            card.style.display = (cat === 'todos' || card.dataset.category === cat) ? 'block' : 'none';
        });
    };

    // ── Modal de detalle de logro ─────────────────────────────
    window.showAchievementDetail = function(id, name, desc, icon, rarity, date) {
        const color = RARITY_COLORS[rarity] || '#888';
        // Eliminar cualquier modal previo
        var prev = document.getElementById('ach-detail-overlay');
        if (prev) prev.remove();
        const overlay = document.createElement('div');
        overlay.id = 'ach-detail-overlay';
        overlay.className = 'ach-detail-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
        const close = function() { var o = document.getElementById('ach-detail-overlay'); if (o) o.remove(); };
        overlay.onclick = close;
        window._closeAchDetail = close;
        overlay.innerHTML = `
            <div style="background:#111;border:1px solid ${color};border-radius:20px;padding:32px 24px;max-width:280px;width:100%;text-align:center;box-shadow:0 0 40px ${color}44;position:relative;" onclick="event.stopPropagation()">
                <button onclick="window._closeAchDetail&&window._closeAchDetail()" style="position:absolute;top:10px;right:12px;background:none;border:none;color:#888;font-size:22px;cursor:pointer;line-height:1;">&times;</button>
                <div style="font-size:56px;margin-bottom:12px;">${icon}</div>
                <div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:6px;">${name}</div>
                <div style="font-size:13px;color:#aaa;margin-bottom:12px;">${desc}</div>
                <div style="display:inline-block;padding:4px 14px;border-radius:20px;border:1px solid ${color};color:${color};font-size:11px;font-weight:700;">${rarity.toUpperCase()}</div>
                ${date ? `<div style="font-size:10px;color:#555;margin-top:10px;">Desbloqueado el ${date}</div>` : '<div style="font-size:11px;color:#555;margin-top:10px;">🔒 Aún no desbloqueado</div>'}
            </div>`;
        document.body.appendChild(overlay);
    };

    return { evaluate, renderAchievements, _renderGrid, CATALOG, RARITY_COLORS };

})();
