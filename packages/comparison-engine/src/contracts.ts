import { z } from 'zod';
import type { DifferenceClass } from '@vscar/methodology';
import type { BreakEven, EconomicResult } from '@vscar/economics-engine';
import type { CategoryEligibility, CategoryStatus } from '@vscar/quality';
import type { AlphaCategory, PowertrainType, SafetyRating, SpecValue } from '@vscar/vehicle-schema';

/**
 * Contratos del Comparison Engine v0.1 (Step 6a). Responde "¿en qué es materialmente mejor, peor o
 * equivalente cada coche para este escenario?". NO responde "¿cuál es el mejor para ti?" (Step 6b):
 * no hay winner, overall score, personal fit ni recomendación.
 */

/** Candidato: hechos ya filtrados por las reglas de calidad + elegibilidad + resultado económico (Step 5). */
export interface ComparisonCandidate {
  id: string;
  label: string;
  market: 'ES';
  powertrainType: PowertrainType;
  seats?: number;
  /** Por SpecKey, valores usables ordenados por preferencia (mapping, autoridad). Nunca en conflicto pendiente. */
  facts: Readonly<Record<string, readonly SpecValue[]>>;
  safetyRatings: readonly SafetyRating[];
  eligibility: Readonly<Partial<Record<AlphaCategory, CategoryEligibility>>>;
  /** Datos descartados (conflicto, no usable, BLOCK) — visibles, nunca usados. */
  exclusions: readonly string[];
  economic?: EconomicResult;
}

/** Solo contexto práctico (Step 6a). Sin preferencias de marca, diseño, tecnología ni deportividad (Step 6b). */
export const ComparisonScenario = z
  .object({
    annualKm: z.number().int().min(1).max(200_000).optional(),
    cityShare: z.number().min(0).max(1).optional(),
    dailyDistanceKm: z.number().positive().max(2_000).optional(),
    longTripsPerYear: z.number().int().min(0).max(365).optional(),
    homeChargingAvailable: z.boolean().optional(),
    homeChargingShare: z.number().min(0).max(1).optional(),
    passengers: z.number().int().min(1).max(9).optional(),
    requirements: z
      .object({
        minSeats: z.number().int().min(1).max(9).optional(),
        minBootL: z.number().positive().optional(),
        minTowingKg: z.number().positive().optional(),
        maxLengthMm: z.number().positive().optional(),
        maxWidthMm: z.number().positive().optional(),
        maxHeightMm: z.number().positive().optional(),
        minElectricRangeKm: z.number().positive().optional(),
        maxPurchasePriceEur: z.number().positive().optional(),
      })
      .strict()
      .default({}),
  })
  .strict();
export type ComparisonScenario = z.infer<typeof ComparisonScenario>;
export type ComparisonScenarioIn = z.input<typeof ComparisonScenario>;

// ------------------------------------------------------------------------------------------ deal breakers

export type CheckStatus = 'PASS' | 'FAIL' | 'UNKNOWN';

export interface DealBreakerCheck {
  criterion: keyof ComparisonScenario['requirements'];
  requiredValue: number;
  /** Intervalo observado (punto si min = max); ausente si no hay dato. */
  observedValue?: { min: number; max: number; unit: string };
  status: CheckStatus;
  reason: string;
  provenance?: { value_id?: string; source_id?: string; spec_key?: string };
}

export interface DealBreakerResult {
  candidateId: string;
  /** FAIL si falla alguno; UNKNOWN si alguno es desconocido (nunca equivale a PASS); PASS si todos pasan. */
  status: CheckStatus;
  checks: DealBreakerCheck[];
  failedChecks: DealBreakerCheck[];
  unknownChecks: DealBreakerCheck[];
}

// ------------------------------------------------------------------------------------------ métricas

/** Desde el punto de vista de A. */
export type ComparisonOutcome =
  | 'AHEAD'
  | 'BEHIND'
  | 'PRACTICAL_TIE'
  | 'RANGE_DEPENDENT'
  /** Diferencia real sin dirección de mejora (longitud, equipamiento, etiqueta DGT): solo se describe. */
  | 'DIFFERENT'
  | 'NOT_COMPARABLE'
  | 'UNKNOWN';

export type ComparisonCategory = 'Performance' | 'Range' | 'Charging' | 'Size' | 'Practicality' | 'Safety' | 'Warranty' | 'Eco' | 'Technology' | 'Economy';

export interface ValueView {
  min: number | string | boolean;
  max: number | string | boolean;
  unit: string | null;
  test_cycle?: string;
  basis?: Record<string, unknown>;
  value_id?: string;
  source_id?: string;
  note?: string;
}

export interface Range {
  min: number;
  max: number;
}

export interface MetricComparison {
  metric: string;
  label: string;
  category: ComparisonCategory;
  outcome: ComparisonOutcome;
  /** Diferencia numérica general (independiente del usuario). */
  meaningful?: DifferenceClass | 'RANGE_DEPENDENT';
  /** Relevancia para el escenario práctico (Meaningful For You); ausente si no hay regla. */
  meaningfulForYou?: { level: DifferenceClass | 'RANGE_DEPENDENT'; rules: string[] };
  a?: ValueView;
  b?: ValueView;
  /** a − b (unidad de la métrica; céntimos para importes). */
  delta?: Range;
  /** (a − b) / b en % (cotas exactas del intervalo). */
  percentDifference?: Range;
  reason?: string;
  warnings: string[];
  /** Frase determinista (sin IA); ausente si no puede afirmarse nada. */
  explanation?: string;
}

export interface EconomicComparison {
  status: 'COMPARED' | 'UNKNOWN' | 'NOT_COMPARABLE';
  reason?: string;
  metrics: MetricComparison[];
  /** Resultado del Economics Engine (no se recalcula): `premium` = el más caro de comprar. */
  breakEven?: { premiumId: string; baselineId: string; result: BreakEven };
  economicConfidence?: { a?: string; b?: string };
}

export type CategoryAdvantage = 'A' | 'B' | 'MIXED' | 'PRACTICAL_TIE' | 'RANGE_DEPENDENT' | 'DESCRIPTIVE_ONLY' | 'NOT_COMPARABLE' | 'UNKNOWN';

export interface CategorySummary {
  category: ComparisonCategory;
  /** Elegibilidad combinada (la peor de A y B); Safety/Technology: por cobertura de datos. */
  status: CategoryStatus;
  /** Ventaja por unanimidad de métricas direccionales — sin pesos ni puntuación. */
  advantage: CategoryAdvantage;
  meaningfulLevel?: DifferenceClass;
  meaningfulForYouLevel?: DifferenceClass;
  reasons: string[];
  unknowns: string[];
}

export interface ComparisonResult {
  candidateAId: string;
  candidateBId: string;
  dealBreakersA: DealBreakerResult;
  dealBreakersB: DealBreakerResult;
  technicalComparisons: MetricComparison[];
  economicComparison: EconomicComparison;
  categorySummaries: CategorySummary[];
  dataConfidence: { level: 'HIGH' | 'MEDIUM' | 'LOW'; reasons: string[] };
  warnings: string[];
  methodologyVersion: string;
  comparisonRulesVersion: string;
  scenarioHash: string;
}
