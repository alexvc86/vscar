# VScar — EEA + IDAE Schema Inventory & SpecKey Mapping v0.1 (Step D1)

> Estado: **v0.1 · 2026-10-16** · Inventarios reales: [`d1/eea-column-inventory.json`](d1/eea-column-inventory.json) · [`d1/idae-column-inventory.json`](d1/idae-column-inventory.json) · Código: `packages/data-connectors/src/eea/survey.ts`, `packages/data-connectors/src/idae/*` · Relacionado: [SPEC_KEY_CATALOG v0.2](SPEC_KEY_CATALOG.md) · [DATA_RIGHTS_MATRIX §4.1](DATA_RIGHTS_MATRIX.md) · [SPAIN_DATASET_SOURCES_V0_1](SPAIN_DATASET_SOURCES_V0_1.md)

Todo lo que sigue se ha comprobado sobre **ficheros y respuestas reales** (ninguna columna se ha mapeado por su nombre).

## 1. EEA (S01) — inventario por año, Estado miembro ES

Fuente: `discodata.eea.europa.eu` (SQL agregado en servidor). Una consulta de inventario por tabla: nulos, ceros, mínimos/máximos y cardinalidad de identificadores. Registro de tablas sin cambios (`EEA_REGISTRY_VERSION 2026-09-24`; sondeado el 2026-10-16: no existe `2025F` ni `2026P` todavía).

| Columna | 2012 | 2016 | 2018 | 2020 | 2022 | 2024 | 2025 P |
|---|---|---|---|---|---|---|---|
| filas | 6.510 | 16.517 | 1.379.682 | 919.334 | 851.105 | 1.056.889 | 1.196.466 |
| matriculaciones (`R`) | 569.427 | 1.185.296 | 1.379.682 | 919.334 | 851.105 | 1.056.889 | 1.196.466 |
| `TAN` | **0 %** | 100 % (1.495) | 100 % (1.798) | 100 % (2.362) | 100 % (2.596) | 100 % (1.810) | 100 % (2.080) |
| `T` (Type) | 99 % | 100 % | 100 % | 100 % | 100 % | 100 % | 100 % |
| `Va` | 98 % | 100 % | 100 % | 100 % | 100 % | 100 % | 100 % |
| `Ve` | 88 % | 100 % (5.902) | 100 % (6.879) | 100 % (9.799) | 100 % (8.638) | 100 % (7.073) | 100 % (7.048) |
| `Cn` | 100 % (527) | 100 % (833) | 100 % (913) | 97 % (956) | 100 % (3.231) | 100 % (1.854) | 100 % (1.886) |
| `Ec (cm3)` | 100 % | 100 % | 100 % | 96 % | 96 % | 94 % | 91 % |
| `Ep (KW)` | **8 %** | **10 %** | 100 % | 98 % | 100 % | 100 % | 100 % |
| `M (kg)` | 100 % | 100 % | 100 % | 100 % | 100 % | 100 % | 100 % |
| `Mt` | 0 % | 0 % | 22 % | 99 % | 99 % | 100 % | 100 % |
| `W (mm)` | 100 % | 100 % | 100 % | 98 % | 100 % | **0 %** | **0 %** |
| `E (g/km)` | 98 % | 100 % | 0 % | 0 % | 0 % | 0 % | 0 % |
| `Enedc (g/km)` | 0 % | 0 % | 100 % | 100 % | 7 % | 0 % | 0 % |
| `Ewltp (g/km)` | 0 % | 0 % | 22 % | 100 % | 100 % | 100 % | 100 % |
| `Z (Wh/km)` | 0 % | 1 % | 1 % | 3 % | 9 % | 11 % | 19 % |
| `Zr` | 0 % | 0 % | 0 % | 2 % | 9 % | 11 % | 19 % |
| `Fc` | 0 % | 0 % | 0 % | 0 % | 92 % | 91 % | 85 % |
| `Dr` (fecha de matriculación) | 0 % | 0 % | 0 % | 0 % | 100 % | 100 % | 100 % |
| `VFN` | 0 % | 0 % | 17 % | 99 % | 97 % | 100 % | 91 % |
| `Ech` / `RLFI` | — | — | — | — | — | 100 % / 69 % | 100 % / 80 % |

