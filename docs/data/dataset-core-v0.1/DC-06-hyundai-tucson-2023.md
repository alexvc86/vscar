# DC-06 — Hyundai Tucson 1.6 T-GDI HEV 230 CV 2023 (ES) · NX4 pre-facelift

> Caso: **SUV generalista reciente** · pareja "older premium vs newer mainstream" con [DC-05](DC-05-bmw-x3-2018.md)
> Curación: 2026-09-24 · Fecha de consulta de todas las fuentes: **2026-09-24** · Estado: borrador de curación (no publicado)
> Catálogo: [SPEC_KEY_CATALOG.md v0.1](../SPEC_KEY_CATALOG.md)

## Fuentes consultadas (IDs usados en las tablas)

| ID | Fuente | URL | Tipo | Granularidad |
|---|---|---|---|---|
| H1 | Hyundai Motor España — Catálogo TUCSON (PDF, "Copyright Hyundai España, febrero 2024"), enlazado desde la página "Descarga catálogo" de TUCSON Híbrido | https://dmassets.hyundai.com/is/content/hyundaiautoever/tucson_202402pdf (página de enlace archivada: https://web.archive.org/web/20240221121315/https://www.hyundai.com/es/es/modelos/tucson-hibrido/descarga-catalogo.html) | Fabricante ES | engine × trim (tabla de acabados) |
| H2 | Hyundai Motor Europe — "Technical Data all-new Tucson" (PDF, 14/09/2020, *tentative data*) | https://www.hyundai.news/newsroom/dam/eu/press-kits/20200915_all-new_tucson/15092020_Technical_Data_all-new_Tucson.pdf | Fabricante EU | engine |
| H3 | hyundai.com/es — página TUCSON Híbrido (captura Wayback 13/12/2023) | https://web.archive.org/web/20231213122148/https://www.hyundai.com/es/es/modelos/tucson-hibrido.html | Fabricante ES | model |
| H4 | IDAE — base de datos de consumo, registro "Hyundai TUCSON 1.6 TGDI 230CV HEV AT TECNO 2C" (id interno 550852) y resto de filas HEV | https://coches.idae.es/base-datos/marca-y-modelo (marca Hyundai → modelo "TUCSON"; listado WLTP/eléctrico + ficha de detalle vía `coches.idae.es/ajax`) | Autoridad ES | registration_record (trim) |
| H5 | Euro NCAP — Hyundai TUCSON 2021 | https://www.euroncap.com/en/results/hyundai/tucson/43815 | Autoridad | model/generation |
| H6 | Euro NCAP datasheet TUCSON (Oct 2021, v181021), alojado por Hyundai | https://www.hyundai.news/newsroom/dam/de/Modelle/20211028_euro_ncap_tucson_ioniq_5_bayon/hyundai-tucson-2021-euro-ncap-datasheet.pdf | Autoridad (doc. Euro NCAP) | model |
| H7 | DGT — Etiqueta ambiental ECO | https://www.dgt.es/nuestros-servicios/tu-vehiculo/tus-vehiculos/distintivo-ambiental/etiqueta-eco/ | Autoridad ES | regla |
| H8 | EU Safety Gate — alerta SR/01460/25 | https://ec.europa.eu/safety-gate-alerts/screen/webReport/alertDetail/10093916 (datos vía `public/api/notification/10093916`) | Autoridad UE | recall (VIN/producción) |
| X1 | km77 — Tucson Tecno Híbrido 1.6 T-GDI HEV 230 CV 6AT (2020-2024) | https://www.km77.com/coches/hyundai/tucson/2021/estandar/hev/tucson-tecno-16-hibrido-t-gdi-hev-230-cv-6at/datos | **Terceros** | trim |
| X2 | car-recalls.eu — Tucson | https://car-recalls.eu/model/tucson/ | **Terceros** | model |

**Nota sobre H1**: es el catálogo ES oficial más cercano a MY2023 que se pudo obtener; está fechado **febrero 2024** pero sigue describiendo el HEV de **230 CV** (pre-facelift; según títulos de fichas km77 —SECONDARY— el facelift ES ofrece 215/239 CV). Se asume vigente para MY2023, supuesto a validar (ver §7 F10).

---

## 1. Identidad resuelta

