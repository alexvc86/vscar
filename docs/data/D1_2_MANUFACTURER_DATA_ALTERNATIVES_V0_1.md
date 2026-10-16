# VScar — D1.2 Alternativas para los campos que faltan v0.1

> Estado: **investigado · ningún campo crítico desbloqueado** · 2026-10-16 · Fabricantes (S08), IDAE y Euro NCAP no se repiten: ver [SPAIN_DATA_RIGHTS_AUDIT_V0_1](SPAIN_DATA_RIGHTS_AUDIT_V0_1.md). Investigación web (sin adquisición masiva); citas a revisar antes de uso formal.

## 1. Campos que siguen faltando tras EEA + RDW

maletero · 0–100 km/h · precio de compra · garantía · carga AC/DC (BEV) · batería (bruta/útil) · consumo CS de PHEV (RDW: 1 de 10).

## 2. Fuentes evaluadas

| Fuente | Recurso | Cobertura | Campos que cubre | Claves de identidad | Histórico | Licencia | Uso comercial | Atribución | Adquisición | Evidencia |
|---|---|---|---|---|---|---|---|---|---|---|
| **Orden HAC/1501/2025** (BOE, precios medios para ITP/ISD/IEDMT 2026) | https://www.boe.es/eli/es/o/2025/12/17/hac1501 (HTML/XML/PDF, 2.219 págs.) | turismos del mercado español, todas las marcas | **precio de referencia fiscal** (no de catálogo); cc, cilindros, tipo de motor, kW, CVF, periodo comercial | marca + "Modelo-Tipo" (texto) — **sin TAN/Va/Ve** | órdenes anuales (anterior HAC/1484/2024) | disposición legal (LPI art. 13: sin propiedad intelectual) + [aviso legal BOE](https://www.boe.es/informacion/aviso_legal/index.php) | sí | "Fuente de los datos: Agencia Estatal Boletín Oficial del Estado" + enlace | descarga | preámbulo: «precios medios en el mercado» construidos con «aportaciones … de fabricantes y vendedores»; art. 3 aplica tablas de depreciación |
| **Traficom** (Finlandia, "Ajoneuvojen avoin data") | https://opendata.traficom.fi/Content/Ajoneuvorekisteri.zip | flota finlandesa (≈ 5,26 M filas) | ninguno de los que faltan; potencia, masa, dimensiones, CO₂ NEDC/WLTP, caja (`vaihteisto`), denominación FI | **TAN, variante, versión** | décadas, 4 actualizaciones/año | **CC BY 4.0** | sí | sí | ZIP | metadatos CKAN `license_id: cc-by-4.0` |
| **Open EV Data** (Chargeprice) | réplica https://github.com/OpenChargingCloud/open-ev-data (`data/ev-data.json`); el repositorio original devuelve 404 | BEV/PHEV UE ≈ 2019–2024 | AC kW, DC kW, curva de carga, batería **útil**, consumo medio | UUID + marca/modelo/variante (texto) — **sin TAN** | instantánea congelada (2024-09) | **MIT** | sí | aviso de copyright | descarga | `LICENSE`: "MIT License / Copyright (c) 2019 Niklas Hösl" |
| Statens vegvesen (Noruega) | API de consulta por matrícula | flota NO | no verificado | no verificado | — | API "lisens ikke oppgitt" | — | — | **BLOCKED** (e-ID noruego) | — |
| Wikidata | SPARQL | ≈ 13.700 modelos | batería en 27 elementos; **sin** maletero ni 0–100 | QID de modelo | comunitario | CC0 | sí | no | SPARQL | recuentos SPARQL |
| EAFO (Comisión Europea) | portal de modelos eléctricos | BEV UE | batería, carga rápida, precio aproximado | nombres | — | aviso general de la CE; la tabla no cita fuente (imágenes de ev-database.org → probable tercero comercial) | dudoso | — | solo HTML | — |

## 3. Conclusiones

1. **No existe** fuente abierta y oficial para maletero, 0–100, garantía, batería bruta ni consumo CS de PHEV (este último está en el CoC, que ningún registro abierto publica salvo RDW en algunos casos).
2. **Precio**: la Orden HAC es oficial y reutilizable, pero es un **valor fiscal medio**, no el precio de catálogo ni el de una unidad. Si se usara, sería una magnitud **distinta** y etiquetada ("valor fiscal de referencia"), con su propio enlace por marca + modelo-tipo (sin identidad técnica: enlace por texto → UNCONFIRMED). Recomendación: **no** sustituir el precio de compra; como mucho, referencia secundaria para usados, previa decisión.
3. **Precio de compra en la comparación**: VScar ya acepta precio introducido por el usuario (Step 8b, usados; `purchase_price_override` del plan). Propuesta (sin tocar Economic Fit): permitir que el usuario introduzca también el precio del **nuevo** cuando no haya precio oficial reutilizable, marcado `USER_PROVIDED`; Economy pasaría a disponible **para ese usuario**, nunca como dato del catálogo.
4. **Carga y batería BEV**: Open EV Data (MIT) es la única opción con licencia abierta; enlace solo por nombre (UNCONFIRMED) y datos congelados → útil como contraste/QA, no como fuente primaria (ADR-009 §4 secundarias).
5. **Traficom** es un buen candidato para corroborar identidad técnica y caja de cambios (CC BY, TAN/variante/versión); no aporta los campos críticos que faltan.

## 4. Campos dependientes del acabado (Fase B §10)

| Campo | ¿Invariante para la clave técnica exacta? | Base |
|---|---|---|
| Consumo/CO₂/autonomía homologados | rango WLTP de la versión (varía con llantas/equipamiento dentro del rango) | EEA distribución por matriculación; RDW límites |
| Masa en orden de marcha | rango por versión | EEA min–max; RDW |
| Dimensiones | **envolvente de la variante** (no de la versión) | glosario RDW |
| Batalla, plazas, puertas | sí (por versión/variante) | RDW |
| Maletero | no garantizado (cambia con carrocería, suelo, PHEV) | sin fuente |
| Equipamiento | no (depende del acabado) | — |
| Garantía | generalmente por marca/mercado, no por versión | S08 |
| Carga AC/DC | puede variar por opción de cargador a bordo | S08 / Open EV Data |

Ningún valor se comparte entre acabados o versiones sin evidencia de equivalencia.
