# VScar — D1.7 Auditoría del lote D (`d16a-batch-D`)

> Estado: **PASS** · 2026-10-22 · `vscar_dev`
> - **Plan**: `data/curation/d16a/plan-batch-D.json`, SHA-256 `03b97432020bd77d…` (idéntico al manifiesto D1.6a).
> - **Artefactos**:
>   - [import-report](d17/import-report-batch-D.json)
>   - [checkpoint](d17/checkpoint-4-after-batch-D.json)
>   - [auditoría](d17/audit-after-batch-D.json)

## Resultado

| Paso | Esperado | Obtenido |
|---|---|---|
| Validación previa | 15 válidas | 15/15 válidas |
| Dry-run | 15 INSERT · 0 SKIP · 0 UPDATE · 0 REJECT · 0 en conflicto | idéntico; nada escrito |
| Importación (run 1) | 15 insertados | 15 insertados · 0 actualizados · 0 fallidos |
| Reejecución (run 2) | 0 cambios | 0 insertados · 0 actualizados · 15 omitidos |
| Dry-run posterior | 15 SKIP | 15 SKIP |
| Observaciones nuevas | 217 | 217 |
| Atributos nuevos | 44 | 44 (todos TECHNICAL/OBSERVED; 0 generación, 0 año-modelo, 0 acabado) |
| Conflictos nuevos | 0 | 0 |
| Vehículos totales | 63 → 78 | 78 |
| Catálogo seleccionable | SHA-256 sin cambios | `be0d441b3c0612b0…` = inicial · 9 `test_fixture` |
| Integridad (duplicados, huérfanos, TAN incompleto, ids en ReferenceVariants) | 0 | 0 · 10 CHECK activos |
| Auditoría (11 comprobaciones) | PASS | PASS |

## Estado acumulado tras el lote

| Magnitud | Antes | Después |
|---|---:|---:|
| Vehículos técnicos | 63 | 78 |
| Observaciones | 940 | 1157 |
| Técnicamente utilizables | 928 | 1145 |
| Con derechos pendientes (S11) | 587 | 726 |
| Con derechos aprobados | 0 | 0 |
| Valores en conflicto / vehículos | 12 / 4 | 12 / 4 |
| Huella de la capa curada | `1c38cbf0cbb7…` | `9ff196b1ee80…` |

## Vehículos del lote

Notas sobre la tabla:
- **Matriculado** es el periodo de matriculación observado, nunca año-modelo.
- **Obs.** muestra el total y, entre paréntesis, las utilizables.
- **D1.8** es un diagnóstico, no una autorización.

| # | Vehículo | TAN completo | Va | Ve | Clase | Matriculado | Obs. (utilizables) · fuentes | Atrib. | Conflictos | D1.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 87 | Renault Clio | `E2*2007/46*0676*28` | `BH2` | `N84WA3VA530B` | HEV_OR_MHEV | 2024–2025 | 14 (14) · S01 5 · S11 9 | 4 | — | NEEDS_IDENTITY |
| 36 | Dacia Sandero | `E2*2001/116*0314*93` | `05EV` | `AC5DA1A0M500` | ICE_OR_MHEV | 2020 | 16 (16) · S01 6 · S11 10 | 4 | — | NEEDS_IDENTITY |
| 99 | Tesla Model 3 | `E4*2007/46*1293*07` | `E3D` | `BB1N` | BEV | 2020 | 13 (13) · S01 4 · S11 9 | 3 | — | NEEDS_IDENTITY |
| 89 | Mercedes-Benz Clase A | `E1*2007/46*1829*24` | `X24JT2` | `FZAA451A` | HEV_OR_MHEV | 2025 | 14 (14) · S01 5 · S11 9 | 3 | — | NEEDS_IDENTITY |
| 37 | Dacia Sandero | `E2*2001/116*0314*83` | `5SDL1` | `5SDL1C` | ICE_OR_MHEV | 2018 | 15 (15) · S01 5 · S11 10 | 4 | — | NEEDS_IDENTITY |
| 100 | BMW X3 | `E1*2007/46*2130*07` | `41DU` | `0AW5000B` | BEV | 2024–2025 | 13 (13) · S01 5 · S11 8 | 3 | — | NEEDS_IDENTITY |
| 91 | BMW X3 | `E1*2007/46*1797*13` | `55BZ` | `IAV500L0` | HEV_OR_MHEV | 2022 | 15 (15) · S01 6 · S11 9 | 2 | — | NEEDS_IDENTITY |
| 38 | Mercedes-Benz Clase A | `E1*2001/116*0470*16` | `12S1P2` | `MZAZ1502` | ICE_OR_MHEV | 2016–2018 | 15 (15) · S01 5 · S11 10 | 3 | — | NEEDS_IDENTITY |
| 17 | Volkswagen Golf | `E1*2007/46*0623*33` | `GAC4EAZAX0` | `FA1FA1MD001E0GAON1ML01VR0N` | BEV | 2018 | 12 (12) · S01 5 · S11 7 | 3 | — | NEEDS_IDENTITY |
| 39 | Renault Mégane | `E2*2007/46*0546*09` | `BF4` | `M6A6SF010000` | ICE_OR_MHEV | 2018 | 15 (15) · S01 5 · S11 10 | 2 | — | NEEDS_IDENTITY |
| 41 | Toyota RAV4 | `E6*2007/46*0289*02` | `AXAH52(N)` | `AXAH52L-ANXMBW(1C)` | ICE_OR_MHEV | 2020 | 16 (16) · S01 6 · S11 10 | 2 | — | NEEDS_IDENTITY |
| 42 | Renault Mégane | `E2*2007/46*0546*09` | `BF2` | `MR662A010000` | ICE_OR_MHEV | 2018 | 15 (15) · S01 5 · S11 10 | 4 | — | NEEDS_IDENTITY |
| 43 | Peugeot 308 | `E2*2007/46*0405*29` | `B` | `YHZJ-C22100` | ICE_OR_MHEV | 2020–2022 | 15 (15) · S01 6 · S11 9 | 2 | — | NEEDS_IDENTITY |
| 44 | Mercedes-Benz Clase A | `E1*2007/46*1829*03` | `X203T2` | `EZAA151B` | ICE_OR_MHEV | 2018–2020 | 16 (16) · S01 6 · S11 10 | 3 | — | NEEDS_IDENTITY |
| 45 | Peugeot 208 | `E2*2007/46*0639*35` | `P` | `HNEK-K1T500` | ICE_OR_MHEV | 2025 | 13 (13) · S01 4 · S11 9 | 2 | — | NEEDS_IDENTITY |
