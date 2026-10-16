# VScar — RDW Source Audit v0.1 (Step D1.1)

> Estado: **SOURCE AUDIT PASS · 2026-10-16** · Código: `packages/data-connectors/src/rdw/` · Manifiestos: [`d11/acquisition-manifests.json`](d11/acquisition-manifests.json) · Identidad: [RDW_EEA_IDENTITY_MATCH_V0_1](RDW_EEA_IDENTITY_MATCH_V0_1.md) · Piloto: [D1_1_ENRICHMENT_PILOT_V0_1](D1_1_ENRICHMENT_PILOT_V0_1.md)

RDW (Rijksdienst voor het Wegverkeer, Países Bajos) publica en opendata.rdw.nl (Socrata) su **registro de homologaciones de tipo** (TGK, *typegoedkeuring*) además del registro de vehículos matriculados. Para VScar lo útil es el TGK: describe homologaciones por **TAN + variante + versión**, sin matrículas.

## 1. Conjuntos identificados (verificados con la API de metadatos, 2026-10-16)

| datasetId | datasetName | officialUrl | apiEndpoint | license | recordCount | lastUpdated | relevantFields | Uso D1.1 |
|---|---|---|---|---|---:|---|---|---|
| `byxc-wwua` | TGK Basis Uitvoering | https://opendata.rdw.nl/d/byxc-wwua | `/resource/byxc-wwua.json` | Public Domain | 6.599.708 | 2026-10-16 | TAN, Va, Ve, revisión, validez, categoría, longitud/anchura/altura/batalla (límites), plazas, puertas, masa en orden de marcha, MMA, velocidad máxima | ✅ |
| `gr7t-qfnb` | TGK Energiebron Uitvoering | …/d/gr7t-qfnb | `/resource/gr7t-qfnb.json` | Public Domain | 6.324.573 | 2026-10-16 | fuente de energía, potencia neta máx., norma Euro, CO₂/consumo WLTP (combinado = CS en enchufables; ponderado), consumo y autonomía eléctricos WLTP, valores NEDC | ✅ |
| `4by9-ammk` | TGK Aandrijving Uitvoering | …/d/4by9-ammk | `/resource/4by9-ammk.json` | Public Domain | 6.142.996 | 2026-10-16 | cilindrada, cilindros, indicadores eléctrico/híbrido/enchufable | ✅ |
| `ky2r-jqad` | TGK Carrosserie Uitvoering | …/d/ky2r-jqad | `/resource/ky2r-jqad.json` | Public Domain | 5.701.549 | 2026-10-16 | código de carrocería UE | ✅ (solo AA/AD/AE se traducen) |
| `7rjk-eycs` | TGK Versnelling Uitvoering | …/d/7rjk-eycs | `/resource/7rjk-eycs.json` | Public Domain | 5.818.278 | 2026-10-16 | tipo de caja (código), nº de marchas | ✅ (marchas; código sin mapear) |
| `xhyb-w7xt` | TGK As Uitvoering | …/d/xhyb-w7xt | `/resource/xhyb-w7xt.json` | Public Domain | 14.106.559 | 2026-10-16 | ejes motrices → tracción | ✅ |
| `x5v3-sewk` | TGK Handelsbenaming Fabrikant | …/d/x5v3-sewk | `/resource/x5v3-sewk.json` | Public Domain | 20.147.813 | 2026-10-16 | denominación comercial (modelo, no trim), tipo del fabricante | ✅ (contraste) |
| `9s6a-b42z` | TGK Intrekking Typegoedkeuring | …/d/9s6a-b42z | `/resource/9s6a-b42z.json` | Public Domain | 8.448 | 2026-10-07 | retiradas de homologación por TAN | ✅ (0 en el piloto) |
| `kyri-nuah` | TGK Merk Uitvoering | …/d/kyri-nuah | — | Public Domain | 8.231.885 | 2026-10-16 | código de marca RDW | no (sin valor añadido) |
| `d3ex-xghj`, `m692-vvff`, `xn6e-huse` | TGK Koppeling / Speciale Doeleinden / Rupsbandset | — | — | Public Domain | — | 2026-10-16 | enganche, usos especiales, orugas | no |
| `gska-f75a` | Begrippenlijst TGK-datasets (PDF, 12-03-2024) | …/d/gska-f75a | — | Public Domain | — | 2024-04-24 | **definiciones oficiales de cada campo** | ✅ (glosario) |
| `m9d7-ebf2` (+ `wp6g-54rp` "Personenauto") | Gekentekende voertuigen | …/d/m9d7-ebf2 | — | Public Domain | 16.870.473 | 2026-10-16 | **matrícula** (`kenteken`), precio de catálogo NL, BPM, color… | ❌ **no se usa**: datos por matrícula y comerciales NL |

