# DC-04 — Volkswagen Golf actual (ES, 2026) · 1.5 eTSI 110 kW (150 CV) DSG 7 · Style

> Estado: **CURADO (borrador v0.1)** · Fecha de consulta de todas las fuentes: **2026-09-24** · Curador: agente de datos VScar
> Catálogo: [SPEC_KEY_CATALOG.md v0.1](../SPEC_KEY_CATALOG.md) · Reglas: [README §3](README.md)
> Powertrain: **MHEV** (48 V) → claves críticas de la columna ICE/MHEV/HEV (§4 del catálogo).

**Trim elegido: Style** (acabado del configurador VW ES con el 1.5 eTSI 150 CV DSG y con todos los datos técnicos, WLTP por fases y precio desglosado). La configuración base del configurador corresponde a **año modelo 2027** (campo `year` del catálogo de modelos de VW ES).

Fuentes usadas:

| Id | Fuente | URL | Tipo |
|---|---|---|---|
| VWES-CFG | Configurador Volkswagen España — Golf Style (página) | https://www.volkswagen.es/es/configurador.html/__app/golf/golf/golf-style.app | OFFICIAL |
| VWES-API-MOD | Datos del configurador VW ES (catálogo de modelos con `fetchTechnical`, `fetchWltp`, `fetchPrices`), modelo **"Golf Style 1.5 eTSI 110 kW (150 CV) Automático DSG 7 vel."**, código `DA14EM…`, `year` 2027, `pasDataIdentifier` 8856f53ba396eca9effb63f60f8b44a3 | https://cdn.oneapi.volkswagen.com/viso/catalogue/models?tenant=ihdcc-vw-es-es&salesgroupKey=36279&carlineKey=30602&modelFilters=EquipmentLine%3AStyle&fetchPrices=true&fetchTechnical=true&fetchWltp=true | OFFICIAL (endpoint que alimenta la página VWES-CFG; capturado con navegador headless) |
| VWES-API-PRC | Desglose de precio del configurador para ese modelo | https://cdn.oneapi.volkswagen.com/vcso/configPrices/8856f53ba396eca9effb63f60f8b44a3?tenant=ihdcc-vw-es-es | OFFICIAL |
| VWES-API-EQ | Equipamiento de serie/opcional del configurador (configStart, modelKey `DA14EM…`, modelYear 2027) | https://cdn.oneapi.volkswagen.com/vcso/configStart?tenant=ihdcc-vw-es-es&carlineKey=30602&salesgroupKey=36279&trimName=Style&modelYear=2027&modelKey=DA14EM… | OFFICIAL |
| VWES-G8 | volkswagen.es — página "Golf 8" (gama, ofertas, textos legales) | https://www.volkswagen.es/es/modelos/golf-8.html | OFFICIAL |
| VWES-PR24 | VW España, nota de prensa "Nuevo Golf: más Golf que nunca 50 años después", 15-04-2024 | https://www.volkswagen.es/comunicacion/nuevo-golf-mas-golf-que-nunca-50-anos-despues/ | OFFICIAL |
| VWES-WAR | volkswagen.es — "Garantía del fabricante" + capa "Coberturas" | https://www.volkswagen.es/es/clientes/beneficios-volkswagen/garantia-fabricante.html | OFFICIAL |
| VWNR-WP | Volkswagen Newsroom — "The new Golf – World premiere", 24-01-2024 | https://www.volkswagen-newsroom.com/en/the-new-golf-world-premiere-18074 | OFFICIAL |
| IDAE | IDAE — Base de datos de consumo de carburantes y emisiones (tabla "CICLO WLTP", marca Volkswagen Turismos; ficha detalle id 607306 "Golf 8 PA MY26 Golf Style 1.5 eTSI 110 kW (150 CV) Automático DSG 7 vel.") | https://coches.idae.es/base-datos/marca-y-modelo | OFFICIAL (organismo público ES) |
| EEA25P | EEA — CO2 monitoring 2025 **provisional** (`co2cars_2025Pv31`), MS=ES, Cn LIKE 'GOLF%', Ep=110 kW, Ec≈1.498 | https://discodata.eea.europa.eu/sql?query=… FROM [CO2Emission].[latest].[co2cars_2025Pv31] … | OFFICIAL (registration_record, provisional) |
| NCAP25 | Euro NCAP — VW Golf, rating 2025 | https://www.euroncap.com/en/results/vw/golf/57085 | OFFICIAL |
| NCAP25-NEWS | Euro NCAP newsroom — "VW Golf - Euro NCAP 2025 Results - 5 stars", 15-10-2025 | https://news.euroncap.com/safercars/vw-golf---euro-ncap-2025-results---5-stars/s/3e841cb8-0e98-47a4-bc88-8c760629454f | OFFICIAL |
| NCAP22 | Euro NCAP — VW Golf, rating 2022 (reevaluación) | https://www.euroncap.com/en/results/vw/golf/47140 | OFFICIAL |
| NCAP19 | Euro NCAP — VW Golf, rating 2019 (expirado) | https://www.euroncap.com/en/results/vw/golf/39844 | OFFICIAL |
| SG-API | EU Safety Gate — alerta SR/02758/25 (API pública) | https://ec.europa.eu/safety-gate-alerts/public/api/notification/10095399?language=en (web: https://ec.europa.eu/safety-gate-alerts/screen/webReport/alertDetail/10095399) | OFFICIAL |
| DGT-ECO | DGT — Etiqueta ambiental ECO | https://www.dgt.es/nuestros-servicios/tu-vehiculo/tus-vehiculos/distintivo-ambiental/etiqueta-eco/ | OFFICIAL (regla) |
| MOTOR-ES26 | motor.es — "Prueba Volkswagen Golf eTSI 150 CV", 30-08-2026 | https://www.motor.es/pruebas-coches/prueba-volkswagen-golf-etsi-150-cv-2026115795.html | Prensa (contraste) |

