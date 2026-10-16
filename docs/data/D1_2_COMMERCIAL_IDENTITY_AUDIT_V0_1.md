# VScar — D1.2 Commercial Identity Audit v0.1

> Estado: **SOURCE RESEARCH PASS · COMMERCIAL IDENTITY UNLOCK PARTIAL** · 2026-10-16 · Curación versionada: [`d12/commercial-identity-v1.json`](d12/commercial-identity-v1.json) (22 entradas, validadas) · Evidencia automática: [`d12/commercial-evidence.json`](d12/commercial-evidence.json) · Código: `packages/curation/src/commercial.ts`, `scripts/d12-build.ts` · Reglas: [ADR-007](../adr/ADR-007-reference-vs-used-instance.md) · Propuesta: [ADR-019](../adr/ADR-019-technical-identity-without-confirmed-trim.md)

## 1. Dos identidades, dos evaluaciones

Se reutiliza `IdentityStatus` (sin enums nuevos) en dos ejes:

| Eje | EXACT | PARTIAL | UNCONFIRMED | CONFLICTED |
|---|---|---|---|---|
| **Técnico** (TAN completo + Va + Ve) | grupo EEA con clave completa; "corroborado" si RDW tiene la misma clave | (D1.1) misma Va/Ve solo bajo otra extensión | sin clave completa | datos de identidad incoherentes en la propia versión |
| **Comercial** (lo que ve el comprador) | un texto oficial ligado a la clave exacta nombra modelo **y un único acabado** | evidencia oficial del modelo (y quizá motor, caja, carrocería o un **conjunto** de acabados), sin acabado único | sin denominación oficial para la clave exacta | textos oficiales de la clave exacta con modelos distintos |

**Regla anti-invención (código)**: cada valor comercial curado tiene que aparecer **literalmente** en un texto oficial citado; un acabado que viene de una denominación EEA exige ≥ 95 % de las matriculaciones de la clave; EXACT exige un acabado único. Generación y año-modelo quedan `null`: ninguna fuente oficial abierta los da. El validador (`validateCommercialEntry`) corre en cada build; 22/22 válidas.

## 2. Fuentes de identidad comercial investigadas

| Fuente | Qué aporta para la clave exacta | Uso |
|---|---|---|
| **EEA `Cn`** (S01, CC BY 4.0) — denominación con la que se matriculó la unidad en ES (campo "commercial name" del CoC) | modelo; en Peugeot, cadena comercial completa (carrocería, motor, caja, acabado); en Mercedes/BMW, designación clase + motor | ✅ evidencia principal (redistribuible) |
| **IDAE `Vehiculo` con código** (S02, ❓) — solo cuando el texto incluye `(Va/Ve)` | acabado (BYD) | ✅ evidencia, por **referencia de fila**; derechos pendientes |
| **RDW `handelsbenaming`** (S11) | **todas** las denominaciones permitidas de la homologación: el tipo BYD `EKE` incluye > 80 nombres (ATTO, HALO, SEAL, ZEAL…); el tipo Peugeot `M` incluye 3008 y 5008; Clio aparece como "CLIO (E-TECH HYBRID)" (nombre NL) | ❌ nunca evidencia comercial (solo contraste negativo) |
| RDW registro por matrícula (`handelsbenaming` por vehículo) | denominación neerlandesa | ❌ mercado NL + datos por matrícula |
| CoC, fichas ITV, fichas reducidas, certificados CE de tipo | serían la fuente ideal | **no disponibles públicamente** (GIAVEH solo publica TAN/tipo/marca) |
| Traficom (FI, CC BY 4.0) | TAN, variante, versión, `kaupallinenNimi`, caja | denominación del mercado finlandés → no es identidad comercial ES; candidato de contraste técnico (no adquirido) |
| Fabricantes (S08) | catálogos, configuradores | términos restrictivos (D1); solo cita manual en PREVIEW |

## 3. Resultado — lote D2 (20) + Golf del catálogo

