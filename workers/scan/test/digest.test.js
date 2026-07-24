import { describe, it, expect } from 'vitest';
import { buildDigest } from '../lib/digest.js';

const DEALS = [
  { id: 'a1', address: '123 Main St', city: 'Phoenix', state: 'AZ', price: 500000, unit_bucket: '2-4', beds_total: 8, year_built: 1975, days_on_market: 12, photo_url: 'https://x/p.jpg', agent: { owner_name: 'Jane Smith', phone: '602-555-0123' } },
  { id: 'b2', address: '9 Elm Ave', city: 'Nashville', state: 'TN', price: 750000, unit_bucket: '5+', beds_total: null, year_built: null, days_on_market: null, photo_url: null, agent: null },
];
const RUNS = [
  { market: 'phoenix', ok: true, blocked: false, rows_active: 220, rows_sold: 320, requests_made: 2, capped_bands: 0 },
  { market: 'nashville', ok: false, blocked: true, rows_active: 0, rows_sold: 0, requests_made: 1, capped_bands: 0 },
];

describe('buildDigest', () => {
  const d = buildDigest({ deals: DEALS, scanRuns: RUNS, appUrl: 'https://mfda.alot.land', windowHours: 26 });
  it('subject carries count and states', () => {
    expect(d.subject).toContain('2 new multifamily leads');
    expect(d.subject).toContain('AZ/TN');
  });
  it('html has one row per deal with app links and price', () => {
    expect(d.html).toContain('https://mfda.alot.land/deals/a1');
    expect(d.html).toContain('https://mfda.alot.land/deals/b2');
    expect(d.html).toContain('$500,000');
    expect(d.html).toContain('123 Main St');
  });
  it('shows the agent line when captured', () => {
    expect(d.html).toContain('Jane Smith');
    expect(d.html).toContain('602-555-0123');
  });
  it('health footer includes both runs incl. the block', () => {
    expect(d.html).toContain('phoenix: ok');
    expect(d.html).toContain('nashville: BLOCKED');
  });
  it('text version is plain and linked', () => {
    expect(d.text).toContain('- 123 Main St, Phoenix AZ');
    expect(d.text).toContain('/deals/a1');
  });
  it('escapes html in addresses', () => {
    const x = buildDigest({ deals: [{ ...DEALS[0], address: '<img src=x>' }], scanRuns: [], appUrl: 'https://a', windowHours: 26 });
    expect(x.html).not.toContain('<img src=x>');
    expect(x.html).toContain('&lt;img');
  });
  it('empty day still renders with health footer', () => {
    const e = buildDigest({ deals: [], scanRuns: RUNS, appUrl: 'https://a', windowHours: 26 });
    expect(e.subject).toContain('no new');
    expect(e.count).toBe(0);
    expect(e.html).toContain('phoenix: ok');
  });
});
