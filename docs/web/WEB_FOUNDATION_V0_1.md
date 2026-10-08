# VScar Web Foundation v0.1 (Step 7a)

> Estado: **PASS** · 2026-10-02 · `apps/web` (`@vscar/web`) · Next.js 16.3.8 App Router · React 19.3 · TS strict · Tailwind 4.3 · next-intl 4.14 · Motion 13.5 · GSAP 3.15 · ThreeUI Community 1.2.0 (solo RibbonField)
>
> Decisiones: [ADR-011](../adr/ADR-011-alpha-visual-stack-after-lab.md) (stack visual) · [ADR-012](../adr/ADR-012-i18n-market-routing.md) (idioma × mercado) · Guías: [I18N_AND_MARKETS.md](I18N_AND_MARKETS.md) · [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) · capturas en [`screens/`](screens/)

Primera aplicación web real de VScar: base de producción, no un laboratorio. Abre una comparación BYD SEAL vs Tesla Model 3 con el pipeline real, en español o inglés y sobre el mercado español, con la identidad visual aprobada.

## 1. Qué hay

| Ruta | Render | Contenido |
|---|---|---|
| `/` | redirect 307 | → `/es-es` (sin geolocalización) |
| `/es-es`, `/en-es` | SSG | Home: "No el mejor coche. El mejor coche para ti." + CTA a la comparación demo |
| `/es-es/compare/byd-seal-vs-tesla-model-3`, `/en-es/compare/…` | dinámico (depende del escenario de la query) | Car VS con capítulos dinámicos |
| `/es-es/comparar/…` | redirect 308 | alias → `compare` (ADR-012) |
| `/{locale}/methodology` | SSG | Metodología mínima y versiones |
| cualquier otro locale | 404 | `dynamicParams = false` |

Nada de esto se ha añadido: búsqueda de vehículos, MySQL, API pública, usados, login, analytics, anuncios ni SEO completo (solo la base: metadata, canonical, hreflang y HTML semántico; `robots: noindex` hasta que exista el quality gate).

## 2. Arquitectura

```
RSC (servidor) ─────────────────────────────────────────────────────────────────────────────
  page.tsx → parseScenarioFromSearchParams() → serverDecisionView()  (createDecisionPipeline + robustez, caché LRU)
           → HeroVs (SVG, degradado CSS) + DecisionChapters (HTML completo: resultado, motivos, economía,
             why-not/tradeoffs, robustez, confianza, verificar, detalles, "Cómo lo calculamos")
Islas cliente en el JS inicial (5,6 KB gzip en total) ───────────────────────────────────────
  LiveDecision · ScenarioTrigger · ChapterIndex · LanguageSwitcher · HeroAtmosphere (loader) ·
  ScrollChoreography (loader) · ScenarioSheetHost · Zustand (estado efímero)
Diferido ──────────────────────────────────────────────────────────────────────────────────
  1er cambio de escenario → ClientDecision (pipeline + Motion + next-intl cliente + mensajes del idioma)
                         → robustness.worker.ts (Web Worker: robustez + confianza)
  load + idle, tier ≠ 2D → GsapScenes (ScrollTrigger + SplitText + useGSAP)
  load + idle, HIGH/LOW, en viewport → RibbonFieldBackground (ThreeUI)
  abrir "Cambiar tu uso" → ScenarioSheet (react-hook-form + Zod + Radix Dialog)
```

### Capas y paquetes

| Pieza | Dónde | Notas |
|---|---|---|
| Basic UI | `packages/ui` (`@vscar/ui`) | tokens (TS + CSS), `Button` (patrón shadcn, Radix Slot), `Sheet` (Radix Dialog), `Disclosure` (`<details>` nativo), `visual-tier` (lógica del lab extraída sin cambios) |
| Motion UI | `apps/web/src/components/compare/kit.tsx` + `ClientDecision.tsx` | kit inyectable: etiquetas planas en servidor, Motion en el chunk diferido |
| Atmósfera | `apps/web/src/components/visual/HeroAtmosphere.tsx` | único punto de ThreeUI |
| Dominio | `apps/web/src/domain/*` | escenario ⇄ URL, comparaciones demo, decisión (pipeline real), view-model, fuentes |
| i18n | `apps/web/src/i18n/*`, `apps/web/messages/*` | ver [I18N_AND_MARKETS.md](I18N_AND_MARKETS.md) |

