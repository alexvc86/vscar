# VScar — D1.5 autoseeker.eu `models.csv` (S16)

> Estado: **analizado · licencia CC BY 4.0 verificada en origen · derechos ❓ (pendiente de aprobación humana)** · 2026-10-16 · Perfil: [`d15/source-profiles.json`](d15/source-profiles.json)

## 1. Fichero y procedencia

| Aspecto | Valor |
|---|---|
| Ubicación entregada | `docs/models.csv` (usuario) → `.gitignore` + copia en `data/raw/autoseeker/user-supplied/` |
| SHA-256 | `1775cf13…ecdb1` — **idéntico** al descargado de `https://autoseeker.eu/data/models.csv` el 2026-10-16 |
| Codificación | UTF-8 sin BOM, `,`, LF |
| Registros / columnas | **281** · **20** (`slug, merk, model, generatie, status, bouwjaarVan, bouwjaarTot, fuels, carrosserie, zitplaatsen, deuren, vermogen_pk, wltp_range_km, batterij_kwh, laadvermogen_dc_kw, trekgewicht_geremd_kg, kofferbak_liter, verbruik_wltp_l_100km, verbruik_wltp_kwh_100km, co2_g_km`) |
| Página de datos (guardada como evidencia) | "released under Creative Commons Attribution 4.0 … credit "autoseeker.eu"" · "Figures are manufacturer specifications … The "indicative" label applies to every value" · "Last generated: 2026-07-18 … No versioning yet" · autor: Dennis de Kruijf |

## 2. Contenido real

| Campo | Filas con valor |
|---|---:|
| maletero | 266 |
| potencia (pk) | 279 |
| batería kWh | 166 |
| autonomía WLTP | 154 |
| carga DC | 128 |
| consumo WLTP kWh | 106 |
| consumo WLTP L | 76 |
| CO₂ | **0** |

- Carga DC: hay 131 celdas no vacías, pero 3 valen 0 y se tratan como ausentes; lo mismo para remolque = 0.
- 273 filas "orderable" y 8 "discontinued": es una **instantánea del mercado actual** (orientación NL/EU), con una fila por modelo/generación.
- La batería **no declara bruta/útil**, así que nunca se asigna a `battery_gross` ni a `battery_usable`.

## 3. Granularidad (obligatoria)

| Nivel | Filas | Regla |
|---|---:|---|
| MODEL | 57 | `fuels` con varios combustibles (p. ej. `benzine\|diesel\|phev`): una fila **no** son tres variantes; sus cifras describen una motorización no declarada |
| GENERATION | 142 | un combustible, sin motor en `generatie` |
| POWERTRAIN | 82 | motor o potencia en `generatie` ("1.5 TSI", "Design RWD", "e-Power") |
| TECHNICAL_VARIANT | 0 | sin homologación |

Al casar con una candidata, los valores solo se aplican si la fila es POWERTRAIN **y** su potencia (PS → kW) coincide con la `Ep` de la EEA (STRONG). En cualquier otro caso describen una configuración no confirmada y bajan a nivel MODEL. En híbridos, `vermogen_pk` es potencia de sistema y no se compara con la térmica de la EEA.

Normalización de idioma: `benzine`→gasolina, `hybride`→HEV, `Stationwagen/Stationwagon/shooting brake`→familiar, `Cabrio`→descapotable, mayúsculas/minúsculas unificadas.

## 4. Resultado

| | 20 | 100 |
|---|---:|---:|
| STRONG | 1 (#2 BYD SEAL Design RWD) | 2 |
| WEAK | 3 | 12 |
| AMBIGUOUS | 2 | 8 |
| REJECTED | 2 (#4, #81) | 10 |
| NOT_FOUND | 12 | 68 |

La mayoría de NOT_FOUND se debe a que solo existe la generación actual y la candidata es anterior.

## 5. Derechos

La licencia (CC BY 4.0, atribución "autoseeker.eu") es reutilizable, pero:
- las cifras son de fabricantes, sin tratamiento de derechos de origen, y "indicativas";
- no hay versionado: VScar fija su propia instantánea por SHA-256.

Registrada ❓ hasta revisión humana; ningún valor se promueve.
