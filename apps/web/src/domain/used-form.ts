import { USED_LIMITS, UsedFacts } from './used-params.ts';

/**
 * Step 8b — formulario de la unidad usada (estado de la UI → `UsedFacts`). Puro y testeable: la validación es la
 * misma que la del parser de URL (`UsedFacts` + límites), más las reglas que dependen de "hoy" (matriculación).
 * Todo es opcional: un campo vacío es DESCONOCIDO (nunca 0, nunca un supuesto).
 */
export interface UsedFormValues {
  price: string;
  km: string;
  regYear: string;
  /** "" = mes desconocido. */
  regMonth: string;
  warranty: string;
  warrantyUnknown: boolean;
  service: 'full' | 'partial' | 'none' | 'unknown';
  state: 'ok' | 'issues' | 'unknown';
  soh: string;
  sohUnknown: boolean;
  damage: 'none' | 'declared' | 'unknown';
}

export const EMPTY_USED_FORM: UsedFormValues = {
  price: '',
  km: '',
  regYear: '',
  regMonth: '',
  warranty: '',
  warrantyUnknown: true,
  service: 'unknown',
  state: 'unknown',
  soh: '',
  sohUnknown: true,
  damage: 'unknown',
};

export type UsedFormField = keyof UsedFormValues;
export type UsedFormErrorCode = 'integer' | 'price' | 'km' | 'regYear' | 'regFuture' | 'regMonth' | 'warranty' | 'soh';
export interface UsedFormError {
  field: UsedFormField;
  code: UsedFormErrorCode;
  params?: Record<string, number>;
}

/** Entero no negativo; admite separadores de miles ("28.000", "28,000", "28 000"), nunca decimales. */
export function parseWholeNumber(raw: string): number | undefined | 'invalid' {
  const s = raw.trim();
  if (!s) return undefined;
  if (/^\d+$/.test(s)) return Number(s);
  if (/^\d{1,3}([.,\s  ]\d{3})+$/.test(s)) return Number(s.replace(/[.,\s  ]/g, ''));
  return 'invalid';
}

export function validateUsedForm(v: UsedFormValues, today: string, sohApplies: boolean): { ok: true; facts: UsedFacts } | { ok: false; errors: UsedFormError[] } {
  const errors: UsedFormError[] = [];
  const facts: Record<string, unknown> = {};
  const num = (field: UsedFormField, raw: string, range: { min: number; max: number }, code: UsedFormErrorCode, key: string) => {
    const n = parseWholeNumber(raw);
    if (n === undefined) return;
    if (n === 'invalid' || !Number.isSafeInteger(n)) return void errors.push({ field, code: 'integer' });
    if (n < range.min || n > range.max) return void errors.push({ field, code, params: { min: range.min, max: range.max } });
    facts[key] = n;
  };
  num('price', v.price, USED_LIMITS.price, 'price', 'price');
  num('km', v.km, USED_LIMITS.km, 'km', 'km');

  const evY = Number(today.slice(0, 4));
  const evM = Number(today.slice(5, 7));
  const year = parseWholeNumber(v.regYear);
  const month = v.regMonth ? Number(v.regMonth) : undefined;
  if (year === 'invalid') errors.push({ field: 'regYear', code: 'integer' });
  else if (year === undefined) {
    if (month !== undefined) errors.push({ field: 'regYear', code: 'regMonth' });
  } else if (year < USED_LIMITS.regYear.min || year > evY) errors.push({ field: 'regYear', code: 'regYear', params: { min: USED_LIMITS.regYear.min, max: evY } });
  else if (month !== undefined && (month < 1 || month > 12 || !Number.isInteger(month))) errors.push({ field: 'regMonth', code: 'regMonth' });
  else if (year === evY && month !== undefined && month > evM) errors.push({ field: 'regMonth', code: 'regFuture' });
  else facts.reg = { year, ...(month !== undefined ? { month } : {}) };

  if (!v.warrantyUnknown) num('warranty', v.warranty, USED_LIMITS.warranty, 'warranty', 'warranty');
  if (v.service !== 'unknown') facts.service = v.service;
  if (v.state !== 'unknown') facts.state = v.state;
  // La salud de batería solo se pide si aplica (BEV/PHEV/EREV); nunca un 100 % por defecto.
  if (sohApplies && !v.sohUnknown) num('soh', v.soh, USED_LIMITS.soh, 'soh', 'soh');
  if (v.damage !== 'unknown') facts.damage = v.damage;

  if (errors.length) return { ok: false, errors };
  return { ok: true, facts: UsedFacts.parse(facts) };
}

/** Hechos ya confirmados → formulario (volver a editar la misma unidad sin perder nada). */
export function factsToForm(f: UsedFacts): UsedFormValues {
  return {
    price: f.price !== undefined ? String(f.price) : '',
    km: f.km !== undefined ? String(f.km) : '',
    regYear: f.reg ? String(f.reg.year) : '',
    regMonth: f.reg?.month ? String(f.reg.month) : '',
    warranty: f.warranty !== undefined ? String(f.warranty) : '',
    warrantyUnknown: f.warranty === undefined,
    service: f.service ?? 'unknown',
    state: f.state ?? 'unknown',
    soh: f.soh !== undefined ? String(f.soh) : '',
    sohUnknown: f.soh === undefined,
    damage: f.damage ?? 'unknown',
  };
}
