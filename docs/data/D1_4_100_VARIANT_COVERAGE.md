# VScar — D1.4 Cobertura de las 100 candidatas (gor3a, mismo proceso)

> Estado: **medido (ejecutado sobre las 100, sin extrapolar) · nada importado** · 2026-10-16 · Datos: [`d14/matching-100.json`](d14/matching-100.json)

## 1. Resultado

| Indicador | 100 | (20 D2) |
|---|---:|---:|
| Con generación candidata (L1+) | 97 | 18 |
| Con una sola generación compatible | 33 | 10 |
| Con motor compatible (L2) | 50 | 12 |
| STRONG_COMPATIBLE_MATCH | 25 | 3 |
| WEAK_COMPATIBLE_MATCH | 8 | 7 |
| AMBIGUOUS | 17 | 2 |
| REJECTED (falso positivo evitado) | 6 | 1 |
| NOT_FOUND | 44 | 7 |
| Carrocería/puertas en el nombre | 26 | 7 |
| Maletero encontrado (un solo valor) | 43 (38) | 9 (9) |
| 0–100 encontrado (un solo valor) | 31 (21) | 7 (6) |
| Caja encontrada | 40 | 10 |
| Batería encontrada | 11 | 1 |
| Carga (solo tiempos) | 1 | 0 |
| **Identidad verificada (L3)** | **0** | **0** |
| **Reutilizable en VScar** | **0** | **0** |

Compatibilidad ≠ exactitud técnica: los 25 STRONG son coincidencias de nivel 2 sin enlace a homologación.

## 2. Por familia (estados)

| Familia | STRONG | WEAK | AMBIG. | REJ. | NOT_FOUND |
|---|---:|---:|---:|---:|---:|
| VW Golf | 1 | — | — | 1 | 5 |
| BYD SEAL | — | — | — | — | 2 |
| Kia Sportage | — | — | 1 | — | 5 |
| Renault Clio | 2 | 3 | 1 | — | — |
| Nissan Qashqai | 2 | — | — | 1 | 1 |
| Hyundai Tucson | — | 1 | 1 | — | 3 |
| Dacia Sandero | 2 | — | 3 | — | — |
| Hyundai Kona | 2 | — | — | — | 5 |
| Peugeot 3008 | — | 1 | 1 | — | 4 |
| Peugeot 208 | 3 | 1 | — | — | 1 |
| Peugeot 308 | 1 | 1 | — | — | — |
| Toyota Yaris | 1 | — | — | — | 2 |
| Mercedes Clase A | — | — | — | 1 | 4 |
| Škoda Octavia | — | — | 2 | 1 | — |
| Audi A3 | — | — | 2 | — | — |
| Toyota Corolla | — | 1 | 1 | — | 1 |
| Renault Mégane | 3 | — | 1 | — | — |
| Toyota RAV4 | 2 | — | — | — | 1 |
| Kia Niro | — | — | 2 | 1 | 3 |
| SEAT León | — | — | 1 | — | — |
| BMW Serie 3 | — | — | 1 | — | — |
| CUPRA Formentor | 2 | — | — | — | — |
| BMW X3 | 1 | — | — | — | 4 |
| Tesla Model 3 | 3 | — | — | — | 1 |
| Tesla Model Y | — | — | — | 1 | 2 |

## 3. Lectura

- Las lagunas son de **motor**, no de modelo: el dataset lista una selección de motorizaciones por "generación" (p. ej. falta el Golf 1.5 TSI 96 kW, el Sportage 1.6 T-GDi 110 kW y el 3008 PHEV 133 kW) → 44 NOT_FOUND.
- Las ambigüedades vienen de carrocerías hermanas (Sandero/Stepway, berlina/familiar) y de entradas duplicadas en la transición de restyling.
- Escalar a las 100 con S14 daría, como mucho, **candidatos de investigación** para ~33 claves con una sola generación compatible; ninguna con identidad ni derechos suficientes.
