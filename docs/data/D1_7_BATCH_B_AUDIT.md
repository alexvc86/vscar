# VScar — D1.7 Auditoría del lote B (`d16a-batch-B`)

> Estado: **PASS** · 2026-10-22 · `vscar_dev`
> - **Plan**: `data/curation/d16a/plan-batch-B.json`, SHA-256 `8e26160ae8bda62e…` (idéntico al manifiesto D1.6a).
> - **Artefactos**:
>   - [import-report](d17/import-report-batch-B.json)
>   - [checkpoint](d17/checkpoint-2-after-batch-B.json)
>   - [auditoría](d17/audit-after-batch-B.json)

## Resultado

| Paso | Esperado | Obtenido |
|---|---|---|
| Validación previa | 15 válidas | 15/15 válidas |
| Dry-run | 15 INSERT · 0 SKIP · 0 UPDATE · 0 REJECT · 0 en conflicto | idéntico; nada escrito |
| Importación (run 1) | 15 insertados | 15 insertados · 0 actualizados · 0 fallidos |
| Reejecución (run 2) | 0 cambios | 0 insertados · 0 actualizados · 15 omitidos |
| Dry-run posterior | 15 SKIP | 15 SKIP |
| Observaciones nuevas | 223 | 223 |
| Atributos nuevos | 38 | 38 (todos TECHNICAL/OBSERVED; 0 generación, 0 año-modelo, 0 acabado) |
| Conflictos nuevos | 0 | 0 |
| Vehículos totales | 33 → 48 | 48 |
| Catálogo seleccionable | SHA-256 sin cambios | `be0d441b3c0612b0…` = inicial · 9 `test_fixture` |
| Integridad (duplicados, huérfanos, TAN incompleto, ids en ReferenceVariants) | 0 | 0 · 10 CHECK activos |
| Auditoría (11 comprobaciones) | PASS | PASS |

## Estado acumulado tras el lote

| Magnitud | Antes | Después |
|---|---:|---:|
| Vehículos técnicos | 33 | 48 |
| Observaciones | 507 | 730 |
| Técnicamente utilizables | 495 | 718 |
| Con derechos pendientes (S11) | 316 | 454 |
| Con derechos aprobados | 0 | 0 |
| Valores en conflicto / vehículos | 12 / 4 | 12 / 4 |
| Huella de la capa curada | `0161ee69a901…` | `859038497e59…` |

## Vehículos del lote

Notas sobre la tabla:
- **Matriculado** es el periodo de matriculación observado, nunca año-modelo.
- **Obs.** muestra el total y, entre paréntesis, las utilizables.
- **D1.8** es un diagnóstico, no una autorización.

| # | Vehículo | TAN completo | Va | Ve | Clase | Matriculado | Obs. (utilizables) · fuentes | Atrib. | Conflictos | D1.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 63 | Kia Niro | `E4*2007/46*1139*12` | `C5P11` | `D61CY1` | HEV_OR_MHEV | 2022 | 15 (15) · S01 6 · S11 9 | 3 | — | NEEDS_IDENTITY |
| 15 | Volkswagen Golf | `E1*2007/46*2014*23` | `ACDNPAX0` | `FD7FD7GC003S4BISOR2ML1CVR2AI0` | ICE_OR_MHEV | 2024 | 14 (14) · S01 5 · S11 9 | 3 | — | NEEDS_IDENTITY |
| 80 | Volkswagen Golf | `E1*2007/46*2014*28` | `ACDUCBX0` | `FD6FD6DD001H4WESON1MLB0` | PHEV | 2025 | 18 (18) · S01 7 · S11 11 | 3 | — | NEEDS_IDENTITY |
| 85 | Renault Mégane | `E2*2018/858*00018*03` | `BE2` | `J1EEA1000000` | BEV | 2022 | 14 (14) · S01 6 · S11 8 | 3 | — | NEEDS_IDENTITY |
| 64 | Toyota Corolla | `E6*2007/46*0318*10` | `ZWE219(W)` | `ZWE219L-DWXNBW(6L)` | HEV_OR_MHEV | 2025 | 14 (14) · S01 5 · S11 9 | 2 | — | NEEDS_IDENTITY |
| 16 | Hyundai Kona | `E4*2018/858*00153*01` | `F5P12` | `M61AY1` | ICE_OR_MHEV | 2024–2025 | 14 (14) · S01 5 · S11 9 | 2 | — | NEEDS_IDENTITY |
| 83 | CUPRA Formentor | `E9*2007/46*4008*24` | `CXDUCBX0` | `FD6PFD6DD0014WE1AAAKM1` | PHEV | 2024–2025 | 18 (18) · S01 7 · S11 11 | 3 | — | NEEDS_IDENTITY |
| 90 | Volkswagen Golf | `E1*2007/46*0623*41` | `GAC4EBSAX0` | `FA1FA1MD001E0GAON1ML1BVR0NA` | BEV | 2020–2022 | 15 (15) · S01 6 · S11 9 | 3 | — | NEEDS_IDENTITY |
| 68 | Kia Niro | `E9*2018/858*11241*03` | `C5P11` | `D61AY1` | HEV_OR_MHEV | 2024–2025 | 14 (14) · S01 5 · S11 9 | 2 | — | NEEDS_IDENTITY |
| 18 | Hyundai Kona | `E4*2018/858*00153*03` | `F5P12` | `M61AY1` | ICE_OR_MHEV | 2025 | 14 (14) · S01 5 · S11 9 | 2 | — | NEEDS_IDENTITY |
| 67 | Kia Niro | `E4*2007/46*1139*08` | `C5P11` | `D61CY1` | PHEV | 2020 | 16 (16) · S01 6 · S11 10 | 3 | — | NEEDS_IDENTITY |
| 92 | Tesla Model Y | `E4*2007/46*1293*25` | `Y5LD` | `PZP4S5T3` | BEV | 2022 | 14 (14) · S01 6 · S11 8 | 2 | — | NEEDS_IDENTITY |
| 69 | Hyundai Tucson | `E5*2018/858*00001*09` | `F5P41` | `A61B11` | HEV_OR_MHEV | 2024–2025 | 14 (14) · S01 5 · S11 9 | 3 | — | NEEDS_IDENTITY |
| 19 | Hyundai Kona | `E4*2007/46*1259*01` | `F5D11` | `M62AZ1` | ICE_OR_MHEV | 2018 | 16 (16) · S01 6 · S11 10 | 2 | — | NEEDS_IDENTITY |
| 93 | Tesla Model Y | `E4*2007/46*1293*43` | `Y5LR` | `BLB3S5T3X` | BEV | 2025 | 13 (13) · S01 5 · S11 8 | 2 | — | NEEDS_IDENTITY |