shadcn se ha usado de forma selectiva: `Button` y `Sheet` siguen su patrón; el `Accordion` se implementa con `<details>`, que es nativo y funciona sin JS. `Select`, `Tooltip` y `Dialog` aparte no se han necesitado todavía.

### Decisión real, nunca mock

`computeDecision()` usa `createDecisionPipeline(...).input()` + `recommend()` sobre el snapshot controlado de Dataset Core (`src/data/dataset-core.snapshot.json`, generado con `pnpm snapshot` desde `@vscar/fixtures`) y las 3 observaciones reales de energía (ESIOS PVPC 2026-09-24, MITECO 2026-09-20). Servidor, cliente y worker leen **el mismo snapshot**. La UI no decide ni redacta razones: `buildDecisionView()` solo reorienta lados (A = BYD), agrupa categorías y elige capítulos.

| Escenario | Resultado (engine) |
|---|---|
| Commuter: 15.000 km/año, 35 km/día, 1 viaje largo/año, carga en casa 100 %, 5 años | `PRACTICAL_TIE`, confianza BAJA, robustez TIE ("cambia si superas 21.840 km/año") |
| Igual con `trips=10` | `BEST_FOR_YOU` BYD SEAL (autonomía +122 km CLEAR, para ti CLEAR), confianza MEDIA, robustez STABLE ("cambia si superas 28.570 km/año") |
| Autonomía 570 vs 448 km | RAW +122 km → Meaningful CLEAR → For You SLIGHT (1 viaje) / CLEAR (10) |
| Economía | Model 3 más barato de usar: 23,96–123,68 €/año (intervalo conservado) |

### Capítulos dinámicos (Step 6d §3.1)

`vs → result → reason* → economics? → tradeoffs? → change → confidence → details`: entre 6 y 9 capítulos según el caso, y nunca un capítulo vacío (test). Reglas:
- **Motivos**: las métricas de `topContributions`. En empate o `RANGE_DEPENDENT`, hasta 2 métricas con diferencia general ≥ MEANINGFUL cuya relevancia para ti es menor: es el patrón "clara, pero poco relevante para tu uso".
- **Economía**: solo si hay un líder económico comparable.
- **Lo que sacrificas**: `tradeoffsForSelected` del elegido + `WHY_NOT` de los demás (en un empate, los `TRADEOFFS` de cada uno) + `VERIFY_BEFORE_DECIDING`.
- **Detalles**: Economy, Range, Performance, Space (Size + Practicality), Charging, Safety, Warranty, Technology, Eco; solo las categorías con algún valor. `UNKNOWN` = "No confirmado", nunca 0. `NOT_COMPARABLE` muestra el motivo.

## 3. Escenario: la URL es la fuente de verdad

- `parseScenarioFromSearchParams()` y `serializeScenario()` en `domain/scenario.ts`, con **Zod** (el mismo esquema que el formulario). Claves: `km`, `daily`, `trips`, `years`, `home` (0–100 %), `cost`, `space`, `performance` (1–3 → LOW/MEDIUM/HIGH). Un campo inválido cae a su valor por defecto y se avisa.
- Serialización determinista: orden fijo y solo los valores distintos del defecto (`?km=18000&trips=10`). Property test: `parse(serialize(s)) = s`.
- Cambio sin recarga: `history.pushState` (Next sincroniza `useSearchParams`), cediendo antes al pintado y dentro de `startTransition`. Los enlaces rápidos son `<a href="?trips=10">`: sin JS navegan al servidor.
- Zustand guarda solo estado efímero: hoja abierta, capítulo activo y override de tier en desarrollo.
- Tras cambiar el escenario el usuario va al resultado (salto instantáneo y foco en el titular). La decisión cambiada es lo que importa, y los bloques asíncronos quedan fuera del viewport (CLS 0).

