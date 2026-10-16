# VScar — D1.2 D2 Batch Readiness v0.1

> Estado: **clasificado · 0 importables con las reglas vigentes** · 2026-10-16 · Datos: [`d12/d2-batch-readiness.json`](d12/d2-batch-readiness.json), [`d12/expansion-100.json`](d12/expansion-100.json) · Identidad: [D1_2_COMMERCIAL_IDENTITY_AUDIT_V0_1](D1_2_COMMERCIAL_IDENTITY_AUDIT_V0_1.md) · Propuesta: [ADR-019](../adr/ADR-019-technical-identity-without-confirmed-trim.md)

Criterios **existentes** (sin cambios): estados de curación de D1 (`READY_FOR_CURATED_IMPORT` exige identidad EXACT + claves críticas + derechos), schema `ReferenceVariant` (Catalog v0.2 §2.1/§2.4: `trim_name`, `generation_code`, `model_year`, `body_type`, `transmission` obligatorios), PREVIEW/PUBLIC de ADR-013.

## 1. Las 20 candidatas

| # | Candidato | Técnica | Corroboración RDW | Comercial | Completitud crítica (D1 → con RDW) | Conflictos | Derechos | Curación | Publicación | Bloqueo principal |
|---|---|---|---|---|---:|---|---|---|---|---|
| 2 | BYD SEAL 2025 (BEV) | EXACT | EXACT | EXACT | 14.3 % → 50.0 % | abiertos (2) | 3 pendientes | BLOCKED | NOT_ELIGIBLE | duplicado probable de DC-08 (reconciliar, no insertar) |
| 4 | BYD SEAL 2024/2025 (BEV) | EXACT | EXACT | EXACT | 14.3 % → 50.0 % | abiertos (2) | 3 pendientes | NEEDS_IDENTITY_REVIEW | NOT_ELIGIBLE | generación/año-modelo sin fuente |
| 5 | Kia Sportage 2022 (ICE_OR_MHEV) | EXACT | EXACT | PARTIAL | 23.1 % → 61.5 % | — | 2 pendientes | NEEDS_IDENTITY_REVIEW | NOT_ELIGIBLE | acabado no evidenciado + generación/año-modelo sin fuente |
| 6 | Renault Clio 2024/2025 (ICE_OR_MHEV) | EXACT | EXACT | PARTIAL | 23.1 % → 61.5 % | — | 2 pendientes | NEEDS_IDENTITY_REVIEW | NOT_ELIGIBLE | acabado no evidenciado + generación/año-modelo sin fuente |
| 7 | Nissan Qashqai 2024/2025 (MHEV) | EXACT | EXACT | PARTIAL | 15.4 % → 53.8 % | — | 2 pendientes | NEEDS_IDENTITY_REVIEW | NOT_ELIGIBLE | acabado no evidenciado + generación/año-modelo sin fuente |
| 8 | Hyundai Tucson 2018/2020 (ICE_OR_MHEV) | EXACT | EXACT | PARTIAL | 23.1 % → 61.5 % | — | 2 pendientes | NEEDS_IDENTITY_REVIEW | NOT_ELIGIBLE | acabado no evidenciado + generación/año-modelo sin fuente |
| 9 | Kia Sportage 2016/2018 (ICE_OR_MHEV) | EXACT | EXACT | PARTIAL | 23.1 % → 61.5 % | — | 2 pendientes | NEEDS_IDENTITY_REVIEW | NOT_ELIGIBLE | acabado no evidenciado + generación/año-modelo sin fuente |
| 20 | Peugeot 3008 2018/2020 (ICE_OR_MHEV) | EXACT | EXACT | PARTIAL | 15.4 % → 61.5 % | — | 2 pendientes | NEEDS_IDENTITY_REVIEW | NOT_ELIGIBLE | acabado no evidenciado + generación/año-modelo sin fuente |
| 22 | Peugeot 208 2022 (ICE_OR_MHEV) | EXACT | TAN_EXTENSION_MISMATCH | PARTIAL | 23.1 % → 23.1 % | — | 1 pendientes | NEEDS_IDENTITY_REVIEW | NOT_ELIGIBLE | acabado no evidenciado + generación/año-modelo sin fuente |
| 24 | Dacia Sandero 2025 (ICE_OR_MHEV) | EXACT | EXACT | PARTIAL | 23.1 % → 61.5 % | — | 2 pendientes | NEEDS_IDENTITY_REVIEW | NOT_ELIGIBLE | acabado no evidenciado + generación/año-modelo sin fuente |
| 26 | Peugeot 308 2024 (ICE_OR_MHEV) | EXACT | EXACT | EXACT | 23.1 % → 61.5 % | — | 2 pendientes | NEEDS_IDENTITY_REVIEW | NOT_ELIGIBLE | generación/año-modelo sin fuente |
| 27 | Toyota Yaris 2022/2024 (ICE_OR_MHEV) | EXACT | EXACT | PARTIAL | 23.1 % → 61.5 % | — | 2 pendientes | NEEDS_IDENTITY_REVIEW | NOT_ELIGIBLE | acabado no evidenciado + generación/año-modelo sin fuente |
| 28 | Mercedes-Benz Clase A 2022/2024 (ICE_OR_MHEV) | EXACT | EXACT | PARTIAL | 23.1 % → 61.5 % | — | 2 pendientes | NEEDS_IDENTITY_REVIEW | NOT_ELIGIBLE | acabado no evidenciado + generación/año-modelo sin fuente |
| 48 | Toyota Yaris 2022/2024/2025 (HEV_OR_MHEV) | EXACT | EXACT | PARTIAL | 15.4 % → 53.8 % | — | 2 pendientes | NEEDS_IDENTITY_REVIEW | NOT_ELIGIBLE | acabado no evidenciado + generación/año-modelo sin fuente |
| 53 | Mercedes-Benz Clase A 2020 (PHEV) | EXACT | EXACT | PARTIAL | 18.8 % → 50.0 % | — | 2 pendientes | NEEDS_IDENTITY_REVIEW | NOT_ELIGIBLE | acabado no evidenciado + generación/año-modelo sin fuente |
| 56 | Toyota Corolla 2022 (HEV_OR_MHEV) | EXACT | EXACT | PARTIAL | 15.4 % → 53.8 % | — | 2 pendientes | NEEDS_IDENTITY_REVIEW | NOT_ELIGIBLE | acabado no evidenciado + generación/año-modelo sin fuente |
| 57 | Peugeot 3008 2022 (PHEV) | EXACT | EXACT | PARTIAL | 18.8 % → 50.0 % | — | 2 pendientes | NEEDS_IDENTITY_REVIEW | NOT_ELIGIBLE | acabado no evidenciado + generación/año-modelo sin fuente |
| 73 | Toyota RAV4 2025 (PHEV) | EXACT | EXACT | PARTIAL | 18.8 % → 50.0 % | — | 2 pendientes | NEEDS_IDENTITY_REVIEW | NOT_ELIGIBLE | acabado no evidenciado + generación/año-modelo sin fuente |
| 81 | Tesla Model Y 2022 (BEV) | EXACT | EXACT | PARTIAL | 14.3 % → 50.0 % | — | 2 pendientes | NEEDS_IDENTITY_REVIEW | NOT_ELIGIBLE | acabado no evidenciado + generación/año-modelo sin fuente |
| 86 | Renault Clio 2020 (HEV_OR_MHEV) | EXACT | EXACT | PARTIAL | 7.7 % → 53.8 % | — | 2 pendientes | NEEDS_IDENTITY_REVIEW | NOT_ELIGIBLE | acabado no evidenciado + generación/año-modelo sin fuente |

