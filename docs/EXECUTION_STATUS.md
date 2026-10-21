# VScar — Execution Status

> Seguimiento de ejecución sobre la baseline [VSCAR_MASTER_PLAN.md v1.0](VSCAR_MASTER_PLAN.md). La baseline no se reescribe; el avance se registra aquí.

## STEP 1 — FOUNDATION DOCUMENTS · ✅ COMPLETADO (2026-09-24)

| Entregable | Estado |
|---|---|
| [SPEC_KEY_CATALOG v0.1](data/SPEC_KEY_CATALOG.md) | ✅ READY FOR DATASET CORE VALIDATION (no final) |
| [DATA_RIGHTS_MATRIX v0.1](data/DATA_RIGHTS_MATRIX.md) | ✅ DRAFT v0.1 (pendiente de verificación de términos/jurídica) |
| [ADR governance/backlog](adr/README.md) | ✅ READY |

**STATUS: READY FOR DATASET CORE**

## STEP 2 — VScar Dataset Core v0.1 · ✅ SCHEMA VALIDATION COMPLETE — CURATION REVIEW PENDING

| Entregable | Estado |
|---|---|
| [Selección de 10 Reference Variants](data/dataset-core-v0.1/README.md) | ✅ (DC-10 ajustado a PHEV) |
| Recopilación de datos reales con procedencia (DC-01 … DC-10) | ✅ borradores de curación (sin revisión humana, no publicables) |
| [FINDINGS](data/dataset-core-v0.1/FINDINGS.md) | ✅ D1–D5 resueltas |
| [SPEC_KEY_CATALOG v0.2](data/SPEC_KEY_CATALOG.md) | ✅ APPROVED FOR STEP 3 |
| [DATA_RIGHTS_MATRIX v0.2](data/DATA_RIGHTS_MATRIX.md) | ✅ DRAFT v0.2 (derechos `❓`) |
| [ADR-007](adr/ADR-007-reference-vs-used-instance.md) · [ADR-009](adr/ADR-009-data-provider-rights.md) | ✅ ACCEPTED · ACCEPTED WITH OPEN LEGAL VERIFICATION |
| Aprobación del schema v0.2 | ✅ 2026-09-24 |
| Revisión humana de conflictos y huecos de los DC | ⏳ |

```text
Dataset Core schema validation: COMPLETE
Human curation review:          PENDING
Schema v0.2:                    APPROVED
Data rights verification:       IN PROGRESS
Ready for Step 3 scaffold:      YES

Schema ready for code           ✅
Dataset ready for publication   ❌
Legal rights complete           ❌
```

**No se construyen todavía las 50–80 variants.**

## STEP 3 — Scaffold · 🔄 EN CURSO

Regla: **no** se empiezan todavía Economics, Comparison ni frontend. Primero se demuestra que el schema v0.2 se representa en código y hace round-trip en MySQL sin perder procedencia ni ambigüedad.

| Entregable | Estado |
|---|---|
| Monorepo (pnpm + Turborepo + TS strict + Vitest + ESLint + fast-check) | ✅ |
| `packages/vehicle-schema` (Zod + tipos TS; 90 SpecKeys; reglas de claves críticas) | ✅ 18 tests |
| `fixtures` (6 casos derivados de Dataset Core v0.1) | ✅ 8 tests |
| `packages/quality` (uso por engines, plausibilidad, Conflict Engine, elegibilidad por categoría) | ✅ 36 tests (incl. property-based) |
| `packages/db` (Drizzle MySQL 8, migración `0000_init`, repositorio) | ✅ 8 tests de round-trip contra MySQL real |
| Regla ESLint: dominio/engines sin acceso a MySQL | ✅ verificada |
| CI (GitHub Actions con MySQL 8) | ✅ definido (sin remoto todavía) |

**Validación técnica del schema v0.2 — COMPLETE (2026-09-24)**: los seis casos entran y salen de MySQL sin perder procedencia ni ambigüedad (bundle idéntico y mismo resultado de plausibilidad, conflictos y elegibilidad antes y después).

| Caso | Qué se demuestra |
|---|---|
| Golf 2018 | 2 ReferenceVariants técnicas (TAN *33 / *35) bajo un grupo comercial; ciclo NEDC-correlated inferido ≠ declarado; Economy NOT_AVAILABLE sin borrar la variant |
| BMW X3 2018 | rangos (`value` vacío + min/max + `range_basis`) → categorías PARTIAL; rating NCAP EXPIRED; validez hasta 08/2018 |
| BYD SEAL | batería 82,5 kWh `UNSPECIFIED`; Range por autonomía oficial; ventanas DC 10→80 y 30→80 separadas; conflicto de garantía detectado |
| SEAT León e-HYBRID | dato CS de DE con `source_market` visible; UNCONFIRMED no alimenta engines; EXACT sí; PARTIAL requiere revisión; DGT no cross-market |
| Tesla Model 3 2021 | precio vigente por fecha; variant técnica vigente por fecha (SR+ → RWD dic. 2021); datos secundarios no activan Charging |
| Golf eTSI | conflicto IDAE (85 kW) vs VW (110 kW) sin resolución por jerarquía → revisión humana; EEA `Ep` en `perf.power_ice_kw` |

Hallazgo del round-trip: `unit = null` (claves enum) se perdía al mapear NULL → corregido en `packages/db/src/mappers.ts`.

## STEP 4a — `@vscar/methodology` v0.1 (methodologyVersion 2026.1) · ✅ (2026-09-24)

| Componente | Estado |
|---|---|
| Curvas de utilidad (12 claves, lineales por tramos, monotonía verificada por propiedades) | ✅ |
| Meaningful Difference (umbrales del plan + propuestas `provisional`), NOT_DIRECTLY_COMPARABLE por ciclo/base, rangos → RANGE_DEPENDENT | ✅ |
| Meaningful For You v1 (autonomía, maletero, prestaciones, consumo) | ✅ |
| Used Information Confidence (information completeness vs decision relevance; Q6) | ✅ |
| Reglas de rangos D4 (LOW/HIGH, CONSERVATIVE explícito, BASE solo con regla, veredicto STABLE / DEPENDS) | ✅ |
| Presets ES/US, rangos de sensibilidad, niveles de confianza | ✅ |
| Regla DGT `dgt-label-v1` (reproduce las etiquetas curadas de los fixtures) | ✅ pendiente contrastar con tabla oficial (Q4) |
| Umbrales de plausibilidad y pesos de completitud (consumidos por `@vscar/quality`) | ✅ |
| Huella de configuración (FNV-1a sobre JSON canónico) | ✅ |
| Tests: 34 (20 sobre los seis fixtures reales) + `quality` completitud 5 | ✅ |

## STEP 4b — EEA adapter v0.1 · ✅ (2026-09-24)

| Componente | Estado |
|---|---|
| Diccionario de campos confirmado contra la definición oficial (CC BY 4.0) | ✅ |
| Consulta agregada segura (whitelist + escape), cliente paginado | ✅ |
| Raw ingest a filesystem con SHA-256 + tabla `raw_ingest` (migración `0001`) + `spec_values.raw_ingest_id` | ✅ |
| Normalización (P/F, mayúsculas, versiones, distribuciones sin promediar) | ✅ |
| Emparejamiento por homologación (TAN/Va/Ve; nunca por nombre comercial), cross-market EXACT/PARTIAL | ✅ |
| Mapeo documentado a SpecKeys (v1) y candidatos DRAFT validados con el schema v0.2 | ✅ |
| Persistencia append-only e idempotente en MySQL + Conflict Engine tras recarga | ✅ |
| Tests: 14 con respuestas reales grabadas + 1 en vivo (opcional, pasado 2026-09-24) + 3 de integración MySQL | ✅ |

Resultados con datos reales:
- **Golf 2018**: con la versión exacta (`Ve`), la EEA reproduce la curación DC-03 (113 g/km NEDC, 1.301 kg, 96 kW) → 0 conflictos. Sin `Ve`, las 4 versiones (manual y DSG) quedan UNCONFIRMED (110–116 g/km) → propuesta: añadir `version_code` a las homologaciones curadas.
- **Tesla Model 3 2021**: la homologación curada (TAN sin revisión) no se empareja (sin adivinar). Con TAN *13/E6R/PB1S5N: consumo 14,2 kWh/100 km coincide con IDAE; **autonomía EEA 440 km vs IDAE 448 km → conflicto real a revisión humana**.
- **SEAT León e-HYBRID 2022**: 2 homologaciones idénticas ES↔DE → cross-market EXACT usable; sin `Ve` → PARTIAL (revisión).

Los pendientes de 4b (`version_code`, jobs/worker, tablas 2023+) se cierran en 4c/4d.

## STEP 4c — Identity Completion + EEA Coverage · ✅ (2026-09-24)

| Componente | Estado |
|---|---|
| Revisión de identidad DC-01…DC-10 sin adivinar ([HOMOLOGATION_MATCH_REPORT](data/HOMOLOGATION_MATCH_REPORT.md), evidencia en `dataset-core-v0.1/identity/`) | ✅ **Exact 2/10 · Partial 0/10 · Unconfirmed 8/10** |
| Golf 2018: `version_code` exacta en *33 (NEDC) y *35 (WLTP); manual (FM6) ≠ DSG (FD7) | ✅ |
| BYD SEAL: Va/Ve del IDAE = EEA (EXACT; revisión de TAN 2026 pendiente) | ✅ |
| Tesla Model 3 2021: E6R y E6CR como variants técnicas separadas (no demostrablemente idénticas) | ✅ |
| León e-HYBRID: DE→ES solo con EXACT; hoy PARTIAL → el dato CS de DE no alimenta ES | ✅ |
| `EEADatasetResolver`: registro 2010–2025, FINAL > PROVISIONAL, sin mezcla ni doble conteo | ✅ |
| Casing normalizado para matching, original en raw; metadatos de raw (año/estado/tabla/hash/filas/query_hash/versiones) + migración `0002` | ✅ |
| Seguridad de consulta (whitelist de tabla, texto seguro, enteros, test de inyección SQL), timeout, logging | ✅ |
| Mapeo v2: `Zr` sin tipo de autonomía, `Ep` ≠ sistema en HEV/PHEV, `M`/`Mt`, `Z` ÷10; PARTIAL mismo mercado → UNCONFIRMED | ✅ |
| Raw `…\raw\eea\<year>\<status>\<sha256>.json` append-only, sin duplicados | ✅ |
| Tests: 19 (`step4c.test.ts`) + live con `VSCAR_EEA_LIVE=1` (pasado 2026-09-24) | ✅ |

## STEP 4d — Jobs + VScarWorker · ✅ (2026-09-24)

