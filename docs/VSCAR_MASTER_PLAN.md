# VScar — Documento Maestro de Planificación v1.0

> **Estado: APPROVED — PROJECT BASELINE** · Fecha baseline: **2026-09-24**

> **Cambios v1.0 — cierre y baseline** (sin nuevas funcionalidades ni cambios de scope o filosofía): estado APPROVED · **principio de baseline** y control de scope vía ADR · infraestructura Alpha sobre el **VPS existente** (Windows Server 2022 + IIS reverse proxy + NSSM + **MySQL existente** `vscar_db`) · Drizzle sobre MySQL · búsqueda con índices MySQL · jobs con **Windows Task Scheduler + tabla `jobs` MySQL** (pg-boss eliminado) · Memurai no utilizado en Alpha · estructura `C:\vscar\` y storage strategy (MySQL normalizado + raw en filesystem) · **backups P0** (R2/B2) · logs con rotación · presupuesto RAM ≤ 1,5 GB · cálculos en navegador · coste incremental Alpha **~1–10 €/mes** · **VScar Dataset como activo estratégico** · **Dataset Core v0.1 (10 reference variants)** antes de escalar · data workstream desde la semana 1 · calendario **target 12 semanas, planning range 12–16** · **Used Information Confidence** separada de **Used Ownership Signals** · backlog inicial de ADRs · Baseline Approval Summary.

> **Nota de gobierno**: A partir de v1.0, las decisiones arquitectónicas o técnicas que evolucionen durante el desarrollo deberán documentarse mediante ADRs (`docs/adr/`) sin reescribir retrospectivamente la baseline, salvo cambios estratégicos mayores validados por producto.

> **Cambios v0.4 — New + Used, same decision engine**: alcance ampliado a **coches nuevos, seminuevos y usados** en una única plataforma (sin "VScar New" / "VScar Used") · catálogo Alpha por **familias de modelos populares** (15–25 familias, ~50–80 **reference variants** 2010+) según **Popularity × Used-Market Volume × Comparison Demand** · separación **Reference Vehicle** vs **Used Vehicle Instance** · **Used Vehicle Adjustment Layer** y **Used Vehicle Risk Profile** (riesgo de información, no score absoluto) · generaciones, **facelifts**, `registration_year` · ciclos **NEDC/WLTP/EPA** con "NOT DIRECTLY COMPARABLE" · seguridad con **protocol_version/test_year** · precios `original_list_price` / `current_new_price` / `used_asking_price` / `estimated_market_value` · `purchase_price_override` en Economic Fit · depreciación desde el valor actual · schema de **maintenance milestones** · Break-even **New vs Used** · caso de uso **Older Premium vs Newer Mainstream** · Deal Breakers y Why not para usados · Completeness **Reference vs Used Instance** · Confidence con información de la unidad · preset **Used Car Buyer** · DATA_RIGHTS_MATRIX con **cobertura histórica** · SEO de generaciones · nuevos tests, eventos y métricas · marketplaces, valoración automática, VIN e informes de historial **fuera de Alpha**.

> **Cambios v0.3**: tabla de metadatos alineada con Alpha (Range, EV/PHEV, Break-even, What If = P0 Alpha) · **Running Cost / Month** vs **Estimated Ownership Cost / Month** · **Deal Breakers** y **Practical Fit con estado** (PASS / PASS WITH COMPROMISES / FAIL) · **Why not this car?** · **Meaningful For You** · Confidence en HIGH/MEDIUM/LOW con número secundario · **claves críticas** en Data Completeness · **Technical Capability** (filosofía publicada) · **Economic Fit con horizonte** · **Sensitivity Analysis** + **Result Robustness** en la confianza · **Scenario Presets** · **Segment baseline** · **VScar ID** (UUID + canonical key) · `engineVersion` + `methodologyVersion` + `dataSnapshotVersion` · paquete **`@vscar/methodology`** · tests de **invariantes** (fast-check) y **simetría**.

> **Cambios v0.2** (revisión del equipo): fase **VScar Alpha** previa al MVP · ES público primero, US como dataset de test · **Practical Fit vs Preference Fit** · **Recommendation Confidence** visible · **Data Completeness Score** único · **funciones de utilidad** en lugar de min–max · **Meaningful Difference** por SpecKey · TCO **Known vs Estimated** · **coste real mensual** y **coste por 1.000 km** · Tournament como **Engagement Engine** (stated vs observed) · URLs **`/{lang}-{market}/`** · métricas **PCCR, Decision Confidence Delta, Decision Change Rate** · **Data Acquisition Strategy** como workstream independiente.

> Fecha baseline: 2026-09-24 (borradores v0.2–v0.4: 2026-09-23) · Estado: **APPROVED — PROJECT BASELINE** · Repositorio: `C:\wamp64\www\vscar`
>
> **Supuestos de trabajo** (ajustables): equipo inicial de 2–3 ingenieros full-stack, 1 diseñador de producto/motion (parcial), 1 curador de datos (parcial). Esfuerzos expresados en **semanas-persona (sp)**. Costes en EUR/mes, orden de magnitud.

---

## Principio de baseline

**La v1.0 congela alcance y arquitectura conceptual del Alpha.** Las nuevas ideas no entran automáticamente en Alpha. Para añadir una funcionalidad P0/P1 es necesario:
- **sustituir** otra funcionalidad de igual o mayor esfuerzo;
- **justificar** su impacto (usuario, negocio, calendario, datos);
- **registrar** la decisión mediante ADR en `docs/adr/`;
- **actualizar el backlog** (no necesariamente este Master Plan).

Objetivo: evitar scope creep. Las cifras de este documento (familias, variants, semanas) son objetivos de planificación; la calidad de datos prima sobre la cantidad.

---

## Context

VScar nace como producto greenfield: no existe código. El objetivo de este documento es fijar **qué construir, en qué orden y qué no construir todavía**, para que el desarrollo arranque sobre una base fiable: *Validate → Reliable data → Decision intelligence → Spectacular visualization → International scale*. Al aprobarse, este documento se guardará en el repo como `docs/VSCAR_MASTER_PLAN.md` y se iniciará la Fase 0/1 (ver "Siguiente paso tras aprobación" al final).

**Leyenda de metadatos**
- Prioridad: **P0** imprescindible MVP · **P1** MVP si cabe · **P2** post-MVP · **P3** largo plazo
- Complejidad: S / M / L / XL
- Valor (Negocio / SEO / Usuario): ●○○ bajo · ●●○ medio · ●●● alto

---

## 1. Executive Summary

VScar es **una plataforma de decisión para elegir el coche adecuado — nuevo o usado**, no un listado de fichas técnicas ni un marketplace. Responde: *"¿Qué coche tiene más sentido comprar para mí, independientemente de si es nuevo, seminuevo o usado — en mi país, con mi presupuesto y mi uso real?"*. Principio: **new + used, same decision engine** — los mismos engines de comparación, decisión, economía y preferencias sirven para ambos; los usados añaden una capa de contexto (edad, kilometraje, historial, garantía restante, salud de batería). Se diferencia por salidas separadas —**Technical Capability, Economic Fit (con horizonte), Best For You** (= Practical Fit objetivo + Preference Fit subjetivo, tras filtrar Deal Breakers)— cada una con *WHAT / WHY / HOW MUCH / FOR WHOM* y un desplegable *"How we calculated this"*.

El lanzamiento se divide en dos escalones:

- **VScar Alpha** (**target 12 semanas; planning range 12–16**): **solo España** (datos reales), UI es/en, **15–25 familias de modelos populares con ~50–80 reference variants desde ~2010**, comparaciones **new/new, used/used y new/used** con precio y kilometraje introducidos manualmente, coste energía (fuel/EV/PHEV), Range, Break-even (incl. New vs Used), What If, Deal Breakers, Practical Fit, Used Vehicle Adjustment básico, Confidence y Completeness visibles, Share, primeras páginas SEO. Objetivo único: **comprobar que la gente usa los cálculos personalizados para decidir — también entre nuevo y usado.**
- **VScar MVP** (tras validar Alpha): activación pública de EE. UU., catálogo ampliado, TCO completo (Known + Estimated), Tournament, cuenta/garage, explicaciones IA, capa 3D selectiva.

Alpha se despliega sobre la **infraestructura ya existente** (VPS Windows Server 2022 + IIS + NSSM + MySQL), con un coste incremental de **~1–10 €/mes**. Principio: *use the infrastructure we already own until scale proves otherwise.*

La arquitectura es global desde el día 1 (ES + US modelados; dataset de test US de 10 variantes que valida MPG/millas/EPA/USD/hp/lb-ft), pero **la carga editorial de datos arranca con un solo mercado**.

La ventaja defendible no es la animación: es **datos con procedencia + cálculos personalizados + explicabilidad + confianza medida**. Una única infraestructura de calidad (**Data Completeness Score**) gobierna ficha, comparación, confianza de la recomendación y elegibilidad SEO. La adquisición de datos (derechos de uso incluidos) es un **workstream independiente** que se resuelve antes de invertir fuerte en frontend.

## 2. Product Vision

Referencia mundial para decidir qué coche comprar — **nuevo, seminuevo o usado** — combinando: datos objetivos · coste real · necesidades del usuario · mercado local · estado de la unidad concreta (si es usada) · experiencia visual · motor de decisión explicable. Casos de uso de primer nivel: *nuevo vs nuevo*, *usado vs usado*, **nuevo vs usado** (p. ej. RAV4 2021 con 80.000 km vs RAV4 2026 nuevo), *mismo modelo distinto año*, y **Older Premium vs Newer Mainstream** (p. ej. BMW X3 2018 vs Hyundai Tucson 2023) como oportunidad diferencial. VScar **no es un marketplace**: no vende coches ni integra anuncios en Alpha. Web primero (SSR/SEO), móvil después reutilizando engines y API. Cubre ICE, HEV, PHEV, BEV y deja el modelo abierto a futuras tecnologías (FCEV, EREV) mediante un `powertrain_type` extensible y componentes energéticos múltiples por variante.

## 3. Unique Value Proposition

"**Not the best car. The best car for you — new or used, with the math shown.**"
(El tagline corto original, *"Not the best car. The best car for you — with the math shown."*, se mantiene como variante para espacios reducidos.)
0. **Nuevo y usado en la misma comparación**, con los mismos engines y la misma transparencia; lo que no sabemos de una unidad usada reduce la *confianza*, no la nota del coche.
1. Tres ganadores distintos, nunca un ganador universal; y dentro de "para ti", **Practical Fit** (objetivo) separado de **Preference Fit** (subjetivo).
2. Cada número traducido a dinero/tiempo para *tu* uso: **Running Cost / Month**, **coste por 1.000 km**, ahorro anual, break-even (incl. nuevo vs usado).
3. Procedencia visible: OFFICIAL / VERIFIED / CALCULATED / ESTIMATED / USER PROVIDED, más **Recommendation Confidence** y **Data Completeness** visibles.
4. Escenarios en tiempo real (sliders, What If).
5. Tournament Mode compartible (viralidad).
6. Recomendación estrictamente separada de publicidad.

## 4. Target Users

| Segmento | Necesidad | Prioridad MVP |
|---|---|---|
| Comprador indeciso entre 2–4 modelos (≈ "high intent") | Comparar y decidir | **Primario** |
| Considerando electrificación (ICE→HEV/PHEV/EV) | ¿Compensa? Break-even, autonomía | **Primario** |
| **Comprador de usado / seminuevo** (mayoría del mercado en España) | ¿Esta unidad concreta compensa frente a otra o frente a un nuevo? Precio, km, garantía, riesgo | **Primario** |
| **Indeciso nuevo vs usado** | ¿Pagar más por nuevo o ahorrar con un usado? Break-even New vs Used | **Primario** |
| Aspirante a premium usado | Premium antiguo vs generalista reciente | Secundario (diferencial) |
| Familia con restricciones de espacio/seguridad | Practicidad, sillas, maletero | Secundario |
| Conductor de alto kilometraje | Coste por km, TCO | Secundario |
| Entusiasta / creador de contenido | Torneos, compartir | Canal de viralidad |
| B2B (concesionarios, medios) | Widgets/API | Later (Fase 6 negocio) |

## 5. Global Market Strategy

**Global core + local market layers** desde el día 1: el esquema, los engines, i18n y l10n son globales; los datos se activan por mercado. Un mercado se "enciende" cuando cumple un *Market Readiness Checklist*: fuentes de precios de energía, reglas fiscales básicas, ≥ 85 % de completitud de specs en el catálogo activo, traducción revisada, unidades por defecto.

El Market Readiness Checklist incluye también **cobertura histórica** (generaciones representativas desde ~2010 de las familias activas) y datos de ciclo de homologación por época (NEDC/WLTP en EU; EPA en US).

Orden propuesto: **ES (Alpha, datos reales) + US (dataset de test interno, no público)** → **US público (MVP)** → UK, DE, FR (Fase 10) → IT, PT, MX, resto EU → APAC.

## 6. Competitor Analysis

> A validar con investigación en Fase 0 (funcionalidades cambian con frecuencia).

| Tipo | Ejemplos | Personalización | TCO | Ahorro combustible | Rango | Torneo | 3D/visual |
|---|---|---|---|---|---|---|---|
| Sitios de specs | km77, auto-data.net, ultimatespecs, EV Database | ✗ | ✗ | parcial | ✓ (EV Database) | ✗ | ✗ |
| Comparadores oficiales | fueleconomy.gov (US), IDAE (ES) | mínima (km, precio) | ✗ | ✓ | ✓ EPA | ✗ | ✗ |
| Publicaciones | Car and Driver, MotorTrend, What Car?, Autobild, Motor.es | ✗ | What Car? "True Cost" | ✗ | ✗ | ✗ | ✗ |
| TCO | Edmunds True Cost to Own, KBB 5-Year Cost, ADAC Autokosten | ✗ (ZIP/estándar) | ✓ | incluido | ✗ | ✗ | ✗ |
| Marketplaces | Cars.com, CarGurus, Autotrader, coches.net, Carwow, mobile.de | filtros | ✗ | ✗ | ✗ | ✗ | limitado |
| Herramientas IA | Chatbots generalistas, asistentes de marketplaces | ✓ lenguaje natural | ✗ fiable | ✗ fiable | ✗ fiable | ✗ | ✗ |

**Huecos para VScar**
- Nadie combina **TCO personalizado por uso real + perfil de preferencias + explicación**; los TCO existentes son estándar (15k millas/año) y opacos.
- PHEV mal explicados en todos: la cifra WLTP ponderada engaña; VScar calcula con **% eléctrico real del usuario**.
- Chatbots IA generan datos no verificados → VScar: IA que *consulta engines*, nunca inventa cifras.
- Formato **torneo + resultado compartible**: inexistente en el sector.
- Internacional real (misma herramienta con datos locales): los líderes son mono-mercado.
- **Nuevo vs usado**: los marketplaces muestran anuncios y valoraciones, pero no comparan de forma explicable *una unidad usada concreta* frente a un nuevo o frente a otro usado de otra generación con coste de uso personalizado, garantía restante y riesgo de información. Los sitios de specs apenas cubren generaciones antiguas con contexto (ciclo NEDC vs WLTP, protocolo NCAP de la época).

## 7. Feature Architecture

```
┌─────────────── EXPERIENCE ───────────────┐
│ Car VS · Tournament · Calculators · Garage · Share · Ask VScar(later) │
├─────────────── DECISION LAYER ───────────┤
│ Decision Engine · Preference Engine · Explanation Builder │
├─────────────── ECONOMICS / PHYSICS ──────┤
│ Energy (Fuel/EV/PHEV) · Range · TCO · Break-even · Scenario/What-if │
├─────────────── USED VEHICLE ADJUSTMENT ──┤  ← capa nueva v0.4 (solo si hay Used Instance)
│ Used Instance · Used Information Confidence · Ownership Signals · Price override · Depreciation │
├─────────────── CONTEXT ──────────────────┤
│ Market Context Engine · Units/l10n · Energy prices · Tax rules │
├─────────────── DATA ─────────────────────┤
│ Reference Vehicles (generación/facelift/año) · Provenance · Conflict Engine · History · ETL │
└──────────────────────────────────────────┘
Advertising Engine ─── (aislado, sin acceso de escritura a scoring)
```

Principio: **engines = funciones puras TypeScript**, deterministas, versionadas (`engineVersion`), sin I/O. Reutilizables en web, API, workers y futura app móvil.

## 8. MVP — en dos escalones

### 8.1 VScar Alpha (validación · **target 12 semanas · planning range 12–16** · ≈ 45–52 sp)

**Calendario**: el mayor riesgo es la curación histórica, los derechos, la resolución de generaciones/facelifts, NEDC/WLTP, precios históricos y seguridad histórica. **No se retrasa Alpha por perseguir 80 variants**: si en la semana 10 existen 50 variants de alta calidad, se lanza con 50 antes que esperar a 80 mediocres.

**Infraestructura**: VPS existente (Windows Server 2022 + IIS + NSSM + MySQL existente), coste incremental ~1–10 €/mes (§44, §45.1).

**Definición**: **VScar Alpha = España + 15–25 familias populares + 50–80 variantes históricas de referencia desde ~2010 + comparación new/new, used/used y new/used + precio/kilometraje manual + Decision Engine explicable.** (2010 es una guía, no un límite: se pueden incluir modelos anteriores con demanda y buena calidad de datos.)

**Incluido**
- Mercado público: **solo España**. Dataset US interno (10 variantes) solo para tests de unidades/ciclos/moneda.
- UI **es + en** (el idioma no cambia el mercado: `/en-es/` = inglés con datos de España).
- Catálogo por **familias de modelos populares** (§9.3): **15–25 familias**, marcas populares en España, **2–4 generaciones/años representativos por familia**, **~50–80 reference variants**, ICE/HEV/PHEV/BEV, completitud de referencia ≥ 90 % en claves críticas. Profundidad en modelos populares antes que amplitud.
- Car VS (2–3 vehículos), cada uno **nuevo** (precio de lista vigente) o **usado** ("I'm considering a used one"): precio solicitado, kilometraje, año de matriculación, estado aproximado e historial de mantenimiento opcional, todo **USER PROVIDED** y guardado solo en `comparison.inputs` (§9.2).
- Flujos explícitos: **New vs Used**, **Used vs Used**, **Same model different year**, **Older Premium vs Newer Mainstream**.
- **Used Vehicle Adjustment Layer básico** (§17.3), **Used Information Confidence** y **Used Ownership Signals** (§13.9); Recommendation Confidence según la información de la unidad.
- Energy Engine (fuel/EV/PHEV), **Coste por 1.000 km**, Range Engine, Break-even, **What If** (km, precio energía, años, cargador en casa) con **Scenario Presets** (§19).
- Coste de propiedad **solo Known Cost** (compra + energía + impuestos) + **Running Cost / Month**; *Estimated Ownership Cost / Month* solo como bloque opcional etiquetado.
- Decision: **Deal Breakers**, Technical Capability, Economic Fit **con horizonte**, Best For You básico (**Practical Fit con estado PASS / PASS WITH COMPROMISES / FAIL** + prioridades simples de 3 preguntas).
- **Why not this car?** y **Sensitivity Analysis** ("What would change the result?").
- **Meaningful Difference** por SpecKey (+ Meaningful For You básico), **Data Completeness Score** con claves críticas y **Recommendation Confidence** (HIGH/MEDIUM/LOW con robustez) visibles.
- Explicaciones determinísticas por plantilla (sin IA).
- Versionado `engineVersion` + `methodologyVersion` + `dataSnapshotVersion` en todo resultado.
- Share: URL + imagen OG.
- Primeras páginas SEO: 3 calculadoras + ~30–50 comparaciones con demanda (gated).
- Instrumentación: Personalized Comparison Completion Rate, Decision Confidence Delta, Decision Change Rate.

**Excluido en Alpha**: US público, Tournament, cuentas, garage sincronizado (solo favoritos locales), explicaciones IA/NL profile, TCO con depreciación/mantenimiento/seguro como cifra principal, capa 3D (solo Motion UI básico). **Usados, fuera de Alpha**: integración con marketplaces (AutoScout24, coches.net, mobile.de, AutoTrader…) y cualquier scraping; listings en vivo; valoración automática de mercado; predicción completa de mantenimiento; VIN decode completo; informes de inspección; proveedores de historial de vehículo; historial de accidentes automatizado; integración con concesionarios; comparación de financiación; cotizaciones de seguro.

**Criterios de salida de Alpha → MVP** (a fijar en Fase 0, orientativos): ≥ 35 % de comparaciones con personalización; ≥ 50 % de éstas completadas; Decision Confidence Delta medio ≥ +2 puntos (medido también por separado en comparaciones con usados); Decision Change Rate medible (> 10 %); share rate ≥ 3 %; primeras comparaciones indexadas con impresiones; **proporción de comparaciones con ≥ 1 usado medida** (decide cuánto invertir en la capa de usados en el MVP).

### 8.2 VScar MVP (tras validar Alpha, ≈ +8–10 semanas)

- Activación pública de **EE. UU.** (`/en-us/`, `/es-us/`), catálogo ampliado por familias (~40 familias, ~150–200 reference variants entre ES y US).
- Used layer ampliado: maintenance milestones con fuente, recalls por generación, Why not/Sensitivity de usados enriquecidos; evaluación (no compromiso) de proveedor licenciado de valor de mercado.
- TCO completo 1/3/5/8 años con separación **Known / Estimated**.
- **Preference Fit** + Personal Fit final; Driver Profile progresivo + perfil en lenguaje natural (IA); explicaciones IA sobre resultados de engines.
- **Tournament** 4/8 como Engagement Engine (stated vs observed preference).
- Cuenta opcional (magic link) + garage sincronizado.
- pSEO ampliado, fichas de vehículo, 5–6 calculadoras.
- Capa visual premium selectiva: Hero, VS Intro, Winner Reveal (con fallback 2D).

**Excluido de ambos** → ver §49.

## 9. Vehicle Data Architecture

Jerarquía: `Manufacturer → Model (familia) → Generation → Facelift (fase) → ModelYear → ReferenceVariant (Market + Trim + Powertrain) → Equipment`, y aparte **`UsedVehicleInstance → ReferenceVariant`**.

- Un "RAV4 2026 Spain" y un "RAV4 2026 USA" son **variantes distintas** que comparten `generation_id`, nunca se mezclan.
- No se depende solo de ModelYear: en Europa la **generación + facelift** suele ser más significativa. "Golf 2018" se resuelve a *Golf VII (Mk7) facelift, 2017–2020* y a las reference variants de ese periodo en el mercado.

- Specs en modelo **atributo-valor con procedencia** (`spec_values`) + tabla derivada tipada `variant_specs_current` (recalculada por el worker) para lectura rápida.
- Unidades canónicas internas SI (km, L, kWh, kW, N·m, kg, mm, s); conversión solo en presentación.
- Dinero en **unidades menores enteras + ISO 4217**; nunca floats.

### 9.1 Reference Vehicle vs Used Vehicle Instance

| | **Reference Vehicle** (`reference_variant`) | **Used Vehicle Instance** (`used_vehicle_instance`) |
|---|---|---|
| Qué es | Configuración técnica de referencia (p. ej. BMW 320d G20 2019, diésel 190 CV, automático, RWD) | Una unidad concreta en venta (p. ej. ese 320d 2019, 94.000 km, 22.500 €, 2 propietarios, historial completo, estado bueno) |
| Contiene | specs, consumo (con ciclo), dimensiones, potencia, emisiones/norma Euro, seguridad (con protocolo), garantía original, equipamiento, recalls, mantenimiento de referencia, precio original | `reference_variant_id`, `registration_year`, `mileage`, `asking_price`, `owners`, `service_history`, `accident_history`, `condition`, `warranty_remaining`, `inspection_status`, `battery_health` (si aplica), `seller_type`, `location` (aprox.), `listing_source`, `listing_url`, `retrieved_at` |
| Procedencia | OFFICIAL / VERIFIED / CALCULATED / ESTIMATED | Casi todo **USER_PROVIDED** en Alpha |
| Identidad | VScar ID + canonicalKey, parte del slug SEO | UUID propio, **nunca** en slugs SEO públicos |
| Regla | La unidad **no puede sobrescribir** specs de referencia con fuente; solo aporta contexto y overrides económicos explícitos (precio) | — |

### 9.2 Used Vehicle Instance en Alpha (manual y efímera)

El usuario elige una reference variant (p. ej. *Toyota RAV4 Hybrid 2020*) → **"I'm considering a used one"** → introduce precio solicitado, kilometraje, año de matriculación (si difiere), estado aproximado (`excellent | good | fair | unknown`) e historial de mantenimiento opcional (`full | partial | none | unknown`). En Alpha la instancia vive en `comparison.inputs` (no se persiste como entidad), sin obtención automática de precios ni integración con anuncios. La detección es implícita: si el usuario elige un año anterior o introduce precio/km, la UI ofrece el modo usado sin obligar a decidir al entrar.

### 9.3 Principio de catálogo: Popularity × Used-Market Volume × Comparison Demand

La cobertura **no** sigue "Latest model year first". Para cada familia candidata se puntúa:
1. popularidad del modelo (matriculaciones históricas);
2. volumen estimado en mercado de ocasión (transferencias / presencia en anuncios, medido de forma agregada y sin scraping — estadísticas públicas DGT/ANFAC/Ganvam cuando existan);
3. interés de búsqueda (keywords, "modelo año", "vs");
4. frecuencia probable de comparación;
5. relevancia en segmentos de alta demanda (SUV C, compactos, híbridos, EV);
6. disponibilidad y calidad de datos (DATA_RIGHTS_MATRIX).

Por familia se eligen **2–4 generaciones/años representativos** (ejemplo orientativo: *RAV4 2016 · 2019 · 2021 · 2024 · 2026*; *Golf 2015 · 2018 · 2020 · 2024*), no todos los años. Marcas candidatas (lista definitiva en Fase 0 según datos): Toyota, Volkswagen, Seat, Peugeot, Renault, Hyundai, Kia, Nissan, Ford, BMW, Mercedes-Benz, Audi, y otras según demanda real. No se cargan automáticamente miles de coches.

### 9.4 VScar Dataset Core v0.1 (antes de escalar)

Antes de intentar cargar 50–80 reference variants se construye **Dataset Core v0.1: 10 reference variants reales y deliberadamente distintas**, para validar schema y pipeline. Lista orientativa (la final se decide por disponibilidad real de datos): Toyota RAV4 Hybrid 2021 · Toyota RAV4 Hybrid reciente · Volkswagen Golf 2018 · Volkswagen Golf reciente · BMW X3 2018 · Hyundai Tucson 2023 · Tesla Model 3 2021 · un BEV reciente equivalente · Seat León generación anterior · Seat León reciente.

Cobertura obligatoria de los 10 casos: NEDC y WLTP · generación/facelift · ICE, HEV y BEV · new vs used · same model different year · older premium vs newer mainstream · seguridad histórica (protocolos distintos) · precios históricos. Estos 10 son también la base de los casos dorados y fixtures.

**Rampa del data workstream (desde la semana 1, en paralelo; orientativa, no gate rígido — la calidad prima sobre cantidad)**:

| Semana | Reference variants |
|---|---|
| 1 | schema provisional + primeras 2 |
| 2 | 5 |
| 3–4 | 10 (Dataset Core v0.1) → 20 |
| 5–6 | 30–50 |
| 7–8 | 50–80 |


## 10. Data Sources

Estrategia: **free/public first** — fuentes oficiales gratuitas + curación manual con procedencia. Alpha usa EEA, IDAE, MITECO, ESIOS, Euro NCAP (citado según derechos), Safety Gate, datos de fabricante, y NHTSA/EPA solo para el dataset US de test. **No se contrata API comercial para Alpha** salvo que la DATA_RIGHTS_MATRIX demuestre un bloqueo crítico (y entonces vía ADR). Proveedores comerciales solo tras validación, como un adapter más del VScar Dataset (§33.2).

| Dato | US | ES / EU | Tipo |
|---|---|---|---|
| Consumo, autonomía EV, CO₂ | EPA fueleconomy.gov web services / datasets | EEA CO₂ monitoring (WLTP), IDAE base de consumos, fichas oficiales fabricante | Oficial, gratis |
| Decodificación / taxonomía | NHTSA vPIC | — | Oficial, gratis |
| Seguridad | NHTSA NCAP API; IIHS (licencia) | Euro NCAP (sin API pública; licencia/cita) | Oficial |
| Recalls | NHTSA Recalls API | RAPEX/Safety Gate EU | Oficial |
| Precios combustible | EIA API (regional semanal) | MITECO Geoportal gasolineras (diario, por estación), EU Weekly Oil Bulletin | Oficial, gratis |
| Precio electricidad | EIA (por estado) | REE/ESIOS (PVPC), Eurostat | Oficial, gratis |
| Cargadores (later) | NREL AFDC API | Open Charge Map, NAP nacionales | Abierto |
| Precio vehículo / trims | Curación manual (web fabricante/MSRP) → comercial después | Curación manual (tarifas oficiales) | Manual con fuente |
| Valores residuales | Comercial (J.D. Power/Black Book) — Later | Comercial (Autovista/Eurotax/Schwacke) — Later | En MVP: curvas estimadas por segmento, etiquetadas ESTIMATED |
| Specs completas multi-mercado | Comercial (JATO, Chrome Data/J.D. Power, DataForce) — Fase 10 | idem | Comercial caro |
| **Históricos 2010+ (v0.4)**: generaciones, motores, trims, consumo | EPA datasets históricos (desde 1984) | EEA CO₂ monitoring (desde 2010, NEDC → WLTP), IDAE histórico, fichas/catálogos de fabricante archivados | Oficial + curación manual |
| **Precio original de lista** | Curación manual (MSRP histórico) | Tarifas oficiales históricas (archivos de fabricante / prensa) | Manual con fuente |
| **Seguridad histórica** | NHTSA NCAP por año | Euro NCAP con **año de test y protocolo** | Oficial (cita) |
| **Recalls por generación** | NHTSA Recalls | Safety Gate EU, comunicaciones de fabricante | Oficial |
| **Mantenimiento programado** | Manuales/planes de fabricante (curación) · comercial (HaynesPro, Autodata/TecRMI) — Later | idem | Manual con fuente → comercial |
| **Valor de mercado de usados** | Comercial (J.D. Power, Black Book, KBB) — **Later** | Comercial (Ganvam, Autovista/Eurotax, Schwacke) — **Later** | Alpha: `used_asking_price` = USER PROVIDED, sin valoración automática |
| **Salud de batería (SOH)** | — (usuario / informe del vendedor) | idem | USER PROVIDED; nunca estimada como hecho |

**Reglas**: no scrapear competidores (derecho sui generis de bases de datos UE); scraping de fabricantes solo si ToS lo permite, preferir curación manual citando URL; IA **nunca** como fuente primaria.

### 10.1 Data Acquisition Strategy — workstream independiente (Fase 0–2)

Se trata como un proyecto propio, con responsable, y **debe responderse antes de invertir fuerte en frontend**. Entregable: `docs/data/DATA_RIGHTS_MATRIX.md` + hoja de cobertura.

**Matriz por SpecKey × fuente** (≈ 80 claves × fuentes candidatas):

| Pregunta | Columna |
|---|---|
| ¿Lo conseguimos gratis? ¿Para qué % del catálogo Alpha? | `coverage_pct` |
| ¿Con qué calidad (oficial, ciclo, granularidad por trim)? | `quality` |
| ¿Podemos **almacenarlo**? | `can_store` |
| ¿Podemos **republicarlo** tal cual? | `can_republish` |
| ¿Uso **comercial** permitido (con publicidad/afiliación)? | `can_commercial` |
| ¿Podemos **derivar cálculos** y publicarlos? | `can_derive` |
| Atribución obligatoria / licencia (p. ej. CC BY 4.0) | `attribution` |
| Frecuencia de actualización y coste | `refresh`, `cost` |
| ¿Qué API comercial cubre el hueco y a qué precio? | `gap_provider` |
| **Cobertura histórica por periodo** (v0.4) | `coverage_2010_2014`, `coverage_2015_2019`, `coverage_2020_2023`, `coverage_2024_plus` |
| Ciclo de homologación disponible por periodo | `test_cycles` (NEDC / NEDC-correlated / WLTP / EPA) |

Dominios adicionales a evaluar (v0.4): generaciones y facelifts; motores y trims históricos; consumos NEDC/WLTP; precios originales; recalls por generación; seguridad histórica con protocolo; planes de mantenimiento; valores residuales; **used-market pricing** (solo evaluación de proveedores y licencias, no integración en Alpha).

**Gate**: Alpha solo arranca desarrollo de UI completa cuando las SpecKeys necesarias para las categorías Alpha (energía, autonomía, precio original, dimensiones, maletero, plazas, potencia, 0-100, garantía original, ciclo de homologación) alcanzan ≥ 90 % de cobertura **para las reference variants seleccionadas de todos los periodos**, con derechos `store + republish + commercial + derive` confirmados, o se ha decidido curación manual con fuente citada. Si un periodo (p. ej. 2010–2014) no alcanza el umbral, se reduce su peso en el catálogo Alpha en lugar de imputar. Consultar asesoría legal para ToS de fabricantes y Euro NCAP.

## 11. Canonical Vehicle Schema

Paquete `@vscar/vehicle-schema` (Zod → tipos TS + JSON Schema + OpenAPI).

```ts
type Provenance = 'OFFICIAL' | 'VERIFIED' | 'CALCULATED' | 'ESTIMATED' | 'USER_PROVIDED';

