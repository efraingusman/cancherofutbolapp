const fs = require('fs');
const path = 'c:/Users/Cliente/Documents/canchero app/script.js';
let lines = fs.readFileSync(path, 'utf-8').split('\n');

// First, undo wrong insertion at line 372 area - find and remove it
let pipelineStart = -1;
let pipelineEnd = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('// --- ADD TO ADMIN PIPELINE ---')) {
        pipelineStart = i;
    }
    if (pipelineStart !== -1 && lines[i].includes('// -----------------------------')) {
        pipelineEnd = i;
        break;
    }
}

if (pipelineStart !== -1 && pipelineEnd !== -1) {
    console.log(`Removing existing pipeline code from lines ${pipelineStart+1} to ${pipelineEnd+1}`);
    lines.splice(pipelineStart - 1, pipelineEnd - pipelineStart + 2); // remove including blank line before
}

// Now find the CORRECT place: inside handleRegister, after the overlay for complex registration
// We search for "isComplexApproved = false" that comes after "AGENDAR REUNIÓN AHORA"
let foundCalendly = false;
let insertAfterLine = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('AGENDAR')) {
        foundCalendly = true;
    }
    if (foundCalendly && lines[i].includes("userData.isComplexApproved = false;")) {
        // The next line should be the localStorage save
        insertAfterLine = i + 1; // after the localStorage.setItem line
        break;
    }
}

if (insertAfterLine === -1) {
    console.log('ERROR: Could not find correct insertion point');
    process.exit(1);
}

console.log('Inserting pipeline code after line ' + (insertAfterLine + 1));

const pipelineCode = [
    '        ',
    '        // --- ADD TO ADMIN PIPELINE ---',
    '        let allComplexes = [];',
    "        try { allComplexes = JSON.parse(localStorage.getItem('canchero_complexes') || '[]'); } catch(e) {}",
    '        allComplexes.push({',
    "            id: 'comp_' + Date.now(),",
    "            name: userData.complexData ? userData.complexData.complexName : '',",
    "            owner: userData.complexData ? userData.complexData.owner : '',",
    '            email: userData.email,',
    "            phone: document.getElementById('reg-phone') ? document.getElementById('reg-phone').value : '',",
    "            rut: userData.complexData ? userData.complexData.rut : '',",
    "            status: 'PENDIENTE',",
    '            date: new Date().toISOString()',
    '        });',
    "        localStorage.setItem('canchero_complexes', JSON.stringify(allComplexes));",
    '        // -----------------------------'
];

lines.splice(insertAfterLine + 1, 0, ...pipelineCode);

fs.writeFileSync(path, lines.join('\n'), 'utf-8');
console.log('Pipeline code inserted correctly');
