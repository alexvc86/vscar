# Dataset Core v0.1 — Findings

> Fecha: 2026-09-24 · Muestra: 10 Reference Variants (DC-01 … DC-10), mercado ES
> Estado del experimento: **SCHEMA VALIDATION COMPLETE — CURATION REVIEW PENDING** · Estado de los datos: **borradores de curación, sin revisión humana, no publicados, no importables a producción** hasta aprobar el schema v0.2.
> Decisiones D1–D5: **resueltas** (§5) → implementadas en [SPEC_KEY_CATALOG v0.2](../SPEC_KEY_CATALOG.md), [DATA_RIGHTS_MATRIX v0.2](../DATA_RIGHTS_MATRIX.md), [ADR-007](../../adr/ADR-007-reference-vs-used-instance.md), [ADR-009](../../adr/ADR-009-data-provider-rights.md).
> Fuentes: ficheros `DC-NN-*.md` de esta carpeta. Las cifras de cobertura de este documento resumen esos ficheros; ante discrepancia, manda el fichero DC.

**Conclusión en una línea**: el catálogo v0.1 aguanta la estructura (categorías, claves críticas, procedencia, ciclo), pero los datos reales obligan a **modelar la homologación como identidad técnica**, a **admitir rangos y bases de medida explícitas**, y a decidir **cómo cubrir el PHEV y los años anteriores a 2019**. Salen más de los 3–10 cambios previstos: ~18 fricciones, de las que 6 afectan al schema.

---

## 1. Resultado por vehículo

| ID | Variant | Claves críticas con fuente oficial | Huecos principales |
|---|---|---|---|
| DC-01 | Toyota RAV4 220H 4x2 Advance 2021 (XA50) | 13/14 | precio de lista 2021 del acabado (solo km77 / Wayback no accesible) |
| DC-02 | Toyota RAV4 Hybrid 200 FWD Advance, **6.ª gen.** (2026) | 13/14 | nº de plazas; datos "pendientes de homologación final"; sin rating NCAP aún; conflictos ES vs EU (CV, altura, CO₂) |
| DC-03 | VW Golf 1.5 TSI EVO 130 CV Advance 2018 (Mk7.5) | **4/13** | consumo, depósito, dimensiones, maletero, plazas, 0-100 solo en km77; página NCAP 2012 404 |
| DC-04 | VW Golf 1.5 eTSI 150 DSG Style (Mk8.5) | 13/13 | — (km de garantía no declarados) |
| DC-05 | BMW X3 xDrive20d 2018 (G01) | 12/12 (4 con matices) | consumo en rango; depósito 60 vs 68 L; precio sin indicar impuestos |
| DC-06 | Hyundai Tucson 1.6 T-GDI HEV 230 Tecno 2023 (NX4) | 11/12 | precio de lista 2023 → Economy no activable |
| DC-07 | Tesla Model 3 SR+ RWD 2021 (pre-Highland) | parcial | AC/DC kW y batería útil solo secundarias → Charging no activable; variant cambia a mitad de año |
| DC-08 | BYD Seal Design RWD 82,5 kWh (2026) | BEV completas | batería "82,5 kWh" sin tipo (bruta/útil); garantía batería 250k vs 200k km |
| DC-09 | SEAT León 1.5 TSI 130 Style 2018 (Mk3 FL) | 10/14 | 0-100 y precio solo secundarios; plazas no encontradas; ciclo IDAE no declarado |
| DC-10 | SEAT León e-HYBRID 204 Style (Mk4 FL, 2026) | 15/17 | **consumo *charge-sustaining* no publicado en ES** (sí en DE); plazas |

## 2. Cobertura observada vs esperada (claves críticas)

`expected` = hipótesis previa de la DATA_RIGHTS_MATRIX (periodo 2015–19 para usados de 2018; 2020+ para el resto). `observed` = variants con valor de **fuente oficial** / variants aplicables.

