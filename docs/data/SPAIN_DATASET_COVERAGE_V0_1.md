# VScar — Spain Dataset Coverage v0.1 (Step D1)

> Estado: **v0.1 · 2026-10-16** · Cifras: [`d1/d1-stats.json`](d1/d1-stats.json) (generado; no editar a mano) · Candidatos: [SPAIN_100_VARIANT_CANDIDATES_V0_1](SPAIN_100_VARIANT_CANDIDATES_V0_1.md) · Mapeo: [EEA_IDAE_SCHEMA_MAPPING_V0_1](EEA_IDAE_SCHEMA_MAPPING_V0_1.md)

## 1. Informe de cobertura (Step D1 §24)

| Indicador | Resultado |
|---|---:|
| Archivos oficiales localizados | 3 recursos (EEA: 7 tablas anuales consultadas vía discodata · IDAE: 1 CSV histórico + 1 PDF de guía) |
| Archivos descargados y verificados (SHA-256 + manifiesto) | **104** (1 CSV IDAE + 7 inventarios EEA + 96 respuestas de encuesta EEA) |
| Registros brutos examinados | **1.667.945** (1.561.322 filas EEA agregadas en servidor en 40.708 grupos + 106.623 filas IDAE); el inventario de columnas recorrió además 5.426.503 filas EEA ES (7 años) |
| Registros ES | EEA: 1.875.908 matriculaciones de las 25 familias en 6 años · IDAE: 58.830 filas M1 península/Baleares |
| Grupos técnicos candidatos | 20.062 grupos (año × TAN/Va/Ve) → 18.191 identidades técnicas → **1.907 clústeres** |
| Identidades EXACT | **5** (4 en la lista) |
| Identidades PARTIAL | **0** |
| Identidades AMBIGUOUS | **530** (15 en la lista) |
| Identidades UNCONFIRMED | 1.334 (81 en la lista) |
| Identidades CONFLICTED | 38 (excluidas de la lista) |
| Variantes prioritarias propuestas | **100** (piloto: 20) |
| Candidatas con datos críticos completos | **0** |
| Candidatas pendientes de derechos | **100** (S08 en todas; S02 en las 40 enlazadas a IDAE) |
| Candidatas PUBLIC elegibles | **0** |

## 2. Calidad de la lista (100)

| Dimensión | Resultado | Nota |
|---|---:|---|
| Completitud de claves críticas (media) | **17,6 %** | requisitos críticos (Catalog §8.1) presentes con datos EEA/IDAE |
| Precio | **0 / 100** | ni EEA ni IDAE publican precios → S08 |
| Consumo de energía (combustible o eléctrico) | **82 / 100** | `Fc` solo desde 2021–2022; históricos sin consumo EEA |
| Dimensiones + maletero | **0 / 100** | S08 / S10 |
| Autonomía BEV | **19 / 20** | `range_type` UNSPECIFIED → categoría Range PARTIAL |
| Consumo *charge-sustaining* PHEV | **0 / 10** | no se publica en ES (D1 de Step 2) → S08-EU con homologación EXACT |
| Enlazadas a una versión comercial IDAE | 40 / 100 | 4 por código oficial |
| Categorías activables solo con datos D1 | Range~ en 19 BEV | Economy exige precio; Size/Practicality/Performance/Charging/Warranty/Eco exigen S08/S07 |
| Elegibles PREVIEW tras importar solo datos D1 | 19 | solo BEV (Range parcial) |
| Elegibles PUBLIC | **0** | identidad no EXACT + derechos S08 pendientes + aprobación humana pendiente |

**Data readiness ≠ publication readiness**: las 4 EXACT tienen identidad resuelta y derechos EEA condicionados (CC BY), pero no son importables porque les faltan claves críticas (precio, dimensiones, maletero, carga, garantía…) que solo da el fabricante, y esos derechos (S08) siguen sin verificar.

## 3. Capacidad para comparaciones (casos de prueba)

Pares reales de la lista. "Hoy" = solo con datos D1 (EEA). Ninguno es una "comparación completa".

