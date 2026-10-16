# ADR-019 — Variantes con identidad técnica exacta y acabado no confirmado

- **Estado**: **PROPOSED** (2026-10-16) — requiere decisión de producto; nada implementado
- **Decisores**: producto + data workstream (+ legal para el uso de S08 en identidad)
- **Relacionado**: [ADR-007](ADR-007-reference-vs-used-instance.md) · [ADR-013](ADR-013-catalog-publication-and-routing.md) · [ADR-018](ADR-018-catalog-target-100-curated-incremental.md) · [D1_2_COMMERCIAL_IDENTITY_AUDIT_V0_1](../data/D1_2_COMMERCIAL_IDENTITY_AUDIT_V0_1.md) · [D1_2_D2_BATCH_READINESS_V0_1](../data/D1_2_D2_BATCH_READINESS_V0_1.md)

## Contexto

Con EEA + RDW, 95 de los 100 candidatos tienen identidad **técnica** exacta confirmada en dos registros oficiales, pero solo 3 tienen identidad **comercial** exacta (acabado). El schema `ReferenceVariant` (Catalog v0.2 §2.1) exige `trim_name`, `generation_code` y `model_year`, y **ninguna fuente oficial abierta da generación ni año-modelo**. Resultado: 0 de 20 candidatos D2 importables sin inventar.

Además, D1.2 demostró que una versión técnica se vende con **varios acabados** (Peugeot 3008 PHEV: 5), así que el acabado no es una propiedad 1:1 de la variante técnica.

## Propuesta

1. Permitir una `ReferenceVariant` cuya identidad comercial sea **PARTIAL**: `trim_name` y `generation_code` opcionales con estado explícito (`commercial_identity_confidence = PARTIAL`, `trim_status = UNCONFIRMED | SET`), `model_year` sustituido por el **periodo de matriculación observado** (etiquetado como tal, nunca como año-modelo).
2. Mostrar en la UI la **designación oficial literal** (p. ej. "Volkswagen Golf · 1.5 TSI 96 kW · matriculado 2018 · acabado no confirmado") y, si existe, el **conjunto** de acabados evidenciado ("vendido como Active o Active Pack").
3. Solo en **PREVIEW** al principio. PUBLIC seguiría exigiendo identidad comercial EXACT hasta una segunda decisión con datos de uso.
4. Ningún dato dependiente del acabado (equipamiento, precio de catálogo, garantía si varía) se asigna a una variante PARTIAL.
5. Sin cambios en metodología, motores ni gates técnicos/derechos.

## Alternativas

- **Mantener el schema** (estado actual): solo variantes con CoC/ficha o curación manual S08 por candidato; muy lento (D1: 0 % alcanzan el criterio).
- **Rellenar acabado/generación con conjeturas**: rechazada (anti-invención).
- **Usar la designación RDW**: rechazada (lista de nombres permitidos, no identidad).

## Consecuencias si se aprueba

- Positivas: hasta 18 de los 20 D2 importables en PREVIEW con datos técnicos oficiales trazables (ver readiness).
- Negativas: migración de schema (`vehicle-schema`, `db`), selector y textos; el usuario ve "acabado no confirmado".
- Riesgos: que se interprete un acabado por defecto; mitigado mostrando siempre la designación oficial literal y el estado.
