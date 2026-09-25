# DC-03 — Volkswagen Golf 2018 (ES) · 1.5 TSI EVO 96 kW (130 CV) · Advance 5p

> Estado: **CURADO (borrador v0.1)** · Fecha de consulta de todas las fuentes: **2026-09-24** · Curador: agente de datos VScar
> Catálogo: [SPEC_KEY_CATALOG.md v0.1](../SPEC_KEY_CATALOG.md) · Reglas: [README §3](README.md)
> Powertrain: **ICE** (gasolina) → claves críticas de la columna ICE/MHEV/HEV (§4 del catálogo).

**Elección de motorización.** Se elige el **1.5 TSI EVO 96 kW (130 CV)** frente al 150 CV porque es el único con precio de lista 2018 localizado (tarifa mayo 2018 citada en prensa) y con población de matriculaciones España 2018 en EEA claramente separable en dos homologaciones (NEDC puro vs. WLTP+NEDC correlado). Trim: **Advance**, carrocería 5 puertas, cambio manual 6 vel.

**Hallazgo principal de ciclo.** Para esta misma variant comercial existen en 2018 **dos homologaciones distintas** matriculadas en España: una solo-NEDC (revisión de homologación `e1*2007/46*0623*33`) y otra WLTP con valor NEDC correlado (revisión `*35`). Ver §2.1.

Fuentes usadas (abreviaturas en tablas):

| Id | Fuente | URL | Tipo |
|---|---|---|---|
| EEA18 | EEA — CO2 monitoring passenger cars, año 2018, status F (final), MS=ES, Cn=GOLF, Ft=PETROL, Ec=1498, Ep=96 kW. Consulta SQL agregada por `Va`/`TAN`/`Enedc`/`Ewltp` | https://discodata.eea.europa.eu/sql?query=SELECT … FROM [CO2Emission].[latest].[co2cars] WHERE year=2018 AND status='F' AND MS='ES' AND Cn='GOLF' AND Ft='PETROL' AND [Ec (cm3)]=1498 AND [Ep (KW)]=96 … | OFFICIAL (registro de matriculación agregado) |
| VWES-CAT20 | Volkswagen España — Catálogo "Golf y Golf Variant" (Golf VII), **Edición: Enero 2020**, ref. 715.1190.20.61 | https://www.volkswagen.es/idhub/content/dam/onehub_pkw/importers/es/modelos/catalogos/catalogo_golf.pdf | OFFICIAL (fabricante/importador ES) |
| VWES-WB18 | volkswagen.es página Golf, captura Wayback 2018-08-06 | http://web.archive.org/web/20180806161718/https://www.volkswagen.es/es/modelos/golf.html | OFFICIAL (archivo) |
| VWES-PREV | volkswagen.es "Modelos anteriores — Golf" | https://www.volkswagen.es/es/clientes/modelos-anteriores/golf.html | OFFICIAL |
| VWES-LEGAL | volkswagen.es, texto legal WLTP/NEDC al pie de la página Golf 8 | https://www.volkswagen.es/es/modelos/golf-8.html | OFFICIAL |
| MOTOR-ES | motor.es, "La gama del Volkswagen Golf incorpora el motor 1.5 TSI EVO de 130 CV", 14-05-2018 | https://www.motor.es/noticias/precio-volkswagen-golf-15-tsi-evo-130-cv-201846521.html | Prensa (cita tarifa VW ES) |
| KM77-A | km77 — Golf 5p Advance 1.5 TSI EVO BlueMotion 96 kW (130 CV) **(2018-2019)** | https://www.km77.com/coches/volkswagen/golf/2017/5-puertas/advance/golf-5p-advance-15-tsi-evo-bluemotion-96-kw-130-cv/datos | SECONDARY_REFERENCE |
| KM77-B | km77 — Golf 5p Advance 1.5 TSI EVO BM 96 kW (130 CV) **(2019-2020)** (versión WLTP) | https://www.km77.com/coches/volkswagen/golf/2017/5-puertas/advance/golf-5p-advance-15-tsi-evo-bm-96-kw-130-cv/datos | SECONDARY_REFERENCE |
| NCAP-NEWS12 | Euro NCAP newsroom — "VW Golf - Crash Test 2012" (publicado 19-11-2012, datasheet 2012 listado) | https://news.euroncap.com/images-and-videos/vw-golf---crash-test-2012/s/900e6a35-47d9-4cf3-a7c4-1f92672eccea | OFFICIAL (solo año/existencia; no muestra %) |
| TCE | The Car Expert — Volkswagen Golf (2012 to 2019) | https://www.thecarexpert.co.uk/volkswagen-golf-2012/ | SECONDARY_REFERENCE |
| CR-EU | car-recalls.eu (reproduce alertas Safety Gate) | ver §5 | SECONDARY_REFERENCE |
| DGT-C | DGT — Etiqueta ambiental C | https://www.dgt.es/nuestros-servicios/tu-vehiculo/tus-vehiculos/distintivo-ambiental/etiqueta-c/ | OFFICIAL (regla) |

