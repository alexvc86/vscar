# Comparison Engine v0.1 (Step 6a)

> Paquete: [`packages/comparison-engine`](../../packages/comparison-engine) · Metodología **2026.4** (`comparison-v1` + umbrales de Meaningful Difference) · Fecha: 2026-09-30

Responde: **¿en qué es materialmente mejor, peor o equivalente cada coche para este escenario?**
No responde "¿cuál es el mejor para ti?" (Step 6b). No existe `winner`, `overallScore`, `recommendedVehicle` ni `personalFit`: un test lo verifica.

## 1. Frontera

```text
bundle ─ comparisonCandidateFromBundle (reglas de @vscar/quality) ─┐
EconomicResult (Step 5, ya calculado) ─────────────────────────────┼─► compareVehicles(A, B, scenario) ─► ComparisonResult
ComparisonScenario (contexto práctico del usuario) ────────────────┘   compareCandidates([...])       ─► todas las parejas
```

- Puro, determinista, apto para navegador. Importa `vehicle-schema`, `methodology`, `quality`, `economics-engine`, `zod`. ESLint y un test prohíben `@vscar/db`, `@vscar/data-connectors`, `@vscar/worker` y `node:*`.
- **No recalcula economía**: consume `EconomicResult`; deltas vía `economicDelta` y break-even vía `breakEven` del Economics Engine (test: el código no llama a `computeEconomics`).

## 2. Contratos

| Contrato | Contenido |
|---|---|
| `ComparisonCandidate` | `id`, `label`, `powertrainType`, `seats`, `facts` (por SpecKey, valores **usables** ordenados — puede haber varios con bases distintas), `safetyRatings`, `eligibility` (por categoría, de `quality`), `exclusions` (lo descartado y por qué), `economic?` (`EconomicResult`) |
| `ComparisonScenario` | contexto práctico: `annualKm`, `cityShare`, `dailyDistanceKm`, `longTripsPerYear`, `homeChargingAvailable`, `homeChargingShare`, `passengers`, `requirements` (`minSeats`, `minBootL`, `minTowingKg`, `maxLengthMm`, `maxWidthMm`, `maxHeightMm`, `minElectricRangeKm`, `maxPurchasePriceEur`). **Sin** preferencias de marca, diseño, tecnología o deportividad (6b) |
| `ComparisonResult` | `candidateAId`, `candidateBId`, `dealBreakersA/B`, `technicalComparisons[]`, `economicComparison`, `categorySummaries[]`, `dataConfidence`, `warnings`, `methodologyVersion`, `comparisonRulesVersion`, `scenarioHash` |

`comparisonCandidateFromBundle(bundle, variantId, { at, economic, label })` aplica las mismas reglas que la elegibilidad y el Economics Engine: usable por engines, válido en la fecha, sin BLOCK de plausibilidad, **sin conflicto pendiente** (lo excluido queda en `exclusions` → `warnings`).

## 3. Deal Breakers (primero)

`DealBreakerResult { status, checks[], failedChecks[], unknownChecks[] }`; cada check: `criterion`, `requiredValue`, `observedValue`, `status`, `reason`, `provenance`.

- `PASS` / `FAIL` / `UNKNOWN`. **UNKNOWN nunca es PASS**: sin dato → UNKNOWN; un rango homologado que cruza el límite → UNKNOWN ("depende de la configuración").
- Estado global: FAIL si falla alguno, UNKNOWN si alguno es desconocido, PASS si todos pasan.
- Ninguna ventaja técnica o económica revierte un FAIL (la comparación se hace, pero el FAIL queda).
- Autonomía eléctrica mínima en un ICE/HEV → FAIL (no es enchufable). Precio máximo → precio de compra del `EconomicResult`.

## 4. Resultados por métrica

`MetricComparison`: `outcome`, `meaningful` (diferencia general), `meaningfulForYou` (relevancia para el escenario), `a`/`b` (valor, ciclo, base, procedencia), `delta` (**a − b**), `percentDifference` (económicas), `reason`, `warnings`, `explanation`.

