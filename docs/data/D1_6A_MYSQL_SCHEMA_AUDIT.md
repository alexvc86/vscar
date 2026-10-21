# VScar — D1.6a Auditoría MySQL de la capa de curación técnica

> Estado: **revisada y endurecida** · 2026-10-21
> - **Migraciones**:
>   - [`0008_technical_curation`](../../packages/db/drizzle/0008_technical_curation.sql) (D1.6, sin cambios);
>   - [`0009_curation_hardening`](../../packages/db/drizzle/0009_curation_hardening.sql) (D1.6a).
> - **Reversión manual**: [`down/0008…`](../../packages/db/drizzle/down/0008_technical_curation.down.sql) · [`down/0009…`](../../packages/db/drizzle/down/0009_curation_hardening.down.sql).
> - **MySQL**: 8.0.39 · `utf8mb4_0900_ai_ci` · InnoDB · REPEATABLE-READ (`vscar_dev` y `vscar_test`).

## 1. Revisión de 0008 (tal como se aplicó en D1.6)

| Tabla | PK | FK | Únicos / índices | Observación |
|---|---|---|---|---|
| `curated_technical_vehicles` | `id` CHAR(36) | — | UNIQUE `(market_code, technical_key)` · índice `(brand, model)` | identidad protegida solo por la clave **derivada** `TAN\|Va\|Ve` |
| `curated_attributes` | `id` | `vehicle_id` → vehículos | índice `(vehicle_id, attribute)` | reglas TECHNICAL/COMMERCIAL solo en Zod |
| `curated_spec_values` | `id` | `vehicle_id` → vehículos · `source_id` → `sources` · `raw_ingest_id` → `raw_ingest` | `(vehicle_id, spec_key)` · `(source_id)` | procedencia (fuente, registro, URL, fecha) en cada fila; reglas de derechos/conflicto solo en Zod |
| `curated_import_runs` | `id` | — | — | estado del run |
| `curated_import_items` | **ninguna** | **ninguna** | UNIQUE `(batch_key, technical_key)` | sin PK explícita ni FK al run |

- **Tipos**:
  - UUID en CHAR(36);
  - fechas DATE en modo string;
  - JSON nativo;
  - `double` para valores físicos;
  - VARCHAR para enums (convención ADR-002).
- **Longitudes**: suficientes (TAN ≤ 64, versión ≤ 128, clave ≤ 255, URL ≤ 2048).
- **Nulabilidad**: coherente con Zod (solo opcionales nulos).
- **Integridad referencial**: `ON DELETE NO ACTION` en todas las FK. Nunca hay borrado en cascada: la procedencia no puede desaparecer en silencio.
- **Transacciones**: una por vehículo (`writeItem`). Las filas de un vehículo se escriben todas o ninguna (probado: pérdida de conexión a mitad de lote).
- **Collation `ai_ci`**:
  - `technical_key` es única sin distinguir mayúsculas.
  - Como `technicalKeyOf` normaliza a mayúsculas, dos identidades que solo difieran en mayúsculas se **rechazan** como duplicado.
  - Falla cerrado: nunca se fusionan.

### Hallazgos

| # | Hallazgo | Riesgo | Corrección D1.6a |
|---|---|---|---|
| M1 | La identidad TAN completo + Va + Ve solo estaba protegida por la clave derivada | una clave mal construida en código podría duplicar la identidad | UNIQUE `(market_code, type_approval_number, variant_code, version_code)` |
| M2 | Reglas de curación solo en TypeScript (Zod) | una escritura fuera del repositorio podría guardar una generación "observada" o un valor DENIED | 10 restricciones `CHECK` (ver §2) |
| M3 | `curated_import_items` sin PK ni FK al run | estado de reanudación sin integridad | PK `(batch_key, technical_key)` + FK `run_id` → `curated_import_runs` + índice `technical_key` |
| M4 | Un elemento cambiado reescribía las observaciones de un vehículo existente **sin aviso** | sobrescritura silenciosa | el importador clasifica INSERT/SKIP/UPDATE/REJECT; UPDATE exige `allowUpdates` (`--allow-update`); si no, el elemento falla |
| M5 | Sin control de ejecuciones simultáneas | dos procesos sobre el mismo lote | bloqueo `GET_LOCK('vscar_curated_import')` en una conexión propia; el segundo recibe `ConcurrentImportError` |
| M6 | Un proceso caído dejaba el run en RUNNING para siempre | estado engañoso | con el bloqueo tomado, los RUNNING previos pasan a `ABANDONED` |
| M7 | La omisión por huella era por lote | reimportar con otra `batch_key` reescribía | SKIP si la misma clave técnica ya está IMPORTED con la misma huella en **cualquier** lote |

