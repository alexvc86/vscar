# VScar — Used Input UX v0.1 (Step 8b)

> Estado: **PASS** · 2026-10-15 · Integración: [USED_COMPARISON_INTEGRATION_V0_1](USED_COMPARISON_INTEGRATION_V0_1.md) · Motor: [USED_ADJUSTMENT_V0_1](USED_ADJUSTMENT_V0_1.md) · Decisión: [ADR-017](../adr/ADR-017-used-facts-in-url-and-participant-identity.md)

Una sola experiencia para NUEVO vs NUEVO, NUEVO vs USADO, USADO vs NUEVO y USADO vs USADO. El usuario elige primero el vehículo técnico y después **cómo lo considera**. No hay dos aplicaciones.

```
Marca → Modelo → Año → Versión  ─▶  ¿Cómo estás considerando este coche?
                                     ├─ Nuevo  ─▶ elegido
                                     └─ Usado  ─▶ Datos de esta unidad ─▶ Revisa esta unidad ─▶ Elegir este coche
```

## 1. Paso Nuevo / Usado

- Tras la versión, el resumen del vehículo (visual, marca, modelo, año, versión, motorización) muestra la pregunta y dos opciones grandes (≥ 88 px de alto): **Nuevo** ("Precio de catálogo y garantía de un coche nuevo") y **Usado** ("Una unidad concreta…").
- La búsqueda directa lleva al mismo paso.
- **Misma ReferenceVariant en los dos lados**: es válida si alguno de los dos es usado (Golf nuevo vs Golf usado, o dos Golf usados). Nuevo vs nuevo de la misma variant avisa: "Este mismo coche ya está como nuevo en el otro lado…". La lista de versiones ya no bloquea la del otro lado (solo la marca "otro lado").

## 2. Datos de esta unidad (dos niveles, todo opcional)

| Nivel | Campo | Entrada | Semántica |
|---|---|---|---|
| Esenciales | Precio solicitado | entero EUR (admite "28.000") | `askingPrice`: lo que pide el vendedor, **no** un valor de mercado |
| | Kilometraje actual | entero km | vacío = desconocido (≠ 0) |
| | Primera matriculación | mes (opcional) + año | **no es el año modelo**; ni se infiere ni se supone |
| Adicional | Garantía restante | meses + "No lo sé" | 0 = vencida confirmada; "No lo sé" → el motor la estima desde la original y pide confirmarla (nunca PASS) |
| | Historial de mantenimiento | Completo y documentado / Parcial / No disponible / No lo sé | "No disponible" (ausente confirmado) ≠ "No lo sé" (desconocido) |
| | Estado conocido | Sin problemas declarados / Problemas conocidos / Sin verificar | afirmación del usuario o vendedor, no una inspección |
| | Salud de batería (SOH) | % + "No dispongo del dato" | **solo BEV/PHEV/EREV**; nunca 100 % por defecto; nunca se convierte en autonomía |
| | Daños conocidos | Sin daños declarados / Daños declarados / No lo sé | sin coste de reparación |

- Discreto: "Cuantos más datos verifiques, mejor podremos evaluar esta unidad." Nunca se promete una confianza alta.
- **Nunca se pide** VIN, matrícula, datos del propietario o del vendedor, teléfono, URL del anuncio, financiación ni texto libre.
- Validación **al avanzar** ("Revisar"), no en cada pulsación: el error va asociado a su campo (`aria-describedby`, `aria-invalid`, `role="alert"`) y el foco va al primero. Límites: precio 100–2.000.000 €, km 0–1.500.000, año ≥ 1990 y no posterior a hoy (mes incluido), garantía 0–120 meses, SOH 1–100 %.
- Los valores viven en el selector: **volver atrás o plegar "Información adicional" no los pierde**. Reabrir el mismo lado con la misma variant recupera la unidad. **Cambiar de vehículo los vacía**: el historial de un Golf nunca pasa a un Tesla.

## 3. Revisión

Antes de elegir: coche + insignia `A · USADO` + los hechos tal como se usarán ("Sin indicar" cuando no se dieron) + "Estos datos solo viven en tu navegador y en el enlace de la comparación. No se guardan." + **Elegir este coche**. Sin códigos técnicos (salvo los detalles PREVIEW ya existentes de la lista de versiones).

## 4. En la comparación

| Lugar | Qué se ve |
|---|---|
| Hero | `A · NUEVO` / `B · USADO` (solo si hay algún usado), resumen de la unidad (precio, km, matriculación, historial) |
| Coste de uso | igual que antes + **Compra y coste conocido**: precio de compra (catálogo / solicitado), coste conocido al horizonte, diferencia inicial y la nota "la diferencia de compra no decide por sí sola el encaje económico" |
| **Este usado** (capítulo nuevo) | Confianza de la información (nivel + resumen + qué falta) · Aspectos a revisar (ATTENTION) · Datos pendientes (INFORMATION_GAP) · Datos declarados (NOTE) · Comprueba esto antes de decidir · Avisos · procedencia (declarado / calculado / pendiente; VScar no ha verificado la unidad) |
| Confianza | Recommendation Confidence (con la información de la unidad recomendada) y la verificación existente |
| Compartir | aviso previo: "El enlace incluirá el precio, el kilometraje y el estado que has introducido." |
| Cambiar tu uso | sección **Requisitos para usados** (solo con algún usado): km máximos, antigüedad máxima, SOH mínima, garantía mínima, historial completo. Vacío = sin requisito |

Todas las frases de información, señales, verificación y requisitos son `messageKey + params` del engine (`engine.used.*`, `engine.comparison.requirement.*`, `engine.decision.*`); la UI solo agrupa y formatea.

## 5. Accesibilidad

Etiquetas visibles; errores asociados; foco en el título de cada paso (también Nuevo/Usado, datos y revisión) y en el primer error; botones y radios nativos (teclado); objetivos ≥ 44 px; `aria-live` del resultado sin cambios; Motion solo en la transición de paso (reduced motion respetado), sin GSAP ni WebGL en el formulario.

## 6. Rendimiento

El formulario vive en el chunk diferido del selector (nada en el JS inicial). Abrir el selector pasa a `startTransition`: el clic pinta enseguida y la hoja se monta después (INP de "abrir" en móvil ×4: 208–384 ms → 40–88 ms). Cifras completas en [USED_COMPARISON_INTEGRATION_V0_1 §7](USED_COMPARISON_INTEGRATION_V0_1.md#7-rendimiento).
