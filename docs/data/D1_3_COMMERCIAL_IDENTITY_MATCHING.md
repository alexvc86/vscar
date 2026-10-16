# VScar — D1.3 Correspondencia comercial ↔ técnica (catálogos)

> Estado: **clasificado · 0 CONFIRMED** · 2026-10-16 · Código: [`packages/curation/src/catalog-references.ts`](../../packages/curation/src/catalog-references.ts) · Artefacto: [`d13/catalog-references-v1.json`](d13/catalog-references-v1.json) (validado en [`d13/catalog-references-validation.json`](d13/catalog-references-validation.json))

## 1. Estados (alineados con `IdentityStatus`)

| Estado | Regla (validada en código) |
|---|---|
| `MATCH_CONFIRMED` (≈ EXACT) | la ficha publica TAN/Va/Ve y coincide con la clave exacta (`type_approval_ids` + base TAN obligatorios) |
| `MATCH_COMPATIBLE_UNCONFIRMED` | motor, potencia, combustible, carrocería y periodo compatibles; sin identificador técnico |
| `MATCH_AMBIGUOUS` | varias fichas compatibles con la misma clave (acabados, periodos) o una etiqueta no cuadra |
| `MATCH_REJECTED` | un dato de la ficha **contradice** la clave (tracción, potencia); debe citar el hecho |

Cada referencia guarda solo URL, fecha, método (`SEARCH_ENGINE` / `PAGE_VIEW`), campos presentes y estado; `valuesStored: false` y `rightsStatus: RESTRICTED` son literales del schema.

## 2. Resultado en el lote D2 (9 candidatas con búsqueda; 17 referencias + 2 del Golf de referencia)

| Mejor estado por candidata | Candidatas |
|---|---|
| CONFIRMED | **0** |
| COMPATIBLE_UNCONFIRMED | **5** — #2 BYD SEAL, #8 Tucson (cn), #22 208, #28 A 200 d (km77), #57 3008 PHEV |
| AMBIGUOUS | **3** — #5 Sportage (112 vs 110 kW), #26 308 (dos fichas), #48 Yaris (varios acabados) |
| REJECTED | **1** — #81 Model Y (fichas AWD; RDW: RWD) |
| sin búsqueda | 11 |

Rechazos útiles: #8 km77 "141 CV" contradice 85 kW EEA; #81 ambas fichas son AWD. Esto demuestra que una coincidencia de nombre ("Tucson 1.7 CRDi") **no** es una correspondencia.

## 3. Campos de identidad por separado (sin confundirlos)

| Campo | Evidencia reutilizable | Observación |
|---|---|---|
| `generation_code` | **0 / 20** | ningún catálogo publica código; km77 solo un año en la URL |
| `generation_label` | **0 / 20** | no se infiere ("Mk8", "P5"… no aparece en fuentes con derechos) |
| `model_year` | **0 / 20** | ninguna fuente; los periodos comerciales no son año-modelo |
| `registration_year` | EEA (año de matriculación) · Traficom (rango de **primera matriculación** FI, 74/100 claves) | ≠ año-modelo; Traficom es mercado FI |
| `commercial_start_date` / `commercial_end_date` | **0 / 20** utilizables | presentes en km77/coches.net (periodo/tarifa), sin derechos |

## 4. Traficom no es identidad comercial española

Los `kaupallinenNimi` de Traficom son nombres del mercado finlandés: se guardan en los agregados como contexto, **nunca** como acabado ES. Traficom aporta caja de cambios y carrocería (hechos técnicos de la clave exacta), no acabado.
