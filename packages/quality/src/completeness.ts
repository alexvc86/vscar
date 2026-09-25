import { COMPLETENESS_WEIGHTS, MAPPING_FACTOR, PROVENANCE_FACTOR } from '@vscar/methodology';
import { SPEC_KEYS, SPEC_KEY_DEFINITIONS, appliesTo, isValidAt, type ReferenceVariant, type SpecKey, type SpecValue } from '@vscar/vehicle-schema';
import { engineUsability } from './usability.ts';

/**
 * `reference_completeness` (Plan §13.7): Σ peso(k) · presente(k) · factor(procedencia, mapeo) / Σ peso(k),
 * sobre las SpecKeys aplicables al powertrain. Las fuentes secundarias y los valores no utilizables no cuentan.
 */
export interface CompletenessResult {
  completeness: number;
  applicable_keys: number;
  present_keys: number;
  /** Claves críticas aplicables sin ningún valor utilizable. */
  missing_critical: SpecKey[];
}

export function vehicleCompleteness(variant: ReferenceVariant, values: readonly SpecValue[], at?: string): CompletenessResult {
  const applicable = SPEC_KEYS.filter((k) => appliesTo(SPEC_KEY_DEFINITIONS.get(k)!, variant.technical.powertrain_type));
  let total = 0;
  let covered = 0;
  let present = 0;
  const missingCritical: SpecKey[] = [];

  for (const key of applicable) {
    const def = SPEC_KEY_DEFINITIONS.get(key)!;
    const weight = COMPLETENESS_WEIGHTS[def.weight];
    total += weight;
    const candidates = values.filter((v) => v.spec_key === key && v.variant_id === variant.id && isValidAt(v, at) && engineUsability(v).usable);
    const factor = Math.max(0, ...candidates.map((v) => PROVENANCE_FACTOR[v.source_authority] * MAPPING_FACTOR[v.mapping_confidence]));
    if (factor > 0) present++;
    else if (def.critical) missingCritical.push(key);
    covered += weight * factor;
  }
  return { completeness: total === 0 ? 0 : covered / total, applicable_keys: applicable.length, present_keys: present, missing_critical: missingCritical };
}
