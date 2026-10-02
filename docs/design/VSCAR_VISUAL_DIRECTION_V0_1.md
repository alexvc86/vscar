# VScar Visual Direction v0.1 (Step 6d)

> Estado: **APPROVED FOR LAB** · Fecha: 2026-10-02 · Alcance: dirección visual, scroll, motion y estrategia de stack **antes** de `apps/web`. No es código de producción.
> Relacionado: [ADR-010 — visual-motion-stack](../adr/ADR-010-visual-motion-stack.md) · [THREEUI_EVALUATION.md](THREEUI_EVALUATION.md) · [Master Plan v1.0](../VSCAR_MASTER_PLAN.md) §21–§26 · contratos de decisión: [ALPHA_DECISION_ENGINE_V0_1.md](../decision/ALPHA_DECISION_ENGINE_V0_1.md)

Idea guía: **Forge Automotive × Singularity, convertido en una herramienta de decisión.** Cinematográfico en la forma, extremadamente claro en la información.

VScar **no** debe parecer: SaaS dashboard genérico, tabla de especificaciones, dashboard cripto, UI de videojuego, marketplace ni web de concesionario.

---

## 0. Cómo se hizo el análisis (evidencia, no capturas)

Para cada referencia se descargó el HTML servido y todos sus bundles JS/CSS (2026-10-02) y se inspeccionaron: framework, librerías (firmas en el código), configuración de scroll (Lenis, ScrollTrigger `start/end/scrub/pin`), SplitText, shaders (uniforms y GLSL), media queries, `prefers-reduced-motion`, tipografías (`@font-face`), colores dominantes, estructura semántica. Lo que es inferencia visual (composición, sensación) se marca como tal. Las cifras de esta sección son medidas, no estimaciones.

| Referencia | Stack medido | Peso JS/CSS descargado | Señales clave |
|---|---|---|---|
| **Forge Automotive** | Next.js (Turbopack) + styled-components · **GSAP + ScrollTrigger + SplitText** · **Lenis** · **OGL** (WebGL ligero, no Three) · View Transitions API | ~1,2 MB (29 ficheros) | `scrub:true` / `scrub:.2`; **sin `pin`** (anclaje por CSS `position: sticky`, 21 reglas; 59 secciones de alto en vh); Lenis `duration 1.2`, `lerp .09`, `smoothWheel`; SplitText `chars/words/lines` con `mask:"lines"`; eases `power3.out`, `expo.out`, `cubic-bezier(0.8,0,0,1)`; CSS 0,3–0,5 s; `prefers-reduced-motion` en 14 reglas |
| **Singularity** | SPA Vite · **Three.js** + GSAP + **Lenis** (`lerp .08`, `wheelMultiplier .9`) · audio | ~1,25 MB (893 KB un único bundle) | Space Grotesk Variable + Space Mono; `clamp(48px,7vw,110px)`; line-height .9; casi sin `sticky` (escenas WebGL a pantalla completa) |
| **The Soviet Flip** | **Astro** (ClientRouter = View Transitions) · reproductor de audio · sin GSAP/Three en la home | ~133 KB | navegación por capítulos con audio continuo, progressbar, 10 familias tipográficas (temáticas de época), crema `#ebe5d6` + rojo `#903c32` |
| **Armor** | SPA Vite · **React Three Fiber + drei** + GSAP + Lenis + Motion · modelos GLB/KTX2 | **~2,6 MB** (un chunk `Lightformer` de 975 KB) | Manrope/Unbounded/Work Sans; naranja `#f97316` sobre `#1e1e1e`; densidad técnica alta, uppercase en 30 reglas |

Conclusión transversal: **la sensación premium de Forge no viene del 3D**. Viene de fotografía con profundidad simulada en un shader 2,5D, tipografía editorial enorme, revelados por máscara de línea y scroll que *raspa* (scrub) secciones `sticky` sin secuestrar la rueda. Es exactamente la clase de técnica que cabe en el presupuesto de VScar.

---

## 1. Análisis de referencias

### 1.1 Forge Automotive (referencia principal)

**Hero (medido + inferido).** Dos `<canvas>` OGL sobre una fotografía del coche:
- Shader 1 (*depth-lit photo*): `u_image` + `u_depth` (mapa de profundidad). La luz pasa de **iluminación uniforme en reposo** (`u_floodLight`) a un **foco que sigue al cursor** (`u_spot`, `u_lightRadius`, `u_lightFalloff`), con *cross-fade* entre ambos estados. Hay parallax por profundidad (`parallax = mouseOffset * u_parallaxStrength * (depth − u_parallaxFocus)`), así que el coche "flota" respecto al fondo. Es lo que lo hace **físico y dimensional** sin un modelo 3D.
- Shader 2 (*haze/smoke*): distorsión de humo con separación cromática sutil (`uSplit`), `uSmokeOpacity`, `uFlow`, y texto dibujado dentro del shader (`uText`).
- Titular: `h1` "For Those Who Refuse Ordinary" en fuente *editorial* (serif propia) a `clamp(7.2rem, 10dvh, 9.6rem)` con tracking negativo (−0,05 a −0,2 rem) y line-height 1–1,1.
- Inferencia de composición: coche protagonista, a gran escala, en el tercio inferior. Un solo titular. Casi nada más en pantalla: la escala y la luz hacen el trabajo.

**Scroll.** Desplazamiento suavizado con Lenis (1,2 s) y animaciones `scrub` ligadas al progreso: `start "top bottom"→end "bottom top"`, `"center 30%"→"center 60%"`. No hay `pin` de GSAP: las composiciones fijas son CSS `sticky` dentro de secciones altas, lo que mantiene el scroll nativo y accesible. El scroll **no se secuestra**: Lenis suaviza, pero cada sección avanza con la rueda.

**Tipografía.** Dos familias: **Geist Sans** (cuerpo/UI) + **editorial** (display). Contraste fuerte entre titular display enorme y etiquetas pequeñas en mayúsculas (`0.3rem` de tracking). Revelado de texto con **SplitText por líneas y máscara** (cada línea sube desde debajo de su propia máscara) y palabras "cinemáticas" (`data-cinematic-words`).

**Patrón de accesibilidad a copiar.** El texto animado se renderiza dos veces: `<span class="sr-only">frase completa</span>` + `<p aria-hidden="true" data-cinematic-words>` animado. El lector de pantalla recibe la frase intacta; la animación nunca rompe la semántica.