| Campo | Valor | Fuente | Notas |
|---|---|---|---|
| market_code | `ES` | H1, H4 | |
| manufacturer | Hyundai | H1 | |
| model | Tucson | H1 | |
| generation_code | `NX4` (versión europea "NX4e") | H8 ("Model (Type): Tucson (NX4e)"); H3 (nombres de imagen "NX4_exterior…") | |
| facelift / fase | pre-facelift | H1 (230 CV); H4 distingue "TUCSON" de "TUCSON FL" | |
| sales_start / sales_end (ES) | NOT FOUND (oficial) · 2020–2024 (SECONDARY) | X1 | Presentación europea: H2 fechado 14/09/2020 |
| model_year | 2023 | — | |
| trim_name | **Tecno** (4x2) | H1, H4 | Registro IDAE de referencia: "TECNO 2C" (bicolor). "TECNO SKY" (techo solar) tiene los mismos consumo/CO₂ |
| powertrain_type | `HEV` | H1 ("HEV"), H4 ("Híbridos de gasolina") | |
| fuel_type | `petrol` | H1 ("Turbo gasolina…") | |
| drivetrain | `FWD` | H1 ("Tracción delantera + TCS") | 4x4 solo en Style 4x4 en la gama HEV |
| transmission | `automatic` | H1 ("Automático de 6 velocidades"); H4 ("Automático") | Automático convencional de 6 marchas, no e-CVT |
| body_type | `suv` | H6 ("5 door SUV"); H4 segmento "Todoterreno Pequeño" | |
| seats | 5 | H4 ("Nº de Plazas Máximas 5") | |
| doors | 5 | H6 | |
| emissions_standard | `Euro6d` | H2 ("EU E6D"); H3 ("cumplen con los estándares de emisión Euro 6d") | Sin distinguir 6d / 6d-ISC-FCM |

---

## 2. Tabla de valores

