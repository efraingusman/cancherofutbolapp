const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, 'www');

// Create www directory if it doesn't exist
if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR);
}

// Archivos principales de la app — en orden de carga
const filesToCopy = [
    'index.html',
    'style.css',
    'script.js',
    'canchero-plus.js',
    'canchero-features.js',
    'canchero-app.js',
    'canchero-fase3.js',
    'canchero-notifications.js',
    'canchero-messaging.js',
    'canchero-live.js',
    'canchero-mundial.js',
    'canchero-achievements.js',
    'canchero-tournaments.js',
    'canchero-match-players.js',
    'canchero-match-pitch.js',
    'canchero-match-dashboard.js',
    'canchero-polls.js',
    'canchero-games-core.js',
    'canchero-games.js',
    'canchero-adivina.js',
    'canchero-once-ideal.js',
    'canchero-impostor.js',
    'canchero-swipe.js',
    'data.js',
    'manifest.json',
    'sw.js',
    'admin-crm.html',
    'crm.html',
    'encuesta.html',
    'admin-encuesta.html',
    // Imágenes nombradas limpiamente (no copiar duplicados ChatGPT)
    'logo.png',
    'logo-oficial.png',
    'bg-home.png',
    'bg-home-new.png',
    'bg-internal.png',
    'uruguay_map.png',
];

// Copy each file
filesToCopy.forEach(file => {
    const src = path.join(__dirname, file);
    const dest = path.join(BUILD_DIR, file);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`Copied ${file} to www/`);
    } else {
        console.warn(`Warning: File ${file} not found!`);
    }
});

// Copiar el logo oficial con nombre limpio (desde fuente original si no existe)
const logoOfficialDst = path.join(BUILD_DIR, 'logo-oficial.png');
if (!fs.existsSync(logoOfficialDst)) {
    const logoChatGPT = path.join(__dirname, 'ChatGPT Image 6 may 2026, 14_46_40-Photoroom.png');
    if (fs.existsSync(logoChatGPT)) {
        fs.copyFileSync(logoChatGPT, logoOfficialDst);
        console.log('Copied logo oficial → logo-oficial.png (from ChatGPT source)');
    }
}

// Copy games/ directory
const gamesDir = path.join(__dirname, 'games');
const gamesDest = path.join(BUILD_DIR, 'games');
if (fs.existsSync(gamesDir)) {
    if (!fs.existsSync(gamesDest)) fs.mkdirSync(gamesDest);
    fs.readdirSync(gamesDir).filter(f => f.endsWith('.html') || f.endsWith('.js') || f.endsWith('.png')).forEach(f => {
        fs.copyFileSync(path.join(gamesDir, f), path.join(gamesDest, f));
        console.log(`Copied games/${f} to www/games/`);
    });
}

// Copy img/ directory recursively (fotos de ciudades, etc.)
function copyDirRecursive(src, dest) {
    if (!fs.existsSync(src)) return;
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(item => {
        const srcPath = path.join(src, item);
        const destPath = path.join(dest, item);
        if (fs.statSync(srcPath).isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    });
}
const imgDir = path.join(__dirname, 'img');
if (fs.existsSync(imgDir)) {
    copyDirRecursive(imgDir, path.join(BUILD_DIR, 'img'));
    console.log('Copied img/ directory to www/img/');
}

// Copy api/ directory
const apiDir = path.join(__dirname, 'api');
const apiDest = path.join(BUILD_DIR, 'api');
if (fs.existsSync(apiDir)) {
    if (!fs.existsSync(apiDest)) fs.mkdirSync(apiDest);
    fs.readdirSync(apiDir).filter(f => f.endsWith('.js')).forEach(f => {
        fs.copyFileSync(path.join(apiDir, f), path.join(apiDest, f));
        console.log(`Copied api/${f} to www/api/`);
    });
}

console.log('Build completed successfully.');
