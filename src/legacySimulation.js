import { SimulationGPU } from './simulationGPU';
import { Physics } from './physics.js';

import { scenarios0 } from './scenarios/scenarios0.js';
import { scenarios1 } from './scenarios/scenarios1.js';
import { fields } from './scenarios/fieldTest.js';
import { elements } from './scenarios/elements.js';
import { nearForce } from './scenarios/nearForce.js';
import { scenarios2 } from './scenarios/scenarios2.js';
import { gpgpu } from './scenarios/gpgpu';

let simulationList = [];
simulationList = simulationList.concat(gpgpu);
simulationList = simulationList.concat(scenarios2);
simulationList = simulationList.concat(nearForce);
simulationList = simulationList.concat(fields);
simulationList = simulationList.concat(elements);
simulationList = simulationList.concat(scenarios1);
simulationList = simulationList.concat(scenarios0);
let particlesSetup = simulationList[0];

let simulation = undefined;

export let particleList = [];
export let physics = undefined;

function log(msg) {
    console.log("SimulationLegacy: " + msg)
}

export function setParticleRadius(radius, range) {
    simulation.particleRadius = radius;
    simulation.particleRadiusRange = range;
}

export function setColorMode(mode) {
    simulation.setColorMode(mode);
}

export function setBoundaryDistance(d = 1e6) {
    simulation.physics.boundaryDistance = d;
}

export function simulationSetup(graphics, idx) {
    log("simulationSetup");

    if (idx >= 0 && idx < simulationList.length) {
        particlesSetup = simulationList[idx];
    }

    physics = new Physics();
    if (!simulation) {
        simulation = new SimulationGPU(graphics, physics, particleList);
    }
    simulation.setup(particlesSetup, true);

    log("simulationSetup done");
}

export function simulationStep(graphics, dt) {
    simulation.step(dt);
}

export function simulationState() {
    return simulation.state();
}

export function simulationCsv() {
    return simulation.exportCsv();
}

