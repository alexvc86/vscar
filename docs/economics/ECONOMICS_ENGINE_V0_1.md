# Economics Engine v0.1

> Step 5 · Paquete: [`packages/economics-engine`](../../packages/economics-engine) · Metodología: **2026.3** (`economics-v1`, redondeo `money-v1`) · Fecha: 2026-09-25

Responde, para **un** vehículo y el escenario del usuario: cuánto cuesta usarlo (por 100 km, al año, a 1/3/5/N años), qué parte depende de los km, qué cambia si sube la energía y, cuando hay datos, cuánto cuesta tenerlo. No es una hoja financiera: sin dato no hay número.

## 1. Frontera

```text
vehicle facts ─ economicVehicleInputFromBundle (reglas de @vscar/quality) ─┐
EnergyContext (market-context: hechos observados) ─────────────────────────┼─► computeEconomics ─► EconomicResult
EconomicScenario (usuario: km, horizonte, overrides, supuestos) ───────────┤
VehicleEconomicOverrides (usuario: precio pagado, mantenimiento, residual) ─┘
```

- Puro y determinista: sin I/O, sin fuentes (MITECO/ESIOS), sin base de datos. Puede importar `vehicle-schema`, `methodology`, `market-context`, `quality`, `zod`; ESLint y un test prohíben `@vscar/db`, `@vscar/data-connectors`, `@vscar/worker` y `node:*`.
- El resultado de A **no depende** de qué otros vehículos se comparen (test de propiedad).
- Economics no conoce zonas fiscales ni tarifarias, DST ni la matriz de derechos: consume `EnergyContext` ya resuelto.

## 2. Contratos

| Contrato | Contenido |
|---|---|
| `EconomicVehicleInput` | `id`, `powertrainType`, `fuelType`, `fuelConsumptionL100` (ICE/MHEV/HEV), `chargeSustainingL100` (PHEV), `electricConsumptionKwh100` + `charging_loss_basis`, `purchase` (`participant` NEW/USED, `listPrice`, `usedAskingPrice`), `maintenanceAnnualEstimate?`, `residualEstimates[]`, `exclusions[]`. Consumos como intervalo (`min = max` si es un punto) con ciclo, mapping y fuente |
| `EconomicScenario` | `annualKm`, `horizonYears`, `cityShare?` (registrado, no aplicado en v0.1), `energy` (= `EnergyScenario`: overrides de precio, `homeChargingShare`), `chargingEfficiency?`, `phevElectricShare?` |
| `VehicleEconomicOverrides` | `purchasePriceOverride`, `maintenanceAnnualOverride`, `residualOverrides[{years}]`, `phevElectricShare` — datos del usuario sobre **una** unidad |
| `EconomicResult` | `vehicleId`, `methodologyVersion`, `economicsRulesVersion`, `roundingPolicy`, `scenarioHash`, `energy`, `runningCost`, `ownershipCost`, `breakdown[]`, `confidence`, `warnings[]`, `assumptions[]`, `provenance` |

`economicVehicleInputFromBundle(bundle, variantId, { at, participant, usedInstance })` construye la entrada con las **mismas reglas que la elegibilidad**: solo valores usables por engines (`engineUsability`), válidos en la fecha, sin BLOCK de plausibilidad y sin conflicto pendiente. Lo descartado queda en `exclusions` → warnings. La unidad usada solo aporta el precio pedido: nunca sustituye specs técnicas.

## 3. Fórmulas

| Tren motriz | €/100 km | Notas |
|---|---|---|
| ICE / MHEV / HEV | `L/100 km × €/L` | producto por `fuelType` (methodology: petrol → Gasolina 95 E5, diesel → Gasóleo A, lpg → GLP) |
| BEV | `kWh/100 km de red × €/kWh` | la autonomía no se necesita |
| PHEV | `s × coste_eléctrico + (1 − s) × CS L/100 km × €/L` | `s` = fracción de km eléctricos (escenario) |

- Anual = `annual_km / 100 × €/100 km`; N años = `N × anual` (sin inflación en v0.1).
- Litros y kWh por año se informan (`litresPerYear`, `kwhPerYear`).

**Eficiencia de carga** (methodology `charging_efficiency.default = 0.9`, **ESTIMATED**, nunca dato del coche; el usuario puede fijarla):

| `charging_loss_basis` del consumo | kWh de red |
|---|---|
| `EXCLUDED` | consumo ÷ eficiencia |
| `INCLUDED` | consumo (las pérdidas ya están dentro; dividir otra vez las contaría dos veces) |
| `UNSPECIFIED` | **rango** [consumo, consumo ÷ eficiencia] + `CHARGING_LOSS_BASIS_UNSPECIFIED` |

Todos los consumos eléctricos curados hoy son `UNSPECIFIED` → sus costes salen como rango.

