import type { ComparisonCandidate, ComparisonScenario } from '@vscar/comparison-engine';
import { ALPHA_DECISION_RULES, UTILITY_CURVES, evaluateUtilityRange, type FitComponent, type PriorityLevel, type TechnicalCategory } from '@vscar/methodology';
import { getSpecKeyDefinition, type SpecKey, type SpecValue } from '@vscar/vehicle-schema';
import type { ComponentScore, MetricUtility, Range, SimplePriorities, TechnicalCapabilityResult, TechnicalCategoryScore } from './contracts.ts';

/**
 * Utilidades INTRÍNSECAS de un candidato (curvas de `@vscar/methodology`, nunca min–max entre candidatos):
 * el resultado de A no depende de qué otros coches haya. Edad, kilometraje y precio pedido no intervienen
 * (no están en los hechos técnicos del candidato).
 */
const R = ALPHA_DECISION_RULES;
const PLUGIN = new Set(['BEV', 'PHEV', 'EREV']);
const round1 = (x: number) => Math.round(x * 10) / 10 || 0;
export const roundRange = (r: Range): Range => ({ min: round1(r.min), max: round1(r.max) });
const mean = (rs: readonly Range[]): Range => ({ min: rs.reduce((s, r) => s + r.min, 0) / rs.length, max: rs.reduce((s, r) => s + r.max, 0) / rs.length });

export function weightedMean(parts: readonly { utility: Range; weight: number }[]): Range | undefined {
  const W = parts.reduce((s, p) => s + p.weight, 0);
  if (W <= 0) return undefined;
  return { min: parts.reduce((s, p) => s + p.weight * p.utility.min, 0) / W, max: parts.reduce((s, p) => s + p.weight * p.utility.max, 0) / W };
}

const interval = (v: SpecValue): Range | undefined =>
  typeof v.value === 'number' ? { min: v.value, max: v.value } : v.value_min !== undefined && v.value_max !== undefined ? { min: v.value_min, max: v.value_max } : undefined;

/** ¿Este valor puede recibir utilidad? (ciclo WLTP, base de potencia, tipo de autonomía). Motivo si no. */
function rejection(c: ComparisonCandidate, v: SpecValue): string | undefined {
  const def = getSpecKeyDefinition(v.spec_key);
  const cycle = v.test_cycle === 'UNDECLARED' ? v.test_cycle_inferred : v.test_cycle;
  if (def?.cycle && !R.technical.accepted_cycles.includes(cycle ?? '')) return `${v.spec_key}: ${cycle ?? 'undeclared'} cycle (utility curves are WLTP-based)`;
  if (v.spec_key === 'perf.power_max_kw') {
    const basis = v.measurement_basis?.power_basis;
    const ok = c.powertrainType === 'ICE' ? R.technical.accepted_power_basis.ICE : R.technical.accepted_power_basis.any;
    if (!basis || !(ok as readonly string[]).includes(basis)) return `perf.power_max_kw: power basis ${basis ?? 'unspecified'} (not system power)`;
  }
  if (v.spec_key === 'rng.electric_combined_km') {
    const rt = v.measurement_basis?.range_type;
    if (!rt || !R.technical.accepted_range_types.includes(rt)) return `rng.electric_combined_km: range type ${rt ?? 'unspecified'}`;
  }
  return undefined;
}

/** Utilidad de una métrica para un candidato (primer valor usable aceptado). */
export function metricUtility(c: ComparisonCandidate, metric: string, warnings: string[]): MetricUtility | undefined {
  if (metric === 'saf.ncap_adult_pct') {
    const r = [...c.safetyRatings].filter((x) => x.adult_pct !== undefined).sort((x, y) => (y.tested_year ?? 0) - (x.tested_year ?? 0) || x.id.localeCompare(y.id))[0];
    if (!r) return undefined;
    if (!R.technical.safety_statuses.includes(r.rating_status)) {
      warnings.push(`safety: ${r.authority} ${r.tested_year} rating is ${r.rating_status} — not scored`);
      return undefined;
    }
    const u = evaluateUtilityRange(UTILITY_CURVES['saf.ncap_adult_pct']!, r.adult_pct!, r.adult_pct!);
    return { metric, utility: { min: u.low, max: u.high }, value: { min: r.adult_pct!, max: r.adult_pct! } };
  }
  const curve = UTILITY_CURVES[metric as SpecKey];
  if (!curve) return undefined;
  for (const v of c.facts[metric] ?? []) {
    const why = rejection(c, v);
    if (why) {
      warnings.push(why);
      continue;
    }
    const i = interval(v);
    if (!i) continue;
    const u = evaluateUtilityRange(curve, i.min, i.max);
    return { metric, utility: { min: u.low, max: u.high }, value: i, value_id: v.id };
  }
  return undefined;
}

// ------------------------------------------------------------------------------------------ technical

