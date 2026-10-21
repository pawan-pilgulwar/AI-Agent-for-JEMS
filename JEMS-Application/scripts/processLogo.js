const sharp = require('sharp');

const SRC = 'logoJems.png';
const OUT = 'public/logo.png';

// Background is a near-uniform off-white/cream. Chroma-key it out so the
// logo can sit on light or dark backgrounds, with spill decontamination so
// the anti-aliased edges don't keep a whitish halo.
const BG = [254, 252, 250];
const LOW = 10; // distance below this => fully transparent
const HIGH = 60; // distance above this => fully opaque

function dist(r, g, b) {
  const dr = r - BG[0];
  const dg = g - BG[1];
  const db = b - BG[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

async function main() {
  const { data, info } = await sharp(SRC)
    .trim({ threshold: 15 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const rgb = Buffer.alloc(width * height * 3);
  const alpha = Buffer.alloc(width * height);

  for (let i = 0; i < width * height; i++) {
    const si = i * channels;
    const r = data[si];
    const g = data[si + 1];
    const b = data[si + 2];
    const d = dist(r, g, b);

    let a;
    if (d <= LOW) a = 0;
    else if (d >= HIGH) a = 255;
    else a = Math.round(((d - LOW) / (HIGH - LOW)) * 255);

    const af = a / 255;
    let outR = r, outG = g, outB = b;
    if (a > 0 && a < 255 && af > 0.02) {
      // Spill decontamination: push the color away from the background,
      // proportional to how transparent this edge pixel still is.
      outR = BG[0] + (r - BG[0]) / af;
      outG = BG[1] + (g - BG[1]) / af;
      outB = BG[2] + (b - BG[2]) / af;
    }

    const di = i * 3;
    rgb[di] = Math.max(0, Math.min(255, outR));
    rgb[di + 1] = Math.max(0, Math.min(255, outG));
    rgb[di + 2] = Math.max(0, Math.min(255, outB));
    alpha[i] = a;
  }

  await sharp(rgb, { raw: { width, height, channels: 3 } })
    .joinChannel(alpha, { raw: { width, height, channels: 1 } })
    .png()
    .toFile(OUT);

  console.log(`Wrote ${OUT} (${width}x${height})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
