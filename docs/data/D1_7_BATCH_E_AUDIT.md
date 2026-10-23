# VScar — D1.7 Auditoría del lote E (`d16a-batch-E`)

> Estado: **PASS** · 2026-10-22 · `vscar_dev`
> - **Plan**: `data/curation/d16a/plan-batch-E.json`, SHA-256 `61f75ff8c1c7070a…` (idéntico al manifiesto D1.6a).
> - **Artefactos**:
>   - [import-report](d17/import-report-batch-E.json)
>   - [checkpoint](d17/checkpoint-5-after-batch-E.json)
>   - [auditoría](d17/audit-after-batch-E.json)

## Resultado

| Paso | Esperado | Obtenido |
|---|---|---|
| Validación previa | 14 válidas | 14/14 válidas · relación con el catálogo: #88 |
| Dry-run | 14 INSERT · 0 SKIP · 0 UPDATE · 0 REJECT · 12 en conflicto | idéntico; nada escrito |
| Importación (run 1) | 14 insertados | 14 insertados · 0 actualizados · 0 fallidos |
| Reejecución (run 2) | 0 cambios | 0 insertados · 0 actualizados · 14 omitidos |
| Dry-run posterior | 14 SKIP | 14 SKIP |
| Observaciones nuevas | 211 | 211 |
| Atributos nuevos | 44 | 44 (todos TECHNICAL/OBSERVED; 0 generación, 0 año-modelo, 0 acabado) |
| Conflictos nuevos | 12 | 12 |
| Vehículos totales | 78 → 92 | 92 |
| Catálogo seleccionable | SHA-256 sin cambios | `be0d441b3c0612b0…` = inicial · 9 `test_fixture` |
| Integridad (duplicados, huérfanos, TAN incompleto, ids en ReferenceVariants) | 0 | 0 · 10 CHECK activos |
| Auditoría (11 comprobaciones) | PASS | PASS |

## Estado acumulado tras el lote

| Magnitud | Antes | Después |
|---|---:|---:|
| Vehículos técnicos | 78 | 92 |
| Observaciones | 1157 | 1368 |
| Técnicamente utilizables | 1145 | 1344 |
| Con derechos pendientes (S11) | 726 | 858 |
| Con derechos aprobados | 0 | 0 |
| Valores en conflicto / vehículos | 12 / 4 | 24 / 9 |
| Huella de la capa curada | `9ff196b1ee80…` | `eaa281f5fead…` |

## Vehículos del lote

Notas sobre la tabla:
- **Matriculado** es el periodo de matriculación observado, nunca año-modelo.
- **Obs.** muestra el total y, entre paréntesis, las utilizables.
- **D1.8** es un diagnóstico, no una autorización.

