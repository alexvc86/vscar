# DC-09 — SEAT León 2018 (Mk3 facelift, 5F) · 1.5 TSI (EcoTSI "EVO") 96 kW / 130 CV · Style · 5 puertas · ES

> Estado: **curación v0.1 — borrador** · Fecha de consulta de todas las fuentes: **2026-09-24** · Curador: agente data (VScar)
> Catálogo: [SPEC_KEY_CATALOG.md v0.1](../SPEC_KEY_CATALOG.md) · Reglas: [README.md §3](README.md)
> Regla aplicada: solo se registran valores vistos en fuentes consultadas en esta sesión. `NOT FOUND` = ausente.

**Motorización elegida**: 1.5 TSI 130 CV (objetivo principal). Está documentada en fuentes oficiales españolas (IDAE); no hizo falta recurrir al 1.0 TSI 115 CV.
**Trim elegido**: **Style** (la fila IDAE "SEAT LEON 1.5 TSI 96KW S/S STYLE MY19" es la más concreta que hay para 5 puertas).

---

## 0. Fuentes consultadas

| ID | Fuente | URL | Tipo | Granularidad | Notas |
|---|---|---|---|---|---|
| S1 | IDAE — *Guía de Vehículos Turismo de venta en España*, 12.ª ed., octubre 2019 | https://coches.idae.es/storage/pdf/Guiasemestre22019.pdf | OFICIAL (Administración, datos del IEA/ANFAC/ANIACAM) | trim (fila por versión comercial) | Columnas: cilindrada, cambio (M/A), potencia "CV (kW)", consumo l/100 km, CO₂ g/km, clase de consumo relativo. **La guía no dice qué ciclo usa**. |
| S2 | IDAE — misma guía, 13.ª ed., marzo 2020 | https://coches.idae.es/storage/pdf/Guiasemestre12020.pdf | OFICIAL | trim | Mismas filas MY19 (4,9 / 111) y otras filas MY20 de "1.5 EcoTSI 96kW" con 4,8 / 110. |
| S3 | Ministerio de Industria (SG Políticas Sectoriales Industriales), circular del 14/11/2018 "Información relativa al consumo de combustible y las emisiones de CO2 de los turismos nuevos" (alojada en IDAE) | https://coches.idae.es/pdf/20181112_%20Circular-Informacion_al_Consumidor_NEDC_WLTP%20v3ACB-I.pdf | OFICIAL (regulatoria) | mercado | Fija qué ciclo se usa para informar al consumidor en ES durante la transición (ver §7). |
| S4 | Catálogo SEAT León (seat.es), PDF creado el 26/01/2018, copia en Wayback del 19/07/2018 | https://web.archive.org/web/20180719200521/http://www.seat.es/content/dam/countries/es/Models/carworld-generic/catalogos/catalogo-leon.pdf | OFICIAL (copia archivada) | modelo/carrocería (5p gasolina) | Ficha técnica **anterior al 1.5 TSI** (motores 1.2 TSI 110, 1.4 TSI 125/150, 1.4 TGI, 2.0 TSI 300). Los valores NEDC que trae **no** son del 1.5 TSI. Sirve para dimensiones, maletero y depósito a nivel de carrocería. |
| S5 | Catálogo SEAT León (seat.es), PDF creado el 20/11/2018, copia en Wayback del 29/03/2019 | https://web.archive.org/web/20190329140119/https://www.seat.es/content/dam/countries/es/Models/carworld-generic/catalogos/catalogo-leon.pdf | OFICIAL (copia archivada) | mercado/modelo | **Ya no trae tabla técnica ni consumos** (catálogo posterior a WLTP). Trae el equipamiento de serie y las garantías. |
| S6 | seat.es — página del modelo León 5 puertas, Wayback del 13/12/2018 | https://web.archive.org/web/20181213235727/http://www.seat.es/coches/leon-5-puertas/modelo.html | OFICIAL (copia archivada) | modelo | Solo pone "León 5 Puertas Desde 16.430 €", sin condiciones. |
| S7 | Euro NCAP — SEAT Leon 2012, página oficial de resultados (Wayback del 06/01/2016) | https://web.archive.org/web/20160106191015/http://www.euroncap.com/en/results/seat/leon/10946 | OFICIAL (copia archivada) | generación | La URL viva (https://www.euroncap.com/en/results/seat/leon/10946) devuelve 404 el 2026-09-24. |
| S8 | SEAT, nota de prensa del 29/11/2012 reproducida por Automotive World | https://www.automotiveworld.com/news-releases/five-star-euro-ncap-performance-by-new-seat-leon-and-toledo/ | fabricante vía tercero | generación | Contraste con S7. |
| S9 | DGT — Distintivo ambiental | https://www.dgt.es/nuestros-servicios/tu-vehiculo/tus-vehiculos/distintivo-ambiental/ | OFICIAL | regla (mercado) | Criterios por combustible, fecha y Euro. La consulta por matrícula es por registro. |
| S10 | car-recalls.eu (agrega avisos de EU Safety Gate) | https://car-recalls.eu/recall/seat-leon-2016-2018/ · https://car-recalls.eu/recall/seat-leon-2012-2017-takata-airbags/ | TERCERO (cita los nº de alerta Safety Gate) | generación / periodo de fabricación | Solo para localizar. No se pudo consultar Safety Gate directamente. |
| S11 | km77.com — León 5p 1.5 EcoTSI 96 kW (130 CV) Start&Stop Style (2018-2020) | https://www.km77.com/coches/seat/leon/2017/5-puertas/style/leon-5p-15-tsi-96-kw-130-cv-startstop-style/datos | TERCERO | trim | **SECONDARY_REFERENCE**, no publicable. |
| S12 | diariomotor.com, 14/09/2018, "Este es el precio del SEAT León con el nuevo motor gasolina 1.5 EcoTSI de 130 CV" | https://www.diariomotor.com/noticia/precio-seat-leon-gasolina/ | PRENSA | trim | **SECONDARY_REFERENCE** (precio de lanzamiento). |

