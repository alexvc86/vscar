# VScar — Spain 100 Variant Candidates v0.1 (Step D1)

> Estado: **v0.1 · 2026-10-16** · Datos: [`d1/curation_candidates.jsonl`](d1/curation_candidates.jsonl) (formato `CurationCandidate` v1, validado con Zod) · Código: `packages/curation` · Generado por `node packages/curation/scripts/d1-build.ts` (determinista) · Relacionado: [SPAIN_DATASET_COVERAGE_V0_1](SPAIN_DATASET_COVERAGE_V0_1.md) · [SPAIN_DATASET_IMPORT_PLAN_V0_1](SPAIN_DATASET_IMPORT_PLAN_V0_1.md)

**Esto es una lista de candidatos, no un catálogo.** Cada fila es un grupo técnico real de la EEA (matriculaciones en España) propuesto para curación. Ninguno se ha cargado en MySQL. Ninguno es publicable todavía.

## 1. Tres niveles, nunca mezclados

| Nivel | Qué significa | Cuántos |
|---|---|---:|
| **Candidato** | grupo técnico EEA real (TAN/Va/Ve) de una familia objetivo, con matriculaciones en ES | 1.907 clústeres · **100 en la lista** |
| **Identidad verificada** | una fuente oficial enlaza la versión comercial con TAN + Va + Ve (código IDAE = Va/Ve o curación EXACT existente) | **4 en la lista** (5 en total) |
| **Listo para importar** (`READY_FOR_CURATED_IMPORT`) | identidad EXACT + claves críticas completas + derechos resueltos | **0** |

## 2. Cómo se construye un candidato

1. **Deduplicación**: matriculaciones → grupo técnico por año (`TAN|Va|Ve`, agregación en servidor) → identidad técnica (mismo `TAN|Va|Ve` en varios años) → **clúster** = familia + homologación base (TAN sin extensión) + Va + powertrain de homologación + combustible + cilindrada + potencia + **ciclo** (NEDC ≠ WLTP).
2. **Representante** = la versión (Ve) identificada por una fuente oficial si existe; si no, la de más matriculaciones. Las demás Ve son **hermanas**: se cuentan y referencian, nunca se promedian ni se fusionan.
3. **Enlace con IDAE** (versión comercial en España): por **código oficial** (EXACT) o por **valores** (familia + powertrain + combustible + potencia ± 1,5 kW + periodo + contraste de consumo). Un enlace por valores que no supera el contraste se **descarta**.
4. **Identidad** (reglas del HOMOLOGATION_MATCH_REPORT, sin cambios): EXACT solo con identificador oficial · PARTIAL con código que confirma Va pero no Ve · **AMBIGUOUS** si otra variante técnica de la familia comparte todos los valores comparados (o el enlace declara potencias distintas) · **CONFLICTED** si la propia versión EEA es incoherente (combustibles/modos/potencias distintos) · UNCONFIRMED en el resto.
5. **Cobertura** con las claves críticas existentes (`CATEGORY_REQUIREMENTS`, Catalog v0.2 §8.1). Sin fórmula nueva.
6. **Prioridad de curación** (interna, ≠ score de comprador): identidad 30 · cobertura crítica 20 · presencia de mercado 20 (log de matriculaciones ES EEA, CC BY) · calidad de fuente 10 (FINAL vs provisional) · contraste entre fuentes 10 · claridad de derechos 10. Sin popularidad inventada.
7. **Selección**: al menos el mejor candidato por familia; luego por familia × periodo × powertrain; cuotas orientativas por powertrain; máximo 7 por familia; mínimo 100 matriculaciones; CONFLICTED excluidos.

## 3. Resultado

| | Lista (100) | Piloto (20) |
|---|---:|---:|
| EXACT | 4 | 2 |
| PARTIAL | 0 | 0 |
| UNCONFIRMED | 81 | 18 |
| AMBIGUOUS | 15 | 0 |
| CONFLICTED | 0 (excluidos; 38 en el total) | 0 |
| Familias | 25 | 14 |
| `NEEDS_IDENTITY_REVIEW` / `NEEDS_DATA_COMPLETION` | 96 / 4 | 18 / 2 |

### 3.1 Distribución por powertrain (objetivo orientativo vs real)

| Powertrain | Objetivo | Lista | Nota |
|---|---:|---:|---|
| ICE gasolina/diésel | 35 | 47 (`ICE_OR_MHEV`) | EEA homologa muchos MHEV como ICE: **no separables** sin S08 |
| MHEV | 15 | 3 (indicado por texto IDAE) | **NOT VERIFIED**: ni EEA ni IDAE tienen un campo MHEV |
| HEV | 20 | 20 (`HEV_OR_MHEV`) | NOVC_HEV incluye MHEV de 48 V (Golf eTSI, BMW sDrive18d) |
| PHEV | 10 | 10 | |
| BEV | 20 | 20 | |
| **Total** | **100** | **100** | ICE + MHEV = 50 (35 + 15) |

