# VScar — New/Used Golden Cases v0.1 (Step 8c)

> Estado: **15/15 PASS** · 2026-10-16 · Test: `apps/web/test/new-used-golden.test.ts` (22 aserciones de negocio) + `packages/decision-engine/test/used-golden.test.ts` + E2E `new-used-8c.spec.ts`

Catálogo de validación (mismo contrato que MySQL). Fecha de evaluación `2026-10-15` salvo indicación. Golf Style 1.5 eTSI nuevo = **38.850 €** de catálogo (el brief usaba 40.000 €; el caso sintético 40.000 vs 28.000 € del engine sigue en `used-golden`).

| ID | Caso | Comprobación | Estado |
|---|---|---|---|
| G01 | Golf NUEVO vs Golf USADO (28.000 €, 84.000 km, 2019, historial parcial) | misma capacidad técnica y coste de uso; compra 38.850 / 28.000 €; coste conocido −10.850 €; Economic Fit `PRACTICAL_TIE` sin líder; break-even `NO_BREAK_EVEN`; nombres "Golf nuevo / usado" (ES) y "(new) / (used)" (EN) en todo; información MEDIA ≠ confianza BAJA; huecos fuera de tradeoffs | PASS |
| G02 | Dos Golf usados (precio, km, matriculación, garantía, historial distintos) | identidades distintas; señales independientes (garantía limitada en uno, km altos para la edad en otro); "usado A / usado B" | PASS |
| G03 | BEV usado, SOH desconocido | hueco + verificación; ninguna señal de batería "baja"; autonomía WLTP = la de referencia | PASS |
| G04 | BEV usado, SOH 91 % | solo nota declarada; autonomía WLTP intacta | PASS |
| G05 | Km por encima del máximo | FAIL del usado; el nuevo es la única opción completa | PASS |
| G06 | Km desconocido con máximo exigido | UNCONFIRMED (+ verificación del requisito) | PASS |
| G07 | Los dos incumplen | NO_FULL_MATCH; cercano solo informativo | PASS |
| G07b | Problemas y daños declarados sin requisito | señales ATTENTION; Practical Fit PASS (sin FAIL inventado) | PASS |
| G07c | Cinco requisitos de usado activos | nunca aplican al coche nuevo | PASS |
| G08 | Sin precio del usado | sin compra, sin coste conocido ni break-even; coste de uso intacto; mensaje "falta el precio" | PASS |
| G09 | NEDC vs WLTP con usado | economía NOT_COMPARABLE; break-even UNAVAILABLE; sin líder | PASS |
| G10 | Mismo par, horizonte 3 vs 8 años | el coste conocido sigue al horizonte; la compra no; robustez calculada | PASS |
| G11 | Swap | resultado espejo; hechos y costes siguen a su coche | PASS |
| G12 | Enlace con fecha antigua | misma edad (39–40 meses) cada vez que se abre | PASS |
| G13 | Actualizar la fecha (2027-10-15) | edad 51–52 meses; garantía calculada pasa a vencida; hechos declarados intactos | PASS |
| G14 | New/new | sin bloque usado; resultado del engine idéntico (regresión completa de 8a en `regression-8a.test.ts`) | PASS |
| G15 | Paridad de idioma | vista neutra; ES y EN se traducen desde el catálogo con el mismo resultado lógico | PASS |

Regresiones de 8a/8b que siguen en verde: `regression-8a.test.ts` (salida completa new/new), `logic-golden.test.ts`, `used-comparison.test.ts`, `used-params.test.ts`.
