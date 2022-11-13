import { Particle, ParticleType, Physics } from './physics.js';
import { SimulationGPU } from './gpu/simulationGPU';
import { GraphicsGPU } from './gpu/graphicsGPU'
import { FieldGPU } from './gpu/fieldGPU';
import { SimulationCPU } from './cpu/simulationCPU';
import { GraphicsCPU } from './cpu/graphicsCPU'
import { FieldCPU } from './cpu/fieldCPU';

import { scenarios0 } from './scenarios/scenarios0.js';
import { scenarios1 } from './scenarios/scenarios1.js';
import { fields } from './scenarios/fieldTest.js';
import { elements } from './scenarios/elements.js';
import { nearForce } from './scenarios/nearForce.js';
import { scenarios2 } from './scenarios/scenarios2.js';
import { gpgpu } from './scenarios/gpgpuTest';
import { nearForce1 } from './scenarios/nearForce1.js';
import { experiments } from './scenarios/experiments.js';

export const useGPU = true;

export let graphics = undefined;
if (useGPU) {
    graphics = new GraphicsGPU();
} else {
    graphics = new GraphicsCPU();
}

let simulation = undefined;
let field = undefined;
let physics = undefined;

let simulationList = [];
// simulationList = simulationList.concat(nearForce);
// simulationList = simulationList.concat(fields);
// simulationList = simulationList.concat(elements);
if (useGPU) {
    simulationList = simulationList.concat(experiments);
    simulationList = simulationList.concat(nearForce1);
    simulationList = simulationList.concat(gpgpu);
}
simulationList = simulationList.concat(scenarios2);
simulationList = simulationList.concat(nearForce);
simulationList = simulationList.concat(fields);
simulationList = simulationList.concat(elements);
simulationList = simulationList.concat(scenarios1);
simulationList = simulationList.concat(scenarios0);
//simulationList.reverse();
let particlesSetup = simulationList[0];

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

function internalSetup(physics_) {
    physics = (physics_ || new Physics());
    if (useGPU) {
        simulation = new SimulationGPU(graphics, physics);
        field = new FieldGPU(graphics, physics);
    } else {
        simulation = new SimulationCPU(graphics, physics);
        field = new FieldCPU(graphics, physics);
    }
}

export function simulationSetup(idx) {
    log("simulationSetup idx = " + idx);

    if (idx != undefined && idx >= 0 && idx < simulationList.length) {
        particlesSetup = simulationList[idx];
    }

    internalSetup();

    simulation.setup(particlesSetup, true);

    log("simulationSetup done");
}

export function simulationStep(dt) {
    simulation.step(dt);
}

export function simulationState() {
    return simulation.state();
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

export function fieldSetup(mode = "update", grid = 10, size = 1e3) {
    log("fieldSetup");

    if (field)
        field.setup(mode, grid, size);
}

export function fieldUpdate() {
    //log("fieldUpdate");

    if (field)
        field.update();
}

export function fieldCleanup() {
    log("fieldCleanup");

    if (field)
        field.cleanup();
}

export function fieldProbe(probe) {
    log("fieldProbe");

    if (field)
        return field.probe(probe);
}

export function simulationExportCsv() {
    log("simulationCsv");

    const csvVersion = "1.0";

    if (useGPU) {
        graphics.readbackParticleData();
    }

    let output = "";
    output += "version," + physics.header();
    output += ",cycles,targetX,targetY,targetZ,cameraX,cameraY,cameraZ,particleRadius,particleRadiusRange";
    output += "\n";
    output += csvVersion + "," + physics.csv();
    output += "," + simulation.cycles;

    let target = graphics.controls.target;
    output += "," + target.x;
    output += "," + target.y;
    output += "," + target.z;
    let camera = graphics.camera.position;
    output += "," + camera.x;
    output += "," + camera.y;
    output += "," + camera.z;

    output += "," + simulation.particleRadius;
    output += "," + simulation.particleRadiusRange;

    output += "\n";

    output += physics.particleList[0].header() + "\n";
    physics.particleList.forEach((p, i) => {
        output += p.csv() + "\n";
    });
    return output;
}

export function simulationImportCSV(filename, content) {
    log("Importing " + filename);

    let newPhysics = new Physics();
    newPhysics.name = filename;
    let newSimulation = {};

    let lines = content.split("\n");
    let result = lines.every((line, index) => {
        let values = line.split(",");
        switch (index) {
            default:
                // particle data
                if (values[0] == "") {
                    return true;
                }
                if (values.length != 13) {
                    log("invalid particle data");
                    log(line);
                    return false;
                }
                let particle = new Particle();
                particle.id = parseInt(values[0]);
                particle.type = parseFloat(values[1]);
                if (particle.type == ParticleType.probe) {
                    // TODO fix this
                    particle.radius = newSimulation.particleRadius;
                }
                particle.mass = parseFloat(values[2]);
                particle.charge = parseFloat(values[3]);
                particle.nearCharge = parseFloat(values[4]);
                particle.position.x = parseFloat(values[5]);
                particle.position.y = parseFloat(values[6]);
                particle.position.z = parseFloat(values[7]);
                particle.velocity.x = parseFloat(values[8]);
                particle.velocity.y = parseFloat(values[9]);
                particle.velocity.z = parseFloat(values[10]);
                // parseFloat(values[11]); energy
                particle.collisions = parseFloat(values[12]);

                newPhysics.particleList.push(particle);

                break;

            case 0:
                // physics header
                if (values.length != 19) {
                    log("invalid physics header");
                    return false;
                }
                break;

            case 1:
                // physics data
                if (values.length != 19) {
                    log("invalid physics data");
                    return false;
                }
                // values[0] version
                newPhysics.enableColision = (values[1] == "true") ? (true) : (false);
                newPhysics.minDistance = parseFloat(values[2]);
                newPhysics.forceConstant = parseFloat(values[3]);
                newPhysics.massConstant = parseFloat(values[4]);
                newPhysics.chargeConstant = parseFloat(values[5]);
                newPhysics.nearChargeConstant = parseFloat(values[6]);
                newPhysics.nearChargeRange = parseFloat(values[7]);
                newPhysics.boundaryDistance = parseFloat(values[8]);
                newPhysics.boundaryDamping = parseFloat(values[9]);
                newSimulation.cycles = parseFloat(values[10]);
                let target = {
                    x: parseFloat(values[11]),
                    y: parseFloat(values[12]),
                    z: parseFloat(values[13])
                }
                let camera = {
                    x: parseFloat(values[14]),
                    y: parseFloat(values[15]),
                    z: parseFloat(values[16])
                }
                graphics.camera.position.set(camera.x, camera.y, camera.z);
                graphics.controls.target.set(target.x, target.y, target.z);
                graphics.controls.update();
                newSimulation.particleRadius = parseFloat(values[17]);
                newSimulation.particleRadiusRange = parseFloat(values[18]);
                break;

            case 2:
                // particle header
                if (values.length != 13) {
                    log("invalid particle data");
                    return false;
                }
                break;
        }
        return true;
    });

    if (!result) {
        log("failed to import CSV");
        return;
    }

    log(newPhysics.particleList.length + " particles loaded!");

    internalSetup(newPhysics);

    simulation.particleRadius = newSimulation.particleRadius;
    simulation.particleRadiusRange = newSimulation.particleRadiusRange;
    simulation.setup();

    simulation.cycles = newSimulation.cycles;
}