| `outcome` (visto desde A) | Significado |
|---|---|
| `AHEAD` / `BEHIND` | dirección cierta (según `higherIsBetter`) y diferencia ≥ SLIGHT |
| `PRACTICAL_TIE` | diferencia por debajo del umbral de empate de methodology (o valores idénticos) |
| `RANGE_DEPENDENT` | con los rangos homologados la dirección o la magnitud dependen de la configuración |
| `DIFFERENT` | diferencia real **sin** dirección de mejora: longitud/anchura/altura, etiqueta DGT, equipamiento ("A tiene / B no"). Se describe, no se valora |
| `NOT_COMPARABLE` | ciclo, base de medida, tipo de autonomía, ventana de carga o protocolo NCAP distintos |
| `UNKNOWN` | falta el dato en A o en B. **UNKNOWN ≠ TIE** |

Tres capas, nunca mezcladas: **raw difference** (`delta`), **meaningful difference** (umbral de `@vscar/methodology`, sin duplicar valores) y **meaningful for you** (`meaningfulForYou` con las reglas `for-you-v1` de methodology).

## 5. Métricas por categoría

| Categoría | Métricas | Notas |
|---|---|---|
| Performance | potencia, 0–100 | `power_basis` distinto (SYSTEM vs ICE_ONLY) → NOT_COMPARABLE |
| Range | autonomía eléctrica, autonomía total PHEV | ciclo y `range_type` deben coincidir. Autonomía ICE/HEV: no hay capa calculada en v0.1 → no se compara |
| Charging | AC máx., DC pico, tiempo DC | tiempo DC solo con la misma ventana SoC (10→80 ≠ 30→80); si un coche tiene varias ventanas se usa el par comparable |
| Size | longitud, anchura, altura, maletero, giro | dimensiones: `DIFFERENT` (más grande ≠ mejor) |
| Practicality | plazas, maletero abatido, remolque, carga útil, ISOFIX, tercera fila | sin score único |
| Safety | NCAP (estrellas y %) | solo misma autoridad y mismo protocolo; si no, NOT_COMPARABLE con descripción; `EXPIRED` siempre visible |
| Warranty | años, km, garantía de batería | |
| Eco | CO₂ (ciclo), etiqueta DGT | la etiqueta DGT es clasificación regulatoria, no escala numérica → descriptiva |
| Technology | CarPlay, Android Auto, AEB, ACC, carril, ángulo muerto, OTA, pantalla | descriptivo (A tiene / B no); sin preferencia |
| Economy | consumos técnicos + comparación económica | ver §7 |

Métricas sin umbral en methodology (p. ej. pantalla) solo se describen (igual/distinto); nunca se inventa un "empate práctico".

## 6. Rangos y compatibilidad

- Se comparan **intervalos** (`methodology.compareIntervals`, extraída de `compareValues` sin cambio de comportamiento). Nunca punto medio.
- Ejemplo: 5,0–5,8 vs 5,4 L/100 km → RANGE_DEPENDENT; 5,0–5,4 vs 5,2 → PRACTICAL_TIE (|Δ| ≤ 0,2 < 0,3).
- Ciclos distintos (NEDC vs WLTP), bases bloqueantes distintas o `UNSPECIFIED` → NOT_COMPARABLE (reglas de methodology).

## 7. Comparación económica (`EconomicComparison`)

- Métricas: €/100 km, coste de uso anual, a 3 y a 5 años, y coste de propiedad (solo entre vistas con los mismos componentes; una vista de costes conocidos se etiqueta "not a TCO").
- `delta` = a − b del Economics Engine (céntimos); `percentDifference` = cotas exactas de (a − b)/b.
- Clasificación: coste anual con `running_cost_annual_eur` (nuevo, provisional); acumulados a N años por su **equivalente anual** (Δ/N) para no inflar la relevancia con el horizonte; €/100 km por su equivalente anual con los km del escenario; propiedad con `price_eur`.
- `UNKNOWN` si falta el `EconomicResult` o el coste de uso de alguno (nunca "empate económico"). `NOT_COMPARABLE` si los resultados se calcularon con otro escenario (km, horizonte, metodología) **o** si los consumos usados son de ciclos distintos (p. ej. X3 NEDC vs Golf WLTP): valores y deltas visibles, sin dirección.
- Break-even: el del Economics Engine (`BREAK_EVEN` / `BREAK_EVEN_UNCERTAIN` / `NO_BREAK_EVEN` / `NO_PREMIUM`), con `premium` = el más caro de comprar.

