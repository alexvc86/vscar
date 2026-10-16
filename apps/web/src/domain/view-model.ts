import type { ComparisonCategory, ComparisonOutcome, MetricComparison } from '@vscar/comparison-engine';
import type { AlphaRecommendationResult, Message, WhyNotItem } from '@vscar/decision-engine';
import type { EconomicResult } from '@vscar/economics-engine';
import type { CandidateSide } from '@vscar/ui/tokens';
import type { DecisionInput } from '@vscar/decision-engine';
import type { VehicleOption } from './catalog.ts';
import { buildComparisonChapters } from './chapters.ts';
import type { ComparisonData, DataSnapshot, SourceInfo } from './comparison-data.ts';
import type { UsedFacts } from './used-params.ts';

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
  /** Nombre corto (el mismo que usan los mensajes del engine). */
  name: string;
  year: number | null;
  powertrain: string;
  body: string;
  /** Identidad comercial de la ReferenceVariant (selector, hero, cambiar coche). */
  option: VehicleOption;
  /** Step 8b: cómo se considera este coche. `id` es la identidad del participante (variant o unidad usada). */
  condition: 'new' | 'used';
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
  /** Reglas Meaningful For You aplicadas (mensajes del engine). */
  forYouMessages: Message[];
  /** Motivo de UNKNOWN / NOT_COMPARABLE (mensaje del engine). */
  reasonMessage?: Message;
  /** Lado que va por delante (si la métrica tiene dirección). */
  leader?: CandidateSide;
}

export interface ContributionView {
  component: string;
  metric?: string;
  level?: Level;
  /** Lado favorecido. */
  side?: CandidateSide;
  message: Message;
  whyMessages: Message[];
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
  perSide: Record<
    CandidateSide,
    {
      annual?: Range;
      per100km?: Range;
      horizon?: Range;
      status: string;
      /** Step 8b: precio de compra que usa Economics (lista si nuevo; precio pedido si usado). */
      purchase?: { amount: number; source: 'LIST' | 'USED_ASKING' | 'OVERRIDE'; basis: string };
      /** Step 8b: coste conocido de propiedad al horizonte (compra + uso; vista de costes conocidos, nunca TCO). */
      ownership?: { view: string; total: Range; included: string[]; missing: string[] };
    }
  >;
  /**
   * Step 8c: punto de equilibrio del Economics Engine tal cual (sin recalcular): el coche más caro de comprar
   * frente al otro, con el ahorro anual de USO. Sin ahorro → NO_BREAK_EVEN (nunca se fabrica un plazo).
   */
  breakEven?: {
    status: 'BREAK_EVEN' | 'BREAK_EVEN_UNCERTAIN' | 'NO_BREAK_EVEN' | 'NO_PREMIUM' | 'UNAVAILABLE';
    premium?: CandidateSide;
    years?: Range;
    minYears?: number;
    extraPurchase?: Range;
    annualSaving?: Range;
  };
  /** Diferencia anual (positivo: A cuesta más). */
  annualDelta?: Range;
  meaningful?: string;
  /** Explicación del Economic Fit (mensajes del engine). */
  messages: Message[];
}

export interface EnergyReferenceView {
  electricity?: { value: number; unit: string; date?: string; basis?: string; taxes?: string; sourceId?: string; origin: string };
  /** Precio de referencia del mercado; `usedByVehicles` = algún candidato lo usa en su coste. */
  fuel?: { product: string; value: number; unit: string; date?: string; sourceId?: string; usedByVehicles: boolean };
  homeChargingShare: number;
}

export type ChapterKind = 'vs' | 'result' | 'reason' | 'economics' | 'technical' | 'practical' | 'used' | 'tradeoffs' | 'change' | 'confidence' | 'details';

export interface ChapterView {
  id: string;
  kind: ChapterKind;
  /** Para capítulos de motivo: la métrica protagonista. */
  metric?: string;
}

