# VScar — D1.3 Decisión de adquisición

> Estado: **Flujo A ejecutado (Traficom) · Flujo B sin adquisición** · 2026-10-16 · Build: `node packages/curation/scripts/d13-build.ts` (offline, determinista) · Salidas: [`d13/`](d13/)

## 1. Flujo A — fuentes autorizadas: descarga única → raw → checksum → parseo → procedencia → curado

| Recurso | Fichero (fuera de Git, `data/raw/traficom/`) | SHA-256 | Tamaño | Licencia |
|---|---|---|---|---|
| Ajoneuvorekisteri.zip (TieliikenneAvoinData_30_06_2026.csv) | `2026-07-30/Ajoneuvorekisteri.zip` | `81fdd696…5da0` | 208.492.096 B (CSV 961 MB, 5.296.749 filas) | CC BY 4.0 |
| Clasificaciones 24.03.2026 (xlsx) | `docs/Ajoneuvotiedot_avoin_data_luokitukset_24.03.2026.xlsx` | en manifiesto | — | CC BY 4.0 |
| Aineistokuvaus.pdf | `docs/Aineistokuvaus.pdf` | en manifiesto | — | CC BY 4.0 |

- Manifiestos: [`d13/acquisition-manifests.json`](d13/acquisition-manifests.json) (`sourceId S13`, `PENDING_REVIEW`, `redistributable: true`).
- Lectura en streaming del ZIP (lector propio sin dependencias), ISO-8859-1, `;`, **whitelist** de 18 columnas; nunca se leen `kunta`, `matkamittarilukema`, `valmistenumero2`, `jarnro`, `vari` (datos de vehículo individual). Error si cambia el schema.
- Agregación solo por las 100 claves exactas: **74 / 100** con vehículos FI (14.974 vehículos) → [`d13/traficom-aggregates.json`](d13/traficom-aggregates.json).
- Rendimiento: ~16–20 s, pico ~120 MB. Dos ejecuciones → salidas byte a byte idénticas.

Reglas de evidencia (testadas):

| Campo | Regla | Resultado en el lote D2 |
|---|---|---|
| caja de cambios | un único código ≥ 95 % de los vehículos de la clave **y** mapeable (1 → manual, 2 → automático); 3 "Stepless", 6 "Variable" y otros quedan sin mapear | **8** ICE/PHEV resueltas (+3 BEV por RDW) · #48 Yaris código 3 sin mapear · #73 RAV4 PHEV 3×1080 / 6×91 sin resolver · muestras pequeñas: #8 n = 4, #28 n = 1, #86 n = 2 (evidencia débil, revisar) |
| carrocería | código UE único ≥ 95 % y solo AA (sedán), AB (hatchback), AD, AE; AC/AF no separan familiar/SUV/monovolumen | **+2** (#48, #86 AB) además de los BYD SEAL (AA por RDW) |
| primera matriculación | rango de fechas FI | contexto; **nunca** año-modelo |

Derechos: S13 registrada en la matriz con ❓ (como S11): sin aprobación humana no es PUBLIC; PUBLIC gate sin cambios.

## 2. Flujo B — fuentes restringidas: solo manifiesto de referencias

coches.net, km77 y JATO: **no adquiridos**. Solo [`d13/catalog-references-v1.json`](d13/catalog-references-v1.json) (19 referencias, sin valores). Ningún dato de estas fuentes entra en `spec_values`, fixtures ni artefactos.

## 3. Alternativas si las licencias se deniegan (orden de prioridad)

1. **JATO** (C01): RFI → licencia con persistir + mostrar + derivar (cubre todos los campos; posible vínculo homologación).
2. **Autorización escrita de fabricantes** (S08) para fichas/tarifas de los modelos del lote (por marca; empieza por Peugeot/Stellantis, Toyota, Kia/Hyundai).
3. **km77**: autorización escrita para un uso acotado (tarifa y datos de las ~100 variantes).
4. **CoC / documentación de homologación** (S10) con derechos claros: maletero no, pero sí datos técnicos y caja.
5. **Precio de compra introducido por el usuario** para coches nuevos (igual que el usado en Step 8b): elimina el bloqueo de precio en PREVIEW **sin cambiar Economic Fit** (la entrada ya existe como `USER_PROVIDED`); propuesta para revisión, no implementada.
6. No válidos: BOE Orden HAC/1501/2025 (valor fiscal, no precio de lista); Open EV Data (MIT, congelado, sin identidad); precios de anuncios (no son precios históricos).
