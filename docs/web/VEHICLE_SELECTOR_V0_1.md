# VScar Web — Vehicle Selector v0.1 (Step 7b)

> Estado: **PASS** · 2026-10-13 · `apps/web/src/components/catalog/*` · Datos: [DATA_ORCHESTRATION_V0_1.md](DATA_ORCHESTRATION_V0_1.md) · Decisión: [ADR-013](../adr/ADR-013-catalog-publication-and-routing.md)

Sustituye la comparación fija de la 7a por una selección real de **ReferenceVariants** del mercado. No es un marketplace: no hay anuncios, precios de venta, kilometraje ni vendedores. Sin flujo de usados en este paso.

## 1. Flujo

```
Home  "Comparar coches" ──▶ selector (coche A) ──▶ selector (coche B) ──▶ [Comparar] ──▶ /{locale}/compare/{a}-vs-{b}
Comparación  [Cambiar] junto a cada coche ──▶ selector de ese lado ──▶ /{locale}/compare/{nuevo par}?{mismo escenario}
             [⇄ Intercambiar coches] ──▶ /{locale}/compare/{b}-vs-{a}?{mismo escenario}
```

- El escenario no se pide antes de elegir coches. Al abrir una comparación se usa el escenario por defecto del mercado (Step 7a); si la URL ya lleva uno (`?trips=10…`), cambiar o intercambiar coche lo conserva.
- "Comparar" solo se activa con A y B elegidos y distintos. Si se intenta elegir en un lado el coche del otro, se muestra "Selecciona un coche diferente." / "Choose a different car." y el selector sigue abierto.
- Cambiar de coche navega con el router (`router.push`). El servidor resuelve el nuevo par y su decisión inicial. El historial del navegador (atrás/adelante) funciona; el estado cliente se reinicia por par (`key` = slug del par).
- El cambio de idioma de la 7a conserva par, escenario y mercado: `/es-es/compare/A-vs-B?…` ⇄ `/en-es/compare/A-vs-B?…`.
- Ejemplos de la home: **"Comparaciones de ejemplo"** (no "populares": no hay analytics). Pares definidos en `EXAMPLE_PAIRS` que solo se muestran si ambos coches están en el catálogo del canal. Hoy: BYD SEAL vs Model 3 2021, y BMW X3 2018 vs Golf eTSI (premium antiguo vs generalista reciente).

## 2. Búsqueda primero

Para Alpha se eligió **búsqueda incremental** sobre el despliegue marca → modelo → año → versión. Con 9 variants hoy y 50–80 previstas, escribir "golf etsi" o "leon" es más rápido que cuatro desplegables, y funciona igual en móvil. Sin texto (menos de 2 caracteres), el selector **navega** por el catálogo ordenado por marca, modelo y año, así no hay que adivinar qué existe. `listBrands`/`listModels` existen en el servicio para una navegación por facetas futura sin cambiar la API.

| Regla | Valor |
|---|---|
| Mínimo para buscar | 2 caracteres (por debajo: navegación del catálogo) |
| Antirrebote | 200 ms; la petición anterior se aborta (`AbortController`) |
| Máximo de resultados | 20 |
| Longitud máxima | 100 caracteres (input y API) |
| Campos | marca, modelo, nombre comercial, versión, generación, facelift, año, powertrain. **Nunca** códigos de homologación (TAN/Va/Ve) |
| Normalización | sin mayúsculas ni acentos ("León" = "Leon" = "LEON"), en MySQL (`utf8mb4_0900_ai_ci`) y en el ranking |
| Varios términos | todos deben coincidir ("golf etsi", "golf 2018") |
| Ranking (determinista, sin IA ni fuzzy) | modelo exacto > marca + modelo exactos > prefijo de modelo > prefijo de marca/nombre > coincidencia en la versión > año; empates por marca, modelo, año (más reciente), periodo de homologación y slug |

La búsqueda no llama a ningún engine.

## 3. Qué muestra cada resultado

