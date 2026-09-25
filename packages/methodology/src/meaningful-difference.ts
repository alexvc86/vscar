import { getSpecKeyDefinition, type MeasurementBasisField, type SpecKey, type SpecValue } from '@vscar/vehicle-schema';

/**
 * Meaningful Difference (Plan §12.1, Catalog v0.2 §3.4/§5). Umbrales iniciales del plan; los marcados
 * como `provisional` son propuestas de v0.1 pendientes de calibración.
 */
export type DifferenceClass = 'TIE' | 'SLIGHT' | 'MEANINGFUL' | 'CLEAR';

export interface DifferenceThreshold {
  /** Umbrales absolutos [tie, meaningful, clear] en la unidad canónica. */
  readonly abs: readonly [number, number, number];
  /** Umbrales relativos opcionales; el efectivo es max(abs, pct × |referencia|). */
  readonly pct?: readonly [number, number, number];
  readonly provisional?: boolean;
}

const t = (abs: [number, number, number], extra: Omit<DifferenceThreshold, 'abs'> = {}): DifferenceThreshold => ({ abs, ...extra });

export const DIFFERENCE_THRESHOLDS: Readonly<Partial<Record<SpecKey | 'price_eur', DifferenceThreshold>>> = {
  'perf.accel_0_100_s': t([0.4, 0.7, 1.0]),
  'cap.boot_l': t([30, 50, 80]),
  'nrg.fuel_combined_l100': t([0.3, 0.5, 0.8]),
  'nrg.fuel_charge_sustaining_l100': t([0.3, 0.5, 0.8]),
  'nrg.electric_combined_kwh100': t([1.0, 1.5, 2.5]),
  'rng.electric_combined_km': t([30, 50, 80]),
  'chg.dc_max_kw': t([10, 25, 50]),
  'chg.dc_time_min': t([3, 6, 10]),
  price_eur: t([500, 1000, 2000], { pct: [0.01, 0.025, 0.05] }),
  // Propuestas v0.1 (no están en el plan):
  'perf.power_max_kw': t([5, 10, 20], { pct: [0.04, 0.08, 0.15], provisional: true }),
  'chg.ac_max_kw': t([1, 3, 7], { provisional: true }),
  'emi.co2_combined_gkm': t([5, 10, 25], { provisional: true }),
  'pt.fuel_tank_l': t([3, 6, 10], { provisional: true }),
  'bat.capacity_kwh': t([3, 6, 10], { provisional: true }),
  'dim.length_mm': t([50, 100, 200], { provisional: true }),
  'dim.width_mm': t([20, 40, 70], { provisional: true }),
  'dim.height_mm': t([30, 60, 100], { provisional: true }),
  'war.years': t([0.5, 1, 2], { provisional: true }),
};

/** Bases que, si faltan o son UNSPECIFIED, impiden comparar directamente (el resto solo avisa). */
const BLOCKING_BASES: ReadonlySet<MeasurementBasisField> = new Set([
  'power_basis',
  'battery_capacity_basis',
  'mass_definition',
  'turning_measure',
  'consumption_basis',
  'soc_from_pct',
  'soc_to_pct',
]);

export type ComparisonResult =
  | { comparable: false; reason: string }
  | {
      comparable: true;
      /** Clase si ambos extremos coinciden; `RANGE_DEPENDENT` si el rango la hace variar. */
      classification: DifferenceClass | 'RANGE_DEPENDENT';
      low: DifferenceClass;
      high: DifferenceClass;
      /** Diferencia b − a como intervalo. */
      delta: readonly [number, number];
      /** Quién es mejor según `higher_is_better`; `undefined` si depende del rango o es empate. */
      better: 'a' | 'b' | undefined;
      warnings: string[];
    };

function interval(v: SpecValue): [number, number] | undefined {
  if (typeof v.value === 'number') return [v.value, v.value];
  if (v.value_min !== undefined && v.value_max !== undefined) return [v.value_min, v.value_max];
  return undefined;
}

