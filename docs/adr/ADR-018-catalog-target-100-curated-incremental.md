# ADR-018 — Objetivo de catálogo Alpha: 100 ReferenceVariants curadas, de forma incremental

- **Estado**: ACCEPTED (2026-10-16) — objetivo fijado por producto en el brief de Step D1; este ADR registra el cambio de alcance y sus límites
- **Fecha**: 2026-10-16
- **Decisores**: producto + data workstream
- **Relacionado**: [VSCAR_MASTER_PLAN.md v1.0](../VSCAR_MASTER_PLAN.md) §8.1, §9.3, §10.1 · [ADR-007](ADR-007-reference-vs-used-instance.md) · [ADR-009](ADR-009-data-provider-rights.md) · [ADR-013](ADR-013-catalog-publication-and-routing.md) · [SPAIN_100_VARIANT_CANDIDATES_V0_1](../data/SPAIN_100_VARIANT_CANDIDATES_V0_1.md) · [SPAIN_DATASET_IMPORT_PLAN_V0_1](../data/SPAIN_DATASET_IMPORT_PLAN_V0_1.md)

## Contexto

La baseline fija para el Alpha **15–25 familias y ~50–80 reference variants**. El brief de Step D1 amplía el objetivo a **100 ReferenceVariants reales** (15–25 familias, 2015–2026 prioritario, varios powertrains, new y used). Es un cambio material de alcance (+25–100 % de curación) y la baseline no se reescribe (principio de baseline).

Step D1 mostró con datos que:
- Hay candidatos reales de sobra (1.907 clústeres técnicos EEA en 25 familias), pero **solo 5 tienen identidad EXACT** demostrable hoy.
- **Ningún** candidato tiene sus claves críticas completas sin datos del fabricante (precio, dimensiones, maletero, plazas, 0–100, carga, garantía).
- El reparto ICE/MHEV/HEV no es verificable con fuentes oficiales públicas (EEA homologa MHEV como ICE o NOVC_HEV).

## Decisión

1. El objetivo de catálogo del Alpha pasa a **100 ReferenceVariants curadas** como meta **incremental**, en lotes (D2 = 20; siguientes lotes de 20–30).
2. **Los quality gates no cambian**: identidad EXACT para engines y PUBLIC, claves críticas por categoría (Catalog v0.2 §8), derechos por fuente (ADR-009/ADR-013), conflictos conservados. La cifra 100 nunca justifica bajar un gate.
3. La distribución por powertrain (ICE 35 / MHEV 15 / HEV 20 / PHEV 10 / BEV 20) es **orientativa**; ICE y MHEV se gestionan como un bloque de 50 hasta que S08 los separe.
4. El rango de la baseline (50–80) sigue siendo el **mínimo** para declarar el catálogo Alpha suficiente; 100 es el objetivo.
5. Un candidato no es una variant: la lista de D1 (`curation_candidates.jsonl`) no es un seed; cada variant se cura e importa individualmente.

## Alternativas consideradas

- **Mantener 50–80**: menos curación, pero el brief de producto pide más cobertura new/used. Se conserva como mínimo.
- **Llegar a 100 importando candidatos UNCONFIRMED**: rechazada (ADR-007; HOMOLOGATION_MATCH_REPORT).
- **Contratar un proveedor comercial** para completar datos: no decidido; solo ante bloqueo crítico demostrado (ADR-009 §2). D1 documenta los bloqueos (precio histórico, identidad sin CoC).

## Consecuencias

- **Positivas**: más comparaciones new/used posibles; lista priorizada reproducible para curar por lotes.
- **Negativas**: más carga de curación manual (CoC/fichas) y más revisión de derechos S08.
- **Riesgos**: presión por "llegar a 100" → mitigado por el punto 2 y por informar siempre el déficit exacto (verificadas vs candidatas).
