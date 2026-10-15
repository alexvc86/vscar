# ADR-016 — Used Adjustment Layer: ReferenceVariant + UsedVehicleInstance → engines compartidos

- **Estado**: ACCEPTED (2026-10-14)
- **Decisores**: producto + engines + metodología
- **Relacionado**: [ADR-007](ADR-007-used-vehicle-instance.md) (instancia usada efímera) · [USED_ADJUSTMENT_V0_1](../used/USED_ADJUSTMENT_V0_1.md) · [USED_INFORMATION_CONFIDENCE_V0_1](../used/USED_INFORMATION_CONFIDENCE_V0_1.md) · Plan §9.1, §13.9, §17.3

## Contexto

VScar compara coches nuevos y usados con el mismo motor de decisión. Una unidad usada añade hechos (edad, km, precio pedido, garantía, SOH, historial, estado) a una ReferenceVariant, pero no cambia su técnica. Hasta Step 7 todo candidato era su variante: `decide()` deduplicaba por id de variante, así que "nuevo vs usado del mismo modelo" era imposible.

## Decisión

1. **Una capa pura, no engines paralelos.** `@vscar/used-adjustment` produce entradas ajustadas y señales; Economics, Comparison y Decision no se duplican. No existen `UsedComparisonEngine`, `UsedDecisionEngine` ni `UsedEconomicsEngine`.
2. **Sujeto ≠ variante.** `DecisionSubject = REFERENCE_VARIANT | USED_INSTANCE` (en `@vscar/vehicle-schema`). El sujeto usado tiene `subjectId` propio y apunta exactamente a una `referenceVariantId`; reutiliza el mismo objeto de hechos de la variante. Sin sujeto explícito, el candidato es su variante (contrato new-only intacto).
3. **Un solo camino de orquestación.** `createDecisionPipeline` hace la preparación de sujetos → ajuste (una vez) → Economics → Comparison → Decision. Un test de arquitectura impide ejecutar el ajuste fuera del pipeline.
4. **La técnica no se toca.** Edad, km y precio nunca cambian specs ni Technical Capability (test de propiedades). El SOH es una observación, nunca autonomía.
5. **Precio por adapter, no por cálculo nuevo.** El precio pedido entra como precio de compra de un participante `USED` (contrato ya existente en Economics).
6. **Información ≠ señales ≠ fiabilidad.** Used Information Confidence (cuánto sabemos) y Ownership Signals (hechos observables, con naturaleza ATTENTION / INFORMATION_GAP / NOTE) se separan; no hay puntuación de usado, probabilidad de avería, valor de mercado, depreciación ni coste de reparación.
7. **Requisitos de usado reutilizan Deal Breakers.** Solo se evalúan en sujetos usados; desconocido → UNKNOWN → Practical Fit UNCONFIRMED.
8. **Determinismo.** `evaluationDate` explícita; ningún engine lee el reloj.
9. **Umbrales en metodología versionada** (`used-adjustment-v1`, provisional) → `methodologyVersion` 2026.7.

## Alternativas descartadas

- **Engines de usados paralelos**: duplicarían lógica y divergirían. Rechazada.
- **Mutar la ReferenceVariant** (p. ej. autonomía × SOH, specs "envejecidas"): inventa datos. Rechazada.
- **"Used score" 0–100**: caja negra. Rechazada.
- **Inferir la edad del model year**: sin regla documentada. Rechazada; el año supuesto se conserva pero no se usa.
- **Mantener 2026.6**: las reglas nuevas producen resultados. Rechazada.

## Consecuencias

- **Positivas**: new/new, new/used, used/new y used/used con la misma lógica y simetría; new/new idéntico (regresión completa); Step 8b solo necesita UI e inputs.
- **Negativas**: la referencia de km/año es provisional (escenario canónico, no media medida). Economic Fit sigue basándose en el coste de uso: la ventaja de compra de un usado aparece en la vista de costes conocidos, el break-even y el presupuesto, no en el ganador económico.
- **Pendiente**: requisito categórico de historial completo, recalls, propietarios, vendedor e ITV como requisitos (8b+). La persistencia de instancias llega con el MVP.
