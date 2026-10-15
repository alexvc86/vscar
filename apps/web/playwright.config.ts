import { defineConfig } from '@playwright/test';

/**
 * E2E smoke sobre el build de PRODUCCIÓN (`next start`, puerto 4200). Usa el Chrome instalado
 * (`channel: 'chrome'`): no descarga navegadores. Si el servidor ya está arrancado, lo reutiliza.
 * `VSCAR_WEB_PORT` permite otro puerto si el 4200 lo ocupa otra aplicación de la máquina.
 */
const port = Number(process.env.VSCAR_WEB_PORT ?? 4200);
const baseURL = process.env.VSCAR_WEB_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  // Step 8b: un único `next start` sirve todas las pruebas y cada navegación renderiza decisión + robustez (las vistas
  // usadas con hechos nuevos no están en caché). Con un worker por núcleo, las navegaciones se encolaban y superaban
  // los 5 s de las aserciones; 2 workers es estable y más rápido que 1 (medido: 27/27 dos veces, ~42 s).
  workers: 2,
  reporter: [['list']],
  use: { baseURL, channel: 'chrome', headless: true, viewport: { width: 1440, height: 900 } },
  webServer: { command: `corepack pnpm exec next start -p ${port}`, url: `${baseURL}/es-es/`, reuseExistingServer: true, timeout: 120_000 },
});
