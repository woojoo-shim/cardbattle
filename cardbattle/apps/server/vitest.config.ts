import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    passWithNoTests: true,
    testTimeout: 20000,
    hookTimeout: 30000,
    setupFiles: ['./src/__tests__/setup.ts'],
    pool: 'threads',
    poolOptions: {
      threads: { singleThread: true },
    },
  },
});
