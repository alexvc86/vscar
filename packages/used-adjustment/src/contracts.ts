import type { ConfidenceLevel, Message, UsedNotModelled } from '@vscar/methodology';
import type { DecisionSubject, PowertrainType, UsedInformationField, UsedNumericFact, UsedSubjectFacts, UsedVehicleInstanceInput } from '@vscar/vehicle-schema';

/**
 * Contratos del Used Adjustment v0.1 (Step 8a, ADR-016):
 *   ReferenceVariant (verdad técnica) + UsedVehicleInstance (hechos de la unidad) → UsedAdjustmentResult
 *   → entradas ajustadas para los MISMOS engines (Economics → Comparison → Decision).
 * Nada aquí es una puntuación: cada señal es un hecho trazable (ruleCode + sourceFields + messageKey/params).
 */

/** Lo que la capa necesita de la ReferenceVariant (hechos usables ya filtrados por quality). Nunca se modifica. */
export interface ReferenceContext {
  referenceVariantId: string;
  powertrainType: PowertrainType;
  market: 'ES';
  /** Garantía original del fabricante (`war.years` / `war.km`), si hay dato usable. */
  originalWarranty?: { years?: number; km?: number; valueIds: readonly string[] };
  /** SOH mínimo garantizado (`bat.warranty_soh_pct`), si hay dato usable. */
  batteryWarrantedMinSohPct?: { pct: number; valueId?: string };
}

export interface UsedAdjustmentInput {
  reference: ReferenceContext;
  instance: UsedVehicleInstanceInput;
  /** Fecha de evaluación explícita (YYYY-MM-DD): la capa nunca lee el reloj del sistema. */
  evaluationDate: string;
}

/** Códigos de regla estables (la UI y los tests nunca dependen del texto). */
export type UsedRuleCode =
  | 'USED_PRICE_ASKING_OVERRIDE'
  | 'USED_PRICE_ASKING_MISSING'
  | 'USED_PRICE_CURRENCY_MISMATCH'
  | 'USED_AGE_FROM_REGISTRATION_DATE'
  | 'USED_AGE_FROM_REGISTRATION_YEAR'
  | 'USED_AGE_UNKNOWN'
  | 'USED_REGISTRATION_AFTER_EVALUATION'
  | 'USED_ASSUMED_REGISTRATION_NOT_USED'
  | 'USED_OBSERVED_AFTER_EVALUATION'
  | 'USED_MILEAGE_HIGH_FOR_AGE'
  | 'USED_MILEAGE_LOW_FOR_AGE'
  | 'USED_MILEAGE_UNKNOWN'
  | 'USED_WARRANTY_NONE_REMAINING'
  | 'USED_WARRANTY_LIMITED'
  | 'USED_WARRANTY_CALCULATED'
  | 'USED_WARRANTY_UNKNOWN'
  | 'USED_SERVICE_HISTORY_UNKNOWN'
  | 'USED_SERVICE_HISTORY_INCOMPLETE'
  | 'USED_BATTERY_HEALTH_UNKNOWN'
  | 'USED_BATTERY_HEALTH_LOW'
  | 'USED_BATTERY_HEALTH_REPORTED'
  | 'USED_BATTERY_HEALTH_NOT_APPLICABLE'
  | 'USED_ACCIDENT_DAMAGE_DECLARED'
  | 'USED_CONDITION_ISSUES_DECLARED'
  | 'USED_CONDITION_UNCONFIRMED'
  | 'USED_INFO_FIELD_UNKNOWN'
  | 'USED_INFO_CRITICAL_UNKNOWN'
  | 'USED_INFO_POWERTRAIN_CAP'
  | 'USED_INFO_COMPLETE';

/** Campos de origen (de la instancia o de la ReferenceVariant) que sustentan un resultado. */
export type UsedSourceField =
  | 'asking_price_minor'
  | 'currency'
  | 'mileage_km'
  | 'registration_date'
  | 'registration_year'
  | 'registration_year_assumed'
  | 'service_history'
  | 'accident_history'
  | 'owners'
  | 'warranty_remaining_months'
  | 'inspection_status'
  | 'condition'
  | 'battery_health_pct'
  | 'observed_at'
  | 'reference:war.years'
  | 'reference:war.km'
  | 'reference:bat.warranty_soh_pct';

export interface Traced {
  ruleCode: UsedRuleCode;
  sourceFields: readonly UsedSourceField[];
}

// ------------------------------------------------------------------------------------------ instancia

export type AgeSource = 'REGISTRATION_DATE' | 'REGISTRATION_YEAR' | 'NONE';

export interface VehicleAge {
  /** Meses completos desde la primera matriculación (rango si solo se conoce el año). */
  months: UsedNumericFact;
  source: AgeSource;
  /** Matriculación posterior a la fecha de evaluación: la edad queda UNKNOWN. */
  invalid?: 'REGISTRATION_AFTER_EVALUATION';
}

