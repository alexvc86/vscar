# VScar — D1.2 RDW (S11) Rights Approval Dossier

> Estado: **READY_FOR_HUMAN_APPROVAL** · Preparado: 2026-10-16 por Claude (asistente) · **License evidence verified: YES · Publication approved: NO** · Matriz: S11 sigue ❓ en [DATA_RIGHTS_MATRIX](DATA_RIGHTS_MATRIX.md) y en `SOURCE_RIGHTS` (`packages/quality`) · Metadatos guardados: [`d12/rdw-licence-metadata.json`](d12/rdw-licence-metadata.json) + brutos en `data/raw/rdw-metadata/2026-10-16/` (SHA-256 en [`d12/acquisition-manifests.json`](d12/acquisition-manifests.json))

## 1. Decisión que se solicita

> **Aprobar RDW (S11) — conjuntos TGK listados abajo — como fuente reutilizable para uso comercial, sujeta a la aplicación correcta de CC0 / dominio público y a los controles independientes de calidad e identidad de VScar.**

Efecto si se aprueba: S11 pasa de ❓ a ✅ (o ⚠️ si se decide exigir atribución voluntaria) en `store / republish / commercial / derive`. Con ello, en **PUBLIC** serían visibles los campos RDW de variantes que cumplan **además** los gates existentes (registro `published`, identidad EXACT, categoría comparable). La aprobación **no** resuelve conflictos (BYD SEAL sigue abierto) ni identidades comerciales.

## 2. Evidencia por recurso efectivamente usado (consultada 2026-10-16)

| Dataset ID | Nombre oficial | Metadatos oficiales | Licencia (campo `license`) | `licenseId` | Atribución declarada | Titular de la cuenta | Datos actualizados | SHA-256 de los metadatos guardados |
|---|---|---|---|---|---|---|---|---|
| `byxc-wwua` | Open Data RDW: TGK Basis Uitvoering | https://opendata.rdw.nl/api/views/byxc-wwua.json | Public Domain | PUBLIC_DOMAIN | Team Open Data RDW | BICC | 2026-10-16 | `375c95152a080bcb…` |
| `gr7t-qfnb` | Open Data RDW: TGK Energiebron Uitvoering | https://opendata.rdw.nl/api/views/gr7t-qfnb.json | Public Domain | PUBLIC_DOMAIN | Team Open Data RDW | BICC | 2026-10-16 | `d090f1594a0db105…` |
| `4by9-ammk` | Open Data RDW: TGK Aandrijving Uitvoering | https://opendata.rdw.nl/api/views/4by9-ammk.json | Public Domain | PUBLIC_DOMAIN | Team Open Data RDW | BICC | 2026-10-16 | `c32de31e9412ba32…` |
| `ky2r-jqad` | Open Data RDW: TGK Carrosserie Uitvoering | https://opendata.rdw.nl/api/views/ky2r-jqad.json | Public Domain | PUBLIC_DOMAIN | Team Open Data RDW | BICC | 2026-10-16 | `d617ff70c78fbb1e…` |
| `7rjk-eycs` | Open Data RDW: TGK Versnelling Uitvoering | https://opendata.rdw.nl/api/views/7rjk-eycs.json | Public Domain | PUBLIC_DOMAIN | Team Open Data RDW | BICC | 2026-10-16 | `688049345248ee5f…` |
| `xhyb-w7xt` | Open Data RDW: TGK As Uitvoering | https://opendata.rdw.nl/api/views/xhyb-w7xt.json | Public Domain | PUBLIC_DOMAIN | Team Open Data RDW | BICC | 2026-10-16 | `f5381b3505c85b11…` |
| `x5v3-sewk` | Open Data RDW: TGK Handelsbenaming Fabrikant | https://opendata.rdw.nl/api/views/x5v3-sewk.json | Public Domain | PUBLIC_DOMAIN | Team Open Data RDW | BICC | 2026-10-16 | `e6e093fd9a2566f2…` |
| `9s6a-b42z` | Open Data RDW: TGK Intrekking Typegoedkeuring | https://opendata.rdw.nl/api/views/9s6a-b42z.json | Public Domain | PUBLIC_DOMAIN | Team Open Data RDW | BICC | 2026-10-07 | `2c9e275a5e45da9b…` |
| `gska-f75a` | Begrippenlijst TGK-datasets | https://opendata.rdw.nl/api/views/gska-f75a.json | Public Domain | PUBLIC_DOMAIN | Team Open Data RDW | Team Open Data RDW | 2024-04-24 | `2c0dd1ae8e617aba…` |

