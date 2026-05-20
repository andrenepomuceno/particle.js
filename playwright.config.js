import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/headless',
    testMatch: ['performance.spec.js'],
    timeout: 120000,
    reporter: [['list']],
    use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:8090',
        headless: true,
    },
    webServer: {
        command: 'npm run headless:serve',
        url: 'http://127.0.0.1:8090/headless.html',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
    },
});
