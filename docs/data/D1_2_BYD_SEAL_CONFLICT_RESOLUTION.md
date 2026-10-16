# VScar — D1.2 BYD SEAL: conflicto de consumo/autonomía y duplicado DC-08

> Estado: **conflicto investigado · ABIERTO (UNRESOLVED)** · duplicado DC-08 **detectado y corregido en artefacto versionado** · 2026-10-16 · Datos: brutos D1 (EEA), D1.1 (RDW), IDAE (uso interno) · Corrección: [`d12/catalog-overlap-v1.json`](d12/catalog-overlap-v1.json)

## 1. Observaciones (sin promediar ni elegir)

Clave técnica: TAN `E13*2018/858*00639*NN` · Va `SE2R1C` · Ve `2NTE5F002NL1` (SEAL Design RWD) y Va `SE2D1C` · Ve `1NXE5E001NL1` (SEAL Excellence AWD).

| Fuente | Revisión / periodo | Campo (definición) | Design | Excellence AWD |
|---|---|---|---:|---:|
| EEA (S01) | TAN `*00` (2024 F, 2025 P), `*03` (2025 P), `*05` (2025 P) | `Z` "electric energy consumption" (Wh/km) · `Zr` "electric range" | 166 · 570 | 182 · 520 |
| IDAE (S02, interno) | fichas 2023-10 y 2025-06 | `Consumo_Electrico` · `Autonomia_electrica` | 16,6 · 570 | 18,2 · 520 |
| RDW (S11) | TAN `*00`…`*06` y serie corta `KS18*00023*00/01`, revisión 0 | `verbruikvolledigelekwltpbgr` ("bovengrens" del rango WLTP) · `actieradiusvolledigelekwltpbgr` | **159 · 583** | **174 · 538** |
| RDW (S11) | ídem | `elekverbruikgecombineerdnedc` · `elektrischeactieradiusnedc` (etiquetados NEDC) | 166 · 570 | 182 · 520 |

## 2. Verificación

| Comprobación | Resultado |
|---|---|
| TAN completo / extensión | mismos valores en **todas** las extensiones y en la homologación de serie corta → **no** es `DIFFERENT_APPROVAL_REVISION` |
| Variante / versión | exactas (Va/Ve idénticos en las tres fuentes) |
| Año / fecha | EEA 2024 F y 2025 P iguales; RDW revisiones desde 2023-09 iguales |
| Unidad | Wh/km en EEA y RDW; kWh/100 km en IDAE (÷ 10) — coherentes |
| Ciclo | homologación 2023+: solo WLTP posible; los campos "NEDC" de RDW contienen los valores declarados (anomalía de etiquetado ya tratada en D1.1) |
| Tipo de medición | RDW publica **solo un límite** ("bgr") del rango; EEA/IDAE publican el valor declarado por vehículo |
| Patrón | RDW es sistemáticamente ~4 % mejor en consumo y 2–3,5 % mejor en autonomía en **ambas** versiones |

## 3. Clasificación

| Conclusión posible | ¿Aplica? |
|---|---|
| `SAME_MEASUREMENT_CONFLICT` | no demostrado: los campos no tienen la misma definición (valor declarado vs límite de rango) |
| `DIFFERENT_APPROVAL_REVISION` | **descartado** (iguales en todas las revisiones) |
| `DIFFERENT_MEASUREMENT_BASIS` | **probable**: RDW parece publicar un extremo del rango de interpolación WLTP (vehículo "low"), y el valor declarado del CoC queda en su campo "NEDC"; el glosario RDW no lo define con claridad ("de hoogste van alle ondergrenzen" para la autonomía) |
| `SOURCE_ERROR` | parcial: el etiquetado "NEDC" de RDW es erróneo para estas homologaciones |
| **Estado** | **UNRESOLVED** — se mantiene el conflicto abierto; ningún valor se elige |

Tres fuentes (EEA, IDAE, campo "NEDC" de RDW) coinciden en 166/570 y 182/520, pero el número de fuentes no resuelve un conflicto cuando las definiciones difieren. **Propuesta para revisión humana** (no aplicada): mapeo RDW v2 en el que un límite único de consumo/autonomía WLTP BEV se registre como **límite del rango** (base de medida distinta) y no como valor del vehículo; así dejaría de competir con el valor declarado. Hasta decidirlo, la categoría Range del SEAL permanece con conflicto.

## 4. Duplicado DC-08

| Hecho | Detalle |
|---|---|
| Diagnóstico D1.1 | "el fixture guarda el TAN sin extensión" → **incorrecto**: DC-08 **no guarda TAN** (solo `variant_code`, `version_code` y `manufacturer_type_code` = `SE2R1C/2NTE5F002NL1`); el informe de Step 4c cita el TAN base `E13*2018/858*00639` en texto |
| Por qué D1 no lo detectó | comparaba `TAN|Va` exactos; sin TAN en el catálogo no podía coincidir |
| Estrategia canónica (D1.2, `catalogOverlap`) | clave = TAN completo + Va + Ve. `DUPLICATE` solo con la clave completa igual; `PROBABLE_DUPLICATE_TAN_INCOMPLETE` cuando el catálogo no tiene TAN completo (sin TAN o solo base) y coincide Va/Ve → **revisión humana, nunca fusión** (Va/Ve se repite entre modelos: `SE2D1C/1NXE5E001NL1` también aparece en filas IDAE de BYD HAN); `RELATED_OTHER_EXTENSION` = otra revisión, no duplicado; `CATALOG_PARTIAL_IDENTITY` = catálogo sin Ve |
| Resultado en los 100 | Golf 2018 `*33`/`*35` → `DUPLICATE` (ya marcados en D1) · **BYD SEAL #2 → `PROBABLE_DUPLICATE_TAN_INCOMPLETE` con DC-08** (nuevo) · Tesla Model 3 #88 → `CATALOG_PARTIAL_IDENTITY` con DC-07 |
| Artefactos D1 | **no modificados**; la corrección vive en `d12/catalog-overlap-v1.json` (versión 1, `supersedes` documentado) |
| D2 | #2 no se inserta como variant nueva: se **reconcilia** con DC-08 (completar TAN con extensión vía migración/curación explícita) |
| Regresión | `packages/curation/test/d12.test.ts` (sin TAN, TAN base, otra extensión, otra variante/versión/homologación, identidad parcial) |
