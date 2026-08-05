// Importa: fondos de juegos + trofeos + premios individuales, todos a WEBP optimizado.
const sharp = require('sharp'); const fs = require('fs'); const path = require('path');
const SRC_BASE = 'C:\\Users\\Cliente\\Downloads\\assets canchero leyenda';
async function conv(src, dst, w){ try { await sharp(src).resize(w,null,{fit:'inside'}).webp({quality:85}).toFile(dst); console.log('ok', path.basename(dst)); } catch(e){ console.log('ERR',dst,e.message); } }
(async ()=>{
  // Fondos juegos → img/games-bg/
  const bgDir = path.join(__dirname,'..','img','games-bg'); fs.mkdirSync(bgDir,{recursive:true});
  const bgMap = {
    'fondo canchero leyenda.png': 'leyenda.webp',
    'fondo juego trivia.png':     'trivia.webp',
    'fondo adivina el jugador.png':'adivina.webp',
    'fondo 11 ideal.png':         'once-ideal.webp',
    'fondo más o menos.png':      'higher-lower.webp',
    'fondo impostor.png':         'impostor.webp'
  };
  for (const [src,dst] of Object.entries(bgMap)){
    const s = path.join(SRC_BASE,'fondos juegos',src);
    if (fs.existsSync(s)) await conv(s, path.join(bgDir,dst), 1400);
    else console.log('miss bg',src);
  }
  // Trofeos → img/trofeos/ (limpio nombres a slug)
  const trDir = path.join(__dirname,'..','img','trofeos'); fs.mkdirSync(trDir,{recursive:true});
  const trMap = {
    'LaLiga.png':'laliga',
    'premiere league.png':'premier',
    'copa francia.webp':'ligue1',
    'copa italia.png':'coppa-italia',
    'copa portugal.png':'copa-portugal',
    'copa brasil.png':'copa-brasil',
    'cop argentina.png':'copa-argentina',
    'copa chile.png':'copa-chile',
    'campeonato uruguayo.png':'liga-uy',
    'champions league.png':'champions',
    'europa league.png':'europa',
    'copa libertadores.png':'libertadores',
    'copa sudamericana.png':'sudamericana',
    'mundial de clubes.png':'mundial-clubes',
    'intercontinental.png':'intercontinental',
    'copa america.png':'copa-america',
    'eurocopa.png':'eurocopa',
    'mundial.png':'mundial',
    'oro olimpico.webp':'oro-olimpico'
  };
  for (const [src,slug] of Object.entries(trMap)){
    const s = path.join(SRC_BASE,'trofeos',src);
    if (fs.existsSync(s)) await conv(s, path.join(trDir,slug+'.webp'), 300);
  }
  // Premios individuales → img/premios/
  const pDir = path.join(__dirname,'..','img','premios'); fs.mkdirSync(pDir,{recursive:true});
  const pMap = {
    'Balón_de_oro.png':'balon-oro',
    'Bota_de_oro.png':'bota-oro',
    'guante de oro.png':'guante-oro',
    'mejor jugador de la fifa.png':'fifa-mejor',
    'mejor jugador joven.png':'mejor-joven',
    'the best.png':'the-best'
  };
  for (const [src,slug] of Object.entries(pMap)){
    const s = path.join(SRC_BASE,'trofeos','premios individuales',src);
    if (fs.existsSync(s)) await conv(s, path.join(pDir,slug+'.webp'), 300);
  }
})();
