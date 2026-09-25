# VScar — SpecKey Catalog v0.2

> Estado: **v0.2 — APPROVED FOR STEP 3** (no final: los primeros imports pueden descubrir detalles menores) · Aprobado: 2026-09-24
> Baseline: [VSCAR_MASTER_PLAN.md v1.0](../VSCAR_MASTER_PLAN.md) (§9, §11, §13.7, §33) · Evidencia: [Dataset Core v0.1 — FINDINGS](dataset-core-v0.1/FINDINGS.md)
> Decisiones: [ADR-007](../adr/ADR-007-reference-vs-used-instance.md) (identidad comercial vs técnica / homologación) · [ADR-009](../adr/ADR-009-data-provider-rights.md) (derechos y fuentes)
> Propietario: data workstream · Cambios: por PR; los que afecten a scoring o completitud requieren nueva `methodologyVersion`.

## Changes v0.2

Derivados del experimento de schema Dataset Core v0.1 (10 variants reales) y de las decisiones D1–D5:

- **Identidad separada** (D2): *commercial identity* (marca → trim) y *technical identity* = **Homologation** (TAN/Va/Ve o equivalente + periodo de validez). Una denominación comercial puede generar varias ReferenceVariants técnicas. `model_year` deja de ser identidad técnica.
- **`SourcedValue` v0.2**: rangos (`value_min`/`value_max`, `value` puede ser `null`), `source_authority` separado de `mapping_confidence`, `homologation_match` para cross-market, `source_market`/`reference_market`, `test_cycle` con **`UNDECLARED`** + `test_cycle_inferred` + `cycle_evidence`, `archived`/`archive_url`/`original_url`, `provisional`, bases de medida tipadas.
- **Cross-market UE** (D1): valores técnicos de homologación reutilizables entre mercados UE **solo con `homologation_match = EXACT`** para uso automático; nunca precios, garantía, equipamiento, impuestos, incentivos ni etiqueta DGT.
- **Históricos** (D3): fuentes oficiales archivadas aceptadas (sin derechos adicionales); prioridad 2017–2026 alta, 2014–2016 selectiva, 2010–2013 oportunista.
- **Rangos** (D4, modificada): no se colapsan a un valor; los engines propagan min/max; el extremo desfavorable solo en el escenario explícito `CONSERVATIVE`.
- **Jerarquía de fuentes estructurales** (D5) y dimensiones independientes `source_authority` × `mapping_confidence`.
- **Bases de medida** tipadas: `power_basis`, `battery_capacity_basis`, `mass_definition`, `boot_method`, `turning_measure`, `towing_gradient_pct`, `range_type`, `consumption_basis`, `charging_loss_basis`, `soc_from_pct`/`soc_to_pct`.
- **Batería**: `bat.capacity_kwh` + `battery_capacity_basis` (admite `UNSPECIFIED`) sustituye a `bat.gross_kwh`/`bat.usable_kwh` como almacenamiento; estos pasan a **vistas lógicas**. `bat.*` aplica también a **HEV y MHEV**.
- **`homologation_powertrain`** (`ICE`, `NOVC_HEV`, `OVC_HEV`, `BEV`, `FCEV`, `UNKNOWN`) separado de `powertrain_type` (clasificación de producto).
- **Claves nuevas**: `rng.phev_total_km`, `emi.co2_charge_sustaining_gkm`, `cap.boot_roof_l`, `chg.dc_time_min` (sustituye a `chg.dc_10_80_min`; ventana SoC en metadatos), `bat.warranty_conditions`.
- **Renombradas por base de medida**: `dim.kerb_weight_kg` → `dim.mass_kg` (+ `mass_definition`); `dim.turning_circle_m` → `dim.turning_m` (+ `turning_measure`).
- **Norma de emisiones** abierta: `family` + `level` + `raw`.
- **Seguridad**: `rating_status` (`VALID`/`EXPIRED`/`NOT_RATED`/`PROVISIONAL`), `tested_variant_note`, `tested_powertrain`, `tested_year`, validez.
- **Precios**: `price_basis`, `region`, `incl_taxes` (`YES`/`NO`/`UNKNOWN`); tabla **`incentives`** separada.
- **Etiqueta DGT** como `CALCULATED` con `rule_version` + `rule_source_url`.
- **Elegibilidad por variant y por categoría** (no 90 % global): `vehicle_page_eligibility`, `comparison_category_eligibility`, `seo_comparison_eligibility`.
- **Reglas de plausibilidad** (P0, `@vscar/quality`) con estados `PASS`/`WARNING`/`BLOCK`; **Conflict Engine** P0 multi-criterio.
- Enums ampliados: CarPlay/Android Auto `standard_unspecified`; ADAS `optional_pack`; `not_applicable` genérico.
- **Total: 90 SpecKeys** (v0.1: 88).
- Aprobación (2026-09-24): schema aprobado para Step 3, incluidas las decisiones adicionales `dim.mass_kg` + `mass_definition`, `dim.turning_m` + `turning_measure` y `bat.warranty_conditions`.

---

## 1. Propósito y alcance

Este catálogo define **qué datos técnicos guarda VScar de cada Reference Variant**, cómo se identifica técnicamente esa variant, en qué unidad y con qué metadatos se guarda cada valor, en qué categorías del producto se usa y cuáles son **críticos**.

Es la fuente para `@vscar/vehicle-schema` (tipos + Zod), `spec_definitions` en MySQL, las filas de [DATA_RIGHTS_MATRIX.md](DATA_RIGHTS_MATRIX.md), las reglas de `@vscar/quality` y la plantilla de curación.

No contiene umbrales de Meaningful Difference, curvas de utilidad ni pesos de completitud: viven en `@vscar/methodology`. Aquí solo se indica un **peso orientativo** (A/B/C).

---

## 2. Modelo de identidad (D2 · ADR-007)

### 2.1 Commercial identity

Lo que ve y busca el usuario: `manufacturer` → `model` (familia) → `generation` (`generation_code`) → `facelift` → `trim` → `commercial_name` (p. ej. "Golf Advance 1.5 TSI 130"), `model_year` (tal como lo declara cada fuente), `market_code`, `sales_start`/`sales_end`, `price_list_date`.

### 2.2 Technical identity — `Homologation`

La homologación concreta y su periodo de validez. Campos mínimos:

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | CHAR(36) | ✅ | VScar ID |
| `market_code` | enum | ✅ | mercado de la ReferenceVariant |
| `type_approval_number` | string | si existe | TAN UE (p. ej. `e1*2007/46*…`) |
| `variant_code` | string | si existe | `Va` |
| `version_code` | string | si existe | `Ve` |
| `manufacturer_type_code` | string | si no hay TAN/Va/Ve | código de tipo/versión del fabricante u otro identificador equivalente |
| `valid_from` / `valid_to` | date | ✅ / opcional | periodo en que esa homologación rige los valores |
| `test_cycle` | enum | ✅ | ciclo principal de la homologación (§3.4) |
| `emissions_standard_family` / `_level` / `_raw` | enum / enum / string | ✅ family o `UNKNOWN` | §2.5 |
| `homologation_powertrain` | enum | ✅ | `ICE` · `NOVC_HEV` · `OVC_HEV` · `BEV` · `FCEV` · `UNKNOWN` |
| `source_id` / `source_url` | ref / url | ✅ | de dónde sale la identificación |
| `identification_confidence` | enum | ✅ | `EXACT` (TAN/Va/Ve verificados) · `PARTIAL` · `UNCONFIRMED` |