Intentos sin resultado: ficha Euro NCAP oficial 2012 (`euroncap.com/en/results/vw/golf/10955` → **HTTP 404** hoy); catálogo/tarifa VW ES 2018 en PDF (no archivado en Wayback); IDAE `coches.idae.es` (solo contiene gama vigente "Golf 8 PA"; no hay registros Golf VII/2018).

---

## 1. Identidad resuelta

| Campo | Valor | Fuente | Notas |
|---|---|---|---|
| `market_code` | `ES` | — | |
| manufacturer | Volkswagen (Volkswagen AG) | EEA18 (`Mh`/`Man`) | |
| model | Golf | EEA18 (`Cn`=GOLF) | |
| `generation_code` | `Mk7` — VW ES lo denomina **"Golf 7 (5G)"**; tipo de homologación **AU** | VWES-PREV ("Golf 7 (5G)"); EEA18 (`T`=AU) | Tres códigos para lo mismo: nombre comercial (Golf 7), código interno (5G), tipo de homologación (AU). Ver fricciones. |
| `facelift` | `Mk7.5` (restyling 2017). VW ES lo designaba **"GOLF PA"** en 2018 | VWES-WB18 (texto de oferta: "Volkswagen GOLF PA 1.6 TDI Ready2Go…"); KM77-A (gama "2017") | "PA" = Produktaufwertung. Fecha de inicio del facelift: NOT FOUND en fuente oficial. |
| periodo comercial ES (motor 130 CV) | desde **mayo 2018** ("Precios vigentes desde Mayo / 2018") | MOTOR-ES | km77 separa "2018-2019" (NEDC) y "2019-2020" (WLTP) — ver §2.1: la EEA muestra WLTP ya matriculado en 2018. `sales_end` NOT FOUND oficial. |
| `model_year` | 2018 | — | Definido por la selección. |
| `trim_name` | **Advance** | MOTOR-ES (tarifa: Advance y Sport para el 130 CV); KM77-A | Catálogo VWES-CAT20 (2020) lista Edition / Advance / Sport. |
| `powertrain_type` | `ICE` | EEA18 (Ft=PETROL, sin componente eléctrico) | |
| `fuel_type` | `petrol` | EEA18 | |
| `drivetrain` | `FWD` | KM77-A ("Delantera") | SECONDARY_REFERENCE |
| `transmission` | `manual`, 6 vel. | MOTOR-ES ("1.5 TSI EVO 130 CV 6v"); KM77-A | EEA18 `Ve` empieza por `FM6` (manual 6) vs `FD7` (DSG 7) — inferencia del código, no publicable como dato. |
| `body_type` | `hatchback` | KM77-A | |
| `seats` | 5 | KM77-A (2+3) | SECONDARY_REFERENCE — no encontrado en fuente oficial. |
| `doors` | 5 | KM77-A; MOTOR-ES (5p = 3p + 655 €) | |
| `emissions_standard` | `Euro6` (sub-nivel **NOT FOUND**) | KM77-A ("Euro 6") | EEA 2018 no trae campo `Ech`. No se puede distinguir Euro 6b/6c/6d-TEMP entre las dos homologaciones sin fuente. |

