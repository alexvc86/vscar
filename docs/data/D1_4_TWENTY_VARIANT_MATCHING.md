# VScar — D1.4 Matching de las 20 candidatas D2 con gor3a (S14)

> Estado: **medido · 0 identidades verificadas · 0 valores reutilizables** · 2026-10-16 · Código: [`packages/curation/src/open-dataset-match.ts`](../../packages/curation/src/open-dataset-match.ts) · Datos: [`d14/matching-100.json`](d14/matching-100.json) (sin valores) · Valores para revisión: `data/research/d14/gor3a-matched-values.json` (fuera de Git)

## 1. Niveles de identidad

| Nivel | Qué es | ¿Alcanzable con S14? |
|---|---|---|
| L1 `MODEL_GENERATION` | familia + "generación" del dataset cuyo intervalo cubre el año de matriculación EEA (±1) | sí |
| L2 `ENGINE_CONFIGURATION` | L1 + motor compatible sin contradicción con EEA/RDW/Traficom | sí |
| L3 `HOMOLOGATION` | TAN completo + Va + Ve | **no** (el dataset no lo publica) |

Ningún valor de nivel 1–2 se asigna a la ReferenceVariant. La clave técnica EEA/RDW no se sustituye ni se modifica (test).

## 2. Reglas (documentadas antes de implementar)

1. **Familia → modelos** del dataset: lista cerrada (`GOR3A_FAMILY_MODELS`); un modelo distinto (Yaris Cross, Corolla Cross, BYD Sealion 7) no entra.
2. **Ventana de años**: la generación cuyo `[yearStart, yearEnd]` corta `[min(años EEA) − 1, max(años EEA)]`.
3. **Compatibilidad de motor** (solo por contradicción; la ausencia no confirma):
   - combustible y tren motriz (lista cerrada);
   - kW **explícito** ±max(1,5 kW; 2 %). El "HP" del origen no se convierte, y la potencia de sistema de un híbrido no se compara con la `Ep` (térmica) de la EEA;
   - cilindrada ±max(15 cm³; 1 %).
4. **Hechos duros** (RDW exacto D1.1 · Traficom D1.3):
   - tracción;
   - puertas: solo 3 frente a 5. RDW cuenta el portón de forma irregular: Golf 5, RAV4 4;
   - caja: CVT no contradice "automático" pero sí "manual" y "1 marcha";
   - longitud dentro de la envolvente RDW ±15 mm;
   - batalla ±15 mm.
5. **Estados**:
   - `AMBIGUOUS`: más de una generación compatible.
   - `STRONG_COMPATIBLE_MATCH`: una sola generación que cubre **todos** los años de matriculación; kW explícito comparado; cilindrada comparada; longitud RDW comprobada; y ninguna extensión de homologación RDW anterior al inicio de la generación (−1 año).
   - `WEAK_COMPATIBLE_MATCH`: una sola generación, sin todas esas comprobaciones.
   - `REJECTED`: había filas con el mismo combustible/kW/cilindrada, pero un hecho duro las contradice (falso positivo evitado).
   - `NOT_FOUND`: no existe el modelo, la generación o el motor.
   - `EXACT_DOCUMENTED_LINK`: exige L3, así que es imposible con S14 (validador).

## 3. Resultado por candidata

| # | Candidata | Estado | Nivel | Generación(es) compatible(s) del dataset | Campos encontrados (1 = un solo valor) | Motivo |
|---|---|---|---|---|---|---|
| 2 | BYD SEAL 2025 BEV | NOT_FOUND | — | — | — | modelo ausente (solo Sealion 7) |
| 4 | BYD SEAL 2024/25 BEV | NOT_FOUND | — | — | — | ídem |
| 5 | Kia Sportage 2022 | NOT_FOUND | L1 | — | — | 12 motores en 3 generaciones; ninguno 110 kW/1.598 cm³ |
| 6 | Renault Clio 2024/25 | WEAK | L2 | Clio 5 Doors (2023) | caja | sin dimensiones en la fila |
| 7 | Nissan Qashqai MHEV | **STRONG** | L2 | Qashqai (2024) | caja, maletero, 0–100, vmax, dimensiones | todo comprobado |
| 8 | Hyundai Tucson 2018/20 | WEAK | L2 | ix35 / Tucson (2016) | caja, maletero, 0–100, vmax, dims | la generación (2016–2018) no cubre 2020 |
| 9 | Kia Sportage 2016/18 | AMBIGUOUS | L2 | Sportage (2015) · Sportage (2018) | (filas idénticas en ambas) | transición/restyling |
| 20 | Peugeot 3008 2018/20 | WEAK | L2 | 3008 (2020) | caja, maletero, 0–100, vmax, dims | la generación (2020–) no cubre 2018: el motor solo figura en la entrada restyling |
| 22 | Peugeot 208 2022 | WEAK | L2 | 208 5 doors (2019) | caja, maletero, 0–100, vmax, dims | sin RDW exacto (D1.1: extensión distinta) |
| 24 | Dacia Sandero 2025 | AMBIGUOUS | L2 | Sandero (2020) · Sandero Stepway (2020) | maletero | dos carrocerías |
| 26 | Peugeot 308 2024 | WEAK | L2 | 308 5 Doors (2021) | caja, maletero, dims | kW no explícito |
| 27 | Toyota Yaris 2022/24 | NOT_FOUND | L1 | — | — | 92 kW / 1.490 cm³ gasolina no figura |
| 28 | Mercedes Clase A 2022/24 | **REJECTED** | L1 | — | — | 2 filas de igual motor contradicen longitud y caja (carrocería sedán, cambio) |
| 48 | Toyota Yaris HEV | **STRONG** | L2 | Yaris 5 Doors (2019) | 0–100, vmax, dims; caja = CVT (sin mapear) | todo comprobado |
| 53 | Mercedes Clase A PHEV | NOT_FOUND | L1 | — | — | motor no figura |
| 56 | Toyota Corolla HEV | WEAK | L2 | Corolla Sedan (2022) | 0–100 (2 valores) | potencia de sistema; el Touring compatible en motor se descartó por longitud |
| 57 | Peugeot 3008 PHEV | NOT_FOUND | L1 | — | — | motor no figura |
| 73 | Toyota RAV4 PHEV 2025 | **STRONG** | L2 | RAV4 5 Doors (2025) | caja (CVT), maletero, batería, dims | ⚠️ ver §4 |
| 81 | Tesla Model Y 2022 | NOT_FOUND | L1 | — | — | solo una fila AWD 150 kW en la ventana |
| 86 | Renault Clio HEV 2020 | WEAK | L2 | Clio 5 Doors (2019) | maletero, dims | caja nula, kW no explícito |