---

## 1. Identidad resuelta

| Campo | Valor | Fuente | Notas |
|---|---|---|---|
| `market_code` | `ES` | — | Península y Baleares (los precios VW ES excluyen Canarias, Ceuta y Melilla). |
| manufacturer | Volkswagen (Volkswagen AG) | EEA25P; SG-API | |
| model | Golf | VWES-API-MOD (`carlineName` Golf, carline 30602) | |
| `generation_code` | `Mk8` — VW ES: "Golf 8"; tipo de homologación **CD** (hatchback) / CDV (Variant) | VWES-G8 (título "Golf 8"); SG-API (`modelTypes`: "CD, CDV", TAN `e1*2007/46*2014*` y `e1*2007/46*2180*`) | |
| `facelift` | `Mk8.5` — IDAE lo denomina **"Golf 8 PA"** (Produktaufwertung). Presentación mundial 24-01-2024 ("anniversary update", 50 años del Golf) | IDAE; VWNR-WP | **Confirmado Mk8.5.** VW no usa "8.5" oficialmente; motor.es sí ("Golf 8.5"). |
| inicio de ventas ES | lanzamiento comercial **junio 2024** | VWES-PR24 | `sales_end`: a la venta hoy. |
| `model_year` | **2027** (configurador VW ES, 2026-09-24). IDAE lista a la vez MY25 y MY26 | VWES-API-MOD (`year`: 2027); IDAE | Ver fricción 1. |
| `trim_name` | **Style** | VWES-API-MOD (`equipmentLine` Style, salesgroup "Golf Style") | Acabados hoy en configurador: Golf, "Más", Match, Style, R-Line (+ GTI, GTE, R). |
| motor | 1.5 eTSI 110 kW (150 CV), denominación de motor "TSI ACT MV" | VWES-API-MOD | |
| `powertrain_type` | `MHEV` (48 V) | VWES-PR24 ("1.5 eTSI mHEV… tecnología mild-hybrid con sistema de 48V"); VWES-CFG ("híbridos ligeros, o MHEV") | En homologación figura como **NOVC-HEV** (`engineType` "NOVC_HEV") y EEA `Fm`=**H** (hybrid). Ver fricción 2. |
| `fuel_type` | `petrol` | VWES-API-MOD (`fuelTypeNames` PETROL; "Gasolina mild Hybrid") | |
| `drivetrain` | `FWD` | VWES-API-EQ ("Tracción delantera", de serie); VWES-API-MOD (`driveType` front-wheel drive) | |
| `transmission` | `dct`, 7 vel. (DSG **DQ200-7F**) | VWES-API-MOD ("Automático DSG 7 vel."; designación de engranaje DQ200-7F) | |
| `body_type` | `hatchback` | SG-API (tipo CD = Golf; CDV = Variant) | |
| `seats` | 5 | IDAE ficha 607306 ("Nº de Plazas Máximas: 5") | |
| `doors` | 5 | NOT FOUND como dato explícito en fuente oficial | Solo se comercializa 5p; IDAE/VW no lo dan como campo. Ver fricción. |
| `emissions_standard` | código de fuente **"EURO 6 EB"** (probablemente Euro 6e-bis; esa correspondencia **no se ha visto en la fuente**, hay que confirmarla) | VWES-API-MOD ("Nivel de emisiones: EURO 6 EB") | EEA25P muestra para el mismo motor matriculaciones "EURO 6 EA" y "EURO 6 EB" (dos homologaciones). El enum del catálogo **no tiene** Euro 6e/6e-bis. |