El reparto ICE/MHEV/HEV **no está verificado**: se ofrece como `ICE_OR_MHEV` y `HEV_OR_MHEV` hasta que la ficha del fabricante lo resuelva.

### 3.2 Cobertura temporal

| Periodo | Lista | Piloto | Nota |
|---|---:|---:|---|
| 2015–2018 | 15 | 1 | `Ep` casi vacío en 2016 → menos enlaces y prioridad más baja |
| 2019–2021 | 17 | 4 | |
| 2022–2024 | 33 | 8 | |
| 2025–2026 | 35 | 7 | 2025 solo **provisional**; 2026 sin datos EEA (previsto 2027) |
| 2010–2014 | 0 | 0 | **sin `TAN` en la EEA** → sin identidad técnica posible por esta vía |

### 3.3 Por familia

| Familia | Clústeres técnicos | En la lista | Matr. ES (años encuestados) |
|---|---:|---:|---:|
| vw-golf | 272 | 7 | 89.406 |
| seat-leon | 189 | 1 | 128.601 |
| cupra-formentor | 16 | 2 | 32.698 |
| toyota-corolla | 37 | 3 | 76.833 |
| toyota-rav4 | 35 | 3 | 60.865 |
| toyota-yaris | 35 | 3 | 87.128 |
| bmw-3 | 172 | 1 | 23.497 |
| bmw-x3 | 68 | 5 | 23.359 |
| tesla-model-3 | 28 | 4 | 24.883 |
| tesla-model-y | 19 | 3 | 13.363 |
| byd-seal | 3 | 2 | 3444 |
| hyundai-tucson | 76 | 5 | 111.452 |
| hyundai-kona | 44 | 7 | 58.972 |
| kia-sportage | 67 | 6 | 92.807 |
| kia-niro | 19 | 6 | 44.827 |
| renault-clio | 76 | 6 | 129.210 |
| renault-megane | 100 | 4 | 62.842 |
| peugeot-208 | 74 | 5 | 102.434 |
| peugeot-308 | 93 | 2 | 63.621 |
| peugeot-3008 | 39 | 6 | 74.531 |
| dacia-sandero | 39 | 5 | 172.533 |
| nissan-qashqai | 39 | 4 | 123.958 |
| skoda-octavia | 150 | 3 | 27.899 |
| audi-a3 | 156 | 2 | 52.614 |
| mercedes-a | 61 | 5 | 52.772 |

Ninguna familia hipotética se ha descartado: las 25 tienen candidatos reales. Formentor solo existe desde 2020. BYD SEAL (3 clústeres, 3.444 matriculaciones) entra por **identidad EXACT** y diversidad BEV, no por volumen. SEAT León tiene muchas variantes con valores idénticos (AMBIGUOUS) y solo 1 candidato en la lista: es la familia con más margen de mejora cuando se disponga de CoC.

**Sustituciones propuestas** (no aplicadas; decisión de producto): según el sondeo de nombres comerciales EEA ES de 2016, 2019 y 2024, Toyota C-HR (≈ 34.900), Hyundai i20 (≈ 32.900), VW T-Roc (≈ 31.200) y Dacia Duster (≈ 41.300) suman más matriculaciones que BMW Serie 3 (23.497), BYD SEAL (3.444) o Škoda Octavia (27.899) en los seis años de la encuesta. Si se busca presencia de mercado, son mejores candidatos. BYD SEAL se mantiene porque es el único caso con identidad EXACT verificable por código oficial.

## 4. Lista de 100 candidatos

Leyenda — Categorías D1: categorías Alpha que se podrían activar **solo** con datos EEA/IDAE (`~` = parcial: base o ciclo sin declarar). `—` = ninguna. Las demás necesitan S08 (precio, dimensiones, maletero, plazas, 0–100, depósito, carga, garantía).

