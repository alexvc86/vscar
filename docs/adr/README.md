# Architecture Decision Records (ADR)

> Estado: **READY** · 2026-09-24

A partir de la baseline [VSCAR_MASTER_PLAN.md v1.0](../VSCAR_MASTER_PLAN.md), las decisiones arquitectónicas o técnicas que evolucionen durante el desarrollo se documentan aquí, **sin reescribir retrospectivamente la baseline** (salvo cambios estratégicos mayores validados por producto).

También se usa un ADR para añadir cualquier funcionalidad P0/P1 al Alpha (sustituyendo otra y justificando el impacto).

## Formato

Fichero `ADR-NNN-titulo-en-kebab-case.md` con:

```markdown
# ADR-NNN — Título
- Estado: Propuesto | Aceptado | Sustituido por ADR-XXX | Rechazado
- Fecha: AAAA-MM-DD
- Decisores:

## Contexto
## Decisión
## Alternativas consideradas
## Consecuencias (positivas, negativas, riesgos)
## Referencias (secciones del Master Plan, documentos)
```

## Backlog inicial

| ADR | Título | Estado | Referencia en el plan |
|---|---|---|---|
| ADR-001 | vps-first-infrastructure | Propuesto (decisión tomada en baseline) | §44 |
| ADR-002 | mysql-alpha | Propuesto (decisión tomada en baseline) | §33 |
| ADR-003 | iis-reverse-proxy | Propuesto | §44.2 |
| ADR-004 | no-docker-alpha | Propuesto | §44.1, §49 |
| ADR-005 | lang-market-url | Formalizado en [ADR-012](ADR-012-i18n-market-routing.md) | §29 |
| ADR-006 | vscar-id-strategy (`CHAR(36)` vs `BINARY(16)`, canonicalKey) | Propuesto | §11, §33 |
| [ADR-007](ADR-007-reference-vs-used-instance.md) | reference-vs-used-instance + commercial vs technical identity (Homologation) | **ACCEPTED** (2026-09-24) | §9.1, §11 |
| ADR-008 | dataset-storage-strategy (MySQL + raw filesystem) | Propuesto | §33.1 |
| [ADR-009](ADR-009-data-provider-rights.md) | data-provider-rights | **ACCEPTED WITH OPEN LEGAL VERIFICATION** (2026-09-24) | §10.1 |
| [ADR-010](ADR-010-visual-motion-stack.md) | visual-motion-stack (ThreeUI Community para atmósfera, GSAP para scroll, Motion para UI, R3F condicionado) | **ACCEPTED FOR LAB** (2026-10-02) · §3 y §4 sustituidos por ADR-011 | §21, §22, §26 |
| [ADR-011](ADR-011-alpha-visual-stack-after-lab.md) | alpha-visual-stack-after-lab (RibbonField solo, reduced motion = estático, R3F rechazado para Alpha, SVG ONLY) | **ACCEPTED** (2026-10-02) | §21, §22, §26 |
| [ADR-012](ADR-012-i18n-market-routing.md) | i18n-market-routing (idioma ≠ mercado, `es-es`/`en-es`, segmento canónico `compare`, hreflang por mercado) | **ACCEPTED** (2026-10-02) | §27, §28, §29 |
| [ADR-017](ADR-017-used-facts-in-url-and-participant-identity.md) | used-facts-in-url-and-participant-identity (hechos de la unidad en un bloque URL versionado `u=1` + `eval`, sin persistencia; identidad de participante ≠ variant; ComparisonData como única fuente para servidor/cliente/worker; vistas con hechos de usado noindex) | **ACCEPTED** (2026-10-15) | §29, §34, §39, §42 |
| [ADR-016](ADR-016-used-adjustment-layer.md) | used-adjustment-layer (ReferenceVariant + UsedVehicleInstance → capa pura → mismos engines; `DecisionSubject` REFERENCE_VARIANT/USED_INSTANCE con identidad propia; un solo pipeline; información ≠ señales ≠ fiabilidad; sin score de usado; methodology 2026.7) | **ACCEPTED** (2026-10-14) | §9.1, §13.9, §17.3 |
| [ADR-015](ADR-015-comparison-url-and-indexability.md) | comparison-url-and-indexability (identidad de página = par + mercado; escenario en query sin efecto SEO; canonical por idioma en orden determinista; Canonical Comparison Scenario versionado; accesible ≠ indexable con lista editorial; PREVIEW noindex) | **ACCEPTED** (2026-10-14) | §29, §30, §42 |
| [ADR-014](ADR-014-vehicle-model-media-and-selector-flow.md) | vehicle-model-media-and-selector-flow (`VehicleModelMedia` persistente con derechos propios ≠ datos, canal derivado, fallback generación → modelo → silueta SVG; selector Marca → Modelo → Año → Versión que resuelve siempre una ReferenceVariant) | **ACCEPTED** (2026-10-14) | §21, §23, §24, §40 |
| [ADR-013](ADR-013-catalog-publication-and-routing.md) | catalog-publication-and-routing (canales PUBLIC/PREVIEW por derechos, capa de datos server-only, API interna de búsqueda, rutas por par de ReferenceVariants y política de slugs) | **ACCEPTED** (2026-10-13) | §10.1, §11, §29, §32 |

No es necesario escribirlos todos de inmediato: se redactan cuando la decisión se ejecuta.
