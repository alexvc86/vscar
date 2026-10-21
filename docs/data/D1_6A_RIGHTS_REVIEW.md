# VScar — D1.6a Revisión documental de derechos: RDW (S11) y Traficom (S13)

> Estado: **READY_FOR_HUMAN_APPROVAL (ambas) · NO APROBADAS** · 2026-10-21 · Sin firma humana registrada en el repositorio.
> - **Matriz**: S11 ❓ y S13 ❓ (sin cambios).
> - **`SOURCE_RIGHTS`**: S11 y S13 en PENDING, sincronizado con la matriz (test `packages/quality/test/publication.test.ts`).
> - **Antecedentes**:
>   - [D1_2_RDW_RIGHTS_APPROVAL_DOSSIER](D1_2_RDW_RIGHTS_APPROVAL_DOSSIER.md)
>   - [D1_6_OFFICIAL_SOURCE_RIGHTS_REVIEW](D1_6_OFFICIAL_SOURCE_RIGHTS_REVIEW.md) (la ficha de firma sigue vacía)

La indicación del usuario de trabajar con fuentes gratuitas de licencia reutilizable **no** es una aprobación de estas dos fuentes. Por eso no se cambia ningún estado a VERIFIED o ✅.

## 1. S11 — RDW Open Data (Países Bajos)

| Campo | Valor |
|---|---|
| Source | S11 · RDW — Open Data: typegoedkeuringsregister (TGK) |
| Resource IDs (datos usados por D1.1/D1.6) | `byxc-wwua` Basis · `gr7t-qfnb` Energiebron · `4by9-ammk` Aandrijving · `ky2r-jqad` Carrosserie · `7rjk-eycs` Versnelling · `xhyb-w7xt` As · `x5v3-sewk` Handelsbenaming · `9s6a-b42z` Intrekking + glosario `gska-f75a` |
| Comprobación D1.6a | los 8 recursos de datos que aparecen en los manifiestos de adquisición D1.1 (`d11/acquisition-manifests.json`) están **todos** entre los 9 recursos con metadatos de licencia guardados; ninguna observación curada cita otro recurso (`source_record`) |
| License | metadatos de cada recurso: `licenseId = PUBLIC_DOMAIN` ("Public Domain"); distribución en data.overheid.nl: CC0 1.0 |
| Terms URL | https://opendata.rdw.nl/api/views/{id}.json (por recurso) · https://creativecommons.org/publicdomain/zero/1.0/ |
| Reviewed date | metadatos obtenidos 2026-10-16 · re-verificados 2026-10-21 (SHA-256 de los 10 ficheros de `d12/acquisition-manifests.json`: 10/10 OK) |
| Evidence | [`d12/rdw-licence-metadata.json`](d12/rdw-licence-metadata.json) + brutos en `data/raw/rdw-metadata/2026-10-16/` |
| Proposed permissions | store ✅ · republish ✅ · commercial ✅ · derive ✅ (dominio público / CC0) |
| Attribution | no exigida; se propone «RDW — Open Data RDW» como buena práctica |
| Personal data | ninguno: los TGK son registros de homologación; el registro por matrícula (`m9d7-ebf2`) **no se usa** |
| Open risks | <ul><li>uso cross-market NL→ES solo con TAN+Va+Ve EXACT (ADR-009);</li><li>campos "NEDC" en homologaciones WLTP y conflictos con EEA (12 valores abiertos);</li><li>5 recursos verificados en los metadatos de opendata.rdw.nl pero no uno a uno en data.overheid.nl;</li><li>`license.termsLink` vacío en Socrata;</li><li>revisar la licencia en cada adquisición</li></ul> |
| Decision required | aprobar / rechazar / aplazar S11 → ✅ en DATA_RIGHTS_MATRIX §2.1 y `SOURCE_RIGHTS` |

## 2. S13 — Traficom Ajoneuvojen avoin data (Finlandia)

| Campo | Valor |
|---|---|
| Source | S13 · Liikenne- ja viestintävirasto Traficom |
| Resource | `Ajoneuvorekisteri.zip` (TieliikenneAvoinData_30_06_2026.csv) · `Ajoneuvotiedot_avoin_data_luokitukset_24.03.2026.xlsx` · `Aineistokuvaus.pdf` |
| Catalogue metadata | CKAN avoindata.suomi.fi, `license_id = cc-by-4.0` |
| License | CC BY 4.0 (comercial y no comercial con atribución e indicación de cambios) |
| Terms URL | https://avoindata.suomi.fi/data/en/dataset/ajoneuvojen-avoin-data · http://creativecommons.org/licenses/by/4.0/ |
| Reviewed date | obtenido 2026-10-16 · SHA-256 de los 3 ficheros re-verificado 2026-10-21 (3/3 OK, [`d13/acquisition-manifests.json`](d13/acquisition-manifests.json)) |
| Data actually used | agregados por clave exacta TAN+Va+Ve ([`d13/traficom-aggregates.json`](d13/traficom-aggregates.json), 74 claves): distribuciones de caja, marchas, carrocería, puertas, plazas, potencia, cilindrada, combustible y rango de primera matriculación |
| In the curated layer | solo 10 atributos técnicos (8 `transmission`, 2 `body_type`) de los 18 |
| Personal data | **ninguno guardado en Git ni en MySQL**: solo recuentos por clave. Nunca municipio, odómetro, bastidor, nº secuencial, color ni filas individuales. El ZIP bruto (filas por vehículo, anonimizadas por Traficom) vive solo en `data/raw/` (fuera de Git, `.gitignore` `/data/`) |
| Proposed permissions | store ✅ · republish ⚠️ (con atribución) · commercial ✅ · derive ✅ (indicando cambios) |
| Attribution | **exigida**: «Liikenne- ja viestintävirasto Traficom — Ajoneuvojen avoin data, CC BY 4.0» + enlace, visible en "Cómo lo calculamos" |
| Open risks | <ul><li>los nombres comerciales finlandeses no son identidad española;</li><li>la caja de cambios solo se usa con código inequívoco (≥ 95 %);</li><li>la atribución aún no se muestra en la UI pública (la capa curada no es pública)</li></ul> |
| Decision required | aprobar / rechazar / aplazar S13 → ⚠️ (con atribución) en DATA_RIGHTS_MATRIX §2.1 y `SOURCE_RIGHTS` |

## 3. Estado de la decisión

| Fuente | Recomendación técnica | Estado registrado | Efecto hoy |
|---|---|---|---|
| S11 RDW | READY_FOR_HUMAN_APPROVAL | ❓ PENDING | observaciones solo en `curated_*` (`rights_status = PENDING`); nunca PUBLIC |
| S13 Traficom | READY_FOR_HUMAN_APPROVAL | ❓ PENDING | idem |

- **Firma**: la ficha está en [D1_6_OFFICIAL_SOURCE_RIGHTS_REVIEW §3](D1_6_OFFICIAL_SOURCE_RIGHTS_REVIEW.md); este documento no inventa firma ni dictamen jurídico.
- **Si se aprueba**:
  - actualizar la matriz (símbolos) y `SOURCE_RIGHTS` en el mismo cambio (el test de sincronización lo exige);
  - registrar quién y cuándo en el historial de la matriz.
- **La aprobación no promueve vehículos**: la promoción al catálogo seleccionable sigue exigiendo identidad comercial, claves críticas y conflictos revisados.