/** Step 8b: información de una unidad usada tal como la devuelve el Used Adjustment (solo mensajes del engine). */
export interface UsedSideView {
  side: CandidateSide;
  /** Hechos declarados (para el resumen; la UI los formatea). */
  facts: UsedFacts;
  evaluationDate: string;
  /** Edad derivada (meses, rango si solo hay año o mes/año). */
  ageMonths?: Range;
  warranty: { state: 'KNOWN' | 'UNKNOWN' | 'NOT_APPLICABLE'; basis?: string; months?: Range };
  batteryApplies: boolean;
  information: { level: 'HIGH' | 'MEDIUM' | 'LOW'; summary: Message; reasons: Message[]; requiresVerification: boolean };
  signals: { attention: Message[]; gaps: Message[]; notes: Message[] };
  verification: Message[];
  warnings: Message[];
  purchase: Message;
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
  technicalMessages: Message[];
  practical: Record<CandidateSide, { status: string; score?: Range; messages: Message[] }>;
  /** Explicación del resultado (Alpha Best For You). */
  explanation: Message;
  closestNote?: Message;
  whyNot: WhyNotView[];
  tradeoffs: WhyNotView['items'];
  verify: Message[];
  notices: Message[];
  confidence: { level: 'HIGH' | 'MEDIUM' | 'LOW'; reasons: Message[]; robustnessComputed: boolean };
  robustness?: { status: string; level: string; messages: Message[] };
  versions: { engine: string; methodology: string; decisionRules: string; scenarioHash: string };
  provenance: { sourceIds: string[] };
  /** Fuentes usadas, con su estado de derechos (para "Cómo lo calculamos"). */
  sources: SourceInfo[];
  dataSnapshot: DataSnapshot;
  channel: ComparisonData['channel'];
  /** Step 8c: la misma ReferenceVariant en los dos lados (Golf nuevo vs Golf usado). */
  sameVariant: boolean;
  /** Step 8c: verificación pendiente con el participante al que pertenece. */
  verifyBySide: (Message & { side: CandidateSide })[];
  /** Step 8b: solo con algún usado. */
  used?: Partial<Record<CandidateSide, UsedSideView>>;
  /** Step 8b: confianza de la información de los usados recomendados (NOT_APPLICABLE si no hay ninguno). */
  usedInformationConfidence?: string;
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
    forYouMessages: m.meaningfulForYou?.messages ?? [],
    ...(m.reasonMessage ? { reasonMessage: m.reasonMessage } : {}),
    ...(outcome === 'AHEAD' ? { leader: 'a' as const } : outcome === 'BEHIND' ? { leader: 'b' as const } : {}),
  };
}

const hasValue = (m: MetricView) => m.a !== undefined || m.b !== undefined;

