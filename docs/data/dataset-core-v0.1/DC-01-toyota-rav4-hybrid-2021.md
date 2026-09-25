# DC-01 — Toyota RAV4 Hybrid 2021 (ES) · 2.5 Hybrid 220H 218 CV 4x2 (e-CVT) · Advance

> Estado: **CURADO (borrador v0.1)** · Fecha de consulta de todas las fuentes: **2026-09-24** · Curador: agente de datos VScar
> Caso Dataset Core: **HEV usado**. Catálogo: [SPEC_KEY_CATALOG.md v0.1](../SPEC_KEY_CATALOG.md)

**Decisión de variante**: se documenta la **4x2 (FWD) 218 CV**, que está bien documentada en fuente oficial española (no hace falta recurrir a la AWD-i 222 CV). Acabado representativo: **Advance** (acabado intermedio de la gama 2021: Business · Advance · Style · Black Edition · Luxury).

**Nota de año-modelo**: Toyota España no usa "model year". Se toma como MY2021 la **"renovada gama RAV4 Electric Hybrid 2021"** (nota de prensa de 2020-09-03) y el catálogo español fechado 2020-09-30 (metadatos del PDF: `14071_RAV4_60_ES_WEB.indd`, creado 2020-09-30). Es la gama vendida durante 2021 hasta la actualización de 2022.

## Fuentes usadas (todas consultadas 2026-09-24)

| ID | Fuente | URL | Tipo | Granularidad |
|---|---|---|---|---|
| S1 | Catálogo RAV4 Toyota España (gama 2021, PDF fechado 2020-09-30, 60 pp., ficha técnica pp. 42–53) | https://www.toyota.es/content/dam/toyota/nmsc/spain/cross-model/new-cars/catalogos-precios/pdf/CATALOGO_RAV4.pdf | Fabricante ES (OFFICIAL) | engine+drivetrain (4x2/4x4); algunos valores por grupo de acabados; equipamiento por trim |
| S2 | Nota de prensa Toyota España "Toyota RAV4 Electric Hybrid 2021: gama renovada y nueva versión Black Edition" (2020-09-03) | https://prensa.toyota.es/toyota-rav4-electric-hybrid-2021-gama-renovada-y-nueva-version-black-edition/ | Fabricante ES (OFFICIAL) | market/model (gama) |
| S3 | Dossier de prensa Toyota Motor Europe "Nuevo Toyota RAV4 Hybrid" (ES, 2019, 40 pp., especificaciones pp. 32–34) | https://newsroom.toyota.eu/download/633411/2019-toyota-rav4-dpl-es-128043.pdf (enlazado desde https://newsroom.toyota.eu/2019-the-new-rav4/, publicado 2019-01-15) | Fabricante EU (OFFICIAL) | generation/engine (lanzamiento 2019, no MY2021) |
| S4 | Nota de prensa Toyota España "La gama completa del nuevo Toyota RAV4 hybrid, ya disponible en España" (2019-01-22) | https://prensa.toyota.es/la-gama-completa-del-nuevo-toyota-rav4-hybrid-ya-disponible-en-espana/ | Fabricante ES (OFFICIAL) | market/model |
| S5 | Euro NCAP — Toyota RAV4 2019 (resultado) | https://www.euroncap.com/en/results/toyota/rav4/35881 · https://www.euroncap.com/assessments/toyota/rav4/0764/ | Autoridad (OFFICIAL) | generation (aplica a 2.0/2.5, HEV, PHEV, 4x2/4x4) |
| S6 | Euro NCAP newsroom "Toyota RAV4 - Euro NCAP 2019 Results - 5 stars" (2019-05-22) | https://news.euroncap.com/safercars/toyota-rav4---euro-ncap-2019-results---5-stars/s/2a3c7ffb-e724-421c-8afa-7f2eb6a2c22f | Autoridad (OFFICIAL) | generation |
| S7 | DGT — Etiqueta ambiental ECO (criterios; página actualizada 2022-02-10) | https://www.dgt.es/nuestros-servicios/tu-vehiculo/tus-vehiculos/distintivo-ambiental/etiqueta-eco/ | Autoridad (OFFICIAL, regla) | regla por powertrain + norma Euro |
| S8 | km77 — Toyota RAV4 Hybrid 220H 4x2 Advance (2020-2022) | https://www.km77.com/coches/toyota/rav4/2019/estandar/estandar/rav4-hybrid-220h-4x2-advance/datos | Tercero (SECONDARY_REFERENCE) | trim |
| S9 | car-recalls.eu — Toyota RAV4 (2019–2023) immobilizer (cita Safety Gate A12/00794/24) | https://car-recalls.eu/recall/toyota-rav4-2019-2023-immobilizer/ | Tercero agregador (SECONDARY_REFERENCE) | multi-modelo / periodo de producción |
| S10 | Wikipedia — Toyota RAV4 | https://en.wikipedia.org/wiki/Toyota_RAV4 | Tercero (SECONDARY_REFERENCE) | generation |

