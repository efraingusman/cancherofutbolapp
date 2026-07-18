const fs = require('fs');
const p = 'c:\\\\Users\\\\Cliente\\\\Documents\\\\canchero app\\\\script.js';
let content = fs.readFileSync(p, 'utf8');

// Replace the block from `const previewContent = document.getElementById('identity-preview-render')?.innerHTML || '';`
// to `localStorage.setItem('canchero_user', JSON.stringify(userData));`

const regex = /const previewContent = document\.getElementById\('identity-preview-render'\)\?\.innerHTML \|\| '';[\s\S]*?localStorage\.setItem\('canchero_user', JSON\.stringify\(userData\)\);/m;

const newPart = `const previewContent = document.getElementById('identity-preview-render')?.innerHTML || '';

    const clubDataToSave = {
        primaryColor: c1, secondaryColor: c2, c3: c3, c4: c4, c5: c5,
        shieldText: shieldText, textSize: textSize, textY: textY, textX: textX, textClip: textClip,
        pattern: pattern, patternCount: patternCount, shape: currentShieldShape,
        textBorderColor: textBorderColor, textBorderWidth: textBorderWidth,
        customShield: customShieldImage, customFlag: customFlagImage,
        flagStyle: flagStyle, f1: f1, f2: f2, f3: f3, flagDetailPos: flagDetailPos,
        logoSVG: previewContent
    };
    if (typeof f4 !== 'undefined') clubDataToSave.f4 = f4;

    if(window.currentEditingClubId) {
        let clubs = JSON.parse(localStorage.getItem('canchero_mis_clubes') || '[]');
        const idx = clubs.findIndex(c => c.id === window.currentEditingClubId);
        if(idx !== -1) {
            Object.assign(clubs[idx], clubDataToSave);
            clubs[idx].logoSVG = getShieldSVGString(clubs[idx]);
            localStorage.setItem('canchero_mis_clubes', JSON.stringify(clubs));
            renderMisClubes();
        }
    } else if (userData && userData.club) {
        let clubs = JSON.parse(localStorage.getItem('canchero_mis_clubes') || '[]');
        const idx = clubs.findIndex(c => c.name === userData.club.name);
        if (idx !== -1) {
            Object.assign(clubs[idx], clubDataToSave);
            clubs[idx].logoSVG = getShieldSVGString(clubs[idx]);
            localStorage.setItem('canchero_mis_clubes', JSON.stringify(clubs));
            renderMisClubes();
        }
    }
    
    if(!userData) window.userData = {};
    if(!userData.club) userData.club = {};
    
    Object.assign(userData.club, clubDataToSave);
    localStorage.setItem('canchero_user', JSON.stringify(userData));`;

const result = content.replace(regex, newPart);
if (result === content) {
    console.log('Replace failed');
} else {
    fs.writeFileSync(p, result, 'utf8');
    console.log('Replace success');
}
