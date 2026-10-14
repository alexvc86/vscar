import { defineConfig } from 'vitest/config';

// Comparte la base `*_test` con @vscar/db: ejecución en serie.
export default defineConfig({
  // `beforeAll` espera el bloqueo compartido de `vscar_test` (GET_LOCK) mientras otro paquete lo usa.
  test: { fileParallelism: false, testTimeout: 30_000, hookTimeout: 180_000 },
});