| # | Vehículo | TAN completo | Va | Ve | Clase | Matriculado | Obs. (utilizables) · fuentes | Atrib. | Conflictos | D1.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 47 | Nissan Qashqai | `E5*2007/46*1029*04` | `F` | `F04` | ICE_OR_MHEV | 2020 | 16 (16) · S01 6 · S11 10 | 3 | — | NEEDS_IDENTITY |
| 49 | Hyundai Tucson | `E11*2007/46*2724*05` | `F5P31` | `M64ZZ1` | ICE_OR_MHEV | 2018 | 15 (15) · S01 5 · S11 10 | 3 | — | NEEDS_IDENTITY |
| 51 | Kia Niro | `E4*2007/46*1139*02` | `C5P11` | `D61AY1` | ICE_OR_MHEV | 2018 | 15 (15) · S01 5 · S11 10 | 3 | — | NEEDS_IDENTITY |
| 52 | Hyundai Tucson | `E5*2018/858*00001*09` | `F5P81` | `M61A11` | ICE_OR_MHEV | 2024–2025 | 14 (14) · S01 5 · S11 9 | 3 | — | NEEDS_IDENTITY |
| 54 | Peugeot 208 | `E2*2007/46*0639*07` | `P` | `HMHD-J1B100` | ICE_OR_MHEV | 2020 | 16 (16) · S01 6 · S11 10 | 4 | — | NEEDS_IDENTITY |
| 58 | BMW Serie 3 | `E1*2007/46*0314*17` | `8C31` | `6A250000` | ICE_OR_MHEV | 2016 | 15 (15) · S01 5 · S11 10 | 4 | — | NEEDS_IDENTITY |
| 72 | BMW X3 | `E1*2007/46*0512*15` | `WZ51` | `6A250000` | ICE_OR_MHEV | 2016 | 15 (15) · S01 5 · S11 10 | 3 | — | NEEDS_IDENTITY |
| 30 | Škoda Octavia | `E8*2007/46*0318*09` | `ACDHFAX0` | `NFD7FD7CW0054BFSTVLN1B7A` | ICE_OR_MHEV | 2020 | 13 (13) · S01 6 · S11 7 | 3 | — | NEEDS_IDENTITY |
| 59 | Hyundai Kona | `E4*2007/46*1259*16` | `F5P31` | `D61CY1Y1` | HEV_OR_MHEV | 2022–2024 | 14 (10) · S01 5 · S11 9 | 3 | `emi.co2_combined_gkm`, `nrg.fuel_combined_l100` | CONFLICTED |
| 31 | Kia Sportage | `E11*2007/46*3144*03` | `F5D61` | `D72ZZ1` | ICE_OR_MHEV | 2018–2020 | 15 (13) · S01 5 · S11 10 | 3 | `dim.wheelbase_mm` | NEEDS_IDENTITY |
| 66 | Kia Sportage | `E4*2018/858*00079*01` | `F5P54` | `A63F11` | PHEV | 2022 | 20 (18) · S01 9 · S11 11 | 3 | `nrg.phev_weighted_fuel_l100` | NEEDS_IDENTITY |
| 62 | Renault Clio | `E2*2007/46*0676*23` | `BH2` | `N84WA3VA5300` | HEV_OR_MHEV | 2024 | 14 (12) · S01 5 · S11 9 | 4 | `perf.power_ice_kw` | NEEDS_IDENTITY |
| 65 | CUPRA Formentor | `E9*2007/46*4008*11` | `CXDTTAX0` | `FM6CFM6C90044BI1AAC` | ICE_OR_MHEV | 2022 | 15 (13) · S01 6 · S11 9 | 2 | `nrg.fuel_combined_l100` | CONFLICTED |
| 88 | Tesla Model 3 | `E4*2007/46*1293*25` | `E6LR` | `BQB1S5N` | BEV | 2022 | 14 (14) · S01 6 · S11 8 | 3 | — | NEEDS_IDENTITY |

## Revisión especial del lote E

### Candidata #88 (Tesla Model 3)

| Comprobación | Resultado |
|---|---|
| Identidad | `E4*2007/46*1293*25` · Va `E6LR` · Ve `BQB1S5N` (TAN completo con extensión `*25`, EXACT, corroborado por RDW: 8 observaciones S11 que citan la clave exacta) |
| Registro con el que solapa | variante seleccionable `tesla-model-3-2021-traccion-trasera` (homologación del catálogo: TAN `e4*2007/46*1293` **sin extensión**, Va `E6LR`, **sin versión**, identidad PARTIAL) |
| ¿Duplicado técnico? | **No**: el catálogo no tiene una clave TAN+Va+Ve exacta con la que coincidir; comparten solo el TAN base y la variante |
| Relación | relación legítima posible: #88 puede ser una de las homologaciones exactas detrás de esa variante comercial parcial |
| Decisión | **importado** en la capa técnica (que no es seleccionable). No se fusiona con el catálogo ni se toca la variante existente. La relación queda como bloqueo **NEEDS_IDENTITY** para D1.8: reconciliar antes de cualquier promoción, nunca crear una segunda variante seleccionable del mismo coche |

### Conflictos del lote (12 valores, 6 grupos, 5 vehículos)

Todos se conservan sin promediar ni elegir fuente: Quality los marca NOT_USABLE. Detalle en el [registro de conflictos](D1_7_CONFLICT_REGISTER.md).
