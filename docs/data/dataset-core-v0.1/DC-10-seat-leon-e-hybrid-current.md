# DC-10 — SEAT León e-HYBRID (actual, a la venta en ES en 2026) · 1.5 TSI e-HYBRID 150 kW / 204 CV DSG-6 · Style · 5 puertas · ES

> Estado: **curación v0.1 — borrador** · Fecha de consulta de todas las fuentes: **2026-09-24** · Curador: agente data (VScar)
> Catálogo: [SPEC_KEY_CATALOG.md v0.1](../SPEC_KEY_CATALOG.md) · Reglas: [README.md §3](README.md)
> Regla aplicada: solo se registran valores vistos en fuentes consultadas en esta sesión. `NOT FOUND` = ausente.

**Trim elegido**: **Style** (fila "1.5 e-HYBRID 150kW (204cv) DSG-6 St&Sp STYLE e-HYBRID MY26.5", la versión de entrada del PHEV 5 puertas).

> **Aviso de homologación (crítico)**: hay **dos juegos de valores oficiales de consumo/CO₂** para el mismo motor:
> - (a) ficha técnica y press kit de nov. 2024 / may. 2025: CO₂ 8–9 g/km y 0,4 L/100 km ponderado;
> - (b) listas de precios ES de enero y mayo 2026 (**MY26.5**): CO₂ 27–31 g/km.
>
> La web SEAT Alemania da para la versión actual 1,2–1,4 L/100 km ponderado y 27–31 g/km. Todo apunta a una re-homologación con el nuevo *utility factor* PHEV (Euro 6e-bis), pero **ninguna fuente española lo explica**, así que no se asume. Se registran ambos juegos con su `valid_from`.

---

## 0. Fuentes consultadas

| ID | Fuente | URL | Tipo | Granularidad | Fecha doc. |
|---|---|---|---|---|---|
| T1 | SEAT-CUPRA Media Center ES — **Lista de precios y equipamiento Gama SEAT León MY26 ver.9**, "En vigor 07/05/2026" (PDF creado el 19/05/2026) | https://www.seat-cupra-mediacenter.es/content/dam/seat-media-center/models-all-brands/seat-models/seat-leon-st/price-list/Listado%20de%20precios%20(PVP)%20y%20equipamiento%20-%20Gama%20SEAT%20Le%C3%B3n%20(mayo%202026).pdf | OFICIAL (tarifa) | trim | 2026-05-07 |
| T2 | Ídem, "SEAT LEON 5P MY26 — En vigor 19/01/2026" | https://www.seat-cupra-mediacenter.es/content/dam/seat-media-center/models-all-brands/seat-models/seat-leon/price-list/Listados%20de%20precios%20(PVP)%20y%20equipamiento%20GAMA%20SEAT%20Le%C3%B3n%20(Enero%202026).pdf | OFICIAL (tarifa) | trim | 2026-01-19 |
| T3 | Media Center ES — **Ficha técnica SEAT León 5 puertas** (PDF Excel, creado el 15/11/2024) | https://www.seat-cupra-mediacenter.es/content/dam/seat-media-center/models-all-brands/seat-models/seat-leon/technical-data/Ficha%20t%C3%A9cnica%20SEAT%20Le%C3%B3n%205%20puertas.pdf | OFICIAL (ficha) | motor/carrocería | 2024-11-15 |
| T4 | Media Center ES — press kit e-HYBRID, "Ficha técnica resumida" | https://www.seat-cupra-mediacenter.es/SEAT-Brand/presskits/seat-leon-e-hybrid/ficha-tecnica-resumida | OFICIAL | motor | 2024-11-20 |
| T5 | Media Center ES — press kit e-HYBRID, "Novedades mecánicas" | https://www.seat-cupra-mediacenter.es/SEAT-Brand/presskits/seat-leon-e-hybrid/novedades-mecanicas | OFICIAL | motor | 2024-11-20 |
| T6 | Media Center ES — nota "SEAT lleva la electrificación a un público más amplio… acabado Style para el León e-HYBRID" | https://www.seat-cupra-mediacenter.es/SEAT-Brand/seat-brand-news/2025/seat-lleva-electrificacion-publico-amplio-introduccion-acabado-style-leon-e-hybrid | OFICIAL | trim | 2025-05-14 |
| T7 | Media Center ES — "Ya disponible la gama electrificada al completo del SEAT León" | https://www.seat-cupra-mediacenter.es/SEAT-Brand/seat-brand-news/2024/ya-disponible-gama-electrificada-seat-leon-tecnologico-eficiente | OFICIAL | modelo | 2024-11-21 |
| T8 | seat.es — página del modelo León 5 puertas (vigente) | https://www.seat.es/coches/leon-5-puertas | OFICIAL | modelo/motor | consultada 2026-09-24 |
| T9 | seat.es — noticia "Nuevo SEAT León y León Sportstourer Style e-HYBRID" | https://www.seat.es/sobre-seat/noticias/coches/nuevo-seat-leon-y-leon-sportstourer-style-e-hybrid | OFICIAL | trim | 2025-05-14 |
| T10 | seat.es — FAQ "Mantenimiento y garantía" | https://www.seat.es/preguntas-frecuentes/clientes-posventa/mantenimiento-y-garantia | OFICIAL | mercado/marca | consultada 2026-09-24 |
| T11 | **seat.de** — "SEAT Leon – Varianten und technische Details" | https://www.seat.de/modelle/seat-leon/varianten-und-technische-details | OFICIAL (**mercado DE**) | motor | consultada 2026-09-24 |
| T12 | Euro NCAP — SEAT Leon (rating 2020, página viva) | https://www.euroncap.com/assessments/seat/leon/0801/ | OFICIAL | generación | 2020-12-09 (revisiones anuales 2021–2023) |
| T13 | Euro NCAP newsroom — "SEAT Leon – Euro NCAP 2025 Results – 5 stars" | https://news.euroncap.com/safercars/seat-leon---euro-ncap-2025-results---5-stars/s/d425246e-9ec4-4e97-9e89-3bfdaf7209d1 | OFICIAL | generación (FL) | 2025-11-17 |
| T14 | Euro NCAP — CUPRA Leon 2025 (gemelo corporativo) | https://www.euroncap.com/assessments/cupra/leon/1122/ | OFICIAL | generación (FL, gemelo) | 2025 |
| T15 | DGT — Distintivo ambiental | https://www.dgt.es/nuestros-servicios/tu-vehiculo/tus-vehiculos/distintivo-ambiental/ | OFICIAL | regla | consultada 2026-09-24 |
| T16 | DGT — Instrucción 2018/V-128, equivalencia WLTP/NEDC de la autonomía eléctrica para el distintivo Cero | https://www.dgt.es/export/sites/web-DGT/.galleries/downloads/muevete-con-seguridad/normas-de-trafico/VEH-vehiculos/Instruccion_18_V_218_Equivalencia_WLTP_NEDC.pdf | OFICIAL | regla | 2018-05-29 |
| T17 | car-recalls.eu (agregador Safety Gate) — listado SEAT Leon | https://car-recalls.eu/model/leon/ | TERCERO | generación | consultada 2026-09-24 |
| T18 | km77.com — León 1.5 eHybrid 150 kW (204 CV) DSG FR XM (2024-2025) | https://www.km77.com/coches/seat/leon/2020/5-puertas/ehybrid/leon-15-e-hybrid-150-kw-204-cv-dsg-fr-xm/datos | TERCERO | trim (FR XM) | **SECONDARY_REFERENCE** |

