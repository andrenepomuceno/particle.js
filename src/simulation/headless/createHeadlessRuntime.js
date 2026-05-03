import { createSimulationRuntime } from '../runtime.js';
import { scenariosList } from '../scenarios.js';
import { GraphicsHeadless } from './graphicsHeadless.js';

function finiteVector(vector) {
    return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

export function createHeadlessRuntime({ maxParticles = 10000, scenarios = scenariosList } = {}) {
    const graphics = new GraphicsHeadless({ maxParticles });
    const core = createSimulationRuntime({
        graphics,
        scenariosList: scenarios,
        env: { version: 'headless' },
        alert: (message) => {
            throw new Error(message);
        },
    });

    function setupByIndex(index = 0) {
        graphics.cleanup();
        core.setup(index);
        return core.simulation;
    }

    function setupByName(name) {
        const index = core.scenariosList.findIndex((scenario) => scenario.name === name);
        if (index < 0) {
            throw new Error('Scenario not found: ' + name);
        }
        return setupByIndex(index);
    }

    function runSteps({ steps = 1, dt = 1000 / 60, startTime = 0 } = {}) {
        for (let i = 0; i < steps; i++) {
            core.simulation.step(dt, startTime + i * dt);
        }
        return snapshot();
    }

    function snapshot() {
        const simulation = core.simulation;
        const stats = simulation.stats || {};
        return {
            name: simulation.name,
            folderName: simulation.folderName,
            cycles: simulation.cycles,
            totalTime: simulation.totalTime,
            particleCount: simulation.particleList.length,
            maxParticles: graphics.maxParticles,
            mode2D: simulation.mode2D,
            stats: {
                particles: stats.particles,
                fixed: stats.fixed,
                avgEnergy: stats.avgEnergy,
                centerFinite: stats.center ? finiteVector(stats.center) : false,
                avgVelocityFinite: stats.avgVelocity ? finiteVector(stats.avgVelocity) : false,
            },
            graphics: { ...graphics.metrics },
        };
    }

    return {
        core,
        graphics,
        setupByIndex,
        setupByName,
        runSteps,
        snapshot,
        exportJson: (list) => core.exportJson(list),
        parseJson: (content) => core.parseJson(content),
        };
    }
