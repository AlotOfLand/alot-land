#!/usr/bin/env node
/**
 * Morning deals digest — new leads since the last cycle, emailed via
 * GoHighLevel (LeadConnector API v2), with a preview mode that sends nothing.
 *
 * Usage:
 *   node bin/digest.mjs                       # preview: writes digest-preview.html, prints text
 *   node bin/digest.mjs --transport ghl       # actually send via GHL
 *   node bin/digest.mjs --hours 26 --to you@example.com
 *
 * Env (add to workers/scan/.env for GHL sending):
 *   GHL_API_KEY      Private Integration token (Settings → Private Integrations;
 *                    scopes: contacts.write, conversations/message.write)
 *   GHL_LOCATION_ID  Settings → Business Profile → Location ID
 *   DIGEST_TO        recipient (default david@alot.land)
 *   APP_URL          default https://mfda.alot.land
 *
 * NOTE: the GHL calls follow LeadConnector v2 docs but are untested until the
 * first live run — if GHL returns an error, the full response body is printed;
 * paste it into the build chat and we'll adjust.
 */
import { writeFile } from 'node:fs/promises';
import { buildDigest } from '../lib/digest.js';
import { makeDb } from '../lib/db.js';

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const HOURS = Number(arg('hours', 26));
const TRANSPORT = String(arg('transport', 'stdout'));
const TO = String(arg('to', process.env.DIGEST_TO || 'david@alot.land'));
const APP_URL = process.env.APP_URL || 'https://mfda.alot.land';

const db = makeDb();
const orgId = await db.resolveOrgId();
const since = new Date(Date.now() - HOURS * 3600 * 1000).toISOString();

// New leads created inside the window (created_at, NOT scanned_at — re-scans
// refresh scanned_at on old rows and would flood the digest).
const { data: deals, error } = await db.supabase
  .from('deals')
  .select('id, address, city, state, price, unit_bucket, beds_total, year_built, days_on_market, photo_url, created_at')
  .eq('org_id', orgId)
  .eq('status', 'lead')
  .gte('created_at', since)
  .order('price', { ascending: true })
  .limit(50);
if (error) throw error;

// Attach listing agents where captured.
const ids = deals.map((d) => d.id);
if (ids.length) {
  const { data: contacts } = await db.supabase
    .from('contacts')
    .select('deal_id, owner_name, brokerage, phone')
    .eq('org_id', orgId)
    .eq('source', 'listing')
    .in('deal_id', ids);
  const byDeal = new Map((contacts || []).map((c) => [c.deal_id, c]));
  for (const d of deals) d.agent = byDeal.get(d.id) || null;
}

const { data: scanRuns } = await db.supabase
  .from('scan_runs')
  .select('market, ok, blocked, rows_active, rows_sold, requests_made, capped_bands, started_at')
  .eq('org_id', orgId)
  .gte('started_at', since)
  .order('started_at', { ascending: false });

const digest = buildDigest({ deals, scanRuns: scanRuns || [], appUrl: APP_URL, windowHours: HOURS });
console.log(`Digest: ${digest.count} new leads · subject: "${digest.subject}"`);

if (TRANSPORT === 'stdout') {
  await writeFile('digest-preview.html', digest.html);
  console.log('\n--- text version ---\n' + digest.text);
  console.log('\nHTML preview written to digest-preview.html — run:  open digest-preview.html');
  process.exit(0);
}

if (TRANSPORT !== 'ghl') {
  console.error(`Unknown transport "${TRANSPORT}" (use stdout | ghl)`);
  process.exit(1);
}

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
if (!GHL_API_KEY || !GHL_LOCATION_ID) {
  console.error('Set GHL_API_KEY and GHL_LOCATION_ID in .env (see file header).');
  process.exit(1);
}
const GHL = 'https://services.leadconnectorhq.com';
const headers = {
  Authorization: `Bearer ${GHL_API_KEY}`,
  Version: '2021-07-28',
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

async function ghl(path, body) {
  const res = await fetch(`${GHL}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    console.error(`✗ GHL ${path} → HTTP ${res.status}`);
    console.error(JSON.stringify(json, null, 2).slice(0, 2000));
    process.exit(1);
  }
  return json;
}

// 1. Upsert the recipient as a contact (idempotent).
const up = await ghl('/contacts/upsert', { locationId: GHL_LOCATION_ID, email: TO });
const contactId = up?.contact?.id || up?.id;
if (!contactId) {
  console.error('✗ Could not resolve contact id from GHL response:');
  console.error(JSON.stringify(up, null, 2).slice(0, 1500));
  process.exit(1);
}

// 2. Send the email message.
await ghl('/conversations/messages', {
  type: 'Email',
  contactId,
  subject: digest.subject,
  html: digest.html,
});

await db.logCost(orgId, `digest email via GHL: ${digest.count} leads to ${TO}`);
console.log(`✓ Sent to ${TO} via GoHighLevel.`);