---

## 1. Identidad resuelta

| Campo | Valor | Fuente | Provenance | Notas |
|---|---|---|---|---|
| `market_code` | `ES` | T1 | OFFICIAL | |
| manufacturer | SEAT | T1 | OFFICIAL | |
| model | León (5 puertas) e-HYBRID | T1 | OFFICIAL | |
| `generation_code` | `Mk4` — código de tipo **KL** | T1 (opcionales "KL*54X", "De serie en motorización PHEV (KL**0Y)") | OFFICIAL (indirecto) | "Mk4" no aparece escrito. La 4.ª generación se deduce de T12 (León 2020) + T7 (restyling 2024). |
| `facelift` | Mk4 FL (restyling 2024; tarifa **MY26.5**) | T4/T5/T7 (nov. 2024: nuevo 1.5 e-HYBRID, nuevo HMI, Matrix LED), T1 ("MY26.5") | OFFICIAL | En la tarifa, la fase comercial actual es "MY26.5". |
| `sales_start` | 2024-11 (gama electrificada disponible en ES) | T7 (21/11/2024: "ya disponible") | OFFICIAL | El acabado Style e-HYBRID se lanzó el 2025-05-14 (T6/T9). |
| `sales_end` | — (a la venta) | T1 | OFFICIAL | |
| `model_year` | 2026 (tarifa "MY26.5") | T1 | OFFICIAL | |
| `trim_name` | Style (= "STYLE e-HYBRID MY26.5") | T1 | OFFICIAL | Existen también Style XL, Style XL Fleet Pack, FR, FR XXL (T1). En T2 (ene. 2026) aparecían Style XM y FR XM/XL, en T6 (may. 2025) "Style XS/XM/XL": los nombres de trim **cambian cada pocos meses**. |
| `powertrain_type` | `PHEV` | T1 (sección "e-HYBRID"), T3 ("e-Hybrid (PHEV)") | OFFICIAL | |
| `fuel_type` | `petrol` | T3 ("Gasolina 95") | OFFICIAL | |
| `drivetrain` | 4x2 (FWD no explícito) | T12 ("1.4 petrol PHEV – e-Hybrid 4x2"), T14 ("1.5 TSI e-Hybrid 150kW – e-Hybrid 4x2", CUPRA) | OFFICIAL (parcial) | Ninguna fuente oficial consultada dice "delantera". `FWD` = no verificado. |
| `transmission` | `dct` (DSG 6 vel.) | T1 ("DSG-6"), T3 ("Automática DSG-6v Shift-by-wire / Start-Stop") | OFFICIAL | |
| `body_type` | `hatchback` | T3 ("5 puertas") | OFFICIAL | |
| `seats` | NOT FOUND | — | — | **Crítico (Practicality)**. |
| `doors` | 5 | T3 | OFFICIAL | |
| `emissions_standard` | `Euro6e-bis` | T6 (may. 2025, "Euro 6e-bis") | OFFICIAL | **No existe en el enum del catálogo** (§2: Euro6d… Euro7), ver §7-F9. La coherencia con CO₂ 8–9 (T6) frente a 27–31 (T1) está sin resolver. |

