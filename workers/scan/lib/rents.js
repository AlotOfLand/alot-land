/**
 * Rent-band parsing — Zillow ZORI zip-level CSV.
 *
 * File shape (zillow.com/research/data → Rentals → ZORI → ZIP):
 *   RegionID,SizeRank,RegionName,RegionType,StateName,State,City,Metro,
 *   CountyName,2015-01-31,2015-02-28,...,<latest month>
 * RegionName is the 5-digit ZIP. Month columns are a time series; many
 * trailing cells are blank for thin zips, so "latest" = last NON-EMPTY value.
 *
 * ZORI is a blended (all bedroom sizes) asking-rent index → stored with
 * bedrooms = -1, confidence 'med'. Per-bedroom bands come later from HUD SAFMR.
 */
import { parseCSV } from './csv.js';

/** Walk a row's month columns from the end; return {period:'YYYY-MM', rent} or null. */
export function latestMonthValue(row, headers, firstMonthIdx) {
  for (let i = headers.length - 1; i >= firstMonthIdx; i--) {
    const v = (row[i] ?? '').trim();
    if (v !== '') {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) {
        return { period: headers[i].slice(0, 7), rent: Math.round(n) };
      }
    }
  }
  return null;
}

/** Index of the first YYYY-MM-DD column. */
export function firstMonthIndex(headers) {
  return headers.findIndex((h) => /^\d{4}-\d{2}-\d{2}$/.test(h.trim()));
}

/**
 * Parse the full ZORI CSV into band rows for the wanted states.
 * Returns { bands: [{zip,state,period,rent}], skipped }.
 */
export function zoriToBands(csvText, states) {
  const want = new Set(states.map((s) => s.toUpperCase()));
  const rows = parseCSV(csvText);
  if (!rows.length) return { bands: [], skipped: 0 };
  const headers = rows[0].map((h) => h.trim());
  const zipIdx = headers.indexOf('RegionName');
  const stateIdx = headers.indexOf('State');
  const monthIdx = firstMonthIndex(headers);
  if (zipIdx < 0 || stateIdx < 0 || monthIdx < 0) {
    throw new Error('ZORI file shape not recognized (RegionName/State/month columns missing)');
  }

  const bands = [];
  let skipped = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length !== headers.length) {
      skipped++;
      continue;
    }
    const state = (r[stateIdx] || '').trim().toUpperCase();
    if (!want.has(state)) continue;
    const latest = latestMonthValue(r, headers, monthIdx);
    if (!latest) {
      skipped++;
      continue;
    }
    const zip = (r[zipIdx] || '').trim().padStart(5, '0');
    bands.push({ zip, state, period: latest.period, rent: latest.rent });
  }
  return { bands, skipped };
}
