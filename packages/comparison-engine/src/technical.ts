import {
  DIFFERENCE_THRESHOLDS,
  compareIntervals,
  compareValues,
  meaningfulForYou,
  type DifferenceClass,
  type DifferenceKey,
  type ForYouProfile,
  type IntervalComparison,
} from '@vscar/methodology';
import { getSpecKeyDefinition, type SafetyRating, type SpecKey, type SpecValue } from '@vscar/vehicle-schema';
import type { ComparisonCandidate, ComparisonCategory, ComparisonOutcome, ComparisonScenario, MetricComparison, Range, ValueView } from './contracts.ts';

/**
 * Métricas técnicas por categoría (estructura del engine; los umbrales viven en methodology).
 * `kind`: numeric (Meaningful Difference) · descriptive (enum/equipamiento: A tiene / B no, sin preferencia).
 */
interface MetricDef {
  key: string;
  label: string;
  category: ComparisonCategory;
  kind: 'numeric' | 'descriptive';
}

const m = (category: ComparisonCategory, kind: MetricDef['kind'], ...keys: [string, string][]): MetricDef[] => keys.map(([key, label]) => ({ key, label, category, kind }));

export const TECHNICAL_METRICS: readonly MetricDef[] = [
  ...m('Performance', 'numeric', ['perf.power_max_kw', 'maximum power'], ['perf.accel_0_100_s', '0–100 km/h']),
  ...m('Range', 'numeric', ['rng.electric_combined_km', 'electric range'], ['rng.phev_total_km', 'total range (PHEV)']),
  ...m('Charging', 'numeric', ['chg.ac_max_kw', 'AC charging power'], ['chg.dc_max_kw', 'DC peak charging power'], ['chg.dc_time_min', 'DC charging time']),
  ...m('Size', 'numeric', ['dim.length_mm', 'length'], ['dim.width_mm', 'width'], ['dim.height_mm', 'height'], ['cap.boot_l', 'boot'], ['dim.turning_m', 'turning circle']),
  ...m('Practicality', 'numeric', ['seats', 'seats'], ['cap.boot_max_l', 'boot, seats folded'], ['cap.towing_braked_kg', 'braked towing'], ['cap.payload_kg', 'payload'], ['cap.isofix_positions', 'ISOFIX positions']),
  ...m('Practicality', 'descriptive', ['cap.third_row', 'third row']),
  ...m('Warranty', 'numeric', ['war.years', 'warranty (years)'], ['war.km', 'warranty (km)'], ['bat.warranty_years', 'battery warranty (years)'], ['bat.warranty_km', 'battery warranty (km)']),
  ...m('Eco', 'numeric', ['emi.co2_combined_gkm', 'CO₂ emissions']),
  ...m('Eco', 'descriptive', ['emi.dgt_label_es', 'DGT environmental label']),
  ...m('Economy', 'numeric', ['nrg.fuel_combined_l100', 'fuel consumption'], ['nrg.fuel_charge_sustaining_l100', 'charge-sustaining fuel consumption'], ['nrg.electric_combined_kwh100', 'electric consumption']),
  ...m(
    'Technology',
    'descriptive',
    ['tech.apple_carplay', 'Apple CarPlay'],
    ['tech.android_auto', 'Android Auto'],
    ['adas.aeb', 'autonomous emergency braking'],
    ['adas.acc', 'adaptive cruise control'],
    ['adas.lane_keep', 'lane keeping'],
    ['adas.blind_spot', 'blind-spot monitoring'],
    ['tech.ota_updates', 'over-the-air updates'],
  ),
  ...m('Technology', 'numeric', ['tech.center_screen_in', 'centre screen']),
];

/** Métricas con regla de Meaningful For You en methodology (`for-you-v1`). */
const FOR_YOU_KEYS = new Set([
  'rng.electric_combined_km',
  'rng.phev_total_km',
  'cap.boot_l',
  'cap.boot_max_l',
  'perf.accel_0_100_s',
  'perf.power_max_kw',
  'nrg.fuel_combined_l100',
  'nrg.fuel_charge_sustaining_l100',
  'nrg.electric_combined_kwh100',
]);

const CLASS_ORDER: readonly DifferenceClass[] = ['TIE', 'SLIGHT', 'MEANINGFUL', 'CLEAR'];
export const maxClass = (xs: readonly DifferenceClass[]): DifferenceClass | undefined =>
  xs.length ? xs.reduce((a, b) => (CLASS_ORDER.indexOf(a) >= CLASS_ORDER.indexOf(b) ? a : b)) : undefined;