| Clave crítica | Aplicables | Observed (oficial) | Solo secundaria | Expected previa | Lectura |
|---|---|---|---|---|---|
| `nrg.fuel_combined_l100` | 7 (ICE/HEV/MHEV) | 6/7 (86 %) | 1 (DC-03) | media–alta | mejor de lo esperado; a menudo en **rango** |
| `pt.fuel_tank_l` | 8 | 7/8 | 1 (DC-03) | media–alta | conflicto interno BMW |
| `dim.length/width/height` | 10 | 9/10 | 1 (DC-03) | alta | ✓ |
| `cap.boot_l` | 10 | 9/10 | 1 (DC-03) | alta | método VDA casi nunca declarado |
| `seats` (estructural) | 10 | **6/10** | 1 | (no evaluada) | **sorpresa**: las fichas ES no lo declaran |
| `perf.power_max_kw` | 10 | 10/10 | 0 | alta | ojo: IDAE da potencia **térmica** en HEV |
| `perf.accel_0_100_s` | 10 | 8/10 | 2 (DC-03, DC-09) | media | los antiguos fallan |
| `emi.co2_combined_gkm` | 10 | 10/10 | 0 | alta | EEA cubre bien 2018; ciclo a veces no declarado |
| `emi.dgt_label_es` | 10 | 10/10 | 0 | alta | casi siempre **CALCULATED por regla** DGT, no registro por variant |
| `war.years` | 10 | 10/10 | 0 | media–alta | km a menudo no declarados |
| Precio (`original_list` / `current_new`) | 10 | **6/10** | 2 | baja (hist.) / alta (actual) | **actual 4/4 · histórico 2/6** — confirmado como el mayor riesgo |
| `nrg.electric_combined_kwh100` | 3 (BEV/PHEV) | 3/3 | 0 | media–alta | PHEV: etiquetado "ponderado" |
| `rng.electric_combined_km` | 3 | 3/3 | 0 | media–alta | PHEV: EAER vs AER no declarado |
| `bat.usable_kwh` | 3 | **1/3** | 1 | baja | fabricantes dan capacidad **sin tipo** |
| `chg.ac_max_kw` | 3 | 2/3 | 1 (DC-07) | media | Tesla 2021 sin fuente oficial |
| `chg.dc_max_kw` | 2 (BEV) | 1/2 | 1 (DC-07) | media | idem |
| `nrg.fuel_charge_sustaining_l100` | 1 (PHEV) | **0/1 (ES)** | — | baja | publicado en DE, no en ES |
| Rating de seguridad con protocolo | 10 | 9/10 | (DC-03 % secundarios) | alta | 3 ratings **caducados**; 1 derivado de gemelo (CUPRA); 1 sin rating |

**Por antigüedad**: variants 2018–2021 (DC-01, 03, 05, 07, 09) concentran casi todos los huecos; DC-03 (Golf 2018) es el caso extremo. Las variants actuales (DC-02, 04, 08, 10) tienen cobertura casi completa, salvo PHEV CS y plazas.

## 3. Hallazgos transversales

### Afectan al schema (requieren decisión / ADR)

**F1 — La homologación es la identidad técnica real.** El mismo nombre comercial esconde variants técnicamente distintas: Golf 2018 con dos homologaciones (NEDC puro vs WLTP + NEDC-correlated, masas distintas); X3 2018 cambia en 08/2018 de Euro 6/NEDC a Euro 6d-TEMP/NEDC-correlated (y depósito/remolque); León e-HYBRID con dos homologaciones en 18 meses; Tesla 2021 cambia autonomía, nombre, masa y precio a mitad de año y en EEA aparecen dos "SR+" distintos. → Propuesta: entidad **`homologation`** dentro de la Reference Variant (identificadores UE `TAN` / `Va` / `Ve` cuando existan, `valid_from` / `valid_to`, ciclo, norma de emisiones). Los valores técnicos cuelgan de la homologación; `model_year` queda como atributo comercial.