Resumen (20): STRONG 3 · WEAK 7 · AMBIGUOUS 2 · REJECTED 1 · NOT_FOUND 7. Con generación candidata (L1+) 18; motor compatible (L2) 12; una sola generación 10.

## 4. Falsos positivos y riesgos documentados

- **#73 RAV4 PHEV**: el único PHEV del dataset en la ventana está en la entrada "RAV4 5 Doors (2025)", porque el PHEV de la entrada 2018 está etiquetado `"Hybrid Gasoline"` (error del dataset). La concordancia de dimensiones con RDW no prueba la generación. STRONG significa "compatible", no "verificado".
- **#20 3008**: el motor 1.5 BlueHDi 130 solo figura en la entrada restyling (2020), aunque la clave tiene matriculaciones 2018 → rebajado a WEAK por la regla de años.
- **#28 Clase A**: 2 filas con el mismo motor se rechazan por longitud y caja (falso positivo evitado).
- **#56 Corolla**: la fila Touring compatible en motor se rechaza por longitud RDW; queda la berlina con potencia de sistema (WEAK).
- **Golf**: el 1.5 TSI 96 kW no figura en "Golf 5 Doors (2017)" → los Golf del catálogo no se pueden enlazar (ver [100](D1_4_100_VARIANT_COVERAGE.md)).

## 5. Contraste con RDW (campos compartidos, filas compatibles en motor, antes del filtro dimensional; 100 candidatas)

| Campo | Comparados | Concuerdan | Discrepan | Lectura |
|---|---:|---:|---:|---|
| longitud (envolvente ±15 mm) | 93 | 69 | 24 | restyling/carrocería distintos dentro de la misma "generación" |
| anchura | 92 | 72 | 20 | probable inclusión de retrovisores |
| altura | 91 | 74 | 17 | barras/llantas |
| batalla (±15 mm) | 88 | 72 | 16 | carrocerías (berlina/familiar) |
| velocidad máxima (±2 km/h) | 26 | 20 | 6 | |
| masa (unladen + 75 kg vs orden de marcha, ±40 kg) | 50 | 26 | 24 | definiciones distintas |

Los conflictos se conservan en el artefacto; nada se corrige ni se promueve.

## 6. Campos prioritarios (20)

| Campo | Baseline D1.3 | FOUND_IN_SOURCE | IDENTITY_VERIFIED | REUSABLE_IN_VSCAR |
|---|---:|---:|---:|---:|
| Generación | 0/20 | 18 con candidata (10 únicas) | **0** | **0** |
| Año-modelo | 0/20 | 0 (no existe en el dataset) | 0 | 0 |
| Acabado | 3/20 | 0 (no existe) | — | 3 (D1.2, sin cambio) |
| Carrocería | 4/20 | 7 (puertas o "Sedan" en el nombre) | 0 | 4 (D1.3, sin cambio) |
| Transmisión | 11/20 | 10 (2 CVT sin mapear) | 0 | 11 (D1.3, sin cambio) |
| Maletero | 0/20 | 9 (método no declarado) | 0 | **0** |
| 0–100 km/h | 0/20 | 7 (6 con un solo valor) | 0 | **0** |
| Batería útil | parcial | 1 (sin definir bruta/útil) | 0 | sin cambio |
| Carga AC / DC | 0/20 | 0 (solo "charging time") | 0 | 0 |
| Precio histórico reutilizable | 0/20 | 0 | 0 | 0 |
| Garantía reutilizable | 0/20 | 0 | 0 | 0 |
