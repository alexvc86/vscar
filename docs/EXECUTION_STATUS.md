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

## STEP 4 — Primera calculadora pública · ⏳
