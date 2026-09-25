# EEA sample responses (test fixtures)

Respuestas reales de `https://discodata.eea.europa.eu/sql` grabadas el 2026-09-24 con la consulta agregada de `buildEeaQuery` (SUM(R), MIN/MAX(Dr) por TAN/Va/Ve y valores técnicos). Muestras pequeñas y reproducibles para tests (plan §33.3); no son el dataset productivo.

| Fichero | Filtro |
|---|---|
| `golf-2018-es.json` | 2018 · ES · VOLKSWAGEN · Cn LIKE 'GOLF%' · Ec 1498 · Ep 96 |
| `model3-2021-es.json` | 2021 · ES · TESLA · Ep 239 |
| `leon-ehybrid-2022-es.json` | 2022 · ES · SEAT · Cn IN ('LEON','SEAT LEON E-HYBRID150') · Ft PETROL/ELECTRIC |
| `leon-ehybrid-2022-de.json` | 2022 · DE · mismo filtro |

**Atribución** (CC BY 4.0): European Environment Agency (EEA), *Monitoring of CO2 emissions from passenger cars – Regulation (EU) 2019/631*; datos: Directorate-General for Climate Action (DG CLIMA). Licencia: https://creativecommons.org/licenses/by/4.0/
