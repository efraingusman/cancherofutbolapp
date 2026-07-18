import re

def fix_club_and_shield():
    path = r"c:\Users\Cliente\Documents\canchero app\script.js"
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    shield_flag_logic = """
// ============================================================
// SHIELD & FLAG GENERATION LOGIC
// ============================================================

window.currentShieldShape = 'shield-classic';
window.setShieldShape = function(shape, el) {
    window.currentShieldShape = shape;
    document.querySelectorAll('.shape-opt').forEach(b => b.classList.remove('active'));
    if(el) el.classList.add('active');
    updateShieldPreview();
};

window.updateShieldPreview = function() {
    const preview = document.getElementById('identity-preview-render');
    if(!preview) return;
    
    // Check if custom upload exists
    if(document.getElementById('club-custom-shield-upload') && document.getElementById('club-custom-shield-upload').files.length > 0) {
        // Will be handled by the file input
        return;
    }

    const c1 = document.getElementById('club-color-1') ? document.getElementById('club-color-1').value : '#baff00';
    const c2 = document.getElementById('club-color-2') ? document.getElementById('club-color-2').value : '#000000';
    const c3 = document.getElementById('club-color-3') ? document.getElementById('club-color-3').value : '#ffffff';
    const border = document.getElementById('club-color-4') ? document.getElementById('club-color-4').value : '#000000';
    const textColor = document.getElementById('club-color-5') ? document.getElementById('club-color-5').value : '#ffffff';
    const textBorder = document.getElementById('club-color-text-border') ? document.getElementById('club-color-text-border').value : '#000000';
    const text = document.getElementById('club-shield-text') ? document.getElementById('club-shield-text').value.toUpperCase() : 'CLUB';
    
    const size = document.getElementById('club-shield-text-size') ? document.getElementById('club-shield-text-size').value : 20;
    const posX = document.getElementById('club-shield-text-x') ? document.getElementById('club-shield-text-x').value : 50;
    const posY = document.getElementById('club-shield-text-y') ? document.getElementById('club-shield-text-y').value : 55;
    
    const pattern = document.getElementById('club-shield-pattern') ? document.getElementById('club-shield-pattern').value : 'solid';
    const count = document.getElementById('club-shield-pattern-count') ? document.getElementById('club-shield-pattern-count').value : 5;
    
    // Generate SVG
    let patternSVG = '';
    const defs = `<defs>
        <pattern id="shield-pattern" width="${100/count}" height="${100/count}" patternUnits="userSpaceOnUse">
            <rect width="100%" height="100%" fill="${c1}" />
            <rect width="${pattern === 'vertical' ? '50%' : '100%'}" height="${pattern === 'horizontal' ? '50%' : '100%'}" fill="${c2}" />
        </pattern>
    </defs>`;
    
    let pathD = "M50 5 L95 25 V75 L50 95 L5 75 V25 Z"; // classic
    if(window.currentShieldShape === 'shield-circle') pathD = "M 50, 50 m -45, 0 a 45,45 0 1,0 90,0 a 45,45 0 1,0 -90,0";
    else if(window.currentShieldShape === 'shield-square') pathD = "M10 10 H90 V90 H10 Z";
    
    const svg = `
        <svg viewBox="0 0 100 100" width="100%" height="100%">
            ${defs}
            <path d="${pathD}" fill="${pattern === 'solid' ? c1 : 'url(#shield-pattern)'}" stroke="${border}" stroke-width="4"/>
            <text x="${posX}" y="${posY}" font-family="Arial" font-weight="900" font-size="${size}" fill="${textColor}" stroke="${textBorder}" stroke-width="1" text-anchor="middle" dominant-baseline="middle">${text}</text>
        </svg>
    `;
    
    preview.innerHTML = svg;
};

window.switchIdentityTab = function(tab, el) {
    document.querySelectorAll('.identity-tabs button').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    
    document.getElementById('identity-shield-editor').style.display = tab === 'shield' ? 'block' : 'none';
    document.getElementById('identity-flag-editor').style.display = tab === 'flag' ? 'block' : 'none';
    
    document.getElementById('download-type-text').innerText = tab === 'shield' ? 'ESCUDO' : 'BANDERA';
    
    if(tab === 'shield') updateShieldPreview();
    else if(typeof updateFlagPreview === 'function') updateFlagPreview();
};
"""
    if "window.updateShieldPreview" not in content:
        content += "\n" + shield_flag_logic

    # Fix viewClubProfile
    club_viewer_fix = """
window.viewClubProfile = function(id) {
    const stored = JSON.parse(localStorage.getItem('canchero_mis_clubes') || '[]');
    const mock = typeof UY !== 'undefined' && typeof genTeams === 'function' ? UY.flatMap((_, di) => genTeams(di)) : [];
    const clubs = [...stored, ...mock];
    const club = clubs.find(c => c.id === id);
    if (!club) return;

    window.currentEditingClubId = id;
    if(typeof switchDashboardTab === 'function') switchDashboardTab('jugador', 'club-viewer');
    
    const content = document.getElementById('club-global-viewer-content');
    if (content) {
        let playersHtml = '<div style="color:var(--text-muted); font-size:12px; text-align:center; padding: 20px;">No hay jugadores registrados en la plantilla aún.</div>';
        if (club.players && club.players.length > 0) {
            playersHtml = `
                <div class="quick-actions-grid" style="grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px;">
                    ${club.players.map(p => `
                        <div class="panel" style="padding: 10px; display:flex; flex-direction:column; align-items:center; border:1px solid #333;">
                            <div style="width:50px; height:50px; border-radius:50%; background-image:url('${p.photo || 'https://ui-avatars.com/api/?name=J'}'); background-size:cover; margin-bottom:10px; border:2px solid var(--accent);"></div>
                            <div style="font-weight:900; font-size:12px; color:#fff; text-align:center;">${p.name.toUpperCase()}</div>
                            <div style="font-size:10px; color:var(--accent); font-weight:800; background:rgba(186,255,0,0.1); padding:2px 8px; border-radius:10px; margin-top:5px;">${p.pos.toUpperCase()}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        content.innerHTML = `
            <div class="social-profile">
                <div class="cover-photo" style="background-image: url('${club.coverPhoto || ''}'); background-size: cover; background-position: center; border-radius:12px 12px 0 0;"></div>
                <div class="profile-header-row" style="padding: 0 20px;">
                    <div style="width:100px; height:100px; border-radius:50%; background-color:#000; background-image: url('${club.logoSVG ? '' : (userData && userData.photo || '')}'); background-size: cover; border:4px solid var(--accent); margin-top:-50px; display:flex; align-items:center; justify-content:center;">
                        ${club.logoSVG || ''}
                    </div>
                    <div class="profile-actions-row" style="margin-top: 15px;">
                        <button class="btn btn-primary" style="font-weight:900;">SEGUIR</button>
                    </div>
                </div>
                <div class="profile-info-section" style="padding: 10px 20px;">
                    <div class="profile-display-name" style="font-size:24px;">${club.name}</div>
                    <div class="profile-handle" style="color:var(--accent);">@${club.name.toLowerCase().replace(/\\s/g, '')}</div>
                    <div class="profile-bio" style="margin-top:10px; font-size:14px;">${club.bio || 'Sin biografía disponible. Equipo competidor de Canchero.'}</div>
                </div>
                
                <div style="padding: 20px;">
                    <h3 style="color:var(--accent); font-weight:900; margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:10px;"><i class='bx bx-group'></i> PLANTILLA OFICIAL</h3>
                    ${playersHtml}
                    
                    <h3 style="color:var(--accent); font-weight:900; margin-top:30px; margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:10px;"><i class='bx bx-stats'></i> ESTADÍSTICAS DEL CLUB</h3>
                    <div class="quick-actions-grid" style="grid-template-columns: repeat(3, 1fr); gap: 10px;">
                        <div class="panel" style="text-align:center; padding:15px;"><div style="font-size:24px; color:var(--accent); font-weight:900;">${club.score || 0}</div><div style="font-size:10px; color:#888;">PUNTOS</div></div>
                        <div class="panel" style="text-align:center; padding:15px;"><div style="font-size:24px; color:var(--accent); font-weight:900;">${club.stars || 0}</div><div style="font-size:10px; color:#888;">ESTRELLAS</div></div>
                        <div class="panel" style="text-align:center; padding:15px;"><div style="font-size:24px; color:var(--accent); font-weight:900;">${club.players ? club.players.length : 0}</div><div style="font-size:10px; color:#888;">JUGADORES</div></div>
                    </div>
                </div>
            </div>
        `;
    }
};
"""
    old_viewer_regex = re.compile(r'window\.viewClubProfile = function\(id\) \{[\s\S]*?(?=window\.addEventListener\(\'DOMContentLoaded\')', re.DOTALL)
    if old_viewer_regex.search(content):
        content = old_viewer_regex.sub(club_viewer_fix, content)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        print("script.js patched for club viewer and shield preview.")

fix_club_and_shield()
