import type { ComparisonCandidate, ComparisonResult, DealBreakerCheck, MetricComparison } from '@vscar/comparison-engine';
import {
  ALPHA_DECISION_RULES,
  DIFFERENCE_THRESHOLDS,
  METHODOLOGY_VERSION,
  compareIntervals,
  methodologyFingerprint,
  minConfidence,
  type ConfidenceLevel,
  type DifferenceClass,
  type FitComponent,
} from '@vscar/methodology';
import {
  DecisionScenario,
  type AlphaBestForYouResult,
  type AlphaDecisionResult,
  type ComponentScore,
  type Contribution,
  type DecisionInput,
  type PracticalFitResult,
  type TechnicalCapabilityResult,
} from './contracts.ts';
import { economicFit } from './economic-fit.ts';
import { metricOutcome, pairAlphaFit } from './pairwise.ts';
import { practicalFit } from './practical.ts';
import { alphaFitScore, fitComponents, priorityLevels, technicalCapability, weightedMean } from './utilities.ts';

export const DECISION_ENGINE_VERSION = '0.1.0';
const R = ALPHA_DECISION_RULES;
const LEVEL: readonly string[] = ['TIE', 'SLIGHT', 'MEANINGFUL', 'CLEAR'];
const rank = (l?: string) => (l ? LEVEL.indexOf(l) : -1);

/** Métricas de la comparación que sustentan cada componente (para explicar contribuciones). */
const COMPONENT_METRICS: Record<FitComponent, readonly string[]> = {
  SPACE: R.fit_components.SPACE.metrics,
  RANGE_FIT: R.fit_components.RANGE_FIT.metrics,
  PERFORMANCE: R.fit_components.PERFORMANCE.metrics,
  COST: R.fit_components.COST.metrics,
};
const TECHNICAL_COMPARISON_CATEGORIES = new Set(['Performance', 'Range', 'Charging', 'Size', 'Safety', 'Warranty', 'Eco', 'Economy']);

function pairFor(pairs: readonly ComparisonResult[], x: string, y: string): ComparisonResult {
  const r = pairs.find((p) => (p.candidateAId === x && p.candidateBId === y) || (p.candidateAId === y && p.candidateBId === x));
  if (!r) throw new Error(`missing ComparisonResult for ${x} vs ${y}: pass the output of compareCandidates for the same candidates`);
  return r;
}
/** Resultado de la métrica visto desde `x` (AHEAD = x mejor). */
function outcomeFor(r: ComparisonResult, x: string, metric: string): MetricComparison | undefined {
  const m = metricOutcome(r, metric);
  if (!m || r.candidateAId === x) return m;
  const flip: Record<string, string> = { AHEAD: 'BEHIND', BEHIND: 'AHEAD' };
  return { ...m, outcome: (flip[m.outcome] ?? m.outcome) as MetricComparison['outcome'], ...(m.delta ? { delta: { min: -m.delta.max || 0, max: -m.delta.min || 0 } } : {}) };
}

/** Resultado "dominante": el que gana a todos; si no, los no dominados (empate / dependiente de rangos). */
function tournamentFree<T extends string>(ids: readonly T[], beats: (x: T, y: T) => boolean) {
  const winner = ids.find((x) => ids.every((y) => y === x || beats(x, y)));
  const undominated = ids.filter((x) => !ids.some((y) => y !== x && beats(y, x)));
  return { winner, undominated: undominated.length ? undominated : [...ids] };
}