**Regla PHEV** (obligatoria):
- El consumo ponderado WLTP (`nrg.phev_weighted_fuel_l100`) **nunca** se usa para coste (`PHEV_WEIGHTED_CONSUMPTION_IGNORED`).
- Sin consumo charge-sustaining usable → coste PHEV **UNAVAILABLE** (`PHEV_CS_UNAVAILABLE`), salvo `s = 1` (solo eléctrico).
- Sin `phevElectricShare` → UNAVAILABLE (`PHEV_ELECTRIC_SHARE_REQUIRED`): la fracción no se deduce del WLTP.

**Carga en casa**: `homeChargingShare` se registra como supuesto del usuario, pero v0.1 tiene un único precio eléctrico de referencia → no cambia el coste (`HOME_CHARGING_SHARE_NOT_APPLIED`). Precios doméstico / público: Later.

## 4. Precios de energía

Precedencia (market-context `effectiveEnergyInputs`): **override del usuario > referencia de mercado > fallback metodológico > UNAVAILABLE**. El fallback está vacío en 2026.3: sin dato no se inventa un precio.

| Origen | Base de la línea |
|---|---|
| `USER_OVERRIDE` | `USER_PROVIDED` |
| `MARKET_REFERENCE` | `KNOWN` (con fecha, frescura, fuente, observación) |
| `METHODOLOGY_FALLBACK` | `ESTIMATED` |

La electricidad de referencia es el **término de energía del PVPC** (media diaria): excluye IEE, IVA y término de potencia → `ELECTRICITY_REFERENCE_EXCLUDES_TAX` y se presenta como *reference electricity price*, nunca como la tarifa del usuario.

## 5. Coste de uso y coste de propiedad

| Vista | Incluye | Si falta algo |
|---|---|---|
| **Running Cost** | energía (+ costes recurrentes conocidos; en v0.1, solo energía) | sin consumo o sin precio → UNAVAILABLE (nunca 0) |
| **Ownership Cost** (por horizonte) | compra + uso × N + mantenimiento × N − residual(N) | falta compra → UNAVAILABLE; falta mantenimiento o residual → `KNOWN_COST_VIEW` con `missing[]` (no es un TCO); todo presente → `COMPLETE` |

- Compra: `purchasePriceOverride` > precio pedido (unidad usada) > precio de lista (nuevo). Un usado sin precio pedido no usa el precio de lista original.
- Mantenimiento: override del usuario (`USER_PROVIDED`) o estimación con fuente (`ESTIMATED`); la metodología no define valores por segmento → sin dato, no disponible.
- Residual: solo como dato opcional por horizonte (`ESTIMATED` / `USER_PROVIDED`); sin modelo de depreciación en v0.1.
- Seguro, impuestos de circulación, parking, financiación: no incluidos.

Cada línea de `breakdown` declara `basis`: `KNOWN` · `USER_PROVIDED` · `ESTIMATED` (la más débil de sus entradas).

## 6. Rangos

Un consumo homologado en rango (p. ej. X3 2018: 5,0–5,4 L/100 km) produce `{min, max}` en €/100 km, anual y en todos los horizontes. Nunca se usa el punto medio. Aritmética de intervalos: suma `[a+c, b+d]`, resta `[a−d, b−c]`.

## 7. Dinero y redondeo (`money-v1`)

- Importes en **unidades menores enteras** (céntimos, EUR).
- Se calcula sin redondear; cada importe **anual por componente** se redondea una vez, HALF_UP alejándose de cero (con normalización a 12 cifras significativas contra errores binarios: 1,005 € → 101 cts); los acumulados son sumas enteras.
- Tasas (€/100 km) y cantidades (L, kWh) no son importes: 4 y 3 decimales.

Caso de referencia (golden): 6,1 vs 4,8 L/100 km, 18.000 km, 1,65 €/L → 1.098 vs 864 L (234 L/año); ahorro 386,10 €/año, 1.158,30 € a 3 años, 1.930,50 € a 5 años — tolerancia 0 céntimos.

## 8. Break-even y deltas

- `economicDelta(a, b)`: a − b en uso anual, por horizonte, en compra y en propiedad (solo entre vistas con los mismos componentes). `delta(a, b) = −delta(b, a)` (test de propiedad).
- `breakEven(premium, baseline)`: `años = sobreprecio / ahorro anual`.
  - `BREAK_EVEN` (rango de años) · `BREAK_EVEN_UNCERTAIN` (el ahorro puede ser ≤ 0 dentro del rango: solo cota inferior) · `NO_BREAK_EVEN` (ahorro ≤ 0: sin número forzado) · `NO_PREMIUM` (no es más caro de comprar) · `UNAVAILABLE`.

## 9. Sensibilidad