| SpecKey | Valor | Unidad canónica | Ciclo | Fuente | URL | Granularidad | Provenance | Notas |
|---|---|---|---|---|---|---|---|---|
| dim.length_mm | 4500 | mm | — | H1 | tucson_202402pdf | model | OFFICIAL | = H2, H4 |
| dim.width_mm | 1865 | mm | — | H1 | idem | model | OFFICIAL | = H2, H4 |
| dim.width_mirrors_mm | NOT FOUND | mm | — | — | — | — | — | |
| dim.height_mm | 1650 | mm | — | H1 | idem | model | OFFICIAL | H2: "1,650/1651 with/without roof rack" |
| dim.wheelbase_mm | 2680 | mm | — | H1 | idem | model | OFFICIAL | = H2 |
| dim.ground_clearance_mm | 170 | mm | — | H1 | idem | model | OFFICIAL | "Altura libre al suelo: 170 mm" |
| dim.turning_circle_m | NOT FOUND | m | — | — | — | — | — | H2: "Turning radius 5.46 m" (radio, no diámetro). H1 etiqueta "Diámetro de giro 5,5" y "Radio de giro 2,51" (2,41 = vueltas de volante en H2): **etiquetas erróneas** en H1. No se deriva el diámetro |
| dim.kerb_weight_kg | 1564 | kg | — | H1 | idem | engine (FWD) | OFFICIAL | "Tara mínima 1.564" (4x4: 1.634). H2: curb weight 1,564–1,685 (FWD). Definición (con/sin conductor) no declarada |
| dim.gross_weight_kg | 2175 | kg | — | H1 | idem | engine (FWD) | OFFICIAL | = H2, = IDAE "MTMA 2.175" (Tecno); 4x4: 2.245 |
| cap.boot_l | 616 | L | — | H1 | idem | engine (HEV) | OFFICIAL | **VDA** declarado ("Capacidad maletero (litros) (VDA) 616/1.795"); = H2 |
| cap.boot_max_l | 1795 | L | — | H1 | idem | engine | OFFICIAL | VDA |
| cap.payload_kg | 490–611 (rango) | kg | — | H2 | 15092020_Technical_Data | engine (FWD) | OFFICIAL | EU, *tentative data* 2020 |
| cap.towing_braked_kg | 1650 | kg | — | H1 | tucson_202402pdf | engine (HEV) | OFFICIAL | H2 tiene las filas **invertidas** (braked 750 / unbraked 1,650) |
| cap.towing_unbraked_kg | 750 | kg | — | H1 | idem | engine | OFFICIAL | |
| cap.roof_load_kg | 100 | kg | — | H2 | idem H2 | engine | OFFICIAL | |
| cap.isofix_positions | NOT FOUND | — | — | — | — | — | — | H6 muestra ISOFIX/i-Size por plaza solo como iconos (no legible) |
| cap.third_row | NOT FOUND | — | — | — | — | — | — | 5 plazas (H4) |
| perf.power_max_kw | 169.1 | kW | — | H2 | idem H2 | engine | OFFICIAL | "230 / 169.1 PS/kW (for HEV: combined)". H1: "Potencia total combinada 230 cv / 5.500". **IDAE (H4) publica "Potencia 179,5 cv" = solo motor térmico** |
| perf.torque_max_nm | 350 | N·m | — | H1 | tucson_202402pdf | engine | OFFICIAL | "Par máximo combinado 350 / 1.500-4.500" |
| perf.accel_0_100_s | 8.0 | s | — | H1 | idem | engine (FWD) | OFFICIAL | = H2 ("8 {8.3}"); 4x4: 8,3 |
| perf.top_speed_kmh | 193 | km/h | — | H1 | idem | engine | OFFICIAL | = H2 |
| perf.power_ice_kw | 132.4 | kW | — | H1 | idem | engine | OFFICIAL | "132,4 / 5.500" (180 cv). IDAE: 132,0 kW |
| perf.power_electric_kw | 44.2 | kW | — | H1 | idem | engine | OFFICIAL | = H2; IDAE Tecno 2C 44,2 kW pero **44,0 kW** en Tecno Sky, Style, Maxx Safe (incoherencia en IDAE) |
| pt.displacement_cc | 1598 | cm³ | — | H1 | idem | engine | OFFICIAL | = H4 |
| pt.cylinders | 4 | — | — | H1 | idem | engine | OFFICIAL | |
| pt.fuel_tank_l | 54 | L | — | H1 | idem | engine (HEV) | OFFICIAL | **CONFLICTO** con X1 (km77): 52 L → publicar 54 (oficial) y registrar conflicto |
| pt.gears | 6 | — | — | H1 | idem | engine | OFFICIAL | |
| pt.fiscal_hp_es | NOT FOUND | CVF | — | — | — | — | — | |
| pt.timing_drive | `chain` | enum | — | H1 | idem | engine | OFFICIAL | "Distribución Cadena / 4 válvulas por cilindro" |
| nrg.fuel_combined_l100 | 5.7 | L/100 km | **WLTP** | H1 | idem | trim (Tecno / Tecno Sky 4x2) | OFFICIAL | = H4 ("Consumo medio mixto según ciclo WLTP 5,70"). Maxx 5,6 · N Line Sky 5,8 · Style 4x2 5,7 · Style 4x4 6,4 |
| nrg.fuel_urban_l100 | NOT FOUND | L/100 km | — | — | — | — | — | Solo existen fases WLTP; el catálogo prohíbe asumir la equivalencia urbano ↔ Low |
| nrg.fuel_extra_urban_l100 | NOT FOUND | L/100 km | — | — | — | — | — | ídem |
| nrg.fuel_wltp_low_l100 | 5.8 | L/100 km | WLTP | H1 | idem | trim (Tecno) | OFFICIAL | "Bajo" |
| nrg.fuel_wltp_medium_l100 | 4.8 | L/100 km | WLTP | H1 | idem | trim (Tecno) | OFFICIAL | "Medio" |
| nrg.fuel_wltp_high_l100 | 4.9 | L/100 km | WLTP | H1 | idem | trim (Tecno) | OFFICIAL | "Alto" |
| nrg.fuel_wltp_extra_high_l100 | 6.9 | L/100 km | WLTP | H1 | idem | trim (Tecno) | OFFICIAL | "Extra-alto" |
| emi.co2_combined_gkm | 130 | g/km | **WLTP** | H1 | idem | trim (Tecno) | OFFICIAL | = H4 (Tecno 2C y Tecno Sky: 130). Maxx 127 · N Line Sky 131 · Style 4x2 131 · Style 4x4 145 |
| emi.dgt_label_es | `ECO` | — | — | H7 (regla) | dgt.es/.../etiqueta-eco/ | regla (HEV + gasolina Euro 6) | **CALCULATED** | X1 muestra "ECO" (SECONDARY). Sin consulta oficial por variante |
| saf.ncap_stars | 5 | 0–5 | — | H5 | euroncap.com/.../43815 | model | OFFICIAL | |
| saf.ncap_adult_pct | 86 | % | — | H5, H6 | — | model | OFFICIAL | 33,0 pts |
| saf.ncap_child_pct | 87 | % | — | H5, H6 | — | model | OFFICIAL | 42,8 pts |
| saf.ncap_vru_pct | 66 | % | — | H5, H6 | — | model | OFFICIAL | |
| saf.ncap_assist_pct | 70 | % | — | H5, H6 | — | model | OFFICIAL | |
| saf.airbags_count | NOT FOUND | — | — | — | — | — | — | H1 lista: conductor y acompañante, laterales delanteros, cortina, central delantero (sin número) |
| adas.aeb | `standard` | enum | — | H1 | tucson_202402pdf | trim (Tecno) | OFFICIAL | "FCA (detección de vehículos, peatones y ciclistas)" S en todas; Tecno además "FCA con función giro" S |
| adas.aeb_vru | `standard` | enum | — | H1 | idem | trim | OFFICIAL | ídem |
| adas.acc | `standard` (stop&go) | enum | — | H1 | idem | trim (Tecno, cambio automático) | OFFICIAL | "Control de crucero inteligente con Stop & Go" Tecno = S⁶ ("De serie en versiones con cambio automático") |
| adas.lane_keep | `standard` | enum | — | H1 | idem | trim | OFFICIAL | LKA + LFA de serie |
| adas.blind_spot | `standard` | enum | — | H1 | idem | trim (Tecno HEV) | OFFICIAL | "Sistema activo de detección de ángulos muertos con alerta de tráfico trasero" Tecno = S² ("Solo HEV y PHEV") |
| adas.rear_cross_traffic | `standard` | enum | — | H1 | idem | trim (Tecno HEV) | OFFICIAL | misma línea que blind_spot |
| adas.traffic_sign_recognition | `standard` | enum | — | H1 | idem | trim | OFFICIAL | |
| adas.driver_monitoring | `standard` | enum | — | H1 | idem | trim | OFFICIAL | "sensor de fatiga conductor" (DAW); Euro NCAP: basado en dirección |
| adas.surround_camera | `not_available` | enum | — | H1 | idem | trim (Tecno) | OFFICIAL | "Monitor 360°" solo Style |
| tech.apple_carplay | `standard` (cableado/inalámbrico: no declarado) | enum | — | H1 | idem | trim (Tecno) | OFFICIAL | "Equipo audio/navegador… 26 cm (10,25") Bluelink/Android Auto/Apple CarPlay" S. El enum exige `standard_wired` o `standard_wireless` → no resoluble |
| tech.android_auto | `standard` (cableado/inalámbrico: no declarado) | enum | — | H1 | idem | trim | OFFICIAL | ídem |
| tech.center_screen_in | 10.25 | in | — | H1 | idem | trim (Tecno) | OFFICIAL | Klass/Maxx: 8" |
| tech.digital_cluster | `standard` | enum | — | H1 | idem | trim (Tecno) | OFFICIAL | "Pantalla multifunción del cuadro a color de 26,03 cm (10,25")" |
| tech.connected_services | `standard` | enum | — | H1 | idem | trim (Tecno) | OFFICIAL | Bluelink con navegador; "suscripción gratuita durante cinco años a los servicios LIVE" |
| tech.ota_updates | `unknown` | enum | — | H1 | idem | — | — | H1 describe actualización de mapas en concesionario o vía web (update.hyundai.com), no OTA |
| war.years | 5 | años | — | H1; H3 | tucson_202402pdf; Wayback 20231213 | market (marca) | OFFICIAL | "5 años de garantía sin límite de kilómetros" (garantía comercial Hyundai Motor España) |
| war.km | ilimitado (`null`) | km | — | H1; H3 | idem | market | OFFICIAL | La fuente lo dice explícitamente |
| war.conditions | Solo vehículos vendidos por la red oficial en España (excl. Canarias, Ceuta, Melilla); excl. taxi/VTC/alquiler y piezas de desgaste | text | — | H1 | idem | market | OFFICIAL | |
| bat.warranty_years *(HEV)* | 8 | años | — | H1 | idem | market | OFFICIAL | "La batería de alto voltaje de tu coche híbrido eléctrico… garantía de 8 años" — **clave fuera de aplicabilidad** (catálogo: PHEV/BEV) |
| bat.warranty_km *(HEV)* | 160000 | km | — | H1 | idem | market | OFFICIAL | "Limitado a 8 años o 160.000 km". Misma salvedad |
| bat.gross_kwh *(HEV)* | 1.49 | kWh | — | H1; H2 | — | engine | OFFICIAL | Batería polímero de iones de litio, 270 V. IDAE: 1,5. Clave no aplicable a HEV en el catálogo |
| mnt.service_interval_km / _months | NOT FOUND | — | — | — | — | — | — | |