/** Perfil práctico para Meaningful For You: SIN prioridades de preferencia (eso es Step 6b). */
export const practicalProfile = (s: ComparisonScenario): ForYouProfile => ({
  ...(s.annualKm !== undefined ? { annual_km: s.annualKm } : {}),
  ...(s.dailyDistanceKm !== undefined ? { daily_km: s.dailyDistanceKm } : {}),
  ...(s.longTripsPerYear !== undefined ? { long_trips_per_year: s.longTripsPerYear } : {}),
  ...(s.homeChargingAvailable !== undefined ? { home_charging: s.homeChargingAvailable } : {}),
  ...(s.passengers !== undefined ? { family_size: s.passengers } : {}),
});

const interval = (v: SpecValue): [number, number] | undefined =>
  typeof v.value === 'number' ? [v.value, v.value] : v.value_min !== undefined && v.value_max !== undefined ? [v.value_min, v.value_max] : undefined;

const view = (v: SpecValue): ValueView => {
  const i = interval(v);
  return {
    min: i ? i[0] : (v.value as string | boolean),
    max: i ? i[1] : (v.value as string | boolean),
    unit: v.unit,
    ...(v.test_cycle ? { test_cycle: v.test_cycle === 'UNDECLARED' && v.test_cycle_inferred ? `${v.test_cycle_inferred} (inferred)` : v.test_cycle } : {}),
    ...(v.measurement_basis ? { basis: v.measurement_basis as Record<string, unknown> } : {}),
    value_id: v.id,
    source_id: v.source_id,
  };
};

/** Resultado de methodology (b − a, mejor a|b) → punto de vista de A con delta a − b. */
export function outcomeOf(c: IntervalComparison, higherIsBetter: boolean | null): { outcome: ComparisonOutcome; delta: Range } {
  // a − b; redondeo a 1e-9 para quitar ruido binario (5.4 − 5.2 = 0.2000…02).
  const clean = (x: number) => Math.round(x * 1e9) / 1e9 || 0;
  const delta = { min: clean(-c.delta[1]), max: clean(-c.delta[0]) };
  const crosses = delta.min <= 0 && delta.max >= 0;
  let outcome: ComparisonOutcome;
  if (c.classification === 'TIE') outcome = 'PRACTICAL_TIE';
  else if (c.better === 'a') outcome = 'AHEAD';
  else if (c.better === 'b') outcome = 'BEHIND';
  else if (higherIsBetter === null && !crosses) outcome = 'DIFFERENT';
  else outcome = 'RANGE_DEPENDENT';
  return { outcome, delta };
}

const fmt = (x: number) => (Number.isInteger(x) ? x.toLocaleString('en-US') : x.toLocaleString('en-US', { maximumFractionDigits: 2 }));
const fmtView = (v: ValueView) => (v.min === v.max ? `${typeof v.min === 'number' ? fmt(v.min) : String(v.min)}` : `${fmt(v.min as number)}–${fmt(v.max as number)}`);

function forYouOf(key: string, low: DifferenceClass, high: DifferenceClass, profile: ForYouProfile, smallest: number): { level: DifferenceClass | 'RANGE_DEPENDENT'; rules: string[] } | undefined {
  if (!FOR_YOU_KEYS.has(key)) return undefined;
  const lo = meaningfulForYou(key as SpecKey, low, profile, { smallest_value: smallest });
  const hi = meaningfulForYou(key as SpecKey, high, profile, { smallest_value: smallest });
  const rules = [...new Set([...lo.applied_rules, ...hi.applied_rules])];
  const level: DifferenceClass | 'RANGE_DEPENDENT' = lo.for_you === hi.for_you ? lo.for_you : 'RANGE_DEPENDENT';
  return { level, rules };
}

function explain(label: string, aName: string, bName: string, a: ValueView, b: ValueView, unit: string, outcome: ComparisonOutcome, meaningful: string | undefined, forYou?: { level: string; rules: string[] }): string | undefined {
  const head = `${label}: ${aName} ${fmtView(a)} vs ${bName} ${fmtView(b)}${unit ? ` ${unit}` : ''}`;
  let text: string;
  switch (outcome) {
    case 'AHEAD':
      text = `${head} — ${aName} ahead (${meaningful?.toLowerCase().replace('_', '-')} difference)`;
      break;
    case 'BEHIND':
      text = `${head} — ${bName} ahead (${meaningful?.toLowerCase().replace('_', '-')} difference)`;
      break;
    case 'PRACTICAL_TIE':
      text = `${head} — practical tie`;
      break;
    case 'RANGE_DEPENDENT':
      text = `${head} — the difference depends on configuration`;
      break;
    case 'DIFFERENT':
      text = `${head} — different (no better/worse direction)`;
      break;
    default:
      return undefined;
  }
  if (forYou && forYou.rules.length && forYou.level !== meaningful) text += `; for this scenario the practical impact is ${forYou.level.toLowerCase().replace('_', '-')} (${forYou.rules.join('; ')})`;
  return text;
}