---

## 2. Tabla de valores

Valores del configurador VW ES (VWES-API-MOD) para la configuración base Golf Style 1.5 eTSI 110 kW DSG, MY2027, salvo indicación.

| SpecKey | Valor | Unidad canónica | Ciclo | Fuente | URL | Granularidad | Provenance | Notas |
|---|---|---|---|---|---|---|---|---|
| `dim.length_mm` | 4282 | mm | — | VWES-API-MOD ("Longitud mín./máx. 4.282 / 4.289 mm") | oneapi models | trim | OFFICIAL | se toma el mín. (L103); máx. 4.289 según equipamiento. IDAE: 4.282 |
| `dim.width_mm` | 1789 | mm | — | VWES-API-MOD ("Ancho mín./máx. 1.789 / 1.789") | idem | trim | OFFICIAL | IDAE: 1.789 |
| `dim.width_mirrors_mm` | 2073 | mm | — | VWES-API-MOD ("Ancho incluyendo espejos exteriores") | idem | trim | OFFICIAL | |
| `dim.height_mm` | 1483 | mm | — | VWES-API-MOD ("Altura máx. 1.483 mm") | idem | trim | OFFICIAL | la fuente solo da el **máximo**; IDAE: 1.483. motor.es: "1,45 m" (conflicto menor, prensa) |
| `dim.wheelbase_mm` | 2620 | mm | — | VWES-API-MOD ("Distancia entre ejes") | idem | trim | OFFICIAL | |
| `dim.ground_clearance_mm` | NOT FOUND | | | | | | | la fuente da ángulos: ataque 14,0°, salida 16,0°, ventral 11,0° (sin clave en catálogo) |
| `dim.turning_circle_m` | 11.1 | m | — | VWES-API-MOD ("Radio de giro aprox. 11,1 m"; id "Minimum turning circle approx.") | idem | trim | OFFICIAL | **ambigüedad radio vs diámetro** en la etiqueta ES; 11,1 m es coherente con diámetro |
| `dim.kerb_weight_kg` | 1373 | kg | — | VWES-API-MOD ("Peso en vacío mín."; "Mass… in running order **with driver** (min)") | idem | trim | OFFICIAL | norma UE con conductor. EEA25P: 1.373 kg (`M`) ✔ |
| `dim.gross_weight_kg` | 1860 | kg | — | VWES-API-MOD ("Peso máx. autorizado") | idem | trim | OFFICIAL | IDAE MY26 "MTMA 1.860" ✔ (IDAE MY25 R-Line da "MTMA 1.373" → error IDAE) |
| `cap.boot_l` | 381 | L | — | VWES-API-MOD ("Volumen del maletero comunicado = 381 l") | idem | trim | OFFICIAL | **método no declarado** (id "Communicated luggage compartment volume"). motor.es: 380 L |
| `cap.boot_max_l` | 1237 | L | — | VWES-API-MOD ("Volumen máximo del maletero - detrás del 1er SR") | idem | trim | OFFICIAL | VWES-G8: "Capacidad de hasta 1.237 L" ✔ |
| `cap.payload_kg` | NOT FOUND | | | | | | | derivable (1860 − 1373 = 487 kg, CALCULATED) — no se registra sin regla |
| `cap.towing_braked_kg` | 1500 (pendiente 12 %) / 1700 (8 %) | kg | — | VWES-API-MOD ("Peso máx. permitido para remolque con freno al 12% / 8%") | idem | trim | OFFICIAL | **dos valores por pendiente**; se propone guardar el de 12 % (ver fricción) |
| `cap.towing_unbraked_kg` | 680 | kg | — | VWES-API-MOD | idem | trim | OFFICIAL | carga en bola: 80 kg (sin clave) |
| `cap.roof_load_kg` | 75 | kg | — | VWES-API-MOD ("Peso máx. de carga en el techo") | idem | trim | OFFICIAL | |
| `cap.isofix_positions` | 3 | — | — | VWES-API-EQ ("Argollas sujeción ISOFIX … en asientos traseros ext. y en asiento acomp., compatible con i-Size", de serie) | oneapi configStart | trim | CALCULATED (2 traseras exteriores + 1 acompañante, contadas del texto) | NCAP25 (resumen): ISOFIX/i-Size de serie en acompañante y traseras |
| `cap.third_row` | not_available | — | — | IDAE (5 plazas máx.) | IDAE | trim | OFFICIAL | |
| `perf.power_max_kw` | 110 | kW | — | VWES-API-MOD ("Potencia máx. 110 kW"; "Rendimiento = 110 kW / 150 PS" potencia de sistema) | oneapi models | engine | OFFICIAL | EEA25P `Ep`=110 ✔. **IDAE ficha 607306 da 85,0 kW / 115,6 cv** para este mismo nombre → error IDAE (fricción) |
| `perf.torque_max_nm` | 250 | N·m | — | VWES-API-MOD ("Par máx. 250 Nm / 1500 - 3500 1/min"; "Par del sistema 250 Nm") | idem | engine | OFFICIAL | |
| `perf.accel_0_100_s` | 8.4 | s | — | VWES-API-MOD ("Aceleración 0-100 KM/H") | idem | trim | OFFICIAL | motor.es: 8,4 ✔ |
| `perf.top_speed_kmh` | 224 | km/h | — | VWES-API-MOD ("Velocidad máxima") | idem | trim | OFFICIAL | |
| `perf.power_ice_kw` | 110 | kW | — | VWES-API-MOD ("Potencia máx." del motor) | idem | engine | OFFICIAL | clave no aplicable a MHEV según PT del catálogo (ICE incl. MHEV) — ver fricción |
| `perf.power_electric_kw` | NOT FOUND | | | | | | | la fuente no da potencia del alternador-motor 48 V; IDAE "Potencia eléctrica 0,0 kW" |
| `pt.displacement_cc` | 1498 | cm³ | — | VWES-API-MOD; IDAE (1.498) | idem | engine | OFFICIAL | |
| `pt.cylinders` | NOT FOUND | | | | | | | no aparece en configurador/IDAE |
| `pt.fuel_tank_l` | 50 | L | — | VWES-API-MOD ("Depósito de combustible gasolina / gasóleo = 50 l"; id "brochure volume") | idem | trim | OFFICIAL | |
| `pt.gears` | 7 | — | — | VWES-API-MOD ("Automático DSG 7 vel.") | idem | trim | OFFICIAL | |
| `pt.fiscal_hp_es` | NOT FOUND | | | | | | | |
| `pt.timing_drive` | NOT FOUND | | | | | | | |
| `bat.chemistry` (batería 48 V) | NMC ("NCM") | enum | — | VWES-API-MOD ("Tipo de batería = NCM", id "Chemical composition of the cell") | idem | engine | OFFICIAL | clave definida solo PHEV/BEV; capacidad 48 V NOT FOUND |
| `nrg.fuel_combined_l100` | 5.2 | L/100 km | **WLTP** | VWES-API-MOD (`wltpModelData`, COMBINED, `energyManagementType` SUSTAINING, min=max 5,2) | idem | trim (config. base) | OFFICIAL | IDAE MY26 Style 150: rango **5,1–5,7**; EEA25P: `Fc` 5,2–5,4 |
| `nrg.fuel_urban_l100` | 6.7 | L/100 km | WLTP **Low** | VWES-API-MOD | idem | trim | OFFICIAL | equivalencia urban≈Low documentada, no asumida |
| `nrg.fuel_extra_urban_l100` | 5.4 | L/100 km | WLTP **Extra High** | VWES-API-MOD | idem | trim | OFFICIAL | ¿High o Extra High? el catálogo dice "high/extra-high" → se elige Extra High; ambigüedad |
| `nrg.fuel_wltp_low_l100` | 6.7 | L/100 km | WLTP | VWES-API-MOD | idem | trim | OFFICIAL | |
| `nrg.fuel_wltp_medium_l100` | 5.0 | L/100 km | WLTP | VWES-API-MOD | idem | trim | OFFICIAL | |
| `nrg.fuel_wltp_high_l100` | 4.4 | L/100 km | WLTP | VWES-API-MOD | idem | trim | OFFICIAL | |
| `nrg.fuel_wltp_extra_high_l100` | 5.4 | L/100 km | WLTP | VWES-API-MOD | idem | trim | OFFICIAL | |
| `emi.co2_combined_gkm` | 119 | g/km | **WLTP** | VWES-API-MOD (CO2 COMBINED 119) | idem | trim | OFFICIAL | fases CO₂: Low 153 · Medium 114 · High 101 · Extra High 124 g/km (sin clave). IDAE MY26: 117–129; EEA25P: 119–124 (eco-innovación `IT` "e5 37", −0,71 g/km en algunos registros) |
| `emi.dgt_label_es` | ECO | enum | — | VWES-CFG ("híbridos ligeros, o MHEV… Llevan la etiqueta ECO"); VWES-PR24 ("carry the DGT ECO label"); DGT-ECO (regla: HEV + gasolina Euro 4/5/6) | volkswagen.es / dgt.es | engine | OFFICIAL (fabricante) + CALCULATED (regla DGT) | la regla DGT no menciona "mild hybrid"; la asignación depende de que la homologación sea HEV (EEA `Fm`=H) |
| (sin clave) clase de eficiencia | B | — | WLTP | VWES-API-MOD (`classWltp` B); IDAE MY26 Style 150: "B" | | trim | OFFICIAL | "Clasificación Energética" IDAE ≠ etiqueta DGT |
| (sin clave) NOx / NMHC / PM | 11,6 / 8,4 / 0 mg/km | mg/km | WLTP | VWES-API-MOD | | engine | OFFICIAL | |
| `saf.airbags_count` | NOT FOUND (numérico) | | | VWES-API-EQ: de serie conductor + acompañante (desactivable), cabeza delante y detrás, laterales delante, central; **laterales traseros opcionales** (289,26 € sin IVA) | | trim | — | el nº exacto depende de cómo se cuenten cortinas y central → fricción |
| `adas.aeb` | standard | enum | — | VWES-API-EQ ("Front Assist: … detección de peatones", de serie) | configStart | trim | OFFICIAL | NCAP25: AEB car-to-car de serie |
| `adas.aeb_vru` | standard | enum | — | VWES-API-EQ ("ACC y … Front Assist con sist. de detecc. de peat. y ciclist.", de serie) | idem | trim | OFFICIAL | + "Front Cross Traffic Assist" frenada al girar, de serie |
| `adas.acc` | standard | enum | — | VWES-API-EQ ("Control de crucero adaptativo ACC"; "ACC con regulación anticipada de velocidad … Travel Assist") | idem | trim | OFFICIAL | stop&go: no explícito (DSG + Travel Assist) |
| `adas.lane_keep` | standard | enum | — | VWES-API-EQ ("Travel Assist … Lane Assist … Emergency Assist") | idem | trim | OFFICIAL | |
| `adas.blind_spot` | standard | enum | — | VWES-API-EQ ("Side Assist, asistente de salida del aparc. y advertencia de apertura de puerta") | idem | trim | OFFICIAL | |
| `adas.rear_cross_traffic` | standard | enum | — | VWES-API-EQ ("asistente de salida del aparc." dentro de Side Assist) | idem | trim | OFFICIAL | mapeo "Exit assist" → rear cross traffic: revisar |
| `adas.traffic_sign_recognition` | standard | enum | — | VWES-API-EQ ("Sistema de reconocimiento de señales de tráfico") | idem | trim | OFFICIAL | |
| `adas.driver_monitoring` | standard | enum | — | VWES-API-EQ ("advertencia de cansancio y falta de atención con sensorización del habitáculo") | idem | trim | OFFICIAL | NCAP25: detección de fatiga indirecta |
| `adas.surround_camera` | optional | enum | — | VWES-API-EQ ("Área View … 360º", 301,65 € sin IVA) | idem | trim | OFFICIAL | Rear View (cámara trasera) de serie |
| `tech.apple_carplay` | standard_wireless | enum | — | VWES-API-EQ ("App-Connect Wireless para Apple CarPlay y Android Auto", de serie) | idem | trim | OFFICIAL | |
| `tech.android_auto` | standard_wireless | enum | — | idem | idem | trim | OFFICIAL | |
| `tech.center_screen_in` | 12.9 | in | — | VWES-API-EQ ("pantalla de 32,7 cm (12,9")") | idem | trim | OFFICIAL | |
| `tech.digital_cluster` | standard | enum | — | VWES-API-EQ ("Digital Cockpit PRO", de serie) | idem | trim | OFFICIAL | |
| `tech.connected_services` | standard | enum | — | VWES-API-EQ ("Preparado para VW Connect y VW Connect Plus"; eCall 10 años) | idem | trim | OFFICIAL | |
| `tech.ota_updates` | unknown | | | VWES-API-EQ ("ciberseguridad y actualización de software UNECE") | idem | trim | — | no dice explícitamente OTA |
| `war.years` | 3 | años | — | VWES-WAR ("tu coche nuevo viene con 3 años de garantía del fabricante"; "3 años en defectos materiales y del fabricante") | volkswagen.es | market | OFFICIAL | |
| `war.km` | NOT FOUND | | | VWES-WAR no indica límite de km para los 3 años | | | | **no se asume ilimitado** |
| `war.conditions` | Extensión +1 año (máx. 80.000 km) / +2 años (máx. 100.000 km); 12 años anticorrosión; 3 años pintura | text | — | VWES-WAR; VWES-API-EQ (extensión 1 año 330 € / 2 años 495 €, sin IVA) | | market / trim | OFFICIAL | garantía batería 8 años/160.000 km solo mencionada para BEV/PHEV; **48 V no mencionada** |
| `mnt.service_interval_km` / `_months` | NOT FOUND | | | | | | | |