| Caso | Par (rango en la lista) | Comparable hoy | No comparable / falta |
|---|---|---|---|
| ICE vs ICE | Dacia Sandero 2025 (#24) vs Renault Clio 2024/25 (#6) | CO₂ WLTP (112–113 vs 108–111 g/km), consumo (5,7 vs 4,1–4,2 L/100 km), potencia, masa | precio → **Economy NOT_AVAILABLE**; tamaño, maletero, 0–100, garantía |
| ICE vs HEV | Kia Sportage 2022 (#5) vs Sportage 2024/25 HEV/MHEV (#75) | CO₂ y consumo WLTP | potencia de sistema del HEV (EEA solo da térmica) → Performance; precio; si #75 es HEV o MHEV |
| HEV vs PHEV | Toyota Yaris HEV (#48) vs RAV4 PHEV (#73) | CO₂ WLTP, autonomía eléctrica (75 km, UNSPECIFIED) | **consumo CS del PHEV** → Economy/Range del PHEV no disponibles |
| BEV vs BEV | BYD SEAL 2025 (#2, EXACT) vs Tesla Model Y 2022 (#81) | consumo 16,6 vs 15,7 kWh/100 km; autonomía 570 vs 455 km (tipo sin declarar → PARTIAL) | precio, carga AC/DC, batería útil |
| ICE vs BEV | Sandero 2025 (#24) vs SEAL 2025 (#2) | consumo por energía (L vs kWh), CO₂ de escape | precio → coste de uso necesita energía + precio de compra para Economy |
| NEDC histórico vs WLTP moderno | Sportage 2016/2018 (#9, NEDC 119 g/km) vs Sportage 2022 (#5, WLTP 152–157) | potencia, cilindrada, masa | **CO₂ NOT_DIRECTLY_COMPARABLE** (ciclos distintos); consumo EEA inexistente en 2018 |
| NEW vs USED | Tucson 2024/25 (#52) vs Tucson 2018/2020 (#8) | potencia, masa; CO₂ solo como dato de cada ciclo | ciclos distintos; precio de lista del nuevo (S08); el usado aporta precio/km del usuario |
| USED vs USED | Tucson 2018/2020 (#8) vs Sportage 2016/2018 (#9) | mismo ciclo NEDC: CO₂ 119 vs 119 g/km, 85 kW, 1.685 cm³ | consumo (no hay `Fc` antes de 2021), precio de lista histórico |

Conclusión: con EEA/IDAE el catálogo puede **identificar** variantes y alimentar **energía/CO₂**; la comparación económica (que exige precio) y las de tamaño, practicidad, prestaciones, carga y garantía **dependen del fabricante (S08)**.

## 4. Cobertura histórica por fuente

| Periodo | EEA identidad (`TAN`) | EEA CO₂ | EEA consumo `Fc` | EEA potencia `Ep` | IDAE |
|---|---|---|---|---|---|
| 2010–2014 | **0 %** (2012) | `E` NEDC | — | 8 % | sí (texto libre) |
| 2015–2018 | 100 % | `E` NEDC (≤ 2016), `Enedc` (2018) | — | 10 % (2016) · 100 % (2018) | sí |
| 2019–2021 | 100 % | `Enedc` + `Ewltp` | — (2020) | 98 % | sí |
| 2022–2024 | 100 % | `Ewltp` | 91–92 % | 100 % | sí |
| 2025–2026 | 100 % (2025 provisional) | `Ewltp` | 85 % | 100 % | sí (hasta 2026-09) |

Estrategia D3 confirmada con datos: 2017–2026 alta · 2014–2016 selectiva · 2010–2013 oportunista (sin identidad EEA).

## 5. Rendimiento del procesamiento

| Medida | Valor |
|---|---|
| Adquisición (IDAE + 103 consultas EEA, 2 en paralelo) | **86 s**, pico de memoria 113 MB |
| Construcción de candidatos (offline, verificación SHA-256 de 104 brutos incluida) | **10–16 s**, pico 375–435 MB |
| Disco | brutos 45,2 MB (`data/raw`, fuera de Git) · todos los clústeres 20,1 MB (`data/curation`, fuera de Git) · Git: `docs/data/d1/` 1,5 MB |
| Técnicas | agregación en servidor (nunca el detalle por matriculación), CSV en streaming con perfil incremental, consultas acotadas por ES/año/marca/nombre, POST para consultas largas |

El fichero EEA completo de un año (todos los Estados, una fila por matriculación desde 2018) no se ha descargado: la muestra agregada de ES es suficiente para D1.
