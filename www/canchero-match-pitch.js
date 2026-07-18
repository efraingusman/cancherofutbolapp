/**
 * canchero-match-pitch.js — Cancha visual del partido (reutilizable)
 * - Dos canchas conmutables (LOCAL / VISITANTE) con escudos si hay club.
 * - Slots por formato (5v5 / 7v7 / 11v11): ocupado = jugador (cinta si capitán),
 *   libre = "+ Jugar acá" (abre solicitud pre-cargada con equipo+posición).
 * - Fila de 3 suplentes por equipo.
 */
(function(){
'use strict';
function sb(){ return window._sb; }
function me(){ return window.userData || null; }
function toast(m,t){ if(window.showToast) showToast(m,t); }

/* Formaciones: catálogo central en canchero-formations.js (CancheroFormations) */
function fmtOf(m){
  if (window.CancheroFormations && CancheroFormations.formatOf) return CancheroFormations.formatOf(m);
  const f=(m.format||m.match_type||'').toString(); if(f.includes('5'))return '5v5'; if(f.includes('7'))return '7v7'; return '11v11';
}
function slotsOf(m){
  const CF = window.CancheroFormations;
  if (CF) return CF.slotsFor(fmtOf(m), m.formation || null);
  // fallback mínimo si el módulo no cargó
  return [ {k:'ARQ',x:50,y:88},{k:'DEF',x:50,y:66},{k:'MED',x:28,y:44},{k:'MED',x:72,y:44},{k:'DEL',x:50,y:20} ];
}

/* Estado del partido derivado */
function matchPhase(m){
  // Si el partido es claramente a futuro (y no fue iniciado), SIEMPRE es próximo,
  // aunque tenga status/finished_at o goles cargados en pruebas. Así la lista
  // "Mis Partidos" y el panel coinciden (no más "próximo que abre finalizado").
  const _sched = m.scheduled_at ? new Date(m.scheduled_at).getTime() : 0;
  if (!m.started_at && _sched > Date.now()) return 'proximo';
  if (m.status==='jugado' || m.finished_at) return 'jugado';
  const start = m.started_at ? new Date(m.started_at) : (m.scheduled_at ? new Date(m.scheduled_at) : null);
  const dur = (m.duration_minutes || m.duration || 60) * 60000;
  if (m.status==='en_juego' || (start && Date.now() >= start && Date.now() < +start + dur + 2*3600000 && (m.started_at || Date.now() < +start + dur))) {
    if (start && Date.now() > +start + dur) return 'jugado';
    if (start && Date.now() >= start) return 'en_juego';
  }
  return 'proximo';
}

function avatarMini(p){
  const init=(p.player_name||'?')[0].toUpperCase();
  let photo = p.player_photo || p.player_avatar || p.photo || p.avatar || '';
  // Recorte a la cara (Cloudinary g_face) — antes mostraba el torso por background-position:center
  if (photo && window.avatarUrl) photo = window.avatarUrl(photo, 42);
  const ring = p.is_captain?'var(--accent)':'rgba(255,255,255,0.3)';
  const inner = photo
    ? `background-image:url('${photo}');background-size:cover;background-position:center 28%;`
    : `background:${p.is_captain?'var(--accent)':'#1d2a1d'};display:flex;align-items:center;justify-content:center;color:${p.is_captain?'#000':'#fff'};font-weight:900;font-size:15px;`;
  return `<div style="width:42px;height:42px;margin:0 auto;border-radius:50%;border:2px solid ${ring};${inner}position:relative;">${photo?'':init}${p.is_captain?'<span style="position:absolute;bottom:-4px;right:-4px;background:#FFD700;color:#000;font-size:8px;font-weight:900;border-radius:6px;padding:1px 4px;border:1.5px solid #0a0a0a;">C</span>':''}</div>`;
}

const CancheroPitch = {
  /* render(containerEl, match, players, opts{ canJoin, onJoin(team,slotKey), onTapPlayer(p) }) */
  render(el, match, players, opts){
    opts = opts || {};
    const fmt = fmtOf(match);
    const slots = slotsOf(match);
    const team = el.dataset.team || 'home';
    const teamPlayers = (players||[]).filter(p => (p.team||'home') === team && !p.is_sub && ['confirmado','accepted','aceptado','titular'].includes(p.status||'confirmado'));
    const subs = (players||[]).filter(p => (p.team||'home') === team && p.is_sub);
    // Asignación por posición natural (un DC nunca cae al arco ni a la defensa)
    let slotPlayer;
    if (window.CancheroFormations) {
      slotPlayer = CancheroFormations.assign(teamPlayers, slots);
    } else {
      const used = new Set();
      slotPlayer = slots.map((s)=>{
        let p = teamPlayers.find(x=>!used.has(x.id) && (x.position||'').toUpperCase().startsWith(s.k.slice(0,3)));
        if (p) used.add(p.id);
        return p || null;
      });
    }
    const phase = matchPhase(match);
    const joinable = opts.canJoin && phase==='proximo' && match.scheduled_at && (new Date(match.scheduled_at)-Date.now()) > 20*60000;
    const homeName = match.home_club_name || match.home_team || 'Local';
    const awayName = match.away_club_name || match.away_team || 'Visitante';
    const logo = (url,name)=> url ? `<img src="${url}" style="width:18px;height:18px;object-fit:contain;">` : `<i class='bx bxs-shield' style="font-size:15px;"></i>`;

    el.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <button onclick="this.closest('[data-pitch]').dataset.team='home';CancheroPitch.rerender(this.closest('[data-pitch]'))" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px;border-radius:12px;border:1px solid ${team==='home'?'var(--accent)':'#2a2a2a'};background:${team==='home'?'rgba(186,255,0,0.1)':'transparent'};color:${team==='home'?'var(--accent)':'#888'};font-weight:800;font-size:12px;cursor:pointer;font-family:inherit;">${logo(match.home_club_logo,homeName)} ${homeName}</button>
        <button onclick="this.closest('[data-pitch]').dataset.team='away';CancheroPitch.rerender(this.closest('[data-pitch]'))" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px;border-radius:12px;border:1px solid ${team==='away'?'#64b4ff':'#2a2a2a'};background:${team==='away'?'rgba(100,180,255,0.1)':'transparent'};color:${team==='away'?'#64b4ff':'#888'};font-weight:800;font-size:12px;cursor:pointer;font-family:inherit;">${logo(match.away_club_logo,awayName)} ${awayName}</button>
      </div>
      ${(opts.canManage && window.CancheroFormations) ? `<div style="display:flex;gap:6px;margin-bottom:8px;justify-content:center;flex-wrap:wrap;">
        ${CancheroFormations.formationsFor(fmt).map(f=>`<button onclick="CancheroPitch._setFormation('${f}')" style="background:${(match.formation||CancheroFormations.defaultFormation(fmt))===f?'rgba(186,255,0,0.14)':'transparent'};border:1px solid ${(match.formation||CancheroFormations.defaultFormation(fmt))===f?'var(--accent)':'#2a2a2a'};color:${(match.formation||CancheroFormations.defaultFormation(fmt))===f?'var(--accent)':'#777'};border-radius:20px;padding:4px 11px;font-size:10px;font-weight:800;cursor:pointer;font-family:inherit;">${f}</button>`).join('')}
      </div>`:''}
      <div style="position:relative;width:100%;aspect-ratio:3/4;max-width:420px;margin:0 auto;background:repeating-linear-gradient(180deg,#0d2c15 0 12%,#0b2712 12% 24%);border:2px solid #1f3a1f;border-radius:16px;overflow:hidden;">
        <div style="position:absolute;top:0;left:15%;right:15%;height:14%;border:2px solid rgba(255,255,255,0.18);border-top:none;"></div>
        <div style="position:absolute;bottom:0;left:15%;right:15%;height:14%;border:2px solid rgba(255,255,255,0.18);border-bottom:none;"></div>
        <div style="position:absolute;top:50%;left:0;right:0;height:2px;background:rgba(255,255,255,0.18);"></div>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:72px;height:72px;border:2px solid rgba(255,255,255,0.18);border-radius:50%;"></div>
        ${slots.map((s,i)=>{
          const p = slotPlayer[i];
          if (p) return `<div onclick='${opts.onTapPlayer?`CancheroPitch._tapP("${p.id}")`:''}' style="position:absolute;left:${s.x}%;top:${s.y}%;transform:translate(-50%,-50%);width:62px;text-align:center;cursor:${opts.onTapPlayer?'pointer':'default'};">
              ${avatarMini(p)}
              <div style="font-size:9px;color:#fff;font-weight:800;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 3px #000;">${(p.player_name||'').split(' ')[0]}</div>
              <div style="font-size:8px;color:#9c9;font-weight:700;">${p.position_slot||p.position||s.k}</div>
            </div>`;
          return `<div ${joinable?`onclick="CancheroPitch._join('${team}','${s.k}',${i})"`:''} style="position:absolute;left:${s.x}%;top:${s.y}%;transform:translate(-50%,-50%);width:62px;text-align:center;cursor:${joinable?'pointer':'default'};opacity:${joinable?'1':'0.55'};">
              <div style="width:42px;height:42px;margin:0 auto;border-radius:50%;background:rgba(255,255,255,0.06);border:2px dashed ${joinable?'var(--accent)':'rgba(255,255,255,0.25)'};display:flex;align-items:center;justify-content:center;color:${joinable?'var(--accent)':'#888'};font-weight:900;font-size:${joinable?'20px':'12px'};">${joinable?'+':s.k}</div>
              <div style="font-size:8.5px;color:${joinable?'var(--accent)':'#888'};font-weight:800;margin-top:3px;">${joinable?'JUGAR ACÁ':s.k}</div>
            </div>`;
        }).join('')}
      </div>
      <div style="max-width:420px;margin:10px auto 0;">
        <div style="font-size:9px;color:#888;font-weight:900;letter-spacing:1.5px;margin-bottom:6px;">SUPLENTES (3)</div>
        <div style="display:flex;gap:10px;">
          ${[0,1,2].map(i=>{ const p=subs[i];
            if (p) return `<div onclick='CancheroPitch._tapP("${p.id}")' style="flex:1;text-align:center;background:#111;border:1px solid #1e1e1e;border-radius:12px;padding:8px 4px;cursor:pointer;">${avatarMini(p)}<div style="font-size:9px;color:#ccc;font-weight:700;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${(p.player_name||'').split(' ')[0]}</div><div style="font-size:8px;color:#777;font-weight:700;margin-top:2px;">Tocar para cambiar</div></div>`;
            return `<div ${joinable?`onclick="CancheroPitch._join('${team}','SUP',${i})"`:''} style="flex:1;text-align:center;background:rgba(255,255,255,0.02);border:1px dashed #2a2a2a;border-radius:12px;padding:8px 4px;cursor:${joinable?'pointer':'default'};"><div style="width:42px;height:42px;margin:0 auto;border-radius:50%;border:2px dashed ${joinable?'var(--accent)':'#333'};display:flex;align-items:center;justify-content:center;color:${joinable?'var(--accent)':'#555'};font-size:18px;">${joinable?'+':'·'}</div><div style="font-size:8.5px;color:#666;font-weight:700;margin-top:3px;">${joinable?'SUPLENTE':'Libre'}</div></div>`;
          }).join('')}
        </div>
      </div>`;
    el._match = match; el._players = players; el._opts = opts;
  },
  rerender(el){ if (el && el._match) CancheroPitch.render(el, el._match, el._players, el._opts); },
  _join(team, slotKey, idx){
    const el = document.querySelector('[data-pitch]');
    const opts = el && el._opts;
    if (opts && typeof opts.onJoin === 'function') opts.onJoin(team, slotKey, idx);
  },
  /* Cambiar la formación (solo capitán/creador — botón visible con opts.canManage) */
  async _setFormation(f){
    const el = document.querySelector('[data-pitch]');
    if (!el || !el._match) return;
    el._match.formation = f;
    CancheroPitch.rerender(el);
    try { const c = sb(); if (c && el._match.id) await c.from('matches').update({ formation: f }).eq('id', el._match.id); } catch(e){}
  },
  _tapP(pid){
    const el = document.querySelector('[data-pitch]');
    const opts = el && el._opts;
    const p = (el && el._players || []).find(x=>String(x.id)===String(pid));
    if (opts && typeof opts.onTapPlayer === 'function' && p) opts.onTapPlayer(p);
    else if (p) CancheroPitch.changePosition(p);
  },
  /* Cambiar la posición de un jugador en la cancha o intercambiar con otro/suplente.
     Solo el dueño o capitán. */
  changePosition(p){
    const el = document.querySelector('[data-pitch]');
    if (!el || !el._match || !p) return;
    const m = el._match, players = el._players || [];
    const u = me(); const meE = u && u.email;
    const isCap = meE && (m.created_by===meE || m.captain_home_email===meE || m.captain_away_email===meE ||
      players.some(x=>x.player_email===meE && x.is_captain));
    if (!(p.player_email===meE || isCap)){ toast('Solo el capitán puede mover a otros jugadores.','info'); return; }
    const team = p.team || 'home';
    const slots = slotsOf(m);
    const mates = players.filter(x => (x.team||'home')===team && !x.is_sub && String(x.id)!==String(p.id) &&
      ['confirmado','accepted','aceptado','titular'].includes(x.status||'confirmado'));
    const taken = window.CancheroFormations ? CancheroFormations.assign(mates, slots) : slots.map(()=>null);
    const subs = players.filter(x => (x.team||'home')===team && x.is_sub && String(x.id)!==String(p.id));
    let mm = document.getElementById('pitch-pos-modal'); if (mm) mm.remove();
    mm = document.createElement('div'); mm.id='pitch-pos-modal';
    mm.style.cssText='position:fixed;inset:0;z-index:100050;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:16px;';
    var slotsHtml = slots.map((sl,i)=>{
      const occ = taken[i];
      const free = !occ;
      // Slot libre → mover ahí; ocupado → INTERCAMBIAR con el otro jugador (también capitán puede)
      const handler = free
        ? ("CancheroPitch._applyPos('"+p.id+"','"+sl.k+"',"+i+",false)")
        : (isCap ? ("CancheroPitch._swap('"+p.id+"','"+occ.id+"')") : '');
      const clickable = free || (isCap && occ);
      return '<button '+(clickable?('onclick="'+handler+'"'):'disabled')
        + ' style="background:'+(free?'rgba(186,255,0,0.07)':'rgba(100,180,255,0.06)')+';border:1px solid '+(free?'rgba(186,255,0,0.35)':(clickable?'rgba(100,180,255,0.3)':'#222'))+';border-radius:12px;padding:10px 6px;cursor:'+(clickable?'pointer':'default')+';color:'+(free?'var(--accent)':(clickable?'#64b4ff':'#555'))+';font-weight:800;font-size:12px;font-family:inherit;">'
        + sl.k+' '+(i+1)
        + '<div style="font-size:9px;font-weight:700;color:'+(free?'#8a8':(clickable?'#aaa':'#444'))+';margin-top:3px;">'+(free?'LIBRE':(clickable?'↔ '+((occ.player_name||'').split(' ')[0]):(occ.player_name||'').split(' ')[0]))+'</div></button>';
    }).join('');
    var subsHtml = subs.map(function(s){
      return '<button onclick="CancheroPitch._swap(\''+p.id+'\',\''+s.id+'\')" style="background:rgba(255,170,0,0.07);border:1px solid rgba(255,170,0,0.35);border-radius:12px;padding:10px 6px;cursor:pointer;color:#ffaa00;font-weight:800;font-size:12px;font-family:inherit;">↔ '+((s.player_name||'').split(' ')[0])+'<div style="font-size:9px;font-weight:700;color:#a86;margin-top:3px;">BANCO</div></button>';
    }).join('');
    mm.innerHTML = '<div style="background:#111;border:1px solid #232323;border-radius:18px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto;padding:18px 16px;">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
      +   '<div><div style="font-weight:900;font-size:14px;color:#fff;">'+( (p.player_name||'jugador').split(' ')[0] )+'</div><div style="font-size:11px;color:#888;">Elegí posición o intercambio</div></div>'
      +   '<button onclick="document.getElementById(\'pitch-pos-modal\').remove()" style="background:rgba(255,255,255,0.08);border:none;color:#fff;width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer;">&times;</button>'
      + '</div>'
      + '<div style="font-size:10px;font-weight:800;color:#888;letter-spacing:1px;margin-bottom:8px;">POSICIONES EN LA CANCHA</div>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;">' + slotsHtml + '</div>'
      + '<div style="font-size:10px;font-weight:800;color:#888;letter-spacing:1px;margin:14px 0 8px;">BANCO / SUPLENTES</div>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;">'
      +   '<button onclick="CancheroPitch._applyPos(\''+p.id+'\',\'SUP\',0,true)" style="background:rgba(255,170,0,0.07);border:1px solid rgba(255,170,0,0.35);border-radius:12px;padding:10px 6px;cursor:pointer;color:#ffaa00;font-weight:800;font-size:12px;font-family:inherit;">'
      +     (p.is_sub?'YA EN BANCO':'MOVER AL BANCO')+'<div style="font-size:9px;font-weight:700;color:#a86;margin-top:3px;">SUPLENTE</div></button>'
      +   subsHtml
      + '</div></div>';
    mm.onclick = function(ev){ if (ev.target===mm) mm.remove(); };
    document.body.appendChild(mm);
  },
  async _applyPos(pid, line, idx, isSub){
    const mod = document.getElementById('pitch-pos-modal'); if (mod) mod.remove();
    const el = document.querySelector('[data-pitch]');
    if (!el || !el._match) return;
    const p = (el._players||[]).find(x=>String(x.id)===String(pid));
    if (!p) return;
    const slotKey = isSub ? null : (line + idx);
    p.position_slot = slotKey; p.position = isSub ? (p.position||'SUP') : line; p.is_sub = !!isSub;
    CancheroPitch.rerender(el);
    try {
      const c = sb();
      if (c) await c.from('match_players').update({ position_slot: slotKey, position: isSub?(p.position||'MED'):line, is_sub: !!isSub }).eq('id', p.id);
      toast(isSub ? 'Movido al banco de suplentes.' : 'Posición actualizada: '+line+'.', 'success');
    } catch(e){ toast('No se pudo guardar la posición.','error'); }
  },
  /* Intercambia dos jugadores (sus posiciones + is_sub) — sirve titular↔titular y titular↔suplente */
  async _swap(pid1, pid2){
    const mod = document.getElementById('pitch-pos-modal'); if (mod) mod.remove();
    const el = document.querySelector('[data-pitch]');
    if (!el || !el._match) return;
    const players = el._players || [];
    const a = players.find(x=>String(x.id)===String(pid1));
    const b = players.find(x=>String(x.id)===String(pid2));
    if (!a || !b) return;
    // Intercambiar atributos locales
    const tmp = { position_slot:a.position_slot, position:a.position, is_sub:!!a.is_sub };
    a.position_slot = b.position_slot; a.position = b.position; a.is_sub = !!b.is_sub;
    b.position_slot = tmp.position_slot; b.position = tmp.position; b.is_sub = tmp.is_sub;
    CancheroPitch.rerender(el);
    try {
      const c = sb();
      if (c) {
        await c.from('match_players').update({ position_slot: a.position_slot, position: a.position, is_sub: a.is_sub }).eq('id', a.id);
        await c.from('match_players').update({ position_slot: b.position_slot, position: b.position, is_sub: b.is_sub }).eq('id', b.id);
      }
      toast('Jugadores intercambiados.','success');
    } catch(e){ toast('No se pudo intercambiar.','error'); }
  },
  matchPhase
};
window.CancheroPitch = CancheroPitch;
console.log('[canchero-match-pitch] ✅ cargado');
})();
