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
- **Claves del Decision Engine**: el engine devuelve `{ messageKey, params, text }` (Step 6c). La UI no reconstruye razones: `renderEngineMessage()` busca `engine.{messageKey}`, formatea los `params` (importes en céntimos → moneda del mercado, km, €/kWh, niveles y variables traducidos) y aplica la plantilla ICU. Si falta la clave o un parámetro imprescindible, usa `text`, el respaldo inglés del engine; nunca la clave cruda. Un test recorre **todas** las claves de `MESSAGE_TEMPLATES` en ambos idiomas.
- **Etiquetas de métrica**: `technical.metrics.{spec_key con _}` (p. ej. `rng_electric_combined_km`), con respaldo en la etiqueta del engine.
- **Reglas Meaningful For You** (`for-you-v1`): mapa de la regla inglesa estable a `metricLayers.rules.*`.
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
