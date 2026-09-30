import { COMPARISON_RULES, METHODOLOGY_VERSION, methodologyFingerprint, minConfidence, type ConfidenceLevel, type DifferenceClass } from '@vscar/methodology';
import type { CategoryStatus } from '@vscar/quality';
import type { AlphaCategory } from '@vscar/vehicle-schema';
import {
  ComparisonScenario,
  type CategoryAdvantage,
  type CategorySummary,
  type ComparisonCandidate,
  type ComparisonCategory,
  type ComparisonResult,
  type ComparisonScenarioIn,
  type EconomicComparison,
  type MetricComparison,
} from './contracts.ts';
import { evaluateDealBreakers } from './deal-breakers.ts';
import { compareEconomics } from './economic.ts';
import { TECHNICAL_METRICS, compareMetric, compareSafety, maxClass, practicalProfile } from './technical.ts';

const CATEGORIES: readonly ComparisonCategory[] = ['Performance', 'Range', 'Charging', 'Size', 'Practicality', 'Safety', 'Warranty', 'Eco', 'Technology', 'Economy'];
const ELIGIBILITY_CATEGORIES = new Set<string>(['Economy', 'Range', 'Charging', 'Performance', 'Size', 'Practicality', 'Eco', 'Warranty']);
const STATUS_ORDER: readonly CategoryStatus[] = ['NOT_AVAILABLE', 'PARTIAL', 'AVAILABLE'];
const worst = (a: CategoryStatus, b: CategoryStatus) => (STATUS_ORDER.indexOf(a) <= STATUS_ORDER.indexOf(b) ? a : b);

function summarize(category: ComparisonCategory, metrics: readonly MetricComparison[], A: ComparisonCandidate, B: ComparisonCandidate): CategorySummary {
  const unknowns = metrics.filter((m) => m.outcome === 'UNKNOWN' || m.outcome === 'NOT_COMPARABLE').map((m) => `${m.label}: ${m.reason ?? m.outcome}`);
  let status: CategoryStatus;
  if (ELIGIBILITY_CATEGORIES.has(category)) {
    const ea = A.eligibility[category as AlphaCategory];
    const eb = B.eligibility[category as AlphaCategory];
    status = worst(ea?.status ?? 'NOT_AVAILABLE', eb?.status ?? 'NOT_AVAILABLE');
    for (const [c, e] of [[A, ea], [B, eb]] as const) {
      if (e?.status === 'NOT_AVAILABLE') unknowns.push(`${c.label}: ${category} not available (${e.missing.join('; ') || 'no data'})`);
      else if (e?.status === 'PARTIAL') unknowns.push(`${c.label}: ${category} partial (${e.partial_reasons.join('; ')})`);
    }
  } else {
    status = metrics.some((m) => m.outcome !== 'UNKNOWN') ? 'AVAILABLE' : 'NOT_AVAILABLE';
  }
  // Categoría no disponible → no se afirma ventaja (nunca un empate inventado).
  if (status === 'NOT_AVAILABLE') return { category, status, advantage: 'UNKNOWN', reasons: [], unknowns };

  const ahead = metrics.filter((m) => m.outcome === 'AHEAD');
  const behind = metrics.filter((m) => m.outcome === 'BEHIND');
  const ties = metrics.filter((m) => m.outcome === 'PRACTICAL_TIE');
  const rangeDep = metrics.filter((m) => m.outcome === 'RANGE_DEPENDENT');
  const different = metrics.filter((m) => m.outcome === 'DIFFERENT');
  let advantage: CategoryAdvantage;
  if (ahead.length && behind.length) advantage = 'MIXED';
  else if (ahead.length) advantage = 'A';
  else if (behind.length) advantage = 'B';
  else if (rangeDep.length) advantage = 'RANGE_DEPENDENT';
  else if (ties.length) advantage = 'PRACTICAL_TIE';
  else if (different.length) advantage = 'DESCRIPTIVE_ONLY';
  else advantage = metrics.some((m) => m.outcome === 'NOT_COMPARABLE') ? 'NOT_COMPARABLE' : 'UNKNOWN';

  const directional = [...ahead, ...behind];
  const levels = (xs: readonly (DifferenceClass | 'RANGE_DEPENDENT' | undefined)[]) => xs.filter((x): x is DifferenceClass => !!x && x !== 'RANGE_DEPENDENT');
  const meaningfulLevel = maxClass(levels(directional.map((m) => m.meaningful)));
  const forYou = maxClass(levels(directional.map((m) => m.meaningfulForYou?.level ?? m.meaningful)));
  const reasons = [...directional, ...rangeDep, ...(advantage === 'PRACTICAL_TIE' ? ties : []), ...(advantage === 'DESCRIPTIVE_ONLY' ? different : [])]
    .map((m) => m.explanation)
    .filter((x): x is string => !!x);
  if (ahead.length && rangeDep.length) reasons.push('some metrics depend on configuration');
  return { category, status, advantage, ...(meaningfulLevel ? { meaningfulLevel } : {}), ...(forYou ? { meaningfulForYouLevel: forYou } : {}), reasons, unknowns };
}