```
TESLA                                          ← marca
Model 3 Autonomía estándar plus, tracción trasera   ← modelo + versión comercial
2021 · Eléctrico (BEV) · homologado ene 2021–jun 2021   ← año · powertrain (+ periodo solo si hace falta)
```

- `buildVehicleDisplayLabel()` deriva la etiqueta de campos estructurados (marca, modelo, versión, año, powertrain). No se guarda ningún texto derivado en la base de datos.
- **Año modelo** tal como lo declara la fuente; nunca se deduce de la matriculación.
- **Powertrain** traducido ("Eléctrico (BEV)", "Electric (BEV)"); el enum interno no cambia.
- **Identidad técnica (ADR-007)**: dos variants con el mismo nombre comercial, año y powertrain (Model 3 E6R/E6CR, Golf 2018 h33/h35) se distinguen por su **periodo de homologación**, nunca por códigos.
- Sin precios (derechos de S08 sin verificar), sin imágenes de fabricante (como mucho la silueta SVG) y sin puntuación de confianza.
- **Vista previa** (canal PREVIEW): si todo el catálogo visible es vista previa, un único aviso encima de la lista. El distintivo por fila solo aparece si se mezclan variants públicas y de vista previa.
- Marcas, modelos y versiones no se traducen; la interfaz sí.

## 4. Accesibilidad (WCAG 2.2 AA)

- Diálogo Radix (`@vscar/ui` `Sheet`): foco atrapado, Escape cierra; al cerrar, el foco vuelve al botón que lo abrió (`data-picker-trigger`).
- Al abrir, el foco va al buscador (`onOpenAutoFocus`).
- Patrón combobox ARIA 1.2: `role="combobox"`, `aria-expanded`, `aria-controls` → `role="listbox"`, `aria-activedescendant`, opciones `role="option"` con `aria-selected`. El coche del otro lado se marca `aria-disabled`.
- Teclado: ↑ ↓ mueven la opción activa (con vuelta), Intro elige, Escape cierra. Inicio/Fin mueven el cursor del texto, como en cualquier campo editable.
- Estado anunciado (`role="status"`, `aria-live="polite"`): "Buscando…", "3 resultados", pista inicial. Errores y "mismo coche" con `role="alert"`.
- Objetivos táctiles ≥ 44 px, `:focus-visible` visible y `prefers-reduced-motion` sin animación.

## 5. Escritorio y móvil

- **Escritorio**: panel de comando centrado (640 px, 80 vh), sobre el fondo atenuado.
- **Móvil (< 700 px)**: pantalla completa (`100svh`), lista con desplazamiento propio. No es un desplegable estrecho.
- Dirección visual 6d: oscuro, editorial, A azul / B arena (bordes de las ranuras A/B de la home), tipografía Geist. Movimiento solo en abrir/cerrar (CSS, 160 ms) y en el estado activo. Sin GSAP ni Motion dentro del selector.

## 6. Estados

| Estado | ES | EN |
|---|---|---|
| Sin resultados | No encontramos vehículos con esa búsqueda. | No vehicles match your search. |
| Error de catálogo (API 503/red) | No pudimos cargar el catálogo. + Reintentar | We couldn't load the vehicle catalog. + Try again |
| Mismo coche | Selecciona un coche diferente. | Choose a different car. |
| Vehículo no encontrado (404) | No encontramos uno de estos vehículos. | We couldn't find one of these vehicles. |

Con la base caída, la home se sirve igual (sin ejemplos) y el selector muestra el error controlado.

## 7. API interna

`GET /api/catalog/search?market=ES&q=golf[&limit=20]`. Es un **Route Handler** (no Server Action, no RSC). Motivos:
- GET cacheable;
- independiente de la URL de la página y del idioma;
- llamable desde cualquier isla;
- extraíble a la futura API pública v1.

Es interna, no un contrato público.

```json
{ "market": "ES", "query": "leon", "mode": "search",
  "results": [{ "id": "…", "slug": "seat-leon-2026-style-e-hybrid-204", "brand": "SEAT", "model": "León",
                "variant": "5P Style 1.5 e-HYBRID 204 CV", "year": 2026, "powertrainType": "PHEV", "bodyType": "hatchback",
                "preview": true }] }
```

