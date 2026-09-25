# ADR-007 — Reference Variant vs Used Vehicle Instance, y Commercial vs Technical identity (Homologation)

- **Estado**: ACCEPTED
- **Fecha**: 2026-09-24
- **Decisores**: producto + data workstream
- **Relacionado**: [VSCAR_MASTER_PLAN.md v1.0](../VSCAR_MASTER_PLAN.md) §9.1, §11 · [SPEC_KEY_CATALOG.md v0.2](../data/SPEC_KEY_CATALOG.md) §2 · [Dataset Core v0.1 — FINDINGS](../data/dataset-core-v0.1/FINDINGS.md) F1, F4 (decisión D2)

## Contexto

La baseline v1.0 (v0.4) separó **Reference Vehicle** (configuración técnica de referencia) y **Used Vehicle Instance** (unidad concreta en venta). La identidad de la Reference Variant se definió por marca/modelo/generación/facelift/año/mercado/powertrain/trim.

El experimento Dataset Core v0.1 (10 variants reales) demostró que esa identidad **no basta**:
- Golf 1.5 TSI 130 Advance 2018: la misma denominación comercial aparece en EEA con **dos homologaciones** (NEDC puro vs WLTP + NEDC-correlated) y masas distintas.
- BMW X3 2018: cambio de norma y ciclo en 08/2018 (Euro 6/NEDC → Euro 6d-TEMP/NEDC-correlated), con cambios en depósito y remolque.
- SEAT León e-HYBRID: dos homologaciones en 18 meses (CO₂ 8–9 → 27–31 g/km).
- Tesla Model 3 2021: cambios de autonomía, masa y precio a mitad de año; dos "SR+" técnicamente distintos en EEA.
- Golf eTSI: se vende como MHEV pero se homologa como NOVC-HEV, lo que determina etiqueta DGT y fiscalidad.

## Decisión

1. **ReferenceVariant representa una unidad técnica comparable.** Se compone de:
   - **Commercial identity**: manufacturer, model, generation, facelift, trim, commercial name, `model_year` (tal como lo declara la fuente), market, fechas comerciales.
   - **Technical identity**: una **`Homologation`** concreta con periodo de validez (`homologation_id`).
2. Se crea la entidad **`Homologation`** con campos mínimos: `id`, `market_code`, `type_approval_number` (TAN), `variant_code` (Va), `version_code` (Ve), `valid_from`, `valid_to`, `test_cycle`, `emissions_standard` (family/level/raw), `homologation_powertrain`, `source_id`, `source_url`, e `identification_confidence`. Si no existen TAN/Va/Ve se admiten identificadores equivalentes del fabricante o del homologador.
3. **Múltiples ReferenceVariants pueden compartir denominación comercial.** Se agrupan en UX/SEO bajo una ficha comercial, pero los cálculos usan siempre una variant técnica (o el rango explícito de varias).
4. **Nunca se mezclan homologaciones por comodidad**: los valores técnicos cuelgan de la variant técnica; valores de homologaciones distintas no se combinan en una misma variant.
5. `model_year` sigue siendo **atributo comercial**, no identidad técnica suficiente.
6. `powertrain_type` (clasificación de producto: ICE, MHEV, HEV, PHEV, BEV…) se mantiene; se añade `homologation_powertrain` (ICE, NOVC_HEV, OVC_HEV, BEV, FCEV, UNKNOWN) en la homologación.
7. **UsedVehicleInstance siempre apunta a una ReferenceVariant técnica concreta.** Si el usuario no puede identificarla, se usa el grupo comercial y la comparación se marca como dependiente de la homologación (Recommendation Confidence reducida). La instancia nunca sobrescribe specs de referencia.
8. `canonicalKey` incorpora un discriminador de homologación; los VScar ID (UUID) de variants técnicas son estables.

## Alternativas consideradas

- **Mantener identidad comercial y guardar varias homologaciones como valores alternativos** dentro de una variant: rechazada; mezcla coches distintos y rompe comparaciones y reproducibilidad.
- **Identidad solo técnica** (sin agrupación comercial): rechazada; el usuario busca por nombre comercial y año, y el SEO se organiza por familia/generación.
- **Usar `model_year` + `valid_from/to` sin entidad Homologation**: insuficiente; no permite matching cross-market (D1) por TAN/Va/Ve ni explica diferencias técnicas dentro del mismo periodo.

## Consecuencias

- **Positivas**: comparaciones técnicamente correctas; matching cross-market fiable (D1); trazabilidad de cambios a mitad de año; base para fiscalidad y etiqueta DGT correctas.
- **Negativas**: más ReferenceVariants por familia; la curación debe identificar homologaciones (EEA facilita `TAN`/`Va`/`Ve`); la UX debe agrupar variants técnicas sin confundir.
- **Riesgos**: homologaciones no identificables en históricos → `identification_confidence = UNCONFIRMED` y menor confianza; mitigado con la elegibilidad por categoría.
- **Cambios derivados**: el schema conceptual de la baseline (§ Recommended database schema) se amplía con la tabla `homologations` y `reference_variants.homologation_id` al implementar Step 3; se registra aquí sin reescribir la baseline.