**Transiciones.** Hero → "We don't modify vehicles, We build them" → enfoque (Identity / Insight / Cohesion, `01 / 03`) → servicios (Bodystyling, Interior, Wheels, Lighting, Exhaust, Protection) → "Previous Builds" → stock → CTA "Refuse Ordinary". Cada bloque entra con `clip-path` (41 usos) o máscara, no con fades genéricos. Las rutas cambian con **View Transitions API**.

**Otros.** Trail de imágenes que sigue al cursor (`data-trail`), solo con `(hover: hover) and (pointer: fine)`. Rejilla de 4 columnas en móvil y 12 en escritorio, con breakpoints 420/700/1024/1200/1400/1600/1920. Paleta negro `#0c0c0c` + blanco, y acentos oro `#c5a064` y granate `#410306`. `prefers-reduced-motion` apaga animaciones y transiciones por regla.

**Qué hace que el coche se sienta premium:** (1) escala, (2) luz y profundidad que reaccionan al usuario, (3) silencio alrededor (negative space), (4) tipografía que enmarca y no compite, (5) movimiento lento y amortiguado (`expo.out`, `power3.out`).

### 1.2 Singularity

Narrativa por **capítulos a pantalla completa**: una idea por pantalla, tipografía enorme (`clamp(48px,7vw,110px)`, line-height 0,9), Space Grotesk + Space Mono para datos. La escena WebGL (Three) es el escenario continuo y el texto lo recorre. **Para VScar**: el principio "una idea por pantalla" y la mono para cifras; no la estética AI ni el bundle monolítico de 893 KB.

### 1.3 The Soviet Flip

Documental por capítulos con **índice persistente y progreso**, audio continuo y transiciones de vista entre páginas (Astro ClientRouter). **Para VScar**: el *índice de capítulos con progreso* es el mecanismo del **fast path** (saltar a cualquier parte del razonamiento). No el audio ni el tono inmersivo/documental.

### 1.4 Armor

Densidad técnica: specs agrupadas, etiquetas uppercase pequeñas, jerarquía fuerte entre valor y unidad. Su stack (R3F + drei + GLB, 2,6 MB) es justo lo que **no** cabe en el presupuesto de VScar. **Para VScar**: la capa 3 (detalle completo), con tabla limpia, métricas alineadas y categorías expandibles.

### 1.5 Matriz de referencias

| Referencia | Take | Avoid | Aplicación VScar |
|---|---|---|---|
| **Forge** | luz/profundidad 2,5D sobre la imagen; titular editorial enorme; revelado por máscara de línea; `sticky` + `scrub` sin pin; doble render accesible del texto animado; View Transitions | trail de imágenes del cursor; humo/distorsión sobre fotos (no tenemos fotos licenciadas); scroll suavizado por defecto | hero VS con siluetas iluminadas; capítulos `sticky` con cifras grandes; tokens de easing |
| **Singularity** | una idea por pantalla; mono para datos; escena continua de fondo | estética AI/espacial; 893 KB en un bundle; fondo WebGL protagonista | capítulos de razonamiento (Result, Why, Give up…) con una sola cifra protagonista |
| **Soviet Flip** | índice de capítulos + progreso; navegación entre capítulos | audio; tono documental; 10 familias tipográficas | **chapter rail** = fast path y orientación |
| **Armor** | jerarquía valor/unidad, etiquetas técnicas, densidad organizada | stack R3F+GLB pesado; naranja agresivo | capa 3: tabla de comparación completa y procedencia |

---

## 2. Principios de diseño VScar (8)

1. **Decision before detail.** Respuesta → por qué → metodología. Nunca una tabla antes del resultado.
2. **Motion explains change.** Cada animación muestra magnitud, jerarquía, cambio de estado, selección, comparación o progresión. Si solo decora, se elimina.
3. **Cars are protagonists, not decoration.** Dos vehículos, escala grande, luz propia. Nada compite con ellos en el hero.
4. **Numbers are the headline.** `€386/year`, `+122 km`, `11,800 km/year` se componen como titulares, en tipografía display con cifras tabulares, no dentro de cards pequeñas.
5. **Uncertainty stays visible.** Empates, rangos y datos sin confirmar tienen forma visual propia y nunca se maquillan como victoria.
6. **3D never carries information.** WebGL es atmósfera y presencia. Todo dato existe en HTML, y la página es completa sin WebGL.
7. **The fast path always exists.** Saltar a detalles, cambiar el uso o ir a un capítulo está a un clic o una tecla en cualquier momento.
8. **Calm by default.** Movimiento amortiguado y breve (≤ 400 ms en interacción, ≤ 1,2 s en reveals). Nada de casino: sin destellos, confeti, zoom triunfal ni sonido.

---

## 3. Arquitectura de la página Car VS

### 3.1 Simplificación de la narrativa propuesta

La propuesta de 12 capítulos fijos (00–11) se **simplifica**. Mostrar siempre Money, Range, Performance, Space y Charging obliga a recorrer categorías irrelevantes para *este* usuario y contradice el principio 1. Los capítulos de categoría se vuelven **dinámicos**: solo aparecen como capítulo propio las categorías que el Decision Engine considera motivos relevantes (`topContributions` y Why Not con nivel ≥ MEANINGFUL). El resto vive en la capa de detalle.

| # | Capítulo | Contenido (contrato que lo alimenta) | Siempre |
|---|---|---|---|
| 00 | **VS** | A · VS · B, nombre, año, tren motriz. Acceso directo "Ir a los detalles" | sí |
| 01 | **Your result** | `alphaBestForYou` (BEST_FOR_YOU · PRACTICAL_TIE · RANGE_DEPENDENT · NO_FULL_MATCH), frase principal, confianza (secundaria) | sí |
| 02–04 | **Reason chapters** | 1–3 capítulos, uno por motivo principal (`topContributions`), en su orden: The money / The range / Space… Cada uno muestra una cifra protagonista (raw → Meaningful Difference → Meaningful For You) | 0–3, dinámicos |
| 05 | **What you give up** | `tradeoffsForSelected` + Why Not del otro | si hay contenido |
| 06 | **What would change it** | `resultRobustness` (punto de cambio más cercano) + "Cambiar tu uso" | sí |
| 07 | **Confidence & verify** | `recommendationConfidence` (motivos) + `requiresVerification` | sí |
| 08 | **The full comparison** | capa 3: categorías expandibles, tabla alineada, procedencia | sí |

