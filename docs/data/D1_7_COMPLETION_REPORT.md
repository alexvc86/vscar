# VScar — Step D1.7: Technical Catalog Expansion (18 → 92) — informe de cierre

> **Estado**: **PASS** · 2026-10-22 · `vscar_dev`
> - **Git**: base `e530bed d1.6 listo`, sin commit.
> - **Sin cambios**: VPS (sin despliegue), Methodology 2026.7, gates PUBLIC/PREVIEW y `SOURCE_RIGHTS`.

## Informes

| Tema | Documento |
|---|---|
| Ejecución (preparación, copia, validación, lotes) | [D1_7_IMPORT_EXECUTION_REPORT](D1_7_IMPORT_EXECUTION_REPORT.md) |
| Lotes | [A](D1_7_BATCH_A_AUDIT.md) · [B](D1_7_BATCH_B_AUDIT.md) · [C](D1_7_BATCH_C_AUDIT.md) · [D](D1_7_BATCH_D_AUDIT.md) · [E](D1_7_BATCH_E_AUDIT.md) |
| Catálogo técnico de 92 y cobertura | [D1_7_92_TECHNICAL_CATALOG_AUDIT](D1_7_92_TECHNICAL_CATALOG_AUDIT.md) |
| Conflictos | [D1_7_CONFLICT_REGISTER](D1_7_CONFLICT_REGISTER.md) |
| Preparación D1.8 | [D1_7_D1_8_PROMOTION_READINESS](D1_7_D1_8_PROMOTION_READINESS.md) |
| Artefactos reproducibles (sin valores pendientes) | [`d17/`](d17/) |

## Definition of Done

| # | Requisito | Estado | Evidencia |
|---|---|---|---|
| 1 | Cinco lotes ejecutados y auditados | PASS | A–E: 15/15/15/15/14 insertados; auditoría 11/11 tras cada lote; 0 detenciones |
| 2 | Identidad técnica exacta y procedencia | PASS | 92 TAN completo + Va + Ve; cada fila cita la clave de su vehículo y una fuente oficial |
| 3 | Sin duplicados ni cambios inesperados | PASS | 0 duplicados (clave y columnas); #88 = relación, no duplicado; catálogo SHA-256 idéntico en 6 checkpoints |
| 4 | Conflictos identificados y bloqueados | PASS | 24 valores en 12 grupos, NOT_USABLE, todos abiertos |
| 5 | Derechos pendientes no aprobados artificialmente | PASS | 0 APPROVED; S11/S13 PENDING en `SOURCE_RIGHTS` (test) |
| 6 | Idempotente y recuperable | PASS | reejecución de cada lote sin cambios; dry-run posterior todo SKIP; copias con restauración verificada; tests de reanudación y concurrencia |
| 7 | Catálogo seleccionable con sus 9 variantes | PASS | 9 PREVIEW / 0 PUBLIC antes y después |
| 8 | Suite completa en condiciones normales | PASS | 3/3 `pnpm check` con `TURBO_FORCE=true`: 999 ✓ · 0 ✗ · 5 omitidos · 0 timeouts |
| 9 | Informe real de cobertura | PASS | embudo por campo y categoría desde MySQL |
| 10 | Lista de candidatos para D1.8 | PASS | 20 candidatos + clasificación de los 92 |

## Tests añadidos (18; la suite pasa de 981 a 999)

| Archivo | Tests | Cubre |
|---|---:|---|
| `packages/db/test/technical-expansion.test.ts` (MySQL) | 6 | <ul><li>lotes secuenciales;</li><li>reejecución sin cambios;</li><li>conflictos conservados;</li><li>duplicado entre lotes y actualización involuntaria rechazados;</li><li>reanudación tras error;</li><li>catálogo intacto y selector sin curados</li></ul> |
| `packages/curation/test/d17.test.ts` | 9 | <ul><li>secuencia 18→92 de los checkpoints, huellas e integridad;</li><li>informes de los 5 lotes;</li><li>validación de los 74;</li><li>excluidas ausentes;</li><li>artefactos sin valores PENDING;</li><li>Rights Engine (S11/S13 PENDING, S01 PUBLISHABLE);</li><li>cobertura sin datos inventados;</li><li>clasificación D1.8</li></ul> |
| `apps/web/test/d17.test.ts` | 3 | vista interna con un vehículo de identidad comercial sin confirmar y en conflicto |

Siguen vigentes los tests de D1.6/D1.6a:
- clave única TAN+Va+Ve en MySQL;
- concurrencia (`GET_LOCK`);
- protección `allowUpdates`;
- dry-run sin escrituras;
- seguridad e aislamiento de `/internal/catalog`.

Sin cambios en los golden cases ni en el umbral del Used Adjustment: p95 de 1,6–1,9 ms en las tres ejecuciones, frente al presupuesto de 5 ms.

## Pendiente (fuera de D1.7)

- **Firmar o aplazar S11/S13**: hoy 0 valores tienen derechos aprobados.
- **Decidir en D1.8 cómo se acredita la identidad comercial**: generación, año-modelo y acabado; 72 vehículos esperan esa decisión.
- **Fijar una regla de resolución de conflictos**: 5 CONFLICTED.
- **Reconciliar #88** con `tesla-model-3-2021-traccion-trasera`.
- **Decidir qué hacer con los valores de RDW** que contienen los artefactos D1.6a ya versionados.
