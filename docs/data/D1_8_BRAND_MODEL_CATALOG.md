# VScar — D1.8 Catálogo de marcas y modelos

> Estado: **implementado** · 2026-10-22 · Canal PREVIEW, `vscar_dev`
> - **Artefacto** (generado desde la API real del selector, sin valores): [`d18/catalog-navigation.json`](d18/catalog-navigation.json), con `node apps/web/scripts/d18-navigation-report.mjs`.
> - **Decisión**: [ADR-020](../adr/ADR-020-simplified-model-selection.md).

## 1. Origen de los datos (registros reales de MySQL)

| Fuente | Registros | Qué aporta al selector |
|---|---:|---|
| `reference_variants` (catálogo seleccionable) | 9 | marcas, modelos y año-modelo **comparables** |
| `curated_technical_vehicles` (capa técnica, D1.6–D1.7) | 92 | marcas, modelos y años de matriculación **descubribles** (solo PREVIEW, agregados) |

No se usa ninguna lista externa ni ningún catálogo de investigación.

## 2. Resultado

| Magnitud | Capa técnica | Navegable (técnica ∪ seleccionable) | Comparable |
|---|---:|---:|---:|
| Marcas | 15 | **16** (+ SEAT) | 5 |
| Modelos | 24 | **25** (+ SEAT León) | 5 |
| Combinaciones modelo-año | — | 103 | 6 |
| Opciones comparables (homologaciones detrás) | — | — | 7 (9) |

En PUBLIC no cambia nada: 0 marcas, como antes. La capa técnica no se consulta.

## 3. Normalización

- **Clave**: marca y modelo se comparan sin mayúsculas, acentos ni espacios repetidos (`normalizeSearch`).
- **Nombre a mostrar**: el del catálogo seleccionable si existe; si no, el de la fuente, sin alterarlo (p. ej. «Škoda», «Mégane», «Clase A»).
- **Resultado**: ningún duplicado de marca ni de modelo (test `packages/curation/test/d18.test.ts`). Grafías distintas de un mismo modelo seleccionable, como «VOLKSWAGEN / golf », se fusionan (test `apps/web/test/d18.test.ts`).

## 4. Disponibilidad

| Estado | Significado |
|---|---|
| `COMPARISON_ELIGIBLE` | al menos una ReferenceVariant seleccionable en el canal |
| `CATALOG_DISCOVERABLE` | solo homologaciones técnicas: se ven, no se comparan (etiqueta «Solo datos técnicos») |
| `NOT_COMPARABLE` | configuración técnica concreta, con motivos (versión comercial, generación, año-modelo y acabado sin verificar; no promocionada) |

## 5. Modelos

`comparable` indica que algún año tiene una ReferenceVariant; los demás años del mismo modelo pueden ser solo informativos.

| Marca | Modelo | Estado | Años | Años comparables (resolución) |
|---|---|---|---|---|
| Audi | A3 | solo descubrible | 2024 | — |
| BMW | Serie 3 | solo descubrible | 2016 | — |
| BMW | X3 | comparable | 2025, 2024, 2022, 2018, 2016 | 2018 AUTO_RESOLVED |
| BYD | SEAL | comparable | 2026, 2025, 2024 | 2026 AUTO_RESOLVED |
| CUPRA | Formentor | solo descubrible | 2025, 2024, 2022 | — |
| Dacia | Sandero | solo descubrible | 2025, 2022, 2020, 2018 | — |
| Hyundai | Kona | solo descubrible | 2025, 2024, 2023, 2022, 2018 | — |
| Hyundai | Tucson | solo descubrible | 2025, 2024, 2020, 2019, 2018 | — |
| Kia | Niro | solo descubrible | 2025, 2024, 2023, 2022, 2020, 2018 | — |
| Kia | Sportage | solo descubrible | 2025, 2024, 2023, 2022, 2020, 2019, 2018, 2017, 2016 | — |
| Mercedes-Benz | Clase A | solo descubrible | 2025, 2024, 2023, 2022, 2020, 2019, 2018, 2017, 2016 | — |
| Nissan | Qashqai | solo descubrible | 2025, 2024, 2020, 2018 | — |
| Peugeot | 208 | solo descubrible | 2025, 2020 | — |
| Peugeot | 3008 | solo descubrible | 2025, 2024, 2022, 2020, 2019, 2018 | — |
| Peugeot | 308 | solo descubrible | 2024, 2022, 2021, 2020 | — |
| Renault | Clio | solo descubrible | 2025, 2024, 2022, 2020 | — |
| Renault | Mégane | solo descubrible | 2025, 2024, 2022, 2018 | — |
| SEAT | León | comparable | 2026 | 2026 AUTO_RESOLVED |
| Škoda | Octavia | solo descubrible | 2024, 2020 | — |
| Tesla | Model 3 | comparable | 2025, 2024, 2022, 2021, 2020 | 2021 NEEDS_CONFIGURATION |
| Tesla | Model Y | solo descubrible | 2025, 2022 | — |
| Toyota | Corolla | solo descubrible | 2025, 2022, 2020 | — |
| Toyota | RAV4 | solo descubrible | 2025, 2024, 2020 | — |
| Toyota | Yaris | solo descubrible | 2025, 2024, 2023, 2022, 2018 | — |
| Volkswagen | Golf | comparable | 2027, 2025, 2024, 2022, 2021, 2020, 2018 | 2027 AUTO_RESOLVED, 2018 EQUIVALENT_GROUP |

## 6. Consultas y rendimiento

| Nivel | Endpoint (`/api/catalog/browse`) | Origen |
|---|---|---|
| marcas | `level=brands` | índice del catálogo (caché por huella) + descubrimiento (caché por versión de la capa técnica, 30 s) |
| modelos por marca | `level=models&brand=` | idem |
| años por modelo | `level=years&brand=&model=` | idem |
| configuraciones | `level=configurations&brand=&model=&year=` | resolución en el servidor (`configurationsOf`) |

- **Sin N+1**: el descubrimiento carga la capa técnica con tres consultas agrupadas (vehículos, atributos, observaciones). Solo se recarga cuando cambian sus recuentos.
- **Al navegador** llega un DTO por paso, nunca las 1.368 observaciones.
- **Limitador**: la API conserva el limitador por IP. El script del artefacto respeta `Retry-After`.
- **Reutilización**: la lógica de resolución vive en `apps/web/src/domain/model-selection.ts` (pura); React no la duplica.