function dataConfidence(A: ComparisonCandidate, B: ComparisonCandidate, summaries: readonly CategorySummary[], metrics: readonly MetricComparison[], econ: EconomicComparison) {
  const R = COMPARISON_RULES.data_confidence;
  const reasons: string[] = [];
  const levels: ConfidenceLevel[] = ['HIGH'];
  const eligible = summaries.filter((s) => ELIGIBILITY_CATEGORIES.has(s.category));
  const notAvailable = eligible.filter((s) => s.status === 'NOT_AVAILABLE').length;
  if (eligible.length && notAvailable / eligible.length > R.low_if_not_available_share_above) {
    levels.push('LOW');
    reasons.push(`${notAvailable}/${eligible.length} categories not available for at least one vehicle`);
  }
  if (eligible.some((s) => s.status === 'PARTIAL')) {
    levels.push(R.partial_caps_at);
    reasons.push(`partial categories: ${eligible.filter((s) => s.status === 'PARTIAL').map((s) => s.category).join(', ')}`);
  }
  const usedIds = new Set(metrics.flatMap((m) => [m.a?.value_id, m.b?.value_id]).filter(Boolean));
  const coarse = [A, B].flatMap((c) => Object.values(c.facts).flat()).filter((v) => usedIds.has(v.id) && R.coarse_mapping.includes(v.mapping_confidence));
  if (coarse.length) {
    levels.push(R.coarse_mapping_caps_at);
    reasons.push(`${coarse.length} compared value(s) mapped only at powertrain/generation level or inferred`);
  }
  if ([A, B].some((c) => c.exclusions.some((e) => /conflict/i.test(e)))) {
    levels.push(R.conflict_caps_at);
    reasons.push('values in unresolved conflict were excluded');
  }
  const determinable = metrics.filter((m) => !['UNKNOWN', 'NOT_COMPARABLE'].includes(m.outcome));
  const rangeDep = determinable.filter((m) => m.outcome === 'RANGE_DEPENDENT').length;
  if (determinable.length && rangeDep / determinable.length > R.range_dependent_share_caps_medium) {
    levels.push('MEDIUM');
    reasons.push(`${rangeDep}/${determinable.length} comparisons depend on configuration ranges`);
  }
  if (econ.economicConfidence?.a && econ.economicConfidence.b) {
    const e = minConfidence(econ.economicConfidence.a as ConfidenceLevel, econ.economicConfidence.b as ConfidenceLevel);
    levels.push(e);
    if (e !== 'HIGH') reasons.push(`economic confidence ${e}`);
  } else if (econ.status !== 'COMPARED') reasons.push(`economic comparison ${econ.status.toLowerCase()}`);
  return { level: minConfidence(...levels), reasons };
}

