import type { EconomicVehicleInputIn } from '@vscar/economics-engine';
import type { DecisionSubject, PowertrainType, SpecValue } from '@vscar/vehicle-schema';
import type { ReferenceContext, UsedAdjustmentResult } from './contracts.ts';

/**
 * Adapters (Step 8a): convierten el resultado del ajuste en ENTRADAS de los engines existentes. No calculan
 * nada económico ni técnico: Economics recibe el precio pedido como precio de compra (participante USED) y la
 * comparación recibe el sujeto con su identidad propia. Nunca mutan sus argumentos.
 */

/** Contexto de la ReferenceVariant desde un candidato (hechos ya filtrados por quality: usables, sin conflicto). */
export function referenceContextFromCandidate(c: { id: string; powertrainType: PowertrainType; market?: 'ES'; facts: Readonly<Record<string, readonly SpecValue[]>> }): ReferenceContext {
  const num = (key: string) => {
    const v = c.facts[key]?.[0];
    return v && typeof v.value === 'number' ? { value: v.value, id: v.id } : undefined;
  };
  const years = num('war.years');
  const km = num('war.km');
  const soh = num('bat.warranty_soh_pct');
  return {
    referenceVariantId: c.id,
    powertrainType: c.powertrainType,
    market: c.market ?? 'ES',
    ...(years || km ? { originalWarranty: { ...(years ? { years: years.value } : {}), ...(km ? { km: km.value } : {}), valueIds: [years?.id, km?.id].filter((x): x is string => !!x) } } : {}),
    ...(soh ? { batteryWarrantedMinSohPct: { pct: soh.value, valueId: soh.id } } : {}),
  };
}

/** Candidato de comparación del sujeto usado: misma ReferenceVariant (facts intactos), identidad y hechos de la unidad. */
export function toUsedComparisonCandidate<C extends { id: string; subject?: DecisionSubject }>(candidate: C, adjustment: UsedAdjustmentResult): C {
  if (candidate.id !== adjustment.subject.referenceVariantId) throw new Error(`candidate ${candidate.id} is not the reference variant ${adjustment.subject.referenceVariantId} of used instance ${adjustment.subject.usedInstanceId}`);
  return { ...candidate, id: adjustment.subject.subjectId, subject: adjustment.subject };
}

/**
 * Entrada económica del sujeto usado: participante USED + precio pedido (USER_PROVIDED) como override del
 * precio de compra. El precio de lista solo se conserva si la entrada ya describía una compra de usado (precio
 * de lista ORIGINAL, informativo): el precio vigente de un coche nuevo no es el de esta unidad.
 */
export function toUsedEconomicInput(input: EconomicVehicleInputIn, adjustment: UsedAdjustmentResult): EconomicVehicleInputIn {
  const p = adjustment.economicAdjustments.purchase;
  const keepList = input.purchase.participant === 'USED' && input.purchase.listPrice;
  return {
    ...input,
    id: adjustment.subject.subjectId,
    purchase: {
      participant: 'USED',
      ...(keepList ? { listPrice: input.purchase.listPrice } : {}),
      ...(p.status === 'AVAILABLE' ? { usedAskingPrice: { amount_minor: p.effectivePurchasePrice.amount_minor, currency: 'EUR', status: 'USER_PROVIDED', label: 'used asking price' } } : {}),
    },
  };
}
