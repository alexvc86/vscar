# ADR-013 — Catálogo web: canales de publicación, API interna y rutas por par de ReferenceVariants

- **Estado**: ACCEPTED (2026-10-13)
- **Decisores**: producto + data workstream + frontend
- **Relacionado**: [ADR-007](ADR-007-reference-vs-used-instance.md) (identidad comercial vs técnica) · [ADR-009](ADR-009-data-provider-rights.md) (derechos) · [ADR-012](ADR-012-i18n-market-routing.md) (idioma × mercado) · [DATA_RIGHTS_MATRIX v0.2](../data/DATA_RIGHTS_MATRIX.md) · [DATA_ORCHESTRATION_V0_1](../web/DATA_ORCHESTRATION_V0_1.md) · [VEHICLE_SELECTOR_V0_1](../web/VEHICLE_SELECTOR_V0_1.md)

## Contexto

El Step 7b sustituye la comparación fija por un selector sobre el catálogo MySQL. Tres decisiones no estaban tomadas:
1. **Qué es "público"**. ADR-009 §9 prohíbe publicar datos de fuentes con derechos sin verificar (❓). Hoy son ❓ casi todas: fabricante (S08), IDAE (S02), ESIOS (S04). Además, las 9 variants del Dataset Core son `test_fixture` y 6 tienen identidad técnica no `EXACT`. Un filtro "público" estricto deja hoy el catálogo vacío. La Alpha privada necesita trabajar con esos datos sin publicarlos.
2. **Cómo busca el cliente** sin tocar la base de datos ni exponer una API pública prematura.
3. **Cómo se identifica un par** en la URL sin usar el nombre comercial como identidad (ADR-007).

## Decisión

1. **Dos canales de publicación**, configurados por despliegue con `VSCAR_PUBLICATION_CHANNEL`. Por defecto `PUBLIC`, que falla cerrado.
   - `PUBLIC`: solo registros `published`, identidad `EXACT`, y campos de fuentes con los cuatro derechos (`store`, `republish`, `commercial`, `derive`) ✅ o ⚠️ (con atribución).
   - `PREVIEW`: Alpha privada (noindex, local/staging). Admite registros `draft`/`test_fixture`, identidad `PARTIAL`/`UNCONFIRMED` y derechos ❓, siempre señalados como vista previa. Nunca ❌ ni `SECONDARY_REFERENCE`.
   - Estados de variant: `PUBLIC_AVAILABLE` · `INTERNAL_AVAILABLE` · `NOT_AVAILABLE` (`@vscar/quality` → `variantAvailability`).
2. **Derechos separados de la calidad.**
   - El registro `SOURCE_RIGHTS` es código y refleja la DATA_RIGHTS_MATRIX; un test compara ambos.
   - La comparabilidad reutiliza `vehicle_page_eligibility` (Catalog v0.2 §8) evaluada con los campos visibles: no hay regla paralela.
   - Publicación **por campo**: un campo no publicable se oculta. La variant solo cae si cae su identidad o no queda ninguna categoría comparable.
   - Ocultar un campo nunca resuelve un conflicto de calidad: los conflictos se calculan con todos los valores.
3. **Capa de datos server-only.** `apps/web/src/server/**` (todo `import 'server-only'`) es el único lugar de la web que usa `@vscar/db`, y solo a través de un `CatalogReader` de lectura. Sin SQL en la web; sin `mysql2`/`drizzle-orm` directos. Tests de grafo, ESLint e informe de bundle lo comprueban.
4. **API interna de búsqueda** `GET /api/catalog/search?market=&q=`: Route Handler cacheable, independiente del idioma y de la página. Respuesta mínima sin specs. **No es la API pública v1.**
5. **Rutas por par**: `/{language}-{market}/compare/{slugA}-vs-{slugB}`.
   - El orden A/B se conserva (la UI usa A/B) y el cálculo sigue siendo simétrico.
   - El slug es routing, no identidad: único por mercado (índice nuevo), nunca contiene `-vs-` (schema), estable.
   - Un slug publicado no se recalcula; los slugs antiguos van a `variant_slug_aliases` y redirigen con 308. `proposeVariantSlug()` solo asigna slugs a variants nuevas, con sufijos deterministas (año → powertrain → discriminador técnico) únicamente si colisionan.
   - Slug inválido, variant no seleccionable u otro mercado → 404. Nunca otro vehículo en su lugar.
6. **Los datos del par viajan del servidor al cliente** (`ComparisonData`: entradas de engine + energía + fuentes con derechos + huella de datos). El cliente y el Web Worker recalculan con los mismos hechos que el RSC, sin consultar nada.

## Alternativas consideradas

- **Solo canal estricto**: correcto legalmente, pero deja la Alpha sin catálogo hasta verificar derechos, y no permite validar producto. Se mantiene como canal por defecto.
- **Tratar fixtures y derechos ❓ como publicables**: contradice ADR-009 §9 y la etiqueta "no publicable" del Dataset Core. Rechazada.
- **Server Actions para buscar**: POST no cacheable y ligado al árbol de React. Rechazada para búsqueda (válida para mutaciones futuras).
- **Catálogo completo en el cliente** (búsqueda local): no escala a 50–80 variants con specs, expone datos internos y obliga a filtrar derechos en el cliente. Rechazada.
- **Slug = nombre comercial** (`golf-etsi`): colisiona entre variants técnicas (ADR-007). Rechazada. **Id técnico (UUID) en la URL**: estable pero ilegible y malo para compartir. Rechazada.

## Consecuencias

- **Positivas**:
  - publicar un coche es cambiar datos (registro `published`, identidad `EXACT`, derechos verificados), sin tocar código;
  - el canal PUBLIC ya está probado y hoy muestra un catálogo vacío;
  - DB fuera del cliente garantizado por tres mecanismos;
  - URLs legibles y compartibles con escenario.
- **Negativas**:
  - hasta verificar derechos (S08, S02, S04) y curar identidades `EXACT`, el catálogo público está vacío: la Alpha es una vista previa privada;
  - el HTML de la comparación incluye ~20 KB de datos del par (4,4 KB gzip).
- **Riesgos**: un despliegue público con `PREVIEW` por error mostraría datos pendientes de derechos. Mitigación: `PUBLIC` por defecto, aviso visible de vista previa, y una comprobación del despliegue (pendiente de la Step de despliegue).