---

## 3. Precios

Desglose oficial del configurador (VWES-API-PRC), consultado 2026-09-24, modelo base sin opcionales, color base:

| Componente | Importe (EUR) |
|---|---|
| Precio sin impuestos | 32.110 |
| Equipamiento opcional | 0 |
| Impuesto de matriculación | 0 |
| IVA 21 % | 6.745 |
| **Precio modelo (`modelAmount`)** | **38.850** |
| Campaña "Bienvenido a Volkswagen" (C9FJZ) | −3.495 |
| Bonificación financiación VWFS (C9FDP) | −605 |
| Importe con campañas (`amount`) | 34.755 |

| price_type | Importe | Moneda | incl_taxes | valid_from | Variant | Fuente | Provenance | Notas |
|---|---|---|---|---|---|---|---|---|
| `current_new` | **38.850** | EUR | **sí** (IVA 21 % + IEDMT 0 €) | 2026-09-24 (consulta) | Golf Style 1.5 eTSI 110 kW DSG 7, MY2027, sin opcionales | VWES-API-PRC | OFFICIAL | **promociones excluidas** ✔. Península y Baleares. Transporte no desglosado. La llamada llevaba parámetros `customerType: professional, priceType: net`, pero el desglose incluye IVA → revisar. |
| (referencia) precio neto | 32.109,09 | EUR | no (`vatIncluded: false`) | 2026-09-24 | idem | VWES-API-MOD | OFFICIAL | |
| (no usar) precio con campaña | 34.755 | EUR | sí | 2026-09-24 | idem | VWES-API-PRC | OFFICIAL | incluye campañas → **excluido** por regla |
| (contraste) | "desde 34.365 €" (Style eTSI 150) | EUR | ? | 2026-08-30 | Style eTSI 150 | MOTOR-ES26 | prensa | probablemente con campañas; no usar |

