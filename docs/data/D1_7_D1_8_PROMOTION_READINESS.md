# VScar — D1.7 Preparación para D1.8 (promoción técnica → seleccionable)

> Estado: **diagnóstico, no autorización** · 2026-10-22
> - **Datos**: [`d17/technical-catalog-coverage.json`](d17/technical-catalog-coverage.json), con clasificación y bloqueos por vehículo.
> - **Sin cambios**: el gate PREVIEW/PUBLIC y el selector.
> - **Alcance**: D1.8 tendrá que definir y aprobar cualquier regla de promoción. Esta clasificación solo ordena el trabajo.

## 1. Criterios del diagnóstico (por precedencia)

| Estado | Regla |
|---|---|
| **CONFLICTED** | conflicto abierto en una clave que exige alguna categoría de comparación del vehículo |
| **NEEDS_IDENTITY** | identidad comercial UNCONFIRMED (sin designación ni acabado), o relación con una variante seleccionable sin reconciliar (#88) |
| **NEEDS_DATA** | ninguna categoría de comparación técnicamente activable con datos utilizables y sin conflicto |
| **NEEDS_RIGHTS** | hay categorías activables, pero solo con datos de derechos PENDING (S11) |
| **READY_FOR_PROMOTION_REVIEW** | identidad técnica EXACT y comercial al menos PARTIAL, sin conflicto relevante, ≥ 1 categoría activable con datos APPROVED o CONDITIONAL (S01, CC BY) |

**Bloqueos que comparten los 92** (ninguno se ha resuelto ni inventado):
- generación sin verificar y año-modelo sin verificar (ninguna fuente);
- acabado sin confirmar, salvo #4 y #26.

Por eso, ni READY_FOR_PROMOTION_REVIEW significa "promocionable". Significa "candidato para que D1.8 revise su identidad comercial con evidencia".

**Categorías evaluadas**:
- Se usan los requisitos del proyecto (`CATEGORY_REQUIREMENTS`). No se imponen requisitos globales ajenos a cada categoría: garantía, aceleración, maletero o precio de tarifa solo cuentan donde la categoría los usa.
- Economy no exige precio de tarifa, porque el precio lo introduce el usuario desde D1.6.

## 2. Resultado

| Estado | Nº | Candidatas |
|---|---:|---|
| READY_FOR_PROMOTION_REVIEW | **9** | #5, 6, 7, 26, 27, 28, 48, 56, 81 |
| NEEDS_IDENTITY | **72** | los 72 nuevos sin conflicto en claves de categoría (identidad comercial UNCONFIRMED), incluido #88 (relación con `tesla-model-3-2021-traccion-trasera`) |
| NEEDS_DATA | **2** | #57 Peugeot 3008 PHEV, #73 Toyota RAV4 PHEV |
| NEEDS_RIGHTS | **4** | #8 Hyundai Tucson, #9 Kia Sportage, #20 Peugeot 3008, #86 Renault Clio (su consumo solo viene de RDW) |
| CONFLICTED | **5** | #4 BYD SEAL, #24 Dacia Sandero, #53 Mercedes Clase A PHEV, #59 Hyundai Kona HEV, #65 CUPRA Formentor |

Por clase:
- **ICE**: 5 READY · 30 NEEDS_IDENTITY · 3 NEEDS_RIGHTS · 2 CONFLICTED.
- **MHEV**: 1 READY · 2 NEEDS_IDENTITY.
- **HEV**: 2 READY · 16 NEEDS_IDENTITY · 1 NEEDS_RIGHTS · 1 CONFLICTED.
- **PHEV**: 7 NEEDS_IDENTITY · 2 NEEDS_DATA · 1 CONFLICTED.
- **BEV**: 1 READY · 17 NEEDS_IDENTITY · 1 CONFLICTED.

## 3. Categorías de comparación activables

| Categoría | Aplica | Técnicamente activable (datos utilizables, sin conflicto) | Con derechos compatibles (S01 condicional) | Con derechos APPROVED | Qué falta |
|---|---:|---:|---:|---:|---|
| **Economy** | 92 | **77** | **51** | 0 | <ul><li>PHEV: consumo *charge-sustaining*, presente solo en 1 vehículo, por lo que ningún PHEV la activa;</li><li>parte de los ICE solo tienen consumo de RDW (pendiente)</li></ul> |
| **Range** | 92 | **17** (BEV) | **16** | 0 | <ul><li>ICE/HEV: depósito, sin fuente;</li><li>PHEV: depósito y *charge-sustaining*</li></ul> |
| **Size** | 92 | 0 | 0 | 0 | maletero (dimensiones sí: 92, pero solo RDW) |
| **Practicality** | 92 | 0 | 0 | 0 | maletero (plazas sí: 92, RDW) |
| **Performance** | 92 | 0 | 0 | 0 | 0–100 km/h (potencia sí: 90) |
| **Charging** | 29 | 0 | 0 | 0 | potencia AC/DC |

Por clase:

| Clase | Nº | Economy (técnica / derechos compatibles) | Range |
|---|---:|---|---|
| ICE | 40 | 37 / 13 | — |
| MHEV | 3 | 3 / 3 | — |
| HEV | 20 | 19 / 18 | — |
| PHEV | 10 | 0 / 0 | 0 |
| BEV | 19 | 18 / 17 | 17 / 16 |

**Conclusión técnica**:
- **Hoy**: con fuentes oficiales gratuitas solo pueden activarse **Economy** (coste de uso con precio introducido por el usuario) y **Range** (BEV).
- **Si se aprueban S11/S13**: se sumarían dimensiones y plazas, pero Size y Practicality siguen necesitando el maletero, que no tiene fuente.

## 4. Candidatos para una demo privada (20)

**Criterios de ordenación**:
- al menos una categoría activable;
- sin conflicto relevante;
- sin relación con el catálogo sin reconciliar;
- identidad comercial (EXACT > PARTIAL > UNCONFIRMED);
- número de categorías con derechos compatibles y técnicas;
- completitud crítica;
- como mucho 2 por modelo.

| # | Vehículo | Clase | Matriculado | Identidad comercial | Diagnóstico | Categorías (derechos compatibles) |
|---|---|---|---|---|---|---|
| 26 | Peugeot 308 | ICE | 2024 | EXACT | READY | Economy |
| 81 | Tesla Model Y | BEV | 2022 | PARTIAL | READY | Economy + Range |
| 5 | Kia Sportage | ICE | 2022 | PARTIAL | READY | Economy |
| 6 | Renault Clio | ICE | 2024–2025 | PARTIAL | READY | Economy |
| 27 | Toyota Yaris | ICE | 2022–2024 | PARTIAL | READY | Economy |
| 28 | Mercedes-Benz Clase A | ICE | 2022–2024 | PARTIAL | READY | Economy |
| 7 | Nissan Qashqai | MHEV | 2024–2025 | PARTIAL | READY | Economy |
| 48 | Toyota Yaris | HEV | 2022–2025 | PARTIAL | READY | Economy |
| 56 | Toyota Corolla | HEV | 2022 | PARTIAL | READY | Economy |
| 8 | Hyundai Tucson | ICE | 2018–2020 | PARTIAL | NEEDS_RIGHTS | Economy (solo RDW) |
| 9 | Kia Sportage | ICE | 2016–2018 | PARTIAL | NEEDS_RIGHTS | Economy (solo RDW) |
| 20 | Peugeot 3008 | ICE | 2018–2020 | PARTIAL | NEEDS_RIGHTS | Economy (solo RDW) |
| 86 | Renault Clio | HEV | 2020 | PARTIAL | NEEDS_RIGHTS | Economy (solo RDW) |
| 32 | Hyundai Kona | BEV | 2024–2025 | UNCONFIRMED | NEEDS_IDENTITY | Economy + Range |
| 61 | Kia Niro | BEV | 2022 | UNCONFIRMED | NEEDS_IDENTITY | Economy + Range |
| 76 | Tesla Model 3 | BEV | 2024–2025 | UNCONFIRMED | NEEDS_IDENTITY | Economy + Range |
| 84 | Tesla Model 3 | BEV | 2025 | UNCONFIRMED | NEEDS_IDENTITY | Economy + Range |
| 85 | Renault Mégane | BEV | 2022 | UNCONFIRMED | NEEDS_IDENTITY | Economy + Range |
| 90 | Volkswagen Golf | BEV | 2024 | UNCONFIRMED | NEEDS_IDENTITY | Economy + Range |
| 92 | Tesla Model Y | BEV | 2022 | UNCONFIRMED | NEEDS_IDENTITY | Economy + Range |

Una demo privada coherente hoy podría combinar:
- los 9 READY (8 de combustión/híbridos y 1 eléctrico) para una comparación de **coste de uso**;
- los BEV con Range para **eléctrico frente a eléctrico**.

Para enseñarlos en el selector, aun en PREVIEW, D1.8 tiene que aprobar antes cómo se resuelven la generación y el año-modelo.

## 5. Preguntas para D1.8 (decisión humana)

1. **Identidad comercial**: ¿qué evidencia basta para generación y año-modelo, y quién la valida? Hoy no hay fuente oficial gratuita con clave exacta.
2. **Gate por categoría**: ¿se permite en PREVIEW una variante con solo algunas categorías activables (Economy/Range) y las demás marcadas "no disponible"? Hoy no se permite; cambiarlo requiere una decisión de ADR.
3. **Derechos**: firmar o aplazar S11/S13 ([D1_6A_RIGHTS_REVIEW](D1_6A_RIGHTS_REVIEW.md)). Afecta a 4 NEEDS_RIGHTS y a dimensiones y plazas en general.
4. **Conflictos**: ¿regla de resolución, como "WLTP declarado frente a no declarado"? Afecta a 5 CONFLICTED ([registro](D1_7_CONFLICT_REGISTER.md)).
5. **#88**: reconciliación con la variante seleccionable `tesla-model-3-2021-traccion-trasera`.
