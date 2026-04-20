import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.ts', 'scripts/**/*.ts'],
      exclude: ['src/__tests__/**', 'scripts/__tests__/**'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100
      }
    }
  }
});
