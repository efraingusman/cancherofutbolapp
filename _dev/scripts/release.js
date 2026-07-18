// ════════════════════════════════════════════════════════════════════════════
// CANCHERO RELEASE PIPELINE
// 1. Bump SW cache version
// 2. Build www/
// 3. Capacitor sync android
// 4. Build APK (debug, signed)
// 5. Upload APK a gofile.io
// 6. Update URL en script.js
// 7. Deploy a Vercel
// ════════════════════════════════════════════════════════════════════════════
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = (() => {
  try { return require('form-data'); } catch(e){ return null; }
})();

const ROOT = __dirname;
const SW_PATH = path.join(ROOT, 'sw.js');
const SCRIPT_PATH = path.join(ROOT, 'script.js');
const APK_PATH_OUT = path.join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const APK_DEST = path.join(ROOT, 'canchero.apk');

function log(msg, color='\x1b[36m'){ console.log(color + '▶ ' + msg + '\x1b[0m'); }
function ok(msg){ console.log('\x1b[32m✓ ' + msg + '\x1b[0m'); }
function err(msg){ console.error('\x1b[31m✗ ' + msg + '\x1b[0m'); }

// 1. Bump SW cache
function bumpCache(){
  log('Bump SW cache version...');
  let sw = fs.readFileSync(SW_PATH, 'utf8');
  const m = sw.match(/canchero-v(\d+)/);
  if(!m){ err('No version found in sw.js'); process.exit(1); }
  const next = parseInt(m[1]) + 1;
  sw = sw.replace(/canchero-v\d+/, `canchero-v${next}`);
  fs.writeFileSync(SW_PATH, sw);
  ok(`Cache → canchero-v${next}`);
  return next;
}

// 2. Build www/
function buildWeb(){
  log('Building www/...');
  execSync('node build.js', { cwd: ROOT, stdio:'inherit' });
  ok('www/ built');
}

// 3. Cap sync
function capSync(){
  log('Capacitor sync android...');
  execSync('npx cap sync android', { cwd: ROOT, stdio:'inherit' });
  ok('Capacitor synced');
}

// 4. Build APK
function buildApk(){
  log('Building APK (gradle assembleDebug)...');
  const gradlew = path.join(ROOT, 'android', 'gradlew.bat');
  try {
    execSync(`"${gradlew}" assembleDebug`, { cwd: path.join(ROOT,'android'), stdio:'inherit' });
  } catch(e) {
    err('Gradle build failed: ' + e.message); process.exit(1);
  }
  if(!fs.existsSync(APK_PATH_OUT)){ err('APK not found at ' + APK_PATH_OUT); process.exit(1); }
  fs.copyFileSync(APK_PATH_OUT, APK_DEST);
  const size = (fs.statSync(APK_DEST).size / 1024 / 1024).toFixed(1);
  ok(`APK built: ${size} MB → ${APK_DEST}`);
}

// 5. Upload a gofile.io
async function uploadGofile(){
  log('Fetching gofile server...');
  const server = await new Promise((resolve, reject) => {
    https.get('https://api.gofile.io/servers', { rejectUnauthorized:false }, (res) => {
      let body=''; res.on('data', d=>body+=d); res.on('end', () => {
        try { const j = JSON.parse(body); resolve(j.data.servers[0].name); } catch(e){ reject(e); }
      });
    }).on('error', reject);
  });
  ok('Server: ' + server);

  log('Uploading APK via curl (this takes ~1 min)...');
  const r = spawnSync('curl.exe', ['-k', '-X', 'POST', `https://${server}.gofile.io/contents/uploadfile`, '-F', `file=@${APK_DEST}`, '--max-time', '600'], { encoding:'utf8' });
  if(r.status !== 0){ err('Upload failed: ' + r.stderr); process.exit(1); }
  let json;
  try {
    const lines = r.stdout.split('\n').filter(l => l.trim().startsWith('{'));
    json = JSON.parse(lines[lines.length-1]);
  } catch(e){ err('Bad JSON from gofile: ' + r.stdout.slice(-500)); process.exit(1); }
  const code = json.data && json.data.parentFolderCode;
  if(!code){ err('No download code'); process.exit(1); }
  const url = `https://gofile.io/d/${code}`;
  ok('Uploaded: ' + url);
  return url;
}

// 6. Update URL en script.js
function updateApkUrl(newUrl){
  log('Updating APK URL in script.js...');
  let s = fs.readFileSync(SCRIPT_PATH, 'utf8');
  s = s.replace(/https:\/\/gofile\.io\/d\/[A-Za-z0-9]+/g, newUrl);
  fs.writeFileSync(SCRIPT_PATH, s);
  ok('URL updated: ' + newUrl);
}

// 7. Deploy a Vercel
function deployVercel(){
  log('Deploying to Vercel...');
  execSync('npx vercel --prod', { cwd: ROOT, stdio:'inherit' });
  ok('Deployed to Vercel');
}

// ─── RUN ─────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n\x1b[1m\x1b[33m╔══════════════════════════════════════════╗');
  console.log('║   CANCHERO RELEASE — Web + APK pipeline   ║');
  console.log('╚══════════════════════════════════════════╝\x1b[0m\n');
  const start = Date.now();

  try {
    bumpCache();
    buildWeb();
    capSync();
    buildApk();
    const url = await uploadGofile();
    updateApkUrl(url);
    // Re-build www (porque cambió script.js con la URL nueva) y redeploy
    buildWeb();
    deployVercel();

    const mins = ((Date.now() - start) / 60000).toFixed(1);
    console.log('\n\x1b[1m\x1b[32m✅ RELEASE COMPLETO — ' + mins + ' min\x1b[0m');
    console.log('\x1b[1m   APK: ' + url + '\x1b[0m');
    console.log('\x1b[1m   Web: https://canchero-app.vercel.app\x1b[0m\n');
  } catch(e){
    err('Pipeline falló: ' + e.message);
    process.exit(1);
  }
})();