---

## 2. Tabla de valores

### 2.1 Claves PHEV críticas y de energía

| SpecKey | Valor | Unidad canónica | Ciclo | Fuente | URL | Granularidad | Provenance | Notas |
|---|---|---|---|---|---|---|---|---|
| `nrg.fuel_charge_sustaining_l100` | **NOT FOUND (ES)** | L/100 km | WLTP | — | — | — | — | **Crítica (Economy, Range PHEV).** Ninguna fuente oficial española publica el consumo con batería descargada. |
| `nrg.fuel_charge_sustaining_l100` (mercado **DE**) | 5,0 – 5,3 | L/100 km | WLTP | T11 | seat.de | motor (rango de versiones) | OFFICIAL **(DE, no transferible a ES)** | Texto original: "Kraftstoffverbrauch (bei entladener Batterie): 5,0-5,3 l/km". La web alemana pone "l/km", que es una **errata** por l/100 km. Otra página de seat.de (Road Edition), vista solo como snippet de búsqueda, da 5,1–5,4: no verificado. Por la regla "no copiar entre mercados", **no se publica para ES**. |
| `nrg.phev_weighted_fuel_l100` (homologación 2024/25) | 0,4 | L/100 km | WLTP (ponderado) | T3, T4 | ficha técnica / ficha resumida | motor | OFFICIAL | T3: "CONSUMOS modo combinado · Ponderado (l/100 Km) [WLTP] 0,4 – 0,4". `valid_from` 2024-11. **Nunca se usa para coste.** |
| `nrg.phev_weighted_fuel_l100` (versión actual, **DE**) | 1,2 – 1,4 | L/100 km | WLTP (ponderado) | T11 | seat.de | motor | OFFICIAL (DE) | "Kraftstoffverbrauch (gewichtet kombiniert): 1,2-1,4 l/100 km". El valor ES equivalente para MY26.5 no se ha encontrado. |
| `nrg.electric_combined_kwh100` (homologación 2024/25) | 15,5 – 16,3 | kWh/100 km | WLTP | T3 | ficha técnica | motor | OFFICIAL | **Crítica.** T3 lo etiqueta como "CONSUMOS modo ELÉCTRICO · **Ponderado** (kWh/100 Km) [WLTP]". No está claro si es EC_AC ponderado o EC en modo *charge-depleting*, ver §7-F3. La fuente no dice si incluye pérdidas de carga. |
| `nrg.electric_combined_kwh100` (versión actual, **DE**) | 12,8 – 13,0 | kWh/100 km | WLTP | T11 | seat.de | motor | OFFICIAL (DE) | "Stromverbrauch (kombiniert): 12,8-13,0 kWh/100 km". La bajada frente a 15,5–16,3 cuadra con un cambio de *utility factor* en la ponderación (hipótesis no confirmada). |
| `rng.electric_combined_km` | **126 – 134** | km | WLTP (tipo **no declarado**: EAER/AER) | T8 | seat.es/coches/leon-5-puertas | motor | OFFICIAL | **Crítica.** Vigente en seat.es el 2026-09-24. T6 (may. 2025) también da 126–134. |
| `rng.electric_combined_km` (nov. 2024) | 125 – 133 | km | WLTP (tipo no declarado) | T3, T4, T5 | ficha técnica | motor | OFFICIAL | T3: "Autonomía eléctrica (km) [WLTP] 125 - 133". T5: "hasta 133 km en modo totalmente eléctrico" (literalmente sería AER, no EAER). |
| `rng.electric_urban_km` | NOT FOUND | km | WLTP | — | — | — | — | |
| (sin clave) autonomía total | 850 – 910 | km | WLTP | T3, T4, T6 | | motor | OFFICIAL | "Autonomía total (km) [WLTP]": **no hay SpecKey**, ver §7-F6. |
| `nrg.fuel_combined_l100` | n/a | — | — | — | — | — | — | Clave ICE/HEV; en PHEV se sustituye por CS + ponderado. |
| `nrg.fuel_urban_l100` / `extra_urban` | NOT FOUND | L/100 km | — | — | — | — | — | |
| `nrg.electric_urban_kwh100` / `highway` | NOT FOUND | kWh/100 km | — | — | — | — | — | |
| `emi.co2_combined_gkm` (**vigente, MY26.5**) | **27 – 31** | g/km | WLTP (ponderado; "CO2 mínimo/máximo WLTP*") | T1 (y T2) | tarifa mayo 2026 | trim (Style e-HYBRID MY26.5, 5P) | OFFICIAL | **Crítica.** La tarifa aclara: "valores de CO2 con Homologación WLTP… corresponden únicamente a la configuración sin opcionales". Sportstourer: 28–32. |
| `emi.co2_combined_gkm` (nov. 2024 – may. 2025) | 8 – 9 | g/km | WLTP (ponderado) | T3, T4, T6, T7 | | motor | OFFICIAL | `valid_to` ≈ ene. 2026 (T2 ya da 27–31). |
| (sin clave) CO₂ con batería descargada | NOT FOUND | g/km | WLTP | — | — | — | — | En DE se publica la "CO₂-Klasse (bei entladener Batterie): C-D" (T11). No hay clave en el catálogo. |
| `emi.dgt_label_es` | **`0`** (Cero emisiones) | — | — | T6 ("Etiqueta: Cero emisiones"), T7 ("CERO emissions label") | | motor | OFFICIAL (fabricante) | Regla DGT (T15): PHEV "con una autonomía de 40 km" → Cero. 126–134 km cumple la regla, pero la etiqueta se toma de la fuente del fabricante, no se deduce. El distintivo real es **por matrícula**. |

