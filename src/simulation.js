import { Physics } from './physics.js';

import { SimulationGPU } from './simulationGPU';
import { GraphicsGPU } from './graphicsGPU.js'
import { SimulationCPU } from './simulationCPU';
import { GraphicsCPU } from './graphicsCPU.js'
import { FieldCPU } from './fieldCPU';

import { scenarios0 } from './scenarios/scenarios0.js';
import { scenarios1 } from './scenarios/scenarios1.js';
import { fields } from './scenarios/fieldTest.js';
import { elements } from './scenarios/elements.js';
import { nearForce } from './scenarios/nearForce.js';
import { scenarios2 } from './scenarios/scenarios2.js';
import { gpgpu } from './scenarios/gpgpu';

const useGPU = true;

let simulationList = [];
if (useGPU) {
    simulationList = simulationList.concat(gpgpu);   
}
simulationList = simulationList.concat(scenarios2);
simulationList = simulationList.concat(nearForce);
simulationList = simulationList.concat(fields);
simulationList = simulationList.concat(elements);
simulationList = simulationList.concat(scenarios1);
simulationList = simulationList.concat(scenarios0);
let particlesSetup = simulationList[0];

let simulation = undefined;
let field = undefined;
let physics = undefined;

export let graphics = undefined;
if (useGPU) {
    graphics = new GraphicsGPU();
} else {
    graphics = new GraphicsCPU();
}

function log(msg) {
    console.log("Simulation: " + msg)
}

export function setParticleRadius(radius, range) {
    simulation.particleRadius = radius;
    simulation.particleRadiusRange = range;
    //simulation.setParticleRadius(radius, range);
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
        if (useGPU) {
            simulation = new SimulationGPU(graphics, physics);
            field = new FieldCPU(graphics, physics);
        } else {
            simulation = new SimulationCPU(graphics, physics);
            field = new FieldCPU(graphics, physics);
        }

    }
    simulation.setup(particlesSetup, true);

    log("simulationSetup done");
}

export function simulationStep(dt) {
    simulation.step(dt);
}

export function simulationState() {
    return simulation.state();
}

export function simulationCsv() {
    log("simulationCsv");
    return simulation.exportCsv();
}

export function simulationFieldSetup(mode) {
    log("simulationFieldSetup");
    log("mode = " + mode);

    if (field) {
        field.setup(mode);
    }
}

export function simulationFieldProbe(probe) {
    if (field) {
        return field.probe(probe);
    }
}

export function fieldProbeConfig(m = 0, q = 0, nq = 0) {
    log("fieldProbeConfig");

    if (field) {
        field.probeConfig(m, q, nq);
    }
}

export function fieldSetup(mode = "update", grid = [10, 10, 10], size = 1e3) {
    log("fieldSetup");
    
    if (field)
        field.setup(mode, grid, size);
}

export function fieldUpdate() {
    if (field)
        field.update();
}

export function fieldCleanup() {
    log("fieldCleanup");
    if (field)
        field.cleanup();
}

export function fieldProbe(probe) {
    if (field)
        return field.probe(probe);
}