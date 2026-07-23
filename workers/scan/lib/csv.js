/**
 * CSV parsing + multifamily row extraction.
 * parseCSV/statusOf ported from redfin-comps (HANDOFF-MFDA.md §4);
 * listingsFromCSV rewritten multifamily-shaped per §5:
 *  - NO lot-size requirement (the land version dropped 57% of Phoenix MF rows)
 *  - requires price + coordinates instead
 *  - extracts PROPERTY TYPE, BEDS, BATHS, SQFT, YEAR BUILT, ZIP, MLS#, SOURCE
 *  - client-side re-filter on PROPERTY TYPE (uipt=4 leaks SFR/Other rows)
 */

/** RFC-4180-ish parser: quoted cells, escaped quotes, CRLF. */
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

/**
 * Status derivation — keep exactly this logic (§4.4). SALE TYPE: "PAST SALE"
 * rows can carry a blank STATUS and blank SOLD DATE; without the past-sale
 * test they'd become false "active" listings.
 */
export function statusOf(saleType, status, soldDate) {
  const s = `${saleType} ${status}`.toLowerCase();
  if (/sold|past sale/.test(s) || (soldDate || '').trim() !== '') return 'sold';
  const st = (status || '').toLowerCase();
  if (/pending|contingent/.test(st)) return 'pending';
  if (/coming/.test(st)) return 'comingsoon';
  return 'active';
}

/** Explicit parse for Redfin's "August-15-2025" sold-date format → 'YYYY-MM-DD' | null. */
export function parseSoldDate(s) {
  if (!s || !s.trim()) return null;
  const m = s.trim().match(/^([A-Za-z]+)-(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  const mi = months.indexOf(m[1].toLowerCase());
  if (mi < 0) return null;
  const day = String(m[2]).padStart(2, '0');
  const mon = String(mi + 1).padStart(2, '0');
  return `${m[3]}-${mon}-${day}`;
}

const MF_BUCKETS = {
  'multi-family (2-4 unit)': '2-4',
  'multi-family (5+ unit)': '5+',
};

function num(v) {
  if (v == null) return null;
  const n = Number(String(v).replace(/[$,]/g, ''));
  return Number.isFinite(n) && n !== 0 ? n : null;
}

/**
 * Header-indexed multifamily extraction.
 * Returns { listings, dropped } — dropped counts disclaimer rows, column-count
 * mismatches, non-MF leakage, and rows missing price/coords. Never silent.
 */
export function listingsFromCSV(text) {
  const rows = parseCSV(text);
  if (!rows.length) return { listings: [], dropped: 0 };
  const header = rows[0].map((h) => h.trim().toUpperCase());
  const col = (name) => header.findIndex((h) => h.startsWith(name));
  const idx = {
    saleType: col('SALE TYPE'),
    soldDate: col('SOLD DATE'),
    propertyType: col('PROPERTY TYPE'),
    address: col('ADDRESS'),
    city: col('CITY'),
    state: col('STATE OR PROVINCE'),
    zip: col('ZIP OR POSTAL CODE'),
    price: col('PRICE'),
    beds: col('BEDS'),
    baths: col('BATHS'),
    sqft: col('SQUARE FEET'),
    yearBuilt: col('YEAR BUILT'),
    dom: col('DAYS ON MARKET'),
    status: col('STATUS'),
    url: col('URL'),
    source: col('SOURCE'),
    mls: col('MLS#'),
    lat: col('LATITUDE'),
    lng: col('LONGITUDE'),
  };

  const listings = [];
  let dropped = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    // Row 2 is always a single-cell MLS disclaimer; also guards ragged rows.
    if (r.length !== header.length) {
      dropped++;
      continue;
    }
    const get = (k) => (idx[k] >= 0 ? (r[idx[k]] ?? '').trim() : '');

    // uipt=4 leaks non-MF rows — always re-filter on PROPERTY TYPE.
    const bucket = MF_BUCKETS[get('propertyType').toLowerCase()];
    if (!bucket) {
      dropped++;
      continue;
    }

    const price = num(get('price'));
    const lat = num(get('lat'));
    const lng = num(get('lng'));
    if (!price || lat == null || lng == null) {
      dropped++;
      continue;
    }

    listings.push({
      status: statusOf(get('saleType'), get('status'), get('soldDate')),
      sold_date: parseSoldDate(get('soldDate')),
      property_type: get('propertyType'),
      unit_bucket: bucket,
      address: get('address'),
      city: get('city'),
      state: get('state'),
      zip: get('zip'),
      price,
      beds_total: num(get('beds')),   // building TOTAL, not per-unit
      baths_total: num(get('baths')),
      sqft: num(get('sqft')),
      year_built: num(get('yearBuilt')),
      days_on_market: num(get('dom')),
      url: get('url'),
      mls_number: get('mls') || null,
      mls_source: get('source') || null,
      lat,
      lng,
    });
  }
  return { listings, dropped };
}
