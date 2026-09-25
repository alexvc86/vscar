# Identity completion brief (Step 4c) — for curation agents

Goal: for a Dataset Core variant, determine its homologation identifiers `type_approval_number` (TAN), `variant_code` (Va), `version_code` (Ve), `manufacturer_type_code`, and an `identification_confidence` of EXACT / PARTIAL / UNCONFIRMED, **with evidence**.

## Rules (mandatory)
- EXACT = TAN + Va + Ve exact, AND an official source links the commercial variant (make/model/trim/engine) to that identifier (e.g. IDAE detail "código de tipo/versión", CoC, homologation document, manufacturer technical sheet listing TAN/type/variant/version), OR the curated values of the DC were taken from that exact EEA record (documented in the DC file).
- PARTIAL = TAN + Va established with evidence but Ve not verifiable; or TAN matching but version not verifiable.
- UNCONFIRMED = only commercial name / year / engine / power / trim / generation matching. Selecting EEA rows because their values (power, CO2, consumption) look like the car is UNCONFIRMED. Never infer Ve by commercial similarity.
- Never merge different homologations because values are equal (same kW, CO2, range ≠ same technical variant).
- Secondary sites (km77, ultimatespecs, ev-database, forums) may help locate official documents but are NOT evidence.
- Only record what you actually saw in fetched pages / query results in this session.

## EEA discodata (official, CC BY 4.0)
Endpoint: `https://discodata.eea.europa.eu/sql?query=<urlencoded SQL>&p=1&nrOfHits=500` (GET, JSON `{results:[...]}`).
Tables by year (verified 2026-09-24):
- 2010–2021: `[CO2Emission].[latest].[co2cars]` — contains BOTH Status 'F' and 'P' rows: always filter `Status='F'`.
- 2022: `[CO2Emission].[latest].[co2cars_2022Fv26]` (final)
- 2023: `[CO2Emission].[latest].[co2cars_2023Fv28]` (final)
- 2024: `[CO2Emission].[latest].[co2cars_2024Fv30]` (final)
- 2025: `[CO2Emission].[latest].[co2cars_2025Pv31]` (provisional only)
Fields (official names): MS, TAN, T, Va, Ve, Mk, Cn, Ft, Fm (E=electric, P=plug-in, H=hybrid, M=mono-fuel), `[Ec (cm3)]`, `[Ep (KW)]` (engine power), `[M (kg)]` (mass in running order), Mt (WLTP test mass), `[Enedc (g/km)]`, `[Ewltp (g/km)]`, `[Z (Wh/km)]` (electric energy consumption), Zr (electric range), Fc (fuel consumption), `[W (mm)]`, R (registrations), Dr (registration date), Year, Status.
Use server-side aggregation, e.g.:
`SELECT TAN, Va, Ve, Cn, Ft, Fm, [Ec (cm3)], [Ep (KW)], [M (kg)], Mt, [Ewltp (g/km)], [Z (Wh/km)], Zr, SUM(R) AS R, MIN(Dr) AS Dr_min, MAX(Dr) AS Dr_max FROM <table> WHERE MS='ES' AND Mk='TOYOTA' AND Cn LIKE 'RAV4%' AND Status='F' GROUP BY TAN, Va, Ve, Cn, Ft, Fm, [Ec (cm3)], [Ep (KW)], [M (kg)], Mt, [Ewltp (g/km)], [Z (Wh/km)], Zr ORDER BY TAN, Va, Ve`
(`INFORMATION_SCHEMA` is blocked. Keep queries narrow; TAN casing varies: compare case-insensitively but report as seen.)

IDAE: `https://coches.idae.es/base-datos/marca-y-modelo` — vehicle detail pages may show "Código de tipo/versión" or similar (seen for BYD SEAL: `SE2R1C/2NTE5F002NL1`, detail id 606454). Check whether the IDAE code corresponds to EEA Va/Ve for the same car; that correspondence is the kind of official link that allows EXACT.

## Output (per DC)
Write `C:\wamp64\www\vscar\docs\data\dataset-core-v0.1\identity\DC-NN.identity.json`:
```json
{
  "dc": "DC-NN",
  "commercial_variant": "…",
  "market": "ES",
  "eea_year": 2021,
  "eea_table": "…",
  "candidates": [
    { "TAN": "…", "Va": "…", "Ve": "…", "registrations": 0, "values": { "Ep": 0, "M": 0, "Ewltp": 0, "Z": 0, "Zr": 0 }, "dr_min": "…", "dr_max": "…" }
  ],
  "decision": {
    "type_approval_number": "… or null",
    "variant_code": "… or null",
    "version_code": "… or null",
    "manufacturer_type_code": "… or null",
    "identification_confidence": "EXACT|PARTIAL|UNCONFIRMED",
    "evidence": [ { "source": "…", "url": "…", "what_it_shows": "…" } ]
  },
  "separate_technical_variants": [ "notes on versions that must NOT be merged (e.g. manual vs DSG, different Va)" ],
  "missing_for_upgrade": "what document/field would raise the confidence one level",
  "notes": "…"
}
```
Keep `candidates` to the rows relevant to the commercial variant (max ~15). Return a ≤10-line summary.