| Componente | Estado |
|---|---|
| Tabla `jobs` (migración `0003`): estados PENDING/RUNNING/SUCCESS/FAILED/DEAD, `idempotency_key` UNIQUE, `claim_token`, `heartbeat_at`, `result` | ✅ |
| Tipos: `EEA_IMPORT`, `QUALITY_CHECK`, `CONFLICT_SCAN` (payloads validados con Zod) | ✅ |
| Lock atómico `FOR UPDATE SKIP LOCKED` + tests de concurrencia (5 workers / 1 job → 1 reclamación; 4 workers / 20 jobs → ninguno se ejecuta dos veces) | ✅ |
| Reintentos `backoff-v1` 1/5/15/60 min; no reintentables → DEAD; agotados → DEAD | ✅ |
| Idempotencia `eea:<year>:<status>:<query_hash>` (+ hash de targets), `--rerun` explícito | ✅ |
| Recuperación de locks caducados con latido (`WORKER_STALE_LOCK_MIN`) | ✅ |
| `EEA_IMPORT` usa el adapter existente (sin lógica EEA duplicada); fuente S01 buscada por código | ✅ |
| `QUALITY_CHECK` solo informa; `CONFLICT_SCAN` → NO_CONFLICT / REVIEW_REQUIRED, nunca resuelve oficial vs oficial | ✅ |
| Logs JSON en `logs/worker` y `logs/eea`, sin secretos (redacción probada) | ✅ |
| Health `127.0.0.1:8180/health` (status, uptime, last_job_at, queue_depth, worker_version) | ✅ |
| CLI de encolado para Task Scheduler (solo encola) | ✅ |
| Operación NSSM: [docs/ops/VSCAR_WORKER_WINDOWS.md](ops/VSCAR_WORKER_WINDOWS.md); `.env.example` sin secretos | ✅ (no instalado aún en el VPS) |
| Tests: 11 worker + 11 db (MySQL `vscar_test`); CI con MySQL 8 ejecuta `pnpm check` | ✅ |

Verificación 2026-09-24: `pnpm check` exit 0 — lint ✅ · typecheck ✅ · 158 tests ✅ + 1 live omitido por defecto (pasa con `VSCAR_EEA_LIVE=1`).

Siguiente (acordado 2026-09-24): **4e MITECO → 4f ESIOS → 4g `@vscar/market-context` → 5 `@vscar/economics-engine`**. El engine económico recibe un `EnergyContext` ya normalizado y nunca conoce MITECO/ESIOS.

## STEP 4e — MITECO adapter (precios de carburantes) · ✅ (2026-09-24)

| Componente | Estado |
|---|---|
| Fuente S03 verificada: API REST sin token, histórico diario determinista desde 2007 (último día: ayer), CC BY 4.0 (⚠️ atribución, pendiente revisión humana), PVP con impuestos | ✅ |
| Schema normalizado `EnergyPriceObservation` en `@vscar/vehicle-schema` (contrato adapter ↔ db ↔ market-context; solo hechos, sin supuestos) | ✅ |
| Parseo: decimal con coma, `""` = no vende (nunca 0), solo venta al público, límites de parseo → excluir y contar (nunca corregir) | ✅ |
| Agregados: mediana sin ponderar + p25/p75/min/max/n por `TAX_ZONE` (Península+Baleares / Canarias / Ceuta / Melilla, nunca mezcladas), `REGION` (ISO 3166-2) y `PROVINCE` (INE) | ✅ |
| Raw `…\raw\miteco\<year>\snapshot\<sha256>.json.gz` (~0,8 MB/día), append-only, deduplicado, verificable; `raw_ingest` con `dataset_status = SNAPSHOT` | ✅ |
| Tabla `energy_prices` (migración `0004`) + `createMarketDataRepository` (append-only, idempotente, recarga validada) | ✅ |
| Job `MITECO_IMPORT` + `enqueue.ts miteco-import` (por defecto: ayer, hora peninsular); fecha no publicada → DEAD; logs en `logs/miteco` | ✅ |
| Seguridad de petición: URL solo desde fecha y provincia validadas; timeout; 5xx/429/red reintentables, 4xx/parámetros no | ✅ |
| Tests: 16 adapter (respuestas reales de 5 provincias, valores esperados calculados aparte) + live nacional con `VSCAR_MITECO_LIVE=1` (pasado 2026-09-24) + 2 MySQL + 1 worker | ✅ |

## STEP 4f — ESIOS adapter v0.1 (PVPC de referencia) · ✅ (2026-09-25)

Principio: la complejidad vive en backend; el producto ve **un precio de referencia de electricidad** (media diaria del PVPC), editable.

| Componente | Estado |
|---|---|
| Fuente S04: fichero oficial PVPC de ESIOS (archivo 70, `download_json`) — **público, sin token** (verificado; `indicators/*` sí exige token). `ESIOS_TOKEN` opcional: si existe va solo en cabecera `x-api-key` | ✅ |
| Valor = término de energía PVPC 2.0TD (€/MWh → €/kWh), `price_basis = PVPC_ENERGY_TERM`, **`taxes = EXCLUDED`** (RD 216/2014 art. 7.6), sin término de potencia; etiquetado como *reference electricity price* | ✅ |
| Zonas tarifarias separadas: PCB (Península+Canarias+Baleares) y CYM (Ceuta+Melilla); difieren en algunas horas | ✅ |
| Horas internas con instante UTC exacto por posición en el día local Europe/Madrid (23/24/25 h); salida: media, mín, máx, n por día | ✅ |
| Día incompleto, hora ilegible, día equivocado o formato 2.0A (< 2021-06-01) → nunca se promedia (error o zona omitida con issue) | ✅ |
| Raw `…\raw\esios\<year>\snapshot\<sha256>.json` append-only, deduplicado, verificable | ✅ |
| Contrato **único** `EnergyPriceObservation` ampliado (`ELECTRICITY`, `price_basis`, `TARIFF_ZONE`, `MEAN`, `EUR_PER_KWH`); migración `0005` (`price_basis`, filas MITECO previas = `RETAIL_PUMP_PRICE`) | ✅ |
| Job `ESIOS_IMPORT` (un día por job; `enqueue.ts esios-import [--date | --from --to]`); día no publicado → `NOT_AVAILABLE_YET`, DEAD sin reintentos (misma convención que MITECO); logs en `logs/esios` | ✅ |
| Token: nunca en URL, raw, metadatos, resultados ni logs; redacción **por valor** en logger y en `jobs.last_error` (también contraseña de BD) | ✅ |
| Tests: 14 adapter (respuestas reales: día normal, 23 h, 25 h, no disponible, formato antiguo; medias calculadas aparte) + live con `VSCAR_ESIOS_LIVE=1` (pasado 2026-09-25, sin token) + 1 MySQL + 2 worker | ✅ |

⚠️ **Derechos S04 sin resolver**: los términos propios de ESIOS no son legibles (página JS) y el aviso legal de ree.es prohíbe el uso comercial sin autorización escrita. No bloquea construir Economics, pero **sí bloquea publicar** precios eléctricos derivados de ESIOS hasta revisión legal o autorización de REE (DATA_RIGHTS_MATRIX §2.1, §7).

## STEP 4g — `@vscar/market-context` v0.1 · ✅ (2026-09-25)

| Componente | Estado |
|---|---|
| Paquete puro: depende solo de `vehicle-schema`, `methodology`, `zod`; no importa adapters, BD ni `node:*` (ESLint + test) | ✅ |
| `resolveEnergyContext(request, observations)` (pura) y `loadEnergyContext(reader, request)` vía puerto `EnergyPriceReader` (lo implementa `createMarketDataRepository`) | ✅ |
| `EnergyContext`: solo hechos observados — `fuelPricesEurPerL` por producto, `electricityPriceEurPerKwh`, fecha del dato, antigüedad, frescura y procedencia completa; sin supuestos ni costes de vehículo | ✅ |
| Carburante: mediana MITECO de la **zona fiscal** de la región (Madrid → Península+Baleares; Canarias, Ceuta, Melilla aparte); importaciones parciales (solo provincias) nunca se usan como zona | ✅ |
| Electricidad: PVPC media diaria de la zona tarifaria (Canarias → PCB; Ceuta/Melilla → CYM) | ✅ |
| Methodology **2026.2** (`energy-market-v1`): CURRENT ≤ 2 días, RECENT ≤ 7, STALE ≤ 14 (ventana máxima); más antiguo → no disponible (`OLDER_THAN_LOOKBACK`), nunca un precio viejo como actual | ✅ |
| `EnergyScenario` separado (`homeChargingShare`, overrides) + `effectiveEnergyInputs`: override del usuario > referencia de mercado > fallback metodológico (vacío: sin fuente no se inventa) > UNAVAILABLE | ✅ |
| Tests: 16 unitarios + 3 de extremo a extremo (adapters → MySQL → market-context) | ✅ |

Desviaciones deliberadas respecto al brief (justificadas): `fuelPricesEurPerL` es un mapa por producto (gasolina ≠ gasóleo; un escalar no sirve a ambos); el fallback metodológico queda definido pero sin valores (no hay fuente que los justifique); el token de ESIOS es opcional porque la fuente usada es pública.

Verificación 2026-09-25: `pnpm check` exit 0 — lint ✅ · typecheck ✅ · 213 tests ✅ + 3 live omitidos por defecto (EEA, MITECO, ESIOS: los tres pasan con su flag).

Siguiente: **Step 5 — `@vscar/economics-engine`**, consumiendo `EnergyContext` + `EnergyScenario` (nunca las fuentes).

## STEP 5 — `@vscar/economics-engine` v0.1 · ✅ (2026-09-25)

Documentación: [docs/economics/ECONOMICS_ENGINE_V0_1.md](economics/ECONOMICS_ENGINE_V0_1.md). Metodología **2026.3** (`economics-v1`, redondeo `money-v1`).

| Componente | Estado |
|---|---|
| Paquete puro: `vehicle-schema`, `methodology`, `market-context`, `quality`, `zod`; prohibido `db`, `data-connectors`, `worker`, `node:*` (ESLint + test) | ✅ |
| Contratos `EconomicVehicleInput`, `EconomicScenario`, `VehicleEconomicOverrides`, `EconomicResult`; entrada desde el bundle con las reglas de `quality` (usable, válido en fecha, sin BLOCK, sin conflicto) | ✅ |
| ICE/MHEV/HEV (L/100 km × €/L), BEV (kWh de red × €/kWh, eficiencia 0,90 ESTIMATED según `charging_loss_basis`), PHEV combinado (fracción eléctrica del escenario + CS; nunca WLTP ponderado; sin CS → UNAVAILABLE) | ✅ |
| Running Cost (anual, 1/3/5/N años) y Ownership Cost (COMPLETE o `KNOWN_COST_VIEW`; sin compra → UNAVAILABLE) | ✅ / PARTIAL por diseño |
| Known / User-provided / Estimated por línea; precedencia de precios override > referencia > fallback (vacío) > UNAVAILABLE | ✅ |
| Rangos propagados (sin punto medio); dinero en céntimos, HALF_UP, acumulados enteros | ✅ |
| Break-even (BREAK_EVEN / UNCERTAIN / NO_BREAK_EVEN / NO_PREMIUM), deltas antisimétricos, sensibilidad determinista (8 variables) | ✅ |
| Confianza HIGH/MEDIUM/LOW con motivos; 25 warnings; `scenarioHash` (huella de methodology) | ✅ |
| Procedencia: precios usados (fuente, observación, fecha, frescura, impuestos) y fuentes implicadas → la capa de publicación aplica el gate S04 | ✅ |
| Tests: 26 unitarios + 7 propiedades + 6 fixtures reales + 2 frontera | ✅ |

Decisión técnica nueva (sin reabrir aprobadas): el consumo eléctrico declara `charging_loss_basis`; la eficiencia de carga solo se aplica si las pérdidas están EXCLUIDAS; si están INCLUIDAS no se aplica (evita contarlas dos veces); si no se sabe (todos los consumos curados hoy) el coste sale como **rango**.

