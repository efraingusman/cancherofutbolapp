// Repara mojibake: chars UTF-8 que fueron interpretados como cp1252 y re-guardados como UTF-8
const fs = require('fs');

// Chars cp1252 en el rango 0x80-0x9F que NO son Latin-1
const cp1252Extra = {
  0x80:'€', 0x82:'‚', 0x83:'ƒ', 0x84:'„', 0x85:'…', 0x86:'†', 0x87:'‡',
  0x88:'ˆ', 0x89:'‰', 0x8A:'Š', 0x8B:'‹', 0x8C:'Œ', 0x8E:'Ž',
  0x91:'‘', 0x92:'’', 0x93:'“', 0x94:'”', 0x95:'•',
  0x96:'–', 0x97:'—', 0x98:'˜', 0x99:'™', 0x9A:'š', 0x9B:'›', 0x9C:'œ',
  0x9E:'ž', 0x9F:'Ÿ'
};
// Inverso: char → byte cp1252
const charToCp1252 = {};
for(const b in cp1252Extra) charToCp1252[cp1252Extra[b]] = parseInt(b);

function fix(input){
  // Recorrer chars del string; cada char se "des-encodea" a su byte cp1252 si aplica
  const bytes = [];
  for(const ch of input){
    const code = ch.codePointAt(0);
    if(code < 0x80){
      bytes.push(code); // ASCII puro
    } else if(code < 0x100){
      bytes.push(code); // Latin-1 simple
    } else if(charToCp1252[ch] !== undefined){
      bytes.push(charToCp1252[ch]); // cp1252 char especial
    } else {
      // No es mojibake: char válido fuera de cp1252 → conservar UTF-8
      const utf8 = Buffer.from(ch, 'utf8');
      for(const b of utf8) bytes.push(b);
    }
  }
  // Re-interpretar bytes como UTF-8
  try {
    return Buffer.from(bytes).toString('utf8');
  } catch(e){ return input; }
}

const file = process.argv[2] || 'index.html';
const raw = fs.readFileSync(file);
// Quitar BOM si lo hay
let str;
if(raw[0]===0xEF && raw[1]===0xBB && raw[2]===0xBF){
  str = raw.slice(3).toString('utf8');
} else {
  str = raw.toString('utf8');
}
const fixed = fix(str);
// Re-agregar BOM + escribir
fs.writeFileSync(file, Buffer.concat([Buffer.from([0xEF,0xBB,0xBF]), Buffer.from(fixed, 'utf8')]));
console.log('✓ Fixed:', file);
console.log('  Antes mojibake (Ã):', (str.match(/Ã/g)||[]).length);
console.log('  Después mojibake:', (fixed.match(/Ã[-ÿ]/g)||[]).length);
