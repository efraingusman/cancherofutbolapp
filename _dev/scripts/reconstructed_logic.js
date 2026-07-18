
// ============ CLUB MANAGEMENT (RECONSTRUCTED) ============

window.renderMisClubes = function() {
    const container = document.getElementById('mis-clubes-list');
    if (!container) return;

    const clubs = JSON.parse(localStorage.getItem('canchero_mis_clubes') || '[]');
    
    if (clubs.length === 0) {
        container.innerHTML = `
            <div class="panel" style="text-align:center; padding:40px;">
                <i class='bx bx-shield' style="font-size:48px; color:var(--accent); opacity:0.3; margin-bottom:15px;"></i>
                <p style="color:var(--text-muted);">Aún no has creado ningún club.</p>
                <button class="btn btn-primary" style="margin-top:20px;" onclick="openClubCreator()">CREAR MI PRIMER CLUB</button>
            </div>
        `;
        return;
    }

    container.innerHTML = clubs.map(club => `
        <div class="match-list-item" style="cursor:pointer;" onclick="viewClubProfile(${club.id})">
            <div style="display:flex; align-items:center; gap:15px;">
                <div style="width:50px; height:50px; background:#000; border-radius:8px; display:flex; align-items:center; justify-content:center; border:1px solid var(--border-color);">
                    ${club.logoSVG || '<i class="bx bx-shield"></i>'}
                </div>
                <div>
                    <h4 style="margin:0;">${club.name}</h4>
                    <p style="font-size:11px; color:var(--text-muted); margin:0;">${club.city}, ${club.nat}</p>
                </div>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn btn-glass btn-sm" onclick="event.stopPropagation(); openEditClub(${club.id})"><i class='bx bx-edit-alt'></i> GESTIONAR</button>
            </div>
        </div>
    `).join('');
};

window.openClubCreator = function() {
    const modal = document.getElementById('club-creator-modal');
    if (modal) modal.style.display = 'flex';
    else alert("Funcionalidad de creación próximamente");
};

window.viewClubProfile = function(id) {
    const clubs = JSON.parse(localStorage.getItem('canchero_mis_clubes') || '[]');
    const club = clubs.find(c => c.id === id);
    if (!club) return;

    window.currentEditingClubId = id;
    if(typeof switchDashboardTab === 'function') switchDashboardTab('jugador', 'club-viewer');
    
    const content = document.getElementById('club-global-viewer-content');
    if (content) {
        content.innerHTML = `
            <div class="social-profile">
                <div class="cover-photo" style="background-image: url('${club.coverPhoto || ''}'); background-size: cover; background-position: center;"></div>
                <div class="profile-header-row">
                    <div style="width:100px; height:100px; border-radius:50%; background:#000; border:4px solid var(--accent); margin-top:-50px; display:flex; align-items:center; justify-content:center;">
                        ${club.logoSVG || ''}
                    </div>
                    <div class="profile-actions-row">
                        <button class="btn btn-primary">SEGUIR</button>
                        <button class="btn btn-outline" onclick="switchDashboardTab('jugador', 'gestion-club')">GESTIONAR</button>
                    </div>
                </div>
                <div class="profile-info-section">
                    <div class="profile-display-name">${club.name}</div>
                    <div class="profile-handle">@${club.name.toLowerCase().replace(/\s/g, '')}</div>
                    <div class="profile-bio">${club.bio || 'Sin biografía.'}</div>
                </div>
            </div>
        `;
    }
};

setTimeout(() => {
    if(typeof renderMisClubes === 'function') renderMisClubes();
}, 500);
