import type { SpecKey } from '@vscar/vehicle-schema';

/**
 * Funciones de utilidad por criterio (Plan §13.1): valor físico → utilidad 0–100.
 * v0.1 usa curvas lineales por tramos, transparentes y publicables; la calibración con usuarios llegará después.
 */
export interface PiecewiseLinearCurve {
  readonly type: 'piecewise_linear';
  /** Puntos (x, utilidad) con x creciente. Fuera del rango se satura al extremo. */
  readonly points: readonly (readonly [number, number])[];
  readonly note?: string;
}

export type UtilityCurve = PiecewiseLinearCurve;

export function evaluateUtility(curve: UtilityCurve, x: number): number {
  const pts = curve.points;
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i]!;
    const [x0, y0] = pts[i - 1]!;
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return last[1];
}

/** Utilidad de un rango homologado: nunca un punto medio inventado (D4). */
export function evaluateUtilityRange(curve: UtilityCurve, min: number, max: number): { low: number; high: number } {
  const a = evaluateUtility(curve, min);
  const b = evaluateUtility(curve, max);
  return { low: Math.min(a, b), high: Math.max(a, b) };
}

const pl = (points: [number, number][], note?: string): PiecewiseLinearCurve => ({ type: 'piecewise_linear', points, ...(note ? { note } : {}) });

export const UTILITY_CURVES: Readonly<Partial<Record<SpecKey, UtilityCurve>>> = {
  'perf.accel_0_100_s': pl([[4, 100], [6, 95], [8, 82], [10, 60], [12, 35], [15, 10]], 'zona plana en coches rápidos'),
  'perf.power_max_kw': pl([[50, 20], [80, 45], [110, 65], [150, 80], [220, 92], [300, 98], [400, 100]], 'saturante'),
  'cap.boot_l': pl([[200, 20], [350, 50], [450, 78], [550, 92], [650, 98], [800, 100]], 'más allá de ~650 L aporta poco'),
  'nrg.fuel_combined_l100': pl([[3.5, 100], [4.5, 90], [5.5, 75], [6.5, 58], [8, 35], [10, 15], [13, 0]]),
  'nrg.fuel_charge_sustaining_l100': pl([[3.5, 100], [4.5, 90], [5.5, 75], [6.5, 58], [8, 35], [10, 15], [13, 0]]),
  'nrg.electric_combined_kwh100': pl([[12, 100], [14, 90], [16, 78], [18, 62], [20, 45], [24, 20], [28, 5]]),
  'rng.electric_combined_km': pl([[40, 5], [150, 20], [250, 40], [350, 62], [450, 85], [550, 95], [700, 100]]),
  'chg.dc_max_kw': pl([[40, 15], [50, 25], [100, 55], [150, 75], [200, 88], [270, 97], [350, 100]]),
  'chg.ac_max_kw': pl([[3.6, 20], [7.4, 55], [11, 85], [22, 100]]),
  'emi.co2_combined_gkm': pl([[0, 100], [50, 90], [100, 75], [120, 65], [150, 45], [200, 20], [250, 5]]),
  'war.years': pl([[1, 10], [2, 35], [3, 55], [5, 80], [7, 95], [10, 100]]),
  'saf.ncap_adult_pct': pl([[50, 10], [70, 45], [80, 65], [90, 88], [100, 100]]),
};
