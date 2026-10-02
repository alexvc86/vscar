import { z } from 'zod';
import { ComparisonScenario, type ComparisonCandidate, type ComparisonResult, type DealBreakerCheck, type DealBreakerResult } from '@vscar/comparison-engine';
import type { DifferenceClass, FitComponent, PriorityLevel, TechnicalCategory } from '@vscar/methodology';

/**
 * Contratos del Alpha Decision Engine v0.1 (Step 6b). Resultados SEPARADOS:
 * Deal Breakers → Technical Capability → Economic Fit @ horizon → Practical Fit → prioridades → Alpha Best For You.
 * No existe Preference Fit ni Personal Fit (MVP); ninguna nota única mezcla los tres conceptos.
 */
export interface Range {
  min: number;
  max: number;
}

const Priority = z.enum(['HIGH', 'MEDIUM', 'LOW']);
export const SimplePriorities = z.object({ COST: Priority.optional(), SPACE: Priority.optional(), PERFORMANCE: Priority.optional() }).strict();
export type SimplePriorities = z.infer<typeof SimplePriorities>;

/** Escenario de decisión: el de la comparación + horizonte + deseos (no obligatorios) + prioridades simples. */
export const DecisionScenario = z
  .object({
    comparison: ComparisonScenario.default({}),
    horizonYears: z.number().int().min(1).max(30),
    /** Requisitos DESEABLES (no deal breakers): incumplirlos da PASS_WITH_COMPROMISES. */
    desired: ComparisonScenario.shape.requirements.default({}),
    priorities: SimplePriorities.default({}),
  })
  .strict();
export type DecisionScenario = z.infer<typeof DecisionScenario>;
export type DecisionScenarioIn = z.input<typeof DecisionScenario>;

export interface DecisionInput {
  /** Candidatos con hechos ya filtrados por quality y su `EconomicResult` (Step 5). */
  candidates: readonly ComparisonCandidate[];
  /** Resultado de `compareCandidates` (Step 6a) sobre los mismos candidatos y escenario: no se recalcula. */
  comparison: { dealBreakers: Readonly<Record<string, DealBreakerResult>>; pairs: readonly ComparisonResult[] };
  scenario: DecisionScenarioIn;
}

// ------------------------------------------------------------------------------------------ technical

export interface MetricUtility {
  metric: string;
  utility: Range;
  value: Range;
  value_id?: string;
}

export interface TechnicalCategoryScore {
  category: TechnicalCategory;
  status: 'AVAILABLE' | 'NOT_AVAILABLE';
  utility?: Range;
  weight: number;
  /** Peso efectivo tras renormalizar sobre las categorías disponibles (0–1). */
  effectiveWeight: number;
  weightedContribution?: Range;
  metrics: MetricUtility[];
  reasons: string[];
}

export interface TechnicalCapabilityResult {
  candidateId: string;
  /** 0–100 sobre las categorías con datos; nunca se muestra sin categorías, contribuciones y cobertura. */
  score?: Range;
  categories: TechnicalCategoryScore[];
  /** Fracción del peso editorial cubierta por datos usables. */
  coverage: number;
  warnings: string[];
}

// ------------------------------------------------------------------------------------------ economic

export type EconomicPairOutcome = 'A_CHEAPER' | 'B_CHEAPER' | 'PRACTICAL_TIE' | 'RANGE_DEPENDENT' | 'NOT_COMPARABLE' | 'UNKNOWN';

