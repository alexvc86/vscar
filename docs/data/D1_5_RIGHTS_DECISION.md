# VScar — D1.5 Decisión de derechos

> Estado: **propuesta para revisión humana · ninguna fuente aprobada para PUBLIC · gate PUBLIC sin cambios** · 2026-10-16 · Matriz: S15 ❌ · S16–S19 ❓

| Fuente | Licencia verificada | Atribución exigida | Derechos de origen | Identidad | Decisión D1.5 |
|---|---|---|---|---|---|
| S15 Opendatabay/Kaggle | "CC0" en página/Kaggle **vs** licencia de entrenamiento IA (no comercial) enlazada por Opendatabay | — | base comercial de terceros no identificada | sin TAN, ≤ 2020 | **RESTRINGIDA (❌)**: investigación interna; el CSV queda fuera de Git |
| S16 autoseeker.eu | **CC BY 4.0** (página open-data, guardada) | «autoseeker.eu» + enlace | cifras de fabricantes, "indicativas" | sin TAN; granularidad MODEL/GENERATION/POWERTRAIN | **PENDIENTE (❓)**: reutilizable en principio. Antes de publicar: aprobación humana, instantánea fijada por SHA y verificación OEM de cada cifra |
| S17 OpenEV Data | **CDLA-Permissive-2.0** (texto en el repo) | incluir el texto al compartir datos | valores de páginas OEM/prensa; 255 registros solo con URL de dominio | sin TAN; acabado | **PENDIENTE (❓)**: calidad insuficiente para publicar sin contraste (conflictos con EEA) |
| S18 VehiclesDB | **CC BY 4.0** + avisos de registros | «Vehicle data by VehiclesDB» + avisos DGT/RDW/… | registros oficiales | taxonomía | **PENDIENTE (❓)**: apta para nomenclatura y disponibilidad, no para datos técnicos |
| S19 Kilowatt | MIT + atribución | «Open EV Data (https://github.com/KilowattApp/open-ev-data)» | sin fuentes por registro | sin TAN ni potencia | **PENDIENTE (❓)**, archivada: solo histórico/investigación |
| S01 EEA | CC BY 4.0 | sí | oficial | exacta | sin cambio (condicional) |
| S11 RDW · S13 Traficom | CC0 · CC BY 4.0 | — · sí | oficial | exacta | sin cambio (❓, expedientes listos) |

## Reglas aplicadas

1. Descargar un fichero no concede derechos. Una licencia permisiva del recopilador no resuelve los derechos de los datos de origen.
2. Los valores de terceros solo se guardan en `data/research/` (fuera de Git) y nunca en `spec_values`, fixtures, `docs/` ni MySQL.
3. Las versiones se fijan por release/commit y SHA-256. Los CSV aportados en `docs/` se excluyen de Git (`.gitignore`) y se copian a `data/raw/`.
4. Ningún estado pasa a PUBLIC_APPROVED automáticamente.

## Decisiones humanas solicitadas

- Aprobar o rechazar S11, S13, S16, S17 y S18 en la matriz (por campo si procede).
- Decidir el uso de S16 como fuente de maletero y carga **solo** tras verificar con OEM.
- Decidir si VehiclesDB se adopta como taxonomía de referencia (alias y nombres canónicos).
