# VScar

Plataforma de decisión para elegir coche — nuevo o usado — con los cálculos a la vista.
Plan maestro: [docs/VSCAR_MASTER_PLAN.md](docs/VSCAR_MASTER_PLAN.md) (v1.0 baseline) · Estado: [docs/EXECUTION_STATUS.md](docs/EXECUTION_STATUS.md).

## Estructura (Step D1.6a)

| Paquete | Qué es | I/O |
|---|---|---|
| [`packages/vehicle-schema`](packages/vehicle-schema) | SpecKey Catalog v0.2 en código: Zod + tipos (SourcedValue, Homologation, ReferenceVariant, precios, seguridad, reglas de claves críticas) + datos de mercado normalizados (`EnergyPriceObservation`) | ninguno |
| [`packages/methodology`](packages/methodology) | Methodology 2026.7: curvas de utilidad, Meaningful Difference / For You, Used Information Confidence, reglas de rangos, presets, sensibilidad, regla DGT, umbrales y pesos, reglas de datos de mercado de energía (frescura, ventana, referencia), reglas económicas (eficiencia de carga, redondeo `money-v1`, confianza, sensibilidad), reglas de comparación (`comparison-v1`), reglas del Alpha Decision Engine (`alpha-decision-v1`) y de Why Not / robustez / confianza de la recomendación, y reglas de usados (`used-adjustment-v1`, Step 8a) (provisionales) | ninguno (apto navegador) |
| [`packages/quality`](packages/quality) | Uso por engines, plausibilidad (PASS/WARNING/BLOCK), Conflict Engine, elegibilidad por categoría, completitud; **publicación** (Step 7b): derechos por fuente según la DATA_RIGHTS_MATRIX, canales PUBLIC/PREVIEW, disponibilidad por variant y filtrado por campo | ninguno |
| [`packages/data-connectors`](packages/data-connectors) | Adapters de fuentes: catálogos abiertos de investigación (Opendatabay/Kaggle, autoseeker.eu, OpenEV Data, VehiclesDB, Kilowatt; granularidad MODEL→TECHNICAL_VARIANT, Step D1.5) · gor3a/vehicle-makes-models (dataset de investigación ODbL, release fijada, paridad JSON/CSV, Step D1.4) · Traficom (registro de vehículos de Finlandia, CC BY 4.0, ZIP leído en streaming y agregado solo por TAN + Va + Ve, Step D1.3) · RDW (registro de homologaciones TGK de Países Bajos, match por TAN + Va + Ve, Step D1.1) · lector GIAVEH (directorio de TAN) · IDAE (CSV histórico en streaming, Step D1) · encuesta EEA para curación · EEA (discodata) → raw ingest con hash → normalización → emparejamiento por homologación → candidatos DRAFT · MITECO (precios de carburantes) → medianas por zona fiscal/CCAA/provincia · ESIOS (PVPC) → media diaria por zona tarifaria; ambos como `EnergyPriceObservation` | red + filesystem (nunca MySQL) |
| [`packages/market-context`](packages/market-context) | Energy Market Context v0.1: precio de **referencia** de carburante (zona fiscal) y electricidad (PVPC, media diaria) para mercado/región/fecha, con frescura y procedencia; `EnergyScenario` (supuestos del usuario) separado. No conoce fuentes ni base de datos; no calcula costes de coche | ninguno (lee por puerto `EnergyPriceReader`) |
| [`packages/economics-engine`](packages/economics-engine) | Economics Engine v0.1: €/100 km, coste de uso anual y a 1/3/5/N años, coste de propiedad (completo o vista de costes conocidos), PHEV combinado (nunca WLTP ponderado), rangos, confianza, sensibilidad determinista, break-even y deltas; importes en céntimos. Doc: [docs/economics/ECONOMICS_ENGINE_V0_1.md](docs/economics/ECONOMICS_ENGINE_V0_1.md) | ninguno |
| [`packages/comparison-engine`](packages/comparison-engine) | Comparison Engine v0.1: deal breakers (PASS/FAIL/UNKNOWN), comparación por métrica (diferencia bruta · Meaningful Difference · Meaningful For You), rangos, ciclos/bases, comparación económica sobre `EconomicResult` (sin recalcular), resúmenes por categoría y confianza de datos. **Sin winner ni puntuación global.** Doc: [docs/comparison/COMPARISON_ENGINE_V0_1.md](docs/comparison/COMPARISON_ENGINE_V0_1.md) | ninguno |
| [`packages/decision-engine`](packages/decision-engine) | Alpha Decision Engine v0.1 (**solo decisión Alpha**): Technical Capability, Economic Fit @ horizonte, Practical Fit (PASS / PASS_WITH_COMPROMISES / UNCONFIRMED / FAIL), prioridades simples COST/SPACE/PERFORMANCE y Alpha Best For You, como resultados separados; Step 6c: Why Not, tradeoffs, verificación pendiente, Result Robustness (bisección acotada) y Recommendation Confidence, con mensajes `messageKey` + `params` (i18n). Consume `ComparisonResult` + `EconomicResult` sin recalcular; `createDecisionPipeline` orquesta los engines para re-evaluar escenarios. **Preference Fit y Personal Fit completos: diferidos a MVP.** Doc: [docs/decision/ALPHA_DECISION_ENGINE_V0_1.md](docs/decision/ALPHA_DECISION_ENGINE_V0_1.md) | ninguno |
| [`packages/used-adjustment`](packages/used-adjustment) | Used Adjustment v0.1 (Step 8a): ReferenceVariant + `UsedVehicleInstance` → precio de compra efectivo, sujeto `USED_INSTANCE`, Used Information Confidence, Ownership Signals y verificación (`messageKey` + `params`). Sin valor de mercado, depreciación, probabilidades ni degradación de autonomía; nunca toca specs. Lo ejecuta `createDecisionPipeline` (un solo camino). Doc: [docs/used/USED_ADJUSTMENT_V0_1.md](docs/used/USED_ADJUSTMENT_V0_1.md) | ninguno (apto navegador) |
| [`packages/curation`](packages/curation) | Step D1: candidatos de curación del catálogo España a partir de la encuesta EEA y el CSV de IDAE — deduplicación por homologación, identidad (EXACT/PARTIAL/AMBIGUOUS/UNCONFIRMED/CONFLICTED), cobertura con claves críticas, prioridad editorial, data vs publication readiness, `curation_candidates.jsonl`. Scripts `d1-acquire.ts` / `d11-acquire.ts` / `d12-acquire.ts` / `d14-acquire.ts` (red) y `d1-build.ts` / `d11-build.ts` / `d12-build.ts` / `d13-build.ts` / `d14-build.ts` / `d15-build.ts` / `d16-build.ts` (offline, deterministas); capa de **curación técnica** (ADR-019 B): plan `d16-build.ts` + importación idempotente `technical-import.ts` (@vscar/db) a `vscar_dev` (Step D1.6, [docs/data/D1_6_TECHNICAL_CURATION_ARCHITECTURE.md](docs/data/D1_6_TECHNICAL_CURATION_ARCHITECTURE.md)); integración multi-fuente con matriz FOUND/MATCHED/IDENTITY_VERIFIED/RIGHTS_APPROVED/USABLE y niveles Research → Curated Technical → Selectable (Step D1.5, [docs/data/D1_5_20_VARIANT_READINESS.md](docs/data/D1_5_20_VARIANT_READINESS.md)); matching con datasets abiertos por niveles L1/L2/L3 sin promover valores (Step D1.4, [docs/data/D1_4_D2_READINESS.md](docs/data/D1_4_D2_READINESS.md)); referencias a catálogos restringidos sin valores y lote D2 con evidencia Traficom (Step D1.3, [docs/data/D1_3_D2_READINESS.md](docs/data/D1_3_D2_READINESS.md)); identidad comercial con validador anti-invención y duplicados canónicos (Step D1.2, [docs/data/D1_2_D2_BATCH_READINESS_V0_1.md](docs/data/D1_2_D2_BATCH_READINESS_V0_1.md)); enriquecimiento RDW con medición antes/después (Step D1.1, [docs/data/D1_1_ENRICHMENT_PILOT_V0_1.md](docs/data/D1_1_ENRICHMENT_PILOT_V0_1.md)). **No importa ni escribe en MySQL.** Docs: [docs/data/SPAIN_100_VARIANT_CANDIDATES_V0_1.md](docs/data/SPAIN_100_VARIANT_CANDIDATES_V0_1.md) | red + filesystem (nunca MySQL) |
| [`packages/db`](packages/db) | Drizzle ORM (MySQL 8), migraciones (`@vscar/db/migrations`), repositorio, `CatalogReader` de solo lectura para la web (búsqueda parametrizada sin acentos, slugs y alias, huella del catálogo), cola `jobs` (lock atómico, reintentos, idempotencia). **Único paquete que habla con MySQL**. `@vscar/db/testing`: base de test aislada · repositorio de **curación técnica** (`curated_*`, migración 0008: vehículos por TAN+Va+Ve, observaciones con derechos/calidad/conflicto, importación idempotente y reanudable; Step D1.6) · migración 0009 (Step D1.6a): restricciones `CHECK`/UNIQUE en MySQL, dry-run, actualizaciones solo explícitas, bloqueo contra importaciones simultáneas y auditoría de solo lectura (`scripts/technical-audit.ts`) | MySQL |
| [`apps/worker`](apps/worker) | VScarWorker: proceso Node (NSSM) que ejecuta `EEA_IMPORT`, `MITECO_IMPORT`, `ESIOS_IMPORT`, `QUALITY_CHECK`, `CONFLICT_SCAN`; health en 127.0.0.1:8180; CLI de encolado para Task Scheduler. Operación: [docs/ops/VSCAR_WORKER_WINDOWS.md](docs/ops/VSCAR_WORKER_WINDOWS.md) | MySQL (vía `@vscar/db`) + red + filesystem |
| [`fixtures`](fixtures) | Seis casos de validación técnica derivados de Dataset Core v0.1 (no es dataset publicable) | ninguno |

