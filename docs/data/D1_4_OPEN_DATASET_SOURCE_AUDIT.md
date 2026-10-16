# VScar — D1.4 Auditoría de datasets automotrices abiertos

> Estado: **AUDITORÍA PASS · ENRIQUECIMIENTO PARTIAL (0 valores reutilizables)** · 2026-10-16 · Artefactos: [`d14/`](d14/) · Build: `node packages/curation/scripts/d14-build.ts` (offline, determinista) · Adquisición: `node packages/curation/scripts/d14-acquire.ts` (red, idempotente, SHA-256 fijados)
>
> Detalle: [gor3a](D1_4_GOR3A_DATASET_ANALYSIS.md) · [Opendatabay](D1_4_OPENDATABAY_ANALYSIS.md) · [matching de las 20](D1_4_TWENTY_VARIANT_MATCHING.md) · [derechos y ODbL](D1_4_RIGHTS_AND_ODBL_ASSESSMENT.md) · [100 candidatas](D1_4_100_VARIANT_COVERAGE.md) · [D2](D1_4_D2_READINESS.md)

## 1. Pregunta

¿Pueden los datasets abiertos completar **generación, motorización, carrocería, maletero y 0–100** de las 20 candidatas D2, con archivos reales, identidad trazable y derechos utilizables?

## 2. Respuesta corta

| Fuente | Acceso | Registros reales | Generación | Maletero / 0–100 | Vínculo con TAN/Va/Ve | Derechos | Uso en D1.4 |
|---|---|---|---|---|---|---|---|
| **S14 gor3a/vehicle-makes-models** v1.0.2 | ✅ assets de release (SHA-256) | 164 marcas · 2.649 modelos · 7.217 "generaciones" · 30.535 motores (paridad JSON = CSV = SQLite) | nombres "modelo + carrocería + año de inicio" (sin Mk/código, 0 "facelift") | 89 % / 83 % de los motores | **no** (nivel 2 como máximo) | ODbL 1.0 declarada; origen autoevolution.com **sin licencia acreditada** | investigación aislada (`data/research/`) |
| **S15 Opendatabay** "Automotive Specifications" | ⚠️ solo muestra pública (100 filas); CSV completo tras cuenta → **no descargado** | 100 (muestra: solo AC y Acura) | campo `Generation` ("1 generation") | columnas `max/minimum_trunk_capacity_l`, `acceleration_0_100_km/h_s` | no | página "CC0" ≠ licencia enlazada (no comercial); procedencia no declarada | solo inventario de schema |
| Kaggle (original de S15) | requiere cuenta | 24.866.141 B (metadatos API) | — | — | — | "CC0" sin procedencia | no descargado |
| filippos/CarDatabase | — | — | — | — | — | — | **NOT FOUND** (sin repositorio verificable) |
| NHTSA vPIC | API pública | — | — | — | VIN/US, no TAN UE | dominio público US | fuera de alcance ES (futuro mercado US) |

## 3. Resultado en las 20 (detalle en [D1_4_TWENTY_VARIANT_MATCHING](D1_4_TWENTY_VARIANT_MATCHING.md))

| Estado (S14) | N |
|---|---:|
| EXACT_DOCUMENTED_LINK | **0** (imposible: el dataset no publica homologación) |
| STRONG_COMPATIBLE_MATCH | 3 (#7, #48, #73) |
| WEAK_COMPATIBLE_MATCH | 7 |
| AMBIGUOUS | 2 |
| REJECTED | 1 (#28) |
| NOT_FOUND | 7 (BYD SEAL ×2 sin modelo; 5 con generación pero sin el motor) |

Valores **encontrados** ≠ **identidad verificada** ≠ **reutilizables**: maletero encontrado en 9/20 y 0–100 en 7/20, pero 0 verificados para la homologación y 0 reutilizables (derechos).

## 4. Fuentes secundarias

- **Kaggle**: el recurso de Opendatabay es un re-listado de *Car Specification Dataset 1945-2020* (Jahaidul Islam, 2023-02-25, "CC0: Public Domain", 24.866.141 B, sin procedencia declarada; metadatos leídos de la API pública de Kaggle). La descarga exige cuenta y aceptación de términos → no se hizo.
- **filippos/CarDatabase**: búsquedas sin resultado verificable (ni repositorio, ni renombrado, ni sucesor). **NOT FOUND**, investigación cerrada.
- **NHTSA vPIC**: decodificación VIN y fabricante/modelo para el mercado US; identidad incompatible con TAN UE. Se conserva para el futuro mercado US; no se integra en ES. No se introduce SQL Server ni PostgreSQL.

## 5. Lo que no se ha hecho (deliberadamente)

Ningún script del repositorio de terceros ejecutado; ninguna cuenta creada ni licencia aceptada; ningún bloqueo eludido (autoevolution devolvió 403 a la lectura directa de sus términos y se dejó así); ningún valor de S14/S15 en `docs/`, fixtures, `spec_values` ni MySQL; ADR-019 no implementado; motores, Methodology 2026.7 y gate PUBLIC sin cambios.