export function buildDecisionView(data: ComparisonData, input: DecisionInput, result: AlphaRecommendationResult, robustnessComputed: boolean): DecisionView {
  const [va, vb] = data.vehicles;
  // Identidad del PARTICIPANTE (Step 8b): nunca la de la variant, que puede ser la misma en los dos lados.
  const idA = va.subjectId;
  const idB = vb.subjectId;
  const side = (id?: string) => sideOf(id, idA);
  const candidate = (v: ComparisonData['vehicles'][number]): CandidateView => ({ side: v.side, id: v.subjectId, name: v.label, year: v.option.year, powertrain: v.option.powertrainType, body: v.option.bodyType, option: v.option, condition: v.condition });
  const candidates: [CandidateView, CandidateView] = [candidate(va), candidate(vb)];

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
    return { component: c.component, ...(c.metric ? { metric: c.metric } : {}), ...(c.level ? { level: c.level as Level } : {}), ...(m?.leader ? { side: m.leader } : {}), message: c.message, whyMessages: c.whyMessages };
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
      const own = e?.ownershipCost.horizons.find((x) => x.years === econ.horizonYears);
      const p = e?.ownershipCost.purchase;
      return [
        c.side,
        {
          status: e?.runningCost.status ?? 'UNAVAILABLE',
          ...(e?.runningCost.annual_minor ? { annual: e.runningCost.annual_minor } : {}),
          ...(e?.energy.costPer100km ? { per100km: e.energy.costPer100km } : {}),
          ...(h ? { horizon: h.total_minor } : {}),
          ...(p ? { purchase: { amount: p.amount_minor, source: p.source, basis: p.basis } } : {}),
          ...(own ? { ownership: { view: own.view, total: own.total_minor, included: own.included, missing: own.missing } } : {}),
        },
      ];
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
    messages: econ.messages,
    ...breakEvenView(pair.economicComparison.breakEven, side),
  };

  // Energía de referencia del mercado, tal como la usó el Economics Engine.
  const used = input.candidates.flatMap((c) => (c.economic as EconomicResult | undefined)?.provenance.energyPrices ?? []);
  const elec = used.find((e) => e.energy === 'ELECTRICITY');
  const fuelUsed = used.find((e) => e.energy === 'FUEL');
  const scenarioShare = input.scenario.comparison?.homeChargingShare ?? 1;
  const refFuel = data.energy.fuel.PETROL_95_E5;
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
    items: w.items.map((i) => ({ messageKey: i.messageKey, params: i.params, text: i.text, ...(i.details ? { details: i.details } : {}), type: i.type, severity: i.severity, ...(i.metric ? { metric: i.metric } : {}) })),
  }));
  const tradeoffs = result.tradeoffsForSelected.map((i) => ({ messageKey: i.messageKey, params: i.params, text: i.text, ...(i.details ? { details: i.details } : {}), type: i.type, severity: i.severity, ...(i.metric ? { metric: i.metric } : {}) }));

  const metricsByCategory = DETAIL_CATEGORIES.map((category) => ({ category, metrics: all.filter((m) => toDetail(m.category) === category && hasValue(m)) })).filter((c) => c.metrics.length > 0);

  // Mismo criterio que el capítulo: nunca un capítulo vacío.
  const hasTradeoffs = (selected ? tradeoffs.length > 0 : false) || whyNot.some((w) => w.items.length > 0 && (w.kind === 'WHY_NOT' || w.kind === 'VERIFY_BEFORE_DECIDING' || (!selected && w.kind === 'TRADEOFFS')));
  const practicalOf2 = (id: string) => result.practicalFit.find((p) => p.candidateId === id)?.status ?? 'UNCONFIRMED';
  const chapters = buildComparisonChapters({
    keyMetrics: key,
    technicalMetrics: tech,
    economicStatus: econ.status,
    practicalStatus: [practicalOf2(idA), practicalOf2(idB)],
    hasTradeoffs,
    ...(data.vehicles.some((v) => v.condition === 'used') && result.usedAdjustments ? { hasUsed: true } : {}),
  });

  const techOf = (id: string) => result.technicalCapability.find((t) => t.candidateId === id);
  const practicalOf = (id: string) => result.practicalFit.find((p) => p.candidateId === id);
  const sources = [...new Set(input.candidates.flatMap((c) => (c.economic as EconomicResult | undefined)?.provenance.sources.map((s) => s.source_id) ?? []))].sort();

  return {
    slug: data.pairSlug,
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
    technicalMessages: result.technicalLeader.messages,
    practical: {
      a: { status: practicalOf(idA)?.status ?? 'UNCONFIRMED', ...(practicalOf(idA)?.score ? { score: practicalOf(idA)!.score! } : {}), messages: practicalOf(idA)?.messages ?? [] },
      b: { status: practicalOf(idB)?.status ?? 'UNCONFIRMED', ...(practicalOf(idB)?.score ? { score: practicalOf(idB)!.score! } : {}), messages: practicalOf(idB)?.messages ?? [] },
    },
    explanation: b4y.explanationMessage,
    ...(b4y.closestCandidate ? { closestNote: b4y.closestCandidate.noteMessage } : {}),
    whyNot,
    tradeoffs,
    verify: result.requiresVerification.map((v) => ({ messageKey: v.messageKey, params: v.params, text: v.text, ...(v.details ? { details: v.details } : {}) })),
    verifyBySide: result.requiresVerification.map((v) => ({ messageKey: v.messageKey, params: v.params, text: v.text, ...(v.details ? { details: v.details } : {}), side: side(v.candidateId)! })),
    sameVariant: va.option.id === vb.option.id,
    notices: result.notices,
    confidence: { level: result.recommendationConfidence.level, reasons: result.recommendationConfidence.reasons.slice(0, 3), robustnessComputed },
    ...(robustnessComputed ? { robustness: { status: result.resultRobustness.status, level: result.resultRobustness.level, messages: result.resultRobustness.messages } } : {}),
    versions: { engine: result.engineVersion, methodology: result.methodologyVersion, decisionRules: result.decisionRulesVersion, scenarioHash: result.scenarioHash },
    provenance: { sourceIds: sources },
    sources: data.sources,
    dataSnapshot: data.dataSnapshot,
    channel: data.channel,
    ...usedView(data, result),
  };
}

