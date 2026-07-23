/**
 * Deal-killer prescreen — cheap checks BEFORE a full underwrite.
 * Surfaces legal/physical red flags. Asbestos (pre-1980) is surfaced
 * prominently because the operator has remediation expertise (it's an
 * opportunity flag, not only a risk).
 */

export type FlagSeverity = 'killer' | 'caution' | 'info';

export interface PrescreenFacts {
  zoning_legal_nonconforming?: boolean;
  /** true = master-metered (worse: owner pays), false = individually metered. */
  master_metered?: boolean;
  septic_or_well?: boolean;
  roof_age_years?: number;
  hvac_age_years?: number;
  /** State is a statutory rent-control state. */
  rent_control_state?: boolean;
  year_built?: number;
  /** STR permit status in this market: 'open' | 'restricted' | 'closed'. */
  str_permit_status?: 'open' | 'restricted' | 'closed';
}

export interface PrescreenFlag {
  code: string;
  severity: FlagSeverity;
  message: string;
}

export function prescreen(f: PrescreenFacts): PrescreenFlag[] {
  const flags: PrescreenFlag[] = [];

  if (f.zoning_legal_nonconforming) {
    flags.push({
      code: 'zoning-nonconforming',
      severity: 'killer',
      message: 'Legal non-conforming use — rebuild/financing risk. Verify with planning dept.',
    });
  }
  if (f.master_metered === true) {
    flags.push({
      code: 'master-metered',
      severity: 'caution',
      message: 'Master-metered utilities — owner bears cost; consider RUBS or submetering.',
    });
  }
  if (f.septic_or_well) {
    flags.push({
      code: 'septic-well',
      severity: 'caution',
      message: 'Septic/well on site — inspection and reserve required.',
    });
  }
  if (f.roof_age_years != null && f.roof_age_years >= 20) {
    flags.push({
      code: 'roof-age',
      severity: 'caution',
      message: `Roof ~${f.roof_age_years}y old — near end of life; budget replacement.`,
    });
  }
  if (f.hvac_age_years != null && f.hvac_age_years >= 15) {
    flags.push({
      code: 'hvac-age',
      severity: 'caution',
      message: `HVAC ~${f.hvac_age_years}y old — near end of life; budget replacement.`,
    });
  }
  if (f.rent_control_state) {
    flags.push({
      code: 'rent-control',
      severity: 'caution',
      message: 'Rent-control jurisdiction — rent-growth assumptions capped by statute.',
    });
  }
  if (f.year_built != null && f.year_built < 1978) {
    flags.push({
      code: 'lead-paint',
      severity: 'caution',
      message: 'Pre-1978 — lead-based paint disclosure and possible abatement.',
    });
  }
  if (f.year_built != null && f.year_built < 1980) {
    flags.push({
      code: 'asbestos',
      severity: 'info',
      message:
        'Pre-1980 — possible asbestos. Operator has remediation expertise; may be a value-add angle.',
    });
  }
  if (f.str_permit_status === 'closed') {
    flags.push({
      code: 'str-closed',
      severity: 'info',
      message: 'STR permits closed in this market — STR upside must be modeled to $0.',
    });
  }

  return flags;
}

/** Any hard deal-killer present? */
export function hasKiller(flags: PrescreenFlag[]): boolean {
  return flags.some((f) => f.severity === 'killer');
}
