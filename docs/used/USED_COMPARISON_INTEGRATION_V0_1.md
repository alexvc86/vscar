# VScar — Used Comparison Integration v0.1 (Step 8b)

> Estado: **PASS** · 2026-10-15 · UX: [USED_INPUT_UX_V0_1](USED_INPUT_UX_V0_1.md) · Motor: [USED_ADJUSTMENT_V0_1](USED_ADJUSTMENT_V0_1.md) · Decisión: [ADR-017](../adr/ADR-017-used-facts-in-url-and-participant-identity.md) · Metodología **2026.7 (sin cambios)**

```
URL (par + escenario + bloque usado u=1)
   ↓ servidor: parsePairConditions (Zod, determinista) → loadComparisonData (MySQL, derechos, calidad)
ComparisonData { vehicles[i]: { subjectId, condition, used, pipeline.usedInstance }, evaluationDate }
   ↓ el MISMO createDecisionPipeline en servidor (RSC + robustez), cliente (recálculo) y Web Worker (robustez)
Used Adjustment → Economics → Comparison → Decision → recommend(usedAdjustments)
   ↓ buildDecisionView: lados A/B por PARTICIPANTE, bloque `used` por lado, compra y coste conocido
```

Ni `UsedDecisionEngine`, ni `UsedComparisonEngine`, ni `UsedEconomicsEngine`, ni una segunda ruta de negocio.

## 1. Identidad de participantes

| Participante | `subjectId` | Sujeto del engine |
|---|---|---|
| Nuevo | id de la ReferenceVariant | `REFERENCE_VARIANT` |
| Usado | UUID determinista de (variant, hechos de la unidad) | `USED_INSTANCE` → apunta a una `referenceVariantId` |

- Golf NUEVO vs Golf USADO: dos participantes sobre una ReferenceVariant (mismo objeto de hechos técnicos).
- Dos usados idénticos de la misma variant: el lado B se desambigua (`salt`); nunca se fusionan.
- El id sigue a la unidad en un intercambio A/B. Servidor, cliente y worker lo comparten porque viaja en `ComparisonData`.
- Nombres de engine con la misma variant en los dos lados: "Volkswagen Golf A / B" (neutros respecto al idioma); la UI añade NUEVO/USADO.
- `new vs new` de la misma variant sigue siendo 404 (`SAME_VEHICLE`).

## 2. URL compartible (contrato `u=1`)

```
/es-es/compare/{a}-vs-{b}?{escenario}&u=1&{lado}={used}&{lado}_{hecho}=…&eval=YYYY-MM-DD
```

| Clave | Valor |
|---|---|
| `u` | versión del contrato (`1`); una versión desconocida ignora el bloque |
| `a`, `b` | `used` (ausente = nuevo) |
| `{lado}_price` | EUR enteros (precio pedido) |
| `{lado}_km` | km enteros (vacío ≠ 0) |
| `{lado}_reg` | `YYYY` o `YYYY-MM` (primera matriculación) |
| `{lado}_warranty` | meses declarados |
| `{lado}_service` | `full` \| `partial` \| `none` |
| `{lado}_state` | `ok` \| `issues` |
| `{lado}_soh` | % (el servidor lo ignora y lo avisa si el powertrain no tiene batería enchufable) |
| `{lado}_damage` | `none` \| `declared` |
| `eval` | fecha de evaluación (los hechos se declararon ese día): misma URL → misma edad y misma decisión cualquier día |

- **Determinista**: orden fijo; el escenario va primero y nunca se mezcla con el bloque usado (dos parsers, dos serializadores).
- **Validación Zod** con los mismos límites que el formulario. Lo inválido se descarta y se informa (aviso en la página); **nunca un 500**. Hechos de un lado que no es usado se ignoran.
- **Privacidad**: sin VIN, matrícula, personas, vendedor, URL de anuncio ni texto libre (test). Nada se guarda en MySQL ni en logs propios; sin analytics de campos.
- **Swap**: condición y hechos viajan con su vehículo (servidor para el enlace sin JS; cliente con `swapSearch`). La decisión resultante es la espejo (test).
- **Cambio de vehículo**: el lado recibe la condición y los hechos de la NUEVA unidad; el otro lado, el escenario y `eval` se conservan.
- **Cambio de escenario / idioma**: el bloque usado se conserva tal cual (`appendUsedSearch`; el selector de idioma ya conserva toda la query).

## 3. Canonical, noindex y OG (ADR-015 se mantiene)

- Canonical y hreflang: los del par base, **sin parámetros personales**.
- Vista con hechos de unidades usadas: **`noindex`** siempre (también en PUBLIC; `nofollow` en PREVIEW como antes) y **sin JSON-LD**.
- Misma variant en los dos lados: no existe comparación base → sin canonical, sin hreflang y sin `og:url`.
- Imagen OG: la de la comparación base (la ruta OG no recibe la query); nunca contiene hechos de la unidad.
- Sitemap y robots.txt: sin cambios. Los datos usados nunca hacen publicable una ReferenceVariant bloqueada (PUBLIC sigue en 0 coches).

## 4. Requisitos del usuario para usados

