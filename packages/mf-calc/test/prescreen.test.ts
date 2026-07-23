import { describe, it, expect } from 'vitest';
import { prescreen, hasKiller } from '../src/prescreen.js';

describe('deal-killer prescreen', () => {
  it('clean property returns no flags', () => {
    expect(prescreen({ year_built: 2005, master_metered: false, str_permit_status: 'open' })).toEqual([]);
  });
  it('zoning non-conforming is a killer', () => {
    const flags = prescreen({ zoning_legal_nonconforming: true });
    expect(hasKiller(flags)).toBe(true);
    expect(flags[0]!.code).toBe('zoning-nonconforming');
  });
  it('pre-1978 raises lead AND asbestos flags', () => {
    const flags = prescreen({ year_built: 1965 });
    const codes = flags.map((f) => f.code);
    expect(codes).toContain('lead-paint');
    expect(codes).toContain('asbestos');
  });
  it('1979 build raises asbestos but not lead', () => {
    const codes = prescreen({ year_built: 1979 }).map((f) => f.code);
    expect(codes).toContain('asbestos');
    expect(codes).not.toContain('lead-paint');
  });
  it('closed STR permit flags STR-to-$0', () => {
    const codes = prescreen({ str_permit_status: 'closed' }).map((f) => f.code);
    expect(codes).toContain('str-closed');
  });
  it('old roof and HVAC raise cautions', () => {
    const codes = prescreen({ roof_age_years: 25, hvac_age_years: 18 }).map((f) => f.code);
    expect(codes).toContain('roof-age');
    expect(codes).toContain('hvac-age');
  });
  it('master metering is a caution, individual metering is fine', () => {
    expect(prescreen({ master_metered: true }).some((f) => f.code === 'master-metered')).toBe(true);
    expect(prescreen({ master_metered: false }).some((f) => f.code === 'master-metered')).toBe(false);
  });
  it('a clean deal has no killer', () => {
    expect(hasKiller(prescreen({ year_built: 2010 }))).toBe(false);
  });
});
