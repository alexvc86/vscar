# VScar — D1.3 Preparación del lote D2

> Estado: **0 / 20 importables · Ready for D2: NO** · 2026-10-16 · Datos: [`d13/d2-readiness.json`](d13/d2-readiness.json) · Criterios **sin cambios** (D1, Catalog v0.2, ADR-013); ADR-019 sigue **PROPOSED** y no se ha implementado

## 1. Clasificación

| Estado | N | Candidatas |
|---|---:|---|
| `READY_FOR_CURATED_IMPORT` | **0** | — |
| `DUPLICATE` | 1 | #2 BYD SEAL (probable duplicado de DC-08: reconciliar, no insertar) |
| `CONFLICTED` | 1 | #4 BYD SEAL (consumo/autonomía RDW vs EEA, UNRESOLVED) |
| `IDENTITY_PENDING` | 18 | resto: `generation_code` y `model_year` sin evidencia reutilizable (+ acabado en 15) |
| `DATA_PENDING` · `RIGHTS_PENDING` | (20) | todas, como bloqueo secundario: maletero, 0–100, precio, garantía · S11, S13 y S08 pendientes |

Ready for PREVIEW: **0** · Potencialmente PUBLIC: **0**.

## 2. Por candidata

| # | Candidata | Estado | Caja (fuente) | Carrocería | FI (vehículos) | Catálogos |
|---|---|---|---|---|---:|---|
| 2 | BYD SEAL 2025 BEV | DUPLICATE | 1 marcha (RDW) | sedán (RDW AA) | 16 | km77 COMPATIBLE |
| 4 | BYD SEAL 2024/25 BEV | CONFLICTED | 1 marcha (RDW) | sedán (RDW AA) | 232 | — |
| 5 | Kia Sportage 2022 | IDENTITY_PENDING | manual (S13) | AF ✗ | 24 | cn/km77 AMBIGUOUS |
| 6 | Renault Clio 2024/25 | IDENTITY_PENDING | — | — | 0 | — |
| 7 | Nissan Qashqai MHEV | IDENTITY_PENDING | manual (S13) | AF ✗ | 24 | — |
| 8 | Hyundai Tucson 2018/20 | IDENTITY_PENDING | manual (S13, n = 4) | AF ✗ | 4 | cn COMPATIBLE · km77 REJECTED |
| 9 | Kia Sportage 2016/18 | IDENTITY_PENDING | manual (S13) | AF ✗ | 90 | — |
| 20 | Peugeot 3008 2018/20 | IDENTITY_PENDING | — | — | 0 | — |
| 22 | Peugeot 208 2022 | IDENTITY_PENDING | — | — | 0 | cn/km77 COMPATIBLE |
| 24 | Dacia Sandero 2025 | IDENTITY_PENDING | — | — | 0 | — |
| 26 | Peugeot 308 2024 | IDENTITY_PENDING | — | — | 0 | km77 AMBIGUOUS ×2 |
| 27 | Toyota Yaris 2022/24 | IDENTITY_PENDING | — | — | 0 | — |
| 28 | Mercedes A 200 d | IDENTITY_PENDING | automático (S13, n = 1) | AC ✗ | 1 | km77 COMPATIBLE · cn AMBIGUOUS |
| 48 | Toyota Yaris HEV | IDENTITY_PENDING | código 3 sin mapear | hatchback (S13 AB) | 2.979 | cn/km77 AMBIGUOUS |
| 53 | Mercedes Clase A PHEV | IDENTITY_PENDING | automático (S13) | AC ✗ | 45 | — |
| 56 | Toyota Corolla HEV | IDENTITY_PENDING | — | — | 0 | — |
| 57 | Peugeot 3008 PHEV | IDENTITY_PENDING | automático (S13) | AF ✗ | 40 | cn/km77 COMPATIBLE |
| 73 | Toyota RAV4 PHEV | IDENTITY_PENDING | códigos 3/6 discrepan | AC ✗ | 1.171 | — |
| 81 | Tesla Model Y 2022 BEV | IDENTITY_PENDING | 1 marcha (RDW) | AF ✗ | 51 | cn/km77 REJECTED |
| 86 | Renault Clio HEV 2020 | IDENTITY_PENDING | automático (S13, n = 2) | hatchback (S13 AB) | 2 | — |