Regla de arquitectura (ADR-002): `vehicle-schema`, `methodology`, `quality`, `data-connectors`, `market-context` y cualquier `*-engine` no pueden importar `@vscar/db`, `mysql2` ni `drizzle-orm`; `market-context`, los `*-engine` y `used-adjustment` tampoco pueden importar `@vscar/data-connectors`, `@vscar/worker` ni módulos `node:*` (ESLint lo impide).

## Desarrollo

Requisitos: Node ≥ 22. pnpm se usa vía corepack sin instalación global:

```sh
corepack pnpm install
corepack pnpm check        # lint + typecheck + tests
```

Tests MySQL: define `VSCAR_TEST_DATABASE_URL` en el `.env` raíz (ver [.env.example](.env.example)); la base debe terminar en `_test` porque los tests borran y recrean sus tablas. `corepack pnpm test` y `check` cargan el `.env` (`node --env-file-if-exists`); sin la variable, los tests de MySQL se omiten.

Base de desarrollo de la web: `corepack pnpm db:dev` (migraciones + Dataset Core en la base de `DATABASE_URL`, que debe terminar en `_dev`).

Capa de curación técnica (Steps D1.6 / D1.6a, solo bases `_dev`/`_test`; detalle en [D1_6A_NEXT_74_BATCH_PLAN](docs/data/D1_6A_NEXT_74_BATCH_PLAN.md)):

