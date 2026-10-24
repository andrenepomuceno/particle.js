import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // The persistent cache is keyed by file content, so import.meta.glob in src/scenarios kept
    // returning the old file list after a scenario JSON was added.
    fsModuleCache: false,
    coverage: {
      provider: 'v8',
      include: ['src/engine/**/*.ts'],
      exclude: ['src/engine/gpu/**', 'src/engine/render/**'],
    },
  },
});
