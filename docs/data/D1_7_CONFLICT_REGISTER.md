# VScar — D1.7 Registro de conflictos del catálogo técnico (92 vehículos)

> Estado: **24 valores en 12 grupos, 9 vehículos · todos ABIERTOS** · 2026-10-22 · Fuente: [`d17/audit-after-batch-E.json`](d17/audit-after-batch-E.json)

**Reglas aplicadas**:
- se conservan todos los valores;
- ninguno se promedia;
- ninguno se elige por jerarquía de fuente ni por coincidencia entre fuentes, porque no hay regla aprobada;
- Quality marca los valores en conflicto como **NOT_USABLE**, así que no intervienen en ninguna categoría ni comparación.

**Valores de RDW (S11)**: se muestran como `—`. Sus derechos están PENDING y su redistribución no está aprobada; el valor existe en `vscar_dev` y se ve en `/internal/catalog`.

**Impacto**:
- **Categoría**: la clave la exige alguna categoría de comparación del vehículo. Vuelve el vehículo **CONFLICTED** en el diagnóstico D1.8.
- **Menor**: ninguna categoría de comparación usa esa clave.

| # | Vehículo | Clase | SpecKey | S01 EEA (CONDITIONAL) | S11 RDW (PENDING) | Base de medida | Tipo | Impacto | Estado |
|---|---|---|---|---|---|---|---|---|---|
| 4 | BYD SEAL | BEV | `rng.electric_combined_km` | 520 km (ciclo no declarado, `range_type` sin especificar) | — (WLTP, `WLTP_COMBINED`) | distinta | CROSS_SOURCE_DIFFERENT_BASIS | **Categoría** (Range) | abierto |
| 4 | BYD SEAL | BEV | `nrg.electric_combined_kwh100` | 18,2 kWh/100 km (no declarado) | — (WLTP) | distinta | CROSS_SOURCE_DIFFERENT_BASIS | **Categoría** (Economy) | abierto |
| 24 | Dacia Sandero | ICE | `emi.co2_combined_gkm` | 112–113 g/km (WLTP) | — (WLTP) | misma | CROSS_SOURCE_VALUE_MISMATCH | menor | abierto · hipótesis sin verificar: modo de combustible (bi-fuel) |
| 24 | Dacia Sandero | ICE | `nrg.fuel_combined_l100` | 5,7 L/100 km (no declarado) | — (WLTP) | distinta | CROSS_SOURCE_DIFFERENT_BASIS | **Categoría** (Economy) | abierto |
| 31 | Kia Sportage | ICE | `dim.wheelbase_mm` | 4.480 mm | — | misma | CROSS_SOURCE_VALUE_MISMATCH | menor (la batalla no es clave de categoría) | abierto · 4.480 mm es más propio de una longitud total que de una batalla; revisar el campo de origen |
| 53 | Mercedes-Benz Clase A | PHEV | `nrg.electric_combined_kwh100` | 21,1–21,7 kWh/100 km (no declarado) | — (WLTP) | distinta | CROSS_SOURCE_DIFFERENT_BASIS | **Categoría** (Economy PHEV) | abierto |
| 59 | Hyundai Kona | HEV | `emi.co2_combined_gkm` | 112 g/km (WLTP) | — (WLTP) | misma | CROSS_SOURCE_VALUE_MISMATCH | menor | abierto |
| 59 | Hyundai Kona | HEV | `nrg.fuel_combined_l100` | 4,9 L/100 km (no declarado) | — (WLTP) | distinta | CROSS_SOURCE_DIFFERENT_BASIS | **Categoría** (Economy) | abierto |
| 62 | Renault Clio | HEV | `perf.power_ice_kw` | 51 kW (base no declarada) | — (`ICE_ONLY`) | distinta | CROSS_SOURCE_DIFFERENT_BASIS | menor (Performance exige potencia de sistema) | abierto |
| 65 | CUPRA Formentor | ICE | `nrg.fuel_combined_l100` | 3,7 L/100 km (no declarado) | — (WLTP) | distinta | CROSS_SOURCE_DIFFERENT_BASIS | **Categoría** (Economy) | abierto · 3,7 L/100 km es poco plausible para un ICE; revisar si EEA mezcla una versión e-Hybrid bajo la misma clave |
| 66 | Kia Sportage | PHEV | `nrg.phev_weighted_fuel_l100` | 1,1 L/100 km (no declarado) | — (WLTP, `WEIGHTED_PHEV`) | distinta | CROSS_SOURCE_DIFFERENT_BASIS | menor (Economy PHEV usa charge-sustaining) | abierto |
| 73 | Toyota RAV4 | PHEV | `nrg.phev_weighted_fuel_l100` | 0,3 L/100 km (no declarado) | — (WLTP, `WEIGHTED_PHEV`) | distinta | CROSS_SOURCE_DIFFERENT_BASIS | menor | abierto |

## Resumen

| Concepto | Antes de D1.7 (18) | Después (92) |
|---|---:|---:|
| Valores en conflicto | 12 | **24** |
| Grupos | 6 | **12** |
| Vehículos con conflicto | 4 (#4, #24, #53, #73) | **9** (+ #31, #59, #62, #65, #66 del lote E) |
| Con conflicto en una clave de categoría (CONFLICTED en D1.8) | — | **5** (#4, #24, #53, #59, #65) |

## Decisión necesaria (fuera de D1.7)

Cualquier resolución exige una regla aprobada y documentada. Por ejemplo:
- preferir el valor con ciclo declarado (WLTP) frente al no declarado;
- o verificar con la ficha del fabricante (S08, que tiene derechos restringidos).

Hasta entonces, estos campos siguen fuera de las comparaciones.