Golden: 6,1 vs 4,8 L/100 km, 18.000 km, 1,65 €/L → B más barato 386,10 €/año · 1.158,30 € a 3 años · 1.930,50 € a 5 años; en sentido inverso, deltas con el signo cambiado.

## 8. Meaningful For You (contexto práctico)

`meaningfulForYou(specKey, clase, perfil)` de methodology (`for-you-v1`), con un perfil **solo práctico** (km/año, km/día, viajes largos, carga en casa, pasajeros). Se aplica a autonomía, maletero, prestaciones y consumo. Ejemplo: +122 km de autonomía (CLEAR) → SLIGHT para 35 km/día con carga en casa y pocos viajes largos; CLEAR con viajes largos frecuentes. Las prioridades de preferencia (p. ej. prestaciones "alta") no se usan en 6a.

## 9. Resumen por categoría

`CategorySummary { category, status, advantage, meaningfulLevel, meaningfulForYouLevel, reasons[], unknowns[] }`

- `status`: la peor elegibilidad de A y B (Safety/Technology: por cobertura de datos). `NOT_AVAILABLE` → `advantage = UNKNOWN` con los motivos (nunca un empate).
- `advantage` por **unanimidad** de métricas direccionales, sin pesos ni puntuación: `A` · `B` · `MIXED` · `PRACTICAL_TIE` · `RANGE_DEPENDENT` · `DESCRIPTIVE_ONLY` · `NOT_COMPARABLE` · `UNKNOWN`.
- `reasons`: frases deterministas de las métricas (sin IA). Solo se genera una frase cuando puede afirmarse.

## 10. Confianza de datos

Combina señales existentes (methodology `comparison-v1`), no una escala nueva: > 50 % de categorías NOT_AVAILABLE → LOW; alguna PARTIAL, datos a nivel motorización/generación, valores excluidos por conflicto o > 34 % de métricas RANGE_DEPENDENT → como máximo MEDIUM; y nunca por encima de la confianza económica de A y B. Siempre con motivos.

## 11. Simetría, orden y reproducibilidad

- `compareVehicles(B, A)` es el inverso exacto: AHEAD↔BEHIND, `delta` cambia de signo, TIE/UNKNOWN/NOT_COMPARABLE/DIFFERENT/RANGE_DEPENDENT se mantienen, `advantage` A↔B (tests de propiedad).
- Si hay varios valores por clave se elige el par comparable de menor rango combinado, con desempate por ids ordenados → simétrico.
- `compareCandidates` ordena por id: el orden de entrada no cambia nada y añadir C no altera A vs B (propiedad). No hay ranking global.
- `scenarioHash` = huella FNV-1a de methodology sobre {versión, reglas, escenario, hechos de ambos candidatos (ordenados por id), elegibilidad, `scenarioHash` económicos}; igual para (A,B) y (B,A).

## 12. Validación con los casos reales

| Caso | Resultado |
|---|---|
| Golf 2018 | Economy no disponible → comparación económica UNKNOWN, nunca empate |
| BMW X3 2018 vs Golf eTSI | consumo NEDC 5,0–5,4 vs WLTP 5,2 → NOT_COMPARABLE; costes visibles sin dirección |
| BYD SEAL vs Model 3 2021 | autonomía 570 vs 448 km: CLEAR (SLIGHT para el commuter con carga en casa); coste de uso comparado en rango sin exigir datos de carga |
| León e-HYBRID | sin CS usable → economía UNKNOWN; el ponderado WLTP nunca rellena |
| Golf eTSI | valores en conflicto (IDAE vs VW) excluidos; confianza no HIGH |

## 13. Limitaciones v0.1

- Umbrales nuevos marcados `provisional` en methodology 2026.4 (coste de uso anual, plazas, capacidades, garantías, NCAP): pendientes de calibración.
- Sin autonomía ICE/HEV calculada; sin reparto ciudad/carretera; sin conversión entre ciclos (NEDC ↔ WLTP) — no hay metodología publicada.
- Tecnología y equipamiento solo descriptivos; sin pesos de preferencia (Step 6b).
- Frases en inglés y deterministas (i18n en frontend).
