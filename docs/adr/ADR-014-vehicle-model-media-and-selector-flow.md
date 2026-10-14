# ADR-014 — Media de modelo con derechos propios y selector Marca → Modelo → Año → Versión

- **Estado**: ACCEPTED (2026-10-14)
- **Decisores**: producto + data workstream + frontend
- **Relacionado**: [ADR-007](ADR-007-reference-vs-used-instance.md) (identidad comercial vs técnica) · [ADR-009](ADR-009-data-provider-rights.md) (derechos) · [ADR-013](ADR-013-catalog-publication-and-routing.md) (canales, rutas) · [VEHICLE_MEDIA_POLICY](../data/VEHICLE_MEDIA_POLICY.md) · [VEHICLE_SELECTOR_V0_2](../web/VEHICLE_SELECTOR_V0_2.md)

## Contexto

El selector del Step 7b es búsqueda-primero: obliga a saber cómo se llama la versión. El usuario piensa en marca, modelo, año y versión, y quiere *ver* el coche. Mostrar imágenes introduce un riesgo legal nuevo (derechos de imagen), distinto del de los datos, y la tentación de "rellenar" con fotos de terceros.

## Decisión

1. **Nueva entidad persistente `VehicleModelMedia`** (tabla `vehicle_model_media`), con política propia ([VEHICLE_MEDIA_POLICY](../data/VEHICLE_MEDIA_POLICY.md)).
   - Clave comercial: marca + modelo (+ generación, y rango de años solo si hace falta). Nunca por versión técnica.
   - Roles `SELECTOR`, `THUMBNAIL` y `HERO`; `HERO` está previsto y sin implementar.
2. **Derechos de imagen ≠ derechos de datos.**
   - Mismo vocabulario (`RightsStatus` en vehicle-schema, reutilizado por quality para fuentes y para media).
   - Regla separada (`mediaPublication`). El canal **se deriva** de derechos + origen, sin columna propia.
   - `PENDING` solo en PREVIEW; un origen `UNVERIFIED` nunca se publica.
3. **Fallback obligatorio**: generación exacta → modelo → silueta SVG genérica de la carrocería. Nunca se oculta un coche por faltarle imagen, ni se muestra una tarjeta sin visual.
4. **Gating en servidor**: el servicio de catálogo resuelve la imagen por canal y entrega `MediaView` ya autorizada. Un cliente PUBLIC nunca recibe URLs de vista previa ni detalles técnicos de identidad.
5. **Selector por pasos** (por defecto) + **búsqueda** (atajo), sobre el mismo catálogo y la misma elegibilidad (ADR-013), sin reglas nuevas.
   - El último paso resuelve SIEMPRE una `ReferenceVariant.id`.
   - Variants técnicas con la misma identidad comercial se muestran por separado, con el primer hecho comprensible que las distinga: periodo y/o **ciclo de homologación**. Nunca códigos.
6. **Año**: el selector usa solo `MODEL_YEAR` declarado. `PRODUCTION_YEAR` (periodo comercial u homologación) y `REGISTRATION_YEAR` (unidad usada) no se mezclan. Sin año modelo → "Año desconocido".
7. **Carga del selector sin Suspense**: `import()` propio tras `load` + inactividad, con precarga de marcas. Sigue siendo diferido, pero abrir no sufre el retraso de ~300 ms de React 19 al revelar contenido suspendido.

## Alternativas consideradas

- **Imágenes por versión técnica**: multiplica assets sin valor para el usuario (el aspecto no cambia por motor). Rechazada.
- **URLs de imágenes en componentes o JSON en la web**: sin trazabilidad de derechos ni gating por canal. Rechazada.
- **Columna `publication_channel` además de los derechos**: duplica el estado y puede contradecirlo. Rechazada: se deriva.
- **Fotos de prensa del fabricante "porque son públicas"**: públicas ≠ licenciadas para uso comercial. Rechazada salvo verificación escrita (`MANUFACTURER_VERIFIED`).
- **Desplegables Marca/Modelo/Año/Versión** (sin visual): más lentos y sin contexto visual. Se eligieron pasos con tarjetas, chips de año y filas de versión.
- **`next/dynamic` para el selector**: correcto en tamaño, pero añadía ~350 ms a la primera apertura por el retraso de Suspense de React 19. Sustituido por un loader propio.

## Consecuencias

- **Positivas**:
  - el usuario elige como piensa (Golf → 2018 → versión) y VScar resuelve la identidad técnica;
  - añadir imágenes es solo datos (asset + registro validado), sin código;
  - el riesgo legal de imagen queda acotado por esquema, regla y canal.
- **Negativas**: hoy no hay ninguna imagen con derechos verificados; todas las tarjetas muestran siluetas genéricas.
- **Riesgos**: un asset subido sin licencia real. Mitigación: el schema exige licencia y fecha de verificación para publicar, origen trazable, revisión en curación y prohibiciones explícitas en la política.
