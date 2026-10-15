import type { VehicleAge } from './contracts.ts';

/**
 * Edad del vehículo (Step 8a §6, §40–41). Reglas:
 *   1. Con fecha de primera matriculación: meses COMPLETOS hasta la fecha de evaluación (punto).
 *   2. Solo con el año: rango honesto [desde el 31-dic, desde el 1-ene] de ese año (sin suponer un mes).
 *      Con año y mes (Step 8b): la misma regla a la precisión declarada → [desde el último día, desde el día 1] del mes.
 *      No es una regla nueva: el rango se estrecha porque el dato es más preciso (nunca se supone el día).
 *   3. Sin dato explícito: UNKNOWN. Nunca se deduce del model year, del año supuesto ni de fechas de fuentes.
 * La fecha de evaluación es siempre explícita: el helper no lee el reloj.
 */
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parts(iso: string): [number, number, number] {
  const m = DATE.exec(iso);
  if (!m) throw new Error(`expected YYYY-MM-DD, got ${iso}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Meses completos de `from` a `to` (negativo si `to` es anterior). */
export function fullMonthsBetween(from: string, to: string): number {
  const [y1, m1, d1] = parts(from);
  const [y2, m2, d2] = parts(to);
  const raw = (y2 - y1) * 12 + (m2 - m1);
  if (raw > 0 && d2 < d1) return raw - 1;
  if (raw < 0 && d2 > d1) return raw + 1;
  if (raw === 0 && d2 < d1) return -1;
  return raw;
}

const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export function calculateVehicleAge(registration: { registrationDate?: string; registrationYear?: number; registrationMonth?: number }, evaluationDate: string): VehicleAge {
  parts(evaluationDate);
  if (registration.registrationDate !== undefined) {
    const months = fullMonthsBetween(registration.registrationDate, evaluationDate);
    if (months < 0 || registration.registrationDate > evaluationDate) return { months: { state: 'UNKNOWN' }, source: 'REGISTRATION_DATE', invalid: 'REGISTRATION_AFTER_EVALUATION' };
    return { months: { state: 'KNOWN', min: months, max: months, basis: 'CALCULATED' }, source: 'REGISTRATION_DATE' };
  }
  if (registration.registrationYear !== undefined) {
    const y = registration.registrationYear;
    const m = registration.registrationMonth;
    const first = m ? `${y}-${pad(m)}-01` : `${y}-01-01`;
    const last = m ? `${y}-${pad(m)}-${pad(lastDay(y, m))}` : `${y}-12-31`;
    const max = fullMonthsBetween(first, evaluationDate);
    if (max < 0 || first > evaluationDate) return { months: { state: 'UNKNOWN' }, source: 'REGISTRATION_YEAR', invalid: 'REGISTRATION_AFTER_EVALUATION' };
    const min = Math.max(0, fullMonthsBetween(last, evaluationDate));
    return { months: { state: 'KNOWN', min, max, basis: 'CALCULATED' }, source: 'REGISTRATION_YEAR' };
  }
  return { months: { state: 'UNKNOWN' }, source: 'NONE' };
}
