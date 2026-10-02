# ThreeUI Evaluation (Step 6d)

> Fecha: 2026-10-02 · Evaluado: `@designcodeio/threeui` **1.2.0** (npm, publicado 2026-09-01; paquete creado 2026-08-21; versiones 0.3.0 → 1.0.0 → 1.1.0 → 1.2.0) · Método: descarga e inspección del tarball (licencias, `package.json`, grafo de imports por componente, código de los shaders), no documentación de terceros.
> Relacionado: [VSCAR_VISUAL_DIRECTION_V0_1.md](VSCAR_VISUAL_DIRECTION_V0_1.md) §9 · [ADR-010](../adr/ADR-010-visual-motion-stack.md) · [THIRD_PARTY.md](../licenses/THIRD_PARTY.md) · Master Plan §21

## 1. Ficha

| Campo | Valor (verificado) |
|---|---|
| Paquete | `@designcodeio/threeui` 1.2.0 (edición **Community**) |
| Repositorio | `github.com/MengTo/threeui` · web `threeui.com` |
| Licencia del código | **MIT** (© 2026 Meng To) |
| Assets incluidos | imágenes/texturas propias de ThreeUI: MIT (`ASSET-LICENSES.md`) |
| Fuentes incluidas | Fragment Mono, Instrument Serif, Newsreader, Lexend, Onest: **SIL OFL 1.1** (`FONT-LICENSES.md`); SF Pro **eliminada** en la edición pública |
| Three.js incluido | runtimes MIT con cabecera de licencia |
| Medios remotos | miniaturas/previews desde `threeui.com` **no** cubiertos por la MIT; algunas escenas HTML cargan librerías desde CDNs públicos |
| Pro / Beta | **no publicados en npm**; solo con cuenta Pro vía `npx @designcodeio/threeui-cli add <componente>` (OAuth) |
| Contenido | 50 componentes padre, 141 variantes, 103 exports en `package-components/` |
| Peso | 54,7 MB desempaquetado (726 ficheros; 47 MB de `assets/`) |
| Dependencias | `three128` (= `three@0.128.0`) y `three165` (= `three@0.165.0`) como alias |
| Peer deps | `react >=18 <20`, `react-dom >=18 <20`, `three >=0.149 <1` |
| R3F | **no** lo usa (ningún import de `@react-three/*`) |
| `'use client'` | **ausente** en todo el paquete |
| Exports | índice `.` + subrutas `./components/*` (ESM + `.d.ts`), `./style.css`, `./assets/*` |

## 2. Compatibilidad

| Aspecto | Resultado |
|---|---|
| React 19 | ✅ peer `>=18 <20` |
| Next.js App Router | ✅ con condiciones: sin `'use client'` → wrapper cliente propio; montaje con `next/dynamic({ ssr: false })` |
| SSR | Los fondos WebGL nativos solo tocan `window`/`document` dentro de `useEffect` (seguros para SSR). La familia "Neuform" accede a `window` en el nivel de módulo → **rompe SSR** |
| R3F en el mismo proyecto | Compatible (no comparten runtime), pero **no** usar componentes que traigan `three128`/`three165`: duplicarían Three |
| Reduced motion | Los fondos elegidos **no** consultan `prefers-reduced-motion` → lo aplica el wrapper (`speed: 0` o fallback 2D) |
| Ciclo de vida | Los fondos elegidos: IntersectionObserver + `document.hidden` (pausan fuera de vista), ResizeObserver, `cancelAnimationFrame`/liberación al desmontar |
| DPR | `devicePixelRatio` sin límite → el wrapper limita el tamaño del canvas (DPR ≤ 1,5 HIGH, 1 LOW) |
| CSP / red | Los componentes con CDN (cdnjs/jsdelivr/unpkg: GSAP 3.12, Three r128/r134/0.160) violarían una CSP estricta y añadirían peticiones a terceros → excluidos |

## 3. Community vs Pro