Nota: la página VWES-G8 solo muestra precios promocionales (p. ej. Golf 1.5 eTSI 85 kW "Desde 26.800 €", que "incluye IVA, Impuestos de Matriculación, Transporte, descuento de marca y concesionario, y bonificaciones de VWFS", sujeto a financiación, válido hasta 30/09/2026). No válidos como `current_new`.

---

## 4. Seguridad

| authority | modelo testado | stars | adult % | child % | VRU % | safety assist % | test_year | protocol / rating year | estado | Fuente | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Euro NCAP** | VW Golf 'Life', 1.5 petrol, LHD, 1.346 kg | **5** | **80** | **86** | **85** | **79** | **2025** | reevaluación 2025 ("rated in 2022 and has been reassessed in 2025 following improvements to the car made by VW") | vigente | NCAP25; NCAP25-NEWS | OFFICIAL |
| Euro NCAP | VW Golf 1.5 TSI 'Life', 1.316 kg | 5 | 88 | 87 | 74 | 82 | 2022 | protocolos **2022** (reevaluación de 2019, con tests 2019 arrastrados) | sustituido por 2025 | NCAP22 | OFFICIAL |
| Euro NCAP | VW Golf 1.5 petrol 'Comfortline', LHD, 1.316 kg (Golf VIII pre-facelift) | 5 | 95 | 89 | 76 | 78 | 2019 | protocolo 2019 | **expirado** | NCAP19 | OFFICIAL |

