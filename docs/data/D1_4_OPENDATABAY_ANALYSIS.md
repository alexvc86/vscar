# VScar — D1.4 Opendatabay "Automotive Specifications Year Make Model Dataset" (S15)

> Estado: **BLOCKED (derechos) · solo muestra pública inspeccionada** · 2026-10-16 · Inventario: [`d14/opendatabay-inventory.json`](d14/opendatabay-inventory.json) · Matriz: S15 ❌

## 1. Declaraciones del portal vs verificación

| Declaración | Verificación |
|---|---|
| "70,000+ records" | **no verificable**: el CSV completo (`Car_Dataset_1945-2020.csv`) está en el bucket `opendatabay_private`; la descarga exige cuenta → no se creó cuenta ni se aceptaron términos |
| "78 columns" | ✅ en la muestra pública: 78 columnas |
| "24.87 MB" | coherente con Kaggle (24.866.141 B); el JSON-LD de la misma página dice `contentSize: 44283.34 bytes` (incoherente) |
| "1945 to 2020" | muestra: 1990–2020; **sin datos posteriores a 2020** → las candidatas 2021+ quedan fuera por definición |
| "CC0: Public Domain" | texto de la página. El **JSON-LD** de la misma página declara `license: …/general-ai-training-and-fine-tuning-data-license`, cuyo texto dice: "Commercial deployment, use in production API services, or any form of monetisation is NOT permitted" y "Resell, redistribute, or sublicense the Data Product" prohibido → **contradicción** |
| Proveedor | "Opendatabay Labs" (Opendatabay Ltd., Inglaterra y Gales, 15711573) |
| Procedencia original | no declarada. Es un re-listado de Kaggle *Car Specification Dataset 1945-2020* (Jahaidul Islam, 2023-02-25, "CC0", v1, sin URL de origen ni fuente) |

## 2. Muestra pública (100 filas, `sampleLink`)

- 78 columnas reales (con errata `Modle`): `id_trim, Make, Modle, Generation, Year_from, Year_to, Series, Trim, Body_type, …, max_trunk_capacity_l, minimum_trunk_capacity_l, …, acceleration_0_100_km/h_s, …, battery_capacity_KW_per_h, electric_range_km, charging_time_h`.
- Marcas en la muestra: **solo AC y Acura** → no se pudieron verificar registros de Volkswagen, Toyota, BMW ni BYD.
- Nulos (muestra): 39 % en casi todos los campos técnicos; maletero 46 %; 0–100 57 %; batería/carga/CO₂/seguridad/país 100 %.
- 7 filas duplicadas (mismos valores salvo `id_trim`).
- `Generation` = "1 generation" (ordinal, sin código ni fechas propias); `Series`/`Trim` = carrocería y motor-caja ("3.5 MT"), no acabados comerciales.
- 0–100: la columna se llama `acceleration_0_100_km/h_s`, pero la página la describe como "0 to 60 miles per hour"; los valores de la muestra están redondeados a segundos enteros → definición incierta; no se convertiría nunca 0–60 mph a 0–100 km/h.
- Autenticidad: los valores de la muestra son coherentes con vehículos reales (p. ej. AC Ace 1993–2000), pero la estructura (make → generation → series → trim, `id_trim`) corresponde a una base comercial de terceros no identificada → **no se trata como dato verificado**.

## 3. Cobertura europea y utilidad

Sin mercado ni homologación; corte en 2020; muestra sin las marcas del catálogo. No se puede hacer el matching de las 20 con S15 sin el fichero completo, y obtenerlo exigiría aceptar términos cuya licencia publicada prohíbe el uso comercial.

## 4. Decisión

**BLOCKED**: no se adquiere el CSV completo; S15 se registra ❌ en la matriz. Si se quisiera reconsiderar, haría falta confirmación escrita de Opendatabay de que aplica CC0 (y no la licencia de entrenamiento IA), más la procedencia original y la cobertura 2021+, que el dataset no tiene.
