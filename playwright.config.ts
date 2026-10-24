import { defineConfig } from '@playwright/test';

const port = 5180;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${port}`,
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: `npx vite --port ${port} --strictPort`,
    port,
    reuseExistingServer: false,
  },
});
