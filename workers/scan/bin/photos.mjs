#!/usr/bin/env node
/**
 * Photo backfill: fetch listing photos for scraped deals that don't have any,
 * store them in Supabase Storage, save URLs on the deal row.
 *
 * Usage:
 *   node bin/photos.mjs                          # up to 25 deals, gentle pace
 *   node bin/photos.mjs --limit 25 --gap 10000   # slower still
 *   node bin/photos.mjs --photos-per 1           # fewest requests per deal
 *
 * Listing PAGES are more aggressively protected than the CSV endpoint
 * (learned live: a burst of ~30 page+image requests drew a challenge). So on
 * top of the global 1.5s politeFetch gap, this waits `--gap` ms (±30% spread,
 * default 8s) between DEALS, defaults to small batches, and fetches only
 * `--photos-per` images (default 2). On a challenge: stop, wait an hour+,
 * re-run — already-photographed deals are never re-fetched.
 */
import { politeFetch } from '../lib/redfin.js';
import { extractPhotoUrls, looksLikeChallenge } from '../lib/photos.js';
import { makeDb } from '../lib/db.js';

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const LIMIT = Number(arg('limit', 25));
const GAP_MS = Number(arg('gap', 8000));
const PHOTOS_PER = Number(arg('photos-per', 2));
const MAX_CONSECUTIVE_MISSES = 5;
const BUCKET = 'photos';

// Gentle spacing between deals: GAP_MS ±30%. This is politeness (avoid
// bursts), not evasion — headers/identity are unchanged.
function pause() {
  const jitter = GAP_MS * 0.3 * (Math.random() * 2 - 1);
  return new Promise((r) => setTimeout(r, Math.max(0, GAP_MS + jitter)));
}

const db = makeDb();
const orgId = await db.resolveOrgId();

const { data: deals, error } = await db.supabase
  .from('deals')
  .select('id, address, listing_url')
  .eq('org_id', orgId)
  .eq('source', 'redfin')
  .is('photo_url', null)
  .not('listing_url', 'is', null)
  .limit(LIMIT);
if (error) throw error;

console.log(`Photo backfill: ${deals.length} deals need photos (limit ${LIMIT})`);

let done = 0;
let misses = 0;
let consecutiveMisses = 0;

for (const deal of deals) {
  await pause();
  let pageRes;
  try {
    pageRes = await politeFetch(deal.listing_url);
  } catch (e) {
    console.warn(`  ! ${deal.address}: fetch failed (${e.message ?? e})`);
    consecutiveMisses++;
    if (consecutiveMisses >= MAX_CONSECUTIVE_MISSES) break;
    continue;
  }
  const html = pageRes.ok ? await pageRes.text() : null;
  if (!html || looksLikeChallenge(html)) {
    console.warn(`  ! ${deal.address}: challenge/empty page`);
    misses++;
    consecutiveMisses++;
    if (consecutiveMisses >= MAX_CONSECUTIVE_MISSES) {
      console.error(`\n✗ ${MAX_CONSECUTIVE_MISSES} consecutive misses — assuming a block. Stopping (no retries).`);
      console.error('  Wait at least an hour, then re-run — finished deals are never re-fetched.');
      process.exit(2);
    }
    continue;
  }

  const urls = extractPhotoUrls(html, PHOTOS_PER);
  if (!urls.length) {
    console.warn(`  – ${deal.address}: no photos found on page`);
    misses++;
    consecutiveMisses++;
    if (consecutiveMisses >= MAX_CONSECUTIVE_MISSES) {
      console.error(`\n✗ ${MAX_CONSECUTIVE_MISSES} consecutive misses — assuming a block. Stopping.`);
      process.exit(2);
    }
    continue;
  }
  consecutiveMisses = 0;

  const stored = [];
  for (let i = 0; i < urls.length; i++) {
    try {
      const imgRes = await politeFetch(urls[i]);
      if (!imgRes.ok) continue;
      const buf = Buffer.from(await imgRes.arrayBuffer());
      if (buf.length < 2048) continue; // tracking pixel / error stub
      const path = `deals/${deal.id}/${i}.jpg`;
      const { error: upErr } = await db.supabase.storage
        .from(BUCKET)
        .upload(path, buf, { contentType: 'image/jpeg', upsert: true });
      if (upErr) {
        console.warn(`  ! upload failed: ${upErr.message}`);
        continue;
      }
      const { data: pub } = db.supabase.storage.from(BUCKET).getPublicUrl(path);
      stored.push(pub.publicUrl);
    } catch {
      // one bad image is not a stop signal
    }
  }

  if (stored.length) {
    await db.supabase
      .from('deals')
      .update({ photo_url: stored[0], photos: stored })
      .eq('id', deal.id);
    done++;
    console.log(`  ✓ ${deal.address}: ${stored.length} photo(s)`);
  } else {
    misses++;
  }
}

console.log(`\n✓ Backfill complete: ${done} deals photographed, ${misses} without photos.`);
