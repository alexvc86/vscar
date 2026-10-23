# VScar — D1.8 Resolución técnica interna

> Estado: **implementado** · 2026-10-22
> - **Código**: `resolveSelection`, `groupEquivalent` y `representative` en [`model-selection.ts`](../../apps/web/src/domain/model-selection.ts) (puro, reutilizable); `configurationsOf` en el servicio de catálogo.
> - **Decisión**: [ADR-020 §2 y §4](../adr/ADR-020-simplified-model-selection.md).

## 1. Problema

«Volkswagen Golf 2018» puede ser gasolina, diésel o híbrido, con potencias, cajas, homologaciones, consumos y autonomías distintas. **El sistema nunca elige una variante arbitraria como representante del modelo.**

## 2. Algoritmo

1. **Candidatas**: las ReferenceVariants seleccionables de la marca, el modelo y el año.
2. **Hechos de cada candidata**: potencia, consumo de combustible (combinado y *charge-sustaining*), consumo eléctrico, autonomía eléctrica y batería, **por ciclo**. Solo se toman valores usables, publicables en el canal, vigentes en su fecha y sin conflicto.
3. **Firma**: tren motriz + combustible + caja + tracción + versión comercial normalizada.
4. **Grupos equivalentes**: misma firma y ningún hecho contradictorio **en el mismo ciclo**. Un valor NEDC y uno WLTP nunca se comparan entre sí; un hecho ausente no contradice.
5. **Estado**:

| Estado | Regla |
|---|---|
| `AUTO_RESOLVED` | un grupo con un miembro |
| `EQUIVALENT_GROUP` | un grupo con varios miembros |
| `NEEDS_CONFIGURATION` | varios grupos |
| `UNRESOLVED` | ningún grupo; se muestran las configuraciones técnicas (agregadas) como información |

6. **Miembro comparado** de un grupo, por precedencia y **sin mirar valores**:
   1. WLTP;
   2. confianza de identidad;
   3. número de hechos relevantes;
   4. homologación más reciente;
   5. slug.

**Prohibido**: primera variante, más barata, menor consumo, mayor potencia, aleatoria y promedios. Tests: «never chosen by value» y permutaciones.

## 3. Resultado sobre los datos reales (PREVIEW, `vscar_dev`)

| Estado | Combinaciones modelo-año |
|---|---:|
| `AUTO_RESOLVED` | 4 (BMW X3 2018, BYD SEAL 2026, SEAT León 2026, Golf 2027) |
| `EQUIVALENT_GROUP` | 1 (Golf 2018: *33 NEDC + *35 WLTP → se compara *35) |
| `NEEDS_CONFIGURATION` | 1 (Tesla Model 3 2021: «Autonomía estándar plus» [E6R + E6CR → E6CR] y «Tracción trasera» [E6LR]) |
| `UNRESOLVED` | 97 (homologaciones técnicas sin ReferenceVariant) |

## 4. Falsas coincidencias evitadas

| Caso | Sin la regla | Con la regla |
|---|---|---|
| Golf 2018 *33 / *35 | dos tarjetas idénticas que solo diferían por «homologación NEDC / WLTP» | una opción; se compara la homologación WLTP; el ciclo NEDC queda como procedencia |
| Model 3 2021 E6R / E6CR | dos filas «Autonomía estándar plus» | una opción (mismos hechos WLTP: 448 km, 14,2 kWh/100 km, 239 kW) |
| Model 3 2021 E6LR | — | **no** se fusiona con la anterior (491 km frente a 448 km): aclaración |
| Búsqueda directa «golf» y «tesla» | 3 resultados cada una | 2 cada una (un resultado por grupo, sin ciclo ni periodo) |
| Configuraciones técnicas duplicadas en un modelo-año (p. ej. dos Corolla HEV de 2022) | — | una fila con ×n |

## 5. «No lo sé» e identidad insuficiente

- **«No lo sé»**: mantiene marca, modelo y año en el selector y explica que sin motorización concreta no se comparan cifras. «Elegir motorización» vuelve a la aclaración. No se crea ninguna comparación.
- **`UNRESOLVED`**: muestra las homologaciones técnicas documentadas, con un resumen comprensible (tren motriz, combustible, potencia comparable, caja) y los motivos. No hay resumen Nuevo/Usado ni cálculo.

## 6. Potencia en las configuraciones técnicas

Los 79 valores de `perf.power_max_kw` de la capa técnica tienen base `ICE_ONLY` (potencia del motor térmico, EEA). Por eso:
- **ICE/MHEV**: se muestra como «kW (motor térmico)».
- **BEV**: potencia eléctrica.
- **HEV/PHEV**: no se muestra. No es la potencia del sistema y induciría a error.
