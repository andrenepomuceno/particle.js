import { calcListStatistics, Particle, ParticleType, Physics } from './physics.js';
import { SimulationGPU } from './gpu/simulationGPU';
import { GraphicsGPU } from './gpu/graphicsGPU'
import { FieldGPU } from './gpu/fieldGPU';
import { SimulationCPU } from './cpu/simulationCPU';
import { GraphicsCPU } from './cpu/graphicsCPU'
import { FieldCPU } from './cpu/fieldCPU';
import { Vector3 } from 'three';
import { decodeVector3 } from './helpers.js';

import { scenarios0 } from './scenarios/scenarios0.js';
import { scenarios1 } from './scenarios/scenarios1.js';
import { fields } from './scenarios/fieldTest.js';
import { elements } from './scenarios/elements.js';
import { nearForce } from './scenarios/nearForce.js';
import { scenarios2 } from './scenarios/scenarios2.js';
import { gpgpu } from './scenarios/gpgpuTest';
import { nearForce1 } from './scenarios/nearForce1.js';
import { experiments } from './scenarios/experiments.js';
import { tests } from './scenarios/tests.js';
import { sandbox } from './scenarios/sandbox.js';

export const useGPU = true;
export let graphics = undefined;
export let simulation = undefined;
let physics = undefined;

function log(msg) {
    console.log("Simulation: " + msg)
}

let simulationList = [];
function addFolder(name, list) {
    list.forEach((value, index) => {
        list[index].folderName = name;
    });
    simulationList = simulationList.concat(list);
}

if (!ENV?.production) {
    addFolder("dev", sandbox);
}
if (useGPU) {
    addFolder("experiments", experiments);
    addFolder("nearForce1", nearForce1);
    addFolder("gpgpu", gpgpu);
}
addFolder("scenarios2", scenarios2);
addFolder("nearForce", nearForce);
addFolder("fields", fields);
addFolder("elements", elements);
addFolder("scenarios1", scenarios1);
addFolder("scenarios0", scenarios0);
addFolder("tests", tests);
addFolder("sandbox", sandbox);
let particlesSetup = simulationList[0];
log("simulations loaded: " + simulationList.length);

function internalSetup(physics_) {
    physics = (physics_ || new Physics());

    if (useGPU) {
        graphics = (graphics || new GraphicsGPU());
        simulation = new SimulationGPU(graphics, physics);
        simulation.field = new FieldGPU(graphics, physics);
    } else {
        graphics = (graphics || new GraphicsCPU());
        simulation = new SimulationCPU(graphics, physics);
        simulation.field = new FieldCPU(graphics, physics);
    }
}

export function simulationSetup(idx) {
    log("simulationSetup idx = " + idx);

    if (idx != undefined) {
        if (idx >= 0 && idx < simulationList.length) {
            particlesSetup = simulationList[idx];
        } else if (idx == -1) {
            particlesSetup = simulationList[simulationList.length - 1];
        } else {
            log("invalid simulationList index");
            return;
        }
    }

    internalSetup();

    simulation.setup(particlesSetup);

    log("simulationSetup done");
}

export function simulationExportCsv(list) {
    log("simulationCsv");

    if (list == undefined) {
        list = physics.particleList;
    }

    const csvVersion = "1.1";

    if (useGPU) {
        graphics.readbackParticleData();
    }

    let output = "";
    output += "version," + physics.header();
    output += ",cycles,targetX,targetY,targetZ,cameraX,cameraY,cameraZ,particleRadius,particleRadiusRange,mode2D";
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
    output += "," + simulation.mode2D;
    output += "\n";

    output += list[0].header() + "\n";
    list.forEach((p, i) => {
        output += p.csv() + "\n";
    });
    return output;
}

function parseCsv(filename, content) {
    let imported = { physics: new Physics() };
    imported.filename = filename;

    let particleDataColumns = 13;
    let simulationDataColumns = 19;

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
                //particle.id = parseInt(values[0]);
                particle.type = parseFloat(values[1]);
                if (particle.type == ParticleType.probe) {
                    particle.radius = field.elementSize();
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
                if (values.length < simulationDataColumns) {
                    log("invalid physics header");
                    return false;
                }
                break;

            case 1:
                // physics data
                if (values.length < simulationDataColumns) {
                    log("invalid physics data");
                    return false;
                }
                imported.version = values[0];
                imported.physics.enableColision = (values[1] == "true") ? (true) : (false);
                imported.physics.minDistance2 = parseFloat(values[2]);
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
                imported.camera = camera;
                imported.target = target;
                imported.particleRadius = parseFloat(values[17]);
                imported.particleRadiusRange = parseFloat(values[18]);
                if (parseFloat(imported.version) >= 1.1)
                    imported.mode2D = (values[19] === "true");
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
        alert("Failed to import CSV.")
        return undefined;
    }

    log(imported.physics.particleList.length + " particles loaded!");
    return imported;
}