### 2.2 Batería y carga

| SpecKey | Valor | Unidad | Ciclo | Fuente | Granularidad | Provenance | Notas |
|---|---|---|---|---|---|---|---|
| `bat.usable_kwh` | 19,7 | kWh | — | T3, T4, T5, T6 | motor | OFFICIAL | "19,7 kWh neto" |
| `bat.gross_kwh` | **25,8** | kWh | — | T5 ("19,7 kWh netos (25,8 kWh brutos)"), T6 | motor | OFFICIAL | **CONFLICTO**: T3 (ficha PDF oficial) dice "19,7 kWh neto (**26,8** kWh bruto)"; km77 (T18) dice 25,7. Se da prioridad a 25,8 (2 fuentes oficiales en texto). Pasa a revisión humana. |
| `bat.chemistry` | `NMC` | — | — | T3 ("Li-ion (NMC)") | motor | OFFICIAL | T5: 96 celdas prismáticas en 4 módulos de 24; batería de 120 kg. |
| `bat.heat_pump` | NOT FOUND | — | — | — | — | — | |
| `bat.warranty_years` / `bat.warranty_km` | NOT FOUND (PHEV) | — | — | T10 | marca | — | T10: "ocho años o 160.000 km (lo que suceda antes)", pero **referido a los coches eléctricos**. No dice nada de PHEV, así que no se aplica. |
| `bat.warranty_soh_pct` | NOT FOUND | % | — | T10 | — | — | T10 menciona el objetivo de diseño "70 % tras 10 años", que no es una garantía. |
| `chg.ac_max_kw` | **11** | kW | — | T3, T4, T5, T6 | motor | OFFICIAL | **Crítica (Charging): FOUND.** "Tiempo de carga AC 11 kW 0-100%: 2h 30min". |
| `chg.ac_phases` | NOT FOUND | — | — | — | — | — | 11 kW suele implicar trifásica, pero **no se infiere**. |
| `chg.dc_max_kw` | 50 | kW | — | T3 ("Tiempo de carga CC 50 kW 0-80%"), T4, T5, T6 | motor | OFFICIAL | km77 (T18) da **40 kW**, en conflicto (SECONDARY). |
| `chg.dc_10_80_min` | 26 | min | — | T4 ("DC charging (50 kW): 26 min (10-80%)"), T5, T6 | motor | OFFICIAL | T3 dice "0-80%" y T4/T5 "10-80%": **inconsistencia de ventana SOC** en fuentes oficiales. La clave está definida solo para BEV, ver §7-F7. |
| `chg.dc_connector` | NOT FOUND | — | — | — | — | — | |

### 2.3 Prestaciones, motor, dimensiones

