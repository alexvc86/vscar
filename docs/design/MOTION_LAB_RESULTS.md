# VScar — Motion Lab Results (Step 6e)

> Estado: **PASS** · 2026-10-02 · Lab: `labs/motion-lab` (Next.js 16.3.8 App Router, React 19.3, TS strict, Tailwind 4.3) · Decisiones derivadas: [ADR-011](../adr/ADR-011-alpha-visual-stack-after-lab.md) (sustituye en parte a [ADR-010](../adr/ADR-010-visual-motion-stack.md))
>
> Relacionado: [VSCAR_VISUAL_DIRECTION_V0_1.md](VSCAR_VISUAL_DIRECTION_V0_1.md) §13 (plan del lab; allí el fichero figuraba como `MOTION_LAB_RESULTS_V0_1.md`) · [THREEUI_EVALUATION.md](THREEUI_EVALUATION.md) · capturas en [`motion-lab/`](motion-lab/)

## 1. Qué se ha validado

Una sola ruta (`/`) con la narrativa pedida y datos **reales**:

```
Scene 1  BYD SEAL (2026)        → hero + atmósfera ThreeUI + entrada del vehículo
Scene 2  VS                      → sticky CSS + scrub GSAP
Scene 3  Tesla Model 3 (2021)    → entrada del vehículo
Scene 4  PRACTICAL TIE           → Motion: balance
         cambio de escenario     → solo longTripsPerYear: 1 → 10
Scene 5  BYD SEAL selected       → Motion: tie → winner
         Metric scrub            → 570 vs 448 km → +122 → CLEAR → Meaningful For You
```

- **Datos**: snapshot JSON de los fixtures Dataset Core (9 variantes, 63 valores) + 3 observaciones reales de energía (ESIOS PVPC 2026-09-24, MITECO 2026-09-20). Ningún número escrito a mano en la UI.
- **Pipeline real** en el navegador: `comparisonCandidateFromBundle` + `economicVehicleInputFromBundle` → `createDecisionPipeline` → `recommend` (Economics → Comparison → Decision → Why Not / Robustness / Confidence). Sin DB, sin API, sin endpoints.
- **Escenario A** (commuter: 15.000 km/año, 35 km/día, carga en casa, 1 viaje largo/año) → `PRACTICAL_TIE`.
- **Escenario B** (solo cambia `longTripsPerYear` = 10) → `BEST_FOR_YOU` **BYD SEAL**, razón principal `rng.electric_combined_km`. El cambio se produce de 2 → 3 viajes/año (el "4" del brief ya selecciona; se usan 1 y 10 para tener margen a ambos lados).
- **Métrica**: autonomía eléctrica BYD 570 km vs Model 3 448 km → RAW +122 km → Meaningful Difference **CLEAR** → Meaningful For You **SLIGHT** (A: "daily use far below every car range, charging at home, few long trips") / **CLEAR** (B: "frequent long trips keep full relevance").
- **Recommendation Confidence**: LOW en ambos escenarios (6/8 categorías sin datos para algún vehículo; robustez no calculada en la ruta interactiva). Se muestran ≤ 3 razones del engine.
- **Engines sin cambios**: el lab no modifica ningún paquete; no se ha encontrado ningún bug de engine.

## 2. Entorno de medición

| | |
|---|---|
| Servidor | `next start -p 4100` (build de producción), local, sin throttling de red |
| Navegador | Chromium headless (patchright), GPU real: Intel UHD Graphics, ANGLE / Direct3D11 |
| Máquina | 12 hilos, 16 GB (`deviceMemory` 16) |
| Desktop | 1440×900 y 1024×768 |
| Móvil | 390×844 + **CPU ×4** (CDP `Emulation.setCPUThrottlingRate`). Es una emulación, no un dispositivo real |
| FPS | conteo rAF durante un recorrido completo con rueda nativa (~7.000 px, 120 px/16 ms) |
| Main thread | CDP `Performance.getMetrics` → `TaskDuration` durante ese recorrido |
| Memoria | `JSHeapUsedSize` tras `HeapProfiler.collectGarbage`. **No incluye memoria GPU** |
| LCP / CLS / INP | PerformanceObserver (`largest-contentful-paint`, `layout-shift`, `event`, `longtask`) inyectado en el HTML |

