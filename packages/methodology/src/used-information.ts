import { knownUsedFields, type PowertrainType, type UsedInformationField, type UsedVehicleInstance } from '@vscar/vehicle-schema';

/**
 * Used Information Confidence v0.1 (Plan §13.9A, Catalog v0.2 §16 y Q6).
 * Separa *information completeness* (cuánto se sabe, pesos A/B/C del catálogo) de *decision relevance*
 * (cuánto importa para decidir, según powertrain y antigüedad). Mide información, no fiabilidad del coche.
 */
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/** Pesos de información (Catalog v0.2 §16: A=3, B=2, C=1). */
export const USED_INFORMATION_WEIGHTS: Readonly<Record<UsedInformationField, number>> = {
  asking_price: 3,
  mileage: 3,
  registration_year: 2,
  service_history: 2,
  accident_history: 2,
  owners: 1,
  warranty_remaining: 2,
  inspection_status: 1,
  condition: 1,
  battery_health: 3,
};

export const USED_CRITICAL_FIELDS: readonly UsedInformationField[] = ['asking_price', 'mileage'];

export const USED_CONFIDENCE_THRESHOLDS = { high: 0.8, medium: 0.5 } as const;

export interface UsedContext {
  powertrain: PowertrainType;
  /** Años desde matriculación (conocidos o asumidos). */
  age_years?: number;
}

/** Relevancia para la decisión (0 = no aplica). Reglas publicadas en Metodología. */
export function decisionRelevance(field: UsedInformationField, ctx: UsedContext): number {
  const age = ctx.age_years ?? 5;
  switch (field) {
    case 'asking_price':
    case 'mileage':
      return 3;
    case 'service_history':
      return age >= 3 ? 3 : 2;
    case 'accident_history':
      return 2;
    case 'registration_year':
      return 1.5;
    case 'warranty_remaining':
      return age <= 8 ? 1.5 : 0.5;
    case 'inspection_status':
      return age >= 4 ? 1.5 : 0.5;
    case 'condition':
      return 1;
    case 'owners':
      return 0.5;
    case 'battery_health':
      return ctx.powertrain === 'BEV' ? 3 : ctx.powertrain === 'PHEV' || ctx.powertrain === 'EREV' ? 2 : 0;
  }
}

export interface UsedInformationResult {
  level: ConfidenceLevel;
  /** Relevancia cubierta por campos conocidos (0..1). */
  score: number;
  /** `used_instance_completeness`: completitud de información de la unidad (0..1), no calidad del coche. */
  information_completeness: number;
  missing: UsedInformationField[];
  reasons: string[];
}

export function usedInformationConfidence(u: UsedVehicleInstance, ctx: UsedContext): UsedInformationResult {
  const known = knownUsedFields(u);
  const fields = (Object.keys(known) as UsedInformationField[]).filter((f) => decisionRelevance(f, ctx) > 0);

  const sum = (fs: UsedInformationField[], w: (f: UsedInformationField) => number) => fs.reduce((s, f) => s + w(f), 0);
  const knownFields = fields.filter((f) => known[f]);
  const score = sum(knownFields, (f) => decisionRelevance(f, ctx)) / sum(fields, (f) => decisionRelevance(f, ctx));
  const information_completeness = sum(knownFields, (f) => USED_INFORMATION_WEIGHTS[f]) / sum(fields, (f) => USED_INFORMATION_WEIGHTS[f]);
  const missing = fields.filter((f) => !known[f]);

  const reasons: string[] = [];
  let level: ConfidenceLevel = score >= USED_CONFIDENCE_THRESHOLDS.high ? 'HIGH' : score >= USED_CONFIDENCE_THRESHOLDS.medium ? 'MEDIUM' : 'LOW';
  const missingCritical = USED_CRITICAL_FIELDS.filter((f) => !known[f]);
  if (missingCritical.length > 0) {
    level = 'LOW';
    reasons.push(`critical unknown: ${missingCritical.join(', ')}`);
  }
  if (missing.length) reasons.push(`unknown: ${missing.join(', ')}`);
  return { level, score, information_completeness, missing, reasons };
}
