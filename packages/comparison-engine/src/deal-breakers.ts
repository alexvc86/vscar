import type { SpecValue, UsedNumericFact } from '@vscar/vehicle-schema';
import { ComparisonScenario, type CheckStatus, type ComparisonCandidate, type ComparisonScenarioIn, type DealBreakerCheck, type DealBreakerResult } from './contracts.ts';
import { cmessage } from './messages.ts';

/**
 * Deal Breakers (restricciones duras), evaluados ANTES de cualquier comparación.
 * UNKNOWN nunca equivale a PASS. Un rango homologado que cruza el límite es UNKNOWN (depende de la configuración).
 * Ninguna ventaja posterior puede revertir un FAIL.
 * Step 8a: los requisitos de la unidad usada (km, edad, salud de batería, garantía restante) solo se evalúan en
 * sujetos USED_INSTANCE; no aplican a un coche nuevo ni (la batería) a un powertrain sin batería enchufable.
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
  /** Código de la base de medida (método de maletero, ciclo, base del precio) para el mensaje. */
  basis?: string,
): DealBreakerCheck {
  const head = { criterion, required, unit, ...(basis ? { basis } : {}) };
  if (!observed) return { criterion, requiredValue: required, status: 'UNKNOWN', reason: `${what}: no usable data`, message: cmessage('comparison.requirement.no_data', head), ...(provenance ? { provenance } : {}) };
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
  const message = cmessage(status === 'PASS' ? 'comparison.requirement.pass' : status === 'FAIL' ? 'comparison.requirement.fail' : 'comparison.requirement.range_dependent', { ...head, observedMin: observed.min, observedMax: observed.max });
  return { criterion, requiredValue: required, observedValue: { ...observed, unit }, status, reason, message, ...(provenance ? { provenance } : {}) };
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
    checks.push(check('minBootL', r.minBootL, f.observed, 'MIN', 'L', 'boot', f.provenance, method && method !== 'UNSPECIFIED' ? ` (${method})` : method ? ' (measurement method unspecified)' : '', method));
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
      checks.push({
        criterion: 'minElectricRangeKm',
        requiredValue: r.minElectricRangeKm,
        observedValue: { min: 0, max: 0, unit: 'km' },
        status: 'FAIL',
        reason: `${c.powertrainType} has no plug-in electric range`,
        message: cmessage('comparison.requirement.no_plugin_range', { criterion: 'minElectricRangeKm', required: r.minElectricRangeKm, unit: 'km', powertrain: c.powertrainType }),
      });
    } else {
      const f = fact(c, 'rng.electric_combined_km');
      const cycle = f.value?.test_cycle ? ` (${f.value.test_cycle})` : '';
      checks.push(check('minElectricRangeKm', r.minElectricRangeKm, f.observed, 'MIN', 'km', 'electric range', f.provenance, cycle, f.value?.test_cycle));
    }
  }
  if (r.maxPurchasePriceEur !== undefined) {
    const p = c.economic?.ownershipCost.purchase;
    checks.push(check('maxPurchasePriceEur', r.maxPurchasePriceEur, p ? { min: p.amount_minor / 100, max: p.amount_minor / 100 } : undefined, 'MAX', 'EUR', 'purchase price', undefined, p ? ` (${p.basis})` : '', p?.basis));
  }

  checks.push(...usedChecks(c, r));

  const failedChecks = checks.filter((x) => x.status === 'FAIL');
  const unknownChecks = checks.filter((x) => x.status === 'UNKNOWN');
  return { candidateId: c.id, status: failedChecks.length ? 'FAIL' : unknownChecks.length ? 'UNKNOWN' : 'PASS', checks, failedChecks, unknownChecks };
}

/** Requisitos de la unidad usada (Step 8a). Desconocido → UNKNOWN (UNCONFIRMED en Practical Fit), nunca PASS. */
function usedChecks(c: ComparisonCandidate, r: Req): DealBreakerCheck[] {
  if (c.subject?.kind !== 'USED_INSTANCE') return [];
  const f = c.subject.usedFacts;
  const out: DealBreakerCheck[] = [];
  const unknown = (criterion: keyof Req, required: number, unit: string, what: string): DealBreakerCheck => ({
    criterion,
    requiredValue: required,
    status: 'UNKNOWN',
    reason: `${what} of this used vehicle is not known`,
    message: cmessage('comparison.requirement.used_unknown', { criterion, required, unit }),
  });
  const numeric = (criterion: keyof Req, required: number | undefined, fact: UsedNumericFact, kind: 'MIN' | 'MAX', unit: string, what: string, scale = 1) => {
    if (required === undefined || fact.state === 'NOT_APPLICABLE') return;
    if (fact.state === 'UNKNOWN') return void out.push(unknown(criterion, required, unit, what));
    const observed = { min: fact.min / scale, max: fact.max / scale };
    const base = check(criterion, required, observed, kind, unit, what);
    // Garantía CALCULADA desde la original: su máximo es una cota superior (FAIL cierto); cumplirla exige confirmar condiciones.
    // (La edad también es CALCULADA desde la matriculación declarada, pero es un hecho: no necesita esta regla.)
    if (criterion === 'minWarrantyRemainingMonths' && fact.basis === 'CALCULATED' && base.status !== 'FAIL') {
      out.push({
        ...base,
        status: 'UNKNOWN',
        reason: `${what} ${observed.min}–${observed.max} ${unit} calculated from the original warranty: confirm it applies to this unit`,
        message: cmessage('comparison.requirement.calculated_unconfirmed', { criterion, required, unit, observedMin: observed.min, observedMax: observed.max }),
      });
      return;
    }
    out.push(base);
  };
  numeric('maxMileageKm', r.maxMileageKm, f.mileageKm, 'MAX', 'km', 'mileage');
  numeric('maxAgeYears', r.maxAgeYears, f.ageMonths, 'MAX', 'years', 'age', 12);
  numeric('minBatteryHealthPct', r.minBatteryHealthPct, f.batteryHealthPct, 'MIN', '%', 'battery health');
  numeric('minWarrantyRemainingMonths', r.minWarrantyRemainingMonths, f.warrantyRemainingMonths, 'MIN', 'months', 'remaining warranty');
  // Step 8b — requisito categórico. Se expresa como bandera (1 = completo) para reutilizar el contrato de requisitos;
  // los mensajes llevan `flag: true` para que nunca se presente como una cantidad.
  if (r.mustHaveFullServiceHistory) {
    const h = f.serviceHistory ?? { state: 'UNKNOWN' as const };
    const criterion = 'mustHaveFullServiceHistory' as const;
    if (h.state === 'UNKNOWN') out.push({ ...unknown(criterion, 1, 'FLAG', 'service history'), message: cmessage('comparison.requirement.used_unknown', { criterion, required: 1, unit: 'FLAG', flag: true }) });
    else {
      const full = h.value === 'FULL';
      out.push({
        criterion,
        requiredValue: 1,
        observedValue: { min: full ? 1 : 0, max: full ? 1 : 0, unit: 'FLAG' },
        status: full ? 'PASS' : 'FAIL',
        reason: full ? 'service history is complete' : `service history is ${h.value.toLowerCase()}`,
        message: cmessage(full ? 'comparison.requirement.service_history_full' : 'comparison.requirement.service_history_not_full', { criterion, history: h.value, flag: true }),
      });
    }
  }
  return out;
}