function effectiveCycle(v: SpecValue): { cycle: string | undefined; inferred: boolean } {
  if (v.test_cycle === 'UNDECLARED') return { cycle: v.test_cycle_inferred, inferred: true };
  return { cycle: v.test_cycle, inferred: false };
}

export function classifyMagnitude(threshold: DifferenceThreshold, magnitude: number, reference: number): DifferenceClass {
  const eff = threshold.abs.map((a, i) => Math.max(a, (threshold.pct?.[i] ?? 0) * Math.abs(reference))) as [number, number, number];
  if (magnitude < eff[0]) return 'TIE';
  if (magnitude < eff[1]) return 'SLIGHT';
  if (magnitude < eff[2]) return 'MEANINGFUL';
  return 'CLEAR';
}

/**
 * Compara dos valores de la misma SpecKey. Nunca compara ciclos o bases distintas como equivalentes.
 */
export function compareValues(a: SpecValue, b: SpecValue): ComparisonResult {
  if (a.spec_key !== b.spec_key) return { comparable: false, reason: 'different SpecKeys' };
  const def = getSpecKeyDefinition(a.spec_key);
  const threshold = DIFFERENCE_THRESHOLDS[a.spec_key as SpecKey];
  if (!def || !threshold) return { comparable: false, reason: `no meaningful-difference threshold for ${a.spec_key}` };
  if (a.unit !== b.unit) return { comparable: false, reason: 'different units' };

  const warnings: string[] = [];
  if (def.cycle) {
    const ca = effectiveCycle(a);
    const cb = effectiveCycle(b);
    if (ca.cycle === undefined || cb.cycle === undefined) return { comparable: false, reason: 'NOT_DIRECTLY_COMPARABLE: test cycle not declared' };
    if (ca.cycle !== cb.cycle) return { comparable: false, reason: `NOT_DIRECTLY_COMPARABLE: ${ca.cycle} vs ${cb.cycle}` };
    if (ca.inferred || cb.inferred) warnings.push('cycle inferred, not declared');
  }
  for (const field of def.basis ?? []) {
    const x = a.measurement_basis?.[field];
    const y = b.measurement_basis?.[field];
    const unspecified = x === undefined || y === undefined || x === 'UNSPECIFIED' || y === 'UNSPECIFIED';
    if (BLOCKING_BASES.has(field)) {
      if (unspecified) return { comparable: false, reason: `NOT_DIRECTLY_COMPARABLE: ${field} unspecified` };
      if (x !== y) return { comparable: false, reason: `NOT_DIRECTLY_COMPARABLE: ${field} ${String(x)} vs ${String(y)}` };
    } else if (unspecified) {
      warnings.push(`${field} unspecified`);
    } else if (x !== y) {
      return { comparable: false, reason: `NOT_DIRECTLY_COMPARABLE: ${field} ${String(x)} vs ${String(y)}` };
    }
  }

  const ia = interval(a);
  const ib = interval(b);
  if (!ia || !ib) return { comparable: false, reason: 'non-numeric values' };

  const delta: [number, number] = [ib[0] - ia[1], ib[1] - ia[0]];
  const reference = Math.max(Math.abs(ia[1]), Math.abs(ib[1]));
  const crossesZero = delta[0] <= 0 && delta[1] >= 0;
  const minMag = crossesZero ? 0 : Math.min(Math.abs(delta[0]), Math.abs(delta[1]));
  const maxMag = Math.max(Math.abs(delta[0]), Math.abs(delta[1]));
  const low = classifyMagnitude(threshold, minMag, reference);
  const high = classifyMagnitude(threshold, maxMag, reference);

  let better: 'a' | 'b' | undefined;
  if (!crossesZero && high !== 'TIE' && def.higherIsBetter !== null) {
    const bLarger = delta[0] > 0;
    better = bLarger === def.higherIsBetter ? 'b' : 'a';
  }
  if (low === 'TIE' && high === 'TIE') better = undefined;
  if (a.value_min !== undefined || b.value_min !== undefined) warnings.push('homologated range');

  return { comparable: true, classification: low === high ? low : 'RANGE_DEPENDENT', low, high, delta, better, warnings };
}