Resultado: entre 6 y 9 capítulos según el caso, nunca 12. Un empate práctico, por ejemplo, salta directamente de 01 a 06 ("qué lo desempataría"), porque no hay motivos ganadores que contar.

### 3.2 Timeline de scroll

La línea temporal fija por porcentajes (0–15 % intro, 15–30 % resultado…) **se rechaza**: el número de capítulos es dinámico y en móvil el reparto cambia. La regla es por capítulo:

| Tipo de capítulo | Altura de scroll (escritorio) | Móvil | Mecánica |
|---|---|---|---|
| 00 VS | 1,5 viewports (contenido `sticky` 1 vh + 0,5 de transición) | 1 viewport, sin sticky | `versus_transition` con scrub |
| 01 Result | 1,25 viewports | 1 viewport | `result_lock` al entrar (no scrub: el resultado no se "raspa") |
| Reason chapter | 1,25 viewports | contenido natural | `metric_scrub` (cifra protagonista) |
| Give up / Change / Confidence | contenido natural (sin sticky) | contenido natural | `section_enter` |
| Full comparison | contenido natural | contenido natural | ninguna animación de scroll |

Límite global: **como máximo 0,5 viewport de recorrido "atado" a una animación por capítulo** y nunca más de 2 viewports de sticky en toda la página. Más allá de eso, el usuario siente que el scroll no responde.

### 3.3 Wireframe conceptual (escritorio)

```text
┌──────────────────────────────────────────────────────────── chapter rail (00 01 02 … 08) ─┐
│ 00  VS                                                                                    │
│      ┌──────────────┐                ╱╲                ┌──────────────┐                   │
│      │  silueta A    │            V  ╱  ╲  S            │  silueta B    │  ← luz propia      │
│      └──────────────┘                                  └──────────────┘                   │
│      BYD SEAL · 2026 · BEV                              Tesla Model 3 · 2021 · BEV         │
│                                   [ Ir a los detalles ↓ ]   [ Cambiar tu uso ]             │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│ 01  YOUR RESULT                                                                           │
│      BEST FOR YOUR NEEDS                                                                  │
│      BYD SEAL                                   (display, 2 líneas máx.)                  │
│      Fits your long trips better: +122 km of range that matters for 10 trips/year.         │
│      Confidence · MEDIUM — why ›                (secundario, sin semáforo)                │
├─────────────────── sticky comparison rail (aparece aquí) ─────────────────────────────────┤
│  BYD SEAL ●──────── BEST FOR YOU ────────○ Model 3          [ Cambiar tu uso ] [ Detalles ]│
├───────────────────────────────────────────────────────────────────────────────────────────┤
│ 02  THE RANGE                                                                              │
│      +122 KM                                  ← cifra protagonista (metric_scrub)          │
│      CLEAR DIFFERENCE                          ← Meaningful Difference                     │
│      and it matters for you: 10 long trips/year ← Meaningful For You                       │
│      570 km ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  448 km ━━━━━━━━━━━━━━━━━━━━━                  │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│ 05  WHAT YOU GIVE UP     · costs about €120–€620 more per year to run (range kept)          │
│ 06  WHAT WOULD CHANGE IT · "The result changes if long trips fall below …" [Cambiar uso]    │
│ 07  CONFIDENCE · MEDIUM  · motivos (3 líneas) · Verify before deciding (si aplica)          │
│ 08  THE FULL COMPARISON  · categorías expandibles · tabla alineada · procedencia (drawer)   │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

Móvil: misma secuencia en vertical. Las siluetas se apilan (A arriba, VS, B abajo) y en 01 se colocan lado a lado en pequeño. El sticky rail pasa a ser una **barra inferior** (A · estado · B + "Cambiar uso").

### 3.4 Sticky comparison rail

Decisión: **sí**, pero solo a partir del capítulo 01 y compacto (48 px en escritorio, barra inferior de 56 px en móvil). Contiene: A, estado (BEST FOR YOU A/B · PRACTICAL TIE · DEPENDS · NO FULL MATCH), B, "Cambiar tu uso" y "Detalles". Así se conserva la orientación ("¿de quién estoy viendo la cifra?") sin repetir las siluetas. En los capítulos de motivo, el candidato del que habla la cifra se ilumina en el rail (`comparison_focus`).

### 3.5 Fast path

- **Chapter rail** (lateral derecho en escritorio, fila superior desplazable en móvil): números 00–08 con el título del capítulo al pasar el foco, progreso de lectura y salto directo. Cada capítulo tiene un ancla URL (`#result`, `#range`, `#details`).
- **"Ir a los detalles"** en el hero y en el rail: salta a 08 y **desactiva las animaciones de scroll intermedias** (el salto no reproduce secuencias).
- Atajos de teclado (con `?` para listarlos): `D` detalles, `U` cambiar uso, `[` y `]` capítulo anterior y siguiente.
- `prefers-reduced-motion` o un ajuste "Modo compacto": todos los capítulos en su estado final, sin sticky.
- Un experto puede leer el resultado y abrir los detalles en dos acciones, sin recorrer la narrativa.

### 3.6 Controles de escenario

No hay sidebar permanente de dashboard. "Cambiar tu uso" abre una **sheet**: lateral derecha de 420 px en escritorio, inferior hasta el 85 % de altura en móvil. Contiene los 3–5 controles del escenario (km/año, km/día, viajes largos, carga en casa, horizonte) y presets. Al cambiar un valor, el resultado se recalcula **en cliente** (`createDecisionPipeline`, sin red) con 250 ms de debounce y la página aplica `scenario_morph`. La sheet no tapa el rail: el usuario ve el estado cambiar mientras ajusta.

---

## 4. Patrones visuales de estado

### 4.1 Ganador (BEST_FOR_YOU)

`winner_reveal` sobrio: el candidato elegido recibe la **luz principal** (key light en la silueta, +12 % de exposición), su nombre pasa a display y el otro baja a `muted`. Sin glow, sin zoom, sin destello. La frase principal es la de `alphaBestForYou.explanation` y el primer motivo.

### 4.2 Empate práctico (PRACTICAL_TIE)

Prohibido usar resplandor, zoom o foco de ganador. Se representa con `tie_balance`:
- composición **simétrica**: ambas siluetas a la misma escala y a la misma distancia del centro;
- **iluminación simétrica**: dos luces iguales, sin key light;
- **punto focal neutro**: en el centro, el texto "PRACTICAL TIE" en display y debajo "for your use, neither is meaningfully better";
- el capítulo siguiente pasa directamente a "What would change it" (`resultRobustness`): qué desempataría.