---

## 2. Tabla de valores

Leyenda Provenance: OFFICIAL = fuente oficial; VERIFIED = prensa/fuente fiable que cita dato oficial; SECONDARY_REFERENCE = solo sitio de specs de terceros (no publicable); CALCULATED = derivado con regla documentada.

### 2.1 Ciclo de homologación — hallazgos (antes de la tabla)

Registros EEA 2018 final, España, Golf gasolina 1.498 cm³ 96 kW, batalla 2.620 mm, `Va`=GAC4DACAX0, cambio `FM6`:

| Revisión de homologación (TAN) | `Enedc` (g/km) | `Ewltp` (g/km) | Masa `M` (kg) | Matriculaciones (R) | Interpretación |
|---|---|---|---|---|---|
| e1*2007/46*0623*33 | **113** | — (null) | 1.301 | 141 | Homologación **NEDC** pura (pre-WLTP) |
| e1*2007/46*0623*33 | 116 | — | 1.301 | 14 | idem, otra configuración |
| e1*2007/46*0623*35 | **113** | **136** | 1.315 | 518 | Homologación **WLTP**; el NEDC es **NEDC_CORRELATED** |
| e1*2007/46*0623*35 | 116 | 141 | 1.315 | 86 | idem, otra configuración (llantas/equipamiento) |
| e1*2007/46*0623*35 (DSG `FD7`) | 111 | 136 | 1.340 | 150 | versión DSG, fuera de esta variant |

- VW España declara (VWES-LEGAL): *"En caso de vehículos homologados de conformidad con la normativa WLTP, los valores NEDC derivarían de la información obtenida bajo dicha normativa WLTP"* → los 113 g/km de la fila `*35` son **NEDC_CORRELATED**, no NEDC medido.
- Mismo `Enedc` (113) en ambas homologaciones, pero **masa distinta** (1.301 vs 1.315 kg) y código de versión distinto (`…MVON1ML79…` vs `…CPON1ML1B…`): son dos Reference Variants técnicamente distintas bajo el mismo nombre comercial.
- La prensa (MOTOR-ES, mayo 2018) cita **NEDC 4,80 L/100 km y 110 g/km** para el 3 puertas; km77 (2018-2019) da 110 g/km para el 5p. EEA solo muestra 110 g/km en 3 matriculaciones `GAC2` (probablemente 3p) y 1 `GAC4`. **Conflicto 110 vs 113 g/km** (NEDC) → revisión humana.
- km77 (2019-2020) da **WLTP 5,6 L/100 km y 126 g/km**; EEA 2018 da WLTP 136 g/km para la homologación `*35`. **Conflicto 126 vs 136 g/km** (WLTP) — posible cambio de homologación posterior o valor "low/high" distinto; no resoluble sin ficha oficial.

**Decisión de curación:** la Reference Variant DC-03 se fija en la **homologación NEDC pura (TAN `*33`)**, que es la que corresponde a la tarifa de mayo 2018. La homologación WLTP (`*35`) se documenta como variant hermana (`DC-03b`, pendiente de decisión de producto).

### 2.2 Valores