| SpecKey | Valor | Unidad | Fuente | Granularidad | Provenance | Notas |
|---|---|---|---|---|---|---|
| `perf.power_max_kw` | 150 | kW | T1 ("150kW (204cv)"), T3, T4 | trim | OFFICIAL | **Crítica: FOUND.** Potencia del sistema. |
| `perf.torque_max_nm` | 350 | N·m | T3, T4, T5 | motor | OFFICIAL | Par del sistema. |
| `perf.accel_0_100_s` | 7,7 | s | T3, T4, T5, T6, T8 | motor | OFFICIAL | **Crítica: FOUND.** Sportstourer: 7,9. |
| `perf.top_speed_kmh` | 220 | km/h | T3, T4, T5 | motor | OFFICIAL | Velocidad máx. en eléctrico "hasta 140 km/h" (T5): **sin clave**. |
| `perf.power_ice_kw` | 110 | kW | T3 ("150 CV / 110 kW / 5.000 - 6.000"), T5 | motor | OFFICIAL | Par ICE: 250 N·m / 1.500–4.000 (T3), sin clave. |
| `perf.power_electric_kw` | 85 | kW | T3, T4, T5 | motor | OFFICIAL | Par eléctrico: 330 N·m (T3, T5), sin clave. |
| `pt.displacement_cc` | 1498 | cm³ | T3, T4 | motor | OFFICIAL | **Errata en T3**: la cabecera de la columna PHEV dice "**1.4** e-Hybrid 204 CV", pero la cilindrada es 1.498. |
| `pt.cylinders` | 4 | — | T3 ("4 cil - 16v"), T4 | motor | OFFICIAL | |
| `pt.gears` | 6 | — | T1 ("DSG-6"), T3 | motor | OFFICIAL | |
| `pt.fuel_tank_l` | **40** | L | T3 ("Capacidad depósito (l) 40") | motor/carrocería | OFFICIAL | **Crítica (Range PHEV): FOUND.** El ICE del mismo documento tiene 45 L. |
| `pt.fiscal_hp_es` | NOT FOUND | CVF | — | — | — | |
| `pt.timing_drive` | NOT FOUND | — | — | — | — | |
| `dim.length_mm` | 4368 | mm | T3 ("4368 / 1799 / 1460") | motor/carrocería | OFFICIAL | **Crítica: FOUND.** |
| `dim.width_mm` | 1799 | mm | T3 | motor/carrocería | OFFICIAL | Con o sin retrovisores: no se indica. |
| `dim.height_mm` | 1460 | mm | T3 | motor/carrocería | OFFICIAL | Las versiones ICE/eTSI del mismo PDF tienen 1456. |
| `dim.wheelbase_mm` | 2682 | mm | T3 | motor/carrocería | OFFICIAL | TSI/eTSI del mismo PDF: 2686. La diferencia no se explica. |
| `dim.turning_circle_m` | 10,8 | m | T3 | motor | OFFICIAL | "Diámetro giro entre ruedas": entre bordillos o paredes, no especificado. |
| `dim.kerb_weight_kg` | 1670 | kg | T3 ("Peso en orden de marcha (kg)") | motor | OFFICIAL | No dice si incluye conductor (75 kg). km77: 1670 (coincide). |
| `dim.gross_weight_kg` | 2130 | kg | T3 ("Peso máximo admisible") | motor | OFFICIAL | |
| `cap.boot_l` | **270** | L | T3 ("Capacitad maletero (l) 270") | motor/carrocería | OFFICIAL | **Crítica: FOUND.** **Método no declarado** (VDA/otro). ICE: 380 L. |
| `cap.boot_max_l` | 1187 | L | T18 (km77 "270-1.187") | trim | SECONDARY_REFERENCE | |
| `cap.isofix_positions` | 2 | — | T1 ("ISOFIX con Top Tether en las dos plazas traseras", equipamiento de serie Style) | trim | OFFICIAL | |
| `cap.towing_braked_kg` / `unbraked` | NOT FOUND | kg | — | — | — | |

### 2.4 Seguridad, ADAS, tecnología (trim Style, T1 salvo indicación)