function forWhom(s: DecisionScenario): string | undefined {
  const c = s.comparison;
  const parts = [
    c.annualKm !== undefined ? `${c.annualKm.toLocaleString('en-US')} km/year` : undefined,
    c.dailyDistanceKm !== undefined ? `${c.dailyDistanceKm} km/day` : undefined,
    c.homeChargingAvailable !== undefined ? (c.homeChargingAvailable ? 'home charging' : 'no home charging') : undefined,
    c.passengers !== undefined ? `${c.passengers} passengers` : undefined,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

function howMuch(m: MetricComparison): string | undefined {
  if (!m.delta) return undefined;
  const lo = Math.min(Math.abs(m.delta.min), Math.abs(m.delta.max));
  const hi = Math.max(Math.abs(m.delta.min), Math.abs(m.delta.max));
  const unit = m.a?.unit === 'EUR_MINOR' ? '€' : m.a?.unit ?? '';
  const f = (x: number) => (unit === '€' ? (x / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : x.toLocaleString('en-US', { maximumFractionDigits: 2 }));
  return `${lo === hi ? f(lo) : `${f(lo)}–${f(hi)}`} ${unit}`.trim();
}

/**
 * Alpha Decision Engine v0.1. Orden: Deal Breakers → Technical Capability → Economic Fit @ horizon →
 * Practical Fit → prioridades simples → Alpha Best For You. Consume `ComparisonResult` y `EconomicResult`.
 */
export function decide(input: DecisionInput): AlphaDecisionResult {
  const scenario = DecisionScenario.parse(input.scenario);
  const candidates = [...new Map(input.candidates.map((c) => [c.id, c])).values()].sort((a, b) => a.id.localeCompare(b.id));
  if (candidates.length < 1) throw new Error('decide needs at least one candidate');
  for (const c of candidates) if (!input.comparison.dealBreakers[c.id]) throw new Error(`missing deal breaker result for ${c.id}`);
  const pairs = candidates.flatMap((x, i) => candidates.slice(i + 1).map((y) => pairFor(input.comparison.pairs, x.id, y.id)));
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const label = (id: string) => byId.get(id)!.label;
  const warnings: string[] = [];

  // 1–2. Deal breakers (Step 6a) y Technical Capability (intrínseca)
  const technical = candidates.map(technicalCapability);
  const technicalLeader = leaderByTechnical(technical, pairs, label);

  // 3. Economic Fit @ horizon
  const econ = economicFit(candidates, pairs, scenario.horizonYears, scenario.comparison.annualKm);

  // 4–5. Practical Fit + prioridades simples (componentes del Alpha Fit)
  const components = new Map(candidates.map((c) => [c.id, fitComponents(c, scenario.comparison, scenario.priorities)]));
  const practical = candidates.map((c) => practicalFit(c, input.comparison.dealBreakers[c.id]!, scenario, components.get(c.id)!));
  const pfOf = new Map(practical.map((p) => [p.candidateId, p]));

  // 6. Alpha Best For You
  const alpha = bestForYou(candidates, pfOf, components, pairs, scenario, label);
  const topContributions = alpha.candidateId ? contributions(alpha.candidateId, candidates, pfOf, components, pairs, scenario, label) : [];

  // Confianza de datos: combina señales existentes (comparación, economía, cobertura), sin escala nueva.
  const reasons: string[] = [];
  const levels: ConfidenceLevel[] = ['HIGH'];
  for (const p of pairs) {
    levels.push(p.dataConfidence.level);
    for (const r of p.dataConfidence.reasons) reasons.push(`${label(p.candidateAId)} vs ${label(p.candidateBId)}: ${r}`);
  }
  if (econ.status === 'UNKNOWN' || econ.status === 'NOT_COMPARABLE') reasons.push(`economic fit ${econ.status.toLowerCase()}`);
  for (const t of technical) if (t.coverage < 0.5) {
    levels.push('MEDIUM');
    reasons.push(`${label(t.candidateId)}: technical data covers ${Math.round(t.coverage * 100)} % of editorial weight`);
  }
  for (const p of practical) if (p.unknowns.length) {
    levels.push('MEDIUM');
    reasons.push(`${label(p.candidateId)}: ${p.unknowns.length} requirement(s) without verifiable data`);
  }
  for (const t of technical) warnings.push(...t.warnings.map((w) => `${label(t.candidateId)}: ${w}`));
  warnings.push(...econ.warnings);

  const priorities = priorityLevels(scenario.priorities);
  const scenarioHash = methodologyFingerprint({
    engine: DECISION_ENGINE_VERSION,
    methodology: METHODOLOGY_VERSION,
    rules: R.version,
    scenario,
    candidates: candidates.map((c) => ({ id: c.id, economic: c.economic?.scenarioHash ?? null })),
    comparisons: pairs.map((p) => p.scenarioHash).sort(),
  });
  return {
    candidates: candidates.map((c) => c.id),
    technicalCapability: technical,
    technicalLeader,
    economicFit: econ,
    practicalFit: practical,
    alphaBestForYou: alpha,
    topContributions,
    dataConfidence: { level: minConfidence(...levels), reasons: [...new Set(reasons)] },
    warnings: [...new Set(warnings)],
    priorities,
    methodologyVersion: METHODOLOGY_VERSION,
    decisionRulesVersion: R.version,
    engineVersion: DECISION_ENGINE_VERSION,
    scenarioHash,
  };
}

// ------------------------------------------------------------------------------------------ technical leader

function leaderByTechnical(technical: readonly TechnicalCapabilityResult[], pairs: readonly ComparisonResult[], label: (id: string) => string): AlphaDecisionResult['technicalLeader'] {
  const scored = technical.filter((t) => t.score).map((t) => t.candidateId);
  if (scored.length < 2) return { status: 'INSUFFICIENT_DATA', reasons: ['Technical Capability needs at least two vehicles with technical data'] };
  // Par sobre categorías comunes (pesos renormalizados): no se comparan scores con coberturas distintas.
  const pairCmp = (x: string, y: string) => {
    const tx = technical.find((t) => t.candidateId === x)!;
    const ty = technical.find((t) => t.candidateId === y)!;
    const common = tx.categories.filter((c) => c.utility && ty.categories.find((d) => d.category === c.category)?.utility);
    const sx = weightedMean(common.map((c) => ({ utility: c.utility!, weight: c.weight })));
    const sy = weightedMean(common.map((c) => ({ utility: ty.categories.find((d) => d.category === c.category)!.utility!, weight: c.weight })));
    return sx && sy ? compareIntervals(DIFFERENCE_THRESHOLDS.technical_capability!, [sx.min, sx.max], [sy.min, sy.max], true) : undefined;
  };
  const beats = (x: string, y: string) => pairCmp(x, y)?.better === 'a';
  const { winner, undominated } = tournamentFree(scored, beats);
  if (!winner) {
    const rangeDep = undominated.some((x, i) => undominated.slice(i + 1).some((y) => pairCmp(x, y)?.classification === 'RANGE_DEPENDENT'));
    return { status: rangeDep ? 'RANGE_DEPENDENT' : 'PRACTICAL_TIE', tiedIds: [...undominated].sort(), reasons: [rangeDep ? 'technical capability depends on configuration' : 'technical capability is practically equal'] };
  }
  const reasons: string[] = [];
  for (const y of scored.filter((y) => y !== winner)) {
    const r = pairs.find((p) => [p.candidateAId, p.candidateBId].includes(winner) && [p.candidateAId, p.candidateBId].includes(y))!;
    const ahead = [...r.technicalComparisons, ...r.economicComparison.metrics]
      .filter((m) => (TECHNICAL_COMPARISON_CATEGORIES.has(m.category) && m.category !== 'Economy') || m.metric.startsWith('nrg.'))
      .map((m) => outcomeFor(r, winner, m.metric)!)
      .filter((m) => m.outcome === 'AHEAD' && rank(m.meaningful) >= rank('MEANINGFUL'))
      .sort((a, b) => rank(b.meaningful) - rank(a.meaningful) || a.metric.localeCompare(b.metric))
      .slice(0, 3);
    if (ahead.length) reasons.push(`Technical Capability: ${label(winner)} ahead of ${label(y)} mainly because of: ${ahead.map((m) => `${m.label} (${howMuch(m) ?? m.meaningful})`).join(', ')}`);
  }
  return { status: 'LEADER', candidateId: winner, reasons };
}

// ------------------------------------------------------------------------------------------ best for you

function bestForYou(
  candidates: readonly ComparisonCandidate[],
  pf: Map<string, PracticalFitResult>,
  components: Map<string, ComponentScore[]>,
  pairs: readonly ComparisonResult[],
  scenario: DecisionScenario,
  label: (id: string) => string,
): AlphaBestForYouResult {
  const eligible = candidates.filter((c) => pf.get(c.id)!.status !== 'FAIL').map((c) => c.id);
  const alphaFit = eligible.map((id) => ({ candidateId: id, ...(alphaFitScore(components.get(id)!) ? { score: alphaFitScore(components.get(id)!)! } : {}), components: components.get(id)! }));

  if (eligible.length === 0) {
    const shortfall = (c: DealBreakerCheck) => {
      const o = c.observedValue;
      if (!o) return 1;
      return Math.abs((c.criterion.startsWith('max') ? o.min - c.requiredValue : c.requiredValue - o.max) / c.requiredValue);
    };
    const ranked = candidates
      .map((c) => ({ id: c.id, failed: pf.get(c.id)!.failed }))
      .sort((a, b) => a.failed.length - b.failed.length || a.failed.reduce((s, f) => s + shortfall(f), 0) - b.failed.reduce((s, f) => s + shortfall(f), 0) || a.id.localeCompare(b.id));
    const closest = ranked[0]!;
    return {
      status: 'NO_FULL_MATCH',
      alphaFit: [],
      closestCandidate: { candidateId: closest.id, failedChecks: closest.failed, note: 'informational only: it fails fewer or less severe requirements — not a recommendation' },
      explanation: `None fully meets your requirements. ${candidates.map((c) => `${label(c.id)}: ${pf.get(c.id)!.failed.map((f) => f.reason).join('; ')}`).join(' · ')}`,
    };
  }
  const verification = (id: string) => (pf.get(id)!.status === 'UNCONFIRMED' ? { requiresVerification: pf.get(id)!.mandatoryUnknowns } : {});
  if (eligible.length === 1) {
    const id = eligible[0]!;
    const others = candidates.filter((c) => c.id !== id);
    return {
      status: 'BEST_FOR_YOU',
      candidateId: id,
      alphaFit,
      ...verification(id),
      explanation: others.length ? `${label(id)} is the only vehicle that meets your mandatory requirements.` : `${label(id)} is the only vehicle evaluated.`,
    };
  }
  const cmpOf = (x: string, y: string) => {
    const r = pairFor(pairs, x, y);
    return pairAlphaFit(components.get(x)!, components.get(y)!, r, scenario.comparison)?.cmp;
  };
  const cmps = new Map<string, ReturnType<typeof cmpOf>>();
  const key = (x: string, y: string) => `${x}|${y}`;
  for (const x of eligible) for (const y of eligible) if (x !== y) cmps.set(key(x, y), cmpOf(x, y));
  if ([...cmps.values()].every((c) => !c)) return { status: 'INSUFFICIENT_DATA', alphaFit, explanation: 'Not enough comparable data on space, range, performance or running cost to separate the vehicles.' };
  const beats = (x: string, y: string) => cmps.get(key(x, y))?.better === 'a';
  const { winner, undominated } = tournamentFree(eligible, beats);
  if (winner) return { status: 'BEST_FOR_YOU', candidateId: winner, alphaFit, ...verification(winner), explanation: `Best for your needs (Alpha): ${label(winner)}.` };
  const tied = [...undominated].sort();
  const rangeDep = tied.some((x) => tied.some((y) => x !== y && cmps.get(key(x, y))?.classification === 'RANGE_DEPENDENT'));
  return {
    status: rangeDep ? 'RANGE_DEPENDENT' : 'PRACTICAL_TIE',
    tiedIds: tied,
    alphaFit,
    explanation: rangeDep
      ? `${tied.map(label).join(' and ')}: which one fits your needs better depends on configuration ranges.`
      : `${tied.map(label).join(' and ')} are a practical tie for your needs — no winner is forced.`,
  };
}

// ------------------------------------------------------------------------------------------ contributions

function contributions(
  winner: string,
  candidates: readonly ComparisonCandidate[],
  pf: Map<string, PracticalFitResult>,
  components: Map<string, ComponentScore[]>,
  pairs: readonly ComparisonResult[],
  scenario: DecisionScenario,
  label: (id: string) => string,
): Contribution[] {
  const who = forWhom(scenario);
  const out: Contribution[] = [];
  // Otros que no cumplen requisitos obligatorios: motivo decisivo.
  for (const c of candidates.filter((c) => c.id !== winner && pf.get(c.id)!.status === 'FAIL')) {
    for (const f of pf.get(c.id)!.failed) {
      out.push({ component: 'DEAL_BREAKER', what: `${label(c.id)} does not meet a mandatory requirement`, why: 'mandatory requirement', ...(who ? { forWhom: who } : {}), text: `${label(c.id)}: ${f.reason}` });
    }
  }
  // Ventajas sobre el segundo mejor elegible (mayor Alpha Fit intrínseco), por componente.
  const others = candidates.filter((c) => c.id !== winner && pf.get(c.id)!.status !== 'FAIL').map((c) => c.id);
  const score = (id: string) => alphaFitScore(components.get(id)!)?.min ?? -1;
  const runnerUp = [...others].sort((a, b) => score(b) - score(a) || a.localeCompare(b))[0];
  const factors: (Contribution & { weight: number; minor: boolean })[] = [];
  if (runnerUp) {
    const r = pairFor(pairs, winner, runnerUp);
    const pr = priorityLevels(scenario.priorities);
    for (const comp of components.get(winner)!) {
      for (const metric of COMPONENT_METRICS[comp.component]) {
        const m = outcomeFor(r, winner, metric);
        if (!m || m.outcome !== 'AHEAD') continue;
        const level = (m.meaningfulForYou?.level ?? m.meaningful) as DifferenceClass | 'RANGE_DEPENDENT' | undefined;
        const why =
          comp.component === 'COST' ? `priority COST ${pr.COST}` : comp.component === 'SPACE' ? `priority SPACE ${pr.SPACE}` : comp.component === 'PERFORMANCE' ? `priority PERFORMANCE ${pr.PERFORMANCE}` : comp.note ?? 'range need';
        const hm = howMuch(m);
        // Económicas: frase propia (cuánto al año); resto: la frase determinista del Step 6a + por qué importa.
        const text = m.metric.startsWith('economic.')
          ? `${m.label}: ${label(winner)} costs about ${hm} less per year than ${label(runnerUp)}${who ? ` (${who})` : ''}`
          : `${m.explanation ?? `${m.label}: ${label(winner)} ahead of ${label(runnerUp)} by ${hm}`} — ${why}`;
        factors.push({ component: comp.component, metric, what: m.label, ...(hm ? { howMuch: hm } : {}), why: [why, ...(m.meaningfulForYou?.rules ?? [])].join('; '), ...(who ? { forWhom: who } : {}), ...(level ? { level } : {}), text, weight: comp.weight, minor: rank(level) < rank(R.top_contributions.min_level) });
      }
    }
  }
  const major = factors.filter((f) => !f.minor).sort((a, b) => rank(b.level) - rank(a.level) || b.weight - a.weight || (a.metric ?? '').localeCompare(b.metric ?? ''));
  const minor = factors.filter((f) => f.minor).sort((a, b) => rank(b.level) - rank(a.level) || b.weight - a.weight || (a.metric ?? '').localeCompare(b.metric ?? ''));
  out.push(...(major.length ? major : minor).map(({ weight: _w, minor: _m, ...c }) => c));
  for (const comp of pf.get(winner)!.compromises) out.push({ component: 'COMPROMISE', what: 'compromise', why: 'preferred target not met', text: `${label(winner)}: ${comp.reason}` });
  return out.slice(0, R.top_contributions.max);
}
