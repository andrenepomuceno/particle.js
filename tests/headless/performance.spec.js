import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performanceScenarios } from './scenarios.performance.js';

function assertValidMetrics(metrics) {
    expect(metrics.webgl2).toBe(true);
    expect(metrics.particleCount).toBeGreaterThanOrEqual(0);
    expect(metrics.particleCount).toBeLessThanOrEqual(metrics.maxParticles);
    expect(metrics.stats.centerFinite).toBe(true);
    expect(metrics.stats.avgVelocityFinite).toBe(true);
    expect(Number.isFinite(metrics.avgStepMs)).toBe(true);
    expect(Number.isFinite(metrics.p95StepMs)).toBe(true);
    expect(Number.isFinite(metrics.p99StepMs)).toBe(true);
    expect(Number.isFinite(metrics.readbackMs)).toBe(true);
}

test('records headless GPU performance metrics', async ({ page }) => {
    await page.goto('/headless.html');
    await page.waitForFunction(() => window.particleHeadless != null);

    const scenarios = await page.evaluate(() => window.particleHeadless.listScenarios());
    const scenarioNames = new Set(scenarios.map((scenario) => scenario.name));
    const results = [];

    for (const scenario of performanceScenarios) {
        expect(scenarioNames.has(scenario.name)).toBe(true);

        const setup = await page.evaluate((name) => window.particleHeadless.setup(name), scenario.name);
        expect(setup.webgl2).toBe(true);
        expect(setup.particleCount).toBeLessThanOrEqual(setup.maxParticles);

        const metrics = await page.evaluate((options) => window.particleHeadless.run(options), {
            steps: scenario.steps,
            warmup: scenario.warmup,
            render: scenario.render,
            readback: true,
        });
        assertValidMetrics(metrics);

        results.push({
            scenario: scenario.name,
            setup,
            metrics,
        });
    }

    const report = {
        createdAt: new Date().toISOString(),
        userAgent: await page.evaluate(() => navigator.userAgent),
        scenarios: results,
    };

    const reportsDir = path.resolve('reports/headless');
    await mkdir(reportsDir, { recursive: true });
    const filename = 'performance-' + new Date().toISOString().replaceAll(/[:.]/g, '-') + '.json';
    await writeFile(path.join(reportsDir, filename), JSON.stringify(report, null, 2));
});
