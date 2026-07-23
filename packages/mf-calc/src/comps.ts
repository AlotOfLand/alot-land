/**
 * Comps statistics — added in calc v1.1.0 (new module + tests per the frozen-
 * module protocol).
 *
 * Reality constraint (Redfin lane): sold comps carry NO unit counts — only a
 * '2-4' / '5+' bucket, building-total beds, and sparsely-filled sqft. So the
 * honestly computable metrics are $/bed and $/sqft, each with an explicit
 * sample size so the UI can gate on fill rate (e.g. Phoenix sqft is ~9%).
 */

export interface CompRecord {
  price: number;
  lat?: number | null;
  lng?: number | null;
  beds_total?: number | null;
  sqft?: number | null;
  unit_bucket?: string | null;
  sold_date?: string | null;
}

/** Great-circle distance in miles. */
export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.7613;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Comps within `radiusMiles` of the subject, sorted nearest-first. */
export function filterNearby<T extends CompRecord>(
  comps: T[],
  subject: { lat: number; lng: number },
  radiusMiles: number,
): (T & { distance_miles: number })[] {
  return comps
    .filter((c) => c.lat != null && c.lng != null && c.price > 0)
    .map((c) => ({
      ...c,
      distance_miles: haversineMiles(subject.lat, subject.lng, c.lat!, c.lng!),
    }))
    .filter((c) => c.distance_miles <= radiusMiles)
    .sort((a, b) => a.distance_miles - b.distance_miles);
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export interface CompsStats {
  count: number;
  median_price: number;
  min_price: number;
  max_price: number;
  /** Median of price ÷ beds_total over comps where beds are present. */
  median_per_bed: number | null;
  per_bed_sample: number;
  /** Median of price ÷ sqft over comps where sqft is present. */
  median_per_sqft: number | null;
  per_sqft_sample: number;
}

export function compsStats(comps: CompRecord[]): CompsStats {
  const priced = comps.filter((c) => c.price > 0);
  const perBed = priced
    .filter((c) => (c.beds_total ?? 0) > 0)
    .map((c) => c.price / c.beds_total!);
  const perSqft = priced
    .filter((c) => (c.sqft ?? 0) > 0)
    .map((c) => c.price / c.sqft!);
  return {
    count: priced.length,
    median_price: median(priced.map((c) => c.price)),
    min_price: priced.length ? Math.min(...priced.map((c) => c.price)) : 0,
    max_price: priced.length ? Math.max(...priced.map((c) => c.price)) : 0,
    median_per_bed: perBed.length ? median(perBed) : null,
    per_bed_sample: perBed.length,
    median_per_sqft: perSqft.length ? median(perSqft) : null,
    per_sqft_sample: perSqft.length,
  };
}

/** Comps-derived subject value on the $/bed axis. */
export function salesCompsPerBed(pricePerBed: number, subjectBedsTotal: number): number {
  return pricePerBed * subjectBedsTotal;
}
