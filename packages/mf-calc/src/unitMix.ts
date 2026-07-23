/**
 * Unit-mix rent modeling.
 *
 * IMPORTANT (from spec): RentCast MF rent estimates are PER UNIT. Total rent
 * must be modeled as Σ (units_of_type × per-unit estimate), each type carrying
 * its own rent band. This module rolls a unit mix up to annual gross potential
 * rent for whichever basis (actual vs market) the caller wants.
 */
import type { UnitType } from './types.js';

export type RentBasis = 'actual' | 'market';

/** Total unit count across the mix. */
export function totalUnits(mix: UnitType[]): number {
  return mix.reduce((a, u) => a + u.count, 0);
}

/** Total rentable square footage. */
export function totalSqft(mix: UnitType[]): number {
  return mix.reduce((a, u) => a + u.count * u.sqft, 0);
}

/** Monthly gross rent on the chosen basis. */
export function monthlyGrossRent(mix: UnitType[], basis: RentBasis): number {
  return mix.reduce((a, u) => {
    const rent = basis === 'actual' ? u.actual_rent : u.market_rent;
    return a + u.count * rent;
  }, 0);
}

/** Annual gross potential rent on the chosen basis. */
export function annualGrossPotentialRent(mix: UnitType[], basis: RentBasis): number {
  return monthlyGrossRent(mix, basis) * 12;
}

/**
 * Loss-to-lease: how far in-place (actual) rents sit below market, as a
 * fraction of market. High loss-to-lease on an otherwise-sound building is the
 * "mismanaged / value-add" signal; near-zero on an overpriced ask is the
 * "overpriced" signal. Report uses this to explain valuation divergence.
 */
export function lossToLease(mix: UnitType[]): number {
  const market = monthlyGrossRent(mix, 'market');
  const actual = monthlyGrossRent(mix, 'actual');
  if (market <= 0) return 0;
  return (market - actual) / market;
}

/** Blended average rent per unit on a basis (monthly). */
export function averageRentPerUnit(mix: UnitType[], basis: RentBasis): number {
  const units = totalUnits(mix);
  if (units <= 0) return 0;
  return monthlyGrossRent(mix, basis) / units;
}
