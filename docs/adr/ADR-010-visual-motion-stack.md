# ADR-010 — Visual & motion stack (ThreeUI, GSAP, Motion, R3F)

- **Estado**: ACCEPTED FOR LAB — **sustituido en parte por [ADR-011](ADR-011-alpha-visual-stack-after-lab.md)** (decisiones 3 y 4) tras el Step 6e. El resto sigue vigente.
- **Fecha**: 2026-10-02
- **Decisores**: producto + frontend
- **Relacionado**: [VSCAR_MASTER_PLAN.md v1.0](../VSCAR_MASTER_PLAN.md) §7, §21, §22, §26, §34, §40, §49 · [VSCAR_VISUAL_DIRECTION_V0_1.md](../design/VSCAR_VISUAL_DIRECTION_V0_1.md) · [THREEUI_EVALUATION.md](../design/THREEUI_EVALUATION.md) · [THIRD_PARTY.md](../licenses/THIRD_PARTY.md)

## Contexto

La baseline (Master Plan v1.0) fija: Motion para el Motion Design System (§22); ThreeUI como **P2, "MVP selectivo"**, condicionado a la evaluación de licencia (§21, tabla de metadatos); "capa 3D" excluida de Alpha (§8.1, "solo Motion UI básico"); y 3D en islas diferidas con presupuestos (§26). GSAP no figura en la baseline.

Antes de construir `apps/web`, producto decide fijar una dirección visual premium (Step 6d), con Forge Automotive como referencia principal y ThreeUI como tecnología prioritaria de exploración. El análisis de las referencias muestra que su sensación premium se apoya en orquestación de scroll (GSAP ScrollTrigger + SplitText, secciones `sticky` con scrub) y WebGL ligero (OGL/shaders), no en modelos 3D pesados.

Esto cambia dos decisiones de la baseline: el momento de ThreeUI (P2 MVP → exploración ya, atmósfera en Alpha) y la introducción de GSAP. Por eso se registra como ADR, sin reescribir la baseline.

## Decisión

1. **Motion** (MIT) sigue siendo la librería de UI: microinteracciones, layout transitions, sheets/drawers, cambios de estado de React.
2. **GSAP 3** (Standard "no charge" license, todos los plugins gratuitos; restricción única: no construir un editor visual de animaciones que compita con Webflow) se introduce **solo para orquestar el scroll**: ScrollTrigger (scrub, sin `pin` en Alpha), SplitText (titulares con máscara de línea) y `@gsap/react` (`useGSAP`). Sin CustomEase ni Observer en Alpha.
3. **ThreeUI Community** (MIT) se adelanta: se adopta para **atmósfera de fondo** con 1–2 componentes WebGL nativos (RibbonField / StreamConvergence), siempre con wrapper propio `'use client'`, `next/dynamic({ ssr:false })`, montaje por proximidad, reduced motion (`speed 0`), DPR limitado y fallback 2D. Nada Pro. Ningún componente con iframe, CDN o Three r128.
4. **React Three Fiber + three** (MIT) queda **condicionado al lab** para la silueta 3D del vehículo: solo en tier HIGH y si el chunk 3D cumple ≤ 250 KB gzip. Si no cabe, la alternativa es OGL (Unlicense) o WebGL nativo 2,5D. La silueta SVG es siempre la base.
5. **Regla de propiedad única**: un elemento o propiedad lo anima una sola librería (scroll → GSAP; estado React → Motion; WebGL → ThreeUI/R3F, que reciben el progreso de scroll como valor).
6. **Smooth scroll (Lenis)**: no por defecto; experimento A/B opcional en el lab (escritorio, `pointer: fine`).
7. La capa visual es **progresiva y complementaria**: toda información vive en HTML, la página es completa sin WebGL ni JS de animación, y las páginas SEO son HTML-first sin WebGL.
8. Presupuestos de §26 sin cambios (LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1, JS inicial ≤ 200 KB, chunk 3D ≤ 250 KB diferido).

## Alternativas consideradas

- **Solo Motion** (baseline): sin orquestación robusta de scroll ni SplitText; los scrubs con `useScroll` serían posibles pero más frágiles en secuencias encadenadas. Rechazada para la narrativa de Car VS; se mantiene para la UI.
- **R3F + drei + GLB como base (estilo Armor)**: ~2,6 MB medidos en la referencia y sin modelos licenciados. Rechazada.
- **Smooth scroll global (estilo Forge/Singularity)**: contrario al fast path y con riesgo de INP/accesibilidad. Rechazada como defecto.
- **Componentes ThreeUI "Neuform" (gauges, botones, CTAs)**: iframe + CDN, ~119 KB gzip, rompen SSR. Rechazados.
- **Retrasar toda decisión visual hasta MVP**: rechazada por producto; el frontend se construiría sin lenguaje común.

## Consecuencias

- **Positivas**: lenguaje visual y de motion especificado antes del frontend; las tres capas de animación tienen dueño claro; coste medido (GSAP + ScrollTrigger + SplitText = 48,7 KB gzip; fondos ThreeUI 2–5 KB gzip).
- **Negativas**: una dependencia más (GSAP, licencia propietaria gratuita, no OSI) y un paquete muy joven (ThreeUI, 6 semanas, publicación automática).
- **Riesgos**:
  - R3F + three pueden superar los 250 KB → mitigado con alternativa OGL y fallback SVG.
  - Cambios de ThreeUI → versión exacta, componentes pequeños vendorizables.
  - Cambio futuro de la licencia de GSAP → uso acotado a ScrollTrigger y SplitText, reemplazables por Motion `useScroll` + CSS.

## Referencias

Master Plan §21–§26, §40 · Step 6d: `docs/design/` · Step 6e: `labs/motion-lab` y [`docs/design/MOTION_LAB_RESULTS.md`](../design/MOTION_LAB_RESULTS.md).
