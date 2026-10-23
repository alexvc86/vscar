# VScar — Step D1.8: Brand & Model Catalog + Simplified Vehicle Selector — informe de cierre

> **Estado**: **PASS** en el selector, el catálogo y la resolución · **promoción a PREVIEW: 0/9**, bloqueada por identidad comercial sin fuente · 2026-10-23
> - **Git**: base `e530bed d1.6 listo`; D1.7 y D1.8 sin commit.
> - **Sin cambios**: VPS (sin despliegue), Methodology 2026.7, engines y Economic Fit.

## Informes

| Tema | Documento |
|---|---|
| Decisión | [ADR-020](../adr/ADR-020-simplified-model-selection.md) |
| Catálogo de marcas y modelos | [D1_8_BRAND_MODEL_CATALOG](D1_8_BRAND_MODEL_CATALOG.md) · [`d18/catalog-navigation.json`](d18/catalog-navigation.json) |
| Años | [D1_8_YEAR_AVAILABILITY_RULES](D1_8_YEAR_AVAILABILITY_RULES.md) |
| Resolución técnica | [D1_8_TECHNICAL_RESOLUTION](D1_8_TECHNICAL_RESOLUTION.md) |
| Promoción | [D1_8_PREVIEW_PROMOTION_RULES](D1_8_PREVIEW_PROMOTION_RULES.md) · [`d18/promotion-review.json`](d18/promotion-review.json) |
| UX | [D1_8_SELECTOR_UX_REPORT](D1_8_SELECTOR_UX_REPORT.md) |
| Vehículos reales | [D1_8_REAL_VEHICLE_TESTS](D1_8_REAL_VEHICLE_TESTS.md) |

## Definition of Done

| Requisito | Estado | Evidencia |
|---|---|---|
| Brand/model catalog | PASS | 16 marcas y 25 modelos navegables en PREVIEW (15 / 24 técnicos), desde MySQL |
| 92 technical records preserved | PASS | checkpoint: huella de la capa curada idéntica a D1.7 |
| 9 existing variants preserved | PASS | huella del catálogo seleccionable idéntica; las 9 son accesibles por el selector (7 opciones) y por URL |
| Brand / Model / Year selection | PASS | e2e (escritorio, móvil, teclado) |
| Mandatory version step removed | PASS | `STEPS = ['brand','model','year']`; e2e sin `step-version` |
| Technical resolution | PASS | 4 AUTO · 1 EQUIVALENT · 1 NEEDS_CONFIGURATION · 97 UNRESOLVED |
| Ambiguous configurations handled | PASS | Model 3 2021: aclaración contextual + «No lo sé» |
| No arbitrary variant selection | PASS | precedencia sin valores; tests de permutación y «never chosen by value» |
| Preview promotion rules documented | PASS | 5 puertas; revisión reproducible |
| Promotions | **0/9** (no PASS: bloqueadas) | generación, año-modelo y acabado sin fuente |
| Rights respected | PASS | descubrimiento solo PREVIEW y agregado; sin ids, TAN ni derechos en la API; S11/S13 PENDING |
| PUBLIC gate unchanged | PASS | en vivo: PUBLIC 0 marcas, `/internal` 404; test: la capa técnica no se consulta en PUBLIC |
| Economy / Range rules preserved | PASS | engines sin cambios; E6R y E6CR producen la misma economía; PHEV sin CS sigue sin Economy |
| Methodology unchanged | PASS | 2026.7 |
| NEW/NEW, NEW/USED, Used Engine regression | PASS | e2e 32/32 (build de producción) + suites existentes |
| ES/EN · Mobile · Keyboard | PASS | e2e ES/EN idénticos; 390 px sin scroll horizontal; Tab + Enter |
| Lint · Typecheck · Unit · MySQL integration | PASS | `TURBO_FORCE=true pnpm check` ×4: 1.025 ✓ · 0 ✗ · 5 omitidos · 0 timeouts |

## Cambios de código

| Archivo | Cambio |
|---|---|
| `apps/web/src/domain/model-selection.ts` (nuevo) | tipos de disponibilidad y base del año; resolución pura (`resolveSelection`, `groupEquivalent`, `representative`); reglas de año |
| `apps/web/src/server/catalog-discovery.ts` (nuevo) | descubrimiento agregado de la capa técnica (server-only, caché por versión) |
| `apps/web/src/server/catalog-service.ts` | hechos por variante; marcas, modelos y años con descubrimiento; `listConfigurations`; búsqueda con un resultado por grupo equivalente |
| `apps/web/src/app/api/catalog/browse/route.ts` | `level=configurations` |
| `apps/web/src/components/catalog/VehiclePicker.tsx` | 3 pasos; aclaración contextual; panel «no disponible»; «No lo sé» |
| `apps/web/src/domain/catalog.ts`, `labels.ts`, `messages/*.json`, `globals.css` | contrato, textos ES/EN y estilos mínimos |
| Tests | `test/d18.test.ts` (20), `packages/curation/test/d18.test.ts` (6), `e2e/d18-real-vehicles.spec.ts` (2). Actualizados por el cambio de contrato: `browse`, `browse-mysql`, `catalog-mysql`, `d16a`, `selector`, `used`, `new-used-8c` |

## Pendiente (decisión humana)

1. **Generación y año-modelo** de las homologaciones técnicas: fuente, revisión editorial con evidencia o ADR para un «año de referencia» con base explícita. Sin esto, la capa técnica no puede hacerse comparable.
2. **Firma de S11/S13**: sigue pendiente; afecta a lo que podría mostrarse en PUBLIC.
3. **«No lo sé» en el comparador**: hoy la elección genérica se conserva dentro del selector. Llevarla al hueco de la página principal sin número requeriría ampliar `CompareBuilder` (fuera de D1.8).
