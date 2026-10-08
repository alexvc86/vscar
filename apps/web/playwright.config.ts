import { defineConfig } from '@playwright/test';

/**
 * E2E smoke sobre el build de PRODUCCIÓN (`next start`, puerto 4200). Usa el Chrome instalado
 * (`channel: 'chrome'`): no descarga navegadores. Si el servidor ya está arrancado, lo reutiliza.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  reporter: [['list']],
  use: { baseURL: process.env.VSCAR_WEB_URL ?? 'http://localhost:4200', channel: 'chrome', headless: true, viewport: { width: 1440, height: 900 } },
  webServer: { command: 'corepack pnpm start', url: 'http://localhost:4200/es-es/', reuseExistingServer: true, timeout: 120_000 },
});
