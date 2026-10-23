# VScar — D1.7 Auditoría del catálogo técnico (92 homologaciones)

> Estado: **92 vehículos técnicos reales en `vscar_dev` · 11/11 comprobaciones de integridad PASS** · 2026-10-22
> - **Scripts** (solo lectura):
>   - `packages/db/scripts/technical-coverage.ts` → [`d17/technical-catalog-coverage.json`](d17/technical-catalog-coverage.json)
>   - `technical-audit.ts` → [`d17/audit-after-batch-E.json`](d17/audit-after-batch-E.json)
>   - `technical-checkpoint.ts` → [`d17/checkpoint-5-after-batch-E.json`](d17/checkpoint-5-after-batch-E.json)
> - **Valores**: los artefactos solo contienen indicadores de presencia; los valores con derechos pendientes no salen de MySQL.

## 1. Composición

| Magnitud | Valor |
|---|---:|
| Vehículos técnicos | **92** |
| Identidades TAN completo + Va + Ve distintas | 92 |
| Marcas | 15 |
| Modelos (marca + modelo) | 24 |
| ICE (`ICE_OR_MHEV`, las fuentes no distinguen MHEV) | 40 |
| MHEV (declarado) | 3 |
| HEV (`HEV_OR_MHEV`) | 20 |
| PHEV | 10 |
| BEV | 19 |
| Identidad comercial EXACT / PARTIAL / UNCONFIRMED | 2 / 16 / 74 |
| Completitud crítica media (8 categorías, sin etiqueta DGT calculada) | 0,515 |

Modelos (nº de homologaciones):
- Audi A3 2 · BMW Serie 3 1 · BMW X3 5 · BYD SEAL 1 · CUPRA Formentor 2 · Dacia Sandero 4
- Hyundai Kona 7 · Hyundai Tucson 4 · Kia Niro 6 · Kia Sportage 6 · Mercedes-Benz Clase A 5 · Nissan Qashqai 4
- Peugeot 208 4 · Peugeot 3008 6 · Peugeot 308 2 · Renault Clio 6 · Renault Mégane 4 · Škoda Octavia 2
- Tesla Model 3 4 · Tesla Model Y 3 · Toyota Corolla 3 · Toyota RAV4 3 · Toyota Yaris 3 · Volkswagen Golf 5

**Identidad comercial de los 74 nuevos: UNCONFIRMED.** D1.2 no curó su designación ni su acabado. Solo se conocen la marca y el modelo de la fuente oficial; no se ha completado nada más.

## 2. Datos

| Magnitud | Valor |
|---|---:|
| Observaciones | **1.368** (S01 EEA 510 · S11 RDW 858) |
| Técnicamente utilizables | **1.344** |
| Con derechos aprobados (APPROVED) | **0** |
| Utilizables con derechos condicionales (S01, CC BY) | 498 |
| Utilizables con derechos pendientes (S11) | 846 |
| Atributos | 280 (TECHNICAL/OBSERVED 263 · COMMERCIAL 17) |
| Valores en conflicto | 24 (12 grupos, 9 vehículos) → [registro](D1_7_CONFLICT_REGISTER.md) |

## 3. Cobertura por campo (vehículos)

**Niveles del embudo** (acumulativos, de izquierda a derecha):
- **FOUND**: hay algún valor.
- **IDENTITY_VERIFIED**: el valor está ligado a la clave TAN+Va+Ve exacta.
- **TECHNICALLY_USABLE**: Quality lo acepta.
- **RIGHTS_APPROVED**: la fuente tiene derechos aprobados.
- **UNCONFLICTED**: además, sin conflicto.
- **SELECTABLE_ELIGIBLE**: además, el vehículo tiene identidad comercial completa.

**Columnas informativas** (no forman parte del embudo):
- **Utilizable sin conflicto (cualquier derecho)**: usable y sin conflicto, con independencia de los derechos.
- **Con S01 condicional**: el mismo dato, pero con derechos CONDITIONAL de EEA.

