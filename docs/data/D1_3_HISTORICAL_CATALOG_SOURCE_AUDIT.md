# VScar — D1.3 Auditoría de catálogos históricos (coches.net · km77 · JATO) y fuentes autorizadas

> Estado: **AUDITORÍA PASS · ADQUISICIÓN RESTRINGIDA NO REALIZADA · ENRIQUECIMIENTO PARTIAL** · 2026-10-16 · Lote: 20 candidatas D2 ([D1_2_D2_BATCH_READINESS_V0_1](D1_2_D2_BATCH_READINESS_V0_1.md)) · Datos: [`d13/`](d13/)
>
> Detalle: [coches.net](D1_3_COCHES_NET_COVERAGE.md) · [km77](D1_3_KM77_COVERAGE.md) · [JATO](D1_3_JATO_ACCESS_AND_LICENSING.md) · [matching](D1_3_COMMERCIAL_IDENTITY_MATCHING.md) · [decisión de adquisición](D1_3_DATA_ACQUISITION_DECISION.md) · [D2](D1_3_D2_READINESS.md)

## 1. Pregunta

¿Pueden los catálogos históricos resolver lo que D1.2 dejó abierto (`generation_code`, `model_year`, acabado, carrocería, caja de cambios, maletero, 0–100, batería, carga AC/DC, precio, garantía) **con derechos de uso** y **con una correspondencia demostrable con la clave técnica** (TAN completo + Va + Ve)?

## 2. Respuesta corta

| Fuente | ¿Tiene la información? | ¿Correspondencia con TAN/Va/Ve? | ¿Derecho de extracción / almacenamiento / reutilización comercial? | Acción D1.3 |
|---|---|---|---|---|
| **coches.net** (Adevinta Motor S.L.U.) | sí en fichas vistas: acabado, periodo, carrocería, motor, cambio, dimensiones, maletero, 0–100, garantía, equipamiento, precio por periodo; **sin** código de generación | **no**: ninguna ficha muestra TAN/Va/Ve | **no**: condiciones cl. 3 prohíben reproducir y reutilizar contenidos; Valoraciones 17.1 j prohíbe "extracción … mediante robots, scrapping, minería de datos"; los datos técnicos son "cedidos por JATO" (derechos de terceros) | Flujo B: solo referencias (URL + campos presentes), **sin valores** |
| **km77** (DRIVEK SOLUTION, S.L.) | sí: acabado, periodo comercial en el título, "Tarifa de {fecha}", dimensiones, maletero, 0–100, batería bruta/útil, carga AC/DC; **sin** código de generación (solo año en la URL) | **no** | **no**: aviso legal prohíbe "la reproducción, la distribución y la comunicación pública"; solo "uso personal y privado"; uso comercial "sin la autorización de km77" prohibido; robots.txt bloquea copiadores y `/comparador/` | Flujo B: solo referencias |
| **JATO Dynamics** | probable (specs, equipamiento, precios, WLTP, VIN; es el proveedor de coches.net) | posible vía *WLTP Link* / *Code Link* / *VINView* — **sin verificar** | solo por **contrato o acuerdo de prueba**; sin términos públicos de almacenamiento ni redistribución; "All Content © JATO Dynamics Limited. All rights reserved." | Flujo B: RFI/licencia **preparado, no enviado** |
| **Traficom S13** (Finlandia, nueva) | caja de cambios (código), carrocería UE, primera matriculación, nombre comercial FI | **sí, exacta**: fila con `tyyppihyvaksyntanro` + `variantti` + `versio` | **CC BY 4.0** (CKAN `license_id` cc-by-4.0); uso comercial permitido con atribución | **Flujo A: adquirido** (1 ZIP + 2 docs, SHA-256) |

## 3. Matriz de reutilización

| Fuente | Acceso | Extracción automatizada | Almacenar | Mostrar (PREVIEW interno) | Mostrar (PUBLIC) | Redistribuir | Derivar | Cobertura útil para D2 |
|---|---|---|---|---|---|---|---|---|
| EEA S01 | API pública | ✅ | ⚠️ atribución | ✅ | ⚠️ (❓ hasta revisión humana) | ⚠️ CC BY | ⚠️ | identidad técnica, energía |
| RDW S11 | API pública | ✅ | ✅ (Public Domain/CC0, pendiente aprobación) | ✅ | ❓ | ❓ | ❓ | dimensiones, masas, tracción, BEV 1 marcha |
| **Traficom S13** | ZIP público | ✅ (un ZIP trimestral) | ✅ CC BY (pendiente aprobación) | ✅ | ❓ | ✅ CC BY con atribución | ✅ | **caja de cambios** (8 ICE/PHEV), **carrocería** (AA/AB) |
| coches.net | web | ❌ prohibido | ❌ | ❌ | ❌ | ❌ | ❌ | 0 (solo cobertura informativa) |
| km77 | web | ❌ prohibido | ❌ | ❌ (solo uso personal) | ❌ | ❌ | ❌ | 0 (solo cobertura informativa) |
| JATO | contrato | según contrato | según contrato | según contrato | según contrato | improbable | según contrato | desconocida hasta RFI |

"Acceso técnico" ≠ "derecho": que una página cargue (o que robots.txt no la bloquee) no autoriza extraer, guardar ni reutilizar. Una sola extracción tampoco sustituye el derecho de reutilización.

## 4. Robots y técnica (comprobado, sin eludir nada)

| Sitio | robots.txt | Observación |
|---|---|---|
| coches.net | permite `/fichas_tecnicas/` salvo `versiones.aspx`, `/comparador/*` y rutas con `%20` | robots no da permiso legal: las condiciones lo prohíben igualmente |
| km77 | bloquea `/comparador/`, `/coches/mediciones-propias/` y bots copiadores (Wget, WebCopier…) | la descarga directa por `curl` falló (error 43); se leyó con un navegador estándar, una vez |
| JATO | `developer.jato.com` documenta OAuth2/JWT | sin credenciales: no se probó ningún endpoint |

## 5. Lo que se ha hecho y lo que no

- **Hecho**: lectura de términos y robots; 19 referencias (10 vehículos, 9 del lote D2) localizadas por buscador o vista manual de una página; clasificación de correspondencia; Traficom adquirido y agregado por las 100 claves exactas.
- **No hecho (deliberadamente)**: ningún scraper, ningún rastreo, ninguna descarga de fichas, ningún valor de catálogo guardado, ningún proxy/CAPTCHA/identidad falsa, ningún contrato aceptado ni formulario enviado.

## 6. Conclusión

La información existe en los catálogos, pero **la licencia no permite integrarla** y **ninguna ficha publica la homologación** → incluso con licencia, la correspondencia TAN↔acabado seguiría siendo COMPATIBLE, no CONFIRMED. Recomendación ADR-019: **C** (ver [D1_3_D2_READINESS](D1_3_D2_READINESS.md) §5).