/** Huella del par (independiente del orden A/B): candidatos, escenario, resultados económicos y metodología. */
function pairHash(A: ComparisonCandidate, B: ComparisonCandidate, scenario: ComparisonScenario): string {
  const digest = (c: ComparisonCandidate) => ({
    id: c.id,
    powertrain: c.powertrainType,
    seats: c.seats,
    facts: Object.fromEntries(Object.entries(c.facts).map(([k, vs]) => [k, vs.map((v) => ({ id: v.id, value: v.value, min: v.value_min, max: v.value_max, cycle: v.test_cycle, basis: v.measurement_basis }))])),
    safety: c.safetyRatings.map((r) => r.id),
    eligibility: Object.fromEntries(Object.entries(c.eligibility).map(([k, e]) => [k, e?.status])),
    economic: c.economic?.scenarioHash,
  });
  const [x, y] = [A, B].sort((p, q) => p.id.localeCompare(q.id));
  return methodologyFingerprint({ methodology: METHODOLOGY_VERSION, rules: COMPARISON_RULES.version, scenario, candidates: [digest(x!), digest(y!)] });
}

/**
 * Compara A con B para un escenario práctico. Sin winner, sin score global, sin preferencias (Step 6b).
 * Resultados desde el punto de vista de A; `compareVehicles(B, A)` es exactamente el inverso.
 */
export function compareVehicles(A: ComparisonCandidate, B: ComparisonCandidate, scenarioIn: ComparisonScenarioIn = {}): ComparisonResult {
  if (A.id === B.id) throw new Error('cannot compare a candidate with itself');
  const scenario = ComparisonScenario.parse(scenarioIn);
  const profile = practicalProfile(scenario);
  const technicalComparisons = [...TECHNICAL_METRICS.map((d) => compareMetric(d, A, B, profile)), ...compareSafety(A, B)];
  const economicComparison = compareEconomics(A, B);
  const all = [...technicalComparisons, ...economicComparison.metrics];
  const categorySummaries = CATEGORIES.map((c) => summarize(c, all.filter((m) => m.category === c), A, B));
  const warnings = [
    ...new Set([
      ...[A, B].flatMap((c) => c.exclusions.map((e) => `${c.label}: ${e}`)),
      ...all.flatMap((m) => m.warnings.map((w) => `${m.label}: ${w}`)),
      ...(economicComparison.reason ? [`economics: ${economicComparison.reason}`] : []),
    ]),
  ];
  return {
    candidateAId: A.id,
    candidateBId: B.id,
    dealBreakersA: evaluateDealBreakers(A, scenario),
    dealBreakersB: evaluateDealBreakers(B, scenario),
    technicalComparisons,
    economicComparison,
    categorySummaries,
    dataConfidence: dataConfidence(A, B, categorySummaries, all, economicComparison),
    warnings,
    methodologyVersion: METHODOLOGY_VERSION,
    comparisonRulesVersion: COMPARISON_RULES.version,
    scenarioHash: pairHash(A, B, scenario),
  };
}

/**
 * Todas las parejas de un conjunto (A vs B, A vs C, B vs C), ordenadas por id: independiente del orden de
 * entrada. Cada par solo depende de sus dos candidatos (añadir C no cambia A vs B). No hay ranking global.
 */
export function compareCandidates(candidates: readonly ComparisonCandidate[], scenario: ComparisonScenarioIn = {}) {
  const unique = [...new Map(candidates.map((c) => [c.id, c])).values()].sort((a, b) => a.id.localeCompare(b.id));
  const parsed = ComparisonScenario.parse(scenario);
  const pairs: ComparisonResult[] = [];
  for (let i = 0; i < unique.length; i++) for (let j = i + 1; j < unique.length; j++) pairs.push(compareVehicles(unique[i]!, unique[j]!, parsed));
  return { dealBreakers: Object.fromEntries(unique.map((c) => [c.id, evaluateDealBreakers(c, parsed)])), pairs };
}