| Component / Effect | Community / Pro | License | Candidate for VScar | Reason |
|---|---|---|---|---|
| RibbonFieldBackground | Community | MIT | ✅ **Sí (lab #1)** | cintas de luz horizontales, 2–3 KB gzip, WebGL nativo, controles `speed/opacity/brightness/hue/saturation/pointerAmount`; evoca reflejo sobre carrocería |
| StreamConvergenceBackground | Community | MIT | ✅ Sí (A/B lab #1) | flujo convergente: metáfora directa de "A → VS ← B"; 2 KB |
| LiquidFormBackground | Community | MIT | 🟡 Reserva | forma líquida, 3 KB; candidato a atmósfera de capítulo |
| BellFieldBackground | Community | MIT | 🟡 Reserva | campo suave, 3 KB |
| OrbitalSphereBackground | Community | MIT | 🟡 Reserva | 2 KB; la estética "orbital" encaja poco con automoción |
| AnimatedTopDock | Community | MIT | ❌ No | dock de navegación decorativo; VScar tiene chapter rail propio |
| CondensationBackground / WarpFieldBackground | Community | MIT | ❌ No | condensación/warp: estética sci-fi o de interferencia, no premium automotive |
| CrtBackground | Community | MIT | ❌ No | estética retro CRT |
| TypographyVortexCanvas / NeonTypography / OutlineTypeflow | Community | MIT | ❌ No | tipografía como espectáculo; VScar usa tipografía para informar |
| EmeraldHorizonBackground / DotMatrixBackground | Community | MIT | ❌ No | traen **Three r128** (`three128`) → segunda copia de Three |
| PerformanceGauges, botones (Ignition, Launch, Plasma, Tactile…), CTAs, *Fields* de la familia Neuform | Community | MIT | ❌ No | ~119 KB gzip de chunk compartido, **iframe + librerías desde CDN**, `window` en el nivel de módulo (rompe SSR) |
| LiquidMetalButton | Community | MIT | ❌ No | 16 KB, decorativo; los botones de VScar son Basic UI |
| Gallery / BookshelfScene / Character* | Community | MIT | ❌ No | 384 KB–1,1 MB gzip; contenido ajeno |
| Landing pages HTML (Kage, Sylva, Sketchbook, JapaneseTower…) | Community | MIT | ❌ No | documentos HTML completos en iframe |
| Cualquier componente Pro o Beta (p. ej. `cross-beam`) | **Pro** | licencia Pro (no evaluada) | ❌ No | fuera de alcance: nada Pro sin decisión explícita y licencia |

## 4. Shortlist final

| Effect | Library | Role | Priority | Desktop | Mobile | Reduced Motion |
|---|---|---|---|---|---|---|
| Hero atmosphere (cintas de luz) | ThreeUI `RibbonFieldBackground` | atmósfera tras las siluetas en 00/01 | P1 (lab #1) | HIGH: DPR 1,5, `speed 0.3`, `opacity` ≤ 0,6 | LOW: DPR 1, `speed 0.2`; 2D en gama baja | congelado (`speed 0`) o degradado CSS |
| VS convergence (A/B de #1) | ThreeUI `StreamConvergenceBackground` | refuerzo de "A → VS ← B" en 00 | P2 | igual que arriba | igual | congelado |
| Atmósfera de capítulo | ThreeUI `LiquidFormBackground` (reserva) | `background_shift` entre capítulos | P3 | solo si el lab demuestra valor | no | color fijo |

ThreeUI **no** se usa para: siluetas o vehículos, cifras, resultado, empate, controles, tabla, procedencia ni nada que contenga información.

## 5. Patrón de integración obligatorio

```text
<AtmosphereSlot tier>                       ← componente propio 'use client'
  ├─ 2D: degradado CSS (siempre presente, LCP-safe, aria-hidden)
  └─ next/dynamic(() => import('@designcodeio/threeui/components/RibbonFieldBackground'), { ssr: false })
       · montado solo si tier ≠ 2D y el slot está a < 200 % del viewport (IntersectionObserver)
       · props: speed (0 si reduced motion), opacity, brightness, hue
       · canvas limitado a DPR 1,5 (HIGH) / 1 (LOW) por el contenedor
       · error de contexto/compilación → se queda el 2D (sin error visible)
```

- Importar **siempre por subruta**, nunca `@designcodeio/threeui` (índice): el índice arrastra el catálogo.
- No copiar `lib-dist/assets/` a `public/` (47 MB): ninguno de los fondos elegidos necesita assets.
- No importar `style.css` global salvo que el componente lo requiera (verificar en el lab).
- Fijar la versión exacta (`1.2.0`): el paquete publica *minor* automáticas por sincronización (README) y es muy reciente (6 semanas).

## 6. Riesgos

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Paquete muy joven y con publicación automática (cambios frecuentes) | Alta | Medio | versión exacta fijada; los componentes elegidos son pequeños y se podrían **vendorizar** (MIT) si cambian |
| Instalar el paquete descarga 54,7 MB + dos copias de Three en `node_modules` | Segura | Bajo (solo dev/CI) | importar por subruta; verificar con `size-limit` que no entra en el bundle |
| Fondos sin `prefers-reduced-motion` ni límite de DPR | Segura | Medio | wrapper obligatorio (§5) |
| Componentes con iframe/CDN entran por error | Media | Alto (CSP, privacidad, rendimiento) | lista de permitidos en ESLint (`no-restricted-imports` sobre las demás subrutas) en `apps/web` |
| Estética genérica "AI/SaaS" de parte del catálogo | Media | Medio | solo 1–2 fondos, `opacity` baja, paleta VScar vía `hue/saturation` |
| Licencia Pro malinterpretada | Baja | Alto | nada Pro; documentado aquí y en THIRD_PARTY |

## 7. Expectativas de rendimiento

| Pieza | Esperado | Medición en el lab |
|---|---|---|
| Fondo ThreeUI (JS) | 2–5 KB gzip | `size-limit` sobre el chunk dinámico |
| Coste de GPU | un *fullscreen quad* con shader de ruido/cintas | FPS ≥ 55 HIGH, ≥ 45 LOW, Android de gama media |
| Impacto en LCP | nulo (montaje diferido; el LCP es texto/SVG) | Lighthouse CI |
| Memoria | 1 contexto WebGL por fondo visible | 3 ciclos de montar/desmontar sin crecimiento |

Regla: máximo **1 contexto WebGL activo** de ThreeUI a la vez (más el de la silueta 3D si existe en HIGH).

## 8. Decisión

ThreeUI Community **se adopta para atmósfera de fondo** (1–2 componentes WebGL nativos), siempre envuelto, diferido y con fallback 2D. No se usa ninguno de sus componentes con iframe, CDN, Three r128 o Pro. Validación definitiva en Step 6e.