| # | Piloto | Familia | Powertrain | kW | Años EEA | TAN · Va · Ve | Identidad | Matr. ES | Prioridad | Categorías D1 | Estado |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 |  | Volkswagen Golf | ICE/MHEV | 96 | 2018 | `E1*2007/46*0623*35` · `GAC4DACAX0` · `FM6FM6AJ015N7CPON1ML1BVR2NA` (+6) | EXACT | 793 | 62.4 | — | NEEDS_DATA_COMPLETION · ya en catálogo |
| 2 | ✅ | BYD SEAL | BEV | 230 | 2025 | `E13*2018/858*00639*03` · `SE2R1C` · `2NTE5F002NL1` (+2) | EXACT | 2763 | 59.4 | Range~ | NEEDS_DATA_COMPLETION |
| 3 |  | Volkswagen Golf | ICE/MHEV | 96 | 2018 | `E1*2007/46*0623*33` · `GAC4DACAX0` · `FM6FM6AJ015N7MVON1ML79VR2N` (+3) | EXACT | 156 | 58.9 | — | NEEDS_DATA_COMPLETION · ya en catálogo |
| 4 | ✅ | BYD SEAL | BEV | 390 | 2024, 2025 | `E13*2018/858*00639*00` · `SE2D1C` · `1NXE5E001NL1` (+2) | EXACT | 672 | 56.3 | Range~ | NEEDS_DATA_COMPLETION |
| 5 | ✅ | Kia Sportage | ICE/MHEV | 110 | 2022 | `E4*2018/858*00079*00` · `F5P11` · `M61A11` (+15) | UNCONFIRMED | 7781 | 55.9 | — | NEEDS_IDENTITY_REVIEW |
| 6 | ✅ | Renault Clio | ICE/MHEV | 74 | 2024, 2025 | `E2*2007/46*0676*28` · `BD2` · `AC6WA2SA500B` (+31) | UNCONFIRMED | 14.288 | 53.2 | — | NEEDS_IDENTITY_REVIEW |
| 7 | ✅ | Nissan Qashqai | MHEV | 103 | 2024, 2025 | `E9*2018/858*11042*10` · `A` · `A35` (+34) | UNCONFIRMED | 22.196 | 52.6 | — | NEEDS_IDENTITY_REVIEW |
| 8 | ✅ | Hyundai Tucson | ICE/MHEV | 85 | 2018, 2020 | `E11*2007/46*2724*05` · `F5D51` · `M66ZZ1` (+1) | UNCONFIRMED | 13.075 | 52 | — | NEEDS_IDENTITY_REVIEW |
| 9 | ✅ | Kia Sportage | ICE/MHEV | 85 | 2016, 2018 | `E11*2007/46*3144*01` · `F5D51` · `M66ZZ1` (+2) | UNCONFIRMED | 12.436 | 51.9 | — | NEEDS_IDENTITY_REVIEW |
| 10 |  | Renault Clio | ICE/MHEV | 74 | 2020 | `E2*2007/46*0676*03` · `BE2` · `MT5TA08A5000` (+28) | UNCONFIRMED | 7773 | 50.9 | — | NEEDS_IDENTITY_REVIEW |
| 11 |  | Kia Sportage | MHEV | 110 | 2022, 2024, 2025 | `E4*2018/858*00079*02` · `F5P21` · `M61A17` (+9) | UNCONFIRMED | 6331 | 49.9 | — | NEEDS_IDENTITY_REVIEW |
| 12 |  | Renault Clio | ICE/MHEV | 49 | 2022 | `E2*2007/46*0676*14` · `BE2` · `MG5UA8HA5000` (+11) | UNCONFIRMED | 417 | 49.5 | — | NEEDS_IDENTITY_REVIEW |
| 13 |  | Dacia Sandero | ICE/MHEV | 49 | 2022 | `E19*2007/46*0026*10` · `BES` · `MG5UA41M5100` (+22) | UNCONFIRMED | 417 | 49.5 | — | NEEDS_IDENTITY_REVIEW |
| 14 |  | Dacia Sandero | ICE/MHEV | 67 | 2022 | `E19*2007/46*0026*12` · `BEV` · `M66UA43M5200` (+71) | AMBIGUOUS | 22.203 | 49.2 | — | NEEDS_IDENTITY_REVIEW |
| 15 |  | Volkswagen Golf | ICE/MHEV | 180 | 2024 | `E1*2007/46*2014*23` · `ACDNPAX0` · `FD7FD7GC003S4BISOR2ML1CVR2AI0` (+28) | UNCONFIRMED | 199 | 47.9 | — | NEEDS_IDENTITY_REVIEW |
| 16 |  | Hyundai Kona | ICE/MHEV | 73 | 2024, 2025 | `E4*2018/858*00153*01` · `F5P12` · `M61AY1` | UNCONFIRMED | 956 | 47.4 | — | NEEDS_IDENTITY_REVIEW |
| 17 |  | Volkswagen Golf | BEV | 100 | 2018 | `E1*2007/46*0623*33` · `GAC4EAZAX0` · `FA1FA1MD001E0GAON1ML01VR0N` (+6) | UNCONFIRMED | 275 | 46.9 | Range~ | NEEDS_IDENTITY_REVIEW |
| 18 |  | Hyundai Kona | ICE/MHEV | 84 | 2025 | `E4*2018/858*00153*03` · `F5P12` · `M61AY1` | UNCONFIRMED | 423 | 45.6 | — | NEEDS_IDENTITY_REVIEW |
| 19 |  | Hyundai Kona | ICE/MHEV | 85 | 2018 | `E4*2007/46*1259*01` · `F5D11` · `M62AZ1` (+4) | UNCONFIRMED | 638 | 45.5 | — | NEEDS_IDENTITY_REVIEW |
| 20 | ✅ | Peugeot 3008 | ICE/MHEV | 96 | 2018, 2020 | `E2*2007/46*0534*05` · `C` · `YHZJ-C2B000` (+62) | UNCONFIRMED | 22.238 | 45.3 | — | NEEDS_IDENTITY_REVIEW |
| 21 |  | Hyundai Tucson | ICE/MHEV | 85 | 2022 | `E5*2018/858*00001*05` · `F5D41` · `M62A12` (+6) | AMBIGUOUS | 2744 | 44.6 | — | NEEDS_IDENTITY_REVIEW |
| 22 | ✅ | Peugeot 208 | ICE/MHEV | 75 | 2022 | `E2*2007/46*0639*18` · `B` · `YHTK-J2B400` (+40) | UNCONFIRMED | 6933 | 44.3 | — | NEEDS_IDENTITY_REVIEW |
| 23 |  | Hyundai Kona | MHEV | 73 | 2024, 2025 | `E4*2018/858*00153*01` · `F5P22` · `M61AY1` | UNCONFIRMED | 483 | 44.3 | — | NEEDS_IDENTITY_REVIEW |
| 24 | ✅ | Dacia Sandero | ICE/MHEV | 67 | 2025 | `E19*2007/46*0026*27` · `BEV` · `MT6WA45M520B` (+63) | UNCONFIRMED | 42.394 | 44.3 | — | NEEDS_IDENTITY_REVIEW |
| 25 |  | Peugeot 3008 | ICE/MHEV | 96 | 2020 | `E2*2007/46*0534*12` · `R` · `HNSM-C1P100` (+68) | UNCONFIRMED | 13.924 | 44.3 | — | NEEDS_IDENTITY_REVIEW |
| 26 | ✅ | Peugeot 308 | ICE/MHEV | 96 | 2024 | `E2*2007/46*0628*30` · `B` · `YHZT-B21700` (+61) | UNCONFIRMED | 6148 | 44.1 | — | NEEDS_IDENTITY_REVIEW |
| 27 | ✅ | Toyota Yaris | ICE/MHEV | 92 | 2022, 2024 | `E6*2007/46*0437*04` · `MXPA11(H)` · `MXPA11L-BHFNBW(1E)` (+20) | UNCONFIRMED | 6099 | 44 | — | NEEDS_IDENTITY_REVIEW |
| 28 | ✅ | Mercedes-Benz Clase A | ICE/MHEV | 110 | 2022, 2024 | `E1*2007/46*1829*16` · `X21CT2` · `HZAA151C` (+52) | UNCONFIRMED | 5781 | 43.9 | — | NEEDS_IDENTITY_REVIEW |
| 29 |  | Nissan Qashqai | ICE/MHEV | 85 | 2018 | `E11*2007/46*0963*17` · `D` · `D03` (+20) | UNCONFIRMED | 11.684 | 43.9 | — | NEEDS_IDENTITY_REVIEW |
| 30 |  | Škoda Octavia | ICE/MHEV | 96 | 2020 | `E8*2007/46*0318*09` · `ACDHFAX0` · `NFD7FD7CW0054BFSTVLN1B7A` (+5) | UNCONFIRMED | 292 | 43.8 | — | NEEDS_IDENTITY_REVIEW |
| 31 |  | Kia Sportage | ICE/MHEV | 104 | 2018, 2020 | `E11*2007/46*3144*03` · `F5D61` · `D72ZZ1` (+1) | UNCONFIRMED | 606 | 43.8 | — | NEEDS_IDENTITY_REVIEW |
| 32 |  | Hyundai Kona | BEV | 99 | 2024, 2025 | `E4*2018/858*00168*02` · `F5E32` · `E11AZ1` (+2) | UNCONFIRMED | 398 | 43.7 | Range~ | NEEDS_IDENTITY_REVIEW |
| 33 |  | Audi A3 | ICE/MHEV | 110 | 2024 | `E1*2007/46*2060*27` · `SDTSBF1` · `FD7FD7GC002RT011C184BIBEM1MLN1D0C` (+65) | AMBIGUOUS | 1519 | 43.4 | — | NEEDS_IDENTITY_REVIEW |
| 34 |  | Toyota Corolla | ICE/MHEV | 72 | 2020 | `E6*2007/46*0318*03` · `ZWE211(H)` · `ZWE211L-DHXNBW(1D)` (+9) | UNCONFIRMED | 9040 | 43.4 | — | NEEDS_IDENTITY_REVIEW |
| 35 |  | Toyota Yaris | ICE/MHEV | 54 | 2018 | `E11*2007/46*0152*10` · `NHP13(MH)` · `NHP130L-CHXNBW(1L)` (+6) | UNCONFIRMED | 8263 | 43.2 | — | NEEDS_IDENTITY_REVIEW |
| 36 |  | Dacia Sandero | ICE/MHEV | 66 | 2020 | `E2*2001/116*0314*93` · `05EV` · `AC5DA1A0M500` (+10) | AMBIGUOUS | 12.608 | 43 | — | NEEDS_IDENTITY_REVIEW |
| 37 |  | Dacia Sandero | ICE/MHEV | 66 | 2018 | `E2*2001/116*0314*83` · `5SDL1` · `5SDL1C` (+6) | AMBIGUOUS | 12.589 | 42.9 | — | NEEDS_IDENTITY_REVIEW |
| 38 |  | Mercedes-Benz Clase A | ICE/MHEV | 100 | 2016, 2018 | `E1*2001/116*0470*16` · `12S1P2` · `MZAZ1502` (+14) | UNCONFIRMED | 7471 | 42.9 | — | NEEDS_IDENTITY_REVIEW |
| 39 |  | Renault Mégane | ICE/MHEV | 205 | 2018 | `E2*2007/46*0546*09` · `BF4` · `M6A6SF010000` (+5) | UNCONFIRMED | 198 | 42.9 | — | NEEDS_IDENTITY_REVIEW |
| 40 |  | Nissan Qashqai | HEV/MHEV | 116 | 2024, 2025 | `E9*2018/858*11042*11` · `A` · `A41` (+42) | AMBIGUOUS | 14.081 | 42.7 | — | NEEDS_IDENTITY_REVIEW |
| 41 |  | Toyota RAV4 | ICE/MHEV | 131 | 2020 | `E6*2007/46*0289*02` · `AXAH52(N)` · `AXAH52L-ANXMBW(1C)` (+15) | UNCONFIRMED | 6430 | 42.6 | — | NEEDS_IDENTITY_REVIEW |
| 42 |  | Renault Mégane | ICE/MHEV | 97 | 2018 | `E2*2007/46*0546*09` · `BF2` · `MR662A010000` (+19) | UNCONFIRMED | 6256 | 42.6 | — | NEEDS_IDENTITY_REVIEW |
| 43 |  | Peugeot 308 | ICE/MHEV | 96 | 2020, 2022 | `E2*2007/46*0405*29` · `B` · `YHZJ-C22100` (+31) | UNCONFIRMED | 2874 | 42.4 | — | NEEDS_IDENTITY_REVIEW |
| 44 |  | Mercedes-Benz Clase A | ICE/MHEV | 85 | 2018, 2020 | `E1*2007/46*1829*03` · `X203T2` · `EZAA151B` (+24) | UNCONFIRMED | 5857 | 42.4 | — | NEEDS_IDENTITY_REVIEW |
| 45 |  | Peugeot 208 | ICE/MHEV | 74 | 2025 | `E2*2007/46*0639*35` · `P` · `HNEK-K1T500` (+86) | UNCONFIRMED | 36.971 | 42.4 | — | NEEDS_IDENTITY_REVIEW |
| 46 |  | Audi A3 | HEV/MHEV | 110 | 2024 | `E1*2007/46*2060*27` · `SDFYAF1` · `FD7FD7CW002RT011C184BIBEM1MLN1B20` (+40) | AMBIGUOUS | 1992 | 42.4 | — | NEEDS_IDENTITY_REVIEW |
| 47 |  | Nissan Qashqai | ICE/MHEV | 103 | 2020 | `E5*2007/46*1029*04` · `F` · `F04` (+10) | AMBIGUOUS | 9379 | 42.3 | — | NEEDS_IDENTITY_REVIEW |
| 48 | ✅ | Toyota Yaris | HEV/MHEV | 68 | 2022, 2024, 2025 | `E6*2007/46*0437*04` · `MXPH11(H)` · `MXPH11L-CHXNBW(1E)` (+40) | UNCONFIRMED | 33.762 | 42.2 | — | NEEDS_IDENTITY_REVIEW |
| 49 |  | Hyundai Tucson | ICE/MHEV | 97 | 2018 | `E11*2007/46*2724*05` · `F5P31` · `M64ZZ1` (+1) | AMBIGUOUS | 8580 | 42.1 | — | NEEDS_IDENTITY_REVIEW |
| 50 |  | Škoda Octavia | ICE/MHEV | 110 | 2024 | `E8*2007/46*0355*17` · `ACDTTCX0` · `NFD7FD7GC0024BIVL0N1A3A` (+37) | AMBIGUOUS | 867 | 42.1 | — | NEEDS_IDENTITY_REVIEW |
| 51 |  | Kia Niro | ICE/MHEV | 77 | 2018 | `E4*2007/46*1139*02` · `C5P11` · `D61AY1` (+7) | UNCONFIRMED | 4890 | 42 | — | NEEDS_IDENTITY_REVIEW |
| 52 |  | Hyundai Tucson | ICE/MHEV | 117 | 2024, 2025 | `E5*2018/858*00001*09` · `F5P81` · `M61A11` (+3) | UNCONFIRMED | 8091 | 42 | — | NEEDS_IDENTITY_REVIEW |
| 53 | ✅ | Mercedes-Benz Clase A | PHEV | 118 | 2020 | `E1*2007/46*1829*12` · `X28QT2` · `HZAA052A` (+30) | UNCONFIRMED | 3499 | 42 | — | NEEDS_IDENTITY_REVIEW |
| 54 |  | Peugeot 208 | ICE/MHEV | 55 | 2020 | `E2*2007/46*0639*07` · `P` · `HMHD-J1B100` (+36) | UNCONFIRMED | 4766 | 42 | — | NEEDS_IDENTITY_REVIEW |
| 55 |  | SEAT León | ICE/MHEV | 110 | 2024 | `E9*2007/46*3167*27` · `SFDTTCX0` · `FD7SFD7GC0024BIVL1BAD16` (+34) | AMBIGUOUS | 791 | 41.9 | — | NEEDS_IDENTITY_REVIEW |
| 56 | ✅ | Toyota Corolla | HEV/MHEV | 72 | 2022 | `E6*2007/46*0318*05` · `ZWE211(H)` · `ZWE211L-DHXNBW(1F)` (+5) | UNCONFIRMED | 4618 | 41.9 | — | NEEDS_IDENTITY_REVIEW |
| 57 | ✅ | Peugeot 3008 | PHEV | 133 | 2022 | `E2*2007/46*0534*23` · `4` · `DGZU-C1J000` (+17) | UNCONFIRMED | 3445 | 41.9 | — | NEEDS_IDENTITY_REVIEW |
| 58 |  | BMW Serie 3 | ICE/MHEV | 110 | 2016 | `E1*2007/46*0314*17` · `8C31` · `6A250000` (+22) | UNCONFIRMED | 4511 | 41.8 | — | NEEDS_IDENTITY_REVIEW |
| 59 |  | Hyundai Kona | HEV/MHEV | 77 | 2022, 2024 | `E4*2007/46*1259*16` · `F5P31` · `D61CY1Y1` (+12) | UNCONFIRMED | 3788 | 41.5 | — | NEEDS_IDENTITY_REVIEW |
| 60 |  | Toyota RAV4 | HEV/MHEV | 131 | 2024, 2025 | `E6*2007/46*0289*08` · `AXAL52(N)` · `AXAL52L-ANXMBW(1J)` (+19) | UNCONFIRMED | 18.994 | 41 | — | NEEDS_IDENTITY_REVIEW |
| 61 |  | Kia Niro | BEV | 150 | 2022 | `E4*2007/46*1139*12` · `C5E11` · `E11DY1` (+3) | AMBIGUOUS | 1036 | 40.8 | Range~ | NEEDS_IDENTITY_REVIEW |
| 62 |  | Renault Clio | HEV/MHEV | 51 | 2024 | `E2*2007/46*0676*23` · `BH2` · `N84WA3VA5300` (+17) | UNCONFIRMED | 2630 | 40.7 | — | NEEDS_IDENTITY_REVIEW |
| 63 |  | Kia Niro | HEV/MHEV | 77 | 2022 | `E4*2007/46*1139*12` · `C5P11` · `D61CY1` (+4) | UNCONFIRMED | 2497 | 40.6 | — | NEEDS_IDENTITY_REVIEW |
| 64 |  | Toyota Corolla | HEV/MHEV | 72 | 2025 | `E6*2007/46*0318*10` · `ZWE219(W)` · `ZWE219L-DWXNBW(6L)` (+14) | UNCONFIRMED | 16.029 | 40.6 | — | NEEDS_IDENTITY_REVIEW |
| 65 |  | CUPRA Formentor | ICE/MHEV | 110 | 2022 | `E9*2007/46*4008*11` · `CXDTTAX0` · `FM6CFM6C90044BI1AAC` (+23) | UNCONFIRMED | 1143 | 40.4 | — | NEEDS_IDENTITY_REVIEW |
| 66 |  | Kia Sportage | PHEV | 132 | 2022 | `E4*2018/858*00079*01` · `F5P54` · `A63F11` (+3) | UNCONFIRMED | 1614 | 40.3 | — | NEEDS_IDENTITY_REVIEW |
| 67 |  | Kia Niro | PHEV | 77 | 2020 | `E4*2007/46*1139*08` · `C5P11` · `D61CY1` (+2) | UNCONFIRMED | 5035 | 40.3 | — | NEEDS_IDENTITY_REVIEW |
| 68 |  | Kia Niro | HEV/MHEV | 68 | 2024, 2025 | `E9*2018/858*11241*03` · `C5P11` · `D61AY1` | UNCONFIRMED | 13.084 | 40.2 | — | NEEDS_IDENTITY_REVIEW |
| 69 |  | Hyundai Tucson | HEV/MHEV | 117 | 2024, 2025 | `E5*2018/858*00001*09` · `F5P41` · `A61B11` (+5) | UNCONFIRMED | 12.345 | 40 | — | NEEDS_IDENTITY_REVIEW |
| 70 |  | Škoda Octavia | HEV/MHEV | 110 | 2024 | `E8*2007/46*0355*18` · `ACDFYAX0` · `NFD7FD7CW0024BIVL4N1A0A` (+20) | AMBIGUOUS | 653 | 40 | — | NEEDS_IDENTITY_REVIEW |
| 71 |  | Hyundai Kona | HEV/MHEV | 68 | 2024, 2025 | `E4*2018/858*00153*01` · `F5P42` · `D61CY1` (+3) | UNCONFIRMED | 10.534 | 39.7 | — | NEEDS_IDENTITY_REVIEW |
| 72 |  | BMW X3 | ICE/MHEV | 140 | 2016 | `E1*2007/46*0512*15` · `WZ51` · `6A250000` (+10) | UNCONFIRMED | 1682 | 39.7 | — | NEEDS_IDENTITY_REVIEW |
| 73 | ✅ | Toyota RAV4 | PHEV | 136 | 2025 | `E6*2007/46*0429*05` · `AXAP54(N)` · `AXAP54L-ANXMBW(1F)` (+14) | UNCONFIRMED | 7611 | 39.7 | — | NEEDS_IDENTITY_REVIEW |
| 74 |  | Peugeot 3008 | HEV/MHEV | 100 | 2025 | `E2*2018/858*00064*07` · `A` · `HPY1-A1AN00` (+38) | UNCONFIRMED | 9893 | 39.6 | — | NEEDS_IDENTITY_REVIEW |
| 75 |  | Kia Sportage | HEV/MHEV | 117 | 2024, 2025 | `E4*2018/858*00079*04` · `F5P41` · `A61B11` (+3) | UNCONFIRMED | 10.108 | 39.6 | — | NEEDS_IDENTITY_REVIEW |
| 76 |  | Tesla Model 3 | BEV | 208 | 2024, 2025 | `E4*2007/46*1293*39` · `H6LR` · `BFB1S5T1W` (+9) | UNCONFIRMED | 10.535 | 39.5 | Range~ | NEEDS_IDENTITY_REVIEW |
| 77 |  | BMW X3 | PHEV | 135 | 2022 | `E1*2007/46*1797*14` · `61DP` · `IAW50000` (+9) | UNCONFIRMED | 1106 | 39.5 | — | NEEDS_IDENTITY_REVIEW |
| 78 |  | Peugeot 3008 | PHEV | 147 | 2020 | `E2*2007/46*0534*12` · `4` · `5GBU-C1J000` (+15) | UNCONFIRMED | 1050 | 39.4 | — | NEEDS_IDENTITY_REVIEW |
| 79 |  | Volkswagen Golf | PHEV | 110 | 2024 | `E1*2007/46*2014*23` · `ACDGEAX0` · `FD6FD6DD001P4BISON1ML1CVR2B00` (+20) | AMBIGUOUS | 326 | 39.1 | — | NEEDS_IDENTITY_REVIEW |
| 80 |  | Volkswagen Golf | PHEV | 110 | 2025 | `E1*2007/46*2014*28` · `ACDUCBX0` · `FD6FD6DD001H4WESON1MLB0` (+12) | AMBIGUOUS | 1582 | 38.6 | — | NEEDS_IDENTITY_REVIEW |
| 81 | ✅ | Tesla Model Y | BEV | 220 | 2022 | `E4*2007/46*1293*26` · `Y6LR` · `BZB3S5T3` (+10) | UNCONFIRMED | 1063 | 38.5 | Range~ | NEEDS_IDENTITY_REVIEW |
| 82 |  | Peugeot 208 | HEV/MHEV | 74 | 2025 | `E2*2007/46*0639*36` · `P` · `HPX5-K1NN00` (+21) | UNCONFIRMED | 5796 | 38.4 | — | NEEDS_IDENTITY_REVIEW |
| 83 |  | CUPRA Formentor | PHEV | 110 | 2024, 2025 | `E9*2007/46*4008*24` · `CXDUCBX0` · `FD6PFD6DD0014WE1AAAKM1` (+17) | UNCONFIRMED | 4306 | 38.4 | — | NEEDS_IDENTITY_REVIEW |
| 84 |  | Tesla Model 3 | BEV | 208 | 2025 | `E4*2007/46*1293*47` · `H6MR` · `BFB1S5T1W` (+3) | UNCONFIRMED | 5702 | 38.1 | Range~ | NEEDS_IDENTITY_REVIEW |
| 85 |  | Renault Mégane | BEV | 160 | 2022 | `E2*2018/858*00018*03` · `BE2` · `J1EEA1000000` (+13) | UNCONFIRMED | 799 | 37.9 | Range~ | NEEDS_IDENTITY_REVIEW |
| 86 | ✅ | Renault Clio | HEV/MHEV | 67 | 2020 | `E2*2007/46*0676*05` · `BH2` · `MU4UA0FA5000` (+26) | UNCONFIRMED | 1432 | 37.8 | — | NEEDS_IDENTITY_REVIEW |
| 87 |  | Renault Clio | HEV/MHEV | 69 | 2024, 2025 | `E2*2007/46*0676*28` · `BH2` · `N84WA3VA530B` (+22) | UNCONFIRMED | 3955 | 37.6 | — | NEEDS_IDENTITY_REVIEW |
| 88 |  | Tesla Model 3 | BEV | 208 | 2022 | `E4*2007/46*1293*25` · `E6LR` · `BQB1S5N` (+16) | UNCONFIRMED | 671 | 37.5 | Range~ | NEEDS_IDENTITY_REVIEW |
| 89 |  | Mercedes-Benz Clase A | HEV/MHEV | 100 | 2025 | `E1*2007/46*1829*24` · `X24JT2` · `FZAA451A` (+24) | UNCONFIRMED | 3653 | 37.4 | — | NEEDS_IDENTITY_REVIEW |
| 90 |  | Volkswagen Golf | BEV | 85 | 2020, 2022 | `E1*2007/46*0623*41` · `GAC4EBSAX0` · `FA1FA1MD001E0GAON1ML1BVR0NA` (+7) | UNCONFIRMED | 574 | 37.2 | Range~ | NEEDS_IDENTITY_REVIEW |
| 91 |  | BMW X3 | HEV/MHEV | 110 | 2022 | `E1*2007/46*1797*13` · `55BZ` · `IAV500L0` (+30) | UNCONFIRMED | 514 | 37.1 | — | NEEDS_IDENTITY_REVIEW |
| 92 |  | Tesla Model Y | BEV | 393 | 2022 | `E4*2007/46*1293*25` · `Y5LD` · `PZP4S5T3` (+18) | UNCONFIRMED | 539 | 37 | Range~ | NEEDS_IDENTITY_REVIEW |
| 93 |  | Tesla Model Y | BEV | 255 | 2025 | `E4*2007/46*1293*43` · `Y5LR` · `BLB3S5T3X` (+10) | UNCONFIRMED | 1932 | 35.8 | Range~ | NEEDS_IDENTITY_REVIEW |
| 94 |  | Kia Niro | BEV | 150 | 2022, 2024, 2025 | `E9*2018/858*11241*01` · `C5E11` · `E11BY1` (+3) | UNCONFIRMED | 1926 | 35.8 | Range~ | NEEDS_IDENTITY_REVIEW |
| 95 |  | BMW X3 | BEV | — | 2022 | `E1*2007/46*2130*02` · `41DU` · `0AW5000S` (+3) | UNCONFIRMED | 185 | 34.7 | Range~ | NEEDS_IDENTITY_REVIEW |
| 96 |  | Peugeot 3008 | BEV | 104 | 2024, 2025 | `E2*2018/858*00064*02` · `C` · `ZKZX-A0E000` (+11) | UNCONFIRMED | 670 | 33.5 | Range~ | NEEDS_IDENTITY_REVIEW |
| 97 |  | Peugeot 208 | BEV | 62 | 2025 | `E2*2007/46*0639*35` · `H` · `ZKWZ-K0R000` (+11) | UNCONFIRMED | 554 | 33.1 | Range~ | NEEDS_IDENTITY_REVIEW |
| 98 |  | Renault Mégane | BEV | 96 | 2024, 2025 | `E2*2018/858*00018*09` · `BE2` · `J2EEA5F000B0` (+11) | UNCONFIRMED | 268 | 32.8 | Range~ | NEEDS_IDENTITY_REVIEW |
| 99 |  | Tesla Model 3 | BEV | 361 | 2020 | `E4*2007/46*1293*07` · `E3D` · `BB1N` (+2) | UNCONFIRMED | 198 | 32 | — | NEEDS_IDENTITY_REVIEW |
| 100 |  | BMW X3 | BEV | 80 | 2024, 2025 | `E1*2007/46*2130*07` · `41DU` · `0AW5000B` (+5) | UNCONFIRMED | 128 | 29.9 | Range~ | NEEDS_IDENTITY_REVIEW |

