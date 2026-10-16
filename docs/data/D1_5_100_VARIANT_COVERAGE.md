# VScar — D1.5 Cobertura de las 100 candidatas

> Estado: **ejecutado sobre las 100 (sin extrapolar) · nada importado** · 2026-10-16 · Datos: [`d15/matching-100.json`](d15/matching-100.json)

| Indicador | 100 |
|---|---:|
| Modelos presentes (VehiclesDB, disponibles en ES) | 100 / 100 |
| Generaciones candidatas (MATCHED) | 16 (36 con algún dato encontrado) |
| Motores compatibles S15 STRONG/WEAK | 14 |
| autoseeker STRONG/WEAK | 14 |
| OpenEV WEAK/AMBIG. | 8 |
| Carrocerías (MATCHED) | 15 |
| Maleteros (MATCHED · found) | 16 · 38 |
| Aceleraciones (MATCHED · found) | 17 · 20 |
| Baterías útiles (MATCHED · found) | 9 · 21 |
| Carga AC / DC (MATCHED) | 9 / 9 |
| Campos con conflicto | 9 candidatas (7 oficial ↔ externo, 2 conservados) |
| Sin coincidencia en ninguna fuente técnica abierta | ver `matches[].status = NOT_FOUND` (S15 85, S16 68, S17 92, S19 81) |
| **Identidades verificadas** (generación / año-modelo) | **0 / 0** |
| Identidad comercial EXACT | 3 (sin cambio desde D1.2) |
| **Aptas para curación técnica** (propuesta, no aprobada) | **92**: exactas EEA+RDW y sin duplicado; quedan fuera 3 duplicados y 5 sin corroboración RDW |
| PREVIEW / PUBLIC | **0 / 0** |

Completitud crítica media de las 100:
- 54,3 % → **54,3 %** utilizable;
- 59,5 % si la investigación fuera utilizable.

Lectura:
- **S15** cubre modelos hasta 2020 y aporta, como investigación, generación con restyling, maletero y 0–100.
- **S16** cubre la generación actual con una fila por modelo.
- **S17 y S19** solo cubren BEV.

Ninguna resuelve `model_year` ni el enlace con la homologación.

Para escalar a 100 hace falta **derechos y fuente con identidad**, no más registros:
- licencia de JATO o fabricante (D1.3);
- documentación de homologación (CoC);
- aprobación humana de S11/S13/S16–S18.
