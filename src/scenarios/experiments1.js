import { GridHelper, PolarGridHelper, Vector3 } from 'three';
import { randomSphericVector, randomVector } from './helpers';
import { random, hexagonGenerator, shuffleArray, cubeGenerator } from '../helpers';
import { NuclearPotentialType, Particle } from '../physics';

export const experiments1 = [
    standardModel1,
    standardModel0,
];

function defaultParameters(simulation, cameraDistance = 1e4) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    simulation.fieldCleanup();

    graphics.cameraDistance = cameraDistance;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    graphics.cameraSetup();

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1;
    physics.nuclearChargeConstant = 1;
    physics.nuclearChargeRange = 1e3;

    physics.boundaryDistance = 1e5;
    physics.boundaryDamping = 0.9;
    physics.minDistance2 = Math.pow(1, 2);

    simulation.setParticleRadius(50, 25);
    simulation.bidimensionalMode(true);
}

function createParticles(simulation, typeList, n, r1 = 1, v1 = 0) {
    for (let i = 0; i < n; ++i) {
        let p = new Particle();
        let type = random(0, typeList.length - 1, true);

        p.mass = typeList[type].m;
        p.charge = typeList[type].q;

        let nq = typeList[type].nq;
        nq *= random(0, 1, true) ? (1) : (-1);
        p.nuclearCharge = nq;

        p.position = randomSphericVector(0, r1, simulation.mode2D);
        p.velocity = randomVector(v1);

        simulation.physics.particleList.push(p);
    }
}

function drawGrid(simulation, divisions = 10) {
    let size = 2 * simulation.physics.boundaryDistance;
    let gridHelper = new GridHelper(size, divisions);
    let z = -1;
    gridHelper.geometry.rotateX(Math.PI / 2);
    gridHelper.geometry.translate(0, 0, z);
    simulation.graphics.scene.add(gridHelper);
}

function standardModel1(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powXR;
    simulation.mode2D = true;

    physics.boundaryDistance = 1e5;
    graphics.cameraDistance = physics.boundaryDistance;

    physics.nuclearChargeRange = 1e4;
    simulation.particleRadius = 0.01 * physics.nuclearChargeRange;

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1 / 60;
    physics.nuclearChargeConstant = 1;

    let particleTypes = [
        { m: 0.5, q: -1, nq: 1 },
        { m: 3, q: 2 / 3, nq: 1 },
        { m: 6, q: -1 / 3, nq: 1 },
    ]
    createParticles(simulation, particleTypes, graphics.maxParticles);
    //drawGrid(simulation);
}

function standardModel0(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powXR;
    simulation.mode2D = false;

    physics.boundaryDistance = 1e5;
    graphics.cameraDistance = physics.boundaryDistance;

    physics.nuclearChargeRange = 1e4;
    simulation.particleRadius = 0.01 * physics.nuclearChargeRange;

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1 / 60;
    physics.nuclearChargeConstant = 1;

    let particleTypes = [
        { m: 0.5, q: -1, nq: 1 },
        { m: 3, q: 2 / 3, nq: 1 },
        { m: 6, q: -1 / 3, nq: 1 },
    ]
    createParticles(simulation, particleTypes, graphics.maxParticles);
    //drawGrid(simulation);
}