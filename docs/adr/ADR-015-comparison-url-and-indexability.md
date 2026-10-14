# ADR-015 — URL de comparación, canonical, escenario e indexabilidad

- **Estado**: ACCEPTED (2026-10-14)
- **Decisores**: producto + frontend + SEO
- **Relacionado**: [ADR-012](ADR-012-i18n-market-routing.md) (idioma × mercado) · [ADR-013](ADR-013-catalog-publication-and-routing.md) (canales, rutas por par) · [SHAREABLE_COMPARISONS_V0_1](../web/SHAREABLE_COMPARISONS_V0_1.md) · [SEO_FOUNDATION_V0_1](../web/SEO_FOUNDATION_V0_1.md)

## Contexto

Cada comparación debe ser una página estable, compartible y preparada para SEO. El escenario personalizado (km/año, viajes, carga, horizonte, prioridades) vive en la query y cambia con cada ajuste. Con 50–80 coches, las combinaciones posibles son miles (N²) y las vistas personalizadas, infinitas. El catálogo PUBLIC está hoy vacío y PREVIEW contiene fixtures, que nunca deben indexarse.

## Decisión

1. **Identidad de página ≠ escenario.**
   - **Identidad** = coche A + coche B + mercado → `/{idioma}-{mercado}/compare/{a}-vs-{b}`.
   - **Escenario** = query (`?km=&trips=&years=&home=&cost=&space=&performance=`): vista personalizada de la misma página. No cambia título, canonical, hreflang, OG ni sitemap.
2. **Canonical sin escenario y por idioma**: `/es-es/…` y `/en-es/…` tienen cada uno el suyo; nunca se canonicaliza EN hacia ES. Se conectan por `hreflang` (`es-ES`, `en-ES`), y **`x-default` → idioma por defecto del mercado** (`es-es` para ES).
3. **Orden canónico del par: determinista por slug.**
   - `A-vs-B` y `B-vs-A` funcionan las dos (el intercambio es útil y conserva colores A/B); el `canonical` y `og:url` apuntan siempre al orden ordenado.
   - Sin redirect: el par invertido es una vista legítima, no un duplicado a eliminar.
4. **Canonical Comparison Scenario por mercado, versionado** (`ES-2026.10` = escenario por defecto de la web). Lo usan el contenido de la URL sin query (indexable) y la **imagen OG**, que por tanto es estable y no se genera por escenario.
5. **Accesible ≠ indexable.**
   - Cualquier par válido funciona y se comparte.
   - Solo son indexables los pares de una **lista editorial** (`INDEXABLE_PAIR_SLUGS`, hoy = comparaciones de ejemplo), y solo si sus dos coches son públicos (canal PUBLIC).
   - No se generan las N² combinaciones. No se crea tabla de registro: con una lista editorial basta en Alpha.
6. **Robots por canal.**
   - **PREVIEW**: `noindex, nofollow` en todas las páginas y sitemap vacío.
   - **PUBLIC**: par editorial con coches públicos → `index, follow`; cualquier otro par → `noindex, follow`.
   - `robots.txt` nunca bloquea páginas (los buscadores deben ver el `noindex`); solo bloquea `/api/`. El sitemap solo se anuncia en PUBLIC.
7. **Compartir = URL actual completa** (Web Share API o copiar enlace). Sin login, sin sesión, sin persistencia ni acortador: la comparación se reconstruye con ruta + query + datos vigentes (con su `dataSnapshot`).
8. **Datos estructurados honestos**: `WebPage` + `BreadcrumbList` + `ItemList` (dos `Car`). Nunca `Review`, `rating` ni `aggregateRating`.

## Alternativas consideradas

- **Canonical con escenario**: miles de URL canónicas casi iguales y contenido "personal" indexado. Rechazada.
- **Redirigir B-vs-A → A-vs-B**: rompe el orden elegido por el usuario y el intercambio. Rechazada: basta el canonical.
- **Indexar todas las combinaciones válidas**: contenido fino y repetitivo a gran escala. Rechazada.
- **Tabla `comparison_page_registry`**: innecesaria para una lista corta; se reevaluará con datos de uso reales (sin inventar popularidad).
- **OG por escenario**: imágenes ilimitadas y cachés inútiles. Rechazada.
- **Bloquear PREVIEW en robots.txt**: impediría ver el `noindex`; las URL podrían indexarse igualmente por enlaces. Rechazada.

## Consecuencias

- **Positivas**: URLs estables y reproducibles; indexación controlada por datos (derechos + lista editorial); nuevos mercados (`/en-gb`, `/en-us`) sin reescribir la capa SEO (todo parte de `LOCALES`).
- **Negativas**: hoy nada es indexable (PUBLIC = 0 coches), lo cual es correcto. La lista editorial necesita mantenimiento manual hasta tener datos de demanda.
- **Riesgos**: un despliegue PUBLIC con `VSCAR_SITE_URL` incorrecto daría canonical/OG con otro origen. Mitigación: variable obligatoria en el checklist de despliegue.
