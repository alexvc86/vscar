# VScar — Spain Dataset Import Plan v0.1 (Step D1 → D2)

> Estado: **v0.1 · 2026-10-16** · Entrada: [`d1/curation_candidates.jsonl`](d1/curation_candidates.jsonl) · Candidatos y piloto: [SPAIN_100_VARIANT_CANDIDATES_V0_1](SPAIN_100_VARIANT_CANDIDATES_V0_1.md) · Derechos: [SPAIN_DATA_RIGHTS_AUDIT_V0_1](SPAIN_DATA_RIGHTS_AUDIT_V0_1.md) · Decisión de alcance: [ADR-018](../adr/ADR-018-catalog-target-100-curated-incremental.md)

D1 **no importa nada**. Este plan describe cómo D2 convierte 20 candidatos en 20 ReferenceVariants curadas, sin bajar ningún quality gate y sin tocar las 9 variants existentes.

## 1. Flujo

```text
Official Source → Raw (SHA-256, manifiesto) → Schema inspection → Normalization
      → Identity candidate (D1) → Quality evaluation (D1) → Curation queue (D1: curation_candidates.jsonl)
      → [D2] Revisión humana de identidad → Completar datos S08/S10 con fuente citada
      → [D2] Revisión de derechos → Import DRAFT (append-only, idempotente) → Conflict Engine → PREVIEW
      → [posterior] Aprobación humana/legal → published → PUBLIC
```

## 2. Qué hace D2 con cada candidato del piloto

| Paso | Entrada | Salida | Gate (sin cambios) |
|---|---|---|---|
| 1. Identidad | TAN/Va/Ve del candidato; versiones hermanas | `Homologation` con `identification_confidence` | **EXACT** solo con documento oficial que nombre TAN+Va+Ve (CoC campos 0.2/0.2.1, ficha técnica ITV, código IDAE = Va/Ve, documento del fabricante). Si no se consigue → el candidato queda UNCONFIRMED y **no se importa** como variant técnica |
| 2. Identidad comercial | `Cn` EEA + versiones IDAE enlazadas (por referencia) | `CommercialIdentity` (fabricante, modelo, generación, trim, `model_year`) | generación y trim con fuente; `model_year` tal como lo declara la fuente |
| 3. Datos EEA | `specValues` del candidato | `SpecValue` DRAFT vía el adapter EEA existente (`runEeaImport` con la homologación EXACT) | mapeo v2 sin cambios; **v3 (`E (g/km)`) solo tras aprobación** y con `transformation_version` 3 |
| 4. Datos S08/S10 | ficha técnica / tarifa / CoC | precio, dimensiones, maletero, plazas, 0–100, depósito, carga, garantía (curación `manual` con URL y fecha) | ADR-009: S08 se usa solo como curación manual citada; derechos S08 ❓ → solo PREVIEW |
| 5. Calidad | todos los valores | plausibilidad + conflictos + elegibilidad por categoría | conflictos conservados (Step 7b: ocultar por derechos no resuelve conflictos) |
| 6. Import | bundle validado | filas DRAFT en `vscar_dev` (nunca `vscar_test` ni producción) | idempotente (`raw_ingest`), append-only |

## 3. Piloto (20) — qué falta por candidato

| Grupo | Candidatos | Para EXACT | Para datos críticos |
|---|---|---|---|
| BYD SEAL (EXACT) | #2, #4 | — (verificar la revisión de TAN 2026 si se usa 2026) | precio, dimensiones, maletero, plazas, 0–100, carga AC/DC, batería útil, garantía (S08) |
| Toyota (Yaris ×2, Corolla, RAV4 PHEV) | #27, #48, #56, #73 | CoC o documento ES con Va/Ve | + consumo CS del RAV4 PHEV (S08-EU con homologación EXACT) |
| Kia/Hyundai (Sportage ×2, Tucson) | #5, #9, #8 | CoC (Va `F5P11` / `F5D51`) | + precio histórico 2016–2020 (archivo oficial) |
| Stellantis (208, 308, 3008 ×2) | #20, #22, #26, #57 | documento con Ve (`YHZJ-…`, `YHTK-…`) | + consumo CS 3008 PHEV |
| Renault/Dacia (Clio ×2, Sandero) | #6, #86, #24 | documento con Ve | 2025 = datos EEA provisionales |
| Nissan Qashqai (MHEV indicado) | #7 | documento con Ve + confirmación MHEV/HEV | |
| Mercedes Clase A ×2 | #28, #53 | documento con Ve | + consumo CS A 250 e |
| Tesla Model Y | #81 | CoC (Va `Y6LR`) | precio 2022 archivado, carga |

**Expectativa honesta**: con CoC/fichas ITV disponibles, D2 puede llevar a EXACT la mayoría; sin ellos, solo los 2 BYD SEAL son importables como variants técnicas, y aun así solo en PREVIEW.

## 4. Cerrar el déficit hasta 100 variantes curadas

| Déficit | Acción | Fuente | Riesgo |
|---|---|---|---|
| Identidad: 96 sin EXACT | obtener CoC / fichas ITV de unidades reales (talleres, flotas, concesionarios con permiso) o documentos de homologación; pedir a IDAE que publique Va/Ve en todas las fichas (hoy verificado solo en BYD) | S10, S02, S08 | coste de curación por variant (sin medir: se medirá en el piloto D2) |
| MHEV no distinguible | ficha técnica del fabricante (sistema 48 V) | S08 | derechos S08 ❓ |
| Precio (0/100) | tarifas oficiales vigentes y archivadas (D3) | S08 (+ Wayback del original) | derechos S08 ❓; histórico incompleto |
| Dimensiones/maletero/plazas | ficha técnica / CoC | S08 / S10 | |
| PHEV CS | ficha de otro mercado UE con homologación EXACT (D1) | S08-EU | requiere EXACT |
| Etiqueta DGT | regla `dgt-label-v1` + norma Euro con fuente | S07 + S08 | norma Euro no está en EEA ≤ 2022 |
| 2010–2014 | sin TAN en EEA: solo con CoC | S10 | baja prioridad (estrategia D3) |
| Derechos | ver auditoría: revisión humana/legal S08 (11 fabricantes), S02 (IDAE), S05, S07 | — | sin aprobación, todo queda PREVIEW |

## 5. Reglas que D2 no puede romper

- Los 9 registros existentes no se modifican sin migración o procedimiento de curación explícito (2 candidatos de la lista ya están en el catálogo: Golf 2018 `*33`/`*35`).
- Metodología 2026.7 sin cambios. PUBLIC/PREVIEW sin cambios. Ningún estado de derechos cambia sin evidencia + revisor.
- Nada de IDAE se publica ni se redistribuye mientras S02 siga ❓ (el JSONL de Git solo lleva referencias de fila).
- `curation_candidates.jsonl` no es un seed: se lee, se cura y se importa variant a variant.

## 6. Reproducir D1

```sh
node packages/curation/scripts/d1-acquire.ts   # red: IDAE + EEA (≈ 90 s); brutos en data/raw, manifiestos en docs/data/d1
node packages/curation/scripts/d1-build.ts     # offline, determinista (≈ 15 s): candidatos, inventarios, estadísticas
VSCAR_D1_LOCAL=1 corepack pnpm --filter @vscar/curation test   # verifica brutos ↔ manifiestos y el JSONL
```
