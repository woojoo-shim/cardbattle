import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    passWithNoTests: true,
    testTimeout: 20000,
    hookTimeout: 30000,
    pool: 'threads',
    poolOptions: {
      threads: { singleThread: true },
    },
  },
});
