#!/usr/bin/env node
// Build favicons from a source image with proper transparency.
// 1. Detect bbox of opaque pixels (alpha > 16).
// 2. Crop to bbox + small padding for anti-aliased edges.
// 3. Pad to square (longer side wins, transparent fill on the shorter axis).
// 4. Emit each favicon size.

import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = process.argv[2] || '/Users/davidastone/Desktop/AlotDotLand/_Claude/timeauditGOLDFavicon2.png';
const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'public');
mkdirSync(outDir, { recursive: true });

console.log(`Source: ${src}`);

// Step 1 — find bbox of opaque pixels.
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
if (C !== 4) {
  console.error('Expected 4-channel RGBA source.');
  process.exit(1);
}

let top = H, bottom = 0, left = W, right = 0;
const ALPHA_THRESHOLD = 16;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const a = data[(y * W + x) * C + 3];
    if (a > ALPHA_THRESHOLD) {
      if (y < top) top = y;
      if (y > bottom) bottom = y;
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }
}
if (top >= bottom || left >= right) {
  console.error('No opaque pixels found in source.');
  process.exit(1);
}

// Add small padding so anti-aliased edges aren't clipped.
const PAD = 4;
top    = Math.max(0,     top    - PAD);
bottom = Math.min(H - 1, bottom + PAD);
left   = Math.max(0,     left   - PAD);
right  = Math.min(W - 1, right  + PAD);

const cropW = right - left + 1;
const cropH = bottom - top + 1;
console.log(`Content bbox: ${cropW}×${cropH} (full canvas ${W}×${H})`);

// Step 2 — extract bbox.
const cropped = await sharp(src)
  .ensureAlpha()
  .extract({ left, top, width: cropW, height: cropH })
  .png()
  .toBuffer();

// Step 3 — pad to square (longer side wins, transparent fill).
const side = Math.max(cropW, cropH);
const square = await sharp(cropped)
  .resize(side, side, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

// Step 4 — emit each size.
const sizes = [
  ['favicon-32.png', 32],
  ['favicon-192.png', 192],
  ['favicon-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['brand-mark.png', 256],
];

for (const [name, size] of sizes) {
  const out = join(outDir, name);
  await sharp(square)
    .resize(size, size, { fit: 'contain' })
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`  → ${name} (${size}×${size})`);
}

console.log('Done.');