### 4.3 Depende de rangos (RANGE_DEPENDENT)

Sin ambigüedad decorativa. Se muestra la **cifra como intervalo**: dos barras con el tramo de solape sombreado (patrón rayado y texto "depends on configuration"). En la composición, ambas siluetas tienen luz media e igual, y el texto nombra qué rango causa la dependencia (p. ej. "consumption 5.0–5.4 L/100 km"). Nunca se usan degradados o desenfoques "de incertidumbre" sin dato debajo.

### 4.4 Ninguno cumple (NO_FULL_MATCH)

No es un error. Tono editorial: titular "None fully meets your requirements" y, debajo, los requisitos incumplidos de cada coche como lista breve (`whyNotByCandidate` con `DEAL_BREAKER`). El `closestCandidate` aparece **en el cuerpo, no en el hero**, con la etiqueta "Closest option — not a recommendation", sin luz principal. Acción primaria: "Ajustar requisitos".

### 4.5 Cambio de ganador en vivo (tie → winner)

Ejemplo: 4 viajes largos (PRACTICAL_TIE) → 10 viajes largos (BYD).
1. `scenario_morph` (180 ms): las cifras afectadas se re-cuentan hasta el nuevo valor, con cifras tabulares para que nada salte de ancho.
2. `result_lock` (420 ms, `expo.out`): la luz simétrica se desplaza hacia el ganador (la luz de B se atenúa al 60 % y la de A sube); el estado del rail cambia con un *cross-fade* de texto.
3. Anuncio `aria-live="polite"`: "Result changed: BYD SEAL is now best for your needs."
4. Ni sonido, ni rebote, ni partículas. En reduced motion: corte directo y el mismo anuncio.

### 4.6 Confianza

Secundaria y textual: "Confidence · MEDIUM — why ›" en tamaño de UI, junto a un **indicador de 3 segmentos** monocromo (nunca un semáforo rojo/ámbar/verde). Al abrirlo se ven los 2–3 motivos (`recommendationConfidence.reasons`). La explicación pesa más que el nivel.

### 4.7 Procedencia

En la vista principal, un **punto de 6 px** junto a cada cifra:

| Tipo | Forma |
|---|---|
| OFFICIAL | relleno |
| CALCULATED | anillo |
| ESTIMATED | anillo discontinuo |
| USER PROVIDED | rombo |

Al pasar el foco aparece la etiqueta; al hacer clic se abre el *detail drawer* "How we calculated this" (fuente, fecha y fórmula). Nunca se muestran badges de texto en la vista principal. La capa 3 sí muestra la procedencia completa.

### 4.8 Patrón de cifra VScar (raw → meaningful → for you)

El patrón visual propio de VScar, en tres niveles tipográficos apilados:

```text
+122 KM                         display, cifras tabulares, color del candidato que gana la métrica
CLEAR DIFFERENCE                etiqueta técnica uppercase, tracking +0.08em (Meaningful Difference)
but only slightly relevant      cuerpo, muted (Meaningful For You), solo si difiere del nivel general
for your daily use
```

Si Meaningful For You coincide con la diferencia general, se omite la tercera línea. Si la cifra es un rango, la primera línea lo muestra (`€120–€620/year`); nunca se calcula un punto medio.

---

## 5. Sistema visual

### 5.1 Apariencia

**Dark-first** con tema claro adaptativo (`prefers-color-scheme` y ajuste manual, persistido por usuario). El automóvil y la luz funcionan mejor sobre fondo oscuro (como Forge), pero la capa 3 (tabla) y la impresión deben funcionar en claro. Las mismas superficies, tokens y contrastes AA en los dos temas.

### 5.2 Color (contraste WCAG medido sobre `base`)

| Token | Oscuro | Uso | Contraste |
|---|---|---|---|
| `base` | `#0B0C0E` | fondo de página | — |
| `surface` | `#15171A` | capítulos, sheet | — |
| `raised` | `#1E2125` | rail, drawers | — |
| `text` | `#F2F1EC` | texto principal | 17,3 |
| `muted` | `#A3A6AD` | secundario | 8,0 |
| `subtle` | `#7C8088` | solo texto grande o no esencial | 4,9 (4,1 sobre `raised`) |
| `candidate-a` | `#8EC5FF` | identidad del candidato A | 10,8 |
| `candidate-b` | `#E2BE8A` | identidad del candidato B | 11,2 |
| `warning` | `#F2994A` | requisito incumplido, verificar | 8,8 |
| `info` | `#B9C3D0` | procedencia, neutro | 11,0 |

En tema claro (fondo `#F4F3EF`): A `#1F5FAF` (5,7), B `#8A5A1C` (5,3), aviso `#A24A00` (5,4), muted `#5A5E66` (5,9).

Reglas:
- **No hay rojo/verde de ganador/perdedor.** A y B tienen una identidad estable (frío/cálido) durante toda la página; "gana" es luz y posición, no color.
- Las identidades A y B están en el eje azul/arena, que se distingue con deuteranopía y protanopía. Además, el color **nunca es el único canal**: siempre va con posición (izquierda/derecha), etiqueta y nombre.
- UNKNOWN: texto `muted` + patrón rayado, nunca el color de aviso (desconocido ≠ defecto).
- Confianza: monocromo.

### 5.3 Tipografía

| Rol | Familia (licencia) | Uso | Especificación |
|---|---|---|---|
| **Display** | **Geist** (SIL OFL 1.1) | nombres de coche, resultado, cifras protagonistas | `clamp(3.5rem, 9vw, 8.5rem)`, peso 500–600, tracking −0,03 em, line-height 0,95 |
| **Editorial accent** (lab A/B) | **Instrument Serif** (SIL OFL 1.1) | una palabra o frase por capítulo ("for *your* needs") | solo itálica, nunca para cifras |
| **UI** | Geist | texto, controles | 16 px base, line-height 1,5 |
| **Data / numeric** | **Geist Mono** (SIL OFL 1.1) + `font-variant-numeric: tabular-nums` en Geist | cifras, unidades, tablas | cifras tabulares obligatorias en todo número que cambie |
| **Technical labels** | Geist, uppercase | "CLEAR DIFFERENCE", etiquetas de capítulo | 12–13 px, tracking +0,08 em |

