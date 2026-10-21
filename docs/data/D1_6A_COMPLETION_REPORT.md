# VScar — Step D1.6a: Stabilization, Security & Technical Catalog Validation — informe de cierre

> **Estado**: **PASS** en entorno controlado · 2026-10-21 · Sin commit · Sin despliegue · Methodology 2026.7 sin cambios
> - **Base**: `6d6a005 d1.5 ready` + cambios locales de D1.6 sin commit (conservados).
> - **Excepción documentada**: el test de rendimiento del Used Adjustment falla solo con la CPU saturada a propósito.

## Informes

| Tema | Documento |
|---|---|
| Estabilidad de tests | [D1_6A_TEST_STABILITY_REPORT](D1_6A_TEST_STABILITY_REPORT.md) |
| MySQL (esquema, migraciones, idempotencia, recuperación) | [D1_6A_MYSQL_SCHEMA_AUDIT](D1_6A_MYSQL_SCHEMA_AUDIT.md) |
| Auditoría de los 18 | [D1_6A_FIRST_18_DATA_AUDIT](D1_6A_FIRST_18_DATA_AUDIT.md) · [`d16a/first-18-audit.json`](d16a/first-18-audit.json) |
| Seguridad de la demo interna | [D1_6A_SECURITY_AUDIT](D1_6A_SECURITY_AUDIT.md) |
| Derechos S11 / S13 | [D1_6A_RIGHTS_REVIEW](D1_6A_RIGHTS_REVIEW.md) |
| Plan de los 74 | [D1_6A_NEXT_74_BATCH_PLAN](D1_6A_NEXT_74_BATCH_PLAN.md) · [`d16a/next-74-manifest.json`](d16a/next-74-manifest.json) |

## Definition of Done

| Requisito | Estado | Evidencia |
|---|---|---|
| Initial audit | PASS | git: nada en el índice; todos los cambios locales son de D1.6 y se conservan; ADR-019 B ACCEPTED, sin publicación automática |
| Decision Engine stable | PASS | 0 timeouts en 3 `check` forzados y con 8 núcleos ocupados |
| Used Adjustment stable | PASS (controlado) | p95 1,8–2,9 ms en la suite · 0,10 ms en el benchmark; con saturación artificial, p95 5,7–6,2 ms → falla (documentado) |
| Repeated pnpm check | PASS | 3/3 con `TURBO_FORCE=true` |
| Migration reviewed | PASS | 0008 revisada; 0009 aditiva |
| Indexes and constraints | PASS | UNIQUE de identidad, PK de items, FK de run, 10 CHECK |
| Idempotency | PASS | tests MySQL + dry-run (18 SKIP) |
| Recovery | PASS | fallo intermedio, pérdida de conexión, run ABANDONED, reanudación |
| 18 vehicles audited | PASS | 11/11 comprobaciones |
| 279 observations reconciled | PASS | 279 = S01 104 + S11 175; 267 utilizables |
| Conflicts preserved | PASS | 12 valores / 6 grupos / 4 vehículos, abiertos |
| No fabricated commercial fields | PASS | 0 generaciones, 0 años-modelo, 2 acabados EXACT de D1.2 |
| Internal authentication | PASS | 2 fallos corregidos (comparación en tiempo constante, HTTPS) |
| No public leakage | PASS | tests estáticos + MySQL + verificación en vivo |
| No indexing | PASS | `X-Robots-Tag` + meta `noindex`; ausente del sitemap |
| HTTPS deployment requirement | PASS | 403 sin desafío en HTTP plano fuera de loopback; verificado en vivo |
| S11 / S13 dossiers reviewed | PASS | READY_FOR_HUMAN_APPROVAL; SHA-256 de la evidencia re-verificado |
| Human decision status explicit | PASS | sin firma; ❓ / PENDING |
| Rights Engine consistent | PASS | test de sincronización matriz ↔ `SOURCE_RIGHTS` |
| 74 candidates classified | PASS | manifiesto de 100 candidatas |
| Batch manifests prepared | PASS | A–E (15/15/15/15/14) |
| Dry-run implemented | PASS | `--dry-run`: 74 INSERT, 0 rechazos, nada escrito |
| Manual NEW price regression | PASS | NEW/NEW, NEW/USED, valores inválidos, ES/EN |
| Methodology unchanged | PASS | 2026.7, huella idéntica |
| Lint / Typecheck / Unit / Integration | PASS | `pnpm check` ×3 |

## Lo que queda fuera de D1.6a (a propósito)

- **No ejecutado**:
  - importar los 74;
  - promover vehículos al selector;
  - aprobar S11/S13;
  - desplegar al VPS.
- **No resueltos**: los 12 conflictos abiertos de los 18 y los 12 del lote E. Ambos quedan para revisión humana.