No aplicables (HEV): `chg.*`, `rng.*`, `nrg.electric_*`, `nrg.phev_*`, `nrg.fuel_charge_sustaining_l100`, `bat.usable_kwh`, `cap.frunk_l`.

Datos adicionales vistos sin SpecKey: par del motor eléctrico 265 N·m (H2; H1 lo imprime como "264/1.500-4.500", aparente copia del par térmico); ángulos de ataque/salida/ventral 17,4° / 25,7° / 16,7° (H1); modos de conducción, e-call de serie, "Alerta de salida segura" (H1).

---

## 3. Precios

| price_type | Importe | Moneda | Impuestos | Fecha | Trim | Fuente | Provenance | Notas |
|---|---|---|---|---|---|---|---|---|
| `original_list` MY2023 | **NOT FOUND** | — | — | — | Tecno 4x2 | — | — | No se localizó tarifa oficial Hyundai España 2023 (ni PDF de tarifa ni nota de prensa con precios) |
| Precio "desde" en hyundai.com/es | 33.825 | EUR | no declarado | captura 13/12/2023 | TUCSON Híbrido (trim no indicado) | H3 | OFFICIAL, **excluido** | Precio promocional/"desde" junto a ofertas de financiación → no es `original_list` |
| Precio tarifa (referencia) | 44.575 | EUR | incluidos (según X1) | tarifa 03/2024 | Tecno Híbrido 4x2 | X1 | **SECONDARY_REFERENCE** | No es MY2023 y no es oficial; no publicable |

