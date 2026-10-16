# VScar — RDW ↔ EEA Identity Match v0.1 (Step D1.1)

> Estado: **v0.1 · 2026-10-16** · Reglas: [ADR-007](../adr/ADR-007-reference-vs-used-instance.md), [ADR-009](../adr/ADR-009-data-provider-rights.md) (D1 cross-market), [HOMOLOGATION_MATCH_REPORT](HOMOLOGATION_MATCH_REPORT.md) · Código: `packages/data-connectors/src/rdw/match.ts`, `map.ts` · Resultados: [`d11/pilot-results.json`](d11/pilot-results.json), [`d11/expansion.json`](d11/expansion.json)

## 1. Normalización real de identificadores (observada)

| Componente | EEA | RDW | Regla |
|---|---|---|---|
| TAN | `E1*2007/46*0623*33` (mayúsculas en años recientes, `e1*` en otros) | `e1*2007/46*0623*33` (minúsculas) | mayúsculas, sin espacios; **la extensión `*NN` nunca se quita** |
| Serie corta | — | `e13*KS18/858*00023*01` | es **otra homologación** aunque comparta Va/Ve |
| Va | `GAC4DACAX0`, `AXAP54(N)` | ídem (paréntesis incluidos) | mayúsculas; sin quitar caracteres |
| Ve | `FM6FM6AJ015N7MVON1ML79VR2N` | ídem | mayúsculas |
| Revisión | — | `volgnummerrevisieuitvoering` (0, 1…) | todas se conservan; distintas → conflicto |
| Validez | `Dr` = fecha de matriculación | `begindatum/einddatumrevisieuitvoering` | validez de la revisión (no de la matriculación) |

Observaciones que obligan a usar la clave completa:
- La misma Ve aparece bajo **varias extensiones** del TAN (`*29`…`*39` del Golf) y bajo **varias variantes** (Golf `GAC2` 3 puertas / `GAC4` 5 puertas, con masas distintas: 1.280 vs 1.301 kg).
- La misma Ve aparece en **modelos distintos** del mismo fabricante (`1NXE5E001NL1`: BYD SEAL `SE2D1C` y otro modelo `M2F1C`).
- La misma Va/Ve aparece bajo **otro Estado emisor** (Toyota `e6*` y `e13*`) y bajo **serie corta** (`KS18`).

## 2. Niveles de coincidencia

| Nivel | Condición | Estado de identidad técnica | ¿Se usan los valores? |
|---|---|---|---|
| `EXACT` | TAN completo + Va + Ve | EXACT (cross-market, `homologation_match = EXACT`, `CROSS_MARKET_EXACT_HOMOLOGATION`) | ✅ (todas las revisiones) |
| `TAN_EXTENSION_MISMATCH` | misma Va/Ve bajo otra extensión del mismo TAN base | PARTIAL | ❌ (una revisión del TAN no es equivalente por defecto) |
| `VARIANT_MISMATCH` | mismo TAN y Ve con otra Va | UNCONFIRMED | ❌ |
| `OTHER_APPROVAL` | misma Va/Ve bajo otra homologación (otro Estado o `KS`) | UNCONFIRMED | ❌ |
| `NONE` | nada | UNCONFIRMED | ❌ |

## 3. Qué confirma y qué no

- **Confirma la identidad técnica** del grupo EEA (es la misma homologación en dos registros oficiales) y permite usar datos técnicos homologados cross-market (regla D1 aprobada: EXACT → automático).
- **No confirma la identidad comercial**: RDW solo trae la denominación de **modelo** (`GOLF`, `MODEL 3`) y el tipo del fabricante (`AU`). La regla EXACT de VScar (un documento oficial que enlace la versión comercial/trim con TAN+Va+Ve) **no cambia** → las 4 identidades EXACT de D1 siguen siendo 4; ninguna UNCONFIRMED sube a EXACT.
- Las coincidencias de valores (dimensiones, masa) **nunca** promueven identidad.

## 4. Datos de mercado vs técnicos

| Tipo | Ejemplos | Tratamiento |
|---|---|---|
| Técnicos homologados | dimensiones, masas, plazas, potencia, WLTP, norma Euro, tracción, cilindrada | reutilizables en ES con `EXACT`, `source_market = NL` visible |
| Comerciales / de mercado | precio de catálogo, BPM, color, denominación local, matrícula, fechas de matriculación | **rechazados** (solo existen en el registro por matrícula, que no se usa) |
| Calculados en ES | etiqueta DGT | regla `dgt-label-v1` en España con la norma Euro de RDW como entrada (fuente S07, `CALCULATED`) |

## 5. Contraste EEA ↔ RDW (piloto, misma homologación EXACT)

Coherentes en los 9 EXACT (tolerancias: potencia ±1 kW, cilindrada ±5 cm³, masa ±10 kg, batalla ±5 mm, CO₂ WLTP ±2 g/km, consumo eléctrico ±0,3 kWh/100 km, autonomía ±5 km; solo donde ambas fuentes publican el dato y con el mismo ciclo): Golf `*33`/`*35`, Model 3, X3 xDrive30e, Tucson, RAV4 PHEV y Model Y. **Conflictos conservados (no resueltos)**:

| Candidato | Clave | EEA | RDW | Lectura |
|---|---|---|---|---|
| BYD SEAL #2 | `nrg.electric_combined_kwh100` | 16,6 | 15,9 (solo límite superior) | RDW pone 166 Wh/km en un campo "NEDC" anómalo y 159 en WLTP |
| BYD SEAL #2 | `rng.electric_combined_km` | 570 | 583 | ídem (570 en el campo "NEDC") |
| BYD SEAL #4 | `nrg.electric_combined_kwh100` | 18,2 | 17,4 | mismo patrón |
| BYD SEAL #4 | `rng.electric_combined_km` | 520 | 538 | mismo patrón |

Hipótesis a revisar por un humano (no aplicada): la EEA y el campo "NEDC" de RDW recogen el mismo valor declarado y el campo WLTP de RDW otro (p. ej. un extremo del rango de interpolación). Hasta resolverlo, la categoría Range del SEAL queda con conflicto.
