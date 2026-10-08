import type { ComparisonCategory, ComparisonOutcome, MetricComparison } from '@vscar/comparison-engine';
import type { AlphaRecommendationResult, Message, WhyNotItem } from '@vscar/decision-engine';
import type { EconomicResult } from '@vscar/economics-engine';
import type { CandidateSide } from '@vscar/ui/tokens';
import type { ComparisonDefinition } from './comparisons.ts';
import type { DecisionInput } from '@vscar/decision-engine';
import { energyContextFor, VEHICLE_IDS } from './decision.ts';

/**
 * Vista de la decisión, NEUTRA respecto al idioma y serializable. Solo REORGANIZA lo que devuelven los engines
 * (orientación por lado A/B, capítulos, categorías); no decide, no puntúa y no redacta. Los textos se
 * resuelven después por `messageKey` (Step 6c) o por campos estructurados (metric, level, component).
 */
export type Range = { min: number; max: number };
export type Level = 'TIE' | 'SLIGHT' | 'MEANINGFUL' | 'CLEAR' | 'RANGE_DEPENDENT';
export type ResultStatus = AlphaRecommendationResult['alphaBestForYou']['status'];

export interface CandidateView {
  side: CandidateSide;
  id: string;
  name: string;
  year: number;
  powertrain: string;
  body: string;
}

/** Métrica orientada: `a` = candidato A de la página (BYD), `b` = candidato B (Model 3). */
export interface MetricView {
  metric: string;
  category: ComparisonCategory;
  /** Desde el punto de vista de A. */
  outcome: ComparisonOutcome;
  a?: { min: number | string | boolean; max: number | string | boolean; unit: string | null; cycle?: string };
  b?: { min: number | string | boolean; max: number | string | boolean; unit: string | null; cycle?: string };
  /** a − b. */
  delta?: Range;
  meaningful?: Level;
  forYou?: Level;
  forYouRules: string[];
  /** Motivo estructurado del engine (texto inglés de respaldo). */
  reason?: string;
  /** Lado que va por delante (si la métrica tiene dirección). */
  leader?: CandidateSide;
}

export interface ContributionView {
  component: string;
  metric?: string;
  level?: Level;
  /** Lado favorecido. */
  side?: CandidateSide;
  /** Respaldo en inglés del engine. */
  text: string;
}

export interface WhyNotView {
  side: CandidateSide;
  kind: 'WHY_NOT' | 'TRADEOFFS' | 'VERIFY_BEFORE_DECIDING';
  onlyMinor: boolean;
  items: (Message & { type: WhyNotItem['type']; severity: WhyNotItem['severity']; metric?: string })[];
}

export interface EconomicsView {
  status: AlphaRecommendationResult['economicFit']['status'];
  horizonYears: number;
  leader?: CandidateSide;
  perSide: Record<CandidateSide, { annual?: Range; per100km?: Range; horizon?: Range; status: string }>;
  /** Diferencia anual (positivo: A cuesta más). */
  annualDelta?: Range;
  meaningful?: string;
}

export interface EnergyReferenceView {
  electricity?: { value: number; unit: string; date?: string; basis?: string; taxes?: string; sourceId?: string; origin: string };
  /** Precio de referencia del mercado; `usedByVehicles` = algún candidato lo usa en su coste. */
  fuel?: { product: string; value: number; unit: string; date?: string; sourceId?: string; usedByVehicles: boolean };
  homeChargingShare: number;
}

export type ChapterKind = 'vs' | 'result' | 'reason' | 'economics' | 'tradeoffs' | 'change' | 'confidence' | 'details';

export interface ChapterView {
  id: string;
  kind: ChapterKind;
  /** Para capítulos de motivo: la métrica protagonista. */
  metric?: string;
}

export interface DecisionView {
  slug: string;
  status: ResultStatus;
  selected?: CandidateSide;
  tied: CandidateSide[];
  closest?: CandidateSide;
  candidates: [CandidateView, CandidateView];
  reasons: ContributionView[];
  /** Métricas protagonistas de capítulo (con su patrón raw → meaningful → for you). */
  keyMetrics: MetricView[];
  chapters: ChapterView[];
  metricsByCategory: { category: DetailCategory; metrics: MetricView[] }[];
  economics: EconomicsView;
  energy: EnergyReferenceView;
  technical: Record<CandidateSide, { score?: Range; coverage: number }>;
  practical: Record<CandidateSide, { status: string; score?: Range }>;
  whyNot: WhyNotView[];
  tradeoffs: WhyNotView['items'];
  verify: Message[];
  notices: Message[];
  confidence: { level: 'HIGH' | 'MEDIUM' | 'LOW'; reasons: Message[]; robustnessComputed: boolean };
  robustness?: { status: string; level: string; messages: Message[] };
  versions: { engine: string; methodology: string; decisionRules: string; scenarioHash: string };
  provenance: { sourceIds: string[] };
}

