# VScar — D1.6 Revisión final de derechos: RDW (S11) y Traficom (S13)

> Estado: **revisión completada · FICHA PREPARADA PARA FIRMA · NO APROBADA** · 2026-10-21 · Matriz: S11 ❓ y S13 ❓ (sin cambios) · La aceptación de ADR-019 B **no** aprueba ninguna fuente

## 1. Recursos usados por la capa técnica

| Campo | S11 RDW | S13 Traficom |
|---|---|---|
| Recursos exactos | TGK Basis (`byxc-wwua`), Energiebron, Aandrijving (motor/assen), Carrosserie, Versnelling, As, Handelsbenaming, Intrekking (9 recursos de opendata.rdw.nl; consultas SoQL acotadas por TAN+Va+Ve, D1.1) | `Ajoneuvorekisteri.zip` (TieliikenneAvoinData_30_06_2026.csv) + clasificaciones 24.03.2026 + Aineistokuvaus.pdf (D1.3) |
| Titular | RDW — Rijksdienst voor het Wegverkeer (Países Bajos) | Liikenne- ja viestintävirasto Traficom (Finlandia) |
| Licencia | metadatos de cada recurso: "Public Domain"; distribución en data.overheid.nl: **CC0 1.0** | **CC BY 4.0** (CKAN `license_id` cc-by-4.0, avoindata.suomi.fi) |
| URL | https://opendata.rdw.nl/ · https://data.overheid.nl/ | https://avoindata.suomi.fi/data/en/dataset/ajoneuvojen-avoin-data · https://opendata.traficom.fi/Content/Ajoneuvorekisteri.zip |
| Fecha de consulta | 2026-10-16 (metadatos guardados con SHA-256: [`d12/rdw-licence-metadata.json`](d12/rdw-licence-metadata.json)) | 2026-10-16 (ZIP SHA-256 `81fdd696…5da0`, [`d13/acquisition-manifests.json`](d13/acquisition-manifests.json)) |
| Almacenamiento | permitido (dominio público / CC0) | permitido (CC BY) |
| Uso comercial | permitido | permitido ("for both commercial and non-commercial purposes", términos de Traficom) |
| Publicación | permitida | permitida con atribución |
| Transformación | permitida | permitida; indicar cambios |
| Atribución | no exigida; se propone «RDW — Open Data RDW» | **exigida**: «Liikenne- ja viestintävirasto Traficom — Ajoneuvojen avoin data, CC BY 4.0» + enlace |
| Condiciones adicionales | ninguna conocida | datos personales: VScar solo guarda agregados por clave exacta (nunca municipio, odómetro, bastidor, nº secuencial ni color) |
| Riesgos residuales | uso cross-market NL→ES (ADR-009 D1, solo con homologación EXACT); etiquetado "NEDC" incorrecto en algunos campos (D1.2) | mercado FI: los nombres comerciales no son identidad ES; caja de cambios solo con código inequívoco ≥ 95 % |

## 2. Cómo se aplican hoy (sin aprobación)

- **Estado**: S11 y S13 están **PENDING** en `SOURCE_RIGHTS` → `sourcePublication` = `PREVIEW_ONLY`.
- **Capa técnica**: sus observaciones se guardan solo en `curated_*`, con `rights_status = PENDING`. Esa capa no es seleccionable ni pública y se ve únicamente en la ruta interna con autenticación. Es el mismo aislamiento que ya se aplica a los fixtures S08 del catálogo (PREVIEW_ONLY).
- **Bloqueos**: ninguna observación S11/S13 llega a PUBLIC. Ningún vehículo curado se promueve mientras su promoción dependa de un campo pendiente.

## 3. Ficha de decisión (para firma del responsable humano)

> **Solicitud**: pasar S11 RDW y S13 Traficom de ❓ a ✅ (S11) y ⚠️ con atribución (S13) en DATA_RIGHTS_MATRIX §2.1 y en `SOURCE_RIGHTS`, para datos técnicos de homologación usados con `homologation_match = EXACT`.
>
> Evidencia: §1 de este documento · [D1_2_RDW_RIGHTS_APPROVAL_DOSSIER](D1_2_RDW_RIGHTS_APPROVAL_DOSSIER.md) · [D1_3_DATA_ACQUISITION_DECISION](D1_3_DATA_ACQUISITION_DECISION.md).
>
> Condiciones:
> - atribución visible de Traficom en "Cómo lo calculamos";
> - uso cross-market solo con homologación EXACT;
> - Traficom solo para agregados por clave;
> - revisión anual de las licencias.
>
> | Fuente | Decisión | Nombre | Fecha | Firma |
> |---|---|---|---|---|
> | S11 RDW | ☐ aprobar ☐ rechazar ☐ aplazar | | | |
> | S13 Traficom | ☐ aprobar ☐ rechazar ☐ aplazar | | | |

**No se ha registrado ninguna aprobación**: la matriz y `SOURCE_RIGHTS` no cambian hasta que esta ficha esté firmada.
