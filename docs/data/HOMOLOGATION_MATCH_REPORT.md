# Homologation Match Report — Dataset Core v0.1

> Step 4c · Fecha: 2026-09-24 · Reglas: [ADR-007](../adr/ADR-007-reference-vs-used-instance.md), [SPEC_KEY_CATALOG v0.2](SPEC_KEY_CATALOG.md) §2–§4
> Evidencia por DC: [`dataset-core-v0.1/identity/DC-NN.identity.json`](dataset-core-v0.1/identity/) (candidatos EEA, decisión, evidencia, variants que no se fusionan)

## Reglas aplicadas

| Nivel | Requisito | Efecto |
|---|---|---|
| **EXACT** | TAN + Va + Ve exactos **y** una fuente oficial enlaza la variant comercial con ese identificador (IDAE, CoC, documento de homologación) — o los valores curados del DC proceden de ese registro EEA exacto | Alimenta engines y cross-market automáticamente |
| **PARTIAL** | TAN + Va con evidencia, sin Ve verificable (o TAN coincidente sin versión verificable) | Revisión humana; nunca PUBLISHED automáticamente; el adapter lo bloquea (`mapping_confidence = UNCONFIRMED` en mismo mercado, `homologation_match = PARTIAL` cross-market) |
| **UNCONFIRMED** | Solo nombre comercial / año / motor / potencia / trim / generación, o coincidencia de valores | No alimenta engines |

Nunca se fusionan homologaciones por igualdad de valores (misma potencia, CO₂, consumo o autonomía ≠ misma variant técnica). Nunca se infiere `Ve` por similitud comercial.

## Resultado