Gate legal vigente (A8): **Build Economics: YES · uso ESIOS interno/desarrollo: YES · publicar precios basados en ESIOS: NO** hasta resolver derechos S04. El resultado conserva `source_id` para que la capa de publicación lo aplique.

Verificación 2026-09-25: `pnpm check` exit 0 — lint ✅ · typecheck ✅ · 254 tests ✅ + 3 live (EEA, MITECO, ESIOS) ✅ con sus flags.

Siguiente: Comparison Engine (consume `EconomicResult`, no recalcula economía).

## STEP 6a — `@vscar/comparison-engine` v0.1 · ✅ (2026-09-30)

Documentación: [docs/comparison/COMPARISON_ENGINE_V0_1.md](comparison/COMPARISON_ENGINE_V0_1.md). Metodología **2026.4**.

Responde "¿en qué es materialmente mejor, peor o equivalente cada coche para este escenario?". **Sin winner, overall score, personal fit ni recomendación** (Step 6b).

| Componente | Estado |
|---|---|
| Paquete puro: `vehicle-schema`, `methodology`, `quality`, `economics-engine`, `zod`; prohibido `db`, `data-connectors`, `worker`, `node:*` (ESLint + test) | ✅ |
| Contratos `ComparisonCandidate`, `ComparisonScenario` (solo contexto práctico), `ComparisonResult`; candidato desde el bundle con las reglas de `quality` | ✅ |
| Deal breakers primero (PASS/FAIL/UNKNOWN; UNKNOWN ≠ PASS; rango que cruza el límite → UNKNOWN; ningún FAIL se revierte) | ✅ |
| Métricas técnicas en 10 categorías con `AHEAD/BEHIND/PRACTICAL_TIE/RANGE_DEPENDENT/DIFFERENT/NOT_COMPARABLE/UNKNOWN` | ✅ |
| Diferencia bruta · Meaningful Difference (umbrales de methodology, sin duplicar) · Meaningful For You (`for-you-v1`, perfil práctico) | ✅ |
| Rangos por intervalos; ciclos, bases, `range_type`, ventana SoC y protocolo NCAP distintos → NOT_COMPARABLE | ✅ |
| Economía consumida de `EconomicResult` (deltas `economicDelta`, break-even `breakEven`); sin recalcular; ciclos distintos → NOT_COMPARABLE | ✅ |
| Resúmenes por categoría por unanimidad (sin pesos); confianza de datos combinando señales existentes | ✅ |
| Simetría A/B, independencia del orden y del conjunto, reproducibilidad (`scenarioHash`) | ✅ |
| Tests: 22 unitarios + 4 propiedades + 5 fixtures reales + 3 frontera | ✅ |

Cambios en methodology 2026.4 (sin reabrir Step 5): umbrales `provisional` que faltaban para comparar — coste de uso anual (`running_cost_annual_eur`), plazas, maletero abatido, remolque, carga útil, ISOFIX, giro, autonomía total PHEV, garantías de km y batería, NCAP; reglas `comparison-v1` de confianza de datos; `compareIntervals` extraída de `compareValues` (mismo comportamiento, tests de methodology/quality intactos).

Decisiones técnicas nuevas:
- Outcome adicional `DIFFERENT` para diferencias sin dirección de mejora (dimensiones, etiqueta DGT, equipamiento): se describen, no se valoran.
- Los costes energéticos derivados de consumos de ciclos distintos (p. ej. X3 NEDC vs Golf WLTP) se muestran pero son NOT_COMPARABLE (coherente con §13 y con el plan: "NOT DIRECTLY COMPARABLE, excluido del ganador pero visible").
- Los acumulados a N años se clasifican por su equivalente anual para que el horizonte no infle la relevancia.

Verificación 2026-09-30: `pnpm check` exit 0 — lint ✅ · typecheck ✅ · 288 tests ✅ + 3 live (EEA, MITECO, ESIOS) ✅ con sus flags.

Siguiente: Step 6b — Fit Engine (Practical Fit / Preference Fit sobre `ComparisonResult`).

## STEP 6b — Alpha Decision Engine v0.1 · ✅ (2026-10-02)

Documentación: [docs/decision/ALPHA_DECISION_ENGINE_V0_1.md](decision/ALPHA_DECISION_ENGINE_V0_1.md). Metodología **2026.5** (`alpha-decision-v1`, provisional). Motor `0.1.0`.

| Componente | Estado |
|---|---|
| Paquete puro (`vehicle-schema`, `methodology`, `quality`, `economics-engine`, `comparison-engine`, `zod`); sin `db`, adapters, worker ni `node:*` (ESLint + test) | ✅ |
| No recalcula: consume `compareCandidates` (6a) + `EconomicResult` (5); rechaza resultados de comparación incompletos | ✅ |
| Technical Capability: curvas de utilidad de methodology (sin min–max), pesos editoriales públicos, categorías sin datos excluidas (nunca 0) con cobertura; solo WLTP / potencia de sistema / NCAP vigente; edad, km y precio no intervienen | ✅ |
| Economic Fit @ horizonte (1/3/5/N): coste de uso del `EconomicResult`, dirección del 6a, sin ganador si NOT_COMPARABLE o UNKNOWN; propiedad como `KNOWN_COST_VIEW` | ✅ |
| Practical Fit: deal breakers del 6a (FAIL), UNCONFIRMED (obligatorio sin dato, nunca PASS), PASS_WITH_COMPROMISES (deseos incumplidos), PASS; el estado manda sobre el score | ✅ |
| Prioridades simples COST/SPACE/PERFORMANCE (3/2/1) y Alpha Fit sin doble conteo | ✅ |
| Alpha Best For You: solo ≠ FAIL; empates prácticos neutralizados; PRACTICAL_TIE / RANGE_DEPENDENT sin forzar ganador; NO_FULL_MATCH con candidato más cercano informativo | ✅ |
| Contribuciones (máx. 3, ≥ MEANINGFUL, qué/cuánto/por qué/para quién), confianza de datos combinada, `scenarioHash` | ✅ |
| Sin Preference Fit, sin Personal Fit, sin brand/design score, sin penalización por edad | ✅ |
| Tests: 17 unitarios + 6 propiedades + 5 fixtures reales + 3 frontera | ✅ |

Decisiones técnicas nuevas:
- Cuarto estado de Practical Fit `UNCONFIRMED` (requisito obligatorio sin dato): no es PASS ni compromiso; el candidato sigue siendo elegible pero se marca `requiresVerification`.
- Las comparaciones de Alpha Fit y Technical Capability entre dos coches se hacen sobre componentes/categorías **comunes**, y las métricas que el 6a marca PRACTICAL_TIE se igualan (una diferencia trivial no decide aunque la prioridad sea HIGH).
- El componente COST solo usa costes basados en consumos WLTP (coherente con NOT_COMPARABLE de ciclos).

Resultado en casos reales: BYD SEAL vs Model 3 → empate práctico para un commuter con carga en casa; BYD para quien hace 10 viajes largos/año (autonomía CLEAR y relevante). X3 NEDC vs Golf WLTP → sin ganador económico.

Verificación 2026-10-02: `pnpm check` exit 0 — lint ✅ · typecheck ✅ · 319 tests ✅ + 3 live (EEA, MITECO, ESIOS) ✅ con sus flags.

Siguiente: Step 6c — Why Not + Result Robustness + Recommendation Confidence.

## STEP 6c — Why Not · Result Robustness · Recommendation Confidence · ✅ (2026-10-02)

Documentación: [docs/decision/ALPHA_DECISION_ENGINE_V0_1.md § Step 6c](decision/ALPHA_DECISION_ENGINE_V0_1.md). Metodología **2026.6** (`why-not-v1`, `robustness-v1`, `recommendation-confidence-v1`, provisionales). Mismo paquete `@vscar/decision-engine` (no hay razón arquitectónica para uno nuevo).

| Componente | Estado |
|---|---|
| Why Not por candidato (máx. 5) y tradeoffs del elegido (máx. 3); orden determinista; puerta ≥ MEANINGFUL; SLIGHT solo como respaldo menor; sin relleno | ✅ |
| Verify before deciding (UNCONFIRMED y deseos sin dato), nunca como defecto confirmado; NO_FULL_MATCH con "closest option", nunca "recommended" | ✅ |
| Result Robustness: rejilla + bisección acotada sobre km/año, precio carburante, precio electricidad, % carga en casa y horizonte, en rangos de methodology; prioridades simples; global por el cambio más cercano; TIE/RANGE_DEPENDENT nunca HIGH | ✅ |
| Recommendation Confidence HIGH/MEDIUM/LOW + motivos, combinando señales existentes; topes por empate, rangos, sin coincidencia y todo sin confirmar; derechos de publicación separados | ✅ |
| Mensajes `messageKey` + `params` (+ respaldo en inglés) — i18n-ready | ✅ |
| `createDecisionPipeline`: orquesta Economics → Comparison → Decision para re-evaluar escenarios (único módulo que los llama) | ✅ |
| Contrato preparado para `usedInformationConfidence` (`NOT_APPLICABLE`) y `subject = USED_INSTANCE` | ✅ |
| Tests: 8 unitarios/goldens + 3 casos reales + 1 determinismo + 5 propiedades | ✅ |

Corrección incluida: las utilidades de los componentes del Alpha Fit ya no se redondean antes de comparar pares (el redondeo a 0,1 creaba "islas" de resultado junto al umbral de empate; lo detectó la búsqueda de robustez). Los scores mostrados siguen redondeados.

Verificación 2026-10-02: `pnpm check` exit 0 — lint ✅ · typecheck ✅ · 337 tests ✅ + 3 live (EEA, MITECO, ESIOS) ✅ con sus flags.

Siguiente: scaffold local de VScar Web (contratos estables) o Used Adjustment.

## STEP 6d — Visual Direction + ThreeUI Strategy · ✅ (2026-10-02)

Solo análisis, dirección y especificación: no hay `apps/web`, ni código ThreeUI/GSAP, ni cambios en los engines.

| Entregable | Estado |
|---|---|
| [VSCAR_VISUAL_DIRECTION_V0_1.md](design/VSCAR_VISUAL_DIRECTION_V0_1.md): análisis medido de Forge (principal), Singularity, Soviet Flip y Armor; 8 principios; narrativa Car VS dinámica (6–9 capítulos, no 12); scroll grammar; 19 tokens de motion; responsabilidades Motion/GSAP/ThreeUI/R3F; tipografía y color (contraste AA medido); estados tie / range-dependent / no full match / cambio de ganador; móvil; reduced motion; rendimiento y tiers; plan del lab | ✅ |
| [THREEUI_EVALUATION.md](design/THREEUI_EVALUATION.md): `@designcodeio/threeui` 1.2.0 MIT (Community), Pro fuera de npm, grafo de imports por componente, shortlist y rechazos, patrón de integración, riesgos | ✅ |
| [ADR-010 — visual-motion-stack](adr/ADR-010-visual-motion-stack.md): ThreeUI adelantado para atmósfera, GSAP solo para scroll, Motion para UI, R3F condicionado a presupuesto | ✅ ACCEPTED FOR LAB |
| [THIRD_PARTY.md](licenses/THIRD_PARTY.md): licencias del stack visual verificadas en los tarballs | ✅ |