| SpecKey | Valor | Fuente | Provenance | Notas |
|---|---|---|---|---|
| `saf.airbags_count` | 7 | T1 ("7 Airbags (2 delanteros + airbag central + 2 laterales + 2 cortina)"), T9 | OFFICIAL | Opcional "Airbag lateral trasero + Airbag de rodilla delantero" (T1). |
| `adas.aeb` | `standard` | T1 ("Asistente de frenada automática en ciudad con protección de peatones y ciclistas Front Assist") | OFFICIAL | |
| `adas.aeb_vru` | `standard` | T1 (misma línea) | OFFICIAL | |
| `adas.acc` | `optional` | T1 ("Safe & Driving pack M Navi: Control de crucero adaptativo y predictivo… Exclusivo para motorizaciones PHEV"; "Safe & Driving pack M… Requiere navegador") | OFFICIAL | Stop&Go: NOT FOUND. De serie: "Control de velocidad crucero" (no adaptativo). |
| `adas.lane_keep` | `standard` | T1 ("Asistente de salida involuntaria de carril Lane Assist") | OFFICIAL | Versión con "guía en el centro del carril": solo en el pack XL (FR XXL). |
| `adas.blind_spot` | `unknown` | T1 (incluido en "Safe & Driving pack XL", de serie en FR XXL e-HYBRID) | OFFICIAL | En Style no está claro si es opcional o no disponible. |
| `adas.rear_cross_traffic` | `unknown` | T1 (pack XL) | OFFICIAL | Ídem. |
| `adas.traffic_sign_recognition` | `standard` | T1 ("Reconocimiento de señales de tráfico") | OFFICIAL | |
| `adas.driver_monitoring` | `standard` | T1/T2 ("Detector/Sistema de detección de cansancio y distracciones") | OFFICIAL | |
| `adas.surround_camera` | `unknown` | — | — | Solo se vio "Cámara de visión trasera" (Paquete Visión Plus). |
| `tech.apple_carplay` / `tech.android_auto` | `standard_wireless` | T1 ("Full Link (Android Auto & Car Play) por cable e inalámbrico"), T9 | OFFICIAL | |
| `tech.center_screen_in` | 10,4 | T2 ("Radio Media System de 26,42cm (10,4'')"), T9 | OFFICIAL | Navegador 12,9" en FR. |
| `tech.digital_cluster` | `standard` | T2 ("Digital Cockpit de 26cm (10,25'') no configurable"), T9 | OFFICIAL | |
| `tech.connected_services` | `standard` | T2 ("SEAT Connect: Seguridad y servicio, acceso remoto"), T9 | OFFICIAL | |
| `tech.ota_updates` | NOT FOUND | — | — | |

### 2.5 Garantía y mantenimiento

| SpecKey | Valor | Fuente | Granularidad | Provenance | Notas |
|---|---|---|---|---|---|
| `war.years` | **3** | T10 ("3 primeros años sin coste extra para coches vendidos a partir de enero 2022") | mercado/marca | OFFICIAL | **Crítica (Warranty): FOUND.** |
| `war.km` | NOT FOUND | T10 | — | — | T10 no da límite de km para los 3 años. T1 lista extensiones "7 años (3+7 años) / 200.000 km — Exclusivo para motorizaciones PHEV", "(3+1) / 80.000 km", "(3+2) / 100.000 km". |
| `war.conditions` | "3 años sin coste; extensión hasta 10 años en total" | T10, T1 | mercado | OFFICIAL | |
| `mnt.service_interval_km` / `months` | 30.000 km / 24 meses (aceite); 15.000 km / 12 meses (mantenimiento general, "normalmente") | T10 | marca (no por motor) | OFFICIAL | Genérico de marca: no es seguro que aplique al PHEV. |

---

## 3. Precios (`vehicle_prices`)

| price_type | Valor | Moneda | Impuestos | Fecha | Fuente | Provenance | Notas |
|---|---|---|---|---|---|---|---|
| `current_new` — León 5P **Style e-HYBRID MY26.5** | **40.440** | EUR | "P.V.P RECOMENDADO"; IEDMT **0,00 %** (columna "IMP. MATRIC."). Inclusión de IVA **no declarada** en el texto extraído | valid_from **2026-05-07** ("En vigor 07/05/2026") | T1 | OFFICIAL | Tarifa de lista, **sin promociones ni MOVES**. Mismo precio en T2 (19/01/2026). Resto de la gama 5P en T1: Style XL 40.780 · Style XL Fleet Pack 43.860 · FR 41.850 · FR XXL 42.700. |
| (promoción, **no es `current_new`**) | "desde 29.290 €" (Style XS) | EUR | NOT FOUND | 2025-05-14 | T6 | OFFICIAL | Precio promocional de lanzamiento del Style. Condiciones no detalladas en lo extraído. |
| (incentivos, registrar aparte) | "24.790 €" con ayuda MOVES + achatarramiento | EUR | — | 2025-05-14 | T6 | OFFICIAL | T7 (nov. 2024): "Government incentives available: up to €10,000"; "Starting price €36,450 (with brand campaigns)". Hay que comprobar la vigencia de MOVES en 2026: NOT FOUND. |

La tarifa T1 es la más reciente encontrada (mayo 2026). A 2026-09-24 **no se ha encontrado una tarifa posterior**: el precio puede haber cambiado.

---

## 4. Seguridad (`safety_ratings`)

| authority | test_year | protocol_version | Estrellas | Adulto | Niño | VRU | Safety Assist | Variante / alcance | Fuente |
|---|---|---|---|---|---|---|---|---|---|
| Euro NCAP | **2020** | protocolo 2020–2022 (MPDB) | 5 | 92 % | 88 % | 71 % | 80 % | Ensayado "SEAT Leon 1.5 petrol 'XCELLENCE', LHD", 1294 kg; aplica, entre otras, a "1.4 petrol PHEV – e-Hybrid 4x2" (**PHEV pre-FL**) | T12 (publicado 2020-12-09; revisiones anuales 2021–2023) |
| Euro NCAP | **2025** | protocolo 2025 | 5 | NOT FOUND (SEAT) | NOT FOUND | NOT FOUND | NOT FOUND | T13: SEAT Leon "corporate twin to CUPRA Leon"; "Euro NCAP compared both vehicles to verify that the CUPRA Leon results can be applied to the SEAT and performed additional tests where necessary". Publicado 2025-11-17 | T13 |
| Euro NCAP (gemelo) | 2025 | protocolo 2025 | 5 | 88 % | 86 % | 82 % | 77 % | **CUPRA** Leon 2025; aplica a "1.5 TSI e-Hybrid 150kW – e-Hybrid 4x2" (CUPRA) | T14 |

