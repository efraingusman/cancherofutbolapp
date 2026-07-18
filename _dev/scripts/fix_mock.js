const fs = require('fs');
const path = 'c:/Users/Cliente/Documents/canchero app/script.js';
let c = fs.readFileSync(path, 'utf-8');

// Fix 1: Replace the broken MOCK_CHATS block (with the /* that shouldn't be there)
const mockChatsStart = `const MOCK_CHATS = []; /*`;
const mockChatsEnd = `];`;

// Find the broken line
const idx1 = c.indexOf(mockChatsStart);
if (idx1 !== -1) {
    // Find the closing ]; after the last chat entry (Facundo Rios)
    const afterStart = c.indexOf(`    }`, idx1 + mockChatsStart.length);
    // Find the next ]; after all chat entries
    let searchFrom = idx1 + mockChatsStart.length;
    // Look for the pattern "    }\n];" which closes the array
    const closingPattern = `    }\r\n];`;
    const idxClose = c.indexOf(closingPattern, searchFrom);
    if (idxClose !== -1) {
        const endIdx = idxClose + closingPattern.length;
        const before = c.substring(0, idx1);
        const after = c.substring(endIdx);
        c = before + `const MOCK_CHATS = [];` + after;
        console.log('Fixed MOCK_CHATS block');
    } else {
        console.log('Could not find closing pattern for MOCK_CHATS');
    }
} else {
    console.log('MOCK_CHATS already fixed or not found');
}

// Fix 2: Ensure pipeline code is present in handleRegister
const pipelineCheck = `canchero_complexes`;
if (!c.includes(pipelineCheck)) {
    const target = `        userData.isComplexApproved = false;\r\n        localStorage.setItem('canchero_user', JSON.stringify(userData));`;
    const replacement = `        userData.isComplexApproved = false;
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
    
    if (c.includes(target)) {
        // Replace only the FIRST occurrence
        c = c.replace(target, replacement);
        console.log('Added pipeline code');
    } else {
        console.log('Pipeline target not found (maybe \\n vs \\r\\n?)');
    }
} else {
    console.log('Pipeline code already present');
}

// Fix 3: Remove mock feed posts - replace genFeed() calls with empty arrays
c = c.replace(/const mockPosts = genFeed\(\);/g, 'const mockPosts = [];');
console.log('Cleaned genFeed calls');

// Fix 4: Remove mock teams from various places
c = c.replaceAll(
    `const mock = UY.flatMap((_, di) => genTeams(di)).slice(0, 10);`,
    `const mock = [];`
);
c = c.replaceAll(
    `const mock = typeof UY !== 'undefined' && typeof genTeams === 'function' ? UY.flatMap((_, di) => genTeams(di)) : [];`,
    `const mock = [];`
);
console.log('Cleaned genTeams calls');

fs.writeFileSync(path, c, 'utf-8');
console.log('All fixes applied. Checking syntax...');
