import type { SpecKey } from '@vscar/vehicle-schema';
import type { DifferenceClass } from './meaningful-difference.ts';

/**
 * Meaningful For You v0.1 (Plan §12.2): reescala la relevancia de una diferencia numérica según el perfil.
 * No cambia la diferencia ni Technical Capability; solo la relevancia personal. Reglas públicas y versionadas.
 */
export type Priority = 'low' | 'medium' | 'high';

export interface ForYouProfile {
  annual_km?: number;
  /** Distancia diaria típica. */
  daily_km?: number;
  long_trips_per_year?: number;
  home_charging?: boolean;
  family_size?: number;
  priorities?: Partial<Record<'performance' | 'economy' | 'space', Priority>>;
}

export interface ForYouContext {
  /** Menor valor de la clave entre los vehículos comparados (p. ej. autonomía mínima). */
  smallest_value?: number;
}

export interface ForYouResult {
  general: DifferenceClass;
  for_you: DifferenceClass;
  applied_rules: string[];
}

const ORDER: readonly DifferenceClass[] = ['TIE', 'SLIGHT', 'MEANINGFUL', 'CLEAR'];
const shift = (c: DifferenceClass, steps: number): DifferenceClass => {
  if (c === 'TIE') return 'TIE'; // un empate numérico nunca se convierte en diferencia
  const i = Math.min(Math.max(ORDER.indexOf(c) + steps, 1), ORDER.length - 1);
  return ORDER[i]!;
};

const RANGE_KEYS: ReadonlySet<string> = new Set(['rng.electric_combined_km', 'rng.electric_highway_km', 'rng.phev_total_km']);
const CARGO_KEYS: ReadonlySet<string> = new Set(['cap.boot_l', 'cap.boot_max_l', 'cap.boot_roof_l']);
const PERFORMANCE_KEYS: ReadonlySet<string> = new Set(['perf.accel_0_100_s', 'perf.accel_0_60_s', 'perf.power_max_kw', 'perf.torque_max_nm']);
const CONSUMPTION_KEYS: ReadonlySet<string> = new Set(['nrg.fuel_combined_l100', 'nrg.fuel_charge_sustaining_l100', 'nrg.electric_combined_kwh100']);

export const FOR_YOU_RULES = {
  version: 'for-you-v1',
  range_daily_margin: 3,
  range_few_long_trips: 2,
  range_many_long_trips: 6,
  cargo_large_family: 4,
  consumption_high_km: 30_000,
  consumption_low_km: 8_000,
} as const;

export function meaningfulForYou(specKey: SpecKey, general: DifferenceClass, profile: ForYouProfile, ctx: ForYouContext = {}): ForYouResult {
  let c = general;
  const applied: string[] = [];
  const R = FOR_YOU_RULES;

  if (RANGE_KEYS.has(specKey)) {
    const fewTrips = (profile.long_trips_per_year ?? Infinity) <= R.range_few_long_trips;
    const dailyFits = profile.daily_km !== undefined && ctx.smallest_value !== undefined && profile.daily_km * R.range_daily_margin <= ctx.smallest_value;
    if (fewTrips && profile.home_charging && dailyFits) {
      c = shift(c, -2);
      applied.push('range: daily use far below every car range, charging at home, few long trips');
    } else if ((profile.long_trips_per_year ?? 0) >= R.range_many_long_trips) {
      applied.push('range: frequent long trips keep full relevance');
    }
  }
  if (CARGO_KEYS.has(specKey)) {
    if ((profile.family_size ?? 0) >= R.cargo_large_family) {
      c = shift(c, +1);
      applied.push('cargo: large family');
    } else if (profile.family_size === 1 && (profile.long_trips_per_year ?? 0) === 0) {
      c = shift(c, -1);
      applied.push('cargo: single driver without long trips');
    }
  }
  if (PERFORMANCE_KEYS.has(specKey)) {
    const p = profile.priorities?.performance;
    if (p === 'low') {
      c = shift(c, -1);
      applied.push('performance: low priority');
    } else if (p === 'high') {
      c = shift(c, +1);
      applied.push('performance: high priority');
    }
  }
  if (CONSUMPTION_KEYS.has(specKey) && profile.annual_km !== undefined) {
    if (profile.annual_km >= R.consumption_high_km) {
      c = shift(c, +1);
      applied.push('consumption: high annual mileage');
    } else if (profile.annual_km <= R.consumption_low_km) {
      c = shift(c, -1);
      applied.push('consumption: low annual mileage');
    }
  }
  return { general, for_you: c, applied_rules: applied };
}