Notas:
- El datasheet SEAT Leon 2025 (cdn.euroncap.com/media/93061/…) devuelve **404** el 2026-09-24. El título del resultado de búsqueda dice "88 % / 86 % / 81 % / 77 %", **no verificado** (y con VRU 81 frente a 82 del CUPRA). Por eso los porcentajes SEAT 2025 quedan NOT FOUND.
- Para DC-10 (FL 2024+), el rating que corresponde es **2025**. El de 2020 es de la fase pre-FL.

---

## 5. Recalls

| Campaña | Alcance | Fuente | ¿Afecta a DC-10? |
|---|---|---|---|
| Ninguna encontrada para Mk4 FL (fabricación 2024–2026) / 1.5 e-HYBRID | — | T17 (listado car-recalls.eu, 1.ª página) | **NOT FOUND** |
| Referencias Mk4 **pre-FL** vistas en el listado (solo como contexto): "Seat Leon (2020–2022) – A faulty fuse can cause an arc flash in the event of a short circuit" (16/05/2022); "Seat Leon (2020–2022) – baggage compartment load" (01/10/2022); "Seat Leon (2023) – engine mounts heat treatment" (07/11/2023) | pre-FL | T17 | No (periodo de fabricación anterior). No se abrió el detalle ni se verificó en Safety Gate. |

Fuente oficial (Safety Gate / DGT / SEAT ES) consultada directamente: **no**. Recalls oficiales: **NOT FOUND**.

---

## 6. Cobertura de claves críticas (PHEV, §4 del catálogo)

| Categoría | Clave crítica | Estado | Detalle |
|---|---|---|---|
| Economy / Range | `nrg.fuel_charge_sustaining_l100` | **NOT FOUND (ES)**. Hay un OFFICIAL de otro mercado (DE): 5,0–5,3 | **Bloquea Economy y Range.** |
| Economy / Range | `nrg.electric_combined_kwh100` | **FOUND** (homologación 2024/25: 15,5–16,3; etiqueta "ponderado") | El valor MY26.5 ES no se ha encontrado (DE: 12,8–13,0). |
| Economy / Range | `rng.electric_combined_km` | **FOUND** | 126–134 km WLTP (EAER/AER no declarado) |
| Economy | precio | **FOUND** | 40.440 € (T1, 07/05/2026) |
| Range | `pt.fuel_tank_l` | **FOUND** | 40 L |
| Charging | `chg.ac_max_kw` | **FOUND** | 11 kW |
| Performance | `perf.power_max_kw`, `perf.accel_0_100_s` | **FOUND** | 150 kW; 7,7 s |
| Size | `dim.length/width/height`, `cap.boot_l` | **FOUND** | 4368/1799/1460; 270 L (método no declarado) |
| Practicality | `seats` | **NOT FOUND** | |
| Eco | `emi.co2_combined_gkm` | **FOUND** | 27–31 g/km (MY26.5); histórico 8–9 |
| Eco | `emi.dgt_label_es` | **FOUND** (fabricante) | 0 |
| Safety | rating con protocolo | **FOUND** | Euro NCAP 2025, 5★ (porcentajes SEAT NOT FOUND; los del CUPRA gemelo sí) |
| Warranty | `war.years` | **FOUND** | 3 |

**Resumen**: 15 de 17 FOUND, 1 NOT FOUND (`seats`) y 1 NOT FOUND en ES con valor oficial en otro mercado (`nrg.fuel_charge_sustaining_l100`). Consecuencia: **Economy y Range no se activan para el PHEV** justo por la clave que el producto define como base del coste. Practicality tampoco (`seats`).

---

## 7. Fricciones con el catálogo

- **F1 — Consumo *charge-sustaining* no publicado en España.** En ES, las fichas, tarifas y la web de SEAT solo dan el **ponderado** (0,4 L) y el CO₂ ponderado. La cifra CS aparece en **Alemania** (Pkw-EnVKV: "bei entladener Batterie") porque allí es obligatorio. La regla "no copiar entre mercados" deja la clave crítica vacía. **Propuestas**:
  - (a) permitir `market_scope = EU_TYPE_APPROVAL` para valores de homologación (el CoC/WLTP es el mismo tipo UE), con `source_market = DE`;
  - o (b) buscar el CoC o la ficha ITV (campo de consumo CS) como fuente por `registration_record`.

  Términos que usan las fuentes: DE "Kraftstoffverbrauch bei entladener Batterie"; prensa ES "con batería descargada" / "modo híbrido". En la documentación oficial ES no se ha visto ninguno.