### 2.3 ReferenceVariant = commercial identity + technical identity

```text
ReferenceVariant
  commercial identity  (manufacturer, model, generation, facelift, trim, commercial_name, model_year, market)
  technical identity   → homologation_id
  specs                → SourcedValue[] (cuelgan de la variant técnica)
```

- **Una misma denominación comercial puede producir varias ReferenceVariants técnicas.** Nunca se mezclan homologaciones por comodidad.

```text
Golf Advance 1.5 TSI 130 2018 (commercial)
  ├─ RV-A → TAN …*33 → NEDC                      (masa 1.301 kg)
  └─ RV-B → TAN …*35 → WLTP + NEDC_CORRELATED    (masa 1.315 kg)
```

- `canonicalKey` incluye un discriminador técnico: `market:manufacturer:model:generation:facelift:year:powertrain:trim:h<homologation-short>` (p. ej. `es:volkswagen:golf:mk7:fl:2018:ice-petrol:1.5tsi-130-mt6:advance:h35`).
- Para la UX y el SEO, las ReferenceVariants de una misma denominación comercial se **agrupan** (una ficha comercial con "2 homologaciones"); la comparación se hace siempre con una variant técnica concreta (o con el rango de ambas, marcado).
- Si la homologación no se puede identificar, la variant existe con `identification_confidence = UNCONFIRMED` y la confianza de sus datos lo refleja.
- **UsedVehicleInstance** apunta siempre a una ReferenceVariant técnica concreta; si el usuario no sabe cuál, se usa el grupo comercial y la comparación se marca "depende de la homologación".

### 2.4 Campos estructurales de la ReferenceVariant (no son SpecKeys)

| Campo | Identidad | Tipo | Valores / ejemplo | Notas |
|---|---|---|---|---|
| `market_code` | ambas | enum | `ES`, `US` | |
| `generation_code` | comercial | string | `Mk7`, `XA50`, `G20` | en `vehicle_generations` |
| `facelift` | comercial | ref (opc.) | `Mk7.5` 2017–2020 | en `facelifts` |
| `model_year` | comercial | int | 2018 | como lo declara la fuente; no identifica técnicamente |
| `sales_start` / `sales_end` | comercial | date (opc.) | 2017-03 / 2019-12 | |
| `price_list_date` | comercial | date (opc.) | 2026-05-07 | identifica variants actuales junto a la homologación |
| `trim_name` / `commercial_name` | comercial | string | `Advance` / "Golf Advance 1.5 TSI 130" | |
| `body_type` | comercial | enum | `hatchback`, `sedan`, `estate`, `suv`, `mpv`, `coupe`, `convertible`, `pickup`, `van` | |
| `seats` | técnica | int | 5 | crítico Practicality; jerarquía de fuentes D5 (§6) |
| `doors` | técnica | int | 5 | |
| `powertrain_type` | comercial (producto) | enum | `ICE`, `MHEV`, `HEV`, `PHEV`, `BEV`, `FCEV`, `EREV` | clasificación de producto |
| `homologation_powertrain` | técnica | enum | `ICE`, `NOVC_HEV`, `OVC_HEV`, `BEV`, `FCEV`, `UNKNOWN` | en `Homologation`; decide etiqueta DGT e impuestos (p. ej. Golf eTSI: `MHEV` / `NOVC_HEV`) |
| `fuel_type` | técnica | enum (opc. BEV) | `petrol`, `diesel`, `lpg`, `cng`, `e85`, `hydrogen` | |
| `drivetrain` | técnica | enum | `FWD`, `RWD`, `AWD` | |
| `transmission` | técnica | enum | `manual`, `automatic`, `dct`, `cvt`, `ecvt`, `single_speed` | |
| `gears` | técnica | int / `not_applicable` | 6 | e-CVT / single speed → `not_applicable` |

### 2.5 Norma de emisiones (abierta)

| Campo | Ejemplo | Regla |
|---|---|---|
| `emissions_standard_family` | `EURO_5`, `EURO_6`, `EURO_7`, `EPA_TIER_3`, `UNKNOWN` | enum cerrado de familias |
| `emissions_standard_level` | `B`, `C`, `D_TEMP`, `D`, `E`, `E_BIS`, `EA`, `EB`, `AP`, `UNSPECIFIED` | enum ampliable por PR |
| `emissions_standard_raw` | `"EURO 6 EB"`, `"Euro 6d-TEMP"`, `"Euro 6"` | texto tal cual de la fuente, siempre |

No se infieren niveles (EA/EB/AP…) sin tabla oficial versionada. `"Euro 6"` sin sufijo → `family = EURO_6`, `level = UNSPECIFIED`.

---

## 3. `SourcedValue` v0.2

### 3.1 Campos

| Grupo | Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|---|
| Valor | `value` | number/string/bool/null | uno de `value` o (`value_min`,`value_max`) | `null` si solo hay rango |
| | `value_min` / `value_max` | number | si rango | `min ≤ max` (plausibilidad BLOCK si no) |
| | `range_basis` | enum | si rango | `WHEEL_SIZE` · `TRIM` · `EQUIPMENT` · `HOMOLOGATION_FAMILY` · `UNSPECIFIED` |
| | `unit` | canonical unit | ✅ | §3.6 |
| Fuente | `source_id` / `source_url` | ref / url | ✅ | |
| | `source_market` | enum | ✅ | mercado donde se publicó el dato |
| | `reference_market` | enum | ✅ | mercado de la ReferenceVariant; si ≠ `source_market` → cross-market (§4) |
| | `archived` | bool | ✅ | |
| | `archive_url` / `original_url` | url | si `archived` | Wayback u otro archivo + URL original oficial |
| Calidad | `source_authority` | enum | ✅ | §3.2 |
| | `mapping_confidence` | enum | ✅ | §3.3 |
| | `homologation_match` | enum | ✅ | `EXACT` · `PARTIAL` · `UNCONFIRMED` · `NOT_APPLICABLE` (mismo mercado) |
| | `confidence` | 0..1 | derivado | calculado por `@vscar/quality`, no introducido a mano |
| Tiempo | `retrieved_at` | datetime | ✅ | |
| | `valid_from` / `valid_to` | date | opcional | periodo de vigencia del valor |
| Ciclo | `test_cycle` | enum | si la clave tiene **Ciclo = sí** | §3.4 |
| | `test_cycle_inferred` | enum | si `test_cycle = UNDECLARED` y se infiere | nunca se muestra como declarado |
| | `cycle_evidence` | text | si hay inferencia | p. ej. "presencia de `Ewltp` en EEA + texto legal VW ES" |
| Estado | `status` | enum | ✅ | curación: `DRAFT` · `REVIEWED` · `PUBLISHED` · `CONFLICT` · `REJECTED` |
| | `provisional` | bool | ✅ | p. ej. "pendiente de homologación final" |
| Medida | `measurement_basis` | objeto tipado | según clave | §5 (p. ej. `{ power_basis: 'SYSTEM' }`) |
| Otros | `transformation` / `transformation_version` / `external_field` | enum / int / string | si viene de un adapter | ver DATA_RIGHTS_MATRIX §4 |
| | `notes` | text | opcional | |

No todos los campos aplican a todas las claves; la obligatoriedad por clave la fija `spec_definitions`.

### 3.2 `source_authority` (quién publica, no si es correcto)