interface SourcedValue<T> {
  value: T; unit: CanonicalUnit;
  source: SourceRef;            // id + url + adapter
  retrievedAt: string; validFrom: string; validTo?: string;
  market: MarketCode; modelYear: number;
  confidence: number;           // 0..1
  status: Provenance;
  testCycle?: 'WLTP' | 'EPA' | 'NEDC' | 'NEDC_CORRELATED' | 'MANUFACTURER';
}

interface Generation {
  id: UUID; canonicalKey; modelId;
  generationCode: string;       // 'Mk7', 'XA50', 'G20'
  productionStart: string; productionEnd?: string;   // por mercado si difiere
  facelifts: Facelift[];        // { id, label: 'Mk7.5', start, end }
}

interface ReferenceVariant {    // antes MarketVariant
  id: UUID;                     // VScar ID: estable, nunca cambia ni se reutiliza
  canonicalKey: string;         // market:manufacturer:model:generation:facelift:year:powertrain:trim
                                //   p. ej. 'es:volkswagen:golf:mk7:fl:2018:ice-petrol:1.5tsi-150-dsg:life'
  slug: string;                 // SEO, puede cambiar (redirección 301 desde slugs antiguos)
  generationId; faceliftId?; modelYear; market; trimName; bodyType; seats; doors;
  salesStart?: string; salesEnd?: string;             // periodo comercial en el mercado
  emissionsStandard?: 'Euro5'|'Euro6b'|'Euro6d-TEMP'|'Euro6d'|'Euro7'|string;
  powertrain: { type: 'ICE'|'HEV'|'MHEV'|'PHEV'|'BEV'|'FCEV'|'EREV';
                fuel?: 'petrol'|'diesel'|'lpg'|'cng'|'e85'|'hydrogen';
                drivetrain: 'FWD'|'RWD'|'AWD'; transmission; };
  specs: Record<SpecKey, SourcedValue<number|string|boolean>>;
  prices: {
    originalListPrice?: SourcedValue<Money>;   // precio de lista cuando se vendía
    currentNewPrice?:   SourcedValue<Money>;   // solo si sigue a la venta
  };
  safetyRatings: { authority: 'EuroNCAP'|'NHTSA'|'IIHS'; stars?; testYear; protocolVersion; source }[];
  maintenanceMilestones?: MaintenanceMilestone[];  // schema preparado, población gradual (§17.5)
}

interface UsedVehicleInstance { // efímera en Alpha (comparison.inputs); entidad persistente Later
  id: UUID;                     // nunca forma parte de slugs SEO
  referenceVariantId: UUID;
  registrationYear?: number; mileageKm: SourcedValue<number>;          // USER_PROVIDED
  askingPrice: SourcedValue<Money>;                                     // USER_PROVIDED
  estimatedMarketValue?: SourcedValue<Money>;                           // Later, proveedor licenciado
  condition: 'excellent'|'good'|'fair'|'poor'|'unknown';
  owners?: number | 'unknown';
  serviceHistory: 'full'|'partial'|'none'|'unknown';
  accidentHistory: 'none_declared'|'declared'|'unknown';
  warrantyRemainingMonths?: number | 'unknown';
  inspectionStatus?: 'valid'|'expired'|'unknown';   // ITV en ES
  batteryHealthPct?: SourcedValue<number> | 'unknown';                  // BEV/PHEV
  batteryWarrantyRemaining?: { months?: number; km?: number } | 'unknown';
  sellerType?: 'dealer'|'private'|'unknown';
  locationRegion?: string;      // aproximada; nunca dirección
  listingSource?: string; listingUrl?: string; retrievedAt?: string;   // opcional, no se guarda por defecto (§39)
}
```

**Precios separados** (nunca intercambiables): `original_list_price` (histórico, OFFICIAL/VERIFIED) · `current_new_price` (vigente) · `used_asking_price` (USER PROVIDED en Alpha) · `estimated_market_value` (Later, proveedor licenciado). En Alpha **no** se determina automáticamente el valor de mercado.

**Ciclos y seguridad por época**: todo consumo/autonomía/CO₂ lleva `testCycle`; toda calificación de seguridad lleva `authority`, `testYear` y `protocolVersion`. No existe un "safety score histórico" único sin metodología publicada.

**VScar ID (identidad del dato)**: cada entidad del catálogo (manufacturer, model, generation, facelift, reference variant) tiene `id` UUID estable + `canonicalKey` legible (market, manufacturer, model, generation, facelift, year, powertrain, trim). Las Used Vehicle Instances tienen UUID independiente y nunca aparecen en slugs SEO públicos. Comparaciones compartidas, API, SEO y migraciones referencian el UUID; el slug es solo presentación (tabla `slug_history` para 301). Cambios de fabricante (fusiones, rebranding), de año o correcciones editoriales no rompen enlaces. Fusión de duplicados → `merged_into_id`.

Cada `SpecDefinition` declara la parte estructural (`key`, tipo, unidad, categoría, `isCritical`, `requiredFor` categorías/SEO). La parte **metodológica** — `meaningfulDifference`, `utility`, reglas "for you", `weightInCompleteness`, pesos de categorías — vive en `@vscar/methodology`, versionada de forma independiente (§13.8).

Catálogo de `SpecKey` versionado (≈ 80 claves MVP): potencia, par, 0-100/0-60, vmax, masa, dimensiones, batalla, altura libre, maletero (VDA/SAE diferenciados), plazas, carga útil, remolque, depósito, batería bruta/útil, consumos ciudad/carretera/combinado por ciclo, autonomía por ciclo, AC/DC kW, 10–80 % min, garantía original (años/km, batería), ADAS (booleans), rating NCAP (con protocolo), norma de emisiones, airbags, infotainment (CarPlay/Android Auto, pantalla), conectividad, etc.

## 12. Comparison Engine

- Entrada: 2–4 **participantes del mismo mercado**, cada uno = reference variant **+ opcional Used Vehicle Instance** (new o used), + perfil + escenario. Se admiten años, generaciones y powertrains distintos.
- Salida: por categoría → métricas alineadas, delta absoluto y relativo, **clasificación de diferencia**, cobertura de datos, procedencia.
- **Ciclos de homologación (reforzado v0.4)**: NEDC, NEDC-correlated, WLTP, EPA y ciclos de fabricante nunca se comparan como equivalentes. Se muestra siempre el ciclo. Solo se convierte cuando existe una metodología defendible y publicada (en `@vscar/methodology`, con fuente); si no, la métrica se marca **NOT DIRECTLY COMPARABLE** y se excluye del ganador de esa métrica (pero se muestra). Para vehículos antiguos se puede mostrar *OFFICIAL NEDC* junto a *ESTIMATED REAL WORLD* solo cuando exista metodología publicada (p. ej. factores de desviación NEDC→real documentados por estudios independientes) y siempre con badge ESTIMATED. El coste energético usa el valor real-world estimado solo si el usuario lo acepta; si no, se indica que el cálculo usa ciclos distintos y se reduce la confianza.
- **Seguridad entre años**: estrellas Euro NCAP de protocolos distintos no se comparan como iguales ("5★ Euro NCAP 2012 ≠ 5★ Euro NCAP 2025"); se muestra año y protocolo y el ganador de seguridad solo se calcula entre ratings del mismo protocolo o mediante criterios objetivos (ADAS presentes, airbags). Sin score histórico único.
- Datos faltantes: no se imputan; la métrica se excluye y la categoría muestra cobertura (p. ej. "4/6 métricas").

### 12.1 Meaningful Difference (concepto global)

Sustituye al umbral universal del 3 %. Cada SpecKey define su umbral de relevancia (valores iniciales orientativos, a calibrar con entrevistas y literatura):

| SpecKey | Umbral "Tie" | Umbral "Clear advantage" |
|---|---|---|
| 0-100 km/h | < 0,4 s | ≥ 1,0 s |
| Maletero | < 30 L | ≥ 80 L |
| Consumo combustible | < 0,3 L/100 km | ≥ 0,8 L/100 km |
| Consumo eléctrico | < 1 kWh/100 km | ≥ 2,5 kWh/100 km |
| Autonomía | < 30 km | ≥ 80 km |
| Precio | < 500 € | ≥ 2.000 € |
| Carga DC pico | < 10 kW | ≥ 50 kW |
| Tiempo 10–80 % | < 3 min | ≥ 10 min |

Salida: `TIE | SLIGHT | MEANINGFUL | CLEAR` (en UI: "Empate", "Ligera ventaja", "Ventaja relevante", "Ventaja clara"). Umbrales pueden ser relativos al contexto (p. ej. 500 € es relevante en un coche de 20k €, menos en uno de 80k € → `max(abs, pct × valor)`). Reutilizado por Comparison, Decision (explicaciones solo citan diferencias ≥ MEANINGFUL), Tournament (factores a mostrar) y SEO (texto generado).

### 12.2 Meaningful Difference vs Meaningful For You

Dos capas distintas:
- **Meaningful Difference** (numérica, independiente del usuario): la tabla anterior. Se usa en fichas, SEO y comparación genérica.
- **Meaningful For You** (relevancia personal): reescala la diferencia según el perfil y el escenario mediante reglas declaradas en `@vscar/methodology`. Ejemplos:
  - +80 km de autonomía EV → CLEAR para quien hace viajes largos frecuentes; SLIGHT para quien conduce 35 km/día y carga cada noche (autonomía ≫ uso diario).
  - +100 L de maletero → CLEAR para familia de 4 con viajes; TIE para conductor solo urbano.
  - 0,8 s en 0-100 → SLIGHT si prestaciones = baja importancia.

Salida doble en UI cuando difieren: *"Ventaja clara (+80 km) — poco relevante para tu uso diario"*. Explicaciones personales usan Meaningful For You; Technical Capability usa solo Meaningful Difference.

### 12.3 Segment baseline (diseñado en Alpha, visible cuando haya datos)

El Comparison Engine acepta un tercer participante opcional **virtual**: `segment_median` (mediana del segmento y mercado sobre el catálogo publicado con completitud suficiente). Ejemplo: *Coste por 1.000 km — RAV4 79 € · CR-V 83 € · Mediana segmento 102 €*. Se muestra solo si el segmento tiene ≥ N vehículos (p. ej. 8) para que la mediana sea representativa; nunca participa como "ganador".

## 13. Decision Engine

Modelo **aditivo ponderado** (no multiplicativo), transparente, con **funciones de utilidad por criterio** en lugar de min–max.

### 13.1 Funciones de utilidad

Cada criterio mapea su valor físico a utilidad 0–100 mediante una curva declarada en `SpecDefinition.utility` (tipos: `logistic`, `piecewise_linear`, `saturating`, `threshold`), con parámetros por segmento cuando proceda. Ejemplos:

```
utilityCargo(400 L) = 65   utilityCargo(500 L) = 88     (curva saturante: más allá de ~650 L aporta poco)
utilityAccel(6,8 s) = 92   utilityAccel(7,0 s) = 90     (logística: zona plana en coches rápidos)
utilityRange(250 km) = 40  utilityRange(450 km) = 85
```
Ventajas: diferencias triviales no producen saltos; resultados estables al añadir/quitar coches al set (min–max no lo es). Las curvas son públicas (página de Metodología) y versionadas; se calibran con entrevistas y se revisan con datos de uso.

### 13.2 Orden de evaluación y scores separados

```
1. Deal Breakers          → filtro duro, antes de cualquier score (§13.3)
2. Technical Capability   = Σ W_tech_c · category_utility_c        (pesos editoriales fijos, públicos)
3. Economic Fit @horizon  = f(coste del escenario del usuario al horizonte H; Known y Estimated separados)
4. Practical Fit          = { status: PASS | PASS_WITH_COMPROMISES | FAIL, score 0–100, reasons[] }
                            (necesidades OBJETIVAS: plazas, remolque, maletero, cargador vs powertrain,
                             km/año vs autonomía, dimensiones máximas…)