---

## 1. Identidad resuelta

| Campo | Valor | Fuente | Notas |
|---|---|---|---|
| `market_code` | `ES` | S1, S2 | |
| Fabricante | Toyota | S1 | |
| Modelo | RAV4 Hybrid (comercialmente "RAV4 Electric Hybrid" en 2021) | S1, S2 | denominación de versión en ficha: **"220H Automático (e-CVT) 4x2"** |
| `generation_code` | `XA50` (5.ª generación) | S10 (SECONDARY) para el código; S4 (OFFICIAL) para "quinta generación" | Toyota España/TME no usan el código "XA50" en las fuentes consultadas; solo "quinta generación". El código XA50 solo aparece en Wikipedia |
| Facelift / fase | Fase inicial (pre-actualización 2022); "gama renovada 2021" (sin cambio de carrocería) | S2 | S2: la gama 2021 añade acabado Style y Black Edition, radio DAB de serie, y **batería de iones de litio en Style/Luxury/Black Edition**; Business y Advance mantienen **hidruro de níquel** |
| Periodo comercial ES | `sales_start` 2019-01 (gama completa disponible, S4 2019-01-22); gama 2021 desde 2020-09 (S2 2020-09-03); `sales_end` NOT FOUND (oficial) | S4, S2 | km77 (S8) indica versión "Advance (2020-2022)" → SECONDARY |
| `model_year` | 2021 | S2 (título "RAV4 Electric Hybrid 2021") | ver nota inicial |
| `trim_name` | `Advance` | S1 | |
| `powertrain_type` | `HEV` | S1, S3 ("sistema híbrido autorrecargable") | |
| `fuel_type` | `petrol` | S1 ("Gasolina 95 octanos o más") | S3 (2019) dice "91 octanos o más" → discrepancia menor entre fuentes |
| `drivetrain` | `FWD` | S1 ("4x2") | |
| `transmission` | `ecvt` | S1 ("Automático (e-CVT)… Transmisión continuamente variable de forma eléctrica") | S3: "Sistema de engranaje planetario" |
| `body_type` | `suv` | S1 | |
| `seats` | 5 | S1 ("Número de plazas 5") | |
| `doors` | 5 | S1 ("Número de puertas 5") | |
| `emissions_standard` | `Euro6d` (S3, 2019) / "Euro 6" sin sufijo (S1, 2020) | S3, S1 | **Ambigüedad**: el catálogo MY2021 solo dice "Euro 6"; el dossier 2019 dice "Euro 6d". No se ha encontrado fuente oficial que dé el sufijo exacto para MY2021 |

---

## 2. Tabla de valores

Leyenda provenance: **OFFICIAL** = fabricante/autoridad · **VERIFIED** = dos fuentes oficiales coinciden · **CALCULATED** = derivado por regla documentada · **SECONDARY_REFERENCE** = solo tercero, no publicable.

### 2.1 Dimensiones y masa