- Validación Zod: `market` ∈ mercados configurados (sin mercado → 400), `q` ≤ 100 caracteres, `limit` 1–20. Las respuestas incluyen `Server-Timing: catalog;dur=…` y `Cache-Control: private, max-age=30`.
- Límite de peticiones preparado: 60 por 10 s por IP, en memoria → 429. Con varias instancias se sustituye por uno distribuido sin tocar a los llamadores.
- Errores: 400 `INVALID_QUERY`, 429 `RATE_LIMITED`, 503 `CATALOG_UNAVAILABLE`. Nunca un stack trace.
- Sin specs, precios ni datos internos: solo la identidad comercial mínima.

## 8. Rendimiento

| Medida | Resultado |
|---|---|
| JS inicial de la comparación | **152,7 KB** gzip (191,3 con polyfills `noModule`) → WITHIN BUDGET (≤ 200). 7a: 151,2 / 189,8. Las islas del par suman +1,5 KB |
| JS inicial de la home | 151,7 KB (190,3) |
| Selector (chunk diferido) | 4,3 KB gzip, al abrirlo por primera vez (+ Radix Dialog, compartido con la hoja de escenario) |
| Pipeline cliente (diferido) | 41,8 KB (antes 53,8: ya no incluye el dataset) |
| INP abrir selector | escritorio 40–56 ms · móvil ×4 56–104 ms |
| INP escribir en el buscador | escritorio 64 ms · móvil ×4 48–72 ms |
| INP cambio de escenario (con pipeline cliente) | escritorio 56–72 ms · móvil ×4 40–112 ms |
| Búsqueda (API) | p50 3,6 ms · p95 7,8 ms en frío; p50 1,5 ms en caliente |

Comprobaciones del informe de bundle: `selectorNotInitial`, `selectorChunkExists`, `noDbInClient` y las de la 7a.

## 9. Tests

- **Unidad (lector en memoria con el contrato del de MySQL)**: búsqueda exacta, parcial, sin acentos y por varios términos; ranking; navegación por debajo de 2 caracteres; etiquetas y periodo; nombres cortos distintos; PREVIEW 9 / PUBLIC 0; variant bloqueada fuera de búsqueda, slug y comparación; campo secundario oculto sin perder el coche; campo en conflicto que no pone la métrica a cero; slugs de par; 404 (inválido, desconocido, mismo coche); redirecciones; intercambio con la misma decisión; **dorado**: BYD vs Model 3 desde el catálogo = ruta de fixtures de la 7a (resultado completo, `scenarioHash` incluido).
- **MySQL** (`vscar_test`): búsqueda real, canal PUBLIC vacío, slugs y 404, dorado MySQL = memoria, servidor = recálculo cliente con datos serializados, `dataSnapshot`, API (mismo catálogo con `Accept-Language` es/en, acentos, validación, base caída → 503).
- **Fronteras**: selector diferido; `@vscar/db` solo en `src/server/**`; `server-only` en todo `src/server/**`; ningún `'use client'` ni el worker alcanzan servidor, datos o base; sin `not-found.tsx` de segmento (ver §10).
- **E2E (Playwright, Chrome)**: flujo completo del brief (home → BYD → Model 3 → comparar → 10 viajes → EN con par y escenario → intercambiar → atrás/adelante); teclado, mismo coche, Escape y foco; 404 específica ES/EN; validación de la API; mismo catálogo ES/EN.

## 10. Hallazgo: `not-found.tsx` por segmento y next-intl

Un `not-found.tsx` dentro de `[locale]/compare/[slug]` hacía que **`/en-es` se renderizara en español**. Next construye ese límite antes de ejecutar la página. Su `useTranslations()` resolvía la configuración de next-intl sin locale (aún no fijado), y esa configuración queda en la caché de la petición. Solución: un único `[locale]/not-found.tsx` (lo renderiza el layout, que ya fijó el locale) que elige el mensaje "vehículo no encontrado" según la ruta. Un test impide reintroducir un `not-found.tsx` de segmento.
