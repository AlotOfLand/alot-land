/**
 * Recursive price-band splitting — beats the 350-row cap with no pagination.
 * (HANDOFF §3.1: bands are disjoint and honored; a single split is NOT enough
 * in Phoenix — the upper band re-capped and needed further division.)
 *
 * Strategy: pull a band; if rows >= cap, bisect at the band midpoint and
 * recurse. Stop at MAX_DEPTH or when a band narrows below MIN_BAND_WIDTH, then
 * RECORD the shortfall (cappedBands) — never pretend completeness.
 */
import { NUM_HOMES_CAP } from './redfin.js';

export const MAX_DEPTH = 6;
export const MIN_BAND_WIDTH = 10_000;
// Practical ceiling for the open-ended top band (max seen: $125M listings).
export const PRICE_CEILING = 200_000_000;

/**
 * fetchBand(minPrice, maxPrice) → { ok, blocked, listings } (listings parsed).
 * Returns {
 *   listings, requests, cappedBands, blocked,
 *   bands: [{min,max,rows,capped}]  // audit trail for scan_runs.notes
 * }
 * Stops immediately on a blocked response (block = stop signal, not retry).
 */
export async function pullWithBands(fetchBand, opts = {}) {
  const maxDepth = opts.maxDepth ?? MAX_DEPTH;
  const minWidth = opts.minBandWidth ?? MIN_BAND_WIDTH;
  const cap = opts.cap ?? NUM_HOMES_CAP;

  const all = [];
  const bands = [];
  let requests = 0;
  let cappedBands = 0;
  let blocked = false;

  async function recurse(min, max, depth) {
    if (blocked) return;
    const res = await fetchBand(min, max);
    requests++;
    if (res.blocked) {
      blocked = true;
      return;
    }
    if (!res.ok) {
      // Transient failure on one band: record, move on. Caller sees requests
      // vs bands mismatch in the audit trail.
      bands.push({ min, max, rows: -1, capped: false });
      return;
    }
    const rows = res.listings.length;
    const capped = rows >= cap;
    if (!capped) {
      bands.push({ min, max, rows, capped: false });
      all.push(...res.listings);
      return;
    }
    const width = max - min;
    if (depth >= maxDepth || width < minWidth) {
      // Can't split further — take what we got and record the shortfall.
      bands.push({ min, max, rows, capped: true });
      all.push(...res.listings);
      cappedBands++;
      return;
    }
    const mid = Math.floor(min + width / 2);
    await recurse(min, mid, depth + 1);
    await recurse(mid + 1, max, depth + 1);
  }

  await recurse(opts.floor ?? 0, opts.ceiling ?? PRICE_CEILING, 0);
  return { listings: all, requests, cappedBands, blocked, bands };
}
