# ADR-009 — Data provider rights y política de fuentes

- **Estado**: ACCEPTED WITH OPEN LEGAL VERIFICATION
- **Fecha**: 2026-09-24
- **Decisores**: producto + data workstream (verificación legal pendiente por fuente)
- **Relacionado**: [VSCAR_MASTER_PLAN.md v1.0](../VSCAR_MASTER_PLAN.md) §10, §10.1, §33.2 · [DATA_RIGHTS_MATRIX.md v0.2](../data/DATA_RIGHTS_MATRIX.md) · [SPEC_KEY_CATALOG.md v0.2](../data/SPEC_KEY_CATALOG.md) §3–§6 · [FINDINGS](../data/dataset-core-v0.1/FINDINGS.md) (decisiones D1, D3, D5)

## Contexto

VScar construye un dataset propio alimentado por fuentes externas mediante adapters y provenance. El Dataset Core v0.1 mostró que: (a) las fuentes públicas cubren bien la mayoría de claves críticas de coches recientes; (b) los históricos (sobre todo precios de lista) dependen de páginas oficiales archivadas; (c) algunos datos técnicos clave (consumo *charge-sustaining* de PHEV) solo se publican en otro mercado UE; (d) las fuentes secundarias contienen mucho de lo que falta, pero no son publicables; (e) los derechos de uso de ninguna fuente están aún verificados.

## Decisión

1. **Free/public first.** Alpha se alimenta de fuentes oficiales públicas (EEA, IDAE, MITECO, ESIOS, DGT, Safety Gate, Euro NCAP citado según derechos, fabricantes, CoC) y de curación manual con fuente citada.
2. **Fuentes comerciales solo ante bloqueo crítico** demostrado en la DATA_RIGHTS_MATRIX y decidido por ADR. Candidatos identificados: precios históricos y batería útil. Si se integran, son un adapter más, no el sistema central.
3. **Sin scraping de marketplaces** ni portales de anuncios; integración futura solo vía API, partnership, feed licenciado o crawling expresamente permitido. Sin extracción masiva de sitios de terceros.
4. **Fuentes secundarias** (`SECONDARY_REFERENCE`): solo para localizar fuentes, detectar conflictos, QA y plausibilidad; no publicables como dato primario ni alimentan engines públicos en Alpha.
5. **Archivos oficiales aceptables como fuente** (D3): PDFs y páginas oficiales archivadas, incluida Wayback de páginas oficiales, conservan la `source_authority` del original (`archived`, `archive_url`, `original_url`), **sujetos a los derechos de la fuente original**; el archivo no otorga derechos adicionales.
6. **Cross-market technical data** (D1): permitido para datos técnicos de homologación **solo con `homologation_match = EXACT`** (mismo TAN/Va/Ve o equivalente) para uso automático; `PARTIAL` requiere revisión humana; `UNCONFIRMED` no se usa. Nunca para precio, garantía, equipamiento, promociones, impuestos, incentivos ni etiqueta DGT.
7. **`source_market` visible y trazable** en todo dato cross-market y en "How we calculated this".
8. **Jerarquía de fuentes estructurales** (D5): CoC/homologación → fabricante del mercado → configurador oficial → organismo oficial → fabricante UE con misma homologación → secundaria (solo contraste). La autoridad (`source_authority`) se evalúa separada de la exactitud del mapeo (`mapping_confidence`).
9. **Verificación legal continúa por fuente.** Ningún derecho individual se considera aprobado mientras figure `❓` en la matriz. Ningún dato de una fuente se publica hasta que sus derechos `store + republish + commercial + derive` estén verificados o exista una alternativa de curación manual aprobada.

## Alternativas consideradas

- **Contratar un proveedor comercial desde el inicio**: rechazada para Alpha (coste, dependencia, validación pendiente).
- **Usar fuentes secundarias como fuente primaria para rellenar huecos**: rechazada (riesgo legal, derecho *sui generis*, trazabilidad).
- **Prohibir cross-market**: rechazada; dejaría sin Economy/Range a los PHEV en España.
- **Cross-market por nombre comercial**: rechazada; exige equivalencia de homologación.

## Consecuencias

- Alpha puede avanzar sin coste de datos, con huecos explícitos (categorías `NOT_AVAILABLE`/`PARTIAL`) en lugar de datos no verificados.
- La verificación legal por fuente se convierte en tarea P0 del data workstream antes de publicar.
- Se necesita un proceso de matching de homologación (EEA `TAN`/`Va`/`Ve`) para aplicar D1.
- Queda abierta la posible necesidad de proveedor comercial para precios históricos y batería útil; se reevaluará con 50–80 variants.