| Valor | Significado | Ejemplos |
|---|---|---|
| `OFFICIAL_AUTHORITY` | Organismo público u homologador | EEA, IDAE, DGT, NHTSA, EPA, CoC / documento de homologación |
| `OFFICIAL_MANUFACTURER` | Fabricante o su filial | ficha técnica, configurador, tarifa, nota de prensa, catálogo (también archivado) |
| `VERIFIED_EDITORIAL` | Organismo independiente reconocido o medio con medición propia citada | Euro NCAP (ratings), prensa con prueba propia *(uso sujeto a derechos)* |
| `SECONDARY_REFERENCE` | Agregadores / sitios de specs de terceros | km77, ultimatespecs, ev-database *(no publicable en Alpha)* |
| `USER_PROVIDED` | Introducido por el usuario | precio solicitado, km |
| `CALCULATED` | Derivado por regla/fórmula documentada | etiqueta DGT por regla, CVF, garantía restante |
| `ESTIMATED` | Estimación metodológica | factores de invierno, depreciación |

**`OFFICIAL_*` no es sinónimo de correcto**: una fuente oficial puede contener errores (IDAE 85 kW en una versión de 110 kW), tener menor granularidad, corresponder a otra homologación o ser provisional. La corrección la decide `@vscar/quality` + Conflict Engine + revisión humana.

Correspondencia con v0.1: `OFFICIAL` → `OFFICIAL_AUTHORITY` u `OFFICIAL_MANUFACTURER` · `VERIFIED` → `VERIFIED_EDITORIAL` · resto igual.

### 3.3 `mapping_confidence` (qué tan exactamente aplica el dato a esta variant técnica)

| Valor | Significado | Ejemplo |
|---|---|---|
| `EXACT` | El dato corresponde exactamente a esta variant técnica | configurador VW del trim exacto; EEA a nivel de homologación |
| `TRIM_LEVEL` | Corresponde al trim, sin confirmar homologación | tarifa por acabado |
| `POWERTRAIN_LEVEL` | Corresponde a la motorización, varios trims | ficha por motor |
| `GENERATION_LEVEL` | Corresponde a la generación | catálogo general aplicado a un trim |
| `CROSS_MARKET_EXACT_HOMOLOGATION` | Otro mercado UE con homologación idéntica | consumo CS del León e-HYBRID de SEAT DE con mismo TAN/Va/Ve |
| `INFERRED` | Deducido por el curador con evidencia | ciclo inferido, trim deducido |
| `UNCONFIRMED` | No se puede confirmar a qué aplica | no alimenta engines |

`source_authority` y `mapping_confidence` son **independientes**: un dato puede ser `OFFICIAL_MANUFACTURER` + `GENERATION_LEVEL`.

### 3.4 `test_cycle`

`NEDC` · `NEDC_CORRELATED` · `WLTP` · `EPA` · `MANUFACTURER` · `UNDECLARED`

- `UNDECLARED` cuando la fuente no declara el ciclo; si se infiere, `test_cycle_inferred` + `cycle_evidence`. El valor inferido **nunca** se presenta como ciclo declarado ("ciclo no declarado; probablemente NEDC-correlated").
- Valores de ciclos distintos no se comparan directamente → `NOT_DIRECTLY_COMPARABLE` salvo conversión publicada en metodología.
- **Varios valores de la misma clave** para la misma variant están permitidos cuando corresponden a distintos ciclos (p. ej. WLTP + NEDC_CORRELATED de la misma homologación) o periodos (`valid_from`/`valid_to`). Distintas homologaciones → distintas ReferenceVariants (§2.3).

### 3.5 Rangos (D4 modificada)

- Fuente publica "5,0–5,4 L/100 km" y no se puede resolver la configuración exacta → `value = null`, `value_min = 5.0`, `value_max = 5.4`, `range_basis = WHEEL_SIZE` (o el que aplique).
- Si se conoce la configuración exacta → `value` = valor específico (y `mapping_confidence = EXACT`).
- **Nunca** se colapsa el rango a un valor silencioso. Reglas para engines: §10.

### 3.6 Convenciones

| Regla | Detalle |
|---|---|
| Nombre de clave | `categoria.nombre_snake_case`, inglés, estable. No se renombra salvo cambio de significado (v0.2 renombra dos claves por esa razón; ver *Changes*). |
| Unidades | Canónicas SI en almacenamiento (mm, kg, L, kW, N·m, s, km/h, km, kWh, g/km, L/100 km, kWh/100 km, min, m). Conversión solo en presentación (`@vscar/units`). |
| Dinero | No es SpecKey: `vehicle_prices` (§11). |
| Faltantes | Ausente, nunca 0 ni estimación silenciosa. |
| Supuestos del sistema | En campos `*_assumed` o `source_authority = ESTIMATED`, nunca en campos del usuario. |
| Enums de equipamiento | `standard` · `optional` · `optional_pack` · `not_available` · `unknown` (+ variantes específicas indicadas en cada clave). |
| Mercado | Un valor pertenece a una variant de **un** mercado. Cross-market solo según §4. |

---

## 4. Cross-market UE (D1 · APPROVED WITH CONDITIONS)

Se permite reutilizar un **dato técnico de homologación** publicado en otro mercado UE solo cuando existe equivalencia técnica demostrable.

| `homologation_match` | Criterio | Uso |
|---|---|---|
| `EXACT` | Mismo `TAN` + mismo `Va` + mismo `Ve` (o identificadores equivalentes suficientemente específicos) | **Puede alimentar engines automáticamente** |
| `PARTIAL` | Coincidencia incompleta (p. ej. mismo TAN, versión no confirmada) | **Revisión humana obligatoria** antes de usarse |
| `UNCONFIRMED` | Sin identificadores o no coinciden | **No se usa en cálculos** (solo QA/contraste) |
| `NOT_APPLICABLE` | Mismo mercado | — |

| Permitido cross-market (columna **XM = ✅**) | **No** permitido automáticamente (XM = —) |
|---|---|
| consumo, CO₂, autonomía, masas, capacidad de batería, carga, potencia, prestaciones homologadas, dimensiones de homologación | precio, garantía, equipamiento (ADAS, tecnología), promociones, impuestos, incentivos, etiqueta DGT, cualquier elemento de mercado |

`source_market` siempre visible en "How we calculated this" (p. ej. *"Consumo con batería descargada: 5,0–5,3 L/100 km — fuente: SEAT Alemania, misma homologación"*).

---

## 5. Bases de medida (tipadas por clave)

| Metadato | Enum | Aplica a |
|---|---|---|
| `power_basis` | `SYSTEM` · `ICE_ONLY` · `ELECTRIC_ONLY` · `UNSPECIFIED` | `perf.power_max_kw`, `perf.torque_max_nm` |
| `battery_capacity_basis` | `GROSS` · `USABLE` · `NOMINAL` · `UNSPECIFIED` | `bat.capacity_kwh` |
| `mass_definition` | `EU_RUNNING_ORDER` · `DIN` · `WLTP_TEST_MASS` · `CURB_UNSPECIFIED` · `GROSS_VEHICLE` | `dim.mass_kg` (todas salvo `GROSS_VEHICLE`), `dim.gross_weight_kg` (fijo `GROSS_VEHICLE`) |
| `boot_method` | `VDA` · `SAE` · `MANUFACTURER` · `UNSPECIFIED` | `cap.boot_*` |
| `turning_measure` | `RADIUS` · `DIAMETER` · `UNSPECIFIED` | `dim.turning_m` |
| `towing_gradient_pct` | número (p. ej. 12, 8) o `UNSPECIFIED` | `cap.towing_braked_kg` |
| `range_type` | `WLTP_COMBINED` · `WLTP_CITY` · `EAER` · `AER` · `TOTAL` · `EPA` · `UNSPECIFIED` | `rng.*` |
| `consumption_basis` | `COMBINED` · `WEIGHTED_PHEV` · `CHARGE_SUSTAINING` · `CHARGE_DEPLETING` · `UNSPECIFIED` | `nrg.*` (fijo en claves cuyo nombre lo implica; variable en `nrg.electric_*`) |
| `charging_loss_basis` | `INCLUDED` · `EXCLUDED` · `UNSPECIFIED` | `nrg.electric_*` |
| `soc_from_pct` / `soc_to_pct` | 0–100 | `chg.dc_time_min` |