| DC | Commercial Variant | TAN | Va | Ve | confidence | notes |
|---|---|---|---|---|---|---|
| DC-01 | Toyota RAV4 220H 4x2 218 CV Advance 2021 (XA50) | — | — | — | **UNCONFIRMED** | EEA 2021 ES: Va AXAH52 / AXAL52 (4x2) y AXAH54 / AXAL54 (AWD-i) bajo e6*2007/46*0289; IDAE 540541 sin código. Solo catálogos de recambios (no evidencia) ligan "52" a 4x2 |
| DC-02 | Toyota RAV4 Hybrid 200 FWD Advance (6.ª gen., 2026) | — | — | — | **UNCONFIRMED** | Sin datos EEA de la 6.ª generación en ES (último año EEA: 2025 provisional). IDAE 609107 sin código |
| DC-03 RV-A | VW Golf Advance 1.5 TSI EVO 130 CV 5p manual (Mk7.5), NEDC | e1*2007/46*0623*33 | GAC4DACAX0 | FM6FM6AJ015N7MVON1ML79VR2N | **EXACT** | Registro EEA del que DC-03 tomó sus valores (113 g/km NEDC, 1.301 kg, 140 matric.). Enlace trim "Advance" ↔ Ve = inferencia de curación (la EEA no tiene trim) |
| DC-03 RV-B | ídem, homologación WLTP + NEDC-correlated | e1*2007/46*0623*35 | GAC4DACAX0 | FM6FM6AJ015N7CPON1ML1BVR2NA | **EXACT** | 113 g/km NEDC-correlated · 135–136 g/km WLTP · 1.315 kg · 523 matric. DSG (FD7…) y ML1C (116–119 g/km) son otras variants |
| DC-04 | VW Golf Style 1.5 eTSI 150 CV DSG7 (Mk8.5) | — (tipo CD, e1*2007/46*2014* a nivel modelo) | — | — | **UNCONFIRMED** | EEA 2024–25: Va ACDXDBX0 con TAN *24…*32 y muchas Ve; ese Va incluye también el manual 6 (FM6) y la Variant; IDAE 607306 sin código |
| DC-05 | BMW X3 xDrive20d 190 CV (G01) hasta 08/2018 | — | — | — | **UNCONFIRMED** | Candidato por valores: e1*2007/46*1797*01/*02, Va TX31, Ve CA{1,2,3}500… (NEDC 132/138/142). La especificación 09/2018 (*03/*04, Ve CAW500…) es otra homologación |
| DC-06 | Hyundai Tucson 1.6 T-GDI HEV 230 CV FWD Tecno 2023 (NX4) | e5*2018/858*00001*06 (solo nivel modelo) | — | — | **UNCONFIRMED** | Candidato por valores: Va F5P41 / Ve A61B14 (130–131 g/km), que también encaja con otros trims. F5P44 (AWD) y F5P31/34 (MHEV 48 V) separados |
| DC-07 | Tesla Model 3 SR+ RWD 2021 (448 km) | e4*2007/46*1293 (base; revisión no determinable) | E6R · E6CR | — | **UNCONFIRMED** | **E6R y E6CR no demostrablemente idénticas** (revisiones TAN *13/*15 vs *17/*18/*19, periodos que no se solapan, Ve adicional PQB1S5N, Zr 440 en *13) → **2 ReferenceVariants técnicas separadas**. E6LR (dic. 2021, 491/495 km) es otra |
| DC-08 | BYD SEAL Design RWD 82,5 kWh (2026) | E13*2018/858*00639 (revisión 2026 pendiente) | SE2R1C | 2NTE5F002NL1 | **EXACT** | **IDAE 606454 "SE2R1C/2NTE5F002NL1" = EEA Va/Ve carácter a carácter** (2024 F, 2025 P). Los códigos IDAE de Comfort y Excellence también coinciden con su Va/Ve → el código IDAE es Va/Ve |
| DC-09 | SEAT León 5p 1.5 TSI 130 CV Style manual 2018 (Mk3 FL) | — | — | — | **UNCONFIRMED** | Candidato por valores: e9*2007/46*0094*28…*31, Va BDACAX0V (2.340 matric.); ST (FDACAX0V) y 150 CV (BDADAX0V) separados; IDAE sin código |
| DC-10 | SEAT León 5P Style 1.5 e-HYBRID 204 CV (Mk4 FL, MY26.5) | — | — (candidato SBDUCBX0) | — | **UNCONFIRMED** (ES) · cross-market **PARTIAL** | Re-homologación visible: *30–*33 (WEML1…, 7–9 g/km) → *34/*35 (…VNML1BBAKL03, 28–29 g/km). *34 existe en ES y DE, pero seat.de no imprime TAN/Va/Ve → **el consumo CS de DE no alimenta ES** |

```text
Exact:       2/10  (DC-03 [2 variants técnicas], DC-08)
Partial:     0/10
Unconfirmed: 8/10  (DC-01, DC-02, DC-04, DC-05, DC-06, DC-07 [2 variants técnicas], DC-09, DC-10)
Cross-market León DE→ES: PARTIAL → nrg.fuel_charge_sustaining_l100 sigue sin activar Economy/Range
```

## Qué falta para subir de nivel

| DC | → PARTIAL | → EXACT |
|---|---|---|
| DC-01 | CoC / ficha técnica ITV de una unidad ES 220H 4x2 Advance con TAN y Va (AXAH52 o AXAL52) | + versión (Ve) de esa unidad |
| DC-02 | Datos EEA 2026 (previstos 2027) + documento oficial con TAN/Va | + Ve |
| DC-03 | — (EXACT) | Opcional: ficha VW con Ve por trim para oficializar el enlace comercial |
| DC-04 | Documento que nombre Va ACDXDBX0 para Style 1.5 eTSI DSG | + Ve exacta (hay muchas bajo *24…*32) |
| DC-05 | CoC / ficha de un X3 xDrive20d anterior a 09/2018 con TAN *1797*01/*02 y Va TX31 | + Ve |
| DC-06 | CoC / ficha Hyundai ES con tipo NX4E y Va F5P41 | + Ve (p. ej. A61B14) |
| DC-07 | CoC de un SR+ 2021 matriculado en ES (campos 0.2/0.2.1) → Va + TAN con revisión | + Ve; documento de extensión que explique E6R → E6CR (si fuesen idénticas, ADR para agruparlas) |
| DC-08 | — (EXACT en Va/Ve) | Revisión de TAN de la fase 2026: EEA 2026 o CoC 2026 (el adapter no empareja sin TAN exacto) |
| DC-09 | CoC / ficha técnica con TAN *0094*xx, tipo 5F y Va BDACAX0V | + Ve |
| DC-10 | Documento SEAT ES con tipo/variante/versión del Style MY26.5 | + Ve; para el dato DE: hoja de consumo o CoC alemán con los códigos junto al 5,0–5,3 L/100 km |

**Palanca principal**: el IDAE publica el código de tipo/versión solo en algunas fichas (BYD sí; Toyota, VW, Tesla, SEAT, Hyundai no en las consultadas). El documento que desbloquea casi todos los casos es el **CoC** o la **ficha técnica ITV** de una unidad real (campos 0.2 y 0.2.1).

## Cambios aplicados a los fixtures

- Golf 2018: `version_code` exacta en ambas homologaciones (EXACT).
- BYD SEAL: `variant_code` / `version_code` del IDAE (EXACT; TAN de la fase 2026 sin fijar → no importable automáticamente todavía).
- Tesla Model 3 2021: la variant SR+ se divide en **E6R** y **E6CR** (UNCONFIRMED ambas); la variant de diciembre (E6LR) sigue separada.
- Resto: sin cambios de identidad (UNCONFIRMED); los candidatos quedan documentados en los ficheros `identity/`.