Las filas 1 y 3 (Golf 2018, `*35` y `*33`) **ya existen en el catálogo** (Dataset Core): no se re-curan ni se modifican sin una migración explícita.

## 5. Piloto D2 — 20 candidatos

Selección determinista (`selectPilot`): identidades más cercanas a EXACT primero; cada powertrain y periodo presentes si existen; máximo 2 por familia; ≥ 1.000 matriculaciones ES salvo EXACT; nunca una variant que ya está en el catálogo. Marcados con ✅ en la tabla.

| # | Familia | Powertrain | Por qué |
|---|---|---|---|
| 2, 4 | BYD SEAL (2) | BEV | identidad **EXACT** (código IDAE = Va/Ve); faltan precio, dimensiones, maletero, carga, garantía |
| 5, 9 | Kia Sportage (2) | ICE/MHEV | 2022 y 2016/2018: misma familia nueva vs usada |
| 6, 86 | Renault Clio (2) | ICE/MHEV · HEV/MHEV | volumen alto (14.288) + E-Tech |
| 7 | Nissan Qashqai | MHEV (indicado) | 22.196 matriculaciones; MHEV por confirmar |
| 8 | Hyundai Tucson | ICE/MHEV | 2018/2020: usado relevante |
| 20, 57 | Peugeot 3008 (2) | ICE/MHEV · PHEV | |
| 22 | Peugeot 208 | ICE/MHEV | |
| 24 | Dacia Sandero | ICE/MHEV | 42.394 matriculaciones (2025 provisional) |
| 26 | Peugeot 308 | ICE/MHEV | |
| 27, 48 | Toyota Yaris (2) | ICE/MHEV · HEV/MHEV | 33.762 matriculaciones del híbrido |
| 28, 53 | Mercedes-Benz Clase A (2) | ICE/MHEV · PHEV | premium |
| 56 | Toyota Corolla | HEV/MHEV | |
| 73 | Toyota RAV4 | PHEV | |
| 81 | Tesla Model Y | BEV | |

Ninguno está listo para importar hoy (§1). Ver el plan en [SPAIN_DATASET_IMPORT_PLAN_V0_1](SPAIN_DATASET_IMPORT_PLAN_V0_1.md).
