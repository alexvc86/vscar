# Alpha Decision Engine v0.1 (Step 6b)

> Paquete: [`packages/decision-engine`](../../packages/decision-engine) · Metodología **2026.5** (`alpha-decision-v1`, todo `provisional`) · Motor `0.1.0` · Fecha: 2026-10-02

VScar no dice "este es el mejor coche". Produce **resultados separados**, nunca una única nota:

```text
1. Deal Breakers          (Step 6a, reutilizados)
2. Technical Capability   capacidad técnica según categorías y pesos editoriales públicos
3. Economic Fit @ H       coste de uso al horizonte del escenario (Step 5)
4. Practical Fit          estado PASS / PASS_WITH_COMPROMISES / UNCONFIRMED / FAIL + score
5. Prioridades simples    COST · SPACE · PERFORMANCE (HIGH / MEDIUM / LOW)
6. Alpha Best For You     solo entre candidatos con Practical Fit ≠ FAIL
```

"Technical Capability: A · Economic Fit: B · Best for your needs: B" es un resultado válido (test).

## 1. Alcance Alpha vs MVP

| Alpha (implementado) | MVP (no implementado, no se usa) |
|---|---|
| Technical Capability, Economic Fit @ H, Practical Fit, prioridades simples, Alpha Best For You | **Preference Fit** (marca, diseño, interior, preferencias declaradas/observadas, torneo, perfil NL) |
| | **Personal Fit** = 0,7 · Practical + 0,3 · Preference |

No existen campos `preferenceFit`, `personalFit`, `winner`, `overallScore`, `brandScore`, `designScore` (test sobre el código y el resultado). La edad, el kilometraje y el precio pedido **no** afectan a Technical Capability: la brecha generacional solo aparece por hechos objetivos (ADAS, tecnología, garantía, eco).

## 2. Frontera

- Puro, determinista, apto para navegador. Importa `vehicle-schema`, `methodology`, `quality`, `economics-engine`, `comparison-engine`, `zod`; prohibido `@vscar/db`, `@vscar/data-connectors`, `@vscar/worker`, `node:*` (ESLint `packages/*-engine/src/**` + test).
- **No recalcula** comparación ni economía: `decide()` recibe el resultado de `compareCandidates` (Step 6a) y los `EconomicResult` (Step 5); si faltan pares o deal breakers, falla (no recalcula en silencio). Test: el código no llama a `computeEconomics`, `compareVehicles`, `compareCandidates`, `compareValues` ni `breakEven`.

## 3. Contratos

| Contrato | Contenido |
|---|---|
| `DecisionInput` | `candidates` (`ComparisonCandidate` con `economic`), `comparison` (`{ dealBreakers, pairs }` de 6a), `scenario` |
| `DecisionScenario` | `comparison` (escenario práctico de 6a, con requisitos obligatorios), `horizonYears`, `desired` (requisitos deseables), `priorities` (`COST`/`SPACE`/`PERFORMANCE`) |
| `AlphaDecisionResult` | `candidates`, `technicalCapability[]`, `technicalLeader`, `economicFit`, `practicalFit[]`, `alphaBestForYou`, `topContributions[]`, `dataConfidence`, `warnings`, `priorities`, `methodologyVersion`, `decisionRulesVersion`, `engineVersion`, `scenarioHash` |

## 4. Technical Capability

- Utilidad por métrica con las curvas existentes (`UTILITY_CURVES`), **nunca min–max**: el resultado de A no depende de los demás (propiedad).
- Categorías y pesos editoriales (methodology): Efficiency 20 · Performance 15 · Range 15 · Charging 10 · Space 15 · Safety 15 · Warranty 5 · Eco 5. Utilidad de categoría = media de sus métricas.
- Solo valores usables (reglas de `quality`, conflictos excluidos). Sin utilidad: consumo/CO₂/autonomía de ciclo ≠ WLTP (las curvas son WLTP), potencia que no es de sistema, autonomía no WLTP combinada, rating NCAP no vigente.
- Categorías sin datos **no cuentan como 0**: se excluyen y se renormaliza; la cobertura (fracción del peso editorial con datos) se informa siempre. Score 0–100 siempre con `categories[]` (utilidad, peso, peso efectivo, contribución, métricas) y `warnings`.
- Rangos homologados → score como intervalo.
- Líder técnico: por pares, sobre las **categorías comunes**, con el umbral `technical_capability` (3/6/10 puntos). Motivos: métricas del 6a en las que va por delante con diferencia ≥ MEANINGFUL.

