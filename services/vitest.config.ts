import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      exclude: [
        'src/**/*.d.ts',
        'dist/**',
        'src/shared/aws-clients.ts',
      ],
    },
    include: ['tests/**/*.test.ts'],
  },
})