## 2. 0009 — restricciones añadidas (solo aditivas)

| Restricción | Regla |
|---|---|
| `curated_technical_vehicles_identity` (UNIQUE) | mercado + TAN completo (con extensión) + variante + versión |
| `curated_technical_vehicles_identity_exact` | `identity_confidence = 'EXACT'` |
| `curated_technical_vehicles_curation_status` / `_commercial_status` | valores del dominio |
| `curated_attributes_kind_status` | TECHNICAL ∈ {transmission, body_type, drivetrain, seats, doors, gears} y OBSERVED; COMMERCIAL ∈ {generation, model_year, trim, commercial_designation} y **nunca** OBSERVED |
| `curated_attributes_rights` · `curated_spec_values_rights` | nunca DENIED |
| `curated_spec_values_identity` | `identity_match = 'EXACT_TAN_VA_VE'` |
| `curated_spec_values_authority` | nunca `SECONDARY_REFERENCE` (investigación) |
| `curated_spec_values_quality` | USABLE / NOT_USABLE |
| `curated_spec_values_conflict` | IN_CONFLICT ⇒ `conflict_group` obligatorio |
| `curated_import_items` PK + FK `run_id` | estado de reanudación íntegro |

El único `DROP` de 0009 es el índice UNIQUE `curated_import_items_key`, que pasa a ser la clave primaria con las mismas columnas. No se borra ninguna fila ni tabla.

## 3. Verificación

| Comprobación | Cómo | Resultado |
|---|---|---|
| Base vacía | `freshTestDb` aplica 0000–0009 en `vscar_test` | PASS |
| Base con datos (0008 con filas → 0009) | test `technical-curation-migration.test.ts`: carpeta recortada a 0008, 3 vehículos + run + item, luego 0009 | PASS: mismas filas; 10 CHECK activos |
| Reaplicar migraciones | `applyMigrations` dos veces | PASS: sin estructuras duplicadas ni cambios de filas |
| MySQL aplica las reglas por sí mismo | inserciones SQL directas que violan cada regla | PASS: rechazadas, cada una por **su** restricción (mensaje verificado) |
| `vscar_dev` antes de aplicar 0009 | 7 consultas de solo lectura (vehículos, duplicados de identidad, atributos, derechos, observaciones, items huérfanos) | 0 filas incumplidoras → aplicada con `corepack pnpm db:dev` |
| `vscar_dev` después | dry-run del lote D1.6 | 18 SKIP, 0 migraciones pendientes, nada escrito |
| Reversión | scripts `down/0008` y `down/0009` revisados: solo objetos `curated_*` | documentados; **no ejecutados** sobre bases con datos |

Las migraciones nunca se revierten automáticamente: `drizzle-orm` no ejecuta "down". La reversión es manual, en el orden del script, y después hay que borrar la fila de `__drizzle_migrations`.

## 4. Idempotencia y recuperación (tests MySQL, `packages/db/test/technical-curation.test.ts`)

| Escenario | Resultado |
|---|---|
| Primera importación / segunda importación | segunda: 0 escrituras, recuentos idénticos |
| Mismo elemento con otra `batch_key` | SKIP |
| Elemento cambiado sin `allowUpdates` | FAILED, datos intactos |
| Elemento cambiado con `allowUpdates` | `updated = 1`, filas antiguas reemplazadas, sin duplicados |
| Fallo intermedio | anteriores confirmados, run FAILED; la reejecución reanuda |
| Pérdida de conexión a mitad de lote | primer vehículo confirmado, ninguno parcial; run → ABANDONED; reanuda con otra conexión |
| Duplicado preexistente (misma TAN\|Va\|Ve, otro id) | `DuplicateTechnicalIdentityError` / REJECT |
| Dos importaciones simultáneas | la segunda: `ConcurrentImportError`; la primera completa; el bloqueo se libera |
| Dry-run | ninguna fila cambia en `curated_*`, `sources` ni `__drizzle_migrations` |
| Catálogo seleccionable | huella idéntica; el lector del selector nunca ve vehículos curados |

Todas las pruebas usan `vscar_test` (el nombre debe terminar en `_test`). Contra `vscar_dev` solo se ejecutaron el dry-run, la auditoría de solo lectura y la migración 0009.
