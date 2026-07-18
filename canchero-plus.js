// ════════════════════════════════════════════════════════════════════════════
// CANCHERO+ ENHANCEMENT MODULE
// Inspirado en Futez/Letterboxd para fútbol + auto-expiry + safety + audio/video
// ════════════════════════════════════════════════════════════════════════════
(function(){
'use strict';

// Usar siempre el cliente Supabase compartido (ya autenticado) — nunca crear uno nuevo
function getSb(){ return window._sb || window.supabaseClient || null; }
function me(){ return window.userData || JSON.parse(localStorage.getItem('canchero_user')||'null'); }

// Pretty relative time
window.timeAgoFull = function(when){
  if(!when) return '';
  var t = typeof when==='number'? when : new Date(when).getTime();
  var s = Math.floor((Date.now()-t)/1000);
  if(s<60) return 'hace ' + Math.max(1,s) + 's';
  var m = Math.floor(s/60);
  if(m<60) return 'hace ' + m + 'min';
  var h = Math.floor(m/60);
  if(h<24) return 'hace ' + h + 'h';
  var d = Math.floor(h/24);
  if(d<7) return 'hace ' + d + 'd';
  return new Date(t).toLocaleDateString('es-UY',{day:'numeric',month:'short'});
};

// ─── CONTENT MODERATION ────────────────────────────────────────────────────
var BLOCKLIST = [
  'puta','puto','pendejo','idiota','mierda','culiao','hdp','hijo de puta','la concha','sorete',
  'sexo','sexual','porno','xxx','desnud','tetas','pene','vagina','masturb','onlyfans',
  'matar','asesinar','te mato','te voy a matar','muerte','suicid','violar','violencia',
  'cocaina','marihuana','vender drogas',
  'negro de mierda','sudaca','indio de mierda'
];
var moderation = {
  checkText: function(text){
    if(!text) return { ok:true };
    var t = String(text).toLowerCase();
    for(var i=0;i<BLOCKLIST.length;i++){
      if(t.indexOf(BLOCKLIST[i])>-1) return { ok:false, reason:'Contenido inapropiado detectado' };
    }
    if(text.length>500 && /(.)\1{15,}/.test(text)) return { ok:false, reason:'Spam detectado' };
    return { ok:true };
  },
  checkImage: function(file){
    if(!file) return {ok:true};
    if(file.size === 0) return {ok:false, reason:'Archivo inválido'};
    if(file.size > 50*1024*1024) return {ok:false, reason:'Archivo muy grande (max 50MB)'};
    return {ok:true};
  }
};
window.moderation = moderation;

// ─── AUTO-EXPIRY + PIN ─────────────────────────────────────────────────────
window.cancheroPlus = window.cancheroPlus || {};
window.cancheroPlus.PIN_DEFAULT_HOURS = 10;

async function togglePin(postId, currentPinned){
  var sb = getSb(); if(!sb) return;
  var u = me(); if(!u) { window.showToast && showToast('Iniciá sesión','warning'); return; }
  var newPinned = !currentPinned;
  var update = newPinned
    ? { pinned: true, expires_at: null }
    : { pinned: false, expires_at: new Date(Date.now()+10*3600*1000).toISOString() };
  var r = await sb.from('posts').update(update).eq('id', postId).eq('user_email', u.email);
  if(r.error){ window.showToast && showToast('Error: '+r.error.message,'error'); return; }
  window.showToast && showToast(newPinned?'📌 Publicación fijada':'Desfijada (expira en 10h)','success');
  try { window.social && window.social.loadFeed && window.social.loadFeed('amigos-feed'); } catch(e){}
}
window.cancheroPlus.togglePin = togglePin;

window.cancheroPlus.filterExpired = function(items){
  if(!items) return items;
  var now = Date.now();
  return items.filter(function(it){
    return !it.expires_at || it.pinned || new Date(it.expires_at).getTime() > now;
  });
};

// ─── FUTEZ-STYLE PREDICTIONS ───────────────────────────────────────────────
var futez = {
  listUpcomingMatches: async function(){
    var sb = getSb(); if(!sb) return [];
    var now = new Date().toISOString();
    var r = await sb.from('matches').select('*').gte('match_at', now).order('match_at',{ascending:true}).limit(20);
    return r.data || [];
  },
  listRecentMatches: async function(){
    var sb = getSb(); if(!sb) return [];
    var now = new Date().toISOString();
    var r = await sb.from('matches').select('*').lt('match_at', now).order('match_at',{ascending:false}).limit(20);
    return r.data || [];
  },
  submitPrediction: async function(matchId, homeScore, awayScore){
    var sb = getSb(); var u = me();
    if(!sb || !u){ window.showToast && showToast('Iniciá sesión','warning'); return; }
    var r = await sb.from('predictions').upsert({
      match_id: matchId, user_email: u.email, user_name: u.name,
      home_score: parseInt(homeScore)||0, away_score: parseInt(awayScore)||0,
      created_at: new Date().toISOString()
    }, { onConflict: 'match_id,user_email' });
    if(r.error){ window.showToast && showToast('Error: '+r.error.message,'error'); return; }
    window.showToast && showToast('✅ Predicción guardada','success');
  },
  submitReview: async function(matchId, stars, reviewText){
    var sb = getSb(); var u = me();
    if(!sb || !u){ window.showToast && showToast('Iniciá sesión','warning'); return; }
    var check = moderation.checkText(reviewText);
    if(!check.ok){ window.showToast && showToast(check.reason,'error'); return; }
    var r = await sb.from('match_reviews').upsert({
      match_id: matchId, user_email: u.email, user_name: u.name,
      stars: parseInt(stars)||0, review: reviewText || null,
      created_at: new Date().toISOString()
    }, { onConflict: 'match_id,user_email' });
    if(r.error){ window.showToast && showToast('Error: '+r.error.message,'error'); return; }
    window.showToast && showToast('⭐ Reseña publicada','success');
    futez.renderReviewsFeed();
  },
  loadReviews: async function(matchId){
    var sb = getSb(); if(!sb) return [];
    var r = await sb.from('match_reviews').select('*').eq('match_id', matchId).order('created_at',{ascending:false}).limit(50);
    return r.data || [];
  },
  leaderboard: async function(){
    var sb = getSb(); if(!sb) return [];
    var m = await sb.from('matches').select('id,final_home_score,final_away_score').not('final_home_score','is',null);
    if(!m.data || !m.data.length) return [];
    var p = await sb.from('predictions').select('*').in('match_id', m.data.map(function(x){return x.id;}));
    var scores = {};
    (p.data||[]).forEach(function(pr){
      var match = m.data.find(function(x){return x.id===pr.match_id;});
      if(!match) return;
      var pts = 0;
      if(pr.home_score===match.final_home_score && pr.away_score===match.final_away_score) pts = 5;
      else if(Math.sign(pr.home_score-pr.away_score)===Math.sign(match.final_home_score-match.final_away_score)) pts = 2;
      if(!scores[pr.user_email]) scores[pr.user_email]={name:pr.user_name,points:0};
      scores[pr.user_email].points += pts;
    });
    return Object.entries(scores).map(function(e){return{email:e[0],name:e[1].name,points:e[1].points};})
      .sort(function(a,b){return b.points-a.points;}).slice(0,20);
  },
  renderMatchCard: function(m){
    var date = m.match_at ? new Date(m.match_at) : null;
    var dateStr = date ? date.toLocaleDateString('es-UY',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
    var past = date && date.getTime() < Date.now();
    var topBar = '<div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#baff00,transparent);"></div>';
    var scoreArea = past
      ? '<div style="font-size:26px;font-weight:900;color:#baff00;">'+(m.final_home_score!=null?m.final_home_score:'-')+' : '+(m.final_away_score!=null?m.final_away_score:'-')+'</div>'
      : '<div style="display:flex;gap:6px;align-items:center;">'+
          '<input type="number" id="ftz-h-'+m.id+'" min="0" max="20" placeholder="0" style="width:44px;height:44px;background:#000;border:2px solid #baff00;color:#baff00;text-align:center;border-radius:8px;font-size:20px;font-weight:900;outline:none;">'+
          '<span style="color:#555;font-weight:900;">:</span>'+
          '<input type="number" id="ftz-a-'+m.id+'" min="0" max="20" placeholder="0" style="width:44px;height:44px;background:#000;border:2px solid #baff00;color:#baff00;text-align:center;border-radius:8px;font-size:20px;font-weight:900;outline:none;">'+
        '</div>';
    var bottom = past
      ? '<div style="border-top:1px solid #1f221f;padding-top:12px;">'+
          '<div style="font-size:10px;color:#888;margin-bottom:8px;letter-spacing:1px;">CALIFICÁ Y RESEÑÁ</div>'+
          '<div id="ftz-stars-'+m.id+'" style="display:flex;gap:4px;margin-bottom:10px;">'+
            [1,2,3,4,5].map(function(n){return '<i class="bx bxs-star" data-star="'+n+'" onclick="cancheroPlus._selectStar(\''+m.id+'\','+n+')" style="cursor:pointer;font-size:22px;color:#333;"></i>';}).join('')+
          '</div>'+
          '<textarea id="ftz-review-'+m.id+'" placeholder="¿Cómo estuvo el partido?" style="width:100%;background:#0a0a0a;border:1px solid #222;border-radius:10px;color:#fff;padding:10px 12px;font-size:12px;outline:none;resize:vertical;min-height:60px;font-family:inherit;"></textarea>'+
          '<div style="display:flex;gap:8px;margin-top:10px;">'+
            '<button onclick="cancheroPlus._submitReview(\''+m.id+'\')" style="flex:1;background:#baff00;color:#000;border:none;padding:10px;border-radius:10px;font-weight:900;font-size:11px;letter-spacing:1px;cursor:pointer;">PUBLICAR</button>'+
            '<button onclick="cancheroPlus._showReviews(\''+m.id+'\')" style="background:transparent;border:1px solid #333;color:#aaa;padding:10px 14px;border-radius:10px;font-weight:700;font-size:11px;cursor:pointer;">VER RESEÑAS</button>'+
          '</div></div>'
      : '<button onclick="cancheroPlus._submitPrediction(\''+m.id+'\')" style="width:100%;background:#baff00;color:#000;border:none;padding:11px;border-radius:10px;font-weight:900;font-size:11px;letter-spacing:1px;cursor:pointer;">GUARDAR PREDICCIÓN</button>';
    return '<div class="futez-card" data-match-id="'+m.id+'" style="background:linear-gradient(145deg,#0a0a0a,#151715);border:1px solid #1f221f;border-radius:16px;padding:18px;margin-bottom:14px;position:relative;overflow:hidden;">'+
      topBar+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'+
        '<div style="font-size:10px;color:#baff00;font-weight:800;letter-spacing:2px;">'+(past?'⚽ FINALIZADO':'⏳ PRÓXIMO')+'</div>'+
        '<div style="font-size:10px;color:#888;">'+dateStr+'</div>'+
      '</div>'+
      '<div style="display:flex;justify-content:space-around;align-items:center;margin-bottom:14px;">'+
        '<div style="text-align:center;flex:1;"><div style="font-size:13px;font-weight:900;color:#fff;">'+(m.home_team||'Local')+'</div></div>'+
        '<div style="text-align:center;padding:0 14px;">'+scoreArea+'</div>'+
        '<div style="text-align:center;flex:1;"><div style="font-size:13px;font-weight:900;color:#fff;">'+(m.away_team||'Visitante')+'</div></div>'+
      '</div>'+
      bottom+
    '</div>';
  },
  renderReviewsFeed: async function(containerId){
    containerId = containerId || 'futez-reviews-feed';
    var sb = getSb(); var cont = document.getElementById(containerId);
    if(!cont || !sb) return;
    var r = await sb.from('match_reviews').select('*').not('review','is',null).order('created_at',{ascending:false}).limit(30);
    var reviews = r.data || [];
    if(!reviews.length){ cont.innerHTML='<div style="text-align:center;color:#666;padding:30px;font-size:12px;">Sin reseñas aún.</div>'; return; }
    cont.innerHTML = reviews.map(function(r){
      var stars = [1,2,3,4,5].map(function(n){return '<i class="bx '+(n<=r.stars?'bxs-star':'bx-star')+'" style="color:'+(n<=r.stars?'#baff00':'#333')+';font-size:14px;"></i>';}).join('');
      return '<div style="background:#0d100d;border:1px solid #1f221f;border-radius:14px;padding:14px;margin-bottom:10px;">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'+
          '<div style="font-size:12px;font-weight:800;color:#fff;">'+(r.user_name||'Jugador')+'</div>'+
          '<div style="font-size:10px;color:#666;">'+window.timeAgoFull(r.created_at)+'</div>'+
        '</div>'+
        '<div style="margin-bottom:8px;">'+stars+'</div>'+
        '<div style="font-size:13px;color:#ccc;line-height:1.5;">'+(r.review||'')+'</div>'+
      '</div>';
    }).join('');
  },
  renderLeaderboard: async function(containerId){
    containerId = containerId || 'futez-leaderboard';
    var cont = document.getElementById(containerId);
    if(!cont) return;
    var lb = await futez.leaderboard();
    if(!lb.length){ cont.innerHTML='<div style="text-align:center;color:#666;padding:20px;font-size:12px;">Ranking se actualiza cuando se carguen resultados.</div>'; return; }
    cont.innerHTML = '<div style="display:flex;flex-direction:column;gap:6px;">'+lb.map(function(u,i){
      var color = i===0?'#baff00':i===1?'#bbb':i===2?'#cd7f32':'#666';
      return '<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:'+(i<3?'rgba(186,255,0,0.06)':'#0d100d')+';border:1px solid '+(i<3?'rgba(186,255,0,0.2)':'#1f221f')+';border-radius:10px;">'+
        '<div style="font-weight:900;color:'+color+';font-size:14px;width:24px;">#'+(i+1)+'</div>'+
        '<div style="flex:1;font-size:13px;font-weight:700;color:#fff;">'+(u.name||'Anónimo')+'</div>'+
        '<div style="font-size:14px;font-weight:900;color:#baff00;">'+u.points+' pts</div>'+
      '</div>';
    }).join('')+'</div>';
  }
};
window.futez = futez;

var _selectedStars = {};
window.cancheroPlus._selectStar = function(matchId, n){
  _selectedStars[matchId] = n;
  document.querySelectorAll('#ftz-stars-'+matchId+' [data-star]').forEach(function(el){
    var s = parseInt(el.getAttribute('data-star'));
    el.style.color = s<=n ? '#baff00' : '#333';
  });
};
window.cancheroPlus._submitPrediction = function(matchId){
  var h = document.getElementById('ftz-h-'+matchId);
  var a = document.getElementById('ftz-a-'+matchId);
  futez.submitPrediction(matchId, h?h.value:0, a?a.value:0);
};
window.cancheroPlus._submitReview = function(matchId){
  var stars = _selectedStars[matchId] || 0;
  if(!stars){ window.showToast && showToast('Elegí una calificación (1-5⭐)','warning'); return; }
  var t = document.getElementById('ftz-review-'+matchId);
  futez.submitReview(matchId, stars, t?t.value.trim():'');
};
window.cancheroPlus._showReviews = async function(matchId){
  var reviews = await futez.loadReviews(matchId);
  var modal = document.createElement('div');
  modal.style.cssText='position:fixed;inset:0;z-index:9600;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;padding:18px;';
  var reviewsHtml = reviews.length ? reviews.map(function(r){
    var stars = [1,2,3,4,5].map(function(n){return '<i class="bx '+(n<=r.stars?'bxs-star':'bx-star')+'" style="color:'+(n<=r.stars?'#baff00':'#333')+';font-size:13px;"></i>';}).join('');
    return '<div style="background:#0d100d;border:1px solid #1f221f;border-radius:12px;padding:12px;margin-bottom:8px;">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">'+
        '<div style="font-size:12px;font-weight:800;color:#fff;">'+(r.user_name||'Jugador')+'</div>'+
        '<div style="font-size:10px;color:#666;">'+window.timeAgoFull(r.created_at)+'</div>'+
      '</div>'+
      '<div style="margin-bottom:6px;">'+stars+'</div>'+
      '<div style="font-size:12px;color:#ccc;line-height:1.5;">'+(r.review||'')+'</div>'+
    '</div>';
  }).join('') : '<div style="text-align:center;color:#666;padding:30px;">Sin reseñas todavía.</div>';
  modal.innerHTML='<div style="background:#0f110f;border:1px solid #1e201e;border-radius:16px;width:100%;max-width:460px;max-height:80vh;display:flex;flex-direction:column;">'+
    '<div style="padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #1e201e;">'+
      '<div style="font-weight:900;color:#fff;">RESEÑAS DEL PARTIDO</div>'+
      '<button onclick="this.closest(\'div[style*=fixed]\').remove()" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;">&times;</button>'+
    '</div>'+
    '<div style="padding:16px 20px;overflow-y:auto;">'+reviewsHtml+'</div>'+
  '</div>';
  modal.onclick = function(e){ if(e.target===modal) modal.remove(); };
  document.body.appendChild(modal);
};

// ─── AUDIO MESSAGES ────────────────────────────────────────────────────────
var audioRec = {
  rec: null, chunks: [], stream: null, startedAt: 0,
  start: async function(){
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      window.showToast && showToast('Tu navegador no soporta audio','error'); return false;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({audio:true});
      this.chunks = [];
      this.rec = new MediaRecorder(this.stream);
      var self = this;
      this.rec.ondataavailable = function(e){ if(e.data.size>0) self.chunks.push(e.data); };
      this.rec.start();
      this.startedAt = Date.now();
      return true;
    } catch(e){ window.showToast && showToast('Permiso de micrófono denegado','error'); return false; }
  },
  stop: function(){
    var self = this;
    return new Promise(function(resolve){
      if(!self.rec){ resolve(null); return; }
      self.rec.onstop = function(){
        var blob = new Blob(self.chunks,{type:'audio/webm'});
        self.stream && self.stream.getTracks().forEach(function(t){t.stop();});
        self.rec = null; self.stream = null;
        resolve({blob: blob, duration: Math.round((Date.now()-self.startedAt)/1000)});
      };
      self.rec.stop();
    });
  },
  cancel: function(){
    if(this.rec){ try{ this.rec.stop(); }catch(e){} }
    if(this.stream) this.stream.getTracks().forEach(function(t){t.stop();});
    this.rec = null; this.stream = null; this.chunks = [];
  },
  sendToChat: async function(partnerEmail){
    var result = await this.stop();
    if(!result) return;
    var sb = getSb(); var u = me();
    if(!sb || !u) return;
    var path = 'audio/'+Date.now()+'_'+u.email.replace('@','_')+'.webm';
    var up = await sb.storage.from('media').upload(path, result.blob);
    if(up.error){ window.showToast && showToast('Error subiendo audio','error'); return; }
    var url = sb.storage.from('media').getPublicUrl(path).data.publicUrl;
    await sb.from('messages').insert({
      sender_email: u.email, sender_name: u.name,
      recipient_email: partnerEmail,
      content: '🎤 Audio ('+result.duration+'s)',
      media_url: url, media_type: 'audio',
      created_at: new Date().toISOString()
    });
    window.showToast && showToast('Audio enviado','success');
  }
};
window.audioRec = audioRec;

// ─── VIDEO CALLS (Jitsi Meet) ──────────────────────────────────────────────
var videoCall = {
  open: function(roomName, peerName){
    var r = roomName || ('canchero-'+Math.random().toString(36).slice(2,10));
    var u = me();
    var display = (u && u.name) || 'Invitado';
    var existing = document.getElementById('vc-modal');
    if(existing) existing.remove();
    var modal = document.createElement('div');
    modal.id = 'vc-modal';
    modal.style.cssText='position:fixed;inset:0;z-index:99998;background:#000;display:flex;flex-direction:column;';
    modal.innerHTML=
      '<div style="background:#0a0a0a;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #1a1a1a;">'+
        '<div style="font-size:12px;font-weight:800;color:#baff00;">📹 VIDEOLLAMADA '+(peerName?'con '+peerName:'')+'</div>'+
        '<button onclick="document.getElementById(\'vc-modal\').remove()" style="background:#ff4444;color:#fff;border:none;padding:6px 14px;border-radius:6px;font-weight:800;font-size:11px;cursor:pointer;">FINALIZAR</button>'+
      '</div>'+
      '<iframe allow="camera; microphone; fullscreen; display-capture; autoplay" '+
              'src="https://meet.jit.si/'+encodeURIComponent(r)+'#userInfo.displayName=%22'+encodeURIComponent(display)+'%22" '+
              'style="flex:1;width:100%;border:0;background:#000;"></iframe>';
    document.body.appendChild(modal);
    return r;
  },
  inviteToCall: function(partnerEmail, partnerName){
    var u = me();
    var roomName = 'canchero-'+((u&&u.email)||'x').split('@')[0]+'-'+Date.now();
    var sb = getSb();
    if(sb && u){
      sb.from('messages').insert({
        sender_email: u.email, sender_name: u.name,
        recipient_email: partnerEmail,
        content: '📹 Te invitó a una videollamada → https://meet.jit.si/'+encodeURIComponent(roomName),
        media_type: 'video-call', created_at: new Date().toISOString()
      });
    }
    this.open(roomName, partnerName);
  }
};
window.videoCall = videoCall;

// ─── INJECT FUTEZ TAB INTO DASHBOARD PREDICTIONS SECTION ───────────────────
function injectFutezTab(){
  document.querySelectorAll('[id$="-predicciones"]').forEach(function(cont){
    // Saltar si ya está dentro del Match Center (#jugador-mundo-futbol), que tiene sus propios tabs
    if(cont.closest('#jugador-mundo-futbol')) return;
    // Saltar si es un botón (mctab-predicciones)
    if(cont.tagName === 'BUTTON') return;
    if(cont._futezInjected) return;
    cont._futezInjected = true;
    var wrap = document.createElement('div');
    wrap.style.marginTop='6px';
    wrap.innerHTML=
        '<div style="display:flex;gap:10px;margin-bottom:16px;">'+
          '<button onclick="cancheroPlus._showTab(\'upcoming\',this)" class="ftz-tab active" style="flex:1;background:#baff00;color:#000;border:none;padding:11px;border-radius:10px;font-weight:800;font-size:12px;letter-spacing:0.5px;cursor:pointer;">PRÓXIMOS</button>'+
          '<button onclick="cancheroPlus._showTab(\'recent\',this)" class="ftz-tab" style="flex:1;background:transparent;color:#fff;border:1px solid #333;padding:11px;border-radius:10px;font-weight:800;font-size:12px;letter-spacing:0.5px;cursor:pointer;">FINALIZADOS</button>'+
        '</div>'+
        '<div id="ftz-content"></div>';
    cont.appendChild(wrap);
    window.cancheroPlus._showTab('upcoming', wrap.querySelector('.ftz-tab.active'));
  });
}
window.cancheroPlus._showTab = async function(which, btnEl){
  document.querySelectorAll('.ftz-tab').forEach(function(b){
    b.classList.remove('active');
    b.style.background='transparent'; b.style.color='#fff'; b.style.border='1px solid #333';
  });
  if(btnEl){ btnEl.classList.add('active'); btnEl.style.background='#baff00'; btnEl.style.color='#000'; btnEl.style.border='none'; }
  var cont = document.getElementById('ftz-content'); if(!cont) return;
  cont.innerHTML='<div style="text-align:center;padding:24px;color:#555;"><i class="bx bx-loader-alt bx-spin"></i></div>';
  if(which==='upcoming'){
    var ms = await futez.listUpcomingMatches();
    cont.innerHTML = ms.length ? ms.map(function(m){return futez.renderMatchCard(m);}).join('') : '<div style="text-align:center;padding:24px;color:#666;font-size:12px;">No hay partidos próximos.</div>';
  } else if(which==='recent'){
    var ms2 = await futez.listRecentMatches();
    cont.innerHTML = ms2.length ? ms2.map(function(m){return futez.renderMatchCard(m);}).join('') : '<div style="text-align:center;padding:24px;color:#666;font-size:12px;">No hay partidos recientes.</div>';
  } else if(which==='reviews'){
    cont.innerHTML='<div id="futez-reviews-feed"></div>';
    futez.renderReviewsFeed('futez-reviews-feed');
  } else if(which==='rank'){
    cont.innerHTML='<div id="futez-leaderboard"></div>';
    futez.renderLeaderboard('futez-leaderboard');
  }
};

document.addEventListener('DOMContentLoaded', function(){
  setTimeout(injectFutezTab, 800);
  setInterval(injectFutezTab, 3000);
});

console.log('✅ Canchero+ módulo cargado');
})();