```sh
node packages/curation/scripts/d16-build.ts                                    # planes deterministas (data/curation/, fuera de Git)
node --env-file=.env packages/db/scripts/technical-import.ts --dry-run --plan data/curation/d16a/plan-batch-A.json   # valida sin escribir
node --env-file=.env packages/db/scripts/technical-import.ts --plan <plan>      # importa (doble ejecución + catálogo intacto); --allow-update para reescribir
node --env-file=.env packages/db/scripts/technical-audit.ts                     # auditoría de solo lectura
```

Benchmark controlado del Used Adjustment (en solitario, fuera de la suite paralela): `corepack pnpm --filter @vscar/used-adjustment bench`.

Migraciones: `corepack pnpm db:generate` (drizzle-kit, sin conexión) → `packages/db/drizzle/`.

Tests en vivo (opcionales, CI no los usa): `VSCAR_EEA_LIVE=1` (EEA), `VSCAR_MITECO_LIVE=1` (MITECO, histórico nacional) y `VSCAR_ESIOS_LIVE=1` (PVPC de hoy; `ESIOS_TOKEN` opcional) con `corepack pnpm --filter @vscar/data-connectors test`.

Worker local: `node --env-file=.env apps/worker/src/main.ts` (necesita `DATABASE_URL`; ver [.env.example](.env.example)).

