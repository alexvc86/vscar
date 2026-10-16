# EEA sample responses (test fixtures)

Respuestas reales de `https://discodata.eea.europa.eu/sql` grabadas el 2026-09-24 con la consulta agregada de `buildEeaQuery` (SUM(R), MIN/MAX(Dr) por TAN/Va/Ve y valores técnicos). Muestras pequeñas y reproducibles para tests (plan §33.3); no son el dataset productivo.

| Fichero | Filtro |
|---|---|
| `golf-2018-es.json` | 2018 · ES · VOLKSWAGEN · Cn LIKE 'GOLF%' · Ec 1498 · Ep 96 |
| `model3-2021-es.json` | 2021 · ES · TESLA · Ep 239 |
| `leon-ehybrid-2022-es.json` | 2022 · ES · SEAT · Cn IN ('LEON','SEAT LEON E-HYBRID150') · Ft PETROL/ELECTRIC |
| `leon-ehybrid-2022-de.json` | 2022 · DE · mismo filtro |
| `d1-survey-dacia-2016-es.json` | Step D1 (2026-10-16) · encuesta `buildEeaSurveyQuery` · 2016 F · ES · DACIA · Cn contiene SANDERO (filas agregadas, CO₂ en `E (g/km)`) |
| `d1-survey-byd-2025p-es.json` | Step D1 · 2025 P · ES · BYD · Cn contiene SEAL (provisional) |
| `d1-inventory-2018-es.json` | Step D1 · `buildEeaInventoryQuery` · 2018 F · ES (una fila agregada con nulos/ceros/cardinalidad) |

**Atribución** (CC BY 4.0): European Environment Agency (EEA), *Monitoring of CO2 emissions from passenger cars – Regulation (EU) 2019/631*; datos: Directorate-General for Climate Action (DG CLIMA). Licencia: https://creativecommons.org/licenses/by/4.0/
