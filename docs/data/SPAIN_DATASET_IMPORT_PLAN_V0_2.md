# VScar — Spain Dataset Import Plan v0.2 (ADR-019 B: curación técnica → catálogo seleccionable)

> Estado: **v0.2 · 2026-10-21** · Sustituye en la práctica a [v0.1](SPAIN_DATASET_IMPORT_PLAN_V0_1.md) (se conserva sin cambios) · Arquitectura: [D1_6_TECHNICAL_CURATION_ARCHITECTURE](D1_6_TECHNICAL_CURATION_ARCHITECTURE.md) · Decisión: [ADR-019](../adr/ADR-019-technical-identity-without-confirmed-trim.md) (ACCEPTED, B)

## 1. Qué cambia respecto a v0.1

v0.1 exigía convertir cada candidata directamente en una `ReferenceVariant` completa. Eso daba **0 importables**, porque generación y año-modelo no tienen fuente. v0.2 separa dos importaciones:

```text
Official sources (EEA S01 · RDW S11 · Traficom S13)  →  Raw (SHA-256)  →  Identity (TAN+Va+Ve EXACT, RDW EXACT, sin duplicado)
   → CURATED TECHNICAL DATASET  (curated_*; observaciones con procedencia, derechos, calidad y conflictos; idempotente)
   → [revisión humana + reglas del canal]  →  PROMOCIÓN EXPLÍCITA  →  SELECTABLE REFERENCE CATALOG (reference_variants)
Research (S14–S19, catálogos)  →  data/research/  (nunca en curated_* ni en el selector)
```

## 2. Fase A — capa técnica (implementada)

| Paso | Herramienta | Estado |
|---|---|---|
| Plan determinista | `node packages/curation/scripts/d16-build.ts` | ✅ |
| Importación idempotente/reanudable | `node --env-file=.env packages/db/scripts/technical-import.ts` | ✅ 18 en `vscar_dev` |
| Diagnóstico privado | `/internal/catalog` (Basic auth, solo PREVIEW) | ✅ |
| Ampliación | 74 elegibles restantes ([plan](D1_6_92_VARIANT_EXPANSION_PLAN.md)) | ⏳ tras revisar el piloto |

## 3. Fase B — promoción al catálogo seleccionable (por diseñar)

Requisitos (sin cambios en los gates):
- **Identidad comercial**: generación y año-modelo con evidencia, y acabado EXACT. Si se decide permitir PARTIAL en PREVIEW, hará falta otra decisión de ADR.
- **Claves críticas** de las categorías Alpha con derechos del canal.
- **Plausibilidad y conflictos** revisados.
- **Derechos**: PREVIEW admite pendientes, PUBLIC exige verificados o condicionales.

La promoción crea una `ReferenceVariant` nueva enlazada a la homologación exacta, sin reutilizar valores de investigación.

## 4. Fuera de alcance

Fuentes de pago (JATO, EV Database…), Adevinta, scraping, VPS y cambios de metodología. El precio oficial sigue sin fuente; en la comparación lo cubre el **precio de compra introducido por el usuario** (Step D1.6).
