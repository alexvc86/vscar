/**
 * @vscar/used-adjustment — Used Adjustment Engine v0.1 (Step 8a, ADR-016).
 *   ReferenceVariant + UsedVehicleInstance → Used Adjustment → entradas ajustadas → MISMOS engines.
 * API pública mínima: el ajuste completo, sus dos vistas (información / señales), la edad y los adapters.
 */
export { adjustUsedVehicle, buildUsedOwnershipSignals, evaluateUsedInformationConfidence, USED_ADJUSTMENT_ENGINE_VERSION } from './adjust.ts';
export { calculateVehicleAge } from './age.ts';
export { referenceContextFromCandidate, toUsedComparisonCandidate, toUsedEconomicInput } from './adapters.ts';
export { USED_MESSAGE_PARAM_SCHEMA, USED_MESSAGE_TEMPLATES } from './messages.ts';
export type * from './contracts.ts';
