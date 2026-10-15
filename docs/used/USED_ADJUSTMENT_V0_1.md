# VScar — Used Adjustment v0.1 (Step 8a)

> Estado: **PASS** · 2026-10-14 · Paquete: `@vscar/used-adjustment` · Decisión: [ADR-016](../adr/ADR-016-used-adjustment-layer.md) · Información: [USED_INFORMATION_CONFIDENCE_V0_1](USED_INFORMATION_CONFIDENCE_V0_1.md) · Metodología **2026.7** (`used-adjustment-v1`, provisional)

```
ReferenceVariant (verdad técnica) + UsedVehicleInstance (hechos de la unidad)
        ↓  adjustUsedVehicle(reference, instance, evaluationDate)
UsedAdjustmentResult  ──▶ precio de compra efectivo ─▶ Economics
                      ──▶ sujeto USED_INSTANCE + hechos ─▶ Comparison (Deal Breakers de usados)
                      ──▶ información / señales / verificación ─▶ Decision (Why Not, verificación, Recommendation Confidence)
        ↓
mismos engines, un solo pipeline (createDecisionPipeline)
```

No hay `UsedComparisonEngine`, `UsedDecisionEngine` ni `UsedEconomicsEngine`. Sin UI (Step 8b), sin marketplace, sin scraping, sin precios de mercado, sin historial externo, sin VIN.

## 1. Contratos

| Contrato | Dónde | Qué |
|---|---|---|
| `UsedVehicleInstance` | `@vscar/vehicle-schema` (ya existía, ADR-007) | Extensión mínima: `registration_date` (edad exacta en meses), coherente con `registration_year`; `knownUsedFields` la cuenta como matriculación conocida. `observed_at` ya existía. |
| `DecisionSubject` | `@vscar/vehicle-schema` (`subject.ts`) | `REFERENCE_VARIANT` \| `USED_INSTANCE` (con `subjectId`, `referenceVariantId`, `usedInstanceId`, `usedFacts`). `subjectOf(c)`: sin sujeto explícito, el candidato es su ReferenceVariant (contrato new-only intacto). |
| `UsedNumericFact` | ídem | `KNOWN {min,max,basis USER_PROVIDED/CALCULATED}` · `UNKNOWN` · `NOT_APPLICABLE` (N/A ≠ desconocido). |
| `UsedAdjustmentResult` | `@vscar/used-adjustment` | `subject`, `instance` (resumen), `economicAdjustments`, `practicalSignals`, `ownershipSignals`, `informationConfidence`, `verificationRequirements`, `warnings`, `messageContract`, versiones y `adjustmentHash`. **Sin "used score"**. |

API pública: `adjustUsedVehicle`, `evaluateUsedInformationConfidence`, `buildUsedOwnershipSignals`, `calculateVehicleAge`, adapters (`referenceContextFromCandidate`, `toUsedComparisonCandidate`, `toUsedEconomicInput`) y el catálogo de mensajes.

### Identidad del sujeto

"Golf nuevo vs Golf usado" son **dos sujetos** sobre **una** ReferenceVariant: el candidato usado toma `id = subjectId` (id de la instancia) y conserva el MISMO objeto de `facts` de la variante. Antes de 8a, `decide()` deduplicaba por id de variante y los habría fusionado. El pipeline rechaza sujetos duplicados.

## 2. Reglas (methodology `used-adjustment-v1`, provisionales)

| Regla | Valor | Nota |
|---|---|---|
| Edad | meses completos desde `registration_date`; con solo el año → rango [31-dic, 1-ene] | nunca desde model year, año supuesto ni fechas de fuentes; `evaluationDate` explícita (nunca el reloj) |
| Km relativos a la edad | referencia ES 15.000 km/año; HIGH si **todo** el rango > ×1,5 (22.500); LOW si < ×0,5 (7.500); solo con ≥ 12 meses | la referencia es la del escenario canónico ES-2026.10, **no** una media medida del parque: calibrar antes del MVP |
| Garantía restante | declarada (USER_PROVIDED) > calculada desde `war.years`/`war.km` − edad/km (CALCULATED) > UNKNOWN | LIMITED < 12 meses; la calculada > 0 exige verificar condiciones; no cuenta como dato conocido de la unidad |
| Salud de batería | solo BEV/PHEV/EREV; LOW si < `bat.warranty_soh_pct` de la variante o, sin dato, < 70 % | se conserva como observación; **nunca** se convierte en autonomía (`derive_range_from_soh: false`) |
| Estado | `excellent/good` o ITV vigente → KNOWN_GOOD; `fair/poor` o ITV caducada → KNOWN_ISSUES; resto UNKNOWN | desconocido ≠ malo |
| No modelado | valor de mercado, depreciación, residual, mantenimiento, reparación, probabilidad de avería, degradación de autonomía | declarado en cada resultado (`notModelled`) |

**Versión**: introduce reglas nuevas que producen resultados (señales, verificación, deal breakers) → `methodologyVersion` **2026.6 → 2026.7**. Sin entrada de usado nada cambia salvo la versión y las huellas (ver §6).

## 3. Salidas