Reglas: valores con bases distintas **no se comparan como equivalentes** (misma lógica que ciclos). `UNSPECIFIED` es válido para almacenar, pero reduce `confidence` y puede impedir usos concretos (p. ej. Range con `bat.capacity_kwh` requiere `USABLE`).

---

## 6. Jerarquía de fuentes para datos estructurales (D5 · APPROVED WITH SOURCE HIERARCHY)

Para plazas, puertas, dimensiones, masas y otros datos estructurales, orden de preferencia:

1. CoC / documento de homologación;
2. fabricante del mercado;
3. configurador oficial;
4. organismo oficial (IDAE, EEA, DGT);
5. fabricante UE con misma homologación (`homologation_match = EXACT`);
6. fuente secundaria — solo para localizar/contrastar.

La jerarquía expresa **autoridad**; la **exactitud del mapeo** se evalúa aparte (`mapping_confidence`). Un configurador del trim exacto (`EXACT`) puede preferirse a un catálogo de generación del mismo fabricante (`GENERATION_LEVEL`).

## 6b. Fuentes archivadas (D3) y secundarias

- Se aceptan PDFs y páginas oficiales archivadas (incl. Wayback de páginas oficiales), EEA, IDAE, documentos de homologación, CoC, notas de prensa y tarifas oficiales archivadas. Se guarda `archived = true`, `archive_url`, `original_url`; la copia conserva `source_authority` del original (p. ej. `OFFICIAL_MANUFACTURER`) **pero no otorga derechos adicionales**: los derechos siguen siendo los de la fuente original ([DATA_RIGHTS_MATRIX](DATA_RIGHTS_MATRIX.md)).
- `SECONDARY_REFERENCE`: no publicable como dato primario en Alpha ni alimenta engines públicos; sí para encontrar fuentes, detectar conflictos, QA y validar plausibilidad.

---

## 7. SpecKeys v0.2

**Leyenda**: **Crít.** ✅ = crítica para `requiredFor` · **Peso** A/B/C · **HiB** ↑ mejor / ↓ mejor / — · **Ciclo** = exige `test_cycle` · **Base** = metadato de medida obligatorio · **XM** = cross-market permitido con `EXACT` (§4) · **PT**: `ALL`, `ICE` (incl. MHEV salvo nota), `MHEV`, `HEV`, `PHEV`, `BEV`, `ELEC` (= MHEV+HEV+PHEV+BEV).

### 7.1 Dimensiones y masa — `dim.*`

| Key | Descripción | Tipo | Unidad | PT | HiB | Crít. | requiredFor | Peso | Ciclo | Base | XM | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `dim.length_mm` | Longitud total | int | mm | ALL | — | ✅ | Size | A | | | ✅ | |
| `dim.width_mm` | Anchura sin retrovisores | int | mm | ALL | — | ✅ | Size | A | | | ✅ | |
| `dim.width_mirrors_mm` | Anchura con retrovisores | int | mm | ALL | — | | Size | C | | | ✅ | garajes |
| `dim.height_mm` | Altura | int | mm | ALL | — | ✅ | Size | A | | | ✅ | deal breaker "altura garaje"; a menudo en rango (baca/antena) |
| `dim.wheelbase_mm` | Batalla | int | mm | ALL | ↑ | | Size | B | | | ✅ | |
| `dim.ground_clearance_mm` | Altura libre | int | mm | ALL | ↑ | | Size | C | | | ✅ | |
| `dim.turning_m` | Giro (radio o diámetro) | decimal | m | ALL | ↓ | | City | C | | `turning_measure` | ✅ | *renombrada* (v0.1 `turning_circle_m`); fuentes confunden radio/diámetro |
| `dim.mass_kg` | Masa (según definición) | int | kg | ALL | ↓ | | Performance, Eco | B | | `mass_definition` | ✅ | *renombrada* (v0.1 `kerb_weight_kg`); comparar solo misma definición; `WLTP_TEST_MASS` nunca como masa en orden de marcha |
| `dim.gross_weight_kg` | Masa máxima autorizada | int | kg | ALL | — | | Practicality | C | | fijo `GROSS_VEHICLE` | ✅ | |

### 7.2 Capacidad y practicidad — `cap.*`

| Key | Descripción | Tipo | Unidad | PT | HiB | Crít. | requiredFor | Peso | Ciclo | Base | XM | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `cap.boot_l` | Maletero, asientos en uso (hasta bandeja) | int | L | ALL | ↑ | ✅ | Size, Practicality | A | | `boot_method` | ✅ | método rara vez declarado → `UNSPECIFIED` |
| `cap.boot_roof_l` | Maletero, asientos en uso, hasta techo | int | L | ALL | ↑ | | Practicality | C | | `boot_method` | ✅ | **nueva** (Toyota lo publica) |
| `cap.boot_max_l` | Maletero, asientos abatidos | int | L | ALL | ↑ | | Practicality | B | | `boot_method` | ✅ | |
| `cap.frunk_l` | Maletero delantero | int | L | BEV | ↑ | | Practicality | C | | `boot_method` | ✅ | |
| `cap.payload_kg` | Carga útil | int | kg | ALL | ↑ | | Practicality | C | | | ✅ | |
| `cap.towing_braked_kg` | Remolque con freno | int | kg | ALL | ↑ | | Practicality | B | | `towing_gradient_pct` | ✅ | puede haber 2 valores (12 % / 8 %) |
| `cap.towing_unbraked_kg` | Remolque sin freno | int | kg | ALL | ↑ | | Practicality | C | | | ✅ | plausibilidad: ≤ con freno |
| `cap.roof_load_kg` | Carga en techo | int | kg | ALL | ↑ | | Practicality | C | | | ✅ | |
| `cap.isofix_positions` | Anclajes ISOFIX | int | — | ALL | ↑ | | Family | B | | | — | equipamiento de mercado |
| `cap.third_row` | Tercera fila | enum | — | ALL | — | | Family | B | | | — | `standard/optional/not_available` |

### 7.3 Prestaciones — `perf.*`

| Key | Descripción | Tipo | Unidad | PT | HiB | Crít. | requiredFor | Peso | Ciclo | Base | XM | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `perf.power_max_kw` | Potencia máxima | decimal | kW | ALL | ↑ | ✅ | Performance | A | | `power_basis` | ✅ | crítica requiere `SYSTEM` en HEV/PHEV (o `ICE_ONLY` en ICE); `ICE_ONLY` nunca sustituye a `SYSTEM` (IDAE/EEA dan térmica en HEV) |
| `perf.torque_max_nm` | Par máximo | int | N·m | ALL | ↑ | | Performance | B | | `power_basis` | ✅ | Toyota solo publica par térmico |
| `perf.accel_0_100_s` | 0–100 km/h | decimal | s | ALL | ↓ | ✅ | Performance | A | | | ✅ | US: clave aparte, sin conversión |
| `perf.accel_0_60_s` | 0–60 mph | decimal | s | ALL | ↓ | | Performance | B | | | — | solo US |
| `perf.top_speed_kmh` | Velocidad máxima | int | km/h | ALL | ↑ | | Performance | C | | | ✅ | |
| `perf.power_ice_kw` | Potencia del motor térmico | decimal | kW | ICE, HEV, PHEV | ↑ | | Performance | C | | fijo `ICE_ONLY` | ✅ | |
| `perf.power_electric_kw` | Potencia eléctrica | decimal | kW | ELEC | ↑ | | Performance | C | | fijo `ELECTRIC_ONLY` | ✅ | |

