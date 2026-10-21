# VScar — D1.6a Informe de estabilidad de tests

> Estado: **PASS en entorno controlado (3/3 `pnpm check` forzados, 0 timeouts)** · fallo reproducible solo con saturación artificial de CPU, y únicamente en la medición de rendimiento · 2026-10-21
> - **Equipo**: Windows 11, 10 núcleos / 12 hilos, Node 22.19.0, Vitest 3, Turbo 2.11.
> - **Carga ajena**: Chrome, VS Code y Laragon activos (no se ha detenido ningún proceso ajeno).

## 1. Síntoma de partida (D1.6)

- **Serie**: 946 pasados, 6 fallidos, 5 omitidos. Los 6 fallos eran timeouts de 5 s en `decision-engine`.
- **`pnpm check` en paralelo**: además fallaba el test de rendimiento de `used-adjustment` (p95 < 5 ms).
- **Aislados**: todos pasaban.

D1.6a no asumió que la causa fuera solo la carga: se midió.

## 2. Diagnóstico

| Pregunta | Medición | Conclusión |
|---|---|---|
| ¿Cuánto tarda cada test aislado? | `decision-engine` solo, reporter JSON | hasta **2,9 s** por test (properties 6c: 2,86 s; 6b: 2,78 s); archivos de hasta 10,1 s; fase *collect* 63,6 s acumulada |
| ¿Dónde se va la CPU? | perfil de CPU (`node:inspector`) de 80 llamadas a `recommend()` | **34 %** en `Number#toLocaleString('en-US', opts)` (crea un `Intl.NumberFormat` por llamada) y **~10 %** en `methodologyFingerprint` (FNV-1a con un `BigInt` por byte). Trabajo repetido, no lógica |
| ¿Estado compartido, temporizadores reales, async? | revisión de tests y motores | motores puros y deterministas; sin `setTimeout`, sin reloj (la fecha de evaluación es explícita); el estado compartido de MySQL ya se serializa con `GET_LOCK('vscar_test_reset')` |
| ¿Contención entre paquetes? | p95 del Used Adjustment: en solitario **0,3–1,2 ms**; dentro de la suite **2,4–4,9 ms**; con 8 núcleos ocupados 5,7–6,2 ms | contención real de CPU. La genera sobre todo la propia suite: Turbo lanza hasta 10 tareas a la vez y cada Vitest hasta 11 procesos en 12 hilos |
| ¿Margen frente al timeout? | test más lento 2,9 s solo vs 5 s | margen 1,7×: cualquier contención ≥ 1,7× producía timeouts |
| Memoria | ~3,4 GB libres durante las ejecuciones | no limitante |

## 3. Cambios aplicados (por orden de preferencia de la especificación)

1. **Eliminar trabajo innecesario** (sin cambiar resultados):
   - **Formateador reutilizado**: `formatEnUs(x, opts)` en `@vscar/methodology` es un `Intl.NumberFormat('en-US')` cacheado por opciones. Sustituye las 11 llamadas a `toLocaleString('en-US')` de `comparison-engine`, `decision-engine` y los textos de respaldo.
     - Misma salida: test de propiedad con 2.000 casos + casos límite (`0`, `-0`, `NaN`, `Infinity`, `1e21`).
   - **`methodologyFingerprint` con aritmética de 32 bits**: FNV-1a 64 en dos mitades, con un `TextEncoder` único.
     - Hash idéntico bit a bit: test contra la implementación `BigInt` original con 1.000 valores JSON aleatorios + casos límite.
     - La huella de Methodology 2026.7 no cambia (lo comprueban los tests existentes).
   - **Resultado aislado**: archivos del decision-engine de 10,1 → 6,1 s (`used-golden`) y de 7,4 → 4,9 s (`recommendation.properties`); el p95 del Used Adjustment en solitario pasa de 0,6–1,2 ms a 0,1–0,4 ms.
2. **Reducir concurrencia** (contención demostrada): `turbo run test --concurrency=4` en el script `test` de la raíz.
   - Medido sobre la suite completa: pasa de ~245 s a **154 s**, y el p95 del Used Adjustment dentro de la suite baja de 2,4–4,9 ms a **2,1 ms** en la primera ronda.
   - Menos sobresuscripción: más rápido y más estable.
3. **Prueba de rendimiento útil y reproducible** (`used-adjustment`):
   - **Presupuesto**: sigue siendo **p95 < 5 ms**.
   - **En la suite**: mejor de hasta 5 rondas de 500 muestras (`test/perf.ts`). La contención solo añade tiempo de reloj; una regresión real falla en todas las rondas. Timeout propio de 20 s solo para ese test, justificado: rondas de 2.000 muestras tardaban hasta 3,7 s bajo contención.
   - **Benchmark controlado y autoritativo**: `corepack pnpm --filter @vscar/used-adjustment bench` (en solitario, 5 × 5.000 muestras, mediana de p95; resultado actual **0,10 ms**).
   - **Prueba funcional independiente**: el test de determinismo (mismo hash con misma entrada) ya existía y no depende del tiempo.