export interface UsedVehicleInstanceSummary {
  usedInstanceId: string;
  referenceVariantId: string;
  evaluationDate: string;
  /** Cuándo se declararon precio, km y estado (si se indicó). */
  observedAt?: string;
  age: VehicleAge;
  /** Año supuesto (ESTIMATED): se conserva para mostrarlo, nunca se usa para calcular. */
  registrationYearAssumed?: number;
  mileageKm: UsedNumericFact;
  askingPrice: { state: 'KNOWN'; amount_minor: number; currency: 'EUR' } | { state: 'UNKNOWN' };
  warrantyRemainingMonths: UsedNumericFact;
  batteryHealthPct: UsedNumericFact;
  serviceHistory: 'FULL' | 'PARTIAL' | 'NONE' | 'UNKNOWN';
  accidentHistory: 'KNOWN_NONE' | 'KNOWN_DAMAGE' | 'UNKNOWN';
  /** Estado simplificado (§30): declarado bueno, con problemas declarados o desconocido. */
  condition: 'KNOWN_GOOD' | 'KNOWN_ISSUES' | 'UNKNOWN';
  inspectionStatus: 'VALID' | 'EXPIRED' | 'UNKNOWN';
  owners: number | 'UNKNOWN';
}

// ------------------------------------------------------------------------------------------ economía

export interface UsedEconomicAdjustments {
  participant: 'USED';
  /** Precio de compra efectivo para Economics (override del precio de lista). Nunca se busca ni se estima. */
  purchase:
    | ({ status: 'AVAILABLE'; effectivePurchasePrice: { amount_minor: number; currency: 'EUR'; basis: 'USER_PROVIDED' } } & Traced & Message)
    | ({ status: 'UNAVAILABLE' } & Traced & Message);
  /** Lo que esta capa NO calcula (no hay depreciación, valor de mercado, mantenimiento ni reparaciones). */
  notModelled: readonly UsedNotModelled[];
}

// ------------------------------------------------------------------------------------------ señales

export type OwnershipSignalCode =
  | 'HIGH_MILEAGE_FOR_AGE'
  | 'LOW_MILEAGE_FOR_AGE'
  | 'MILEAGE_UNKNOWN'
  | 'NO_REMAINING_WARRANTY'
  | 'LIMITED_WARRANTY'
  | 'SERVICE_HISTORY_UNKNOWN'
  | 'SERVICE_HISTORY_INCOMPLETE'
  | 'BATTERY_HEALTH_UNKNOWN'
  | 'BATTERY_HEALTH_LOW'
  | 'BATTERY_HEALTH_REPORTED'
  | 'ACCIDENT_DAMAGE_DECLARED'
  | 'CONDITION_ISSUES_DECLARED'
  | 'CONDITION_UNCONFIRMED'
  | 'ASKING_PRICE_MISSING';

/**
 * Naturaleza de la señal (nunca una puntuación ni una probabilidad):
 *   ATTENTION       hecho conocido que conviene mirar (km altos para la edad, sin garantía, daño declarado…);
 *   INFORMATION_GAP dato desconocido: reduce la información, NO es un defecto (unknown ≠ bad);
 *   NOTE            hecho declarado neutro o favorable (SOH declarado, km bajos para la edad).
 */
export type SignalNature = 'ATTENTION' | 'INFORMATION_GAP' | 'NOTE';

export interface OwnershipSignal extends Message, Traced {
  signal: OwnershipSignalCode;
  nature: SignalNature;
  basis: 'USER_PROVIDED' | 'CALCULATED' | 'UNKNOWN';
}

export type FieldState = 'KNOWN' | 'UNKNOWN' | 'NOT_APPLICABLE';

export interface UsedReason extends Message, Traced {}

/** Cuánto SABEMOS de la unidad (no cuán bueno es el coche). Contrato de presentación: nivel + motivos + verificación. */
export interface UsedInformationConfidence {
  level: ConfidenceLevel;
  reasons: UsedReason[];
  requiresVerification: boolean;
  /** Mensaje resumen (nivel, campos conocidos / relevantes). */
  summary: Message;
  /** `used_instance_completeness` (0..1): completitud de información de la unidad, separada de la de la variante. */
  informationCompleteness: number;
  /** Secundario (0..1): relevancia cubierta por campos conocidos. */
  score: number;
  fields: { field: UsedInformationField; state: FieldState; relevance: number }[];
  rulesVersion: string;
}

export type VerificationCheck = 'ASKING_PRICE' | 'MILEAGE' | 'SERVICE_HISTORY' | 'BATTERY_HEALTH' | 'WARRANTY' | 'DAMAGE_REPAIR' | 'CONDITION';

export interface UsedVerificationRequirement extends Message, Traced {
  check: VerificationCheck;
}

export interface UsedWarning extends Message, Traced {}

export type UsedInstanceSubject = Extract<DecisionSubject, { kind: 'USED_INSTANCE' }>;

export interface UsedAdjustmentResult {
  subject: UsedInstanceSubject;
  instance: UsedVehicleInstanceSummary;
  economicAdjustments: UsedEconomicAdjustments;
  /** Hechos de la unidad que deciden requisitos del usuario (Deal Breakers de usados → Practical Fit). */
  practicalSignals: UsedSubjectFacts;
  ownershipSignals: OwnershipSignal[];
  informationConfidence: UsedInformationConfidence;
  verificationRequirements: UsedVerificationRequirement[];
  warnings: UsedWarning[];
  /** Toda salida visible es `messageKey + params` del espacio `used.*` (más su respaldo `text`). */
  messageContract: { namespace: 'used'; keys: string[] };
  methodologyVersion: string;
  rulesVersion: string;
  engineVersion: string;
  /** Huella determinista de (variante, instancia, fecha de evaluación, metodología). */
  adjustmentHash: string;
}
