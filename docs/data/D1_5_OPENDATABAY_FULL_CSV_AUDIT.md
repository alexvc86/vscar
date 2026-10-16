# VScar — D1.5 Opendatabay / Kaggle `Car_Dataset_1945-2020.csv` (S15): auditoría del fichero completo

> Estado: **analizado (investigación) · derechos BLOQUEADOS (❌) · 0 valores reutilizables** · 2026-10-16 · Perfil: [`d15/source-profiles.json`](d15/source-profiles.json) · Lector: [`open-catalogs`](../../packages/data-connectors/src/open-catalogs/index.ts)

## 1. Fichero

| Aspecto | Valor |
|---|---|
| Ubicación entregada | `docs/Car_Dataset_1945-2020.csv`, aportado por el usuario. Se añade a `.gitignore` (no versionar) y se copia como fichero de adquisición a `data/raw/opendatabay/full/` |
| Tamaño / SHA-256 | 24.866.141 B · `e4218734…da7a`. El tamaño coincide con el de Kaggle (API: 24.866.141 B) → es el fichero de *Car Specification Dataset 1945-2020* (Jahaidul Islam, 2023-02-25) |
| Codificación | UTF-8 sin BOM, `,`, CRLF |
| Registros / columnas | **70.823** · **78** (cabecera exacta exigida; deriva = error) |
| Marcas · modelos · generaciones · series | 255 · 2.995 · 7.122 · 11.578 |
| Años | `Year_from` 1904 → `Year_to` 2020. `Year_to` vacío o "0" (sin fin declarado): 3.790 filas. **Nada posterior a 2020** |
| Duplicados | 2.657 filas idénticas salvo `id_trim` |

## 2. Significado real de los campos

| Campo | Lo que es | Granularidad |
|---|---|---|
| `Generation` | ordinal + restyling: "7 generation [redesign]", "[2nd redesign]" (42.300 filas con ordinal, 24.654 con restyling); o un código ("W177", "GMT900") en 28.504 | GENERATION (con restyling) |
| `Year_from`/`Year_to` | periodo de producción/comercialización de la serie | **no** es año-modelo |
| `Series` | carrocería y puertas ("Hatchback 5-doors", "Variant wagon 5-doors") | GENERATION + carrocería |
| `Trim` | motor + caja ("1.0 TSI DSG"), **no** acabado comercial | POWERTRAIN |
| Dimensiones, maletero, plazas | iguales en todas las filas de una serie | GENERATION + carrocería |
| `minimum_trunk_capacity_l` / `max_trunk_capacity_l` | maletero con asientos montados / abatidos (Golf VII: 380 / 1.270) | serie |
| `engine_hp` | **CV métricos (PS)**: 110 = 81 kW del 1.0 TSI. Se convierte por la definición exacta 1 PS = 735,49875 W; `max_power_kw` (89 % vacío) tiene prioridad | POWERTRAIN |
| `acceleration_0_100_km/h_s` | 0–100 km/h según el nombre de la columna; la ficha de Kaggle/Opendatabay dice "0 to 60 mph" → **definición dudosa**; nunca se convierte | POWERTRAIN |
| `transmission` | Manual / Automatic / robot (automatizada) / CVT / "Electronic with N clutch" | POWERTRAIN |
| Batería, autonomía eléctrica, carga | **100 % vacíos** | — |

Nulos destacados: maletero (mín.) 35,1 % · 0–100 43,3 % · `Body_type` 26,2 % · CO₂ 97,4 % · país 82,5 %.

## 3. Modelos europeos y compatibilidad con EEA/RDW

- Están las marcas del catálogo, salvo CUPRA. BYD aparece solo con modelos antiguos (F0/F3/F5), sin SEAL. Tesla, solo Model 3; no hay Model Y.
- El corte en 2020 deja fuera las candidatas con matriculaciones de 2021 en adelante (la mayoría del lote D2).
- Configuraciones incompatibles detectadas por el matcher (combustible, kW/PS, cilindrada, tracción, puertas 3/5, longitud y batalla RDW). Ver [D1_5_MULTI_SOURCE_MATCHING](D1_5_MULTI_SOURCE_MATCHING.md).

## 4. Resultado

| | 20 | 100 |
|---|---:|---:|
| STRONG | 1 (#9) | 11 |
| WEAK | 1 (#20) | 3 |
| REJECTED | 0 | 1 |
| NOT_FOUND | 18 | 85 |

Cobertura de generación y maletero para modelos ≤ 2020, útil como **investigación**.

## 5. Derechos

**Bloqueada** (❌), sin cambios:
- La página de Opendatabay dice CC0, pero su licencia enlazada prohíbe el uso comercial.
- El original de Kaggle dice "CC0" sin procedencia.
- La estructura (make → generation → series → trim, `id_trim`) corresponde a una base comercial de terceros no identificada.

Disponer del CSV no levanta la restricción. Los valores solo están en `data/research/d15/` (fuera de Git).
