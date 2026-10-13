# VScar Web — local development (Windows + Laragon)

> Step 7a · `apps/web` (`@vscar/web`)

## Comandos

```bash
corepack pnpm install
corepack pnpm --filter @vscar/web dev        # next dev  → http://localhost:4200/es-es
corepack pnpm --filter @vscar/web build      # build de producción
corepack pnpm --filter @vscar/web start      # next start → http://localhost:4200
corepack pnpm --filter @vscar/web test       # vitest (i18n, dominio, render, fronteras)
corepack pnpm --filter @vscar/web e2e        # Playwright con el Chrome instalado (reutiliza el server de :4200)
corepack pnpm --filter @vscar/web size       # informe de bundle real (requiere `start`); `-- --check` falla si se supera el presupuesto
corepack pnpm --filter @vscar/web snapshot   # regenera src/data/dataset-core.snapshot.json desde @vscar/fixtures
corepack pnpm check                          # lint + typecheck + test del monorepo
```

URLs:
- ES: `http://localhost:4200/es-es` · comparación: `http://localhost:4200/es-es/compare/byd-seal-vs-tesla-model-3`
- EN: `http://localhost:4200/en-es` · comparación: `http://localhost:4200/en-es/compare/byd-seal-vs-tesla-model-3`
- Escenario compartible: `…/compare/byd-seal-vs-tesla-model-3?km=18000&trips=10&years=5&home=80&cost=2&space=2&performance=2`
- Override de tier, solo en `next dev`: `?tier=HIGH|LOW|2D|REDUCED`

## Base de datos (Step 7b)

La web lee el catálogo de MySQL (solo lectura). En local se usa el MySQL de Laragon con dos bases aisladas:

| Base | Uso | Usuario | Notas |
|---|---|---|---|
| `vscar_dev` | web local (`DATABASE_URL`) | `vscar_dev` (permisos solo sobre `vscar_dev`) | `corepack pnpm db:dev` aplica migraciones y carga Dataset Core v0.1 si está vacía (idempotente; solo bases `*_dev`) |
| `vscar_test` | tests (`VSCAR_TEST_DATABASE_URL`) | `vscar_test` | los tests la vacían y recrean; un bloqueo consultivo (`GET_LOCK`) serializa los paquetes |

Variables en el `.env` raíz (nunca en Git; la web lo carga desde `next.config.ts`): `DATABASE_URL`, `VSCAR_TEST_DATABASE_URL`, `VSCAR_PUBLICATION_CHANNEL=PREVIEW` (vista previa privada; si falta, la web usa `PUBLIC` y hoy el catálogo público está vacío, ver ADR-013). `corepack pnpm test`/`check` cargan ese `.env`, así que los tests MySQL se ejecutan.

Sin base de datos la home se sirve igual (sin ejemplos), la comparación muestra "No pudimos cargar el catálogo." y la API responde 503.

Medición: `VSCAR_TIMINGS=1` al arrancar `next start` escribe el desglose del SSR en el log; `VSCAR_WEB_URL=http://localhost:4200 node apps/web/scripts/perf-7b.ts` mide búsqueda, SSR, HTML e INP.

URLs (Step 7b):
- Home con selector: `http://localhost:4200/es-es` · `http://localhost:4200/en-es`
- Comparación: `http://localhost:4200/es-es/compare/byd-seal-2026-design-rwd-82-5-kwh-vs-tesla-model-3-2021-standard-range-plus-e6r` (la URL de la 7a redirige aquí)
- API interna: `http://localhost:4200/api/catalog/search?market=ES&q=golf`

## Puertos

| Puerto | Proceso | Decisión |
|---|---|---|
| **4200** | VScar Web (`dev` y `start`) | Durante la transición: el Motion Lab (Step 6e) sigue disponible en 4100 |
| 4100 | `labs/motion-lab` | Laboratorio congelado; se puede apagar cuando ya no haga falta |
| 4201 | `next dev` puntual para `scripts/hmr-check.ts` | Solo verificación |

Objetivo final, una vez retirado el lab: mover VScar Web a `http://localhost:4100/es-es` (cambiar `-p` en los scripts de `apps/web/package.json` y `playwright.config.ts`). Nunca se paran procesos ajenos: antes de liberar un puerto se comprueba que el proceso que escucha es un `next` de este repo.

## Laragon

- **Laragon running: compatible.** Durante el Step 7a estuvieron activos `laragon.exe`, `httpd.exe` y `mysqld.exe`.
- **No se ha modificado** Apache, Nginx, MySQL, `hosts` ni ningún vhost. VScar Web es una app Node independiente que no usa PHP ni MySQL: los datos vienen del snapshot controlado y los engines puros.

## Verificaciones manuales

- **HMR**: con `next dev -p 4201` arrancado, `node scripts/hmr-check.ts`. Edita GsapScenes, HeroAtmosphere y DecisionChapters 3 veces y comprueba que no se duplican ScrollTriggers ni listeners de `window`, que hay un único contexto WebGL y que no aparecen errores. Resultado del Step 7a: 7 → 7 ScrollTriggers, 17 → 17 listeners, 1 canvas, 0 errores.
- **Reduced motion**: activar "Reducir movimiento" en el sistema (o emularlo en DevTools → Rendering). No hay canvas, ni se descarga GSAP, ni hay SplitText, y la información es la misma.
- **Sin WebGL**: `chrome://flags` → desactivar WebGL, o DevTools → Rendering. El hero muestra el degradado CSS.

Si el 4200 está ocupado por otra aplicación de la máquina (p. ej. un `ng serve` ajeno), no se para: se arranca VScar en otro puerto (`corepack pnpm exec next start -p 4210` desde `apps/web`) y se usan `VSCAR_WEB_PORT=4210` (E2E) y `VSCAR_WEB_URL=http://localhost:4210` (informes).

## Notas

- `next-env.d.ts` y `.next/` están en `.gitignore` (Next los regenera). `agentRules: false` evita que `next dev` cree `AGENTS.md` y `CLAUDE.md`.
- Playwright usa `channel: 'chrome'`, el Chrome ya instalado, y no descarga navegadores.
- Los tests MySQL del monorepo necesitan `VSCAR_TEST_DATABASE_URL`; `apps/web` no los usa.
