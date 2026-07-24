import { describe, it, expect } from 'vitest';
import { zoriToBands, latestMonthValue, firstMonthIndex } from '../lib/rents.js';

const HEADER =
  'RegionID,SizeRank,RegionName,RegionType,StateName,State,City,Metro,CountyName,2024-01-31,2024-02-29,2024-03-31';

const FIXTURE = [
  HEADER,
  '91982,1,85004,zip,Arizona,AZ,Phoenix,"Phoenix-Mesa-Chandler, AZ",Maricopa County,1450.2,1461.7,1478.9',
  '92001,2,37211,zip,Tennessee,TN,Nashville,"Nashville-Davidson, TN",Davidson County,1602.1,,',
  '93000,3,90210,zip,California,CA,Beverly Hills,"Los Angeles, CA",Los Angeles County,4100,4150,4200',
  '94000,4,85099,zip,Arizona,AZ,Nowhere,"Phoenix, AZ",Maricopa County,,,',
].join('\n');

describe('firstMonthIndex', () => {
  it('finds the first YYYY-MM-DD column', () => {
    expect(firstMonthIndex(HEADER.split(','))).toBe(9);
  });
});

describe('latestMonthValue', () => {
  const headers = HEADER.split(',');
  it('takes the last non-empty month and truncates period to YYYY-MM', () => {
    const row = FIXTURE.split('\n')[1].split(',');
    // note: this naive split is safe here only because we control the fixture row
    const v = latestMonthValue(
      ['91982','1','85004','zip','Arizona','AZ','Phoenix','Phoenix-Mesa','Maricopa','1450.2','1461.7','1478.9'],
      headers, 9,
    );
    expect(v).toEqual({ period: '2024-03', rent: 1479 });
  });
  it('walks back past trailing blanks', () => {
    const v = latestMonthValue(
      ['92001','2','37211','zip','Tennessee','TN','Nashville','Metro','Davidson','1602.1','',''],
      headers, 9,
    );
    expect(v).toEqual({ period: '2024-01', rent: 1602 });
  });
  it('returns null when every month is blank', () => {
    const v = latestMonthValue(
      ['94000','4','85099','zip','Arizona','AZ','X','Y','Z','','',''],
      headers, 9,
    );
    expect(v).toBeNull();
  });
});

describe('zoriToBands', () => {
  const { bands, skipped } = zoriToBands(FIXTURE, ['AZ', 'TN']);
  it('keeps only wanted states', () => {
    expect(bands.map((b) => b.zip).sort()).toEqual(['37211', '85004']);
    expect(bands.every((b) => ['AZ', 'TN'].includes(b.state))).toBe(true);
  });
  it('uses each zip’s own latest period', () => {
    const az = bands.find((b) => b.zip === '85004');
    const tn = bands.find((b) => b.zip === '37211');
    expect(az).toMatchObject({ period: '2024-03', rent: 1479 });
    expect(tn).toMatchObject({ period: '2024-01', rent: 1602 });
  });
  it('counts all-blank rows as skipped (85099)', () => {
    expect(skipped).toBe(1);
  });
  it('handles quoted commas in Metro names without shifting columns', () => {
    // If quoting broke, the AZ row's month columns would misalign and rent
    // would be wrong — 1479 proves alignment survived.
    expect(bands.find((b) => b.zip === '85004').rent).toBe(1479);
  });
  it('throws on an unrecognized file shape', () => {
    expect(() => zoriToBands('A,B,C\n1,2,3', ['AZ'])).toThrow();
  });
});