- **F2 — Dos homologaciones oficiales vigentes en 18 meses (8–9 → 27–31 g/km).** El mismo motor y trim cambia de CO₂/consumo ponderado sin cambio de nombre comercial (solo "MY26.5"). Hacen falta `valid_from`/`valid_to` por valor y un campo `homologation_ref` o `regulation` (p. ej. Euro 6e / 6e-bis / *utility factor*). Si no, VScar comparará valores de dos regímenes de ponderación distintos bajo el mismo "WLTP". **El enum `test_cycle` = WLTP no basta para PHEV**: propuesta `WLTP_PHEV_UF2017` / `WLTP_PHEV_UF2025` o `test_cycle_variant`.
- **F3 — La etiqueta "ponderado" en el consumo eléctrico.** La ficha oficial (T3) pone "CONSUMOS modo ELÉCTRICO · Ponderado (kWh/100 km)". En WLTP PHEV existen EC_AC,weighted, EC_AC,CD y EC (puro). La clave `nrg.electric_combined_kwh100` no distingue cuál es. Si es el ponderado, depende del UF y **no sirve para calcular el coste eléctrico real**. Propuesta: `nrg.electric_weighted_kwh100` separado de `nrg.electric_cd_kwh100` / `nrg.electric_pure_kwh100`.
- **F4 — EAER frente a AER.** Ninguna fuente oficial ES dice si 126–134 km es EAER o AER. T5 habla de "modo totalmente eléctrico", que literalmente sería AER. Propuesta: subtipo obligatorio `range_type = EAER | AER | AER_city | UNDECLARED` y aceptar `UNDECLARED`.
- **F5 — Rango en vez de valor único.** Todas las cifras WLTP vienen como **rango min–max** por configuración (126–134, 27–31, 15,5–16,3). El `SourcedValue` necesita `value_min` / `value_max` (o `value` + `range`). Hay que decidir qué valor usa el scoring (¿el peor caso?).
- **F6 — Claves que faltan y que las fuentes oficiales publican**:
  - autonomía total combinada (850–910 km);
  - velocidad máxima en eléctrico (140 km/h);
  - par ICE / par eléctrico;
  - tiempo de carga AC 0–100 % (2 h 30);
  - CO₂ y clase CO₂ con batería descargada (DE);
  - garantía de batería PHEV (sin fuente, y T10 la limita a eléctricos).
- **F7 — `chg.dc_10_80_min` definida solo para BEV.** Este PHEV tiene DC 50 kW y 26 min oficiales. Además, las fuentes oficiales dicen unas "0–80 %" y otras "10–80 %". Propuestas: PT = `BEV, PHEV` y un campo `soc_window`.
- **F8 — Conflictos oficial–oficial en la batería bruta** (25,8 frente a 26,8 kWh) y la errata "1.4 e-Hybrid" en la ficha. Hace falta flujo de `conflict` con prioridad por fuente (texto de prensa vs ficha PDF) y revisión humana.
- **F9 — Enum `emissions_standard` incompleto.** Falta `Euro6e`, `Euro6e-bis`, `Euro6e-bis-FCM`. Además la fuente de "Euro 6e-bis" (may. 2025) coexiste con CO₂ 8–9 g/km: no queda claro qué valor corresponde a qué norma.
- **F10 — Rating de seguridad por gemelo corporativo.** El rating SEAT 2025 se deriva de los tests del CUPRA. Los porcentajes oficiales del SEAT no se han podido obtener y los del CUPRA no son del mismo modelo. Propuesta: campo `rating_source_model` / `derived_from_twin` en `safety_ratings`.
- **F11 — Trims efímeros.** En 12 meses los trims pasan de Style XS/XM/XL a Style/Style XM/XL a Style/Style XL/Fleet Pack. El `trim_name` del Reference Variant necesita alias o validez temporal.
- **F12 — Granularidad del precio.** La tarifa da PVP recomendado con IEDMT 0 % (PHEV), pero el texto extraído no declara si incluye IVA. Las promociones y el MOVES solo aparecen en notas de prensa, no en la tarifa. `incl_taxes` debería admitir `UNDECLARED`.
- **F13 — Etiqueta DGT y ciclo.** El umbral de 40 km de la DGT se definió en NEDC. La Instrucción 2018/V-128 (T16) aplicó hasta el 28/02/2021 un factor de conversión 1,25 a la autonomía WLTP y lo anota en el **campo P.3 de la ficha ITV electrónica**. La etiqueta real depende del registro (matrícula/ficha ITV), no de la variant. Refuerza Q4: la fuente adecuada es `registration_record`.
- **F14 — `seats` crítico sin fuente** también en el PHEV actual (igual que en DC-09).