Diseño (Step 6d): [dirección visual](docs/design/VSCAR_VISUAL_DIRECTION_V0_1.md) · [evaluación ThreeUI](docs/design/THREEUI_EVALUATION.md) · [ADR-010](docs/adr/ADR-010-visual-motion-stack.md) · [licencias del stack visual](docs/licenses/THIRD_PARTY.md).
Motion Lab (Step 6e): [resultados](docs/design/MOTION_LAB_RESULTS.md) · [ADR-011](docs/adr/ADR-011-alpha-visual-stack-after-lab.md) · lab aislado en `labs/motion-lab` (`corepack pnpm --filter @vscar/motion-lab dev`, puerto 4100).

### VScar Web (`apps/web`, Step 7a → 7b)

```bash
corepack pnpm db:dev                      # catálogo de desarrollo en MySQL (vscar_dev)
corepack pnpm --filter @vscar/web dev     # http://localhost:4200/es-es
corepack pnpm --filter @vscar/web build && corepack pnpm --filter @vscar/web start
corepack pnpm --filter @vscar/web test    # vitest · e2e: corepack pnpm --filter @vscar/web e2e
```

- Home con selector de vehículos: `http://localhost:4200/es-es` · `http://localhost:4200/en-es`
- Comparación (par de ReferenceVariants): `http://localhost:4200/es-es/compare/byd-seal-2026-design-rwd-82-5-kwh-vs-tesla-model-3-2021-standard-range-plus-e6r`

Selector de vehículos (Step 7b.2): Marca → Modelo → Año → Versión (o "Buscar directamente"), con silueta SVG por carrocería mientras no haya imágenes con derechos ([política de media](docs/data/VEHICLE_MEDIA_POLICY.md)).

Docs: [Web Foundation](docs/web/WEB_FOUNDATION_V0_1.md) · [Vehicle Selector v0.2](docs/web/VEHICLE_SELECTOR_V0_2.md) · [Shareable Comparisons](docs/web/SHAREABLE_COMPARISONS_V0_1.md) · [SEO Foundation](docs/web/SEO_FOUNDATION_V0_1.md) · [v0.1](docs/web/VEHICLE_SELECTOR_V0_1.md) · [Data Orchestration](docs/web/DATA_ORCHESTRATION_V0_1.md) · [i18n y mercados](docs/web/I18N_AND_MARKETS.md) · [desarrollo local](docs/web/LOCAL_DEVELOPMENT.md) · [ADR-012](docs/adr/ADR-012-i18n-market-routing.md) · [ADR-013](docs/adr/ADR-013-catalog-publication-and-routing.md) · [ADR-014](docs/adr/ADR-014-vehicle-model-media-and-selector-flow.md) · [ADR-015](docs/adr/ADR-015-comparison-url-and-indexability.md) · [Used Adjustment](docs/used/USED_ADJUSTMENT_V0_1.md) · [Used Information Confidence](docs/used/USED_INFORMATION_CONFIDENCE_V0_1.md) · [ADR-016](docs/adr/ADR-016-used-adjustment-layer.md) · [Used Input UX](docs/used/USED_INPUT_UX_V0_1.md) · [Used Comparison Integration](docs/used/USED_COMPARISON_INTEGRATION_V0_1.md) · [ADR-017](docs/adr/ADR-017-used-facts-in-url-and-participant-identity.md) · [New/Used Decision Audit](docs/used/NEW_USED_DECISION_AUDIT_V0_1.md) · [New/Used Golden Cases](docs/used/NEW_USED_GOLDEN_CASES_V0_1.md).

Nuevo / Usado (Step 8b): tras elegir la versión, cada coche se considera **Nuevo** o **Usado** (datos de esa unidad: precio pedido, km, matriculación…). Los hechos de la unidad van en la URL (`u=1&b=used&b_price=…&eval=…`), nunca se guardan, y las vistas con ellos son `noindex`.

Comparaciones compartibles (Step 7c): la URL (`/{idioma}-{mercado}/compare/{a}-vs-{b}?escenario`) reconstruye la comparación en cualquier navegador; canonical, OG e indexación representan la comparación base. `VSCAR_SITE_URL` fija el origen de canonical/OG/sitemap.

No se guardan en Git datos productivos, descargas masivas, backups, secretos ni logs (plan §33.3).