Licencia: el campo `license` de los metadatos de **cada** recurso usado dice "Public Domain" (atribución "Team Open Data RDW"); el catálogo nacional data.overheid.nl declara **CC-0 (1.0)** por distribución para los conjuntos TGK (p. ej. [TGK Koppeling Uitvoering](https://data.overheid.nl/dataset/46078-open-data-rdw--tgk-koppeling-uitvoering)). No se encontró una página de términos propia de RDW que añada condiciones.

## 2. Schema y semántica (glosario oficial)

- **Clave**: `typegoedkeuringsnummer` (TAN completo con extensión, en minúsculas: `e1*2007/46*0623*33`) + `codevarianttgk` (Va; en Handelsbenaming se llama `codevariantgk`) + `codeuitvoeringtgk` (Ve) + `volgnummerrevisieuitvoering` (revisión interna de RDW: "no es un dato europeo").
- **Límites**: casi todo se publica como `…ondergrens` / `…bovengrens`. Para dimensiones, el glosario dice que son el rango "de **todas** las versiones de una variante" → se mapean como rango `HOMOLOGATION_FAMILY`, nunca como valor de la versión.
- **Enchufables**: `brandstofverbruikgecombwltp` y `co2emisgecombineerdwltp` son "medidos en condiciones de mantenimiento de carga (CS)" — el dato que D1 no encontró en España. El glosario repite ese texto en los campos *gewogen* (ponderados): se tratan como ponderados con `INFERRED`.
- **Anomalías verificadas**: en el BYD SEAL (homologación de 2023) RDW rellena campos "NEDC" con valores iguales a los que la EEA publica como WLTP (166 Wh/km, 570 km), mientras sus campos WLTP dicen 159 Wh/km y 583 km → los campos NEDC solo se mapean si la fila no trae WLTP y la revisión es anterior a 2021.
- **Códigos sin lista publicada**: `codetypeversnellingsbak` (M, A, C, G, F, W, O, D, H) → se conserva bruto, no se traduce a `transmission`. Carrocería UE: el Golf de 5 puertas, RAV4 y X3 se homologan **AC**, Tucson y Model Y **AF** → solo AA/AD/AE se traducen.

## 3. Acceso, cuotas y seguridad de datos

- API SoQL sin token (cuota compartida). El cliente pagina con `$limit`/`$offset` y `$order` por la clave completa (determinista), respeta `Retry-After` ante HTTP 429 (3 reintentos, luego error reintentable para la cola) y nunca sortea límites. En D1.1: 16 consultas, **0 respuestas 429**.
- Consultas acotadas por pares (Va, Ve) (≤ 25 por consulta). Se descargaron **4.177 filas (2,40 MB)**, no millones.
- Ningún conjunto usado contiene matrículas, bastidores ni datos personales. `Gekentekende_voertuigen` (por matrícula) no se consulta.

## 4. Ficha de derechos (por recurso)

| Campo | Valor |
|---|---|
| Source | S11 RDW (Países Bajos) |
| Dataset ID | `byxc-wwua`, `gr7t-qfnb`, `4by9-ammk`, `ky2r-jqad`, `7rjk-eycs`, `xhyb-w7xt`, `x5v3-sewk`, `9s6a-b42z` |
| Official URL | https://opendata.rdw.nl/d/{id} |
| License URL | metadatos `https://opendata.rdw.nl/api/views/{id}.json` → "Public Domain"; https://creativecommons.org/publicdomain/zero/1.0/ (data.overheid.nl) |
| Commercial use | permitido por CC0 / dominio público |
| Attribution | no exigida por CC0; se propone «RDW — Open Data RDW» |
| Redistribution | permitida |
| Restrictions | ninguna encontrada para TGK; **matrículas** del registro de vehículos: no se usan por privacidad, no por licencia |
| Database rights | CC0 renuncia también al derecho *sui generis* |
| Verification date | 2026-10-16 |
| Reviewer status | Claude (asistente) — **pendiente de revisor humano**; matriz: S11 registrada con ❓ (solo PREVIEW) |
