import { Vector3 } from 'three';
import { calcListStatistics, Physics } from './physics.js';
import { decodeVector3, safeParseFloat } from './helpers.js';
import { scenariosList } from './scenarios.js';
import { Particle, ParticleType } from './particle.js';
import { SimulationGPU } from './gpu/simulation';
import { GraphicsGPU } from './gpu/graphics'
//import { GraphicsMock as GraphicsGPU } from './mock/graphics'
import { FieldGPU } from './gpu/field';
import { generateComputePosition, generateComputeVelocity } from './gpu/shaders/computeShader.glsl.js';

const graphics = new GraphicsGPU();
let physics = new Physics();
export let simulation = new SimulationGPU(graphics, physics);

function log(msg) {
    let timestamp = new Date().toISOString();
    console.log(timestamp + " | " + simulation.cycles + " | Core: " + msg);
}

class Core {
    constructor() {
        this.scenariosList = scenariosList;
        this.particleSetup = scenariosList[0];
        this.simulationIdx = 0;
        this.simulation = undefined;

        log("simulations loaded: " + scenariosList.length);
    }

    internalSetup(newPhysics) {
        physics = (newPhysics || new Physics());
        simulation = new SimulationGPU(graphics, physics);
        simulation.field = new FieldGPU(simulation);

        this.simulation = simulation;
    }

    setup(idx) {
        log("setup idx = " + idx);

        if (idx != undefined) {
            this.simulationIdx = idx;
            if (idx >= 0 && idx < scenariosList.length) {
                this.particleSetup = scenariosList[idx];
            } else if (idx == -1) {
                this.particleSetup = scenariosList[scenariosList.length - 1];
            } else {
                log('invalid simulationList index');
                return;
            }
        }

        this.internalSetup();

        simulation.setup(this.particleSetup);

        log('setup done');
    }

    importParticleListJson(selection, filename, content) {
        log('Importing selection ' + filename);
        
        let imported = this.parseJson(content);
        if (imported == undefined) return;

        if (imported.physics.nuclearForceRange != physics.nuclearForceRange) {
            alert("Warning: imported physics constants do not match.");
        }

        selection.import(imported, filename);
    }