Completitud crítica media del lote: **18,8 % → 54,6 %** (D1.1, RDW). D1.2 no añade datos: su aporte es identidad y derechos.

### Bloqueos de schema comunes (por qué 0 importables)

| Campo obligatorio | Disponible con evidencia | Fuente que lo daría |
|---|---|---|
| `generation_code` | **0 / 20** | fabricante (S08) / editorial con cita |
| `model_year` | **0 / 20** (la EEA da año de matriculación, no año-modelo) | S08 / CoC |
| `trim_name` | 3 / 20 (#2, #4, #26) | CoC / IDAE con código / designación EEA única |
| `body_type` | 2 / 20 (BYD SEAL, código UE AA = sedán) | RDW AA/AD/AE; resto ambiguo (AB/AC/AF) |
| `transmission` | BEV (1 marcha RDW); ICE solo como texto literal ("6 VEL MAN", "EAT8") sin glosario | Traficom `vaihteisto` (CC BY, no adquirido) / S08 |

## 2. Clasificación

| Estado | Candidatas | Detalle |
|---|---:|---|
| `READY_FOR_CURATED_IMPORT` | **0** | — |
| `NEEDS_IDENTITY_REVIEW` | 19 | 17 comercial PARTIAL; las 3 EXACT siguen sin generación/año-modelo |
| `NEEDS_DATA_COMPLETION` (además) | 20 | maletero, 0–100, precio, garantía (+ depósito, carga, potencia de sistema, CS PHEV según powertrain) |
| `NEEDS_RIGHTS_REVIEW` (además) | 20 | S08 (datos que faltan); S11 en 19; S02 en #2/#4 (evidencia del acabado) |
| `BLOCKED` | 1 | #2 BYD SEAL: duplicado probable de DC-08 → reconciliación, no inserción |
| PREVIEW importable con reglas vigentes | **0** | — |
| PUBLIC elegible | **0** | — |

## 3. Primer lote realmente importable (propuesta, sin rebajar gates)

**Hoy: 0.** Dos caminos, ambos explícitos:

| Camino | Qué hace falta | Candidatas | Resultado |
|---|---|---|---|
| **A — reglas vigentes** | un curador cita (S08, PREVIEW) generación y año-modelo; body/caja con evidencia | **#26 Peugeot 308** (comercial EXACT con fuente CC BY; sin conflictos) y **#4 BYD SEAL Excellence AWD** (comercial EXACT vía IDAE ❓; conflicto Range abierto) + reconciliar **#2 con DC-08** | **2 variantes nuevas + 1 reconciliación** en PREVIEW |
| **B — ADR-019 aprobado** | identidad técnica EXACT + comercial ≥ PARTIAL + "acabado no confirmado" visible | 18 (19 con RDW EXACT − #2 duplicado) + #22 solo con datos EEA | hasta 18–19 en PREVIEW, nunca PUBLIC hasta otra decisión |

## 4. Los 100 (recalculado, sin extrapolar)

| Indicador | Resultado |
|---|---:|
| Identidad técnica EXACT corroborada (EEA + RDW) | **95** |
| Identidad técnica EXACT solo EEA | 5 |
| Comercial EXACT | **3** |
| Comercial PARTIAL | 97 |
| Comercial desconocida (UNCONFIRMED) | 0 |
| Completitud crítica media (con RDW) | 54,3 % |
| Derechos: fuentes con decisión pendiente | S11 (95), S08 (100), S02 (2) |
| Conflictos abiertos | 2 candidatos (BYD SEAL ×2) |
| Duplicados/solapes con el catálogo | 3 (Golf ×2 `DUPLICATE`, SEAL #2 probable) + 1 identidad parcial (Model 3 #88) |
| Preview ready (reglas vigentes) | **0** |
| Public ready | **0** |

**Familias que pueden cerrarse antes**:
- **Peugeot** (208, 308, 3008). La designación oficial EEA trae carrocería, motor, caja y acabado.
  - 308 #26 ya es EXACT.
  - El resto tiene conjuntos de acabados: hace falta decidir cómo mostrarlos (ADR-019).
- **BYD SEAL**. El código IDAE da el acabado, pero quedan pendientes los derechos S02 y el conflicto Range.
- **Mercedes Clase A**. La designación "A 200 D", "A 250 E" da motor, pero no línea de acabado.
- **Resto** (designación = modelo). Necesita CoC/ficha técnica u otra fuente oficial con acabado.

Objetivo incremental de ADR-018 sin cambios.
