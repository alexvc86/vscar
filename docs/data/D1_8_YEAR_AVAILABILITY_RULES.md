# VScar — D1.8 Reglas de años disponibles

> Estado: **implementado** · 2026-10-22
> - **Código**: `yearAllowed` y `registrationYears` en [`model-selection.ts`](../../apps/web/src/domain/model-selection.ts), y `yearsOf` en [`catalog-service.ts`](../../apps/web/src/server/catalog-service.ts).
> - **Decisión**: [ADR-020 §3](../adr/ADR-020-simplified-model-selection.md).

## 1. Tres años distintos, nunca intercambiables

| Tipo | Fuente | ¿En el selector? |
|---|---|---|
| **Año-modelo** (`MODEL_YEAR`) | declarado por la fuente de una ReferenceVariant seleccionable (fabricante, catálogo curado) | sí; es el único año **comparable** |
| **Matriculación observada** (`REGISTRATION_OBSERVED`) | periodo de primera matriculación observado de una homologación técnica (EEA/registros) | sí, solo como descubrimiento y marcado «matriculaciones»; **nunca** se convierte en año-modelo |
| **Año de producción** | sin fuente en el proyecto | no |

La etiqueta del selector es el **año de referencia documentado**. Cada año lleva su base (`basis`) en el contrato, y la interfaz señala cuando no es año-modelo.

## 2. Reglas

1. Un año-modelo solo se acepta si `año ≤ año en curso + 1` (práctica comercial MY+1 documentada por el fabricante).
2. Una matriculación observada solo si `año ≤ año en curso`. Los periodos se recortan al presente.
3. El periodo de matriculación se expande del primer al último año observado de cada homologación. El selector muestra la unión, por modelo, de los periodos de todas sus homologaciones.
4. Un año con las dos bases (Golf 2018) se muestra una vez. Es comparable por su año-modelo; la matriculación queda como evidencia adicional.
5. Ningún año se completa para «rellenar» el diseño.

## 3. Caso Volkswagen Golf 2027

| Pregunta | Respuesta |
|---|---|
| ¿De dónde sale 2027? | De la ReferenceVariant `volkswagen-golf-style-1-5-etsi-150-dsg` (Dataset Core, caso `golf-current-official-conflict`): `model_year: 2027` con la nota «model_year 2027 según el configurador; IDAE lista MY25 y MY26 a la vez» y precio con fecha 2026-09-24 |
| ¿Es demostración o extrapolación? | No: es el año-modelo que declara el configurador del fabricante para el coche a la venta en 2026 (MY+1) |
| ¿Cumple la regla? | Sí: 2027 ≤ 2026 + 1 |
| Decisión | **Se mantiene** como año-modelo documentado. Retirarlo dejaría fuera una de las 9 variantes existentes, que deben conservarse. La discrepancia con IDAE (MY25/MY26) sigue documentada en el fixture |

## 4. Verificación

- **Unitarios** (`apps/web/test/d18.test.ts`): reglas MY+1 y matrícula ≤ año en curso; periodos recortados; matrícula ≠ año-modelo.
- **Artefacto** (`packages/curation/test/d18.test.ts`): ningún año pasa de 2027; ningún año solo de matriculación pasa de 2026; Golf 2027 tiene base `MODEL_YEAR`.