Máximo dos familias en producción (Geist + Geist Mono); Instrument Serif solo si el lab demuestra que aporta. Titulares de 2 líneas como máximo. Las cifras grandes llevan la unidad en el tamaño de etiqueta, alineada a la línea base.

### 5.4 Vehículos sin fotos

Sin fotos de prensa, imágenes aleatorias ni logos (Plan §40). Alpha usa **siluetas por carrocería** (sedán, SUV, hatchback, ranchera…) dibujadas como formas vectoriales propias y escaladas por las dimensiones reales (`dim.length_mm`, `dim.height_mm`, `dim.wheelbase_mm` cuando existen). La presencia física sale de la luz, no del detalle:
- **2D (base, siempre)**: SVG con degradado de reflejo, línea de suelo y sombra de contacto. Cero JS de WebGL.
- **3D (lab, mejora)**: la silueta extruida (perfil SVG → `ExtrudeGeometry`) en R3F, con material satinado, luz de estudio (key + rim), suelo reflectante muy sutil y parallax de cámara ligado al scroll. Es la versión VScar del "foto con profundidad" de Forge, sin necesitar fotos.
- La proporción relativa A/B es **real** (escala común): la diferencia de tamaño es información (principio 2).

---

## 6. Gramática de scroll

| Técnica | Regla VScar |
|---|---|
| Scroll nativo | **Siempre**. Sin `preventDefault` sobre rueda o táctil, sin scroll-jacking |
| Smooth scroll (Lenis) | **No por defecto en Alpha**. Forge y Singularity lo usan, pero suaviza contra la intención en una herramienta de lectura rápida y complica INP y la navegación por teclado. Se mide en el lab como experimento A/B solo en escritorio y con `pointer: fine` |
| Sticky | CSS `position: sticky` dentro de secciones de ≤ 1,5 viewports (patrón Forge). No hay `pin` de GSAP en Alpha |
| Scrub | Solo para mostrar **magnitud o progresión** (crecimiento de barras, conteo de cifras, separación A/VS/B). Suavizado `scrub: 0.2` (Forge) |
| Disparo único | Revelados de texto, `result_lock`: se disparan una vez al entrar (no reversibles al subir; al volver se muestran en el estado final) |
| Crossfade de fondo | `background_shift` entre capítulos (cambio de tono de la atmósfera), con scrub suave |
| Horizontal | **Prohibido** en Alpha (ni secuencias horizontales ancladas ni carruseles de capítulos) |
| Snap | Prohibido (rompe el fast path y el lector rápido) |
| Profundidad | Parallax de cámara/silueta ≤ 4 % del viewport, solo en el hero y el capítulo 01 |

El usuario debe poder recorrer toda la página con la rueda a velocidad normal sin perder información: **ninguna animación oculta contenido hasta que termina**. El estado final de cada capítulo es legible a mitad de la animación.

---

## 7. Gramática de movimiento (tokens)

Duraciones en ms. Las easings son nombres GSAP, con su equivalente cúbico para CSS o Motion.

| Token | Propósito | Disparo | Duración | Easing | Reduced motion |
|---|---|---|---|---|---|
| `vehicle_entry` *(existente)* | presenta cada contendiente | entrada en viewport del capítulo 00 | 900 | `expo.out` · `cubic-bezier(.16,1,.3,1)` | fade 150 |
| `versus_transition` *(existente)* | A y B se separan del centro: comparación | scrub en 00 (0,5 vh) | scrub | `none` (lineal con scrub 0,2) | corte directo |
| `stat_reveal` *(existente)* | barras proporcionales al valor | entrada del bloque | 600 | `power3.out` | estático |
| `winner_reveal` *(existente)* | luz al ganador | `result_lock` | 420 | `expo.out` | énfasis estático (peso + luz) |
| `comparison_shift` *(existente)* | reordenar al cambiar el escenario | recálculo | 320 | `power2.inOut` | sin animación |
| `card_hover` *(existente)* | feedback | hover/focus | 160 | `power2.out` | color sin movimiento |
| `scroll_depth` *(existente)* | parallax de jerarquía | scroll | scrub | `none` | desactivado |
| `hero_depth` *(nuevo)* | profundidad de la silueta en el hero | puntero (solo `pointer: fine`) + scroll | continuo, amortiguado (lerp 0,08) | — | desactivado |
| `vehicle_focus` *(nuevo)* | qué coche protagoniza la cifra | entrada de un capítulo de motivo | 360 | `power3.out` | cambio de opacidad instantáneo |
| `vehicle_crossfade` *(nuevo)* | cambiar un candidato | sustitución de vehículo | 400 | `power2.inOut` | corte |
| `section_enter` *(nuevo)* | jerarquía de entrada del capítulo (máscara de línea) | 20 % visible, una vez | 700 (stagger 60/línea) | `power3.out` | visible al entrar |
| `section_exit` *(nuevo)* | **no se usa** salvo en el hero (atenuar al 40 %) | scroll | scrub | `none` | — |
| `metric_scrub` *(nuevo)* | conteo de la cifra protagonista + barra | scrub en el capítulo de motivo (≤ 0,5 vh) | scrub | `none` | cifra final estática |
| `result_lock` *(nuevo)* | fijar el resultado: el estado deja de "moverse" | entrada en 01 o cambio de resultado | 420 | `expo.out` | estado final directo |
| `tie_balance` *(nuevo)* | equilibrio simétrico del empate | `result_lock` con PRACTICAL_TIE | 420 | `power2.inOut` | composición simétrica estática |
| `confidence_reveal` *(nuevo)* | motivos de confianza | apertura del bloque | 240 | `power2.out` | visible |
| `scenario_morph` *(nuevo)* | cifras que cambian por el escenario | recálculo (debounce 250) | 180 | `power2.out` | sustitución directa + `aria-live` |
| `background_shift` *(nuevo)* | tono de la atmósfera por capítulo | scrub entre capítulos | scrub | `none` | color fijo |
| `comparison_focus` *(nuevo)* | resaltar candidato en el rail | capítulo de motivo | 200 | `power2.out` | subrayado estático |

Límites: interacción ≤ 400 ms; reveal ≤ 1,2 s; ninguna animación en bucle visible mientras se lee texto (la atmósfera de fondo se mueve a ≤ `speed 0.3` y se congela en reduced motion). Stagger máximo 60 ms por elemento y 6 elementos por grupo.

---

## 8. Stack de animación: responsabilidades

