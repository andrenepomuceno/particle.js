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

export const useGPU = false;
export let graphics = undefined;
export let simulation = undefined;
let physics = undefined;
let field = undefined;

function log(msg) {
    console.log("Simulation: " + msg)
}

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
log("simulations loaded: " + simulationList.length);

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
        graphics = (graphics || new GraphicsGPU());
        simulation = new SimulationGPU(graphics, physics);
        field = new FieldGPU(graphics, physics);
    } else {
        graphics = (graphics || new GraphicsCPU());
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

    let imported = { physics: new Physics() };

    const particleDataColumns = 13;
    const simulationDataColumns = 19;

    let lines = content.split("\n");
    let result = lines.every((line, index) => {
        let values = line.split(",");
        switch (index) {
            default:
                // particle data
                if (values[0] == "") {
                    return true;
                }
                if (values.length != particleDataColumns) {
                    log("invalid particle data");
                    log(line);
                    return false;
                }
                let particle = new Particle();
                particle.id = parseInt(values[0]);
                particle.type = parseFloat(values[1]);
                if (particle.type == ParticleType.probe) {
                    // TODO fix this
                    particle.radius = imported.particleRadius;
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

                imported.physics.particleList.push(particle);

                break;

            case 0:
                // physics header
                if (values.length != simulationDataColumns) {
                    log("invalid physics header");
                    return false;
                }
                break;

            case 1:
                // physics data
                if (values.length != simulationDataColumns) {
                    log("invalid physics data");
                    return false;
                }
                // values[0] version
                imported.physics.enableColision = (values[1] == "true") ? (true) : (false);
                imported.physics.minDistance = parseFloat(values[2]);
                imported.physics.forceConstant = parseFloat(values[3]);
                imported.physics.massConstant = parseFloat(values[4]);
                imported.physics.chargeConstant = parseFloat(values[5]);
                imported.physics.nearChargeConstant = parseFloat(values[6]);
                imported.physics.nearChargeRange = parseFloat(values[7]);
                imported.physics.boundaryDistance = parseFloat(values[8]);
                imported.physics.boundaryDamping = parseFloat(values[9]);
                imported.cycles = parseFloat(values[10]);
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
                imported.particleRadius = parseFloat(values[17]);
                imported.particleRadiusRange = parseFloat(values[18]);
                break;

            case 2:
                // particle header
                if (values.length != particleDataColumns) {
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

    log(imported.physics.particleList.length + " particles loaded!");
    /*imported.physics.particleList.every((p) => {
        if (p.position.z != 0) {
            
            log("3d simulation detected");
            return false;
        }
        return true;
    });*/

    internalSetup(imported.physics);

    simulation.name = filename;
    simulation.particleRadius = imported.particleRadius;
    simulation.particleRadiusRange = imported.particleRadiusRange;

    simulation.setup();

    simulation.cycles = imported.cycles;
}
export function simulationUpdatePhysics(key, value) {
    log("simulationUpdatePhysics key " + key + " val " + value);

    if (value == undefined || value == "") return;

    let updatePhysics = true;

    switch (key) {
        case "massConstant":
            physics.massConstant = parseFloat(value);
            break;

        case "chargeConstant":
            physics.chargeConstant = parseFloat(value);
            break;

        case "nearChargeConstant":
            physics.nearChargeConstant = parseFloat(value);
            break;

        case "nearChargeRange":
            physics.nearChargeRange = parseFloat(value);
            break;

        case "boundaryDamping":
            physics.boundaryDamping = parseFloat(value);
            break;

        case "boundaryDistance":
            physics.boundaryDistance = parseFloat(value);
            break;

        case "minDistance":
            physics.minDistance = parseFloat(value);
            break;

        case "forceConstant":
            physics.forceConstant = parseFloat(value);
            break;

        case "maxParticles":
            graphics.maxParticles = parseFloat(value);
            updatePhysics = false;
            break;

        case "radius":
            simulation.particleRadius = parseFloat(value);
            simulation.setParticleRadius();
            updatePhysics = false;
            break;

        case "radiusRange":
            simulation.particleRadiusRange = parseFloat(value);
            simulation.setParticleRadius();
            updatePhysics = false;
            break;

        default:
            updatePhysics = false;
            break;
    }

    if (updatePhysics && useGPU) {
        simulation.graphics.fillPhysicsUniforms();
    }
}

function decodeVector(value) {
    let split = value.split(",");
    if (split.length != 3) {
        log("error decoding position");
        return { x: 0, y: 0, z: 0 };
    }
    let vec = {
        x: parseFloat(split[0]),
        y: parseFloat(split[1]),
        z: parseFloat(split[2])
    };
    return vec;
}

export function simulationUpdateParticle(particle, key, value) {
    log("simulationUpdateParticle key = " + key + " val = " + value);
    log("particle = " + particle || particle.id);

    if (value == undefined || value == "") return;
    if (particle == undefined && key != "id") return;

    let update = true;

    switch (key) {
        case "mass":
            particle.mass = parseFloat(value);
            break;

        case "charge":
            particle.charge = parseFloat(value);
            break;

        case "nearCharge":
            particle.nearCharge = parseFloat(value);
            break;

        case "position":
            {
                let v = decodeVector(value);
                if (v) {
                    particle.position.set(v.x, v.y, v.z);
                }
            }
            break;

        case "velocityAbs":
            if (particle.velocity.length() == 0) {
                particle.velocity.set(1.0, 0.0, 0.0);
            }
            particle.velocity.normalize().multiplyScalar(parseFloat(value));
            break;

        case "velocityDir":
            {
                let dir = decodeVector(value);
                if (dir) {
                    let abs = (particle.velocity.length() || 1.0);
                    particle.velocity.set(dir.x, dir.y, dir.z);
                    particle.velocity.multiplyScalar(abs);
                }
            }
            break;

        case "id":
            {
                let particle = undefined;
                physics.particleList.every((p) => {
                    if (p.id == parseInt(value)) {
                        particle = p;
                        return false;
                    }
                    return true;
                });
                return particle;
            }
            break;

        case "reset":
            particle.mass = 0;
            particle.charge = 0;
            particle.nearCharge = 0;
            particle.velocity.set(0, 0, 0);
            particle.position.set(0, 0, 0);
            break;

        default:
            update = false;
            break;
    }

    if (update && useGPU) {
        simulation.drawParticles();
    }
}

export function bidimensionalMode(enable = true) {
    simulation.mode2D = enable;
    if (enable) {
        graphics.controls.enableRotate = false;
    } else {
        graphics.controls.enableRotate = true;
    }
}