---

## 1. Identidad resuelta

| Campo | Valor | Fuente | Provenance | Notas |
|---|---|---|---|---|
| `market_code` | `ES` | S1 | OFFICIAL | |
| manufacturer | SEAT | S1, S4 | OFFICIAL | |
| model | León (5 puertas) | S1, S4 | OFFICIAL | |
| `generation_code` | `Mk3` (código de tipo **5F**) | S4 (URLs del catálogo `?var=5F1`, `5F5`, `5F8`) + S7 (León 2012 = inicio de la generación) | OFFICIAL (indirecto) | Ninguna fuente oficial escribe "Mk3". "5F" sale de los parámetros de las URLs de catálogo de seat.es. |
| `facelift` | Mk3 FL (2017–2020) | S4 (catálogo 2018 con gama FL), S11 ("2017" en la URL de la generación) | OFFICIAL / SECONDARY | La fecha exacta de inicio del FL en ES: NOT FOUND en fuente oficial. |
| `sales_start` / `sales_end` (motor 1.5 TSI 130, ES) | 2018-09 (aprox.) → 2020 | S12 (14/09/2018, precio de lanzamiento), S11 ("2018-2020") | SECONDARY_REFERENCE | NOT FOUND en fuente oficial. En S4 (catálogo de enero 2018) todavía no aparece el 1.5 TSI. |
| `model_year` | 2018 | — | — | **Aviso**: las filas IDAE oficiales van etiquetadas **"MY19"** (S1) o sin MY. No hay ninguna fila oficial "MY18" del 1.5 TSI 130. Un León 1.5 TSI matriculado en ES en 2018 pertenece comercialmente a la fase MY19. |
| `trim_name` | Style | S1 ("…S/S STYLE MY19") | OFFICIAL | |
| `powertrain_type` | `ICE` | S1 (listado GASOLINA) | OFFICIAL | |
| `fuel_type` | `petrol` | S1 | OFFICIAL | |
| `drivetrain` | `FWD` | S11 ("tracción delantera") | SECONDARY_REFERENCE | NOT FOUND en fuente oficial consultada. |
| `transmission` | `manual` (6 vel.) | S1 ("M"); 6 velocidades: S11 | OFFICIAL (manual) / SECONDARY (nº marchas) | |
| `body_type` | `hatchback` | S4 ("Tipo de carrocería: 5 Puertas") | OFFICIAL | |
| `seats` | NOT FOUND | — | — | Ninguna fuente oficial consultada da el nº de plazas. Es un **campo crítico** (Practicality). |
| `doors` | 5 | S4 | OFFICIAL | |
| `emissions_standard` | `Euro6` (subnivel NOT FOUND) | S11 ("Euro 6") | SECONDARY_REFERENCE | No sale en S1/S4/S5. Por la fecha (WLTP, sept. 2018) podría ser Euro 6d-TEMP, pero **no se asume**. |

---

## 2. Tabla de valores

