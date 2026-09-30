/**
 * Reglas del Comparison Engine (methodology 2026.4, `comparison-v1`).
 * La confianza de datos de una comparación COMBINA señales existentes (elegibilidad por categoría, mapping,
 * conflictos excluidos, rangos, confianza económica); no introduce una escala paralela.
 */
import type { ConfidenceLevel } from './used-information.ts';

export const COMPARISON_RULES = {
  version: 'comparison-v1',
  data_confidence: {
    /** Más de esta fracción de categorías comparables NOT_AVAILABLE en algún candidato → LOW. */
    low_if_not_available_share_above: 0.5,
    /** Cualquier categoría PARTIAL → como máximo MEDIUM. */
    partial_caps_at: 'MEDIUM' as ConfidenceLevel,
    /** Datos a nivel de motorización/generación o inferidos → como máximo MEDIUM. */
    coarse_mapping: ['POWERTRAIN_LEVEL', 'GENERATION_LEVEL', 'INFERRED'] as readonly string[],
    coarse_mapping_caps_at: 'MEDIUM' as ConfidenceLevel,
    /** Algún valor excluido por conflicto pendiente → como máximo MEDIUM. */
    conflict_caps_at: 'MEDIUM' as ConfidenceLevel,
    /** Más de esta fracción de métricas RANGE_DEPENDENT → como máximo MEDIUM. */
    range_dependent_share_caps_medium: 0.34,
  },
} as const;

const ORDER: readonly ConfidenceLevel[] = ['LOW', 'MEDIUM', 'HIGH'];
export const minConfidence = (...levels: ConfidenceLevel[]): ConfidenceLevel =>
  levels.reduce((a, b) => (ORDER.indexOf(a) <= ORDER.indexOf(b) ? a : b), 'HIGH' as ConfidenceLevel);
