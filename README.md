# VScar

Plataforma de decisión para elegir coche — nuevo o usado — con los cálculos a la vista.
Plan maestro: [docs/VSCAR_MASTER_PLAN.md](docs/VSCAR_MASTER_PLAN.md) (v1.0 baseline) · Estado: [docs/EXECUTION_STATUS.md](docs/EXECUTION_STATUS.md).

## Estructura (Step 6c)

| Paquete | Qué es | I/O |
|---|---|---|
| [`packages/vehicle-schema`](packages/vehicle-schema) | SpecKey Catalog v0.2 en código: Zod + tipos (SourcedValue, Homologation, ReferenceVariant, precios, seguridad, reglas de claves críticas) + datos de mercado normalizados (`EnergyPriceObservation`) | ninguno |
| [`packages/methodology`](packages/methodology) | Methodology 2026.6: curvas de utilidad, Meaningful Difference / For You, Used Information Confidence, reglas de rangos, presets, sensibilidad, regla DGT, umbrales y pesos, reglas de datos de mercado de energía (frescura, ventana, referencia), reglas económicas (eficiencia de carga, redondeo `money-v1`, confianza, sensibilidad), reglas de comparación (`comparison-v1`), reglas del Alpha Decision Engine (`alpha-decision-v1`) y de Why Not / robustez / confianza de la recomendación (provisionales) | ninguno (apto navegador) |
| [`packages/quality`](packages/quality) | Uso por engines, plausibilidad (PASS/WARNING/BLOCK), Conflict Engine, elegibilidad por categoría, completitud | ninguno |
| [`packages/data-connectors`](packages/data-connectors) | Adapters de fuentes: EEA (discodata) → raw ingest con hash → normalización → emparejamiento por homologación → candidatos DRAFT · MITECO (precios de carburantes) → medianas por zona fiscal/CCAA/provincia · ESIOS (PVPC) → media diaria por zona tarifaria; ambos como `EnergyPriceObservation` | red + filesystem (nunca MySQL) |
| [`packages/market-context`](packages/market-context) | Energy Market Context v0.1: precio de **referencia** de carburante (zona fiscal) y electricidad (PVPC, media diaria) para mercado/región/fecha, con frescura y procedencia; `EnergyScenario` (supuestos del usuario) separado. No conoce fuentes ni base de datos; no calcula costes de coche | ninguno (lee por puerto `EnergyPriceReader`) |
| [`packages/economics-engine`](packages/economics-engine) | Economics Engine v0.1: €/100 km, coste de uso anual y a 1/3/5/N años, coste de propiedad (completo o vista de costes conocidos), PHEV combinado (nunca WLTP ponderado), rangos, confianza, sensibilidad determinista, break-even y deltas; importes en céntimos. Doc: [docs/economics/ECONOMICS_ENGINE_V0_1.md](docs/economics/ECONOMICS_ENGINE_V0_1.md) | ninguno |
| [`packages/comparison-engine`](packages/comparison-engine) | Comparison Engine v0.1: deal breakers (PASS/FAIL/UNKNOWN), comparación por métrica (diferencia bruta · Meaningful Difference · Meaningful For You), rangos, ciclos/bases, comparación económica sobre `EconomicResult` (sin recalcular), resúmenes por categoría y confianza de datos. **Sin winner ni puntuación global.** Doc: [docs/comparison/COMPARISON_ENGINE_V0_1.md](docs/comparison/COMPARISON_ENGINE_V0_1.md) | ninguno |
| [`packages/decision-engine`](packages/decision-engine) | Alpha Decision Engine v0.1 (**solo decisión Alpha**): Technical Capability, Economic Fit @ horizonte, Practical Fit (PASS / PASS_WITH_COMPROMISES / UNCONFIRMED / FAIL), prioridades simples COST/SPACE/PERFORMANCE y Alpha Best For You, como resultados separados; Step 6c: Why Not, tradeoffs, verificación pendiente, Result Robustness (bisección acotada) y Recommendation Confidence, con mensajes `messageKey` + `params` (i18n). Consume `ComparisonResult` + `EconomicResult` sin recalcular; `createDecisionPipeline` orquesta los engines para re-evaluar escenarios. **Preference Fit y Personal Fit completos: diferidos a MVP.** Doc: [docs/decision/ALPHA_DECISION_ENGINE_V0_1.md](docs/decision/ALPHA_DECISION_ENGINE_V0_1.md) | ninguno |
| [`packages/db`](packages/db) | Drizzle ORM (MySQL 8), migraciones, repositorio, cola `jobs` (lock atómico, reintentos, idempotencia). **Único paquete que habla con MySQL**. `@vscar/db/testing`: base de test aislada | MySQL |
| [`apps/worker`](apps/worker) | VScarWorker: proceso Node (NSSM) que ejecuta `EEA_IMPORT`, `MITECO_IMPORT`, `ESIOS_IMPORT`, `QUALITY_CHECK`, `CONFLICT_SCAN`; health en 127.0.0.1:8180; CLI de encolado para Task Scheduler. Operación: [docs/ops/VSCAR_WORKER_WINDOWS.md](docs/ops/VSCAR_WORKER_WINDOWS.md) | MySQL (vía `@vscar/db`) + red + filesystem |
| [`fixtures`](fixtures) | Seis casos de validación técnica derivados de Dataset Core v0.1 (no es dataset publicable) | ninguno |