---

## 4. Seguridad

| authority | stars | adult | child | VRU | safety assist | test_year | protocol | tested variant | estado |
|---|---|---|---|---|---|---|---|---|---|
| Euro NCAP | 5 | 86 % | 87 % | 66 % | 70 % | **2021** (datasheet Oct 2021, v181021) | Euro NCAP 2020–2022 (rating year 2021) | Hyundai TUCSON **1.6 T-GDI HEV GLS, LHD (4x4)**, kerb weight 1.633 kg, clase Small Off-Road | vigente (no marcado como expirado); "VIN from which rating applies: all TUCSONs" |

- Equipamiento de serie considerado (H5/H6): airbag central delantero, AEB car-to-car y VRU, AEB peatón en marcha atrás, asistente de carril, asistencia de velocidad, detección de fatiga, recordatorio de cinturón en todas las plazas, capó activo, eCall avanzado, frenada multicolisión.
- El vehículo probado es 4x4 y de nivel "GLS" (denominación no española); el rating aplica a todos los Tucson → se asigna al Tecno 4x2 como `model`-level.
- **No comparable** con el rating 2017 del X3 (DC-05): protocolos distintos (2017 vs 2020–2022). El datasheet 2021 (H6) incluye ensayos "Mobile Progressive Deformable Barrier" y "Far-Side Excursion"; el datasheet 2017 del X3 no se pudo descargar (la URL de cdn.euroncap.com devolvió un documento no-PDF), así que la diferencia de ensayos no se ha verificado.

---

## 5. Recalls