| SpecKey | Valor | Unidad canónica | Ciclo | Fuente | URL | Granularidad | Provenance | Notas |
|---|---|---|---|---|---|---|---|---|
| `dim.length_mm` | 4600 | mm | — | S1 p.44; S3 p.34 | S1, S3 | engine/generation | VERIFIED | |
| `dim.width_mm` | 1855 | mm | — | S1 p.44; S3 p.34 | S1, S3 | generation | VERIFIED | sin retrovisores (no se indica explícitamente, "Anchura total") |
| `dim.width_mirrors_mm` | NOT FOUND | mm | — | — | — | — | — | |
| `dim.height_mm` | 1685 | mm | — | S1 p.44 | S1 | trim group | OFFICIAL | S1: "Altura total con barras de techo (1675 mm sin barras) 1685 / 1690*" — 1685 = Business/Advance, 1690 = Style/Black Edition/Luxury. Advance lleva barras longitudinales de serie (S1 p.46). **Altura sin barras: 1675 mm** (relevante para deal breaker garaje) |
| `dim.wheelbase_mm` | 2690 | mm | — | S1 p.44; S3 p.34 | S1, S3 | generation | VERIFIED | |
| `dim.ground_clearance_mm` | 190 | mm | — | S1 p.44; S3 p.34 | S1, S3 | generation | VERIFIED | |
| `dim.turning_circle_m` | 11.0 (rueda) / 11.8 (carrocería) | m | — | S3 p.34 | S3 | generation | OFFICIAL | **Conflicto de etiqueta**: S3 lo llama "Radio mín. de giro rueda/carrocería 11,0/11,8" (valores de diámetro); S1 da "Radio de giro mínimo 5,5 m" (radio real). 5,5 × 2 = 11,0 → consistente. Se guarda el diámetro |
| `dim.kerb_weight_kg` | 1665 | kg | — | S1 p.44 | S1 | trim group | OFFICIAL | "Peso en orden de marcha 1665 (Business – Black Edition) / 1680 (Luxury)". Norma (con/sin conductor 75 kg) no indicada. S3 (2019): tara mín./máx. 4x2 1590/1680 |
| `dim.gross_weight_kg` | 2135 | kg | — | S1 p.44; S3 p.34 | S1, S3 | engine+drivetrain | VERIFIED | |

### 2.2 Capacidad y practicidad

| SpecKey | Valor | Unidad canónica | Ciclo | Fuente | URL | Granularidad | Provenance | Notas |
|---|---|---|---|---|---|---|---|---|
| `cap.boot_l` | 580 | L | — | S1 p.43 ("hasta el cubre equipajes 580"); S3 p.34 ("CAPACIDAD (dm3 VDA) 580") | S1, S3 | generation | VERIFIED | **Método: VDA** declarado solo en S3 (TME 2019) y en newsroom.toyota.eu ("580 litres VDA with seats in place"). El catálogo ES no declara método |
| `cap.boot_max_l` | 1690 | L | — | S3 p.34 | S3 | generation | OFFICIAL | S3: asientos abatidos "hasta el cubremaletero 1.189 / hasta el techo 1.690" (VDA). S1 da además "hasta el techo 733" **con asientos en uso** (no hay clave para ello) |
| `cap.payload_kg` | NOT FOUND | kg | — | — | — | — | — | derivable (2135 − 1665) pero no se deriva sin regla |
| `cap.towing_braked_kg` | 800 | kg | — | S1 p.44; S3 p.34 | S1, S3 | engine+drivetrain | VERIFIED | 4x4: 1650 |
| `cap.towing_unbraked_kg` | 750 | kg | — | S1 p.44; S3 p.34 | S1, S3 | engine | VERIFIED | |
| `cap.roof_load_kg` | NOT FOUND | kg | — | — | — | — | — | |
| `cap.isofix_positions` | 2 | — | — | S1 p.53 ("2 anclajes ISOFIX de 3 puntos (plazas laterales traseras)") | S1 | trim | OFFICIAL | de serie en todos los acabados |
| `cap.third_row` | `not_available` | — | — | S1 p.43 (2 delanteros + 3 traseros = 5 plazas) | S1 | model | OFFICIAL | |

### 2.3 Prestaciones

| SpecKey | Valor | Unidad canónica | Ciclo | Fuente | URL | Granularidad | Provenance | Notas |
|---|---|---|---|---|---|---|---|---|
| `perf.power_max_kw` | 160 | kW | — | S1 p.42 ("Potencia máxima (kW/CV DIN) 160/218"); S3 p.32 ("Potencia máx. total del sistema 218/160") | S1, S3 | engine+drivetrain | VERIFIED | **potencia de sistema** (S3 lo dice explícitamente; S1 solo "Potencia máxima"). Display ES: 160 kW / 218 CV DIN |
| `perf.torque_max_nm` | 221 (solo motor térmico) | N·m | — | S1 p.42; S3 p.32 | S1, S3 | engine | VERIFIED | S1 "221/3600–5200"; S3 "Par (Nm a rpm), solo motor térmico". **Par de sistema no publicado** → no es el valor que pide la clave ("del sistema si se publica") |
| `perf.accel_0_100_s` | 8.4 | s | — | S1 p.43; S3 p.32 | S1, S3 | engine+drivetrain | VERIFIED | 4x4: 8,1 |
| `perf.top_speed_kmh` | 180 | km/h | — | S1 p.43; S3 p.32 | S1, S3 | engine | VERIFIED | |
| `perf.power_ice_kw` | NOT FOUND (oficial) · 130 (SECONDARY) | kW | — | S8 | S8 | trim | SECONDARY_REFERENCE | km77: "177 CV / 130 kW". Ni S1 ni S3 publican la potencia del motor térmico aislado |
| `perf.power_electric_kw` | 88 | kW | — | S3 p.32 ("Potencia máx. delantera/trasera (kW) 88/-") | S3 | engine | OFFICIAL | motor delantero 3NM; par motor eléctrico 202 N·m (sin clave) |