(% = filas con valor; entre paréntesis, valores distintos. `Z`/`Zr` solo existen en vehículos eléctricos o enchufables: su tasa refleja la cuota de BEV/PHEV, no un hueco.)

### 1.1 Schema drift confirmado

| Hallazgo | Años | Tratamiento |
|---|---|---|
| **Granularidad**: filas agregadas por versión (`R` > 1) hasta 2017; **una fila por matriculación** desde 2018 (≈ 1 M filas/año solo en ES) | 2010–2017 vs 2018+ | agregación siempre en servidor (`SUM(R)`, `MIN/MAX`); jamás se descarga el detalle |
| **CO₂ en `E (g/km)`** (NEDC) hasta 2016; `Enedc`/`Ewltp` desde 2017–2018 | 2010–2016 | la encuesta D1 lee `E`; el adapter v0.2 **no** lo lee → **propuesta de mapeo v3 para D2** |
| **Sin `TAN`** en 2012 (y `Ve` 88 %) | 2010–2014 | sin identidad técnica EEA → periodo 2010–2014 sin candidatos EXACT posibles vía EEA |
| **`Ep` casi vacío** en 2012–2016 (8–10 %) | 2010–2016 | la potencia de esos años no sale de la EEA; el enlace IDAE por potencia no funciona → más candidatos UNCONFIRMED |
| **`W` desaparece** en 2024–2025 | 2024+ | batalla solo hasta 2022 |
| **`Fc` solo desde 2021–2022** | ≤ 2020 | sin consumo de combustible EEA para históricos (sí CO₂) |
| `Cn` sin marca ("GOLF") hasta 2021 y con marca ("TOYOTA COROLLA") desde 2022–2024; BMW/Mercedes usan la denominación de motor ("X3 xDrive20d", "A 200 D"); Peugeot, texto comercial libre; Tesla 2019 `Cn` vacío | todos | familias por reglas explícitas (`packages/curation/src/families.ts`); Tesla por `T` (`3` = Model 3; `2` = Model S/X) |
| `Ft` en mayúsculas/minúsculas según el año (`PETROL`/`petrol`) | todos | normalización ya existente |
| `Ech`, `RLFI` nuevos | 2023+ | inventariados; sin mapeo (Ech = norma de emisiones abreviada, pendiente de definición oficial) |
| URL GET > ~8.000 caracteres → **HTTP 404** | — | el cliente usa POST por encima de 4.000 caracteres (mismos parámetros; corrección mínima en `client.ts`) |

### 1.2 Mapeo EEA → SpecKey (D1)

Se reutiliza el mapeo v2 del adapter (DATA_RIGHTS_MATRIX §4.1) sin cambios, más una propuesta:

| Campo | → SpecKey | Normalización | Base / ciclo | Confianza | Estado |
|---|---|---|---|---|---|
| `TAN`, `Va`, `Ve`, `T` | identidad técnica (`Homologation`) | mayúsculas; `TAN` base = sin extensión `*NN` | — | alta | v2 (+ `T`) |
| `Ewltp (g/km)` | `emi.co2_combined_gkm` | identidad | WLTP | alta | v2 |
| `Enedc (g/km)` | `emi.co2_combined_gkm` | identidad | NEDC; con `Ewltp` presente → UNDECLARED + inferido NEDC_CORRELATED | alta | v2 |
| **`E (g/km)`** | `emi.co2_combined_gkm` | identidad | NEDC (solo años sin `Enedc`/`Ewltp`) | media | **propuesta v3 (D2)** |
| `Ep (KW)` | ICE `perf.power_max_kw` (ICE_ONLY) · HEV/PHEV `perf.power_ice_kw` · BEV `perf.power_electric_kw` | identidad | nunca potencia de sistema en híbridos | alta | v2 |
| `Ec (cm3)` | `pt.displacement_cc` | identidad | — | alta | v2 |
| `M (kg)` / `Mt` | `dim.mass_kg` | rango MIN–MAX por versión | EU_RUNNING_ORDER / WLTP_TEST_MASS | alta | v2 |
| `W (mm)` | `dim.wheelbase_mm` | rango | — | alta | v2 |
| `Z (Wh/km)` | `nrg.electric_combined_kwh100` | ÷ 10 | UNDECLARED (inferido WLTP); BEV COMBINED, PHEV UNSPECIFIED | media | v2 |
| `Zr` | `rng.electric_combined_km` | identidad | `range_type` UNSPECIFIED | media | v2 |
| `Fc` | ICE/HEV `nrg.fuel_combined_l100` · PHEV `nrg.phev_weighted_fuel_l100` (nunca coste) | identidad | UNDECLARED | media | v2 |
| `Cn`, `Mk` | identidad comercial (no técnica) | — | — | — | metadato |
| `R`, `Dr`, `Year`, `Status` | matriculaciones, periodo, provisional | — | — | — | metadato |
| `VFN`, `Mp`, `Mh`, `Man`, `MMS`, `Ct`, `Cr`, `At1/At2`, `IT`, `Ernedc`, `Erwltp`, `De`, `Vf`, `Er`, `Ech`, `RLFI` | — | — | — | — | **UNMAPPED** (sin uso Alpha o definición sin verificar) |

