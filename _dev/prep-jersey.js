// Convierte la camiseta PNG (fondo negro) en una plantilla con fondo transparente.
// Método: umbral por luminancia — pixeles oscuros → alpha 0; sombras suaves de la camiseta
// (grises claros del pliegue) se conservan.
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SRC = 'C:\\Users\\Cliente\\Downloads\\assets canchero leyenda\\camisetas\\ChatGPT Image 3 ago 2026, 22_19_40.png';
const OUT = path.join(__dirname, '..', 'img', 'carrera', 'jersey-back.png');

(async () => {
  const img = sharp(SRC).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  // Umbral: si el pixel es oscuro (luminancia < 120), alpha=0. Si es intermedio, fade.
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i+1], b = data[i+2];
    const lum = 0.299*r + 0.587*g + 0.114*b;
    // Alpha DURO (binario): 0 o 255, sin banda de fade. Los bordes semi-transparentes
    // eran los que, al tintarse con la máscara, generaban un halo/resplandor feo alrededor
    // de la camiseta. Con corte duro no hay pixeles a medias → sin halo.
    const a = lum < 200 ? 0 : 255;
    data[i+3] = a;
    if (a) {
      const v = Math.max(205, lum); // grises claros para conservar pliegues bajo multiply
      data[i] = v; data[i+1] = v; data[i+2] = v;
    }
  }
  const buf = await sharp(data, { raw: { width, height, channels } })
    .trim({ threshold: 1 })
    .resize(480, 480, { fit: 'inside' })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, buf);
  console.log('OK →', OUT, buf.length, 'bytes');
})();