- **Económica**: `effectivePurchasePrice` = precio pedido (USER_PROVIDED). Economics ya soportaba el participante `USED` y nunca usa el precio de lista original como precio de compra: el adapter solo le pasa el precio. Sin precio (o en otra moneda) → `UNAVAILABLE` + señal + "indica el precio pedido". Economic Fit mantiene su contrato de coste de uso; la diferencia de compra aparece en la vista de costes conocidos, el break-even y el requisito de presupuesto.
- **Ownership Signals** (naturaleza, nunca puntuación): `ATTENTION` (HIGH_MILEAGE_FOR_AGE, NO_REMAINING_WARRANTY, LIMITED_WARRANTY, SERVICE_HISTORY_INCOMPLETE, BATTERY_HEALTH_LOW, ACCIDENT_DAMAGE_DECLARED, CONDITION_ISSUES_DECLARED) · `INFORMATION_GAP` (ASKING_PRICE_MISSING, MILEAGE_UNKNOWN, SERVICE_HISTORY_UNKNOWN, BATTERY_HEALTH_UNKNOWN, CONDITION_UNCONFIRMED) · `NOTE` (LOW_MILEAGE_FOR_AGE, BATTERY_HEALTH_REPORTED). Separadas de Technical Capability.
- **Verification Requirements**: precio, kilometraje, historial, batería, garantía, reparación de daños, estado/ITV.
- **Trazabilidad**: cada señal, motivo, verificación, aviso y ajuste lleva `ruleCode` estable (`USED_MILEAGE_HIGH_FOR_AGE`, …), `sourceFields` (de la instancia o `reference:war.years`…) y `messageKey + params`.

## 4. Integración (un solo camino)

`createDecisionPipeline` acepta `usedInstance` por vehículo y `evaluationDate`:

```
preparación de sujetos → Used Adjustment (una vez) → Economics → Comparison → Decision → recommend
```

| Engine | Cambio |
|---|---|
| Comparison | `ComparisonCandidate.subject?`; requisitos `maxMileageKm`, `maxAgeYears`, `minBatteryHealthPct`, `minWarrantyRemainingMonths` **solo en sujetos usados** (no aplican a un coche nuevo; batería N/A en ICE no se evalúa). Desconocido → UNKNOWN (`comparison.requirement.used_unknown`). Garantía calculada: 0 → FAIL cierto; > 0 → UNKNOWN (`calculated_unconfirmed`). La huella del par incluye el sujeto. |
| Decision | Practical Fit reutiliza la semántica: FAIL / UNCONFIRMED. Why Not: motivos de requisitos de usado con `subject: USED_INSTANCE`; señales ATTENTION/INFORMATION_GAP como `USED_OWNERSHIP` / `USED_INFORMATION` (severidad INFO). `requiresVerification` añade las comprobaciones de la unidad sin repetir requisitos pendientes. |
| Recommend | `usedInformationConfidence` = el de las unidades usadas **recomendadas** (o empatadas); alimenta Recommendation Confidence (penalización ya existente) sin sustituirla. `subjects` y `usedAdjustments` solo aparecen si hay usados. |

"Must have full service history" queda para 8b: es un requisito categórico y necesita un contrato de comprobación y textos propios (los cuatro numéricos reutilizan el existente). `no_open_recalls`, `max_owners`, `dealer_only` y `valid_inspection_required` también se aplazan (sin datos de recalls; sin UI).

## 5. i18n

Espacio `used.*` (41 claves) + `comparison.requirement.used_unknown` / `calculated_unconfirmed` + 4 criterios + unidad `months`. Esquema de params por clave (`USED_MESSAGE_PARAM_SCHEMA`); params crudos (km, meses, %, céntimos, códigos); el paquete no formatea. Catálogo web `engine.used.*` ES y EN al **100 %** (test de cobertura + render real sin fugas de idioma + respaldo `text` innecesario).

## 6. Verificación

| Test | Cubre |
|---|---|
| `used-adjustment/test` (42) | edad (fecha/año/desconocida/posterior, reloj), km relativos (2 años/90.000 → HIGH; 10 años/100.000 → nada; rango que cruza → nada), N/A, BEV/PHEV/ICE, confianza (LOW/HIGH/tope, propiedad unknown→known), señales, garantía calculada y límite de km, precio y moneda, adapters sin mutación, contrato de mensajes, sin campos de probabilidad/valor, determinismo, rendimiento |
| `decision-engine/test/used-golden.test.ts` (21) | new vs used (40.000 vs 28.000 €: diferencia **solo** del precio, técnica idéntica, break-even NO_BREAK_EVEN), used vs new (simetría), used vs used, km máximos FAIL/UNCONFIRMED, requisitos no aplican al nuevo, BEV SOH conocido/desconocido (Model 3 real), ICE batería N/A (X3 real), historial desconocido, criterio final, propiedades (precio/km/edad/estado nunca cambian la técnica) |
| `decision-engine/test/regression-8a.test.ts` (9) | **salida completa** new/new (enums, scores, mensajes, params y textos) idéntica al snapshot previo a 8a; solo se normalizan `methodologyVersion` y `scenarioHash` |
| `comparison-engine/test/used-deal-breakers.test.ts` (6) | requisitos de usado |
| methodology (+5), vehicle-schema (+3), web i18n (+3) | reglas, contrato, catálogo |

Rendimiento (`adjustUsedVehicle`, 2.000 ejecuciones locales): **p50 0,17 ms · p95 0,28 ms** (objetivo < 5 ms). JS inicial de la web sin cambios (comparación 154,0 KB).