- **Rating aplicable a DC-04: Euro NCAP 2025** (el único que cubre el Golf 8.5 tras las mejoras). Según el resumen de la ficha, el rating aplica a varias motorizaciones (TSI gasolina, diésel, PHEV); **no se ha visto mención explícita al eTSI** → granularidad `generation/facelift`.
- La versión exacta del protocolo 2025 no se muestra en la ficha consultada (solo "reassessed in 2025"); el datasheet PDF 2025 (`cdn.euroncap.com/media/91370/…`) devolvió 404 en esta sesión.
- **No comparable con DC-03**: Golf VII (2012, protocolo 2012, categoría "pedestrian") vs Golf VIII (2019 → 2022 → 2025, categoría "VRU"). Además, el mismo Golf VIII tiene tres ratings con % distintos según protocolo (p. ej. adulto 95 → 88 → 80), lo que demuestra que ni siquiera dentro de la misma generación son comparables.
- ADAS de serie conocidas en el trim: ≥ 8 (ver §2) → la categoría Safety se activaría también por la vía ADAS.

---

## 5. Recalls (UE / España)

| Referencia | Fecha | País notificante | Productos / periodo | Riesgo | Medida | ¿Afecta a DC-04? | Fuente | Provenance |
|---|---|---|---|---|---|---|---|---|
| Safety Gate **SR/02758/25** (id 10095399) | creada 18-07-2025, publicada 22-07-2025 | Alemania | "GOLF, GOLF VARIANT", tipos **CD, CDV**, homologaciones e1*2007/46*2014* y e1*2007/46*2180*; lote/producción **09.02.2024 – 24.05.2024**; código VW **69PD** | cinturón del acompañante puede no estar bien anclado al punto inferior (lesiones) | retirada voluntaria del fabricante | afecta a la **generación/facelift** (primeras unidades Golf 8.5); **no** a la configuración MY2027 actual. España **no** figura entre los países que reaccionaron (BG, FI, FR, GR, HU, IE, PT, SK, SI, SE) | SG-API | OFFICIAL |

