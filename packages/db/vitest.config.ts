import { defineConfig } from 'vitest/config';

// Los tests de MySQL comparten la base `*_test` y la reinician: se ejecutan en serie.
export default defineConfig({
  test: { fileParallelism: false },
});