## 4. Robustez: servidor + Web Worker

- **HTML inicial**: el servidor calcula la decisión completa **con** robustez (0,2–0,7 s la primera vez; caché LRU por escenario, 200 entradas). No es un handler de input y garantiza que el HTML sin JS lleva confianza y robustez correctas.
- **Recálculo**: el cliente calcula la decisión sin robustez (5–17 ms) y la robustez se pide a `robustness.worker.ts`, sin React y con contrato `RobustnessRequest` → `RobustnessResponse` (`ResultRobustness` + `RecommendationConfidence`). Mientras llega, la robustez y la confianza anteriores se ven atenuadas (`aria-busy`) con la píldora "Analizando qué podría cambiar el resultado…". Nunca se muestra como definitiva una confianza calculada sin robustez.
- **Por qué no solo worker**: sin robustez en servidor, el HTML inicial no tendría el capítulo "Qué cambia el resultado". **Por qué no solo servidor**: cada cambio de escenario sería un roundtrip de 0,2–0,7 s.

## 5. Visual (ADR-011)

| Regla | Implementación |
|---|---|
| RibbonField: diferido, decorativo, envuelto, no crítico | `HeroAtmosphere`: tras `load` + idle, solo en HIGH/LOW y en viewport; DPR limitado; `aria-hidden`; sin contenido |
| Fallback (reduced motion / sin WebGL / contexto perdido / 2D) | degradado CSS `.atmosphere` siempre en el HTML; verificado: contexto perdido → `STATIC`, 0 canvas |
| Vehículo | `VehicleVisual` (API estable) → `VehicleSilhouette` (SVG server-rendered, cero JS). Otro renderer se conecta en `VehicleVisual` sin tocar páginas |
| GSAP | `GsapScenes`: CSS sticky + ScrollTrigger scrub (VS, métrica), SplitText por líneas con `sr-only` + copia `aria-hidden`. Sin `pin`, sin smooth scroll. Solo anima lo que está bajo el viewport; tras revelar, SplitText revierte a texto plano |
| Motion | tie_balance → tie_to_winner: el marcador "=" y el distintivo "El mejor para tus necesidades" comparten `layoutId`, con jerarquía por `flexGrow` y contraste; sin zoom, flash, glow ni confeti. scenario_morph: crossfade de motivos (180 ms) |
| Propiedad única | CSS = entrada del vehículo (`.vehicle-entry`, nodo interior); GSAP = `[data-vs-*]`, `[data-split]`, `[data-scrub-*]`; Motion = tarjetas, marcador y bloque de motivos; ThreeUI = su canvas |
| Tokens | `@vscar/ui/tokens` + `styles/tokens.css`: color (oscuro + claro preparado), espaciado, tipografía, motion, radios, bordes, elevación, objetivo táctil; un test comprueba que el CSS refleja la paleta TS |

Desviación menor documentada: ADR-011 no fija a Motion para la **entrada del vehículo** del hero (lo hacía el lab), y aquí es una animación CSS en el nodo interior. Así Motion no entra en el JS crítico ni compite con el scrub de GSAP del contenedor.

## 6. Rendimiento (medido)

Build de producción, `next start` local, Chrome headless con GPU real (Intel UHD, ANGLE/D3D11). Móvil = 390×844 con CPU ×4 (emulación, no dispositivo real). Informe reproducible: `corepack pnpm --filter @vscar/web size [-- --check]`, que lee el HTML real de cada ruta y mide gzip -9 de cada chunk.

