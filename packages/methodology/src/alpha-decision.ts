import type { UtilityCurve } from './utility.ts';

/**
 * Alpha Decision Engine (methodology 2026.5, `alpha-decision-v1`). Todos los valores son `provisional`
 * hasta calibración con usuarios. Públicos y versionados: el engine no contiene constantes metodológicas.
 *
 * Alpha NO tiene Preference Fit (marca, diseño, interior, preferencias observadas) ni Personal Fit
 * (0,7 Practical + 0,3 Preference): ambos quedan para MVP y no se usan en ningún resultado Alpha.
 */
export type SimplePriority = 'COST' | 'SPACE' | 'PERFORMANCE';
export type PriorityLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type FitComponent = 'SPACE' | 'RANGE_FIT' | 'PERFORMANCE' | 'COST';
export type TechnicalCategory = 'Efficiency' | 'Performance' | 'Range' | 'Charging' | 'Space' | 'Safety' | 'Warranty' | 'Eco';

const pl = (points: [number, number][], note?: string): UtilityCurve => ({ type: 'piecewise_linear', points, ...(note ? { note } : {}) });

export const ALPHA_DECISION_RULES = {
  version: 'alpha-decision-v1',
  provisional: true,

  /** Prioridades simples Alpha (no son preferencias): HIGH 3 · MEDIUM 2 · LOW 1, normalizadas en la media ponderada. */
  priority_multipliers: { HIGH: 3, MEDIUM: 2, LOW: 1 } as Readonly<Record<PriorityLevel, number>>,
  default_priority: 'MEDIUM' as PriorityLevel,

  /**
   * Technical Capability: capacidad técnica medida según categorías y pesos editoriales públicos (no "mejor coche").
   * Utilidad de categoría = media de las utilidades de sus métricas (curvas `UTILITY_CURVES`). Las categorías sin
   * datos usables NO cuentan como 0: se excluyen y la cobertura lo declara.
   */
  technical: {
    categories: {
      Efficiency: { weight: 20, metrics: ['nrg.fuel_combined_l100', 'nrg.fuel_charge_sustaining_l100', 'nrg.electric_combined_kwh100'] },
      Performance: { weight: 15, metrics: ['perf.accel_0_100_s', 'perf.power_max_kw'] },
      Range: { weight: 15, metrics: ['rng.electric_combined_km'] },
      Charging: { weight: 10, metrics: ['chg.dc_max_kw', 'chg.ac_max_kw'] },
      Space: { weight: 15, metrics: ['cap.boot_l'] },
      Safety: { weight: 15, metrics: ['saf.ncap_adult_pct'] },
      Warranty: { weight: 5, metrics: ['war.years'] },
      Eco: { weight: 5, metrics: ['emi.co2_combined_gkm'] },
    } as Readonly<Record<TechnicalCategory, { weight: number; metrics: readonly string[] }>>,
    /** Las curvas están calibradas con valores WLTP: un consumo/CO₂/autonomía de otro ciclo no recibe utilidad. */
    accepted_cycles: ['WLTP'] as readonly string[],
    /** Potencia: solo base SYSTEM (o ICE_ONLY en un ICE puro, que es la potencia del sistema). */
    accepted_power_basis: { any: ['SYSTEM'], ICE: ['SYSTEM', 'ICE_ONLY'] } as const,
    /** Autonomía: solo combinada WLTP declarada. */
    accepted_range_types: ['WLTP_COMBINED'] as readonly string[],
    /** Seguridad: solo ratings vigentes (un rating EXPIRED corresponde a un protocolo ya superado). */
    safety_statuses: ['VALID'] as readonly string[],
  },

  /**
   * Componentes del Alpha Fit. Cada variable entra UNA sola vez (sin doble conteo):
   * - SPACE: utilidad del maletero (prioridad SPACE). Plazas y dimensiones se tratan como requisitos/deseos, no como utilidad.
   * - RANGE_FIT: utilidad de la autonomía eléctrica (solo enchufables), con relevancia según el uso.
   * - PERFORMANCE: media de 0–100 y potencia (prioridad PERFORMANCE).
   * - COST: utilidad del coste de uso ANUAL del Economics Engine (prioridad COST). Nunca entra en Technical Capability.
   * Practical Fit score = media ponderada de los componentes prácticos (SPACE, RANGE_FIT).
   */
  fit_components: {
    SPACE: { base_weight: 1, priority: 'SPACE' as SimplePriority, metrics: ['cap.boot_l'] },
    RANGE_FIT: { base_weight: 1, metrics: ['rng.electric_combined_km'] },
    PERFORMANCE: { base_weight: 1, priority: 'PERFORMANCE' as SimplePriority, metrics: ['perf.accel_0_100_s', 'perf.power_max_kw'] },
    COST: { base_weight: 1, priority: 'COST' as SimplePriority, metrics: ['economic.running_annual'] },
  } as const,
  practical_components: ['SPACE', 'RANGE_FIT'] as readonly FitComponent[],

  /**
   * Relevancia de la autonomía (mismas cotas que `for-you-v1`): uso diario × 3 ≤ autonomía, carga en casa y ≤ 2 viajes
   * largos/año → peso × 0,34; ≥ 6 viajes largos/año → × 1,5.
   */
  range_relevance: { daily_margin: 3, few_long_trips: 2, many_long_trips: 6, low_multiplier: 0.34, high_multiplier: 1.5 },

  /** Utilidad del coste de uso anual (€/año, ICE/HEV/BEV/PHEV). Calibrada con costes basados en consumos WLTP. */
  running_cost_annual_utility: pl([[300, 100], [800, 85], [1500, 60], [2500, 30], [4000, 5], [6000, 0]], 'menor coste anual = más utilidad; saturante'),
  /** El componente COST solo se calcula si el coste no depende de consumos de un ciclo distinto de WLTP. */
  cost_requires_wltp: true,

  /** Cierre de candidatos sin coincidencia completa: menos requisitos incumplidos, luego menor déficit relativo. */
  closest_candidate: 'FEWEST_FAILED_THEN_SMALLEST_RELATIVE_SHORTFALL',

  /** Factores principales del resultado. */
  top_contributions: { max: 3, min_level: 'MEANINGFUL' as const },
} as const;