| # | Candidato | Clave técnica | Técnica | Comercial | Campos evidenciados | Evidencia |
|---|---|---|---|---|---|---|
| 3 | VW Golf 2018 (NEDC) | `E1*2007/46*0623*33` · `GAC4DACAX0` · `FM6FM6AJ015N7MVON1ML79VR2N` | EXACT (EEA+RDW) | **PARTIAL** (antes "EXACT") | modelo GOLF | EEA Cn "GOLF" 140/140. El acabado "Advance" de Step 4c era inferencia de curación |
| 1 | VW Golf 2018 (WLTP) | `…*35` · `GAC4DACAX0` · `FM6FM6AJ015N7CPON1ML1BVR2NA` | EXACT | **PARTIAL** (antes "EXACT") | GOLF | EEA Cn "GOLF" 523/523 |
| 2 | BYD SEAL 2025 | `E13*2018/858*00639*03` · `SE2R1C` · `2NTE5F002NL1` | EXACT | **EXACT** | SEAL · Design | EEA "BYD SEAL" 1.399/1.399 + IDAE L10709/L10711 (código = Va/Ve). **Duplicado probable de DC-08** |
| 4 | BYD SEAL 2024/25 | `…*00` · `SE2D1C` · `1NXE5E001NL1` | EXACT | **EXACT** | SEAL · Excellence AWD | EEA "BYD SEAL" 556/556 + IDAE L10710/L10717; ⚠️ el mismo código Va/Ve aparece en filas IDAE de **BYD HAN** (L10696/L10697): se desambigua por la denominación EEA de la clave exacta |
| 5 | Kia Sportage 2022 | `E4*2018/858*00079*00` · `F5P11` · `M61A11` | EXACT | PARTIAL | SPORTAGE | EEA 2.119/2.119 |
| 6 | Renault Clio 2024/25 | `E2*2007/46*0676*28` · `BD2` · `AC6WA2SA500B` | EXACT | PARTIAL | CLIO | EEA 4.444 |
| 7 | Nissan Qashqai 2024/25 | `E9*2018/858*11042*10` · `A` · `A35` | EXACT | PARTIAL | QASHQAI | EEA 3.226 |
| 8 | Hyundai Tucson 2018/20 | `E11*2007/46*2724*05` · `F5D51` · `M66ZZ1` | EXACT | PARTIAL | TUCSON | EEA "TUCSON,IX35" |
| 9 | Kia Sportage 2016/18 | `E11*2007/46*3144*01` · `F5D51` · `M66ZZ1` | EXACT | PARTIAL | SPORTAGE | EEA 6.278 |
| 20 | Peugeot 3008 2018/20 | `E2*2007/46*0534*05` · `C` · `YHZJ-C2B000` | EXACT | PARTIAL | 3008 | EEA "3008" 99,95 %; "ALLURE" solo en 3 matriculaciones (no usado) |
| 22 | Peugeot 208 2022 | `E2*2007/46*0639*18` · `B` · `YHTK-J2B400` | EXACT (solo EEA; RDW otra extensión) | PARTIAL | 208 · 5P · BLUEHDI 100 · 6 VEL MAN · acabados {ACTIVE, ACTIVE PACK} | EEA 90,6 % / 9,4 % |
| 24 | Dacia Sandero 2025 | `E19*2007/46*0026*27` · `BEV` · `MT6WA45M520B` | EXACT | PARTIAL | SANDERO | EEA 3.090 |
| 26 | **Peugeot 308 2024** | `E2*2007/46*0628*30` · `B` · `YHZT-B21700` | EXACT | **EXACT (nueva)** | 308 · 5P · BLUEHDI 130 · EAT8 · **ALLURE** | EEA "308 5P ALLURE BLUEHDI 130 S&S EAT8" **536/536** (CC BY) |
| 27 | Toyota Yaris 2022/24 | `E6*2007/46*0437*04` · `MXPA11(H)` · `MXPA11L-BHFNBW(1E)` | EXACT | PARTIAL | YARIS | EEA 1.756 |
| 28 | Mercedes Clase A 2022/24 | `E1*2007/46*1829*16` · `X21CT2` · `HZAA151C` | EXACT | PARTIAL | "A 200 D" (clase + motor) | EEA 770 |
| 48 | Toyota Yaris HEV | `E6*2007/46*0437*04` · `MXPH11(H)` · `MXPH11L-CHXNBW(1E)` | EXACT | PARTIAL | YARIS | EEA 4.936 |
| 53 | Mercedes Clase A PHEV 2020 | `E1*2007/46*1829*12` · `X28QT2` · `HZAA052A` | EXACT | PARTIAL | "A 250 E" | EEA 697 |
| 56 | Toyota Corolla 2022 | `E6*2007/46*0318*05` · `ZWE211(H)` · `ZWE211L-DHXNBW(1F)` | EXACT | PARTIAL | COROLLA | EEA 1.865 |
| 57 | Peugeot 3008 PHEV 2022 | `E2*2007/46*0534*23` · `4` · `DGZU-C1J000` | EXACT | PARTIAL | 3008 · PLUG-IN HYBRID 225 · E-EAT8 · acabados {ACTIVE PACK, ALLURE, ALLURE PACK, GT, GT PACK} | EEA, 5 denominaciones (máx. 45 %) |
| 73 | Toyota RAV4 PHEV 2025 | `E6*2007/46*0429*05` · `AXAP54(N)` · `AXAP54L-ANXMBW(1F)` | EXACT | PARTIAL | RAV4 | EEA 3.586 |
| 81 | Tesla Model Y 2022 | `E4*2007/46*1293*26` · `Y6LR` · `BZB3S5T3` | EXACT | PARTIAL | MODEL Y | EEA 555 |
| 86 | Renault Clio HEV 2020 | `E2*2007/46*0676*05` · `BH2` · `MU4UA0FA5000` | EXACT | PARTIAL | CLIO | EEA 374 |