| SpecKey | Valor | Unidad canónica | Ciclo | Fuente | URL | Granularidad | Provenance | Notas |
|---|---|---|---|---|---|---|---|---|
| `dim.length_mm` | 4258 | mm | — | KM77-A | km77 (2018-2019) | trim | SECONDARY_REFERENCE | original "4.258 mm" |
| `dim.width_mm` | 1790 | mm | — | KM77-A | idem | trim | SECONDARY_REFERENCE | |
| `dim.width_mirrors_mm` | NOT FOUND | | | | | | | |
| `dim.height_mm` | 1492 | mm | — | KM77-A | idem | trim | SECONDARY_REFERENCE | |
| `dim.wheelbase_mm` | 2620 | mm | — | EEA18 (`W (mm)`) | discodata EEA | registration_record | OFFICIAL | coincide con KM77-A |
| (sin clave) vía delantera / trasera | 1549 / 1521 | mm | — | EEA18 (`At1`, `At2`) | discodata EEA | registration_record | OFFICIAL | no hay SpecKey; ver fricciones |
| `dim.ground_clearance_mm` | NOT FOUND | | | | | | | |
| `dim.turning_circle_m` | 10.9 | m | — | KM77-A | km77 | trim | SECONDARY_REFERENCE | km77 "Diámetro de giro 10,9 m" |
| `dim.kerb_weight_kg` | 1301 | kg | — | EEA18 (`M (kg)`, TAN *33) | discodata EEA | registration_record | OFFICIAL | "masa en orden de marcha" según EEA; homologación WLTP (*35): 1315 kg. Rango en *33: 1301–1344 kg. |
| `dim.gross_weight_kg` | NOT FOUND | | | | | | | |
| `cap.boot_l` | 380 | L | — | KM77-A | km77 | trim | SECONDARY_REFERENCE | **método (VDA/SAE) no declarado** |
| `cap.boot_max_l` | 1270 | L | — | KM77-A | km77 | trim | SECONDARY_REFERENCE | método no declarado |
| `cap.towing_braked_kg` | NOT FOUND | | | | | | | VWES-CAT20 cita "1.800 kg" solo como ejemplo de Trailer Assist, no para esta variant |
| `cap.towing_unbraked_kg` | NOT FOUND | | | | | | | |
| `cap.roof_load_kg` | NOT FOUND | | | | | | | |
| `cap.isofix_positions` | NOT FOUND | | | | | | | |
| `cap.third_row` | not_available | — | — | KM77-A (5 plazas 2+3) | km77 | trim | SECONDARY_REFERENCE | |
| `perf.power_max_kw` | 96 | kW | — | EEA18 (`Ep (KW)`) | discodata EEA | registration_record | OFFICIAL | km77 "131 CV / 96 kW"; comercial "130 CV" (ver fricciones) |
| `perf.torque_max_nm` | 200 | N·m | — | KM77-A | km77 | trim | SECONDARY_REFERENCE | régimen NOT FOUND oficial |
| `perf.accel_0_100_s` | 9.1 | s | — | KM77-A | km77 | trim | SECONDARY_REFERENCE | |
| `perf.top_speed_kmh` | 210 | km/h | — | KM77-A | km77 | trim | SECONDARY_REFERENCE | |
| `pt.displacement_cc` | 1498 | cm³ | — | EEA18 (`Ec (cm3)`) | discodata EEA | registration_record | OFFICIAL | |
| `pt.cylinders` | 4 | — | — | KM77-A | km77 | engine | SECONDARY_REFERENCE | |
| `pt.fuel_tank_l` | 50 | L | — | KM77-A | km77 | trim | SECONDARY_REFERENCE | **clave crítica sin fuente oficial** |
| `pt.gears` | 6 | — | — | MOTOR-ES ("6v") | motor.es | trim | VERIFIED | |
| `pt.fiscal_hp_es` | NOT FOUND | | | | | | | derivable (CALCULATED) con fórmula oficial IVTM; no se calcula aquí sin la fórmula en fuente |
| `pt.timing_drive` | NOT FOUND | | | | | | | |
| `nrg.fuel_combined_l100` | 4.8 | L/100 km | **NEDC** | KM77-A; MOTOR-ES (4,80 para 3p) | km77 / motor.es | trim | SECONDARY_REFERENCE | **clave crítica sin fuente oficial**; EEA 2018 no publica consumo (`Fc` null) |
| `nrg.fuel_urban_l100` | 6.2 | L/100 km | NEDC (urban) | KM77-A | km77 | trim | SECONDARY_REFERENCE | |
| `nrg.fuel_extra_urban_l100` | 4.0 | L/100 km | NEDC (extra-urban) | KM77-A | km77 | trim | SECONDARY_REFERENCE | original "4 l/100 km" |
| `nrg.fuel_wltp_*` (homologación NEDC) | not applicable | | | | | | | la homologación *33 no tiene WLTP |
| `emi.co2_combined_gkm` | 113 | g/km | **NEDC** | EEA18 (`Enedc`, TAN *33) | discodata EEA | registration_record | OFFICIAL | Conflicto: prensa/km77 110 g/km (NEDC). Rango *33: 110–116. |
| `emi.dgt_label_es` | C | enum | — | DGT-C (regla "Gasolina EURO 4/IV, 5/V o 6/VI") + KM77-A (Euro 6; km77 también indica "C") | dgt.es / km77 | engine | CALCULATED (depende de Euro 6 SECONDARY) | sin consulta DGT por matrícula |
| `saf.*` | ver §4 | | | | | | | |
| `adas.acc` | optional | enum | — | VWES-CAT20 (ACC marcado "O") | catálogo VW ES ene-2020 | generation | OFFICIAL (fecha ≠ 2018) | extracción de PDF con maquetación perdida; revisar a mano |
| `adas.aeb` | unknown | | | VWES-CAT20 (Front Assist + City Emergency Brake + detección de peatones; marca de trim ilegible) | catálogo | generation | — | |
| `tech.apple_carplay` / `tech.android_auto` | unknown | | | VWES-CAT20 ("Car-Net App-Connect incluye MirrorLink, Apple CarPlay y Android Auto"; de serie con Discover Pro) | catálogo | generation | — | disponibilidad por trim no legible |
| `war.years` | 2 | años | — | VWES-CAT20 ("2 años de garantía. Sin límite de kilómetros, contra las anomalías de fabricación") | catálogo VW ES | market | OFFICIAL | catálogo edición **enero 2020**; se asume vigente en 2018 **sin fuente 2018** → revisar |
| `war.km` | null (ilimitado) | km | — | VWES-CAT20 ("Sin límite de kilómetros") | idem | market | OFFICIAL | la fuente lo dice explícitamente |
| `war.conditions` | Extensión opcional 2+2 (80.000 km) / 2+3 (100.000 km); 12 años anticorrosión; 3 años pintura | text | — | VWES-CAT20 | idem | market | OFFICIAL | |
| `mnt.service_interval_km` / `_months` | NOT FOUND | | | | | | | VWES-CAT20 solo describe "Mantenimiento Plus" 4 años/60.000 km (producto de pago, no intervalo) |