export function technicalCapability(c: ComparisonCandidate): TechnicalCapabilityResult {
  const warnings: string[] = [];
  const cats = Object.entries(R.technical.categories) as [TechnicalCategory, { weight: number; metrics: readonly string[] }][];
  const scored = cats.map(([category, def]) => {
    const metrics = def.metrics.map((m) => metricUtility(c, m, warnings)).filter((x): x is MetricUtility => !!x);
    return { category, def, metrics, utility: metrics.length ? mean(metrics.map((m) => m.utility)) : undefined };
  });
  const totalWeight = cats.reduce((s, [, d]) => s + d.weight, 0);
  const availableWeight = scored.filter((s) => s.utility).reduce((s, x) => s + x.def.weight, 0);
  const categories: TechnicalCategoryScore[] = scored.map((s) => {
    const eff = s.utility ? s.def.weight / availableWeight : 0;
    return {
      category: s.category,
      status: s.utility ? 'AVAILABLE' : 'NOT_AVAILABLE',
      ...(s.utility ? { utility: roundRange(s.utility), weightedContribution: roundRange({ min: s.utility.min * eff, max: s.utility.max * eff }) } : {}),
      weight: s.def.weight,
      effectiveWeight: Math.round(eff * 1000) / 1000,
      metrics: s.metrics.map((m) => ({ ...m, utility: roundRange(m.utility) })),
      reasons: s.utility ? [] : [`no usable, WLTP-comparable data for ${s.def.metrics.join(', ')} — not scored (never counted as 0)`],
    };
  });
  const score = weightedMean(scored.filter((s) => s.utility).map((s) => ({ utility: s.utility!, weight: s.def.weight })));
  return { candidateId: c.id, ...(score ? { score: roundRange(score) } : {}), categories, coverage: Math.round((availableWeight / totalWeight) * 1000) / 1000, warnings: [...new Set(warnings)] };
}

// ------------------------------------------------------------------------------------------ fit components

export const priorityLevels = (p: SimplePriorities): Record<'COST' | 'SPACE' | 'PERFORMANCE', PriorityLevel> => ({
  COST: p.COST ?? R.default_priority,
  SPACE: p.SPACE ?? R.default_priority,
  PERFORMANCE: p.PERFORMANCE ?? R.default_priority,
});

/** Relevancia de la autonomía según el uso (cotas de `for-you-v1`). */
export function rangeRelevance(s: ComparisonScenario, smallestRangeKm: number): { multiplier: number; note: string } {
  const rr = R.range_relevance;
  if ((s.longTripsPerYear ?? 0) >= rr.many_long_trips) return { multiplier: rr.high_multiplier, note: 'frequent long trips: range matters more' };
  if ((s.longTripsPerYear ?? Infinity) <= rr.few_long_trips && s.homeChargingAvailable && s.dailyDistanceKm !== undefined && s.dailyDistanceKm * rr.daily_margin <= smallestRangeKm) {
    return { multiplier: rr.low_multiplier, note: 'daily use far below the range, home charging, few long trips: range matters less' };
  }
  return { multiplier: 1, note: 'standard relevance' };
}

/**
 * Componentes del Alpha Fit de un candidato (cada variable una sola vez). COST usa el coste de uso ANUAL del
 * `EconomicResult` (no se recalcula) y se omite si depende de consumos no WLTP.
 */
export function fitComponents(c: ComparisonCandidate, scenario: ComparisonScenario, priorities: SimplePriorities): ComponentScore[] {
  const pr = priorityLevels(priorities);
  const mult = (p: 'COST' | 'SPACE' | 'PERFORMANCE') => R.priority_multipliers[pr[p]];
  const scratch: string[] = [];
  const out: ComponentScore[] = [];
  const add = (component: FitComponent, metrics: MetricUtility[], weight: number, note?: string) => {
    // Utilidades exactas (sin redondeo): las comparaciones por pares cerca de un umbral no deben depender de redondeos.
    if (metrics.length) out.push({ component, utility: mean(metrics.map((m) => m.utility)), weight, metrics, ...(note ? { note } : {}) });
  };
  const F = R.fit_components;
  add('SPACE', F.SPACE.metrics.map((m) => metricUtility(c, m, scratch)).filter((x): x is MetricUtility => !!x), F.SPACE.base_weight * mult('SPACE'));
  if (PLUGIN.has(c.powertrainType)) {
    const range = F.RANGE_FIT.metrics.map((m) => metricUtility(c, m, scratch)).filter((x): x is MetricUtility => !!x);
    if (range.length) {
      const rel = rangeRelevance(scenario, range[0]!.value.min);
      add('RANGE_FIT', range, F.RANGE_FIT.base_weight * rel.multiplier, rel.note);
    }
  }
  add('PERFORMANCE', F.PERFORMANCE.metrics.map((m) => metricUtility(c, m, scratch)).filter((x): x is MetricUtility => !!x), F.PERFORMANCE.base_weight * mult('PERFORMANCE'));
  const annual = c.economic?.runningCost.annual_minor;
  const nonWltp = c.economic?.warnings.some((w) => w.code === 'CYCLE_NOT_WLTP' || w.code === 'CYCLE_UNDECLARED');
  if (annual && !(R.cost_requires_wltp && nonWltp)) {
    const u = evaluateUtilityRange(R.running_cost_annual_utility, annual.min / 100, annual.max / 100);
    add('COST', [{ metric: 'economic.running_annual', utility: { min: u.low, max: u.high }, value: { min: annual.min / 100, max: annual.max / 100 } }], F.COST.base_weight * mult('COST'));
  }
  return out;
}

export const practicalScore = (components: readonly ComponentScore[]) => {
  const parts = components.filter((p) => R.practical_components.includes(p.component) && p.utility).map((p) => ({ utility: p.utility!, weight: p.weight }));
  const s = weightedMean(parts);
  return s ? roundRange(s) : undefined;
};

export const alphaFitScore = (components: readonly ComponentScore[]) => {
  const s = weightedMean(components.filter((p) => p.utility).map((p) => ({ utility: p.utility!, weight: p.weight })));
  return s ? roundRange(s) : undefined;
};
