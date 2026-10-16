# VScar — D1.3 coches.net: cobertura histórica y derechos

> Estado: **cobertura auditada por muestra · adquisición NO permitida · 0 valores guardados** · 2026-10-16 · Referencias: [`d13/catalog-references-v1.json`](d13/catalog-references-v1.json)

## 1. Titular y términos

| Aspecto | Evidencia |
|---|---|
| Titular | Adevinta Motor, S.L.U. |
| Condiciones de uso, cl. 3 | "el usuario no podrá reproducir, transformar…"; "queda terminantemente prohibido la utilización de los textos, imágenes, anuncios … para su posterior inclusión, total o parcial, en otros sitios web ajenos"; contenidos "de Adevinta Motor o de terceros" |
| Condiciones de Valoraciones, 17.1 j | prohíbe "la extracción de contenido mediante robots, scrapping, minería de datos" |
| Origen de los datos técnicos | las fichas indican **"Datos cedidos por JATO"** → derechos de un tercero; un permiso de coches.net no bastaría sin JATO |
| robots.txt | permite `/fichas_tecnicas/` salvo `versiones.aspx`, `/comparador/*` y rutas con `%20` (no es una licencia) |

**Adquisición: NO · Almacenamiento: NO · Reutilización comercial: NO.**

## 2. Estructura de las fichas

`/fichas_tecnicas/{marca}/{modelo}/{carroceria}/{N-puertas}/{version_slug}/{versionId}/[{periodId}/]` — el `periodId` (p. ej. `821175720210801`) codifica un periodo comercial con fecha. No hay campo de generación ni de homologación.

## 3. Cobertura (muestra: 9 candidatas D2 buscadas + Golf de referencia)

| # | Candidata | Ficha encontrada | Método | Correspondencia | Campos presentes |
|---|---|---|---|---|---|
| 5 | Kia Sportage 2022 | Sportage 1.6 T-GDi 150 CV Drive 4x2 (2022) | buscador | AMBIGUOUS (112 kW vs 110 kW EEA; varias MHEV/HEV) | marca/modelo, periodo, acabado, motor, potencia |
| 8 | Hyundai Tucson 2018/2020 | Tucson 1.7 CRDi 85 kW (115 CV) | buscador | COMPATIBLE | ídem |
| 22 | Peugeot 208 2022 | 208 BlueHDi 73 kW Active Pack (2021) | buscador | COMPATIBLE | ídem |
| 28 | Mercedes Clase A 2022/2024 | A 200 d **4MATIC** 150 CV | buscador | AMBIGUOUS (solo página AWD) | ídem |
| 48 | Toyota Yaris HEV | Yaris 1.5 120H Active Tech (2022) | vista | AMBIGUOUS (varios acabados) | + carrocería, cambio, consumo, dimensiones, **maletero, 0–100, batería, garantía, equipamiento** |
| 57 | Peugeot 3008 PHEV 2022 | 3008 Hybrid 225 e-EAT8 Allure Pack | buscador | COMPATIBLE | básicos |
| 81 | Tesla Model Y 2022 | Model Y Gran Autonomía 4WD | vista | **REJECTED** (AWD contradice RDW RWD) | completos |
| 2 | BYD SEAL 2025 | **no encontrada** | buscador | — | — |
| 26 | Peugeot 308 2024 (gen. actual 5p) | **no encontrada** | buscador | — | — |
| (3) | Golf 2018 (catálogo) | Golf Advance 1.5 TSI Evo 96 kW | vista | COMPATIBLE | + maletero, 0–100, precio |

- Fichas encontradas: **7 / 9** candidatas buscadas. Las 11 restantes no se buscaron (muestra acotada, sin rastreo).
- Periodo: las fichas cubren modelos desde ~2015 en la muestra (Tucson 1.7 CRDi); la cobertura 2010–2026 de las 25 familias **no se midió sistemáticamente** porque requeriría rastrear el sitio.
- Generación: **0** fichas con código de generación. Año-modelo: **0** (solo fecha de periodo comercial).
- Precio: precio de tarifa por periodo (no es precio de anuncio ni precio histórico de transacción).

## 4. Valor para VScar

Cobertura **informativa** alta para los campos de dato que faltan; cobertura **utilizable** 0. Vía posible: licencia de JATO (fuente original), no coches.net.
