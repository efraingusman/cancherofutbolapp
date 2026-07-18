/* ══════════════════════════════════════════════════════════════
   CANCHERO MUNDIAL — Sección Copa del Mundo (Mundial 2026)
   Fuente principal: football-data.org (vía /api/worldcup proxy) — fixture
   completo, grupos, goleadores, equipos. Fallback: TheSportsDB (key gratis).
   Pestañas: Partidos (por día), Grupos, Goleadores, Equipos, Predictor, Stats.
══════════════════════════════════════════════════════════════ */
(function(){
  const TSDB = 'https://www.thesportsdb.com/api/v1/json/3';
  const WC_LEAGUE = '4429';
  const SEASON = '2026';
  const COMP = 'WC';
  const CACHE_TTL = 5 * 60 * 1000;
  let _tab = 'partidos';
  let _dayIdx = null;
  let _matches = null;     // normalizado
  let _provider = null;    // 'fd' | 'tsdb'
  let _scorers = null;     // cache goleadores para detalle

  function _cacheGet(k){ try{ const r=JSON.parse(sessionStorage.getItem('mundial_'+k)||'null'); if(r&&(Date.now()-r.t)<CACHE_TTL) return r.d; }catch(e){} return null; }
  function _cacheSet(k,d){ try{ sessionStorage.setItem('mundial_'+k,JSON.stringify({t:Date.now(),d:d})); }catch(e){} }
  async function _get(url,key){ const c=_cacheGet(key); if(c!==null) return c; try{ const r=await fetch(url); const j=await r.json(); _cacheSet(key,j); return j; }catch(e){ return null; } }
  function _esc(s){ return (s||'').toString().replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  // Fecha/hora en la zona horaria local del usuario (ej. Uruguay)
  function _localYMD(iso){ try{ const d=new Date(iso); return d.toLocaleDateString('en-CA'); }catch(e){ return (iso||'').slice(0,10); } }
  function _localHM(iso){ try{ const d=new Date(iso); return d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:false}); }catch(e){ return (iso||'').slice(11,16); } }

  // football-data vía proxy
  async function _fd(path,key){ return _get('/api/worldcup?path='+encodeURIComponent(path), 'fd_'+key); }
  // API-Football (fuente rica: eventos, alineaciones, stats, fotos)
  const AF_LEAGUE = '1';
  async function _af(path,key){ return _get('/api/apifootball?path='+encodeURIComponent(path), 'af_'+key); }
  function _afOk(j){ return j && Array.isArray(j.response) && j.response.length>0; }

  // Predicciones (localStorage)
  // Soporta dos formatos:
  //   - string: 'home' | 'draw' | 'away' | nombre-del-equipo (knockout)
  //   - object: { pick, sa, sb }  ← cuando el usuario edita marcador exacto
  function _getPreds(){ try{ return JSON.parse(localStorage.getItem('mundial_preds')||'{}'); }catch(e){ return {}; } }
  function _setPred(id,pick){ const p=_getPreds(); p[id]=pick; localStorage.setItem('mundial_preds',JSON.stringify(p)); }
  function _getPickStr(v){ if(v==null) return null; if(typeof v==='string') return v; return v.pick||null; }
  function _getPickScore(v){ if(v && typeof v==='object') return [v.sa,v.sb]; return [null,null]; }
  function _setScore(id, sa, sb){
    sa=(sa===''||sa==null)?null:parseInt(sa); sb=(sb===''||sb==null)?null:parseInt(sb);
    const p=_getPreds(); const cur=p[id];
    let pick=_getPickStr(cur);
    if(sa!=null && sb!=null){ pick = sa>sb?'home':sa<sb?'away':'draw'; }
    if(sa==null && sb==null && pick==null){ delete p[id]; }
    else p[id] = {pick:pick, sa:sa, sb:sb};
    localStorage.setItem('mundial_preds', JSON.stringify(p));
  }
  function _getChampion(){ return localStorage.getItem('mundial_champion')||''; }
  function _setChampion(t){ localStorage.setItem('mundial_champion',t); }

  // ── Reseñas de partidos jugados (localStorage por ahora) ──
  function _getReviews(){ try{ return JSON.parse(localStorage.getItem('mundial_reviews')||'{}'); }catch(e){ return {}; } }
  function _setReview(id, data){ const r=_getReviews(); if(data==null) delete r[id]; else r[id]=Object.assign({}, r[id]||{}, data, {updated_at:new Date().toISOString()}); localStorage.setItem('mundial_reviews', JSON.stringify(r)); }
  function _getReview(id){ return _getReviews()[id]||null; }

  // ── Carga de partidos: API-Football → football-data → TheSportsDB ──
  async function _loadMatches(){
    if (_matches) return _matches;
    // 0) API-Football (rica)
    const af = await _af('fixtures?league='+AF_LEAGUE+'&season='+SEASON,'fixtures');
    if (_afOk(af)){
      _provider='af';
      _matches = af.response.map(f=>{
        const st=(f.fixture.status&&f.fixture.status.short)||'NS';
        const round=(f.league&&f.league.round)||'';
        const gm=round.match(/Group ([A-Z])/i); const jm=round.match(/-\s*(\d+)/);
        return {
          id: String(f.fixture.id), af:true,
          date: (f.fixture.date||'').slice(0,10), time: (f.fixture.date||'').slice(11,16),
          status: st, live: ['1H','2H','HT','ET','BT','P','LIVE'].includes(st), finished: ['FT','AET','PEN'].includes(st),
          group: gm?('Grupo '+gm[1]):(round||''), matchday: jm?jm[1]:null,
          home: f.teams.home.name, away: f.teams.away.name,
          homeId: f.teams.home.id, awayId: f.teams.away.id,
          homeBadge: f.teams.home.logo||'', awayBadge: f.teams.away.logo||'',
          hs: f.goals.home, as: f.goals.away
        };
      });
      _matches.sort((a,b)=> new Date((a.date||'')+'T'+(a.time||'00:00')) - new Date((b.date||'')+'T'+(b.time||'00:00')) );
      return _matches;
    }
    // 1) football-data
    const fd = await _fd('competitions/'+COMP+'/matches','matches');
    if (fd && fd.matches && fd.matches.length){
      _provider='fd';
      _matches = fd.matches.map(m=>({
        id: String(m.id),
        date: _localYMD(m.utcDate),
        time: _localHM(m.utcDate),
        iso: m.utcDate,
        status: m.status,
        live: ['IN_PLAY','PAUSED'].includes(m.status),
        finished: m.status==='FINISHED',
        group: m.group || (m.stage && m.stage!=='GROUP_STAGE'? _stageName(m.stage):'') ,
        stage: m.stage || 'GROUP_STAGE',
        matchday: m.matchday,
        home: m.homeTeam && m.homeTeam.name || '?',
        away: m.awayTeam && m.awayTeam.name || '?',
        homeId: m.homeTeam && m.homeTeam.id || null,
        awayId: m.awayTeam && m.awayTeam.id || null,
        homeBadge: m.homeTeam && m.homeTeam.crest || '',
        awayBadge: m.awayTeam && m.awayTeam.crest || '',
        venue: m.venue || (m.area && m.area.name) || '',
        hs: m.score && m.score.fullTime ? m.score.fullTime.home : null,
        as: m.score && m.score.fullTime ? m.score.fullTime.away : null
      }));
    } else {
      // 2) TheSportsDB fallback
      _provider='tsdb';
      const [next,past]=await Promise.all([ _get(TSDB+'/eventsnextleague.php?id='+WC_LEAGUE,'t_next'), _get(TSDB+'/eventspastleague.php?id='+WC_LEAGUE,'t_past') ]);
      const ev=[...(((past||{}).events)||[]),...(((next||{}).events)||[])];
      const map={}; ev.forEach(e=>{ if(e&&e.idEvent) map[e.idEvent]=e; });
      _matches=Object.values(map).map(e=>({
        id:String(e.idEvent), date:e.dateEvent||'', time:(e.strTime||'').slice(0,5),
        status:e.strStatus, live:/(1H|2H|HT|LIVE|Playing)/i.test(e.strStatus||''), finished:(e.intHomeScore!=null&&e.intHomeScore!==''),
        group:e.strGroup||'', matchday:e.intRound,
        home:e.strHomeTeam||'?', away:e.strAwayTeam||'?', homeBadge:e.strHomeTeamBadge||'', awayBadge:e.strAwayTeamBadge||'',
        hs:(e.intHomeScore!==''?e.intHomeScore:null), as:(e.intAwayScore!==''?e.intAwayScore:null)
      }));
    }
    _matches.sort((a,b)=> new Date((a.date||'')+'T'+(a.time||'00:00')) - new Date((b.date||'')+'T'+(b.time||'00:00')) );
    return _matches;
  }
  function _stageName(s){ const m={'LAST_16':'Octavos','QUARTER_FINALS':'Cuartos','SEMI_FINALS':'Semifinal','FINAL':'Final','THIRD_PLACE':'3er puesto','GROUP_STAGE':'Grupos'}; return m[s]||s; }

  async function _teamsFromMatches(){ const ms=await _loadMatches(); const map={}; ms.forEach(m=>{ if(m.home&&m.home!=='?') map[m.home]=map[m.home]||m.homeBadge; if(m.away&&m.away!=='?') map[m.away]=map[m.away]||m.awayBadge; }); return Object.keys(map).sort((a,b)=>a.localeCompare(b)).map(n=>({name:n,badge:map[n]})); }

  window.CancheroMundial = {
    render: async function(){
      const c=document.getElementById('mundial-container'); if(!c) return;
      if(_tab==='predictor') _tab='partidos'; // predictor quitado (pedido 2026-07-08)
      c.innerHTML =
        '<h2 class="panel-title pt-mundial" style="margin:0 0 16px;">' +
          '<span style="display:inline-block;width:44px;height:44px;flex-shrink:0;background:var(--accent);-webkit-mask:url(\'img/mundial-logo.png\') center/contain no-repeat;mask:url(\'img/mundial-logo.png\') center/contain no-repeat;filter:drop-shadow(0 0 6px rgba(186,255,0,0.3));"></span>' +
          '<span class="pt-text"><span class="pt-main">MUNDIAL 2026</span><span class="pt-sub">Fixture, grupos, goleadores y stats en vivo</span></span>' +
        '</h2>' +
        '<div style="display:flex;flex-wrap:nowrap;gap:5px;background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.06);padding:5px;border-radius:14px;margin-bottom:16px;overflow-x:auto;white-space:nowrap;scrollbar-width:none;">' +
          [['partidos','Partidos'],['grupos','Grupos'],['goleadores','Goles'],['equipos','Equipos'],['stats','Stats']].map(function(t){
            return '<button onclick="CancheroMundial.switchTab(\''+t[0]+'\')" style="flex:1 0 auto;background:'+(_tab===t[0]?'var(--accent)':'transparent')+';color:'+(_tab===t[0]?'#000':'#bbb')+';border:none;font-weight:800;border-radius:10px;padding:8px 9px;font-size:11.5px;cursor:pointer;transition:.15s;white-space:nowrap;">'+t[1]+'</button>';
          }).join('') +
        '</div>' +
        '<div id="mundial-body"><div style="text-align:center;padding:40px;color:#555;"><i class="bx bx-loader-alt bx-spin" style="font-size:26px;color:var(--accent);"></i></div></div>';
      this.loadTab();
    },
    switchTab: function(t){ _tab=t; if(t==='partidos') _dayIdx=null; this.render(); },
    loadTab: async function(){
      if(_tab==='partidos') return this.renderPartidos();
      if(_tab==='grupos') return this.renderGrupos();
      if(_tab==='goleadores') return this.renderGoleadores();
      if(_tab==='equipos') return this.renderEquipos();
      if(_tab==='predictor') return this.renderPredictor();
      if(_tab==='stats') return this.renderStats();
    },

    renderPartidos: async function(){
      const body=document.getElementById('mundial-body'); if(!body) return;
      const ms=await _loadMatches();
      if(!ms.length){ body.innerHTML=_empty('bx-calendar-x','No hay partidos disponibles ahora.'); return; }
      const byDay={}; ms.forEach(m=>{ const d=m.date||'?'; (byDay[d]=byDay[d]||[]).push(m); });
      const days=Object.keys(byDay).sort();
      if(_dayIdx===null){ const today=new Date().toISOString().slice(0,10); let idx=days.indexOf(today); if(idx<0){ idx=days.findIndex(d=>d>=today); if(idx<0) idx=days.length-1; } _dayIdx=idx; }
      _dayIdx=Math.max(0,Math.min(_dayIdx,days.length-1));
      const curDay=days[_dayIdx];
      const today=new Date().toISOString().slice(0,10);
      const fmtBig=function(d){ try{ const dt=new Date(d+'T12:00:00'); if(d===today) return 'HOY · '+dt.toLocaleDateString('es-UY',{day:'2-digit',month:'long'}); return dt.toLocaleDateString('es-UY',{weekday:'long',day:'2-digit',month:'long'}); }catch(e){ return d; } };
      const fmtChip=function(d){ try{ const dt=new Date(d+'T12:00:00'); if(d===today) return 'HOY'; return dt.toLocaleDateString('es-UY',{weekday:'short'}).slice(0,3).toUpperCase()+' '+dt.getDate(); }catch(e){ return d; } };
      const cap=function(s){ return s.charAt(0).toUpperCase()+s.slice(1); };
      let html=''+
        // Cabecera del día seleccionado con flechas
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'+
          '<button onclick="CancheroMundial.setDay('+(_dayIdx-1)+')" '+(_dayIdx<=0?'disabled':'')+' style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);color:'+(_dayIdx<=0?'#444':'#fff')+';width:34px;height:34px;border-radius:50%;cursor:pointer;flex-shrink:0;font-size:18px;display:flex;align-items:center;justify-content:center;">‹</button>'+
          '<div style="flex:1;text-align:center;font-size:13px;font-weight:900;color:'+(curDay===today?'var(--accent)':'#fff')+';">'+cap(fmtBig(curDay))+'</div>'+
          '<button onclick="CancheroMundial.setDay('+(_dayIdx+1)+')" '+(_dayIdx>=days.length-1?'disabled':'')+' style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);color:'+(_dayIdx>=days.length-1?'#444':'#fff')+';width:34px;height:34px;border-radius:50%;cursor:pointer;flex-shrink:0;font-size:18px;display:flex;align-items:center;justify-content:center;">›</button>'+
        '</div>'+
        // Carril de fechas (un solo renglón, scroll horizontal)
        '<div id="mundial-days" style="display:flex;flex-wrap:nowrap;gap:6px;overflow-x:auto;padding-bottom:10px;margin-bottom:6px;scrollbar-width:none;">';
      days.forEach((d,i)=>{ const on=i===_dayIdx; html+='<button onclick="CancheroMundial.setDay('+i+')" style="flex:0 0 auto;background:'+(on?'var(--accent)':'rgba(255,255,255,0.04)')+';color:'+(on?'#000':'#999')+';border:1px solid '+(on?'var(--accent)':'rgba(255,255,255,0.07)')+';border-radius:12px;padding:8px 12px;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap;backdrop-filter:blur(8px);">'+fmtChip(d)+'</button>'; });
      html+='</div><div style="font-size:11px;color:#666;margin:4px 0 10px;">'+byDay[curDay].length+' partido(s)'+(_provider==='tsdb'?' · datos parciales (configurá token)':'')+'</div>';
      html+=byDay[curDay].map(m=>CancheroMundial._card(m)).join('');
      body.innerHTML=html;
      try{ const cont=document.getElementById('mundial-days'); const btn=cont.children[_dayIdx]; if(btn) cont.scrollLeft=btn.offsetLeft-cont.clientWidth/2+btn.clientWidth/2; }catch(e){}
    },
    setDay:function(i){ _dayIdx=i; this.renderPartidos(); },

    _card:function(m){
      const hb=m.homeBadge?'<img src="'+m.homeBadge+'" style="width:26px;height:26px;object-fit:contain;" onerror="this.style.display=\'none\'">':'';
      const ab=m.awayBadge?'<img src="'+m.awayBadge+'" style="width:26px;height:26px;object-fit:contain;" onerror="this.style.display=\'none\'">':'';
      const hasScore=(m.hs!=null&&m.as!=null);
      const score=hasScore?(m.hs+' - '+m.as):'vs';
      const sub=m.group?(_esc(m.group)+(m.matchday?' · J'+m.matchday:'')):(m.matchday?'Fecha '+m.matchday:'');
      return '<div onclick="CancheroMundial.openMatch(\''+m.id+'\')" style="background:rgba(255,255,255,0.04);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:12px 14px;margin-bottom:8px;cursor:pointer;transition:.15s;" onmouseover="this.style.background=\'rgba(255,255,255,0.07)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.04)\'">'+
        (sub?'<div style="font-size:9px;color:#555;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">'+sub+'</div>':'')+
        '<div style="display:flex;align-items:center;gap:8px;">'+
          '<div style="flex:1;display:flex;align-items:center;gap:8px;justify-content:flex-end;text-align:right;"><span style="font-size:13px;font-weight:700;">'+_esc(m.home)+'</span>'+hb+'</div>'+
          '<div style="min-width:64px;text-align:center;"><div style="font-size:'+(hasScore?'18':'13')+'px;font-weight:900;color:'+(hasScore?'var(--accent)':'#888')+';">'+score+'</div>'+(m.live?'<div style="font-size:9px;color:#ff4444;font-weight:900;">● EN VIVO</div>':((m.time&&!hasScore)?'<div style="font-size:9px;color:#666;margin-top:2px;">'+m.time+'</div>':''))+'</div>'+
          '<div style="flex:1;display:flex;align-items:center;gap:8px;">'+ab+'<span style="font-size:13px;font-weight:700;">'+_esc(m.away)+'</span></div>'+
        '</div></div>';
    },

    // Detalle de partido full-screen (liquid glass)
    openMatch: async function(id){
      const ms=await _loadMatches();
      const m=ms.find(x=>String(x.id)===String(id)); if(!m) return;
      const ex=document.getElementById('mundial-match-view'); if(ex) ex.remove();
      const v=document.createElement('div'); v.id='mundial-match-view';
      v.style.cssText='position:fixed;inset:0;z-index:20070;background:rgba(8,10,8,0.92);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);overflow-y:auto;-webkit-overflow-scrolling:touch;';
      const hb=m.homeBadge?'<img src="'+m.homeBadge+'" style="width:62px;height:62px;object-fit:contain;" onerror="this.style.display=\'none\'">':'<i class=\'bx bx-shield\' style="font-size:50px;color:#333;"></i>';
      const ab=m.awayBadge?'<img src="'+m.awayBadge+'" style="width:62px;height:62px;object-fit:contain;" onerror="this.style.display=\'none\'">':'<i class=\'bx bx-shield\' style="font-size:50px;color:#333;"></i>';
      const hasScore=(m.hs!=null&&m.as!=null);
      let dt=''; try{ dt=new Date(m.iso||((m.date||'')+'T'+(m.time||'00:00'))).toLocaleString('es-UY',{weekday:'long',day:'2-digit',month:'long',hour:'2-digit',minute:'2-digit'}); }catch(e){ dt=m.date+' '+m.time; }
      const statusTxt=m.live?'<span style="color:#ff4444;font-weight:900;">● EN VIVO</span>':(hasScore?'FINALIZADO':'PROGRAMADO');
      v.innerHTML=
        // Barra superior con logo + campana + ajustes (consistente con la app)
        '<div style="position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:10px;padding:calc(8px + env(safe-area-inset-top)) 16px 8px;background:#0a0a0a;border-bottom:1px solid #1a1a1a;">'+
          '<img src="logo-oficial.png" onerror="this.src=\'logo.png\'" style="height:34px;object-fit:contain;">'+
          '<div style="margin-left:auto;display:flex;align-items:center;gap:8px;">'+
            '<button onclick="(window.CancheroNotif&&CancheroNotif.togglePanel)?CancheroNotif.togglePanel():(window.openNotificationsPanel&&openNotificationsPanel())" style="background:rgba(255,255,255,0.06);border:1px solid #2a2a2a;color:#fff;width:38px;height:38px;border-radius:50%;cursor:pointer;"><i class=\'bx bx-bell\' style="font-size:19px;"></i></button>'+
            '<button onclick="(window.CancheroNotif&&CancheroNotif.openSettings)?CancheroNotif.openSettings():(window.openSettings&&openSettings())" style="background:rgba(255,255,255,0.06);border:1px solid #2a2a2a;color:#fff;width:38px;height:38px;border-radius:50%;cursor:pointer;"><i class=\'bx bx-cog\' style="font-size:19px;"></i></button>'+
          '</div>'+
        '</div>'+
        '<div style="display:flex;align-items:center;gap:10px;padding:10px 16px;background:rgba(8,10,8,0.6);backdrop-filter:blur(10px);">'+
          '<button onclick="document.getElementById(\'mundial-match-view\').remove()" style="background:rgba(255,255,255,0.08);border:none;color:#fff;width:34px;height:34px;border-radius:50%;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class=\'bx bx-arrow-back\'></i></button>'+
          '<span style="font-weight:800;font-size:14px;">'+_esc(m.group||'Partido')+(m.matchday?' · Fecha '+m.matchday:'')+'</span>'+
        '</div>'+
        '<div style="max-width:560px;margin:0 auto;padding:10px 18px 40px;">'+
          '<div style="text-align:center;font-size:11px;color:#888;margin-bottom:6px;">'+statusTxt+' · '+dt+'</div>'+
          (m.venue?'<div style="text-align:center;font-size:11px;color:#999;margin-bottom:18px;"><i class="bx bx-map" style="color:var(--accent);"></i> '+_esc(m.venue)+'</div>':'<div style="margin-bottom:12px;"></div>')+
          '<div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:24px;">'+
            '<div style="flex:1;text-align:center;">'+hb+'<div style="font-size:14px;font-weight:800;margin-top:8px;">'+_esc(m.home)+'</div></div>'+
            '<div style="font-size:34px;font-weight:900;color:var(--accent);min-width:70px;text-align:center;">'+(hasScore?(m.hs+' - '+m.as):'vs')+'</div>'+
            '<div style="flex:1;text-align:center;">'+ab+'<div style="font-size:14px;font-weight:800;margin-top:8px;">'+_esc(m.away)+'</div></div>'+
          '</div>'+
          '<div id="mundial-match-extra"><div style="text-align:center;padding:20px;color:#555;"><i class="bx bx-loader-alt bx-spin" style="font-size:22px;color:var(--accent);"></i></div></div>'+
        '</div>';
      document.body.appendChild(v);
      // ── API-Football: minuto a minuto + alineaciones + estadísticas ──
      if(m.af){
        try{
          const [ev,lu,st]=await Promise.all([ _af('fixtures/events?fixture='+id,'ev_'+id), _af('fixtures/lineups?fixture='+id,'lu_'+id), _af('fixtures/statistics?fixture='+id,'st_'+id) ]);
          const box=document.getElementById('mundial-match-extra'); if(!box) return;
          let extra='';
          // Eventos minuto a minuto
          const events=(ev&&ev.response)||[];
          if(events.length){
            const icon=function(t,d){ if(/goal/i.test(t)) return '<i class="bx bx-football" style="color:var(--accent);"></i>'; if(/card/i.test(t)) return '<i class="bx bxs-square" style="color:'+(/red/i.test(d)?'#ff4444':'#ffcc00')+';"></i>'; if(/subst/i.test(t)) return '<i class="bx bx-transfer" style="color:#64b4ff;"></i>'; return '<i class="bx bx-circle" style="color:#666;"></i>'; };
            extra+='<div style="font-size:11px;font-weight:900;color:var(--accent);letter-spacing:1px;margin:4px 0 10px;">MINUTO A MINUTO</div>';
            extra+='<div style="background:rgba(255,255,255,0.03);border:1px solid #1a1a1a;border-radius:12px;overflow:hidden;margin-bottom:16px;">'+events.map(function(e){ const mn=(e.time&&e.time.elapsed!=null)?(e.time.elapsed+(e.time.extra?'+'+e.time.extra:'')+"′"):''; return '<div style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid #161616;font-size:12px;"><span style="color:#aaa;font-weight:900;min-width:36px;">'+mn+'</span><span style="width:18px;text-align:center;">'+icon(e.type,e.detail)+'</span><span style="flex:1;font-weight:700;">'+_esc(e.player&&e.player.name)+(e.assist&&e.assist.name?'<span style="color:#666;font-weight:400;font-size:10px;"> ('+_esc(e.assist.name)+')</span>':'')+'</span><span style="font-size:10px;color:#888;">'+_esc(e.team&&e.team.name)+'</span></div>'; }).join('')+'</div>';
          }
          // Estadísticas del equipo
          const stats=(st&&st.response)||[];
          if(stats.length===2){
            const h=stats[0].statistics||[], a=stats[1].statistics||[];
            const find=function(arr,t){ const x=arr.find(s=>s.type===t); return x?x.value:null; };
            const types=['Total Shots','Shots on Goal','Ball Possession','Total passes','Passes %','Fouls','Yellow Cards','Red Cards','Offsides','Corner Kicks'];
            const labels={'Total Shots':'Remates','Shots on Goal':'Al arco','Ball Possession':'Posesión','Total passes':'Pases','Passes %':'Precisión pases','Fouls':'Faltas','Yellow Cards':'Amarillas','Red Cards':'Rojas','Offsides':'Offsides','Corner Kicks':'Córners'};
            extra+='<div style="font-size:11px;font-weight:900;color:#888;letter-spacing:1px;margin-bottom:10px;">ESTADÍSTICAS</div><div style="background:rgba(255,255,255,0.03);border:1px solid #1a1a1a;border-radius:12px;padding:6px 12px;margin-bottom:16px;">';
            types.forEach(function(t){ const hv=find(h,t), av=find(a,t); if(hv==null&&av==null) return; extra+='<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #161616;font-size:12px;"><span style="width:50px;text-align:left;font-weight:800;color:var(--accent);">'+(hv!=null?hv:'-')+'</span><span style="flex:1;text-align:center;color:#888;font-size:11px;">'+labels[t]+'</span><span style="width:50px;text-align:right;font-weight:800;">'+(av!=null?av:'-')+'</span></div>'; });
            extra+='</div>';
          }
          // Alineaciones
          const lineups=(lu&&lu.response)||[];
          if(lineups.length){
            extra+='<div style="font-size:11px;font-weight:900;color:#888;letter-spacing:1px;margin-bottom:10px;">ALINEACIONES</div>';
            lineups.forEach(function(L){
              extra+='<div style="background:rgba(255,255,255,0.03);border:1px solid #1a1a1a;border-radius:12px;padding:12px 14px;margin-bottom:10px;"><div style="font-size:12px;font-weight:900;margin-bottom:8px;">'+(L.team&&L.team.logo?'<img src="'+L.team.logo+'" style="width:18px;height:18px;object-fit:contain;vertical-align:middle;margin-right:6px;">':'')+_esc(L.team&&L.team.name)+(L.formation?' <span style="color:var(--accent);font-size:11px;">'+L.formation+'</span>':'')+'</div>';
              extra+='<div style="font-size:11px;color:#aaa;line-height:1.9;">'+(L.startXI||[]).map(function(p){ const pl=p.player||{}; return '<span style="display:inline-block;margin-right:10px;"><span style="color:var(--accent);font-weight:800;">'+(pl.number||'')+'</span> '+_esc(pl.name)+'</span>'; }).join('')+'</div>';
              if((L.substitutes||[]).length) extra+='<div style="font-size:10px;color:#666;margin-top:6px;border-top:1px solid #161616;padding-top:6px;"><b>Suplentes:</b> '+(L.substitutes||[]).map(function(p){ return _esc(p.player&&p.player.name); }).join(', ')+'</div>';
              extra+='</div>';
            });
          }
          if(m.finished){
            var _existingR=_getReview(m.id);
            extra = '<div style="background:linear-gradient(135deg,rgba(186,255,0,0.14),rgba(186,255,0,0.03));border:1px solid rgba(186,255,0,0.35);border-radius:14px;padding:14px;margin-bottom:14px;display:flex;align-items:center;gap:12px;">'+
              '<i class="bx bxs-star" style="color:#ffcc00;font-size:24px;"></i>'+
              '<div style="flex:1;"><div style="font-size:13px;font-weight:900;color:#fff;">'+(_existingR?'Tu reseña guardada':'¿Qué te pareció este partido?')+'</div><div style="font-size:11px;color:#aaa;">'+(_existingR?'Editá o compartila con tus amigos.':'Calificá, escribí tu reseña y compartila.')+'</div></div>'+
              '<button onclick="CancheroMundial.openReview(\''+m.id+'\')" style="background:var(--accent);color:#000;border:none;border-radius:10px;padding:9px 14px;font-size:11px;font-weight:900;cursor:pointer;white-space:nowrap;"><i class="bx '+(_existingR?'bx-edit':'bx-plus')+'"></i> '+(_existingR?'EDITAR':'RESEÑA')+'</button>'+
            '</div>' + extra;
          }
          extra+='<div style="display:flex;gap:8px;margin-top:8px;">'+
            '<button onclick="CancheroMundial.openTeamByName(\''+(m.home||'').replace(/\x27/g,"\\\x27")+'\')" style="flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#fff;border-radius:10px;padding:10px;font-size:11px;font-weight:800;cursor:pointer;">Ver '+_esc(m.home)+'</button>'+
            '<button onclick="CancheroMundial.openTeamByName(\''+(m.away||'').replace(/\x27/g,"\\\x27")+'\')" style="flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#fff;border-radius:10px;padding:10px;font-size:11px;font-weight:800;cursor:pointer;">Ver '+_esc(m.away)+'</button>'+
            '</div>';
          box.innerHTML = extra || '<div style="text-align:center;color:#666;font-size:12px;padding:20px;">'+(m.finished?'Sin datos detallados de este partido.':'Los datos aparecen cuando se juega el partido.')+'</div>';
        }catch(e){ const box=document.getElementById('mundial-match-extra'); if(box) box.innerHTML='<div style="text-align:center;color:#666;font-size:12px;padding:20px;">Detalle no disponible.</div>'; }
        return;
      }
      // detalle ampliado (goles/eventos) si football-data lo permite
      try{
        const det=await _fd('matches/'+id,'match_'+id);
        const box=document.getElementById('mundial-match-extra'); if(!box) return;
        let extra='';
        // Goles (si el plan los trae)
        const goals=(det&&det.goals)||[];
        if(goals.length){
          extra+='<div style="font-size:11px;font-weight:900;color:var(--accent);letter-spacing:1px;margin:4px 0 10px;"><i class="bx bx-football"></i> GOLES</div>';
          extra+='<div style="background:rgba(255,255,255,0.03);border:1px solid #1a1a1a;border-radius:12px;overflow:hidden;margin-bottom:16px;">'+goals.map(function(g){ return '<div style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid #161616;font-size:12px;"><span style="color:var(--accent);font-weight:900;min-width:34px;">'+(g.minute!=null?g.minute+"′":'')+'</span><span style="flex:1;font-weight:700;">'+_esc(g.scorer&&g.scorer.name)+'</span><span style="font-size:10px;color:#888;">'+_esc(g.team&&g.team.name)+'</span></div>'; }).join('')+'</div>';
        }
        // Datos del partido
        const sc=det&&det.score;
        const rows=[];
        const _stage={'GROUP_STAGE':'Fase de grupos','LAST_16':'Octavos','QUARTER_FINALS':'Cuartos de final','SEMI_FINALS':'Semifinal','FINAL':'Final','THIRD_PLACE':'Tercer puesto'};
        if(det&&det.stage) rows.push(['bx-layer','Fase', _stage[det.stage]||det.stage]);
        if(det&&det.group) rows.push(['bx-grid-alt','Grupo', det.group]);
        if(sc&&sc.halfTime&&sc.halfTime.home!=null) rows.push(['bx-time-five','Entretiempo', sc.halfTime.home+' - '+sc.halfTime.away]);
        if(sc&&sc.winner) rows.push(['bx-trophy','Resultado', sc.winner==='DRAW'?'Empate':(sc.winner==='HOME_TEAM'?m.home:m.away)]);
        if(det&&det.venue) rows.push(['bx-map','Estadio', det.venue]);
        const refs=(det&&det.referees)||[];
        if(refs.length) rows.push(['bx-shield-quarter','Árbitro', refs[0].name]);
        if(rows.length){
          extra+='<div style="font-size:11px;font-weight:900;color:#888;letter-spacing:1px;margin-bottom:10px;">DATOS DEL PARTIDO</div>';
          extra+='<div style="background:rgba(255,255,255,0.03);border:1px solid #1a1a1a;border-radius:12px;overflow:hidden;">'+rows.map(function(r){ return '<div style="display:flex;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px solid #161616;font-size:12px;"><i class="bx '+r[0]+'" style="color:var(--accent);font-size:16px;"></i><span style="color:#888;min-width:90px;">'+r[1]+'</span><span style="flex:1;font-weight:700;">'+_esc(r[2])+'</span></div>'; }).join('')+'</div>';
        }
        // botón a cada equipo
        extra+='<div style="display:flex;gap:8px;margin-top:16px;">'+
          '<button onclick="CancheroMundial.openTeamByName(\''+(m.home||'').replace(/\\\\/g,"").replace(/\x27/g,"\\\x27")+'\')" style="flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#fff;border-radius:10px;padding:10px;font-size:11px;font-weight:800;cursor:pointer;">Ver '+_esc(m.home)+'</button>'+
          '<button onclick="CancheroMundial.openTeamByName(\''+(m.away||'').replace(/\\\\/g,"").replace(/\x27/g,"\\\x27")+'\')" style="flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#fff;border-radius:10px;padding:10px;font-size:11px;font-weight:800;cursor:pointer;">Ver '+_esc(m.away)+'</button>'+
          '</div>';
        box.innerHTML = extra || '<div style="text-align:center;color:#666;font-size:12px;padding:20px;">Sin detalles adicionales todavía.</div>';
      }catch(e){ const box=document.getElementById('mundial-match-extra'); if(box) box.innerHTML='<div style="text-align:center;color:#666;font-size:12px;padding:20px;">Detalle no disponible.</div>'; }
    },

    renderGrupos: async function(){
      const body=document.getElementById('mundial-body'); if(!body) return;
      const fd=await _fd('competitions/'+COMP+'/standings','standings');
      let groups=[];
      if(fd && fd.standings && fd.standings.length){
        groups=fd.standings.filter(s=>s.type==='TOTAL'||!s.type).map(s=>({name:s.group||'Tabla', rows:(s.table||[]).map(t=>({pos:t.position,team:t.team&&t.team.name,badge:t.team&&t.team.crest,pj:t.playedGames,dg:t.goalDifference,pts:t.points}))}));
      } else {
        const tb=await _get(TSDB+'/lookuptable.php?l='+WC_LEAGUE+'&s='+SEASON,'t_table');
        const table=(tb&&tb.table)||[];
        const byG={}; table.forEach(t=>{ const g=t.strGroup||'Tabla'; (byG[g]=byG[g]||[]).push(t); });
        groups=Object.keys(byG).sort().map(g=>({name:g,rows:byG[g].map((t,i)=>({pos:i+1,team:t.strTeam,badge:t.strBadge,pj:t.intPlayed,dg:t.intGoalDifference,pts:t.intPoints}))}));
      }
      if(!groups.length){ body.innerHTML=_empty('bx-list-ol','Las posiciones aparecen cuando arranca la fase de grupos.'); return; }
      body.innerHTML=groups.map(function(g){
        return '<div style="margin-bottom:18px;"><div style="font-size:12px;font-weight:900;color:var(--accent);letter-spacing:1px;margin-bottom:8px;">'+_esc(g.name).toUpperCase()+'</div>'+
        '<div style="background:rgba(255,255,255,0.04);border:1px solid #1a1a1a;border-radius:14px;overflow:hidden;">'+
        '<div style="display:flex;padding:8px 12px;font-size:9px;color:#666;font-weight:900;border-bottom:1px solid #1a1a1a;"><span style="width:22px;">#</span><span style="flex:1;">EQUIPO</span><span style="width:26px;text-align:center;">PJ</span><span style="width:26px;text-align:center;">DG</span><span style="width:30px;text-align:center;">PTS</span></div>'+
        g.rows.map(function(t,i){ const badge=t.badge?'<img src="'+t.badge+'" style="width:20px;height:20px;object-fit:contain;margin-right:6px;vertical-align:middle;" onerror="this.style.display=\'none\'">':''; return '<div style="display:flex;align-items:center;padding:9px 12px;font-size:12px;border-bottom:1px solid #141414;"><span style="width:22px;font-weight:900;color:'+(i<2?'var(--accent)':'#888')+';">'+(t.pos||i+1)+'</span><span style="flex:1;font-weight:700;">'+badge+_esc(t.team)+'</span><span style="width:26px;text-align:center;color:#888;">'+(t.pj||0)+'</span><span style="width:26px;text-align:center;color:#888;">'+(t.dg||0)+'</span><span style="width:30px;text-align:center;font-weight:900;color:var(--accent);">'+(t.pts||0)+'</span></div>'; }).join('')+
        '</div></div>';
      }).join('');
    },

    renderGoleadores: async function(){
      const body=document.getElementById('mundial-body'); if(!body) return;
      let sc=[];
      // API-Football (con foto), fallback football-data
      const af=await _af('players/topscorers?league='+AF_LEAGUE+'&season='+SEASON,'topscorers');
      if(_afOk(af)){
        sc=af.response.map(function(r){ const st=(r.statistics&&r.statistics[0])||{}; return { player:{name:r.player&&r.player.name, photo:r.player&&r.player.photo, nationality:r.player&&r.player.nationality, age:r.player&&r.player.age, position:st.games&&st.games.position}, team:{name:st.team&&st.team.name, logo:st.team&&st.team.logo}, goals:(st.goals&&st.goals.total)||0, assists:(st.goals&&st.goals.assists)||0 }; });
      } else {
        const fd=await _fd('competitions/'+COMP+'/scorers','scorers');
        sc=((fd&&fd.scorers)||[]).map(s=>({player:{name:s.player&&s.player.name,nationality:s.player&&s.player.nationality,position:s.player&&s.player.position,dateOfBirth:s.player&&s.player.dateOfBirth},team:{name:s.team&&s.team.name},goals:s.goals||0,assists:s.assists||0,penalties:s.penalties||0}));
      }
      if(!sc.length){ body.innerHTML=_empty('bx-football','Los goleadores aparecen cuando se configure una API (token gratis) y arranque el torneo.'); return; }
      _scorers=sc;
      body.innerHTML='<div style="font-size:11px;font-weight:900;color:var(--accent);letter-spacing:1px;margin-bottom:10px;">TABLA DE GOLEADORES</div>'+
        '<div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;">'+
        '<div style="display:flex;padding:8px 12px;font-size:9px;color:#666;font-weight:900;border-bottom:1px solid #1a1a1a;"><span style="width:22px;">#</span><span style="flex:1;">JUGADOR</span><span style="width:30px;text-align:center;">G</span><span style="width:30px;text-align:center;">A</span></div>'+
        sc.map(function(s,i){ const ph=s.player&&s.player.photo?'<img src="'+s.player.photo+'" style="width:30px;height:30px;border-radius:50%;object-fit:cover;margin-right:8px;" onerror="this.style.display=\'none\'">':''; return '<div onclick="CancheroMundial.openScorer('+i+')" style="display:flex;align-items:center;padding:10px 12px;font-size:12px;border-bottom:1px solid #141414;cursor:pointer;" onmouseover="this.style.background=\'rgba(255,255,255,0.04)\'" onmouseout="this.style.background=\'transparent\'"><span style="width:22px;font-weight:900;color:'+(i<3?'var(--accent)':'#888')+';">'+(i+1)+'</span>'+ph+'<span style="flex:1;font-weight:700;min-width:0;"><span style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+_esc(s.player&&s.player.name)+'</span><span style="font-size:9px;color:#888;font-weight:400;">'+_esc(s.team&&s.team.name)+'</span></span><span style="width:30px;text-align:center;font-weight:900;color:var(--accent);">'+(s.goals||0)+'</span><span style="width:30px;text-align:center;color:#888;">'+(s.assists||0)+'</span></div>'; }).join('')+
        '</div>';
    },

    openScorer: async function(i){
      const s=(_scorers||[])[i]; if(!s) return;
      const p=s.player||{}; const team=s.team||{};
      const ex=document.getElementById('mundial-match-view'); if(ex) ex.remove();
      const v=document.createElement('div'); v.id='mundial-match-view';
      v.style.cssText='position:fixed;inset:0;z-index:20070;background:rgba(8,10,8,0.92);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);overflow-y:auto;';
      const stat=function(val,lbl){ return '<div style="flex:1;background:rgba(255,255,255,0.04);border:1px solid #1a1a1a;border-radius:12px;padding:14px 4px;text-align:center;"><div style="font-size:24px;font-weight:900;color:var(--accent);">'+val+'</div><div style="font-size:10px;color:#888;font-weight:700;margin-top:2px;">'+lbl+'</div></div>'; };
      v.innerHTML=
        '<div style="position:sticky;top:0;display:flex;align-items:center;gap:10px;padding:14px 16px;background:rgba(8,10,8,0.6);backdrop-filter:blur(10px);">'+
          '<button onclick="document.getElementById(\'mundial-match-view\').remove()" style="background:rgba(255,255,255,0.08);border:none;color:#fff;width:38px;height:38px;border-radius:50%;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class=\'bx bx-arrow-back\'></i></button>'+
          '<span style="font-weight:800;font-size:14px;">Goleador</span>'+
        '</div>'+
        '<div style="max-width:520px;margin:0 auto;padding:18px;">'+
          '<div style="text-align:center;margin-bottom:20px;">'+(p.photo?'<img src="'+p.photo+'" style="width:88px;height:88px;border-radius:50%;object-fit:cover;border:2px solid rgba(186,255,0,0.35);margin:0 auto 10px;display:block;" onerror="this.style.display=\'none\'">':'<div style="width:80px;height:80px;border-radius:50%;background:rgba(186,255,0,0.1);border:1px solid rgba(186,255,0,0.25);display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:34px;font-weight:900;color:var(--accent);">'+((p.name||'?')[0]||'?')+'</div>')+'<div style="font-size:20px;font-weight:900;">'+_esc(p.name)+'</div><div style="font-size:12px;color:#888;margin-top:3px;">'+_esc(team.name)+(p.nationality?' · '+_esc(p.nationality):'')+(p.age?' · '+p.age+' años':'')+'</div></div>'+
          '<div style="display:flex;gap:8px;margin-bottom:16px;">'+stat(s.goals||0,'GOLES')+stat(s.assists||0,'ASISTENCIAS')+stat(s.penalties||0,'PENALES')+'</div>'+
          (p.position||p.dateOfBirth?'<div style="background:rgba(255,255,255,0.03);border:1px solid #1a1a1a;border-radius:12px;overflow:hidden;">'+
            (p.position?'<div style="display:flex;gap:10px;padding:11px 14px;border-bottom:1px solid #161616;font-size:12px;"><span style="color:#888;min-width:90px;">Posición</span><span style="font-weight:700;">'+_esc(p.position)+'</span></div>':'')+
            (p.dateOfBirth?'<div style="display:flex;gap:10px;padding:11px 14px;font-size:12px;"><span style="color:#888;min-width:90px;">Nacimiento</span><span style="font-weight:700;">'+_esc(p.dateOfBirth)+'</span></div>':'')+
          '</div>':'')+
        '</div>';
      document.body.appendChild(v);
    },

    renderEquipos: async function(){
      const body=document.getElementById('mundial-body'); if(!body) return;
      // Intentar ordenar por grupos (standings). Si no hay, grilla alfabética.
      const st=await _fd('competitions/'+COMP+'/standings','standings');
      const tile=function(name,badge){ return '<div onclick="CancheroMundial.openTeamByName(\''+(name||'').replace(/\x27/g,"\\\x27")+'\')" style="background:rgba(255,255,255,0.04);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:12px 6px;text-align:center;cursor:pointer;transition:.15s;" onmouseover="this.style.background=\'rgba(255,255,255,0.08)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.04)\'">'+(badge?'<img src="'+badge+'" style="width:42px;height:42px;object-fit:contain;margin-bottom:6px;" onerror="this.style.display=\'none\'">':'<i class=\'bx bx-shield\' style="font-size:34px;color:#333;"></i>')+'<div style="font-size:10px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+_esc(name)+'</div></div>'; };
      if(st && st.standings && st.standings.length){
        const groups=st.standings.filter(s=>s.type==='TOTAL'||!s.type);
        if(groups.length){
          body.innerHTML=groups.map(function(g){ return '<div style="font-size:12px;font-weight:900;color:var(--accent);letter-spacing:1px;margin:16px 0 10px;">'+_esc(g.group||'GRUPO').toUpperCase()+'</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(95px,1fr));gap:10px;">'+(g.table||[]).map(function(t){ return tile(t.team&&t.team.name, t.team&&t.team.crest); }).join('')+'</div>'; }).join('');
          return;
        }
      }
      // fallback alfabético
      let teams=[];
      const fd=await _fd('competitions/'+COMP+'/teams','teams');
      if(fd && fd.teams && fd.teams.length){ teams=fd.teams.map(t=>({name:t.name,badge:t.crest})).sort((a,b)=>a.name.localeCompare(b.name)); }
      else { teams=await _teamsFromMatches(); }
      if(!teams.length){ body.innerHTML=_empty('bx-group','Los equipos aparecen cuando hay partidos cargados.'); return; }
      body.innerHTML='<div style="font-size:11px;color:#666;margin-bottom:10px;">'+teams.length+' selecciones</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(95px,1fr));gap:10px;">'+
        teams.map(function(t){ return tile(t.name,t.badge); }).join('')+'</div>';
    },

    // Vista de equipo: fixture + récord + plantel
    openTeamByName: async function(name){
      const ms=await _loadMatches();
      const teamMs=ms.filter(m=>m.home===name||m.away===name);
      const sample=teamMs[0]||{};
      const badge=(sample.home===name?sample.homeBadge:sample.awayBadge)||'';
      const teamId=(sample.home===name?sample.homeId:sample.awayId)||null;
      const ex=document.getElementById('mundial-match-view'); if(ex) ex.remove();
      const v=document.createElement('div'); v.id='mundial-match-view';
      v.style.cssText='position:fixed;inset:0;z-index:20070;background:rgba(8,10,8,0.92);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);overflow-y:auto;-webkit-overflow-scrolling:touch;';
      // récord
      let w=0,d=0,l=0,gf=0,ga=0,cleanSheets=0;
      teamMs.forEach(m=>{ if(m.hs==null||m.as==null) return; const isH=m.home===name; const f=parseInt(isH?m.hs:m.as)||0, a=parseInt(isH?m.as:m.hs)||0; gf+=f; ga+=a; if(a===0)cleanSheets++; if(f>a)w++; else if(f<a)l++; else d++; });
      v.innerHTML=
        '<div style="position:sticky;top:0;display:flex;align-items:center;gap:10px;padding:14px 16px;background:rgba(8,10,8,0.6);backdrop-filter:blur(10px);">'+
          '<button onclick="document.getElementById(\'mundial-match-view\').remove()" style="background:rgba(255,255,255,0.08);border:none;color:#fff;width:38px;height:38px;border-radius:50%;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class=\'bx bx-arrow-back\'></i></button>'+
          '<span style="font-weight:800;font-size:14px;">'+_esc(name)+'</span>'+
        '</div>'+
        '<div style="max-width:560px;margin:0 auto;padding:14px 18px 40px;">'+
          '<div style="text-align:center;margin-bottom:18px;">'+(badge?'<img src="'+badge+'" style="width:72px;height:72px;object-fit:contain;" onerror="this.style.display=\'none\'">':'<i class=\'bx bx-shield\' style="font-size:56px;color:#333;"></i>')+'<div style="font-size:18px;font-weight:900;margin-top:8px;">'+_esc(name)+'</div></div>'+
          '<div style="display:flex;gap:8px;margin-bottom:20px;">'+
            ['<span style="color:#888;">PJ</span> '+(w+d+l), '<span style="color:#3fb950;">G</span> '+w, '<span style="color:#888;">E</span> '+d, '<span style="color:#ff5555;">P</span> '+l, '<span style="color:var(--accent);">GF</span> '+gf, '<span style="color:#888;">GC</span> '+ga].map(s=>'<div style="flex:1;background:rgba(255,255,255,0.04);border:1px solid #1a1a1a;border-radius:10px;padding:10px 4px;text-align:center;font-size:12px;font-weight:800;">'+s+'</div>').join('')+
          '</div>'+
          '<div style="font-size:11px;font-weight:900;color:var(--accent);letter-spacing:1px;margin-bottom:10px;">PARTIDOS EN EL MUNDIAL</div>'+
          teamMs.map(m=>CancheroMundial._card(m)).join('')+
          '<div id="mundial-team-squad" style="margin-top:18px;"></div>'+
        '</div>';
      document.body.appendChild(v);
      // plantel (si el plan lo permite)
      if(teamId){ try{
        const td=await _fd('teams/'+teamId,'team_'+teamId);
        const squad=(td&&td.squad)||[];
        const box=document.getElementById('mundial-team-squad'); if(!box) return;
        if(squad.length){
          var scorerMap={}; (_scorers||[]).forEach(function(s){ if(s.team&&s.team.name===name) scorerMap[s.player.name]={g:s.goals||0,a:s.assists||0}; });
          const byPos={}; squad.forEach(p=>{ const pos=p.position||'Otros'; (byPos[pos]=byPos[pos]||[]).push(p); });
          box.innerHTML='<div style="font-size:11px;font-weight:900;color:var(--accent);letter-spacing:1px;margin-bottom:10px;">PLANTEL ('+squad.length+')</div>'+
            Object.keys(byPos).map(function(pos){ var isGK=/goalkeeper|arquero|portero|goalie/i.test(pos); return '<div style="font-size:10px;color:#666;font-weight:800;margin:10px 0 6px;text-transform:uppercase;">'+_esc(pos)+'</div>'+byPos[pos].map(function(p){ var st=scorerMap[p.name]; var parts=[]; if(st&&st.g) parts.push(st.g+' gol'+(st.g>1?'es':'')); if(st&&st.a) parts.push(st.a+' asist'); if(isGK&&cleanSheets) parts.push(cleanSheets+' vallas invictas'); var statsHtml=parts.length?'<span style="font-size:10px;font-weight:800;color:var(--accent);white-space:nowrap;">'+parts.join(' · ')+'</span>':''; return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #161616;font-size:12px;"><span style="flex:1;font-weight:700;">'+_esc(p.name)+'</span>'+statsHtml+(p.nationality?'<span style="font-size:10px;color:#888;margin-left:4px;">'+_esc(p.nationality)+'</span>':'')+'</div>'; }).join(''); }).join('');
        }
      }catch(e){} }
    },

    renderStats: async function(){
      const body=document.getElementById('mundial-body'); if(!body) return;
      const ms=await _loadMatches();
      const played=ms.filter(m=>m.hs!=null&&m.as!=null);
      const goals=played.reduce((s,m)=>s+(parseInt(m.hs)||0)+(parseInt(m.as)||0),0);
      const teams=await _teamsFromMatches();
      const avg=played.length?(goals/played.length).toFixed(2):'0';
      // goles a favor / en contra por equipo
      const gf={},ga={}; played.forEach(m=>{ const h=parseInt(m.hs)||0,a=parseInt(m.as)||0; gf[m.home]=(gf[m.home]||0)+h; ga[m.home]=(ga[m.home]||0)+a; gf[m.away]=(gf[m.away]||0)+a; ga[m.away]=(ga[m.away]||0)+h; });
      const totalGA=Object.values(ga).reduce((s,n)=>s+n,0);
      const topGoles=Object.entries(gf).sort((a,b)=>b[1]-a[1]).slice(0,5);
      const topValla=Object.keys(ga).map(k=>[k,ga[k]]).sort((a,b)=>a[1]-b[1]).slice(0,5);
      const card=function(v,l,ic){ return '<div style="flex:1;min-width:130px;background:rgba(255,255,255,0.04);border:1px solid #1e1e1e;border-radius:14px;padding:16px;"><div style="display:flex;align-items:center;gap:8px;color:#666;font-size:10px;font-weight:800;letter-spacing:1px;margin-bottom:8px;"><i class="bx '+ic+'" style="color:var(--accent);font-size:16px;"></i> '+l+'</div><div style="font-size:26px;font-weight:900;color:var(--accent);">'+v+'</div></div>'; };
      const rank=function(title,arr,asc){ if(!arr.length) return ''; return '<div style="font-size:12px;font-weight:900;color:var(--accent);letter-spacing:1px;margin:16px 0 10px;">'+title+'</div><div style="background:rgba(255,255,255,0.04);border:1px solid #1a1a1a;border-radius:14px;overflow:hidden;">'+arr.map(function(e,i){ return '<div style="display:flex;align-items:center;padding:9px 12px;font-size:12px;border-bottom:1px solid #141414;"><span style="width:22px;font-weight:900;color:'+(i<3?'var(--accent)':'#888')+';">'+(i+1)+'</span><span style="flex:1;font-weight:700;">'+_esc(e[0])+'</span><span style="font-weight:900;color:var(--accent);">'+e[1]+'</span></div>'; }).join('')+'</div>'; };
      body.innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:8px;">'+
        card(teams.length,'SELECCIONES','bx-flag')+card(played.length,'PARTIDOS JUGADOS','bx-football')+card(goals,'GOLES TOTALES','bx-target-lock')+card(avg,'PROM. GOLES/PARTIDO','bx-line-chart')+
        '</div>'+
        (played.length?rank('<i class="bx bx-football"></i> EQUIPOS MÁS GOLEADORES',topGoles)+rank('<i class="bx bx-shield-quarter"></i> VALLA MENOS BATIDA (GOLES RECIBIDOS)',topValla):'<div style="color:#666;font-size:12px;text-align:center;padding:20px;">Las estadísticas se llenan a medida que se juegan partidos.</div>');
    },

    renderPredictor: async function(){
      const body=document.getElementById('mundial-body'); if(!body) return;
      const ms=await _loadMatches();
      const preds=_getPreds();

      // Solo partidos de FASE DE GRUPOS con equipos reales
      var groupMatches=ms.filter(function(m){ return (m.stage||'GROUP_STAGE')==='GROUP_STAGE' && m.home && m.away && m.home!=='?' && m.away!=='?'; });
      if(!groupMatches.length){ body.innerHTML=_empty('bx-trophy','El predictor se activa cuando se cargan los grupos del Mundial.'); return; }

      var badge={}; ms.forEach(function(m){ if(m.home){badge[m.home]=badge[m.home]||m.homeBadge;} if(m.away){badge[m.away]=badge[m.away]||m.awayBadge;} });
      var byG={}; groupMatches.forEach(function(m){ var g=m.group||'Grupo'; (byG[g]=byG[g]||[]).push(m); });
      var groupNames=Object.keys(byG).sort();

      function secTitle(ic,t){ return '<div style="font-size:12px;font-weight:900;color:var(--accent);letter-spacing:1px;margin:18px 0 10px;"><i class="bx '+ic+'"></i> '+t+'</div>'; }
      function teamChip(name){ var b=badge[name]; return (b?'<img src="'+b+'" style="width:20px;height:20px;object-fit:contain;vertical-align:middle;margin-right:4px;" onerror="this.style.display=\'none\'">':'')+_esc(name||'—'); }

      // Tabla de posiciones a partir de resultados reales (jugados) + pronósticos (no jugados)
      function computeStandings(matches){
        var T={};
        function ensure(n){ if(!T[n]) T[n]={team:n,pts:0,w:0,gd:0,pj:0}; return T[n]; }
        matches.forEach(function(m){
          var h=ensure(m.home), a=ensure(m.away);
          var finished=m.finished||(m.hs!=null&&m.as!=null);
          if(finished){
            var hs=parseInt(m.hs)||0, as=parseInt(m.as)||0;
            h.pj++; a.pj++; h.gd+=(hs-as); a.gd+=(as-hs);
            if(hs>as){ h.pts+=3; h.w++; } else if(as>hs){ a.pts+=3; a.w++; } else { h.pts++; a.pts++; }
          } else {
            var raw=preds[m.id]; var pick=_getPickStr(raw); var pscore=_getPickScore(raw);
            if(pscore[0]!=null && pscore[1]!=null){
              var phs=parseInt(pscore[0])||0, pas=parseInt(pscore[1])||0;
              h.pj++; a.pj++; h.gd+=(phs-pas); a.gd+=(pas-phs);
              if(phs>pas){ h.pts+=3; h.w++; } else if(pas>phs){ a.pts+=3; a.w++; } else { h.pts++; a.pts++; }
            }
            else if(pick==='home'){ h.pts+=3; h.w++; h.gd++; a.gd--; h.pj++; a.pj++; }
            else if(pick==='away'){ a.pts+=3; a.w++; a.gd++; h.gd--; h.pj++; a.pj++; }
            else if(pick==='draw'){ h.pts++; a.pts++; h.pj++; a.pj++; }
          }
        });
        return Object.values(T).sort(function(x,y){ return (y.pts-x.pts)||(y.gd-x.gd)||(y.w-x.w)||x.team.localeCompare(y.team); });
      }

      function mkGroupRow(m){
        var my=preds[m.id];
        var pickStr=_getPickStr(my);
        var sc=_getPickScore(my); var sa=sc[0], sb=sc[1];
        var hasPred = !!(pickStr || (sa!=null && sb!=null));
        var btn=function(v,l){ var on=pickStr===v; return '<button onclick="CancheroMundial.predict(\''+m.id+'\',\''+v+'\')" style="flex:1;background:'+(on?'var(--accent)':'rgba(255,255,255,0.05)')+';color:'+(on?'#000':'#aaa')+';border:1px solid '+(on?'var(--accent)':'#2a2a2a')+';border-radius:8px;padding:7px 4px;font-size:10px;font-weight:800;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+_esc(l)+'</button>'; };
        var ipStyle='width:42px;height:34px;text-align:center;background:rgba(255,255,255,0.06);border:1px solid #2a2a2a;color:#fff;border-radius:8px;font-size:15px;font-weight:900;outline:none;';
        var scoreRow='<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;">'+
          '<input type="number" min="0" max="20" inputmode="numeric" value="'+(sa!=null?sa:'')+'" placeholder="-" onchange="CancheroMundial.setScore(\''+m.id+'\',this.value,null)" style="'+ipStyle+'">'+
          '<span style="color:#666;font-size:11px;font-weight:800;">MARCADOR</span>'+
          '<input type="number" min="0" max="20" inputmode="numeric" value="'+(sb!=null?sb:'')+'" placeholder="-" onchange="CancheroMundial.setScore(\''+m.id+'\',null,this.value)" style="'+ipStyle+'">'+
          '</div>';
        // Botón "Compartir este pronóstico" individual (solo si ya hay predicción)
        var shareIndividual = hasPred
          ? '<button onclick="CancheroMundial.shareOnePrediction(\''+m.id+'\')" style="width:100%;margin-top:8px;background:rgba(186,255,0,0.08);color:var(--accent);border:1px solid rgba(186,255,0,0.3);border-radius:8px;padding:6px;font-size:10px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;"><i class="bx bx-share-alt"></i> COMPARTIR ESTE PRONÓSTICO</button>'
          : '';
        return '<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:10px 12px;margin-bottom:8px;"><div style="display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;font-weight:700;margin-bottom:6px;">'+teamChip(m.home)+'<span style="color:#555;margin:0 4px;">vs</span>'+teamChip(m.away)+'</div>'+scoreRow+'<div style="display:flex;gap:5px;">'+btn('home',m.home)+btn('draw','Empate')+btn('away',m.away)+'</div>'+shareIndividual+'</div>';
      }

      function miniTable(st){
        return '<div style="background:rgba(255,255,255,0.03);border:1px solid #181818;border-radius:10px;overflow:hidden;margin-bottom:6px;">'+st.map(function(e,i){ var q=i<2; return '<div style="display:flex;align-items:center;padding:6px 10px;font-size:11px;border-bottom:1px solid #141414;'+(q?'background:rgba(186,255,0,0.06);':'')+'"><span style="width:18px;font-weight:900;color:'+(q?'var(--accent)':'#666')+';">'+(i+1)+'</span><span style="flex:1;font-weight:700;color:'+(q?'#fff':'#999')+';">'+teamChip(e.team)+'</span><span style="color:#777;margin-right:8px;">'+e.pj+'PJ</span><span style="font-weight:900;color:'+(q?'var(--accent)':'#888')+';">'+e.pts+'pts</span></div>'; }).join('')+'</div>';
      }

      // Botón de knockout: la "predicción" es el nombre del equipo ganador
      function mkKoRow(a,b,koId){
        var pick=_getPickStr(preds[koId]);
        var btn=function(name){ var on=pick===name; return '<button onclick="CancheroMundial.predict(\''+koId+'\',\''+(name||'').replace(/\x27/g,"\\\x27")+'\')" style="flex:1;background:'+(on?'var(--accent)':'rgba(255,255,255,0.05)')+';color:'+(on?'#000':'#ccc')+';border:1px solid '+(on?'var(--accent)':'#2a2a2a')+';border-radius:8px;padding:9px 6px;font-size:11px;font-weight:800;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+teamChip(name)+'</button>'; };
        return '<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:10px 12px;margin-bottom:8px;display:flex;gap:6px;align-items:center;">'+btn(a)+'<span style="color:#555;font-size:10px;font-weight:900;">VS</span>'+btn(b)+'</div>';
      }
      function placeholderRow(){ return '<div style="background:rgba(255,255,255,0.02);border:1px dashed #222;border-radius:14px;padding:12px;margin-bottom:8px;text-align:center;color:#555;font-size:11px;">Definí la ronda anterior para desbloquear</div>'; }

      var html='';

      // ── Toolbar: compartir predicciones ──
      html+='<div style="display:flex;gap:8px;margin-bottom:12px;">'+
        '<button onclick="CancheroMundial.sharePredictions()" style="flex:1;background:linear-gradient(135deg,rgba(186,255,0,0.15),rgba(186,255,0,0.03));color:var(--accent);border:1px solid rgba(186,255,0,0.35);border-radius:12px;padding:11px;font-weight:900;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="bx bx-share-alt"></i> COMPARTIR MIS PREDICCIONES</button>'+
        '</div>'+
        '<div style="font-size:10px;color:#666;margin:-6px 0 12px;text-align:center;">Tip: tocá los números para poner el marcador exacto (1-0, 2-1, …). Podés cambiarlo cuando quieras.</div>';

      // ── FASE DE GRUPOS ── (no se muestran los partidos ya jugados)
      html+=secTitle('bx-grid-alt','FASE DE GRUPOS');
      groupNames.forEach(function(g){
        html+='<div style="font-size:11px;color:#aaa;font-weight:800;margin:14px 0 6px;text-transform:uppercase;">'+_esc(g)+'</div>';
        var pendientes=byG[g].filter(function(m){ return !(m.finished||(m.hs!=null&&m.as!=null)); });
        pendientes.forEach(function(m){ html+=mkGroupRow(m); });
        if(!pendientes.length) html+='<div style="font-size:10px;color:#555;margin-bottom:6px;">Grupo finalizado</div>';
        html+=miniTable(computeStandings(byG[g]));
      });

      // ── CLASIFICADOS → BRACKET (Mundial 2026: 32 a eliminatorias = 1º+2º de cada grupo + 8 mejores terceros) ──
      var W=[], R=[], thirds=[];
      groupNames.forEach(function(g){ var st=computeStandings(byG[g]); W.push(st[0]?st[0].team:null); R.push(st[1]?st[1].team:null); if(st[2]) thirds.push(st[2]); });
      // Mejores 8 terceros por pts/gd
      thirds.sort(function(x,y){ return (y.pts-x.pts)||(y.gd-x.gd)||(y.w-x.w); });
      var bestThirds=thirds.slice(0,8).map(function(e){return e.team;});
      // Sembrado: cruzar 1º/2º de grupos distintos y completar con terceros hasta 32 slots → arranca en 16avos
      var seeded=[];
      for(var i=0;i<groupNames.length;i+=2){
        seeded.push(W[i], R[i+1]!==undefined?R[i+1]:null);
        if(i+1<groupNames.length) seeded.push(W[i+1], R[i]);
      }
      bestThirds.forEach(function(t){ seeded.push(t); });
      // Padear a 32 slots para que la primera ronda sean 16avos de final
      while(seeded.length<32) seeded.push(null);
      seeded=seeded.slice(0,32);

      function roundName(teamCount){
        // Nunca decir "RONDA": nombrar siempre la fase según cuántos equipos quedan
        if(teamCount>=32) return ['bx-trophy','16VOS DE FINAL'];
        if(teamCount>=16) return ['bx-trophy','OCTAVOS DE FINAL'];
        if(teamCount>=8) return ['bx-trophy','CUARTOS DE FINAL'];
        if(teamCount>=4) return ['bx-trophy','SEMIFINALES'];
        return ['bx-trophy','FINAL'];
      }

      var champion=null;
      if(seeded.length>=2){
        var cur=seeded.slice();
        var roundIdx=0;
        var semiLosers=null;
        while(cur.length>1){
          var nm=roundName(cur.length);
          html+=secTitle(nm[0],nm[1]);
          var next=[]; var losers=[];
          for(var k=0;k<cur.length;k+=2){
            var a=cur[k], b=cur[k+1];
            var koId='ko-'+roundIdx+'-'+(k/2);
            if(a&&b){
              html+=mkKoRow(a,b,koId);
              var pk=_getPickStr(preds[koId]);
              next.push(pk===a?a:(pk===b?b:null));
              losers.push(pk===a?b:(pk===b?a:null));
            } else { html+=placeholderRow(); next.push(null); losers.push(null); }
          }
          if(cur.length===4) semiLosers=losers; // perdedores de semis → 3er puesto
          cur=next; roundIdx++;
        }
        champion=cur[0]||null;

        // ── TERCER PUESTO ──
        if(semiLosers && semiLosers[0] && semiLosers[1]){
          html+=secTitle('bx-medal','TERCER PUESTO');
          html+=mkKoRow(semiLosers[0], semiLosers[1], 'ko-3rd');
        }
      }

      // ── CAMPEÓN ──
      html+='<div style="background:linear-gradient(135deg,rgba(186,255,0,0.15),rgba(186,255,0,0.03));border:2px solid var(--accent);border-radius:16px;padding:20px;text-align:center;margin-top:18px;">'+
        '<div style="font-size:10px;font-weight:900;color:var(--accent);letter-spacing:2px;margin-bottom:8px;"><i class="bx bxs-trophy"></i> TU CAMPEÓN</div>'+
        (champion?'<div style="font-size:22px;font-weight:900;color:#fff;">'+teamChip(champion)+'</div>':'<div style="font-size:13px;color:#777;">Completá el bracket para ver tu campeón</div>')+
        '</div>';

      body.innerHTML=html;
    },
    predict:function(id,pick){
      var cur=_getPreds()[id];
      // Si ya había un marcador exacto guardado y el usuario cambió de pick por botón:
      // preservar los números (solo cambiar el pick) si son coherentes; sino limpiarlos.
      if(cur && typeof cur==='object' && cur.sa!=null && cur.sb!=null){
        var auto = cur.sa>cur.sb?'home':cur.sa<cur.sb?'away':'draw';
        if(auto===pick){ _setPred(id, cur); } // ya consistente
        else { _setPred(id, {pick:pick, sa:null, sb:null}); }
      } else {
        _setPred(id, pick);
      }
      if(window.showToast) showToast('Pronóstico guardado','success');
      this.renderPredictor();
    },
    setScore:function(id, sa, sb){
      var cur=_getPreds()[id]; var prev=_getPickScore(cur);
      var na = sa===null?prev[0]:(sa===''?null:parseInt(sa));
      var nb = sb===null?prev[1]:(sb===''?null:parseInt(sb));
      if(na!=null && (na<0||na>20||isNaN(na))) return;
      if(nb!=null && (nb<0||nb>20||isNaN(nb))) return;
      _setScore(id, na, nb);
      this.renderPredictor();
    },
    pickChampion:function(t){ _setChampion(t); if(window.showToast) showToast(t?('Tu campeón: '+t):'Campeón borrado','success'); this.renderPredictor(); },

    // ── Compartir predicciones (Web Share API + fallback link) ──
    sharePredictions: async function(){
      var ms=await _loadMatches();
      var preds=_getPreds();
      var lines=[]; var n=0;
      ms.forEach(function(m){
        var r=preds[m.id]; if(!r) return; var pick=_getPickStr(r); var sc=_getPickScore(r);
        if(sc[0]!=null && sc[1]!=null){ lines.push(m.home+' '+sc[0]+'-'+sc[1]+' '+m.away); n++; }
        else if(pick==='home'){ lines.push('Gana '+m.home+' vs '+m.away); n++; }
        else if(pick==='away'){ lines.push('Gana '+m.away+' vs '+m.home); n++; }
        else if(pick==='draw'){ lines.push('Empate: '+m.home+' vs '+m.away); n++; }
      });
      if(!n){ if(window.showToast) showToast('Hacé al menos una predicción','warning'); return; }
      window._predShareLines = lines;
      // Modal: elegir compartir DENTRO o FUERA de Canchero (igual que reseñas)
      var pick=document.createElement('div');
      pick.style.cssText='position:fixed;inset:0;z-index:30100;background:rgba(8,10,8,0.92);display:flex;align-items:center;justify-content:center;padding:18px;';
      pick.innerHTML='<div style="background:#0d100d;border:1px solid #1f2a14;border-radius:18px;padding:18px;max-width:400px;width:100%;">'+
        '<div style="font-size:13px;font-weight:900;color:var(--accent);margin-bottom:6px;text-align:center;"><i class="bx bx-trophy"></i> COMPARTIR PREDICCIONES</div>'+
        '<div style="font-size:11px;color:#888;text-align:center;margin-bottom:14px;">'+n+' pronóstico'+(n!==1?'s':'')+' · ficha del Mundial 2026</div>'+
        '<div style="display:flex;flex-direction:column;gap:8px;">'+
          '<button onclick="CancheroMundial._publishPredictionsToFeed();this.closest(\'div[style*=fixed]\').remove();" style="background:var(--accent);color:#000;border:none;border-radius:12px;padding:12px;font-weight:900;font-size:13px;cursor:pointer;"><i class="bx bx-broadcast"></i> Publicar en el feed de Canchero</button>'+
          '<button onclick="CancheroMundial._sharePredictionsExternal();this.closest(\'div[style*=fixed]\').remove();" style="background:rgba(255,255,255,0.06);color:#fff;border:1px solid #2a2a2a;border-radius:12px;padding:12px;font-weight:900;font-size:13px;cursor:pointer;"><i class="bx bx-share-alt"></i> Compartir fuera (WhatsApp/X/IG…)</button>'+
          '<button onclick="this.closest(\'div[style*=fixed]\').remove()" style="background:transparent;color:#888;border:none;padding:8px;font-size:12px;cursor:pointer;">Cancelar</button>'+
        '</div></div>';
      document.body.appendChild(pick);
    },
    _sharePredictionsExternal: async function(){
      var lines=window._predShareLines||[];
      var text='⚽ Mis predicciones del Mundial 2026 (Canchero)\n\n'+lines.slice(0,10).join('\n')+(lines.length>10?('\n…y '+(lines.length-10)+' más'):'')+'\n\nMirá las tuyas en Canchero.';
      var url=(location.origin||'https://canchero.app')+'/?tab=mundial';
      try{ if(navigator.share){ await navigator.share({title:'Mis predicciones del Mundial', text:text, url:url}); return; } }catch(e){}
      try{ await navigator.clipboard.writeText(text+'\n'+url); if(window.showToast) showToast('Predicciones copiadas','success'); }catch(e){ alert(text+'\n'+url); }
    },
    _publishPredictionsToFeed: async function(){
      var lines=window._predShareLines||[];
      var sb=window._sb; var u=window.userData;
      if(!sb||!u){ if(window.showToast) showToast('Iniciá sesión para publicar','warning'); return; }
      var content='⚽ MIS PREDICCIONES · MUNDIAL 2026\n\n'+lines.slice(0,12).join('\n')+(lines.length>12?('\n…y '+(lines.length-12)+' más'):'')+'\n\n¿Coincidís? Hacé las tuyas en el Mundial de Canchero.\n\n#Mundial2026 #Predicciones #Canchero';
      try{
        await sb.from('posts').insert({ user_email:u.email, user_name:u.name||u.email, user_photo:u.photo||'', content:content, media_type:'text' });
        if(window.showToast) showToast('Predicciones publicadas en el feed','success');
      }catch(e){ if(window.showToast) showToast('No se pudo publicar: '+e.message,'error'); }
    },

    // ── Compartir UNA predicción individual ──
    shareOnePrediction: async function(matchId){
      var ms=await _loadMatches();
      var m=ms.find(function(x){ return String(x.id)===String(matchId); }); if(!m) return;
      var preds=_getPreds(); var raw=preds[matchId]; if(!raw){ if(window.showToast) showToast('Hacé tu predicción primero','warning'); return; }
      var pick=_getPickStr(raw); var sc=_getPickScore(raw);
      var line;
      if(sc[0]!=null && sc[1]!=null) line = m.home+' '+sc[0]+'-'+sc[1]+' '+m.away;
      else if(pick==='home') line = 'Gana '+m.home+' vs '+m.away;
      else if(pick==='away') line = 'Gana '+m.away+' vs '+m.home;
      else if(pick==='draw') line = 'Empate: '+m.home+' vs '+m.away;
      else { if(window.showToast) showToast('Pronóstico vacío','warning'); return; }
      window._predOneCtx = { matchId: matchId, line: line, m: m, scoreA: sc[0], scoreB: sc[1], pick: pick };
      // Modal de elección dentro/fuera
      var pickModal=document.createElement('div');
      pickModal.style.cssText='position:fixed;inset:0;z-index:30100;background:rgba(8,10,8,0.92);display:flex;align-items:center;justify-content:center;padding:18px;';
      pickModal.innerHTML='<div style="background:#0d100d;border:1px solid #1f2a14;border-radius:18px;padding:18px;max-width:400px;width:100%;">'+
        '<div style="font-size:13px;font-weight:900;color:var(--accent);margin-bottom:6px;text-align:center;"><i class="bx bx-trophy"></i> COMPARTIR PRONÓSTICO</div>'+
        '<div style="background:rgba(186,255,0,0.06);border:1px solid rgba(186,255,0,0.25);border-radius:12px;padding:12px;margin:10px 0 14px;text-align:center;"><div style="font-size:14px;font-weight:900;color:#fff;">'+_esc(line)+'</div></div>'+
        '<div style="display:flex;flex-direction:column;gap:8px;">'+
          '<button onclick="CancheroMundial._publishOneToFeed();this.closest(\'div[style*=fixed]\').remove();" style="background:var(--accent);color:#000;border:none;border-radius:12px;padding:12px;font-weight:900;font-size:13px;cursor:pointer;"><i class="bx bx-broadcast"></i> Publicar en el feed de Canchero</button>'+
          '<button onclick="CancheroMundial._shareOneExternal();this.closest(\'div[style*=fixed]\').remove();" style="background:rgba(255,255,255,0.06);color:#fff;border:1px solid #2a2a2a;border-radius:12px;padding:12px;font-weight:900;font-size:13px;cursor:pointer;"><i class="bx bx-share-alt"></i> Compartir fuera (WhatsApp/X/IG…)</button>'+
          '<button onclick="this.closest(\'div[style*=fixed]\').remove()" style="background:transparent;color:#888;border:none;padding:8px;font-size:12px;cursor:pointer;">Cancelar</button>'+
        '</div></div>';
      document.body.appendChild(pickModal);
    },
    _publishOneToFeed: async function(){
      var ctx=window._predOneCtx; if(!ctx) return;
      var sb=window._sb; var u=window.userData;
      if(!sb||!u){ if(window.showToast) showToast('Iniciá sesión','warning'); return; }
      var content='⚽ MI PRONÓSTICO · MUNDIAL 2026\n\n'+ctx.line+'\n\n¿Le ganás a mi pronóstico? Probá tu predicción en el Mundial de Canchero.\n\n#Mundial2026 #Predicciones #Canchero';
      try{
        await sb.from('posts').insert({
          user_email:u.email, user_name:u.name||u.email, user_photo:u.photo||'',
          content:content, media_type:'text'
        });
        if(window.showToast) showToast('Pronóstico publicado en el feed','success');
      }catch(e){ if(window.showToast) showToast('No se pudo publicar: '+e.message,'error'); }
    },
    _shareOneExternal: async function(){
      var ctx=window._predOneCtx; if(!ctx) return;
      var text='⚽ Mi pronóstico Mundial 2026:\n\n'+ctx.line+'\n\nHacé el tuyo en Canchero.';
      var url=(location.origin||'https://canchero.app')+'/?tab=mundial&match='+ctx.matchId;
      try{ if(navigator.share){ await navigator.share({title:'Mi pronóstico', text:text, url:url}); return; } }catch(e){}
      try{ await navigator.clipboard.writeText(text+'\n'+url); if(window.showToast) showToast('Copiado','success'); }catch(e){ alert(text+'\n'+url); }
    },

    // ── Reseña de partido jugado ──
    openReview: async function(matchId){
      var ms=await _loadMatches();
      var m=ms.find(function(x){ return String(x.id)===String(matchId); });
      if(!m) return;
      var existing=_getReview(matchId)||{};
      var modal=document.createElement('div');
      modal.id='mundial-review-modal';
      modal.style.cssText='position:fixed;inset:0;z-index:30090;background:rgba(8,10,8,0.94);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;padding:18px;';
      var rating=existing.rating||0;
      var stars=function(){
        var h=''; for(var i=1;i<=5;i++){ h+='<i onclick="document.getElementById(\'mreview-rating\').value='+i+';document.querySelectorAll(\'.mr-star\').forEach(function(el,idx){el.style.color=(idx<'+i+')?\'#ffcc00\':\'#444\';});" class="bx '+(i<=rating?'bxs-star':'bxs-star')+' mr-star" style="font-size:30px;cursor:pointer;color:'+(i<=rating?'#ffcc00':'#444')+';"></i>'; } return h;
      };
      modal.innerHTML=
        '<div style="background:#0d100d;border:1px solid #1f2a14;border-radius:18px;padding:20px;max-width:440px;width:100%;max-height:90vh;overflow-y:auto;">'+
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">'+
            '<div style="font-size:14px;font-weight:900;color:var(--accent);">RESEÑA DEL PARTIDO</div>'+
            '<button onclick="document.getElementById(\'mundial-review-modal\').remove()" style="background:rgba(255,255,255,0.06);border:1px solid #2a2a2a;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;">✕</button>'+
          '</div>'+
          '<div style="text-align:center;font-size:13px;font-weight:800;margin-bottom:6px;">'+_esc(m.home)+' <span style="color:var(--accent);">'+(m.hs!=null?m.hs:'-')+' - '+(m.as!=null?m.as:'-')+'</span> '+_esc(m.away)+'</div>'+
          '<div style="text-align:center;color:#888;font-size:11px;margin-bottom:14px;">'+_esc(m.group||'Partido')+(m.matchday?' · J'+m.matchday:'')+'</div>'+
          '<div style="text-align:center;margin-bottom:14px;">'+stars()+'<input type="hidden" id="mreview-rating" value="'+rating+'"></div>'+
          '<textarea id="mreview-text" placeholder="Tu reseña: ¿qué te pareció el partido, el mejor jugador, jugada destacada?" style="width:100%;min-height:120px;background:rgba(255,255,255,0.04);border:1px solid #2a2a2a;color:#fff;border-radius:12px;padding:12px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box;resize:vertical;">'+_esc(existing.text||'')+'</textarea>'+
          '<input id="mreview-mvp" placeholder="MVP del partido (opcional)" value="'+_esc(existing.mvp||'')+'" style="width:100%;background:rgba(255,255,255,0.04);border:1px solid #2a2a2a;color:#fff;border-radius:12px;padding:11px 12px;font-size:13px;margin-top:10px;outline:none;box-sizing:border-box;">'+
          '<div style="display:flex;gap:8px;margin-top:14px;">'+
            '<button onclick="CancheroMundial.saveReview(\''+matchId+'\')" style="flex:1;background:var(--accent);color:#000;border:none;border-radius:12px;padding:12px;font-weight:900;font-size:13px;cursor:pointer;"><i class="bx bx-save"></i> GUARDAR</button>'+
            '<button onclick="CancheroMundial.shareReview(\''+matchId+'\')" style="flex:1;background:rgba(255,255,255,0.06);color:#fff;border:1px solid #2a2a2a;border-radius:12px;padding:12px;font-weight:900;font-size:13px;cursor:pointer;"><i class="bx bx-share-alt"></i> COMPARTIR</button>'+
          '</div>'+
          (existing.text?'<button onclick="CancheroMundial.deleteReview(\''+matchId+'\')" style="width:100%;margin-top:8px;background:transparent;color:#ff5555;border:1px solid #2a2a2a;border-radius:12px;padding:10px;font-weight:800;font-size:12px;cursor:pointer;">BORRAR RESEÑA</button>':'')+
        '</div>';
      document.body.appendChild(modal);
    },
    saveReview: function(matchId){
      var t=(document.getElementById('mreview-text')||{}).value||'';
      var mvp=(document.getElementById('mreview-mvp')||{}).value||'';
      var r=parseInt((document.getElementById('mreview-rating')||{}).value||'0')||0;
      _setReview(matchId, {text:t.trim(), mvp:mvp.trim(), rating:r});
      if(window.showToast) showToast('Reseña guardada','success');
      var modal=document.getElementById('mundial-review-modal'); if(modal) modal.remove();
      // refrescar la vista del partido si está abierta
      var open=document.getElementById('mundial-match-view'); if(open){ this.openMatch(matchId); }
    },
    deleteReview: function(matchId){
      if(!confirm('¿Borrar tu reseña?')) return;
      _setReview(matchId, null);
      var modal=document.getElementById('mundial-review-modal'); if(modal) modal.remove();
      if(window.showToast) showToast('Reseña borrada','success');
    },
    shareReview: async function(matchId){
      var ms=await _loadMatches();
      var m=ms.find(function(x){ return String(x.id)===String(matchId); }); if(!m) return;
      var t=(document.getElementById('mreview-text')||{}).value||'';
      var mvp=(document.getElementById('mreview-mvp')||{}).value||'';
      var rating=parseInt((document.getElementById('mreview-rating')||{}).value||'0')||0;
      // Guardar primero
      if(t||mvp||rating) _setReview(matchId, {text:t.trim(), mvp:mvp.trim(), rating:rating});
      var existing=_getReview(matchId)||{};
      var txt = existing.text||t||'';
      var stars = '★'.repeat(existing.rating||rating) + '☆'.repeat(5-(existing.rating||rating||0));
      var head = '⚽ '+m.home+' '+(m.hs!=null?m.hs:'-')+'-'+(m.as!=null?m.as:'-')+' '+m.away;
      var body = 'Mi reseña: '+stars+(existing.mvp||mvp?(' · MVP: '+(existing.mvp||mvp)):'')+'\n\n'+txt;
      var url=(location.origin||'https://canchero.app')+'/?tab=mundial&match='+matchId;
      var full = head+'\n\n'+body+'\n\nMira el partido y reseñas en Canchero.';
      // Ofrecer también publicar al feed de Canchero
      var modal=document.getElementById('mundial-review-modal'); if(modal) modal.remove();
      var pickModal=document.createElement('div');
      pickModal.style.cssText='position:fixed;inset:0;z-index:30100;background:rgba(8,10,8,0.92);display:flex;align-items:center;justify-content:center;padding:18px;';
      pickModal.innerHTML='<div style="background:#0d100d;border:1px solid #1f2a14;border-radius:18px;padding:18px;max-width:380px;width:100%;">'+
        '<div style="font-size:13px;font-weight:900;color:var(--accent);margin-bottom:14px;text-align:center;">¿DÓNDE COMPARTIR?</div>'+
        '<div style="display:flex;flex-direction:column;gap:8px;">'+
          '<button onclick="CancheroMundial._publishReviewToFeed(\''+matchId+'\');this.parentElement.parentElement.parentElement.remove();" style="background:var(--accent);color:#000;border:none;border-radius:12px;padding:12px;font-weight:900;font-size:13px;cursor:pointer;"><i class="bx bx-broadcast"></i> Publicar al feed de Canchero</button>'+
          '<button onclick="CancheroMundial._shareExternal(\''+matchId+'\');this.parentElement.parentElement.parentElement.remove();" style="background:rgba(255,255,255,0.06);color:#fff;border:1px solid #2a2a2a;border-radius:12px;padding:12px;font-weight:900;font-size:13px;cursor:pointer;"><i class="bx bx-share-alt"></i> Compartir fuera (WhatsApp/X/IG…)</button>'+
          '<button onclick="this.parentElement.parentElement.parentElement.remove()" style="background:transparent;color:#888;border:none;padding:8px;font-size:12px;cursor:pointer;">Cancelar</button>'+
        '</div></div>';
      document.body.appendChild(pickModal);
      pickModal._reviewText = full; pickModal._reviewUrl = url;
    },
    _shareExternal: async function(matchId){
      var ms=await _loadMatches(); var m=ms.find(function(x){ return String(x.id)===String(matchId); }); if(!m) return;
      var existing=_getReview(matchId)||{};
      var stars='★'.repeat(existing.rating||0)+'☆'.repeat(5-(existing.rating||0));
      var head='⚽ '+m.home+' '+(m.hs!=null?m.hs:'-')+'-'+(m.as!=null?m.as:'-')+' '+m.away;
      var body='Mi reseña: '+stars+(existing.mvp?(' · MVP: '+existing.mvp):'')+'\n\n'+(existing.text||'');
      var url=(location.origin||'https://canchero.app')+'/?tab=mundial&match='+matchId;
      var full=head+'\n\n'+body+'\n\nVer en Canchero.';
      try{ if(navigator.share){ await navigator.share({title:head, text:full, url:url}); return; } }catch(e){}
      try{ await navigator.clipboard.writeText(full+'\n'+url); if(window.showToast) showToast('Reseña copiada','success'); }catch(e){ alert(full+'\n'+url); }
    },
    _publishReviewToFeed: async function(matchId){
      var ms=await _loadMatches(); var m=ms.find(function(x){ return String(x.id)===String(matchId); }); if(!m) return;
      var existing=_getReview(matchId)||{};
      var stars='★'.repeat(existing.rating||0)+'☆'.repeat(5-(existing.rating||0));
      var head=m.home+' '+(m.hs!=null?m.hs:'-')+'-'+(m.as!=null?m.as:'-')+' '+m.away+' · '+(m.group||'Mundial 2026');
      var content='⚽ '+head+'\n\n'+stars+(existing.mvp?(' · MVP: '+existing.mvp):'')+'\n\n'+(existing.text||'')+'\n\n#Mundial2026 #Canchero';
      var sb=window._sb; var u=window.userData;
      if(!sb||!u){ if(window.showToast) showToast('Iniciá sesión para publicar','warning'); return; }
      try{
        await sb.from('posts').insert({
          user_email: u.email, user_name: u.name||u.email, user_photo: u.photo||'',
          content: content, media_type: 'text'
        });
        if(window.showToast) showToast('Reseña publicada en el feed','success');
      }catch(e){ if(window.showToast) showToast('No se pudo publicar: '+e.message,'error'); }
    }
  };
  function _empty(ic,msg){ return '<div style="text-align:center;padding:40px;color:#666;font-size:13px;"><i class="bx '+ic+'" style="font-size:36px;display:block;margin-bottom:10px;opacity:.4;"></i>'+msg+'</div>'; }
})();
