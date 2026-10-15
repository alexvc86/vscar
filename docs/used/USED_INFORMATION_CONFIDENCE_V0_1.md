# VScar — Used Information Confidence v0.1 (Step 8a)

> Estado: **PASS** · 2026-10-14 · Plan §13.9A · Catálogo §16 · Código: `@vscar/methodology` (`used-information.ts`, reglas) + `@vscar/used-adjustment` (contrato de mensajes) · Metodología **2026.7**

**Mide cuánto SABEMOS de la unidad usada. No mide cuán bueno es el coche.** Un coche con 200.000 km y todo declarado tiene confianza HIGH; un coche de 20.000 km del que solo sabemos el precio, LOW.

## 1. Entradas

| Campo | Peso de información (catálogo §16) | Relevancia para decidir |
|---|---|---|
| precio pedido | A (3) · **crítico** | 3 |
| kilometraje | A (3) · **crítico** | 3 |
| matriculación (fecha o año) | B (2) | 1,5 |
| historial de mantenimiento | B (2) | 3 si ≥ 3 años, 2 si menos |
| historial de accidentes | B (2) | 2 |
| garantía restante (declarada) | B (2) | 1,5 si ≤ 8 años, 0,5 si más |
| ITV | C (1) | 1,5 si ≥ 4 años, 0,5 si menos |
| estado | C (1) | 1 |
| propietarios | C (1) | 0,5 |
| salud de batería | A (3) | BEV 3 · PHEV/EREV 2 · **ICE/MHEV/HEV: NOT_APPLICABLE** |

- **N/A ≠ desconocido**: un campo que no aplica al powertrain no está en la base ni cuenta como falta (un ICE nunca se penaliza por no tener SOH; un BEV nunca por datos de un motor térmico).
- **Edad desconocida**: se usa la relevancia más alta posible (nunca se asume una edad; v0.1 suponía 5 años). Con un rango de edad, la más alta de sus extremos.
- La garantía **calculada** desde la original no cuenta como dato conocido de la unidad (sus condiciones pueden haberla anulado): genera señal + verificación.
- Un precio en otra moneda o una matriculación posterior a la fecha de evaluación no cuentan como conocidos.

## 2. Nivel

```
score = Σ relevancia(conocidos) / Σ relevancia(relevantes)     → HIGH ≥ 0,80 · MEDIUM ≥ 0,50 · LOW
críticos universales desconocidos (precio, km)               → LOW
BEV sin salud de batería                                      → como mucho MEDIUM (crítico por powertrain, catálogo §16)
```

`informationCompleteness` (`used_instance_completeness`, pesos A/B/C) se publica aparte y **no** se mezcla con la completitud de datos de la ReferenceVariant (`@vscar/quality`).

## 3. Contrato de salida

```ts
{ level: 'HIGH' | 'MEDIUM' | 'LOW',
  reasons: [{ messageKey, params, ruleCode, sourceFields }],   // críticos → tope → resto por relevancia; o "complete"
  requiresVerification: boolean,
  summary: Message,                                             // nivel + conocidos / relevantes
  informationCompleteness, score,                               // secundarios
  fields: [{ field, state: KNOWN | UNKNOWN | NOT_APPLICABLE, relevance }],
  rulesVersion: 'used-adjustment-v1' }
```

Claves: `used.information_confidence.summary`, `.complete`, `.capped`, `.missing_<campo>` (asking_price, mileage, registration, service_history, accident_history, owners, warranty, inspection, condition, battery_health) con `{ field, critical, relevance }`.

## 4. Relación con Recommendation Confidence

La confianza de información de las unidades usadas **recomendadas** (o empatadas) entra en Recommendation Confidence con la penalización ya publicada (`recommendation-confidence-v1`: MEDIUM −10, LOW −20) y un motivo `decision.confidence.used_information`. No la sustituye: datos excelentes de la variante + información pobre de la unidad → recomendación limitada; un usado no recomendado no limita la confianza en otro coche.

## 5. Casos

| Caso | Nivel |
|---|---|
| BEV con todo declarado (SOH 91 %) | HIGH |
| El mismo BEV sin SOH | MEDIUM (tope) |
| Solo precio pedido | LOW (falta el kilometraje, crítico) |
| ICE con todo declarado, 210.000 km | HIGH (el km alto es una señal de propiedad, no de información) |
| PHEV con precio, km y año, sin historial, batería ni estado | LOW |

Propiedad verificada: pasar un campo de desconocido a conocido nunca baja el nivel ni la completitud.