**F2 — Valores oficiales publicados como rango.** Consumo, CO₂, autonomía y hasta dimensiones vienen como min–max (por llanta o acabado). → `SourcedValue` admite `value_min` / `value_max` además de `value`, y la regla de qué valor usa cada engine va a metodología (ver D4).

**F3 — Bases de medida implícitas.** La misma cifra significa cosas distintas según la fuente: potencia de sistema vs térmica (IDAE en HEV), capacidad de batería bruta vs útil vs no especificada, radio vs diámetro de giro, masa (UE en orden de marcha, DIN, masa de ensayo WLTP `Mt`, no especificada), maletero (VDA vs no declarado), remolque (pendiente 12 % vs 8 %), ventana de carga DC (10–80 vs 30–80), consumo eléctrico con/sin pérdidas de carga, consumo PHEV ponderado vs puro, autonomía EAER vs AER. → Cada una de esas claves necesita un atributo obligatorio de **base** (`power_basis`, `capacity_basis`, `mass_definition`, `soc_from`/`soc_to`, `range_type`, `consumption_basis`…) con valor `unspecified` permitido.

**F4 — Powertrain de homologación ≠ powertrain comercial.** El Golf eTSI se vende como MHEV pero se homologa como **NOVC-HEV** (EEA `Fm = H`), y eso decide la etiqueta ECO y la fiscalidad. → Campo `homologation_powertrain` (`ICE` / `NOVC-HEV` / `OVC-HEV` / `BEV` / …) además de `powertrain_type`.

**F5 — Ratings de seguridad con estado.** Euro NCAP marca como **caducados** los ratings con más de ~6 años (RAV4 2019, X3 2017, Model 3 2019); hay ratings heredados de un gemelo (SEAT León ← CUPRA León), ensayos sobre una versión anterior (Seal pre-actualización) y modelos sin rating (RAV4 6.ª gen.). → `rating_status` (`valid` / `expired` / `not_rated` / `provisional`) y `tested_variant_note`.

**F6 — Precios en capas.** Lista, promoción, con incentivos (MOVES, Plan Auto+), financiado, península vs Canarias, impuestos incluidos o no declarados. → `price_basis`, `region`, `incl_taxes: yes/no/unknown`, y tabla separada **`incentives`**.

### Afectan al catálogo (v0.2)

**F7 — Ciclo no declarado.** La guía IDAE 2019 y otras fuentes de la transición no declaran el ciclo. → `test_cycle: UNDECLARED` + `test_cycle_inferred` con evidencia; permitir varios valores de la misma clave con ciclos distintos (WLTP + NEDC-correlated coexisten).

**F8 — Claves que faltan**: autonomía total PHEV, CO₂ con batería descargada (PHEV), maletero "hasta techo" (Toyota lo publica), capacidad y química de batería **HEV** (garantía de batería híbrida de 8–10 años es relevante para usados), tiempo DC con ventana de SoC.

**F9 — Aplicabilidad**: `bat.*` debe aplicar también a HEV (garantía, capacidad); `chg.dc_10_80_min` también a PHEV con DC; reglas de claves para MHEV.

**F10 — Enums insuficientes**: norma de emisiones con sufijos reales (`Euro 6`, `6d-TEMP`, `6d`, `6e`, `6e-bis`, `EA/EB`, `AP`) → enum jerárquico + texto original; CarPlay `standard_unspecified`; ADAS `optional_pack`; marchas `not_applicable` (e-CVT); estado de dato `provisional`.

**F11 — Año de modelo ambiguo en coches nuevos** (configurador VW en MY2027 mientras IDAE lista 2025 y 2026). → Para variants actuales, identificar por homologación + `price_list_date`, y guardar el `model_year` tal como lo declara cada fuente.

### Afectan a la estrategia de datos