4. **No se han tocado**: los valores esperados de los golden cases, los timeouts globales, la lógica de los motores ni Methodology 2026.7. Ningún test se ha desactivado.

Error propio detectado y corregido: la primera versión del test de rendimiento (3 rondas × 2.000 muestras, sin timeout propio) superaba los 5 s bajo contención y falló en 2 de 3 ejecuciones forzadas. Se rediseñó con los datos medidos (punto 3).

## 4. Mediciones

| Ejecución | Condición | Resultado | Duración | p95 Used Adjustment (suite) |
|---|---|---|---|---|
| decision-engine aislado (antes) | solo | 106/106 | 22 s | — |
| used-adjustment aislado (antes) | solo | 44/44 | — | 0,65–1,23 ms |
| `pnpm check` línea base (antes de cambios) | normal | 952 ✓ · 5 omitidos · 0 ✗ | 204 s | (aprobado) |
| `pnpm check` ×2 adicionales (D1.6a, primer intento) | **caché de Turbo** (13–14 s) | no válidas como repetición | — | — |
| `TURBO_FORCE` ×3 (perf v1: 3×2.000) | normal | 2 de 3 ✗ (timeout del test de rendimiento) | 136–241 s | 3,9–4,9 ms |
| idem con 8 núcleos ocupados | carga artificial | ✗ (mismo test) | 292 s | 4,3 ms (3 rondas) |
| `TURBO_FORCE` ×3 (perf v2: 5×500, timeout 20 s) | normal, concurrencia 10 | 3 de 3 ✓ · 981 ✓ · 5 omitidos | 242–257 s | 4,2 · 2,4 · 4,5 ms (2/1/5 rondas) |
| `pnpm test --concurrency=4` | normal | ✓ 981 · 5 omitidos | **154 s** | **2,1 ms** (1 ronda) |
| `pnpm test --continue`, 8 núcleos ocupados | carga artificial | 980 ✓ · 1 ✗ (solo el test de rendimiento: p95 5,7 ms) · **decision-engine sin ningún timeout** | 221 s | 5,7 ms (5 rondas) |
| **`TURBO_FORCE` ×3 finales (concurrencia 4)** | normal | **3 de 3 ✓ · 981 ✓ · 5 omitidos · 0 ✗ · 0 timeouts** | 190 · 231 · 262 s | **2,3 · 1,8 · 2,9 ms** (1 ronda cada una) |

## 5. Resultado final

| Criterio | Resultado |
|---|---|
| Decision Engine estable | **PASS**: 0 timeouts en las 3 finales y tampoco con 8 núcleos ocupados (`--continue`) |
| Used Adjustment estable | **PASS** en entorno controlado: p95 1,8–2,9 ms en la primera ronda, presupuesto 5 ms. Benchmark controlado: 0,10 ms |
| `pnpm check` repetido | **PASS**: 3/3 con `TURBO_FORCE=true` (sin caché), lint ✓, typecheck 16/16, test 28/28 tareas |
| Totales | 981 pasados · 0 fallidos · 5 omitidos = 986 (957 de D1.6 + 29 nuevos) |

**Límite conocido (no se oculta):**
- Con 8 de 12 hilos ocupados por procesos ajenos durante toda la suite, el test de rendimiento de `used-adjustment` mide p95 de 5,7–6,2 ms y falla.
- Es la medición haciendo su trabajo sobre una máquina saturada, no una regresión: el mismo código da 0,10 ms en el benchmark controlado.
- Para CI compartida, la referencia de rendimiento es `corepack pnpm --filter @vscar/used-adjustment bench` en un paso aislado. El test de la suite queda como alarma temprana.

## 6. Tests omitidos (5) y razón

| Paquete | Nº | Razón |
|---|---:|---|
| `@vscar/data-connectors` | 3 | tests en vivo contra EEA, MITECO y ESIOS: solo con `VSCAR_EEA_LIVE`, `VSCAR_MITECO_LIVE`, `VSCAR_ESIOS_LIVE` (red externa; CI no los usa) |
| `@vscar/curation` | 1 | comprobación de artefactos D1 en disco local: solo con `VSCAR_D1_LOCAL=1` |
| `@vscar/web` | 1 | desglose de rendimiento SSR (`ssr-breakdown.perf.test.ts`): solo con `VSCAR_PERF=1` |
