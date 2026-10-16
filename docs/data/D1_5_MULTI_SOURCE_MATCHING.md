# VScar — D1.5 Matching multi-fuente

> Estado: **medido · 0 identidades comerciales/generacionales verificadas** · 2026-10-16 · Código: [`multi-source.ts`](../../packages/curation/src/multi-source.ts) · Datos: [`d15/matching-100.json`](d15/matching-100.json) (sin valores de terceros) · Valores para revisión: `data/research/d15/matched-values.json` (fuera de Git)

## 1. Identidad

La clave técnica es y sigue siendo **TAN completo + Va + Ve** (EEA, corroborada por RDW).
- Ningún dataset abierto publica homologación, así que ninguna coincidencia pasa de `EXACT_DOCUMENTED_LINK`.
- No se fusiona por marca + modelo (+ año) ni se usa un id externo como identidad.

Estados (reutilizados de D1.4):

| Estado | Significado |
|---|---|
| `EXACT_DOCUMENTED_LINK` | EXACT_DOCUMENTED |
| `STRONG_COMPATIBLE_MATCH` | COMPATIBLE_STRONG |
| `WEAK_COMPATIBLE_MATCH` | COMPATIBLE_WEAK |
| `AMBIGUOUS` | varias opciones compatibles |
| `REJECTED` | contradicción con un hecho duro |
| `NOT_FOUND` | sin coincidencia |

## 2. Reglas por fuente (documentadas antes de implementar)

| Fuente | Unidad de registro | Reglas |
|---|---|---|
| S15 Opendatabay | motor + caja de una serie | **Familia y periodo:** nombres de familia en lista cerrada (`FAMILY_SOURCE_NAMES`); periodo `Year_from…Year_to` contra los años EEA ±1. **Compatibilidad (con tolerancias):** combustible; kW (columna kW o PS × 0,73549875) ±max(1,5 kW; 2 %), sin comparar en electrificados (base de potencia desconocida); cilindrada ±max(15 cm³; 1 %). **Contra RDW:** tracción; puertas (solo 3 frente a 5); longitud dentro de la envolvente ±15 mm; batalla ±15 mm. **Contra la caja evidenciada:** CVT no contradice "automático". **Estados:** STRONG exige una sola generación que cubra todos los años y kW/cc/longitud comprobados; varias generaciones o restylings → AMBIGUOUS |
| S16 autoseeker | modelo / generación / motorización representativa | Fila con varios combustibles → AMBIGUOUS (MODEL). Fila POWERTRAIN con PS → kW = `Ep` → STRONG (POWERTRAIN). Potencia distinta → REJECTED. Potencia no comparable (híbridos) o fila de generación → WEAK con valores a nivel MODEL. Un híbrido (NOVC_HEV) nunca casa con una fila de gasolina/diésel puro |
| S17 OpenEV | acabado × año | Solo BEV; año del registro dentro de [años EEA − 1, + 1]; tracción RDW; potencia EEA ±2 %; más de un acabado compatible → AMBIGUOUS |
| S19 Kilowatt | variante | Solo BEV; sin potencia; tracción solo si el nombre la dice; más de una variante → AMBIGUOUS; nunca STRONG |
| S18 VehiclesDB | nameplate | Solo taxonomía y disponibilidad ES; nunca valores técnicos |

## 3. Disponibilidad ≠ elegibilidad (por campo)

| Columna | Regla |
|---|---|
| **FOUND** | hay valor en un registro de la familia/periodo, del nivel que sea |
| **MATCHED** | valor único en una coincidencia STRONG/WEAK (o fuente oficial con clave exacta), con granularidad ≥ la mínima del campo: generación, carrocería, plazas, maletero y dimensiones = GENERATION (serie con carrocería); motor, prestaciones, caja y tracción = POWERTRAIN; AC/DC y autonomía = COMMERCIAL_TRIM; garantía y precio = TECHNICAL_VARIANT o mercado ES |
| **IDENTITY_VERIFIED** | solo fuente oficial con clave exacta (EEA S01, RDW S11, Traficom S13) |
| **RIGHTS_APPROVED** | la fuente es publicable según el registro de derechos (hoy solo S01, condicional CC BY) |
| **USABLE** | verificado ∧ derechos ∧ sin conflicto abierto |

**Conflictos**:
- Dos fuentes no oficiales que coinciden **no** verifican nada.
- Si discrepan, se abre `EXTERNAL_VS_EXTERNAL`.
- Un externo fuera del valor o la envolvente oficial abre `OFFICIAL_VS_EXTERNAL`.
- El conflicto RDW/EEA del BYD SEAL (D1.2) se conserva como `PRESERVED_OFFICIAL`.
- Nunca se promedian valores.

## 4. Resultado (20 · 100)

| Fuente | STRONG | WEAK | AMBIG. | REJ. | NOT_FOUND |
|---|---|---|---|---|---|
| S15 Opendatabay | 1 · 11 | 1 · 3 | 0 · 0 | 0 · 1 | 18 · 85 |
| S16 autoseeker | 1 · 2 | 3 · 12 | 2 · 8 | 2 · 10 | 12 · 68 |
| S17 OpenEV | 0 · 0 | 1 · 7 | 1 · 1 | 0 · 0 | 18 · 92 |
| S19 Kilowatt | 0 · 0 | 0 · 2 | 3 · 17 | 0 · 0 | 17 · 81 |
| S18 VehiclesDB (taxonomía) | 20/20 · 100/100 encontrados y disponibles en ES | | | | |

Conflictos en las 100:
- 7 `OFFICIAL_VS_EXTERNAL`:
  - anchura RDW frente a S15 (#10, #29);
  - velocidad máxima RDW frente a S15 (#25);
  - autonomía WLTP EEA frente a OpenEV (#32 Kona, #76 y #84 Model 3, #98 Mégane).
- 2 `PRESERVED_OFFICIAL` (#2 y #4 BYD SEAL).

## 5. Falsos positivos rechazados (ejemplos)

| Caso | Motivo del rechazo |
|---|---|
| #4 BYD SEAL AWD | autoseeker solo lista el Design RWD de 313 CV (230 kW ≠ 390 kW EEA) |
| #81 Model Y RWD 2022 | autoseeker lista Long Range AWD (378 CV) |
| Clio HEV (#86) | antes casaba con la fila "TCe 90" de gasolina; ya no casa (hibridación distinta) |
| Qashqai MHEV (#7) | la fila "J12 e-Power" es otra motorización (potencia de sistema no comparable): sus cifras quedan a nivel MODEL y no se aplican |
| S15 | filas con el mismo motor pero AWD, 3 puertas o fuera de la envolvente de longitud RDW → REJECTED o descartadas |