/** Elige el par (valor de A, valor de B) comparable de menor rango combinado; simétrico respecto a A/B. */
function bestPair(a: readonly SpecValue[], b: readonly SpecValue[]) {
  const pairs = a.flatMap((va, i) => b.map((vb, j) => ({ va, vb, rank: i + j, key: [va.id, vb.id].sort().join('|'), cmp: compareValues(va, vb) })));
  const ok = pairs.filter((p) => p.cmp.comparable).sort((x, y) => x.rank - y.rank || x.key.localeCompare(y.key));
  if (ok.length) return { pair: ok[0]!, reason: undefined };
  const first = [...pairs].sort((x, y) => x.rank - y.rank || x.key.localeCompare(y.key))[0]!;
  return { pair: undefined, reason: first.cmp.comparable ? undefined : first.cmp.reason, first };
}

export function compareMetric(def: MetricDef, A: ComparisonCandidate, B: ComparisonCandidate, profile: ForYouProfile): MetricComparison {
  const base = { metric: def.key, label: def.label, category: def.category, warnings: [] as string[] };

  if (def.key === 'seats') {
    if (A.seats === undefined || B.seats === undefined) return { ...base, outcome: 'UNKNOWN', reason: `seats missing for ${A.seats === undefined ? A.label : B.label}` };
    const c = compareIntervals(DIFFERENCE_THRESHOLDS.seats!, [A.seats, A.seats], [B.seats, B.seats], true);
    const { outcome, delta } = outcomeOf(c, true);
    const a: ValueView = { min: A.seats, max: A.seats, unit: 'seats' };
    const b: ValueView = { min: B.seats, max: B.seats, unit: 'seats' };
    const explanation = explain(def.label, A.label, B.label, a, b, '', outcome, c.classification);
    return { ...base, outcome, meaningful: c.classification, a, b, delta, ...(explanation ? { explanation } : {}) };
  }

  const va = A.facts[def.key] ?? [];
  const vb = B.facts[def.key] ?? [];
  if (!va.length || !vb.length) {
    const who = [!va.length ? A.label : undefined, !vb.length ? B.label : undefined].filter(Boolean).join(' and ');
    return { ...base, outcome: 'UNKNOWN', reason: `no usable ${def.key} for ${who}`, ...(va[0] ? { a: view(va[0]) } : {}), ...(vb[0] ? { b: view(vb[0]) } : {}) };
  }

  if (def.kind === 'descriptive') {
    const x = va[0]!.value;
    const y = vb[0]!.value;
    const a = view(va[0]!);
    const b = view(vb[0]!);
    if (x === undefined || y === undefined || x === 'unknown' || y === 'unknown') return { ...base, outcome: 'UNKNOWN', a, b, reason: 'value unknown' };
    const outcome: ComparisonOutcome = x === y ? 'PRACTICAL_TIE' : 'DIFFERENT';
    const explanation =
      outcome === 'DIFFERENT' ? `${def.label}: ${A.label} ${String(x)} · ${B.label} ${String(y)}` : `${def.label}: both ${String(x)}`;
    return { ...base, outcome, a, b, explanation };
  }

  const threshold = DIFFERENCE_THRESHOLDS[def.key as DifferenceKey];
  const higher = getSpecKeyDefinition(def.key)?.higherIsBetter ?? null;
  if (!threshold) {
    // Sin umbral metodológico: solo igualdad exacta o diferencia descrita (nunca "empate práctico" inventado).
    const ia = interval(va[0]!);
    const ib = interval(vb[0]!);
    if (!ia || !ib) return { ...base, outcome: 'UNKNOWN', reason: 'non-numeric values' };
    const same = ia[0] === ib[0] && ia[1] === ib[1];
    const a = view(va[0]!);
    const b = view(vb[0]!);
    return { ...base, outcome: same ? 'PRACTICAL_TIE' : 'DIFFERENT', a, b, delta: { min: ia[0] - ib[1], max: ia[1] - ib[0] }, reason: 'no meaningful-difference threshold in methodology: described only', explanation: `${def.label}: ${A.label} ${fmtView(a)} vs ${B.label} ${fmtView(b)} ${a.unit ?? ''}`.trim() };
  }

  const { pair, reason } = bestPair(va, vb);
  if (!pair || !pair.cmp.comparable) {
    return { ...base, outcome: 'NOT_COMPARABLE', a: view(va[0]!), b: view(vb[0]!), reason: reason ?? 'not comparable' };
  }
  const cmp = pair.cmp;
  const { outcome, delta } = outcomeOf(cmp, higher);
  const a = view(pair.va);
  const b = view(pair.vb);
  const ia = interval(pair.va)!;
  const ib = interval(pair.vb)!;
  const forYou = forYouOf(def.key, cmp.low, cmp.high, profile, Math.min(ia[0], ib[0]));
  const explanation = explain(def.label, A.label, B.label, a, b, pair.va.unit ?? '', outcome, cmp.classification, forYou);
  return {
    ...base,
    outcome,
    meaningful: cmp.classification,
    ...(forYou ? { meaningfulForYou: forYou } : {}),
    a,
    b,
    delta,
    warnings: cmp.warnings,
    ...(explanation ? { explanation } : {}),
  };
}

