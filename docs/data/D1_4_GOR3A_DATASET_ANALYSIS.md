# VScar — D1.4 gor3a/vehicle-makes-models (S14): análisis del dataset

> Estado: **descargado y verificado · solo investigación** · 2026-10-16 · Inventario: [`d14/gor3a-inventory.json`](d14/gor3a-inventory.json) · Lector: [`packages/data-connectors/src/gor3a`](../../packages/data-connectors/src/gor3a/index.ts)

## 1. Versión y procedencia

| Aspecto | Valor |
|---|---|
| Repositorio | https://github.com/gor3a/vehicle-makes-models (no archivado; 25 estrellas) |
| Release fijada | **v1.0.2** (2026-09-25), commit `ee99776470a45214bf524cdfe22e5dbf4bd67f93`; datos del commit `718f8e7` "full re-crawl 2026-09-25" |
| Assets (SHA-256) | `vehicle-data-json.zip` 8.085.881 B `76e524ef…db8e` · `vehicle-data-csv.zip` 668.955 B `0265e473…b8b4` · `vehicles.sqlite` 59.826.176 B `4f7e8aa7…d170` |
| Evidencia | `README.md` y `LICENSE-DATA` del commit (SHA-256 en [`d14/acquisition-manifests.json`](d14/acquisition-manifests.json)) |
| Licencias | código **MIT**; datos **ODbL 1.0** ("everything under `data/`") |
| Origen declarado | "compiled, collapsed, and normalized from publicly available information on autoevolution.com" |
| Ejecución de terceros | **ninguna**: `scripts/*.ts` (crawler/build) no se ejecutaron; `schema.ts` se leyó para reproducir el schema en Zod |

## 2. Recuentos reales vs declarados

| | Declarado (README) | Real v1.0.2 |
|---|---:|---:|
| Marcas | 164 | **164** |
| Modelos | 2.621 | **2.649** |
| Generaciones | 7.169 | **7.217** |
| Motores | 30.390 | **30.535** |
| Claves de `specs` | — | 71 (781.220 filas EAV) |

El README conserva las cifras de v1.0.1. **Paridad**: JSON (por marca) = `engines.csv` = SQLite `engines` = 30.535; 0 filas solo en JSON y 0 solo en CSV (comparación multiconjunto de los 23 campos tipados).

## 3. Inventario de campos (motor)

| Campo origen | Tipo | Unidad | Nulos | Distintos | SpecKey propuesta | Base de identidad | Derechos | Confianza |
|---|---|---|---:|---:|---|---|---|---|
| fuelType | string | — | 0,1 % | 13 | clase de tren motriz | fila de motor (L2) | ❓ S14 | alta (lista cerrada) |
| displacementCc | number | cm³ | 4,6 % | 1.191 | `pt.displacement_cc` | L2 | ❓ | alta |
| powerHp | number | "HP" (a menudo PS) | 0,5 % | 815 | — (unidad ambigua) | L2 | ❓ | baja |
| specs."ENGINE SPECS / Power" | texto | kW explícito | 2,9 % | — | `perf.power_max_kw` (ICE) | L2 | ❓ | alta |
| torqueNm | number | N·m | 4,1 % | 660 | `perf.torque_nm` | L2 | ❓ | media |
| transmission | string | texto libre | 1,6 % | 678 | `transmission` (CVT sin mapear) | L2 | ❓ | media |
| drivetrain | string | FWD/RWD/AWD | 0,6 % | 3 | `drivetrain` | L2 | ❓ | alta |
| zeroToHundredKmhS | number | s ("0-62 mph (0-100 kph)") | 16,9 % | 276 | `perf.accel_0_100_s` | L2 | ❓ | media (método no declarado) |
| topSpeedKmh | number | km/h | 15,0 % | 260 | `perf.top_speed_kmh` | L2 | ❓ | media |
| fuelEconomyCombinedL100 | number | L/100 km | 15,5 % | 228 | — (ciclo NEDC/WLTP mezclado) | L2 | ❓ | baja |
| length/width/height/wheelbaseMm | number | mm | 2,4–2,8 % | 368–952 | `dim.*` | **generación** (igual para todos sus motores) | ❓ | media |
| curbWeightKg | number | kg ("unladen", sin definición) | 9,9 % | 2.002 | — (≠ masa en orden de marcha UE) | L2 | ❓ | baja |
| specs."DIMENSIONS / Cargo Volume" | texto | cuFT (L) | 10,6 % | — | `cap.boot_l` | generación | ❓ | baja (método VDA/SAE y asientos no declarados) |
| specs."POWER SYSTEM SPECS / Nominal/Maximum Capacity" | texto | kWh | 97,6 % | — | `bat.*` | L2 | ❓ | baja (bruta/útil no definida) |
| specs."Charging time (normal/quick)" | texto | h | ≈ 100 % | — | — | L2 | ❓ | — (sin kW AC/DC) |