| JS (gzip) | Comparación | Home | Metodología |
|---|---|---|---|
| **Inicial, navegadores modernos** | **151,2 KB** | 148,4 KB | 131,3 KB |
| Inicial + polyfills legacy (`noModule`) | 189,8 KB | 187,0 KB | 169,9 KB |
| · React DOM | 77,0 | 77,0 | 77,0 |
| · Next runtime | 43,0 | 43,0 | 43,0 |
| · App (islas, Zustand, rutas) | 31,3 | 28,5 | 11,4 |
| · Polyfills `noModule` (no se descargan en navegadores modernos) | 38,6 | 38,6 | 38,6 |
| **Presupuesto (≤ 200 KB, cifra conservadora)** | **WITHIN BUDGET** | WITHIN | WITHIN |

| Diferido | gzip | Cuándo |
|---|---|---|
| Pipeline cliente (engines + snapshot) | 53,8 KB | primer cambio de escenario (y dentro del worker) |
| Motion | 51,9 KB | primer cambio de escenario |
| GSAP + ScrollTrigger + SplitText + @gsap/react | 46,7 KB | `load` + idle, tier ≠ 2D, sin reduced motion |
| react-hook-form + Radix Dialog + resolvers | 24,8 KB | al abrir "Cambiar tu uso" |
| next-intl cliente | 11,9 KB | primer cambio de escenario / hoja |
| ThreeUI RibbonField | **2,3 KB** | `load` + idle, HIGH/LOW, en viewport |
| Robustez (módulo del worker) | 0,7 KB + pipeline compartido | primer cambio de escenario, en Web Worker |
| three / @react-three/fiber / ogl | **no existen** en el build ni en las dependencias | — |

| Métrica (lab) | Desktop 1440 | Tablet 1024 | Móvil 390 (CPU ×4) | Reduced motion | Sin WebGL |
|---|---|---|---|---|---|
| LCP (`h1` del hero) | 656 ms | 184 ms | 296 ms | 164 ms | 172 ms |
| CLS (carga + cambio de escenario) | 0 | 0 | 0 | 0 | 0 |
| INP (tie → 10 viajes) | 48 ms | 24 ms | 40 ms¹ | 24 ms | 32 ms |
| FPS en scroll / peor frame | 59,8 / 33 ms | 59,8 / 34 ms | 59,9 / 33 ms | 60,4 / 18 ms | 60,4 / 17 ms |
| Atmósfera / canvas | WEBGL_HIGH / 1 | WEBGL_HIGH / 1 | WEBGL_LOW / 1 | STATIC / 0 | STATIC / 0 |
| Errores de consola | 0 | 0 | 0 | 0 | 0 |

¹ En 5 repeticiones móviles adicionales con CPU ×4: INP 72 / 104 / 136 / 192 / 208 ms (mediana 136 ms, peor caso 208 ms, marginal frente a 200 ms). El componente variable es el retardo de entrada (trabajo pendiente en el hilo principal cuando se toca), no el handler: el procesamiento del clic es de 4–7 ms.

LCP y TTFB son locales y sin red. El render de servidor de un escenario nuevo cuesta 0,2–0,7 s por la robustez (cacheado después). Hay que vigilarlo en el VPS: si hiciera falta, la robustez del primer render podría pasar a calcularse en segundo plano.

Cómo se llegó a CLS 0 en móvil (antes 0,71): cabecera que desbordaba 390 px, enlace "Volver al trayecto diario" que aparecía y desaparecía, píldora de "Analizando…" que añadía altura, listas asíncronas sin espacio reservado, SplitText con `padding` por línea y frase del resultado de 1 o 2 líneas. Todo está corregido con espacio reservado y llevando al usuario al resultado tras el cambio.

## 7. Accesibilidad (base WCAG 2.2 AA)