Los LCP son locales (sin red) y solo sirven para comparar variantes entre sí, no como cifra de campo.

## 3. Resultados por efecto

| Effect | Visual Value | Bundle Cost (gzip) | FPS | Mobile | Reduced Motion | Decision |
|---|---|---|---|---|---|---|
| 1 · Hero atmosphere (ThreeUI RibbonField) | Alto: profundidad sutil, paleta compatible (saturación 0,55), no compite con el titular | 2,4 KB diferido | 60,1 (peor frame 17,9 ms) | Tier LOW, DPR 1, `pointerAmount` 0; estable | STATIC: degradado CSS, sin contexto WebGL | **KEEP** |
| 1b · Hero atmosphere (ThreeUI StreamConvergence) | Bajo para VScar: morado/naranja saturados fuera de paleta, compite con el titular | 1,8 KB diferido | 60,2 | igual | igual | **REJECT** |
| 2 · Vehicle entry (SVG + Motion wrapper) | Alto: silueta limpia, acento por candidato, luz por estado (`lit`) | 0 KB extra (SVG inline; Motion ya presente) | 59,9–60,1 | idéntico, −30 % duración y distancia | fade 150 ms | **KEEP — SVG ONLY** |
| 2b · Vehicle entry OGL (2,5D, máscara + campo de altura) | Marginal: barrido de luz; la silueta no gana volumen real | 14,9 KB diferido | 59,8 (un frame de 33 ms al montar) | 2 contextos WebGL extra | SVG | **REJECT** |
| 2c · Vehicle entry R3F (extrusión del mismo perfil) | Negativo: sin modelo real (GLTF excluido) se ve peor que el SVG | 236,0 KB diferido | 60,0 desktop · 59,1 móvil (peor frame 49,9 ms) | +61 % long tasks vs SVG | SVG | **REJECT FOR ALPHA** |
| 3 · VS transition (sticky CSS + ScrollTrigger scrub + SplitText line mask) | Alto: ritmo de capítulo sin secuestrar el scroll | GSAP + ST + SplitText + `@gsap/react` = 47,6 KB (inicial en el lab) | 60 | `150svh` vs `220svh`, desplazamiento ×0,5 | sin GSAP: texto estático, 0 ScrollTriggers | **KEEP** |
| 4 · Result reveal (Motion LayoutGroup) | Alto: el "=" central viaja (`layoutId`) a la tarjeta elegida; jerarquía por ancho y contraste; sin zoom, flash ni confeti | Motion (motion, AnimatePresence, LayoutGroup, MotionConfig) = 42,7 KB | 60; cambio de estado en 8–44 ms | columna vertical, misma lógica | layout desactivado, crossfade 120 ms | **KEEP** |
| 5 · Metric scrub (ScrollTrigger timeline) | Alto: explica por qué +122 km "importa o no" para ti | incluido en GSAP | 60 | `end` más corto | estático, todo visible | **KEEP** |

Ningún efecto se marca SIMPLIFY: los cinco efectos conservados se quedan tal como se probaron. Los rechazados son variantes alternativas dentro de los efectos 1 y 2.

### 3.1 Runtime medido (recorrido completo con rueda)

| Configuración | Tier | Atmósfera | FPS | Peor frame | Main thread (ms) | Heap tras GC (MB) | LCP (ms) | CLS | Long tasks | INP (ms) |
|---|---|---|---|---|---|---|---|---|---|---|
| Baseline 2D, sin atmósfera | 2D | STATIC | 59,0 | 83,3 (primer arranque en frío) | 334 | 7,6 | 196 | 0 | 2 / 164 ms | 24 |
| HIGH · SVG · RibbonField | HIGH | WEBGL_HIGH | 60,1 | 17,9 | 373 | 7,7 | 224 | 0 | 2 / 140 ms | 24 |
| HIGH · SVG · StreamConvergence | HIGH | WEBGL_HIGH | 60,2 | 17,7 | 380 | 7,7 | 180 | 0 | 2 / 124 ms | 32 |
| HIGH · SVG · sin atmósfera | HIGH | STATIC | 59,9 | 17,6 | 320 | 7,7 | 224 | 0 | 2 / 155 ms | 24 |
| HIGH · OGL · sin atmósfera | HIGH | STATIC | 59,8 | 33,3 | 385 | 8,0 | 168 | 0 | 2 / 122 ms | 24 |
| HIGH · R3F · sin atmósfera | HIGH | STATIC | 60,0 | 17,3 | 470 | 11,0 | 168 | 0 | 2 / 134 ms | 24 |
| LOW · 1024×768 | LOW | WEBGL_LOW | 60,1 | 17,3 | 358 | 7,7 | 176 | 0 | 2 / 140 ms | 24 |
| Móvil 390 · AUTO (CPU ×4) | LOW | WEBGL_LOW | 60,2 | 17,3 | 750 | 7,8 | 256 | 0 | 6 / 762 ms | 88 |
| Móvil 390 · R3F (CPU ×4) | LOW | WEBGL_LOW | 59,1 | 49,9 | 904 | 10,8 | 296 | 0 | 8 / 1.226 ms | 88 |
| Reduced motion (sistema) | 2D | STATIC | 60,0 | 18,4 | 145 | 7,5 | 168 | 0 | 2 / 123 ms | 24 |
| Sin WebGL (getContext → null) | 2D | STATIC | 60,0 | 17,5 | 385 | 7,5 | 148 | 0 | 2 / 124 ms | 24 |

