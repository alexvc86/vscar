import type { EconomicResult } from './contracts.ts';
import { roundTo, sub, type Range } from './money.ts';

/**
 * Diferencias económicas entre dos resultados ya calculados (cada uno independiente del otro).
 * Antisimetría garantizada: `economicDelta(a, b) = −economicDelta(b, a)` (aritmética de intervalos).
 */
export interface EconomicDelta {
  a: string;
  b: string;
  /** a − b (positivo: A cuesta más). */
  runningAnnual_minor?: Range;
  purchase_minor?: Range;
  running: { years: number; delta_minor: Range }[];
  /** Solo entre vistas comparables (mismos componentes incluidos). */
  ownership: { years: number; view: 'COMPLETE' | 'KNOWN_COST_VIEW'; delta_minor: Range }[];
}

export function economicDelta(a: EconomicResult, b: EconomicResult): EconomicDelta {
  const running = a.runningCost.horizons.flatMap((ha) => {
    const hb = b.runningCost.horizons.find((h) => h.years === ha.years);
    return hb ? [{ years: ha.years, delta_minor: sub(ha.total_minor, hb.total_minor) }] : [];
  });
  const ownership = a.ownershipCost.horizons.flatMap((ha) => {
    const hb = b.ownershipCost.horizons.find((h) => h.years === ha.years);
    const comparable = hb && [...ha.included].sort().join() === [...hb.included].sort().join();
    return comparable ? [{ years: ha.years, view: ha.view, delta_minor: sub(ha.total_minor, hb.total_minor) }] : [];
  });
  return {
    a: a.vehicleId,
    b: b.vehicleId,
    ...(a.runningCost.annual_minor && b.runningCost.annual_minor ? { runningAnnual_minor: sub(a.runningCost.annual_minor, b.runningCost.annual_minor) } : {}),
    ...(a.ownershipCost.purchase && b.ownershipCost.purchase
      ? { purchase_minor: sub({ min: a.ownershipCost.purchase.amount_minor, max: a.ownershipCost.purchase.amount_minor }, { min: b.ownershipCost.purchase.amount_minor, max: b.ownershipCost.purchase.amount_minor }) }
      : {}),
    running,
    ownership,
  };
}

export type BreakEven =
  | { status: 'BREAK_EVEN'; years: Range; extraPurchase_minor: Range; annualSaving_minor: Range }
  /** El ahorro puede ser ≤ 0 dentro del rango: solo hay cota inferior. */
  | { status: 'BREAK_EVEN_UNCERTAIN'; minYears: number; extraPurchase_minor: Range; annualSaving_minor: Range }
  | { status: 'NO_BREAK_EVEN'; reason: string; extraPurchase_minor: Range; annualSaving_minor: Range }
  | { status: 'NO_PREMIUM'; reason: string; extraPurchase_minor: Range; annualSaving_minor: Range }
  | { status: 'UNAVAILABLE'; reason: string };

/**
 * ¿Cuándo compensa pagar más por `premium` si gasta menos al año que `baseline`?
 * years = sobreprecio / ahorro anual. Ahorro ≤ 0 → NO_BREAK_EVEN (nunca se fuerza un número).
 */
export function breakEven(premium: EconomicResult, baseline: EconomicResult, opts: { extraPurchase_minor?: number } = {}): BreakEven {
  const ra = premium.runningCost.annual_minor;
  const rb = baseline.runningCost.annual_minor;
  if (!ra || !rb) return { status: 'UNAVAILABLE', reason: 'running cost unavailable for at least one vehicle' };
  const extra: Range | undefined =
    opts.extraPurchase_minor !== undefined
      ? { min: opts.extraPurchase_minor, max: opts.extraPurchase_minor }
      : premium.ownershipCost.purchase && baseline.ownershipCost.purchase
        ? sub({ min: premium.ownershipCost.purchase.amount_minor, max: premium.ownershipCost.purchase.amount_minor }, { min: baseline.ownershipCost.purchase.amount_minor, max: baseline.ownershipCost.purchase.amount_minor })
        : undefined;
  if (!extra) return { status: 'UNAVAILABLE', reason: 'purchase price unavailable for at least one vehicle' };
  const saving = sub(rb, ra);
  if (extra.max <= 0) return { status: 'NO_PREMIUM', reason: 'the vehicle is not more expensive to buy', extraPurchase_minor: extra, annualSaving_minor: saving };
  if (saving.max <= 0) return { status: 'NO_BREAK_EVEN', reason: 'it does not save running cost per year', extraPurchase_minor: extra, annualSaving_minor: saving };
  const y = (e: number, s: number) => roundTo(e / s, 2);
  if (saving.min <= 0) return { status: 'BREAK_EVEN_UNCERTAIN', minYears: y(Math.max(extra.min, 0), saving.max), extraPurchase_minor: extra, annualSaving_minor: saving };
  return { status: 'BREAK_EVEN', years: { min: y(Math.max(extra.min, 0), saving.max), max: y(extra.max, saving.min) }, extraPurchase_minor: extra, annualSaving_minor: saving };
}