## 5. Economic Fit @ horizon

- Siempre al horizonte `scenario.horizonYears` (1, 3, 5 o N), nunca solo 5.
- Por candidato: coste de uso al horizonte (`EconomicResult`) y, aparte, la vista de propiedad (`COMPLETE` o `KNOWN_COST_VIEW`: nunca se presenta como TCO completo).
- Dirección de cada par = la del coste de uso anual en el `ComparisonResult` (se clasifica por equivalente anual, válido para cualquier horizonte); delta al horizonte vía `economicDelta` del Economics Engine.
- Líder solo si es más barato que **todos** los demás de forma comparable. Si la comparación económica es NOT_COMPARABLE (p. ej. X3 NEDC vs Golf WLTP) se muestran las dos cifras y **no hay ganador**. Si falta el coste de alguno → UNKNOWN.

## 6. Practical Fit

| Estado | Regla |
|---|---|
| `FAIL` | algún requisito obligatorio FAIL (deal breakers del 6a, sin reevaluar) |
| `UNCONFIRMED` | algún requisito obligatorio sin dato verificable (**nunca PASS**) |
| `PASS_WITH_COMPROMISES` | obligatorios OK, algún requisito deseado incumplido (p. ej. maletero deseado 550 L, tiene 510 L) |
| `PASS` | obligatorios y deseados OK |

- Los deseados se comprueban con la misma regla del 6a (`evaluateDealBreakers`); un incumplimiento es compromiso, un dato ausente va a `unknowns`.
- `UNCONFIRMED` es un cuarto estado (desviación deliberada): convertir "sin dato" en PASS o en compromiso falsearía el resultado. El candidato sigue siendo elegible, pero el resultado lo marca en `requiresVerification`.
- **El estado manda sobre el score**: un FAIL con score 92 sigue siendo FAIL y nunca es Best For You.
- Score = media ponderada de los componentes prácticos (SPACE, RANGE_FIT).
- Explicación: "fits your 5-seat requirement, but boot is 40 L below your preferred 550 L".

## 7. Prioridades simples y fórmula Alpha

Multiplicadores HIGH 3 · MEDIUM 2 · LOW 1 (por defecto MEDIUM), normalizados en la media ponderada. No son preferencias: solo cambian la relevancia de necesidades objetivas.

```text
Alpha Fit = Σ wᵢ · uᵢ / Σ wᵢ      sobre los componentes disponibles del candidato
  SPACE        u = utilidad del maletero                     w = 1 × prioridad SPACE
  RANGE_FIT    u = utilidad autonomía eléctrica (enchufables) w = 1 × relevancia de uso
  PERFORMANCE  u = media(0–100, potencia)                    w = 1 × prioridad PERFORMANCE
  COST         u = utilidad del coste de uso ANUAL (€/año)    w = 1 × prioridad COST
Practical Fit score = misma fórmula sobre {SPACE, RANGE_FIT}
```

- **Sin doble conteo**: cada variable entra una sola vez. El Practical score no se vuelve a sumar al Alpha Fit; plazas y dimensiones son requisitos (no utilidad); COST nunca entra en Technical Capability.
- Relevancia de la autonomía (cotas de `for-you-v1`): uso diario × 3 ≤ autonomía, carga en casa y ≤ 2 viajes largos/año → × 0,34; ≥ 6 viajes largos/año → × 1,5.
- COST: curva `running_cost_annual_utility`; no se calcula si el coste depende de consumos no WLTP.
- Una prioridad más alta nunca reduce la contribución de su propio componente (propiedad).

