# VScar Web — Shareable Comparisons v0.1 (Step 7c)

> Estado: **PASS** · 2026-10-14 · Decisión: [ADR-015](../adr/ADR-015-comparison-url-and-indexability.md) · SEO: [SEO_FOUNDATION_V0_1](SEO_FOUNDATION_V0_1.md)

```
El usuario elige dos coches ─▶ URL estable /{idioma}-{mercado}/compare/{a}-vs-{b}
     cambia el escenario     ─▶ la URL lo representa (?km=18000&trips=10…)
     comparte                ─▶ otro navegador abre la URL ─▶ mismos coches, mercado, escenario y decisión
mientras canonical, OG e indexación representan la comparación BASE (sin escenario).
```

## 1. URL y reconstrucción

- **Ruta**: idioma + mercado + par (orden del usuario: colores A/B).
- **Query**: escenario serializado de forma determinista, con solo los valores distintos del defecto (7a). Una query inválida usa valores seguros (aviso, nunca 500).
- **Datos**: los vigentes, con su `dataSnapshot` visible en "Cómo lo calculamos" ("Datos del catálogo: 2026-10-14").
- **Sin estado de usuario**: sin login, sin sesión, sin base de datos para compartir, sin acortador de URL. La URL es la comparación.
- **Intercambiar**: B-vs-A conserva el escenario y el canonical apunta al orden canónico. Cambiar coche (selector 7b.2) también conserva el escenario.
- **Idioma**: el cambio conserva par, escenario y mercado. Cada idioma tiene su canonical y su metadata.

## 2. Botón "Compartir comparación" (`ShareComparison`)

Isla cliente mínima (en el hero, junto a "Intercambiar coches").

1. **Web Share API** si existe (sobre todo móvil): `{ title, text, url }` con:
   - `url` = la URL **actual completa**;
   - `text` = "Mira esta comparación de VScar: A vs B" / "Check this VScar comparison: A vs B".
   - Si el usuario cierra el diálogo no pasa nada.
2. Si no existe Web Share o falla: **copiar enlace** (`navigator.clipboard`) y mostrar "Enlace copiado" / "Link copied" en una región `aria-live="polite"`, durante 2,5 s. No es un toast permanente.
3. Si tampoco hay portapapeles: aviso para copiar la dirección del navegador.

La URL compartida solo contiene lo que el usuario puso en ella (par + escenario): ningún dato personal.

## 3. Página de comparación enriquecida

Respuesta primero, detalle después, metodología al final.

| Bloque | Qué hay |
|---|---|
| Migas | Inicio → Comparar → A vs B (discreto) |
| VS | coches, versión, Cambiar, Intercambiar, Compartir, Cambiar tu uso |
| Barra de vehículos | fija bajo la cabecera al bajar (CSS sticky, 40 px; "A VS B" + "Saltar al resultado"); sin JS |
| Capítulos | `buildComparisonChapters` (ver abajo) |
| Detalle | grupos plegables (Economía, Prestaciones, Autonomía, Carga, Espacio, Seguridad, Garantía, Tecnología, Eco) con filas `MetricCompare` |
| Cómo lo calculamos | energía de referencia y sus derechos, ciclos, fuentes, atribución, versiones, **fecha de datos**, enlace a Metodología |

### Capítulos dinámicos (`buildComparisonChapters`)

La UI no decide qué es importante: cada capítulo opcional existe solo si el engine lo hace relevante. 6–9 capítulos.

| Capítulo | Cuándo |
|---|---|
| VS · Tu resultado | siempre |
| Diferencia clave (≤ 2) | contribuciones del engine; en empate, diferencias relevantes que para ti pesan menos |
| Coste de uso | líder económico comparable (si no es ya un motivo) o ciclos **NO comparables** (NEDC vs WLTP, sin ganador) |
| Capacidad técnica | diferencias técnicas ≥ MEANINGFUL que no son ya un motivo (+ puntuación técnica separada) |
| Encaje práctico | algún requisito FAIL, con concesiones o sin confirmar, o estados distintos |
| Lo que sacrificas | Why Not / tradeoffs / verificar |
| Qué cambia el resultado · Confianza · Comparación completa | siempre |

Prioridad de selección (§30): requisitos → económico → técnico → tradeoffs. Orden en la página (§27): resultado → motivos → económico → técnico → práctico → tradeoffs → cambio → confianza → detalle.

### Filas de detalle (`MetricCompare`)

```
AUTONOMÍA ELÉCTRICA
570 km                                   448 km
        122 km · Por delante: BYD SEAL · Ventaja clara
        Para tu uso: Ligera
```