## 2. IDAE (S02) — "Histórico de base de datos (CSV)"

Fichero `idae-historico-202609.csv` (edición 2026-09, `Last-Modified` 2026-09-28): **17.043.544 bytes, 106.623 filas, 20 columnas**, UTF-8, coma, punto decimal, fechas `dd/mm/aaaa`, 0 filas con anchura incorrecta. SHA-256 `cbfab8b7…77302`. Categorías: M1 62.394 · N1 38.964 · N2/N3 3.822 · L* 1.055 · M2/M3 316 · vacía 72. **Sin identificadores de homologación** (TAN/Va/Ve) salvo códigos impresos en el texto de algunas versiones.

| Source field | Type | Unit | Null | Zero | Distinct | Example | SpecKey target | Confidence | Notes |
|---|---|---|---:|---:|---:|---|---|---|---|
| `Fecha_alta` | date dd/mm/aaaa | — | 0 % | — | 1.438 | 07/10/2020 | metadato | alta | alta del registro, no homologación |
| `Fecha_actualizacion` | date | — | 0 % | — | 1.434 | 07/10/2020 | metadato | alta | 3 fechas 2027–2029 → issue |
| `Fecha_comercializacion` | date | — | 89,4 % | — | 414 | 24/10/2024 | metadato | media | 1970 y 2054 → issue |
| `Marca` | text | — | 0 % | — | 292 | Abarth | identidad | alta | distribuidores: "Volkswagen Turismos", "* Canarias", comerciales |
| `Modelo` | text | — | 0 % | — | 7.265 | 595 | identidad | media | texto libre; códigos de año-modelo |
| `Vehiculo` | text | — | 0,2 % | — | > 10.000 | ABARTH 595 1.4 16v T-JET 107 KW (145 CV) E6D | identidad comercial (versión) | media | pistas kW/CV, `(MYxx)`, y a veces `(Va/Ve)` |
| `Segmento` | text | — | 0 % | — | 24 | Minis | metadato | alta | no es `body_type` |
| `Motorizacion` | text | — | 0 % | — | 11 | Gasolina | `powertrain_type` (candidato) | alta | **MHEV no existe** (va dentro de Gasolina/Gasóleo o Híbridos) |
| `Categoria` | text | — | 0,1 % | — | 10 | M1 | filtro | alta | solo M1 |
| `MTMA` | integer | kg | 0 % | 0,4 % | 1.806 | 1045 | `dim.mass_kg` (GROSS_VEHICLE) | media | masa máxima admisible, nunca masa en orden de marcha |
| `Consumo_NEDC` | decimal | L/100 km | 46,1 % | 18,8 % | 1.176 | 7.3 | **UNMAPPED** | — | = `Consumo_Mixto_WLTP` en el 100 % de filas con dato |
| `Emisiones_NEDC` | decimal | g/km | 46,1 % | 18,7 % | 1.743 | 163.5 | **UNMAPPED** | — | coherente con **WLTP**, no NEDC (§2.1) |
| `Consumo_Mixto_WLTP_Min` | decimal | L/100 km | 46,1 % | 18,8 % | 805 | 7.2 | `nrg.fuel_combined_l100` (rango) | media | PHEV → `nrg.phev_weighted_fuel_l100` |
| `Consumo_Mixto_WLTP_Max` | decimal | L/100 km | 46,1 % | 18,8 % | 826 | 7.4 | ídem | media | 567 filas con min > max y 212 con valores > 30 L/100 km → descartadas |
| `Consumo_Mixto_WLTP` | decimal | L/100 km | 46,1 % | 18,8 % | 1.176 | 7.3 | **UNMAPPED** | — | **(Min+Max)/2 calculado por IDAE** en el 100 % |
| `Emisionies_CO2_Mixto_WLTP_Min` | integer | g/km | 14,0 % | 23,4 % | 327 | 151 | **UNMAPPED** | — | coherente con **NEDC**; en 2012 ya tenía datos (antes del WLTP) |
| `Emisionies_CO2_Mixto_WLTP_Max` | integer | g/km | 14,0 % | 23,4 % | 329 | 153 | **UNMAPPED** | — | ídem |
| `Autonomia_electrica` | integer | km | 2,9 % | 85,7 % | 901 | 253 | `rng.electric_combined_km` | media | `range_type` UNSPECIFIED; ciclo UNDECLARED |
| `Consumo_Electrico` | decimal | kWh/100 km (no declarada) | 29,0 % | 60,8 % | 824 | 18.1 | `nrg.electric_combined_kwh100` | media | máximo 5.000 → valores imposibles existen (plausibilidad) |
| `Observaciones` | mixed | — | 55,9 % | 35,0 % ("0") | 1.398 | Plataforma Aluminio Alto +-25 | metadato | baja | "0" = vacío |

