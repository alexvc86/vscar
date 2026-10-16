# VScar — D1.1 Enrichment Pilot v0.1 (RDW + GIAVEH)

> Estado: **SOURCE AUDIT PASS · ENRICHMENT PARTIAL** · 2026-10-16 · Datos: [`d11/pilot-results.json`](d11/pilot-results.json) · [`d11/quality-catalog.json`](d11/quality-catalog.json) · Reproducir: `node packages/curation/scripts/d11-acquire.ts` (red, ~30 s) + `node packages/curation/scripts/d11-build.ts` (offline, determinista, ~1 s) · Fuentes: [RDW_SOURCE_AUDIT_V0_1](RDW_SOURCE_AUDIT_V0_1.md) · [GIAVEH_SOURCE_AUDIT_V0_1](GIAVEH_SOURCE_AUDIT_V0_1.md) · Identidad: [RDW_EEA_IDENTITY_MATCH_V0_1](RDW_EEA_IDENTITY_MATCH_V0_1.md)

**Resultado en una frase**: RDW confirma la identidad **técnica** de 9 de 10 candidatos con el TAN completo + variante + versión y añade dimensiones, plazas, masas, norma Euro (→ etiqueta DGT), tracción y marchas; no aporta maletero, 0–100, depósito, carga, garantía ni precio, y no confirma ninguna identidad **comercial** (trim). GIAVEH no tiene datos técnicos.

## 1. Selección de los 10

Candidatos D1 reales con claves EEA completas (TAN/Va/Ve). Mezcla de identidades (4 EXACT, 5 UNCONFIRMED, 1 AMBIGUOUS), powertrains (4 BEV, 2 PHEV, 4 ICE/MHEV), ciclos (NEDC: Golf `*33`, Tucson 2018/2020; WLTP: resto) y periodos 2018–2025. Ningún candidato se sustituyó.

| # | Candidato | Por qué |
|---|---|---|
| 3 · 1 | Golf 2018 `*33` (NEDC) · `*35` (WLTP) | EXACT; ya en el catálogo → permiten medir con el sistema de calidad real |
| 2 · 4 | BYD SEAL (2) | EXACT por código IDAE (= Va/Ve). **#2 es la misma identidad que DC-08 del catálogo** (D1 no lo marcó como solapamiento; D1.2: el fixture DC-08 no guarda TAN, solo Va/Ve) |
| 76 | Tesla Model 3 2024/25 | BEV UNCONFIRMED |
| 77 | BMW X3 xDrive30e 2022 | PHEV UNCONFIRMED (X3 de la lista orientativa) |
| 55 | SEAT León SP 2024 | AMBIGUOUS (único León de la lista D1) |
| 8 | Hyundai Tucson 2018/2020 | ICE NEDC histórico |
| 73 | Toyota RAV4 PHEV 2025 | PHEV, EEA provisional |
| 81 | Tesla Model Y 2022 | BEV adicional |

## 2. Antes / después por variante

Completitud = **misma función que D1** (`d1Coverage`: proporción de requisitos críticos de Catalog v0.2 §8.1 presentes; sin fórmula nueva). Columna "+ EEA/regla": la etiqueta DGT calculada con la regla existente usando **solo** datos EEA (no se atribuye a RDW). "Campos nuevos" = SpecKeys/requisitos que RDW añade y no estaban; "Corroborados" = mismos datos que EEA y coherentes.

| # | Variante (candidato D1) | Identidad antes | Identidad después | Match técnico RDW | GIAVEH | Completitud crítica antes | + EEA/regla | Después | Campos nuevos (RDW) | Estructurales | Corroborados | Conflictos | Derechos |
|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 3 | Volkswagen Golf #3 (ICE_OR_MHEV, 2018) | EXACT | EXACT | EXACT | TAN_AND_TYPE | 23.1 % | 23.1 % | 61.5 % | 8 | 5 | 6 | 0 | EEA ⚠️ 5 · pendientes 16 |
| 1 | Volkswagen Golf #1 (ICE_OR_MHEV, 2018) | EXACT | EXACT | EXACT | TAN_AND_TYPE | 23.1 % | 23.1 % | 61.5 % | 8 | 5 | 6 | 0 | EEA ⚠️ 5 · pendientes 16 |
| 2 | BYD SEAL #2 (BEV, 2025) | EXACT | EXACT | EXACT | TAN_NOT_FOUND | 14.3 % | 21.4 % | 50.0 % | 6 | 5 | 1 | 2 | EEA ⚠️ 5 · pendientes 12 |
| 4 | BYD SEAL #4 (BEV, 2024/2025) | EXACT | EXACT | EXACT | TAN_NOT_FOUND | 14.3 % | 21.4 % | 50.0 % | 6 | 5 | 1 | 2 | EEA ⚠️ 5 · pendientes 12 |
| 76 | Tesla Model 3 #76 (BEV, 2024/2025) | UNCONFIRMED | UNCONFIRMED | EXACT | TAN_NOT_FOUND | 14.3 % | 21.4 % | 50.0 % | 6 | 5 | 3 | 0 | EEA ⚠️ 5 · pendientes 9 |
| 77 | BMW X3 #77 (PHEV, 2022) | UNCONFIRMED | UNCONFIRMED | EXACT | TAN_AND_TYPE | 18.8 % | 25.0 % | 50.0 % | 6 | 5 | 8 | 0 | EEA ⚠️ 8 · pendientes 14 |
| 55 | SEAT León #55 (ICE_OR_MHEV, 2024) | AMBIGUOUS | AMBIGUOUS | TAN_EXTENSION_MISMATCH | TAN_NOT_FOUND | 23.1 % | 23.1 % | 23.1 % | 0 | 0 | 0 | 0 | EEA ⚠️ 5 · pendientes 2 |
| 8 | Hyundai Tucson #8 (ICE_OR_MHEV, 2018/2020) | UNCONFIRMED | UNCONFIRMED | EXACT | TAN_AND_TYPE | 23.1 % | 23.1 % | 61.5 % | 8 | 5 | 6 | 0 | EEA ⚠️ 5 · pendientes 16 |
| 73 | Toyota RAV4 #73 (PHEV, 2025) | UNCONFIRMED | UNCONFIRMED | EXACT | TAN_NOT_FOUND | 18.8 % | 25.0 % | 50.0 % | 7 | 4 | 7 | 0 | EEA ⚠️ 7 · pendientes 14 |
| 81 | Tesla Model Y #81 (BEV, 2022) | UNCONFIRMED | UNCONFIRMED | EXACT | TAN_NOT_FOUND | 14.3 % | 21.4 % | 50.0 % | 5 | 3 | 4 | 0 | EEA ⚠️ 6 · pendientes 9 |

