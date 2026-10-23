# VScar — D1.8 Informe UX del selector

> Estado: **implementado y verificado en escritorio y móvil** · 2026-10-22
> - **Componente**: [`VehiclePicker.tsx`](../../apps/web/src/components/catalog/VehiclePicker.tsx).
> - **e2e** (build de producción, canal PREVIEW, `vscar_dev`): [`selector.spec.ts`](../../apps/web/e2e/selector.spec.ts) · [`d18-real-vehicles.spec.ts`](../../apps/web/e2e/d18-real-vehicles.spec.ts).

## 1. Antes y después

| | Antes (Step 7b.2) | Después (D1.8, ADR-020) |
|---|---|---|
| Pasos | Marca → Modelo → Año → **Versión** (obligatorio) | Marca → Modelo → Año |
| Golf 2018 | dos filas «Advance 1.5 TSI EVO 130 CV», una con «homologación NEDC» y otra con «homologación WLTP» | una opción; el coche queda elegido al pulsar el año |
| Tesla Model 3 2021 | tres filas (dos «Autonomía estándar plus» y una «Tracción trasera») | aclaración contextual con dos opciones reales + «No lo sé» |
| Modelos sin variante seleccionable | no aparecían | aparecen (solo PREVIEW) con «Solo datos técnicos»; el año muestra la información y «Comparación no disponible» |
| Progreso (móvil) | `n / 4` | `n / 3` |
| Detalle técnico (TAN/Va/Ve) en las filas de versión (PREVIEW) | visible | retirado del selector (sigue en `/internal/catalog`, con autenticación) |

## 2. Interfaz

- **Diseño**: mismo diseño oscuro, tipografía, espaciado, tokens y componentes. Solo se añaden dos paneles (aclaración y «no disponible») con estilos mínimos sobre los tokens existentes.
- **Aclaración**: no es un paso de la navegación lateral. Aparece en el panel del paso Año con la pregunta «¿Qué motorización tiene o prefieres?» y opciones descritas con hechos comprensibles: versión, tren motriz, combustible, potencia, caja y autonomía. Nunca muestra ciclos ni códigos.
- **Resumen**: el coche elegido muestra «Motorización» (versión + descripción) en lugar de «Versión».
- **Años**: cuando un año solo procede de matriculaciones, se señala con «matriculaciones».
- **Números**: con el formato del idioma (110,1 kW en español).
- **Búsqueda directa**: sigue disponible y muestra un resultado por grupo equivalente.
- **Navegación atrás**: Resumen → aclaración (si la hubo) o Año; «no disponible» → Año; «No lo sé» → aclaración.

## 3. Accesibilidad

- **Diálogo**: Radix, con foco en el título de cada paso al avanzar o volver (comprobado en e2e) y `aria-current="step"` en la navegación de tres pasos.
- **Teclado**: botones nativos; recorrido completo con Tab + Enter (e2e «keyboard only»).
- **Avisos**: los paneles nuevos usan `aria-live="polite"` en el contenedor del contenido.
- **Objetivos táctiles** ≥ 44 px (año y Nuevo/Usado medidos en e2e móvil).

## 4. Móvil (390 × 844, táctil)

- **Hoja**: a pantalla completa (≥ 388 px de ancho) y navegación lateral oculta; el progreso se ve como `1 / 3` … `3 / 3`.
- **Escenarios reales**: los 7 sin scroll horizontal (comprobado `scrollWidth ≤ innerWidth`).
- **Capturas revisadas**: Golf 2018 en escritorio, Kia Sportage 2022 en móvil y Toyota Corolla 2022 en escritorio. Se generan con `VSCAR_D18_SHOTS=<dir>` y no se versionan.

## 5. ES/EN

Textos nuevos en `catalog.picker`, en `es.json` y `en.json` con las mismas claves:
- Motorización / Powertrain
- Datos insuficientes / Insufficient data
- Acabado no confirmado / Trim not confirmed
- Comparación no disponible / Comparison unavailable
- Solo datos técnicos / Technical data only
- No lo sé / I don't know
- motivos, combustibles y base del año

Marca, Modelo y Año reutilizan las claves existentes. Sin cadenas visibles en el código: lo comprueba el test de i18n existente, y el e2e verifica que ES y EN muestran las mismas marcas, años y configuraciones.

## 6. Resultado e2e (build de producción, `next start`, PREVIEW)

| Suite | Resultado |
|---|---|
| Completa (`playwright test`) | **32/32** |
| D1.8 vehículos reales (escritorio + móvil) | 2/2 |

En el servidor de desarrollo (`next dev`), tres tests fallaron de forma intermitente. El diálogo no se abría antes de que la página terminara de hidratarse, porque `next dev` compila bajo demanda. Contra el build de producción, para el que están diseñados, pasan todos.