5. Preference Fit         = score 0–100 (SUBJETIVO: marca, estilo, diseño, interior, importancia declarada/observada)
6. Personal Fit (final)   = α · Practical Fit.score + (1−α) · Preference Fit   (α por defecto 0,7, visible y ajustable)
                            solo entre vehículos con Practical Fit ≠ FAIL
```

**Filosofía y nombres (publicados en Metodología)**
- **Technical Capability** (antes "Technical Winner"): no significa "mejor coche", sino *mayor capacidad medida en las categorías y pesos publicados* (eficiencia, prestaciones, espacio, seguridad, carga/autonomía, garantía). Más potencia o más tamaño no suman indefinidamente: las funciones de utilidad saturan. La UI muestra siempre qué categorías y pesos entran ("Specs overall — según 6 categorías, ver cómo").
- **Economic Fit** siempre **con horizonte**: *"Best economic fit — 5 years"* o *"para tu propiedad prevista de 6 años"*. Si el ganador cambia entre 1/3/5/8 años se indica explícitamente ("A es más barato hasta el año 3; B a partir del 4").
- **Best For You** = mayor Personal Fit entre los que no fallan Practical Fit; si todos fallan, se dice ("Ninguno cumple tus requisitos; el más cercano es…").
- Cada resultado con top-3 contribuciones (`weight × Δutility`) que superen **Meaningful For You** → *"Gana para ti principalmente por: menor coste de uso (−82 €/mes), autonomía (+120 km)…"*.
- Preference Fit nunca influye en Technical ni Economic.

**Edad y kilometraje en el scoring (v0.4)**
- La **edad del coche no penaliza automáticamente Technical Capability**: un BMW 2018 puede seguir teniendo mejores prestaciones que un vehículo 2024. Technical Capability depende solo de la reference variant; es idéntica sea cual sea el precio o el kilometraje de la unidad.
- Edad/kilometraje/historial influyen únicamente en: **Economic Fit** (precio real, mantenimiento estimado, depreciación desde valor actual), **Used Ownership Signals** y **Used Information Confidence** (§13.9), **Practical/Preference Fit** cuando el usuario lo pide (deal breakers de edad/km, preferencia por "casi nuevo") y **Recommendation Confidence**.
- La **brecha generacional** se refleja con categorías objetivas propias, no con penalización por edad: **Technology** (infotainment, CarPlay/Android Auto, conectividad, pantallas) y **Safety** (ADAS disponibles: AEB, ACC, mantenimiento de carril, ángulo muerto; nº de airbags; protocolo NCAP y año; norma de emisiones como dato de **Eco**, relevante para etiquetas DGT/ZBE). Así un modelo reciente gana en Technology/Safety por lo que tiene, no por su año.
- **Used-Car Fit no es un score nuevo**: es una capa que alimenta Economic Fit, Practical Fit, Recommendation Confidence y Why not. Ejemplo de explicación: *"Técnicamente encaja muy bien, pero esta unidad tiene kilometraje alto e historial de mantenimiento desconocido."*

**Practical Fit con estado, no solo porcentaje**
```
Practical Fit  FAIL · 72
Reason: Requires 7 seats — vehicle has 5
```
- `FAIL`: incumple ≥ 1 deal breaker. Un score alto nunca oculta una incompatibilidad.
- `PASS_WITH_COMPROMISES`: cumple obligatorios pero incumple requisitos "deseables" (p. ej. maletero deseado 550 L, tiene 520 L).
- `PASS`: cumple todo.

### 13.3 Deal Breakers

Requisitos obligatorios que el usuario marca (o que se deducen con confirmación): presupuesto máximo, plazas mínimas, capacidad de remolque, autonomía mínima, requiere/no dispone de cargador, altura máxima (garaje), longitud/anchura máxima, combustibles permitidos, transmisión, tracción.

```
BMW X1 — 2 deal breakers
  ❌ Presupuesto (46.900 € > 42.000 €)
  ❌ Remolque (1.800 kg < 2.000 kg requeridos)
"Aunque su Personal Fit es alto (84), no cumple dos requisitos obligatorios."
```
Un dato faltante para un deal breaker → estado `UNKNOWN` (nunca se asume que cumple).

**Deal Breakers para usados (v0.4, todos opcionales)**: `maximum_age` (años), `maximum_mileage` (km), `minimum_battery_health` (% SOH), `full_service_history_required`, `remaining_warranty_required` (meses), `no_open_recalls`, `max_owners`, `dealer_only`, `valid_inspection_required` (ITV). Aplican solo a participantes usados; si el dato de la unidad es desconocido → `UNKNOWN` con explicación ("No sabemos si tiene historial completo — pregúntalo al vendedor").

### 13.4 "Why not this car?" (Alpha)

Para cada vehículo no elegido como Best For You (y también para el ganador, como "Lo que sacrificas"), lista de 3–5 desventajas ordenadas por relevancia personal, generadas por plantilla a partir de los mismos resultados del engine (sin IA):
```
WHY NOT THE MODEL Y?                  WHY NOT THE RAV4?
• 4.300 € más de precio de compra     • 720 €/año más en combustible
• Sin Apple CarPlay                   • Aceleración más lenta (MEANINGFUL)
• No tienes cargador privado          • Menor Preference Fit
```
Solo diferencias ≥ Meaningful For You o deal breakers; badges de procedencia en cada línea.

**Para usados (v0.4)** — combina desventajas de la reference variant y de la unidad concreta, distinguiendo ambas:
```
WHY NOT THIS 2018 BMW X3?                    WHY NOT THE NEWER TUCSON 2023?
• 112.000 km (unidad)                        • 6.800 € más de precio de compra
• Historial de mantenimiento incompleto      • Prestaciones inferiores (MEANINGFUL)
• Garantía expirada (unidad)                 • Mayor exposición a depreciación (ESTIMATED)
• Mantenimiento estimado más alto (ESTIMATED)
• Carece de ADAS más recientes (referencia)
```

### 13.5 Sensitivity Analysis — "What would change the result?"

Para cada resultado (Economic Fit y Best For You) el engine busca, por bisección sobre las variables del escenario, el **punto de cambio de ganador** dentro de rangos plausibles:
```
YOUR RESULT IS STABLE
Model Y remains cheaper unless:
  • Electricity > 0,44 €/kWh
  • Petrol < 1,19 €/L
  • Annual mileage < 7.400 km
  • Home charging share < 38 %
```
Variables analizadas: km/año, % ciudad, precio combustible, precio electricidad (casa/pública), % carga en casa, años de propiedad, peso de cada categoría (para Best For You) y, **con usados (v0.4)**: precio solicitado, mantenimiento anual estimado, supuestos de valor residual. Ejemplos (siempre con badge ESTIMATED donde aplique):
```
Used BMW remains cheaper unless annual maintenance exceeds 1.400 € (ESTIMATED).
New RAV4 becomes economically preferable if you keep the car more than 8 years
  under these residual assumptions (ESTIMATED).
The used Model 3 stays cheaper unless its asking price exceeds 31.200 €.
``` Coste: puro y barato (engines deterministas, ~decenas de evaluaciones por variable). Se ejecuta en cliente para respuesta instantánea.

**Result Robustness** = distancia relativa entre el escenario actual y el punto de cambio más cercano (normalizada por el rango plausible de cada variable). Alimenta directamente la confianza (§13.6).

### 13.6 Recommendation Confidence (visible, sin falsa exactitud)

```
confidence_internal = f( comparison_completeness,
                         % inputs OFFICIAL/VERIFIED en criterios con peso,
                         % del coste que es ESTIMATED,
                         result_robustness (§13.5)   ← sustituye al simple "margen entre 1º y 2º",
                         used_instance_information (v0.4): price_known, mileage_known,
                           service_history_known, accident_history_known, battery_health_known (BEV/PHEV) )
UI → HIGH · MEDIUM · LOW   (el número 0–100 solo en el panel de detalle, en gris, secundario)
```
**Principio (v0.4)**: la falta de información de una unidad usada **no penaliza al coche**; penaliza la **certeza de la recomendación**. Ejemplo: *"Recommendation confidence: MEDIUM — mileage is known but maintenance history is not available."*
UI principal: **"Confidence: MEDIUM"** + la razón: *"Two ownership-cost inputs are estimated · result changes if you drive < 9.000 km/año"*. Al desplegar: "96 % technical data coverage · 100 % official range/consumption · maintenance estimated · depreciation estimated · insurance not included · stable unless electricity > 0,44 €/kWh". La explicación es más importante que el número. Si la robustez es mínima → "Empate práctico para tu perfil" en vez de forzar un ganador.

### 13.7 Data Completeness Score (infraestructura de calidad única)

Una sola función en `@vscar/quality` gobierna todo el producto, combinando **cantidad ponderada** y **claves críticas**:

```
vehicle_completeness       = Σ weightInCompleteness(k) · present(k) · provenanceFactor(k) / Σ weights
category_available(c)      = ∀ k ∈ requiredFor(c): present(k)            ← criticalSpecKeys por categoría
comparison_completeness    = mínimo de los vehículos sobre las SpecKeys de categorías disponibles
recommendation_confidence  (§13.6) consume comparison_completeness
seo_eligibility            = comparison_completeness ≥ 90 % ∧ category_available(Economy) ∧ category_available(Range/Size)
                             ∧ cálculos propios presentes ∧ mismo mercado
```
Una categoría sin sus claves críticas **no se activa** y se explica: *"Economy comparison: NOT AVAILABLE — missing official fuel consumption for CR-V"*. Nunca se imputa. Así un 91 % de completitud sin precio o sin consumo no permite comparación económica ni indexación.
Visible en ficha ("Data completeness 97 %") y en admin (huecos priorizados por impacto en categorías críticas, SEO y tráfico).

**Dos completitudes separadas (v0.4)**, misma infraestructura:
```
reference_completeness      = vehicle_completeness de la reference variant (catálogo; gobierna SEO)
used_instance_completeness  = Σ w(f) · known(f) / Σ w   sobre f ∈ {asking_price, mileage, registration_year,
                              service_history, accident_history, owners, warranty_remaining,
                              condition, battery_health (BEV/PHEV), inspection_status}
                              (pesos en @vscar/methodology; asking_price y mileage son críticos)
```
UI: *"Reference data: 96 % · Used-car information: 61 % · Recommendation Confidence: MEDIUM"*. `used_instance_completeness` nunca afecta a `seo_eligibility` (las instancias no son páginas).

**Interpretación (v1.0)**: `used_instance_completeness` es la **completitud de información de la unidad** (*information completeness of the unit*), **no** la calidad del coche.

### 13.9 Used Information Confidence y Used Ownership Signals (v1.0: dos conceptos separados)

Se elimina cualquier ambigüedad entre "riesgo del coche" y "riesgo por falta de información". (En v0.4 ambos se agrupaban como *Used Vehicle Risk Profile*; ese nombre queda sustituido por los dos conceptos siguientes.)

**A. Used Information Confidence** — mide **cuánto sabemos** de la unidad. No es fiabilidad mecánica.
- Inputs: asking price known · mileage known · registration year · service history · accident history · owners · warranty · inspection · battery health (BEV/PHEV).
- Se deriva de `used_instance_completeness` + reglas de campos críticos (asking price y mileage) en `@vscar/methodology`.
- Salida: **HIGH / MEDIUM / LOW**. Alimenta Recommendation Confidence (§13.6).

**B. Used Ownership Signals** — **señales observables** sobre la unidad, mostradas por separado con su estado y procedencia:

| Señal | Ejemplo de estado |
|---|---|
| AGE | 7 años desde matriculación |
| MILEAGE | 112.000 km (≈ 16.000 km/año, en línea con la media) |
| SERVICE HISTORY | Parcial (USER PROVIDED) |
| WARRANTY | Expirada / 14 meses restantes |
| RECALLS | 1 recall publicado para esta generación — comprobar si está realizado (OFFICIAL) |
| MAINTENANCE MILESTONES | Mantenimiento mayor programado a 120.000 km (solo si hay fuente, §17.5) |
| BATTERY HEALTH (BEV/PHEV) | 91 % SOH (USER PROVIDED) / UNKNOWN |
| INSPECTION | ITV vigente / caducada / UNKNOWN |

- **No** se produce todavía ningún "87 % reliability" ni "risk of failure 32 %" sin datos actuariales/técnicos sólidos.
- Age y mileage pueden influir en: supuestos de mantenimiento (rango ESTIMATED), Economic Fit, Why not y deal breakers del usuario — pero **no se confunden con Information Confidence** (un coche con 200.000 km puede tener Information Confidence HIGH si todo es conocido).
- Ninguna de las dos afecta a Technical Capability.

### 13.8 Reproducibilidad: tres versiones

Toda comparación, torneo, share y página SEO guarda:
```
engineVersion        = versión semver de los paquetes de cálculo (p. ej. 1.3.0)
methodologyVersion   = versión de @vscar/methodology (curvas de utilidad, umbrales, pesos, reglas "for you")
dataSnapshotVersion  = { vehicles: '2026-09-23', energyPrices: '2026-09-22', marketRules: 'ES-2026.2' }
```
Mostrado al pie del resultado compartido: *"Calculated using Engine 1.3 · Methodology 2026.1 · Vehicle dataset 2026-09-23 · Energy prices 2026-09-22"*. Permite responder "¿por qué cambió esta comparación?" con un diff por capa. Las páginas SEO se recalculan al cambiar cualquiera de las tres y registran la versión.

- **Aislamiento publicitario**: el Decision Engine no importa ni recibe datos del Advertising Engine (regla de lint de dependencias + test).

## 14. Fuel Savings Engine (Energy Engine – ICE/HEV)

```
cons_mix   = city% · city_cons + hwy% · hwy_cons        (fallback: combined)
litres/yr  = annual_km · cons_mix / 100
cost/yr    = litres/yr · fuel_price_local
cost/100km = cons_mix · fuel_price ; cost/mile = conversión
cost/1000km (o /1000 mi) = indicador universal destacado en UI ("COST TO DRIVE 1,000 KM")
monthly    = cost/yr / 12 ; 3y, 5y = cost/yr · N   (MVP sin inflación; What-if con escalado opcional)
Δ          = diferencia entre vehículos (absoluta y %)
```
Ejemplo §5: 6,1 vs 4,8 L/100 km, 18.000 km → 1.098 L vs 864 L → Δ 234 L/año → a 1,65 €/L = **386 €/año, 1.158 € a 3 años, 1.931 € a 5 años**. Toda salida incluye `assumptions[]` y `trace[]` para el panel *How we calculated this*.

## 15. Range Engine

- ICE: `tank_L × 100 / cons_mix`.
- BEV: `usable_kWh × 100 / cons_kWh_100km × factor(escenario)`; factores highway/winter **ESTIMATED** y parametrizados (tabla editable con fuente/justificación), nunca presentados como oficiales.
- PHEV: rango eléctrico + rango combustión; % eléctrico esperado del usuario.
- Tipos: `official_range`, `estimated_range`, `city_range`, `highway_range`, `winter_range`, `user_adjusted_range`.
- Viaje: `stops = ceil((trip_km − first_leg_km) / leg_km)` con `leg_km` EV en ventana 10–80 % y `first_leg` desde 100 % (o % de salida del usuario). Tiempo de carga desde `dc_10_80_min` (curva si existe). Madrid–París (~1.270 km) como ejemplo SEO. Integración con rutas/cargadores reales: Later (§56).

## 16. EV / PHEV Engine

```
kWh_grid/yr = annual_km · cons_kWh_100km / 100 / charging_efficiency   (η por defecto 0,90 AC, ESTIMATED, editable)
price_mix   = home% · home_price + public_AC% · ac_price + public_DC% · dc_price
cost/yr     = kWh_grid/yr · price_mix
sessions/mo = (annual_km/12) / (usable_kWh · 0,7 · 100 / cons)   (sesiones típicas 10→80 %)
PHEV:  e = % eléctrico (usuario o estimado por distancia diaria vs rango eléctrico)
       energía = e·km·kWh/100/η  +  (1−e)·km·L_charge_sustaining/100
```
Clave diferencial: **nunca usar la cifra WLTP ponderada del PHEV** (p. ej. 1,0 L/100 km) para coste; usar consumo en *charge-sustaining* + % eléctrico real.

### 16.1 BEV / PHEV usados (v0.4)

| Campo | Fuente | Regla |
|---|---|---|
| `battery_health_pct` (SOH) | USER PROVIDED (informe del vendedor/taller) | Si no existe → **UNKNOWN**; nunca se rellena con una estimación como si fuera un hecho |
| `battery_warranty_remaining` (años/km) | Garantía original (OFFICIAL) − edad/km de la unidad → CALCULATED | Si faltan fecha o km → UNKNOWN |
| `battery_age` | `registration_year` → CALCULATED | — |
| `usable_capacity_estimate` | `usable_kWh_ref × SOH` solo si SOH es conocido → CALCULATED | Sin SOH → se usa la capacidad de referencia, marcada "capacidad de un coche nuevo; la unidad real puede ser menor" y confianza reducida |
| `degradation_estimate` | Solo con metodología publicada (estudios de flotas) → **ESTIMATED**, como rango | Nunca como dato de la unidad |
| Rendimiento de carga | Referencia (OFFICIAL); nota si la degradación puede afectarlo | — |
| Riesgo de sustitución de batería | Solo si existen datos fiables por modelo/generación | Si no, no se muestra |

El Range Engine usa `usable_capacity_estimate` cuando hay SOH ("Autonomía estimada de esta unidad: 385 km con 91 % SOH — CALCULATED") y la de referencia en otro caso, siempre etiquetado.

## 17. TCO Engine

Horizontes 1/3/5/8 años. Componentes con etiqueta de procedencia:
`Purchase (precio + impuestos matriculación + registro − incentivos) · Financing (opcional, TAE usuario) · Energy · Maintenance (tabla por segmento/powertrain, ESTIMATED) · Insurance (solo si dato viable; si no, "no incluido" explícito) · Road tax (reglas por mercado: IVTM ES orientativo por municipio/potencia fiscal; US por estado → MVP: valor medio + override) · Depreciation → Estimated resale`.
`TCO = Purchase + Financing + Energy + Maintenance + Insurance + Taxes − Resale`.
Depreciación MVP: curvas por segmento × powertrain × mercado, publicadas como metodología; el usuario puede fijar valor residual.

### 17.1 Known vs Estimated (prudencia contra la falsa precisión)

```
VScar KNOWN COST        Purchase · Energy · Taxes (registro + circulación)        → cifra principal en Alpha
ESTIMATED COST          Maintenance · Depreciation/Resale · Insurance · Financing  → bloque separado, badge ESTIMATED
KNOWN 5Y COST           €…
ESTIMATED TOTAL 5Y COST €…   (rango, p. ej. ±12 %, no cifra única)
```
Componentes no disponibles (seguro sin dato viable) se muestran como "no incluido", nunca como 0.

### 17.2 Dos métricas mensuales con nombres distintos desde el día 1

Para no presentar como "coste real" algo que depende de estimaciones:

| Métrica | Fórmula | Naturaleza | Escalón |
|---|---|---|---|
| **Running Cost / Month** (Coste de uso / mes) | (Energy + Taxes anuales + Maintenance *solo si es known*, p. ej. plan de mantenimiento con precio oficial) / 12 | Mayoritariamente CALCULATED sobre datos oficiales | **Alpha** (métrica principal) |
| **Estimated Ownership Cost / Month** (Coste estimado de propiedad / mes) | (Purchase − Resale estimado)/meses + Energy/12 + Maintenance/12 + Taxes/12 [+ Insurance/12] | Contiene ESTIMATED; se muestra como rango | MVP (en Alpha solo como bloque opcional, etiquetado) |

```
RUNNING COST / MONTH — RAV4 Hybrid        166 €/mes    (combustible 142 · impuestos 24)
ESTIMATED OWNERSHIP COST / MONTH          650–740 €/mes  ESTIMATED
  Depreciación estimada 398 · Combustible 142 · Mantenimiento est. 53 · Impuestos 24 · Seguro est. 80
