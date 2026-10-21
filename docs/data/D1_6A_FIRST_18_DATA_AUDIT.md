# VScar — D1.6a Auditoría de los 18 vehículos curados

> Estado: **PASS (11/11 comprobaciones)** · 2026-10-21 · `vscar_dev` · Solo lectura: no se ha reimportado nada.
> - **Script**: `node --env-file=.env packages/db/scripts/technical-audit.ts`
> - **Detalle por vehículo y conflicto**: [`d16a/first-18-audit.json`](d16a/first-18-audit.json)

## 1. Conciliación con D1.6

| Magnitud | D1.6 | Auditoría D1.6a |
|---|---:|---:|
| Vehículos técnicos | 18 | **18** |
| Observaciones | 279 (S01 104 · S11 175) | **279** (S01 104 · S11 175) |
| Técnicamente utilizables | 267 | **267** |
| Atributos | 69 | **69** (52 TECHNICAL · 17 COMMERCIAL) |
| Valores en conflicto | 12 | **12** (6 grupos) |
| Vehículos con conflictos | 4 | **4** (#4, #24, #53, #73) |
| Catálogo seleccionable | 9 | **9** (huella idéntica a la de D1.6) |

### TECHNICALLY_USABLE ≠ PUBLICATION_RIGHTS_APPROVED

| Utilizables (267) por derechos | Observaciones |
|---|---:|
| APPROVED | **0** |
| CONDITIONAL (S01 EEA, CC BY) | 98 |
| PENDING (S11 RDW) | 169 |

Ninguna observación tiene hoy derechos de publicación aprobados. La capa curada no alimenta ningún motor ni ninguna página.

## 2. Por vehículo

| # | Vehículo | TAN completo | Va | Ve | Identidad comercial | Matriculado | Obs. (utilizables) | Derechos | Conflictos |
|---|---|---|---|---|---|---|---|---|---|
| 4 | BYD SEAL | E13\*2018/858\*00639\*00 | SE2D1C | 1NXE5E001NL1 | EXACT (acabado IDAE, S02 pendiente) | 2024–2025 | 13 (9) | S01 cond. · S11 pend. | 2 grupos |
| 5 | Kia Sportage | E4\*2018/858\*00079\*00 | F5P11 | M61A11 | PARTIAL | 2022 | 15 (15) | idem | — |
| 6 | Renault Clio | E2\*2007/46\*0676\*28 | BD2 | AC6WA2SA500B | PARTIAL | 2024–2025 | 14 (14) | idem | — |
| 7 | Nissan Qashqai | E9\*2018/858\*11042\*10 | A | A35 | PARTIAL | 2024–2025 | 14 (14) | idem | — |
| 8 | Hyundai Tucson | E11\*2007/46\*2724\*05 | F5D51 | M66ZZ1 | PARTIAL | 2018–2020 | 17 (17) | idem | — |
| 9 | Kia Sportage | E11\*2007/46\*3144\*01 | F5D51 | M66ZZ1 | PARTIAL | 2016–2018 | 15 (15) | idem | — |
| 20 | Peugeot 3008 | E2\*2007/46\*0534\*05 | C | YHZJ-C2B000 | PARTIAL | 2018–2020 | 16 (16) | idem | — |
| 24 | Dacia Sandero | E19\*2007/46\*0026\*27 | BEV | MT6WA45M520B | PARTIAL | 2025 | 14 (10) | idem | 2 grupos |
| 26 | Peugeot 308 | E2\*2007/46\*0628\*30 | B | YHZT-B21700 | EXACT (acabado de la designación EEA) | 2024 | 14 (14) | idem | — |
| 27 | Toyota Yaris | E6\*2007/46\*0437\*04 | MXPA11(H) | MXPA11L-BHFNBW(1E) | PARTIAL | 2022–2024 | 14 (14) | idem | — |
| 28 | Mercedes-Benz Clase A | E1\*2007/46\*1829\*16 | X21CT2 | HZAA151C | PARTIAL | 2022–2024 | 14 (14) | idem | — |
| 48 | Toyota Yaris | E6\*2007/46\*0437\*04 | MXPH11(H) | MXPH11L-CHXNBW(1E) | PARTIAL | 2022–2025 | 14 (14) | idem | — |
| 53 | Mercedes-Benz Clase A | E1\*2007/46\*1829\*12 | X28QT2 | HZAA052A | PARTIAL | 2020 | 20 (18) | idem | 1 grupo |
| 56 | Toyota Corolla | E6\*2007/46\*0318\*05 | ZWE211(H) | ZWE211L-DHXNBW(1F) | PARTIAL | 2022 | 15 (15) | idem | — |
| 57 | Peugeot 3008 | E2\*2007/46\*0534\*23 | 4 | DGZU-C1J000 | PARTIAL | 2022 | 20 (20) | idem | — |
| 73 | Toyota RAV4 | E6\*2007/46\*0429\*05 | AXAP54(N) | AXAP54L-ANXMBW(1F) | PARTIAL | 2025 | 20 (18) | idem | 1 grupo |
| 81 | Tesla Model Y | E4\*2007/46\*1293\*26 | Y6LR | BZB3S5T3 | PARTIAL | 2022 | 14 (14) | idem | — |
| 86 | Renault Clio | E2\*2007/46\*0676\*05 | BH2 | MU4UA0FA5000 | PARTIAL | 2020 | 16 (16) | idem | — |

- **Importación**: todos en el lote `d16-first-18`, `curation_status = CURATED`, último item IMPORTED.
  - El run de cada item está en COMPLETED.
  - Hay 6 runs COMPLETED: tres pares de doble ejecución en D1.6. La reimportación tras corregir la evidencia RDW tocó 3 vehículos.
- **Columna "Matriculado"**: es el **periodo de matriculación observado**, nunca año-modelo.
- **ID interno, candidata D1 y ejecución por vehículo**: en el JSON.

## 3. Conflictos (12 valores, 6 grupos; todos abiertos)

| # | SpecKey | Fuente A → valor | Fuente B → valor | Base de medida | Tipo | Estado |
|---|---|---|---|---|---|---|
| 4 BYD SEAL | `rng.electric_combined_km` | S11 → 538 km (WLTP, `WLTP_COMBINED`) | S01 → 520 km (ciclo no declarado, `range_type` sin especificar) | distinta | CROSS_SOURCE_DIFFERENT_BASIS | abierto · ambos NOT_USABLE |
| 4 BYD SEAL | `nrg.electric_combined_kwh100` | S11 → 17,4 kWh/100 km (WLTP) | S01 → 18,2 kWh/100 km (no declarado) | distinta | CROSS_SOURCE_DIFFERENT_BASIS | abierto · NOT_USABLE |
| 24 Dacia Sandero | `emi.co2_combined_gkm` | S11 → 130–135 g/km (WLTP) | S01 → 112–113 g/km (WLTP) | misma | CROSS_SOURCE_VALUE_MISMATCH | abierto · NOT_USABLE (hipótesis sin verificar: modo de combustible de un bi-fuel) |
| 24 Dacia Sandero | `nrg.fuel_combined_l100` | S01 → 5,7 L/100 km (no declarado) | S11 → 5,76–5,99 L/100 km (WLTP) | distinta | CROSS_SOURCE_DIFFERENT_BASIS | abierto · NOT_USABLE |
| 53 Mercedes Clase A PHEV | `nrg.electric_combined_kwh100` | S11 → 16,3–18,8 kWh/100 km (WLTP) | S01 → 21,1–21,7 kWh/100 km (no declarado) | distinta | CROSS_SOURCE_DIFFERENT_BASIS | abierto · NOT_USABLE |
| 73 Toyota RAV4 PHEV | `nrg.phev_weighted_fuel_l100` | S11 → 1 L/100 km (WLTP ponderado) | S01 → 0,3 L/100 km (no declarado) | distinta | CROSS_SOURCE_DIFFERENT_BASIS | abierto · NOT_USABLE |

- **Tratamiento**:
  - Ningún valor se ha promediado ni elegido por jerarquía de fuente: no existe regla aprobada.
  - Quality los marca NOT_USABLE, así que quedan fuera de cualquier comparación.
- **#4 BYD SEAL**: mantiene además el conflicto documentado en [D1_2_BYD_SEAL_CONFLICT_RESOLUTION](D1_2_BYD_SEAL_CONFLICT_RESOLUTION.md).

## 4. Comprobaciones de integridad (todas PASS)

| Comprobación | Resultado |
|---|---|
| Sin filas `generation` ni `model_year` (no se inventan) | PASS (0) |
| Acabado solo donde D1.2 lo marcó EXACT (#4, #26) | PASS |
| Ningún atributo comercial como hecho observado | PASS (y ahora lo impide también MySQL) |
| Sin propagación de modelo a versiones: toda observación y atributo técnico cita la clave TAN\|Va\|Ve de **su** vehículo | PASS (0 filas con otra clave) |
| Solo fuentes oficiales (S01/S02/S11/S13; hosts `discodata.eea.europa.eu`, `opendata.rdw.nl`) | PASS |
| Sin OpenDataBay, gor3a, Kaggle, AutoSeeker, vehiclesdb ni GitHub en la capa curada | PASS |
| Sin precios (históricos ni actuales) en la capa curada | PASS |
| Sin valores DENIED ni `SECONDARY_REFERENCE` | PASS |
| Todo valor en conflicto con grupo | PASS |
| Catálogo seleccionable idéntico al de D1.6 | PASS |
| Ningún id curado es una ReferenceVariant | PASS |
| Duplicados potenciales | 0 (UNIQUE de clave e identidad; solapamientos con el catálogo excluidos en D1.6) |