| Fuente | Referencia | Fecha publ. | Alcance | Riesgo | ¿Afecta a DC-06? | Provenance |
|---|---|---|---|---|---|---|
| EU Safety Gate (H8) | **SR/01460/25** (notifica Portugal; código Hyundai 41DC22) | 10/04/2025 | "Tucson (NX4e). Model Year: 2022–2023", VIN TMAJA81BVNJ254096 → TMAJC81BGPJ401001, producción 12/09/2022–07/09/2023, homologación e5*2018/858*00001*06 | Cable positivo 12 V puede dañarse con el soporte de la ECM en choque frontal → cortocircuito y riesgo de incendio post-colisión | **Probable** para MY2023 (el rango incluye 2023); la alerta no especifica motorización. España no figura entre los países que reaccionaron | OFFICIAL |
| car-recalls.eu (X2) | — | 01/04/2024 | Tucson producción 2021–2023 | Airbag de cortina mal instalado | posible | SECONDARY_REFERENCE |
| car-recalls.eu (X2) | — | 20/05/2024 | producción 2022–2023 | Antiatrapamiento de elevalunas trasero | posible | SECONDARY_REFERENCE |
| car-recalls.eu (X2) | — | 20/04/2025 | producción 2022–2023 | Bomba de vacío del servofreno | desconocido para HEV | SECONDARY_REFERENCE |
| Recalls específicos en España | NOT FOUND | — | — | — | — | — |

---

## 6. Cobertura de claves críticas (HEV)

| Categoría | Clave crítica | Estado | Comentario |
|---|---|---|---|
| Economy / Range / Eco | `nrg.fuel_combined_l100` | **FOUND** | 5,7 L/100 km WLTP (H1 = H4) |
| Economy | precio (`original_list`) | **NOT FOUND** (solo SECONDARY, y de 03/2024) | Economy **no activable** |
| Range | `pt.fuel_tank_l` | **FOUND** (conflicto con secundaria) | 54 L oficial vs 52 L km77 |
| Performance | `perf.power_max_kw` | **FOUND** | 169,1 kW sistema (cuidado: IDAE da solo térmico) |
| Performance | `perf.accel_0_100_s` | **FOUND** | 8,0 s |
| Size | `dim.length_mm` / `dim.width_mm` / `dim.height_mm` | **FOUND** | 4500 / 1865 / 1650 |
| Size / Practicality | `cap.boot_l` | **FOUND** | 616 L VDA |
| Practicality | `seats` | **FOUND** | 5 |
| Eco | `emi.co2_combined_gkm` | **FOUND** | 130 g/km WLTP |
| Eco | `emi.dgt_label_es` | **FOUND como CALCULATED** (SECONDARY confirma ECO) | |
| Safety | rating con protocolo | **FOUND** | Euro NCAP 2021, 5★ (+ 8 claves `adas.*` conocidas) |
| Warranty | `war.years` | **FOUND** | 5 años, km ilimitados |

Resultado: **11/12 claves críticas con valor oficial**; falta el **precio original** → Economy NOT AVAILABLE ("missing original_list price"). Resto de categorías activables.

---

## 7. Fricciones con el catálogo

