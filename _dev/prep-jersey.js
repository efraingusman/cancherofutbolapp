// Convierte la camiseta PNG (line-art: contorno negro sobre fondo blanco) en una
// plantilla con fondo transparente. Estrategia: flood-fill desde las 4 esquinas por
// pixeles claros → esos son FONDO (alpha 0). El resto (interior + contorno) queda
// visible: interior blanco puro (para tintar con multiply), contorno negro (costuras).
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SRC = 'C:\\Users\\Cliente\\Downloads\\assets canchero leyenda\\camisetas\\camiseta nueva.png';
const OUT = path.join(__dirname, '..', 'img', 'carrera', 'jersey-back.png');

(async () => {
  const img = sharp(SRC).ensureAlpha().resize(720, 720, { fit: 'inside' });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const N = W * H;
  // Umbral: pixel "claro" = luminancia >= 220 (fondo o interior blanco)
  const lumAt = (i) => 0.299*data[i*C] + 0.587*data[i*C+1] + 0.114*data[i*C+2];
  const isLight = new Uint8Array(N);
  for (let p = 0; p < N; p++) isLight[p] = lumAt(p) >= 210 ? 1 : 0;

  // Flood-fill desde bordes: marca visitado los pixeles CLAROS conectados al borde.
  const bg = new Uint8Array(N);
  const stack = [];
  const push = (x, y) => { const p = y*W + x; if (!bg[p] && isLight[p]) { bg[p] = 1; stack.push(p); } };
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H-1); }
  for (let y = 0; y < H; y++) { push(0, y); push(W-1, y); }
  while (stack.length) {
    const p = stack.pop(); const x = p % W, y = (p - x) / W;
    if (x > 0)    push(x-1, y);
    if (x < W-1)  push(x+1, y);
    if (y > 0)    push(x, y-1);
    if (y < H-1)  push(x, y+1);
  }

  // Reescribir: fondo → alpha 0. Interior claro → blanco puro. Contorno oscuro → negro con alpha.
  for (let p = 0; p < N; p++) {
    const i = p*C;
    if (bg[p]) { data[i+3] = 0; continue; }
    const l = lumAt(p);
    if (l >= 210) {
      // INTERIOR: blanco puro → el CSS mask lo cubre y el multiply con color lo tinta limpio.
      data[i] = 255; data[i+1] = 255; data[i+2] = 255; data[i+3] = 255;
    } else if (l >= 120) {
      // Zona intermedia (anti-alias del contorno): gris según luminancia, alpha 255.
      data[i] = l; data[i+1] = l; data[i+2] = l; data[i+3] = 255;
    } else {
      // CONTORNO: negro, alpha 255 (se ve como costuras al tintar con multiply).
      data[i] = 20; data[i+1] = 20; data[i+2] = 20; data[i+3] = 255;
    }
  }
  const buf = await sharp(data, { raw: { width: W, height: H, channels: C } })
    .trim({ threshold: 1 })
    .resize(480, 480, { fit: 'inside' })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, buf);
  console.log('OK →', OUT, buf.length, 'bytes');
})();
