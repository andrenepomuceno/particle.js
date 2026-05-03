import { Physics } from '../simulation/physics.js';
import { scenariosList } from '../simulation/scenarios.js';
import { SimulationGPU } from '../simulation/simulation';
import { GraphicsGPU } from '../simulation/graphics.js';
import { FieldGPU } from '../simulation/field.js';
import { createSimulationRuntime } from '../simulation/runtime.js';

function percentile(values, p) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
    return sorted[index];
}

function average(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function finiteVector(vector) {
    return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

const graphics = new GraphicsGPU();
const runtime = createSimulationRuntime({
    graphics,
    scenariosList,
    PhysicsClass: Physics,
    SimulationClass: SimulationGPU,
    FieldClass: FieldGPU,
});

function scenarioIndex(value) {
    if (typeof value === 'number') return value;
    const index = scenariosList.findIndex((scenario) => scenario.name === value);
    if (index < 0) throw new Error('Scenario not found: ' + value);
    return index;
}

function listScenarios() {
    return scenariosList.map((scenario, index) => ({
        index,
        name: scenario.name,
        folderName: scenario.folderName,
    }));
}

function snapshot() {
    const simulation = runtime.simulation;
    const stats = simulation.stats || {};
    return {
        name: simulation.name,
        folderName: simulation.folderName,
        cycles: simulation.cycles,
        totalTime: simulation.totalTime,
        particleCount: simulation.particleList.length,
        maxParticles: graphics.maxParticles,
        mode2D: simulation.mode2D,
        webgl2: graphics.renderer.capabilities.isWebGL2,
        stats: {
            particles: stats.particles,
            fixed: stats.fixed,
            avgEnergy: stats.avgEnergy,
            centerFinite: stats.center ? finiteVector(stats.center) : false,
            avgVelocityFinite: stats.avgVelocity ? finiteVector(stats.avgVelocity) : false,
        },
    };
}

function setup(value) {
    const index = scenarioIndex(value);
    const started = performance.now();
    graphics.cleanup();
    runtime.setup(index);
    const elapsedMs = performance.now() - started;
    return {
        setupMs: elapsedMs,
        ...snapshot(),
    };
}

function run({ steps = 120, warmup = 30, dt = 1000 / 60, render = false, readback = true } = {}) {
    const warmupStarted = performance.now();
    for (let i = 0; i < warmup; i++) {
        runtime.simulation.step(dt, i * dt);
        if (render) graphics.render();
    }
    const warmupMs = performance.now() - warmupStarted;

    const stepTimes = [];
    const runStarted = performance.now();
    for (let i = 0; i < steps; i++) {
        const started = performance.now();
        runtime.simulation.step(dt, (warmup + i) * dt);
        if (render) graphics.render();
        stepTimes.push(performance.now() - started);
    }
    const runMs = performance.now() - runStarted;

    let readbackMs = 0;
    if (readback) {
        const readbackStarted = performance.now();
        graphics.readbackParticleData();
        readbackMs = performance.now() - readbackStarted;
    }

    return {
        ...snapshot(),
        warmupSteps: warmup,
        measuredSteps: steps,
        warmupMs,
        runMs,
        avgStepMs: average(stepTimes),
        maxStepMs: Math.max(...stepTimes),
        p95StepMs: percentile(stepTimes, 95),
        p99StepMs: percentile(stepTimes, 99),
        readbackMs,
    };
}

function readback() {
    const started = performance.now();
    graphics.readbackParticleData();
    return {
        readbackMs: performance.now() - started,
        ...snapshot(),
    };
}

function dispose() {
    graphics.cleanup();
}

window.particleHeadless = {
    listScenarios,
    setup,
    run,
    readback,
    snapshot,
    dispose,
};
