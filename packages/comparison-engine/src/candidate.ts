import type { EconomicResult } from '@vscar/economics-engine';
import { checkPlausibility, detectConflicts, engineUsability, evaluateEligibility, valueStatus } from '@vscar/quality';
import { isValidAt, type DatasetBundle, type MappingConfidence, type SourceAuthority, type SpecValue } from '@vscar/vehicle-schema';
import type { ComparisonCandidate } from './contracts.ts';

/**
 * Candidato desde el dataset curado con las reglas de `@vscar/quality`: solo valores usables por engines,
 * válidos en la fecha, sin BLOCK y sin conflicto pendiente. Se conservan TODOS los valores usables de cada
 * clave (ordenados), porque puede haber bases distintas (p. ej. DC 10→80 y 30→80) y la comparación elige el par comparable.
 */
const MAPPING_RANK: Record<MappingConfidence, number> = {
  EXACT: 0,
  CROSS_MARKET_EXACT_HOMOLOGATION: 1,
  TRIM_LEVEL: 2,
  POWERTRAIN_LEVEL: 3,
  GENERATION_LEVEL: 4,
  INFERRED: 5,
  UNCONFIRMED: 9,
};
const AUTHORITY_RANK: Partial<Record<SourceAuthority, number>> = { OFFICIAL_AUTHORITY: 0, OFFICIAL_MANUFACTURER: 1, VERIFIED_EDITORIAL: 2 };

export const rankValues = (values: readonly SpecValue[]) =>
  [...values].sort(
    (a, b) =>
      MAPPING_RANK[a.mapping_confidence] - MAPPING_RANK[b.mapping_confidence] ||
      (AUTHORITY_RANK[a.source_authority] ?? 5) - (AUTHORITY_RANK[b.source_authority] ?? 5) ||
      a.id.localeCompare(b.id),
  );

export function comparisonCandidateFromBundle(
  bundle: DatasetBundle,
  variantId: string,
  opts: { at?: string; economic?: EconomicResult; label?: string } = {},
): ComparisonCandidate {
  const variant = bundle.variants.find((v) => v.id === variantId);
  if (!variant) throw new Error(`variant ${variantId} not in bundle`);
  const homologation = bundle.homologations.find((h) => h.id === variant.homologation_id)!;
  const values = bundle.spec_values.filter((v) => v.variant_id === variantId);
  const prices = bundle.prices.filter((p) => p.variant_id === variantId);
  const findings = checkPlausibility({ variant, homologation, values });
  const conflicted = new Set(detectConflicts(values).flatMap((c) => c.value_ids));
  const exclusions: string[] = [];
  const byKey = new Map<string, SpecValue[]>();

  for (const v of values) {
    if (!isValidAt(v, opts.at)) continue;
    const u = engineUsability(v);
    const blocked = valueStatus(findings, v.id) === 'BLOCK';
    if (!u.usable || blocked) {
      exclusions.push(`${v.spec_key} (${v.source_market}) not used: ${[...u.reasons, ...(blocked ? ['plausibility BLOCK'] : [])].join('; ')}`);
      continue;
    }
    if (conflicted.has(v.id)) {
      exclusions.push(`${v.spec_key}: value in unresolved conflict (human review) not used`);
      continue;
    }
    byKey.set(v.spec_key, [...(byKey.get(v.spec_key) ?? []), v]);
  }
  const facts = Object.fromEntries([...byKey.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, vs]) => [k, rankValues(vs)]));

  return {
    id: variant.id,
    label: opts.label ?? variant.commercial.commercial_name ?? variant.id,
    market: 'ES',
    powertrainType: variant.technical.powertrain_type,
    ...(variant.technical.seats !== undefined ? { seats: variant.technical.seats } : {}),
    facts,
    safetyRatings: bundle.safety_ratings.filter((r) => r.variant_id === variantId),
    eligibility: evaluateEligibility({ variant, homologation, values, prices, ...(opts.at ? { at: opts.at } : {}) }),
    exclusions,
    ...(opts.economic ? { economic: opts.economic } : {}),
  };
}
