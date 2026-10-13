# VScar Web — Data Orchestration v0.1 (Step 7b)

> Estado: **PASS** · 2026-10-13 · `apps/web` + `@vscar/db` + `@vscar/quality` · Decisión: [ADR-013](../adr/ADR-013-catalog-publication-and-routing.md) · Selector: [VEHICLE_SELECTOR_V0_1.md](VEHICLE_SELECTOR_V0_1.md)

La comparación ya no sale de una definición fija ni de un snapshot JSON: el usuario elige dos **ReferenceVariants** del catálogo de un mercado, el servidor las resuelve contra **MySQL**, filtra lo que no se puede publicar y entrega a los engines las mismas entradas que antes. Regla: *User chooses public ReferenceVariants. Server resolves real market data. Engines decide. UI explains.*

## 1. Capas

```
Navegador ──────────────────────────────────────────────────────────────────────────────
  CompareBuilder / PairControls (islas, JS inicial) ──import()──▶ VehicleSelector (diferido)
        │ GET /api/catalog/search?market=ES&q=…                     │ router.push(/{locale}/compare/{a}-vs-{b}?escenario)
        ▼                                                            ▼
Servidor (apps/web/src/server/**, todo `import 'server-only'`) ──────────────────────────
  route.ts (API interna) ─┐                          page.tsx (RSC) ─▶ loadComparisonPageData
                          ▼                                               │
                VehicleCatalogService ◀───────────────────────────────────┤ loadComparisonData
                  · índice por mercado (caché, huella de MySQL)            │   · filterBundleForChannel
                  · variantAvailability (@vscar/quality)                   │   · comparisonCandidateFromBundle
                  · ranking (dominio)                                      │   · economicVehicleInputFromBundle
                          │                                                │   · marketEnergy (canal)
                          ▼                                                ▼
                CatalogReader (@vscar/db, SOLO lectura) ──────▶ MySQL     serverDecisionView (pipeline + robustez)
```

| Pieza | Dónde | Hace | No hace |
|---|---|---|---|
| `CatalogReader` | `packages/db/src/catalog-reader.ts` | lista variants ligeras, búsqueda parametrizada (`LIKE` por término, `utf8mb4_0900_ai_ci`, comodines escapados), resolución de slug y alias, `loadBundle`, huella `catalogVersion` | escribir; decidir elegibilidad |
| `publication.ts` | `packages/quality/src/publication.ts` | registro de derechos = DATA_RIGHTS_MATRIX v0.2; canales `PUBLIC`/`PREVIEW`; disponibilidad por variant; filtrado por campo | juzgar la calidad de un dato |
| `VehicleCatalogService` | `apps/web/src/server/catalog-service.ts` | índice de opciones seleccionables por mercado y canal; búsqueda; marcas/modelos; slug → variant; ejemplos | SQL; engines |
| `loadComparisonData` | `apps/web/src/server/comparison-loader.ts` | par → `ComparisonData` serializable | decidir; formatear |
| `ComparisonData` | `apps/web/src/domain/comparison-data.ts` | las dos variants (`VehicleOption` + `PipelineVehicle`), energía del mercado, fuentes con su estado de derechos, `dataSnapshot` | specs fuera de lo que piden los engines |

`apps/web` nunca contiene SQL: si falta una consulta se añade al `CatalogReader` (Drizzle, parametrizado).

## 2. Frontera cliente / servidor

- `@vscar/db` solo se importa en `apps/web/src/server/**`, y cada módulo de esa carpeta empieza por `import 'server-only'` (test).
- Ningún módulo `'use client'` ni el Web Worker alcanzan `src/server/**`, `src/data/**`, `@vscar/db`, `mysql2` ni `drizzle-orm` por imports estáticos (test sobre el grafo).
- ESLint: `apps/web/src/**` no puede importar `@vscar/db`/`mysql2`/`drizzle-orm`, salvo `src/server/**`, que puede usar `@vscar/db` pero nunca `mysql2`/`drizzle-orm` directamente.
- Informe de bundle: `noDbInClient` (ningún chunk del navegador contiene firmas de `mysql2`/`drizzle`).
- `@vscar/db/migrations` es una entrada separada: la web solo lee y nunca empaqueta migraciones.

## 3. Elegibilidad pública (sin regla paralela)

`variantAvailability` combina reglas que **ya existían** y añade solo los derechos:

