# VScar — i18n and markets

> Step 7a · Decisión: [ADR-012](../adr/ADR-012-i18n-market-routing.md) · Código: `apps/web/src/i18n/*`, `apps/web/messages/*`

## Regla fundamental

```text
language != market
```

| Concepto | Qué decide | Dónde | Ejemplos |
|---|---|---|---|
| **language** | textos, plantillas de mensajes, `<html lang>` | `LANGUAGES` (`es`, `en`) | `es` → "Empate práctico"; `en` → "Practical tie" |
| **market** | coches disponibles, precios, impuestos, fuentes, referencias energéticas, **moneda**, **unidades**, zona horaria, mercado de los engines | `MARKETS` (`ES`) | `ES` → EUR, km, L/100 km, kWh/100 km, Europe/Madrid, energía ES-MD |
| **locale** | una combinación ACTIVA idioma × mercado | `LOCALES` | `es-es`, `en-es` |
| **formatLocale** | locale de `Intl` para números y fechas de ESE par | `LOCALES[*].formatLocale` | `es-es` → `es-ES`; `en-es` → `en-GB` |
| **hreflang** | valor BCP 47 para SEO | `LOCALES[*].hreflang` | `es-ES`, `en-ES` |

`/en-es/` = inglés con datos de España: km y euros, no millas ni dólares. Las unidades nunca se derivan del idioma.

## Routing

```
/                          → /es-es          (desarrollo: sin geolocalización por IP)
/{locale}                  home
/{locale}/compare/{slug}   comparación (segmento canónico idéntico en todos los idiomas)
/{locale}/methodology      metodología
/es-es/comparar/{slug}     → /es-es/compare/{slug}  (alias, 308)
/{locale-no-activo}/…      404
```

- `[locale]` se valida contra `LOCALES` (`generateStaticParams` + `dynamicParams = false`).
- Las URLs no llevan barra final (`/es-es`, no `/es-es/`), como normaliza Next.
- **Selector de idioma**: cambia solo el segmento de locale y conserva página, comparación y query (`swapLocaleInPath`): `/es-es/compare/byd-seal-vs-tesla-model-3?km=18000` → `/en-es/compare/byd-seal-vs-tesla-model-3?km=18000`. Solo ofrece idiomas del **mismo mercado** (`sameMarketLocales`).

## Mensajes

- `messages/es.json` y `messages/en.json`, con namespaces `common`, `navigation`, `markets`, `home`, `comparison`, `decision`, `metricLayers`, `scenario`, `confidence`, `robustness`, `technical`, `economic`, `practical`, `methodology`, `units`, `errors` y `engine`. Un test exige el mismo conjunto de claves en los dos.
- **Mensajes de los engines**: ver *Decision Message Contract* más abajo.
- **Etiquetas de métrica**: `technical.metrics.{spec_key con _}` (p. ej. `rng_electric_combined_km`), con respaldo en la etiqueta del engine.
- **Faltas**: en producción, `getMessageFallback` devuelve cadena vacía (nunca la clave); en desarrollo devuelve la ruta de la clave para detectarla.

## Formato

`createFormat(formatLocale, market)` en `i18n/format.ts`. Los rangos usan raya sin espacios, y para importes respetan la posición del símbolo del locale. Nunca hay punto medio.

| Valor | `es-es` | `en-es` |
|---|---|---|
| distancia anual | `18.000 km/año` | `18,000 km/year` |
| importe | `386,10 €` | `€386.10` |
| intervalo de coste | `3,22–3,58 €/100 km` | `€3.22–€3.58/100 km` |
| intervalo anual | `23,96–123,68 €` | `€23.96–€123.68` |
| porcentaje | `80 %` | `80%` |
| fecha | `24 de septiembre de 2026` | `24 September 2026` |

El espacio antes de `€` es de no separación (U+00A0). La agrupación de miles es siempre `always` (`1.500` también en español), para que las tablas sean coherentes.

## SEO foundation

- `<html lang="es">` / `<html lang="en">` según el idioma del segmento.
- `canonical` = URL del locale **sin** escenario: el escenario es estado del usuario.
- `alternates.languages`: solo locales del mismo mercado más `x-default` (primer locale del mercado). No hay `hreflang` cruzado entre mercados.
- `robots: noindex, follow` hasta el quality gate de páginas (Plan §30).

