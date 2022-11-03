import { SimulationV2 } from './simulationV2';
import { Physics } from './physics.js';

import { scenarios0 } from './scenarios/scenarios0.js';
import { scenarios1 } from './scenarios/scenarios1.js';
import { fields } from './scenarios/fieldTest.js';
import { elements } from './scenarios/elements.js';
import { nearForce } from './scenarios/nearForce.js';
import { scenarios2 } from './scenarios/scenarios2.js';
import { gpgpu } from './scenarios/gpgpu';

function initialSimulation(list, name) {
    return list.find(e => {
        return e.name == name;
    });
}
let simulationList = [];
simulationList = simulationList.concat(gpgpu);
simulationList = simulationList.concat(scenarios2);
simulationList = simulationList.concat(nearForce);
simulationList = simulationList.concat(fields);
simulationList = simulationList.concat(elements);
simulationList = simulationList.concat(scenarios1);
simulationList = simulationList.concat(scenarios0);
let particlesSetup = simulationList[0];

let simulationV2 = undefined;

export let particleList = [];
export let physics = undefined;

function log(msg) {
    console.log("SimulationLegacy: " + msg)
}

export function setParticleRadius(radius, range) {
    simulationV2.particleRadius = radius;
    simulationV2.particleRadiusRange = range;
}

export function setColorMode(mode) {
    log("setColorMode");

    switch (mode) {
        case "random":
            simulationV2.enableChargeColor = false;
            break;

        case "charge":
        default:
            simulationV2.enableChargeColor = true
            break;
    }

    simulationV2.paintParticleList();
}

export function setBoundaryDistance(d = 1e6) {
    simulationV2.physics.boundaryDistance = d;
}

export function simulationSetup(graphics, idx) {
    log("simulationSetup");

    if (idx >= 0 && idx < simulationList.length) {
        particlesSetup = simulationList[idx];
    }

    physics = new Physics();
    if (!simulationV2) {
        simulationV2 = new SimulationV2(graphics, physics, particleList);
    }
    simulationV2.setup(particlesSetup, true);

    log("simulationSetup done");
}

export function simulationStep(graphics, dt) {
    simulationV2.step(dt);
}

export function simulationState() {
    return simulationV2.state();
}

export function simulationCsv() {
    return simulationV2.exportCsv();
}

