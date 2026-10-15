import { methodologyFingerprint } from '@vscar/methodology';
import type { UsedVehicleInstanceInput } from '@vscar/vehicle-schema';
import type { UsedFacts } from './used-params.ts';

/**
 * Step 8b — identidad y entrada de engine de una unidad usada. Módulo SEPARADO de `used-params` a propósito: solo lo
 * usa el servidor (loader) y los tests; así las islas iniciales (swap, constructor de la home) no arrastran
 * `@vscar/methodology` al JS inicial.
 */
/**
 * Identidad del sujeto usado: UUID derivado de (variant, hechos). Determinista (servidor, cliente y worker
 * coinciden) y sigue a la unidad en un intercambio A/B. `salt` desambigua dos unidades idénticas.
 */
export function usedSubjectId(variantId: string, facts: UsedFacts, salt = ''): string {
  const h1 = methodologyFingerprint({ variantId, facts, salt, part: 1 });
  const h2 = methodologyFingerprint({ variantId, facts, salt, part: 2 });
  const hex = `${h1}${h2}`;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Hechos de la UI → `UsedVehicleInstance` (contrato real del Used Adjustment). Sin inventar nada: lo que el
 * usuario no indica queda `unknown`/ausente. "Sin problemas declarados" es una AFIRMACIÓN del usuario
 * (`condition: good`, USER_PROVIDED), no una inspección independiente.
 */
export function toUsedInstance(facts: UsedFacts, variantId: string, id: string, evaluationDate: string): UsedVehicleInstanceInput {
  return {
    id,
    reference_variant_id: variantId,
    ...(facts.price !== undefined ? { asking_price_minor: facts.price * 100, currency: 'EUR' } : {}),
    ...(facts.km !== undefined ? { mileage_km: facts.km } : {}),
    ...(facts.reg ? { registration_year: facts.reg.year, ...(facts.reg.month ? { registration_month: facts.reg.month } : {}) } : {}),
    ...(facts.warranty !== undefined ? { warranty_remaining_months: facts.warranty } : {}),
    ...(facts.service ? { service_history: facts.service } : {}),
    ...(facts.state ? { condition: facts.state === 'ok' ? ('good' as const) : ('poor' as const) } : {}),
    ...(facts.soh !== undefined ? { battery_health_pct: facts.soh } : {}),
    ...(facts.damage ? { accident_history: facts.damage === 'none' ? ('none_declared' as const) : ('declared' as const) } : {}),
    observed_at: evaluationDate,
  };
}

