#!/usr/bin/env node
/**
 * Photo backfill: fetch listing photos for scraped deals that don't have any,
 * store them in Supabase Storage, save URLs on the deal row.
 *
 * Usage:
 *   node bin/photos.mjs                # backfill up to 100 deals
 *   node bin/photos.mjs --limit 250
 *
 * Same politeness rules as the scanner (1.5s global gap, browser UA, stop on
 * challenge). Photos are fetched ONCE per deal, ever — re-runs only process
 * deals with no stored photo.
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

const LIMIT = Number(arg('limit', 100));
const MAX_CONSECUTIVE_MISSES = 5;
const BUCKET = 'photos';

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
      process.exit(2);
    }
    continue;
  }

  const urls = extractPhotoUrls(html);
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
