# VScar Web — Vehicle Selector v0.2 (Step 7b.2)

> Estado: **PASS** · 2026-10-14 · `apps/web/src/components/catalog/*` · Sustituye la experiencia de [v0.1](VEHICLE_SELECTOR_V0_1.md) (búsqueda-primero), que se conserva como atajo · Decisiones: [ADR-013](../adr/ADR-013-catalog-publication-and-routing.md), [ADR-014](../adr/ADR-014-vehicle-model-media-and-selector-flow.md) · Media: [VEHICLE_MEDIA_POLICY](../data/VEHICLE_MEDIA_POLICY.md)

> *I know I want a Golf → I see Golf → I pick the year → I pick the version → VScar resolves the exact technical car.*

## 1. Flujo

```
MARCA ─▶ MODELO (tarjetas visuales) ─▶ AÑO (chips) ─▶ VERSIÓN (filas) ─▶ RESUMEN [Elegir este coche] ─▶ ReferenceVariant.id
   └──────────────── "Buscar directamente" (atajo: combobox de la v0.1, con miniatura) ───────────────▶ ReferenceVariant.id
```

- **Browse por defecto; búsqueda como atajo** (botón "Buscar directamente" / "Explorar por marca").
- **Home**: "Comparar coches" abre el selector del Coche A. Tras confirmar, se abre el del Coche B (flujo guiado) y después se pulsa Comparar.
- **Comparación**: "Cambiar" junto a cada coche abre el mismo componente en el **año del coche actual** (cambiar de año o de versión es lo más común); se puede volver a Modelo o Marca. "Intercambiar coches" no cambia (7b).
- **Contexto visible**: "Coche A" / "Coche B" arriba (color del lado).
- **Volver** (Versión → Año → Modelo → Marca) sin cerrar el selector: botón "Atrás" y la columna de pasos.
- **Estado temporal local** (React). La URL solo cambia al confirmar una variant válida, conservando el escenario (`km`, `trips`, `years`, `home`, prioridades), como en 7b.
- **Mismo coche en A y B**: la fila se marca "Ya está en la comparación" y elegirla avisa ("Selecciona un coche diferente.") sin cerrar.
- **Cambio de idioma con el selector abierto**: el selector de idioma es un enlace normal, así que la página navega, el selector se cierra y se conservan comparación, escenario y mercado. No se conserva la selección parcial: añadiría estado en la URL para pasos incompletos (§73) sin valor real.

## 2. Pasos

| Paso | Muestra | Datos |
|---|---|---|
| **Marca** | marcas del catálogo del canal (no hardcodeadas) + nº de modelos | `level=brands` |
| **Modelo** | **una tarjeta por modelo** (nunca por variant): visual, nombre, años disponibles, pista de generación solo si hay varias | `level=models&brand=` (se pide al elegir marca) |
| **Año** | años modelo presentes, más reciente primero; ≤ 5 → chips; > 5 → lista. Generación junto al año solo si el modelo tiene varias ("2018 · Mk7") | `level=years&brand=&model=` (se pide al elegir modelo) |
| **Versión** | una fila por ReferenceVariant: versión comercial + máx. 3 datos (powertrain · potencia · cambio) + distintivo si hace falta | `level=variants&…&year=` |
| **Resumen** | visual + Marca / Modelo / Año / Versión / Motorización + "Elegir este coche" | — |

**Identidad técnica (ADR-007)**: cada fila apunta a un `ReferenceVariant.id`. Si dos variants comparten modelo, año, versión comercial y powertrain, se muestra el primer **hecho comprensible** que las distingue y nunca se fusionan:
- **Golf 2018 Advance 1.5 TSI EVO 130 CV**: "homologación NEDC" frente a "homologación WLTP" (mismo periodo).
- **Model 3 2021 Autonomía estándar plus E6R/E6CR**: periodo de homologación (ene–jun / ago–nov 2021).

El distintivo también aparece en el resumen. Los códigos (TAN/Va/Ve) nunca aparecen en la UI normal.

**Detalle técnico (solo PREVIEW)**: "Detalles técnicos" plegable con ReferenceVariant ID, TAN, Va, Ve y estado de identidad, más el distintivo "Identidad sin confirmar" si no es `EXACT`. En PUBLIC el servidor no envía estos campos.