export function simulationImportCSV(filename, content) {
    log("Importing " + filename);

    let imported = parseCsv(filename, content);
    if (imported == undefined) return;

    internalSetup(imported.physics);

    simulation.name = filename;
    simulation.particleRadius = imported.particleRadius;
    simulation.particleRadiusRange = imported.particleRadiusRange;
    simulation.mode2D = imported.mode2D;

    graphics.camera.position.set(imported.camera.x, imported.camera.y, imported.camera.z);
    graphics.controls.target.set(imported.target.x, imported.target.y, imported.target.z);
    graphics.controls.update();

    simulation.setup();

    simulation.cycles = imported.cycles;
}

export function simulationImportSelectionCSV(selection, filename, content) {
    log("Importing selection " + filename);

    let imported = parseCsv(filename, content);
    if (imported == undefined) return;

    if (imported.physics.nearChargeRange != physics.nearChargeRange) {
        alert("Imported particle physics do not match!");
    }

    selection.import(imported);
}

function normalizePosition(list) {
    log("normalizePosition");
    let normalizedList = [];

    let meanPosition = new Vector3();
    list.forEach((p, index) => {
        meanPosition.add(p.position);
    });
    meanPosition.divideScalar(list.length);
    if (simulation.mode2D) {
        meanPosition.z = 0.0;
    }

    list.forEach((p, index) => {
        let np = p.clone();
        np.position.sub(meanPosition);
        normalizedList.push(np);
    });

    return normalizedList;
}

