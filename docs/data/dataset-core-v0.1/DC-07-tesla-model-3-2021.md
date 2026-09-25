# DC-07 — Tesla Model 3 2021 (ES) · "Autonomía Estándar Plus" RWD

> Caso: **EV usado** (par con DC-08). Mercado **ES**. Fecha de consulta de todas las fuentes: **2026-09-24**.
> Estado: curación v0.1, pendiente de revisión humana. Solo se registran valores vistos en páginas o documentos consultados en esta sesión.

**Ventana de validez de los datos (importante)**: la Reference Variant se fija como **Model 3 "Autonomía estándar plus, tracción trasera"** tal como se vendía en tesla.com/es_es entre **2021-01-28 y 2021-11-01** (snapshots archivados con 448 km). Tesla cambió especificaciones dentro del mismo año:

| Snapshot oficial archivado (tesla.com/es_es/model3) | Nombre del trim | Autonomía | 0–100 | Peso | Espacio de carga | Garantía batería |
|---|---|---|---|---|---|---|
| 2020-12-05 | Estándar Plus | 430 km "(est.)" | 5,6 s | 1.745 kg | 542 L | 8 a / 160.000 km |
| 2021-01-28 | Estándar Plus | **448 km "(est.)"** | 5,6 s | 1.745 kg | 542 L | 8 a / 160.000 km |
| 2021-03-04 / 2021-06-06 | Estándar Plus | 448 km | 5,6 s | 1.745 kg | 542 L | 8 a / 160.000 km |
| 2021-09-27 / 2021-11-01 | Estándar Plus | 448 km "(WLTP)" | 5,6 s | 1.745 kg | **649 L** | 8 a / 160.000 km |
| **2021-12-03** | **"Tracción trasera"** (nuevo nombre) | **491 km (WLTP)** | **6,1 s** | **1.760 kg** | 649 L | 8 a / 160.000 km |

La variante de diciembre de 2021 ("Tracción trasera", 491 km) es **otra Reference Variant**: IDAE la registra como entrada separada y la EEA la registra con otro código de variante (`E6LR`). Este fichero **no** la cubre.

---

## 1. Identidad resuelta

| Campo | Valor | Fuente |
|---|---|---|
| `market_code` | `ES` | tesla.com/es_es (archivado) |
| Fabricante | Tesla, Inc. (EEA: `Man` = "TESLA INC"; homologación UE `E4*2007/46*1293*19`) | EEA CO2 cars 2021 (registros ES) |
| Modelo | Model 3 | tesla.com/es_es/model3 (archivado) |
| `generation_code` / fase | Model 3 **pre-"Highland"** (manual oficial rotulado "MODEL 3 2017–2023"; IDAE separa "Model 3" de "Model 3 Highland"; Euro NCAP registra una "Facelift Review" el 2023-10-15) | Manual del propietario Europa v2021.32; coches.idae.es; euroncap.com |
| Fase dentro de 2021 | Versión de 448 km (snapshots 2021-01-28 → 2021-11-01). Ver tabla de arriba | tesla.com/es_es/model3 (archivado) |
| Periodo de venta en ES | Esta variante (448 km): **2021-01-28 → 2021-11-01** según los snapshots consultados; en la EEA hay matriculaciones ES del código de variante `E6R` de 2021-01-04 a 2021-06-29 y de `E6CR` de 2021-08-03 a 2021-11-22. Inicio y fin comerciales exactos: **NOT FOUND** | web.archive.org de tesla.com; EEA |
| `model_year` | 2021 | — (año de matriculación; Tesla no publica "model year" en ES) |
| `trim_name` | "Autonomía estándar plus, tracción trasera" (configurador; código de opción `$MT337`) / "Estándar Plus" (página del modelo) | tesla.com/es_ES/model3/design (archivado) |
| `powertrain_type` | `BEV` | IDAE ("Eléctricos puros") |
| `drivetrain` | `RWD` ("Tracción trasera") | tesla.com/es_es/model3 (archivado); Euro NCAP "Rear Wheel Drive Electric - Model 3, 4x2" |
| `transmission` | `single_speed` ("Piñón fijo de una sola velocidad", relación 9:1) | Manual v2021.32, p. 208. IDAE dice "Sin cambio" |
| `body_type` | `sedan` ("4 door Sedan") | euroncap.com |
| `seats` | 5 ("5 adultos"; IDAE "Nº de Plazas Máximas: 5") | tesla.com/es_es (archivado); IDAE |
| `doors` | 4 ("4 door Sedan") | euroncap.com |
| `emissions_standard` | NOT FOUND (no aplica a efectos prácticos en un BEV; ver fricciones) | — |
| Batería | IDAE: "Capacidad de batería 50,00 kWh" (**no dice si es bruta o útil**). Química: el manual oficial dice "**Algunos** vehículos de autonomía estándar plus están equipados con una batería de litio-ferrofosfato (LFP)". Que esta variante lleve la LFP de CATL (55,0 kWh nominales / 52,5 kWh útiles) **solo aparece en ev-database** (SECONDARY) | IDAE; Manual v2021.32 p. 177; ev-database.org/car/1320 |