Campos que añade RDW (con identidad técnica EXACT): `dim.length_mm`, `dim.width_mm`, `dim.height_mm` (envolvente de la variante → rango `HOMOLOGATION_FAMILY`), `dim.gross_weight_kg`, `dim.wheelbase_mm` (BEV y RAV4, que la EEA ya no publica desde 2024), `perf.top_speed_kmh`, `pt.cylinders`, **plazas**; estructurales: puertas, tracción, marchas, carrocería (solo AA = sedán) y **norma Euro** → etiqueta DGT `C` en Golf ×2 y Tucson (regla `dgt-label-v1`, sin cambios).

## 3. Indicadores (separados por fuente)

| Indicador | Resultado |
|---|---|
| Variantes evaluadas | 10 |
| Identidades EXACT (comerciales) antes → después | **4 → 4** (nuevas confirmadas: **0**) |
| Identidad técnica EEA ↔ RDW EXACT | **9 / 10** (RDW match rate 90 %) |
| GIAVEH: TAN + tipo encontrados | 4 / 10 (Golf ×2, X3, Tucson); 6 no encontrados (BYD ×2, Tesla ×2, León 2024, RAV4 2025: extensiones de TAN no presentes en un fichero que no se actualiza desde 2023-08) |
| Campos añadidos por RDW | **60** (6–8 por vehículo EXACT, incluida la etiqueta DGT cuando necesitó la norma Euro de RDW) + 42 estructurales |
| Campos corroborados (EEA = RDW) | 42 |
| Observaciones rechazadas | 13 (1 por versión sin extensión exacta, 3 campos "NEDC" anómalos, 9 códigos de caja sin lista oficial) |
| Conflictos EEA ↔ RDW conservados | **4** (BYD SEAL ×2: consumo eléctrico y autonomía) · entre revisiones RDW: 0 |
| Completitud crítica media antes | **18,7 %** |
| + EEA con regla DGT existente (sin RDW) | 22,8 % |
| Después (con RDW) | **50,8 %** (+32,1 puntos atribuibles a RDW; +4,1 a EEA/regla) |
| Campos reutilizables con derechos ⚠️ (EEA, CC BY 4.0) | 56 |
| Campos con derechos pendientes (RDW ❓ con evidencia CC0, IDAE ❓) | 120 |
| Variantes PUBLIC elegibles | **0** |

## 4. Sistema de calidad real (`@vscar/quality`) sobre las variants del catálogo

Golf 2018 `*33` y `*35` (fixtures del catálogo PREVIEW), con los valores RDW convertidos a `SpecValue` DRAFT válidos (cross-market NL → ES, `homologation_match = EXACT`) y la etiqueta DGT `CALCULATED` (S07, regla `dgt-label-v1`). **No se persiste nada**: es una evaluación.

| | `vehicleCompleteness` | Categorías AVAILABLE | Claves críticas sin valor |
|---|---:|---|---|
| Antes | **9,5 %** | Warranty | longitud, anchura, altura, maletero, 0–100, depósito, consumo, etiqueta DGT |
| Después | **26,7 %** | Warranty, **Eco** | maletero, 0–100, depósito (+ precio para Economy) |

- Size y Practicality ya **solo** fallan por `cap.boot_l` (dimensiones y plazas cubiertas).
- 0 conflictos nuevos: la masa RDW (1.301 kg) coincide con la curada.
- Golf `*33` gana además el consumo NEDC de RDW (homologación NEDC, 2017-12); Golf `*35`, el rango WLTP de consumo y CO₂.

## 5. Mercado

- Solo datos técnicos de homologación con identidad EXACT cruzan de NL a ES (`source_market = NL` visible).
- Nada comercial: el registro por matrícula (precio de catálogo NL, BPM, color, matrícula) **no se consulta**.
- La etiqueta DGT se calcula en España con la regla española; RDW solo aporta la norma Euro.

## 6. Qué falta (y de dónde)

| Hueco | Fuente necesaria |
|---|---|
| Identidad comercial (trim) EXACT | CoC / ficha técnica ITV / código oficial en IDAE / documento del fabricante |
| Maletero, 0–100, depósito, garantía, precio, carga AC/DC, potencia de sistema (HEV/PHEV/BEV) | S08 (fabricante) — derechos restringidos o pendientes |
| Consumo CS de PHEV | RDW lo publica para **1 de 10** PHEV de la lista (los demás solo ponderado) → S08/S08-EU |
| Conflicto de consumo/autonomía BYD SEAL | revisión humana (EEA vs RDW) |
