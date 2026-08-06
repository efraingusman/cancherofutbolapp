/**
 * canchero-trivia.js — Trivia Futbolera (tipo Preguntados)
 * - Preguntas de texto + preguntas con IMAGEN (escudos de img/clubs y banderas de flagcdn).
 * - Dificultad progresiva (1 fácil → 3 difícil), 10 preguntas por partida.
 * - Timer por pregunta, puntaje por acierto + bonus de velocidad + bonus de racha.
 * - Ranking global en Supabase (tabla trivia_scores). Si la tabla no existe, el juego
 *   igual se puede jugar (solo no guarda/lee ranking).
 * Se lanza con window._triviaStart() desde el hub de juegos (canchero-games.js).
 */
(function(){
'use strict';

const ACCENT = '#baff00';
const SB_URL = 'https://dofbxgqzcvfjpnvcvdjb.supabase.co';
const SB_KEY = 'sb_publishable_gPwLXkMHk3HvFz9nm9hgKA_1D0IJBKA';
function sb(){ try { return window._sb || (window.supabase && window.supabase.createClient(SB_URL, SB_KEY)); } catch(e){ return null; } }
function me(){ return window.userData || {}; }
function esc(s){ return window.escH ? window.escH(s) : String(s==null?'':s); }

// ── BANCO DE PREGUNTAS ────────────────────────────────────────────────────────
// img: {t:'crest', v:'boca'}  → usa img/clubs/boca.png
//      {t:'flag',  v:'ar'}    → usa flagcdn (bandera de Argentina)
//      (sin img)              → pregunta de texto
// d: dificultad 1..3
const BANK = [
  // ── Fáciles (1) ──
  { q:'¿En qué país nació Lionel Messi?', o:['Argentina','Brasil','Uruguay','España'], c:0, d:1 },
  { q:'¿De qué club es este escudo?', img:{t:'crest',v:'boca'}, o:['Boca Juniors','River Plate','Racing','Independiente'], c:0, d:1 },
  { q:'¿De qué club es este escudo?', img:{t:'crest',v:'real-madrid'}, o:['Real Madrid','Barcelona','Atlético','Sevilla'], c:0, d:1 },
  { q:'¿Cuántos jugadores tiene un equipo de fútbol 11 en cancha?', o:['11','10','9','12'], c:0, d:1 },
  { q:'¿De qué país es esta bandera?', img:{t:'flag',v:'br'}, o:['Brasil','Portugal','Italia','Colombia'], c:0, d:1 },
  { q:'¿Qué selección ganó el Mundial 2022?', o:['Argentina','Francia','Brasil','Croacia'], c:0, d:1 },
  { q:'¿De qué club es este escudo?', img:{t:'crest',v:'barcelona'}, o:['Barcelona','Real Madrid','Valencia','Villarreal'], c:0, d:1 },
  { q:'¿Con qué número jugó Diego Maradona en la selección?', o:['10','9','7','11'], c:0, d:1 },
  { q:'¿De qué país es esta bandera?', img:{t:'flag',v:'uy'}, o:['Uruguay','Argentina','Grecia','Israel'], c:0, d:1 },
  { q:'¿Cuánto dura un partido reglamentario (sin descuento)?', o:['90 minutos','80 minutos','100 minutos','120 minutos'], c:0, d:1 },
  { q:'¿De qué club es este escudo?', img:{t:'crest',v:'penarol'}, o:['Peñarol','Nacional','Danubio','Defensor'], c:0, d:1 },
  { q:'¿Quién atrapa la pelota con las manos dentro del área?', o:['El arquero','El defensor','El delantero','El capitán'], c:0, d:1 },

  // ── Medias (2) ──
  { q:'¿Qué país ganó el Mundial 1986?', o:['Argentina','Alemania','Brasil','Italia'], c:0, d:2 },
  { q:'¿De qué club es este escudo?', img:{t:'crest',v:'liverpool'}, o:['Liverpool','Everton','Chelsea','Arsenal'], c:0, d:2 },
  { q:'¿En qué club se consagró Ronaldinho campeón de Champions?', o:['Barcelona','Milan','PSG','Real Madrid'], c:0, d:2 },
  { q:'¿De qué país es esta bandera?', img:{t:'flag',v:'hr'}, o:['Croacia','Serbia','Eslovenia','Austria'], c:0, d:2 },
  { q:'¿Quién ganó el Balón de Oro 2022?', o:['Karim Benzema','Messi','Mbappé','Haaland'], c:0, d:2 },
  { q:'¿De qué club es este escudo?', img:{t:'crest',v:'juventus'}, o:['Juventus','Inter','Milan','Roma'], c:0, d:2 },
  { q:'¿Cuántas Copas del Mundo ganó Brasil?', o:['5','4','6','3'], c:0, d:2 },
  { q:'¿En qué estadio juega Boca Juniors de local?', o:['La Bombonera','El Monumental','El Cilindro','La Doble Visera'], c:0, d:2 },
  { q:'¿De qué país es esta bandera?', img:{t:'flag',v:'pt'}, o:['Portugal','España','Italia','México'], c:0, d:2 },
  { q:'¿Qué club es conocido como "Los Diablos Rojos" de Manchester?', o:['Manchester United','Manchester City','Liverpool','Arsenal'], c:0, d:2 },
  { q:'¿De qué club es este escudo?', img:{t:'crest',v:'nacional'}, o:['Nacional (UY)','Peñarol','River','Boca'], c:0, d:2 },
  { q:'¿Quién dirigió a la selección argentina campeona en 2022?', o:['Lionel Scaloni','Diego Simeone','Marcelo Bielsa','Jorge Sampaoli'], c:0, d:2 },

  // ── Difíciles (3) ──
  { q:'¿Qué jugador tiene más Balones de Oro en la historia?', o:['Lionel Messi','Cristiano Ronaldo','Michel Platini','Johan Cruyff'], c:0, d:3 },
  { q:'¿De qué club es este escudo?', img:{t:'crest',v:'ajax'}, o:['Ajax','PSV','Feyenoord','Anderlecht'], c:0, d:3 },
  { q:'¿En qué año se jugó el primer Mundial?', o:['1930','1926','1934','1928'], c:0, d:3 },
  { q:'¿Qué país fue sede del primer Mundial?', o:['Uruguay','Brasil','Italia','Argentina'], c:0, d:3 },
  { q:'¿De qué país es esta bandera?', img:{t:'flag',v:'ma'}, o:['Marruecos','Túnez','Turquía','Argelia'], c:0, d:3 },
  { q:'¿Quién marcó "La Mano de Dios"?', o:['Diego Maradona','Pelé','Jorge Valdano','Mario Kempes'], c:0, d:3 },
  { q:'¿De qué club es este escudo?', img:{t:'crest',v:'dortmund'}, o:['Borussia Dortmund','Bayern','Schalke','Leipzig'], c:0, d:3 },
  { q:'¿Qué arquero ganó el premio al mejor del Mundial 2022?', o:['Emiliano Martínez','Hugo Lloris','Bono','Thibaut Courtois'], c:0, d:3 },
  { q:'¿Cuántos Mundiales ganó Uruguay?', o:['2','1','3','0'], c:0, d:3 },
  { q:'¿De qué club es este escudo?', img:{t:'crest',v:'napoli'}, o:['Napoli','Roma','Lazio','Fiorentina'], c:0, d:3 },
  { q:'¿Qué jugador es apodado "El Fenómeno"?', o:['Ronaldo Nazário','Ronaldinho','Rivaldo','Romário'], c:0, d:3 },
  { q:'¿En qué club debutó Cristiano Ronaldo como profesional?', o:['Sporting Lisboa','Benfica','Porto','Manchester United'], c:0, d:3 }
];

function imgHtml(img){
  if (!img) return '';
  let src = '';
  if (img.t === 'crest') src = 'img/clubs/' + img.v + '.png';
  else if (img.t === 'flag') src = 'https://flagcdn.com/w320/' + img.v + '.png';
  if (!src) return '';
  return `<div style="display:flex;justify-content:center;margin:2px 0 14px;">
    <div style="width:120px;height:120px;background:#0d0d0d;border:1px solid #222;border-radius:16px;display:flex;align-items:center;justify-content:center;overflow:hidden;">
      <img src="${src}" alt="" style="max-width:86%;max-height:86%;object-fit:contain;" onerror="this.parentElement.innerHTML='<i class=\\'bx bx-help-circle\\' style=\\'font-size:52px;color:#333;\\'></i>'">
    </div></div>`;
}

// Baraja e arma una partida: 10 preguntas ordenadas por dificultad creciente.
function armarPartida(){
  const byD = { 1:[], 2:[], 3:[] };
  BANK.forEach(q => { (byD[q.d]||byD[1]).push(q); });
  const pick = (arr, n) => arr.slice().sort(()=>Math.random()-0.5).slice(0, n);
  const set = [...pick(byD[1],4), ...pick(byD[2],3), ...pick(byD[3],3)];
  // Barajar opciones de cada pregunta manteniendo la correcta.
  return set.map(q => {
    const idxs = q.o.map((_,i)=>i).sort(()=>Math.random()-0.5);
    return { q:q.q, img:q.img, d:q.d, o:idxs.map(i=>q.o[i]), c:idxs.indexOf(q.c) };
  });
}

let S = null; // estado de la partida

function _overlay(){
  let m = document.getElementById('trivia-modal'); if (m) m.remove();
  m = document.createElement('div'); m.id = 'trivia-modal';
  m.style.cssText = "position:fixed;inset:0;z-index:100060;background:linear-gradient(rgba(7,7,7,0.72),rgba(7,7,7,0.88)),url('img/games-bg/trivia.webp') center/cover no-repeat;overflow-y:auto;-webkit-overflow-scrolling:touch;";
  document.body.appendChild(m);
  return m;
}

// ── INTRO ─────────────────────────────────────────────────────────────────────
window._triviaStart = async function(){
  const m = _overlay();
  const best = await bestScore();
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:26px 20px calc(30px + env(safe-area-inset-bottom));display:flex;flex-direction:column;align-items:center;text-align:center;min-height:100%;">
    <div style="width:100%;display:flex;justify-content:flex-start;">
      <button class="cg-back" onclick="document.getElementById('trivia-modal').remove();window.openGamesModal&&window.openGamesModal()"><i class='bx bx-arrow-back'></i> Juegos</button>
    </div>
    <div style="width:96px;height:96px;border-radius:24px;background:rgba(186,255,0,.1);border:1px solid rgba(186,255,0,.3);display:flex;align-items:center;justify-content:center;margin:18px 0 14px;"><i class='bx bx-brain' style="font-size:52px;color:${ACCENT};"></i></div>
    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:28px;color:#fff;">TRIVIA FUTBOLERA</div>
    <div style="font-size:14px;color:#9aa0a6;margin-top:6px;max-width:340px;line-height:1.5;">10 preguntas, dificultad creciente. Escudos, banderas y datos. Contestá rápido para más puntos.</div>
    <div style="display:flex;gap:10px;margin-top:20px;">
      <div style="background:rgba(255,255,255,.04);border:1px solid #1e1e1e;border-radius:14px;padding:12px 20px;"><div style="font-size:10px;color:#666;font-weight:800;letter-spacing:1px;">TU RÉCORD</div><div style="font-size:22px;font-weight:900;color:${ACCENT};">${best!=null?best:'—'}</div></div>
      <div style="background:rgba(255,255,255,.04);border:1px solid #1e1e1e;border-radius:14px;padding:12px 20px;"><div style="font-size:10px;color:#666;font-weight:800;letter-spacing:1px;">TU NIVEL</div><div style="font-size:22px;font-weight:900;color:#fff;">${nivelDe(best||0)}</div></div>
    </div>
    <button onclick="window._triviaPlay()" style="width:100%;max-width:340px;margin-top:26px;background:linear-gradient(135deg,#16a34a,${ACCENT});color:#000;border:none;border-radius:15px;padding:16px;font-family:Outfit,sans-serif;font-weight:900;font-size:16px;cursor:pointer;box-shadow:0 8px 26px rgba(80,220,110,.3);"><i class='bx bx-play-circle'></i> JUGAR</button>
    <button onclick="window._triviaRanking()" style="width:100%;max-width:340px;margin-top:10px;background:rgba(255,255,255,.05);color:#fff;border:1px solid #242424;border-radius:15px;padding:13px;font-weight:800;font-size:14px;cursor:pointer;"><i class='bx bx-trophy' style="color:${ACCENT};"></i> Ranking</button>
  </div>`;
};

function nivelDe(score){
  if (score >= 1300) return 'Crack';
  if (score >= 900) return 'Pro';
  if (score >= 500) return 'Amateur';
  return 'Novato';
}

// ── PARTIDA ───────────────────────────────────────────────────────────────────
window._triviaPlay = function(){
  S = { qs: armarPartida(), i:0, score:0, aciertos:0, streak:0, timer:null, tLeft:15 };
  render();
};

function render(){
  const m = document.getElementById('trivia-modal') || _overlay();
  const q = S.qs[S.i];
  const prog = Math.round((S.i)/S.qs.length*100);
  const dColor = q.d===1?'#4ade80':q.d===2?'#ffcc00':'#ff6b6b';
  const dTxt = q.d===1?'FÁCIL':q.d===2?'MEDIA':'DIFÍCIL';
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:22px 18px calc(24px + env(safe-area-inset-bottom));min-height:100%;display:flex;flex-direction:column;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <button onclick="window._triviaQuit()" style="background:rgba(255,255,255,.06);border:none;color:#aaa;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">&times;</button>
      <div style="flex:1;height:8px;border-radius:5px;background:rgba(255,255,255,.08);overflow:hidden;"><div style="height:100%;width:${prog}%;background:linear-gradient(90deg,#16a34a,${ACCENT});transition:width .3s;"></div></div>
      <span style="font-size:12px;font-weight:900;color:#fff;">${S.i+1}/${S.qs.length}</span>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <span style="font-size:10px;font-weight:900;letter-spacing:1px;color:${dColor};background:${dColor}1a;border:1px solid ${dColor}44;border-radius:7px;padding:3px 10px;">${dTxt}</span>
      <div id="trivia-timer" style="display:flex;align-items:center;gap:6px;font-weight:900;font-size:15px;color:${ACCENT};"><i class='bx bx-time-five'></i> <span id="trivia-tnum">15</span>s</div>
    </div>
    ${imgHtml(q.img)}
    <div style="font-family:Outfit,sans-serif;font-weight:800;font-size:19px;color:#fff;line-height:1.3;margin-bottom:18px;text-align:center;">${esc(q.q)}</div>
    <div id="trivia-opts" style="display:flex;flex-direction:column;gap:10px;">
      ${q.o.map((op,i)=>`<button class="trivia-opt" data-i="${i}" onclick="window._triviaAnswer(${i})" style="background:rgba(255,255,255,.04);border:1.5px solid #242424;border-radius:14px;padding:14px 16px;color:#fff;font-size:15px;font-weight:700;text-align:left;cursor:pointer;transition:.12s;display:flex;align-items:center;gap:12px;">
        <span style="width:26px;height:26px;flex-shrink:0;border-radius:8px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;color:#9aa0a6;">${String.fromCharCode(65+i)}</span>${esc(op)}</button>`).join('')}
    </div>
    <div style="flex:1;"></div>
    <div style="text-align:center;margin-top:16px;font-size:12px;color:#666;">Puntaje: <b style="color:${ACCENT};">${S.score}</b>${S.streak>1?` · 🔥 ${S.streak} seguidas`:''}</div>
  </div>`;
  startTimer();
}

function startTimer(){
  S.tLeft = 15;
  clearInterval(S.timer);
  const num = document.getElementById('trivia-tnum');
  S.timer = setInterval(()=>{
    S.tLeft--;
    if (num) num.textContent = S.tLeft;
    if (S.tLeft <= 5) { const t=document.getElementById('trivia-timer'); if(t) t.style.color='#ff6b6b'; }
    if (S.tLeft <= 0) { clearInterval(S.timer); window._triviaAnswer(-1); }
  }, 1000);
}

window._triviaAnswer = function(sel){
  if (!S || S.locked) return;
  S.locked = true;
  clearInterval(S.timer);
  const q = S.qs[S.i];
  const ok = sel === q.c;
  // Puntaje: 100 base + bonus de velocidad (hasta 50) + bonus de racha.
  if (ok){
    const speed = Math.max(0, Math.round(S.tLeft/15*50));
    S.streak++;
    const streakBonus = (S.streak-1)*10;
    S.score += 100 + speed + streakBonus;
    S.aciertos++;
  } else {
    S.streak = 0;
  }
  // Pintar opciones: correcta verde, elegida incorrecta roja.
  document.querySelectorAll('.trivia-opt').forEach(b=>{
    const i = parseInt(b.dataset.i);
    b.onclick = null; b.style.cursor='default';
    if (i === q.c){ b.style.background='rgba(74,222,128,.15)'; b.style.borderColor='#4ade80'; b.style.color='#4ade80'; }
    else if (i === sel){ b.style.background='rgba(255,107,107,.15)'; b.style.borderColor='#ff6b6b'; b.style.color='#ff6b6b'; }
    else { b.style.opacity='.5'; }
  });
  setTimeout(()=>{
    S.locked = false;
    S.i++;
    if (S.i >= S.qs.length) finish();
    else render();
  }, ok ? 750 : 1400);
};

window._triviaQuit = function(){
  clearInterval(S && S.timer);
  if (confirm('¿Salir de la partida? Perdés el progreso.')) window._triviaStart();
};

async function finish(){
  clearInterval(S.timer);
  const score = S.score, aciertos = S.aciertos, total = S.qs.length;
  const prevBest = await bestScore();
  const record = score > (prevBest||0);
  if (record) await saveScore(score);
  const m = document.getElementById('trivia-modal') || _overlay();
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:32px 20px calc(30px + env(safe-area-inset-bottom));display:flex;flex-direction:column;align-items:center;text-align:center;min-height:100%;">
    <div style="width:88px;height:88px;border-radius:50%;background:rgba(186,255,0,.12);border:1px solid rgba(186,255,0,.35);display:flex;align-items:center;justify-content:center;margin-bottom:14px;"><i class='bx ${record?'bx-crown':'bx-check-circle'}' style="font-size:46px;color:${ACCENT};"></i></div>
    ${record?`<div style="font-size:12px;font-weight:900;letter-spacing:2px;color:${ACCENT};margin-bottom:4px;">¡NUEVO RÉCORD!</div>`:''}
    <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:52px;color:${ACCENT};line-height:1;">${score}</div>
    <div style="font-size:13px;color:#9aa0a6;margin-top:4px;">puntos · ${aciertos}/${total} correctas · Nivel ${nivelDe(score)}</div>
    <div style="width:100%;max-width:340px;margin-top:28px;">
      <button onclick="window._triviaPlay()" style="width:100%;background:linear-gradient(135deg,#16a34a,${ACCENT});color:#000;border:none;border-radius:15px;padding:15px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;"><i class='bx bx-revision'></i> JUGAR DE NUEVO</button>
      <button onclick="window._triviaRanking()" style="width:100%;margin-top:9px;background:rgba(255,255,255,.05);color:#fff;border:1px solid #242424;border-radius:15px;padding:13px;font-weight:800;font-size:14px;cursor:pointer;"><i class='bx bx-trophy' style="color:${ACCENT};"></i> Ver ranking</button>
      <button onclick="document.getElementById('trivia-modal').remove();window.openGamesModal&&window.openGamesModal()" style="width:100%;margin-top:9px;background:transparent;color:#888;border:none;padding:11px;font-weight:800;font-size:13px;cursor:pointer;">Volver a Juegos</button>
    </div>
  </div>`;
}

// ── RANKING ───────────────────────────────────────────────────────────────────
window._triviaRanking = async function(){
  const m = document.getElementById('trivia-modal') || _overlay();
  m.innerHTML = `<div style="max-width:520px;margin:0 auto;padding:24px 18px;text-align:center;color:#666;"><i class='bx bx-loader-alt bx-spin' style="font-size:30px;color:${ACCENT};"></i></div>`;
  const rows = await topScores();
  const podio = rows.slice(0,3), resto = rows.slice(3,20);
  const myEmail = (me().email||'').toLowerCase();
  const P = (r,pos)=>{
    if(!r) return `<div style="flex:1;"></div>`;
    const h = pos===1?128:pos===2?100:84;
    const col = pos===1?'#ffd54a':pos===2?'#cfd8dc':'#e08e5a';
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;">
      <div style="font-size:12px;font-weight:800;color:#fff;max-width:92px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:5px;">${esc(r.name||'—')}</div>
      <div style="font-size:15px;font-weight:900;color:${ACCENT};margin-bottom:4px;">${r.score}</div>
      <div style="width:100%;max-width:92px;height:${h}px;background:linear-gradient(180deg,${col}30,${col}12);border:1px solid ${col}55;border-top:3px solid ${col};border-radius:10px 10px 0 0;display:flex;align-items:flex-start;justify-content:center;padding-top:8px;font-family:Outfit,sans-serif;font-weight:900;font-size:24px;color:${col};">${pos}</div>
    </div>`;
  };
  m.innerHTML = `
  <div style="max-width:520px;margin:0 auto;padding:22px 18px calc(30px + env(safe-area-inset-bottom));min-height:100%;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
      <button onclick="window._triviaStart()" style="background:rgba(255,255,255,.06);border:none;color:#aaa;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;"><i class='bx bx-arrow-back'></i></button>
      <div style="font-family:Outfit,sans-serif;font-weight:900;font-size:20px;color:#fff;">Ranking Trivia</div>
    </div>
    ${rows.length ? `<div style="display:flex;align-items:flex-end;gap:8px;margin-bottom:18px;">${P(podio[1],2)}${P(podio[0],1)}${P(podio[2],3)}</div>` : `<div style="text-align:center;padding:40px 20px;color:#666;"><i class='bx bx-trophy' style="font-size:44px;opacity:.3;display:block;margin-bottom:10px;"></i>Todavía no hay puntajes. ¡Sé el primero!</div>`}
    ${resto.map((r,idx)=>`<div style="display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:12px;margin-bottom:6px;background:${(r.email||'').toLowerCase()===myEmail?'rgba(186,255,0,.06)':'rgba(255,255,255,.02)'};">
        <span style="width:22px;font-weight:900;color:#888;font-size:13px;">${idx+4}</span>
        <span style="flex:1;font-size:13px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(r.name||'—')}</span>
        <span style="font-size:14px;font-weight:900;color:${ACCENT};">${r.score}</span>
      </div>`).join('')}
    <button onclick="window._triviaPlay()" style="width:100%;margin-top:16px;background:linear-gradient(135deg,#16a34a,${ACCENT});color:#000;border:none;border-radius:15px;padding:14px;font-family:Outfit,sans-serif;font-weight:900;font-size:15px;cursor:pointer;"><i class='bx bx-play-circle'></i> JUGAR</button>
  </div>`;
};

// ── PERSISTENCIA (Supabase) ───────────────────────────────────────────────────
async function bestScore(){
  try {
    const c = sb(); const u = me(); if (!c || !u.email) return null;
    const { data } = await c.from('trivia_scores').select('score').eq('email', u.email).order('score',{ascending:false}).limit(1);
    return (data && data[0]) ? data[0].score : null;
  } catch(e){ return null; }
}
async function saveScore(score){
  try {
    const c = sb(); const u = me(); if (!c || !u.email) return;
    // upsert: guardamos el MEJOR puntaje del usuario (una fila por email).
    await c.from('trivia_scores').upsert({ email:u.email, name:(u.name||u.email.split('@')[0]), score, updated_at:new Date().toISOString() }, { onConflict:'email' });
  } catch(e){ console.warn('trivia saveScore:', e); }
}
async function topScores(){
  try {
    const c = sb(); if (!c) return [];
    const { data } = await c.from('trivia_scores').select('name,email,score').order('score',{ascending:false}).limit(20);
    return data || [];
  } catch(e){ return []; }
}

console.log('[canchero-trivia] cargado');
})();
