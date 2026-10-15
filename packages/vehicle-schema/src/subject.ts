/**
 * Decision Subject (Step 8a, ADR-016): QUÉ se compara. Un sujeto es una ReferenceVariant (coche nuevo / de
 * referencia) o una unidad usada concreta que apunta EXACTAMENTE a una ReferenceVariant. La identidad del
 * sujeto (`subjectId`) es distinta de la de la variante: "Golf nuevo vs Golf usado" son dos sujetos aunque
 * compartan `referenceVariantId`. La ReferenceVariant sigue siendo la verdad técnica; el usado solo añade
 * hechos de la instancia (edad, kilometraje, garantía restante, salud de batería…).
 */

/** Estado explícito de un hecho de la unidad. NOT_APPLICABLE ≠ UNKNOWN (p. ej. salud de batería en un ICE). */
export type UsedFactBasis = 'USER_PROVIDED' | 'CALCULATED';

export type UsedNumericFact =
  | { state: 'KNOWN'; min: number; max: number; basis: UsedFactBasis }
  | { state: 'UNKNOWN' }
  | { state: 'NOT_APPLICABLE' };

/** Hechos de la unidad que pueden decidir requisitos del usuario (Deal Breakers de usados). */
export interface UsedSubjectFacts {
  /** Meses desde la primera matriculación (rango si solo se conoce el año). */
  ageMonths: UsedNumericFact;
  mileageKm: UsedNumericFact;
  /** SOH declarado (BEV/PHEV/EREV). NOT_APPLICABLE sin batería de tracción enchufable. */
  batteryHealthPct: UsedNumericFact;
  /** Garantía restante del fabricante: declarada (USER_PROVIDED) o calculada desde la garantía original (CALCULATED). */
  warrantyRemainingMonths: UsedNumericFact;
}

export type DecisionSubject =
  | { kind: 'REFERENCE_VARIANT'; subjectId: string; referenceVariantId: string }
  | { kind: 'USED_INSTANCE'; subjectId: string; referenceVariantId: string; usedInstanceId: string; usedFacts: UsedSubjectFacts };

export type DecisionSubjectKind = DecisionSubject['kind'];

/** Sujeto de un candidato: sin sujeto explícito es su ReferenceVariant (contrato new-only intacto). */
export function subjectOf(c: { id: string; subject?: DecisionSubject }): DecisionSubject {
  return c.subject ?? { kind: 'REFERENCE_VARIANT', subjectId: c.id, referenceVariantId: c.id };
}
