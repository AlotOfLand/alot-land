import { describe, it, expect } from 'vitest';
import { parseCSV, statusOf, parseSoldDate, listingsFromCSV } from '../lib/csv.js';

// The 27 columns Redfin actually returns, verbatim (HANDOFF §4.2).
const HEADER =
  'SALE TYPE,SOLD DATE,PROPERTY TYPE,ADDRESS,CITY,STATE OR PROVINCE,ZIP OR POSTAL CODE,PRICE,BEDS,BATHS,LOCATION,SQUARE FEET,LOT SIZE,YEAR BUILT,DAYS ON MARKET,$/SQUARE FEET,HOA/MONTH,STATUS,NEXT OPEN HOUSE START TIME,NEXT OPEN HOUSE END TIME,URL (SEE https://www.redfin.com/buy-a-home/comparative-market-analysis FOR INFO ON PRICING),SOURCE,MLS#,FAVORITE,INTERESTED,LATITUDE,LONGITUDE';

const DISCLAIMER =
  'In accordance with local MLS rules, some MLS listings are not included in the download';

function row(over = {}) {
  const base = {
    saleType: 'MLS Listing', soldDate: '', propertyType: 'Multi-Family (2-4 Unit)',
    address: '123 Main St', city: 'Phoenix', state: 'AZ', zip: '85004',
    price: '500000', beds: '8', baths: '4', location: '"Central, Phoenix"',
    sqft: '', lotSize: '', yearBuilt: '1975', dom: '12', perSqft: '', hoa: '',
    status: 'Active', oh1: '', oh2: '', url: 'https://www.redfin.com/AZ/x/home/1',
    source: 'ARMLS', mls: '6612345', fav: 'N', int: 'N', lat: '33.45', lng: '-112.07',
  };
  const r = { ...base, ...over };
  return [
    r.saleType, r.soldDate, r.propertyType, r.address, r.city, r.state, r.zip,
    r.price, r.beds, r.baths, r.location, r.sqft, r.lotSize, r.yearBuilt, r.dom,
    r.perSqft, r.hoa, r.status, r.oh1, r.oh2, r.url, r.source, r.mls, r.fav,
    r.int, r.lat, r.lng,
  ].join(',');
}

describe('parseCSV', () => {
  it('handles quoted cells containing commas (LOCATION field)', () => {
    const rows = parseCSV('A,B,C\n1,"x, y",3\n');
    expect(rows[1]).toEqual(['1', 'x, y', '3']);
  });
  it('handles escaped quotes and CRLF', () => {
    const rows = parseCSV('A,B\r\n"say ""hi""",2\r\n');
    expect(rows[1]).toEqual(['say "hi"', '2']);
  });
});

describe('statusOf — the PAST SALE trap (HANDOFF §4.4)', () => {
  it('PAST SALE with blank STATUS and blank SOLD DATE is sold, not active', () => {
    expect(statusOf('PAST SALE', '', '')).toBe('sold');
  });
  it('sold date alone marks sold', () => {
    expect(statusOf('MLS Listing', '', 'August-15-2025')).toBe('sold');
  });
  it('pending/contingent/coming-soon/active map correctly', () => {
    expect(statusOf('MLS Listing', 'Pending', '')).toBe('pending');
    expect(statusOf('MLS Listing', 'Contingent', '')).toBe('pending');
    expect(statusOf('MLS Listing', 'Coming Soon', '')).toBe('comingsoon');
    expect(statusOf('MLS Listing', 'Active', '')).toBe('active');
  });
});

describe('parseSoldDate — "August-15-2025" format, parsed explicitly', () => {
  it('parses month-name hyphen format', () => {
    expect(parseSoldDate('August-15-2025')).toBe('2025-08-15');
    expect(parseSoldDate('January-3-2024')).toBe('2024-01-03');
  });
  it('returns null on blank or junk', () => {
    expect(parseSoldDate('')).toBeNull();
    expect(parseSoldDate('2025-08-15')).toBeNull();
  });
});

describe('listingsFromCSV — multifamily extraction', () => {
  it('skips the single-cell MLS disclaimer row', () => {
    const text = [HEADER, DISCLAIMER, row()].join('\n');
    const { listings, dropped } = listingsFromCSV(text);
    expect(listings).toHaveLength(1);
    expect(dropped).toBe(1);
  });

  it('drops non-MF leakage (uipt=4 returns SFR/Other rows)', () => {
    const text = [
      HEADER,
      row({ propertyType: 'Single Family Residential' }),
      row({ propertyType: 'Other' }),
      row(),
    ].join('\n');
    const { listings, dropped } = listingsFromCSV(text);
    expect(listings).toHaveLength(1);
    expect(dropped).toBe(2);
  });

  it('maps both MF buckets', () => {
    const text = [HEADER, row(), row({ propertyType: 'Multi-Family (5+ Unit)', address: '9 Big Bldg' })].join('\n');
    const { listings } = listingsFromCSV(text);
    expect(listings[0].unit_bucket).toBe('2-4');
    expect(listings[1].unit_bucket).toBe('5+');
  });

  it('does NOT require lot size or sqft (the land parser dropped 57% here)', () => {
    const text = [HEADER, row({ sqft: '', lotSize: '' })].join('\n');
    const { listings } = listingsFromCSV(text);
    expect(listings).toHaveLength(1);
    expect(listings[0].sqft).toBeNull();
  });

  it('requires price and coordinates', () => {
    const text = [HEADER, row({ price: '' }), row({ lat: '', lng: '' }), row()].join('\n');
    const { listings, dropped } = listingsFromCSV(text);
    expect(listings).toHaveLength(1);
    expect(dropped).toBe(2);
  });

  it('extracts the multifamily field set', () => {
    const { listings } = listingsFromCSV([HEADER, row()].join('\n'));
    const l = listings[0];
    expect(l.address).toBe('123 Main St');
    expect(l.zip).toBe('85004');
    expect(l.price).toBe(500000);
    expect(l.beds_total).toBe(8); // building total, not per-unit
    expect(l.year_built).toBe(1975);
    expect(l.mls_number).toBe('6612345');
    expect(l.lat).toBeCloseTo(33.45);
    expect(l.status).toBe('active');
  });

  it('quoted LOCATION with comma does not shift columns', () => {
    const { listings } = listingsFromCSV([HEADER, row({ location: '"Encanto, Palmcroft"' })].join('\n'));
    expect(listings[0].year_built).toBe(1975);
    expect(listings[0].lng).toBeCloseTo(-112.07);
  });
});