### 7.4 Motor térmico y transmisión — `pt.*`

| Key | Descripción | Tipo | Unidad | PT | HiB | Crít. | requiredFor | Peso | Ciclo | Base | XM | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `pt.displacement_cc` | Cilindrada | int | cm³ | ICE, HEV, PHEV | — | | — | C | | | ✅ | EEA `Ec (cm3)` |
| `pt.cylinders` | Cilindros | int | — | ICE, HEV, PHEV | — | | — | C | | | ✅ | |
| `pt.fuel_tank_l` | Depósito | decimal | L | ICE, HEV, PHEV | ↑ | ✅ | Range | A | | | ✅ | conflictos internos observados (X3 60 vs 68 L) → Conflict Engine |
| `pt.fiscal_hp_es` | Potencia fiscal (CVF) | decimal | CVF | ICE, HEV, PHEV | — | | Ownership (ES) | B | | | — | `CALCULATED` desde cilindrada/fórmula oficial |
| `pt.timing_drive` | Distribución | enum | — | ICE, HEV, PHEV | — | | Ownership | C | | | ✅ | `belt/chain/gear/unknown` |

(`gears` es campo estructural, §2.4.)

### 7.5 Batería — `bat.*`

| Key | Descripción | Tipo | Unidad | PT | HiB | Crít. | requiredFor | Peso | Ciclo | Base | XM | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `bat.capacity_kwh` | Capacidad de batería de tracción | decimal | kWh | ELEC | ↑ | (ver §8) | Range, Charging | A (PHEV/BEV) · C (MHEV/HEV) | | `battery_capacity_basis` | ✅ | **nueva** base de almacenamiento; "82,5 kWh" sin tipo → `UNSPECIFIED`; varios valores por variant si la fuente da bruta y útil |
| `bat.chemistry` | Química | enum | — | ELEC | — | | — | C | | | ✅ | `NMC/NCA/LFP/NIMH/LI_ION_UNSPECIFIED/other/unknown` |
| `bat.heat_pump` | Bomba de calor | enum | — | PHEV, BEV | — | | Range (invierno) | C | | | — | equipamiento |
| `bat.warranty_years` | Garantía de batería (años) | int | años | ELEC | ↑ | | Warranty, Used | B | | | — | de mercado |
| `bat.warranty_km` | Garantía de batería (km) | int | km | ELEC | ↑ | | Warranty, Used | B | | | — | conflictos observados (BYD 250k vs 200k) |
| `bat.warranty_soh_pct` | SOH mínimo garantizado | int | % | PHEV, BEV | ↑ | | Warranty, Used | C | | | — | |
| `bat.warranty_conditions` | Condiciones de la garantía de batería | text | — | ELEC | — | | Warranty, Used | C | | | — | **nueva**: p. ej. Toyota condiciona la cobertura a mantenimiento anual |

**Vistas lógicas** (no se almacenan): `bat.usable_kwh` = valor de `bat.capacity_kwh` con `basis = USABLE`; `bat.gross_kwh` = con `basis = GROSS`. Para HEV/MHEV no se exige distinguir bruta/útil.

### 7.6 Carga — `chg.*`

| Key | Descripción | Tipo | Unidad | PT | HiB | Crít. | requiredFor | Peso | Ciclo | Base | XM | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `chg.ac_max_kw` | Carga AC máxima | decimal | kW | PHEV, BEV | ↑ | ✅ | Charging | A | | | ✅ | |
| `chg.dc_max_kw` | Carga DC máxima | decimal | kW | BEV (PHEV opc.) | ↑ | ✅ (BEV) | Charging, Long Trips | A | | | ✅ | PHEV sin DC → `not_available` |
| `chg.dc_time_min` | Tiempo de carga DC en una ventana de SoC | int | min | BEV, PHEV con DC | ↓ | | Charging, Long Trips | A | | `soc_from_pct`, `soc_to_pct` | ✅ | **sustituye** a `dc_10_80_min`; p. ej. 26 min 30→80, 37 min 10→80; solo se comparan ventanas idénticas |
| `chg.ac_phases` | Fases del cargador AC | int | — | PHEV, BEV | ↑ | | Charging | C | | | ✅ | |
| `chg.dc_connector` | Conector DC | enum | — | BEV, PHEV | — | | Charging | C | | | ✅ | `CCS2/CCS1/NACS/CHAdeMO/GBT` |
| `chg.charging_curve` | Curva de carga | json | kW vs % | BEV | — | | Charging | C | | | ✅ | solo con fuente |
| `chg.v2l` | Vehicle-to-load | enum | — | BEV, PHEV | — | | Technology | C | | | — | equipamiento |

### 7.7 Consumo de energía — `nrg.*` (todas con ciclo)

| Key | Descripción | Tipo | Unidad | PT | HiB | Crít. | requiredFor | Peso | Ciclo | Base | XM | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `nrg.fuel_combined_l100` | Consumo combinado | decimal | L/100 km | ICE, MHEV, HEV | ↓ | ✅ | Economy, Range, Eco | A | sí | fijo `COMBINED` | ✅ | a menudo en rango |
| `nrg.fuel_urban_l100` | Consumo urbano (NEDC urban / EPA city) | decimal | L/100 km | ICE, HEV, PHEV | ↓ | | Economy (City) | B | sí | | ✅ | no mapear fases WLTP aquí |
| `nrg.fuel_extra_urban_l100` | Consumo extraurbano (NEDC extra-urban / EPA hwy) | decimal | L/100 km | ICE, HEV, PHEV | ↓ | | Economy (Highway) | B | sí | | ✅ | idem |
| `nrg.fuel_wltp_low_l100` | WLTP Low | decimal | L/100 km | ICE, HEV | ↓ | | Economy (City) | C | WLTP | | ✅ | |
| `nrg.fuel_wltp_medium_l100` | WLTP Medium | decimal | L/100 km | ICE, HEV | ↓ | | Economy | C | WLTP | | ✅ | |
| `nrg.fuel_wltp_high_l100` | WLTP High | decimal | L/100 km | ICE, HEV | ↓ | | Economy | C | WLTP | | ✅ | |
| `nrg.fuel_wltp_extra_high_l100` | WLTP Extra High | decimal | L/100 km | ICE, HEV | ↓ | | Economy (Highway) | C | WLTP | | ✅ | |
| `nrg.fuel_charge_sustaining_l100` | Consumo con batería descargada | decimal | L/100 km | PHEV | ↓ | ✅ (PHEV) | Economy, Range | A | sí | fijo `CHARGE_SUSTAINING` | ✅ | **base del coste PHEV**; en ES a menudo solo cross-market (§4) |
| `nrg.phev_weighted_fuel_l100` | Consumo ponderado homologado | decimal | L/100 km | PHEV | ↓ | | — | C | sí | fijo `WEIGHTED_PHEV` | ✅ | se muestra como oficial, **nunca se usa para coste** |
| `nrg.electric_combined_kwh100` | Consumo eléctrico | decimal | kWh/100 km | PHEV, BEV | ↓ | ✅ | Economy, Range | A | sí | `consumption_basis` (BEV `COMBINED`; PHEV `WEIGHTED_PHEV`/`CHARGE_DEPLETING`/`UNSPECIFIED`) + `charging_loss_basis` | ✅ | PHEV: la fuente suele etiquetar "ponderado" |
| `nrg.electric_urban_kwh100` | Consumo eléctrico urbano | decimal | kWh/100 km | PHEV, BEV | ↓ | | Economy (City) | B | sí | `charging_loss_basis` | ✅ | |
| `nrg.electric_highway_kwh100` | Consumo eléctrico carretera | decimal | kWh/100 km | PHEV, BEV | ↓ | | Economy (Highway), Long Trips | B | sí | `charging_loss_basis` | ✅ | |