Lectura: en este equipo todo va a 60 FPS; la diferencia está en el **coste de hilo principal**. RibbonField añade ~+53 ms en todo el recorrido, OGL ~+65 ms y R3F **~+150 ms** (desktop), +3,3 MB de heap JS (sin contar GPU) y +61 % de tiempo en long tasks en móvil emulado.

### 3.2 Pipeline

| Ruta | Desktop | Móvil (CPU ×4) |
|---|---|---|
| `runLab` = `createDecisionPipeline(...).input()` + `recommend()` sin robustez (interactiva) | 3,5–6,5 ms (primera llamada en Node ~40 ms) | 20–26 ms |
| Robustez completa (`pipeline.recommend()`), bajo demanda | 127–720 ms (A: TIE / LOW; B: STABLE / HIGH) | no medido |

La ruta interactiva cabe sobradamente en un frame de interacción (INP ≤ 88 ms en móvil ×4). **La robustez bloquea el hilo principal 0,1–0,7 s**: en el frontend real se calcula fuera del hilo principal (Web Worker o servidor) y se muestra cuando llega; mientras tanto la confianza dice "Robustness could not be tested", como en el lab.

## 4. Vehicle renderer

| Renderer | gzip | FPS | Memory | Visual gain | Mobile | Verdict |
|---|---|---|---|---|---|---|
| SVG | 0 KB extra (inline) | 59,9–60,1 | 7,7 MB heap (base) | Base: limpio, legible, acento por candidato | Igual de nítido; sin contexto WebGL | **SELECTED — SVG ONLY** |
| OGL | 14,9 KB (chunk diferido; OGL solo 13,6 KB) | 59,8 · un frame de 33 ms al montar (raster + textura) | +0,3 MB heap · +2 contextos WebGL | Marginal (barrido de luz) | Correcto, pero gasta contextos para casi nada | REJECT |
| R3F + three | 236,0 KB (chunk diferido; three solo 138,6 KB) | 60,0 desktop · 59,1 móvil, peor frame 49,9 ms | +3,3 MB heap · +2 contextos | Negativo sin GLTF | +61 % long tasks; fallback SVG limpio | **R3F REJECTED FOR ALPHA** |

Gate de R3F (ADR-010 §4):

| Condición | Resultado |
|---|---|
| Ganancia visual material | **NO** — la extrusión de un perfil plano no aporta volumen creíble; un modelo real requiere GLTF con licencia (excluido) |
| ≤ ~250 KB gzip diferido | Sí, por poco: 236 KB (94 % del presupuesto) |
| Fallback móvil limpio | Sí (SVG; tier 2D/reduced/sin WebGL nunca carga el chunk) |
| Runtime aceptable | Desktop sí; móvil marginal (+150 ms de hilo principal, peor frame 50 ms) |

**R3F REJECTED FOR ALPHA**. Reemplazo: **SVG ONLY** (silueta propia + entrada con Motion en el wrapper + luz por estado). OGL tampoco entra: su única aportación (un barrido de luz) se puede hacer con un degradado SVG animado si producto lo pide.

## 5. ThreeUI

