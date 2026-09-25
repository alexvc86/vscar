import type { MappingConfidence, SourceAuthority } from '@vscar/vehicle-schema';

/** Umbrales de plausibilidad (Catalog v0.2 §14 / Q1). Provisionales hasta calibrar con imports reales. */
export const PLAUSIBILITY_THRESHOLDS = {
  maxPassengerCarTurningRadiusM: 8,
  /** Consumo urbano ICE por debajo de extraurbano × factor → sospechoso. */
  urbanBelowExtraUrbanFactor: 0.9,
} as const;

/** Pesos de completitud (Plan §13.7): A/B/C del catálogo. */
export const COMPLETENESS_WEIGHTS = { A: 3, B: 2, C: 1 } as const;

/** Cuánto cuenta un valor presente según quién lo publica (secundarias no cuentan). */
export const PROVENANCE_FACTOR: Readonly<Record<SourceAuthority, number>> = {
  OFFICIAL_AUTHORITY: 1,
  OFFICIAL_MANUFACTURER: 1,
  VERIFIED_EDITORIAL: 0.9,
  CALCULATED: 0.9,
  USER_PROVIDED: 0.7,
  ESTIMATED: 0.5,
  SECONDARY_REFERENCE: 0,
};

/** Cuánto cuenta según la exactitud del mapeo a la variant técnica. */
export const MAPPING_FACTOR: Readonly<Record<MappingConfidence, number>> = {
  EXACT: 1,
  TRIM_LEVEL: 0.95,
  CROSS_MARKET_EXACT_HOMOLOGATION: 0.95,
  POWERTRAIN_LEVEL: 0.85,
  GENERATION_LEVEL: 0.7,
  INFERRED: 0.5,
  UNCONFIRMED: 0,
};

/** Recommendation Confidence (Plan §13.6): el número es secundario en UI. */
export const RECOMMENDATION_CONFIDENCE_LEVELS = { high: 85, medium: 65 } as const;

export function recommendationConfidenceLevel(score0to100: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  const L = RECOMMENDATION_CONFIDENCE_LEVELS;
  return score0to100 >= L.high ? 'HIGH' : score0to100 >= L.medium ? 'MEDIUM' : 'LOW';
}

/** Elegibilidad SEO (Catalog v0.2 §8). */
export const SEO_COMPLETENESS_MIN = 0.9;
