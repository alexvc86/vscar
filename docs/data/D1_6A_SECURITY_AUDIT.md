# VScar — D1.6a Auditoría de seguridad de la demo interna

> Estado: **2 vulnerabilidades corregidas · resto PASS** · 2026-10-21
> - **Código**:
>   - [`internal-auth.ts`](../../apps/web/src/server/internal-auth.ts)
>   - [`proxy.ts`](../../apps/web/src/proxy.ts)
>   - [`app/internal/`](../../apps/web/src/app/internal/)
> - **Tests**: [`apps/web/test/d16a.test.ts`](../../apps/web/test/d16a.test.ts) y [`d16.test.ts`](../../apps/web/test/d16.test.ts).

## 1. Modelo

- **Activación**: `/internal/catalog` solo existe con estas tres condiciones a la vez:
  - `VSCAR_PUBLICATION_CHANNEL=PREVIEW`;
  - `VSCAR_INTERNAL_USER`;
  - `VSCAR_INTERNAL_PASSWORD` de 16 caracteres o más.
- **Si falta alguna**: 404, fallo cerrado y sin valores por defecto.
- **Autenticación**: HTTP Basic, comprobada en `proxy.ts` y otra vez en la página (defensa en profundidad).
- `noindex` es una cabecera de indexación, **no** un control de acceso.

## 2. Hallazgos y correcciones

| # | Hallazgo | Severidad | Corrección |
|---|---|---|---|
| S1 | `same()` salía antes de `timingSafeEqual` si las longitudes diferían: el tiempo revelaba la longitud de usuario y contraseña | baja | se comparan resúmenes SHA-256 (longitud fija) con `timingSafeEqual` |
| S2 | HTTP Basic aceptado sobre HTTP plano en cualquier host: las credenciales podían viajar en claro en un despliegue accesible por red | media | fuera de loopback, HTTP plano → **403 sin desafío Basic** (el navegador nunca envía la contraseña); tras proxy TLS cuenta `X-Forwarded-Proto: https` |
| S2b | Primera versión de la corrección S2 basada en `request.nextUrl`: **no funcionaba en vivo** (Next no refleja `Host` en la URL y añade `X-Forwarded-*`) | — | detectado en la verificación en vivo; la regla usa la cabecera `Host` y la IP de origen (`X-Forwarded-For`), con tests que reproducen las cabeceras reales de Next |

**Regla de transporte final**:
- **Se acepta**:
  - HTTPS directo;
  - `X-Forwarded-Proto: https`;
  - HTTP plano solo si el host **y** la IP de cliente son de loopback.
- **Proxy inverso sin TLS**: aunque reenvíe a `localhost`, aporta la IP real del cliente y no hereda la exención.
- **Riesgo residual aceptado**: un cliente de red puede falsificar `X-Forwarded-For: 127.0.0.1` y `Host: localhost` contra un servidor expuesto sin TLS. Solo conseguiría enviar **sus propias** credenciales en claro; la autenticación sigue siendo obligatoria.
- **Despliegue en red**: obligatorio servir detrás de HTTPS.

## 3. Verificación en vivo (servidor de desarrollo propio, puerto 4212, credenciales efímeras de prueba)

| Petición | Esperado | Obtenido |
|---|---|---|
| loopback sin credenciales | 401 + `WWW-Authenticate` + `X-Robots-Tag: noindex` + `Cache-Control: private, no-store` | ✅ |
| loopback con credenciales erróneas | 401, cuerpo genérico | ✅ "Authentication required" |
| loopback con credenciales válidas | 200, 18 vehículos, meta `noindex`, contraseña ausente del HTML | ✅ |
| `Host: vscar.example` por HTTP plano (con o sin credenciales) | 403 sin desafío | ✅ "HTTPS required", sin `WWW-Authenticate` |
| proxy a loopback sin TLS (`X-Forwarded-For` externo) | 403 | ✅ |
| `X-Forwarded-Proto: https` sin / con credenciales | 401 / 200 | ✅ |
| petición RSC (`RSC: 1`, `?_rsc=`) sin credenciales | 401 | ✅ |
| variantes de ruta: `/Internal/…`, `/%69nternal/…`, barra final | sin acceso | ✅ 404 / 401 / 308 |
| `x-middleware-subrequest` (bypass conocido de middleware) | 401 | ✅ |
| `sitemap.xml`, `robots.txt`, `/api/catalog/search?q=Sportage` | sin rastro de la capa curada | ✅ (0 menciones, resultados vacíos) |
| log del servidor | sin contraseña ni cabecera `Authorization` | ✅ (0 coincidencias) |

## 4. Tests automáticos (añadidos en D1.6a)

- **Transporte**: HTTPS obligatorio, proxy TLS, loopback, cabeceras reales de Next y proxy sin TLS.
- **Activación**: configuración ausente → 404 antes que nada.
- **Cabeceras malformadas** (todas `unauthorized`, ninguna lanza excepción):
  - `Basic` vacío;
  - base64 inválido;
  - sin `:`;
  - 64 kB;
  - NUL;
  - espacios;
  - esquema `Digest`;
  - contraseña con un carácter de más o de menos.
- **Respuestas**: no reflejan credenciales.
- **Logs**: los archivos de la ruta interna no contienen `console.*` ni `logger.*`.
- **Layout y página**: no indexables y siempre dinámicos.
- **Aislamiento**:
  - solo `app/internal/catalog/page.tsx` importa `server/technical-catalog`;
  - solo `server/technical-catalog.ts` usa el repositorio curado;
  - selector, sitemap, robots y APIs de catálogo no lo referencian;
  - `public/` no contiene JSON, CSV, SQL ni ZIP.
- **MySQL** (`@vscar/db`): el lector del selector (PUBLIC y PREVIEW) nunca devuelve vehículos curados; ningún id curado es una ReferenceVariant.

## 5. Aislamiento de la capa técnica

| Superficie | ¿Ve los 18? |
|---|---|
| Selector PUBLIC / PREVIEW | no (lector solo de `reference_variants`, test MySQL) |
| Endpoints públicos (`/api/catalog/*`) | no |
| Economics, Comparison, Decision | no (los motores reciben solo candidatos del catálogo seleccionable) |
| `sitemap.xml` / páginas indexables | no |
| `/internal/catalog` sin autenticación | no (404, 401 o 403) |
| Archivos estáticos | no (planes y brutos en `data/`, fuera de Git y fuera de `public/`) |