### 2.4 Motor térmico y transmisión

| SpecKey | Valor | Unidad canónica | Ciclo | Fuente | URL | Granularidad | Provenance | Notas |
|---|---|---|---|---|---|---|---|---|
| `pt.displacement_cc` | 2487 | cm³ | — | S3 p.32 | S3 | engine | OFFICIAL | motor A25A-FXS (S1, S3) |
| `pt.cylinders` | 4 | — | — | S1 p.42 ("4 en línea"); S3 | S1, S3 | engine | VERIFIED | |
| `pt.fuel_tank_l` | 55 | L | — | S1 p.44; S3 p.32 | S1, S3 | engine | VERIFIED | |
| `pt.gears` | no aplica (e-CVT) | — | — | S1 | S1 | engine | OFFICIAL | ver fricciones: la clave no tiene valor para e-CVT |
| `pt.fiscal_hp_es` | NOT FOUND | CVF | — | — | — | — | — | podría ser CALCULATED por fórmula oficial a partir de 4 cil. y 87,5×103,48 mm; no se ha calculado |
| `pt.timing_drive` | `unknown` | — | — | — | — | — | — | no aparece en S1/S3. (La ficha TME de la 6.ª gen. dice "Chain Drive" para el 2.5, pero no se copia entre generaciones) |

### 2.5 Batería (informativo; claves `bat.*` son PHEV/BEV en el catálogo)

| Dato | Valor | Fuente | Provenance | Notas |
|---|---|---|---|---|
| Química batería de tracción | Hidruro de níquel (NiMH) | S3 p.32; S2 (Advance mantiene NiMH en 2021) | VERIFIED | `bat.chemistry` no tiene `NiMH` en el enum ni aplica a HEV |
| Tensión nominal / capacidad | 244,8 V / 6,5 Ah | S3 p.32 | OFFICIAL | sin clave |
| Capacidad | 1,59 kWh | S8 | SECONDARY_REFERENCE | |
| Garantía batería híbrida | "Cobertura Hybrid Battery Extra Care… una vez al año o cada 15.000 km… durante diez años desde la fecha de matriculación" (condicionada a revisión) | S1 p.57 | OFFICIAL | no encaja en `bat.warranty_years` (solo PHEV/BEV y es condicionada) |

### 2.6 Consumo y emisiones

