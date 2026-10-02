# ADR-011 — Alpha visual stack after the Motion Lab

- **Estado**: ACCEPTED (2026-10-02) — sustituye en parte a [ADR-010](ADR-010-visual-motion-stack.md) (decisiones 3 y 4)
- **Fecha**: 2026-10-02
- **Decisores**: producto + frontend
- **Relacionado**: [MOTION_LAB_RESULTS.md](../design/MOTION_LAB_RESULTS.md) · [VSCAR_VISUAL_DIRECTION_V0_1.md](../design/VSCAR_VISUAL_DIRECTION_V0_1.md) · [THREEUI_EVALUATION.md](../design/THREEUI_EVALUATION.md) · Master Plan §21, §22, §26

## Contexto

ADR-010 aceptó el stack visual "para el lab" y dejó dos decisiones abiertas a la medición del Step 6e: qué componentes ThreeUI se usan (1–2: RibbonField / StreamConvergence) y si R3F + three entran para la silueta del vehículo (gate: ganancia visual material, ≤ 250 KB gzip diferido, fallback móvil limpio, runtime aceptable), con OGL como alternativa. También fijaba reduced motion para ThreeUI como `speed 0`.

El lab (`labs/motion-lab`, build de producción, Chromium con GPU real, móvil emulado con CPU ×4) ha medido las cinco piezas con datos reales del pipeline. Los resultados cambian esas decisiones, así que se registran aquí en lugar de editar ADR-010.

## Decisión

1. **ThreeUI: solo RibbonField** (2,4 KB gzip, diferido) como atmósfera del hero, en tiers HIGH y LOW. **StreamConvergence se rechaza** (colores fuera de paleta que compiten con el titular, al mismo coste). Sustituye a ADR-010 §3 "1–2 componentes".
2. **Reduced motion en ThreeUI = fallback estático real**: degradado CSS y ningún contexto WebGL. Sustituye a ADR-010 §3 "`speed 0`". El mismo fallback cubre WebGL ausente y contexto perdido en caliente (verificado).
3. **R3F + three: REJECTED FOR ALPHA**. Pasa el gate de tamaño por poco (236 KB, 94 % del presupuesto) pero falla el de ganancia visual: sin un modelo GLTF con licencia (excluido), la extrusión del perfil se ve peor que el SVG, y añade +150 ms de hilo principal en desktop y +61 % de long tasks en móvil. **OGL también se rechaza** (14,9 KB y 2 contextos WebGL para un barrido de luz). **Renderer de Alpha: SVG ONLY** (silueta propia, entrada con Motion en el wrapper, luz por estado). Sustituye a ADR-010 §4. Reabrir solo si aparece un modelo 3D con licencia y presupuesto propio.
4. **GSAP** se confirma con ScrollTrigger + SplitText + `@gsap/react`, sticky CSS + scrub, sin `pin` (ADR-010 §2 sin cambios). En `apps/web` se carga **después del LCP**.
5. **Motion** se confirma para Tie Balance, Tie → Winner (`layoutId` compartido + jerarquía por layout, sin zoom/flash/confeti) y Scenario Morph (ADR-010 §1 sin cambios).
6. **Cálculo en `apps/web`**: el resultado inicial se calcula en servidor; el pipeline cliente (engines + datos, ~70 KB gzip) se carga solo con el primer cambio de escenario. La **robustez completa** (0,1–0,7 s en desktop) se ejecuta fuera del hilo principal (Web Worker o servidor), nunca en el handler de la interacción.

Sin cambios: regla de propiedad única, Lenis fuera por defecto, capa visual progresiva, presupuestos del §26.

## Alternativas consideradas

- **Mantener R3F en tier HIGH** con la extrusión: cumple el tamaño, pero gasta 236 KB y hilo principal para una imagen peor que la base. Rechazada.
- **OGL 2,5D como renderer HIGH**: barato, pero la ganancia es marginal y suma contextos WebGL a los de la atmósfera. Rechazada; un barrido de luz se puede hacer con un degradado SVG si producto lo pide.
- **Los dos componentes ThreeUI** (uno por escena): duplica contextos y StreamConvergence no encaja en la paleta. Rechazada.

## Consecuencias

- **Positivas**: el renderer de Alpha no tiene coste WebGL; solo hay un contexto WebGL en la página (la atmósfera), y desaparece en LOW/2D/reduced. three, R3F y OGL salen de las dependencias de producto (siguen solo en `labs/motion-lab`).
- **Negativas**: no hay vehículo 3D en Alpha; la sensación de volumen depende del SVG y la luz.
- **Riesgos**: el JS inicial del lab fue 333,6 KB gzip (framework 170,7 KB). Aun con las medidas del punto 6, el presupuesto ≤ 200 KB de páginas interactivas queda justo; se comprueba con `size-limit` en el primer build de `apps/web` y, si no cabe, se decide en un ADR propio (no se relaja en silencio).

## Referencias

[MOTION_LAB_RESULTS.md](../design/MOTION_LAB_RESULTS.md) §3–§10 · capturas en `docs/design/motion-lab/` · código en `labs/motion-lab`.