| Capa | Librería (licencia) | Responsabilidad | No hace |
|---|---|---|---|
| **UI motion** | **Motion** 13 (MIT) | microinteracciones, hover/focus, layout transitions (`comparison_shift`), entrada/salida de sheets y drawers, `scenario_morph` de componentes React | nada ligado al scroll |
| **Scroll orchestration** | **GSAP** 3.15 + `@gsap/react` (`useGSAP`), **ScrollTrigger**, **SplitText** (Standard "no charge", incluye todos los plugins; prohibido solo construir un editor visual que compita con Webflow) | `versus_transition`, `metric_scrub`, `section_enter` (SplitText por líneas con máscara), `background_shift` | hover, layout de React, WebGL |
| **WebGL atmosphere** | **ThreeUI Community** (MIT), solo fondos WebGL nativos sin Three | atmósfera del hero y de los capítulos | transmitir información |
| **3D vehicle scene** | **React Three Fiber** 9 + **three** (MIT); drei solo piezas sueltas. Alternativa medida en el lab: **OGL** (Unlicense) | silueta extruida iluminada (lab) | texto, UI, scroll |
| **CSS** | — | `sticky`, transiciones triviales, reduced motion global | — |

Reglas anti-solapamiento:
1. **Una propiedad, un dueño**: un mismo elemento y propiedad nunca lo animan Motion y GSAP a la vez. Lo que se ancla al scroll es de GSAP; lo que responde a estado de React es de Motion.
2. Botón u hover → Motion o CSS. Timeline de scroll → GSAP. Escena WebGL → ThreeUI o R3F, y su progreso de scroll se lo pasa GSAP como un valor (`progress 0..1`), nunca un segundo ScrollTrigger dentro del canvas.
3. Un solo bucle `requestAnimationFrame` por escena WebGL; las escenas fuera de viewport se pausan (ThreeUI ya lo hace con IntersectionObserver; R3F con `frameloop="demand"` fuera de vista).
4. SplitText solo en titulares (≤ 3 por página) y con el patrón accesible de Forge: `sr-only` + copia `aria-hidden`.
5. Sin CustomEase ni Observer en Alpha (los easings estándar cubren los tokens; Observer implicaría secuestrar gestos).

Bundles (gzip). Medidos el 2026-10-02 sobre los tarballs de npm, salvo lo marcado "a medir":

| Bloque | Medido | Notas |
|---|---|---|
| GSAP 3.15 core + ScrollTrigger + SplitText (`.min.js`) | **48,7 KB** (27,6 + 17,5 + 3,6) | diferido tras el LCP |
| Lenis 1.3 (si se adoptara) | 5,3 KB | no por defecto |
| Fondo ThreeUI (cada uno, grafo de imports) | **2–5 KB** | WebGL nativo, sin Three |
| three 0.186 `three.module.js` + `three.core.js` (sin minificar) | 127,7 + 279,8 KB | el *tree-shaking* real de una escena simple es menor: **a medir** |
| R3F 9.8 (chunk principal, sin minificar, incluye `react-reconciler`) | 154,2 KB | minificado será menor: **a medir** |
| Motion 13 | a medir con `LazyMotion` + `domAnimation` | |

**Riesgo explícito**: three + R3F para una sola silueta puede **superar los 250 KB** del chunk 3D. Por eso la silueta 3D es un experimento del lab y no un compromiso: si R3F no cabe, la alternativa es **OGL** (Unlicense, la opción de Forge) o WebGL nativo con la técnica de Forge (luz y profundidad 2,5D sobre la silueta renderizada a textura). La silueta SVG (2D) es siempre la base.

---

## 9. Estrategia ThreeUI (resumen; detalle en [THREEUI_EVALUATION.md](THREEUI_EVALUATION.md))

- Versión 1.2.0, MIT, Community (Pro no se publica en npm y no se usa). No depende de R3F. Peer `react >=18 <20` y `three >=0.149`.
- **Sí**: atmósfera de fondo del hero, del VS y de los cambios de capítulo, con los fondos WebGL nativos (RibbonField, StreamConvergence, LiquidForm…), que pesan 2–5 KB, se pausan fuera de vista y liberan recursos.
- **No**: componentes que cargan iframes o librerías desde CDN (familia "Neuform": PerformanceGauges, botones, CTAs…), componentes que traen Three r128 (EmeraldHorizon, DotMatrix), galerías de 1 MB, personajes, landing pages completas, y cualquier componente Pro.
- **Siempre envueltos**: wrapper propio `'use client'` + `next/dynamic({ ssr: false })` + IntersectionObserver + `speed: 0` en reduced motion + DPR ≤ 1,5 + fallback CSS. ThreeUI no trae `'use client'` ni respeta `prefers-reduced-motion` en esos fondos.
- Importar siempre por subruta (`@designcodeio/threeui/components/RibbonFieldBackground`), nunca el índice.

### 9.1 Shortlist de efectos (todas las librerías)

| Effect | Library | Role | Priority | Desktop | Mobile | Reduced Motion |
|---|---|---|---|---|---|---|
| Hero atmosphere | ThreeUI `RibbonFieldBackground` (A/B `StreamConvergenceBackground`) | atmósfera y luz de fondo en 00/01 | P1 · lab | HIGH DPR 1,5 · LOW DPR 1 | LOW o 2D | congelado / degradado CSS |
| Vehicle entry + depth | SVG (base) · R3F silueta extruida (HIGH) · alternativa OGL | presencia física sin fotos | P1 · lab | R3F en HIGH si ≤ 250 KB; SVG en LOW | SVG | fade 150 ms, sin parallax |
| VS transition | GSAP ScrollTrigger (scrub 0,2) + SplitText | comparación / progresión en 00 | P1 · lab | sticky 1 vh + 0,5 vh de scrub | sin sticky, entrada simple | corte directo |
| Result reveal / tie_balance / tie → winner | Motion (estado/layout) + luz de la escena | cambio de estado | P1 · lab | `result_lock` 420 ms | igual, −30 % duración | estado final + `aria-live` |
| Metric scrub (raw → meaningful → for you) | GSAP ScrollTrigger + cifras tabulares | magnitud | P1 · lab | scrub ≤ 0,5 vh | entrada al ver (sin scrub) | cifra final |
| Section enter (máscara de línea) | GSAP SplitText | jerarquía | P2 | ≤ 3 titulares por página | igual | texto visible |
| Scenario morph | Motion | recálculo en vivo | P2 | 180 ms | igual | sustitución directa |
| Chapter background shift | ThreeUI `LiquidFormBackground` o CSS | cambio de capítulo | P3 | solo si el lab aporta | CSS | color fijo |