Parámetros del **escenario** (preferencias del usuario, no hechos de la unidad): `maxkm`, `maxage`, `minsoh`, `minwarranty`, `fullhistory=1` → `ComparisonScenario.requirements` (`maxMileageKm`, `maxAgeYears`, `minBatteryHealthPct`, `minWarrantyRemainingMonths`, `mustHaveFullServiceHistory`). Solo se evalúan en unidades usadas; conocido incumplido → FAIL; desconocido → UNCONFIRMED (nunca PASS).

### Historial completo (cierra el pendiente de 8a)

| Historial declarado | Requisito |
|---|---|
| Completo y documentado | PASS |
| Parcial | FAIL |
| No disponible (ausente confirmado) | FAIL |
| No lo sé | UNCONFIRMED (+ verificación, una sola vez) |

Requisito **categórico** en el mismo contrato de Deal Breakers: se codifica como bandera (`FLAG`) y sus mensajes llevan `flag: true`, así la UI lo presenta como sí/no y nunca como "al menos 1". Mensajes `comparison.requirement.service_history_full` / `service_history_not_full` / `used_unknown`.

## 5. Metodología

**Sin cambio de `methodologyVersion` (sigue 2026.7)**: no cambia ninguna regla ni configuración de `used-adjustment-v1`.
- El historial completo es un requisito declarado por el usuario y se evalúa con el contrato de requisitos existente (que no forma parte de la configuración metodológica).
- Mes/año de matriculación (`registration_month`): misma regla de edad ("rango honesto según la precisión declarada"; nunca se supone el día). Solo se estrecha el rango porque el dato es más preciso.
- Los golden new/new (snapshot completo de 8a) siguen idénticos.

## 6. Servidor y cliente

`computeDecision` usa `pipeline.usedAdjustments` del mismo pipeline (`recommend(input, { usedAdjustments })`), así servidor, cliente y worker producen la misma vista (test con `ComparisonData` serializado, también contra MySQL). La `key` de la página incluye el bloque usado: cambiar de unidad reinicia el estado cliente.

## 7. Rendimiento

Build de producción local, MySQL `vscar_dev`, canal PREVIEW (`scripts/perf-8b.ts`, 5 cargas por perfil; máquina compartida):

| Medida | Resultado | Presupuesto |
|---|---|---|
| JS inicial comparación | **155,8 KB** gzip (194,4 con polyfills); 7c: 154,0 | ≤ 200 KB |
| JS inicial home | 153,8 KB (192,4); 7c: 151,5 | ≤ 200 KB |
| Formulario usado | dentro del chunk diferido del selector (0 KB en el JS inicial) | diferido |
| SSR par base (cacheado) | p50 39 ms · p95 59 ms | — |
| SSR vista usada (cacheada) | p50 26 ms · p95 37 ms | — |
| SSR vista usada con hechos nuevos (sin caché: ajuste + decisión + robustez) | p50 190 ms · p95 253 ms | — |
| LCP | escritorio 164–1.236 ms (primera en frío) · móvil ×4 324–1.140 ms | ≤ 2,5 s |
| CLS | **0** | ≤ 0,1 |
| INP comparación (escenario + compartir) | p75 escritorio 72 ms · móvil ×4 128 ms; peor carga 104 / **296 ms** (una de cinco, móvil) | ≤ 200 ms |
| INP formulario usado (abrir, pasos, escribir, revisar, elegir) | p75 escritorio 48 ms · móvil ×4 128 ms; peor 72 / 136 ms | ≤ 200 ms |

Hallazgos:
- Una primera versión metía `@vscar/methodology` en el JS inicial (172,6 KB) porque `used-params` importaba la huella FNV: la identidad de la unidad se movió a `used-subject.ts`, que solo usa el servidor.
- Abrir el selector en móvil ×4 costaba 208–384 ms (render de la hoja, existente desde 7b.2; el formulario no era la causa). Ahora va en `startTransition`: 40–88 ms.
- El pico de 296 ms en la comparación móvil es el mismo patrón ya documentado en 7c (primera interacción mientras se cargan los chunks visuales diferidos), en 1 de 5 cargas. Vigilar en dispositivos reales.
- E2E: con un worker por núcleo, un único `next start` encolaba navegaciones y algunas superaban los 5 s de las aserciones. La configuración fija `workers: 2` (27/27 estable).

## 8. Tests

| Suite | Cubre |
|---|---|
| `apps/web/test/used-params.test.ts` (20) | ida y vuelta (propiedad), dos usados distintos, límites (precio, km, SOH, matriculación futura, fechas imposibles), hechos no aplicables, versión desconocida, sin claves personales, swap, cambio de vehículo, escenario e idioma, identidad, instancia sin inventar nada, requisitos, formulario |
| `apps/web/test/used-comparison.test.ts` (14) | misma variant nuevo/usado, los cuatro tipos, new/new idéntico a 7c, servidor = cliente serializado, swap espejo, SOH ignorado en ICE, historial completo, usados idénticos, PUBLIC sin cambios |
| `apps/web/test/catalog-mysql.test.ts` (+1) | nuevo vs usado de la misma variant contra MySQL |
| engines (+5) | `registration_month`, hecho de historial, requisito de historial completo (comparison + decision) |
| `apps/web/e2e/used.spec.ts` (8) | flujos A (nuevo vs usado), B (usado vs usado + escenario + requisitos), C (compartir en otro navegador), D (swap), E (idioma), F (móvil 390 px), cambio de unidad, URL malformada |
