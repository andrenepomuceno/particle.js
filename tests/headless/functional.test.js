import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { createHeadlessRuntime } from '../../src/simulation/headless/createHeadlessRuntime.js';
import { Particle } from '../../src/simulation/particle.js';
import { functionalScenarioNames } from './scenarios.functional.js';

function expectFiniteSnapshot(snapshot) {
    expect(snapshot.particleCount).toBeLessThanOrEqual(snapshot.maxParticles);
    expect(Number.isFinite(snapshot.cycles)).toBe(true);
    expect(Number.isFinite(snapshot.totalTime)).toBe(true);
    expect(snapshot.stats.centerFinite).toBe(true);
    expect(snapshot.stats.avgVelocityFinite).toBe(true);
}

describe('headless functional runtime', () => {
    it.each(functionalScenarioNames)('loads %s without browser APIs', (name) => {
        const runtime = createHeadlessRuntime({ maxParticles: 12000 });

        runtime.setupByName(name);
        const snapshot = runtime.snapshot();

        expect(snapshot.name).toBe(name);
        expect(snapshot.graphics.drawCalls).toBeGreaterThan(0);
        expectFiniteSnapshot(snapshot);
    });

    it('runs scheduled actions through the injected core reference', () => {
        const runtime = createHeadlessRuntime({
            scenarios: [{
                name: 'Action Probe',
                callback: (simulation) => {
                    simulation.physics.massConstant = 1;
                    simulation.addAction({
                        cycle: 2,
                        callback: () => {
                            simulation.core.updatePhysics('massConstant', 3);
                        },
                    });
                },
            }],
        });

        runtime.setupByName('Action Probe');
        runtime.runSteps({ steps: 1 });
        expect(runtime.core.simulation.physics.massConstant).toBe(1);

        runtime.runSteps({ steps: 1 });
        expect(runtime.core.simulation.physics.massConstant).toBe(3);
        expect(runtime.graphics.metrics.uniformUpdates).toBeGreaterThan(0);
    });

    it('distinguishes uniform-only and shader-update physics changes', () => {
        const runtime = createHeadlessRuntime({
            scenarios: [{
                name: 'Update Probe',
                callback: () => {},
            }],
        });

        runtime.setupByName('Update Probe');
        runtime.core.updatePhysics('massConstant', 2);
        runtime.core.updatePhysics('enableBoundary', false);

        expect(runtime.graphics.metrics.uniformUpdates).toBe(1);
        expect(runtime.graphics.metrics.shaderUpdates).toBe(1);
    });

    it('round-trips exported simulation JSON', () => {
        const runtime = createHeadlessRuntime({
            scenarios: [{
                name: 'Export Probe',
                callback: (simulation) => {
                    const particle = new Particle();
                    particle.mass = 2;
                    particle.charge = -1;
                    particle.position = new Vector3(1, 2, 0);
                    particle.velocity = new Vector3(0.5, 0, 0);
                    simulation.physics.particleList.push(particle);
                },
            }],
        });

        runtime.setupByName('Export Probe');
        runtime.runSteps({ steps: 3 });

        const exported = runtime.exportJson();
        const parsed = runtime.parseJson(exported);

        expect(parsed.name).toBe('Export Probe');
        expect(parsed.physics.particleList).toHaveLength(1);
        expect(parsed.physics.particleList[0].position.x).toBe(1);
        expect(parsed.cycles).toBe(3);
    });
});