**Cero ≠ dato**: en IDAE el 0 significa "no aplica/no informado" (BEV con consumo de combustible 0, ICE con autonomía 0). El normalizador lo convierte en ausencia, nunca en 0.

### 2.1 Contraste de semántica IDAE ↔ EEA (sobre pares enlazados)

Sobre 12.504 pares fila IDAE ↔ grupo técnico EEA enlazados (código oficial o valores; tolerancia ±3 g/km):

| Hipótesis | Coincide | No coincide con el ciclo contrario |
|---|---:|---:|
| `Emisiones_NEDC` es WLTP | **3.231** coinciden con `Ewltp` | solo 138 con NEDC |
| `Emisionies_CO2_Mixto_WLTP_Min/Max` son NEDC | **3.641** coinciden con NEDC/NEDC-correlated | solo 144 con `Ewltp` |
| Rango `Consumo_Mixto_WLTP_Min–Max` contiene el `Fc` EEA | 1.585 / 3.076 (51,5 %) | — |

Conclusión: **las etiquetas de CO₂ del CSV de IDAE están intercambiadas** en la mayoría de registros. Aun con esta evidencia, las columnas quedan **UNMAPPED** en v1: el ciclo correcto no es determinable fila a fila (hay excepciones) y la EEA ya aporta el CO₂ con ciclo explícito. Se comunicará al publicador (IDAE) como incidencia de calidad.

## 3. SpecKey alignment — resumen

| Clave crítica (Catalog v0.2 §8.1) | EEA | IDAE | Necesita |
|---|---|---|---|
| `nrg.fuel_combined_l100` | `Fc` (2021+) | rango WLTP | — |
| `nrg.fuel_charge_sustaining_l100` (PHEV) | — | — | S08 / S08-EU |
| `nrg.electric_combined_kwh100` | `Z` | `Consumo_Electrico` | — |
| `rng.electric_combined_km` | `Zr` (tipo UNSPECIFIED) | `Autonomia_electrica` | — (PARTIAL) |
| `emi.co2_combined_gkm` | `Ewltp`/`Enedc`/`E` | (UNMAPPED) | — |
| `emi.dgt_label_es` | — (`Ech` 2023+ sin definición) | — | S07 (regla) + norma Euro (S08) |
| `perf.power_max_kw` + `perf.accel_0_100_s` | potencia (ICE) | pistas de texto | 0–100 → S08 |
| `dim.length/width/height_mm`, `cap.boot_l`, plazas | — | — | S08 / S10 |
| `pt.fuel_tank_l` | — | — | S08 |
| `chg.ac_max_kw`, `chg.dc_max_kw` | — | — | S08 |
| `war.years` | — | — | S08 |
| precio (`vehicle_prices`) | — | — | S08 |

EEA + IDAE cubren **identidad técnica, energía y CO₂**. Tamaño, maletero, plazas, prestaciones, carga, garantía y **precio** dependen del fabricante (S08) o del CoC (S10): ningún candidato tiene hoy sus claves críticas completas, y no se rellenan con supuestos.