/** Categorías de la capa de detalles (Step 7a §76); Size + Practicality → Space. */
export const DETAIL_CATEGORIES = ['Economy', 'Range', 'Performance', 'Space', 'Charging', 'Safety', 'Warranty', 'Technology', 'Eco'] as const;
export type DetailCategory = (typeof DETAIL_CATEGORIES)[number];
const toDetail = (c: ComparisonCategory): DetailCategory => (c === 'Size' || c === 'Practicality' ? 'Space' : c);

const LEVEL_RANK: Record<string, number> = { TIE: 0, SLIGHT: 1, MEANINGFUL: 2, CLEAR: 3 };
const FLIP: Partial<Record<ComparisonOutcome, ComparisonOutcome>> = { AHEAD: 'BEHIND', BEHIND: 'AHEAD' };

function sideOf(id: string | undefined, idA: string): CandidateSide | undefined {
  return id === undefined ? undefined : id === idA ? 'a' : 'b';
}

/** Reorienta una métrica del ComparisonResult (que puede tener A/B al revés) a los lados de la página. */
export function orientMetric(m: MetricComparison, pairAId: string, pageAId: string): MetricView {
  const swap = pairAId !== pageAId;
  const view = (v: MetricComparison['a']) => (v ? { min: v.min, max: v.max, unit: v.unit, ...(v.test_cycle ? { cycle: v.test_cycle } : {}) } : undefined);
  const a = view(swap ? m.b : m.a);
  const b = view(swap ? m.a : m.b);
  const outcome = swap ? (FLIP[m.outcome] ?? m.outcome) : m.outcome;
  const delta = m.delta ? (swap ? { min: -m.delta.max || 0, max: -m.delta.min || 0 } : { ...m.delta }) : undefined;
  return {
    metric: m.metric,
    category: m.category,
    outcome,
    ...(a ? { a } : {}),
    ...(b ? { b } : {}),
    ...(delta ? { delta } : {}),
    ...(m.meaningful ? { meaningful: m.meaningful } : {}),
    ...(m.meaningfulForYou ? { forYou: m.meaningfulForYou.level } : {}),
    forYouRules: m.meaningfulForYou?.rules ?? [],
    ...(m.reason ? { reason: m.reason } : {}),
    ...(outcome === 'AHEAD' ? { leader: 'a' as const } : outcome === 'BEHIND' ? { leader: 'b' as const } : {}),
  };
}

const hasValue = (m: MetricView) => m.a !== undefined || m.b !== undefined;