Hallazgos medidos que cambian el plan:
- La sensación premium de Forge no viene del 3D: es fotografía con profundidad 2,5D en shader OGL + SplitText + secciones `sticky` con scrub (sin `pin`), sobre scroll nativo suavizado.
- ThreeUI 1.2.0 no usa R3F ni trae `'use client'`. Sus fondos WebGL nativos pesan 2–5 KB gzip, pero no respetan reduced motion (lo aplica un wrapper). La familia "Neuform" (iframe + CDN, ~119 KB) y los componentes con Three r128 quedan descartados.
- GSAP 3.15 + ScrollTrigger + SplitText = 48,7 KB gzip, con licencia gratuita para uso comercial.
- R3F + three para una silueta pueden superar los 250 KB del chunk 3D: queda condicionado al lab, con alternativa OGL y la silueta SVG siempre como base.

Siguiente: **Step 6e — ThreeUI / Motion Lab** (`labs/motion-lab`, 5 efectos, gate de rendimiento por efecto).

## STEP 6e — ThreeUI / Motion Lab · ✅ PASS (2026-10-02)

Lab aislado en `labs/motion-lab` (Next.js 16 App Router, una ruta, puerto 4100). Sin `apps/web`, sin DB, sin API, sin cambios en los engines. Datos reales: snapshot de Dataset Core + energía ESIOS/MITECO, pasados por el `createDecisionPipeline` real.

| Entregable | Estado |
|---|---|
| Narrativa BYD → VS → Model 3 → PRACTICAL TIE → cambio de escenario → BYD seleccionado; el ganador sale del engine (`longTripsPerYear` 1 → tie, 10 → BYD; el cambio ocurre en 3) | ✅ |
| 5 efectos medidos (FPS, hilo principal, heap, LCP/CLS/INP, gzip) en HIGH / LOW / móvil (CPU ×4) / reduced / sin WebGL / contexto perdido | ✅ |
| [MOTION_LAB_RESULTS.md](design/MOTION_LAB_RESULTS.md) + 14 capturas en `docs/design/motion-lab/` (~490 KB) | ✅ |
| [ADR-011 — alpha-visual-stack-after-lab](adr/ADR-011-alpha-visual-stack-after-lab.md): sustituye en parte a ADR-010 | ✅ ACCEPTED |
| Tests del lab (20): tier, reduced → 2D, fallback del wrapper, tie real, selección real, frontera sin DB; regla ESLint `BROWSER_LABS` | ✅ |
| `corepack pnpm check` (lint + typecheck + test, 22 tareas) y build del lab | ✅ (tests MySQL de `@vscar/db` omitidos: sin `VSCAR_TEST_DATABASE_URL` en la shell) |

Decisiones:
- **ThreeUI**: RibbonField KEEP, StreamConvergence REJECT. Reduced motion, sin WebGL o contexto perdido → degradado CSS sin contexto WebGL.
- **Vehículo**: SVG ONLY. **R3F REJECTED FOR ALPHA** (236 KB gzip, sin ganancia visual sin GLTF, +150 ms de hilo principal); OGL REJECT.
- **GSAP**: ScrollTrigger + SplitText + `@gsap/react`, sticky CSS + scrub, sin `pin`; ScrollTriggers estables tras 4 ciclos de cambiar tier/renderer/motion.
- **Motion**: Tie Balance, Tie → Winner (`layoutId` compartido), Scenario Morph; CLS 0.

Hallazgos que condicionan `apps/web`:
- JS inicial del lab 333,6 KB gzip (framework 170,7 KB): engines + datos (69,6 KB) al servidor/lazy y GSAP (47,6 KB) después del LCP; `size-limit` en el primer build.
- Pipeline interactivo 3,5–6,5 ms (20–26 ms en móvil ×4); robustez completa 0,1–0,7 s → fuera del hilo principal.
- HMR no verificado en navegador (el Chromium headless bloquea el WebSocket); queda como comprobación manual.
- Laragon activo y compatible; no se tocó ningún servicio, `hosts` ni vhost.

Siguiente: scaffold de `apps/web` con el stack de ADR-011.

## STEP 7a — Real VScar Web Foundation · ✅ PASS (2026-10-02)

Primera app real: `apps/web` (`@vscar/web`, Next.js 16 App Router, puerto **4200** mientras el lab siga en 4100). Base de producción, no un laboratorio. Sin MySQL, API pública, usados, login, analytics ni anuncios. Engines sin cambios.

| Entregable | Estado |
|---|---|
| [WEB_FOUNDATION_V0_1.md](web/WEB_FOUNDATION_V0_1.md): arquitectura, fronteras diferidas, capítulos dinámicos, robustez servidor + worker, rendimiento medido, tests | ✅ |
| [I18N_AND_MARKETS.md](web/I18N_AND_MARKETS.md) · [LOCAL_DEVELOPMENT.md](web/LOCAL_DEVELOPMENT.md) | ✅ |
| [ADR-012 — i18n-market-routing](adr/ADR-012-i18n-market-routing.md): idioma ≠ mercado, `es-es`/`en-es`, segmento canónico `compare` (se desvía de §29, alias `comparar` con 308) | ✅ ACCEPTED |
| `packages/ui` (`@vscar/ui`): tokens TS + CSS (oscuro, claro preparado), Button, Sheet (Radix), Disclosure, `visual-tier` extraído del lab | ✅ |
| Comparación BYD SEAL vs Model 3 en `/es-es/compare/…` y `/en-es/compare/…` con el pipeline real: 1 viaje → empate, 10 → BYD sin recarga, la robustez del worker actualiza la confianza (BAJA → MEDIA) y el cambio de idioma conserva el escenario | ✅ |
| Tests: `@vscar/web` 42 (vitest) + 5 E2E (Playwright, Chrome real, 0 errores de consola) · `@vscar/ui` 9 · `check` del monorepo en verde (MySQL omitido sin `VSCAR_TEST_DATABASE_URL`) | ✅ |
| HMR (pendiente de 6e): 3 rondas en `next dev`: ScrollTriggers 7 → 7, listeners 17 → 17, 1 contexto WebGL, 0 errores | ✅ |

Rendimiento medido (build de producción, local; móvil = CPU ×4):
- JS inicial de la comparación: **151,2 KB gzip** (189,8 KB contando polyfills `noModule`) → **WITHIN BUDGET** (≤ 200 KB). Desglose: React DOM 77,0 · Next 43,0 · app 31,3 (islas 5,6) · polyfills legacy 38,6.
- Diferido: pipeline 53,8 · Motion 51,9 · GSAP 46,7 · formulario + Radix 24,8 · next-intl cliente 11,9 · RibbonField 2,3 · worker 0,7 KB. three/R3F/OGL no existen en el build.
- LCP 164–656 ms · CLS 0 en todas las configuraciones (móvil bajó de 0,71 a 0) · INP 24–48 ms (móvil ×4 en 5 repeticiones: mediana 136 ms, peor 208 ms).

Hallazgos:
- `en-ES` de CLDR formatea con separadores españoles: cada locale declara su `formatLocale` (`en-es` → `en-GB`).
- Partes del engine 6b (contribuciones, explicaciones, reglas For You, `detail`/`reason`/`what`) no tienen `messageKey`. La UI las localiza por campos estructurados o usa el respaldo inglés; queda propuesto un Step de engine.
- Primer render de un escenario nuevo: 0,2–0,7 s de servidor por la robustez (caché LRU). Vigilar en el VPS.
- Laragon activo y compatible; no se tocó Apache, MySQL, `hosts` ni vhosts.

Siguiente: **Step 7b — Vehicle Selector + Real Data Orchestration**.

## STEP 7a.1 — Decision Engine i18n Contract · ✅ PASS (2026-10-09)

Ningún texto de decisión visible depende ya de frases inglesas libres: todo lo que explica un engine es `messageKey + params` (+ `details`) y la web lo traduce con `translateDecisionMessage`. **Sin cambios de lógica ni de metodología** (`methodologyVersion` sigue 2026.6). No hace falta ADR: la arquitectura no cambia y el contrato evoluciona de forma aditiva.

| Entregable | Estado |
|---|---|
| `@vscar/methodology`: tipo `Message`, `createMessageFactory`, `isStructuredParamValue`; `ForYouResult.applied[{code, params}]`; `NotComparableCode` en Meaningful Difference | ✅ |
| comparison-engine: 36 claves (`comparison.requirement/metric/reason/meaningful_for_you/economic/confidence.*`) + esquema de parámetros | ✅ |
| decision-engine: 64 claves (contribution, best_for_you, technical, economic, practical, data_confidence, why_not, verify, confidence, robustness) + `MESSAGE_PARAM_SCHEMA`; `decision.economic.not_comparable_cycles {cycleA, cycleB}` | ✅ |
| Web: `translateDecisionMessage`, `MessageText`, view-model y capítulos sin frases compuestas en la UI; catálogos ES/EN **100 % / 100 %** | ✅ |
| Dorado lógico antes/después (9 casos) idéntico · contrato de mensajes (16 tests) · cobertura y calidad de traducción en la web (10 tests) | ✅ |
| Docs: "Decision Message Contract" en [ALPHA_DECISION_ENGINE_V0_1.md](decision/ALPHA_DECISION_ENGINE_V0_1.md) y [I18N_AND_MARKETS.md](web/I18N_AND_MARKETS.md) | ✅ |

Verificación: `pnpm check` en verde (411 tests; MySQL omitido sin `VSCAR_TEST_DATABASE_URL`) · build de producción · 5/5 E2E · JS inicial de la comparación **189,8 KB** con polyfills (igual que en 7a; WITHIN BUDGET).

Texto inglés restante, todo fuera de la UI: respaldos `text` de las 100 plantillas (solo fallback/logs); campos de texto heredados (`reason`, `explanation`, `why`, `note`, `rules`…) conservados por compatibilidad y no renderizados; `warnings` de diagnóstico (7 puntos de emisión, mensajes de desarrollador); nombres de casos sintéticos en los tests.

Hallazgo: el puerto 4200 puede estar ocupado por otra aplicación local. `playwright.config.ts` acepta `VSCAR_WEB_PORT` (por defecto 4200) y el informe de bundle, `VSCAR_WEB_URL`.

Siguiente: **Step 7b — Vehicle Selector + Real Data Orchestration**.

## STEP 7b — Vehicle Selector + Real Data Orchestration · ✅ PASS (2026-10-13)

La comparación fija y el snapshot de Dataset Core desaparecen de la web. El usuario elige dos **ReferenceVariants** del catálogo de España, el servidor las resuelve contra **MySQL**, filtra lo que no se puede publicar, y los engines deciden con las mismas entradas de siempre. Sin usados, marketplace, cuentas, favoritos ni analytics. Metodología sin cambios (2026.6).

| Entregable | Estado |
|---|---|
| Selector búsqueda-primero (combobox ARIA, debounce 200 ms, ≥ 2 caracteres, ≤ 20 resultados, sin acentos), diferido (4,3 KB); home "elige A → B → Comparar"; Cambiar / Intercambiar en la comparación; "Comparaciones de ejemplo" | ✅ |
| `CatalogReader` de solo lectura en `@vscar/db` (búsqueda parametrizada `utf8mb4_0900_ai_ci`, slugs + alias, huella del catálogo); migración `0006` (slug único por mercado + `variant_slug_aliases`); `corepack pnpm db:dev` | ✅ |
| `@vscar/quality` → publicación: derechos = DATA_RIGHTS_MATRIX (test de sincronía), canales PUBLIC/PREVIEW, `PUBLIC_AVAILABLE`/`INTERNAL_AVAILABLE`/`NOT_AVAILABLE`, por campo; conflictos conservados al ocultar | ✅ |
| Capa server-only (`apps/web/src/server/**`): `VehicleCatalogService`, `loadComparisonData` → `ComparisonData` (adapters existentes), energía filtrada por canal, `dataSnapshot`; API interna `/api/catalog/search` | ✅ |
| Rutas `/{locale}/compare/{a}-vs-{b}` (A/B conservado), URL de la 7a y alias → 308 al canónico con escenario, 404 específica, idioma conserva par + escenario | ✅ |
| Docs: [VEHICLE_SELECTOR_V0_1](web/VEHICLE_SELECTOR_V0_1.md) · [DATA_ORCHESTRATION_V0_1](web/DATA_ORCHESTRATION_V0_1.md) · [ADR-013](adr/ADR-013-catalog-publication-and-routing.md) | ✅ |