Evidencia complementaria (catálogo nacional neerlandés data.overheid.nl, RDW como propietario y publicador): conjuntos hermanos TGK listados con **"CC-0 (1.0)"** por distribución CSV/JSON/XML y acceso "Publiek" (verificado en [TGK Koppeling Uitvoering](https://data.overheid.nl/dataset/46078-open-data-rdw--tgk-koppeling-uitvoering); listados también Merk, Versnelling, Handelsbenaming e Intrekking). **No verificados uno a uno en data.overheid.nl**: Basis, Energiebron, Aandrijving, Carrosserie, As (sí verificados en los metadatos de opendata.rdw.nl).

| Elemento | Valor |
|---|---|
| Titular de los derechos | RDW (Rijksdienst voor het Wegverkeer, Países Bajos), cuenta "Team Open Data RDW" / "BICC" |
| Licencia | Public Domain (Socrata) = CC0 1.0 (data.overheid.nl); `license.termsLink` vacío en Socrata |
| URL de licencia | https://creativecommons.org/publicdomain/zero/1.0/ |
| Términos adicionales | no se encontró página de términos propia de RDW para opendata.rdw.nl |
| Derechos *sui generis* | CC0 renuncia a ellos |
| Atribución | no exigida; se propone citar «RDW — Open Data RDW» como buena práctica |
| Datos personales | los conjuntos TGK no contienen matrículas ni personas; el registro por matrícula (`m9d7-ebf2`, `wp6g-54rp`) **no se usa** |
| Fecha de obtención | 2026-10-16 (metadatos) · 2026-10-16 (datos D1.1/D1.2) |

## 3. Riesgos y condiciones propuestas

1. **Licencia ≠ calidad**: los valores RDW siguen sometidos al Conflict Engine; los campos "NEDC" en homologaciones WLTP y los límites únicos (`INFERRED`) se mantienen como en D1.1.
2. **Licencia ≠ identidad**: solo se usan con clave técnica EXACT (TAN completo + Va + Ve); RDW `handelsbenaming` nunca es identidad comercial.
3. **Mercado**: solo datos técnicos homologados cruzan NL → ES; nada comercial neerlandés.
4. **Vigencia**: revisar la licencia de cada recurso en cada adquisición (el cliente guarda los metadatos con SHA-256).

## 4. Tabla de decisiones pendientes (todas las fuentes)

| Fuente | Evidencia | Estado actual (matriz) | Decisión humana requerida |
|---|---|---|---|
| S01 EEA | CC BY 4.0 (registros 2022 F y 2023 F leídos) | ⚠️ | confirmar ⚠️ → ✅ con atribución (L1) |
| **S11 RDW** | Public Domain / CC0 1.0 por recurso | ❓ | **aprobar S11 (este expediente, L8)** |
| S12 GIAVEH | condiciones art. 8 Ley 37/2007 | ❓ | confirmar (sin datos técnicos; uso solo de contraste) (L9) |
| S02 IDAE | aviso legal restrictivo (uso privado, sin uso comercial) | ❓ (riesgo ❌) | revisión jurídica / solicitud de licencia a IDAE (L2); hoy sostiene el acabado de 2 BYD SEAL |
| S08 fabricantes | avisos restrictivos (8 leídos), 3 inaccesibles | ❓ | autorización escrita o dictamen sobre hechos técnicos citados (L3, L4) |
| S05 Euro NCAP | reproducción comercial no autorizada | ❓ | permiso (L5) |
| S07 DGT | uso privado + cita; CC BY 3.0 ES en el pie | ❓ | confirmar (L6) |
| BOE (Orden HAC/1501/2025) | disposición legal; aviso legal BOE (comercial permitido con atribución) | no registrada | decidir si se usa el valor fiscal (no es precio de compra) |
| Traficom (FI) | CC BY 4.0 | no registrada | opcional (contraste técnico) |

La Ley 37/2007 **no** se interpreta como licencia automática sobre datos de terceros (fabricantes) ni sustituye a los avisos legales de cada organismo.