**F12 — Cobertura anterior a 2019 mucho peor de lo supuesto** para specs de fabricante (DC-03: 4/13). La EEA sí cubre bien CO₂, masa, potencia, cilindrada, combustible e identificadores de homologación por matriculación; los catálogos de fabricante archivados (Wayback) cubren parte del resto, pero la herramienta de recopilación no siempre puede acceder a ellos. → Ver D3.

**F13 — PHEV *charge-sustaining* no publicado en España.** Solo SEAT Alemania lo publica (obligatorio allí). Con la regla actual "no copiar valores entre mercados", **Economy y Range nunca se activan para PHEV en ES**, justo el diferencial del producto. → Ver D1.

**F14 — Las fuentes oficiales tienen errores y contradicciones**: IDAE registra 85 kW para una versión de 110 kW; Toyota ES vs Toyota EU difieren en potencia, altura y CO₂; BYD da dos garantías de batería distintas en la misma página; Hyundai intercambia remolque con/sin freno y radio/diámetro. → El Conflict Engine y **reglas de plausibilidad** (rangos físicos, coherencia entre claves) son necesarios desde el primer import, no más adelante.

**F15 — Plazas**: 4/10 fichas oficiales españolas no las declaran. → Aceptar configurador/CoC/homologación como fuente (VERIFIED) o la EEA si la trae.

**F16 — Recalls**: Safety Gate y KBA bloquean el acceso automatizado; los recalls se identifican por **bastidor y fechas de producción**, no por año de modelo, y España a veces no figura como país que reacciona. → Tabla `recalls` con rango de producción; curación manual en Alpha; solo se muestra "recall publicado para esta generación — compruébalo".

**F17 — Etiqueta DGT**: casi siempre derivada por regla (combustible + norma + homologación HEV/OVC). → `emi.dgt_label_es` como CALCULATED con regla versionada; valor oficial por matrícula solo con la instancia usada (Later).

**F18 — Accesibilidad de fuentes**: la API SQL de EEA (discodata) funciona para consultas agregadas por homologación; los configuradores requieren navegador *headless*; Wayback y Safety Gate fallan a veces en automático. → Informa a los adapters y a la estimación de esfuerzo de curación.

## 4. Mapeos EEA observados (para DATA_RIGHTS_MATRIX §3.2)

Consultas en `discodata.eea.europa.eu` (tabla `[CO2Emission].[latest].[co2cars]` y provisionales por año). Nombres de campo **tal como aparecen en las consultas registradas en DC-03, DC-04 y DC-07**; confirmar contra la documentación del dataset antes de programar el adapter.

| SpecKey / campo VScar | `external_field` EEA | `transformation` | `granularity` | Nota |
|---|---|---|---|---|
| model (familia) | `Cn` | `mapping` | registration_record | nombre comercial normalizado |
| `fuel_type` | `Ft` | `mapping` | registration_record | |
| `homologation_powertrain` | `Fm` | `mapping` | registration_record | `H` = hybrid (NOVC) |
| `pt.displacement_cc` | `Ec (cm3)` | `identity` | registration_record | |
| `perf.power_max_kw` | `Ep (KW)` | `identity` | registration_record | **potencia térmica en HEV** — no usar como potencia de sistema |
| `emi.co2_combined_gkm` (NEDC) | `Enedc` | `identity` | registration_record | NEDC o NEDC-correlated: inferir por presencia de `Ewltp` |
| `emi.co2_combined_gkm` (WLTP) | `Ewltp` | `identity` | registration_record | |
| `dim.kerb_weight_kg` | `M` | `identity` | registration_record | masa en orden de marcha |
| masa de ensayo WLTP (nueva clave o nota) | `Mt` | `identity` | registration_record | **no** es MMA ni masa en orden de marcha |
| homologación (F1) | `TAN`, `Va`, `Ve` | `identity` | registration_record | número de homologación, variante, versión |
| `nrg.electric_combined_kwh100` | campo de consumo eléctrico (Wh/km) — *nombre exacto a confirmar* | `unit_conversion` (Wh/km → kWh/100 km) | registration_record | |