| Componente | Decisión | Motivo |
|---|---|---|
| **RibbonField** | **KEEP** | 2,4 KB, paleta controlable (saturación/hue/brillo), atmósfera que no compite con el contenido, `pointerAmount` desactivable en móvil |
| **StreamConvergence** | **REJECT** | Mismo coste, pero colores saturados fuera de paleta y bandas que cruzan el titular |

Gate de ThreeUI:

| Condición | Resultado |
|---|---|
| Pequeño | Sí: 2,4 KB gzip por componente (subruta `@designcodeio/threeui/components/RibbonFieldBackground`) |
| Lazy | Sí: `next/dynamic({ ssr:false })` + IntersectionObserver (`rootMargin 200%`); solo en HIGH/LOW |
| Wrapper de reduced motion | Sí: reduced → **STATIC** (degradado CSS, sin contexto WebGL), no "WebGL más lento" |
| Sin dependencia de contenido | Sí: `aria-hidden`, todo el texto en HTML; con WebGL desactivado la página es idéntica en contenido |
| Estable en móvil | Sí: tier LOW, DPR 1 (tope aplicado escalando el contenedor, porque ThreeUI usa `devicePixelRatio` sin límite) |
| Fallo de WebGL | Sin WebGL → tier 2D + STATIC, 0 errores. Pérdida de contexto en caliente (`WEBGL_lose_context`) → WEBGL_HIGH pasa a STATIC con el degradado CSS. Nunca queda un canvas en blanco ([captura](motion-lab/webgl-fallback-hero.jpg)) |

## 6. GSAP

**Plugins que se quedan**: `gsap` core, **ScrollTrigger**, **SplitText**, `@gsap/react` (`useGSAP`). Nada más (sin `pin`, sin ScrollSmoother, sin Observer, sin CustomEase).

| Gate | Resultado |
|---|---|
| Scroll nativo | Sí: sticky CSS + `scrub: 0.2`; sin `pin`, sin smooth scroll, sin hijacking. Lenis no se ha usado (fuera por defecto) |
| Sin lag de entrada | INP 24–32 ms desktop, 88 ms móvil ×4 |
| SplitText accesible | Sí: frase completa en `.sr-only` + copia animada `aria-hidden`; verificado en el árbol accesible |
| Limpieza | `useGSAP` con `revertOnUpdate` revierte split, tweens y ScrollTriggers. Tras 4 ciclos de cambiar tier/renderer/motion desde el panel: **6 ScrollTriggers estables** y 1 canvas estable (sin crecimiento). Reduced motion: 0 ScrollTriggers |
| HMR | **No verificado en navegador**: el Chromium headless bloquea el WebSocket de HMR (`ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`). Lo cubren por código `useGSAP` (revert al desmontar), los `useEffect` con cleanup y `reactStrictMode` (doble montaje en dev). Pendiente de comprobarlo a mano en `next dev` en el primer sprint de `apps/web` |

Medido en el lab: la animación se ve igual con scrub 0,2 en 60 FPS; el peor frame durante el VS es de 17–18 ms.

## 7. Motion

Patrones que se quedan:

| Patrón | Implementación | Token |
|---|---|---|
| **Tie Balance** | Dos tarjetas `flexGrow 1`, luz neutra, sin glow, marcador "=" centrado (`layoutId="verdict"`) | `tie_balance` 420 ms, ease in-out |
| **Tie → Winner** | El marcador viaja a la tarjeta seleccionada y se convierte en "Best for your needs"; la seleccionada pasa a `flexGrow 1.4`, la otra a 0.8 y opacidad 0.62; titular con el nombre en el color del candidato. Sin zoom, flash ni confeti | `result_lock` 420 ms, expo out |
| **Scenario Morph** | `AnimatePresence mode="wait"` en el bloque de razones y confianza | `scenario_morph` 180 ms |
| Vehicle entry (wrapper) | `whileInView` opacity + x (±48 px; ×0,5 en móvil) | `vehicle_entry` 900 ms (×0,7 en móvil), reduced 150 ms fade |

Gate de Motion: tie → winner se entiende como "la decisión cambió" (aria-live: "la decisión cambió. Mejor para tus necesidades: BYD SEAL"); CLS 0 en todas las configuraciones (el cambio de layout es consecuencia directa de un clic).

**Propiedad única**, verificada por diseño: Motion anima solo el wrapper del vehículo, las tarjetas y el bloque de razones; GSAP solo `.vs__name`, `.vs__mark`, las líneas de SplitText y las capas de la métrica; ThreeUI, OGL y R3F solo sus canvas.

