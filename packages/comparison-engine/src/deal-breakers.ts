import type { SpecValue } from '@vscar/vehicle-schema';
import { ComparisonScenario, type CheckStatus, type ComparisonCandidate, type ComparisonScenarioIn, type DealBreakerCheck, type DealBreakerResult } from './contracts.ts';

/**
 * Deal Breakers (restricciones duras), evaluados ANTES de cualquier comparación.
 * UNKNOWN nunca equivale a PASS. Un rango homologado que cruza el límite es UNKNOWN (depende de la configuración).
 * Ninguna ventaja posterior puede revertir un FAIL.
 */
type Req = ComparisonScenario['requirements'];
const PLUGIN = new Set(['BEV', 'PHEV', 'EREV']);

const interval = (v: SpecValue): { min: number; max: number } | undefined =>
  typeof v.value === 'number' ? { min: v.value, max: v.value } : v.value_min !== undefined && v.value_max !== undefined ? { min: v.value_min, max: v.value_max } : undefined;

function check(
  criterion: keyof Req,
  required: number,
  observed: { min: number; max: number } | undefined,
  kind: 'MIN' | 'MAX',
  unit: string,
  what: string,
  provenance?: DealBreakerCheck['provenance'],
  basisNote = '',
): DealBreakerCheck {
  if (!observed) return { criterion, requiredValue: required, status: 'UNKNOWN', reason: `${what}: no usable data`, ...(provenance ? { provenance } : {}) };
  const ok = (x: number) => (kind === 'MIN' ? x >= required : x <= required);
  const allOk = ok(observed.min) && ok(observed.max);
  const noneOk = !ok(observed.min) && !ok(observed.max);
  const status: CheckStatus = allOk ? 'PASS' : noneOk ? 'FAIL' : 'UNKNOWN';
  const shown = observed.min === observed.max ? `${observed.min}` : `${observed.min}–${observed.max}`;
  const op = kind === 'MIN' ? '≥' : '≤';
  const reason =
    status === 'UNKNOWN'
      ? `${what} ${shown} ${unit}: depends on configuration (required ${op} ${required})${basisNote}`
      : `${what} ${shown} ${unit} ${status === 'PASS' ? 'meets' : 'does not meet'} ${op} ${required} ${unit}${basisNote}`;
  return { criterion, requiredValue: required, observedValue: { ...observed, unit }, status, reason, ...(provenance ? { provenance } : {}) };
}

function fact(c: ComparisonCandidate, key: string) {
  const v = c.facts[key]?.[0];
  if (!v) return { observed: undefined, provenance: { spec_key: key } };
  return { observed: interval(v), provenance: { spec_key: key, value_id: v.id, source_id: v.source_id }, value: v };
}

export function evaluateDealBreakers(c: ComparisonCandidate, scenarioIn: ComparisonScenarioIn): DealBreakerResult {
  const r = ComparisonScenario.parse(scenarioIn).requirements;
  const checks: DealBreakerCheck[] = [];

  if (r.minSeats !== undefined) {
    checks.push(check('minSeats', r.minSeats, c.seats !== undefined ? { min: c.seats, max: c.seats } : undefined, 'MIN', 'seats', 'seats'));
  }
  if (r.minBootL !== undefined) {
    const f = fact(c, 'cap.boot_l');
    const method = f.value?.measurement_basis?.boot_method;
    checks.push(check('minBootL', r.minBootL, f.observed, 'MIN', 'L', 'boot', f.provenance, method && method !== 'UNSPECIFIED' ? ` (${method})` : method ? ' (measurement method unspecified)' : ''));
  }
  if (r.minTowingKg !== undefined) {
    const f = fact(c, 'cap.towing_braked_kg');
    checks.push(check('minTowingKg', r.minTowingKg, f.observed, 'MIN', 'kg', 'braked towing', f.provenance));
  }
  for (const [criterion, key, what] of [
    ['maxLengthMm', 'dim.length_mm', 'length'],
    ['maxWidthMm', 'dim.width_mm', 'width (without mirrors)'],
    ['maxHeightMm', 'dim.height_mm', 'height'],
  ] as const) {
    const limit = r[criterion];
    if (limit === undefined) continue;
    const f = fact(c, key);
    checks.push(check(criterion, limit, f.observed, 'MAX', 'mm', what, f.provenance));
  }
  if (r.minElectricRangeKm !== undefined) {
    if (!PLUGIN.has(c.powertrainType)) {
      checks.push({ criterion: 'minElectricRangeKm', requiredValue: r.minElectricRangeKm, observedValue: { min: 0, max: 0, unit: 'km' }, status: 'FAIL', reason: `${c.powertrainType} has no plug-in electric range` });
    } else {
      const f = fact(c, 'rng.electric_combined_km');
      const cycle = f.value?.test_cycle ? ` (${f.value.test_cycle})` : '';
      checks.push(check('minElectricRangeKm', r.minElectricRangeKm, f.observed, 'MIN', 'km', 'electric range', f.provenance, cycle));
    }
  }
  if (r.maxPurchasePriceEur !== undefined) {
    const p = c.economic?.ownershipCost.purchase;
    checks.push(check('maxPurchasePriceEur', r.maxPurchasePriceEur, p ? { min: p.amount_minor / 100, max: p.amount_minor / 100 } : undefined, 'MAX', 'EUR', 'purchase price', undefined, p ? ` (${p.basis})` : ''));
  }

  const failedChecks = checks.filter((x) => x.status === 'FAIL');
  const unknownChecks = checks.filter((x) => x.status === 'UNKNOWN');
  return { candidateId: c.id, status: failedChecks.length ? 'FAIL' : unknownChecks.length ? 'UNKNOWN' : 'PASS', checks, failedChecks, unknownChecks };
}