Otros recalls del Golf 8.5 en ES/UE: NOT FOUND en esta sesión (búsqueda dirigida, no exhaustiva).

---

## 6. Cobertura de claves críticas (MHEV → columna ICE/MHEV/HEV)

| Categoría | Clave crítica | Estado |
|---|---|---|
| Economy | `nrg.fuel_combined_l100` | FOUND (5,2 WLTP, OFFICIAL) |
| Economy | precio `current_new` | FOUND (38.850 € IVA incl., sin campañas, OFFICIAL) |
| Range | `pt.fuel_tank_l` | FOUND (50 L) |
| Range | `nrg.fuel_combined_l100` | FOUND |
| Performance | `perf.power_max_kw` | FOUND (110 kW) |
| Performance | `perf.accel_0_100_s` | FOUND (8,4 s) |
| Size | `dim.length_mm` / `dim.width_mm` / `dim.height_mm` | FOUND (4.282 / 1.789 / 1.483 máx.) |
| Size / Practicality | `cap.boot_l` | FOUND (381 L, **método no declarado**) |
| Practicality | `seats` | FOUND (5, IDAE) |
| Eco | `emi.co2_combined_gkm` | FOUND (119 WLTP) |
| Eco | `emi.dgt_label_es` | FOUND (ECO — declaración del fabricante + regla DGT; sin registro DGT por variant) |
| Safety | rating con protocolo | FOUND (Euro NCAP 2025, 5★) |
| Warranty | `war.years` | FOUND (3 años) |

**Resultado: 13/13 criterios cubiertos con fuente oficial.** Todas las categorías ICE/MHEV se activarían. Riesgos: método de maletero (Q3), etiqueta DGT sin fuente DGT por variant (Q4), `war.km` ausente.

---

## 7. Fricciones con el catálogo

