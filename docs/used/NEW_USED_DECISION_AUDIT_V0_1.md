# VScar — New/Used Decision Audit v0.1 (Step 8c)

> Estado: **PASS** · 2026-10-16 · Casos: [NEW_USED_GOLDEN_CASES_V0_1](NEW_USED_GOLDEN_CASES_V0_1.md) · Integración: [USED_COMPARISON_INTEGRATION_V0_1](USED_COMPARISON_INTEGRATION_V0_1.md) · Metodología **2026.7 (sin cambios)**

Paso de estabilización: se auditó **lo que lee la persona** (HTML del servidor en ES y EN para 8 escenarios, más los 15 casos dorados), no solo los enums del engine. Regla: no se aprueba una página matemáticamente correcta que comunique una conclusión equivocada.

## 1. Método

1. **Fase A (sin cambios)**: inventario de salidas por capítulo (VS, resultado, coste de uso, encaje práctico, este usado, tradeoffs, confianza) con `next start` + MySQL `vscar_dev`, ES y EN; línea base de rendimiento.
2. **Fase B**: correcciones (abajo), cada una con su prueba de regresión.
3. **Fase C**: engines, MySQL, web, E2E, mediciones repetidas, paridad ES/EN y servidor/cliente.

## 2. Hallazgos y correcciones

| # | Hallazgo (visible) | Causa raíz | Corrección | Regresión |
|---|---|---|---|---|
| F1 | Golf nuevo vs Golf usado sin `<title>`, descripción ni Open Graph | `generateMetadata` cargaba el par **sin** las condiciones de la URL → misma variant = `SAME_VEHICLE` | carga con `parsePairConditions`; título con nombres por condición | E2E `new-used-8c` (título exacto ES/EN) |
| F2 | "Volkswagen Golf A / Golf B" en títulos, encabezados y frases | nombres de engine neutros (8b) mostrados tal cual | alias de PRESENTACIÓN por condición (`Golf nuevo / usado`; EN `Golf (new) / (used)`; dos usados: `usado A / B`) en la UI y dentro de los mensajes del engine (`aliases` en la traducción); los nombres internos no cambian | golden G01/G02 + E2E (`main` sin "Golf A/B") |
| F3 | Chip "Vista de costes conocidos" sobre las tarjetas de **coste de uso** | etiqueta heredada de 7c | chip "Coste de uso: energía"; el coste conocido vive en su bloque | E2E G01 |
| F4 | Costes conocidos lado a lado con ciclos NEDC vs WLTP | el bloque no miraba la comparabilidad | aviso "no comparables entre sí; solo lo es el precio de compra"; sin punto de equilibrio | golden G09 |
| F5 | La nota citaba el "punto de equilibrio", que la página no mostraba | break-even solo en el engine | se muestra el break-even del Economics Engine tal cual (`NO_BREAK_EVEN`, rango de años, `UNCERTAIN` con mínimo, "más allá de tu horizonte"); nunca se fabrica | golden G01/G08/G09 |
| F6 | Datos desconocidos listados como "Lo que sacrificas", con "Solo diferencias menores" debajo de "sin garantía" | Why Not incluía señales `INFORMATION_GAP`; `onlyMinor` ignoraba las señales de la unidad | Why Not/tradeoffs solo con hechos conocidos (`ATTENTION`); los huecos van a verificación y al capítulo del usado; `onlyMinor` no se afirma con señales de la unidad. **Cambio de salida del engine solo para usados** (new/new idéntico) | `used-golden` (decision) + golden G01 + E2E |
| F7 | "Confianza de la información: MEDIA" con el mismo medidor que la confianza de la recomendación | vocabulario y visual compartidos | "Información sobre esta unidad" con chip propio + "no es la fiabilidad del coche ni la confianza de la recomendación"; línea separada en el resultado; textos del engine reformulados ("Información sobre la unidad…") | golden G01 + E2E |
| F8 | "Comprueba esto…" mezclaba las comprobaciones de los dos coches | la vista perdía el participante | verificación agrupada por coche (`verifyBySide`) | E2E G01 |
| F9 | `eval` sin explicar ni forma de actualizarla | pendiente de 8b | bloque "Fecha de evaluación" (capítulo del usado y "Cómo lo calculamos") + **Actualizar análisis a hoy** (preserva coches, hechos y escenario; dice qué cambia) | E2E `evaluation date` + golden G12/G13 |
| F10 | Tras cambiar la unidad (misma ruta, otra query) quedaban **dos `<main>`** montados | `key` del `<main>` con las condiciones (8b) en una navegación cliente donde solo cambia la query | `key` por par en `<main>`; el reinicio por unidad, en `LiveDecision` (quien tiene estado) | E2E (un solo `main`/`#result-title`) |
| F11 | Tras cambiar una unidad, la atención no iba al resultado | — | `#result` + foco en el titular (`ArrivalFocus`, remonta por unidad) | E2E |

Sin hallazgos: requisitos de usado (FAIL / UNCONFIRMED / PASS, nunca en el coche nuevo), NO_FULL_MATCH (cercano solo informativo), garantía calculada (> 0 sin confirmar, 0 = vencida cierta), SOH (no aplica en ICE/HEV/MHEV, nunca autonomía × SOH), identidad de participantes y swap.

## 3. Interpretación económica (se mantiene la metodología)