Leyenda de ciclo: `NEDC_CORRELATED?` = valor en magnitud NEDC publicado por IDAE sin que la guía declare el ciclo (ver §7-F1).

| SpecKey | Valor | Unidad canónica | Ciclo | Fuente | URL | Granularidad | Provenance | Notas |
|---|---|---|---|---|---|---|---|---|
| `perf.power_max_kw` | 96 | kW | — | S1 | Guiasemestre22019.pdf, p. 147 | trim | OFFICIAL | Texto original: "130,43 (96)", es decir **CV (kW)**. En otras filas del mismo motor IDAE publica "177,99 (131)": error en la base (confunde CV con kW), ver §7-F6. |
| `perf.torque_max_nm` | 200 | N·m | — | S11 | km77 | trim | SECONDARY_REFERENCE | "200 Nm entre 1.400-4.000 rpm". La cifra oficial SEAT (200 Nm/1.400–4.000) que se encontró es de la **Mk4** (seat-cupra-mediacenter 2022); no se transfiere a otra generación. |
| `perf.accel_0_100_s` | 9,4 | s | — | S11 | km77 | trim | SECONDARY_REFERENCE | **Crítica (Performance)**: solo secundaria. |
| `perf.top_speed_kmh` | 203 | km/h | — | S11 | km77 | trim | SECONDARY_REFERENCE | |
| `pt.displacement_cc` | 1498 | cm³ | — | S1 | IDAE 2019 | trim | OFFICIAL | |
| `pt.cylinders` | NOT FOUND | — | — | — | — | — | — | km77 dice "cuatro cilindros" (SECONDARY). |
| `pt.gears` | 6 | — | — | S11 | km77 | trim | SECONDARY_REFERENCE | IDAE solo da "M". |
| `pt.fuel_tank_l` | 50 | L | — | S4 (p. 54 del PDF, 5 puertas gasolina) | catálogo seat.es enero 2018 | modelo/carrocería (**no** motor 1.5 TSI) | OFFICIAL (archivado) | 50 L para todos los motores gasolina no-GNC del 5p en esa ficha. **No hay confirmación oficial para el 1.5 TSI**, así que conviene marcarlo con `confidence` media. |
| `pt.fiscal_hp_es` | NOT FOUND | CVF | — | — | — | — | — | La columna "130,43" de IDAE son CV, no CVF. |
| `pt.timing_drive` | NOT FOUND | — | — | — | — | — | — | |
| `dim.length_mm` | 4282 | mm | — | S4 | catálogo 2018 | modelo/trim (Reference, Style, Xcellence) | OFFICIAL (archivado) | FR: 4281. |
| `dim.width_mm` | 1816 | mm | — | S4 | catálogo 2018 | modelo | OFFICIAL (archivado) | La fuente no dice si incluye retrovisores (se asume que no, no está verificado). |
| `dim.height_mm` | 1459 | mm | — | S4 | catálogo 2018 | trim (Style) | OFFICIAL (archivado) | Xcellence con DCC: 1444; FR: 1444. |
| `dim.wheelbase_mm` | 2636 | mm | — | S4 | catálogo 2018 | trim (Style) | OFFICIAL (archivado) | FR: 2634. |
| `dim.turning_circle_m` | NOT FOUND (1.5 TSI) | m | — | — | — | — | — | S4 da 10,3 m solo para los motores de esa ficha (no incluye el 1.5). |
| `dim.kerb_weight_kg` | 1239 | kg | — | S11 | km77 | trim | SECONDARY_REFERENCE | S4 no tiene el 1.5 TSI. Norma (con conductor 75 kg o no): no indicada. |
| `dim.gross_weight_kg` | NOT FOUND | kg | — | — | — | — | — | |
| `cap.boot_l` | 380 | L | — | S4 | catálogo 2018 | modelo (5p no GNC) | OFFICIAL (archivado) | **La fuente no indica el método** (VDA/otro), ver §7-F5. |
| `cap.boot_max_l` | 1210 | L | — | S11 | km77 | modelo | SECONDARY_REFERENCE | |
| `cap.isofix_positions` | NOT FOUND (nº) | — | — | S5 | catálogo nov. 2018 | trim | OFFICIAL (archivado) | La fuente dice "ISOFIX en asientos traseros" y "Top Tether en asientos traseros" (de serie desde Reference), sin número. |
| `nrg.fuel_combined_l100` | **4,9** | L/100 km | **NEDC_CORRELATED?** | S1 (y S2) | Guiasemestre22019.pdf, p. 147, fila "SEAT LEON 1.5 TSI 96KW S/S STYLE MY19" | trim | OFFICIAL | **Crítica.** Ciclo no declarado en la guía. S2 (mar. 2020) repite 4,9 para "STYLE MY19"; otras filas "1.5 EcoTSI 96kW … STYLE s48 / STYLE VISIO" (sin MY) dan **4,8**. |
| `nrg.fuel_combined_l100` (alt.) | 5,8 | L/100 km | WLTP | S11 | km77 | trim | SECONDARY_REFERENCE | No se encontró ningún WLTP oficial del Mk3 1.5 TSI 130 en ES. |
| `nrg.fuel_urban_l100` | NOT FOUND | L/100 km | — | — | — | — | — | |
| `nrg.fuel_extra_urban_l100` | NOT FOUND | L/100 km | — | — | — | — | — | |
| `nrg.fuel_wltp_*` (4 fases) | NOT FOUND | L/100 km | WLTP | — | — | — | — | |
| `emi.co2_combined_gkm` | **111** | g/km | **NEDC_CORRELATED?** | S1 | IDAE 2019, misma fila | trim | OFFICIAL | **Crítica.** Otras filas en S2: 110 g/km. Base del impuesto de matriculación: ver §7-F1 (en 2018 se usaba NEDC 2017/1153). |
| `emi.dgt_label_es` | `C` | — | — | S9 (regla) | dgt.es/distintivo-ambiental | regla (combustible + Euro + fecha) | **CALCULATED** | Regla DGT: gasolina matriculada desde enero de 2006 y que cumple la Euro vigente → C. km77 también dice "C" (SECONDARY). El distintivo oficial es **por matrícula** (consulta DGT) y no hay matrícula de referencia. Pregunta abierta Q4. |
| `saf.ncap_stars` | 5 | 0–5 | — | S7 | ver §4 | generación | OFFICIAL (archivado) | Test de 2012. |
| `saf.ncap_adult_pct` | 94 | % | — | S7 | | generación | OFFICIAL | |
| `saf.ncap_child_pct` | 92 | % | — | S7 | | generación | OFFICIAL | |
| `saf.ncap_vru_pct` | 70 (Pedestrian) | % | — | S7 | | generación | OFFICIAL | En el protocolo 2012 el área era *Pedestrian*, no *VRU*, ver §7-F7. |
| `saf.ncap_assist_pct` | 71 | % | — | S7 | | generación | OFFICIAL | |
| `saf.airbags_count` | 7 | — | — | S5 | catálogo nov. 2018 (equip. de serie Reference, que hereda Style) | trim | OFFICIAL (archivado) | "7 Airbags (2 frontales + 2 laterales + 2 de cortina + airbag de rodilla)". |
| `adas.*` | NOT FOUND (salvo lo indicado) | — | — | S5 | | trim | | S5 (Reference) lista ESC, TPMS, "Sistema de frenado poscolisión" y ASR/ABS. AEB, ACC, lane keep, etc. de serie en Style: NOT FOUND (la parte de equipamiento Style del catálogo no se extrajo con fiabilidad). |
| `war.years` | 2 | años | — | S5 | catálogo nov. 2018, "Garantías y ventajas de tu SEAT" | mercado | OFFICIAL (archivado) | "en el momento de la entrega de tu nuevo SEAT, dispones de una cobertura completa de 24 meses, que puedes ampliar contratando la Extensión de Garantía hasta 4 años y/o 80.[000 km]". **Crítica (Warranty): FOUND.** |
| `war.km` | NOT FOUND (general) | km | — | S5 | | mercado | | La extensión llega hasta 4 años / 80.000 km (opcional). Garantía de 12 años contra corrosión. |
| `war.conditions` | "Garantía de 2 años; extensión opcional hasta 4 años / 80.000 km; 12 años anticorrosión" | text | — | S5 | | mercado | OFFICIAL (archivado) | |
| `mnt.*` | NOT FOUND (2018) | — | — | — | — | — | — | |

