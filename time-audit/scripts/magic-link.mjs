#!/usr/bin/env node
// Generate a one-time magic-link sign-in URL via Supabase Admin API.
// Bypasses email entirely — useful when SMTP is rate-limited.
//
// Usage:
//   node scripts/magic-link.mjs
// Then paste your NEW service_role / sb_secret_... key when prompted.

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const envText = (() => {
  try { return readFileSync(join(here, '..', '.env.local'), 'utf8'); }
  catch { return ''; }
})();

const env = Object.fromEntries(
  envText.split('\n').filter(Boolean).map((line) => {
    const i = line.indexOf('=');
    return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
  })
);

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const EMAIL = env.VITE_ALLOWED_EMAIL;

if (!SUPABASE_URL || !EMAIL) {
  console.error('Could not find VITE_SUPABASE_URL / VITE_ALLOWED_EMAIL in .env.local');
  process.exit(1);
}

console.log(`\nGenerating magic-link for ${EMAIL} at ${SUPABASE_URL}`);
console.log('Get the key from: Supabase → Project Settings → API → service_role (Reveal)\n');

const rl = createInterface({ input, output, terminal: true });
const KEY = (await rl.question('Paste service_role key, then press Enter:\n> ')).trim();
rl.close();

if (!KEY || KEY.length < 40) {
  console.error('\nThat does not look like a valid key. Aborting.');
  process.exit(1);
}

const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
  method: 'POST',
  headers: {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'magiclink',
    email: EMAIL,
    options: { redirect_to: 'http://localhost:5174' },
  }),
});

const data = await res.json();

if (!res.ok || !data.action_link) {
  console.error('\nFailed to generate link. Response:');
  console.error(data);
  process.exit(1);
}

console.log('\n✓ Success!\n');
console.log('Paste this URL into your browser to sign in:\n');
console.log(data.action_link);
console.log('\n(One-time use. Expires in ~1 hour.)\n');
