import { calcListStatistics, Physics } from './physics.js';
import { SimulationGPU } from './gpu/simulation';
import { GraphicsGPU } from './gpu/graphics'
import { FieldGPU } from './gpu/field';
import { Vector3 } from 'three';
import { decodeVector3 } from './helpers.js';
import { generateComputeVelocity } from './gpu/shaders/computeShader.js';
import { scenariosList } from './scenarios.js';
import { ParticleType } from './particle.js';
import { parseCsv } from './csv.js';

export let graphics = undefined;
export let simulation = undefined;
let physics = undefined;

function log(msg) {
    console.log("Simulation: " + msg)
}

let particlesSetup = scenariosList[0];
log("simulations loaded: " + scenariosList.length);

export function internalSetup(physics_) {
    physics = (physics_ || new Physics());
    graphics = (graphics || new GraphicsGPU());
    simulation = new SimulationGPU(graphics, physics);
    simulation.field = new FieldGPU(simulation);
}

export function simulationSetup(idx) {
    log("simulationSetup idx = " + idx);

    if (idx != undefined) {
        if (idx >= 0 && idx < scenariosList.length) {
            particlesSetup = scenariosList[idx];
        } else if (idx == -1) {
            particlesSetup = scenariosList[scenariosList.length - 1];
        } else {
            log("invalid simulationList index");
            return;
        }
    }

    internalSetup();

    simulation.setup(particlesSetup);

    log("simulationSetup done");
}

export function simulationImportParticleList(selection, filename, content) {
    log("Importing selection " + filename);

    let imported = parseCsv(simulation, filename, content);
    if (imported == undefined) return;

    if (imported.physics.nuclearChargeRange != physics.nuclearChargeRange) {
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

export function simulationCreateParticleList(particleList, center = new Vector3()) {
    log("simulationCreateParticles " + particleList.length + " " + center.toArray());

    if (particleList == undefined || particleList.length == 0) return;

    if (particleList.length + graphics.particleList.length > graphics.maxParticles) {
        alert('maxParticles exceeded!\n' +
            'You can adjust maxParticles on the "SIMULATION PARAMETERS" menu.');
        return;
    }

    graphics.readbackParticleData();

    let normalizedList = normalizePosition(particleList);
    normalizedList.forEach((p, index) => {
        p.position.add(center);
        graphics.particleList.push(p);
    });

    simulation.drawParticles();
}

export function simulationUpdatePhysics(key, value) {
    log("simulationUpdatePhysics key " + key + " val " + value);

    if (value == undefined || value === "") return;

    let updatePhysics = true;
    let updateShader = false;

    switch (key) {
        case "massConstant":
            physics.massConstant = parseFloat(value);
            break;

        case "chargeConstant":
            physics.chargeConstant = parseFloat(value);
            break;

        case "nuclearChargeConstant":
            physics.nuclearChargeConstant = parseFloat(value);
            break;

        case "nuclearChargeRange":
            physics.nuclearChargeRange = parseFloat(value);
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

        case "potential":
            physics.nuclearPotential = value;
            updatePhysics = false;
            updateShader = true;
            break;

        case "boxBoundary":
            physics.useBoxBoundary = value;
            updatePhysics = false;
            updateShader = true;
            break;

        case "distance1":
            physics.useDistance1 = value;
            updatePhysics = false;
            updateShader = true;
            break;

        case "enableBoundary":
            physics.enableBoundary = value;
            updatePhysics = false;
            updateShader = true;
            break;

        default:
            updatePhysics = false;
            break;
    }

    if (updateShader) {
        physics.velocityShader = generateComputeVelocity(
            physics.nuclearPotential,
            physics.useDistance1,
            physics.useBoxBoundary,
            physics.enableBoundary
        );
        graphics.readbackParticleData();
        graphics.drawParticles();
    }

    if (updatePhysics) {
        graphics.fillPhysicsUniforms();
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

    graphics.readbackParticleData();


    switch (key) {
        case "mass":
            particle.mass = parseFloat(value);
            break;

        case "charge":
            particle.charge = parseFloat(value);
            break;

        case "nuclearCharge":
            particle.nuclearCharge = parseFloat(value);
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
            particle.nuclearCharge = 0;
            particle.velocity.set(0, 0, 0);
            particle.position.set(0, 0, 0);
            break;

        case "fixed":
            if (value === true) particle.type = ParticleType.fixed;
            else if (value === false) particle.type = ParticleType.default;
            break;

        default:
            update = false;
            break;
    }

    if (update) {
        simulation.drawParticles();
    }
}

export function simulationDeleteParticleList(list) {
    log("simulationDelete " + list.length);

    if (list == undefined) return;

    graphics.readbackParticleData();

    list.forEach((ref) => {
        simulation.particleList.every((src, srcIdx) => {
            if (src.id == ref.id) {
                simulation.particleList.splice(srcIdx, 1);
                return false;
            }
            return true;
        });
    });

    simulation.drawParticles();
}

export function simulationParticleAutoCleanup(threshold = 4) {
    log("simulationParticleCleanup threshold = " + threshold);

    function positionToKeyMap(p) {
        let key = p.position.toArray();
        key.forEach((val, idx) => {
            key[idx] = Math.round(val / simulation.physics.nuclearChargeRange);
        });
        return key.toString();
    }

    graphics.readbackParticleData();

    let pMap = new Map();
    graphics.particleList.forEach((p) => {
        if (p.type != ParticleType.default) return;
        let key = positionToKeyMap(p);
        if (pMap.has(key)) {
            pMap.get(key).count++;
        } else {
            pMap.set(key, { count: 1 });
        }
    });

    let deleteList = [];
    graphics.particleList.forEach((p) => {
        if (p.type != ParticleType.default) return;
        let key = positionToKeyMap(p);
        if (pMap.has(key)) {
            let c = pMap.get(key).count;
            if (c <= threshold) {
                deleteList.push(p);
            }
        }
    });
    simulationDeleteParticleList(deleteList);

    pMap.forEach((value, key) => {
        console.log(key + "," + value.count);
    });
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

                graphics.readbackParticleData();
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

                graphics.readbackParticleData();
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

                graphics.readbackParticleData();
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

                graphics.readbackParticleData();
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

                graphics.readbackParticleData();
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
        
        case "fixed":
            graphics.readbackParticleData();
            list.forEach(particle => {
                if (value == true) particle.type = ParticleType.fixed;
                else particle.type = ParticleType.default;
            });
            break;

        default:
            log("invalid parameter");
            return;
    }

    simulation.drawParticles();
}

export function simulationDeleteAll() {
    log("simulationDeleteAll");

    simulation.particleList = [];
    simulation.drawParticles();
}

export function simulationImportCSV(filename, content) {
    log("Importing " + filename);

    let graphics = simulation.graphics;

    let imported = parseCsv(simulation, filename, content);
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