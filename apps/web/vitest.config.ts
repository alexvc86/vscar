import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./test/stubs/server-only.ts', import.meta.url)),
    },
  },
  esbuild: { jsx: 'automatic' },
  // La robustez real tarda segundos con varios ficheros en paralelo, y los suites MySQL esperan el bloqueo compartido
  // de `vscar_test` (GET_LOCK) en `beforeAll`: tiempos holgados en vez de fallos espurios.
  test: { environment: 'node', include: ['test/**/*.test.ts', 'test/**/*.test.tsx'], testTimeout: 30_000, hookTimeout: 180_000 },
});