| SpecKey | Valor | Unidad canónica | Ciclo | Fuente | URL | Granularidad | Provenance | Notas |
|---|---|---|---|---|---|---|---|---|
| `nrg.fuel_combined_l100` | 5.5–5.8 | L/100 km | **WLTP** | S1 p.42 | S1 | engine+drivetrain+trim group | OFFICIAL | "Consumo combinado WLTP 5,5–5,8 / 5,5–5,9*" — primer dato = Business y Advance. **Rango, no valor único** (depende de llanta/equipo). km77 (S8) da 5,5 para Advance → SECONDARY |
| `nrg.fuel_combined_l100` (alt.) | 4.6 | L/100 km | **NEDC_CORRELATED** | S3 p.32 | S3 | engine+llanta 18" | OFFICIAL | "Combinado 17"/18" 4,5/4,6" (Advance = 18"). Dossier 2019, no catálogo MY2021. S3 texto: "4,5 l/100 km… 103 g/km (NEDC correlacionado)" |
| `nrg.fuel_urban_l100` | 4.7 | L/100 km | **NEDC_CORRELATED** | S3 p.32 | S3 | engine+llanta 18" | OFFICIAL | "Urbano 17"/18" 4,4/4,7". Fuente 2019 (pre-MY2021) |
| `nrg.fuel_extra_urban_l100` | 4.7 | L/100 km | **NEDC_CORRELATED** | S3 p.32 | S3 | engine+llanta 18" | OFFICIAL | "Extra-urbano 17"/18" 4,7/4,7" |
| `nrg.fuel_wltp_low_l100` | NOT FOUND | L/100 km | WLTP | — | — | — | — | ninguna fuente ES publica fases WLTP |
| `nrg.fuel_wltp_medium_l100` | NOT FOUND | L/100 km | WLTP | — | — | — | — | |
| `nrg.fuel_wltp_high_l100` | NOT FOUND | L/100 km | WLTP | — | — | — | — | |
| `nrg.fuel_wltp_extra_high_l100` | NOT FOUND | L/100 km | WLTP | — | — | — | — | |
| `emi.co2_combined_gkm` | 125–131 | g/km | **WLTP** | S1 p.42 | S1 | engine+drivetrain+trim group | OFFICIAL | "Emisiones CO₂ WLTP 125–131 / 125–134*" (primer dato Business/Advance). km77: 125 (SECONDARY) |
| `emi.co2_combined_gkm` (alt.) | 102–108 | g/km | **NEDC_CORRELATED** | S1 p.42 | S1 | engine+drivetrain | OFFICIAL | "Emisiones CO₂ NEDC§ 102–108 — § Ciclo de emisiones aplicable a efectos de Impuesto de Matriculación". S1: "Hasta 1 de enero de 2021 no se tomarán como referencia los valores WLTP para el Impuesto de Matriculación, sino los NEDC Correlacionado" → para matriculaciones 2021 aplica WLTP. S3 (2019, 18"): 105 |
| `emi.dgt_label_es` | `ECO` | — | — | S7 (regla: "Vehículos híbridos no enchufables (HEV)" + gasolina "EURO 4/IV, 5/V o 6/VI") | S7 | regla powertrain+Euro | **CALCULATED** | regla DGT aplicada a HEV gasolina Euro 6 (S1). km77 (S8) muestra "ECO" → SECONDARY. Etiqueta por unidad solo verificable por matrícula en DGT |

### 2.7 Seguridad y ADAS (acabado Advance, S1 pp. 52–53)

| SpecKey | Valor | Unidad | Fuente | Granularidad | Provenance | Notas |
|---|---|---|---|---|---|---|
| `saf.ncap_stars` | 5 | 0–5 | S6 | generation | OFFICIAL | Euro NCAP 2019 — ver §4. **Rating expirado 2026-01-01** (S5) |
| `saf.ncap_adult_pct` | 93 | % | S5 | generation | OFFICIAL | |
| `saf.ncap_child_pct` | 87 | % | S5 | generation | OFFICIAL | |
| `saf.ncap_vru_pct` | 85 | % | S5 | generation | OFFICIAL | |
| `saf.ncap_assist_pct` | 77 | % | S5 | generation | OFFICIAL | |
| `saf.airbags_count` | 7 | — | S1 p.53 ("7 airbags: frontales, laterales, de cortina y de rodilla (conductor)") | trim (todos) | OFFICIAL | |
| `adas.aeb` | `standard` | enum | S1 p.53 ("Sistema de Seguridad Precolisión con Detector de Ciclistas") | trim | OFFICIAL | |
| `adas.aeb_vru` | `standard` | enum | S1 p.53 ("…Detector de Ciclistas"; "Detector de Peatones en Condiciones Nocturnas") | trim | OFFICIAL | |
| `adas.acc` | `standard` | enum | S1 p.53 ("Control de Crucero Adaptativo"; "Control de Crucero Inteligente") | trim | OFFICIAL | stop&go: no indicado |
| `adas.lane_keep` | `standard` | enum | S1 p.53 ("Avisador de Cambio Involuntario de Carril con Corrección de Volante") | trim | OFFICIAL | es LDA con corrección, no LTA centrado → matiz no representable |
| `adas.blind_spot` | `not_available` | enum | S1 p.52 ("Detector de ángulo muerto (BSM) – – z z z": no en Business ni Advance) | trim | OFFICIAL | |
| `adas.rear_cross_traffic` | `not_available` | enum | S1 p.52 (RCTA "– – z z z") | trim | OFFICIAL | |
| `adas.traffic_sign_recognition` | `standard` | enum | S1 p.53 | trim | OFFICIAL | |
| `adas.driver_monitoring` | `unknown` | enum | — | — | — | no aparece en la tabla de equipamiento |
| `adas.surround_camera` | `not_available` | enum | S1 p.52 ("Sistema de visión panorámico 360° – – – – z": solo Luxury) | trim | OFFICIAL | |

### 2.8 Tecnología (Advance)

| SpecKey | Valor | Fuente | Provenance | Notas |
|---|---|---|---|---|
| `tech.apple_carplay` | `standard` (cable/inalámbrico **no especificado**) | S1 p.51 ("Compatibilidad con Apple CarPlay™ y Android Auto™ z z z z z") | OFFICIAL | el enum exige `standard_wireless`/`standard_wired`; la fuente no lo dice |
| `tech.android_auto` | `standard` (tipo no especificado) | S1 p.51 | OFFICIAL | idem |
| `tech.center_screen_in` | 8 | S1 p.51 ("Pantalla táctil multifunción de 8"") | OFFICIAL | |
| `tech.digital_cluster` | `not_available` (inferido) | S1 p.48/51 ("Tacómetro analógico con indicador del sistema hybrid" + "Pantalla multi-información TFT a color de 7"" en Advance) | OFFICIAL (interpretación) | cuadro mixto analógico + TFT 7": el enum no tiene "parcial" |
| `tech.connected_services` | `standard` | S1 p.51 ("Información del vehículo a través de la App MyT") | OFFICIAL | |
| `tech.ota_updates` | `unknown` | — | — | no mencionado |

### 2.9 Garantía y mantenimiento

| SpecKey | Valor | Unidad | Fuente | Provenance | Notas |
|---|---|---|---|---|---|
| `war.years` | 3 | años | S1 p.57 ("garantía de tres años/100.000 km§") | OFFICIAL | nivel mercado/marca |
| `war.km` | 100000 | km | S1 p.57 | OFFICIAL | |
| `war.conditions` | "Consulta en tu concesionario los detalles concretos de la garantía." S2: financiación Toyota Easy Plus incluía "4 años de garantía" (promocional) | — | S1, S2 | OFFICIAL | la ampliación a 4 años era de la oferta financiera, no garantía de serie |
| `mnt.service_interval_km` | 15000 (intermedia) / 30000 (completa) | km | S1 p.57 ("revisión… cada dos años o cada 30.000 km… revisión intermedia cada año o cada 15.000 km") | OFFICIAL | intervalo fijo |
| `mnt.service_interval_months` | 12 (intermedia) / 24 (completa) | meses | S1 p.57 | OFFICIAL | |

---

## 3. Precios (`vehicle_prices`)

| price_type | Importe | Moneda | incl_taxes | valid_from / fecha | Alcance | Fuente | Provenance | Notas |
|---|---|---|---|---|---|---|---|---|
| `original_list` (Advance 220H 4x2, 2021) | **NOT FOUND** (oficial) | EUR | — | — | trim | — | — | No se ha localizado tarifa oficial Toyota España 2021 con PVP por acabado. La página oficial https://prensa.toyota.es/precios-rav4/ hoy muestra la 6.ª generación; su versión archivada de 2021 existe en Wayback (snapshot 2021-06-21 confirmado por la API de disponibilidad) pero **no se pudo consultar** su contenido desde esta sesión |
| `original_list` ("desde", gama 2021) | 33.900 | EUR | no indicado | 2020-09-03 | gama (acabado de entrada, no especificado) | S2: "…con unos precios que arrancan en 33.900 €" | OFFICIAL (no utilizable para Advance) | precio "desde", sin indicar acabado, IVA/transporte ni si incluye promoción → no apto como `original_list` del trim |
| `original_list` (Black Edition 4x2, gama 2021) | 39.050 | EUR | no indicado | 2020-09-03 | trim (Black Edition) | S2 | OFFICIAL | referencia de otro trim de la misma gama |
| referencia Advance 4x2 | 39.000 (con "Descuento oficial 2.000 €"; "Precio sin impuestos 32.604 €"; IVA 21 %; Impuesto de matriculación 4,75 %) | EUR | sí (IVA + IEDMT) | "Tarifa de 09/2022" | trim | S8 | **SECONDARY_REFERENCE** | tarifa de 09/2022, no de 2021, e incluye descuento → **no publicable** y no es `original_list` 2021 |

---

## 4. Seguridad (`safety_ratings`)

| authority | stars | adult % | child % | VRU % | safety assist % | test_year | protocol | Coche ensayado | Fuente | Notas |
|---|---|---|---|---|---|---|---|---|---|---|
| Euro NCAP | 5 | 93 | 87 | 85 | 77 | 2019 (publicado 2019-05-22) | Euro NCAP 2019 (protocolo "Standard" 2018–2019) | "Toyota RAV4 Hybrid AWD, LHD", 1.730 kg | S5, S6 | Aplica a variantes 2.0/2.5, híbrido y PHEV, 4x2 y 4x4, LHD/RHD (S5). **El rating figura como expirado desde 2026-01-01** (S5). Las estrellas se leen en la nota de prensa S6 ("5 stars"); la página de resultados actual solo muestra porcentajes |

---

## 5. Recalls

| Ref. | Fecha | Alcance | Riesgo | Fuente | Provenance | Aplicabilidad a DC-01 |
|---|---|---|---|---|---|---|
| Safety Gate **A12/00794/24** · código Toyota 24SD-022 | 2024-03-29 | Toyota C-HR, **RAV4 HEV**, RAV4 PHV, Lexus NX450h+, RX350h, RX450h+, RX500h; producción 2019-07-18 → 2023-09-29 | Inmovilizador de accesorio poco robusto: el vehículo puede quedar en "Ready ON" y pasar a "Ready OFF" en marcha (parada del motor) | S9 (cita Safety Gate) | SECONDARY_REFERENCE | **probable** (RAV4 HEV en periodo de producción); depende del VIN. La ficha oficial de Safety Gate no se pudo abrir (la web requiere JS; los PDF por ID no se localizaron) |
| Safety Gate SR/03911/25 · código 25SD-108 | 2025-11 (notificado por Portugal 2025-11-07) | Varios Toyota/Lexus incl. RAV4, producción 2021–2025 | Software del control de Parking Assist con Panoramic View Monitor: la imagen de la cámara trasera puede congelarse | https://car-recalls.eu/recall/toyota-rav4-2021-2025-electronic-injury/ | SECONDARY_REFERENCE | **dudosa**: Advance 2021 no lleva visión 360° (S1) |
| (DC-DC converter, 23SD-075) | 2023-07 | RAV4 **PHEV** y NX450h+ | incendio | https://car-recalls.eu/recall/toyota-rav4-2019-2022-dc-dc-converter/ | SECONDARY_REFERENCE | **no aplica** (PHEV) |

Recalls oficiales en fuente primaria (Safety Gate / Toyota España) para esta generación en ES: **NOT FOUND** (no verificados en fuente primaria en esta sesión).

---

## 6. Cobertura de claves críticas (HEV)

| Categoría | Clave crítica | Estado | Valor / nota |
|---|---|---|---|
| Economy / Range / Eco | `nrg.fuel_combined_l100` | **FOUND** | 5,5–5,8 L/100 km WLTP (rango) |
| Economy | precio (`original_list`) | **SECONDARY ONLY** | oficial solo "desde 33.900 €" de gama; Advance solo en km77 (tarifa 09/2022) |
| Range | `pt.fuel_tank_l` | **FOUND** | 55 L |
| Performance | `perf.power_max_kw` | **FOUND** | 160 kW (sistema) |
| Performance | `perf.accel_0_100_s` | **FOUND** | 8,4 s |
| Size | `dim.length_mm` | **FOUND** | 4600 |
| Size | `dim.width_mm` | **FOUND** | 1855 |
| Size | `dim.height_mm` | **FOUND** | 1685 (con barras) |
| Size / Practicality | `cap.boot_l` | **FOUND** | 580 L VDA |
| Practicality | `seats` | **FOUND** | 5 |
| Eco | `emi.co2_combined_gkm` | **FOUND** | 125–131 g/km WLTP (también 102–108 NEDC_CORRELATED) |
| Eco | `emi.dgt_label_es` | **FOUND (CALCULATED)** | ECO por regla DGT |
| Safety | rating con protocolo | **FOUND** | Euro NCAP 2019, 5★ (expirado 2026) |
| Warranty | `war.years` | **FOUND** | 3 años |

**Resultado**: 13/14 FOUND (1 CALCULATED) · 1 SECONDARY ONLY (precio). Economy **no activable** con fuentes publicables (falta `original_list` oficial) salvo que el participante aporte `used_asking_price` (USER PROVIDED), que es el caso normal de un usado.

---

## 7. Fricciones con el catálogo

1. **Consumo/CO₂ como rango, no valor único**: el catálogo ES da "5,5–5,8" y "125–131" (dependen de llanta/equipo) incluso a nivel de grupo de acabados. `nrg.fuel_combined_l100` y `emi.co2_combined_gkm` son `decimal`/`int` simples → hace falta `min/max` o una regla "valor del peor caso" documentada.
2. **Dos ciclos vigentes a la vez para el mismo año-modelo**: S1 publica WLTP (informativo) y NEDC Correlacionado (fiscal hasta 2020-12-31). La clave admite `test_cycle`, pero hay que poder guardar **ambos valores** de la misma clave con ciclos distintos y marcar cuál es el fiscal (`is_tax_basis`).
3. **Par de sistema vs par del motor térmico**: Toyota solo publica "par solo motor térmico" (221 N·m) y par del motor eléctrico (202 N·m). `perf.torque_max_nm` ("del sistema si se publica") queda ambiguo → propuesta: `perf.torque_ice_nm` y `perf.torque_electric_nm`, y que `perf.torque_max_nm` sea solo sistema.
4. **Potencia del motor térmico** no está en fuentes oficiales ES (solo km77) — relevante para Q1 del catálogo.
5. **Diámetro vs radio de giro**: S3 etiqueta "Radio mín. de giro rueda/carrocería 11,0/11,8" (son diámetros) y S1 da "Radio de giro mínimo 5,5 m". La clave `dim.turning_circle_m` debería exigir `method` (diámetro entre bordillos / entre paredes; radio).
6. **Altura con/sin barras de techo**: 1675 sin barras vs 1685/1690 con barras. Para el deal breaker "altura de garaje" importa la máxima; falta indicar qué altura se guarda (`dim.height_mm` + nota `with_roof_rails`).
7. **Maletero "hasta el techo con asientos en uso" (733 L)**: dato oficial muy citado que no encaja ni en `cap.boot_l` (hasta cubremaletero) ni en `cap.boot_max_l` (asientos abatidos). El método VDA solo lo declara TME, no el catálogo ES (Q3).
8. **Batería de HEV**: química (NiMH), tensión, capacidad y la garantía "Hybrid Battery Extra Care" de 10 años (condicionada a revisión anual) importan para usados, pero `bat.*` es solo PHEV/BEV y `bat.chemistry` no incluye `NiMH`. Además la química **cambia por acabado** dentro del mismo MY (Advance NiMH vs Style/Luxury Li-ion, S2).
9. **`pt.gears` para e-CVT**: no tiene sentido; falta valor `not_applicable` distinto de faltante.
10. **`emissions_standard`**: el catálogo MY2021 solo dice "Euro 6" sin sufijo; el enum exige `Euro6b/6c/6d-TEMP/6d`. Hace falta un valor `Euro6` (sin subnorma) o fuente de homologación (COC).
11. **Enums de tecnología**: `tech.apple_carplay` exige cable/inalámbrico y la fuente no lo dice → falta `standard_unspecified`. `tech.digital_cluster` no tiene "parcial" (TFT 7" + analógico).
12. **`adas.lane_keep`** no distingue "aviso con corrección" (LDA) de "centrado de carril" (LTA).
13. **Etiqueta DGT**: no hay fuente oficial por variante (solo por matrícula) → CALCULATED por regla (Q4 resuelta en la práctica: derivar).
14. **Granularidad**: casi todo el dato oficial está a nivel motor+tracción; peso y consumo/CO₂ a nivel "grupo de acabados" (Business/Advance vs Style/Black/Luxury); solo el equipamiento es por trim. El dossier TME (S3) es de lanzamiento 2019, no del MY2021.
15. **Rating Euro NCAP expirado**: el catálogo no tiene campo `valid_until`/`expired`; Euro NCAP marca el rating 2019 como expirado desde 2026-01-01. La página actual no muestra estrellas (solo %), las estrellas vienen de la nota de prensa.
16. **Precios históricos**: la tarifa oficial 2021 no está accesible en toyota.es (URL de precios reutilizada para la nueva generación, con fecha CMS antigua); dependencia de archivo web → hace falta política para fuentes archivadas (Wayback) como OFFICIAL-ARCHIVED.
