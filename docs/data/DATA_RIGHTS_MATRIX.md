# VScar — Data Rights Matrix v0.2

> Estado: **DRAFT v0.2 — verificación de términos y jurídica en curso** · Fecha: 2026-09-24
> Baseline: [VSCAR_MASTER_PLAN.md v1.0](../VSCAR_MASTER_PLAN.md) (§10, §10.1, §33.2) · Decisiones: [ADR-009](../adr/ADR-009-data-provider-rights.md) · [ADR-007](../adr/ADR-007-reference-vs-used-instance.md)
> Relacionado: [SPEC_KEY_CATALOG.md v0.2](SPEC_KEY_CATALOG.md) · Evidencia: [Dataset Core v0.1 — FINDINGS](dataset-core-v0.1/FINDINGS.md)
> Propietario: data workstream · Revisión legal: requerida antes de publicar datos de cada fuente.

## Changes v0.2

- **Cobertura observada** del Dataset Core v0.1 (`observed_coverage`, `sample_size`) junto a la **hipótesis original** (`expected_coverage`), que se conserva.
- Columnas de mapeo para adapters: `external_field`, `transformation`, `transformation_version`, `granularity`.
- **Cross-market** (D1): `source_market`, soporte cross-market por fuente, `homologation_match`.
- **Fuentes archivadas** (D3): derechos de la copia archivada ≠ derechos adicionales; se evalúan los del original.
- Mapeos EEA observados (`Cn`, `Ft`, `Fm`, `Ec`, `Ep`, `Enedc`, `Ewltp`, `M`, `Mt`, `TAN`, `Va`, `Ve`) — **pendientes de confirmar contra la documentación oficial**.
- Accesibilidad observada por fuente (API, headless, bloqueos).
- **Ningún derecho se ha marcado como verificado**: todos siguen `❓`.

> ⚠️ **Nada de este documento es una conclusión legal.** Las columnas de derechos parten en `❓` y solo pasan a `✅`/`⚠️`/`❌` cuando alguien ha leído los términos vigentes, ha registrado su URL, la fecha de revisión y el revisor, y (cuando proceda) asesoría legal lo ha validado. `expected_coverage` son hipótesis; `observed_coverage` procede de una muestra de 10 variants **sin revisión humana**.

---

## 1. Leyenda

| Símbolo | Significado |
|---|---|
| ✅ | Permitido — verificado (URL de términos + fecha + revisor) |
| ⚠️ | Permitido con condiciones — detallar |
| ❌ | No permitido |
| ❓ | Pendiente de verificar |
| — | No aplica |

**Derechos por fuente**: `can_store` (almacenar) · `can_republish` (mostrar tal cual) · `can_commercial` (sitio con publicidad/afiliación) · `can_derive` (calcular y publicar derivados) · `attribution` · `refresh` · `cost`.

**Fuentes archivadas (D3)**: una copia (Wayback, PDF archivado) de contenido oficial conserva la `source_authority` del original **pero no otorga derechos adicionales**. Se evalúan los derechos de la **fuente original**; la columna `archive_access` solo indica si el archivo es accesible. Datos guardados con `archived = true`, `archive_url`, `original_url`.

**Cross-market (D1)**: un dato técnico de homologación publicado en otro mercado UE solo alimenta engines con `homologation_match = EXACT` (mismo TAN/Va/Ve o equivalente); `PARTIAL` requiere revisión humana; `UNCONFIRMED` no se usa. Nunca para precio, garantía, equipamiento, promociones, impuestos, incentivos ni etiqueta DGT. `source_market` visible.

**Cobertura**: por periodo `2010–14` · `2015–19` · `2020–23` · `2024+`. Para cada pareja SpecKey × fuente: `expected_coverage` (hipótesis) · `observed_coverage` (x/n) · `sample_size`.

**Granularidad** (`granularity`): `market` · `model` · `generation` · `engine` · `trim` · `registration_record` · `homologation`. Un dato de nivel superior no se atribuye inequívocamente a un trim (se refleja en `mapping_confidence`).

**`transformation`**: `identity` · `unit_conversion` · `derived` (→ `CALCULATED`) · `mapping` (códigos → enums VScar) · `manual` (curador desde documento). `transformation_version` se incrementa al cambiar la regla; los valores guardan la versión aplicada.

---

## 2. Registro de fuentes

### 2.1 Fuentes Alpha (free/public first)

