import re
import os

def fix_script_js():
    path = r"c:\Users\Cliente\Documents\canchero app\script.js"
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Fix Top Nav Login buttons
    nav_fix = """
    if (document.querySelector('.nav-actions')) {
        if (userData) {
            document.querySelector('.nav-actions').innerHTML = `
                <button class="btn btn-outline" style="border:none; padding:5px 15px;" onclick="navigate('${userData.role}')"><i class='bx bx-user-circle'></i> MI PERFIL</button>
                <button class="btn btn-fs-login" style="background:#ff4d4d; color:white; padding:5px 15px;" onclick="logout()">SALIR</button>
            `;
        } else {
            document.querySelector('.nav-actions').innerHTML = `
                <button class="btn btn-fs-login" onclick="navigate('login')">ENTRAR</button>
                <button class="btn btn-fs-register" onclick="navigate('register')">REGISTRO</button>
            `;
        }
    }
    """
    
    if "document.querySelector('.nav-actions')" not in content:
        # inject inside applyUserData
        content = content.replace("localStorage.setItem('canchero_user', JSON.stringify(userData));", 
                                  "localStorage.setItem('canchero_user', JSON.stringify(userData));\n" + nav_fix, 1)

    # 2. Fix Post time "ahora"
    time_func = """
function timeAgo(ms) {
    const s = Math.floor((Date.now() - ms) / 1000);
    if (s < 60) return 'Hace un momento';
    const m = Math.floor(s / 60);
    if (m < 60) return 'Hace ' + m + 'm';
    const h = Math.floor(m / 60);
    if (h < 24) return 'Hace ' + h + 'h';
    const d = Math.floor(h / 24);
    return 'Hace ' + d + 'd';
}
"""
    if "function timeAgo" not in content:
        content = time_func + "\n" + content
        
    content = content.replace("<span class=\"post-time\">· ahora</span>", "<span class=\"post-time\">· ${timeAgo(p.id)}</span>")

    # 3. Replace initClubTactics entirely
    tactics_code = """
// ============================================================
// CLUB TACTICS & CANVAS DRAWING
// ============================================================
window.FORMATIONS = {
    'F5': ['1-2-1', '2-2', '1-1-2', '1-3'],
    'F7': ['2-3-1', '3-2-1', '2-2-2', '1-4-1'],
    'F11': ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2']
};

let tacCanvas, tacCtx;
let isDrawing = false, tacMode = 'move';
let tacColor = '#baff00';
let players = [];
let drawnLines = [];

function initTactics() {
    tacCanvas = document.getElementById('tac-board-canvas');
    if(!tacCanvas) return;
    tacCtx = tacCanvas.getContext('2d');
    
    // Resize handling
    const container = document.getElementById('tac-board-container');
    if(container) {
        tacCanvas.width = container.clientWidth || 600;
        tacCanvas.height = container.clientHeight || 400;
    }

    tacCanvas.addEventListener('mousedown', startTacEvent);
    tacCanvas.addEventListener('mousemove', moveTacEvent);
    tacCanvas.addEventListener('mouseup', stopTacEvent);
    tacCanvas.addEventListener('mouseleave', stopTacEvent);
    tacCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); startTacEvent(e.touches[0]); }, {passive: false});
    tacCanvas.addEventListener('touchmove', (e) => { e.preventDefault(); moveTacEvent(e.touches[0]); }, {passive: false});
    tacCanvas.addEventListener('touchend', stopTacEvent);
}

function getTacPos(e) {
    const rect = tacCanvas.getBoundingClientRect();
    const scaleX = tacCanvas.width / rect.width;
    const scaleY = tacCanvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

let draggedPlayer = null;

function startTacEvent(e) {
    const pos = getTacPos(e);
    if(tacMode === 'move') {
        const hit = players.find(p => Math.hypot(p.x - pos.x, p.y - pos.y) < 15);
        if(hit) draggedPlayer = hit;
    } else if(tacMode === 'draw' || tacMode === 'erase') {
        isDrawing = true;
        if(tacMode === 'draw') {
            drawnLines.push({ color: tacColor, points: [{x: pos.x, y: pos.y}] });
        }
    }
}

function moveTacEvent(e) {
    const pos = getTacPos(e);
    if(tacMode === 'move' && draggedPlayer) {
        draggedPlayer.x = pos.x;
        draggedPlayer.y = pos.y;
        renderTacBoard();
    } else if(isDrawing && tacMode === 'draw') {
        drawnLines[drawnLines.length - 1].points.push({x: pos.x, y: pos.y});
        renderTacBoard();
    } else if(isDrawing && tacMode === 'erase') {
        drawnLines = drawnLines.filter(line => {
            return !line.points.some(pt => Math.hypot(pt.x - pos.x, pt.y - pos.y) < 20);
        });
        renderTacBoard();
    }
}

function stopTacEvent() {
    isDrawing = false;
    draggedPlayer = null;
}

window.renderTacBoard = function() {
    if(!tacCtx) return;
    tacCtx.clearRect(0, 0, tacCanvas.width, tacCanvas.height);
    
    // Draw lines
    drawnLines.forEach(line => {
        if(line.points.length < 2) return;
        tacCtx.beginPath();
        tacCtx.moveTo(line.points[0].x, line.points[0].y);
        for(let i=1; i<line.points.length; i++) {
            tacCtx.lineTo(line.points[i].x, line.points[i].y);
        }
        tacCtx.strokeStyle = line.color;
        tacCtx.lineWidth = 3;
        tacCtx.lineCap = 'round';
        tacCtx.lineJoin = 'round';
        tacCtx.stroke();
    });
    
    // Draw players
    players.forEach((p, i) => {
        tacCtx.beginPath();
        tacCtx.arc(p.x, p.y, 12, 0, Math.PI * 2);
        tacCtx.fillStyle = p.gk ? '#ff4d4d' : '#baff00';
        tacCtx.fill();
        tacCtx.strokeStyle = '#000';
        tacCtx.lineWidth = 2;
        tacCtx.stroke();
        
        tacCtx.fillStyle = '#000';
        tacCtx.font = 'bold 12px Arial';
        tacCtx.textAlign = 'center';
        tacCtx.textBaseline = 'middle';
        tacCtx.fillText(i+1, p.x, p.y);
    });
}

window.updateTacticFormations = function() {
    const typeEl = document.getElementById('club-tac-type');
    const formEl = document.getElementById('club-tac-formation');
    if (!typeEl || !formEl) return;
    const opts = FORMATIONS[typeEl.value] || FORMATIONS['F5'];
    formEl.innerHTML = opts.map(f => `<option>${f}</option>`).join('');
    updateClubTacticBoard();
};

window.updateClubTacticBoard = function() {
    if(!tacCanvas) initTactics();
    if(!tacCanvas) return;
    
    const w = tacCanvas.width;
    const h = tacCanvas.height;
    const type = document.getElementById('club-tac-type').value || 'F5';
    const formStr = document.getElementById('club-tac-formation').value || '1-2-1';
    
    const parts = formStr.split('-');
    
    players = [];
    // GK
    players.push({ x: w * 0.1, y: h * 0.5, gk: true });
    
    let currentX = w * 0.3;
    const stepX = (w * 0.6) / parts.length;
    
    parts.forEach(countStr => {
        const count = parseInt(countStr);
        const stepY = h / (count + 1);
        for(let i=1; i<=count; i++) {
            players.push({ x: currentX, y: stepY * i, gk: false });
        }
        currentX += stepX;
    });
    
    renderTacBoard();
};

window.setTacticMode = function(mode) {
    tacMode = mode;
    ['move','draw','erase'].forEach(m => {
        const btn = document.getElementById('btn-tac-' + m);
        if (btn) btn.className = btn.className.replace('btn-primary','btn-glass');
    });
    const active = document.getElementById('btn-tac-' + mode);
    if (active) active.className = active.className.replace('btn-glass','btn-primary');
    
    const picker = document.getElementById('tac-color-picker');
    if (picker) picker.style.display = mode === 'draw' ? 'flex' : 'none';
};

window.setTacColor = function(color, el) {
    tacColor = color;
    document.querySelectorAll('.tac-color-btn').forEach(b => b.style.border = '2px solid transparent');
    if (el) el.style.border = '2px solid white';
};

window.undoTacLine = function() {
    drawnLines.pop();
    renderTacBoard();
};

window.clearTacBoard = function() {
    drawnLines = [];
    renderTacBoard();
};
"""
    
    # Remove old initClubTactics IIFE
    old_tactics_regex = re.compile(r'\(function initClubTactics\(\) \{.*?\}\)\(\);', re.DOTALL)
    if old_tactics_regex.search(content):
        content = old_tactics_regex.sub(tactics_code, content)
    else:
        # Just append it if not found
        content += "\n" + tactics_code

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("script.js patched successfully.")

fix_script_js()
