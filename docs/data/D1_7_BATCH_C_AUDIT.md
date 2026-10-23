# VScar — D1.7 Auditoría del lote C (`d16a-batch-C`)

> Estado: **PASS** · 2026-10-22 · `vscar_dev`
> - **Plan**: `data/curation/d16a/plan-batch-C.json`, SHA-256 `704ab607c6b2ff74…` (idéntico al manifiesto D1.6a).
> - **Artefactos**:
>   - [import-report](d17/import-report-batch-C.json)
>   - [checkpoint](d17/checkpoint-3-after-batch-C.json)
>   - [auditoría](d17/audit-after-batch-C.json)

## Resultado

| Paso | Esperado | Obtenido |
|---|---|---|
| Validación previa | 15 válidas | 15/15 válidas |
| Dry-run | 15 INSERT · 0 SKIP · 0 UPDATE · 0 REJECT · 0 en conflicto | idéntico; nada escrito |
| Importación (run 1) | 15 insertados | 15 insertados · 0 actualizados · 0 fallidos |
| Reejecución (run 2) | 0 cambios | 0 insertados · 0 actualizados · 15 omitidos |
| Dry-run posterior | 15 SKIP | 15 SKIP |
| Observaciones nuevas | 210 | 210 |
| Atributos nuevos | 42 | 42 (todos TECHNICAL/OBSERVED; 0 generación, 0 año-modelo, 0 acabado) |
| Conflictos nuevos | 0 | 0 |
| Vehículos totales | 48 → 63 | 63 |
| Catálogo seleccionable | SHA-256 sin cambios | `be0d441b3c0612b0…` = inicial · 9 `test_fixture` |
| Integridad (duplicados, huérfanos, TAN incompleto, ids en ReferenceVariants) | 0 | 0 · 10 CHECK activos |
| Auditoría (11 comprobaciones) | PASS | PASS |

## Estado acumulado tras el lote

| Magnitud | Antes | Después |
|---|---:|---:|
| Vehículos técnicos | 48 | 63 |
| Observaciones | 730 | 940 |
| Técnicamente utilizables | 718 | 928 |
| Con derechos pendientes (S11) | 454 | 587 |
| Con derechos aprobados | 0 | 0 |
| Valores en conflicto / vehículos | 12 / 4 | 12 / 4 |
| Huella de la capa curada | `859038497e59…` | `1c38cbf0cbb7…` |

## Vehículos del lote

Notas sobre la tabla:
- **Matriculado** es el periodo de matriculación observado, nunca año-modelo.
- **Obs.** muestra el total y, entre paréntesis, las utilizables.
- **D1.8** es un diagnóstico, no una autorización.

| # | Vehículo | TAN completo | Va | Ve | Clase | Matriculado | Obs. (utilizables) · fuentes | Atrib. | Conflictos | D1.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 70 | Škoda Octavia | `E8*2007/46*0355*18` | `ACDFYAX0` | `NFD7FD7CW0024BIVL4N1A0A` | HEV_OR_MHEV | 2024 | 14 (14) · S01 5 · S11 9 | 3 | — | NEEDS_IDENTITY |
| 25 | Peugeot 3008 | `E2*2007/46*0534*12` | `R` | `HNSM-C1P100` | ICE_OR_MHEV | 2020 | 16 (16) · S01 6 · S11 10 | 3 | — | NEEDS_IDENTITY |
| 94 | Kia Niro | `E9*2018/858*11241*01` | `C5E11` | `E11BY1` | BEV | 2022–2025 | 13 (13) · S01 5 · S11 8 | 3 | — | NEEDS_IDENTITY |
| 71 | Hyundai Kona | `E4*2018/858*00153*01` | `F5P42` | `D61CY1` | HEV_OR_MHEV | 2024–2025 | 14 (14) · S01 5 · S11 9 | 3 | — | NEEDS_IDENTITY |
| 29 | Nissan Qashqai | `E11*2007/46*0963*17` | `D` | `D03` | ICE_OR_MHEV | 2018 | 15 (15) · S01 5 · S11 10 | 3 | — | NEEDS_IDENTITY |
| 95 | BMW X3 | `E1*2007/46*2130*02` | `41DU` | `0AW5000S` | BEV | 2022 | 12 (12) · S01 5 · S11 7 | 3 | — | NEEDS_IDENTITY |
| 74 | Peugeot 3008 | `E2*2018/858*00064*07` | `A` | `HPY1-A1AN00` | HEV_OR_MHEV | 2025 | 14 (14) · S01 5 · S11 9 | 3 | — | NEEDS_IDENTITY |
| 33 | Audi A3 | `E1*2007/46*2060*27` | `SDTSBF1` | `FD7FD7GC002RT011C184BIBEM1MLN1D0C` | ICE_OR_MHEV | 2024 | 14 (14) · S01 5 · S11 9 | 2 | — | NEEDS_IDENTITY |
| 96 | Peugeot 3008 | `E2*2018/858*00064*02` | `C` | `ZKZX-A0E000` | BEV | 2024–2025 | 13 (13) · S01 5 · S11 8 | 3 | — | NEEDS_IDENTITY |
| 75 | Kia Sportage | `E4*2018/858*00079*04` | `F5P41` | `A61B11` | HEV_OR_MHEV | 2024–2025 | 14 (14) · S01 5 · S11 9 | 3 | — | NEEDS_IDENTITY |
| 34 | Toyota Corolla | `E6*2007/46*0318*03` | `ZWE211(H)` | `ZWE211L-DHXNBW(1D)` | ICE_OR_MHEV | 2020 | 16 (16) · S01 6 · S11 10 | 3 | — | NEEDS_IDENTITY |
| 97 | Peugeot 208 | `E2*2007/46*0639*35` | `H` | `ZKWZ-K0R000` | BEV | 2025 | 13 (13) · S01 5 · S11 8 | 2 | — | NEEDS_IDENTITY |
| 82 | Peugeot 208 | `E2*2007/46*0639*36` | `P` | `HPX5-K1NN00` | HEV_OR_MHEV | 2025 | 14 (14) · S01 5 · S11 9 | 4 | — | NEEDS_IDENTITY |
| 35 | Toyota Yaris | `E11*2007/46*0152*10` | `NHP13(MH)` | `NHP130L-CHXNBW(1L)` | ICE_OR_MHEV | 2018 | 15 (15) · S01 5 · S11 10 | 2 | — | NEEDS_IDENTITY |
| 98 | Renault Mégane | `E2*2018/858*00018*09` | `BE2` | `J2EEA5F000B0` | BEV | 2024–2025 | 13 (13) · S01 5 · S11 8 | 2 | — | NEEDS_IDENTITY |
