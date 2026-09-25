import { ECONOMICS_RULES } from '@vscar/methodology';

/**
 * Dinero e intervalos (redondeo `money-v1`, ver `ECONOMICS_RULES.rounding`).
 * - Importes: enteros en unidades menores (céntimos) + ISO 4217.
 * - Cálculo sin redondear; un importe anual por componente se redondea una vez (HALF_UP, alejándose de cero);
 *   los acumulados son sumas enteras → nunca se acumula error de coma flotante en dinero.
 * - Tasas (€/100 km) y cantidades físicas no son importes: se informan con decimales fijos.
 */
export interface Range {
  min: number;
  max: number;
}

export const point = (x: number): Range => ({ min: x, max: x });
export const isPoint = (r: Range) => r.min === r.max;

/** Normaliza a 12 cifras significativas antes de redondear (evita 0.00499999… → 0 en valores "exactos"). */
const normalize = (x: number) => Number(x.toPrecision(12));

/** € → céntimos, HALF_UP alejándose de cero. */
export function toMinor(eur: number): number {
  const cents = normalize(Math.abs(eur) * 100);
  const r = Math.floor(cents + 0.5);
  return eur < 0 ? -r : r;
}

export const roundTo = (x: number, decimals: number) => {
  const f = 10 ** decimals;
  return (Math.sign(x) * Math.floor(normalize(Math.abs(x) * f) + 0.5)) / f;
};

export const rate = (r: Range): Range => ({ min: roundTo(r.min, ECONOMICS_RULES.rounding.rate_decimals), max: roundTo(r.max, ECONOMICS_RULES.rounding.rate_decimals) });
export const minorRange = (eur: Range): Range => ({ min: toMinor(eur.min), max: toMinor(eur.max) });

/** Sin ceros negativos (−0 ≠ 0 para comparaciones estrictas). */
const z = (x: number) => (x === 0 ? 0 : x);
export const add = (a: Range, b: Range): Range => ({ min: z(a.min + b.min), max: z(a.max + b.max) });
export const sub = (a: Range, b: Range): Range => ({ min: z(a.min - b.max), max: z(a.max - b.min) });
export const scale = (a: Range, k: number): Range => (k >= 0 ? { min: a.min * k, max: a.max * k } : { min: a.max * k, max: a.min * k });
/** Producto de intervalos de valores no negativos. */
export const mul = (a: Range, b: Range): Range => ({ min: a.min * b.min, max: a.max * b.max });
export const neg = (a: Range): Range => ({ min: z(-a.max), max: z(-a.min) });
export const sum = (xs: readonly Range[]): Range => xs.reduce(add, point(0));
