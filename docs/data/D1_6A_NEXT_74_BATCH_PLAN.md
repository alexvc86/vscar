# VScar — D1.6a Plan por lotes de las 74 homologaciones pendientes

> Estado: **preparado y validado en dry-run · NO importado** · 2026-10-21
> - **Manifiesto** (versionado, sin valores): [`d16a/next-74-manifest.json`](d16a/next-74-manifest.json).
> - **Planes importables**: `data/curation/d16a/plan-batch-{A..E}.json` (fuera de Git; los regenera `node packages/curation/scripts/d16-build.ts`, determinista).

## 1. Clasificación de las 100 candidatas D1 (verificada contra el manifiesto canónico)

| Estado | Nº | Candidatas |
|---|---:|---|
| Ya curadas (D1.6, `vscar_dev`) | 18 | #4, 5, 6, 7, 8, 9, 20, 24, 26, 27, 28, 48, 53, 56, 57, 73, 81, 86 |
| Pendientes, elegibles | **74** | lotes A–E |
| Excluidas | 8 | ver abajo (no se sustituyen) |

| # | Causa exacta de la exclusión (no todas iguales) |
|---|---|
| 1, 3 | DUPLICATE de una variante del catálogo existente → reconciliar, no insertar |
| 2 | PROBABLE_DUPLICATE_TAN_INCOMPLETE (TAN sin extensión completa en el catálogo) → reconciliar |
| 13, 22, 50, 55 | RDW no corrobora la clave exacta: TAN_EXTENSION_MISMATCH |
| 21 | RDW sin ninguna coincidencia (NONE) |

Todas las pendientes tienen una clave técnica completa: TAN con extensión + variante + versión. Lo comprueba el test `packages/curation/test/d16.test.ts`.

## 2. Criterio de orden

1. **Identidad técnica**: las 74 son EXACT y están corroboradas por RDW; no discrimina.
2. **Riesgo de duplicado**: #88 tiene un solapamiento parcial de identidad con el catálogo → **último lote**, marcado `ELIGIBLE_REVIEW_OVERLAP`.
3. **Conflictos**: 5 candidatas con valores en conflicto (#31, #59, #62, #65, #66; 12 valores) → **último lote**, marcadas `ELIGIBLE_CONFLICTS_PRESERVED`.
4. **Calidad y cobertura**: dentro de cada nivel, completitud crítica descendente.
5. **Evidencia original**:
   - todas tienen EEA + RDW (Basis + Energiebron);
   - las pilotos #76 y #77 tienen además la adquisición RDW ampliada de D1.1;
   - Traficom aporta caja y carrocería cuando la clave existe en Finlandia.
6. **Derechos**: idénticos en todas (S01 CONDITIONAL, S11 PENDING, S13 PENDING si aplica); no discriminan.
7. **Diversidad**: reparto rotatorio por clase de tren motriz dentro de cada nivel.

## 3. Lotes

| Lote | Tamaño | Tren motriz | Obs. | Atributos | En conflicto | Completitud crítica | Candidatas |
|---|---:|---|---:|---:|---:|---|---|
| A | 15 | BEV 4 · HEV 3 · ICE 3 · MHEV 2 · PHEV 3 | 228 | 43 | 0 | 0,43–0,54 | 10, 11, 12, 14, 23, 32, 40, 46, 60, 61, 76, 77, 78, 79, 84 |
| B | 15 | BEV 4 · HEV 4 · ICE 4 · PHEV 3 | 223 | 38 | 0 | 0,38–0,54 | 15, 16, 18, 19, 63, 64, 67, 68, 69, 80, 83, 85, 90, 92, 93 |
| C | 15 | BEV 5 · HEV 5 · ICE 5 | 210 | 42 | 0 | 0,43–0,54 | 25, 29, 33, 34, 35, 70, 71, 74, 75, 82, 94, 95, 96, 97, 98 |
| D | 15 | BEV 3 · HEV 3 · ICE 9 | 217 | 44 | 0 | 0,36–0,54 | 17, 36, 37, 38, 39, 41, 42, 43, 44, 45, 87, 89, 91, 99, 100 |
| E | 14 | BEV 1 · HEV 2 · ICE 10 · PHEV 1 | 211 | 44 | **12** (5 vehículos) | 0,43–0,54 | 30, **31**, 47, 49, 51, 52, 54, 58, **59**, **62**, **65**, **66**, 72, **88** |
| **Total** | **74** | | **1.089** | **211** | **12** | | |

"HEV" = `HEV_OR_MHEV` e "ICE" = `ICE_OR_MHEV` (las fuentes no distinguen MHEV). Las huellas SHA-256 de cada plan están en el manifiesto.

### Conflictos que se conservarán (lote E)

| # | SpecKeys en conflicto (S01 vs S11) |
|---|---|
| 31 Kia Sportage | `dim.wheelbase_mm` |
| 59 Hyundai Kona HEV | `emi.co2_combined_gkm`, `nrg.fuel_combined_l100` |
| 62 Renault Clio HEV | `perf.power_ice_kw` |
| 65 CUPRA Formentor | `nrg.fuel_combined_l100` |
| 66 Kia Sportage PHEV | `nrg.phev_weighted_fuel_l100` |

Se guardarán todos los valores, sin promedio ni elección por jerarquía de fuente. Quality los deja fuera de las comparaciones.

## 4. Dry-run (obligatorio antes de importar)

```bash
node --env-file=.env packages/db/scripts/technical-import.ts --dry-run --plan data/curation/d16a/plan-batch-A.json
```

El dry-run valida con Zod y clasifica contra la base. No aplica migraciones, no crea runs, no escribe informes y comprueba al final que nada ha cambiado (`nothingWritten`).

Resultado contra `vscar_dev` (2026-10-21, migraciones al día):

| Plan | Would insert | Would skip | Would update | Would reject | Would conflict (vehículos / valores) | Nada escrito |
|---|---:|---:|---:|---:|---|---|
| `d16-first-18` | 0 | 18 | 0 | 0 | 4 / 12 | ✅ |
| `d16a-batch-A` | 15 | 0 | 0 | 0 | 0 / 0 | ✅ |
| `d16a-batch-B` | 15 | 0 | 0 | 0 | 0 / 0 | ✅ |
| `d16a-batch-C` | 15 | 0 | 0 | 0 | 0 / 0 | ✅ |
| `d16a-batch-D` | 15 | 0 | 0 | 0 | 0 / 0 | ✅ |
| `d16a-batch-E` | 14 | 0 | 0 | 0 | 5 / 12 | ✅ |

## 5. Procedimiento de importación (cuando se autorice)

Por lote, en orden A → E:
1. `--dry-run` y revisar el resultado: 0 rechazos y 0 actualizaciones esperadas.
2. Importación real con el mismo `--plan`, **sin** `--allow-update`. El script la ejecuta dos veces y exige:
   - idempotencia;
   - catálogo seleccionable intacto;
   - informe en `docs/data/d16a/import-report-<lote>.json`.
3. `node --env-file=.env packages/db/scripts/technical-audit.ts --out docs/data/d16a/audit-after-<lote>.json`.
4. Revisión en `/internal/catalog` antes del lote siguiente. El lote E exige revisar los 12 conflictos y el solapamiento de #88.

La importación de un lote **no** amplía el selector: los vehículos curados siguen fuera de PREVIEW y PUBLIC hasta que exista la promoción explícita.
