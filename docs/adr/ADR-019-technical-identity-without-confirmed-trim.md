# ADR-019 — Variantes con identidad técnica exacta y acabado no confirmado

- **Estado**: **ACCEPTED — variante B** (2026-10-21, decisión de producto comunicada en el encargo de Step D1.6). Propuesta inicial: PROPOSED (2026-10-16)
- **Alcance de la aceptación**: **solo la arquitectura de curación técnica**. No autoriza publicar datos, no aprueba ninguna fuente y no relaja PREVIEW ni PUBLIC
- **Decisores**: producto + data workstream (+ legal para los derechos de cada fuente, por separado)
- **Relacionado**: [ADR-007](ADR-007-reference-vs-used-instance.md) · [ADR-009](ADR-009-data-provider-rights.md) · [ADR-013](ADR-013-catalog-publication-and-routing.md) · [ADR-018](ADR-018-catalog-target-100-curated-incremental.md) · [D1_2_COMMERCIAL_IDENTITY_AUDIT_V0_1](../data/D1_2_COMMERCIAL_IDENTITY_AUDIT_V0_1.md) · [D1_5_20_VARIANT_READINESS](../data/D1_5_20_VARIANT_READINESS.md) §4 · [D1_6_TECHNICAL_CURATION_ARCHITECTURE](../data/D1_6_TECHNICAL_CURATION_ARCHITECTURE.md)

## Contexto

Con EEA + RDW, 95 de los 100 candidatos tienen identidad **técnica** exacta en dos registros oficiales, pero solo 3 tienen identidad **comercial** exacta (acabado). El schema `ReferenceVariant` (Catalog v0.2 §2.1) exige `trim_name`, `generation_code` y `model_year`, y **ninguna fuente abierta da generación ni año-modelo** (D1.3–D1.5). Resultado: 0 de 20 candidatos D2 importables sin inventar.

D1.2 demostró además que una versión técnica se vende con **varios acabados** (Peugeot 3008 PHEV: 5): el acabado no es una propiedad 1:1 de la variante técnica.

## Decisión (variante B)

Tres niveles separados:

```
RESEARCH DATASET  →  CURATED TECHNICAL DATASET  →  SELECTABLE REFERENCE CATALOG
```

1. **Research dataset**: fuentes externas y coincidencias candidatas (S14–S19, catálogos). Viven en `data/research/`. No se publican, no alimentan motores y no aparecen en el selector.
2. **Curated technical dataset** (nuevo, `curated_*` en MySQL; `CuratedTechnicalVehicle` en `@vscar/vehicle-schema`):
   - **Clave**: vehículo real identificado por **TAN completo + variante + versión** (EXACT, EEA corroborada por RDW).
   - **Contenido**: observaciones oficiales por campo (`SpecValue` + procedencia, derechos, calidad y conflicto).
   - **Identidad comercial opcional**: generación, año-modelo y acabado opcionales, como candidatos con estado (UNCONFIRMED / PARTIAL / EXACT). **Nunca inventados**: el año de matriculación no es año-modelo.
3. **Selectable reference catalog** (`reference_variants`, sin cambios):
   - solo variantes **promovidas explícitamente** que superan las reglas actuales del canal (ADR-013);
   - un registro de curación **nunca** se convierte automáticamente en `ReferenceVariant`.

## Consecuencias

- **Positivas**: VScar almacena vehículos reales y trazables aunque falten datos comerciales.
  - Primer lote: 18 vehículos en `vscar_dev`.
  - Ampliación preparada: 92 técnicamente elegibles.
  - Importación idempotente y reanudable.
- **Negativas**: dos modelos de datos (curación y catálogo) y una promoción futura que hay que diseñar con sus reglas.
- **Riesgos**: que la capa técnica se confunda con catálogo publicable. Mitigación:
  - tablas separadas;
  - el lector del selector no las consulta (test);
  - ruta interna protegida por autenticación y `noindex`.

## Exclusiones (lo que esta aceptación NO cambia)

- PUBLIC y PREVIEW mantienen sus exigencias: identidad comercial, generación, año-modelo, claves críticas y derechos.
- Ninguna fuente se aprueba (S11 RDW y S13 Traficom siguen ❓; ver [D1_6_OFFICIAL_SOURCE_RIGHTS_REVIEW](../data/D1_6_OFFICIAL_SOURCE_RIGHTS_REVIEW.md)).
- Sin cambios en Methodology 2026.7, motores, Economic Fit ni esquema de `reference_variants`.
- Los puntos 1–4 de la propuesta original (variante PARTIAL seleccionable en PREVIEW) **no** se implementan; quedan para una decisión posterior con datos de la capa técnica.

## Alternativas descartadas

- **Mantener el schema sin capa técnica**: 0 % de candidatos importables (D1–D1.5).
- **Rellenar acabado o generación con conjeturas**: rechazada (anti-invención).
- **Usar la designación RDW como identidad comercial**: rechazada (es una lista de nombres permitidos, no identidad).
