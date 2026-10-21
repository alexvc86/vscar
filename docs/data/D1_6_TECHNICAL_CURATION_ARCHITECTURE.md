# VScar — D1.6 Arquitectura de la capa de curación técnica (ADR-019 B)

> Estado: **implementada** · 2026-10-21 · ADR: [ADR-019](../adr/ADR-019-technical-identity-without-confirmed-trim.md) (ACCEPTED, variante B) · Esquema: [`technical-curation.ts`](../../packages/vehicle-schema/src/technical-curation.ts) · Migración: [`0008_technical_curation.sql`](../../packages/db/drizzle/0008_technical_curation.sql) (reversión manual: [`down/0008_technical_curation.down.sql`](../../packages/db/drizzle/down/0008_technical_curation.down.sql))

## 1. Tres niveles

| Nivel | Dónde | Quién lo ve | Alimenta motores |
|---|---|---|---|
| Research dataset | `data/research/` (fuera de Git), artefactos D1.3–D1.5 | nadie fuera del equipo | no |
| **Curated technical dataset** | tablas `curated_*` (MySQL) | ruta interna con autenticación (`/internal/catalog`) | **no** |
| Selectable reference catalog | `reference_variants` + `spec_values` (sin cambios) | selector PREVIEW/PUBLIC según canal | sí |

Un vehículo curado **no es** una `ReferenceVariant`. La promoción al catálogo seleccionable será explícita y cumplirá las reglas del canal (no implementada en D1.6).

## 2. Entidades

| Entidad (Zod) | Tabla | Contenido |
|---|---|---|
| `CuratedTechnicalVehicle` | `curated_technical_vehicles` | ver detalle debajo |
| `CuratedAttribute` | `curated_attributes` | `TECHNICAL` (asientos, puertas, marchas, tracción, carrocería, caja) siempre **OBSERVED** con fuente oficial; `COMMERCIAL` (generación, año-modelo, acabado, designación) con estado **UNCONFIRMED/PARTIAL/EXACT** |
| `CuratedObservation` | `curated_spec_values` | `SpecValue` v0.2 completo (misma validación por SpecKey) + `source_code`, `source_record`, `identity_match = EXACT_TAN_VA_VE`, `rights_status`, `quality_status`/`quality_reasons`, `conflict_status`/`conflict_group` |
| — | `curated_import_runs` · `curated_import_items` | ejecuciones y estado por vehículo (idempotencia y reanudación) |

`CuratedTechnicalVehicle` guarda:
- clave técnica `TAN|Va|Ve` única por mercado;
- marca y modelo de la fuente oficial;
- TAN completo con extensión, variante y versión (EXACT);
- tren motriz de homologación y clase de producto;
- **periodo de matriculación observado** (no año-modelo);
- estado de identidad comercial y de curación;
- fuentes, bloqueos y trazabilidad con la candidata D1.

Separaciones aplicadas en el esquema:
- `registration_year ≠ model_year`: un `model_year` cuya evidencia sea matriculación o producción se rechaza.
- `generation_candidate ≠ generation_verified`: un atributo comercial nunca es OBSERVED.
- `commercial_trim ≠ technical_homologation`: un acabado nunca es atributo técnico.
- Las fuentes DENIED y los datos `SECONDARY_REFERENCE` no se pueden curar.

## 3. Reglas de importación

1. **Entrada**: identidad técnica EXACT (EEA) corroborada por RDW (`matchRdw = EXACT`) y sin solapamiento DUPLICATE/PROBABLE_DUPLICATE con el catálogo (D1.2).
2. **Observaciones** solo de fuentes oficiales con clave exacta:
   - S01 EEA (valores de la candidata D1);
   - S11 RDW (`rdwSpecValues`, D1.1);
   - S13 Traficom (caja y carrocería con código inequívoco, D1.3).
3. **Identidad comercial**: solo lo curado en D1.2.
   - Acabado EXACT: #26 desde la designación EEA; #4 desde IDAE (S02, pendiente).
   - Designación oficial literal (EEA `Cn`).
   - Generación y año-modelo: **ninguna fila** (sin fuente).
4. **Calidad con el motor existente**:
   - `engineUsability` por valor;
   - Conflict Engine (`detectConflicts`) sobre todos los valores del vehículo;
   - los valores en conflicto se conservan todos (estado `CONFLICT`, nunca un promedio).
5. **Derechos**: traducción del registro `SOURCE_RIGHTS` (`rightsDecision`). S01 → CONDITIONAL; S02/S11/S13 → PENDING; nunca se aprueba aquí.
6. **Idempotencia**:
   - ids deterministas (UUID v5 de la clave);
   - una transacción por vehículo (reemplaza sus atributos/observaciones);
   - huella por elemento: un elemento IMPORTED con la misma huella se omite;
   - un fallo deja los anteriores confirmados y el run en FAILED; la siguiente ejecución reanuda.
7. **Duplicados**: misma `TAN|Va|Ve` con otro id → `DuplicateTechnicalIdentityError`.

> **Step D1.6a**: el importador ya no reescribe en silencio. Clasifica cada elemento (INSERT/SKIP/UPDATE/REJECT) y un UPDATE exige `allowUpdates`. Añade dry-run, bloqueo contra ejecuciones simultáneas y restricciones en MySQL (0009). Detalle en [D1_6A_MYSQL_SCHEMA_AUDIT](D1_6A_MYSQL_SCHEMA_AUDIT.md).
8. **Fuentes**: se añaden las que falten en `sources`; una existente nunca se modifica.
9. **Aislamiento**: el lector del selector (`createCatalogReader`) no consulta `curated_*` (test).

## 4. Scripts

| Script | Red | MySQL | Salida |
|---|---|---|---|
| `node packages/curation/scripts/d16-build.ts` | no | no | `data/curation/d16/plan-first-18.json` (fuera de Git) · [`d16/first-18-plan.json`](d16/first-18-plan.json) · [`d16/expansion-92.json`](d16/expansion-92.json) (deterministas) |
| `node --env-file=.env packages/db/scripts/technical-import.ts` | no | sí (solo `*_dev`/`*_test`) | [`d16/import-report.json`](d16/import-report.json): dos ejecuciones, idempotencia y huella del catálogo existente antes/después |

## 5. Pendiente (fuera de D1.6)

- Diseño de la **promoción** al catálogo seleccionable (reglas por canal y revisión humana).
- Etiqueta DGT derivada: no se guarda como observación (es un cálculo); por eso la completitud crítica de la capa es menor que la de D1.1 (§ [informe](D1_6_FIRST_18_IMPORT_REPORT.md)).