### 7.8 Autonomía — `rng.*` (todas con ciclo)

| Key | Descripción | Tipo | Unidad | PT | HiB | Crít. | requiredFor | Peso | Ciclo | Base | XM | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `rng.electric_combined_km` | Autonomía eléctrica combinada | int | km | PHEV, BEV | ↑ | ✅ | Range, Economy (PHEV) | A | sí | `range_type` | ✅ | PHEV: EAER vs AER a menudo no declarado → `UNSPECIFIED` |
| `rng.electric_urban_km` | Autonomía eléctrica urbana | int | km | PHEV, BEV | ↑ | | Range (City) | B | sí | `range_type` | ✅ | |
| `rng.electric_highway_km` | Autonomía eléctrica carretera | int | km | BEV | ↑ | | Range, Long Trips | B | sí | `range_type` | ✅ | |
| `rng.phev_total_km` | Autonomía total PHEV (eléctrica + térmica) | int | km | PHEV | ↑ | | Range, Long Trips | B | sí | fijo `TOTAL` | ✅ | **nueva** |

Autonomía ICE y estimaciones (invierno, carretera) = `CALCULATED`/`ESTIMATED` del Range Engine, no SpecKeys.

### 7.9 Emisiones — `emi.*`

| Key | Descripción | Tipo | Unidad | PT | HiB | Crít. | requiredFor | Peso | Ciclo | Base | XM | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `emi.co2_combined_gkm` | CO₂ combinado (ponderado en PHEV) | int | g/km | ALL | ↓ | ✅ | Eco | A | sí | | ✅ | base impuesto matriculación ES; BEV = 0 (`CALCULATED`) |
| `emi.co2_charge_sustaining_gkm` | CO₂ con batería descargada | int | g/km | PHEV | ↓ | | Eco | B | sí | fijo `CHARGE_SUSTAINING` | ✅ | **nueva** |
| `emi.dgt_label_es` | Etiqueta ambiental DGT | enum | — | ALL | — | ✅ (ES) | Eco, City (ZBE) | A | | | — | `0`, `ECO`, `C`, `B`, `none`; §13 |

### 7.10 Seguridad — `saf.*`

Vista normalizada de `safety_ratings` (§12). Nunca se comparan protocolos distintos.

| Key | Descripción | Tipo | Unidad | PT | HiB | Crít. | requiredFor | Peso | XM | Notas |
|---|---|---|---|---|---|---|---|---|---|---|
| `saf.ncap_stars` | Estrellas | int | 0–5 | ALL | ↑ | | Safety | A | ✅ (mismo modelo ensayado) | con `rating_status`, protocolo, año |
| `saf.ncap_adult_pct` | Ocupante adulto | int | % | ALL | ↑ | | Safety | B | ✅ | Euro NCAP |
| `saf.ncap_child_pct` | Ocupante infantil | int | % | ALL | ↑ | | Safety, Family | B | ✅ | |
| `saf.ncap_vru_pct` | Usuarios vulnerables | int | % | ALL | ↑ | | Safety | C | ✅ | |
| `saf.ncap_assist_pct` | Sistemas de asistencia | int | % | ALL | ↑ | | Safety | C | ✅ | |
| `saf.airbags_count` | Nº de airbags | int | — | ALL | ↑ | | Safety | C | — | criterio de conteo a normalizar en curación |

**Activación de Safety**: rating con protocolo y `rating_status ∈ {VALID, EXPIRED}` (EXPIRED se muestra como tal) **o** ≥ 4 claves `adas.*` conocidas.

### 7.11 ADAS — `adas.*` (enum `standard` · `optional` · `optional_pack` · `not_available` · `unknown`)

| Key | Descripción | Peso |
|---|---|---|
| `adas.aeb` | Frenada autónoma de emergencia | A |
| `adas.aeb_vru` | AEB peatones/ciclistas | B |
| `adas.acc` | Crucero adaptativo (stop&go en notas) | B |
| `adas.lane_keep` | Mantenimiento de carril | B |
| `adas.blind_spot` | Ángulo muerto | B |
| `adas.rear_cross_traffic` | Tráfico trasero | C |
| `adas.traffic_sign_recognition` | Reconocimiento de señales | C |
| `adas.driver_monitoring` | Fatiga/atención | C |
| `adas.surround_camera` | Cámara 360° | C |

Todas: PT ALL · HiB ↑ · Safety/Technology · no críticas · XM — (equipamiento de mercado) · granularidad por trim; si la fuente solo da "gama" → `mapping_confidence = POWERTRAIN_LEVEL` o `GENERATION_LEVEL`.

### 7.12 Tecnología — `tech.*` (XM —)

| Key | Descripción | Tipo | Peso | Valores |
|---|---|---|---|---|
| `tech.apple_carplay` | Apple CarPlay | enum | B | `standard_wireless` · `standard_wired` · `standard_unspecified` · `optional` · `optional_pack` · `not_available` · `unknown` |
| `tech.android_auto` | Android Auto | enum | B | idem |
| `tech.center_screen_in` | Pantalla central | decimal (in) | C | pulgadas |
| `tech.digital_cluster` | Cuadro digital | enum | C | equipamiento |
| `tech.connected_services` | Servicios conectados | enum | C | equipamiento |
| `tech.ota_updates` | OTA | enum | C | equipamiento |

### 7.13 Garantía original — `war.*` (XM —)

| Key | Descripción | Tipo | Unidad | PT | HiB | Crít. | requiredFor | Peso | Notas |
|---|---|---|---|---|---|---|---|---|---|
| `war.years` | Garantía general (años) | int | años | ALL | ↑ | ✅ | Warranty, Used | A | la del mercado y época |
| `war.km` | Garantía general (km) | int | km | ALL | ↑ | | Warranty, Used | B | `unlimited` solo si la fuente lo dice; no declarado → ausente |
| `war.conditions` | Condiciones | text | — | ALL | — | | Warranty | C | |

### 7.14 Mantenimiento de referencia — `mnt.*`

| Key | Descripción | Tipo | Unidad | PT | Peso | XM | Notas |
|---|---|---|---|---|---|---|---|
| `mnt.service_interval_km` | Intervalo | int | km | ALL | C | — | fijo o variable |
| `mnt.service_interval_months` | Intervalo | int | meses | ALL | C | — | |

Hitos detallados en `maintenance_milestones`.