**Lote D2 (20)**: comercial EXACT antes **2** (BYD ×2) → después **3** (+ Peugeot 308 #26) · PARTIAL **17** · UNCONFIRMED **0** · CONFLICTED **0**. Fuera del lote, los Golf del catálogo pasan de EXACT a **PARTIAL** comercial: su acabado nunca tuvo evidencia oficial (la identidad técnica sigue EXACT).

Hallazgo de producto: **una versión técnica se vende con varios acabados** (Peugeot 3008 PHEV: 5; 208: 2). Una correspondencia 1:1 versión técnica ↔ acabado no existe en general: el acabado es una propiedad comercial que puede cubrir varias claves técnicas y viceversa.

## 4. Sobre los 100 candidatos

Evidencia automática (`summarizeCommercialEvidence`, nunca da EXACT por sí sola):

| Nivel | Candidatos | Lectura |
|---|---:|---|
| `CODE_VERSION_TEXT` (IDAE con código y texto de versión) | 2 | BYD SEAL (curados EXACT; uno con colisión de código con BYD HAN) |
| `DESIGNATION_UNIQUE_DETAILED` (una denominación EEA ≥ 95 % más rica que el modelo) | 8 | 1 con acabado (Peugeot 308 #26, curado EXACT); el resto son designaciones de motor/variante ("A 200 D", "A 180 D", "A 250 E", "SEAT LEON SP", "FORMENTOR E-HYBRID", "MEGANE E-TECH ELECTRIC" ×2) → PARTIAL |
| `DESIGNATION_MULTIPLE_DETAILED` | 7 | todos Peugeot (208, 3008): varios acabados por versión → PARTIAL |
| `MODEL_ONLY` | 83 | PARTIAL (modelo) |
| `NONE` | 0 | — |

**Comercial EXACT en los 100: 3** (antes, en D1, 4 contando los Golf; re-auditados como PARTIAL) · PARTIAL **97** · UNCONFIRMED **0**.

## 5. Alternativa: identidad técnica visible sin acabado (Fase A §7)

Evaluada, **no implementada**; propuesta en [ADR-019](../adr/ADR-019-technical-identity-without-confirmed-trim.md) (PROPOSED).

| Pregunta | Respuesta con datos |
|---|---|
| ¿Qué sabe el usuario? | Marca, modelo, año aproximado, a veces potencia (CV) y caja; el acabado lo conoce si compra nuevo o tiene el anuncio |
| ¿Qué depende del acabado? | equipamiento, llantas (→ CO₂/consumo dentro del rango de interpolación WLTP), a veces masa; **maletero** solo si cambia la carrocería o el suelo (p. ej. PHEV vs ICE) — no por acabado en general; garantía casi nunca |
| ¿Qué es invariante para una clave técnica exacta? | lo homologado: potencia, cilindrada, combustible, ciclo, masa en orden de marcha (rango), dimensiones (envolvente de la variante), plazas, puertas, norma Euro, consumo/CO₂/autonomía (rango WLTP) |
| ¿Cumple los criterios de calidad? | sí en lo técnico (mismos gates, mismas claves críticas); **no** cumple hoy el schema (`trim_name`, `generation_code`, `model_year` obligatorios) → requiere ADR |
| Riesgo en el selector | el usuario elige "Golf 1.5 TSI 96 kW 2018" y el selector debe decir "acabado no confirmado"; riesgo de que se lea como "Advance"; se mitiga mostrando la designación oficial literal y el conjunto de acabados cuando existe |
| ¿Qué se puede comparar con seguridad? | coste de uso (energía), eco/etiqueta, prestaciones homologadas, tamaño (con maletero de S08 cuando exista); **no** precio de catálogo ni equipamiento |
