# VScar — D1.7 Auditoría del lote A (`d16a-batch-A`)

> Estado: **PASS** · 2026-10-22 · `vscar_dev`
> - **Plan**: `data/curation/d16a/plan-batch-A.json`, SHA-256 `abdd14cad31df0b1…` (idéntico al manifiesto D1.6a).
> - **Artefactos**:
>   - [import-report](d17/import-report-batch-A.json)
>   - [checkpoint](d17/checkpoint-1-after-batch-A.json)
>   - [auditoría](d17/audit-after-batch-A.json)

## Resultado

| Paso | Esperado | Obtenido |
|---|---|---|
| Validación previa | 15 válidas | 15/15 válidas |
| Dry-run | 15 INSERT · 0 SKIP · 0 UPDATE · 0 REJECT · 0 en conflicto | idéntico; nada escrito |
| Importación (run 1) | 15 insertados | 15 insertados · 0 actualizados · 0 fallidos |
| Reejecución (run 2) | 0 cambios | 0 insertados · 0 actualizados · 15 omitidos |
| Dry-run posterior | 15 SKIP | 15 SKIP |
| Observaciones nuevas | 228 | 228 |
| Atributos nuevos | 43 | 43 (todos TECHNICAL/OBSERVED; 0 generación, 0 año-modelo, 0 acabado) |
| Conflictos nuevos | 0 | 0 |
| Vehículos totales | 18 → 33 | 33 |
| Catálogo seleccionable | SHA-256 sin cambios | `be0d441b3c0612b0…` = inicial · 9 `test_fixture` |
| Integridad (duplicados, huérfanos, TAN incompleto, ids en ReferenceVariants) | 0 | 0 · 10 CHECK activos |
| Auditoría (11 comprobaciones) | PASS | PASS |

## Estado acumulado tras el lote

| Magnitud | Antes | Después |
|---|---:|---:|
| Vehículos técnicos | 18 | 33 |
| Observaciones | 279 | 507 |
| Técnicamente utilizables | 267 | 495 |
| Con derechos pendientes (S11) | 175 | 316 |
| Con derechos aprobados | 0 | 0 |
| Valores en conflicto / vehículos | 12 / 4 | 12 / 4 |
| Huella de la capa curada | `768e7410d9a7…` | `0161ee69a901…` |

## Vehículos del lote

Notas sobre la tabla:
- **Matriculado** es el periodo de matriculación observado, nunca año-modelo.
- **Obs.** muestra el total y, entre paréntesis, las utilizables.
- **D1.8** es un diagnóstico, no una autorización.

| # | Vehículo | TAN completo | Va | Ve | Clase | Matriculado | Obs. (utilizables) · fuentes | Atrib. | Conflictos | D1.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 32 | Hyundai Kona | `E4*2018/858*00168*02` | `F5E32` | `E11AZ1` | BEV | 2024–2025 | 13 (13) · S01 5 · S11 8 | 2 | — | NEEDS_IDENTITY |
| 40 | Nissan Qashqai | `E9*2018/858*11042*11` | `A` | `A41` | HEV_OR_MHEV | 2024–2025 | 14 (14) · S01 5 · S11 9 | 2 | — | NEEDS_IDENTITY |
| 10 | Renault Clio | `E2*2007/46*0676*03` | `BE2` | `MT5TA08A5000` | ICE_OR_MHEV | 2020 | 16 (16) · S01 6 · S11 10 | 4 | — | NEEDS_IDENTITY |
| 11 | Kia Sportage | `E4*2018/858*00079*02` | `F5P21` | `M61A17` | MHEV | 2022–2025 | 14 (14) · S01 5 · S11 9 | 2 | — | NEEDS_IDENTITY |
| 77 | BMW X3 | `E1*2007/46*1797*14` | `61DP` | `IAW50000` | PHEV | 2022 | 21 (21) · S01 8 · S11 13 | 5 | — | NEEDS_IDENTITY |
| 61 | Kia Niro | `E4*2007/46*1139*12` | `C5E11` | `E11DY1` | BEV | 2022 | 14 (14) · S01 6 · S11 8 | 2 | — | NEEDS_IDENTITY |
| 46 | Audi A3 | `E1*2007/46*2060*27` | `SDFYAF1` | `FD7FD7CW002RT011C184BIBEM1MLN1B20` | HEV_OR_MHEV | 2024 | 14 (14) · S01 5 · S11 9 | 2 | — | NEEDS_IDENTITY |
| 12 | Renault Clio | `E2*2007/46*0676*14` | `BE2` | `MG5UA8HA5000` | ICE_OR_MHEV | 2022 | 15 (15) · S01 6 · S11 9 | 2 | — | NEEDS_IDENTITY |
| 23 | Hyundai Kona | `E4*2018/858*00153*01` | `F5P22` | `M61AY1` | MHEV | 2024–2025 | 14 (14) · S01 5 · S11 9 | 2 | — | NEEDS_IDENTITY |
| 78 | Peugeot 3008 | `E2*2007/46*0534*12` | `4` | `5GBU-C1J000` | PHEV | 2020 | 20 (20) · S01 8 · S11 12 | 3 | — | NEEDS_IDENTITY |
| 76 | Tesla Model 3 | `E4*2007/46*1293*39` | `H6LR` | `BFB1S5T1W` | BEV | 2024–2025 | 13 (13) · S01 5 · S11 8 | 5 | — | NEEDS_IDENTITY |
| 60 | Toyota RAV4 | `E6*2007/46*0289*08` | `AXAL52(N)` | `AXAL52L-ANXMBW(1J)` | HEV_OR_MHEV | 2024–2025 | 14 (14) · S01 5 · S11 9 | 2 | — | NEEDS_IDENTITY |
| 14 | Dacia Sandero | `E19*2007/46*0026*12` | `BEV` | `M66UA43M5200` | ICE_OR_MHEV | 2022 | 15 (15) · S01 6 · S11 9 | 4 | — | NEEDS_IDENTITY |
| 79 | Volkswagen Golf | `E1*2007/46*2014*23` | `ACDGEAX0` | `FD6FD6DD001P4BISON1ML1CVR2B00` | PHEV | 2024 | 18 (18) · S01 7 · S11 11 | 3 | — | NEEDS_IDENTITY |
| 84 | Tesla Model 3 | `E4*2007/46*1293*47` | `H6MR` | `BFB1S5T1W` | BEV | 2025 | 13 (13) · S01 5 · S11 8 | 3 | — | NEEDS_IDENTITY |
