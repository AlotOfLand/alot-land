/**
 * optimize-images.mjs
 * Runs before `astro build` on every Netlify deploy.
 * Resizes any image in public/images/ that exceeds MAX_WIDTH to MAX_WIDTH px,
 * re-saves as JPEG at QUALITY%, and logs what it did.
 *
 * Each image is re-encoded in its OWN format (extension never changes), so the
 * optimized file is safe to commit back without breaking any /images/ reference.
 * Files already within the size limit are skipped instantly.
 */

import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { fileURLToPath } from 'url';

const MAX_WIDTH  = 1600;   // px — optimal for full-width listing photos
const MAX_HEIGHT = 1600;   // px — also cap portrait images
const QUALITY    = 85;     // JPEG/WebP quality (0–100)
const IMAGES_DIR = join(fileURLToPath(import.meta.url), '../../public/images');
const SUPPORTED  = new Set(['.jpg', '.jpeg', '.png', '.webp']);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(full));
    } else if (SUPPORTED.has(extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

async function processImage(filePath) {
  const ext = extname(filePath).toLowerCase();
  const img = sharp(filePath);
  const meta = await img.metadata();
  const { width, height } = meta;

  const needsResize = (width > MAX_WIDTH) || (height > MAX_HEIGHT);

  let pipeline = img;

  if (needsResize) {
    pipeline = pipeline.resize({
      width:  MAX_WIDTH,
      height: MAX_HEIGHT,
      fit:    'inside',          // maintains aspect ratio, never upscales
      withoutEnlargement: true,
    });
  }

  // Re-encode in the SAME format as the source extension — never rename a file,
  // so committing the result back can't break any /images/ reference.
  if (ext === '.png') {
    pipeline = pipeline.png({ compressionLevel: 9, palette: true });
  } else if (ext === '.webp') {
    pipeline = pipeline.webp({ quality: QUALITY });
  } else {
    pipeline = pipeline.jpeg({ quality: QUALITY, mozjpeg: true });
  }

  const before = (await stat(filePath)).size;
  const buf = await pipeline.toBuffer();
  const after = buf.length;

  // Only write back if we actually saved space (skip already-optimal files)
  if (after >= before && !needsResize) return { skipped: true, filePath };
  // If a resize was needed but re-encode somehow grew the file, still keep the
  // resized result only when it's genuinely smaller.
  if (after >= before) return { skipped: true, filePath };

  await sharp(buf).toFile(filePath);

  return {
    skipped: false,
    filePath,
    before: (before / 1024).toFixed(0),
    after:  (after  / 1024).toFixed(0),
    resized: needsResize,
    origDims: `${width}×${height}`,
  };
}

async function main() {
  console.log('🖼️  Optimizing images in public/images/ …\n');

  let files;
  try {
    files = await walk(IMAGES_DIR);
  } catch {
    console.log('No public/images directory found — skipping.\n');
    return;
  }

  if (files.length === 0) {
    console.log('No images found — skipping.\n');
    return;
  }

  let optimized = 0;
  let skipped   = 0;
  let errors    = 0;

  for (const file of files) {
    try {
      const result = await processImage(file);
      if (result.skipped) {
        skipped++;
      } else {
        optimized++;
        const tag = result.resized ? `resized ${result.origDims} →` : 'compressed';
        console.log(`  ✅ ${basename(file)}  [${tag} ${result.before}KB → ${result.after}KB]`);
      }
    } catch (err) {
      errors++;
      console.warn(`  ⚠️  ${basename(file)}: ${err.message}`);
    }
  }

  console.log(`\nDone — ${optimized} optimized, ${skipped} already optimal, ${errors} errors.\n`);
}

main();
