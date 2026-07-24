#!/usr/bin/env node
/**
 * Rent-band importer — Zillow ZORI (zip-level, free public download).
 *
 * Usage:
 *   node bin/rents.mjs                       # download latest ZORI, import AZ+TN
 *   node bin/rents.mjs --states AZ,TN,AR
 *   node bin/rents.mjs --file ~/Downloads/Zip_zori_....csv   # use a local file
 *
 * Zillow refreshes monthly — re-run monthly (droplet cron later). Rows upsert
 * on (source, zip, period), so re-runs are idempotent and history accumulates.
 */
import { readFile } from 'node:fs/promises';
import { zoriToBands } from '../lib/rents.js';
import { makeDb } from '../lib/db.js';

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

// Zillow's stable research-data URL pattern. If Zillow renames the file,
// download it manually from zillow.com/research/data (Rentals → ZORI → ZIP)
// and pass --file.
const ZORI_URL =
  'https://files.zillowstatic.com/research/public_csvs/zori/Zip_zori_uc_sfrcondomfr_sm_sa_month.csv';

const states = String(arg('states', 'AZ,TN')).split(',').map((s) => s.trim()).filter(Boolean);
const file = arg('file', null);

let csvText;
if (file) {
  console.log(`Reading local file: ${file}`);
  csvText = await readFile(file, 'utf8');
} else {
  console.log(`Downloading ZORI zip-level CSV (~25MB)…`);
  const res = await fetch(ZORI_URL);
  if (!res.ok) {
    console.error(`✗ Download failed (HTTP ${res.status}).`);
    console.error('  Grab it manually from zillow.com/research/data (Rentals → ZORI → ZIP)');
    console.error('  then re-run with:  node bin/rents.mjs --file /path/to/that.csv');
    process.exit(1);
  }
  csvText = await res.text();
}

console.log(`Parsing (${(csvText.length / 1e6).toFixed(1)}MB) for states: ${states.join(', ')}`);
const { bands, skipped } = zoriToBands(csvText, states);
console.log(`  ${bands.length} zips with current rent · ${skipped} rows skipped`);
if (!bands.length) {
  console.error('✗ Nothing to import — check --states or the file.');
  process.exit(1);
}

const db = makeDb();
const orgId = await db.resolveOrgId();
const now = new Date().toISOString();
const rows = bands.map((b) => ({
  org_id: orgId,
  source: 'zori',
  zip: b.zip,
  state: b.state,
  period: b.period,
  bedrooms: -1,
  rent: b.rent,
  confidence: 'med',
  retrieved_at: now,
}));

// Chunked upserts (PostgREST payload limits).
const CHUNK = 500;
for (let i = 0; i < rows.length; i += CHUNK) {
  const { error } = await db.supabase
    .from('rent_bands')
    .upsert(rows.slice(i, i + CHUNK), { onConflict: 'org_id,source,zip,period,bedrooms' });
  if (error) {
    console.error('✗ upsert failed:', error.message);
    process.exit(1);
  }
  process.stdout.write(`  upserted ${Math.min(i + CHUNK, rows.length)}/${rows.length}\r`);
}
console.log('');
await db.logCost(orgId, `zori rent-band import: ${rows.length} zips (${states.join(',')})`);

const sample = rows.slice(0, 3).map((r) => `${r.zip}=$${r.rent}`).join(', ');
console.log(`✓ Imported ${rows.length} zip rent bands (period ${rows[0]?.period}). e.g. ${sample}`);
