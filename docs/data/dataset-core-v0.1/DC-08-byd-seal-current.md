# DC-08 — BYD SEAL actual (ES, 2026) · Design RWD 82,5 kWh

> Caso: **EV nuevo** (par con DC-07). Mercado **ES**. Fecha de consulta de todas las fuentes: **2026-09-24**.
> Estado: curación v0.1, pendiente de revisión humana. Solo se registran valores vistos en páginas o documentos consultados en esta sesión.

**Trim elegido: SEAL Design** (tracción trasera, 230 kW, batería 82,5 kWh). Es el RWD con la batería grande: el Comfort RWD lleva 61,4 kWh y el Excellence es AWD. Además es la variante que ensayó Euro NCAP. Que sea la "de mayor volumen de ventas" en ES **no se pudo verificar** (NOT FOUND); se elige por ser la variante RWD con la batería de 82,5 kWh.

**Fase**: SEAL **renovado 2026** (nota de prensa oficial BYD España, "Abril de 2026"): maletero trasero de 400 a 485 L, frunk de 53 a 72 L sin tapa, llantas de 19", DMS y llave Bluetooth. La nota dice que se mantiene "la misma gama mecánica".

---

## 1. Identidad resuelta

| Campo | Valor | Fuente |
|---|---|---|
| `market_code` | `ES` | byd.com/es-es |
| Fabricante | BYD (catálogo editado por "BYD Europe B.V., Hoofddorp, Netherlands") | Catálogo ES `SEAL 2026-0126-BPS-ES-V2` |
| Modelo | SEAL | byd.com/es-es/coches-electricos/seal |
| `generation_code` | 1.ª generación "SEAL" (e-Platform 3.0, CTB); **fase 2026 "renovado"** | Página del modelo; nota de prensa de abril de 2026 |
| Código de tipo / versión (IDAE) | `SE2R1C/2NTE5F002NL1` | coches.idae.es (detalle id 606454) |
| Periodo de venta en ES | Modelo "desde su lanzamiento a finales de 2023"; fase renovada desde abril de 2026 (fecha de la nota); fin: a la venta a 2026-09-24 | Nota de prensa BYD ES (abril de 2026); página del modelo (oferta "válida hasta el 30/09/2026") |
| `model_year` | 2026 | Catálogo "SEAL 2026" |
| `trim_name` | `Design` | Catálogo; IDAE |
| `powertrain_type` | `BEV` | IDAE ("Eléctricos puros") |
| `drivetrain` | `RWD` | Catálogo ("Sistema de tracción: RWD"); Euro NCAP "Electric - Design, 4x2" |
| `transmission` | IDAE: "Automático". El catálogo **no** declara transmisión (solo "Trasero: Motor síncrono de imanes permanentes") | IDAE. Ver fricciones (`single_speed` vs `automatic`) |
| `body_type` | `sedan` ("4 door Sedan"; BYD: "berlina") | euroncap.com; byd.com |
| `seats` | 5 ("Nº de Plazas Máximas: 5") | IDAE |
| `doors` | 4 ("4 door Sedan") | euroncap.com |
| Batería | BYD Blade Battery (**LFP**), **82,5 kWh**, tensión nominal 550,4 V. El catálogo **no dice si es bruta o útil** | Catálogo, p. 7 "Características técnicas" |

---

## 2. Tabla de valores

Abreviaturas de fuente:
- **CAT**: catálogo oficial BYD SEAL ES, `https://www.byd.com/material/byd-site/es-es/seal/SEAL%202026-0126-BPS-ES-V2-web_catalogo.pdf` (enlazado como "CATÁLOGO" desde la página del modelo). Las cifras del PDF están en una fuente sin mapa Unicode, así que se leyeron sobre la **página renderizada** (p. 4–7).
- **WEB**: `https://www.byd.com/es-es/coches-electricos/seal` (incluye FAQ y textos legales).
- **NP**: nota de prensa oficial "BYD Seal se actualiza con más espacio, tecnología y hasta 530 CV", `https://www.byd.com/es-es/news-list/byd-renueva-seal-mas-espacio-y-tecnologia` (abril de 2026).
- **IDAE**: `https://coches.idae.es/base-datos/marca-y-modelo` (BYD → SEAL → detalle id 606454).
- **NCAP**: `https://www.euroncap.com/assessments/byd/seal/1044/`.

