# VScar — D1.6 Demo privada y precio manual del coche nuevo

> Estado: **funcionando en local** · 2026-10-21 · Ruta: `/internal/catalog` · Página: [`app/internal/catalog/page.tsx`](../../apps/web/src/app/internal/catalog/page.tsx) · Autorización: [`proxy.ts`](../../apps/web/src/proxy.ts) + [`internal-auth.ts`](../../apps/web/src/server/internal-auth.ts)

## 1. Diagnóstico técnico privado

| Aspecto | Implementación |
|---|---|
| Acceso | HTTP Basic con `VSCAR_INTERNAL_USER` y `VSCAR_INTERNAL_PASSWORD` (≥ 16 caracteres), **solo** con `VSCAR_PUBLICATION_CHANNEL=PREVIEW`. Sin credenciales o en PUBLIC → **404** (falla cerrado). Comparación en tiempo constante |
| Defensa en profundidad | `proxy.ts` (Next 16) para `/internal/:path*` **y** comprobación otra vez en la página (`notFound()` sin autorización válida) |
| No indexable | `X-Robots-Tag: noindex, nofollow, noarchive`, `Cache-Control: private, no-store`, metadatos `robots: noindex` (`noindex` no es el control de acceso) |
| Contenido por vehículo | nombre oficial + periodo de matriculación; identidad técnica (TAN · Va · Ve, EXACT); generación/año-modelo "sin verificar"; acabado o "no confirmado" + designación oficial literal; atributos técnicos con fuente y derechos; fuentes y derechos; claves críticas que faltan; tabla de observaciones (valor, unidad, ciclo, fuente, registro, derechos, calidad, conflicto); **comparación: no disponible** (no está en el catálogo seleccionable) |
| Datos crudos | no se exponen: la página lee solo tablas `curated_*`; `data/` no se sirve |

Comprobación real (servidor `next dev` local en el puerto 4211, credenciales solo en el entorno del proceso, después detenido):

| Petición | Respuesta |
|---|---|
| sin credenciales | 401 + `WWW-Authenticate` |
| credenciales erróneas | 401 |
| credenciales correctas | 200, **18** vehículos técnicos, `x-robots-tag: noindex, nofollow, noarchive` |

## 2. Comparaciones

- La demo enlaza solo **comparaciones del catálogo seleccionable existente** (`examples('ES')`). Ejemplos: BYD SEAL Design RWD vs Tesla Model 3; BMW X3 xDrive20d vs Golf Style eTSI.
- Ninguna variante técnica nueva cumple hoy los requisitos para comparar (generación, año-modelo, acabado, claves críticas, derechos):
  - no entra al selector;
  - no se calcula ganador;
  - la ausencia de datos no puntúa como cero;
  - ningún valor pendiente o candidato alimenta los motores.

## 3. Precio de compra introducido por el usuario (coche nuevo)

| Regla | Implementación |
|---|---|
| Entrada | formulario "Precio de compra (€)" en el capítulo económico, por cada lado **nuevo** ([`NewPriceForm.tsx`](../../apps/web/src/components/compare/NewPriceForm.tsx)); ES/EN |
| Contrato | URL `{lado}_price` (EUR enteros, 100–2.000.000) también para lados nuevos; sin `u=1`; inválido → descartado e informado |
| Economía | `purchasePriceOverride` existente del Economics Engine → compra `OVERRIDE` / `USER_PROVIDED`, etiquetada "precio indicado" |
| No es | precio oficial, precio del fabricante ni dato guardado en la base |
| Vacío | sin precio; nunca se inventa. La comparación energética sigue |
| Separación | coste de uso (energía) ≠ precio de compra ≠ coste conocido; el override solo afecta al desembolso, al coste conocido y al punto de equilibrio |
| Economic Fit | **sin cambios** (test: mismo coste de uso, mismo estado y mismo líder con y sin precio). Methodology 2026.7 intacta |
| NEW/USED | un lado usado conserva su contrato (`u=1`, precio pedido); intercambio A/B y cambio de coche correctos (test) |

Comprobación real: `/es-es/compare/byd-seal-…-vs-tesla-model-3-…?a_price=39990` → 200, "precio indicado" 39.990 €, formulario en ambos lados nuevos.