| Puerta | Regla | PUBLIC | PREVIEW |
|---|---|---|---|
| Registro | `reference_variants.status` | solo `published` | `published`, `draft`, `test_fixture` |
| Identidad técnica (ADR-007, ADR-009 §6) | `homologations.identification_confidence` | solo `EXACT` | cualquiera (marcada como vista previa) |
| Derechos de la identidad (campo crítico) | fuente de la homologación | derechos ✅/⚠️ en los 4 usos | nunca ❌ ni `SECONDARY_REFERENCE` |
| Comparabilidad | `vehiclePageEligible` (Catalog v0.2 §8) **con los campos visibles** | ≥ 1 categoría Alpha | ≥ 1 categoría Alpha |

Resultado: `PUBLIC_AVAILABLE` (seleccionable en ambos canales), `INTERNAL_AVAILABLE` (solo PREVIEW) o `NOT_AVAILABLE`.

**Publicación por campo**: un campo de una fuente no publicable en el canal se oculta (ni se muestra ni se calcula); la variant solo desaparece si cae la identidad o no queda ninguna categoría comparable.

**Derechos ≠ calidad** (`visibleValues`): los conflictos se detectan con TODOS los valores, también los ocultos. Si un valor visible está en conflicto con uno oculto, sigue en `CONFLICT` (pendiente de revisión humana). Sin esta regla, ocultar la fuente secundaria del Model 3 (`bat.capacity_kwh`, C07) "resolvía" el conflicto y dejaba pasar un valor que la calidad retenía. Lo cazó el test dorado.

**Canal**: `VSCAR_PUBLICATION_CHANNEL` (`.env` raíz). Por defecto `PUBLIC` (falla cerrado); el `.env` local fija `PREVIEW`.

Estado de hoy (Dataset Core v0.1, 9 variants `test_fixture`, derechos ❓ de S02/S08):

| Canal | Seleccionables | Motivos |
|---|---|---|
| **PUBLIC** | **0** | `RECORD_NOT_PUBLISHED` (todas); además `IDENTITY_NOT_EXACT` (6), `IDENTITY_SOURCE_NOT_ALLOWED` (3) y `NO_COMPARABLE_CATEGORY` (todas: sin S02/S08 no queda ninguna categoría completa) |
| **PREVIEW** | **9** (5 marcas, 5 modelos; BEV 4 · ICE 3 · PHEV 1 · MHEV 1) | se muestran con aviso de vista previa; ESIOS y las fuentes con derechos pendientes llevan nota en "Cómo lo calculamos" |

La energía sigue la misma regla: en PUBLIC, la observación de ESIOS (S04: republicación ❓) no entra en el contexto energético. El coste de los BEV queda entonces "no disponible", en vez de calcularse con un precio no publicable.

## 4. De MySQL a los engines

1. `getVariantBySlug` ×2 → dos variants seleccionables del mercado (o 404 / redirect).
2. `loadBundle(market, [a, b])` → `DatasetBundle` validado por Zod (mismo loader que el repositorio, colecciones ordenadas por id).
3. `filterBundleForChannel` → bundle sin campos no publicables (conflictos conservados).
4. Adapters existentes, sin duplicar limpieza ni elegibilidad: `comparisonCandidateFromBundle(bundle, id, { label, at })` y `economicVehicleInputFromBundle(bundle, id, { at })`.
5. **Fecha de referencia de los hechos** (`at`): una variant histórica se evalúa en el último día en que existió su homologación (`min(homologation.valid_to, sales_end)`); una vigente, hoy. Sustituye a la fecha elegida a mano en la 7a (`2021-06-01` → `2021-06-29` para el Model 3 E6R): mismos hechos, misma decisión.
6. Nombre corto para las frases del engine (`distinctShortNames`): "BYD SEAL" / "Tesla Model 3". Si coinciden (Golf vs Golf), se añade año, versión o periodo.
7. `marketEnergy(market, channel)`: observaciones de referencia (MITECO, ESIOS) → `resolveEnergyContext` (Step 4g, sin cambios). Fuente: el snapshot de observaciones de la 7a, ahora solo en servidor. Pasar a la tabla `energy_prices` es independiente del selector y queda como siguiente paso (requiere que el worker haya importado esa fecha en la base de desarrollo).
8. `ComparisonData` → `serverDecisionView` (decisión completa con robustez, caché LRU por `data.key` + escenario).

## 5. Servidor, cliente y worker con los mismos hechos

