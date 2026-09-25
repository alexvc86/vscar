import { defineConfig } from 'vitest/config';

// Comparte la base `*_test` con @vscar/db: ejecución en serie.
export default defineConfig({
  test: { fileParallelism: false, testTimeout: 30_000 },
});
