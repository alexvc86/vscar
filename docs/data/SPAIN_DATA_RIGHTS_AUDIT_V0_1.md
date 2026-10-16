# VScar — Spain Data Rights Audit v0.1 (Step D1)

> Estado: **v0.1 · 2026-10-16 · evidencia recopilada; decisión legal PENDIENTE** · Matriz: [DATA_RIGHTS_MATRIX v0.2](DATA_RIGHTS_MATRIX.md) (estados **sin cambios**) · Decisiones: [ADR-009](../adr/ADR-009-data-provider-rights.md), [ADR-013](../adr/ADR-013-catalog-publication-and-routing.md) · Fuentes: [SPAIN_DATASET_SOURCES_V0_1](SPAIN_DATASET_SOURCES_V0_1.md)

> ⚠️ **No es una conclusión legal.** Recopila evidencia verificable (URL, fecha, cita) y propone una clasificación. Ningún estado de la DATA_RIGHTS_MATRIX ni de `SOURCE_RIGHTS` cambia en D1: eso exige revisor humano y, cuando proceda, asesoría legal. Revisor de esta recopilación: Claude (asistente), **pendiente de revisor humano**. Las citas se obtuvieron con un extractor web: deben comprobarse a mano antes de citarlas formalmente.

## 1. Escala

Evidencia jurídica y decisión de publicación se clasifican por separado:

| Clasificación de la evidencia | Significado |
|---|---|
| `VERIFIED_PUBLIC_USE` | licencia identificada que cubre el recurso exacto + aprobación humana/legal registrada. **Ninguna fuente lo alcanza hoy** |
| `CONDITIONAL` | licencia abierta identificada (p. ej. CC BY 4.0) que cubre el recurso; condiciones (atribución…) conocidas; falta confirmación humana |
| `PENDING_REVIEW` | no se han encontrado términos aplicables, o no se pudieron leer |
| `RESTRICTED` | términos que prohíben reproducción/uso comercial/extracción sin autorización escrita |
| `PROHIBITED` | uso excluido expresamente o fuente fuera de política (marketplaces, secundarias, comerciales no contratadas) |

Correspondencia con la matriz: `CONDITIONAL` ≈ ⚠️ · `PENDING_REVIEW` ≈ ❓ · `RESTRICTED` = ❓ con riesgo ❌ (no se marca ❌ sin decisión) · `PROHIBITED` ≈ ❌.

## 2. Recursos auditados