## 5. Decisiones D1–D5 — resueltas (2026-09-24)

| # | Decisión | Resolución | Implementación |
|---|---|---|---|
| **D1** | Reutilizar datos técnicos de homologación de otro mercado UE | **APPROVED WITH CONDITIONS** — solo con equivalencia técnica demostrable (preferencia: mismo `TAN` + `Va` + `Ve` o identificadores equivalentes). Campos `reference_market`, `source_market`, `cross_market`, `homologation_match` (`EXACT` → engines automáticos · `PARTIAL` → revisión humana obligatoria · `UNCONFIRMED` → no se usa en cálculos). Permitido: consumo, CO₂, autonomía, masas, batería, carga, potencia, prestaciones homologadas. No permitido automáticamente: precio, garantía, equipamiento, promociones, impuestos, incentivos, etiqueta DGT, elementos de mercado. `source_market` visible. | Catálogo v0.2 §3, §4, columna XM · ADR-009 |
| **D2** | Homologación como identidad técnica | **APPROVED** — se separan *commercial identity* y *technical identity*; nueva entidad `Homologation` (id, market_code, type_approval_number, variant_code, version_code, valid_from, valid_to, test_cycle, emissions_standard, homologation_powertrain, source_id, source_url; equivalentes del fabricante si no hay TAN/Va/Ve). Una denominación comercial puede producir varias ReferenceVariants técnicas. `model_year` = atributo comercial. | Catálogo v0.2 §2 · **ADR-007** |
| **D3** | Cobertura histórica | **APPROVED** — se aceptan PDFs/páginas oficiales archivadas, Wayback de páginas oficiales, EEA, IDAE, documentos de homologación, CoC, notas de prensa y tarifas oficiales archivadas (`archived`, `archive_url`, `original_url`). La copia conserva `source_authority` del original **sin derechos adicionales**. Prioridad: 2017–2026 alta · 2014–2016 selectiva · 2010–2013 oportunista. Sin promesa de cobertura uniforme desde 2010. | Catálogo v0.2 §6b, §17 · Matriz v0.2 · ADR-009 |
| **D4** | Rangos | **MODIFIED** — no se colapsan a un valor: `value = null` + `value_min`/`value_max` + `range_basis` si no se resuelve la configuración; valor específico si se conoce. Los engines propagan min/max y calculan ambos extremos: *RESULT STABLE ACROSS HOMOLOGATED RANGE* o *RESULT DEPENDS ON CONFIGURATION* (con Confidence reducida). `BASE` solo con metodología; extremo desfavorable **solo** en el escenario explícito `CONSERVATIVE`. | Catálogo v0.2 §3.5, §10 |
| **D5** | Plazas y datos estructurales | **APPROVED WITH SOURCE HIERARCHY** — CoC/homologación → fabricante del mercado → configurador oficial → organismo oficial → fabricante UE con misma homologación → secundaria (solo localizar/contrastar). Dimensiones independientes `source_authority` × `mapping_confidence`. | Catálogo v0.2 §3.2, §3.3, §6 |

Complementos aprobados junto a D1–D5: `source_authority` (`OFFICIAL_AUTHORITY`, `OFFICIAL_MANUFACTURER`, `VERIFIED_EDITORIAL`, `SECONDARY_REFERENCE`, `USER_PROVIDED`, `CALCULATED`, `ESTIMATED`; "oficial" ≠ correcto), `mapping_confidence`, `test_cycle = UNDECLARED` + inferencia con evidencia, bases de medida tipadas, `bat.capacity_kwh` con base `UNSPECIFIED`, `bat.*` en HEV/MHEV, `homologation_powertrain`, norma de emisiones abierta, `rating_status`, `price_basis`/`region`/`incl_taxes` + `incentives`, DGT `CALCULATED` versionada, **plausibilidad P0** (`PASS`/`WARNING`/`BLOCK`) y **Conflict Engine P0** multi-criterio, elegibilidad por variant y por categoría.

