# VScar — D1.4 Preparación del lote D2

> Estado: **0 / 20 curables con las reglas vigentes · Ready for D2: NO** · 2026-10-16 · Datos: [`d14/d2-readiness.json`](d14/d2-readiness.json) · Criterios **sin cambios**; ADR-019 sigue **PROPOSED** (no implementado)

## 1. Clasificación (sin cambios respecto a D1.3)

| Estado | N | Candidatas |
|---|---:|---|
| `READY_FOR_CURATED_IMPORT` | **0** | — |
| `DUPLICATE` | 1 | #2 |
| `CONFLICTED` | 1 | #4 |
| `IDENTITY_PENDING` | 18 | resto |
| `DATA_PENDING` · `RIGHTS_PENDING` | (20) | todas (bloqueo secundario) |

Curables: **0** · PREVIEW: **0** · PUBLIC: **0**.

## 2. Antes / después

| Campo | D1.3 | D1.4 encontrado | D1.4 identidad verificada | D1.4 reutilizable |
|---|---:|---:|---:|---:|
| Generación | 0/20 | 18 candidatas (10 únicas) | 0 | **0** |
| Año-modelo | 0/20 | 0 | 0 | 0 |
| Identidad comercial EXACT | 3/20 | — | — | 3 (sin cambio) |
| Transmisión | 11/20 | 10 | 0 | 11 (sin cambio) |
| Carrocería | 4/20 | 7 | 0 | 4 (sin cambio) |
| Maletero | 0/20 | 9 | 0 | **0** |
| 0–100 | 0/20 | 7 | 0 | **0** |
| Otros (vmax, dimensiones, batería) | RDW | vmax 6, dims 10, batería 1 | 0 | sin cambio (RDW ya los cubre mejor) |

Completitud crítica media del lote: **54,6 % → 54,6 %**. Enriquecimiento compatible con derechos: **ninguno**.

## 3. ADR-019 — respuestas

| Pregunta | Respuesta basada en D1.4 |
|---|---|
| ¿Evidencia suficiente para confirmar más generaciones? | **No.** 0 verificadas; 10 candidatas únicas, todas por intervalo de años y sin código |
| ¿Qué parte de la generación se infiere por año? | **Toda.** El dataset solo tiene "modelo (año de inicio)" e intervalo; 0 "facelift", `bodyType` nulo |
| ¿Sigue siendo necesario `generation_code` obligatorio? | Para el **catálogo seleccionable**, sí (sin él no hay identidad de generación), pero hoy solo se cumpliría fabricándolo: ninguna fuente abierta lo da. Exigirlo también en **curación** impide guardar observaciones técnicas exactas y válidas |
| ¿Alguna fuente da `model_year` real? | **No** (EEA: año de matriculación; Traficom: primera matriculación; gor3a: inicio de generación; catálogos: periodos comerciales) |
| ¿Se conserva el esquema actual sin fabricar datos? | Sí, pero solo con 0 variantes importables |
| ¿La falta de acabado debe impedir almacenar observaciones técnicas? | **No.** Las observaciones EEA/RDW son exactas por TAN+Va+Ve con independencia del acabado |
| ¿Separar la base de curación del catálogo seleccionable? | **Sí**: la curación guarda identidad técnica exacta y candidatos L1/L2 marcados; el catálogo seleccionable sigue exigiendo generación/acabado con evidencia |

**Recomendación: B** — hay motor y periodo, pero no correspondencia exacta TAN↔generación/acabado. ADR-019 sigue siendo necesario, y conviene decidirlo con una variante explícita:
- base de curación con identidad técnica exacta y `generation`/`model_year` como **candidatos con estado** (`UNCONFIRMED`, nunca valor);
- catálogo seleccionable con la exigencia actual.

**C** (derechos/licencia) sigue siendo el bloqueo de los **datos** (maletero, 0–100, precio, garantía): D1.4 no aporta ningún valor reutilizable.

## 4. Bloqueos

1. Generación/año-modelo sin fuente verificada.
2. S14: ODbL con origen sin acreditar → revisión jurídica.
3. S11 RDW y S13 Traficom pendientes de aprobación humana.
4. Maletero, 0–100, precio y garantía sin fuente con derechos (JATO/fabricantes, D1.3).

## 5. Siguiente acción recomendada

Decisión humana sobre ADR-019 (variante "base de curación vs catálogo seleccionable") y, en paralelo:
- enviar el RFI de JATO (D1.3) y la consulta al autor de gor3a/autoevolution;
- aprobar o no S11/S13.

No ejecutar D2 hasta tener una fuente con derechos para maletero/0–100/precio o una decisión sobre ADR-019.