| Concepto | Qué es | Dónde |
|---|---|---|
| **A · Desembolso inicial** | precio de compra (catálogo si nuevo, precio solicitado si usado; nunca un precio de catálogo como precio de un usado) | bloque "Compra y coste conocido"; diferencia "requiere un desembolso inicial X € menor" |
| **B · Coste de uso** | energía (combustible / electricidad) al horizonte — **base del Economic Fit** | tarjetas "Coste de uso: energía" |
| **C · Coste conocido** | A + energía al horizonte; **no** es un coste total de propiedad (sin mantenimiento, seguro, impuestos, depreciación ni reventa) | mismo bloque, con lo que incluye ("compra + combustible") y lo que no |

El Economic Fit sigue basado en el coste de uso: un precio de compra menor **nunca** convierte por sí solo al usado en ganador económico (G01: `PRACTICAL_TIE`, sin líder). El break-even = sobreprecio / ahorro anual de energía; sin ahorro → `NO_BREAK_EVEN` ("esa diferencia no se recupera"); con precio ausente o ciclos distintos → no se muestra.

## 4. Matriz de experiencia (contenido visible)

| Caso | Resultado lógico | Mensaje visible (ES) | Riesgo de confusión | Estado |
|---|---|---|---|---|
| Nuevo vs usado, misma variant | empate práctico; uso igual; compra −10.850 € | "Los dos son la misma variante técnica… El Volkswagen Golf usado requiere un desembolso inicial 10.850 € menor; eso no cambia el coste de uso." | leer el precio como ventaja económica / "Golf A/B" | PASS |
| Coste de uso igual, precio distinto | Economic Fit PRACTICAL_TIE; NO_BREAK_EVEN | "El Volkswagen Golf nuevo cuesta 10.850 € más de comprar y no gasta menos al año en energía: con este uso, esa diferencia no se recupera." | "ahorrarás 10.850 €" | PASS |
| Usado con km desconocido | UNCONFIRMED (si hay km máximos); hueco de información | "No se puede confirmar tu requisito de kilometraje…" · "No se ha indicado el kilometraje" (Datos pendientes) | leerlo como defecto | PASS |
| Usado BEV con SOH bajo | señal ATTENTION, verificación; autonomía WLTP intacta | "Salud de batería declarada del 65 %, por debajo del 70 %" · "Pide un informe independiente de la batería…" | "la batería fallará" / autonomía recortada | PASS |
| Usado BEV sin SOH | hueco; información como mucho MEDIA | "Estado de salud de la batería desconocido" · "Comprueba la salud de la batería…" | — | PASS |
| Los dos incumplen requisitos | NO_FULL_MATCH; cercano informativo | "Ninguno cumple completamente tus requisitos… Opción más cercana (no es una recomendación)" | leer el cercano como recomendación | PASS |
| Requisito con dato desconocido | UNCONFIRMED | "Sin confirmar: kilometraje. Comprueba que sea de como máximo 50.000 km." | leerlo como PASS o FAIL | PASS |
| Problemas declarados sin requisito | señal ATTENTION, Practical Fit PASS | "Se han declarado problemas de estado" (Aspectos a revisar) | FAIL inventado | PASS |
| NEDC vs WLTP con usado | economía no comparable; costes conocidos no comparables | "…salen de ciclos de homologación distintos: no son directamente comparables" · "los costes conocidos no son comparables entre sí" | comparar totales | PASS |
| Sin precio del usado | sin compra, sin coste conocido, sin break-even | "Sin precio" · "Sin calcular (falta el precio)" · "Falta un precio de compra…" | tratarlo como 0 | PASS |
| Información vs recomendación | dos indicadores | "Información sobre esta unidad: media — no es la fiabilidad del coche ni la confianza de la recomendación" · "Confianza de la recomendación · BAJA" | confundirlos | PASS |
| Enlace antiguo / actualizar | misma edad al abrir; recálculo solo a petición | "Fecha de evaluación: 15 de octubre de 2026." · "Análisis actualizado… Cambia: …" | creer que el enlace se actualiza solo | PASS |

## 5. Rendimiento

Ver [USED_COMPARISON_INTEGRATION_V0_1 §7](USED_COMPARISON_INTEGRATION_V0_1.md#7-rendimiento). Pico de INP de 8b (296 ms): **no reproducido** en 48 cargas móviles ×4 (frío, caliente, reduced motion); la atribución LoAF muestra **retardo de entrada** (frame ocupado por el callback del índice de capítulos y el scroll de GSAP), no procesamiento. Corrección acotada en el índice de capítulos (una actualización por callback, no urgente). **Solo emulación (Chrome, CPU ×4): no se ha probado en un móvil físico.**

## 6. Riesgos aceptados y pendientes posteriores al Alpha

- Datos del catálogo de validación: Golf nuevo a 38.850 € (no 40.000 €); la cobertura técnica baja hace que la confianza de la recomendación sea BAJA en muchos pares (es correcto).
- El precio de compra no entra en el Economic Fit (decisión metodológica vigente): una persona centrada en el desembolso debe leer el bloque de compra. Cambiarlo exigiría nueva metodología (no en Alpha).
- El break-even usa solo energía (sin mantenimiento ni residual): se dice explícitamente.
- Variabilidad de INP entre rondas en la máquina compartida (p75 del formulario móvil 96–256 ms entre rondas completas; por paso nunca > 160 ms en mediciones aisladas). Medir en dispositivo real antes de PUBLIC.
- Pendiente: móvil físico; catálogo PUBLIC (vacío).
