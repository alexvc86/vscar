# VScar

Plataforma de decisión para elegir coche — nuevo o usado — con los cálculos a la vista.
Plan maestro: [docs/VSCAR_MASTER_PLAN.md](docs/VSCAR_MASTER_PLAN.md) (v1.0 baseline) · Estado: [docs/EXECUTION_STATUS.md](docs/EXECUTION_STATUS.md).

## Estructura (Step 4g)

| Paquete | Qué es | I/O |
|---|---|---|
| [`packages/vehicle-schema`](packages/vehicle-schema) | SpecKey Catalog v0.2 en código: Zod + tipos (SourcedValue, Homologation, ReferenceVariant, precios, seguridad, reglas de claves críticas) + datos de mercado normalizados (`EnergyPriceObservation`) | ninguno |
| [`packages/methodology`](packages/methodology) | Methodology 2026.2: curvas de utilidad, Meaningful Difference / For You, Used Information Confidence, reglas de rangos, presets, sensibilidad, regla DGT, umbrales y pesos, reglas de datos de mercado de energía (frescura, ventana, referencia) | ninguno (apto navegador) |
| [`packages/quality`](packages/quality) | Uso por engines, plausibilidad (PASS/WARNING/BLOCK), Conflict Engine, elegibilidad por categoría, completitud | ninguno |
| [`packages/data-connectors`](packages/data-connectors) | Adapters de fuentes: EEA (discodata) → raw ingest con hash → normalización → emparejamiento por homologación → candidatos DRAFT · MITECO (precios de carburantes) → medianas por zona fiscal/CCAA/provincia · ESIOS (PVPC) → media diaria por zona tarifaria; ambos como `EnergyPriceObservation` | red + filesystem (nunca MySQL) |
| [`packages/market-context`](packages/market-context) | Energy Market Context v0.1: precio de **referencia** de carburante (zona fiscal) y electricidad (PVPC, media diaria) para mercado/región/fecha, con frescura y procedencia; `EnergyScenario` (supuestos del usuario) separado. No conoce fuentes ni base de datos; no calcula costes de coche | ninguno (lee por puerto `EnergyPriceReader`) |
| [`packages/db`](packages/db) | Drizzle ORM (MySQL 8), migraciones, repositorio, cola `jobs` (lock atómico, reintentos, idempotencia). **Único paquete que habla con MySQL**. `@vscar/db/testing`: base de test aislada | MySQL |
| [`apps/worker`](apps/worker) | VScarWorker: proceso Node (NSSM) que ejecuta `EEA_IMPORT`, `MITECO_IMPORT`, `ESIOS_IMPORT`, `QUALITY_CHECK`, `CONFLICT_SCAN`; health en 127.0.0.1:8180; CLI de encolado para Task Scheduler. Operación: [docs/ops/VSCAR_WORKER_WINDOWS.md](docs/ops/VSCAR_WORKER_WINDOWS.md) | MySQL (vía `@vscar/db`) + red + filesystem |
| [`fixtures`](fixtures) | Seis casos de validación técnica derivados de Dataset Core v0.1 (no es dataset publicable) | ninguno |

Regla de arquitectura (ADR-002): `vehicle-schema`, `methodology`, `quality`, `data-connectors`, `market-context` y cualquier `*-engine` no pueden importar `@vscar/db`, `mysql2` ni `drizzle-orm`; `market-context` y los `*-engine` tampoco pueden importar `@vscar/data-connectors` ni módulos `node:*` (ESLint lo impide).

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

No se guardan en Git datos productivos, descargas masivas, backups, secretos ni logs (plan §33.3).
