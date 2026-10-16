# VScar — D1.5 VehiclesDB (S18): taxonomía

> Estado: **auditado · solo nomenclatura · derechos ❓** · 2026-10-16

## 1. Versión, licencia y procedencia

| Aspecto | Valor |
|---|---|
| Release | **v2026.10.4** (2026-10-12), commit `d0e40c9`. Assets: `vehicles.json`, `vehicles.csv`, `manifest.json`, `ATTRIBUTION.md` (+ `LICENSE`, `README.md`, `SOURCES.md`, `SCHEMA.md`, `NAMING.md` del commit; SHA-256 en manifiestos) |
| Licencia | **CC BY 4.0** para el dataset ("Vehicle data by VehiclesDB" + enlace) **más** los avisos de cada registro de origen (`ATTRIBUTION.md`), que no se pueden renunciar. Código MIT |
| Procedencia | registros oficiales de 18 países. España: microdatos DGT MATRABA (Ley 37/2007); Países Bajos: RDW (CC0); Finlandia: Traficom (CC BY 4.0); UK DfT, US EPA, entre otros. Un modelo se publica cuando dos fuentes oficiales coinciden |
| Contenido real | **15.068** modelos, 934 marcas, 6 tipos; **5.541** turismos, **1.222** con disponibilidad `es`. La descripción del repositorio dice "19,282 models · 933 makes" y el README "2026.10.3"; los recuentos reales son los de la release descargada |

## 2. Uso en VScar (solo nomenclatura)

- Las 25 familias y las 20/100 candidatas tienen modelo en VehiclesDB, disponible en España (20/20, 100/100).
- **Mejoras de taxonomía (propuestas, no aplicadas)**:
  - nombre canónico en inglés frente al de VScar (ES): "Mercedes-Benz A-Class" ↔ "Clase A";
  - alias ("Clio Grandtour", "Qashqai+2", "Corolla Touring Sports", "RAV 4", "308 SW/CC", "Renault Sandero");
  - separación de nameplates hermanos (Sandero / Sandero Stepway, 208 / E-208, Leon de SEAT y de Cupra);
  - ids antiguos (`former_ids`).
- **No** aporta potencias, baterías, consumos ni prestaciones, y nunca sustituye la clave técnica EEA/RDW.

## 3. Derechos

Licencia reutilizable. Hay que mostrar el crédito de VehiclesDB y los avisos de origen (DGT, RDW…). Registrada ❓ hasta aprobación humana.