## 8. Alpha Best For You

- Elegibles: Practical Fit ≠ FAIL.
- Por pares, sobre los **componentes comunes**, con el `ComparisonResult`: una métrica NOT_COMPARABLE/UNKNOWN sale del par; una métrica **PRACTICAL_TIE iguala** la utilidad de ambos → una diferencia trivial sigue siendo trivial aunque la prioridad sea HIGH (6,8 vs 7,0 s con PERFORMANCE HIGH → PRACTICAL_TIE). Umbral `alpha_fit` 3/6/10.
- `BEST_FOR_YOU` solo si gana a todos. Si no: `PRACTICAL_TIE` o `RANGE_DEPENDENT` con `tiedIds` (no se fuerza un ganador). Sin datos comparables: `INSUFFICIENT_DATA`.
- Todos FAIL → `NO_FULL_MATCH` ("None fully meets your requirements") con `closestCandidate` **informativo** (menos requisitos incumplidos y menor déficit relativo), nunca una recomendación.

### Contribuciones (máx. 3)

Primero los deal breakers de los otros; luego las ventajas sobre el segundo elegible con Meaningful For You (o diferencia general) ≥ MEANINGFUL; si no hay ninguna, las SLIGHT; después los compromisos. Cada una con QUÉ / CUÁNTO / POR QUÉ / PARA QUIÉN y texto determinista (sin IA), p. ej. "annual running cost: Car B costs about 386.10 € less per year than Car A (18,000 km/year)".

## 9. Confianza de datos de la decisión

No es el Recommendation Confidence final (robustez, Step 6c). Combina señales existentes: `dataConfidence` de cada `ComparisonResult` (que ya incluye la confianza económica), Economic Fit UNKNOWN/NOT_COMPARABLE, cobertura técnica < 50 % y requisitos sin dato. Salida HIGH / MEDIUM / LOW con motivos.

## 10. Reproducibilidad e invariancias

- `scenarioHash` = huella FNV-1a de methodology sobre {motor, metodología, reglas, escenario, candidatos (id + hash económico), hashes de las comparaciones}.
- Mismos inputs → mismo resultado; el orden de los candidatos no cambia nada; añadir C no cambia Technical Capability, Practical Fit ni Alpha Fit de A (propiedades).

## 11. Validación con los casos reales

| Caso | Resultado |
|---|---|
| BYD SEAL vs Model 3 | Technical Capability y Economic Fit (en rango) calculados; autonomía 570 vs 448 km CLEAR; **commuter** (35 km/día, carga en casa) → PRACTICAL_TIE; **viajero** (10 viajes largos/año) → BYD por autonomía |
| León e-HYBRID | sin CS usable → Economic Fit UNKNOWN, sin componente COST; el WLTP ponderado nunca se usa |
| Golf 2018 | Efficiency NOT_AVAILABLE (excluida, no 0), cobertura < 1 |
| Golf eTSI | valores en conflicto no aparecen en ningún cálculo de la decisión |
| X3 (NEDC) vs Golf eTSI (WLTP) | dos cifras de €/año, **sin ganador económico**; sin componente COST para el X3 |

## 12. Limitaciones v0.1

- Pesos, multiplicadores, curva de coste y umbrales **provisionales** hasta calibración con usuarios.
- Componentes Alpha limitados a espacio, autonomía, prestaciones y coste de uso (sin compra, mantenimiento ni residual en el Alpha Fit).
- Sin Preference Fit, Personal Fit, robustez/sensibilidad de la decisión, "Why not" completo ni ajuste de usados (Step 6c y MVP).
- Frases en inglés y deterministas (i18n en frontend).

---

# Step 6c — Why Not · Result Robustness · Recommendation Confidence

> Metodología **2026.6** (`why-not-v1`, `robustness-v1`, `recommendation-confidence-v1`, todo `provisional`) · mismo paquete `@vscar/decision-engine` (submódulos `why-not.ts`, `robustness.ts`, `recommendation-confidence.ts`, `recommend.ts`, `pipeline.ts`, `messages.ts`) · Fecha: 2026-10-02

