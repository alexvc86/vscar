# VScar — D1.8 Reglas de promoción a PREVIEW

> Estado: **reglas definidas · 0 promociones** · 2026-10-22
> - **Revisión reproducible**: `node packages/curation/scripts/d18-promotion-review.ts` → [`d18/promotion-review.json`](d18/promotion-review.json).
> - **Decisión**: [ADR-020 §6](../adr/ADR-020-simplified-model-selection.md).

## 1. Principio

Una homologación técnica curada **no es** una `ReferenceVariant` (ADR-019 B). Solo pasa a serlo con una **promoción explícita**: una por una, con revisión y sin proceso automático. Además tiene que superar **las cinco puertas**. PUBLIC no cambia: sigue exigiendo derechos verificados o condicionales en los campos que muestra.

## 2. Puertas

| # | Puerta | Requisito |
|---|---|---|
| 1 | TECHNICAL_IDENTITY | TAN completo con extensión + Va + Ve, EXACT y corroborado (D1.7) |
| 2 | RIGHTS | ninguna fuente DENIED. Las categorías se publican con los derechos que el canal admite: PREVIEW admite PENDING; PUBLIC solo VERIFIED o CONDITIONAL |
| 3 | QUALITY | sin conflicto abierto en una clave que use alguna categoría |
| 4 | CATEGORY_ELIGIBILITY | al menos una categoría de comparación activable con datos utilizables |
| 5 | CONFIGURATION_RESOLUTION | `ReferenceVariant` exige `generation_code`, `model_year`, `trim_name` y `commercial_name`. Deben estar **verificados con evidencia**; nunca se derivan de la matrícula ni de la homologación |

## 3. Revisión de las 9 candidatas de D1.7

| # | Vehículo | Identidad técnica | Derechos | Calidad | Categorías | Resolución | Decisión |
|---|---|---|---|---|---|---|---|
| 5 | Kia Sportage | ✅ | ✅ S01 condicional | ✅ | ✅ Economy | ❌ generación y año-modelo sin fuente; acabado sin confirmar | NO PROMOVIDA |
| 6 | Renault Clio | ✅ | ✅ | ✅ | ✅ Economy | ❌ idem | NO PROMOVIDA |
| 7 | Nissan Qashqai | ✅ | ✅ | ✅ | ✅ Economy | ❌ idem | NO PROMOVIDA |
| 26 | Peugeot 308 | ✅ | ✅ | ✅ | ✅ Economy | ❌ generación y año-modelo sin fuente (acabado EXACT) | NO PROMOVIDA |
| 27 | Toyota Yaris | ✅ | ✅ | ✅ | ✅ Economy | ❌ | NO PROMOVIDA |
| 28 | Mercedes-Benz Clase A | ✅ | ✅ | ✅ | ✅ Economy | ❌ | NO PROMOVIDA |
| 48 | Toyota Yaris | ✅ | ✅ | ✅ | ✅ Economy | ❌ | NO PROMOVIDA |
| 56 | Toyota Corolla | ✅ | ✅ | ✅ | ✅ Economy | ❌ | NO PROMOVIDA |
| 81 | Tesla Model Y | ✅ | ✅ | ✅ | ✅ Economy, Range | ❌ | NO PROMOVIDA |

| Resultado | Nº |
|---|---:|
| Candidatas | 9 |
| **Promovidas** | **0** |
| Bloqueadas por identidad (puerta 5) | 9 |
| Bloqueadas por derechos | 0 |
| Bloqueadas por datos | 0 |
| Bloqueadas por conflictos | 0 |

**Las nueve superan todas las puertas salvo una**: no existe fuente para la generación ni para el año-modelo. Completarlos desde la matriculación sería inventarlos.

## 4. Cómo desbloquear (decisión humana, fuera de D1.8)

1. **Fuente o revisión editorial con evidencia** para la generación y el año-modelo de cada candidata: catálogo del fabricante archivado, ficha técnica o documento de homologación. Lo registraría un curador y quedaría trazado.
2. **O un ADR** que añada a `ReferenceVariant` un «año de referencia» con base explícita (p. ej. `REGISTRATION_OBSERVED`), con su efecto en las comparaciones entre años.
3. **Después**: ejecutar la promoción una a una, con dry-run y auditoría como en D1.7. Las 9 siguen siendo solo candidatas a revisión.
