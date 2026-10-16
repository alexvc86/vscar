# VScar — D1.3 JATO Dynamics: acceso y licencia

> Estado: **evaluado · sin acceso · RFI preparado, NO enviado** · 2026-10-16 · Matriz: C01 (§2.4, "solo evaluación")

## 1. Qué se sabe (fuentes públicas)

| Aspecto | Evidencia (developer.jato.com y web corporativa) |
|---|---|
| APIs documentadas | JATO Index · **Specifications** (equipamiento, opciones, precios) · **VINView** · **WLTP Link** · **Code Link** |
| Autenticación | OAuth2 / JWT |
| Acceso | solo con "contract or trial agreement" |
| Términos públicos | ninguno sobre almacenamiento, visualización ni redistribución; pie "All Content © JATO Dynamics Limited. All rights reserved." |
| Precio | **no publicado** |
| España | no mencionada explícitamente en la documentación pública; coches.net muestra "Datos cedidos por JATO" (indicio de cobertura ES) |
| Tercera parte | JATO es la fuente de las fichas de coches.net → licenciar coches.net no evita los derechos de JATO |

## 2. Tres derechos distintos (no confundir)

| Derecho | Qué permite | Qué necesita VScar |
|---|---|---|
| **Acceso API** | consultar datos en tiempo de ejecución | insuficiente por sí solo |
| **Persistir y mostrar** | guardar en `spec_values` con procedencia y mostrar en PREVIEW/PUBLIC, incluidos cálculos derivados | **imprescindible** (engines deterministas sobre snapshot) |
| **Redistribuir** | ceder datos a terceros (API pública, exportaciones) | no necesario en Alpha; excluir explícitamente |

## 3. Qué podría resolver (a confirmar en el RFI)

- Acabado, carrocería, caja, maletero, 0–100, batería, carga, garantía y precio de lista por periodo (ES, 2010–2026).
- **Vínculo con la homologación**: si *WLTP Link* / *Code Link* exponen TAN + Va + Ve, la correspondencia podría llegar a `MATCH_CONFIRMED`; sin eso seguiría siendo COMPATIBLE.
- Generación: desconocido si JATO publica un código de generación o solo periodos.

## 4. Borrador de RFI / solicitud de licencia (no enviado)

> Asunto: Solicitud de información — licencia de datos de vehículos (España, 2010–2026)
>
> VScar es una herramienta de decisión de compra (nuevo y usado) para el mercado español en fase Alpha (sin publicación comercial todavía). Solicitamos información sobre:
> 1. Cobertura España 2010–2026 para turismos M1: especificaciones, equipamiento, precios de lista por periodo, garantía, batería y carga.
> 2. Si los registros incluyen número de homologación UE completo (con extensión), variante y versión (WLTP Link / Code Link), y código o etiqueta de generación.
> 3. Condiciones para **almacenar** los datos en nuestra base y **mostrarlos** (con atribución) en una web pública, incluidos cálculos derivados; necesitamos que la licencia no exija borrar históricos al terminar (o el plazo de retención aplicable).
> 4. Exclusión de redistribución a terceros (no la necesitamos).
> 5. Precio para un volumen inicial de ~100 variantes de referencia y ~25 familias, y para ~500–1.000 variantes; opción de prueba (trial).
> 6. Formato y frecuencia (API, ficheros) y condiciones de atribución.

Requisitos internos antes de enviar: aprobación humana del envío; revisión legal del contrato; ningún acuerdo se acepta automáticamente.

## 5. Resultado

| Pregunta | Respuesta |
|---|---|
| Licence/API | **sin acceso**; contrato o prueba necesarios |
| Coste estimado | **no publicado** — presupuesto a solicitar (no se inventa una cifra) |
| Permisos necesarios | contrato con derecho de **persistir + mostrar + derivar** en ES; redistribución no necesaria |
