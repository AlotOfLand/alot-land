/**
 * gen-og-stamps.mjs — one-off generator for social-share status overlays.
 *
 * Renders four transparent 1200x630 PNG overlays (SOLD / UNDER CONTRACT /
 * COMING SOON / AVAILABLE) so they can be composited onto a listing's photo at
 * build time WITHOUT any font rendering on the build server (text is baked in
 * here, where fonts are available). Re-run locally only if the design changes:
 *   node scripts/gen-og-stamps.mjs
 */
import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

const OUT = join(fileURLToPath(import.meta.url), '../../public/og-stamps');

const W = 1200, H = 630;
const scrim = `<rect width="${W}" height="${H}" fill="black" fill-opacity="0.42"/>`;

// Big rotated stamp (one or two lines)
function stamp(lines, color, fontSize, boxW, boxH, letterSpacing = 6) {
  const cx = W / 2, cy = H / 2;
  const lineEls = lines.map((t, i) =>
    `<text x="${cx}" y="${cy + (i - (lines.length - 1) / 2) * (fontSize * 0.92) + fontSize * 0.33}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="900" fill="${color}" text-anchor="middle" letter-spacing="${letterSpacing}">${t}</text>`
  ).join('');
  return `
    <g transform="rotate(-12 ${cx} ${cy})">
      <rect x="${cx - boxW / 2}" y="${cy - boxH / 2}" width="${boxW}" height="${boxH}" rx="18" fill="none" stroke="${color}" stroke-width="14"/>
      ${lineEls}
    </g>`;
}

// Small corner pill (for AVAILABLE — no big stamp, just a label)
function pill(text, color) {
  return `
    <rect x="44" y="44" width="${56 + text.length * 26}" height="74" rx="37" fill="${color}"/>
    <text x="${44 + (56 + text.length * 26) / 2}" y="92" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="800" fill="white" text-anchor="middle" letter-spacing="2">${text}</text>`;
}

const overlays = {
  'sold':           `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${scrim}${stamp(['SOLD'], '#DC2626', 150, 540, 210, 10)}</svg>`,
  'coming-soon':    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${scrim}${stamp(['COMING SOON'], '#3B82F6', 76, 780, 160, 4)}</svg>`,
  'under-contract': `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${scrim}${stamp(['UNDER', 'CONTRACT'], '#EAB308', 82, 780, 250, 4)}</svg>`,
  'available':      `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${pill('AVAILABLE', '#3CB054')}</svg>`,
};

await mkdir(OUT, { recursive: true });
for (const [name, svg] of Object.entries(overlays)) {
  await sharp(Buffer.from(svg)).png().toFile(join(OUT, `${name}.png`));
  console.log(`  ✅ ${name}.png`);
}
console.log('Done.');