### 9.2 Efectos rechazados

Familia ThreeUI "Neuform" (gauges, botones, CTAs, fields: iframe + CDN + `window` en el módulo) · EmeraldHorizon/DotMatrix (Three r128) · Gallery, Bookshelf, Character* (384 KB–1,1 MB) · Condensation, Warp, CRT, typography vortex/neón/outline (estética ajena) · cursor custom y trail de imágenes · humo o distorsión sobre fotos · smooth scroll global · secuencias horizontales ancladas · scroll snap · loader cinematográfico · audio · partículas/confeti · cualquier componente Pro.

---

## 10. Rendimiento

### 10.1 Presupuestos (contrato, Master Plan §26)

| Página Car VS interactiva | Objetivo |
|---|---|
| LCP | ≤ 2,5 s (p75 móvil) |
| INP | ≤ 200 ms |
| CLS | ≤ 0,1 |
| JS inicial | ≤ 200 KB gzip |
| Chunk 3D (three + R3F + escena) | ≤ ~250 KB gzip, diferido tras LCP |

El LCP es **texto o SVG** (nombre de coche o silueta 2D), nunca un canvas.

### 10.2 Orden de carga

1. HTML: nombres, resultado, cifras, siluetas SVG y tabla. Servidor y estático. **Página completa sin JS de animación.**
2. CSS crítico + fuentes Geist con `font-display: swap` y fallback métrico (evita CLS).
3. Hidratación de React y del motor de decisión en cliente (para recalcular).
4. Tras el LCP (`requestIdleCallback`): GSAP + ScrollTrigger + SplitText.
5. Por proximidad (IntersectionObserver con `rootMargin 200%`): fondos ThreeUI.
6. Solo en tier HIGH y cuando el hero es visible: chunk R3F de la silueta 3D, con `next/dynamic({ ssr:false })`.

### 10.3 Tiers de calidad

Se calculan una vez en cliente y se pueden forzar desde el ajuste "Efectos visuales: Completo · Ligero · Sin efectos".

| Señal | HIGH | LOW | 2D |
|---|---|---|---|
| `prefers-reduced-motion: reduce` | — | — | siempre 2D |
| `navigator.connection.saveData` | — | — | 2D |
| `effectiveType` `2g`/`slow-2g`/`3g` | — | LOW | 2D si `2g` |
| `deviceMemory` | ≥ 8 | 4 | ≤ 2 |
| `hardwareConcurrency` | ≥ 8 | 4–6 | ≤ 2 |
| WebGL2 disponible | sí | sí (WebGL1 vale) | no → 2D |
| FPS medido los primeros 2 s | ≥ 55 | 40–55 | < 40 → baja un tier |
| Puntero | `pointer: fine` | cualquiera | cualquiera |

| Efecto | HIGH | LOW | 2D |
|---|---|---|---|
| Atmósfera | ThreeUI DPR 1,5 | ThreeUI DPR 1, `speed 0.3` | degradado CSS estático |
| Silueta | R3F extruida + luz de estudio + parallax | SVG + `hero_depth` CSS | SVG estático |
| `versus_transition` / `metric_scrub` | GSAP scrub | GSAP scrub | estado final |
| SplitText | por líneas | por líneas | texto estático |

Si WebGL falla (contexto perdido, shader no compila, sin WebGL), el componente se sustituye en silencio por su fallback 2D. Nunca se bloquea el contenido ni se muestra un error.

### 10.4 Plan de medición (Step 6e y CI posterior)

| Métrica | Herramienta | Umbral |
|---|---|---|
| Bundle por ruta y chunk 3D | `size-limit` + `@next/bundle-analyzer` en CI | ver §10.1 |
| LCP / CLS / INP | Lighthouse CI (móvil, 4× CPU, Slow 4G) + `web-vitals` RUM en el lab | ver §10.1 |
| FPS | `stats-gl` en dev + Performance panel (traza de 10 s con scroll) | HIGH ≥ 55 fps, LOW ≥ 45 fps |
| CPU | trazas de Chrome con CPU 4×; *long tasks* > 50 ms durante el scroll | 0 long tasks en el hilo principal debidas a animación |
| Memoria | heap + `renderer.info` (geometrías y texturas) tras 3 ciclos de montar/desmontar | sin crecimiento (sin fugas) |
| GPU / batería | Android de gama media real + iPhone; escena 60 s | sin *throttling* térmico visible |

---

## 11. Móvil

- Narrativa **vertical**; sin sticky en los capítulos de motivo (el contenido fluye) y como máximo un sticky (00 VS, 1 viewport).
- Siluetas apiladas en 00 y lado a lado pequeñas a partir de 01. Sin parallax de puntero.
- WebGL: solo atmósfera ThreeUI en tier LOW, sin R3F salvo tier HIGH demostrado en el lab (iPhone reciente). En gama media, 2D.
- El rail es una **barra inferior** (56 px, con zona segura) con A · estado · B y botón "Uso".
- La sheet de escenario sube desde abajo (85 % de altura), con controles táctiles de ≥ 44 px, sliders con valor numérico editable y presets como chips.
- Tabla de detalle sin tablas diminutas: cada categoría es una lista de pares `métrica · A · B`, expandible, con la diferencia debajo.
- Transiciones más cortas (−30 % en duración), stagger 40 ms.

## 12. Escritorio

Tipografía display grande, sticky split en 00 (A | VS | B) y en los capítulos de motivo (cifra a la izquierda, barras o siluetas a la derecha), scroll con scrub, atmósfera WebGL y silueta 3D en tier HIGH, chapter rail lateral y atajos de teclado.

## 13. Reduced motion (experiencia completa)

Con `prefers-reduced-motion: reduce` (o el ajuste "Sin efectos"), **toda la información está igual de presente**; solo cambia cómo aparece:

| Token | Comportamiento |
|---|---|
| `vehicle_entry` | fade 150 ms |
| `versus_transition` | corte directo al estado A · VS · B |
| `metric_scrub` | cifra final estática, barras en su valor final |
| `winner_reveal` / `result_lock` | énfasis estático (peso display + luz fija) |
| `tie_balance` | composición simétrica estática |
| `section_enter` / SplitText | texto visible sin animación |
| `scroll_depth` / `hero_depth` / `background_shift` | desactivados |
| Atmósfera WebGL | 2D (degradado) o fondo congelado `speed 0` |
| Sticky | se mantiene solo el rail (orientación); capítulos sin sticky |
| Cambios de escenario | sustitución directa + anuncio `aria-live` |