El RSC pasa `ComparisonData` (19,6 KB JSON, 4,4 KB gzip) a `LiveDecision` → `ClientDecision` → `robustness.worker.ts`. El cliente recalcula con `computeDecision(data, escenario)` sin pedir nada al servidor y la robustez llega del worker como en la 7a. Antes, el chunk diferido del pipeline incluía el dataset completo (61 KB de JSON); ahora pesa 41,8 KB gzip (antes 53,8).

Tests: la vista del servidor (MySQL) es igual a la del recálculo cliente a partir de los datos **serializados** (`JSON.parse(JSON.stringify(data))`) + robustez del worker, en los dos escenarios.

## 6. Trazabilidad y cachés

`ComparisonData.dataSnapshot = { vehicles: '<variants>.<valores>.<precios>@<último cambio>', energy: '<fecha>@<snapshot>', rights: 'DATA_RIGHTS_MATRIX v0.2' }`. Se muestra al pie de "Cómo lo calculamos" junto a las versiones de engine y metodología. La misma URL y el mismo escenario pueden cambiar si cambian los datos, y la huella dice cuándo.

| Caché | Clave | Invalidación |
|---|---|---|
| Índice del catálogo | mercado (canal fijo por instancia) | huella `catalogVersion` comprobada cada 30 s |
| Búsquedas (LRU 200) | mercado + huella + consulta normalizada + límite | nueva huella |
| `ComparisonData` (LRU 100) | mercado + canal + par + huella | nueva huella |
| Decisión del servidor (LRU 200) | `data.key` + escenario | nueva `data.key` |
| Home (ISR) | ruta | 60 s |

Las tres versiones de metodología, engine y reglas van en el resultado. Si cambian, el código desplegado es otro y las cachés en memoria empiezan vacías.

## 7. Errores

- **Base caída o sin configurar**: `CatalogUnavailableError`. La API responde 503 `{ error: 'CATALOG_UNAVAILABLE' }` sin stack. La comparación muestra "No pudimos cargar el catálogo." y la home se sirve igual, sin ejemplos.
- **Slug inválido, variant no seleccionable, otro mercado o mismo coche dos veces**: 404 con mensaje específico ("No encontramos uno de estos vehículos."). Nunca se sustituye por otro vehículo.
- **Alias conocido** (URL de la 7a `byd-seal-vs-tesla-model-3`, tabla `variant_slug_aliases`): 308 al par canónico, conservando el escenario.

## 8. Rendimiento (build de producción local, MySQL de Laragon, `scripts/perf-7b.ts`)

| Medida | Resultado |
|---|---|
| Búsqueda `/api/catalog/search` (cliente → respuesta) | fría p50 **3,6 ms** · p95 **7,8 ms** (1ª petición del proceso 183 ms: construye el índice) · caliente p50 1,5 ms · p95 2,7 ms |
| Tiempo del servicio de catálogo (`Server-Timing`) | fría p50 1,0 ms · p95 1,8 ms |
| SSR de la comparación, escenario nuevo (TTFB) | p50 **344 ms** · p95 549 ms |
| SSR repetido (caché) | p50 24 ms · p95 32 ms |
| Desglose (escenario nuevo) | consulta de catálogo p50 3,1 ms (36 ms en frío) · carga de variants desde MySQL 44 ms (una vez por par y huella) · adapters 1,8 ms · pipeline 6 ms · **robustez ≈ 310 ms** |
| HTML de la comparación | 146 KB (25,7 KB gzip), con los datos del par incluidos |

La robustez sigue dominando el primer render de un escenario nuevo, igual que en la 7a. El catálogo y MySQL añaden menos de 50 ms en frío y casi nada en caliente.

## 9. Desarrollo

```bash
corepack pnpm db:dev                       # migraciones + Dataset Core en vscar_dev (idempotente)
corepack pnpm --filter @vscar/web build
cd apps/web && corepack pnpm exec next start -p 4200   # o VSCAR_WEB_PORT/otro puerto si 4200 está ocupado
VSCAR_TIMINGS=1 …                          # desglose del SSR en el log del servidor
VSCAR_WEB_URL=http://localhost:4200 node apps/web/scripts/perf-7b.ts
```

Bases: `vscar_dev` (web local, usuario con permisos solo sobre ella) y `vscar_test` (tests; se reinicia). Varios paquetes reinician `vscar_test`, y un bloqueo consultivo de MySQL (`GET_LOCK`) serializa sus ficheros de test entre procesos. `corepack pnpm test`/`check` cargan el `.env` raíz (`--env-file-if-exists`), así que los tests MySQL se ejecutan siempre que exista `VSCAR_TEST_DATABASE_URL`.