## 6. Cambios para SPEC_KEY_CATALOG v0.2 — Approved for SpecKey Catalog v0.2 implementation

Implementados en [SPEC_KEY_CATALOG v0.2](../SPEC_KEY_CATALOG.md) (ver *Changes v0.2*):

1. Entidad `Homologation` + separación commercial/technical identity — F1, F4 → §2.
2. `SourcedValue` v0.2 (rangos, `source_market`/`reference_market`, `source_authority`, `mapping_confidence`, `homologation_match`, `UNDECLARED` + `test_cycle_inferred` + `cycle_evidence`, `archived`, `provisional`, `measurement_basis`) — F2, F7, D1, D3, D5 → §3.
3. Bases de medida tipadas — F3 → §5.
4. Claves nuevas `rng.phev_total_km`, `emi.co2_charge_sustaining_gkm`, `cap.boot_roof_l`, `chg.dc_time_min` (ventana SoC), `bat.warranty_conditions`; `dim.test_mass_kg` **no** se crea: se usa `dim.mass_kg` + `mass_definition = WLTP_TEST_MASS` — F8.
5. `bat.capacity_kwh` + `battery_capacity_basis`; `bat.*` aplicable a HEV/MHEV; `gross/usable` como vistas — F9.
6. Enums: norma de emisiones family/level/raw; CarPlay `standard_unspecified`; ADAS `optional_pack`; `gears = not_applicable` — F10.
7. `safety_ratings.rating_status` + `tested_variant_note` + `tested_powertrain` + validez — F5.
8. `vehicle_prices.price_basis`, `region`, `incl_taxes`; tabla `incentives` — F6.
9. `emi.dgt_label_es` `CALCULATED` con `rule_version` + `rule_source_url` — F17.
10. Plausibilidad P0 y Conflict Engine P0 — F14.
11. Elegibilidad `vehicle_page` / `comparison_category` / `seo_comparison` — F12, D3.

Total SpecKeys: 88 → **90**.

## 7. Siguientes pasos

1. ~~Revisión y aprobación del schema v0.2~~ → **APPROVED** 2026-09-24.
2. **Revisión humana de los 10 ficheros DC** con las reglas v0.2: reclasificar `source_authority`/`mapping_confidence`, convertir rangos, marcar ciclos `UNDECLARED`, identificar homologaciones (EEA `TAN`/`Va`/`Ve`) y dividir variants si procede (Golf 2018, X3 2018); resolver conflictos (depósito X3, CO₂ Golf, garantías BYD, ES vs EU Toyota); cubrir huecos manualmente (precios RAV4 2021 y Tucson 2023 en tarifas archivadas; CS del León vía D1 con `homologation_match`).
3. Verificación de derechos por fuente (DATA_RIGHTS_MATRIX §6).
4. **Step 3 (scaffold)**: desbloqueado tras la aprobación de v0.2 (2026-09-24).

No se hace todavía: importar los DC a MySQL, migraciones, adapters productivos, ampliar a 50–80 variants, contratar proveedores, publicar datos, Decision Engine ni frontend.

## Schema v0.2 Readiness

```text
Dataset Core schema validation: COMPLETE
Human curation review:          PENDING
Schema v0.2:                    APPROVED
Data rights verification:       IN PROGRESS
Ready for Step 3 scaffold:      YES
```

**Aprobado 2026-09-24**: schema v0.2 aprobado para Step 3 (sin contradicciones estructurales bloqueantes). Separación explícita:

```text
Schema ready for code           ✅
Dataset ready for publication   ❌
Legal rights complete           ❌
```

La revisión humana de los DC y la verificación de derechos continúan en paralelo; no bloquean el código, sí la importación productiva y la publicación de datos.
