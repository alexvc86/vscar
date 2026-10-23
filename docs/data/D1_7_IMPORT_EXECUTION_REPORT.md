# VScar — D1.7 Informe de ejecución de la importación (18 → 92)

> Estado: **5/5 lotes importados y auditados, sin anomalías** · 2026-10-22
> - **Base**: `vscar_dev` (MySQL 8.0.39).
> - **Git**: `e530bed d1.6 listo`, sin commit nuevo.
> - **Artefactos**: [`docs/data/d17/`](d17/).

## 1. Preparación

| Paso | Resultado | Evidencia |
|---|---|---|
| Git | `e530bed`, árbol limpio al empezar; nada en el índice | — |
| Migraciones | 10/10 aplicadas (0008 y 0009 incluidas), 0 pendientes | [checkpoint-0-initial](d17/checkpoint-0-initial.json) |
| 18 iniciales | 18 vehículos · 279 observaciones · 267 utilizables · 69 atributos · 12 valores en conflicto en 4 vehículos (como D1.6/D1.6a) | idem |
| Unicidad TAN+Va+Ve e integridad referencial | 0 duplicados, 0 huérfanos, 10 CHECK | idem |
| Huella del catálogo seleccionable | `be0d441b3c0612b0…` (9 variantes `test_fixture`) | idem |
| Copia de seguridad | lógica (DDL + filas) de `curated_*` y las fuentes referenciadas → `data/backups/d17/curated-pre-d17.json` (fuera de Git) | [backup-pre-d17](d17/backup-pre-d17.json) (solo huellas) |
| Prueba de restauración | 6/6 tablas con huella idéntica + 10 CHECK | idem |

**Cómo se hizo la prueba de restauración**:
- Los usuarios MySQL disponibles no pueden crear bases (solo tienen permisos sobre `vscar_dev` y `vscar_test`), y la configuración de MySQL no se ha tocado.
- Por eso se restauró dentro de `vscar_test` en tablas propias `restore_d17_*`, bajo el bloqueo de los tests.
- Al terminar se borraron solo esas tablas. Ninguna tabla de los tests ni otra base se sobrescribió.

## 2. Validación de los 74 (antes de escribir)

`node --env-file=.env packages/db/scripts/technical-validate-plan.ts` → [`validation-74.json`](d17/validation-74.json)

| Comprobación | Resultado |
|---|---|
| Planes idénticos al manifiesto D1.6a (SHA-256) | 5/5 |
| Identidad EXACT, TAN completo con extensión, Va, Ve; clave = columnas | 74/74 |
| Correspondencia con las 100 candidatas D1 (id, rank, TAN, Va, Ve) | 74/74 |
| Ids de candidata y claves técnicas únicos | 74 / 74 |
| Corroboración RDW: observaciones S11 que citan la clave exacta | 74/74 |
| Procedencia (registro de origen + host oficial) en cada fila | sí |
| Derechos: S01 CONDITIONAL, S11/S13 PENDING; ninguno APPROVED ni DENIED | sí |
| Solo S01/S11/S13: ningún valor de S14–S19 ni de investigación | sí |
| Sin generación ni año-modelo | sí |
| Duplicado de los 18 curados | 0 |
| Duplicado EXACT de las 9 ReferenceVariants | 0 |
| Relación con el catálogo (mismo TAN base + Va) | 1: **#88**, ver lote E |
| Las 8 excluidas siguen fuera | sí (#1, #3 duplicados · #2 probable duplicado con TAN incompleto · #13, #22, #50, #55 extensión TAN no corroborada · #21 sin RDW) |

## 3. Ejecución por lotes (A → B → C → D → E)

Cada lote siguió el mismo procedimiento, y el orquestador se habría detenido ante cualquier diferencia:
1. dry-run, que debe coincidir con el manifiesto;
2. importación sin `--allow-update`; el script la ejecuta dos veces (la segunda es la reejecución de idempotencia);
3. dry-run posterior, que debe dar todo SKIP;
4. checkpoint, con la huella del catálogo seleccionable igual a la inicial;
5. auditoría de 11 comprobaciones.

| Lote | Esperado | Insertados | Omitidos (2.ª ejecución) | Actualizados | Fallidos | Obs. / atrib. nuevas | Conflictos nuevos | Total | Auditoría |
|---|---:|---:|---:|---:|---:|---|---:|---:|---|
| [A](D1_7_BATCH_A_AUDIT.md) | 15 | 15 | 15 | 0 | 0 | 228 / 43 | 0 | 33 | PASS |
| [B](D1_7_BATCH_B_AUDIT.md) | 15 | 15 | 15 | 0 | 0 | 223 / 38 | 0 | 48 | PASS |
| [C](D1_7_BATCH_C_AUDIT.md) | 15 | 15 | 15 | 0 | 0 | 210 / 42 | 0 | 63 | PASS |
| [D](D1_7_BATCH_D_AUDIT.md) | 15 | 15 | 15 | 0 | 0 | 217 / 44 | 0 | 78 | PASS |
| [E](D1_7_BATCH_E_AUDIT.md) | 14 | 14 | 14 | 0 | 0 | 211 / 44 | 12 | **92** | PASS |

**Anomalías**: ninguna. No hubo que detener ningún lote.

## 4. Estado final

| | Antes | Después |
|---|---:|---:|
| Vehículos técnicos | 18 | **92** |
| Observaciones / utilizables | 279 / 267 | **1.368 / 1.344** |
| Atributos | 69 | 280 |
| Valores en conflicto / vehículos | 12 / 4 | 24 / 9 |
| Runs (todos COMPLETED) | 6 | 16 |
| Catálogo seleccionable (PREVIEW / PUBLIC) | 9 / 0 | **9 / 0**, SHA-256 idéntico |

Copia posterior: `data/backups/d17/curated-post-d17.json`, con restauración verificada (6/6 tablas, 10 CHECK) → [backup-post-d17](d17/backup-post-d17.json).

## 5. Herramientas añadidas en D1.7 (`packages/db/scripts/`, todas limitadas a bases `_dev`/`_test`)

| Script | Escribe en MySQL | Uso |
|---|---|---|
| `technical-checkpoint.ts` | no | migraciones, recuentos, integridad, huellas |
| `technical-backup.ts` | no (`--backup`) / solo tablas temporales `restore_d17_*` de `vscar_test` (`--verify-restore`) | copia lógica y prueba de restauración |
| `technical-validate-plan.ts` | no | validación de los lotes contra manifiesto, candidatas y base |
| `technical-coverage.ts` | no | cobertura por campo y diagnóstico D1.8 |
| `technical-import.ts` | sí, solo en la importación real (`--report` nuevo) | importación (sin `--allow-update` en D1.7) |
| `technical-audit.ts` | no | auditoría; desde D1.7 oculta los valores con derechos PENDING |

**Corrección propia durante D1.7**:
- Las primeras auditorías por lote incluían valores de S11 (pendiente) en conflictos y atributos.
- Se ocultaron con una transformación determinista (24 valores en conflicto y 263 atributos en la auditoría final), y el script ya no los escribe.
- El test `packages/curation/test/d17.test.ts` lo comprueba.
- Los artefactos D1.6a ya versionados (`d16a/first-18-audit.json`, `D1_6A_FIRST_18_DATA_AUDIT.md`) sí contienen valores de RDW. No se han reescrito (son históricos); queda como decisión pendiente.