---

## 3. Precios (`vehicle_prices`)

| price_type | Valor | Moneda | Impuestos | Fecha | Fuente | Provenance | Notas |
|---|---|---|---|---|---|---|---|
| `original_list` (León 1.5 EcoTSI 130 CV **Style** 5p) | 18.650 | EUR | NOT FOUND (la fuente no lo dice) | 2018-09-14 | S12 diariomotor | **SECONDARY_REFERENCE** | En la misma noticia: Style Visio Edition 19.650 · Style Visio Edition Navi 20.180 · FR 20.290 · FR Edition 21.390. Tampoco dice si incluye descuentos. |
| (contraste) | 21.290 "con descuento y equipamiento seleccionado"; descuento oficial 1.200 | EUR | NOT FOUND | NOT FOUND | S11 km77 | SECONDARY_REFERENCE | No es un precio de lista limpio. |
| "Desde" gama León 5p (cualquier motor) | 16.430 | EUR | NOT FOUND | 2018-12-13 | S6 seat.es (Wayback) | OFFICIAL (archivado) | **No es de la variante**: es el precio "desde" de la gama, sin condiciones visibles. No sirve como `original_list` de DC-09. |

**Conclusión**: `original_list` oficial de la variante = **NOT FOUND**. En el Media Center de SEAT solo se encontraron listas de precios de la Mk4 en adelante, y la tarifa de 2018 no aparece en Wayback en las URLs probadas.