Determinista, una variable cada vez (sin Monte Carlo): `annual_km`, `fuel_price`, `electricity_price`, `home_charging_share`, `horizon` en los extremos de `SENSITIVITY_RANGES` del mercado; `purchase_price` ±10 %, `maintenance` ±25 %, `residual` ±20 % (methodology `economics-v1`). Cada entrada informa uso anual, uso al horizonte y propiedad al horizonte, y `effect: CHANGES | NO_EFFECT` (p. ej. carga en casa con un único precio → `NO_EFFECT`).

## 10. Confianza

`confidence = { level: HIGH | MEDIUM | LOW, score, reasons }` — cuánto depende el resultado de rangos, supuestos y huecos; **no es certeza financiera**. Penalizaciones (methodology): consumo en rango, ciclo no WLTP o no declarado, mapping a nivel motorización/generación, pérdidas de carga sin especificar, precio de fallback, dato de mercado RECENT/STALE, fracción eléctrica PHEV supuesta, sin precio de compra, mantenimiento estimado o ausente, residual estimado o ausente. Sin coste de uso → LOW.

## 11. Warnings

`ENERGY_PRICE_UNAVAILABLE` · `CONSUMPTION_UNAVAILABLE` · `CONSUMPTION_RANGE` · `CYCLE_NOT_WLTP` · `CYCLE_UNDECLARED` · `PHEV_CS_UNAVAILABLE` · `PHEV_ELECTRIC_SHARE_REQUIRED` · `PHEV_WEIGHTED_CONSUMPTION_IGNORED` · `CHARGING_LOSS_BASIS_UNSPECIFIED` · `CHARGING_EFFICIENCY_ESTIMATED` · `ELECTRICITY_REFERENCE_EXCLUDES_TAX` · `HOME_CHARGING_SHARE_NOT_APPLIED` · `CITY_SHARE_NOT_APPLIED` · `STALE_MARKET_DATA` · `RECENT_MARKET_DATA` · `ENERGY_PRICE_ESTIMATED` · `FUEL_TYPE_UNSUPPORTED` · `POWERTRAIN_NOT_SUPPORTED` · `VALUE_EXCLUDED` · `PURCHASE_PRICE_NOT_AVAILABLE` · `PRICE_TAXES_UNKNOWN` · `MAINTENANCE_ESTIMATED` · `MAINTENANCE_NOT_AVAILABLE` · `RESIDUAL_NOT_AVAILABLE` · `RESIDUAL_ABOVE_PURCHASE_PRICE`.

## 12. Reproducibilidad y procedencia

- `scenarioHash` = huella FNV-1a de methodology sobre JSON canónico de {versión de metodología, reglas, entrada del vehículo, precios de energía usados (valor, origen, observación), escenario, overrides}. Misma entrada → mismo hash y mismo resultado (test de propiedad). Otra observación de mercado (aunque tenga el mismo precio) es otra procedencia → otro hash.
- `provenance.energyPrices[]`: producto, valor, origen, fecha de observación, frescura, `source_id`, `observation_id`, base de precio e impuestos.
- `provenance.sources[]`: todas las fuentes que intervienen (energía, consumos, precio). **Gate de publicación**: Economics no conoce la DATA_RIGHTS_MATRIX; la capa de publicación decide con `source_id`. Hoy S04 (ESIOS) → `publication_allowed = false` hasta resolver derechos (uso interno/desarrollo: sí).

## 13. Validación con los seis casos reales

| Caso | Resultado |
|---|---|
| Golf 2018 | sin consumo publicable → Economy UNAVAILABLE |
| BMW X3 2018 | 5,0–5,4 NEDC → 9,87–10,66 €/100 km, rango en todos los horizontes; `CYCLE_NOT_WLTP`; usado con precio pedido |
| BYD SEAL | BEV 16,6 kWh/100 km × PVPC → 3,22–3,58 €/100 km (pérdidas sin especificar); precio de lista `incl_taxes` UNKNOWN |
| SEAT León e-HYBRID | CS de DE no usable → sin coste PHEV automático (ni con fracción eléctrica); ponderado ignorado |
| Tesla Model 3 2021 | datos de carga incompletos no bloquean: 2,76–3,07 €/100 km; precio vigente por fecha |
| Golf eTSI | 5,2 L/100 km → 10,27 €/100 km; ningún valor en conflicto (IDAE vs VW) se usa automáticamente |

## 14. Limitaciones v0.1

- Consumo combinado (sin reparto ciudad/carretera), sin inflación ni descuento (VPN), sin precio doméstico/público de carga.
- Sin modelo de mantenimiento ni de depreciación: solo datos introducidos o estimaciones con fuente.
- Sin seguro, impuestos de circulación, parking ni financiación.
- Electricidad = referencia PVPC (sin impuestos ni potencia); publicación bloqueada por derechos S04.