---

## 3. Precios

| price_type | Importe | Moneda | incl_taxes | valid_from | Variant exacta | Fuente | Provenance | Notas |
|---|---|---|---|---|---|---|---|---|
| `original_list` | 24.255 | EUR | **no declarado** (PVP tarifa; probablemente IVA incl., sin fuente) | 2018-05 | Golf **3p** Advance 1.5 TSI EVO 130 CV 6v | MOTOR-ES: "Precios vigentes desde Mayo / 2018 sin incluir descuentos u otras promociones" | VERIFIED (prensa) | promociones excluidas ✔ |
| `original_list` | **24.910** | EUR | idem | 2018-05 | Golf **5p** Advance 1.5 TSI EVO 130 CV 6v (**variant DC-03**) | MOTOR-ES: "La carrocería de 5 puertas tiene un sobrecoste de 655 euros" | CALCULATED (24.255 + 655) | |
| (contraste) | 24.255 (PVP) / 23.060 (con descuento 1.195 €) / 20.045 sin IVA | EUR | sí (km77) | periodo 2018-2019 | Golf 5p Advance 130 CV | KM77-A | SECONDARY_REFERENCE | **Conflicto**: km77 asigna 24.255 al 5p; motor.es al 3p. Fecha de tarifa km77 no indicada. |
| `current_new` | not applicable | | | | | | | fuera de venta |

Otros precios de la misma tarifa (MOTOR-ES, 3p): Advance DSG 26.140 €; Sport 6v 27.255 €; Sport DSG 29.130 €.

---

## 4. Seguridad

| authority | model tested | stars | adult % | child % | VRU (pedestrian) % | safety assist % | test_year | protocol / rating year | estado | Fuente | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Euro NCAP | VW Golf (Golf VII, pre-facelift) | 5 | 94 | 89 | 65 | 71 | **2012** (newsroom Euro NCAP: publicado 19-11-2012) | rating year 2012 (protocolo = el del año de test; **no visto en ficha oficial**, inferido) | **expirado enero 2019** (según TCE) | %: TCE; año: NCAP-NEWS12 | % y expiración: SECONDARY_REFERENCE; año: OFFICIAL |

