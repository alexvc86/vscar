# ADR-012 — i18n × market routing

- **Estado**: ACCEPTED (2026-10-02)
- **Fecha**: 2026-10-02
- **Decisores**: producto + frontend
- **Relacionado**: Master Plan §27 (i18n), §28 (l10n), §29 (Worldwide SEO), §34 · ADR-005 (lang-market-url, propuesto en baseline) · [I18N_AND_MARKETS.md](../web/I18N_AND_MARKETS.md) · [WEB_FOUNDATION_V0_1.md](../web/WEB_FOUNDATION_V0_1.md)

## Contexto

`apps/web` nace multiidioma. El plan fija URLs `/{lang}-{market}/` (§29) y "locale ≠ market ≠ unit system" (§28), pero la separación no estaba formalizada como decisión técnica. Además, §29 proponía traducir el segmento funcional (`/es-es/comparar/…`, `/en-es/compare/…`). El Step 7a pide arquitectura estable, SEO correcto y mantenible, y que añadir un tercer idioma o un segundo mercado sea configuración y traducción, no reescritura.

## Decisión

1. **Idioma y mercado son independientes.** El idioma decide los textos; el mercado decide coches, precios, impuestos, fuentes, referencias energéticas, moneda, zona horaria y unidades. `/en-es/` = inglés con datos de España (km, L/100 km, kWh/100 km, EUR).
2. **Idiomas iniciales**: `es`, `en`. **Mercado inicial**: `ES`. **Locales activos**: `es-es`, `en-es`.
3. **Contrato explícito** (`apps/web/src/i18n/locales.ts`): registros `LANGUAGES` y `MARKETS` y la tabla `LOCALES` de combinaciones activas. Cada fila lleva `segment`, `language`, `market`, `formatLocale` (locale de `Intl`) y `hreflang`. Los tipos `LanguageCode` y `MarketCode` salen de los registros: añadir `US`, `GB`, `DE`, `FR`, `MX` o `PE` es añadir entradas, sin uniones fijas que lo impidan.
4. **Locale de formato por par**, no por idioma: CLDR `en-ES` formatea `18.000` y `3,22`, así que `en-es` usa `en-GB` (`18,000 km/year`, `€386.10`); `es-es` usa `es-ES`.
5. **Routing**: `/[locale]/…` validado contra `LOCALES` (`dynamicParams = false`; cualquier otro segmento da 404). **Segmento funcional canónico único** en todos los idiomas: `/es-es/compare/{slug}`, `/en-es/compare/{slug}`, `/{locale}/methodology`. Las etiquetas visibles sí se traducen. `/es-es/comparar/{slug}` redirige (308) a la forma canónica. **Esta decisión se desvía de la propuesta de §29** (segmento traducido): una sola ruta por página evita duplicar el árbol de rutas por idioma, simplifica el cambio de idioma conservando página y escenario, y no afecta al SEO porque el slug, `hreflang` y `canonical` siguen siendo correctos por locale.
6. **Raíz**: `/` → `/es-es` (redirect temporal) en esta fase. Sin geolocalización por IP (§29).
7. **next-intl sin middleware**: el locale de next-intl es el segmento (`es-es`); los mensajes se cargan por idioma y la zona horaria por mercado. Los catálogos (`messages/{es,en}.json`) van por namespaces. Las claves del engine (`messageKey` del Step 6c) viven bajo `engine.*` con la misma ruta y se resuelven con un adaptador. Si falta una clave, el respaldo es el texto inglés del engine, nunca la clave cruda.
8. **SEO foundation**: `<html lang>` por idioma, `canonical` por locale sin el escenario (es estado del usuario), `hreflang` solo entre idiomas del **mismo mercado** más `x-default`. Sin `hreflang` entre mercados distintos (§29).
9. **Cambio de idioma**: conserva mercado, página, comparación y query de escenario (`swapLocaleInPath`).

## Alternativas consideradas

- **Segmento traducido** (`/es-es/comparar/…`) como en §29: obliga a mapear rutas por idioma (o a usar `pathnames` de next-intl) y a mantener la equivalencia en el selector de idioma, en sitemaps y en los enlaces. Se mantiene solo como alias con redirect.
- **Middleware de next-intl con locales BCP 47** (`es-ES`, `en-ES`): mezcla idioma y mercado en un único "locale" y el formato de `en-ES` no es el esperado en inglés. Rechazada.
- **Mercado en query o cookie**: rompe URLs compartibles y SEO. Rechazada.

## Consecuencias

- **Positivas**: un mercado nuevo es una fila en `MARKETS` + datos; un idioma nuevo es una fila en `LANGUAGES` + catálogo; un locale nuevo es una fila en `LOCALES`. Engines y rutas no cambian. Tests de contrato: claves idénticas entre catálogos, formato por locale y preservación del escenario al cambiar de idioma.
- **Negativas**: el segmento `compare` en inglés aparece también en URLs en español (las etiquetas visibles sí están traducidas).
- **Riesgos**: varias frases del engine (Step 6b: contribuciones, explicaciones y reglas Meaningful For You) siguen siendo texto inglés sin `messageKey`. El adaptador las localiza a partir de campos estructurados (`metric`, `level`, `component`, reglas de `for-you-v1`). Las que no tienen estructura (`detail` de confianza, `reason` de requisitos, `what` de verificación) se muestran en inglés como respaldo. Se propone añadir `messageKey` en esos puntos en un Step de engine.

## Referencias

`apps/web/src/i18n/*` · `apps/web/messages/*` · tests `apps/web/test/i18n.test.ts`, `apps/web/e2e/smoke.spec.ts`.
