# Architecture Decision Records (ADR)

> Estado: **READY** · 2026-09-24

A partir de la baseline [VSCAR_MASTER_PLAN.md v1.0](../VSCAR_MASTER_PLAN.md), las decisiones arquitectónicas o técnicas que evolucionen durante el desarrollo se documentan aquí, **sin reescribir retrospectivamente la baseline** (salvo cambios estratégicos mayores validados por producto).

También se usa un ADR para añadir cualquier funcionalidad P0/P1 al Alpha (sustituyendo otra y justificando el impacto).

## Formato

Fichero `ADR-NNN-titulo-en-kebab-case.md` con:

```markdown
# ADR-NNN — Título
- Estado: Propuesto | Aceptado | Sustituido por ADR-XXX | Rechazado
- Fecha: AAAA-MM-DD
- Decisores:

## Contexto
## Decisión
## Alternativas consideradas
## Consecuencias (positivas, negativas, riesgos)
## Referencias (secciones del Master Plan, documentos)
```

## Backlog inicial

| ADR | Título | Estado | Referencia en el plan |
|---|---|---|---|
| ADR-001 | vps-first-infrastructure | Propuesto (decisión tomada en baseline) | §44 |
| ADR-002 | mysql-alpha | Propuesto (decisión tomada en baseline) | §33 |
| ADR-003 | iis-reverse-proxy | Propuesto | §44.2 |
| ADR-004 | no-docker-alpha | Propuesto | §44.1, §49 |
| ADR-005 | lang-market-url | Propuesto (decisión tomada en v0.2) | §29 |
| ADR-006 | vscar-id-strategy (`CHAR(36)` vs `BINARY(16)`, canonicalKey) | Propuesto | §11, §33 |
| [ADR-007](ADR-007-reference-vs-used-instance.md) | reference-vs-used-instance + commercial vs technical identity (Homologation) | **ACCEPTED** (2026-09-24) | §9.1, §11 |
| ADR-008 | dataset-storage-strategy (MySQL + raw filesystem) | Propuesto | §33.1 |
| [ADR-009](ADR-009-data-provider-rights.md) | data-provider-rights | **ACCEPTED WITH OPEN LEGAL VERIFICATION** (2026-09-24) | §10.1 |
| ADR-010 | threeui-evaluation | Pendiente de evaluación de licencia | §21 |

No es necesario escribirlos todos de inmediato: se redactan cuando la decisión se ejecuta.