| SpecKey | Valor | Unidad canónica | Ciclo | Fuente | URL | Granularidad | Provenance | Notas |
|---|---|---|---|---|---|---|---|---|
| `nrg.electric_combined_kwh100` | **16,6** | kWh/100 km | WLTP | CAT ("Consumo en ciclo combinado (kWh/100km) … Design 16,6"; nota 5: "calculado bajo la Normativa (EU) 2017-1151"); IDAE ("Consumo eléctrico 16,60 kWh/100km") | CAT; IDAE | trim | OFFICIAL | La WEB da el rango de gama "15,4 - 18,2" (con la errata "hWh/100Km"). La fuente **no declara** si incluye pérdidas de carga |
| `nrg.electric_urban_kwh100` | 13,8 | kWh/100 km | WLTP | CAT ("Consumo en ciclo urbano … Design 13,8") | CAT | trim | OFFICIAL | "Urbano" WLTP (City); la fase exacta no se declara |
| `nrg.electric_highway_kwh100` | NOT FOUND | kWh/100 km | — | — | — | — | — | |
| `rng.electric_combined_km` | **570** | km | WLTP | CAT; WEB FAQ ("La autonomía homologada (ciclo WLTP) … Versión Design (RWD): Hasta 570 km en ciclo combinado"); NP; IDAE ("Autonomía eléctrica 570,0 km") | CAT; WEB; IDAE | trim | OFFICIAL | |
| `rng.electric_urban_km` | 690 | km | WLTP | CAT ("Autonomía eléctrica en ciclo urbano (km) … Design 690"); WEB FAQ | CAT; WEB | trim | OFFICIAL | |
| `rng.electric_highway_km` | NOT FOUND | km | — | — | — | — | — | |
| `bat.usable_kwh` | NOT FOUND (oficial) | kWh | — | — | — | — | — | **Crítica BEV**. BYD solo publica "Capacidad de la batería (kWh) 82,5", sin tipo. No se consultó ningún tercero para este dato (queda pendiente como SECONDARY si se decide buscarlo). Range se activa igualmente por `rng.electric_combined_km` |
| `bat.gross_kwh` | 82,5 (**tipo no declarado**) | kWh | — | CAT ("Capacidad de la batería (kWh) … Design 82,5"); NP ("equipa una batería de 82,5 kWh"); IDAE ("Capacidad de batería 82,50 kWh") | CAT; NP; IDAE | trim | OFFICIAL (valor) · tipo desconocido | No se asigna a bruta ni a útil sin fuente. Ver fricciones |
| `bat.chemistry` | `LFP` | enum | — | CAT ("Tipo de batería: BYD Blade Battery (LFP)"); WEB ("tecnología de litio-ferrofosfato (LFP)") | CAT; WEB | model | OFFICIAL | |
| `bat.heat_pump` | standard | enum | — | CAT ("Bomba de calor" ● en Design); WEB ("sistema de bomba de calor de alta eficiencia de serie") | CAT; WEB | trim | OFFICIAL | |
| `bat.warranty_years` | 8 | años | — | WEB, texto legal ("Batería 8 años/250.000 km") | WEB | market/model | OFFICIAL | |
| `bat.warranty_km` | **250.000** (texto legal) · conflicto: FAQ = 200.000 | km | — | WEB, texto legal y bloque "garantía completa de 8 años o 250.000 km* … para su revolucionaria Blade Battery" vs WEB FAQ ("8 años o 200.000 km* para el motor y la batería") | WEB | market/model | OFFICIAL (conflicto interno) | Se propone 250.000 km (texto legal + bloque principal); el conflicto queda para revisión humana |
| `bat.warranty_soh_pct` | NOT FOUND | % | — | — | — | — | — | "Condiciones detalladas en concesionarios y web oficial BYD", sin cifra de SOH |
| `chg.ac_max_kw` | **11** | kW | — | CAT ("Potencia máxima de carga en CA 11kW"; "Cargador integrado de 11 kW (OBC)" ● Design); WEB ("cargador de a bordo de 11 kW") | CAT; WEB | trim | OFFICIAL | |
| `chg.ac_phases` | 3 | — | — | CAT ("Tiempo de carga en CA (cargador trifásico de 11kW) 0-100% … Design 8,6h") | CAT | trim | OFFICIAL | Inferido del texto "cargador trifásico de 11 kW" del propio catálogo |
| `chg.dc_max_kw` | **150** | kW | — | CAT ("Potencia máxima de carga en CC … Design 150kw"); WEB FAQ ("Las versiones Design y Excellence AWD admiten potencias de hasta 150 kW") | CAT; WEB | trim | OFFICIAL | Comfort: 110 kW |
| `chg.dc_10_80_min` | **37** | min | — | CAT ("Tiempo de carga en CC - SOC 10%-80% … 37min"); WEB FAQ ("del 10 % al 80 % en 37 minutos") | CAT; WEB | trim | OFFICIAL | Nota 7 del CAT: requiere cargador CCS2 de más de 100 kW y más de 500 V, a 25 °C |
| (sin clave) 30–80 % DC | 26 | min | — | CAT; WEB ("del 30 % al 80 % en tan solo 26 minutos") | CAT; WEB | trim | OFFICIAL | BYD destaca el 30–80 %, no el 10–80 %. Ver fricciones |
| (sin clave) AC 0–100 % | 8,6 | h | — | CAT; WEB FAQ ("entre 6,5 y 8,6 horas" según versión) | CAT | trim | OFFICIAL | |
| `chg.dc_connector` | `CCS2` | enum | — | CAT ("Puerto de carga: CCS2") | CAT | trim | OFFICIAL | |
| `chg.v2l` | standard | enum | — | CAT ("Función de carga bidireccional (V2L)" ● Design; nota 4: requiere cable específico) | CAT | trim | OFFICIAL | El cable puede venderse aparte |
| `chg.charging_curve` | NOT FOUND | — | — | — | — | — | — | |
| `perf.power_max_kw` | **230** | kW | — | CAT ("Potencia máxima (kW) … 230"); WEB ("230 kW (313CV) … calculados según el Reglamento (CE) 715/2007"); IDAE ("Potencia eléctrica 230,0 kw") | CAT; WEB; IDAE | trim | OFFICIAL | CV = 313 (dato comercial) |
| `perf.torque_max_nm` | 360 | N·m | — | CAT ("Par máximo (Nm) … Design 360") | CAT | trim | OFFICIAL | Ojo: el Comfort (170 kW) publica 380 Nm, más que el Design |
| `perf.accel_0_100_s` | **5,9** | s | — | CAT ("Aceleración 0-100 km/h (s) … 5,9"); WEB FAQ | CAT; WEB | trim | OFFICIAL | |
| `perf.top_speed_kmh` | 180 | km/h | — | CAT ("Velocidad máxima (km/h) … Design 180") | CAT | trim | OFFICIAL | |
| `perf.power_electric_kw` | 230 | kW | — | ídem | | trim | OFFICIAL | Un solo motor trasero síncrono de imanes permanentes |
| `dim.length_mm` | **4.800** | mm | — | CAT p. 6 ("Longitud 4.800"); WEB; IDAE ("4.800 x 1.875 x 1.460 mm") | CAT; WEB; IDAE | model | OFFICIAL | |
| `dim.width_mm` | **1.875** | mm | — | CAT ("Anchura 1.875"); WEB; IDAE | ídem | model | OFFICIAL | |
| `dim.width_mirrors_mm` | 2.150 | mm | — | CAT ("Anchura con los retrovisores exteriores desplegados 2.150") | CAT | model | OFFICIAL | |
| `dim.height_mm` | **1.460** | mm | — | CAT ("Altura 1.460"); WEB; IDAE | ídem | model | OFFICIAL | |
| `dim.wheelbase_mm` | 2.920 | mm | — | CAT ("Distancia entre ejes 2.920"); WEB | CAT; WEB | model | OFFICIAL | Vías: 1.620 delante / 1.625 detrás |
| `dim.ground_clearance_mm` | NOT FOUND | mm | — | — | — | — | — | |
| `dim.turning_circle_m` | 5,7 (**rotulado "radio"**) | m | — | CAT ("Radio de giro (m) 5,7") | CAT | model | OFFICIAL | La clave es *diámetro*, la fuente dice *radio*. No es comparable con el "radio" de 11,6 m de Tesla (DC-07) |
| `dim.kerb_weight_kg` | **2.055** (CAT "Peso en vacío") · 2.091 (coche ensayado por Euro NCAP, 2023) | kg | — | CAT; NCAP | CAT; NCAP | trim / tested vehicle | OFFICIAL | "Peso en vacío" sin definición de norma. El coche Euro NCAP es anterior a la renovación de 2026 |
| `dim.gross_weight_kg` | 2.501 | kg | — | CAT ("Peso bruto del vehículo (kg) … 2.501"); IDAE ("MTMA 2.501") | CAT; IDAE | trim | OFFICIAL | Cargas máx. por eje: 1.120 delante / 1.401 detrás |
| `cap.boot_l` | **485** | L | — | CAT ("Volumen del maletero (L) 485"); WEB ("maletero trasero de 485 litros"); NP ("pasa de 400 a 485 litros") | CAT; WEB; NP | model (fase 2026) | OFFICIAL | **Método (VDA/SAE) no declarado**. Antes de la renovación de 2026: 400 L |
| `cap.frunk_l` | 72 | L | — | CAT ("Volumen del maletero delantero (L) 72"); NP ("crece de 53 a 72 litros y elimina su tapa") | CAT; NP | model (fase 2026) | OFFICIAL | |
| `cap.boot_max_l` | NOT FOUND | L | — | — | — | — | — | Asientos 60:40 abatibles (CAT), sin volumen |
| `cap.towing_braked_kg` | 1.000 | kg | — | CAT ("Capacidad máxima de remolque (con frenos, kg) … Design 1.000") | CAT | trim | OFFICIAL | Nota 8: solo con bolas de remolque verificadas por el fabricante |
| `cap.towing_unbraked_kg` | 750 | kg | — | CAT ("(sin frenos, kg) … 750") | CAT | trim | OFFICIAL | |
| `cap.isofix_positions` | NOT FOUND (numérico) | — | — | CAT ("ISOFIX e i-Size en el asiento del acompañante y en los asientos traseros") | CAT | trim | — | No da el número de plazas traseras con ISOFIX. No se infiere |
| `emi.co2_combined_gkm` | 0 | g/km | WLTP | CAT; IDAE ("Emisiones según ciclo WLTP 0 g CO2/km") | CAT; IDAE | trim | OFFICIAL | |
| `emi.dgt_label_es` | `0` | enum | — | DGT ("Cero emisiones" para "eléctricos de batería (BEV) …") | https://www.dgt.es/nuestros-servicios/tu-vehiculo/tus-vehiculos/distintivo-ambiental/ | regla (market) | CALCULATED (regla oficial DGT) | |
| `saf.airbags_count` | NOT FOUND (numérico) | — | — | CAT: airbag frontal conductor, frontal acompañante (desconectable), central delantero, laterales delanteros y traseros, de cortina | CAT | trim | — | No se suman: la fuente no da un total |
| `adas.aeb` | standard | enum | — | CAT ("Frenado automático de emergencia (AEB)" ●) | CAT | trim | OFFICIAL | |
| `adas.aeb_vru` | unknown | enum | — | — | — | — | — | El CAT no desglosa peatón/ciclista |
| `adas.acc` | standard | enum | — | CAT ("Control de crucero adaptativo (ACC) y control de crucero inteligente (ICC)" ●) | CAT | trim | OFFICIAL | Stop&go no declarado; "Asistente en atascos (TJA)" ● |
| `adas.lane_keep` | standard | enum | — | CAT ("Asistente de cambio de carril (LDA) y advertencia… (LDW)" ●; "ELKA" ●) | CAT | trim | OFFICIAL | Ojo: BYD traduce LDA como "Asistente de cambio de carril" |
| `adas.blind_spot` | standard | enum | — | CAT ("Detección de vehículos en el ángulo muerto (BSD)" ●) | CAT | trim | OFFICIAL | |
| `adas.rear_cross_traffic` | standard | enum | — | CAT ("RCTA con sistema de frenado automático (RCTB)" ●) | CAT | trim | OFFICIAL | |
| `adas.traffic_sign_recognition` | standard | enum | — | CAT ("Reconocimiento de señales de tráfico (TSR)" ●) | CAT | trim | OFFICIAL | |
| `adas.driver_monitoring` | standard | enum | — | CAT ("Sistema avanzado de advertencia de distracción del conductor (ADDW)" ●); NP ("nuevo sistema de detección de fatiga del conductor (DMS)") | CAT; NP | trim (fase 2026) | OFFICIAL | Novedad de la fase 2026 |
| `adas.surround_camera` | standard | enum | — | CAT ("Cámara de visión 360º" ●) | CAT | trim | OFFICIAL | |
| `tech.apple_carplay` | standard (con cable o inalámbrico: no especificado) | enum | — | CAT ("Android Auto™ y Apple CarPlay" ●) | CAT | trim | OFFICIAL | El enum del catálogo exige `wireless`/`wired`: la fuente no lo dice |
| `tech.android_auto` | standard (con cable o inalámbrico: no especificado) | enum | — | ídem | CAT | trim | OFFICIAL | La nota 3 describe requisitos para Android Auto inalámbrico, sin afirmar que venga de serie |
| `tech.center_screen_in` | 15,6 | in | — | CAT ("Pantalla táctil de alta resolución de 15,6" (39,6 cm)") | CAT | trim | OFFICIAL | |
| `tech.digital_cluster` | standard (10,25") | enum | — | CAT ("Cuadro de instrumentos digital con pantalla LCD … de 10,25"") | CAT | trim | OFFICIAL | HUD: no disponible en Design (solo Excellence AWD) |
| `tech.connected_services` | standard | enum | — | CAT ("Servicios en la nube - BYD APP" ●; "Conectividad 4G" ●) | CAT | trim | OFFICIAL | |
| `tech.ota_updates` | NOT FOUND | enum | — | — | — | — | — | |
| `war.years` | **6** | años | — | WEB, texto legal ("General 6 años/150.000 km"); WEB FAQ ("6 años o 150.000 km para el vehículo") | WEB | market/model | OFFICIAL | |
| `war.km` | 150.000 | km | — | ídem | WEB | market/model | OFFICIAL | Motor: 8 años/150.000 km (texto legal) |
| `war.conditions` | "Coberturas sujetas a límite de tiempo o kilometraje (lo que antes suceda) … Condiciones detalladas en concesionarios y web oficial BYD" | text | — | WEB | WEB | market | OFFICIAL | |
| `mnt.*` | NOT FOUND | — | — | — | — | — | — | |

Otros datos oficiales sin SpecKey: Cx 0,219 (CAT); tensión nominal de batería 550,4 V (CAT); suspensión delantera de paralelogramo deformable y trasera multibrazo (CAT); rigidez torsional de 40.500 Nm/° (WEB).

---

## 3. Precios

**Nota de prensa oficial (abril de 2026), Península y Baleares, SEAL Design:**

| price_type | Valor | Moneda | Impuestos | Fecha | Fuente | Provenance | Notas |
|---|---|---|---|---|---|---|---|
| `current_new` | **49.490** ("PVP recomendado") | EUR | No declarado explícitamente en la tabla; la nota legal de la web para una oferta equivalente dice "Incluye impuestos calculados al tipo general" | Abril de 2026 | NP | OFFICIAL | **Precio sin incentivos**. Es el valor que se propone para `current_new` |
| (con incentivos, no es `current_new`) | 42.990 ("Precio con campañas, Plan Auto+") | EUR | — | Abril de 2026 | NP | OFFICIAL | Incluye campañas y Plan Auto+ |
| (con incentivos, no es `current_new`) | 37.115 ("Precio con campañas, Plan Auto+, CAE y oferta de financiación") | EUR | — | Abril de 2026 | NP | OFFICIAL | También es el precio "desde" del titular de la nota |
| `current_new` (Canarias) | 40.901 ("PVP recomendado", Islas Canarias) | EUR | Régimen canario (no declarado) | Abril de 2026 | NP | OFFICIAL | Muestra que ES tiene subregiones fiscales |

- **Incentivos (registrar aparte)** según el texto legal de la WEB (oferta del Comfort, válida hasta el 30/09/2026): "adelanto de 3.375,00 € correspondiente a la subvención estatal del Plan Auto+ (Plan España Auto 2030) … según RD-ley 02/2026 y a la disponibilidad de fondos del Ministerio de Industria y Turismo" y "el incentivo de 950,00 € por el Plan CAE (Certificado de Ahorro Energético)". Esas cifras vienen de la oferta del **Comfort**; que sean iguales para el Design **no está declarado**.
- La WEB (2026-09-24) solo muestra la oferta del **Comfort** ("Precio Recomendado Contado: 40.775,34 €"). No se encontró en la web un precio vigente del Design a fecha de consulta distinto del de la nota de abril de 2026. Queda pendiente confirmarlo en el configurador (JS, no extraíble aquí).

---

## 4. Seguridad

| authority | test_year | protocol_version | Estrellas | Adulto | Infantil | VRU | Safety Assist | Estado | Fuente |
|---|---|---|---|---|---|---|---|---|---|
| Euro NCAP | **2023** | Euro NCAP 2023 | **5** | **89 %** | **87 %** | **82 %** | **76 %** | Publicado el 2023-10-25; sin revisiones ni expiración listadas a 2026-09-24 | https://www.euroncap.com/assessments/byd/seal/1044/ |

- Coche ensayado: "BYD SEAL 'Design' 4x2, LHD", 2.091 kg. Variantes cubiertas: "4 door Sedan · Electric - Design * · 4x2" y "Electric - Excellence AWD · 4x4" (LHD y RHD). **El Comfort (61,4 kWh) no aparece** en la tabla de variantes.
- El rating es **anterior a la renovación de 2026** (maletero, llantas de 19", DMS). La web de BYD sigue diciendo "5 estrellas en Euro NCAP". Euro NCAP no lista ninguna "Facelift Review" para la fase 2026.
- No es comparable directamente con el 2019 del Model 3 (DC-07): protocolo distinto y rating de Tesla expirado.

---

## 5. Recalls

**NOT FOUND en fuente oficial accesible.**
- EU Safety Gate: la búsqueda por API no fue accesible (405/WAF) y ninguna alerta revisada era de BYD.
- KBA: acceso bloqueado (403).
- Fuera de la UE hay prensa sobre un recall voluntario de batería del Seal en **India** (autocarindia.com, team-bhp.com; solo resultados de búsqueda). **No aplica al mercado ES** y no se registra.
- Un resumen de búsqueda atribuía al Seal la ref. KBA 14299R, pero su descripción ("sistema multimedia MBUX") es de Mercedes-Benz: es ruido del buscador y se descarta.

---

## 6. Cobertura de claves críticas (BEV)

| Categoría | Clave crítica | Estado |
|---|---|---|
| Economy | `nrg.electric_combined_kwh100` | **FOUND** (OFFICIAL, WLTP; CAT + IDAE) |
| Economy | precio `current_new` | **FOUND** (PVP recomendado de abril de 2026; vigencia a septiembre de 2026 no confirmada) |
| Range | `rng.electric_combined_km` | **FOUND** (OFFICIAL, WLTP) |
| Range (alt.) | `bat.usable_kwh` | **NOT FOUND** (solo 82,5 kWh sin tipo) |
| Charging | `chg.ac_max_kw` | **FOUND** (OFFICIAL) |
| Charging | `chg.dc_max_kw` | **FOUND** (OFFICIAL) |
| Performance | `perf.power_max_kw`, `perf.accel_0_100_s` | FOUND |
| Size | `dim.length_mm`, `dim.width_mm`, `dim.height_mm` | FOUND |
| Size / Practicality | `cap.boot_l` | FOUND (485 L, método no declarado) |
| Practicality | `seats` | FOUND (IDAE) |
| Eco | `emi.dgt_label_es` | FOUND (CALCULATED por regla DGT) |
| Safety | rating con protocolo | FOUND (2023, previo a la fase 2026) |
| Warranty | `war.years` (+ `bat.warranty_years`) | FOUND (conflicto de km en la garantía de batería) |

Resumen: todas las claves críticas obligatorias BEV están FOUND con fuente oficial. `bat.usable_kwh` queda NOT FOUND, pero no bloquea Range porque se activa por autonomía.

---

## 7. Fricciones con el catálogo

1. **Batería bruta, útil o "sin tipo"**: BYD, IDAE y la nota de prensa publican 82,5 kWh sin decir si es bruta o útil. Es el mismo problema que en DC-07. Se propone `capacity_basis: gross|usable|unspecified` (o `bat.capacity_unspecified_kwh`). Sin él, `bat.usable_kwh` (crítica alternativa de Range) casi nunca tendrá fuente oficial.
2. **DC 10–80 % vs 30–80 %**: BYD destaca "30 % al 80 % en 26 min" y publica también 10–80 % en 37 min. Otras marcas publican 10–80 %, 20–80 % o 5–80 %. Hacen falta `chg.dc_time_min` con `soc_from`/`soc_to`, o claves hermanas, y una regla de "no comparar ventanas distintas". También hace falta `chg.ac_full_time_h` (8,6 h) si se quiere mostrar.
3. **Condiciones de la carga DC**: el catálogo exige más de 100 kW, más de 500 V y 25 °C. `chg.dc_max_kw` no tiene dónde guardar condiciones. Propuesta: campo de notas estructurado o `conditions` en el SourcedValue.
4. **Radio vs diámetro de giro**: "Radio de giro 5,7 m" (BYD) frente a "Radio de giro (entre bordillos) 11,6 m" (Tesla). Con la misma etiqueta los valores difieren en un factor de 2. `dim.turning_circle_m` necesita `measure: radius|diameter` y método.
5. **Fase de modelo sin "generación" nueva**: la renovación de 2026 cambia maletero (400→485 L), frunk (53→72 L), llantas y ADAS (DMS) pero no la mecánica. ¿Es `facelift`? BYD lo llama "renovado". Hace falta un criterio (p. ej. cualquier cambio de SpecKey A/B implica `facelift` o `phase`). Sin él, el rating de Euro NCAP de 2023 (coche de 2.091 kg y 400 L) se asocia sin aviso a la fase 2026 (2.055 kg y 485 L).
6. **Rating aplicado a una fase posterior**: Euro NCAP no lista revisión para 2026. El catálogo necesita `rating_applies_to_phase` o `tested_vehicle_phase`, para avisar de que el rating corresponde a una fase anterior.
7. **Garantía de batería con conflicto interno oficial**: la misma página dice 8 a/250.000 km (texto legal y bloque principal) y 8 a/200.000 km (FAQ, "motor y batería"). Además el motor tiene su propia garantía (8 a/150.000 km), distinta de la general (6 a/150.000 km). Falta `war.powertrain_years`/`war.powertrain_km` (motor/unidad de tracción; Tesla también la separa) y una regla de prioridad (texto legal > FAQ).
8. **Transmisión**: IDAE dice "Automático" para el Seal y "Sin cambio" para el Model 3, cuando ambos son de una sola marcha. Hace falta una regla de normalización BEV → `single_speed` solo con fuente, o aceptar `automatic` de IDAE como equivalente.
9. **Precio con incentivos por capas**: la nota da tres precios (PVP, con campañas + Plan Auto+, con campañas + Plan Auto+ + CAE + financiación) y además Canarias. `vehicle_prices` necesita `region` (península + Baleares vs Canarias), `price_basis` (`pvp_recomendado`, `with_campaigns`, `with_incentives`, `with_financing`) y una tabla `incentives` separada (Plan Auto+ 3.375 €, CAE 950 €). Sin eso, el precio "desde 34.455 €" del titular se colaría como `current_new`.
10. **Vigencia del precio**: el precio de abril de 2026 no se confirmó en septiembre de 2026, porque la web solo muestra la oferta del Comfort. `current_new` necesita `valid_from`/`valid_to` y un `last_verified_at` distinto de `retrieved_at`.
11. **Enum de CarPlay/Android Auto**: el catálogo exige `standard_wireless|standard_wired`. BYD solo marca "de serie", así que falta el valor `standard_unspecified`.
12. **`saf.airbags_count` y `cap.isofix_positions`**: BYD lista los airbags por tipo y el ISOFIX por plaza, sin totales. Sumar sería CALCULATED con riesgo ("laterales delanteros y traseros" = ¿4?). Mejor registrar listas estructuradas (`airbags: [driver, passenger, center, side_front, side_rear, curtain]`).
13. **Masa**: "Peso en vacío 2.055 kg" (sin norma) frente a 2.091 kg (coche Euro NCAP de la fase anterior). Es el mismo problema de `mass_definition` que en DC-07.
14. **Maletero sin método**: 485 L sin VDA/SAE declarado. Es la pregunta Q3 del catálogo, sin resolver.
15. **Parámetro de volumen de ventas**: el encargo pedía "la variante de mayor volumen". Ninguna fuente oficial consultada da ventas por versión en ES, así que falta una fuente (ANFAC/DGT microdatos) para ese criterio de selección.
16. **EEA sin datos recientes**: la tabla `[CO2Emission].[latest].[co2cars]` de discodata solo devolvió años 2021–2022 para ES, así que no sirve para cruzar el Seal (lanzado a finales de 2023). IDAE es la fuente oficial disponible para variantes actuales.
17. **Pérdidas de carga**: el catálogo remite a "Normativa (EU) 2017-1151" sin decir si el consumo incluye pérdidas de carga. Pasa lo mismo que en DC-07.
18. **Formato de las fuentes**: el PDF del catálogo usa una fuente sin mapa Unicode para las cifras, así que la extracción de texto devuelve las tablas vacías y hubo que leer las páginas renderizadas. Es un riesgo para la ingesta automática (§33): hace falta OCR o revisión manual para catálogos de BYD.