| ID | Fuente | Titular | `source_authority` | Uso en VScar | Acceso observado | Términos (URL a registrar) | store | republish | commercial | derive | Atribución | Cross-market | Archivo | Refresh | Coste |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S01 | EEA — CO₂ emissions from new passenger cars | Agencia Europea de Medio Ambiente (datos: DG CLIMA) | OFFICIAL_AUTHORITY | CO₂ (NEDC/WLTP), masas, potencia, cilindrada, batalla, consumo eléctrico, autonomía eléctrica, combustible, **identificadores de homologación** por matriculación UE desde 2010 | ✅ API SQL `discodata.eea.europa.eu` (consultas agregadas en servidor; adapter v0.1 operativo) | [metadatos oficiales](https://sdi.eea.europa.eu/catalogue/srv/api/records/992616f8-158f-4ecc-b978-814b81629db6?language=eng): **CC BY 4.0** | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ obligatoria: «European Environment Agency (EEA) — datos: DG CLIMA», CC BY 4.0 | ✅ fuente para **matching de homologación** entre mercados | — | anual (+ provisional) | 0 € |
| S02 | IDAE — base de consumo y emisiones | IDAE | OFFICIAL_AUTHORITY | consumo y CO₂ oficiales por versión ES | ✅ web | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | — (ES) | — | periódica | 0 € |
| S03 | MITECO — Geoportal gasolineras | Ministerio para la Transición Ecológica y el Reto Demográfico | OFFICIAL_AUTHORITY | precio combustible (PVP con impuestos, por estación) → medianas por zona fiscal / CCAA / provincia | ✅ API REST `sedeaplicaciones.minetur.gob.es` (sin token; histórico diario desde 2007; adapter v0.1 operativo) | [ficha del dataset](https://catalogo.datosabiertos.miteco.gob.es/catalogo/es/dataset/214e0895-b3aa-4662-8ebe-18134c21fb45): **CC BY 4.0** | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ obligatoria: «Ministerio para la Transición Ecológica y el Reto Demográfico — Geoportal de gasolineras», CC BY 4.0 | — (ES) | — | diario (histórico: día anterior) | 0 € |
| S04 | REE — ESIOS (PVPC) | Red Eléctrica de España (operador del sistema) | OFFICIAL_AUTHORITY | precio de **referencia** de electricidad: término de energía del PVPC 2.0TD (horario → media diaria) por zona tarifaria | ✅ `api.esios.ree.es/archives/70/download_json` **sin token** (verificado: un token inválido se ignora); `indicators/*` exige token (403) | ❓ términos propios de ESIOS no localizados (página renderizada por JS). [Aviso legal de ree.es](https://www.ree.es/en/legal-notice-privacy-policy): copia privada y uso informativo **no comercial** citando fuente y fecha; resto de reutilización y uso comercial **prohibido sin autorización escrita** | ⚠️ | ❓ | ❓ (riesgo ❌ si aplica el aviso legal de ree.es) | ❓ | ⚠️ obligatoria según ree.es: «Red Eléctrica — e·sios» + fecha de actualización | — (ES) | — | diario (D se publica en D-1 ~20:15) | 0 € |
| S05 | Euro NCAP | Euro NCAP | VERIFIED_EDITORIAL | estrellas, %, año, protocolo, **estado (caducado)** | ✅ web; algunas páginas antiguas 404 | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ — logos/material gráfico: asumir ❌ salvo licencia | ✅ (el rating es del modelo ensayado, no del mercado) | páginas antiguas: Wayback | por test | 0 € |
| S06 | EU Safety Gate | Comisión Europea | OFFICIAL_AUTHORITY | recalls/alertas (por bastidor y fechas de producción) | ⚠️ bloquea acceso automatizado → curación manual | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ✅ (alerta UE) | — | semanal | 0 € |
| S07 | DGT — clasificación ambiental y estadísticas | DGT | OFFICIAL_AUTHORITY | **reglas** de etiqueta ambiental; estadísticas agregadas | ✅ web | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | — | — | mensual | 0 € |
| S08 | Fabricante — mercado ES (fichas, catálogos, tarifas, configurador, prensa) | Cada fabricante | OFFICIAL_MANUFACTURER | specs de trim, precios, garantías, equipamiento, mantenimiento | ✅ web/PDF; configuradores requieren navegador headless | ❓ por fabricante | ❓ | ❓ | ❓ | ❓ | ❓ | — (mercado propio) | ✅ Wayback (acceso intermitente) | por evento | 0 € |
| S08-EU | Fabricante — otro mercado UE (mismo fabricante) | Cada fabricante | OFFICIAL_MANUFACTURER | **datos técnicos de homologación** no publicados en ES (p. ej. consumo CS del PHEV en DE) | ✅ web | ❓ por fabricante y país | ❓ | ❓ | ❓ | ❓ | ❓ | ✅ **solo técnico** con `homologation_match` (EXACT automático; PARTIAL revisión) | ✅ Wayback | por evento | 0 € |
| S09 | Estadísticas sectoriales (ANFAC, Ganvam) | Asociaciones | OFFICIAL_AUTHORITY *(uso interno)* | priorización de familias | (no probado) | ❓ | ❓ (uso interno) | — | ❓ | — | ❓ | — | — | mensual | 0 € |
| S10 | CoC / documentos de homologación | Fabricante / homologador | OFFICIAL_AUTHORITY | plazas, masas, dimensiones, identificadores (jerarquía D5 nº 1) | (no probado; acceso por documento) | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ✅ (homologación UE) | — | por documento | 0 € |

### 2.2 Fuentes US (solo dataset de test en Alpha)

| ID | Fuente | Titular | `source_authority` | Uso | Términos | store | republish | commercial | derive | Atribución | Refresh | Coste |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S20 | EPA — fueleconomy.gov | US EPA / DOE | OFFICIAL_AUTHORITY | MPG, MPGe, autonomía EV (histórico) | ❓ (probable dominio público — verificar) | ❓ | ❓ | ❓ | ❓ | ❓ | continua | 0 € |
| S21 | NHTSA — vPIC | NHTSA | OFFICIAL_AUTHORITY | taxonomía/decodificación | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | continua | 0 € |
| S22 | NHTSA — NCAP y Recalls | NHTSA | OFFICIAL_AUTHORITY | seguridad y recalls US | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | continua | 0 € |
| S23 | EIA — Open Data | US EIA | OFFICIAL_AUTHORITY | precios energía | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | semanal | 0 € |

### 2.3 Fuentes secundarias (`SECONDARY_REFERENCE`)

km77, ultimatespecs, auto-data, ev-database (sin licencia), car-recalls.eu, prensa sin medición propia. **No publicables como dato primario en Alpha ni alimentan engines públicos.** Uso permitido: localizar fuentes oficiales, detectar conflictos, QA, validar plausibilidad. Sin extracción masiva (derecho *sui generis* de bases de datos UE).

### 2.4 Proveedores comerciales — solo evaluación (no se contratan en Alpha)

Contratar solo si esta matriz demuestra un **bloqueo crítico**, mediante ADR.

| ID | Proveedor | Cubriría (huecos observados en Dataset Core) | Mercados | Presupuesto | Estado |
|---|---|---|---|---|---|
| C01 | JATO Dynamics | specs y **precios históricos** (hueco nº 1) | multimercado | ❓ | no solicitado |
| C02 | J.D. Power / Chrome Data | specs, precios, residuales (US) | US | ❓ | no solicitado |
| C03 | DataForce | specs y precios EU | EU | ❓ | no solicitado |
| C04 | Autovista / Eurotax / Schwacke | residuales y valor de usados EU | EU | ❓ | no solicitado |
| C05 | Ganvam (valoración) | valor de usados ES | ES | ❓ | no solicitado |
| C06 | HaynesPro / Autodata (TecRMI) | mantenimiento | EU | ❓ | no solicitado |
| C07 | EV Database (licencia comercial) | **batería útil**, carga (hueco observado en BEV) | EU | ❓ | no solicitado |
| C08 | CarAPI / CarQuery y similares | specs genéricas | varios | ❓ | no solicitado |

**Excluidas**: marketplaces y portales de anuncios (AutoScout24, coches.net, mobile.de, AutoTrader…) — **sin scraping**; solo API/partnership/feed licenciado en fases posteriores. IA — nunca fuente primaria.

---

## 3. Cobertura: esperada vs observada (claves críticas)

Muestra: **Dataset Core v0.1, n = 10** (ES). Reparto por periodo: 2010–14 **n = 0** · 2015–19 **n = 3** (DC-03, 05, 09) · 2020–23 **n = 3** (DC-01, 06, 07) · 2024+ **n = 4** (DC-02, 04, 08, 10). Cuenta "observada" = valor con fuente `OFFICIAL_*` o `VERIFIED_EDITORIAL` utilizable (no `SECONDARY_REFERENCE`). Recuento a partir de los ficheros DC, **sin revisión humana**; los tamaños de muestra por periodo son muy pequeños y solo sirven para orientar.

| SpecKey | Fuente principal | Alternativa | `expected_coverage` (10–14 / 15–19 / 20–23 / 24+) | `observed_coverage` 15–19 | 20–23 | 24+ | Total observado | Aprendizaje |
|---|---|---|---|---|---|---|---|---|
| `nrg.fuel_combined_l100` | S02 IDAE / S08 | S01 (solo con metodología) | media / media / alta / alta | 2/3 | 2/2 | 2/2 | 6/7 | mejor de lo esperado; valores en **rango**; ciclo a veces `UNDECLARED` |
| `nrg.fuel_charge_sustaining_l100` | S08 | **S08-EU** | nula-baja / baja / media / media | — | — | 0/1 (ES) · 1/1 (DE, match por confirmar) | 0/1 | **no se publica en ES**; cross-market imprescindible |
| `nrg.electric_combined_kwh100` | S01 / S08 | S02 | baja / media / alta / alta | — | 1/1 | 2/2 | 3/3 | PHEV etiquetado "ponderado"; pérdidas de carga no declaradas |
| `rng.electric_combined_km` | S08 | S02 | baja / media / alta / alta | — | 1/1 | 2/2 | 3/3 | EAER vs AER no declarado |
| `pt.fuel_tank_l` | S08 | S10 | media / media / alta / alta | 2/3 | 2/2 | 3/3 | 7/8 | conflicto interno de fabricante (60 vs 68 L) |
| `bat.capacity_kwh` (cualquier base) | S08 | C07 | baja / baja / media / media | — | 1/1 | 2/2 | 3/3 | pero con base `USABLE` solo **1/3** → peor de lo esperado para Range |
| `chg.ac_max_kw` | S08 | C07 | baja / media / alta / alta | — | 0/1 | 2/2 | 2/3 | Tesla 2021 sin fuente oficial |
| `chg.dc_max_kw` (BEV) | S08 | C07 | baja / media / alta / alta | — | 0/1 | 1/1 | 1/2 | idem |
| `perf.power_max_kw` | S01 / S08 | S02 | alta / alta / alta / alta | 3/3 | 3/3 | 4/4 | 10/10 | S01/S02 dan potencia **térmica** en HEV → `power_basis` |
| `perf.accel_0_100_s` | S08 | — | media / media / alta / alta | 1/3 | 3/3 | 4/4 | 8/10 | los antiguos fallan |
| `dim.length/width/height_mm` | S08 | S10 | alta / alta / alta / alta | 2/3 | 3/3 | 4/4 | 9/10 | valores en rango (altura) |
| `cap.boot_l` | S08 | — | alta / alta / alta / alta | 2/3 | 3/3 | 4/4 | 9/10 | `boot_method` casi nunca declarado |
| `seats` (estructural) | S10 / S08 | S01? | (no evaluada) | 1/3 | 3/3 | 2/4 | **6/10** | **sorpresa**: fichas ES no lo declaran → jerarquía D5 |
| `emi.co2_combined_gkm` | S01 / S02 | S08 | alta / alta / alta / alta | 3/3 | 3/3 | 4/4 | 10/10 | ✓ |
| `emi.dgt_label_es` | S07 (regla) | S08 | alta / alta / alta / alta | 3/3 | 3/3 | 4/4 | 10/10 | casi siempre `CALCULATED` por regla |
| `war.years` | S08 | — | media / media / alta / alta | 3/3 | 3/3 | 4/4 | 10/10 | km a menudo no declarados |
| Precio `original_list` / `current_new` (`LIST`) | S08 (archivado) | C01, C03 | **baja** / media / alta / alta | 1/3 | 1/3 | 4/4 | 6/10 | **histórico 2/6** — mayor riesgo confirmado; `incl_taxes` a menudo `UNKNOWN` |
| Rating de seguridad (+ protocolo/año) | S05 | — | alta / alta / alta / media | 3/3 (1 con % secundarios) | 3/3 | 3/4 | 9/10 | 3 `EXPIRED`; 1 heredado de gemelo; 1 `NOT_RATED` |

Periodo 2010–14: sin observaciones (n = 0); se mantienen solo las hipótesis. Estrategia D3: 2017–2026 alta · 2014–2016 selectiva · 2010–2013 oportunista.

---

## 4. Mapeo SpecKey × fuente (especificación de adapters)

### 4.1 EEA (S01) — campos observados

Consultas en `discodata.eea.europa.eu`, tabla `[CO2Emission].[latest].[co2cars]` (y tablas provisionales por año, p. ej. `co2cars_2025Pv31`). Campos tal como aparecen en las consultas de DC-03, DC-04 y DC-07.

> ✅ **Confirmado (2026-09-24)** contra la definición de tabla oficial ([Table-definition-CO2-emissions-from-cars2024.xlsx](https://sdi.eea.europa.eu/catalogue/srv/api/records/992616f8-158f-4ecc-b978-814b81629db6/attachments/Table-definition-CO2-emissions-from-cars2024.xlsx), datos 2022) y contra respuestas reales de discodata. Implementado en `packages/data-connectors/src/eea/` (adapter v0.1, `transformation_version` 1).
>
> Hallazgos que el adapter trata: `[latest].[co2cars]` mezcla filas P y F del mismo año (se usan F); mayúsculas inconsistentes (`E1*`/`e1*`, `PETROL`/`Petrol`); varias versiones (`Ve`) por TAN/Va con valores distintos; `[latest].[co2cars]` solo llega a 2022 (años recientes en otras tablas); `Enedc` no figura en la definición 2022; `Fm = P` (plug-in) y `H` observados en datos pero no listados en la definición; en 2021 ES hay PHEV con `Fm` M y P a la vez.

**Mapeo implementado (v1)** — definiciones oficiales literales:

| `external_field` | Definición oficial | SpecKey / campo | Transformación | Base / ciclo | Notas |
|---|---|---|---|---|---|
| `TAN`, `Va`, `Ve` | Type approval number / Variant / Version | `Homologation.type_approval_number/variant_code/version_code` | `identity` (mayúsculas) | — | clave del emparejamiento; sin `Ve` → `TAN_VA` (INFERRED si 1 versión, UNCONFIRMED si varias) |
| `Ft`, `Fm` | Fuel type / Fuel mode | `fuel_type`, `homologation_powertrain` | `mapping` | E→BEV · P→OVC_HEV · H→NOVC_HEV · M/B/F→ICE | combinaciones incoherentes → UNKNOWN |
| `Ewltp (g/km)` | Specific CO2 Emissions (WLTP) | `emi.co2_combined_gkm` | `identity` | WLTP | |
| `Enedc (g/km)` | (NEDC, datos ≤ 2020) | `emi.co2_combined_gkm` | `identity` | NEDC; con `Ewltp` presente → `UNDECLARED` + inferido `NEDC_CORRELATED` | |
| `M (kg)` | Mass in running order Completed/complete vehicle | `dim.mass_kg` | `identity` | `EU_RUNNING_ORDER` | |
| `Mt` | WLTP test mass | `dim.mass_kg` | `identity` | `WLTP_TEST_MASS` | nunca masa en orden de marcha |
| `W (mm)` | Wheel Base | `dim.wheelbase_mm` | `identity` | — | |
| `Ec (cm3)` | Engine capacity | `pt.displacement_cc` | `identity` | — | ICE/HEV/PHEV |
| `Ep (KW)` | Engine power | ICE → `perf.power_max_kw` (`ICE_ONLY`) · HEV/PHEV → `perf.power_ice_kw` · BEV → `perf.power_electric_kw` | `identity` | — | nunca potencia de sistema en híbridos |
| `Z (Wh/km)` | Electric energy consumption | `nrg.electric_combined_kwh100` | `unit_conversion` (÷10) | ciclo `UNDECLARED` (inferido WLTP si hay `Ewltp`); BEV `COMBINED`, PHEV `UNSPECIFIED`; pérdidas `UNSPECIFIED` | |
| `Zr` | Electric range | `rng.electric_combined_km` | `identity` | ídem ciclo; BEV `WLTP_COMBINED` si WLTP, PHEV `UNSPECIFIED` | Model 3 2021: EEA 440 km vs IDAE 448 km → conflicto real |
| `Fc` | Fuel consumption | ICE/HEV → `nrg.fuel_combined_l100` · PHEV → `nrg.phev_weighted_fuel_l100` (INFERRED) | `identity` | ciclo `UNDECLARED` | base no declarada en la definición |
| `R`, `Dr`, `Status`, `Year`, `MS` | registrations / registration date / P-F / year / member state | notas del valor, `provisional`, `source_market` | — | — | `Dr` es fecha de matriculación, **no** validez de la homologación |

**Mapeo v2 (Step 4c, adapter 0.2.0, `transformation_version` 2)** — cambios sobre v1:

| Cambio | Motivo |
|---|---|
| `Zr` → `rng.electric_combined_km` con `range_type = UNSPECIFIED` en todos los powertrains | la definición oficial solo dice "Electric range"; no declara si es combinada, urbana ni EAER/AER → no se afirma `WLTP_COMBINED` |
| `TAN_VA` sin `Ve` en el mismo mercado → `mapping_confidence = UNCONFIRMED` siempre (antes INFERRED con 1 versión) | PARTIAL nunca se promueve automáticamente; una única versión observada no prueba que sea la del trim |
| Casing: matching sobre valores normalizados (mayúsculas); original en `type_approval_number_raw`, `fuel_types_raw` | `E1*`/`e1*`, `PETROL`/`Petrol` en los mismos datos |

**Registro de tablas EEA** (`EEA_REGISTRY_VERSION = 2026-09-24`, verificado con `discodata` el 2026-09-24; `packages/data-connectors/src/eea/resolver.ts`):

| Años | Tabla FINAL | Tabla PROVISIONAL | Nota |
|---|---|---|---|
| 2010–2021 | `[latest].[co2cars]` + `Status='F'` | `[latest].[co2cars]` + `Status='P'` | la tabla mezcla F y P del mismo año → filtro obligatorio |
| 2022 | `co2cars_2022Fv26` | `co2cars_2022Pv25` | |
| 2023 | `co2cars_2023Fv28` | `co2cars_2023Pv27` | |
| 2024 | `co2cars_2024Fv30` | `co2cars_2024Pv29` | |
| 2025 | — | `co2cars_2025Pv31` | solo provisional a la fecha |

Resolución: FINAL preferido; PROVISIONAL solo si se pide o si no existe FINAL (`FINAL_OR_PROVISIONAL`); nunca se mezclan ambos en un import (sin doble conteo). Tablas nuevas → actualizar el registro (y su versión) tras verificarlas; el resolver no las adivina.

**IDAE (S02) — hecho nuevo**: en las fichas IDAE de BYD SEAL (606454 Design, y Comfort/Excellence), el código publicado ("SE2R1C/2NTE5F002NL1") coincide carácter a carácter con `Va`/`Ve` de la EEA → cuando IDAE publica ese código, es evidencia oficial de Va/Ve. En las fichas consultadas de Toyota, VW, Tesla, SEAT y Hyundai no aparece ([HOMOLOGATION_MATCH_REPORT](HOMOLOGATION_MATCH_REPORT.md)).

Tabla anterior (observaciones de Dataset Core, se conserva como evidencia):

| Campo VScar | `external_field` | `transformation` | `transformation_version` | `granularity` | Ciclo | `expected_coverage` | `observed_coverage` | `sample_size` | Notas |
|---|---|---|---|---|---|---|---|---|---|
| familia (commercial) | `Cn` | `mapping` | 1 | registration_record | — | alta | 3/3 consultadas | 3 | nombre comercial a normalizar |
| `fuel_type` | `Ft` | `mapping` | 1 | registration_record | — | alta | 3/3 | 3 | |
| `homologation_powertrain` | `Fm` | `mapping` | 1 | registration_record | — | alta | 3/3 | 3 | `H` = híbrido no enchufable (NOVC) |
| `pt.displacement_cc` | `Ec (cm3)` | `identity` | 1 | registration_record | — | alta | 2/2 (ICE/HEV) | 2 | |
| `perf.power_max_kw` | `Ep (KW)` | `identity` | 1 | registration_record | — | alta | 3/3 | 3 | `power_basis = ICE_ONLY` en HEV/PHEV; `SYSTEM` solo en ICE puro/BEV tras verificar |
| `emi.co2_combined_gkm` (NEDC) | `Enedc` | `identity` | 1 | registration_record | NEDC / NEDC_CORRELATED | alta | 1/1 (2018) | 1 | ciclo inferido por presencia de `Ewltp` → `test_cycle_inferred` + `cycle_evidence` |
| `emi.co2_combined_gkm` (WLTP) | `Ewltp` | `identity` | 1 | registration_record | WLTP | alta | 3/3 | 3 | |
| `dim.mass_kg` | `M` | `identity` | 1 | registration_record | — | alta | 2/2 | 2 | `mass_definition = EU_RUNNING_ORDER` (a confirmar) |
| `dim.mass_kg` | `Mt` | `identity` | 1 | registration_record | — | alta | 1/1 | 1 | `mass_definition = WLTP_TEST_MASS`; **nunca** como masa en orden de marcha ni MMA |
| `Homologation.type_approval_number` | `TAN` | `identity` | 1 | homologation | — | alta | 2/2 | 2 | clave del matching cross-market |
| `Homologation.variant_code` | `Va` | `identity` | 1 | homologation | — | alta | 2/2 | 2 | |
| `Homologation.version_code` | `Ve` | `identity` | 1 | homologation | — | alta | 2/2 | 2 | |
| `nrg.electric_combined_kwh100` | *campo de consumo eléctrico (Wh/km) — nombre exacto no verificado* | `unit_conversion` (Wh/km → kWh/100 km) | 1 | registration_record | WLTP | media | 1/1 | 1 | **no asumir nombre hasta verificar** |

### 4.2 MITECO (S03) — precios de carburantes

Verificado 2026-09-24 contra respuestas reales (`EstacionesTerrestresHist/{dd-MM-yyyy}` y `Listados/*`). Implementado en `packages/data-connectors/src/miteco/` (adapter 0.1.0, `transformation_version` 1).

| `external_field` | Producto / campo VScar | Transformación | Notas |
|---|---|---|---|
| `Precio Gasolina 95 E5` | `PETROL_95_E5` | `derived` (mediana) | €/L, decimal con coma; `""` = no vende (nunca 0) |
| `Precio Gasolina 95 E10` | `PETROL_95_E10` | `derived` | pocas estaciones |
| `Precio Gasolina 98 E5` | `PETROL_98_E5` | `derived` | |
| `Precio Gasoleo A` | `DIESEL_A` | `derived` | |
| `Precio Gasoleo Premium` | `DIESEL_A_PREMIUM` | `derived` | |
| `Precio Gases licuados del petróleo` | `LPG` | `derived` | €/L |
| `Precio Gas Natural Comprimido/Licuado`, `Precio Hidrogeno`, biocarburantes | — | no mapeado | venta por kg o sin uso Alpha; unidad sin verificar |
| `Tipo Venta` | — | filtro | solo `P` (público); `R` (restringido) se excluye y se cuenta |
| `IDCCAA` | `REGION` (ISO 3166-2) + `TAX_ZONE` | `mapping` | **ids MITECO ≠ códigos INE de CCAA** (07/08 intercambiados); contrastado con `Listados/ComunidadesAutonomas` |
| `IDProvincia` | `PROVINCE` | `identity` | = código INE de provincia |
| `Fecha` | `observed_at` (hora peninsular) | `mapping` | histórico: precios en vigor a las 0:00 del día |

Hallazgos que el adapter trata:
- **Zonas fiscales**: Canarias ~0,3–0,45 €/L más barata; Ceuta y Melilla también difieren. Nunca existe un agregado "ES" mezclado: `PENINSULA_BALEARES`, `CANARIAS`, `CEUTA`, `MELILLA` por separado.
- **Sin volúmenes**: la fuente no publica litros vendidos → mediana **sin ponderar** por estación (`UNWEIGHTED_STATION_MEDIAN`), con p25/p75/min/max y `n`. No equivale al precio medio ponderado de los boletines oficiales.
- Precio **PVP con impuestos** ([FAQ MITECO](https://www.miteco.gob.es/en/energia/hidrocarburos-nuevos-combustibles/petroleo/faqs.html), Orden ITC/2308/2007).
- El publicador califica los datos como **provisionales** → `provisional = true`.
- El histórico es determinista (misma fecha → mismo SHA-256) y llega solo hasta **ayer**; una fecha posterior devuelve error → job `DEAD`, no reintento.
- Un import de un subconjunto de provincias solo produce agregados `PROVINCE` (una mediana de zona con parte de sus provincias sería falsa).

### 4.3 ESIOS (S04) — PVPC (precio de referencia de electricidad)

Verificado 2026-09-24/25 con respuestas reales del archivo 70 (`archives/70/download_json?locale=es&date=YYYY-MM-DD`). Implementado en `packages/data-connectors/src/esios/` (adapter 0.1.0, `transformation_version` 1).

| `external_field` | Campo VScar | Transformación | Notas |
|---|---|---|---|
| `PCB` | `ELECTRICITY` · `TARIFF_ZONE` `PENINSULA_CANARIAS_BALEARES` | `unit_conversion` (€/MWh ÷ 1000) + `derived` (media aritmética de las horas) | €/MWh con coma decimal (2 decimales) |
| `CYM` | `ELECTRICITY` · `TARIFF_ZONE` `CEUTA_MELILLA` | ídem | difiere de PCB en algunas horas (p. ej. 24-09-2026 10–11 h: 185,62 vs 116,33 €/MWh) |
| `Dia`, `Hora` | `price_date`; instante UTC de cada hora por **posición** en el día local | `mapping` | `Hora` no es hora de reloj: el día de 25 h va de "00-01" a "24-25"; el de 23 h salta "02-03" |
| `PMH`, `SAH`, `TEU`, `CCV`, `TAH`, `COF2TD`… | — | no mapeado | componentes del término de energía y coeficientes de perfil; se conservan en el bruto |

Qué es y qué no es el valor (`price_basis = PVPC_ENERGY_TERM`):
- Término de energía del PVPC 2.0TD: coste de la energía + peajes y cargos del término de energía (RD 216/2014, arts. 7–8).
- **Excluye impuestos, recargos y gravámenes** (IEE, IVA) — RD 216/2014, art. 7.6 ([BOE](https://www.boe.es/buscar/act.php?id=BOE-A-2014-3376)) → `taxes = EXCLUDED`. **Excluye el término de potencia.**
- Es una **referencia** regulada, no la tarifa del usuario (buena parte de los hogares está en mercado libre). Media aritmética horaria sin perfil de consumo (`HOURLY_ARITHMETIC_MEAN`); no representa una factura. No se construye factura en Alpha.
- Formato 2.0TD desde 2021-06-01 (antes 2.0A: `GEN`/`NOC`/`VHC`, no soportado). Día no publicado: HTTP 200 con `{"message":"No values for specified archive"}` → `NOT_AVAILABLE_YET`.
- Días de 23 h y 25 h: se valida que el número de filas coincide con las horas del día local en Europe/Madrid; un día incompleto o una hora ilegible no produce media (nunca se promedia una parte del día).

### 4.4 Otras fuentes (a completar en la revisión de curación)

| SpecKey | Fuente | `external_field` | `transformation` | `granularity` | Notas |
|---|---|---|---|---|---|
| consumos/CO₂ | S02 IDAE | etiquetas de la ficha IDAE (p. ej. "Potencia", "Emisiones según ciclo WLTP") | `manual` / `unit_conversion` | engine / trim | "Potencia" en HEV = térmica; errores observados (85 kW vs 110 kW) → plausibilidad |
| specs de trim | S08 configurador | campos del configurador (headless) | `manual` | trim | `mapping_confidence = EXACT` cuando el trim coincide |
| specs de gama | S08 catálogo PDF | tabla técnica | `manual` | generation / engine | `GENERATION_LEVEL` / `POWERTRAIN_LEVEL` |
| consumo CS PHEV | S08-EU | ficha del otro mercado | `manual` | engine | requiere `homologation_match` |
| seguridad | S05 | página del modelo | `manual` | generation | `rating_status`, `tested_variant_note` |

---

## 5. Gate de Alpha (§10.1 del plan) — revisado con D3

Elegibilidad **por variant y por categoría** (SPEC_KEY_CATALOG §8), no 90 % global.

| Condición | Estado |
|---|---|
| Para cada categoría Alpha, claves críticas disponibles en las variants que se quieran comparar (cobertura medida sobre 50–80 variants cuando existan) | ❓ (Dataset Core: ver §3) |
| Derechos `store + republish + commercial + derive` confirmados para cada fuente que alimenta datos publicados, o curación manual con fuente citada aprobada | ❓ |
| Fuentes archivadas: derechos del **original** verificados | ❓ |
| Cross-market: solo `EXACT` automático; `PARTIAL` revisado | regla aprobada (D1); aplicación ❓ |
| Revisión legal: Euro NCAP, ToS de fabricantes (ES y otros mercados UE usados) | ❓ |
| Ninguna API comercial necesaria (o bloqueo crítico documentado en ADR) | ❓ — candidatos a bloqueo: precios históricos (C01/C03), batería útil (C07) |

---

## 6. Plan de trabajo siguiente

1. Registrar la **URL de términos vigente**, fecha y revisor para S01–S10 y S20–S23; rellenar derechos. Prioridad legal: S05 Euro NCAP, S08/S08-EU fabricantes, S01 EEA.
2. ~~Confirmar los nombres de campo EEA de §4.1~~ ✅ hecho (definición oficial; `M` = masa en orden de marcha, `Z` = consumo eléctrico Wh/km).
3. `homologation_match` del consumo CS del León e-HYBRID MY26.5 (DE ↔ ES): **PARTIAL** — la EEA tiene la revisión *34 en ambos mercados, pero la ficha de seat.de no imprime TAN/Va/Ve → falta un documento DE con los códigos (ver HOMOLOGATION_MATCH_REPORT).
4. En la revisión humana de los DC: completar §4.2 y convertir recuentos a `observed_coverage` revisados.
5. Pedir información y precio (sin contratar) a C01/C03 (precios históricos) y C07 (batería útil) para dimensionar los dos huecos principales.

---

## 7. Registro de revisiones

| Fecha | Fuente | Cambio | Revisor | URL de términos |
|---|---|---|---|---|
| 2026-09-24 | — | v0.1: plantilla + hipótesis | — | — |
| 2026-09-24 | — | v0.1: `external_field`, `transformation(_version)`, `granularity`, `expected/observed_coverage`, `sample_size` | — | — |
| 2026-09-24 | — | **v0.2**: cobertura observada Dataset Core (n = 10), mapeos EEA observados, cross-market (D1), archivadas (D3), S08-EU y S10, accesibilidad observada. Derechos sin verificar (`❓`) | — | — |
| 2026-09-24 | S01 EEA | Licencia leída en los metadatos oficiales: CC BY 4.0 (titular DG CLIMA) → store/republish/commercial/derive **⚠️ con atribución**. Pendiente confirmación humana/legal antes de pasar a ✅. Campos confirmados contra la definición de tabla oficial (§4.1) | Claude (asistente) — pendiente revisor humano | https://sdi.eea.europa.eu/catalogue/srv/api/records/992616f8-158f-4ecc-b978-814b81629db6?language=eng |
| 2026-09-25 | S04 ESIOS | Step 4f: acceso público al archivo PVPC verificado; campos y exclusión de impuestos (RD 216/2014 art. 7.6) documentados en §4.3. **Derechos sin resolver**: términos propios de ESIOS no localizados; el aviso legal de ree.es prohíbe el uso comercial sin autorización → `commercial` ❓ con riesgo ❌. Requiere revisión humana/legal (o solicitud de autorización a REE) **antes de publicar** precios eléctricos | Claude (asistente) — pendiente revisor humano | https://www.ree.es/en/legal-notice-privacy-policy |
| 2026-09-24 | S03 MITECO | Step 4e: licencia leída en la ficha oficial del catálogo de datos abiertos de MITECO: **CC BY 4.0** → store/republish/commercial/derive **⚠️ con atribución**; PVP con impuestos (FAQ MITECO); mapeo §4.2. Pendiente confirmación humana/legal antes de ✅ | Claude (asistente) — pendiente revisor humano | https://catalogo.datosabiertos.miteco.gob.es/catalogo/es/dataset/214e0895-b3aa-4662-8ebe-18134c21fb45 |
| 2026-09-24 | S01 EEA · S02 IDAE | Step 4c: registro de tablas 2010–2025 (§4.1), mapeo v2 (`Zr` sin tipo de autonomía, PARTIAL mismo mercado → UNCONFIRMED), código IDAE = Va/Ve (BYD). **Sin cambios de derechos** (S01 sigue ⚠️, S02 ❓) | Claude (asistente) — pendiente revisor humano | — |