Catálogo (mercado ES):
- **PREVIEW**: 9 variants · 5 marcas · 5 modelos · BEV 4, ICE 3, PHEV 1, MHEV 1.
- **PUBLIC**: **0**. Todas son `test_fixture`, 6 tienen identidad no `EXACT`, y S02/S08 tienen derechos ❓. Es el resultado honesto de ADR-009 §9, no un fallo.

Verificación:
- `pnpm check` en verde: **507 tests** (3 en vivo omitidos), con los suites MySQL ejecutados por primera vez en `check`: db 28, worker 14, web 10.
- Build de producción y **9/9 E2E** (Chrome).
- JS inicial de la comparación **152,7 KB** (191,3 con polyfills; 7a: 151,2/189,8).
- Búsqueda p50 3,6 ms / p95 7,8 ms en frío.
- SSR con escenario nuevo p50 344 ms; la robustez son ≈ 310 ms.
- INP peor caso: escritorio 72 ms, móvil ×4 112 ms.

Hallazgos:
- **Derechos ≠ calidad**: ocultar la fuente secundaria del Model 3 deshacía un conflicto pendiente de revisión y dejaba pasar un valor. Ahora los conflictos se calculan con todos los valores. El test dorado (catálogo = ruta de la 7a, resultado completo) lo detectó.
- **`not-found.tsx` de segmento + next-intl**: Next lo construye antes que la página y fijaba el locale por defecto para toda la petición; `/en-es` salía en español. Ahora hay un único `[locale]/not-found.tsx` con mensaje según la ruta, protegido por un test.
- El 4200 lo ocupa a veces otra aplicación de la máquina (Angular ajeno): no se toca. VScar se prueba en 4210 (`VSCAR_WEB_PORT`/`VSCAR_WEB_URL`).
- Base `vscar_dev` + usuario con permisos solo sobre ella creados en el MySQL de Laragon. No se tocó Apache, Nginx, `hosts` ni vhosts.

Siguiente:
- **Step 7c — Comparison URL / Share / richer catalog pages**.
- En paralelo, en el data workstream: verificar derechos de S08/S02/S04 y curar identidades `EXACT` para que el canal PUBLIC tenga catálogo.

## STEP 7b.2 — Visual Vehicle Selector + Model Media · ✅ PASS (2026-10-14)

El usuario elige como piensa: **Marca → Modelo → Año → Versión** (búsqueda directa como atajo), y VScar resuelve siempre una `ReferenceVariant` técnica concreta. Nueva entidad `VehicleModelMedia`, con derechos de imagen separados de los de datos y fallback SVG obligatorio. Sin cambios de elegibilidad, identidad, rutas ni metodología.

| Entregable | Estado |
|---|---|
| `VehiclePicker` (diferido, 10,4 KB): pasos con `aria-current`, foco en el título de cada paso, tarjetas de modelo, chips de año, filas de versión, resumen "Elegir este coche", Atrás sin cerrar, "Buscar directamente"; Sheet a pantalla completa en móvil; Motion solo para entrada, hover y selección | ✅ |
| Desambiguación ADR-007 con hechos comprensibles: Golf 2018 "homologación NEDC / WLTP", Model 3 E6R/E6CR por periodo; detalle técnico (ID, TAN, Va, Ve, estado) solo en PREVIEW | ✅ |
| `VehicleModelMedia` (vehicle-schema) + `RightsStatus` compartido con la DATA_RIGHTS_MATRIX; `mediaPublication`/`selectModelMedia` (quality); tabla `vehicle_model_media` (migración `0007`), `listModelMedia`/`saveModelMedia` (db) | ✅ |
| Servicio y API interna `/api/catalog/browse` (marcas, modelos, años, versiones) con derechos de datos y de imagen aplicados en servidor; siluetas genéricas por carrocería (berlina, compacto, SUV) | ✅ |
| Docs: [VEHICLE_SELECTOR_V0_2](web/VEHICLE_SELECTOR_V0_2.md) · [VEHICLE_MEDIA_POLICY](data/VEHICLE_MEDIA_POLICY.md) · [ADR-014](adr/ADR-014-vehicle-model-media-and-selector-flow.md) | ✅ |

Catálogo (PREVIEW, ES):
- 5 marcas, 5 modelos, 6 modelo-año (Golf 2018 y 2027; X3 2018; SEAL 2026; León 2026; Model 3 2021) y 9 versiones.
- PUBLIC sigue en 0, con el mensaje "Todavía estamos verificando los vehículos disponibles para publicación".
- Imágenes con derechos verificados: **0**. Todas las tarjetas muestran la silueta de su carrocería.

Verificación:
- `pnpm check` en verde: **545 tests** (3 en vivo omitidos), con MySQL en db, worker y web.
- **12/12 E2E**, incluido el flujo §107 y móvil a 390 px.
- Abrir el selector p50 **40 ms**; pasos p50 26–36 ms; API p50 6–8 ms.
- JS inicial de la comparación **153,0 KB** (191,6 con polyfills).

Hallazgos:
- **Golf 2018 Advance h33/h35** compartían nombre, año, potencia y periodo: indistinguibles para el usuario. Ahora se distinguen por el ciclo de homologación (NEDC/WLTP), un hecho que además afecta a la comparabilidad.
- **Potencia en conflicto** (Golf eTSI 110 frente a 85 kW): la fila no muestra ninguna, en vez de elegir una.
- **Rendimiento**:
  - `AnimatePresence mode="wait"` retenía los pasos 300–550 ms; ahora la transición es solo de entrada.
  - `next/dynamic` (React.lazy) sumaba ~350 ms a la apertura por el retraso con el que React 19 revela contenido suspendido; ahora hay un loader propio con precarga en reposo.
- Más suites MySQL en paralelo: `hookTimeout` amplio en db, worker y web (esperan el bloqueo compartido de `vscar_test`).
- Cambio de idioma con el selector abierto: se cierra y se conservan comparación y escenario. No se guarda la selección parcial (documentado).

Siguiente:
- **Step 7c — Comparison URL / Share / richer catalog pages**.
- En el data workstream: primeras imágenes con derechos verificados (propias o licenciadas) y derechos de S08/S02/S04 para el canal PUBLIC.

## STEP D1.6a — Stabilization, Security & Technical Catalog Validation · ✅ PASS (entorno controlado) · 74 preparados, no importados (2026-10-21)

| Entregable | Estado |
|---|---|
| Estabilidad de tests — [D1_6A_TEST_STABILITY_REPORT](data/D1_6A_TEST_STABILITY_REPORT.md) | ✅ <ul><li>causa medida: trabajo repetido (`Intl.NumberFormat` por llamada, FNV con `BigInt`) + contención de la suite;</li><li>formateador cacheado y FNV de 32 bits con salida idéntica (tests de equivalencia);</li><li>`turbo --concurrency=4`;</li><li>test de rendimiento con rondas y benchmark controlado;</li><li>`pnpm check` ×3 forzado: 981 ✓ · 5 omitidos · 0 ✗</li></ul> |
| MySQL — [D1_6A_MYSQL_SCHEMA_AUDIT](data/D1_6A_MYSQL_SCHEMA_AUDIT.md) | ✅ <ul><li>migración `0009_curation_hardening`: UNIQUE TAN+Va+Ve, PK y FK de items, 10 CHECK;</li><li>aplicada en `vscar_dev` tras una comprobación previa de solo lectura;</li><li>dry-run, actualizaciones solo explícitas, bloqueo contra ejecuciones simultáneas, runs ABANDONED</li></ul> |
| Auditoría de los 18 — [D1_6A_FIRST_18_DATA_AUDIT](data/D1_6A_FIRST_18_DATA_AUDIT.md) | ✅ <ul><li>11/11 comprobaciones;</li><li>279 observaciones (267 utilizables, 0 con derechos aprobados), 69 atributos;</li><li>12 valores en conflicto (6 grupos, 4 vehículos) conservados</li></ul> |
| Seguridad — [D1_6A_SECURITY_AUDIT](data/D1_6A_SECURITY_AUDIT.md) | ✅ 2 correcciones: comparación en tiempo constante (sin fuga de longitud) y HTTP Basic solo sobre HTTPS fuera de loopback; verificado en vivo |
| Derechos — [D1_6A_RIGHTS_REVIEW](data/D1_6A_RIGHTS_REVIEW.md) | ✅ S11 y S13 **READY_FOR_HUMAN_APPROVAL**; sin firma → ❓ / PENDING sin cambios |
| Plan de los 74 — [D1_6A_NEXT_74_BATCH_PLAN](data/D1_6A_NEXT_74_BATCH_PLAN.md) | ✅ <ul><li>lotes A–E (15/15/15/15/14);</li><li>dry-run: 74 INSERT, 0 rechazos, nada escrito;</li><li>8 excluidas con su causa exacta</li></ul> |
| Cierre — [D1_6A_COMPLETION_REPORT](data/D1_6A_COMPLETION_REPORT.md) | ✅ |

Sin cambios en Methodology 2026.7, en las reglas PUBLIC/PREVIEW ni en el selector (9 PREVIEW, 0 PUBLIC).

## STEP D1.6 — Free Data Technical Catalog & Private Demo · ✅ ARQUITECTURA + 18 CURADOS · selector sin cambios (2026-10-21)

| Entregable | Estado |
|---|---|
| ADR-019 variante B — [ADR-019](adr/ADR-019-technical-identity-without-confirmed-trim.md) | ✅ **ACCEPTED** (solo arquitectura de curación; no aprueba fuentes ni relaja PREVIEW/PUBLIC) |
| Esquema y migración — [D1_6_TECHNICAL_CURATION_ARCHITECTURE](data/D1_6_TECHNICAL_CURATION_ARCHITECTURE.md) | ✅ `CuratedTechnicalVehicle` / `CuratedAttribute` / `CuratedObservation` (Zod) · `0008_technical_curation` (5 tablas `curated_*`, reversión manual documentada) |
| Repositorio + importador idempotente/reanudable | ✅ transacción por vehículo, ids deterministas, huella por elemento, rechazo de duplicados TAN\|Va\|Ve |
| Primer lote — [D1_6_FIRST_18_IMPORT_REPORT](data/D1_6_FIRST_18_IMPORT_REPORT.md) | ✅ 18/18 curados en `vscar_dev`: 279 observaciones (EEA 104, RDW 175), 69 atributos, 12 valores en conflicto conservados; 2.ª ejecución sin cambios; catálogo existente intacto (9) |
| Derechos S11/S13 — [D1_6_OFFICIAL_SOURCE_RIGHTS_REVIEW](data/D1_6_OFFICIAL_SOURCE_RIGHTS_REVIEW.md) | ✅ revisión + ficha para firma · **sin aprobar** (❓) |
| Demo privada + precio manual — [D1_6_PRIVATE_DEMO_REPORT](data/D1_6_PRIVATE_DEMO_REPORT.md) | ✅ `/internal/catalog` (Basic auth, solo PREVIEW, 404 sin credenciales) · `{lado}_price` en coches nuevos (USER_PROVIDED, Economic Fit sin cambios) |
| Ampliación — [D1_6_92_VARIANT_EXPANSION_PLAN](data/D1_6_92_VARIANT_EXPANSION_PLAN.md) · [D1_6_D2_READINESS](data/D1_6_D2_READINESS.md) · [Import plan v0.2](data/SPAIN_DATASET_IMPORT_PLAN_V0_2.md) | ✅ 92 elegibles (74 pendientes), 3 duplicados a reconciliar, 5 sin RDW |

