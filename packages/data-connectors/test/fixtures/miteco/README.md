# MITECO sample responses (test fixtures)

Respuestas reales de `https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes` grabadas el 2026-09-24. Muestras pequeñas para tests (plan §33.3); el import productivo es nacional (~11.500 estaciones, ~12 MB) y no se guarda en Git.

| Fichero | Endpoint | Zona fiscal |
|---|---|---|
| `hist-2026-09-20-p42.json` | `EstacionesTerrestresHist/FiltroProvincia/20-09-2026/42` (Soria) | Península+Baleares |
| `hist-2026-09-20-p26.json` | `…/26` (La Rioja) | Península+Baleares |
| `hist-2026-09-20-p35.json` | `…/35` (Las Palmas) | Canarias |
| `hist-2026-09-20-p51.json` | `…/51` (Ceuta) | Ceuta |
| `hist-2026-09-20-p52.json` | `…/52` (Melilla) | Melilla |
| `ccaa.json`, `provincias.json` | `Listados/ComunidadesAutonomas`, `Listados/Provincias` | — |

**Atribución** (CC BY 4.0): Ministerio para la Transición Ecológica y el Reto Demográfico — Geoportal de gasolineras. Licencia: https://creativecommons.org/licenses/by/4.0/ · [ficha del dataset](https://catalogo.datosabiertos.miteco.gob.es/catalogo/es/dataset/214e0895-b3aa-4662-8ebe-18134c21fb45)
