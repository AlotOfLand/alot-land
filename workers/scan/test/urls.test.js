/**
 * Parameter-contract tests — the tripwire for Redfin grammar drift
 * (ported conceptually from redfin-comps tests/urls.test.ts per HANDOFF §5).
 */
import { describe, it, expect } from 'vitest';
import { gisCsvUrl, UIPT, SOLD_ONLY } from '../lib/redfin.js';

const POLY = '-112.25 33.35,-111.90 33.35,-111.90 33.60,-112.25 33.60,-112.25 33.35';

function params(url) {
  return new URL(url).searchParams;
}

describe('gisCsvUrl contract', () => {
  it('targets the gis-csv endpoint with the cargo-culted invariants', () => {
    const u = gisCsvUrl({ poly: POLY, statuses: { active: true } });
    expect(u.startsWith('https://www.redfin.com/stingray/api/gis-csv?')).toBe(true);
    const p = params(u);
    expect(p.get('al')).toBe('1');
    expect(p.get('sf')).toBe('1,2,3,5,6,7');
    expect(p.get('v')).toBe('8');
    expect(p.get('num_homes')).toBe('350');
    expect(p.get('uipt')).toBe(String(UIPT.multifamily));
  });

  it('ORs active-family status bits (1|2|4|128 = 135)', () => {
    const u = gisCsvUrl({
      poly: POLY,
      statuses: { active: true, contingent: true, comingsoon: true, pending: true },
    });
    expect(params(u).get('status')).toBe('135');
  });

  it('sold-only uses the special bit 8 + sold_within_days', () => {
    const u = gisCsvUrl({ poly: POLY, statuses: { sold: true }, soldWithinDays: 365 });
    const p = params(u);
    expect(p.get('status')).toBe(String(SOLD_ONLY));
    expect(p.get('sold_within_days')).toBe('365');
  });

  it('rejects invalid sold windows (only the verified set is honored)', () => {
    expect(() => gisCsvUrl({ poly: POLY, statuses: { sold: true }, soldWithinDays: 42 })).toThrow();
  });

  it('price bands are whole dollars', () => {
    const u = gisCsvUrl({ poly: POLY, statuses: { active: true }, minPrice: 600001, maxPrice: 900000.7 });
    const p = params(u);
    expect(p.get('min_price')).toBe('600001');
    expect(p.get('max_price')).toBe('900001');
  });

  it('polygon is passed through and no region params leak in', () => {
    const u = gisCsvUrl({ poly: POLY, statuses: { active: true } });
    const p = params(u);
    expect(p.get('poly')).toBe(POLY);
    expect(p.get('region_id')).toBeNull();
    expect(p.get('region_type')).toBeNull();
  });

  it('never emits beds/units params — Redfin silently ignores them for uipt=4', () => {
    const u = gisCsvUrl({ poly: POLY, statuses: { active: true } });
    const p = params(u);
    for (const k of ['min_beds', 'max_beds', 'min_units', 'num_units', 'unit_count']) {
      expect(p.get(k)).toBeNull();
    }
  });
});