Resultados:
- 0 generaciones y 0 años-modelo inventados; acabado EXACT solo en #26 (EEA) y #4 (IDAE, pendiente).
- Ningún vehículo curado entra en el selector ni en los motores; PUBLIC 0, PREVIEW 9 (sin cambios).

## STEP D1.5 — Multi-Source Catalog Integration & First Import Readiness · ⚠️ PARTIAL (investigación válida · 0 importables con las reglas aprobadas) (2026-10-16)

| Entregable | Estado |
|---|---|
| S15 Opendatabay CSV completo — [D1_5_OPENDATABAY_FULL_CSV_AUDIT](data/D1_5_OPENDATABAY_FULL_CSV_AUDIT.md) | ✅ 70.823 filas / 78 col / 255 marcas; hasta 2020; derechos ❌ |
| S16 autoseeker `models.csv` — [D1_5_AUTOSEEKER_CSV_AUDIT](data/D1_5_AUTOSEEKER_CSV_AUDIT.md) | ✅ 281 filas; CC BY 4.0 verificada; copia = endpoint publicado; granularidad MODEL 57 / GENERATION 142 / POWERTRAIN 82 |
| S17 OpenEV · S19 Kilowatt — [D1_5_OPEN_EV_GITHUB_AUDIT](data/D1_5_OPEN_EV_GITHUB_AUDIT.md) | ✅ v1.24.0 (1.189 BEV, CDLA-P-2.0) · archivado (1.321, MIT+atribución) |
| S18 VehiclesDB — [D1_5_VEHICLESDB_AUDIT](data/D1_5_VEHICLESDB_AUDIT.md) | ✅ v2026.10.4, taxonomía (100/100 candidatas, disponibles en ES) |
| Matching multi-fuente y matriz FOUND/MATCHED/IDENTITY_VERIFIED/RIGHTS_APPROVED/USABLE — [D1_5_MULTI_SOURCE_MATCHING](data/D1_5_MULTI_SOURCE_MATCHING.md) | ✅ granularidad obligatoria; conflictos conservados |
| 20 / 100 — [D1_5_20_VARIANT_READINESS](data/D1_5_20_VARIANT_READINESS.md) · [D1_5_100_VARIANT_COVERAGE](data/D1_5_100_VARIANT_COVERAGE.md) | ✅ 0 importables hoy; 18/20 y 92/100 aptas para curación técnica **si** se aprueba ADR-019 (B); 0 seleccionables |
| Derechos — [D1_5_RIGHTS_DECISION](data/D1_5_RIGHTS_DECISION.md) | ✅ S15 ❌ · S16–S19 ❓ · ninguna aprobada para PUBLIC |