✗ = código UE presente pero ambiguo (AC/AF), no se mapea.

## 3. Antes / después (cobertura informativa ≠ cobertura utilizable)

| Campo | D1.2 (utilizable) | D1.3 utilizable (evidencia con licencia abierta, derechos ❓) | D1.3 informativa (presente en fichas vistas, sin derechos) |
|---|---:|---:|---:|
| Generación | 0 / 20 | **0 / 20** | 0 / 9 (solo años/periodos) |
| Año-modelo | 0 / 20 | **0 / 20** | 0 / 9 |
| Acabado | 3 / 20 | **3 / 20** | 9 / 9 etiquetas (no vinculables a TAN) |
| Carrocería | 2 / 20 | **4 / 20** | presente en las 4 fichas vistas |
| Caja de cambios | 3 / 20 (BEV) | **11 / 20** (3 de ellas con n ≤ 4) | presente en las fichas vistas |
| Maletero | 0 / 20 | **0 / 20** | 4 fichas vistas |
| 0–100 | 0 / 20 | **0 / 20** | 4 fichas vistas |
| Batería (BEV/PHEV/HEV) | RDW parcial | sin cambio | km77/cn en fichas vistas |
| Carga AC/DC | 0 / 20 | **0 / 20** | km77 (BYD SEAL, Model Y) |
| Precio histórico | 0 / 20 | **0 / 20** | tarifa en km77/cn (no es precio de anuncio) |
| Garantía | 0 / 20 | **0 / 20** | coches.net (Yaris, Model Y) |

Completitud crítica media del lote: **54,6 % → 54,6 %**. Traficom aporta campos de **identidad** (caja, carrocería), no claves críticas de dato; los catálogos no aportan nada utilizable.

## 4. Primer lote viable (condiciones, sin rebajar gates)

Las candidatas más cercanas a PREVIEW son #22 208, #57 3008 PHEV, #28 A 200 d y #8 Tucson (catálogo COMPATIBLE + caja evidenciada en 3 de ellas). Les falta, en todos los casos: generación y año-modelo con fuente, maletero, 0–100, precio y garantía con derechos, y la aprobación de S11/S13.

## 5. ADR-019 — recomendación: **C**

| Opción | ¿Aplica? |
|---|---|
| A. suficientes identidades comerciales exactas | **no**: 0 CONFIRMED; ningún catálogo publica la homologación |
| B. motor, generación y periodo sin vínculo TAN↔acabado | **parcial**: hay motor y periodo, pero **no generación**; y aun así faltarían los datos (maletero, 0–100, precio) |
| **C. la información existe, pero la licencia no permite integrarla** | **sí**: coches.net, km77 (y JATO tras ellos) tienen acabado, periodo, maletero, 0–100, batería, carga, tarifa y garantía; sus términos prohíben la reutilización |

Razón: el bloqueo vinculante es de **derechos**, no de identidad. Aprobar ADR-019 hoy no haría importable ninguna candidata (siguen faltando claves críticas y generación/año-modelo). ADR-019 sigue siendo útil **después**: ni con licencia una ficha muestra TAN, así que la relación TAN↔acabado seguirá siendo COMPATIBLE salvo que JATO aporte el vínculo de homologación. Mantener PROPOSED y decidirlo junto a la respuesta del RFI.

## 6. Siguiente acción recomendada

1. Revisión humana: enviar el RFI a JATO ([D1_3_JATO_ACCESS_AND_LICENSING](D1_3_JATO_ACCESS_AND_LICENSING.md) §4) y, en paralelo, solicitar autorización escrita a 2–3 fabricantes del lote.
2. Aprobar (o no) S11 RDW y S13 Traficom en la matriz (expedientes listos).
3. Decidir la propuesta de precio de compra `USER_PROVIDED` para nuevos (sin cambiar Economic Fit).
4. Con respuesta de licencia: decidir ADR-019 y repetir la medición sobre los 20.