Notas:
- La ficha oficial `euroncap.com/en/results/vw/golf/10955` devuelve **404** (verificado con navegador headless). Los % solo se han visto en fuente secundaria → **no publicables** hasta obtener el datasheet oficial 2012.
- El test es de **2012 sobre el Golf VII original**; el facelift Mk7.5 (2017) **no fue re-testado** (no se ha encontrado rating posterior). El rating aplica a DC-03 solo por herencia de generación → granularidad `generation`.
- **Protocolos distintos**: Golf VII = protocolo 2012 (pedestrian); Golf VIII = protocolos 2019 / 2022 / reevaluación 2025 (VRU). No comparables (ver DC-04 §4).
- `saf.airbags_count`: NOT FOUND.

---

## 5. Recalls (UE / España)

| Referencia | Fecha | País notificante | Tipos / periodo de producción | Riesgo | ¿Afecta a DC-03? | Fuente | Provenance |
|---|---|---|---|---|---|---|---|
| Safety Gate **A12/0388/18** | 16-03-2018 | Alemania | tipos 3C, 3H, 5N, **AU**, AUV; producción 19-01-2018 → 14-02-2018 | discos de freno delanteros demasiado débiles (riesgo 3) | posible (tipo AU, producción 2018); verificar por VIN | CR-EU: https://car-recalls.eu/recall/volkswagen-golf-2018/ | SECONDARY_REFERENCE (referencia oficial Safety Gate citada) |
| Safety Gate **A12/0774/18** | 07-06-2018 (publ. 08-06-2018) | Alemania | tipos 3C, 1T, AUV, **AU**, 2KN, 2K; producción 22-02-2018 → 27-03-2018 | fijación del reposacabezas activo defectuosa (riesgo 1) | posible; verificar por VIN | CR-EU: https://car-recalls.eu/recall/volkswagen-golf-2018-2/ | SECONDARY_REFERENCE |

- España no aparece mencionada en las fichas consultadas. Enlace oficial citado (formato RAPEX antiguo, no verificado en esta sesión): `ec.europa.eu/consumers/consumers_safety/safety_products/rapex/alerts/?event=main.notification&search_term=A12/0388/18…`.
- Campaña Takata: volkswagen.es enlaza "Campaña de retirada airbags Takata" en el pie de página; aplicabilidad al Golf VII **NOT FOUND**.

---

## 6. Cobertura de claves críticas (ICE)

| Categoría | Clave crítica | Estado |
|---|---|---|
| Economy | `nrg.fuel_combined_l100` | **SECONDARY ONLY** (4,8 NEDC) |
| Economy | precio (`original_list`) | FOUND (VERIFIED prensa; 5p CALCULATED) |
| Range | `pt.fuel_tank_l` | **SECONDARY ONLY** (50 L) |
| Range | `nrg.fuel_combined_l100` | **SECONDARY ONLY** |
| Performance | `perf.power_max_kw` | FOUND (OFFICIAL, EEA) |
| Performance | `perf.accel_0_100_s` | **SECONDARY ONLY** |
| Size | `dim.length_mm` / `dim.width_mm` / `dim.height_mm` | **SECONDARY ONLY** |
| Size / Practicality | `cap.boot_l` | **SECONDARY ONLY** (sin método) |
| Practicality | `seats` | **SECONDARY ONLY** |
| Eco | `emi.co2_combined_gkm` | FOUND (OFFICIAL EEA, NEDC 113; conflicto con 110) |
| Eco | `emi.dgt_label_es` | CALCULATED sobre dato SECONDARY (C) |
| Safety | rating con protocolo | SECONDARY ONLY (%); año OFFICIAL; ADAS conocidas: 1 (<4) |
| Warranty | `war.years` | FOUND (OFFICIAL, catálogo 2020) |

**Resultado: 4 de 13 criterios con fuente oficial publicable.** Con las reglas actuales solo se activaría Warranty (y Performance/Eco parcialmente). Economy, Range, Size, Practicality y Safety quedan `NOT AVAILABLE` hasta conseguir una ficha técnica oficial 2018 (catálogo/tarifa VW ES 2018 archivado, o ficha de homologación).

