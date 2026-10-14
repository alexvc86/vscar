# VScar — Vehicle Media Policy v0.1

> Step 7b.2 · 2026-10-14 · Decisión: [ADR-014](../adr/ADR-014-vehicle-model-media-and-selector-flow.md) · Código: `@vscar/vehicle-schema` (`VehicleModelMedia`), `@vscar/quality` (`mediaPublication`, `selectModelMedia`), `@vscar/db` (`vehicle_model_media`, `listModelMedia`, `saveModelMedia`), `apps/web` (`ModelVisual`, `BodySilhouette`)

Reglas para las imágenes de vehículos que muestra VScar. Son independientes de los derechos de los **datos** ([DATA_RIGHTS_MATRIX](DATA_RIGHTS_MATRIX.md)): un coche publicable puede no tener imagen publicable, y al revés.

## 1. Principios

1. **Derechos de imagen ≠ derechos de datos.** Se evalúan por separado, con el mismo vocabulario (`VERIFIED` ✅ · `CONDITIONAL` ⚠️ · `PENDING` ❓ · `DENIED` ❌).
2. **Nunca se oculta un coche por faltarle imagen.** Si no hay imagen publicable en el canal, se muestra la silueta SVG del sistema.
3. **Ninguna tarjeta sin visual.** El fallback siempre existe.
4. **El fallback no finge.** La silueta es de una *clase* de carrocería (berlina, compacto, SUV), no del modelo. Nunca se presenta como si fuera el coche.
5. **Imagen por modelo (o modelo + generación), no por versión técnica.** No hace falta una foto por motor.

## 2. Fuentes

| Permitido | Notas |
|---|---|
| `SELF_CREATED` | Assets propios de VScar (ilustración, render propio, fotografía propia) |
| `LICENSED` | Licencia explícita y por escrito (banco de imágenes, proveedor), con `license` y `verified_at` |
| `PUBLIC_DOMAIN` | Dominio público verificado (registrar la referencia) |
| `MANUFACTURER_VERIFIED` | Material de prensa del fabricante **solo** con derechos de uso comercial verificados por escrito |

**Prohibido sin excepción**: buscadores de imágenes (Google Images y similares), fotos de prensa sin derechos verificados, imágenes de concesionarios o anuncios, capturas de pantalla, cualquier imagen sin origen trazable. `UNVERIFIED` existe solo para registrar algo pendiente de revisión: nunca se publica.

## 3. Canal de publicación

El canal se **deriva** de `rights_status` + `origin` (`mediaPublication`). No hay columna de canal, así no puede contradecir los derechos.

| `rights_status` | `origin` | PUBLIC | PREVIEW |
|---|---|---|---|
| `VERIFIED` | cualquiera salvo `UNVERIFIED` | ✅ | ✅ |
| `CONDITIONAL` (exige `attribution`) | cualquiera salvo `UNVERIFIED` | ✅ con atribución | ✅ |
| `PENDING` | cualquiera | ❌ → silueta | ✅ con aviso "Imagen en verificación" |
| `DENIED` | cualquiera | ❌ | ❌ |
| cualquiera salvo `PENDING` | `UNVERIFIED` | ❌ | ❌ |

- **El servidor aplica la regla.** Una URL que el canal no puede mostrar nunca llega al cliente; el cliente PUBLIC no recibe URLs de vista previa.
- Sin la variable de canal, la web es `PUBLIC` (falla cerrado, ADR-013).

## 4. Contrato (`VehicleModelMedia`)

`id` · `brand` · `model` · `generation_code?` · `model_year_from?`/`model_year_to?` · `role` (`SELECTOR` · `THUMBNAIL` · `HERO`) · `media_type` (`IMAGE` · `SVG`) · **uno** de `asset_path` (local, `/media/…`) o `external_url` · `width` · `height` · `origin` · `rights_status` · `source_id?` (fuente de la DATA_RIGHTS_MATRIX, si procede) · `attribution?` · `license?` · `verified_at?` · `alt` (`DECORATIVE` · `IDENTIFYING`) · `notes?`.

Validación en el schema (también al guardar):
- derechos `VERIFIED`/`CONDITIONAL` exigen `license` y `verified_at`;
- `CONDITIONAL` exige `attribution`;
- un origen `UNVERIFIED` no puede tener derechos verificados;
- exactamente una de `asset_path` o `external_url`.

## 5. Selección y fallback

Orden (`selectModelMedia`):
1. imagen de la **generación exacta**;
2. imagen del **modelo**;
3. **silueta SVG** de la carrocería.

- Una imagen con rango de años solo aplica dentro de su rango. Solo se usan rangos si una generación no basta.
- `THUMBNAIL` puede reutilizar la imagen de `SELECTOR`; nunca la de `HERO`.
- Tarjeta de un modelo con **varias generaciones**: imagen del modelo o silueta, nunca la de una generación, porque representaría años que no le corresponden.
- Empates: derechos más firmes primero (`VERIFIED` > `CONDITIONAL` > `PENDING`).

## 6. Almacenamiento, formatos y optimización

- **Alpha: assets locales** en `apps/web/public/media/…`, servidos con `next/image` en **AVIF** y **WebP** (fallback automático según el navegador).
- Las URLs externas se aceptan en el contrato pero **fallan cerrado** en la web: no se muestran hasta que exista una lista de dominios con licencia (`remotePatterns`).
- Fuente recomendada: PNG o JPEG de 1280 × 720 (16:9), sin texto incrustado; `width`/`height` reales en el registro.
- Tamaños servidos: 160, 220, 320 y 440 px de ancho (`images.imageSizes`), según `sizes`. Objetivo: **20–60 KB por tarjeta**.
- Caja de proporción fija (16:9) → sin CLS. Fondo neutro mientras carga (sin blur placeholder en Alpha).
- Carga perezosa salvo las 4 primeras tarjetas visibles; ninguna precarga masiva. `HERO` (imagen grande) no se usa en el selector.
- Medido con un asset sintético de prueba (gradiente propio de 1280 × 720, eliminado tras medir): AVIF 0,9–1,0 KB y WebP 0,5–0,7 KB a 320/440 px. Es una cota inferior: una fotografía real pesará más, y el objetivo se comprobará con el primer asset aprobado.

## 7. Texto alternativo y atribución

- `alt: DECORATIVE` → `alt=""` (la tarjeta ya nombra el coche). `IDENTIFYING` → "Volkswagen Golf". Nunca "Imagen del coche Volkswagen Golf".
- La silueta de fallback es `aria-hidden`: decorativa y genérica.
- `CONDITIONAL` muestra la atribución obligatoria junto a la imagen o en "Cómo lo calculamos" (la llevan los DTO: `MediaView.attribution`).

## 8. Estado actual

- Tabla `vehicle_model_media` (migración `0007`) **vacía en `vscar_dev`**: no hay todavía ninguna imagen con derechos verificados. Todas las tarjetas muestran la silueta de su carrocería.
- Los tests usan registros **sintéticos** marcados como tales (`notes: 'synthetic test record'`), que no apuntan a ningún asset real.
- Para añadir una imagen:
  1. asset en `public/media/…`;
  2. registro con origen, licencia y `verified_at` mediante `saveModelMedia` (valida la política);
  3. fila en la hoja de derechos si procede de una fuente de la matriz.