export function buildDecisionView(def: ComparisonDefinition, input: DecisionInput, result: AlphaRecommendationResult, robustnessComputed: boolean): DecisionView {
  const [va, vb] = def.vehicles;
  const idA = VEHICLE_IDS[va.key];
  const idB = VEHICLE_IDS[vb.key];
  const side = (id?: string) => sideOf(id, idA);
  const candidates: [CandidateView, CandidateView] = [
    { side: 'a', id: idA, name: va.name, year: va.year, powertrain: va.powertrain, body: va.body },
    { side: 'b', id: idB, name: vb.name, year: vb.year, powertrain: vb.powertrain, body: vb.body },
  ];

  const pair = input.comparison.pairs.find((p) => [p.candidateAId, p.candidateBId].includes(idA) && [p.candidateAId, p.candidateBId].includes(idB))!;
  const tech = pair.technicalComparisons.map((m) => orientMetric(m, pair.candidateAId, idA));
  const econMetrics = pair.economicComparison.metrics.map((m) => orientMetric(m, pair.candidateAId, idA));
  const all = [...tech, ...econMetrics];
  const byMetric = new Map(all.map((m) => [m.metric, m]));

  const b4y = result.alphaBestForYou;
  const status = b4y.status;
  const selected = status === 'BEST_FOR_YOU' ? side(b4y.candidateId) : undefined;

  const reasons: ContributionView[] = result.topContributions.slice(0, 3).map((c) => {
    const m = c.metric ? byMetric.get(c.metric) : undefined;
    return { component: c.component, ...(c.metric ? { metric: c.metric } : {}), ...(c.level ? { level: c.level as Level } : {}), ...(m?.leader ? { side: m.leader } : {}), text: c.text };
  });

  // Métricas protagonistas: las de las contribuciones; en un empate, las diferencias generales ≥ MEANINGFUL que
  // para TU uso pesan menos (el patrón raw → meaningful → for you explica por qué no deciden). Máx. 2.
  const key: MetricView[] = [];
  for (const r of reasons) {
    const m = r.metric ? byMetric.get(r.metric) : undefined;
    if (m && !key.includes(m) && m.a && m.b) key.push(m);
  }
  if (status === 'PRACTICAL_TIE' || status === 'RANGE_DEPENDENT') {
    for (const m of tech) {
      if (key.length >= 2) break;
      if (!m.a || !m.b || !m.meaningful || !m.forYou) continue;
      if ((LEVEL_RANK[m.meaningful] ?? 0) >= LEVEL_RANK.MEANINGFUL! && (LEVEL_RANK[m.forYou] ?? 0) < (LEVEL_RANK[m.meaningful] ?? 0)) key.push(m);
    }
  }

  // Economía: candidato por candidato desde el EconomicResult (rangos conservados, nunca punto medio).
  const econ = result.economicFit;
  const econOf = (id: string) => input.candidates.find((c) => c.id === id)?.economic as EconomicResult | undefined;
  const perSide = Object.fromEntries(
    candidates.map((c) => {
      const e = econOf(c.id);
      const h = e?.runningCost.horizons.find((x) => x.years === econ.horizonYears);
      return [c.side, { status: e?.runningCost.status ?? 'UNAVAILABLE', ...(e?.runningCost.annual_minor ? { annual: e.runningCost.annual_minor } : {}), ...(e?.energy.costPer100km ? { per100km: e.energy.costPer100km } : {}), ...(h ? { horizon: h.total_minor } : {}) }];
    }),
  ) as EconomicsView['perSide'];
  const annualMetric = byMetric.get('economic.running_annual');
  const economics: EconomicsView = {
    status: econ.status,
    horizonYears: econ.horizonYears,
    ...(econ.leaderId ? { leader: side(econ.leaderId)! } : {}),
    perSide,
    ...(annualMetric?.delta ? { annualDelta: annualMetric.delta } : {}),
    ...(annualMetric?.meaningful ? { meaningful: annualMetric.meaningful } : {}),
  };

  // Energía de referencia del mercado, tal como la usó el Economics Engine.
  const used = input.candidates.flatMap((c) => (c.economic as EconomicResult | undefined)?.provenance.energyPrices ?? []);
  const elec = used.find((e) => e.energy === 'ELECTRICITY');
  const fuelUsed = used.find((e) => e.energy === 'FUEL');
  const scenarioShare = input.scenario.comparison?.homeChargingShare ?? 1;
  const refFuel = energyContextFor(def.market).fuel.PETROL_95_E5;
  const energy: EnergyReferenceView = {
    ...(elec
      ? { electricity: { value: elec.value, unit: elec.unit, origin: elec.origin, ...(elec.observationDate ? { date: elec.observationDate } : {}), ...(elec.price_basis ? { basis: elec.price_basis } : {}), ...(elec.taxes ? { taxes: elec.taxes } : {}), ...(elec.source_id ? { sourceId: elec.source_id } : {}) } }
      : {}),
    ...(fuelUsed
      ? { fuel: { product: fuelUsed.product, value: fuelUsed.value, unit: fuelUsed.unit, usedByVehicles: true, ...(fuelUsed.observationDate ? { date: fuelUsed.observationDate } : {}), ...(fuelUsed.source_id ? { sourceId: fuelUsed.source_id } : {}) } }
      : refFuel
        ? { fuel: { product: 'PETROL_95_E5', value: refFuel.value, unit: refFuel.unit, usedByVehicles: false, date: refFuel.observationDate, sourceId: refFuel.provenance.source_id } }
        : {}),
    homeChargingShare: scenarioShare,
  };

  const whyNot: WhyNotView[] = Object.values(result.whyNotByCandidate).map((w) => ({
    side: side(w.candidateId)!,
    kind: w.kind,
    onlyMinor: w.onlyMinor,
    items: w.items.map((i) => ({ messageKey: i.messageKey, params: i.params, text: i.text, type: i.type, severity: i.severity, ...(i.metric ? { metric: i.metric } : {}) })),
  }));
  const tradeoffs = result.tradeoffsForSelected.map((i) => ({ messageKey: i.messageKey, params: i.params, text: i.text, type: i.type, severity: i.severity, ...(i.metric ? { metric: i.metric } : {}) }));

  const metricsByCategory = DETAIL_CATEGORIES.map((category) => ({ category, metrics: all.filter((m) => toDetail(m.category) === category && hasValue(m)) })).filter((c) => c.metrics.length > 0);

  const chapters: ChapterView[] = [{ id: 'vs', kind: 'vs' }, { id: 'result', kind: 'result' }];
  for (const m of key) chapters.push({ id: `reason-${m.metric.replace(/[^a-z0-9]+/gi, '-')}`, kind: 'reason', metric: m.metric });
  // Economía como capítulo propio solo si hay un líder económico comparable y no está ya como motivo.
  if (econ.status === 'LEADER' && !key.some((m) => m.category === 'Economy')) chapters.push({ id: 'economics', kind: 'economics' });
  // Mismo criterio que el capítulo: nunca un capítulo vacío.
  const hasTradeoffs = (selected ? tradeoffs.length > 0 : false) || whyNot.some((w) => w.items.length > 0 && (w.kind === 'WHY_NOT' || w.kind === 'VERIFY_BEFORE_DECIDING' || (!selected && w.kind === 'TRADEOFFS')));
  if (hasTradeoffs) chapters.push({ id: 'tradeoffs', kind: 'tradeoffs' });
  chapters.push({ id: 'change', kind: 'change' }, { id: 'confidence', kind: 'confidence' }, { id: 'details', kind: 'details' });

  const techOf = (id: string) => result.technicalCapability.find((t) => t.candidateId === id);
  const practicalOf = (id: string) => result.practicalFit.find((p) => p.candidateId === id);
  const sources = [...new Set(input.candidates.flatMap((c) => (c.economic as EconomicResult | undefined)?.provenance.sources.map((s) => s.source_id) ?? []))].sort();

  return {
    slug: def.slug,
    status,
    ...(selected ? { selected } : {}),
    tied: (b4y.tiedIds ?? []).map((id) => side(id)!).sort(),
    ...(b4y.closestCandidate ? { closest: side(b4y.closestCandidate.candidateId)! } : {}),
    candidates,
    reasons,
    keyMetrics: key,
    chapters,
    metricsByCategory,
    economics,
    energy,
    technical: { a: { ...(techOf(idA)?.score ? { score: techOf(idA)!.score! } : {}), coverage: techOf(idA)?.coverage ?? 0 }, b: { ...(techOf(idB)?.score ? { score: techOf(idB)!.score! } : {}), coverage: techOf(idB)?.coverage ?? 0 } },
    practical: { a: { status: practicalOf(idA)?.status ?? 'UNCONFIRMED', ...(practicalOf(idA)?.score ? { score: practicalOf(idA)!.score! } : {}) }, b: { status: practicalOf(idB)?.status ?? 'UNCONFIRMED', ...(practicalOf(idB)?.score ? { score: practicalOf(idB)!.score! } : {}) } },
    whyNot,
    tradeoffs,
    verify: result.requiresVerification.map((v) => ({ messageKey: v.messageKey, params: v.params, text: v.text })),
    notices: result.notices,
    confidence: { level: result.recommendationConfidence.level, reasons: result.recommendationConfidence.reasons.slice(0, 3), robustnessComputed },
    ...(robustnessComputed ? { robustness: { status: result.resultRobustness.status, level: result.resultRobustness.level, messages: result.resultRobustness.messages } } : {}),
    versions: { engine: result.engineVersion, methodology: result.methodologyVersion, decisionRules: result.decisionRulesVersion, scenarioHash: result.scenarioHash },
    provenance: { sourceIds: sources },
  };
}

/** Aplica el resultado del Web Worker (robustez + confianza que depende de ella) sobre una vista. */
export function withRobustness(view: DecisionView, r: { resultRobustness: AlphaRecommendationResult['resultRobustness']; recommendationConfidence: AlphaRecommendationResult['recommendationConfidence'] }): DecisionView {
  return {
    ...view,
    confidence: { level: r.recommendationConfidence.level, reasons: r.recommendationConfidence.reasons.slice(0, 3), robustnessComputed: true },
    robustness: { status: r.resultRobustness.status, level: r.resultRobustness.level, messages: r.resultRobustness.messages },
  };
}