```
Nunca se usa la expresión "coste real mensual" para la segunda. Cada línea lleva badge de procedencia.

### 17.3 Used Vehicle Adjustment Layer (v0.4)

Paquete `@vscar/used-adjustment` (puro, determinista, versionado). **No sustituye** a los engines existentes: toma la reference variant + la Used Vehicle Instance y produce **entradas ajustadas y señales** que consumen Economics, Decision y Quality.

```
inputs:  vehicle_age, mileage, service_history, condition, warranty_remaining, known_reliability*,
         recall_status, maintenance_schedule*, battery_health, asking_price
         (* solo si existe fuente; si no, ausentes)
outputs: purchase_price_override         → Economic Fit (§17.4)
         depreciation_start (edad, valor)  → TCO (§17.4)
         estimated_maintenance (rango)     → TCO / Economic Fit, ESTIMATED
         warranty_status                   → Why not, Ownership Signals
         used_ownership_signals            → Ownership Signals (§13.9B) → Why not, mantenimiento estimado
         used_information_confidence       → (§13.9A) → Recommendation Confidence
         used_instance_completeness        → Quality (§13.7)
         explanation_fragments             → Why not, Practical/Economic explanation
```
Reglas: nunca altera specs técnicas de referencia con fuente (salvo capacidad utilizable EV con SOH conocido, que se presenta como valor derivado de la unidad, no como spec de referencia); todo ajuste lleva procedencia (USER PROVIDED / CALCULATED / ESTIMATED) y aparece en "How we calculated this".

### 17.4 Economic Fit para usados: precio y depreciación

- **`purchase_price_override`**: si el participante es usado, `used_asking_price` (USER PROVIDED) sustituye al precio de lista como entrada económica, conservando ambos para la explicación:
  *"Precio de lista original (2019): 38.000 € (OFFICIAL) · Precio solicitado: 21.500 € (USER PROVIDED) → el cálculo usa 21.500 €."*
- Impuestos de compra de usado según mercado (ES: ITP autonómico sobre valor fiscal, orientativo y editable; en compra a profesional, IVA incluido en precio) en `market_rules`.
- **Depreciación de usados**: no se aplica la curva de un coche nuevo. Se modela con `depreciation_start_age = current_age`, `current_purchase_price = asking_price`, y se proyecta desde el **valor actual** siguiendo el tramo de la curva correspondiente a la edad actual (la pérdida porcentual de un coche de 5 años es menor que la de uno de 0). Sin datos fiables → **rango ESTIMATED**, nunca cifra única. El usuario puede fijar el valor de reventa esperado.
- Mantenimiento: base de referencia por segmento/powertrain × factor por edad/km (**ESTIMATED**, rango) + milestones conocidos con fuente.

### 17.5 Maintenance Milestones (schema preparado; población gradual)

`maintenance_milestones(reference_variant_id | generation_id, type, interval_km, interval_months, source, source_url, confidence)` con tipos: `service_interval`, `timing_belt`, `timing_chain_inspection`, `gearbox_service`, `coolant`, `brake_fluid`, `filters`, `spark_plugs`, `12v_battery`, `hv_battery_check`, etc. En Alpha el schema existe y se puebla solo donde haya fuente fiable (planes de mantenimiento del fabricante). Uso futuro: unidad con 96.000 km y cambio de correa a 100.000 km → *"Major scheduled maintenance may be approaching (manufacturer schedule: timing belt at 100.000 km)."* Solo se muestra con fuente; sin fuente no se dice nada.

## 18. Break-even Engine

```
Δprice   = price_B − price_A  (tras incentivos; con usados, price = asking_price)
Δannual  = running_A − running_B   (energía + mantenimiento + impuestos anuales)
years    = Δprice / Δannual ;  km = Δprice / Δcost_per_km
Δannual ≤ 0  → "nunca se amortiza con este uso"
```
Salida adicional: **curva de break-even vs km/año** (a qué kilometraje compensa en ≤ N años). Pares: gasolina/HEV, HEV/PHEV, ICE/EV, trim/trim, **new vs used**. Ejemplo: +3.500 € / 680 €·año → **5,1 años**. Later: descuento (VPN) y diferencia de residual.

### 18.1 New vs Used (v0.4)

Ejemplo: híbrido usado 25.000 € vs híbrido nuevo 40.000 €. Se muestran por separado:
```
Purchase delta           15.000 €            (USER PROVIDED vs OFFICIAL)
Energy delta             −120 €/año          (CALCULATED; el nuevo consume algo menos)
Maintenance delta        +250 a +600 €/año   (ESTIMATED, el usado)
Warranty                 nuevo: 5 años · usado: expirada / 14 meses
Depreciation exposure    nuevo: mayor pérdida absoluta (ESTIMATED, rango)
```
No se afirma que un usado o un nuevo "se amortiza" sin supuestos: se presentan **escenarios** (horizonte 3/5/8 años × mantenimiento bajo/medio/alto × residual pesimista/central/optimista) y la Sensitivity Analysis indica qué supuesto cambia el resultado. Si el resultado depende de estimaciones, Confidence lo refleja.

## 19. User Preference Engine (Driver Profile)

- Progressive profiling: **3 preguntas iniciales** (país/mercado, km/año, qué importa más: coste/rendimiento/espacio). El resto se pregunta en contexto (p. ej. "¿cargador en casa?" solo si hay un EV en la comparación).
- Todo campo tiene valor por defecto de mercado etiquetado y es sobrescribible.
- **Perfil en lenguaje natural** (§36): la IA devuelve JSON validado por Zod (`km_year: 20000, city_pct: ~, family_size: 4, region: 'ES-MD', trips: [{to:'Valencia', freq:'several/yr'}], priorities: {economy: high, performance: medium-min}`), el usuario confirma los chips antes de aplicar. La IA **no** elige ganador.
- Pesos derivados de prioridades mediante mapeo publicado (high=3, medium=2, low=1 → normalizado).
- **Deal Breakers** como paso explícito y opcional del onboarding ("¿Hay algo imprescindible?": plazas, presupuesto, remolque, cargador, altura de garaje…; y para usados: edad máxima, km máximos, historial completo, garantía restante…), editable en cualquier momento.
- **Tipo de compra (v0.4)**: pregunta opcional *"¿Estás comparando coches nuevos, usados o ambos?"* — **no se obliga a responder al entrar**; se infiere cuando el usuario elige un año anterior o introduce precio/km de una unidad, y se confirma en contexto. Se guarda como `purchase_type: new | used | both`.

### 19.1 Scenario Presets (Alpha)

Un toque en lugar de rellenar sliders; valores editables después ("Custom"):

| Preset | km/año | Ciudad / Carretera | Otros supuestos |
|---|---|---|---|
| **City Driver** | 15.000 | 80 / 20 | trayectos cortos, carga en casa si EV |
| **Commuter** | 25.000 | 40 / 60 | diario autovía |
| **Family Travel** | 20.000 | 50 / 50 | 4–6 viajes largos/año (≥ 400 km) |
| **High Mileage** | 40.000 | 25 / 75 | mayoría carretera |
| **Custom** | — | — | sliders |

Preset de **tipo de compra** (combinable con los de uso):

| Preset | Supuestos |
|---|---|
| **Used Car Buyer** (v0.4) | `purchase_type: used` · propiedad 5 años · precio solicitado manual · **kilometraje requerido** · mantenimiento estimado por edad/km (rango) · sugerencia de deal breakers de usados |

Los presets viven en `@vscar/methodology` (versionados, por mercado: en US en millas y con mix diferente). El preset elegido se registra en analytics (señal de segmento de usuario).

## 20. Tournament Engine → **Engagement Engine** (P1, MVP; no en Alpha)

Se posiciona como herramienta para **descubrir preferencias jugando**, no como motor de decisión.
- Tamaños 4/8 (MVP), 16/32 (Later). Seeding por Personal Fit (o manual).
- **AUTO**: cada match = Decision Engine pairwise; revela los factores con diferencia ≥ MEANINGFUL.
- **PERSONAL**: el usuario elige; se muestran solo los 3–5 factores más diferenciales; tras elegir, "Why?" (Design, Interior, Performance, Price, Brand, Comfort) opcional.
- **Stated vs Observed preference**: se compara la importancia declarada con la revelada en elecciones (p. ej. "Dijiste que prestaciones tenían importancia media, pero en 7 de 8 enfrentamientos elegiste el coche más potente") → pregunta explícita "¿Aumentamos la importancia de prestaciones?". Nunca se actualiza el perfil sin confirmación.
- Actualización acotada (`w ← w + α·signal`, α pequeño, límites [0,5 w0]). Las señales alimentan **Preference Fit**; no afectan a Technical, Economic ni Practical Fit.
- Dato de investigación agregado (anonimizado): brecha stated–observed por segmento/mercado.
- Estado del torneo serializable (URL compartible + imagen del bracket).

## 21. ThreeUI Integration

- **Evaluación obligatoria en Fase 0** de `@designcodeio/threeui`: licencia exacta del paquete y de cada componente (Community vs Pro), mantenimiento, tamaño de bundle, compatibilidad con React 19/Next.js App Router y R3F, SSR-safety. Resultado en `docs/licenses/THIRD_PARTY.md`. **Nada Pro sin licencia**; si la licencia no es clara → implementar efectos propios con Three.js/R3F + drei (MIT).
- Uso selectivo: Landing Hero, VS Intro, Winner Reveal, fondos/gradientes shader en cabeceras de torneo, tarjetas con parallax. **No** en fichas SEO ni tablas.
- Encapsulado en `@vscar/three-effects`: cada efecto expone `<Effect quality="high|low" fallback={<Static2D/>} />`, cargado vía `next/dynamic({ ssr:false })` + IntersectionObserver.
- Modelos 3D de coches reales: **Later** (licencias de modelos/trademark). MVP usa siluetas estilizadas por carrocería + tipografía + luz.

## 22. Motion Design System (VScar Motion Language)

Tokens de movimiento (duración, easing, distancia) en `@vscar/ui/motion`, implementados con Motion (ex Framer Motion):

| Token | Propósito informativo | Reduced-motion |
|---|---|---|
| `vehicle_entry` | Presenta contendiente | fade 150 ms |
| `versus_transition` | Cambio de enfrentamiento | corte directo |
| `stat_reveal` | Barras crecen **proporcionalmente al valor** | valores estáticos |
| `winner_reveal` | Resalta ganador por categoría | badge estático |
| `comparison_shift` | Reordenar al cambiar escenario (layout animation) | sin animación |
| `card_hover`, `scroll_depth`, `tournament_transition`, `garage_add` | feedback/jerarquía | mínimo |

Regla: toda animación debe codificar un dato (magnitud, orden, cambio) o un estado. Máx. 400 ms en interacciones; 1,2 s en reveals.

## 23. Data Visualization

MVP: **Fuel Saving Meter, Ownership Cost Timeline (stacked por componente), Break-even curve, Performance Radar (con cautela: solo 5–6 ejes normalizados), Range bars / distancia sobre mapa esquemático, Energy Cost Graph vs km/año**. Later: Depreciation Curve interactiva, Charging Curve, Cargo Space Visualizer, Dimensions Overlay (§20), Range Map real.
Librería: visx o Recharts (SVG, SSR-friendly, accesibles); todo gráfico con tabla alternativa y botón "Show me the difference".

### 20 (feature). Vehicle Size Visualizer — Later (P2)
Siluetas vectoriales parametrizadas por length/width/height/wheelbase/ground clearance (SVG generado desde specs, sin imágenes con copyright), superposición con opacidad y cotas. Complejidad M; alto valor SEO ("RAV4 vs CR-V size").

## 24. UX/UI

Flujos MVP:
1. **Home** → buscar/elegir 2 coches (búsqueda por familia + generación/año: "Golf 2018" → Golf VII FL) → Car VS (sin registro).
2. **Car VS**: cabecera con 3 ganadores → "¿Para ti?" (3 preguntas) → categorías colapsables → sliders escenario → explicación → compartir/añadir a garage. Cada participante tiene un conmutador **Nuevo / Usado**; en "Usado" aparece una tarjeta compacta (precio solicitado, km, año de matriculación, estado, historial — solo precio y km son necesarios) y los badges USER PROVIDED.
2b. **New vs Used** (entrada directa desde Home y calculadora): "¿Nuevo o usado?" — elegir el mismo modelo en dos años (o dos modelos) → precio/km del usado → resultado con Break-even New vs Used, Ownership Signals, Information Confidence y Sensitivity.
3. **Calculadoras** standalone (entrada SEO) → CTA "Compara con coches reales".
4. **Tournament**: elegir 4/8 (o sugerencia por segmento/presupuesto) → Auto/Personal → final → share card.
Principios: primero la respuesta, luego el detalle; un control por decisión; mobile-first; cada cifra con badge de procedencia.

### 49 (Design System) — ver también §22
`@vscar/ui` en tres capas: **Basic UI** (tokens color/tipografía/espaciado, botones, cards, estados, formularios; Tailwind v4 + Radix primitives/shadcn), **Motion UI** (tokens §22), **3D UI** (`@vscar/three-effects`). Storybook para documentación. Iconografía: Lucide (ISC). Imágenes de vehículo: siluetas propias (§40).

## 25. Accessibility

WCAG 2.2 AA: navegación completa por teclado (bracket incluido), `aria-live` para resultados recalculados, contraste AA en tokens (validado en CI), `prefers-reduced-motion` respetado globalmente, canvas 3D `aria-hidden` con contenido equivalente en DOM, gráficos con tabla alternativa, sliders con input numérico. Tests: axe en Playwright + revisión manual con lector de pantalla por release.

## 26. Performance

Budgets (p75 móvil, CrUX/RUM):

| Métrica | Páginas SEO | Páginas interactivas (VS/Tournament) |
|---|---|---|
| LCP | ≤ 2,0 s | ≤ 2,5 s |
| INP | ≤ 150 ms | ≤ 200 ms |
| CLS | ≤ 0,05 | ≤ 0,1 |
| JS inicial (gzip) | ≤ 130 KB | ≤ 200 KB |
| Chunk 3D (Three+R3F+efectos, gzip) | 0 | ≤ 250 KB, diferido tras LCP |
| Lighthouse | ≥ 95 | ≥ 90 |

Técnicas: RSC/SSG/ISR para contenido, Edge cache en Cloudflare, `next/dynamic` + IntersectionObserver para 3D, `size-limit` y Lighthouse CI como gates en PR. **Selector de calidad**: `high` / `low` (menos partículas, sin postprocesado, DPR ≤ 1,5) / `2d` según `prefers-reduced-motion`, `saveData`, `effectiveType`, `deviceMemory`, `hardwareConcurrency`, soporte WebGL2 y FPS medido en los primeros 2 s.

## 27. Internationalization (i18n)

- `next-intl` con mensajes ICU por namespace (`vehicle.range`, `comparison.best_for_you`…). Lint que prohíbe literales en JSX.
- Idiomas MVP: **en, es**; estructura lista para de, fr, it, pt; RTL (ar) soportado por CSS logical properties desde el día 1.
- Flujo de traducción: fuente en `en`, `es` revisado por humano; IA como borrador (§36) con revisión obligatoria antes de publicar páginas SEO.

## 28. Localization (l10n)

**Locale ≠ Market ≠ Unit system**: tres ajustes independientes.
- `Intl.NumberFormat/DateTimeFormat` para números, fechas, moneda.
- `@vscar/units`: conversiones L/100km ↔ MPG US ↔ MPG UK, kWh/100km ↔ mi/kWh ↔ MPGe, km↔mi, kW↔hp/CV/PS, N·m↔lb-ft, L↔ft³.
- Terminología por mercado (maletero VDA vs SAE, "CV" en ES, "hp" en US).
- Defaults: ES → km, L/100 km, kW(CV), €; US → miles, MPG, hp, $; UK (later) → miles, MPG UK, £.

### 25-bis. Market Context Engine
Resuelve `MarketContext { country, region?, currency, units, energyPrices, taxRules, availableVariants, incentives }` a partir del segmento `{market}` de la URL; la sugerencia inicial sigue la prioridad: selección manual > configuración guardada > idioma del navegador > (opcional, con consentimiento) geolocalización aproximada. Nunca bloquea funcionalidad. Todos los queries de catálogo filtran por `market` obligatoriamente (enforced en repositorio de datos).

## 29. Worldwide SEO

- URLs: **`/{lang}-{market}/…`** — el prefijo codifica **idioma y mercado por separado** (decisión definitiva antes de publicar; cambiar URLs después es costoso para SEO):
  - Alpha: `/es-es/comparar/toyota-rav4-hybrid-vs-honda-cr-v-hybrid`, `/en-es/compare/…` (inglés con datos de España).
  - MVP: `/en-us/compare/…`, `/es-us/comparar/…`.
  - Later: `/en-gb/`, `/de-de/`, `/fr-fr/`, `/es-mx/`, `/pt-pt/`…
  - Segmento de ruta localizado por idioma (`compare`/`comparar`/`vergleich`), slug de vehículo estable.
  - hreflang solo entre páginas **del mismo mercado** en distintos idiomas (`es-ES` ↔ `en-ES`); páginas de mercados distintos no son traducciones entre sí (contenido distinto: variantes, precios, unidades) → sin hreflang cruzado salvo que el contenido sea equivalente. `x-default` → selector de mercado.
  - `/` raíz: selector de mercado/idioma con sugerencia por `Accept-Language` (sin redirección forzada por IP, para no bloquear crawlers ni usuarios).
- Internamente `locale` y `market` son parámetros independientes de la ruta (`app/[lang]-[market]/…`), validados contra la lista de combinaciones activas.
- Canonical: orden de par normalizado (alfabético o por popularidad fija); el inverso redirige 301.
- **Identidad histórica en URLs (v0.4)**: comparaciones con año/generación → `/es-es/comparar/toyota-rav4-2020-vs-honda-cr-v-2021`; fichas agrupadas **por generación** con años asociados → `/es-es/volkswagen/golf/mk7/` (con secciones por facelift/año, no una página por año). Las Used Vehicle Instances nunca generan URL indexable; las comparaciones compartidas con usados usan `/s/{slug}` con `noindex`.
- Metadata, JSON-LD (`Product`/`Car`, `FAQPage` cuando hay FAQ real, `BreadcrumbList`) y sitemaps segmentados por locale y tipo.
- Contenido crítico renderizado en HTML servidor; la capa 3D nunca contiene texto indexable.

## 30. Programmatic SEO

Tipos: Vehicle (por generación), Comparison (mismo año, **cross-year**, **same model different year**), Category/Segment, Powertrain, Use Case (**incl. usados**), Calculator (**incl. New vs Used**).

**Ampliación new + used (v0.4)** — ejemplos de páginas con demanda a validar: *RAV4 2026 vs CR-V 2026* · *RAV4 2020 vs CR-V 2021* · *Golf 2018 vs León 2020* · *BMW X1 2019 vs Tiguan 2021* · *Model 3 usado vs EV nuevo* · *calculadora nuevo vs usado* · *¿Merece la pena un RAV4 2020 hoy?* · *mejor SUV híbrido usado* · *mejor eléctrico usado*.
**No se indexan automáticamente todas las combinaciones año × modelo**. Una página histórica solo se crea si tiene **demanda**, **datos suficientes** (quality gate), **valor añadido** (cálculos propios: coste de uso, break-even vs nuevo, contexto de ciclo/protocolo) y **comparación útil**; si no, se agrupa por generación o se deja `noindex`. Objetivo: evitar *thin historical pages*.
**Quality gate** antes de indexar (`seo_pages.status`): `seo_eligibility` de `@vscar/quality` (§13.7 — misma métrica que la ficha y la confianza, incluidas claves críticas), ambos vehículos disponibles en el mercado, cálculos propios presentes (running cost/mes, coste por 1.000 km, break-even, autonomía, sensibilidad), texto revisado; si no → `noindex`.
Selección de pares: demanda real (Search Console, herramientas de keywords, co-búsqueda) + mismo segmento. Alpha: ~30–50 comparaciones; MVP: ~200–400 comparaciones y ~80 fichas por idioma-mercado, no combinatoria completa.

## 31. Content Strategy

1. Calculadoras (§29 del brief): Fuel Cost, EV Cost, Hybrid Break-even, Range, TCO, Annual Driving Cost, **New vs Used Calculator** (v0.4) (Depreciation later). **Primeras en publicarse** (validan demanda sin catálogo completo).
2. Guías "Use case": "Best family SUV hybrid 2026", "Cheapest EV to run in Spain", "Hybrid vs petrol: 5-year cost", **"Best used hybrid SUV"**, **"Qué mirar en un eléctrico usado (SOH, garantía de batería)"**, **"Premium usado vs generalista nuevo"**.
3. Página de **Metodología** pública (clave para E-E-A-T y confianza).
4. Contenido redactado con asistencia IA pero con cifras procedentes solo de engines y revisión humana.

## 32. API Architecture

API-first, contrato **OpenAPI generado desde Zod**, versionado `/api/v1`. MVP: Route Handlers de Next.js que llaman a los packages (extraíble a `apps/api` —Hono/Fastify— cuando haya B2B o móvil).

```
GET  /v1/markets                      GET  /v1/vehicles?market=&q=&segment=&year=&generation=
GET  /v1/vehicles/{id}                GET  /v1/energy-prices?market=&region=
GET  /v1/families/{id}/generations    GET  /v1/generations/{id}   (facelifts, años, variants)
GET  /v1/vehicles/resolve?market=&q=golf+2018   → generación/facelift + variants candidatas
POST /v1/compare   (participants: [{ referenceVariantId, usedInstance?: {...} }])
POST /v1/calculate/used-adjustment    POST /v1/calculate/new-vs-used
POST /v1/calculate/energy-cost
POST /v1/calculate/range              POST /v1/calculate/tco
POST /v1/calculate/break-even         POST /v1/recommend
POST /v1/profile/parse  (IA)          POST /v1/tournaments   GET /v1/tournaments/{id}
POST /v1/share          GET /v1/share/{slug}
```
Los cálculos son puros → en cliente se ejecutan también localmente para sliders instantáneos; el servidor es la fuente para SEO, share y API pública.

## 33. Database Architecture

**Alpha: MySQL existente en el VPS** + **Drizzle ORM (dialecto MySQL)** + migraciones versionadas. Ver *Recommended database schema* al final.

- Base de datos propia **`vscar_db`**, usuario **`vscar_app`** con permisos **solo** sobre `vscar_db`. No se comparten tablas con AutoTrader ni con otros proyectos.
- Sin tipos ni extensiones exclusivas de PostgreSQL: JSON nativo de MySQL para campos JSON; arrays como JSON o tablas puente; UUID como **`CHAR(36)`** en Alpha (`BINARY(16)` solo si se decide por ADR). Sin optimizaciones prematuras.
- **Independencia del motor (regla obligatoria)**: `decision-engine`, `economics-engine`, `comparison-engine`, `range-engine` y `used-adjustment` **nunca consultan MySQL directamente**. Flujo: `Engine ← Repository/Service ← Drizzle ← MySQL`. Los engines reciben objetos del dominio ya cargados; esto permite migrar a PostgreSQL en el futuro sin reescribir engines (regla de lint: los paquetes de engine no pueden importar `@vscar/db` ni drivers).
- La vista materializada `variant_specs_current` se implementa como **tabla derivada** recalculada por el worker tras cada ingestión (MySQL no tiene vistas materializadas).

### 33.1 Storage strategy del dataset

| Nivel | Contenido | Ubicación |
|---|---|---|
| **MySQL** (normalizado) | manufacturers, models, generations, facelifts, reference_variants, spec_values, prices, sources, safety, recalls, quality, comparisons, snapshots, jobs | `vscar_db` |
| **Filesystem** (bruto) | descargas EEA, MITECO, ESIOS, fichas de fabricante, importaciones manuales | `C:\vscar\data\raw\{eea,miteco,esios,manufacturers,imports}\` → procesados en `C:\vscar\data\processed\` |

Cada ingestión registra en `raw_ingest`: fuente, `retrieved_at`, nombre de fichero/identificador original, **hash**, estado de importación y ruta en disco. Objetivo: poder **reconstruir o auditar** el dataset. Los raw se comprimen y tienen retención definida (§44.6).

### 33.2 VScar Dataset como activo estratégico

**VScar Dataset es un activo estratégico propio.** El objetivo no es depender de una API externa como fuente única: las fuentes externas alimentan el dataset mediante adapters y provenance.
```text
Source → Raw ingest → Validation → Normalization → Conflict detection → Human review (cuando aplique) → VScar Dataset
```
Cuando en el futuro se integre JATO, DataForce, CarAPI, Autovista u otro proveedor, será **otra fuente/adaptador**, no el sistema central.

### 33.3 Git vs datos

- **Git contiene**: código, schemas, methodology, migrations, fixtures, tests.
- **Git NO contiene**: dataset productivo completo, archivos descargados masivos, backups, secretos, logs, dumps.
- `fixtures/` contiene únicamente **muestras pequeñas y reproducibles** para tests. Los datos productivos no viven dentro del repositorio.

## 34. Frontend Architecture

Next.js (App Router, RSC) + React + TypeScript strict + Tailwind v4 + Radix/shadcn + Motion + visx/Recharts; Three.js + React Three Fiber + drei (+ ThreeUI si licencia OK) solo en islas dinámicas. Estado: URL como fuente de verdad del escenario (`?km=18000&city=40&fuel=1.65`) → compartible y cacheable; Zustand para estado UI local. Formularios con react-hook-form + Zod.

**Carga mínima del VPS**: SSR/SSG donde convenga, páginas SEO renderizadas en servidor (con caché IIS/Cloudflare), client islands para sliders y comparación. **Cálculos en el navegador**: los engines TypeScript puros (Fuel Cost, EV Cost, Range, Break-even, Meaningful Difference, What If, Sensitivity, scoring) se ejecutan en cliente; al mover sliders **no se hace request al servidor en cada cambio** — se calcula localmente y solo se guarda/sincroniza cuando es necesario (share, guardar, página SEO). Reduce CPU, latencia, coste y dependencia del backend. El servidor recalcula con los mismos engines (y mismas versiones) para SEO y snapshots compartidos.

## 35. Backend Architecture

- Alpha: Node/TypeScript únicamente — **VScarWeb** (Next.js: páginas + route handlers `/api/v1` + `/admin`) y **VScarWorker** (servicio Node para jobs internos). Ambos como servicios NSSM (§44).
- **Tareas programadas**: **Windows Task Scheduler** — actualización MITECO, ESIOS, ingestión EEA, calidad del dataset, snapshots, backups, tareas SEO programadas. Las pesadas (ETL/importaciones) de noche.
- **Cola interna** (si hace falta): tabla MySQL ligera `jobs(id, type, payload, status, attempts, run_at, locked_at, started_at, finished_at, error, created_at)`. El worker hace polling controlado, lock (`locked_at` + `SELECT … FOR UPDATE SKIP LOCKED` o update condicional), reintentos con backoff y estado `failed`/`dead`. **Sin RabbitMQ, Kafka ni otra cola en Alpha.**
- **Caché**: in-memory en proceso + caché HTTP (IIS/Cloudflare). **Memurai** existe en el servidor pero **no se usa en Alpha** salvo necesidad real (otros proyectos dependen de él); si se usa Later: prefijo `vscar:*`, configuración/credenciales separadas si es posible y ADR.
- Rate limiting Alpha: in-memory por IP en VScarWeb + reglas de Cloudflare (single instance, suficiente para Alpha).
- Python FastAPI: **Later**, solo si aparecen modelos de depreciación/ML que lo justifiquen.
- **Búsqueda Alpha**: índices MySQL sobre columnas normalizadas (marca, modelo, generación, año, alias), `FULLTEXT` solo si realmente aporta, y búsqueda ligera en aplicación; incluye la resolución "modelo + año" → generación/facelift. Con 50–80 reference variants no se necesita buscador externo; buscador especializado (Typesense/Meilisearch/OpenSearch) **Later**, cuando el catálogo alcance miles de variantes.

### Vehicle Update Engine (§34 del brief)
Adapters → `raw_ingest` (payload + hash) → normalización → validación Zod → diff contra `spec_values` actual → nuevos registros (nunca update destructivo) → Conflict Engine → `revalidateTag` de páginas afectadas. Frecuencias: precios energía diario/semanal; precios vehículo semanal; specs mensual/por evento; recalls diario (US).

### Data Conflict Engine (§32 del brief)
Conflicto = ≥2 valores vigentes para (variant, spec_key, test_cycle) con Δ > tolerancia. Se guardan todos; se selecciona el "display value" por prioridad `OFFICIAL gov > OFFICIAL manufacturer > VERIFIED > commercial > ESTIMATED`, luego recencia; se registra en `data_conflicts` para revisión en panel admin.

## 36. AI Architecture

- Proveedor: Claude API. **Extracción de perfil NL** con `claude-haiku-4-5` + salida estructurada (tool/JSON schema) validada con Zod; **explicaciones/resúmenes** con `claude-sonnet-5`, alimentados solo con el JSON de resultados de engines.
- Guardrails: la IA no recibe permiso para emitir cifras que no estén en el payload del engine; post-validación que detecta números en la respuesta y los contrasta con el payload.
- **Ask VScar** (Later): agente con tool use cuyas herramientas son los endpoints `/calculate/*` y `/compare`.
- Traducción asistida y borradores de contenido con revisión humana obligatoria.
- Caché de explicaciones por (comparación, escenario redondeado, locale) para control de coste.

## 37. Mobile Strategy

No app en MVP. Preparación: engines y schema en packages puros sin dependencias DOM/Node; API versionada; auth estándar (OAuth/magic link con tokens). Fase 12: Expo + React Native reutilizando `@vscar/*` engines, i18n y tokens de diseño. PWA instalable como paso intermedio (bajo coste).

## 38. Security

Auth: en Alpha solo `/admin` (usuarios editor/admin, sesión segura, contraseña fuerte + 2FA o acceso restringido por Cloudflare Access/IP); cuentas de usuario final con Auth.js (magic link + Google) en MVP; roles `user | editor | admin`. Autorización en capa de repositorio. Rate limiting por IP en endpoints de cálculo/compare (in-memory en Alpha; distribuido si hay varias instancias) y reglas de Cloudflare. Bot protection: Cloudflare WAF (+ Turnstile en formularios). API keys B2B (Later) con hash y scopes. Secretos en `C:\vscar\config\` fuera del repo (`.env` **sin BOM UTF-8**, permisos NTFS restringidos a la cuenta del servicio), rotación. Backups: ver §44.4 (P0). Monitoring: logs estructurados propios + health checks + uptime externo; Sentry opcional. Audit log de ediciones de datos (quién cambió qué spec) en `audit_log`.

## 39. Privacy

GDPR/LOPDGDD (ES), CCPA/CPRA (US). Minimización: el perfil funciona sin cuenta (localStorage). Geolocalización solo con consentimiento explícito y aproximada (país/región). CMP certificada **IAB TCF v2.2** (requisito de Google para AdSense en EEE/UK). Analytics con consentimiento o en modo sin cookies. Texto NL del perfil: no se almacena por defecto; retención definida. **Datos de anuncios (v0.4)**: si el usuario introduce datos de un anuncio, se guardan solo los necesarios para el cálculo (precio, km, año, estado); **no se almacena la URL del anuncio ni datos del vendedor** salvo acción explícita del usuario (p. ej. guardar en garage), y nunca datos personales de vendedores (nombre, teléfono, matrícula, VIN completo). Los snapshots compartidos no incluyen URL de anuncio. Registro de actividades de tratamiento y DPA con subprocesadores (hosting, IA, analytics).

## 40. Licensing

| Área | Decisión |
|---|---|
| Marcas de fabricantes | Uso nominativo de nombres; **no logos** en MVP; disclaimer de no afiliación |
| Imágenes de vehículos | **No usar fotos de prensa/terceros** sin licencia. MVP: siluetas vectoriales propias por carrocería. Later: proveedor licenciado (p. ej. imágenes estandarizadas comerciales) |
| Datos | Respetar licencias de cada fuente; atribución (EPA, NHTSA, EEA — CC BY 4.0 —, Open Charge Map — CC BY-SA/condiciones propias); no extraer bases de competidores (derecho sui generis UE) |
| Componentes | Inventario automático de licencias (license-checker en CI); ThreeUI documentado en `THIRD_PARTY.md`; nada Pro sin licencia |
| Afiliación/publicidad | Disclosure visible (FTC, LSSI/normativa UE); etiqueta "Patrocinado" separada de resultados |

## 41. Analytics

PostHog (product analytics + funnels + feature flags; EU cloud) o Plausible + eventos propios. Eventos: `vehicle_search, vehicle_view, comparison_start, comparison_complete, profile_step, fuel_calculation, range_calculation, tco_calculation, breakeven_calculation, scenario_change, explanation_open, tournament_start, tournament_complete, garage_add, share, share_open, lead`.

Eventos adicionales: `decision_confidence_before`, `decision_confidence_after`, `initial_choice_declared`, `final_choice_declared`, `confidence_panel_open`, `known_vs_estimated_toggle`.
Eventos new + used (v0.4): `purchase_type_selected`, `used_price_entered`, `mileage_entered`, `new_vs_used_comparison`, `same_model_different_year`, `used_vs_used`, `new_vs_new`, `used_risk_panel_open`, `used_deal_breaker_set`.

**Jerarquía de métricas**

| Nivel | Métrica | Definición |
|---|---|---|
| **North Star** | **High-Intent Decision Sessions (HIDS)** | Sesión con ≥2 vehículos + ≥1 personalización (perfil o escenario) + comparación o torneo completado |
| Producto | **Personalized Comparison Completion Rate** | comparaciones completadas con personalización / comparaciones iniciadas |
| Valor | **Decision Confidence Delta** | Micro-pregunta al inicio y al final: "¿Qué tan seguro estás de tu elección? (0–10)" → Δ medio (p. ej. 4 → 8 = +4) |
| Valor | **Decision Change Rate** | % de sesiones donde la elección final declarada ≠ elección inicial declarada. No implica que B sea "mejor": indica que la herramienta aportó información suficiente para modificar la decisión |
| Soporte | uso de sliders/What If, apertura de "How we calculated this", share rate y K-factor, retorno 7/30 días, ranking de páginas | — |

Las preguntas de confianza/elección son opcionales, de un toque, y se muestran a una muestra de sesiones para no degradar la experiencia.

**Métricas new + used (v0.4)**: % de comparaciones con ≥ 1 usado · % new vs used · % cross-year (años distintos) · % de usuarios que introducen precio solicitado · completion rate usados vs nuevos · Decision Confidence Delta segmentado (con usados / solo nuevos). Objetivo: medir qué proporción de usuarios compara realmente usados antes de invertir más en esa capa.

## 42. Viral Growth

Share card generada en servidor (`next/og` / Satori): "MY CAR FINAL — Model Y vs EV6 — Winner for me: EV6 — 58 €/mes menos de uso · Faster charging · Practical Fit PASS · Confidence HIGH · stable unless < 7.400 km/año". Optimizada para WhatsApp/Telegram (OG 1200×630 + vertical 1080×1920 descargable), Reddit/foros (URL con resumen textual en HTML), X/Facebook. El enlace abre el mismo escenario (inputs en snapshot inmutable + `engineVersion` + `methodologyVersion` + `dataSnapshotVersion`); si hay datos más recientes, se ofrece "Recalcular con datos actuales" mostrando qué cambió. CTA: "¿Y para ti? Cambia tus km".

## 43. Monetization

Fases: 1) AdSense (fuera de la zona de resultados) → 2) publicidad premium + afiliación → 3) seguros/financiación/renting → 4) leads a concesionarios → 5) marketplace → 6) B2B API/widgets/SaaS.
**Muro técnico**: `advertising` es un package sin acceso al Decision Engine; tests que garantizan que los rankings son idénticos con/sin contexto publicitario; política editorial pública.

## 44. Infrastructure

Principio: **use the infrastructure we already own until scale proves otherwise.**

### 44.1 VPS existente (infraestructura Alpha)

| Recurso | Valor |
|---|---|
| Sistema operativo | **Windows Server 2022** |
| CPU | 6 vCPU AMD EPYC |
| RAM | 12 GB (≈ 4,8 GB libres actualmente; reservar **≥ 1 GB** de colchón para Windows y servicios existentes) |
| Disco | 200 GB SSD (≈ 153 GB libres) |
| Servicios existentes | IIS (80/443), MySQL (3306), Memurai (6379), varios procesos Node, workers Python, MT5, otros proyectos (p. ej. AutoTrader) |
| Puertos ocupados | 80, 443, 3000, 3001, 3010, 3306, 6379, 8081, 8082, 8083 |

**Reglas operativas del VPS**: servicios Node/Python mediante **NSSM** · logs en carpetas propias · bases y usuarios MySQL propios · dominio propio en IIS · reverse proxy desde IIS · evitar BOM UTF-8 en `.env` · **no instalar Docker, Elasticsearch, otro motor de base de datos, Redis adicional ni servicios pesados innecesarios** · no interferir con AutoTrader ni otros sitios.

### 44.2 Arquitectura Alpha

```text
Internet
   ↓
Cloudflare (Free): DNS / proxy / CDN / WAF básico / caching
   ↓
Windows Server 2022
   ↓
IIS 80/443  (site propio de VScar, reglas rewrite independientes)
   ↓  reverse proxy (URL Rewrite + ARR)
VScarWeb — Next.js + Node (standalone)  → 127.0.0.1:4100   (incluye /api/v1 y /admin)
   ↓
MySQL existente → vscar_db (usuario vscar_app)

VScarWorker — Node (NSSM, sin puerto público; health opcional 127.0.0.1:8180)
Windows Task Scheduler — tareas programadas (ETL, snapshots, backups, SEO)
```

- **Cloudflare**: capa externa, tier **Free** salvo necesidad posterior. No forma parte del Decision Engine ni de la lógica de negocio.
- **Admin**: **no se crea app separada en Alpha**; ruta `/admin` dentro de VScarWeb, protegida (§38).
- **IIS**: site/app propio para VScar (dominio a definir), `80/443 → reverse proxy → 127.0.0.1:4100`, sin tocar la configuración de otros sitios.

### 44.3 Servicios NSSM

| Servicio | Proceso | Bind / Puerto | Configuración NSSM |
|---|---|---|---|
| **VScarWeb** | Next.js production server (Node standalone) | **127.0.0.1:4100** (nunca expuesto públicamente) | auto start · restart on failure · stdout/stderr → `C:\vscar\logs\web\` |
| **VScarWorker** | Servicio Node (jobs internos, cola MySQL) | sin puerto público · health opcional **127.0.0.1:8180** | auto start · restart on failure · stdout/stderr → `C:\vscar\logs\worker\` |

### 44.4 Backups (P0)

- **MySQL**: backup diario de `vscar_db` con `mysqldump` + compresión + hash/verificación. Retención inicial: **7 diarios, 4 semanales, 6 mensuales**.
- **Copia fuera del VPS**: Cloudflare R2 o Backblaze B2 (coste Alpha ~1–5 €/mes). Es uno de los pocos costes externos obligatorios recomendados.
- También se respaldan `C:\vscar\config\` (cifrado) y los raw necesarios para reconstruir el dataset.
- Prueba de restauración periódica (al menos mensual) documentada.

### 44.5 Estructura de directorios del servidor

```text
C:\vscar\
├── app\            (despliegue del código; o estructura de repos existente si se decide por ADR)
├── data\
│   ├── raw\        (eea\, miteco\, esios\, manufacturers\, imports\)
│   └── processed\
├── logs\           (web\, worker\, imports\)
├── backups\
├── scripts\        (deploy, backup, tareas programadas)
└── config\         (.env sin BOM, fuera de Git)
```
Los datos productivos **no** viven dentro del repositorio Git.

### 44.6 Logs, disco y lifecycle

- Carpetas propias: `C:\vscar\logs\web\`, `C:\vscar\logs\worker\`, `C:\vscar\logs\imports\`. Rotación de **14–30 días** con tamaño máximo configurable; errores importantes retenidos más tiempo si es necesario. No llenar disco con logs.
- Disco: ≈ 153 GB libres; el dataset Alpha ocupará una fracción mínima. Límites: logs rotados · raw ingest comprimido o con retención · backups con política · imágenes/OG optimizadas. **Ningún archivo sin política de lifecycle.**

### 44.7 Presupuesto de recursos Alpha

| Componente | RAM |
|---|---|
| VScarWeb | 250–500 MB |
| VScarWorker | 100–250 MB |
| IIS adicional | 50–150 MB |
| Caches / overhead de app | 100–200 MB |
| **Objetivo total VScar** | **≤ 1,5 GB** (ideal **~500 MB–1,1 GB**) |

Se mantiene al menos ~1 GB de colchón general para Windows y servicios existentes. Si la memoria disponible cae de forma sostenida por debajo del colchón: **optimizar antes de añadir servicios**. CPU (6 vCPU) no es restricción inicial: los engines son cálculos ligeros y se ejecutan mayormente en navegador; ETL/importaciones pesadas se programan de noche.

### 44.8 Alternativas futuras (no Alpha)

Vercel, Neon, Supabase, Upstash, Fly.io, Railway, Docker, PostgreSQL gestionado, Redis dedicado y buscadores especializados quedan solo como **alternativas futuras** si la escala lo justifica, siempre mediante ADR.

## 45. Cost Estimates (EUR/mes, orden de magnitud, sin salarios)

### 45.1 Existing infrastructure — Alpha (coste incremental real)

| Concepto | Coste incremental |
|---|---|
| Hosting adicional (VPS existente) | 0 € |
| Base de datos (MySQL existente) | 0 € |
| Cola (Task Scheduler + tabla MySQL) | 0 € |
| Redis | 0 € |
| Búsqueda (MySQL) | 0 € |
| APIs de vehículos comerciales | 0 € |
| IA | 0 € en Alpha |
| Mapas | 0 € |
| Cloudflare (Free) | 0 € |
| Backup externo (R2/B2) | ~1–5 €/mes |
| Dominio | aparte |
| **Total incremental esperado** | **~1–10 €/mes**, excluyendo dominio y costes humanos |

### 45.2 Future scale (estimaciones independientes, no aplican al Alpha)

Escenarios de referencia si en el futuro se migra parcial o totalmente a servicios gestionados (decisión por ADR según escala real):

| Concepto | MVP (gestionado) | 10k MAU | 100k | 1M | 10M |
|---|---|---|---|---|---|
| Hosting/compute | 0–20 | 20–50 | 100–300 | 800–2.500 | 6k–20k |
| Base de datos | 0–25 | 25–70 | 70–250 | 400–1.500 | 3k–10k |
| CDN/WAF/R2 | 0–5 | 5–20 | 20–100 | 200–800 | 2k–6k |
| Redis/colas | 0 | 0–10 | 10–50 | 100–400 | 1k–3k |
| Búsqueda | 0 (DB) | 0 | 0–50 | 100–500 (buscador dedicado) | 1k–4k |
| IA (perfil NL + explicaciones, cacheado) | 5–20 | 20–80 | 150–600 | 1.2k–5k | 10k–40k |
| Analytics/monitoring | 0 | 0–50 | 50–300 | 500–2k | 3k–10k |
| Assets 3D/almacenamiento | 0–5 | 5 | 10–30 | 50–200 | 300–1k |
| **Datos de vehículos** | 0 (oficial + manual) | 0 | 0–1k | 2k–10k (licencias) | 10k–40k+ |
| **Total aprox.** | **≈ 20–100** | **≈ 80–300** | **≈ 0,5–2,5k** | **≈ 5–23k** | **≈ 40–135k** |

Nota: mientras el VPS existente soporte la carga (RAM ≤ 1,5 GB para VScar, sin degradar otros servicios), el MVP puede seguir sobre la misma infraestructura con coste incremental cercano al de Alpha; la tabla anterior solo aplica cuando la escala justifique migrar. Además, el coste dominante serán las **licencias de datos**, probablemente **mucho antes de 1M MAU** (en cuanto se amplíe a mercados sin datos oficiales gratuitos equivalentes o se necesiten residuales/precios multimercado). Es la mayor incógnita económica del proyecto; la matriz de derechos (§10.1) debe incluir presupuestos reales de 2–3 proveedores comerciales antes de cerrar el plan de MVP.

## 46. Risks

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Calidad/cobertura de datos insuficiente | Alta | Crítico | Catálogo pequeño curado, procedencia, gate de completitud |
| Coste/derechos de licencias de datos (antes de 1M MAU) | Alta | Crítico | Workstream Data Acquisition (§10.1) con matriz de derechos antes del frontend; oficial primero; negociar por mercado |
| Alpha demasiado grande | Media | Alto | Alcance Alpha cerrado (§8.1): 1 mercado público, 15–25 familias / 50–80 reference variants, sin torneo/IA/cuenta, usados solo manuales |
| **Carga de curación histórica** (2010+, generaciones, facelifts, precios originales) mayor de lo previsto | Alta | Alto | Selección por Popularity × Used-Market Volume × Comparison Demand; 2–4 años por familia; reducir periodos con baja cobertura en vez de imputar; plantillas de curación por generación |
| **Ciclos NEDC vs WLTP** mal comparados | Media | Alto | `testCycle` obligatorio; NOT DIRECTLY COMPARABLE sin metodología publicada; test de invariante |
| **Estimaciones de usados** (mantenimiento, depreciación, SOH) percibidas como hechos | Media | Crítico | Rangos ESTIMATED, Information Confidence separada de Ownership Signals, sin scores de fiabilidad, SOH solo USER PROVIDED o UNKNOWN |
| **Expectativa de marketplace** (usuarios esperan anuncios/valoración) | Media | Medio | Posicionamiento claro "decisión, no venta"; valoración de mercado como Later con proveedor licenciado |
| Seguridad NCAP de protocolos distintos comparada como igual | Media | Alto | `protocolVersion`+`testYear`; sin score histórico único |
| Tentación de scraping de anuncios | Media | Crítico (legal) | Prohibido; solo API/partnership/feeds licenciados/crawling permitido, Later |
| Curvas de utilidad y umbrales mal calibrados | Media | Alto | Valores iniciales públicos y versionados; calibración con entrevistas y datos de uso; tests de "resultados absurdos" |
| SEO programático visto como thin content | Media | Alto | Quality gate, cálculos únicos, indexación progresiva |
| Competencia fuerte en US (Edmunds, KBB) | Alta | Medio | Nicho: personalización, PHEV/EV, torneo, explicabilidad |
| 3D degrada rendimiento/SEO | Media | Alto | Budgets en CI, islas diferidas, fallback 2D |
| Licencia ThreeUI inadecuada | Media | Bajo | Efectos propios con Three/R3F (MIT) |
| IA alucina cifras | Media | Crítico | IA sin autoridad numérica + validación post-respuesta |
| Riesgo legal por imágenes/marcas | Media | Alto | Siluetas propias, uso nominativo, sin logos |
| Estimaciones (depreciación, invierno) percibidas como oficiales | Media | Alto | Etiquetas de procedencia siempre visibles |
| Scope creep | Alta | Alto | Principio de baseline (sustituir + ADR) y §49 "What NOT to build yet" como contrato |
| Recursos del VPS compartido (RAM, interferencia con AutoTrader/otros) | Media | Alto | Presupuesto ≤ 1,5 GB, colchón ≥ 1 GB, bind 127.0.0.1, puertos propios (4100/8180), site IIS y BD propios, ETL nocturno, monitorización de memoria |
| Punto único de fallo (un solo VPS) | Media | Alto | Backups P0 diarios fuera del VPS (R2/B2) con prueba de restauración; Cloudflare cachea páginas SEO; plan de migración documentado por ADR |
| Calendario por curación histórica | Alta | Alto | Dataset Core v0.1 primero, data workstream desde semana 1, target 12 semanas con planning range 12–16, lanzar con ≥ 50 variants de calidad |

## 47. Roadmap

Secuencia de ejecución oficial de la baseline v1.0:

1. Project baseline v1.0.
2. DATA_RIGHTS_MATRIX.
3. SpecKey Catalog v0.1.
4. **Dataset Core v0.1 — 10 vehicles.**
5. Monorepo + CI.
6. MySQL schema.
7. Methodology + Quality.
8. Economics Engine.
9. Calculators live.
10. Grow dataset to 50–80 variants.
11. Comparison Engine.
12. Used Adjustment.
13. Decision Engine.
14. UX Car VS.
15. Alpha Spain.
16. Learn.
17. Go/no-go MVP.

**El data workstream corre en paralelo desde el punto 2** (no espera a las semanas 7–8).

Fases (detalle orientativo):

| Fase | Contenido | Duración orientativa |
|---|---|---|
| 0 Validation | Entrevistas (10–15, incl. compradores de usado), análisis keywords ES (incl. "modelo año", "usado"), **selección de familias y generaciones prioritarias**, landing + 2 calculadoras en producción, evaluación ThreeUI; **arranque Data Acquisition + matriz de derechos con cobertura histórica + SpecKey Catalog + Dataset Core v0.1** | 2–3 sem |
| 1 Vehicle schema | `vehicle-schema` (generación/facelift, ReferenceVariant, UsedVehicleInstance), unidades, procedencia, quality, schema MySQL; dataset test US | 2 sem |
| 2 Data acquisition (continuo desde semana 1) | Adapters EEA (histórico)/IDAE/MITECO/ESIOS (+EPA para test US), Dataset Core (10) → **50–80 reference variants históricas ES**, `/admin` mínimo | en paralelo semanas 1–10 |
| 3 Comparison Engine | alineación, ciclos NEDC/WLTP, protocolo NCAP, Meaningful Difference, cobertura | 1,5–2 sem |
| 4 Economics Engine | energy, coste/1.000 km, range, break-even (incl. new vs used), Known Cost, Running Cost / Month, price override, scenarios + presets | 2,5 sem |
| 5 Decision Engine | Deal Breakers (incl. usados), utilidades, Technical Capability, Economic Fit@H, Practical Fit con estado, Used Adjustment + Information Confidence + Ownership Signals, Why not, Sensitivity, Confidence | 3 sem |
| 6 UX prototype + **Alpha** | Car VS con Nuevo/Usado, New vs Used, What If, share, SEO inicial, test con usuarios → **lanzamiento Alpha ES** | 2–3 sem |
| 6b Alpha learning | medir PCCR, Confidence Delta, Decision Change Rate; decisión go/no-go MVP | 3–4 sem (en paralelo con 7) |
| 7 Visual layer | Motion system + 3 efectos 3D con fallback | 2 sem |
| 8 MVP launch | US público, catálogo ampliado por familias, TCO Estimated, Preference Fit, NL profile, Tournament, cuenta/garage, used layer ampliado (milestones con fuente, recalls por generación) | 6–8 sem |
| 9 SEO | pSEO comparaciones + fichas + Search Console loop | continuo |
| 10 International | UK/DE/FR + de/fr | tras validación |
| 11 Monetization | AdSense → afiliación | tras tráfico |
| 12 Mobile | Expo | tras retención demostrada |

## 48. First 90 Days

Ver *Recommended first 90-day roadmap* al final.

## 49. What NOT to build yet

**En Alpha además**: US público · Tournament · cuentas · explicaciones IA · TCO con depreciación como cifra principal · capa 3D.
**Usados — fuera de Alpha (v0.4)**: integración con marketplaces (AutoScout24, coches.net, mobile.de, AutoTrader…) · **scraping de anuncios (nunca; Later solo API, partnership, feeds licenciados o crawling permitido)** · live listings · integración con concesionarios · valoración automática de mercado · predicción completa de mantenimiento · VIN decode completo · informes de inspección / marketplace de inspecciones · proveedores de historial de vehículo · historial de accidentes automatizado · comparación de financiación · cotizaciones de seguro. **No se crea "VScar New" y "VScar Used"**: una sola plataforma, mismos engines.
**Infraestructura — not needed for Alpha (v1.0)**: Docker en este VPS · PostgreSQL paralelo · Redis/Memurai dedicado a VScar · Elasticsearch · Typesense · Meilisearch · Kubernetes · microservicios · servidor separado para admin · plataforma cloud adicional sin necesidad. No significa que estén prohibidos para siempre: solo **no se necesitan para Alpha**; cualquier incorporación requiere ADR.
**En ningún escalón inicial**: App móvil nativa · Ask VScar chat completo · Road Trip Compare con rutas y cargadores reales · Modelos 3D de coches reales · Vehicle Size Visualizer y Cargo Visualizer · Torneos 16/32 · Marketplace, leads, seguros · API pública B2B · Python/ML de depreciación · Typesense/OpenSearch · Más de 2 mercados / 2 idiomas · Alertas de precio/recall (solo guardar histórico desde el día 1) · Auto-traducción masiva de páginas · Microservicios / Kubernetes · Integración con proveedores de datos comerciales antes de validar.

## 50. Final Technical Recommendation

**Alpha**
- TypeScript monorepo · pnpm + Turborepo
- Next.js App Router · Node.js
- Windows Server 2022 (VPS existente) · IIS reverse proxy · servicios NSSM (VScarWeb 127.0.0.1:4100, VScarWorker)
- MySQL existente (`vscar_db`) + Drizzle
- Windows Task Scheduler · tabla ligera de jobs en MySQL
- Cloudflare Free
- Backups offsite R2/B2
- Engines TypeScript puros, deterministas y versionados, sin I/O · cálculos en navegador
- **Sin** Docker · **sin** PostgreSQL adicional · **sin** Redis adicional · **sin** buscador externo
- IA fuera de Alpha (Claude para NL→estructura y explicaciones desde MVP)
- Three.js/R3F/ThreeUI fuera del critical path

Contrato OpenAPI desde Zod para extraer la API y alimentar móvil/B2B más adelante. Principio: **use the infrastructure we already own until scale proves otherwise.**

Secuencia: **Data rights (incl. histórico) → Alpha ES new + used (cálculos personalizados + confianza) → validar → MVP (US, TCO estimado, preferencias, torneo, 3D)**. Principio de producto: **new + used, same decision engine**; la capa de usados (`@vscar/used-adjustment`) complementa, nunca bifurca. Invertir el 60 % del esfuerzo en datos + engines + calidad/explicabilidad; ≤ 15 % en capa visual.

---

## Tabla de metadatos por componente

| # | Componente | Prio | MVP/Later | Compl. | Esfuerzo | Infra €/mes | Negocio | SEO | Usuario | Dependencias | Riesgo principal |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 10.1 | Data Acquisition Strategy + DATA_RIGHTS_MATRIX | P0 | **Alpha** (Fase 0) | M | 3 sp + legal | 0 | ●●● | ●●● | ●●● | — | derechos de republicación |
| 5 | Market Context Engine | P0 | **Alpha** (ES público + US test) · MVP (US público) | M | 1,5 sp | ~0 | ●●● | ●●○ | ●●● | schema, energy prices | mezclar mercados |
| 9 | Vehicle Data Architecture (generación/facelift, Reference vs Used) | P0 | **Alpha** | L | 3 sp | DB | ●●● | ●●● | ●●● | — | modelo rígido |
| 11 | Canonical Vehicle Schema + VScar ID (canonicalKey con generación/facelift) | P0 | **Alpha** | M | 2,5 sp | 0 | ●●● | ●●○ | ●●○ | — | sobre-ingeniería |
| 10 | Data Sources / Adapters (incl. EEA histórico) | P0 | **Alpha** (ES oficiales + EPA test) · MVP (US completo) | L | 3,5 sp | 0 | ●●● | ●●● | ●●● | schema, 10.1 | cobertura, ToS |
| 9.3 | Curación catálogo histórico (15–25 familias, 50–80 variants) | P0 | **Alpha** | L | 5–6 sp (curador + ingeniería) | 0 | ●●● | ●●● | ●●● | 10.1, schema | carga de curación |
| 9.2 | Used Vehicle Instance manual (efímera) | P0 | **Alpha** · persistente MVP | S | 1 sp | 0 | ●●● | ●○○ | ●●● | schema | inputs incompletos |
| 17.3 | Used Vehicle Adjustment Layer (`@vscar/used-adjustment`) | P0 | **Alpha** (básico) · MVP (ampliado) | M | 2 sp | 0 | ●●● | ●●○ | ●●● | economics, quality | ajustes arbitrarios |
| 13.9 | Used Information Confidence + Used Ownership Signals | P0 | **Alpha** | S | 1 sp | 0 | ●●○ | ●○○ | ●●● | used-adjustment, quality | confundir información con fiabilidad |
| 17.4 | Price override + depreciación desde valor actual | P0 | **Alpha** (override) · MVP (depreciación usados completa) | S | 1 sp | 0 | ●●● | ●●○ | ●●● | TCO | falsa precisión |
| 18.1 | Break-even New vs Used | P0 | **Alpha** | S | 0,5 sp | 0 | ●●● | ●●● | ●●● | break-even, used-adjustment | "se amortiza" sin supuestos |
| 16.1 | EV/PHEV usados (SOH, garantía batería) | P1 | **Alpha** (campos + UNKNOWN) · MVP | S | 0,5 sp | 0 | ●●○ | ●●○ | ●●● | EV engine | degradación como hecho |
| 12-cyc | Ciclos NEDC/WLTP/EPA + NCAP por protocolo | P0 | **Alpha** | M | 1 sp | 0 | ●●● | ●●○ | ●●● | schema, methodology | comparaciones inválidas |
| 17.5 | Maintenance Milestones | P2 | schema **Alpha** · datos MVP/Later | M | 0,5 sp schema · 2+ sp datos | 0 | ●●○ | ●●○ | ●●● | fuentes con licencia | datos sin fuente |
| — | Valoración automática de mercado / marketplaces / VIN / historial | P3 | Later | XL | — | licencias | ●●● | ●●○ | ●●● | partnerships | legal, coste |
| — | Provenance + Conflict Engine | P0 | **Alpha** (básico) | M | 1,5 sp | 0 | ●●● | ●●○ | ●●● | schema | complejidad UI |
| — | Historical data / Update Engine | P1 | **Alpha** (append-only) · ETL completo Later | M | 1,5 sp | jobs | ●●○ | ●○○ | ●○○ | adapters | deuda de datos |
| 13.8 | Versionado engine/methodology/data | P0 | **Alpha** | S | 0,5 sp | 0 | ●●○ | ●○○ | ●●○ | schema | olvidar versionar |
| — | `@vscar/methodology` (curvas, umbrales, pesos, presets) | P0 | **Alpha** | M | 1,5 sp | 0 | ●●● | ●●○ | ●●● | schema | calibración |
| 13.7 | Data Completeness Score + claves críticas | P0 | **Alpha** | S | 1 sp | 0 | ●●● | ●●● | ●●○ | methodology | premiar cantidad sobre importancia |
| 14 | Fuel Savings Engine + coste/1.000 km | P0 | **Alpha** | S | 1 sp | 0 | ●●● | ●●● | ●●● | energy prices | precios obsoletos |
| 16 | EV/PHEV Engine | P0 | **Alpha** | M | 1,5 sp | 0 | ●●● | ●●● | ●●● | energy prices | % eléctrico PHEV |
| 15 | Range Engine | P0 | **Alpha** | M | 1,5 sp | 0 | ●●○ | ●●● | ●●● | schema | factores estimados |
| 18 | Break-even Engine | P0 | **Alpha** | S | 0,5 sp | 0 | ●●● | ●●● | ●●● | energy | Δ≤0 mal explicado |
| — | Scenario / What If + Presets | P0 | **Alpha** | S | 1 sp | 0 | ●●○ | ●●○ | ●●● | engines puros, methodology | rendimiento cliente |
| 17 | TCO Engine | P0 | **Alpha** (Known Cost) · MVP (Estimated completo) | L | 1 sp + 2 sp | 0 | ●●● | ●●● | ●●● | tax rules, depreciación | depreciación estimada |
| 17.2 | Running Cost / Month · Estimated Ownership Cost / Month | P0 | **Alpha** (Running) · MVP (Ownership) | S | 0,5 sp | 0 | ●●● | ●●● | ●●● | TCO | falsa precisión |
| 12 | Comparison Engine | P0 | **Alpha** | M | 2 sp | 0 | ●●● | ●●● | ●●● | schema | ciclos no comparables |
| 12.1 | Meaningful Difference | P0 | **Alpha** | S | 1 sp | 0 | ●●○ | ●●○ | ●●● | methodology | umbrales mal calibrados |
| 12.2 | Meaningful For You | P1 | **Alpha** (reglas básicas) · MVP (completo) | M | 1 sp | 0 | ●●○ | ●○○ | ●●● | perfil, methodology | reglas arbitrarias |
| 12.3 | Segment baseline | P2 | engine preparado en **Alpha** · visible MVP | S | 0,5 sp | 0 | ●○○ | ●●○ | ●●○ | catálogo suficiente | mediana poco representativa |
| 13.3 | Deal Breakers | P0 | **Alpha** | S | 1 sp | 0 | ●●● | ●○○ | ●●● | perfil | dato faltante (UNKNOWN) |
| 13 | Decision Engine (utilidades, Tech Capability, Economic Fit@H, Practical Fit con estado) | P0 | **Alpha** · MVP (Preference Fit) | L | 3 sp | 0 | ●●● | ●●○ | ●●● | comparison, economics | curvas discutibles |
| 13.4 | Why not this car? | P0 | **Alpha** | S | 0,5 sp | 0 | ●●● | ●●○ | ●●● | decision | listas poco relevantes |
| 13.5 | Sensitivity Analysis / Result Robustness | P0 | **Alpha** | M | 1,5 sp | 0 | ●●● | ●●● | ●●● | engines puros | rangos plausibles mal definidos |
| 13.6 | Recommendation Confidence | P0 | **Alpha** | S | 1 sp | 0 | ●●● | ●●○ | ●●● | quality, sensitivity | falsa exactitud |
| 19 | User Preference Engine (3 preguntas) | P0 | **Alpha** | S | 1 sp | 0 | ●●● | ●○○ | ●●● | decision | onboarding largo |
| 19b | NL profile (IA) + Preference Fit | P1 | MVP | M | 2 sp | IA 5–20 | ●●○ | ●○○ | ●●● | AI, decision | extracción errónea |
| 20 | Tournament / Engagement Engine | P1 | MVP (4/8) | M | 2 sp | 0 | ●●○ | ●○○ | ●●○ | decision | gimmick |
| 23 | Data Visualization | P0 | **Alpha** (4 gráficos) · MVP (6+) | M | 2 sp | 0 | ●●● | ●●○ | ●●● | engines | gráficos engañosos |
| 24 | UX/UI | P0 | **Alpha** | L | 3 sp | 0 | ●●● | ●●○ | ●●● | engines | sobrecarga de información |
| 49 | Design System (Basic UI) | P0 | **Alpha** | M | 1,5 sp | 0 | ●●○ | ○○○ | ●●○ | — | — |
| 22 | Motion Design System | P1 | **Alpha** (básico) · MVP | M | 1,5 sp | 0 | ●●○ | ○○○ | ●●○ | design system | exceso decorativo |
| 21 | ThreeUI / 3D UI | P2 | MVP selectivo | M | 2 sp | 0 | ●●○ | ○○○ | ●●○ | licencia | rendimiento/licencia |
| 20b | Vehicle Size Visualizer | P2 | Later | M | 2 sp | 0 | ●●○ | ●●● | ●●○ | dimensiones | datos incompletos |
| 25 | Accessibility | P0 | **Alpha** | M | continuo | 0 | ●●○ | ●○○ | ●●● | UI | canvas inaccesible |
| 26 | Performance | P0 | **Alpha** | M | continuo | 0 | ●●● | ●●● | ●●● | frontend | 3D |
| 27 | i18n | P0 | **Alpha** (es/en) | S | 1 sp | 0 | ●●● | ●●● | ●●○ | — | literales hardcoded |
| 28 | l10n / units | P0 | **Alpha** | M | 1,5 sp | 0 | ●●● | ●●○ | ●●● | schema | conversiones MPG |
| 29 | Worldwide SEO (`/{lang}-{market}/`) | P0 | **Alpha** | M | 1,5 sp | 0 | ●●● | ●●● | ●○○ | i18n | hreflang incorrecto |
| 30 | Programmatic SEO | P0 | **Alpha** (30–50 gated) · MVP (200–400) | M | 1 sp + 1 sp | ISR | ●●● | ●●● | ●●○ | datos, engines, quality | thin content |
| 31 | Content Strategy / Calculadoras | P0 | **Alpha** (primero, semana 6) | S | 2 sp | 0 | ●●● | ●●● | ●●○ | engines | — |
| 32 | API Architecture | P0 | **Alpha** (interna) | M | 1 sp | 0 | ●●○ | ○○○ | ●○○ | engines | acoplamiento a Next |
| 33 | Database Architecture — **MySQL existing** (`vscar_db`) + Drizzle | P0 | **Alpha** | M | 2 sp | ~0 incremental | ●●● | ●○○ | ●○○ | schema | EAV lento → tabla derivada; acoplar engines a MySQL |
| 33.1 | Dataset storage (MySQL normalizado + raw en filesystem) | P0 | **Alpha** | S | 1 sp | 0 | ●●● | ●○○ | ●○○ | 33 | raw sin lifecycle |
| 9.4 | Dataset Core v0.1 (10 reference variants) | P0 | **Alpha** (semanas 1–4) | M | 2 sp (incl. curación) | 0 | ●●● | ●●○ | ●●● | 10.1, SpecKey Catalog | cobertura insuficiente de casos |
| 35-q | Queue — **Task Scheduler + MySQL jobs** | P0 | **Alpha** | S | 1 sp | 0 | ●●○ | ○○○ | ○○○ | 33 | jobs bloqueados sin reintento |
| 35-s | Search — **MySQL** (índices + alias) | P0 | **Alpha** | S | 0,5 sp | 0 | ●●○ | ●○○ | ●●○ | 33 | resolución "modelo año" imprecisa |
| 44.4 | **Backups** (mysqldump diario → R2/B2) | **P0** | **Alpha** | S | 0,5 sp | ~1–5 €/mes | ●●● | ○○○ | ○○○ | 44 | restauración no probada |
| 44-cf | Cloudflare — **Free** | P0 | **Alpha** | S | 0,25 sp | 0 | ●●○ | ●●○ | ●○○ | dominio | reglas de caché incorrectas |
| 34 | Frontend Architecture | P0 | **Alpha** | M | 1,5 sp | 0–20 | ●●○ | ●●● | ●●● | — | — |
| 35 | Backend / Worker (VScarWeb + VScarWorker, NSSM) | P0 | **Alpha** | M | 1,5 sp | 0 | ●●○ | ○○○ | ○○○ | DB | jobs fallidos silenciosos |
| 36 | AI Architecture | P1 | MVP (NL + explicaciones) · Ask VScar Later | M | 2 sp | 5–20 | ●●○ | ●○○ | ●●● | engines | alucinación |
| 38 | Security | P0 | **Alpha** (básico) · MVP (auth) | M | 1,5 sp | 0–20 | ●●○ | ○○○ | ●●○ | — | abuso de endpoints |
| 39 | Privacy | P0 | **Alpha** | S | 1 sp | CMP 0–30 | ●●○ | ○○○ | ●●○ | — | multas |
| 40 | Licensing | P0 | **Alpha** | S | 1 sp | 0 | ●●○ | ○○○ | ○○○ | 10.1 | imágenes/marcas |
| 41 | Analytics + métricas de valor | P0 | **Alpha** | S | 1 sp | 0 | ●●● | ○○○ | ○○○ | — | sin consentimiento |
| 42 | Share / Viral | P0 | **Alpha** | M | 1,5 sp | 0–5 | ●●● | ●●○ | ●●○ | engines, OG, versionado | snapshots inconsistentes |
| 39b | My Garage | P1 | **Alpha** (favoritos locales) · MVP (cuenta) | S | 0,5 + 1 sp | 0 | ●●○ | ○○○ | ●●○ | auth | — |
| 44 | Infrastructure — **VPS existing** (Windows Server 2022, IIS, NSSM) | P0 | **Alpha** | S | 1,5 sp | **~0 incremental** | ●●○ | ●●○ | ○○○ | — | RAM compartida, punto único de fallo |
| 43 | Monetization | P2 | Later (AdSense al final MVP) | S→XL | 1 sp inicial | 0 | ●●● | ○○○ | ○○○ | tráfico, CMP | sesgo percibido |
| 37 | Mobile | P3 | Later | L | 8–12 sp | — | ●●○ | ○○○ | ●●○ | API | prematuro |
| 56 | Road Trip Compare | P2 | Later | XL | 6+ sp | APIs rutas | ●●○ | ●●● | ●●● | range, cargadores | coste APIs |
| — | Ask VScar chat | P2 | Later | L | 3 sp | IA ↑ | ●●○ | ●○○ | ●●● | API, AI | alucinación |

**Total estimado**: **Alpha ≈ 45–52 sp** (v0.3: 35–40 sp; +10–12 sp por new + used: curación histórica, schema generación/facelift, used-adjustment, risk profile, ciclos/protocolos, new vs used) → **target 12 semanas · planning range 12–16** con 3 ingenieros + curador de datos a tiempo casi completo desde la semana 1 (data workstream en paralelo) · **MVP completo ≈ 95–110 sp acumulados** (≈ +8–10 semanas tras Alpha). "Alpha" implica también MVP.

---

## Recommended MVP architecture

**Alpha (baseline v1.0) — VPS existente**

```text
Internet
   ↓
Cloudflare Free (DNS · proxy · CDN · WAF básico · caching)
   ↓
Windows Server 2022 (VPS existente)
   ↓
IIS 80/443 — site propio VScar — URL Rewrite + ARR (reverse proxy)
   ↓
VScarWeb (NSSM) — Next.js App Router + Node standalone — 127.0.0.1:4100
   ├─ RSC/SSG/ISR pages (SEO, HTML servidor)
   ├─ Client islands: sliders, charts, comparación (engines TS puros en navegador)
   ├─ /api/v1/* route handlers ──► packages/* engines (pure TS) ◄── Repository/Service ◄── Drizzle
   └─ /admin (protegido)
   ↓
MySQL existente — vscar_db (usuario vscar_app)

VScarWorker (NSSM, sin puerto público; health 127.0.0.1:8180)
   └─ tabla jobs (MySQL) · adapters EEA · IDAE · MITECO · ESIOS (+ EPA/NHTSA solo test US)
Windows Task Scheduler ─► ETL nocturno · snapshots · calidad · backups (mysqldump → R2/B2) · tareas SEO
Filesystem ─► C:\vscar\data\raw\ · C:\vscar\logs\ · C:\vscar\backups\ · C:\vscar\config\
```

MVP: misma base; se añaden cuentas (Auth.js), IA (Claude API) y analytics de producto. Migración a servicios gestionados solo si la escala lo justifica (ADR).

## Recommended database schema (MySQL 8 existente, núcleo Alpha/MVP)

Notación conceptual (no DDL final). Convenciones MySQL: UUID `CHAR(36)` (VScar ID; `BINARY(16)` solo por ADR); `JSON` nativo para campos JSON; listas como `JSON` o tablas puente (no arrays PostgreSQL); enums como `VARCHAR` + validación Zod; dinero en `BIGINT` (unidades menores); `utf8mb4` + InnoDB. Sin extensiones ni tipos exclusivos de PostgreSQL.

```sql
-- Catálogo (PK = CHAR(36) "VScar ID"; canonical_key legible y único; slug cambiable)
manufacturers(id CHAR(36), canonical_key, slug, name, merged_into_id NULL)
models(id CHAR(36), manufacturer_id, canonical_key, slug, name, segment, merged_into_id NULL)
vehicle_generations(id CHAR(36), model_id, canonical_key, generation_code, production_start, production_end NULL,
                    market_code NULL, slug)                                    -- p. ej. Golf 'mk7'
facelifts(id CHAR(36), generation_id, canonical_key, label, start_date, end_date NULL)  -- p. ej. 'Mk7.5' 2017–2020
markets(code PK 'ES'|'US', currency, default_units JSON, default_lang, public BOOLEAN)
reference_variants(id CHAR(36), canonical_key UNIQUE, generation_id, facelift_id NULL, model_year, market_code,
         trim_name, body_type, powertrain_type, fuel_type, drivetrain, transmission, seats, emissions_standard,
         sales_start NULL, sales_end NULL, slug, catalog_priority DECIMAL,        -- Popularity × Used volume × Demand
         status 'draft'|'published'|'test_fixture', merged_into_id NULL, search_aliases JSON,
         UNIQUE(market_code, slug, model_year), INDEX(market_code, generation_id, model_year))
slug_history(entity_type, entity_id, old_slug, lang, market_code, replaced_at)   -- 301 automáticas
safety_ratings(id, reference_variant_id | generation_id, authority, stars NULL, sub_scores JSON,
               test_year, protocol_version, source_id, source_url)
recalls(id, generation_id | reference_variant_id, authority, reference_code, description, published_at, source_url)
maintenance_milestones(id, reference_variant_id | generation_id, type, interval_km NULL, interval_months NULL,
                       source_id, source_url, confidence)          -- schema en Alpha, población gradual

-- Usados (Alpha: la instancia vive en comparisons.inputs; tablas persistentes desde MVP)
used_vehicle_instances(id CHAR(36), reference_variant_id, owner_user_id NULL, registration_year, mileage_km,
                       asking_price_minor BIGINT, currency, condition, owners NULL, service_history_status,
                       accident_history_status, warranty_remaining_months NULL, inspection_status NULL,
                       battery_health_pct NULL, seller_type NULL, location_region NULL,
                       source 'user'|'licensed_feed', source_url NULL, created_at, retrieved_at NULL)
service_history(id, used_vehicle_instance_id, date NULL, mileage_km NULL, type, source 'user')      -- Later
battery_health_records(id, used_vehicle_instance_id, soh_pct, measured_at NULL, method NULL, source)  -- Later
used_vehicle_observations(id, used_vehicle_instance_id, kind, value JSON, provenance, created_at)   -- Later

-- Metodología y versiones
spec_definitions(key PK, data_type, canonical_unit, category, is_comparable, higher_is_better,
                 is_critical, required_for JSON)                       -- estructural
methodology_versions(version PK, config JSON,    -- utility curves, meaningful_diff, for_you rules, weights,
                     published_at, changelog)     -- completeness weights, presets, rangos plausibles de sensibilidad
data_snapshots(id, kind 'vehicles'|'energy_prices'|'market_rules', market_code, label, created_at)
variant_quality(variant_id PK, completeness, missing_critical JSON, official_share, estimated_share,
                computed_at, methodology_version)

-- Specs con procedencia (append-only)
sources(id, name, kind 'gov'|'manufacturer'|'commercial'|'editorial'|'user', base_url, license, priority)
-- (en todas las tablas, variant_id = reference_variants.id; las instancias usadas nunca tienen spec_values)
spec_values(id, variant_id, spec_key, value_num, value_text, value_bool, unit,
            test_cycle, source_id, source_url, retrieved_at, valid_from, valid_to,
            confidence, status 'OFFICIAL'|'VERIFIED'|'CALCULATED'|'ESTIMATED'|'USER_PROVIDED',
            is_display BOOLEAN, created_at, INDEX(variant_id, spec_key, is_display))
data_conflicts(id, variant_id, spec_key, value_ids JSON, resolution, resolved_by, resolved_at)
raw_ingest(id, source_id, external_id, original_filename, file_path, payload_hash, import_status,
           retrieved_at, imported_at, error NULL)          -- el fichero bruto vive en C:\vscar\data\raw\
variant_specs_current(variant_id PK, ...columnas tipadas...)  -- tabla derivada, recalculada por el worker

-- Jobs (cola ligera Alpha, sin broker externo)
jobs(id, type, payload JSON, status 'queued'|'running'|'done'|'failed'|'dead', attempts, run_at,
     locked_at NULL, started_at NULL, finished_at NULL, error NULL, created_at, INDEX(status, run_at))

-- Precios e histórico
vehicle_prices(id, reference_variant_id, amount_minor BIGINT, currency,
               price_type 'original_list'|'current_new'|'msrp'|'otr',     -- used_asking_price NO va aquí (instancia)
               incl_taxes BOOLEAN, source_id, source_url, valid_from, valid_to)
market_values(id, reference_variant_id, age_years, mileage_band, amount_minor BIGINT, source_id, valid_from)  -- Later, licenciado
energy_prices(id, market_code, region_code, energy_type 'petrol95'|'diesel'|'elec_home'|'elec_public_ac'|'elec_public_dc',
              amount_minor_per_unit, unit, source_id, valid_from)
market_rules(id, market_code, rule_type 'registration_tax'|'road_tax'|'vat'|'incentive'|'used_transfer_tax',
             params JSON, version, valid_from, valid_to, source_url)
estimation_tables(id, kind 'depreciation'|'maintenance'|'range_factor', market_code, segment,
                  powertrain_type, params JSON, methodology_url, version)

-- Usuarios y producto
users(id CHAR(36), email, locale, role 'user'|'editor'|'admin', created_at)   -- Alpha: solo editor/admin (/admin)
driver_profiles(id, user_id, data JSON, version, updated_at)
garage_items(id, user_id, variant_id, used_vehicle_instance_id NULL, kind 'favorite', created_at)
comparisons(id CHAR(36), user_id NULL, lang, market_code, variant_ids JSON,
            inputs JSON,             -- incluye participants[].usedInstance efímera (sin listing_url ni datos de vendedor)
            purchase_mix 'new_new'|'used_used'|'new_used', cross_year BOOLEAN, preset NULL, deal_breakers JSON,
            engine_version, methodology_version, data_snapshot JSON,   -- {vehicles, energyPrices, marketRules}
            result_snapshot JSON, confidence_level, confidence_internal, completeness, created_at)
decision_feedback(id, session_id, comparison_id, initial_choice_variant_id NULL, final_choice_variant_id NULL,
                  confidence_before SMALLINT NULL, confidence_after SMALLINT NULL, created_at)
tournaments(id CHAR(36), user_id NULL, mode 'auto'|'personal', size, state JSON, engine_version, methodology_version, data_snapshot JSON, created_at)
tournament_matches(id, tournament_id, round, a_variant_id, b_variant_id, winner_variant_id, reasons JSON)
preference_events(id, user_id NULL, session_id, source 'tournament'|'profile', payload JSON, created_at)
shares(slug PK, kind 'comparison'|'tournament', ref_id, og_image_url, created_at)

-- SEO / operación
seo_pages(id, lang, market_code, type, slug, variant_ids JSON, completeness, missing_critical JSON,
          status 'draft'|'indexable'|'noindex', engine_version, methodology_version, data_snapshot JSON, last_built_at)
audit_log(id, actor_id, entity, entity_id, action, diff JSON, created_at)
```

Regla: los engines no ven este schema; reciben objetos de dominio desde repositorios (`packages/db`), lo que permite migrar a PostgreSQL sin reescribirlos.

## Recommended repository structure

```
vscar/
├─ apps/
│  ├─ web/                  # Next.js (UI + /api/v1 route handlers + /admin protegido) → NSSM VScarWeb :4100
│  └─ worker/               # Node: cola MySQL (jobs), ETL, precios, OG images, revalidación → NSSM VScarWorker
│                           # (sin apps/admin separada en Alpha)
├─ packages/
│  ├─ vehicle-schema/       # Zod schemas, SpecKey catalog, tipos, OpenAPI
│  ├─ units/                # conversiones y formateo por sistema de unidades
│  ├─ market-context/       # resolución de mercado, defaults, reglas fiscales
│  ├─ economics-engine/     # energy (ICE/EV/PHEV), TCO, break-even, scenarios
│  ├─ range-engine/
│  ├─ comparison-engine/
│  ├─ methodology/          # curvas de utilidad, meaningful differences, reglas "for you", pesos, presets,
│  │                        #   rangos de sensibilidad, completeness weights — versionado independiente (methodologyVersion)
│  ├─ decision-engine/      # deal breakers, scores, fit status, why-not, sensibilidad, confianza, torneo
│  │                        #   (depende de methodology; nunca contiene constantes metodológicas)
│  ├─ quality/              # Data Completeness Score único + claves críticas: referencia, instancia usada, categoría, comparación, SEO
│  ├─ used-adjustment/      # Used Vehicle Adjustment Layer + Information Confidence + Ownership Signals (puro; complementa, no sustituye engines)
│  ├─ data-connectors/      # adapters EPA, EEA, MITECO, EIA, ESIOS, NHTSA
│  ├─ db/                   # Drizzle (MySQL) schema, migraciones, repositorios (filtro market obligatorio);
│  │                        #   único paquete que habla con MySQL — los engines nunca lo importan
│  ├─ i18n/                 # mensajes ICU en, es
│  ├─ ui/                   # design system (Basic + Motion)
│  ├─ three-effects/        # 3D UI con fallback 2D
│  ├─ ai/                   # prompts, schemas NL→perfil, validación de cifras
│  ├─ analytics/            # tipos de eventos + cliente
│  └─ advertising/          # aislado (lint: no importable desde decision-engine)
├─ docs/  (VSCAR_MASTER_PLAN.md, methodology/, data/SPEC_KEY_CATALOG.md, data/DATA_RIGHTS_MATRIX.md,
│          licenses/THIRD_PARTY.md, adr/)
├─ scripts/  (deploy a C:\vscar\app, instalación de servicios NSSM, tareas de Task Scheduler, backup)
├─ fixtures/  (catálogo ES curado por familias/generaciones, dataset test US de 10 variantes,
│              instancias usadas de ejemplo, casos dorados new/used)
├─ turbo.json · pnpm-workspace.yaml · tsconfig.base.json · .github/workflows/
```
Economía de paquetes: `range-engine` y `comparison-engine` pueden empezar dentro de `economics-engine`/`decision-engine` y separarse cuando crezcan.

## Recommended first markets

**Arquitectura ES + US desde el día 1; datos públicos primero solo en España.**
- **Alpha — España público**: mercado local del equipo (entrevistas y validación rápida), WLTP/UE (EEA) reutilizable para el resto de Europa, precios oficiales de combustible por estación (MITECO) y electricidad (ESIOS), competencia débil en herramientas de decisión personalizadas.
- **Alpha — US interno**: dataset de test de 10 variantes (EPA/NHTSA) que obliga a resolver MPG, millas, EPA, USD, hp, lb-ft en tests y CI, sin carga editorial ni páginas públicas.
- **MVP — US público**: mejores datos oficiales gratuitos (EPA, NHTSA, EIA, AFDC), gran volumen de búsqueda; se activa cuando Alpha valida y la matriz de derechos US está cerrada.
- Siguiente: UK (valida MPG UK y £) y DE (mayor mercado UE).

## Recommended first languages

**Spanish + English** (ambos sobre el mercado España en Alpha: `/es-es/`, `/en-es/`; en MVP `/en-us/`, `/es-us/`). Después: German, French → Portuguese, Italian. No retrasar lanzamiento por traducción.

## Recommended vehicle data providers

1. **MVP (0 €)**: EPA fueleconomy.gov (incl. histórico) · NHTSA (vPIC, NCAP, Recalls) · EIA · NREL AFDC (later) · EEA CO₂ monitoring (2010+, NEDC→WLTP) · IDAE · MITECO Geoportal gasolineras · REE/ESIOS · Euro NCAP (citado, con año/protocolo) · Safety Gate EU · fichas/tarifas oficiales de fabricantes (actuales y archivadas) y planes de mantenimiento con curación manual y URL · estadísticas agregadas de mercado (DGT, ANFAC, Ganvam) para priorizar familias.
2. **Post-validación (comercial)**: JATO Dynamics o Chrome Data/J.D. Power (specs/precios multimercado, históricos), Autovista/Eurotax/Ganvam (residuales y **valor de mercado de usados** EU), Black Book/J.D. Power/KBB (residuales y valor de usados US), HaynesPro o Autodata/TecRMI (mantenimiento), EV Database (licencia comercial para datos EV EU). Marketplaces solo vía API/partnership/feed licenciado.
3. Evaluar pero no depender: CarQuery, CarAPI y similares (calidad/licencia variable).

## Recommended development sequence

Alineada con la secuencia oficial de §47 (el data workstream corre en paralelo desde el paso 2):

1. **Project baseline v1.0** (este documento) + backlog de ADRs.
2. **DATA_RIGHTS_MATRIX** (`docs/data/DATA_RIGHTS_MATRIX.md`): cobertura histórica por periodo, ciclos, derechos store/republish/commercial/derive; evaluación (sin contratación) de proveedores comerciales. En paralelo: entrevistas nuevo + usado, keywords ES, selección de familias/generaciones prioritarias, licencias ThreeUI.
3. **SpecKey Catalog v0.1** (`docs/data/SPEC_KEY_CATALOG.md`): claves, unidades canónicas, categoría, `isCritical`, `requiredFor`, ciclo aplicable.
4. **Dataset Core v0.1 — 10 reference variants** reales y distintas (§9.4), con procedencia completa; base de fixtures y casos dorados.
5. **Monorepo + CI** (pnpm + Turborepo; lint, typecheck, test, size-limit, Lighthouse CI; reglas de dependencias: engines sin acceso a `db`, `advertising` aislado).
6. **MySQL schema** (`vscar_db`, Drizzle MySQL, migraciones) + `vehicle-schema` (VScar ID, generación/facelift, ReferenceVariant, UsedVehicleInstance, precios separados, `testCycle`, `protocolVersion`) + `units` + dataset test US.
7. **Methodology + Quality** (`@vscar/methodology` v2026.1: curvas, umbrales, presets incl. Used Car Buyer, reglas de Information Confidence; `@vscar/quality`: reference + used instance completeness, claves críticas).
8. **Economics Engine** (energy ICE/EV/PHEV, coste/1.000 km, break-even incl. new vs used, Known Cost, Running Cost / Month, `purchase_price_override`) con tests de invariantes (fast-check) + casos dorados.
9. **Calculators live** (`/es-es/`, `/en-es/`), incl. New vs Used Calculator, servidas desde VScarWeb en el VPS vía IIS + Cloudflare; cálculos en navegador.
10. **Grow dataset to 50–80 variants** (curación + adapters EEA histórico/IDAE/MITECO/ESIOS en VScarWorker + Task Scheduler; `/admin` mínimo; conflict engine básico; gate de derechos + completitud ≥ 90 % + claves críticas por periodo).
11. **Comparison Engine** (ciclos NEDC/WLTP → NOT DIRECTLY COMPARABLE, NCAP por protocolo, Meaningful Difference + For You básico, segment baseline preparado, tests de simetría) + Range Engine.
12. **Used Adjustment** (Adjustment Layer básico, Used Information Confidence, Used Ownership Signals).
13. **Decision Engine** (Deal Breakers incl. usados, utilidades, Technical Capability independiente de edad/km, Economic Fit@horizonte, Practical Fit con estado, Why not, Sensitivity/Robustness, Recommendation Confidence, explicaciones por plantilla).
14. **UX Car VS** (conmutador Nuevo/Usado, flujo New vs Used, presets, What If, gráficos, panel de confianza, "What would change the result?", share OG con versiones, páginas SEO gated) → test de usabilidad.
15. **Alpha Spain** (lanzamiento + instrumentación: PCCR, Confidence Delta, Decision Change Rate, HIDS, métricas new + used).
16. **Learn** (análisis de métricas + entrevistas post-uso).
17. **Go/no-go MVP** → MVP según §8.2 (US público, catálogo ampliado, used layer ampliado, TCO Estimated, Preference Fit + NL profile, explicaciones IA, Tournament, cuentas/garage), después Motion completo + 3D selectivo, pSEO ampliado y AdSense con CMP.

Operación transversal desde el paso 5: backups P0 (§44.4), logs con rotación (§44.6), presupuesto de RAM (§44.7).

## Recommended first 90-day roadmap

**Target 12 semanas · planning range 12–16.** El data workstream empieza en la semana 1 y corre en paralelo a todo lo demás.

| Semanas | Objetivo | Entregables | Dataset (paralelo) | Criterio de salida |
|---|---|---|---|---|
| 1–2 | **Baseline + derechos + catálogo de claves** | Baseline v1.0, backlog ADR-001…010, **DATA_RIGHTS_MATRIX v1 histórica**, **SpecKey Catalog v0.1**, 12 entrevistas (≥ 5 compradores de usado), keywords ES, familias/generaciones prioritarias, presupuestos de 2–3 proveedores (solo evaluación), informe ThreeUI; alta de `vscar_db`/`vscar_app`, carpetas `C:\vscar\`, backup diario activo | schema provisional + **2 → 5 variants** | Lista provisional de 15–25 familias; % de SpecKeys cubiertas por periodo; go/no-go |
| 3–4 | **Fundaciones + Dataset Core** | Monorepo, CI con budgets, schema MySQL + Drizzle, `vehicle-schema`, `units`, `methodology`, `quality`, i18n es/en, dataset test US; VScarWeb en NSSM (127.0.0.1:4100) tras IIS + Cloudflare | **Dataset Core v0.1 (10)** → 20 | Schema validado con los 10 casos; "Golf 2018" resuelve a Mk7 FL; conversiones US/EU e invariantes verdes |
| 5–6 | **Calculadoras live (new/used)** | Economics engine con invariantes + dorados; adapters MITECO/ESIOS (Task Scheduler); 3–4 calculadoras públicas (incl. New vs Used) con presets y "How we calculated this"; VScarWorker + tabla `jobs` | 30–50 | Calculadoras indexadas; primeras señales de Search Console y uso (% que introduce precio de usado) |
| 7–8 | **Datos + comparación** | Curación con procedencia, ciclo y protocolo NCAP; precios originales; recalls donde haya fuente; conflict engine básico; `/admin`; Completeness visible; Comparison + Range Engine | **50–80** | Completitud ≥ 90 % y 0 claves críticas faltantes en variants publicadas; derechos confirmados |
| 9–10 | **Decisión usado/nuevo** | `used-adjustment` (Information Confidence + Ownership Signals) + Decision Engine completo de Alpha + Recommendation Confidence | consolidación, revisión de calidad | Suites de invariantes, simetría y "resultados absurdos" en verde; 5 usuarios completan una comparación new vs used sin ayuda; **si hay ≥ 50 variants de alta calidad, se lanza con ellas** |
| 11–12 | **Alpha** | UX Car VS completa, share OG con versiones, 30–50 páginas SEO gated (incl. cross-year), instrumentación → **lanzamiento Alpha ES** | mantenimiento | LCP ≤ 2,5 s móvil; axe sin errores; RAM VScar ≤ 1,5 GB; restauración de backup probada; eventos de métricas llegando |
| 13 (o hasta 16) | **Aprender** | Análisis PCCR, Decision Confidence Delta (con/sin usados), Decision Change Rate, % comparaciones con usados, share rate; entrevistas post-uso; backlog MVP priorizado | — | Decisión go/no-go MVP basada en criterios §8.1 |

Flexibilidad: la rampa de variants es orientativa, no un gate rígido; la calidad prima sobre la cantidad. Si la curación histórica consume más de lo previsto se usa el margen del planning range (hasta semana 16) o se lanza con ≥ 50 variants de calidad, reduciendo periodos débiles en vez de imputar.

Después (tras el go/no-go, ≈ +8–10 semanas): MVP según §8.2 — US público, TCO Estimated, Preference Fit, NL profile, Tournament, cuenta/garage, used layer ampliado, capa 3D selectiva.

**Métricas de validación antes de escalar (§60)**: HIDS; Personalized Comparison Completion Rate; Decision Confidence Delta (segmentado por usados); Decision Change Rate; % comparaciones con ≥ 1 usado, % new vs used, % cross-year, % que introduce precio solicitado, completion rate usados vs nuevos; uso de What If y de "How we calculated this"; tasa de share y sesiones generadas por share; retorno 30 días; posiciones de páginas de comparación a 8–12 semanas.

---

## Siguiente paso tras aprobación de v1.0

**Step 1** — Crear `docs/data/SPEC_KEY_CATALOG.md` y `docs/data/DATA_RIGHTS_MATRIX.md`.

**Step 2** — Seleccionar las primeras 10 Reference Variants de **Dataset Core v0.1** (§9.4).

**Step 3** — Scaffold: monorepo · MySQL schema · `vehicle-schema` · `methodology` · `quality` · `economics-engine` (con tests de invariantes, simetría y dorados, y fixtures US de test).

**Step 4** — Crear la primera calculadora pública.

### ADRs iniciales (backlog)

`docs/adr/` — no es necesario escribirlos todos inmediatamente; se crea el índice/backlog y se redactan cuando la decisión se ejecute:

| ADR | Título | Estado |
|---|---|---|
| ADR-001 | vps-first-infrastructure | Propuesto (decisión tomada en baseline) |
| ADR-002 | mysql-alpha | Propuesto (decisión tomada en baseline) |
| ADR-003 | iis-reverse-proxy | Propuesto |
| ADR-004 | no-docker-alpha | Propuesto |
| ADR-005 | lang-market-url | Propuesto (decisión tomada en v0.2) |
| ADR-006 | vscar-id-strategy (UUID `CHAR(36)` vs `BINARY(16)`, canonicalKey) | Propuesto |
| ADR-007 | reference-vs-used-instance | Propuesto (decisión tomada en v0.4) |
| ADR-008 | dataset-storage-strategy (MySQL + raw filesystem) | Propuesto |
| ADR-009 | data-provider-rights | Pendiente de DATA_RIGHTS_MATRIX |
| ADR-010 | threeui-evaluation | Pendiente de evaluación de licencia |

## Testing strategy (engines)

Tres familias obligatorias en CI para todo paquete de cálculo:

**1. Casos dorados** — ejemplos del brief y de la Metodología reproducidos exactamente. Casos new + used (v0.4), cada uno con fixture y resultado esperado versionado:
- **New vs used, mismo modelo**: RAV4 Hybrid 2021 80.000 km 27.500 € vs RAV4 Hybrid 2026 nuevo 42.500 €.
- **Older premium vs newer mainstream**: BMW X3 2018 usado vs Hyundai Tucson 2023 usado.
- **Mismo modelo distinto año**: Golf 2018 (Mk7 FL) vs Golf 2020 (Mk8), con ciclos distintos → NOT DIRECTLY COMPARABLE donde aplique.
- **EV usado con battery health**: Tesla Model 3 2021 SOH 91 % vs BYD Seal 2026 nuevo.
- **Usado sin historial de mantenimiento**: misma unidad con `service_history: unknown` vs `full` → misma Technical Capability, Used Information Confidence y Recommendation Confidence menores.

**2. Invariantes (property-based, fast-check)** — generadores de vehículos/escenarios válidos:
| Engine | Invariante |
|---|---|
| Fuel | `annual_km ↑` ⇒ `annual_cost` nunca baja; `fuel_price ↑` ⇒ coste nunca baja; `consumption ↑` ⇒ coste nunca baja |
| EV | `electricity_price ↑` ⇒ running cost nunca baja; `home_share ↑` con `home_price < public_price` ⇒ coste nunca sube; `η ↓` ⇒ coste nunca baja |
| PHEV | `electric_share` de 0→1 interpola monótonamente entre coste solo-combustible y solo-eléctrico |
| Range | `consumption ↑` con misma batería/depósito ⇒ autonomía nunca aumenta; `usable ↑` ⇒ autonomía nunca baja; paradas de viaje no decrecen con `trip_km ↑` |
| Break-even | `annual_savings ↑` ⇒ `break_even_years` nunca aumenta; `Δprice ↑` ⇒ nunca disminuye; `savings ≤ 0` ⇒ "never" |
| TCO | cada componente ≥ 0 salvo resale; horizonte ↑ ⇒ coste acumulado de uso nunca baja |
| Units | ida y vuelta de conversión (L/100km→MPG→L/100km) con error < 1e-9 relativo |
| Utility | monotonía según `higher_is_better`; rango siempre [0,100] |
| Quality | añadir un dato presente nunca reduce completeness; quitar una clave crítica desactiva su categoría |
| Sensitivity | el punto de cambio devuelto realmente cambia el ganador (verificación por re-evaluación) |
| Used information (v1.0) | `known fields ↑` ⇒ Used Information Confidence nunca disminuye; `unknown → known` ⇒ `used_instance_completeness` no disminuye; cambiar el *valor* del kilometraje (conocido) no cambia Information Confidence |
| Used ownership signals (v1.0) | `mileage ↑` ⇒ supuestos de mantenimiento/ownership signals no mejoran arbitrariamente (cuando exista metodología); Technical Capability idéntica |
| Used economics (v0.4) | `asking_price ↓` ⇒ Economic Fit nunca empeora (salvo efectos explícitos documentados, p. ej. ITP por tramos) |
| Used confidence (v0.4) | historial desconocido ⇒ Confidence baja o igual, **Technical Capability idéntica** |
| Used isolation (v0.4) | cambiar precio/km/estado de la unidad **no cambia ninguna spec técnica**; misma reference variant ⇒ misma Technical Capability sea cual sea el precio solicitado; una instancia no puede sobrescribir specs de referencia con fuente (test de tipos + runtime) |
| Cycles (v0.4) | dos consumos con `testCycle` distinto sin conversión publicada ⇒ `NOT_DIRECTLY_COMPARABLE`, nunca ganador |

**3. Simetría (Car VS)**
- `delta(A,B) = −delta(B,A)` para toda métrica.
- `winner(A,B) = winner(B,A)` y `loser(A,B) = loser(B,A)` salvo empate (TIE en ambos órdenes).
- Scores de cada vehículo independientes del orden y de qué otros vehículos haya en el set (garantía de las funciones de utilidad frente a min–max).
- Permutaciones de 3–4 vehículos producen el mismo ranking.
- (v0.4) La simetría se mantiene con participantes mixtos new/used: `compare([A_used, B_new])` ≡ `compare([B_new, A_used])`.

## Verification

- Documento: revisar que las 50 secciones y los 8 entregables finales estén presentes, que cada componente tenga los 10 metadatos y que la tabla Alpha/MVP/Later coincida con §8.1/§8.2.
- Código (Fase 1): `pnpm install && pnpm turbo lint typecheck test` en verde, incluyendo las tres familias de tests. Casos dorados: 6,1 vs 4,8 L/100 km a 18.000 km → Δ 234 L/año; +3.500 € / 680 €·año → 5,1 años; 20.000 km · 5,2 L/100 km · 1,72 €/L → 1.040 L y 1.788,80 €; 4,8 L/100 km a 1,65 €/L → 79,20 €/1.000 km; conversiones L/100km↔MPG US/UK con tolerancia < 0,01; `meaningfulDifference` clasifica 500 vs 503 L como TIE y 4,8 vs 6,1 L/100 km como CLEAR; utilidad de aceleración 6,8 s vs 7,0 s difiere ≤ 3 puntos; un vehículo de 5 plazas con deal breaker "7 plazas" da Practical Fit `FAIL`; completeness, confidence y versiones deterministas sobre fixtures; los cinco casos dorados new/used producen los resultados versionados esperados; un usado con 21.500 € de precio solicitado y 38.000 € de lista original usa 21.500 € en Economic Fit y muestra ambos en la explicación.
- Infraestructura (Alpha): VScarWeb responde solo en `127.0.0.1:4100` y es accesible públicamente únicamente vía IIS + Cloudflare; VScarWorker sin puerto público (health `127.0.0.1:8180`); ambos servicios NSSM se reinician solos tras fallo; `vscar_app` no tiene permisos fuera de `vscar_db`; backup diario verificado por hash y restauración de prueba correcta; logs rotando en `C:\vscar\logs\`; RAM total de VScar ≤ 1,5 GB en uso normal; los paquetes de engine no importan `@vscar/db` (regla de lint en CI).

---

## Impact Summary v0.3 → v0.4

| Dimensión | v0.3 | v0.4 |
|---|---|---|
| **Alcance** | Decisión sobre coches (implícitamente nuevos/recientes) | **Nuevo, seminuevo y usado** en una sola plataforma; casos New vs Used, Used vs Used, Same model different year, Older Premium vs Newer Mainstream |
| **Posicionamiento** | "The best car for you — with the math shown" | "**The best car for you — new or used, with the math shown**" (tagline corto conservado) |
| **Data model** | Manufacturer → Model → Generation → ModelYear → MarketVariant | + **Facelift**, `production_start/end`, `registration_year`; **ReferenceVariant** (antes MarketVariant) + **UsedVehicleInstance** separada; precios `original_list` / `current_new` / `used_asking` / `estimated_market_value`; `testCycle` con NEDC; `safety_ratings` con `protocol_version`/`test_year`; `recalls`, `maintenance_milestones`; tablas de usados persistentes (MVP) |
| **Engines** | Economics, Range, TCO, Break-even, Comparison, Decision | Mismos engines + **`@vscar/used-adjustment`** (Adjustment Layer + Risk Profile, dividido en v1.0 en Information Confidence + Ownership Signals); `purchase_price_override`; depreciación desde valor actual; Break-even New vs Used; ciclos/protocolos no comparables; Confidence con información de la unidad; Completeness Reference vs Used Instance |
| **Alpha** | ES · 15–20 coches / 4 marcas recientes | ES · **15–25 familias · ~50–80 reference variants 2010+ (2–4 generaciones/años por familia)** · new/new, used/used, new/used · precio y km manuales · Used Adjustment básico |
| **Reference variants** | ~15–20 (Alpha) · ~40 modelos (MVP) | **~50–80 (Alpha)** · ~150–200 entre ES y US (MVP) |
| **Esfuerzo** | Alpha ≈ 35–40 sp (11–12 sem) · MVP ≈ 80–95 sp | **Alpha ≈ 45–52 sp (12–13 sem)** · MVP ≈ 95–110 sp. Incremento principal: curación histórica (+5–6 sp, sobre todo curador de datos), schema generación/facelift/usados (+1,5 sp), used-adjustment + risk (+3 sp), ciclos/protocolos (+1 sp), new vs used y tests (+1,5 sp) |
| **Nuevos riesgos** | — | Carga de curación histórica · comparaciones NEDC/WLTP inválidas · estimaciones de usados tomadas como hechos · expectativa de marketplace · NCAP entre protocolos · tentación de scraping de anuncios |
| **Nuevas fuentes de datos** | Oficiales actuales + curación | EEA CO₂ histórico (2010+), EPA histórico, Euro NCAP con protocolo/año, Safety Gate/NHTSA recalls por generación, fichas/tarifas archivadas de fabricante, planes de mantenimiento de fabricante, estadísticas agregadas DGT/ANFAC/Ganvam para priorización; **evaluación** (sin integración) de proveedores de valor de usados (Ganvam, Autovista/Eurotax, J.D. Power/Black Book) y mantenimiento (HaynesPro, Autodata) |
| **DATA_RIGHTS_MATRIX** | Cobertura global | + `coverage_2010_2014`, `coverage_2015_2019`, `coverage_2020_2023`, `coverage_2024_plus`, `test_cycles` |
| **SEO** | Comparaciones mismo año, fichas | + cross-year, same model different year, páginas por **generación** (`/volkswagen/golf/mk7/`), guías de usados, New vs Used Calculator; instancias nunca indexables; sin combinatoria año × modelo |
| **Métricas** | HIDS, PCCR, Confidence Delta, Decision Change Rate | + % comparaciones con usados, % new vs used, % cross-year, % que introduce precio, completion usados vs nuevos, Confidence Delta segmentado |
| **Explícitamente diferido** | — | Integración con marketplaces (y scraping, nunca) · live listings · concesionarios · valoración automática de mercado · predicción completa de mantenimiento · VIN decode completo · informes de inspección · proveedores de historial · historial de accidentes automatizado · comparación de financiación · cotizaciones de seguro |
| **Conservado sin cambios** | Alpha España · US como test · arquitectura global · monorepo TS · engines deterministas · Provenance · Completeness · Confidence · Deal Breakers · Practical/Preference Fit · Technical Capability · Economic Fit@H · Meaningful Difference/For You · Why not · Sensitivity/Robustness · Presets · VScar ID · tres versiones · `@vscar/methodology` · DATA_RIGHTS_MATRIX · SEO internacional `/{lang}-{market}/` · 3D diferido · Tournament fuera de Alpha · tests dorados, property-based y simetría | idem |

---

## Baseline Approval Summary

| Elemento | Baseline v1.0 |
|---|---|
| **Fecha** | 2026-09-24 |
| **Estado** | APPROVED — PROJECT BASELINE (cambios posteriores vía ADR en `docs/adr/`) |
| **Infraestructura Alpha** | VPS existente Windows Server 2022 (6 vCPU, 12 GB RAM, 200 GB SSD) · Cloudflare Free · IIS 80/443 reverse proxy · servicios NSSM · Windows Task Scheduler |
| **Database** | MySQL existente · base `vscar_db` · usuario `vscar_app` (permisos solo sobre `vscar_db`) · Drizzle ORM (MySQL) · engines independientes del motor |
| **Deployment** | VScarWeb (Next.js + Node standalone) en `127.0.0.1:4100` · VScarWorker (Node, sin puerto público, health `127.0.0.1:8180`) · `/admin` dentro de la web · código en `C:\vscar\app` (o estructura existente por ADR) · datos en `C:\vscar\data\` · logs en `C:\vscar\logs\` · backups diarios fuera del VPS (R2/B2) |
| **Presupuesto de recursos** | VScar ≤ 1,5 GB RAM (ideal ~0,5–1,1 GB) · colchón ≥ 1 GB para Windows y servicios existentes · ETL nocturno |
| **Dataset target** | Dataset Core v0.1: 10 reference variants → Alpha: 15–25 familias, 50–80 reference variants 2010+ (lanzar con ≥ 50 de alta calidad antes que 80 mediocres) |
| **Coste incremental** | ~1–10 €/mes (backup externo; dominio aparte; sin APIs comerciales, IA, Redis, búsqueda ni colas de pago) |
| **Calendario** | Alpha: target 12 semanas · planning range 12–16 · data workstream desde la semana 1 |
| **Primer entregable** | `docs/data/SPEC_KEY_CATALOG.md` + `docs/data/DATA_RIGHTS_MATRIX.md` + selección de las 10 variants de Dataset Core v0.1 |
| **Decisiones diferidas** | US público (MVP) · Tournament · cuentas de usuario · IA · capa 3D/ThreeUI · TCO estimado como cifra principal · marketplaces, valoración automática, VIN, historial · Memurai/Redis · PostgreSQL · Docker · buscador externo · servicios cloud gestionados · APIs de datos comerciales (salvo bloqueo crítico documentado) |

> **VScar Master Plan v1.0 is the approved project baseline. Execution begins with the VScar Dataset Core v0.1, SpecKey Catalog and Data Rights Matrix.**