export function simulationCreateParticles(particleList, center = new Vector3()) {
    log("simulationCreateParticles " + particleList.length + " " + center.toArray());

    if (particleList == undefined || particleList.length == 0) return;

    if (particleList.length + graphics.particleList.length > graphics.maxParticles) {
        alert("maxParticles exceeded!");
        return;
    }

    if (useGPU) {
        graphics.readbackParticleData();
    }

    let normalizedList = normalizePosition(particleList);
    normalizedList.forEach((p, index) => {
        p.position.add(center);
        graphics.particleList.push(p);
    });

    if (useGPU) {
        simulation.drawParticles();
    }
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

        case "minDistance2":
            physics.minDistance2 = parseFloat(value);
            break;

        case "forceConstant":
            physics.forceConstant = parseFloat(value);
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

export function simulationFindParticle(id) {
    let result = undefined;
    graphics.particleList.every((p) => {
        if (p.id == id) {
            result = p;
            return false;
        }
        return true;
    });
    return result;
}

export function simulationUpdateParticle(particle, key, value) {
    log("simulationUpdateParticle key = " + key + " val = " + value);
    log("particle = " + particle);

    if (value == undefined || value === "") return;
    if (particle == undefined) return;

    let update = true;

    if (useGPU) {
        graphics.readbackParticleData();
    }

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
                let v = decodeVector3(value);
                if (v) {
                    let vec = new Vector3(v.x, v.y, v.z);
                    if (vec.length() >= physics.boundaryDistance) {
                        alert("Value is too big!");
                        return;
                    }
                    particle.position = vec;
                }
            }
            break;

        case "velocityAbs":
            {
                let velocity = parseFloat(value);
                if (velocity >= physics.boundaryDistance) {
                    alert("Value is too big!");
                    return;
                }

                if (particle.velocity.length() == 0) {
                    particle.velocity.set(1.0, 0.0, 0.0);
                }
                particle.velocity.normalize().multiplyScalar(velocity);
            }

            break;

        case "velocityDir":
            {
                let dir = decodeVector3(value);
                if (dir) {
                    let vec = new Vector3(dir.x, dir.y, dir.z);
                    vec.normalize();

                    let abs = (particle.velocity.length() || 1.0);
                    particle.velocity = vec;
                    particle.velocity.multiplyScalar(abs);
                } else {
                    alert("Invalid value.");
                    return;
                }
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

export function simulationDelete(list) {
    log("simulationDelete " + list.length);

    if (list == undefined) return;

    if (useGPU) {
        graphics.readbackParticleData();
    }

    list.forEach((ref) => {
        simulation.particleList.every((src, srcIdx) => {
            if (src.id == ref.id) {
                simulation.particleList.splice(srcIdx, 1);
                return false;
            }
            return true;
        });
    });

    if (useGPU) {
        simulation.drawParticles();
    }
}

export function simulationUpdateParticleList(parameter, value, list) {
    log("simulationUpdateAll " + parameter + " " + value + " " + list.length);

    let totalMass = simulation.totalMass.toExponential(1);
    let totalCharge = simulation.totalCharge.toExponential(1);
    if (list == undefined) {
        list = graphics.particleList;
    } else {
        let stats = calcListStatistics(list);
        totalMass = stats.totalMass.toExponential(1);
        totalCharge = stats.totalCharge.toExponential(1);
    }

    switch (parameter) {
        case "mass":
            {
                let ratio = parseFloat(value);
                if (isNaN(ratio)) {
                    alert("Invalid value.");
                    return;
                }
                if (ratio.toExponential(1) == totalMass) return;
                if (ratio > 1e6) {
                    alert("Value is too big.");
                    return;
                }

                if (useGPU) graphics.readbackParticleData();
                list.forEach((p) => {
                    p.mass *= ratio;
                });
            }
            break;

        case "charge":
            {
                let ratio = parseFloat(value);
                if (isNaN(ratio)) {
                    alert("Invalid value.");
                    return;
                }
                if (ratio.toExponential(1) == totalCharge) return;
                if (ratio >= 1e6) {
                    alert("Value is too big.");
                    return;
                }

                if (useGPU) graphics.readbackParticleData();
                list.forEach((p) => {
                    p.charge *= ratio;
                });
            }
            break;

        case "center":
            {
                let center = decodeVector3(value);
                if (center == undefined) {
                    alert("Invalid center position");
                    return;
                }
                let centerVector = new Vector3(center.x, center.y, center.z);
                if (centerVector.length() >= physics.boundaryDistance) {
                    alert("Value out of boundaries.");
                    return;
                }

                if (useGPU) graphics.readbackParticleData();
                let tmpList = normalizePosition(list);
                list.forEach((particle, index) => {
                    tmpList[index].position.add(centerVector);
                    particle.position.set(tmpList[index].position.x, tmpList[index].position.y, tmpList[index].position.z);
                });
            }
            break;

        case "velocityAbs":
            {
                let newVelocityAbs = parseFloat(value);
                if (Math.abs(newVelocityAbs) >= physics.boundaryDistance) {
                    alert("Value is too big.");
                    return;
                }

                if (useGPU) graphics.readbackParticleData();
                let totalVelocityMean = new Vector3();
                list.forEach((particle, index) => {
                    totalVelocityMean.add(particle.velocity);
                });
                totalVelocityMean.divideScalar(list.length);
                let totalVelocityAbs = totalVelocityMean.length();
                totalVelocityMean.normalize().multiplyScalar(newVelocityAbs - totalVelocityAbs);

                list.forEach((particle, index) => {
                    particle.velocity.add(totalVelocityMean);
                });
            }
            break;

        case "velocityDir":
            {
                let newDir = decodeVector3(value);
                if (newDir == undefined) {
                    alert("Invalid value.");
                    return;
                }

                if (useGPU) graphics.readbackParticleData();
                let totalVelocityMean = new Vector3();
                list.forEach((particle, index) => {
                    totalVelocityMean.add(particle.velocity);
                });
                totalVelocityMean.divideScalar(list.length);
                let totalVelocityAbs = totalVelocityMean.length();
                totalVelocityMean.normalize();

                let dirVec = new Vector3(newDir.x, newDir.y, newDir.z);
                dirVec.normalize();
                dirVec.sub(totalVelocityMean).multiplyScalar(totalVelocityAbs);

                list.forEach((particle, index) => {
                    particle.velocity.add(dirVec);
                });
            }
            break;

        default:
            log("invalid parameter");
            return;
    }


    if (useGPU) {
        simulation.drawParticles();
    }
}

export function simulationDeleteAll() {
    log("simulationDeleteAll");

    simulation.particleList = [];
    if (useGPU) {
        simulation.drawParticles();
    }
}