No hay: TAN/Va/Ve, mercado, acabado comercial, año-modelo, precio, garantía, potencia de carga AC/DC.

## 4. Generaciones

- **Representación**: `generations.name` = "modelo [carrocería] (año de inicio)" + `yearStart`/`yearEnd` por año natural. `bodyType` es **nulo en las 7.217**. 0 nombres con "Facelift"; 4 con código tipo Mk/romano; 1.720 con puertas/carrocería en el nombre; 355 nombres duplicados dentro del mismo modelo (p. ej. dos "Leon (2020)", dos "Golf GTI / GTD / GTE (2004)").
- **Golf** (modelo "Golf", 2008+): `3/5 Doors (2008) 2008–2012` · `5 Doors (2010) 2010–2014` · `3/5 Doors (2012) 2012–2017` · `3/5 Doors (2017) 2017–2019` · `5 Doors (2019) 2019–2024` · `5 Doors (2024) 2024–`.
  - Un experto puede leer "2012" = Golf VII, "2017" = VII restyling, "2019" = VIII y "2024" = VIII restyling, pero **el dataset no lo dice**: no hay código, la "generación" mezcla generación y restyling, y "5 Doors (2010) 2010–2014" se solapa con dos entradas sin explicación.
  - Los fines de periodo no coinciden con fuentes de fabricante (el VII restyling se vendió hasta 2020; aquí 2019).
  - El Golf 1.5 TSI 96 kW (#1/#3 del catálogo) **no aparece** en "5 Doors (2017)", que solo lista 1.0/1.4 TSI.
- **Distinciones**: el dataset da un *periodo de producción/comercialización aproximado* por año; **no** da año-modelo ni año de matriculación, y no separa restyling de generación. Ninguna "generación" se convierte en `generation_code` ni en `model_year`.
- **Cobertura temporal** (inicio de generación): <2010 3.666 · 2010–14 1.085 · 2015–19 1.223 · 2020–23 798 · 2024+ 445. **Geográfica**: sin campo de mercado; país de marca no declarado en 136/164; incluye modelos US ("Corolla (US)") y nombres egipcios.

## 5. Calidad observada contra RDW (filas compatibles en motor; ver [matching](D1_4_TWENTY_VARIANT_MATCHING.md) §5)

Longitud 69/93 dentro de la envolvente RDW ±15 mm · anchura 72/92 (probable inclusión de retrovisores en algunos) · altura 74/91 · batalla 72/88 · velocidad máxima 20/26 (±2 km/h) · masa 26/50 (definiciones distintas). Errores evidentes detectados: el PHEV RAV4 2018 etiquetado `fuelType: "Hybrid Gasoline"`; filas idénticas repetidas en dos generaciones (Sportage 2015/2018).

## 6. Conclusión

Útil como **índice de investigación** (qué generación/motor podría ser) y para localizar campos. No resuelve `generation_code` ni `model_year`, no alcanza la homologación y sus derechos no están acreditados.
