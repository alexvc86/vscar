import {
  ALPHA_CATEGORIES,
  CATEGORY_REQUIREMENTS,
  isRange,
  isValidAt,
  type AlphaCategory,
  type BasisConstraint,
  type Homologation,
  type MeasurementBasisField,
  type ReferenceVariant,
  type Requirement,
  type SpecValue,
  type VehiclePrice,
} from '@vscar/vehicle-schema';
import { detectConflicts } from './conflicts.ts';
import { checkPlausibility, valueStatus } from './plausibility.ts';
import { engineUsability } from './usability.ts';

/**
 * Elegibilidad por variant y por categoría (Catalog v0.2 §8). No se exige un 90 % global:
 * una variant histórica puede existir con categorías NOT_AVAILABLE.
 */

export type CategoryStatus = 'AVAILABLE' | 'PARTIAL' | 'NOT_AVAILABLE';

export interface CategoryEligibility {
  status: CategoryStatus;
  /** Requisitos no cumplidos de la alternativa más cercana (si NOT_AVAILABLE). */
  missing: string[];
  /** Motivos de PARTIAL (rangos, bases UNSPECIFIED, ciclo inferido). */
  partial_reasons: string[];
  /** Valores que satisfacen la categoría. */
  value_ids: string[];
}

export interface EligibilityInput {
  variant: ReferenceVariant;
  homologation: Homologation;
  values: readonly SpecValue[];
  prices: readonly VehiclePrice[];
  /** Fecha de referencia para valores/precios con validez temporal. */
  at?: string;
}

interface Match {
  value_ids: string[];
  partial: string[];
}

function basisMatches(v: SpecValue, constraint: BasisConstraint | undefined): boolean {
  if (!constraint) return true;
  return Object.entries(constraint).every(([field, allowed]) => {
    const actual = v.measurement_basis?.[field as MeasurementBasisField];
    return actual !== undefined && (allowed as readonly unknown[]).includes(actual);
  });
}

function partialReasons(v: SpecValue): string[] {
  const reasons: string[] = [];
  if (isRange(v)) reasons.push(`${v.spec_key}: homologated range ${v.value_min}–${v.value_max}`);
  if (v.test_cycle === 'UNDECLARED') reasons.push(`${v.spec_key}: cycle not declared`);
  for (const [field, value] of Object.entries(v.measurement_basis ?? {})) {
    if (value === 'UNSPECIFIED') reasons.push(`${v.spec_key}: ${field} UNSPECIFIED`);
  }
  if (v.provisional) reasons.push(`${v.spec_key}: provisional`);
  return reasons;
}

function explainUnusable(values: readonly SpecValue[], key: string): string {
  const candidates = values.filter((v) => v.spec_key === key);
  if (candidates.length === 0) return `missing ${key}`;
  const reasons = candidates.flatMap((v) => engineUsability(v).reasons);
  return `${key} present but not usable (${[...new Set(reasons)].join('; ') || 'basis/period/plausibility mismatch'})`;
}

export function evaluateEligibility(input: EligibilityInput): Record<AlphaCategory, CategoryEligibility> {
  const { variant, homologation, values, prices, at } = input;
  const findings = checkPlausibility({ variant, homologation, values });
  const conflicted = new Set(detectConflicts(values).flatMap((c) => c.value_ids));

  const usableValues = values.filter(
    (v) => isValidAt(v, at) && engineUsability(v).usable && valueStatus(findings, v.id) !== 'BLOCK',
  );

  const satisfy = (req: Requirement): Match | string => {
    switch (req.kind) {
      case 'seats':
        return variant.technical.seats !== undefined ? { value_ids: [], partial: [] } : 'missing seats';
      case 'price': {
        const p = prices.find((x) => x.price_basis === 'LIST' && isValidAt(x, at) && x.source_authority !== 'SECONDARY_REFERENCE');
        if (!p) return 'missing list price (price_basis LIST)';
        return { value_ids: [p.id], partial: p.incl_taxes === 'UNKNOWN' ? ['price: incl_taxes UNKNOWN'] : [] };
      }
      case 'spec': {
        const matches = usableValues.filter((v) => v.spec_key === req.key && basisMatches(v, req.basis));
        if (matches.length === 0) {
          const present = usableValues.some((v) => v.spec_key === req.key);
          return present && req.basis ? `${req.key} present but basis not accepted (${JSON.stringify(req.basis)})` : explainUnusable(values, req.key);
        }
        // Preferir un valor sin motivos de PARTIAL.
        const reasonsOf = (m: SpecValue) => [...partialReasons(m), ...(conflicted.has(m.id) ? [`${m.spec_key}: conflict pending human review`] : [])];
        const clean = matches.find((m) => reasonsOf(m).length === 0);
        const chosen = clean ?? matches[0]!;
        return { value_ids: [chosen.id], partial: reasonsOf(chosen) };
      }
    }
  };

  const result = {} as Record<AlphaCategory, CategoryEligibility>;
  const rules = CATEGORY_REQUIREMENTS[variant.technical.powertrain_type];

  for (const category of ALPHA_CATEGORIES) {
    const alternatives = rules[category].filter((alt) => alt.market === undefined || alt.market === variant.market_code);
    let best: CategoryEligibility | undefined;
    let closestMissing: string[] | undefined;

    for (const alt of alternatives) {
      const outcomes = alt.all.map(satisfy);
      const missing = outcomes.filter((o): o is string => typeof o === 'string');
      if (missing.length > 0) {
        if (!closestMissing || missing.length < closestMissing.length) closestMissing = missing;
        continue;
      }
      const matches = outcomes as Match[];
      const partial = matches.flatMap((m) => m.partial);
      const candidate: CategoryEligibility = {
        status: partial.length > 0 ? 'PARTIAL' : 'AVAILABLE',
        missing: [],
        partial_reasons: partial,
        value_ids: matches.flatMap((m) => m.value_ids),
      };
      if (!best || (best.status === 'PARTIAL' && candidate.status === 'AVAILABLE')) best = candidate;
    }

    result[category] =
      best ??
      (alternatives.length === 0
        ? { status: 'NOT_AVAILABLE', missing: ['category not applicable to this powertrain'], partial_reasons: [], value_ids: [] }
        : { status: 'NOT_AVAILABLE', missing: closestMissing ?? [], partial_reasons: [], value_ids: [] });
  }
  return result;
}

/** vehicle_page_eligibility (Catalog v0.2 §8): la variant (identidad validada por schema) tiene ≥ 1 categoría AVAILABLE o PARTIAL. */
export function vehiclePageEligible(input: EligibilityInput): boolean {
  const categories = evaluateEligibility(input);
  return Object.values(categories).some((c) => c.status !== 'NOT_AVAILABLE');
}