export interface EconomicFitResult {
  horizonYears: number;
  /** Base del ganador: coste de uso al horizonte (conocido); la propiedad se informa aparte. */
  basis: 'RUNNING_COST';
  candidates: {
    candidateId: string;
    status: 'AVAILABLE' | 'UNAVAILABLE';
    runningCost_minor?: Range;
    ownership?: { view: 'COMPLETE' | 'KNOWN_COST_VIEW'; total_minor: Range; missing: string[] };
    confidence?: string;
  }[];
  pairs: { a: string; b: string; outcome: EconomicPairOutcome; delta_minor?: Range; meaningful?: DifferenceClass | 'RANGE_DEPENDENT'; reason?: string }[];
  status: 'LEADER' | 'PRACTICAL_TIE' | 'RANGE_DEPENDENT' | 'NOT_COMPARABLE' | 'UNKNOWN';
  leaderId?: string;
  /** Candidatos que comparten el mejor puesto (empate práctico / dependencia de rangos). */
  tiedIds?: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasons: string[];
  warnings: string[];
}

// ------------------------------------------------------------------------------------------ practical

export type PracticalFitStatus = 'PASS' | 'PASS_WITH_COMPROMISES' | 'UNCONFIRMED' | 'FAIL';

export interface ComponentScore {
  component: FitComponent;
  utility?: Range;
  weight: number;
  metrics: MetricUtility[];
  note?: string;
}

export interface PracticalFitResult {
  candidateId: string;
  /** El estado manda sobre el score: FAIL con score alto sigue siendo FAIL. */
  status: PracticalFitStatus;
  score?: Range;
  components: ComponentScore[];
  reasons: string[];
  compromises: DealBreakerCheck[];
  /** Requisitos (obligatorios o deseados) sin dato verificable: nunca se dan por cumplidos. */
  unknowns: DealBreakerCheck[];
  /** Subconjunto de `unknowns` que son requisitos obligatorios (por eso UNCONFIRMED). */
  mandatoryUnknowns: DealBreakerCheck[];
  failed: DealBreakerCheck[];
}

// ------------------------------------------------------------------------------------------ alpha

export interface Contribution {
  component: FitComponent | 'DEAL_BREAKER' | 'COMPROMISE';
  metric?: string;
  /** Qué difiere. */
  what: string;
  /** Cuánto (texto con unidades). */
  howMuch?: string;
  /** Por qué importa (prioridad, regla For You, requisito). */
  why: string;
  /** Para quién (resumen del escenario práctico). */
  forWhom?: string;
  level?: DifferenceClass | 'RANGE_DEPENDENT';
  text: string;
}

export interface AlphaBestForYouResult {
  status: 'BEST_FOR_YOU' | 'PRACTICAL_TIE' | 'RANGE_DEPENDENT' | 'NO_FULL_MATCH' | 'INSUFFICIENT_DATA';
  candidateId?: string;
  tiedIds?: string[];
  /** Intrínseco (independiente del conjunto) por candidato elegible. */
  alphaFit: { candidateId: string; score?: Range; components: ComponentScore[] }[];
  /** Solo si NO_FULL_MATCH: informativo (el que menos/menos gravemente incumple), NO una recomendación. */
  closestCandidate?: { candidateId: string; failedChecks: DealBreakerCheck[]; note: string };
  /** Candidato elegible con requisitos sin confirmar: hay que verificarlos. */
  requiresVerification?: DealBreakerCheck[];
  explanation: string;
}

export interface AlphaDecisionResult {
  candidates: string[];
  technicalCapability: TechnicalCapabilityResult[];
  technicalLeader: { status: 'LEADER' | 'PRACTICAL_TIE' | 'RANGE_DEPENDENT' | 'INSUFFICIENT_DATA'; candidateId?: string; tiedIds?: string[]; reasons: string[] };
  economicFit: EconomicFitResult;
  practicalFit: PracticalFitResult[];
  alphaBestForYou: AlphaBestForYouResult;
  topContributions: Contribution[];
  dataConfidence: { level: 'HIGH' | 'MEDIUM' | 'LOW'; reasons: string[] };
  warnings: string[];
  priorities: Record<'COST' | 'SPACE' | 'PERFORMANCE', PriorityLevel>;
  methodologyVersion: string;
  decisionRulesVersion: string;
  engineVersion: string;
  scenarioHash: string;
}