Step 6c **no recalcula** Economics, Comparison, Technical Capability, Economic Fit, Practical Fit ni Alpha Best For You: los consume. `recommend(input, { probe })` devuelve `AlphaRecommendationResult` = `AlphaDecisionResult` + `whyNotByCandidate`, `tradeoffsForSelected`, `requiresVerification`, `notices`, `resultRobustness`, `recommendationConfidence`, `usedInformationConfidence`.

## Mensajes deterministas e i18n

Todo texto es `{ messageKey, params, text }`. La clave y los parámetros son el contrato (p. ej. `decision.why_not.running_cost` con `amountMinMinor`, `amountMaxMinor`, `currency`, `annualKm`, `other`); `text` es solo un respaldo en inglés renderizado con `MESSAGE_TEMPLATES` (test: toda clave existe y su plantilla reproduce el texto). Sin IA.

## Why Not / tradeoffs / verificación

`WhyNotResult { candidateId, kind: WHY_NOT | TRADEOFFS | VERIFY_BEFORE_DECIDING, items[], onlyMinor }`. Cada ítem: `type` (`DEAL_BREAKER`, `PRACTICAL_COMPROMISE`, `REQUIRES_VERIFICATION`, `ECONOMIC`, `RANGE`, `CHARGING`, `SPACE`, `PERFORMANCE`, `SAFETY`, `WARRANTY`, `TECHNOLOGY`, `ECO`, `DATA_UNCERTAINTY`), `severity`, `subject` (`REFERENCE_VARIANT`; `USED_INSTANCE` reservado para Used Adjustment), `metric`, `delta` (rangos conservados), `level`, `againstId`, `provenance`, `sourceResult`.

- **No elegido** (frente al/los elegidos): máx. 5. **Elegido**: "lo que sacrificas" frente a los demás elegibles, máx. 3 — no se vende como perfecto.
- Orden determinista: BLOCKING (deal breaker) > COMPROMISE > VERIFY > MAJOR (CLEAR) > MODERATE (MEANINGFUL) > MINOR (SLIGHT) > INFO; dentro del nivel, economía primero y después orden estable por tipo/métrica/clave.
- Puerta: solo Meaningful For You (o diferencia general si no hay regla) ≥ MEANINGFUL, o requisitos. SLIGHT solo como respaldo menor (`onlyMinor`) si no hay nada más. **Nunca se rellena** hasta 5.
- Solo resultados confirmados del 6a (`BEHIND`). `UNKNOWN`, `NOT_COMPARABLE`, `RANGE_DEPENDENT` y `PRACTICAL_TIE` nunca son desventajas; `DIFFERENT` (p. ej. longitud) solo aparece en tradeoffs como dato neutro ("not better or worse in itself").
- Economía: solo si la comparación económica es comparable. Con ciclos distintos (X3 NEDC vs Golf WLTP) se dice `decision.why_not.economics_not_comparable`, nunca "más caro".
- **Verify before deciding** (`requiresVerification[]`): requisitos obligatorios sin dato (Practical Fit `UNCONFIRMED`) y deseados sin dato, p. ej. "Towing capacity is not confirmed. Verify that it reaches at least 1,500 kg". Nunca como defecto confirmado.
- `NO_FULL_MATCH`: `notices` = "None fully meets your requirements" + "Closest option (not a recommendation)".

## Result Robustness

¿Cambia el resultado con supuestos razonables? (No es calidad de datos.)

