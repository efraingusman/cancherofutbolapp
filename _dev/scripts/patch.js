const fs = require('fs');

let content = fs.readFileSync('c:/Users/Cliente/Documents/canchero app/script.js', 'utf-8');

// 1. Add pipeline saving in handleRegister
const targetPipeline = `        userData.isComplexApproved = false;
        localStorage.setItem('canchero_user', JSON.stringify(userData));`;

const replacementPipeline = `        userData.isComplexApproved = false;
        localStorage.setItem('canchero_user', JSON.stringify(userData));
        
        // --- ADD TO ADMIN PIPELINE ---
        let allComplexes = [];
        try { allComplexes = JSON.parse(localStorage.getItem('canchero_complexes') || '[]'); } catch(e) {}
        allComplexes.push({
            id: 'comp_' + Date.now(),
            name: userData.complexData.complexName,
            owner: userData.complexData.owner,
            email: userData.email,
            phone: document.getElementById('reg-phone')?.value || '',
            rut: userData.complexData.rut,
            status: 'PENDIENTE',
            date: new Date().toISOString()
        });
        localStorage.setItem('canchero_complexes', JSON.stringify(allComplexes));
        // -----------------------------`;

if (content.includes(targetPipeline)) {
    content = content.replace(targetPipeline, replacementPipeline);
}

// 2. Remove mock posts
content = content.replace(/const mockPosts = genFeed\(\);/g, 'const mockPosts = [];');

// 3. Remove mock teams
content = content.replace(/const mock = UY\.flatMap\(\(\_, di\) \=\> genTeams\(di\)\)\.slice\(0, 10\);/g, 'const mock = [];');
content = content.replace(/const mock = typeof UY !== 'undefined' && typeof genTeams === 'function' \? UY\.flatMap\(\(\_, di\) \=\> genTeams\(di\)\) : \[\];/g, 'const mock = [];');

// 4. Remove mock chats
const chatStart = `const MOCK_CHATS = [`;
content = content.replace(chatStart, `const MOCK_CHATS = []; /*`);
content = content.replace(/\];\n\nfunction renderChats\(\)/g, `];\n*/\nfunction renderChats()`);

// 5. Remove mock reservations
content = content.replace(/const mock = \[\n\s+\{ time: '18:00'/g, '/* \nconst mock = [\n        { time: \'18:00\'');
content = content.replace(/\{ time: '20:00', court: 'Cancha 1 \(F5\)', team: 'Deportivo Charrua', resp: 'Carlos', status: 'Confirmado' \}\n\s+\];/g, '{ time: \'20:00\', court: \'Cancha 1 (F5)\', team: \'Deportivo Charrua\', resp: \'Carlos\', status: \'Confirmado\' }\n    ];\n*/ const mock = [];');

fs.writeFileSync('c:/Users/Cliente/Documents/canchero app/script.js', content, 'utf-8');
console.log('Patched script.js successfully.');