| Source | Organización | Recurso | URL oficial | Licencia / términos | Titular | Atribución | Uso comercial | Redistribución | Derivados | Derechos de BD | Acceso | Verificado | Evidencia | Clasificación | Decisión |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S01 | EEA (datos DG CLIMA) | Monitoring of CO2 emissions from passenger cars 2022 Final · 2023 Final (y tablas 2010–2025 de discodata) | [2022](https://sdi.eea.europa.eu/catalogue/srv/api/records/992616f8-158f-4ecc-b978-814b81629db6?language=eng) · [2023](https://sdi.eea.europa.eu/catalogue/srv/api/records/87fd2bce-6ad5-46d8-af41-f27cfd2e45a8?language=eng) | **CC BY 4.0** (en ambos registros) | "Copyright holder: Directorate-General for Climate Action (DG-CLIMA)" | obligatoria | permitido por la licencia | permitida con atribución | permitidos | CC BY 4.0 cubre el derecho *sui generis* | "No limitations to public access" | 2026-10-16 | literal en los metadatos | **CONDITIONAL** | sin cambio (⚠️) — pendiente revisor humano. Registros 2024 F / 2025 P **no leídos individualmente** → asumir la misma licencia es una hipótesis |
| S02 | IDAE | Histórico de base de datos (CSV) `idae-historico-202609.csv` | [coches.idae.es](https://coches.idae.es/guia-emisiones-consumos) | **ninguna licencia declarada** en coches.idae.es; aviso legal de [idae.es](https://www.idae.es/aviso-legal) | IDAE | no declarada | "Está absolutamente prohibido, el uso del sitio web o de alguno de sus elementos con fines comerciales" | "No se podrán realizar actos de reproducción, modificación, distribución o comunicación pública … sin el previo consentimiento por escrito del IDAE" | no declarado | no declarado | descarga pública sin registro | 2026-10-16 | "únicamente podrán realizar un uso privado y personal" | **RESTRICTED** | sin cambio (❓) — **conflicto normativo a revisar**: Ley 37/2007 (art. 4.1, 4.2, 5.1, 7.1) favorece la reutilización de documentos del sector público; el aviso legal es restrictivo y no menciona esa ley. No hay ficha en datos.gob.es (solo una [petición de 2020](https://datos.gob.es/es/peticiones-datos/base-de-datos-de-vehiculos-de-idae)) |
| S03 | MITECO | Geoportal gasolineras | ver matriz | CC BY 4.0 | MITECO | obligatoria | — | — | — | — | — | 2026-09-24 | matriz | CONDITIONAL | sin cambio (no afecta a identidad de vehículos) |
| S04 | REE / ESIOS | PVPC | ver matriz | aviso legal ree.es: no comercial | REE | — | ❌ riesgo | — | — | — | — | 2026-09-25 | matriz | RESTRICTED | sin cambio (no afecta a identidad de vehículos) |
| S05 | Euro NCAP | ratings y contenido web | [terms](https://www.euroncap.com/terms-conditions/) | copyright Euro NCAP | Euro NCAP | — | "Reproduction is not authorised for commercial purposes." | "Prior permission from Euro NCAP must be obtained for the reproduction or use of textual and multimedia information" | no declarado | no declarado | web pública | 2026-10-16 | literal | **RESTRICTED** | sin cambio (❓) — pedir autorización o usar solo hechos mínimos citados tras revisión legal |
| S07 | DGT | criterios del distintivo ambiental · sede electrónica | [criterios](https://www.dgt.es/nuestros-servicios/tu-vehiculo/tus-vehiculos/distintivo-ambiental/) · [propiedad intelectual sede](https://sede.dgt.gob.es/es/contenido/derechos-sobre-la-propiedad-intelectual/) | sede: "libre uso privado", sin alterar, citar la fuente; distintivo del pie con enlace CC BY 3.0 ES | Jefatura Central de Tráfico | "siempre debe ser citada como fuente el Organismo Autónomo Jefatura Central de Tráfico" | ambiguo (si se vende, avisar de que es gratuito) | sin manipular | — | — | web pública | 2026-10-16 | literal | **PENDING_REVIEW** | sin cambio (❓) — VScar usa la **regla**, no datos de la DGT; aviso legal de dgt.es no leído; fechas de diésel C (2014 vs 2015) incoherentes entre páginas DGT |
| S07-datos | DGT vía datos.gob.es | Microdatos de matriculaciones (mensual) | [ficha](https://datos.gob.es/es/catalogo/e00130502-microdatos-de-matriculaciones-de-vehiculos-mensual) · [aviso legal datos.gob.es](https://datos.gob.es/es/aviso-legal) | condiciones generales de reutilización | DGT | "Debe citarse la fuente" + fecha de actualización | "para fines comerciales y no comerciales" | permitida | sin desnaturalizar | — | descarga | 2026-10-16 | literal | **CONDITIONAL** (no usado en D1) | candidato para priorización por matriculaciones/usados (S09); no descargado en D1 |
| S08 | Volkswagen (VGED) | volkswagen.es | [condiciones de uso](https://www.volkswagen.es/es/volkswagen-espana/condiciones-uso.html) | términos del sitio | VGED | — | prohíbe uso "en otros sitios web privados o comerciales" | "no podrá modificar ni reproducir, ni en parte ni en su totalidad" | — | "Divulgar, extraer, reutilizar…" prohibido | web | 2026-10-16 | literal | **RESTRICTED** | sin cambio (❓) |
| S08 | SEAT | seat.es | [nota legal](https://www.seat.es/legal/nota-legal) | términos del sitio | SEAT, S.A.U. | — | prohíbe "hacer un uso comercial del Sitio Web" | "está autorizado, únicamente, a visualizar" | — | extracción/reutilización prohibida | web | 2026-10-16 | literal | **RESTRICTED** | sin cambio (❓) |
| S08 | CUPRA | cupra.com/es-es | [nota legal](https://www.cupra.com/es-es/nota-legal) | términos del sitio | SEAT, S.A.U. | — | prohibido en sitios comerciales | sin consentimiento escrito, no | — | extracción prohibida | web | 2026-10-16 | literal | **RESTRICTED** | sin cambio (❓) |
| S08 | Toyota España | toyota.es | [legal](https://www.toyota.es/legal) | términos del sitio | Toyota España S.L.U. | — | solo "uso personal y de carácter no comercial" | "No está permitido reproducir, modificar, transmitir o publicar" | — | no declarado | web; catálogos en HTML | 2026-10-16 | literal | **RESTRICTED** | sin cambio (❓) |
| S08 | Hyundai | hyundai.com/es | [aviso legal](https://www.hyundai.com/es/aviso-legal.html) | términos del sitio | Hyundai Motor España S.L.U. | — | "uso personal y no comercial" | no reproducir/distribuir/comercializar | — | no declarado | web | 2026-10-16 | literal | **RESTRICTED** | sin cambio (❓) |
| S08 | Kia | kia.com/es | [nota legal](https://www.kia.com/es/nota-legal/) | términos del sitio | KIA IBERIA S.L.U. | — | prohibida "cualquier otra clase de finalidad comercial" | "sin el permiso de KIA" | — | no declarado | web | 2026-10-16 | literal | **RESTRICTED** | sin cambio (❓) |
| S08 | Renault | renault.es | [información legal](https://www.renault.es/informacion-legal.html) | términos del sitio | Renault España Comercial S.A. | — | excluye "fines publicitarios y/o comerciales" | solo uso estrictamente personal | — | no declarado | web; catálogos PDF públicos | 2026-10-16 | literal | **RESTRICTED** | sin cambio (❓) |
| S08 | BYD | byd.com/es-es | [condiciones de uso](https://www.byd.com/es-es/condiciones-de-uso) | términos del sitio | BYD Europe B.V. | — | solo "uso personal, no comercial interno" | prohibido sin consentimiento escrito | — | no declarado | web | 2026-10-16 | literal | **RESTRICTED** | sin cambio (❓) |
| S08 | BMW | bmw.es | — (**BLOCKED**: tiempo agotado); [PressClub](https://www.press.bmwgroup.com/spain/info/legal): "solo puede utilizarse para fines de prensa" | — | BMW | — | — | — | — | — | bloqueado | 2026-10-16 | indirecta | **PENDING_REVIEW** | sin cambio (❓) |
| S08 | Tesla | tesla.com/es_es | — (**BLOCKED**: HTTP 403) | — | Tesla | — | — | — | — | — | bloqueado | 2026-10-16 | — | **PENDING_REVIEW** | sin cambio (❓) |
| S08 | Peugeot | peugeot.es | — (**BLOCKED**: HTTP 403) | — | (Stellantis España, sin verificar) | — | — | — | — | — | bloqueado | 2026-10-16 | — | **PENDING_REVIEW** | sin cambio (❓) |

| S11 | RDW (Países Bajos) | TGK Basis/Energiebron/Aandrijving/Carrosserie/Versnelling/As/Handelsbenaming/Intrekking (Step D1.1) | https://opendata.rdw.nl/ | "Public Domain" en los metadatos de cada recurso; **CC-0 1.0** por distribución en data.overheid.nl | RDW (Dienst Wegverkeer) | no exigida (CC0) | permitido | permitida | permitidos | CC0 renuncia también al *sui generis* | API sin token, cuota pública | 2026-10-16 | metadatos + catálogo nacional | evidencia de **VERIFIED_PUBLIC_USE** (CC0) · decisión **PENDING_REVIEW** (falta aprobación humana) | registrada ❓ en la matriz: marcarla ⚠️/✅ la haría PUBLIC sin aprobación humana. Matrículas (registro de vehículos): no se usan |
| S12 | Ministerio de Industria y Turismo | GIAVEH Consulta Fichas Reducidas (Step D1.1) | https://datos.gob.es/es/catalogo/e05231501-consulta-fichas-reducidas1 | [aviso legal de la sede](https://sede.serviciosmin.gob.es/es-ES/Paginas/aviso.aspx#Reutilizacion): condiciones generales art. 8 Ley 37/2007 | Ministerio | obligatoria (fuente + fecha) | no excluido | permitida sin alterar | sin desnaturalizar | — | CSV/API públicos | 2026-10-16 | literal | **CONDITIONAL** | registrada ❓; sin datos técnicos útiles; `Fabricante` puede ser persona física → no se trata |

No se intentó eludir ningún bloqueo (403, tiempos agotados, contenido cargado por JavaScript).

## 3. Lectura para VScar (propuesta, no decisión)

1. **EEA (S01)** es la única fuente con licencia abierta verificable para identidad técnica y CO₂/energía. Cumple el requisito de atribución en la web (pendiente de implementar en el pie de "Cómo lo calculamos").
2. **IDAE (S02)**: la descarga es pública, pero **descarga pública ≠ permiso de republicación**. Con el aviso legal actual, S02 solo debe usarse para **curación interna** (localizar versiones, contrastar), nunca como dato publicado. Por eso el JSONL en Git solo lleva referencias de fila. La compatibilidad con la Ley 37/2007 es una pregunta para asesoría legal; también se puede **pedir a IDAE** una licencia (p. ej. publicar el CSV en datos.gob.es).
3. **Fabricantes (S08)**: los 8 avisos legales leídos **prohíben reproducción, extracción y uso comercial sin autorización escrita**. Es exactamente el dato que falta (precio, dimensiones, maletero, plazas, 0–100, carga, garantía). Opciones para revisión legal:
   - (a) pedir autorización escrita a cada fabricante;
   - (b) valorar si los hechos técnicos aislados (cifras), citados con fuente y sin copiar la presentación ni la base de datos, quedan fuera de esos términos — **pregunta legal, no se asume**;
   - (c) CoC / fichas de homologación (S10);
   - (d) proveedor comercial (C01/C03) ante bloqueo crítico (ADR-009 §2).
4. **Euro NCAP (S05)**: restrictivo para reproducción comercial; pedir permiso.
5. **DGT (S07)**: VScar calcula la etiqueta con su regla (methodology); citar la DGT como fuente de los criterios.

## 4. Decisiones legales pendientes (explícitas)

| # | Pregunta | Fuente | Bloquea |
|---|---|---|---|
| L1 | ¿Confirmar S01 de ⚠️ a ✅ con atribución CC BY 4.0 (registros 2010–2025)? | S01 | nada en PREVIEW; PUBLIC de datos EEA |
| L2 | ¿Puede VScar reutilizar el CSV de IDAE (Ley 37/2007 vs aviso legal)? ¿Pedir licencia a IDAE? | S02 | uso público de cualquier valor IDAE |
| L3 | Por fabricante: ¿autorización escrita, o la reutilización de hechos técnicos citados es admisible? | S08 (11) | precio, dimensiones, maletero, plazas, prestaciones, carga, garantía en PUBLIC |
| L4 | Términos de bmw.es, tesla.com, peugeot.es (no accesibles de forma automatizada) | S08 | ídem |
| L5 | Euro NCAP: permiso para mostrar estrellas/año/protocolo | S05 | Seguridad en PUBLIC |
| L6 | DGT: términos de dgt.es y licencia del distintivo (CC BY 3.0 ES del pie de la sede) | S07 | etiqueta citando DGT |
| L7 | Microdatos de matriculaciones DGT (datos.gob.es) para priorización por volumen de usados | S07-datos/S09 | priorización (no publicación) |
| L8 | RDW (S11): ¿aprobar CC0 (⚠️/✅) para los conjuntos TGK? Con aprobación, dimensiones, plazas, masas, norma Euro y tracción de 95 candidatos serían publicables con identidad EXACT | S11 | PUBLIC de datos técnicos RDW |
| L9 | GIAVEH (S12): confirmar condiciones art. 8 (solo se usaría como contraste de TAN) | S12 | nada en producto |

**PUBLIC gate sin cambios**: con estas evidencias, ningún candidato D1 es elegible para PUBLIC.
