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
    let a;
    if (lum < 180) a = 0;                                    // viñeta gris → fuera
    else if (lum < 210) a = Math.round(((lum - 180) / 30) * 255);
    else a = 255;
    data[i+3] = a;
    // Conservar grises para que multiply preserve pliegues/costuras; subir brillo para que
    // el tinte quede vivo (los grises muy oscuros los llevamos a ~200).
    if (a > 30) {
      const v = Math.max(200, lum); // suelo 200 → shadow leve, sin ensuciar el color
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
