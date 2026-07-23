import { describe, it, expect } from 'vitest';
import { pullWithBands } from '../lib/bands.js';

/** Fake market: N listings uniformly priced; fetcher honors [min,max] and caps. */
function fakeMarket(prices, cap = 350) {
  return async (min, max) => {
    const inBand = prices.filter((p) => p >= min && p <= max);
    return {
      ok: true,
      blocked: false,
      listings: inBand.slice(0, cap).map((p) => ({ price: p })),
    };
  };
}

describe('pullWithBands', () => {
  it('single uncapped band returns everything in one request', async () => {
    const prices = Array.from({ length: 90 }, (_, i) => 100000 + i * 5000);
    const r = await pullWithBands(fakeMarket(prices), { ceiling: 10_000_000 });
    expect(r.listings).toHaveLength(90);
    expect(r.requests).toBe(1);
    expect(r.cappedBands).toBe(0);
  });

  it('splits recursively until every band is under the cap (Phoenix case)', async () => {
    // 1,000 listings spread over a wide range → must split multiple times.
    const prices = Array.from({ length: 1000 }, (_, i) => 100000 + i * 12000);
    const r = await pullWithBands(fakeMarket(prices), { ceiling: 100_000_000 });
    expect(r.listings.length).toBe(1000); // complete coverage, no silent loss
    expect(r.requests).toBeGreaterThan(3); // one split was provably not enough
    expect(r.cappedBands).toBe(0);
  });

  it('records still-capped bands instead of pretending completeness', async () => {
    // 400 identical-price listings: unsplittable by price banding.
    const prices = Array.from({ length: 400 }, () => 250000);
    const r = await pullWithBands(fakeMarket(prices), { ceiling: 1_000_000, maxDepth: 3 });
    expect(r.cappedBands).toBeGreaterThan(0); // shortfall is visible
    expect(r.listings.length).toBeGreaterThan(0); // took what it could
  });

  it('a block stops the pull immediately — no retries, no further bands', async () => {
    let calls = 0;
    const fetcher = async () => {
      calls++;
      return { ok: false, blocked: true, listings: [] };
    };
    const r = await pullWithBands(fetcher);
    expect(r.blocked).toBe(true);
    expect(calls).toBe(1);
  });

  it('a transient failure on one band is recorded, not fatal', async () => {
    let calls = 0;
    const fetcher = async (min, max) => {
      calls++;
      if (calls === 1) {
        // First call caps → forces a split; then one child errors.
        return { ok: true, blocked: false, listings: Array.from({ length: 350 }, () => ({ price: min + 1 })) };
      }
      if (calls === 2) return { ok: false, blocked: false, listings: [] };
      return { ok: true, blocked: false, listings: [{ price: max }] };
    };
    const r = await pullWithBands(fetcher, { ceiling: 1_000_000 });
    expect(r.blocked).toBe(false);
    expect(r.bands.some((b) => b.rows === -1)).toBe(true); // audit trail shows the failure
  });
});
