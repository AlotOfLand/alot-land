/**
 * Scan market definitions. Polygons are closed rings "lng lat,..." (first
 * point repeated last), verified in HANDOFF §7. Polygon mode needs no region
 * IDs and works identically in AZ and TN.
 *
 * Note polygons are BOUNDING BOXES: corners reach ~1.41× the implied radius.
 * For a metro sweep that over-reach is fine (more coverage); no circular
 * post-filter is applied here.
 */
export const MARKETS = {
  phoenix: {
    label: 'Phoenix metro, AZ',
    state: 'AZ',
    poly: '-112.25 33.35,-111.90 33.35,-111.90 33.60,-112.25 33.60,-112.25 33.35',
    // Phoenix hits the 350 cap immediately — band splitting will be exercised.
  },
  nashville: {
    label: 'Nashville metro, TN',
    state: 'TN',
    poly: '-87.05 36.03,-86.55 36.03,-86.55 36.35,-87.05 36.35,-87.05 36.03',
    // ~90 MF rows total — bands stay dormant here.
  },
};
