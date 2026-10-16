# VScar — Spain Dataset Sources v0.1 (Step D1)

> Estado: **v0.1 · 2026-10-16** · Manifiestos: [`d1/acquisition-manifests.json`](d1/acquisition-manifests.json) (104) · Ejecución: [`d1/acquisition-run-2026-10-16.json`](d1/acquisition-run-2026-10-16.json) · Derechos: [SPAIN_DATA_RIGHTS_AUDIT_V0_1](SPAIN_DATA_RIGHTS_AUDIT_V0_1.md) · Mapeo: [EEA_IDAE_SCHEMA_MAPPING_V0_1](EEA_IDAE_SCHEMA_MAPPING_V0_1.md)

## 1. Dónde está el código (sin duplicar conectores)

| Pieza | Dónde | Estado previo | D1 |
|---|---|---|---|
| Adapter EEA (import por homologación) | `packages/data-connectors/src/eea/` | v0.2, operativo (Step 4b/4c); job `EEA_IMPORT` en `apps/worker` | sin cambios de mapeo; **cliente: POST para consultas > 4.000 caracteres** (discodata devuelve 404 a GET largos) |
| Encuesta EEA para curación | `packages/data-connectors/src/eea/survey.ts` | — | **nuevo**: inventario por tabla y consulta agregada por marca/nombre (incluye `T` y `E (g/km)`) |
| Adapter IDAE | — (IDAE solo se había usado a mano en Dataset Core) | no existía | **nuevo**: `packages/data-connectors/src/idae/` (CSV en streaming, drift, normalización, mapeo v1) |
| Adquisición genérica | `packages/data-connectors/src/acquisition/` | `raw.ts` (raw ingest con SHA-256) | **nuevo**: parser CSV RFC 4180 en streaming, inventario de columnas, manifiesto de fichero |
| Curación | `packages/curation` | — | **nuevo**: familias, deduplicación, identidad, cobertura, prioridad, estados, JSONL; nunca escribe en MySQL (regla ESLint) |
| Calidad / derechos | `packages/quality` | conflictos, elegibilidad, `SOURCE_RIGHTS` | reutilizado sin cambios |
| Worker / jobs | `apps/worker` | `EEA_IMPORT`, `QUALITY_CHECK`, `CONFLICT_SCAN`… | sin cambios (D1 no importa) |

## 2. Fuentes consultadas

