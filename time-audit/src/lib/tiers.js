export const TIERS = [
  { key: 'tier_10k',  label: '$10,000 / hour', short: '$10K',  color: '#F5B800', glow: 'rgba(245,184,0,0.35)'  },
  { key: 'tier_1k',   label: '$1,000 / hour',  short: '$1K',   color: '#3CB054', glow: 'rgba(60,176,84,0.30)'  },
  { key: 'tier_mid',  label: '$10–$99 / hour', short: '$10–99',color: '#5B9BD5', glow: 'rgba(91,155,213,0.25)' },
  { key: 'tier_zero', label: '$0 / hour',      short: '$0',    color: '#5A5A5A', glow: 'rgba(120,120,120,0.20)'},
];

export const tierByKey = Object.fromEntries(TIERS.map((t) => [t.key, t]));
