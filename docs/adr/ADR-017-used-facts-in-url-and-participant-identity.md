# ADR-017 — Hechos de la unidad usada en la URL e identidad de participantes

- **Estado**: ACCEPTED (2026-10-15)
- **Decisores**: producto + frontend + engines
- **Relacionado**: [ADR-015](ADR-015-comparison-url-and-indexability.md) (URL, canonical, indexabilidad) · [ADR-016](ADR-016-used-adjustment-layer.md) (Used Adjustment) · [USED_COMPARISON_INTEGRATION_V0_1](../used/USED_COMPARISON_INTEGRATION_V0_1.md)

## Contexto

Step 8b permite comparar nuevo/nuevo, nuevo/usado, usado/nuevo y usado/usado, incluida la misma ReferenceVariant en los dos lados. La comparación debe poder compartirse y reconstruirse en otro navegador (ADR-015) sin cuentas ni persistencia (Alpha), y servidor, cliente y worker deben producir la misma decisión.

## Decisión

1. **Los hechos de la unidad viven en la URL**, en un bloque propio y versionado (`u=1`, `a=used`, `a_price`…, `eval`), separado del escenario. No se guardan en MySQL, ni en sesión, ni en almacenamiento local.
2. **Fecha de evaluación explícita en la URL** (`eval`): la misma URL reproduce la misma edad y la misma decisión cualquier día.
3. **Identidad de participante ≠ identidad de variant**: nuevo = id de la variant; usado = UUID determinista de (variant, hechos), con desambiguación si dos unidades son idénticas. Sigue a la unidad en un intercambio A/B.
4. **El servidor resuelve todo en `ComparisonData`** (condición, hechos validados, `usedInstance`, `evaluationDate`); cliente y worker recalculan con esos mismos datos serializados por el único `createDecisionPipeline`.
5. **Indexabilidad**: una vista con hechos introducidos por el usuario es `noindex` siempre y sin JSON-LD; canonical/OG siguen siendo los del par base (sin canonical si no existe par base: misma variant). Se mantiene ADR-015.
6. **Requisitos del usuario para usados = escenario** (`maxkm`, `maxage`, `minsoh`, `minwarranty`, `fullhistory`), no hechos de la unidad.

## Alternativas descartadas

- **Guardar la unidad en MySQL con un id corto**: persistencia de datos de usuario en Alpha, sin necesidad. Rechazada.
- **Mezclar los hechos con el escenario**: el swap y el cambio de coche no sabrían qué pertenece a qué vehículo. Rechazada.
- **Evaluar con "hoy" del servidor**: el enlace compartido cambiaría de resultado con el tiempo. Rechazada.
- **Identidad aleatoria de la unidad**: servidor y cliente no coincidirían y el swap la perdería. Rechazada.
- **Indexar vistas con hechos**: millones de combinaciones personales. Rechazada.

## Consecuencias

- **Positivas**: compartir reproduce exactamente la unidad y la decisión; no hay datos personales persistidos; swap, idioma y escenario conservan la unidad sin estado de servidor.
- **Negativas**: el enlace contiene precio, km y estado (se avisa antes de compartir); un enlace muy antiguo evalúa la edad a su `eval`, no a hoy (es el comportamiento buscado, pero hay que explicarlo en 8c).
- **Riesgos**: URLs largas con dos usados (≈ 250 caracteres, aceptable); versionar `u` si cambia el contrato.