Un `h1` por página y `h2` por capítulo. Enlace "Saltar al contenido" como primer foco. "Ir a los detalles" y el índice de capítulos (`aria-current`) como fast path. `:focus-visible` en todos los controles y objetivos táctiles ≥ 44 px. Anuncio `aria-live` del resultado ("El resultado ha cambiado. …"). `aria-busy` mientras se calcula la robustez. La copia de SplitText es `aria-hidden` con la frase completa en `sr-only`. Canvas y atmósfera son `aria-hidden`. Las siluetas tienen `role="img"` con el aviso "no es una imagen del fabricante". La hoja de escenario usa el foco atrapado de Radix, Escape y errores con `role="alert"`. Contraste con los tokens de 6d. Reduced motion completo: sin WebGL, sin GSAP (0 ScrollTriggers, no se descarga), sin SplitText, Motion con `reducedMotion="user"` e información idéntica (E2E).

## 8. Tests

| Suite | Qué cubre | Resultado |
|---|---|---|
| `packages/ui` (vitest) | tier, reduced → 2D, sin WebGL → 2D, fallback de atmósfera, DPR, tokens CSS = TS | 9 ✓ |
| `apps/web/test/i18n.test.ts` | idioma ≠ mercado, rutas canónicas, cambio de idioma conserva escenario, hreflang, catálogos con mismas claves, traducciones distintas, formato ES/EN, rangos sin punto medio, todas las `messageKey` del engine resuelven en ambos idiomas, clave desconocida → respaldo seguro | 16 ✓ |
| `apps/web/test/domain.test.ts` | parser/serializer (+ property), contratos del engine, 1 viaje → empate, 10 → BYD, +122 km, Meaningful For You = engine, confianza y robustez = engine, capítulos sin vacíos, UNKNOWN ≠ 0, rangos económicos, **servidor = cliente + worker**, property de ida y vuelta por URL | 15 ✓ |
| `apps/web/test/render.test.tsx` | mismos capítulos en ES y EN, sin claves crudas, **markup del servidor = markup del recálculo cliente** (hidratación) | 4 ✓ |
| `apps/web/test/boundary.test.ts` | grafo de imports estáticos de las islas iniciales: sin pipeline, GSAP, Motion, ThreeUI, formulario ni next-intl cliente; worker sin React; sin three/R3F/OGL/Lenis; sin DB/conectores/worker/MySQL | 7 ✓ |
| `apps/web/e2e/smoke.spec.ts` (Playwright, Chrome real) | ES empate → 10 viajes → BYD (sin recarga) → robustez del worker → EN conserva escenario y resultado → ES; hoja con RHF + Zod (aplicar y validar); `/` → `/es-es`, alias `comparar`, 404 de locale desconocido, home ES/EN; reduced motion; teclado. **0 errores ni warnings de consola** | 5 ✓ |
| `scripts/bundle-report.ts --check` | presupuesto + fronteras sobre el build real | ✓ |
| `scripts/hmr-check.ts` | 3 rondas editando GsapScenes, HeroAtmosphere y DecisionChapters en `next dev`: ScrollTriggers 7 → 7, listeners de `window` 17 → 17, 1 contexto WebGL, 0 errores (cada edición produjo `✓ Compiled` + refresco) | ✓ |

ESLint: `apps/web/src/**` y `packages/ui/src/**` entran en la regla de frontera de navegador (sin `@vscar/db`, conectores, worker, fixtures, mysql2, drizzle ni `node:*`).

## 9. Huecos conocidos

- **Engine i18n (6b)**: `topContributions`, `alphaBestForYou.explanation` y las reglas Meaningful For You son texto inglés sin `messageKey`. El adaptador localiza por campos estructurados; `detail` (confianza), `reason` (requisitos) y `what` (verificación) se muestran como respaldo inglés fuera del inglés. Se propone añadir `messageKey` en un Step de engine.
- **Turbopack** emite también una copia `.ts` del worker en `static/media/` (asset sobrante; el worker real va empaquetado con su bootstrap). No contiene secretos.
- **Datos**: snapshot controlado de desarrollo. Los precios basados en ESIOS siguen bloqueados para publicación (la procedencia se muestra en "Cómo lo calculamos").
- **Tema claro**: tokens preparados, sin selector.
- **INP móvil**: peor caso 208 ms en emulación con CPU ×4 (§6).