## 14. Accesibilidad (WCAG 2.2 AA)

- Estructura semántica: un `h1` (el resultado o "A vs B"), un `h2` por capítulo, `nav` para el chapter rail, `main`, tablas reales (`<table>`, `<th scope>`) en la capa 3.
- Todo `<canvas>` lleva `aria-hidden="true"` y **ninguna información solo en WebGL** (principio 6).
- Texto animado con el patrón `sr-only` + copia `aria-hidden` (Forge).
- Cambios de resultado y cifras recalculadas anunciados con `aria-live="polite"`. Foco visible propio (outline de 2 px, contraste ≥ 3:1).
- Teclado completo: rail, sheet (focus trap, `Esc` cierra), drawers de procedencia y atajos documentados con `?`.
- Los objetivos táctiles cumplen WCAG 2.2: ≥ 24 px siempre (2.5.8) y 44 px en móvil.
- Color nunca como único canal (§5.2).
- Contraste verificado en ambos temas (§5.2).

## 15. SEO

Dos experiencias distintas:
- **Interactive Car VS** (`/es-es/comparar/...` con escenario personalizado): la experiencia rica de este documento.
- **Página SEO de comparación** (programática): **HTML-first**, RSC estático con resultado, motivos, tabla completa y siluetas SVG. **Sin WebGL**, con Motion mínimo y sin dependencia de JS para el contenido. Los crawlers no dependen de Three ni de GSAP.

Las dos comparten tipografía, color, patrón de cifra y procedencia, así que se reconocen como el mismo producto.

## 16. Otras decisiones

| Tema | Decisión |
|---|---|
| Cursor custom | **No**. El trail de Forge es marca de un atelier, no de una herramienta de decisión. Cursor del sistema; los estados hover van en los elementos |
| Sonido | **No en Alpha** (Soviet Flip lo usa como narrativa). Sin autoplay de audio en ningún caso; podría reevaluarse para un modo "presentación" post-MVP |
| Intro / loader | **No hay loader obligatorio**. El HTML y el resultado aparecen de inmediato. La entrada del hero (`vehicle_entry`, 900 ms) es la única "intro" y no bloquea el scroll ni el contenido. Si la escena 3D tarda, se queda la silueta SVG |
| View Transitions | Sí, entre rutas (lista → VS → detalle), como Forge y Soviet Flip; con fallback nativo si no hay soporte |
| Smooth scroll | No por defecto (§6) |
| Fotos | No en Alpha (licencias). Siluetas propias (§5.4) |

## 17. Qué NO copiar

- El trail de imágenes, el cursor y el humo o distorsión sobre fotografías (Forge).
- El scroll suavizado como norma (Forge, Singularity, Armor).
- La estética AI o espacial y el bundle monolítico (Singularity).
- El audio, el tono documental y las 10 familias tipográficas (Soviet Flip).
- R3F + drei + GLB de 2,6 MB y el naranja dominante (Armor).
- Cualquier secuencia horizontal anclada, el *scroll snap* o los loaders cinematográficos.
- Rojo/verde de ganador, confeti, glow, zoom triunfal y semáforos de confianza.

---

## 18. Step 6e — ThreeUI / Motion Lab (siguiente paso)

### 18.1 Alcance

Una app **aislada** de laboratorio, `labs/motion-lab` (Next.js App Router + React 19 + TypeScript strict). No es `apps/web` ni se publica. Sin DB, sin API, sin routing de producción y sin selector de vehículos.

Datos reales calculados **en el navegador** con `createDecisionPipeline` (Steps 5–6c) sobre los fixtures BYD SEAL y Tesla Model 3 2021, y las referencias de mercado grabadas. Así el lab demuestra que los contratos alimentan la UI sin servidor.

Mini experiencia:

```text
00 BYD SEAL ── VS ── MODEL 3                        (vehicle_entry + versus_transition)
01 PRACTICAL TIE        (commuter: 35 km/día, carga en casa, 1 viaje largo/año → tie_balance)
   [ Cambiar tu uso ] → viajes largos 1 → 10        (sheet)
01 BEST FOR YOUR NEEDS: BYD SEAL                    (scenario_morph + result_lock)
02 THE RANGE  +122 KM · CLEAR · matters for 10 trips/year   (metric_scrub)
```

### 18.2 Efectos que se prueban (5)

| # | Efecto | Librería | Rol |
|---|---|---|---|
| 1 | **Hero atmosphere** | ThreeUI `RibbonFieldBackground` (alternativa A/B: `StreamConvergenceBackground`) | atmósfera, luz de fondo por capítulo |
| 2 | **Vehicle entry + depth** | SVG (2D) · R3F (silueta extruida + luz de estudio) · alternativa OGL/WebGL 2,5D si R3F supera el presupuesto | presencia física sin fotos |
| 3 | **VS transition** | GSAP ScrollTrigger (scrub) + SplitText | comparación y progresión |
| 4 | **Result reveal / tie → winner** | Motion (estado y layout) + luces de la escena | cambio de estado sin casino |
| 5 | **Metric scrub** (raw → meaningful → for you) | GSAP ScrollTrigger + cifras tabulares | magnitud |

### 18.3 Gate por efecto

Cada efecto se prueba en **escritorio HIGH, escritorio LOW, móvil (Android de gama media + iPhone) y reduced motion**. Para cada uno se registran bundle, FPS, long tasks, LCP, INP, CLS y memoria tras 3 ciclos de montar/desmontar (§10.4).

Se **descarta** cualquier efecto que:
- supere el presupuesto de su chunk;
- baje de 45 fps en LOW;
- produzca long tasks durante el scroll;
- mueva el LCP o el CLS;
- o no tenga un fallback 2D equivalente en información.

Entregables del lab: `docs/design/MOTION_LAB_RESULTS_V0_1.md` con la tabla de mediciones, la decisión por efecto (keep / adjust / drop) y la configuración final de tokens. Lenis se prueba como A/B opcional en escritorio y su adopción solo se decide con datos.

### 18.4 Lo que el lab no hace

No crea `apps/web`, no implementa SEO, autenticación ni charts, no integra MySQL ni usados, y no toca ningún engine.
