import type { ConfidenceLevel } from './used-information.ts';

/**
 * Step 6c (methodology 2026.6). Reglas provisionales y públicas de Why Not, Result Robustness y
 * Recommendation Confidence. Ninguna crea certeza nueva: combinan señales ya existentes.
 */
export const WHY_NOT_RULES = {
  version: 'why-not-v1',
  provisional: true,
  max_items_why_not: 5,
  max_items_tradeoffs: 3,
  /** Solo diferencias con relevancia para el usuario ≥ este nivel (o deal breakers / compromisos / verificación). */
  min_level: 'MEANINGFUL' as const,
  /** Si no hay nada ≥ min_level, se admiten diferencias SLIGHT marcadas como menores. */
  allow_minor_fallback: true,
} as const;

/**
 * Robustez: ¿cambia el resultado con variaciones razonables del escenario?
 * Rangos = `SENSITIVITY_RANGES` del mercado (mismas cotas que la sensibilidad del Economics Engine).
 * distancia normalizada = |punto de cambio − valor actual| / (máx − mín del rango plausible).
 */
export const ROBUSTNESS_RULES = {
  version: 'robustness-v1',
  provisional: true,
  variables: {
    annual_km: { range_key: 'annual_distance', kind: 'continuous' as const, display_decimals: -1 },
    fuel_price: { range_key: 'fuel_price', kind: 'continuous' as const, display_decimals: 3 },
    electricity_price: { range_key: 'electricity_home_price', kind: 'continuous' as const, display_decimals: 3 },
    home_charging_share: { range_key: 'home_charging_share', kind: 'continuous' as const, display_decimals: 2 },
    horizon_years: { range_key: 'ownership_years', kind: 'integer' as const, display_decimals: 0 },
  },
  /** Búsqueda acotada y determinista: rejilla desde el valor actual hacia cada extremo + bisección. */
  grid_steps_per_side: 6,
  bisection_iterations: 12,
  thresholds: { very_sensitive_below: 0.02, sensitive_below: 0.1 },
  /** Cambiar una prioridad simple un solo nivel y que cambie el resultado → al menos SENSITIVE. */
  priority_flip_status: 'SENSITIVE' as const,
  levels: { VERY_SENSITIVE: 'LOW', SENSITIVE: 'MEDIUM', STABLE: 'HIGH', NO_SWITCH_IN_RANGE: 'HIGH' } as Readonly<Record<string, ConfidenceLevel>>,
} as const;

/**
 * Recommendation Confidence (sobre 100, secundario; lo público es HIGH/MEDIUM/LOW + motivos).
 * No es certeza financiera ni dice nada sobre derechos de publicación (eso es la capa de publicación).
 */
export const RECOMMENDATION_CONFIDENCE_RULES = {
  version: 'recommendation-confidence-v1',
  provisional: true,
  thresholds: { high: 80, medium: 55 },
  penalties: {
    data_confidence: { MEDIUM: 15, LOW: 35 } as Readonly<Record<string, number>>,
    selected_unconfirmed_per_requirement: 20,
    desired_unknown_per_item: 5,
    desired_unknown_max: 15,
    economic_not_comparable: 10,
    economic_unknown: 10,
    robustness: { MEDIUM: 15, LOW: 30 } as Readonly<Record<string, number>>,
    used_information: { MEDIUM: 10, LOW: 20 } as Readonly<Record<string, number>>,
  },
  /** Topes: sin recomendación única no puede haber confianza alta en "la" recomendación. */
  caps: {
    PRACTICAL_TIE: 'LOW',
    RANGE_DEPENDENT: 'LOW',
    NO_FULL_MATCH: 'LOW',
    INSUFFICIENT_DATA: 'LOW',
    ALL_UNCONFIRMED: 'LOW',
  } as Readonly<Record<string, ConfidenceLevel>>,
} as const;