- Cifras grandes alineadas (A a la izquierda en azul, B a la derecha en arena) y divisores sutiles; nada de tabla con iconos.
- La diferencia va **sin signo** junto a quién va por delante, así se lee bien tanto si "más es mejor" como si "menos es mejor" (consumo).
- `UNKNOWN` = "No confirmado" (nunca 0); `NOT_COMPARABLE` muestra el motivo, sin ganador; el rango se conserva.
- Coste de uso: horizonte explícito ("5 AÑOS") y "Vista de costes conocidos" (no "coste total de propiedad").

## 4. Accesibilidad

- Saltos: "Saltar al contenido", "Saltar al resultado", "Saltar a los detalles" (E2E).
- Botón de compartir nativo con estado anunciado.
- La barra de vehículos es un `aside` con nombre y no tapa los títulos.
- Migas con `aria-current="page"`.
- Detalle en `<details>` nativos, operable con teclado.

## 5. Rendimiento (build de producción local, `scripts/perf-7c.ts`)

| Medida | Resultado | Presupuesto |
|---|---|---|
| JS inicial de la comparación | **154,0 KB** gzip (192,6 con polyfills `noModule`) | ≤ 200 KB |
| Compartir | todo el Step 7c suma +1,0 KB al JS inicial (153,0 → 154,0 KB), compartir incluido | despreciable |
| LCP (5 cargas) | escritorio 304–1.228 ms (la primera en frío) · móvil ×4 308–512 ms | ≤ 2,5 s |
| CLS | **0** (escritorio y móvil, tras reservar 3 líneas de titular y de explicación en móvil) | ≤ 0,1 |
| INP, p75 de 5 cargas | escritorio 104 ms · móvil ×4 72 ms | ≤ 200 ms |
| INP, peor carga | escritorio 184 ms · móvil ×4 296 ms (una carga: primera interacción mientras se descargan los chunks visuales diferidos; procesamiento real 2–9 ms) | — |
| SSR (TTFB) URL base | p50 24–95 ms · p95 38–201 ms (varias rondas; máquina compartida) | — |
| SSR escenario nuevo | p50 318 ms · p95 412 ms (robustez, igual que 7a/7b) | — |

Hallazgo de CLS: con el contrato de mensajes (7a.1), la explicación del resultado y el titular cambian de longitud entre empate y elegido. En móvil, el recálculo llegaba más de 500 ms después del clic y contaba como desplazamiento (0,055). Ahora se reservan las líneas necesarias en pantallas estrechas.

## 6. Step 8b — unidades usadas en la URL

- La URL añade un bloque propio y versionado con la condición y los hechos de cada lado (`u=1&b=used&b_price=28000&b_km=84000&b_reg=2019-03&b_service=partial&eval=2026-10-15`), separado del escenario. Detalle: [USED_COMPARISON_INTEGRATION_V0_1 §2](../used/USED_COMPARISON_INTEGRATION_V0_1.md#2-url-compartible-contrato-u1) y [ADR-017](../adr/ADR-017-used-facts-in-url-and-participant-identity.md).
- Compartir sigue usando la URL completa; si incluye hechos de usado, se avisa antes: "El enlace incluirá el precio, el kilometraje y el estado que has introducido."
- Canonical/OG: los del par base; la vista con hechos de usado es `noindex` y sin JSON-LD (misma variant en los dos lados: sin canonical).
- Intercambiar mueve condición y hechos con su vehículo; cambiar de coche nunca reutiliza los hechos de la unidad anterior; escenario e idioma conservan el bloque.

### Step 8c — fecha de evaluación

- La vista muestra "Fecha de evaluación: 15 de octubre de 2026." (capítulo "Este usado" y "Cómo lo calculamos"): fija la antigüedad y los factores temporales de los usados. Abrir un enlace antiguo **no** la cambia.
- **Actualizar análisis a hoy**: misma URL con `eval` = hoy del mercado (coches, hechos, escenario e idioma intactos) + `prev_eval` transitorio para explicar qué cambió ("Cambia: el resultado / el encaje práctico / la información de la unidad / los aspectos a revisar" o "no cambian"). `prev_eval` se retira de la URL al cargar: no se comparte.
- La fecha fija la edad; catálogo, precios de energía o versión de metodología pueden haber cambiado (versiones y fecha de datos visibles).

## 7. Fuera de alcance

PDF, favoritos, comparaciones guardadas, acortador, cuentas, analytics, ratings, comentarios y páginas de modelo (posible 7d).
