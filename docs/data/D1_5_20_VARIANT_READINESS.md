# VScar — D1.5 Preparación de las 20 candidatas D2

> Estado: **0 importables con las reglas aprobadas · 18 aptas para una base de curación técnica (propuesta ADR-019, no aprobada) · 0 seleccionables** · 2026-10-16 · Datos: [`d15/d2-readiness.json`](d15/d2-readiness.json), [`d15/first-batch-proposal.json`](d15/first-batch-proposal.json)

## 1. Matriz por campo (20)

| Campo | FOUND | MATCHED | IDENTITY_VERIFIED | RIGHTS_APPROVED | USABLE | Fuentes |
|---|---:|---:|---:|---:|---:|---|
| Generación | 8 | 3 | **0** | 0 | 0 | S15 (#9, #20), S16 (#2) |
| Carrocería | 9 | 5 | 4 | 0 | 0 | RDW/Traficom (D1.3) + externos |
| Transmisión | 12 | 11 | 11 | 0 | 0 | RDW BEV + Traficom (S13 pendiente) |
| Plazas · largo · ancho · alto | 19 | 19 | 19 | 0 | 0 | RDW (S11 pendiente) |
| Maletero | 9 | 3 | **0** | 0 | 0 | S15, S16, S17 |
| Potencia | 16 | 11 | 10 | 10 | **10** | EEA (ya en D1) |
| Par | 2 | 2 | 0 | 0 | 0 | S15 |
| 0–100 | 4 | 2 | **0** | 0 | 0 | S15, S17 |
| Vmax | 5 | 5 | 5 | 0 | 0 | RDW |
| Tracción | 4 | 3 | 0 | 0 | 0 | S15, S17 (RDW sin dato en la expansión) |
| Batería bruta / útil | 2 / 4 | 1 / 1 | 0 | 0 | 0 | S17 (#2); S16 sin base declarada |
| Carga AC / DC | 3 / 3 | 1 / 1 | 0 | 0 | 0 | S17, S19 |
| Autonomía eléctrica | 6 | 4 | 4 | 4 | **2** | EEA (#73, #81); BYD SEAL bloqueado por el conflicto conservado |
| Depósito | 2 | 2 | 0 | 0 | 0 | S15 |
| Garantía · precio | 0 | 0 | 0 | 0 | 0 | — |

Completitud crítica media: **54,6 % → 54,6 %** (utilizable). Sería 58,3 % si los valores de investigación fueran utilizables (no lo son). Valores nuevos compatibles con derechos: **0**.

## 2. Por candidata

| # | Candidata | S15 | S16 | S17 | S19 | Nivel | Bloqueos principales |
|---|---|---|---|---|---|---|---|
| 2 | BYD SEAL 2025 BEV | — | STRONG | WEAK | AMBIG. | RESEARCH | duplicado probable de DC-08 (reconciliar) |
| 4 | BYD SEAL 2024/25 BEV | — | REJECTED | AMBIG. | AMBIG. | CURATED_TECHNICAL_PROPOSED | conflicto autonomía/consumo conservado; generación; año-modelo |
| 5 | Kia Sportage 2022 | — | — | — | — | CURATED_TECHNICAL_PROPOSED | generación, año-modelo, acabado, maletero, 0–100, precio, garantía |
| 6 | Renault Clio 2024/25 | — | — | — | — | CURATED_TECHNICAL_PROPOSED | ídem |
| 7 | Nissan Qashqai MHEV | — | WEAK (MODEL) | — | — | CURATED_TECHNICAL_PROPOSED | ídem |
| 8 | Hyundai Tucson 2018/20 | — | — | — | — | CURATED_TECHNICAL_PROPOSED | ídem |
| 9 | Kia Sportage 2016/18 | **STRONG** | — | — | — | CURATED_TECHNICAL_PROPOSED | maletero y 0–100 solo de S15 (❌) |
| 20 | Peugeot 3008 2018/20 | WEAK | — | — | — | CURATED_TECHNICAL_PROPOSED | generación (restyling) no cubre 2020 |
| 22 | Peugeot 208 2022 | — | — | — | — | RESEARCH | RDW no corrobora la extensión del TAN |
| 24 | Dacia Sandero 2025 | — | AMBIG. (MODEL) | — | — | CURATED_TECHNICAL_PROPOSED | fila bi-fuel |
| 26 | Peugeot 308 2024 | — | — | — | — | CURATED_TECHNICAL_PROPOSED | acabado EXACT (D1.2); faltan generación/año-modelo/datos |
| 27 | Toyota Yaris 2022/24 | — | — | — | — | CURATED_TECHNICAL_PROPOSED | |
| 28 | Mercedes Clase A 2022/24 | — | — | — | — | CURATED_TECHNICAL_PROPOSED | |
| 48 | Toyota Yaris HEV | — | WEAK (MODEL) | — | — | CURATED_TECHNICAL_PROPOSED | |
| 53 | Mercedes Clase A PHEV | — | — | — | — | CURATED_TECHNICAL_PROPOSED | |
| 56 | Toyota Corolla HEV | — | AMBIG. | — | — | CURATED_TECHNICAL_PROPOSED | hatchback/Touring |
| 57 | Peugeot 3008 PHEV | — | — | — | — | CURATED_TECHNICAL_PROPOSED | |
| 73 | Toyota RAV4 PHEV | — | WEAK (MODEL) | — | — | CURATED_TECHNICAL_PROPOSED | |
| 81 | Tesla Model Y 2022 | — | REJECTED | — | AMBIG. | CURATED_TECHNICAL_PROPOSED | |
| 86 | Renault Clio HEV 2020 | — | — | — | — | CURATED_TECHNICAL_PROPOSED | |

VehiclesDB confirma la nomenclatura y la disponibilidad ES de las 20.

## 3. Primer lote

| Canal | N | Motivo |
|---|---:|---|
| Importable con las reglas aprobadas (curación D1 / Catalog v0.2) | **0** | `generation_code` y `model_year` obligatorios sin fuente verificada; claves críticas y derechos pendientes |
| **Base de curación técnica** (si se aprueba ADR-019 en la variante de D1.4) | **18** | identidad técnica EXACT EEA+RDW, sin duplicado. Se excluyen #2 (duplicado de DC-08) y #22 (RDW no corrobora). Orden: completitud crítica utilizable 61,5 % (#5, #6, #8, #9, #20, #24, #26, #27, #28) → 53,8 % (#7, #48, #56, #86) → 50,0 % (#4, #53, #57, #73, #81) |
| PREVIEW | **0** | generación, año-modelo y acabado sin verificar; maletero, 0–100, precio y garantía ausentes |
| PUBLIC | **0** | además, derechos S11/S13 pendientes |

En esa base, los campos verificados de cada una del lote serían:
- potencia EEA (S01, condicional CC BY), o autonomía EEA en #73 y #81;
- dimensiones, plazas, Vmax y tracción RDW (S11, ❓);
- caja Traficom (S13, ❓);
- conflictos: solo #4 (BYD SEAL).

Ningún registro se crea para llegar a 20.

## 4. ADR-019 — reevaluación tras D1.5

| Pregunta | Respuesta medida |
|---|---|
| ¿Generaciones con correspondencia documentada? | **0** (20 y 100). S15 da ordinal + restyling, y S16 un nombre de generación; ambos solo por compatibilidad, sin enlace a TAN |
| ¿Años-modelo confirmados? | **0**. Ninguna fuente lo publica: EEA da matriculación, Traficom primera matriculación, S15 periodo de producción, S16 inicio de generación, OpenEV un "year" de listado |
| ¿Acabados desconocidos? | **17 / 20** (EXACT: #2, #4, #26, sin cambio) y 97 / 100 |
| ¿Qué se conserva sin inventar? | Por clave exacta: potencia, cilindrada, masa, batalla, CO₂, consumo y autonomía (EEA); dimensiones, plazas, Vmax, tracción, puertas y norma Euro (RDW); caja y carrocería (Traficom/RDW, parcial). Todo con procedencia y conflictos conservados |
| ¿Qué campos bloquean el esquema sin ser necesarios para todas las comparaciones? | `generation_code`, `model_year` y `trim_name`: identifican la oferta comercial, pero las categorías Size/Performance/Economy/Range usan observaciones técnicas que ya existen por clave exacta |

**Propuesta definitiva** (para decisión humana; no implementada; esquema MySQL sin cambios):

```
Curación técnica permitida  ≠  Publicación seleccionable permitida
```

1. **Research Dataset**: S15–S19 y catálogos. Valores en `data/research/`, con estado de coincidencia; nunca en el selector.
2. **Curated Technical Dataset**:
   - entrada: clave TAN + Va + Ve exacta, corroborada por RDW y sin duplicado → 18/20 y 92/100;
   - contenido: observaciones oficiales con procedencia y conflictos;
   - `generation`, `model_year` y `trim` como **candidatos con estado** (UNCONFIRMED), nunca como valor;
   - no aparece en el selector.
3. **Selectable Catalog**: PREVIEW/PUBLIC con las exigencias actuales (generación, año-modelo, acabado, claves críticas y derechos) → 0/20 hoy.

Recomendación: **B** (aprobar la separación). El bloqueo de los **datos** del selector sigue siendo de derechos (**C**): maletero, 0–100, precio y garantía no tienen fuente utilizable.