---

## 4. Seguridad (`safety_ratings`)

| authority | test_year | protocol_version | Estrellas | Adulto | Niño | Peatón (VRU) | Safety Assist | Variante ensayada | Fuente |
|---|---|---|---|---|---|---|---|---|---|
| Euro NCAP | 2012 | protocolo Euro NCAP 2012 (áreas: Adult / Child / **Pedestrian** / Safety Assist) | 5 | 94 % | 92 % | 70 % | 71 % | "Seat Leon 1.6TDI 'Reference', LHD", 5 door hatchback, kerb weight 1205 kg; "applies to all Leons of the specification tested" | S7 (Wayback 2016). S8 (SEAT, 29/11/2012) confirma 5★ y 94 % adulto. |

Notas:
- El rating es de **2012, versión pre-facelift, motor diésel**. No hay re-test del Mk3 FL. Aplicarlo al 1.5 TSI 2018 es una **extrapolación por generación** que la fuente no confirma para el FL.
- Euro NCAP publica que las calificaciones con más de 6 años "caducan". Esa política no se verificó en esta sesión: NOT FOUND.

---

## 5. Recalls

| Campaña | Periodo de fabricación afectado | Problema | Código | Alerta Safety Gate | Fuente | ¿Afecta a DC-09? |
|---|---|---|---|---|---|---|
| Intermitentes LED | 01/11/2016 – 05/07/2018 | "a failure of the LED turn signals are not always detected" | 94M1 | A12/00033/19 (publicada 20/12/2019) | S10 | **Posible**: un MY2018 fabricado antes del 05/07/2018. El 1.5 TSI empezó a venderse hacia sept. 2018 (fuente secundaria), así que probablemente está fuera del periodo. Hay que verificarlo por bastidor. |
| Airbag pasajero Takata | 15/06/2012 – 06/09/2017 | Degradación del propulsor del inflador | 69EC | A12/00871/23, A12/02480/23 | S10 | Improbable para el 1.5 TSI (se fabricó después). |

Provenance: S10 es un **agregador de terceros** que cita los nº de alerta de Safety Gate. La ficha oficial de Safety Gate no se consultó directamente. Para publicar hay que verificar en Safety Gate (ec.europa.eu/safety-gate). Recalls con fuente oficial española (DGT/SEAT ES): **NOT FOUND**.

---

## 6. Cobertura de claves críticas (ICE, §4 del catálogo)

| Categoría | Clave crítica | Estado | Detalle |
|---|---|---|---|
| Economy | `nrg.fuel_combined_l100` | **FOUND** (OFFICIAL, ciclo ambiguo) | 4,9 L/100 km, IDAE, ciclo no declarado (≈ NEDC_CORRELATED) |
| Economy | precio (`original_list`) | **SECONDARY ONLY** | 18.650 € (diariomotor) |
| Range | `pt.fuel_tank_l` | **FOUND** (OFFICIAL, granularidad modelo) | 50 L, ficha de enero 2018 sin el 1.5 TSI |
| Performance | `perf.power_max_kw` | **FOUND** | 96 kW |
| Performance | `perf.accel_0_100_s` | **SECONDARY ONLY** | 9,4 s (km77) |
| Size | `dim.length_mm` / `width` / `height` | **FOUND** | 4282 / 1816 / 1459 |
| Size / Practicality | `cap.boot_l` | **FOUND** (método no declarado) | 380 L |
| Practicality | `seats` | **NOT FOUND** | |
| Eco | `emi.co2_combined_gkm` | **FOUND** (ciclo ambiguo) | 111 g/km |
| Eco | `emi.dgt_label_es` | **CALCULATED** (regla DGT) | C |
| Safety | rating con protocolo | **FOUND** | Euro NCAP 2012, 5★ (pre-FL, diésel) |
| Warranty | `war.years` | **FOUND** | 2 años |