---

## 7. Fricciones con el catálogo

1. **Doble homologación bajo una misma variant comercial (crítico).** En 2018 el "Golf 5p Advance 1.5 TSI 130 CV 6v" existe con homologación NEDC (TAN `*33`) y con homologación WLTP + NEDC correlado (TAN `*35`), con masas distintas. El catálogo no tiene campo para `type_approval_number` / revisión ni para `homologation_cycle` de la variant. Propuesta: añadir `type_approval_ref` (TAN + revisión) y `homologation_cycle` (`NEDC`/`WLTP`) como campos estructurales de la Reference Variant, o permitir sub-variants por homologación.
2. **Mismo valor, ciclos distintos.** `Enedc` = 113 g/km aparece como NEDC medido (TAN *33) y como NEDC_CORRELATED (TAN *35). Sin el `test_cycle` explícito serían indistinguibles. Confirma que `NEDC_CORRELATED` es imprescindible; la EEA no lo etiqueta: el ciclo se infiere por la presencia de `Ewltp` + texto legal de VW ES → la regla de inferencia debe documentarse en metodología.
3. **Periodos comerciales de terceros no cuadran con registros oficiales.** km77 etiqueta la versión WLTP como "2019-2020", pero la EEA muestra 518 matriculaciones WLTP ya en 2018. `sales_start/sales_end` necesitan fuente oficial o marcarse ESTIMATED.
4. **Falta `emissions_standard` granular en fuentes 2018.** EEA 2018 no trae `Ech`; km77 solo dice "Euro 6". El enum del catálogo (Euro6b/6c/6d-TEMP) no se puede rellenar → añadir valor `Euro6` (genérico) o `unknown` al enum.
5. **Consumo no disponible en EEA 2018** (`Fc` = null); solo CO₂. Para vehículos pre-2021 la única fuente oficial de L/100 km es la ficha/tarifa del fabricante o la guía IDAE histórica (no accesible online hoy). Considerar `nrg.fuel_combined_l100` CALCULATED desde CO₂ (factor gasolina) con regla publicada en metodología — o aceptar que Economy no se active.
6. **CV comercial vs kW.** Comercial "130 CV", km77 "131 CV / 96 kW". Confirma almacenar solo kW y derivar CV en presentación; guardar el nombre comercial en `trim_name`/`engine_label`, no como dato.
7. **Vías (track) sin SpecKey.** EEA publica `At1`/`At2` (vía delantera/trasera) de forma oficial y sistemática; no hay clave. Baja prioridad, pero útil para validación cruzada de identidad.
8. **Tres códigos de generación.** "Golf 7" (comercial), "5G" (VW ES), "AU" (tipo de homologación, usado por EEA y Safety Gate para recalls). `generation_code` debería admitir alias: `generation_code` + `type_approval_type` (clave para cruzar recalls y EEA).
9. **Maletero sin método.** km77 no declara VDA/SAE (pregunta Q3 del catálogo). Ninguna fuente oficial 2018 encontrada.
10. **Garantía: validez temporal.** El único dato oficial es de un catálogo de enero 2020; no hay fuente para 2018. `war.*` necesita `valid_from/valid_to` o regla de herencia explícita.
11. **Seguridad de generación, no de facelift.** El rating Euro NCAP 2012 (Golf VII original) se hereda al Mk7.5; hace falta un campo `rating_scope` (`generation`/`facelift`/`variant`) además de `test_year` y `protocol_version`. Además el rating **expiró (enero 2019)**: añadir `expired_at`.
12. **Recalls por tipo de homologación y periodo de producción**, no por model_year: el matching necesita `type_approval_type` (AU) y fecha de fabricación (dato de la Used Vehicle Instance, hoy inexistente en §6 del catálogo → proponer `production_date` opcional).
13. **Precio sin indicación de impuestos.** La prensa cita "precios vigentes… sin descuentos" pero no dice si incluyen IVA/IEDMT; `incl_taxes` debe admitir `unknown`.