**Total v0.2: 90 SpecKeys** — dim 9 · cap 10 · perf 7 · pt 5 · bat 7 · chg 7 · nrg 12 · rng 4 · emi 3 · saf 6 · adas 9 · tech 6 · war 3 · mnt 2.
Cambios de recuento vs v0.1 (88): −2 (`bat.gross_kwh`, `bat.usable_kwh` → vistas) +1 (`bat.capacity_kwh`) +1 (`bat.warranty_conditions`) +1 (`cap.boot_roof_l`) +1 (`rng.phev_total_km`) +1 (`emi.co2_charge_sustaining_gkm`) · `pt.gears` pasa a campo estructural `gears` (−1) · renombradas sin cambio de recuento: `dim.mass_kg`, `dim.turning_m`, `chg.dc_time_min`.

---

## 8. Elegibilidad por variant y por categoría

No se exige un 90 % global a cada variant histórica. Tres niveles independientes:

| Nivel | Regla | Resultado |
|---|---|---|
| `vehicle_page_eligibility` | identidad comercial completa + ≥ 1 categoría `AVAILABLE` + sin `BLOCK` de plausibilidad | ficha histórica publicable aunque falten categorías |
| `comparison_category_eligibility` | por categoría: todas sus claves críticas presentes, utilizables (`mapping_confidence` ≠ `UNCONFIRMED`, `homologation_match` ≠ `UNCONFIRMED`/`PARTIAL` sin revisar, no `SECONDARY_REFERENCE`) y con bases compatibles | `AVAILABLE` · `PARTIAL` (críticas presentes pero con rangos, `UNSPECIFIED` o ciclo inferido) · `NOT_AVAILABLE` (+ motivo) |
| `seo_comparison_eligibility` | comparación indexable: `comparison_completeness ≥ 90 %` sobre categorías disponibles **y** Economy `AVAILABLE`/`PARTIAL` **y** (Range o Size) para todos + cálculos propios + mismo mercado | indexable / `noindex` |

Ejemplo: Golf 2018 (DC-03) puede tener ficha histórica con Size/Eco disponibles pero *"Economy: NOT AVAILABLE — missing official fuel consumption"* y *"Performance: PARTIAL"*.

### 8.1 Claves críticas por categoría

| Categoría | ICE / MHEV / HEV | PHEV | BEV |
|---|---|---|---|
| **Economy** | `nrg.fuel_combined_l100` + precio¹ | `nrg.fuel_charge_sustaining_l100` + `nrg.electric_combined_kwh100` + `rng.electric_combined_km` + precio¹ | `nrg.electric_combined_kwh100` + precio¹ |
| **Range** | `pt.fuel_tank_l` + `nrg.fuel_combined_l100` | `rng.electric_combined_km` + `pt.fuel_tank_l` + `nrg.fuel_charge_sustaining_l100` | `rng.electric_combined_km` **o** (`bat.capacity_kwh` con `USABLE` + `nrg.electric_combined_kwh100`) |
| **Charging** | — | `chg.ac_max_kw` | `chg.ac_max_kw` + `chg.dc_max_kw` |
| **Performance** | `perf.power_max_kw` (`SYSTEM` en HEV) + `perf.accel_0_100_s`² | idem (`SYSTEM`) | idem |
| **Size** | `dim.length_mm` + `dim.width_mm` + `dim.height_mm` + `cap.boot_l` | idem | idem |
| **Practicality / Family** | `seats` + `cap.boot_l` | idem | idem |
| **Eco** | `emi.co2_combined_gkm` + `emi.dgt_label_es` (ES) | idem | `emi.dgt_label_es` (ES)³ |
| **Safety** | §7.10 | idem | idem |
| **Warranty** | `war.years` | idem | `war.years` (+ `bat.warranty_years` recomendado) |

¹ `original_list` o `current_new` con `price_basis = LIST`, o `used_asking_price` (USER PROVIDED) si el participante es usado. ² US: `perf.accel_0_60_s`. ³ BEV: CO₂ = 0 `CALCULATED`.

---

## 10. Rangos en los engines (D4 · MODIFIED)

- Los engines trabajan con **intervalos**: se propagan `value_min`/`value_max` y se calcula el resultado en ambos extremos.
- Si el ganador **no cambia** → *"RESULT STABLE ACROSS HOMOLOGATED RANGE"*.
- Si **cambia** → *"RESULT DEPENDS ON CONFIGURATION"* y se **reduce Recommendation Confidence**; la Sensitivity Analysis muestra qué configuración decide.
- Escenarios `LOW` / `HIGH` = extremos del rango. **`BASE` solo existe si hay metodología publicada** para elegirlo (p. ej. llanta de serie conocida); no se inventa un punto medio.
- El extremo desfavorable **solo** se usa en el escenario explícito **`CONSERVATIVE`**, nunca como valor silencioso por defecto.
- Si la configuración exacta es conocida (acabado + llanta), se usa el valor específico.

## 11. Precios (tabla `vehicle_prices`, no SpecKeys)

| Campo | Valores |
|---|---|
| `price_type` | `original_list` · `current_new` · `msrp` · `otr` |
| `price_basis` | `LIST` · `PROMOTIONAL` · `FINANCED` · `OTR` · `MSRP` · `UNKNOWN` |
| `region` | p. ej. `ES-PENINSULA_BALEARES`, `ES-CANARIAS`, `ES-CEUTA_MELILLA`, `US-<state>` o `UNSPECIFIED` |
| `incl_taxes` | `YES` · `NO` · `UNKNOWN` |
| resto | `amount_minor`, `currency`, `valid_from`/`valid_to`, `price_list_date`, `source_*`, `archived` |

Economy usa por defecto `price_basis = LIST`; `PROMOTIONAL` y `FINANCED` se guardan y pueden mostrarse, pero no sustituyen al precio de lista. `used_asking_price` pertenece a la UsedVehicleInstance. `estimated_market_value` es Later.

**Tabla `incentives`** (separada, nunca restada al precio base guardado): `id`, `market_code`, `region`, `program` (p. ej. MOVES III, Plan Auto+, CAE), `amount_minor` o `rule`, `eligibility` (texto/JSON), `applies_to` (powertrain/variants), `valid_from`/`valid_to`, `source_*`. Se aplican en el cálculo solo si el usuario los activa o cumple condiciones declaradas.

## 12. Seguridad (tabla `safety_ratings`)

| Campo | Valores / notas |
|---|---|
| `authority` | `EuroNCAP` · `NHTSA` · `IIHS` |
| `stars`, `sub_scores` | adulto / infantil / VRU / asistencia |
| `protocol_version`, `tested_year` | obligatorios |
| `rating_status` | `VALID` · `EXPIRED` · `NOT_RATED` · `PROVISIONAL` |
| `rating_valid_from` / `rating_valid_to` | según la autoridad (Euro NCAP caduca ratings antiguos) |
| `tested_powertrain` | motor/versión ensayada |
| `tested_variant_note` | obligatorio si el rating corresponde a un coche **anterior al facelift**, a un **gemelo corporativo** (p. ej. SEAT León ← CUPRA León) o a **otro motor** |
| `mapping_confidence` | `EXACT` / `POWERTRAIN_LEVEL` / `GENERATION_LEVEL` / `INFERRED` |

No se finge equivalencia exacta. Un rating `EXPIRED` se muestra con su estado; `NOT_RATED` es un estado, no un faltante.

## 13. Etiqueta DGT (`emi.dgt_label_es`)

- Cuando se deriva por reglas (combustible + `emissions_standard` + `homologation_powertrain` + autonomía eléctrica): `source_authority = CALCULATED`, con `rule_version` y `rule_source_url` (normativa DGT).
- Si el fabricante la declara → `OFFICIAL_MANUFACTURER` (y se contrasta con la regla).
- El valor oficial **por matrícula** pertenece a una futura UsedVehicleInstance, no a la ReferenceVariant.
- XM —: nunca se importa de otro mercado.