- Variables: `annual_km`, `fuel_price` (producto principal; el resto de carburantes en la misma proporción), `electricity_price`, `home_charging_share`, `horizon_years`, en los rangos plausibles de `SENSITIVITY_RANGES` (los de la sensibilidad del Economics Engine). Nunca fuera del rango → `NO_SWITCH_IN_RANGE`.
- Búsqueda determinista y acotada: 6 pasos de rejilla por lado + 12 de bisección (enteros: valor a valor) → unas 30 evaluaciones por variable, apta para navegador.
- Por variable: `currentValue`, `switchValue`, `direction` (BELOW/ABOVE), `distanceNormalized` = |cambio − actual| / (máx − mín), `status` = `VERY_SENSITIVE` (< 0,02) · `SENSITIVE` (< 0,10) · `STABLE` · `NO_SWITCH_IN_RANGE` · `NOT_APPLICABLE` · `UNKNOWN`; para Best For You y para Economic Fit por separado.
- Prioridades simples: si cambiar una prioridad un nivel cambia el resultado → al menos `SENSITIVE`.
- Global: según el punto de cambio **más cercano** (no la diferencia entre 1.º y 2.º): STABLE → HIGH, SENSITIVE → MEDIUM, VERY_SENSITIVE → LOW. `PRACTICAL_TIE` → `TIE` (LOW), `RANGE_DEPENDENT` → LOW, `NO_FULL_MATCH` → `NO_RECOMMENDATION`, sin evaluador → `UNKNOWN`.
- Re-evaluar el escenario: `createDecisionPipeline` (`pipeline.ts`) **orquesta** los engines existentes (`computeEconomics` → `compareCandidates` → `decide`); es el único módulo que los llama y no contiene lógica económica ni de comparación (test).
- Ejemplo (test): a 13.000 km/año gana A; "The result changes if annual mileage falls below 11,800 km/year" → SENSITIVE.

## Recommendation Confidence

`{ level: HIGH | MEDIUM | LOW, score (secundario), reasons: Message[] }`. Combina señales existentes; no es el Alpha Fit (un coche puede encajar mucho con confianza baja) y **no** trata derechos de publicación (la procedencia S04 sigue en `EconomicResult.provenance` para la capa de publicación).

| Señal | Penalización (provisional) |
|---|---|
| Confianza de datos de la decisión (ya integra comparación, economía, mapping, conflictos, rangos) | MEDIUM −15 · LOW −35 |
| Requisito obligatorio sin confirmar en el elegido | −20 cada uno |
| Deseos sin dato en el elegido | −5 cada uno (máx. −15) |
| Economía NOT_COMPARABLE / UNKNOWN | −10 |
| Robustez | MEDIUM −15 · LOW −30 |
| Información de la unidad usada (cuando exista; hoy `NOT_APPLICABLE`) | MEDIUM −10 · LOW −20 |

Niveles: HIGH ≥ 80, MEDIUM ≥ 55. Topes a LOW: `PRACTICAL_TIE`, `RANGE_DEPENDENT`, `NO_FULL_MATCH`, `INSUFFICIENT_DATA`, todos los elegibles `UNCONFIRMED`. Añadir un requisito crítico sin dato nunca sube la confianza (propiedad).

## Casos validados

| Caso | Resultado |
|---|---|
| A domina (más barato y más maletero) | robustez STABLE/HIGH, confianza HIGH |
| A gana a 13.000 km; cambia < 11.800 km | `annual_km` SENSITIVE, reproducible |
| BYD vs Model 3, commuter | PRACTICAL_TIE, robustez TIE, confianza LOW por el empate |
| BYD vs Model 3, 10 viajes largos/año | Why not Model 3: autonomía −122 km (CLEAR para ti) |
| Remolque ≥ 1.500 kg sin dato | UNCONFIRMED, "verify before deciding", confianza LOW |
| X3 NEDC vs Golf WLTP | ningún "más caro"; ciclos incompatibles declarados |

## Limitaciones 6c

- Búsqueda acotada: con 6 pasos de rejilla, un cambio que aparezca y desaparezca entre dos puntos puede no detectarse (determinista y documentado).
- Un único precio eléctrico de referencia: `home_charging_share` no cambia hoy el resultado (`NO_SWITCH_IN_RANGE`).
- La curva de utilidad del coste anual satura a costes altos: diferencias grandes entre coches muy caros de usar pesan menos (pendiente de calibración).
- Sin Used Adjustment: `usedInformationConfidence = NOT_APPLICABLE`; `subject = USED_INSTANCE` reservado.
