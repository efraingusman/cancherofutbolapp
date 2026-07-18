const fs = require('fs');
const p = 'c:\\\\Users\\\\Cliente\\\\Documents\\\\canchero app\\\\script.js';
let content = fs.readFileSync(p, 'utf8');

const regex = /window\.undoTacticAction = function\(\) \{[\s\S]*?tacCtx\.drawImage\(img, 0, 0\);\n        };\n    }\n};/m;

const newStr = `window.undoTacticAction = function() {
    if(tacticHistory.length > 0) {
        const lastState = tacticHistory.pop();
        const img = new Image();
        img.onload = function() {
            tacCtx.clearRect(0, 0, tacCanvas.width, tacCanvas.height);
            tacCtx.drawImage(img, 0, 0);
        };
        img.src = lastState;
    }
};`;

content = content.replace(regex, newStr);
fs.writeFileSync(p, content, 'utf8');
console.log('Undo fixed');