## 8. Tiers, móvil y reduced motion

- `resolveVisualTier()` es una función pura (testeada): reduced motion → 2D; sin WebGL → 2D aunque se fuerce HIGH; saveData, 2g o ≤ 2 GB / ≤ 2 núcleos → 2D; WebGL2 + ≥ 8 GB + ≥ 8 núcleos + viewport ≥ 1024 → HIGH; resto → LOW.
- Override del panel: AUTO / HIGH / LOW / 2D / REDUCED (también por query `?tier=`).
- **Móvil (390×844)**: tier LOW, atmósfera a DPR 1 sin interacción por puntero, narrativa vertical, VS de 150svh con la mitad de desplazamiento, titulares con `clamp()`, tarjetas de resultado en columna, sin scroll horizontal ([tie](motion-lab/mobile-tie.jpg), [selected](motion-lab/mobile-selected.jpg), [hero](motion-lab/mobile-hero.jpg)).
- **Reduced motion completo**: sin WebGL, sin GSAP (0 ScrollTriggers), SplitText no se aplica, Motion con `reducedMotion="always"`, entradas en fade ≤ 150 ms, métrica estática y visible ([captura](motion-lab/reduced-motion-tie.jpg)). Es la configuración con menos hilo principal (145 ms).
- **Fast path**: enlace "Skip motion — go to result" como primer elemento enfocable y botón "Skip to the result"; llevan al resultado y mueven el foco al titular (verificado con teclado).

## 9. Accesibilidad

Headings semánticos (un `h1`, `h2` por escena, `h3` en tarjetas), skip link visible al enfocar, foco gestionado al saltar, `aria-live` en el resultado y en el selector de escenario, botones con `aria-pressed`, todos los canvas dentro de `aria-hidden="true"` (verificado), siluetas SVG con `role="img"` y etiqueta que aclara que no son imágenes del fabricante, contraste AA con los tokens de 6d (muted `#A3A6AD` y subtle `#7C8088` sobre `#0B0C0E`), `tabular-nums` en todas las cifras.

## 10. Bundle

`pnpm --filter @vscar/motion-lab build` (Turbopack) y análisis de `.next/static/chunks` (gzip -9). Coste aislado por librería con esbuild (minify + gzip, React externo):

| Librería (como la importa el lab) | min | gzip | Carga |
|---|---|---|---|
| GSAP core | 69,0 KB | 27,0 KB | — |
| GSAP + ScrollTrigger | 112,5 KB | 44,2 KB | — |
| **GSAP + ScrollTrigger + SplitText + @gsap/react** | 120,8 KB | **47,6 KB** | inicial en el lab |
| **Motion** (motion, AnimatePresence, LayoutGroup, MotionConfig) | 127,9 KB | **42,7 KB** | inicial |
| **ThreeUI** RibbonField / StreamConvergence | 5,4 / 4,0 KB | **2,3 / 1,7 KB** | diferido |
| **OGL** (Renderer, Program, Mesh, Texture, Triangle) | 48,2 KB | **13,6 KB** | diferido |
| **R3F + three** (Canvas, useFrame, Shape, ExtrudeGeometry…) | 903,8 KB | **242,8 KB** | diferido |
| three solo (lo usado) | 545,5 KB | 138,6 KB | — |
| Engines + snapshots (pipeline + view-model) | 260,7 KB | 69,6 KB | inicial |

Build real:

| Chunk | gzip | Contenido |
|---|---|---|
| Inicial · app | 162,8 KB | GSAP + Motion + engines + snapshots + componentes |
| Inicial · framework (React, Next runtime) | 170,7 KB | 6 chunks |
| **Total inicial** | **333,6 KB** | |
| Diferido · R3F + three | 236,0 KB | solo con `renderer=R3F` |
| Diferido · OGL + VehicleOgl | 14,9 KB | solo con `renderer=OGL` |
| Diferido · ThreeUI | 2,4 + 1,8 KB | solo en HIGH/LOW |

