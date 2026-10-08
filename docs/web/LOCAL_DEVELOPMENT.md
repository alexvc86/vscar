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

## Notas

- `next-env.d.ts` y `.next/` están en `.gitignore` (Next los regenera). `agentRules: false` evita que `next dev` cree `AGENTS.md` y `CLAUDE.md`.
- Playwright usa `channel: 'chrome'`, el Chrome ya instalado, y no descarga navegadores.
- Los tests MySQL del monorepo necesitan `VSCAR_TEST_DATABASE_URL`; `apps/web` no los usa.
