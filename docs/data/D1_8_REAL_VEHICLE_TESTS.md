# VScar — D1.8 Pruebas con vehículos reales

> Estado: **7/7 escenarios en escritorio y móvil** · 2026-10-22
> - **Entorno**: build de producción (`next start`, canal PREVIEW) sobre `vscar_dev`.
> - **Pruebas**: [`d18-real-vehicles.spec.ts`](../../apps/web/e2e/d18-real-vehicles.spec.ts).
> - **Datos de navegación**: [`d18/catalog-navigation.json`](d18/catalog-navigation.json).
> - **Alcance**: solo años y configuraciones presentes en la base.

## Escenarios

En **Derechos**, «S01 condicional / S11-S13 pendientes» significa que los datos que alimentan la descripción técnica vienen de EEA, CC BY y publicable en PREVIEW, y de RDW/Traficom, admisibles solo en PREVIEW. En PUBLIC no se muestran.

| Escenario | Marca | Modelo | Años disponibles | Año probado | Configuraciones técnicas (año probado) | Resolución | Categorías habilitadas | No disponibles | Derechos | Resultado del selector |
|---|---|---|---|---|---|---|---|---|---|---|
| Volkswagen Golf 2018 | ✅ | ✅ comparable | 2027ᴹ, 2025, 2024, 2022, 2021, 2020, 2018ᴹ | 2018 | Advance 1.5 TSI EVO 130 CV · gasolina · manual (2 homologaciones: NEDC + WLTP); + 1 técnica sin comparar | EQUIVALENT_GROUP → se compara *35 (WLTP) | las que permitan sus datos, igual que antes de D1.8 (los engines no cambian) | **Economy**: ninguna de las dos homologaciones tiene consumo | S01 condicional; fichas S08 en PREVIEW | coche elegido sin paso Versión → Nuevo/Usado |
| Toyota Corolla | ✅ | ✅ solo descubrible | 2025, 2022, 2020 | 2022 | Híbrido · gasolina | UNRESOLVED | ninguna (no seleccionable) | todas | S01 condicional / S11-S13 pendientes | información + «Comparación no disponible» |
| Toyota Yaris | ✅ | ✅ solo descubrible | 2025, 2024, 2023, 2022, 2018 | 2022 | Híbrido · gasolina; Combustión · gasolina | UNRESOLVED | ninguna | todas | idem | idem |
| Tesla Model Y | ✅ | ✅ solo descubrible | 2025, 2022 | 2022 | 2 × Eléctrico (220 kW y 393 kW) | UNRESOLVED | ninguna | todas | idem | idem |
| Peugeot 308 | ✅ | ✅ solo descubrible | 2024, 2022, 2021, 2020 | 2024 | Combustión · diésel | UNRESOLVED | ninguna | todas | idem | idem |
| Renault Clio | ✅ | ✅ solo descubrible | 2025, 2024, 2022, 2020 | 2024 | Híbrido · gasolina · automático (×2); Combustión · diésel | UNRESOLVED | ninguna | todas | idem | idem |
| Kia Sportage | ✅ | ✅ solo descubrible | 2025 … 2016 | 2022 | Combustión · gasolina · manual; Microhíbrido · gasolina; PHEV · gasolina · automático | UNRESOLVED | ninguna | todas | idem | idem |

ᴹ = año-modelo; el resto, matriculaciones observadas.

Ningún escenario muestra códigos de homologación, ciclos, «TAN», «S11» ni «RDW» (comprobado), ni produce scroll horizontal.

## Comparables (motor real, mismo rival BYD SEAL, escenario por defecto)

| Opción del selector | ReferenceVariant comparada | Economy | Range |
|---|---|---|---|
| Volkswagen Golf 2027 | `volkswagen-golf-style-1-5-etsi-150-dsg` | disponible | — (ICE) |
| Volkswagen Golf 2018 | `…-h35` (grupo con `…-h33`) | **no disponible** (sin consumo en ninguna) | — |
| BMW X3 2018 | `bmw-x3-2018-xdrive20d` | disponible, **NOT_COMPARABLE** frente a WLTP (su consumo es NEDC) | — |
| BYD SEAL 2026 | `byd-seal-2026-design-rwd-82-5-kwh` | disponible | disponible |
| SEAT León 2026 (PHEV) | `seat-leon-2026-style-e-hybrid-204` | coste de uso **no disponible** (sin consumo *charge-sustaining*; nunca se usa el WLTP ponderado); consumo eléctrico NOT_COMPARABLE (base de consumo sin especificar) | autonomía eléctrica presente (la clasifica el motor) |
| Tesla Model 3 2021 «Autonomía estándar plus» | `…-e6cr` (grupo con `…-e6r`) | disponible, **idéntica** a E6R (test) | disponible |
| Tesla Model 3 2021 «Tracción trasera» | `tesla-model-3-2021-traccion-trasera` | no disponible (sin consumo) | disponible (491 km frente a 570 km → BEHIND) |

No se desbloquea ninguna categoría artificialmente. Practical Fit, Performance, Charging, Warranty y Safety dependen de los datos de cada variante, como antes de D1.8.

## Nuevo / usado y precio manual

Verificado en e2e (build de producción):
- NEW/NEW con precio manual (`a_price`), sin cambio en Economic Fit;
- NEW/USED y USED/USED (Model 3 2021 elegido por la aclaración, con precio, kilometraje, matriculación y SOH de la unidad);
- cambio de unidad sin arrastrar hechos;
- requisitos de usado.

La antigüedad del usado sale de la matriculación que introduce el usuario, nunca del año del selector.