**Hallazgo**: el JS inicial del lab (333,6 KB) supera el presupuesto de páginas interactivas (≤ 200 KB, plan §26), y el framework ya ocupa 170,7 KB. No es un problema del lab (no está optimizado para eso), pero condiciona `apps/web` (ver ADR-011 §3):
1. los engines y snapshots (69,6 KB) no van en el cliente por defecto: el resultado inicial se calcula en servidor (RSC) y el cliente solo carga el pipeline al primer cambio de escenario;
2. GSAP (47,6 KB) se carga después del LCP (las escenas de scroll están por debajo del primer viewport);
3. Motion se queda en el bundle inicial (gestiona el resultado).

Con eso la estimación queda en ~215–225 KB iniciales; el presupuesto ≤ 200 KB se revisa en el primer build de `apps/web` con `size-limit`.

## 11. Laragon

- **Laragon running: compatible**. Durante todo el lab estuvieron activos `laragon.exe`, `httpd.exe` (×2) y `mysqld.exe` (×2).
- **No Laragon service modification required**. El lab no usa Apache, Nginx, MySQL ni PHP; no se ha tocado `hosts` ni ningún vhost.
- Puerto: **4100** estaba libre (`next start -p 4100`; `next dev -p 4100` con `pnpm dev`). Para la prueba de HMR se usó `next dev -p 4101` de forma puntual. Solo se pararon procesos `node` del propio lab.

## 12. Cómo reproducir

```bash
corepack pnpm --filter @vscar/motion-lab test     # 20 tests (tier, reduced → 2D, fallback del wrapper, tie real, selección real, frontera sin DB)
corepack pnpm --filter @vscar/motion-lab build
corepack pnpm --filter @vscar/motion-lab start    # http://localhost:4100
# Query para capturas reproducibles: ?tier=HIGH|LOW|2D|REDUCED&renderer=SVG|OGL|R3F&atmosphere=ribbon|stream|off&motion=off&trips=0..12
corepack pnpm --filter @vscar/motion-lab snapshot # regenera src/data/dataset-core.snapshot.json desde @vscar/fixtures
```

La frontera del lab está protegida dos veces: regla ESLint `BROWSER_LABS` (`labs/*/src/**` no puede importar `@vscar/db`, `@vscar/data-connectors`, `@vscar/worker`, `@vscar/fixtures`, `mysql2`, `drizzle-orm` ni `node:*`) y un test que recorre `src/` y `package.json`.

## 13. Capturas

| | |
|---|---|
| [desktop-high-ribbon-hero.jpg](motion-lab/desktop-high-ribbon-hero.jpg) | HIGH, RibbonField (KEEP) |
| [desktop-high-stream-hero.jpg](motion-lab/desktop-high-stream-hero.jpg) | HIGH, StreamConvergence (REJECT) |
| [desktop-high-tie.jpg](motion-lab/desktop-high-tie.jpg) | HIGH, Practical tie |
| [desktop-high-selected.jpg](motion-lab/desktop-high-selected.jpg) | HIGH, BYD SEAL seleccionado |
| [desktop-low-1024.jpg](motion-lab/desktop-low-1024.jpg) | LOW, 1024×768 |
| [desktop-vs-mid.jpg](motion-lab/desktop-vs-mid.jpg) | VS a mitad del scrub |
| [desktop-metric.jpg](motion-lab/desktop-metric.jpg) | Metric scrub completo (escenario B) |
| [high-ogl-vehicle.jpg](motion-lab/high-ogl-vehicle.jpg) · [high-r3f-vehicle.jpg](motion-lab/high-r3f-vehicle.jpg) | Renderers rechazados |
| [mobile-hero.jpg](motion-lab/mobile-hero.jpg) · [mobile-tie.jpg](motion-lab/mobile-tie.jpg) · [mobile-selected.jpg](motion-lab/mobile-selected.jpg) | 390×844 |
| [reduced-motion-tie.jpg](motion-lab/reduced-motion-tie.jpg) | Reduced motion |
| [webgl-fallback-hero.jpg](motion-lab/webgl-fallback-hero.jpg) | Sin WebGL / contexto perdido → degradado CSS (las dos capturas eran idénticas byte a byte) |

## 14. Pendiente y límites

- HMR sin verificar en navegador (§6).
- Móvil emulado (viewport + CPU ×4), no dispositivo real; memoria GPU no medida.
- LCP local sin red: comparativo, no de campo.
- Robustez bajo demanda en móvil no medida (en desktop 0,1–0,7 s → fuera del hilo principal en `apps/web`).