**Códigos EEA de esta variante (matriculaciones ES 2021, estado "F"/final)**: `Va`=`E6R` / `E6CR`, `Ve`=`PGB1S5N`, `PQB1S5N`, `PB1S5N`, `PGB1S5T1`. Todos con `Ep`=239 kW, `Z`=142 Wh/km, `Zr`=448 km (440 km en `PB1S5N`, de enero a junio de 2021). Hay además 33 registros de `E1LR`/`E1R` (208 kW, 140/149 Wh/km, 448/409 km, 1.700/1.684 kg) que parecen **otra batería u otro origen de fábrica dentro del mismo nombre comercial**. No se integran aquí. La tabla de cross-check de ev-database (SECONDARY) asocia 142 Wh/km a "CATL 6C (LFP)" y 140 Wh/km a "PANA 2170L (NCA)".

---

## 2. Tabla de valores

Abreviaturas de fuente:
- **T-WEB**: tesla.com/es_es/model3 **archivado** (web.archive.org). Oficial archivado.
- **T-CFG**: tesla.com/es_ES/model3/design **archivado** (JSON del configurador). Oficial archivado.
- **T-MAN**: Manual del propietario Model 3, Europa, software 2021.32 (PDF archivado de tesla.com). Oficial archivado.
- **IDAE**: coches.idae.es, ficha 562352 "TESLA Model 3 Autonomía estándar plus". Oficial.
- **EEA**: EEA CO2 cars (discodata `[CO2Emission].[latest].[co2cars]`), Year=2021, MS=ES. Oficial, a nivel de registro de matriculación agregado.
- **NCAP**: euroncap.com/en/results/tesla/model-3/37573.
- **EVDB**: ev-database.org (tercero, SECONDARY_REFERENCE).

URLs:
- T-WEB: `https://web.archive.org/web/20210606034750/https://www.tesla.com/es_es/model3`, `.../20210128052522/...`, `.../20210927062147/...`, `.../20211101094639/...`, `.../20211203021509/...`, `.../20201205214559/...`
- T-CFG: `https://web.archive.org/web/20210204034703/https://www.tesla.com/es_ES/model3/design`, `.../20210522230035/...`, `.../20210918142135/...`, `.../20211103120034/...`
- T-MAN: `https://web.archive.org/web/20211104133348/https://www.tesla.com/sites/default/files/model_3_owners_manual_europe_es.pdf`
- IDAE: `https://coches.idae.es/base-datos/marca-y-modelo` (marca TESLA → Model 3 → detalle id 562352)
- EEA: `https://discodata.eea.europa.eu/sql` (consulta agregada por Va/Ve, MS='ES', Year=2021, TAN `E4*2007/46*1293*%`)