**Potencia**: solo si hay un valor usable, publicable en el canal, vigente y **sin conflicto**. Golf eTSI tiene 110 kW (fabricante) frente a 85 kW (IDAE) en conflicto, así que no se muestra ninguno.

## 3. Años

- El selector usa **`MODEL_YEAR`**: `ReferenceVariant.commercial.model_year`, tal como lo declara la fuente.
- **`PRODUCTION_YEAR`** (periodo comercial u homologación) se usa solo como distintivo; **`REGISTRATION_YEAR`** es de una unidad usada y no existe en este paso.
- Nunca se deduce el año modelo de la matriculación, del año del dataset ni de la fecha de publicación de la fuente.
- Sin año modelo, la variant aparece bajo **"Año desconocido"** (al final), no se oculta. Hoy el schema exige `model_year`, así que el grupo está vacío.

## 4. Visual y media

- La tarjeta usa la imagen **autorizada para el canal** (servidor) o, si no hay, la **silueta genérica** de su carrocería: berlina, compacto o SUV. Las siluetas no representan el modelo.
- Hoy no hay ninguna imagen con derechos verificados, así que todas las tarjetas muestran siluetas ([política](../data/VEHICLE_MEDIA_POLICY.md)).
- Búsqueda: miniatura ligera (96 px). Resumen: 440 px. Nunca hero.
- `next/image` (AVIF/WebP), caja 16:9 fija (sin CLS), perezosa salvo las 4 primeras tarjetas, sin precarga masiva.

## 5. Desktop y móvil

- **Escritorio**: panel grande (980 px, 88 vh) dentro del diálogo. A la izquierda los pasos (con valor elegido y `aria-current="step"`), a la derecha el contenido visual. Oscuro, editorial, A azul / B arena.
- **Móvil (< 700 px)**: Sheet a pantalla completa (`100svh`), "N / 4" y botón Atrás en lugar de la columna de pasos. **Un solo scroll** (el del Sheet), sin listas con scroll propio. Objetivos ≥ 44 × 44 px.
- **Motion** (diferido, `reducedMotion="user"`): entrada del paso (140 ms, sin esperar a la salida del anterior), hover y pulsación de tarjetas y filas. Sin GSAP ni ThreeUI en el selector.

## 6. Accesibilidad

- Diálogo Radix: foco atrapado; Escape cierra; el foco vuelve al botón que lo abrió (`data-picker-trigger`).
- **Al abrir y en cada cambio de paso, el foco va al título del paso** (`h3` con `tabindex=-1`), no solo la animación.
- Pasos: `nav` con `aria-label` y `aria-current="step"`. Tarjetas, chips y filas son `button` nativos con `aria-pressed` para la elección actual. Navegación completa con Tab + Intro (E2E).
- Búsqueda: combobox ARIA 1.2 de la v0.1 (↑ ↓ Intro, `aria-activedescendant`).
- Estados con `role="alert"` ("mismo coche", error de catálogo).

## 7. Estados

| Estado | ES | EN |
|---|---|---|
| Sin versiones para el año | No hay versiones disponibles para este año. | No versions are available for this year. |
| Catálogo PUBLIC vacío | Todavía estamos verificando los vehículos disponibles para publicación. | We're still verifying the vehicles available for publication. |
| Vista previa (PREVIEW) | Vista previa — algunos datos aún están en verificación. | Preview — some data is still being verified. |
| Imagen con derechos pendientes (solo PREVIEW) | Imagen en verificación | Image being verified |
| Error | No pudimos cargar el catálogo. + Reintentar | We couldn't load the vehicle catalog. + Try again |

El aviso de vista previa solo aparece si el canal es PREVIEW; en PUBLIC no. Las marcas, modelos y versiones no se traducen.

## 8. API interna y payloads

`GET /api/catalog/browse?market=ES&level=brands|models|years|variants[&brand][&model][&year=2018|unknown]`. Route Handler interno, validado con Zod, con el mismo límite de peticiones que la búsqueda. No es API pública.

