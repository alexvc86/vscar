# VScar Dataset Core v0.1

> Estado: **SCHEMA VALIDATION COMPLETE — CURATION REVIEW PENDING** · Inicio: 2026-09-24 · Baseline: [VSCAR_MASTER_PLAN.md v1.0](../../VSCAR_MASTER_PLAN.md) §9.4
> Catálogo: validado contra v0.1 → [SPEC_KEY_CATALOG.md v0.2](../SPEC_KEY_CATALOG.md) · Derechos: [DATA_RIGHTS_MATRIX.md v0.2](../DATA_RIGHTS_MATRIX.md) · Resultados: [FINDINGS.md](FINDINGS.md)

**Qué significa este estado**
- Los 10 DC **han cumplido su función**: romper y validar el schema (→ SpecKey Catalog v0.2, ADR-007, ADR-009).
- Siguen siendo **borradores de curación**: no son dataset publicable ni "final dataset".
- Requieren **revisión humana** de conflictos y huecos, y reclasificación con las reglas v0.2 (`source_authority`, `mapping_confidence`, rangos, ciclos `UNDECLARED`, homologaciones).
- **No deben importarse a producción** hasta que el schema v0.2 esté aprobado.

**Objetivo**: 10 Reference Variants reales, deliberadamente difíciles, del **mercado España**, para validar el SpecKey Catalog, el schema y el pipeline **antes** de escalar a 50–80 variants. Esperamos que obliguen a cambiar 3–10 campos del catálogo: eso es un resultado, no un fallo.

## 1. Selección

| ID | Caso | Vehículo (mercado ES) | Motorización objetivo | Generación / fase esperada |
|---|---|---|---|---|
| DC-01 | HEV usado | Toyota RAV4 Hybrid 2021 | 2.5 Hybrid 218 CV 4x2 (o AWD-i 222 CV) | XA50 (5.ª gen.) |
| DC-02 | HEV nuevo | Toyota RAV4 Hybrid actual (a la venta en ES hoy) | HEV equivalente a DC-01 | por resolver: XA50 última fase o nueva generación |
| DC-03 | ICE antiguo | Volkswagen Golf 2018 | 1.5 TSI 130/150 CV (o 1.0 TSI) | Mk7.5 (Golf VII facelift) |
| DC-04 | ICE/MHEV reciente | Volkswagen Golf actual | 1.5 eTSI 150 CV DSG (MHEV) | Mk8.5 (Golf VIII facelift) |
| DC-05 | Premium usado | BMW X3 2018 | xDrive20d 190 CV | G01 |
| DC-06 | SUV generalista reciente | Hyundai Tucson 2023 | 1.6 T-GDI HEV 230 CV | NX4 |
| DC-07 | EV usado | Tesla Model 3 2021 | Standard Range Plus / RWD (versión ES 2021) | Model 3 pre-"Highland" |
| DC-08 | EV reciente | BYD Seal actual | RWD (batería de mayor venta en ES) | 1.ª gen. |
| DC-09 | Compacto antiguo | SEAT León 2018 | 1.5 TSI 130 CV (o 1.0 TSI 115 CV) | Mk3 facelift (5F) |
| DC-10 | Compacto reciente **PHEV** | SEAT León e-HYBRID actual | 1.5 TSI e-HYBRID (PHEV) | Mk4 facelift |

**Ajuste respecto a la propuesta inicial**: DC-10 pasa de "SEAT León reciente" a **SEAT León e-HYBRID** para cubrir **PHEV**, que faltaba en el conjunto y es un diferencial del producto (coste con consumo *charge-sustaining* + % eléctrico, nunca el ponderado). El caso "mismo modelo distinto año" se mantiene (León 2018 ICE vs León actual PHEV, además de Golf y RAV4) y MHEV queda cubierto por DC-04.

## 2. Cobertura de casos obligatorios

| Requisito (§9.4) | Cubierto por |
|---|---|
| NEDC / NEDC-correlated / WLTP | DC-03, DC-05, DC-09 (transición 2017–2018) vs resto WLTP |
| Generación / facelift | DC-03 (Mk7.5), DC-04 (Mk8.5), DC-09 (Mk3 FL), DC-10 (Mk4 FL), DC-01/02 |
| ICE | DC-03, DC-05, DC-09 |
| MHEV | DC-04 |
| HEV | DC-01, DC-02, DC-06 |
| PHEV | DC-10 |
| BEV | DC-07, DC-08 |
| New vs used | DC-01 vs DC-02 · DC-07 vs DC-08 |
| Same model different year | DC-01/02 · DC-03/04 · DC-09/10 |
| Older premium vs newer mainstream | DC-05 vs DC-06 |
| Seguridad histórica (protocolos distintos) | Golf VII (test ~2012), León Mk3 (~2012), X3 G01 (~2017), RAV4 XA50 (~2019), Model 3 (~2019), Golf VIII / León Mk4 (~2019–2020), Tucson NX4 (~2021), Seal (~2023) — años a confirmar |
| Precios históricos | DC-01, DC-03, DC-05, DC-07, DC-09 |
| Equipamiento por trim | todos |

## 3. Reglas de recopilación

1. **Fuentes preferentes**: oficiales (fabricante: fichas técnicas, catálogos, tarifas, notas de prensa; IDAE; EEA; DGT; Euro NCAP). Registrar URL exacta, fecha de consulta y granularidad.
2. **Solo valores vistos en la fuente consultada**. Nada de memoria ni estimaciones. Si no se encuentra: `NOT FOUND` (dato ausente).
3. **Sitios de specs de terceros** (p. ej. km77, ultimatespecs, auto-data): solo para localizar fuentes oficiales o contrastar; si un valor solo aparece ahí se marca `SECONDARY_REFERENCE` y **no es publicable** (derecho *sui generis* de bases de datos).
4. Todo consumo, autonomía y CO₂ con **ciclo** (`NEDC`, `NEDC_CORRELATED`, `WLTP`, `EPA`, `MANUFACTURER`).
5. Seguridad con **autoridad, año de test y protocolo**.
6. Precios con fecha/año de la tarifa, moneda, si incluye impuestos y tipo (`original_list` / `current_new`).
7. Registrar **fricciones del catálogo**: claves que faltan, claves que no encajan, unidades o métodos ambiguos.

## 4. Ficheros

Un fichero por variant: `DC-NN-<slug>.md` con identidad resuelta, tabla de valores con procedencia, precios, seguridad, recalls, cobertura de claves críticas y fricciones (recopilados con las reglas v0.1; la columna *Provenance* usa la nomenclatura v0.1 y se reclasificará en la revisión). Resumen consolidado y decisiones D1–D5 en [FINDINGS.md](FINDINGS.md).

| Fichero | Estado |
|---|---|
| DC-01 … DC-10 | borrador de curación · revisión humana pendiente |
| FINDINGS.md | completo · D1–D5 resueltas |

Estos ficheros son **material de curación** (muestra pequeña). El dataset productivo vivirá en MySQL + `C:\vscar\data\raw\` (§33.1); los fixtures de tests se derivarán de aquí.