| SpecKey | Valor | Unidad canónica | Ciclo | Fuente | URL | Granularidad | Provenance | Notas |
|---|---|---|---|---|---|---|---|---|
| `nrg.electric_combined_kwh100` | **14,2** | kWh/100 km | WLTP | IDAE | coches.idae.es (id 562352) | trim | OFFICIAL | IDAE: "Consumo eléctrico 14,20 kWh/100km", junto a "Emisiones según ciclo WLTP". La fuente **no declara** si incluye pérdidas de carga |
| `nrg.electric_combined_kwh100` (cross-check) | 14,2 (orig. 142 Wh/km) | kWh/100 km | WLTP | EEA | discodata.eea.europa.eu | registration_record (Va E6R/E6CR) | VERIFIED | Coincide con IDAE. Convertido de Wh/km |
| `nrg.electric_urban_kwh100` | NOT FOUND | kWh/100 km | — | — | — | — | — | Ni IDAE ni Tesla ES publican fases WLTP |
| `nrg.electric_highway_kwh100` | NOT FOUND | kWh/100 km | — | — | — | — | — | |
| `rng.electric_combined_km` | **448** | km | WLTP | T-WEB (2021-09-27 y 2021-11-01, rotulado "Autonomía (WLTP)"); IDAE ("Autonomía eléctrica 448,0 km") | ver arriba | trim | OFFICIAL | Ojo: en el snapshot de 2021-01-28 el mismo 448 aparece como "Autonomía (est.)", sin ciclo. EEA `Zr`=448 (VERIFIED). Hasta 2020-12 era 430 km |
| `rng.electric_urban_km` | NOT FOUND | km | — | — | — | — | — | |
| `rng.electric_highway_km` | NOT FOUND | km | — | — | — | — | — | |
| `bat.usable_kwh` | 52,5 | kWh | — | EVDB (car/1320, "CATL 6C") | ev-database.org/car/1320 | engine (pack) | **SECONDARY_REFERENCE** | **Crítica BEV sin fuente oficial.** No es publicable. Asignarla a esta variante depende de suponer la química (ver identidad) |
| `bat.gross_kwh` | 50,0 (IDAE, **tipo no declarado**) / 55,0 nominal (EVDB) | kWh | — | IDAE / EVDB | ver arriba | trim / engine | OFFICIAL (valor) · tipo desconocido | IDAE solo dice "Capacidad de batería 50,00 kWh". No se puede asignar a bruta ni a útil. **Conflicto** con EVDB (55,0 nominal / 52,5 útil). No se deriva nada |
| `bat.chemistry` | `LFP` (probable) / `unknown` | enum | — | T-MAN p. 177 ("Algunos vehículos de autonomía estándar plus están equipados con una batería de litio-ferrofosfato (LFP)"); EVDB | T-MAN; ev-database.org/car/1320 | generation (manual) / engine (EVDB) | OFFICIAL = "algunos" · SECONDARY = LFP para esta variante | Publicable solo como `unknown`, con la nota "LFP u otra según unidad" |
| `bat.heat_pump` | unknown | enum | — | T-MAN p. 175 (figura de componentes de alta tensión: "1. Conjunto de la bomba de calor") | T-MAN | generation | OFFICIAL (mención) | El manual lo lista como componente sin asociarlo a trim ni fecha; no basta para `standard` |
| `bat.warranty_years` | 8 | años | — | T-WEB ("Batería y unidad de tracción: 8 años o 160 000 km, lo que suceda primero"); T-CFG (`$BAT08` "Standard and SR+ Battery Warranty", coverage_age 96 meses) | T-WEB, T-CFG | trim | OFFICIAL | Long Range / Performance: 8 a / 192.000 km |
| `bat.warranty_km` | 160.000 | km | — | T-WEB; T-CFG (`coverage_odometer_kilometers`: 160000) | ídem | trim | OFFICIAL | |
| `bat.warranty_soh_pct` | NOT FOUND | % | — | — | — | — | — | Ni la web ES ni el configurador de 2021 declaran SOH mínimo |
| `chg.ac_max_kw` | 11 | kW | — | EVDB | ev-database.org/car/1320 y /1485 | engine | **SECONDARY_REFERENCE** | **Crítica BEV sin fuente oficial.** El manual v2021.32 no da la potencia del cargador embarcado |
| `chg.dc_max_kw` | 170 | kW | — | EVDB | ídem | engine | **SECONDARY_REFERENCE** | **Crítica BEV sin fuente oficial.** Tesla ES 2021 solo dice "Supercarga: Pago por uso" y "Recargue hasta 299 km en 15 minutos" (cifra genérica de gama, no del trim) |
| `chg.dc_10_80_min` | 24 (CATL) / 26 (PANA) | min | — | EVDB | ídem | engine | SECONDARY_REFERENCE | El valor cambia según la batería supuesta |
| `chg.ac_phases` | 3 | — | — | EVDB ("Type 2 (3-phase)") | ídem | engine | SECONDARY_REFERENCE | |
| `chg.dc_connector` | `CCS2` | enum | — | EVDB ("CCS"); T-MAN solo alude a "capacidad de carga CCS" y a www.tesla.com/CCScombo2 | ídem; T-MAN p. 150, 176 | engine / generation | SECONDARY_REFERENCE (con indicio OFFICIAL) | El manual no dice de forma explícita "CCS2 de serie" para este trim |
| `chg.v2l` | NOT FOUND | enum | — | — | — | — | — | |
| `perf.power_max_kw` | **239** | kW | — | T-MAN p. 208 ("RWD (motor trasero) … Potencia máxima: 239 kW a 5525 rpm", "Probado según el Reglamento 85 de la CEPE"); IDAE ("Potencia eléctrica 239,0 kw"); EEA `Ep`=239 | T-MAN; IDAE; EEA | generation (manual) / trim (IDAE) | OFFICIAL | EEA E1LR (minoritaria) = 208 kW → no mezclar |
| `perf.torque_max_nm` | 420 | N·m | — | T-MAN p. 208 ("Par máximo: 420 Nm a 325-5200 rpm", RWD) | T-MAN | generation | OFFICIAL | El manual dice "RWD", sin distinguir baterías |
| `perf.accel_0_100_s` | **5,6** | s | — | T-WEB (2021-01-28 → 2021-11-01) | T-WEB | trim | OFFICIAL (archivado) | En 2021-12 ("Tracción trasera") pasa a 6,1 s |
| `perf.top_speed_kmh` | 225 | km/h | — | T-WEB (tabla comparativa "Estándar Plus / Tracción trasera … 225 km/h") | T-WEB 2021-06-06 y 2021-09-27 | trim | OFFICIAL (archivado) | |
| `perf.power_electric_kw` | 239 | kW | — | ídem `perf.power_max_kw` | | | OFFICIAL | Redundante en BEV |
| `dim.length_mm` | **4.694** | mm | — | T-MAN p. 206 ("Longitud total 184,8" 4694 mm"); IDAE (4.694) | T-MAN; IDAE | generation | OFFICIAL | |
| `dim.width_mm` | **1.849** (manual) / 1.850 (IDAE) | mm | — | T-MAN ("Anchura total (sin espejos) 1849 mm"); IDAE ("4.694 x 1.850 x 1.443") | ídem | generation / trim | OFFICIAL | **Conflicto de 1 mm** entre dos fuentes oficiales. Propuesta: 1.849 (manual, definición explícita) |
| `dim.width_mirrors_mm` | 2.088 | mm | — | T-MAN ("Anchura total (con espejos) 2088 mm"; plegados 1933 mm) | T-MAN | generation | OFFICIAL | |
| `dim.height_mm` | **1.443** | mm | — | T-MAN ("Altura total - suspensión con muelles 1443 mm"); IDAE | ídem | generation | OFFICIAL | |
| `dim.wheelbase_mm` | 2.875 | mm | — | T-MAN ("Distancia entre ejes 2875 mm"); EEA `W`=2875 | ídem | generation | OFFICIAL | |
| `dim.ground_clearance_mm` | 140 | mm | — | T-MAN ("Distancia al suelo - suspensión con muelles 140 mm") | T-MAN | generation | OFFICIAL | |
| `dim.turning_circle_m` | 11,6 (**rotulado "radio"**) | m | — | T-MAN p. 209 ("Radio de giro (entre bordillos) 11,6 metros") | T-MAN | generation | OFFICIAL | La clave es *diámetro*, la fuente dice *radio*. Ver fricciones |
| `dim.kerb_weight_kg` | 1.745 (T-WEB, "Peso") / 1.825 (EEA `M`) | kg | — | T-WEB; EEA | ídem | trim / registration_record | OFFICIAL / VERIFIED | **Conflicto**: la web no define la norma; la EEA `M` corresponde a la masa del registro de monitorización (definición del campo no leída en esta sesión) |
| `dim.gross_weight_kg` | 2.139 | kg | — | IDAE ("MTMA 2.139") | IDAE | trim | OFFICIAL | EEA `Mt` = 1.905 kg es la masa de ensayo WLTP, no la MMA |
| `cap.boot_l` | 561 (maletero trasero) | L | — | T-MAN p. 207 ("Detrás de la segunda fila 19,8 pies cúbicos (561 L)") | T-MAN | generation | OFFICIAL | **Método (VDA/SAE) no declarado**. Original en ft³. T-WEB publica 542 L hasta 2021-06 y 649 L (= total con frunk) desde 2021-09 |
| `cap.frunk_l` | 88 | L | — | T-MAN ("Maletero delantero 3,1 pies cúbicos (88 L)") | T-MAN | generation | OFFICIAL | |
| `cap.boot_max_l` | NOT FOUND | L | — | — | — | — | — | 649 L es "total máximo con 5 pasajeros" (trasero + frunk), no con asientos abatidos |
| `cap.towing_braked_kg` | NOT FOUND | kg | — | T-MAN remite al certificado de conformidad | — | — | — | El manual solo fija 100 kg de peso máximo en el punto de acoplamiento (no Performance) |
| `cap.towing_unbraked_kg` | NOT FOUND | kg | — | — | — | — | — | |
| `cap.isofix_positions` | NOT FOUND (numérico) | — | — | — | — | — | — | Euro NCAP lista Isofix/i-Size por plaza con iconos que no se pudieron leer como texto |
| `emi.co2_combined_gkm` | 0 | g/km | WLTP | IDAE ("Emisiones según ciclo WLTP 0 g CO2/km"); EEA `Ewltp`=0 | IDAE; EEA | trim | OFFICIAL | Además es CALCULATED por definición en BEV (catálogo §4 nota 3) |
| `emi.dgt_label_es` | `0` | enum | — | DGT: el distintivo "Cero emisiones" aplica a "eléctricos de batería (BEV) …" | https://www.dgt.es/nuestros-servicios/tu-vehiculo/tus-vehiculos/distintivo-ambiental/ | regla (market) | CALCULATED (regla oficial DGT) | Derivado de powertrain=BEV (Q4 del catálogo). La DGT permite consultar por matrícula, no por variante |
| `adas.aeb` | standard | enum | — | T-WEB ("características avanzadas de seguridad activa, que incluyen … Frenado de emergencia automático") | T-WEB 2021-06-06 | model | OFFICIAL (archivado) | Frase de marketing ligada al rating Euro NCAP |
| `adas.lane_keep` | standard | enum | — | T-WEB ("… un juego de Sistemas de soporte de carril …") | ídem | model | OFFICIAL (archivado) | |
| `adas.acc` | unknown | enum | — | T-WEB ("Todos los Model 3 nuevos vienen de serie con un hardware avanzado capaz de ofrecer las funciones de Piloto automático") | ídem | model | — | Habla del hardware, no de la función activada. No se asume |
| `adas.*` (resto) | unknown | enum | — | — | — | — | — | El manual describe funciones como "alerta de colisión por ángulo muerto", sin decir si son de serie |
| `tech.center_screen_in` | 15 | in | — | T-WEB ("Pantalla táctil central de 15”") | T-WEB | trim | OFFICIAL (archivado) | |
| `tech.ota_updates` | standard | enum | — | T-WEB ("Las actualizaciones de software inalámbricas introducen nuevas características…") | T-WEB | model | OFFICIAL (archivado) | |
| `tech.apple_carplay` / `tech.android_auto` | NOT FOUND | enum | — | — | — | — | — | Ninguna fuente oficial consultada lo menciona |
| `war.years` | **4** | años | — | T-WEB ("Vehículo básico: 4 años u 80 000 km, lo que suceda primero"); T-CFG (`$GN00`, 48 meses) | T-WEB; T-CFG | market/model | OFFICIAL | |
| `war.km` | 80.000 | km | — | ídem | ídem | market/model | OFFICIAL | |
| `mnt.*` | NOT FOUND | — | — | — | — | — | — | |

Otros datos oficiales sin SpecKey (se registran por si sirven):
- Tensión nominal de la batería de alta tensión: 360 V CC (coches fabricados en EE. UU.) / 355,2 V CC (coches fabricados en China). Fuente: T-MAN p. 210.
- Suposición interna del configurador para calcular "ahorro de combustible": `kwh_consumption: 0.159` (kWh/km), `kwh_price: 0.22`, `supercharger_kwh_price: 0.29`, 100.000 km / 60 meses. Es un supuesto comercial de Tesla y **no es un consumo homologado**. No se usa.

---

## 3. Precios

| price_type | Valor | Moneda | Impuestos | Fecha / validez | Fuente | Provenance | Notas |
|---|---|---|---|---|---|---|---|
| `original_list` | **49.000** | EUR | IVA 21 % **incluido** | snapshot 2021-02-04 | T-CFG, opciones `$MT314`/`$MT320`/`$MT336`, `base_plus_trim` = 49000 | OFFICIAL (archivado) | El configurador ES define `vat_percent: 21, period: included` |
| `original_list` | **45.990** | EUR | IVA 21 % incluido | snapshots 2021-05-22 y 2021-09-18 | T-CFG, `$MT337` "Model 3 Autonomía estándar plus, tracción trasera", `base_plus_trim` = 45990 (base 43.400 + trim 2.590) | OFFICIAL (archivado) | |
| `original_list` | **46.990** | EUR | IVA 21 % incluido | snapshot 2021-11-03 | T-CFG, `$MT337`, `base_plus_trim` = 46990 | OFFICIAL (archivado) | |

- **No incluidos en el precio**: "Registration and doc fee" de **980 €** (`reg_and_doc_fee`, pago único, mercado ES) y los incentivos. Precios **sin MOVES**.
- **Incentivos (registrar aparte, no restar)**. En el configurador de 2021-05-22 figuran "Programa MOVES II" (empresas) y "Programa MOVES III" (particulares). Texto oficial del configurador: "Incentivo Plan MOVES de hasta 7.000 €". La descripción de MOVES II dice que el Model 3 Standard Range Plus "entra en esta ayuda, no pudiendo superar EUR 45.000 (antes de IVA)". La ayuda es de "EUR 5.500 … en el caso de achatarrar un vehículo de más de 7 años o EUR 4.000 sin la necesidad" de achatarrar, más "un descuento de EUR 1.000 (excluyendo IVA) por parte de Tesla". El JSON también contiene una regla `toggle_amount` de 1.210 € con `vehiclePrice <= 53470`, cuyo significado no se puede interpretar sin la UI. **No se usa**.
- Un precio de 47.792 € aparece solo en un resumen de búsqueda de todoselectricos.com (tercero). No se verificó y no se usa.

---

## 4. Seguridad

| authority | test_year | protocol_version | Estrellas | Adulto | Infantil | VRU | Safety Assist | Estado | Fuente |
|---|---|---|---|---|---|---|---|---|---|
| Euro NCAP | **2019** | Euro NCAP 2019 (el sitio lo presenta como rating "2019") | **5** | **96 %** | **86 %** | **74 %** | **94 %** | **Rating Expired** el **2026-01-01** | https://www.euroncap.com/en/results/tesla/model-3/37573 (y /es/…) |

- Coche ensayado: "Tesla Model 3 Long Range RWD, LHD", 1.760 kg. Tabla de variantes: "4 door Sedan · Rear Wheel Drive Electric - Model 3* · 4x2" (* = variante ensayada), además de AWD y Performance; aplica a LHD y RHD. **El rating cubre la variante RWD**, aunque el coche ensayado era un Long Range, no un SR+.
- Historial: publicado el 2019-07-03; revisiones anuales 2020–2023; "Facelift Review" el 2023-10-15; **expirado el 2026-01-01**. VScar debe mostrar el rating con su año (2019) y la marca "expirado". No se compara con protocolos de 2023 (DC-08).
- La web de Tesla ES (2021) dice: "calificación de seguridad de 5 estrellas de la Euro NCAP en general y en todas las categorías".
- `saf.airbags_count`: NOT FOUND.

---

## 5. Recalls

**NOT FOUND en fuente oficial accesible.**
- EU Safety Gate: la API de búsqueda devolvió 405/WAF desde este entorno. Se revisaron 9 alertas de "Motor vehicles" localizadas por búsqueda y ninguna era de Tesla.
- KBA (base de datos alemana de recalls): acceso 403 (proxy de KBA).
- Portal de Tesla (`service.tesla.com/vin-recall-search`): pide VIN; no sirve a nivel de variante.
- Pistas **no verificadas** (solo aparecen en resúmenes de búsqueda de prensa alemana, sin cargar la página oficial): KBA ref. 011850 (Model 3/Y MY2021–2022, refrigeración de procesadores) y 011824 (eCall). Deben verificarse contra KBA o Safety Gate antes de registrarse.

---

## 6. Cobertura de claves críticas (BEV)

| Categoría | Clave crítica | Estado |
|---|---|---|
| Economy | `nrg.electric_combined_kwh100` | **FOUND** (OFFICIAL IDAE, WLTP; VERIFIED EEA) |
| Economy | precio `original_list` | **FOUND** (OFFICIAL archivado, 3 precios con fecha) |
| Range | `rng.electric_combined_km` | **FOUND** (OFFICIAL, WLTP) → Range activable sin `bat.usable_kwh` |
| Range (alt.) | `bat.usable_kwh` | **SECONDARY ONLY** |
| Charging | `chg.ac_max_kw` | **SECONDARY ONLY** |
| Charging | `chg.dc_max_kw` | **SECONDARY ONLY** → **Charging NO se activa** con datos publicables |
| Performance | `perf.power_max_kw` | FOUND |
| Performance | `perf.accel_0_100_s` | FOUND |
| Size | `dim.length_mm`, `dim.width_mm`, `dim.height_mm` | FOUND |
| Size / Practicality | `cap.boot_l` | FOUND (561 L, método no declarado) |
| Practicality | `seats` | FOUND |
| Eco | `emi.dgt_label_es` | FOUND (CALCULATED por regla DGT) |
| Safety | rating con protocolo | FOUND (2019, **expirado**) |
| Warranty | `war.years` (+ `bat.warranty_years`) | FOUND |

Resumen: 13/15 claves críticas FOUND con fuente publicable; `chg.ac_max_kw` y `chg.dc_max_kw` SECONDARY ONLY. `bat.usable_kwh` también es SECONDARY ONLY, pero no bloquea Range.

---

## 7. Fricciones con el catálogo

1. **Batería bruta, útil o "sin tipo"**: la única cifra oficial (IDAE "Capacidad de batería 50,00 kWh") no dice si es bruta o útil. Además no cuadra con el tercero (55,0 nominal / 52,5 útil). Hace falta un tipo `bat.capacity_unspecified_kwh`, o un atributo `capacity_basis: gross|usable|unspecified` en el SourcedValue, para no forzar el dato en `bat.gross_kwh` ni en `bat.usable_kwh`.
2. **Carga AC/DC de Tesla sin fuente oficial para 2021**: ni la web ES archivada ni el manual europeo 2021.32 publican los kW de carga. Charging solo se podría activar con SECONDARY_REFERENCE. Sirve para decidir si se admite `VERIFIED` desde tests independientes o si Charging queda "NOT AVAILABLE" en usados Tesla.
3. **Cambios de especificación a mitad de año (Tesla)**: en 2021 cambian la autonomía (430→448 en enero; 448→491 en diciembre), el nombre del trim ("Estándar Plus"→"Tracción trasera"), el 0–100 (5,6→6,1 s), la masa, la forma de publicar el maletero (542→649 L) y el precio (49.000→45.990→46.990 €). `model_year` no basta para identificar la variante. Se proponen `valid_from`/`valid_to` obligatorios en la variant y la clave de resolución **EEA/CoC `Va`+`Ve`** (p. ej. `E6R`/`E6CR` vs `E6LR`) como `homologation_variant_code`. Encaja con la Used Vehicle Instance: la fecha de matriculación decide qué fase aplica.
4. **Mismo nombre comercial, distinta batería u origen**: la EEA muestra `E1LR` (208 kW, 140 Wh/km, 1.700 kg) conviviendo con `E6*` (239 kW, 142 Wh/km, 1.825 kg) bajo "Standard Range Plus" en 2021. El catálogo no tiene `battery_variant` / `cell_supplier` ni `production_plant`. Para un EV usado importan (química LFP vs NCA → recomendación de carga al 100 %, degradación).
5. **Química**: el manual oficial solo dice "**algunos** SR+ llevan LFP" y explica cómo comprobarlo en la pantalla del coche. El enum `bat.chemistry` necesita `varies_by_unit`, o bien que la química pase a ser un campo de la Used Vehicle Instance (USER_PROVIDED o comprobable).
6. **Ciclo mal rotulado en la fuente oficial**: el mismo 448 km aparece como "(est.)" en enero de 2021 y como "(WLTP)" desde septiembre. IDAE sí lo asocia a WLTP. Regla propuesta: si el fabricante no rotula el ciclo, se toma el de una fuente oficial con ciclo explícito (IDAE/EEA) y se anota.
7. **Pérdidas de carga**: ninguna fuente oficial consultada (IDAE, EEA, Tesla) declara si el consumo incluye pérdidas de carga. El catálogo pide indicarlo. Hace falta una referencia normativa citada una sola vez en metodología, no por variant.
8. **Radio vs diámetro de giro**: Tesla publica "Radio de giro (entre bordillos) 11,6 m", un valor que por magnitud parece un diámetro. BYD publica "Radio de giro 5,7 m" (DC-08). `dim.turning_circle_m` necesita un atributo `measure: radius|diameter` y `method: kerb-to-kerb|wall-to-wall`, o se comparará mal.
9. **Maletero**: Tesla publica en ft³ convertidos, sin método VDA/SAE, y su web mezcla trasero (542/561 L) con total incluido el frunk (649 L). Conviene `cap.boot_total_incl_frunk_l`, o una regla explícita de que `cap.boot_l` excluye el frunk.
10. **Masa**: 1.745 kg (web, sin norma), 1.825 kg (EEA `M`), 1.905 kg (EEA `Mt`, masa de ensayo WLTP) y 1.760 kg (coche ensayado por Euro NCAP, LR). `dim.kerb_weight_kg` necesita `mass_definition` obligatorio (`EU_running_order_75kg`, `DIN_empty`, `test_mass`, `unspecified`).
11. **Rating Euro NCAP expirado**: el catálogo no contempla `rating_status` (`valid|expired`) ni `expiry_date`. Para un usado de 2021 el rating de 2019 es relevante, pero debe mostrarse como expirado y con su protocolo.
12. **Ensayado ≠ variant**: Euro NCAP ensayó un LR RWD y el rating "aplica" a la variante RWD. Hace falta distinguir `tested_variant` de `applies_to`.
13. **`emissions_standard` en BEV**: el enum (`Euro6d`, …) no tiene sentido para un BEV. Hace falta `not_applicable` o marcarlo como no obligatorio para BEV.
14. **Ancho**: 1.849 mm (manual) frente a 1.850 mm (IDAE). Conflicto oficial-oficial de 1 mm; necesita regla de desempate (fuente con definición explícita > base agregada).
15. **Precio**: el configurador separa `base` + `trim` y excluye 980 € de "tasa de entrega y documentación". `vehicle_prices` debería tener `excludes_fees` (o `otr` explícito). Los MOVES de 2021 dependían del tipo de comprador, del achatarramiento y de un tope de precio antes de IVA, así que conviene una tabla `incentives` separada con esas condiciones.
16. **Recalls**: las fuentes oficiales de la UE (Safety Gate, KBA) no son consultables de forma automatizada desde aquí. En Alpha habrá que decidir entre curación manual y dejar "NOT FOUND".
