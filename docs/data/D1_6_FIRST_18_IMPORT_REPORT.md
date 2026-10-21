# VScar — D1.6 Importación de los 18 primeros vehículos técnicos

> Estado: **18/18 curados en `vscar_dev` · idempotente · catálogo existente intacto · 0 seleccionables** · 2026-10-21 · Plan: [`d16/first-18-plan.json`](d16/first-18-plan.json) · Informe: [`d16/import-report.json`](d16/import-report.json)

## 1. Lote

Exactamente los 18 aprobados en [`d15/first-batch-proposal.json`](d15/first-batch-proposal.json): #5, 6, 8, 9, 20, 24, 26, 27, 28 · #7, 48, 56, 86 · #4, 53, 57, 73, 81. Excluidos sin sustitución: **#2** (probable duplicado de DC-08) y **#22** (RDW no corrobora la extensión del TAN).

## 2. Resultado

| Concepto | Valor |
|---|---:|
| Evaluados | 18 |
| Curados (`CURATED`) | **18** |
| Pendientes de evidencia | 0 |
| No importados / bloqueados | 0 |
| Duplicados rechazados | 0 en el lote (2 excluidos antes) |
| Observaciones técnicas | **279** (S01 EEA 104 · S11 RDW 175) |
| Utilizables · no utilizables | 267 · 12 |
| En conflicto (todos los valores conservados) | 12 en 4 vehículos: #4 BYD SEAL (consumo y autonomía EEA vs RDW, conflicto D1.2), #24 Sandero, #53 Clase A PHEV, #73 RAV4 PHEV |
| Atributos | **69** (52 técnicos, 17 comerciales) |
| Atributos técnicos | plazas 18 y puertas 18 (S11); caja 9 (8 S13 + 1 S11); marchas 2; tracción 2; carrocería 3 (2 S13 + 1 S11) |
| Atributos comerciales | designación oficial 15 (13 PARTIAL + 2 EXACT); acabado EXACT 2 (#26 S01, #4 S02) |
| Generación · año-modelo | **0 · 0** (ninguna fuente; no se inventan) |
| Identidad comercial | EXACT 2 (#4, #26) · PARTIAL 16 |

## 3. Por fuente y derechos

| Fuente | Uso | Derechos en el registro | En la capa técnica |
|---|---|---|---|
| S01 EEA | potencia, cilindrada, masa, batalla, CO₂, consumo, autonomía; designación y acabado (#26) | condicional (CC BY 4.0) | guardado, `CONDITIONAL` |
| S11 RDW | dimensiones (envolvente), masas, vmax, potencias, plazas, puertas, marchas, tracción, carrocería | **pendiente** | guardado, `PENDING` (solo interno) |
| S13 Traficom | caja de cambios (8), carrocería (2) | **pendiente** | guardado, `PENDING` (solo interno) |
| S02 IDAE | acabado de #4 (D1.2) | **pendiente** | guardado, `PENDING` (solo interno) |
| S14–S19 | — | ❓ / ❌ | **no entran** (investigación) |

## 4. Idempotencia y reanudación (MySQL `vscar_dev`)

| Ejecución | Importados | Omitidos sin cambios | Fallidos | Resultado |
|---|---:|---:|---:|---|
| 1ª con el plan inicial | 18 | 0 | 0 | 18 vehículos · 64 atributos · 275 observaciones |
| tras corregir el plan (RDW piloto para #4/#8/#73, como en D1.1) | 3 | 15 | 0 | solo se reescriben los 3 vehículos cambiados |
| 2ª ejecución inmediata | **0** | **18** | 0 | recuentos idénticos: **18 · 69 · 279** |

Catálogo seleccionable:
- `reference_variants`, `homologations`, `spec_values`, `vehicle_prices` y `safety_ratings` tienen la **misma huella SHA-256 antes y después**;
- **9** variantes antes y después, sin cambios inesperados.

Tests de integración MySQL ([`technical-curation.test.ts`](../../packages/db/test/technical-curation.test.ts)):
- round-trip;
- segunda ejecución idempotente;
- fallo a mitad de lote y reanudación;
- cambio de un elemento;
- rechazo de duplicado de TAN|Va|Ve;
- catálogo intacto;
- el lector del selector no ve la capa técnica;
- fuente existente no modificada.

## 5. Completitud crítica (misma función D1)

| Grupo | Completitud | Faltan |
|---|---:|---|
| ICE (9) | 53,8 % | maletero, 0–100, precio, depósito, garantía, etiqueta DGT |
| HEV/MHEV (4) | 46,2 % | + potencia máxima (la EEA da solo la térmica) |
| PHEV (3) | 43,8 % | + carga AC, consumo con batería descargada |
| BEV (2) | 42,9 % | + carga AC/DC |

D1.5 daba 54,6 % de media porque contaba la **etiqueta DGT**, un valor *calculado* por regla (S07). La capa técnica guarda solo **observaciones**; la etiqueta se calcula al promover.