// ------------------------------------------------------------------------------------------ seguridad

/**
 * Seguridad: solo se comparan ratings de la misma autoridad y el mismo protocolo. Si no, NOT_COMPARABLE con la
 * información descriptiva (estado EXPIRED visible). Nunca "5★ 2017 = 5★ 2025".
 */
export function compareSafety(A: ComparisonCandidate, B: ComparisonCandidate): MetricComparison[] {
  const pick = (c: ComparisonCandidate) => [...c.safetyRatings].filter((r) => r.rating_status !== 'NOT_RATED').sort((x, y) => (y.tested_year ?? 0) - (x.tested_year ?? 0) || x.id.localeCompare(y.id))[0];
  const ra = pick(A);
  const rb = pick(B);
  const describe = (r: SafetyRating) => `${r.stars ?? '?'}★ ${r.authority} ${r.tested_year ?? ''} (${r.protocol_version ?? 'protocol unknown'})${r.rating_status === 'EXPIRED' ? ' — EXPIRED' : ''}`;
  const rv = (r: SafetyRating): ValueView => ({ min: r.stars ?? 'n/a', max: r.stars ?? 'n/a', unit: 'stars', note: describe(r), source_id: r.source_id });
  const base = { metric: 'saf.ncap_stars', label: 'NCAP rating', category: 'Safety' as const, warnings: [] as string[] };
  if (!ra || !rb) return [{ ...base, outcome: 'UNKNOWN', reason: `no safety rating for ${[!ra ? A.label : undefined, !rb ? B.label : undefined].filter(Boolean).join(' and ')}`, ...(ra ? { a: rv(ra) } : {}), ...(rb ? { b: rv(rb) } : {}) }];
  const expired = [ra, rb].filter((r) => r.rating_status === 'EXPIRED').length ? ['rating EXPIRED'] : [];
  if (ra.authority !== rb.authority || ra.protocol_version !== rb.protocol_version || ra.protocol_version === undefined) {
    return [{ ...base, outcome: 'NOT_COMPARABLE', a: rv(ra), b: rv(rb), warnings: expired, reason: `different protocols: ${describe(ra)} vs ${describe(rb)}`, explanation: `NCAP: ${A.label} ${describe(ra)} · ${B.label} ${describe(rb)} — not directly comparable` }];
  }
  const out: MetricComparison[] = [];
  for (const [field, key, label] of [
    ['stars', 'saf.ncap_stars', 'NCAP stars'],
    ['adult_pct', 'saf.ncap_adult_pct', 'NCAP adult occupant'],
    ['child_pct', 'saf.ncap_child_pct', 'NCAP child occupant'],
    ['vru_pct', 'saf.ncap_vru_pct', 'NCAP vulnerable road users'],
    ['assist_pct', 'saf.ncap_assist_pct', 'NCAP safety assist'],
  ] as const) {
    const x = ra[field];
    const y = rb[field];
    const b0 = { ...base, metric: key, label };
    if (x === undefined || y === undefined) {
      out.push({ ...b0, outcome: 'UNKNOWN', reason: `${label} missing` });
      continue;
    }
    const c = compareIntervals(DIFFERENCE_THRESHOLDS[key]!, [x, x], [y, y], true);
    const { outcome, delta } = outcomeOf(c, true);
    const a: ValueView = { min: x, max: x, unit: field === 'stars' ? 'stars' : '%', note: describe(ra) };
    const b: ValueView = { min: y, max: y, unit: field === 'stars' ? 'stars' : '%', note: describe(rb) };
    const explanation = explain(label, A.label, B.label, a, b, field === 'stars' ? '★' : '%', outcome, c.classification);
    out.push({ ...b0, outcome, meaningful: c.classification, a, b, delta, warnings: expired, ...(explanation ? { explanation } : {}) });
  }
  return out;
}
