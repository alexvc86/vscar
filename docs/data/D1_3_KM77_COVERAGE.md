# VScar — D1.3 km77: cobertura histórica y derechos

> Estado: **cobertura auditada por muestra · adquisición NO permitida · 0 valores guardados** · 2026-10-16 · Referencias: [`d13/catalog-references-v1.json`](d13/catalog-references-v1.json) · Matriz: km77 ya figura como `SECONDARY_REFERENCE` (§2.3), sin cambio

## 1. Titular y términos

| Aspecto | Evidencia |
|---|---|
| Titular | DRIVEK SOLUTION, S.L. |
| Aviso legal | "quedan expresamente prohibidas la reproducción, la distribución y la comunicación pública"; uso permitido solo "para su uso personal y privado"; uso comercial de los contenidos producidos por km77 prohibido "sin la autorización de km77" |
| robots.txt | bloquea `/comparador/`, `/coches/mediciones-propias/` y bots copiadores (Wget, WebCopier, …) |
| Proveedor de datos | no declarado (contenido propio de km77) |

**Adquisición: NO · Almacenamiento: NO · Reutilización comercial: NO** (requiere autorización escrita de km77).

## 2. Estructura

`/coches/{marca}/{modelo}/{año-generación}/{carroceria}/{acabado}/{slug}/datos` — el año de la URL agrupa una generación/restyling pero **no es un código de generación**; el título muestra el periodo comercial (p. ej. "2021-2023") y la ficha "Tarifa de {fecha}". Incluye batería bruta/útil y carga AC/DC en electrificados.

## 3. Cobertura (muestra)

| # | Candidata | Ficha | Método | Correspondencia |
|---|---|---|---|---|
| 2 | BYD SEAL 2025 | Seal Design RWD (2023-2026) | vista | COMPATIBLE (acabado Design = IDAE con código; RWD = RDW) |
| 5 | Kia Sportage 2022 | 1.6 T-GDi Drive 112 kW 4x2 | buscador | AMBIGUOUS |
| 8 | Hyundai Tucson | 1.7 CRDi **141 CV** 7DCT Tecno | buscador | **REJECTED** (≈104 kW vs 85 kW EEA) |
| 22 | Peugeot 208 2022 | 208 Active BlueHDi 100 (2019-2023) | buscador | COMPATIBLE |
| 26 | Peugeot 308 2024 | Allure BlueHDi 130 EAT8 (2025) · Allure Pack (2021-2023) | vista + buscador | AMBIGUOUS ×2 (dos fichas compatibles) |
| 28 | Mercedes Clase A | A 200 d (2022) | buscador | COMPATIBLE |
| 48 | Toyota Yaris HEV | Yaris 5p 120H Active Tech (2020-2023) | buscador | AMBIGUOUS |
| 57 | Peugeot 3008 PHEV | 3008 GT Hybrid 225 e-EAT8 (2020-2022) | buscador | COMPATIBLE |
| 81 | Tesla Model Y | Tracción integral Gran autonomía | vista | **REJECTED** (AWD vs RWD) |
| (3) | Golf 2018 | Golf 5p Advance 1.5 TSI Evo (2018-2019) | buscador | COMPATIBLE (no distingue *33 NEDC / *35 WLTP) |

- Fichas encontradas: **9 / 9** candidatas buscadas (mejor cobertura que coches.net, incluidas BYD SEAL y 308 actual).
- Fichas antiguas presentes en la muestra desde 2015 (Tucson); cobertura 2010–2026 de las 25 familias **no medida sistemáticamente** (sin rastreo).
- Generación: **0** códigos. Año-modelo: **0** (periodo comercial y fecha de tarifa, que no son año-modelo).
- Precio: "Tarifa de {fecha}" = precio de lista en una fecha (útil como `original_list_price` **solo** con derechos).

## 4. Valor para VScar

La fuente más completa de la muestra para campos de dato (maletero, 0–100, batería, AC/DC, tarifa), pero **no reutilizable**. Vía posible: solicitud de autorización escrita a km77 (no enviada; no se aceptan acuerdos automáticamente).