Resultados:
- Generación verificada 0/20, año-modelo 0/20, acabado EXACT 3/20 (sin cambio).
- Maletero: MATCHED 3/20, verificado 0. 0–100: MATCHED 2/20, verificado 0. Batería, AC y DC: MATCHED 1/20 cada uno (#2, OpenEV), verificados 0.
- Completitud crítica del lote: 54,6 % → 54,6 % utilizable (58,3 % si la investigación fuera utilizable). Valores nuevos compatibles con derechos: 0.
- Conflictos conservados: BYD SEAL ×2; 7 oficial ↔ externo en las 100 (autonomía WLTP EEA vs OpenEV, anchura y Vmax RDW vs S15).
- CSV aportados en `docs/` excluidos de Git (`.gitignore`) y copiados a `data/raw/`.

## STEP D1.4 — Open Automotive Dataset Validation & Enrichment Pilot · ⚠️ SOURCE AUDIT PASS · ENRICHMENT PARTIAL (0 valores reutilizables) (2026-10-16)

| Entregable | Estado |
|---|---|
| Auditoría — [D1_4_OPEN_DATASET_SOURCE_AUDIT](data/D1_4_OPEN_DATASET_SOURCE_AUDIT.md) | ✅ S14 gor3a, S15 Opendatabay, Kaggle, filippos/CarDatabase (NOT FOUND), NHTSA vPIC (US) |
| gor3a v1.0.2 descargado (SHA-256), recuentos reales, paridad JSON/CSV/SQLite, inventario — [D1_4_GOR3A_DATASET_ANALYSIS](data/D1_4_GOR3A_DATASET_ANALYSIS.md) | ✅ 164 · 2.649 · 7.217 · 30.535 (README: 2.621/7.169/30.390) |
| Opendatabay — [D1_4_OPENDATABAY_ANALYSIS](data/D1_4_OPENDATABAY_ANALYSIS.md) | ⛔ BLOCKED: CSV completo tras cuenta; "CC0" vs licencia enlazada no comercial; solo muestra (100 filas) |
| Matching 20 / 100 — [D1_4_TWENTY_VARIANT_MATCHING](data/D1_4_TWENTY_VARIANT_MATCHING.md) · [D1_4_100_VARIANT_COVERAGE](data/D1_4_100_VARIANT_COVERAGE.md) | ✅ niveles L1/L2/L3, falsos positivos, contraste RDW; 0 identidades verificadas |
| Derechos ODbL / autoevolution — [D1_4_RIGHTS_AND_ODBL_ASSESSMENT](data/D1_4_RIGHTS_AND_ODBL_ASSESSMENT.md) | ✅ propuesta para revisión jurídica; S14 ❓, S15 ❌ |
| D2 — [D1_4_D2_READINESS](data/D1_4_D2_READINESS.md) | ✅ 0 curables · ADR-019: recomendación **B** (sigue PROPOSED) |

Resultados:
- 20 D2: STRONG 3 · WEAK 7 · AMBIGUOUS 2 · REJECTED 1 · NOT_FOUND 7. Generación candidata 18 (10 únicas), **verificada 0**. Maletero encontrado 9, 0–100 7; **reutilizables 0**.
- 100: STRONG 25 · WEAK 8 · AMBIGUOUS 17 · REJECTED 6 · NOT_FOUND 44 (lagunas de motor, no de modelo).
- Las "generaciones" de gor3a son "modelo + carrocería + año de inicio": sin código, 0 "facelift", `bodyType` nulo en todas.
- Completitud crítica del lote: 54,6 % → 54,6 %. Valores S14 solo en `data/research/d14/` (fuera de Git); `docs/data/d14/` sin valores.

## STEP D1.3 — Historical Vehicle Catalog Acquisition & Commercial Identity Matching · ⚠️ SOURCE AUDIT PASS · ACQUISITION PARTIAL (restringidas no adquiridas) · ENRICHMENT PARTIAL (2026-10-16)

| Entregable | Estado |
|---|---|
| Auditoría coches.net / km77 / JATO — [D1_3_HISTORICAL_CATALOG_SOURCE_AUDIT](data/D1_3_HISTORICAL_CATALOG_SOURCE_AUDIT.md) · [coches.net](data/D1_3_COCHES_NET_COVERAGE.md) · [km77](data/D1_3_KM77_COVERAGE.md) · [JATO](data/D1_3_JATO_ACCESS_AND_LICENSING.md) | ✅ términos, robots y cobertura por muestra; ninguna permite extraer/almacenar/reutilizar |
| Correspondencia comercial↔técnica — [D1_3_COMMERCIAL_IDENTITY_MATCHING](data/D1_3_COMMERCIAL_IDENTITY_MATCHING.md) · `catalog-references.ts` | ✅ 19 referencias sin valores; 0 CONFIRMED (ninguna ficha publica TAN) |
| Flujo A: Traficom S13 (CC BY 4.0) — lector ZIP + agregación por clave exacta — [D1_3_DATA_ACQUISITION_DECISION](data/D1_3_DATA_ACQUISITION_DECISION.md) | ✅ adquirido (SHA-256, manifiestos); S13 ❓ en la matriz |
| Flujo B: coches.net, km77, JATO | ✅ **no adquiridos** (solo referencias); RFI JATO preparado, no enviado |
| Lote D2 — [D1_3_D2_READINESS](data/D1_3_D2_READINESS.md) | ✅ clasificado · **0 importables** · ADR-019: recomendación **C** (sigue PROPOSED, no implementado) |

Resultados:
- Catálogos: fichas encontradas en 9 / 9 candidatas buscadas (km77 9, coches.net 7); correspondencias: 0 CONFIRMED, 5 COMPATIBLE, 3 AMBIGUOUS, 1 REJECTED (Model Y AWD vs RDW RWD).
- Generación y año-modelo: **0 / 20** también en los catálogos (solo periodos y años de URL).
- Traficom: 74 / 100 claves con vehículos FI (14.974); caja de cambios evidenciada 3 → **11 / 20** (3 con muestra pequeña), carrocería 2 → **4 / 20**.
- Completitud crítica del lote: 54,6 % → 54,6 % (nada utilizable de los catálogos).
- Ready for D2: **NO** — el bloqueo vinculante es de derechos (licencia JATO / autorización de fabricantes), además de generación y año-modelo.

## STEP D1.2 — Commercial Identity Resolution & Rights Clearance · ⚠️ SOURCE RESEARCH PASS · COMMERCIAL IDENTITY UNLOCK PARTIAL (2026-10-16)

| Entregable | Estado |
|---|---|
| Identidad comercial separada de la técnica (mismo `IdentityStatus`), validador anti-invención (cada valor literal en un texto oficial citado) — [D1_2_COMMERCIAL_IDENTITY_AUDIT_V0_1](data/D1_2_COMMERCIAL_IDENTITY_AUDIT_V0_1.md) | ✅ |
| Curación versionada [`d12/commercial-identity-v1.json`](data/d12/commercial-identity-v1.json): 22 entradas válidas (D2 + Golf del catálogo) | ✅ |
| Alternativas para los campos que faltan — [D1_2_MANUFACTURER_DATA_ALTERNATIVES_V0_1](data/D1_2_MANUFACTURER_DATA_ALTERNATIVES_V0_1.md) | ✅ ninguna fuente abierta para maletero, 0–100, garantía, batería bruta, CS PHEV |
| Expediente RDW S11 — [D1_2_RDW_RIGHTS_APPROVAL_DOSSIER](data/D1_2_RDW_RIGHTS_APPROVAL_DOSSIER.md) | ✅ **READY_FOR_HUMAN_APPROVAL** (matriz sin cambios: ❓) |
| BYD SEAL — [D1_2_BYD_SEAL_CONFLICT_RESOLUTION](data/D1_2_BYD_SEAL_CONFLICT_RESOLUTION.md) | ⚠️ conflicto UNRESOLVED (base de medida distinta probable); duplicado DC-08 detectado |
| Duplicados: estrategia canónica `catalogOverlap` + corrección versionada [`d12/catalog-overlap-v1.json`](data/d12/catalog-overlap-v1.json) | ✅ |
| Lote D2 — [D1_2_D2_BATCH_READINESS_V0_1](data/D1_2_D2_BATCH_READINESS_V0_1.md) · propuesta [ADR-019](adr/ADR-019-technical-identity-without-confirmed-trim.md) (PROPOSED) | ✅ clasificado · 0 importables hoy |

Resultados:
- Comercial EXACT en el lote D2: **2 → 3** (nuevo: Peugeot 308 #26, designación oficial única 536/536, CC BY). PARTIAL 17, UNCONFIRMED 0. Los Golf 2018 del catálogo pasan de EXACT a **PARTIAL** comercial (el acabado "Advance" era inferencia).
- RDW `handelsbenaming` no es identidad comercial: lista todos los nombres permitidos (BYD > 80; Peugeot tipo M = 3008 + 5008).
- Una versión técnica se vende con varios acabados (3008 PHEV: 5) → el acabado no es 1:1 con la variante técnica.
- **0 / 20 importables** con las reglas vigentes: `generation_code` y `model_year` sin fuente oficial abierta.
- BYD SEAL: los valores son iguales en todas las extensiones y revisiones (no es revisión); RDW publica un límite de rango ~4 % mejor; conflicto abierto.
- DC-08 no guarda TAN (solo Va/Ve): corrección del diagnóstico de D1.1.

## STEP D1.1 — RDW + GIAVEH Technical Data Enrichment Pilot · ⚠️ SOURCE AUDIT PASS · ENRICHMENT PARTIAL (2026-10-16)

| Entregable | Estado |
|---|---|
| RDW: 12 conjuntos TGK identificados, 8 usados, glosario oficial, licencia por recurso — [RDW_SOURCE_AUDIT_V0_1](data/RDW_SOURCE_AUDIT_V0_1.md) | ✅ |
| GIAVEH: CSV + API inspeccionados; **solo TAN/tipo/marca, sin datos técnicos** — [GIAVEH_SOURCE_AUDIT_V0_1](data/GIAVEH_SOURCE_AUDIT_V0_1.md) | ✅ (no enriquece) |
| Adapter RDW (`data-connectors/src/rdw`): SoQL seguro, paginación determinista, 429 con Retry-After, normalización, match por TAN completo + Va + Ve, mapeo v1 con procedencia; lector GIAVEH mínimo | ✅ |
| Identidad RDW ↔ EEA — [RDW_EEA_IDENTITY_MATCH_V0_1](data/RDW_EEA_IDENTITY_MATCH_V0_1.md) | ✅ |
| Piloto de 10 — [D1_1_ENRICHMENT_PILOT_V0_1](data/D1_1_ENRICHMENT_PILOT_V0_1.md) | ⚠️ técnico 9/10 EXACT; comercial 4 → 4 |
| Estimación sobre 100 — [D1_1_100_VARIANT_EXPANSION_ESTIMATE](data/D1_1_100_VARIANT_EXPANSION_ESTIMATE.md) | ✅ medido (RDW EXACT 95/100) |
| DATA_RIGHTS_MATRIX + `SOURCE_RIGHTS`: S11 RDW y S12 GIAVEH registradas con ❓ (PUBLIC sin cambios) | ✅ |

Resultados:
- **Completitud crítica** (misma función que D1): piloto 18,7 % → 22,8 % (EEA + regla DGT existente) → **50,8 %** con RDW; lista de 100: 17,6 % → 21,5 % → **54,3 %**.
- **Calidad real** (`@vscar/quality`) sobre Golf 2018 `*33`/`*35` del catálogo: completitud 9,5 % → **26,7 %**, Eco pasa a AVAILABLE (etiqueta `C` con la norma Euro de RDW); Size/Practicality solo fallan por maletero.
- RDW **no** confirma identidad comercial (trim): EXACT 4 → 4. Faltan siempre maletero, 0–100, precio y garantía (S08). Consumo CS de PHEV: 1 de 10.
- 4 conflictos EEA ↔ RDW conservados (BYD SEAL: consumo eléctrico y autonomía). RDW rellena campos "NEDC" en homologaciones WLTP (anomalía: ignorados).
- Corrección documentada (no aplicada a D1): el candidato D1 #2 (BYD SEAL `SE2R1C`/`2NTE5F002NL1`) es la misma identidad que DC-08 del catálogo. *(Diagnóstico corregido en D1.2: DC-08 no guarda TAN en absoluto, solo Va/Ve.)*

Siguiente: D2 condicionado a CoC/ITV (identidad comercial), decisión S08 y aprobación humana de S11.

## STEP D1 — Spain Vehicle Dataset Acquisition & Rights Validation · ⚠️ PARTIAL (2026-10-16)

Investigación, adquisición y evaluación de datos para el catálogo España. **Sin importación, sin cambios de motores, metodología (2026.7), web, canales ni derechos.**

| Entregable | Estado |
|---|---|
| Fuentes inventariadas y verificadas (EEA discodata, IDAE CSV, 11 fabricantes, Euro NCAP, DGT) — [SPAIN_DATASET_SOURCES_V0_1](data/SPAIN_DATASET_SOURCES_V0_1.md) | ✅ |
| Adquisición reproducible: 104 brutos con SHA-256 + manifiestos ([`d1/acquisition-manifests.json`](data/d1/acquisition-manifests.json)); brutos fuera de Git | ✅ |
| Inventario real de columnas EEA (7 años) e IDAE + schema drift + mapeo a SpecKeys — [EEA_IDAE_SCHEMA_MAPPING_V0_1](data/EEA_IDAE_SCHEMA_MAPPING_V0_1.md) | ✅ |
| Adapter IDAE nuevo (`data-connectors/src/idae`), encuesta EEA (`eea/survey.ts`), CSV en streaming, inventario, manifiestos; cliente EEA con POST para consultas largas | ✅ |
| `@vscar/curation`: deduplicación (TAN/Va/Ve → identidad → clúster, NEDC ≠ WLTP), identidad EXACT/PARTIAL/AMBIGUOUS/UNCONFIRMED/CONFLICTED, cobertura con claves críticas existentes, prioridad editorial, data vs publication readiness, JSONL validado | ✅ |
| 100 candidatos en 25 familias + piloto de 20 — [SPAIN_100_VARIANT_CANDIDATES_V0_1](data/SPAIN_100_VARIANT_CANDIDATES_V0_1.md) | ✅ candidatos · ⚠️ **4 identidades EXACT** |
| Cobertura y capacidad para comparar — [SPAIN_DATASET_COVERAGE_V0_1](data/SPAIN_DATASET_COVERAGE_V0_1.md) | ✅ (0 candidatas con claves críticas completas) |
| Derechos — [SPAIN_DATA_RIGHTS_AUDIT_V0_1](data/SPAIN_DATA_RIGHTS_AUDIT_V0_1.md); DATA_RIGHTS_MATRIX con evidencia, **estados sin cambios** | ✅ evidencia · ⏳ decisión legal |
| Plan D2 — [SPAIN_DATASET_IMPORT_PLAN_V0_1](data/SPAIN_DATASET_IMPORT_PLAN_V0_1.md) · objetivo 100 registrado en [ADR-018](adr/ADR-018-catalog-target-100-curated-incremental.md) | ✅ |

Hallazgos principales:
- **Identidad**: de 1.907 clústeres técnicos, solo 5 tienen identidad EXACT demostrable (Golf 2018 `*33`/`*35` ya curados; 3 BYD SEAL por código IDAE = Va/Ve). El resto necesita CoC/ficha técnica.
- **Datos**: EEA + IDAE cubren identidad técnica, CO₂ y energía; **precio, dimensiones, maletero, plazas, 0–100, carga y garantía solo vienen del fabricante** → 0 candidatas con claves críticas completas.
- **IDAE**: las etiquetas de CO₂ del CSV están intercambiadas (contraste con EEA en 12.504 pares) y `Consumo_Mixto_WLTP` es un punto medio calculado → UNMAPPED.
- **EEA**: sin `TAN` en 2012 (2010–2014 sin identidad EEA); CO₂ ≤ 2016 en `E (g/km)` (no leído por el adapter v0.2 → propuesta v3).
- **Derechos**: EEA CC BY 4.0; IDAE y los 8 fabricantes accesibles restringen reutilización/uso comercial sin autorización; BMW, Tesla y Peugeot no accesibles. **PUBLIC gate sin cambios: 0 elegibles.**
- MHEV no es separable con fuentes públicas (EEA homologa MHEV como ICE o NOVC_HEV).

Siguiente: **Step D2 — First 20 Curated Variants** (CONDICIONAL: CoC/fichas para EXACT y decisión sobre derechos S08 para completar datos; todo en PREVIEW).

## STEP 8c — New/Used Decision Experience Hardening · ✅ PASS (2026-10-16)

Estabilización del Alpha: auditoría de lo que LEE la persona en NEW/NEW, NEW/USED, USED/NEW y USED/USED (HTML real ES/EN + 15 casos dorados). Sin cambio de metodología (2026.7) ni del Economic Fit (sigue en coste de uso). Detalle: [NEW_USED_DECISION_AUDIT_V0_1](used/NEW_USED_DECISION_AUDIT_V0_1.md) · [NEW_USED_GOLDEN_CASES_V0_1](used/NEW_USED_GOLDEN_CASES_V0_1.md).

| Corrección | Tipo |
|---|---|
| Misma variant sin título/descripción/OG (metadata cargada sin las condiciones) | bug de integración |
| Dos `<main>` montados tras cambiar la unidad con la misma ruta (`key` con condiciones) | bug de integración |
| Nombres "Golf A / B" → alias de presentación por condición (UI y mensajes del engine) | claridad |
| Tres conceptos separados: desembolso inicial · coste de uso (Economic Fit) · coste conocido (no es TCO) + break-even del engine (`NO_BREAK_EVEN` sin ahorro; nunca fabricado) + costes conocidos no comparables con ciclos distintos | presentación económica |
| Why Not/tradeoffs solo con hechos conocidos; los huecos van a verificación; sin "solo diferencias menores" junto a señales de la unidad (cambio de salida del engine **solo para usados**) | unknown ≠ bad |
| Información de la unidad ≠ confianza de la recomendación (chip, nota y vocabulario propios) | claridad |
| Verificación agrupada por coche; foco en el resultado tras cambiar una unidad | claridad / accesibilidad |
| Fecha de evaluación explicada + "Actualizar análisis a hoy" (preserva coches, hechos y escenario; dice qué cambia; nunca automático) | reproducibilidad |
| Índice de capítulos: una actualización no urgente por callback (retardo de entrada) | INP |

Verificación: `pnpm check` en verde, **708 tests** (3 en vivo + 1 de medición omitidos) con MySQL; **E2E 31/31** (4 nuevos). JS inicial comparación **155,9 KB**. LCP ≤ 0,99 s escritorio / ≤ 0,58 s móvil ×4; CLS 0; INP comparación p75 56–168 ms móvil ×4 según ronda (peor 224 ms en 1 de 15 cargas); pico de 296 ms de 8b no reproducido en 48 cargas perfiladas (peor 152 ms). Solo emulación: sin móvil físico.

Siguiente: preparación del despliegue Alpha PREVIEW (`VSCAR_SITE_URL`, canal); prueba en móvil físico; catálogo PUBLIC en el data workstream.

## STEP 8b — Used Vehicle Input + New/Used UX · ✅ PASS (2026-10-15)

Una sola experiencia para NUEVO/NUEVO, NUEVO/USADO, USADO/NUEVO y USADO/USADO: Marca → Modelo → Año → Versión → **¿Nuevo o Usado?** → datos de la unidad → revisión. Los hechos de la unidad viajan en la URL (contrato `u=1`, ADR-017) y llegan al **único** `createDecisionPipeline` en servidor, cliente y worker. Sin cuentas, sin persistencia, sin marketplace.

| Entregable | Estado |
|---|---|
| Paso Nuevo/Usado tras la versión (también desde la búsqueda); misma ReferenceVariant permitida si alguno es usado | ✅ |
| Formulario en dos niveles, todo opcional (precio, km, matriculación mes/año · garantía, historial, estado, SOH si aplica, daños); validación al avanzar con error por campo; cambiar de coche vacía los datos | ✅ |
| Identidad de participante (`subjectId`): Golf nuevo vs Golf usado son dos participantes; usados idénticos se desambiguan | ✅ |
| Resultado: insignias A/B NUEVO/USADO, resumen de la unidad, **Compra y coste conocido**, capítulo **Este usado** (información, señales ATTENTION / INFORMATION_GAP / NOTE, verificación, procedencia) | ✅ |
| Requisitos para usados en "Cambiar tu uso" (km, antigüedad, SOH, garantía) + **historial completo** (FULL → PASS · parcial/ausente → FAIL · desconocido → UNCONFIRMED) | ✅ |
| URL compartible y determinista (Zod), swap con los hechos siguiendo a su coche, idioma y escenario conservados, URL rota sin 500 | ✅ |
| SEO: canonical/OG del par base, vistas con hechos de usado `noindex` sin JSON-LD, misma variant sin canonical; PREVIEW/PUBLIC sin cambios | ✅ |
| i18n ES/EN al 100 % (namespace `used`, requisitos, criterios, rama `flag` en plantillas de requisitos) | ✅ |
| Docs: [USED_INPUT_UX_V0_1](used/USED_INPUT_UX_V0_1.md) · [USED_COMPARISON_INTEGRATION_V0_1](used/USED_COMPARISON_INTEGRATION_V0_1.md) · [ADR-017](adr/ADR-017-used-facts-in-url-and-participant-identity.md) | ✅ |

Metodología **sin cambios (2026.7)**: el historial completo es un requisito declarado por el usuario (contrato de requisitos existente) y `registration_month` solo afina la precisión de la misma regla de edad. Golden new/new de 8a idénticos.

Verificación: `pnpm check` en verde, **685 tests** (3 en vivo omitidos) con MySQL (+39); **E2E 27/27** (8 nuevos: flujos A–F, cambio de unidad, URL malformada). JS inicial comparación **155,8 KB** (+1,8), home 153,8 KB. LCP ≤ 1,24 s; CLS 0; INP p75 72 ms escritorio / 128 ms móvil ×4 (peor carga móvil 296 ms, 1 de 5, mismo patrón que 7c); INP del formulario p75 48 / 128 ms, peor 136 ms.

Hallazgos:
- `computeDecision` llamaba a `recommend(input)` sin los ajustes del pipeline: ahora pasa `pipeline.usedAdjustments` (new/new idéntico).
- `@vscar/methodology` entraba en el JS inicial (172,6 KB) por la huella de la identidad: movida a `used-subject.ts` (solo servidor).
- Abrir el selector en móvil ×4 costaba 208–384 ms desde 7b.2: ahora en `startTransition` (40–88 ms).
- E2E con un worker por núcleo saturaba el único `next start`: configuración `workers: 2`.
- Con la misma variant en los dos lados, los nombres de engine son "Volkswagen Golf A / B" (neutros respecto al idioma); la UI añade NUEVO/USADO. A pulir en 8c.

Siguiente: Step 8c (endurecer la experiencia de decisión nuevo/usado: nombres por condición, explicación de `eval`, señales en el resumen) y preparación del despliegue Alpha PREVIEW.

## STEP 8a — Used Adjustment Engine v0.1 · ✅ PASS (2026-10-14)

`@vscar/used-adjustment`: capa pura y determinista que añade a una ReferenceVariant los hechos de una unidad usada concreta, sin duplicar ni reescribir engines. **ReferenceVariant + UsedVehicleInstance → Used Adjustment → mismos engines** (un solo `createDecisionPipeline`). Sin UI, marketplace, scraping, precio de mercado, historial externo ni VIN.

| Entregable | Estado |
|---|---|
| Contratos: `UsedVehicleInstance` (+ `registration_date`), `DecisionSubject` (REFERENCE_VARIANT / USED_INSTANCE con `subjectId` propio), `UsedAdjustmentResult` (sin "used score") | ✅ |
| Edad (`calculateVehicleAge`, fecha de evaluación explícita), km relativos a la edad, garantía restante (declarada/calculada), salud de batería (observación, nunca autonomía), estado/ITV, daño declarado | ✅ |
| Precio pedido → precio de compra efectivo (participante USED de Economics, sin cálculo nuevo) | ✅ |
| Used Information Confidence (HIGH/MEDIUM/LOW + motivos + verificación; N/A explícito; tope MEDIUM en BEV sin SOH) · Ownership Signals (ATTENTION / INFORMATION_GAP / NOTE) · Verification Requirements · trazabilidad `ruleCode` + `sourceFields` | ✅ |
| Deal Breakers de usados (`maxMileageKm`, `maxAgeYears`, `minBatteryHealthPct`, `minWarrantyRemainingMonths`): solo en sujetos usados; desconocido → UNCONFIRMED | ✅ |
| Decision: Why Not / verificación con `subject: USED_INSTANCE`; Recommendation Confidence con la información de la unidad recomendada | ✅ |
| i18n: 41 claves `used.*` + 2 de requisito + 4 criterios + unidad `months`, ES/EN al 100 % | ✅ |
| Docs: [USED_ADJUSTMENT_V0_1](used/USED_ADJUSTMENT_V0_1.md) · [USED_INFORMATION_CONFIDENCE_V0_1](used/USED_INFORMATION_CONFIDENCE_V0_1.md) · [ADR-016](adr/ADR-016-used-adjustment-layer.md) | ✅ |

Metodología **2026.6 → 2026.7** (`used-adjustment-v1`, provisional): son reglas nuevas que producen resultados. Sin entrada de usado, la salida new/new es **idéntica** (snapshot completo previo a 8a, textos incluidos); solo cambian la versión y las huellas.

Verificación: `pnpm check` en verde, **646 tests** (3 en vivo omitidos), con MySQL; +89 nuevos (used-adjustment 42, golden de usados 21, regresión completa 9, deal breakers 6, metodología 5, schema 3, web i18n 3). `adjustUsedVehicle` p50 0,17 ms · p95 0,28 ms. JS inicial de la web sin cambios (154,0 KB).

Hallazgos:
- `decide()` deduplicaba por id de variante: "nuevo vs usado del mismo modelo" era imposible. Ahora el sujeto tiene identidad propia.
- `usedAdjustments` seguía el orden de entrada (rompía la simetría A/B al serializar): ahora se ordena por sujeto.
- Economic Fit sigue en coste de uso: la ventaja de compra del usado aparece en la vista de costes conocidos, el break-even y el presupuesto, no en el ganador económico.
- La referencia de 15.000 km/año es provisional (escenario canónico), no una media medida.

Siguiente: Step 8b (entrada de la unidad usada + UX nuevo/usado), con el requisito categórico de historial completo y la presentación de señales.

## STEP 7c — Shareable Comparison + Rich Comparison Pages · ✅ PASS (2026-10-14)

Cada comparación es una página estable, compartible y preparada para SEO. La **identidad de la página** (par + mercado) está separada del **escenario del usuario** (query): canonical, hreflang, OG, robots y sitemap representan la comparación base. Sin cambios en engines, identidad, derechos ni metodología.

| Entregable | Estado |
|---|---|
| Compartir: URL actual completa por Web Share API o copia (aviso "Enlace copiado" 2,5 s, `aria-live`); reconstrucción en otro navegador: mismo par, mercado, escenario y decisión | ✅ |
| SEO (`server/seo.ts`): metadata ES/EN, canonical sin escenario por idioma y en orden determinista (A-vs-B = B-vs-A), hreflang + x-default (`es-es`), Open Graph + Twitter, imagen OG generada y estable (Canonical Comparison Scenario `ES-2026.10`), JSON-LD honesto (WebPage + BreadcrumbList + ItemList, sin ratings) | ✅ |
| Indexabilidad: PREVIEW `noindex, nofollow` en todo; PUBLIC solo pares editoriales con coches públicos; `sitemap.xml` y `robots.txt` por canal (sin URLs de fixtures, sin bloquear páginas) | ✅ |
| Página: `buildComparisonChapters` (capítulos técnico y práctico cuando el engine los hace relevantes; 6–9), detalle con filas `MetricCompare` (cifras grandes, diferencia + "Por delante", para tu uso), horizonte y "Vista de costes conocidos", barra de vehículos fija (CSS), migas, saltos al resultado y a los detalles, fecha de datos y enlace a Metodología (ampliada), CSS de impresión | ✅ |
| Docs: [SHAREABLE_COMPARISONS_V0_1](web/SHAREABLE_COMPARISONS_V0_1.md) · [SEO_FOUNDATION_V0_1](web/SEO_FOUNDATION_V0_1.md) · [ADR-015](adr/ADR-015-comparison-url-and-indexability.md) | ✅ |

Verificación:
- `pnpm check` en verde: **566 tests** (3 en vivo omitidos), con MySQL; 21 nuevos de SEO y capítulos.
- **E2E**: compartir y reconstruir, Web Share, PREVIEW noindex, canonical al invertir el par, OG estable, sin JS, móvil a 390 px.
- JS inicial de la comparación **154,0 KB** (192,6 con polyfills).
- LCP ≤ 1,23 s; CLS 0; INP p75 104 ms escritorio / 72 ms móvil ×4.

Hallazgos:
- El contrato de mensajes (7a.1) hace variar la longitud del titular y de la explicación entre empate y elegido. En móvil, el recálculo llegaba más de 500 ms después del clic y sumaba CLS 0,055: se reservan líneas en pantallas estrechas y el CLS vuelve a 0.
- El delta "+2,4 kWh/100 km · Tesla Model 3" sugería lo contrario en métricas donde menos es mejor: ahora es la diferencia sin signo + "Por delante: …".
- INP: la peor carga móvil (×4) llegó a 296 ms en una de cinco, por la primera interacción durante la carga de chunks visuales diferidos (procesamiento real 2–9 ms). El p75 está dentro de presupuesto. Vigilar en dispositivos reales.
- PUBLIC sigue en 0 coches: hoy nada es indexable. La lógica PUBLIC está probada con un catálogo **sintético** en tests.

Siguiente:
- Preparación del despliegue Alpha (VPS, `VSCAR_SITE_URL`, canal).
- En el data workstream: derechos S08/S02/S04, identidades `EXACT` e imágenes con derechos, para que exista un catálogo PUBLIC.
- Posible 7d: páginas mínimas de modelo si aportan navegación.

## STEP 4 — Primera calculadora pública · ⏳
