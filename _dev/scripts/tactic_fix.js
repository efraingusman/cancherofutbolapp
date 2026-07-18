const fs = require('fs');
const p = 'c:\\\\Users\\\\Cliente\\\\Documents\\\\canchero app\\\\script.js';
let content = fs.readFileSync(p, 'utf8');

const regex1 = /function getTacMousePos\(e\) \{[\s\S]*?y: e\.clientY - rect\.top\n    \};/m;
const newPart1 = `function getTacMousePos(e) {
    const rect = tacCanvas.getBoundingClientRect();
    const scaleX = tacCanvas.width / rect.width;
    const scaleY = tacCanvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };`;

content = content.replace(regex1, newPart1);

const regex2 = /if \(container\.clientWidth > 0 && \(tacCanvas\.width !== container\.clientWidth \|\| tacCanvas\.height !== container\.clientHeight\)\) \{[\s\S]*?    \}/m;
const newPart2 = `if (container.clientWidth > 0 && (tacCanvas.width !== container.clientWidth || tacCanvas.height !== container.clientHeight)) {
        // preserve drawing
        const img = tacCtx ? tacCanvas.toDataURL() : null;
        tacCanvas.width = container.clientWidth;
        tacCanvas.height = container.clientHeight;
        if(img) {
            const temp = new Image();
            temp.onload = () => tacCtx.drawImage(temp, 0, 0);
            temp.src = img;
        }
    }`;

content = content.replace(regex2, newPart2);

fs.writeFileSync(p, content, 'utf8');
console.log('Tactic sizes fixed');