    normalizePosition(list) {
        log('normalizePosition');
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

    createParticleList(particleList, center = new Vector3()) {
        log('createParticleList ' + particleList.length + ' ' + center.toArray());

        if (particleList == undefined || particleList.length == 0) return;

        if (particleList.length + graphics.particleList.length > graphics.maxParticles) {
            alert([
                'Error: maxParticles exceeded!',
                'You can adjust maxParticles on the "INFORMATION" menu.'
            ].join('\n'));
            return;
        }

        graphics.readbackParticleData();

        let normalizedList = this.normalizePosition(particleList);
        normalizedList.forEach((p, index) => {
            p.position.add(center);
            graphics.particleList.push(p);
        });

        simulation.drawParticles();
    }

    updatePhysics(key, value) {
        log('updatePhysics key ' + key + ' val ' + value);

        if (value == undefined || value === '') return;

        let updatePhysics = true;
        let updateShader = false;

        switch (key) {
            case 'massConstant':
                physics.massConstant = safeParseFloat(value, physics.massConstant);
                break;

            case 'chargeConstant':
                physics.chargeConstant = safeParseFloat(value, physics.chargeConstant);
                break;

            case 'nuclearForceConstant':
                physics.nuclearForceConstant = safeParseFloat(value, physics.nuclearForceConstant);
                break;

            case 'nuclearForceRange':
                physics.nuclearForceRange = safeParseFloat(value, physics.nuclearForceRange);
                break;

            case 'boundaryDamping':
                physics.boundaryDamping = safeParseFloat(value, physics.boundaryDamping);
                break;

            case 'boundaryDistance':
                physics.boundaryDistance = safeParseFloat(value, physics.boundaryDistance);
                break;

            case 'minDistance2':
                physics.minDistance2 = safeParseFloat(value, physics.minDistance2);
                break;

            case 'forceConstant':
                physics.forceConstant = safeParseFloat(value, physics.forceConstant);
                break;

            case 'radius':
                simulation.particleRadius = safeParseFloat(value, simulation.particleRadius);
                simulation.setParticleRadius();
                updatePhysics = false;
                break;

            case 'radiusRange':
                simulation.particleRadiusRange = safeParseFloat(value, simulation.particleRadiusRange);
                simulation.setParticleRadius();
                updatePhysics = false;
                break;

            case 'potential':
                physics.nuclearPotential = value;
                updatePhysics = false;
                updateShader = true;
                break;

            case 'boxBoundary':
                physics.useBoxBoundary = value;
                updatePhysics = false;
                updateShader = true;
                break;

            case 'distance1':
                physics.useDistance1 = value;
                updatePhysics = false;
                updateShader = true;
                break;

            case 'enableBoundary':
                physics.enableBoundary = value;
                updatePhysics = false;
                updateShader = true;
                break;

            case 'enableFriction':
                physics.enableFriction = value;
                updatePhysics = false;
                updateShader = true;
                break;

            case 'frictionConstant':
                physics.frictionConstant = safeParseFloat(value, physics.frictionConstant);
                updatePhysics = true;
                updateShader = false;
                break;

            case 'frictionModel':
                physics.frictionModel = value;
                updatePhysics = false;
                updateShader = true;
                break;

            case 'forceMap':
                physics.forceMap = value;
                updatePhysics = true;
                updateShader = false;
                break;

            default:
                updatePhysics = false;
                break;
        }

        if (updateShader) {
            physics.velocityShader = generateComputeVelocity(physics);
            physics.positionShader = generateComputePosition(physics);

            graphics.readbackParticleData();
            graphics.drawParticles();
        }

        if (updatePhysics) {
            graphics.fillPhysicsUniforms();
        }
    }

    findParticle(id) {
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

    updateParticle(particle, key, value) {
        log("updateParticle key = " + key + " val = " + value + " particle = " + particle);

        if (particle == undefined) return;
        if (value == undefined || value === '') return;

        graphics.readbackParticleData();

        switch (key) {
            case 'mass':
                particle.mass = safeParseFloat(value, particle.mass);
                break;

            case 'charge':
                particle.charge = safeParseFloat(value, particle.charge);
                break;

            case 'nuclearCharge':
                particle.nuclearCharge = safeParseFloat(value, particle.nuclearCharge);
                break;

            case 'position':
                {
                    let v = decodeVector3(value);
                    if (v != undefined) {
                        let vec = new Vector3(v.x, v.y, v.z);
                        if (vec.length() >= physics.boundaryDistance) {
                            alert("Value is too big!");
                            return;
                        }
                        particle.position = vec;
                    }
                }
                break;

            case 'velocityAbs':
                {
                    let velocity = parseFloat(value);
                    if (isNaN(velocity)) {
                        alert("Invalid value!");
                        return;
                    }
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

            case 'velocityDir':
                {
                    let dir = decodeVector3(value);
                    if (dir) {
                        let vec = new Vector3(dir.x, dir.y, dir.z);
                        vec.normalize();

                        let abs = (particle.velocity.length() || 1.0);
                        particle.velocity = vec;
                        particle.velocity.multiplyScalar(abs);
                    } else {
                        alert('Invalid value.');
                        return;
                    }
                }
                break;

            case 'reset':
                particle.mass = 0;
                particle.charge = 0;
                particle.nuclearCharge = 0;
                particle.velocity.set(0, 0, 0);
                particle.position.set(0, 0, 0);
                break;

            case 'fixed':
                if (value === true) particle.type = ParticleType.fixed;
                else if (value === false) particle.type = ParticleType.default;
                break;

            case 'color':
                let color = value.replace('#', '');
                color = parseInt(color, 16);
                particle.setColor(color);
                break;

            default:
                break;
        }

        simulation.drawParticles();
    }

    deleteParticleList(list) {
        log('deleteParticleList ' + list.length);

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

    particleAutoCleanup(threshold = 4) {
        log("particleAutoCleanup threshold = " + threshold);

        function positionToKeyMap(p) {
            let key = p.position.toArray();
            key.forEach((val, idx) => {
                key[idx] = Math.round(val / simulation.physics.nuclearForceRange);
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
        this.deleteParticleList(deleteList);

        pMap.forEach((value, key) => {
            console.log(key + "," + value.count);
        });
    }

    updateParticleList(parameter, value, list) {
        log('updateParticleList param = ' + parameter + ' value = ' + value + ' listLen = ' + (list === undefined?'undefined':list.length));

        if (list == undefined) {
            list = graphics.particleList;
        }

        let stats = calcListStatistics(list);
        let totalMass = stats.totalMass;
        let totalCharge = stats.totalCharge;
        let totalNuclearCharge = stats.totalNuclearCharge;

        switch (parameter) {
            case 'mass':
                {
                    let newMass = safeParseFloat(value, totalMass);
                    let ratio = newMass/totalMass;
                    if (ratio == 1.0) {
                        return;
                    }      

                    graphics.readbackParticleData();
                    list.forEach((p) => {
                        p.mass *= ratio;
                    });                }
                break;

            case 'charge':
                {
                    let newCharge = safeParseFloat(value, totalCharge);
                    let ratio = newCharge/totalCharge;
                    if (ratio == 1.0) {
                        return;
                    }

                    console.log("ratio = " + ratio);

                    graphics.readbackParticleData();
                    list.forEach((p) => {
                        p.charge *= ratio;
                    });                }
                break;

            case 'nuclearCharge':
                {
                    let newNuclearCharge = safeParseFloat(value, totalNuclearCharge);
                    let ratio = newNuclearCharge/totalNuclearCharge;
                    if (ratio == 1.0) {
                        return;
                    }

                    graphics.readbackParticleData();
                    list.forEach((p) => {
                        p.nuclearCharge *= ratio;
                    });
                }
                break;

            case 'center':
                {
                    let center = decodeVector3(value);
                    if (center == undefined) {
                        alert('Invalid center position.');
                        return;
                    }
                    let centerVector = new Vector3(center.x, center.y, center.z);
                    if (physics.enableBoundary && centerVector.length() >= physics.boundaryDistance) {
                        alert('Value out of boundaries.');
                        return;
                    }

                    graphics.readbackParticleData();
                    let tmpList = this.normalizePosition(list);
                    list.forEach((particle, index) => {
                        tmpList[index].position.add(centerVector);
                        particle.position.set(tmpList[index].position.x, tmpList[index].position.y, tmpList[index].position.z);
                    });
                }
                break;

            case 'velocityAbs':
                {
                    let newVelocityAbs = parseFloat(value);
                    if (isNaN(newVelocityAbs)) {
                        alert('Invalid value.');
                        return;
                    }
                    if (Math.abs(newVelocityAbs) >= physics.boundaryDistance) {
                        alert('Value is too big.');
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

            case 'velocityDir':
                {
                    let newDir = decodeVector3(value);
                    if (newDir == undefined) {
                        alert('Invalid value.');
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

            case 'fixed':
                graphics.readbackParticleData();
                list.forEach(particle => {
                    if (value == true) particle.type = ParticleType.fixed;
                    else particle.type = ParticleType.default;
                });
                break;

            default:
                log('invalid parameter');
                return;
        }

        simulation.drawParticles();
    }

    deleteAll() {
        log('deleteAll');

        simulation.particleList = [];
        simulation.physics.particleList = [];
        simulation.drawParticles();
    }

    exportJson(list) {
        simulation.graphics.readbackParticleData();

        let snapshotObj = {
            version: "0.1",
            name: simulation.name,
            folder: simulation.folderName,
            cycles: simulation.cycles,
            particleRadius: simulation.particleRadius,
            particleRadiusRange: simulation.particleRadiusRange,
            mode2D: simulation.mode2D,
            target: simulation.graphics.controls.target,
            camera: simulation.graphics.camera.position,

            physics: simulation.physics
        };

        if (list) snapshotObj.physics.particleList = list;

        snapshotObj.physics.velocityShader = undefined;
        snapshotObj.physics.positionShader = undefined;
        snapshotObj.physics.particleList.forEach((particle) => {
            particle.force = undefined;
            particle.uv = undefined;
        })
        //snapshotObj.physics.particleList = undefined;

        return JSON.stringify(snapshotObj, null, 4);
    }

    parseJson(content) {
        log("parseJson")

        let imported = JSON.parse(content);
        if (imported == undefined || imported.physics == undefined || imported.physics.particleList == undefined) {
            log("Failed to parse JSON file.");
            return undefined;
        }

        log("Loaded particles: " + imported.physics.particleList.length);

        let newPhysics = new Physics(imported.physics);

        imported.physics.particleList.forEach((particle) => {
            let newParticle = new Particle(particle);
            newPhysics.particleList.push(newParticle);
        });

        imported.physics = newPhysics;

        return imported;
    }

    importJson(filename, content) {
        log('importJson ' + filename);

        let graphics = simulation.graphics;

        let imported = this.parseJson(content);
        if (imported == undefined) return;

        this.internalSetup(imported.physics);

        simulation.name = filename;
        simulation.folderName = 'imported';
        simulation.particleRadius = imported.particleRadius;
        simulation.particleRadiusRange = imported.particleRadiusRange;
        simulation.mode2D = imported.mode2D;

        graphics.camera.position.set(imported.camera.x, imported.camera.y, imported.camera.z);
        graphics.controls.target.set(imported.target.x, imported.target.y, imported.target.z);
        graphics.controls.update();

        simulation.setup();

        simulation.cycles = imported.cycles;
    }
}

export let core = new Core();