| Fuente | SOURCE FOUND | DOWNLOAD VERIFIED | SCHEMA VERIFIED | LICENSE VERIFIED | LEGAL REVIEW PENDING | BLOCKED |
|---|---|---|---|---|---|---|
| **S01 EEA** — discodata, tablas 2012, 2016, 2018, 2020, 2022, 2024 F y 2025 P (ES) | ✅ | ✅ 103 respuestas agregadas, SHA-256 | ✅ inventario real por año (§ mapeo) | ✅ CC BY 4.0 en los registros 2022 F y 2023 F (2024 F/2025 P: no leídos uno a uno) | ✅ (confirmar ⚠️ → ✅) | — |
| **S01 EEA** — visor co2cars.apps.eea.europa.eu y descargas CSV anuales completas | ✅ | ❌ no descargadas (innecesario: agregación en servidor; ≈ 1 M filas/año solo ES) | — | — | — | — |
| **S02 IDAE** — `idae-historico-202609.csv` | ✅ | ✅ 17.043.544 B, SHA-256 `cbfab8b7…77302`, `Last-Modified` 2026-09-28 | ✅ 20 columnas, 106.623 filas | ❌ sin licencia; aviso legal restrictivo | ✅ | — |
| **S02 IDAE** — guía PDF `Guiasemestre12026.pdf` | ✅ | ❌ no descargada (el CSV la contiene) | — | ❌ | ✅ | — |
| **S08** Volkswagen, SEAT, CUPRA, Toyota, Hyundai, Kia, Renault, BYD | ✅ avisos legales | ❌ (sin fichas descargadas en D1) | ❌ | ✅ términos leídos (restrictivos) | ✅ | — |
| **S08** BMW, Tesla, Peugeot | ⚠️ | ❌ | ❌ | ❌ | ✅ | ✅ (tiempo agotado / HTTP 403) |
| **S05 Euro NCAP** | ✅ términos | — | — | ✅ (restrictivos) | ✅ | — |
| **S07 DGT** — criterios del distintivo, sede electrónica | ✅ | — | — | ⚠️ sede: uso privado + cita; CC BY 3.0 ES en el pie (sin confirmar alcance) | ✅ | — |
| **S07 DGT** — microdatos de matriculaciones (datos.gob.es) | ✅ | ❌ (no necesario en D1) | — | ⚠️ condiciones generales de datos.gob.es | ✅ | — |
| MITECO (S03), ESIOS (S04) | ya integrados (Steps 4e/4f) | — | — | ver matriz | — | — |
| **S11 RDW** (Step D1.1) — TGK: Basis, Energiebron, Aandrijving, Carrosserie, Versnelling, As, Handelsbenaming, Intrekking | ✅ | ✅ 16 respuestas SoQL acotadas, SHA-256 (4.177 filas) | ✅ glosario oficial + respuestas reales | ✅ "Public Domain" por recurso + CC-0 1.0 (data.overheid.nl) | ✅ (S11 ❓ en la matriz hasta revisión) | — |
| **S12 GIAVEH** (Step D1.1) — Consulta Fichas Reducidas | ✅ | ✅ CSV (88.032 filas, 2023-08-31) + 2 sondas API | ✅ 5 columnas, sin datos técnicos | ✅ condiciones art. 8 Ley 37/2007 | ✅ | — |
| **S13 Traficom** (Step D1.3) — Ajoneuvojen avoin data (registro FI, ZIP trimestral) | ✅ | ✅ 1 ZIP (208.492.096 B, SHA-256 `81fdd696…5da0`) + 2 docs, manifiestos en `d13/` | ✅ 18 columnas en whitelist; error si cambia | ✅ CC BY 4.0 (CKAN `license_id`) | ✅ (S13 ❓ en la matriz hasta revisión) | — |
| **coches.net** (Step D1.3) — fichas técnicas | ✅ 7 / 9 fichas de la muestra | ❌ **no adquirido** (condiciones prohíben reproducción y extracción; datos "cedidos por JATO") | — | ✅ términos leídos (restrictivos) | ✅ | ✅ por derechos |
| **km77** (Step D1.3) — fichas `/datos` | ✅ 9 / 9 fichas de la muestra | ❌ **no adquirido** (aviso legal: solo uso personal y privado) | — | ✅ términos leídos (restrictivos) | ✅ | ✅ por derechos |
| **C01 JATO** (Step D1.3) — APIs Specifications / WLTP Link / Code Link / VINView | ✅ documentación pública | ❌ sin contrato (RFI preparado, no enviado) | — | ❌ sin términos públicos | ✅ | ✅ hasta contrato |
| **S14 gor3a/vehicle-makes-models** (Step D1.4) — release v1.0.2 `ee99776` (JSON/CSV/SQLite) | ✅ | ✅ 3 assets + README/LICENSE-DATA, SHA-256 fijados (`d14-acquire.ts`) | ✅ schema tier-3 (Zod `.strict()`), paridad JSON = CSV = SQLite (30.535 motores) | ✅ ODbL 1.0 (datos) / MIT (código); origen autoevolution **sin licencia acreditada** | ✅ (S14 ❓; solo investigación) | — |
| **S15 Opendatabay** (Step D1.4) — Automotive Specifications 1945–2020 | ✅ | ⚠️ solo muestra pública (100 filas); CSV completo tras cuenta → no descargado | ✅ 78 columnas (muestra) | ❌ "CC0" en la página vs licencia enlazada no comercial; procedencia no declarada | ✅ | ✅ por derechos (S15 ❌) |
| Kaggle *Car Specification Dataset 1945-2020* · filippos/CarDatabase · NHTSA vPIC (Step D1.4) | ✅ / ❌ / ✅ | ❌ (cuenta) / — / — | — | Kaggle "CC0" sin procedencia · CarDatabase **NOT FOUND** · vPIC solo US | ✅ | — |
| **S15 Opendatabay/Kaggle** — CSV completo (Step D1.5, aportado por el usuario en `docs/`) | ✅ | ✅ 24.866.141 B, SHA-256 `e4218734…`; copia en `data/raw/`, original en `.gitignore` | ✅ 78 columnas, 70.823 filas, 255 marcas | ❌ licencia contradictoria (CC0 vs no comercial) | ✅ | ✅ derechos (❌) |
| **S16 autoseeker.eu** `models.csv` (Step D1.5) | ✅ | ✅ copia del usuario = endpoint publicado (SHA-256 idéntico) | ✅ 20 columnas, 281 filas; granularidad MODEL/GENERATION/POWERTRAIN | ✅ CC BY 4.0 (página open-data) | ✅ (❓) | — |
| **S17 OpenEV Data** v1.24.0 (Step D1.5) | ✅ | ✅ JSON/CSV de release + LICENCE/README/schema | ✅ 1.189 BEV, 0 inválidos | ✅ CDLA-Permissive-2.0 | ✅ (❓) | — |
| **S18 VehiclesDB** v2026.10.4 (Step D1.5) | ✅ | ✅ release + LICENSE/SOURCES/ATTRIBUTION | ✅ 15.068 modelos (5.541 turismos; 1.222 ES) | ✅ CC BY 4.0 + avisos de origen | ✅ (❓) | — |
| **S19 Kilowatt Open EV Data** (archivado, Step D1.5) | ✅ | ✅ `ev-data.json` @ `32d7dc5` | ✅ 1.321 variantes | ✅ MIT + atribución | ✅ (❓) | — |

