import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'db/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/**/*.test.ts', 'src/lib/__tests__/**'],
      reporter: ['text', 'json-summary', 'lcov'],
      thresholds: { lines: 60, functions: 60, statements: 60, branches: 60 },
    },
  },
});