1. **`model_year` ambiguo en coche nuevo.** El 2026-09-24 el configurador VW ES sirve **MY2027**, IDAE lista simultáneamente **MY25 y MY26** del mismo Golf 8 PA, y la EEA agrupa por año de matriculación. Con valores distintos por MY (IDAE Style 150 MY26: 117–129 g/km; configurador MY27: 119 g/km). Propuesta: `model_year` + `valid_from` de cada `SourcedValue`, y aceptar que DC-04 "actual" es un MY concreto (2027), no "2026".
2. **MHEV = NOVC-HEV en homologación.** VW lo vende como MHEV/eTSI, pero la homologación lo declara `NOVC_HEV` (datos WLTP con `energyManagementType: SUSTAINING`) y la EEA lo registra con `Fm`=H (hybrid). La etiqueta ECO depende de esa clasificación (la regla DGT solo dice "HEV"). El enum `powertrain_type` tiene MHEV, pero conviene guardar además `homologation_powertrain` (`ICE`/`NOVC-HEV`/`OVC-HEV`) porque es lo que determina etiqueta DGT e impuestos.
3. **Aplicabilidad `PT` de claves en MHEV.** `perf.power_ice_kw`, `perf.power_electric_kw`, `bat.chemistry` (la fuente da "NCM" para la batería de 48 V) y la garantía de batería no están previstas para MHEV. Decidir: MHEV hereda ICE (no cuentan) o hereda HEV (cuentan en completitud). Hoy el catálogo dice "ICE (incl. MHEV)" pero la fuente oficial publica datos de batería.
4. **Enum `emissions_standard` desactualizado.** La fuente da "EURO 6 EB" (probablemente Euro 6e-bis, correspondencia sin confirmar) y la EEA "EURO 6 EA"/"EURO 6 EB" para el mismo motor; el enum acaba en `Euro6d`/`Euro7`. Añadir `Euro6e`, `Euro6e-bis`, `Euro6e-bis-FCM` (y admitir el código literal de la fuente).
5. **Mínimo / máximo en dimensiones y consumos.** La fuente oficial publica longitud mín./máx. (4.282/4.289), altura solo máx., ancho de vía mín./máx.; IDAE publica consumo/CO₂ como **rango** por equipamiento (5,1–5,7 L; 117–129 g/km). El catálogo guarda un único valor. Propuesta: `value_min`/`value_max` en `SourcedValue` o regla "valor de la configuración base del trim".
6. **Remolque con dos valores.** "Remolque con freno 12 % / 8 %: 1.500 / 1.700 kg". `cap.towing_braked_kg` necesita definir la pendiente de referencia (propuesta: 12 %, criterio más restrictivo) o dos claves.
7. **Diámetro vs radio de giro.** VW ES etiqueta "Radio de giro aprox. 11,1 m" con id "Minimum turning circle"; el catálogo pide diámetro (`dim.turning_circle_m`). Documentar que se usa el valor como diámetro de giro (de bordillo a bordillo) y marcar la ambigüedad en origen.
8. **Maletero "comunicado".** La fuente oficial usa "Volumen del maletero comunicado" (381 L) sin norma; prensa usa 380 L. Refuerza Q3: añadir `cap.boot_method` con valor `unknown` y no bloquear Size por ello.
9. **CV ≠ CV.** El 85 kW aparece como "115 CV" (nota de prensa, IDAE) y "116 CV" (web y configurador VW ES 2026). Confirma: almacenar solo kW.
10. **Errores en fuente oficial (IDAE).** La ficha IDAE 607306 ("Style 1.5 eTSI 110 kW (150 CV)") muestra potencia 85,0 kW / 115,6 cv y consumo 5,40 L; la ficha MY25 R-Line muestra "MTMA 1.373" (que es la masa en orden de marcha, no la MTMA). OFFICIAL ≠ correcto: el pipeline necesita validación cruzada entre fuentes oficiales y `confidence` por fuente.
11. **Etiqueta DGT sin fuente por variant.** La DGT publica la regla, no el listado por variant (solo consulta por matrícula). Q4 del catálogo: `emi.dgt_label_es` = OFFICIAL (fabricante) + CALCULATED (regla); proponer `status` mixto o dos `SourcedValue`.
12. **Precios: descuentos integrados por defecto.** La web VW ES siempre muestra precio con campañas y financiación; el PVP sin promociones solo aparece en el desglose del configurador (`modelAmount`). Además VW ES define "PVP recomendado" como precio que "incluye el descuento de marca y el descuento mínimo del concesionario" (stock locator). `vehicle_prices` necesita `includes_brand_discount` y `requires_financing` para no confundir tipos.
13. **Claves oficiales disponibles sin SpecKey**: fases WLTP de **CO₂** (Low/Medium/High/Extra High), anchura con portón abierto / altura con portón abierto (2.014 mm), ángulos de ataque/salida/ventral, carga en bola (80 kg), carga por eje, clase de eficiencia WLTP, contaminantes (NOx, NMHC, PM), eco-innovaciones EEA (`IT`, `Erwltp`). Prioridad: fases CO₂ WLTP (B) y altura con portón abierto (C, garajes).
14. **Airbags: recuento no normalizado.** La fuente lista familias (frontales, cabeza delante y detrás, laterales delante, central, laterales traseros opcionales); `saf.airbags_count` exige un entero que la fuente no da. Propuesta: enum por posición o regla de conteo.
15. **ISOFIX contado por texto.** "Asientos traseros ext. y asiento acomp." → 3 posiciones (CALCULATED); el resumen Euro NCAP 2025 no da número claro. Conviene `cap.isofix_positions` + `cap.isofix_front_passenger` (enum).
16. **Rating Euro NCAP múltiple para una generación.** El Golf VIII tiene ratings 2019 (expirado), 2022 y 2025 con % muy distintos. `safety_ratings` necesita `superseded_by`/`expired_at` y `rating_scope` (qué facelift/MY cubre).
