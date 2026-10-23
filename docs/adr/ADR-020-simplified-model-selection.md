# ADR-020 — Selección simplificada por modelo y resolución técnica interna

- **Estado**: **ACCEPTED** (2026-10-22, decisión de producto comunicada en el encargo de Step D1.8)
- **Alcance de la aceptación**: el flujo del selector y las reglas de resolución y descubrimiento. **No** cambia el gate PUBLIC ni el PREVIEW, **no** aprueba fuentes y **no** promueve ninguna homologación técnica.
- **Sustituye**: el paso obligatorio «Versión» del selector de [ADR-014](ADR-014-vehicle-model-media-and-selector-flow.md). Las reglas de media de ADR-014 siguen vigentes.
- **Relacionado**: [ADR-007](ADR-007-reference-vs-used-instance.md) · [ADR-013](ADR-013-catalog-publication-and-routing.md) · [ADR-019](ADR-019-technical-identity-without-confirmed-trim.md) · [D1_8_TECHNICAL_RESOLUTION](../data/D1_8_TECHNICAL_RESOLUTION.md) · [D1_8_YEAR_AVAILABILITY_RULES](../data/D1_8_YEAR_AVAILABILITY_RULES.md) · [D1_8_PREVIEW_PROMOTION_RULES](../data/D1_8_PREVIEW_PROMOTION_RULES.md)

## Contexto

El selector exigía cuatro pasos: Marca → Modelo → Año → Versión. En el último, el usuario tenía que distinguir dos «Golf Advance 1.5 TSI 2018» que solo diferían en el ciclo de homologación (NEDC o WLTP). Ese conocimiento no le corresponde al usuario.

D1.7 dejó en MySQL 92 homologaciones técnicas reales (15 marcas, 24 modelos). Ninguna es seleccionable: les faltan la generación, el año-modelo y el acabado verificados que exige `ReferenceVariant` (ADR-019 B).

## Decisión

### 1. Qué representa una opción de marca/modelo/año

Marca, modelo y año son **navegación**, no un coche comparable. Solo es comparable una **configuración resuelta a una `ReferenceVariant` seleccionable** en el canal.

Estados de disponibilidad (`SelectionAvailability`):
- `COMPARISON_ELIGIBLE`: hay al menos una ReferenceVariant seleccionable.
- `CATALOG_DISCOVERABLE`: solo hay homologaciones técnicas curadas. Se ve, no se compara.
- `NOT_COMPARABLE`: el estado de cada configuración técnica concreta, con sus motivos.

### 2. Flujo

Marca → Modelo → Año. No hay paso «Versión». Tras el año, el servidor resuelve:

| Estado | Cuándo | Qué ve el usuario |
|---|---|---|
| `AUTO_RESOLVED` | una configuración y una homologación | el coche queda elegido; pregunta Nuevo/Usado |
| `EQUIVALENT_GROUP` | una configuración, varias homologaciones equivalentes | igual: una sola opción, sin ciclo ni periodo |
| `NEEDS_CONFIGURATION` | configuraciones realmente distintas | aclaración contextual «¿Qué motorización tiene o prefieres?», con solo opciones reales y «No lo sé» |
| `UNRESOLVED` | ninguna configuración seleccionable | información técnica y motivos; «Comparación no disponible», sin cálculos |

**«No lo sé»** conserva la marca, el modelo y el año dentro del selector, y no produce ninguna comparación numérica. Las cifras de varias configuraciones nunca se mezclan.

### 3. Años

- `MODEL_YEAR`: solo el que declara la fuente del catálogo seleccionable.
- `REGISTRATION_OBSERVED`: periodo de matriculación observado de una homologación técnica. **Nunca se convierte en año-modelo**, y la interfaz lo señala como «matriculaciones».
- **No se admiten años futuros sin respaldo**:
  - un año-modelo puede ir como mucho un año por delante del año en curso (práctica comercial MY+1, documentada por el fabricante);
  - una matriculación observada nunca supera el año en curso.

### 4. Equivalencia y miembro comparado

**Cuándo son equivalentes dos homologaciones**: cuando tienen la misma firma de configuración (tren motriz, combustible, caja, tracción y versión comercial) y no se contradicen en ningún hecho relevante **del mismo ciclo**. Los hechos relevantes son potencia, consumos, autonomía y batería; un hecho ausente no contradice.

Valores NEDC y WLTP **nunca** se comparan entre sí, ni para decidir la equivalencia ni en un cálculo.

**Miembro que se compara dentro de un grupo**, por precedencia y **sin mirar ningún valor**:
1. homologación WLTP, el ciclo de referencia actual;
2. mayor confianza de identidad;
3. más hechos relevantes disponibles (los miembros no se contradicen, así que esto solo evita un hueco);
4. revisión de homologación más reciente;
5. slug, como desempate determinista.

**Prohibido**: primera variante, más barata, menor consumo, mayor potencia, aleatoria y promedios.

Las homologaciones originales, sus ciclos y su procedencia se conservan intactas. Las URLs existentes de cualquier miembro siguen funcionando.

### 5. Descubrimiento y derechos

- **Canal**: el descubrimiento desde la capa técnica solo existe en **PREVIEW**. En PUBLIC no se consulta.
- **Qué llega al navegador**: solo un agregado por homologación:
  - marca y modelo;
  - años de matriculación observados;
  - tren motriz, combustible y caja;
  - potencia, solo cuando significa lo mismo para el usuario: térmica en ICE/MHEV y eléctrica en BEV. En HEV/PHEV la potencia térmica no es la del sistema y no se muestra.
- **Qué nunca llega**: ids, TAN/Va/Ve, observaciones, derechos por campo ni valores en conflicto.
- **Si la capa técnica falla**: el selector sigue funcionando con el catálogo seleccionable.

### 6. Promoción a PREVIEW (explícita, nunca automática)

Una homologación técnica solo pasa a `ReferenceVariant` con una promoción explícita que supere las cinco puertas de [D1_8_PREVIEW_PROMOTION_RULES](../data/D1_8_PREVIEW_PROMOTION_RULES.md):
1. identidad técnica;
2. derechos;
3. calidad;
4. elegibilidad de categoría;
5. resolución de configuración, con generación, año-modelo, acabado y nombre comercial **verificados**.

Nunca se rellenan esos campos desde la matrícula ni desde la homologación. PUBLIC no cambia.

## Consecuencias

- El usuario elige un coche en tres pasos. Solo se le pregunta la motorización cuando hay configuraciones distintas reales (hoy, Tesla Model 3 2021).
- El catálogo navegable crece de 5 a 16 marcas y de 5 a 25 modelos en PREVIEW. Los comparables siguen siendo los 5 modelos con ReferenceVariants (9 variantes, 7 opciones).
- En D1.8 se promueven 0 de 9 candidatas: las cinco puertas, salvo la identidad comercial, se superan; esa falta de fuente es el bloqueo común.
- **Siguiente decisión necesaria**: cómo acreditar la generación y el año-modelo (fuente, revisión humana o un campo de «año de referencia» con su base explícita en `ReferenceVariant`). Sin ella, la capa técnica no puede hacerse comparable.