## 14. Reglas de plausibilidad (P0 · `@vscar/quality`, desde el primer import)

Estados: **`PASS`** · **`WARNING`** (se publica con revisión) · **`BLOCK`** (no se publica ni alimenta engines). **Nunca se autocorrige silenciosamente.**

| Regla | Estado |
|---|---|
| `value_min > value_max` | BLOCK |
| capacidad `USABLE` > `GROSS` en la misma variant | BLOCK |
| potencia `ICE_ONLY` propuesta como `SYSTEM` en HEV/PHEV (o sustituyéndola) | BLOCK |
| `mass_definition = WLTP_TEST_MASS` usada como masa en orden de marcha | BLOCK |
| mismo identificador de homologación con valores incompatibles | CONFLICT → Conflict Engine |
| consumo urbano anormalmente inferior al extraurbano en ICE (umbral en metodología) | WARNING |
| remolque con freno < sin freno | WARNING |
| `turning_measure = RADIUS` con valor > 8 m en turismo (probable diámetro) | WARNING |
| CO₂ incompatible con consumo, ciclo y combustible (tolerancia en metodología) | WARNING |
| valor fuera del rango físico de la clave (tabla por clave en metodología) | WARNING/BLOCK según distancia |
| dato `provisional = true` usado en SEO | WARNING |
| `homologation_match = PARTIAL` sin revisión humana | BLOCK para engines |

## 15. Conflict Engine (P0)

Conflicto = ≥ 2 valores vigentes para la misma (variant técnica, clave, ciclo, base, periodo) incompatibles tras tolerancia. **No se resuelve solo por jerarquía fija** (p. ej. EEA `OFFICIAL_AUTHORITY` vs fabricante `OFFICIAL_MANUFACTURER` pueden estar en conflicto real). Criterios combinados:

`source_authority` · `mapping_confidence` · `homologation_match` · coincidencia de mercado · `valid_from`/`valid_to` · ciclo · base de medida · granularidad · resultado de plausibilidad · recencia.

Salida: valor propuesto + motivo, o `CONFLICT` para revisión humana. Todos los valores se conservan (append-only).

## 16. Campos de la UsedVehicleInstance (no SpecKeys)

Alimentan `used_instance_completeness` (**completitud de información de la unidad**, no calidad del coche) y **Used Information Confidence**. USER PROVIDED en Alpha.

| Campo | Tipo | Crít. | Peso (información) | Notas |
|---|---|---|---|---|
| `asking_price` | money | ✅ | A | sustituye al precio de lista en Economic Fit |
| `mileage_km` | int | ✅ | A | |
| `registration_year` | int / null | | B | si no se indica: `null` + `registration_year_assumed = model_year` con `ESTIMATED`; nunca cuenta como conocido |
| `service_history` | `full/partial/none/unknown` | | B | |
| `accident_history` | `none_declared/declared/unknown` | | B | |
| `owners` | int / unknown | | C | |
| `warranty_remaining_months` | int / unknown | | B | `CALCULATED` si hay fecha y `war.years` |
| `inspection_status` | `valid/expired/unknown` | | C | ITV |
| `condition` | `excellent/good/fair/poor/unknown` | | C | |
| `battery_health_pct` | int / unknown | (✅ BEV) | A (BEV/PHEV) | nunca estimada como dato de la unidad |
| `homologation_id` | ref / null | | B | si el usuario no sabe la homologación → grupo comercial (§2.3) |

No se guardan URL del anuncio ni datos del vendedor por defecto. **Methodology v0.1**: separar *information completeness* de *decision relevance* (p. ej. `owners` pesa menos que `mileage_km`, `service_history` o `battery_health_pct` en un EV usado).

## 17. Estrategia de cobertura histórica (D3)

| Periodo | Prioridad Alpha | Nota |
|---|---|---|
| 2017–2026 | **Alta** | incluye la transición NEDC→WLTP |
| 2014–2016 | Selectiva | solo familias con demanda alta y fuentes archivadas disponibles |
| 2010–2013 | Oportunista | solo si aparecen fuentes de calidad; sin promesa de cobertura |

No se promete cobertura uniforme desde 2010. La elegibilidad es por variant y por categoría (§8).

## 18. Checklist de curación v0.2

1. Identidad comercial: familia → generación → facelift → trim → denominación → `model_year` declarado → mercado.
2. **Identidad técnica**: localizar homologación (TAN/Va/Ve en EEA/CoC o equivalente) y su validez; si hay varias bajo la misma denominación → una ReferenceVariant por homologación.
3. Campos estructurales (§2.4) siguiendo la jerarquía D5.
4. Claves críticas (§8.1) con fuente, URL, `source_authority`, `mapping_confidence`, **ciclo** (o `UNDECLARED` + inferencia), **base de medida**, rango si lo hay.
5. Si falta un dato técnico en el mercado: buscar misma homologación en otro mercado UE → `homologation_match`.
6. Resto de claves A/B; ausentes si no hay fuente.
7. Precios con `price_basis`, `region`, `incl_taxes`; incentivos aparte.
8. Seguridad con `rating_status` y `tested_variant_note`.
9. Recalls por generación/rango de producción si hay fuente.
10. Ejecutar plausibilidad + Conflict Engine; revisión humana de `WARNING`/`CONFLICT`/`PARTIAL` → `REVIEWED` → `PUBLISHED`.

## 19. Preguntas abiertas v0.2

| # | Pregunta | Decide | Cuándo |
|---|---|---|---|
| Q1 | Umbrales numéricos de plausibilidad por clave | methodology v0.1 | **parcial**: umbrales iniciales en `@vscar/methodology` (`PLAUSIBILITY_THRESHOLDS`), provisionales |
| Q2 | ¿Metodología defendible para *ESTIMATED REAL WORLD* junto a NEDC? | methodology | antes de semana 9 |
| Q3 | Regla para elegir `BASE` en rangos (llanta de serie por trim) — ¿hay fuente fiable por trim? | methodology + data | abierta: methodology 2026.1 **no define BASE** (`scenarioValue('BASE')` exige regla explícita) |
| Q4 | Tabla oficial versionada de etiqueta DGT (regla y fuente) | data | **parcial**: regla `dgt-label-v1` en `@vscar/methodology`, reproduce los fixtures; pendiente contrastar con la tabla oficial vigente |
| Q5 | Claves de confort/equipamiento en v0.3 | producto | tras Alpha |
| Q6 | Pesos de Used Information Confidence: *information completeness* vs *decision relevance* | methodology v0.1 | **resuelta v0.1**: pesos A/B/C + relevancia por powertrain/antigüedad en `@vscar/methodology` |
| Q7 | Agrupación en UX/SEO de varias variants técnicas bajo una ficha comercial | producto/SEO | Step 3 |
| Q8 | `source_authority` mezcla *quién origina* (OFFICIAL_*, VERIFIED_EDITORIAL, SECONDARY_REFERENCE) y *cómo se origina* (USER_PROVIDED, CALCULATED, ESTIMATED). Posible evolución a `source_authority` + `value_origin` (`DIRECT`, `CALCULATED`, `ESTIMATED`, `USER_PROVIDED`). No se cambia el catálogo; el código (Zod/MySQL) deja la puerta abierta; decisión por ADR si resulta incómodo | data + ingeniería | Step 3 |