| # | Tipo | Descripción | Propuesta |
|---|---|---|---|
| F1 | Aplicabilidad HEV | `bat.gross_kwh`, `bat.warranty_years`, `bat.warranty_km` son PHEV/BEV, pero el HEV tiene batería de 1,49 kWh y **garantía de batería 8 años/160.000 km** oficial, relevante para usados. | Ampliar PT de `bat.gross_kwh` y `bat.warranty_*` a HEV |
| F2 | Potencia de sistema | IDAE (autoridad) publica "Potencia 179,5 cv" = **solo térmico** en un HEV de 230 cv; si el pipeline toma IDAE como fuente preferente de `perf.power_max_kw`, el dato sería erróneo. IDAE además da 44,0 vs 44,2 kW eléctricos según acabado. | Mapear IDAE "Potencia" → `perf.power_ice_kw`; nunca a `perf.power_max_kw` en HEV/PHEV (responde a Q1) |
| F3 | Radio vs diámetro de giro | El catálogo oficial ES etiqueta mal ("Diámetro 5,5 m", "Radio 2,51"); la ficha EU da **radio** 5,46 m. `dim.turning_circle_m` solo admite diámetro. | Clave `dim.turning_radius_m` o campo `measure: radius/diameter`; validación de rango (diámetro SUV ≈ 10–12,5 m) |
| F4 | Errores de fuente oficial | Ficha EU con remolque con/sin freno **invertidos**; catálogo ES con par eléctrico = par térmico. | Reglas de plausibilidad (unbraked ≤ braked) en `@vscar/quality` |
| F5 | Fases WLTP vs urbano/extraurbano | Solo hay fases Low/Medium/High/Extra-High; `nrg.fuel_urban_l100` y `_extra_urban_l100` quedan vacías aunque "Economy (City/Highway)" las usa. En HEV la fase Low (5,8) es **peor** que Medium (4,8), contra la intuición "urbano = mejor para híbridos". | Documentar en metodología qué fase alimenta City/Highway para WLTP; no rellenar las claves genéricas |
| F6 | Granularidad por trim | Consumo/CO₂ WLTP cambian por acabado (127–145 g/km) y por llanta; el catálogo agrupa trims ("TECNO / TECNO SKY"); IDAE da un registro por sub-acabado (2C, SKY, SAFE…). | Reference Variant = trim + llanta; admitir mapeo 1:N a registros IDAE |
| F7 | Enum infotainment | La fuente dice "Android Auto/Apple CarPlay" de serie sin indicar si es cableado o inalámbrico; el enum obliga a elegir `standard_wired`/`standard_wireless`. | Añadir `standard` (conexión sin especificar) |
| F8 | Precio | No hay tarifa oficial 2023 localizable; la web oficial solo muestra "Desde" con financiación. Para modelos recientes y generalistas el `original_list` es más difícil de obtener que para el premium 2018. | Fuente de tarifas archivadas (BOE/Hacienda precios medios de venta, prensa) como VERIFIED; política para "precio desde" |
| F9 | Masa | "Tara mínima" (catálogo ES) vs "curb weight" rango (EU) vs 1.633 kg (vehículo Euro NCAP 4x4). Norma no declarada. | Campo `mass_standard`; admitir rango |
| F10 | Fecha de documento vs MY | El catálogo ES utilizado es de **02/2024** para un MY2023. No hay campo que registre el desfase ni la vigencia del documento. | `valid_from/valid_to` del documento en el SourcedValue |
| F11 | Seguridad | Vehículo testado (4x4, "GLS") ≠ variant curada (4x2 Tecno); el rating aplica a "all TUCSONs". | Campo `tested_variant` + `applies_to` en `safety_ratings` |
| F12 | Recalls | Safety Gate identifica por VIN/fechas de producción y tipo (NX4e), no por motor ni MY exacto; España no aparece como país que reacciona aunque el vehículo se vende aquí. | Modelo de recall por rango de producción/VIN; flag `market_confirmed` |
| F13 | DGT | Etiqueta derivada por regla (HEV → ECO); solo terceros la publican por versión. | Confirmar Q4 (CALCULATED con regla) |
| F14 | Claves que faltan | Sin clave para `airbags` como lista, ni para "e-call", "alerta de salida segura", "detector de plazas traseras", relevantes para Family/Safety y para medir la brecha tecnológica vs DC-05. | Valorar ampliación `adas.*`/`saf.*` en v0.2 (Q5) |

---

## Anexo — brecha tecnológica DC-05 vs DC-06 (solo con datos oficiales)

| Elemento | X3 xDrive20d 2018 (base) | Tucson HEV 2023 (Tecno) |
|---|---|---|
| ACC | optional (paquete) | standard (stop&go) |
| Mantenimiento de carril | optional (Driving Assistant Plus) | standard |
| Ángulo muerto / tráfico trasero | unknown | standard |
| Reconocimiento de señales / fatiga | unknown | standard |
| CarPlay / Android Auto | unknown en ES | standard (ambos) |
| Pantalla central | NOT FOUND (ES) | 10,25" |
| Euro NCAP | 5★ 2017 (expirado) | 5★ 2021 |
| Garantía | 3 años (3.º ≤ 200.000 km) | 5 años km ilimitados + 8 años/160.000 km batería |
| Consumo combinado | 5,0–5,4 L/100 km **NEDC** | 5,7 L/100 km **WLTP** → `NOT_DIRECTLY_COMPARABLE` |
