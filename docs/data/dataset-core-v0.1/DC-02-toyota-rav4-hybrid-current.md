# DC-02 — Toyota RAV4 Hybrid actual (ES, 2026) · 6.ª generación · Hybrid "200" 185 CV FWD (e-CVT) · Advance

> Estado: **CURADO (borrador v0.1)** · Fecha de consulta de todas las fuentes: **2026-09-24** · Curador: agente de datos VScar
> Caso Dataset Core: **HEV nuevo**. Catálogo: [SPEC_KEY_CATALOG.md v0.1](../SPEC_KEY_CATALOG.md)

## 0. Resolución de la generación a la venta en España

**Conclusión: en España hoy (2026-09-24) se vende la 6.ª generación del RAV4 (nueva generación), no la XA50.** La XA50 ya no figura en la oferta de nuevos.

Cómo se ha determinado:
1. **Toyota España (prensa), 2026-01-20**: "Toyota España presenta la sexta generación del nuevo Toyota RAV4… pedidos abiertos desde hoy" — pedidos desde el 20-01-2026, primeras entregas "comienzos de junio de 2026". (S2)
2. **Toyota España (prensa), 2026-04-07**: "Toyota RAV4 llega a Toyota España y arranca la nueva era con la sexta generación" — HEV "185 CV", "5ª generación del sistema híbrido de Toyota", "desde 44.250€", entregas "a partir de mediados 2026". (S3)
3. **Web de producto toyota.es/coches/rav4** (consultada 2026-09-24): solo muestra Hybrid 185 CV y Plug-in Hybrid 272–309 CV, con oferta válida hasta 30-09-2026; no aparece la versión 218/222 CV de la XA50. (S4)
4. **Lista de precios oficial prensa.toyota.es/precios-rav4/**: solo "RAV4 HYBRID 200" Advance y Spirit (nomenclatura de la nueva gama). (S5)
5. **Catálogo ES "Nuevo Toyota RAV4 — Nueva generación 2026"**: motorizaciones "Hybrid 200" y "Plug-in Hybrid 300 FWD y AWD-i". (S1)

Código de generación: Toyota no publica código de chasis en las fuentes consultadas ("sexta generación"). El código **`XA60`** solo aparece en Wikipedia (S9) → SECONDARY_REFERENCE; se usa como `generation_code` provisional.

**Versión elegida (la más cercana a DC-01)**: Hybrid (HEV, no enchufable) **FWD 4x2**, acabado **Advance**. En España el HEV solo se vende en **FWD** y en acabados **Advance** y **Spirit** (S2); la versión HEV AWD (194 CV) existe en la ficha europea (S6) pero no en la gama española.

## Fuentes usadas (todas consultadas 2026-09-24)

| ID | Fuente | URL | Tipo | Granularidad |
|---|---|---|---|---|
| S1 | Catálogo Toyota España "Nuevo Toyota RAV4 — Evolución en estado puro — Nueva generación 2026" (PDF 14 pp.; tabla comparativa p.7; acabados pp.8–11; seguridad p.5). Sin fecha impresa. Valores marcados "Datos pendientes de homologación final" | https://scene7.toyota.eu/is/content/toyotaeurope/toyota/nmsc/spain/cross-model/new-cars/catalogos-precios/pdf/rav4/Catalogo_Toyota_RAV4.pdf | Fabricante ES (OFFICIAL) | engine (Hybrid 200 / PHEV); equipamiento por trim |
| S2 | Nota de prensa Toyota España, 2026-01-20 | https://prensa.toyota.es/toyota-espana-presenta-la-sexta-generacion-del-nuevo-toyota-rav4-electrificacion-avanzada-y-pedidos-abiertos-desde-hoy/ | Fabricante ES (OFFICIAL) | market/model |
| S3 | Nota de prensa Toyota España, 2026-04-07 | https://prensa.toyota.es/toyota-rav4-llega-a-toyota-espana-y-arranca-la-nueva-era-con-la-sexta-generacion/ | Fabricante ES (OFFICIAL) | market/model |
| S4 | Web de producto Toyota España | https://www.toyota.es/coches/rav4 | Fabricante ES (OFFICIAL) | model/engine |
| S5 | Precios Toyota RAV4 Hybrid (prensa Toyota España) | https://prensa.toyota.es/precios-rav4/ | Fabricante ES (OFFICIAL) | trim |
| S6 | Toyota Motor Europe — "TOYOTA RAV4 HEV and PHEV Specifications" (PDF 2 pp., adjunto a la nota de 2026-04-07 "All-new Toyota RAV4 brings new technology and rugged style to every adventure") | https://newsroom.toyota.eu/download/bb082340-dca1-434d-bed8-3c87c9d9407c/rav4dplhevandphevspecificationsheet.pdf · nota: https://newsroom.toyota.eu/all-new-toyota-rav4-brings-new-technology-and-rugged-style-to-every-adventure/ | Fabricante EU (OFFICIAL) | engine+drivetrain (mercado europeo, no ES específico) |
| S7 | DGT — Etiqueta ambiental ECO (criterios; página actualizada 2022-02-10) | https://www.dgt.es/nuestros-servicios/tu-vehiculo/tus-vehiculos/distintivo-ambiental/etiqueta-eco/ | Autoridad (OFFICIAL, regla) | regla |
| S8 | Euro NCAP — listado de resultados/prensa 2026 | https://www.euroncap.com/press-media/ · https://www.euroncap.com/en/results/toyota/rav4/35881 | Autoridad (OFFICIAL) | — |
| S9 | Wikipedia — Toyota RAV4 | https://en.wikipedia.org/wiki/Toyota_RAV4 | Tercero (SECONDARY_REFERENCE) | generation |
| S10 | km77 — Toyota RAV4 (2026) | https://www.km77.com/coches/toyota/rav4/2026/estandar/datos | Tercero (SECONDARY_REFERENCE) | model |
| S11 | Página de catálogos/precios toyota.es | https://www.toyota.es/coches/catalogos-precios | Fabricante ES (OFFICIAL) | model |

---

## 1. Identidad resuelta

| Campo | Valor | Fuente | Notas |
|---|---|---|---|
| `market_code` | `ES` | S1–S5 | |
| Fabricante | Toyota | S1 | |
| Modelo | RAV4 Hybrid — denominación de motorización **"Hybrid 200"** | S1, S5 | la cifra "200" es comercial; no coincide con la potencia (183/185 CV) |
| `generation_code` | `XA60` (provisional) | S9 (SECONDARY) · "sexta generación" en S2/S3 (OFFICIAL) | |
| Facelift / fase | Fase inicial (lanzamiento) | S2, S3 | |
| Periodo comercial ES | `sales_start` 2026-01-20 (apertura de pedidos, S2); entregas desde "comienzos de junio de 2026" (S2) / "a partir de mediados 2026" (S3); `sales_end` — (a la venta) | S2, S3 | km77: "01/2026 -" (SECONDARY) |
| `model_year` | 2026 | S1 ("Nueva generación 2026") | |
| `trim_name` | `Advance` | S1, S5 | HEV: Advance y Spirit (S2) |
| `powertrain_type` | `HEV` | S1, S6 | |
| `fuel_type` | `petrol` | S1 p.7 ("Combustible: Gasolina") | |
| `drivetrain` | `FWD` | S1 p.7 ("Tracción 4x2"); S2 ("ambos con tracción delantera FWD") | |
| `transmission` | `ecvt` | S1 p.2 ("Cambio automático e-CVT"); S6 ("CVT (with shift-by-wire system)") | |
| `body_type` | `suv` | S4 ("SUV") | |
| `seats` | **NOT FOUND** | — | ninguna fuente oficial consultada da el nº de plazas de la 6.ª gen. (S1 solo "Segunda fila de asientos abatible 60:40"; "Anclajes ISOFIX en plazas exteriores 2ª fila") |
| `doors` | **NOT FOUND** | — | no indicado en S1/S6 |
| `emissions_standard` | "EURO 6 AP" (literal) | S6 ("EURO CLASS EURO 6 AP") | no encaja en el enum (ver fricciones); probablemente código de sub-norma Euro 6e-bis, **no verificado** |

---

## 2. Tabla de valores

Leyenda provenance: **OFFICIAL** · **VERIFIED** (dos oficiales coinciden) · **CALCULATED** · **SECONDARY_REFERENCE** (no publicable).
**Aviso general**: S1 marca los datos como "pendientes de homologación final" y **hay discrepancias entre la ficha europea (S6) y el catálogo español (S1)** en potencia, altura, CO₂ y masa (detalladas en notas).

### 2.1 Dimensiones y masa

| SpecKey | Valor | Unidad canónica | Ciclo | Fuente | URL | Granularidad | Provenance | Notas |
|---|---|---|---|---|---|---|---|---|
| `dim.length_mm` | 4600 | mm | — | S1 p.7; S6; S4 | S1, S6 | engine+drivetrain | VERIFIED | S6: AWD 4645 |
| `dim.width_mm` | 1855 | mm | — | S1 p.7; S6; S4 | S1, S6 | engine | VERIFIED | GR SPORT 1880 (S6, no HEV) |
| `dim.width_mirrors_mm` | NOT FOUND | mm | — | — | — | — | — | |
| `dim.height_mm` | **1680** (ES) · 1695 (EU) | mm | — | S1 p.6–7 y S4: 1680 · S6: "OVERALL HEIGHT 1695" (Hybrid FWD) | S1, S4, S6 | engine | OFFICIAL (**conflicto**) | se propone 1680 (fuente de mercado ES), conflicto a revisión humana. Ninguna indica si incluye barras de techo |
| `dim.wheelbase_mm` | 2690 | mm | — | S1 p.6; S6 | S1, S6 | generation | VERIFIED | voladizos 920/990 (S1, S6) |
| `dim.ground_clearance_mm` | 186 / 201 | mm | — | S6 ("GROUND CLEARANCE 186, 201") | S6 | engine | OFFICIAL | dos valores sin explicar (¿llanta/medición?) |
| `dim.turning_circle_m` | 5.63 / 5.68 | m | — | S6 ("MIN. TURNING CIRCLE TYRE / BODY (M) 5.63, 5.68") | S6 | engine | OFFICIAL | **etiquetado "turning circle" pero son valores de radio** (el 2.5 de la XA50 daba 11,0/11,8 m de diámetro). Guardar como radio → no comparable sin conversión |
| `dim.kerb_weight_kg` | **1665** (ES MOM) · 1625–1705 mín. / 1665–1735 máx. (EU) | kg | — | S1 p.7 ("Masa en orden de marcha (MOM) 1.665"); S6 ("CURB WEIGHT MIN 1625 - 1705 / MAX 1665 - 1735") | S1, S6 | engine (ES) / engine+equipo (EU) | OFFICIAL | se propone 1665 (S1). S6 da rangos |
| `dim.gross_weight_kg` | 2170 | kg | — | S6 | S6 | engine+drivetrain | OFFICIAL | |

### 2.2 Capacidad y practicidad

| SpecKey | Valor | Unidad canónica | Ciclo | Fuente | URL | Granularidad | Provenance | Notas |
|---|---|---|---|---|---|---|---|---|
| `cap.boot_l` | 514 | L | — | S1 p.7 ("hasta la bandeja 514"); S6 ("CARGO CAPACITY (L VDA) 514"); S4 | S1, S6 | powertrain (HEV) | VERIFIED | **VDA** declarado en S6; S1 no declara método. Nota: la nota TME 2026 menciona "580 litres VDA" en otro contexto (cifra de la XA50) — no se usa |
| `cap.boot_max_l` | NOT FOUND | L | — | — | — | — | — | S1/S6 dan **749 L "hasta el techo" con asientos en uso**, no con asientos abatidos → no encaja en esta clave |
| `cap.payload_kg` | NOT FOUND | kg | — | — | — | — | — | |
| `cap.towing_braked_kg` | 800 | kg | — | S6 ("TOWING CAPACITY BRAKED AWD 2000 / FWD 800") | S6 | drivetrain | OFFICIAL | S2 menciona 2.000 kg solo para AWD-i |
| `cap.towing_unbraked_kg` | 750 | kg | — | S6 | S6 | model | OFFICIAL | |
| `cap.roof_load_kg` | NOT FOUND | kg | — | — | — | — | — | |
| `cap.isofix_positions` | 2 | — | — | S1 p.5 ("2 Anclajes ISOFIX de 3 puntos (plazas traseras)") | S1 | model | OFFICIAL | |
| `cap.third_row` | NOT FOUND | — | — | — | — | — | — | implícito 2 filas, no declarado |

### 2.3 Prestaciones

| SpecKey | Valor | Unidad canónica | Ciclo | Fuente | URL | Granularidad | Provenance | Notas |
|---|---|---|---|---|---|---|---|---|
| `perf.power_max_kw` | 136 | kW | — | S6 ("TOTAL SYSTEM MAX POWER (DIN HP / KW) 185 / 136") | S6 | engine+drivetrain | OFFICIAL (**conflicto**) | Display ES: **185 CV** (S3, S4, S6). **Conflicto**: el catálogo ES (S1 pp.2,7) dice **183 CV** (≈135 kW, conversión no oficial). Se propone 136 kW/185 CV (S3+S4+S6 coinciden) |
| `perf.torque_max_nm` | 221 (solo motor térmico) | N·m | — | S6 ("TORQUE (NM @ RPM) THERMIC ENGINE ONLY 221 @ 3,200-3,600"); S1 p.7 ("Par máximo combinado 221") | S1, S6 | engine | OFFICIAL (**conflicto de definición**) | S6 dice "solo motor térmico"; S1 lo llama "par máximo **combinado**" → misma cifra, definiciones contradictorias |
| `perf.accel_0_100_s` | 8.0 | s | — | S1 p.7 ("8"); S6 ("8.0") | S1, S6 | engine+drivetrain | VERIFIED | AWD (no ES): 7,7 |
| `perf.top_speed_kmh` | 180 | km/h | — | S1 p.7; S6; S4 | S1, S6 | engine | VERIFIED | |
| `perf.power_ice_kw` | 105 | kW | — | S6 ("SYSTEM MAXIMUM OUTPUT (DIN HP / KW @ RPM) 143 / 105 @ 4,800") | S6 | engine | OFFICIAL | **error de etiqueta en S6**: la fila de motor térmico se titula "System maximum output"; la potencia de sistema está en "Total system max power" |
| `perf.power_electric_kw` | 100 | kW | — | S6 ("FRONT MOTOR… MAX OUTPUT (DIN HP / KW) 136/100") | S6 | engine | OFFICIAL | motor delantero síncrono de imanes permanentes |

### 2.4 Motor térmico y transmisión

| SpecKey | Valor | Unidad canónica | Ciclo | Fuente | URL | Granularidad | Provenance | Notas |
|---|---|---|---|---|---|---|---|---|
| `pt.displacement_cc` | 2487 | cm³ | — | S6 | S6 | engine | OFFICIAL | 87,50 × 103,48 mm; compresión 14,0:1 |
| `pt.cylinders` | 4 | — | — | S6 ("4-CYLINDER, IN-LINE") | S6 | engine | OFFICIAL | |
| `pt.fuel_tank_l` | 55 | L | — | S1 p.7; S6 | S1, S6 | engine | VERIFIED | |
| `pt.gears` | no aplica (e-CVT) | — | — | S6 | S6 | engine | OFFICIAL | |
| `pt.fiscal_hp_es` | NOT FOUND | CVF | — | — | — | — | — | |
| `pt.timing_drive` | `chain` | — | — | S6 ("2.5-LITRE, Chain Drive (with VVT-iE and VVT-i)") | S6 | engine | OFFICIAL | |

### 2.5 Batería (informativo)

| Dato | Valor | Fuente | Provenance | Notas |
|---|---|---|---|---|
| Química | Iones de litio | S6 ("HYBRID BATTERY LITHIUM ION"); S1 p.7 | VERIFIED | |
| Capacidad | 1,09 kWh | S6 ("BATTERY CAPACITY (kWh) 1.09") | OFFICIAL | S1 muestra "-" para el HEV |

### 2.6 Consumo y emisiones

| SpecKey | Valor | Unidad canónica | Ciclo | Fuente | URL | Granularidad | Provenance | Notas |
|---|---|---|---|---|---|---|---|---|
| `nrg.fuel_combined_l100` | 4.9–5.2 | L/100 km | **WLTP** | S1 p.7 ("Consumo en ciclo combinado 4,9 - 5,2"; nota "Ciclo combinado WLTP"); S6 ("WLTP COMBINED CYCLE 4.9 -5.2"); S4 | S1, S4, S6 | engine+drivetrain | VERIFIED | rango; "pendiente de homologación final" (S1). La nota TME 2026 habla de "up to 5.8 l/100 km" = cifra de la versión AWD |
| `nrg.fuel_urban_l100` | NOT FOUND | L/100 km | — | — | — | — | — | |
| `nrg.fuel_extra_urban_l100` | NOT FOUND | L/100 km | — | — | — | — | — | |
| `nrg.fuel_wltp_low/medium/high/extra_high_l100` | NOT FOUND | L/100 km | WLTP | — | — | — | — | ninguna fuente oficial publica fases |
| `emi.co2_combined_gkm` | **112–117** (ES) · 112–118 (EU) | g/km | **WLTP** | S1 p.7 y S4: 112–117 · S1 p.2 y S6: 112–118 | S1, S4, S6 | engine+drivetrain | OFFICIAL (**conflicto** en el máximo) | el propio catálogo ES es incoherente (p.2 "112-118", p.7 "112 - 117"). Se propone 112–117 (tabla técnica ES + web) |
| `emi.dgt_label_es` | `ECO` | — | — | S7 (regla HEV + gasolina Euro 6); S11/S4 muestran distintivo ECO en la ficha del modelo | S7, S4 | regla / model | **CALCULATED** (+ indicio OFFICIAL a nivel modelo) | la web muestra imágenes de etiqueta "ECO" y "0" (PHEV) a nivel modelo, no por versión |

### 2.7 Seguridad y ADAS (S1 p.5 — lista de gama, **sin desglose por acabado** salvo notas)

| SpecKey | Valor | Unidad | Fuente | Granularidad | Provenance | Notas |
|---|---|---|---|---|---|---|
| `saf.ncap_stars` | NOT FOUND | 0–5 | S8 | — | — | sin rating Euro NCAP publicado a 2026-09-24 (ver §4) |
| `saf.ncap_adult_pct` / `child` / `vru` / `assist` | NOT FOUND | % | S8 | — | — | |
| `saf.airbags_count` | 7 | — | S1 p.5 ("7 airbags (delanteros, laterales, de cortina y rodillas conductor)") | model | OFFICIAL | |
| `adas.aeb` | `standard` | enum | S1 p.5 ("Sistema de seguridad pre-colisión…") | model | OFFICIAL | no se especifica por acabado |
| `adas.aeb_vru` | `standard` | enum | S1 p.5 ("…con detector de peatones y ciclistas y motocicletas precedentes") | model | OFFICIAL | |
| `adas.acc` | `unknown` | enum | — | — | — | S1 no lo lista; la nota TME lo menciona solo junto al Lane Change Assist |
| `adas.lane_keep` | `standard` | enum | S1 p.5 ("Asistente de mantenimiento de carril (LTA)") | model | OFFICIAL | |
| `adas.blind_spot` | `unknown` | enum | — | — | — | no listado en S1 |
| `adas.rear_cross_traffic` | `standard` | enum | S1 p.5 ("Alerta de tráfico trasero cruzado (RCTA)") | model | OFFICIAL | |
| `adas.traffic_sign_recognition` | `standard` | enum | S1 p.5 ("Reconocimiento de señales de tráfico (RSA)") | model | OFFICIAL | |
| `adas.driver_monitoring` | `standard` | enum | S1 p.5 ("Detector de fatiga por cámara (DMC)") | model | OFFICIAL | |
| `adas.surround_camera` | `not_available` | enum | S1 p.5 nota 2 ("Únicamente para GR SPORT, Limited y Spirit Plus"); p.9 (Spirit Plus solo PHEV) | trim | OFFICIAL | |

### 2.8 Tecnología (Advance)

| SpecKey | Valor | Fuente | Provenance | Notas |
|---|---|---|---|---|
| `tech.apple_carplay` | NOT FOUND | — | — | ni S1 ni S3/S4/S6 lo mencionan |
| `tech.android_auto` | NOT FOUND | — | — | idem |
| `tech.center_screen_in` | 12.9 | S1 p.4 ("pantalla de 12,9"… De serie desde Advance"); p.8 ("ToyotaConnect con pantalla de 32,76 cm (12,9")") | OFFICIAL | |
| `tech.digital_cluster` | `standard` (12,3") | S1 p.3–4 ("cuadro de instrumentos digital de 12.3"") | OFFICIAL | no desglosado por acabado |
| `tech.connected_services` | `standard` | S1 p.8 ("Servicios conectados estándar… sin coste adicional durante 10 años") | OFFICIAL | |
| `tech.ota_updates` | `standard` | S1 p.5 ("Actualizaciones remotas del sistema con correcciones y mejoras (OTA)") | OFFICIAL | |

### 2.9 Garantía y mantenimiento

| SpecKey | Valor | Unidad | Fuente | Provenance | Notas |
|---|---|---|---|---|---|
| `war.years` | 3 | años | S4 ("3 años de garantía o 100.000 km (lo que antes suceda)") | OFFICIAL | nivel marca/mercado |
| `war.km` | 100000 | km | S4 | OFFICIAL | |
| `war.conditions` | "lo que antes suceda"; la web remite además a Toyota Relax | — | S4 | OFFICIAL | condiciones de Toyota Relax no consultadas |
| `mnt.service_interval_km` / `months` | NOT FOUND | — | — | — | |

---

## 3. Precios (`vehicle_prices`)

| price_type | Importe | Moneda | incl_taxes | valid_from / fecha | Alcance | Fuente | Provenance | Notas |
|---|---|---|---|---|---|---|---|---|
| `current_new` | **47.250** | EUR | sí: IVA y transporte (inferido, ver nota) | observado 2026-09-24; la página muestra fecha CMS "02 Enero 2023" (no fiable) | trim: Hybrid 200 **Advance** | S5 ("Advance · PVP 47.250 € · Descuento 3.000 € · Precio final 44.250 €") | OFFICIAL | **PVP sin promoción**. Inclusión de impuestos: S5 no tiene notas; S4 indica para el precio de 44.250 € "IVA, transporte, promoción y aportaciones de Toyota España y del concesionario incluidas. Oferta válida hasta 30-09-2026" → 47.250 = 44.250 + 3.000 de promoción, IVA y transporte incluidos. Impuesto de matriculación: no indicado |
| (promocional, excluido) | 44.250 | EUR | sí (IVA, transporte, promoción) | válido hasta 2026-09-30 | Advance | S4, S5, S3 | OFFICIAL | **no se usa** (incluye promoción) |
| `current_new` Spirit (referencia) | 50.250 (PVP) / 47.250 (final con 3.000 € dto.) | EUR | idem | idem | trim Spirit | S5 | OFFICIAL | |
| Opciones de pintura | Blanco Classic 325 · Bi-tono perlada 225 · Metalizada 650 · Perlada 875 | EUR | — | — | opción | S5 | OFFICIAL | |
| Histórico lanzamiento | "desde 43.500 €" (2026-01-20) | EUR | no indicado | 2026-01-20 | HEV FWD | S2 | OFFICIAL | precio "desde" de lanzamiento, sin acabado ni condiciones |

---

## 4. Seguridad (`safety_ratings`)

| authority | stars | adult % | child % | VRU % | safety assist % | test_year | protocol | Fuente | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Euro NCAP | **NOT FOUND** | — | — | — | — | — | — | S8 | A 2026-09-24 no se ha encontrado resultado Euro NCAP de la 6.ª gen.: las notas de prensa de Euro NCAP de 2026 (14-09, 02-09, 08-07, 30-06, 13-05, 08-04, 28-01, 14-01) no mencionan el RAV4 y el filtro de resultados RAV4 con protocolo 2026 no devolvió resultados. El único rating RAV4 vigente en Euro NCAP es el de 2019 (XA50), **expirado desde 2026-01-01** y **no aplicable** a esta generación |

**Categoría Safety**: activable por la vía alternativa (≥ 4 `adas.*` conocidas): AEB, AEB VRU, lane keep, RCTA, TSR, driver monitoring, 360° conocidas (7) — pero a nivel de gama, no de acabado.

---

## 5. Recalls

**NOT FOUND**: no se ha encontrado en Safety Gate ni en fuentes oficiales Toyota España ninguna campaña que afecte a la 6.ª generación (producción desde 2025/2026). El recall SR/03911/25 (Parking Assist + PVM, producción 2021–2025, vía car-recalls.eu, SECONDARY) afecta a RAV4 anteriores; no se ha verificado que incluya la 6.ª gen.

---

## 6. Cobertura de claves críticas (HEV)

| Categoría | Clave crítica | Estado | Valor / nota |
|---|---|---|---|
| Economy / Range / Eco | `nrg.fuel_combined_l100` | **FOUND** | 4,9–5,2 L/100 km WLTP (rango, pendiente homologación) |
| Economy | precio (`current_new`) | **FOUND** | 47.250 € PVP Advance (sin promoción) |
| Range | `pt.fuel_tank_l` | **FOUND** | 55 L |
| Performance | `perf.power_max_kw` | **FOUND (con conflicto)** | 136 kW / 185 CV (catálogo ES: 183 CV) |
| Performance | `perf.accel_0_100_s` | **FOUND** | 8,0 s |
| Size | `dim.length_mm` | **FOUND** | 4600 |
| Size | `dim.width_mm` | **FOUND** | 1855 |
| Size | `dim.height_mm` | **FOUND (con conflicto)** | 1680 ES / 1695 EU |
| Size / Practicality | `cap.boot_l` | **FOUND** | 514 L VDA |
| Practicality | `seats` | **NOT FOUND** | ninguna fuente oficial lo declara |
| Eco | `emi.co2_combined_gkm` | **FOUND (con conflicto)** | 112–117 (ES) / 112–118 (EU) WLTP |
| Eco | `emi.dgt_label_es` | **FOUND (CALCULATED)** | ECO |
| Safety | rating con protocolo **o** ≥ 4 `adas.*` | **FOUND vía ADAS** (rating NOT FOUND) | 7 claves adas conocidas |
| Warranty | `war.years` | **FOUND** | 3 años |

**Resultado**: 13/14 FOUND (3 con conflicto ES/EU, 1 CALCULATED, Safety solo vía ADAS) · 1 NOT FOUND (`seats`) → **Practicality/Family no activable** hasta obtener nº de plazas de fuente oficial (p. ej. ficha técnica completa o COC).

---

## 7. Fricciones con el catálogo

1. **`emissions_standard` "EURO 6 AP"**: la ficha TME da un código de homologación (letras AP) en lugar de la sub-norma; el enum no tiene `Euro6e`, `Euro6e-bis`, `Euro6e-bis-FCM` ni forma de guardar el código literal. Hace falta ampliar el enum y un campo `emissions_code_raw`.
2. **Conflictos ES vs EU dentro de fuentes oficiales**: potencia (183 vs 185 CV), altura (1680 vs 1695), CO₂ máx. (117 vs 118), masa (1665 vs rangos 1625–1735). El catálogo exige un valor por mercado: la regla de precedencia (fuente de mercado ES > ficha europea) debe documentarse en `@vscar/quality`.
3. **Datos "pendientes de homologación final"**: todo el dato del lanzamiento es provisional. Falta un estado `PROVISIONAL`/`PENDING_HOMOLOGATION` en `SourcedValue` y un disparador de re-curación.
4. **Potencia del motor térmico mal etiquetada** en la fuente oficial ("System maximum output" = 105 kW térmico; "Total system max power" = 136 kW). La curación no puede ser un mapeo automático de etiquetas.
5. **Par "combinado" vs "solo térmico"**: misma cifra (221 N·m) con definiciones opuestas en S1 y S6 → refuerza la necesidad de `perf.torque_ice_nm` separado (ver DC-01).
6. **Radio vs diámetro de giro**: S6 da 5,63/5,68 m como "turning circle" (son radios). `dim.turning_circle_m` necesita `method`/`is_radius`.
7. **Maletero "hasta el techo con asientos en uso" (749 L)**: no encaja en `cap.boot_max_l` (asientos abatidos), que queda NOT FOUND. Proponer `cap.boot_to_roof_l`.
8. **Consumo/CO₂ en rango** (4,9–5,2; 112–117): igual que DC-01, falta `min/max`.
9. **Denominación comercial ≠ potencia** ("Hybrid 200" para 183/185 CV): `trim_name`/nombre de versión necesita campo `engine_commercial_name` para casar con precios/configurador.
10. **`seats`/`doors` ausentes** en ficha europea y catálogo ES de lanzamiento: un campo estructural obligatorio que las fuentes de lanzamiento no dan.
11. **Equipamiento ADAS solo a nivel gama**: el catálogo lista "Toyota Assist… más de 30 prestaciones" sin tabla por acabado (solo notas de exclusión). El enum por trim no puede rellenarse con certeza → `standard` a nivel modelo con granularidad `model` (riesgo de sobreasignación a Advance). ACC y BSM quedan `unknown`.
12. **Precio: fecha de tarifa no fiable**: la página oficial de precios muestra una fecha CMS (2023-01-02) anterior al modelo; no declara IVA/transporte (se infiere de la web). `vehicle_prices.valid_from` necesita admitir "observed_at" cuando la fuente no fecha la tarifa. Tampoco hay dato de impuesto de matriculación incluido o no.
13. **Rating de seguridad inexistente** para un coche nuevo a la venta: el catálogo debería distinguir `not_yet_rated` de `unknown`, y bloquear explícitamente heredar el rating de la generación anterior (XA50, expirado).
14. **Etiqueta DGT**: la web oficial muestra el distintivo a nivel de modelo (ECO/0 mezclados HEV/PHEV); por versión solo CALCULATED por regla.
15. **Garantía**: la web remite a "Toyota Relax" (extensión condicionada a mantenimiento) → `war.conditions` texto libre insuficiente para calcular garantía restante en usados futuros; falta `war.extended_program`.