**Resumen** (14 claves): 10 FOUND (2 con ciclo ambiguo; depósito, dimensiones y maletero a nivel de modelo), 1 CALCULATED, 2 SECONDARY ONLY (0–100 y precio), 1 NOT FOUND (`seats`). Con la regla estricta, **Performance, Practicality y Economy no se activarían** con solo datos publicables.

---

## 7. Fricciones con el catálogo

- **F1 — Transición de ciclo: la fuente oficial no declara el ciclo.** La guía IDAE (S1, oct. 2019) publica un único consumo y un único CO₂ sin decir el ciclo. La circular ministerial (S3) establece que:
  - hasta el 31/12/2018 se informa con **NEDC según Reg. 2017/1153** (= NEDC_CORRELATED);
  - del 01/01/2019 al 31/12/2020 se informa con **consumo y CO₂ WLTP y además CO₂ NEDC 2017/1153**.

  Los valores 4,9 L / 111 g/km tienen magnitud NEDC. El WLTP secundario es 5,8 L. Es decir, la guía de 2019 parece seguir en NEDC_CORRELATED, en contra de lo que pide la circular para 2019. **Propuesta**: permitir `test_cycle = UNKNOWN_DECLARED` o un campo `test_cycle_inferred` + `test_cycle_evidence`. Si no, el curador tiene que inferir, cosa que la regla prohíbe.
- **F2 — Un mismo coche, dos ciclos oficiales a la vez.** En 2019–2020 el CoC lleva NEDC_CORRELATED y WLTP. El `SourcedValue` debería admitir **varios valores por clave con ciclos distintos** (un valor por ciclo), no un único valor.
- **F3 — Etiquetado MY frente al año del vehículo.** El Reference Variant pide `model_year 2018`, pero las filas oficiales dicen "MY19" o no dicen nada. Hace falta una regla de mapeo MY comercial ↔ año de fabricación/matriculación.
- **F4 — Granularidad mixta.** Las dimensiones, el maletero y el depósito solo están a nivel de carrocería, y en una ficha anterior a la llegada del motor. Hace falta un campo `applies_to` o `inherited_from` para distinguir "modelo" de "motor exacto".
- **F5 — Método de maletero.** S4 da 380 L sin método. Q3 del catálogo sigue abierta. Propuesta: `boot_method = UNDECLARED` como valor explícito del enum.
- **F6 — Calidad de datos en IDAE.** En la columna de potencia aparecen "130,43 (96)" y "177,99 (131)" para el mismo motor: la base mezcla CV/kW. Hace falta validación de rango en ingesta (kW vs CV × 0,7355).
- **F7 — Protocolo NCAP 2012 frente a claves actuales.** `saf.ncap_vru_pct` recibe el valor *Pedestrian* 2012. Son métricas distintas. Propuesta: `saf.ncap_pedestrian_pct` separada, o mapear con `protocol_version` obligatorio y no comparar.
- **F8 — Rating por generación y variante ensayada.** El rating se hizo con un 1.6 TDI pre-FL. Falta un campo `rating_applies_scope` (`tested_variant` / `generation_extrapolated`).
- **F9 — `seats` crítico sin fuente.** Ni IDAE ni la ficha 2018 dan el nº de plazas. Si no se puede derivar (M1 5 puertas ≠ 5 plazas garantizadas), Practicality nunca se activa en coches antiguos.
- **F10 — `emi.dgt_label_es` solo derivable.** Para un vehículo de 2018 sin matrícula la etiqueta es siempre CALCULATED por regla (Q4). La regla DGT depende de la **fecha de matriculación** y de la Euro, que es un dato de la Used Vehicle Instance, no de la variant.
- **F11 — Precio histórico.** SEAT no conserva tarifas 2018 accesibles y la prensa no es publicable. `original_list` queda SECONDARY en la práctica. Economy (que exige precio) no se activa con fuentes publicables, salvo que el participante sea usado y aporte `asking_price`.
- **F12 — Clave que falta: `nrg.fuel_combined_l100` por llanta.** S4 publica consumos por tamaño de llanta (16"/17"/18"). El catálogo no tiene forma de guardar esa dimensión (un valor por llanta o un rango min–max). Lo mismo con los rangos WLTP "min–max" de 2019+.
