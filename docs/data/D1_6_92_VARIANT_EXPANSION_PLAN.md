# VScar — D1.6 Plan de ampliación a 92 (y objetivo 100)

> Estado: **evaluado · nada importado fuera de los 18** · 2026-10-21 · Manifiesto: [`d16/expansion-92.json`](d16/expansion-92.json) (candidata, TAN, Va, Ve, solapamiento, derechos, claves críticas, conflictos, elegibilidad)

## 1. Elegibilidad para la capa técnica (misma regla que el piloto)

| Resultado | N | Candidatas |
|---|---:|---|
| Elegibles | **92** | 18 ya curadas + **74** pendientes de importar |
| Duplicado del catálogo existente | 3 | #1, #3 (Golf 2018, DUPLICATE) · #2 (BYD SEAL, PROBABLE_DUPLICATE) → reconciliar, no insertar |
| RDW no corrobora la clave exacta | 5 | #13, #22, #50, #55 (extensión TAN distinta) · #21 (sin coincidencia) |

Sobre las 92 elegibles:
- derechos: S01 condicional en 92; S11 pendiente en 92; S13 pendiente en 57; S02 pendiente en 1;
- conflictos: 9 tienen valores en conflicto, que se conservan;
- completitud crítica media de la capa: 48,3 %.

## 2. Siguiente lote

| Paso | Propuesta |
|---|---|
| Tamaño | **74** (todas las elegibles restantes): mismo importador idempotente, mismo plan (`d16-build.ts` añadiendo el lote) |
| Condición previa | revisar el piloto en `/internal/catalog` (18 vehículos) y firmar o aplazar la ficha S11/S13 ([revisión](D1_6_OFFICIAL_SOURCE_RIGHTS_REVIEW.md)). Sin firma también se puede curar (PENDING solo interno), pero nada se promueve |
| Reconciliación | #1, #2 y #3: completar el TAN con extensión de las variantes existentes (migración/curación explícita), sin duplicar |
| Las 5 sin RDW | se quedan en investigación hasta tener corroboración (otra revisión RDW o CoC) |
| Objetivo 100 | 92 técnicos + 3 reconciliados = 95. Las 5 restantes **no se fabrican**: requieren evidencia |

## 3. Qué falta para que alguno sea seleccionable

Generación y año-modelo con evidencia, acabado EXACT, maletero, 0–100, precio y garantía con derechos, y aprobación S11/S13. Las fuentes gratuitas no los cubren (D1.3–D1.5). El precio de compra manual del usuario cubre la parte económica de la comparación sin precio oficial.