Regla de arquitectura (ADR-002): `vehicle-schema`, `methodology`, `quality`, `data-connectors`, `market-context` y cualquier `*-engine` no pueden importar `@vscar/db`, `mysql2` ni `drizzle-orm`; `market-context` y los `*-engine` tampoco pueden importar `@vscar/data-connectors`, `@vscar/worker` ni módulos `node:*` (ESLint lo impide).

## Desarrollo

Requisitos: Node ≥ 22. pnpm se usa vía corepack sin instalación global:

```sh
corepack pnpm install
corepack pnpm check        # lint + typecheck + tests
```

Round-trip MySQL: define `VSCAR_TEST_DATABASE_URL` (ver [.env.example](.env.example)); la base debe terminar en `_test` porque el test borra y recrea sus tablas. Sin la variable, el test de MySQL se omite.

```sh
export $(grep -v '^#' .env | xargs) && corepack pnpm test
```

Migraciones: `corepack pnpm db:generate` (drizzle-kit, sin conexión) → `packages/db/drizzle/`.

Tests en vivo (opcionales, CI no los usa): `VSCAR_EEA_LIVE=1` (EEA), `VSCAR_MITECO_LIVE=1` (MITECO, histórico nacional) y `VSCAR_ESIOS_LIVE=1` (PVPC de hoy; `ESIOS_TOKEN` opcional) con `corepack pnpm --filter @vscar/data-connectors test`.

Worker local: `node --env-file=.env apps/worker/src/main.ts` (necesita `DATABASE_URL`; ver [.env.example](.env.example)).

Diseño (Step 6d): [dirección visual](docs/design/VSCAR_VISUAL_DIRECTION_V0_1.md) · [evaluación ThreeUI](docs/design/THREEUI_EVALUATION.md) · [ADR-010](docs/adr/ADR-010-visual-motion-stack.md) · [licencias del stack visual](docs/licenses/THIRD_PARTY.md).
Motion Lab (Step 6e): [resultados](docs/design/MOTION_LAB_RESULTS.md) · [ADR-011](docs/adr/ADR-011-alpha-visual-stack-after-lab.md) · lab aislado en `labs/motion-lab` (`corepack pnpm --filter @vscar/motion-lab dev`, puerto 4100).

### VScar Web (`apps/web`, Step 7a)

```bash
corepack pnpm --filter @vscar/web dev     # http://localhost:4200/es-es
corepack pnpm --filter @vscar/web build && corepack pnpm --filter @vscar/web start
corepack pnpm --filter @vscar/web test    # vitest · e2e: corepack pnpm --filter @vscar/web e2e
```

- ES: `http://localhost:4200/es-es/compare/byd-seal-vs-tesla-model-3`
- EN: `http://localhost:4200/en-es/compare/byd-seal-vs-tesla-model-3`

Docs: [Web Foundation](docs/web/WEB_FOUNDATION_V0_1.md) · [i18n y mercados](docs/web/I18N_AND_MARKETS.md) · [desarrollo local](docs/web/LOCAL_DEVELOPMENT.md) · [ADR-012](docs/adr/ADR-012-i18n-market-routing.md).

No se guardan en Git datos productivos, descargas masivas, backups, secretos ni logs (plan §33.3).
