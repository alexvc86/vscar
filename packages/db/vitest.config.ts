import { defineConfig } from 'vitest/config';

// Los tests de MySQL comparten la base `*_test` y la reinician: se ejecutan en serie.
export default defineConfig({
  // `beforeAll` espera el bloqueo compartido de `vscar_test` (GET_LOCK) mientras otro paquete lo usa.
  test: { fileParallelism: false, hookTimeout: 180_000 },
});
