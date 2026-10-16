# VScar — D1.5 OpenEV Data (S17) y Kilowatt Open EV Data (S19)

> Estado: **auditados · derechos ❓ · 0 valores reutilizables** · 2026-10-16 · Perfil: [`d15/source-profiles.json`](d15/source-profiles.json)

## 1. OpenEV Data — `open-ev-data/open-ev-data-dataset`

| Aspecto | Valor |
|---|---|
| Versión | release **v1.24.0** (2025-12-30), commit `8edb266`. Assets JSON/CSV/DB/SQL/XML; se descargaron JSON y CSV + `LICENCE`, `README.md`, `schema.json` (SHA-256 en [`d15/acquisition-manifests.json`](d15/acquisition-manifests.json)) |
| Licencia | **CDLA-Permissive-2.0** (texto leído): usar, modificar y compartir; al compartir datos hay que incluir el texto; sin restricción sobre resultados; sin garantía de titularidad. GitHub la muestra como `NOASSERTION` |
| Registros | 1.189 vehículos (65 marcas), 0 inválidos con el schema de VScar |
| Granularidad | marca → modelo → año → **acabado** (`trim`) → `variant` (carrocería o batería) = COMMERCIAL_TRIM |
| Fuentes por registro | `sources[]` (OEM, prensa, regulador). **255** registros solo con URL de dominio (p. ej. `https://www.audi.com`), con fecha de acceso fija |
| Mercado | 781 con algún mercado europeo; **18** con `ES`; **0** precios ES |

Campos poblados (de 1.189):

| Campo | Registros | Nota |
|---|---:|---|
| batería bruta | 1.185 | en **229** registros bruta = neta (dudoso) |
| batería neta | 1.189 | |
| AC | 1.189 | |
| DC | 1.144 | |
| autonomía WLTP | 739 | EPA, CLTC y NEDC se excluyen; nunca se convierten |
| 0–100 | 959 | |
| maletero | 319 | |
| garantía de batería | 162 | |
| consumo | 0 | |
| garantía general | 0 | |

**Calidad**: contradicciones con fuentes oficiales y con otros datasets.
- Kona Electric aparece con 36/58 kWh, frente a los paquetes de 48/65 kWh de Kilowatt y autoseeker.
- La autonomía WLTP discrepa de la EEA en 5 candidatas.

**Resultado**: solo BEV.
- 20 candidatas: #2 WEAK, #4 AMBIGUOUS (dos acabados AWD/RWD compatibles); #81 Model Y 2022 sin registros anteriores a 2024.
- 100 candidatas: 7 WEAK, 1 AMBIGUOUS, 92 NOT_FOUND.
- Ningún STRONG: RDW no aporta tracción para la mayoría de las claves de la expansión, y sin ella no se puede comprobar.

## 2. Kilowatt — `KilowattApp/open-ev-data`

| Aspecto | Valor |
|---|---|
| Estado | **archivado** (GitHub `archived: true`); último commit 2025-04-12; `meta.updated_at` 2025-04-12 |
| Formato | `data/ev-data.json` (v1, consolidado) ≡ `data/v2/*` (partido). Se usa v1 @ `32d7dc5` |
| Licencia | MIT con **requisito de atribución** visible («Open EV Data (https://github.com/KilowattApp/open-ev-data)») |
| Registros | 1.321 (todos con batería **útil**, AC y DC); 256 de 2024 o posteriores |
| Identificadores | UUID propio por variante; sin potencia, sin tracción (solo en el texto de la variante), **sin fuentes por registro** |
| Calidad | duplicados y valores imposibles (p. ej. Kona 39 kWh 2018 con DC = AC = 39,2) |

**Resultado**:
- 20 candidatas: 3 AMBIGUOUS (BYD SEAL ×2, Model Y), porque sin potencia ni tracción no se pueden separar las variantes.
- 100 candidatas: 2 WEAK, 17 AMBIGUOUS.

No se usa como fuente actual para 2026.

## 3. Campos compatibles registrados (sin importar valores)

| Campo VScar | OpenEV | Kilowatt |
|---|---|---|
| `bat.gross_kwh` | `pack_capacity_kwh_gross` | — |
| `bat.usable_kwh` | `pack_capacity_kwh_net` | `usable_battery_size` |
| `chg.ac_max_kw` | `charging.ac.max_power_kw` | `ac_charger.max_power` |
| `chg.dc_max_kw` | `charging.dc.max_power_kw` | `dc_charger.max_power` |
| `rng.electric_combined_km` (WLTP) | `range.rated[cycle=wltp]` | — |
| `perf.accel_0_100_s` | `performance.acceleration_0_100_kmh_s` | — |
| `cap.boot_l` | `capacity.cargo_l` | — |
| `war.battery_*` | `battery.warranty` (dependiente del mercado) | — |
