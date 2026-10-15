import { knownUsedFields, type PowertrainType, type UsedInformationField, type UsedVehicleInstance } from '@vscar/vehicle-schema';

/**
 * Used Information Confidence v0.2 (Plan §13.9A, Catalog v0.2 §16 y Q6; Step 8a).
 * Separa *information completeness* (cuánto se sabe, pesos A/B/C del catálogo) de *decision relevance*
 * (cuánto importa para decidir, según powertrain y antigüedad). Mide información, no fiabilidad del coche.
 * Un campo que no aplica al powertrain (salud de batería en un ICE) es NOT_APPLICABLE: no cuenta como falta.
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

/** Críticos para cualquier powertrain: sin ellos no hay economía ni señales de uso → LOW. */
export const USED_CRITICAL_FIELDS: readonly UsedInformationField[] = ['asking_price', 'mileage'];

/**
 * Críticos por powertrain (catálogo §16: `battery_health_pct` ✅ BEV). La decisión sigue siendo calculable sin
 * ellos, por eso limitan el nivel (tope) en vez de forzar LOW.
 */
export const USED_POWERTRAIN_CRITICAL: Readonly<Partial<Record<PowertrainType, { fields: readonly UsedInformationField[]; cap: ConfidenceLevel }>>> = {
  BEV: { fields: ['battery_health'], cap: 'MEDIUM' },
};

export const USED_CONFIDENCE_THRESHOLDS = { high: 0.8, medium: 0.5 } as const;

export interface UsedContext {
  powertrain: PowertrainType;
  /** Años desde matriculación: valor o rango. Ausente = desconocida → relevancia máxima (nunca se asume una edad). */
  age_years?: number | { min: number; max: number };
}

/** Relevancia para la decisión (0 = no aplica). Edad desconocida o rango: la relevancia más alta posible. */
export function decisionRelevance(field: UsedInformationField, ctx: UsedContext): number {
  const age = ctx.age_years === undefined ? undefined : typeof ctx.age_years === 'number' ? { min: ctx.age_years, max: ctx.age_years } : ctx.age_years;
  switch (field) {
    case 'asking_price':
    case 'mileage':
      return 3;
    case 'service_history':
      return !age || age.max >= 3 ? 3 : 2;
    case 'accident_history':
      return 2;
    case 'registration_year':
      return 1.5;
    case 'warranty_remaining':
      return !age || age.min <= 8 ? 1.5 : 0.5;
    case 'inspection_status':
      return !age || age.max >= 4 ? 1.5 : 0.5;
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
  /** Campos relevantes desconocidos. */
  missing: UsedInformationField[];
  /** Campos que no aplican a este powertrain (no cuentan como falta). */
  not_applicable: UsedInformationField[];
  /** Críticos universales desconocidos (fuerzan LOW). */
  critical_missing: UsedInformationField[];
  /** Topes por powertrain aplicados (p. ej. BEV sin salud de batería → como mucho MEDIUM). */
  caps: { field: UsedInformationField; cap: ConfidenceLevel }[];
  /** Respaldo inglés (debug); el contrato público son los campos estructurados. */
  reasons: string[];
}

const RANK: Record<ConfidenceLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

export function usedInformationConfidence(u: UsedVehicleInstance, ctx: UsedContext): UsedInformationResult {
  const known = knownUsedFields(u);
  const all = Object.keys(known) as UsedInformationField[];
  const fields = all.filter((f) => decisionRelevance(f, ctx) > 0);
  const not_applicable = all.filter((f) => decisionRelevance(f, ctx) === 0);

  const sum = (fs: UsedInformationField[], w: (f: UsedInformationField) => number) => fs.reduce((s, f) => s + w(f), 0);
  const knownFields = fields.filter((f) => known[f]);
  const score = sum(knownFields, (f) => decisionRelevance(f, ctx)) / sum(fields, (f) => decisionRelevance(f, ctx));
  const information_completeness = sum(knownFields, (f) => USED_INFORMATION_WEIGHTS[f]) / sum(fields, (f) => USED_INFORMATION_WEIGHTS[f]);
  const missing = fields.filter((f) => !known[f]);

  const reasons: string[] = [];
  let level: ConfidenceLevel = score >= USED_CONFIDENCE_THRESHOLDS.high ? 'HIGH' : score >= USED_CONFIDENCE_THRESHOLDS.medium ? 'MEDIUM' : 'LOW';
  const critical_missing = USED_CRITICAL_FIELDS.filter((f) => !known[f]);
  if (critical_missing.length > 0) {
    level = 'LOW';
    reasons.push(`critical unknown: ${critical_missing.join(', ')}`);
  }
  const caps: UsedInformationResult['caps'] = [];
  const pc = USED_POWERTRAIN_CRITICAL[ctx.powertrain];
  for (const f of pc?.fields ?? []) {
    if (known[f]) continue;
    caps.push({ field: f, cap: pc!.cap });
    if (RANK[level] > RANK[pc!.cap]) level = pc!.cap;
    reasons.push(`${ctx.powertrain}: ${f} unknown caps confidence at ${pc!.cap.toLowerCase()}`);
  }
  if (missing.length) reasons.push(`unknown: ${missing.join(', ')}`);
  return { level, score, information_completeness, missing, not_applicable, critical_missing, caps, reasons };
}