| Nivel | Payload |
|---|---|
| brands | `{ brand, models }[]` |
| models | `{ brand, model, generations[], years[], bodyType, media?, preview? }[]` |
| years | `{ year, generations[] }[]` |
| variants | `{ id, slug, brand, model, variant, year, powertrainType, bodyType, powerKw?, transmission, drivetrain, generation, period?, cycle?, media?, preview?, identity? (solo PREVIEW) }[]` |

Nunca specs completas. El selector no cambia la elegibilidad: consume la del 7b (`variantAvailability`).

Servicio: `listBrands`, `listModels`, `listModelYears(market, brand, model)` y `listVariants(market, brand, model, year)` en `VehicleCatalogService`, sobre el índice ya filtrado por canal.

## 9. Rendimiento (build de producción local, MySQL de Laragon, `scripts/perf-7b2.ts`)

| Medida | Resultado | Objetivo |
|---|---|---|
| Abrir el selector (clic → marcas pintadas) | **p50 40 ms** | < 100 ms |
| Marca → modelos | p50 34 ms | < 100 ms |
| Modelo → años | p50 26 ms | < 100 ms |
| Año → versiones | p50 36 ms | < 100 ms |
| API browse por nivel | p50 6–8 ms · p95 9–16 ms | < 100 ms |
| JS inicial de la comparación | **153,0 KB** gzip (191,6 con polyfills) | ≤ 200 KB |
| JS inicial de la home | 150,7 KB (189,3) | ≤ 200 KB |
| Chunk del selector (diferido) | **10,4 KB** gzip (+ Motion compartido, diferido) | diferido |
| Imagen de tarjeta | sin imágenes aprobadas: 0 bytes (silueta SVG en línea). Pipeline verificado con un asset sintético propio: AVIF 0,9–1,0 KB, WebP 0,5–0,7 KB | 20–60 KB |

Dos hallazgos de rendimiento:
- **`AnimatePresence mode="wait"`** retenía cada paso 300–550 ms (esperaba la salida del anterior). Ahora la transición es solo de entrada.
- **`next/dynamic`** (React.lazy + Suspense) añadía ~350 ms a la primera apertura por el retraso con el que React 19 revela contenido suspendido, aunque el chunk estuviera precargado. Ahora hay un loader propio (`picker-loader.ts`): `import()` tras `load` + inactividad, precarga de marcas y render síncrono al abrir.

## 10. Tests

- `@vscar/quality` (`media.test.ts`, 8): derechos de imagen ≠ datos, fallback generación → modelo → SVG, PUBLIC sin `PENDING`, THUMBNAIL ← SELECTOR, rangos de año, validación del schema.
- `@vscar/db` (MySQL): media round-trip, política validada al guardar, huella del catálogo con media.
- Web, lector en memoria (`browse.test.ts`, 17):
  - marcas del catálogo, una tarjeta por modelo, años reales y filtro por año;
  - id exacto por fila, Golf 2018 NEDC/WLTP y E6R/E6CR separadas;
  - potencia sin conflicto, detalle técnico solo en PREVIEW, PUBLIC vacío;
  - media por canal, generación sobre modelo, URL externa → fallback, mismo catálogo ES/EN.
- Web, MySQL (`browse-mysql.test.ts`, 7): lo esencial contra MySQL + API browse (mismos datos con `Accept-Language` es/en, validación, payload mínimo).
- `model-visual.test.tsx` (5): next/image (tamaño fijo, lazy, alt), atribución, silueta decorativa.
- **E2E** (Chrome):
  - flujo §107 completo (Volkswagen → Golf → 2018 → versión → coche B → comparar → cambiar A de año y versión → EN con el mismo par);
  - Atrás sin cerrar, búsqueda como atajo, intercambio con escenario;
  - mismo coche, Escape con foco, teclado puro (Tab + Intro);
  - **móvil 390 px** (pantalla completa, 4 pasos, filas ≥ 44 px);
  - 404 y API; mismo catálogo ES/EN.

## 11. Compatibilidad con usados (futuro)

El selector termina en una `ReferenceVariant` técnica, que es lo que una `UsedVehicleInstance` debe referenciar (ADR-007 §7). El flujo de usado añadirá **después** de "Elegir este coche" los datos de la unidad (km, precio, matriculación…), sin tocar los pasos de identidad. En este paso no hay ningún campo de usado.
