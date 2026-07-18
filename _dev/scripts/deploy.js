#!/usr/bin/env node
/**
 * deploy.js — Script completo de deploy para Canchero App
 * Uso: node deploy.js [--apk] [--web]
 *   --apk  : También compila y sube el APK (tarda ~5min)
 *   --web  : Solo deploya web (default si no se pasa nada)
 *
 * Ejemplo: node deploy.js --apk --web
 */

const { execSync, exec } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SCRIPT_JS = path.join(ROOT, 'script.js');
const APK_SRC = path.join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');

const args = process.argv.slice(2);
const doApk = args.includes('--apk');
const doWeb = args.includes('--web') || !doApk;

console.log('\n🚀 CANCHERO DEPLOY SCRIPT');
console.log('─'.repeat(40));

async function run() {
    // ── 1. CAPACITOR SYNC ──────────────────────────────────────────────────────
    console.log('\n📱 [1/4] Sincronizando Capacitor...');
    try {
        execSync('npx cap sync android', { cwd: ROOT, stdio: 'inherit' });
        console.log('✅ Capacitor sync OK');
    } catch(e) {
        console.warn('⚠️  Cap sync falló:', e.message);
    }

    // ── 2. BUILD APK (opcional) ─────────────────────────────────────────────────
    if (doApk) {
        console.log('\n📦 [2/4] Compilando APK Android (puede tardar 3-5 min)...');
        try {
            execSync('cmd /c gradlew.bat assembleDebug', {
                cwd: path.join(ROOT, 'android'),
                stdio: 'inherit',
                timeout: 600000
            });
            console.log('✅ APK compilado: ' + APK_SRC);

            // Copy to root
            fs.copyFileSync(APK_SRC, path.join(ROOT, 'canchero.apk'));
            console.log('✅ APK copiado a raíz del proyecto');

            // Upload to gofile.io
            console.log('\n☁️  Subiendo APK a gofile.io...');
            const apkUrl = await uploadApkToGofile(path.join(ROOT, 'canchero.apk'));
            if (apkUrl) {
                console.log('✅ APK disponible en:', apkUrl);
                updateApkLink(apkUrl);
            }
        } catch(e) {
            console.error('❌ Error compilando APK:', e.message);
        }
    } else {
        console.log('\n📦 [2/4] Saltando build APK (usá --apk para compilar)');
    }

    // ── 3. BUILD WEB ────────────────────────────────────────────────────────────
    if (doWeb) {
        console.log('\n🌐 [3/4] Construyendo archivos web...');
        try {
            execSync('node build.js', { cwd: ROOT, stdio: 'inherit' });
            console.log('✅ Build web OK');
        } catch(e) {
            console.error('❌ Build falló:', e.message);
            process.exit(1);
        }

        // ── 4. DEPLOY VERCEL ──────────────────────────────────────────────────
        console.log('\n🚀 [4/4] Deploying a Vercel...');
        try {
            execSync('npx vercel --prod --yes', { cwd: ROOT, stdio: 'inherit' });
            console.log('\n✅ Deploy completado → https://canchero-app.vercel.app');
        } catch(e) {
            console.error('❌ Deploy falló:', e.message);
        }
    }

    console.log('\n' + '─'.repeat(40));
    console.log('🎉 Listo!\n');
}

function uploadApkToGofile(apkPath) {
    return new Promise((resolve) => {
        // Get best server first
        https.get({ hostname: 'api.gofile.io', path: '/servers', rejectUnauthorized: false }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                try {
                    const info = JSON.parse(d);
                    const server = info.data?.servers?.[0]?.name || 'store1';
                    _doUpload(server, apkPath, resolve);
                } catch(e) {
                    _doUpload('store1', apkPath, resolve);
                }
            });
        }).on('error', () => _doUpload('store1', apkPath, resolve));
    });
}

function _doUpload(server, apkPath, resolve) {
    const fileSize = fs.statSync(apkPath).size;
    const fileStream = fs.createReadStream(apkPath);
    const boundary = 'BOUNDARY_CANCHERO_APK';
    const header = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="canchero.apk"\r\nContent-Type: application/octet-stream\r\n\r\n`);
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);

    const options = {
        hostname: server + '.gofile.io',
        path: '/contents/uploadfile',
        method: 'POST',
        rejectUnauthorized: false,
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': header.length + fileSize + footer.length
        }
    };

    const req = https.request(options, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
            try {
                const result = JSON.parse(d);
                if (result.status === 'ok' && result.data?.downloadPage) {
                    resolve(result.data.downloadPage);
                } else {
                    console.warn('GoFile upload response:', d.slice(0,200));
                    resolve(null);
                }
            } catch(e) { resolve(null); }
        });
    });
    req.on('error', e => { console.warn('Upload error:', e.message); resolve(null); });
    req.write(header);
    let uploaded = 0;
    fileStream.on('data', chunk => {
        uploaded += chunk.length;
        const pct = Math.round(uploaded / fileSize * 100);
        process.stdout.write(`\r   Subiendo... ${pct}% (${Math.round(uploaded/1024/1024)}MB/${Math.round(fileSize/1024/1024)}MB)`);
    });
    fileStream.pipe(req, { end: false });
    fileStream.on('end', () => req.write(footer, () => req.end()));
}

function updateApkLink(url) {
    let code = fs.readFileSync(SCRIPT_JS, 'utf8');
    // Update the gofile link
    code = code.replace(/window\.open\('https:\/\/gofile\.io\/d\/[^']+'/g, `window.open('${url}'`);
    fs.writeFileSync(SCRIPT_JS, code);
    console.log('✅ Link APK actualizado en script.js →', url);
}

run().catch(e => { console.error(e); process.exit(1); });
