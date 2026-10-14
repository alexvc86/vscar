# VScar Web — SEO Foundation v0.1 (Step 7c)

> Estado: **PASS** · 2026-10-14 · Decisión: [ADR-015](../adr/ADR-015-comparison-url-and-indexability.md) · Código: `apps/web/src/server/seo.ts`, `apps/web/src/domain/canonical.ts`, `app/sitemap.ts`, `app/robots.ts`, `app/[locale]/compare/[slug]/opengraph-image.tsx`

Base técnica de SEO, sin envío de sitemap a buscadores en este paso. Regla central: **la página representa la comparación base (par + mercado); el escenario de la URL es una vista personalizada que no cambia la identidad SEO.**

## 1. Metadata de la comparación

| Campo | ES | EN |
|---|---|---|
| `<title>` | `{A} vs {B} — ¿Cuál encaja mejor contigo? \| VScar` | `{A} vs {B} — Which fits you better? \| VScar` |
| `description` | Compara {A} y {B} en coste, autonomía, prestaciones y uso real. VScar te muestra cuál encaja mejor con tus necesidades y por qué. | Compare {A} and {B} on cost, range, performance and real-world use. VScar shows you which one fits your needs better, and why. |

- Nombres comerciales (marca + modelo, distinguidos si coinciden); nunca IDs de ReferenceVariant.
- Sin "mejor coche", "ganador" ni "X beats Y", tampoco en empate (test).
- Traducción por next-intl (`seo.*`).

## 2. Canonical, hreflang, x-default

```
canonical  /{idioma}-{mercado}/compare/{par en orden canónico}     (sin query; uno por idioma)
hreflang   es-ES → /es-es/compare/…   ·   en-ES → /en-es/compare/…
x-default  → /es-es/compare/…        (idioma por defecto del mercado ES)
```

- `A-vs-B` y `B-vs-A` → **mismo canonical** (orden por slug). Las dos URL funcionan.
- `?km=…&trips=…` → mismo canonical que la URL base.
- Absolutas con `metadataBase` = `VSCAR_SITE_URL` (por defecto `http://localhost:4200`).
- Home y metodología: canonical/hreflang por idioma, sin escenario.

## 3. Open Graph y Twitter

- `og:title`, `og:description`, `og:url` (canonical), `og:type=website`, `og:site_name=VScar`, `og:locale` (`es_ES` / `en_ES`) y `og:locale:alternate`; `twitter:card=summary_large_image`.
- **Imagen OG generada** (`opengraph-image.tsx`, next/og, 1200 × 630 PNG, ~52 KB):
  - A en azul, "VS", B en arena;
  - estado del resultado con el **Canonical Comparison Scenario** (p. ej. "EMPATE PRÁCTICO" o "EL MEJOR PARA TUS NECESIDADES · BYD SEAL");
  - línea "Escenario de referencia · 15.000 km/año · España · ES-2026.10" y marca "Vista previa" en PREVIEW;
  - Geist, sin WebGL, sin fotos ni assets externos.
- **Estable**: la URL de la imagen es la misma con o sin parámetros de escenario (test E2E). No hay una imagen por escenario.

## 4. Robots e indexabilidad

| Canal | Página | robots |
|---|---|---|
| PREVIEW | todas | `noindex, nofollow` |
| PUBLIC | home, metodología | `index, follow` |
| PUBLIC | par editorial con los dos coches públicos (cualquier orden y escenario) | `index, follow` + canonical a la base |
| PUBLIC | cualquier otro par válido | `noindex, follow` (accesible, compartible, no indexable) |

- Pares editoriales: `INDEXABLE_PAIR_SLUGS` (lista corta; hoy = "Comparaciones de ejemplo"). Nunca N².
- `robots.txt` (dinámico por canal): `Allow: /` y `Disallow: /api/`; `Sitemap:` solo en PUBLIC. No bloquea assets ni páginas.
- `sitemap.xml` (dinámico):
  - PREVIEW: vacío;
  - PUBLIC: home + metodología por idioma + pares editoriales públicos, con `alternates`;
  - catálogo caído: solo páginas estáticas;
  - hoy (PUBLIC = 0 coches): 4 URL estáticas, sin error.
- **Hoy nada de VScar es indexable** en el despliegue local (PREVIEW). Con un catálogo PUBLIC sintético (tests), el par editorial es indexable y los demás no.

## 5. Datos estructurados (JSON-LD)

`WebPage` (nombre, descripción, URL canónica, idioma, `isPartOf: WebSite`) + `BreadcrumbList` (Inicio → Comparar → A vs B) + `mainEntity: ItemList` con los dos `Car` (nombre comercial, `Brand`, modelo, `vehicleModelDate` si existe).

**Nunca** `Review`, `rating` ni `aggregateRating`: VScar no tiene valoraciones y su resultado no es una reseña (test). El JSON se escapa (`<` → `<`).

## 6. Contenido sin JavaScript

El HTML del servidor contiene: nombres, resultado, motivos, capítulos relevantes (económico, técnico, práctico, tradeoffs), qué cambia el resultado, confianza, detalle completo y "Cómo lo calculamos" (test E2E con JS desactivado). La URL sin query usa el escenario canónico; con query válida, el escenario personalizado (ambos server-rendered). Una query inválida usa valores seguros, nunca un 500.

## 7. Mercados futuros

Todo parte de `LOCALES`/`MARKETS` (ADR-012): `/en-gb/compare/…` o `/en-us/compare/…` necesitan filas nuevas y su `CANONICAL_SCENARIOS[mercado]`, sin tocar la capa SEO.

## 8. Tests

- `test/seo.test.ts` (16):
  - canonical ordenado y escenario canónico versionado;
  - metadata ES/EN exacta, sin parámetros ni IDs, sin lenguaje de ganador;
  - hreflang + x-default, OG + Twitter;
  - PREVIEW `noindex, nofollow`;
  - PUBLIC sintético: indexable solo el par editorial (en los dos órdenes), `noindex, follow` el resto;
  - sitemap por canal (vacío en PREVIEW, solo estáticas con el catálogo público real vacío);
  - robots.txt; JSON-LD sin rating.
- `test/support/public-synthetic.ts`: catálogo PUBLIC **sintético** (BYD SEAL y Model 3 2021 publicados con identidad EXACT y fuente EEA), solo para tests; no toca MySQL ni el catálogo real.
- E2E (`share-seo.spec.ts`): PREVIEW `noindex` en home, metodología y comparaciones (con y sin escenario); robots.txt y sitemap sin URLs de fixtures; canonical al invertir el par; OG idéntica con y sin escenario y servida como PNG.