## Cliente

El HTML inicial no envía catálogos al cliente. Las islas iniciales reciben sus textos como props desde el servidor. El chunk de recálculo y la hoja de escenario cargan el catálogo de su idioma bajo demanda (`client/messages.ts`, un chunk por idioma) y montan su propio `NextIntlClientProvider`.

## Añadir…

| Caso | Trabajo |
|---|---|
| **un idioma** (p. ej. `de`) | entrada en `LANGUAGES` + `messages/de.json` (mismo árbol de claves, verificado por test) + filas en `LOCALES` para los mercados donde se publique (`de-de`) |
| **un mercado** (p. ej. `GB`) | entrada en `MARKETS` (moneda GBP, unidades, zona horaria, región/fecha de energía) + datos del mercado (variantes, precios, energía) + fila en `LOCALES` (`en-gb`, `formatLocale: 'en-GB'`). Los engines reciben el mercado como dato: sin cambios |
| **un par existente** (p. ej. `es-us`) | fila en `LOCALES` (`formatLocale: 'es-US'`, `hreflang: 'es-US'`) |

Para millas, MPG o kW↔hp/CV harán falta conversiones de presentación (`@vscar/units`, Plan §28) cuando exista el primer mercado no métrico. Hoy `MarketConfig.units` ya declara qué sistema usa cada mercado.

## Nuevo / Usado (Step 8b)

- Textos de la UI en el namespace `used` (condición, formulario, revisión, resumen, capítulo "Este usado") y `scenario.requirements`; las razones, señales y verificación de la unidad son mensajes del engine (`engine.used.*`).
- El MERCADO fija las unidades también en inglés: `84,000 km`, `€28,000`, `March 2019` (en-ES) frente a `84.000 km`, `28.000 €`, `Marzo de 2019` (es-ES). En español, Intl no agrupa los números de 4 cifras (`9000 km`).
- Requisitos categóricos (historial completo): los mensajes llevan `flag: true` y las plantillas de requisitos tienen una rama `{flag, select, yes {…} other {…}}` para no mostrar "al menos 1".
- Cambiar de idioma conserva la query completa (escenario + bloque usado).

## Decision Message Contract

*Engine owns meaning. UI owns language. Market owns units/currency/data context.* (Step 7a.1; contrato completo en [ALPHA_DECISION_ENGINE_V0_1.md](../decision/ALPHA_DECISION_ENGINE_V0_1.md#decision-message-contract-step-7a1)).

- Los engines devuelven `{ messageKey, params, text, details? }`. La UI traduce con **una sola utilidad**: `translateDecisionMessage(msg, t, f, { inlineDetails })` en `src/i18n/engine-messages.ts`, que devuelve `{ text, fromCatalog }`. Busca `engine.{messageKey}` y aplica la plantilla ICU; `text` solo se usaría si faltara la clave (un test de cobertura lo impide).
- Formateo de `params` por convención, nunca caso a caso: `xMin`/`xMax` → rango con la unidad del mensaje; `xMinMinor`/`xMaxMinor` → importe en la moneda del mercado; `criterion`, `priority`, `level`, `category`, `status`, `component`, `code`… → tablas de enumeración del catálogo (`engine.criterion.*`, `engine.level.*`, …); nombres de vehículo tal cual.
- `details` se muestran como sublista (`components/compare/MessageText.tsx`) o en línea (`i18n.mInline`). La UI no compone frases de decisión (se eliminaron `contributionText`, `decision.statusLead`, `metricLayers.rules` y `economic.cheaper/notComparable/unknown/tie`).
- Catálogos: 100 claves de engine (64 decision + 36 comparison) en `es.json` y `en.json`: **100 % / 100 %**. Español natural ("El Tesla Model 3 te costaría unos 386 € menos al año con tu uso"), inglés llano y neutro. El idioma no cambia el mercado: `en-es` sigue en km y EUR.
- Tests (`test/engine-messages.test.ts`): claves del engine ⊆ es y ⊆ en; toda clave se renderiza desde el catálogo con parámetros sintéticos; en los 9 casos reales, ES sin inglés y EN sin español; independencia del respaldo (centinela); frases clave exactas; km/EUR en inglés.
- Añadir una clave: plantilla + esquema en el engine y entrada `engine.<clave>` en ambos catálogos. Los tests fallan si falta cualquiera.
