/* ══════════════════════════════════════════════════════════════
   CANCHERO — Encuesta MVP (validación de producto)
   Mide: público, dolores, qué resuelve la app, disposición a usar/pagar,
   feedback post-uso, NPS. Respuestas en Supabase (tabla mvp_survey).
   Solo el dueño puede ver resultados (RLS + encuesta-admin.html).
══════════════════════════════════════════════════════════════ */
(function(){
  // Preguntas (compartidas con el panel admin)
  window.MVP_SURVEY_QUESTIONS = [
    { id:'edad', type:'single', q:'¿Qué edad tenés?', opts:['Menos de 18','18–24','25–34','35–44','45 o más'] },
    { id:'frecuencia', type:'single', q:'¿Con qué frecuencia jugás al fútbol?', opts:['Varias veces por semana','1 vez por semana','1–2 veces al mes','Casi nunca','No juego pero me interesa'] },
    { id:'rol', type:'single', q:'¿Cómo te definís?', opts:['Jugador','Organizo los partidos','Tengo/manejo un club','Dueño de complejo','Tienda/profesional del fútbol','Solo miro fútbol'] },
    { id:'dolor', type:'multi', q:'¿Qué es lo MÁS difícil al organizar o jugar un partido? (elegí los que apliquen)', opts:['Juntar la gente','Encontrar cancha disponible','Coordinar día/horario','Que no falten a último momento','Cobrar y dividir el pago','Saber el nivel de cada uno','Nada, me resulta fácil'] },
    { id:'como_organiza', type:'single', q:'¿Cómo organizás los partidos hoy?', opts:['Grupo de WhatsApp','Llamadas/mensajes sueltos','En persona','No organizo, me invitan','Otra forma'] },
    { id:'se_cae', type:'single', q:'¿Cuántas veces se te cayó un partido por falta de jugadores?', opts:['Nunca','A veces','Seguido','Casi siempre'] },
    { id:'deseos', type:'multi', q:'¿Qué te gustaría poder hacer en una app de fútbol? (varias)', opts:['Encontrar jugadores cerca','Reservar canchas','Armar/encontrar equipos','Ver mis estadísticas','Jugar torneos','Seguir el Mundial','Red social de fútbol (subir jugadas, reels)','Retos/juegos con amigos'] },
    { id:'usaria', type:'single', q:'¿Usarías una app que junte jugadores, canchas y partidos en un solo lugar?', opts:['Sí, ya mismo','Tal vez','No'] },
    { id:'pagaria', type:'single', q:'¿Pagarías por una versión premium?', opts:['No, solo gratis','Hasta $100/mes','$100–300/mes','Más de $300/mes','Solo si me ahorra tiempo/plata'] },
    { id:'impresion', type:'single', q:'Después de probar Canchero, ¿qué te pareció?', opts:['Me encantó','Buena pero le falta','Interesante pero confusa','No la entendí'] },
    { id:'nps', type:'nps', q:'Del 0 al 10, ¿qué tan probable es que recomiendes Canchero a un amigo?' },
    { id:'gusto', type:'text', q:'¿Qué función te gustó MÁS? ¿Por qué?' },
    { id:'falta', type:'text', q:'¿Qué le falta o qué cambiarías? (tu dolor principal)' },
    { id:'libre', type:'text', q:'Cualquier idea, comentario o crítica que quieras dejar:' }
  ];

  function sb(){ return window._sb || window.supabaseClient; }
  function _esc(s){ return (s||'').toString().replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  window.CancheroEncuesta = {
    open: function(){
      if (document.getElementById('mvp-survey-modal')) return;
      const Q = window.MVP_SURVEY_QUESTIONS;
      const m = document.createElement('div');
      m.id = 'mvp-survey-modal';
      m.style.cssText = 'position:fixed;inset:0;z-index:30000;background:rgba(6,9,7,0.96);backdrop-filter:blur(10px);overflow-y:auto;-webkit-overflow-scrolling:touch;';
      const qHtml = Q.map(function(item, i){
        let input='';
        if (item.type==='single' || item.type==='multi'){
          input = '<div style="display:flex;flex-direction:column;gap:7px;">'+item.opts.map(function(o){
            const t = item.type==='single'?'radio':'checkbox';
            return '<label style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.04);border:1px solid #1e1e1e;border-radius:12px;padding:11px 13px;cursor:pointer;font-size:13px;color:#ddd;"><input type="'+t+'" name="q_'+item.id+'" value="'+_esc(o)+'" style="width:17px;height:17px;accent-color:var(--accent);flex-shrink:0;"> '+_esc(o)+'</label>';
          }).join('')+'</div>';
        } else if (item.type==='nps'){
          input = '<div style="display:flex;flex-wrap:wrap;gap:6px;">'+Array.from({length:11},function(_,n){ return '<label style="cursor:pointer;"><input type="radio" name="q_'+item.id+'" value="'+n+'" style="display:none;" onchange="document.querySelectorAll(\'#nps-row label\').forEach(function(l){l.style.background=\'rgba(255,255,255,0.04)\';l.style.color=\'#aaa\';});this.parentElement.style.background=\'var(--accent)\';this.parentElement.style.color=\'#000\';"><span style="display:inline-flex;width:36px;height:36px;align-items:center;justify-content:center;background:rgba(255,255,255,0.04);border:1px solid #2a2a2a;border-radius:10px;font-weight:800;font-size:13px;color:#aaa;">'+n+'</span></label>'; }).join('')+'</div><div style="display:flex;justify-content:space-between;font-size:10px;color:#666;margin-top:4px;"><span>Nada probable</span><span>Muy probable</span></div>';
          input = input.replace('display:flex;flex-wrap:wrap;gap:6px;','display:flex;flex-wrap:wrap;gap:6px;" id="nps-row');
        } else {
          input = '<textarea name="q_'+item.id+'" rows="3" placeholder="Escribí tu respuesta..." style="width:100%;background:rgba(255,255,255,0.04);border:1px solid #2a2a2a;border-radius:12px;padding:11px;color:#fff;font-size:13px;outline:none;resize:vertical;box-sizing:border-box;font-family:inherit;"></textarea>';
        }
        return '<div style="margin-bottom:22px;"><div style="font-size:14px;font-weight:800;color:#fff;margin-bottom:10px;"><span style="color:var(--accent);">'+(i+1)+'.</span> '+_esc(item.q)+(item.type==='multi'?' <span style="font-size:10px;color:#666;font-weight:400;">(podés elegir varias)</span>':'')+'</div>'+input+'</div>';
      }).join('');
      m.innerHTML =
        '<div style="position:sticky;top:0;display:flex;align-items:center;gap:10px;padding:14px 16px;background:rgba(6,9,7,0.9);backdrop-filter:blur(8px);border-bottom:1px solid #161616;z-index:2;">'+
          '<button onclick="document.getElementById(\'mvp-survey-modal\').remove()" style="background:rgba(255,255,255,0.08);border:none;color:#fff;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer;"><i class="bx bx-x"></i></button>'+
          '<div><div style="font-weight:900;font-size:15px;">Ayudanos a mejorar Canchero</div><div style="font-size:11px;color:#777;">2 minutos · tu opinión cuenta</div></div>'+
        '</div>'+
        '<div style="max-width:560px;margin:0 auto;padding:20px 18px 40px;">'+
          '<div style="background:linear-gradient(135deg,rgba(186,255,0,0.1),transparent);border:1px solid rgba(186,255,0,0.2);border-radius:14px;padding:14px;margin-bottom:22px;font-size:13px;color:#cde;">Estamos construyendo la mejor app de fútbol de Uruguay. Contanos cómo jugás y qué necesitás — nos ayuda muchísimo. 🟢</div>'+
          '<form id="mvp-survey-form">'+qHtml+
          '<button type="button" onclick="CancheroEncuesta.submit()" id="mvp-survey-submit" style="width:100%;background:var(--accent);color:#000;border:none;border-radius:14px;padding:15px;font-weight:900;font-size:15px;cursor:pointer;margin-top:8px;">ENVIAR RESPUESTAS</button>'+
          '<div style="text-align:center;font-size:10px;color:#555;margin-top:10px;">Tus respuestas son anónimas para otros usuarios.</div>'+
          '</form>'+
        '</div>';
      document.body.appendChild(m);
    },

    submit: async function(){
      const form = document.getElementById('mvp-survey-form'); if(!form) return;
      const Q = window.MVP_SURVEY_QUESTIONS;
      const answers = {};
      Q.forEach(function(item){
        if (item.type==='multi'){
          const vals = Array.from(form.querySelectorAll('input[name="q_'+item.id+'"]:checked')).map(function(c){return c.value;});
          if (vals.length) answers[item.id] = vals;
        } else if (item.type==='single' || item.type==='nps'){
          const sel = form.querySelector('input[name="q_'+item.id+'"]:checked');
          if (sel) answers[item.id] = item.type==='nps' ? parseInt(sel.value) : sel.value;
        } else {
          const ta = form.querySelector('textarea[name="q_'+item.id+'"]');
          if (ta && ta.value.trim()) answers[item.id] = ta.value.trim();
        }
      });
      if (Object.keys(answers).length < 3){ if(window.showToast) showToast('Respondé al menos unas preguntas 🙂','warning'); return; }
      const btn = document.getElementById('mvp-survey-submit'); if(btn){ btn.disabled=true; btn.textContent='Enviando...'; }
      try {
        const _sb = sb(); const me = window.userData || {};
        const { error } = await _sb.from('mvp_survey').insert({ user_email: me.email || null, answers: answers });
        if (error) throw error;
        try { localStorage.setItem('mvp_survey_done','1'); } catch(e){}
        const modal = document.getElementById('mvp-survey-modal');
        if (modal) modal.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:30px;"><i class="bx bx-check-circle" style="font-size:64px;color:var(--accent);"></i><div style="font-size:20px;font-weight:900;margin-top:14px;">¡Gracias!</div><div style="font-size:13px;color:#888;margin-top:6px;max-width:300px;">Tu opinión nos ayuda a hacer Canchero mejor para todos.</div><button onclick="document.getElementById(\'mvp-survey-modal\').remove()" style="margin-top:22px;background:var(--accent);color:#000;border:none;border-radius:12px;padding:12px 28px;font-weight:900;cursor:pointer;">Cerrar</button></div>';
      } catch(e){
        if(window.showToast) showToast('Error: '+(e.message||'no se pudo enviar'),'error');
        if(btn){ btn.disabled=false; btn.textContent='ENVIAR RESPUESTAS'; }
      }
    },

    // Banner dismissable en el feed (se muestra si no respondió ni lo cerró)
    maybeShowBanner: function(containerId){
      try { if (localStorage.getItem('mvp_survey_done') || localStorage.getItem('mvp_survey_hide')) return; } catch(e){}
      const cont = document.getElementById(containerId||'main-feed-container'); if(!cont || document.getElementById('mvp-survey-banner')) return;
      const b = document.createElement('div');
      b.id = 'mvp-survey-banner';
      b.style.cssText = 'background:linear-gradient(135deg,rgba(186,255,0,0.14),rgba(186,255,0,0.03));border:1px solid rgba(186,255,0,0.3);border-radius:16px;padding:14px 16px;margin:0 0 14px;display:flex;align-items:center;gap:12px;';
      b.innerHTML = '<i class="bx bx-bar-chart-alt-2" style="font-size:26px;color:var(--accent);flex-shrink:0;"></i>'+
        '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:800;color:#fff;">¿Nos ayudás a mejorar Canchero?</div><div style="font-size:11px;color:#9ab;">Respondé 2 minutos. Tu opinión cuenta.</div></div>'+
        '<button onclick="CancheroEncuesta.open()" style="background:var(--accent);color:#000;border:none;border-radius:10px;padding:9px 14px;font-size:12px;font-weight:900;cursor:pointer;flex-shrink:0;">Responder</button>'+
        '<button onclick="try{localStorage.setItem(\'mvp_survey_hide\',\'1\')}catch(e){};document.getElementById(\'mvp-survey-banner\').remove()" style="background:none;border:none;color:#667;font-size:20px;cursor:pointer;flex-shrink:0;">&times;</button>';
      // Insertar al FINAL del feed (no al inicio) para que no empuje hacia abajo
      // el contenido que el usuario ya está viendo (causaba el "salta y se desordena").
      cont.appendChild(b);
    }
  };
})();