| Campo | Aplica | FOUND | IDENTITY_VERIFIED | TECHNICALLY_USABLE | RIGHTS_APPROVED | UNCONFLICTED | SELECTABLE_ELIGIBLE | Utilizable sin conflicto (cualquier derecho) | Con S01 condicional |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Potencia | 92 | 91 | 91 | 90 | 0 | 0 | 0 | 90 | 90 |
| Consumo de combustible | 73 | 72 | 72 | 67 | 0 | 0 | 0 | 67 | 39 |
| Consumo eléctrico | 29 | 28 | 28 | 26 | 0 | 0 | 0 | 26 | 25 |
| Autonomía eléctrica | 29 | 27 | 27 | 26 | 0 | 0 | 0 | 26 | 25 |
| Dimensiones (largo + ancho + alto) | 92 | 92 | 92 | 92 | 0 | 0 | 0 | 92 | 0 (solo RDW) |
| Plazas | 92 | 92 | 92 | 92 | 0 | 0 | 0 | 92 | 0 (solo RDW) |
| Carrocería | 92 | 19 | 19 | 19 | 0 | 0 | 0 | 19 | 0 |
| Transmisión | 92 | 53 | 53 | 53 | 0 | 0 | 0 | 53 | 0 |
| Maletero | 92 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0–100 km/h | 92 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Batería útil | 29 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Carga AC | 29 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Carga DC | 19 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Depósito | 73 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Generación confirmada | 92 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Acabado comercial confirmado | 92 | 2 | 2 | 2 | 0 | 0 | 0 | 2 | 1 (#26, EEA) |

Lectura:
- **Hay datos** de identidad, dimensiones, plazas, potencia, consumo (combustible o eléctrico) y autonomía eléctrica.
- **No hay datos** de maletero, 0–100, batería útil, carga, depósito ni generación en ninguna fuente oficial gratuita con clave exacta. **Ninguno se ha completado.** La ausencia no es cero ni una desventaja: es "no disponible".
- **Ningún campo** tiene derechos APPROVED, así que el embudo estricto se corta en RIGHTS_APPROVED.
- **Con S01 condicional (CC BY)** hay potencia y consumo para una parte de los vehículos.

No se cuenta ningún dato de las fuentes de investigación S14–S19: no están en la capa curada.

## 4. Integridad (`checkpoint-5-after-batch-E`)

| Comprobación | Resultado |
|---|---|
| Migraciones 0000–0009 aplicadas | 10/10 |
| Claves TAN\|Va\|Ve duplicadas · identidades en columnas duplicadas · clave ≠ columnas | 0 · 0 · 0 |
| TAN sin extensión completa | 0 |
| Atributos, observaciones o items huérfanos · observaciones sin fuente | 0 |
| Ids curados que sean ReferenceVariant | 0 |
| Restricciones CHECK activas | 10 |
| Auditoría: sin generación/año-modelo inventados; acabados solo de D1.2; sin propagación entre versiones; solo fuentes oficiales; sin datasets de investigación; sin precios; sin DENIED/SECONDARY; conflictos agrupados | 11/11 PASS |

## 5. Catálogo seleccionable

| | Antes de D1.7 | Después |
|---|---:|---:|
| PREVIEW | 9 (`test_fixture`) | **9** |
| PUBLIC | 0 | **0** |
| SHA-256 (reference_variants, homologations, spec_values, vehicle_prices, safety_ratings) | `be0d441b3c06…` | `be0d441b3c06…` (idéntico en los 6 checkpoints) |

**Comprobado en vivo** (servidor de desarrollo propio, canal PREVIEW):
- `/internal/catalog` con credenciales: 200 con **92** vehículos y `noindex`;
- sin credenciales: 401;
- HTTP plano con un host público: 403;
- la API del selector (`browse`) solo lista las 5 marcas de las 9 variantes;
- la búsqueda de Kona, Niro, Octavia, Serie 3 y Formentor da 0 resultados;
- el sitemap no contiene rutas internas;
- el log del servidor no contiene la contraseña.

Los 92 no alimentan Economics, Comparison ni Decision. Los tests lo comprueban de dos formas: el selector nunca devuelve vehículos curados (MySQL), y solo `/internal/catalog` lee la capa curada (test estático).