**Ninguna fuente es PUBLIC READY.** Step D1.5: [D1_5_RIGHTS_DECISION](D1_5_RIGHTS_DECISION.md) · [D1_5_MULTI_SOURCE_MATCHING](D1_5_MULTI_SOURCE_MATCHING.md). Step D1.4: [D1_4_OPEN_DATASET_SOURCE_AUDIT](D1_4_OPEN_DATASET_SOURCE_AUDIT.md). Step D1.3: [D1_3_HISTORICAL_CATALOG_SOURCE_AUDIT](D1_3_HISTORICAL_CATALOG_SOURCE_AUDIT.md) · [D1_3_DATA_ACQUISITION_DECISION](D1_3_DATA_ACQUISITION_DECISION.md). Step D1.1: [RDW_SOURCE_AUDIT_V0_1](RDW_SOURCE_AUDIT_V0_1.md) · [GIAVEH_SOURCE_AUDIT_V0_1](GIAVEH_SOURCE_AUDIT_V0_1.md) · [D1_1_ENRICHMENT_PILOT_V0_1](D1_1_ENRICHMENT_PILOT_V0_1.md).

## 3. Recursos por fuente

### S01 — EEA
- Registro (2022 F): https://sdi.eea.europa.eu/catalogue/srv/api/records/992616f8-158f-4ecc-b978-814b81629db6 · (2023 F): https://sdi.eea.europa.eu/catalogue/srv/api/records/87fd2bce-6ad5-46d8-af41-f27cfd2e45a8 · visor: https://co2cars.apps.eea.europa.eu/ · SQL: https://discodata.eea.europa.eu/
- Formato: SQL Server vía REST (JSON) y CSV anual completo. Tamaño: no se descargó el CSV; ES ≈ 0,85–1,38 M filas/año desde 2018.
- Cobertura temporal: 2010–2024 FINAL, 2025 PROVISIONAL (2025 F y 2026 P no publicados a 2026-10-16).
- Identificadores: `TAN`, `T`, `Va`, `Ve` (100 % desde 2016; **0 % TAN en 2012**), `VFN` desde 2018–2020.
- Duplicación: desde 2018 una fila por matriculación → agregación en servidor.
- WLTP/NEDC: `E` (≤ 2016, NEDC), `Enedc` (2017–2022), `Ewltp` (2018+).
- Calidad ES: ver inventario. Muestra D1: 25 familias × 6 años = 1.875.908 matriculaciones.

### S02 — IDAE
- Página: https://coches.idae.es/guia-emisiones-consumos · CSV: `https://coches.idae.es/storage/csv/idae-historico-{AAAAMM}.csv` (el nombre cambia con cada edición).
- Responde a §4 del brief:
  1. Identifica modelos comercializados en España: **sí** (texto libre por versión).
  2. Desambigua versiones: **parcialmente** (texto; potencia; `(MYxx)`).
  3. Consumos comparables: rango WLTP de combustible; consumo y autonomía eléctricos. CO₂: **etiquetas intercambiadas** (no se usa).
  4. Vinculación con EEA: **solo** cuando el texto incluye el código Va/Ve (verificado en BYD); en el resto, por valores → UNCONFIRMED.
  5. Histórico: sí, desde 2006 (con registros sueltos desde 1992).
  6. Edición y fecha por registro: `Fecha_alta`, `Fecha_actualizacion` (3 fechas futuras); `Fecha_comercializacion` vacía al 89 %.

### S08 — Fabricantes (muestra de 11)
- Avisos legales y recursos técnicos: ver la auditoría de derechos.
- Recursos técnicos encontrados: páginas WLTP explicativas (VW, SEAT), catálogos HTML (Toyota, Kia), **PDF de catálogo público** (Renault, p. ej. Clio) y consumo/CO₂ por modelo en HTML (Renault). **No se encontraron** listas de precios PDF públicas ni documentos con TAN/Va/Ve.
- No se copió ninguna imagen ni ficha.

### Fuentes complementarias
- **DGT**: criterios del distintivo (0, ECO, C, B) — VScar usa su regla `dgt-label-v1`; hay incoherencia de fechas de diésel C entre páginas DGT (a revisar antes de citar).
- **Euro NCAP**: términos restrictivos para uso comercial.
- **MITECO / ESIOS**: precios de energía (Market Context); no se mezclan con la identidad de vehículos.
