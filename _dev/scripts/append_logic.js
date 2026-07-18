const fs = require('fs');
const code = \`
// ============ STORY SYSTEM ============

let storyStream = null;
let currentStoryMedia = null;
let currentStoryType = 'image';

window.addStory = function() {
    document.getElementById('story-creator-modal').style.display = 'flex';
    resetStoryModal();
};

window.closeStoryModal = function() {
    document.getElementById('story-creator-modal').style.display = 'none';
    if(storyStream) {
        storyStream.getTracks().forEach(track => track.stop());
        storyStream = null;
    }
};

function resetStoryModal() {
    document.getElementById('story-camera-stream').style.display = 'none';
    document.getElementById('story-image-preview').style.display = 'none';
    document.getElementById('story-placeholder').style.display = 'flex';
    document.getElementById('story-capture-btn').style.display = 'none';
    document.getElementById('story-publish-btn').style.display = 'none';
    document.getElementById('story-text-input').value = '';
    document.getElementById('story-text-overlay').innerText = '';
    currentStoryMedia = null;
}

window.startStoryCamera = async function() {
    resetStoryModal();
    try {
        storyStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        const video = document.getElementById('story-camera-stream');
        video.srcObject = storyStream;
        video.style.display = 'block';
        document.getElementById('story-placeholder').style.display = 'none';
        document.getElementById('story-capture-btn').style.display = 'block';
    } catch(e) {
        alert("No se pudo acceder a la cámara: " + e.message);
    }
};

window.handleStoryFile = function(input) {
    if(input.files && input.files[0]) {
        const file = input.files[0];
        currentStoryType = file.type.startsWith('video') ? 'video' : 'image';
        const reader = new FileReader();
        reader.onload = function(e) {
            currentStoryMedia = e.target.result;
            showStoryPreview(currentStoryMedia, currentStoryType);
        };
        reader.readAsDataURL(file);
    }
};

window.captureStoryMedia = function() {
    const video = document.getElementById('story-camera-stream');
    const canvas = document.getElementById('story-capture-canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    currentStoryMedia = canvas.toDataURL('image/jpeg');
    currentStoryType = 'image';
    
    // Stop camera
    if(storyStream) {
        storyStream.getTracks().forEach(track => track.stop());
        storyStream = null;
    }
    video.style.display = 'none';
    
    showStoryPreview(currentStoryMedia, 'image');
};

function showStoryPreview(src, type) {
    const img = document.getElementById('story-image-preview');
    const video = document.getElementById('story-camera-stream');
    const placeholder = document.getElementById('story-placeholder');
    
    placeholder.style.display = 'none';
    document.getElementById('story-capture-btn').style.display = 'none';
    document.getElementById('story-publish-btn').style.display = 'block';
    
    if(type === 'image') {
        img.src = src;
        img.style.display = 'block';
        video.style.display = 'none';
    } else {
        // For video files
        video.srcObject = null;
        video.src = src;
        video.controls = false;
        video.loop = true;
        video.style.display = 'block';
        video.play();
        img.style.display = 'none';
    }
}

window.updateStoryText = function() {
    const text = document.getElementById('story-text-input').value;
    document.getElementById('story-text-overlay').innerText = text;
};

window.publishStory = function() {
    const text = document.getElementById('story-text-input').value;
    const story = {
        id: Date.now(),
        user: userData.name,
        avatar: userData.photo,
        media: currentStoryMedia,
        type: currentStoryType,
        text: text,
        timestamp: new Date().getTime()
    };
    
    const stories = JSON.parse(localStorage.getItem('canchero_stories') || '[]');
    stories.unshift(story);
    localStorage.setItem('canchero_stories', JSON.stringify(stories));
    
    closeStoryModal();
    renderStories();
    alert("¡Historia publicada!");
};

function renderStories() {
    const container = document.getElementById('stories-container');
    if(!container) return;
    
    const stories = JSON.parse(localStorage.getItem('canchero_stories') || '[]');
    
    let html = \\\`
        <div class="story-item" onclick="addStory()" style="flex:0 0 70px; text-align:center;">
            <div class="story-circle" style="width:60px; height:60px; border:2px dashed var(--accent); border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                <i class='bx bx-plus' style="font-size:24px; color:var(--accent);"></i>
            </div>
            <span style="font-size:10px; display:block; margin-top:5px;">Tu Historia</span>
        </div>
    \\\`;
    
    stories.forEach(s => {
        html += \\\`
            <div class="story-item" onclick="viewStoryById(\\\${s.id})" style="flex:0 0 70px; text-align:center;">
                <div class="story-circle active" style="width:60px; height:60px; border:2px solid var(--accent); padding:2px; border-radius:50%; cursor:pointer;">
                    <img src="\\\${s.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
                </div>
                <span style="font-size:10px; display:block; margin-top:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">\\\${s.user}</span>
            </div>
        \\\`;
    });
    
    container.innerHTML = html;
}

window.viewStoryById = function(id) {
    const stories = JSON.parse(localStorage.getItem('canchero_stories') || '[]');
    const s = stories.find(story => story.id === id);
    if(!s) return;
    
    const modal = document.getElementById('story-viewer-modal');
    const mediaContainer = document.getElementById('story-viewer-media');
    const textContainer = document.getElementById('story-viewer-text');
    
    mediaContainer.innerHTML = s.type === 'video' ? \\\`<video src="\\\${s.media}" autoplay style="width:100%; height:100%; object-fit:cover;"></video>\\\` : \\\`<img src="\\\${s.media}" style="width:100%; height:100%; object-fit:cover;">\\\`;
    textContainer.innerText = s.text || '';
    
    modal.style.display = 'flex';
    
    const fill = document.getElementById('story-progress-fill');
    fill.style.width = '0%';
    let start = null;
    const duration = 5000;
    
    function animate(timestamp) {
        if(!start) start = timestamp;
        const progress = timestamp - start;
        const percent = Math.min((progress / duration) * 100, 100);
        fill.style.width = percent + '%';
        if(progress < duration && modal.style.display === 'flex') {
            requestAnimationFrame(animate);
        } else if(percent >= 100) {
            closeStoryViewer();
        }
    }
    requestAnimationFrame(animate);
};

window.closeStoryViewer = function() {
    document.getElementById('story-viewer-modal').style.display = 'none';
};

// ============ CLUB IDENTITY SYSTEM (FIFA/PES STYLE) ============

let currentShieldShape = 'shield-classic';
let currentIdentityTab = 'shield';

window.switchIdentityTab = function(tab, btn) {
    currentIdentityTab = tab;
    document.querySelectorAll('.identity-tabs .btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    document.getElementById('identity-shield-editor').style.display = tab === 'shield' ? 'block' : 'none';
    document.getElementById('identity-flag-editor').style.display = tab === 'flag' ? 'block' : 'none';
    
    if(tab === 'shield') updateShieldPreview();
    else updateFlagPreview();
};

window.setShieldShape = function(shape, el) {
    currentShieldShape = shape;
    document.querySelectorAll('.shape-opt').forEach(opt => opt.classList.remove('active'));
    el.classList.add('active');
    updateShieldPreview();
};

window.updateShieldPreview = function() {
    const text = document.getElementById('club-shield-text').value || 'CLUB';
    const primary = document.getElementById('club-color-primary').value;
    const secondary = document.getElementById('club-color-secondary').value;
    const container = document.getElementById('identity-preview-render');
    
    let path = '';
    if(currentShieldShape === 'shield-classic') path = 'M50 0 L100 20 V80 L50 100 L0 80 V20 Z';
    else if(currentShieldShape === 'shield-circle') path = 'M50 0 A50 50 0 1 1 50 100 A50 50 0 1 1 50 0';
    else if(currentShieldShape === 'shield-square') path = 'M10 0 H90 V90 H10 Z';
    else if(currentShieldShape === 'shield-modern') path = 'M0 0 H100 V80 L50 100 L0 80 Z';
    
    container.innerHTML = \\\`
        <svg viewBox="0 0 100 100" width="120" height="120">
            <path d="\\\${path}" fill="\\\${primary}" stroke="\\\${secondary}" stroke-width="5" />
            <text x="50" y="55" text-anchor="middle" fill="\\\${secondary}" font-family="Outfit" font-weight="900" font-size="18">\\\${text.toUpperCase()}</text>
        </svg>
    \\\`;
};

window.updateFlagPreview = function() {
    const bg = document.getElementById('club-flag-bg').value;
    const detail = document.getElementById('club-flag-detail').value;
    const style = document.getElementById('club-flag-style').value;
    const container = document.getElementById('identity-preview-render');
    
    let detailContent = '';
    if(style === 'horizontal') detailContent = \\\`<rect y="35" width="100" height="30" fill="\\\${detail}" />\\\`;
    else if(style === 'vertical') detailContent = \\\`<rect x="35" width="30" height="100" fill="\\\${detail}" />\\\`;
    else if(style === 'diagonal') detailContent = \\\`<path d="M0 0 L100 100 V70 L30 0 Z" fill="\\\${detail}" />\\\`;
    else if(style === 'cross') detailContent = \\\`<rect x="40" width="20" height="100" fill="\\\${detail}" /><rect y="40" width="100" height="20" fill="\\\${detail}" />\\\`;
    
    container.innerHTML = \\\`
        <svg viewBox="0 0 100 100" width="120" height="120">
            <rect width="100" height="100" fill="\\\${bg}" />
            \\\${detailContent}
        </svg>
    \\\`;
};

window.applyIdentityTemplate = function(team) {
    const templates = {
        'river': { p: '#ffffff', s: '#ff0000', t: 'CARP', fbg: '#ffffff', fdet: '#ff0000', fsty: 'diagonal' },
        'boca': { p: '#0000ff', s: '#ffff00', t: 'CABJ', fbg: '#0000ff', fdet: '#ffff00', fsty: 'horizontal' },
        'peñarol': { p: '#000000', s: '#ffff00', t: 'CAP', fbg: '#000000', fdet: '#ffff00', fsty: 'vertical' },
        'nacional': { p: '#ffffff', s: '#0000ff', t: 'CNF', fbg: '#0000ff', fdet: '#ffffff', fsty: 'horizontal' }
    };
    
    const data = templates[team];
    if(!data) return;
    
    document.getElementById('club-color-primary').value = data.p;
    document.getElementById('club-color-secondary').value = data.s;
    document.getElementById('club-shield-text').value = data.t;
    document.getElementById('club-flag-bg').value = data.fbg;
    document.getElementById('club-flag-detail').value = data.fdet;
    document.getElementById('club-flag-style').value = data.fsty;
    
    if(currentIdentityTab === 'shield') updateShieldPreview();
    else updateFlagPreview();
};

window.saveClubIdentity = function() {
    const primary = document.getElementById('club-color-primary').value;
    const secondary = document.getElementById('club-color-secondary').value;
    const text = document.getElementById('club-shield-text').value;
    const svg = document.getElementById('identity-preview-render').innerHTML;
    
    if(!userData.club) userData.club = {};
    userData.club.primaryColor = primary;
    userData.club.secondaryColor = secondary;
    userData.club.shieldText = text;
    userData.club.logoSVG = svg;
    
    localStorage.setItem('canchero_user', JSON.stringify(userData));
    
    document.documentElement.style.setProperty('--accent', primary);
    document.documentElement.style.setProperty('--accent-glow', primary + '44');
    
    alert("¡Identidad de Club actualizada! Los colores se han aplicado a tu panel.");
    
    const dashLogo = document.getElementById('club-identity-preview');
    if(dashLogo) dashLogo.innerHTML = svg;
};

window.switchClubGestionTab = function(tab, btn) {
    document.querySelectorAll('.sidebar-menu .menu-item').forEach(el => el.classList.remove('active'));
    if(btn) btn.classList.add('active');
    
    document.querySelectorAll('.gestion-sub-content').forEach(el => el.style.display = 'none');
    const target = document.getElementById('gestion-' + tab);
    if(target) target.style.display = 'block';
    
    if(tab === 'tacticas') setTimeout(initTacticBoard, 100);
    if(tab === 'personalizacion') updateShieldPreview();
};

// Initialize stories on load
setTimeout(renderStories, 1000);
\`;

fs.appendFileSync('script.js', code);
console.log('Appended code successfully');