/** Break-even del Economics Engine (vía ComparisonResult) orientado a los lados de la página. */
type PairBreakEven = DecisionInput['comparison']['pairs'][number]['economicComparison']['breakEven'];
function breakEvenView(be: PairBreakEven, side: (id?: string) => CandidateSide | undefined): Pick<EconomicsView, 'breakEven'> {
  if (!be) return {};
  const r = be.result;
  const premium = side(be.premiumId);
  return {
    breakEven: {
      status: r.status,
      ...(premium ? { premium } : {}),
      ...(r.status === 'BREAK_EVEN' ? { years: r.years } : {}),
      ...(r.status === 'BREAK_EVEN_UNCERTAIN' ? { minYears: r.minYears } : {}),
      ...('extraPurchase_minor' in r ? { extraPurchase: r.extraPurchase_minor, annualSaving: r.annualSaving_minor } : {}),
    },
  };
}

const msg = (m: Message): Message => ({ messageKey: m.messageKey, params: m.params, text: m.text, ...(m.details ? { details: m.details } : {}) });

/** Step 8b: bloques de la unidad usada, solo reorganizados (las frases son del Used Adjustment). */
function usedView(data: ComparisonData, result: AlphaRecommendationResult): Pick<DecisionView, 'used' | 'usedInformationConfidence'> {
  const adjustments = result.usedAdjustments;
  if (!adjustments || !data.evaluationDate) return {};
  const used: Partial<Record<CandidateSide, UsedSideView>> = {};
  for (const v of data.vehicles) {
    const a = adjustments[v.subjectId];
    if (!a || v.condition !== 'used' || !v.used) continue;
    const age = a.instance.age.months;
    const w = a.instance.warrantyRemainingMonths;
    const by = (n: string) => a.ownershipSignals.filter((s) => s.nature === n).map(msg);
    used[v.side] = {
      side: v.side,
      facts: v.used,
      evaluationDate: data.evaluationDate,
      ...(age.state === 'KNOWN' ? { ageMonths: { min: age.min, max: age.max } } : {}),
      warranty: w.state === 'KNOWN' ? { state: 'KNOWN', basis: w.basis, months: { min: w.min, max: w.max } } : { state: w.state },
      batteryApplies: a.instance.batteryHealthPct.state !== 'NOT_APPLICABLE',
      information: { level: a.informationConfidence.level, summary: msg(a.informationConfidence.summary), reasons: a.informationConfidence.reasons.map(msg), requiresVerification: a.informationConfidence.requiresVerification },
      signals: { attention: by('ATTENTION'), gaps: by('INFORMATION_GAP'), notes: by('NOTE') },
      verification: a.verificationRequirements.map(msg),
      warnings: a.warnings.map(msg),
      purchase: msg(a.economicAdjustments.purchase),
    };
  }
  return { used, usedInformationConfidence: result.usedInformationConfidence };
}

/**
 * Step 8c: misma vista con los nombres de PRESENTACIÓN de los participantes (alias por condición cuando los dos lados
 * son la misma variant). Solo nombres: los mensajes del engine conservan sus params y se presentan con el mismo alias.
 */
export function withDisplayNames(view: DecisionView, names: Readonly<Record<string, string>>): DecisionView {
  if (!Object.keys(names).length) return view;
  const rename = (c: CandidateView): CandidateView => ({ ...c, name: names[c.name] ?? c.name });
  return { ...view, candidates: [rename(view.candidates[0]), rename(view.candidates[1])] };
}

/** Aplica el resultado del Web Worker (robustez + confianza que depende de ella) sobre una vista. */
export function withRobustness(view: DecisionView, r: { resultRobustness: AlphaRecommendationResult['resultRobustness']; recommendationConfidence: AlphaRecommendationResult['recommendationConfidence'] }): DecisionView {
  return {
    ...view,
    confidence: { level: r.recommendationConfidence.level, reasons: r.recommendationConfidence.reasons.slice(0, 3), robustnessComputed: true },
    robustness: { status: r.resultRobustness.status, level: r.resultRobustness.level, messages: r.resultRobustness.messages },
  };
}
